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
import { KUPFER, anteil, weich, inOut, datenTextur, ziel, quadMaterial } from "./gemeinsam.js?v=34";
import { FPS, kette, laufend, TITEL } from "./ablauf.js?v=34";
import { videoPlan, videoStelle, videoStelleBei } from "./filmquelle.js?v=34";
import { physarum } from "./physarum.js?v=34";
import { tiefe } from "./tiefe.js?v=34";
import { tuch } from "./tuch.js?v=34";
import { montage, montageSignet } from "./montage.js?v=34";
import { welle } from "./welle.js?v=34";
import { sortierung } from "./sortierung.js?v=34";
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
// vor der Montage: Rechtecke in drei Grössen schneiden das alte Bild weg, darunter liegt schon die Montage
const FELDER = /* glsl */ `
  uniform sampler2D tA, tB; uniform float uP, uSeite; varying vec2 vUv;
  float h(vec2 p) { return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }
  void main() {
    vec2 q = vec2(vUv.x * uSeite, vUv.y);
    float m = 0.0;
    for (int s = 0; s < 3; s++) {
      float n = 3.0 * pow(2.7, float(s));
      vec2 r = floor(q * vec2(n, n * (1.0 + 0.6 * float(s))));
      m = max(m, step(h(r + float(s) * 17.0), uP * 1.2 - 0.1 * float(s)));
    }
    gl_FragColor = vec4(mix(texture2D(tA, vUv).rgb, texture2D(tB, vUv).rgb, m), 1.0);
  }`;
// ungültige Werte (NaN, unendlich – manche Grafikchips von Telefonen liefern sie vereinzelt) werden schwarz, bevor sie sich ausbreiten (Rückmeldung vom
// 19. Oktober 2026: einige schwarze Bilder im Übergang von der Tiefe zum Tuch)
const SUMME = /* glsl */ `uniform sampler2D tQuelle; uniform float uGewicht; varying vec2 vUv; void main() { vec3 c = texture2D(tQuelle, vUv).rgb;
  if (any(isnan(c)) || any(isinf(c))) c = vec3(0.0); gl_FragColor = vec4(c * uGewicht, 1.0); }`;
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

const FABRIK = { physarum, tiefe, welle, tuch, sortierung, montage };
const leinwandWie = (q) => Object.assign(typeof document !== "undefined" ? document.createElement("canvas") : new OffscreenCanvas(q.width, q.height), { width: q.width, height: q.height });

/**
 * Die Bühne für ein Foto (Canvas in Filmgrösse B × H), seine Analyse und eine Kette. optionen: tiefeQuelle ("bild" | "ki"), grob (Telefon), test (klein),
 * film (ein Video: das Foto ist dann sein Standbild am Ende; alle Effekte zeigen das laufende Bild).
 * bild(zeit, t, w, h, { proben, verschluss }) → Leinwand; zaehler(zeit, t) → Text für die Beschriftung; entsorgen().
 */
export function buehne(foto, A, ablauf, { grob = false, test = false, tiefeQuelle = "bild", film = null, nahtlos = false, onVerloren = null, spur = () => {} } = {}) {
  const B = foto.width, H = foto.height;
  const canvas = typeof document !== "undefined" ? document.createElement("canvas") : new OffscreenCanvas(B, H);
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, alpha: false, preserveDrawingBuffer: true, powerPreference: "high-performance" });
  if (!renderer.capabilities.isWebGL2) throw new Error("WebGL 2 fehlt");
  // verliert der Browser die Grafik (meist: Speicher des Telefons voll), meldet die Seite das, statt still stehen zu bleiben
  let verloren = false, entsorgt = false;
  canvas.addEventListener?.("webglcontextlost", (e) => { e.preventDefault(); verloren = true; if (!entsorgt) onVerloren?.(); });   // nicht beim eigenen Freigeben
  renderer.setPixelRatio(1); renderer.autoClear = false;
  renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFShadowMap;
  // mit Video zeigt das Foto aller Effekte das laufende Bild (seit 19. Oktober 2026 durch die ganze Kette, Rückmeldung: «bleibt ständig ein "altes"
  // Video in den ersten drei Schritten hängen»): eine eigene Leinwand, je Probe neu gezeichnet; am Ende ist sie das Standbild
  const jetzt = film ? leinwandWie(foto) : null;
  if (jetzt) jetzt.getContext("2d").drawImage(foto, 0, 0);
  const fotoTex = new THREE.CanvasTexture(jetzt ?? foto);
  fotoTex.colorSpace = THREE.SRGBColorSpace; fotoTex.anisotropy = 4;
  const tiefeTex = datenTextur(A.tiefe, A.w, A.h), nahrungTex = datenTextur(A.nahrung, A.w, A.h);
  const quad = new FullScreenQuad();
  // helle Fotos (Zeichnung auf weissem Papier): weniger Glühen und weniger Licht, sonst brennt alles aus (Rückmeldung vom 19. Oktober 2026: «einige
  // Phasen sind viel zu hell (Tiefe, Tuch)»); bis zu einer mittleren Helligkeit von 0,5 bleibt alles wie es war
  const hellAnteil = Math.min(1, Math.max(0, (A.mittel - 0.5) / 0.3));
  const g = { THREE, renderer, quad, foto, fotoTex, tiefeTex, nahrungTex, A, B, H, grob, test, tiefeQuelle, nahtlos, belichtung: 1 - 0.45 * hellAnteil,
    pass(material, rt) { renderer.setRenderTarget(rt); quad.material = material; quad.render(renderer); },
    loeschen(rt, farbe = 0x000000) { renderer.setRenderTarget(rt); renderer.setClearColor(farbe, 1); renderer.clear(true, true, true); } };
  const K = kette(ablauf);
  g.ablaufDauer = K.dauer;
  // mit Video (film: { von, dauer, bild(sekunde, { vorschau }) }): die Montage holt das laufende Bild selbst
  // (dazu frühere Stellen), die anderen nehmen fotoTex (filmquelle.js)
  let zuletzt = "";
  if (film) {
    const plan = videoPlan(ablauf, film.dauer);
    g.film = { plan, stelle: (teil, tau) => videoStelle(plan, teil.von + tau),
      bild: (teil, tau, vorschau) => film.bild(film.von + videoStelle(plan, teil.von + tau), { vorschau }) };
  }
  const effekte = K.teile.map((teil) => { spur(`Effekt wird aufgebaut: ${teil.art}`); return FABRIK[teil.art](g, teil); });
  const art = (teil) => effekte[K.teile.findIndex((x) => x.art === teil.art)];

  let w = 0, h = 0, rtA, rtB, rtMix, rtSumme, bloom, glanz = null, logo = null;
  const front = quadMaterial(FRONT, { tA: { value: null }, tB: { value: null }, tKarte: { value: tiefeTex }, uP: { value: 0 }, uBreite: { value: 0.18 }, uSaum: { value: KUPFER.clone() } });
  const felder = quadMaterial(FELDER, { tA: { value: null }, tB: { value: null }, uP: { value: 0 }, uSeite: { value: B / H } });
  const summe = quadMaterial(SUMME, { tQuelle: { value: null }, uGewicht: { value: 1 } }, { blending: THREE.CustomBlending, blendSrc: THREE.OneFactor, blendDst: THREE.OneFactor, blendEquation: THREE.AddEquation, transparent: true });
  const ausgabe = quadMaterial(AUSGABE, { tSumme: { value: null }, tFoto: { value: fotoTex }, uEnde: { value: 0 }, uAktiv: { value: 0 }, uSaumStaerke: { value: 0 }, uKorn: { value: 0.05 }, uBild: { value: 0 } });
  function groesse(nw, nh) {
    if (nw === w && nh === h) return;
    w = nw; h = nh;
    renderer.setSize(w, h, false);
    for (const r of [rtA, rtB, rtMix, rtSumme]) r?.dispose();
    rtA = ziel(w, h); rtB = ziel(w, h); rtMix = ziel(w, h); rtSumme = ziel(w, h);   // HalfFloat: Mischen in Float32 braucht EXT_float_blend, das viele Telefone nicht haben
    bloom?.dispose();
    bloom = new UnrealBloomPass(new THREE.Vector2(w, h), 0, 0.55, 0.72 + 0.2 * hellAnteil);
    bloom.highPassUniforms.smoothWidth.value = 0.15;
    // ein ungültiger Wert im Bild würde vom Glühen über das ganze Bild verteilt (ganz schwarz): vorher abfangen
    bloom.materialHighPassFilter.fragmentShader = bloom.materialHighPassFilter.fragmentShader.replace("vec4 texel = texture2D( tDiffuse, vUv );",
      "vec4 texel = texture2D( tDiffuse, vUv ); if ( any( isnan( texel ) ) || any( isinf( texel ) ) ) texel = vec4( 0.0 );");
    for (const e of effekte) e.groesse?.(w, h);
  }

  /** eine Probe zur Zeit ts nach rtMix; gibt { aktiv, bloom, saum, ende } */
  function probe(zeit, ts, opt) {
    if (g.film) {
      // läuft das Video langsamer (kürzer als die Kette, Tempo «ruhig»), zwischen zwei Bildern überblenden, sonst ruckelt es
      const p = videoStelleBei(zeit, g.film.plan, ts) * FPS, k = Math.floor(p + 1e-3), f = p - k > 0.02 ? p - k : 0, o = { vorschau: !!opt?.vorschau };
      const b0 = film.bild(film.von + k / FPS, o), b1 = f ? film.bild(film.von + (k + 1) / FPS, o) : null;
      const zeichen = b0 ? `${k}|${f.toFixed(2)}|${o.vorschau}|${b0.width}|${b1?.width ?? 0}` : "";
      if (b0 && zeichen !== zuletzt) {
        const x = jetzt.getContext("2d");
        x.globalAlpha = 1; x.drawImage(b0, 0, 0, B, H);
        if (b1 && b1 !== b0) { x.globalAlpha = f; x.drawImage(b1, 0, 0, B, H); x.globalAlpha = 1; }
        fotoTex.needsUpdate = true; zuletzt = zeichen;
      }
    }
    const L = laufend(zeit, ts);
    let info;
    if (L.length === 1) info = art(L[0].teil).render(rtMix, L[0].lokal, opt);
    else {
      const [a, b] = L, ia = art(a.teil).render(rtA, a.lokal, opt), ib = art(b.teil).render(rtB, b.lokal, opt);
      const p = anteil(ts, b.teil.von, a.teil.bis);
      const mat = a.teil.uebergang === "felder" ? felder : front;
      mat.uniforms.tA.value = rtA.texture; mat.uniforms.tB.value = rtB.texture; mat.uniforms.uP.value = a.teil.uebergang === "felder" ? p : inOut(p);
      g.pass(mat, rtMix);
      const m = weich(p);
      info = { aktiv: Math.max(ia.aktiv, ib.aktiv), bloom: ia.bloom * (1 - m) + ib.bloom * m, radius: (ia.radius ?? 0.45) * (1 - m) + (ib.radius ?? 0.45) * m, saum: Math.max(ia.saum ?? 0, ib.saum ?? 0) + 0.004 * Math.sin(Math.PI * p), ende: ib.ende ?? 0 };
    }
    const s = (info.bloom ?? 0) * info.aktiv * (1 - (info.ende ?? 0)) * (1 - 0.75 * hellAnteil);
    if (s > 0.002) { bloom.strength = s; bloom.radius = info.radius ?? 0.45; bloom.render(renderer, null, rtMix); }
    return info;
  }

  // Vorab übersetzen (Rückmeldung vom 17. Oktober 2026 vom Telefon: Seite «reagiert nicht», jeder Klick ein Absturz): beim ersten Bild übersetzte
  // der Browser sonst rund zwanzig Programme am Stück, auf Grafikchips von Telefonen viele Sekunden. Hier eins nach dem anderen, jedes in einer
  // eigenen Aufgabe, und jedes einmal in ein winziges Ziel gezeichnet, damit es wirklich fertig ist.
  const pause = () => new Promise((weiter) => setTimeout(weiter, 0));
  async function vorbereiten() {
    const klein = ziel(4, 4, { depthBuffer: true }), ortho = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1), flaeche = new THREE.PlaneGeometry(2, 2);
    // [Name für die Spur, Szene, Kamera, Ziel]
    const szenen = effekte.flatMap((e, i) => (e.vorab?.szenen ?? []).map(([s, k], j) => [`${K.teile[i].art} Szene ${j + 1}`, s, k]));
    groesse(Math.round(B * (grob ? 0.6 : 0.85)), Math.round(H * (grob ? 0.6 : 0.85)));
    const materialien = [...effekte.flatMap((e, i) => (e.vorab?.materialien ?? []).map((m, j) => [`${K.teile[i].art} Programm ${j + 1}`, m])),
      ["Zeitfront", front], ["Felder", felder], ["Belichtung", summe], ...Object.values(bloom).flat().filter((m) => m?.isShaderMaterial).map((m, j) => [`Bloom ${j + 1}`, m])];
    for (const [name, m] of materialien) { const s = new THREE.Scene(); s.add(new THREE.Mesh(flaeche, m)); szenen.push([name, s, ortho]); }
    const aus = new THREE.Scene(); aus.add(new THREE.Mesh(flaeche, ausgabe));
    // compile() stösst das Übersetzen an (mit KHR_parallel_shader_compile im Hintergrund), das Bild ins winzige Ziel wartet es ab; nicht compileAsync:
    // dessen Nachfragen liefen weiter, wenn die Bühne inzwischen freigegeben war (Fehler «reading 'isReady'», von den Browser-Tests gefunden)
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
  // was erst im Hintergrund fertig wird (die Programme, die Bahn des Tuchs): die Vorschau beginnt danach, Video und Standbild warten darauf
  const bereit = Promise.all([warm, ...effekte.map((e) => e.bereit ?? null)]);
  const fortschritt = () => Math.min(1, ...effekte.map((e) => e.fortschritt?.() ?? 1));
  /** die Effekte, deren Bahn noch rechnet (für die Meldung: «Das Tuch …») */
  const rechnend = () => K.teile.filter((_, i) => (effekte[i].fortschritt?.() ?? 1) < 1).map((t) => TITEL[t.art]);
  return {
    canvas, B, H, effekte, ende: 0, warm, bereit, fortschritt, rechnend,
    /** mit Video: das laufende Bild der letzten Probe (ist ende = 1, zeichnet film.js es statt des Standbilds) */
    jetzt,                                     // ende: wie weit das letzte Bild schon das Foto war (1: exakt)
    /** bis wohin (Filmzeit) alles gerechnet ist, was im Hintergrund rechnet (das Tuch); Infinity, wenn alles da ist */
    gerechnetBis(zeit) {
      let bis = Infinity;
      K.teile.forEach((_, i) => { const g = effekte[i].gerechnetBis?.() ?? Infinity; if (g < Infinity) bis = Math.min(bis, zeit.teile[i].von + g * zeit.tempo); });
      return bis;
    },
    /** ist die Montage der letzte Effekt, kommt auch das Signet im Stil der Montage (signetMontage statt signet) */
    montageSchluss: K.teile.at(-1).art === "montage",
    get verloren() { return verloren; },
    /** für ?diagnose: Grafikchip und die Erweiterungen, auf die es ankommt */
    info() {
      const gl = renderer.getContext(), d = gl.getExtension("WEBGL_debug_renderer_info");
      const hat = (n) => (gl.getExtension(n) ? "ja" : "nein");
      return { grafik: d ? gl.getParameter(d.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER), maxTextur: gl.getParameter(gl.MAX_TEXTURE_SIZE),
        floatZiel: hat("EXT_color_buffer_float"), floatMischen: hat("EXT_float_blend"), floatLinear: hat("OES_texture_float_linear"), parallel: hat("KHR_parallel_shader_compile") };
    },
    /** vorschau: Simulationen holen je Bild nur begrenzt auf (die Seite bleibt bedienbar); Video und Standbild ohne */
    bild(zeit, t, nw = B, nh = H, { proben = 1, verschluss = 0.5, vorschau = false } = {}) {
      groesse(Math.max(2, Math.round(nw)), Math.max(2, Math.round(nh)));
      g.loeschen(rtSumme);
      let info = null;
      for (let k = 0; k < proben; k++) {
        const ts = proben > 1 ? Math.max(0, t - (verschluss / FPS) * (1 - k / (proben - 1))) : t;
        info = probe(zeit, ts, { vorschau });
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
    /** das Signet im Stil der Montage (zeichnenBei(ctx, f, foto): Grund, das Foto mit Deckkraft foto und das Signet bei Bild f; fertig: ein Bild,
     *  auf dem es ganz steht; tau: Sekunden seit dem Anfang des Signets; nahtlos: es beginnt beim Foto statt im Dunkeln); ende → 1: es steht
     *  unverändert da, film.js zeichnet es dann selbst */
    signetMontage(zeichnenBei, fertig, f, tau, nw = B, nh = H, { nahtlos = false, foto = 0 } = {}) {
      groesse(Math.max(2, Math.round(nw)), Math.max(2, Math.round(nh)));
      if (logo && logo.nahtlos !== nahtlos) { logo.entsorgen(); logo = null; }
      logo ??= montageSignet(g, zeichnenBei, fertig, { nahtlos });
      const info = logo.render(rtMix, f, tau, w, h, foto), u = ausgabe.uniforms;
      u.tSumme.value = rtMix.texture; u.uEnde.value = 0; u.uAktiv.value = 0; u.uSaumStaerke.value = info.saum; u.uBild.value = 0;
      g.pass(ausgabe, null);
      this.ende = info.ende;
      return canvas;
    },
    zaehler(zeit, t) { const L = laufend(zeit, t); return art(L.at(-1).teil).zaehler?.(L.at(-1).lokal) ?? ""; },
    entsorgen() {
      entsorgt = true;
      for (const e of effekte) e.entsorgen();
      glanz?.entsorgen(); logo?.entsorgen();
      for (const r of [rtA, rtB, rtMix, rtSumme]) r?.dispose();
      bloom?.dispose(); front.dispose(); felder.dispose(); summe.dispose(); ausgabe.dispose(); quad.dispose();
      fotoTex.dispose(); tiefeTex.dispose(); nahrungTex.dispose();
      renderer.dispose(); renderer.forceContextLoss?.();
    },
  };
}
