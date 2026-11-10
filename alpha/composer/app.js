// ORNAMENT COMPOSER 0.1 – Oberfläche. Der Klang entsteht im AudioWorklet (worklet/motor-worklet.js) mit dem Motor aus kern/motor.js;
// der Export rechnet mit demselben Motor offline (kern/rendern.js). Dateien bleiben auf dem Gerät.

import { PLUGINS } from "./plugins/register.js";
import { zuStellung, ausStellung, zeigeWert, standardWerte } from "./kern/plugin.js";
import * as PR from "./kern/projekt.js";
import { SPURTYPEN, variantenFuer } from "./kern/varianten.js";
import { rendern } from "./kern/rendern.js";
import { messen, TERZEN, lautheitIntegriert } from "./kern/messen.js";
import { zipBlob } from "./kern/zip.js";
import { STILE, stilVon, halbeZeit } from "./kern/muster.js";
import { ARTEN as UNTER, SCHNELL, anwenden, werteVon } from "./kern/unterbrechungen.js";
import { spurRechnen, schlagRechnen, flaechenSpurRechnen } from "./kern/erzeugen.js";
import { MAKROS } from "./erzeuger/natur-0.3.0.js";
import * as SYNTH010 from "./erzeuger/synth-0.1.0.js";
import * as SYNTH020 from "./erzeuger/synth-0.2.0.js";
import { ROLLEN, REGLER, REGLER_STD, sequenzErzeugen } from "./kern/sequenzen.js";
// neue Synthspuren nehmen Synth 0.2.0; ältere Spuren behalten ihre Version (und deren Presets)
const SYNTH_NEU = "synth@0.2.0", SYNTH_MODUL = { "synth@0.1.0": SYNTH010, "synth@0.2.0": SYNTH020 };
const { PATCHES, FAMILIEN_LISTE, CHARAKTERE } = SYNTH020;
const synthModul = (q) => SYNTH_MODUL[q?.erzeuger] ?? SYNTH020;
import { abschnitte as abschnitteVon, ereignisseFuer, funktionVon, BESETZUNG, wechselPerkussion, teileAus } from "./kern/arrangement.js";
import { taktLesen } from "./kern/muster.js";
import { stimmeVon, ERZEUGER } from "./erzeuger/register.js";
import { LINIEN, LEITERN, NOTEN, linieErzeugen, kickSchritte, grundFrequenz, tonLesen } from "./kern/linien.js";
import { wavSpuren, abtastrateLesen, mono, tempoSchaetzen, einsaetzeFinden, wavSchreiben, rateWandeln, dehnen } from "../lab/kern/klangwerk.js";
import * as BE from "./kern/bereiche.js";
import * as FA from "./kern/fassungen.js";
import { lucerneEinbauen, klangPanel, istSampler, samplerRechnen } from "./lucerne-ui.js";

const $ = (id) => document.getElementById(id);
const atmen = () => new Promise((ok) => setTimeout(ok, 0));
const ZIELE = { reels: { lufs: -14, decke: -1 }, museum: { lufs: -18, decke: -1 }, leise: { lufs: -23, decke: -1 } };
const TYP_FOLGE = ["drums", "perkussion", "bass", "melodie", "flaeche", "rest", "stimme", "summe"];

const z = {
  ctx: null, node: null, rate: 0,
  projekt: PR.neuesProjekt({ titel: "Neues Projekt" }),
  daten: new Map(),          // Spur-id → { kanaele, wellen }
  referenz: null,            // { name, kanaele, messung }
  gewaehlt: null, glied: 0,  // gewählte Spur (id oder "summe") und Glied der Kette
  laeuft: false, pos: 0, schleifeAn: false, schleife: null, allesVorher: false, referenzAn: false, ausgleich: true,
  anzeige: null, messungen: null,
  samples: new Map(),        // sha256 → { name, kanaele, rate } (eigene Aufnahmen für Flächen)
  fassungRoh: new Map(),     // Fassungs-id → Kanäle einer nicht aktiven Datei-Fassung (bleibt nur im Speicher)
  original: new Map(),       // Spur-id → Kanäle der Datei vor einer Tempo-Angleichung
  auswahl: false, ersatzFuer: null,
};

// ---------- Meldungen ----------
let meldungZeit = 0;
function melde(text, dauer = 3500) { const m = $("meldung"); m.textContent = text; m.hidden = false; clearTimeout(meldungZeit); if (dauer) meldungZeit = setTimeout(() => (m.hidden = true), dauer); }
const zahl = (x, s = 1) => (Number.isFinite(x) ? x.toFixed(s).replace(".", ",").replace("-", "−") : "–");

// ---------- Ton ----------
// Es gibt immer höchstens einen Kontext mit einem Motor. Wer während des Aufbaus fragt, wartet auf denselben Aufbau (sonst entstehen
// zwei Motoren, von denen einer nicht mehr erreichbar ist und weiterspielt).
let kontextBau = null;
function kontext(rate) {
  if (z.ctx && z.node) return Promise.resolve(z.ctx);
  return (kontextBau ??= kontextBauen(rate).finally(() => { kontextBau = null; }));
}
async function kontextBauen(rate) {
  const AC = globalThis.AudioContext ?? globalThis.webkitAudioContext;
  let ctx;
  try { ctx = new AC({ sampleRate: rate, latencyHint: "interactive" }); } catch { ctx = new AC({ latencyHint: "interactive" }); }
  z.ctx = ctx; z.node = null;
  z.rate = ctx.sampleRate; z.projekt.rate = z.rate;
  await ctx.audioWorklet.addModule(new URL("./worklet/motor-worklet.js", import.meta.url));
  const node = new AudioWorkletNode(ctx, "composer-motor", { numberOfInputs: 0, numberOfOutputs: 1, outputChannelCount: [2] });
  node.connect(ctx.destination);
  node.port.onmessage = ({ data: d }) => {
    if (node !== z.node) return;
    if (d.art === "anzeige") { z.anzeige = d; z.pos = d.pos; }
    else if (d.art === "ende") { z.laeuft = false; knoepfeAuffrischen(); }
    else if (d.art === "fehler") melde(`Motor: ${d.text}`, 8000);
  };
  z.node = node;
  // Das System kann den Ton selbst anhalten (iOS: Bildschirmsperre, Anruf, anderer Ton → «interrupted»). Dann sauber halten statt weiterzuzählen.
  ctx.onstatechange = () => { if (ctx === z.ctx && ctx.state !== "running" && (z.laeuft || z.startet) && !z.selbstAngehalten) verlassen("unterbrochen"); };
  return ctx;
}

// ---------- Seite verlassen, Bildschirmsperre ----------
// Läuft die Musik, wenn die Seite verschwindet (anderer Tab, App-Wechsel, Sperre), wird sie ausgeblendet und angehalten; die Stelle
// bleibt, ▶ spielt dort weiter. Mobil kommt ein AudioContext nach einer Sperre oft beschädigt zurück (knistert lange, falsche Abtastrate):
// darum wird er dort beim nächsten ▶ neu aufgebaut, mit allen Spuren, der Referenz und dem Zustand.
const MOBIL = typeof navigator !== "undefined" && (/Android|iPhone|iPad|iPod/i.test(navigator.userAgent) || (navigator.maxTouchPoints > 1 && /Macintosh/.test(navigator.userAgent)));
function verlassen(grund) {
  if (!z.ctx) return;
  const lief = z.laeuft || z.startet;
  z.startet = false;
  if (lief) { post({ art: "stop", sofort: grund === "unterbrochen" }); z.laeuft = false; z.angehaltenBeimVerlassen = true; knoepfeAuffrischen(); }
  if (lief || grund === "unterbrochen") z.neuAufbauen ||= MOBIL || grund === "unterbrochen";
  // nach der Blende den Kontext ruhen lassen (spart Strom; der Motor rechnet nicht im Hintergrund weiter)
  const ctx = z.ctx;
  if (ctx.state === "running") { z.selbstAngehalten = true; setTimeout(() => { if (ctx === z.ctx && !z.laeuft && document.hidden) ctx.suspend().catch(() => {}); }, 60); }
}
function zurueck() {
  if (!z.angehaltenBeimVerlassen) return;
  z.angehaltenBeimVerlassen = false;
  melde("Angehalten, als die Seite verlassen wurde. ▶ spielt an derselben Stelle weiter.", 6000);
}
document.addEventListener("visibilitychange", () => (document.hidden ? verlassen("versteckt") : zurueck()));
addEventListener("pagehide", () => verlassen("versteckt"));

/** einen frischen AudioContext bauen und den Motor neu füllen (Spuren, Referenz, Zustand, Schleife, Stelle); nie zweimal gleichzeitig */
let neuBau = null;
function motorNeuAufbauen() { return (neuBau ??= motorNeuBauen().finally(() => { neuBau = null; })); }
async function motorNeuBauen() {
  if (kontextBau) await kontextBau.catch(() => {});
  const alt = z.ctx, altNode = z.node, rate = z.rate;
  z.neuAufbauen = false; z.ctx = null; z.node = null;
  // der alte Motor schweigt sofort und wird abgehängt, bevor sein Kontext schliesst
  try { altNode?.port.postMessage({ art: "stop", sofort: true }); altNode?.disconnect(); } catch { /* schon weg */ }
  try { await alt?.close(); } catch { /* schon zu */ }
  await kontext(rate);
  for (const [id, d] of z.daten) { const kopie = d.kanaele.map((x) => x.slice()); post({ art: "spur", id, kanaele: kopie }, kopie.map((x) => x.buffer)); }
  if (z.referenz?.kanaele) { const kopie = z.referenz.kanaele.map((x) => x.slice()); post({ art: "referenz", kanaele: kopie }, kopie.map((x) => x.buffer)); }
  post({ art: "zustand", zustand: PR.motorZustand(z.projekt, { ausgleich: z.ausgleich, allesVorher: z.allesVorher, referenzAn: z.referenzAn }) });
  schleifeSenden(); post({ art: "stelle", pos: z.pos });
}
/** den Kontext laufen lassen; mobil oder nach einer Unterbrechung wird er neu gebaut, ebenso wenn er nicht innerhalb von 1,5 s läuft */
let wecken = null;
function tonWecken() { return (wecken ??= tonWeckenJetzt().finally(() => { wecken = null; })); }
async function tonWeckenJetzt() {
  if (z.neuAufbauen || !z.ctx || z.ctx.state === "closed") await motorNeuAufbauen();
  z.selbstAngehalten = false;
  const ctx = z.ctx;
  const ok = await Promise.race([ctx.resume().then(() => ctx.state === "running", () => false), new Promise((r) => setTimeout(() => r(false), 1500))]);
  if (!ok && ctx.state !== "running") { await motorNeuAufbauen(); await z.ctx.resume().catch(() => {}); }
}
const post = (d, transfer) => z.node?.port.postMessage(d, transfer ?? []);
let sendenGeplant = false;
function senden() {
  if (sendenGeplant) return; sendenGeplant = true;
  requestAnimationFrame(() => { sendenGeplant = false; post({ art: "zustand", zustand: PR.motorZustand(z.projekt, { ausgleich: z.ausgleich, allesVorher: z.allesVorher, referenzAn: z.referenzAn }) }); });
}

async function dekodieren(bytes) {
  const rate = abtastrateLesen(bytes) ?? 48000;
  await kontext(rate);
  try {
    const w = wavSpuren(bytes);
    if (w.rate === z.rate) return w.spuren;
    return w.spuren.map((s) => rateWandeln(s, w.rate, z.rate));
  } catch { /* keine WAV: der Browser dekodiert */ }
  const b = await z.ctx.decodeAudioData(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength));
  return Array.from({ length: Math.min(2, b.numberOfChannels) }, (_, c) => b.getChannelData(c).slice());
}
async function sha256(bytes) { const h = await crypto.subtle.digest("SHA-256", bytes); return [...new Uint8Array(h)].map((b) => b.toString(16).padStart(2, "0")).join(""); }

const WELLE = 2400;
function wellenform(kanaele) {
  const n = kanaele[0].length, min = new Float32Array(WELLE), max = new Float32Array(WELLE);
  for (let j = 0; j < WELLE; j++) {
    const a = Math.floor((j * n) / WELLE), b = Math.max(a + 1, Math.floor(((j + 1) * n) / WELLE));
    let lo = 0, hi = 0;
    for (const s of kanaele) for (let i = a; i < b && i < n; i += 4) { const v = s[i]; if (v < lo) lo = v; if (v > hi) hi = v; }
    min[j] = lo; max[j] = hi;
  }
  return { min, max };
}

// ---------- Laden ----------
async function dateienLaden(liste) {
  // Tondateien; liegt dieselbe Datei als WAV und MP3 vor (Studio-Kette), nur die WAV
  const alle = [...liste], namen = new Set(alle.map((f) => f.name.toLowerCase()));
  const dateien = alle.filter((f) => /\.(wav|flac|mp3|ogg|m4a|aiff?)$/i.test(f.name) && !(/\.mp3$/i.test(f.name) && namen.has(f.name.toLowerCase().replace(/\.mp3$/, ".wav"))));
  if (!dateien.length) { melde("Keine Tondateien gefunden."); return; }
  dateien.sort((a, b) => TYP_FOLGE.indexOf(typ(a.name)) - TYP_FOLGE.indexOf(typ(b.name)) || a.name.localeCompare(b.name));
  let neu = 0;
  for (const [i, f] of dateien.entries()) {
    melde(`Lade ${f.name} (${i + 1}/${dateien.length}) …`, 0);
    await atmen();
    const bytes = new Uint8Array(await f.arrayBuffer()), hash = await sha256(bytes), kanaele = await dekodieren(bytes);
    const datei = { name: f.name, sha256: hash, bytes: bytes.length, rate: z.rate, kanaele: kanaele.length, dauer: Math.round((kanaele[0].length / z.rate) * 1000) / 1000 };
    // gehört die Datei zu einer Spur eines geöffneten Projekts? (gleicher Inhalt, sonst gleicher Name)
    let sp = z.projekt.spuren.find((s) => s.datei && !z.daten.has(s.id) && s.datei.sha256 === hash) ?? z.projekt.spuren.find((s) => s.datei && !z.daten.has(s.id) && s.datei.name === f.name);
    // eine nicht aktive Fassung einer Spur?
    const fas = !sp && z.projekt.spuren.flatMap((s) => s.fassungen ?? []).find((x) => x.datei?.sha256 === hash && !z.fassungRoh.has(x.id));
    if (fas) { z.fassungRoh.set(fas.id, fas.dehnung && Math.abs(fas.dehnung - 1) > 1e-4 ? dehnen(kanaele, z.rate, fas.dehnung) : kanaele); continue; }
    if (sp && sp.datei.sha256 !== hash) melde(`${f.name}: anderer Inhalt als im Projekt gespeichert`, 6000);
    if (!sp) { sp = PR.spurDazu(z.projekt, datei); neu++; }
    z.original.set(sp.id, kanaele);
    spurSenden(sp, rohAusDatei(sp, kanaele));
  }
  if (neu && z.projekt.tempo.quelle !== "mensch") tempoSchaetzenAusSpuren();
  if (!z.gewaehlt) z.gewaehlt = z.projekt.spuren[0]?.id ?? null;
  senden(); allesAufbauen();
  melde(`${dateien.length} Spur${dateien.length > 1 ? "en" : ""} geladen, ${zahl(z.rate / 1000, 1)} kHz. Leertaste spielt.`);
}
const typ = (name) => SPURTYPEN.find((t) => t.muster.test(name))?.typ ?? "rest";

function tempoSchaetzenAusSpuren() {
  const sp = z.projekt.spuren.find((s) => s.typ === "drums" && s.datei && z.daten.has(s.id)) ?? z.projekt.spuren.find((s) => s.datei && z.daten.has(s.id));
  if (!sp) return;
  const pcm = mono(z.daten.get(sp.id).kanaele), { bpm, sicherheit } = tempoSchaetzen(pcm, z.rate);
  const einsatz = einsaetzeFinden(pcm, z.rate, { empfindlichkeit: 0.4 }).find((e) => e.t > 0.005 && e.staerke > 0.35);
  z.projekt.tempo = { ...z.projekt.tempo, bpm, quelle: "geschaetzt", sicherheit, beginn: einsatz ? einsatz.t : 0, aus: sp.name };
}

async function referenzLaden(f) {
  melde(`Lade Referenz ${f.name} …`, 0);
  const bytes = new Uint8Array(await f.arrayBuffer()), kanaele = await dekodieren(bytes), hash = await sha256(bytes);
  await atmen();
  z.referenz = { name: f.name, kanaele, messung: messen(kanaele, z.rate) };
  z.projekt.referenzen = [{ id: "r-1", name: f.name.replace(/\.[a-z0-9]+$/i, ""), datei: { name: f.name, sha256: hash, bytes: bytes.length }, rolle: "klang", gewicht: 1 }];
  const kopie = kanaele.map((s) => s.slice());
  post({ art: "referenz", kanaele: kopie }, kopie.map((s) => s.buffer));
  $("referenzAn").disabled = false;
  messTabelle();
  melde(`Referenz ${f.name}: ${zahl(z.referenz.messung.lufs)} LUFS, ${Math.round(z.referenz.messung.baender.unter120 * 100)} % unter 120 Hz. R schaltet um.`, 6000);
}

// ---------- Aufbau ----------
const laenge = () => Math.max(1, ...[...z.daten.values()].map((d) => d.kanaele[0].length)) / (z.rate || 48000);

function allesAufbauen() {
  const hat = z.projekt.spuren.length > 0;
  $("leer").hidden = hat; $("spuren").hidden = !hat; $("unten").hidden = !hat; $("urteilBereich").hidden = !hat;
  $("bpm").value = z.projekt.tempo.bpm; $("beginn").value = z.projekt.tempo.beginn.toFixed(2);
  $("bpmQuelle").textContent = z.projekt.tempo.quelle === "stil" ? `aus dem Stil` : z.projekt.tempo.quelle === "geschaetzt" ? `geschätzt aus ${z.projekt.tempo.aus ?? "der ersten Spur"}` : z.projekt.tempo.quelle === "mensch" ? "eingestellt" : "";
  summeKopf(); spurenAufbauen(); pluginAufbauen(); urteileAufbauen(); knoepfeAuffrischen(); bereichLeisteAuffrischen(); zeichnen();
}

function summeKopf() {
  const k = $("summeKopf"), gew = z.gewaehlt === "summe";
  k.innerHTML = "";
  const b = el("button", { className: "mini" + (gew ? " v" : ""), textContent: "Summe", title: "Kanalzug und Grenze der Summe bearbeiten" });
  b.setAttribute("aria-pressed", gew); b.onclick = () => waehle("summe");
  k.append(el("div", { className: "spur-knoepfe" }, b, el("span", { textContent: `${z.projekt.spuren.length} Spuren · ${zahl(z.rate / 1000, 1)} kHz` })));
  k.append(regler("Σ", z.projekt.master.pegel, -24, 12, 0.1, (v) => { z.projekt.master.pegel = v; senden(); }, (v) => `${zahl(v)} dB`));
}

function el(tag, props = {}, ...kinder) { const e = Object.assign(document.createElement(tag), props); e.append(...kinder); return e; }
function regler(kurz, wert, min, max, schritt, setze, zeige) {
  const out = el("output", { textContent: zeige(wert) }), inp = el("input", { type: "range", min, max, step: schritt, value: wert });
  inp.oninput = () => { const v = Number(inp.value); out.textContent = zeige(v); setze(v); };
  inp.ondblclick = () => { const v = min < 0 && max > 0 ? 0 : min; inp.value = v; out.textContent = zeige(v); setze(v); };
  inp.title = "Doppelklick: zurück auf 0";
  return el("label", { className: "regler" }, el("span", { textContent: kurz }), inp, out);
}
function umschalt(text, cls, an, titel, klick) { const b = el("button", { className: `mini ${cls}`, textContent: text, title: titel }); b.setAttribute("aria-pressed", String(an)); b.onclick = klick; return b; }

function spurenAufbauen() {
  const liste = $("spurliste"); liste.innerHTML = "";
  for (const sp of z.projekt.spuren) {
    const da = z.daten.has(sp.id), still = sp.stumm || (z.projekt.spuren.some((s) => s.solo) && !sp.solo);
    const typWahl = el("select", { title: "Spurtyp: bestimmt die Varianten des Kanalzugs" }, ...SPURTYPEN.map((t) => el("option", { value: t.typ, textContent: t.name, selected: t.typ === sp.typ })));
    typWahl.onchange = () => { sp.typ = typWahl.value; if (z.gewaehlt === sp.id) pluginAufbauen(); };
    typWahl.onclick = (e) => e.stopPropagation();
    const v = variantenFuer(sp.typ)[sp.kette[0].variante];
    const kopf = el("div", { className: "kopfzelle" },
      el("div", { className: "spur-name" }, el("b", { textContent: sp.name, title: sp.datei ? `${sp.datei.name} · ${sp.datei.sha256?.slice(0, 12)}…` : `${sp.quelle.erzeuger} · ${sp.quelle.stimme} · Startwert ${sp.quelle.seed}` }), sp.quelle ? el("span", { className: "erz", textContent: sp.quelle.variante ?? "eigen" }) : typWahl),
      el("div", { className: "spur-knoepfe" },
        umschalt("M", "m", sp.stumm, "stumm", (e) => { e.stopPropagation(); sp.stumm = !sp.stumm; senden(); spurenAufbauen(); }),
        umschalt("S", "s", sp.solo, "solo", (e) => { e.stopPropagation(); sp.solo = !sp.solo; senden(); spurenAufbauen(); }),
        umschalt("V", "v", sp.vorher, "vorher: ohne Kanalzug, gleich laut", (e) => { e.stopPropagation(); sp.vorher = !sp.vorher; senden(); spurenAufbauen(); }),
        el("span", { className: "mini variante", textContent: v ? v.name : "eigene", title: "Variante des Kanalzugs" }),
        umschalt("⇄", "", false, "Spur ersetzen: neue Datei wählen (oder eine Datei auf die Welle ziehen). Mischung und Bearbeitungen bleiben, die alte Quelle bleibt als Fassung.", (e) => { e.stopPropagation(); z.ersatzFuer = sp.id; $("ersatzDatei").click(); }),
        da || sp.quelle ? "" : el("span", { className: "leise-text", textContent: "Datei fehlt" })),
      regler("dB", sp.pegel, -24, 12, 0.1, (x) => { sp.pegel = x; senden(); }, (x) => `${zahl(x)} dB`),
      regler("◐", sp.pan * 100, -100, 100, 1, (x) => { sp.pan = x / 100; senden(); }, (x) => (x === 0 ? "Mitte" : x < 0 ? `L ${-x}` : `R ${x}`)),
      el("div", { className: "pegelbalken" }, el("i", { id: `pegel-${sp.id}` })));
    const welle = el("canvas", { className: "welle" });
    welle.dataset.id = sp.id;
    zeigerAuf(welle);
    const feld = el("div", { className: "wellen-feld", title: "Bereich ziehen: auf Takte (Alt: Schläge, Umschalt: frei). Datei hierher ziehen: Spur ersetzen." }, welle);
    feld.ondragover = (e) => { e.preventDefault(); e.stopPropagation(); feld.classList.add("ziel"); };
    feld.ondragleave = () => feld.classList.remove("ziel");
    feld.ondrop = (e) => { e.preventDefault(); e.stopPropagation(); feld.classList.remove("ziel"); const f = e.dataTransfer?.files?.[0]; if (f) spurErsetzen(sp, f).catch((x) => melde(`Ersetzen: ${x.message}`, 8000)); };
    const zeile = el("div", { className: `spur${z.gewaehlt === sp.id ? " gewaehlt" : ""}${still ? " still" : ""}` }, kopf, feld);
    kopf.onclick = () => waehle(sp.id);
    liste.append(zeile);
  }
  zeichnen();
}

function waehle(id) { z.gewaehlt = id; z.glied = erzeugt(id) ? -1 : 0; summeKopf(); spurenAufbauen(); pluginAufbauen(); bereichLeisteAuffrischen(); }
const erzeugt = (id) => !!z.projekt.spuren.find((s) => s.id === id)?.quelle;

// ---------- Plugin ----------
function aktuelleKette() { return z.gewaehlt === "summe" ? z.projekt.master.kette : z.projekt.spuren.find((s) => s.id === z.gewaehlt)?.kette; }
function aktuellerTyp() { return z.gewaehlt === "summe" ? "summe" : z.projekt.spuren.find((s) => s.id === z.gewaehlt)?.typ ?? "rest"; }

function pluginAufbauen() {
  const box = $("plugin"); box.innerHTML = "";
  const kette = aktuelleKette();
  if (!kette) { box.append(el("p", { className: "hinweis", textContent: "Eine Spur wählen (Kopf der Spur antippen)." })); return; }
  z.glied = Math.min(z.glied, kette.length - 1);
  const spur = z.projekt.spuren.find((s) => s.id === z.gewaehlt);
  const name = z.gewaehlt === "summe" ? "Summe" : spur.name;
  const reiter = [...(spur?.quelle ? [umschalt("Klang", "v", z.glied === -1, "der Klangerzeuger dieser Spur", () => { z.glied = -1; pluginAufbauen(); })] : []),
    ...(spur ? [umschalt(`Unterbrechungen${spur.ereignisse?.length ? ` (${spur.ereignisse.length})` : ""}`, "v", z.glied === -2, "Stutter, Tape-Stop, Gate, Echo-Wurf …", () => { z.glied = -2; pluginAufbauen(); }),
      umschalt(`Bereiche${spur.bereiche?.length ? ` (${spur.bereiche.length})` : ""}`, "v", z.glied === -3, "stumm, lauter, leiser, Effekte auf markierten Bereichen", () => { z.glied = -3; pluginAufbauen(); }),
      umschalt(`Fassungen${spur.fassungen?.length ? ` (${spur.fassungen.length + 1})` : ""}`, "v", z.glied === -4, "die Spur durch eine neue Quelle ersetzen, A/B mit der alten", () => { z.glied = -4; pluginAufbauen(); })] : []),
    ...kette.map((g, i) => umschalt(PLUGINS[g.plugin].name, "v", i === z.glied, g.plugin, () => { z.glied = i; pluginAufbauen(); }))];
  const wahl = el("div", { className: "glied-wahl" }, ...reiter);
  if (z.glied === -1 && spur?.quelle) { klangAufbauen(box, spur, wahl); return; }
  if (z.glied === -2 && spur) { unterAufbauen(box, spur, wahl); return; }
  if (z.glied === -3 && spur) { bereicheAufbauen(box, spur, wahl); return; }
  if (z.glied === -4 && spur) { fassungenAufbauen(box, spur, wahl); return; }
  if (z.glied < 0) z.glied = 0;
  const glied = kette[z.glied], def = PLUGINS[glied.plugin];
  box.append(el("div", { className: "plugin-kopf" }, el("h2", { textContent: `${name}: ${def.name} ${def.version}` }), wahl, el("span", { className: "leise-text", textContent: def.beschreibung })));
  // Varianten (nur der Kanalzug hat welche)
  if (def.id === "kanalzug") {
    const vs = variantenFuer(aktuellerTyp());
    box.append(el("div", { className: "varianten" }, ...vs.map((v, i) => {
      const b = el("button", { className: "variante-k", title: `Taste ${i + 1}` }, el("b", { textContent: `${i + 1} · ${v.name}` }), el("small", { textContent: v.beschreibung }));
      b.setAttribute("aria-pressed", String(glied.variante === i));
      b.onclick = () => varianteWaehlen(i);
      return b;
    })));
  }
  // Parameter nach Gruppen
  const gruppen = new Map();
  for (const p of def.parameter) { if (!gruppen.has(p.gruppe)) gruppen.set(p.gruppe, []); gruppen.get(p.gruppe).push(p); }
  const raster = el("div", { className: "gruppen" });
  for (const [g, ps] of gruppen) {
    const kopf = el("h3", {}, el("span", { textContent: g }));
    if (g === "Kompressor" || g === "Grenze") kopf.append(el("span", { className: "gr", id: "grAnzeige", textContent: "" }));
    const box2 = el("div", { className: "gruppe" }, kopf);
    for (const p of ps) {
      const v = glied.parameter[p.key] ?? p.std;
      const out = el("output", { textContent: zeigeWert(p, v), className: p.aus === v ? "aus" : "" });
      const inp = el("input", { type: "range", min: 0, max: 1000, step: 1, value: Math.round(zuStellung(p, v) * 1000), title: p.hilfe ?? "" });
      inp.setAttribute("aria-label", p.name);
      const setze = (wert) => { glied.parameter[p.key] = wert; glied.variante = null; out.textContent = zeigeWert(p, wert); out.className = p.aus === wert ? "aus" : ""; senden(); variantenMarke(); };
      inp.oninput = () => setze(Math.min(p.max, Math.max(p.min, ausStellung(p, Number(inp.value) / 1000))));
      inp.ondblclick = () => { inp.value = Math.round(zuStellung(p, p.std) * 1000); setze(p.std); };
      box2.append(el("label", { className: "param", title: p.hilfe ?? "" }, el("span", { textContent: p.name }), out, inp));
    }
    raster.append(box2);
  }
  box.append(raster);
  const aus = umschalt(glied.aus ? "Plugin ist aus" : "Plugin ist an", "v", !glied.aus, "dieses Glied der Kette überspringen", () => { glied.aus = !glied.aus; senden(); pluginAufbauen(); });
  const zurueck = el("button", { className: "knopf klein leise", textContent: "alles auf Standard" });
  zurueck.onclick = () => { glied.parameter = standardWerte(def); glied.variante = def.id === "kanalzug" ? 0 : undefined; senden(); pluginAufbauen(); spurenAufbauen(); };
  box.append(el("div", { className: "plugin-fuss" }, aus, zurueck, el("span", { className: "leise-text", textContent: "Doppelklick auf einen Regler setzt ihn zurück. Vorher/nachher: V an der Spur oder für alles." })));
}
function variantenMarke() {
  const glied = aktuelleKette()?.[z.glied];
  document.querySelectorAll(".variante-k").forEach((b, i) => b.setAttribute("aria-pressed", String(glied?.variante === i)));
}
function varianteWaehlen(i) {
  const spur = z.projekt.spuren.find((s) => s.id === z.gewaehlt);
  if (z.glied === -1 && spur?.quelle) { stimmVariante(spur, i); return; }
  const kette = aktuelleKette(); if (!kette) return;
  const k = kette.findIndex((g) => g.plugin.startsWith("kanalzug@"));
  if (k < 0 || !variantenFuer(aktuellerTyp())[i]) return;
  PR.varianteSetzen(kette[k], aktuellerTyp(), i);
  z.glied = k; senden(); pluginAufbauen(); if (z.gewaehlt !== "summe") spurenAufbauen();
  melde(`${variantenFuer(aktuellerTyp())[i].name}`, 1200);
}

// ---------- Erzeugen ----------
function stileAufbauen() {
  const sel = $("stil"), gruppen = {}, NAMEN = { ornament: "Ornament", elektronisch: "Drums, elektronisch", organisch: "Perkussion, organisch" };
  for (const s of STILE.filter((x) => !x.versteckt)) (gruppen[s.gruppe] ??= []).push(s);
  for (const [g, liste] of Object.entries(gruppen)) sel.append(el("optgroup", { label: NAMEN[g] ?? g }, ...(g === "ornament" ? [el("option", { value: "lucerne", textContent: "ornament.lucerne · Erinnerung · 88 (eigene Aufnahmen)" })] : []), ...liste.map((s) => el("option", { value: s.key, textContent: `${s.name} · ${s.bpm}` }))));
  const bass = ERZEUGER["bass@0.1.0"].stimmen;
  $("bassStimme").append(...Object.values(bass).map((b) => el("option", { value: b.key, textContent: b.name })));
  $("bassLinie").append(...LINIEN.map((l) => el("option", { value: l.key, textContent: l.name, title: l.hilfe })));
  $("tonart").append(...NOTEN.map((n, i) => el("option", { value: i, textContent: n, selected: i === 2 })));
  $("flaecheStimme").append(...Object.values(ERZEUGER["natur@0.3.0"].stimmen).map((b) => el("option", { value: b.key, textContent: b.name })));
  $("leiter").append(...Object.entries(LEITERN).map(([k, l]) => el("option", { value: k, textContent: l.name })));
  sel.onchange = () => {
    if (sel.value === "lucerne") { $("erzBpm").value = 88; $("lucerne")?.scrollIntoView({ behavior: "smooth", block: "nearest" }); return; }
    const st = stilVon(sel.value); $("erzBpm").value = st.bpm;
    if (st.bass) { $("bassStimme").value = st.bass.stimme; $("bassLinie").value = st.bass.linie; $("leiter").value = st.bass.leiter; }
  };
  sel.onchange();
}

const istBass = (s) => s.quelle?.erzeuger?.startsWith("bass@");
const istSynth = (s) => s.quelle?.erzeuger?.startsWith("synth@");
const istDrums = (s) => /^(drums|perkussion)@/.test(s.quelle?.erzeuger ?? "");

/** die Kick (oder sonst die tiefste erzeugte Schlagspur) als Vorlage für den Rhythmus des Basses */
function kickVorlage() {
  const sp = z.projekt.spuren.filter(istDrums);
  const kick = sp.find((s) => s.quelle.stimme === "kick") ?? sp.find((s) => ["rahmen", "darbuka", "zarb", "tabla", "tom"].includes(s.quelle.stimme)) ?? sp[0];
  if (!kick) return null;
  // bei Perkussion nur die tiefen Schläge
  const tief = /^(x|o|dum|doum|tom|ge|ghe|dha|dhin|dhi|bum|tun)[!_]?$/;
  return kickSchritte(kick.quelle.takte.map((zl) => zl.trim().split(/\s+/).map((t) => (tief.test(t) || (kick.quelle.stimme === "kick" && t !== "." && t !== "-") ? t : ".")).join(" ")));
}

/** den Bass erzeugen (ersetzt einen vorhandenen erzeugten Bass) */
const kammerton = () => z.projekt.kammerton ?? 432;
function bassErzeugen({ anzahl, bpm, seed, stil }) {
  for (const sp of z.projekt.spuren.filter(istBass)) { post({ art: "weg", id: sp.id }); z.daten.delete(sp.id); }
  z.projekt.spuren = z.projekt.spuren.filter((s) => !istBass(s));
  const st = stimmeVon("bass@0.1.0", $("bassStimme").value), vorgabe = stil?.bass?.stimme === st.key ? stil.bass : null;
  const v = st.varianten.find((x) => x.name === vorgabe?.variante) ?? st.varianten[0], linie = $("bassLinie").value, leiter = $("leiter").value;
  const quelle = { art: "erzeugt", erzeuger: "bass@0.1.0", stimme: st.key, variante: v.name, werte: { ...v.werte }, linie, leiter, grundton: Number($("tonart").value),
    kammerton: kammerton(), takte: linieErzeugen({ art: linie, leiter, kicks: kickVorlage(), anzahl: Math.min(anzahl, 8), seed }), anzahl, bpm, swing: stil?.swing ?? 0, menschlich: Math.min(4, stil?.menschlich ?? 2), versatz: 0, seed: seed * 100 + 50 };
  const sp = PR.erzeugteSpurDazu(z.projekt, quelle, { name: `Bass · ${st.name}`, typ: "bass", pegel: st.pegel, pan: 0, bassfett: stil?.bass?.bassfett ?? null });
  spurNeuRechnen(sp);
  return sp;
}

/** eine erzeugte Spur rechnen und dem Motor geben (die Kette mit ihrem Zustand bleibt) */
// Flächen rechnet ein Worker: die Oberfläche bleibt bedienbar. Ein späteres Ergebnis ersetzt ein früheres nicht (Stand je Spur).
let rechner = null, auftragNr = 0;
const offen = new Map(), stand = new Map();
// mehrere Worker (höchstens drei): Spuren eines ganzen Tracks rechnen gleichzeitig; ein Auftrag geht an den Worker mit den wenigsten offenen
function imWorker(q, bezug, nurStarten = false) {
  if (!rechner) {
    const anzahl = Math.max(1, Math.min(3, (navigator.hardwareConcurrency || 2) - 1));
    rechner = Array.from({ length: anzahl }, () => { const w = new Worker(new URL("./worker/rechnen-worker.js", import.meta.url), { type: "module" }); w.offen = 0; w.onmessage = ({ data }) => { w.offen--; const o = offen.get(data.id); offen.delete(data.id); if (o) data.fehler ? o.nein(new Error(data.fehler)) : o.ja(data.kanaele ?? data.ergebnis); }; return w; });
  }
  if (nurStarten) return null;
  const id = ++auftragNr, b = { ...bezug }, w = rechner.reduce((a, x) => (x.offen < a.offen ? x : a));
  if (b.sample) b.sample = { kanaele: b.sample.kanaele.map((k) => k.slice()), rate: b.sample.rate };
  w.offen++;
  return new Promise((ja, nein) => { offen.set(id, { ja, nein }); w.postMessage({ id, q: JSON.parse(JSON.stringify(q)), bezug: b, rate: z.rate }); });
}
/** ein beliebiger Auftrag an einen Worker (z. B. die Analyse einer Aufnahme für die Klangsammlung) */
function imWorkerRoh(nachricht) {
  imWorker(null, null, true);
  const id = ++auftragNr, w = rechner.reduce((a, x) => (x.offen < a.offen ? x : a));
  w.offen++;
  return new Promise((ja, nein) => { offen.set(id, { ja, nein }); w.postMessage({ ...nachricht, id }); });
}
function spurNeuRechnen(sp) {
  if (istSampler(sp)) return samplerRechnen(sp);
  if (sp.quelle.flaeche || istSynth(sp)) {
    // je Spur höchstens ein Auftrag unterwegs; Änderungen während der Rechnung werden danach in einem Durchgang nachgeholt
    const st = stand.get(sp.id) ?? { laeuft: null, nochmal: false };
    stand.set(sp.id, st);
    if (st.laeuft) { st.nochmal = true; return st.laeuft; }
    zeigeRechnen(sp.id, true);
    st.laeuft = imWorker(sp.quelle, sp.quelle.flaeche ? bezugFuer(sp) : {}).then((k) => { if (z.projekt.spuren.includes(sp)) { spurSenden(sp, k); zeichnen(); } })
      .catch((e) => melde(`${sp.name}: ${e.message}`, 8000))
      .finally(() => { st.laeuft = null; if (st.nochmal) { st.nochmal = false; spurNeuRechnen(sp); } else zeigeRechnen(sp.id, false); });
    return st.laeuft;
  }
  spurSenden(sp, spurRechnen(sp.quelle, z.rate).kanaele);
  // Flächen, die dieser Spur folgen (Akkorde, Einsätze, Hüllkurve), mitrechnen
  if (!sp.quelle.flaeche) for (const f of z.projekt.spuren.filter((x) => x.quelle?.flaeche)) if (z.daten.has(f.id)) spurBald(f);
  if (istBass(sp)) for (const y of z.projekt.spuren.filter(istSynth)) { const q = y.quelle; q.grundton = sp.quelle.grundton; q.leiter = sp.quelle.leiter; if (q.sequenzAuto !== false) q.takte = synthSequenz(q); spurBald(y); }
}

/**
 * Bezug einer Flächenspur zu den anderen Spuren: Tonart und Akkorde vom Bass (erster Ton jedes Takts), Einsätze von Kick und Snare,
 * die Hüllkurve des Basses (100 Werte je Sekunde), dazu eine eigene Aufnahme oder Messdaten.
 */
function bezugFuer(sp) {
  const q = sp.quelle, takt = (60 / q.bpm) * 4, bass = z.projekt.spuren.find(istBass);
  const b = {};
  if (bass) {
    q.grundton = bass.quelle.grundton; q.leiter = bass.quelle.leiter;
    b.akkorde = [];
    for (let t = 0; t < q.anzahl; t++) { const z0 = String(bass.quelle.takte[t % bass.quelle.takte.length]).trim().split(/\s+/).map(tonLesen).find((x) => x && x !== "-"); b.akkorde.push({ beginn: t * takt, stufe: z0 ? ((z0.stufe - 1 + 70) % 7) + 1 : 1 }); }
    const roh = z.daten.get(bass.id)?.roh;
    if (roh) { const h = Math.round(z.rate / 100), m = Math.floor(roh[0].length / h), e = new Float32Array(m); for (let j = 0; j < m; j++) { let s2 = 0; for (let i = j * h; i < (j + 1) * h; i += 4) s2 += roh[0][i] * roh[0][i]; e[j] = Math.sqrt(s2 / (h / 4)); } b.huelle = e; }
  }
  const drums = z.projekt.spuren.filter((x) => istDrums(x) && ["kick", "snare", "clap", "rahmen", "darbuka", "tabla", "zarb"].includes(x.quelle.stimme));
  if (drums.length) {
    b.einsaetze = [];
    for (const d of drums) for (let t = 0; t < q.anzahl; t++) for (const s2 of taktLesen(d.quelle.takte[t % d.quelle.takte.length])) b.einsaetze.push(t * takt + s2.stelle * takt);
    b.einsaetze.sort((x, y) => x - y);
  }
  if (q.sample) { const a = z.samples.get(q.sample.sha256); if (a) b.sample = a; }
  if (q.messdaten?.length) b.daten = q.messdaten;
  return b;
}

function zeigeRechnen(id, an) { const c = document.querySelector(`canvas.welle[data-id="${id}"]`); c?.closest(".spur")?.classList.toggle("rechnet", an); }

/** Stufe je Takt aus dem ersten Ton jedes Takts der Bassspur; ohne Bass eine Moll-Folge */
function akkordeVomBass(anzahl) {
  const bass = z.projekt.spuren.find(istBass);
  if (!bass) return [1, 6, 4, 5];
  return Array.from({ length: Math.min(8, anzahl) }, (_, t) => { const z0 = String(bass.quelle.takte[t % bass.quelle.takte.length]).trim().split(/\s+/).map(tonLesen).find((x) => x && x !== "-"); return z0 ? ((z0.stufe - 1 + 70) % 7) + 1 : 1; });
}
function synthSequenz(q) {
  const { belegt, snares } = drumLuecken();
  return sequenzErzeugen({ rolle: q.rolle, akkorde: akkordeVomBass(q.anzahl), kicks: kickVorlage(), anzahl: q.anzahl, seed: q.seed, halftime: q.bpm >= 140 && ["pad", "chord", "keys", "drone", "flaeche", "tanpura"].includes(q.rolle),   // «schwebe» läuft ohnehin quer
    regler: q.regler, belegt, snares, zyklus: ZYKLUS_LEITER[q.leiter] ?? 0 });
}
// Off-Beats in raga- und maqam-inspirierten Tonleitern folgen einem Zyklus gegen den 4/4-Takt (Rupak 7, Jhaptal 10, Sama'i-artig 10)
const ZYKLUS_LEITER = { bhairav: 7, bhairavi: 10, yaman: 7, todi: 10, marwa: 7, bayati: 10, rast: 7, saba: 10, kurd: 7, shur: 10, hijaz: 7 };
/** wo die Drums schlagen (je Takt die belegten Sechzehntel aller Schlagspuren) und wo die Snare liegt: Lücken für Off-Beats und Spitzen */
function drumLuecken() {
  const sp = z.projekt.spuren.filter(istDrums); if (!sp.length) return { belegt: null, snares: null };
  const n = Math.min(8, Math.max(...sp.map((s) => s.quelle.takte.length))), belegt = [], snares = [];
  for (let b = 0; b < n; b++) {
    const bel = new Set(), sn = [];
    for (const s of sp) for (const x of taktLesen(s.quelle.takte[b % s.quelle.takte.length])) { const st = Math.round(x.stelle * 16); if (x.staerke >= 0.6) bel.add(st); if (["snare", "clap"].includes(s.quelle.stimme)) sn.push(st); }
    belegt.push([...bel]); snares.push(sn);
  }
  return { belegt, snares };
}
/** Synths folgen Tempo, Länge, Tonart und (wenn nicht von Hand geändert) den Akkorden des Basses */
function synthsFolgen({ anzahl, bpm }) {
  const bass = z.projekt.spuren.find(istBass);
  for (const s of z.projekt.spuren.filter(istSynth)) {
    const q = s.quelle;
    if (anzahl) q.anzahl = anzahl; if (bpm) q.bpm = bpm;
    if (bass) { q.grundton = bass.quelle.grundton; q.leiter = bass.quelle.leiter; }
    if (q.sequenzAuto !== false) q.takte = synthSequenz(q);
    spurNeuRechnen(s);
  }
}
async function synthDazu(vorgabe = null) {
  await kontext(48000);
  const [fam, patch] = vorgabe ?? $("synthPreset").value.split(":"), st = stimmeVon(SYNTH_NEU, fam), pt = PATCHES[patch], bass = z.projekt.spuren.find(istBass), drums = z.projekt.spuren.find(istDrums);
  const v = st.varianten.find((x) => x.werte.patch === patch) ?? st.varianten[0], bpm = z.projekt.tempo.bpm || Number($("erzBpm").value), anzahl = drums?.quelle.anzahl ?? Number($("takte").value);
  const rolle = vorgabe ? vorgabe[2] ?? pt.rolle : $("synthRolle").value === "auto" ? pt.rolle : $("synthRolle").value;
  const q = { art: "erzeugt", erzeuger: SYNTH_NEU, stimme: fam, variante: v.name, werte: { ...v.werte }, rolle, regler: { ...REGLER_STD, ...(vorgabe?.[3]?.regler ?? {}) }, sequenzAuto: true, anzahl, bpm,
    grundton: bass?.quelle.grundton ?? Number($("tonart").value), leiter: bass?.quelle.leiter ?? $("leiter").value, kammerton: kammerton(), swing: drums?.quelle.swing ?? 0, menschlich: 2, versatz: 0, seed: 1 + Math.floor(Math.random() * 99998) };
  q.takte = synthSequenz(q);
  const echoMs = Math.round((0.75 * 60000) / (bpm >= 140 ? bpm / 2 : bpm));
  const sp = PR.erzeugteSpurDazu(z.projekt, q, { name: `${st.name} · ${pt.name}`, typ: "synth", pegel: st.pegel + (vorgabe?.[3]?.pegel ?? 0), glanz: vorgabe ? { menge: 35, biss: 55, luft: 3 } : null, echo: { anteil: Math.round(Math.max(pt.echo ?? 0.2, rolle === "offbeat" ? 0.4 : 0) * 100), zeit: echoMs }, raum: { anteil: 18, nachhall: 2.6, daempfung: 5000, vorverz: 20 } });
  melde(`${pt.name} wird gerechnet …`, 0); await atmen();
  const fertig = spurNeuRechnen(sp);
  if (vorgabe) return fertig;
  if (!z.schleife) { const L = (anzahl * 240) / bpm; z.schleife = { a: 0, b: L }; z.schleifeAn = true; schleifeSenden(); }
  z.gewaehlt = sp.id; z.glied = -1; senden(); allesAufbauen();
  melde(`${pt.name}: ${ROLLEN.find((r) => r.key === rolle).name}, ${NOTEN[q.grundton]} ${LEITERN[q.leiter].name}${bass ? ", Akkorde vom Bass" : ""}`, 4000);
}
/** Preset-Wahl, Rolle, Sequenz, sechs Varianten, Regler der Melodie, Variation für eine Synthspur */
function synthSteuerung(sp) {
  const q = sp.quelle, box = el("div", { className: "herkunft" }), M = synthModul(q);
  const preset = el("select", { title: "Preset (Familie und Klang)" }, ...M.FAMILIEN_LISTE.map((f) => el("optgroup", { label: f.name }, ...f.patches.map((k) => el("option", { value: `${f.key}:${k}`, textContent: `${M.PATCHES[k].name} (${M.PATCHES[k].rolle}, ${M.PATCHES[k].verfahren}${M.PATCHES[k].charaktere?.length ? ", " + M.PATCHES[k].charaktere.join(", ") : ""})`, selected: q.stimme === f.key && q.werte.patch === k })))));
  preset.onchange = () => { const [fam, k] = preset.value.split(":"); q.stimme = fam; q.werte = { ...q.werte, patch: k }; q.variante = M.PATCHES[k].name; sp.name = `${stimmeVon(q.erzeuger, fam).name} · ${M.PATCHES[k].name}`; spurNeuRechnen(sp); spurenAufbauen(); pluginAufbauen(); };
  const rolle = el("select", { title: "Rolle: bestimmt die erzeugte Sequenz" }, ...ROLLEN.map((r) => el("option", { value: r.key, textContent: r.name, selected: r.key === q.rolle })));
  const neu = el("button", { className: "mini", textContent: "Sequenz neu", title: "neue Sequenz dieser Rolle aus Bass und Drums (neuer Startwert)" });
  const neuRechnen = () => { q.rolle = rolle.value; q.seed = (q.seed % 100000) + 7919; q.sequenzAuto = true; q.takte = synthSequenz(q); spurNeuRechnen(sp); pluginAufbauen(); };
  rolle.onchange = neuRechnen; neu.onclick = neuRechnen;
  const variation = el("button", { className: "mini", textContent: "Variation", title: "die Makros begrenzt zufällig verschieben (rückgängig mit «zurück»)" });
  const zurueck = el("button", { className: "mini", textContent: "zurück", disabled: !sp._vorVariation });
  variation.onclick = () => { sp._vorVariation = { ...q.werte }; const r = () => (Math.random() - 0.5) * 30; for (const k of ["helligkeit", "bewegung", "waerme", "alter", "breite", "charakter"]) q.werte[k] = Math.max(0, Math.min(100, Math.round((q.werte[k] ?? 50) + r()))); q.variante = null; spurNeuRechnen(sp); pluginAufbauen(); };
  zurueck.onclick = () => { if (!sp._vorVariation) return; q.werte = sp._vorVariation; sp._vorVariation = null; spurNeuRechnen(sp); pluginAufbauen(); };
  box.append(el("div", { className: "klang-zeile" }, el("span", { className: "leise-text", textContent: "Preset" }), preset, el("span", { className: "leise-text", textContent: "Rolle" }), rolle, neu, variation, zurueck));
  // sechs Varianten derselben Situation (Startwerte aus einem gemeinsamen Grund): vergleichen, die beste behalten
  q.variantenGrund ??= q.seed;
  const varianten = el("div", { className: "klang-zeile" }, el("span", { className: "leise-text", textContent: "Melodie-Varianten" }), ...Array.from({ length: 6 }, (_, i) => {
    const s0 = q.variantenGrund + i * 7919, b = el("button", { className: "mini", textContent: String(i + 1), title: `Startwert ${s0}: dieselbe Rolle und dieselben Regler, andere Variante` });
    b.setAttribute("aria-pressed", String(q.seed === s0 && q.sequenzAuto !== false));
    b.onclick = () => { q.seed = s0; q.sequenzAuto = true; q.takte = synthSequenz(q); spurNeuRechnen(sp); pluginAufbauen(); };
    return b;
  }), (() => { const b = el("button", { className: "mini", textContent: "neue sechs", title: "sechs neue Varianten" }); b.onclick = () => { q.variantenGrund = 1 + Math.floor(Math.random() * 90000); q.seed = q.variantenGrund; q.sequenzAuto = true; q.takte = synthSequenz(q); spurNeuRechnen(sp); pluginAufbauen(); }; return b; })());
  box.append(varianten);
  // Regler der Melodie (melodien.md): Wandel, Weite, Spitzen, Off-Beat, Klassik, Ruhe; Skala über die Tonleiter des Basses, Ausdruck im Klang
  q.regler = { ...REGLER_STD, ...(q.regler ?? {}) };
  const regler = el("div", { className: "klang-zeile" }, ...REGLER.map((r) => {
    const i = el("input", { type: "range", min: 0, max: 100, step: 5, value: q.regler[r.key], title: r.hilfe }), w = el("span", { className: "leise-text", textContent: `${r.name} ${q.regler[r.key]}` });
    i.setAttribute("aria-label", r.name); i.oninput = () => { w.textContent = `${r.name} ${i.value}`; };
    i.onchange = () => { q.regler[r.key] = Number(i.value); if (q.sequenzAuto !== false) { q.takte = synthSequenz(q); spurNeuRechnen(sp); } };
    return el("label", { className: "regler-klein", title: r.hilfe }, w, i);
  }));
  box.append(el("details", { open: ["flaeche", "spitzen", "offbeat", "ruf", "alap"].includes(q.rolle) }, el("summary", { className: "leise-text", textContent: "Regler der Melodie (wirken auf neu erzeugte Sequenzen)" }), regler));
  box.append(el("p", { className: "hinweis", textContent: `${NOTEN[q.grundton]} ${LEITERN[q.leiter]?.name ?? q.leiter}, A = ${q.kammerton ?? 432} Hz${z.projekt.spuren.some(istBass) ? ", Tonart und Akkorde vom Bass" : ""}${q.sequenzAuto === false ? ", Sequenz von Hand geändert (folgt dem Bass nicht mehr)" : ""}${q.erzeuger !== SYNTH_NEU ? `. Ältere Fassung ${q.erzeuger}: klingt wie beim Erzeugen; neue Presets gibt es in einer neuen Synthspur.` : ""}` }));
  const m = M.MAKROS[q.stimme];
  if (m) box.append(el("details", {}, el("summary", { className: "leise-text", textContent: "Was die Makros hier tun" }), el("ul", { className: "hinweis" }, ...["helligkeit", "bewegung", "waerme", "alter", "breite"].map((k) => el("li", { textContent: `${k}: ${m[k]}` })), el("li", { textContent: `${m.charakterName}: ${m.charakter}` }),
    ...(M.CHARAKTERE ?? []).map((c) => el("li", { textContent: `Färbung «${c.name}»: ${c.hilfe}` })))));
  return box;
}

/** eine Flächenspur dazu */
async function flaecheDazu(vorgabe = null) {
  await kontext(48000);
  const st = stimmeVon("natur@0.3.0", vorgabe?.[0] ?? $("flaecheStimme").value), vv = vorgabe?.[1]?.variante, v = st.varianten.find((x) => x.name === vv) ?? st.varianten[0];
  const drums = z.projekt.spuren.find(istDrums), bass = z.projekt.spuren.find(istBass);
  const anzahl = drums?.quelle.anzahl ?? Number($("takte").value), bpm = z.projekt.tempo.bpm || Number($("erzBpm").value);
  const quelle = { art: "erzeugt", erzeuger: "natur@0.3.0", stimme: st.key, variante: vorgabe?.[1] && !vv ? null : v.name, werte: { ...v.werte, ...Object.fromEntries(Object.entries(vorgabe?.[1] ?? {}).filter(([k]) => k !== "variante")) }, flaeche: true, anzahl, bpm, grundton: bass?.quelle.grundton ?? Number($("tonart").value), leiter: bass?.quelle.leiter ?? $("leiter").value, kammerton: kammerton(), seed: 1 + Math.floor(Math.random() * 99998), sample: null, messdaten: null };
  const sp = PR.erzeugteSpurDazu(z.projekt, quelle, { name: st.name, typ: "flaeche", pegel: st.pegel + (vorgabe?.[2]?.pegel ?? 0), pan: 0, glanz: vorgabe ? { menge: 20, luft: 2 } : null, raum: { anteil: 30, nachhall: 3.6, daempfung: 4500, vorverz: 25, groesse: 1.6, tiefschnitt: 200, bewegung: 40 } });
  melde(`${st.name} wird gerechnet …`, 0);
  const fertig = spurNeuRechnen(sp);
  if (vorgabe) return fertig;
  await fertig;
  if (!z.schleife) { const L = (anzahl * 240) / bpm; z.schleife = { a: 0, b: L }; z.schleifeAn = true; schleifeSenden(); }
  z.gewaehlt = sp.id; z.glied = -1; senden(); allesAufbauen();
  melde(`${st.name}: ${sp.quelle.sample ? "Aufnahme" : "synthetische Quelle"}, ${NOTEN[sp.quelle.grundton]} ${LEITERN[sp.quelle.leiter].name}`, 4000);
}

/**
 * Tondaten einer Spur an den Motor: roh (aus Datei oder Erzeuger) → Unterbrechungen → Motor. Ohne roh werden die gespeicherten Rohdaten
 * neu verarbeitet (nach einer Änderung an den Unterbrechungen oder am Tempo).
 */
function spurSenden(sp, roh = z.daten.get(sp.id)?.roh) {
  if (!roh) return;
  // Quelle (verschoben, wiederholt, angeglichen) → Unterbrechungen → Bereiche → Motor
  let kanaele = FA.vorbereiten(roh, z.rate, sp, sp.wiederholen ? laengeOhne(sp.id) : 0);
  if (sp.ereignisse?.length) kanaele = anwenden(kanaele, z.rate, sp.ereignisse, z.projekt.tempo);
  if (sp.bereiche?.length) kanaele = BE.anwenden(kanaele, z.rate, sp.bereiche, z.projekt.tempo, PLUGINS);
  z.daten.set(sp.id, { roh, kanaele, wellen: wellenform(kanaele) });
  const kopie = kanaele.map((x) => x.slice());
  post({ art: "spur", id: sp.id, kanaele: kopie }, kopie.map((x) => x.buffer));
}
const unterPlan = new Map();
function unterBald(sp) { clearTimeout(unterPlan.get(sp.id)); unterPlan.set(sp.id, setTimeout(() => { unterPlan.delete(sp.id); spurSenden(sp); zeichnen(); }, 100)); }
function alleNeuSenden() { for (const sp of z.projekt.spuren) if (sp.ereignisse?.length || sp.bereiche?.length) spurSenden(sp); zeichnen(); }
/** Länge des Projekts ohne eine Spur (Abtastwerte der Rohdaten), für «wiederholen» */
const laengeOhne = (id) => Math.max(0, ...[...z.daten].filter(([k]) => k !== id).map(([, d]) => d.roh?.[0].length ?? 0));
/** Rohdaten einer Datei für eine Spur: mit der gespeicherten Tempo-Angleichung */
function rohAusDatei(sp, kanaele) { return sp.dehnung && Math.abs(sp.dehnung - 1) > 1e-4 ? dehnen(kanaele, z.rate, sp.dehnung) : kanaele; }
let neuPlan = new Map();
/** nach einer Änderung am Klang: kurz warten (Regler werden gezogen), dann neu rechnen */
function spurBald(sp) {
  clearTimeout(neuPlan.get(sp.id));
  neuPlan.set(sp.id, setTimeout(() => { neuPlan.delete(sp.id); spurNeuRechnen(sp); zeichnen(); }, 120));
}

async function erzeugen({ anzahlVorgabe = null, still = false } = {}) {
  if ($("stil").value === "lucerne") return LUI.erzeugen({ studie: true });
  const stil = stilVon($("stil").value), bpm = Number($("erzBpm").value) || stil.bpm, anzahl = anzahlVorgabe ?? Number($("takte").value), seed = Math.max(1, Math.round(Number($("seed").value) || 1));
  await kontext(48000);
  if (z.laeuft) await spielen();
  if ($("ersetzen").checked) for (const sp of z.projekt.spuren.filter(istDrums)) { post({ art: "weg", id: sp.id }); z.daten.delete(sp.id); }
  if ($("ersetzen").checked) z.projekt.spuren = z.projekt.spuren.filter((s) => !istDrums(s));
  z.projekt.tempo = { ...z.projekt.tempo, bpm, quelle: "stil", beginn: 0, aus: stil.name };
  if (!anzahlVorgabe) z.projekt.abschnitte = null;
  melde(`erzeuge ${stil.name} …`, 0); await atmen();
  let erste = null;
  for (const [i, s] of stil.spuren.entries()) {
    const st = stimmeVon(s.erzeuger, s.stimme), v = st.varianten.find((x) => x.name === s.variante) ?? st.varianten[0];
    const quelle = { art: "erzeugt", erzeuger: s.erzeuger, stimme: s.stimme, variante: v.name, werte: { ...v.werte }, takte: [...s.takte], fill: s.fill ?? null,
      anzahl, bpm, swing: stil.swing, menschlich: s.menschlich ?? stil.menschlich, versatz: s.versatz ?? 0, seed: seed * 100 + i, stil: stil.key };
    const sp = PR.erzeugteSpurDazu(z.projekt, quelle, { name: st.name, typ: st.rolle === "perkussion" ? "perkussion" : "drums", pegel: s.pegel ?? st.pegel, pan: st.pan, raum: stil.raum ?? null });
    spurNeuRechnen(sp); erste ??= sp;
    await atmen();
  }
  if ($("mitBass").checked) bassErzeugen({ anzahl, bpm, seed, stil });
  for (const f of z.projekt.spuren.filter((x) => x.quelle?.flaeche)) { f.quelle.anzahl = anzahl; f.quelle.bpm = bpm; spurNeuRechnen(f); }
  synthsFolgen({ anzahl, bpm });
  const L = (anzahl * 240) / bpm;
  z.schleife = { a: 0, b: L }; z.schleifeAn = true; z.projekt.schleife = { a: 0, b: L }; schleifeSenden();
  z.gewaehlt = erste.id; z.glied = -1; z.pos = 0; post({ art: "stelle", pos: 0 });
  senden(); allesAufbauen();
  if (!still) melde(`${stil.name}: ${stil.spuren.length + ($("mitBass").checked ? 1 : 0)} Spuren, ${anzahl} Takte, ${bpm} BPM, ${NOTEN[$("tonart").value]} ${LEITERN[$("leiter").value].name}. Leertaste spielt in der Schleife.`, 5000);
}

/**
 * einen ganzen Track erzeugen: Drums und Bass des Stils über die volle Länge, die Synths und die Fläche, die zum Stil gehören, und ein
 * Arrangement aus Unterbrechungen (Abschnitte, Übergänge, Tape-Stop am Schluss). Danach ist alles wie von Hand angelegt: jede Spur, jedes
 * Ereignis, jeder Regler lässt sich ändern. Geladene Dateien bleiben, erzeugte Spuren werden ersetzt.
 */
async function trackErzeugen() {
  if ($("stil").value === "lucerne") return LUI.erzeugen({ studie: false });
  const stil = stilVon($("stil").value), bpm = Number($("erzBpm").value) || stil.bpm, sek = Number($("trackDauer").value), seed = Math.max(1, Math.round(Number($("seed").value) || 1));
  await kontext(48000);
  if (z.laeuft) await spielen();
  for (const sp of z.projekt.spuren.filter((x) => x.quelle)) { post({ art: "weg", id: sp.id }); z.daten.delete(sp.id); }
  z.projekt.spuren = z.projekt.spuren.filter((x) => !x.quelle);
  z.projekt.master.pegel = 0;
  const { takte, abschnitte } = abschnitteVon(sek, bpm, { seed });
  const b = BESETZUNG[stil.key] ?? { synths: [], natur: [], mix: [] };
  if (b.linie) $("bassLinie").value = b.linie;
  melde(`Track: Drums und Bass (${takte} Takte) …`, 0); await atmen();
  const mitBass = $("mitBass").checked; $("mitBass").checked = true;
  await erzeugen({ anzahlVorgabe: takte, still: true });
  $("mitBass").checked = mitBass;
  // je Abschnitt eigene Grooves und Basslinien (seit Composer 0.3)
  for (const sp of z.projekt.spuren.filter(istDrums)) { const def = stil.spuren.find((x) => x.stimme === sp.quelle.stimme)?.teile; if (def) { sp.quelle.teile = teileAus(def, abschnitte); spurNeuRechnen(sp); } }
  const bassSp = z.projekt.spuren.find(istBass);
  if (bassSp && b.bassTeile) {
    const q = bassSp.quelle, defs = Object.fromEntries(Object.entries(b.bassTeile).map(([typ, art], k) => [typ, linieErzeugen({ art, leiter: q.leiter, kicks: kickVorlage(), anzahl: 8, seed: seed * 31 + k })]));
    q.teile = teileAus(defs, abschnitte); spurNeuRechnen(bassSp);
  }
  for (const sp of z.projekt.spuren.filter((x) => istDrums(x) && (b.ohne ?? []).includes(x.quelle.stimme))) { post({ art: "weg", id: sp.id }); z.daten.delete(sp.id); }
  z.projekt.spuren = z.projekt.spuren.filter((x) => !(istDrums(x) && (b.ohne ?? []).includes(x.quelle.stimme)));
  for (const [s2, stimme] of b.mix ?? []) stilSpurDazu(s2, stimme, { anzahl: takte, bpm, seed, swing: stil.swing });
  const laufend = [];
  for (const syn of b.synths) laufend.push(synthDazu(syn));
  for (const n of b.natur ?? []) laufend.push(flaecheDazu(n));
  melde(`Track: Synths und Naturklänge werden gerechnet …`, 0);
  await Promise.all(laufend);
  // das Arrangement: Ereignisse je Spur, nach ihrer Funktion
  for (const sp of z.projekt.spuren.filter((x) => x.quelle)) {
    sp.ereignisse = [...(sp.ereignisse ?? []).filter((e) => !e.arr), ...ereignisseFuer(funktionVon(sp.quelle), abschnitte, { seed, takte })];
    spurSenden(sp);
  }
  // Ornament Style: die Perkussion wechselt je Abschnitt (nur ein oder zwei Instrumente spielen)
  if (b.wechsel?.length) {
    const wechsel = wechselPerkussion(b.wechsel, abschnitte, { seed });
    for (const sp of z.projekt.spuren.filter((x) => istDrums(x) && b.wechsel.includes(x.quelle.stimme))) { sp.ereignisse.push(...wechsel.get(sp.quelle.stimme)); spurSenden(sp); }
  }
  z.projekt.abschnitte = abschnitte;
  const L = takte * (240 / bpm);
  z.schleife = { a: 0, b: L }; z.schleifeAn = false; z.projekt.schleife = null; schleifeSenden();
  z.pos = 0; post({ art: "stelle", pos: 0 });
  z.gewaehlt = z.projekt.spuren[0]?.id ?? null; z.glied = -2; senden(); allesAufbauen();
  if ($("trackZiel").checked) { await bisFertig(); schnellEinpegeln(-14); }
  melde(`${stil.name}: ganzer Track, ${Math.round(L)} s, ${z.projekt.spuren.length} Spuren, ${abschnitte.map((a) => a.name).join(" → ")}. Leertaste spielt von vorn.`, 9000);
}

/**
 * die Summe schnell auf eine Ziel-Lautheit schätzen: die Spuren mit Pegel und Panorama addiert (ohne Plugin-Ketten), gemessen nach
 * BS.1770, der Summenpegel entsprechend gesetzt. Genauer, aber langsamer: «auf Ziel bringen» (rechnet die ganze Mischung).
 */
function schnellEinpegeln(ziel) {
  const sp = z.projekt.spuren.filter((x) => z.daten.has(x.id) && !x.stumm);
  if (!sp.length) return;
  const n = Math.max(...sp.map((x) => z.daten.get(x.id).kanaele[0].length)), sum = [new Float32Array(n), new Float32Array(n)];
  for (const x of sp) {
    const k = z.daten.get(x.id).kanaele, g = 10 ** ((x.pegel ?? 0) / 20), pan = x.pan ?? 0, gl = g * (pan <= 0 ? 1 : 1 - pan), gr = g * (pan >= 0 ? 1 : 1 + pan);
    for (let i = 0; i < k[0].length; i++) { sum[0][i] += k[0][i] * gl; sum[1][i] += (k[1] ?? k[0])[i] * gr; }
  }
  const l = lautheitIntegriert(sum, z.rate);
  if (!Number.isFinite(l)) return;
  z.projekt.master.pegel = Math.round(Math.max(-24, Math.min(12, ziel - l)) * 10) / 10;
  const grenze = z.projekt.master.kette.find((g) => g.plugin.startsWith("grenze@")); if (grenze) { grenze.parameter.decke = -1; grenze.aus = false; }
  senden(); summeKopf();
}

/** eine Spur aus einem anderen Stil dazu (Stilmix): z. B. die Tabla aus «Indien» unter Drum and Bass */
function stilSpurDazu(stilKey, stimme, { anzahl, bpm, seed, swing }) {
  const s0 = stilVon(stilKey), s = s0?.spuren.find((x) => x.stimme === stimme);
  if (!s) return null;
  const st = stimmeVon(s.erzeuger, s.stimme), v = st.varianten.find((x) => x.name === s.variante) ?? st.varianten[0];
  const quelle = { art: "erzeugt", erzeuger: s.erzeuger, stimme: s.stimme, variante: v.name, werte: { ...v.werte }, takte: [...s.takte], fill: s.fill ?? null,
    anzahl, bpm, swing, menschlich: s.menschlich ?? s0.menschlich, versatz: s.versatz ?? 0, seed: seed * 100 + 40, stil: stilKey, mix: true };
  if (bpm >= 130 && bpm > s0.bpm * 1.25) quelle.takte = halbeZeit(quelle.takte);   // im schnellen Stil im halben Tempo, wie im eigenen Stil
  const sp = PR.erzeugteSpurDazu(z.projekt, quelle, { name: `${st.name} (aus ${s0.name.split(/ \(|,/)[0]})`, typ: st.rolle === "perkussion" ? "perkussion" : "drums", pegel: (s.pegel ?? st.pegel) - 5, pan: -(st.pan || 0.2), raum: s0.raum ?? { anteil: 18, nachhall: 1.6 } });
  spurNeuRechnen(sp);
  return sp;
}

function stimmVariante(sp, i) {
  const st = stimmeVon(sp.quelle.erzeuger, sp.quelle.stimme), v = st.varianten[i];
  if (!v) return;
  sp.quelle.werte = { ...v.werte }; sp.quelle.variante = v.name;
  spurNeuRechnen(sp); pluginAufbauen(); spurenAufbauen();
  melde(`${sp.name}: ${v.name}`, 1200);
}

async function schlagHoeren(sp, art) {
  await kontext(48000); await tonWecken();
  const st = stimmeVon(sp.quelle.erzeuger, sp.quelle.stimme), q = sp.quelle;
  if (q.flaeche) { const d = z.daten.get(sp.id); if (!d) return; const n = Math.min(d.roh[0].length, z.rate * 6); const b = z.ctx.createBuffer(2, n, z.rate); b.copyToChannel(d.roh[0].subarray(0, n), 0); b.copyToChannel(d.roh[1].subarray(0, n), 1); const qk = z.ctx.createBufferSource(), g = z.ctx.createGain(); g.gain.value = 0.7; qk.buffer = b; qk.connect(g).connect(z.ctx.destination); qk.start(); return; }
  if (istSynth(sp)) {
    const w = { ...Object.fromEntries(st.parameter.map((p) => [p.key, p.std])), ...q.werte }, f0 = grundFrequenz(q.grundton, q.kammerton) * 2 ** st.oktaveVon(w), poly = st.poly(w);
    const toene = poly ? [0, 3, 7, 10] : [0], teile = toene.map((h, i) => st.rechne(w, z.rate, { frequenz: f0 * 2 ** (h / 12), dauer: 0.9, staerke: 0.85, seed: 3 + i, bpm: q.bpm }));
    const n = Math.max(...teile.map((t) => t[0].length)), k = st.nach([new Float32Array(n), new Float32Array(n)].map((x, c) => { for (const t of teile) for (let i = 0; i < t[c].length; i++) x[i] += t[c][i]; return x; }), z.rate, w, 3);
    const b = z.ctx.createBuffer(2, n, z.rate); b.copyToChannel(k[0], 0); b.copyToChannel(k[1], 1);
    const qk = z.ctx.createBufferSource(), g = z.ctx.createGain(); g.gain.value = 0.7; qk.buffer = b; qk.connect(g).connect(z.ctx.destination); qk.start(); return;
  }
  const [L, R] = q.leiter ? st.rechne({ ...Object.fromEntries(st.parameter.map((p) => [p.key, p.std])), ...q.werte }, z.rate, { frequenz: grundFrequenz(q.grundton) * 2 ** ((q.werte.oktave ?? 0) + (art ?? 0) / 12), dauer: 0.9, staerke: 0.85, seed: 3 })
    : schlagRechnen(q, art ?? st.artikulationen[0].key, z.rate);
  const b = z.ctx.createBuffer(2, L.length, z.rate); b.copyToChannel(L, 0); b.copyToChannel(R, 1);
  const quelleKnoten = z.ctx.createBufferSource(), g = z.ctx.createGain(); g.gain.value = 0.7; quelleKnoten.buffer = b; quelleKnoten.connect(g).connect(z.ctx.destination); quelleKnoten.start();
}

function klangAufbauen(box, sp, wahl) {
  if (istSampler(sp)) { klangPanel(box, sp, wahl); return; }
  const q = sp.quelle, st = stimmeVon(q.erzeuger, q.stimme), e = ERZEUGER[q.erzeuger];
  box.append(el("div", { className: "plugin-kopf" }, el("h2", { textContent: `${sp.name}: ${e.name} ${e.version}` }), wahl,
    el("span", { className: "leise-text", textContent: `Eigene Synthese, Startwert ${q.seed}. Jede Änderung rechnet die Spur neu; jeder Schlag und jeder Ton ist auf dieselbe Spitze gebracht, damit Klangfarbe nicht als Lautstärke gehört wird.` })));
  // einzelne Schläge anhören
  if (q.flaeche) box.append(flaechenSteuerung(sp));
  else if (istSynth(sp)) box.append(synthSteuerung(sp));
  else if (q.leiter) box.append(bassSteuerung(sp));
  else box.append(el("div", { className: "klang-zeile" }, el("span", { className: "leise-text", textContent: "anhören (A):" }),
    ...st.artikulationen.map((a) => { const b = el("button", { className: "mini", textContent: a.name, title: "ein Schlag, ohne Kanalzug und Raum" }); b.onclick = () => schlagHoeren(sp, a.key); return b; })));
  // Varianten der Stimme
  box.append(el("div", { className: "varianten" }, ...st.varianten.map((v, i) => {
    const b = el("button", { className: "variante-k", title: `Taste ${i + 1}` }, el("b", { textContent: `${i + 1} · ${v.name}` }), el("small", { textContent: v.beschreibung }));
    b.setAttribute("aria-pressed", String(q.variante === v.name)); b.onclick = () => stimmVariante(sp, i); return b;
  })));
  // Regler
  const gruppen = new Map();
  for (const p of st.parameter) { if (!gruppen.has(p.gruppe)) gruppen.set(p.gruppe, []); gruppen.get(p.gruppe).push(p); }
  const raster = el("div", { className: "gruppen" });
  const markiere = () => document.querySelectorAll(".variante-k").forEach((b) => b.setAttribute("aria-pressed", "false"));
  for (const [g, ps] of gruppen) {
    const kasten = el("div", { className: "gruppe" }, el("h3", {}, el("span", { textContent: g })));
    for (const p of ps) {
      if (p.wahl) {
        const w0 = q.werte[p.key] ?? p.std, sel = el("select", {}, ...p.wahl.map((o) => el("option", { value: String(o.wert), textContent: o.name, selected: String(o.wert) === String(w0) })));
        sel.onchange = () => { q.werte[p.key] = p.wahl.find((o) => String(o.wert) === sel.value).wert; q.variante = null; markiere(); spurBald(sp); };
        kasten.append(el("label", { className: "param" }, el("span", { textContent: p.name }), el("output"), sel));
      } else kasten.append(paramRegler(p, q.werte[p.key] ?? p.std, (v) => { q.werte[p.key] = v; q.variante = null; markiere(); spurBald(sp); }));
    }
    raster.append(kasten);
  }
  // Groove
  const groove = el("div", { className: "gruppe" }, el("h3", {}, el("span", { textContent: "Groove" })));
  const G = (key, name, min, max, std, einheit, hilfe) => ({ key, name, min, max, std, einheit, hilfe, schritt: key === "swing" ? 0.01 : 0.5 });
  for (const p of [G("swing", "Swing", 0, 0.5, 0, "", "jeder zweite Schlag nach hinten"), G("menschlich", "Menschlich", 0, 20, 2, "ms", "kleine Abweichungen im Timing"), G("versatz", "hinter dem Schlag", -20, 40, 0, "ms", "die ganze Spur später: laid back")])
    groove.append(paramRegler(p, q[p.key] ?? p.std, (v) => { q[p.key] = v; spurBald(sp); }));
  if (!q.flaeche) raster.append(groove);
  box.append(raster);
  if (q.flaeche) return;   // Flächen haben kein Muster: sie laufen durch
  // Muster
  const arten = (st.artikulationen ?? []).map((a) => a.key).join(", ");
  const ta = el("textarea", { className: "muster", rows: Math.min(8, q.takte.length + (q.fill ? 1 : 0) + 1), spellcheck: false, value: [...q.takte, ...(q.fill ? [`fill: ${q.fill}`] : [])].join("\n") });
  ta.oninput = () => {
    const zeilen = ta.value.split("\n").map((x) => x.trim()).filter(Boolean), fill = zeilen.find((x) => x.startsWith("fill:"));
    const takte = zeilen.filter((x) => !x.startsWith("fill:"));
    if (!takte.length) return;
    q.takte = takte; q.fill = fill ? fill.slice(5).trim() : null; if (istSynth(sp)) q.sequenzAuto = false; spurBald(sp);
  };
  box.append(el("div", { className: "gruppe", style: "margin-top:16px" }, el("h3", {}, el("span", { textContent: "Muster (eine Zeile je Takt, «fill:» für den Wirbel)" })), ta,
    el("p", { className: "hinweis", textContent: q.leiter
      ? "16 Zeichen = Sechzehntel, 8 = Achtel, 4 = Viertel. 1–7 Stufe der Tonleiter, b3 #4 mit Vorzeichen, 1' 1, Oktave höher, tiefer, «-» Ton hält, «.» Pause, «~» gleiten, «!» betont, «_» leise, «1+3+5» Akkord, «3=» im Akkord: Ton klingt ohne neuen Anschlag weiter."
      : `16 Zeichen = Sechzehntel, 8 = Achtel, 12 = Triolen. «.» Pause, x o g (laut, mittel, Geisternote), oder Artikulationen: ${arten}. «!» betont, «_» leise.` })));
}

/** Herkunft (synthetisch oder Aufnahme), Import, Lizenzangaben, Messdaten, Installation für eine Flächenspur */
function flaechenSteuerung(sp) {
  const q = sp.quelle, st = stimmeVon(q.erzeuger, q.stimme), box = el("div", { className: "herkunft" });
  const hat = q.sample && z.samples.has(q.sample.sha256);
  const status = q.sample ? (hat ? `Aufnahme: ${q.sample.name}` : `Aufnahme fehlt: ${q.sample.name} (bis zum Neuladen synthetische Quelle)`) : "Quelle: synthetisches Modell (keine Aufnahme)";
  box.append(el("p", { className: "hinweis" + (q.sample && !hat ? " warn" : ""), textContent: status }));
  const datei = el("input", { type: "file", accept: "audio/*,.wav,.flac,.mp3,.ogg", hidden: true });
  datei.onchange = async () => {
    const f = datei.files[0]; if (!f) return;
    melde(`lade ${f.name} …`, 0);
    const bytes = new Uint8Array(await f.arrayBuffer()), sha = await sha256(bytes);
    let k, rate;
    try { const w = wavSpuren(bytes); k = w.spuren; rate = w.rate; } catch { const b = await z.ctx.decodeAudioData(bytes.buffer.slice(0)); k = Array.from({ length: Math.min(2, b.numberOfChannels) }, (_, c) => b.getChannelData(c).slice()); rate = b.sampleRate; }
    z.samples.set(sha, { name: f.name, kanaele: k, rate });
    q.sample = { name: f.name, sha256: sha, bytes: bytes.length, rate, dauer: Math.round((k[0].length / rate) * 100) / 100, herkunft: "aufnahme", lizenz: q.sample?.sha256 === sha ? q.sample.lizenz : "Lizenz nicht angegeben", urheber: "", url: "", nichtKommerziell: false };
    spurNeuRechnen(sp); pluginAufbauen(); zeichnen();
    melde(`${f.name}: ${rate} Hz, ${q.sample.dauer} s${rate > 96000 ? " (hohe Abtastrate: für Ultraschall «Verlangsamen» nutzen)" : ""}`, 6000);
  };
  const laden = el("button", { className: "mini", textContent: q.sample ? "andere Aufnahme" : "eigene Aufnahme laden" }); laden.onclick = () => datei.click();
  const zurueck = el("button", { className: "mini", textContent: "synthetisch", title: "zurück zur synthetischen Quelle" }); zurueck.onclick = () => { q.sample = null; spurNeuRechnen(sp); pluginAufbauen(); };
  const zeile = el("div", { className: "klang-zeile" }, laden, q.sample ? zurueck : "", datei);
  if (st.key === "pflanzen") {
    const csv = el("input", { type: "file", accept: ".csv,.txt", hidden: true });
    csv.onchange = async () => { const t = await csv.files[0].text(); const zahlen = t.split(/[\s,;]+/).map(Number).filter(Number.isFinite); if (zahlen.length < 2) { melde("keine Zahlen gefunden"); return; } q.messdaten = zahlen.slice(0, 4000); q.werte.weg = "daten"; spurNeuRechnen(sp); pluginAufbauen(); melde(`${zahlen.length} Messwerte`, 3000); };
    const mb = el("button", { className: "mini", textContent: q.messdaten ? `Messdaten (${q.messdaten.length})` : "Messdaten laden (CSV)" }); mb.onclick = () => csv.click();
    zeile.append(mb, csv);
  }
  const inst = el("select", { title: "eine lange Fassung nur dieser Spur als WAV, als Schleife ohne Naht (Installation, Museum)" }, ...[[0, "Installation …"], [1, "1 Minute"], [3, "3 Minuten"], [10, "10 Minuten"]].map(([v, t]) => el("option", { value: v, textContent: t })));
  inst.onchange = async () => {
    const min = Number(inst.value); inst.value = 0; if (!min) return;
    melde(`rechne ${min} Minuten …`, 0); await atmen();
    const k = flaechenSpurRechnen({ ...q, dauer: min * 60 }, z.rate, bezugFuer(sp)).kanaele;
    herunterladen(new Blob([wavSchreiben(k, z.rate, { bits: "24" })], { type: "audio/wav" }), `${dateiname(sp.name)}-${min}min-schleife.wav`);
    melde(`${sp.name}: ${min} Minuten als Schleife ohne Naht gespeichert`, 4000);
  };
  zeile.append(inst);
  box.append(zeile);
  if (q.sample) {
    const feld = (key, name, breite) => { const i = el("input", { type: "text", value: q.sample[key] ?? "", placeholder: name, style: `width:${breite}ch` }); i.onchange = () => { q.sample[key] = i.value.trim(); }; return i; };
    const nc = el("input", { type: "checkbox", checked: !!q.sample.nichtKommerziell }); nc.onchange = () => { q.sample.nichtKommerziell = nc.checked; };
    box.append(el("div", { className: "klang-zeile lizenz" }, el("span", { className: "leise-text", textContent: "Lizenz" }), feld("lizenz", "z. B. CC0, CC BY 4.0", 16), feld("urheber", "Urheber", 16), feld("url", "Quelle (URL)", 28), el("label", { className: "feld klein" }, nc, " nicht kommerziell (NC)")));
  }
  const makro = MAKROS[st.key];
  if (makro) box.append(el("details", {}, el("summary", { className: "leise-text", textContent: "Was die Makros hier tun" }), el("ul", { className: "hinweis" }, ...Object.entries(makro).map(([k, t]) => el("li", { textContent: `${k}: ${t}` })))));
  return box;
}

/** Tonart, Leiter, Linie und Anhören für eine Bassspur */
function bassSteuerung(sp) {
  const q = sp.quelle, zeile = el("div", { className: "klang-zeile" });
  const ton = el("select", { title: "Tonart" }, ...NOTEN.map((n, i) => el("option", { value: i, textContent: n, selected: i === q.grundton })));
  const lei = el("select", { title: "Tonleiter" }, ...Object.entries(LEITERN).map(([k, l]) => el("option", { value: k, textContent: l.name, selected: k === q.leiter })));
  const lin = el("select", { title: "Art der Linie" }, ...LINIEN.map((l) => el("option", { value: l.key, textContent: l.name, selected: l.key === q.linie })));
  ton.onchange = () => { q.grundton = Number(ton.value); spurNeuRechnen(sp); zeichnen(); };
  lei.onchange = () => { q.leiter = lei.value; spurNeuRechnen(sp); zeichnen(); };
  const neu = el("button", { className: "mini", textContent: "Linie neu", title: "eine neue Linie dieser Art aus der Kick (neuer Startwert)" });
  const neuRechnen = () => { q.linie = lin.value; q.seed = (q.seed % 100000) + 7919; q.takte = linieErzeugen({ art: q.linie, leiter: q.leiter, kicks: kickVorlage(), anzahl: Math.min(q.anzahl, 8), seed: q.seed }); spurNeuRechnen(sp); pluginAufbauen(); zeichnen(); };
  lin.onchange = neuRechnen; neu.onclick = neuRechnen;
  const hoer = el("button", { className: "mini", textContent: "Grundton anhören", title: "ein Ton, ohne Kanalzug (A)" }); hoer.onclick = () => schlagHoeren(sp, 0);
  zeile.append(el("span", { className: "leise-text", textContent: "Tonart" }), ton, lei, el("span", { className: "leise-text", textContent: "Linie" }), lin, neu, hoer);
  return zeile;
}

// ---------- Unterbrechungen ----------
const neueEreignisId = () => "u-" + Math.random().toString(36).slice(2, 8);
/** wohin ein neues Ereignis kommt: an die gezogene Auswahl (wenn sie kürzer als alles ist), sonst an die Stelle des Vorschlags */
function ortFuerNeues(vorschlag) {
  const takt = PR.taktDauer(z.projekt), b0 = z.projekt.tempo.beginn, L = laenge();
  if (z.schleife && z.schleife.b - z.schleife.a < L - 0.05) {
    const a = Math.max(0, Math.round(((z.schleife.a - b0) / takt) * 16) / 16), s = Math.max(1, Math.round(((z.schleife.b - z.schleife.a) / takt) * 16));
    return { takt: a, schritte: s, alle: 0 };
  }
  return { takt: vorschlag.takt, schritte: vorschlag.schritte, alle: vorschlag.alle };
}
function ereignisDazu(sp, v, alleSpuren) {
  const ort = ortFuerNeues(v), gruppe = alleSpuren ? neueEreignisId() : null;
  for (const s of alleSpuren ? z.projekt.spuren : [sp]) {
    (s.ereignisse ??= []).push({ id: neueEreignisId(), art: v.art, ...ort, werte: {}, seed: 1 + Math.floor(Math.random() * 9999), gruppe });
    spurSenden(s);
  }
  spurenAufbauen(); pluginAufbauen();
  melde(`${UNTER[v.art].name}: Takt ${(ort.takt + 1).toFixed(2).replace(".", ",")}, ${ort.schritte} Sechzehntel${ort.alle ? `, alle ${ort.alle} Takte` : ""}${alleSpuren ? ", auf allen Spuren" : ""}`, 3500);
}
/** eine Änderung gilt für alle Ereignisse derselben Gruppe (auf allen Spuren erzeugt) */
function ereignisAendern(sp, e, aendern) {
  const ziele = e.gruppe ? z.projekt.spuren.flatMap((s) => (s.ereignisse ?? []).filter((x) => x.gruppe === e.gruppe).map((x) => [s, x])) : [[sp, e]];
  for (const [s, x] of ziele) { aendern(x); unterBald(s); }
}

function unterAufbauen(box, sp, wahl) {
  box.append(el("div", { className: "plugin-kopf" }, el("h2", { textContent: `${sp.name}: Unterbrechungen 0.1.0` }), wahl,
    el("span", { className: "leise-text", textContent: "Ereignisse auf der Zeitleiste. Auf der Zeitleiste einen Bereich ziehen, dann eine Art wählen: sie kommt genau dorthin. Ohne Auswahl kommt sie an eine typische Stelle (Ende von Takt 4). Sie wirken vor Kanalzug und Raum." })));
  const alle = el("input", { type: "checkbox", id: "unterAlle" });
  box.append(el("div", { className: "klang-zeile" }, el("span", { className: "leise-text", textContent: "dazu:" }),
    ...SCHNELL.map((v) => { const b = el("button", { className: "mini", textContent: v.name, title: UNTER[v.art].hilfe }); b.onclick = () => ereignisDazu(sp, v, alle.checked); return b; }),
    el("label", { className: "feld klein" }, alle, " auf allen Spuren")));
  // mehrere auf einmal löschen: eine Art auf dieser Spur oder auf allen Spuren
  const arten = [...new Set(z.projekt.spuren.flatMap((s) => (s.ereignisse ?? []).map((e) => e.art)))].filter((a) => UNTER[a]);
  if (arten.length) {
    const zaehlen = (a, alle) => (alle ? z.projekt.spuren : [sp]).reduce((n, s) => n + (s.ereignisse ?? []).filter((e) => e.art === a).length, 0);
    const artWahl = el("select", { title: "welche Art" }, ...arten.map((a) => el("option", { value: a, textContent: `${UNTER[a].name} (${zaehlen(a, false)} hier, ${zaehlen(a, true)} total)` })));
    const weg = (alle) => {
      const a = artWahl.value, n = zaehlen(a, alle);
      if (!n) { melde(`Keine ${UNTER[a].name} ${alle ? "im Projekt" : "auf dieser Spur"}.`); return; }
      if (n > 1 && !confirm(`${n} × ${UNTER[a].name} ${alle ? "auf allen Spuren" : "auf dieser Spur"} löschen? Das lässt sich nicht rückgängig machen (Projekt vorher speichern, wenn du zurück willst).`)) return;
      for (const s of alle ? z.projekt.spuren : [sp]) { const vor = s.ereignisse?.length ?? 0; s.ereignisse = (s.ereignisse ?? []).filter((e) => e.art !== a); if (s.ereignisse.length !== vor) spurSenden(s); }
      spurenAufbauen(); pluginAufbauen();
      melde(`${n} × ${UNTER[a].name} gelöscht${alle ? " (alle Spuren)" : ""}.`, 3000);
    };
    const hier = el("button", { className: "mini", textContent: "auf dieser Spur löschen" }); hier.onclick = () => weg(false);
    const ueberall = el("button", { className: "mini", textContent: "auf allen Spuren löschen" }); ueberall.onclick = () => weg(true);
    box.append(el("div", { className: "klang-zeile" }, el("span", { className: "leise-text", textContent: "alle einer Art:" }), artWahl, hier, ueberall));
  }
  const liste = el("div", { className: "ereignisse" });
  const sortiert = [...(sp.ereignisse ?? [])].sort((a, b) => a.takt - b.takt);
  if (!sortiert.length) liste.append(el("p", { className: "hinweis", textContent: "Noch keine Unterbrechung auf dieser Spur." }));
  for (const e of sortiert) {
    const art = UNTER[e.art], w = werteVon(e);
    const zahlFeld = (name, wert, schritt, min, setze, titel) => { const i = el("input", { type: "number", value: wert, step: schritt, min, title: titel ?? "" }); i.onchange = () => { const v = Number(i.value); if (Number.isFinite(v) && v >= min) ereignisAendern(sp, e, (x) => setze(x, v)); }; return el("label", { className: "feld" }, name, i); };
    const alleWahl = el("select", { title: "einmal oder als Muster" }, ...[[0, "einmal"], [1, "jeden Takt"], [2, "alle 2 Takte"], [4, "alle 4 Takte"], [8, "alle 8 Takte"]].map(([v, t]) => el("option", { value: v, textContent: t, selected: v === (e.alle ?? 0) })));
    alleWahl.onchange = () => ereignisAendern(sp, e, (x) => { x.alle = Number(alleWahl.value); });
    const aus = umschalt(e.aus ? "aus" : "an", "v", !e.aus, "vorübergehend ausschalten, um zu vergleichen", () => { ereignisAendern(sp, e, (x) => { x.aus = !x.aus; }); setTimeout(pluginAufbauen, 120); });
    const weg = el("button", { className: "mini", textContent: "löschen" });
    weg.onclick = () => { const ziele = e.gruppe ? z.projekt.spuren : [sp]; for (const s of ziele) { const vor = s.ereignisse?.length ?? 0; s.ereignisse = (s.ereignisse ?? []).filter((x) => x.id !== e.id && (!e.gruppe || x.gruppe !== e.gruppe)); if ((s.ereignisse.length) !== vor) spurSenden(s); } spurenAufbauen(); pluginAufbauen(); };
    const hoer = el("button", { className: "mini", textContent: "hinhören", title: "Schleife vom Takt davor bis nach dem Ereignis" });
    hoer.onclick = () => {
      const takt = PR.taktDauer(z.projekt), b0 = z.projekt.tempo.beginn, a = b0 + Math.max(0, Math.floor(e.takt) - 1) * takt, b = Math.min(laenge(), b0 + (e.takt + e.schritte / 16) * takt + takt * 0.5);
      z.schleife = { a, b }; z.schleifeAn = true; schleifeSenden(); z.pos = Math.round(a * z.rate); post({ art: "stelle", pos: z.pos }); knoepfeAuffrischen(); zeichnen();
      if (!z.laeuft) spielen();
    };
    const kopf = el("div", { className: "ereignis-kopf" }, el("b", { textContent: art.name }), e.gruppe ? el("span", { className: "leise-text", textContent: "alle Spuren" }) : "",
      zahlFeld("Takt", (e.takt + 1).toFixed(2), 0.25, 1, (x, v) => { x.takt = v - 1; }, "1 = Anfang von Takt 1, 4,75 = letzte Viertel von Takt 4"),
      zahlFeld("Länge", e.schritte, 1, 1, (x, v) => { x.schritte = Math.round(v); }, "in Sechzehnteln: 4 = eine Viertel, 16 = ein Takt"), alleWahl, aus, hoer, weg);
    const regler = el("div", { className: "gruppen" });
    for (const p of art.parameter) {
      if (p.wahl) {
        const s2 = el("select", {}, ...p.wahl.map((o) => el("option", { value: String(o.wert), textContent: o.name, selected: String(o.wert) === String(w[p.key]) })));
        s2.onchange = () => { const o = p.wahl.find((x) => String(x.wert) === s2.value); ereignisAendern(sp, e, (x) => { x.werte = { ...x.werte, [p.key]: o.wert }; }); };
        regler.append(el("label", { className: "param" }, el("span", { textContent: p.name }), el("output"), s2));
      } else regler.append(paramRegler(p, w[p.key], (v) => ereignisAendern(sp, e, (x) => { x.werte = { ...x.werte, [p.key]: v }; })));
    }
    liste.append(el("div", { className: "ereignis" + (e.aus ? " aus" : "") + (z.markiert === e.id ? " markiert" : ""), id: `karte-${e.id}` }, kopf, regler));
  }
  box.append(liste);
}

function paramRegler(p, v, setze) {
  const out = el("output", { textContent: zeigeWert(p, v) });
  const inp = el("input", { type: "range", min: 0, max: 1000, step: 1, value: Math.round(zuStellung(p, v) * 1000), title: p.hilfe ?? "" });
  inp.setAttribute("aria-label", p.name);
  const neu = (w) => { out.textContent = zeigeWert(p, w); setze(w); };
  inp.oninput = () => { let w = ausStellung(p, Number(inp.value) / 1000); w = Math.min(p.max, Math.max(p.min, w)); neu(w); };
  inp.ondblclick = () => { inp.value = Math.round(zuStellung(p, p.std) * 1000); neu(p.std); };
  return el("label", { className: "param", title: p.hilfe ?? "" }, el("span", { textContent: p.name }), out, inp);
}

// ---------- Bereiche (Bereiche 0.1.0) ----------
// Ein Bereich wird auf der Zeitleiste gezogen: auf einer Spur gilt er für diese Spur, auf dem Lineal für die Summe. Er rastet auf Takte
// (Alt: auf Schläge, Umschalt: frei) und wird in Takten gespeichert.
const neueBereichId = () => "b-" + Math.random().toString(36).slice(2, 8);
const spurVon = (id) => z.projekt.spuren.find((s) => s.id === id);
const rund3 = (x) => Math.round(x * 1000) / 1000;
function auswahlTakte() {
  if (!z.schleife) return null;
  const t = PR.taktDauer(z.projekt), b0 = z.projekt.tempo.beginn;
  return { von: Math.max(0, rund3((z.schleife.a - b0) / t)), bis: rund3((z.schleife.b - b0) / t) };
}
const taktText = (t) => (Math.abs(t - Math.round(t)) < 1e-3 ? String(Math.round(t) + 1) : (t + 1).toFixed(2).replace(".", ","));
const laengeText = (x) => (Math.abs(x - Math.round(x)) < 1e-3 ? `${Math.round(x)} Takt${Math.round(x) === 1 ? "" : "e"}` : `${zahl(x, 2)} Takte`);
function zielSpuren() {
  if (z.gewaehlt === "summe" || $("bAlle").checked) return z.projekt.spuren.filter((s) => z.daten.has(s.id));
  const sp = spurVon(z.gewaehlt);
  return sp ? [sp] : [];
}
function bereichLeisteAuffrischen() {
  const L = $("bereichLeiste"), w = auswahlTakte();
  L.hidden = !(z.auswahl && w && w.bis > w.von && z.projekt.spuren.length);
  if (L.hidden) return;
  const summe = z.gewaehlt === "summe", sp = spurVon(z.gewaehlt);
  $("bereichOrt").textContent = `Takt ${taktText(w.von)}–${taktText(w.bis)} · ${laengeText(w.bis - w.von)} · ${summe ? "Summe (alle Spuren)" : $("bAlle").checked ? "alle Spuren" : sp?.name ?? "–"}`;
  $("bereichSumme").hidden = !summe;
  $("bAlle").closest("label").hidden = summe;
}
function auswahlAufheben() { z.auswahl = false; z.schleifeAn = false; schleifeSenden(); knoepfeAuffrischen(); bereichLeisteAuffrischen(); zeichnen(); }

/** einen Bereich anlegen; liegt auf derselben Stelle schon ein Pegel-Bereich, wird er verändert statt ein zweiter angelegt */
function bereichDazu(vorlage, { schritt = null } = {}) {
  const w = auswahlTakte();
  if (!w || w.bis <= w.von) { melde("Zuerst auf der Zeitleiste einen Bereich ziehen."); return; }
  const ziele = zielSpuren();
  if (!ziele.length) { melde("Zuerst eine Spur wählen (Kopf der Spur antippen) oder den Bereich auf einer Spur ziehen."); return; }
  const gruppe = ziele.length > 1 ? neueBereichId() : null;
  let text = "";
  for (const s of ziele) {
    const gleich = schritt != null && (s.bereiche ?? []).find((b) => b.art === "pegel" && Math.abs(b.von - w.von) < 1e-3 && Math.abs(b.bis - w.bis) < 1e-3 && b.db === b.dbEnde && !b.bypass);
    if (gleich) { gleich.db = gleich.dbEnde = Math.max(-40, Math.min(12, Math.round((gleich.db + schritt) * 10) / 10)); text = BE.beschreibung(gleich); }
    else { const b = { id: neueBereichId(), ...w, ein: 0, aus: 0, kurve: "gleich", ausklang: false, ...structuredClone(vorlage), gruppe }; (s.bereiche ??= []).push(b); text = BE.beschreibung(b); }
    spurSenden(s);
  }
  if (z.gewaehlt !== "summe" && ziele.length === 1) z.glied = -3;
  spurenAufbauen(); pluginAufbauen();
  melde(`Takt ${taktText(w.von)}–${taktText(w.bis)}: ${text}${ziele.length > 1 ? `, auf ${ziele.length} Spuren` : ""}`, 2500);
}
function effektDazu() {
  const v = BE.SCHNELL_EFFEKTE.find((x) => x.key === $("bEffekt").value) ?? BE.SCHNELL_EFFEKTE[0];
  bereichDazu({ art: "effekt", ein: 1, aus: 1, ...BE.effektAus(v, PLUGINS, z.projekt.tempo) });
}
/** eine Änderung gilt für alle Bereiche derselben Gruppe (auf allen Spuren angelegt) */
function bereichAendern(sp, b, aendern) {
  const ziele = b.gruppe ? z.projekt.spuren.flatMap((s) => (s.bereiche ?? []).filter((x) => x.gruppe === b.gruppe).map((x) => [s, x])) : [[sp, b]];
  for (const [s, x] of ziele) { aendern(x); unterBald(s); }
}
function hinhoeren(von, bis) {
  const takt = PR.taktDauer(z.projekt), b0 = z.projekt.tempo.beginn, a = b0 + Math.max(0, Math.floor(von) - 1) * takt, b = Math.min(laenge(), b0 + Math.ceil(bis + 0.001) * takt + takt);
  z.schleife = { a, b }; z.schleifeAn = true; schleifeSenden(); z.pos = Math.round(a * z.rate); post({ art: "stelle", pos: z.pos }); knoepfeAuffrischen(); zeichnen();
  if (!z.laeuft) spielen();
}

function bereicheAufbauen(box, sp, wahl) {
  box.append(el("div", { className: "plugin-kopf" }, el("h2", { textContent: `${sp.name}: Bereiche ${BE.BEREICHE_VERSION}` }), wahl,
    el("span", { className: "leise-text", textContent: "Auf der Zeitleiste einen Bereich ziehen (rastet auf Takte, Alt auf Schläge, Umschalt frei), dann oben stumm, leiser, lauter oder einen Effekt wählen (M, −, +, E). Bereiche wirken vor Kanalzug und Raum und bleiben bei einem Spurwechsel auf denselben Takten." })));
  const liste = el("div", { className: "ereignisse" }), sortiert = [...(sp.bereiche ?? [])].sort((a, b) => a.von - b.von);
  if (!sortiert.length) liste.append(el("p", { className: "hinweis", textContent: "Noch kein Bereich auf dieser Spur." }));
  const wahlFeld = (name, optionen, wert, setze, titel = "") => { const s2 = el("select", { title: titel }, ...optionen.map((o) => el("option", { value: String(o.wert), textContent: o.name, selected: String(o.wert) === String(wert) }))); s2.onchange = () => setze(s2.value); return el("label", { className: "feld" }, name, s2); };
  for (const b of sortiert) {
    const aendern = (f) => bereichAendern(sp, b, f);
    const zahlFeld = (name, wert, schritt, setze, titel) => { const i = el("input", { type: "number", value: wert, step: schritt, title: titel ?? "" }); i.onchange = () => { const v = Number(i.value); if (Number.isFinite(v)) aendern((x) => setze(x, v)); }; return el("label", { className: "feld" }, name, i); };
    const an = umschalt(b.bypass ? "aus" : "an", "v", !b.bypass, "vorübergehend ausschalten, um zu vergleichen", () => { aendern((x) => { x.bypass = !x.bypass; }); setTimeout(pluginAufbauen, 150); });
    const hoer = el("button", { className: "mini", textContent: "hinhören", title: "Schleife vom Takt davor bis nach dem Bereich" }); hoer.onclick = () => hinhoeren(b.von, b.bis);
    const weg = el("button", { className: "mini", textContent: "löschen" });
    weg.onclick = () => { for (const s of b.gruppe ? z.projekt.spuren : [sp]) { const vor = s.bereiche?.length ?? 0; s.bereiche = (s.bereiche ?? []).filter((x) => x.id !== b.id && (!b.gruppe || x.gruppe !== b.gruppe)); if (s.bereiche.length !== vor) spurSenden(s); } spurenAufbauen(); pluginAufbauen(); };
    const kopf = el("div", { className: "ereignis-kopf" }, el("b", { textContent: `${BE.ARTEN[b.art].name}: ${BE.beschreibung(b)}` }), b.gruppe ? el("span", { className: "leise-text", textContent: "alle Spuren" }) : "",
      zahlFeld("von Takt", (b.von + 1).toFixed(2), 0.25, (x, v) => { x.von = Math.max(0, Math.min(x.bis - 1 / 16, v - 1)); }, "1 = Anfang von Takt 1"),
      zahlFeld("bis", (b.bis + 1).toFixed(2), 0.25, (x, v) => { x.bis = Math.max(x.von + 1 / 16, v - 1); }, "Ende des Bereichs: 5 = Anfang von Takt 5"),
      an, hoer, weg);
    const inhalt = el("div", { className: "klang-zeile" });
    inhalt.append(
      wahlFeld("Blende ein", BE.BLENDEN, b.ein ?? 0, (v) => aendern((x) => { x.ein = Number(v); }), "Länge der Einblende am Anfang des Bereichs"),
      wahlFeld("aus", BE.BLENDEN, b.aus ?? 0, (v) => aendern((x) => { x.aus = Number(v); }), "Länge der Blende am Ende des Bereichs"),
      wahlFeld("Kurve", Object.entries(BE.KURVEN).map(([k, v]) => ({ wert: k, name: v.name })), b.kurve ?? "gleich", (v) => aendern((x) => { x.kurve = v; })));
    const regler = el("div", { className: "gruppen" });
    if (b.art === "pegel") {
      const P = (key, name) => ({ key, name, min: -40, max: 12, std: 0, einheit: "dB", schritt: 0.1 });
      regler.append(paramRegler(P("db", "Pegel am Anfang"), b.db ?? 0, (v) => aendern((x) => { const fest = x.dbEnde === x.db; x.db = Math.round(v * 10) / 10; if (fest) x.dbEnde = x.db; })),
        paramRegler(P("dbEnde", "Pegel am Ende"), b.dbEnde ?? b.db ?? 0, (v) => aendern((x) => { x.dbEnde = Math.round(v * 10) / 10; })));
    }
    if (b.art === "effekt") {
      const def = PLUGINS[b.effekt.plugin];
      const plug = el("select", { title: "Plugin" }, ...BE.EFFEKT_PLUGINS.map((k) => el("option", { value: k, textContent: PLUGINS[k].name, selected: k === b.effekt.plugin })));
      plug.onchange = () => { aendern((x) => { x.effekt = { plugin: plug.value, parameter: standardWerte(PLUGINS[plug.value]), name: PLUGINS[plug.value].name }; }); setTimeout(pluginAufbauen, 150); };
      const fahne = el("input", { type: "checkbox", checked: !!b.ausklang }); fahne.onchange = () => aendern((x) => { x.ausklang = fahne.checked; });
      inhalt.append(el("label", { className: "feld" }, "Effekt", plug), el("label", { className: "feld klein", title: "Echo- und Hallfahnen klingen über das Ende des Bereichs hinaus (bis 8 s)" }, fahne, " Ausklang"));
      for (const p of def.parameter) regler.append(paramRegler(p, b.effekt.parameter[p.key] ?? p.std, (v) => aendern((x) => { x.effekt.parameter = { ...x.effekt.parameter, [p.key]: v }; })));
    }
    liste.append(el("div", { className: `ereignis bereich ${b.art}${b.bypass ? " aus" : ""}${z.markiert === b.id ? " markiert" : ""}`, id: `karte-${b.id}` }, kopf, inhalt, regler));
  }
  box.append(liste);
}

// ---------- Spur ersetzen (Fassungen 0.1.0) ----------
const fassungText = (f) => f.datei ? f.datei.name : f.quelle ? `${f.quelle.variante ?? f.quelle.stimme} · Startwert ${f.quelle.seed}` : "–";
async function spurErsetzen(sp, f) {
  if (!/\.(wav|flac|mp3|ogg|m4a|aiff?)$/i.test(f.name)) { melde(`${f.name} ist keine Tondatei.`); return; }
  melde(`Ersetze ${sp.name} durch ${f.name} …`, 0); await atmen();
  const bytes = new Uint8Array(await f.arrayBuffer()), hash = await sha256(bytes), kanaele = await dekodieren(bytes);
  const altDaten = z.daten.get(sp.id);
  const alt = FA.fassungVon(sp, sp.fassungName ?? fassungText(sp));
  if (alt.datei && altDaten?.roh) z.fassungRoh.set(alt.id, altDaten.roh);
  (sp.fassungen ??= []).unshift(alt);
  for (const k of FA.QUELLE_FELDER) delete sp[k];
  sp.datei = { name: f.name, sha256: hash, bytes: bytes.length, rate: z.rate, kanaele: kanaele.length, dauer: Math.round((kanaele[0].length / z.rate) * 1000) / 1000 };
  sp.fassungName = f.name.replace(/\.[a-z0-9]+$/i, "");
  const hinweise = [];
  // Tempo der neuen Datei (nur anzeigen; dehnen erst auf Wunsch)
  const { bpm } = tempoSchaetzen(mono(kanaele), z.rate);
  sp.tempoErkannt = Math.round(bpm * 10) / 10;
  if (Math.abs(sp.tempoErkannt / z.projekt.tempo.bpm - 1) > 0.015 && Math.abs(sp.tempoErkannt / z.projekt.tempo.bpm - 2) > 0.03 && Math.abs(sp.tempoErkannt / z.projekt.tempo.bpm - 0.5) > 0.015) hinweise.push(`Tempo erkannt ${zahl(sp.tempoErkannt)} BPM, Projekt ${zahl(z.projekt.tempo.bpm)}: unter «Fassungen» angleichen`);
  // Startpunkt und Lautheit an der bisherigen Quelle ausrichten
  if (altDaten?.roh) {
    const vorAlt = FA.vorbereiten(altDaten.roh, z.rate, alt, 0), { versatz, guete } = FA.ausrichten(kanaele, vorAlt, z.rate);
    if (guete > 0.25 && Math.abs(versatz) > 0.002) { sp.versatz = Math.round(versatz * 10000) / 10000; hinweise.push(`um ${zahl(versatz * 1000, 0)} ms an die Einsätze der alten Fassung gelegt`); }
    const lAlt = lautheitIntegriert(vorAlt, z.rate), lNeu = lautheitIntegriert(kanaele, z.rate);
    if (Number.isFinite(lAlt) && Number.isFinite(lNeu) && Math.abs(lAlt - lNeu) > 0.2) { sp.angleich = Math.round(Math.max(-24, Math.min(24, lAlt - lNeu)) * 10) / 10; hinweise.push(`Pegel ${zahl(sp.angleich)} dB angeglichen`); }
  }
  if (kanaele[0].length < laengeOhne(sp.id) * 0.9) { sp.wiederholen = true; hinweise.push("kürzer als das Projekt: wird wiederholt"); }
  if (/\.mp3$/i.test(f.name)) hinweise.push("MP3: verlustbehaftet, wenn möglich WAV oder FLAC nehmen");
  z.original.set(sp.id, kanaele);
  spurSenden(sp, kanaele); senden();
  z.gewaehlt = sp.id; z.glied = -4; allesAufbauen();
  melde(`${sp.name}: neue Fassung «${sp.fassungName}». Mischung, Plugins und Bearbeitungen bleiben${hinweise.length ? `; ${hinweise.join("; ")}` : ""}. A/B unter «Fassungen».`, 9000);
}
/** eine andere Fassung aktiv machen (A/B) */
function fassungAktiv(sp, id) {
  const f = sp.fassungen?.find((x) => x.id === id);
  if (!f) return;
  if (f.datei && !z.fassungRoh.has(id)) { melde(`${f.datei.name} ist nicht geladen: mit «Spuren laden» dieselbe Datei wählen, dann lässt sich die Fassung zurückholen.`, 7000); return; }
  const rohAlt = z.original.get(sp.id) ?? z.daten.get(sp.id)?.roh, roh = z.fassungRoh.get(id);
  const alt = FA.fassungWechseln(sp, id);
  if (alt.datei && rohAlt) z.fassungRoh.set(alt.id, z.daten.get(sp.id)?.roh ?? rohAlt);
  z.fassungRoh.delete(id); z.original.delete(sp.id);
  if (!sp.quelle && !(sp.dehnung && sp.dehnung !== 1)) z.original.set(sp.id, roh);
  if (sp.quelle) spurNeuRechnen(sp); else spurSenden(sp, roh);
  spurenAufbauen(); pluginAufbauen();
  melde(`${sp.name}: Fassung «${sp.fassungName ?? fassungText(sp)}»`, 2000);
}
/** erzeugte Spur: dieselbe Stimme mit anderem Startwert als neue Fassung */
function fassungNeuErzeugen(sp) {
  if (!sp.quelle) return;
  const alt = FA.fassungVon(sp, sp.fassungName ?? fassungText(sp));
  (sp.fassungen ??= []).unshift(alt);
  sp.quelle = { ...structuredClone(sp.quelle), seed: 1 + Math.floor(Math.random() * 99998) };
  sp.fassungName = `${sp.quelle.variante ?? sp.quelle.stimme} · Startwert ${sp.quelle.seed}`;
  spurNeuRechnen(sp); pluginAufbauen();
  melde(`${sp.name}: neue Fassung mit Startwert ${sp.quelle.seed}. A/B schaltet zur vorigen.`, 3500);
}
function fassungenAufbauen(box, sp, wahl) {
  box.append(el("div", { className: "plugin-kopf" }, el("h2", { textContent: `${sp.name}: Fassungen ${FA.FASSUNGEN_VERSION}` }), wahl,
    el("span", { className: "leise-text", textContent: "Die Quelle der Spur austauschen: Kanalzug, Plugins, Pegel, Unterbrechungen und Bereiche bleiben. Eine Datei auf die Welle der Spur ziehen oder hier wählen. Die alte Quelle bleibt als Fassung zum Vergleichen." })));
  const datei = el("button", { className: "mini", textContent: "Datei als neue Fassung …" }); datei.onclick = () => { z.ersatzFuer = sp.id; $("ersatzDatei").click(); };
  const ab = el("button", { className: "mini", textContent: "A/B: zur vorigen Fassung", disabled: !sp.fassungen?.length, title: "zwischen der aktiven und der zuletzt aktiven Fassung umschalten" });
  ab.onclick = () => fassungAktiv(sp, sp.fassungen[0].id);
  const neu = sp.quelle ? el("button", { className: "mini", textContent: "neu erzeugen (anderer Startwert)" }) : "";
  if (neu) neu.onclick = () => fassungNeuErzeugen(sp);
  box.append(el("div", { className: "klang-zeile" }, datei, neu, ab));
  // die aktive Fassung
  const liste = el("div", { className: "ereignisse" });
  const aktiv = el("div", { className: "ereignis fassung aktiv" }, el("div", { className: "ereignis-kopf" }, el("b", { textContent: `aktiv: ${sp.fassungName ?? fassungText(sp)}` }), el("span", { className: "leise-text", textContent: fassungText(sp) })));
  const zeile = el("div", { className: "klang-zeile" });
  const versatz = el("input", { type: "number", step: 1, value: Math.round((sp.versatz ?? 0) * 1000), title: "positiv: die Quelle beginnt später" });
  versatz.onchange = () => { const v = Number(versatz.value); if (Number.isFinite(v)) { sp.versatz = v / 1000; unterBald(sp); } };
  const wdh = el("input", { type: "checkbox", checked: !!sp.wiederholen }); wdh.onchange = () => { sp.wiederholen = wdh.checked; unterBald(sp); };
  const ang = el("input", { type: "number", step: 0.1, value: sp.angleich ?? 0, title: "Pegelangleich an die vorige Fassung, vor dem Kanalzug" });
  ang.onchange = () => { const v = Number(ang.value); if (Number.isFinite(v)) { sp.angleich = Math.max(-24, Math.min(24, v)); unterBald(sp); } };
  zeile.append(el("label", { className: "feld" }, "Versatz", versatz, "ms"), el("label", { className: "feld" }, "Angleich", ang, "dB"), el("label", { className: "feld klein" }, wdh, " bis zum Ende wiederholen"));
  if (!sp.quelle && z.daten.has(sp.id)) {
    const ausr = el("button", { className: "mini", textContent: "an vorige Fassung ausrichten", disabled: !sp.fassungen?.length, title: "Einsätze vergleichen und den Versatz neu setzen (±1 s)" });
    ausr.onclick = () => {
      const f = sp.fassungen[0], rohAlt = f.datei ? z.fassungRoh.get(f.id) : null;
      if (!rohAlt) { melde(f.quelle ? "Ausrichten gegen eine erzeugte Fassung: diese zuerst aktiv machen und dann wieder zurück." : "Die vorige Fassung ist nicht geladen.", 5000); return; }
      const { versatz: v, guete } = FA.ausrichten(z.original.get(sp.id) ?? z.daten.get(sp.id).roh, FA.vorbereiten(rohAlt, z.rate, f, 0), z.rate);
      sp.versatz = Math.round(v * 10000) / 10000; unterBald(sp); pluginAufbauen();
      melde(`Versatz ${zahl(v * 1000, 0)} ms (Übereinstimmung ${Math.round(guete * 100)} %)`, 4000);
    };
    zeile.append(ausr);
    // Tempo
    const erkannt = el("input", { type: "number", step: 0.1, min: 40, max: 240, value: sp.tempoErkannt ?? "", title: "Tempo der Datei; die Schätzung kann halb oder doppelt liegen" });
    erkannt.onchange = () => { const v = Number(erkannt.value); if (v >= 40 && v <= 240) sp.tempoErkannt = v; };
    const dehn = el("button", { className: "mini", textContent: sp.dehnung && sp.dehnung !== 1 ? "Dehnung aufheben" : `auf ${zahl(z.projekt.tempo.bpm)} BPM dehnen`, title: "ohne Tonhöhe zu ändern (WSOLA aus dem Lab); die Datei selbst bleibt" });
    dehn.onclick = async () => {
      const orig = z.original.get(sp.id);
      if (!orig) { melde("Die Originaldatei ist nicht mehr im Speicher: die Datei noch einmal als Fassung wählen.", 5000); return; }
      if (sp.dehnung && sp.dehnung !== 1) { sp.dehnung = 1; spurSenden(sp, orig); }
      else { if (!sp.tempoErkannt) return; sp.dehnung = Math.round((sp.tempoErkannt / z.projekt.tempo.bpm) * 100000) / 100000; melde("dehne …", 0); await atmen(); spurSenden(sp, dehnen(orig, z.rate, sp.dehnung)); }
      senden(); zeichnen(); pluginAufbauen(); melde(sp.dehnung !== 1 ? `gedehnt: Faktor ${zahl(sp.dehnung, 3)}` : "Dehnung aufgehoben", 3000);
    };
    zeile.append(el("label", { className: "feld" }, "Tempo der Datei", erkannt, "BPM"), dehn);
  }
  aktiv.append(zeile); liste.append(aktiv);
  for (const f of sp.fassungen ?? []) {
    const hoeren = el("button", { className: "mini", textContent: "aktiv machen" }); hoeren.onclick = () => fassungAktiv(sp, f.id);
    const weg = el("button", { className: "mini", textContent: "löschen" }); weg.onclick = () => { sp.fassungen = sp.fassungen.filter((x) => x.id !== f.id); z.fassungRoh.delete(f.id); pluginAufbauen(); };
    const fehlt = f.datei && !z.fassungRoh.has(f.id);
    liste.append(el("div", { className: "ereignis fassung" }, el("div", { className: "ereignis-kopf" }, el("b", { textContent: f.name }), el("span", { className: "leise-text", textContent: `${fassungText(f)}${fehlt ? " · Datei nicht geladen" : ""} · ${new Date(f.zeit).toLocaleString("de-CH", { dateStyle: "short", timeStyle: "short" })}` }), hoeren, weg)));
  }
  box.append(liste);
}

// ---------- Summe: Bereich als Grundlage für einen neuen Track ----------
async function bereichRendern() {
  await bisFertig();
  const a = Math.round(z.schleife.a * z.rate), b = Math.round(z.schleife.b * z.rate);
  return rendern({ ...renderAuftrag(), von: a, bis: b, stems: false });
}
async function bereichAlsWav() {
  const w = auswahlTakte(); if (!w) return;
  const r = await bereichRendern(), m = messen(r.summe, z.rate);
  const name = `${dateiname(z.projekt.titel)}-takt-${taktText(w.von)}-${taktText(w.bis)}-${Math.round(z.projekt.tempo.bpm)}bpm.wav`.replace(/,/g, "_");
  herunterladen(new Blob([wavSchreiben(r.summe, z.rate, { bits: "24" })], { type: "audio/wav" }), name);
  melde(`${name}: ${laengeText(w.bis - w.von)}, ${zahl(m.lufs)} LUFS, 24 Bit`, 6000);
}
/**
 * Neues Projekt aus dem Bereich: jede Spur als eigene Datei (nach Unterbrechungen und Bereichen, vor dem Kanalzug) mit ihrer Plugin-Kette,
 * Pegel und Panorama, dazu die Summenkette, Tempo, Kammerton und die Herkunft. Die Mischung des Bereichs wird die Referenz (R).
 * Die Dateien kommen als ZIP, damit sich das neue Projekt später wieder öffnen lässt.
 */
async function neuerTrackAusBereich() {
  const w = auswahlTakte(); if (!w || w.bis <= w.von) return;
  if (!confirm(`Neuer Track aus Takt ${taktText(w.von)}–${taktText(w.bis)}.\n\nDas jetzige Projekt wird dabei geschlossen und vorher als Projektdatei gespeichert (Download). Weiter?`)) return;
  await bisFertig();
  if (z.laeuft) await spielen();
  const alt = z.projekt, a = Math.round(z.schleife.a * z.rate), b = Math.round(z.schleife.b * z.rate), n = b - a;
  herunterladen(new Blob([PR.schreiben(alt)], { type: "application/json" }), `${dateiname(alt.titel)}.composer.json`);
  melde("rechne die Mischung des Bereichs …", 0);
  const ref = await bereichRendern();
  const titel = `${alt.titel} · Takt ${taktText(w.von)}–${taktText(w.bis)}`, p = PR.neuesProjekt({ titel, rate: z.rate });
  const t = PR.taktDauer(alt), versatz = (((alt.tempo.beginn - z.schleife.a) % t) + t) % t;
  p.tempo = { ...structuredClone(alt.tempo), beginn: Math.round(versatz * 10000) / 10000, quelle: alt.tempo.quelle === "geschaetzt" ? "geschaetzt" : "mensch" };
  if (alt.kammerton) p.kammerton = alt.kammerton;
  p.master = structuredClone(alt.master); p.ausgabe = structuredClone(alt.ausgabe);
  p.herkunft = { projekt: alt.titel, von: w.von, bis: w.bis, bpm: alt.tempo.bpm, zeit: new Date().toISOString() };
  const kante = Math.round(0.004 * z.rate), dateien = [], spuren = [];
  for (const s of alt.spuren) {
    const d = z.daten.get(s.id); if (!d) continue;
    const k = [0, 1].map((c) => { const q = d.kanaele[c] ?? d.kanaele[0], out = new Float32Array(n); out.set(q.subarray(a, Math.min(q.length, b))); for (let i = 0; i < kante; i++) { out[i] *= i / kante; out[n - 1 - i] *= i / kante; } return out; });
    let name = `stems/${dateiname(s.name)}.wav`;
    for (let j = 2; dateien.some((x) => x.name === name); j++) name = `stems/${dateiname(s.name)}-${j}.wav`;
    const bytes = wavSchreiben(k, z.rate, { bits: "24" });
    // im Speicher genau das, was in der Datei steht (dann findet «Spuren laden» die Datei über ihren Inhalt wieder)
    const kanaele = wavSpuren(bytes).spuren, hash = await sha256(bytes);
    dateien.push({ name, bytes });
    const sp = PR.spurDazu(p, { name: name.slice(6), sha256: hash, bytes: bytes.length, rate: z.rate, kanaele: 2, dauer: Math.round((n / z.rate) * 1000) / 1000 }, { typ: s.typ });
    Object.assign(sp, { name: s.name, pegel: s.pegel, pan: s.pan, stumm: s.stumm, kette: structuredClone(s.kette), herkunft: { projekt: alt.titel, spur: s.name, von: w.von, bis: w.bis, quelle: s.quelle ? structuredClone(s.quelle) : null, datei: s.datei ? { ...s.datei } : null } });
    spuren.push([sp, kanaele]);
    await atmen();
  }
  dateien.push({ name: `referenz-${dateiname(titel)}.wav`, bytes: wavSchreiben(ref.summe, z.rate, { bits: "24" }) }, { name: `${dateiname(titel)}.composer.json`, bytes: new TextEncoder().encode(PR.schreiben(p)) });
  herunterladen(await zipBlob(dateien), `${dateiname(titel)}-grundlage.zip`);
  // das neue Projekt öffnen
  for (const id of z.daten.keys()) post({ art: "weg", id });
  z.projekt = p; z.daten.clear(); z.fassungRoh.clear(); z.original.clear(); z.messungen = null; z.auswahl = false;
  for (const [sp, k] of spuren) spurSenden(sp, k);
  z.referenz = { name: `Summe Takt ${taktText(w.von)}–${taktText(w.bis)}`, kanaele: ref.summe, messung: messen(ref.summe, z.rate) };
  const kopie = ref.summe.map((s) => s.slice()); post({ art: "referenz", kanaele: kopie }, kopie.map((s) => s.buffer)); $("referenzAn").disabled = false;
  z.schleife = { a: 0, b: n / z.rate }; z.schleifeAn = true; schleifeSenden(); z.pos = 0; post({ art: "stelle", pos: 0 });
  z.gewaehlt = p.spuren[0]?.id ?? null; z.glied = 0;
  senden(); allesAufbauen(); messTabelle();
  melde(`«${titel}»: ${p.spuren.length} Spuren mit ihren Plugins, ${zahl(p.tempo.bpm)} BPM. Die alte Mischung liegt als Referenz auf R. Das ZIP enthält Spuren und Projektdatei zum Wiederöffnen.`, 10000);
}

// ---------- Zeitleiste ----------
function zeichnen() {
  if (!z.projekt.spuren.length) return;
  const L = laenge(), tempo = z.projekt.tempo, takt = PR.taktDauer(z.projekt), dpr = devicePixelRatio || 1;
  const vorbereiten = (c) => { const w = c.clientWidth, h = c.clientHeight || Number(c.getAttribute("height")); if (c.width !== Math.round(w * dpr)) { c.width = Math.round(w * dpr); c.height = Math.round(h * dpr); } const g = c.getContext("2d"); g.setTransform(dpr, 0, 0, dpr, 0, 0); g.clearRect(0, 0, w, h); return [g, w, h]; };
  const linien = (g, w, h, stark) => {
    const pxTakt = (takt / L) * w, jeder = pxTakt < 6 ? 8 : pxTakt < 14 ? 4 : 1;
    for (let t = Math.ceil(-tempo.beginn / takt); ; t++) {
      const s = tempo.beginn + t * takt; if (s > L) break; if (s < 0 || t % jeder) continue;
      const x = Math.round((s / L) * w) + 0.5; g.strokeStyle = t % (jeder * 4) === 0 ? stark : "rgba(244,241,234,0.07)"; g.beginPath(); g.moveTo(x, 0); g.lineTo(x, h); g.stroke();
    }
  };
  const schleife = (g, w, h) => { if (!z.schleife) return; const a = (z.schleife.a / L) * w, b = (z.schleife.b / L) * w; g.fillStyle = z.schleifeAn ? "rgba(143,176,255,0.16)" : "rgba(143,176,255,0.06)"; g.fillRect(a, 0, b - a, h); };
  // Lineal
  const [g, w, h] = vorbereiten($("lineal"));
  schleife(g, w, h); linien(g, w, h, "rgba(244,241,234,0.25)");
  g.fillStyle = "#8a8784"; g.font = "11px Instrument Sans, system-ui"; const pxTakt = (takt / L) * w, jeder = pxTakt < 6 ? 16 : pxTakt < 14 ? 8 : pxTakt < 30 ? 4 : 1;
  for (let t = 0; ; t += jeder) { const s = tempo.beginn + t * takt; if (s > L) break; g.fillText(String(t + 1), (s / L) * w + 3, 18); }
  for (const a of z.projekt.abschnitte ?? []) {
    const x = ((tempo.beginn + a.von * takt) / L) * w; if (x > w) break;
    g.fillStyle = "#f0a070"; g.fillRect(x, 0, 2, h); g.font = "500 11px Instrument Sans, system-ui"; g.fillText(a.name, x + 5, 10); g.fillStyle = "#8a8784"; g.font = "11px Instrument Sans, system-ui";
  }
  // Wellen
  for (const c of document.querySelectorAll("canvas.welle")) {
    const d = z.daten.get(c.dataset.id), [g2, w2, h2] = vorbereiten(c);
    schleife(g2, w2, h2); linien(g2, w2, h2, "rgba(244,241,234,0.16)");
    if (!d) { g2.fillStyle = "#8a8784"; g2.fillText("Datei fehlt: mit «Spuren laden» dieselbe Datei wählen", 10, h2 / 2); continue; }
    const { min, max } = d.wellen, m = h2 / 2;
    g2.fillStyle = c.closest(".spur")?.classList.contains("gewaehlt") ? "#f4f1ea" : "#c9c3b6";
    const dauerAnteil = d.kanaele[0].length / z.rate / L;
    for (let x = 0; x < w2 * dauerAnteil; x++) {
      const j = Math.floor((x / (w2 * dauerAnteil)) * WELLE); const lo = min[j], hi = max[j];
      g2.fillRect(x, m - hi * m * 0.95, 1, Math.max(1, (hi - lo) * m * 0.95));
    }
    const sp = z.projekt.spuren.find((x) => x.id === c.dataset.id);
    for (const e of sp?.ereignisse ?? []) {
      if (e.aus) continue;
      const wdh = e.alle > 0 ? Math.ceil((L - tempo.beginn) / takt / e.alle) : 1;
      for (let r = 0; r < wdh; r++) {
        const a = ((tempo.beginn + (e.takt + r * (e.alle || 0)) * takt) / L) * w2, b = a + ((e.schritte / 16) * takt / L) * w2;
        if (a > w2) break;
        g2.fillStyle = "rgba(240,160,112,0.28)"; g2.fillRect(a, 0, Math.max(2, b - a), h2);
        g2.fillStyle = "#f0a070"; g2.fillRect(a, 0, Math.max(2, b - a), 3);
        if (r === 0 && b - a > 30) { g2.font = "10px Instrument Sans, system-ui"; g2.fillText(UNTER[e.art].name, a + 3, 14); }
      }
    }
    let zeile = 0;
    for (const b of [...(sp?.bereiche ?? [])].sort((x, y) => x.von - y.von)) {
      if (b.bypass) continue;
      const a = ((tempo.beginn + b.von * takt) / L) * w2, e = ((tempo.beginn + b.bis * takt) / L) * w2, farbe = b.art === "stumm" ? "#d05050" : b.art === "effekt" ? "#9ccc85" : "#8fb0ff";
      g2.globalAlpha = b.art === "stumm" ? 0.3 : 0.18; g2.fillStyle = farbe; g2.fillRect(a, 0, Math.max(2, e - a), h2); g2.globalAlpha = 1;
      g2.fillRect(a, h2 - 3, Math.max(2, e - a), 3);
      if (e - a > 30) { g2.font = "10px Instrument Sans, system-ui"; g2.fillText(BE.beschreibung(b), a + 3, h2 - 7 - 11 * (zeile++ % 4)); }
    }
  }
}

/**
 * Antippen einer Markierung in der Welle: oben (orange) eine Unterbrechung, unten (Band) ein Bereich. Wählt die Spur, öffnet den Reiter
 * und zeigt die Karte, auf der sich das Ereignis ändern oder löschen lässt. Gibt true zurück, wenn etwas getroffen wurde.
 */
function markierungOeffnen(c, e) {
  const sp = spurVon(c.dataset.id); if (!sp) return false;
  const r = c.getBoundingClientRect(), y = e.clientY - r.top, oben = y < 22, unten = y > r.height - 22;
  if (!oben && !unten) return false;
  const takt = PR.taktDauer(z.projekt), b0 = z.projekt.tempo.beginn, L = laenge(), toleranz = (6 / r.width) * L;
  const t = Math.max(0, Math.min(1, (e.clientX - r.left) / r.width)) * L;
  let treffer = null;
  if (oben) for (const ev of sp.ereignisse ?? []) {
    const wdh = ev.alle > 0 ? Math.ceil((L - b0) / takt / ev.alle) : 1;
    for (let k = 0; k < wdh && !treffer; k++) { const a = b0 + (ev.takt + k * (ev.alle || 0)) * takt, b = a + (ev.schritte / 16) * takt; if (t >= a - toleranz && t <= b + toleranz) treffer = { id: ev.id, glied: -2 }; }
  }
  if (unten && !treffer) for (const bb of sp.bereiche ?? []) { const a = b0 + bb.von * takt, b = b0 + bb.bis * takt; if (t >= a - toleranz && t <= b + toleranz) { treffer = { id: bb.id, glied: -3 }; break; } }
  if (!treffer) return false;
  z.markiert = treffer.id;
  if (z.gewaehlt !== sp.id) waehle(sp.id);
  z.glied = treffer.glied; pluginAufbauen();
  document.getElementById(`karte-${treffer.id}`)?.scrollIntoView({ behavior: "smooth", block: "center" });
  return true;
}

function zeigerAuf(c) {
  let start = null;
  const sek = (e) => { const r = c.getBoundingClientRect(); return Math.max(0, Math.min(1, (e.clientX - r.left) / r.width)) * laenge(); };
  const raster = (s, e) => { if (e.shiftKey) return s; const t = PR.taktDauer(z.projekt) / (e.altKey ? z.projekt.tempo.taktart[0] : 1), b = z.projekt.tempo.beginn; return b + Math.round((s - b) / t) * t; };
  // Am Handy: senkrecht wischen scrollt die Seite (touch-action: pan-y), erst ein deutlich waagrechter Zug markiert. Bricht der Browser
  // die Berührung zum Scrollen ab, bleibt die bisherige Markierung stehen.
  c.onpointerdown = (e) => {
    c.setPointerCapture(e.pointerId);
    start = { x: e.clientX, y: e.clientY, s: sek(e), gezogen: false, scroll: false, touch: e.pointerType !== "mouse", vorher: z.schleife ? { ...z.schleife } : null, vorherAn: z.schleifeAn };
  };
  c.onpointercancel = () => {
    if (!start) return;
    if (start.gezogen) { z.schleife = start.vorher; z.schleifeAn = start.vorherAn; zeichnen(); }
    start = null;
  };
  c.onpointermove = (e) => {
    if (!start || start.scroll) return;
    const dx = Math.abs(e.clientX - start.x), dy = Math.abs(e.clientY - start.y);
    if (!start.gezogen) {
      if (!start.touch) start.gezogen = dx > 5;
      else if (dy > 8 && dy >= dx) start.scroll = true;
      else start.gezogen = dx > 12 && dx > 2 * dy;
    }
    if (!start.gezogen) return;
    const a = raster(Math.min(start.s, sek(e)), e), b = raster(Math.max(start.s, sek(e)), e);
    if (b - a > 0.05) { z.schleife = { a, b }; z.schleifeAn = true; zeichnen(); }
  };
  c.onpointerup = (e) => {
    if (!start) return;
    if (start.scroll) { start = null; return; }
    if (start.gezogen && z.schleife) {
      schleifeSenden(); z.projekt.schleife = { ...z.schleife }; z.auswahl = true; knoepfeAuffrischen();
      // gezogen auf einer Spur: der Bereich gilt für diese Spur; auf dem Lineal: für die Summe
      const id = c.dataset.id ?? (c.id === "lineal" ? "summe" : null);
      start = null;
      if (id && z.gewaehlt !== id) waehle(id); else bereichLeisteAuffrischen();
      return;
    }
    else if (!markierungOeffnen(c, e)) { const s = sek(e); z.pos = Math.round(s * z.rate); post({ art: "stelle", pos: z.pos }); }
    start = null;
  };
}
const schleifeSenden = () => post({ art: "schleife", schleife: z.schleifeAn && z.schleife ? { a: Math.round(z.schleife.a * z.rate), b: Math.round(z.schleife.b * z.rate) } : null });

// ---------- Transport ----------
async function spielen() {
  // Halt gilt sofort, auch wenn ein Start noch auf den Ton wartet (der Start fällt dann weg)
  if (z.laeuft || z.startet) { z.startet = false; post({ art: "stop" }); z.laeuft = false; knoepfeAuffrischen(); return; }
  if (!z.daten.size || (!z.ctx && !neuBau)) return;
  z.startet = true; z.angehaltenBeimVerlassen = false; knoepfeAuffrischen();
  try { await tonWecken(); } catch (e) { z.startet = false; knoepfeAuffrischen(); melde(`Ton: ${e?.message ?? e}`, 8000); return; }
  if (!z.startet) return;
  z.startet = false;
  let pos = z.pos;
  if (z.schleifeAn && z.schleife && (pos < z.schleife.a * z.rate || pos >= z.schleife.b * z.rate)) pos = Math.round(z.schleife.a * z.rate);
  if (pos >= laenge() * z.rate) pos = 0;
  post({ art: "start", pos }); z.laeuft = true;
  knoepfeAuffrischen();
}
function knoepfeAuffrischen() {
  const hat = z.daten.size > 0;
  $("spielen").disabled = !hat; $("spielen").textContent = z.laeuft || z.startet ? "■" : "▶";
  for (const id of ["projektSpeichern"]) $(id).disabled = !z.projekt.spuren.length;
  for (const id of ["exportieren", "trackLaden", "messenKnopf", "zielKnopf"]) $(id).disabled = !hat;
  $("schleifeAn").setAttribute("aria-pressed", String(z.schleifeAn)); $("allesVorher").setAttribute("aria-pressed", String(z.allesVorher));
  $("referenzAn").setAttribute("aria-pressed", String(z.referenzAn));
}

function anzeigen() {
  requestAnimationFrame(anzeigen);
  const d = z.anzeige;
  if (!d || !z.rate) return;
  const s = z.pos / z.rate, takt = PR.sekZuTakt(z.projekt, s), schlag = z.projekt.tempo.taktart[0];
  $("takt").textContent = takt < 0 ? "–" : `${Math.floor(takt) + 1}.${Math.floor((takt % 1) * schlag) + 1}`;
  $("zeit").textContent = `${Math.floor(s / 60)}:${(s % 60).toFixed(1).padStart(4, "0").replace(".", ",")}`;
  const lin = $("lineal");
  if (lin.clientWidth) $("strich").style.left = `${lin.offsetLeft + (s / laenge()) * lin.clientWidth}px`;
  if (z.laeuft) {
    $("lufsM").textContent = zahl(d.momentan); $("lufsS").textContent = zahl(d.kurz);
    $("tp").textContent = zahl(d.tp); $("tp").classList.toggle("warn", d.tp > -1);
    const gr = Math.min(0, ...d.master); $("grMaster").textContent = zahl(gr);
    for (const sp of d.spuren) {
      const i = document.getElementById(`pegel-${sp.id}`); if (!i) continue;
      i.style.width = `${Math.max(0, Math.min(100, ((sp.spitze + 60) / 60) * 100))}%`; i.classList.toggle("heiss", sp.spitze > -1);
    }
    const ga = $("grAnzeige");
    if (ga) {
      const red = z.gewaehlt === "summe" ? d.master[z.glied] : d.spuren.find((x) => x.id === z.gewaehlt)?.reduktion[z.glied];
      const aus = z.gewaehlt !== "summe" ? d.spuren.find((x) => x.id === z.gewaehlt)?.ausgleich : null;
      ga.textContent = `Reduktion ${zahl(red ?? 0)} dB${aus != null && Math.abs(aus) > 0.05 ? ` · Ausgleich vorher ${zahl(aus)} dB` : ""}`;
    }
  }
}

// ---------- Messen und Export ----------
async function bisFertig() { while (offen.size || [...stand.values()].some((x) => x.laeuft)) await new Promise((r) => setTimeout(r, 100)); }
function renderAuftrag(extra = {}) {
  const spuren = z.projekt.spuren.filter((s) => z.daten.has(s.id) && !s.nurVorschau).map((s) => ({ id: s.id, kanaele: z.daten.get(s.id).kanaele }));   // Metronom nie im Export
  return { rate: z.rate, plugins: PLUGINS, spuren, zustand: { ...PR.motorZustand(z.projekt), ...extra }, melden: async (a) => { melde(`rechne … ${Math.round(a * 100)} %`, 0); await atmen(); } };
}
async function mischungMessen({ vorher = true } = {}) {
  await bisFertig();
  const nach = await rendern({ ...renderAuftrag(), stems: false });
  melde("messe …", 0); await atmen();
  const mNach = messen(nach.summe, z.rate);
  // vorher: dieselbe Mischung ohne Kanalzüge der Spuren (die Summenkette bleibt)
  let mVor = z.messungen?.vor ?? mNach;
  if (vorher) { const ohne = PR.motorZustand(z.projekt); ohne.spuren = ohne.spuren.map((s) => ({ ...s, kette: s.kette.map((g) => ({ ...g, aus: true })) })); mVor = messen((await rendern({ ...renderAuftrag(), zustand: ohne, stems: false })).summe, z.rate); }
  z.messungen = { nach: mNach, vor: mVor, zeit: new Date().toISOString() };
  messTabelle(); $("messen" + "Knopf").disabled = false;
  melde(`Mischung: ${zahl(mNach.lufs)} LUFS, ${zahl(mNach.tp)} dBTP`, 5000);
  return mNach;
}
function messTabelle() {
  const t = $("messTabelle"), spalten = [];
  if (z.messungen) spalten.push(["Mischung", z.messungen.nach], ["ohne Kanalzüge", z.messungen.vor]);
  if (z.referenz) spalten.push([z.referenz.name.replace(/\.[a-z0-9]+$/i, "").slice(0, 18), z.referenz.messung]);
  if (!spalten.length) { t.hidden = true; return; }
  const ziel = ZIELE[$("ausgabeZiel").value], pz = (x) => `${Math.round(x * 100)} %`;
  const zeilen = [
    ["Lautheit (LUFS)", (m) => zahl(m.lufs), (m, i) => i === 0 && Math.abs(m.lufs - ziel.lufs) > 1],
    ["wahrer Spitzenwert (dBTP)", (m) => zahl(m.tp), (m, i) => i === 0 && m.tp > ziel.decke],
    ["Lautheitsumfang (LU)", (m) => zahl(m.lra)],
    ["unter 120 Hz", (m) => pz(m.baender.unter120)], ["120 Hz–2 kHz", (m) => pz(m.baender.mitten)], ["über 2 kHz", (m) => pz(m.baender.ueber2k)],
    ["Breite (Seite/Mitte)", (m) => zahl(m.breite, 2)], ["Korrelation", (m) => zahl(m.korrelation, 2)],
  ];
  t.innerHTML = "";
  t.append(el("thead", {}, el("tr", {}, el("th", { textContent: "" }), ...spalten.map(([n]) => el("th", { textContent: n })))));
  t.append(el("tbody", {}, ...zeilen.map(([n, f, warn]) => el("tr", {}, el("th", { textContent: n }), ...spalten.map(([, m], i) => el("td", { textContent: f(m), className: warn?.(m, i) ? "warn" : "" }))))));
  t.hidden = false;
  spektrumZeichnen(spalten);
}
function spektrumZeichnen(spalten) {
  const svg = $("spektrum"), W = 600, H = 180, l = 34, r = 8, o = 10, u = 22;
  const x = (i) => l + (i / (TERZEN.length - 1)) * (W - l - r);
  // je Kurve auf gleiche Gesamtleistung gebracht: verglichen wird die Form, nicht die Lautstärke
  const kurven = spalten.map(([n, m], k) => { const s = m.spektrum, mittel = 10 * Math.log10(s.reduce((a, v) => a + 10 ** (v / 10), 0) / s.length); return { n, k, w: s.map((v) => v - mittel) }; });
  const lo = -30, hi = 15, y = (v) => o + ((hi - Math.max(lo, Math.min(hi, v))) / (hi - lo)) * (H - o - u);
  let s = "";
  for (const v of [-30, -20, -10, 0, 10]) s += `<line class="gitter" x1="${l}" x2="${W - r}" y1="${y(v)}" y2="${y(v)}"/><text x="2" y="${y(v) + 3}">${v > 0 ? "+" : ""}${v}</text>`;
  for (const [f, t] of [[0, "25"], [6, "100"], [9, "200"], [16, "1k"], [19, "2k"], [26, "8k"], [28, "16k"]]) s += `<text x="${x(f) - 6}" y="${H - 6}">${t}</text>`;
  const cls = ["mix", "vorher", "ref"];
  for (const c of kurven) s += `<polyline class="${spalten.length === 1 && z.referenz && !z.messungen ? "ref" : cls[c.k] ?? "ref"}" points="${c.w.map((v, i) => `${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(" ")}"><title>${c.n}</title></polyline>`;
  s += `<text x="${W - r - 230}" y="${o + 8}">blau Mischung · grau gestrichelt ohne Kanalzüge · orange Referenz</text>`;
  svg.innerHTML = s; svg.hidden = false;
}
async function aufZielBringen() {
  const ziel = ZIELE[$("ausgabeZiel").value];
  const grenze = z.projekt.master.kette.find((g) => g.plugin.startsWith("grenze@"));
  if (grenze) { grenze.parameter.decke = ziel.decke; grenze.aus = false; }
  for (let durchgang = 0; durchgang < 3; durchgang++) {
    const m = await mischungMessen({ vorher: false }), d = ziel.lufs - m.lufs;
    if (Math.abs(d) < 0.3) break;
    z.projekt.master.pegel = Math.round(Math.max(-24, Math.min(12, z.projekt.master.pegel + d)) * 10) / 10;
    senden();
  }
  summeKopf(); pluginAufbauen();
  melde(`Summe ${zahl(z.projekt.master.pegel)} dB → ${zahl(z.messungen.nach.lufs)} LUFS, ${zahl(z.messungen.nach.tp)} dBTP`, 6000);
}
const dateiname = (s) => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "composer";
function herunterladen(blob, name) { const a = el("a", { href: URL.createObjectURL(blob), download: name }); document.body.append(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 60000); }

async function exportieren() {
  await bisFertig();
  const nc = z.projekt.spuren.filter((s) => s.quelle?.sample?.nichtKommerziell);
  if (nc.length) melde(`Achtung: ${nc.map((s) => s.name).join(", ")} enthält Material mit nicht kommerzieller Lizenz (NC). Für Reels und Aufträge nicht verwenden.`, 9000);
  const r = await rendern({ ...renderAuftrag(), stems: true });
  melde("messe und schreibe WAV …", 0); await atmen();
  const name = dateiname(z.projekt.titel), m = messen(r.summe, z.rate), dateien = [{ name: `${name}-summe.wav`, bytes: wavSchreiben(r.summe, z.rate, { bits: "24" }) }];
  const stemMessungen = {};
  for (const sp of z.projekt.spuren) {
    const st = r.stems?.get(sp.id); if (!st) continue;
    await atmen();
    dateien.push({ name: `stems/${dateiname(sp.name)}.wav`, bytes: wavSchreiben(st, z.rate, { bits: "24" }) });
    stemMessungen[sp.name] = messen(st, z.rate);
  }
  const messung = { summe: m, stems: stemMessungen, referenz: z.referenz ? { name: z.referenz.name, ...z.referenz.messung } : null, rate: z.rate, bits: 24, zeit: new Date().toISOString() };
  dateien.push({ name: `${name}.composer.json`, bytes: new TextEncoder().encode(PR.schreiben(z.projekt)) }, { name: "messung.json", bytes: new TextEncoder().encode(JSON.stringify(messung, null, 2)) });
  herunterladen(await zipBlob(dateien), `${name}-export.zip`);
  melde(`Export: Summe ${zahl(m.lufs)} LUFS, ${zahl(m.tp)} dBTP, ${dateien.length - 3} Stems, 24 Bit, ${zahl(z.rate / 1000, 1)} kHz`, 8000);
}

// ---------- Projekt ----------
function projektSpeichern() {
  const titel = prompt("Titel des Projekts", z.projekt.titel); if (titel === null) return;
  z.projekt.titel = titel.trim() || z.projekt.titel;
  herunterladen(new Blob([PR.schreiben(z.projekt)], { type: "application/json" }), `${dateiname(z.projekt.titel)}.composer.json`);
}
async function projektOeffnen(f) {
  try {
    const p = PR.lesen(await f.text());
    if (z.laeuft) await spielen();
    for (const id of z.daten.keys()) post({ art: "weg", id });
    z.projekt = p; z.daten.clear(); z.fassungRoh.clear(); z.original.clear(); z.auswahl = false; z.gewaehlt = p.spuren[0]?.id ?? null; z.schleife = p.schleife; z.schleifeAn = false; z.messungen = null;
    if (p.spuren.some((s) => s.quelle)) { await kontext(p.rate); for (const s of p.spuren) if (s.quelle) spurNeuRechnen(s); senden(); }
    allesAufbauen(); LUI.aufbauen();
    const fehlen = p.spuren.filter((s) => s.datei).map((s) => s.datei.name);
    melde(fehlen.length ? `«${p.titel}» geöffnet. Jetzt die Tondateien laden (${fehlen.join(", ")}).` : `«${p.titel}» geöffnet, alle Spuren neu gerechnet.`, 9000);
  } catch (e) { melde(String(e.message ?? e), 8000); }
}

function urteileAufbauen() {
  const l = $("urteilListe"); l.innerHTML = "";
  for (const u of [...z.projekt.urteile].reverse()) l.append(el("li", {}, el("b", { textContent: u.text }), ` · ${u.spur}${u.variante ? `, ${u.variante}` : ""} · ${new Date(u.zeit).toLocaleString("de-CH", { dateStyle: "short", timeStyle: "short" })}`));
}

// ---------- Ereignisse ----------
$("dateien").onchange = (e) => { dateienLaden(e.target.files); e.target.value = ""; };
$("ordner").onchange = (e) => { dateienLaden([...e.target.files].filter((f) => !/-roh\.wav$/i.test(f.name))); e.target.value = ""; };
$("referenzDatei").onchange = (e) => { if (e.target.files[0]) referenzLaden(e.target.files[0]); e.target.value = ""; };
$("projektDatei").onchange = (e) => { if (e.target.files[0]) projektOeffnen(e.target.files[0]); e.target.value = ""; };
$("projektSpeichern").onclick = projektSpeichern;
$("exportieren").onclick = () => exportieren().catch((e) => melde(`Export: ${e.message}`, 8000));
/** nur der fertige Track: die Summe als WAV 24 Bit (dieselbe Rechnung wie «Exportieren», ohne Einzelspuren) */
$("trackLaden").onclick = async () => {
  try {
    await bisFertig();
    const r = await rendern({ ...renderAuftrag(), stems: false });
    melde("schreibe WAV …", 0); await atmen();
    const m = messen(r.summe, z.rate);
    herunterladen(new Blob([wavSchreiben(r.summe, z.rate, { bits: "24" })], { type: "audio/wav" }), `${dateiname(z.projekt.titel)}.wav`);
    melde(`Track: ${Math.round(m.dauer)} s, ${zahl(m.lufs)} LUFS, ${zahl(m.tp)} dBTP, 24 Bit, ${zahl(z.rate / 1000, 1)} kHz`, 8000);
  } catch (e) { melde(`Track: ${e.message}`, 8000); }
};
$("messenKnopf").onclick = () => mischungMessen().catch((e) => melde(`Messen: ${e.message}`, 8000));
$("zielKnopf").onclick = () => aufZielBringen().catch((e) => melde(`Ziel: ${e.message}`, 8000));
$("ausgabeZiel").onchange = () => { z.projekt.ausgabe = { ziel: $("ausgabeZiel").value, ...ZIELE[$("ausgabeZiel").value], bits: "24" }; messTabelle(); };
$("spielen").onclick = spielen;
$("bpm").onchange = () => { const v = Number($("bpm").value); if (v >= 40 && v <= 240) { z.projekt.tempo = { ...z.projekt.tempo, bpm: v, quelle: "mensch" }; $("bpmQuelle").textContent = "eingestellt"; alleNeuSenden(); } };
$("beginn").onchange = () => { const v = Number($("beginn").value); if (v >= 0) { z.projekt.tempo.beginn = v; alleNeuSenden(); } };
$("schleifeAn").onclick = () => { if (!z.schleife) { melde("Zuerst auf der Zeitleiste einen Bereich ziehen (rastet auf Takte, mit Umschalt frei)."); return; } z.schleifeAn = !z.schleifeAn; schleifeSenden(); knoepfeAuffrischen(); zeichnen(); };
$("allesVorher").onclick = () => { z.allesVorher = !z.allesVorher; senden(); knoepfeAuffrischen(); };
$("referenzAn").onclick = () => { if (!z.referenz) return; z.referenzAn = !z.referenzAn; senden(); knoepfeAuffrischen(); };
$("ausgleich").onchange = () => { z.ausgleich = $("ausgleich").checked; senden(); };
$("urteilForm").onsubmit = (e) => {
  e.preventDefault(); const text = $("urteilText").value.trim(); if (!text) return;
  const sp = z.gewaehlt === "summe" ? { name: "Summe", typ: "summe", kette: z.projekt.master.kette } : z.projekt.spuren.find((s) => s.id === z.gewaehlt);
  const glied = sp?.kette?.[0];
  z.projekt.urteile.push({ zeit: new Date().toISOString(), spur: sp?.name ?? "–", plugin: glied?.plugin, variante: glied?.variante != null ? variantenFuer(sp.typ)[glied.variante]?.name : "eigene", parameter: glied ? { ...glied.parameter } : null, text });
  $("urteilText").value = ""; urteileAufbauen(); melde("festgehalten (wird mit dem Projekt gespeichert)");
};
addEventListener("keydown", (e) => {
  if (e.target.closest?.("input[type=text], input[type=number], select, textarea") || e.metaKey || e.ctrlKey || e.altKey) return;
  const k = e.key.toLowerCase();
  if (k === " ") { e.preventDefault(); spielen(); }
  else if (k === "v") $("allesVorher").click();
  else if (k === "r") $("referenzAn").click();
  else if (k === "l") $("schleifeAn").click();
  else if (/^[1-7]$/.test(k)) varianteWaehlen(Number(k) - 1);
  else if (k === "a") { const sp = z.projekt.spuren.find((s) => s.id === z.gewaehlt); if (sp?.quelle) schlagHoeren(sp, null); }
  else if (k === "escape" && z.auswahl) auswahlAufheben();
  else if (!$("bereichLeiste").hidden && (k === "m" || k === "-" || k === "+" || k === "=" || k === "e")) { e.preventDefault(); $({ m: "bStumm", "-": "bLeiser", "+": "bLauter", "=": "bLauter", e: "bEffektDazu" }[k]).click(); }
  else if (k === "arrowdown" || k === "arrowup") {
    e.preventDefault();
    const ids = ["summe", ...z.projekt.spuren.map((s) => s.id)], i = ids.indexOf(z.gewaehlt);
    waehle(ids[Math.max(0, Math.min(ids.length - 1, i + (k === "arrowdown" ? 1 : -1)))]);
  }
});
addEventListener("resize", () => zeichnen());
// Ziehen und Ablegen von Dateien auf die Seite
addEventListener("dragover", (e) => e.preventDefault());
addEventListener("drop", (e) => { e.preventDefault(); if (e.dataTransfer?.files?.length) dateienLaden(e.dataTransfer.files); });

$("erzeugen").onclick = () => erzeugen().catch((e) => melde(`Erzeugen: ${e.message}`, 8000));
$("trackErzeugen").onclick = () => trackErzeugen().catch((e) => melde(`Track: ${e.message}`, 9000));
$("synthDazu").onclick = () => synthDazu().catch((e) => melde(`Synth: ${e.message}`, 8000));
$("kammerton").onchange = () => {
  const v = Number($("kammerton").value); if (!(v >= 400 && v <= 466)) { $("kammerton").value = kammerton(); return; }
  z.projekt.kammerton = v;
  for (const s of z.projekt.spuren) if (s.quelle && (s.quelle.leiter || s.quelle.flaeche)) { s.quelle.kammerton = v; spurNeuRechnen(s); }
  melde(`A = ${v} Hz: alle tonalen Spuren neu gestimmt`, 3000);
};
for (const r of ["synthRolle"]) $(r).append(el("option", { value: "auto", textContent: "Rolle des Presets" }), ...ROLLEN.map((x) => el("option", { value: x.key, textContent: x.name })));
function synthListe() {
  const rolle = $("synthFilterRolle").value, verf = $("synthFilterVerfahren").value, cha = $("synthFilterCharakter").value, alt = $("synthPreset").value;
  $("synthPreset").replaceChildren(...FAMILIEN_LISTE.map((f) => { const ps = f.patches.filter((k) => (!rolle || PATCHES[k].rolle === rolle) && (!verf || PATCHES[k].verfahren === verf) && (!cha || PATCHES[k].charaktere?.includes(cha))); return ps.length ? el("optgroup", { label: f.name }, ...ps.map((k) => el("option", { value: `${f.key}:${k}`, textContent: `${PATCHES[k].name} · ${PATCHES[k].rolle}, ${PATCHES[k].verfahren}${PATCHES[k].charaktere?.length ? " · " + PATCHES[k].charaktere.join(", ") : ""}` }))) : null; }).filter(Boolean));
  if ([...$("synthPreset").options].some((o) => o.value === alt)) $("synthPreset").value = alt;
}
$("synthFilterRolle").append(el("option", { value: "", textContent: "alle Rollen" }), ...[...new Set(Object.values(PATCHES).map((p) => p.rolle))].map((r) => el("option", { value: r, textContent: r })));
$("synthFilterVerfahren").append(el("option", { value: "", textContent: "alle Verfahren" }), ...[...new Set(Object.values(PATCHES).map((p) => p.verfahren))].map((r) => el("option", { value: r, textContent: r })));
$("synthFilterCharakter").append(el("option", { value: "", textContent: "alle Charaktere" }), ...CHARAKTERE.map((c) => el("option", { value: c.key, textContent: c.name, title: c.hilfe })));
$("synthFilterRolle").onchange = synthListe; $("synthFilterVerfahren").onchange = synthListe; $("synthFilterCharakter").onchange = synthListe; synthListe();
$("flaecheDazu").onclick = () => flaecheDazu().catch((e) => melde(`Fläche: ${e.message}`, 8000));
$("bassDazu").onclick = async () => {
  try {
    await kontext(48000);
    const drums = z.projekt.spuren.find(istDrums), stil = stilVon(drums?.quelle.stil ?? $("stil").value);
    const sp = bassErzeugen({ anzahl: drums?.quelle.anzahl ?? Number($("takte").value), bpm: z.projekt.tempo.bpm, seed: Math.max(1, Math.round(Number($("seed").value) || 1)), stil });
    z.gewaehlt = sp.id; z.glied = -1; senden(); allesAufbauen();
    melde(`${sp.name}: ${LINIEN.find((l) => l.key === sp.quelle.linie).name}, ${NOTEN[sp.quelle.grundton]} ${LEITERN[sp.quelle.leiter].name}`, 4000);
  } catch (e) { melde(`Bass: ${e.message}`, 8000); }
};
$("wuerfeln").onclick = () => { $("seed").value = 1 + Math.floor(Math.random() * 99998); };
// Bereich bearbeiten
$("bEffekt").append(...BE.SCHNELL_EFFEKTE.map((v) => el("option", { value: v.key, textContent: v.name })));
$("bUnter").append(el("option", { value: "", textContent: "Unterbrechung …" }), ...Object.entries(UNTER).map(([k, a]) => el("option", { value: k, textContent: a.name, title: a.hilfe })));
$("bStumm").onclick = () => bereichDazu({ art: "stumm" });
$("bLeiser").onclick = () => bereichDazu({ art: "pegel", db: -6, dbEnde: -6 }, { schritt: -3 });
$("bLauter").onclick = () => bereichDazu({ art: "pegel", db: 3, dbEnde: 3 }, { schritt: 1.5 });
$("bAbfall").onclick = () => bereichDazu({ art: "pegel", db: 0, dbEnde: -40, kurve: "s" });
$("bSteigerung").onclick = () => bereichDazu({ art: "pegel", db: -40, dbEnde: 0, kurve: "s" });
$("bEffektDazu").onclick = effektDazu;
$("bUnter").onchange = () => {
  const art = $("bUnter").value; $("bUnter").value = ""; if (!art) return;
  const alle = z.gewaehlt === "summe" || $("bAlle").checked, sp = spurVon(z.gewaehlt) ?? z.projekt.spuren[0];
  if (sp) ereignisDazu(sp, { art, takt: 0, schritte: 16, alle: 0 }, alle);
};
$("bAlle").onchange = bereichLeisteAuffrischen;
$("bWeg").onclick = auswahlAufheben;
$("bWav").onclick = () => bereichAlsWav().catch((e) => melde(`WAV: ${e.message}`, 8000));
$("bNeuerTrack").onclick = () => neuerTrackAusBereich().catch((e) => melde(`Neuer Track: ${e.message}`, 9000));
$("ersatzDatei").onchange = (e) => { const f = e.target.files[0], sp = spurVon(z.ersatzFuer); e.target.value = ""; if (f && sp) spurErsetzen(sp, f).catch((x) => melde(`Ersetzen: ${x.message}`, 8000)); };
zeigerAuf($("lineal"));
stileAufbauen();
allesAufbauen();
// ornament.lucerne: Klangsammlung und Steuerung (eigenes Modul, bekommt nur, was es braucht)
const LUI = await lucerneEinbauen({ z, $, el, melde, atmen, PR, post, senden, allesAufbauen, spurSenden, spurNeuRechnen, kontext, spielen, bisFertig, schnellEinpegeln, schleifeSenden, zeichnen, zeigeRechnen, herunterladen, sha256, imWorker, imWorkerRoh, tonWecken, NOTEN });
requestAnimationFrame(anzeigen);
