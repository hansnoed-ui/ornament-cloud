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
  assert.deepEqual(labRegister().fuer("AUDIO").map((o) => o.id), ["lab.tonsignal"]);
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

test("Archiv mit Ton und alte Projekte: Tondatei kommt unverändert mit, Projekte 0.1.0–0.3.0 öffnen weiter", async () => {
  const { p, m, r, t } = mitTon();
  await fuehreAus({ register: r, projekt: p, medien: m, auftrag: { operation: "lab.tonsignal", eingaben: { ton: t.id } } });
  const wav = Uint8Array.from({ length: 64 }, (_, i) => i);
  m.dateien.set("medien/t.wav", wav);
  const { projekt, medien, fehlt } = await entpacke(packe(p, m.dateien));
  assert.deepEqual(fehlt.filter((d) => d === "medien/t.wav"), []);
  assert.deepEqual(medien.get("medien/t.wav"), wav);
  assert.equal(projekt.ergebnisse.find((x) => x.typ === "AUDIO").ton.abtastrate, 44100);
  assert.equal(projekt.formatVersion, "0.4.0");
  for (const v of ["0.1.0", "0.2.0", "0.3.0"]) assert.doesNotThrow(() => P.ladeProjekt({ ...P.neuesProjekt(), formatVersion: v, labVersion: "0.1.0" }), v);
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
  for (const p of ["alpha/lab/docs/", "alpha/lab/werkzeuge/", "alpha/lab/starten.mjs", "alpha/lab/README.md", "alpha/lab/jev/worker-entwurf.js"]) assert.ok(aus.includes(p), `${p} bleibt im Repository`);
  assert.match(readFileSync(new URL("alpha/lab/index.html", root), "utf8"), /<meta name="robots" content="noindex/);
  const dateien = readdirSync(new URL("alpha/lab/", root), { recursive: true }).filter((f) => f.endsWith(".js"));
  for (const f of dateien) {
    const text = readFileSync(new URL(`alpha/lab/${f}`, root), "utf8");
    assert.ok(!/fetch\(\s*["']https?:\/\/(?!localhost)/.test(text) || f.includes("jev"), `${f}: keine festen Aufrufe nach aussen`);
  }
});

test("jev: Katalog passt zum Register, Lage wird streng geprüft, Frage hat festen Wortlaut", async () => {
  const { KATALOG, labLage, labFrage } = await lab("jev/fragen.js");
  const { jevVerfuegbar, jevWahl } = await lab("jev/jev.js");
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
  } finally { globalThis.fetch = echt; }
});
