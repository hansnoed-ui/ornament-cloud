// ORNAMENT LAB (src/lab/): Kern, Operationen, Projektformat und Archiv ohne Browser.
//   node --test tests/lab.test.mjs
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";

const root = new URL("../", import.meta.url);
const lab = (p) => import(new URL(`src/lab/${p}`, root).href);
const { labRegister, OPERATIONEN } = await lab("operationen/index.js");
const { pruefeOperation, standardParameter, bereinigeParameter } = await lab("kern/register.js");
const { kompatibel } = await lab("kern/typen.js");
const M = await lab("kern/modulation.js");
const P = await lab("kern/projekt.js");
const { fuehreAus, bildfolge, regelVorschlaege, experiment, ketteAnwenden } = await lab("kern/ausfuehrung.js");
const { packe, entpacke } = await lab("kern/archiv.js");
const { fingerabdruck, neuesBild } = await lab("kern/bilddaten.js");

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
  const bilder = new Map(), dateien = new Map();
  return {
    bilder, dateien,
    async bild(e) { const b = bilder.get(e.id); if (!b) throw new Error(`Bild ${e.id} fehlt`); return b; },
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

test("Isolation: das Lab ändert nichts an Website und Apps und liegt nicht im Upload", () => {
  const aus = readFileSync(new URL("tools/hostpoint/ausschluss.txt", root), "utf8").split("\n").map((z) => z.trim());
  assert.ok(aus.includes("src/"), "src/ (und damit src/lab/) wird nicht auf den Webspace geladen");
  const dateien = readdirSync(new URL("src/lab/", root), { recursive: true }).filter((f) => f.endsWith(".js"));
  for (const f of dateien) {
    const text = readFileSync(new URL(`src/lab/${f}`, root), "utf8");
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
