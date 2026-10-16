// «Bildfragmentieren» – die räumlichen Workflows (seit 16. Oktober 2026): Glas, Splitter, Relief mit three.js (WebGL 2, lokal in vendor/three-0.185.1).
// Erst geladen, wenn einer davon in der Kette steht. Jeder zeichnet auf eine eigene WebGL-Leinwand, die szene.js in das 2D-Bild setzt –
// so bleiben Vorschau, Standbild und Video unverändert. Zustandslos: das Bild hängt nur von u (0 … 1 im Abschnitt) ab. Bei u = 0 und u = 1 zeigen
// alle drei das Foto exakt (ohne Licht, Bloom, Farbsaum), darum sind die Übergänge zum stehenden Foto nahtlos.
// Herkunft: Rezepte 2, 3 und 5 des Skills .claude/skills/threejs-spektakel (dort mit Beispielen und Prüfskript).
import * as THREE from "three";
import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";
import { RenderPass } from "three/addons/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/addons/postprocessing/UnrealBloomPass.js";
import { ShaderPass } from "three/addons/postprocessing/ShaderPass.js";
import { OutputPass } from "three/addons/postprocessing/OutputPass.js";

const FOV = 35;
const anteil = (t, a, b) => Math.min(1, Math.max(0, (t - a) / (b - a)));
const weich = (x) => x * x * (3 - 2 * x);
const inOut = (x) => (x < 0.5 ? 4 * x * x * x : 1 - (-2 * x + 2) ** 3 / 2);
const zufallAus = (s) => () => { s |= 0; s = (s + 0x6d2b79f5) | 0; let t = Math.imul(s ^ (s >>> 15), 1 | s); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
const grob = () => typeof matchMedia !== "undefined" && matchMedia("(pointer: coarse)").matches;

// ——— Filmlook: Bloom und Farbsaum, beide an die Bewegung gekoppelt (in Ruhe: das Foto unverändert) ———
const SAUM = {
  uniforms: { tDiffuse: { value: null }, uSaum: { value: 0 } },
  vertexShader: /* glsl */ `varying vec2 vUv; void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
  fragmentShader: /* glsl */ `uniform sampler2D tDiffuse; uniform float uSaum; varying vec2 vUv;
    void main() {
      vec2 d = vUv - 0.5; vec2 s = d * uSaum * (1.0 + 4.0 * dot(d, d));
      gl_FragColor = vec4(texture2D(tDiffuse, vUv - s).r, texture2D(tDiffuse, vUv).g, texture2D(tDiffuse, vUv + s).b, 1.0);
    }`,
};
function filmlook(renderer, szene, kamera, { radius = 0.4, schwelle = 0.7 } = {}) {
  const g = renderer.getSize(new THREE.Vector2());
  const composer = new EffectComposer(renderer);
  composer.setPixelRatio(1); composer.setSize(g.x, g.y);
  composer.addPass(new RenderPass(szene, kamera));
  const bloom = new UnrealBloomPass(g.clone(), 0, radius, schwelle);
  const saum = new ShaderPass(SAUM);
  composer.addPass(bloom); composer.addPass(saum); composer.addPass(new OutputPass());
  return {
    groesse: g.clone(),
    render(aktiv, staerke) {
      bloom.enabled = aktiv > 0.001; bloom.strength = staerke * aktiv;
      saum.uniforms.uSaum.value = 0.003 * aktiv;
      composer.render();
    },
    setSize(w, h) { composer.setSize(w, h); this.groesse.set(w, h); },
    entsorgen() { composer.dispose(); bloom.dispose(); },
  };
}

// ——— Glas: konvexe Polyeder als Schnitt von Platten |n·p| ≤ r, exakte Brechung je Farbkanal ———
const PHI = (1 + Math.sqrt(5)) / 2;
const NORMALEN = [
  [0, PHI, 1], [0, -PHI, 1], [1, 0, PHI], [-1, 0, PHI], [PHI, 1, 0], [-PHI, 1, 0],
  [1, 1, 1], [-1, 1, 1], [1, -1, 1], [1, 1, -1], [0, 1, PHI + 1], [0, -1, PHI + 1], [PHI + 1, 0, 1], [-PHI - 1, 0, 1], [1, PHI + 1, 0], [-1, PHI + 1, 0],
].map((v) => new THREE.Vector3(...v).normalize());

function glas(renderer, textur, B, H) {
  const K = 3;
  const u = {
    uFoto: { value: textur }, uSeiten: { value: B / H }, uPixel: { value: new THREE.Vector2(1 / B, 1 / H) }, uProben: { value: 4 },
    uN: { value: NORMALEN }, uDreh: { value: Array.from({ length: K }, () => new THREE.Matrix3()) },
    uMitte: { value: Array.from({ length: K }, () => new THREE.Vector3()) }, uGroesse: { value: new Array(K).fill(0) },
    uRadien: { value: Array.from({ length: K }, () => new THREE.Vector2(1, 1.3)) },
  };
  const mat = new THREE.ShaderMaterial({
    uniforms: u, depthTest: false, depthWrite: false,
    vertexShader: /* glsl */ `varying vec2 vUv; void main() { vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }`,
    fragmentShader: /* glsl */ `
      #define K ${K}
      uniform sampler2D uFoto; uniform float uSeiten; uniform vec2 uPixel; uniform int uProben; uniform vec3 uN[16];
      uniform mat3 uDreh[K]; uniform vec3 uMitte[K]; uniform float uGroesse[K]; uniform vec2 uRadien[K];
      varying vec2 vUv;
      const float TANH = 0.3152988, KZ = 3.2, EBENE = -1.0;
      bool schneide(vec3 o, vec3 d, vec2 rad, out float s0, out float s1, out vec3 n0, out vec3 n1) {
        s0 = -1e9; s1 = 1e9; n0 = vec3(0.0); n1 = vec3(0.0);
        for (int i = 0; i < 16; i++) {
          float r = i < 6 ? rad.x : rad.y; vec3 n = uN[i]; float dn = dot(d, n), on = dot(o, n);
          if (abs(dn) < 1e-6) { if (abs(on) > r) return false; continue; }
          float a = (-r - on) / dn, b = (r - on) / dn; vec3 na = -n, nb = n;
          if (a > b) { float t = a; a = b; b = t; vec3 tn = na; na = nb; nb = tn; }
          if (a > s0) { s0 = a; n0 = na; }
          if (b < s1) { s1 = b; n1 = nb; }
        }
        return s0 < s1 && s1 > 0.0;
      }
      float kante(vec3 p, vec2 rad, float breite) {
        float a = -1e9, b = -1e9;
        for (int i = 0; i < 16; i++) { float v = abs(dot(p, uN[i])) - (i < 6 ? rad.x : rad.y); if (v > a) { b = a; a = v; } else if (v > b) b = v; }
        return 1.0 - smoothstep(0.0, breite, a - b);
      }
      vec2 aufFoto(vec3 o, vec3 d) { d.z = min(d.z, -0.05); vec3 p = o + d * ((EBENE - o.z) / d.z); float hh = (KZ - EBENE) * TANH; return vec2(p.x / (hh * uSeiten), p.y / hh) * 0.5 + 0.5; }
      vec3 bildpunkt(vec2 uv) {
        vec2 q = uv * 2.0 - 1.0;
        vec3 ro = vec3(0.0, 0.0, KZ), rd = normalize(vec3(q.x * TANH * uSeiten, q.y * TANH, -1.0));
        float best = 1e9; int k = -1; vec3 lo, ld, n0, n1; float s0, s1;
        for (int j = 0; j < K; j++) {
          if (uGroesse[j] < 1e-3) continue;
          mat3 inv = transpose(uDreh[j]); vec3 o = inv * (ro - uMitte[j]) / uGroesse[j], d = inv * rd; float a, b; vec3 m0, m1;
          if (schneide(o, d, uRadien[j], a, b, m0, m1) && a > 0.0 && a * uGroesse[j] < best) { best = a * uGroesse[j]; k = j; lo = o; ld = d; s0 = a; s1 = b; n0 = m0; n1 = m1; }
        }
        if (k < 0) return texture2D(uFoto, uv).rgb;
        mat3 R = uDreh[k]; vec2 rad = uRadien[k]; float g = uGroesse[k]; vec3 M = uMitte[k];
        vec3 e = lo + ld * s0, farbe; float dicke = 0.0;
        for (int c = 0; c < 3; c++) {
          float ior = 1.46 + 0.045 * float(c); vec3 d1 = refract(ld, n0, 1.0 / ior); float a, b; vec3 m0, m1;
          schneide(e + d1 * 1e-4, d1, rad, a, b, m0, m1);
          vec3 x = e + d1 * b, d2 = refract(d1, -m1, ior);
          if (dot(d2, d2) < 1e-6) d2 = reflect(d1, -m1);
          farbe[c] = texture2D(uFoto, aufFoto(R * x * g + M, R * d2))[c];
          if (c == 1) dicke = b;
        }
        farbe *= mix(vec3(1.0), vec3(0.86, 0.92, 1.0), clamp(dicke * 0.35, 0.0, 1.0));
        vec3 rw = R * reflect(ld, n0);
        float F = 0.04 + 0.96 * pow(1.0 - max(dot(-ld, n0), 0.0), 5.0);
        vec3 umgebung = mix(vec3(0.015, 0.012, 0.02), vec3(0.55, 0.6, 0.72), smoothstep(-0.3, 0.9, rw.y));
        vec3 glanz = vec3(1.0, 0.95, 0.88) * pow(max(dot(rw, normalize(vec3(0.6, 0.8, 0.5))), 0.0), 220.0) * 5.0
                   + vec3(1.0, 0.55, 0.25) * pow(max(dot(rw, normalize(vec3(-0.7, -0.2, 0.6))), 0.0), 90.0) * 1.5;
        farbe = mix(farbe, umgebung, F) + glanz;
        float w = 0.012 / max(g, 0.2);
        farbe += vec3(1.0, 0.97, 0.92) * kante(e, rad, w) * 0.8;
        float a2, b2; vec3 m2, m3; vec3 d1g = refract(ld, n0, 1.0 / 1.5);
        schneide(e + d1g * 1e-4, d1g, rad, a2, b2, m2, m3);
        farbe += vec3(0.9, 0.95, 1.0) * kante(e + d1g * b2, rad, w) * 0.28;
        return farbe;
      }
      void main() {
        vec3 c = vec3(0.0);
        for (int i = 0; i < 4; i++) { if (i >= uProben) break; c += bildpunkt(uProben == 1 ? vUv : vUv + (vec2(i % 2, i / 2) - 0.5) * 0.5 * uPixel); }
        gl_FragColor = vec4(c / float(uProben), 1.0);
      }`,
  });
  const szene = new THREE.Scene(), geo = new THREE.PlaneGeometry(2, 2);
  szene.add(new THREE.Mesh(geo, mat));
  const kamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  const look = filmlook(renderer, szene, kamera, { radius: 0.35, schwelle: 0.9 });
  const m4 = new THREE.Matrix4(), eu = new THREE.Euler(), seiten = Math.min(1, (1.25 * B) / H);
  const form = (f, v) => (f < 1 ? v.set(1, 1.3 - 0.24 * weich(f)) : v.set(1 + 0.3 * weich(f - 1), 1.06 - 0.06 * weich(f - 1)));
  const NAMEN = ["dodekaeder", "geode", "ikosaeder"];
  return {
    spanne: [0.5, 9.7], look,
    groesse(w, h) { u.uPixel.value.set(1 / w, 1 / h); u.uProben.value = w >= B * 0.95 ? 4 : 1; },   // in der Vorschau eine Abtastung je Pixel
    bild(t) {
      const auf = inOut(anteil(t, 0.6, 3)), ab = inOut(anteil(t, 8, 9.6));
      const gross = inOut(anteil(t, 5.2, 6.8)) * (1 - inOut(anteil(t, 7, 8.2)));
      u.uGroesse.value[0] = (0.42 + 0.55 * gross) * auf * (1 - ab);
      u.uMitte.value[0].set(0, 0.05, 0);
      u.uDreh.value[0].setFromMatrix4(m4.makeRotationFromEuler(eu.set(t * 0.31 + 0.4, t * 0.47, t * 0.13)));
      form(Math.min(2, Math.max(0, (t - 2.2) / 2.2)), u.uRadien.value[0]);
      for (let j = 1; j < 3; j++) {
        const w = t * (0.55 + 0.2 * j) + j * 2.4, sicht = weich(anteil(t, 1.6 + 0.5 * j, 3 + 0.5 * j)) * (1 - weich(anteil(t, 6.6, 7.6)));
        u.uGroesse.value[j] = (j === 1 ? 0.16 : 0.11) * sicht;
        u.uMitte.value[j].set(Math.cos(w) * 0.78 * seiten, Math.sin(w * 0.8) * 0.75, Math.sin(w) * 0.5);
        u.uDreh.value[j].setFromMatrix4(m4.makeRotationFromEuler(eu.set(t * (0.9 + 0.3 * j), t * 0.6, j)));
        form(j === 1 ? 2 : 0, u.uRadien.value[j]);
      }
      const aktiv = Math.min(1, u.uGroesse.value[0] / 0.2);
      look.render(aktiv, 0.6);
    },
    zaehler(t) { return `körper ${NAMEN[Math.round(Math.min(2, Math.max(0, (t - 2.2) / 2.2)))]} · brechzahl 1,46–1,55`; },
    entsorgen() { geo.dispose(); mat.dispose(); look.entsorgen(); },
  };
}

// ——— Splitter: Voronoi-Scherben mit Dicke in einem Draw-Call, Explosionszeichnung in die Tiefe ———
function schneiden(poly, mx, my, nx, ny) {
  const aus = [], s = (p) => (p[0] - mx) * nx + (p[1] - my) * ny;
  for (let i = 0; i < poly.length; i++) {
    const a = poly[i], b = poly[(i + 1) % poly.length], sa = s(a), sb = s(b);
    if (sa <= 0) aus.push(a);
    if ((sa <= 0) !== (sb <= 0)) { const k = sa / (sa - sb); aus.push([a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k]); }
  }
  return aus;
}
function voronoi(bw, gx, gy, zufall) {
  const orte = [];
  for (let j = 0; j < gy; j++) for (let i = 0; i < gx; i++) orte.push([(-0.5 + (i + 0.5 + (zufall() - 0.5) * 0.85) / gx) * bw, -1 + ((j + 0.5 + (zufall() - 0.5) * 0.85) / gy) * 2]);
  const zellen = [];
  for (let j = 0; j < gy; j++) for (let i = 0; i < gx; i++) {
    const [sx, sy] = orte[j * gx + i];
    let poly = [[-bw / 2, -1], [bw / 2, -1], [bw / 2, 1], [-bw / 2, 1]];
    for (let jj = Math.max(0, j - 2); jj <= Math.min(gy - 1, j + 2); jj++) for (let ii = Math.max(0, i - 2); ii <= Math.min(gx - 1, i + 2); ii++) {
      if (ii === i && jj === j) continue;
      const [ox, oy] = orte[jj * gx + ii];
      poly = schneiden(poly, (sx + ox) / 2, (sy + oy) / 2, ox - sx, oy - sy);
    }
    if (poly.length >= 3) zellen.push(poly);
  }
  return zellen;
}
function scherben(zellen, bw, dicke, zufall) {
  const P = [], N = [], M = [], Z = [], U = [], S = [];
  const ecke = (x, y, z, n, mitte, zz, seite) => { P.push(x, y, z); N.push(...n); M.push(...mitte); Z.push(...zz); U.push(x / bw + 0.5, (y + 1) / 2); S.push(seite); };
  for (const poly of zellen) {
    const cx = poly.reduce((s, p) => s + p[0], 0) / poly.length, cy = poly.reduce((s, p) => s + p[1], 0) / poly.length;
    const mitte = [cx, cy, -dicke / 2], zz = [zufall(), zufall(), zufall(), zufall()];
    for (let i = 1; i < poly.length - 1; i++) {
      for (const p of [poly[0], poly[i], poly[i + 1]]) ecke(p[0], p[1], 0, [0, 0, 1], mitte, zz, 1);
      for (const p of [poly[0], poly[i + 1], poly[i]]) ecke(p[0], p[1], -dicke, [0, 0, -1], mitte, zz, 0);
    }
    for (let i = 0; i < poly.length; i++) {
      const a = poly[i], b = poly[(i + 1) % poly.length], l = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1, n = [(b[1] - a[1]) / l, -(b[0] - a[0]) / l, 0];
      ecke(a[0], a[1], 0, n, mitte, zz, 0.5); ecke(a[0], a[1], -dicke, n, mitte, zz, 0.5); ecke(b[0], b[1], -dicke, n, mitte, zz, 0.5);
      ecke(a[0], a[1], 0, n, mitte, zz, 0.5); ecke(b[0], b[1], -dicke, n, mitte, zz, 0.5); ecke(b[0], b[1], 0, n, mitte, zz, 0.5);
    }
  }
  const geo = new THREE.BufferGeometry();
  for (const [name, d, n] of [["position", P, 3], ["normal", N, 3], ["aMitte", M, 3], ["aZufall", Z, 4], ["aUv", U, 2], ["aSeite", S, 1]]) geo.setAttribute(name, new THREE.Float32BufferAttribute(d, n));
  return geo;
}

function splitter(renderer, textur, B, H) {
  const szene = new THREE.Scene();
  const kamera = new THREE.PerspectiveCamera(FOV, B / H, 0.05, 50);
  const abstand = 1 / Math.tan(THREE.MathUtils.degToRad(FOV / 2));
  const bw = (2 * B) / H, zufall = zufallAus(20261016);
  const gy = grob() ? 18 : 24, gx = Math.round((gy * B) / H), zellen = voronoi(bw, gx, gy, zufall);
  const geo = scherben(zellen, bw, 0.05, zufall);
  const mat = new THREE.ShaderMaterial({
    uniforms: { uFoto: { value: textur }, uAus: { value: 0 }, uZurueck: { value: 0 }, uZeit: { value: 0 }, uLicht: { value: new THREE.Vector3() }, uAkzent: { value: new THREE.Color("#ff6a1f") } },
    vertexShader: /* glsl */ `
      uniform float uAus, uZurueck, uZeit;
      attribute vec3 aMitte; attribute vec4 aZufall; attribute vec2 aUv; attribute float aSeite;
      varying vec2 vUv; varying vec3 vNormal, vSicht; varying float vSeite, vFlug;
      mat3 drehung(vec3 a, float w) {
        a = normalize(a); float s = sin(w), c = cos(w), o = 1.0 - c;
        return mat3(o * a.x * a.x + c, o * a.x * a.y + a.z * s, o * a.z * a.x - a.y * s, o * a.x * a.y - a.z * s, o * a.y * a.y + c, o * a.y * a.z + a.x * s,
                    o * a.z * a.x + a.y * s, o * a.y * a.z - a.x * s, o * a.z * a.z + c);
      }
      void main() {
        float r = length(aMitte.xy), start = 0.45 * min(r / 1.3, 1.0) + 0.3 * aZufall.w;
        float f = smoothstep(start, start + 0.25, uAus) * (1.0 - smoothstep(start, start + 0.25, uZurueck));
        f = f * f * (3.0 - 2.0 * f);
        vec3 richtung = vec3(aMitte.xy * 0.22 + (aZufall.xy - 0.5) * 0.18, 0.15 + 1.1 * aZufall.z);
        vec3 mitte = aMitte + richtung * f * (0.5 + 0.9 * aZufall.w) + f * 0.06 * vec3(sin(uZeit * 0.9 + 6.28 * aZufall.x), cos(uZeit * 0.7 + 6.28 * aZufall.y), 0.0);
        mat3 R = drehung(aZufall.xyz - 0.5 + 1e-3, f * (0.12 + 0.55 * aZufall.w));
        vec4 mv = modelViewMatrix * vec4(R * (position - aMitte) + mitte, 1.0);
        gl_Position = projectionMatrix * mv;
        vNormal = normalMatrix * (R * normal); vSicht = -mv.xyz; vUv = aUv; vSeite = aSeite; vFlug = f;
      }`,
    fragmentShader: /* glsl */ `
      uniform sampler2D uFoto; uniform vec3 uLicht, uAkzent;
      varying vec2 vUv; varying vec3 vNormal, vSicht; varying float vSeite, vFlug;
      void main() {
        vec3 n = normalize(vNormal), v = normalize(vSicht), l = normalize(uLicht);
        if (!gl_FrontFacing) n = -n;
        float diff = max(dot(n, l), 0.0), glanz = pow(max(dot(n, normalize(l + v)), 0.0), 70.0), fres = pow(1.0 - max(dot(n, v), 0.0), 3.0);
        vec3 foto = texture2D(uFoto, vUv).rgb, c;
        if (vSeite > 0.75) c = foto * mix(1.0, 0.45 + 0.85 * diff, vFlug) + vFlug * (0.35 * glanz + 0.2 * fres);
        else if (vSeite > 0.25) c = uAkzent * (0.18 + 0.9 * diff) + 0.9 * glanz;
        else c = foto * 0.12 + 0.4 * fres;
        gl_FragColor = vec4(c, 1.0);
      }`,
  });
  const netz = new THREE.Mesh(geo, mat);
  netz.frustumCulled = false;
  szene.add(netz);
  const look = filmlook(renderer, szene, kamera, { radius: 0.25, schwelle: 0.85 });
  let flug = 0;
  return {
    spanne: [0.9, 10.1], look,
    bild(t) {
      const U = mat.uniforms;
      U.uZeit.value = t;
      U.uAus.value = 1.25 * inOut(anteil(t, 1, 4.6));
      U.uZurueck.value = 1.25 * inOut(anteil(t, 5.8, 9.6));
      flug = Math.min(1, U.uAus.value) * (1 - Math.min(1, U.uZurueck.value));
      const w = 0.42 * Math.sin(((t - 1) / 9) * Math.PI) * flug;
      kamera.position.set(Math.sin(w) * abstand, 0.15 * flug, Math.cos(w) * abstand * (1 + 0.25 * flug));
      kamera.lookAt(0, 0, 0.3 * flug);
      kamera.updateMatrixWorld();                                          // sonst gilt unten noch die Kamera des letzten Bildes
      U.uLicht.value.set(Math.cos(t * 0.8) * 0.7, 0.6, 0.6).transformDirection(kamera.matrixWorldInverse);
      look.render(flug, 0.5);
    },
    zaehler() { return `scherben ${zellen.length} · flug ${Math.round(flug * 100)} %`; },
    entsorgen() { geo.dispose(); mat.dispose(); look.entsorgen(); },
  };
}

// ——— Relief: Helligkeit als Höhe, exakte Normalen, Streiflicht mit Schatten, leuchtende Höhenlinien unter einer Scan-Linie ———
function hoehenfeld(hell, nx, ny, radius) {
  const w = nx + 1, h = ny + 1, f = new Float32Array(w * h), tmp = new Float32Array(w * h);
  for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) f[j * w + i] = hell(i / nx, j / ny) ** 0.9;
  for (let durchgang = 0; durchgang < 2; durchgang++) {
    for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) { let s = 0, n = 0; for (let k = -radius; k <= radius; k++) { const x = i + k; if (x >= 0 && x < w) { s += f[j * w + x]; n++; } } tmp[j * w + i] = s / n; }
    for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) { let s = 0, n = 0; for (let k = -radius; k <= radius; k++) { const y = j + k; if (y >= 0 && y < h) { s += tmp[y * w + i]; n++; } } f[j * w + i] = s / n; }
  }
  return f;
}

function relief(renderer, textur, B, H, hell) {
  const szene = new THREE.Scene();
  const kamera = new THREE.PerspectiveCamera(FOV, B / H, 0.05, 50);
  const abstand = 1 / Math.tan(THREE.MathUtils.degToRad(FOV / 2));
  const breite = (2 * B) / H, schritt = grob() ? 4 : 2.5;
  const nx = Math.round(B / schritt), ny = Math.round(H / schritt);
  const geo = new THREE.PlaneGeometry(breite, 2, nx, ny);                  // Ecken Zeile für Zeile von oben
  const feld = hoehenfeld(hell, nx, ny, Math.max(1, Math.round(nx / 180)));
  const hoehe = new Float32Array((nx + 1) * (ny + 1)), grad = new Float32Array(hoehe.length * 2), dx = breite / nx, dy = 2 / ny, w = nx + 1;
  for (let j = 0; j <= ny; j++) for (let i = 0; i <= nx; i++) {
    const k = j * w + i, f = (ii, jj) => feld[Math.min(ny, Math.max(0, jj)) * w + Math.min(nx, Math.max(0, ii))];
    hoehe[k] = feld[k];
    grad[k * 2] = (f(i + 1, j) - f(i - 1, j)) / (2 * dx);
    grad[k * 2 + 1] = -(f(i, j + 1) - f(i, j - 1)) / (2 * dy);
  }
  geo.setAttribute("aHoehe", new THREE.BufferAttribute(hoehe, 1));
  geo.setAttribute("aGrad", new THREE.BufferAttribute(grad, 2));
  const u = { uTiefe: { value: 0 }, uScan: { value: -9 }, uLinien: { value: 0 }, uAkzent: { value: new THREE.Color("#ff7a2e") } };
  const mat = new THREE.MeshStandardMaterial({ map: textur, emissive: 0xffffff, emissiveMap: textur, roughness: 0.62, metalness: 0.05 });
  mat.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, u);
    shader.vertexShader = shader.vertexShader
      .replace("#include <common>", "#include <common>\nattribute float aHoehe; attribute vec2 aGrad; uniform float uTiefe; varying float vHoehe; varying vec3 vWelt;")
      .replace("#include <begin_vertex>", "vec3 transformed = vec3(position); transformed.z += aHoehe * uTiefe; vHoehe = aHoehe; vWelt = (modelMatrix * vec4(transformed, 1.0)).xyz;")
      .replace("#include <beginnormal_vertex>", "vec3 objectNormal = normalize(vec3(-aGrad * uTiefe, 1.0));");
    shader.fragmentShader = shader.fragmentShader
      .replace("#include <common>", "#include <common>\nuniform float uScan, uLinien; uniform vec3 uAkzent; varying float vHoehe; varying vec3 vWelt;")
      .replace("#include <emissivemap_fragment>", `#include <emissivemap_fragment>
        float hl = vHoehe * 16.0;
        float linie = 1.0 - smoothstep(0.0, 1.4 * fwidth(hl), abs(fract(hl - 0.5) - 0.5));
        float band = exp(-pow((vWelt.y - uScan) / 0.09, 2.0));
        totalEmissiveRadiance += uAkzent * uLinien * (linie * (0.25 + 3.0 * band) + 0.12 * band);`);
  };
  const flaeche = new THREE.Mesh(geo, mat);
  flaeche.castShadow = flaeche.receiveShadow = true;
  szene.add(flaeche);
  const streif = new THREE.DirectionalLight(0xfff1e0, 0);
  Object.assign(streif.shadow.camera, { left: -breite * 0.7, right: breite * 0.7, top: 1.3, bottom: -1.3, near: 0.1, far: 12 });
  streif.shadow.mapSize.set(2048, 2048); streif.shadow.bias = -0.0004; streif.shadow.normalBias = 0.01; streif.castShadow = true;
  const kante = new THREE.PointLight(0xff8a3d, 0, 8, 1.5), himmel = new THREE.HemisphereLight(0x9fb4ff, 0x120a06, 0);
  szene.add(streif, streif.target, kante, himmel);
  const look = filmlook(renderer, szene, kamera, { radius: 0.4, schwelle: 0.6 });
  let tiefe = 0, a = 0;
  return {
    spanne: [0.9, 10.2], look, schatten: true,
    bild(t) {
      const licht = inOut(anteil(t, 1, 3)) * (1 - inOut(anteil(t, 8.2, 10)));
      tiefe = inOut(anteil(t, 1.2, 4)) * (1 - inOut(anteil(t, 7.8, 9.8)));
      const kipp = inOut(anteil(t, 1.5, 5)) * (1 - inOut(anteil(t, 7.4, 10)));
      u.uTiefe.value = 0.42 * tiefe;
      u.uLinien.value = weich(anteil(t, 3, 4)) * (1 - weich(anteil(t, 7.6, 8.6)));
      u.uScan.value = 1.4 - (((t > 5.4 ? t - 5.4 : t - 3)) / 2.4) * 2.8;
      mat.emissiveIntensity = 1 - licht;
      a = -0.6 + 2.6 * inOut(anteil(t, 1, 9));
      streif.position.set(Math.cos(a) * 3, Math.sin(a) * 3, 1.1 + 1.5 * (1 - kipp)); streif.intensity = 3.2 * licht;
      kante.position.set(-Math.cos(a) * 1.6, -Math.sin(a) * 1.6, 0.6); kante.intensity = 3.5 * licht;
      himmel.intensity = 0.35 * licht;
      const k = THREE.MathUtils.degToRad(58) * kipp, s = Math.sin(t * 0.35) * 0.25 * kipp, d = abstand * (1 - 0.18 * kipp);
      kamera.position.set(Math.sin(s) * d, -Math.sin(k) * d, Math.cos(k) * Math.cos(s) * d);
      kamera.lookAt(0, 0.12 * kipp, 0);
      look.render(licht, 0.6);
    },
    zaehler() { return `höhe ${Math.round(tiefe * 100)} % · licht ${Math.round(((a * 180) / Math.PI + 360) % 360)}°`; },
    entsorgen() { geo.dispose(); mat.dispose(); look.entsorgen(); },
  };
}

const BAUEN = { glas, splitter, relief };

/**
 * Räumliche Workflows für ein Foto (Canvas in Filmgrösse). arten: z. B. ["glas", "relief"]; grund: Farbe ausserhalb des Fotos.
 * bild(art, u, w, h) zeichnet den Abschnitt bei u (0 … 1) in w × h Bildpunkten und gibt die Leinwand zurück (gleich danach lesen).
 */
export function raum(foto, arten, { grund = "#000000" } = {}) {
  const B = foto.width, H = foto.height;
  const leinwand = document.createElement("canvas");
  const renderer = new THREE.WebGLRenderer({ canvas: leinwand, antialias: true, preserveDrawingBuffer: true, powerPreference: "high-performance" });
  if (!renderer.capabilities.isWebGL2) throw new Error("dieser Browser kann kein WebGL 2");
  renderer.setPixelRatio(1); renderer.setSize(B, H, false);
  renderer.setClearColor(grund, 1);
  renderer.shadowMap.type = THREE.PCFShadowMap;
  const textur = new THREE.CanvasTexture(foto);
  textur.colorSpace = THREE.SRGBColorSpace; textur.minFilter = THREE.LinearMipmapLinearFilter; textur.anisotropy = 4;
  const ctx = foto.getContext("2d", { willReadFrequently: true }), px = ctx.getImageData(0, 0, B, H).data;
  const hell = (u, v) => { const i = (Math.min(H - 1, Math.round(v * (H - 1))) * B + Math.min(B - 1, Math.round(u * (B - 1)))) * 4; return (0.2126 * px[i] + 0.7152 * px[i + 1] + 0.0722 * px[i + 2]) / 255; };
  const wirkungen = Object.fromEntries(arten.filter((a) => BAUEN[a]).map((a) => [a, BAUEN[a](renderer, textur, B, H, hell)]));
  return {
    arten: Object.keys(wirkungen),
    bild(art, u, w = B, h = H) {
      const W = wirkungen[art];
      if (!W) return null;
      w = Math.max(2, Math.round(w)); h = Math.max(2, Math.round(h));
      const g = renderer.getSize(new THREE.Vector2());
      if (g.x !== w || g.y !== h) renderer.setSize(w, h, false);
      if (W.look.groesse.x !== w || W.look.groesse.y !== h) { W.look.setSize(w, h); W.groesse?.(w, h); }
      renderer.shadowMap.enabled = !!W.schatten;
      const [a, b] = W.spanne;
      W.bild(a + Math.min(1, Math.max(0, u)) * (b - a));
      return leinwand;
    },
    zaehler(art, u) { const W = wirkungen[art]; if (!W) return ""; const [a, b] = W.spanne; return W.zaehler(a + u * (b - a)); },
    entsorgen() { for (const W of Object.values(wirkungen)) W.entsorgen(); textur.dispose(); renderer.dispose(); },
  };
}
