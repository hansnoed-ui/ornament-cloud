// «Bildfragmentieren» – Seite: Foto laden, zerlegen (Worker), Vorschau mit Zeitleiste, Video (MP4) und Standbild (PNG).
// Alles bleibt im Browser. Video wie in Sketchory: WebCodecs (H.264) und der MP4-Schreiber von Sketchory;
// ohne WebCodecs in Echtzeit über MediaRecorder (die Länge trägt dauer.js von The Fictory nach).
import { FPS, dateiname, filmMass, zeitcode, FORMATE, ABLAEUFE, ablaufName, effekte, VERWANDLUNG } from "./ablauf.js?v=34";
import { szene, bild, standbildZeit, vorbereiten, FARBEN } from "./szene.js?v=34";
import { zerlegen } from "./fragmente.js?v=34";
import { mp4 } from "../sketchory/mp4.js?v=10";
import { mitDauer } from "../the-fictory/dauer.js?v=32";

const $ = (id) => document.getElementById(id);
// Sprache (sprache.js, vor den Modulen): T(deutsch, …) gibt auf Englisch die Übersetzung, sonst den deutschen Text
const T = (s, ...a) => (window.sprache ? window.sprache.t(s, ...a) : s);
const vorschau = $("vorschau"), vctx = vorschau.getContext("2d");
const ruhig = matchMedia("(prefers-reduced-motion: reduce)").matches;
// Auflösung der Vorschau gegenüber dem Film (das Video rechnet in voller Grösse): nach der Schärfe des Bildschirms, mindestens die halbe, höchstens 0,85
// (Rückmeldung vom 15. Oktober 2026: am Handy wirkte die Vorschau in halber Auflösung grob)
let VORSCHAU = 0.5;
const vorschauMass = () => { const b = vorschau.parentElement.getBoundingClientRect().width || 400; return Math.round(Math.min(0.85, Math.max(0.5, (b * (window.devicePixelRatio || 1)) / S.mass[0])) * 20) / 20; };
const S = { bild: null, daten: null, foto: null, vorrat: {}, sz: null, laeuft: false, start: 0, t: null, film: null, rechnen: 0,
  format: "4:5", feinheit: "mittel", grund: "schwarz", mass: [1080, 1350], ablauf: "fragmente", raum: null, raumSchluessel: "" };
window.__bildfragmentieren = S;   // für die Browser-Tests

const leinwand = (w, h) => { if (typeof OffscreenCanvas !== "undefined") return new OffscreenCanvas(w, h); const c = document.createElement("canvas"); c.width = w; c.height = h; return c; };
const merken = (k, v) => { try { localStorage.setItem(`bildfragmentieren.${k}`, v); } catch { /* egal */ } };
const erinnern = (k) => { try { return localStorage.getItem(`bildfragmentieren.${k}`); } catch { return null; } };
function melden(text, fehler = false) { const m = $("meldung"); m.textContent = text; m.classList.toggle("fehler", fehler); }

// ——— Foto laden ———
async function bitmap(datei) {
  try { return await createImageBitmap(datei, { imageOrientation: "from-image" }); }
  catch { return await new Promise((ok, nein) => { const i = new Image(); i.onload = () => ok(i); i.onerror = nein; i.src = URL.createObjectURL(datei); }); }
}
/** Foto füllend und mittig auf w × h zuschneiden */
function zugeschnitten(quelle, w, h) {
  const c = leinwand(w, h), ctx = c.getContext("2d", { willReadFrequently: true });
  const s = Math.max(w / quelle.width, h / quelle.height), dw = quelle.width * s, dh = quelle.height * s;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(quelle, (w - dw) / 2, (h - dh) / 2, dw, dh);
  return c;
}

const ablage = $("ablage");
for (const art of ["dragenter", "dragover"]) ablage.addEventListener(art, (e) => { e.preventDefault(); ablage.classList.add("drueber"); });
for (const art of ["dragleave", "drop"]) ablage.addEventListener(art, () => ablage.classList.remove("drueber"));
ablage.addEventListener("drop", (e) => {
  e.preventDefault();
  const datei = [...(e.dataTransfer?.files ?? [])].find((f) => f.type.startsWith("image/"));
  if (datei) fotoLaden(datei); else melden(T("Das ist kein Bild. Bitte ein Foto (JPG, PNG, HEIC je nach Browser) verwenden."), true);
});
$("datei").addEventListener("change", (e) => { if (e.target.files?.[0]) fotoLaden(e.target.files[0]); });
// das Beispielbild (seit dem 15. Oktober 2026 ein eigenes Bild statt eines im Browser gezeichneten Testbilds)
$("testbild").addEventListener("click", async () => fotoLaden(new File([await (await fetch("beispiel.jpg")).blob()], "beispiel.jpg", { type: "image/jpeg" })));

async function fotoLaden(datei) {
  melden(T("Foto wird gelesen …"));
  let q;
  try { q = await bitmap(datei); } catch { melden(T("Dieses Foto kann der Browser nicht öffnen. Versuche es als JPG oder PNG."), true); return; }
  S.bild = q;
  anhalten(); S.sz = null; S.t = null;
  $("quelle").src = URL.createObjectURL(datei); $("quelle").hidden = false;
  ablage.classList.add("hat-bild"); $("ablage-titel").dataset.t = "Anderes Foto wählen"; $("ablage-titel").textContent = T("Anderes Foto wählen");
  await lesen();
}

// ——— zerlegen (Worker, sonst hier) ———
let worker = null, offen = null;
const neuerWorker = () => { try { return new Worker(new URL("./rechner.js?v=34", import.meta.url), { type: "module" }); } catch { return null; } };
worker = neuerWorker();
function rechnen() {
  // zerlegt wird auf der halben Filmgrösse (für Kanten und Mosaik genug), das Foto für den Schluss bleibt in voller Grösse
  const [B, H] = (S.mass = filmMass(S.format));
  S.foto = zugeschnitten(S.bild, B, H);
  S.vorrat = {};
  const w = Math.round(B / 2), h = Math.round(H / 2);
  const daten = zugeschnitten(S.bild, w, h).getContext("2d").getImageData(0, 0, w, h).data;
  const nr = ++S.rechnen, auftrag = { nr, daten, w, h, massstab: B / w, feinheit: S.feinheit };
  if (!worker) return new Promise((ok) => setTimeout(() => ok({ nr, ergebnis: zerlegen(daten, w, h, auftrag) }), 0));
  // rechnet der Worker noch an einem älteren Auftrag, wird er ersetzt statt abgewartet
  if (offen) { worker.terminate(); worker = neuerWorker(); offen({ nr: -1 }); offen = null; if (!worker) return rechnen(); }
  return new Promise((ok) => {
    offen = ok;
    worker.onmessage = (e) => { if (e.data.nr !== nr) return; offen = null; ok(e.data); };
    worker.onerror = (e) => { offen = null; ok({ nr, fehler: e.message || "der Worker ist ausgefallen" }); };
    worker.postMessage(auftrag, [daten.buffer]);
  });
}

async function lesen() {
  if (!S.bild) return;
  melden(T("Das Foto wird zerlegt …"));
  sperren(true);
  const t0 = performance.now();
  const { nr, ergebnis, fehler } = await rechnen();
  if (nr !== S.rechnen) return;
  sperren(false);
  if (fehler || !ergebnis) { melden(`${T("Das Foto liess sich nicht zerlegen:")} ${fehler}`, true); return; }
  S.daten = ergebnis;
  S.auswertung = { ergebnis, ms: Math.round(performance.now() - t0) }; auswertungZeigen();
  neu();
  melden(T("Bereit. Die Vorschau läuft; «Video erstellen» rechnet das MP4."));
}

function auswertungZeigen() {
  if (!S.auswertung) return;
  const { ergebnis, ms } = S.auswertung, z = (n) => n.toLocaleString(window.sprache?.en() ? "en-GB" : "de-CH");
  $("auswertung").textContent = `${z(ergebnis.zeilen.reihen)} ${T("Zeilen")} · ${z(ergebnis.kanten.length)} ${T("Kanten")} · ${z(ergebnis.dreiecke.n)} ${T("Dreiecke")} · ${ms} ms`;
}
const komma = (x) => (window.sprache?.en() ? x : x.replace(".", ","));   // Dezimalzeichen nach Sprache

function optionen() {
  return { breite: S.mass[0], hoehe: S.mass[1], tempo: $("tempo").value, grund: S.grund, signet: $("signet").checked, beschriftung: $("beschriftung").checked,
    titel: $("titel").value.replace(/\s+/g, " ").trim(), foto: S.foto, leinwand, vorrat: S.vorrat, ablauf: S.ablauf, raum: S.raum };
}

// ——— Verwandlung und Relief-Flug (WebGL): raum.js und three.js erst laden, wenn einer davon gewählt ist ———
let raumModul = null;
async function raumBereit() {
  const art = S.ablauf !== "fragmente" ? S.ablauf : null;
  const schluessel = art && S.foto ? `${S.rechnen}|${S.grund}|${art}` : "";
  if (schluessel === S.raumSchluessel) return;
  S.raumSchluessel = schluessel;
  if (S.sz) S.sz.raum = null;                              // die laufende Vorschau zeigt bis dahin das Foto
  S.raum?.entsorgen(); S.raum = null;
  if (!schluessel) return;
  try {
    raumModul ??= await import("./raum.js?v=34");
    if (S.raumSchluessel !== schluessel) return;
    const F = FARBEN[S.grund] ?? FARBEN.schwarz;
    S.raum = raumModul.raum(S.foto, art, { grund: F.grund, akzent: F.punkt });
  } catch (fehler) {
    melden(`${T("Verwandlung und Relief-Flug brauchen WebGL 2; hier blendet an ihrer Stelle das Foto auf")} (${fehler?.message ?? fehler}).`, true);
    return;
  }
  neu();
}

function dauerZeigen() { if (S.sz) $("dauer").textContent = `${komma(S.sz.zeit.dauer.toFixed(1))} s · ${S.mass[0]} × ${S.mass[1]} · ${FPS} ${T("Bilder/s")}`; }

/** Sprungknöpfe: eine je Phase des Ablaufs (die vier von «Fragmente» behalten ihre Kennungen); die letzte springt zum fertigen Foto */
const KENNUNG = { linien: "zu-linien", formen: "zu-formen", farben: "zu-farben", zusammen: "zu-bild" };
function sprungziel(sz, name) {
  const { ab, phasen } = sz.zeit, ph = phasen.find((p) => p.name === name);
  if (name === "linien") return ab.linien[0] + 2.4;
  if (ph === phasen.at(-1)) return ab.stehen[0] + 0.8;
  return ph.von + (ph.bis - ph.von) * (sz.zeit.fragmente ? 0.75 : 0.6);
}
function sprungknoepfe(sz) {
  const leiste = document.querySelector(".phasen"), namen = sz.zeit.phasen.map((p) => p.name).join(",");
  if (leiste.dataset.namen === namen) return;
  leiste.dataset.namen = namen;
  leiste.replaceChildren(...sz.zeit.phasen.map((p, i) => {
    const b = document.createElement("button");
    b.type = "button"; b.id = KENNUNG[p.name] ?? `zu-${p.name}`; b.dataset.phase = p.name;
    b.textContent = `${String(i + 1).padStart(2, "0")} ${T(p.titel)}`;
    return b;
  }));
}
document.querySelector(".phasen").addEventListener("click", (e) => {
  const b = e.target.closest("button"); if (!b || !S.sz) return;
  anhalten(); zeigeZeit(sprungziel(S.sz, b.dataset.phase ?? { "zu-linien": "linien", "zu-formen": "formen", "zu-farben": "farben", "zu-bild": "zusammen" }[b.id]));
});

function neu({ abspielen = !ruhig } = {}) {
  if (!S.daten) return;
  raumBereit();
  const alt = S.sz ? S.t : null;
  S.sz = szene(S.daten, optionen());
  sprungknoepfe(S.sz);
  const sz = S.sz, spaeter = window.requestIdleCallback ?? ((f) => setTimeout(f, 200));
  spaeter(() => { if (S.sz === sz) vorbereiten(sz); });
  // Vorschau im Format des Films, in der Auflösung des Bildschirms (höchstens 0,85 des Films)
  VORSCHAU = vorschauMass();
  const vb = Math.round(S.mass[0] * VORSCHAU), vh = Math.round(S.mass[1] * VORSCHAU);
  if (vorschau.width !== vb || vorschau.height !== vh) { vorschau.width = vb; vorschau.height = vh; }
  vctx.setTransform(VORSCHAU, 0, 0, VORSCHAU, 0, 0);
  vorschau.parentElement.style.aspectRatio = `${S.mass[0]} / ${S.mass[1]}`;
  vorschau.parentElement.style.setProperty("--seiten", String(S.mass[0] / S.mass[1]));
  dauerZeigen();
  $("zeit").max = String(S.sz.zeit.dauer); $("zeit").disabled = false;
  for (const k of ["video", "png", "spielen"]) $(k).disabled = false;
  $("leer").hidden = true;
  if (S.laeuft) return;                                   // läuft die Vorschau, läuft sie mit der neuen Szene weiter
  if (abspielen && alt === null) spielen();
  else zeigeZeit(Math.min(alt ?? standbildZeit(S.sz), S.sz.zeit.dauer - 1 / FPS));   // die Kette kann kürzer geworden sein
}

// ——— Einstellungen ———
function wahl(attr, schluessel, werte, wenn) {
  const knoepfe = [...document.querySelectorAll(`[${attr}]`)];
  const zeigen = () => knoepfe.forEach((b) => b.setAttribute("aria-pressed", String(b.getAttribute(attr) === String(S[schluessel]))));
  const alt = erinnern(schluessel);
  if (alt !== null && werte.includes(alt)) S[schluessel] = alt;
  zeigen();
  for (const b of knoepfe) b.addEventListener("click", () => { S[schluessel] = b.getAttribute(attr); merken(schluessel, S[schluessel]); zeigen(); wenn(); });
  return knoepfe;
}
// Format und Feinheit zerlegen das Foto neu: erst, wenn nicht gleich noch einmal umgestellt wird
let umstellen = 0;
const spaeterLesen = () => { clearTimeout(umstellen); umstellen = setTimeout(lesen, 250); };
const formatKnoepfe = wahl("data-format", "format", FORMATE, spaeterLesen);
const feinKnoepfe = wahl("data-feinheit", "feinheit", ["grob", "mittel", "fein"], spaeterLesen);
wahl("data-grund", "grund", ["schwarz", "weiss"], () => { rahmenFarbe(); neu(); });
function rahmenFarbe() { vorschau.parentElement.classList.toggle("weiss", S.grund === "weiss"); if (!S.sz) { vctx.fillStyle = S.grund === "weiss" ? "#fff" : "#000"; vctx.fillRect(0, 0, vorschau.width, vorschau.height); } }
rahmenFarbe();
for (const id of ["tempo"]) { const v = erinnern(id); if (v && [...$(id).options].some((o) => o.value === v)) $(id).value = v; $(id).addEventListener("change", () => { merken(id, $(id).value); neu(); }); }
for (const id of ["signet", "beschriftung"]) { const v = erinnern(id); if (v !== null) $(id).checked = v === "1"; $(id).addEventListener("change", () => { merken(id, $(id).checked ? "1" : "0"); neu(); }); }
// Ablauf: «Fragmente», die Verwandlung oder der Relief-Flug – bei der Verwandlung wählt die Karte alle Effekte, die Schalter einzelne oder eine
// eigene Kombination (Wunsch vom 17. Oktober 2026); in fester Reihenfolge, Wahl gespeichert
const ablaufKnoepfe = [...document.querySelectorAll("[data-ablauf]")], effektKnoepfe = [...document.querySelectorAll("[data-effekt]")];
S.ablauf = ablaufName(erinnern("ablauf"));
const ablaufZeigen = () => {
  const gewaehlt = effekte(S.ablauf);
  const karte = S.ablauf === "fragmente" || S.ablauf === "flug" ? S.ablauf : "verwandlung";
  ablaufKnoepfe.forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.ablauf === karte)));
  effektKnoepfe.forEach((b) => b.setAttribute("aria-pressed", String(karte === "verwandlung" && gewaehlt.includes(b.dataset.effekt))));
  $("kette").textContent = karte === "verwandlung" ? gewaehlt.map((e) => T(ABLAEUFE[e].titel)).join(" → ") : "";
};
ablaufZeigen();
const ablaufSetzen = (a) => { a = ablaufName(a); if (a === S.ablauf) return; S.ablauf = a; merken("ablauf", a); ablaufZeigen(); neu(); };
for (const b of ablaufKnoepfe) b.addEventListener("click", () => ablaufSetzen(b.dataset.ablauf === "verwandlung" ? VERWANDLUNG : b.dataset.ablauf));
for (const b of effektKnoepfe) b.addEventListener("click", () => {
  const e = b.dataset.effekt, gewaehlt = S.ablauf === "flug" ? [] : effekte(S.ablauf);
  if (!gewaehlt.length) return ablaufSetzen(e);                          // nach «Fragmente» oder dem Relief-Flug: dieser Effekt allein
  const liste = gewaehlt.includes(e) ? gewaehlt.filter((x) => x !== e) : [...gewaehlt, e];
  if (liste.length) ablaufSetzen(liste.join("+"));                        // einer bleibt immer
});
let tippen = 0;
$("titel").addEventListener("input", () => { clearTimeout(tippen); tippen = setTimeout(() => neu(), 300); });

// ——— Vorschau und Zeitleiste ———
// ausserhalb des Bildschirms hält die Vorschau an, statt im Verborgenen weiterzurechnen
let sichtbar = true, zuletzt = 0;
if ("IntersectionObserver" in window) new IntersectionObserver(([e]) => { sichtbar = e.isIntersecting; }).observe(vorschau);
function spielen() {
  if (!S.sz) return;
  // nach dem Ende beginnt «Abspielen» wieder von vorn, sonst an der Stelle der Zeitleiste
  const ab = !S.ende && S.t !== null && S.t < S.sz.zeit.dauer - 0.1 ? S.t : 0;
  S.ende = false;
  S.start = performance.now() - ab * 1000; zuletzt = 0;
  if (!S.laeuft) { S.laeuft = true; requestAnimationFrame(takt); }
  $("spielen").dataset.t = "Anhalten"; $("spielen").textContent = T("Anhalten");
}
function anhalten() { S.laeuft = false; $("spielen").dataset.t = "Abspielen"; $("spielen").textContent = T("Abspielen"); }
function zeigeZeit(t) {
  S.t = t; S.ende = false; bild(vctx, S.sz, t);
  $("zeit").value = String(t); $("zeitcode").textContent = zeitcode(t);
}
function takt(jetzt) {
  if (!S.laeuft || !S.sz) return;
  if (!sichtbar) { S.start += jetzt - (zuletzt || jetzt); zuletzt = jetzt; requestAnimationFrame(takt); return; }
  zuletzt = jetzt;
  const t = (jetzt - S.start) / 1000;
  // am Ende bleibt die Vorschau auf dem letzten Bild stehen, der Regler ganz rechts (Rückmeldung vom 15. Oktober 2026: sie sprang zurück ins Bild)
  if (t >= S.sz.zeit.dauer) { anhalten(); zeigeZeit(S.sz.zeit.dauer - 1 / FPS); S.ende = true; return; }
  zeigeZeit(t);
  requestAnimationFrame(takt);
}
$("spielen").addEventListener("click", () => (S.laeuft ? anhalten() : spielen()));
$("zeit").addEventListener("input", () => { if (!S.sz) return; anhalten(); zeigeZeit(Number($("zeit").value)); });

// ——— Standbild: das Bild an der Stelle der Zeitleiste, in voller Grösse ———
$("png").addEventListener("click", async () => {
  if (!S.sz) return;
  const c = leinwand(S.mass[0], S.mass[1]);
  bild(c.getContext("2d"), szene(S.daten, optionen()), Math.min(S.t ?? standbildZeit(S.sz), S.sz.zeit.dauer));
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
    const cfg = { codec, width: B, height: H, bitrate: 12_000_000, framerate: FPS, avc: { format: "avc" }, latencyMode: "quality" };
    try { if ((await VideoEncoder.isConfigSupported(cfg)).supported) return cfg; } catch { /* nächster */ }
  }
  return null;
}
$("video").addEventListener("click", async () => {
  if (!S.sz) return;
  anhalten(); sperren(true);
  const fort = $("fortschritt"); fort.hidden = false; fort.value = 0;
  const sz = szene(S.daten, optionen());
  const t0 = performance.now();
  try {
    const cfg = await webcodecs([sz.breite, sz.hoehe]);
    const erg = cfg ? await mitWebCodecs(cfg, sz) : await mitRecorder(sz);
    zeigen(erg, sz, performance.now() - t0);
  } catch (fehler) {
    melden(`${T("Das Video liess sich nicht erstellen:")} ${fehler?.message ?? fehler}`, true);
  } finally { sperren(false); fort.hidden = true; }
});

async function mitWebCodecs(cfg, sz) {
  melden(T("Video wird gerechnet …"));
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
  if (!avcC) throw new Error(T("der Encoder hat keine Beschreibung geliefert"));
  return { blob: new Blob([mp4({ breite: sz.breite, hoehe: sz.hoehe, fps: FPS, avcC, proben })], { type: "video/mp4" }), endung: "mp4", art: `MP4 (H.264, ${cfg.codec})` };
}

async function mitRecorder(sz) {
  const typen = [["video/mp4;codecs=avc1.42E01E", "mp4"], ["video/mp4", "mp4"], ["video/webm;codecs=vp9", "webm"], ["video/webm;codecs=vp8", "webm"], ["video/webm", "webm"]];
  const typ = typeof MediaRecorder !== "undefined" && typen.find(([m]) => MediaRecorder.isTypeSupported(m));
  if (!typ) throw new Error(T("dieser Browser kann keine Videos erzeugen (weder WebCodecs noch MediaRecorder)"));
  melden(T("aufnahme", sz.zeit.dauer.toFixed(0)));
  const c = document.createElement("canvas"); c.width = sz.breite; c.height = sz.hoehe;
  const ctx = c.getContext("2d", { alpha: false });
  const strom = c.captureStream(0), spur = strom.getVideoTracks()[0];
  const rec = new MediaRecorder(strom, { mimeType: typ[0], videoBitsPerSecond: 12_000_000 });
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
  $("film").style.aspectRatio = `${sz.breite} / ${sz.hoehe}`;
  $("laden").href = S.film; $("laden").download = dateiname(new Date(), endung);
  S.filmInfo = { sz, blob, art, ms }; filmInfoZeigen();
  $("ergebnis").hidden = false;
  melden(T("Fertig. Prüfe das Video und lade es herunter."));
  $("ergebnis").scrollIntoView({ behavior: ruhig ? "auto" : "smooth", block: "nearest" });
}

function filmInfoZeigen() {
  if (!S.filmInfo) return;
  const { sz, blob, art, ms } = S.filmInfo;
  $("film-info").textContent = `${sz.breite} × ${sz.hoehe} · ${komma(sz.zeit.dauer.toFixed(1))} s · ${komma((blob.size / 1e6).toFixed(1))} MB · ${art} · ${T("gerechnet in")} ${komma((ms / 1000).toFixed(1))} s`;
}
// Wechsel der Sprache (sprache.js): alles, was das Skript geschrieben hat, in der anderen Sprache neu
document.addEventListener("sprache", () => {
  const leiste = document.querySelector(".phasen"); leiste.dataset.namen = ""; if (S.sz) sprungknoepfe(S.sz);
  ablaufZeigen(); dauerZeigen(); auswertungZeigen(); filmInfoZeigen();
});

function sperren(an) {
  for (const el of [$("datei"), $("testbild"), ...formatKnoepfe, ...feinKnoepfe, ...ablaufKnoepfe, ...effektKnoepfe, $("video"), $("png")])
    el.disabled = an || ((el.id === "video" || el.id === "png") && !S.daten);
}
