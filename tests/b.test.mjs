// Der Neubau unter b/ (tools/build-b.mjs, Stand 20. Oktober 2026): jede Seite mit Titel, Beschreibung, Canonical oder noindex, Vorschaukarte und
// Angaben für Suchmaschinen; die Zettel wörtlich wie die Quelle; nichts von aussen; Werkstatt nicht verlinkt; Sitemap vollständig; jev-Tabelle gültig.
//   node --test tests/b.test.mjs
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync, existsSync, statSync } from "node:fs";
import { ladeZettel, ladeOrma } from "../tools/b-daten.mjs";
import { pruefsumme } from "../tools/build-b-jev.mjs";
import { APPS, RASTER, ANGEBOTE } from "../src/b/inhalt.mjs";

const root = new URL("../", import.meta.url);
const lies = (p) => readFileSync(new URL(p, root), "utf8");
const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const walk = (d, vor = "") => readdirSync(new URL(d, root), { withFileTypes: true }).flatMap((e) => e.isDirectory() ? walk(d + e.name + "/", vor + e.name + "/") : e.name === "index.html" ? [vor] : []);
const seiten = walk("b/");
const meta = (html, name) => html.match(new RegExp(`<meta (?:name|property)="${name}" content="([^"]*)"`))?.[1];
const pngMass = (buf) => [buf.readUInt32BE(16), buf.readUInt32BE(20)];

test("b/: alle Seiten (72), jede mit Titel, Beschreibung, Canonical oder noindex, Open Graph, X-Karte und JSON-LD", () => {
  assert.equal(seiten.length, 1 + 1 + 49 + 1 + APPS.length + 1 + RASTER.length + 1 + ANGEBOTE.length + 4);
  for (const p of seiten) {
    const html = lies(`b/${p}index.html`);
    assert.match(html, /<html lang="de">/, p);
    const titel = html.match(/<title>([^<]+)<\/title>/)?.[1];
    assert.ok(titel && titel.length >= 10 && titel.length <= 110, `${p}: Titel «${titel}»`);
    const b = meta(html, "description");
    assert.ok(b && b.length >= 40 && b.length <= 200, `${p}: Beschreibung 40–200 Zeichen (${b?.length})`);
    const noindex = /<meta name="robots" content="noindex/.test(html);
    if (noindex) assert.ok(!/<link rel="canonical"/.test(html), `${p}: noindex ohne Canonical`);
    else assert.equal(html.match(/<link rel="canonical" href="([^"]+)"/)?.[1], `https://ornament.cloud/b/${p}`, `${p}: Canonical`);
    assert.equal(meta(html, "og:url"), `https://ornament.cloud/b/${p}`, `${p}: og:url`);
    for (const k of ["og:title", "og:description", "og:image", "og:image:alt", "twitter:card", "twitter:title", "twitter:image"]) assert.ok(meta(html, k), `${p}: ${k}`);
    assert.equal(meta(html, "twitter:image"), meta(html, "og:image"), `${p}: X-Bild gleich OG-Bild`);
    for (const ld of html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)) assert.doesNotThrow(() => JSON.parse(ld[1]), `${p}: JSON-LD lesbar`);
    assert.match(html, /<link rel="stylesheet" href="\/b\/b\.css\?v=\d+">/, `${p}: b.css mit Versionsmarke`);
    assert.match(html, /<script type="module" src="\/b\/b\.js\?v=\d+"><\/script>/, `${p}: b.js mit Versionsmarke`);
    assert.match(html, /<nav class="hauptnav"/, `${p}: Hauptnavigation`);
    assert.match(html, /href="\/impressum\/"/, `${p}: Link zum Impressum`);
  }
});

test("b/: Vorschaukarten liegen da, 1200 × 630, unter 300 KB", () => {
  for (const p of seiten) {
    const html = lies(`b/${p}index.html`);
    const bild = meta(html, "og:image").replace("https://ornament.cloud/", "");
    assert.ok(existsSync(new URL(bild, root)), `${p}: ${bild} gibt es`);
    if (bild.endsWith(".png") && bild.startsWith("b/kacheln/")) {
      const buf = readFileSync(new URL(bild, root));
      assert.deepEqual(pngMass(buf), [1200, 630], `${p}: ${bild} ist 1200 × 630`);
      assert.ok(buf.length < 300 * 1024, `${p}: ${bild} unter 300 KB (${Math.round(buf.length / 1024)} KB)`);
    }
    for (const k of html.matchAll(/href="(\/b\/kacheln\/[^"]+)" download/g)) assert.ok(existsSync(new URL(k[1].slice(1), root)), `${p}: ${k[1]} gibt es`);
  }
});

test("b/: nichts von aussen – keine Skripte, Stile, Bilder oder Schriften von fremden Adressen", () => {
  for (const p of seiten) {
    const html = lies(`b/${p}index.html`).replace(/<script type="application\/ld\+json">[\s\S]*?<\/script>/g, "");
    for (const m of html.matchAll(/(?:src|href)="(https?:\/\/[^"]+)"/g)) assert.ok(/^https:\/\/ornament\.cloud\//.test(m[1]), `${p}: ${m[1]}`);
    assert.doesNotMatch(html, /fonts\.googleapis|cdn\.|unpkg|jsdelivr/, `${p}: keine CDNs`);
  }
  const js = lies("b/b.js");
  assert.doesNotMatch(js.replace(/^\s*\/\/.*$/gm, ""), /\bfetch\s*\(|XMLHttpRequest|sendBeacon|WebSocket|typesafe/i, "b.js ruft nichts auf");
  assert.equal(lies("b/b.css"), lies("src/b/b.css"), "b.css ist die Kopie der Quelle");
  assert.equal(js, lies("src/b/b.js"), "b.js ist die Kopie der Quelle");
});

test("b/zettel: alle 49, Titel, Leitsatz und Text wörtlich wie src/data/zu-seiner-zeit.json, die vier Verweise dazu, Link zum Zettelkasten", () => {
  const zettel = ladeZettel();
  for (const z of zettel) {
    const p = `zettel/${z.slug}/`;
    assert.ok(seiten.includes(p), `${p} gibt es`);
    const html = lies(`b/${p}index.html`);
    assert.ok(html.includes(`<h1 class="titel">${esc(z.title)}</h1>`), `${p}: Titel`);
    assert.ok(html.includes(`<p class="leitsatz">${esc(z.bottom_line)}</p>`), `${p}: Leitsatz`);
    assert.ok(html.includes(`<p>${esc(z.text)}</p>`), `${p}: Text wörtlich`);
    for (const r of z.references) { assert.ok(html.includes(esc(r.citation)), `${p}: Verweis ${r.citation}`); assert.ok(html.includes(esc(r.resonance)), `${p}: Resonanz zu ${r.citation}`); }
    assert.ok(html.includes(`href="/zu-seiner-zeit/strophe/${z.slug}/"`), `${p}: Link zum Zettelkasten`);
    assert.ok(existsSync(new URL(`zu-seiner-zeit/strophe/${z.slug}/index.html`, root)), `${p}: der Zettel im Zettelkasten gibt es`);
    assert.match(html, /<section class="faeden"/, `${p}: Fäden`);
  }
  const uebersicht = lies("b/zettel/index.html");
  for (const z of zettel) assert.ok(uebersicht.includes(`<span class="kurz">${esc(z.bottom_line)}</span>`), `Übersicht: Leitsatz ${z.number}`);
});

test("b/: die Startseite trägt das Feld mit allen 49 Zetteln, den Dialog und die Daten für den Leitsatz", () => {
  const html = lies("b/index.html");
  const zellen = [...html.matchAll(/<a href="\/b\/zettel\/([^"]+)\/" data-n="(\d+)"/g)];
  assert.equal(zellen.length, 49);
  assert.deepEqual(zellen.map((m) => +m[2]), Array.from({ length: 49 }, (_, i) => i + 1), "in der Reihenfolge 1 bis 49");
  const daten = JSON.parse(html.match(/<script type="application\/json" id="zettel-daten">([\s\S]*?)<\/script>/)[1]);
  assert.equal(daten.length, 49);
  assert.equal(daten[0].leitsatz, ladeZettel()[0].bottom_line);
  for (const id of ["bild", "frage", "auftrag", "begriff", "gruppe"]) { assert.match(html, new RegExp(`<input type="radio" name="mit" id="mit-${id}">`)); assert.match(html, new RegExp(`class="weg weg-${id}"`)); }
  const faeden = JSON.parse(html.match(/data-faeden="([^"]+)"/)[1].replace(/&quot;/g, '"'));
  assert.ok(faeden.length >= 10 && faeden.every(([a, b]) => a >= 1 && a <= 49 && b >= 1 && b <= 49 && a !== b), "Fäden zwischen Zellen");
});

test("b/: Apps, Raster und Angebote verlinken ihre Ziele, und die Ziele gibt es", () => {
  for (const a of APPS) {
    const html = lies(`b/apps/${a.slug}/index.html`);
    for (const ziel of [a.url, a.app, a.feld].filter(Boolean)) { assert.ok(html.includes(`href="/${ziel}"`), `${a.slug}: Link ${ziel}`); assert.ok(existsSync(new URL(ziel + "index.html", root)), `${a.slug}: ${ziel} gibt es`); }
    assert.ok(existsSync(new URL(a.bild, root)), `${a.slug}: Bild ${a.bild}`);
  }
  for (const r of RASTER) {
    const html = lies(`b/raster/${r.slug}/index.html`);
    for (const ziel of [r.seite, r.pdf, r.prompt, r.raster].filter(Boolean)) { assert.ok(html.includes(`href="/${ziel}"`), `${r.slug}: Link ${ziel}`); assert.ok(existsSync(new URL(ziel.endsWith("/") ? ziel + "index.html" : ziel, root)), `${r.slug}: ${ziel} gibt es`); }
  }
  for (const a of ANGEBOTE) {
    const html = lies(`b/angebot/${a.slug}/index.html`);
    assert.match(html, /<form class="brief"/, `${a.slug}: Briefing`);
    assert.equal((html.match(/<fieldset>/g) || []).length, 3, `${a.slug}: drei Fragen`);
    for (const [ziel] of a.beweis) assert.ok(existsSync(new URL((ziel.endsWith("/") ? ziel + "index.html" : ziel), root)), `${a.slug}: ${ziel} gibt es`);
  }
});

test("b/werkstatt: noindex, nicht in der Sitemap, von keiner Seite verlinkt; alles andere in der Sitemap", () => {
  const w = lies("b/werkstatt/index.html");
  assert.match(w, /<meta name="robots" content="noindex">/);
  const sitemap = lies("sitemap.xml");
  assert.match(sitemap, /<!-- B:START[\s\S]*<!-- B:END -->/, "Block B in der Sitemap");
  assert.ok(!sitemap.includes("/b/werkstatt/"), "Werkstatt nicht in der Sitemap");
  for (const p of seiten) {
    const html = lies(`b/${p}index.html`);
    if (p !== "werkstatt/") { assert.ok(!html.includes("/b/werkstatt/"), `${p}: kein Link zur Werkstatt`); assert.ok(sitemap.includes(`<loc>https://ornament.cloud/b/${p}</loc>`), `${p}: in der Sitemap`); }
  }
  for (const html of ["index.html", "apps/index.html", "zu-seiner-zeit/index.html"].map(lies)) assert.ok(!html.includes("/b/werkstatt/"));
});

test("b/: die jev-Tabelle passt zu Zetteln, Angeboten, Apps, Rastern und ORMA (sonst tools/build-b-jev.mjs)", () => {
  const j = JSON.parse(lies("src/b/jev.json"));
  assert.equal(j.pruefsumme, pruefsumme(ladeZettel(), ladeOrma()));
  assert.equal(Object.keys(j.zettel).length, 49);
  for (const [n, a] of Object.entries(j.zettel)) {
    assert.deepEqual(Object.keys(a).sort(), ["angebot", "app", "orma", "raster"], `Zettel ${n}`);
    assert.deepEqual(Object.keys(a.angebot).sort(), ANGEBOTE.map((x) => x.slug).sort(), `Zettel ${n}: Angebote`);
    assert.deepEqual(Object.keys(a.app).sort(), APPS.map((x) => x.slug).sort(), `Zettel ${n}: Apps`);
  }
  assert.match(lies("b/zettel/1-die-bruecke/index.html"), new RegExp(`jev \\(${j.modell.replace(/\./g, "\\.")}, api\\.typesafe\\.ai\\)`), "die Seite nennt, woher die Fäden kommen");
});

test("b/werkstatt: die PDFs der Produkte liegen da", () => {
  for (const f of ["zu-seiner-zeit-buch-innen.pdf", "zu-seiner-zeit-buch-cover.pdf", "zu-seiner-zeit-karten.pdf", "das-feld-a2.pdf", "notizbuch-umschlaege.pdf"]) {
    const p = new URL(`b/werkstatt/pod/${f}`, root);
    assert.ok(existsSync(p), `${f} gibt es (tools/build-b-pod.mjs)`);
    assert.ok(statSync(p).size > 10 * 1024, `${f} ist nicht leer`);
    assert.ok(lies("b/werkstatt/index.html").includes(`href="/b/werkstatt/pod/${f}"`), `${f} verlinkt`);
  }
});

test("b/apps: die Bilder der sieben Apps sind gezeichnete Tafeln (tools/b-app-bilder.mjs), hell und dunkel, 1200 × 1200, klein; Kachel und App-Seite wählen mit <picture>, Teilen nimmt die Vorschaukarte", async () => {
  const { TAFELN, svg } = await import(new URL("tools/b-app-bilder.mjs", root).href);
  assert.deepEqual(Object.keys(TAFELN).filter((k) => !TAFELN[k].gattung).sort(), APPS.map((a) => a.slug).sort(), "je App eine Tafel");
  for (const a of APPS) {
    assert.equal(a.bild, `b/bilder/apps/${a.slug}.svg`); assert.equal(a.bildDunkel, `b/bilder/apps/${a.slug}-dunkel.svg`);
    for (const [datei, dunkel] of [[a.bild, false], [a.bildDunkel, true]]) {
      const s = lies(datei);
      assert.equal(s, svg(a.slug, dunkel), `${datei} ist der aktuelle Stand des Werkzeugs (sonst: node tools/b-app-bilder.mjs)`);
      assert.match(s, /^<svg xmlns="http:\/\/www\.w3\.org\/2000\/svg" viewBox="0 0 1200 1200" width="1200" height="1200">/);
      assert.ok(s.includes(`<rect width="1200" height="1200" fill="${dunkel ? "#000000" : "#ffffff"}"/>`), `${datei}: ${dunkel ? "Tinte auf Schwarz" : "Tinte auf Papier"}`);
      assert.ok(s.length < 60 * 1024, `${datei} unter 60 KB`);
      assert.ok(!/<script|<image|href=/.test(s), `${datei}: nur Zeichnung`);
    }
    assert.ok(a.bildAlt.startsWith(`${a.name}, gezeichnet:`), `${a.slug}: Alt-Text beschreibt die Zeichnung`);
    const bild = `<picture><source srcset="/${a.bildDunkel}" media="(prefers-color-scheme: dark)"><img src="/${a.bild}" alt="${a.bildAlt}" width="1200" height="1200"`;
    assert.ok(lies("b/apps/index.html").includes(bild + ' loading="lazy"></picture>'), `${a.slug}: Kachel auf b/apps/`);
    const seite = lies(`b/apps/${a.slug}/index.html`);
    assert.ok(seite.includes(`<figure class="stueck-bild quadrat">${bild}></picture></figure>`), `${a.slug}: Tafel auf der App-Seite`);
    assert.ok(seite.includes(`<meta property="og:image" content="https://ornament.cloud/b/kacheln/apps-${a.slug}.png">`), `${a.slug}: Teilen mit der Vorschaukarte 1200 × 630`);
  }
  // nur OMNA COLOR trägt Farbe
  for (const a of APPS) assert.equal(/hsl\(/.test(lies(a.bild)), a.slug === "omna-color", `${a.slug}: Farbe nur bei OMNA COLOR`);
});

test("b/apps: die Tafeln leben unter «Was dabei herauskommt» (src/b/tafeln.mjs, b/tafeln-leben.js): Zustand, Schritt und Bild je App, ein Satz dazu; das Modul liegt kopiert in b/", async () => {
  const { TAFELN, farben } = await import(new URL("src/b/tafeln.mjs", root).href);
  assert.equal(lies("b/tafeln.mjs"), lies("src/b/tafeln.mjs"), "b/tafeln.mjs ist die Kopie (sonst: node tools/build-b.mjs)");
  assert.equal(lies("b/tafeln-leben.js"), lies("src/b/tafeln-leben.js").replace('from "./tafeln.mjs"', `from "./tafeln.mjs?v=${lies("b/index.html").match(/b\.js\?v=(\d+)/)[1]}"`), "b/tafeln-leben.js ist die Kopie mit Versionsmarke");
  for (const a of APPS) {
    const t = TAFELN[a.slug], z = t.neu(), ruhe = t.svg(z, farben(false));
    for (let i = 0; i < 120; i++) t.schritt(z, 1 / 30);         // vier Sekunden (PHORMA II hält drei Sekunden und beginnt dann von vorn)
    const bewegt = t.svg(z, farben(false));
    assert.ok(bewegt.length > 100 && bewegt !== ruhe, `${a.slug}: nach vier Sekunden ein anderes Bild`);
    assert.ok(!/NaN|undefined/.test(bewegt), `${a.slug}: keine NaN`);
    assert.match(a.bewegung, /^So arbeitet /, `${a.slug}: ein Satz zur Bewegung`);
    const seite = lies(`b/apps/${a.slug}/index.html`);
    assert.ok(seite.includes(`<figure class="tafel-lebt" data-tafel="${a.slug}"><picture>`), `${a.slug}: lebende Tafel unter «Was dabei herauskommt»`);
    assert.ok(seite.includes(`<figcaption>${a.bewegung}</figcaption>`));
    assert.match(seite, /<script type="module" src="\/b\/tafeln-leben\.js\?v=\d+"><\/script>/);
    assert.ok(seite.indexOf('id="beispiele-titel"') < seite.indexOf('class="tafel-lebt"'), `${a.slug}: die Tafel steht im Abschnitt «Was dabei herauskommt»`);
  }
  assert.ok(!lies("b/apps/index.html").includes("tafeln-leben"), "die Übersicht bleibt ohne das Modul");
});

test("b/raster: wie die Apps – gezeichnete Tafel (lebend), die vier Felder daneben, Prompt kopieren auf der Seite, drei Schritte; die Übersicht mit Kacheln", async () => {
  const { TAFELN, svg, farben } = await import(new URL("src/b/tafeln.mjs", root).href);
  for (const r of RASTER) {
    assert.equal(TAFELN[r.slug]?.gattung, "raster", `${r.slug}: Tafel`);
    assert.equal(r.bild, `b/bilder/raster/${r.slug}.svg`); assert.equal(r.bildDunkel, `b/bilder/raster/${r.slug}-dunkel.svg`);
    for (const [datei, dunkel] of [[r.bild, false], [r.bildDunkel, true]]) assert.equal(lies(datei), svg(r.slug, dunkel), `${datei} ist der aktuelle Stand (sonst: node tools/b-app-bilder.mjs)`);
    const t = TAFELN[r.slug], z = t.neu(), ruhe = t.svg(z, farben(false));
    for (let i = 0; i < 120; i++) t.schritt(z, 1 / 30);
    assert.ok(t.svg(z, farben(false)) !== ruhe && !/NaN/.test(t.svg(z, farben(false))), `${r.slug}: bewegt sich, ohne NaN`);
    const seite = lies(`b/raster/${r.slug}/index.html`);
    assert.ok(seite.includes(`<figure class="tafel-lebt" data-tafel="${r.slug}"><picture>`), `${r.slug}: lebende Tafel`);
    assert.ok(seite.includes(`<figcaption>${r.bewegung}</figcaption>`));
    assert.ok(seite.includes('<button class="knopf voll prompt-kopieren" type="button" data-ziel="prompt-text">Prompt kopieren</button>'), `${r.slug}: Prompt kopieren`);
    const prompt = seite.match(/<script type="text\/plain" id="prompt-text">([\s\S]*?)<\/script>/)[1];
    assert.equal(prompt, lies(r.prompt).replace(/<\/script/gi, "<\\/script"), `${r.slug}: der ganze Anwendungsprompt steht in der Seite`);
    assert.ok(seite.includes(`<a class="knopf" href="/${r.prompt}">Prompt lesen</a>`));
    assert.match(seite, /<h2 id="ablauf-titel">So wendest du es an<\/h2>\s*<ol>\s*<li>[\s\S]*?<\/li>\s*<li>[\s\S]*?<\/li>\s*<li>[\s\S]*?<\/li>\s*<\/ol>/, `${r.slug}: drei Schritte`);
    assert.ok(seite.includes(r.ergebnis.replace(/&/g, "&amp;")), `${r.slug}: Satz zum Ergebnis`);
    assert.match(seite, /<script type="module" src="\/b\/tafeln-leben\.js\?v=\d+"><\/script>/);
    assert.ok(lies("b/raster/index.html").includes(`<a class="stueck" href="/b/raster/${r.slug}/"><span class="bild quadrat"><picture>`), `${r.slug}: Kachel in der Übersicht`);
  }
  assert.ok(lies("b/b.js").includes(".prompt-kopieren"), "b.js kopiert den Prompt");
});

test("b/: das Signet lebt auf Start und Über (Tafel «signet», zeichnet sich aus dem Keim); die Titel der Apps spielen mit «ornament» (data-wort, b.js)", async () => {
  const { TAFELN, svg, farben } = await import(new URL("src/b/tafeln.mjs", root).href);
  const t = TAFELN.signet;
  assert.equal(t.gattung, "signet");
  for (const [datei, dunkel] of [["b/bilder/signet/signet.svg", false], ["b/bilder/signet/signet-dunkel.svg", true]]) assert.equal(lies(datei), svg("signet", dunkel), `${datei} aktuell`);
  const k = t.keim(); assert.ok(!t.svg(k, farben(false)).includes("<circle"), "aus dem Keim: noch kein Punkt, die Schlaufe zeichnet sich");
  for (let i = 0; i < 120; i++) t.schritt(k, 1 / 30);
  assert.ok(t.svg(k, farben(false)).includes("<circle") && t.svg(k, farben(false)).includes('stroke-dashoffset="0"'), "nach vier Sekunden gezeichnet, mit Punkt");
  for (const p of ["b/index.html", "b/ueber/index.html"]) {
    assert.ok(lies(p).includes('class="tafel-lebt signet-tafel') && lies(p).includes('data-tafel="signet"><picture><source srcset="/b/bilder/signet/signet-dunkel.svg"'), `${p}: Signet-Tafel`);
    assert.match(lies(p), /<script type="module" src="\/b\/tafeln-leben\.js\?v=\d+"><\/script>/);
  }
  for (const a of APPS) assert.ok(lies(`b/apps/${a.slug}/index.html`).includes(`<h1 class="titel" data-wort="${a.name}">`), `${a.slug}: data-wort`);
  const js = lies("b/b.js");
  assert.ok(js.includes('const QUELLE = "ornament"') && js.includes("/OR[NM]A|OMNA/i"), "nur die Namen aus der ornament-Familie");
});
