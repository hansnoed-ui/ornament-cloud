// PHORMA III – die Bühne (three.js, WebGL 2, lokal in vendor/three-0.185.1): eine eigene Leinwand in der Auflösung des Ziels, darauf das Gewebe.
// film.js setzt das Bild in die 2D-Szene (Vorschau, Standbild und Video). Aus PHORMA II übernommen, ohne Zeitfront und leuchtendes Signet; Bloom
// und Negativ (umkehr) für die Irrfahrt.
//   Belichtung: für die Bewegungsunschärfe mehrere Proben innerhalb der Verschlusszeit (180°: eine halbe Bilddauer) gemittelt – das geht, weil jedes
//               Bild nur von der Zeit abhängt.
//   Ausgabe:    Farbsaum, Schulter für Lichter, Vignette und Korn – alle an die Bewegung gekoppelt –, zuletzt das Einrasten ins Bild (ende → 1:
//               das Bild exakt), dann sRGB.
import * as THREE from "three";
import { UnrealBloomPass } from "three/addons/postprocessing/UnrealBloomPass.js";
import { FullScreenQuad } from "three/addons/postprocessing/Pass.js";
import { ziel, quadMaterial } from "./gemeinsam.js?v=16";
import { FPS, kette, laufend } from "./ablauf.js?v=16";
import { gewebe } from "./gewebe.js?v=16";
import { irrfahrt } from "./irrfahrt.js?v=16";
import { traube } from "./traube.js?v=16";
import { video } from "./video.js?v=16";

const FABRIK = { gewebe, irrfahrt, lichtwuerfel: (g, teil) => irrfahrt(g, teil, { fest: true }), traube, video };

const SUMME = /* glsl */ `uniform sampler2D tQuelle; uniform float uGewicht; varying vec2 vUv; void main() { gl_FragColor = vec4(texture2D(tQuelle, vUv).rgb * uGewicht, 1.0); }`;
const AUSGABE = /* glsl */ `
  uniform sampler2D tSumme, tFoto; uniform float uEnde, uAktiv, uSaumStaerke, uKorn, uUmkehr, uBelichtung, uKontrast; uniform uint uBild; varying vec2 vUv;
  float hash(uvec3 v) { v = v * 1664525u + 1013904223u; v.x += v.y * v.z; v.y += v.z * v.x; v.z += v.x * v.y; v ^= v >> 16u; v.x += v.y * v.z; return float(v.x) / 4294967295.0; }
  vec3 schulter(vec3 c) { vec3 k = 0.8 + 0.2 * (1.0 - exp(-(c - 0.8) / 0.2)); return mix(c, k, step(0.8, c)); }
  vec3 srgb(vec3 c) { c = clamp(c, 0.0, 1.0); return mix(c * 12.92, 1.055 * pow(c, vec3(1.0 / 2.4)) - 0.055, step(0.0031308, c)); }
  void main() {
    vec2 d = vUv - 0.5, s = d * uSaumStaerke * (1.0 + 4.0 * dot(d, d));
    vec3 c = vec3(texture2D(tSumme, vUv - s).r, texture2D(tSumme, vUv).g, texture2D(tSumme, vUv + s).b);
    // weich gestaucht wie ein Film (Irrfahrt): 1 → 0,7, 2 → 0,91, 4 → 0,99; die schwächsten Fäden versinken im Schwarz (sonst ein grauer Schleier)
    if (uBelichtung > 0.0) c = 1.0 - exp(-max(c - 0.025, 0.0) * uBelichtung);
    c = mix(c, schulter(c), uAktiv);
    c *= mix(1.0, 1.0 - 0.7 * dot(d, d), uAktiv);
    // mehr Kontrast (das Gewebe; Wunsch vom 19. Oktober 2026: «etwas kontrastreicher, nicht voll s/w, aber mehr Kontrast»): eine Tonwertkorrektur in
    // der wahrgenommenen Helligkeit – das Papier zum Weiss (Weisspunkt 0,93), die Grautöne der feinen Linien dunkler (Gamma 1,7), Schwarz bleibt
    // Schwarz; die Mitten bleiben grau (eine S-Kurve hellte die meist hellgrauen Haarlinien auf)
    if (uKontrast > 0.0) { vec3 x = clamp(pow(max(c, 0.0), vec3(1.0 / 2.2)), 0.0, 1.0); x = pow(clamp(x / mix(1.0, 0.93, uKontrast), 0.0, 1.0), vec3(mix(1.0, 1.7, uKontrast))); c = pow(x, vec3(2.2)); }
    c = mix(c, texture2D(tFoto, vUv).rgb, uEnde);
    vec3 o = srgb(c);
    float l = dot(o, vec3(0.299, 0.587, 0.114));
    o += (hash(uvec3(uvec2(gl_FragCoord.xy), uBild)) - 0.5) * uKorn * 4.0 * l * (1.0 - l) * uAktiv * (1.0 - uEnde);
    gl_FragColor = vec4(mix(o, 1.0 - o, uUmkehr), 1.0);
  }`;

/**
 * Die Bühne für ein Bild (Canvas in Filmgrösse B × H) und seine Analyse; ablauf: "gewebe" | "irrfahrt" | "lichtwuerfel" | "traube" | "video". optionen: grob (Telefon), test (klein), quelle ("foto" | "text" | "video" |
 * "ton"), ton (Analyse einer Tonspur, ton.js, oder null), laenge (Dauer des Gewebes nach der Tonspur), signet (mit Logo am Schluss), saetze (Bilder
 * aus dem Video), film (die Filmspur für den Effekt Video: { bild(t, { vorschau }), karte(t), index(t), n }). bild(zeit, t, w, h, { proben, verschluss, vorschau }) → Leinwand; zaehler(zeit, t) → Text für die Beschriftung; entsorgen().
 */
export function buehne(foto, A, ablauf, { grob = false, test = false, quelle = "foto", ton = null, laenge = null, signet = false, saetze = null, film = null, onVerloren = null, spur = () => {} } = {}) {
  const B = foto.width, H = foto.height;
  const canvas = typeof document !== "undefined" ? document.createElement("canvas") : new OffscreenCanvas(B, H);
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, alpha: false, preserveDrawingBuffer: true, powerPreference: "high-performance" });
  if (!renderer.capabilities.isWebGL2) throw new Error("WebGL 2 fehlt");
  // verliert der Browser die Grafik (meist: Speicher des Telefons voll), meldet die Seite das, statt still stehen zu bleiben
  let verloren = false, entsorgt = false;
  canvas.addEventListener?.("webglcontextlost", (e) => { e.preventDefault(); verloren = true; if (!entsorgt) onVerloren?.(); });   // nicht beim eigenen Freigeben
  renderer.setPixelRatio(1); renderer.autoClear = false;
  const fotoTex = new THREE.CanvasTexture(foto);
  fotoTex.colorSpace = THREE.SRGBColorSpace; fotoTex.anisotropy = 4;
  const quad = new FullScreenQuad();
  const g = { THREE, renderer, quad, foto, fotoTex, A, B, H, grob, test, quelle, ton, saetze, signet, film,
    pass(material, rt) { renderer.setRenderTarget(rt); quad.material = material; quad.render(renderer); },
    loeschen(rt, farbe = 0x000000) { renderer.setRenderTarget(rt); renderer.setClearColor(farbe, 1); renderer.clear(true, true, true); } };
  const K = kette({ art: ablauf, laenge, signet }), art = K.teile[0].art;
  g.ablaufDauer = K.dauer;
  spur(`Effekt wird aufgebaut: ${art}`);
  const effekt = FABRIK[art](g, K.teile[0]);

  let w = 0, h = 0, rtMix, rtSumme, bloom;
  const summe = quadMaterial(SUMME, { tQuelle: { value: null }, uGewicht: { value: 1 } }, { blending: THREE.CustomBlending, blendSrc: THREE.OneFactor, blendDst: THREE.OneFactor, blendEquation: THREE.AddEquation, transparent: true });
  const ausgabe = quadMaterial(AUSGABE, { tSumme: { value: null }, tFoto: { value: fotoTex }, uEnde: { value: 0 }, uAktiv: { value: 0 }, uSaumStaerke: { value: 0 }, uKorn: { value: 0.05 }, uUmkehr: { value: 0 }, uBelichtung: { value: 0 }, uKontrast: { value: 0 }, uBild: { value: 0 } });
  function groesse(nw, nh) {
    if (nw === w && nh === h) return;
    w = nw; h = nh;
    renderer.setSize(w, h, false);
    for (const r of [rtMix, rtSumme]) r?.dispose();
    // HalfFloat: Mischen in Float32 braucht EXT_float_blend, das viele Telefone nicht haben; mit Tiefe, wenn der Effekt sie braucht (die Traube)
    rtMix = ziel(w, h, { depthBuffer: !!effekt.tiefe }); rtSumme = ziel(w, h);
    bloom?.dispose();
    bloom = new UnrealBloomPass(new THREE.Vector2(w, h), 0, 0.5, 0.8);   // nur das Hellste leuchtet nach
    bloom.highPassUniforms.smoothWidth.value = 0.2;
  }
  /** eine Probe zur Zeit ts nach rtMix (mit Bloom, wenn der Effekt ihn will); gibt { aktiv, bloom, saum, ende, umkehr } */
  function probe(zeit, ts, opt) {
    const [L] = laufend(zeit, ts), info = effekt.render(rtMix, L.lokal, opt);
    if ((info.bloom ?? 0) > 0.002) { bloom.strength = info.bloom; bloom.radius = info.radius ?? 0.5; bloom.render(renderer, null, rtMix); }
    info.danach?.();                                                         // was scharf und ohne Bloom dazukommt (der Würfel der Irrfahrt)
    return info;
  }

  // Vorab übersetzen (Rückmeldung zu PHORMA II vom 17. Oktober 2026 vom Telefon: Seite «reagiert nicht»): die Programme eins nach dem anderen, jedes
  // in einer eigenen Aufgabe und einmal in ein winziges Ziel gezeichnet, damit es wirklich fertig ist
  const pause = () => new Promise((weiter) => setTimeout(weiter, 0));
  async function vorbereiten() {
    const klein = ziel(4, 4, { depthBuffer: true }), ortho = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1), flaeche = new THREE.PlaneGeometry(2, 2);
    const szenen = (effekt.vorab?.szenen ?? []).map(([s, k], j) => [`${art} Szene ${j + 1}`, s, k]);
    groesse(Math.round(B * (grob ? 0.6 : 0.85)), Math.round(H * (grob ? 0.6 : 0.85)));
    const bloomProgramme = Object.values(bloom).flat().filter((m) => m?.isShaderMaterial).map((m, j) => [`Bloom ${j + 1}`, m]);
    for (const [name, m] of [...(effekt.vorab?.materialien ?? []).map((m, j) => [`${art} Programm ${j + 1}`, m]), ["Belichtung", summe], ...(["irrfahrt", "lichtwuerfel", "traube"].includes(art) ? bloomProgramme : [])]) {
      const s = new THREE.Scene(); s.add(new THREE.Mesh(flaeche, m)); szenen.push([name, s, ortho]);
    }
    const aus = new THREE.Scene(); aus.add(new THREE.Mesh(flaeche, ausgabe));
    for (const [name, s, k, rt = klein] of [...szenen, ["Ausgabe", aus, ortho, null]]) {
      if (verloren || entsorgt) break;
      spur(`übersetzt: ${name}`);
      renderer.setRenderTarget(rt); renderer.compile(s, k);
      await pause();
      if (verloren || entsorgt) break;
      renderer.setRenderTarget(rt); renderer.render(s, k);
      await pause();
    }
    klein.dispose(); flaeche.dispose();
  }
  const warm = vorbereiten();
  return {
    korn: 0.05,                                                              // Filmkorn; das Intro der Website rechnet ohne (es matschte in der Kompression)
    canvas, B, H, ende: 0, warm, bereit: warm, fortschritt: () => 1,                     // ende: wie weit das letzte Bild schon das Bild war (1: exakt)
    get verloren() { return verloren; },
    /** für ?diagnose: Grafikchip und die Erweiterungen, auf die es ankommt */
    info() {
      const gl = renderer.getContext(), d = gl.getExtension("WEBGL_debug_renderer_info");
      const hat = (n) => (gl.getExtension(n) ? "ja" : "nein");
      return { grafik: d ? gl.getParameter(d.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER), maxTextur: gl.getParameter(gl.MAX_TEXTURE_SIZE),
        floatZiel: hat("EXT_color_buffer_float"), floatMischen: hat("EXT_float_blend"), floatLinear: hat("OES_texture_float_linear"), parallel: hat("KHR_parallel_shader_compile") };
    },
    /** vorschau: ohne Bedeutung im Gewebe (keine Simulation, die aufholen müsste) */
    bild(zeit, t, nw = B, nh = H, { proben = 1, verschluss = 0.5, vorschau = false } = {}) {
      groesse(Math.max(2, Math.round(nw)), Math.max(2, Math.round(nh)));
      g.loeschen(rtSumme);
      // die Proben über den Verschluss; nur die derselben Lage wie das Bild selbst (springt der Effekt mitten im Verschluss, lägen sonst zwei Bilder
      // übereinander – Rückmeldung: «die Würfel sind immer noch verzogen, die Animation überblendet teilweise stark»)
      let zeiten = Array.from({ length: proben }, (_, k) => (proben > 1 ? Math.max(0, t - (verschluss / FPS) * (1 - k / (proben - 1))) : t));
      if (effekt.lage && proben > 1) { const lage = (ts) => effekt.lage(laufend(zeit, ts)[0].lokal), jetzt = lage(t); zeiten = zeiten.filter((ts) => lage(ts) === jetzt); }
      let info = null;
      for (let k = 0; k < zeiten.length; k++) {
        info = probe(zeit, zeiten[k], { scharf: k === zeiten.length - 1, gewicht: zeiten.length, vorschau });
        summe.uniforms.tQuelle.value = rtMix.texture; summe.uniforms.uGewicht.value = 1 / zeiten.length;
        g.pass(summe, rtSumme);
      }
      const umkehr = info.umkehr ?? 0;                                        // das Negativ ganz oder gar nicht: gemittelt gab es graue, ausgewaschene Bilder
      const u = ausgabe.uniforms;
      u.tSumme.value = rtSumme.texture; u.uEnde.value = info.ende ?? 0; u.uAktiv.value = info.aktiv;
      u.uKorn.value = this.korn ?? 0.05; u.uSaumStaerke.value = info.saum ?? 0.0025; u.uUmkehr.value = umkehr; u.uBelichtung.value = info.belichtung ?? 0; u.uKontrast.value = info.kontrast ?? 0; u.uBild.value = Math.round(t * FPS);
      g.pass(ausgabe, null);
      this.ende = info.ende ?? 0;
      return canvas;
    },
    zaehler(zeit, t) { const [L] = laufend(zeit, t); return effekt.zaehler?.(L.lokal) ?? ""; },
    /** die Lage des Effekts zur Filmzeit t (wechselt sie, springt das Bild); ohne Lagen null */
    lage(zeit, t) { const [L] = laufend(zeit, t); return effekt.lage ? effekt.lage(L.lokal) : null; },
    entsorgen() {
      entsorgt = true;
      effekt.entsorgen();
      for (const r of [rtMix, rtSumme]) r?.dispose();
      bloom?.dispose(); summe.dispose(); ausgabe.dispose(); quad.dispose(); fotoTex.dispose();
      renderer.dispose(); renderer.forceContextLoss?.();
    },
  };
}
