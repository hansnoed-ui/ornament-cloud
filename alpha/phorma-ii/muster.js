// PHORMA II – Morphogenese: Reaktion und Diffusion nach Gray-Scott (Turing-Muster) auf der GPU, ersetzt seit dem 17. Oktober 2026 den Stich
// (Rückmeldung: «diese Stich-Optiken mag ich nicht besonders»). Zwei Stoffe U und V reagieren (U + 2V → 3V) und verlaufen verschieden schnell;
// je nach Zufuhr f und Abbau k entstehen Flecken, Labyrinthe oder nichts. An den Kanten des Fotos keimt V, die Muster breiten sich aus.
//   01 Keimen – überall dieselben Werte (Labyrinth), es wächst von den Kanten her ins Dunkel; 02 Muster – f und k folgen dem Ton des Fotos: helle
//   Stellen bleiben dichtes Labyrinth, mittlere zerfallen in Flecken, dunkle werden leer – ein lebendes Druckraster, das die Farben des Fotos
//   annimmt; 03 Bild (oder Dichte vor einem weiteren Effekt) – wo die Muster dicht sind, erscheint das Foto zuerst, zuletzt überall.
// Glänzend gezeichnet (Normale aus dem Gefälle von V, Glanzlicht), Kanten kupfern. Der Zustand liegt in Float-Zielen und wird nur mit texelFetch
// gelesen (Telefone können Float-Texturen oft nicht glätten). Feste Teilschritte (600 je Sekunde eigener Zeit), Wiedereinstiegspunkte alle 2 s.
import * as THREE from "three";
import { anteil, weich, glocke, quadMaterial } from "./gemeinsam.js?v=8";
import { phase } from "./ablauf.js?v=8";
import { zufall } from "./analyse.js?v=8";

export const SCHRITTE = 600;
const SICHERN = 1200;
/** Feinheit: Auflösung der Simulation gegenüber dem Film (die Muster sind etwa 10 Punkte der Simulation gross) */
export const FEINHEIT = { fein: 2, mittel: 3, grob: 4.5 };

const SCHRITT = /* glsl */ `
  uniform sampler2D tZ, tFoto; uniform ivec2 uN; uniform vec2 uTon, uF, uK, uF0K0; uniform float uKarte;
  vec2 z(ivec2 p) { return texelFetch(tZ, clamp(p, ivec2(0), uN - 1), 0).rg; }
  void main() {
    ivec2 p = ivec2(gl_FragCoord.xy);
    vec2 c = z(p);
    vec2 l = -c + 0.2 * (z(p + ivec2(1, 0)) + z(p - ivec2(1, 0)) + z(p + ivec2(0, 1)) + z(p - ivec2(0, 1)))
               + 0.05 * (z(p + ivec2(1, 1)) + z(p - ivec2(1, 1)) + z(p + ivec2(1, -1)) + z(p - ivec2(1, -1)));
    vec3 foto = texture2D(tFoto, (vec2(p) + 0.5) / vec2(uN)).rgb;
    float L = clamp((pow(dot(foto, vec3(0.2126, 0.7152, 0.0722)), 1.0 / 2.2) - uTon.x) / max(uTon.y - uTon.x, 0.05), 0.0, 1.0);
    float f = mix(uF0K0.x, mix(uF.x, uF.y, L), uKarte), k = mix(uF0K0.y, mix(uK.x, uK.y, L), uKarte);
    float r = c.r * c.g * c.g;
    vec2 n = c + vec2(1.0 * l.r - r + f * (1.0 - c.r), 0.5 * l.g + r - (f + k) * c.g);
    gl_FragColor = vec4(clamp(n, 0.0, 1.0), 0.0, 1.0);
  }`;
const KOPIE = /* glsl */ `uniform sampler2D tQuelle; void main() { gl_FragColor = texelFetch(tQuelle, ivec2(gl_FragCoord.xy), 0); }`;
const ZEIGEN = /* glsl */ `
  uniform sampler2D tZ, tFoto; uniform vec2 uN; uniform float uSicht, uFarbe, uZeigen, uSchwelle, uHinter; uniform vec3 uKupfer; varying vec2 vUv;
  float V(vec2 uv) {                                                     // bilinear von Hand (texelFetch)
    vec2 q = uv * uN - 0.5; ivec2 i = ivec2(floor(q)), m = ivec2(uN) - 1; vec2 f = fract(q);
    float a = texelFetch(tZ, clamp(i, ivec2(0), m), 0).g, b = texelFetch(tZ, clamp(i + ivec2(1, 0), ivec2(0), m), 0).g;
    float c = texelFetch(tZ, clamp(i + ivec2(0, 1), ivec2(0), m), 0).g, d = texelFetch(tZ, clamp(i + ivec2(1, 1), ivec2(0), m), 0).g;
    return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
  }
  void main() {
    vec2 e = 1.0 / uN;
    float v = V(vUv), m = smoothstep(0.17, 0.27, v);
    vec3 n = normalize(vec3(-(V(vUv + vec2(e.x, 0.0)) - V(vUv - vec2(e.x, 0.0))) * 5.0, -(V(vUv + vec2(0.0, e.y)) - V(vUv - vec2(0.0, e.y))) * 5.0, 1.0));
    vec3 Ld = normalize(vec3(-0.5, 0.6, 0.62));
    float diff = 0.45 + 0.55 * max(dot(n, Ld), 0.0), glanz = pow(max(dot(reflect(-Ld, n), vec3(0.0, 0.0, 1.0)), 0.0), 36.0);
    vec3 foto = texture2D(tFoto, vUv).rgb;
    vec3 stoff = mix(vec3(0.95, 0.9, 0.84), foto * 1.25, uFarbe);
    float kante = smoothstep(0.07, 0.15, v) * (1.0 - m);
    vec3 c = (stoff * diff * m + vec3(1.0, 0.96, 0.9) * glanz * m * 0.55 + uKupfer * kante * 0.55 * (1.0 - 0.5 * uFarbe)) * uSicht;
    // dichte Stellen: V in der Umgebung (acht Proben im Abstand von 5 Punkten der Simulation)
    float d = 0.0;
    for (int i = 0; i < 8; i++) { float a = float(i) * 0.785398; d += smoothstep(0.17, 0.27, V(vUv + vec2(cos(a), sin(a)) * e * 5.0)); }
    float zeigen = smoothstep(uSchwelle, uSchwelle + 0.2, d / 8.0 * 0.6 + m * 0.4) * uZeigen;
    // im Bild füllt das Foto zuerst die Lücken zwischen den Mustern, dann löst es sie ab (sonst erschien es fast auf einen Schlag)
    c += foto * uHinter * (1.0 - m);
    gl_FragColor = vec4(mix(c, foto, zeigen), 1.0);
  }`;

export function muster(g, teil) {
  const { renderer, A, B, H } = g;
  const K = phase(teil, "keimen"), M = phase(teil, "muster"), D = phase(teil, "bild") ?? phase(teil, "dichte");
  const teiler = FEINHEIT[g.muster] ?? FEINHEIT.mittel;
  const sw = Math.round(B / (g.test ? 6 : teiler)), sh = Math.round(H / (g.test ? 6 : teiler));
  // Ausgangslage: U = 1, V = 0; V keimt an den Kanten (kleine Flecken, zufällig verteilt) und an den Keimen von Physarum
  const rnd = zufall(0x6d0f + sw), start = new Float32Array(sw * sh * 4);
  // (gemessen: einzelne Punkte, 3 × 3 und 5 × 5 sterben ab, 7 × 7 überleben; an Kanten dicht, sonst vereinzelt, damit auch ruhige Flächen keimen)
  const keim = (cx, cy, r = 3) => { for (let y = Math.max(0, cy - r); y <= Math.min(sh - 1, cy + r); y++) for (let x = Math.max(0, cx - r); x <= Math.min(sw - 1, cx + r); x++) { const i = (y * sw + x) * 4; start[i] = 0.5; start[i + 1] = 0.25; } };
  for (let i = 0; i < sw * sh; i++) { start[i * 4] = 1; start[i * 4 + 3] = 1; }
  for (let y = 3; y < sh - 3; y++) for (let x = 3; x < sw - 3; x++) {
    const ay = Math.min(A.h - 1, Math.floor((1 - (y + 0.5) / sh) * A.h)), ax = Math.min(A.w - 1, Math.floor(((x + 0.5) / sw) * A.w)), k = A.nahrung[ay * A.w + ax];
    if (rnd() < (k > 0.35 ? 0.004 * k : 0.0003)) keim(x, y);
  }
  for (const [u, v] of A.keime) {
    const cx = u * sw, cy = (1 - v) * sh;
    keim(Math.round(cx), Math.round(cy), 3);
  }
  const startTex = new THREE.DataTexture(start, sw, sh, THREE.RGBAFormat, THREE.FloatType); startTex.needsUpdate = true;
  const zielRT = () => new THREE.WebGLRenderTarget(sw, sh, { type: THREE.FloatType, minFilter: THREE.NearestFilter, magFilter: THREE.NearestFilter, depthBuffer: false });
  const zustand = [zielRT(), zielRT()];
  const N = new THREE.Vector2(sw, sh);
  const schritt = quadMaterial(SCHRITT, { tZ: { value: null }, tFoto: { value: g.fotoTex }, uN: { value: [sw, sh] }, uTon: { value: new THREE.Vector2(...(A.ton ?? [0, 1])) },
    // dunkel → leer, Mitte → Flecken, hell → Labyrinth; beim Keimen überall Labyrinth
    uF: { value: new THREE.Vector2(0.018, 0.056) }, uK: { value: new THREE.Vector2(0.06, 0.062) }, uF0K0: { value: new THREE.Vector2(0.055, 0.062) }, uKarte: { value: 0 } });
  const kopie = quadMaterial(KOPIE, { tQuelle: { value: null } });
  const zeigen = quadMaterial(ZEIGEN, { tZ: { value: null }, tFoto: { value: g.fotoTex }, uN: { value: N }, uSicht: { value: 0 }, uFarbe: { value: 0 }, uZeigen: { value: 0 },
    uSchwelle: { value: 1 }, uHinter: { value: 0 }, uKupfer: { value: new THREE.Color(1.0, 0.42, 0.2) } });

  let n = -1, zi = 0;
  const sicherungen = [];
  const kopieren = (von, nach) => { kopie.uniforms.tQuelle.value = von.texture ?? von; g.pass(kopie, nach); };
  const zuruecksetzen = () => { kopieren(startTex, zustand[0]); zi = 0; n = 0; };
  const karte = (tau) => weich(anteil(tau, K[1] - 0.3, M[0] + 0.55 * (M[1] - M[0])));
  function einSchritt() {
    const u = schritt.uniforms;
    u.tZ.value = zustand[zi].texture; u.uKarte.value = karte(n / SCHRITTE);
    g.pass(schritt, zustand[1 - zi]); zi = 1 - zi; n++;
    if (n % SICHERN === 0 && !sicherungen.some((s) => s.n === n)) { const s = { n, rt: zielRT() }; kopieren(zustand[zi], s.rt); sicherungen.push(s); }
  }
  /** bis zu Schritt m; budget: in der Vorschau höchstens so viele Schritte je Bild (sie holt dann auf), im Video ohne Grenze */
  function bis(m, budget = Infinity) {
    if (n < 0 || m < n) {
      const s = sicherungen.filter((x) => x.n <= m).at(-1);
      if (s) { kopieren(s.rt, zustand[0]); zi = 0; n = s.n; } else zuruecksetzen();
    }
    while (n < m && budget-- > 0) einSchritt();
  }

  return {
    render(rt, tau, { vorschau = false } = {}) {
      bis(Math.floor(tau * SCHRITTE + 1e-6), vorschau ? 400 : Infinity);
      const u = zeigen.uniforms;
      u.tZ.value = zustand[zi].texture;
      u.uSicht.value = teil.erst ? weich(anteil(tau, 0, 0.6)) : 1;
      u.uFarbe.value = 0.9 * weich(anteil(tau, M[0] + 0.3 * (M[1] - M[0]), M[1]));
      u.uZeigen.value = weich(anteil(tau, D[0] - 0.2, D[0] + 0.6));
      u.uSchwelle.value = 0.7 - 1.0 * weich(anteil(tau, D[0] + 0.3, D[1] - 0.5));
      u.uHinter.value = 0.85 * weich(anteil(tau, D[0] - 0.4, D[0] + 0.5 * (D[1] - D[0])));
      g.pass(zeigen, rt);
      const ende = weich(anteil(tau, D[1] - 0.7, D[1] - 0.1));
      return { aktiv: 1 - weich(anteil(tau, D[0] + 0.4 * (D[1] - D[0]), D[1])), bloom: 0.12 + 0.1 * glocke(tau, 0, M[1]), radius: 0.15, saum: 0.0025, ende };
    },
    vorab: { szenen: [], materialien: [schritt, kopie, zeigen] },
    zaehler(tau) { const z = (x) => x.toLocaleString("de-CH"); return `gray-scott ${sw}×${sh} · schritt ${z(Math.max(0, n))} · f/k ${karte(tau) < 0.5 ? "überall gleich" : "nach dem ton"}`; },
    entsorgen() { for (const r of [...zustand, ...sicherungen.map((s) => s.rt)]) r.dispose(); startTex.dispose(); for (const m of [schritt, kopie, zeigen]) m.dispose(); },
  };
}
