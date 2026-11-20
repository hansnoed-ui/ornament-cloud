// ornament.lab · Handy – Browsertest (Playwright, Chromium, 390 × 780 wie ein Handy): Beispielbild → Effekt-Vorschauen → Fliessfeld mit Anteil
// anwenden → sechs Varianten → weiterführen → Beat nach Regeln → Zusammenstellung (ohne jev: Zufall) → Galerie mit Weg und Varianten →
// Projekt sichern. Nichts scrollt, nichts geht ins Netz. Mit LAB_HANDY_FILM=1 auch den Film rechnen (dauert mit SwiftShader viele Minuten).
//   NODE_PATH=$(npm root -g) node tests/lab-handy.e2e.mjs
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { join } from "node:path";

const require = createRequire(import.meta.url);
let playwright;
try { playwright = require("playwright"); } catch { playwright = require(join(process.env.NODE_PATH || "", "playwright")); }
const root = new URL("../", import.meta.url);
const { startServer } = await import(new URL("tools/serve-orma.mjs", root).href);
const server = await startServer(0);
const base = `http://localhost:${server.address().port}/alpha/lab/handy/`;
const browser = await playwright.chromium.launch({ args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader"] });
const ergebnisse = [];
async function check(name, fn) {
  try { await fn(); ergebnisse.push(true); console.log("ok  ", name); }
  catch (e) { ergebnisse.push(false); console.log("FAIL", name, "\n     ", e.message.split("\n").slice(0, 8).join("\n      ")); }
}
const warte = (page, fn, ms = 180000) => page.waitForFunction(fn, null, { timeout: ms });
const frei = (page) => warte(page, () => !ornamentLabHandy.laeuft);

for (const schema of ["dark", "light"]) {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 780 }, colorScheme: schema, hasTouch: true, acceptDownloads: true, locale: "de-CH" });
  const page = await ctx.newPage();
  const fehler = [], fremd = [];
  page.on("pageerror", (e) => fehler.push(e.message));
  page.on("console", (m) => { if (m.type() === "error" && !/wahl\.php/.test(m.text()) && !/404/.test(m.text())) fehler.push(m.text()); });
  page.on("request", (r) => { const u = new URL(r.url()); if (!["localhost", "127.0.0.1"].includes(u.hostname) && u.protocol.startsWith("http")) fremd.push(r.url()); });
  await page.goto(base);
  await warte(page, () => globalThis.ornamentLabHandy);
  const passt = async () => {
    const m = await page.evaluate(() => ({ b: document.documentElement.scrollWidth, h: document.documentElement.scrollHeight, iw: innerWidth, ih: innerHeight }));
    assert.ok(m.b <= m.iw && m.h <= m.ih, `scrollt: ${JSON.stringify(m)}`);
  };

  await check(`${schema}: sechs Schalter, leere Bühne mit Hinweis, nichts scrollt`, async () => {
    assert.equal(await page.locator(".schalter").count(), 6);
    assert.ok(await page.locator("#leer").isVisible());
    await passt();
  });
  await check(`${schema}: Beispielbild wird Material`, async () => {
    await page.click("#beispiel"); await warte(page, () => ornamentLabHandy.aktuell && !ornamentLabHandy.laeuft, 60000);
    assert.ok(await page.locator("#grundbild").isVisible());
  });
  await check(`${schema}: Effekt: zehn Vorschauen aus dem eigenen Bild, Fliessfeld mit 60 % anwenden`, async () => {
    await page.click(".schalter >> nth=1");
    await warte(page, () => document.querySelectorAll('#effekte .bildchen[style*="blob:"]').length >= 10);
    await page.click('[data-op="lab.fluss"]'); await warte(page, () => ornamentLabHandy.vorschau && !ornamentLabHandy.laeuft);
    await page.fill("#anteil", "60"); await page.dispatchEvent("#anteil", "input");
    await page.waitForTimeout(400);
    assert.equal(await page.locator("#wirkung").evaluate((e) => getComputedStyle(e).opacity), "0.6");
    const vorher = await page.evaluate(() => ornamentLabHandy.aktuell);
    await page.click("#anwenden"); await warte(page, (v) => ornamentLabHandy.aktuell !== v && !ornamentLabHandy.laeuft, vorher);
    const p = await page.evaluate(() => { const S = ornamentLabHandy, e = S.projekt.ergebnisse.find((x) => x.id === S.aktuell); return S.projekt.knoten.find((k) => k.id === e.knoten).parameter; });
    assert.equal(p.anteil, 0.6);
    await passt();
  });
  await check(`${schema}: Varianten: sechs nebeneinander, eine wählen und weiterführen`, async () => {
    await page.click('[data-op="lab.punktieren"]'); await warte(page, () => ornamentLabHandy.vorschau && !ornamentLabHandy.laeuft);
    await page.click(".schalter >> nth=2");
    await page.click("#variantenRechnen"); await warte(page, () => ornamentLabHandy.varianten && !ornamentLabHandy.laeuft);
    assert.equal(await page.locator("#raster6 button").count(), 6);
    await page.click("#raster6 button >> nth=4");
    const id = await page.evaluate(() => ornamentLabHandy.variante);
    await page.click("#weiter");
    assert.equal(await page.evaluate(() => ornamentLabHandy.aktuell), id);
  });
  await check(`${schema}: Klang: Beat aus dem Bild nach Regeln, 30 s`, async () => {
    await page.click(".schalter >> nth=3");
    await page.click("#beatRegel"); await warte(page, () => ornamentLabHandy.beat.ergebnis && !ornamentLabHandy.laeuft);
    assert.ok(await page.locator("#hoeren").isEnabled());
    assert.ok(await page.locator("#welle").isVisible());
  });
  await check(`${schema}: Film: Format 4:5, Zusammenstellung (ohne jev: Zufall), Abschnitte schaltbar`, async () => {
    await page.click(".schalter >> nth=4"); await page.click('[data-format="4:5"]');
    await page.click("#zusammenstellen"); await warte(page, () => ornamentLabHandy.film.zusammen && !ornamentLabHandy.laeuft);
    assert.equal(await page.evaluate(() => ornamentLabHandy.film.zusammen.plan.format), "4:5");
    await page.click("#abschnitte .effekt >> nth=0");
    assert.equal(await page.evaluate(() => ornamentLabHandy.film.zusammen.plan.abschnitte[0].an), false);
    assert.ok(await page.locator("#rechnen").isEnabled());
    if (process.env.LAB_HANDY_FILM) {
      await page.click("#rechnen"); await warte(page, () => ornamentLabHandy.film.video && !ornamentLabHandy.laeuft, 1800000);
      assert.ok(await page.locator("#film").isVisible());
    }
  });
  await check(`${schema}: Galerie: Weg nacheinander, Varianten nebeneinander, gross mit Weiterführen, Projekt sichern`, async () => {
    await page.click(".schalter >> nth=5");
    const titel = await page.locator("#weg button").evaluateAll((l) => l.map((b) => b.title));
    assert.equal(titel.length, 3, `Material und zwei Schritte: ${titel}`);
    await page.click("#weg button >> nth=2");
    assert.equal(await page.locator("#raster6 button").count(), 6);
    await page.click("#raster6 button >> nth=0");
    assert.ok(await page.locator("#raster6 .schwebend").isVisible());
    const [download] = await Promise.all([page.waitForEvent("download"), page.click("#projektSichern")]);
    assert.match(download.suggestedFilename(), /\.ornalab\.zip$/);
    await frei(page); await passt();
  });
  await check(`${schema}: Sprache d, e, s, f: Texte wechseln sofort, gemerkt fürs nächste Mal, nichts scrollt`, async () => {
    assert.equal(await page.evaluate(() => document.documentElement.lang), "de");
    for (const [sp, sichern, ort] of [["en", "Save project", "Gallery"], ["es", "Guardar proyecto", "Galería"], ["fr", "Enregistrer le projet", "Galerie"]]) {
      await page.click(`#sprachen [lang="${sp}"]`);
      assert.equal(await page.evaluate(() => document.documentElement.lang), sp);
      assert.equal(await page.locator("#projektSichern").textContent(), sichern);
      assert.match(await page.locator("#ort").textContent(), new RegExp(`6 / 6 · ${ort}`));
      await passt();
    }
    assert.equal(await page.evaluate(() => localStorage.getItem("ornament.sprache")), "fr");
    await page.click('#sprachen [lang="de"]');
    assert.equal(await page.locator("#projektSichern").textContent(), "Projekt sichern");
  });
  await check(`${schema}: keine Fehler, nichts von fremden Servern`, async () => {
    assert.deepEqual(fehler, []); assert.deepEqual(fremd, []);
  });
  await ctx.close();
}
await browser.close(); server.close();
const fail = ergebnisse.filter((x) => !x).length;
console.log(`\n${ergebnisse.length - fail} von ${ergebnisse.length} bestanden`);
process.exit(fail ? 1 : 0);
