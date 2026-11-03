// «Animationen» (animations/, 3. November 2026): drei Bilder, neun Animationen je Bild, jede Ebene mit bekanntem Effekt und Mischmodus,
// die Seite lädt nichts von aussen, ist noindex und nicht in der Sitemap.
//   node --test tests/animations.test.mjs
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";

const root = new URL("../", import.meta.url);
const lies = (p) => readFileSync(new URL(p, root), "utf8");
const { EFFEKTE } = await import(new URL("animations/effekte.js", root).href);
const { MODI, DAUER, FPS } = await import(new URL("animations/motor.js", root).href);
const { BILDER, WERKE, zufall } = await import(new URL("animations/rezepte.js", root).href);

test("drei Bilder, je neun Animationen", () => {
  assert.equal(BILDER.length, 3);
  for (const b of BILDER) {
    assert.ok(existsSync(new URL(`animations/${b.url}`, root)), b.url);
    assert.equal(WERKE.filter((w) => w.bild === b.id).length, 9, b.id);
  }
  assert.equal(new Set(WERKE.map((w) => w.id)).size, 27);
});

test("jede Ebene: bekannter Effekt, Mischmodus, Deckkraft, Regler im Bereich", () => {
  for (const w of WERKE) {
    assert.ok(w.stapel.ebenen.length >= 1 && w.stapel.ebenen.length <= 3, w.id);
    for (const e of w.stapel.ebenen) {
      assert.ok(EFFEKTE[e.effekt], `${w.id}: ${e.effekt}`);
      assert.ok(e.modus in MODI, `${w.id}: ${e.modus}`);
      assert.ok(e.deckkraft > 0 && e.deckkraft <= 1);
      assert.ok(["bild", "unten"].includes(e.quelle));
      assert.ok(e.werte.length <= EFFEKTE[e.effekt].regler.length, `${w.id}: zu viele Werte für ${e.effekt}`);
      for (const v of e.werte) assert.ok(v >= 0 && v <= 1);
    }
  }
});

test("Effekte: Regler zwischen 0 und 1, höchstens sechs, Shader mit effekt() oder punkt()", () => {
  assert.equal(Object.keys(EFFEKTE).length, 16);
  for (const [id, e] of Object.entries(EFFEKTE)) {
    assert.ok(e.regler.length >= 1 && e.regler.length <= 6, id);
    for (const r of e.regler) assert.ok(r.wert >= 0 && r.wert <= 1, `${id}: ${r.name}`);
    assert.match(e.glsl, e.punkte ? /void punkt\(int id/ : /vec4 effekt\(vec2 uv\)/, id);
  }
});

test("neu mischen: eine bis drei verschiedene Effekte, erste Ebene normal", () => {
  for (let i = 0; i < 200; i++) {
    const m = zufall();
    assert.ok(BILDER.some((b) => b.id === m.bild));
    assert.ok(m.ebenen.length >= 1 && m.ebenen.length <= 3);
    assert.equal(new Set(m.ebenen.map((e) => e.effekt)).size, m.ebenen.length);
    assert.equal(m.ebenen[0].modus, "normal");
  }
});

test("Schlaufe von 12 s mit 30 Bildern pro Sekunde", () => {
  assert.equal(DAUER, 12); assert.equal(FPS, 30);
});

test("Seite: noindex, nicht in der Sitemap, nichts von aussen", () => {
  const html = lies("animations/index.html");
  assert.match(html, /<meta name="robots" content="noindex">/);
  assert.ok(!lies("sitemap.xml").includes("/animations/"));
  for (const f of ["index.html", "seite.js", "motor.js", "effekte.js", "rezepte.js"]) assert.doesNotMatch(lies(`animations/${f}`), /(src|href)=["']https?:|import\(["']https?:|from ["']https?:/, f);
});
