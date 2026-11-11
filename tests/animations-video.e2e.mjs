// «Animationen» – Video statt Bild (Prototyp, 7. November 2026): ein kurzes Video wird in Einzelbilder zerlegt, die Bühne zeigt es mit den
// Effekten, das Bild ändert sich mit der Zeit, die Schlaufe hat keine Naht, das MP4 entsteht, Sichern lehnt freundlich ab, und ein Bild
// danach ersetzt das Video wieder. Mit VIDEO_AN = false (animations/video.js) wird der Test übersprungen.
//   NODE_PATH=$(npm root -g) node tests/animations-video.e2e.mjs
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { join } from "node:path";

const require = createRequire(import.meta.url);
let playwright;
try { playwright = require("playwright"); } catch { playwright = require(join(process.env.NODE_PATH || "", "playwright")); }
const root = new URL("../", import.meta.url);
const pfad = (p) => new URL(p, root).pathname.replace(/^\/([A-Za-z]:)/, "$1");
const { VIDEO_AN } = await import(new URL("animations/video.js", root).href);
if (!VIDEO_AN) { console.log("skip  Video ist ausgeschaltet (VIDEO_AN = false)"); process.exit(0); }

const { startServer } = await import(new URL("tools/serve-orma.mjs", root).href);
const server = await startServer(0);
const base = `http://localhost:${server.address().port}/animations/`;
const browser = await playwright.chromium.launch({ args: ["--use-angle=swiftshader", "--enable-unsafe-swiftshader"] });
const ergebnisse = [];
async function check(name, fn) {
  try { await fn(); ergebnisse.push(true); console.log("ok  ", name); }
  catch (e) { ergebnisse.push(false); console.log("FAIL", name, "\n     ", e.message.split("\n").slice(0, 6).join("\n      ")); }
}

await check("Video laden: zerlegt in Einzelbilder, Bühne zeigt es, es bewegt sich, Schlaufe ohne Naht, MP4, kein Sichern, ein Bild ersetzt es", async () => {
  const ctx = await browser.newContext({ viewport: { width: 1300, height: 900 }, acceptDownloads: true });
  await ctx.route(/werke\.php/, (route) => route.fulfill({ status: 200, contentType: "application/json", body: '{"werke":[],"anzahl":0}' }));
  const page = await ctx.newPage();
  const fehler = [];
  page.on("pageerror", (e) => fehler.push(e.message));
  page.on("console", (m) => { if (m.type() === "error") fehler.push(m.text()); });
  await page.goto(base, { timeout: 120000 });
  await page.waitForFunction(() => document.documentElement.classList.contains("bereit"), null, { timeout: 120000 });
  assert.equal(await page.locator("#pult-datei").getAttribute("accept"), "image/*,video/*");
  assert.match(await page.locator("#pult-leer .hinweis").textContent(), /Video/);

  const t0 = Date.now();
  await page.setInputFiles("#pult-datei", pfad("tests/fixtures/animations-video.webm"));
  await page.waitForFunction(() => window.animationen.motor.istVideo("eigen"), null, { timeout: 120000 });
  console.log(`      4 s Video zerlegt in ${((Date.now() - t0) / 1000).toFixed(1)} s`);
  assert.match(await page.locator("#pult-meldung").textContent(), /400 × 500 · 4\.0 s Video/);
  assert.ok(await page.getByRole("button", { name: /^Dein Video · animations-video\.webm$/ }).isVisible());

  // nur das Bild, ohne Effekte: zwei Zeiten zeigen verschiedene Einzelbilder, die Naht der Schlaufe ist ruhig
  const werte = await page.evaluate(async () => {
    const { motor, S } = window.animationen;
    const stapel = { bild: "eigen", grund: "schwarz", ebenen: [{ effekt: "bild", werte: [0, 0, 0], modus: "normal", deckkraft: 1, quelle: "bild", seed: 0 }], dauer: 12 };
    const probe = async (t) => {
      await motor.videoBereit(stapel, t); motor.zeichnen(stapel, t, 200, 250);
      const gl = motor.gl, p = new Uint8Array(200 * 250 * 4); gl.readPixels(0, 0, 200, 250, gl.RGBA, gl.UNSIGNED_BYTE, p); return p;
    };
    const diff = (a, b) => { let s = 0; for (let i = 0; i < a.length; i += 4) s += Math.abs(a[i] - b[i]) + Math.abs(a[i + 1] - b[i + 1]) + Math.abs(a[i + 2] - b[i + 2]); return s / (a.length / 4); };
    const a = await probe(1), b = await probe(2.5), ende = await probe(12 - 1 / 30), anfang = await probe(0), zweites = await probe(1 / 30);
    return { bewegt: diff(a, b), naht: diff(ende, anfang), schritt: diff(anfang, zweites), hell: a.reduce((s, x) => s + x, 0) / a.length, effekt: S.mix.ebenen.length };
  });
  assert.ok(werte.hell > 20, `die Bühne zeigt das Video (${werte.hell})`);
  assert.ok(werte.bewegt > 10, `das Video bewegt sich (${werte.bewegt})`);
  assert.ok(werte.naht < werte.schritt * 3 + 3, `die Naht ist nicht grösser als ein gewöhnlicher Schritt (Naht ${werte.naht}, Schritt ${werte.schritt})`);

  // mit der gewürfelten Mischung zeichnet die Bühne, MP4 entsteht
  await page.waitForTimeout(800);
  const [download] = await Promise.all([page.waitForEvent("download", { timeout: 600000 }), page.getByRole("button", { name: "MP4 laden" }).click()]);
  assert.match(download.suggestedFilename(), /\.(mp4|webm)$/);

  // Sichern lehnt ab
  await page.fill("#sichern-name", "Testerin");
  await page.evaluate(() => { document.getElementById("pult-sichern").disabled = false; });
  await page.click("#pult-sichern");
  assert.match(await page.locator("#sichern-meldung").textContent(), /mit Video lässt sich noch nicht sichern/);

  // ein Bild danach ersetzt das Video
  await page.setInputFiles("#pult-datei", pfad("alpha/drittes-rad/og-drittes-rad.jpg"));
  await page.waitForFunction(() => window.animationen.motor.hatBild("eigen") && !window.animationen.motor.istVideo("eigen"), null, { timeout: 60000 });
  assert.deepEqual(fehler, []);
  await ctx.close();
});

await browser.close(); server.close();
const fehlgeschlagen = ergebnisse.filter((x) => !x).length;
console.log(`\n${ergebnisse.length - fehlgeschlagen}/${ergebnisse.length} ok`);
process.exit(fehlgeschlagen ? 1 : 0);
