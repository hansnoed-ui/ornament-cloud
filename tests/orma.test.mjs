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

// Toleranz ±15 % um den Erwartungswert (bei 2000 erwarteten Treffern gut fünf Standardabweichungen)
const near = (n, expected) => n > expected * 0.85 && n < expected * 1.15;

test("Ziehung: erste Ziehung gleichverteilt über alle 48, danach nie dieselbe unmittelbar wieder", () => {
  const N = 2000 * ids.length;
  const first = new Map(ids.map(id => [id, 0]));
  for (let i = 0; i < N; i += 1) { const id = drawNext(ids, null); first.set(id, first.get(id) + 1); }
  // jede kommt vor, keine weicht grob ab (Erwartung 2000)
  for (const [id, n] of first) assert.ok(near(n, 2000), `${id}: ${n}`);

  let last = null;
  const after = new Map(ids.map(id => [id, 0]));
  for (let i = 0; i < N; i += 1) {
    const id = drawNext(ids, last);
    assert.ok(ids.includes(id), "nur freigegebene Konstellationen");
    assert.notEqual(id, last, "keine unmittelbare Wiederholung");
    after.set(id, after.get(id) + 1);
    last = id;
  }
  for (const [id, n] of after) assert.ok(near(n, 2000), `${id}: ${n}`);
});

test("Ziehung: nach einer Konstellation wird gleichverteilt aus den 47 anderen gezogen", () => {
  const last = ids[3], counts = new Map();
  for (let i = 0; i < 2000 * (ids.length - 1); i += 1) { const id = drawNext(ids, last); counts.set(id, (counts.get(id) || 0) + 1); }
  assert.equal(counts.size, ids.length - 1);
  assert.equal(counts.has(last), false);
  for (const n of counts.values()) assert.ok(near(n, 2000), String(n));
});

// ---------- Redaktionsdaten ----------
test("Pilot: 48 Konstellationen aus dem Bestand, Paarung, Text und Frage wörtlich, IDs unverändert", () => {
  assert.equal(pilot.items.length, 48);
  assert.equal(new Set(ids).size, 48);
  for (const it of pilot.items) {
    const c = constellations.find(x => x.id === it.id);
    assert.ok(c, it.id);
    assert.equal(it.text, c.text, `${it.id}: Originaltext`);
    assert.equal(it.question, c.question, `${it.id}: Originalfrage`);
    assert.equal(it.nr, c.editorialNumber);
    assert.equal(it.artist.id, c.artistId);
    assert.equal(it.theorist.id, c.theoristId);
  }
  // keine Konzentration auf wenige Personen: zwölf Künstler:innen und zwölf Theoretiker:innen, jede Person genau viermal
  for (const key of ["artist", "theorist"]) {
    const count = new Map();
    for (const i of pilot.items) count.set(i[key].id, (count.get(i[key].id) || 0) + 1);
    assert.equal(count.size, 12, key);
    for (const [id, n] of count) assert.equal(n, 4, `${id} kommt ${n}-mal vor`);
  }
});

test("Pilot: Redaktion getrennt – die Redaktionsdatei enthält keine Originaltexte, nur Verweise und neue Texte", () => {
  const raw = JSON.parse(readFileSync(new URL("src/orma/redaktion/pilot.json", root), "utf8"));
  for (const k of raw.konstellationen) {
    assert.deepEqual(Object.keys(k).sort(), ["auftraege", "auftraege_allein", "einstieg", "id"]);
    assert.deepEqual(Object.keys(k.auftraege).sort(), ["beispiel", "einwand", "gestaltung"]);
    assert.deepEqual(Object.keys(k.auftraege_allein).sort(), ["beispiel", "einwand", "gestaltung"]);
  }
});

test("Pilot: Einstieg 40–70 Wörter, drei Aufträge, eigene Texte in Schweizer Schreibung (kein ß)", () => {
  for (const it of pilot.items) {
    const w = build.words(it.einstieg);
    assert.ok(w >= 40 && w <= 70, `${it.id}: ${w} Wörter`);
    for (const t of [it.einstieg, ...Object.values(it.auftraege)]) assert.ok(!t.includes("ß"), `${it.id}: ß in «${t.slice(0, 40)}…»`);
    for (const a of Object.values(it.auftraege)) assert.ok(a.length > 40 && a.length < 260, `${it.id}: Auftragslänge`);
  }
  assert.throws(() => build.buildPilot(JSON.stringify({ inhaltsversion: "x", konstellationen: [] })), /genau 48/);
});

test("Pilot: Radplätze gehören den Personen (0–11 je Ring, gleiche Person = gleicher Platz), Zeichen wie in ORNA", () => {
  for (const key of ["artist", "theorist"]) {
    const slotOf = new Map();
    for (const i of pilot.items) {
      if (slotOf.has(i[key].id)) assert.equal(i[key].slot, slotOf.get(i[key].id), `${i[key].id}: zwei Plätze`);
      slotOf.set(i[key].id, i[key].slot);
    }
    assert.deepEqual([...slotOf.values()].sort((a, b) => a - b), [...Array(12).keys()]);
  }
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
  const footY = Math.min(...texts.filter(o => /September|ornament\.cloud/.test(o.text)).map(o => o.y));
  const bodyY = Math.max(...texts.filter(o => !/September|ornament\.cloud/.test(o.text)).map(o => o.y));
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
  assert.equal(m.scope, "app/");
  assert.equal(m.start_url, "app/");
  // Links der Website auf alpha/orma/ liegen ausserhalb des Geltungsbereichs: Sie öffnen im Browser, nicht in der installierten App
  const scope = new URL(m.scope, "https://x/alpha/orma/manifest.webmanifest").pathname;
  assert.ok(!"/alpha/orma/".startsWith(scope), "Website-Link läge im Geltungsbereich der App");
  assert.ok(r.precache.includes("app/"), "App-Seite nicht offline");
  // app/index.html ist dieselbe Seite, alle Adressen eine Ebene höher
  const page = readFileSync(join(out, "index.html"), "utf8"), appPage = readFileSync(join(out, "app/index.html"), "utf8");
  assert.equal(appPage.replace(/(href|src)="\.\.\//g, '$1="'), page);
  for (const [, a] of appPage.matchAll(/(?:href|src)="\.\.\/([^"?]+)/g)) assert.ok(existsSync(join(out, a)), `app/ verweist ins Leere: ${a}`);
  // relative Pfade, kein Bezug auf die Website oder ORNA
  for (const f of ["index.html", "js/app.js", "js/wheel.js"]) {
    const c = readFileSync(join(out, f), "utf8");
    assert.ok(!/nebeneinander-nacheinander\/|\.\.\/\.\.\//.test(c), `${f} verweist nach aussen`);
  }
  const data = readFileSync(join(out, "js/data.js"), "utf8");
  assert.match(data, /Erzeugt von tools\/build-orma\.ts/);
});

// Der Ton (sanft, neugierig, liebevoll, ermutigend) soll in den Sätzen liegen, nicht als Wort darin stehen
test("Redaktion: Einstiege und Aufträge benennen ihren Ton nicht («Findet liebevoll …», «Finde mit Wärme …»)", () => {
  const raw = JSON.parse(readFileSync(new URL("src/orma/redaktion/pilot.json", root), "utf8"));
  const ton = /\b(liebevoll|behutsam|wertschätzend|sanft|neugierig|ermutigend|wohlwollend|warmherzig|freundlich(e[rsnm]?)?|achtsam|empower\w*)\b/i;
  const texte = raw.konstellationen.flatMap(k => [k.einstieg, ...Object.values(k.auftraege), ...Object.values(k.auftraege_allein)]);
  assert.equal(texte.length, raw.konstellationen.length * 7);
  // auch als Wendung: «Finde mit Wärme ein Beispiel …» – zwischen Aufforderung und Gegenstand steht keine Haltung
  const wendung = /\b(Findet|Finde|Sucht|Such|Nennt|Nenne|Erzählt|Erzähl|Beschreibt|Beschreibe)\s+(mit|voller|voll)\s+\p{L}+/u;
  const haltung = /\bmit\s+(Wärme|Neugier|Wohlwollen|Zuversicht|Liebe|Zärtlichkeit|Sanftheit|Behutsamkeit|Freude|Mut|Offenheit|Geduld|Achtsamkeit|Güte|Herz)\b/;
  const treffer = texte.filter(t => ton.test(t) || wendung.test(t) || haltung.test(t));
  assert.deepEqual(treffer, []);
});

// Seit dem 28. September 2026 läuft die Website unter https://ornament.cloud/ (GitHub Pages mit eigener Domain, Datei CNAME).
test("Domain: keine veröffentlichte Datei nennt noch die alte Adresse hansnoed-ui.github.io", () => {
  assert.equal(readFileSync(new URL("CNAME", root), "utf8").trim(), "ornament.cloud");
  const skip = new Set(["node_modules", "dist", ".git", "tests"]);
  const walk = d => readdirSync(d, { withFileTypes: true }).flatMap(e =>
    skip.has(e.name) || e.name.startsWith(".") ? [] : e.isDirectory() ? walk(new URL(e.name + "/", d))
      : /\.(html|js|json|xml|webmanifest|txt)$/.test(e.name) ? [new URL(e.name, d)] : []);
  const alt = walk(root).map(f => f.pathname.slice(root.pathname.length)).filter(f => readFileSync(new URL(f, root), "utf8").includes("hansnoed-ui.github.io"));
  assert.deepEqual(alt, []);
});

// Grundlagenpapiere im Alpha-Bereich: je eine eigene Seite mit PDF, Anwendungsprompt (Download, Kopieren, Textfeld),
// Anleitung und Vorschaubild zum Teilen (tools/alpha-og.mjs)
const PAPIERE = [
  { seite: "pruefraster", titel: "Prüfraster: Nebeneinander und Nacheinander", pdf: "pruefraster-nebeneinander-nacheinander.pdf",
    prompt: "pruefraster-anwendungsprompt-1.0.0.md", art: "Markdown", anfang: /^# Prüfraster: Nebeneinander und Nacheinander\nAnwendungsprompt · Version 1\.0\.0/ },
  { seite: "verteilapparat", titel: "Der Verteilapparat des Körpers", pdf: "verteilapparat-des-koerpers.pdf",
    prompt: "verteilapparat-anwendungsprompt-1.0.0.txt", art: "Text", anfang: /^DER VERTEILAPPARAT DES KÖRPERS – PROMPT ZUM KOPIEREN\nVersion 1\.0\.0/ },
];

test("Alpha: die Grundlagenpapiere stehen in der Übersicht, je mit Seite, PDF und Anwendungsprompt", () => {
  const html = readFileSync(new URL("alpha/index.html", root), "utf8");
  for (const p of PAPIERE) {
    assert.equal(readFileSync(new URL(`alpha/${p.pdf}`, root)).subarray(0, 5).toString(), "%PDF-", p.pdf);
    assert.ok(html.includes(`<a href="${p.seite}/">${p.titel}</a>`), `Seite nicht verlinkt: ${p.seite}`);
    assert.ok(html.includes(`<a href="${p.pdf}">Grundlagenpapier (PDF)</a>`), `PDF nicht verlinkt: ${p.pdf}`);
    assert.ok(html.includes(`<a href="${p.prompt}" download="${p.prompt}">Anwendungsprompt (${p.art})</a>`), `Prompt nicht verlinkt: ${p.prompt}`);
  }
  assert.match(html, /<meta name="robots" content="noindex">/);
});

for (const p of PAPIERE) test(`Alpha, ${p.titel}: eigene Seite mit PDF, Anwendungsprompt, Anleitung und Vorschaubild`, () => {
  const html = readFileSync(new URL(`alpha/${p.seite}/index.html`, root), "utf8");
  const prompt = readFileSync(new URL(`alpha/${p.prompt}`, root), "utf8");
  assert.match(prompt, p.anfang);
  assert.ok(prompt.includes(`https://ornament.cloud/alpha/${p.pdf}`), "Quelle im Prompt zeigt auf das PDF");
  assert.match(html, /<meta name="robots" content="noindex">/);
  assert.ok(html.includes(`<h1>${p.titel}</h1>`));
  assert.ok(html.includes(`href="../${p.pdf}"`));
  assert.ok(html.includes(`href="../${p.prompt}" download="${p.prompt}"`));
  assert.ok(html.includes(`data-kopieren="../${p.prompt}"`));
  assert.ok(html.includes("So gehst du vor") && html.includes("«Meine Eingabe»"));
  // Textfeld zum Markieren und Kopieren: derselbe Text wie die Datei
  const feld = html.match(/<textarea[^>]*>([\s\S]*?)<\/textarea>/)[1]
    .replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&amp;/g, "&");
  assert.equal(feld, prompt, "Textfeld weicht von der Datei ab");
  assert.ok(html.includes(`<meta property="og:image" content="https://ornament.cloud/alpha/${p.seite}/og-${p.seite}.png">`));
  assert.ok(html.includes(`<meta property="og:url" content="https://ornament.cloud/alpha/${p.seite}/">`));
  assert.ok(html.includes(`<meta property="og:title" content="${p.titel}">`));
  const png = readFileSync(new URL(`alpha/${p.seite}/og-${p.seite}.png`, root));
  assert.equal(png.subarray(1, 4).toString(), "PNG");
  assert.deepEqual([png.readUInt32BE(16), png.readUInt32BE(20)], [1200, 630]);
});

// Startseite und News verlinken ORMA seit dem 27. September 2026 (REGELN §14) und gehören darum nicht mehr hierher.
// Eine eigens beauftragte Änderung an ORNA allein ist erlaubt; sie kommt dann als eigener Schritt, nie
// zusammen mit ORMA-Dateien (seit dem 27. September 2026: Hinweis «Verknüpfung erstellen» in beiden Apps).
test("Trennung: kein Stand ändert ORMA- und ORNA-Dateien zugleich (gegenüber main)", () => {
  let base;
  try { base = execFileSync("git", ["merge-base", "HEAD", "origin/main"], { cwd: root, encoding: "utf8" }).trim(); } catch { return; }
  const diff = paths => execFileSync("git", ["diff", "--name-only", base, "--", ...paths], { cwd: root, encoding: "utf8" }).trim();
  const orma = diff(["src/orma", "alpha/orma", "tools/build-orma.ts", "tools/orma-icons.mjs", "tools/orma-og.mjs", "tools/serve-orma.mjs"]);
  const orna = diff(["portfolio", "styles.css", "sitemap.xml", "tools/build-app.ts", "tools/app-icons.mjs"]);
  assert.ok(!(orma && orna), `ORMA und ORNA zugleich geändert:\n${orma}\n${orna}`);
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

test("Alpha: nur Startseite und News verlinken den Alpha-Bereich (ORMA und die Grundlagenpapiere); nicht in der Sitemap, noindex", () => {
  // REGELN §14: Startseite und News → ORMA und die Seiten der beiden Grundlagenpapiere (News seit 28., Startseite seit 29. September 2026)
  const papiere = ["/alpha/orma/", "/alpha/pruefraster/", "/alpha/verteilapparat/"];
  const ziele = { "index.html": papiere, "news/index.html": papiere };
  const allowed = new Set(Object.keys(ziele));
  const gefunden = new Set();
  const found = new Set();
  const skip = new Set(["node_modules", "alpha", "dist", ".git"]);
  const walk = d => readdirSync(d, { withFileTypes: true }).flatMap(e =>
    skip.has(e.name) || e.name.startsWith(".") ? [] : e.isDirectory() ? walk(new URL(e.name + "/", d)) : e.name.endsWith(".html") ? [new URL(e.name, d)] : []);
  for (const f of walk(root)) {
    for (const [, href] of readFileSync(f, "utf8").matchAll(/href="([^"]+)"/g)) {
      if (/^[a-z]+:/i.test(href) && !/(ornament-cloud|ornament\.cloud)\/alpha/.test(href)) continue;
      const target = new URL(href, f).pathname, file = f.pathname.slice(root.pathname.length);
      if (!target.includes("/alpha/")) continue;
      assert.ok(allowed.has(file), `${file} verlinkt den Alpha-Bereich: ${href}`);
      assert.ok(ziele[file].some(z => target.endsWith(z)), `${file}: ${href} ist im Alpha-Bereich nicht freigegeben`);
      found.add(file);
      gefunden.add(`${file} → ${ziele[file].find(z => target.endsWith(z))}`);
    }
  }
  assert.deepEqual([...found].sort(), [...allowed].sort(), "Startseite und News verlinken ORMA");
  for (const [f, zs] of Object.entries(ziele)) for (const z of zs) assert.ok(gefunden.has(`${f} → ${z}`), `${f} verlinkt ${z} nicht`);
  assert.ok(!readFileSync(new URL("sitemap.xml", root), "utf8").includes("/alpha/"));
  for (const p of ["alpha/index.html", "alpha/orma/index.html", "alpha/pruefraster/index.html", "alpha/verteilapparat/index.html"])
    assert.match(readFileSync(new URL(p, root), "utf8"), /<meta name="robots" content="noindex/, p);
});

// ---------- Re-Entry (allein) ----------
test("Re-Entry: erster Durchgang öffnet eine Schleife, sie wird zur Konstellation gefunden und nach dem zweiten geschlossen", () => {
  const s = memory();
  const r = store.newRound({ mode: "allein" });
  assert.equal(r.mode, "allein");
  Object.assign(r, { constellationId: ids[5], contentVersion: pilot.contentVersion, auftrag: "einwand" });
  r.answers.a.text = "damals gedacht";
  const { ok, loop } = store.openLoop(s, r, new Date("2026-09-27T10:00:00Z"));
  assert.ok(ok);
  assert.equal(store.openLoop(s, r).loop.id, loop.id, "einmal je Runde");
  assert.equal(store.loadLoops(s).loops.length, 1);
  assert.equal(store.openLoopFor(s, ids[4]), null);
  const found = store.openLoopFor(s, ids[5]);
  assert.deepEqual([found.text, found.auftrag, found.at], ["damals gedacht", "einwand", "2026-09-27T10:00:00.000Z"]);
  // ältere Schleife zuerst, falls es mehrere gibt
  const r2 = store.newRound({ mode: "allein" }); Object.assign(r2, { constellationId: ids[5], auftrag: "beispiel" });
  store.openLoop(s, r2, new Date("2026-09-28T10:00:00Z"));
  assert.equal(store.openLoopFor(s, ids[5]).id, loop.id);
  store.closeLoop(s, loop.id);
  assert.equal(store.openLoopFor(s, ids[5]).id, r2.id);
  // Modus und Datum des ersten Durchgangs bleiben im Gedankenbuch erhalten
  const second = store.newRound({ mode: "allein" });
  Object.assign(second, { constellationId: ids[5], auftrag: "einwand", loopId: loop.id, firstAt: loop.at });
  const e = store.sanitizeEntry({ ...second, savedAt: new Date().toISOString() });
  assert.equal(e.mode, "allein");
  assert.equal(e.firstAt, loop.at);
  assert.equal("loopId" in e, false);
});

test("Re-Entry: beschädigte Schleifen werden aufbewahrt; «Alle löschen» entfernt auch Schleifen; Sicherung und Import tragen sie mit", () => {
  const s = memory({ [store.KEYS.loops]: "kaputt", fremd: "bleibt" });
  assert.match(store.loadLoops(s).error, /beschädigt/);
  assert.equal(s.getItem(store.KEYS.loopsDamaged), "kaputt");
  store.deleteAllEntries(s);
  assert.equal(s.getItem(store.KEYS.loops), null);
  assert.equal(s.getItem(store.KEYS.loopsDamaged), null);
  assert.equal(s.getItem("fremd"), "bleibt");

  const loop = store.sanitizeLoop({ id: "l1", constellationId: ids[0], auftrag: "beispiel", text: "erste", at: "2026-09-27T10:00:00Z" });
  const backup = JSON.stringify(store.makeBackup([], new Date(), [loop, { id: "l2", constellationId: ids[1], auftrag: "falsch" }]));
  const res = store.mergeBackup(backup, [], [store.sanitizeLoop({ ...loop, text: "meine Fassung" })]);
  assert.equal(res.loopsAdded, 0);
  assert.equal(res.skipped, 1);
  assert.equal(res.invalid, 1);
  assert.equal(res.loops[0].text, "meine Fassung", "nicht überschrieben");
  assert.equal(store.mergeBackup(backup, [], []).loopsAdded, 1);
  // ältere Sicherung ohne Schleifen bleibt lesbar
  const old = JSON.stringify({ format: store.BACKUP_FORMAT, version: 1, entries: [] });
  assert.deepEqual(store.mergeBackup(old, [], []).loops, []);
});

test("Re-Entry-Karte: Beschriftung mit den Daten der beiden Durchgänge und «Der dritte Gedanke»", () => {
  const data = { ...cardData(false), labels: { a: "Ich, am 27. September 2026", b: "Ich, am 3. Oktober 2026" }, resultLabel: "Der dritte Gedanke" };
  const txt = layoutCard(data, { names: false, answers: true, result: true }, measure).ops.map(o => o.text || "").join(" | ");
  assert.match(txt, /Der dritte Gedanke/);
  assert.match(txt, /Ich, am 27\. September 2026/);
  assert.match(txt, /Ich, am 3\. Oktober 2026/);
  assert.ok(!txt.includes("Zuerst"));
});

test("Re-Entry: Spielaufträge für den Modus allein sprechen eine Person an (du), nie mehrere (ihr)", () => {
  const plural = /\b(ihr|euch|euer|eure[nmrs]?|gegenseitig|einander)\b|\b(Wählt|Nennt|Findet|Sucht|Schreibt|Legt|Stellt|Erinnert|Denkt|Zeichnet|Macht|Beschreibt|Notiert|Nehmt|Lasst|Gebt|Haltet|Verändert|Verlängert|Benutzt|Vergleicht|Diktiert|Vereinbart|Schliesst|Erfindet|Erzählt|Zeigt|Führt|Geht)\b/;
  for (const it of pilot.items) {
    for (const [a, t] of Object.entries(it.auftraegeAllein)) {
      assert.ok(!plural.test(t), `${it.id} ${a}: «${t}»`);
      assert.ok(/\b(du|dich|dir|dein\w*)\b|^[A-ZÄÖÜ][a-zäöüß]+(e)?\b/.test(t), `${it.id} ${a}: keine Du-Anrede`);
      assert.ok(!t.includes("ß"), `${it.id} ${a}: ß`);
      assert.ok(t.length > 40 && t.length < 260, `${it.id} ${a}: Länge ${t.length}`);
    }
    assert.notDeepEqual(it.auftraegeAllein, it.auftraege, `${it.id}: Du-Fassung fehlt`);
  }
});

// ---------- Symbol und Vorschaubild (wie ORNA, vertikal geteilt, rechts invers) ----------
test("Symbol und Vorschaubild: ORNA-Motiv geteilt, PNG-Grössen stimmen, Vorschaubild mit absoluter Adresse eingebunden", () => {
  const dir = new URL("src/orma/app/", root);
  const svg = readFileSync(new URL("icons/icon.svg", dir), "utf8");
  assert.match(svg, /<clipPath id="rechts"><rect x="50" y="0" width="50" height="100"\/>/);
  assert.match(svg, /fill="#f8f8f6"/);
  assert.match(svg, /fill="#1f1d1a"/);
  const size = f => { const b = readFileSync(new URL(f, dir)); assert.equal(b.subarray(1, 4).toString(), "PNG", f); return [b.readUInt32BE(16), b.readUInt32BE(20)]; };
  const m = JSON.parse(readFileSync(new URL("manifest.webmanifest", dir), "utf8"));
  for (const i of m.icons) assert.equal(size(i.src).join("x"), i.sizes, i.src);
  assert.deepEqual(size("icons/apple-touch-icon.png"), [180, 180]);
  assert.deepEqual(size("og-orma.png"), [1200, 630]);
  const out = mkdtempSync(join(tmpdir(), "orma-"));
  const r = build.buildOrma(out);
  const html = readFileSync(join(out, "index.html"), "utf8");
  const url = JSON.parse(readFileSync(new URL("src/orma/orma.json", root), "utf8")).url;
  assert.ok(html.includes(`<meta property="og:image" content="${url}og-orma.png">`));
  assert.ok(!html.includes("%%URL%%"));
  assert.ok(r.precache.includes("og-orma.png"));
  assert.match(html, /<script type="module" src="js\/intro\.js\?v=/);
});

test("Alpha: oben links führt «Ornament Cloud» zur Startseite und «Alpha» zur Alpha-Übersicht", () => {
  for (const [p, start, alpha] of [["alpha/index.html", "../", "./"], ["alpha/pruefraster/index.html", "../../", "../"], ["alpha/verteilapparat/index.html", "../../", "../"]]) {
    const kopf = readFileSync(new URL(p, root), "utf8").match(/<p class="eyebrow brand">(.*?)<\/p>/)[1];
    assert.match(kopf, new RegExp(`<a href="${start.replace(/\./g, "\\.")}"[^>]*>Ornament Cloud</a> · <a href="${alpha.replace(/\./g, "\\.")}"[^>]*>Alpha</a>`), p);
  }
});
