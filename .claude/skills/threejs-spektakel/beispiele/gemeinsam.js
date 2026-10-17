// threejs-spektakel – gemeinsamer Unterbau der Beispiele: Foto laden und auf das Filmformat zuschneiden, Bühne (WebGL), Filmlook
// (Bloom, Farbsaum, Korn, Vignette), Zeitleiste mit Abspielen, Foto wählen, MP4 über WebCodecs (mit dem MP4-Schreiber von Sketchory).
//
// Jedes Beispiel ruft  starte("name", aufbauen)  auf. aufbauen({ renderer, foto, B, H }) gibt { dauer, bild(t), entsorgen() } zurück.
// bild(t) zeichnet das Bild zur Zeit t (Sekunden) – zustandslos oder, bei Simulationen, über simulation() deterministisch nachgerechnet.
import * as THREE from "three";
import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";
import { RenderPass } from "three/addons/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/addons/postprocessing/UnrealBloomPass.js";
import { ShaderPass } from "three/addons/postprocessing/ShaderPass.js";
import { OutputPass } from "three/addons/postprocessing/OutputPass.js";
import { mp4 } from "../../../../alpha/sketchory/mp4.js";

export const FPS = 30;
export const PARAM = new URLSearchParams(location.search);
/** ?test: halbe Grösse und weniger Teilchen (für die Prüfung in Chromium ohne Grafikkarte) */
export const TEST = PARAM.has("test");
export const FORMATE = { "4:5": [1080, 1350], "9:16": [1080, 1920] };

export function filmMass() {
  const [B, H] = FORMATE[PARAM.get("format")] ?? FORMATE["4:5"];
  const s = TEST ? 0.5 : 1;
  return [Math.round((B * s) / 2) * 2, Math.round((H * s) / 2) * 2];
}

// ——— Zeit ———
export const klemm = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
export const anteil = (t, a, b) => klemm((t - a) / (b - a));
export const weich = (x) => x * x * (3 - 2 * x);
export const inOut = (x) => (x < 0.5 ? 4 * x * x * x : 1 - (-2 * x + 2) ** 3 / 2);

// ——— Foto ———
/** Testbild, falls kein Foto angegeben ist: Verlauf, Sonne, Streifen, feines Raster – genug Struktur, damit jeder Effekt etwas zeigt */
export function testbild(B = 1200, H = 1500) {
  const c = document.createElement("canvas"); c.width = B; c.height = H;
  const x = c.getContext("2d");
  const v = x.createLinearGradient(0, 0, 0, H); v.addColorStop(0, "#0b1d3a"); v.addColorStop(0.55, "#2f5fb0"); v.addColorStop(1, "#e9d8b4");
  x.fillStyle = v; x.fillRect(0, 0, B, H);
  x.fillStyle = "#f4b740"; x.beginPath(); x.arc(B * 0.62, H * 0.36, B * 0.2, 0, Math.PI * 2); x.fill();
  x.save(); x.translate(B * 0.3, H * 0.72); x.rotate(-0.35); x.fillStyle = "#c2410c";
  for (let i = 0; i < 7; i++) x.fillRect(-B * 0.4, i * 34 - 110, B * 0.8, 16);
  x.restore();
  x.fillStyle = "rgba(255,255,255,0.75)";
  for (let yy = 40; yy < H * 0.3; yy += 22) for (let xx = 30; xx < B * 0.4; xx += 22) x.fillRect(xx, yy, 3, 3);
  x.fillStyle = "#fff"; x.font = `600 ${B * 0.075}px Georgia, serif`; x.fillText("ornament.cloud", B * 0.08, H * 0.93);
  return c;
}

/** Bild (Bitmap, Bild, Leinwand) deckend auf B × H zuschneiden (wie object-fit: cover) */
export function zuschneiden(quelle, B, H) {
  const c = document.createElement("canvas"); c.width = B; c.height = H;
  const sw = quelle.width, sh = quelle.height, s = Math.max(B / sw, H / sh);
  c.getContext("2d").drawImage(quelle, (B - sw * s) / 2, (H - sh * s) / 2, sw * s, sh * s);
  return c;
}

/** { leinwand, textur (sRGB), pixel (ImageData), breite, hoehe, hell(u, v) → 0..1 } – u, v wie in den Shadern (v = 0 unten) */
export function fotoAus(quelle, B, H) {
  const leinwand = zuschneiden(quelle, B, H);
  const pixel = leinwand.getContext("2d", { willReadFrequently: true }).getImageData(0, 0, B, H);
  const textur = new THREE.CanvasTexture(leinwand);
  textur.colorSpace = THREE.SRGBColorSpace;
  textur.minFilter = THREE.LinearMipmapLinearFilter;
  textur.anisotropy = 4;
  const hell = (u, v) => {
    const px = Math.min(B - 1, Math.max(0, Math.round(u * (B - 1)))), py = Math.min(H - 1, Math.max(0, Math.round((1 - v) * (H - 1))));
    const i = (py * B + px) * 4, d = pixel.data;
    return (0.2126 * d[i] + 0.7152 * d[i + 1] + 0.0722 * d[i + 2]) / 255;
  };
  return { leinwand, textur, pixel, breite: B, hoehe: H, hell };
}

export async function ladeFoto(url, B, H) {
  let quelle = null;
  if (url) {
    try { quelle = await createImageBitmap(await (await fetch(url)).blob(), { imageOrientation: "from-image" }); }
    catch (e) { console.warn("Foto nicht geladen, nehme das Testbild:", e); }
  }
  return fotoAus(quelle ?? testbild(), B, H);
}

// ——— Bühne ———
export function webgl(B, H) {
  const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true, powerPreference: "high-performance" });
  renderer.setPixelRatio(1);
  renderer.setSize(B, H, false);
  return renderer;
}

// ——— Filmlook: Bloom → Farbsaum, Korn, Vignette → Tonwerte und sRGB ———
const LOOK = {
  uniforms: { tDiffuse: { value: null }, uZeit: { value: 0 }, uSaum: { value: 0.004 }, uKorn: { value: 0.05 }, uVignette: { value: 0.35 }, uMass: { value: new THREE.Vector2(1, 1) } },
  vertexShader: /* glsl */ `varying vec2 vUv; void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
  fragmentShader: /* glsl */ `
    uniform sampler2D tDiffuse; uniform float uZeit, uSaum, uKorn, uVignette; uniform vec2 uMass; varying vec2 vUv;
    float hash(vec2 p) { uvec2 q = uvec2(ivec2(p)) * uvec2(1597334673u, 3812015801u); return float((q.x ^ q.y) * 1597334673u) / 4294967295.0; }   // ganzzahlig: keine Muster
    void main() {
      vec2 d = vUv - 0.5; float r2 = dot(d, d);
      vec2 s = d * uSaum * (1.0 + 4.0 * r2);                       // Farbsaum: zum Rand hin stärker
      vec3 c = vec3(texture2D(tDiffuse, vUv - s).r, texture2D(tDiffuse, vUv).g, texture2D(tDiffuse, vUv + s).b);
      float k = hash(floor(vUv * uMass) + floor(uZeit * 30.0 + 0.5) * vec2(7919.0, 104729.0)) - 0.5;   // Korn: je Bild neu, aber reproduzierbar
      float l = dot(min(c, 1.0), vec3(0.2126, 0.7152, 0.0722));
      c += k * uKorn * 4.0 * l * (1.0 - l);                          // vor allem in den Mitteltönen, nicht im Schwarz
      c *= 1.0 - uVignette * smoothstep(0.08, 0.5, r2 * 1.7);
      gl_FragColor = vec4(max(c, 0.0), 1.0);
    }`,
};

/** EffectComposer mit Bloom und Filmlook; render(t) statt renderer.render(szene, kamera) */
export function filmlook(renderer, szene, kamera, { staerke = 0.9, radius = 0.5, schwelle = 0.15, saum = 0.004, korn = 0.05, vignette = 0.35 } = {}) {
  const groesse = renderer.getSize(new THREE.Vector2());
  const composer = new EffectComposer(renderer);
  composer.setPixelRatio(1);
  composer.setSize(groesse.x, groesse.y);
  composer.addPass(new RenderPass(szene, kamera));
  const bloom = new UnrealBloomPass(groesse.clone(), staerke, radius, schwelle);
  composer.addPass(bloom);
  const look = new ShaderPass(LOOK);
  look.uniforms.uSaum.value = saum; look.uniforms.uKorn.value = korn; look.uniforms.uVignette.value = vignette;
  look.uniforms.uMass.value.copy(groesse);
  composer.addPass(look);
  composer.addPass(new OutputPass());
  return {
    bloom, look, composer,
    render(t) { look.uniforms.uZeit.value = t; composer.render(); },
    entsorgen() { composer.dispose(); bloom.dispose(); },
  };
}

/**
 * Deterministische Simulation für Zustände, die sich von Bild zu Bild fortschreiben (GPGPU, Feedback): bisZu(t) rechnet in festen
 * Schritten von 1/FPS ab dem letzten Stand weiter – oder nach einem Sprung zurück von vorn. So ist Bild n im Video immer gleich,
 * egal ob abgespielt, gespult oder exportiert.
 */
export function simulation({ zuruecksetzen, schritt }) {
  let n = -1;
  return async function bisZu(t) {
    const ziel = Math.max(0, Math.round(t * FPS));
    if (ziel < n || n < 0) { zuruecksetzen(); n = 0; schritt(0, 0); }
    while (n < ziel) { n++; await schritt(n / FPS, n); }
  };
}

// ——— Film: Zeitleiste, Abspielen, Foto wählen, Video ———
export async function starte(titel, aufbauen, { renderer: neuerRenderer = webgl } = {}) {
  const [B, H] = filmMass();
  const renderer = await neuerRenderer(B, H);
  const canvas = renderer.domElement;
  canvas.className = "film"; canvas.style.aspectRatio = `${B} / ${H}`;
  document.body.append(canvas);

  const leiste = document.createElement("div"); leiste.className = "leiste";
  leiste.innerHTML = `<button data-k="spielen">▶</button><input type="range" min="0" step="${1 / FPS}" value="0" aria-label="Zeit">
    <span class="code">0.00 s</span><label>Foto …<input type="file" accept="image/*"></label><button data-k="video">Video</button>
    <select aria-label="Format"><option value="4:5">4 : 5</option><option value="9:16">9 : 16</option></select>`;
  const meldung = document.createElement("div"); meldung.className = "meldung";
  document.body.append(leiste, meldung);
  const $ = (s) => leiste.querySelector(s);
  const melden = (text, fehler = false) => { meldung.textContent = text; meldung.classList.toggle("fehler", fehler); };
  $("select").value = PARAM.get("format") === "9:16" ? "9:16" : "4:5";
  $("select").addEventListener("change", (e) => { PARAM.set("format", e.target.value); location.search = PARAM.toString(); });

  let wirkung = null, laeuft = false, t = 0, warte = Promise.resolve(), letzte = 0;
  const F = {
    titel, B, H, renderer,
    get dauer() { return wirkung?.dauer ?? 0; },
    get t() { return t; },
    /** Bild zur Zeit t zeichnen (nacheinander, nie zwei gleichzeitig) */
    bild(neu) { t = klemm(neu, 0, F.dauer); warte = warte.then(() => wirkung.bild(t)); $("input[type=range]").value = t; $(".code").textContent = `${t.toFixed(2)} s`; return warte; },
    async foto(quelle) {
      wirkung?.entsorgen?.();
      wirkung = await aufbauen({ renderer, foto: quelle ? fotoAus(quelle, B, H) : await ladeFoto(PARAM.get("bild"), B, H), B, H });
      $("input[type=range]").max = wirkung.dauer;
      await F.bild(0);
    },
    video: () => video(F, melden),
  };
  window.__film = F;

  $("[data-k=spielen]").addEventListener("click", () => { laeuft = !laeuft; if (laeuft && t >= F.dauer - 1e-3) F.bild(0); letzte = performance.now(); $("[data-k=spielen]").textContent = laeuft ? "❚❚" : "▶"; });
  $("input[type=range]").addEventListener("input", (e) => { laeuft = false; $("[data-k=spielen]").textContent = "▶"; F.bild(+e.target.value); });
  $("input[type=file]").addEventListener("change", async (e) => {
    const datei = e.target.files?.[0]; if (!datei) return;
    try { await F.foto(await createImageBitmap(datei, { imageOrientation: "from-image" })); melden(datei.name); }
    catch (f) { melden(`Das Foto liess sich nicht öffnen: ${f.message ?? f}`, true); }
  });
  $("[data-k=video]").addEventListener("click", async () => {
    laeuft = false; $("[data-k=spielen]").textContent = "▶";
    try { await F.video(); } catch (f) { melden(`Kein Video: ${f.message ?? f}`, true); }
  });

  const schleife = async (jetzt) => {
    if (laeuft) {
      const neu = t + Math.min(0.1, (jetzt - letzte) / 1000);
      await F.bild(neu);
      if (neu >= F.dauer) { laeuft = false; $("[data-k=spielen]").textContent = "▶"; }
    }
    letzte = jetzt; requestAnimationFrame(schleife);
  };
  try { await F.foto(null); melden(`${titel} · ${B} × ${H} · ${F.dauer.toFixed(1)} s`); }
  catch (f) { melden(`Fehler: ${f.message ?? f}`, true); throw f; }
  F.bereit = true;
  requestAnimationFrame(schleife);
  return F;
}

// ——— Video: jedes Bild einzeln rechnen und über WebCodecs als H.264 in eine MP4-Datei schreiben ———
const CODECS = ["avc1.640028", "avc1.4d0028", "avc1.42e028", "avc1.640032", "avc1.42e032"];
async function codec(B, H) {
  if (typeof VideoEncoder === "undefined" || typeof VideoFrame === "undefined") return null;
  for (const c of CODECS) {
    const cfg = { codec: c, width: B, height: H, bitrate: 14_000_000, framerate: FPS, avc: { format: "avc" }, latencyMode: "quality" };
    try { if ((await VideoEncoder.isConfigSupported(cfg)).supported) return cfg; } catch { /* nächster */ }
  }
  return null;
}

export async function video(F, melden = () => {}) {
  const cfg = await codec(F.B, F.H);
  if (!cfg) throw new Error("dieser Browser kann kein H.264 über WebCodecs (Chrome, Edge oder Safari nehmen)");
  const proben = []; let avcC = null, fehler = null;
  const enc = new VideoEncoder({
    output: (chunk, meta) => {
      const d = meta?.decoderConfig?.description;
      if (d && !avcC) avcC = new Uint8Array(d.buffer ? d.buffer.slice(d.byteOffset, d.byteOffset + d.byteLength) : d);
      const daten = new Uint8Array(chunk.byteLength); chunk.copyTo(daten);
      proben.push({ daten, key: chunk.type === "key" });
    },
    error: (e) => { fehler = e; },
  });
  enc.configure(cfg);
  const n = Math.round(F.dauer * FPS);
  for (let i = 0; i < n; i++) {
    if (fehler) throw fehler;
    await F.bild(i / FPS);
    const frame = new VideoFrame(F.renderer.domElement, { timestamp: Math.round((i * 1e6) / FPS), duration: Math.round(1e6 / FPS) });
    enc.encode(frame, { keyFrame: i % (FPS * 2) === 0 });
    frame.close();
    while (enc.encodeQueueSize > 6) await new Promise((ok) => setTimeout(ok, 4));
    if (i % 15 === 0) { melden(`Video wird gerechnet … ${Math.round((100 * i) / n)} %`); await new Promise((ok) => setTimeout(ok, 0)); }
  }
  await enc.flush(); enc.close();
  if (fehler) throw fehler;
  if (!avcC) throw new Error("der Encoder hat keine Beschreibung geliefert");
  const blob = new Blob([mp4({ breite: F.B, hoehe: F.H, fps: FPS, avcC, proben })], { type: "video/mp4" });
  const a = document.createElement("a");
  const z = new Date(), p = (x) => String(x).padStart(2, "0");
  a.download = `${F.titel}-${z.getFullYear()}-${p(z.getMonth() + 1)}-${p(z.getDate())}-${p(z.getHours())}${p(z.getMinutes())}.mp4`;
  a.href = URL.createObjectURL(blob); document.body.append(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 60_000);
  melden(`Video fertig: ${n} Bilder, ${(blob.size / 1e6).toFixed(1)} MB`);
  return blob;
}

// ——— GLSL-Bausteine ———
/** 3D-Simplex-Rauschen (Ashima Arts / Ian McEwan, MIT) und Curl-Rauschen: divergenzfreie Wirbel, die nicht verklumpen */
export const GLSL_RAUSCHEN = /* glsl */ `
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
