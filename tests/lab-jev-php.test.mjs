// ORNAMENT LAB – die jev-Zwischenstelle alpha/lab/jev/wahl.php (PHP auf dem Webspace) mit vorgetäuschtem jev: Bereitschaft ohne Kosten,
// Schlüssel nur ausserhalb der Website, nur Herkunft ornament.cloud, nur geprüfte Lagen, Frage gleich wie labFrage() in fragen.js,
// Zwischenspeicher, Grenzen je Adresse und für alle zusammen, Ausschalten. Braucht php (CLI mit curl); ohne php wird übersprungen.
//   node --test tests/lab-jev-php.test.mjs
import test from "node:test";
import assert from "node:assert/strict";
import { spawn, spawnSync } from "node:child_process";
import { createServer } from "node:http";
import { mkdtempSync, writeFileSync, rmSync, readdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const root = new URL("../", import.meta.url);
const { labLage, labFrage } = await import(new URL("alpha/lab/jev/fragen.js", root).href);
const php = spawnSync("php", ["-r", "echo function_exists('curl_init') ? 'ja' : 'nein';"], { encoding: "utf8" });
const ohnePhp = php.status !== 0 || php.stdout !== "ja";

const HERKUNFT = "http://lab.test";
const SCHLUESSEL = "ts-test-0123456789";
let jev = { status: 200, antwort: null }, gesendet = [];
const geheim = mkdtempSync(join(tmpdir(), "ornament-geheim-"));
const konfig = (c) => writeFileSync(join(geheim, "jev-lab.json"), JSON.stringify({ je_minute: 100, je_tag_adresse: 100, je_tag: 100, je_monat: 100, ...c }));

const lauscher = (server) => new Promise((ok) => server.listen(0, "127.0.0.1", () => ok(server.address().port)));
let jevServer, phpServer, basis;

test.before(async () => {
  if (ohnePhp) return;
  jevServer = createServer((req, res) => {
    let roh = ""; req.on("data", (d) => (roh += d));
    req.on("end", () => {
      gesendet.push({ auth: req.headers.authorization, body: JSON.parse(roh) });
      const opt = Object.keys(JSON.parse(roh).questions.wahl.criteria);
      const antwort = jev.antwort ?? { model: "jev-test", answers: { wahl: { probabilities: { ...Object.fromEntries(opt.map((o, i) => [o, i === 0 ? 1.4 : 0.1])), fremd: 0.9 } } } };
      res.writeHead(jev.status, { "content-type": "application/json" }); res.end(JSON.stringify(antwort));
    });
  });
  const jevPort = await lauscher(jevServer);
  const frei = createServer(), port = await lauscher(frei);   // einen freien Port finden, dann für php -S freigeben
  await new Promise((ok) => frei.close(ok));
  phpServer = spawn("php", ["-S", `127.0.0.1:${port}`, "-t", fileURLToPath(root)], {
    env: { ...process.env, ORNAMENT_GEHEIM: geheim, ORNAMENT_JEV_URL: `http://127.0.0.1:${jevPort}/v1/systemone`, ORNAMENT_HERKUNFT: HERKUNFT }, stdio: "ignore",
  });
  basis = `http://127.0.0.1:${port}/alpha/lab/jev/wahl.php`;
  for (let i = 0; i < 50; i++) { try { await fetch(basis); return; } catch { await new Promise((r) => setTimeout(r, 100)); } }
  throw new Error("php -S startet nicht");
});
test.after(() => { phpServer?.kill(); jevServer?.close(); rmSync(geheim, { recursive: true, force: true }); });

const frage = (lage, { origin = HERKUNFT, typ = "application/json", body = null, kopf = {} } = {}) =>
  fetch(basis, { method: "POST", headers: { ...(origin ? { origin } : {}), "content-type": typ, ...kopf }, body: body ?? JSON.stringify(lage) })
    .then(async (r) => ({ status: r.status, kopf: r.headers, json: await r.json() }));
const bereit = () => fetch(basis).then((r) => r.json());

test("wahl.php: ohne Schlüssel nicht bereit; mit Schlüssel bereit, ohne ihn zu verraten; GET fragt jev nie", { skip: ohnePhp && "kein php" }, async () => {
  konfig({});
  assert.deepEqual(await bereit(), { bereit: false, grund: "Kein Schlüssel hinterlegt" });
  assert.equal((await frage({ verlauf: [], optionen: ["lab.feedback", "lab.farbe"] })).status, 503);
  writeFileSync(join(geheim, "typesafe-schluessel"), SCHLUESSEL + "\n");
  const r = await fetch(basis);
  const text = await r.text();
  assert.deepEqual(JSON.parse(text), { bereit: true });
  assert.ok(!text.includes(SCHLUESSEL));
  assert.match(r.headers.get("cache-control"), /no-store/);
  assert.equal(gesendet.length, 0, "Prüfen kostet nichts");
});

test("wahl.php: nur Herkunft des Labs, nur JSON, nur geprüfte Lagen", { skip: ohnePhp && "kein php" }, async () => {
  const gut = { verlauf: [], optionen: ["lab.feedback", "lab.farbe"] };
  assert.equal((await frage(gut, { origin: "https://fremd.example" })).status, 403);
  assert.equal((await frage(gut, { origin: null })).status, 403);
  assert.equal((await frage(gut, { kopf: { "sec-fetch-site": "cross-site" } })).status, 403);
  assert.equal((await frage(gut, { typ: "text/plain" })).status, 415);
  assert.equal((await frage(null, { body: "x".repeat(2100) })).status, 413);
  assert.equal((await frage(null, { body: "{kaputt" })).status, 400);
  for (const [lage, re] of [
    [{ verlauf: [], optionen: ["lab.feedback"] }, /2–6/],
    [{ verlauf: [], optionen: ["lab.feedback", "boese.op"] }, /Katalog/],
    [{ verlauf: [], optionen: ["lab.feedback", "lab.farbe"], text: "frei" }, /unbekannte Felder/],
    [{ verlauf: ["lab.feedback\n"], optionen: ["lab.feedback", "lab.farbe"] }, /Verlauf/],
    [["lab.feedback", "lab.farbe"], /Lage fehlt/],
  ]) {
    const a = await frage(lage);
    assert.equal(a.status, 400, JSON.stringify(lage)); assert.match(a.json.fehler, re);
    assert.throws(() => labLage(lage), re, "dieselbe Regel wie fragen.js");
  }
  assert.equal(gesendet.length, 0);
});

test("wahl.php: schickt dieselbe Frage wie labFrage(), mit Schlüssel; zurück nur die Wahrscheinlichkeiten der Optionen; gleiche Lage aus dem Zwischenspeicher", { skip: ohnePhp && "kein php" }, async () => {
  const lagen = [
    { verlauf: [], optionen: ["lab.feedback", "lab.farbe", "lab.feedback"] },
    { verlauf: ["fictory.prozess", "lab.feedback", "lab.wiederholung", "lab.farbe", "lab.bildsignal", "lab.differenz", "lab.profil", "lab.komposition", "lab.farbe"], optionen: ["lab.komposition", "lab.profil", "fictory.prozess", "lab.differenz", "lab.bildsignal", "lab.wiederholung"] },
  ];
  for (const roh of lagen) {
    gesendet = [];
    const a = await frage(roh);
    assert.equal(a.status, 200, JSON.stringify(a.json));
    const lage = labLage(roh), f = labFrage(lage);
    assert.equal(gesendet.length, 1);
    assert.equal(gesendet[0].auth, `Bearer ${SCHLUESSEL}`);
    assert.deepEqual(gesendet[0].body, { model: "jev-latest", state: f.zustand, questions: f.fragen }, "PHP und fragen.js fragen wörtlich gleich");
    assert.deepEqual(Object.keys(a.json.wahrscheinlichkeiten), lage.optionen);
    assert.equal(a.json.wahrscheinlichkeiten[lage.optionen[0]], 1, "auf 0…1 begrenzt");
    assert.equal(a.json.modell, "jev-test");
    assert.equal(a.json.zwischengespeichert, false);
    const b = await frage(roh);
    assert.equal(b.json.zwischengespeichert, true); assert.deepEqual(b.json.wahrscheinlichkeiten, a.json.wahrscheinlichkeiten);
    assert.equal(gesendet.length, 1, "aus dem Zwischenspeicher, ohne Kosten");
  }
  assert.ok(readdirSync(join(geheim, "jev-lab", "zwischen")).length >= 2);
});

test("wahl.php: Fehler von jev werden verständlich; Grenzen je Adresse und für alle; ausschalten", { skip: ohnePhp && "kein php" }, async () => {
  const lage = (o) => ({ verlauf: ["lab.profil"], optionen: ["lab.feedback", o] });
  jev = { status: 401, antwort: { fehler: "nein" } };
  assert.match((await frage(lage("lab.farbe"))).json.fehler, /Schlüssel abgelehnt/);
  jev = { status: 429, antwort: {} };
  assert.match((await frage(lage("lab.differenz"))).json.fehler, /Kontingent/);
  jev = { status: 200, antwort: { model: "x", answers: {} } };
  assert.match((await frage(lage("lab.profil"))).json.fehler, /unerwartete Antwort/);
  jev = { status: 200, antwort: null };

  konfig({ je_tag: 0 });
  const t = await frage(lage("lab.bildsignal"));
  assert.equal(t.status, 429); assert.match(t.json.fehler, /Tagesgrenze/);
  konfig({ je_minute: 0 });
  assert.match((await frage(lage("lab.bildsignal"))).json.fehler, /zu viele Anfragen/);
  konfig({ aus: true });
  assert.deepEqual(await bereit(), { bereit: false, grund: "Ausgeschaltet" });
  assert.equal((await frage(lage("lab.bildsignal"))).status, 503);
  konfig({});
  assert.deepEqual(await bereit(), { bereit: true });
});

test("wahl.php: die Frage nach der Dramaturgie (Bild und Klang, 30 s) prüft wie fragen.js und fragt wörtlich gleich", { skip: ohnePhp && "kein php" }, async () => {
  konfig({});
  const { DRAMATURGIEN } = await import(new URL("alpha/lab/jev/fragen.js", root).href);
  const merkmale = { kontrast: "hoch", farbigkeit: "bunt", symmetrie: "asymmetrisch", helligkeit: "dunkel", dichte: "dicht", dynamik: "wechselhaft" };
  for (const [lage, re] of [
    [{ frage: "dramaturgie", merkmale, optionen: ["vorschlag.puls"] }, /2–6 Dramaturgien/],
    [{ frage: "dramaturgie", merkmale, optionen: ["vorschlag.puls", "lab.feedback"] }, /Dramaturgien/],
    [{ frage: "dramaturgie", merkmale: { ...merkmale, dichte: "sehr" }, optionen: ["vorschlag.puls", "vorschlag.raster"] }, /Merkmal dichte/],
    [{ frage: "dramaturgie", merkmale: { ...merkmale, text: "frei" }, optionen: ["vorschlag.puls", "vorschlag.raster"] }, /unbekannte Merkmale/],
    [{ frage: "dramaturgie", merkmale: { kontrast: "hoch" }, optionen: ["vorschlag.puls", "vorschlag.raster"] }, /Merkmal farbigkeit/],
    [{ frage: "dramaturgie", merkmale, optionen: ["vorschlag.puls", "vorschlag.raster"], bild: "x" }, /unbekannte Felder/],
    [{ frage: "dramaturgie", merkmale: ["hoch"], optionen: ["vorschlag.puls", "vorschlag.raster"] }, /Merkmale fehlen/],
  ]) {
    const a = await frage(lage);
    assert.equal(a.status, 400, JSON.stringify(lage)); assert.match(a.json.fehler, re);
    assert.throws(() => labLage(lage), re, "dieselbe Regel wie fragen.js");
  }
  gesendet = [];
  const roh = { optionen: Object.keys(DRAMATURGIEN), merkmale: { ...merkmale, dynamik: "anschwellend" }, frage: "dramaturgie" };
  const a = await frage(roh);
  assert.equal(a.status, 200, JSON.stringify(a.json));
  const f = labFrage(labLage(roh));
  assert.equal(gesendet.length, 1);
  assert.deepEqual(gesendet[0].body, { model: "jev-latest", state: f.zustand, questions: f.fragen }, "PHP und fragen.js fragen wörtlich gleich");
  assert.deepEqual(Object.keys(a.json.wahrscheinlichkeiten), Object.keys(DRAMATURGIEN));
  assert.equal((await frage(roh)).json.zwischengespeichert, true);
  const andere = await frage({ ...roh, merkmale: { ...roh.merkmale, dichte: "ruhig" } });
  assert.equal(andere.json.zwischengespeichert, false, "andere Stufen, neue Frage");
  assert.equal(gesendet.length, 2);
});

test("wahl.php: derselbe Katalog der Operationen wie fragen.js", { skip: ohnePhp && "kein php" }, async () => {
  const { KATALOG } = await import(new URL("alpha/lab/jev/fragen.js", root).href);
  gesendet = [];
  const lage = { verlauf: [], optionen: Object.keys(KATALOG).slice(-6) };
  const a = await frage(lage);
  assert.equal(a.status, 200, JSON.stringify(a.json));
  assert.deepEqual(gesendet[0].body.questions, labFrage(labLage(lage)).fragen);
});
