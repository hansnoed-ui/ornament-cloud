// «Kunst» (alpha/kunst/): Schlagwörter, Verwandtschaft, Montage, Zettel und ORNA-Begegnung, mit erfundenen Beiträgen aus tests/fixtures/kunst/.
//   node --test tests/kunst.test.mjs
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import * as V from "../alpha/kunst/verknuepfung.js";

const beispiel = JSON.parse(readFileSync(new URL("fixtures/kunst/beispiel.json", import.meta.url), "utf8")).map((b) => ({ i: b.id, d: b.date, t: b.text }));
const B = V.bestand(beispiel);

test("Schlagwörter: Nomen und Hashtags aus mindestens zwei Beiträgen, das allgegenwärtige «Kunst» nicht", () => {
  const namen = [...B.schlagwoerter.keys()].map((st) => B.name(st));
  for (const w of ["Ausstellung", "Gedächtnis", "Wiederholung", "#kunst"]) assert.ok(namen.includes(w), w);
  assert.ok(!namen.includes("Kunst"));
  for (const l of B.schlagwoerter.values()) assert.ok(l.length >= 2);
});

test("Verwandte Beiträge teilen ein Schlagwort, der Beitrag selbst ist nicht dabei", () => {
  const v = V.verwandte(B, 2);
  assert.ok(v.length > 0);
  for (const x of v) { assert.notEqual(x.i, 2); assert.ok(x.woerter.every((st) => B.docs[2].has(st) && B.docs[x.i].has(st))); }
});

test("Montage: nur unveränderte Sätze der markierten Beiträge, im Wechsel, ohne Hashtags am Satzende", () => {
  const markiert = [0, 2, 4];
  const m = V.montage(B, markiert, 1);
  assert.ok(m.quellen.length > 0 && m.quellen.length <= 9);
  for (const q of m.quellen) { assert.ok(beispiel[q.i].t.includes(q.satz), q.satz); assert.ok(!/#\S+$/.test(q.satz)); }
  assert.deepEqual(m.quellen.slice(0, 3).map((q) => q.buchstabe), ["A", "B", "C"]);
  assert.deepEqual(V.montage(B, markiert, 1), m, "gleicher Startwert, gleiche Montage");
});

test("Zuordnung: ohne jev die Regel, mit Begründung; mit jev die Summe der Wahrscheinlichkeiten", () => {
  const ohne = V.zuordnung(B, [0, 2, 4], null);
  assert.equal(ohne.zettel.art, "Regel");
  assert.match(ohne.zettel.grund, /Gemeinsame Wörter/);
  const J = { gueltig: true, z: { t1: [[3, 0.6], [7, 0.4]], t3: [[7, 0.9]] }, k: { t1: [[10, 1]], t3: [[11, 1]] } };
  const mit = V.zuordnung(B, [0, 2], J);
  assert.equal(mit.zettel.art, "jev");
  assert.equal(mit.zettel.ziel, V.STROPHEN[7]);
  // fehlt jev für einen markierten Beitrag, gilt die Regel für alle (nie gemischt)
  assert.equal(V.zuordnung(B, [0, 4], J).zettel?.art ?? "Regel", "Regel");
});

test("Adressen: Zettel im Neubau, Begegnung im ORNA-Rad", () => {
  assert.equal(V.adresse.zettel(V.STROPHEN[0]), "/b/zettel/1-die-bruecke/");
  assert.match(V.adresse.begegnung(V.KONSTELLATIONEN[0]), /^\/portfolio\/nebeneinander-nacheinander\/\?pair=/);
});

test("Im Repository stehen nur freigegebene Beiträge (beitraege.js aus tools/build-kunst.mjs), keine Testbeiträge", async () => {
  const { BEITRAEGE } = await import("../alpha/kunst/beitraege.js");
  assert.ok(Array.isArray(BEITRAEGE));
  assert.ok(!BEITRAEGE.some((b) => /^t\d+$/.test(b.i)), "Beispiele aus tests/fixtures gehören nicht in die Seite");
  for (const b of BEITRAEGE) assert.match(b.d, /^\d{4}-\d{2}-\d{2}$/);
});

test("Seite: noindex, nicht in der Sitemap, eigene Kopfzeile, Module mit Versionsmarke", () => {
  const html = readFileSync(new URL("../alpha/kunst/index.html", import.meta.url), "utf8");
  assert.match(html, /<meta name="robots" content="noindex">/);
  assert.ok(!readFileSync(new URL("../sitemap.xml", import.meta.url), "utf8").includes("/alpha/kunst/"));
  assert.match(html, /kunst\.js\?v=\d+/);
});
