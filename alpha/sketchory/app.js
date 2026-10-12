// «Sketchory» – Seite: Bild laden, Satz eingeben, Vorschau abspielen, Video (MP4) und Standbild (PNG) herunterladen.
// Alles bleibt im Browser. Video über WebCodecs (H.264, schneller als Echtzeit, Bild für Bild genau) und mp4.js;
// wo das fehlt, in Echtzeit über MediaRecorder (die Länge trägt dauer.js von The Fictory nach).
import { striche, analyseMass } from "./strich.js?v=2";
import { BREITE, HOEHE, FPS, dateiname } from "./ablauf.js?v=2";
import { szene, bild, standbild, SCHRIFTEN } from "./szene.js?v=2";
import { mp4 } from "./mp4.js?v=2";
import { mitDauer } from "../the-fictory/dauer.js?v=21";

const $ = (id) => document.getElementById(id);
const vorschau = $("vorschau"), vctx = vorschau.getContext("2d");
const eingabe = $("datei"), ablage = $("ablage"), satzFeld = $("satz");
const wahl = { stil: $("stil"), staerke: $("staerke"), zeichnen: $("zeichnen"), schrift: $("schrift"), empfindlichkeit: $("empfindlichkeit") };
const knopfSpielen = $("spielen"), knopfVideo = $("video"), knopfPng = $("png");
const meldung = $("meldung"), fortschritt = $("fortschritt");

const ruhig = matchMedia("(prefers-reduced-motion: reduce)").matches;
const S = { bild: null, name: "", ergebnis: null, sz: null, start: 0, laeuft: false, film: null, rechnen: 0 };

const leinwand = (w, h) => {
  if (typeof OffscreenCanvas !== "undefined") return new OffscreenCanvas(w, h);
  const c = document.createElement("canvas"); c.width = w; c.height = h; return c;
};
const messer = leinwand(8, 8).getContext("2d");
const messen = (text, groesse, schrift) => {
  const s = SCHRIFTEN[schrift];
  messer.font = `${s.gewicht} ${groesse}px ${s.familie}`;
  return messer.measureText(text).width;
};
const schriften = Promise.all([
  document.fonts.load('400 66px "Instrument Sans"'), document.fonts.load('400 52px "Instrument Sans"'), document.fonts.load("300 74px Newsreader"),
]).catch(() => {});

function melden(text, fehler = false) {
  meldung.textContent = text;
  meldung.classList.toggle("fehler", fehler);
}

// ——— Bild laden ———
eingabe.addEventListener("change", () => { if (eingabe.files?.[0]) laden(eingabe.files[0]); });
for (const art of ["dragenter", "dragover"]) ablage.addEventListener(art, (e) => { e.preventDefault(); ablage.classList.add("drueber"); });
for (const art of ["dragleave", "drop"]) ablage.addEventListener(art, () => ablage.classList.remove("drueber"));
ablage.addEventListener("drop", (e) => {
  e.preventDefault();
  const datei = [...(e.dataTransfer?.files ?? [])].find((f) => f.type.startsWith("image/"));
  if (datei) laden(datei); else melden("Das ist kein Bild. Bitte ein Foto oder einen Scan (JPG, PNG, HEIC je nach Browser) verwenden.", true);
});
$("beispiel").addEventListener("click", async () => {
  const antwort = await fetch("beispiel.jpg");
  laden(new File([await antwort.blob()], "beispiel.jpg", { type: "image/jpeg" }));
});

async function laden(datei) {
  melden("Bild wird gelesen …");
  let bitmap;
  try {
    bitmap = await createImageBitmap(datei, { imageOrientation: "from-image" });
  } catch {
    try { bitmap = await bildElement(datei); } catch { melden("Dieses Bild kann der Browser nicht öffnen. Versuche es als JPG oder PNG.", true); return; }
  }
  const [w, h] = analyseMass(bitmap.width, bitmap.height);
  const c = leinwand(w, h), ctx = c.getContext("2d", { willReadFrequently: true });
  ctx.drawImage(bitmap, 0, 0, w, h);
  S.bild = { daten: ctx.getImageData(0, 0, w, h).data, w, h };
  S.name = datei.name;
  $("quelle").src = URL.createObjectURL(datei);
  $("quelle-box").hidden = false;
  ablage.classList.add("hat-bild");
  await lesen();
}

function bildElement(datei) {
  return new Promise((ok, nein) => {
    const img = new Image();
    img.onload = () => ok(img); img.onerror = nein;
    img.src = URL.createObjectURL(datei);
  });
}

// das Bild in Striche verwandeln (im Worker, sonst hier)
let worker = null;
try { worker = new Worker(new URL("./rechner.js?v=2", import.meta.url), { type: "module" }); } catch { worker = null; }
function rechnen(empfindlichkeit) {
  const { daten, w, h } = S.bild;
  const nr = ++S.rechnen;
  if (!worker) return Promise.resolve({ nr, ergebnis: striche(daten, w, h, { empfindlichkeit }) });
  return new Promise((ok) => {
    const antwort = (e) => { if (e.data.nr === nr) { worker.removeEventListener("message", antwort); ok(e.data); } };
    worker.addEventListener("message", antwort);
    worker.postMessage({ nr, daten: daten.slice(), breite: w, hoehe: h, empfindlichkeit });
  });
}

async function lesen() {
  if (!S.bild) return;
  melden("Die Linien werden gesucht …");
  sperren(true);
  const t0 = performance.now();
  const { nr, ergebnis, fehler } = await rechnen(Number(wahl.empfindlichkeit.value));
  if (nr !== S.rechnen) return;   // inzwischen neu verlangt
  sperren(false);
  if (fehler || !ergebnis) { melden(`Das Bild liess sich nicht lesen: ${fehler}`, true); return; }
  S.ergebnis = ergebnis;
  if (!ergebnis.striche.length) { melden("Im Bild wurden keine Linien gefunden. Versuche unter «Feinheiten» eine höhere Empfindlichkeit.", true); return; }
  const { info } = ergebnis;
  $("auswertung").textContent = `${ergebnis.striche.length} Striche und Flächen${info.flaechen ? ` (davon ${info.flaechen} Flächen)` : ""} · ${info.umgekehrt ? "dunkle Linien auf hellem Grund, umgekehrt" : "helle Linien auf dunklem Grund"} · ${Math.round(performance.now() - t0)} ms`;
  await neu();
  staerkeZeigen();
  melden("Bereit. Die Vorschau läuft; «Video erstellen» rechnet das MP4.");
}

/** Szene aus Ergebnis und Einstellungen; Vorschau von vorn */
async function neu({ abspielen = !ruhig } = {}) {
  if (!S.ergebnis) return;
  await schriften;
  S.optionen = optionen();
  S.sz = szene(S.ergebnis, S.optionen);
  $("dauer").textContent = `${S.sz.zeit.dauer.toFixed(1).replace(".", ",")} s · ${BREITE} × ${HOEHE} · ${FPS} Bilder/s`;
  knopfVideo.disabled = false; knopfPng.disabled = false; knopfSpielen.disabled = false;
  $("leer").hidden = true;
  if (abspielen) spielen(); else { anhalten(); bild(vctx, S.sz, S.sz.zeit.ab.stehen[0]); }
}

function optionen() {
  return {
    stil: wahl.stil.value, staerke: Number(wahl.staerke.value) / 100, zeichnen: Number(wahl.zeichnen.value),
    text: satzFeld.value.replace(/\s+/g, " ").trim(), schrift: wahl.schrift.value, messen, leinwand,
  };
}

let warten = 0;
satzFeld.addEventListener("input", () => { clearTimeout(warten); warten = setTimeout(() => neu(), 450); });
for (const k of ["zeichnen", "schrift"]) wahl[k].addEventListener("change", () => neu());
wahl.empfindlichkeit.addEventListener("change", () => lesen());

// ——— Strichstärke: gut sichtbar, wirkt sofort (die Vorschau zeigt beim Einstellen die fertige Zeichnung), bleibt für die nächste Karte ———
const STAERKE = { min: 30, max: 300, schritt: 10 };
const merken = (k, v) => { try { localStorage.setItem(`sketchory.${k}`, v); } catch { /* privates Fenster: dann eben nicht */ } };
const erinnern = (k) => { try { return localStorage.getItem(`sketchory.${k}`); } catch { return null; } };
const voreinstellungen = [...document.querySelectorAll("[data-staerke]")];
{
  const s = Number(erinnern("staerke"));
  if (s >= STAERKE.min && s <= STAERKE.max) wahl.staerke.value = s;
  if (["gezeichnet", "gleichmaessig"].includes(erinnern("stil"))) wahl.stil.value = erinnern("stil");
}
function staerkeZeigen() {
  const v = Number(wahl.staerke.value);
  $("staerke-wert").textContent = `${v} %`;
  for (const b of voreinstellungen) b.setAttribute("aria-pressed", String(Number(b.dataset.staerke) === v));
  if (S.sz) $("linie").textContent = `Linie im Video etwa ${S.sz.linie.toFixed(1).replace(".", ",")} px breit (bei 1080 px Bildbreite).`;
}
let bildWunsch = 0;
/** neue Stärke oder Art: Szene neu, die fertige Zeichnung zeigen (höchstens einmal je Bild der Anzeige) */
function strichZeigen() {
  merken("staerke", wahl.staerke.value); merken("stil", wahl.stil.value);
  staerkeZeigen();
  if (!S.ergebnis || bildWunsch) return;
  bildWunsch = requestAnimationFrame(async () => {
    bildWunsch = 0;
    await neu({ abspielen: false });
    staerkeZeigen();
  });
}
const stufe = (d) => {
  wahl.staerke.value = Math.min(STAERKE.max, Math.max(STAERKE.min, Math.round((Number(wahl.staerke.value) + d) / STAERKE.schritt) * STAERKE.schritt));
  strichZeigen();
};
wahl.staerke.addEventListener("input", strichZeigen);
wahl.stil.addEventListener("change", strichZeigen);
$("duenner").addEventListener("click", () => stufe(-STAERKE.schritt));
$("dicker").addEventListener("click", () => stufe(STAERKE.schritt));
for (const b of voreinstellungen) b.addEventListener("click", () => { wahl.staerke.value = b.dataset.staerke; strichZeigen(); });
staerkeZeigen();

// ——— Vorschau ———
function spielen() {
  if (!S.sz) return;
  S.start = performance.now();
  if (!S.laeuft) { S.laeuft = true; requestAnimationFrame(takt); }
  knopfSpielen.textContent = "Anhalten";
}
function anhalten() { S.laeuft = false; knopfSpielen.textContent = "Abspielen"; }
// für die Browser-Tests (tests/sketchory.e2e.mjs)
window.__sketchory = S;
function takt(jetzt) {
  if (!S.laeuft || !S.sz) return;
  const t = (jetzt - S.start) / 1000;
  if (t >= S.sz.zeit.dauer) { bild(vctx, S.sz, S.sz.zeit.dauer - 1 / FPS); anhalten(); return; }
  bild(vctx, S.sz, t);
  requestAnimationFrame(takt);
}
knopfSpielen.addEventListener("click", () => (S.laeuft ? anhalten() : spielen()));
if (ruhig) melden("Hinweis: Dein System wünscht weniger Bewegung. Die Vorschau startet erst auf «Abspielen».");

// ——— Standbild ———
knopfPng.addEventListener("click", async () => {
  if (!S.ergebnis) return;
  const c = leinwand(BREITE, HOEHE);
  standbild(c.getContext("2d"), szene(S.ergebnis, optionen()));
  const blob = c.convertToBlob ? await c.convertToBlob({ type: "image/png" }) : await new Promise((ok) => c.toBlob(ok, "image/png"));
  herunterladen(blob, dateiname(new Date(), "png"));
});

function herunterladen(blob, name) {
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob); a.download = name;
  document.body.append(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 60_000);
}

// ——— Video ———
const CODECS = ["avc1.640028", "avc1.4d0028", "avc1.42e028", "avc1.640032", "avc1.42e032"];
async function webcodecs() {
  if (typeof VideoEncoder === "undefined" || typeof VideoFrame === "undefined") return null;
  for (const codec of CODECS) {
    const cfg = { codec, width: BREITE, height: HOEHE, bitrate: 8_000_000, framerate: FPS, avc: { format: "avc" }, latencyMode: "quality" };
    try { if ((await VideoEncoder.isConfigSupported(cfg)).supported) return cfg; } catch { /* nächster */ }
  }
  return null;
}

knopfVideo.addEventListener("click", async () => {
  if (!S.ergebnis) return;
  anhalten();
  sperren(true);
  fortschritt.hidden = false; fortschritt.value = 0;
  const sz = szene(S.ergebnis, optionen());
  const c = leinwand(BREITE, HOEHE), ctx = c.getContext("2d", { alpha: false });
  const t0 = performance.now();
  try {
    const cfg = await webcodecs();
    const ergebnis = cfg ? await mitWebCodecs(cfg, sz, c, ctx) : await mitRecorder(sz, c, ctx);
    zeigen(ergebnis, sz, performance.now() - t0);
  } catch (fehler) {
    melden(`Das Video liess sich nicht erstellen: ${fehler?.message ?? fehler}`, true);
  } finally {
    sperren(false);
    fortschritt.hidden = true;
  }
});

async function mitWebCodecs(cfg, sz, c, ctx) {
  melden("Video wird gerechnet …");
  const proben = [];
  let avcC = null, fehler = null;
  const enc = new VideoEncoder({
    output: (chunk, meta) => {
      if (meta?.decoderConfig?.description && !avcC) {
        const d = meta.decoderConfig.description;
        avcC = new Uint8Array(d.buffer ? d.buffer.slice(d.byteOffset, d.byteOffset + d.byteLength) : d);
      }
      const daten = new Uint8Array(chunk.byteLength);
      chunk.copyTo(daten);
      proben.push({ daten, key: chunk.type === "key", zeit: chunk.timestamp });
    },
    error: (e) => { fehler = e; },
  });
  enc.configure(cfg);
  const n = sz.zeit.bilder;
  for (let i = 0; i < n; i++) {
    if (fehler) throw fehler;
    bild(ctx, sz, i / FPS);
    const frame = new VideoFrame(c, { timestamp: Math.round((i * 1e6) / FPS), duration: Math.round(1e6 / FPS) });
    enc.encode(frame, { keyFrame: i % (FPS * 2) === 0 });
    frame.close();
    while (enc.encodeQueueSize > 6) await new Promise((ok) => setTimeout(ok, 4));
    if (i % 10 === 0) { fortschritt.value = i / n; await new Promise((ok) => setTimeout(ok, 0)); }
  }
  await enc.flush();
  enc.close();
  if (fehler) throw fehler;
  if (!avcC) throw new Error("der Encoder hat keine Beschreibung geliefert");
  if (proben.some((p, i) => i && p.zeit < proben[i - 1].zeit)) throw new Error("unerwartete Reihenfolge der Bilder");
  const datei = mp4({ breite: BREITE, hoehe: HOEHE, fps: FPS, avcC, proben });
  return { blob: new Blob([datei], { type: "video/mp4" }), endung: "mp4", art: `MP4 (H.264, ${cfg.codec})` };
}

function recorderTyp() {
  if (typeof MediaRecorder === "undefined") return null;
  for (const [mime, endung] of [["video/mp4;codecs=avc1.42E01E", "mp4"], ["video/mp4", "mp4"], ["video/webm;codecs=vp9", "webm"], ["video/webm;codecs=vp8", "webm"], ["video/webm", "webm"]])
    if (MediaRecorder.isTypeSupported(mime)) return { mime, endung };
  return null;
}

/** Ausweg ohne WebCodecs: in Echtzeit über eine sichtbare Leinwand aufnehmen */
async function mitRecorder(sz) {
  const typ = recorderTyp();
  if (!typ) throw new Error("dieser Browser kann keine Videos erzeugen (weder WebCodecs noch MediaRecorder)");
  melden(`Video wird in Echtzeit aufgenommen (${sz.zeit.dauer.toFixed(0)} s). Lass diese Seite sichtbar.`);
  const c = document.createElement("canvas"); c.width = BREITE; c.height = HOEHE;
  const ctx = c.getContext("2d", { alpha: false });
  const strom = c.captureStream(0), spur = strom.getVideoTracks()[0];
  const rec = new MediaRecorder(strom, { mimeType: typ.mime, videoBitsPerSecond: 8_000_000 });
  const stuecke = [];
  rec.ondataavailable = (e) => { if (e.data.size) stuecke.push(e.data); };
  const fertig = new Promise((ok) => { rec.onstop = ok; });
  bild(ctx, sz, 0);
  rec.start(1000);
  const t0 = performance.now(), n = sz.zeit.bilder;
  for (let i = 0; i < n; i++) {
    bild(ctx, sz, i / FPS);
    spur.requestFrame?.();
    fortschritt.value = i / n;
    await new Promise((ok) => setTimeout(ok, Math.max(0, t0 + ((i + 1) * 1000) / FPS - performance.now())));
  }
  const sekunden = (performance.now() - t0) / 1000;
  rec.stop(); await fertig;
  const roh = new Uint8Array(await new Blob(stuecke).arrayBuffer());
  return { blob: new Blob([mitDauer(roh, sekunden)], { type: typ.mime.split(";")[0] }), endung: typ.endung, art: typ.mime };
}

function zeigen({ blob, endung, art }, sz, ms) {
  if (S.film) URL.revokeObjectURL(S.film);
  S.film = URL.createObjectURL(blob);
  const v = $("film");
  v.src = S.film;
  const laden = $("laden");
  laden.href = S.film; laden.download = dateiname(new Date(), endung);
  $("film-info").textContent = `${BREITE} × ${HOEHE} · ${sz.zeit.dauer.toFixed(1).replace(".", ",")} s · ${(blob.size / 1e6).toFixed(1).replace(".", ",")} MB · ${art} · gerechnet in ${(ms / 1000).toFixed(1).replace(".", ",")} s`;
  $("ergebnis").hidden = false;
  melden("Fertig. Prüfe das Video und lade es herunter.");
  $("ergebnis").scrollIntoView({ behavior: ruhig ? "auto" : "smooth", block: "nearest" });
}

function sperren(an) {
  for (const el of [knopfVideo, knopfPng, eingabe, $("beispiel"), $("duenner"), $("dicker"), ...voreinstellungen, ...Object.values(wahl)]) el.disabled = an || ((el === knopfVideo || el === knopfPng) && !S.ergebnis);
}

// leerer Grund in der Vorschau
vctx.fillStyle = "#000"; vctx.fillRect(0, 0, BREITE, HOEHE);
