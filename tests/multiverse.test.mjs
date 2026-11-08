// Multiverse (8. November 2026): vier Anwendungen zugleich in eigenen Rahmen, neun Pixel-Schalter (Baustein assets/pixel-schalter.js aus PR #670),
// genau vier laufen, eine fünfte löst die am längsten laufende ab, ausschalten holt die am längsten ruhende zurück; keine Intros der Anwendungen.
//   node --experimental-strip-types --no-warnings --test tests/multiverse.test.mjs
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";

const root = new URL("../", import.meta.url);
const lies = (p) => readFileSync(new URL(p, root), "utf8");
const { ANWENDUNGEN, STANDARD, PLAETZE, umschalten, zustandAus } = await import(new URL("multiverse/anwendungen.js", root).href);

test("Multiverse: neun Anwendungen mit echten Adressen, ohne Intro, je zwei Pixelzeichen auf 13 × 13", () => {
  assert.deepEqual(ANWENDUNGEN.map((a) => a.id), ["fictory", "phorma-i", "phorma-ii", "phorma-iii", "orna", "drittes-rad", "kunst", "animations", "konstellation"]);
  for (const a of ANWENDUNGEN) {
    assert.match(a.adresse, /[?&]intro=0(&|$)/, a.id);
    for (const adresse of [a.adresse, a.allein]) {
      const pfad = new URL(adresse, "https://ornament.cloud/multiverse/").pathname;
      assert.ok(existsSync(new URL(`.${pfad}index.html`, root)), `${a.id}: ${adresse}`);
    }
    assert.match(a.farbe, /^#[0-9a-f]{6}$/);
    for (const z of [a.aus, a.an]) {
      assert.ok(z.length >= 10, `${a.id}: zu wenige Pixel`);
      for (const [x, y, d] of z) assert.ok(x >= 0 && x < 13 && y >= 0 && y < 13 && d > 0 && d <= 1, `${a.id}: ${x},${y},${d}`);
    }
  }
});

test("Multiverse: genau vier laufen; eine fünfte löst die am längsten laufende ab, ausschalten holt die am längsten ruhende zurück", () => {
  let z = zustandAus(null);
  assert.deepEqual(z.plaetze, STANDARD);
  assert.equal(PLAETZE, 4);
  let r = umschalten(z, "kunst");
  assert.equal(r.raus, STANDARD[0]); assert.equal(r.platz, 0); assert.deepEqual(r.zustand.plaetze, ["kunst", ...STANDARD.slice(1)]);
  r = umschalten(r.zustand, "animations");
  assert.equal(r.raus, STANDARD[1]); assert.equal(r.platz, 1);
  const vorher = r.zustand;
  r = umschalten(vorher, "kunst");   // ausschalten: die am längsten ruhende kommt ins selbe Feld
  assert.equal(r.raus, "kunst"); assert.equal(r.rein, vorher.ruhe[0]); assert.equal(r.platz, 0);
  for (let i = 0; i < 40; i++) {
    z = umschalten(r.zustand, ANWENDUNGEN[(i * 5) % 9].id).zustand; r = { zustand: z };
    assert.equal(new Set(z.plaetze).size, 4); assert.equal(z.reihe.length, 4); assert.equal(z.ruhe.length, 5);
    assert.deepEqual([...z.reihe].sort(), [...z.plaetze].sort());
  }
  // Gemerktes mit Unsinn fällt auf den Standard zurück
  assert.deepEqual(zustandAus({ plaetze: ["orna", "orna", "x", "kunst"] }).plaetze, STANDARD);
});

test("Multiverse: Seite mit Titel, noindex, Rahmen pro Feld, Intro überspringbar; Schalter und Kreis aus dem Baustein von #670", () => {
  const html = lies("multiverse/index.html"), js = lies("multiverse/multiverse.js");
  assert.match(html, /<title>ornament\.cloud · Multiverse<\/title>/);
  assert.match(html, /<meta name="robots" content="noindex">/);
  assert.match(html, /class="intro-weiter"/);
  assert.ok(html.indexOf('sessionStorage.getItem("multiverse-intro")') < html.indexOf("<body>"), "das Intro entscheidet vor dem ersten Bild");
  assert.match(js, /import \{ pixelSchalter, kreisWechsel \} from "\.\.\/assets\/pixel-schalter\.js\?v=1";/);
  assert.match(js, /document\.createElement\("iframe"\)/);
  assert.match(js, /localStorage/);
  assert.ok(!lies("sitemap.xml").includes("/multiverse/"), "nicht in der Sitemap");
  // ORNA: ?intro=0 schaltet das Startbild ab, auch als App
  assert.match(lies("portfolio/nebeneinander-nacheinander/js/intro.js"), /params\.get\("intro"\) !== "0"/);
  assert.match(lies("portfolio/nebeneinander-nacheinander/index.html"), /q\.get\("intro"\) === "0"/);
});
