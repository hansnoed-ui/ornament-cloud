// PHORMA II – die Bühne (three.js, WebGL 2, lokal in vendor/three-0.185.1): eine eigene Leinwand in der Auflösung des Ziels, darauf die Kette der
// Effekte. film.js setzt das Bild in die 2D-Szene (Vorschau, Standbild und Video).
//   Probe:      die laufenden Effekte rechnen in lineare HalfFloat-Ziele; beim Übergang mischt eine Zeitfront die beiden (nach der Tiefe: nah zuerst,
//               an der Front ein Spalt, der das alte Bild verzieht wie ein Slit-Scan), dann Bloom.
//   Belichtung: für die Bewegungsunschärfe mehrere Proben innerhalb der Verschlusszeit (180°: eine halbe Bilddauer) gemittelt – das geht, weil jedes
//               Bild nur von der Zeit abhängt; Simulationen laufen dabei in ihren festen Teilschritten weiter (immer vorwärts).
//   Ausgabe:    Farbsaum, Schulter für Lichter, Vignette und Korn – alle an die Bewegung gekoppelt –, zuletzt das Einrasten ins Foto (ende → 1:
//               das Foto exakt), dann sRGB.
import * as THREE from "three";
import { UnrealBloomPass } from "three/addons/postprocessing/UnrealBloomPass.js";
import { FullScreenQuad } from "three/addons/postprocessing/Pass.js";
import { KUPFER, anteil, weich, inOut, datenTextur, ziel, quadMaterial } from "./gemeinsam.js?v=3";
import { FPS, kette, laufend } from "./ablauf.js?v=3";
import { physarum } from "./physarum.js?v=3";
import { stich } from "./stich.js?v=3";
import { tiefe } from "./tiefe.js?v=3";
import { tuch } from "./tuch.js?v=3";
// das leuchtende Signet von PHORMA I (Glaskristall als Punkt, Halo und Bokeh auf seiner Bahn; Wunsch vom 17. Oktober 2026: «der Abspann darf wieder
// das neue leuchtende Logo sein») – eigene Marke, damit kein älterer Stand ohne diesen Export aus dem Zwischenspeicher kommt
import { glanzSignet } from "../bildfragmentieren/raum.js?v=34";

const FRONT = /* glsl */ `
  uniform sampler2D tA, tB, tKarte; uniform float uP, uBreite; uniform vec3 uSaum; varying vec2 vUv;
  void main() {
    float lokal = 1.0 - texture2D(tKarte, vUv).r;                       // nah zuerst
    float front = uP * (1.0 + 2.0 * uBreite) - uBreite;
    float m = smoothstep(front + uBreite, front - uBreite, lokal);       // 1: schon das neue Bild
    float band = exp(-pow((lokal - front) / (uBreite * 0.45), 2.0)) * sin(3.14159 * uP);
    vec2 zug = vec2(0.0, band * 0.02 * sign(lokal - front + 1e-4));       // Spalt: das alte Bild wird an der Front verzogen
    vec3 a = texture2D(tA, vUv + zug).rgb, b = texture2D(tB, vUv - zug * 0.4).rgb;
    gl_FragColor = vec4(mix(a, b, m) + uSaum * band * 0.18, 1.0);
  }`;
const SUMME = /* glsl */ `uniform sampler2D tQuelle; uniform float uGewicht; varying vec2 vUv; void main() { gl_FragColor = vec4(texture2D(tQuelle, vUv).rgb * uGewicht, 1.0); }`;
const AUSGABE = /* glsl */ `
  uniform sampler2D tSumme, tFoto; uniform float uEnde, uAktiv, uSaumStaerke, uKorn; uniform uint uBild; varying vec2 vUv;
  float hash(uvec3 v) { v = v * 1664525u + 1013904223u; v.x += v.y * v.z; v.y += v.z * v.x; v.z += v.x * v.y; v ^= v >> 16u; v.x += v.y * v.z; return float(v.x) / 4294967295.0; }
  vec3 schulter(vec3 c) { vec3 k = 0.8 + 0.2 * (1.0 - exp(-(c - 0.8) / 0.2)); return mix(c, k, step(0.8, c)); }
  vec3 srgb(vec3 c) { c = clamp(c, 0.0, 1.0); return mix(c * 12.92, 1.055 * pow(c, vec3(1.0 / 2.4)) - 0.055, step(0.0031308, c)); }
  void main() {
    vec2 d = vUv - 0.5, s = d * uSaumStaerke * (1.0 + 4.0 * dot(d, d));
    vec3 c = vec3(texture2D(tSumme, vUv - s).r, texture2D(tSumme, vUv).g, texture2D(tSumme, vUv + s).b);
    c = mix(c, schulter(c), uAktiv);
    c *= mix(1.0, 1.0 - 0.7 * dot(d, d), uAktiv);
    c = mix(c, texture2D(tFoto, vUv).rgb, uEnde);
    vec3 o = srgb(c);
    float l = dot(o, vec3(0.299, 0.587, 0.114));
    o += (hash(uvec3(uvec2(gl_FragCoord.xy), uBild)) - 0.5) * uKorn * 4.0 * l * (1.0 - l) * uAktiv * (1.0 - uEnde);
    gl_FragColor = vec4(o, 1.0);
  }`;

const FABRIK = { physarum, stich, tiefe, tuch };

/**
 * Die Bühne für ein Foto (Canvas in Filmgrösse B × H), seine Analyse und eine Kette. optionen: tiefeQuelle ("bild" | "ki"), grob (Telefon), test (klein).
 * bild(zeit, t, w, h, { proben, verschluss }) → Leinwand; zaehler(zeit, t) → Text für die Beschriftung; entsorgen().
 */
export function buehne(foto, A, ablauf, { grob = false, test = false, tiefeQuelle = "bild", onVerloren = null } = {}) {
  const B = foto.width, H = foto.height;
  const canvas = typeof document !== "undefined" ? document.createElement("canvas") : new OffscreenCanvas(B, H);
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, alpha: false, preserveDrawingBuffer: true, powerPreference: "high-performance" });
  if (!renderer.capabilities.isWebGL2) throw new Error("WebGL 2 fehlt");
  // verliert der Browser die Grafik (meist: Speicher des Telefons voll), meldet die Seite das, statt still stehen zu bleiben
  let verloren = false;
  canvas.addEventListener?.("webglcontextlost", (e) => { e.preventDefault(); verloren = true; onVerloren?.(); });
  renderer.setPixelRatio(1); renderer.autoClear = false;
  renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFShadowMap;
  const fotoTex = new THREE.CanvasTexture(foto);
  fotoTex.colorSpace = THREE.SRGBColorSpace; fotoTex.anisotropy = 4;
  const tiefeTex = datenTextur(A.tiefe, A.w, A.h), nahrungTex = datenTextur(A.nahrung, A.w, A.h);
  const quad = new FullScreenQuad();
  const g = { THREE, renderer, quad, foto, fotoTex, tiefeTex, nahrungTex, A, B, H, grob, test, tiefeQuelle,
    pass(material, rt) { renderer.setRenderTarget(rt); quad.material = material; quad.render(renderer); },
    loeschen(rt, farbe = 0x000000) { renderer.setRenderTarget(rt); renderer.setClearColor(farbe, 1); renderer.clear(true, true, true); } };
  const K = kette(ablauf);
  const effekte = K.teile.map((teil) => FABRIK[teil.art](g, teil));
  const art = (teil) => effekte[K.teile.findIndex((x) => x.art === teil.art)];

  let w = 0, h = 0, rtA, rtB, rtMix, rtSumme, bloom, glanz = null;
  const front = quadMaterial(FRONT, { tA: { value: null }, tB: { value: null }, tKarte: { value: tiefeTex }, uP: { value: 0 }, uBreite: { value: 0.18 }, uSaum: { value: KUPFER.clone() } });
  const summe = quadMaterial(SUMME, { tQuelle: { value: null }, uGewicht: { value: 1 } }, { blending: THREE.CustomBlending, blendSrc: THREE.OneFactor, blendDst: THREE.OneFactor, blendEquation: THREE.AddEquation, transparent: true });
  const ausgabe = quadMaterial(AUSGABE, { tSumme: { value: null }, tFoto: { value: fotoTex }, uEnde: { value: 0 }, uAktiv: { value: 0 }, uSaumStaerke: { value: 0 }, uKorn: { value: 0.05 }, uBild: { value: 0 } });
  function groesse(nw, nh) {
    if (nw === w && nh === h) return;
    w = nw; h = nh;
    renderer.setSize(w, h, false);
    for (const r of [rtA, rtB, rtMix, rtSumme]) r?.dispose();
    rtA = ziel(w, h); rtB = ziel(w, h); rtMix = ziel(w, h); rtSumme = ziel(w, h);   // HalfFloat: Mischen in Float32 braucht EXT_float_blend, das viele Telefone nicht haben
    bloom?.dispose();
    bloom = new UnrealBloomPass(new THREE.Vector2(w, h), 0, 0.55, 0.72);
    bloom.highPassUniforms.smoothWidth.value = 0.15;
    for (const e of effekte) e.groesse?.(w, h);
  }

  /** eine Probe zur Zeit ts nach rtMix; gibt { aktiv, bloom, saum, ende } */
  function probe(zeit, ts) {
    const L = laufend(zeit, ts);
    let info;
    if (L.length === 1) info = art(L[0].teil).render(rtMix, L[0].lokal, ts);
    else {
      const [a, b] = L, ia = art(a.teil).render(rtA, a.lokal, ts), ib = art(b.teil).render(rtB, b.lokal, ts);
      const p = anteil(ts, b.teil.von, a.teil.bis);
      front.uniforms.tA.value = rtA.texture; front.uniforms.tB.value = rtB.texture; front.uniforms.uP.value = inOut(p);
      g.pass(front, rtMix);
      const m = weich(p);
      info = { aktiv: Math.max(ia.aktiv, ib.aktiv), bloom: ia.bloom * (1 - m) + ib.bloom * m, radius: (ia.radius ?? 0.45) * (1 - m) + (ib.radius ?? 0.45) * m, saum: Math.max(ia.saum ?? 0, ib.saum ?? 0) + 0.004 * Math.sin(Math.PI * p), ende: ib.ende ?? 0 };
    }
    const s = (info.bloom ?? 0) * info.aktiv * (1 - (info.ende ?? 0));
    if (s > 0.002) { bloom.strength = s; bloom.radius = info.radius ?? 0.45; bloom.render(renderer, null, rtMix); }
    return info;
  }

  // was erst im Hintergrund fertig wird (die Bahn des Tuchs): Video und Standbild warten darauf, die Vorschau zeichnet danach neu
  const bereit = Promise.all(effekte.map((e) => e.bereit ?? null));
  const fortschritt = () => Math.min(1, ...effekte.map((e) => e.fortschritt?.() ?? 1));
  return {
    canvas, B, H, effekte, ende: 0, bereit, fortschritt,                                     // ende: wie weit das letzte Bild schon das Foto war (1: exakt)
    get verloren() { return verloren; },
    bild(zeit, t, nw = B, nh = H, { proben = 1, verschluss = 0.5 } = {}) {
      groesse(Math.max(2, Math.round(nw)), Math.max(2, Math.round(nh)));
      g.loeschen(rtSumme);
      let info = null;
      for (let k = 0; k < proben; k++) {
        const ts = proben > 1 ? Math.max(0, t - (verschluss / FPS) * (1 - k / (proben - 1))) : t;
        info = probe(zeit, ts);
        summe.uniforms.tQuelle.value = rtMix.texture; summe.uniforms.uGewicht.value = 1 / proben;
        g.pass(summe, rtSumme);
      }
      const u = ausgabe.uniforms;
      u.tSumme.value = rtSumme.texture; u.uEnde.value = info.ende ?? 0; u.uAktiv.value = info.aktiv;
      u.uSaumStaerke.value = info.saum ?? 0.0025; u.uBild.value = Math.round(t * FPS);
      g.pass(ausgabe, null);
      this.ende = info.ende ?? 0;
      return canvas;
    },
    /** das Signet in der leuchtenden Fassung (zeichnen: das Signet auf eine 2D-Leinwand, punkt: Lage, Sicht, Radius, Spur, Farbe; f: Bild des Signets) */
    signet(zeichnen, punkt, f, nw = B, nh = H) {
      groesse(Math.max(2, Math.round(nw)), Math.max(2, Math.round(nh)));
      glanz ??= glanzSignet(renderer, B, H, punkt.farbe, false);
      for (const l of glanz.looks) if (l.groesse.x !== w || l.groesse.y !== h) l.setSize(w, h);
      glanz.groesse(w, h);
      glanz.bild(zeichnen, punkt, f, false);
      this.ende = 0;
      return canvas;
    },
    zaehler(zeit, t) { const L = laufend(zeit, t); return art(L.at(-1).teil).zaehler?.(L.at(-1).lokal) ?? ""; },
    entsorgen() {
      for (const e of effekte) e.entsorgen();
      glanz?.entsorgen();
      for (const r of [rtA, rtB, rtMix, rtSumme]) r?.dispose();
      bloom?.dispose(); front.dispose(); summe.dispose(); ausgabe.dispose(); quad.dispose();
      fotoTex.dispose(); tiefeTex.dispose(); nahrungTex.dispose();
      renderer.dispose(); renderer.forceContextLoss?.();
    },
  };
}
