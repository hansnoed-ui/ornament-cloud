// ornament.lucerne im Composer: Klangsammlung (IndexedDB auf dem Gerät), Import und Analyse, Vorhören, Erzeugen (Studie oder ganzer
// Track), Variation nur des Freigegebenen, Sperren, Makros, Quelle ersetzen, Fassungen vergleichen, Groove-Editor, Metronom.
// «Zur Klangsammlung hinzufügen» verändert keinen Track. «In diesen Track übernehmen» und «Quelle ersetzen» planen den Track mit
// Sperren neu; jede Fassung bleibt in der Liste und lässt sich zurückholen.

import * as K from "./kern/klangsammlung.js";
import * as S from "./kern/sampler.js";
import { taktSek } from "./kern/metrum.js";
import * as LU from "./kern/lucerne.js";
import { wavSpuren } from "../lab/kern/klangwerk.js";

let A = null;   // Schnittstelle zur App (siehe app.js)
const L = {
  sammlung: K.neueSammlung(), verlaufSammlung: [], material: new Map(), laden: new Map(),
  auspraegung: "erinnerung", makros: Object.fromEntries(Object.entries(LU.MAKROS).map(([k, m]) => [k, m.std])), sperren: { abschnitte: [] },
  auswahl: null, fassungen: [], fassung: -1, groove: null, timing: null,
};

// ---------- IndexedDB ----------
const DB = "ornament-klangsammlung";
let dbOffen = null;
function db() {
  dbOffen ??= new Promise((ja, nein) => { const r = indexedDB.open(DB, 1); r.onupgradeneeded = () => { r.result.createObjectStore("dateien"); r.result.createObjectStore("stand"); }; r.onsuccess = () => ja(r.result); r.onerror = () => nein(r.error); });
  return dbOffen;
}
async function idb(store, art, key, wert) {
  const d = await db();
  return new Promise((ja, nein) => { const t = d.transaction(store, art === "get" ? "readonly" : "readwrite").objectStore(store); const r = art === "get" ? t.get(key) : art === "del" ? t.delete(key) : t.put(wert, key); r.onsuccess = () => ja(r.result); r.onerror = () => nein(r.error); });
}
const sammlungSichern = () => idb("stand", "put", "sammlung", L.sammlung).catch((e) => A.melde(`Klangsammlung nicht gespeichert: ${e.message}`, 8000));

/** Sammlung ändern, die vorige für «rückgängig» behalten */
function sammlungSetzen(neu) { L.verlaufSammlung.push(L.sammlung); if (L.verlaufSammlung.length > 30) L.verlaufSammlung.shift(); L.sammlung = neu; sammlungSichern(); aufbauen(); }

/** Audio einer Quelle (aus dem Speicher des Geräts) */
async function materialHolen(id) {
  if (L.material.has(id)) return L.material.get(id);
  if (L.laden.has(id)) return L.laden.get(id);
  const q = L.sammlung.quellen.find((x) => x.id === id);
  if (!q) return null;
  const p = (async () => {
    const bytes = await idb("dateien", "get", q.sha256);
    if (!bytes) return null;
    const m = await dekodieren(bytes);
    L.material.set(id, m);
    return m;
  })();
  L.laden.set(id, p);
  try { return await p; } finally { L.laden.delete(id); }
}
async function dekodieren(bytes) {
  try { const w = wavSpuren(bytes); return { kanaele: w.spuren, rate: w.rate }; }
  catch { await A.kontext(48000); const b = await A.z.ctx.decodeAudioData(bytes.buffer.slice(0)); return { kanaele: Array.from({ length: Math.min(2, b.numberOfChannels) }, (_, c) => b.getChannelData(c).slice()), rate: b.sampleRate }; }
}

// ---------- Import ----------
/** «Zur Klangsammlung hinzufügen»: Dateien nacheinander, nur neue analysieren; kein Track ändert sich */
async function hinzufuegen(dateien, { test = false } = {}) {
  let neu = 0, bekannt = 0;
  for (const [i, f] of [...dateien].entries()) {
    if (f.size > K.GRENZEN.dateiMB * 1048576) { A.melde(`${f.name}: ${Math.round(f.size / 1048576)} MB, grösser als ${K.GRENZEN.dateiMB} MB – bitte kürzen`, 8000); continue; }
    A.melde(`Klangsammlung: ${f.name} (${i + 1}/${dateien.length}) lesen …`, 0); await A.atmen();
    const bytes = new Uint8Array(await f.arrayBuffer()), sha = await A.sha256(bytes), id = K.quelleId(sha);
    if (L.sammlung.quellen.some((q) => q.id === id)) { bekannt++; if (!(await idb("dateien", "get", sha))) await idb("dateien", "put", sha, bytes); continue; }
    let m;
    try { m = await dekodieren(bytes); } catch (e) { A.melde(`${f.name}: nicht lesbar (${e.message})`, 8000); continue; }
    const dauer = m.kanaele[0].length / m.rate;
    if (dauer > K.GRENZEN.quelleSek) { A.melde(`${f.name}: ${Math.round(dauer / 60)} min, länger als ${K.GRENZEN.quelleSek / 60} min – bitte teilen`, 8000); continue; }
    A.melde(`Klangsammlung: ${f.name} analysieren (${Math.round(dauer)} s) …`, 0);
    const an = await A.imWorkerRoh({ art: "analyse", kanaele: m.kanaele, rate: m.rate });
    const istTest = test || /TEST/i.test(f.name);
    const r = K.quelleHinzufuegen(L.sammlung, { name: f.name, sha256: sha, bytes: bytes.length, rate: m.rate, kanaele: m.kanaele.length, dauer: an.dauer, herkunft: istTest ? "test" : "eigen", notiz: istTest ? "Testquelle" : "" }, an);
    await idb("dateien", "put", sha, bytes);
    L.material.set(r.quelle.id, m);
    sammlungSetzen(K.ausschnitteHinzufuegen(r.sammlung, K.ausschnitteVorschlagen(r.quelle, { bpm: aktuellerPlan()?.bpm ?? 88 })));
    neu++;
  }
  A.melde(`Klangsammlung: ${neu} neu analysiert${bekannt ? `, ${bekannt} schon vorhanden (Analyse wiederverwendet)` : ""}. Kein Track wurde verändert.`, 7000);
}

/** eine fehlende Datei zuordnen: gleiche Prüfsumme → gespeichert; andere Datei → als Ersatz für die Quelle (Marker neu vorschlagen) */
async function zuordnen(quelle, f) {
  const bytes = new Uint8Array(await f.arrayBuffer()), sha = await A.sha256(bytes);
  if (sha === quelle.sha256) { await idb("dateien", "put", sha, bytes); L.material.delete(quelle.id); A.melde(`${quelle.name}: Datei gefunden und gespeichert`, 4000); aufbauen(); neuRechnenAlle(); return; }
  if (!confirm(`«${f.name}» ist eine andere Datei als «${quelle.name}». Als neue Quelle hinzufügen und die Rollen von «${quelle.name}» im Track ersetzen (die Zeitbereiche werden neu vorgeschlagen)?`)) return;
  await hinzufuegen([f]);
  const neu = L.sammlung.quellen.at(-1);
  const plan = aktuellerPlan(); if (!plan) return;
  const ersetze = {};
  for (const [rolle, ids] of Object.entries(plan.material)) for (const id of ids) { const a = L.sammlung.ausschnitte.find((x) => x.id === id); if (a?.quelle === quelle.id) { const pr = K.ersetzenPruefen(L.sammlung, a, neu.id, { bpm: plan.bpm }); if (pr.vorschlag) { sammlungSetzen(K.ausschnitteHinzufuegen(L.sammlung, [pr.vorschlag])); (ersetze[rolle] ??= []).push(pr.vorschlag.id); } } }
  await neuPlanen({ ersetze, sperrenExtra: { motiv: true, groove: true, bass: true, tempo: true, tonart: true, material: true }, name: `Ersatz für ${quelle.name}` });
}

// ---------- Planen und Anwenden ----------
const aktuellerPlan = () => A.z.projekt.lucerne ?? null;

async function erzeugen({ studie }) {
  if (!L.sammlung.quellen.length) { A.melde("Zuerst eigene Aufnahmen zur Klangsammlung hinzufügen (unten bei ornament.lucerne).", 7000); return; }
  const seed = Math.max(1, Math.round(Number(A.$("seed").value) || 1));
  const plan = LU.planen({ sammlung: L.sammlung, auspraegung: L.auspraegung, seed, makros: L.makros, sperren: {}, studie, auswahl: L.auswahl ? [...L.auswahl] : null, groove: L.groove, timing: L.timing, bpm: Number(A.$("lucBpm").value) || undefined });
  await anwenden(plan, studie ? "Studie (16 Takte)" : "ganzer Track");
}

/** neu planen mit dem aktuellen Plan als «vorher»: gesperrte Teile bleiben */
async function neuPlanen({ seeds = null, ersetze = null, sperrenExtra = {}, name, makros = L.makros, bpm } = {}) {
  const vorher = aktuellerPlan();
  if (!vorher) { A.melde("Zuerst einen ornament.lucerne-Track oder eine Studie erzeugen.", 5000); return; }
  const sperren = { ...L.sperren, ...sperrenExtra };
  const plan = LU.planen({ sammlung: L.sammlung, auspraegung: L.auspraegung, seed: vorher.seed, seeds: seeds ?? vorher.seeds, makros, sperren, vorher, studie: vorher.studie, auswahl: L.auswahl ? [...L.auswahl] : vorher.auswahl, ersetze: { ...(vorher.ersetze ?? {}), ...(ersetze ?? {}) }, groove: L.groove ?? vorher.groove, timing: L.timing ?? vorher.timing, bpm: bpm ?? vorher.bpm });
  await anwenden(plan, name);
}

/** Variation: neue Startwerte nur für das, was nicht gesperrt ist */
function variation() {
  const v = aktuellerPlan(); if (!v) return erzeugen({ studie: false });
  const seeds = { ...v.seeds };
  for (const k of ["groove", "motiv", "bass", "fragment"]) if (!L.sperren[k]) seeds[k] = (seeds[k] % 99991) + 7919;
  return neuPlanen({ seeds, name: "Variation" });
}

/** mit neuem Material weiterentwickeln: Material neu wählen (aus der Auswahl), alles andere nach den Sperren */
function weiterentwickeln() {
  const v = aktuellerPlan(); if (!v) return;
  return neuPlanen({ seeds: { ...v.seeds, material: (v.seeds.material % 99991) + 104729 }, sperrenExtra: { material: !!L.sperren.material }, name: "neues Material" });
}

async function anwenden(plan, name) {
  const z = A.z;
  await A.kontext(48000);
  if (z.laeuft) await A.spielen();
  // vorige Fassung merken (Vergleich, rückgängig)
  if (z.projekt.lucerne && L.fassung < 0) L.fassungen.push({ name: "vorher", plan: z.projekt.lucerne, zeit: new Date().toISOString() });
  for (const sp of z.projekt.spuren.filter((x) => x.quelle)) { A.post({ art: "weg", id: sp.id }); z.daten.delete(sp.id); }
  z.projekt.spuren = z.projekt.spuren.filter((x) => !x.quelle);
  z.projekt.master.pegel = 0;
  z.projekt.kammerton = plan.kammerton; A.$("kammerton").value = plan.kammerton;
  z.projekt.tempo = { ...z.projekt.tempo, bpm: plan.bpm, beginn: 0, quelle: "stil", aus: "ornament.lucerne" };
  z.projekt.abschnitte = plan.abschnitte.map((a) => ({ ...a }));
  z.projekt.lucerne = plan;
  z.projekt.marker = LU.markerMitZeit(plan);
  z.projekt.quellen = L.sammlung.quellen.filter((q) => Object.values(plan.material).flat().some((id) => L.sammlung.ausschnitte.find((a) => a.id === id)?.quelle === q.id)).map((q) => ({ id: q.id, name: q.name, sha256: q.sha256, dauer: q.dauer, herkunft: q.herkunft }));
  if (!/lucerne/i.test(z.projekt.titel)) z.projekt.titel = `ornament.lucerne · ${LU.AUSPRAEGUNGEN[plan.auspraegung].name}`;
  L.fassungen.push({ name: name ?? "Fassung", plan, zeit: new Date().toISOString() }); L.fassung = -1;
  if (L.fassungen.length > 12) L.fassungen.shift();
  A.melde(`ornament.lucerne: ${plan.spuren.length} Spuren werden gerechnet …`, 0); await A.atmen();
  const laufend = [];
  for (const s of plan.spuren) {
    const sp = A.PR.erzeugteSpurDazu(z.projekt, s.quelle, { name: s.name, typ: s.typ, pegel: s.pegel, pan: s.pan, raum: s.raum, echo: s.echo });
    sp.lucerne = s.key;
    if (s.quelle.erzeuger !== S.SAMPLER) A.spurNeuRechnen(sp);
  }
  // Sampler-Spuren: zuerst die ohne Resampling, dann die zweite Generation
  const sampler = z.projekt.spuren.filter((x) => x.quelle?.erzeuger === S.SAMPLER), res = (sp) => Object.values(sp.quelle.klaenge).some((k) => String(k.quelle).startsWith("res:"));
  for (const sp of sampler.filter((x) => !res(x))) laufend.push(samplerRechnen(sp));
  await Promise.all(laufend);
  for (const sp of sampler.filter(res)) await samplerRechnen(sp);
  const L0 = plan.gesamt * taktSek(plan.bpm);
  z.schleife = { a: 0, b: L0 }; z.schleifeAn = !!plan.studie; z.projekt.schleife = plan.studie ? { a: 0, b: L0 } : null; A.schleifeSenden();
  z.pos = 0; A.post({ art: "stelle", pos: 0 });
  z.gewaehlt = z.projekt.spuren[0]?.id ?? null; z.glied = -1; A.senden(); A.allesAufbauen();
  await A.bisFertig(); A.schnellEinpegeln(plan.studie ? -16 : -14);
  const fehlt = plan.hinweise.length ? ` Hinweise: ${plan.hinweise.join("; ")}.` : "";
  A.melde(`ornament.lucerne · ${LU.AUSPRAEGUNGEN[plan.auspraegung].name}: ${plan.takte} Takte, ${plan.bpm} BPM, ${A.NOTEN[plan.grundton]}-Moll, ${z.projekt.spuren.length} Spuren (${name}).${fehlt}`, 9000);
  aufbauen();
}

/** Material einer Sampler-Spur zuschneiden (nur die gebrauchten Bereiche gehen an den Worker) */
async function samplerRechnen(sp) {
  const z = A.z, q = sp.quelle, mat = new Map(), q2 = structuredClone(q), fehlt = [];
  const bereiche = new Map();
  for (const k of Object.values(q.klaenge)) { const b = bereiche.get(k.quelle) ?? [Infinity, -Infinity]; bereiche.set(k.quelle, [Math.min(b[0], k.von), Math.max(b[1], k.bis)]); }
  for (const [id, [von, bis]] of bereiche) {
    let m;
    if (String(id).startsWith("res:")) {
      const plan = z.projekt.lucerne, r = plan?.resampling.find((x) => x.id === id), quelleSp = z.projekt.spuren.find((x) => x.lucerne === r?.spur);
      const roh = quelleSp && z.daten.get(quelleSp.id)?.roh;
      if (roh) m = { kanaele: roh.map((s) => s.slice(Math.round(r.von * z.rate), Math.round(r.bis * z.rate))), rate: z.rate };
    } else m = await materialHolen(id);
    if (!m) { fehlt.push(id); continue; }
    const a = Math.max(0, Math.floor(von * m.rate) - 16), b = Math.min(m.kanaele[0].length, Math.ceil(bis * m.rate) + 16);
    mat.set(id, { kanaele: m.kanaele.map((s) => s.slice(a, b)), rate: m.rate });
    for (const k of Object.values(q2.klaenge)) if (k.quelle === id) { k.von -= a / m.rate; k.bis -= a / m.rate; }
  }
  if (fehlt.length) A.melde(`${sp.name}: Material fehlt (${fehlt.map((id) => L.sammlung.quellen.find((x) => x.id === id)?.name ?? id).join(", ")}). In der Klangsammlung die Datei zuordnen.`, 9000);
  A.zeigeRechnen(sp.id, true);
  try { const k = await A.imWorker(q2, { material: mat }); if (z.projekt.spuren.includes(sp)) { A.spurSenden(sp, k); A.zeichnen(); } }
  catch (e) { A.melde(`${sp.name}: ${e.message}`, 8000); }
  finally { A.zeigeRechnen(sp.id, false); }
}
function neuRechnenAlle() { for (const sp of A.z.projekt.spuren.filter((x) => x.quelle?.erzeuger === S.SAMPLER)) samplerRechnen(sp); }

// ---------- Vorhören (lautheitsgleich) ----------
let vorhoerQuelle = null;
async function vorhoeren(kanaele, rate) {
  await A.kontext(48000); await A.tonWecken();   // nie direkt resume(): nach Sperre oder Unterbrechung baut tonWecken den Kontext neu
  const ctx = A.z.ctx, k = S.bearbeiten(kanaele, rate, [{ art: "normal", db: -20 }]), b = ctx.createBuffer(2, k[0].length, rate);
  b.copyToChannel(k[0], 0); b.copyToChannel(k[1] ?? k[0], 1);
  vorhoerQuelle?.stop();
  const s = ctx.createBufferSource(); s.buffer = b; s.connect(ctx.destination); s.start(); vorhoerQuelle = s;
}
async function ausschnittHoeren(a, bearbeitet) {
  const m = await materialHolen(a.quelle);
  if (!m) { A.melde("Audio dieser Quelle fehlt auf dem Gerät: Datei zuordnen.", 6000); return; }
  const rate = A.z.rate || 48000;
  let k = S.ausschnitt(m, a.von, a.bis, rate);
  if (bearbeitet) {
    const plan = aktuellerPlan(), kl = plan?.spuren.flatMap((s) => Object.values(s.quelle.klaenge ?? {})).find((x) => x.ausschnitt === a.id);
    k = S.bearbeiten(k, rate, [...((kl?.cent ?? a.stimmung) ? [{ art: "band", cent: kl?.cent ?? a.stimmung }] : []), ...(kl?.schritte ?? a.schritte ?? []), { art: "waerme", menge: L.makros.waerme }, { art: "instabil", menge: L.makros.instabilitaet, seed: 3 }]);
  }
  vorhoeren(k, rate);
}

// ---------- Metronom (nur Vorschau, nie im Export) ----------
function metronom() {
  const z = A.z, da = z.projekt.spuren.find((x) => x.nurVorschau);
  if (da) { A.post({ art: "weg", id: da.id }); z.daten.delete(da.id); z.projekt.spuren = z.projekt.spuren.filter((x) => x !== da); A.senden(); A.allesAufbauen(); return; }
  const plan = aktuellerPlan(), bpm = plan?.bpm ?? z.projekt.tempo.bpm, anzahl = plan?.gesamt ?? 8;
  const q = { art: "erzeugt", erzeuger: "drums@0.1.0", stimme: "rim", variante: "Clave", werte: {}, takte: ["x! . . . o . . . o . . . o . . ."], anzahl, bpm, swing: 0, menschlich: 0, versatz: 0, seed: 1 };
  const sp = A.PR.erzeugteSpurDazu(z.projekt, q, { name: "Metronom (nur Vorschau)", typ: "rest", pegel: -12 });
  sp.nurVorschau = true; A.spurNeuRechnen(sp); A.senden(); A.allesAufbauen();
}

// ---------- Oberfläche ----------
const el = (...a) => A.el(...a);
function knopf(text, titel, klick, cls = "knopf klein") { const b = el("button", { className: cls, textContent: text, title: titel ?? "" }); b.onclick = () => Promise.resolve(klick()).catch((e) => A.melde(`ornament.lucerne: ${e.message}`, 9000)); return b; }

function aufbauen() {
  const box = A.$("lucerne"); if (!box) return;
  box.innerHTML = "";
  const plan = aktuellerPlan();
  box.append(el("h2", { textContent: "ornament.lucerne" }), el("p", { className: "leise-text", textContent: "Eigene Aufnahmen als Klangquelle: Motiv, Akkordschatten, Texturen, Fragmente und Akzente aus deiner Klangsammlung, dazu gebrochener Groove und Bass. Profil ornament.lucerne, Schema 0.1.0." }));
  // Erzeugen
  const aus = el("select", { id: "lucAuspraegung" }, ...Object.entries(LU.AUSPRAEGUNGEN).map(([k, a]) => el("option", { value: k, textContent: `${a.name} · ${a.bpm} BPM${a.fertig ? "" : " (noch nicht ausgearbeitet)"}`, selected: k === L.auspraegung })));
  aus.onchange = () => { L.auspraegung = aus.value; A.$("lucBpm").value = LU.AUSPRAEGUNGEN[aus.value].bpm; };
  const bpm = el("input", { type: "number", id: "lucBpm", min: 40, max: 200, step: 1, value: plan?.bpm ?? LU.AUSPRAEGUNGEN[L.auspraegung].bpm, title: "Tempo; ändert man es bei einem bestehenden Track, werden alle taktgebundenen Ereignisse neu berechnet (freie Atmosphären bleiben in Sekunden)" });
  bpm.onchange = () => { if (plan && !L.sperren.tempo) neuPlanen({ bpm: Number(bpm.value), name: `Tempo ${bpm.value}`, sperrenExtra: { motiv: true, groove: true, bass: true, material: true, tonart: true } }); };
  box.append(el("div", { className: "bass-zeile" }, el("label", { className: "feld" }, "Ausprägung ", aus), el("label", { className: "feld" }, "Tempo ", bpm),
    knopf("Studie (16 Takte)", "Motiv, Groove und Material zusammen, als Schleife", () => erzeugen({ studie: true }), "knopf"),
    knopf("ganzer Track (88 Takte)", "Auftauchen, Erster Gedanke, Vertiefung, Freistellung, Verwandlung, Wiederkehr, Nachbild", () => erzeugen({ studie: false }), "knopf voll"),
    knopf("Metronom", "Prüf- und Einspielhilfe; nie im Export", metronom, "knopf klein leise")));
  // Makros
  const makros = el("div", { className: "luc-makros" });
  for (const [k, m] of Object.entries(LU.MAKROS)) {
    const wert = el("b", { textContent: L.makros[k] }), r = el("input", { type: "range", min: 0, max: 100, step: 1, value: L.makros[k], title: m.wirkung, "aria-label": m.name });
    r.oninput = () => { wert.textContent = r.value; }; r.onchange = () => { L.makros[k] = Number(r.value); if (aktuellerPlan()) neuPlanen({ name: `${m.name} ${r.value}`, sperrenExtra: { motiv: true, groove: true, bass: true, material: true, tempo: true, tonart: true } }); };
    makros.append(el("label", { className: "luc-makro", title: m.wirkung }, el("span", { textContent: m.name }), r, wert));
  }
  box.append(makros);
  // Sperren und Variation
  const sperr = el("div", { className: "bass-zeile" }, el("span", { className: "feld", textContent: "sperren:" }));
  for (const k of LU.SPERRBAR) { const c = el("input", { type: "checkbox", checked: !!L.sperren[k] }); c.onchange = () => { L.sperren[k] = c.checked; }; sperr.append(el("label", { className: "feld klein" }, c, ` ${{ motiv: "Motiv", groove: "Groove", bass: "Bass", tempo: "Tempo", tonart: "Tonart", material: "Samples" }[k]}`)); }
  const abSel = el("span", { className: "feld klein" }, "Abschnitte:");
  for (const typ of Object.keys(LU.NAMEN)) { const c = el("input", { type: "checkbox", checked: L.sperren.abschnitte.includes(typ) }); c.onchange = () => { L.sperren.abschnitte = c.checked ? [...L.sperren.abschnitte, typ] : L.sperren.abschnitte.filter((x) => x !== typ); }; abSel.append(el("label", { className: "feld klein" }, c, ` ${LU.NAMEN[typ]}`)); }
  box.append(sperr, el("div", { className: "bass-zeile" }, abSel),
    el("div", { className: "bass-zeile" }, knopf("Variation", "neue Startwerte nur für das, was nicht gesperrt ist", variation), knopf("mit neuem Material weiterentwickeln", "Material neu aus der Auswahl wählen; Gesperrtes bleibt", weiterentwickeln),
      fassungenWahl(), knopf("rückgängig", "die vorige Fassung wiederherstellen", () => { const f = L.fassungen.at(-2); if (f) { L.fassungen.pop(); return anwenden(f.plan, `zurück: ${f.name}`).then(() => L.fassungen.pop()); } })));
  // Quelle ersetzen
  if (plan) box.append(ersetzenZeile(plan));
  box.append(grooveEditor());
  box.append(sammlungAnsicht());
  if (plan) box.append(planAnsicht(plan));
}

function fassungenWahl() {
  const sel = el("select", { "aria-label": "Fassungen vergleichen", title: "frühere Fassungen dieses Tracks (A/B): wählen rechnet sie wieder" }, el("option", { value: "", textContent: `Fassungen (${L.fassungen.length})` }), ...L.fassungen.map((f, i) => el("option", { value: i, textContent: `${i + 1}. ${f.name} · ${f.zeit.slice(11, 19)}` })));
  sel.onchange = () => { const f = L.fassungen[Number(sel.value)]; if (f) { L.fassung = Number(sel.value); anwenden(f.plan, `Vergleich: ${f.name}`).then(() => { L.fassungen.pop(); L.fassung = -1; }); } };
  return sel;
}

function ersetzenZeile(plan) {
  const rolle = el("select", { "aria-label": "Rolle" }, ...Object.entries(K.ROLLEN).filter(([k]) => plan.material[k]?.length || k === "counter_motif").map(([k, r]) => el("option", { value: k, textContent: r.name })));
  const quelle = el("select", { "aria-label": "neue Quelle" }, ...L.sammlung.quellen.map((q) => el("option", { value: q.id, textContent: `${q.name}${q.test ? " (TEST)" : ""}` })));
  const ausgabe = el("div", { className: "hinweis" });
  let vorschlag = null;
  const pruefen = knopf("prüfen", "neue Dauer, Grundton, Transienten, neue Marker", () => {
    const alt = L.sammlung.ausschnitte.find((a) => a.id === plan.material[rolle.value]?.[0]) ?? { rolle: rolle.value, von: 0, bis: 2, art: "oneshot" };
    const pr = K.ersetzenPruefen(L.sammlung, alt, quelle.value, { bpm: plan.bpm }); vorschlag = pr.vorschlag;
    ausgabe.innerHTML = ""; ausgabe.append(el("ul", {}, ...pr.pruefung.map((t) => el("li", { textContent: t }))));
    if (vorschlag) ausgabe.append(el("span", { textContent: `Vorschlag: ${vorschlag.von}–${vorschlag.bis} s ` }), knopf("anhören", "", () => ausschnittHoeren(vorschlag, false), "mini"), knopf("übernehmen", "Rolle neu besetzen; Motiv, Groove, Bass, Tempo, Tonart und andere Rollen bleiben; die vorige Fassung bleibt in der Liste", async () => {
      sammlungSetzen(K.ausschnitteHinzufuegen(L.sammlung, [vorschlag]));
      await neuPlanen({ ersetze: { [rolle.value]: [vorschlag.id] }, sperrenExtra: { motiv: true, groove: true, bass: true, tempo: true, tonart: true, material: true }, name: `${K.ROLLEN[rolle.value].name} ersetzt` });
    }, "mini"));
  });
  return el("details", { className: "luc-teil" }, el("summary", { textContent: "Quelle ersetzen (je Rolle) · in diesen Track übernehmen" }),
    el("div", { className: "bass-zeile" }, el("label", { className: "feld" }, "Rolle ", rolle), el("label", { className: "feld" }, "durch ", quelle), pruefen), ausgabe,
    el("p", { className: "leise-text", textContent: "Motiv, Noten, Taktpositionen, Abschnitte und Startwert bleiben. Alte Schnittmarken werden nicht übertragen, sondern für die neue Datei neu vorgeschlagen. Eine ganze Phrase zu tauschen braucht eine eigene Tempo-/Längenprüfung (steht in der Prüfung)." }));
}

function grooveEditor() {
  const g = structuredClone(L.groove ?? { A: LU.GROOVE.A, B: LU.GROOVE.B }), ti = structuredClone(L.timing ?? LU.TIMING);
  const stimmen = ["kick", "snare", "ghost", "hat", "offen"], NAME = { kick: "Kick", snare: "Snare", ghost: "Ghost", hat: "Hi-Hat", offen: "offen" };
  const raster = el("div", { className: "luc-raster", role: "grid", "aria-label": "Zweitaktgroove, Schritte 1–16" });
  raster.append(el("span", {}), ...["A", "B"].flatMap((t) => Array.from({ length: 16 }, (_, i) => el("span", { className: `luc-kopf${i % 4 === 0 ? " zaehl" : ""}`, textContent: i % 4 === 0 ? `${t}${i + 1}` : i + 1 }))));
  const FORMEN = ["", "!", "_"];
  for (const k of stimmen) {
    raster.append(el("span", { className: "luc-name", textContent: NAME[k] }));
    for (const t of ["A", "B"]) for (let s = 1; s <= 16; s++) {
      const finde = () => (g[t][k] ?? []).find((x) => Number(String(x).replace(/[!_]/, "")) === s);
      const zelle = el("button", { className: `luc-zelle${(s - 1) % 4 === 0 ? " zaehl" : ""}`, title: `${NAME[k]}, Takt ${t}, Schritt ${s} (Zählzeit ${Math.floor((s - 1) / 4) + 1}${(s - 1) % 4 ? `, ${["", "e", "und", "e"][(s - 1) % 4]}` : ""}). Antippen: an → betont → leise → aus` });
      const zeigen = () => { const x = finde(); zelle.textContent = x == null ? "" : String(x).endsWith("!") ? "●" : String(x).endsWith("_") ? "·" : "○"; zelle.setAttribute("aria-pressed", String(x != null)); };
      zelle.onclick = () => {
        const liste = g[t][k] ?? (g[t][k] = []), x = finde(), i = liste.indexOf(x);
        if (x == null) liste.push(s); else { const f = FORMEN.indexOf(String(x).replace(/^\d+/, "")); if (f === 2) liste.splice(i, 1); else liste[i] = `${s}${FORMEN[f + 1]}`; }
        liste.sort((a, b) => parseInt(a) - parseInt(b)); zeigen();
      };
      zeigen(); raster.append(zelle);
    }
  }
  const timing = el("div", { className: "bass-zeile" });
  for (const k of [...stimmen, "motiv", "gegen", "fragment"]) {
    const [sw, vers] = ti[k];
    const swing = el("input", { type: "number", min: 50, max: 66, step: 1, value: Math.round(50 + sw * 50), title: "Swing als Verhältnis eines Sechzehntelpaars (50 = gerade, 55 = 55:45, 58 = 58:42)" });
    const v = el("input", { type: "number", min: -20, max: 20, step: 1, value: vers, title: "Mikroverschiebung in ms (positiv = später)" });
    swing.onchange = () => { ti[k][0] = (Number(swing.value) - 50) / 50; }; v.onchange = () => { ti[k][1] = Number(v.value); };
    timing.append(el("label", { className: "feld klein" }, `${NAME[k] ?? { motiv: "Motiv", gegen: "Gegenmotiv", fragment: "Fragmente" }[k]} `, swing, ":", el("span", { textContent: "" }), " ", v, " ms"));
  }
  return el("details", { className: "luc-teil" }, el("summary", { textContent: "Groove (Zweitakter, Schritte 1–16; 1, 5, 9, 13 = Zählzeiten), Swing und Mikroverschiebung je Rolle" }), raster, timing,
    el("div", { className: "bass-zeile" }, knopf("Groove anwenden", "plant den Track mit diesem Groove neu; Motiv, Bass, Material, Tempo und Tonart bleiben", () => { L.groove = { A: g.A, B: g.B }; L.timing = ti; return neuPlanen({ name: "Groove geändert", sperrenExtra: { motiv: true, bass: true, material: true, tempo: true, tonart: true } }); }),
      knopf("Ausgangsgroove", "Kick 1, 7, 9 | 1, 8, 11 – Snare 5, 13 – Hi-Hat Achtel – offene Hi-Hat B15 – Ghost A12, B16", () => { L.groove = null; L.timing = null; aufbauen(); }, "knopf klein leise")),
    el("p", { className: "leise-text", textContent: "Der Groove gilt für Erster Gedanke, Vertiefung und Wiederkehr; Wendungen alle vier Takte und Fills alle acht Takte kommen aus dem Startwert dazu. Intern zählen Schritte ab 0 (Schritt 1 = 0)." }));
}

function sammlungAnsicht() {
  const s = L.sammlung, datei = el("input", { type: "file", accept: "audio/*,.wav,.flac,.aif,.aiff,.mp3", multiple: true, hidden: true });
  datei.onchange = () => { hinzufuegen(datei.files); datei.value = ""; };
  const json = el("input", { type: "file", accept: ".json,application/json", hidden: true });
  json.onchange = async () => { const f = json.files[0]; json.value = ""; if (!f) return; const neu = JSON.parse(await f.text()); if (neu.format !== K.SAMMLUNG_FORMAT) { A.melde("keine Klangsammlung", 5000); return; } let x = L.sammlung; for (const q of neu.quellen) x = K.quelleHinzufuegen(x, q, q.analyse).sammlung; sammlungSetzen(K.ausschnitteHinzufuegen(x, neu.ausschnitte)); A.melde(`Sammlung eingelesen: ${neu.quellen.length} Quellen, ${neu.ausschnitte.length} Ausschnitte. Fehlende Audiodateien unten zuordnen.`, 8000); };
  const sek = s.quellen.reduce((a, q) => a + (q.dauer ?? 0), 0);
  const kopf = el("div", { className: "bass-zeile" },
    el("label", { className: "knopf voll", title: "analysiert nur neue Dateien; kein Track wird verändert" }, datei, "Zur Klangsammlung hinzufügen"),
    knopf("Sammlung sichern (JSON)", "Quellen, Analysen und Ausschnitte (ohne Audio)", () => A.herunterladen(new Blob([JSON.stringify(s, null, 1)], { type: "application/json" }), "klangsammlung.json"), "knopf klein leise"),
    el("label", { className: "knopf klein leise" }, json, "Sammlung einlesen"),
    knopf("rückgängig", "die letzte Änderung der Sammlung zurücknehmen", () => { const v = L.verlaufSammlung.pop(); if (v) { L.sammlung = v; sammlungSichern(); aufbauen(); } }, "knopf klein leise"),
    el("span", { className: "leise-text", textContent: `${s.quellen.length} Quellen, ${Math.round(sek)} s, im Speicher etwa ${Math.round(K.speicherMB(sek))} MB (Grenze etwa ${K.GRENZEN.speicherMB} MB; je Datei höchstens ${K.GRENZEN.dateiMB} MB und ${K.GRENZEN.quelleSek / 60} min). Die Dateien bleiben auf diesem Gerät.` }));
  const liste = el("div", { className: "luc-quellen" });
  for (const q of s.quellen) {
    const an = q.analyse ?? {}, aktiv = !L.auswahl || L.auswahl.has(q.id);
    const wahl = el("input", { type: "checkbox", checked: aktiv, title: "für neue Tracks und «mit neuem Material weiterentwickeln» verwenden" });
    wahl.onchange = () => { L.auswahl ??= new Set(s.quellen.map((x) => x.id)); wahl.checked ? L.auswahl.add(q.id) : L.auswahl.delete(q.id); };
    const zu = el("input", { type: "file", accept: "audio/*,.wav", hidden: true }); zu.onchange = () => { const f = zu.files[0]; zu.value = ""; if (f) zuordnen(q, f); };
    const status = el("span", { className: "leise-text", textContent: "…" });
    idb("dateien", "get", q.sha256).then((b) => { status.textContent = b ? "Audio auf dem Gerät" : "Audio fehlt"; status.classList.toggle("warn", !b); }).catch(() => {});
    const cuts = s.ausschnitte.filter((a) => a.quelle === q.id);
    const tabelle = el("div", { className: "luc-cuts" }, ...cuts.map((a) => ausschnittZeile(a)));
    liste.append(el("details", { className: "luc-quelle" }, el("summary", {}, wahl, ` ${q.name} `, el("code", { textContent: q.id }), q.test ? el("b", { className: "warn", textContent: " TESTQUELLE" }) : "",
      el("span", { className: "leise-text", textContent: ` · ${Math.round(q.dauer)} s · ${q.rate / 1000} kHz · ${q.kanaele} Kan. · Tempo ≈ ${an.tempo?.bpm ?? "–"} (Sicherheit ${an.tempo?.sicherheit ?? "–"}) · ${an.tonarten?.map((t) => t.name).join(" / ") ?? ""} · ` }), status),
      el("div", { className: "bass-zeile" }, el("label", { className: "knopf klein leise" }, zu, "Datei zuordnen / Ersatz"), el("span", { className: "leise-text", textContent: `${an.einsaetze?.length ?? 0} Einsätze, Spitze ${an.spitzeDb} dBFS, Mittel ${an.mittelDb} dB, Pausen ${an.pausen?.map((p) => `${p.von}–${p.bis}`).join(", ") || "keine"}` })),
      el("p", { className: "leise-text", textContent: `Bereiche: ${(an.bereiche ?? []).map((b) => `${b.von}–${b.bis} s ${b.art}${b.tonhoehe?.note ? ` (${b.tonhoehe.note}${b.tonhoehe.mehrstimmig ? ", mehrstimmig" : ""})` : ""}`).join(" · ")}` }), tabelle));
  }
  return el("details", { className: "luc-teil", open: !s.quellen.length || undefined }, el("summary", { textContent: `Klangsammlung (${s.quellen.length} Quellen, ${s.ausschnitte.length} Ausschnitte)` }), kopf, liste);
}

function ausschnittZeile(a) {
  const rolle = el("select", { "aria-label": "Rolle" }, ...Object.entries(K.ROLLEN).map(([k, r]) => el("option", { value: k, textContent: r.name, selected: k === a.rolle })));
  const aendern = (f) => sammlungSetzen({ ...L.sammlung, ausschnitte: L.sammlung.ausschnitte.map((x) => (x.id === a.id ? f({ ...x }) : x)) });
  rolle.onchange = () => aendern((x) => ({ ...x, rolle: rolle.value, rollen: [rolle.value] }));
  const zahlfeld = (key, titel, schritt = 0.01) => { const i = el("input", { type: "number", step: schritt, value: a[key] ?? "", title: titel, style: "width:7ch" }); i.onchange = () => aendern((x) => ({ ...x, [key]: Number(i.value) })); return i; };
  const ton = el("input", { type: "number", min: 0, max: 127, step: 1, value: a.tonhoehe?.midi != null ? Math.round(a.tonhoehe.midi) : "", title: "Grundton als MIDI-Notennummer (60 = C4); leer = unbestimmt. Mehrstimmige Ausschnitte nur als Vorschlag.", style: "width:6ch" });
  ton.onchange = () => aendern((x) => ({ ...x, tonhoehe: ton.value === "" ? null : { ...(x.tonhoehe ?? {}), midi: Number(ton.value), note: K.notenName(Number(ton.value)), manuell: true } }));
  const nicht = el("input", { type: "checkbox", checked: !!a.aus, title: "nicht verwenden" }); nicht.onchange = () => aendern((x) => ({ ...x, aus: nicht.checked }));
  return el("div", { className: "luc-cut" + (a.aus ? " aus" : "") }, rolle, el("span", { className: "luc-cut-name", textContent: a.name ?? a.art, title: a.grund ?? "" }),
    zahlfeld("von", "Start in der Originaldatei (s)"), "–", zahlfeld("bis", "Ende in der Originaldatei (s)"), " s ", ton, a.tonhoehe?.note ? el("span", { className: "leise-text", textContent: `${a.tonhoehe.note}${a.tonhoehe.mehrstimmig ? " mehrst." : ""}` }) : "",
    knopf("▶ Original", "der Ausschnitt unverändert (lautheitsgleich)", () => ausschnittHoeren(a, false), "mini"), knopf("▶ bearbeitet", "so wie im Track verwendet, mit Wärme und Instabilität (lautheitsgleich)", () => ausschnittHoeren(a, true), "mini"),
    el("label", { className: "feld klein" }, nicht, " aus"), el("span", { className: "leise-text", textContent: a.grund ?? "" }));
}

function planAnsicht(plan) {
  const T = taktSek(plan.bpm), cut = (id) => L.sammlung.ausschnitte.find((a) => a.id === id), qn = (id) => L.sammlung.quellen.find((q) => q.id === id)?.name ?? id;
  const zeilen = Object.entries(plan.material).flatMap(([rolle, ids]) => ids.map((id) => { const a = cut(id); return el("li", { textContent: `${K.ROLLEN[rolle]?.name ?? rolle}: ${qn(a?.quelle)} ${a?.von}–${a?.bis} s · ${a?.name ?? ""}` }); }));
  return el("details", { className: "luc-teil" }, el("summary", { textContent: `Plan: ${plan.abschnitte.map((a) => `${a.name} T${a.von + 1}–${a.bis}`).join(" · ")}` }),
    el("p", { className: "leise-text", textContent: `Startwerte ${JSON.stringify(plan.seeds)} · Makros ${Object.entries(plan.makros).map(([k, v]) => `${LU.MAKROS[k].name} ${v}`).join(", ")} · Tonart ${A.NOTEN[plan.grundton]}-Moll (${plan.tonartGrund}) · Kammerton ${plan.kammerton} Hz` }),
    el("ul", {}, ...zeilen),
    el("p", { className: "leise-text", textContent: `Zeitmarken (${plan.marker.length}): ${plan.marker.filter((m) => ["abschnitt", "bruch", "resampling"].includes(m.art)).map((m) => `${m.text} ${Math.round(m.takt * T)} s`).join(" · ")}` }),
    ...plan.hinweise.map((h) => el("p", { className: "hinweis warn", textContent: h })));
}

/** Klang-Ansicht einer Sampler-Spur: Quelle, Ausschnitt, Bearbeitung, Vorhören, Grundton, Start-/Endpunkt */
export function klangPanel(box, sp, wahl) {
  const q = sp.quelle;
  box.append(el("div", { className: "plugin-kopf" }, el("h2", { textContent: `${sp.name}: Sampler 0.1.0` }), wahl,
    el("span", { className: "leise-text", textContent: `${K.ROLLEN[q.rolle]?.name ?? q.rolle} · ${q.ereignisse.length} Ereignisse · ${q.frei ? "freie Zeit (Sekunden)" : `taktgebunden, Swing ${Math.round(50 + (q.swing ?? 0) * 50)}:${Math.round(50 - (q.swing ?? 0) * 50)}`}` })));
  for (const [key, kl] of Object.entries(q.klaenge)) {
    const quelle = L.sammlung.quellen.find((x) => x.id === kl.quelle);
    const von = el("input", { type: "number", step: 0.01, value: kl.von, style: "width:8ch", title: "Startpunkt in der Quelle (s)" }), bis = el("input", { type: "number", step: 0.01, value: kl.bis, style: "width:8ch", title: "Endpunkt in der Quelle (s)" });
    const grund = el("input", { type: "number", step: 1, value: kl.grundMidi ?? "", style: "width:6ch", title: "Grundton (MIDI-Notennummer), Korrektur" });
    const modus = el("select", { title: "Band: Tonhöhe und Tempo gemeinsam; Zeitdehnung: getrennt (WSOLA)" }, ...Object.entries(S.MODI).map(([k, m]) => el("option", { value: k, textContent: m.name, selected: kl.modus === k })));
    const anwenden = () => { kl.von = Number(von.value); kl.bis = Number(bis.value); kl.grundMidi = grund.value === "" ? null : Number(grund.value); kl.modus = modus.value; samplerRechnen(sp); };
    for (const x of [von, bis, grund, modus]) x.onchange = anwenden;
    box.append(el("div", { className: "klang-zeile" }, el("b", { textContent: kl.name ?? key }),
      el("span", { className: "leise-text", textContent: ` ${quelle?.name ?? (String(kl.quelle).startsWith("res:") ? "Resampling (gerechnet)" : `fehlt: ${kl.quelle}`)} ` }), von, "–", bis, " s · Grundton ", grund, " ", modus,
      knopf("▶", "diesen Klang mit seiner Bearbeitung, lautheitsgleich", async () => { const m = String(kl.quelle).startsWith("res:") ? null : await materialHolen(kl.quelle); if (!m) return A.melde("Material fehlt", 4000); const rate = A.z.rate || 48000; vorhoeren(S.bearbeiten(S.ausschnitt(m, kl.von, kl.bis, rate), rate, [...(kl.cent ? [{ art: "band", cent: kl.cent }] : []), ...kl.schritte]), rate); }, "mini"),
      el("span", { className: "leise-text", textContent: ` Bearbeitung: ${[kl.cent ? `Stimmung ${kl.cent > 0 ? "+" : ""}${kl.cent} Cent` : null, ...kl.schritte.map((s) => s.art)].filter(Boolean).join(" → ") || "keine"}` })));
  }
  box.append(el("p", { className: "leise-text", textContent: `Nach der Spur: ${(q.nach ?? []).map((s) => `${s.art}${s.menge != null ? ` ${s.menge}` : ""}${s.gemeinsam ? " (gemeinsam)" : ""}`).join(", ") || "nichts"}. Ereignisse speichern Takt, Schritt und Dauer; Swing und Mikroverschiebung kommen beim Rechnen genau einmal dazu.` }));
}

export const istSampler = (sp) => sp?.quelle?.erzeuger === S.SAMPLER;
export { samplerRechnen };

export async function lucerneEinbauen(api) {
  A = api;
  // Vorhören hält an, wenn die Seite verschwindet (Sperre, Tab gewechselt), wie die Wiedergabe des Motors
  const vorhoerenAus = () => { try { vorhoerQuelle?.stop(); } catch { /* schon beendet */ } vorhoerQuelle = null; };
  document.addEventListener("visibilitychange", () => { if (document.hidden) vorhoerenAus(); });
  addEventListener("pagehide", vorhoerenAus);
  try { const s = await idb("stand", "get", "sammlung"); if (s?.format === K.SAMMLUNG_FORMAT) L.sammlung = s; } catch (e) { A.melde(`Klangsammlung: Speicher nicht verfügbar (${e.message}); sie gilt nur bis zum Neuladen.`, 8000); }
  aufbauen();
  return { erzeugen, aufbauen };
}
