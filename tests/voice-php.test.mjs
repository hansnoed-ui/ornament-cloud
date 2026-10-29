// ornament.studio – die Stimme alpha/voice/stimme.php (PHP auf dem Webspace) mit vorgetäuschtem GitHub: ohne Zugang aus, Passwort nur als Hash,
// Sperre nach Fehlversuchen, nur Herkunft ornament.cloud, Auftrag als workflow_dispatch im privaten Repository, Stand aus dem Workflow-Lauf,
// Artefakt abholen und auspacken, Download nur angemeldet. Braucht php (CLI mit curl und zip); ohne php wird übersprungen.
//   node --test tests/voice-php.test.mjs
import test from "node:test";
import assert from "node:assert/strict";
import { spawn, spawnSync } from "node:child_process";
import { createServer } from "node:http";
import { mkdtempSync, writeFileSync, readFileSync, rmSync, existsSync, readdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const root = new URL("../", import.meta.url);
const php = spawnSync("php", ["-r", "echo function_exists('curl_init') && class_exists('ZipArchive') ? 'ja' : 'nein';"], { encoding: "utf8" });
const ohnePhp = php.status !== 0 || php.stdout !== "ja";

const HERKUNFT = "http://voice.test";
const PASSWORT = "ornament-probe-7";
const TOKEN = "github_pat_test_0123456789";
const geheim = mkdtempSync(join(tmpdir(), "ornament-geheim-"));
const hash = ohnePhp ? "" : spawnSync("php", ["-r", `echo password_hash(${JSON.stringify(PASSWORT)}, PASSWORD_DEFAULT);`], { encoding: "utf8" }).stdout;
const zugang = () => writeFileSync(join(geheim, "stimme.json"), JSON.stringify({ passwort_hash: hash, github_token: TOKEN, repo: "hansnoed-ui/ornament-studio" }));

// das Artefakt: ein ZIP mit stimme.wav, stimme.mp3 und info.json
const zipOrdner = mkdtempSync(join(tmpdir(), "stimme-zip-"));
writeFileSync(join(zipOrdner, "stimme.wav"), "RIFF-wav-probe"); writeFileSync(join(zipOrdner, "stimme.mp3"), "ID3-mp3-probe"); writeFileSync(join(zipOrdner, "info.json"), '{"dauer": 12.5, "saetze": 2}');
if (!ohnePhp) spawnSync("zip", ["-q", "-j", join(zipOrdner, "a.zip"), join(zipOrdner, "stimme.wav"), join(zipOrdner, "stimme.mp3"), join(zipOrdner, "info.json")]);

let gh = { lauf: null }, gesendet = [];
const lauscher = (server) => new Promise((ok) => server.listen(0, "127.0.0.1", () => ok(server.address().port)));
let ghServer, phpServer, basis, ghPort;

test.before(async () => {
  if (ohnePhp) return;
  ghServer = createServer((req, res) => {
    let roh = ""; req.on("data", (d) => (roh += d));
    req.on("end", () => {
      gesendet.push({ methode: req.method, pfad: req.url, auth: req.headers.authorization, body: roh ? JSON.parse(roh) : null });
      const json = (s, d) => { res.writeHead(s, { "content-type": "application/json" }); res.end(JSON.stringify(d)); };
      if (req.method === "POST" && req.url === "/repos/hansnoed-ui/ornament-studio/actions/workflows/stimme.yml/dispatches") { res.writeHead(204); return res.end(); }
      if (req.url.startsWith("/repos/hansnoed-ui/ornament-studio/actions/workflows/stimme.yml/runs")) return json(200, { workflow_runs: gh.lauf ? [{ id: 4711, display_title: "Stimme andere" }, gh.lauf] : [] });
      if (req.url === "/repos/hansnoed-ui/ornament-studio/actions/runs/4711/artifacts") return json(200, { artifacts: [{ id: 99, name: gh.lauf.display_title.replace("Stimme ", "stimme-") }] });
      // wie GitHub: das ZIP liegt hinter einer Weiterleitung auf einem anderen Server, dorthin darf der Schlüssel nicht mit
      if (req.url === "/repos/hansnoed-ui/ornament-studio/actions/artifacts/99/zip") { res.writeHead(302, { location: `http://localhost:${ghPort}/blob/a.zip` }); return res.end(); }
      if (req.url === "/blob/a.zip") { res.writeHead(200, { "content-type": "application/zip" }); return res.end(readFileSync(join(zipOrdner, "a.zip"))); }
      json(404, { message: "Not Found" });
    });
  });
  ghPort = await lauscher(ghServer);
  const frei = createServer(), port = await lauscher(frei);
  await new Promise((ok) => frei.close(ok));
  phpServer = spawn("php", ["-S", `127.0.0.1:${port}`, "-t", fileURLToPath(root)], {
    env: { ...process.env, ORNAMENT_GEHEIM: geheim, ORNAMENT_GITHUB_API: `http://127.0.0.1:${ghPort}`, ORNAMENT_HERKUNFT: HERKUNFT }, stdio: "ignore",
  });
  basis = `http://127.0.0.1:${port}/alpha/voice/stimme.php`;
  for (let i = 0; i < 50; i++) { try { await fetch(basis); return; } catch { await new Promise((r) => setTimeout(r, 100)); } }
  throw new Error("php -S startet nicht");
});
test.after(() => { phpServer?.kill(); ghServer?.close(); rmSync(geheim, { recursive: true, force: true }); rmSync(zipOrdner, { recursive: true, force: true }); });

let keks = "";
const holen = (pfad = "") => fetch(basis + pfad, { headers: keks ? { cookie: keks } : {} });
const schicken = (daten, { origin = HERKUNFT, typ = "application/json" } = {}) =>
  fetch(basis, { method: "POST", headers: { ...(origin ? { origin } : {}), "content-type": typ, ...(keks ? { cookie: keks } : {}) }, body: JSON.stringify(daten) })
    .then(async (r) => { const c = r.headers.get("set-cookie"); if (c) keks = c.split(";")[0]; return { status: r.status, json: await r.json() }; });

test("stimme.php: ohne Zugang aus; mit Zugang bereit, ohne Hash oder Schlüssel zu verraten", { skip: ohnePhp && "kein php" }, async () => {
  assert.deepEqual(await holen().then((r) => r.json()), { bereit: false, angemeldet: false, grund: "Kein Zugang hinterlegt" });
  assert.equal((await schicken({ aktion: "anmelden", passwort: PASSWORT })).status, 503);
  zugang();
  const r = await holen(); const text = await r.text();
  assert.deepEqual(JSON.parse(text), { bereit: true, angemeldet: false });
  assert.ok(!text.includes(TOKEN) && !text.includes(hash.slice(10)));
  assert.match(r.headers.get("cache-control"), /no-store/);
  assert.equal(gesendet.length, 0, "Nachsehen fragt GitHub nicht");
});

test("stimme.php: nur Herkunft ornament.cloud und JSON; ohne Anmeldung nichts", { skip: ohnePhp && "kein php" }, async () => {
  assert.equal((await schicken({ aktion: "anmelden", passwort: PASSWORT }, { origin: "https://fremd.example" })).status, 403);
  assert.equal((await schicken({ aktion: "anmelden", passwort: PASSWORT }, { origin: null })).status, 403);
  assert.equal((await schicken({ aktion: "anmelden", passwort: PASSWORT }, { typ: "text/plain" })).status, 415);
  assert.equal((await schicken({ aktion: "sprechen", text: "Hallo", stil: "b" })).status, 401);
  for (const p of ["?liste", "?auftrag=0123456789abcdef", "?laden=0123456789abcdef"]) assert.equal((await holen(p)).status, 401, p);
  assert.equal(gesendet.length, 0);
});

test("stimme.php: falsches Passwort zählt, nach fünf Fehlversuchen Sperre; richtiges meldet an", { skip: ohnePhp && "kein php" }, async () => {
  for (let i = 0; i < 4; i++) assert.equal((await schicken({ aktion: "anmelden", passwort: "falsch" })).status, 401);
  const gut = await schicken({ aktion: "anmelden", passwort: PASSWORT });
  assert.deepEqual(gut, { status: 200, json: { angemeldet: true } });
  assert.ok(keks.startsWith("ornament_stimme="), "Sitzungs-Cookie");
  assert.deepEqual(await holen().then((r) => r.json()), { bereit: true, angemeldet: true });
  const fremd = keks; keks = "";
  assert.equal((await schicken({ aktion: "anmelden", passwort: "falsch" })).status, 401);
  assert.equal((await schicken({ aktion: "anmelden", passwort: PASSWORT })).status, 429, "gesperrt, auch mit dem richtigen Passwort");
  keks = fremd;
});

test("stimme.php: Auftrag geht als workflow_dispatch ans private Repository, Stand aus dem Lauf, Ergebnis abholen und herunterladen", { skip: ohnePhp && "kein php" }, async () => {
  assert.equal((await schicken({ aktion: "sprechen", text: "", stil: "b" })).status, 400);
  assert.equal((await schicken({ aktion: "sprechen", text: "x".repeat(5001), stil: "b" })).status, 400);
  assert.equal((await schicken({ aktion: "sprechen", text: "Hallo", stil: "z" })).status, 400);
  const r = await schicken({ aktion: "sprechen", text: "Ein Ornament ist keine Verzierung.", stil: "g" });
  assert.equal(r.status, 200);
  const id = r.json.id;
  assert.match(id, /^[a-f0-9]{16}$/);
  const d = gesendet.at(-1);
  assert.equal(d.auth, `Bearer ${TOKEN}`);
  assert.deepEqual(d.body, { ref: "main", inputs: { id, text: "Ein Ornament ist keine Verzierung.", stil: "g" } });

  assert.deepEqual(await holen(`?auftrag=${id}`).then((x) => x.json()), { id, status: "wartet" }, "noch kein Lauf");
  gh.lauf = { id: 4711, display_title: `Stimme ${id}`, status: "in_progress", conclusion: null };
  assert.equal((await holen(`?auftrag=${id}`).then((x) => x.json())).status, "laeuft");
  assert.equal((await holen(`?laden=${id}`)).status, 404, "noch nicht fertig");
  gh.lauf = { ...gh.lauf, status: "completed", conclusion: "success" };
  const vorher = gesendet.length;
  assert.deepEqual(await holen(`?auftrag=${id}`).then((x) => x.json()), { id, status: "fertig", dauer: 12.5 });
  const blob = gesendet.slice(vorher).find((g) => g.pfad === "/blob/a.zip");
  assert.ok(blob, "das ZIP wurde geholt");
  assert.equal(blob.auth, undefined, "der Schlüssel geht nicht an den Speicher hinter der Weiterleitung");
  assert.deepEqual(readdirSync(join(geheim, "stimme", "fertig", id)).sort(), ["info.json", "stimme.mp3", "stimme.wav"]);
  assert.ok(!existsSync(join(geheim, "stimme", "fertig", `${id}.zip`)), "ZIP aufgeräumt");

  const nochmal = gesendet.length;
  await holen(`?auftrag=${id}`);
  assert.equal(gesendet.length, nochmal, "fertige Aufträge fragen GitHub nicht mehr");
  const wav = await holen(`?laden=${id}&format=wav`);
  assert.equal(wav.status, 200);
  assert.equal(wav.headers.get("content-type"), "audio/wav");
  assert.match(wav.headers.get("content-disposition"), new RegExp(`^attachment; filename="stimme-\\d{4}-\\d{2}-\\d{2}-${id}\\.wav"$`));
  assert.equal(await wav.text(), "RIFF-wav-probe");
  const mp3 = await holen(`?laden=${id}&format=mp3&hoeren=1`);
  assert.equal(mp3.headers.get("content-type"), "audio/mpeg");
  assert.match(mp3.headers.get("content-disposition"), /^inline;/);

  const liste = await holen("?liste").then((x) => x.json());
  assert.deepEqual(liste.auftraege.map((a) => [a.id, a.status, a.stil, a.anfang, a.dauer]), [[id, "fertig", "g", "Ein Ornament ist keine Verzierung.", 12.5]]);
  assert.equal((await holen("?laden=../../stimme")).status, 400, "nur echte Kennungen");
});

test("stimme.php: fehlgeschlagener Lauf wird zu «fehler»; abmelden schliesst die Sitzung", { skip: ohnePhp && "kein php" }, async () => {
  const { json } = await schicken({ aktion: "sprechen", text: "Zweiter Text.", stil: "b" });
  gh.lauf = { id: 4711, display_title: `Stimme ${json.id}`, status: "completed", conclusion: "failure" };
  assert.equal((await holen(`?auftrag=${json.id}`).then((x) => x.json())).status, "fehler");
  assert.equal((await schicken({ aktion: "abmelden" })).status, 200);
  assert.equal((await holen("?liste")).status, 401);
});

test("Seite und Workflow passen zusammen: Formular, Download-Formate, Zugang aus Secrets ausserhalb der Website", () => {
  const html = readFileSync(new URL("alpha/voice/index.html", root), "utf8");
  for (const id of ["passwort", "text", "datei", "sprechen", "aufnahmen", "abmelden"]) assert.ok(html.includes(`id="${id}"`), id);
  assert.match(html, /<meta name="robots" content="noindex">/);
  const js = readFileSync(new URL("alpha/voice/voice.js", root), "utf8");
  assert.ok(js.includes('format=${f}') && js.includes('"wav"') && js.includes('"mp3"'));
  const wf = readFileSync(new URL(".github/workflows/hostpoint.yml", root), "utf8");
  for (const s of ["secrets.STIMME_PASSWORT", "secrets.STIMME_GITHUB_TOKEN", "vars.STIMME_REPO", "run: tools/hostpoint/stimme-zugang.sh"]) assert.ok(wf.includes(s), s);
  const sh = readFileSync(new URL("tools/hostpoint/stimme-zugang.sh", root), "utf8");
  assert.ok(sh.includes("password_hash(") && sh.includes("~/ornament-geheim/stimme.json") && sh.includes("umask 077"));
  assert.ok(!/STIMME_PASSWORT"?\s*\|/.test(sh) && !/ssh[^\n]*\$STIMME/.test(sh), "Geheimnisse nie auf der Befehlszeile von ssh");
});
