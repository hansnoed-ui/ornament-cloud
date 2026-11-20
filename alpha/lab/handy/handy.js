// ornament.lab · Handy (20. November 2026). Wunsch: «ornament.lab in ein Handyformat bringen, das einige zentrale Möglichkeiten so präsentiert,
// dass es am Handy übersichtlich bedienbar bleibt … Buttons zum Zuschalten von Bildschirmen wie bei Multiverse oder Wischen … kein grosses
// Scrolling, ein Top-Design, ganz neu». Dazu: «Kommt jev ins Spiel?» und «Gibt es eine Galerie für die Nacheinander- und Nebeneinander-Bilder?»
//
// Sechs Bildschirme (Material, Effekt, Varianten, Klang, Film, Galerie), je einer passt auf den Bildschirm. Die Oberfläche ist neu, das Rechnen
// nicht: dieselben Module wie das Lab (kern/, operationen/, medien/, jev/), dasselbe Projektformat. Ein hier gesichertes Projekt öffnet das
// ganze Lab und umgekehrt. Das Lab selbst bleibt unverändert.
import { labRegister } from "../operationen/index.js";
import { browserMedien } from "../medien/browser.js";
import { dateiLesen, zugriffsMeldung } from "../medien/dateilesen.js";
import { videoAus, FPS } from "../medien/video.js";
import { gpuEffekte } from "../medien/gpu.js";
import * as P from "../kern/projekt.js";
import { fuehreAus, neuerStartwert } from "../kern/ausfuehrung.js";
import * as ST from "../kern/stationen.js";
import { packeBlob, entpacke, ENDUNG, HOECHSTENS } from "../kern/archiv.js";
import { jevVerfuegbar, jevWahl, jevKomposition, jevBeat, jevPruefen } from "../jev/jev.js";
import { BILD_EFFEKTE, BEAT_FRAGEN } from "../jev/fragen.js";
import { beatMessen, regelPlan, planAusJev } from "../kern/beat.js";
import * as ZS from "../kern/zusammenstellung.js";
import * as VS from "../kern/vorschlag.js";
import { N, ZEICHEN as PIXELZEICHEN } from "./zeichen.js?v=1";
import { EFFEKTE, NAMEN } from "./auswahl.js?v=1";

export const HANDY_VERSION = "1.0.0";
const R = labRegister();
const $ = (id) => document.getElementById(id);

const SEITE = 1080;          // Rechengrösse am Handy (das Lab rechnet bis 1200)
const VORSCHAU = 256;        // die kleinen Bilder im Streifen

const S = {
  projekt: P.neuesProjekt({ titel: "Handy" }), medien: browserMedien(), aktuell: null, ton: null,
  effekt: null, anteil: 1, vorschau: null, vorschauFuer: null, jevEffekt: null,
  mod: "sinus", varianten: null, variante: null,
  beat: { plan: null, quelle: null, kit: null, ergebnis: null, jevFehler: "" },
  film: { format: "material", zusammen: null, messung: null, video: null, zettel: true, orna: true, eigene: [] },
  galerie: null, gross: null, feld: 0, laeuft: null, ungespeichert: false,
};
globalThis.ornamentLabHandy = S;   // für Browsertests

// ---------- Hilfen ----------
function el(tag, attrs = {}, ...kinder) {
  const e = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (v === null || v === undefined || v === false) continue;
    if (k.startsWith("on")) e.addEventListener(k.slice(2), v);
    else if (k === "text") e.textContent = v;
    else if (k === "style") e.style.cssText = v;
    else e.setAttribute(k, v === true ? "" : v);
  }
  for (const c of kinder.flat()) if (c !== null && c !== undefined && c !== false) e.append(c instanceof Node ? c : document.createTextNode(String(c)));
  return e;
}
const sekunden = (s) => `${(Math.round(s * 10) / 10).toLocaleString("de-CH")} s`;
const slug = (s) => String(s).toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 40) || "handy";
const kurz = (t) => String(t).split(":")[0];
const effektVon = (opId) => EFFEKTE.find((x) => x.id === opId);
const bild = (id) => (id ? P.ergebnis(S.projekt, id) : null);
const url = (id) => S.medien.url(bild(id));
const bilder = () => S.projekt.ergebnisse.filter((x) => x.typ === "IMAGE");
const geaendert = () => { S.ungespeichert = true; };

let toastZeit;
function toast(text, fehler = false) {
  const t = $("toast"); t.textContent = text; t.classList.toggle("fehler", fehler); t.classList.add("da");
  clearTimeout(toastZeit); toastZeit = setTimeout(() => t.classList.remove("da"), fehler ? 5200 : 2800);
}
function herunterladen(blob, name) {
  const a = el("a", { href: URL.createObjectURL(blob), download: name });
  document.body.append(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 120000);   // Chrome auf Android liest grosse Dateien erst nach dem Nachfragen
}
let gpuZustand;
function gpu() {
  if (gpuZustand === undefined) { try { gpuZustand = gpuEffekte(); } catch (x) { console.warn("WebGL 2:", x.message); gpuZustand = null; } }
  return gpuZustand;
}

// ---------- Rechnen: ein Auftrag zur Zeit, mit Schleier auf der Bühne und Abbrechen ----------
function arbeit(text, anteil = null) {
  $("arbeit").hidden = false; $("arbeitText").textContent = text;
  const b = $("balken"); b.parentElement.classList.toggle("unbestimmt", anteil === null);
  if (anteil !== null) b.style.width = `${Math.round(Math.max(0, Math.min(1, anteil)) * 100)}%`;
}
async function laufen(text, fn) {
  if (S.laeuft) { toast("Es rechnet schon. Erst fertig rechnen lassen oder abbrechen."); return false; }
  S.laeuft = new AbortController(); arbeit(text); knoepfe();
  try { await fn(S.laeuft.signal); geaendert(); return true; }
  catch (f) {
    f = zugriffsMeldung(f, new Blob());
    if (f.name === "AbortError") toast("Abgebrochen."); else { console.warn(f); toast(`Fehler: ${f.message}`, true); }
    return false;
  } finally { S.laeuft = null; $("arbeit").hidden = true; alles(); }
}
const melden = (text, anteil = null) => { if (S.laeuft) arbeit(text, anteil); };
$("abbrechen").addEventListener("click", () => S.laeuft?.abort());

// ---------- Pixel-Schalter (Zeichen 13 × 13 wie im Multiverse) und Wechsel der Bildschirme ----------
const pult = $("pult"), leiste = $("leiste");
const ruhig = () => matchMedia("(prefers-reduced-motion: reduce)").matches;
const ZEICHEN = PIXELZEICHEN;
const schalter = NAMEN.map((n, i) => {
  const b = el("button", { class: "schalter", type: "button", "aria-label": n }, el("span", { class: "knauf" }, el("canvas", { width: N, height: N, "aria-hidden": "true" })), n);
  b.addEventListener("click", () => zu(i));
  leiste.append(b);
  return { b, knauf: b.firstChild, g: b.querySelector("canvas").getContext("2d"), t0: 0, an: false };
});
function farbe(name) { return getComputedStyle(document.documentElement).getPropertyValue(name).trim(); }
function malen(jetzt = performance.now()) {
  let weiter = false;
  const lab = farbe("--lab"), grau = farbe("--grau");
  schalter.forEach((s, i) => {
    const k = s.an ? Math.min(1, (jetzt - s.t0) / 560) : 1, g = s.g;
    g.clearRect(0, 0, N, N); g.fillStyle = s.an ? lab : grau;
    for (const [x, y, a] of ZEICHEN[i]) {
      // beim Einschalten fliegen die Pixel von aussen zu ihrem Platz (wie das Zerstieben im Pixel-Schalter)
      const w = (x * 7.3 + y * 13.1) % 6.283, d = (1 - k) * (1 - k) * 6;
      g.globalAlpha = a * (s.an ? .35 + .65 * k : .8);
      g.fillRect(Math.round(x + Math.cos(w) * d), Math.round(y + Math.sin(w) * d), 1, 1);
    }
    if (k < 1) weiter = true;
  });
  if (weiter) requestAnimationFrame(malen);
}
matchMedia("(prefers-color-scheme: dark)").addEventListener?.("change", () => malen());

function zu(i) {
  pult.scrollTo({ left: i * pult.clientWidth, behavior: ruhig() ? "auto" : "smooth" });
  setze(i);
}
function setze(i) {
  const neu = S.feld !== i || !schalter[i].an;
  S.feld = i;
  schalter.forEach((s, j) => { const an = j === i; if (an && !s.an) s.t0 = ruhig() ? -1e9 : performance.now(); s.an = an; s.b.setAttribute("aria-current", String(an)); });
  requestAnimationFrame(malen);
  $("ort").textContent = `${i + 1} / 6 · ${NAMEN[i]}`;
  try { history.replaceState(null, "", `#${NAMEN[i].toLowerCase()}`); } catch { /* egal */ }
  if (neu) { if (i === 1) vorschauenStarten(); buehne(); }
}
let wischZeit;
pult.addEventListener("scroll", () => { clearTimeout(wischZeit); wischZeit = setTimeout(() => setze(Math.round(pult.scrollLeft / pult.clientWidth)), 80); }, { passive: true });
addEventListener("resize", () => pult.scrollTo({ left: S.feld * pult.clientWidth }));

// ---------- Bühne: zeigt, was zum Bildschirm gehört ----------
const grund = $("grundbild"), wirkung = $("wirkung"), filmEl = $("film"), raster6 = $("raster6"), welle = $("welle");
function seitenverhaeltnis() {
  const e = bild(S.aktuell);
  if (S.feld === 4 && S.film.video) return `${S.film.video.breite} / ${S.film.video.hoehe}`;
  if (S.feld === 4 && S.film.format !== "material") { const f = ZS.FORMATE[S.film.format]; return `${f.b} / ${f.h}`; }
  return e ? `${e.breite} / ${e.hoehe}` : "3 / 4";
}
function etikett(...teile) { $("etikett").replaceChildren(...teile.filter(Boolean).map((t) => el("span", {}, ...(Array.isArray(t) ? [el("i", { text: "● " }), t[0]] : [t])))); }
function buehne() {
  const i = S.feld, e = bild(S.aktuell);
  $("rahmen").style.setProperty("--seite", seitenverhaeltnis());
  $("leer").hidden = Boolean(e);
  const zeigeGrund = Boolean(e) && !(i === 4 && S.film.video);
  grund.hidden = !zeigeGrund; if (zeigeGrund && grund.getAttribute("src") !== url(S.aktuell)) grund.src = url(S.aktuell);
  if (zeigeGrund && i === 4 && S.film.format !== "material") grund.style.objectFit = "cover"; else grund.style.objectFit = "";
  // Effekt: die Vorschau liegt über dem Ausgang, der Anteil blendet sofort (gerechnet wird er erst beim Anwenden)
  const v = i === 1 && S.vorschau && S.vorschauFuer === `${S.aktuell}|${S.effekt}` ? bild(S.vorschau) : null;
  wirkung.hidden = !v; if (v) { if (wirkung.getAttribute("src") !== url(v.id)) wirkung.src = url(v.id); wirkung.style.opacity = R.hole(S.effekt).parameter.some((p) => p.id === "anteil") ? S.anteil : 1; }
  raster6.hidden = !(i === 2 || i === 5);
  if (i === 2) variantenBuehne(); if (i === 5) galerieBuehne();
  filmEl.hidden = !(i === 4 && S.film.video);
  if (i === 4 && S.film.video) { if (filmEl.getAttribute("src") !== S.film.video.url) filmEl.src = S.film.video.url; } else filmEl.pause();
  welle.hidden = !(i === 3 && S.beat.ergebnis); if (!welle.hidden) welleZeichnen();
  const ef = S.effekt ? effektVon(S.effekt)?.name : null;
  if (!e) etikett();
  else if (i === 0) etikett(e.titel.replace(/\.(jpe?g|png|webp)/i, ""), `${e.breite} × ${e.hoehe}`, bild(S.ton) ? ["Ton"] : null);
  else if (i === 1) etikett(ef ? [ef] : "Effekt wählen", ef && R.hole(S.effekt).parameter.some((p) => p.id === "anteil") ? `Anteil ${Math.round(S.anteil * 100)} %` : null, S.jevEffekt ? "jev hat gewichtet" : null);
  else if (i === 3) etikett(S.beat.ergebnis ? [bild(S.beat.ergebnis).titel.split("·")[0].trim()] : "noch kein Klang", S.beat.quelle ? (S.beat.quelle === "jev" ? "gewählt von jev" : "nach Regeln") : null);
  else if (i === 4) etikett(S.film.video ? [`Film · ${sekunden(S.film.video.bilder / FPS)}`] : "Vorschau", S.film.video ? `${S.film.video.breite} × ${S.film.video.hoehe}` : null);
  else etikett();
}

// ---------- 1 · Material ----------
const gewaehlt = (fn) => async (ev) => { const f = ev.target.files[0]; try { if (f) await fn(f); } finally { ev.target.value = ""; } };
async function importiere(datei) {
  if (datei.type.startsWith("video/") || (!datei.type && /\.(mp4|m4v|mov|webm)$/i.test(datei.name))) return importiereVideo(datei);
  if (datei.type.startsWith("audio/") || (!datei.type && /\.(wav|mp3|ogg|flac|m4a|aac|opus)$/i.test(datei.name))) return importiereTon(datei);
  await laufen(`${datei.name} wird gelesen …`, async () => {
    const { original, arbeit: a } = await S.medien.importiere(datei);
    const e = P.fuegeMaterialHinzu(S.projekt, { titel: original.name, mime: "image/png", herkunft: { original, hinweis: a.width < original.breite || a.height < original.hoehe ? `auf ${a.width} × ${a.height} px verkleinert (Arbeitsgrösse)` : "Originalgrösse", oberflaeche: "handy" } });
    Object.assign(e, await S.medien.ablegen(e, a));
    neuerAusgang(e.id);
    toast(`${original.breite} × ${original.hoehe} px. Wische weiter zu «Effekt».`);
  });
}
async function importiereTon(datei) {
  await laufen(`${datei.name} wird gelesen …`, async () => {
    const imp = await S.medien.importiereTon(datei);
    const e = P.fuegeMaterialHinzu(S.projekt, { titel: imp.original.name, typ: "AUDIO", mime: imp.mime, ton: imp.ton, herkunft: { original: imp.original, hinweis: sekunden(imp.ton.dauer), oberflaeche: "handy" } });
    Object.assign(e, await S.medien.ablegenTon(e, imp));
    S.ton = e.id; S.film.messung = null;
    toast(`Ton: ${sekunden(imp.ton.dauer)}. Er wird die Tonspur des Films.`);
  });
}
async function importiereVideo(datei) {
  await laufen(`${datei.name} wird gelesen …`, async () => {
    const imp = await S.medien.importiereVideo(datei, { melden });
    const video = { name: imp.original.name, sha256: imp.original.sha256, dauer: imp.original.dauer, breite: imp.original.breite, hoehe: imp.original.hoehe, ...(imp.ton ? {} : { tonFehler: imp.tonFehler ?? "keine Tonspur" }) };
    const ids = [];
    for (const b of imp.bilder) {
      const e = P.fuegeMaterialHinzu(S.projekt, { titel: `${imp.original.name} · ${sekunden(b.zeit)}`, mime: "image/png", herkunft: { original: imp.original, video: { ...video, zeit: b.zeit }, hinweis: `Standbild bei ${sekunden(b.zeit)}`, oberflaeche: "handy" } });
      Object.assign(e, await S.medien.ablegen(e, b.arbeit)); ids.push(e.id);
    }
    if (imp.ton) {
      const t = P.fuegeMaterialHinzu(S.projekt, { titel: `${imp.original.name} · Ton`, typ: "AUDIO", mime: "audio/wav", ton: imp.ton.ton, herkunft: { original: imp.ton.original, video, leseweg: imp.ton.leseweg, hinweis: "Tonspur des Videos", oberflaeche: "handy" } });
      Object.assign(t, await S.medien.ablegenTon(t, imp.ton)); S.ton = t.id;
    }
    neuerAusgang(ids[0]);
    toast(`${ids.length} Standbilder${imp.ton ? " und die Tonspur" : `, ohne lesbaren Ton (${video.tonFehler})`}.`, !imp.ton);
  });
}
/** ein neues Bild wird Ausgang: Vorschauen, Varianten und Messungen gehören zum alten */
function neuerAusgang(id) {
  S.aktuell = id; S.vorschau = null; S.vorschauFuer = null; S.varianten = null; S.variante = null; S.jevEffekt = null;
  S.film.messung = null; vorschauen.clear(); vorschauenStarten();
}
$("datei").addEventListener("change", gewaehlt(importiere));
$("videodatei").addEventListener("change", gewaehlt(importiereVideo));
$("tondatei").addEventListener("change", gewaehlt(importiereTon));
$("beispiel").addEventListener("click", async () => {
  try { const r = await fetch("../../the-fictory/beispiel.jpg"); await importiere(new File([await r.blob()], "beispiel.jpg (The Fictory)", { type: "image/jpeg" })); }
  catch (f) { toast(`Das Beispielbild liess sich nicht laden: ${f.message}`, true); }
});
$("oeffnen").addEventListener("change", gewaehlt(async (datei) => {
  if (S.ungespeichert && S.projekt.ergebnisse.length && !(await bestaetigen("Das jetzige Projekt ist nicht gesichert. Trotzdem öffnen?"))) return;
  await laufen(`${datei.name} wird geöffnet …`, async () => {
    const { projekt, medien, fehlt } = await entpacke(await dateiLesen(datei));
    projekt.exporte ??= [];
    S.projekt = projekt; S.medien.uebernehmen(medien);
    const gew = [...projekt.knoten].reverse().find((k) => k.gewaehlt)?.gewaehlt;
    S.ton = projekt.ergebnisse.filter((e) => e.typ === "AUDIO").at(-1)?.id ?? null;
    S.film = { ...S.film, zusammen: null, messung: null, video: null, eigene: [] };
    S.beat = { plan: null, quelle: null, kit: null, ergebnis: S.ton, jevFehler: "" };
    neuerAusgang(gew ?? bilder().at(-1)?.id ?? null);
    toast(`«${projekt.titel}»: ${projekt.ergebnisse.length} Ergebnisse${fehlt.length ? `, ${fehlt.length} Dateien fehlen` : ""}.`, fehlt.length > 0);
  });
  S.ungespeichert = false;
}));
/** eine Rückfrage auf der Bühne statt confirm() (das manche Handy-Ansichten unterdrücken) */
function bestaetigen(frage) {
  return new Promise((ja) => {
    const box = el("div", { class: "arbeit" }, el("p", { text: frage }),
      el("div", { class: "reihe" }, el("button", { class: "knopf klein", type: "button", onclick: () => { box.remove(); ja(false); }, text: "Nein" }),
        el("button", { class: "knopf klein", type: "button", onclick: () => { box.remove(); ja(true); }, text: "Ja" })));
    $("buehne").append(box);
  });
}

// ---------- 2 · Effekt: kleine Vorschauen aus dem eigenen Bild, die grosse beim Antippen ----------
const vorschauen = new Map();   // opId → URL der kleinen Vorschau (in einem Nebenprojekt gerechnet, nicht im Projekt)
let vorschauLauf = 0;
async function vorschauenStarten() {
  const quelle = bild(S.aktuell);
  if (!quelle || S.feld !== 1 && S.feld !== 0) return;
  const lauf = ++vorschauLauf;
  const neben = P.neuesProjekt(), medien = browserMedien();
  try {
    const b = await S.medien.bild(quelle);
    const m = P.fuegeMaterialHinzu(neben, { titel: "vorschau", mime: "image/png" });
    Object.assign(m, await medien.ablegen(m, verkleinert(b, VORSCHAU)));
    for (const x of EFFEKTE) {
      if (lauf !== vorschauLauf) return;
      if (vorschauen.has(x.id)) continue;
      const op = R.hole(x.id);
      const parameter = op.parameter.some((p) => p.id === "seite") ? { seite: Math.max(VORSCHAU, op.parameter.find((p) => p.id === "seite").min ?? VORSCHAU) } : {};
      if (x.id === "lab.feedback") parameter.iterationen = 10;
      const { ergebnisse } = await fuehreAus({ register: R, projekt: neben, medien, auftrag: { operation: x.id, eingaben: { [op.eingaenge[0].name]: m.id }, parameter, seed: 7, variation: { anzahl: 1, achse: "varianten", routen: [] }, wahl: { art: "regel", details: { anlass: "Vorschau" } } } });
      vorschauen.set(x.id, medien.url(ergebnisse[0]));
      effekteZeigen();
      await new Promise((r) => setTimeout(r, 0));
    }
  } catch (f) { console.warn("Vorschau:", f); }
}
function verkleinert(b, seite) {
  const k = Math.min(1, seite / Math.max(b.width, b.height)), w = Math.max(1, Math.round(b.width * k)), h = Math.max(1, Math.round(b.height * k));
  const c = new OffscreenCanvas(b.width, b.height); c.getContext("2d").putImageData(b instanceof ImageData ? b : new ImageData(new Uint8ClampedArray(b.data), b.width, b.height), 0, 0);
  const d = new OffscreenCanvas(w, h), g = d.getContext("2d", { willReadFrequently: true }); g.drawImage(c, 0, 0, w, h);
  return g.getImageData(0, 0, w, h);
}
function effekteZeigen() {
  const box = $("effekte"), p = S.jevEffekt?.wahrscheinlichkeiten ?? {};
  box.replaceChildren(...EFFEKTE.map((x) => el("button", { class: "wahl", type: "button", "aria-pressed": String(S.effekt === x.id), "data-op": x.id, onclick: () => effektWaehlen(x.id) },
    el("span", { class: "bildchen", style: vorschauen.get(x.id) ? `background-image:url("${vorschauen.get(x.id)}")` : bild(S.aktuell) ? `background-image:url("${url(S.aktuell)}");filter:grayscale(1) opacity(.35)` : "" },
      p[x.id] !== undefined ? el("b", { class: "p", text: `${Math.round(p[x.id] * 100)}` }) : null),
    el("span", { text: x.name }))));
  $("effektname").textContent = S.effekt ? effektVon(S.effekt).name : "wähle einen";
  const mitAnteil = S.effekt && R.hole(S.effekt).parameter.some((x) => x.id === "anteil");
  $("anteil").disabled = !mitAnteil;
}
async function effektWaehlen(opId, wahl = null) {
  S.effekt = opId; S.effektWahl = wahl; effekteZeigen();
  if (!bild(S.aktuell)) { toast("Zuerst ein Bild unter «Material»."); return; }
  const schluessel = `${S.aktuell}|${opId}`;
  if (S.vorschauFuer === schluessel) { buehne(); return; }
  await laufen(`${effektVon(opId).name} wird gerechnet …`, async (signal) => {
    // die grosse Vorschau entsteht im Projekt (mit Anteil 1): «Anwenden» nimmt sie, wenn der Anteil 100 % ist, sonst wird mit dem Anteil gerechnet
    const op = R.hole(opId);
    const r = await fuehreAus({ register: R, projekt: S.projekt, medien: S.medien, abbrechen: signal, melden: (t, a) => melden(t, a),
      auftrag: { operation: opId, eingaben: { [op.eingaenge[0].name]: S.aktuell }, parameter: parameterFuer(opId, 1), seed: neuerStartwert(), variation: { anzahl: 1, achse: "varianten", routen: [] }, wahl: wahl ?? { art: "mensch", details: { oberflaeche: "handy", anlass: "Vorschau" } } } });
    S.vorschau = r.ergebnisse[0].id; S.vorschauFuer = schluessel; S.vorschauKnoten = r.knoten.id;
  });
}
function parameterFuer(opId, anteil = S.anteil) {
  const op = R.hole(opId), p = {};
  if (op.parameter.some((x) => x.id === "seite")) p.seite = Math.min(SEITE, op.parameter.find((x) => x.id === "seite").max);
  if (op.parameter.some((x) => x.id === "anteil")) p.anteil = Math.round(anteil * 100) / 100;
  return p;
}
$("anteil").addEventListener("input", (ev) => { S.anteil = ev.target.value / 100; $("anteilWert").textContent = `${ev.target.value} %`; buehne(); });
$("anwenden").addEventListener("click", anwenden);
async function anwenden() {
  if (!S.effekt || !S.vorschau) return;
  const mitAnteil = R.hole(S.effekt).parameter.some((x) => x.id === "anteil");
  if (!mitAnteil || S.anteil >= 0.995) { weiterfuehren(S.vorschau, "Angewendet. Das ist jetzt dein Bild."); return; }
  await laufen(`${effektVon(S.effekt).name} mit ${Math.round(S.anteil * 100)} % …`, async (signal) => {
    const op = R.hole(S.effekt);
    const r = await fuehreAus({ register: R, projekt: S.projekt, medien: S.medien, abbrechen: signal, melden,
      auftrag: { operation: S.effekt, eingaben: { [op.eingaenge[0].name]: S.aktuell }, parameter: parameterFuer(S.effekt), seed: P.knoten(S.projekt, S.vorschauKnoten)?.seed ?? neuerStartwert(), variation: { anzahl: 1, achse: "varianten", routen: [] }, wahl: S.effektWahl ?? { art: "mensch", details: { oberflaeche: "handy" } } } });
    S.vorschauFertig = r.ergebnisse[0].id;
  });
  if (S.vorschauFertig) { weiterfuehren(S.vorschauFertig, "Angewendet. Das ist jetzt dein Bild."); S.vorschauFertig = null; }
}
function weiterfuehren(id, meldung) {
  P.waehleVariante(S.projekt, id, "mensch", { oberflaeche: "handy" });
  const effekt = S.effekt;
  neuerAusgang(id); S.effekt = effekt; geaendert();
  toast(meldung); alles();
}
// jev schlägt den nächsten Effekt vor: Wahrscheinlichkeiten für sechs Effekte (jev/wahl.php nimmt 2–6), der wahrscheinlichste wird gewählt
$("jevEffekt").addEventListener("click", async () => {
  if (!bild(S.aktuell)) { toast("Zuerst ein Bild unter «Material»."); return; }
  const verlauf = P.verlauf(S.projekt, S.aktuell).schritte.map((s) => s.knoten.operation);
  const letzte = verlauf.at(-1);
  const optionen = EFFEKTE.map((x) => x.id).filter((id) => id !== letzte).sort((a, b) => hash(a + S.aktuell) - hash(b + S.aktuell)).slice(0, 6);
  if (!jevVerfuegbar()) { toast("jev ist gerade nicht erreichbar. Wähle selbst, die Regeln des Labs gelten weiter.", true); return; }
  let antwort = null;
  await laufen("jev wird gefragt …", async () => { antwort = await jevWahl({ verlauf, optionen }); });
  if (!antwort) return;
  S.jevEffekt = antwort; effekteZeigen();
  const [id, p] = Object.entries(antwort.wahrscheinlichkeiten).sort((a, b) => b[1] - a[1])[0];
  toast(`jev: ${effektVon(id).name} (p = ${p.toFixed(2)})${antwort.zwischengespeichert ? ", aus dem Zwischenspeicher" : ""}.`);
  effektWaehlen(id, { art: "jev", details: { quelle: antwort.quelle, modell: antwort.modell, wahrscheinlichkeit: p, wahrscheinlichkeiten: antwort.wahrscheinlichkeiten, lage: antwort.lage, zwischengespeichert: antwort.zwischengespeichert, gefragt: antwort.zeit, oberflaeche: "handy" } });
});
const hash = (s) => { let h = 2166136261; for (const c of s) h = Math.imul(h ^ c.charCodeAt(0), 16777619); return h >>> 0; };

// ---------- 3 · Varianten: sechs nebeneinander, ein Parameter verteilt ----------
async function variantenRechnen() {
  if (!bild(S.aktuell)) { toast("Zuerst ein Bild unter «Material»."); return; }
  if (!S.effekt) { toast("Wähle zuerst unter «Effekt» einen Effekt."); zu(1); return; }
  const x = effektVon(S.effekt), op = R.hole(S.effekt), seed = neuerStartwert();
  const routen = [{ ziel: x.ziel, tiefe: 0.5, polaritaet: "bipolar", modulator: { quelle: S.mod, frequenz: 1, phase: 0, seed, stufen: 6 } }];
  await laufen(`Sechs Varianten: ${x.name} …`, async (signal) => {
    const r = await fuehreAus({ register: R, projekt: S.projekt, medien: S.medien, abbrechen: signal, melden,
      auftrag: { operation: S.effekt, eingaben: { [op.eingaenge[0].name]: S.aktuell }, parameter: parameterFuer(S.effekt), seed, variation: { anzahl: 6, achse: "varianten", routen }, wahl: { art: "mensch", details: { oberflaeche: "handy", verteilung: S.mod } } } });
    S.varianten = { fuer: S.aktuell, op: S.effekt, ids: r.ergebnisse.filter((e) => e.typ === "IMAGE").map((e) => e.id), ziel: x.ziel };
    S.variante = null;
  });
}
function variantenBuehne() {
  raster6.classList.remove("zwei");
  const v = S.varianten && S.varianten.fuer === S.aktuell ? S.varianten : null;
  if (!v) {
    raster6.replaceChildren(el("p", { class: "hinweis", text: S.effekt ? `«Sechs rechnen» verteilt ${R.hole(S.effekt).parameter.find((p) => p.id === effektVon(S.effekt).ziel)?.name ?? "einen Parameter"} über sechs Varianten.` : "Wähle zuerst unter «Effekt» einen Effekt, dann rechnet das Lab hier sechs Varianten." }));
    return;
  }
  const op = R.hole(v.op), pn = op.parameter.find((p) => p.id === v.ziel);
  raster6.replaceChildren(...v.ids.map((id, k) => {
    const e = bild(id), w = e.variante?.parameter?.[v.ziel];
    return el("button", { type: "button", "aria-pressed": String(S.variante === id), "aria-label": `Variante ${k + 1}`, onclick: () => { S.variante = S.variante === id ? null : id; knoepfe(); variantenBuehne(); } },
      el("img", { src: S.medien.url(e), alt: "" }), w !== undefined ? el("small", { text: `${Math.round(w * 1000) / 1000}` }) : null);
  }));
  $("variantenText").textContent = pn ? `${pn.name.replace(/\s*\(.*\)$/, "")} verteilt` : "sechs nebeneinander";
}
$("mod").addEventListener("click", (ev) => { const b = ev.target.closest(".pille"); if (!b) return; S.mod = b.dataset.mod; for (const p of $("mod").children) p.setAttribute("aria-pressed", String(p === b)); });
$("variantenRechnen").addEventListener("click", variantenRechnen);
$("weiter").addEventListener("click", () => { if (S.variante) weiterfuehren(S.variante, "Weitergeführt. Diese Variante ist jetzt dein Bild."); });

// ---------- 4 · Klang: Beat aus dem Bild (Regeln oder jev), Schlagzeug wählbar ----------
const KITS = ["jazz", "trocken", "hand", "elektronisch", "weich", "glitch", "jungle", "metallisch"];
function kitsZeigen() {
  const kat = BEAT_FRAGEN.kit.katalog;
  $("kit").replaceChildren(...KITS.filter((k) => kat[k]).map((k) => el("button", { class: "pille", type: "button", "aria-pressed": String((S.beat.kit ?? S.beat.plan?.kit) === k), "data-kit": k,
    onclick: () => { S.beat.kit = S.beat.kit === k ? null : k; kitsZeigen(); if (S.beat.plan) beatRechnen(S.beat.quelle); }, text: kurz(kat[k]).replace(/^./, (c) => c.toUpperCase()) })));
}
async function beatRechnen(art) {
  const e = bild(S.aktuell) ?? bilder().find((x) => !x.knoten);
  if (!e) { toast("Zuerst ein Bild unter «Material»."); return null; }
  let fertig = null;
  await laufen("Das Bild wird gehört …", async (signal) => {
    const quelle = e.herkunft?.video;
    const ids = quelle ? bilder().filter((x) => !x.knoten && x.herkunft?.video?.sha256 === quelle.sha256).sort((a, b) => a.herkunft.video.zeit - b.herkunft.video.zeit).slice(0, 6).map((x) => x.id) : [e.id];
    const messung = beatMessen(await Promise.all(ids.map((id) => S.medien.bild(bild(id)))));
    const seed = neuerStartwert();
    let plan, wahl, jevFehler = "";
    if (art === "jev" && jevVerfuegbar()) {
      melden("jev wählt Tempo, Groove, Klänge und Tonart …");
      try { const a = await jevBeat({ merkmale: messung.merkmale }, { abbrechen: signal }); plan = planAusJev(a.antworten, seed); wahl = { art: "jev", details: { anlass: "Beat aus Bild", quelle: a.quelle, modell: a.modell, antworten: a.antworten, lage: a.lage, zwischengespeichert: a.zwischengespeichert, gefragt: a.zeit, gezogen: seed, oberflaeche: "handy" } }; }
      catch (f) { if (f.name === "AbortError") throw f; jevFehler = f.message; }
    } else if (art === "jev") jevFehler = "nicht erreichbar";
    if (!plan) { const r = regelPlan(messung.merkmale); plan = r.plan; wahl = { art: "regel", details: { anlass: "Beat aus Bild", gruende: r.gruende, merkmale: messung.merkmale, ...(jevFehler ? { ohneJev: jevFehler } : {}), oberflaeche: "handy" } }; art = "regel"; }
    if (S.beat.kit && S.beat.kit !== plan.kit) { plan = { ...plan, kit: S.beat.kit }; wahl = { art: "mensch", details: { anlass: "Beat aus Bild", geaendert: ["kit"], vorschlag: wahl.art, ...wahl.details } }; }
    melden("Der Beat wird gespielt und gemischt …");
    const eingaben = Object.fromEntries(ids.map((id, i) => [i ? `bild${i + 1}` : "bild", id]));
    const r = await fuehreAus({ register: R, projekt: S.projekt, medien: S.medien, melden, abbrechen: signal, auftrag: { operation: "lab.beat", eingaben, parameter: { ...plan, dauer: 30 }, seed, wahl } });
    const ton = r.ergebnisse.find((x) => x.typ === "AUDIO");
    Object.assign(S.beat, { plan, quelle: art, ergebnis: ton.id, jevFehler });
    S.ton = ton.id; S.film.messung = null; fertig = ton.id;
    $("audio").src = S.medien.url(ton);
    if (jevFehler) toast(`jev ${jevFehler}: nach Regeln gemacht.`, true);
  });
  return fertig;
}
$("beatRegel").addEventListener("click", () => beatRechnen("regel"));
$("beatJev").addEventListener("click", () => beatRechnen("jev"));
const audio = $("audio");
$("hoeren").addEventListener("click", () => { if (audio.paused) audio.play().catch((f) => toast(f.message, true)); else audio.pause(); });
audio.addEventListener("play", () => { $("hoeren").textContent = "Stopp"; welleLaufen(); });
audio.addEventListener("pause", () => { $("hoeren").textContent = "Hören"; });
audio.addEventListener("ended", () => { $("hoeren").textContent = "Hören"; });
let welleDaten = null, welleFuer = null;
async function welleZeichnen() {
  const id = S.beat.ergebnis ?? S.ton; if (!id) return;
  if (welleFuer !== id) { welleFuer = id; welleDaten = null; try { const t = await S.medien.ton(bild(id)); const n = 160, s = Math.floor(t.pcm.length / n); welleDaten = Array.from({ length: n }, (_, i) => { let m = 0; for (let j = i * s; j < (i + 1) * s; j += 32) m = Math.max(m, Math.abs(t.pcm[j])); return m; }); } catch { return; } }
  if (!welleDaten) return;
  const c = welle, r = c.getBoundingClientRect(), dpr = Math.min(devicePixelRatio || 1, 2);
  c.width = Math.max(1, r.width * dpr); c.height = Math.max(1, r.height * dpr);
  const g = c.getContext("2d"), w = c.width / welleDaten.length, k = audio.duration ? audio.currentTime / audio.duration : 0;
  g.clearRect(0, 0, c.width, c.height);
  const verlauf = g.createLinearGradient(0, 0, 0, c.height); verlauf.addColorStop(0, "rgba(11,10,14,0)"); verlauf.addColorStop(1, "rgba(11,10,14,.7)");
  g.fillStyle = verlauf; g.fillRect(0, 0, c.width, c.height);
  welleDaten.forEach((m, i) => { const h = Math.max(2 * dpr, m * c.height * .62); g.fillStyle = i / welleDaten.length <= k ? "#ffa3d1" : "rgba(236,235,241,.55)"; g.fillRect(i * w + w * .2, c.height - 14 * dpr - h, w * .6, h); });
}
function welleLaufen() { if (audio.paused || S.feld !== 3) return; welleZeichnen(); requestAnimationFrame(welleLaufen); }

// ---------- 5 · Film: jev (oder der Zufall) stellt 30 s aus vielen Effekten zusammen, oder der Film aus deinen Bildern ----------
async function messung(signal) {
  if (!S.ton) { melden("Noch kein Ton: das Lab macht den Beat aus dem Bild …"); }
  const f = S.film;
  const tonId = S.ton;
  if (f.messung && f.messung.bild === S.aktuell && f.messung.ton === tonId) return f.messung;
  melden("Bild und Klang werden gemessen …", 0);
  f.messung = await VS.messen({ register: R, projekt: S.projekt, medien: S.medien, bild: S.aktuell, ton: tonId, beginn: 0, melden: (t, a) => melden(t, a), abbrechen: signal });
  const quelle = bild(S.aktuell)?.herkunft?.video;
  const stills = quelle ? bilder().filter((x) => !x.knoten && x.herkunft?.video?.sha256 === quelle.sha256).sort((a, b) => a.herkunft.video.zeit - b.herkunft.video.zeit) : [];
  if (stills.length > 1) f.messung.videoBilder = stills.map((x) => x.id);
  return f.messung;
}
async function zusammenstellen() {
  if (!bild(S.aktuell)) { toast("Zuerst ein Bild unter «Material»."); return; }
  if (!S.ton && !(await beatRechnen(jevVerfuegbar() ? "jev" : "regel"))) return;
  await laufen("Bild und Klang werden gemessen …", async (signal) => {
    await messung(signal);
    let komposition = null, fehler = "";
    if (jevVerfuegbar()) { melden("jev stellt zusammen …"); try { komposition = await jevKomposition({ merkmale: S.film.messung.merkmale }, { abbrechen: signal }); } catch (f) { if (f.name === "AbortError") throw f; fehler = f.message; } }
    else fehler = "nicht erreichbar";
    const alt = S.film.zusammen?.plan;
    S.film.zusammen = { antworten: komposition?.antworten ?? ZS.gleichverteilt(), jev: komposition, fehler, geaendert: new Set(),
      plan: { ...ZS.zusammenstellen(komposition?.antworten ?? ZS.gleichverteilt(), neuerStartwert()), zettel: S.film.zettel ? { strophe: "" } : null, orna: S.film.orna ? { konstellation: "" } : null,
        lebendig: true, bewegung: ZS.BEWEGUNG, signatur: true, format: S.film.format, abschnitte: alt?.abschnitte ?? ZS.standardAbschnitte() } };
    S.film.eigene = [];
    toast(komposition ? `jev (${komposition.modell}) hat zusammengestellt. Tippe Abschnitte an, um sie auszuschalten.` : `Zufällig zusammengestellt (jev ${fehler}).`, !komposition);
  });
}
function abschnitteZeigen() {
  const box = $("abschnitte"), z = S.film.zusammen;
  box.className = "abschnitte";
  if (S.film.eigene.length) {
    box.replaceChildren(...S.film.eigene.map((id, k) => el("button", { type: "button", "aria-pressed": "true", "aria-label": `Bild ${k + 1} aus dem Film nehmen`, onclick: () => { S.film.eigene.splice(k, 1); alles(); } },
      el("img", { src: url(id), alt: "", style: "width:100%;height:100%;object-fit:cover;display:block" }))));
    $("filmText").textContent = `${S.film.eigene.length} Bilder aus der Galerie`;
    return;
  }
  if (!z) { box.classList.add("offen"); box.replaceChildren("jev stellt sechs Abschnitte zusammen"); $("filmText").textContent = "30 s aus Bild und Klang"; return; }
  const pl = z.plan;
  const karte = (feld, name) => el("button", { class: "karte", type: "button", style: "--d:.75", "aria-pressed": String(Boolean(pl[feld])), "aria-label": `${name} ${pl[feld] ? "aus" : "an"}`,
    onclick: () => { S.film[feld] = !pl[feld]; pl[feld] = pl[feld] ? null : feld === "zettel" ? { strophe: "" } : { konstellation: "" }; z.geaendert.add(feld); abschnitteZeigen(); }, text: name });
  box.replaceChildren(karte("zettel", "Zettel"),
    ...pl.bild.map((b, i) => el("button", { class: "effekt", type: "button", "aria-pressed": String(pl.abschnitte[i].an), "aria-label": `Abschnitt ${i + 1}: ${kurz(BILD_EFFEKTE[b])}`,
      onclick: () => { const a = pl.abschnitte[i]; if (a.an && pl.abschnitte.filter((x) => x.an).length === 1) return; a.an = !a.an; z.geaendert.add(`abschnitt${i + 1}`); abschnitteZeigen(); } },
      el("b", { text: kurz(BILD_EFFEKTE[b]) }))),
    karte("orna", "ORNA"));
  const sek = Math.round(ZS.abschnitteNormieren(pl).filter((a) => a.an).reduce((s, a) => s + a.dauer, 0));
  $("filmText").textContent = `${z.jev ? "jev" : "Zufall"} · ${sek} s Animation${pl.zettel || pl.orna ? " + Signatur" : ""}`;
}
$("format").addEventListener("click", (ev) => {
  const b = ev.target.closest(".pille"); if (!b) return;
  S.film.format = b.dataset.format; if (S.film.zusammen) S.film.zusammen.plan.format = S.film.format;
  for (const p of $("format").children) p.setAttribute("aria-pressed", String(p === b));
  buehne();
});
$("zusammenstellen").addEventListener("click", zusammenstellen);
$("rechnen").addEventListener("click", filmRechnen);
async function filmRechnen() {
  if (S.film.eigene.length) return eigenerFilm();
  const z = S.film.zusammen; if (!z) return;
  const herkunft = z.jev ? { quelle: z.jev.quelle, modell: z.jev.modell, antworten: z.antworten, lage: z.jev.lage, zwischengespeichert: z.jev.zwischengespeichert, gefragt: z.jev.zeit } : { verteilung: "gleich", ...(z.fehler ? { ohneJev: z.fehler } : {}) };
  const wahl = z.geaendert.size ? { art: "mensch", details: { geaendert: [...z.geaendert], vorschlag: z.jev ? "jev" : "zufall", oberflaeche: "handy", ...herkunft } } : { art: z.jev ? "jev" : "zufall", details: { oberflaeche: "handy", ...herkunft } };
  await laufen("Die Zusammenstellung wird gerechnet …", async (signal) => {
    await messung(signal);
    const r = await ZS.zusammenstellungRechnen({ register: R, projekt: S.projekt, medien: S.medien, messung: S.film.messung, plan: z.plan, wahl, seed: neuerStartwert(), melden: (t, a) => melden(t, a), abbrechen: signal });
    await film(r.plan, signal, { vorschlag: "zusammenstellung", entscheidung: r.entscheidung.id, auswahl: "Zusammenstellung (Handy)" });
  });
}
/** der Film aus den Bildern, die in der Galerie «In den Film» genommen wurden: Überblendung, im Takt des Tons, so lang wie er (höchstens 30 s) */
async function eigenerFilm() {
  await laufen("Dein Film wird gerechnet …", async (signal) => {
    const n = S.film.eigene.length;
    let dauer = 3 * n;
    if (S.ton) { const t = await S.medien.ton(bild(S.ton)); dauer = Math.min(30, t.pcm.length / t.rate); }
    const uebergang = 1, halten = Math.max(0.5, Math.min(10, (dauer - (n - 1) * uebergang) / n));
    await film({ stationen: S.film.eigene.map((id) => ({ ergebnis: id })), art: "blende", halten, uebergang, tonspur: S.ton ?? null, lebendig: true }, signal, { auswahl: "Galerie (Handy)" });
  });
}
/** wie stationenFilmRechnen im Lab: Partitur, Bilder, MP4 mit Tonspur; der Film steht danach in den Exporten des Projekts */
async function film(plan, signal, { vorschlag = null, entscheidung = null, auswahl = null } = {}) {
  const liste = plan.stationen.map((s) => (typeof s === "string" ? { ergebnis: s } : { ...s })).filter((x) => bild(x.ergebnis)?.typ === "IMAGE");
  const pt = ST.partitur(S.projekt, { stationen: liste, halten: plan.halten, uebergang: plan.uebergang, art: plan.art, routen: [], fps: FPS, lebendig: plan.lebendig !== false,
    takt: plan.takt?.ereignisfolge ? { ereignisfolge: plan.takt.ereignisfolge, schwelle: plan.takt.schwelle, wiederholen: true } : null,
    bewegung: plan.bewegung?.staerke > 0 ? { staerke: plan.bewegung.staerke, signal: plan.bewegung.signal ?? null } : null });
  const tonId = plan.tonspur && plan.tonspur !== "auto" ? plan.tonspur : pt.takt?.ton ?? S.ton;
  const roh = tonId ? await S.medien.ton(bild(tonId)) : null;
  const ton = roh ? { pcm: roh.pcm, spuren: roh.spuren, rate: roh.rate, beginn: pt.takt?.ton === tonId ? pt.takt.tonBeginn : plan.tonBeginn ?? 0, dauer: pt.dauer } : null;
  const ids = liste.map((x) => x.ergebnis), zeitplan = [];
  const d = P.entscheide(S.projekt, { art: "mensch", gegenstand: "stationen", gewaehlt: ids, details: { auswahl, uebergang: pt.art, takt: pt.takt?.ereignisfolge ?? null, oberflaeche: "handy", ...(entscheidung ? { dramaturgie: entscheidung } : {}) } });
  melden(`Der Film wird gerechnet: ${pt.bilder} Bilder …`, 0);
  const r = await videoAus(ST.filmbilder({ register: R, projekt: S.projekt, medien: S.medien, partitur: pt, seite: 1280, abbrechen: signal, zeitplan, lebendig: pt.lebendig ? gpu() : null }),
    { melden: (t) => melden(`Film: ${t} von ${pt.bilder} Bildern`, Number(String(t).match(/\d+/)?.[0]) / pt.bilder || null), halten: 0, ton });
  const id = P.neueId("x"), name = `medien/${id}-stationen.${r.endung}`;
  const abgelegt = await S.medien.ablegenDatei(name, r.bytes, r.mime);
  S.projekt.exporte.push({ id, art: "stationen", ergebnis: ids.at(-1), stationen: ids, entscheidung: d.id, partitur: pt, zeitplan, datei: name, mime: r.mime, codec: r.codec, ton: r.ton, tonQuelle: r.ton ? tonId : null,
    ...(ton ? { tonBeginn: ton.beginn } : {}), ...(vorschlag ? { dramaturgie: vorschlag } : {}), bilder: r.bilder, fps: FPS, breite: r.breite, hoehe: r.hoehe, sha256: abgelegt.sha256, zeit: new Date().toISOString() });
  if (S.film.video) URL.revokeObjectURL(S.film.video.url);
  S.film.video = { ...r, url: URL.createObjectURL(r.blob), name: `ornament-lab-${slug(S.projekt.titel)}-${new Date().toISOString().slice(0, 10)}.${r.endung}` };
  toast(`Film fertig: ${sekunden(r.bilder / FPS)}, ${(r.blob.size / 1e6).toFixed(1)} MB${r.ton ? ", mit Ton" : ""}.`);
}
$("filmSichern").addEventListener("click", () => { const v = S.film.video; if (v) herunterladen(v.blob, v.name); });

// ---------- 6 · Galerie: Nacheinander (der Weg) im Pult, Nebeneinander (die Varianten eines Schritts) auf der Bühne ----------
function weg() {
  const e = bild(S.aktuell); if (!e) return [];
  const v = P.verlauf(S.projekt, e.id);
  return [...(v.material ? [{ ergebnis: v.material, knoten: null }] : []), ...v.schritte];
}
function galerieZeigen() {
  const box = $("weg"), schritte = weg();
  if (!schritte.length) { box.replaceChildren(el("p", { class: "hinweis", text: "Hier steht dein Weg, sobald ein Bild da ist." })); return; }
  if (!schritte.some((s) => s.ergebnis.id === S.galerie)) S.galerie = schritte.at(-1).ergebnis.id;
  const teile = [];
  schritte.forEach((s, k) => {
    if (k) teile.push(el("span", { class: "pfeil", "aria-hidden": "true", text: "→" }));
    const name = s.knoten ? (effektVon(s.knoten.operation)?.name ?? R.hole(s.knoten.operation)?.name ?? s.knoten.operation) : "Material";
    teile.push(el("button", { type: "button", role: "listitem", "aria-pressed": String(S.galerie === s.ergebnis.id), "aria-label": `Schritt ${k}: ${name}`, title: name,
      onclick: () => { S.galerie = s.ergebnis.id; S.gross = null; galerieZeigen(); buehne(); knoepfe(); } },
      el("img", { src: S.medien.url(s.ergebnis), alt: "" }), el("small", { text: k ? String(k) : "M" })));
  });
  box.replaceChildren(...teile);
  const sel = schritte.find((s) => s.ergebnis.id === S.galerie);
  $("galerieText").textContent = sel?.knoten ? `${effektVon(sel.knoten.operation)?.name ?? R.hole(sel.knoten.operation).name} · ${sel.knoten.ausgaben.length} nebeneinander` : `${schritte.length - 1} Schritte nacheinander`;
  // nur den Streifen schieben: scrollIntoView würde auch das Pult zur Galerie wischen
  requestAnimationFrame(() => { const b = box.querySelector('[aria-pressed="true"]'); if (b) box.scrollLeft = b.offsetLeft - (box.clientWidth - b.offsetWidth) / 2; });
}
function galerieBuehne() {
  const e = bild(S.galerie);
  if (!e) { raster6.replaceChildren(el("p", { class: "hinweis", text: "Noch keine Bilder." })); return; }
  if (S.gross) {
    raster6.classList.add("zwei"); raster6.style.gridTemplateColumns = "1fr";
    const g = S.gross;
    raster6.replaceChildren(el("button", { type: "button", "aria-pressed": "true", "aria-label": "zurück zum Raster", onclick: () => { S.gross = null; galerieBuehne(); knoepfe(); } }, el("img", { src: url(g), alt: bild(g)?.titel ?? "", style: "object-fit:contain" })),
      g !== S.aktuell ? el("button", { class: "knopf klein voll schwebend", type: "button", onclick: () => weiterfuehren(g, "Weitergeführt. Dieses Bild ist jetzt dein Bild."), text: "Weiterführen" }) : null);
    return;
  }
  raster6.style.gridTemplateColumns = "";
  const geschwister = P.geschwister(S.projekt, e.id).filter((x) => x?.typ === "IMAGE");
  raster6.classList.toggle("zwei", geschwister.length <= 4 && geschwister.length > 1);
  if (geschwister.length === 1) raster6.style.gridTemplateColumns = "1fr";
  raster6.replaceChildren(...geschwister.map((x, k) => el("button", { type: "button", "aria-pressed": String(x.id === S.aktuell), "aria-label": `${x.titel}, gross zeigen`, onclick: () => { S.gross = x.id; galerieBuehne(); knoepfe(); } },
    el("img", { src: S.medien.url(x), alt: "", style: geschwister.length === 1 ? "object-fit:contain" : "" }), geschwister.length > 1 ? el("small", { text: String(k + 1) }) : null)));
}
const galerieBild = () => S.gross ?? S.galerie;
$("pngSichern").addEventListener("click", () => { const e = bild(galerieBild()); if (e) herunterladen(new Blob([S.medien.dateien.get(e.datei)], { type: "image/png" }), `ornament-lab-${slug(e.titel)}.png`); });
$("station").addEventListener("click", () => {
  const id = galerieBild(); if (!id) return;
  const i = S.film.eigene.indexOf(id);
  if (i >= 0) S.film.eigene.splice(i, 1); else S.film.eigene.push(id);
  toast(i >= 0 ? "Aus dem Film genommen." : `Im Film: ${S.film.eigene.length} Bild${S.film.eigene.length === 1 ? "" : "er"}. Unter «Film» rechnen.`);
  alles();
});
$("projektSichern").addEventListener("click", async () => {
  if (S.laeuft) { toast("Sichern geht, sobald die Rechnung fertig ist."); return; }
  await laufen("Projekt wird gepackt …", async () => {
    const blob = await packeBlob(S.projekt, S.medien.dateien, { melden: (a) => melden("Projekt wird gepackt …", a) });
    herunterladen(blob, `${slug(S.projekt.titel)}-${new Date().toISOString().slice(0, 10)}${ENDUNG}`);
    toast(`Gesichert: ${(blob.size / 1e6).toFixed(1)} MB.${blob.size > HOECHSTENS ? " Achtung: zu gross, um es wieder zu öffnen." : " Öffnen geht hier und im ganzen Lab."}`, blob.size > HOECHSTENS);
  });
  S.ungespeichert = false;
});

// ---------- alles neu zeichnen ----------
function knoepfe() {
  const da = Boolean(bild(S.aktuell)), frei = !S.laeuft;
  $("anwenden").disabled = !frei || !S.vorschau || S.vorschauFuer !== `${S.aktuell}|${S.effekt}`;
  $("jevEffekt").disabled = !frei || !da;
  $("variantenRechnen").disabled = !frei || !da || !S.effekt;
  $("variantenRechnen").textContent = S.varianten?.fuer === S.aktuell ? "Neu würfeln" : "Sechs rechnen";
  $("weiter").disabled = !frei || !S.variante;
  $("beatRegel").disabled = $("beatJev").disabled = !frei || !da;
  $("hoeren").disabled = !S.beat.ergebnis && !S.ton;
  $("zusammenstellen").disabled = !frei || !da;
  $("rechnen").disabled = !frei || !(S.film.zusammen || S.film.eigene.length);
  $("rechnen").textContent = S.film.video ? "Neu rechnen" : "Film rechnen";
  $("filmSichern").hidden = !S.film.video;
  $("zusammenstellen").hidden = S.film.eigene.length > 0;
  $("pngSichern").disabled = !galerieBild();
  $("station").disabled = !galerieBild();
  $("station").setAttribute("aria-pressed", String(S.film.eigene.includes(galerieBild())));
  $("projektSichern").disabled = !frei || !S.projekt.ergebnisse.length;
  for (const id of ["beatJev", "zusammenstellen", "jevEffekt"]) $(id).title = jevVerfuegbar() ? "jev live" : "jev ist nicht erreichbar: dann Regeln und Zufall";
  // kleiner Punkt am Schalter: dort wartet etwas Neues
  schalter[3].knauf.classList.toggle("bereit", Boolean(S.beat.ergebnis));
  schalter[4].knauf.classList.toggle("bereit", Boolean(S.film.video));
}
function materialZeigen() {
  const e = bild(S.aktuell), t = bild(S.ton);
  $("q-bild").classList.toggle("da", Boolean(e) && !e.herkunft?.video); $("q-bild").lastChild.textContent = e && !e.herkunft?.video ? "geladen" : "wählen";
  $("q-video").classList.toggle("da", Boolean(e?.herkunft?.video));
  $("q-ton").classList.toggle("da", Boolean(t)); $("q-ton").lastChild.textContent = t ? (t.knoten ? "Beat aus Bild" : sekunden(t.ton?.dauer ?? 0)) : "MP3, WAV, M4A";
  $("materialHinweis").textContent = !e ? "Ohne Ton macht das Lab den Beat aus dem Bild. Alles bleibt auf dem Handy."
    : S.ungespeichert ? "Neu laden verliert die Arbeit. Unter «Galerie» sicherst du das Projekt." : "Alles bleibt auf dem Handy.";
}
function klangZeigen() {
  kitsZeigen();
  const t = bild(S.beat.ergebnis ?? S.ton);
  if (t && $("audio").getAttribute("src") !== S.medien.url(t)) $("audio").src = S.medien.url(t);
  const pl = S.beat.plan;
  const name = (frage) => kurz(BEAT_FRAGEN[frage]?.katalog?.[pl[frage]] ?? pl[frage] ?? "");
  $("klangText").textContent = pl ? `${name("tempo")} · ${name("groove")} · ${name("tonart")}` : t ? "eigener Ton" : "Beat aus dem Bild";
}
function alles() { materialZeigen(); effekteZeigen(); klangZeigen(); abschnitteZeigen(); galerieZeigen(); buehne(); knoepfe(); }

addEventListener("beforeunload", (ev) => { if (S.ungespeichert) { ev.preventDefault(); ev.returnValue = ""; } });
const start = Math.max(0, NAMEN.findIndex((n) => `#${n.toLowerCase()}` === location.hash));
alles(); setze(start); requestAnimationFrame(() => pult.scrollTo({ left: start * pult.clientWidth }));
jevPruefen().then(() => knoepfe()).catch(() => {});
