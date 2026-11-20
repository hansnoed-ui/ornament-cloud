// ornament.lab · Handy (20. November 2026): eigene Oberfläche fürs Handy unter alpha/lab/handy/, sechs Bildschirme mit Pixel-Schaltern,
// dieselben Module wie das Lab (das Lab selbst bleibt unverändert).
//   node --test tests/lab-handy.test.mjs
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const root = new URL("../", import.meta.url);
const lies = (p) => readFileSync(new URL(p, root), "utf8");
const { EFFEKTE, NAMEN } = await import(new URL("alpha/lab/handy/auswahl.js", root).href);
const { ZEICHEN, N } = await import(new URL("alpha/lab/handy/zeichen.js", root).href);
const { labRegister } = await import(new URL("alpha/lab/operationen/index.js", root).href);
const { KATALOG } = await import(new URL("alpha/lab/jev/fragen.js", root).href);
const R = labRegister();

test("Handy: sechs Bildschirme, je ein Pixelzeichen auf 13 × 13", () => {
  assert.deepEqual(NAMEN, ["Material", "Effekt", "Varianten", "Klang", "Film", "Galerie"]);
  assert.equal(ZEICHEN.length, NAMEN.length);
  for (const z of ZEICHEN) {
    assert.ok(z.length >= 20, "genug Pixel");
    for (const [x, y, a] of z) assert.ok(x >= 0 && x < N && y >= 0 && y < N && a > 0 && a <= 1);
  }
});

test("Handy: jeder Effekt ist eine Bildoperation im Register, nicht ausgemustert, im Katalog von jev, mit dem Parameter für die Varianten", () => {
  assert.ok(EFFEKTE.length >= 6);
  for (const x of EFFEKTE) {
    assert.ok(R.hat(x.id), x.id);
    const op = R.hole(x.id);
    assert.ok(!op.ausgemustert, `${x.id} ist ausgemustert`);
    assert.equal(op.eingaenge[0].typ, "IMAGE", x.id);
    assert.ok(KATALOG[x.id], `${x.id} fehlt im Katalog von jev`);
    const p = op.parameter.find((q) => q.id === x.ziel);
    assert.ok(p && p.art === "zahl", `${x.id}: Variantenparameter ${x.ziel}`);
  }
  assert.equal(new Set(EFFEKTE.map((x) => x.id)).size, EFFEKTE.length);
});

test("Handy: Seite nur per Direktlink (noindex), Module relativ zum Lab, Rückfragen ohne confirm(), im Register", () => {
  const html = lies("alpha/lab/handy/index.html"), js = lies("alpha/lab/handy/handy.js");
  assert.match(html, /<meta name="robots" content="noindex">/);
  assert.match(html, /viewport-fit=cover/);
  assert.match(html, /"three": "\.\.\/\.\.\/\.\.\/vendor\/three-0\.185\.1\/three\.module\.min\.js"/);
  for (const m of ["../kern/projekt.js", "../kern/zusammenstellung.js", "../jev/jev.js", "../medien/video.js"]) assert.ok(js.includes(`"${m}"`), m);
  assert.ok(!/(^|[^.\w«])confirm\((?!\))/m.test(js), "kein confirm()");
  assert.ok(!/\.scrollIntoView\(/.test(js), "scrollIntoView würde das Pult mitwischen");
  // jev an drei Stellen: nächster Effekt, Beat, Zusammenstellung
  for (const f of ["jevWahl(", "jevBeat(", "jevKomposition("]) assert.ok(js.includes(f), f);
  const register = JSON.parse(lies("src/register.json"));
  const e = register.arbeiten.find((x) => x.adresse === "alpha/lab/handy/");
  assert.ok(e && e.status === "direktlink");
  assert.ok(!lies("sitemap.xml").includes("alpha/lab/handy"));
});
