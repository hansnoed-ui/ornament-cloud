// PHORMA II – Seite: Foto laden, analysieren (Worker), Bühne (WebGL), Vorschau mit Zeitleiste, Video (MP4) und Standbild (PNG).
// Alles bleibt im Browser. Video wie in PHORMA I: WebCodecs (H.264) und der MP4-Schreiber von Sketchory; ohne WebCodecs in Echtzeit über
// MediaRecorder. Mit Bewegungsunschärfe rechnet jedes Bild des Videos acht Proben (Verschluss 180°).
import { FPS, dateiname, filmMass, zeitcode, FORMATE, TITEL, KETTE, ablaufName, effekte } from "./ablauf.js?v=8";
import { szene, bild, standbildZeit } from "./film.js?v=8";
import { analysieren, tiefeNormieren } from "./analyse.js?v=8";
import { mp4 } from "../sketchory/mp4.js?v=10";
import { mitDauer } from "../the-fictory/dauer.js?v=32";

const $ = (id) => document.getElementById(id);
const vorschau = $("vorschau"), vctx = vorschau.getContext("2d");
const ruhig = matchMedia("(prefers-reduced-motion: reduce)").matches;
const grob = matchMedia("(pointer: coarse)").matches, test = new URLSearchParams(location.search).has("test");
const PROBEN = 8;
let VORSCHAU = 0.5;
const S = { bild: null, A: null, foto: null, sz: null, laeuft: false, start: 0, t: null, film: null, rechnen: 0, buehne: null, buehneSchluessel: "",
  format: "4:5", muster: "mittel", tiefe: "bild", mass: [1080, 1350], ablauf: KETTE, ki: null };
window.__phorma = S;   // für die Browser-Tests
// ?diagnose: Messwerte zum Gerät sichtbar unter der Vorschau (Rückmeldung vom 17. Oktober 2026: auf einem Telefon «reagiert nicht», hier nicht
// nachzustellen) – Zeitpunkte der Schritte, Dauer je Vorschaubild, längste Blockade, Grafikchip und Erweiterungen; als Bildschirmfoto zurückschicken
const DIAGNOSE = new URLSearchParams(location.search).has("diagnose");
const D = { t0: performance.now(), notizen: [], bild: [], lang: 0 };
// Spur, die einen Absturz überlebt (Rückmeldung vom 17. Oktober 2026: Chrome bricht den Tab gleich nach dem Laden eines Fotos ab, «Oh nein!»): jeder
// Schritt sofort in localStorage; index.html zeigt beim nächsten Öffnen, nach welchem Schritt der letzte Lauf endete. «✓» heisst: ging gut.
const SPUR = "phorma-ii.spur";
function spur(text, neu = false) {
  try {
    const liste = neu ? [] : JSON.parse(localStorage.getItem(SPUR) || "[]");
    liste.push([Date.now(), text]);
    localStorage.setItem(SPUR, JSON.stringify(liste.slice(-40)));
  } catch { /* ohne Speicher keine Spur */ }
}
// brach der letzte Lauf in der KI-Tiefe ab, bleibt sie diesmal aus (sonst stürzt die Seite bei jedem Foto wieder ab)
let kiAbsturz = false;
try { const alt = JSON.parse(localStorage.getItem(SPUR) || "[]"), letzt = alt.at(-1)?.[1] ?? ""; kiAbsturz = /^(KI|Tiefe mit KI)/.test(letzt); if (kiAbsturz) localStorage.setItem("phorma-ii.tiefe", "bild"); } catch { /* egal */ }
spur(`Seite geöffnet · ${navigator.userAgent.replace(/^Mozilla\/5\.0 /, "").slice(0, 80)} · Speicher ${navigator.deviceMemory ?? "?"} GB · Pixel ${devicePixelRatio}`, true);
function notiz(text) {
  spur(text);
  if (!DIAGNOSE) return;
  D.notizen.push(`${((performance.now() - D.t0) / 1000).toFixed(1)} s  ${text}`);
  diagnoseZeigen();
}
function diagnoseZeigen() {
  if (!DIAGNOSE) return;
  let box = document.getElementById("diagnose");
  if (!box) { box = document.createElement("pre"); box.id = "diagnose"; box.className = "info diagnose"; document.querySelector(".buehne").append(box); }
  const mittel = D.bild.length ? D.bild.reduce((s, x) => s + x, 0) / D.bild.length : 0;
  const i = S.buehne?.infoGemerkt;
  box.textContent = [`PHORMA II · Diagnose · ${navigator.userAgent.replace(/^Mozilla\/5\.0 /, "").slice(0, 90)}`,
    `Pixel ${devicePixelRatio} · Telefon ${grob ? "ja" : "nein"} · Speicher ${navigator.deviceMemory ?? "?"} GB · Kerne ${navigator.hardwareConcurrency ?? "?"}`,
    i ? `Grafik ${i.grafik} · Float-Ziel ${i.floatZiel} · Float mischen ${i.floatMischen} · Float linear ${i.floatLinear} · parallel übersetzen ${i.parallel}` : "Grafik: noch keine Bühne",
    `Vorschaubild ${mittel.toFixed(0)} ms im Mittel (letzte ${D.bild.length}) · längste Blockade ${Math.round(D.lang)} ms`, ...D.notizen.slice(-12)].join("\n");
}
if (DIAGNOSE && "PerformanceObserver" in window) {
  try { new PerformanceObserver((l) => { for (const e of l.getEntries()) D.lang = Math.max(D.lang, e.duration); }).observe({ type: "longtask", buffered: true }); } catch { /* egal */ }
  setInterval(diagnoseZeigen, 1000);
}
// auf dem Telefon höchstens 0,6 der Filmgrösse: die Ziele der Bühne brauchen sonst sehr viel Grafikspeicher (Rückmeldung vom 17. Oktober 2026: «die App
// stürzt sofort ab»)
const vorschauMass = () => { const b = vorschau.parentElement.getBoundingClientRect().width || 400; return Math.round(Math.min(grob ? 0.6 : 0.85, Math.max(0.5, (b * (window.devicePixelRatio || 1)) / S.mass[0])) * 20) / 20; };

const leinwand = (w, h) => { const c = document.createElement("canvas"); c.width = w; c.height = h; return c; };
const merken = (k, v) => { try { localStorage.setItem(`phorma-ii.${k}`, v); } catch { /* egal */ } };
const erinnern = (k) => { try { return localStorage.getItem(`phorma-ii.${k}`); } catch { return null; } };
function melden(text, fehler = false) { const m = $("meldung"); m.textContent = text; m.classList.toggle("fehler", fehler); }

// ——— Foto laden ———
// Fotos aus Telefonkameras haben 12 bis 50 Megapixel (bis 200 MB als Bitmap): gleich beim Laden auf höchstens 2400 Punkte verkleinern und die volle
// Bitmap sofort freigeben; das Vorschaubildchen ist eine kleine Kopie, nicht das Original (Rückmeldung vom 17. Oktober 2026: «neues Bild laden,
// danach: Absturz»)
const GROESST = 2400;
async function bitmap(datei) {
  let q;
  try { q = await createImageBitmap(datei, { imageOrientation: "from-image" }); }
  catch { q = await new Promise((ok, nein) => { const i = new Image(); i.onload = () => ok(i); i.onerror = nein; i.src = URL.createObjectURL(datei); }); }
  const s = Math.min(1, GROESST / Math.max(q.width, q.height));
  const c = leinwand(Math.max(1, Math.round(q.width * s)), Math.max(1, Math.round(q.height * s))), x = c.getContext("2d");
  x.imageSmoothingQuality = "high"; x.drawImage(q, 0, 0, c.width, c.height);
  if (q.close) q.close(); else if (q.src?.startsWith("blob:")) URL.revokeObjectURL(q.src);
  return c;
}
function bildchen(quelle) {
  const s = 240 / Math.max(quelle.width, quelle.height), c = leinwand(Math.round(quelle.width * s), Math.round(quelle.height * s));
  c.getContext("2d").drawImage(quelle, 0, 0, c.width, c.height);
  return c.toDataURL("image/jpeg", 0.85);
}
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
  if (datei) fotoLaden(datei); else melden("Das ist kein Bild. Bitte ein Foto (JPG, PNG, HEIC je nach Browser) verwenden.", true);
});
$("datei").addEventListener("change", (e) => { if (e.target.files?.[0]) fotoLaden(e.target.files[0]); });
$("testbild").addEventListener("click", async () => fotoLaden(new File([await (await fetch("beispiel.jpg")).blob()], "beispiel.jpg", { type: "image/jpeg" })));

async function fotoLaden(datei) {
  notiz(`Foto gewählt (${Math.round((datei.size ?? 0) / 1024)} kB)`);
  melden("Foto wird gelesen …");
  let q;
  try { q = await bitmap(datei); } catch { melden("Dieses Foto kann der Browser nicht öffnen. Versuche es als JPG oder PNG.", true); return; }
  notiz(`Foto gelesen und verkleinert auf ${q.width} × ${q.height}`);
  // das alte Foto und seine Bühne sofort freigeben, nicht erst, wenn das neue analysiert ist
  anhalten(); S.sz = null; S.t = null;
  S.buehne?.entsorgen(); S.buehne = null; S.buehneSchluessel = ""; S.buehneWarm = false; S.buehneFertig = false;
  S.foto = null; S.A = null;
  S.bild = q; S.ki = null;
  $("quelle").src = bildchen(q); $("quelle").hidden = false;
  ablage.classList.add("hat-bild"); $("ablage-titel").textContent = "Anderes Foto wählen";
  await lesen();
}

// ——— analysieren (Worker, sonst hier) ———
let worker = null, offen = null;
const neuerWorker = () => { try { return new Worker(new URL("./rechner.js?v=8", import.meta.url), { type: "module" }); } catch { return null; } };
worker = neuerWorker();
function rechnen() {
  const [B, H] = (S.mass = filmMass(S.format));
  S.foto = zugeschnitten(S.bild, B, H);
  const w = Math.round(B / 2), h = Math.round(H / 2);
  const daten = zugeschnitten(S.bild, w, h).getContext("2d").getImageData(0, 0, w, h).data;
  const nr = ++S.rechnen, auftrag = { nr, daten, w, h, massstab: B / w };
  if (!worker) return new Promise((ok) => setTimeout(() => ok({ nr, ergebnis: analysieren(daten, w, h, auftrag) }), 0));
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
  melden("Das Foto wird analysiert …");
  sperren(true);
  const { nr, ergebnis, fehler } = await rechnen();
  if (nr !== S.rechnen) return;
  sperren(false);
  if (fehler || !ergebnis) { melden(`Das Foto liess sich nicht analysieren: ${fehler}`, true); return; }
  S.A = ergebnis; S.A.geschaetzt = ergebnis.tiefe;
  notiz(`Analyse fertig (${ergebnis.ms} ms im Worker)`);
  const z = (n) => n.toLocaleString("de-CH");
  $("auswertung").textContent = `${ergebnis.keime.length} Keime · Kanten · Tiefe · Tonumfang · ${ergebnis.ms} ms`;
  if (S.tiefe === "ki") await kiAnwenden();
  neu();
  if (S.tiefe !== "ki" || S.ki) melden("Bereit. Die Vorschau läuft; «Video erstellen» rechnet das MP4.");
}

// ——— Tiefe: aus dem Bild oder von der KI (lädt beim ersten Mal das Modell) ———
let kiModul = null;
async function kiAnwenden() {
  if (!S.A || !S.foto) return;
  if (!S.ki) {
    const nr = S.rechnen;
    try {
      notiz("Tiefe mit KI wird vorbereitet");
      kiModul ??= await import("./tiefe-ki.js?v=8");
      const { tiefe, name, device } = await kiModul.kiTiefe(S.foto, S.A.w, S.A.h, (m) => melden(m), { telefon: grob, notiz });
      if (nr !== S.rechnen) return;
      S.ki = { tiefe: tiefeNormieren(tiefe, S.A.w, S.A.h, S.A.hell), name, device };
      melden(`Bereit. Tiefe von der KI (${name.split("/")[1]}, ${device === "webgpu" ? "WebGPU" : "WebAssembly"}).`);
    } catch (fehler) {
      melden(`Die KI-Tiefe liess sich nicht laden (${fehler?.message ?? fehler}); es bleibt die aus dem Bild geschätzte Tiefe.`, true);
      return;
    }
  }
  S.A.tiefe = S.ki.tiefe;
}

// ——— Bühne (WebGL 2): erst laden, wenn ein Foto da ist ———
let buehneModul = null;
async function buehneBereit() {
  const schluessel = S.A ? `${S.rechnen}|${S.ablauf}|${S.A.tiefe === S.A.geschaetzt ? "bild" : "ki"}|${S.muster}` : "";
  if (schluessel === S.buehneSchluessel) return;
  S.buehneSchluessel = schluessel; S.buehneFertig = false; S.buehneWarm = false; S.spurBilder = 0;
  if (S.sz) S.sz.buehne = null;
  S.buehne?.entsorgen(); S.buehne = null;
  if (!schluessel) return;
  try {
    if (!buehneModul) notiz("three.js und die Bühne werden geladen");
    buehneModul ??= await import("./buehne.js?v=8");
    if (S.buehneSchluessel !== schluessel) return;
    notiz(`Bühne wird gebaut: ${S.ablauf}`);
    S.buehne = buehneModul.buehne(S.foto, S.A, S.ablauf, { grob, test, muster: S.muster, tiefeQuelle: S.A.tiefe === S.A.geschaetzt ? "bild" : "ki", spur: notiz,
      onVerloren: () => {
        if (S.buehneSchluessel !== schluessel) return;
        anhalten();
        notiz("Grafik ausgestiegen (webglcontextlost)");
        melden("Die Grafik dieses Geräts ist ausgestiegen (meist: zu wenig Grafikspeicher). Wähle einen einzelnen Effekt oder lade die Seite neu.", true);
        if (S.sz) { S.sz.buehne = null; zeigeZeit(S.t ?? 0); }
        S.buehneSchluessel = ""; S.buehne = null;
      } });
  } catch (fehler) {
    melden(`PHORMA II braucht WebGL 2; hier blendet an seiner Stelle das Foto auf (${fehler?.message ?? fehler}).`, true);
    return;
  }
  // erst wenn die Programme übersetzt sind, zeichnet die Vorschau mit der Bühne (bis dahin der Grund)
  const b = S.buehne;
  try { b.infoGemerkt = b.info(); } catch { /* egal */ }                    // einmal, nicht bei jeder Anzeige
  const i = b.infoGemerkt;
  notiz(`Bühne gebaut · Grafik ${i?.grafik ?? "?"} · Float-Ziel ${i?.floatZiel} · Float mischen ${i?.floatMischen} · Float linear ${i?.floatLinear} · parallel ${i?.parallel}`);
  melden("Die Effekte werden vorbereitet …");
  await b.warm;
  notiz("Programme übersetzt");
  if (S.buehne !== b) return;
  S.buehneWarm = true;
  melden("Bereit. Die Vorschau läuft; «Video erstellen» rechnet das MP4.");
  if (S.sz) { S.sz.buehne = b; if (S.laeuft) { S.start = performance.now(); } else zeigeZeit(S.t ?? 0); }
  // was im Hintergrund rechnet (die Bahn des Tuchs): Fortschritt melden, danach die Vorschau neu zeichnen
  if (b.fortschritt() < 1) {
    const zeigen = () => { if (S.buehne === b && b.fortschritt() < 1) { melden(`Das Tuch wird berechnet … ${Math.round(b.fortschritt() * 100)} %`); setTimeout(zeigen, 250); } };
    zeigen();
  }
  b.bereit.then(() => {
    if (S.buehne !== b) return;
    S.buehneFertig = true;
    notiz("alles bereit (auch das Tuch)");
    if (/Tuch wird berechnet/.test($("meldung").textContent)) melden("Bereit. Die Vorschau läuft; «Video erstellen» rechnet das MP4.");
    if (!S.laeuft && S.sz && S.t !== null) zeigeZeit(S.t);
  });
}
/** Video und Standbild warten, bis die Bühne ganz fertig ist */
async function buehneFertig() { await buehneBereit(); await S.buehne?.bereit; }

function optionen() {
  return { breite: S.mass[0], hoehe: S.mass[1], tempo: $("tempo").value, signet: $("signet").checked, beschriftung: $("beschriftung").checked,
    titel: $("titel").value.replace(/\s+/g, " ").trim(), foto: S.foto, ablauf: S.ablauf, buehne: S.buehneWarm ? S.buehne : null };
}

function sprungknoepfe(sz) {
  const leiste = document.querySelector(".phasen"), namen = sz.zeit.phasen.map((p) => `${p.art}.${p.name}`).join(",");
  if (leiste.dataset.namen === namen) return;
  leiste.dataset.namen = namen;
  leiste.replaceChildren(...sz.zeit.phasen.map((p, i) => {
    const b = document.createElement("button");
    b.type = "button"; b.id = `zu-${p.art}-${p.name}`; b.dataset.nr = String(i);
    b.textContent = `${String(i + 1).padStart(2, "0")} ${p.titel}`;
    return b;
  }));
}
document.querySelector(".phasen").addEventListener("click", (e) => {
  const b = e.target.closest("button"); if (!b || !S.sz) return;
  const ph = S.sz.zeit.phasen[Number(b.dataset.nr)];
  anhalten(); zeigeZeit(ph === S.sz.zeit.phasen.at(-1) ? S.sz.zeit.ab.stehen[0] + 0.8 : ph.von + (ph.bis - ph.von) * 0.6);
});

function neu({ abspielen = !ruhig } = {}) {
  if (!S.A) return;
  buehneBereit();
  const alt = S.sz ? S.t : null;
  S.sz = szene(optionen());
  sprungknoepfe(S.sz);
  VORSCHAU = vorschauMass();
  const vb = Math.round(S.mass[0] * VORSCHAU), vh = Math.round(S.mass[1] * VORSCHAU);
  if (vorschau.width !== vb || vorschau.height !== vh) { vorschau.width = vb; vorschau.height = vh; }
  vctx.setTransform(VORSCHAU, 0, 0, VORSCHAU, 0, 0);
  vorschau.parentElement.style.aspectRatio = `${S.mass[0]} / ${S.mass[1]}`;
  vorschau.parentElement.style.setProperty("--seiten", String(S.mass[0] / S.mass[1]));
  $("dauer").textContent = `${S.sz.zeit.dauer.toFixed(1).replace(".", ",")} s · ${S.mass[0]} × ${S.mass[1]} · ${FPS} Bilder/s`;
  $("zeit").max = String(S.sz.zeit.dauer); $("zeit").disabled = false;
  for (const k of ["video", "png", "spielen"]) $(k).disabled = false;
  $("leer").hidden = true;
  if (S.laeuft) return;
  if (abspielen && alt === null) spielen();
  else zeigeZeit(Math.min(alt ?? standbildZeit(S.sz), S.sz.zeit.dauer - 1 / FPS));
}

// ——— Einstellungen ———
function wahl(attr, schluessel, werte, wenn) {
  const knoepfe = [...document.querySelectorAll(`[${attr}]`)];
  const zeigen = () => knoepfe.forEach((b) => b.setAttribute("aria-pressed", String(b.getAttribute(attr) === String(S[schluessel]))));
  const alt = erinnern(schluessel);
  if (alt !== null && werte.includes(alt)) S[schluessel] = alt;
  zeigen();
  for (const b of knoepfe) b.addEventListener("click", () => { if (S[schluessel] === b.getAttribute(attr)) return; S[schluessel] = b.getAttribute(attr); merken(schluessel, S[schluessel]); zeigen(); wenn(); });
  return knoepfe;
}
let umstellen = 0;
const spaeterLesen = () => { clearTimeout(umstellen); umstellen = setTimeout(lesen, 250); };
const formatKnoepfe = wahl("data-format", "format", FORMATE, () => { S.ki = null; spaeterLesen(); });
// Muster: die Feinheit der Morphogenese (nur die Bühne wird neu gebaut, das Foto nicht neu analysiert)
const musterKnoepfe = wahl("data-muster", "muster", ["fein", "mittel", "grob"], () => neu());
const tiefeKnoepfe = wahl("data-tiefe", "tiefe", ["bild", "ki"], async () => {
  if (!S.A) return;
  if (S.tiefe === "ki") { melden("Die KI-Tiefe wird vorbereitet …"); await kiAnwenden(); } else { S.A.tiefe = S.A.geschaetzt; melden("Tiefe aus dem Bild geschätzt."); }
  neu();
});
$("ki-hinweis").hidden = S.tiefe !== "ki";
if (kiAbsturz) melden("Die KI-Tiefe hat beim letzten Mal den Browser zum Absturz gebracht; sie ist darum ausgeschaltet (Tiefe aus dem Bild).", true);
for (const b of tiefeKnoepfe) b.addEventListener("click", () => { $("ki-hinweis").hidden = S.tiefe !== "ki"; });
for (const id of ["tempo"]) { const v = erinnern(id); if (v && [...$(id).options].some((o) => o.value === v)) $(id).value = v; $(id).addEventListener("change", () => { merken(id, $(id).value); neu(); }); }
for (const id of ["signet", "beschriftung", "unschaerfe"]) { const v = erinnern(id); if (v !== null) $(id).checked = v === "1"; $(id).addEventListener("change", () => { merken(id, $(id).checked ? "1" : "0"); if (id !== "unschaerfe") neu(); }); }
// Effekte (Wunsch vom 17. Oktober 2026: «die Effekte einzeln anwählen»): die Karten wählen die ganze Kette oder genau einen Effekt; die Schalter
// darunter stellen eine eigene Kette zusammen (in fester Reihenfolge, einer bleibt immer). Die Wahl bleibt gespeichert.
const wahlKnoepfe = [...document.querySelectorAll("[data-wahl]")], effektKnoepfe = [...document.querySelectorAll("[data-effekt]")];
S.ablauf = ablaufName(erinnern("ablauf"));
const ablaufZeigen = () => {
  const gewaehlt = effekte(S.ablauf);
  wahlKnoepfe.forEach((b) => b.setAttribute("aria-pressed", String(ablaufName(b.dataset.wahl) === S.ablauf)));
  effektKnoepfe.forEach((b) => b.setAttribute("aria-pressed", String(gewaehlt.includes(b.dataset.effekt))));
  $("kette").textContent = gewaehlt.map((e) => TITEL[e]).join(" → ");
};
ablaufZeigen();
const ablaufSetzen = (a) => { a = ablaufName(a); if (a === S.ablauf) return; S.ablauf = a; merken("ablauf", a); ablaufZeigen(); neu(); };
for (const b of wahlKnoepfe) b.addEventListener("click", () => ablaufSetzen(b.dataset.wahl));
for (const b of effektKnoepfe) b.addEventListener("click", () => {
  const e = b.dataset.effekt, gewaehlt = effekte(S.ablauf);
  const liste = gewaehlt.includes(e) ? gewaehlt.filter((x) => x !== e) : [...gewaehlt, e];
  if (liste.length) ablaufSetzen(liste.join("+"));
});
let tippen = 0;
$("titel").addEventListener("input", () => { clearTimeout(tippen); tippen = setTimeout(() => neu(), 300); });

// ——— Vorschau und Zeitleiste ———
let sichtbar = true, zuletzt = 0;
if ("IntersectionObserver" in window) new IntersectionObserver(([e]) => { sichtbar = e.isIntersecting; }).observe(vorschau);
function spielen() {
  if (!S.sz) return;
  const ab = !S.ende && S.t !== null && S.t < S.sz.zeit.dauer - 0.1 ? S.t : 0;
  S.ende = false;
  S.start = performance.now() - ab * 1000; zuletzt = 0;
  if (!S.laeuft) { S.laeuft = true; requestAnimationFrame(takt); }
  $("spielen").textContent = "Anhalten";
}
function anhalten() { S.laeuft = false; $("spielen").textContent = "Abspielen"; }
function zeigeZeit(t) {
  const t0 = performance.now();
  S.t = t; S.ende = false;
  const mitBuehne = !!S.sz?.buehne;
  if (mitBuehne && S.spurBilder < 30 && [0, 1, 29].includes(S.spurBilder)) notiz(S.spurBilder === 29 ? "Vorschaubild 30 wird gezeichnet" : `Vorschaubild ${S.spurBilder + 1} wird gezeichnet (t ${t.toFixed(2)} s)`);
  bild(vctx, S.sz, t, { vorschau: true });
  if (mitBuehne && S.spurBilder < 30 && ++S.spurBilder === 30) notiz("✓ Vorschau läuft (30 Bilder)");
  if (DIAGNOSE) { D.bild.push(performance.now() - t0); if (D.bild.length > 60) D.bild.shift(); }
  $("zeit").value = String(t); $("zeitcode").textContent = zeitcode(t);
}
function takt(jetzt) {
  if (!S.laeuft || !S.sz) return;
  if (!sichtbar) { S.start += jetzt - (zuletzt || jetzt); zuletzt = jetzt; requestAnimationFrame(takt); return; }
  zuletzt = jetzt;
  const t = (jetzt - S.start) / 1000;
  if (t >= S.sz.zeit.dauer) { anhalten(); zeigeZeit(S.sz.zeit.dauer - 1 / FPS); S.ende = true; return; }
  zeigeZeit(t);
  requestAnimationFrame(takt);
}
$("spielen").addEventListener("click", () => (S.laeuft ? anhalten() : spielen()));
$("zeit").addEventListener("input", () => { if (!S.sz) return; anhalten(); zeigeZeit(Number($("zeit").value)); });

const proben = () => ($("unschaerfe").checked ? PROBEN : 1);

// ——— Standbild ———
$("png").addEventListener("click", async () => {
  if (!S.sz) return;
  await buehneFertig();
  const c = leinwand(S.mass[0], S.mass[1]);
  bild(c.getContext("2d"), szene(optionen()), Math.min(S.t ?? standbildZeit(S.sz), S.sz.zeit.dauer), { proben: proben() });
  const blob = await new Promise((ok) => c.toBlob(ok, "image/png"));
  herunterladen(blob, dateiname(new Date(), "png"));
  if (S.t !== null) zeigeZeit(S.t);
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
    const cfg = { codec, width: B, height: H, bitrate: 14_000_000, framerate: FPS, avc: { format: "avc" }, latencyMode: "quality" };
    try { if ((await VideoEncoder.isConfigSupported(cfg)).supported) return cfg; } catch { /* nächster */ }
  }
  return null;
}
$("video").addEventListener("click", async () => {
  if (!S.sz) return;
  anhalten(); sperren(true);
  const fort = $("fortschritt"); fort.hidden = false; fort.value = 0;
  await buehneFertig();
  const sz = szene(optionen());
  const t0 = performance.now();
  try {
    const cfg = await webcodecs([sz.breite, sz.hoehe]);
    const erg = cfg ? await mitWebCodecs(cfg, sz) : await mitRecorder(sz);
    zeigen(erg, sz, performance.now() - t0);
  } catch (fehler) {
    melden(`Das Video liess sich nicht erstellen: ${fehler?.message ?? fehler}`, true);
  } finally { sperren(false); fort.hidden = true; if (S.t !== null) zeigeZeit(S.t); }
});

async function mitWebCodecs(cfg, sz) {
  const p = proben();
  melden(p > 1 ? `Video wird gerechnet, mit Bewegungsunschärfe (${p} Proben je Bild) …` : "Video wird gerechnet …");
  const c = leinwand(sz.breite, sz.hoehe), ctx = c.getContext("2d", { alpha: false });
  const stuecke = [];
  let avcC = null, fehler = null;
  const enc = new VideoEncoder({
    output: (chunk, meta) => {
      if (meta?.decoderConfig?.description && !avcC) { const d = meta.decoderConfig.description; avcC = new Uint8Array(d.buffer ? d.buffer.slice(d.byteOffset, d.byteOffset + d.byteLength) : d); }
      const daten = new Uint8Array(chunk.byteLength); chunk.copyTo(daten);
      stuecke.push({ daten, key: chunk.type === "key", zeit: chunk.timestamp });
    },
    error: (e) => { fehler = e; },
  });
  enc.configure(cfg);
  const n = sz.zeit.bilder;
  for (let i = 0; i < n; i++) {
    if (fehler) throw fehler;
    bild(ctx, sz, i / FPS, { proben: p });
    const frame = new VideoFrame(c, { timestamp: Math.round((i * 1e6) / FPS), duration: Math.round(1e6 / FPS) });
    enc.encode(frame, { keyFrame: i % (FPS * 2) === 0 });
    frame.close();
    while (enc.encodeQueueSize > 6) await new Promise((ok) => setTimeout(ok, 4));
    if (i % 5 === 0) { $("fortschritt").value = i / n; await new Promise((ok) => setTimeout(ok, 0)); }
  }
  await enc.flush(); enc.close();
  if (fehler) throw fehler;
  if (!avcC) throw new Error("der Encoder hat keine Beschreibung geliefert");
  return { blob: new Blob([mp4({ breite: sz.breite, hoehe: sz.hoehe, fps: FPS, avcC, proben: stuecke })], { type: "video/mp4" }), endung: "mp4", art: `MP4 (H.264, ${cfg.codec})${p > 1 ? ` · Bewegungsunschärfe ${p} Proben` : ""}` };
}

async function mitRecorder(sz) {
  const typen = [["video/mp4;codecs=avc1.42E01E", "mp4"], ["video/mp4", "mp4"], ["video/webm;codecs=vp9", "webm"], ["video/webm;codecs=vp8", "webm"], ["video/webm", "webm"]];
  const typ = typeof MediaRecorder !== "undefined" && typen.find(([m]) => MediaRecorder.isTypeSupported(m));
  if (!typ) throw new Error("dieser Browser kann keine Videos erzeugen (weder WebCodecs noch MediaRecorder)");
  melden(`Video wird in Echtzeit aufgenommen (${sz.zeit.dauer.toFixed(0)} s, ohne Bewegungsunschärfe). Lass diese Seite sichtbar.`);
  const c = leinwand(sz.breite, sz.hoehe), ctx = c.getContext("2d", { alpha: false });
  const strom = c.captureStream(0), spur = strom.getVideoTracks()[0];
  const rec = new MediaRecorder(strom, { mimeType: typ[0], videoBitsPerSecond: 14_000_000 });
  const teile = [];
  rec.ondataavailable = (e) => { if (e.data.size) teile.push(e.data); };
  const fertig = new Promise((ok) => { rec.onstop = ok; });
  bild(ctx, sz, 0); rec.start(1000);
  const t0 = performance.now(), n = sz.zeit.bilder;
  for (let i = 0; i < n; i++) {
    bild(ctx, sz, i / FPS); spur.requestFrame?.(); $("fortschritt").value = i / n;
    await new Promise((ok) => setTimeout(ok, Math.max(0, t0 + ((i + 1) * 1000) / FPS - performance.now())));
  }
  const sekunden = (performance.now() - t0) / 1000;
  rec.stop(); await fertig;
  const roh = new Uint8Array(await new Blob(teile).arrayBuffer());
  return { blob: new Blob([mitDauer(roh, sekunden)], { type: typ[0].split(";")[0] }), endung: typ[1], art: typ[0] };
}

function zeigen({ blob, endung, art }, sz, ms) {
  if (S.film) URL.revokeObjectURL(S.film);
  S.film = URL.createObjectURL(blob);
  $("film").src = S.film;
  $("film").style.aspectRatio = `${sz.breite} / ${sz.hoehe}`;
  $("laden").href = S.film; $("laden").download = dateiname(new Date(), endung);
  $("film-info").textContent = `${sz.breite} × ${sz.hoehe} · ${sz.zeit.dauer.toFixed(1).replace(".", ",")} s · ${(blob.size / 1e6).toFixed(1).replace(".", ",")} MB · ${art} · gerechnet in ${(ms / 1000).toFixed(1).replace(".", ",")} s`;
  $("ergebnis").hidden = false;
  melden("Fertig. Prüfe das Video und lade es herunter.");
  $("ergebnis").scrollIntoView({ behavior: ruhig ? "auto" : "smooth", block: "nearest" });
}

function sperren(an) {
  for (const el of [$("datei"), $("testbild"), ...formatKnoepfe, ...musterKnoepfe, ...tiefeKnoepfe, ...wahlKnoepfe, ...effektKnoepfe, $("video"), $("png")])
    el.disabled = an || ((el.id === "video" || el.id === "png") && !S.A);
}
