// «Bildfragmentieren» – die Verwandlung: die Effekte Strom, Körper, Scherben, Echo und Relief, einzeln oder als Kette, und ihr leuchtendes Signet (seit
// 16. Oktober 2026), mit three.js (WebGL 2, lokal in vendor/three-0.185.1). Erst geladen, wenn die Verwandlung gewählt ist. Alles zeichnet auf eine
// eigene WebGL-Leinwand in der Auflösung des Ziels, szene.js setzt das Bild ein – Vorschau, Standbild und Video bleiben, wie sie sind. Jede Kette
// beginnt im Dunkeln und endet exakt beim Foto; nur der letzte Effekt zeigt es, die anderen gehen in den nächsten über (Zeiten: kette() in ablauf.js).
//   Strom:    Teilchen leuchten auf, ziehen zu Bändern, fliegen an ihren Platz – oder verdichten sich zur Kugel, aus der der nächste Effekt wächst.
//   Körper:   drei Kristalle verschmelzen zu einem Glaskörper (oder er wächst aus der Kugel); allein wird das Glas am Ende klar.
//   Scherben: ein Ball aus Scherben (oder der Körper) zerspringt, die Scherben setzen das Foto zusammen.
//   Echo:     Rückkopplung wie in TouchDesigner; das Foto strömt am Ende durch den Tunnel herein. Nach einem anderen Effekt ziehen dessen Bilder Spuren.
//   Relief:   die Helligkeit als Gebirge im Streiflicht, das sich flach legt.
// Strom und Echo hängen an den Bildern davor: sie werden in festen Schritten (ein Schritt je Filmbild) von vorn nachgerechnet, darum ist jedes Bild
// beim Spulen und im Video dasselbe.
// Herkunft: Rezepte 3, 4 und 5 des Skills .claude/skills/threejs-spektakel (dort mit Beispielen und Prüfskript).
import * as THREE from "three";
import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";
import { RenderPass } from "three/addons/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/addons/postprocessing/UnrealBloomPass.js";
import { ShaderPass } from "three/addons/postprocessing/ShaderPass.js";
import { OutputPass } from "three/addons/postprocessing/OutputPass.js";
import { GPUComputationRenderer } from "three/addons/misc/GPUComputationRenderer.js";
import { kette, ablaufName } from "./ablauf.js?v=30";

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
  // weiche Schwelle (Standard 0,01): sonst springt eine grosse, gleichmässige Fläche schlagartig über die Schwelle und das ganze Bild leuchtet von
  // einem Bild zum nächsten auf – so beim Relief-Flug, als das Foto am Ende aufleuchtete (Rückmeldung: «die Bewegungen sind teilweise ruckartig»)
  bloom.highPassUniforms.smoothWidth.value = 0.15;
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
    uKlar: { value: 0 },
  };
  const mat = new THREE.ShaderMaterial({
    uniforms: u, depthTest: false, depthWrite: false, vertexShader: QUAD_VERTEX,
    fragmentShader: /* glsl */ `
      #define K ${K}
      uniform sampler2D uFoto; uniform float uSeiten, uAussen, uKante, uBlitz, uKlar; uniform vec2 uPixel; uniform int uProben; uniform vec3 uN[16], uGrund, uKantenFarbe;
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
          float ior = mix(1.46 + 0.045 * float(c), 1.0, uKlar); vec3 d1 = refract(ld, n0, 1.0 / ior); float a, b; vec3 m0, m1;   // klar: ohne Brechung
          schneide(e + d1 * 1e-4, d1, rad, a, b, m0, m1);
          vec3 x = e + d1 * b, d2 = refract(d1, -m1, ior);
          if (dot(d2, d2) < 1e-6) d2 = reflect(d1, -m1);
          farbe[c] = texture2D(uFoto, aufFoto(R * x * g + M, R * d2))[c];
          if (c == 1) dicke = b;
        }
        farbe *= mix(mix(vec3(1.0), vec3(0.86, 0.92, 1.0), clamp(dicke * 0.35, 0.0, 1.0)) * uTon[k], vec3(1.0), uKlar);
        vec3 rw = R * reflect(ld, n0);
        float F = (0.04 + 0.96 * pow(1.0 - max(dot(-ld, n0), 0.0), 5.0)) * (1.0 - uKlar);
        vec3 umgebung = mix(vec3(0.015, 0.012, 0.02), vec3(0.55, 0.6, 0.72), smoothstep(-0.3, 0.9, rw.y));
        vec3 glanz = vec3(1.0, 0.95, 0.88) * pow(max(dot(rw, normalize(vec3(0.6, 0.8, 0.5))), 0.0), 220.0) * 5.0
                   + vec3(1.0, 0.55, 0.25) * pow(max(dot(rw, normalize(vec3(-0.7, -0.2, 0.6))), 0.0), 90.0) * 1.5;
        farbe = mix(farbe, umgebung, F) + glanz * (1.0 - uKlar);
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
function scherbenGeometrie(zellen, bw, dicke, zufall) {
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

// ——— Körper und Scherben: die beiden Hälften des früheren «Kristall» (bis 17. Oktober 2026 ein Effekt; Wunsch: «diese einzeln anwählbar») ———
// Beide rechnen in der Zeit des alten Kristalls (11 s: Körper 0–4,3 · Bruch 4,3 · Montage 6,8–11); die Scherben beginnen bei 3,6 s (SCHERBEN_AB).
// Glaskörper mit scharfen Spiegelkanten; die Scherben tragen das Foto, nur ihre Schnittkanten sind Spiegel statt Glut (Rückmeldungen: «alle Kanten
// schärfer, dieses Rot geht gar nicht», dann: «ich wollte nur das Orange der Kanten weg, nicht die ganzen Stücke schwarz/weiss»). Der Körper
// zerspringt an seinem Ort: die Scherben liegen im Moment des Bruchs als Ball von seiner Grösse in der Mitte und fliegen erst dann auseinander.
const BRUCH = 4.3, SCHERBEN_AB = 3.6, KOERPER_ENDE = 0.6;   // Bruch; Beginn der Scherben; Grösse des Körpers im Moment des Bruchs
const KLEIN = [[90, 2], [215, 0], [330, 1]];                  // die drei kleinen Kristalle: Herkunft (Grad), Form

// Körper (8,8 s: Körper 0–5,8 · Bild 5,8–8,8; seit 17. Oktober 2026 länger: Formwandel und Klarwerden gedehnt, s. dehnen). Drei kleine Kristalle verschmelzen zu einem Glaskörper (Dodekaeder → Geode → Ikosaeder), das Foto
// nur durch das Glas. Allein oder am Ende wächst er, das Foto erscheint um ihn, und das Glas wird klar (ohne Brechung, Kanten und Glanz) – exakt das
// Foto. Vor den Scherben (letzt = false) dreht er sich schneller bis zum Bruch. Nach einem anderen Effekt (erst = false) setzt er bei 1,7 s ein,
// ohne die kleinen Kristalle: er wächst aus der Kugel von Strom. Zustandslos.
/** Zeit des Körpers → Zeit des alten Kristalls: das Hereinfliegen (bis 2,4 s) wie zuvor, Formwandel bis zum Bruch (2,4–5,8 → 2,4–4,3) und
 *  Klarwerden (5,8–8,8 → 4,3–6,8) langsamer */
const dehnen = (t) => (t < 2.4 ? t : t < 5.8 ? 2.4 + ((t - 2.4) * 1.9) / 3.4 : 4.3 + ((t - 5.8) * 2.5) / 3.0);
function koerper(renderer, textur, B, H, grund, px, hell, { erst = true, letzt = true } = {}) {
  const glas = glasMaterial(4, textur, B, H);
  glas.u.uGrund.value.copy(grund);
  glas.u.uKantenFarbe.value.setScalar(hell ? 0.04 : 0.97);
  const szene = new THREE.Scene(), quad = new THREE.PlaneGeometry(2, 2);
  szene.add(new THREE.Mesh(quad, glas.mat));
  const ortho = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  const look = filmlook(renderer, szene, ortho, { radius: 0.15, schwelle: 0.95, hell });
  const seiten = B / H, m4 = new THREE.Matrix4(), eu = new THREE.Euler();
  let stand = "", w = B;
  return {
    looks: [look],
    groesse(b, h) { w = b; glas.groesse(b, h, b >= B * 0.95); },
    bild(T) {
      const t = dehnen(T);                                                 // Ablauf in der Zeit des alten Kristalls; die Drehungen laufen in T gleichmässig
      // drei kleine Kristalle fliegen auf Spiralen herein und verschmelzen bei rund 2 s zum grossen Körper
      const u = glas.u, ankunft = [1.75, 1.95, 2.15];
      KLEIN.forEach(([grad, f], j) => {
        const a = anteil(t, 0.12 * j - 0.3, ankunft[j]), wi = THREE.MathUtils.degToRad(grad) + 1.6 * (1 - a), r = 1.25 * (1 - inOut(a));   // am Rand schon sichtbar
        u.uMitte.value[j].set(Math.cos(wi) * r * seiten, Math.sin(wi) * r, -0.4 * (1 - a));
        u.uGroesse.value[j] = erst ? 0.15 * weich(anteil(t, 0, 0.5)) * (1 - weich(anteil(t, ankunft[j] - 0.05, ankunft[j] + 0.2))) : 0;
        u.uDreh.value[j].setFromMatrix4(m4.makeRotationFromEuler(eu.set(t * (1.3 + 0.4 * j), t * 0.9, j)));
        form(f, u.uRadien.value[j]);
      });
      // der Körper wächst bis zum Bruch auf KOERPER_ENDE (die Scherben übernehmen genau seinen Platz); am Ende weiter, während das Glas klar wird
      const klar = letzt ? inOut(anteil(t, 5.0, 6.6)) : 0;
      u.uGroesse.value[3] = weich(anteil(t, 1.7, 2.6)) * (0.45 + (KOERPER_ENDE - 0.45) * inOut(anteil(t, 3.0, BRUCH)) + (letzt ? 0.9 * inOut(anteil(t, BRUCH, 6.6)) : 0));
      u.uMitte.value[3].set(0, 0, 0);
      u.uDreh.value[3].setFromMatrix4(m4.makeRotationFromEuler(eu.set(T * 0.33 + 0.4, T * 0.5 + (letzt ? 0 : 1.6 * anteil(t, 3.4, BRUCH) ** 2), T * 0.14)));
      const fo = Math.min(2, Math.max(0, (t - 2.2) / 1.1));
      form(fo, u.uRadien.value[3]);
      u.uKante.value = 0.85 * (1 - klar);
      u.uKlar.value = klar;
      u.uAussen.value = letzt ? inOut(anteil(t, 4.3, 5.8)) : 0;
      u.uProben.value = klar < 1 && w >= B * 0.95 ? 4 : 1;                 // am Ende exakt das Foto, ohne Mittelung
      stand = t < BRUCH ? `körper ${FORMNAMEN[Math.round(fo)]}` + (erst ? ` · kristalle ${[0, 1, 2].filter((j) => t < ankunft[j] + 0.1).length}` : "")
        : `glas klar ${Math.round(klar * 100)} %`;
      look.render(1 - klar, 0.25);
    },
    zaehler() { return stand; },
    entsorgen() { quad.dispose(); glas.mat.dispose(); look.entsorgen(); },
  };
}

// Scherben (7,4 s: Bruch 0–3,2 · Montage 3,2–7,4; in der Zeit des Kristalls 3,6–11). Ein Ball aus Voronoi-Scherben in der Mitte zerspringt bei
// 0,7 s, die Scherben fliegen in die Tiefe und kehren eine nach der anderen zurück, bis das Foto steht («das Endbild setzt sich nicht zusammen,
// sondern erscheint einfach»). Allein tauchen die Scherben zuerst als Ball aus dem Dunkel auf; nach dem Körper ist der Ball sein Platz. Vor einem
// weiteren Effekt (letzt = false) ziehen sie sich am Ende wieder zum sich drehenden Ball zusammen, aus dem der nächste hervorgeht (Rückmeldung:
// «die Scherben müssten sich am Ende wieder etwas zusammenziehen, damit der Übergang z. B. zum Relief passt»). Zustandslos.
function scherben(renderer, textur, B, H, grund, px, hell, { erst = true, letzt = true } = {}) {
  const szene = new THREE.Scene();
  const kamera = new THREE.PerspectiveCamera(FOV, B / H, 0.05, 50);
  const abstand = 1 / Math.tan(THREE.MathUtils.degToRad(FOV / 2));
  const bw = (2 * B) / H, zufall = zufallAus(20261016);
  const gy = grob() ? 18 : 24, gx = Math.round((gy * B) / H), zellen = voronoi(bw, gx, gy, zufall);
  const geo = scherbenGeometrie(zellen, bw, 0.03, zufall);
  const mat = new THREE.ShaderMaterial({
    uniforms: { uFoto: { value: textur }, uAus: { value: 0 }, uZurueck: { value: 0 }, uZeit: { value: 0 }, uLicht: { value: new THREE.Vector3() },
      uBlitz: { value: 0 }, uHell: { value: hell ? 1 : 0 }, uKern: { value: KOERPER_ENDE * 1.1 }, uEin: { value: 1 }, uZusammen: { value: 0 } },
    vertexShader: /* glsl */ `
      uniform float uAus, uZurueck, uZeit, uKern, uEin, uZusammen;
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
        // drei Lagen: der Ball in der Mitte (so gross wie der Körper, dreht sich), der Flug, die Heimat im Foto
        vec3 kern = drehung(vec3(0.2, 1.0, 0.1), uZeit * 0.9) * (uKern * pow(aZufall.w, 0.33) * normalize(aZufall.xyz - 0.5 + 1e-3)) + vec3(0.0, 0.0, 0.15);
        vec3 richtung = vec3(aMitte.xy * 0.55 + (aZufall.xy - 0.5) * 0.6, 0.35 + 1.3 * aZufall.z);
        vec3 flug = aMitte + richtung * (0.7 + 1.1 * aZufall.w) + 0.08 * vec3(sin(uZeit * 0.9 + 6.28 * aZufall.x), cos(uZeit * 0.7 + 6.28 * aZufall.y), 0.0);
        vec3 mitte = mix(mix(kern, flug, aus), aMitte, zur);
        float ein = clamp(uEin * 1.6 - 0.6 * aZufall.w, 0.0, 1.0);                                     // allein: der Ball taucht Scherbe um Scherbe auf
        float gross = mix(mix(0.45, 1.0, aus), 1.0, zur) * ein;
        float zus = smoothstep(0.0, 1.0, uZusammen * 1.5 - 0.5 * aZufall.w);                           // vor dem nächsten Effekt: zurück zum Ball, gestaffelt
        mitte = mix(mitte, kern * 0.85, zus); gross = mix(gross, 0.45, zus);
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
        // Vorderseite: das Stück Foto, im Flug beleuchtet und mit Glanz
        if (vSeite > 0.75) c = foto * mix(1.0, 0.55 + 0.75 * diff, vFlug) + vFlug * (0.55 * glanz + 0.25 * fres) + vRast * mix(vec3(0.4), vec3(-0.25), uHell);
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
    looks: [look],
    groesse() {},
    bild(tl) {
      const t = tl + SCHERBEN_AB, U = mat.uniforms;                         // in der Zeit des Kristalls
      U.uZeit.value = t;
      U.uEin.value = erst ? weich(anteil(t, SCHERBEN_AB, SCHERBEN_AB + 0.55)) : 1;
      U.uZusammen.value = letzt ? 0 : inOut(anteil(t, 5.0, 6.5));
      U.uAus.value = 1.4 * inOut(anteil(t, BRUCH, BRUCH + 1.4));
      U.uZurueck.value = Math.max(0, (t - 6.8) / 3.9);                    // nicht begrenzt: das Aufleuchten der letzten Scherben klingt bis 11 s aus
      U.uBlitz.value = (hell ? 0 : 0.3) * Math.exp(-(((t - BRUCH) / 0.07) ** 2));
      const flug = Math.min(1, U.uAus.value) * (1 - anteil(t, 8.8, 10.7));
      const w = 0.4 * Math.sin(Math.PI * anteil(t, BRUCH, 10.6)) * (1 - anteil(t, 9.6, 10.6));
      kamera.position.set(Math.sin(w) * abstand, 0.12 * w, Math.cos(w) * abstand * (1 + 0.3 * flug));
      kamera.lookAt(0, 0, 0.3 * flug);
      kamera.updateMatrixWorld();                                          // sonst gilt unten noch die Kamera des letzten Bildes
      U.uLicht.value.set(Math.cos(t * 0.8) * 0.7, 0.6, 0.6).transformDirection(kamera.matrixWorldInverse);
      const gesetzt = Math.round(zellen.length * Math.min(1, Math.max(0, (U.uZurueck.value - 0.16) / 0.84)));
      stand = !letzt && t > 5 ? `scherben ${zellen.length} · zusammen ${Math.round(U.uZusammen.value * 100)} %`
        : t < 6.8 ? `scherben ${zellen.length} · flug ${Math.round(flug * 100)} %` : `scherben ${gesetzt} / ${zellen.length}`;
      look.render(Math.max(flug, U.uZurueck.value < 1 ? 0.35 : 0), 0.25);
    },
    zaehler() { return stand; },
    entsorgen() { geo.dispose(); mat.dispose(); look.entsorgen(); },
  };
}

// ——— Echo (9,4 s: Echo 0–6 · Bild 6–9,4) ———
// Rückkopplung wie die erste Fassung im Showreel (Rückmeldung vom 17. Oktober 2026: «die Echoes am Anfang waren viel besser, nur die bewegungslosen
// Konturen waren nicht schön»): die Kanten des Fotos (Sobel), einfarbig hell, ziehen lange weiche Spuren in einen Zoom-Tunnel, vom ersten Bild an
// bewegt. Im Bild-Teil strömt das Foto selbst durch den Tunnel herein, der Zoom kommt zur Ruhe, und die Spuren ziehen sich zum Foto zusammen
// (Rückmeldung: «die Zusammensetzung des Schlussbildes wenig nachvollziehbar» – vorher wuchs es Tonstufe um Tonstufe). Nach einem anderen Effekt
// (erst = false) speist zuerst dessen Bild die Schleife (quelle): seine Scherben oder Teilchen ziehen Spuren, dann übernehmen die Kanten.
/** Schwelle der Kanten für Echo, nach dem Foto: nur die stärksten rund 6 % speisen die Rückkopplung (Rückmeldung vom 17. Oktober 2026 zu einem
 *  bunten, unruhigen Foto: «das Echo viel zu weiss» – mit fester Schwelle war fast jeder Bildpunkt eine Kante). Sobel wie im Shader: Helligkeit
 *  linear, auf dem Foto in halber Grösse (Mipmap-Stufe 1, in Vorschau und Export dieselbe), Nachbarn im Abstand eines Bildpunkts dort; an jedem
 *  zweiten Bildpunkt; ruhige Fotos behalten die alte Schwelle 0,25 … 0,8 */
function kantenSchwelle(px, B0, H0) {
  const lin = new Float32Array(256).map((_, i) => (i / 255) ** 2.2), B = B0 >> 1, H = H0 >> 1, halb = new Float32Array(B * H);
  for (let y = 0; y < H; y++) for (let x = 0; x < B; x++) {
    let s = 0;
    for (const [dx, dy] of [[0, 0], [1, 0], [0, 1], [1, 1]]) { const i = ((2 * y + dy) * B0 + 2 * x + dx) * 4; s += 0.2126 * lin[px[i]] + 0.7152 * lin[px[i + 1]] + 0.0722 * lin[px[i + 2]]; }
    halb[y * B + x] = s / 4;
  }
  const L = (x, y) => halb[y * B + x];
  const werte = [];
  for (let y = 1; y < H - 1; y += 2) for (let x = 1; x < B - 1; x += 2) {
    const tl = L(x - 1, y - 1), t = L(x, y - 1), tr = L(x + 1, y - 1), l = L(x - 1, y), r = L(x + 1, y), bl = L(x - 1, y + 1), b = L(x, y + 1), br = L(x + 1, y + 1);
    werte.push(Math.hypot(tr + 2 * r + br - tl - 2 * l - bl, tl + 2 * t + tr - bl - 2 * b - br));
  }
  werte.sort((a, b) => a - b);
  const q = (a) => werte[Math.min(werte.length - 1, Math.floor(a * werte.length))] ?? 0;
  const von = Math.max(0.25, q(0.94));
  return [von, Math.max(von + 0.35, q(0.99), 0.8)];
}

function echo(renderer, textur, B, H, grund, px, hell, { erst = true, letzt = true, ein = 0 } = {}) {
  const [kanteVon, kanteBis] = kantenSchwelle(px, B, H);
  const ortho = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1), quad = new THREE.PlaneGeometry(2, 2);
  const ziel = (w, h) => new THREE.WebGLRenderTarget(w, h, { type: THREE.HalfFloatType, depthBuffer: false, minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter });
  // je Auflösung ein eigener Zustand (Vorschau und Export rechnen in verschiedener Grösse; sonst begänne die Schleife bei jedem Wechsel von vorn)
  const zustaende = new Map();
  let Z = null;
  const zustand = (w, h) => {
    const schluessel = `${w}x${h}`;
    if (!zustaende.has(schluessel)) {
      if (zustaende.size >= 2) { const [alt, z] = zustaende.entries().next().value; z.lesen.dispose(); z.schreiben.dispose(); zustaende.delete(alt); }
      zustaende.set(schluessel, { lesen: ziel(w, h), schreiben: ziel(w, h), n: -1 });
    }
    return zustaende.get(schluessel);
  };
  Z = zustand(B, H);
  // ein Schritt der Rückkopplung; auf weissem Grund rechnet die Schleife im Negativ (die Anzeige kehrt es um: dunkle Spuren auf Weiss)
  const rueck = new THREE.ShaderMaterial({
    uniforms: { uFoto: { value: textur }, uTexel: { value: new THREE.Vector2(2 / B, 2 / H) }, uVorher: { value: null }, uSeiten: { value: B / H }, uZeit: { value: 0 },
      uZoom: { value: 1 }, uDreh: { value: 0 }, uWirbel: { value: 0 }, uZerfall: { value: 0.93 }, uEin: { value: 0 }, uFotoEin: { value: 0 },
      uQuelle: { value: null }, uQuelleEin: { value: 0 }, uHell: { value: hell ? 1 : 0 }, uKanteVon: { value: kanteVon }, uKanteBis: { value: kanteBis } },
    vertexShader: QUAD_VERTEX, depthTest: false, depthWrite: false,
    fragmentShader: /* glsl */ `
      ${GLSL_RAUSCHEN}
      uniform sampler2D uVorher, uFoto, uQuelle; uniform vec2 uTexel; uniform float uSeiten, uZeit, uZoom, uDreh, uWirbel, uZerfall, uEin, uFotoEin, uQuelleEin, uHell, uKanteVon, uKanteBis;
      varying vec2 vUv;
      float hellP(vec2 uv) { return dot(textureLod(uFoto, uv, 1.0).rgb, vec3(0.2126, 0.7152, 0.0722)); }   // Stufe 1: gleich in jeder Grösse
      vec3 linear(vec3 c) { return mix(c / 12.92, pow((c + 0.055) / 1.055, vec3(2.4)), step(0.04045, c)); }
      vec3 negativ(vec3 c) { return mix(c, 1.0 - c, uHell); }
      void main() {
        vec2 p = vUv - 0.5; p.x *= uSeiten;
        float c = cos(uDreh), s = sin(uDreh);
        vec2 q = mat2(c, -s, s, c) * p / uZoom;                                                      // hineinzoomen und drehen
        q += uWirbel * 0.006 * vec2(snoise(vec3(q * 3.0, uZeit * 0.25)), snoise(vec3(q * 3.0 + 7.7, uZeit * 0.25)));
        q.x /= uSeiten; q += 0.5;
        vec3 neu = texture2D(uVorher, q).rgb * uZerfall;
        float tl = hellP(vUv + uTexel * vec2(-1, 1)), t = hellP(vUv + uTexel * vec2(0, 1)), tr = hellP(vUv + uTexel * vec2(1, 1));
        float l = hellP(vUv + uTexel * vec2(-1, 0)), rr = hellP(vUv + uTexel * vec2(1, 0));
        float bl = hellP(vUv + uTexel * vec2(-1, -1)), b = hellP(vUv + uTexel * vec2(0, -1)), br = hellP(vUv + uTexel * vec2(1, -1));
        float gx = tr + 2.0 * rr + br - tl - 2.0 * l - bl, gy = tl + 2.0 * t + tr - bl - 2.0 * b - br;
        neu = max(neu, vec3(0.9, 0.91, 0.94) * smoothstep(uKanteVon, uKanteBis, length(vec2(gx, gy))) * uEin);      // Kanten, einfarbig hell; Maximum: keine Aufschaukelung
        neu = max(neu, negativ(texture2D(uFoto, vUv).rgb) * uFotoEin);                                 // Bild-Teil: das Foto strömt herein
        if (uQuelleEin > 0.0) {                                                                        // der vorige Effekt (fertiges Bild): nur seine
          vec3 q = negativ(linear(texture2D(uQuelle, vUv).rgb));                                      // hellen Kanten und Glanzlichter ziehen Spuren – die ganze
          neu = max(neu, q * smoothstep(0.5, 0.95, dot(q, vec3(0.2126, 0.7152, 0.0722))) * 0.7 * uQuelleEin);   // Fläche verschmierte zu einer weissen Wolke
        }
        gl_FragColor = vec4(clamp(neu, 0.0, 3.0), 1.0);
      }`,
  });
  const rueckSzene = new THREE.Scene(); rueckSzene.add(new THREE.Mesh(quad, rueck));
  // Anzeige: Grund und Schleife; ganz am Ende exakt das Foto
  const zeige = new THREE.ShaderMaterial({
    uniforms: { uSchleife: { value: null }, uFoto: { value: textur }, uExakt: { value: 0 }, uSicht: { value: 1 }, uGrund: { value: grund.clone() }, uHell: { value: hell ? 1 : 0 } },
    vertexShader: QUAD_VERTEX, depthTest: false, depthWrite: false,
    fragmentShader: /* glsl */ `
      uniform sampler2D uSchleife, uFoto; uniform float uExakt, uSicht, uHell; uniform vec3 uGrund; varying vec2 vUv;
      void main() {
        vec3 s = min(texture2D(uSchleife, vUv).rgb, 1.0) * uSicht;                                   // uSicht: Einblenden
        gl_FragColor = vec4(mix(uHell > 0.5 ? uGrund - s : uGrund + s, texture2D(uFoto, vUv).rgb, uExakt), 1.0);
      }`,
  });
  const anzeige = new THREE.Scene(); anzeige.add(new THREE.Mesh(quad, zeige));
  const look = filmlook(renderer, anzeige, ortho, { radius: 0.4, schwelle: 0.85, hell });

  const regler = (t) => {
    const u = rueck.uniforms;
    // Bewegung vom ersten Bild an (nach einem anderen Effekt gleich mit Schwung); im Bild-Teil kommt der Tunnel zur Ruhe
    const voll = erst ? weich(anteil(t, 0, 1.2)) : 0.6 + 0.4 * weich(anteil(t, 0, 1.2)), ruhe = letzt ? 1 - inOut(anteil(t, 6.4, 8.6)) : 1;
    u.uZeit.value = t;
    u.uEin.value = (erst ? weich(anteil(t, 0.1, 1.0)) : weich(anteil(t, 0.6, 1.8))) * (letzt ? 1 - weich(anteil(t, 6.0, 7.2)) : 1);
    u.uFotoEin.value = letzt ? inOut(anteil(t, 5.8, 7.0)) : 0;
    u.uZerfall.value = letzt ? 0.93 - 0.08 * anteil(t, 7.6, 8.8) : 0.93;
    u.uZoom.value = 1 + (0.004 + 0.014 * voll * (0.6 + 0.4 * Math.sin(t * 0.9))) * ruhe;
    u.uDreh.value = 0.006 * voll * ruhe * (t < 3.2 ? 1 : -1) * (1 - Math.exp(-Math.abs(t - 3.2) * 2));   // dreht bei 3,2 s die Richtung
    u.uWirbel.value = voll * ruhe;
    return voll * ruhe;
  };
  let stand = "";
  const leeren = () => {                                                                         // die Schleife beginnt schwarz, auch auf weissem Grund
    const alt = renderer.getClearColor(new THREE.Color()), altA = renderer.getClearAlpha();
    renderer.setClearColor(0x000000, 1);
    for (const z of [Z.lesen, Z.schreiben]) { renderer.setRenderTarget(z); renderer.clear(); }
    renderer.setRenderTarget(null); renderer.setClearColor(alt, altA);
  };
  const schritt = (t, q) => {
    rueck.uniforms.uQuelle.value = q?.textur ?? null; rueck.uniforms.uQuelleEin.value = q?.textur ? q.ein : 0;
    regler(t);
    rueck.uniforms.uVorher.value = Z.lesen.texture;
    renderer.setRenderTarget(Z.schreiben); renderer.render(rueckSzene, ortho); renderer.setRenderTarget(null);
    [Z.lesen, Z.schreiben] = [Z.schreiben, Z.lesen];
  };
  return {
    looks: [look],
    groesse(w, h) { Z = zustand(w, h); },
    /** t: Zeit im Effekt; j: Filmbild im Effekt, zeit(i): die Zeit von Bild i (die Schritte der Rückkopplung zählen in Filmbildern);
     *  quelle(i): das fertige Bild des vorigen Effekts zu Bild i ({ textur, ein }) oder null */
    bild(t, j, zeit, quelle) {
      if (j < Z.n || Z.n < 0) {
        leeren(); Z.n = -1;
        // Vorlauf: beginnt Echo nicht bei 0 (allein oder zuerst: bei 1,5 s), läuft die Rückkopplung vorher schon – das Bild setzt mitten in der Bewegung ein
        const dt = zeit(1) - zeit(0), vor = erst && ein > 0 ? Math.round(ein / dt) : 0;
        for (let m = vor; m >= 1; m--) schritt(ein - m * dt, null);
      }
      while (Z.n < j) { const i = Z.n + 1; schritt(zeit(i), quelle?.(i)); Z.n = i; }
      const aktiv = regler(t);
      zeige.uniforms.uSchleife.value = Z.lesen.texture;
      zeige.uniforms.uExakt.value = letzt ? (t >= 9.2 ? 1 : weich(anteil(t, 8.6, 9.2))) : 0;
      zeige.uniforms.uSicht.value = erst && ein > 0 ? weich(anteil(t, ein, ein + 0.6)) : 1;
      const zoom = `zoom ${(rueck.uniforms.uZoom.value * 100 - 100).toFixed(1)} %`;
      stand = !letzt || t < 6 ? `rückkopplung ${Math.round(rueck.uniforms.uZerfall.value * 100)} % · ${zoom}` : `foto ${Math.round(rueck.uniforms.uFotoEin.value * 100)} % · ${zoom}`;
      look.render(aktiv, 0.35, 0.003);
    },
    zaehler() { return stand; },
    entsorgen() { for (const z of zustaende.values()) { z.lesen.dispose(); z.schreiben.dispose(); } quad.dispose(); rueck.dispose(); zeige.dispose(); look.entsorgen(); },
  };
}

// ——— Strom (8,4 s: Funken 0–1,6 · Strom 1,6–5,2 · Bild 5,2–8,4; vorher 12 s, Rückmeldung: «Strom ist ok, zu lang») ———
// Rund 40 000 Teilchen, je eine kleine glänzende Kugel in der Farbe ihres Bildpunkts (Rückmeldung zum Showreel: «zu wenig kontrastreich und
// glänzend»), auf 100 kurzen Fäden. Funken laufen die Fäden entlang, ein Wirbelfeld aus zwei Oktaven (Curl-Rauschen, quellenfrei) zieht sie zu
// langen, feinen Linien und Wirbeln aus, und die Teilchen fliegen dann an ihren Platz im Foto, das am Schluss exakt steht (Rückmeldung vom 17. Oktober 2026: «die
// Formen und Bewegungen könnten feiner und dynamischer sein» – vorher ein weiches Rauschfeld, grössere Kugeln, Bänder und Tücher). Vor einem weiteren Effekt (letzt = false) ballen sie sich stattdessen ab 4,4 s zu einer leuchtenden, sich drehenden Kugel
// (Verdichten), aus der der nächste hervorgeht. Lage und Tempo liegen in Float-Texturen (GPUComputationRenderer); wie bei Echo ein fester Schritt je
// Filmbild, von vorn.
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
// Simplex-Rauschen mit Gradient (analytisch, wie snoise): für Wirbelfelder ohne Differenzen – drei Aufrufe statt achtzehn
float snoiseG(vec3 v, out vec3 gradient) {
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
  vec4 m2 = m * m, m4 = m2 * m2;
  vec4 pdotx = vec4(dot(p0, x0), dot(p1, x1), dot(p2, x2), dot(p3, x3));
  vec4 temp = m2 * m * pdotx;
  gradient = 42.0 * (-8.0 * (temp.x * x0 + temp.y * x1 + temp.z * x2 + temp.w * x3) + m4.x * p0 + m4.y * p1 + m4.z * p2 + m4.w * p3);
  return 42.0 * dot(m4, pdotx);
}
/** Wirbelfeld (Curl-Rauschen): quellenfrei, darum ziehen Teilchen darin zu feinen Fäden und Wirbeln statt zu verklumpen */
vec3 wirbel(vec3 p) {
  vec3 g1, g2, g3;
  snoiseG(p, g1); snoiseG(p + vec3(31.416, -47.853, 12.793), g2); snoiseG(p + vec3(-233.145, -113.408, -185.31), g3);
  return vec3(g3.y - g2.z, g1.z - g3.x, g2.x - g1.y);
}
`;
function strom(renderer, textur, B, H, grund, px, hell, { letzt = true } = {}) {
  const S = grob() ? 140 : 200, N = S * S, SCHRITTE = 2;   // genug für feine Fäden, nicht so viele, dass es Staub wird (262 144 gaben nur Staub)
  const szene = new THREE.Scene();
  const kamera = new THREE.PerspectiveCamera(FOV, B / H, 0.05, 50);
  const abstand = 1 / Math.tan(THREE.MathUtils.degToRad(FOV / 2)), breite = (2 * B) / H;
  const gpu = new GPUComputationRenderer(S, S, renderer);
  const startLage = gpu.createTexture(), startTempo = gpu.createTexture(), heim = gpu.createTexture(), kugel = gpu.createTexture();
  const ref = new Float32Array(N * 2), fotoUv = new Float32Array(N * 2), zufall = zufallAus(20261017);
  // Anfang: S / 2 kurze, gebogene Fäden zu je 2 S Teilchen, verstreut im Bild (kein Foto). Die Strömung ist quellenfrei – zufällig verteilte Teilchen
  // blieben darin gleichmässig verteilt (Staub); Fäden dagegen zieht sie zu langen, feinen Linien aus. w: wann das Teilchen aufleuchtet – die
  // Funken laufen einen Faden entlang. Jeder Faden fliegt am Schluss in eine Zeile des Fotos.
  const F = 2 * S;                                                        // Teilchen je Faden (S / 2 Fäden): dicht genug, dass sie Linien bleiben
  let x = 0, y = 0, z = 0, winkel = 0, kruemmung = 0, schritt = 0, start = 0;
  for (let i = 0; i < N; i++) {
    const k = i % F;
    if (k === 0) {
      x = (zufall() - 0.5) * breite * 1.1; y = (zufall() - 0.5) * 2.1; z = (zufall() - 0.5) * 0.3;
      winkel = zufall() * Math.PI * 2; kruemmung = (zufall() - 0.5) * 5; schritt = (0.35 + 0.4 * zufall()) / F; start = 0.8 * zufall();
    }
    winkel += kruemmung * schritt; x += Math.cos(winkel) * schritt; y += Math.sin(winkel) * schritt;
    startLage.image.data.set([x + (zufall() - 0.5) * 0.003, y + (zufall() - 0.5) * 0.003, z, start + (0.25 * k) / F], i * 4);
    const u = ((i % S) + zufall()) / S, v = (Math.floor(i / S) + zufall()) / S;      // geschichtete Zufallspunkte auf dem Foto
    heim.image.data.set([(u - 0.5) * breite, (v - 0.5) * 2, 0, 1], i * 4);
    ref.set([((i % S) + 0.5) / S, (Math.floor(i / S) + 0.5) / S], i * 2);
    fotoUv.set([u, v], i * 2);
  }
  for (let i = 0; i < N; i++) {                                           // die Kugel beim Verdichten: gleichmässig verteilt (Fibonacci), leicht gestreut
    const y = 1 - (2 * (i + 0.5)) / N, r = Math.sqrt(1 - y * y), w = i * 2.399963, R = 0.46 * (0.93 + 0.07 * zufall());
    kugel.image.data.set([Math.cos(w) * r * R, y * R, Math.sin(w) * r * R, 1], i * 4);
  }
  heim.needsUpdate = kugel.needsUpdate = true;
  const tempo = gpu.addVariable("textureTempo", /* glsl */ `
    ${GLSL_RAUSCHEN}
    uniform sampler2D uHeim, uKugel; uniform float uZeit, uDt, uChaos, uFeder, uKugelAnteil;
    void main() {
      vec2 uv = gl_FragCoord.xy / resolution.xy;
      vec4 L = texture2D(textureLage, uv); vec3 p = L.xyz, v = texture2D(textureTempo, uv).xyz, h = texture2D(uHeim, uv).xyz;
      if (uKugelAnteil > 0.0) {                                                                     // Ziel: die Kugel, die sich dreht
        vec3 k = texture2D(uKugel, uv).xyz; float w = uZeit * 0.9, c = cos(w), s = sin(w);
        h = mix(h, vec3(c * k.x + s * k.z, k.y, -s * k.x + c * k.z), uKugelAnteil);
      }
      // mit der Strömung treiben statt beschleunigen (mit Schwung mischten sich die Bahnen zu einer gleichmässigen Wolke): grosse Wirbel und feine
      // darin, beide wandern; nicht zu schnell, sonst reisst das Feld die Fäden in Staub
      vec3 ziel = (wirbel(p * 1.2 + vec3(0.0, 0.0, uZeit * 0.25)) * 0.7 + wirbel(p * 2.8 + vec3(uZeit * 0.4, 0.0, 0.0)) * 0.1) * uChaos * 0.075;
      ziel.z *= 0.4;                                                                                 // eher flach: die Fäden bleiben lesbar
      v = mix(v, ziel, 1.0 - exp(-uDt * 5.0));
      v += ((h - p) * uFeder - p * 6.0 * max(0.0, length(p * vec3(0.8, 1.0, 1.4)) - 1.2)) * uDt;     // Feder nach Hause, weiche Grenze
      v *= exp(-uDt * 2.2 * sqrt(uFeder));
      gl_FragColor = vec4(v, 1.0);
    }`, startTempo);
  const lage = gpu.addVariable("textureLage", /* glsl */ `
    uniform float uDt;
    void main() { vec2 uv = gl_FragCoord.xy / resolution.xy; vec4 L = texture2D(textureLage, uv); gl_FragColor = vec4(L.xyz + texture2D(textureTempo, uv).xyz * uDt, L.w); }`, startLage);
  gpu.setVariableDependencies(tempo, [lage, tempo]);
  gpu.setVariableDependencies(lage, [lage, tempo]);
  Object.assign(tempo.material.uniforms, { uHeim: { value: heim }, uKugel: { value: kugel }, uKugelAnteil: { value: letzt ? 0 : 1 }, uZeit: { value: 0 }, uDt: { value: 0 },
    uChaos: { value: 0 }, uFeder: { value: 0 } });
  lage.material.uniforms.uDt = { value: 0 };
  const fehler = gpu.init();
  if (fehler) throw new Error(fehler);

  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.BufferAttribute(new Float32Array(N * 3), 3));
  geo.setAttribute("aRef", new THREE.BufferAttribute(ref, 2));
  geo.setAttribute("aUv", new THREE.BufferAttribute(fotoUv, 2));
  // verschiedene Grössen, nicht übertrieben (Wunsch vom 17. Oktober 2026): die meisten 0,7 bis 1,15, jede zwölfte grösser bis 1,8
  const groessen = new Float32Array(N), zg = zufallAus(20261018);
  for (let i = 0; i < N; i++) { const a = zg(), b = zg(); groessen[i] = b < 1 / 12 ? 1.35 + 0.45 * a : 0.7 + 0.45 * a * a; }
  geo.setAttribute("aGroesse", new THREE.BufferAttribute(groessen, 1));
  const punktMat = new THREE.ShaderMaterial({
    uniforms: { uLage: { value: null }, uTempo: { value: null }, uHeim: { value: heim }, uFoto: { value: textur }, uEinrasten: { value: 0 }, uZeit: { value: 0 },
      uPunkt: { value: (2 / S) * 1.25 }, uPixelJeEinheit: { value: H / 2 / Math.tan(THREE.MathUtils.degToRad(FOV / 2)) } },
    vertexShader: /* glsl */ `
      uniform sampler2D uLage, uTempo, uHeim, uFoto; uniform float uEinrasten, uZeit, uPunkt, uPixelJeEinheit;
      attribute vec2 aRef, aUv; attribute float aGroesse; varying vec3 vFarbe; varying float vAlpha;
      void main() {
        vec4 L = texture2D(uLage, aRef);
        vec3 p = mix(L.xyz, texture2D(uHeim, aRef).xyz, uEinrasten);
        float geschw = length(texture2D(uTempo, aRef).xyz), auf = smoothstep(L.w * 1.1, L.w * 1.1 + 0.4, uZeit);   // Funken leuchten nacheinander auf
        vec4 mv = modelViewMatrix * vec4(p, 1.0);
        gl_Position = projectionMatrix * mv;
        gl_PointSize = clamp(uPunkt * aGroesse * uPixelJeEinheit / -mv.z * (0.35 + 0.65 * auf), 1.0, uPunkt * aGroesse * uPixelJeEinheit * 0.6);
        vFarbe = texture2D(uFoto, aUv).rgb * (1.0 + 0.35 * smoothstep(0.4, 2.0, geschw));   // schnelle Teilchen glänzen heller
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
    const ende = letzt ? weich(anteil(t, 4.6, 6.2)) : weich(anteil(t, 4.0, 5.4));
    U.uChaos.value = (1.6 + 0.8 * weich(anteil(t, 1.0, 2.0))) * (1 - ende);                     // von Anfang an Strömung; nicht stärker, sonst reissen die Fäden
    U.uFeder.value = letzt ? 22 * inOut(anteil(t, 4.9, 6.9)) : 18 * inOut(anteil(t, 4.2, 5.6));
  };
  let n = -1, stand = "";
  const zuruecksetzen = () => { for (const [v, st] of [[lage, startLage], [tempo, startTempo]]) for (const z of v.renderTargets) gpu.renderTexture(st, z); };
  return {
    looks: [look],
    groesse(w, h) { punktMat.uniforms.uPixelJeEinheit.value = h / 2 / Math.tan(THREE.MathUtils.degToRad(FOV / 2)); },
    /** t: Zeit im Effekt; j: Filmbild im Effekt, zeit(i): die Zeit von Bild i (ein Schritt je Filmbild, von vorn) */
    bild(t, j, zeit) {
      if (j < n || n < 0) { zuruecksetzen(); n = 0; }
      while (n < j) {
        n++;
        const t1 = zeit(n), dt = (t1 - zeit(n - 1)) / SCHRITTE;
        regler(t1);
        tempo.material.uniforms.uDt.value = dt; lage.material.uniforms.uDt.value = dt;
        for (let i = 0; i < SCHRITTE; i++) gpu.compute();
      }
      regler(t);
      const einrasten = letzt ? (t >= 7.9 ? 1 : inOut(anteil(t, 6.9, 7.9))) : 0;
      const m = punktMat.uniforms;
      m.uLage.value = gpu.getCurrentRenderTarget(lage).texture;
      m.uTempo.value = gpu.getCurrentRenderTarget(tempo).texture;
      m.uEinrasten.value = einrasten; m.uZeit.value = t;
      flaeche.material.opacity = einrasten;
      const frei = 1 - einrasten, w = 0.55 * Math.sin(Math.PI * anteil(t, 1.0, letzt ? 6.9 : 6.4));
      kamera.position.set(Math.sin(w) * abstand, 0.2 * w, Math.cos(w) * abstand * (1 + 0.25 * frei));
      kamera.lookAt(0, 0, 0);
      const ch = tempo.material.uniforms.uChaos.value, fe = tempo.material.uniforms.uFeder.value;
      stand = t < 1.6 ? `teilchen ${N.toLocaleString("de-CH")} · auf ${Math.round(anteil(t, 0, 1.5) * 100)} %` : t < (letzt ? 5.2 : 4.4) ? `strom ${Math.round((ch / 2.4) * 100)} %`
        : letzt ? `feder ${Math.round((fe / 22) * 100)} %` : `kugel ${Math.round(anteil(t, 4.4, 5.8) * 100)} %`;
      look.render(frei, letzt ? 0.3 : 0.3 + 0.35 * anteil(t, 4.4, 6.0), 0);
    },
    zaehler() { return stand; },
    entsorgen() { gpu.dispose(); geo.dispose(); punktMat.dispose(); flaeche.geometry.dispose(); flaeche.material.dispose(); heim.dispose(); kugel.dispose(); look.entsorgen(); },
  };
}

// ——— Relief (11 s: Höhenlinien 0–2,6 · Gebirge 2,6–7,6 · Bild 7,6–11) ———
// Die Helligkeit des Fotos als Gebirge (Rückmeldung zum Showreel: «es war mit Abstand der Beste»): im Dunkeln leuchten die Höhenlinien auf, eine
// Scan-Linie legt sie frei; dann hebt ein Streiflicht das Gebirge aus dem Dunkel, die Kamera fliegt darüber, das Licht wandert einmal herum;
// zuletzt kippt die Kamera zurück, das Gebirge wird flach und steht als Foto. MeshStandardMaterial mit onBeforeCompile (Höhe, exakte Normalen,
// Höhenlinien), Schatten. Zustandslos.
function hoehenfeld(hell, nx, ny, radius) {
  const w = nx + 1, h = ny + 1, f = new Float32Array(w * h), tmp = new Float32Array(w * h);
  for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) f[j * w + i] = hell(i / nx, j / ny) ** 0.9;
  for (let durchgang = 0; durchgang < 2; durchgang++) {
    for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) { let s = 0, n = 0; for (let k = -radius; k <= radius; k++) { const x = i + k; if (x >= 0 && x < w) { s += f[j * w + x]; n++; } } tmp[j * w + i] = s / n; }
    for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) { let s = 0, n = 0; for (let k = -radius; k <= radius; k++) { const y = j + k; if (y >= 0 && y < h) { s += tmp[y * w + i]; n++; } } f[j * w + i] = s / n; }
  }
  return f;
}
function relief(renderer, textur, B, H, grund, px, hell) {
  const helligkeit = (u, v) => { const i = (Math.min(H - 1, Math.round(v * (H - 1))) * B + Math.min(B - 1, Math.round(u * (B - 1)))) * 4; return (0.2126 * px[i] + 0.7152 * px[i + 1] + 0.0722 * px[i + 2]) / 255; };
  const szene = new THREE.Scene();
  const kamera = new THREE.PerspectiveCamera(FOV, B / H, 0.05, 50);
  const abstand = 1 / Math.tan(THREE.MathUtils.degToRad(FOV / 2));
  const breite = (2 * B) / H, schritt = grob() ? 4 : 2.5;
  const nx = Math.round(B / schritt), ny = Math.round(H / schritt);
  const geo = new THREE.PlaneGeometry(breite, 2, nx, ny);                  // Ecken Zeile für Zeile von oben
  const feld = hoehenfeld(helligkeit, nx, ny, Math.max(1, Math.round(nx / 180)));
  const hoehe = new Float32Array((nx + 1) * (ny + 1)), grad = new Float32Array(hoehe.length * 2), dx = breite / nx, dy = 2 / ny, w = nx + 1;
  for (let j = 0; j <= ny; j++) for (let i = 0; i <= nx; i++) {
    const k = j * w + i, f = (ii, jj) => feld[Math.min(ny, Math.max(0, jj)) * w + Math.min(nx, Math.max(0, ii))];
    hoehe[k] = feld[k];
    grad[k * 2] = (f(i + 1, j) - f(i - 1, j)) / (2 * dx);
    grad[k * 2 + 1] = -(f(i, j + 1) - f(i, j - 1)) / (2 * dy);
  }
  geo.setAttribute("aHoehe", new THREE.BufferAttribute(hoehe, 1));
  geo.setAttribute("aGrad", new THREE.BufferAttribute(grad, 2));
  const u = { uTiefe: { value: 0 }, uScan: { value: -9 }, uOffen: { value: 0 }, uLinien: { value: 0 }, uAkzent: { value: new THREE.Color("#ff7a2e") } };
  const mat = new THREE.MeshStandardMaterial({ map: textur, emissive: 0xffffff, emissiveMap: textur, roughness: 0.62, metalness: 0.05 });
  mat.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, u);
    shader.vertexShader = shader.vertexShader
      .replace("#include <common>", "#include <common>\nattribute float aHoehe; attribute vec2 aGrad; uniform float uTiefe; varying float vHoehe; varying vec3 vWelt;")
      .replace("#include <begin_vertex>", "vec3 transformed = vec3(position); transformed.z += aHoehe * uTiefe; vHoehe = aHoehe; vWelt = (modelMatrix * vec4(transformed, 1.0)).xyz;")
      .replace("#include <beginnormal_vertex>", "vec3 objectNormal = normalize(vec3(-aGrad * uTiefe, 1.0));");
    shader.fragmentShader = shader.fragmentShader
      .replace("#include <common>", "#include <common>\nuniform float uScan, uOffen, uLinien; uniform vec3 uAkzent; varying float vHoehe; varying vec3 vWelt;")
      .replace("#include <emissivemap_fragment>", `#include <emissivemap_fragment>
        float hl = vHoehe * 16.0;
        float linie = 1.0 - smoothstep(0.0, max(1.4 * fwidth(hl), 1e-4), abs(fract(hl - 0.5) - 0.5));
        float band = exp(-pow((vWelt.y - uScan) / 0.09, 2.0));
        float frei = max(uOffen, smoothstep(uScan - 0.03, uScan + 0.03, vWelt.y));                 // was die Scan-Linie schon überstrichen hat
        totalEmissiveRadiance += uAkzent * uLinien * (linie * frei * (0.3 + 3.0 * band) + 0.12 * band);`);
  };
  const flaeche = new THREE.Mesh(geo, mat);
  flaeche.castShadow = flaeche.receiveShadow = true;
  szene.add(flaeche);
  const streif = new THREE.DirectionalLight(0xfff1e0, 0);
  Object.assign(streif.shadow.camera, { left: -breite * 0.7, right: breite * 0.7, top: 1.3, bottom: -1.3, near: 0.1, far: 12 });
  streif.shadow.mapSize.set(2048, 2048); streif.shadow.bias = -0.0004; streif.shadow.normalBias = 0.01; streif.castShadow = true;
  const kante = new THREE.PointLight(0xff8a3d, 0, 8, 1.5), himmel = new THREE.HemisphereLight(0x9fb4ff, 0x120a06, 0);
  szene.add(streif, streif.target, kante, himmel);
  const look = filmlook(renderer, szene, kamera, { radius: 0.4, schwelle: 0.6, hell });
  let tiefe = 0, a = 0, stand = "";
  return {
    looks: [look], schatten: true,
    groesse() {},
    bild(t) {
      const licht = inOut(anteil(t, 1.8, 3.6)) * (1 - inOut(anteil(t, 8.0, 10.0)));
      tiefe = 1 - inOut(anteil(t, 7.6, 9.8));                              // von Anfang an Gebirge
      const kipp = 1 - inOut(anteil(t, 7.4, 10.2));
      u.uTiefe.value = 0.42 * tiefe;
      u.uLinien.value = 1 - weich(anteil(t, 7.4, 8.6));
      // zwei Scan-Linien von hinten nach vorn: die erste legt die Höhenlinien frei, die zweite lässt sie aufglühen
      u.uScan.value = t < 3.2 ? 1.5 - (anteil(t, 0.15, 2.6) * 3.2) : 1.5 - anteil(t, 4.2, 6.8) * 3.2;
      u.uOffen.value = t < 2.6 ? 0 : 1;
      mat.emissiveIntensity = weich(anteil(t, 8.2, 10.4));                 // am Ende steht das Foto exakt (ohne Licht)
      a = -0.6 + 2.6 * inOut(anteil(t, 1.8, 9.4));
      streif.position.set(Math.cos(a) * 3, Math.sin(a) * 3, 1.1 + 1.5 * (1 - kipp)); streif.intensity = 3.2 * licht;
      kante.position.set(-Math.cos(a) * 1.6, -Math.sin(a) * 1.6, 0.6); kante.intensity = 3.5 * licht;
      himmel.intensity = 0.35 * licht;
      const k = THREE.MathUtils.degToRad(58) * kipp, sw = Math.sin(t * 0.35) * 0.25 * kipp, d = abstand * (1 - 0.18 * kipp);
      kamera.position.set(Math.sin(sw) * d, -Math.sin(k) * d, Math.cos(k) * Math.cos(sw) * d);
      kamera.lookAt(0, 0.12 * kipp, 0);
      stand = t < 2.6 ? `höhenlinien ${Math.round(anteil(t, 0.15, 2.6) * 100)} %` : `höhe ${Math.round(tiefe * 100)} % · licht ${Math.round(((a * 180) / Math.PI + 360) % 360)}°`;
      look.render(Math.max(licht, 0.5 * u.uLinien.value), 0.6, 0.002);
    },
    zaehler() { return stand; },
    entsorgen() { geo.dispose(); mat.dispose(); look.entsorgen(); },
  };
}

// ——— Relief-Flug (19,5 s: Höhenkurven 0–6,8 · Flug 6,8–16 · Bild 16–19,5; seit 17. Oktober 2026) ———
// Der dritte Gesamtablauf (Wunsch: «der Relief-Effekt zuerst mit Höhenkurven und dann flächig, startend mit einem leeren Bildschirm, spektakuläre
// Kamerafahrten, Zoom und Drehungen: so, dass die Formen des Ausgangsbildes intensiv erfahren werden – in beiden Bedeutungen des Wortes»).
// Die Helligkeit als Gebirge wie beim Relief, aber höher. Im leeren Bild leuchten zuerst nur Höhenkurven in den Farben des Fotos auf – als Welle
// vom höchsten Gipfel aus, die Kamera dicht darüber und sich drehend; dann wird das Gebirge flächig (Streiflicht, Schatten, Dunst in der Tiefe), und
// die Kamera fliegt die markantesten Erhebungen an: tief über die Kämme, in Kurven geneigt, ein Dolly-Zoom am dritten Gipfel, dann der Überblick;
// zuletzt legt sich alles flach, die Kamera steht senkrecht darüber, und das Foto steht exakt. Die Route kommt aus dem Foto (drei Gipfel des
// geglätteten Höhenfelds, weit genug auseinander), die Kamera bleibt über dem Gelände. Zustandslos (die Kamera hängt nur an t).
const FLUG_TIEFE = 0.55;
function flug(renderer, textur, B, H, grund, px, hell) {
  const helligkeit = (u, v) => { const i = (Math.min(H - 1, Math.round(v * (H - 1))) * B + Math.min(B - 1, Math.round(u * (B - 1)))) * 4; return (0.2126 * px[i] + 0.7152 * px[i + 1] + 0.0722 * px[i + 2]) / 255; };
  const szene = new THREE.Scene();
  szene.fog = new THREE.Fog(grund.clone(), 50, 60);
  const kamera = new THREE.PerspectiveCamera(FOV, B / H, 0.01, 50);
  const abstand = 1 / Math.tan(THREE.MathUtils.degToRad(FOV / 2));
  const breite = (2 * B) / H, schritt = grob() ? 4 : 2.5;
  const nx = Math.round(B / schritt), ny = Math.round(H / schritt), w = nx + 1;
  const geo = new THREE.PlaneGeometry(breite, 2, nx, ny);                  // Ecken Zeile für Zeile von oben
  const feld = hoehenfeld(helligkeit, nx, ny, Math.max(1, Math.round(nx / 180)));
  const hoehe = new Float32Array(w * (ny + 1)), grad = new Float32Array(hoehe.length * 2), dx = breite / nx, dy = 2 / ny;
  for (let j = 0; j <= ny; j++) for (let i = 0; i <= nx; i++) {
    const k = j * w + i, f = (ii, jj) => feld[Math.min(ny, Math.max(0, jj)) * w + Math.min(nx, Math.max(0, ii))];
    hoehe[k] = feld[k];
    grad[k * 2] = (f(i + 1, j) - f(i - 1, j)) / (2 * dx);
    grad[k * 2 + 1] = -(f(i, j + 1) - f(i, j - 1)) / (2 * dy);
  }
  geo.setAttribute("aHoehe", new THREE.BufferAttribute(hoehe, 1));
  geo.setAttribute("aGrad", new THREE.BufferAttribute(grad, 2));
  // die Höhenkurven auf einem etwas stärker geglätteten Feld: genau an den Formen, aber ruhig auf einfarbigen Flächen (JPEG-Rauschen); die Geometrie
  // bleibt scharfkantig
  geo.setAttribute("aKurve", new THREE.BufferAttribute(hoehenfeld(helligkeit, nx, ny, Math.max(2, Math.round(nx / 120))), 1));

  // Gelände grob: das Dach (Maximum je Zelle und Nachbarn – die Kamera bleibt darüber) und die geglätteten Formen (für die Gipfel der Route)
  const cx = 48, cy = Math.round((48 * H) / B), dach = new Float32Array(cx * cy);
  for (let j = 0; j <= ny; j++) for (let i = 0; i <= nx; i++) {
    const c = Math.min(cy - 1, Math.floor((j / (ny + 1)) * cy)) * cx + Math.min(cx - 1, Math.floor((i / (nx + 1)) * cx));
    dach[c] = Math.max(dach[c], feld[j * w + i]);
  }
  const dachWeit = dach.map((_, c) => { const ci = c % cx, cj = Math.floor(c / cx); let m = 0; for (let b = -1; b <= 1; b++) for (let a2 = -1; a2 <= 1; a2++) { const ii = ci + a2, jj = cj + b; if (ii >= 0 && ii < cx && jj >= 0 && jj < cy) m = Math.max(m, dach[jj * cx + ii]); } return m; });
  const formen = hoehenfeld(helligkeit, cx - 1, cy - 1, 2), umgebung = hoehenfeld(helligkeit, cx - 1, cy - 1, 9);
  const zuWelt = (ci, cj, nX, nY) => [(-0.5 + ci / nX) * breite, 1 - (2 * cj) / nY];
  const bilinear = (gitter, gw, gh, x, y) => {
    const fi = Math.min(gw - 1.001, Math.max(0, ((x / breite) + 0.5) * (gw - 1))), fj = Math.min(gh - 1.001, Math.max(0, ((1 - y) / 2) * (gh - 1)));
    const i0 = Math.floor(fi), j0 = Math.floor(fj), a2 = fi - i0, b = fj - j0, g = (i, j) => gitter[j * gw + i];
    return (g(i0, j0) * (1 - a2) + g(i0 + 1, j0) * a2) * (1 - b) + (g(i0, j0 + 1) * (1 - a2) + g(i0 + 1, j0 + 1) * a2) * b;
  };
  const dachBei = (x, y) => bilinear(dachWeit, cx, cy, x, y) * FLUG_TIEFE;
  const hoeheBei = (x, y) => bilinear(feld, w, ny + 1, x, y) * FLUG_TIEFE;
  // drei Gipfel: die markantesten – was am meisten über seine Umgebung ragt (nicht einfach das Hellste: eine weisse Fläche ist eine flache
  // Hochebene), weit genug voneinander und nicht am Rand
  const gipfel = [];
  for (let n = 0; n < 3; n++) {
    let best = -Infinity, bp = [0, 0];
    for (let cj = 3; cj < cy - 3; cj++) for (let ci = 3; ci < cx - 3; ci++) {
      const p = zuWelt(ci, cj, cx - 1, cy - 1), v = formen[cj * cx + ci] - umgebung[cj * cx + ci] + 0.15 * formen[cj * cx + ci];
      if (gipfel.every((q) => Math.hypot(p[0] - q[0], p[1] - q[1]) > 0.75) && v > best) { best = v; bp = p; }
    }
    gipfel.push(bp);
  }
  const [P1, P2, P3] = gipfel;

  const u = { uTiefe: { value: FLUG_TIEFE }, uLinien: { value: 1 }, uFlaeche: { value: 0 }, uWelle: { value: 0 }, uZentrum: { value: new THREE.Vector2(...P1) },
    uGrund: { value: grund.clone() }, uHell: { value: hell ? 1 : 0 }, uDichte: { value: 34 }, uZeit: { value: 0 } };
  const mat = new THREE.MeshStandardMaterial({ map: textur, emissive: 0xffffff, emissiveMap: textur, emissiveIntensity: 0, roughness: 0.6, metalness: 0.05 });
  mat.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, u);
    shader.vertexShader = shader.vertexShader
      .replace("#include <common>", "#include <common>\nattribute float aHoehe, aKurve; attribute vec2 aGrad; uniform float uTiefe; varying float vHoehe; varying vec3 vWelt;")
      .replace("#include <begin_vertex>", "vec3 transformed = vec3(position); transformed.z += aHoehe * uTiefe; vHoehe = aKurve; vWelt = (modelMatrix * vec4(transformed, 1.0)).xyz;")
      .replace("#include <beginnormal_vertex>", "vec3 objectNormal = normalize(vec3(-aGrad * uTiefe, 1.0));");
    shader.fragmentShader = shader.fragmentShader
      .replace("#include <common>", "#include <common>\nuniform float uLinien, uFlaeche, uWelle, uHell, uDichte, uZeit; uniform vec2 uZentrum; uniform vec3 uGrund; varying float vHoehe; varying vec3 vWelt;")
      .replace("#include <map_fragment>", "#include <map_fragment>\n  diffuseColor.rgb *= uFlaeche;")
      .replace("#include <emissivemap_fragment>", `#include <emissivemap_fragment>
        // Höhenkurven in den Farben des Fotos (auf Weiss dunkel): fein und präzise – unter einem Bildpunkt breit, jede fünfte eine etwas kräftigere
        // Leitlinie wie auf einer Karte – und neuronal: Lichtimpulse laufen die Kurven entlang wie Signale, jede Kurve mit eigener Richtung und Phase
        // (Wunsch vom 17. Oktober 2026: «Höhenlinien fein, präzise, neuronal»). Sie öffnen sich als Welle vom ersten Gipfel aus.
        vec3 fotoF = texture2D(map, vMapUv).rgb;
        float hl = vHoehe * uDichte + 0.5;                                  // die Kurven zwischen den Stufen: reines Weiss oder Schwarz liegt auf keiner
        float stufe = floor(hl), leit = 1.0 - step(0.5, mod(stufe, 5.0));
        // smoothstep nie mit gleichen oder vertauschten Grenzen (undefiniert: auf flachen Flächen ist fwidth 0 – das gab flimmernde Pünktchen)
        float linie = (1.0 - smoothstep(0.0, max(mix(0.75, 1.3, leit) * fwidth(hl), 1e-4), abs(fract(hl - 0.5) - 0.5)))
                    * smoothstep(0.02, 0.06, vHoehe) * (1.0 - smoothstep(0.91, 0.95, vHoehe));   // nicht in fast weissen oder schwarzen Flächen
        float k = stufe * 1.618;
        // pow nie mit negativer Basis (durch Rundung möglich: undefiniert)
        float puls = pow(max(0.5 + 0.5 * sin(dot(vWelt.xy, vec2(cos(k * 2.3), sin(k * 2.3))) * 9.0 - uZeit * 2.6 + k * 3.1), 0.0), 18.0);
        float d = length(vWelt.xy - uZentrum), offen = 1.0 - smoothstep(uWelle - 0.1, uWelle, d), front = exp(-pow((d - uWelle) / 0.05, 2.0));
        vec3 linF = uHell > 0.5 ? fotoF * 0.5 : min(fotoF * 1.3 + 0.08, vec3(1.0));
        float l = linie * offen * uLinien;
        vec3 basis = mix(uGrund, linF, clamp(l * (0.6 + 0.4 * leit) + 1.5 * front * linie * uLinien, 0.0, 1.0));
        vec3 signal = (uHell > 0.5 ? -0.5 * basis : vec3(1.0, 0.97, 0.92) * 1.4) * l * puls;
        totalEmissiveRadiance += (basis + signal) * (1.0 - uFlaeche) + (linF * 0.4 * l + 0.5 * signal) * uFlaeche;`);
  };
  const flaeche = new THREE.Mesh(geo, mat);
  flaeche.castShadow = flaeche.receiveShadow = true;
  szene.add(flaeche);
  const streif = new THREE.DirectionalLight(0xfff1e0, 0);
  Object.assign(streif.shadow.camera, { left: -breite * 0.7, right: breite * 0.7, top: 1.3, bottom: -1.3, near: 0.1, far: 12 });
  streif.shadow.mapSize.set(2048, 2048); streif.shadow.bias = -0.0004; streif.shadow.normalBias = 0.01; streif.castShadow = true;
  const kante = new THREE.PointLight(0xff8a3d, 0, 8, 1.5), himmel = new THREE.HemisphereLight(0x9fb4ff, 0x120a06, 0);
  szene.add(streif, streif.target, kante, himmel);
  const look = filmlook(renderer, szene, kamera, { radius: 0.4, schwelle: 0.6, hell, proben: 4 });

  // die Route: Schlüsselbilder (Zeit, Lage, Ziel, Brennweite als Bildwinkel, Neigung um die Blickachse in Grad), dazwischen weich (Catmull-Rom über die Zeit)
  const V = (x, y, z) => new THREE.Vector3(x, y, z), hz = (p) => hoeheBei(p[0], p[1]);
  const richtung = (a2, b) => { const l = Math.hypot(b[0] - a2[0], b[1] - a2[1]) || 1; return [(b[0] - a2[0]) / l, (b[1] - a2[1]) / l]; };
  const r12 = richtung(P1, P2), r23 = richtung(P2, P3), quer12 = [-r12[1], r12[0]], quer23 = [-r23[1], r23[0]];
  const auf = (x, y, ueber) => V(x, y, dachBei(x, y) + ueber);
  const um = (p, winkel, r) => [p[0] + Math.cos(winkel) * r, p[1] + Math.sin(winkel) * r];
  const w0 = Math.atan2(-r23[1], -r23[0]);                                 // von dort kommt die Kamera am dritten Gipfel an
  const o1 = um(P3, w0, 0.6), o2 = um(P3, w0 + 1.0, 0.52);                  // die Umrundung ruhig: kleiner Winkel, etwas weiter weg
  const m12 = [P1[0] + (P2[0] - P1[0]) * 0.4 + quer12[0] * 0.35, P1[1] + (P2[1] - P1[1]) * 0.4 + quer12[1] * 0.35];
  const v2 = [P2[0] - r12[0] * 0.45, P2[1] - r12[1] * 0.45], n2 = [P2[0] + r12[0] * 0.6, P2[1] + r12[1] * 0.6];
  const m23 = [P2[0] + (P3[0] - P2[0]) * 0.5 + quer23[0] * 0.2, P2[1] + (P3[1] - P2[1]) * 0.5 + quer23[1] * 0.2];
  const SCHLUESSEL = [
    [0.0, V(P1[0] + 0.03, P1[1] - 0.05, hz(P1) + 0.3), V(P1[0], P1[1], hz(P1)), 52, 0],
    [2.8, V(P1[0], P1[1] - 0.2, hz(P1) + 0.85), V(P1[0], P1[1], hz(P1)), 42, 80],
    [5.3, auf(m12[0], m12[1], 0.5), V(P2[0], P2[1], hz(P2)), 46, 22],
    [7.7, auf(v2[0], v2[1], 0.26), V(n2[0], n2[1], hoeheBei(n2[0], n2[1])), 58, -14],
    [10.0, auf(m23[0], m23[1], 0.24), V(P3[0], P3[1], hz(P3)), 62, 16],
    [11.9, V(o1[0], o1[1], hz(P3) + 0.3), V(P3[0], P3[1], hz(P3)), 28, -6],   // Dolly-Zoom: näher heran, der Bildwinkel enger
    [13.7, V(o2[0], o2[1], hz(P3) + 0.24), V(P3[0], P3[1], hz(P3)), 44, 10],
    [16.0, V(0.1, -1.6, 1.6), V(0, 0.05, 0.1), 40, 0],
    [18.8, V(0, 0, abstand), V(0, 0, 0), FOV, 0],
    [19.5, V(0, 0, abstand), V(0, 0, 0), FOV, 0],
  ];
  const hermite = (t, wert) => {                                           // wert(i): Zahl oder Vector3 des Schlüssels i
    if (t >= SCHLUESSEL[SCHLUESSEL.length - 2][0]) { const v = wert(SCHLUESSEL.length - 1); return typeof v === "number" ? v : v.clone(); }
    let i = 0;
    while (i < SCHLUESSEL.length - 2 && t > SCHLUESSEL[i + 1][0]) i++;
    const t0 = SCHLUESSEL[i][0], t1 = SCHLUESSEL[i + 1][0], s = Math.min(1, Math.max(0, (t - t0) / (t1 - t0))), h = t1 - t0;
    const steigung = (k) => {                                              // am Ende steht die Kamera still (sonst schwänge sie übers Ziel hinaus)
      const a2 = Math.max(0, k - 1), b = Math.min(SCHLUESSEL.length - 1, k + 1);
      return [a2, b, k >= SCHLUESSEL.length - 2 ? 0 : h / (SCHLUESSEL[b][0] - SCHLUESSEL[a2][0])];
    };
    const [a0, b0, f0] = steigung(i), [a1, b1, f1] = steigung(i + 1);
    const s2 = s * s, s3 = s2 * s, h00 = 2 * s3 - 3 * s2 + 1, h10 = s3 - 2 * s2 + s, h01 = -2 * s3 + 3 * s2, h11 = s3 - s2;
    const p0 = wert(i), p1 = wert(i + 1), m0 = [wert(a0), wert(b0)], m1 = [wert(a1), wert(b1)];
    if (typeof p0 === "number") return h00 * p0 + h10 * f0 * (m0[1] - m0[0]) + h01 * p1 + h11 * f1 * (m1[1] - m1[0]);
    return p0.clone().multiplyScalar(h00).addScaledVector(m0[1].clone().sub(m0[0]), h10 * f0).addScaledVector(p1, h01).addScaledVector(m1[1].clone().sub(m1[0]), h11 * f1);
  };
  // die ganze Bahn einmal vorab, 60 Proben je Sekunde, dann zeitlich geglättet (Gauss): sonst ruckte die Kamera, wo sie dem groben Dach des
  // Geländes folgte, wo die Ausrichtung beim Übergang vom senkrechten Blick zur Schrägsicht kippte und wo das Tempo zwischen Schlüsselbildern
  // sprang (Rückmeldung vom 17. Oktober 2026: «die Bewegungen sind teilweise noch ruckartig»). Gegen Ende geht die Bahn ins exakte Schlussbild über.
  const tiefeBei = (t) => 1 - inOut(anteil(t, 16.2, 18.6));
  const RATE = 60, ENDE = SCHLUESSEL[SCHLUESSEL.length - 2][0], n = Math.round(SCHLUESSEL[SCHLUESSEL.length - 1][0] * RATE) + 1;
  const roh = { lage: new Float32Array(n * 3), ziel: new Float32Array(n * 3), oben: new Float32Array(n * 3), fov: new Float32Array(n) };
  const blick = new THREE.Vector3(), oben = new THREE.Vector3();
  const ueberGelaende = (L, i, abstandBoden) => {
    const x = L[i * 3], y = L[i * 3 + 1];
    if (Math.abs(x) < breite / 2 && Math.abs(y) < 1) L[i * 3 + 2] = Math.max(L[i * 3 + 2], dachBei(x, y) * tiefeBei(i / RATE) + abstandBoden);
  };
  for (let i = 0; i < n; i++) {
    const t = i / RATE, lage = hermite(t, (k) => SCHLUESSEL[k][1]), ziel = hermite(t, (k) => SCHLUESSEL[k][2]);
    roh.lage.set([lage.x, lage.y, lage.z], i * 3); roh.ziel.set([ziel.x, ziel.y, ziel.z], i * 3);
    ueberGelaende(roh.lage, i, 0.13);
    roh.fov[i] = hermite(t, (k) => SCHLUESSEL[k][3]);
    blick.set(ziel.x - roh.lage[i * 3], ziel.y - roh.lage[i * 3 + 1], ziel.z - roh.lage[i * 3 + 2]).normalize();
    const senkrecht = THREE.MathUtils.smoothstep(-blick.z, 0.75, 0.97);   // oben: zur Seite der Welt, senkrecht von oben das Bild aufrecht
    oben.set(0, senkrecht, 1 - senkrecht).normalize().applyAxisAngle(blick, THREE.MathUtils.degToRad(hermite(t, (k) => SCHLUESSEL[k][4])));
    roh.oben.set([oben.x, oben.y, oben.z], i * 3);
  }
  const glaetten = (q, k, sigma) => {                                      // Gauss über die Zeit, k Werte je Probe, am Rand gehalten
    const r = Math.ceil(sigma * 3), g = Array.from({ length: 2 * r + 1 }, (_, j) => Math.exp(-(((j - r) / sigma) ** 2) / 2)), aus = new Float32Array(q.length);
    for (let i = 0; i < n; i++) for (let c = 0; c < k; c++) {
      let s = 0, w = 0;
      for (let j = -r; j <= r; j++) { const ii = Math.min(n - 1, Math.max(0, i + j)); s += q[ii * k + c] * g[j + r]; w += g[j + r]; }
      aus[i * k + c] = s / w;
    }
    return aus;
  };
  const bahn = { lage: glaetten(roh.lage, 3, 0.35 * RATE), ziel: glaetten(roh.ziel, 3, 0.35 * RATE), oben: glaetten(roh.oben, 3, 0.45 * RATE), fov: glaetten(roh.fov, 1, 0.35 * RATE) };
  for (let i = 0; i < n; i++) ueberGelaende(bahn.lage, i, 0.11);           // das Glätten darf nicht unter das Gelände führen …
  bahn.lage = glaetten(bahn.lage, 3, 0.12 * RATE);                         // … und die Korrektur bleibt weich
  // Zeit umverteilen: wo der Boden schnell durchs Bild zieht (Tempo durch Höhe über Grund) oder der Blick dreht, langsamer, sonst etwas schneller –
  // bis zum Überblick (16 s), Gesamtdauer und Landung bleiben. Im Tiefflug zog der Boden sonst mit über 100°/s durchs Bild (Rückmeldung mit Video)
  {
    const BIS = Math.round(16 * RATE), fluss = new Float64Array(BIS + 1), q = new THREE.Vector3(), r = new THREE.Vector3();
    const richtung = (i, v) => v.set(bahn.ziel[i * 3] - bahn.lage[i * 3], bahn.ziel[i * 3 + 1] - bahn.lage[i * 3 + 1], bahn.ziel[i * 3 + 2] - bahn.lage[i * 3 + 2]).normalize();
    for (let i = 0; i < BIS; i++) {
      const x = bahn.lage[i * 3], y = bahn.lage[i * 3 + 1], z = bahn.lage[i * 3 + 2];
      const tempo = Math.hypot(bahn.lage[i * 3 + 3] - x, bahn.lage[i * 3 + 4] - y, bahn.lage[i * 3 + 5] - z) * RATE;
      const ueber = Math.max(0.05, z - hoeheBei(x, y) * tiefeBei(i / RATE));
      fluss[i + 1] = fluss[i] + tempo / ueber + richtung(i, q).angleTo(richtung(i + 1, r)) * RATE + 0.5;   // + Grundtempo (rad/s)
    }
    const alt = {}, roh2 = (name, k, f, c) => { const i0 = Math.floor(f), i1 = Math.min(n - 1, i0 + 1), a2 = f - i0; return alt[name][i0 * k + c] * (1 - a2) + alt[name][i1 * k + c] * a2; };
    for (const name of ["lage", "ziel", "oben", "fov"]) alt[name] = bahn[name].slice();
    let j = 0;
    for (let i = 1; i < BIS; i++) {                                        // neue Zeit i / RATE ↔ alte Probe f mit gleichem Anteil am Bildfluss
      const soll = (i / BIS) * fluss[BIS];
      while (j < BIS - 1 && fluss[j + 1] < soll) j++;
      const f = j + (soll - fluss[j]) / Math.max(1e-9, fluss[j + 1] - fluss[j]);
      for (const [name, k] of [["lage", 3], ["ziel", 3], ["oben", 3], ["fov", 1]]) for (let c = 0; c < k; c++) bahn[name][i * k + c] = roh2(name, k, f, c);
    }
  }
  // Schwenks begrenzt: die Blickrichtung dreht höchstens 35°, die Bildausrichtung 32° je Sekunde (bei Tempo «normal»). Sonst schwenkte die Kamera
  // stellenweise mit fast 100°/s – bei 30 Bildern je Sekunde ruckelt das (Rückmeldung mit Video: «noch Ruckler bei Sekunde 10–12»)
  const begrenzen = (wert, grad, setzen) => {
    const max = THREE.MathUtils.degToRad(grad) / RATE, vor = new THREE.Vector3(), d = new THREE.Vector3(), neu = new THREE.Vector3();
    for (let i = 0; i < n; i++) {
      wert(i, d);
      if (i > 0) { const w = vor.angleTo(d); if (w > max) { d.copy(neu.copy(vor).lerp(d, max / w).normalize()); setzen(i, d); } }
      vor.copy(d);
    }
  };
  begrenzen((i, d) => d.set(bahn.ziel[i * 3] - bahn.lage[i * 3], bahn.ziel[i * 3 + 1] - bahn.lage[i * 3 + 1], bahn.ziel[i * 3 + 2] - bahn.lage[i * 3 + 2]).normalize(), 35,
    (i, d) => { const l = Math.hypot(bahn.ziel[i * 3] - bahn.lage[i * 3], bahn.ziel[i * 3 + 1] - bahn.lage[i * 3 + 1], bahn.ziel[i * 3 + 2] - bahn.lage[i * 3 + 2]);
      for (let c = 0; c < 3; c++) bahn.ziel[i * 3 + c] = bahn.lage[i * 3 + c] + d.getComponent(c) * l; });
  begrenzen((i, d) => d.set(bahn.oben[i * 3], bahn.oben[i * 3 + 1], bahn.oben[i * 3 + 2]).normalize(), 32, (i, d) => bahn.oben.set([d.x, d.y, d.z], i * 3));
  bahn.ziel = glaetten(bahn.ziel, 3, 0.2 * RATE); bahn.oben = glaetten(bahn.oben, 3, 0.2 * RATE);
  for (let i = 0; i < n; i++) {                                            // gegen Ende ins exakte Schlussbild (dort steht die Kamera still)
    const w = weich(anteil(i / RATE, ENDE - 0.8, ENDE));
    if (w <= 0) continue;
    for (const [name, k] of [["lage", 3], ["ziel", 3], ["oben", 3], ["fov", 1]]) for (let c = 0; c < k; c++) bahn[name][i * k + c] += (roh[name][i * k + c] - bahn[name][i * k + c]) * w;
  }
  const ausBahn = (name, k, t, ziel) => {                                  // linear zwischen den Proben
    const f = Math.min(n - 1, Math.max(0, t * RATE)), i0 = Math.floor(f), i1 = Math.min(n - 1, i0 + 1), a = f - i0, q = bahn[name];
    if (k === 1) return q[i0] * (1 - a) + q[i1] * a;
    return ziel.set(q[i0 * 3] * (1 - a) + q[i1 * 3] * a, q[i0 * 3 + 1] * (1 - a) + q[i1 * 3 + 1] * a, q[i0 * 3 + 2] * (1 - a) + q[i1 * 3 + 2] * a);
  };
  const lage = new THREE.Vector3(), ziel = new THREE.Vector3();
  let stand = "";
  return {
    looks: [look], schatten: true,
    groesse() {},
    bild(t) {
      const tiefe = tiefeBei(t), flaech = inOut(anteil(t, 6.0, 8.2)), foto = t >= 18.8 ? 1 : inOut(anteil(t, 16.8, 18.8));
      const licht = flaech * (1 - inOut(anteil(t, 16.4, 18.4)));
      u.uTiefe.value = FLUG_TIEFE * tiefe;
      u.uFlaeche.value = flaech;
      u.uWelle.value = 0.05 + 3.2 * inOut(anteil(t, 0.3, 5.6));
      u.uLinien.value = 1 - inOut(anteil(t, 13.5, 17.0));
      u.uZeit.value = t;
      mat.emissiveIntensity = foto;
      const a = -0.8 + 3.4 * inOut(anteil(t, 6.0, 16.0));                  // das Licht wandert einmal halb herum
      streif.position.set(Math.cos(a) * 3, Math.sin(a) * 3, 1.0 + 0.4 * Math.sin(t * 0.7)); streif.intensity = 2.3 * licht;
      kante.position.set(-Math.cos(a) * 1.6, -Math.sin(a) * 1.6, 0.7); kante.intensity = 2.0 * licht;
      himmel.intensity = 0.35 * licht;
      szene.fog.near = 1.3 + 60 * (1 - flaech) + 60 * anteil(t, 15.5, 17.5); szene.fog.far = szene.fog.near + 3.2;
      // Kamera aus der geglätteten Bahn
      ausBahn("lage", 3, t, lage); ausBahn("ziel", 3, t, ziel); ausBahn("oben", 3, t, oben).normalize();
      kamera.fov = ausBahn("fov", 1, t);
      kamera.updateProjectionMatrix();
      kamera.position.copy(lage); kamera.up.copy(oben); kamera.lookAt(ziel);
      kamera.updateMatrixWorld();
      stand = t < 6.8 ? `höhenkurven ${Math.round(Math.min(1, u.uWelle.value / 3) * 100)} % · bildwinkel ${Math.round(kamera.fov)}°`
        : t < 16 ? `flughöhe ${Math.max(0, lage.z - hoeheBei(lage.x, lage.y)).toFixed(2)} · bildwinkel ${Math.round(kamera.fov)}°` : `flach ${Math.round((1 - tiefe) * 100)} %`;
      look.render(1 - inOut(anteil(t, 15.0, 16.8)), 0.35, 0.002);         // das Leuchten klingt aus, bevor das Foto aufleuchtet
    },
    zaehler() { return stand; },
    entsorgen() { geo.dispose(); mat.dispose(); look.entsorgen(); },
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

const BAUEN = { koerper, scherben, echo, strom, relief, flug };

/**
 * Ein räumlicher Ablauf für ein Foto (Canvas in Filmgrösse). art: ein Effekt oder mehrere mit «+» (z. B. "strom+kristall+echo+relief", s. kette() in
 * ablauf.js); grund: Farbe des Grunds; akzent: Farbe des Punkts im Signet.
 * bild(u, k, N, w, h): das Bild bei u (0 … 1 im Abschnitt; k von N Filmbildern) in w × h Bildpunkten; gibt die Leinwand zurück (gleich danach lesen).
 * signet(zeichnen, punkt, f, w, h): das Signet in der leuchtenden Fassung.
 * In der Kette überblenden zwei Effekte: beide zeichnen nacheinander auf die Leinwand, die Bilder werden in Texturen kopiert und gemischt – die hellen
 * Teile des neuen zuerst. Echo nimmt dabei die hellen Kanten des vorigen in seine Rückkopplung auf (seine Scherben oder Teilchen ziehen Spuren).
 */
export function raum(foto, art, { grund = "#000000", akzent = "#f08a5d" } = {}) {
  const plan = kette(art);
  if (!plan.teile.length) throw new Error(`unbekannter Ablauf: ${art}`);
  const B = foto.width, H = foto.height;
  const leinwand = document.createElement("canvas");
  // ohne Kantenglättung der Leinwand: die Effekte glätten selbst (Kristall mit MSAA), und aus der Leinwand lässt sich so in Texturen kopieren
  const renderer = new THREE.WebGLRenderer({ canvas: leinwand, antialias: false, preserveDrawingBuffer: true, powerPreference: "high-performance" });
  if (!renderer.capabilities.isWebGL2) throw new Error("dieser Browser kann kein WebGL 2");
  const g = new THREE.Color(grund);
  renderer.setPixelRatio(1); renderer.setSize(B, H, false);
  renderer.setClearColor(g, 1);
  const textur = new THREE.CanvasTexture(foto);
  textur.colorSpace = THREE.SRGBColorSpace; textur.minFilter = THREE.LinearMipmapLinearFilter; textur.anisotropy = 4;
  const px = foto.getContext("2d", { willReadFrequently: true }).getImageData(0, 0, B, H).data;
  const hell = g.getHSL({}).l > 0.5;
  const teile = plan.teile.map((p) => ({ ...p, W: BAUEN[p.art](renderer, textur, B, H, g, px, hell, p) }));
  const S = glanzSignet(renderer, B, H, akzent, hell);
  renderer.shadowMap.enabled = teile.some((p) => p.W.schatten);              // Schatten nur beim Relief

  // Überblenden: die hellen Teile des neuen Bilds zuerst
  const ortho = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1), quad = new THREE.PlaneGeometry(2, 2);
  const misch = new THREE.ShaderMaterial({
    uniforms: { uA: { value: null }, uB: { value: null }, uS: { value: 0 } }, vertexShader: QUAD_VERTEX, depthTest: false, depthWrite: false,
    fragmentShader: /* glsl */ `uniform sampler2D uA, uB; uniform float uS; varying vec2 vUv;
      void main() {
        vec3 a = texture2D(uA, vUv).rgb, b = texture2D(uB, vUv).rgb;
        gl_FragColor = vec4(mix(a, b, smoothstep(0.0, 1.0, uS * 1.4 - 0.4 + 0.4 * dot(b, vec3(0.3333)))), 1.0);
      }`,
  });
  const mischSzene = new THREE.Scene(); mischSzene.add(new THREE.Mesh(quad, misch));
  let kopien = null;
  const kopie = (name) => {                                                 // das Bild auf der Leinwand in eine Textur
    const gr = renderer.getSize(new THREE.Vector2());
    if (!kopien || kopien.w !== gr.x || kopien.h !== gr.y) {
      for (const n of ["a", "b", "q"]) kopien?.[n].dispose();
      kopien = { w: gr.x, h: gr.y, a: new THREE.FramebufferTexture(gr.x, gr.y), b: new THREE.FramebufferTexture(gr.x, gr.y), q: new THREE.FramebufferTexture(gr.x, gr.y) };
    }
    renderer.setRenderTarget(null);
    renderer.copyFramebufferToTexture(kopien[name]);
    return kopien[name];
  };

  const passen = (teil, w, h) => {
    const jetzt = renderer.getSize(new THREE.Vector2());
    if (jetzt.x !== w || jetzt.y !== h) renderer.setSize(w, h, false);
    for (const l of teil.looks) if (l.groesse.x !== w || l.groesse.y !== h) l.setSize(w, h);
    teil.groesse(w, h);
  };
  // Filmbilder und Zeiten: Bild k des Abschnitts liegt bei k · proBild Sekunden (Tempo «normal»); ein Teil zählt seine Bilder ab k0
  let proBild = 1 / 30, zuletzt = teile[0], vorBild = null;                // vorBild: { k, textur } – das Bild des vorigen Teils zu diesem Filmbild
  const k0 = (p) => Math.ceil(p.von / proBild - 1e-6);
  const lokal = (p, k) => Math.min(p.aus, Math.max(p.ein, p.ein + k * proBild - p.von));
  const zeichnen = (i, k, T) => {
    const p = teile[i], a = k0(p), vor = teile[i - 1];
    const t = T === undefined ? lokal(p, k) : Math.min(p.aus, Math.max(p.ein, p.ein + T - p.von));
    const quelle = vor && ((m) => {                                          // das fertige Bild des vorigen Teils zu Bild m dieses Teils
      const kk = a + m;
      if (kk * proBild > vor.bis + 1e-9) return null;
      const ein = 1 - weich(anteil(kk * proBild, p.von + 0.35 * (vor.bis - p.von), vor.bis));
      if (vorBild?.k === kk) return { textur: vorBild.textur, ein };          // eben schon gezeichnet (Überblenden)
      zeichnen(i - 1, kk);
      return { textur: kopie("q"), ein };
    });
    p.W.bild(t, Math.max(0, k - a), (m) => lokal(p, a + m), quelle);
  };

  return {
    art: ablaufName(art), dauer: plan.dauer,
    bild(u, k, N, w = B, h = H) {
      w = Math.max(2, Math.round(w)); h = Math.max(2, Math.round(h));
      for (const p of teile) passen(p.W, w, h);
      proBild = plan.dauer / Math.max(1, N);
      const T = Math.min(1, Math.max(0, u)) * plan.dauer;
      const aktiv = teile.map((_, i) => i).filter((i) => T >= teile[i].von - 1e-9 && T <= teile[i].bis + 1e-9);
      const i = aktiv.length ? aktiv[aktiv.length - 1] : teile.length - 1;
      if (aktiv.length > 1) {                                               // überblenden; Echo nimmt das Bild des vorigen zudem in seine Rückkopplung auf
        zeichnen(i - 1, k); vorBild = { k, textur: misch.uniforms.uA.value = kopie("a") };
        zeichnen(i, k, T); vorBild = null; misch.uniforms.uB.value = kopie("b");
        misch.uniforms.uS.value = anteil(T, teile[i].von, teile[i - 1].bis);
        renderer.setRenderTarget(null); renderer.render(mischSzene, ortho);
      } else zeichnen(i, k, T);
      zuletzt = teile[i];
      return leinwand;
    },
    signet(zeichnen, punkt, f, w = B, h = H) {
      passen(S, Math.max(2, Math.round(w)), Math.max(2, Math.round(h)));
      S.bild(zeichnen, punkt, f, hell);
      return leinwand;
    },
    zaehler() { return zuletzt.W.zaehler(); },
    entsorgen() {
      for (const p of teile) p.W.entsorgen();
      S.entsorgen(); textur.dispose(); quad.dispose(); misch.dispose();
      for (const n of ["a", "b", "q"]) kopien?.[n].dispose();
      renderer.dispose(); renderer.forceContextLoss();
    },
  };
}
