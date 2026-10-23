// ornament.lab · Works (b/lab/works/, tools/build-lab-works.mjs, 23. Oktober 2026): leer mit Platzhaltern und noindex; ein veröffentlichtes Werk
// erscheint auf Bühne und im Raster und bekommt eine Werkseite nach dem Prinzip von mubien.com; werk.json wird geprüft. Werke liegen nur im Temp-Ordner.
//   node --test tests/lab-works.test.mjs
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, writeFileSync, mkdtempSync, mkdirSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { baue } from "../tools/build-lab-works.mjs";

const root = new URL("../", import.meta.url);
const lies = (p) => readFileSync(new URL(p, root), "utf8");
const PNG = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=", "base64");

function werkschau(werke) {
  const dir = mkdtempSync(join(tmpdir(), "lab-works-"));
  for (const [ordner, w, dateien = ["bild.png"]] of werke) {
    mkdirSync(join(dir, ordner));
    for (const d of dateien) writeFileSync(join(dir, ordner, d), PNG);
    writeFileSync(join(dir, ordner, "werk.json"), JSON.stringify({ format: "ornament-lab-werk", version: 1, bild: "bild.png", ...w }));
  }
  return dir;
}

test("Works im Repository: gebaut, noindex, nur Platzhalter aus der PHORMA-Serie, keine Werke, nicht in der Sitemap", () => {
  const html = lies("b/lab/works/index.html");
  assert.match(html, /<meta name="robots" content="noindex">/);
  assert.equal((html.match(/class="dia platzhalter/g) || []).length, 6, "sechs Platzhalter auf der Bühne");
  assert.equal((html.match(/class="werk platzhalter"/g) || []).length, 6, "sechs Platzhalter im Raster");
  assert.equal((html.match(/<span class="schild">Platzhalter<\/span>/g) || []).length, 12, "jeder beschriftet");
  for (const m of html.matchAll(/(?:src|data-film)="(\/assets\/[^"]+)"/g)) assert.ok(existsSync(new URL(m[1].slice(1), root)), `${m[1]} gibt es`);
  for (const a of ["phorma-i", "phorma-ii", "phorma-iii"]) assert.ok(html.includes(`href="/b/apps/${a}/"`), `führt zu ${a}`);
  assert.ok(html.includes("Bis dahin stehen hier Beispiele aus der PHORMA-Serie als Platzhalter, keine Werke aus dem Lab."));
  assert.ok(!html.includes(`<a class="werk" href`), "kein Werk verlinkt");
  assert.ok(!lies("sitemap.xml").includes("/b/lab/works/"));
  const dir = werkschau([]);
  baue({ ordner: dir });
  assert.equal(readFileSync(join(dir, "index.html"), "utf8"), html, "b/lab/works/index.html entspricht dem Bau (node tools/build-lab-works.mjs)");
});

test("Works: ein veröffentlichtes Werk auf Bühne, im Raster und auf seiner Seite; Entwürfe bleiben draussen", () => {
  const dir = werkschau([
    ["probe", { titel: "Probe", jahr: 2026, kurz: "Ein Satz zur Probe.", text: "Eins.\n\nZwei.", farbe: "#c2410c", operationen: ["The Fictory", "Feedback"], verlauf: "verlauf.json", bilder: ["detail.png", { datei: "nah.png", alt: "Nahansicht" }], veroeffentlicht: true }, ["bild.png", "verlauf.json", "detail.png", "nah.png"]],
    ["entwurf", { titel: "Entwurf", veroeffentlicht: false }],
  ]);
  assert.deepEqual(baue({ ordner: dir }), { werke: ["probe"], entwuerfe: ["entwurf"] });
  const html = readFileSync(join(dir, "index.html"), "utf8");
  assert.match(html, /<link rel="canonical" href="https:\/\/ornament.cloud\/b\/lab\/works\/">/);
  assert.match(html, /<li class="dia ist" data-href="\/b\/lab\/works\/probe\/"[^>]*style="--farbe: #c2410c">/, "Bühne mit Farbe");
  assert.ok(html.includes('<p class="zaehler" aria-live="polite"><span class="zaehler-jetzt">01</span> / 01</p>'), "Zähler");
  assert.ok(html.includes('<span class="etikett-titel">01 · Probe, 2026</span><span class="etikett-text">Ein Satz zur Probe.</span>'), "Etikett");
  assert.ok(html.includes('data-ansicht="buehne"') && html.includes('data-ansicht="raster"'), "Pille");
  assert.match(html, /<nav class="dock"[\s\S]*<div class="menue" id="menue" hidden>[\s\S]*href="\/alpha\/lab\/"[\s\S]*class="kachel kachel-logo" aria-hidden="true"><svg/, "Dock mit Menü und Signet");
  assert.ok(!html.includes("uhr"), "keine Uhr mehr");
  assert.ok(!html.includes("Entwurf"), "kein Entwurf");
  const seite = readFileSync(join(dir, "probe/index.html"), "utf8");
  assert.ok(seite.includes('<ul class="schlagworte"><li>2026</li><li>The Fictory</li><li>Feedback</li></ul>'));
  assert.ok(seite.includes('<p class="werk-satz">Ein Satz zur Probe.</p>'));
  assert.deepEqual([...seite.matchAll(/<summary><span class="punkt" aria-hidden="true"><\/span>([^<]+)<\/summary>/g)].map((m) => m[1]), ["Über das Werk", "Verlauf", "Angaben"]);
  assert.match(seite, /<details name="werk" open>/, "das erste offen");
  assert.deepEqual([...seite.matchAll(/<figure class="stueck (\w+)">/g)].map((m) => m[1]), ["voll", "breit", "schmal"], "Bildfolge");
  assert.ok(seite.includes('alt="Nahansicht"'));
  assert.ok(seite.includes('href="/b/lab/works/probe/verlauf.json"'), "Protokoll");
  assert.ok(seite.includes('<span class="dock-text">Zurück zu Works</span>'));
});

test("Works: werk.json wird geprüft (Farbe, weitere Bilder, Ordnername)", () => {
  assert.throws(() => baue({ ordner: werkschau([["a", { titel: "A", farbe: "rot" }]]) }), /farbe/);
  assert.throws(() => baue({ ordner: werkschau([["a", { titel: "A", bilder: ["fehlt.png"] }]]) }), /fehlt\.png/);
  assert.throws(() => baue({ ordner: werkschau([["A_b", { titel: "A" }]]) }), /Ordnername/);
});

test("Works: nichts von aussen, Schriften lokal, Versionsmarke in CSS und Skript", () => {
  const html = lies("b/lab/works/index.html");
  for (const m of html.matchAll(/(?:src|href)="(https?:[^"]+)"/g)) assert.fail(`von aussen: ${m[1]}`);
  assert.match(html, /works\.css\?v=\d+/); assert.match(html, /works\.js\?v=\d+/);
  assert.ok(html.includes("/vendor/fonts/fonts.css"));
});
