// «Bildfragmentieren» – die Abläufe «Kristall» und «Echo» und ihr leuchtendes Signet (seit 16. Oktober 2026), mit three.js (WebGL 2, lokal in
// vendor/three-0.185.1). Erst geladen, wenn einer der beiden gewählt ist. Jeder zeichnet auf eine eigene WebGL-Leinwand in der Auflösung des Ziels,
// szene.js setzt das Bild ein – Vorschau, Standbild und Video bleiben, wie sie sind. Beide beginnen im Dunkeln und enden exakt beim Foto.
//   Kristall: 01 Körper – drei kleine Kristalle fliegen aus dem Dunkeln herein und verschmelzen zu einem Glaskörper (Dodekaeder → Geode → Ikosaeder);
//             das Foto ist nur durch das Glas zu sehen (Rückmeldung: «die Rolle der kleinen Körper ist unklar») · 02 Bruch – der Körper wächst und
//             zerspringt in Voronoi-Scherben, die in die Tiefe fliegen · 03 Montage – die Scherben kehren eine nach der anderen zurück und rasten ein,
//             bis das Foto steht («das Endbild setzt sich nicht zusammen, sondern erscheint einfach»). Zustandslos.
//   Echo:     01 Konturen – feine Höhenlinien des Fotos (immer einen Bildpunkt breit; «solche Konturen müssen feingliedriger sein»), Tonstufe um
//             Tonstufe · 02 Echo – Rückkopplung wie in TouchDesigner (Zoom, Drehung, Farbdrehung, Spuren) · 03 Kaleidoskop · 04 Bild – das Kaleidoskop
//             faltet sich auf, das Foto baut sich Tonstufe um Tonstufe auf. Die Rückkopplung hängt an den Bildern davor: sie wird in festen Schritten
//             (ein Schritt je Filmbild) von vorn nachgerechnet, darum ist jedes Bild beim Spulen und im Video dasselbe.
// Herkunft: Rezepte 3, 4 und 5 des Skills .claude/skills/threejs-spektakel (dort mit Beispielen und Prüfskript).
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
const QUAD_VERTEX = /* glsl */ `varying vec2 vUv; void main() { vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }`;

// ——— Filmlook: Bloom und Farbsaum, an die Bewegung gekoppelt (in Ruhe: das Bild unverändert) ———
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
    groesse: g.clone(), bloom,
    render(aktiv, staerke, saumStaerke = 0.003) {
      bloom.enabled = aktiv > 0.001 && staerke > 0; bloom.strength = staerke * aktiv;
      saum.uniforms.uSaum.value = saumStaerke * aktiv;
      composer.render();
    },
    setSize(w, h) { composer.setSize(w, h); this.groesse.set(w, h); },
    entsorgen() { composer.dispose(); bloom.dispose(); },
  };
}

// ——— Glas: konvexe Polyeder als Schnitt von Platten |n·p| ≤ r; Ein- und Austritt exakt, Brechung je Farbkanal (Spektralsäume) ———
const PHI = (1 + Math.sqrt(5)) / 2;
const NORMALEN = [
  [0, PHI, 1], [0, -PHI, 1], [1, 0, PHI], [-1, 0, PHI], [PHI, 1, 0], [-PHI, 1, 0],
  [1, 1, 1], [-1, 1, 1], [1, -1, 1], [1, 1, -1], [0, 1, PHI + 1], [0, -1, PHI + 1], [PHI + 1, 0, 1], [-PHI - 1, 0, 1], [1, PHI + 1, 0], [-1, PHI + 1, 0],
].map((v) => new THREE.Vector3(...v).normalize());
const TANH = Math.tan(THREE.MathUtils.degToRad(17.5)), KZ = 3.2;
/** Form über die Radien der beiden Plattensätze: 0 Dodekaeder → 1 Geode (abgestumpft) → 2 Ikosaeder */
const form = (f, v) => (f < 1 ? v.set(1, 1.3 - 0.24 * weich(f)) : v.set(1 + 0.3 * weich(Math.min(1, f - 1)), 1.06 - 0.06 * weich(Math.min(1, f - 1))));
const FORMNAMEN = ["dodekaeder", "geode", "ikosaeder"];

/** Glas-Material für K Körper vor einem Bild (uFoto). Ausserhalb der Körper: Grund oder Bild (uAussen); im Glas: das Bild, gebrochen */
function glasMaterial(K, textur, B, H) {
  const u = {
    uFoto: { value: textur }, uSeiten: { value: B / H }, uPixel: { value: new THREE.Vector2(1 / B, 1 / H) }, uProben: { value: 4 },
    uN: { value: NORMALEN }, uDreh: { value: Array.from({ length: K }, () => new THREE.Matrix3()) },
    uMitte: { value: Array.from({ length: K }, () => new THREE.Vector3()) }, uGroesse: { value: new Array(K).fill(0) },
    uRadien: { value: Array.from({ length: K }, () => new THREE.Vector2(1, 1.3)) }, uTon: { value: Array.from({ length: K }, () => new THREE.Color(1, 1, 1)) },
    uAussen: { value: 0 }, uGrund: { value: new THREE.Color(0, 0, 0) }, uKante: { value: 0.8 }, uBlitz: { value: 0 },
  };
  const mat = new THREE.ShaderMaterial({
    uniforms: u, depthTest: false, depthWrite: false, vertexShader: QUAD_VERTEX,
    fragmentShader: /* glsl */ `
      #define K ${K}
      uniform sampler2D uFoto; uniform float uSeiten, uAussen, uKante, uBlitz; uniform vec2 uPixel; uniform int uProben; uniform vec3 uN[16], uGrund;
      uniform mat3 uDreh[K]; uniform vec3 uMitte[K], uTon[K]; uniform float uGroesse[K]; uniform vec2 uRadien[K];
      varying vec2 vUv;
      const float TANH = ${TANH.toFixed(7)}, KZ = ${KZ.toFixed(1)}, EBENE = -1.0;
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
      vec3 aussen(vec2 uv) { return mix(uGrund, texture2D(uFoto, uv).rgb, uAussen); }
      vec3 bildpunkt(vec2 uv) {
        vec2 q = uv * 2.0 - 1.0;
        vec3 ro = vec3(0.0, 0.0, KZ), rd = normalize(vec3(q.x * TANH * uSeiten, q.y * TANH, -1.0));
        float best = 1e9; int k = -1; vec3 lo, ld, n0, n1; float s0, s1;
        for (int j = 0; j < K; j++) {
          if (uGroesse[j] < 1e-3) continue;
          mat3 inv = transpose(uDreh[j]); vec3 o = inv * (ro - uMitte[j]) / uGroesse[j], d = inv * rd; float a, b; vec3 m0, m1;
          if (schneide(o, d, uRadien[j], a, b, m0, m1) && a > 0.0 && a * uGroesse[j] < best) { best = a * uGroesse[j]; k = j; lo = o; ld = d; s0 = a; s1 = b; n0 = m0; n1 = m1; }
        }
        if (k < 0) return aussen(uv);
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
        farbe *= mix(vec3(1.0), vec3(0.86, 0.92, 1.0), clamp(dicke * 0.35, 0.0, 1.0)) * uTon[k];
        vec3 rw = R * reflect(ld, n0);
        float F = 0.04 + 0.96 * pow(1.0 - max(dot(-ld, n0), 0.0), 5.0);
        vec3 umgebung = mix(vec3(0.015, 0.012, 0.02), vec3(0.55, 0.6, 0.72), smoothstep(-0.3, 0.9, rw.y));
        vec3 glanz = vec3(1.0, 0.95, 0.88) * pow(max(dot(rw, normalize(vec3(0.6, 0.8, 0.5))), 0.0), 220.0) * 5.0
                   + vec3(1.0, 0.55, 0.25) * pow(max(dot(rw, normalize(vec3(-0.7, -0.2, 0.6))), 0.0), 90.0) * 1.5;
        farbe = mix(farbe, umgebung, F) + glanz;
        float w = 0.012 / max(g, 0.2);
        farbe += mix(vec3(1.0, 0.97, 0.92), uTon[k], 0.35) * kante(e, rad, w) * uKante;
        float a2, b2; vec3 m2, m3; vec3 d1g = refract(ld, n0, 1.0 / 1.5);
        schneide(e + d1g * 1e-4, d1g, rad, a2, b2, m2, m3);
        farbe += vec3(0.9, 0.95, 1.0) * kante(e + d1g * b2, rad, w) * 0.35 * uKante;
        return farbe;
      }
      void main() {
        vec3 c = vec3(0.0);
        for (int i = 0; i < 4; i++) { if (i >= uProben) break; c += bildpunkt(uProben == 1 ? vUv : vUv + (vec2(i % 2, i / 2) - 0.5) * 0.5 * uPixel); }
        gl_FragColor = vec4(c / float(uProben) + uBlitz, 1.0);
      }`,
  });
  return { mat, u, groesse(w, h, voll) { u.uPixel.value.set(1 / w, 1 / h); u.uProben.value = voll ? 4 : 1; } };
}

// ——— Scherben: Voronoi-Zellen mit Dicke in einem Draw-Call ———
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
/** Geometrie aller Scherben; aRang: Reihenfolge der Montage (0 zuerst … 1 zuletzt), von der Mitte nach aussen, etwas gestreut */
function scherben(zellen, bw, dicke, zufall) {
  const mitten = zellen.map((p) => [p.reduce((s, q) => s + q[0], 0) / p.length, p.reduce((s, q) => s + q[1], 0) / p.length]);
  const schluessel = mitten.map(([x, y]) => Math.hypot(x, y) + 0.45 * zufall());
  const reihe = schluessel.map((s, i) => [s, i]).sort((a, b) => a[0] - b[0]), rang = new Float32Array(zellen.length);
  reihe.forEach(([, i], k) => { rang[i] = zellen.length > 1 ? k / (zellen.length - 1) : 0; });
  const P = [], N = [], M = [], Z = [], U = [], S = [], R = [];
  zellen.forEach((poly, z) => {
    const [cx, cy] = mitten[z], mitte = [cx, cy, -dicke / 2], zz = [zufall(), zufall(), zufall(), zufall()];
    const ecke = (x, y, zz0, n, seite) => { P.push(x, y, zz0); N.push(...n); M.push(...mitte); Z.push(...zz); U.push(x / bw + 0.5, (y + 1) / 2); S.push(seite); R.push(rang[z]); };
    for (let i = 1; i < poly.length - 1; i++) {
      for (const p of [poly[0], poly[i], poly[i + 1]]) ecke(p[0], p[1], 0, [0, 0, 1], 1);
      for (const p of [poly[0], poly[i + 1], poly[i]]) ecke(p[0], p[1], -dicke, [0, 0, -1], 0);
    }
    for (let i = 0; i < poly.length; i++) {
      const a = poly[i], b = poly[(i + 1) % poly.length], l = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1, n = [(b[1] - a[1]) / l, -(b[0] - a[0]) / l, 0];
      ecke(a[0], a[1], 0, n, 0.5); ecke(a[0], a[1], -dicke, n, 0.5); ecke(b[0], b[1], -dicke, n, 0.5);
      ecke(a[0], a[1], 0, n, 0.5); ecke(b[0], b[1], -dicke, n, 0.5); ecke(b[0], b[1], 0, n, 0.5);
    }
  });
  const geo = new THREE.BufferGeometry();
  for (const [name, d, n] of [["position", P, 3], ["normal", N, 3], ["aMitte", M, 3], ["aZufall", Z, 4], ["aUv", U, 2], ["aSeite", S, 1], ["aRang", R, 1]]) geo.setAttribute(name, new THREE.Float32BufferAttribute(d, n));
  return geo;
}

// ——— Kristall (11 s bei Tempo «normal»: Körper 0–3,6 · Bruch 3,6–6,8 · Montage 6,8–11) ———
const BRUCH = 4.3;   // in diesem Moment zerspringt der Körper
function kristall(renderer, textur, B, H, grund) {
  // Teil 1: Glaskörper vor dem Dunkeln (ein Hauptkörper, drei kleine Kristalle)
  const glas = glasMaterial(4, textur, B, H);
  glas.u.uGrund.value.copy(grund);
  const glasSzene = new THREE.Scene(), quad = new THREE.PlaneGeometry(2, 2);
  glasSzene.add(new THREE.Mesh(quad, glas.mat));
  const ortho = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  const glasLook = filmlook(renderer, glasSzene, ortho, { radius: 0.2, schwelle: 0.92 });   // kleiner Radius: kein Schleier über dem Dunkel
  const seiten = B / H, m4 = new THREE.Matrix4(), eu = new THREE.Euler();
  const KLEIN = [[90, 2, [1, 0.62, 0.42]], [215, 0, [0.55, 0.8, 1]], [330, 1, [0.85, 1, 0.7]]];   // Herkunft (Grad), Form, Tönung

  // Teil 2: Scherben (Bruch und Montage)
  const szene = new THREE.Scene();
  const kamera = new THREE.PerspectiveCamera(FOV, B / H, 0.05, 50);
  const abstand = 1 / Math.tan(THREE.MathUtils.degToRad(FOV / 2));
  const bw = (2 * B) / H, zufall = zufallAus(20261016);
  const gy = grob() ? 18 : 24, gx = Math.round((gy * B) / H), zellen = voronoi(bw, gx, gy, zufall);
  const geo = scherben(zellen, bw, 0.05, zufall);
  const mat = new THREE.ShaderMaterial({
    uniforms: { uFoto: { value: textur }, uAus: { value: 0 }, uZurueck: { value: 0 }, uZeit: { value: 0 }, uLicht: { value: new THREE.Vector3() },
      uAkzent: { value: new THREE.Color("#ff6a1f") }, uBlitz: { value: 0 } },
    vertexShader: /* glsl */ `
      uniform float uAus, uZurueck, uZeit;
      attribute vec3 aMitte; attribute vec4 aZufall; attribute vec2 aUv; attribute float aSeite, aRang;
      varying vec2 vUv; varying vec3 vNormal, vSicht; varying float vSeite, vFlug, vRast;
      mat3 drehung(vec3 a, float w) {
        a = normalize(a); float s = sin(w), c = cos(w), o = 1.0 - c;
        return mat3(o * a.x * a.x + c, o * a.x * a.y + a.z * s, o * a.z * a.x - a.y * s, o * a.x * a.y - a.z * s, o * a.y * a.y + c, o * a.y * a.z + a.x * s,
                    o * a.z * a.x + a.y * s, o * a.y * a.z - a.x * s, o * a.z * a.z + c);
      }
      void main() {
        float r = length(aMitte.xy);
        float aus = smoothstep(0.0, 1.0, (uAus - 0.25 * min(r / 1.3, 1.0) - 0.15 * aZufall.w) / 0.45);   // Bruch: von der Mitte aus, schnell
        float s2 = 0.84 * aRang;                                                                        // Montage: eine Scherbe nach der anderen
        float zur = smoothstep(s2, s2 + 0.16, uZurueck);
        float f = aus * (1.0 - zur);
        f = f * f * (3.0 - 2.0 * f);
        vRast = step(s2 + 0.16, uZurueck) * exp(-(uZurueck - s2 - 0.16) * 45.0);                      // kurzes Aufleuchten beim Einrasten
        vec3 richtung = vec3(aMitte.xy * 0.55 + (aZufall.xy - 0.5) * 0.6, 0.35 + 1.3 * aZufall.z);
        vec3 mitte = aMitte + richtung * f * (0.7 + 1.1 * aZufall.w) + f * 0.08 * vec3(sin(uZeit * 0.9 + 6.28 * aZufall.x), cos(uZeit * 0.7 + 6.28 * aZufall.y), 0.0);
        mat3 R = drehung(aZufall.xyz - 0.5 + 1e-3, f * (0.3 + 1.2 * aZufall.w));
        vec4 mv = modelViewMatrix * vec4(R * (position - aMitte) + mitte, 1.0);
        gl_Position = projectionMatrix * mv;
        vNormal = normalMatrix * (R * normal); vSicht = -mv.xyz; vUv = aUv; vSeite = aSeite; vFlug = f;
      }`,
    fragmentShader: /* glsl */ `
      uniform sampler2D uFoto; uniform vec3 uLicht, uAkzent; uniform float uBlitz;
      varying vec2 vUv; varying vec3 vNormal, vSicht; varying float vSeite, vFlug, vRast;
      void main() {
        vec3 n = normalize(vNormal), v = normalize(vSicht), l = normalize(uLicht);
        if (!gl_FrontFacing) n = -n;
        float diff = max(dot(n, l), 0.0), glanz = pow(max(dot(n, normalize(l + v)), 0.0), 70.0), fres = pow(1.0 - max(dot(n, v), 0.0), 3.0);
        vec3 foto = texture2D(uFoto, vUv).rgb, c;
        if (vSeite > 0.75) c = foto * mix(1.0, 0.55 + 0.75 * diff, vFlug) + vFlug * (0.5 * glanz + 0.25 * fres) + vRast * vec3(0.55, 0.42, 0.3);
        else if (vSeite > 0.25) c = uAkzent * (0.1 + 0.55 * diff) + 0.8 * glanz;   // Schnittkanten: Glut, nicht Fläche
        else c = foto * 0.12 + 0.4 * fres;
        gl_FragColor = vec4(c + uBlitz, 1.0);
      }`,
  });
  const netz = new THREE.Mesh(geo, mat);
  netz.frustumCulled = false;
  szene.add(netz);
  const look = filmlook(renderer, szene, kamera, { radius: 0.3, schwelle: 0.8 });
  let stand = "";

  return {
    dauer: 11, looks: [glasLook, look],
    groesse(w, h) { glas.groesse(w, h, w >= B * 0.95); },
    bild(t) {
      const blitz = 0.45 * Math.exp(-(((t - BRUCH) / 0.08) ** 2));
      if (t < BRUCH) {
        // drei kleine Kristalle fliegen auf Spiralen herein und verschmelzen bei rund 2 s zum grossen Körper
        const u = glas.u, ankunft = [1.75, 1.95, 2.15];
        KLEIN.forEach(([grad, f, ton], j) => {
          const a = anteil(t, 0.12 * j - 0.3, ankunft[j]), w = THREE.MathUtils.degToRad(grad) + 1.6 * (1 - a), r = 1.25 * (1 - inOut(a));   // am Rand schon sichtbar
          u.uMitte.value[j].set(Math.cos(w) * r * seiten, Math.sin(w) * r, -0.4 * (1 - a));
          u.uGroesse.value[j] = 0.15 * weich(anteil(t, 0, 0.5)) * (1 - weich(anteil(t, ankunft[j] - 0.05, ankunft[j] + 0.2)));
          u.uDreh.value[j].setFromMatrix4(m4.makeRotationFromEuler(eu.set(t * (1.3 + 0.4 * j), t * 0.9, j)));
          form(f, u.uRadien.value[j]); u.uTon.value[j].setRGB(...ton);
        });
        const wachsen = weich(anteil(t, 1.7, 2.6)) * (0.45 + 0.75 * inOut(anteil(t, 3.6, BRUCH)));
        u.uGroesse.value[3] = wachsen;
        u.uMitte.value[3].set(0, 0, 0);
        u.uDreh.value[3].setFromMatrix4(m4.makeRotationFromEuler(eu.set(t * 0.33 + 0.4, t * 0.5 + 1.2 * anteil(t, 3.6, BRUCH) ** 2, t * 0.14)));
        form(Math.min(2, Math.max(0, (t - 2.2) / 1.1)), u.uRadien.value[3]);
        const verschmelzen = Math.exp(-(((t - 2.05) / 0.25) ** 2));
        u.uKante.value = 0.75 + 0.45 * verschmelzen;
        u.uBlitz.value = blitz;                                              // kein Zusatzblitz beim Verschmelzen: linear addiert wird er ein grauer Schleier
        stand = `körper ${FORMNAMEN[Math.round(Math.min(2, Math.max(0, (t - 2.2) / 1.1)))]} · kristalle ${[0, 1, 2].filter((j) => t < ankunft[j] + 0.1).length}`;
        glasLook.render(1, 0.32 + 0.15 * verschmelzen);
        return;
      }
      // Bruch und Montage
      const U = mat.uniforms;
      U.uZeit.value = t;
      U.uAus.value = 0.3 + 1.3 * inOut(anteil(t, BRUCH, BRUCH + 1.2));   // im Moment des Bruchs schon auseinander: das ganze Foto zeigt erst die Montage
      U.uZurueck.value = Math.max(0, (t - 6.8) / 3.9);                    // nicht begrenzt: das Aufleuchten der letzten Scherben klingt bis 11 s aus
      U.uBlitz.value = blitz;
      const flug = Math.min(1, U.uAus.value) * (1 - anteil(t, 8.8, 10.7));
      const w = 0.4 * Math.sin(Math.PI * anteil(t, BRUCH, 10.6)) * (1 - anteil(t, 9.6, 10.6));
      kamera.position.set(Math.sin(w) * abstand, 0.12 * w, Math.cos(w) * abstand * (1 + 0.3 * flug));
      kamera.lookAt(0, 0, 0.3 * flug);
      kamera.updateMatrixWorld();                                          // sonst gilt unten noch die Kamera des letzten Bildes
      U.uLicht.value.set(Math.cos(t * 0.8) * 0.7, 0.6, 0.6).transformDirection(kamera.matrixWorldInverse);
      const gesetzt = Math.round(zellen.length * Math.min(1, Math.max(0, (U.uZurueck.value - 0.16) / 0.84)));
      stand = t < 6.8 ? `scherben ${zellen.length} · flug ${Math.round(flug * 100)} %` : `scherben ${gesetzt} / ${zellen.length}`;
      look.render(Math.max(flug, blitz, U.uZurueck.value < 1 ? 0.35 : 0), 0.5);
    },
    zaehler() { return stand; },
    entsorgen() { quad.dispose(); glas.mat.dispose(); glasLook.entsorgen(); geo.dispose(); mat.dispose(); look.entsorgen(); },
  };
}

// ——— Echo (12 s: Konturen 0–3 · Echo 3–6 · Kaleidoskop 6–8,6 · Bild 8,6–12) ———
/** Höhenlinien: so viele Tonstufen, dass die Linien rund 7 % der Fläche decken – unruhige Bilder bekommen weniger, sonst wachsen sie zu (6 bis 18) */
const stufenFuer = (gefaelle) => Math.round(Math.min(18, Math.max(6, 0.07 / (1.6 * Math.max(gefaelle, 1e-4)))));
/** Helligkeit des Fotos, leicht geglättet (für feine, ruhige Höhenlinien), als einkanalige Textur in halber Grösse */
function helligkeitsTextur(px, B, H) {
  const w = Math.round(B / 2), h = Math.round(H / 2), f = new Float32Array(w * h), tmp = new Float32Array(w * h);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const i = (Math.min(H - 1, y * 2) * B + Math.min(B - 1, x * 2)) * 4;
    f[y * w + x] = (0.2126 * px[i] + 0.7152 * px[i + 1] + 0.0722 * px[i + 2]) / 255;
  }
  const r = 3;
  for (let d = 0; d < 2; d++) {
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { let s = 0, n = 0; for (let k = -r; k <= r; k++) { const xx = x + k; if (xx >= 0 && xx < w) { s += f[y * w + xx]; n++; } } tmp[y * w + x] = s / n; }
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { let s = 0, n = 0; for (let k = -r; k <= r; k++) { const yy = y + k; if (yy >= 0 && yy < h) { s += tmp[yy * w + x]; n++; } } f[y * w + x] = s / n; }
  }
  let g = 0;
  for (let y = 1; y < h; y++) for (let x = 1; x < w; x++) g += Math.hypot(f[y * w + x] - f[y * w + x - 1], f[y * w + x] - f[(y - 1) * w + x]);
  const daten = new Uint8Array(w * h);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) daten[(h - 1 - y) * w + x] = Math.round(f[y * w + x] * 255);   // Zeile 0 unten (wie uv)
  const tex = new THREE.DataTexture(daten, w, h, THREE.RedFormat, THREE.UnsignedByteType);
  tex.minFilter = tex.magFilter = THREE.LinearFilter; tex.needsUpdate = true;
  return { tex, stufen: stufenFuer(g / ((w - 1) * (h - 1)) / 2) };   // Gefälle je Filmbildpunkt (die Textur hat die halbe Grösse)
}

const GLSL_ECHO = /* glsl */ `
  uniform sampler2D uHell, uFoto; uniform float uStufen;
  float hell(vec2 uv) { return texture2D(uHell, uv).r; }
  // feine Höhenlinien: je Tonstufe eine Linie, über fwidth immer etwa einen Bildpunkt breit; stufe: die Nummer der Linie
  float linien(vec2 uv, out float stufe) {
    float h = hell(uv) * uStufen; stufe = floor(h + 0.5);
    return 1.0 - smoothstep(0.35, 1.1, abs(fract(h - 0.5) - 0.5) / max(fwidth(h), 1e-4));
  }
  vec3 farbdreh(vec3 c, float w) {
    const mat3 zuYIQ = mat3(0.299, 0.596, 0.211, 0.587, -0.274, -0.523, 0.114, -0.322, 0.312);
    const mat3 zuRGB = mat3(1.0, 1.0, 1.0, 0.956, -0.272, -1.106, 0.621, -0.647, 1.703);
    vec3 y = zuYIQ * c; float cw = cos(w), sw = sin(w); y.yz = mat2(cw, -sw, sw, cw) * y.yz; return zuRGB * y;
  }`;

function echo(renderer, textur, B, H, grund, px) {
  const { tex: hellTex, stufen: STUFEN } = helligkeitsTextur(px, B, H);
  const ortho = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1), quad = new THREE.PlaneGeometry(2, 2);
  const ziel = (w, h) => new THREE.WebGLRenderTarget(w, h, { type: THREE.HalfFloatType, depthBuffer: false, minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter });
  let lesen = ziel(B, H), schreiben = ziel(B, H);
  const gemeinsam = { uHell: { value: hellTex }, uFoto: { value: textur }, uStufen: { value: STUFEN } };
  // ein Schritt der Rückkopplung
  const rueck = new THREE.ShaderMaterial({
    uniforms: { ...gemeinsam, uVorher: { value: null }, uSeiten: { value: B / H }, uZeit: { value: 0 }, uZoom: { value: 1 }, uDreh: { value: 0 }, uWirbel: { value: 0 },
      uZerfall: { value: 0.6 }, uFarbdreh: { value: 0 }, uKaleido: { value: 0 }, uEin: { value: 0 }, uZeigen: { value: 0 } },
    vertexShader: QUAD_VERTEX, depthTest: false, depthWrite: false,
    fragmentShader: /* glsl */ `
      ${GLSL_ECHO}
      uniform sampler2D uVorher; uniform float uSeiten, uZeit, uZoom, uDreh, uWirbel, uZerfall, uFarbdreh, uKaleido, uEin, uZeigen;
      varying vec2 vUv;
      void main() {
        vec2 p = vUv - 0.5; p.x *= uSeiten;
        float a = atan(p.y, p.x), r = length(p), seg = 6.2831853 / 6.0, ak = abs(mod(a + uZeit * 0.06, seg) - 0.5 * seg);
        p = mix(p, r * vec2(cos(ak), sin(ak)), uKaleido);
        float c = cos(uDreh), s = sin(uDreh);
        vec2 q = mat2(c, -s, s, c) * p / uZoom;
        q += uWirbel * 0.004 * vec2(sin(q.y * 9.0 + uZeit * 1.3), cos(q.x * 8.0 - uZeit * 1.1));
        q.x /= uSeiten; q += 0.5;
        vec3 alt = max(farbdreh(texture2D(uVorher, q).rgb, uFarbdreh), 0.0) * uZerfall;
        float stufe; float l = linien(vUv, stufe);
        float sicht = smoothstep(stufe / uStufen - 0.06, stufe / uStufen, uZeigen);                  // Tonstufe um Tonstufe, von dunkel nach hell
        vec3 foto = texture2D(uFoto, vUv).rgb;
        vec3 farbe = mix(vec3(0.85, 0.9, 1.0), foto / max(0.25, max(foto.r, max(foto.g, foto.b))), 0.75) * 0.8;   // Farbe des Fotos, gleich hell
        gl_FragColor = vec4(clamp(max(alt, farbe * l * sicht * uEin), 0.0, 1.0), 1.0);              // Maximum: keine Aufschaukelung
      }`,
  });
  const rueckSzene = new THREE.Scene(); rueckSzene.add(new THREE.Mesh(quad, rueck));
  // Anzeige: Rückkopplung, im Bild-Teil wächst das Foto Tonstufe um Tonstufe darunter hervor; am Ende exakt das Foto
  const zeige = new THREE.ShaderMaterial({
    uniforms: { ...gemeinsam, uSchleife: { value: null }, uAufbau: { value: 0 }, uGrund: { value: grund.clone() }, uHellGrund: { value: grund.getHSL({}).l > 0.5 ? 1 : 0 } },
    vertexShader: QUAD_VERTEX, depthTest: false, depthWrite: false,
    fragmentShader: /* glsl */ `
      ${GLSL_ECHO}
      uniform sampler2D uSchleife; uniform float uAufbau, uHellGrund; uniform vec3 uGrund; varying vec2 vUv;
      void main() {
        vec3 schleife = texture2D(uSchleife, vUv).rgb;
        if (uHellGrund > 0.5) schleife = -min(schleife, 1.0);                                       // auf Weiss: dunkle Linien
        float h = hell(vUv), grenze = uAufbau * 1.12 - 0.06;
        float da = smoothstep(grenze, grenze - 0.06, h);                                            // dunkle Stufen zuerst
        float stufe; float l = linien(vUv, stufe);
        float front = l * smoothstep(0.09, 0.0, abs(stufe / uStufen - grenze));                      // die Linie an der Grenze leuchtet
        vec3 foto = texture2D(uFoto, vUv).rgb;
        vec3 c = mix(uGrund + schleife * (1.0 - uAufbau), foto, da) + front * (1.0 - uAufbau) * 1.2;
        gl_FragColor = vec4(uAufbau >= 1.0 ? foto : c, 1.0);
      }`,
  });
  const anzeige = new THREE.Scene(); anzeige.add(new THREE.Mesh(quad, zeige));
  const look = filmlook(renderer, anzeige, ortho, { radius: 0.2, schwelle: 0.75 });

  const regler = (t) => {
    const u = rueck.uniforms;
    const echoAn = weich(anteil(t, 3, 4)) * (1 - weich(anteil(t, 8.6, 10.2)));
    u.uZeit.value = t;
    u.uZeigen.value = 1.08 * anteil(t, 0.2, 2.8);
    u.uEin.value = (1 - 0.35 * weich(anteil(t, 3, 4))) * (1 - weich(anteil(t, 9.2, 10.4)));
    u.uZerfall.value = 0.5 + 0.34 * echoAn;                                                        // Konturen ohne Spur, im Echo Spuren, die abklingen, bevor sie zuwachsen
    u.uZoom.value = 1 + 0.02 * echoAn * (0.75 + 0.25 * Math.sin(t * 1.1));   // weit genug je Bild: die Spuren bleiben einzelne feine Linien
    u.uDreh.value = 0.004 * echoAn * Math.sin(t * 0.6 + 0.4);
    u.uWirbel.value = echoAn;
    u.uFarbdreh.value = 0.03 * echoAn;
    u.uKaleido.value = weich(anteil(t, 6, 6.9)) * (1 - inOut(anteil(t, 8.6, 10)));
    return echoAn;
  };
  let n = -1, gross = [B, H], stand = "", aktiv = 0;
  const leeren = () => {                                                                         // die Schleife beginnt schwarz, auch auf weissem Grund
    const alt = renderer.getClearColor(new THREE.Color()), altA = renderer.getClearAlpha();
    renderer.setClearColor(0x000000, 1);
    for (const z of [lesen, schreiben]) { renderer.setRenderTarget(z); renderer.clear(); }
    renderer.setRenderTarget(null); renderer.setClearColor(alt, altA);
  };
  const schritt = (t) => {
    regler(t);
    rueck.uniforms.uVorher.value = lesen.texture;
    renderer.setRenderTarget(schreiben); renderer.render(rueckSzene, ortho); renderer.setRenderTarget(null);
    [lesen, schreiben] = [schreiben, lesen];
  };
  return {
    dauer: 12, looks: [look],
    groesse(w, h) {
      if (gross[0] === w && gross[1] === h) return;
      gross = [w, h]; lesen.setSize(w, h); schreiben.setSize(w, h); n = -1;                    // andere Grösse: von vorn rechnen
    },
    /** t: Zeit im Ablauf; k, N: Bild k von N im Abschnitt (die Schritte der Rückkopplung zählen in Filmbildern) */
    bild(t, k, N) {
      if (k < n || n < 0) { leeren(); n = -1; }
      while (n < k) { n++; schritt((n / Math.max(1, N)) * 12); }
      aktiv = regler(t);
      const aufbau = inOut(anteil(t, 8.8, 11.8));
      zeige.uniforms.uSchleife.value = lesen.texture;
      zeige.uniforms.uAufbau.value = t >= 11.8 ? 1 : aufbau;
      const kal = rueck.uniforms.uKaleido.value;
      stand = t < 3 ? `höhenlinien ${Math.round(Math.min(1, rueck.uniforms.uZeigen.value) * STUFEN)} / ${STUFEN}`
        : t < 6 ? `rückkopplung ${Math.round(rueck.uniforms.uZerfall.value * 100)} % · zoom ${(rueck.uniforms.uZoom.value * 100 - 100).toFixed(1)} %`
        : t < 8.6 ? `spiegel 6 · ${Math.round(kal * 100)} %` : `tonstufen ${Math.round(Math.min(1, aufbau * 1.12) * STUFEN)} / ${STUFEN}`;
      look.render(Math.max(aktiv, 0.4 * (1 - aufbau)), 0.25, 0.0015);
    },
    zaehler() { return stand; },
    entsorgen() { lesen.dispose(); schreiben.dispose(); quad.dispose(); rueck.dispose(); zeige.dispose(); hellTex.dispose(); look.entsorgen(); },
  };
}

// ——— Signet in der leuchtenden Fassung: Linie und Schrift glühen, der Punkt läuft als Glaskristall durch die Schlaufe ———
function glanzSignet(renderer, B, H, akzent) {
  const leinwand = document.createElement("canvas"); leinwand.width = B; leinwand.height = H;
  const tex = new THREE.CanvasTexture(leinwand); tex.colorSpace = THREE.SRGBColorSpace;
  const glas = glasMaterial(1, tex, B, H);
  glas.u.uAussen.value = 1; glas.u.uKante.value = 1.1;
  glas.u.uTon.value[0].set(akzent).lerp(new THREE.Color(1, 1, 1), 0.15);
  const szene = new THREE.Scene(), quad = new THREE.PlaneGeometry(2, 2);
  szene.add(new THREE.Mesh(quad, glas.mat));
  const ortho = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  const look = filmlook(renderer, szene, ortho, { radius: 0.55, schwelle: 0.35 });
  const m4 = new THREE.Matrix4(), eu = new THREE.Euler(), welt = (2 * TANH * KZ) / H;
  return {
    looks: [look], leinwand,
    groesse(w, h) { glas.groesse(w, h, w >= B * 0.95); },
    /** zeichnen(ctx): das Signet auf die 2D-Leinwand (mit Grund); punkt: { lage: [x, y] in Filmpunkten, sicht, radius }; f: Bild des Signets */
    bild(zeichnen, punkt, f, hell) {
      const c = leinwand.getContext("2d");
      c.setTransform(1, 0, 0, 1, 0, 0);
      zeichnen(c);
      tex.needsUpdate = true;
      const [x, y] = punkt.lage;
      glas.u.uMitte.value[0].set((x / B - 0.5) * 2 * TANH * KZ * (B / H), (0.5 - y / H) * 2 * TANH * KZ, 0);
      glas.u.uGroesse.value[0] = punkt.sicht * punkt.radius * 2.6 * welt;
      glas.u.uDreh.value[0].setFromMatrix4(m4.makeRotationFromEuler(eu.set(f * 0.05, f * 0.07, f * 0.02)));
      form((f / 60) % 2, glas.u.uRadien.value[0]);
      look.render(1, hell ? 0.25 : 0.8, 0.0025);
    },
    entsorgen() { tex.dispose(); quad.dispose(); glas.mat.dispose(); look.entsorgen(); },
  };
}

const BAUEN = { kristall, echo };

/**
 * Ein räumlicher Ablauf für ein Foto (Canvas in Filmgrösse). art: "kristall" | "echo"; grund: Farbe des Grunds; akzent: Farbe des Punkts im Signet.
 * bild(u, k, N, w, h): das Bild bei u (0 … 1 im Abschnitt; k von N Filmbildern) in w × h Bildpunkten; gibt die Leinwand zurück (gleich danach lesen).
 * signet(zeichnen, punkt, f, w, h): das Signet in der leuchtenden Fassung.
 */
export function raum(foto, art, { grund = "#000000", akzent = "#f08a5d" } = {}) {
  if (!BAUEN[art]) throw new Error(`unbekannter Ablauf: ${art}`);
  const B = foto.width, H = foto.height;
  const leinwand = document.createElement("canvas");
  const renderer = new THREE.WebGLRenderer({ canvas: leinwand, antialias: true, preserveDrawingBuffer: true, powerPreference: "high-performance" });
  if (!renderer.capabilities.isWebGL2) throw new Error("dieser Browser kann kein WebGL 2");
  const g = new THREE.Color(grund);
  renderer.setPixelRatio(1); renderer.setSize(B, H, false);
  renderer.setClearColor(g, 1);
  const textur = new THREE.CanvasTexture(foto);
  textur.colorSpace = THREE.SRGBColorSpace; textur.minFilter = THREE.LinearMipmapLinearFilter; textur.anisotropy = 4;
  const px = foto.getContext("2d", { willReadFrequently: true }).getImageData(0, 0, B, H).data;
  const W = BAUEN[art](renderer, textur, B, H, g, px);
  const S = glanzSignet(renderer, B, H, akzent);
  const hell = g.getHSL({}).l > 0.5;
  const passen = (teil, w, h) => {
    w = Math.max(2, Math.round(w)); h = Math.max(2, Math.round(h));
    const jetzt = renderer.getSize(new THREE.Vector2());
    if (jetzt.x !== w || jetzt.y !== h) renderer.setSize(w, h, false);
    for (const l of teil.looks) if (l.groesse.x !== w || l.groesse.y !== h) l.setSize(w, h);
    teil.groesse(w, h);
  };
  return {
    art, dauer: W.dauer,
    bild(u, k, N, w = B, h = H) {
      passen(W, w, h);
      W.bild(Math.min(1, Math.max(0, u)) * W.dauer, k, N);
      return leinwand;
    },
    signet(zeichnen, punkt, f, w = B, h = H) {
      passen(S, w, h);
      S.bild(zeichnen, punkt, f, hell);
      return leinwand;
    },
    zaehler() { return W.zaehler(); },
    entsorgen() { W.entsorgen(); S.entsorgen(); textur.dispose(); renderer.dispose(); },
  };
}
