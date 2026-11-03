// «Animationen» – Browser-Test (Playwright, Chromium mit SwiftShader): alle 16 Effekte übersetzen, die 27 Werke zeichnen etwas,
// die vier Ansichten wechseln, Mischpult mischt neu und schreibt die Mischung in die Adresse, kein seitliches Scrollen auf dem Handy,
// die Schlaufe hat keine Naht.
//   NODE_PATH=$(npm root -g) node tests/animations.e2e.mjs
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
const base = `http://localhost:${server.address().port}/animations/`;
const browser = await chromium.launch({ args: ["--use-angle=swiftshader", "--enable-unsafe-swiftshader"] });
const ergebnisse = [];
async function check(name, fn) {
  try { await fn(); ergebnisse.push(true); console.log("ok  ", name); }
  catch (e) { ergebnisse.push(false); console.log("FAIL", name, "\n     ", e.message.split("\n").slice(0, 6).join("\n      ")); }
}
async function oeffne(viewport = { width: 1300, height: 900 }, hash = "") {
  const ctx = await browser.newContext({ viewport });
  const page = await ctx.newPage();
  const fehler = [];
  page.on("pageerror", (e) => fehler.push(e.message));
  page.on("console", (m) => { if (m.type() === "error") fehler.push(m.text()); });
  await page.goto(base + hash, { timeout: 120000 });
  await page.waitForFunction(() => document.documentElement.classList.contains("bereit"), null, { timeout: 120000 });
  return { ctx, page, fehler };
}

await check("alle Effekte übersetzen, jedes Werk zeichnet ein sichtbares Bild, keine Fehler", async () => {
  const { ctx, page, fehler } = await oeffne();
  assert.deepEqual(await page.evaluate(() => window.animationen.fehler), []);
  const leer = await page.evaluate(() => {
    const { motor, WERKE } = window.animationen, gl = motor.gl, px = new Uint8Array(64 * 80 * 4);
    return WERKE.filter((w) => {
      motor.zeichnen(w.stapel, 4.2, 64, 80);
      gl.readPixels(0, 0, 64, 80, gl.RGBA, gl.UNSIGNED_BYTE, px);
      let min = 255, max = 0; for (let i = 0; i < px.length; i += 4) { const v = px[i] + px[i + 1] + px[i + 2]; min = Math.min(min, v); max = Math.max(max, v); }
      return max - min < 30;
    }).map((w) => w.id);
  });
  assert.deepEqual(leer, [], "Werke ohne Bild");
  assert.deepEqual(fehler, []);
  await ctx.close();
});

await check("die Schlaufe schliesst: vom letzten zum ersten Bild springt es nicht stärker als von Bild zu Bild", async () => {
  const { ctx, page } = await oeffne();
  const schlecht = await page.evaluate(() => {
    const { motor, WERKE } = window.animationen, gl = motor.gl, dt = 1 / 30;
    const lesen = (t, s) => { motor.zeichnen(s, t, 64, 80); const p = new Uint8Array(64 * 80 * 4); gl.readPixels(0, 0, 64, 80, gl.RGBA, gl.UNSIGNED_BYTE, p); return p; };
    const mittel = (a, b) => { let d = 0; for (let i = 0; i < a.length; i++) d += Math.abs(a[i] - b[i]); return d / a.length; };
    return WERKE.map((w) => {
      const letztes = lesen(12 - dt, w.stapel), erstes = lesen(0, w.stapel), zweites = lesen(dt, w.stapel), vorletztes = lesen(12 - 2 * dt, w.stapel);
      const naht = mittel(letztes, erstes), normal = Math.max(mittel(erstes, zweites), mittel(vorletztes, letztes));
      return { id: w.id, naht: +naht.toFixed(2), normal: +normal.toFixed(2) };
    }).filter((r) => r.naht > r.normal * 3 + 1.5);
  });
  assert.deepEqual(schlecht, []);
  await ctx.close();
});

await check("Ansichten wechseln, Reel läuft weiter, Mischpult mischt neu und merkt sich die Mischung", async () => {
  const { ctx, page, fehler } = await oeffne({ width: 1300, height: 900 }, "#w=frida-4");
  assert.match(await page.locator("#reel-titel").textContent(), /Frida \/ 04 Seifenblase/);
  await page.getByRole("button", { name: "Weiter" }).click();
  assert.match(await page.locator("#reel-titel").textContent(), /05/);
  await page.click('[data-ansicht="werke"]');
  assert.equal(await page.locator(".kachel").count(), 27);
  await page.locator(".kachel").nth(20).click();
  assert.ok(await page.locator("#reel").isVisible());
  await page.click('[data-ansicht="mischpult"]');
  await page.getByRole("button", { name: "Neu mischen" }).click();
  await page.waitForTimeout(300);
  assert.match(page.url(), /#m=/);
  const url = page.url(), mix = await page.evaluate(() => JSON.stringify(window.animationen.S.mix));
  await page.click('[data-ansicht="info"]');   // die erste Seite ruht, sonst rechnen zwei in Software
  const zweite = await ctx.newPage(); await zweite.goto(url, { timeout: 120000 });
  await zweite.waitForFunction(() => document.documentElement.classList.contains("bereit"), null, { timeout: 120000 });
  assert.equal(await zweite.evaluate(() => JSON.stringify(window.animationen.S.mix)), mix);
  assert.equal(await page.locator("fieldset.ebene").count(), 3);
  assert.deepEqual(fehler, []);
  await ctx.close();
});

await check("Handy: kein seitliches Scrollen in allen Ansichten", async () => {
  const { ctx, page } = await oeffne({ width: 360, height: 760 });
  for (const a of ["reel", "werke", "mischpult", "info"]) {
    await page.click(`[data-ansicht="${a}"]`);
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth), 0, a);
  }
  await ctx.close();
});

await browser.close();
server.close();
const fehlgeschlagen = ergebnisse.filter((e) => !e).length;
console.log(`\n${ergebnisse.length - fehlgeschlagen} von ${ergebnisse.length} bestanden`);
process.exit(fehlgeschlagen ? 1 : 0);
