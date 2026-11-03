// «Animationen» – Browser-Test (Playwright, Chromium mit SwiftShader): alle 15 Effekte übersetzen, die 27 Werke zeichnen etwas,
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

await check("läuft durch: am Schlaufenrand bewegt sich jedes Werk mindestens ein Drittel so viel wie sonst (kein stehendes Ausgangsbild)", async () => {
  const { ctx, page } = await oeffne();
  const lahm = await page.evaluate(() => {
    const { motor, WERKE } = window.animationen, gl = motor.gl, dt = 1 / 30;
    const lesen = (t, s) => { motor.zeichnen(s, t, 64, 80); const p = new Uint8Array(64 * 80 * 4); gl.readPixels(0, 0, 64, 80, gl.RGBA, gl.UNSIGNED_BYTE, p); return p; };
    const d = (s, t) => { const a = lesen(t, s), b = lesen(t + dt, s); let x = 0; for (let i = 0; i < a.length; i++) x += Math.abs(a[i] - b[i]); return x / a.length; };
    return WERKE.map((w) => {
      const v = [1.5, 3, 4.5, 6, 7.5, 9, 10.5].map((t) => d(w.stapel, t)).sort((a, b) => a - b), median = v[3];
      return { id: w.id, rand: +(Math.min(d(w.stapel, 0), d(w.stapel, 12 - dt)) / Math.max(median, .05)).toFixed(2) };
    }).filter((r) => r.rand < .33);
  });
  assert.deepEqual(lahm, []);
  await ctx.close();
});

await check("Ansichten wechseln, Reel läuft weiter, Mischpult mischt neu und merkt sich die Mischung", async () => {
  const { ctx, page, fehler } = await oeffne({ width: 1300, height: 900 }, "#w=frida-4");
  await page.getByRole("button", { name: "Pause" }).click();   // angehalten, damit das Reel in der langsamen Software-Grafik nicht weiterläuft
  const nr = () => page.evaluate(() => window.animationen.WERKE[window.animationen.S.reel].id);
  assert.match(await nr(), /^frida-\d$/, "die Adresse #w=frida-4 öffnet Frida");
  await page.getByRole("button", { name: "(2)" }).click();
  assert.equal(await nr(), "frida-1");
  assert.match(await page.locator("#reel-titel").textContent(), /Frida \/ 01 Op-Art/);
  await page.getByRole("button", { name: "Weiter" }).click();
  assert.equal(await nr(), "frida-2");
  await page.click('[data-ansicht="werke"]');
  assert.equal(await page.locator(".kachel").count(), 27);
  await page.locator(".kachel").nth(20).click();
  assert.ok(await page.locator("#reel").isVisible());
  assert.equal(await nr(), "strudel-3", "die Kachel öffnet ihr Werk im Reel");
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

await check("Eigenes Bild: hochladen, mischen, ersetzen; es steht nicht im Link", async () => {
  const { ctx, page, fehler } = await oeffne({ width: 1300, height: 900 }, "#mischpult");
  await page.setInputFiles("#pult-datei", new URL("animations/bilder/strudel.jpg", root).pathname.replace(/^\/([A-Za-z]:)/, "$1"));
  await page.waitForFunction(() => window.animationen.S.mix.bild === "eigen", null, { timeout: 60000 });
  assert.match(await page.locator("#pult-meldung").textContent(), /strudel\.jpg · 1281 × 1600 · bleibt in diesem Browser/);
  assert.equal(await page.getByRole("button", { name: "Eigenes Bild", exact: true }).getAttribute("aria-pressed"), "true");
  await page.getByRole("button", { name: "Neu mischen" }).click();
  assert.equal(await page.evaluate(() => window.animationen.S.mix.bild), "eigen", "Neu mischen behält das eigene Bild");
  await page.setInputFiles("#pult-datei", new URL("animations/bilder/frida.jpg", root).pathname.replace(/^\/([A-Za-z]:)/, "$1"));
  await page.waitForFunction(() => /frida\.jpg/.test(document.getElementById("pult-meldung").textContent), null, { timeout: 60000 });
  await page.click('[data-ansicht="info"]');
  const zweite = await ctx.newPage(); await zweite.goto(page.url().replace(/#.*/, "") + "#" + new URL(page.url()).hash.slice(1), { timeout: 120000 });
  await zweite.waitForFunction(() => document.documentElement.classList.contains("bereit"), null, { timeout: 120000 });
  assert.equal(await zweite.evaluate(() => window.animationen.S.mix.bild), "fragmente", "ohne das Bild fällt der Link auf das erste Bild zurück");
  assert.deepEqual(fehler, []);
  await ctx.close();
});

await check("Pause hält Reel und Mischpult an (auch per Leertaste); Standbild lädt ein PNG in 1080 × 1350", async () => {
  const { ctx, page, fehler } = await oeffne({ width: 1300, height: 900 }, "#mischpult");
  await page.getByRole("button", { name: "Pause" }).click();
  await page.waitForTimeout(800);   // das nächste gezeichnete Bild trägt die angehaltene Zeit
  const a = await page.locator("#pult-uhr").textContent(); await page.waitForTimeout(1500);
  assert.equal(await page.locator("#pult-uhr").textContent(), a, "die Zeit steht");
  await page.click('[data-ansicht="reel"]');
  assert.equal(await page.locator("#reel-pause").textContent(), "Abspielen", "Reel ist mit angehalten");
  await page.evaluate(() => document.activeElement?.blur());   // auf einem Knopf löst die Leertaste den Knopf aus, wie üblich
  await page.keyboard.press("Space");
  assert.equal(await page.locator("#reel-pause").textContent(), "Pause", "Leertaste spielt wieder ab");
  await page.keyboard.press("Space");
  const [download] = await Promise.all([page.waitForEvent("download"), page.getByRole("button", { name: "Standbild" }).click()]);
  assert.match(download.suggestedFilename(), /^ornament-animation-fragmente-01-glut-und-staub-\d\ds\d-4x5\.png$/);
  const datei = await download.path();
  const { readFileSync } = await import("node:fs");
  const kopf = readFileSync(datei);
  assert.equal(kopf.subarray(1, 4).toString(), "PNG");
  assert.deepEqual([kopf.readUInt32BE(16), kopf.readUInt32BE(20)], [1080, 1350]);
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
