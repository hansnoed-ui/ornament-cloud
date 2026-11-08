// Multiverse (8. November 2026): vier Anwendungen zugleich in eigenen Rahmen, neun Pixel-Schalter (Baustein assets/pixel-schalter.js aus PR #670),
// höchstens vier laufen (seit dem Abend auch weniger), eine fünfte löst die am längsten laufende ab, ausschalten macht das Feld frei; keine Intros.
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

test("Multiverse: höchstens vier laufen; eine fünfte löst die am längsten laufende ab, ausschalten macht das Feld frei, einschalten füllt es wieder", () => {
  let z = zustandAus(null);
  assert.deepEqual(z.plaetze, STANDARD);
  assert.equal(PLAETZE, 4);
  let r = umschalten(z, "kunst");
  assert.equal(r.raus, STANDARD[0]); assert.equal(r.platz, 0); assert.deepEqual(r.zustand.plaetze, ["kunst", ...STANDARD.slice(1)]);
  r = umschalten(r.zustand, "kunst");   // ausschalten: das Feld wird frei, es laufen drei
  assert.equal(r.raus, "kunst"); assert.equal(r.rein, null); assert.equal(r.platz, 0);
  assert.deepEqual(r.zustand.plaetze, [null, ...STANDARD.slice(1)]); assert.equal(r.zustand.reihe.length, 3);
  r = umschalten(r.zustand, STANDARD[1]);   // noch eine aus: zwei
  assert.deepEqual(r.zustand.plaetze, [null, null, ...STANDARD.slice(2)]);
  r = umschalten(r.zustand, "animations");   // einschalten nimmt das erste freie Feld, niemand geht
  assert.equal(r.platz, 0); assert.equal(r.raus, null); assert.equal(r.rein, "animations");
  // alle aus geht auch
  z = r.zustand; for (const id of [...z.reihe]) z = umschalten(z, id).zustand;
  assert.deepEqual(z.plaetze, [null, null, null, null]); assert.equal(z.reihe.length, 0); assert.equal(z.ruhe.length, 9);
  assert.deepEqual(zustandAus(JSON.parse(JSON.stringify(z))).plaetze, [null, null, null, null], "auch leer bleibt gemerkt");
  for (let i = 0; i < 60; i++) {
    z = umschalten(z, ANWENDUNGEN[(i * 5 + (i >> 3)) % 9].id).zustand;
    const belegt = z.plaetze.filter(Boolean);
    assert.ok(belegt.length <= 4); assert.equal(new Set(belegt).size, belegt.length);
    assert.deepEqual([...z.reihe].sort(), [...belegt].sort()); assert.equal(z.reihe.length + z.ruhe.length, 9);
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
  assert.match(lies("multiverse/multiverse.css"), /\.feld\[hidden\] \{ display: none; \}/);
  assert.ok(!lies("sitemap.xml").includes("/multiverse/"), "nicht in der Sitemap");
  // ORNA: ?intro=0 schaltet das Startbild ab, auch als App
  assert.match(lies("portfolio/nebeneinander-nacheinander/js/intro.js"), /params\.get\("intro"\) !== "0"/);
  assert.match(lies("portfolio/nebeneinander-nacheinander/index.html"), /q\.get\("intro"\) === "0"/);
});
