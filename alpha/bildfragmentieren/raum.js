// «Bildfragmentieren» – die Abläufe «Kristall» und «Echo» und ihr leuchtendes Signet (seit 16. Oktober 2026), mit three.js (WebGL 2, lokal in
// vendor/three-0.185.1). Erst geladen, wenn einer der beiden gewählt ist. Jeder zeichnet auf eine eigene WebGL-Leinwand in der Auflösung des Ziels,
// szene.js setzt das Bild ein – Vorschau, Standbild und Video bleiben, wie sie sind. Beide beginnen im Dunkeln und enden exakt beim Foto.
//   Kristall: 01 Körper – drei kleine Kristalle fliegen aus dem Dunkeln herein und verschmelzen zu einem Glaskörper (Dodekaeder → Geode → Ikosaeder);
//             das Foto ist nur durch das Glas zu sehen (Rückmeldung: «die Rolle der kleinen Körper ist unklar») · 02 Bruch – der Körper wächst und
//             zerspringt in Voronoi-Scherben, die in die Tiefe fliegen · 03 Montage – die Scherben kehren eine nach der anderen zurück und rasten ein,
//             bis das Foto steht («das Endbild setzt sich nicht zusammen, sondern erscheint einfach»). Zustandslos.
//   Echo:     01 Konturen – feine, helle Höhenlinien des Fotos (immer einen Bildpunkt breit, einfarbig; «solche Konturen müssen feingliedriger sein»,
//             «die Farben der Konturen gefallen mir nicht, dieses Orange»), kurz · 02 Echo – Rückkopplung wie in TouchDesigner (Zoom, Drehung, Wirbel,
//             Spuren) · 03 Bild – das Foto baut sich Tonstufe um Tonstufe auf (das Kaleidoskop dazwischen fiel weg: «dieser Teil geht gar nicht»).
//             Die Rückkopplung hängt an den Bildern davor: sie wird in festen Schritten (ein Schritt je Filmbild) von vorn nachgerechnet, darum ist
//             jedes Bild beim Spulen und im Video dasselbe.
// Herkunft: Rezepte 3, 4 und 5 des Skills .claude/skills/threejs-spektakel (dort mit Beispielen und Prüfskript).
import * as THREE from "three";
import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";
import { RenderPass } from "three/addons/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/addons/postprocessing/UnrealBloomPass.js";
import { ShaderPass } from "three/addons/postprocessing/ShaderPass.js";
import { OutputPass } from "three/addons/postprocessing/OutputPass.js";
import { GPUComputationRenderer } from "three/addons/misc/GPUComputationRenderer.js";

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
/** hell: weisser Grund – dann kein Bloom (er überstrahlt sonst das ganze Bild); proben: Kantenglättung (MSAA) für Geometrie */
function filmlook(renderer, szene, kamera, { radius = 0.4, schwelle = 0.7, hell = false, proben = 0 } = {}) {
  const g = renderer.getSize(new THREE.Vector2());
  const composer = proben ? new EffectComposer(renderer, new THREE.WebGLRenderTarget(g.x, g.y, { type: THREE.HalfFloatType, samples: proben })) : new EffectComposer(renderer);
  composer.setPixelRatio(1); composer.setSize(g.x, g.y);
  composer.addPass(new RenderPass(szene, kamera));
  const bloom = new UnrealBloomPass(g.clone(), 0, radius, schwelle);
  const saum = new ShaderPass(SAUM);
  composer.addPass(bloom); composer.addPass(saum); composer.addPass(new OutputPass());
  return {
    groesse: g.clone(), bloom,
    render(aktiv, staerke, saumStaerke = 0.003) {
      bloom.enabled = !hell && aktiv > 0.001 && staerke > 0; bloom.strength = staerke * aktiv;
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
    uAussen: { value: 0 }, uGrund: { value: new THREE.Color(0, 0, 0) }, uKante: { value: 0.8 }, uBlitz: { value: 0 }, uKantenFarbe: { value: new THREE.Color(0.97, 0.97, 0.97) },
  };
  const mat = new THREE.ShaderMaterial({
    uniforms: u, depthTest: false, depthWrite: false, vertexShader: QUAD_VERTEX,
    fragmentShader: /* glsl */ `
      #define K ${K}
      uniform sampler2D uFoto; uniform float uSeiten, uAussen, uKante, uBlitz; uniform vec2 uPixel; uniform int uProben; uniform vec3 uN[16], uGrund, uKantenFarbe;
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
        float w = 0.007 / max(g, 0.2);                                       // feine, scharfe Kanten in der Kantenfarbe (auf Weiss dunkel)
        farbe = mix(farbe, uKantenFarbe, clamp(kante(e, rad, w) * uKante, 0.0, 1.0));
        float a2, b2; vec3 m2, m3; vec3 d1g = refract(ld, n0, 1.0 / 1.5);
        schneide(e + d1g * 1e-4, d1g, rad, a2, b2, m2, m3);
        farbe = mix(farbe, uKantenFarbe, clamp(kante(e + d1g * b2, rad, w) * 0.35 * uKante, 0.0, 1.0));
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
// Glaskörper und Scherben sind dasselbe Material: klares Glas mit scharfen Spiegelkanten, schwarz-weiss (Rückmeldung: «alle Kanten schärfer, dieses
// Rot geht gar nicht – Spiegel oder schwarz/weiss; die beiden Effekte spielen noch nicht gut zusammen»). Der Körper zerspringt an seinem Ort: die
// Scherben liegen im Moment des Bruchs als Haufen von seiner Grösse in der Mitte und fliegen erst dann auseinander.
const BRUCH = 4.3;   // in diesem Moment zerspringt der Körper
function kristall(renderer, textur, B, H, grund, px, hell) {
  // Teil 1: Glaskörper (ein Hauptkörper, drei kleine Kristalle, die zu ihm verschmelzen)
  const glas = glasMaterial(4, textur, B, H);
  glas.u.uGrund.value.copy(grund);
  glas.u.uKantenFarbe.value.setScalar(hell ? 0.04 : 0.97);
  const glasSzene = new THREE.Scene(), quad = new THREE.PlaneGeometry(2, 2);
  glasSzene.add(new THREE.Mesh(quad, glas.mat));
  const ortho = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  const glasLook = filmlook(renderer, glasSzene, ortho, { radius: 0.15, schwelle: 0.95, hell });
  const seiten = B / H, m4 = new THREE.Matrix4(), eu = new THREE.Euler();
  const KLEIN = [[90, 2], [215, 0], [330, 1]];   // Herkunft (Grad), Form

  // Teil 2: Scherben (Bruch und Montage)
  const szene = new THREE.Scene();
  const kamera = new THREE.PerspectiveCamera(FOV, B / H, 0.05, 50);
  const abstand = 1 / Math.tan(THREE.MathUtils.degToRad(FOV / 2));
  const bw = (2 * B) / H, zufall = zufallAus(20261016);
  const gy = grob() ? 18 : 24, gx = Math.round((gy * B) / H), zellen = voronoi(bw, gx, gy, zufall);
  const geo = scherben(zellen, bw, 0.03, zufall);
  const KOERPER_ENDE = 0.6;                                               // Grösse des Körpers im Moment des Bruchs
  const mat = new THREE.ShaderMaterial({
    uniforms: { uFoto: { value: textur }, uAus: { value: 0 }, uZurueck: { value: 0 }, uZeit: { value: 0 }, uLicht: { value: new THREE.Vector3() },
      uBlitz: { value: 0 }, uHell: { value: hell ? 1 : 0 }, uKern: { value: KOERPER_ENDE * 1.1 } },
    vertexShader: /* glsl */ `
      uniform float uAus, uZurueck, uZeit, uKern;
      attribute vec3 aMitte; attribute vec4 aZufall; attribute vec2 aUv; attribute float aSeite, aRang;
      varying vec2 vUv; varying vec3 vNormal, vSicht; varying float vSeite, vFlug, vRast;
      mat3 drehung(vec3 a, float w) {
        a = normalize(a); float s = sin(w), c = cos(w), o = 1.0 - c;
        return mat3(o * a.x * a.x + c, o * a.x * a.y + a.z * s, o * a.z * a.x - a.y * s, o * a.x * a.y - a.z * s, o * a.y * a.y + c, o * a.y * a.z + a.x * s,
                    o * a.z * a.x + a.y * s, o * a.y * a.z - a.x * s, o * a.z * a.z + c);
      }
      void main() {
        float r = length(aMitte.xy);
        float aus = smoothstep(0.0, 1.0, (uAus - 0.2 * min(r / 1.3, 1.0) - 0.12 * aZufall.w) / 0.5);    // Bruch: von innen nach aussen
        float s2 = 0.84 * aRang;                                                                        // Montage: eine Scherbe nach der anderen
        float zur = smoothstep(s2, s2 + 0.16, uZurueck);
        zur = zur * zur * (3.0 - 2.0 * zur);
        vRast = step(s2 + 0.16, uZurueck) * exp(-(uZurueck - s2 - 0.16) * 45.0);                      // kurzes Aufleuchten beim Einrasten
        // drei Lagen: der Haufen in der Mitte (so gross wie der Körper), der Flug, die Heimat im Foto
        vec3 kern = uKern * pow(aZufall.w, 0.33) * normalize(aZufall.xyz - 0.5 + 1e-3) + vec3(0.0, 0.0, 0.15);   // eine Kugel wie der Körper
        vec3 richtung = vec3(aMitte.xy * 0.55 + (aZufall.xy - 0.5) * 0.6, 0.35 + 1.3 * aZufall.z);
        vec3 flug = aMitte + richtung * (0.7 + 1.1 * aZufall.w) + 0.08 * vec3(sin(uZeit * 0.9 + 6.28 * aZufall.x), cos(uZeit * 0.7 + 6.28 * aZufall.y), 0.0);
        vec3 mitte = mix(mix(kern, flug, aus), aMitte, zur);
        float gross = mix(mix(0.45, 1.0, aus), 1.0, zur);
        float f = (1.0 - zur) * max(aus, 0.25);
        mat3 R = drehung(aZufall.xyz - 0.5 + 1e-3, f * (0.3 + 1.2 * aZufall.w));
        vec4 mv = modelViewMatrix * vec4(R * (position - aMitte) * gross + mitte, 1.0);
        gl_Position = projectionMatrix * mv;
        vNormal = normalMatrix * (R * normal); vSicht = -mv.xyz; vUv = aUv; vSeite = aSeite; vFlug = (1.0 - zur);
      }`,
    fragmentShader: /* glsl */ `
      uniform sampler2D uFoto; uniform vec3 uLicht; uniform float uBlitz, uHell;
      varying vec2 vUv; varying vec3 vNormal, vSicht; varying float vSeite, vFlug, vRast;
      void main() {
        vec3 n = normalize(vNormal), v = normalize(vSicht), l = normalize(uLicht);
        if (!gl_FrontFacing) n = -n;
        float diff = max(dot(n, l), 0.0), glanz = pow(max(dot(n, normalize(l + v)), 0.0), 90.0), fres = pow(1.0 - max(dot(n, v), 0.0), 4.0);
        vec3 rw = reflect(-v, n);
        vec3 spiegel = mix(vec3(0.03), vec3(0.92, 0.93, 0.95), smoothstep(-0.35, 0.75, rw.y)) + 1.4 * glanz;     // Spiegel: schwarz-weiss
        vec3 foto = texture2D(uFoto, vUv).rgb, c;
        // Vorderseite: im Flug ein Spiegel wie der Glaskörper, beim Zurückkehren dreht sich das Stück Foto nach vorn
        if (vSeite > 0.75) c = mix(foto * mix(1.0, 0.6 + 0.6 * diff, vFlug), spiegel, smoothstep(0.35, 0.9, vFlug)) + vRast * mix(vec3(0.4), vec3(-0.25), uHell);
        else if (vSeite > 0.25) c = spiegel;                                                            // Schnittkanten: scharfer Spiegel
        else c = mix(vec3(0.05), spiegel, 0.35 + 0.65 * fres);                                          // Rückseite: dunkles Glas
        gl_FragColor = vec4(c + uBlitz, 1.0);
      }`,
  });
  const netz = new THREE.Mesh(geo, mat);
  netz.frustumCulled = false;
  szene.add(netz);
  const look = filmlook(renderer, szene, kamera, { radius: 0.15, schwelle: 0.95, hell, proben: 4 });
  let stand = "";

  return {
    dauer: 11, looks: [glasLook, look],
    groesse(w, h) { glas.groesse(w, h, w >= B * 0.95); },
    bild(t) {
      const blitz = (hell ? 0 : 0.3) * Math.exp(-(((t - BRUCH) / 0.07) ** 2));
      if (t < BRUCH) {
        // drei kleine Kristalle fliegen auf Spiralen herein und verschmelzen bei rund 2 s zum grossen Körper
        const u = glas.u, ankunft = [1.75, 1.95, 2.15];
        KLEIN.forEach(([grad, f], j) => {
          const a = anteil(t, 0.12 * j - 0.3, ankunft[j]), w = THREE.MathUtils.degToRad(grad) + 1.6 * (1 - a), r = 1.25 * (1 - inOut(a));   // am Rand schon sichtbar
          u.uMitte.value[j].set(Math.cos(w) * r * seiten, Math.sin(w) * r, -0.4 * (1 - a));
          u.uGroesse.value[j] = 0.15 * weich(anteil(t, 0, 0.5)) * (1 - weich(anteil(t, ankunft[j] - 0.05, ankunft[j] + 0.2)));
          u.uDreh.value[j].setFromMatrix4(m4.makeRotationFromEuler(eu.set(t * (1.3 + 0.4 * j), t * 0.9, j)));
          form(f, u.uRadien.value[j]);
        });
        // der Körper wächst bis zum Bruch nur auf KOERPER_ENDE: die Scherben übernehmen genau seinen Platz
        u.uGroesse.value[3] = weich(anteil(t, 1.7, 2.6)) * (0.45 + (KOERPER_ENDE - 0.45) * inOut(anteil(t, 3.0, BRUCH)));
        u.uMitte.value[3].set(0, 0, 0);
        u.uDreh.value[3].setFromMatrix4(m4.makeRotationFromEuler(eu.set(t * 0.33 + 0.4, t * 0.5 + 1.6 * anteil(t, 3.4, BRUCH) ** 2, t * 0.14)));
        form(Math.min(2, Math.max(0, (t - 2.2) / 1.1)), u.uRadien.value[3]);
        u.uKante.value = 0.85;
        u.uBlitz.value = blitz;
        stand = `körper ${FORMNAMEN[Math.round(Math.min(2, Math.max(0, (t - 2.2) / 1.1)))]} · kristalle ${[0, 1, 2].filter((j) => t < ankunft[j] + 0.1).length}`;
        glasLook.render(1, 0.25);
        return;
      }
      // Bruch und Montage
      const U = mat.uniforms;
      U.uZeit.value = t;
      U.uAus.value = 1.4 * inOut(anteil(t, BRUCH, BRUCH + 1.4));
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
      look.render(Math.max(flug, U.uZurueck.value < 1 ? 0.35 : 0), 0.25);
    },
    zaehler() { return stand; },
    entsorgen() { quad.dispose(); glas.mat.dispose(); glasLook.entsorgen(); geo.dispose(); mat.dispose(); look.entsorgen(); },
  };
}

// ——— Echo (10 s: Konturen 0–1,6 · Echo 1,6–6,6 · Bild 6,6–10) ———
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

function echo(renderer, textur, B, H, grund, px, hell) {
  const { tex: hellTex, stufen: STUFEN } = helligkeitsTextur(px, B, H);
  const ortho = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1), quad = new THREE.PlaneGeometry(2, 2);
  const ziel = (w, h) => new THREE.WebGLRenderTarget(w, h, { type: THREE.HalfFloatType, depthBuffer: false, minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter });
  let lesen = ziel(B, H), schreiben = ziel(B, H);
  const gemeinsam = { uHell: { value: hellTex }, uFoto: { value: textur }, uStufen: { value: STUFEN } };
  // ein Schritt der Rückkopplung
  const rueck = new THREE.ShaderMaterial({
    uniforms: { ...gemeinsam, uVorher: { value: null }, uSeiten: { value: B / H }, uZeit: { value: 0 }, uZoom: { value: 1 }, uDreh: { value: 0 }, uWirbel: { value: 0 },
      uZerfall: { value: 0.6 }, uFarbdreh: { value: 0 }, uEin: { value: 0 }, uZeigen: { value: 0 } },
    vertexShader: QUAD_VERTEX, depthTest: false, depthWrite: false,
    fragmentShader: /* glsl */ `
      ${GLSL_ECHO}
      uniform sampler2D uVorher; uniform float uSeiten, uZeit, uZoom, uDreh, uWirbel, uZerfall, uFarbdreh, uEin, uZeigen;
      varying vec2 vUv;
      void main() {
        vec2 p = vUv - 0.5; p.x *= uSeiten;
        float c = cos(uDreh), s = sin(uDreh);
        vec2 q = mat2(c, -s, s, c) * p / uZoom;
        q += uWirbel * 0.004 * vec2(sin(q.y * 9.0 + uZeit * 1.3), cos(q.x * 8.0 - uZeit * 1.1));
        q.x /= uSeiten; q += 0.5;
        vec3 alt = max(farbdreh(texture2D(uVorher, q).rgb, uFarbdreh), 0.0) * uZerfall;
        float stufe; float l = linien(vUv, stufe);
        float sicht = smoothstep(stufe / uStufen - 0.06, stufe / uStufen, uZeigen);                  // Tonstufe um Tonstufe, von dunkel nach hell
        vec3 farbe = vec3(0.78, 0.8, 0.84);                                                         // einfarbig hell, ein Hauch kühl
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
        vec3 c = mix(uGrund + schleife * (1.0 - uAufbau), foto, da) + front * (1.0 - uAufbau) * (uHellGrund > 0.5 ? -0.9 : 1.2);   // auf Weiss dunkel
        gl_FragColor = vec4(uAufbau >= 1.0 ? foto : c, 1.0);
      }`,
  });
  const anzeige = new THREE.Scene(); anzeige.add(new THREE.Mesh(quad, zeige));
  const look = filmlook(renderer, anzeige, ortho, { radius: 0.2, schwelle: 0.75, hell });

  const regler = (t) => {
    const u = rueck.uniforms;
    const echoAn = weich(anteil(t, 0.9, 2.0)) * (1 - weich(anteil(t, 6.6, 8.2)));   // die Bewegung setzt früh ein
    u.uZeit.value = t;
    u.uZeigen.value = 1.08 * anteil(t, 0.05, 1.5);
    u.uEin.value = (1 - 0.35 * weich(anteil(t, 1.6, 2.6))) * (1 - weich(anteil(t, 7.2, 8.4)));
    u.uZerfall.value = 0.5 + 0.34 * echoAn;                                                        // Konturen ohne Spur, im Echo Spuren, die abklingen, bevor sie zuwachsen
    u.uZoom.value = 1 + 0.02 * echoAn * (0.75 + 0.25 * Math.sin(t * 1.1));   // weit genug je Bild: die Spuren bleiben einzelne feine Linien
    u.uDreh.value = 0.005 * echoAn * Math.sin(t * 0.55 + 0.4);                                   // die Drehung wechselt einmal die Richtung
    u.uWirbel.value = echoAn;
    u.uFarbdreh.value = 0;                                                                        // keine Farbdrehung: die Spuren bleiben einfarbig
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
    dauer: 10, looks: [look],
    groesse(w, h) {
      if (gross[0] === w && gross[1] === h) return;
      gross = [w, h]; lesen.setSize(w, h); schreiben.setSize(w, h); n = -1;                    // andere Grösse: von vorn rechnen
    },
    /** t: Zeit im Ablauf; k, N: Bild k von N im Abschnitt (die Schritte der Rückkopplung zählen in Filmbildern) */
    bild(t, k, N) {
      if (k < n || n < 0) { leeren(); n = -1; }
      while (n < k) { n++; schritt((n / Math.max(1, N)) * 10); }
      aktiv = regler(t);
      const aufbau = inOut(anteil(t, 6.8, 9.8));
      zeige.uniforms.uSchleife.value = lesen.texture;
      zeige.uniforms.uAufbau.value = t >= 9.8 ? 1 : aufbau;
      stand = t < 1.6 ? `höhenlinien ${Math.round(Math.min(1, rueck.uniforms.uZeigen.value) * STUFEN)} / ${STUFEN}`
        : t < 6.6 ? `rückkopplung ${Math.round(rueck.uniforms.uZerfall.value * 100)} % · zoom ${(rueck.uniforms.uZoom.value * 100 - 100).toFixed(1)} %`
        : `tonstufen ${Math.round(Math.min(1, aufbau * 1.12) * STUFEN)} / ${STUFEN}`;
      look.render(Math.max(aktiv, 0.4 * (1 - aufbau)), 0.25, 0.0015);
    },
    zaehler() { return stand; },
    entsorgen() { lesen.dispose(); schreiben.dispose(); quad.dispose(); rueck.dispose(); zeige.dispose(); hellTex.dispose(); look.entsorgen(); },
  };
}

// ——— Strom (12 s: Funken 0–2,4 · Strom 2,4–8 · Bild 8–12) ———
// Rund 25 000 Teilchen, je eine glänzende Kugel in der Farbe ihres Bildpunkts (Rückmeldung zum Showreel: «zu wenig kontrastreich und glänzend»).
// Sie tauchen verstreut im Dunkeln auf, ziehen in einem Rauschfeld zu Bändern und Tüchern zusammen und fliegen dann an ihren Platz im Foto, das am
// Schluss exakt steht. Lage und Tempo liegen in Float-Texturen (GPUComputationRenderer); wie bei Echo ein fester Schritt je Filmbild, von vorn.
const GLSL_RAUSCHEN = /* glsl */ `
vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec4 mod289(vec4 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec4 permute(vec4 x) { return mod289(((x * 34.0) + 1.0) * x); }
vec4 taylorInvSqrt(vec4 r) { return 1.79284291400159 - 0.85373472095314 * r; }
float snoise(vec3 v) {
  const vec2 C = vec2(1.0 / 6.0, 1.0 / 3.0);
  const vec4 D = vec4(0.0, 0.5, 1.0, 2.0);
  vec3 i = floor(v + dot(v, C.yyy));
  vec3 x0 = v - i + dot(i, C.xxx);
  vec3 g = step(x0.yzx, x0.xyz);
  vec3 l = 1.0 - g;
  vec3 i1 = min(g.xyz, l.zxy);
  vec3 i2 = max(g.xyz, l.zxy);
  vec3 x1 = x0 - i1 + C.xxx;
  vec3 x2 = x0 - i2 + C.yyy;
  vec3 x3 = x0 - D.yyy;
  i = mod289(i);
  vec4 p = permute(permute(permute(i.z + vec4(0.0, i1.z, i2.z, 1.0)) + i.y + vec4(0.0, i1.y, i2.y, 1.0)) + i.x + vec4(0.0, i1.x, i2.x, 1.0));
  float n_ = 0.142857142857;
  vec3 ns = n_ * D.wyz - D.xzx;
  vec4 j = p - 49.0 * floor(p * ns.z * ns.z);
  vec4 x_ = floor(j * ns.z);
  vec4 y_ = floor(j - 7.0 * x_);
  vec4 x = x_ * ns.x + ns.yyyy;
  vec4 y = y_ * ns.x + ns.yyyy;
  vec4 h = 1.0 - abs(x) - abs(y);
  vec4 b0 = vec4(x.xy, y.xy);
  vec4 b1 = vec4(x.zw, y.zw);
  vec4 s0 = floor(b0) * 2.0 + 1.0;
  vec4 s1 = floor(b1) * 2.0 + 1.0;
  vec4 sh = -step(h, vec4(0.0));
  vec4 a0 = b0.xzyw + s0.xzyw * sh.xxyy;
  vec4 a1 = b1.xzyw + s1.xzyw * sh.zzww;
  vec3 p0 = vec3(a0.xy, h.x);
  vec3 p1 = vec3(a0.zw, h.y);
  vec3 p2 = vec3(a1.xy, h.z);
  vec3 p3 = vec3(a1.zw, h.w);
  vec4 norm = taylorInvSqrt(vec4(dot(p0, p0), dot(p1, p1), dot(p2, p2), dot(p3, p3)));
  p0 *= norm.x; p1 *= norm.y; p2 *= norm.z; p3 *= norm.w;
  vec4 m = max(0.6 - vec4(dot(x0, x0), dot(x1, x1), dot(x2, x2), dot(x3, x3)), 0.0);
  m = m * m;
  return 42.0 * dot(m * m, vec4(dot(p0, x0), dot(p1, x1), dot(p2, x2), dot(p3, x3)));
}
vec3 rauschFeld(vec3 p) { return vec3(snoise(p), snoise(p + vec3(31.416, -47.853, 12.793)), snoise(p + vec3(-233.145, -113.408, -185.31))); }
vec3 curl(vec3 p) {
  const float e = 0.1;
  vec3 dx = vec3(e, 0.0, 0.0), dy = vec3(0.0, e, 0.0), dz = vec3(0.0, 0.0, e);
  vec3 x0 = rauschFeld(p - dx), x1 = rauschFeld(p + dx);
  vec3 y0 = rauschFeld(p - dy), y1 = rauschFeld(p + dy);
  vec3 z0 = rauschFeld(p - dz), z1 = rauschFeld(p + dz);
  return vec3((y1.z - y0.z) - (z1.y - z0.y), (z1.x - z0.x) - (x1.z - x0.z), (x1.y - x0.y) - (y1.x - y0.x)) / (2.0 * e);
}
`;
function strom(renderer, textur, B, H, grund, px, hell) {
  const S = grob() ? 128 : 160, N = S * S, SCHRITTE = 2, DAUER = 12;   // wenige, grosse Kugeln: so bilden sich sichtbare Bänder (262 144 gaben nur Staub)
  const szene = new THREE.Scene();
  const kamera = new THREE.PerspectiveCamera(FOV, B / H, 0.05, 50);
  const abstand = 1 / Math.tan(THREE.MathUtils.degToRad(FOV / 2)), breite = (2 * B) / H;
  const gpu = new GPUComputationRenderer(S, S, renderer);
  const startLage = gpu.createTexture(), startTempo = gpu.createTexture(), heim = gpu.createTexture();
  const ref = new Float32Array(N * 2), fotoUv = new Float32Array(N * 2), zufall = zufallAus(20261017);
  for (let i = 0; i < N; i++) {
    const u = ((i % S) + zufall()) / S, v = (Math.floor(i / S) + zufall()) / S;      // geschichtete Zufallspunkte auf dem Foto
    heim.image.data.set([(u - 0.5) * breite, (v - 0.5) * 2, 0, 1], i * 4);
    // Anfang: auf einer Fläche, aber an zufälligen Plätzen (kein Foto); das Feld faltet die Fläche zu Bändern und Tüchern. w: wann es aufleuchtet
    startLage.image.data.set([(zufall() - 0.5) * breite * 1.1, (zufall() - 0.5) * 2.2, 0.02 * (zufall() - 0.5), zufall()], i * 4);
    ref.set([((i % S) + 0.5) / S, (Math.floor(i / S) + 0.5) / S], i * 2);
    fotoUv.set([u, v], i * 2);
  }
  heim.needsUpdate = true;
  const tempo = gpu.addVariable("textureTempo", /* glsl */ `
    ${GLSL_RAUSCHEN}
    uniform sampler2D uHeim; uniform float uZeit, uDt, uChaos, uFeder;
    void main() {
      vec2 uv = gl_FragCoord.xy / resolution.xy;
      vec4 L = texture2D(textureLage, uv); vec3 p = L.xyz, v = texture2D(textureTempo, uv).xyz, h = texture2D(uHeim, uv).xyz;
      // mit der Strömung treiben statt beschleunigen: die Fläche bleibt eine Fläche und faltet sich zu Bändern und Tüchern (mit Schwung mischten
      // sich die Bahnen nach wenigen Sekunden zu einer gleichmässigen Wolke)
      vec3 ziel = rauschFeld(p * 1.1 + vec3(0.0, 0.0, uZeit * 0.16)) * uChaos * 0.42;
      v = mix(v, ziel, 1.0 - exp(-uDt * 3.0));
      v += ((h - p) * uFeder - p * 6.0 * max(0.0, length(p * vec3(0.8, 1.0, 1.4)) - 1.2)) * uDt;     // Feder nach Hause, weiche Grenze
      v *= exp(-uDt * 2.2 * sqrt(uFeder));
      gl_FragColor = vec4(v, 1.0);
    }`, startTempo);
  const lage = gpu.addVariable("textureLage", /* glsl */ `
    uniform float uDt;
    void main() { vec2 uv = gl_FragCoord.xy / resolution.xy; vec4 L = texture2D(textureLage, uv); gl_FragColor = vec4(L.xyz + texture2D(textureTempo, uv).xyz * uDt, L.w); }`, startLage);
  gpu.setVariableDependencies(tempo, [lage, tempo]);
  gpu.setVariableDependencies(lage, [lage, tempo]);
  Object.assign(tempo.material.uniforms, { uHeim: { value: heim }, uZeit: { value: 0 }, uDt: { value: 0 }, uChaos: { value: 0 }, uFeder: { value: 0 } });
  lage.material.uniforms.uDt = { value: 0 };
  const fehler = gpu.init();
  if (fehler) throw new Error(fehler);

  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.BufferAttribute(new Float32Array(N * 3), 3));
  geo.setAttribute("aRef", new THREE.BufferAttribute(ref, 2));
  geo.setAttribute("aUv", new THREE.BufferAttribute(fotoUv, 2));
  const punktMat = new THREE.ShaderMaterial({
    uniforms: { uLage: { value: null }, uTempo: { value: null }, uHeim: { value: heim }, uFoto: { value: textur }, uEinrasten: { value: 0 }, uZeit: { value: 0 },
      uPunkt: { value: (2 / S) * 1.7 }, uPixelJeEinheit: { value: H / 2 / Math.tan(THREE.MathUtils.degToRad(FOV / 2)) } },
    vertexShader: /* glsl */ `
      uniform sampler2D uLage, uTempo, uHeim, uFoto; uniform float uEinrasten, uZeit, uPunkt, uPixelJeEinheit;
      attribute vec2 aRef, aUv; varying vec3 vFarbe; varying float vAlpha;
      void main() {
        vec4 L = texture2D(uLage, aRef);
        vec3 p = mix(L.xyz, texture2D(uHeim, aRef).xyz, uEinrasten);
        float geschw = length(texture2D(uTempo, aRef).xyz), auf = smoothstep(L.w * 1.8, L.w * 1.8 + 0.5, uZeit);   // Funken leuchten nacheinander auf
        vec4 mv = modelViewMatrix * vec4(p, 1.0);
        gl_Position = projectionMatrix * mv;
        gl_PointSize = clamp(uPunkt * uPixelJeEinheit / -mv.z * (0.35 + 0.65 * auf), 1.0, uPunkt * uPixelJeEinheit * 0.6);
        vFarbe = texture2D(uFoto, aUv).rgb * (1.0 + 0.15 * smoothstep(0.3, 3.0, geschw));
        vAlpha = auf * (1.0 - uEinrasten);
      }`,
    fragmentShader: /* glsl */ `
      varying vec3 vFarbe; varying float vAlpha;
      void main() {
        vec2 p = gl_PointCoord * 2.0 - 1.0; p.y = -p.y;
        float r2 = dot(p, p);
        if (r2 > 1.0 || vAlpha < 0.01) discard;
        vec3 n = vec3(p, sqrt(1.0 - r2)), l = normalize(vec3(-0.45, 0.6, 0.66));
        float diff = max(dot(n, l), 0.0), glanz = pow(max(dot(reflect(-l, n), vec3(0.0, 0.0, 1.0)), 0.0), 36.0);
        vec3 kugel = vFarbe * (0.18 + 0.95 * diff) * (0.55 + 0.45 * n.z) + vec3(1.0, 0.97, 0.92) * glanz * 1.1;   // Kugel: Licht, dunkler Rand, Glanzpunkt
        gl_FragColor = vec4(kugel, (1.0 - smoothstep(0.86, 1.0, r2)) * vAlpha);
      }`,
    transparent: true, depthWrite: false,
  });
  const punkte = new THREE.Points(geo, punktMat);
  punkte.frustumCulled = false;
  const flaeche = new THREE.Mesh(new THREE.PlaneGeometry(breite, 2), new THREE.MeshBasicMaterial({ map: textur, transparent: true, opacity: 0 }));
  szene.add(flaeche, punkte);
  const look = filmlook(renderer, szene, kamera, { radius: 0.3, schwelle: 0.8, hell });

  const regler = (t) => {
    const U = tempo.material.uniforms;
    U.uZeit.value = t;
    U.uChaos.value = (1.6 + 1.8 * weich(anteil(t, 1.6, 3.0))) * (1 - weich(anteil(t, 7.4, 9.4)));   // von Anfang an Strömung: die Bänder bilden sich früh
    U.uFeder.value = 22 * inOut(anteil(t, 7.8, 10.4));
  };
  let n = -1, stand = "";
  const zuruecksetzen = () => { for (const [v, st] of [[lage, startLage], [tempo, startTempo]]) for (const z of v.renderTargets) gpu.renderTexture(st, z); };
  return {
    dauer: DAUER, looks: [look],
    groesse(w, h) { punktMat.uniforms.uPixelJeEinheit.value = h / 2 / Math.tan(THREE.MathUtils.degToRad(FOV / 2)); },
    bild(t, k, Nb) {
      const dt = DAUER / Math.max(1, Nb) / SCHRITTE;
      if (k < n || n < 0) { zuruecksetzen(); n = 0; }
      while (n < k) {
        n++; regler((n / Math.max(1, Nb)) * DAUER);
        tempo.material.uniforms.uDt.value = dt; lage.material.uniforms.uDt.value = dt;
        for (let i = 0; i < SCHRITTE; i++) gpu.compute();
      }
      regler(t);
      const einrasten = inOut(anteil(t, 10.4, 11.6));
      const m = punktMat.uniforms;
      m.uLage.value = gpu.getCurrentRenderTarget(lage).texture;
      m.uTempo.value = gpu.getCurrentRenderTarget(tempo).texture;
      m.uEinrasten.value = t >= 11.6 ? 1 : einrasten; m.uZeit.value = t;
      flaeche.material.opacity = t >= 11.6 ? 1 : einrasten;
      const frei = 1 - einrasten, w = 0.55 * Math.sin(Math.PI * anteil(t, 1.5, 10.4));
      kamera.position.set(Math.sin(w) * abstand, 0.2 * w, Math.cos(w) * abstand * (1 + 0.25 * frei));
      kamera.lookAt(0, 0, 0);
      const ch = tempo.material.uniforms.uChaos.value, fe = tempo.material.uniforms.uFeder.value;
      stand = t < 2.4 ? `teilchen ${N.toLocaleString("de-CH")} · auf ${Math.round(anteil(t, 0, 2.3) * 100)} %` : t < 8 ? `strom ${Math.round((ch / 3.4) * 100)} %` : `feder ${Math.round((fe / 22) * 100)} %`;
      look.render(frei, 0.3, 0);
    },
    zaehler() { return stand; },
    entsorgen() { gpu.dispose(); geo.dispose(); punktMat.dispose(); flaeche.geometry.dispose(); flaeche.material.dispose(); heim.dispose(); look.entsorgen(); },
  };
}

// ——— Signet in der leuchtenden Fassung: Linie und Schrift klar wie immer; nur der Punkt leuchtet – ein Glaskristall mit Halo und Bokeh, das ihm auf
//     der Bahn folgt (Rückmeldung: «das Signet ist immer noch zu stark überblendet; vielleicht sollte einfach der laufende Punkt leuchten») ———
function glanzSignet(renderer, B, H, akzent, hell) {
  const leinwand = document.createElement("canvas"); leinwand.width = B; leinwand.height = H;
  const tex = new THREE.CanvasTexture(leinwand); tex.colorSpace = THREE.SRGBColorSpace;
  const glas = glasMaterial(1, tex, B, H);
  glas.u.uAussen.value = 1; glas.u.uKante.value = 0.75;
  glas.u.uTon.value[0].set(akzent);
  glas.u.uKantenFarbe.value.set(akzent).lerp(new THREE.Color(hell ? 0 : 1, hell ? 0 : 1, hell ? 0 : 1), 0.5);
  const szene = new THREE.Scene(), quad = new THREE.PlaneGeometry(2, 2);
  szene.add(new THREE.Mesh(quad, glas.mat));
  const ortho = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  const look = filmlook(renderer, szene, ortho, { radius: 0.12, schwelle: 0.6, hell });
  const m4 = new THREE.Matrix4(), eu = new THREE.Euler(), welt = (2 * TANH * KZ) / H;
  return {
    looks: [look], leinwand,
    groesse(w, h) { glas.groesse(w, h, w >= B * 0.95); },
    /** zeichnen(ctx): das Signet auf die 2D-Leinwand (mit Grund); punkt: { lage: [x, y] in Filmpunkten, sicht, radius, spur: [[x, y], …] (frühere
     *  Lagen, die nächste zuerst), farbe }; f: Bild des Signets */
    bild(zeichnen, punkt, f, hell) {
      const c = leinwand.getContext("2d");
      c.setTransform(1, 0, 0, 1, 0, 0);
      zeichnen(c);
      // Halo und Bokeh: nur um den Punkt, auf Schwarz aufhellend, auf Weiss nur ein Hauch
      if (punkt.sicht > 0) {
        const [x, y] = punkt.lage, r = punkt.radius, farbe = new THREE.Color(punkt.farbe), rgb = (a) => `rgba(${Math.round(farbe.r * 255)}, ${Math.round(farbe.g * 255)}, ${Math.round(farbe.b * 255)}, ${a})`;
        c.save();
        c.globalCompositeOperation = hell ? "multiply" : "lighter";
        const st = hell ? 0.35 : 1;
        const halo = c.createRadialGradient(x, y, r * 0.4, x, y, r * 10);
        halo.addColorStop(0, rgb(0.95 * st * punkt.sicht)); halo.addColorStop(0.18, rgb(0.42 * st * punkt.sicht)); halo.addColorStop(0.5, rgb(0.1 * st * punkt.sicht)); halo.addColorStop(1, rgb(0));
        c.fillStyle = halo; c.beginPath(); c.arc(x, y, r * 10, 0, Math.PI * 2); c.fill();
        (punkt.spur ?? []).forEach(([bx, by], i) => {                     // Bokeh: weiche Scheiben mit hellerem Rand, nach hinten grösser und blasser
          const br = r * (2.1 + 0.8 * i), a = (0.34 - 0.06 * i) * st * punkt.sicht;
          if (a <= 0) return;
          const g = c.createRadialGradient(bx, by, 0, bx, by, br);
          g.addColorStop(0, rgb(a * 0.6)); g.addColorStop(0.82, rgb(a)); g.addColorStop(0.92, rgb(a * 1.6)); g.addColorStop(1, rgb(0));
          c.fillStyle = g; c.beginPath(); c.arc(bx, by, br, 0, Math.PI * 2); c.fill();
        });
        c.restore();
      }
      tex.needsUpdate = true;
      const [x, y] = punkt.lage;
      glas.u.uMitte.value[0].set((x / B - 0.5) * 2 * TANH * KZ * (B / H), (0.5 - y / H) * 2 * TANH * KZ, 0);
      glas.u.uGroesse.value[0] = punkt.sicht * punkt.radius * 2.6 * welt;
      glas.u.uDreh.value[0].setFromMatrix4(m4.makeRotationFromEuler(eu.set(f * 0.05, f * 0.07, f * 0.02)));
      form((f / 60) % 2, glas.u.uRadien.value[0]);
      look.render(1, 0, 0);                                                  // kein Bloom: Linie und Schrift bleiben klar
    },
    entsorgen() { tex.dispose(); quad.dispose(); glas.mat.dispose(); look.entsorgen(); },
  };
}

const BAUEN = { kristall, echo, strom };

/**
 * Ein räumlicher Ablauf für ein Foto (Canvas in Filmgrösse). art: "kristall" | "echo" | "strom"; grund: Farbe des Grunds; akzent: Farbe des Punkts im Signet.
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
  const hell = g.getHSL({}).l > 0.5;
  const W = BAUEN[art](renderer, textur, B, H, g, px, hell);
  const S = glanzSignet(renderer, B, H, akzent, hell);
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
