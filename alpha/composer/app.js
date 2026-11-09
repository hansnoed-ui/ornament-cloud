// ORNAMENT COMPOSER 0.1 – Oberfläche. Der Klang entsteht im AudioWorklet (worklet/motor-worklet.js) mit dem Motor aus kern/motor.js;
// der Export rechnet mit demselben Motor offline (kern/rendern.js). Dateien bleiben auf dem Gerät.

import { PLUGINS } from "./plugins/register.js";
import { zuStellung, ausStellung, zeigeWert, standardWerte } from "./kern/plugin.js";
import * as PR from "./kern/projekt.js";
import { SPURTYPEN, variantenFuer } from "./kern/varianten.js";
import { rendern } from "./kern/rendern.js";
import { messen, TERZEN } from "./kern/messen.js";
import { zipBlob } from "./kern/zip.js";
import { STILE, stilVon } from "./kern/muster.js";
import { ARTEN as UNTER, SCHNELL, anwenden, werteVon } from "./kern/unterbrechungen.js";
import { spurRechnen, schlagRechnen } from "./kern/erzeugen.js";
import { stimmeVon, ERZEUGER } from "./erzeuger/register.js";
import { LINIEN, LEITERN, NOTEN, linieErzeugen, kickSchritte, grundFrequenz } from "./kern/linien.js";
import { wavSpuren, abtastrateLesen, mono, tempoSchaetzen, einsaetzeFinden, wavSchreiben, rateWandeln } from "../lab/kern/klangwerk.js";

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
};

// ---------- Meldungen ----------
let meldungZeit = 0;
function melde(text, dauer = 3500) { const m = $("meldung"); m.textContent = text; m.hidden = false; clearTimeout(meldungZeit); if (dauer) meldungZeit = setTimeout(() => (m.hidden = true), dauer); }
const zahl = (x, s = 1) => (Number.isFinite(x) ? x.toFixed(s).replace(".", ",").replace("-", "−") : "–");

// ---------- Ton ----------
async function kontext(rate) {
  if (z.ctx) return z.ctx;
  const AC = globalThis.AudioContext ?? globalThis.webkitAudioContext;
  try { z.ctx = new AC({ sampleRate: rate, latencyHint: "interactive" }); } catch { z.ctx = new AC({ latencyHint: "interactive" }); }
  z.rate = z.ctx.sampleRate; z.projekt.rate = z.rate;
  await z.ctx.audioWorklet.addModule(new URL("./worklet/motor-worklet.js", import.meta.url));
  z.node = new AudioWorkletNode(z.ctx, "composer-motor", { numberOfInputs: 0, numberOfOutputs: 1, outputChannelCount: [2] });
  z.node.connect(z.ctx.destination);
  z.node.port.onmessage = ({ data: d }) => {
    if (d.art === "anzeige") { z.anzeige = d; z.pos = d.pos; }
    else if (d.art === "ende") { z.laeuft = false; knoepfeAuffrischen(); }
    else if (d.art === "fehler") melde(`Motor: ${d.text}`, 8000);
  };
  return z.ctx;
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
    if (sp && sp.datei.sha256 !== hash) melde(`${f.name}: anderer Inhalt als im Projekt gespeichert`, 6000);
    if (!sp) { sp = PR.spurDazu(z.projekt, datei); neu++; }
    spurSenden(sp, kanaele);
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
  summeKopf(); spurenAufbauen(); pluginAufbauen(); urteileAufbauen(); knoepfeAuffrischen(); zeichnen();
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
        da || sp.quelle ? "" : el("span", { className: "leise-text", textContent: "Datei fehlt" })),
      regler("dB", sp.pegel, -24, 12, 0.1, (x) => { sp.pegel = x; senden(); }, (x) => `${zahl(x)} dB`),
      regler("◐", sp.pan * 100, -100, 100, 1, (x) => { sp.pan = x / 100; senden(); }, (x) => (x === 0 ? "Mitte" : x < 0 ? `L ${-x}` : `R ${x}`)),
      el("div", { className: "pegelbalken" }, el("i", { id: `pegel-${sp.id}` })));
    const welle = el("canvas", { className: "welle" });
    welle.dataset.id = sp.id;
    zeigerAuf(welle);
    const zeile = el("div", { className: `spur${z.gewaehlt === sp.id ? " gewaehlt" : ""}${still ? " still" : ""}` }, kopf, el("div", { className: "wellen-feld" }, welle));
    kopf.onclick = () => waehle(sp.id);
    liste.append(zeile);
  }
  zeichnen();
}

function waehle(id) { z.gewaehlt = id; z.glied = erzeugt(id) ? -1 : 0; summeKopf(); spurenAufbauen(); pluginAufbauen(); }
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
    ...(spur ? [umschalt(`Unterbrechungen${spur.ereignisse?.length ? ` (${spur.ereignisse.length})` : ""}`, "v", z.glied === -2, "Stutter, Tape-Stop, Gate, Echo-Wurf …", () => { z.glied = -2; pluginAufbauen(); })] : []),
    ...kette.map((g, i) => umschalt(PLUGINS[g.plugin].name, "v", i === z.glied, g.plugin, () => { z.glied = i; pluginAufbauen(); }))];
  const wahl = el("div", { className: "glied-wahl" }, ...reiter);
  if (z.glied === -1 && spur?.quelle) { klangAufbauen(box, spur, wahl); return; }
  if (z.glied === -2 && spur) { unterAufbauen(box, spur, wahl); return; }
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
  const sel = $("stil"), gruppen = {};
  for (const s of STILE) (gruppen[s.gruppe] ??= []).push(s);
  for (const [g, liste] of Object.entries(gruppen)) sel.append(el("optgroup", { label: g === "elektronisch" ? "Drums, elektronisch" : "Perkussion, organisch" }, ...liste.map((s) => el("option", { value: s.key, textContent: `${s.name} · ${s.bpm}` }))));
  const bass = ERZEUGER["bass@0.1.0"].stimmen;
  $("bassStimme").append(...Object.values(bass).map((b) => el("option", { value: b.key, textContent: b.name })));
  $("bassLinie").append(...LINIEN.map((l) => el("option", { value: l.key, textContent: l.name, title: l.hilfe })));
  $("tonart").append(...NOTEN.map((n, i) => el("option", { value: i, textContent: n, selected: i === 2 })));
  $("leiter").append(...Object.entries(LEITERN).map(([k, l]) => el("option", { value: k, textContent: l.name })));
  sel.onchange = () => {
    const st = stilVon(sel.value); $("erzBpm").value = st.bpm;
    if (st.bass) { $("bassStimme").value = st.bass.stimme; $("bassLinie").value = st.bass.linie; $("leiter").value = st.bass.leiter; }
  };
  sel.onchange();
}

/** die Kick (oder sonst die tiefste erzeugte Schlagspur) als Vorlage für den Rhythmus des Basses */
function kickVorlage() {
  const sp = z.projekt.spuren.filter((s) => s.quelle && !s.quelle.leiter);
  const kick = sp.find((s) => s.quelle.stimme === "kick") ?? sp.find((s) => ["rahmen", "darbuka", "zarb", "tabla", "tom"].includes(s.quelle.stimme)) ?? sp[0];
  if (!kick) return null;
  // bei Perkussion nur die tiefen Schläge
  const tief = /^(x|o|dum|doum|tom|ge|ghe|dha|dhin|dhi|bum|tun)[!_]?$/;
  return kickSchritte(kick.quelle.takte.map((zl) => zl.trim().split(/\s+/).map((t) => (tief.test(t) || (kick.quelle.stimme === "kick" && t !== "." && t !== "-") ? t : ".")).join(" ")));
}

/** den Bass erzeugen (ersetzt einen vorhandenen erzeugten Bass) */
function bassErzeugen({ anzahl, bpm, seed, stil }) {
  for (const sp of z.projekt.spuren.filter((s) => s.quelle?.leiter)) { post({ art: "weg", id: sp.id }); z.daten.delete(sp.id); }
  z.projekt.spuren = z.projekt.spuren.filter((s) => !s.quelle?.leiter);
  const st = stimmeVon("bass@0.1.0", $("bassStimme").value), vorgabe = stil?.bass?.stimme === st.key ? stil.bass : null;
  const v = st.varianten.find((x) => x.name === vorgabe?.variante) ?? st.varianten[0], linie = $("bassLinie").value, leiter = $("leiter").value;
  const quelle = { art: "erzeugt", erzeuger: "bass@0.1.0", stimme: st.key, variante: v.name, werte: { ...v.werte }, linie, leiter, grundton: Number($("tonart").value),
    takte: linieErzeugen({ art: linie, leiter, kicks: kickVorlage(), anzahl: Math.min(anzahl, 8), seed }), anzahl, bpm, swing: stil?.swing ?? 0, menschlich: Math.min(4, stil?.menschlich ?? 2), versatz: 0, seed: seed * 100 + 50 };
  const sp = PR.erzeugteSpurDazu(z.projekt, quelle, { name: `Bass · ${st.name}`, typ: "bass", pegel: st.pegel, pan: 0, bassfett: stil?.bass?.bassfett ?? null });
  spurNeuRechnen(sp);
  return sp;
}

/** eine erzeugte Spur rechnen und dem Motor geben (die Kette mit ihrem Zustand bleibt) */
function spurNeuRechnen(sp) {
  spurSenden(sp, spurRechnen(sp.quelle, z.rate).kanaele);
}

/**
 * Tondaten einer Spur an den Motor: roh (aus Datei oder Erzeuger) → Unterbrechungen → Motor. Ohne roh werden die gespeicherten Rohdaten
 * neu verarbeitet (nach einer Änderung an den Unterbrechungen oder am Tempo).
 */
function spurSenden(sp, roh = z.daten.get(sp.id)?.roh) {
  if (!roh) return;
  const kanaele = sp.ereignisse?.length ? anwenden(roh, z.rate, sp.ereignisse, z.projekt.tempo) : roh;
  z.daten.set(sp.id, { roh, kanaele, wellen: wellenform(kanaele) });
  const kopie = kanaele.map((x) => x.slice());
  post({ art: "spur", id: sp.id, kanaele: kopie }, kopie.map((x) => x.buffer));
}
const unterPlan = new Map();
function unterBald(sp) { clearTimeout(unterPlan.get(sp.id)); unterPlan.set(sp.id, setTimeout(() => { unterPlan.delete(sp.id); spurSenden(sp); zeichnen(); }, 100)); }
function alleNeuSenden() { for (const sp of z.projekt.spuren) if (sp.ereignisse?.length) spurSenden(sp); zeichnen(); }
let neuPlan = new Map();
/** nach einer Änderung am Klang: kurz warten (Regler werden gezogen), dann neu rechnen */
function spurBald(sp) {
  clearTimeout(neuPlan.get(sp.id));
  neuPlan.set(sp.id, setTimeout(() => { neuPlan.delete(sp.id); spurNeuRechnen(sp); zeichnen(); }, 120));
}

async function erzeugen() {
  const stil = stilVon($("stil").value), bpm = Number($("erzBpm").value) || stil.bpm, anzahl = Number($("takte").value), seed = Math.max(1, Math.round(Number($("seed").value) || 1));
  await kontext(48000);
  if (z.laeuft) await spielen();
  if ($("ersetzen").checked) for (const sp of z.projekt.spuren.filter((s) => s.quelle)) { post({ art: "weg", id: sp.id }); z.daten.delete(sp.id); }
  if ($("ersetzen").checked) z.projekt.spuren = z.projekt.spuren.filter((s) => !s.quelle);
  z.projekt.tempo = { ...z.projekt.tempo, bpm, quelle: "stil", beginn: 0, aus: stil.name };
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
  const L = (anzahl * 240) / bpm;
  z.schleife = { a: 0, b: L }; z.schleifeAn = true; z.projekt.schleife = { a: 0, b: L }; schleifeSenden();
  z.gewaehlt = erste.id; z.glied = -1; z.pos = 0; post({ art: "stelle", pos: 0 });
  senden(); allesAufbauen();
  melde(`${stil.name}: ${stil.spuren.length + ($("mitBass").checked ? 1 : 0)} Spuren, ${anzahl} Takte, ${bpm} BPM, ${NOTEN[$("tonart").value]} ${LEITERN[$("leiter").value].name}. Leertaste spielt in der Schleife.`, 5000);
}

function stimmVariante(sp, i) {
  const st = stimmeVon(sp.quelle.erzeuger, sp.quelle.stimme), v = st.varianten[i];
  if (!v) return;
  sp.quelle.werte = { ...v.werte }; sp.quelle.variante = v.name;
  spurNeuRechnen(sp); pluginAufbauen(); spurenAufbauen();
  melde(`${sp.name}: ${v.name}`, 1200);
}

async function schlagHoeren(sp, art) {
  await kontext(48000); await z.ctx.resume();
  const st = stimmeVon(sp.quelle.erzeuger, sp.quelle.stimme), q = sp.quelle;
  const [L, R] = q.leiter ? st.rechne({ ...Object.fromEntries(st.parameter.map((p) => [p.key, p.std])), ...q.werte }, z.rate, { frequenz: grundFrequenz(q.grundton) * 2 ** ((q.werte.oktave ?? 0) + (art ?? 0) / 12), dauer: 0.9, staerke: 0.85, seed: 3 })
    : schlagRechnen(q, art ?? st.artikulationen[0].key, z.rate);
  const b = z.ctx.createBuffer(2, L.length, z.rate); b.copyToChannel(L, 0); b.copyToChannel(R, 1);
  const quelleKnoten = z.ctx.createBufferSource(), g = z.ctx.createGain(); g.gain.value = 0.7; quelleKnoten.buffer = b; quelleKnoten.connect(g).connect(z.ctx.destination); quelleKnoten.start();
}

function klangAufbauen(box, sp, wahl) {
  const q = sp.quelle, st = stimmeVon(q.erzeuger, q.stimme), e = ERZEUGER[q.erzeuger];
  box.append(el("div", { className: "plugin-kopf" }, el("h2", { textContent: `${sp.name}: ${e.name} ${e.version}` }), wahl,
    el("span", { className: "leise-text", textContent: `Eigene Synthese, Startwert ${q.seed}. Jede Änderung rechnet die Spur neu; jeder Schlag und jeder Ton ist auf dieselbe Spitze gebracht, damit Klangfarbe nicht als Lautstärke gehört wird.` })));
  // einzelne Schläge anhören
  if (q.leiter) box.append(bassSteuerung(sp));
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
    for (const p of ps) kasten.append(paramRegler(p, q.werte[p.key] ?? p.std, (v) => { q.werte[p.key] = v; q.variante = null; markiere(); spurBald(sp); }));
    raster.append(kasten);
  }
  // Groove
  const groove = el("div", { className: "gruppe" }, el("h3", {}, el("span", { textContent: "Groove" })));
  const G = (key, name, min, max, std, einheit, hilfe) => ({ key, name, min, max, std, einheit, hilfe, schritt: key === "swing" ? 0.01 : 0.5 });
  for (const p of [G("swing", "Swing", 0, 0.5, 0, "", "jeder zweite Schlag nach hinten"), G("menschlich", "Menschlich", 0, 20, 2, "ms", "kleine Abweichungen im Timing"), G("versatz", "hinter dem Schlag", -20, 40, 0, "ms", "die ganze Spur später: laid back")])
    groove.append(paramRegler(p, q[p.key] ?? p.std, (v) => { q[p.key] = v; spurBald(sp); }));
  raster.append(groove);
  box.append(raster);
  // Muster
  const arten = (st.artikulationen ?? []).map((a) => a.key).join(", ");
  const ta = el("textarea", { className: "muster", rows: Math.min(8, q.takte.length + (q.fill ? 1 : 0) + 1), spellcheck: false, value: [...q.takte, ...(q.fill ? [`fill: ${q.fill}`] : [])].join("\n") });
  ta.oninput = () => {
    const zeilen = ta.value.split("\n").map((x) => x.trim()).filter(Boolean), fill = zeilen.find((x) => x.startsWith("fill:"));
    const takte = zeilen.filter((x) => !x.startsWith("fill:"));
    if (!takte.length) return;
    q.takte = takte; q.fill = fill ? fill.slice(5).trim() : null; spurBald(sp);
  };
  box.append(el("div", { className: "gruppe", style: "margin-top:16px" }, el("h3", {}, el("span", { textContent: "Muster (eine Zeile je Takt, «fill:» für den Wirbel)" })), ta,
    el("p", { className: "hinweis", textContent: q.leiter
      ? "16 Zeichen = Sechzehntel, 8 = Achtel, 4 = Viertel. 1–7 Stufe der Tonleiter, b3 #4 mit Vorzeichen, 1' 1, Oktave höher, tiefer, «-» Ton hält, «.» Pause, «~» gleiten, «!» betont, «_» leise."
      : `16 Zeichen = Sechzehntel, 8 = Achtel, 12 = Triolen. «.» Pause, x o g (laut, mittel, Geisternote), oder Artikulationen: ${arten}. «!» betont, «_» leise.` })));
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
    liste.append(el("div", { className: "ereignis" + (e.aus ? " aus" : "") }, kopf, regler));
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
  }
}

function zeigerAuf(c) {
  let start = null;
  const sek = (e) => { const r = c.getBoundingClientRect(); return Math.max(0, Math.min(1, (e.clientX - r.left) / r.width)) * laenge(); };
  const raster = (s, frei) => { if (frei) return s; const t = PR.taktDauer(z.projekt), b = z.projekt.tempo.beginn; return b + Math.round((s - b) / t) * t; };
  c.onpointerdown = (e) => { c.setPointerCapture(e.pointerId); start = { x: e.clientX, s: sek(e), gezogen: false }; };
  c.onpointermove = (e) => {
    if (!start) return;
    if (Math.abs(e.clientX - start.x) > 5) start.gezogen = true;
    if (!start.gezogen) return;
    const a = raster(Math.min(start.s, sek(e)), e.shiftKey), b = raster(Math.max(start.s, sek(e)), e.shiftKey);
    if (b - a > 0.05) { z.schleife = { a, b }; z.schleifeAn = true; zeichnen(); }
  };
  c.onpointerup = (e) => {
    if (!start) return;
    if (start.gezogen && z.schleife) { schleifeSenden(); z.projekt.schleife = { ...z.schleife }; knoepfeAuffrischen(); }
    else { const s = sek(e); z.pos = Math.round(s * z.rate); post({ art: "stelle", pos: z.pos }); }
    start = null;
  };
}
const schleifeSenden = () => post({ art: "schleife", schleife: z.schleifeAn && z.schleife ? { a: Math.round(z.schleife.a * z.rate), b: Math.round(z.schleife.b * z.rate) } : null });

// ---------- Transport ----------
async function spielen() {
  if (!z.ctx || !z.daten.size) return;
  if (z.laeuft) { post({ art: "stop" }); z.laeuft = false; }
  else {
    await z.ctx.resume();
    let pos = z.pos;
    if (z.schleifeAn && z.schleife && (pos < z.schleife.a * z.rate || pos >= z.schleife.b * z.rate)) pos = Math.round(z.schleife.a * z.rate);
    if (pos >= laenge() * z.rate) pos = 0;
    post({ art: "start", pos }); z.laeuft = true;
  }
  knoepfeAuffrischen();
}
function knoepfeAuffrischen() {
  const hat = z.daten.size > 0;
  $("spielen").disabled = !hat; $("spielen").textContent = z.laeuft ? "■" : "▶";
  for (const id of ["projektSpeichern"]) $(id).disabled = !z.projekt.spuren.length;
  for (const id of ["exportieren", "messenKnopf", "zielKnopf"]) $(id).disabled = !hat;
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
function renderAuftrag(extra = {}) {
  const spuren = z.projekt.spuren.filter((s) => z.daten.has(s.id)).map((s) => ({ id: s.id, kanaele: z.daten.get(s.id).kanaele }));
  return { rate: z.rate, plugins: PLUGINS, spuren, zustand: { ...PR.motorZustand(z.projekt), ...extra }, melden: async (a) => { melde(`rechne … ${Math.round(a * 100)} %`, 0); await atmen(); } };
}
async function mischungMessen() {
  const nach = await rendern({ ...renderAuftrag(), stems: false });
  melde("messe …", 0); await atmen();
  const mNach = messen(nach.summe, z.rate);
  // vorher: dieselbe Mischung ohne Kanalzüge der Spuren (die Summenkette bleibt)
  const ohne = PR.motorZustand(z.projekt); ohne.spuren = ohne.spuren.map((s) => ({ ...s, kette: s.kette.map((g) => ({ ...g, aus: true })) }));
  const vor = await rendern({ ...renderAuftrag(), zustand: ohne, stems: false });
  const mVor = messen(vor.summe, z.rate);
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
  for (let durchgang = 0; durchgang < 2; durchgang++) {
    const m = await mischungMessen(), d = ziel.lufs - m.lufs;
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
    z.projekt = p; z.daten.clear(); z.gewaehlt = p.spuren[0]?.id ?? null; z.schleife = p.schleife; z.schleifeAn = false; z.messungen = null;
    if (p.spuren.some((s) => s.quelle)) { await kontext(p.rate); for (const s of p.spuren) if (s.quelle) spurNeuRechnen(s); senden(); }
    allesAufbauen();
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
$("bassDazu").onclick = async () => {
  try {
    await kontext(48000);
    const drums = z.projekt.spuren.find((s) => s.quelle && !s.quelle.leiter), stil = stilVon(drums?.quelle.stil ?? $("stil").value);
    const sp = bassErzeugen({ anzahl: drums?.quelle.anzahl ?? Number($("takte").value), bpm: z.projekt.tempo.bpm, seed: Math.max(1, Math.round(Number($("seed").value) || 1)), stil });
    z.gewaehlt = sp.id; z.glied = -1; senden(); allesAufbauen();
    melde(`${sp.name}: ${LINIEN.find((l) => l.key === sp.quelle.linie).name}, ${NOTEN[sp.quelle.grundton]} ${LEITERN[sp.quelle.leiter].name}`, 4000);
  } catch (e) { melde(`Bass: ${e.message}`, 8000); }
};
$("wuerfeln").onclick = () => { $("seed").value = 1 + Math.floor(Math.random() * 99998); };
stileAufbauen();
allesAufbauen();
requestAnimationFrame(anzeigen);
