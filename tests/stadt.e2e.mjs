// «Die Paradoxie der Stadt» – Browser-Tests (Playwright, Chromium): die Stadt lebt beim Öffnen, Pause hält die Zeit an, Eingriff am Ort mit Protokoll,
// Sichtweisen ändern nichts an der Stadt, Handy ohne seitliches Scrollen, und ohne jev-Tabelle läuft die Grundsimulation weiter.
//   NODE_PATH=$(npm root -g) node tests/stadt.e2e.mjs
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { join } from "node:path";

const require = createRequire(import.meta.url);
let playwright;
try { playwright = require("playwright"); } catch { playwright = require(join(process.env.NODE_PATH || "", "playwright")); }
const { chromium } = playwright;
const root = new URL("../", import.meta.url);
const { startServer } = await import(new URL("tools/serve-orma.mjs", root).href);
const server = await startServer(0);
const base = `http://localhost:${server.address().port}/alpha/stadt/`;
const browser = await chromium.launch();
const ergebnisse = [];
async function check(name, fn) {
  try { await fn(); ergebnisse.push(true); console.log("ok  ", name); }
  catch (e) { ergebnisse.push(false); console.log("FAIL", name, "\n     ", e.message.split("\n").slice(0, 6).join("\n      ")); }
}
async function oeffne(opts = {}, vorher = null) {
  const ctx = await browser.newContext({ viewport: { width: 1300, height: 900 }, ...opts });
  const page = await ctx.newPage();
  const fehler = [];
  page.on("pageerror", (e) => fehler.push(e.message));
  if (vorher) await vorher(page);
  await page.goto(base + "?debug&figuren=32");
  await page.waitForSelector(".stadt.bereit", { timeout: 30000 });
  return { ctx, page, fehler };
}
const uhr = (page) => page.locator("#uhr").textContent();
const zustand = (page) => page.evaluate(() => JSON.stringify(window.stadtTest.stadt.z).length + ":" + window.stadtTest.stadt.z.t + ":" + window.stadtTest.stadt.z.figuren.map((f) => f.x.toFixed(2) + f.zustand).join());

await check("Beim Öffnen lebt die Stadt: Uhr läuft, Figuren und Autos sind unterwegs, Einstieg mit drei Wegen und dem Impuls", async () => {
  const { ctx, page, fehler } = await oeffne();
  const a = await uhr(page); await page.waitForTimeout(2500); const b = await uhr(page);
  assert.notEqual(a, b, "die Uhr läuft ohne Zutun");
  for (const t of ["Einfach umsehen", "Eine Person begleiten", "Etwas verändern", "Mehr Platz für Autos?"]) assert.ok(await page.getByRole("button", { name: t }).isVisible(), t);
  assert.match(await page.locator("#lagezeile").textContent(), /Passant:innen · [1-9]\d* Autos/);
  assert.deepEqual(fehler, []);
  await ctx.close();
});

await check("Pause hält die Stadtzeit an; Start läuft weiter", async () => {
  const { ctx, page } = await oeffne();
  await page.click("#einstieg-umsehen");
  await page.click("#lauf");
  const t1 = await page.evaluate(() => window.stadtTest.stadt.z.t); await page.waitForTimeout(1200);
  assert.equal(await page.evaluate(() => window.stadtTest.stadt.z.t), t1, "angehalten");
  assert.equal(await page.locator("#lauf").getAttribute("aria-pressed"), "false");
  await page.click("#lauf"); await page.waitForTimeout(800);
  assert.ok((await page.evaluate(() => window.stadtTest.stadt.z.t)) > t1);
  await ctx.close();
});

await check("Impuls «Mehr Platz für Autos?» zeigt die Spur in der Vorschau; Umsetzen steht im Protokoll; Zurücknehmen ist etwas anderes als Zurücksetzen", async () => {
  const { ctx, page } = await oeffne();
  await page.click("#einstieg-impuls");
  assert.deepEqual(await page.evaluate(() => window.stadtTest.ui.vorschau), ["spur", true]);
  await page.click('[data-massnahme="spur"]');
  assert.equal(await page.evaluate(() => window.stadtTest.stadt.z.m.spur), true);
  await page.click("#t-protokoll");
  assert.match(await page.locator("#tab-protokoll").textContent(), /Massnahme\s+Zusätzliche Fahrspur/);
  await page.click("#t-veraendern");
  await page.getByRole("button", { name: "Nur Massnahme zurücknehmen" }).first().click();
  const nach = await page.evaluate(() => ({ spur: window.stadtTest.stadt.z.m.spur, tag: window.stadtTest.stadt.z.tag, rueck: window.stadtTest.stadt.z.rueckgenommen.length, protokoll: window.stadtTest.stadt.z.protokoll.length }));
  assert.deepEqual([nach.spur, nach.rueck], [false, 1], "Massnahme zurück, Lauf geht weiter");
  assert.ok(nach.protokoll >= 2);
  await page.click("#neustart"); await page.waitForTimeout(2500);
  assert.equal(await page.evaluate(() => window.stadtTest.stadt.z.rueckgenommen.length), 0, "Zurücksetzen beginnt neu");
  await ctx.close();
});

await check("Sichtweisen wechseln, ohne Figuren oder Wege zu verändern", async () => {
  const { ctx, page } = await oeffne();
  await page.click("#einstieg-umsehen"); await page.click("#lauf");
  await page.click("#t-sichten");
  const vorher = await zustand(page);
  for (const s of ["erreichbarkeit", "aufenthalt", "belastung", "fluss"]) { await page.check(`input[name=sicht][value=${s}]`); await page.waitForTimeout(150); }
  await page.locator('summary:has-text("Gewichtung")').click();
  await page.locator('input[data-g="reise"]').fill("3");
  assert.equal(await zustand(page), vorher);
  await ctx.close();
});

await check("Begleiten: eine Person mit Zustand, Programm, Wegen und dem Verteilapparat als Schwellentabelle", async () => {
  const { ctx, page } = await oeffne();
  await page.click("#einstieg-begleiten");
  await page.waitForSelector(".karte-person h3");
  await page.locator('summary:has-text("Verteilapparat")').click();
  const t = await page.locator("#tab-begleiten").textContent();
  for (const w of ["Jetzt:", "Heute", "auffällig", "entscheidungsfähig"]) assert.ok(t.includes(w) || /Noch kein Weg/.test(t), w);
  await ctx.close();
});

await check("Handy (390 px): kein seitliches Scrollen, Panel klappt auf, Bedienelemente mindestens 36 px hoch", async () => {
  const { ctx, page, fehler } = await oeffne({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), "keine Breite über den Bildschirm");
  await page.click("#einstieg-veraendern");
  assert.equal(await page.locator("#panel-griff").getAttribute("aria-expanded"), "true");
  const klein = await page.evaluate(() => [...document.querySelectorAll(".leiste button, .tabs button, .schalter")].filter((b) => b.offsetParent && b.getBoundingClientRect().height < 36).length);
  assert.equal(klein, 0);
  assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1));
  assert.deepEqual(fehler, []);
  await ctx.close();
});

await check("Fällt die jev-Tabelle aus, läuft die Stadt mit Ersatzregeln weiter und sagt es", async () => {
  const { ctx, page, fehler } = await oeffne({}, (p) => p.route(/jev\.js/, (r) => r.abort()));
  const a = await page.evaluate(() => window.stadtTest.stadt.z.t); await page.waitForTimeout(1200);
  assert.ok((await page.evaluate(() => window.stadtTest.stadt.z.t)) > a, "die Zeit läuft");
  assert.equal(await page.evaluate(() => window.stadtTest.stadt.r.tabelle), null);
  await page.click("#einstieg-umsehen"); await page.click("#t-modell");
  assert.match(await page.locator("#tab-modell").textContent(), /Ersatzregeln/);
  assert.deepEqual(fehler, []);
  await ctx.close();
});

await check("Weniger Bewegung: die Stadt startet angehalten und sagt es", async () => {
  const { ctx, page } = await oeffne({ reducedMotion: "reduce" });
  const a = await page.evaluate(() => window.stadtTest.stadt.z.t); await page.waitForTimeout(800);
  assert.equal(await page.evaluate(() => window.stadtTest.stadt.z.t), a);
  assert.match(await page.locator("#meldung").textContent(), /Weniger Bewegung/);
  await ctx.close();
});

await browser.close(); server.close();
console.log(`${ergebnisse.filter(Boolean).length} von ${ergebnisse.length} bestanden`);
process.exit(ergebnisse.every(Boolean) ? 0 : 1);
