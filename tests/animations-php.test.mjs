// «Animationen» – die Ablage der Werke animations/werke.php (PHP auf dem Webspace) mit php -S: leere Liste, Sichern nur von ornament.cloud,
// Name Pflicht, Bild wird als JPEG abgelegt und in der Liste geführt, Mischung nur aus bekannten Feldern, Löschen nur mit dem Schlüssel,
// Grenze je Adresse und Stunde. Braucht php (CLI); ohne php wird übersprungen.
//   node --test tests/animations-php.test.mjs
import test from "node:test";
import assert from "node:assert/strict";
import { spawn, spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, existsSync, readdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const root = new URL("../", import.meta.url);
const php = spawnSync("php", ["-r", "echo function_exists('getimagesize') ? 'ja' : 'nein';"], { encoding: "utf8" });
const ohnePhp = php.status !== 0 || php.stdout !== "ja";
const HERKUNFT = "http://animationen.test";
const werkeOrdner = mkdtempSync(join(tmpdir(), "animationen-werke-"));
const BILD = readFileSync(new URL("alpha/drittes-rad/og-drittes-rad.jpg", root));   // irgendein JPEG aus dem Repository
let server, basis;

test.before(async () => {
  if (ohnePhp) return;
  server = spawn("php", ["-S", "127.0.0.1:0", "-t", fileURLToPath(new URL("animations/", root))], {
    env: { ...process.env, ANIMATIONEN_HERKUNFT: HERKUNFT, ANIMATIONEN_WERKE: werkeOrdner }, stdio: ["ignore", "pipe", "pipe"],
  });
  basis = await new Promise((ok, nein) => {
    const t = setTimeout(() => nein(new Error("php -S startet nicht")), 10000);
    const lesen = (d) => { const m = String(d).match(/https?:\/\/127\.0\.0\.1:(\d+)/); if (m) { clearTimeout(t); ok(`http://127.0.0.1:${m[1]}/werke.php`); } };
    server.stdout.on("data", lesen); server.stderr.on("data", lesen);
  });
});
test.after(() => { server?.kill(); rmSync(werkeOrdner, { recursive: true, force: true }); });

const stapel = { grund: "schwarz", ebenen: [{ effekt: "relief", werte: [.5, .4], modus: "normal", deckkraft: 1, quelle: "bild", seed: 2 }], dauer: 30, durchlauf: true };
function formular({ name = "Testerin", titel = "Probe", bild = BILD, mischung = stapel, schutz = "" } = {}) {
  const f = new FormData();
  if (bild) f.append("bild", new Blob([bild], { type: "image/jpeg" }), "bild.jpg");
  f.append("titel", titel); f.append("name", name); f.append("stapel", JSON.stringify(mischung)); f.append("schutz", schutz);
  return f;
}
const senden = (body, headers = {}) => fetch(basis, { method: "POST", body, headers: { origin: HERKUNFT, ...headers } });

test("leer: die Liste ist leer, ein unbekanntes Werk gibt 404", { skip: ohnePhp && "php fehlt" }, async () => {
  const r = await fetch(`${basis}?liste`);
  assert.equal(r.status, 200);
  assert.deepEqual(await r.json(), { werke: [], anzahl: 0 });
  assert.equal((await fetch(`${basis}?id=0123456789`)).status, 404);
});

test("sichern: nur von der eigenen Herkunft, Name Pflicht, Schutzfeld leer, Bild Pflicht", { skip: ohnePhp && "php fehlt" }, async () => {
  assert.equal((await fetch(basis, { method: "POST", body: formular(), headers: { origin: "https://fremd.example" } })).status, 403);
  assert.equal((await senden(formular({ name: "  " }))).status, 400);
  assert.equal((await senden(formular({ schutz: "http://spam" }))).status, 400);
  assert.equal((await senden(formular({ bild: null }))).status, 400);
  assert.equal((await senden(formular({ bild: Buffer.from("kein bild") }))).status, 400);
  assert.equal((await senden(formular({ mischung: { ebenen: [] } }))).status, 400);
  assert.equal((await senden(formular({ mischung: { ebenen: [{ effekt: "böse;rm", werte: [] }] } }))).status, 400);
});

test("sichern, lesen, löschen: das Werk liegt als JPEG und JSON, steht in der Liste, trägt die geprüfte Mischung; Löschen nur mit Schlüssel", { skip: ohnePhp && "php fehlt" }, async () => {
  const r = await senden(formular({ name: "  Testerin\tMüller ", titel: "Probe <am> Abend", mischung: { ...stapel, fremd: 1, ebenen: [{ ...stapel.ebenen[0], werte: [.5, 1.7, -2], modus: "unsinn", extra: true }] } }));
  assert.equal(r.status, 201);
  const d = await r.json();
  assert.match(d.id, /^[a-f0-9]{10}$/); assert.match(d.schluessel, /^[a-f0-9]{32}$/);
  assert.equal(d.werk.name, "Testerin Müller"); assert.equal(d.werk.titel, "Probe <am> Abend");
  assert.deepEqual(d.werk.stapel, { grund: "schwarz", ebenen: [{ effekt: "relief", werte: [.5, 1, 0], modus: "normal", deckkraft: 1, quelle: "bild", seed: 2, aus: false }], durchlauf: true, dauer: 30 });
  assert.equal(d.werk.bild, `werke/${d.id}.jpg`);
  assert.ok(!("schluessel_hash" in d.werk));
  assert.ok(existsSync(join(werkeOrdner, `${d.id}.jpg`)) && existsSync(join(werkeOrdner, `${d.id}.json`)));
  const jpg = readFileSync(join(werkeOrdner, `${d.id}.jpg`));
  assert.deepEqual([jpg[0], jpg[1]], [0xff, 0xd8], "als JPEG abgelegt");
  const liste = await (await fetch(`${basis}?liste`)).json();
  assert.equal(liste.anzahl, 1); assert.equal(liste.werke[0].id, d.id); assert.ok(!("schluessel_hash" in liste.werke[0]));
  assert.equal((await fetch(`${basis}?id=${d.id}`)).status, 200);
  const json = (b) => senden(JSON.stringify(b), { "content-type": "application/json" });
  assert.equal((await json({ aktion: "loeschen", id: d.id, schluessel: "0".repeat(32) })).status, 403);
  assert.equal((await json({ aktion: "loeschen", id: d.id, schluessel: d.schluessel })).status, 200);
  assert.equal((await fetch(`${basis}?liste`)).ok && (await (await fetch(`${basis}?liste`)).json()).anzahl, 0);
  assert.ok(!existsSync(join(werkeOrdner, `${d.id}.jpg`)));
});

test("Grenze: mehr als sechs Werke in der Stunde von derselben Adresse werden abgewiesen (429)", { skip: ohnePhp && "php fehlt" }, async () => {
  const stati = [];
  for (let i = 0; i < 8; i++) stati.push((await senden(formular({ titel: `Nr. ${i}` }))).status);
  assert.deepEqual(stati.slice(0, 6), [201, 201, 201, 201, 201, 201]);
  assert.deepEqual(stati.slice(6), [429, 429]);
  assert.equal(readdirSync(werkeOrdner).filter((f) => f.endsWith(".jpg")).length, 6);
});
