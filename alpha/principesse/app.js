// «Principesse» – Seite: Bild laden (wird mit Pinselstrichen nachgemalt, der Glitzer funkelt), optional Foto und Satz,
// Vorschau, Video (MP4) und Standbild (PNG). Alles bleibt im Browser. Video wie in Sketchory: WebCodecs (H.264) und der
// MP4-Schreiber von Sketchory; ohne WebCodecs in Echtzeit über MediaRecorder (die Länge trägt dauer.js von The Fictory nach).
import { FPS, dateiname, filmMass } from "./ablauf.js?v=17";
import { szene, bild, standbild, SCHRIFTEN } from "./szene.js?v=17";
import { schriftSetzen } from "../sketchory/szene.js?v=8";
import { mp4 } from "../sketchory/mp4.js?v=8";
import { mitDauer } from "../the-fictory/dauer.js?v=21";
import { malen, klarbild } from "./malen.js?v=17";
import { glitzer } from "./glitzer.js?v=17";

const $ = (id) => document.getElementById(id);
const vorschau = $("vorschau"), vctx = vorschau.getContext("2d");
const ruhig = matchMedia("(prefers-reduced-motion: reduce)").matches;
const VORSCHAU = 0.5;   // Auflösung der Vorschau gegenüber dem Film (das Video rechnet in voller Grösse)
const S = { bild: null, gemaelde: null, funken: [], foto: null, klar: null, klarBereit: null, vorrat: null, sz: null, laeuft: false, start: 0, film: null, rechnen: 0, optionen: null,
  pinsel: 1, glitzer: 1, farbe: "hell", format: "bild", mass: [1080, 1440] };
window.__principesse = S;   // für die Browser-Tests

const leinwand = (w, h) => { if (typeof OffscreenCanvas !== "undefined") return new OffscreenCanvas(w, h); const c = document.createElement("canvas"); c.width = w; c.height = h; return c; };
const messer = leinwand(8, 8).getContext("2d");
const messen = (text, groesse, schrift) => { schriftSetzen(messer, schrift, groesse); return messer.measureText(text).width; };
const schriften = Promise.all([
  document.fonts.load('600 68px "Inter Display"'), document.fonts.load('500 64px "Inter Display"'), document.fonts.load('500 66px "Instrument Sans"'), document.fonts.load("400 74px Newsreader"),
  document.fonts.load("italic 400 92px Newsreader"),
]).catch(() => {});

const merken = (k, v) => { try { localStorage.setItem(`principesse.${k}`, v); } catch { /* egal */ } };
const erinnern = (k) => { try { return localStorage.getItem(`principesse.${k}`); } catch { return null; } };
function melden(text, fehler = false) { const m = $("meldung"); m.textContent = text; m.classList.toggle("fehler", fehler); }

// ——— Bilder laden ———
async function bitmap(datei) {
  try { return await createImageBitmap(datei, { imageOrientation: "from-image" }); }
  catch { return await new Promise((ok, nein) => { const i = new Image(); i.onload = () => ok(i); i.onerror = nein; i.src = URL.createObjectURL(datei); }); }
}
/** Bild auf 3 : 4 zuschneiden (füllend, mittig) und in der Grösse w × h als RGBA */
function zugeschnitten(quelle, w, h) {
  const c = leinwand(w, h), ctx = c.getContext("2d", { willReadFrequently: true });
  const s = Math.max(w / quelle.width, h / quelle.height), dw = quelle.width * s, dh = quelle.height * s;
  ctx.drawImage(quelle, (w - dw) / 2, (h - dh) / 2, dw, dh);
  return ctx.getImageData(0, 0, w, h).data;
}

function ablage(id, eingabe, laden) {
  const el = $(id);
  for (const art of ["dragenter", "dragover"]) el.addEventListener(art, (e) => { e.preventDefault(); el.classList.add("drueber"); });
  for (const art of ["dragleave", "drop"]) el.addEventListener(art, () => el.classList.remove("drueber"));
  el.addEventListener("drop", (e) => {
    e.preventDefault();
    const datei = [...(e.dataTransfer?.files ?? [])].find((f) => f.type.startsWith("image/"));
    if (datei) laden(datei); else melden("Das ist kein Bild. Bitte ein Foto (JPG, PNG, HEIC je nach Browser) verwenden.", true);
  });
  $(eingabe).addEventListener("change", (e) => { if (e.target.files?.[0]) laden(e.target.files[0]); });
}
ablage("ablage", "datei", bildLaden);
for (const k of document.querySelectorAll("[data-beispiel]")) k.addEventListener("click", async () => {
  const name = k.dataset.beispiel;
  bildLaden(new File([await (await fetch(`beispiel-${name}.jpg`)).blob()], `${name}.jpg`, { type: "image/jpeg" }));
});
ablage("ablage-foto", "foto", fotoLaden);

async function bildLaden(datei) {
  melden("Bild wird gelesen …");
  let q;
  try { q = await bitmap(datei); } catch { melden("Dieses Bild kann der Browser nicht öffnen. Versuche es als JPG oder PNG.", true); return; }
  S.bild = q;
  $("quelle").src = URL.createObjectURL(datei); $("quelle").hidden = false;
  $("ablage").classList.add("hat-bild"); $("ablage-titel").textContent = "Anderes Bild wählen";
  await lesen();
}

async function fotoLaden(datei) {
  try { S.foto = await bitmap(datei); } catch { melden("Dieses Foto kann der Browser nicht öffnen.", true); return; }
  $("foto-bild").src = URL.createObjectURL(datei); $("foto-bild").hidden = false;
  $("ablage-foto").classList.add("hat-bild"); $("foto-titel").textContent = "Anderes Foto wählen";
  $("foto-weg").hidden = false;
  if (S.gemaelde) neu();
}
$("foto-weg").addEventListener("click", () => {
  S.foto = null; $("foto-bild").hidden = true; $("ablage-foto").classList.remove("hat-bild"); $("foto-titel").textContent = "Foto wählen (freiwillig)";
  $("foto-weg").hidden = true; $("foto").value = "";
  if (S.gemaelde) neu();
});

// ——— malen lassen (Worker, sonst hier) ———
let worker = null, offen = [];
const neuerWorker = () => { try { return new Worker(new URL("./rechner.js?v=17", import.meta.url), { type: "module" }); } catch { return null; } };
worker = neuerWorker();
function rechnen() {
  // Format: wie das Bild, 3 : 4 oder 1 : 1; gemalt wird auf der halben Filmgrösse (für die breiten Pinsel genug), der Glitzer und das
  // scharfe Schlussbild in voller Grösse. Gibt zwei Versprechen: zuerst Striche und Glitzer, danach das scharfe Bild.
  const [B, H] = (S.mass = filmMass(S.format, S.bild.width, S.bild.height));
  const aw = Math.round(B / 2), ah = Math.round(H / 2);
  const analyse = { daten: zugeschnitten(S.bild, aw, ah), w: aw, h: ah }, film = { daten: zugeschnitten(S.bild, B, H), w: B, h: H };
  const nr = ++S.rechnen;
  if (!worker) {
    const erst = { nr, gemaelde: malen(analyse.daten, aw, ah, { massstab: B / aw, pinsel: S.pinsel }), funken: glitzer(film.daten, B, H) };
    return { erst: Promise.resolve(erst), klar: new Promise((ok) => setTimeout(() => ok({ nr, klar: klarbild(film.daten, B, H) }), 0)) };
  }
  // rechnet der Worker noch an einem älteren Auftrag (schnell nacheinander umgestellt), wird er ersetzt statt abgewartet
  if (offen.length) { worker.terminate(); worker = neuerWorker(); for (const ok of offen.splice(0)) ok({ nr: -1 }); }
  if (!worker) return rechnen();
  const warten = (art) => new Promise((ok) => {
    offen.push(ok);
    const antwort = (e) => {
      if (e.data.nr !== nr || e.data.art !== art) return;
      worker.removeEventListener("message", antwort); offen = offen.filter((f) => f !== ok); ok(e.data);
    };
    worker.addEventListener("message", antwort);
  });
  const erst = warten("gemaelde"), klar = warten("klar");
  worker.postMessage({ nr, analyse, film, pinsel: S.pinsel }, [analyse.daten.buffer, film.daten.buffer]);
  return { erst, klar };
}

async function lesen() {
  if (!S.bild) return;
  melden("Das Bild wird nachgemalt …");
  sperren(true);
  const t0 = performance.now();
  const versprechen = rechnen();
  const { nr, gemaelde, funken, fehler } = await versprechen.erst;
  if (nr !== S.rechnen) return;
  sperren(false);
  if (fehler || !gemaelde) { melden(`Das Bild liess sich nicht lesen: ${fehler}`, true); return; }
  S.gemaelde = gemaelde; S.funken = funken.funken;
  S.vorrat = { skala: VORSCHAU, fertig: null };
  // das scharfe, aufgefrischte Bild, in das das Gemälde am Ende übergeht: kommt etwas später nach (die Vorschau läuft schon)
  S.klar = null;
  const [mb, mh] = S.mass;
  S.klarBereit = versprechen.klar.then(({ nr: k, klar }) => {
    if (k !== S.rechnen || !klar) return;
    const c = leinwand(mb, mh);
    c.getContext("2d").putImageData(new ImageData(klar, mb, mh), 0, 0);
    S.klar = c;
    if (S.sz) S.sz.klar = c;
    if (S.optionen) S.optionen.klar = c;
  });
  const n = gemaelde.striche.length;
  $("auswertung").textContent = `${n.toLocaleString("de-CH")} Pinselstriche · ${funken.funken.length ? `${funken.funken.length.toLocaleString("de-CH")} Glitzerpunkte` : "kein Glitzer gefunden"} · ${Math.round(performance.now() - t0)} ms`;
  await neu();
  melden("Bereit. Die Vorschau läuft; «Video erstellen» rechnet das MP4.");
}

function optionen() {
  return { breite: S.mass[0], hoehe: S.mass[1], malen: Number($("malen").value), glitzer: S.glitzer, farbe: S.farbe, foto: S.foto, klar: S.klar, text: $("satz").value.replace(/\s+/g, " ").trim(),
    schrift: $("schrift").value, streckung: 1.15, messen, leinwand };
}

async function neu({ abspielen = !ruhig, weiter = false } = {}) {
  if (!S.gemaelde) return;
  await schriften;
  S.optionen = { ...optionen(), skala: VORSCHAU, vorrat: S.vorrat };
  S.sz = szene(S.gemaelde, S.funken, S.optionen);
  // Vorschau im Format des Films, in halber Auflösung (das Video rechnet in voller)
  const vb = Math.round(S.mass[0] * VORSCHAU), vh = Math.round(S.mass[1] * VORSCHAU);
  if (vorschau.width !== vb || vorschau.height !== vh) { vorschau.width = vb; vorschau.height = vh; }
  vctx.setTransform(VORSCHAU, 0, 0, VORSCHAU, 0, 0);
  vorschau.parentElement.style.aspectRatio = `${S.mass[0]} / ${S.mass[1]}`;
  $("dauer").textContent = `${S.sz.zeit.dauer.toFixed(1).replace(".", ",")} s · ${S.mass[0]} × ${S.mass[1]} · ${FPS} Bilder/s`;
  for (const k of ["video", "png", "spielen"]) $(k).disabled = false;
  $("leer").hidden = true;
  // weiter: läuft die Vorschau, läuft sie mit der neuen Szene an derselben Stelle weiter (Glitzer, Grund)
  if (weiter && S.laeuft) return;
  if (abspielen) spielen(); else { anhalten(); bild(vctx, S.sz, S.sz.zeit.ab.stehen[0] + 0.5); }
}

// ——— Einstellungen ———
function wahl(attr, schluessel, werte, wenn) {
  const knoepfe = [...document.querySelectorAll(`[${attr}]`)];
  const zeigen = () => knoepfe.forEach((b) => b.setAttribute("aria-pressed", String(b.getAttribute(attr) === String(S[schluessel]))));
  const alt = erinnern(schluessel);
  if (alt !== null && werte.includes(alt)) S[schluessel] = isNaN(Number(alt)) ? alt : Number(alt);
  zeigen();
  for (const b of knoepfe) b.addEventListener("click", () => {
    const v = b.getAttribute(attr);
    S[schluessel] = isNaN(Number(v)) ? v : Number(v);
    merken(schluessel, v); zeigen(); wenn();
  });
  return knoepfe;
}
// Pinsel und Format rechnen das Bild neu: erst, wenn nicht gleich noch einmal umgestellt wird
let umstellen = 0;
const spaeterLesen = () => { clearTimeout(umstellen); umstellen = setTimeout(lesen, 250); };
const pinselKnoepfe = wahl("data-pinsel", "pinsel", ["0.7", "1", "1.35"], spaeterLesen);
const glitzerKnoepfe = wahl("data-glitzer", "glitzer", ["0", "1", "1.7"], () => neu({ abspielen: false, weiter: true }));
const farbKnoepfe = wahl("data-farbe", "farbe", ["hell", "dunkel"], () => { rahmenFarbe(); neu({ weiter: true }); });
const formatKnoepfe = wahl("data-format", "format", ["bild", "3:4", "1:1"], spaeterLesen);
function rahmenFarbe() { vorschau.parentElement.classList.toggle("dunkel", S.farbe === "dunkel"); if (!S.sz) { vctx.fillStyle = S.farbe === "dunkel" ? "#0e1430" : "#f7f3ec"; vctx.fillRect(0, 0, vorschau.width, vorschau.height); } }
rahmenFarbe();
let warten = 0;
$("satz").addEventListener("input", () => { clearTimeout(warten); warten = setTimeout(() => neu(), 450); });
for (const id of ["malen", "schrift"]) $(id).addEventListener("change", () => { merken(id, $(id).value); neu(); });
for (const id of ["malen", "schrift"]) { const v = erinnern(id); if (v && [...$(id).options].some((o) => o.value === v)) $(id).value = v; }

// ——— Vorschau ———
// ausserhalb des Bildschirms (etwa beim Umstellen unten auf dem Handy) hält die Vorschau an, statt im Verborgenen weiterzurechnen
let sichtbar = true, zuletzt = 0;
if ("IntersectionObserver" in window) new IntersectionObserver(([e]) => { sichtbar = e.isIntersecting; }).observe(vorschau);
function spielen() { if (!S.sz) return; S.start = performance.now(); zuletzt = 0; if (!S.laeuft) { S.laeuft = true; requestAnimationFrame(takt); } $("spielen").textContent = "Anhalten"; }
function anhalten() { S.laeuft = false; $("spielen").textContent = "Abspielen"; }
function takt(jetzt) {
  if (!S.laeuft || !S.sz) return;
  if (!sichtbar) { S.start += jetzt - (zuletzt || jetzt); zuletzt = jetzt; requestAnimationFrame(takt); return; }
  zuletzt = jetzt;
  const t = (jetzt - S.start) / 1000;
  if (t >= S.sz.zeit.dauer) { anhalten(); bild(vctx, S.sz, S.sz.zeit.ab.stehen[0] + 0.5); return; }
  bild(vctx, S.sz, t);
  requestAnimationFrame(takt);
}
$("spielen").addEventListener("click", () => (S.laeuft ? anhalten() : spielen()));

// ——— Standbild ———
$("png").addEventListener("click", async () => {
  if (!S.gemaelde) return;
  await S.klarBereit;
  const c = leinwand(S.mass[0], S.mass[1]);
  standbild(c.getContext("2d"), szene(S.gemaelde, S.funken, optionen()));
  const blob = c.convertToBlob ? await c.convertToBlob({ type: "image/png" }) : await new Promise((ok) => c.toBlob(ok, "image/png"));
  herunterladen(blob, dateiname(new Date(), "png"));
});
function herunterladen(blob, name) {
  const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = name;
  document.body.append(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 60_000);
}

// ——— Video ———
const CODECS = ["avc1.640028", "avc1.4d0028", "avc1.42e028", "avc1.640032", "avc1.42e032"];
async function webcodecs([B, H]) {
  if (typeof VideoEncoder === "undefined" || typeof VideoFrame === "undefined") return null;
  for (const codec of CODECS) {
    const cfg = { codec, width: B, height: H, bitrate: 10_000_000, framerate: FPS, avc: { format: "avc" }, latencyMode: "quality" };
    try { if ((await VideoEncoder.isConfigSupported(cfg)).supported) return cfg; } catch { /* nächster */ }
  }
  return null;
}
$("video").addEventListener("click", async () => {
  if (!S.gemaelde) return;
  anhalten(); sperren(true);
  await S.klarBereit;
  const fort = $("fortschritt"); fort.hidden = false; fort.value = 0;
  const sz = szene(S.gemaelde, S.funken, optionen());
  const t0 = performance.now();
  try {
    const cfg = await webcodecs([sz.breite, sz.hoehe]);
    const erg = cfg ? await mitWebCodecs(cfg, sz) : await mitRecorder(sz);
    zeigen(erg, sz, performance.now() - t0);
  } catch (fehler) {
    melden(`Das Video liess sich nicht erstellen: ${fehler?.message ?? fehler}`, true);
  } finally { sperren(false); fort.hidden = true; }
});

async function mitWebCodecs(cfg, sz) {
  melden("Video wird gerechnet …");
  const c = leinwand(sz.breite, sz.hoehe), ctx = c.getContext("2d", { alpha: false });
  const proben = [];
  let avcC = null, fehler = null;
  const enc = new VideoEncoder({
    output: (chunk, meta) => {
      if (meta?.decoderConfig?.description && !avcC) { const d = meta.decoderConfig.description; avcC = new Uint8Array(d.buffer ? d.buffer.slice(d.byteOffset, d.byteOffset + d.byteLength) : d); }
      const daten = new Uint8Array(chunk.byteLength); chunk.copyTo(daten);
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
    if (i % 10 === 0) { $("fortschritt").value = i / n; await new Promise((ok) => setTimeout(ok, 0)); }
  }
  await enc.flush(); enc.close();
  if (fehler) throw fehler;
  if (!avcC) throw new Error("der Encoder hat keine Beschreibung geliefert");
  return { blob: new Blob([mp4({ breite: sz.breite, hoehe: sz.hoehe, fps: FPS, avcC, proben })], { type: "video/mp4" }), endung: "mp4", art: `MP4 (H.264, ${cfg.codec})` };
}

async function mitRecorder(sz) {
  const typen = [["video/mp4;codecs=avc1.42E01E", "mp4"], ["video/mp4", "mp4"], ["video/webm;codecs=vp9", "webm"], ["video/webm;codecs=vp8", "webm"], ["video/webm", "webm"]];
  const typ = typeof MediaRecorder !== "undefined" && typen.find(([m]) => MediaRecorder.isTypeSupported(m));
  if (!typ) throw new Error("dieser Browser kann keine Videos erzeugen (weder WebCodecs noch MediaRecorder)");
  melden(`Video wird in Echtzeit aufgenommen (${sz.zeit.dauer.toFixed(0)} s). Lass diese Seite sichtbar.`);
  const c = document.createElement("canvas"); c.width = sz.breite; c.height = sz.hoehe;
  const ctx = c.getContext("2d", { alpha: false });
  const strom = c.captureStream(0), spur = strom.getVideoTracks()[0];
  const rec = new MediaRecorder(strom, { mimeType: typ[0], videoBitsPerSecond: 10_000_000 });
  const stuecke = [];
  rec.ondataavailable = (e) => { if (e.data.size) stuecke.push(e.data); };
  const fertig = new Promise((ok) => { rec.onstop = ok; });
  bild(ctx, sz, 0); rec.start(1000);
  const t0 = performance.now(), n = sz.zeit.bilder;
  for (let i = 0; i < n; i++) {
    bild(ctx, sz, i / FPS); spur.requestFrame?.(); $("fortschritt").value = i / n;
    await new Promise((ok) => setTimeout(ok, Math.max(0, t0 + ((i + 1) * 1000) / FPS - performance.now())));
  }
  const sekunden = (performance.now() - t0) / 1000;
  rec.stop(); await fertig;
  const roh = new Uint8Array(await new Blob(stuecke).arrayBuffer());
  return { blob: new Blob([mitDauer(roh, sekunden)], { type: typ[0].split(";")[0] }), endung: typ[1], art: typ[0] };
}

function zeigen({ blob, endung, art }, sz, ms) {
  if (S.film) URL.revokeObjectURL(S.film);
  S.film = URL.createObjectURL(blob);
  $("film").src = S.film;
  $("laden").href = S.film; $("laden").download = dateiname(new Date(), endung);
  $("film-info").textContent = `${sz.breite} × ${sz.hoehe} · ${sz.zeit.dauer.toFixed(1).replace(".", ",")} s · ${(blob.size / 1e6).toFixed(1).replace(".", ",")} MB · ${art} · gerechnet in ${(ms / 1000).toFixed(1).replace(".", ",")} s`;
  $("ergebnis").hidden = false;
  melden("Fertig. Prüfe das Video und lade es herunter.");
  $("ergebnis").scrollIntoView({ behavior: ruhig ? "auto" : "smooth", block: "nearest" });
}

function sperren(an) {
  for (const el of [$("datei"), ...document.querySelectorAll("[data-beispiel]"), ...pinselKnoepfe, ...formatKnoepfe, $("video"), $("png")])
    el.disabled = an || ((el.id === "video" || el.id === "png") && !S.gemaelde);
}
void SCHRIFTEN; void glitzerKnoepfe; void farbKnoepfe;
