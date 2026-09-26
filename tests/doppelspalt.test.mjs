// Tests für „Nebeneinander, Nacheinander“ (Doppelspalt der Wahrnehmung)
//
//   node --experimental-strip-types --no-warnings --test tests/doppelspalt.test.mjs
//
// Prüft die Browser-Module gegen die TypeScript-Originale des Produktionspakets
// und die Spin-Physik mit vielen zufälligen Gesten.
import { test } from "node:test";
import assert from "node:assert/strict";
import { cpSync, mkdtempSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const root = new URL("../", import.meta.url);
const js = p => new URL(`portfolio/nebeneinander-nacheinander/js/${p}`, root).href;

const { artists } = await import(js("data/artists.js"));
const { theorists } = await import(js("data/theorists.js"));
const { constellations } = await import(js("data/constellations.js"));
const { validateDataset, assertDatasetValid } = await import(js("lib/validation.js"));
const { drawConstellation, simulateDraws, secureRandomIndex } = await import(js("lib/random.js"));
const geo = await import(js("lib/geometry.js"));
const spin = await import(js("lib/spin.js"));
const { symbolMarkup, SYMBOL_COUNT } = await import(js("symbols.js"));

// TypeScript-Originale: in ein Temp-Verzeichnis kopieren und nur die Importpfade für Node ergänzen
const tmp = mkdtempSync(join(tmpdir(), "doppelspalt-"));
cpSync(new URL("src/doppelspalt/src/", root), tmp, { recursive: true });
for (const dir of ["data", "lib/double-slit"]) {
  for (const f of readdirSync(join(tmp, dir))) {
    const p = join(tmp, dir, f);
    writeFileSync(p, readFileSync(p, "utf8").replace(/from "(\.\.?\/[^"]+)"/g, 'from "$1.ts"'));
  }
}
const ts = {
  artists: (await import(join(tmp, "data/artists.ts"))).artists,
  theorists: (await import(join(tmp, "data/theorists.ts"))).theorists,
  constellations: (await import(join(tmp, "data/constellations.ts"))).constellations,
  validation: await import(join(tmp, "lib/double-slit/validation.ts")),
  random: await import(join(tmp, "lib/double-slit/random.ts")),
};

test("Browser-Daten entsprechen Zeichen für Zeichen den TypeScript-Originalen", () => {
  assert.deepEqual(JSON.parse(JSON.stringify(artists)), JSON.parse(JSON.stringify(ts.artists)));
  assert.deepEqual(JSON.parse(JSON.stringify(theorists)), JSON.parse(JSON.stringify(ts.theorists)));
  assert.deepEqual(JSON.parse(JSON.stringify(constellations)), JSON.parse(JSON.stringify(ts.constellations)));
});

// verbindliche redaktionelle Fassung (Semikolon-CSV, UTF-8)
// Datei und erwartete Anzahl kommen aus der Redaktion selbst, nicht aus einer festen Zahl
const REDAKTION = "src/doppelspalt/" + JSON.parse(readFileSync(new URL("src/doppelspalt/manifest.json", root), "utf8")).editorialFile;
function parseCsv(src) {
  const rows = []; let row = [], f = "", q = false;
  for (let i = 0; i < src.length; i += 1) {
    const ch = src[i];
    if (q) { if (ch === '"' && src[i + 1] === '"') { f += '"'; i += 1; } else if (ch === '"') q = false; else f += ch; }
    else if (ch === '"') q = true;
    else if (ch === ";") { row.push(f); f = ""; }
    else if (ch === "\n" || ch === "\r") { if (ch === "\r" && src[i + 1] === "\n") i += 1; row.push(f); rows.push(row); row = []; f = ""; }
    else f += ch;
  }
  if (f !== "" || row.length) { row.push(f); rows.push(row); }
  return rows.filter(r => r.some(c => c !== ""));
}

const REDAKTION_ROWS = parseCsv(readFileSync(new URL(REDAKTION, root), "utf8").replace(/^\uFEFF/, "")).slice(1);
const EXPECTED = REDAKTION_ROWS.length;

test("20 Künstler, 20 Theoretiker, so viele Datensätze wie in der redaktionellen Fassung", () => {
  assert.equal(artists.length, 20);
  assert.equal(theorists.length, 20);
  assert.ok(EXPECTED > 0);
  assert.equal(constellations.length, EXPECTED);
  assert.deepEqual(constellations.map(c => c.editorialNumber), Array.from({ length: EXPECTED }, (_, i) => i + 1));
});

test("Datenbestand entspricht Zeichen für Zeichen der redaktionellen Fassung (CSV)", () => {
  assert.equal(REDAKTION_ROWS.length, constellations.length);
  REDAKTION_ROWS.forEach(([nr, a, , t, , text, frage], i) => {
    const c = constellations[i];
    assert.deepEqual([c.editorialNumber, c.artistId, c.theoristId, c.text, c.question], [Number(nr), a, t, text, frage], `#${nr}`);
  });
});

test("Originale Validierung des Pakets (strict) besteht ohne Befund", () => {
  assert.deepEqual(ts.validation.validateDataset({ strictUniquePairs: true }), []);
  assert.deepEqual(ts.validation.validateDataset({ strictUniquePairs: true, expectedConstellations: EXPECTED }), []);
  ts.validation.assertDatasetValid({ strictUniquePairs: true });
});

test("Übertragene Validierung liefert dasselbe Ergebnis", () => {
  assert.deepEqual(validateDataset({ strictUniquePairs: true }), []);
  assert.deepEqual(validateDataset({ strictUniquePairs: true, expectedConstellations: EXPECTED }), []);
  assertDatasetValid({ strictUniquePairs: true });
});

test("alle IDs und Verweise gültig, alle 40 Personen verwendet, eindeutige Paare", () => {
  const a = new Set(artists.map(p => p.id)), t = new Set(theorists.map(p => p.id));
  const pairs = new Set();
  for (const c of constellations) {
    assert.ok(a.has(c.artistId), c.id);
    assert.ok(t.has(c.theoristId), c.id);
    assert.equal(c.id, `${c.artistId}__${c.theoristId}`);
    assert.ok(c.text.trim() && c.question.trim(), c.id);
    pairs.add(c.pairKey);
  }
  assert.equal(pairs.size, constellations.length);
  assert.equal(pairs.size, EXPECTED);
  assert.equal(new Set(constellations.map(c => c.artistId)).size, 20);
  assert.equal(new Set(constellations.map(c => c.theoristId)).size, 20);
});

test("100 000 Ziehungen: alle erreichbar, keine unmittelbare Wiederholung (Original und Übertragung)", () => {
  for (const sim of [ts.random.simulateDraws, simulateDraws]) {
    const counts = sim(constellations, 100_000);
    const v = [...counts.values()];
    assert.equal(v.filter(x => x > 0).length, constellations.length);
    // grobe Gleichverteilung: Erwartung 100 000 / Anzahl, weit innerhalb von ±25 %
    const e = 100_000 / constellations.length;
    assert.ok(Math.min(...v) > 0.75 * e && Math.max(...v) < 1.25 * e, `min ${Math.min(...v)} max ${Math.max(...v)} (Erwartung ${e.toFixed(0)})`);
  }
});

test("secureRandomIndex bleibt im Bereich", () => {
  for (let i = 0; i < 10000; i += 1) {
    const x = secureRandomIndex(98);
    assert.ok(Number.isInteger(x) && x >= 0 && x < 98);
  }
});

test("Geometrie: jeder Platz landet auf der Achse", () => {
  for (let i = 0; i < 20; i += 1) {
    assert.equal(geo.indexAtAxis(geo.targetRotation(i)), i);
    assert.equal(geo.indexAtAxis(geo.targetRotation(i) + 360 * 7), i);
    assert.equal(geo.indexAtAxis(geo.targetRotation(i) - 360 * 3), i);
  }
});

test("Spin: zufällige Gesten landen immer exakt auf dem gezogenen kuratierten Paar", () => {
  const curated = new Set(constellations.map(c => c.pairKey));
  let previous, artistRot = 0, theoristRot = 0, matched = 0, total = 0;
  for (let i = 0; i < 20000; i += 1) {
    const record = drawConstellation(constellations, previous);
    assert.notEqual(record.id, previous);
    const tg = geo.targetsFor(record, artists, theorists);
    const v = (Math.random() < 0.5 ? -1 : 1) * (220 + Math.random() * 2380);   // Bereich der App
    const plan = spin.planSpin({
      artistFrom: artistRot, theoristFrom: theoristRot,
      artistTarget: tg.artistTarget, theoristTarget: tg.theoristTarget,
      grabbed: i % 3 ? "artist" : "theorist", velocity: v,
    });
    // gegenläufig, plausible Dauer, Ende ohne Geschwindigkeit
    assert.notEqual(plan.artist.dir, plan.theorist.dir);
    for (const p of [plan.artist, plan.theorist]) {
      assert.ok(p.T >= 2.2 - 1e-9 && p.T <= 6.8 + 1e-9, `Dauer ${p.T}`);
      assert.ok(Math.abs(spin.velocityAt(p, p.T)) < 1e-6);
      if (p.velocityMatched) matched += 1;
      total += 1;
    }
    artistRot = spin.positionAt(plan.artist, plan.artist.T);
    theoristRot = spin.positionAt(plan.theorist, plan.theorist.T);
    const landedA = artists[geo.indexAtAxis(artistRot)], landedT = theorists[geo.indexAtAxis(theoristRot)];
    assert.equal(landedA.id, record.artistId);
    assert.equal(landedT.id, record.theoristId);
    assert.ok(curated.has(`${landedA.id}__${landedT.id}`));
    // exakt, nicht nur gerundet
    assert.ok(Math.abs(geo.mod(artistRot - tg.artistTarget + 180, 360) - 180) < 1e-6);
    assert.ok(Math.abs(geo.mod(theoristRot - tg.theoristTarget + 180, 360) - 180) < 1e-6);
    previous = record.id;          // nächster Spin beginnt aus der erreichten Stellung
  }
  assert.ok(matched / total > 0.99, `Geschwindigkeit übernommen in ${(100 * matched / total).toFixed(2)} %`);
});

test("Spin: Dauer wächst mit der Stärke der Geste", () => {
  const avg = v => {
    let s = 0;
    for (let i = 0; i < 400; i += 1) {
      const p = spin.planSpin({ artistFrom: Math.random() * 360, theoristFrom: Math.random() * 360, artistTarget: geo.targetRotation(i % 20), theoristTarget: geo.targetRotation((i * 7) % 20), velocity: v, rand: () => 0.5 });
      s += p.duration;
    }
    return s / 400;
  };
  assert.ok(avg(2400) > avg(300) + 1, `${avg(300).toFixed(2)} → ${avg(2400).toFixed(2)}`);
});

test("Jede einzelne Konstellation ist durch das Rad erreichbar: beide Ringe landen exakt auf ihrem Paar", () => {
  for (const r of constellations) {
    const tg = geo.targetsFor(r, artists, theorists);
    for (const velocity of [300, 1200, -2400]) {
      const p = spin.planSpin({ artistFrom: Math.random() * 720, theoristFrom: Math.random() * 720, artistTarget: tg.artistTarget, theoristTarget: tg.theoristTarget, grabbed: velocity > 0 ? "artist" : "theorist", velocity });
      assert.equal(artists[geo.indexAtAxis(spin.positionAt(p.artist, p.artist.T))].id, r.artistId, r.id);
      assert.equal(theorists[geo.indexAtAxis(spin.positionAt(p.theorist, p.theorist.T))].id, r.theoristId, r.id);
    }
  }
});

test("Spin: reduzierte Bewegung landet ebenso exakt, kurz", () => {
  for (let i = 0; i < 2000; i += 1) {
    const r = constellations[i % constellations.length], tg = geo.targetsFor(r, artists, theorists);
    const p = spin.planSpin({ artistFrom: Math.random() * 720, theoristFrom: Math.random() * 720, artistTarget: tg.artistTarget, theoristTarget: tg.theoristTarget, velocity: 700, reducedMotion: true });
    assert.equal(p.duration, 0.9);
    assert.equal(geo.indexAtAxis(spin.positionAt(p.artist, 0.9)), tg.artistIndex);
    assert.equal(geo.indexAtAxis(spin.positionAt(p.theorist, 0.9)), tg.theoristIndex);
  }
});

test("40 unterschiedliche Zeichen", () => {
  assert.equal(SYMBOL_COUNT, 40);
  const set = new Set(Array.from({ length: 40 }, (_, i) => symbolMarkup(i, 1)));
  assert.equal(set.size, 40);
});

test("Laufzeit bildet keine Kombinationen: wheel.js zieht nur aus den kuratierten Datensätzen", () => {
  const src = readFileSync(new URL("portfolio/nebeneinander-nacheinander/js/wheel.js", root), "utf8");
  assert.match(src, /drawConstellation\(constellations, previousId\)/);
  assert.doesNotMatch(src, /artists\.(flatMap|map)\([^)]*theorists/);
});
