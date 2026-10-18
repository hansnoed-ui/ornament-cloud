// PHORMA III – Seite: Foto, Text, Video oder nur Ton als Quelle, dazu eine Audiodatei (auf Wunsch verfrickelt); analysieren (Worker), Bühne
// (WebGL), Vorschau mit Zeitleiste und Ton, Video (MP4 mit Tonspur) und Standbild (PNG). Alles bleibt im Browser. Video über WebCodecs (H.264, AAC)
// und mp4Schreiber (tonspur.js); ohne WebCodecs in Echtzeit über MediaRecorder. Mit Bewegungsunschärfe rechnet jedes Bild acht Proben.
// Bis zum 18. Oktober 2026 ein Effekt in PHORMA II (Wunsch: «Es sind ja zwei ganz verschiedene Ansätze … all das soll aus PHORMA II ausgelagert
// werden und in ein neues PHORMA III integriert werden»).
import { FPS, dateiname, filmMass, zeitcode, FORMATE, EFFEKTE, ablaufName, zeitachse, NACH } from "./ablauf.js?v=7";
import { szene, bild, standbildZeit } from "./film.js?v=7";
import { analysieren } from "./analyse.js?v=7";
import { tonAnalysieren, tonOderErsatz, wechselZeiten } from "./ton.js?v=7";
import { textBild } from "./textbild.js?v=7";
import { mitDauer } from "../the-fictory/dauer.js?v=32";

const $ = (id) => document.getElementById(id);
const vorschau = $("vorschau"), vctx = vorschau.getContext("2d");
const ruhig = matchMedia("(prefers-reduced-motion: reduce)").matches;
const grob = matchMedia("(pointer: coarse)").matches, test = new URLSearchParams(location.search).has("test");
const PROBEN = 8;
let VORSCHAU = 0.5;
const S = { bild: null, A: null, foto: null, sz: null, laeuft: false, start: 0, t: null, film: null, rechnen: 0, buehne: null, buehneSchluessel: "",
  format: "4:5", quelle: "foto", text: "", fotoBild: null, video: null, ton: null, mass: [1080, 1350], ablauf: "gewebe" };
window.__phorma = S;   // für die Browser-Tests
// ?diagnose: Messwerte zum Gerät sichtbar unter der Vorschau (Rückmeldung vom 17. Oktober 2026: auf einem Telefon «reagiert nicht», hier nicht
// nachzustellen) – Zeitpunkte der Schritte, Dauer je Vorschaubild, längste Blockade, Grafikchip und Erweiterungen; als Bildschirmfoto zurückschicken
const DIAGNOSE = new URLSearchParams(location.search).has("diagnose");
const D = { t0: performance.now(), notizen: [], bild: [], lang: 0 };
// Spur, die einen Absturz überlebt (Rückmeldung vom 17. Oktober 2026: Chrome bricht den Tab gleich nach dem Laden eines Fotos ab, «Oh nein!»): jeder
// Schritt sofort in localStorage; index.html zeigt beim nächsten Öffnen, nach welchem Schritt der letzte Lauf endete. «✓» heisst: ging gut.
const SPUR = "phorma-iii.spur";
function spur(text, neu = false) {
  try {
    const liste = neu ? [] : JSON.parse(localStorage.getItem(SPUR) || "[]");
    liste.push([Date.now(), text]);
    localStorage.setItem(SPUR, JSON.stringify(liste.slice(-40)));
  } catch { /* ohne Speicher keine Spur */ }
}
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
  box.textContent = [`PHORMA III · Diagnose · ${navigator.userAgent.replace(/^Mozilla\/5\.0 /, "").slice(0, 90)}`,
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
const merken = (k, v) => { try { localStorage.setItem(`phorma-iii.${k}`, v); } catch { /* egal */ } };
const erinnern = (k) => { try { return localStorage.getItem(`phorma-iii.${k}`); } catch { return null; } };
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
  const qw = quelle.videoWidth || quelle.width, qh = quelle.videoHeight || quelle.height;           // auch ein Bild aus einem Video
  const s = Math.max(w / qw, h / qh), dw = qw * s, dh = qh * s;
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
  S.fotoBild = q;
  if (S.quelle !== "foto") { S.quelle = "foto"; merken("quelle", "foto"); quelleZeigen(); }
  ablage.classList.add("hat-bild"); $("ablage-titel").textContent = "Anderes Foto wählen";
  await bildSetzen(q);
}
// ——— Video als Quelle: ein Standbild ist das Bild, sein Ton (falls lesbar und keine andere Audiodatei gewählt) die Tonspur; im Gewebe holen die
// Schnitte die Linien neuer Bilder aus dem Video (Wunsch vom 18. Oktober 2026: «cool wäre es auch mit Videodateien») ———
const videoSuchen = (v, t) => new Promise((ok, nein) => {
  const fertig = () => { clearTimeout(z); v.removeEventListener("seeked", fertig); ok(); };
  const z = setTimeout(() => { v.removeEventListener("seeked", fertig); nein(new Error("das Video lässt sich nicht spulen")); }, 10_000);
  v.addEventListener("seeked", fertig);
  v.currentTime = Math.abs(v.currentTime - t) < 1e-3 ? t + 0.001 : t;
});
$("videodatei").addEventListener("change", (e) => { if (e.target.files?.[0]) videoLaden(e.target.files[0]); });
async function videoLaden(datei) {
  notiz(`Video gewählt (${Math.round((datei.size ?? 0) / 1024)} kB)`);
  melden("Das Video wird gelesen …");
  const url = URL.createObjectURL(datei), v = document.createElement("video");
  v.muted = true; v.playsInline = true; v.preload = "auto"; v.src = url;
  try {
    await new Promise((ok, nein) => { v.onloadeddata = ok; v.onerror = () => nein(new Error("kein lesbares Video")); });
    // WebM aus einem Rekorder nennt oft keine Dauer (Infinity): einmal weit hinter das Ende spulen, dann kennt der Browser sie
    if (v.duration === Infinity) await videoSuchen(v, 1e7).catch(() => {});
    if (!(v.duration > 0) || !Number.isFinite(v.duration) || !v.videoWidth) throw new Error("ohne Bild oder Dauer");
    await videoSuchen(v, Math.min(0.5, v.duration / 3));
  } catch (fehler) { URL.revokeObjectURL(url); melden(`Dieses Video kann der Browser nicht öffnen (${fehler?.message ?? fehler}). Versuche MP4 (H.264) oder WebM.`, true); return; }
  const s = Math.min(1, GROESST / Math.max(v.videoWidth, v.videoHeight)), c = leinwand(Math.round(v.videoWidth * s), Math.round(v.videoHeight * s));
  c.getContext("2d").drawImage(v, 0, 0, c.width, c.height);
  // die Adresse des alten Videos bleibt (eine Datei, kein Speicher): seine Tonspur kann noch daran hängen
  S.video = { el: v, url, name: datei.name, dauer: v.duration, bild: c, saetze: null };
  notiz(`Video gelesen: ${v.duration.toFixed(1)} s, ${v.videoWidth} × ${v.videoHeight}`);
  $("video-info").textContent = `${datei.name} · ${v.duration.toFixed(1).replace(".", ",")} s · ${v.videoWidth} × ${v.videoHeight}`;
  $("video-bild").src = bildchen(c); $("video-bild").hidden = false;
  if (S.quelle !== "video") { S.quelle = "video"; merken("quelle", "video"); quelleZeigen(); }
  // der Ton des Videos wird die Tonspur, ausser eine andere Audiodatei ist gewählt
  if (!S.tonQuelle || S.tonQuelle.ausVideo) {
    try {
      const { tonLesen } = await import("./tonspur.js?v=7");
      const { buffer } = await tonLesen(datei);
      S.tonQuelle = { buffer, name: `Ton von ${datei.name}`, url, ausVideo: true }; S.ausschnitt = null;
      await tonSetzen({ auffrischen: false });
    } catch {
      notiz("Video ohne lesbaren Ton");
      if (S.tonQuelle?.ausVideo) tonEntfernen();                         // nicht den Ton des vorigen Videos behalten
    }
  }
  await bildSetzen(c);
}
/** die Bilder aus dem Video, deren Linien das Gewebe ab den Schnitten zeigt: [{ t (Zeit des Effekts), hell }]; gemerkt, solange Format und Schnitte gleich bleiben */
async function videoSaetze() {
  const V = S.video, G = zeitachse({ tempo: "normal", laenge: laenge(), signet: $("signet").checked, ablauf: "gewebe" }).phasen.find((p) => p.name === "gewebe");
  const zeiten = wechselZeiten(tonOderErsatz(S.ton?.analyse ?? null), G), w = S.A.w, h = S.A.h, schl = `${w}x${h}|${zeiten.join(",")}`;
  if (V.saetze?.schl === schl) return V.saetze.liste;
  melden(`${zeiten.length} Bilder werden aus dem Video gelesen …`);
  const liste = [];
  for (const t of zeiten) {
    await videoSuchen(V.el, Math.min(V.dauer - 0.04, (t + 0.04) % V.dauer));
    const d = zugeschnitten(V.el, w, h).getContext("2d").getImageData(0, 0, w, h).data, hell = new Float32Array(w * h);
    for (let i = 0; i < w * h; i++) hell[i] = (0.2126 * d[i * 4] + 0.7152 * d[i * 4 + 1] + 0.0722 * d[i * 4 + 2]) / 255;
    liste.push({ t, hell });
  }
  notiz(`${liste.length} Bilder aus dem Video gelesen`);
  V.saetze = { schl, liste };
  return liste;
}
/** ein Bild (Foto, Text oder Standbild eines Videos) als Quelle: das alte und seine Bühne sofort freigeben, nicht erst, wenn das neue analysiert ist */
async function bildSetzen(q) {
  anhalten(); S.sz = null; S.t = null;
  S.buehne?.entsorgen(); S.buehne = null; S.buehneSchluessel = ""; S.buehneWarm = false; S.buehneFertig = false;
  S.foto = null; S.A = null;
  S.bild = q;
  if (S.quelle === "foto") { $("quelle").src = bildchen(q); $("quelle").hidden = false; }
  await lesen();
}

// ——— analysieren (Worker, sonst hier) ———
let worker = null, offen = null;
const neuerWorker = () => { try { return new Worker(new URL("./rechner.js?v=7", import.meta.url), { type: "module" }); } catch { return null; } };
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
  melden("Das Bild wird analysiert …");
  sperren(true);
  const { nr, ergebnis, fehler } = await rechnen();
  if (nr !== S.rechnen) return;
  sperren(false);
  if (fehler || !ergebnis) { melden(`Das Bild liess sich nicht analysieren: ${fehler}`, true); return; }
  S.A = ergebnis;
  notiz(`Analyse fertig (${ergebnis.ms} ms im Worker)`);
  $("auswertung").textContent = `Helligkeit · Tonumfang · ${ergebnis.ms} ms`;
  neu();
  melden("Bereit. Die Vorschau läuft; «Video erstellen» rechnet das MP4.");
}

// ——— Bühne (WebGL 2): erst laden, wenn ein Bild da ist ———
let buehneModul = null;
async function buehneBereit() {
  const schluessel = S.A ? `${S.rechnen}|${S.ablauf}|${S.quelle}|${S.ton?.name ?? ""}|${laenge()}|${$("signet").checked}|${S.quelle === "video" ? S.video?.url : ""}` : "";
  if (schluessel === S.buehneSchluessel) return;
  S.buehneSchluessel = schluessel; S.buehneFertig = false; S.buehneWarm = false; S.spurBilder = 0;
  if (S.sz) S.sz.buehne = null;
  S.buehne?.entsorgen(); S.buehne = null;
  if (!schluessel) return;
  try {
    if (!buehneModul) notiz("three.js und die Bühne werden geladen");
    buehneModul ??= await import("./buehne.js?v=7");
    if (S.buehneSchluessel !== schluessel) return;
    const saetze = S.quelle === "video" && S.video && S.ablauf === "gewebe" ? await videoSaetze() : null;   // nur das Gewebe holt Bilder aus dem Video
    if (S.buehneSchluessel !== schluessel) return;
    notiz("Bühne wird gebaut");
    S.buehne = buehneModul.buehne(S.foto, S.A, S.ablauf, { grob, test, quelle: S.quelle, ton: S.ton?.analyse ?? null, laenge: laenge(), signet: $("signet").checked, saetze, spur: notiz,
      onVerloren: () => {
        if (S.buehneSchluessel !== schluessel) return;
        anhalten();
        notiz("Grafik ausgestiegen (webglcontextlost)");
        melden("Die Grafik dieses Geräts ist ausgestiegen (meist: zu wenig Grafikspeicher). Lade die Seite neu oder versuche es im Format 4 : 5.", true);
        if (S.sz) { S.sz.buehne = null; zeigeZeit(S.t ?? 0); }
        S.buehneSchluessel = ""; S.buehne = null;
      } });
  } catch (fehler) {
    melden(`PHORMA III braucht WebGL 2; hier blendet an seiner Stelle das Bild auf (${fehler?.message ?? fehler}).`, true);
    return;
  }
  // erst wenn die Programme übersetzt sind, zeichnet die Vorschau mit der Bühne (bis dahin der Grund)
  const b = S.buehne;
  try { b.infoGemerkt = b.info(); } catch { /* egal */ }                    // einmal, nicht bei jeder Anzeige
  const i = b.infoGemerkt;
  notiz(`Bühne gebaut · Grafik ${i?.grafik ?? "?"} · Float-Ziel ${i?.floatZiel} · Float mischen ${i?.floatMischen} · Float linear ${i?.floatLinear} · parallel ${i?.parallel}`);
  melden("Das Gewebe wird vorbereitet …");
  await b.warm;
  notiz("Programme übersetzt");
  if (S.buehne !== b) return;
  S.buehneWarm = true;
  melden("Bereit. Die Vorschau läuft; «Video erstellen» rechnet das MP4.");
  if (S.sz) { S.sz.buehne = b; if (S.laeuft) { S.start = performance.now(); } else zeigeZeit(S.t ?? 0); }
  b.bereit.then(() => {
    if (S.buehne !== b) return;
    S.buehneFertig = true;
    notiz("alles bereit");
    if (!S.laeuft && S.sz && S.t !== null) zeigeZeit(S.t);
  });
}
/** Video und Standbild warten, bis die Bühne ganz fertig ist */
async function buehneFertig() { await buehneBereit(); await S.buehne?.bereit; }

/** mit Tonspur dauert das Gewebe so lange wie sie (ohne Vorlauf und Schluss), 10 bis 110 s */
// die Musik klingt bis ans Ende; mit Signet gehört das Logo zum Gewebe und entsteht in ihrem Takt (Wünsche vom 18. Oktober 2026)
const laenge = () => (S.ton ? Math.min(110, Math.max(10, S.ton.analyse.dauer - 0.4 - NACH($("signet").checked, S.ablauf))) : null);
function optionen() {
  return { breite: S.mass[0], hoehe: S.mass[1], tempo: $("tempo").value, signet: $("signet").checked, beschriftung: $("beschriftung").checked,
    titel: $("titel").value.replace(/\s+/g, " ").trim(), foto: S.foto, ablauf: S.ablauf, buehne: S.buehneWarm ? S.buehne : null,
    text: S.quelle === "text" ? S.text : "", ton: S.ton?.analyse ?? null, laenge: laenge() };
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
  anhalten(); zeigeZeit(ph === S.sz.zeit.phasen.at(-1) && S.sz.zeit.ab.stehen ? S.sz.zeit.ab.stehen[0] + 0.8 : ph.von + (ph.bis - ph.von) * 0.6);
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
const formatKnoepfe = wahl("data-format", "format", FORMATE, () => { if (S.quelle === "ton") { clearTimeout(umstellen); umstellen = setTimeout(papierLaden, 250); } else if (S.quelle === "text") { clearTimeout(umstellen); umstellen = setTimeout(textLaden, 250); } else spaeterLesen(); });
// Effekt (seit 18. Oktober 2026 zwei: «Ich möchte nun bei PHORMA III weitere Möglichkeiten, neben Gewebe»): Gewebe oder Irrfahrt; die Wahl bleibt
const ablaufKnoepfe = wahl("data-wahl", "ablauf", EFFEKTE, () => { S.ablauf = ablaufName(S.ablauf); neu(); });
// Quelle: ein Foto, ein Text (wird zu einem Bild, textbild.js), ein Video oder nur Ton (Wünsche vom 17. und 18. Oktober 2026: Effekte «für Texte
// und Audiofiles», «cool wäre es auch mit Videodateien», die Animation «müsste auch ablaufen ohne Text oder Bild»)
const quelleKnoepfe = wahl("data-quelle", "quelle", ["foto", "text", "video", "ton"], () => {
  quelleZeigen();
  if (S.quelle === "ton") papierLaden();
  else if (S.quelle === "text" && S.text.trim()) textLaden();
  else if (S.quelle === "video" && S.video) bildSetzen(S.video.bild);
  else if (S.quelle === "foto" && S.fotoBild) bildSetzen(S.fotoBild);
});
function quelleZeigen() { for (const q of ["foto", "text", "video", "ton"]) $(`${q}-teil`).hidden = S.quelle !== q; }
/** nur Ton: leeres Papier als Bild – die Linien macht das Gewebe aus der Musik (Wunsch vom 18. Oktober 2026: «ohne Text oder Bild, sodass sich
 * die Bewegungen eben auf die Töne, Sounds, Rhythmen und Volumes der Musik beziehen») */
function papierLaden() {
  const [B, H] = filmMass(S.format), c = leinwand(B, H), x = c.getContext("2d");
  x.fillStyle = "#f3f1ec"; x.fillRect(0, 0, B, H);
  notiz("Nur Ton gewählt");
  return bildSetzen(c);
}
S.text = erinnern("text") ?? ""; $("text").value = S.text;
quelleZeigen();
let textTippen = 0;
$("text").addEventListener("input", () => { S.text = $("text").value; merken("text", S.text); clearTimeout(textTippen); textTippen = setTimeout(textLaden, 600); });
async function textLaden() {
  if (S.quelle !== "text" || !S.text.trim()) return;
  notiz(`Text gewählt (${S.text.length} Zeichen)`);
  await bildSetzen(await textBild(S.text, ...filmMass(S.format)));
}
// die gemerkte Quelle erst laden, wenn das ganze Modul steht (Rückmeldung vom 18. Oktober 2026: «Cannot access 'tiefeKnoepfe' before
// initialization» – «Nur Ton» lud das Papier sofort, und sperren() griff auf Knöpfe zu, die weiter unten erst entstehen)
setTimeout(() => { if (S.quelle === "text" && S.text.trim()) textLaden(); else if (S.quelle === "ton") papierLaden(); }, 0);
// Ton: eine Audiodatei steuert das Gewebe und klingt in der Vorschau und im Video mit (tonspur.js); ohne Ton bleibt das Video stumm. Auf Wunsch wird
// sie verfrickelt (frickeln.js: aus Schnipseln ein neues Stück, wiederholbar je Wurf); dann steuert und klingt das neue Stück.
S.frickeln = erinnern("frickeln") === "1"; $("frickeln").checked = S.frickeln;
S.wurf = Number(erinnern("wurf")) || 1;
// Stimme (seit 18. Oktober 2026, ein eigener Weg für Sprachaufnahmen, stimme.js): säubern und klären, auf Wunsch der Ablauf Scratch → klare Stimme mit
// Hüpfern → Gefrickel; die Musik behält das Verfrickeln
S.tonart = erinnern("tonart") === "stimme" ? "stimme" : "musik";
S.saeubern = erinnern("saeubern") !== "0"; $("saeubern").checked = S.saeubern;
S.stimmAblauf = erinnern("stimm-ablauf") !== "0"; $("stimm-ablauf").checked = S.stimmAblauf;
S.stimmDnb = erinnern("stimm-dnb") !== "0"; $("stimm-dnb").checked = S.stimmDnb;
const wuerfelbar = () => (S.tonart === "stimme" ? S.stimmAblauf : S.frickeln);
const tonartZeigen = () => {
  $("musik-teil").hidden = S.tonart !== "musik"; $("stimme-teil").hidden = S.tonart !== "stimme"; $("wuerfeln").hidden = !(wuerfelbar() && S.tonQuelle); $("stimm-dnb").disabled = !S.stimmAblauf;
  $("ausschnitt").hidden = !(S.tonart === "stimme" && S.tonQuelle); ausschnittZeigen();
};
// der Ausschnitt der Stimme (Wunsch vom 18. Oktober 2026: «Ich möchte den Ausschnitt des Voice-Clips in der Anwendung wählen können»): in der
// Wellenform ziehen oder tippen, oder mit den Reglern «ab» und «Länge». Ohne eigene Wahl (S.ausschnitt null) wie bisher: der Ablauf nimmt rund 10 s
// ab dem ersten Wort, sonst gilt die ganze Aufnahme. Mit eigener Wahl wird zuerst geschnitten, dann gesäubert; im Ablauf ist der Ausschnitt die klare Stimme.
S.ausschnitt = null;
const zeitText = (t) => `${Math.floor(t / 60)}:${(t % 60).toFixed(1).padStart(4, "0").replace(".", ",")}`;
/** der Ausschnitt in Sekunden der Aufnahme: { von, bis, eigen } */
function ausschnittJetzt() {
  const q = S.tonQuelle; if (!q) return null;
  const dauer = q.buffer.duration;
  if (S.ausschnitt) { const von = Math.min(S.ausschnitt.von, Math.max(0, dauer - 0.5)); return { von, bis: Math.min(dauer, von + S.ausschnitt.laenge), eigen: true }; }
  if (S.stimmAblauf && q.uebersicht) { const von = q.uebersicht.beginn; return { von, bis: Math.min(dauer, von + 10), eigen: false }; }
  return { von: 0, bis: dauer, eigen: false };
}
/** Wellenform (Spitzen je Spalte) und der Sprachbeginn, einmal je Aufnahme */
async function ausschnittVorbereiten(q) {
  if (q.uebersicht) return;
  const { sprachbeginn } = await import("./stimme.js?v=7");
  const b = q.buffer, n = b.length, mono = new Float32Array(n);
  for (let k = 0; k < b.numberOfChannels; k++) { const c = b.getChannelData(k); for (let i = 0; i < n; i++) mono[i] += c[i] / b.numberOfChannels; }
  const spalten = 800, spitzen = new Float32Array(spalten), schritt = n / spalten;
  for (let s = 0; s < spalten; s++) { let m = 0; for (let i = Math.floor(s * schritt), e = Math.min(n, Math.floor((s + 1) * schritt)); i < e; i++) m = Math.max(m, Math.abs(mono[i])); spitzen[s] = m; }
  const max = Math.max(1e-6, ...spitzen);
  q.uebersicht = { spitzen: spitzen.map((v) => v / max), beginn: sprachbeginn(mono, b.sampleRate) / b.sampleRate };
}
function ausschnittZeigen() {
  const q = S.tonQuelle, a = ausschnittJetzt(); if (!q || !a || $("ausschnitt").hidden) return;
  const dauer = q.buffer.duration, von = $("ausschnitt-von"), laenge = $("ausschnitt-laenge");
  von.max = String(Math.max(0, dauer - 0.5).toFixed(1)); laenge.max = String(Math.max(1, dauer).toFixed(1));
  von.value = String(a.von); laenge.value = String(a.bis - a.von);
  $("ausschnitt-info").value = `${zeitText(a.von)} – ${zeitText(a.bis)} · ${(a.bis - a.von).toFixed(1).replace(".", ",")} s${a.eigen ? "" : " (automatisch)"}`;
  $("ausschnitt-auto").disabled = !a.eigen || $("ausschnitt-von").disabled;
  const c = $("ausschnitt-bild"), dpr = Math.min(2, window.devicePixelRatio || 1), w = Math.max(1, Math.round(c.clientWidth * dpr)), h = Math.round(64 * dpr);
  if (c.width !== w || c.height !== h) { c.width = w; c.height = h; }
  const g = c.getContext("2d"), st = getComputedStyle(document.documentElement), farbe = (v, std) => st.getPropertyValue(v).trim() || std;
  g.clearRect(0, 0, w, h);
  const x0 = (a.von / dauer) * w, x1 = (a.bis / dauer) * w;
  g.fillStyle = farbe("--border", "#ccc"); g.globalAlpha = 0.45; g.fillRect(0, 0, w, h); g.globalAlpha = 1;
  const sp = q.uebersicht?.spitzen;
  if (sp) for (let x = 0; x < w; x++) {
    const v = sp[Math.min(sp.length - 1, Math.floor((x / w) * sp.length))], y = Math.max(dpr, v * h * 0.45);
    g.fillStyle = x >= x0 && x <= x1 ? farbe("--text", "#111") : farbe("--muted", "#888");
    g.fillRect(x, h / 2 - y, 1, 2 * y);
  }
  g.strokeStyle = farbe("--accent", "#c33"); g.lineWidth = 2 * dpr; g.strokeRect(x0 + dpr, dpr, Math.max(2 * dpr, x1 - x0 - 2 * dpr), h - 2 * dpr);
}
function ausschnittSetzen(von, laenge, fertig) {
  const q = S.tonQuelle; if (!q) return;
  const dauer = q.buffer.duration; laenge = Math.max(1, Math.min(dauer, laenge)); von = Math.max(0, Math.min(dauer - Math.min(laenge, 0.5), von));
  S.ausschnitt = { von: Math.round(von * 10) / 10, laenge: Math.round(laenge * 10) / 10 };
  ausschnittZeigen();
  if (fertig) tonSetzen();
}
{
  const c = $("ausschnitt-bild"); let zieht = false;
  const hin = (e, fertig) => {
    const q = S.tonQuelle, a = ausschnittJetzt(); if (!q || !a) return;
    const r = c.getBoundingClientRect(), t = ((e.clientX - r.left) / Math.max(1, r.width)) * q.buffer.duration, l = a.bis - a.von;
    ausschnittSetzen(t - l / 2, l, fertig);                                   // der Ausschnitt mittig unter dem Finger
  };
  c.addEventListener("pointerdown", (e) => { if ($("ausschnitt-von").disabled) return; zieht = true; c.setPointerCapture(e.pointerId); hin(e, false); });
  c.addEventListener("pointermove", (e) => { if (zieht) hin(e, false); });
  const los = (e) => { if (!zieht) return; zieht = false; hin(e, true); };
  c.addEventListener("pointerup", los); c.addEventListener("pointercancel", los);
  for (const id of ["ausschnitt-von", "ausschnitt-laenge"]) {
    $(id).addEventListener("input", () => ausschnittSetzen(Number($("ausschnitt-von").value), Number($("ausschnitt-laenge").value), false));
    $(id).addEventListener("change", () => ausschnittSetzen(Number($("ausschnitt-von").value), Number($("ausschnitt-laenge").value), true));
  }
  $("ausschnitt-auto").addEventListener("click", () => { S.ausschnitt = null; ausschnittZeigen(); tonSetzen(); });
  // Anhören: der rohe Ausschnitt der Aufnahme, noch ohne Säubern und Ablauf
  let hoeren = null;
  const stopp = () => { try { hoeren?.quelle.stop(); } catch {} hoeren?.ctx.close(); hoeren = null; $("ausschnitt-hoeren").textContent = "Anhören"; };
  $("ausschnitt-hoeren").addEventListener("click", () => {
    if (hoeren) return stopp();
    const q = S.tonQuelle, a = ausschnittJetzt(); if (!q || !a) return;
    const ctx = new AudioContext(), quelle = ctx.createBufferSource();
    quelle.buffer = q.buffer; quelle.connect(ctx.destination); quelle.onended = () => { if (hoeren?.quelle === quelle) stopp(); };
    quelle.start(0, a.von, a.bis - a.von); hoeren = { ctx, quelle }; $("ausschnitt-hoeren").textContent = "Stopp";
  });
  window.addEventListener("resize", () => ausschnittZeigen());
}
const tonartKnoepfe = wahl("data-tonart", "tonart", ["musik", "stimme"], () => { tonartZeigen(); tonSetzen(); });
tonartZeigen();
$("tondatei").addEventListener("change", async (e) => {
  const datei = e.target.files?.[0]; if (!datei) return;
  melden("Der Ton wird gelesen …");
  try {
    const { tonLesen } = await import("./tonspur.js?v=7");
    const { buffer } = await tonLesen(datei);
    if (S.tonQuelle?.url && !S.tonQuelle.ausVideo) URL.revokeObjectURL(S.tonQuelle.url);
    S.tonQuelle = { buffer, name: datei.name, url: URL.createObjectURL(datei), ausVideo: false };
    S.ausschnitt = null;
    // noch kein Bild (kein Foto, Text oder Video): dann «Nur Ton» – sonst bliebe die Vorschau leer (Rückmeldung vom 18. Oktober 2026: «es passiert
    // nichts im Animationsfenster, wenn ich eine Audiodatei hochlade»)
    const ohneBild = !S.bild || (S.quelle === "text" && !S.text.trim()) || (S.quelle === "video" && !S.video);
    if (ohneBild) { S.quelle = "ton"; merken("quelle", "ton"); quelleZeigen(); quelleKnoepfe.forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.quelle === "ton"))); }
    await tonSetzen({ auffrischen: !ohneBild });
    if (ohneBild) { await papierLaden(); melden("Musik geladen: noch kein Bild gewählt – das Gewebe entsteht aus der Musik allein («Nur Ton»). Foto, Text oder Video lassen sich oben jederzeit wählen."); }
  } catch (fehler) { melden(`Diese Audiodatei kann der Browser nicht lesen (${fehler?.message ?? fehler}).`, true); }
});
/** S.ton aus der gelesenen Datei: so wie sie ist oder verfrickelt */
// Jeder Aufruf bekommt eine Nummer; nur der letzte setzt den Ton (Rückmeldung vom 18. Oktober 2026: «wenn ich das Verfrickeln ausschalte, kommt
// das immer noch verfrickelt» – das Verfrickeln brauchte auf dem Telefon einen Moment, schaltete man inzwischen aus, überschrieb es danach das Original)
async function tonSetzen({ auffrischen = true } = {}) {
  const q = S.tonQuelle; if (!q) return;
  const nr = (S.tonNr = (S.tonNr ?? 0) + 1);
  const rate = q.buffer.sampleRate;
  let kanaele = Array.from({ length: Math.min(2, q.buffer.numberOfChannels) }, (_, k) => q.buffer.getChannelData(k));
  let buffer = q.buffer, url = q.url, name = q.name, mehr = "";
  const pause = () => new Promise((ok) => setTimeout(ok, 30));
  if (S.tonart === "stimme") {
    await ausschnittVorbereiten(q); if (nr !== S.tonNr) return;
    tonartZeigen();
  }
  const aus = S.tonart === "stimme" ? ausschnittJetzt() : null;
  if (aus?.eigen) kanaele = kanaele.map((c) => c.subarray(Math.round(aus.von * rate), Math.round(aus.bis * rate)));
  if (S.tonart === "stimme" && (S.saeubern || S.stimmAblauf || aus?.eigen)) {
    melden(S.saeubern ? "Die Stimme wird gesäubert …" : "Scratch, Stimme und Gefrickel werden gebaut …");
    await pause();
    const [{ saeubern, stimmAblauf }, { wav }] = await Promise.all([import("./stimme.js?v=7"), import("./frickeln.js?v=7")]);
    if (nr !== S.tonNr) return;                                             // inzwischen umgestellt
    let kan = kanaele;
    const teile = aus?.eigen ? [`Ausschnitt ${zeitText(aus.von)}–${zeitText(aus.bis)}`] : [];
    if (S.saeubern) {
      const s = saeubern(kan, rate); kan = s.kanaele;
      teile.push(`gesäubert (Rauschen ${Math.round(s.rauschenVorher)} → ${Math.round(s.rauschenNachher)} dB)`);
      notiz(`Stimme gesäubert: Rauschen ${s.rauschenVorher.toFixed(1)} → ${s.rauschenNachher.toFixed(1)} dB`);
    }
    if (S.stimmAblauf) {
      if (S.saeubern) { melden("Scratch, Stimme und Gefrickel werden gebaut …"); await pause(); if (nr !== S.tonNr) return; }
      const a = stimmAblauf(kan, rate, { samen: S.wurf, dnb: S.stimmDnb, ...(aus?.eigen ? { stimme: aus.bis - aus.von } : {}) }); kan = a.kanaele;
      teile.push(`Scratch, Stimme mit ${a.huepfer.length} Hüpfern, ${a.unterlegt ? "Drum and Bass, " : ""}Gefrickel, Wurf ${S.wurf}`);
      notiz(`Stimmen-Ablauf: Wurf ${S.wurf}, ${a.dauer.toFixed(1)} s, ${a.huepfer.map((h) => h.art).join(", ")}`);
    }
    buffer = new AudioBuffer({ length: kan[0].length, numberOfChannels: 2, sampleRate: rate });
    kan.forEach((c, k) => buffer.copyToChannel(c, k));
    url = URL.createObjectURL(new Blob([wav(kan, rate)], { type: "audio/wav" }));
    name = `${q.name} · ${teile.join(" · ")}`;
  } else if (S.tonart === "musik" && S.frickeln) {
    melden("Der Ton wird verfrickelt …");
    await pause();
    const { frickeln, wav } = await import("./frickeln.js?v=7");
    if (nr !== S.tonNr) return;                                             // inzwischen umgestellt
    const f = frickeln(kanaele, rate, { samen: S.wurf });
    buffer = new AudioBuffer({ length: f.kanaele[0].length, numberOfChannels: 2, sampleRate: rate });
    f.kanaele.forEach((c, k) => buffer.copyToChannel(c, k));
    url = URL.createObjectURL(new Blob([wav(f.kanaele, rate)], { type: "audio/wav" }));
    name = `${q.name} · verfrickelt, Wurf ${S.wurf}`; mehr = ` · ${f.bpm} BPM, ${f.takte} Takte aus ${f.scheiben} Schnipseln`;
    notiz(`Ton verfrickelt: Wurf ${S.wurf}, ${f.bpm} BPM, ${f.dauer.toFixed(1)} s`);
  }
  const pcm = new Float32Array(buffer.length);
  for (let k = 0; k < buffer.numberOfChannels; k++) { const c = buffer.getChannelData(k); for (let i = 0; i < c.length; i++) pcm[i] += c[i] / buffer.numberOfChannels; }
  const analyse = tonAnalysieren(pcm, rate);
  if (S.ton?.wav) URL.revokeObjectURL(S.ton.url);                          // nur die eigene WAV des verfrickelten Stücks
  S.ton = { buffer, analyse, name, url, wav: url !== q.url };
  $("tonspur").src = url;
  $("ton-info").textContent = `${name}${mehr} · ${analyse.dauer.toFixed(1).replace(".", ",")} s · ${analyse.einsaetze.length} Einsätze · ${analyse.schnitte.length} Schnitte`;
  $("ton-weg").hidden = false; $("wuerfeln").hidden = !wuerfelbar();
  notiz(`Ton gelesen: ${analyse.dauer.toFixed(1)} s, ${analyse.einsaetze.length} Einsätze`);
  if (!auffrischen) return;
  melden("Ton bereit: das Gewebe folgt ihm.");
  neu();
}
$("frickeln").addEventListener("change", () => { S.frickeln = $("frickeln").checked; merken("frickeln", S.frickeln ? "1" : "0"); tonartZeigen(); tonSetzen(); });
for (const [id, k] of [["saeubern", "saeubern"], ["stimm-ablauf", "stimmAblauf"], ["stimm-dnb", "stimmDnb"]]) $(id).addEventListener("change", () => { S[k] = $(id).checked; merken(id, S[k] ? "1" : "0"); tonartZeigen(); tonSetzen(); });
$("wuerfeln").addEventListener("click", () => { S.wurf = (S.wurf % 9999) + 1; merken("wurf", String(S.wurf)); tonSetzen(); });
$("ton-weg").addEventListener("click", () => { tonEntfernen(); neu(); });
function tonEntfernen() {
  if (S.ton?.wav) URL.revokeObjectURL(S.ton.url);
  if (S.tonQuelle?.url && !S.tonQuelle.ausVideo) URL.revokeObjectURL(S.tonQuelle.url);
  S.ton = null; S.tonQuelle = null; S.ausschnitt = null; $("ausschnitt").hidden = true; $("tonspur").removeAttribute("src"); $("tondatei").value = ""; $("ton-info").textContent = ""; $("ton-weg").hidden = true; $("wuerfeln").hidden = true;
}
// ausschaltbar: ohne Haken bleiben Vorschau und Video stumm
const tonStumm = () => { $("tonspur").muted = !$("ton-im-video").checked; };
{ const v = erinnern("ton-im-video"); if (v !== null) $("ton-im-video").checked = v === "1"; }
tonStumm();
$("ton-im-video").addEventListener("change", () => { merken("ton-im-video", $("ton-im-video").checked ? "1" : "0"); tonStumm(); });
for (const id of ["tempo"]) { const v = erinnern(id); if (v && [...$(id).options].some((o) => o.value === v)) $(id).value = v; $(id).addEventListener("change", () => { merken(id, $(id).value); neu(); }); }
for (const id of ["signet", "beschriftung", "unschaerfe"]) { const v = erinnern(id); if (v !== null) $(id).checked = v === "1"; $(id).addEventListener("change", () => { merken(id, $(id).checked ? "1" : "0"); if (id !== "unschaerfe") neu(); }); }
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
  if (S.ton) { const a = $("tonspur"); a.currentTime = Math.min(ab, a.duration || ab); tonGesperrt = false; a.play().catch(() => {}); }   // im Klick: so darf er
  if (!S.laeuft) { S.laeuft = true; requestAnimationFrame(takt); }
  $("spielen").textContent = "Anhalten";
}
function anhalten() { S.laeuft = false; $("spielen").textContent = "Abspielen"; $("tonspur").pause(); }
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
// Der Ton folgt der Uhr der Vorschau (Rückmeldung vom 18. Oktober 2026: «der Ton wird nicht abgespielt während der Animation» – lief die Vorschau
// schon, als die Musik kam oder verfrickelt wurde, bekam die Tonspur eine neue Datei, startete aber nie): je Bild nachsehen, ob er läuft und wo
let tonGesperrt = false;
function tonFolgen(t) {
  const a = $("tonspur");
  if (!S.ton || !a.getAttribute("src")) return;
  if (a.duration && t >= a.duration - 0.05) { if (!a.paused) a.pause(); return; }
  if (Math.abs(a.currentTime - t) > 0.25 && a.readyState >= 1) a.currentTime = t;
  if (a.paused && !tonGesperrt) a.play().catch(() => { tonGesperrt = true; if (!a.muted) melden("Der Browser spielt den Ton erst nach einem Tippen: tippe auf «Anhalten» und wieder auf «Abspielen».", true); });
}
document.addEventListener("pointerdown", () => { tonGesperrt = false; }, { capture: true });
function takt(jetzt) {
  if (!S.laeuft || !S.sz) return;
  if (!sichtbar) { S.start += jetzt - (zuletzt || jetzt); zuletzt = jetzt; requestAnimationFrame(takt); return; }
  zuletzt = jetzt;
  const t = (jetzt - S.start) / 1000;
  if (t >= S.sz.zeit.dauer) { anhalten(); zeigeZeit(S.sz.zeit.dauer - 1 / FPS); S.ende = true; return; }
  tonFolgen(t);
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
    const cfg = { codec, width: B, height: H, bitrate: grob ? 8_000_000 : 14_000_000, framerate: FPS,     // Telefon: kleinere Datei (Instagram kodiert ohnehin neu)
      avc: { format: "avc" }, latencyMode: "quality" };
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
  const p = proben(), { tonKodieren, mp4Schreiber } = await import("./tonspur.js?v=7");
  // mit Ton: die Tonspur zuerst kodieren (klein), dann gehen die Bilder gleich beim Kodieren ins MP4 – nie die ganze Datei am Stück im Speicher
  let ton = null;
  if (S.ton && $("ton-im-video").checked) {
    melden("Der Ton wird kodiert …");
    ton = await tonKodieren(S.ton.buffer, sz.zeit.dauer);
    if (!ton) melden("Dieser Browser kann den Ton nicht kodieren; das Video ist ohne Ton.", true);
  }
  melden(p > 1 ? `Video wird gerechnet, mit Bewegungsunschärfe (${p} Proben je Bild) …` : "Video wird gerechnet …");
  const c = leinwand(sz.breite, sz.hoehe), ctx = c.getContext("2d", { alpha: false });
  const n = sz.zeit.bilder, datei = mp4Schreiber({ breite: sz.breite, hoehe: sz.hoehe, fps: FPS, codec: cfg.codec, bilder: n, ton });
  let avcC = null, fehler = null;
  const enc = new VideoEncoder({
    output: (chunk, meta) => {
      try {
        if (meta?.decoderConfig?.description && !avcC) { const d = meta.decoderConfig.description; avcC = new Uint8Array(d.buffer ? d.buffer.slice(d.byteOffset, d.byteOffset + d.byteLength) : d); }
        if (!avcC) throw new Error("der Encoder hat keine Beschreibung geliefert");
        const daten = new Uint8Array(chunk.byteLength); chunk.copyTo(daten);
        datei.bild(daten, chunk.type === "key", chunk.timestamp, avcC);
      } catch (e) { fehler ??= e; }
    },
    error: (e) => { fehler ??= e; },
  });
  enc.configure(cfg);
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
  const art = `MP4 (H.264, ${cfg.codec}, ${Math.round(cfg.bitrate / 1e6)} Mbit/s)${p > 1 ? ` · Bewegungsunschärfe ${p} Proben` : ""}${ton ? ` · Ton ${ton.codec === "aac" ? "AAC" : "Opus"}` : ""}`;
  return { blob: datei.fertig(), endung: "mp4", art };
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
  for (const el of [$("datei"), $("testbild"), ...formatKnoepfe, ...ablaufKnoepfe, ...quelleKnoepfe, $("text"), $("videodatei"), $("tondatei"), $("ton-weg"), $("frickeln"), $("saeubern"), $("stimm-ablauf"), $("stimm-dnb"), $("ausschnitt-von"), $("ausschnitt-laenge"), $("ausschnitt-auto"), ...tonartKnoepfe, $("wuerfeln"), $("video"), $("png")])
    el.disabled = an || ((el.id === "video" || el.id === "png") && !S.A) || (el.id === "stimm-dnb" && !S.stimmAblauf) || (el.id === "ausschnitt-auto" && !S.ausschnitt);
}
