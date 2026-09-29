// «Zu seiner Zeit» – Prüfungen von Daten, Build und erzeugten Seiten.
//   node --experimental-strip-types --no-warnings --test tests/zu-seiner-zeit.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";

const root = new URL("../", import.meta.url);
const build = await import(new URL("tools/build-zu-seiner-zeit.ts", root).href);
const { zufallsZahl, andereStrophe } = await import(new URL("zu-seiner-zeit/zsz.js", root).href);
const raw = JSON.parse(readFileSync(new URL("src/data/zu-seiner-zeit.json", root), "utf8"));
const m = build.model();
const read = p => readFileSync(new URL("zu-seiner-zeit/" + p, root), "utf8");
const esc = s => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

test("Daten: 49 Strophen in sieben Zyklen zu sieben, je vier Verweise in fester Reihenfolge", () => {
  assert.equal(raw.stanzas.length, 49);
  assert.deepEqual(raw.cycles.map(c => `${c.roman} ${c.name}`), ["I Operation", "II Rekursion", "III Adresse", "IV Koppelung", "V Kunst", "VI Plattform", "VII Zukunft"]);
  for (const c of raw.cycles) assert.equal(c.stanzas.length, 7);
  // Rubriken je Position; einzige Ausnahme seit der Redaktionsfassung vom 29. September 2026: Strophe 4, ¹ Kybernetik (von Foerster)
  for (const s of raw.stanzas) assert.deepEqual(s.references.map(r => r.domain), [s.number === 4 ? "Kybernetik" : "Soziologie", "Philosophie", "Kunst", "Literatur"], `${s.number}`);
  assert.deepEqual(raw.stanzas.map(s => s.number), Array.from({ length: 49 }, (_, i) => i + 1));
  assert.equal(raw.stanzas.flatMap(s => s.references).length, 196);
  assert.equal(raw.stanzas[36].references[0].citation.split(", ")[0], "Klaus Kusanowsky");   // Korrektur vom 28. September 2026
});

test("Modell: Texte, Titel, Bottom-Lines und Verweise wörtlich aus der Quelle, nichts erfunden", () => {
  for (const [i, s] of m.stanzas.entries()) {
    const r = raw.stanzas[i];
    assert.equal(s.title, r.title); assert.equal(s.text, r.text); assert.equal(s.bottomLine, r.bottom_line);
    assert.deepEqual(s.references.map(x => (x.work ? `${x.person}, ${x.work}` : x.person)), r.references.map(x => x.citation));
    assert.deepEqual(s.references.map(x => x.note), r.references.map(x => x.resonance));
    for (const x of s.references) { assert.equal(x.url, null, "keine erfundenen Links"); assert.deepEqual(x.tags, []); }
    assert.deepEqual(s.tags, []); assert.deepEqual(s.related.conceptual, [], "begrifflich verwandt: erst nach Eintrag");
  }
  assert.deepEqual(m.begriffe, []);
  // Resonanzen nur über tatsächlich gemeinsame Personen
  for (const s of m.stanzas) for (const r of s.related.resonances) {
    const andere = new Set(m.stanzas[r.id - 1].references.map(x => x.slug));
    for (const v of r.via) assert.ok(andere.has(v.slug) && s.references.some(x => x.slug === v.slug));
  }
});

test("Adressen: eindeutig und lesbar (Umlaute umgeschrieben, Akzente entfernt)", () => {
  assert.equal(m.stanzas[36].slug, "37-die-information");
  assert.equal(m.stanzas[43].slug, "44-die-moeglichkeit");
  assert.equal(build.slugify("Stanisław Lem"), "stanislaw-lem");
  assert.equal(build.slugify("Paul Ricœur"), "paul-ricoeur");
  assert.equal(build.slugify("Constantin Brâncuși"), "constantin-brancusi");
  assert.equal(new Set(m.stanzas.map(s => s.slug)).size, 49);
  assert.equal(new Set(m.persons.map(p => p.slug)).size, m.persons.length);
  assert.deepEqual(build.splitCitation("Jorge Luis Borges, Pierre Menard, Autor des Quijote"), { person: "Jorge Luis Borges", work: "Pierre Menard, Autor des Quijote" });
});

test("Ergänzungen: unbekannte Nummern, Personen und unsichere Links werden abgelehnt", () => {
  assert.throws(() => build.model(raw, { strophen: { 50: {} } }), /unbekannte Strophe/);
  assert.throws(() => build.model(raw, { strophen: { 3: { related: [3] } } }), /related/);
  assert.throws(() => build.model(raw, { personen: { "niemand-hier": { url: "https://x" } } }), /unbekannte Person/);
  assert.throws(() => build.model(raw, { personen: { "hito-steyerl": { url: "javascript:alert(1)" } } }), /https/);
  const mit = build.model(raw, { strophen: { 37: { related: [45] } }, personen: { "hito-steyerl": { url: "https://example.org/steyerl" } }, begriffe: [{ slug: "kontingenz", name: "Kontingenz", stanzas: [45] }] });
  assert.deepEqual(mit.stanzas[36].related.conceptual, [45]);
  assert.equal(mit.stanzas[36].references[2].url, "https://example.org/steyerl");
  const f = build.files(mit);
  assert.ok(f.has("begriff/kontingenz/index.html"));
  assert.match(f.get("strophe/37-die-information/index.html"), /Begrifflich verwandt/);
  assert.match(f.get("verweis/hito-steyerl/index.html"), /https:\/\/example\.org\/steyerl/);
});

test("Build: erzeugte Seiten sind aktuell (sonst: node --experimental-strip-types tools/build-zu-seiner-zeit.ts)", () => {
  const f = build.files();
  for (const [k, c] of f) assert.equal(read(k), c, `veraltet: ${k}`);
  const liste = d => readdirSync(new URL("zu-seiner-zeit/" + d, root), { withFileTypes: true }).filter(e => e.isDirectory()).map(e => `${d}${e.name}/index.html`);
  const vorhanden = [...liste("strophe/"), ...liste("verweis/")];
  for (const p of vorhanden) assert.ok(f.has(p), `übrig geblieben: ${p}`);
  const xml = readFileSync(new URL("sitemap.xml", root), "utf8");
  assert.ok(xml.includes(build.sitemapBlock()), "Sitemap-Block veraltet");
});

test("Strophenseite: Meta, Titel, direkt darunter die Bottom-Line, dann Text, Weiterdenken, Blättern, Verwandtes", () => {
  for (const s of m.stanzas) {
    const html = read(`strophe/${s.slug}/index.html`);
    const i = k => html.indexOf(k);
    const meta = `<p class="zsz-meta">${s.cycle} · ${esc(s.cycleTitle)} · ${s.id} / 49</p>`;
    const titel = `<h1 class="strophe-titel">${esc(s.title)}</h1>`;
    const bl = `<p class="bottom-line">${esc(s.bottomLine)}</p>`;
    assert.ok(html.includes(`${meta}\n      ${titel}\n      ${bl}\n      <div class="strophe-text"><p>${esc(s.text)}</p></div>`), `Aufbau ${s.id}`);
    assert.ok(i("Weiterdenken") > i("strophe-text") && i('aria-label="Blättern"') > i("Weiterdenken") && i("Verwandte Strophen") > i('aria-label="Blättern"'));
    // direkt unter der Strophe: weiter mit dem Zufall, ohne die geöffnete Strophe
    const knopf = `<a class="zsz-knopf" href="../../zufall/?von=${s.id}" data-zufall>Weiter mit dem Zufall`;
    assert.ok(i(knopf) > i("strophe-text") && i(knopf) < i("</article>") && i(knopf) < i("Weiterdenken"), `Zufall-Knopf ${s.id}`);
    assert.equal((html.match(/<li class="verweis">/g) || []).length, 4);
    assert.equal((html.match(/<dialog class="zsz-panel"/g) || []).length, 4);
    assert.ok(!/href="https?:/.test(html.replace(/https:\/\/ornament\.cloud\/zu-seiner-zeit\//g, "")), "keine externen Links ohne Eintrag");
    if (s.id > 1) assert.ok(html.includes('rel="prev"')); else assert.ok(!html.includes('rel="prev"'));
    if (s.id < 49) assert.ok(html.includes('rel="next"')); else assert.ok(!html.includes('rel="next"'));
  }
});

test("Teilen: jede Seite trägt das Vorschaubild (1200 × 630, absolute Adresse), Titel und Beschreibung", () => {
  const png = readFileSync(new URL("zu-seiner-zeit/" + build.OG_IMAGE, root));
  assert.equal(png.subarray(1, 4).toString(), "PNG");
  assert.deepEqual([png.readUInt32BE(16), png.readUInt32BE(20)], [1200, 630]);
  for (const [k, c] of build.files()) {
    if (!k.endsWith("index.html")) continue;
    assert.ok(c.includes(`<meta property="og:image" content="https://ornament.cloud/zu-seiner-zeit/${build.OG_IMAGE}">`), k);
    assert.ok(c.includes('<meta name="twitter:card" content="summary_large_image">'), k);
    assert.ok(c.includes(`<meta property="og:url" content="https://ornament.cloud/zu-seiner-zeit/${k.replace(/index\.html$/, "")}">`), k);
  }
  const s37 = read("strophe/37-die-information/index.html");
  assert.ok(s37.includes(`<meta property="og:description" content="${esc(m.stanzas[36].bottomLine)}">`), "Strophe: Bottom-Line als Beschreibung");
});

test("Startseite: sieben Zyklen, jede Strophe mit Nummer, Titel und Bottom-Line", () => {
  const html = read("index.html");
  assert.equal((html.match(/<section class="zyklus"/g) || []).length, 7);
  const knopf = html.indexOf('<a class="zsz-knopf" href="zufall/" data-zufall>Mit dem Zufall beginnen');
  assert.ok(knopf > 0 && knopf < html.indexOf('<section class="zyklus"'), "Einstieg mit dem Zufall vor dem ersten Zyklus");
  for (const s of m.stanzas) assert.ok(html.includes(`<a href="strophe/${s.slug}/"><span class="zsz-nr">${s.id}</span> <span class="zyklus-titel">${esc(s.title)}</span></a>\n          <p class="bottom-line">${esc(s.bottomLine)}</p>`), `${s.id}`);
});

test("Verweisseiten: jede Person mit allen Strophen, in denen sie vorkommt", () => {
  const luhmann = m.persons.find(p => p.name === "Niklas Luhmann");
  assert.deepEqual(luhmann.occurrences.map(o => o.stanza), [1, 3, 7, 15, 24, 26, 28, 45]);   // 4 → von Foerster, 9 → Connerton
  const person = n => m.persons.find(p => p.name === n);
  assert.deepEqual(person("Heinz von Foerster").occurrences.map(o => [o.stanza, o.discipline, o.work]), [[4, "Kybernetik", "On Constructing a Reality"]]);
  assert.deepEqual(person("Paul Connerton").occurrences.map(o => [o.stanza, o.discipline, o.work]), [[9, "Soziologie", "How Societies Remember"]]);
  // gezielte Wiederkehr desselben Werks: Caminhando (33, 47), Album (18, 43)
  assert.deepEqual(person("Lygia Clark").works.find(w => w.work === "Caminhando").stanzas, [33, 47]);
  assert.deepEqual(person("Gillian Wearing").works.find(w => w.work === "Album").stanzas, [18, 43]);
  for (const [a, b] of [[33, 47], [18, 43]]) {
    const r = m.stanzas[a - 1].references.find(x => x.internalLinks.some(l => l.id === b));
    assert.ok(r?.internalLinks.find(l => l.id === b).sameWork, `${a} → ${b}: dasselbe Werk`);
  }
  // Personenindex: Zahl aus den Daten, Rubriken aus den Daten (von Foerster unter Kybernetik, nicht unter Soziologie)
  const namen = new Set(raw.stanzas.flatMap(s => s.references.map(r => r.citation.split(", ")[0])));
  assert.equal(m.persons.length, namen.size);
  const index = read("verweis/index.html");
  assert.ok(index.includes(`${namen.size} Personen · je Strophe vier Verweise: Soziologie, Kybernetik, Philosophie, Kunst, Literatur`));
  const gruppe = g => index.split(`id="g-${g}"`)[1].split("</section>")[0];
  assert.ok(gruppe("kybernetik").includes(">Heinz von Foerster</a>") && !gruppe("soziologie").includes("von Foerster"));
  assert.ok(gruppe("soziologie").includes(">Paul Connerton</a>"));
  for (const p of m.persons) {
    const html = read(`verweis/${p.slug}/index.html`);
    assert.ok(html.includes(`<h1 class="strophe-titel">${esc(p.name)}</h1>`));
    for (const o of p.occurrences) assert.ok(html.includes(`strophe/${m.stanzas[o.stanza - 1].slug}/`), `${p.name} → ${o.stanza}`);
  }
  assert.ok(read("zufall/index.html").includes('<meta name="robots" content="noindex">'));
});

test("Zufall: gleichverteilt, nie unmittelbar dieselbe Strophe", () => {
  // Verwerfen statt Modulo: Werte über der Grenze werden verworfen
  let calls = 0;
  const seq = [0xffffffff, 5];
  assert.equal(zufallsZahl(49, a => { a[0] = seq[calls++]; }), 5);
  assert.equal(calls, 2);
  // alle Zahlen der Reihe nach: jede andere Strophe genau einmal, die aktuelle nie
  for (const aus of [1, 25, 49]) {
    const got = Array.from({ length: 48 }, (_, k) => andereStrophe(49, aus, () => k)).sort((a, b) => a - b);
    assert.deepEqual(got, Array.from({ length: 49 }, (_, i) => i + 1).filter(n => n !== aus));
  }
  assert.deepEqual(Array.from({ length: 49 }, (_, k) => andereStrophe(49, NaN, () => k)), Array.from({ length: 49 }, (_, i) => i + 1));
  // echte Zufallszahlen: nie die aktuelle, alle anderen kommen vor
  const seen = new Set();
  for (let i = 0; i < 5000; i++) { const n = andereStrophe(49, 37); assert.notEqual(n, 37); seen.add(n); }
  assert.equal(seen.size, 48);
});
