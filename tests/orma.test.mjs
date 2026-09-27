// ORMA – Unit-Tests: Ziehung, Redaktionsdaten, Speicher und Import, Kartenlayout, Build-Trennung von ORNA.
//   node --experimental-strip-types --no-warnings --test tests/orma.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync, mkdtempSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { execFileSync } from "node:child_process";

const root = new URL("../", import.meta.url);
const js = p => new URL(`src/orma/app/js/${p}`, root).href;
const { randomIndex, drawNext } = await import(js("draw.js"));
const store = await import(js("store.js"));
const { layoutCard, wrap, CARD_WIDTH } = await import(js("card.js"));
const build = await import(new URL("tools/build-orma.ts", root).href);
const { constellations } = await import(new URL("src/doppelspalt/src/data/constellations.ts", root).href);
const { artists } = await import(new URL("src/doppelspalt/src/data/artists.ts", root).href);
const { theorists } = await import(new URL("src/doppelspalt/src/data/theorists.ts", root).href);

const pilot = build.buildPilot();
const ids = pilot.items.map(i => i.id);

function memory(init = {}) {
  const m = new Map(Object.entries(init));
  return { getItem: k => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)), removeItem: k => m.delete(k), map: m };
}

// ---------- Ziehung ----------
test("Ziehung: Rejection Sampling verwirft Werte oberhalb des letzten vollen Vielfachen", () => {
  const limit = Math.floor(0x100000000 / 12) * 12;
  const seq = [0xffffffff, limit, 25];                        // die ersten beiden liegen über der Grenze
  assert.equal(randomIndex(12, () => seq.shift()), 1);
  assert.equal(seq.length, 0);
});

test("Ziehung: erste Ziehung gleichverteilt über alle zwölf, danach nie dieselbe unmittelbar wieder", () => {
  const N = 24000;
  const first = new Map(ids.map(id => [id, 0]));
  for (let i = 0; i < N; i += 1) { const id = drawNext(ids, null); first.set(id, first.get(id) + 1); }
  // jede der zwölf kommt vor, keine weicht grob ab (Erwartung 2000)
  for (const [id, n] of first) assert.ok(n > 1700 && n < 2300, `${id}: ${n}`);

  let last = null;
  const after = new Map(ids.map(id => [id, 0]));
  for (let i = 0; i < N; i += 1) {
    const id = drawNext(ids, last);
    assert.ok(ids.includes(id), "nur freigegebene Konstellationen");
    assert.notEqual(id, last, "keine unmittelbare Wiederholung");
    after.set(id, after.get(id) + 1);
    last = id;
  }
  for (const [id, n] of after) assert.ok(n > 1700 && n < 2300, `${id}: ${n}`);
});

test("Ziehung: nach einer Konstellation wird gleichverteilt aus den elf anderen gezogen", () => {
  const last = ids[3], counts = new Map();
  for (let i = 0; i < 22000; i += 1) { const id = drawNext(ids, last); counts.set(id, (counts.get(id) || 0) + 1); }
  assert.equal(counts.size, 11);
  assert.equal(counts.has(last), false);
  for (const n of counts.values()) assert.ok(n > 1700 && n < 2300);
});

// ---------- Redaktionsdaten ----------
test("Pilot: zwölf Konstellationen aus dem Bestand, Paarung, Text und Frage wörtlich, IDs unverändert", () => {
  assert.equal(pilot.items.length, 12);
  assert.equal(new Set(ids).size, 12);
  for (const it of pilot.items) {
    const c = constellations.find(x => x.id === it.id);
    assert.ok(c, it.id);
    assert.equal(it.text, c.text, `${it.id}: Originaltext`);
    assert.equal(it.question, c.question, `${it.id}: Originalfrage`);
    assert.equal(it.nr, c.editorialNumber);
    assert.equal(it.artist.id, c.artistId);
    assert.equal(it.theorist.id, c.theoristId);
  }
  // keine Konzentration auf wenige Personen: zwölf verschiedene Künstler:innen und Theoretiker:innen
  assert.equal(new Set(pilot.items.map(i => i.artist.id)).size, 12);
  assert.equal(new Set(pilot.items.map(i => i.theorist.id)).size, 12);
});

test("Pilot: Redaktion getrennt – die Redaktionsdatei enthält keine Originaltexte, nur Verweise und neue Texte", () => {
  const raw = JSON.parse(readFileSync(new URL("src/orma/redaktion/pilot.json", root), "utf8"));
  for (const k of raw.konstellationen) {
    assert.deepEqual(Object.keys(k).sort(), ["auftraege", "einstieg", "id"]);
    assert.deepEqual(Object.keys(k.auftraege).sort(), ["beispiel", "einwand", "gestaltung"]);
  }
});

test("Pilot: Einstieg 40–70 Wörter, drei Aufträge, eigene Texte in Schweizer Schreibung (kein ß)", () => {
  for (const it of pilot.items) {
    const w = build.words(it.einstieg);
    assert.ok(w >= 40 && w <= 70, `${it.id}: ${w} Wörter`);
    for (const t of [it.einstieg, ...Object.values(it.auftraege)]) assert.ok(!t.includes("ß"), `${it.id}: ß in «${t.slice(0, 40)}…»`);
    for (const a of Object.values(it.auftraege)) assert.ok(a.length > 40 && a.length < 260, `${it.id}: Auftragslänge`);
  }
  assert.throws(() => build.buildPilot(JSON.stringify({ inhaltsversion: "x", konstellationen: [] })), /genau 12/);
});

test("Pilot: Radplätze sind je Ring eine Belegung 0–11, Zeichen wie in ORNA (gleiche Person, gleiches Zeichen)", () => {
  assert.deepEqual(pilot.items.map(i => i.artist.slot).sort((a, b) => a - b), [...Array(12).keys()]);
  assert.deepEqual(pilot.items.map(i => i.theorist.slot).sort((a, b) => a - b), [...Array(12).keys()]);
  for (const it of pilot.items) {
    assert.equal(it.artist.symbol, artists.findIndex(p => p.id === it.artist.id));
    assert.equal(it.theorist.symbol, artists.length + theorists.findIndex(p => p.id === it.theorist.id));
  }
  // Abschrift der Zeichen-Grammatik stimmt mit ORNA überein
  const orna = readFileSync(new URL("portfolio/nebeneinander-nacheinander/js/symbols.js", root), "utf8");
  const orma = readFileSync(new URL("src/orma/app/js/symbols.js", root), "utf8");
  assert.ok(orma.endsWith(orna), "symbols.js weicht von ORNA ab");
});

// ---------- Speicher ----------
test("Speicher: Entwurf übersteht Schliessen; beschädigter Entwurf führt zu Meldung, nicht zu Absturz", () => {
  const s = memory();
  const r = store.newRound({ names: { a: "Mira", b: "" } });
  r.constellationId = ids[0]; r.step = "antwort-a"; r.answers.a.text = "halb geschrieben";
  store.saveDraft(s, r);
  const { draft } = store.loadDraft(s);
  assert.equal(draft.answers.a.text, "halb geschrieben");
  assert.equal(draft.step, "antwort-a");
  s.setItem(store.KEYS.draft, "{kaputt");
  const bad = store.loadDraft(s);
  assert.equal(bad.draft, null);
  assert.match(bad.error, /nicht lesen/);
});

test("Speicher: Gedankenbuch behalten, Favorit, einzeln löschen; ursprüngliche Antworten bleiben neben Ergänzungen", () => {
  const s = memory();
  const r = store.newRound({ names: { a: "A", b: "B" } });
  Object.assign(r, { constellationId: ids[1], contentVersion: pilot.contentVersion, auftrag: "einwand" });
  r.answers.a.text = "erste Antwort"; r.answers.b.oral = true; r.extensions.a = "später ergänzt";
  r.result = { mode: "positionen", gemeinsam: "", a: "bleibt", b: "auch" };
  const { ok, entry } = store.keepRound(s, r, new Date("2026-09-27T10:00:00Z"));
  assert.ok(ok);
  assert.equal(entry.answers.a.text, "erste Antwort");
  assert.equal(entry.extensions.a, "später ergänzt");
  assert.equal(entry.contentVersion, pilot.contentVersion);
  assert.equal("step" in entry, false);
  store.setFavorite(s, entry.id, true);
  assert.equal(store.loadBook(s).entries[0].favorite, true);
  store.deleteEntry(s, entry.id);
  assert.deepEqual(store.loadBook(s).entries, []);
});

test("Speicher: beschädigtes Gedankenbuch wird aufbewahrt, nie still überschrieben", () => {
  const s = memory({ [store.KEYS.book]: "nicht json" });
  const res = store.loadBook(s);
  assert.deepEqual(res.entries, []);
  assert.match(res.error, /beschädigt/);
  assert.equal(s.getItem(store.KEYS.bookDamaged), "nicht json");
  const r = store.newRound(); r.constellationId = ids[0];
  store.keepRound(s, r);
  assert.equal(s.getItem(store.KEYS.bookDamaged), "nicht json", "aufbewahrter Inhalt bleibt");
  assert.equal(store.loadBook(s).entries.length, 1);
  // einzelne unlesbare Einträge
  const t = memory({ [store.KEYS.book]: JSON.stringify([{ id: "x", constellationId: ids[0] }, { kaputt: true }]) });
  const part = store.loadBook(t);
  assert.equal(part.entries.length, 1);
  assert.match(part.error, /1 Eintrag/);
});

test("Speicher: «Alle löschen» betrifft nur das ORMA-Gedankenbuch, nie fremde Schlüssel oder den Entwurf", () => {
  const s = memory({ "orna-intro": "1", "fremd": "bleibt", [store.KEYS.draft]: "{}", [store.KEYS.book]: "[]", [store.KEYS.bookDamaged]: "alt" });
  store.deleteAllEntries(s);
  assert.equal(s.getItem("orna-intro"), "1");
  assert.equal(s.getItem("fremd"), "bleibt");
  assert.equal(s.getItem(store.KEYS.draft), "{}");
  assert.equal(s.getItem(store.KEYS.book), null);
  assert.equal(s.getItem(store.KEYS.bookDamaged), null);
  for (const k of Object.values(store.KEYS)) assert.ok(k.startsWith(store.PREFIX));
});

test("Import: Sicherung prüfen, vorhandene Einträge nie überschreiben, Ungültiges zählen, Text bleibt Text", () => {
  const mk = (id, text) => store.sanitizeEntry({ id, constellationId: ids[0], savedAt: "2026-09-27T10:00:00Z", answers: { a: { text } } });
  const existing = [mk("e1", "meine Fassung")];
  const backup = store.makeBackup([mk("e1", "andere Fassung"), mk("e2", "<img src=x onerror=alert(1)>"), { id: "", constellationId: 3 }]);
  const res = store.mergeBackup(JSON.stringify(backup), existing);
  assert.equal(res.added, 1);
  assert.equal(res.skipped, 1);
  assert.equal(res.invalid, 1);
  assert.equal(res.entries.find(e => e.id === "e1").answers.a.text, "meine Fassung", "nicht überschrieben");
  assert.equal(res.entries.find(e => e.id === "e2").answers.a.text, "<img src=x onerror=alert(1)>", "als Text erhalten");
  assert.match(store.mergeBackup("kein json", []).error, /keine lesbare/);
  assert.match(store.mergeBackup(JSON.stringify({ format: "anderes", entries: [] }), []).error, /keine ORMA-Sicherung/);
  assert.match(store.mergeBackup(JSON.stringify({ format: store.BACKUP_FORMAT, version: 9, entries: [] }), []).error, /unbekanntes Format/);
  // fremde Felder fallen weg, überlange Texte werden begrenzt
  const e = store.sanitizeEntry({ id: "z", constellationId: ids[0], boese: 1, answers: { a: { text: "x".repeat(9000) } } });
  assert.equal("boese" in e, false);
  assert.equal(e.answers.a.text.length, 4000);
});

// ---------- Ergebniskarte ----------
const measure = (t, font) => t.length * parseInt(font.match(/(\d+)px/)[1], 10) * 0.55;
const cardData = long => ({
  artist: "Eva Hesse", theorist: "Susan Leigh Star", question: "Wer hält ein alterndes Werk zusammen?", auftrag: "beispiel",
  names: { a: "Mira", b: "Jon" },
  answers: { a: { text: long ? "Wort ".repeat(400) + "Donaudampfschifffahrtsgesellschaftskapitänsmützenabzeichen" : "kurz", oral: false }, b: { text: "", oral: true } },
  result: { mode: "gemeinsam", gemeinsam: long ? "Gedanke ".repeat(200) : "gemeinsam", a: "", b: "" },
  date: "27. September 2026",
});

test("Karte: ohne Auswahl nur Paarung und Frage; Namen und Antworten nur auf Wunsch", () => {
  const plain = layoutCard(cardData(false), { names: false, answers: false, result: false }, measure);
  const txt = plain.ops.filter(o => o.type === "text").map(o => o.text).join(" ");
  assert.match(txt, /Eva Hesse × Susan Leigh Star/);
  assert.match(txt, /Wer hält/);
  for (const bad of ["Mira", "Jon", "kurz", "gemeinsam"]) assert.ok(!txt.includes(bad), `${bad} ohne Auswahl sichtbar`);
  const withAnswers = layoutCard(cardData(false), { names: false, answers: true, result: false }, measure).ops.map(o => o.text || "").join(" ");
  assert.match(withAnswers, /Person A/);
  assert.ok(!withAnswers.includes("Mira"), "Namen nur mit eigener Auswahl");
  const withNames = layoutCard(cardData(false), { names: true, answers: true, result: false }, measure).ops.map(o => o.text || "").join(" ");
  assert.match(withNames, /Mira/);
  assert.match(withNames, /mündlich/);
});

test("Karte: lange Texte und Umlaute werden umbrochen, nie abgeschnitten; die Karte wird höher", () => {
  const short = layoutCard(cardData(false), { names: true, answers: true, result: true }, measure);
  const long = layoutCard(cardData(true), { names: true, answers: true, result: true }, measure);
  assert.equal(short.height, 1350);
  assert.ok(long.height > 3000, `Höhe ${long.height}`);
  for (const o of long.ops.filter(o => o.type === "text")) {
    assert.ok(measure(o.text, o.font) <= CARD_WIDTH - 2 * 96 + 0.5, `zu breit: ${o.text.slice(0, 30)}`);
    assert.ok(o.y < long.height - 40, "Text innerhalb der Karte");
  }
  const joined = long.ops.filter(o => o.type === "text").map(o => o.text.replace(/-$/, "")).join("");
  assert.ok(joined.includes("Donaudampf"), "überlanges Wort erhalten");
  // der Fuss überlappt den Inhalt nicht
  const texts = long.ops.filter(o => o.type === "text");
  const footY = Math.min(...texts.filter(o => /September|github/.test(o.text)).map(o => o.y));
  const bodyY = Math.max(...texts.filter(o => !/September|github/.test(o.text)).map(o => o.y));
  assert.ok(footY > bodyY + 40);
  assert.deepEqual(wrap("ä ö ü", "10px x", 1000, measure), ["ä ö ü"]);
});

// ---------- Build und Trennung ----------
test("Build: eigene Ausgabe, eigener Cache «orma-», Manifest-Kennung und Geltungsbereich getrennt von ORNA", () => {
  const out = mkdtempSync(join(tmpdir(), "orma-"));
  const r = build.buildOrma(out);
  const sw = readFileSync(join(out, "sw.js"), "utf8");
  assert.match(sw, /const CACHE = `orma-\$\{VERSION\}`/);
  assert.match(sw, new RegExp(`const VERSION = "${r.version}"`));
  assert.match(sw, /k\.startsWith\("orma-"\)/, "räumt nur eigene Caches auf");
  assert.ok(!sw.includes('"nn-'), "kein Bezug auf ORNA-Caches");
  for (const f of r.precache) {
    const p = join(out, f === "./" ? "index.html" : f.replace(/\?v=.*$/, ""));
    assert.ok(existsSync(p), `fehlt: ${f}`);
  }
  for (const need of ["./", "js/app.js", "js/data.js", "orma.css", "manifest.webmanifest", "icons/icon-192.png"])
    assert.ok(r.precache.some(f => f === need || f.startsWith(need + "?v=")), `nicht offline: ${need}`);
  const m = JSON.parse(readFileSync(join(out, "manifest.webmanifest"), "utf8"));
  const orna = JSON.parse(readFileSync(new URL("portfolio/nebeneinander-nacheinander/app.webmanifest", root), "utf8"));
  assert.equal(m.name, "ORMA");
  assert.notEqual(m.id, orna.id);
  assert.equal(m.scope, "./");
  // relative Pfade, kein Bezug auf die Website oder ORNA
  for (const f of ["index.html", "js/app.js", "js/wheel.js"]) {
    const c = readFileSync(join(out, f), "utf8");
    assert.ok(!/nebeneinander-nacheinander\/|\.\.\/\.\.\//.test(c), `${f} verweist nach aussen`);
  }
  const data = readFileSync(join(out, "js/data.js"), "utf8");
  assert.match(data, /Erzeugt von tools\/build-orma\.ts/);
});

test("Trennung: ORNA-Dateien sind auf diesem Stand unverändert gegenüber main", () => {
  let base;
  try { base = execFileSync("git", ["merge-base", "HEAD", "origin/main"], { cwd: root, encoding: "utf8" }).trim(); } catch { return; }
  const changed = execFileSync("git", ["diff", "--name-only", base, "--", "portfolio", "index.html", "styles.css", "news", "sitemap.xml", "tools/build-app.ts", "tools/app-icons.mjs"], { cwd: root, encoding: "utf8" }).trim();
  assert.equal(changed, "", `geändert: ${changed}`);
});

// ---------- Alpha-Bereich der Website ----------
test("Alpha: alpha/orma ist der aktuelle Build (sonst: tools/build-orma.ts --alpha)", () => {
  const out = mkdtempSync(join(tmpdir(), "orma-"));
  build.buildOrma(out);
  const list = d => readdirSync(d, { withFileTypes: true }).flatMap(e => e.isDirectory() ? list(join(d, e.name)).map(f => `${e.name}/${f}`) : [e.name]);
  const alpha = new URL("alpha/orma/", root).pathname;
  assert.deepEqual(list(alpha).sort(), list(out).sort());
  for (const f of list(out)) assert.ok(readFileSync(join(out, f)).equals(readFileSync(join(alpha, f))), `veraltet: alpha/orma/${f}`);
});

test("Alpha: öffentlich, aber von keiner Seite verlinkt, nicht in der Sitemap, für Suchmaschinen gesperrt", () => {
  const skip = new Set(["node_modules", "alpha", "dist", ".git"]);
  const walk = d => readdirSync(d, { withFileTypes: true }).flatMap(e =>
    skip.has(e.name) || e.name.startsWith(".") ? [] : e.isDirectory() ? walk(new URL(e.name + "/", d)) : e.name.endsWith(".html") ? [new URL(e.name, d)] : []);
  for (const f of walk(root)) {
    for (const [, href] of readFileSync(f, "utf8").matchAll(/href="([^"]+)"/g)) {
      if (/^[a-z]+:/i.test(href) && !href.includes("ornament-cloud/alpha")) continue;
      assert.ok(!new URL(href, f).pathname.includes("/alpha/"), `${f.pathname.slice(root.pathname.length)} verlinkt den Alpha-Bereich: ${href}`);
    }
  }
  assert.ok(!readFileSync(new URL("sitemap.xml", root), "utf8").includes("/alpha/"));
  for (const p of ["alpha/index.html", "alpha/orma/index.html"])
    assert.match(readFileSync(new URL(p, root), "utf8"), /<meta name="robots" content="noindex/, p);
});
