// ORNAMENT LAB (alpha/lab/): Kern, Operationen, Projektformat und Archiv ohne Browser.
//   node --test tests/lab.test.mjs
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";

const root = new URL("../", import.meta.url);
const lab = (p) => import(new URL(`alpha/lab/${p}`, root).href);
const { labRegister, OPERATIONEN } = await lab("operationen/index.js");
const { pruefeOperation, standardParameter, bereinigeParameter } = await lab("kern/register.js");
const { kompatibel, TYPEN, KLANGFORMEN } = await lab("kern/typen.js");
const M = await lab("kern/modulation.js");
const P = await lab("kern/projekt.js");
const { fuehreAus, bildfolge, regelVorschlaege, experiment, ketteAnwenden } = await lab("kern/ausfuehrung.js");
const { packe, entpacke } = await lab("kern/archiv.js");
const { fingerabdruck, neuesBild } = await lab("kern/bilddaten.js");
const K = await lab("kern/komposition.js");
const KL = await lab("kern/klang.js");
const ST = await lab("kern/stationen.js");

/** synthetisches Bild: Verlauf mit Scheibe und Balken */
function bild(w = 96, h = 72) {
  const b = neuesBild(w, h);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const i = (y * w + x) * 4, scheibe = (x - 40) ** 2 + (y - 36) ** 2 < 400, balken = x > 64 && x < 80;
    b.data[i] = scheibe ? 220 : balken ? 30 : (x / w) * 255; b.data[i + 1] = scheibe ? 60 : balken ? 40 : (y / h) * 200; b.data[i + 2] = scheibe ? 40 : balken ? 160 : 120; b.data[i + 3] = 255;
  }
  return b;
}

/** Medienspeicher im Arbeitsspeicher (der Browser legt PNG ab, hier rohe Pixel) */
function speicher() {
  const bilder = new Map(), toene = new Map(), dateien = new Map();
  return {
    bilder, toene, dateien,
    async bild(e) { const b = bilder.get(e.id); if (!b) throw new Error(`Bild ${e.id} fehlt`); return b; },
    async ton(e) { const t = toene.get(e.id); if (!t) throw new Error(`Ton ${e.id} fehlt`); return t; },
    async ablegen(e, b) { bilder.set(e.id, b); const datei = `medien/${e.id}.rgba`; dateien.set(datei, new Uint8Array(b.data.buffer.slice(0))); return { datei, mime: "application/x-rgba", breite: b.width, hoehe: b.height }; },
    async ablegenDaten(e, d) { const datei = `medien/${e.id}.json`; dateien.set(datei, new TextEncoder().encode(JSON.stringify(d))); return { datei, mime: "application/json" }; },
    async ablegenKlang(e, t) { toene.set(e.id, t); const datei = `medien/${e.id}.wav`; dateien.set(datei, KL.wavBytes(t.pcm, t.rate)); return { datei, mime: "audio/wav" }; },
  };
}
function mitMaterial() {
  const p = P.neuesProjekt({ titel: "Test" }), m = speicher();
  const e = P.fuegeMaterialHinzu(p, { titel: "bild.png", datei: "medien/m.rgba", breite: 96, hoehe: 72, mime: "image/png", sha256: "x" });
  m.bilder.set(e.id, bild());
  return { p, m, e, r: labRegister() };
}

test("Register: alle Operationen sind vollständig beschrieben, Kennungen eindeutig", () => {
  const r = labRegister();
  assert.equal(r.alle().length, OPERATIONEN.length);
  for (const op of r.alle()) {
    pruefeOperation(op);
    for (const k of ["herkunft", "ressourcen", "voraussetzungen", "reproduzierbar", "beschreibung"]) assert.ok(op[k] !== undefined, `${op.id}: ${k}`);
  }
  assert.throws(() => r.registriere(OPERATIONEN[0]), /schon registriert/);
  assert.throws(() => pruefeOperation({ id: "x" }), /fehlt/);
});

test("Typen: nur passende Verbindungen; Weiterverarbeitung nach Typ", () => {
  const r = labRegister();
  assert.ok(kompatibel("IMAGE", "IMAGE"));
  assert.ok(!kompatibel("CONTROL_SIGNAL", "IMAGE"));
  assert.ok(!kompatibel("IMAGE", "AUDIO"));
  const fuerBild = r.fuer("IMAGE").map((o) => o.id);
  assert.ok(fuerBild.includes("lab.feedback") && fuerBild.includes("fictory.prozess"));
  assert.ok(!fuerBild.includes("orna.konstellation"));
  assert.deepEqual(r.fuer("CONTROL_SIGNAL"), []);
});

test("Parameter: bereinigt und begrenzt (harte Ressourcengrenzen)", () => {
  const op = labRegister().hole("lab.feedback");
  const p = bereinigeParameter(op, { iterationen: 100000, zoom: "abc", mischart: "falsch" });
  assert.equal(p.iterationen, 120);
  assert.equal(p.zoom, 1.04);
  assert.equal(p.mischart, "mischen");
});

test("Modulation: Quellen im Bereich −1…1, Attenuverter, Steuersignal, Grenzen des Parameters", () => {
  for (const q of ["sinus", "dreieck", "saege", "zufall"]) for (let u = 0; u <= 1; u += 0.05) { const v = M.wert({ quelle: q, frequenz: 1.5, seed: 7 }, u); assert.ok(v >= -1 && v <= 1, `${q} ${u} ${v}`); }
  assert.equal(M.wert({ quelle: "zufall", seed: 3 }, 0.2), M.wert({ quelle: "zufall", seed: 3 }, 0.2), "gehaltener Zufall ist reproduzierbar");
  assert.equal(M.wert({ quelle: "signal", signal: { werte: [0, 1] } }, 0), -1);
  assert.ok(Math.abs(M.wert({ quelle: "signal", signal: { werte: [0, 1] } }, 0.5)) < 1e-6);
  const op = labRegister().hole("lab.feedback"), basis = standardParameter(op);
  const r = [{ ziel: "drehung", tiefe: 1, modulator: { quelle: "saege", frequenz: 1 } }];
  assert.equal(M.moduliere(op, basis, r, 0).drehung, -17);
  assert.equal(M.moduliere(op, basis, [{ ...r[0], tiefe: -1 }], 0).drehung, 20, "umgekehrt und an der Grenze gehalten");
  assert.equal(M.moduliere(op, basis, [{ ziel: "mischart", tiefe: 1, modulator: { quelle: "sinus" } }], 0.3).mischart, "mischen", "nur Zahlen sind modulierbar");
  assert.deepEqual(M.stellen(3), [0, 0.5, 1]);
});

test("Modulation nach VCV Rack: Summe vor Begrenzung, einpolig, Abtasten und halten, ungültige Werte", () => {
  const op = labRegister().hole("lab.feedback"), basis = standardParameter(op);
  const hoch = { quelle: "sinus", frequenz: 1 };
  const zwei = [{ ziel: "drehung", tiefe: 1, modulator: hoch }, { ziel: "drehung", tiefe: -1, modulator: hoch }];
  assert.equal(M.moduliere(op, basis, zwei, 0.25).drehung, basis.drehung, "gestapelte Routen heben sich auf, unabhängig von der Reihenfolge");
  assert.equal(M.moduliere(op, basis, [...zwei].reverse(), 0.25).drehung, basis.drehung);
  const ein = { ziel: "drehung", tiefe: 0.25, polaritaet: "einpolig", modulator: { quelle: "saege", frequenz: 1 } };
  assert.equal(M.moduliere(op, basis, [ein], 0).drehung, basis.drehung, "einpolig: der tiefste Wert lässt den Grundwert stehen");
  assert.equal(M.moduliere(op, basis, [{ ...ein, modulator: hoch }], 0.25).drehung, basis.drehung + 10, "einpolig: derselbe Hub wie bipolar, nur verschoben");
  assert.equal(M.routenwert({ polaritaet: "einpolig", modulator: { quelle: "signal", signal: { werte: [0, 1] } } }, 0), 0, "ein dunkles Signal verändert nichts");
  assert.equal(M.halte(0.6, 3), 0.5);
  assert.equal(M.halte(1, 3), 1);
  assert.equal(M.halte(0.2, 0), 0.2, "0 Stufen: fortlaufend");
  assert.equal(M.wert({ quelle: "signal", halten: 2, signal: { werte: [0, 1] } }, 0.4), -1, "das Signal wird abgetastet und gehalten");
  assert.equal(M.wert({ quelle: "sinus", halten: 4 }, 0.3), M.wert({ quelle: "sinus", halten: 4 }, 0.45), "innerhalb einer Stufe derselbe Wert");
  assert.equal(M.wert({ quelle: "signal", signal: { werte: [NaN, NaN] } }, 0.5), -1, "ungültige Werte zählen als 0");
  assert.equal(M.moduliere(op, basis, [{ ziel: "drehung", tiefe: NaN, modulator: hoch }], 0.25).drehung, basis.drehung);
  assert.deepEqual(M.routeFuersProtokoll({ ...ein, modulator: { quelle: "signal", ergebnis: "e1", halten: 3, signal: { werte: [1] } } }),
    { ziel: "drehung", tiefe: 0.25, polaritaet: "einpolig", modulator: { quelle: "signal", ergebnis: "e1", halten: 3, signal: undefined } });
});

test("Feedback: reproduzierbar, verändert das Bild, Verlauf hat Iterationen + 1 Bilder, Zeitmodulation wirkt", async () => {
  const op = labRegister().hole("lab.feedback"), p = { ...standardParameter(op), iterationen: 6, seite: 64 };
  const a = (await op.ausfuehren({ bild: bild() }, p)).ausgaben[0].bild, b = (await op.ausfuehren({ bild: bild() }, p)).ausgaben[0].bild;
  assert.equal(fingerabdruck(a), fingerabdruck(b));
  assert.notEqual(fingerabdruck(a), fingerabdruck(bild(64, 48)));
  let n = 0; for await (const _ of op.verlauf({ bild: bild() }, p)) n++;
  assert.equal(n, 7);
  const mod = (await op.ausfuehren({ bild: bild() }, p, { zeitRouten: [{ ziel: "drehung", tiefe: 1, modulator: { quelle: "sinus", frequenz: 1 } }] })).ausgaben[0].bild;
  assert.notEqual(fingerabdruck(mod), fingerabdruck(a));
});

test("Wiederholung, Farbe, Bildsignal, Differenz: rechnen und protokollieren", async () => {
  const r = labRegister();
  const w = await r.hole("lab.wiederholung").ausfuehren({ bild: bild() }, { ...standardParameter(r.hole("lab.wiederholung")), spalten: 3, zeilen: 2 }, { seed: 1 });
  assert.equal(w.protokoll.kopien.length, 6);
  const f = await r.hole("lab.farbe").ausfuehren({ bild: bild() }, { ...standardParameter(r.hole("lab.farbe")), stufen: 2 });
  assert.ok([...f.ausgaben[0].bild.data].every((v, i) => i % 4 === 3 || v === 0 || v === 255), "zwei Stufen: nur 0 oder 255");
  const s = await r.hole("lab.bildsignal").ausfuehren({ bild: bild() }, standardParameter(r.hole("lab.bildsignal")));
  const werte = s.ausgaben[0].daten.werte;
  assert.equal(werte.length, 48);
  assert.equal(Math.min(...werte), 0); assert.equal(Math.max(...werte), 1);
  const d = await r.hole("lab.differenz").ausfuehren({ bild: bild(), vergleich: bild() }, standardParameter(r.hole("lab.differenz")));
  assert.equal(d.ausgaben[0].befund.mittlereAbweichung, 0);
  assert.equal(d.ausgaben[0].befund.hinweis, "Messung, keine Bewertung");
});

test("ORNA-Adapter: Ziehung als Zufall, Regel mit Quelle und Entscheidungsart (jev-Tabelle → jev)", async () => {
  const op = labRegister().hole("orna.konstellation");
  const z = await op.ausfuehren({}, { konstellation: "" });
  assert.equal(z.entscheidungen[0].art, "zufall");
  const g = await op.ausfuehren({}, { konstellation: "dan-graham__wendy-hui-kyong-chun" }, { seed: 5 });
  assert.equal(g.entscheidungen[0].art, "mensch");
  assert.equal(g.entscheidungen[1].art, "jev", "die Tabelle aus dem Bau von The Fictory ist gültig");
  assert.equal(g.ausgaben[0].daten.regel, "R2");
  assert.equal(g.entscheidungen[1].details.modell, "jev-1.13.0");
  assert.ok(g.ausgaben[0].daten.text.length > 100, "Text unverändert aus ORNA");
});

test("Ausführung: Varianten über Modulation, Projekt als azyklische Grafik, Weiterverarbeitung, Verlauf und Nebeneinander", async () => {
  const { p, m, e, r } = mitMaterial();
  const route = { ziel: "drehung", tiefe: 0.8, modulator: { quelle: "sinus", frequenz: 0.25 } };
  const a = await fuehreAus({ register: r, projekt: p, medien: m, auftrag: { operation: "lab.feedback", eingaben: { bild: e.id }, parameter: { iterationen: 4, seite: 64 }, seed: 9, variation: { anzahl: 4, routen: [route] }, wahl: { art: "mensch" } } });
  assert.equal(a.ergebnisse.length, 4);
  const drehungen = a.ergebnisse.map((x) => x.variante.parameter.drehung);
  assert.equal(new Set(drehungen).size, 4, `Varianten verschieden: ${drehungen}`);
  P.waehleVariante(p, a.ergebnisse[2].id, "mensch");
  const b = await fuehreAus({ register: r, projekt: p, medien: m, auftrag: { operation: "lab.farbe", eingaben: { bild: a.ergebnisse[2].id }, parameter: { farbdrehung: 90 } } });
  const v = P.verlauf(p, b.ergebnisse[0].id);
  assert.equal(v.material.id, e.id);
  assert.deepEqual(v.schritte.map((s) => s.knoten.operation), ["lab.feedback", "lab.farbe"]);
  assert.equal(P.geschwister(p, a.ergebnisse[0].id).length, 4);
  assert.deepEqual(P.pruefeProjekt(p), []);
  assert.deepEqual(p.entscheidungen.map((d) => [d.art, d.gegenstand]), [["mensch", "operation"], ["mensch", "variante"]]);
  let n = 0; for await (const _ of bildfolge({ register: r, projekt: p, medien: m, ergebnisId: a.ergebnisse[1].id })) n++;
  assert.equal(n, 5, "Feedback-Verlauf: Eingang + 4 Iterationen");
  n = 0; for await (const _ of bildfolge({ register: r, projekt: p, medien: m, ergebnisId: b.ergebnisse[0].id, ueberblendung: 10 })) n++;
  assert.equal(n, 11, "Farbe ohne eigenen Verlauf: Überblendung");
  // so lang wie ein Klang: der Verlauf (5 Bilder) wird auf genau 61 Bilder gedehnt, Anfang und Ende bleiben die Originalbilder
  const roh = []; for await (const b of bildfolge({ register: r, projekt: p, medien: m, ergebnisId: a.ergebnisse[1].id })) roh.push(b);
  const lang = []; for await (const b of bildfolge({ register: r, projekt: p, medien: m, ergebnisId: a.ergebnisse[1].id, bilder: 61 })) lang.push(b);
  assert.equal(lang.length, 61);
  assert.deepEqual([lang[0].data, lang[15].data, lang[60].data], [roh[0].data, roh[1].data, roh[4].data], "Stützbilder an j·(n−1)/(ziel−1)");
  const mitte = lang[7].data[0], grenzen = [roh[0].data[0], roh[1].data[0]].sort((x, y) => x - y);
  assert.ok(mitte >= grenzen[0] && mitte <= grenzen[1], "dazwischen überblendet");
  n = 0; for await (const _ of bildfolge({ register: r, projekt: p, medien: m, ergebnisId: a.ergebnisse[1].id, bilder: 3 })) n++;
  assert.equal(n, 3, "auch kürzer: ausgedünnt");
  n = 0; for await (const _ of bildfolge({ register: r, projekt: p, medien: m, ergebnisId: b.ergebnisse[0].id, bilder: 90 })) n++;
  assert.equal(n, 90, "Überblendung so lang wie verlangt");
});

test("Kopplung: ein Bildsignal moduliert die Wiederholung (Bild → Steuersignal → Parameter)", async () => {
  const { p, m, e, r } = mitMaterial();
  const s = await fuehreAus({ register: r, projekt: p, medien: m, auftrag: { operation: "lab.bildsignal", eingaben: { bild: e.id } } });
  const w = await fuehreAus({ register: r, projekt: p, medien: m, auftrag: { operation: "lab.wiederholung", eingaben: { bild: e.id }, parameter: { seite: 64 },
    variation: { anzahl: 3, routen: [{ ziel: "spalten", tiefe: 1, modulator: { quelle: "signal", ergebnis: s.ergebnisse[0].id } }] } } });
  assert.ok(new Set(w.ergebnisse.map((x) => x.variante.parameter.spalten)).size > 1, "das Signal verteilt die Spalten");
  const k = p.knoten.at(-1);
  assert.equal(k.variation.routen[0].modulator.ergebnis, s.ergebnisse[0].id, "die Kopplung steht im Projekt");
  assert.equal(k.variation.routen[0].modulator.signal, undefined, "ohne die Werte zu verdoppeln");
});

/**
 * synthetischer Ton, 6 s bei 44,1 kHz: Anschläge (kurzes Rauschen) alle 0,5 s ab 0,25 s; die ersten 3 s dazu ein leiser tiefer Ton (100 Hz),
 * die letzten 3 s ein lauter hoher (5 kHz). So sind Hüllkurve, Schwerpunkt und Einsätze bekannt.
 */
function ton(rate = 44100, dauer = 6) {
  const pcm = new Float32Array(rate * dauer);
  let s = 7; const r = () => { s = (s * 1103515245 + 12345) & 0x7fffffff; return s / 0x7fffffff - 0.5; };
  for (let i = 0; i < pcm.length; i++) {
    const t = i / rate, nach = (t - 0.25) % 0.5;
    pcm[i] = t < 3 ? 0.05 * Math.sin(2 * Math.PI * 100 * t) : 0.4 * Math.sin(2 * Math.PI * 5000 * t);
    if (t >= 0.25 && nach < 0.02) pcm[i] += 1.2 * r() * (1 - nach / 0.02);
  }
  return { pcm, rate, dauer, kanaele: 1 };
}
const mittel = (w, a, z) => w.slice(a, z).reduce((x, y) => x + y, 0) / (z - a);
function mitTon() {
  const x = mitMaterial();
  const t = P.fuegeMaterialHinzu(x.p, { titel: "takt.wav", typ: "AUDIO", datei: "medien/t.wav", mime: "audio/wav", sha256: "y", ton: { dauer: 6, abtastrate: 44100, kanaele: 1 } });
  x.m.toene.set(t.id, ton());
  return { ...x, t };
}

test("Audio-Operationsformat: acht Klangformen in den vorhandenen Typen, AUDIO und Ereignisfolge sind implementiert", () => {
  assert.deepEqual(Object.keys(KLANGFORMEN), ["audiosignal", "ereignis", "steuerwert", "parameterverlauf", "spektrum", "rhythmus", "generator", "transformation"]);
  for (const f of Object.values(KLANGFORMEN)) assert.ok(TYPEN[f.typ], f.name);
  assert.ok(TYPEN.AUDIO.implementiert && TYPEN.EVENT_SEQUENCE.implementiert);
  assert.equal(KLANGFORMEN.parameterverlauf.typ, KLANGFORMEN.steuerwert.typ, "ein Klangverlauf ist dasselbe Steuersignal wie ein Bildsignal");
  assert.deepEqual(labRegister().fuer("AUDIO").map((o) => o.id), ["lab.tonsignal", "lab.tempo", "lab.zerlegen", "lab.rhythmus", "lab.koerner"]);
  assert.ok(KLANGFORMEN.transformation.implementiert && KLANGFORMEN.rhythmus.implementiert, "seit 0.1.7");
});

test("Tonsignal: Hüllkurve, Schwerpunkt und Einsätze eines bekannten Tons, Ausschnitt, Grenzen", async () => {
  const op = labRegister().hole("lab.tonsignal"), std = standardParameter(op);
  const laut = await op.ausfuehren({ ton: ton() }, std);
  const [sig, ereignisse] = laut.ausgaben;
  assert.equal(sig.typ, "CONTROL_SIGNAL"); assert.equal(ereignisse.typ, "EVENT_SEQUENCE");
  assert.equal(sig.daten.werte.length, 120);
  assert.equal(sig.daten.achse, "zeit"); assert.equal(sig.daten.dauer, 6); assert.equal(sig.daten.je, 0.05);
  assert.ok(mittel(sig.daten.werte, 70, 120) > mittel(sig.daten.werte, 0, 50) + 0.2, "hinten lauter als vorne");
  const sp = (await op.ausfuehren({ ton: ton() }, { ...std, merkmal: "schwerpunkt" })).ausgaben[0].daten.werte;
  assert.ok(mittel(sp, 70, 120) > mittel(sp, 0, 50), "hinten heller (5 kHz) als vorne (100 Hz)");
  const t = ereignisse.daten.ereignisse.map((x) => x.t);
  assert.ok(t.length >= 9 && t.length <= 13, `etwa zwölf Anschläge: ${t}`);
  const abstand = (x) => { const d = (((x - 0.25) % 0.5) + 0.5) % 0.5; return Math.min(d, 0.5 - d); };
  assert.ok(t.every((x) => abstand(x) < 0.06 || Math.abs(x - 3) < 0.06), `Einsätze auf den Anschlägen oder beim Wechsel nach 3 s: ${t}`);
  const stoesse = (await op.ausfuehren({ ton: ton() }, { ...std, merkmal: "einsaetze", proben: 24 })).ausgaben[0].daten.werte;
  assert.ok(stoesse.slice(0, 12).filter((v) => v > 0.5).length >= 5, `Einsätze: im leisen Teil je halbe Sekunde ein Ausschlag: ${stoesse}`);
  const stueck = await op.ausfuehren({ ton: ton() }, { ...std, beginn: 3, laenge: 2 });
  assert.deepEqual([stueck.ausgaben[0].daten.beginn, stueck.ausgaben[0].daten.dauer], [3, 2]);
  assert.deepEqual(stueck.protokoll.ausschnitt, { beginn: 3, ende: 5, dauer: 2, gesamt: 6 });
  await assert.rejects(op.ausfuehren({ ton: ton() }, { ...std, beginn: 6 }), /Ausschnitt ist leer/);
  const nochmal = await op.ausfuehren({ ton: ton() }, std);
  assert.deepEqual(nochmal.ausgaben[0].daten, sig.daten, "reproduzierbar");
});

test("Kopplung Ton → Bild: das Tonsignal moduliert Varianten und die Zeit eines Feedbacks; nur AUDIO geht in das Tonsignal", async () => {
  const { p, m, e, r, t } = mitTon();
  const s = await fuehreAus({ register: r, projekt: p, medien: m, auftrag: { operation: "lab.tonsignal", eingaben: { ton: t.id }, parameter: { proben: 60 } } });
  assert.deepEqual(s.ergebnisse.map((x) => x.typ), ["CONTROL_SIGNAL", "EVENT_SEQUENCE"]);
  const route = { ziel: "spalten", tiefe: 1, polaritaet: "einpolig", modulator: { quelle: "signal", ergebnis: s.ergebnisse[0].id } };
  const w = await fuehreAus({ register: r, projekt: p, medien: m, auftrag: { operation: "lab.wiederholung", eingaben: { bild: e.id }, parameter: { seite: 64, spalten: 2 }, variation: { anzahl: 4, routen: [route] } } });
  const spalten = w.ergebnisse.map((x) => x.variante.parameter.spalten);
  assert.ok(spalten.at(-1) > spalten[0], `der laute Schluss gibt mehr Spalten als der leise Anfang: ${spalten}`);
  const zeit = { ziel: "drehung", tiefe: 1, modulator: { quelle: "signal", ergebnis: s.ergebnisse[0].id } };
  const ohne = await fuehreAus({ register: r, projekt: p, medien: m, auftrag: { operation: "lab.feedback", eingaben: { bild: e.id }, parameter: { iterationen: 6, seite: 48 }, seed: 1 } });
  const mit = await fuehreAus({ register: r, projekt: p, medien: m, auftrag: { operation: "lab.feedback", eingaben: { bild: e.id }, parameter: { iterationen: 6, seite: 48 }, seed: 1, variation: { achse: "zeit", routen: [zeit] } } });
  assert.notEqual(fingerabdruck(m.bilder.get(mit.ergebnisse[0].id)), fingerabdruck(m.bilder.get(ohne.ergebnisse[0].id)), "der Ton dreht das Feedback über die Iterationen");
  let n = 0; for await (const _ of bildfolge({ register: r, projekt: p, medien: m, ergebnisId: mit.ergebnisse[0].id })) n++;
  assert.equal(n, 7, "die Animation rechnet dieselbe Zeitmodulation noch einmal");
  const k = p.knoten.at(-1);
  assert.deepEqual(k.variation.routen[0].modulator, { quelle: "signal", ergebnis: s.ergebnisse[0].id, signal: undefined }, "die Kopplung steht im Projekt, ohne die Werte zu verdoppeln");
  assert.deepEqual(P.pruefeProjekt(p), []);
  await assert.rejects(fuehreAus({ register: r, projekt: p, medien: m, auftrag: { operation: "lab.tonsignal", eingaben: { ton: e.id } } }), /verlangt AUDIO, bekommt IMAGE/);
  await assert.rejects(fuehreAus({ register: r, projekt: p, medien: m, auftrag: { operation: "lab.feedback", eingaben: { bild: t.id } } }), /verlangt IMAGE, bekommt AUDIO/);
  assert.equal(p.ergebnisse.find((x) => x.id === t.id).ton.dauer, 6, "Tonmaterial mit Dauer, Abtastrate, Kanälen");
});

test("Archiv mit Ton und alte Projekte: Tondatei kommt unverändert mit, Projekte 0.1.0–0.5.0 öffnen weiter", async () => {
  const { p, m, r, t } = mitTon();
  await fuehreAus({ register: r, projekt: p, medien: m, auftrag: { operation: "lab.tonsignal", eingaben: { ton: t.id } } });
  const wav = Uint8Array.from({ length: 64 }, (_, i) => i);
  m.dateien.set("medien/t.wav", wav);
  const { projekt, medien, fehlt } = await entpacke(packe(p, m.dateien));
  assert.deepEqual(fehlt.filter((d) => d === "medien/t.wav"), []);
  assert.deepEqual(medien.get("medien/t.wav"), wav);
  assert.equal(projekt.ergebnisse.find((x) => x.typ === "AUDIO").ton.abtastrate, 44100);
  assert.equal(projekt.formatVersion, "0.7.0");
  for (const v of ["0.1.0", "0.2.0", "0.3.0", "0.4.0", "0.5.0", "0.6.0"]) assert.doesNotThrow(() => P.ladeProjekt({ ...P.neuesProjekt(), formatVersion: v, labVersion: "0.1.0" }), v);
});

/** Scheibe auf gleichmässigem Grund, für Schwerpunkt und Ausschnitt */
function scheibe(cx = 30, cy = 50, w = 120, h = 80) {
  const b = neuesBild(w, h, [40, 40, 40]);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if ((x - cx) ** 2 + (y - cy) ** 2 < 100) { const i = (y * w + x) * 4; b.data[i] = 230; b.data[i + 1] = 200; b.data[i + 2] = 90; }
  return b;
}
const EINS = { ausschnitt: 1, naehe: 1, rand: "wiederholen", symmetrie: 1, achse: "lr", licht: 1, mitte: 1, kontrast: 1, saettigung: 1 };
const nahe = (a, b, eps, text) => assert.ok(Math.abs(a - b) <= eps, `${text}: ${a} statt ${b} (± ${eps})`);

test("Kompositorisches Profil: misst Schwerpunkt, Symmetrie, Licht, Kontrast, Farbe und Richtung, ohne Bewertung", () => {
  const p = K.profil(scheibe());
  nahe(p.schwerpunkt.x, 30.5 / 120 - 0.5, 0.01, "Schwerpunkt x");
  nahe(p.schwerpunkt.y, 50.5 / 80 - 0.5, 0.01, "Schwerpunkt y");
  assert.ok(p.schwerpunkt.ausdehnung < 0.4, "eine kleine Scheibe ist eng");
  const sym = neuesBild(64, 48);
  for (let y = 0; y < 48; y++) for (let x = 0; x < 64; x++) { const i = (y * 64 + x) * 4, v = Math.abs(x - 31.5) * 6 + y * 2; sym.data[i] = v; sym.data[i + 1] = v / 2; sym.data[i + 2] = 255 - v; sym.data[i + 3] = 255; }
  const s = K.profil(sym);
  assert.equal(s.symmetrie.linksRechts, 1, "spiegelgleich links–rechts");
  assert.ok(s.symmetrie.obenUnten < 1);
  assert.ok(s.licht.gefaelleY > 0 && s.licht.gefaelleWinkel === 270, "nach unten heller: Gefälle zeigt nach unten (270°)");
  assert.ok(s.licht.mitte < 0, "die Mitte ist dunkler als der Rand");
  assert.equal(K.profil(neuesBild(32, 32, [90, 90, 90])).farbe.saettigung, 0, "Grau hat keine Sättigung");
  const streifen = neuesBild(64, 64);
  for (let i = 0; i < streifen.data.length; i += 4) { const y = Math.floor(i / 4 / 64), v = y % 8 < 4 ? 220 : 30; streifen.data.fill(v, i, i + 3); streifen.data[i + 3] = 255; }
  const r = K.profil(streifen).richtung;
  assert.equal(r.kantenWinkel, 0, "waagrechte Streifen: Kanten waagrecht");
  assert.ok(r.kohaerenz > 0.95);
  assert.deepEqual(K.profil(bild()), K.profil(bild()), "reproduzierbar");
  assert.equal(p.hinweis, "Messung, keine Bewertung");
  assert.ok(!/qualit|score|bewertung"|gut|schlecht|golden/i.test(JSON.stringify(Object.keys(p)) + JSON.stringify(p.lesarten).replace(/Hypothese/g, "")), "keine Bewertungsgrösse");
  assert.ok(Object.values(p.lesarten).every((t) => t.startsWith("Hypothese")), "Lesarten sind als Hypothesen gekennzeichnet");
});

test("Komposition verändern: Faktor 1 lässt stehen, 0 hebt auf, −1 kehrt um, 2 verstärkt", () => {
  const b = bild(), vorher = K.profil(b);
  assert.equal(fingerabdruck(K.komponiere(b, EINS).bild), fingerabdruck(b), "alle Faktoren 1: dieselben Pixel");
  const p = (f) => K.profil(K.komponiere(b, { ...EINS, ...f }).bild);
  assert.ok(p({ symmetrie: 0 }).symmetrie.linksRechts > 0.99, "Asymmetrie aufgehoben");
  const gespiegelt = K.komponiere(b, { ...EINS, symmetrie: -1 }).bild;
  for (const [x, y] of [[3, 5], [50, 20], [90, 70]]) for (let c = 0; c < 3; c++) assert.ok(Math.abs(gespiegelt.data[(y * 96 + x) * 4 + c] - b.data[(y * 96 + 95 - x) * 4 + c]) <= 1, "−1 spiegelt");
  assert.ok(p({ symmetrie: 2 }).symmetrie.linksRechts < vorher.symmetrie.linksRechts, "2: asymmetrischer");
  assert.ok(p({ licht: -1 }).licht.gefaelleY < 0 && vorher.licht.gefaelleY > 0, "Licht kommt von der anderen Seite");
  assert.ok(p({ licht: 0 }).licht.gefaelleStaerke < 0.03, "Gefälle aufgehoben");
  nahe(p({ mitte: 2 }).licht.mitte, 2 * vorher.licht.mitte, 0.01, "Mitte/Rand verdoppelt");
  assert.ok(p({ kontrast: 0 }).kontrast.binnen < 0.01, "Binnenkontrast aufgehoben");
  nahe(p({ kontrast: 0.5 }).kontrast.binnen, vorher.kontrast.binnen / 2, 0.01, "halber Binnenkontrast");
  assert.equal(p({ saettigung: 0 }).farbe.saettigung, 0, "grau");
  const gegen = p({ saettigung: -1 }).farbe;
  nahe((gegen.farbton - vorher.farbe.farbton + 360) % 360, 180, 20, "Gegenfarben: Farbton um 180° gedreht");
  const s = scheibe();
  assert.ok(K.profil(K.komponiere(s, { ...EINS, ausschnitt: 0 }).bild).schwerpunkt.abstand < 0.03, "Ausschnitt 0: Schwerpunkt in der Mitte");
  const gegenueber = K.profil(K.komponiere(s, { ...EINS, ausschnitt: -1 }).bild).schwerpunkt;
  nahe(gegenueber.x, -K.profil(s).schwerpunkt.x, 0.02, "Ausschnitt −1: gegenüber");
  assert.ok(K.profil(K.komponiere(s, { ...EINS, naehe: 2 }).bild).schwerpunkt.ausdehnung > K.profil(s).schwerpunkt.ausdehnung, "näher: das Gewicht dehnt sich aus");
});

test("Komposition im Lab: Profil als Befund, Zielprofil aus einem anderen Bild, Modulation, Verlauf, Protokoll vorher/nachher", async () => {
  const { p, m, e, r } = mitMaterial();
  const zweites = P.fuegeMaterialHinzu(p, { titel: "ruhig.png", datei: "medien/r.rgba", breite: 64, hoehe: 48 });
  const ruhig = neuesBild(64, 48, [120, 118, 115]);
  for (let i = 0; i < ruhig.data.length; i += 4) { const x = (i / 4) % 64; ruhig.data[i] += Math.abs(x - 31.5) * 2; }
  m.bilder.set(zweites.id, ruhig);
  const pr = await fuehreAus({ register: r, projekt: p, medien: m, auftrag: { operation: "lab.profil", eingaben: { bild: zweites.id } } });
  const ziel = pr.ergebnisse[0];
  assert.equal(ziel.typ, "METADATA");
  assert.equal(ziel.daten.art, "kompositorisches-profil");
  assert.deepEqual(p.knoten.at(-1).protokoll.profil, ziel.daten, "das Profil steht im Protokoll");
  assert.deepEqual(r.fuer("METADATA"), [], "ein Profil ist kein Haupteingang, nur Ziel");

  const a = await fuehreAus({ register: r, projekt: p, medien: m, auftrag: { operation: "lab.komposition", eingaben: { bild: e.id, profil: ziel.id }, parameter: { seite: 256 } } });
  const k = p.knoten.at(-1), { vorher, nachher } = k.protokoll;
  assert.ok(k.protokoll.zielprofil);
  for (const [gruppe, wert] of [["farbe", "saettigung"], ["kontrast", "binnen"], ["symmetrie", "linksRechts"]]) {
    assert.ok(Math.abs(nachher[gruppe][wert] - ziel.daten[gruppe][wert]) < Math.abs(vorher[gruppe][wert] - ziel.daten[gruppe][wert]), `${gruppe}.${wert} rückt zum Ziel: ${vorher[gruppe][wert]} → ${nachher[gruppe][wert]}, Ziel ${ziel.daten[gruppe][wert]}`);
  }
  assert.deepEqual(a.ergebnisse[0].befund.profil, nachher, "jedes Ergebnis trägt sein Profil");
  assert.match(a.ergebnisse[0].befund.kurz, /→/);

  const v = await fuehreAus({ register: r, projekt: p, medien: m, auftrag: { operation: "lab.komposition", eingaben: { bild: e.id }, parameter: { seite: 128 },
    variation: { anzahl: 4, routen: [{ ziel: "saettigung", tiefe: -1, modulator: { quelle: "sinus", frequenz: 0.25 } }] } } });
  const faktoren = v.ergebnisse.map((x) => x.variante.parameter.saettigung);
  assert.deepEqual(faktoren, [1, 0.25, -0.299038, -0.5], "die Modulation verteilt den Faktor über die Varianten (bis in die Gegenfarben)");
  const prot = p.knoten.at(-1).protokoll;
  for (const [i, x] of prot.entries()) nahe(x.nachher.farbe.saettigung, Math.abs(faktoren[i]) * x.vorher.farbe.saettigung, 0.02, `Variante ${i + 1}: gemessene Sättigung folgt dem Faktor`);
  let n = 0; for await (const _ of bildfolge({ register: r, projekt: p, medien: m, ergebnisId: a.ergebnisse[0].id })) n++;
  assert.equal(n, 36, "eigener Verlauf vom Eingang zum Ergebnis");
  assert.deepEqual(P.pruefeProjekt(p), []);
  const zurueck = P.ladeProjekt(P.serialisiere(p));
  assert.equal(zurueck.ergebnisse.find((x) => x.id === ziel.id).daten.symmetrie.linksRechts, ziel.daten.symmetrie.linksRechts, "das Profil übersteht Speichern und Öffnen");

  const s = await fuehreAus({ register: r, projekt: p, medien: m, auftrag: { operation: "lab.bildsignal", eingaben: { bild: e.id } } });
  assert.ok(s.ergebnisse[0].typ === "CONTROL_SIGNAL");
  p.ergebnisse.push({ ...ziel, id: "e-falsch", daten: { art: "anderes" } });
  await assert.rejects(fuehreAus({ register: r, projekt: p, medien: m, auftrag: { operation: "lab.komposition", eingaben: { bild: e.id, profil: "e-falsch" } } }), /kein kompositorisches Profil/);
});

/** Material → Feedback (sechs Varianten) → Farbe: Stationen mit und ohne eigenen Verlauf */
async function mitStationen() {
  const x = mitMaterial();
  const f = await fuehreAus({ register: x.r, projekt: x.p, medien: x.m, auftrag: { operation: "lab.feedback", eingaben: { bild: x.e.id }, parameter: { iterationen: 8, seite: 48 }, seed: 3,
    variation: { anzahl: 3, routen: [{ ziel: "drehung", tiefe: 0.5, modulator: { quelle: "sinus" } }] } } });
  P.waehleVariante(x.p, f.ergebnisse[1].id);
  const c = await fuehreAus({ register: x.r, projekt: x.p, medien: x.m, auftrag: { operation: "lab.farbe", eingaben: { bild: f.ergebnisse[1].id }, parameter: { farbdrehung: 120 } } });
  return { ...x, f, c };
}

test("Stationen: Partitur aus dem Verlauf, Halten und Übergang, Verlauf nur wo eine Station aus der vorigen entstanden ist", async () => {
  const { p, e, f, c } = await mitStationen();
  const ids = ST.stationenAusVerlauf(p, c.ergebnisse[0].id);
  assert.deepEqual(ids, [e.id, f.ergebnisse[1].id, c.ergebnisse[0].id], "Material, Feedback, Farbe");
  assert.deepEqual(ST.variantenAusVerlauf(p, c.ergebnisse[0].id), [...f.ergebnisse, ...c.ergebnisse].map((x) => x.id), "alle Varianten aller Schritte, ohne Material");
  assert.deepEqual(ST.variantenAusVerlauf(p, c.ergebnisse[0].id, "AUDIO"), [], "Klänge gibt es hier keine");
  assert.ok(ST.verlaufMoeglich(p, e.id, f.ergebnisse[1].id));
  assert.ok(!ST.verlaufMoeglich(p, f.ergebnisse[0].id, f.ergebnisse[2].id), "Geschwister entstehen nicht auseinander");
  const pt = ST.partitur(p, { stationen: ids, halten: 1, uebergang: 0.5, art: "blende" });
  assert.deepEqual(pt.folge.map((x) => [x.beginn, x.halten, x.uebergang?.art, x.uebergang?.dauer]), [[0, 1, "blende", 0.5], [1.5, 1, "blende", 0.5], [3, 1, undefined, undefined]]);
  assert.equal(pt.dauer, 4); assert.equal(pt.bilder, 120); assert.equal(pt.offen, 0);
  // Verlauf der Operation: eigene Länge, bei Geschwistern Überblendung mit Hinweis; Übergang je Station
  const v = ST.partitur(p, { stationen: [e.id, f.ergebnisse[1].id, { ergebnis: f.ergebnisse[0].id, uebergang: "schnitt" }, f.ergebnisse[2].id], art: "verlauf", halten: 1, uebergang: 1 });
  assert.deepEqual(v.folge.slice(0, 3).map((x) => x.uebergang.art), ["verlauf", "blende", "schnitt"]);
  assert.equal(v.folge[0].uebergang.dauer, null); assert.equal(v.offen, 1);
  assert.match(v.folge[1].uebergang.hinweis, /nicht aus dieser entstanden/);
  assert.equal(v.folge[2].uebergang.dauer, 0);
  assert.throws(() => ST.partitur(p, { stationen: [e.id] }), /mindestens zwei/);
  assert.throws(() => ST.partitur(p, { stationen: [e.id, "e-gibtsnicht"] }), /kein Bild/);
  assert.throws(() => ST.partitur(p, { stationen: [e.id, c.ergebnisse[0].id], halten: 10, uebergang: 6, takt: null, fps: 400 }), /Grenze/);
  const grenzen = ST.partitur(p, { stationen: [e.id, c.ergebnisse[0].id], halten: 99, uebergang: -3 });
  assert.deepEqual([grenzen.halten, grenzen.uebergang], [10, 0], "Zeitparameter sind hart begrenzt");
});

test("Stationen: dieselbe Modulation verteilt die Dauern über die Stationen (Rampe, Steuersignal)", async () => {
  const { p, e, f, c, r, m } = await mitStationen();
  const ids = [e.id, ...f.ergebnisse.map((x) => x.id), c.ergebnisse[0].id];
  const rampe = ST.partitur(p, { stationen: ids, halten: 2, uebergang: 1, routen: [{ ziel: "halten", tiefe: 0.2, modulator: { quelle: "saege", frequenz: 0.9 } }] });
  const h = rampe.folge.map((x) => x.halten);
  assert.ok(h.slice(0, -1).every((x, i) => x < h[i + 1]), `das Halten wächst über die Stationen: ${h}`);
  assert.equal(rampe.folge[0].stelle, 0); assert.equal(rampe.folge.at(-1).stelle, 1);
  // ein Bildsignal als Quelle: wird über die Kennung aufgelöst und nicht ins Protokoll kopiert
  const s = await fuehreAus({ register: r, projekt: p, medien: m, auftrag: { operation: "lab.bildsignal", eingaben: { bild: e.id } } });
  const mitSignal = ST.partitur(p, { stationen: ids, routen: [{ ziel: "uebergang", tiefe: 0.5, modulator: { quelle: "signal", ergebnis: s.ergebnisse[0].id } }] });
  assert.equal(new Set(mitSignal.folge.slice(0, -1).map((x) => x.uebergang.dauer)).size > 1, true, "die Übergänge folgen dem Signal");
  assert.equal(mitSignal.routen[0].modulator.signal, undefined);
});

test("Stationen im Takt: Einsätze eines Tons lösen die Wechsel aus, reihum bis die Einsätze aufgebraucht sind, Tonspur aus derselben Messung", async () => {
  const { p, m, e, r, t } = mitTon();
  const s = await fuehreAus({ register: r, projekt: p, medien: m, auftrag: { operation: "lab.tonsignal", eingaben: { ton: t.id } } });
  const folge = s.ergebnisse[1], einsaetze = folge.daten.ereignisse.map((x) => x.t);
  const b = await fuehreAus({ register: r, projekt: p, medien: m, auftrag: { operation: "lab.farbe", eingaben: { bild: e.id }, parameter: { farbdrehung: 90 } } });
  const pt = ST.partitur(p, { stationen: [e.id, b.ergebnisse[0].id], halten: 1, uebergang: 0.2, art: "blende", takt: { ereignisfolge: folge.id, schwelle: 0, wiederholen: true } });
  assert.equal(pt.takt.ton, t.id, "der gemessene Ton wird Tonspur");
  assert.equal(pt.folge.length, Math.min(einsaetze.length + 1, 48 * 8));
  for (let j = 0; j < 3; j++) assert.ok(Math.abs(pt.folge[j].beginn + pt.folge[j].halten - einsaetze[j]) < 1e-3, `Wechsel ${j} beim Einsatz ${einsaetze[j]}`);
  assert.deepEqual(pt.folge.slice(0, 4).map((x) => x.ergebnis), [e.id, b.ergebnisse[0].id, e.id, b.ergebnisse[0].id], "reihum");
  assert.ok(Math.abs(pt.dauer - 6) < 0.04, `der Film dauert so lang wie der Ton: ${pt.dauer}`);
  const ohne = ST.partitur(p, { stationen: [e.id, b.ergebnisse[0].id], halten: 1, uebergang: 0.2, takt: { ereignisfolge: folge.id, schwelle: 0 } });
  assert.equal(ohne.folge.length, 2);
  folge.daten = { ...folge.daten, ereignisse: folge.daten.ereignisse.map((x) => ({ ...x, staerke: 0.3 })) };
  assert.throws(() => ST.partitur(p, { stationen: [e.id, b.ergebnisse[0].id], takt: { ereignisfolge: folge.id, schwelle: 0.5 } }), /keine Einsätze/);
  assert.throws(() => ST.partitur(p, { stationen: [e.id, b.ergebnisse[0].id], takt: { ereignisfolge: s.ergebnisse[0].id } }), /Ereignisfolge/);
});

test("Stationen: die Bilder des Films folgen der Partitur, Verläufe mit eigener und mit fester Länge, alles reproduzierbar", async () => {
  const { p, m, e, f, c, r } = await mitStationen();
  const ids = ST.stationenAusVerlauf(p, c.ergebnisse[0].id);
  const rechne = async (plan) => {
    const pt = ST.partitur(p, plan), zeitplan = [], bilder = [];
    for await (const b of ST.filmbilder({ register: r, projekt: p, medien: m, partitur: pt, seite: 40, zeitplan })) bilder.push(b);
    return { pt, zeitplan, bilder };
  };
  const a = await rechne({ stationen: ids, halten: 0.5, uebergang: 0.5, art: "schwelle" });
  assert.equal(a.bilder.length, a.pt.bilder);
  assert.ok(a.bilder.every((b) => b.width === 40 && b.height === 30), "eingepasst auf die Filmgrösse");
  assert.equal(a.bilder[0], a.bilder[1], "gehaltene Bilder sind dasselbe Objekt");
  assert.deepEqual(a.zeitplan.map((x) => [x.ab, x.bilder]), [[0, 30], [1, 30], [2, 15]]);
  const zwei = await rechne({ stationen: ids, halten: 0.5, uebergang: 0.5, art: "schwelle" });
  assert.deepEqual(zwei.bilder.map(fingerabdruck), a.bilder.map(fingerabdruck));
  // Verlauf mit eigener Länge: das Feedback zeigt seine 9 Bilder (8 Iterationen), dann hält die Station
  const v = await rechne({ stationen: ids.slice(0, 2), halten: 0.2, art: "verlauf" });
  assert.equal(v.zeitplan[0].bilder, 6 + 9);
  assert.equal(v.bilder.length, 6 + 9 + 6);
  // Verlauf mit fester Länge (Schnitt im Takt): gleichmässig ausgewählte Bilder des Verlaufs, letztes = Ziel
  const pt = ST.partitur(p, { stationen: ids.slice(0, 2), halten: 0.2, uebergang: 0.2, art: "verlauf" });
  pt.folge[0].uebergang.dauer = 0.2;   // wie im Takt
  const fest = [];
  for await (const b of ST.filmbilder({ register: r, projekt: p, medien: m, partitur: pt, seite: 48 })) fest.push(b);
  assert.equal(fest.length, 6 + 6 + 6);
  assert.notEqual(fingerabdruck(fest[6]), fingerabdruck(fest[11]), "der Verlauf bewegt sich");
  assert.equal(fest[12], fest[17], "danach hält die Station");
  void e; void f;
});

test("Stationen im Projekt: Film als Export mit Partitur, Format 0.5.0 prüft die Verweise, alte Projekte bleiben gültig", async () => {
  const { p, c, e } = await mitStationen();
  const pt = ST.partitur(p, { stationen: ST.stationenAusVerlauf(p, c.ergebnisse[0].id) });
  p.exporte.push({ id: "x-1", art: "stationen", ergebnis: c.ergebnisse[0].id, stationen: pt.folge.map((x) => x.ergebnis), partitur: pt, datei: "medien/x-1-stationen.mp4" });
  assert.deepEqual(P.pruefeProjekt(p), []);
  p.exporte.push({ id: "x-2", art: "stationen", stationen: [e.id, "e-weg"] });
  assert.match(P.pruefeProjekt(p).join(), /Station e-weg ist kein Bild/);
  p.exporte.pop();
  const { projekt, fehlt } = await entpacke(packe(p, new Map()));
  assert.deepEqual(projekt.exporte[0].partitur, pt);
  assert.ok(fehlt.includes("medien/x-1-stationen.mp4"), "eine fehlende Filmdatei wird gemeldet");
  const alt = { ...P.neuesProjekt(), formatVersion: "0.4.0" }; delete alt.exporte;
  assert.doesNotThrow(() => P.ladeProjekt(alt), "Projekte ohne Exporte öffnen weiter");
});

test("Typfehler und fehlende Eingänge: Knoten bleibt mit Fehler im Protokoll", async () => {
  const { p, m, r } = mitMaterial();
  const s = await fuehreAus({ register: r, projekt: p, medien: m, auftrag: { operation: "orna.konstellation", parameter: { konstellation: "dan-graham__wendy-hui-kyong-chun" } } });
  await assert.rejects(fuehreAus({ register: r, projekt: p, medien: m, auftrag: { operation: "lab.farbe", eingaben: { bild: s.ergebnisse[0].id } } }), /verlangt IMAGE/);
  assert.equal(p.knoten.at(-1).status, "fehler");
  await assert.rejects(fuehreAus({ register: r, projekt: p, medien: m, auftrag: { operation: "lab.differenz", eingaben: { bild: p.ergebnisse[0].id } } }), /vergleich.*fehlt/);
  assert.throws(() => P.fuegeKnotenHinzu(p, { operation: "lab.farbe", eingaben: { bild: "gibt-es-nicht" } }), /gibt es nicht/);
});

test("Kette (Combinator): aus dem Verlauf gespeichert und auf neues Material angewandt", async () => {
  const { p, m, e, r } = mitMaterial();
  const a = await fuehreAus({ register: r, projekt: p, medien: m, auftrag: { operation: "lab.wiederholung", eingaben: { bild: e.id }, parameter: { seite: 64 }, variation: { anzahl: 3, routen: [{ ziel: "drehung", tiefe: 0.5, modulator: { quelle: "dreieck" } }] } } });
  const b = await fuehreAus({ register: r, projekt: p, medien: m, auftrag: { operation: "lab.farbe", eingaben: { bild: a.ergebnisse[1].id }, parameter: { stufen: 4 } } });
  const kette = P.ketteAusVerlauf(p, b.ergebnisse[0].id, "Raster und Stufen");
  assert.deepEqual(kette.schritte.map((s) => [s.operation, s.auswahl]), [["lab.wiederholung", 1], ["lab.farbe", 0]]);
  const zweites = P.fuegeMaterialHinzu(p, { titel: "zwei.png", datei: "medien/z.rgba", breite: 96, hoehe: 72 });
  m.bilder.set(zweites.id, bild());
  const ende = await ketteAnwenden({ register: r, projekt: p, medien: m, kette, start: zweites.id });
  assert.deepEqual(P.verlauf(p, ende).schritte.map((s) => s.knoten.operation), ["lab.wiederholung", "lab.farbe"]);
  assert.equal(fingerabdruck(m.bilder.get(ende)), fingerabdruck(m.bilder.get(b.ergebnisse[0].id)), "gleiches Material, gleiche Kette, gleiches Ergebnis");
  assert.ok(p.entscheidungen.some((d) => d.art === "regel" && d.details.kette === kette.id));
});

test("Experimenteller Modus: begrenzte Schritte, nur erlaubte Operationen, alle Wahlen als Zufall mit Startwert", async () => {
  const { p, m, e, r } = mitMaterial();
  const erlaubt = ["lab.feedback", "lab.farbe", "lab.wiederholung"];
  const x = await experiment({ register: r, projekt: p, medien: m, start: e.id, erlaubt, schritte: 99, varianten: 2, seed: 1234 });
  assert.equal(x.ergebnisse.length, 8, "höchstens acht Schritte");
  assert.ok(p.knoten.every((k) => erlaubt.includes(k.operation)));
  assert.ok(p.entscheidungen.every((d) => d.art === "zufall" && d.details.experimentStartwert === 1234));
  const vorschlaege = regelVorschlaege(r, p, x.ergebnisse.at(-1));
  assert.ok(vorschlaege.length > 0 && vorschlaege.every((v) => Array.isArray(v.gruende)));
});

test("Archiv: speichern und wieder öffnen ergibt dasselbe Projekt und dieselben Medien; Manipulation wird erkannt", async () => {
  const { p, m, e, r } = mitMaterial();
  await fuehreAus({ register: r, projekt: p, medien: m, auftrag: { operation: "lab.farbe", eingaben: { bild: e.id } } });
  m.dateien.set("medien/m.rgba", new Uint8Array(m.bilder.get(e.id).data));
  const z = packe(p, m.dateien);
  const { projekt, medien, fehlt } = await entpacke(z);
  assert.deepEqual(JSON.parse(JSON.stringify(projekt)), JSON.parse(P.serialisiere(p)));
  assert.deepEqual(fehlt, []);
  assert.equal(medien.size, m.dateien.size);
  const kaputt = z.slice(); kaputt[60] ^= 0xff;
  await assert.rejects(entpacke(kaputt), /Prüfsumme|ungültig|JSON|beschädigt/);
  assert.throws(() => packe(p, new Map([["../ausbruch", new Uint8Array(1)]])), /unzulässiger Pfad/);
});

test("Projektformat: Formatversion und Verweise werden geprüft", () => {
  const p = P.neuesProjekt();
  assert.deepEqual(P.pruefeProjekt(p), []);
  assert.match(P.pruefeProjekt({ ...p, formatVersion: "2.0.0" }).join(), /Formatversion/);
  assert.throws(() => P.ladeProjekt({ ...p, format: "anderes" }), /ungültig/);
  assert.throws(() => P.entscheide(p, { art: "orakel" }), /unbekannte Entscheidungsart/);
});

test("Online: nur die Oberfläche des Labs kommt auf den Webspace, sie ist nicht in der Suche und macht keine festen Aufrufe nach aussen", () => {
  const aus = readFileSync(new URL("tools/hostpoint/ausschluss.txt", root), "utf8").split("\n").map((z) => z.trim());
  for (const p of ["alpha/lab/docs/", "alpha/lab/werkzeuge/", "alpha/lab/starten.mjs", "alpha/lab/README.md"]) assert.ok(aus.includes(p), `${p} bleibt im Repository`);
  assert.match(readFileSync(new URL("alpha/lab/index.html", root), "utf8"), /<meta name="robots" content="noindex/);
  const dateien = readdirSync(new URL("alpha/lab/", root), { recursive: true }).filter((f) => f.endsWith(".js"));
  for (const f of dateien) {
    const text = readFileSync(new URL(`alpha/lab/${f}`, root), "utf8");
    assert.ok(!/fetch\(\s*["']https?:\/\/(?!localhost)/.test(text) || f.includes("jev"), `${f}: keine festen Aufrufe nach aussen`);
  }
});

test("jev: Katalog passt zum Register, Lage wird streng geprüft, Frage hat festen Wortlaut", async () => {
  const { KATALOG, labLage, labFrage } = await lab("jev/fragen.js");
  const { jevVerfuegbar, jevWahl, jevPruefen, JEV_LAB_ADRESSE } = await lab("jev/jev.js");
  const r = labRegister();
  const fuerBild = r.fuer("IMAGE").map((o) => o.id).sort();
  assert.deepEqual(Object.keys(KATALOG).sort(), fuerBild);
  assert.throws(() => labLage({ verlauf: [], optionen: ["lab.feedback"] }), /2–6/);
  assert.throws(() => labLage({ verlauf: [], optionen: ["lab.feedback", "boese.op"] }), /Katalog/);
  assert.throws(() => labLage({ verlauf: [], optionen: ["lab.feedback", "lab.farbe"], text: "frei" }), /unbekannte Felder/);
  const f = labFrage(labLage({ verlauf: ["fictory.prozess"], optionen: ["lab.feedback", "lab.farbe"] }));
  assert.equal(f.fragen.wahl.type, "choice");
  assert.deepEqual(Object.keys(f.fragen.wahl.criteria), ["lab.feedback", "lab.farbe"]);
  assert.equal(jevVerfuegbar(), false, "ohne eingetragene Adresse ist jev live aus");
  await assert.rejects(jevWahl({ verlauf: [], optionen: ["lab.feedback", "lab.farbe"] }), /nicht eingerichtet/);
  let gefragt = null;
  const echt = globalThis.fetch;
  globalThis.fetch = async (url, o) => { gefragt = { url, body: JSON.parse(o.body) }; return new Response(JSON.stringify({ wahrscheinlichkeiten: { "lab.feedback": 0.7, "lab.farbe": 0.3, fremd: 1 }, modell: "jev-test" })); };
  try {
    const a = await jevWahl({ verlauf: [], optionen: ["lab.feedback", "lab.farbe"] }, { adresse: "http://localhost:1/lab/wahl" });
    assert.deepEqual(a.wahrscheinlichkeiten, { "lab.feedback": 0.7, "lab.farbe": 0.3 }, "nur erlaubte Optionen");
    assert.deepEqual(Object.keys(gefragt.body), ["verlauf", "optionen"]);
    assert.equal(a.quelle, "live");
    // Bereitschaft: die Zwischenstelle wahl.php neben jev.js sagt es auf GET; ohne PHP (lokal) kommt ihr Quelltext, dann bleibt jev aus
    assert.match(JEV_LAB_ADRESSE, /\/alpha\/lab\/jev\/wahl\.php$/);
    globalThis.fetch = async () => new Response("<?php // Quelltext", { headers: { "content-type": "application/x-httpd-php" } });
    assert.deepEqual(await jevPruefen(), { bereit: false, grund: "Zwischenstelle nicht erreichbar" });
    globalThis.fetch = async () => new Response(JSON.stringify({ bereit: false, grund: "Kein Schlüssel hinterlegt" }), { headers: { "content-type": "application/json" } });
    assert.deepEqual(await jevPruefen(), { bereit: false, grund: "Kein Schlüssel hinterlegt" });
    globalThis.fetch = async (url, o) => { gefragt = { url, o }; return new Response(JSON.stringify(o?.method === "POST" ? { fehler: "Die Tagesgrenze für jev ist erreicht." } : { bereit: true }), { status: o?.method === "POST" ? 429 : 200, headers: { "content-type": "application/json" } }); };
    assert.deepEqual(await jevPruefen(), { bereit: true, grund: "" });
    assert.equal(jevVerfuegbar(), true);
    await assert.rejects(jevWahl({ verlauf: [], optionen: ["lab.feedback", "lab.farbe"] }), /Tagesgrenze/, "die Meldung der Zwischenstelle kommt an");
    assert.equal(gefragt.url, JEV_LAB_ADRESSE);
    globalThis.fetch = async () => { throw new TypeError("offline"); };
    assert.equal((await jevPruefen()).bereit, false);
  } finally { globalThis.fetch = echt; }
});

// ---------- Klangerzeuger (Lab 0.1.5): Klang ohne Tondatei ----------
const energie = (pcm, a, z) => { let s = 0; for (let i = a; i < z; i++) s += pcm[i] * pcm[i]; return s / Math.max(1, z - a); };
/** Nulldurchgänge je Sekunde: grobes Mass für die Tonhöhe */
const durchgaenge = (pcm, rate) => { let n = 0; for (let i = 1; i < pcm.length; i++) if ((pcm[i - 1] < 0) !== (pcm[i] < 0)) n++; return n / (pcm.length / rate); };
/** dunkles Bild mit einem hellen Feld: Spalten x0–x1, Zeilen y0–y1 (Anteile) */
function feld(x0, x1, y0, y1, w = 80, h = 40) {
  const b = neuesBild(w, h, [0, 0, 0]);
  for (let y = Math.floor(y0 * h); y < Math.floor(y1 * h); y++) for (let x = Math.floor(x0 * w); x < Math.floor(x1 * w); x++) { const i = (y * w + x) * 4; b.data[i] = b.data[i + 1] = b.data[i + 2] = 255; }
  return b;
}

test("Klangerzeuger: Generator ohne Pflichteingang, steht nicht unter den Bildoperationen, Klanggenerator implementiert", () => {
  const r = labRegister();
  assert.deepEqual(r.generatoren().map((o) => o.id), ["orna.konstellation", "lab.klang", "zettel.strophe", "lab.karte"]);
  assert.ok(!r.fuer("IMAGE").some((o) => o.id === "lab.klang"), "Bildoperationen, Vorschläge und Experiment bleiben wie bisher");
  assert.equal(KLANGFORMEN.generator.implementiert, true);
  assert.equal(r.hole("lab.klang").klasse, "zeitlich");
  assert.equal(r.hole("lab.klang").ausgaenge[0].typ, "AUDIO");
});

test("Klangerzeuger aus dem Startwert: derselbe Startwert derselbe Klang, ein anderer ein anderer; Zufall protokolliert", async () => {
  const op = labRegister().hole("lab.klang"), std = { ...standardParameter(op), dauer: 3 };
  const a = await op.ausfuehren({}, std, { seed: 7 }), b = await op.ausfuehren({}, std, { seed: 7 }), c = await op.ausfuehren({}, std, { seed: 8 });
  assert.equal(a.protokoll.quelle, "startwert");
  assert.equal(a.ausgaben[0].typ, "AUDIO");
  assert.equal(a.ausgaben[0].ton.pcm.length, 3 * 44100);
  assert.deepEqual(a.ausgaben[0].ton.pcm, b.ausgaben[0].ton.pcm, "reproduzierbar");
  assert.notDeepEqual(a.ausgaben[0].ton.pcm, c.ausgaben[0].ton.pcm);
  const partitur = a.ausgaben[1].daten;
  assert.equal(partitur.art, "partitur"); assert.equal(partitur.ereignisse.length, a.protokoll.toene);
  assert.ok(partitur.ereignisse.every((e) => e.t >= 0 && e.t < 3 && e.hz >= 110 && e.hz <= 110 * 16 + 1));
  assert.equal(a.entscheidungen[0].art, "zufall"); assert.equal(a.entscheidungen[0].details.startwert, 7);
  let spitze = 0; for (const v of a.ausgaben[0].ton.pcm) spitze = Math.max(spitze, Math.abs(v));
  nahe(spitze, 0.89, 0.01, "auf −1 dBFS gebracht");
  // Stimmung: pentatonische Stufen liegen auf den Halbtönen 0, 2, 4, 7, 9 über dem Grundton
  const raum = { grundton: 100, umfang: 2, stimmung: "pentatonik" };
  for (const x of [0, 0.3, 0.55, 1]) { const h = (12 * Math.log2(KL.tonhoehe(x, raum) / 100)) % 12; assert.ok([0, 2, 4, 7, 9].some((s) => Math.abs(h - s) < 1e-6), `${x}: ${h}`); }
  assert.equal(KL.tonhoehe(1, { grundton: 100, umfang: 3, stimmung: "obertoene" }), 800);
});

test("Klangerzeuger liest ein Bild: links zuerst, hell laut, oben hoch", async () => {
  const op = labRegister().hole("lab.klang"), std = { ...standardParameter(op), dauer: 2, nachhall: 0 };
  const links = (await op.ausfuehren({ bild: feld(0, 0.4, 0, 1) }, std)).ausgaben[0].ton.pcm, n = links.length;
  assert.ok(energie(links, 0, n * 0.3) > 20 * energie(links, n * 0.6, n), "das helle Feld links klingt am Anfang");
  const oben = await op.ausfuehren({ bild: feld(0, 1, 0, 0.25) }, std), unten = await op.ausfuehren({ bild: feld(0, 1, 0.75, 1) }, std);
  assert.ok(durchgaenge(oben.ausgaben[0].ton.pcm, 44100) > 4 * durchgaenge(unten.ausgaben[0].ton.pcm, 44100), "oben hoch, unten tief");
  assert.equal(oben.ausgaben.length, 1, "beim Bild keine Partitur");
  assert.equal(oben.protokoll.gelesen.baender, 24);
  await assert.rejects(op.ausfuehren({ bild: neuesBild(20, 20, [0, 0, 0]) }, std), /ganz dunkel/);
});

test("Klangerzeuger aus Steuersignal und Konstellation; fehlender Eingang wird gemeldet", async () => {
  const op = labRegister().hole("lab.klang"), std = { ...standardParameter(op), dauer: 4, dichte: 2 };
  const s = await op.ausfuehren({ signal: { werte: [0, 0.25, 0.5, 0.75, 1] } }, std);
  const hz = s.ausgaben[1].daten.ereignisse.map((e) => e.hz);
  assert.equal(hz.length, 8); assert.ok(hz.every((h, i) => i === 0 || h >= hz[i - 1]), "steigendes Signal, steigende Töne");
  const gleit = await op.ausfuehren({ signal: { werte: [0, 1] } }, { ...std, stimmung: "gleitend" });
  assert.equal(gleit.ausgaben.length, 1, "gleitend: ein Ton ohne Partitur");
  const k = await op.ausfuehren({ konstellation: { id: "x", text: "Die Form ist eine Unterscheidung. Und sie bezeichnet." } }, std);
  assert.deepEqual(k.ausgaben[1].daten.ereignisse.map((e) => e.wort), ["Die", "Form", "ist", "eine", "Unterscheidung", "Und", "sie", "bezeichnet"]);
  const t = k.ausgaben[1].daten.ereignisse.map((e) => e.t);
  assert.ok(t[5] - t[4] > t[2] - t[1], "langes Wort mit Punkt dauert länger");
  await assert.rejects(op.ausfuehren({}, { ...std, quelle: "bild" }), /braucht ein Bild/);
  await assert.rejects(op.ausfuehren({}, { ...std, quelle: "konstellation" }), /braucht eine Konstellation/);
});

test("Kopplung Bild → Klang → Bild: der Klang wird AUDIO-Ergebnis mit WAV, Tonsignal misst ihn, Varianten über die Dauer, Archiv", async () => {
  const { p, m, e, r } = mitMaterial();
  const k = await fuehreAus({ register: r, projekt: p, medien: m, auftrag: { operation: "lab.klang", eingaben: { bild: e.id }, parameter: { dauer: 2 }, seed: 3,
    variation: { anzahl: 3, routen: [{ ziel: "dauer", tiefe: 1, polaritaet: "einpolig", modulator: { quelle: "saege", frequenz: 0.75, phase: 0 } }] } } });
  const klaenge = k.ergebnisse.filter((x) => x.typ === "AUDIO");
  assert.equal(klaenge.length, 3);
  assert.equal(new Set(klaenge.map((x) => x.ton.dauer)).size, 3, "die Dauer ist moduliert");
  for (const x of klaenge) { assert.match(x.datei, /\.wav$/); assert.equal(x.ton.umriss.length, 200); assert.equal(x.ton.kanaele, 1); }
  const knoten = p.knoten.find((x) => x.operation === "lab.klang");
  assert.equal(knoten.protokoll[0].quelle, "bild"); assert.equal(knoten.seed, 3);
  // WAV hin und zurück
  const wav = m.dateien.get(klaenge[0].datei), gelesen = KL.wavLesen(wav);
  assert.equal(gelesen.rate, 44100); assert.equal(gelesen.pcm.length, m.toene.get(klaenge[0].id).pcm.length);
  nahe(gelesen.pcm[22050], m.toene.get(klaenge[0].id).pcm[22050], 1 / 32767 + 1e-6, "16 Bit");
  // der erzeugte Klang geht wie eine Tondatei ins Tonsignal und moduliert ein Bild
  const s = await fuehreAus({ register: r, projekt: p, medien: m, auftrag: { operation: "lab.tonsignal", eingaben: { ton: klaenge[2].id }, parameter: { proben: 32 } } });
  assert.equal(s.ergebnisse[0].daten.quelle, "ton");
  const w = await fuehreAus({ register: r, projekt: p, medien: m, auftrag: { operation: "lab.wiederholung", eingaben: { bild: e.id }, parameter: { seite: 64 },
    variation: { anzahl: 3, routen: [{ ziel: "drehung", tiefe: 1, modulator: { quelle: "signal", ergebnis: s.ergebnisse[0].id } }] } } });
  assert.equal(w.ergebnisse.length, 3);
  assert.deepEqual(P.pruefeProjekt(p), []);
  const { projekt, medien } = await entpacke(packe(p, m.dateien));
  assert.deepEqual(medien.get(klaenge[0].datei), wav, "die WAV kommt ins Archiv");
  assert.equal(projekt.ergebnisse.filter((x) => x.typ === "AUDIO" && x.knoten).length, 3);
});

// ---------- Klangtransformationen (Lab 0.1.7, docs/KLANGTRANSFORMATION.md) ----------
const KW = await lab("kern/klangwerk.js");

/** ein Beat in Stereo, 48 kHz: Bassschlag auf jedem Schlag (bpm), Rauschen auf jedem Achtel dazwischen, rechts leiser */
function beat({ bpm = 120, sekunden = 6, rate = 48000 } = {}) {
  const n = Math.round(rate * sekunden), L = new Float32Array(n), R = new Float32Array(n), schlag = 60 / bpm;
  const einsaetze = [];
  for (let t = 0; t < sekunden - 0.05; t += schlag) {
    const s = Math.round(t * rate); einsaetze.push(t);
    for (let k = 0; k < 0.2 * rate && s + k < n; k++) { const v = Math.sin((2 * Math.PI * (55 + 80 * Math.exp(-k / 2000)) * k) / rate) * Math.exp(-k / 5000) * Math.min(1, (0.2 * rate - k) / 200) * 0.8; L[s + k] += v; R[s + k] += v; }
  }
  let z = 9;
  for (let t = schlag / 2; t < sekunden - 0.05; t += schlag) {
    const s = Math.round(t * rate); einsaetze.push(t);
    for (let k = 0; k < 0.04 * rate && s + k < n; k++) { z = (z * 1103515245 + 12345) & 0x7fffffff; const v = (z / 0x7fffffff - 0.5) * Math.exp(-k / 500) * 0.5; L[s + k] += v; R[s + k] += v * 0.6; }
  }
  return { ton: KW.alsTon([L, R], rate), einsaetze: einsaetze.sort((a, b) => a - b) };
}
const sinus = (hz, sekunden = 1, rate = 48000) => Float32Array.from({ length: Math.round(sekunden * rate) }, (_, i) => 0.5 * Math.sin((2 * Math.PI * hz * i) / rate));
const frequenz = (s, rate) => { let c = 0; for (let i = 1; i < s.length; i++) if (s[i - 1] < 0 && s[i] >= 0) c++; return c / (s.length / rate); };
function mitBeat(opts) {
  const x = mitMaterial(), b = beat(opts);
  const t = P.fuegeMaterialHinzu(x.p, { titel: "beat.wav", typ: "AUDIO", datei: "medien/beat.wav", mime: "audio/wav", sha256: "b", ton: { dauer: 6, abtastrate: 48000, kanaele: 2 } });
  x.m.toene.set(t.id, b.ton);
  return { ...x, t, b };
}

test("Klangwerk: Umtasten, Dehnen ohne Tonhöhe, Abtastrate, WAV 16/24/32 Bit, Abtastrate aus dem Dateikopf", () => {
  const s = sinus(440);
  const schnell = KW.umtasten(s, 2);
  assert.equal(schnell.length, 24000); nahe(frequenz(schnell, 48000), 880, 4, "Tonband: doppelt so schnell, eine Oktave höher");
  const lang = KW.dehnen([s], 48000, 2)[0];
  assert.equal(lang.length, 96000); nahe(frequenz(lang.subarray(4800, 91200), 48000), 440, 3, "gedehnt: Tonhöhe bleibt");
  const kurz = KW.dehnen([s], 48000, 0.5)[0];
  assert.equal(kurz.length, 24000); nahe(frequenz(kurz.subarray(2400, 21600), 48000), 440, 4, "gestaucht: Tonhöhe bleibt");
  const hoch = KW.rateWandeln(s, 48000, 96000);
  assert.equal(hoch.length, 96000); nahe(frequenz(hoch, 96000), 440, 1, "96 kHz: dieselbe Frequenz");
  for (const [bits, eps] of [["16", 2 / 32767], ["24", 2 / 8388607], ["32f", 0]]) {
    const w = KW.wavSchreiben([s, schnell.length === s.length ? schnell : s.map((v) => -v)], 96000, { bits }), r = KW.wavSpuren(w);
    assert.equal(r.rate, 96000); assert.equal(r.spuren.length, 2); assert.equal(KW.abtastrateLesen(w), 96000);
    nahe(r.spuren[0][1234], s[1234], eps + 1e-7, `${bits} Bit links`); nahe(r.spuren[1][1234], -s[1234], eps + 1e-7, `${bits} Bit rechts`);
  }
  assert.equal(KL.wavLesen(KW.wavSchreiben([s], 44100, { bits: "16" })).rate, 44100, "16 Bit liest auch der alte Leser");
  // Dateiköpfe: FLAC (STREAMINFO), MP3 (MPEG-1 Layer III, 48 kHz), Ogg Opus
  const flac = new Uint8Array(42); flac.set([0x66, 0x4c, 0x61, 0x43]); flac[18] = (88200 >> 12) & 255; flac[19] = (88200 >> 4) & 255; flac[20] = (88200 & 15) << 4;
  assert.equal(KW.abtastrateLesen(flac), 88200);
  assert.equal(KW.abtastrateLesen(Uint8Array.from([0xff, 0xfb, 0x94, 0x00, 0, 0, 0, 0])), 48000);
  const ogg = new Uint8Array(64); ogg.set([0x4f, 0x67, 0x67, 0x53]); ogg.set(new TextEncoder().encode("OpusHead"), 28);
  assert.equal(KW.abtastrateLesen(ogg), 48000);
  assert.equal(KW.abtastrateLesen(new Uint8Array(16)), null);
});

test("Klangwerk: Einsätze liegen auf den Anschlägen, Tempo wird geschätzt, euklidische Muster", () => {
  const { ton, einsaetze } = beat({ bpm: 120 });
  const gefunden = KW.einsaetzeFinden(ton.pcm, 48000);
  for (const t of einsaetze) assert.ok(gefunden.some((e) => Math.abs(e.t - t) < 0.012), `Einsatz bei ${t} s gefunden`);
  assert.ok(gefunden.length <= einsaetze.length + 2, `${gefunden.length} Einsätze statt ${einsaetze.length}`);
  nahe(KW.tempoSchaetzen(ton.pcm, 48000).bpm, 120, 1, "120 BPM");
  nahe(KW.tempoSchaetzen(beat({ bpm: 96 }).ton.pcm, 48000).bpm, 96, 1, "96 BPM");
  assert.deepEqual(KW.euklid(3, 8).map(Number), [1, 0, 0, 1, 0, 0, 1, 0], "E(3,8): der Tresillo");
  assert.equal(KW.euklid(5, 16).filter(Boolean).length, 5);
  assert.deepEqual(KW.textAbstaende("Die Form, ist").map((w) => w.abstand), [3, 4, 3]);
});

test("Tempo und Tonhöhe: Tonband, Dehnen und Schnitte; Ziel-Tempo aus dem geschätzten Tempo; Stereo und Abtastrate bleiben", async () => {
  const op = labRegister().hole("lab.tempo"), std = standardParameter(op), { ton } = beat({ bpm: 120 });
  const s = KW.alsTon([sinus(440, 2)], 48000);
  const band = await op.ausfuehren({ ton: s }, { ...std, verfahren: "band", tempo: 2 });
  nahe(band.ausgaben[0].ton.spuren[0].length, 48000, 1, "halb so lang"); nahe(frequenz(band.ausgaben[0].ton.spuren[0], 48000), 880, 4, "eine Oktave höher");
  nahe(band.protokoll.halbtoene, 12, 0.01, "die Tonhöhe folgt");
  const gedehnt = await op.ausfuehren({ ton: s }, { ...std, tempo: 0.5 });
  assert.equal(gedehnt.ausgaben[0].ton.spuren[0].length, 192000); nahe(frequenz(gedehnt.ausgaben[0].ton.spuren[0].subarray(9600, 182400), 48000), 440, 3, "langsamer, gleiche Tonhöhe");
  const quinte = await op.ausfuehren({ ton: s }, { ...std, halbtoene: 7 });
  assert.equal(quinte.ausgaben[0].ton.spuren[0].length, 96000); nahe(frequenz(quinte.ausgaben[0].ton.spuren[0].subarray(4800, 91200), 48000), 440 * 2 ** (7 / 12), 5, "Quinte ohne Tempo");
  const ziel = await op.ausfuehren({ ton }, { ...std, verfahren: "schnitte", zielBpm: 90 });
  const a = ziel.ausgaben[0].ton;
  assert.equal(a.spuren.length, 2); assert.equal(a.rate, 48000);
  nahe(a.spuren[0].length / 48000, 6 * 120 / 90, 0.01, "auf 90 BPM gedehnt");
  assert.equal(ziel.protokoll.quelle.art, "geschätzt"); nahe(ziel.protokoll.quelle.bpm, 120, 1, "Quelle geschätzt");
  const neu = KW.einsaetzeFinden(a.pcm, 48000);
  assert.ok(neu.some((e) => Math.abs(e.t - 4 / 3) < 0.015) && neu.some((e) => Math.abs(e.t - 2) < 0.015), "die Schläge liegen im neuen Raster");
  assert.ok(KW.spitze(a.spuren) <= 0.967, "keine Übersteuerung");
  assert.deepEqual((await op.ausfuehren({ ton }, { ...std, tempo: 1.3 })).ausgaben[0].ton.pcm, (await op.ausfuehren({ ton }, { ...std, tempo: 1.3 })).ausgaben[0].ton.pcm, "reproduzierbar");
});

test("Dekonstruktion: Schnitte umordnen, wiederholen, umkehren; mit Startwert wiederholbar; Ereignisfolge und Konstellation als Eingang", async () => {
  const op = labRegister().hole("lab.zerlegen"), std = standardParameter(op), { ton, einsaetze } = beat();
  const a = await op.ausfuehren({ ton }, std, { seed: 4 }), b = await op.ausfuehren({ ton }, std, { seed: 4 }), c = await op.ausfuehren({ ton }, std, { seed: 5 });
  assert.deepEqual(a.ausgaben[0].ton.pcm, b.ausgaben[0].ton.pcm, "derselbe Startwert, derselbe Klang");
  assert.notDeepEqual(a.protokoll.folge, c.protokoll.folge);
  assert.equal(a.entscheidungen[0].art, "zufall"); assert.equal(a.entscheidungen[0].details.startwert, 4);
  const ordnung = a.ausgaben[1].daten;
  assert.equal(ordnung.art, "schnitte"); assert.equal(ordnung.ereignisse.length, a.protokoll.stuecke);
  assert.ok(Math.abs(a.protokoll.schnitte - einsaetze.length) <= 2, `${a.protokoll.schnitte} Schnitte`);
  const rueck = await op.ausfuehren({ ton }, { ...std, reihenfolge: "rueckwaerts", wiederholen: 0, umkehren: 0 });
  const quellen = rueck.ausgaben[1].daten.ereignisse.map((e) => e.quelle);
  assert.deepEqual(quellen, [...quellen].sort((x, y) => y - x), "rückwärts: die letzten Schnitte zuerst");
  nahe(rueck.ausgaben[0].ton.spuren[0].length, ton.spuren[0].length, 1, "ohne Wiederholung gleich lang");
  assert.deepEqual(rueck.entscheidungen, [], "ohne Zufall keine Zufallsentscheidung");
  // eigene Schnittstellen aus einer Ereignisfolge
  const folge = { ereignisse: [{ t: 0 }, { t: 1 }, { t: 2.5 }], beginn: 0 };
  const drei = await op.ausfuehren({ ton, einsaetze: folge }, { ...std, schnitt: "ereignisfolge", reihenfolge: "behalten", wiederholen: 0, umkehren: 0 });
  assert.equal(drei.protokoll.schnitte, 3);
  await assert.rejects(op.ausfuehren({ ton }, { ...std, schnitt: "ereignisfolge" }), /braucht eine Ereignisfolge/);
  await assert.rejects(op.ausfuehren({ ton }, { ...std, reihenfolge: "konstellation" }), /braucht eine Konstellation/);
  const text = await op.ausfuehren({ ton, konstellation: { text: "Zeit ist Anfang" } }, { ...std, reihenfolge: "konstellation", wiederholen: 0, umkehren: 0 });
  assert.deepEqual(text.protokoll.folge.slice(0, 3), [2, 5, 8], "erst die Schnitte, denen «Anfang» zufällt");
});

test("Neu-Rhythmisierung: euklidisch, im neuen Tempo, nahtlos schleifbar; Muster aus einer Ereignisfolge, einem Signal, der Konstellation", async () => {
  const op = labRegister().hole("lab.rhythmus"), std = standardParameter(op), { ton } = beat({ bpm: 120 });
  const e = await op.ausfuehren({ ton }, { ...std, bpm: 100, takte: 2, schritte: 16, treffer: 5 }, { seed: 2 });
  const r = e.ausgaben[1].daten;
  assert.equal(r.art, "rhythmus"); assert.equal(r.bpm, 100); assert.equal(r.raster, 16); assert.deepEqual(r.takt, [4, 4]);
  assert.equal(r.ereignisse.length, 10, "5 Treffer je Takt");
  assert.deepEqual(r.ereignisse.slice(0, 5).map((x) => x.schritt), [0, 4, 7, 10, 13], "E(5,16)");
  nahe(e.ausgaben[0].ton.spuren[0].length / 48000, 2 * 4 * 60 / 100, 1e-3, "zwei Takte bei 100 BPM");
  assert.equal(e.ausgaben[0].ton.spuren.length, 2);
  const neu = KW.einsaetzeFinden(e.ausgaben[0].ton.pcm, 48000), schritt = 60 / 100 / 4;
  for (const x of r.ereignisse.slice(0, 5)) assert.ok(neu.some((y) => Math.abs(y.t - x.schritt * schritt) < 0.015), `Treffer auf Schritt ${x.schritt}`);
  // der Rhythmus eines Klangs als Muster für einen anderen: dieselben Schritte
  const uebertragen = await op.ausfuehren({ ton, muster: r }, { ...std, muster: "ereignisfolge", bpm: 140 });
  assert.deepEqual(uebertragen.ausgaben[1].daten.ereignisse.map((x) => x.schritt), r.ereignisse.map((x) => x.schritt));
  // ein Steuersignal: nur wo es über der Schwelle liegt
  const sig = await op.ausfuehren({ ton, signal: { werte: [0, 0, 1, 1] } }, { ...std, muster: "signal", dichte: 0.5, takte: 1 });
  assert.ok(sig.ausgaben[1].daten.ereignisse.every((x) => x.schritt >= 8), "die erste Hälfte bleibt still");
  const text = await op.ausfuehren({ ton, konstellation: { text: "Die Form ist eine Unterscheidung" } }, { ...std, muster: "konstellation", takte: 1 });
  assert.deepEqual(text.ausgaben[1].daten.ereignisse.slice(0, 4).map((x) => x.schritt), [0, 3, 7, 10]);
  // die eigenen Einsätze, ins Raster gesetzt: Quantisieren
  const q = await op.ausfuehren({ ton }, { ...std, muster: "quelle", takte: 1 });
  assert.deepEqual(q.ausgaben[1].daten.ereignisse.map((x) => x.schritt), [0, 2, 4, 6, 8, 10, 12, 14]);
  await assert.rejects(op.ausfuehren({ ton }, { ...std, muster: "ereignisfolge" }), /braucht eine Ereignisfolge/);
  await assert.rejects(op.ausfuehren({ ton }, { ...std, muster: "signal", takte: 1 }), /braucht ein Steuersignal/);
  await assert.rejects(op.ausfuehren({ ton, signal: { werte: [0, 0.1] } }, { ...std, muster: "signal", dichte: 0.2, takte: 1 }), /keinen Treffer/);
});

test("Körner: Dauer, Stereo aus Mono, Lesekopf nach Steuersignal, reproduzierbar", async () => {
  const op = labRegister().hole("lab.koerner"), std = { ...standardParameter(op), dauer: 2 }, s = KW.alsTon([sinus(330, 2)], 48000);
  const a = await op.ausfuehren({ ton: s }, std, { seed: 1 }), b = await op.ausfuehren({ ton: s }, std, { seed: 1 });
  assert.equal(a.ausgaben[0].ton.spuren.length, 2, "Stereobreite macht aus mono stereo"); assert.equal(a.ausgaben[0].ton.spuren[0].length, 96000);
  assert.deepEqual(a.ausgaben[0].ton.pcm, b.ausgaben[0].ton.pcm);
  nahe(KW.spitze(a.ausgaben[0].ton.spuren), 0.891, 0.01, "auf −1 dBFS");
  const hoch = await op.ausfuehren({ ton: s }, { ...std, tonhoehe: 12, breite: 0 }, { seed: 1 });
  nahe(frequenz(hoch.ausgaben[0].ton.spuren[0], 48000), 660, 25, "eine Oktave höher");
  await assert.rejects(op.ausfuehren({ ton: s }, { ...std, leser: "signal" }), /braucht ein Steuersignal/);
  const g = await op.ausfuehren({ ton: s, signal: { werte: [0.2, 0.8] } }, { ...std, leser: "signal" });
  assert.equal(g.entscheidungen[0].details.startwert, 1);
});

test("Klangtransformationen im Projekt: sechs Tempi nebeneinander, Kette auf einen anderen Beat, Takt und Tonspur aus dem neuen Rhythmus, Archiv", async () => {
  const { p, m, r, t, e } = mitBeat();
  const v = await fuehreAus({ register: r, projekt: p, medien: m, auftrag: { operation: "lab.tempo", eingaben: { ton: t.id }, parameter: { verfahren: "schnitte" }, seed: 1,
    variation: { anzahl: 6, routen: [{ ziel: "tempo", tiefe: 0.5, modulator: { quelle: "saege", frequenz: 0.75, phase: 0 } }] } } });
  assert.equal(v.ergebnisse.length, 6);
  assert.equal(new Set(v.ergebnisse.map((x) => x.ton.dauer)).size, 6, "sechs verschiedene Tempi");
  for (const x of v.ergebnisse) { assert.equal(x.typ, "AUDIO"); assert.equal(x.ton.kanaele, 2); assert.equal(x.ton.abtastrate, 48000); assert.match(x.datei, /\.wav$/); }
  // weiterführen: ein Ergebnis wird Ausgang der nächsten Transformation
  P.waehleVariante(p, v.ergebnisse[2].id);
  const rh = await fuehreAus({ register: r, projekt: p, medien: m, auftrag: { operation: "lab.rhythmus", eingaben: { ton: v.ergebnisse[2].id }, parameter: { bpm: 110 }, seed: 8 } });
  const [klang, folge] = rh.ergebnisse;
  assert.deepEqual([klang.typ, folge.typ], ["AUDIO", "EVENT_SEQUENCE"]);
  assert.deepEqual(P.verlauf(p, klang.id).schritte.map((s) => s.knoten.operation), ["lab.tempo", "lab.rhythmus"]);
  // der neue Rhythmus gibt einem Film über Stationen den Takt, und sein eigener Klang ist die Tonspur
  const w = await fuehreAus({ register: r, projekt: p, medien: m, auftrag: { operation: "lab.wiederholung", eingaben: { bild: e.id }, parameter: { seite: 64 }, variation: { anzahl: 2 } } });
  const pt = ST.partitur(p, { stationen: w.ergebnisse.map((x) => x.id), takt: { ereignisfolge: folge.id, schwelle: 0 } });
  assert.equal(pt.takt.ton, klang.id, "die Tonspur ist der neu rhythmisierte Klang, nicht die Quelle");
  // die Kette (Tempo → Rhythmus) auf einen anderen Beat anwenden
  P.waehleVariante(p, klang.id);
  const kette = P.ketteAusVerlauf(p, klang.id, "schneller und neu gesetzt");
  const t2 = P.fuegeMaterialHinzu(p, { titel: "beat2.wav", typ: "AUDIO", datei: "medien/b2.wav", mime: "audio/wav", sha256: "c", ton: { dauer: 6, abtastrate: 48000, kanaele: 2 } });
  m.toene.set(t2.id, beat({ bpm: 96 }).ton);
  const ende = await ketteAnwenden({ register: r, projekt: p, medien: m, kette, start: t2.id });
  assert.equal(P.ergebnis(p, ende).typ, "AUDIO");
  assert.deepEqual(P.pruefeProjekt(p), []);
  const { projekt } = await entpacke(packe(p, m.dateien));
  assert.equal(projekt.formatVersion, "0.7.0");
  assert.equal(projekt.ergebnisse.filter((x) => x.typ === "AUDIO" && x.knoten).length, 6 + 1 + 6 + 1);
});

// ---------- Vorschlag für 30 s aus Bild und Klang (Lab 0.1.11) ----------
test("Vorschlag: messen in festen Stufen, Regeln ohne jev, jev-Lage nur aus Kennungen, Rezepte aus dem Register", async () => {
  const VS = await lab("kern/vorschlag.js");
  const { DRAMATURGIEN, MERKMALE, labLage, labFrage } = await lab("jev/fragen.js");
  const r = labRegister();
  assert.deepEqual(Object.keys(VS.REZEPTE), Object.keys(DRAMATURGIEN), "jeder Dramaturgie im jev-Katalog gehört ein Rezept");
  for (const [id, x] of Object.entries(VS.REZEPTE)) for (const s of x.schritte) {
    assert.ok(r.hat(s.operation), `${id}: ${s.operation}`);
    const op = r.hole(s.operation);
    if (s.route) assert.equal(op.parameter.find((p) => p.id === s.route.ziel)?.art, "zahl", `${id}: ${s.route.ziel} ist modulierbar`);
    for (const k of Object.keys(s.parameter)) assert.ok(op.parameter.some((p) => p.id === k), `${id}: Parameter ${k}`);
  }
  const { p, m, e, t } = mitTon();
  const mg = await VS.messen({ register: r, projekt: p, medien: m, bild: e.id, ton: t.id });
  assert.deepEqual(Object.keys(mg.merkmale).sort(), [...Object.keys(MERKMALE.bild), ...Object.keys(MERKMALE.klang)].sort());
  assert.equal(mg.merkmale.dichte, "bewegt", `je halbe Sekunde ein Anschlag: ${mg.werte.anschlaegeJeSekunde}`);
  assert.equal(mg.merkmale.dynamik, "anschwellend", `leise, dann laut: ${mg.werte.lautAnfang} → ${mg.werte.lautEnde}`);
  assert.deepEqual(p.knoten.map((k) => k.operation), ["lab.tonsignal", "lab.profil"], "messen steht im Projekt");
  assert.equal(P.ergebnis(p, mg.signal).daten.dauer, 6);
  const lage = labLage(VS.jevLage(mg));
  assert.deepEqual(lage.optionen, Object.keys(DRAMATURGIEN));
  assert.ok(!JSON.stringify(lage).match(/medien|\.wav|\.png/), "jev bekommt nur Stufen und Kennungen");
  const f = labFrage(lage);
  assert.deepEqual(Object.keys(f.zustand), ["labor", "bild", "klang"]);
  assert.match(f.zustand.klang, /über die Zeit lauter/);
  assert.throws(() => labLage({ ...VS.jevLage(mg), frage: "dramaturgie", merkmale: { ...mg.merkmale, dichte: "frei erfunden" } }), /Merkmal dichte/);
  assert.throws(() => labLage({ frage: "dramaturgie", merkmale: mg.merkmale, optionen: ["vorschlag.puls", "lab.feedback"] }), /Dramaturgien/);
  assert.throws(() => labLage({ frage: "dramaturgie", merkmale: { ...mg.merkmale, bild: "x" }, optionen: ["vorschlag.puls", "vorschlag.raster"] }), /unbekannte Merkmale/);
  const regel = VS.regelDramaturgie(mg.merkmale);
  assert.equal(regel[0].dramaturgie, "vorschlag.steigerung", "lauter werdend → Steigerung");
  assert.ok(regel[0].gruende.length > 0);
  assert.equal(VS.taktSchwelle({ ereignisse: [{ t: 1, staerke: 1 }], dauer: 30 }, 1), null, "zu wenige Anschläge");
  assert.equal(VS.taktSchwelle({ ereignisse: Array.from({ length: 10 }, (_, i) => ({ t: i + 1, staerke: i / 10 })), dauer: 4 }, 1), 0.6, "die vier stärksten");
});

test("Vorschlag: eine Dramaturgie ausführen ergibt Stationen und einen Plan von höchstens 30 s, im Takt der Anschläge mit Tonspur", async () => {
  const VS = await lab("kern/vorschlag.js");
  const r = labRegister();
  const { p, m, e, t } = mitTon();
  const mg = await VS.messen({ register: r, projekt: p, medien: m, bild: e.id, ton: t.id, beginn: 1 });
  const x = await VS.vorschlagAusfuehren({ register: r, projekt: p, medien: m, messung: mg, dramaturgie: "vorschlag.raster", wahl: { art: "regel", details: { rang: 1 } }, seed: 3 });
  assert.equal(x.entscheidung.art, "regel"); assert.equal(x.entscheidung.gegenstand, "dramaturgie"); assert.equal(x.entscheidung.details.merkmale.dichte, mg.merkmale.dichte);
  assert.equal(x.ergebnisse.length, 6);
  const groessen = x.ergebnisse.map((y) => y.variante.parameter.groesse);
  assert.ok(new Set(groessen).size > 1, `die Lautstärke verteilt die Grösse: ${groessen}`);
  assert.equal(x.plan.stationen[0], e.id); assert.equal(x.plan.stationen.length, 7);
  assert.equal(x.plan.tonspur, t.id); assert.equal(x.plan.tonBeginn, 1); assert.equal(x.plan.dauer, 5);
  assert.ok(x.plan.takt, "Anschläge genug für einen Takt");
  const pt = ST.partitur(p, { ...x.plan, fps: 30 });
  assert.equal(pt.dauer, 5, "so lang wie der gemessene Ausschnitt");
  assert.equal(pt.takt.ton, t.id);
  assert.ok(pt.folge.length > 7, "reihum im Takt");
  const k = p.knoten.at(-1);
  assert.equal(p.entscheidungen.find((d) => d.knoten === k.id).art, "regel");
  // ohne Takt (Steigerung): drei Schritte nacheinander, das Halten füllt die Dauer
  const s = await VS.vorschlagAusfuehren({ register: r, projekt: p, medien: m, messung: mg, dramaturgie: "vorschlag.steigerung", wahl: { art: "jev", details: { wahrscheinlichkeit: 0.5 } } });
  assert.deepEqual(p.knoten.slice(-3).map((k) => k.operation), ["lab.farbe", "lab.wiederholung", "lab.feedback"]);
  assert.equal(P.knoten(p, p.knoten.at(-1).id).eingaben.bild, p.knoten.at(-2).ausgaben[0], "jeder Schritt auf dem vorigen");
  assert.equal(s.plan.takt, null);
  const ps = ST.partitur(p, { ...s.plan, fps: 30 });
  assert.ok(Math.abs(ps.dauer - 5) < 0.2, `${ps.dauer}`);
  await assert.rejects(VS.vorschlagAusfuehren({ register: r, projekt: p, medien: m, messung: mg, dramaturgie: "vorschlag.gibtsnicht", wahl: { art: "mensch" } }), /gibt es nicht/);
  assert.deepEqual(P.pruefeProjekt(p), []);
});

test("Stationen mit Bewegung (Lab 0.1.15): die Kamera macht jedes Bild anders, der Zoom atmet mit dem Signal, reproduzierbar", async () => {
  const VS = await lab("kern/vorschlag.js");
  const { p, m, e, t, r } = mitTon();
  const mg = await VS.messen({ register: r, projekt: p, medien: m, bild: e.id, ton: t.id, beginn: 1 });
  const x = await VS.vorschlagAusfuehren({ register: r, projekt: p, medien: m, messung: mg, dramaturgie: "vorschlag.steigerung", wahl: { art: "regel", details: {} } });
  assert.deepEqual(x.plan.bewegung, { staerke: 0.6, signal: mg.signal });
  const pt = ST.partitur(p, { ...x.plan, fps: 10 });
  assert.deepEqual(pt.bewegung, { staerke: 0.6, signal: mg.signal });
  const rechne = async (pl) => { const out = []; for await (const b of ST.filmbilder({ register: r, projekt: p, medien: m, partitur: pl, seite: 40 })) out.push(fingerabdruck(b)); return out; };
  const a = await rechne(pt);
  assert.equal(a.length, pt.bilder);
  assert.ok(new Set(a).size > 0.9 * a.length, `fast jedes Bild ist anders: ${new Set(a).size} von ${a.length}`);
  assert.deepEqual(await rechne(pt), a, "derselbe Plan, dieselben Bilder");
  const ruhig = ST.partitur(p, { ...x.plan, bewegung: null, fps: 10 });
  assert.equal(ruhig.bewegung, null);
  assert.ok(new Set(await rechne(ruhig)).size < new Set(a).size, "ohne Bewegung stehen die Stationen");
  assert.ok(ST.kameraLage(3, 1, 1).zoom > ST.kameraLage(3, 1, 0).zoom, "lauter zoomt näher");
  assert.equal(ST.kameraLage(3, 0, 1).zoom, 1);
  assert.throws(() => ST.partitur(p, { ...x.plan, bewegung: { staerke: 0.5, signal: e.id } }), /Bewegung/);
});

test("Stationen lebendig (Lab 0.1.17): mit lebendiger Fassung rechnet der Film jede Station in jedem Bild neu, ohne bleibt alles wie bisher", async () => {
  const VS = await lab("kern/vorschlag.js");
  const { p, m, e, t, r } = mitTon();
  const mg = await VS.messen({ register: r, projekt: p, medien: m, bild: e.id, ton: t.id, beginn: 1 });
  const x = await VS.vorschlagAusfuehren({ register: r, projekt: p, medien: m, messung: mg, dramaturgie: "vorschlag.steigerung", wahl: { art: "regel", details: {} } });
  assert.equal(x.plan.lebendig, true);
  const pt = ST.partitur(p, { ...x.plan, bewegung: null, fps: 10 });
  assert.equal(pt.lebendig, true);
  assert.equal(ST.partitur(p, { ...x.plan, lebendig: false, fps: 10 }).lebendig, false);
  // eine vorgetäuschte Grafikkarte: kennt Farbe und Feedback, stempelt Operation, Zeit und Parameter ins Bild
  const aufrufe = [];
  const fake = { kann: (op) => op === "lab.farbe" || op === "lab.feedback", vergiss() {},
    bild: ({ operation, eingang, parameter, t, W, H, schluessel }) => { aufrufe.push({ operation, t, schluessel, farbdrehung: parameter.farbdrehung, zoom: parameter.zoom }); const b = neuesBild(W, H); b.data.fill(Math.round(t * 10) % 256); b.stempel = { operation, ein: eingang.width }; return b; } };
  const rechne = async (pl, lebendig) => { const zeitplan = [], out = []; for await (const b of ST.filmbilder({ register: r, projekt: p, medien: m, partitur: pl, seite: 40, zeitplan, lebendig })) out.push(b); return { zeitplan, out }; };
  const a = await rechne(pt, fake);
  assert.equal(a.out.length, pt.bilder);
  const lebendige = a.zeitplan.filter((z) => z.lebendig);
  assert.ok(lebendige.length >= 2, `Farbe und Feedback sind lebendig: ${JSON.stringify(a.zeitplan)}`);
  assert.ok(a.zeitplan.some((z) => !z.lebendig), "die Wiederholung bleibt ein Standbild (keine lebendige Fassung im Fake)");
  assert.ok(a.out.some((b) => b.stempel?.operation === "lab.farbe") && a.out.some((b) => b.stempel?.operation === "lab.feedback"));
  assert.ok(aufrufe.every((c) => c.t >= 0 && c.t <= pt.dauer + 1e-9), "die Zeit läuft über den Film");
  assert.ok(new Set(aufrufe.map((c) => c.t)).size > 5, "jedes Bild zu seiner Zeit");
  assert.equal(new Set(aufrufe.filter((c) => c.operation === "lab.farbe").map((c) => c.farbdrehung)).size, 1, "Steigerung: Farbe ohne Route, die Parameter stehen fest");
  // Farbwelle: die Lautstärke verteilt die Farbdrehung über die Varianten, lebendig läuft sie über die Zeit des Films
  const w = await VS.vorschlagAusfuehren({ register: r, projekt: p, medien: m, messung: mg, dramaturgie: "vorschlag.farbwelle", wahl: { art: "regel", details: {} } });
  aufrufe.length = 0;
  await rechne(ST.partitur(p, { ...w.plan, bewegung: null, fps: 10 }), fake);
  assert.ok(new Set(aufrufe.filter((c) => c.operation === "lab.farbe").map((c) => c.farbdrehung)).size > 3, "die Route der Varianten läuft über die Zeit des Films");
  // ohne Grafikkarte, oder ohne lebendig im Plan: dieselben Standbilder wie bisher
  const ohne = await rechne(pt, null), still = await rechne(ST.partitur(p, { ...x.plan, bewegung: null, lebendig: false, fps: 10 }), fake);
  assert.ok(ohne.out.every((b) => !b.stempel) && still.out.every((b) => !b.stempel));
  assert.ok(ohne.zeitplan.every((z) => !z.lebendig));
  assert.deepEqual(ohne.out.map(fingerabdruck), still.out.map(fingerabdruck));
});

const FILTER = ["lab.glitch", "lab.pixelsortierung", "lab.verzerrung", "lab.licht", "lab.raster", "lab.neusetzen"];

test("Bildfilter (0.1.10): jeder verändert das Bild, ist mit demselben Startwert wiederholbar, Anteil 0 lässt den Eingang stehen", async () => {
  const r = labRegister(), b = bild();
  for (const id of FILTER) {
    const op = r.hole(id), p = { ...standardParameter(op), seite: 96 };
    assert.equal(op.varianten, "moduliert", id);
    assert.ok(op.verlauf && op.moduliert && op.parameter.some((q) => q.id === op.moduliert), `${id}: Verlauf und Modulationsziel`);
    const a = await op.ausfuehren({ bild: b }, p, { seed: 5 }), a2 = await op.ausfuehren({ bild: b }, p, { seed: 5 });
    const x = a.ausgaben[0].bild;
    assert.deepEqual([x.width, x.height], [96, 72], id);
    assert.equal(fingerabdruck(x), fingerabdruck(a2.ausgaben[0].bild), `${id}: wiederholbar`);
    assert.notEqual(fingerabdruck(x), fingerabdruck(b), `${id}: verändert das Bild`);
    const leer = await op.ausfuehren({ bild: b }, { ...p, anteil: 0 }, { seed: 5 });
    assert.equal(fingerabdruck(leer.ausgaben[0].bild), fingerabdruck(b), `${id}: Anteil 0 ist der Eingang`);
    assert.equal(a.protokoll.anteil, 1, id);
    if (op.parameter.some((q) => q.id === "flackern")) {
      const q = id === "lab.pixelsortierung" ? { ...p, laenge: 0.3, zufall: 0.8 } : p;   // die Sortierung würfelt nur die Abschnittslängen
      const [c, c2] = [await op.ausfuehren({ bild: b }, q, { seed: 6 }), await op.ausfuehren({ bild: b }, q, { seed: 5 })];
      assert.notEqual(fingerabdruck(c.ausgaben[0].bild), fingerabdruck(c2.ausgaben[0].bild), `${id}: ein anderer Startwert würfelt anders`);
    }
  }
});

test("Bildfilter: der Verlauf wächst vom Eingang zum Ergebnis; Flackern und Zeitmodulation enden beim Ergebnis", async () => {
  const r = labRegister(), b = bild();
  for (const id of FILTER) {
    const op = r.hole(id), p = { ...standardParameter(op), seite: 96, bilder: 5, flackern: true };
    const fl = [];
    for await (const f of op.verlauf({ bild: b }, p, { seed: 3 })) fl.push(fingerabdruck(f.bild));
    assert.equal(fl.length, op.verlaufBilder(p), id);
    assert.equal(fl[0], fingerabdruck(b), `${id}: das erste Bild ist der Eingang`);
    const end = await op.ausfuehren({ bild: b }, p, { seed: 3 });
    assert.equal(fl.at(-1), fingerabdruck(end.ausgaben[0].bild), `${id}: das letzte Bild ist das Ergebnis`);
  }
  const op = r.hole("lab.verzerrung"), p = { ...standardParameter(op), art: "welle", seite: 96, bilder: 4 };
  const zeitRouten = [{ ziel: "phase", tiefe: 1, modulator: { quelle: "saege", frequenz: 0.75, phase: 0 } }];
  const fl = [];
  for await (const f of op.verlauf({ bild: b }, p, { seed: 1, zeitRouten })) fl.push(fingerabdruck(f.bild));
  assert.equal(new Set(fl).size, 4, "die Phase wandert über die Zeit");
  const end = await op.ausfuehren({ bild: b }, p, { seed: 1, zeitRouten });
  assert.equal(fl.at(-1), fingerabdruck(end.ausgaben[0].bild));
});

test("Pixelsortierung: mit offenen Schwellen ist jede Zeile nach Helligkeit sortiert, ausserhalb der Schwellen bleibt alles stehen", async () => {
  const { pixelsortierung } = await lab("operationen/pixelsortierung.js");
  const b = bild(), basis = { richtung: "waagrecht", schluessel: "helligkeit", unten: 0, oben: 1, auswahl: "innerhalb", laenge: 1, zufall: 0, umkehren: false };
  const { bild: s, protokoll } = pixelsortierung(b, basis, 1);
  assert.equal(protokoll.anteilSortiert, 1);
  const hell = (d, i) => 0.2126 * d[i] + 0.7152 * d[i + 1] + 0.0722 * d[i + 2];
  for (let y = 0; y < s.height; y += 7) for (let x = 1; x < s.width; x++) assert.ok(Math.round(hell(s.data, (y * s.width + x) * 4)) >= Math.round(hell(s.data, (y * s.width + x - 1) * 4)), `Zeile ${y}`);
  const roh = (x) => [...x.data].sort().join();
  assert.equal(roh(s), roh(b), "nur umgeordnet, kein Pixel verändert");
  const nichts = pixelsortierung(b, { ...basis, auswahl: "ausserhalb" }, 1);
  assert.equal(fingerabdruck(nichts.bild), fingerabdruck(b));
});

test("Bildfilter im Projekt: Varianten über die Modulation, ein zweites Bild versetzt, Kette Glitch → Pixelsortierung → Raster, Animation, Archiv", async () => {
  const { p, m, e, r } = mitMaterial();
  const g = await fuehreAus({ register: r, projekt: p, medien: m, auftrag: { operation: "lab.glitch", eingaben: { bild: e.id }, parameter: { seite: 96 }, seed: 11,
    variation: { anzahl: 4, routen: [{ ziel: "kanalversatz", tiefe: 0.5, polaritaet: "einpolig", modulator: { quelle: "saege", frequenz: 0.75, phase: 0 } }] } } });
  assert.equal(g.ergebnisse.length, 4);
  assert.deepEqual(g.ergebnisse.map((x) => x.variante.seed), [11, 12, 13, 14], "jede Variante mit eigenem, protokolliertem Startwert");
  const kv = g.ergebnisse.map((x) => x.variante.parameter.kanalversatz);
  assert.ok(kv.every((v, i) => !i || v > kv[i - 1]), `der Versatz wächst über die Reihe: ${kv}`);
  P.waehleVariante(p, g.ergebnisse[2].id);
  const s = await fuehreAus({ register: r, projekt: p, medien: m, auftrag: { operation: "lab.pixelsortierung", eingaben: { bild: g.ergebnisse[2].id }, parameter: { seite: 96, richtung: "senkrecht" } } });
  const v = await fuehreAus({ register: r, projekt: p, medien: m, auftrag: { operation: "lab.verzerrung", eingaben: { bild: s.ergebnisse[0].id, steuerbild: e.id }, parameter: { seite: 96, art: "versetzen" } } });
  assert.equal(v.knoten.protokoll.steuerbild, true, "das Material steuert die Verschiebung");
  const ra = await fuehreAus({ register: r, projekt: p, medien: m, auftrag: { operation: "lab.raster", eingaben: { bild: s.ergebnisse[0].id }, parameter: { seite: 96, bilder: 6 },
    variation: { achse: "zeit", routen: [{ ziel: "zelle", tiefe: 0.3, modulator: { quelle: "sinus", frequenz: 1, phase: 0 } }] } } });
  let n = 0; for await (const _ of bildfolge({ register: r, projekt: p, medien: m, ergebnisId: ra.ergebnisse[0].id })) n++;
  assert.equal(n, 6, "die Animation rechnet den Verlauf des Rasters");
  P.waehleVariante(p, s.ergebnisse[0].id); P.waehleVariante(p, ra.ergebnisse[0].id);
  assert.deepEqual(P.verlauf(p, ra.ergebnisse[0].id).schritte.map((x) => x.knoten.operation), ["lab.glitch", "lab.pixelsortierung", "lab.raster"]);
  const kette = P.ketteAusVerlauf(p, ra.ergebnisse[0].id, "Glitch, Sortierung, Raster");
  const ende = await ketteAnwenden({ register: r, projekt: p, medien: m, kette, start: e.id });
  assert.equal(P.ergebnis(p, ende).typ, "IMAGE");
  assert.deepEqual(P.pruefeProjekt(p), []);
  const { projekt } = await entpacke(packe(p, m.dateien));
  assert.equal(projekt.formatVersion, "0.7.0", "die Filter brauchen kein neues Projektformat");
});

// ---------- Zusammenstellung durch jev (Lab 0.1.12) ----------
test("Zusammenstellung: Kataloge passen zum Register, Ziehen mit Startwert ohne Wiederholung, jev-Antwort geprüft", async () => {
  const Z = await lab("kern/zusammenstellung.js");
  const F = await lab("jev/fragen.js");
  const { jevKomposition } = await lab("jev/jev.js");
  const r = labRegister();
  assert.deepEqual(Object.keys(Z.BILD_REZEPTE), Object.keys(F.BILD_EFFEKTE));
  assert.deepEqual(Object.keys(Z.KLANG_REZEPTE), Object.keys(F.KLANG_EFFEKTE));
  for (const [id, x] of Object.entries({ ...Z.BILD_REZEPTE, ...Z.KLANG_REZEPTE })) if (x) {
    assert.ok(r.hat(x.operation), id);
    const op = r.hole(x.operation);
    for (const k of Object.keys(x.parameter)) assert.ok(op.parameter.some((p) => p.id === k), `${id}: ${k}`);
    if (x.ziel) assert.equal(op.parameter.find((p) => p.id === x.ziel)?.art, "zahl", `${id}: ${x.ziel}`);
    if (id.startsWith("bild.") && x.ziel === undefined) assert.ok(op.moduliert, `${id}: Operation schlägt ein Ziel vor`);
  }
  const g = Z.gleichverteilt();
  assert.deepEqual(Object.keys(g), Object.keys(F.KOMPOSITION_FRAGEN));
  const a = Z.zusammenstellen(g, 42), b = Z.zusammenstellen(g, 42), c = Z.zusammenstellen(g, 43);
  assert.deepEqual(a, b, "derselbe Startwert, dieselbe Wahl");
  assert.notDeepEqual(a, c);
  for (let s = 1; s < 60; s++) {
    const x = Z.zusammenstellen(g, s);
    assert.equal(x.bild.length, F.ABSCHNITTE);
    assert.ok(x.bild.every((y, i) => i === 0 || y !== x.bild[i - 1]), `kein Effekt zweimal hintereinander: ${x.bild}`);
    assert.ok(x.klang[0] === "klang.keine" || x.klang[1] !== x.klang[0]);
  }
  // jev sagt fast sicher Glitch: trotzdem nie zweimal hintereinander
  const fast = { ...g, bild1: { ...g.bild1 } };
  for (const k of Object.keys(g).filter((k) => k.startsWith("bild"))) fast[k] = Object.fromEntries(Object.keys(F.BILD_EFFEKTE).map((o) => [o, o === "bild.glitch" ? 0.95 : 0.005]));
  const x = Z.zusammenstellen(fast, 5);
  assert.equal(x.bild.filter((y) => y === "bild.glitch").length, 3, `${x.bild}`);
  assert.equal(Z.wahrscheinlichkeit(fast, "bild1", "bild.glitch"), Math.round((0.95 / (0.95 + 10 * 0.005)) * 1000) / 1000);
  // jev.js: alle zehn Antworten, nur bekannte Optionen; fehlt eine, ist die Antwort ungültig
  const echt = globalThis.fetch;
  const merkmale = { kontrast: "hoch", farbigkeit: "bunt", symmetrie: "asymmetrisch", helligkeit: "dunkel", dichte: "dicht", dynamik: "wechselhaft" };
  try {
    let gefragt = null;
    globalThis.fetch = async (url, o) => { gefragt = JSON.parse(o.body); return new Response(JSON.stringify({ antworten: Object.fromEntries(Object.entries(g).map(([k, w]) => [k, { ...w, fremd: 1 }])), modell: "jev-test" })); };
    const j = await jevKomposition({ merkmale }, { adresse: "http://localhost:1/wahl" });
    assert.deepEqual(gefragt, { frage: "komposition", merkmale });
    assert.deepEqual(Object.keys(j.antworten), Object.keys(g));
    assert.ok(!("fremd" in j.antworten.bild1));
    assert.equal(j.quelle, "live");
    globalThis.fetch = async () => new Response(JSON.stringify({ antworten: { aufbau: g.aufbau }, modell: "jev-test" }));
    await assert.rejects(jevKomposition({ merkmale }, { adresse: "http://localhost:1/wahl" }), /unerwartete Antwort/);
  } finally { globalThis.fetch = echt; }
});

test("Zusammenstellung rechnen: zwei Klangeffekte nacheinander, sechs Abschnitte zu zehn Varianten, Film im Takt des neuen Klangs", async () => {
  const VS = await lab("kern/vorschlag.js");
  const Z = await lab("kern/zusammenstellung.js");
  const r = labRegister();
  const { p, m, e, t } = mitTon();
  const mg = await VS.messen({ register: r, projekt: p, medien: m, bild: e.id, ton: t.id });
  const plan = { aufbau: "aufbau.kette", uebergang: "film.blende", klang: ["klang.schneller", "klang.zerlegt"], bild: ["bild.glitch", "bild.farbe", "bild.licht", "bild.raster", "bild.feedback", "bild.neusetzen"], seed: 9 };
  const x = await Z.zusammenstellungRechnen({ register: r, projekt: p, medien: m, messung: mg, plan, wahl: { art: "jev", details: { modell: "jev-test" } }, seed: 3 });
  const ops = p.knoten.map((k) => k.operation);
  assert.deepEqual(ops.slice(2), ["lab.tempo", "lab.zerlegen", "lab.tonsignal", "lab.glitch", "lab.farbe", "lab.licht", "lab.raster", "lab.feedback", "lab.neusetzen"]);
  const zerlegt = p.knoten[3];
  assert.equal(zerlegt.eingaben.ton, p.knoten[2].ausgaben[0], "der zweite Klangeffekt wirkt auf das Ergebnis des ersten");
  assert.equal(x.klang, P.ergebnis(p, zerlegt.ausgaben[0]).id);
  assert.equal(x.ergebnisse.length, 60);
  for (let i = 1; i < 6; i++) assert.equal(p.knoten[5 + i].eingaben.bild, x.ergebnisse[i * 10 - 1].id, "Kette: auf der letzten Variante des vorigen Abschnitts");
  assert.equal(x.entscheidung.gegenstand, "zusammenstellung"); assert.equal(x.entscheidung.art, "jev");
  assert.deepEqual(x.entscheidung.gewaehlt.bild, plan.bild);
  assert.ok(p.entscheidungen.filter((d) => d.details?.entscheidung === x.entscheidung.id).length >= 9, "jeder Schritt verweist auf die Zusammenstellung");
  assert.equal(x.plan.stationen.length, 61); assert.equal(x.plan.tonspur, x.klang); assert.equal(x.plan.tonBeginn, 0);
  assert.deepEqual(x.plan.bewegung, { staerke: Z.BEWEGUNG, signal: x.signal }, "die Kamera atmet mit dem neuen Klang");
  assert.equal(x.plan.lebendig, true); assert.deepEqual(x.entscheidung.details.film, { lebendig: true, bewegung: Z.BEWEGUNG });
  assert.equal(Z.zusammenstellen(Z.gleichverteilt(), 1).lebendig, true); assert.equal(Z.zusammenstellen(Z.gleichverteilt(), 1).bewegung, Z.BEWEGUNG);
  const pt = ST.partitur(p, { ...x.plan, fps: 30 });
  assert.ok(pt.dauer > 3 && pt.dauer <= 30, `${pt.dauer}`);
  if (x.plan.takt) assert.equal(pt.takt.ton, x.klang, "der Takt kommt aus dem bearbeiteten Klang");
  if (x.plan.takt) {   // Kette im Takt: zwischen den Abschnitten der Verlauf der Operation (fünf Wechsel)
    assert.equal(x.plan.stationen.filter((s) => s.uebergang === "verlauf").length, 5);
    assert.ok(pt.folge.filter((f) => f.uebergang?.art === "verlauf").length >= 5, "die Partitur behält die Verläufe");
  }
  // Fächer: jeder Abschnitt auf dem Ausgangsbild; ohne Klangeffekt bleibt der Ton und sein Ausschnitt
  const y = await Z.zusammenstellungRechnen({ register: r, projekt: p, medien: m, messung: { ...mg, beginn: 1 }, plan: { ...plan, aufbau: "aufbau.faecher", klang: ["klang.keine", "klang.keine"], bild: ["bild.farbe", "bild.wiederholung", "bild.farbe", "bild.komposition", "bild.farbe", "bild.licht"] }, wahl: { art: "zufall", details: {} } });
  const letzte = p.knoten.slice(-6);
  assert.ok(letzte.every((k) => k.eingaben.bild === e.id), "Fächer");
  // Filmeinstellungen des Menschen (0.1.19): ohne lebendige Effekte, Kamera ruhig
  const ruhig = await Z.zusammenstellungRechnen({ register: r, projekt: p, medien: m, messung: mg, plan: { ...plan, klang: ["klang.keine", "klang.keine"], bild: ["bild.farbe", "bild.licht", "bild.farbe", "bild.licht", "bild.farbe", "bild.licht"], lebendig: false, bewegung: 0 }, wahl: { art: "mensch", details: {} } });
  assert.equal(ruhig.plan.lebendig, false); assert.equal(ruhig.plan.bewegung, null); assert.deepEqual(ruhig.entscheidung.details.film, { lebendig: false, bewegung: 0 });
  const halb = await Z.zusammenstellungRechnen({ register: r, projekt: p, medien: m, messung: mg, plan: { ...plan, klang: ["klang.keine", "klang.keine"], bild: ["bild.farbe", "bild.licht", "bild.farbe", "bild.licht", "bild.farbe", "bild.licht"], bewegung: 0.5 }, wahl: { art: "mensch", details: {} } });
  assert.equal(halb.plan.bewegung.staerke, 0.5); assert.equal(halb.plan.lebendig, true);
  assert.equal(ST.partitur(p, { ...ruhig.plan, fps: 30 }).bewegung, null);
  assert.equal(y.klang, t.id); assert.equal(y.plan.tonBeginn, 1);
  await assert.rejects(Z.zusammenstellungRechnen({ register: r, projekt: p, medien: m, messung: mg, plan: { ...plan, bild: ["bild.gibtsnicht"] }, wahl: { art: "mensch" } }), /gibt es nicht/);
  assert.deepEqual(P.pruefeProjekt(p), []);
});

test("Zusammenstellung aus einem Video (Lab 0.1.14): jeder Abschnitt nimmt das Standbild seiner Zeit", async () => {
  const VS = await lab("kern/vorschlag.js");
  const Z = await lab("kern/zusammenstellung.js");
  const r = labRegister();
  const { p, m, e, t } = mitTon();
  const stills = [e.id];
  for (let i = 1; i < 3; i++) { const s = P.fuegeMaterialHinzu(p, { titel: `video · ${i}`, datei: `medien/s${i}.rgba`, breite: 96, hoehe: 72, mime: "image/png", sha256: "v", herkunft: { video: { sha256: "v", zeit: i } } }); m.bilder.set(s.id, bild()); stills.push(s.id); }
  const mg = { ...(await VS.messen({ register: r, projekt: p, medien: m, bild: e.id, ton: t.id })), videoBilder: stills };
  const plan = { aufbau: "aufbau.kette", uebergang: "film.schnitt", klang: ["klang.keine", "klang.keine"], bild: ["bild.farbe", "bild.licht", "bild.farbe", "bild.raster", "bild.farbe", "bild.licht"], seed: 2 };
  const x = await Z.zusammenstellungRechnen({ register: r, projekt: p, medien: m, messung: mg, plan, wahl: { art: "zufall" } });
  assert.deepEqual(p.knoten.slice(-6).map((k) => k.eingaben.bild), [stills[0], stills[0], stills[1], stills[1], stills[2], stills[2]], "die Abschnitte folgen den Standbildern, auch in der Kette");
  assert.deepEqual(x.entscheidung.details.video, stills);
  assert.equal(x.plan.stationen[0], stills[0]);
});

test("Klangfolge (0.1.13): Klänge hintereinander mit Überblendung, umgetastet in die erste Rate, stereo sobald einer stereo ist", () => {
  const a = { spuren: [new Float32Array(48000).fill(0.5)], rate: 48000 };
  const b = { spuren: [new Float32Array(22050).fill(1), new Float32Array(22050).fill(-1)], rate: 44100 };
  const t = KW.klangfolge([a, b, a], { blende: 0.1 });
  assert.equal(t.rate, 48000); assert.equal(t.spuren.length, 2);
  assert.equal(t.spuren[0].length, 48000 + 24000 + 48000 - 2 * 4800, "die Blenden überlappen");
  assert.deepEqual(t.einsaetze, [0, 0.9, 1.3]);
  assert.equal(t.spuren[1][1000], 0.5, "einkanalig auf beiden Seiten");
  assert.ok(Math.abs(t.spuren[1][50000] + 1) < 0.02, "der zweite Klang, rechter Kanal");
  const mitte = 43200 + 2400;   // in der Blende: Sinus und Kosinus gleich laut
  assert.ok(Math.abs(t.spuren[0][mitte] - (0.5 + 1) * Math.SQRT1_2) < 0.01, `${t.spuren[0][mitte]}`);
  // ohne Blende: einfach hintereinander; die Blende ist höchstens halb so lang wie der kürzere Nachbar
  assert.equal(KW.klangfolge([a, a], { blende: 0 }).pcm.length, 96000);
  assert.equal(KW.klangfolge([a, { spuren: [new Float32Array(100)], rate: 48000 }], { blende: 2 }).pcm.length, 48000 + 50);
  assert.throws(() => KW.klangfolge([a]), /mindestens zwei/);
  assert.throws(() => KW.klangfolge([a, a], { hoechstens: 1.5 }), /länger als/);
});

test("Zettelkasten (0.1.18): 49 Strophen, Ziehen mit dem Startwert wiederholbar, eigene Wahl als Mensch, Text wörtlich; die Karte beschreibt Zettel und Konstellation", async () => {
  const { BESTAND, STROPHEN_WAHL, stropheDaten } = await lab("operationen/zettel.js");
  const { karteText } = await lab("operationen/karte.js");
  const { STROPHEN } = await import(new URL("alpha/drittes-rad/daten.js", root).href);
  const r = labRegister(), op = r.hole("zettel.strophe"), std = standardParameter(op);
  assert.equal(BESTAND, 49); assert.equal(STROPHEN_WAHL.length, 49); assert.equal(op.klasse, "selektion"); assert.equal(std.strophe, "");
  const a = await op.ausfuehren({}, std, { seed: 11 }), b = await op.ausfuehren({}, std, { seed: 11 });
  assert.equal(a.ausgaben[0].typ, "METADATA"); assert.equal(a.ausgaben[0].daten.nummer, b.ausgaben[0].daten.nummer, "derselbe Startwert, derselbe Zettel");
  assert.equal(a.entscheidungen[0].art, "zufall"); assert.equal(a.entscheidungen[0].gegenstand, "strophe"); assert.equal(a.entscheidungen[0].details.startwert, 11);
  const nummern = new Set();
  for (let s = 1; s <= 40; s++) nummern.add((await op.ausfuehren({}, std, { seed: s })).ausgaben[0].daten.nummer);
  assert.ok(nummern.size > 15, `verschiedene Startwerte ziehen verschiedene Strophen: ${nummern.size}`);
  const c = await op.ausfuehren({}, { ...std, strophe: "7" }, { seed: 1 });
  const s7 = STROPHEN.find((s) => s.n === 7);
  assert.equal(c.entscheidungen[0].art, "mensch"); assert.equal(c.entscheidungen[0].gewaehlt, 7);
  assert.deepEqual(c.ausgaben[0].daten, stropheDaten(s7));
  assert.equal(c.ausgaben[0].daten.text, s7.x); assert.equal(c.ausgaben[0].daten.leitsatz, s7.b); assert.equal(c.ausgaben[0].daten.titel, s7.t);
  assert.ok(c.ausgaben[0].daten.zyklusTitel, "der Zyklus hat einen Titel"); assert.match(c.ausgaben[0].daten.adresse, /^https:\/\/ornament\.cloud\/zu-seiner-zeit\/strophe\//);
  await assert.rejects(op.ausfuehren({}, { ...std, strophe: "99" }), /gibt es nicht/);
  // die Textkarte: Inhalt ohne DOM, das Zeichnen braucht den Browser
  const kz = karteText({ text: c.ausgaben[0].daten });
  assert.match(kz.kopf, /^Zettelkasten · .* · 7 \/ 49$/); assert.equal(kz.titel, s7.t); assert.equal(kz.text, s7.b); assert.equal(kz.fuss, "Zu seiner Zeit");
  const ko = karteText({ konstellation: { nummer: 3, kuenstler: "A", theoretiker: "B", gedanke: "G", regel: "R2", regelName: "Spiegel" } });
  assert.deepEqual(ko, { kopf: "ORNA · Konstellation 3", titel: "A × B", text: "G", fuss: "Operationsregel R2: Spiegel" });
  const karte = r.hole("lab.karte");
  assert.equal(karte.verfuegbar(), false, "in Node keine Leinwand");
  assert.ok(karte.eingaenge.every((e) => e.optional), "die Karte steht unter den Generatoren");
  await assert.rejects(karte.ausfuehren({}, standardParameter(karte)), /Browser/);
});

test("Partitur 0.4.0: Stationen mit «einmal» stehen als Titelkarten ausserhalb der Runde im Takt, vorn mit eigener Dauer, hinten bis zum Schluss", async () => {
  const { p, m, e, r, t } = mitTon();
  const s = await fuehreAus({ register: r, projekt: p, medien: m, auftrag: { operation: "lab.tonsignal", eingaben: { ton: t.id } } });
  const folge = s.ergebnisse[1], einsaetze = folge.daten.ereignisse.map((x) => x.t);
  const b = await fuehreAus({ register: r, projekt: p, medien: m, auftrag: { operation: "lab.farbe", eingaben: { bild: e.id }, parameter: { farbdrehung: 90 }, variation: { anzahl: 3, achse: "varianten" } } });
  const [k1, k2, k3] = b.ergebnisse.map((x) => x.id);
  const plan = { stationen: [{ ergebnis: k1, einmal: true, halten: 1.2 }, e.id, k2, { ergebnis: k3, einmal: true, halten: 1.2 }], halten: 1, uebergang: 0.2, art: "blende" };
  const pt = ST.partitur(p, { ...plan, takt: { ereignisfolge: folge.id, schwelle: 0, wiederholen: true } });
  assert.equal(pt.version, "0.4.0");
  assert.equal(pt.folge[0].ergebnis, k1); assert.equal(pt.folge[0].einmal, true); assert.equal(pt.folge[0].halten, 1.2); assert.equal(pt.folge[0].uebergang.dauer, 0.2);
  assert.equal(pt.folge.at(-1).ergebnis, k3); assert.equal(pt.folge.at(-1).einmal, true);
  const mitte = pt.folge.slice(1, -1), nach = einsaetze.filter((z) => z > 1.4 && z <= 6 - 1.4);
  assert.ok(mitte.length >= 3 && mitte.every((x) => !x.einmal && [e.id, k2].includes(x.ergebnis)), "die Runde besteht nur aus den Stationen zwischen den Karten");
  assert.deepEqual(mitte.slice(0, 3).map((x) => x.ergebnis), [e.id, k2, e.id], "reihum");
  assert.equal(mitte.length, nach.length, "so viele Auftritte wie Einsätze zwischen den Karten");
  assert.ok(pt.folge.at(-1).halten >= 1.2 - 1e-9, `die Karte hinten steht ihre Dauer bis zum Ende des Tons: ${pt.folge.at(-1).halten}`);
  assert.ok(Math.abs(mitte[0].beginn - 1.4) < 1e-3 && Math.abs(mitte[0].beginn + mitte[0].halten - nach[0]) < 1e-3, "die Runde beginnt nach der Karte und wechselt beim ersten Einsatz danach");
  assert.ok(Math.abs(pt.dauer - 6) < 0.04, `bis zum Ende des Tons: ${pt.dauer}`);
  assert.ok(pt.folge.slice(1, -1).every((x) => x.uebergang.dauer <= 0.2 + 1e-9), "kein Übergang länger als eingestellt");
  // ohne Takt: die Karte hält ihre eigene Dauer, die anderen die eingestellte
  const ohne = ST.partitur(p, { ...plan, art: "schnitt" });
  assert.deepEqual(ohne.folge.map((x) => x.halten), [1.2, 1, 1, 1.2]); assert.deepEqual(ohne.folge.map((x) => Boolean(x.einmal)), [true, false, false, true]);
  assert.equal(ohne.dauer, 4.4);
  // mit Kamera: die Karten stehen still (dasselbe Bild wie ohne Bewegung), dazwischen führt die Kamera
  const rechne = async (pl) => { const out = []; for await (const b of ST.filmbilder({ register: r, projekt: p, medien: m, partitur: pl, seite: 40 })) out.push(fingerabdruck(b)); return out; };
  const still = await rechne(ohne), bewegt = await rechne(ST.partitur(p, { ...plan, art: "schnitt", bewegung: { staerke: 1, signal: null } }));
  assert.equal(bewegt.length, still.length);
  assert.equal(bewegt[0], still[0], "die Titelkarte vorn steht still"); assert.equal(bewegt.at(-1), still.at(-1), "die Karte hinten auch");
  assert.notEqual(bewegt[40], still[40], "dazwischen führt die Kamera");
  // ohne «einmal» gehören auch Stationen mit eigener Dauer zur Runde
  const alle = ST.partitur(p, { stationen: [{ ergebnis: k1, halten: 2.5 }, e.id], halten: 1, uebergang: 0.2, art: "schnitt", takt: { ereignisfolge: folge.id, schwelle: 0, wiederholen: true } });
  assert.equal(alle.folge.length, einsaetze.length + 1); assert.equal(alle.folge[2].ergebnis, k1);
});

test("Zusammenstellung mit Zettelkasten und ORNA (0.1.18): beides wahlweise; der Zettel eröffnet den Film, die Konstellation schliesst ihn und gibt dem Zerfall die Regel", async () => {
  const VS = await lab("kern/vorschlag.js");
  const Z = await lab("kern/zusammenstellung.js");
  const { erstelleRegister } = await lab("kern/register.js");
  const { OPERATIONEN } = await lab("operationen/index.js");
  const { karteText } = await lab("operationen/karte.js");
  const { KONSTELLATIONEN } = await lab("operationen/orna.js");
  // in Node zeichnen weder The Fictory noch die Textkarte (beide brauchen die Leinwand): Stellvertreter mit derselben Beschreibung
  const r = erstelleRegister();
  for (const op of OPERATIONEN) {
    if (op.id === "fictory.prozess") r.registriere({ ...op, async ausfuehren({ bild, konstellation }, p) { return { ausgaben: Array.from({ length: 6 }, (_, i) => ({ typ: "IMAGE", titel: `Zustand ${i + 1}`, bild: neuesBild(bild.width, bild.height, [i * 40, 0, 0]) })), protokoll: { regel: p.regel || konstellation?.regel || null } }; } });
    else if (op.id === "lab.karte") r.registriere({ ...op, verfuegbar: () => true, async ausfuehren({ bild, text, konstellation }) { return { ausgaben: [{ typ: "IMAGE", titel: "Karte", bild: neuesBild(bild.width, bild.height, [20, 20, 20]) }], protokoll: { inhalt: karteText({ text, konstellation }) } }; } });
    else r.registriere(op);
  }
  const { p, m, e, t } = mitTon();
  const mg = await VS.messen({ register: r, projekt: p, medien: m, bild: e.id, ton: t.id });
  const plan = { aufbau: "aufbau.kette", uebergang: "film.blende", klang: ["klang.keine", "klang.keine"], bild: ["bild.farbe", "bild.licht", "bild.farbe", "bild.raster", "bild.farbe", "bild.licht"], seed: 4, zettel: { strophe: "" }, orna: { konstellation: "" } };
  const x = await Z.zusammenstellungRechnen({ register: r, projekt: p, medien: m, messung: mg, plan, wahl: { art: "jev", details: { modell: "jev-test" } }, seed: 3 });
  assert.ok(x.zettel.nummer >= 1 && x.zettel.nummer <= 49 && x.zettel.leitsatz, "ein gezogener Zettel");
  assert.ok(x.konstellation.regel && x.konstellation.kuenstler, "eine gezogene Konstellation mit Regel");
  assert.equal(x.entscheidung.gewaehlt.zettel, "ziehen"); assert.equal(x.entscheidung.gewaehlt.orna, "ziehen");
  assert.ok(!("zettel" in mg.merkmale) && Object.values(mg.merkmale).every((v) => typeof v === "string"), "jev bekommt nur die Stufen der Messung");
  const ops = p.knoten.map((k) => k.operation);
  assert.ok(ops.includes("zettel.strophe") && ops.includes("orna.konstellation"));
  assert.equal(ops.filter((o) => o === "lab.karte").length, 2, "zwei Karten");
  assert.equal(p.entscheidungen.find((d) => d.gegenstand === "strophe").art, "zufall"); assert.equal(p.entscheidungen.find((d) => d.gegenstand === "konstellation").art, "zufall");
  const fict = p.knoten.find((k) => k.operation === "fictory.prozess");
  assert.ok(fict, "ohne Zerfall in der Zusammenstellung kommt er als siebter Abschnitt dazu");
  assert.equal(P.ergebnis(p, fict.eingaben.konstellation).typ, "CONSTELLATION"); assert.equal(fict.protokoll.regel, x.konstellation.regel, "der Zerfall rechnet nach der Regel der Konstellation");
  assert.equal(x.ergebnisse.length, 66, "sechs Abschnitte zu zehn Varianten und sechs Zustände");
  assert.equal(x.plan.stationen.length, 69);
  assert.deepEqual(x.plan.stationen[0], { ergebnis: x.karten.zettel, einmal: true, halten: Z.KARTE_DAUER });
  assert.deepEqual(x.plan.stationen.at(-1), { ergebnis: x.karten.orna, einmal: true, halten: Z.KARTE_DAUER });
  assert.equal(x.plan.stationen[1], e.id);
  const kz = p.knoten.find((k) => k.operation === "lab.karte");
  assert.match(kz.protokoll.inhalt.kopf, /^Zettelkasten/); assert.equal(kz.protokoll.inhalt.titel, x.zettel.titel);
  const pt = ST.partitur(p, { ...x.plan, fps: 30 });
  assert.equal(pt.folge[0].ergebnis, x.karten.zettel); assert.equal(pt.folge[0].einmal, true); assert.equal(pt.folge[0].halten, Z.KARTE_DAUER);
  assert.equal(pt.folge.at(-1).ergebnis, x.karten.orna); assert.equal(pt.folge.at(-1).einmal, true);
  assert.ok(pt.dauer <= 30, `${pt.dauer}`);
  // eigene Wahl: Zettel 7 und eine bestimmte Konstellation; mit Zerfall in der Zusammenstellung kein siebter Abschnitt
  const q = mitTon();
  const mq = await VS.messen({ register: r, projekt: q.p, medien: q.m, bild: q.e.id, ton: q.t.id });
  const y = await Z.zusammenstellungRechnen({ register: r, projekt: q.p, medien: q.m, messung: mq, plan: { ...plan, bild: ["bild.farbe", "bild.fictory", "bild.licht", "bild.raster", "bild.farbe", "bild.licht"], zettel: { strophe: "7" }, orna: { konstellation: KONSTELLATIONEN[2].wert } }, wahl: { art: "mensch", details: {} } });
  assert.equal(y.zettel.nummer, 7); assert.equal(y.konstellation.id, KONSTELLATIONEN[2].wert);
  assert.equal(y.entscheidung.gewaehlt.zettel, "7"); assert.equal(y.entscheidung.gewaehlt.orna, KONSTELLATIONEN[2].wert);
  assert.equal(q.p.entscheidungen.find((d) => d.gegenstand === "strophe").art, "mensch"); assert.equal(q.p.entscheidungen.find((d) => d.gegenstand === "konstellation").art, "mensch");
  assert.equal(q.p.knoten.filter((k) => k.operation === "fictory.prozess").length, 1);
  assert.equal(q.p.knoten.find((k) => k.operation === "fictory.prozess").protokoll.regel, y.konstellation.regel);
  assert.equal(y.ergebnisse.length, 56); assert.equal(y.plan.stationen.length, 59);
  // ohne Bestände wie bisher; mit dem echten Register (ohne Leinwand) gibt es den Zettel, aber keine Karte
  const o = mitTon();
  const mo = await VS.messen({ register: r, projekt: o.p, medien: o.m, bild: o.e.id, ton: o.t.id });
  const z = await Z.zusammenstellungRechnen({ register: r, projekt: o.p, medien: o.m, messung: mo, plan: { ...plan, zettel: null, orna: null }, wahl: { art: "zufall" } });
  assert.equal(z.zettel, null); assert.equal(z.konstellation, null); assert.deepEqual(z.karten, { zettel: null, orna: null }); assert.equal(z.plan.stationen.length, 61); assert.equal(z.entscheidung.gewaehlt.zettel, null);
  const w = await Z.zusammenstellungRechnen({ register: labRegister(), projekt: o.p, medien: o.m, messung: mo, plan: { ...plan, orna: null }, wahl: { art: "zufall" } });
  assert.ok(w.zettel); assert.equal(w.karten.zettel, null, "ohne Leinwand keine Karte"); assert.equal(w.plan.stationen.length, 61);
  assert.deepEqual(P.pruefeProjekt(p), []); assert.deepEqual(P.pruefeProjekt(q.p), []);
});
