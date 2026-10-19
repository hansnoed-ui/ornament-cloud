// Hochrendern (alpha/hochrendern/) – Browser-Tests (Playwright, Chromium, WebGPU über SwiftShader): ein WebM mit Ton über das Video-Element
// (Probe vorher/nachher, ×2 mit Ton), ein MP4 über WebCodecs (×4, Hochformat), ein grosses Video (×4 gesperrt), Schrift über dem Video (Ebene,
// Schrift, Ziehen, ×1 nur Schrift, gemerkt), keine Anfragen nach aussen.
// Dieses Chromium kodiert kein H.264: das Ergebnis ist VP9 im MP4 (der Weg für Browser ohne H.264), geprüft mit ffprobe.
//   NODE_PATH=$(npm root -g) node tests/hochrendern.e2e.mjs
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { join } from "node:path";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { execFileSync } from "node:child_process";

const require = createRequire(import.meta.url);
let playwright;
try { playwright = require("playwright"); } catch { playwright = require(join(process.env.NODE_PATH || "", "playwright")); }
const root = new URL("../", import.meta.url);
const { startServer } = await import(new URL("tools/serve-orma.mjs", root).href);
const server = await startServer(0);
const base = `http://localhost:${server.address().port}/alpha/hochrendern/`;
const browser = await playwright.chromium.launch({ args: ["--enable-unsafe-webgpu", "--enable-features=Vulkan", "--use-vulkan=swiftshader", "--use-webgpu-adapter=swiftshader"] });
const fixture = (name) => new URL(`tests/fixtures/hochrendern/${name}`, root).pathname;
const ordner = mkdtempSync(join(tmpdir(), "hochrendern-"));
const ergebnisse = [];
async function check(name, fn) {
  if (process.env.NUR && !name.includes(process.env.NUR)) return;
  try { await fn(); ergebnisse.push(true); console.log("ok  ", name); }
  catch (e) { ergebnisse.push(false); console.log("FAIL", name, "\n     ", e.message.split("\n").slice(0, 8).join("\n      ")); }
}
async function oeffne() {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 950 }, acceptDownloads: true });
  const page = await ctx.newPage();
  const fehler = [], fremd = [];
  page.on("pageerror", (e) => fehler.push(e.message));
  page.on("console", (m) => { if (m.type() === "error") fehler.push(m.text()); });
  page.on("request", (r) => { const u = new URL(r.url()); if (!["localhost", "127.0.0.1"].includes(u.hostname) && u.protocol.startsWith("http")) fremd.push(r.url()); });
  await page.goto(base);
  return { ctx, page, fehler, fremd };
}
const info = (page) => page.textContent("#info");
/** das heruntergeladene Video: Breite, Höhe, Bilder, Codec und ob Ton drin ist (ffprobe) */
async function herunterladen(page, name) {
  const [dl] = await Promise.all([page.waitForEvent("download"), page.click("#laden")]);
  const pfad = join(ordner, name);
  await dl.saveAs(pfad);
  const strom = JSON.parse(execFileSync("ffprobe", ["-v", "error", "-count_frames", "-show_entries", "stream=codec_type,codec_name,width,height,nb_read_frames", "-of", "json", pfad])).streams;
  const v = strom.find((s) => s.codec_type === "video");
  return { breite: v.width, hoehe: v.height, bilder: Number(v.nb_read_frames), codec: v.codec_name, ton: strom.some((s) => s.codec_type === "audio"), name: dl.suggestedFilename() };
}

await check("WebM mit Ton: Probe vorher/nachher, dann ×2 als MP4 mit Ton; nichts von aussen", async () => {
  const { ctx, page, fehler, fremd } = await oeffne();
  assert.ok(await page.isHidden("#startfehler"), "WebGPU ist da");
  await page.click('[data-modell="grafik"]'); await page.click('[data-faktor="2"]');
  await page.setInputFiles("#datei", fixture("klein.webm"));
  await page.waitForFunction(() => !document.getElementById("probe").disabled, null, { timeout: 60_000 });
  assert.match(await info(page), /^64 × 48 · 0,5 s · 15 Bilder · 30 Bilder\/s · gelesen über das Video-Element/);
  assert.match(await page.textContent("#faktor-info"), /64 × 48 → 128 × 96/);
  await page.click("#probe");
  await page.waitForFunction(() => window.__hochrendern.probe, null, { timeout: 300_000 });
  assert.ok(await page.isVisible("#vergleich") && await page.isVisible("#teiler-leiste") && await page.isHidden("#quelle"), "der Vergleich statt des Videos");
  assert.deepEqual(await page.evaluate(() => [document.getElementById("vergleich").width, document.getElementById("vergleich").height]), [128, 96]);
  assert.match(await page.textContent("#schaetzung"), /^Probe: \d+,\d\d s je Bild – das ganze Video dauert hier etwa /);
  // links das Original vergrössert, rechts das Netz: die beiden Hälften unterscheiden sich, die Bilder sind nicht leer
  const [links, rechts] = await page.evaluate(() => {
    const p = window.__hochrendern.probe, a = document.createElement("canvas"); a.width = 128; a.height = 96;
    const x = a.getContext("2d"); x.drawImage(p.vorher, 0, 0, 128, 96);
    const v = x.getImageData(0, 0, 128, 96).data, n = p.nachher.getContext("2d").getImageData(0, 0, 128, 96).data;
    let d = 0, hell = 0; for (let i = 0; i < v.length; i += 4) { d += Math.abs(v[i] - n[i]); hell += n[i]; }
    return [d / (v.length / 4), hell / (v.length / 4)];
  });
  assert.ok(links > 0.5 && rechts > 20, `Netz rechnet (Unterschied ${links.toFixed(2)}, Helligkeit ${rechts.toFixed(0)})`);
  await page.click("#lupe");
  assert.ok(await page.evaluate(() => document.getElementById("rahmen").classList.contains("eins")), "1 : 1");
  await page.click("#los");
  await page.waitForFunction(() => !document.getElementById("ergebnis").hidden || document.getElementById("meldung").classList.contains("fehler"), null, { timeout: 600_000 });
  assert.ok(await page.isVisible("#ergebnis"), await page.textContent("#meldung"));
  assert.match(await page.textContent("#film-info"), /^128 × 96 · 15 Bilder · [\d,]+ MB · VP9 \(vp09\.[\d.]+, \d+ Mbit\/s\) · mit Ton · gerechnet in /);
  const v = await herunterladen(page, "a.mp4");
  assert.deepEqual(v, { breite: 128, hoehe: 96, bilder: 15, codec: "vp9", ton: true, name: "klein-128x96.mp4" });
  assert.deepEqual(fehler, []); assert.deepEqual(fremd, []);
  await ctx.close();
});

await check("MP4 über WebCodecs: Hochformat ×4, ohne Ton; die Wahl bleibt gemerkt", async () => {
  const { ctx, page, fehler } = await oeffne();
  await page.click('[data-faktor="4"]'); await page.click('[data-modell="foto"]');
  await page.setInputFiles("#datei", fixture("klein.mp4"));
  await page.waitForFunction(() => window.__hochrendern.quelle && !document.getElementById("los").disabled, null, { timeout: 60_000 });
  assert.match(await info(page), /^48 × 64 · 0,4 s · 10 Bilder · 25 Bilder\/s · gelesen über WebCodecs/);
  await page.click("#los");
  await page.waitForFunction(() => !document.getElementById("ergebnis").hidden || document.getElementById("meldung").classList.contains("fehler"), null, { timeout: 900_000 });
  assert.ok(await page.isVisible("#ergebnis"), await page.textContent("#meldung"));
  const v = await herunterladen(page, "b.mp4");
  assert.deepEqual(v, { breite: 192, hoehe: 256, bilder: 10, codec: "vp9", ton: false, name: "klein-192x256.mp4" });
  await page.reload();
  assert.deepEqual(await page.evaluate(() => [...document.querySelectorAll('[aria-pressed="true"]')].map((b) => b.dataset.modell ?? b.dataset.faktor)), ["foto", "4"]);
  assert.deepEqual(fehler, []);
  await ctx.close();
});

await check("Grosses Video (1920 × 1080): ×4 gesperrt, ×2 gewählt (höchstens 4K)", async () => {
  const { ctx, page } = await oeffne();
  await page.click('[data-faktor="4"]');
  await page.setInputFiles("#datei", fixture("gross.webm"));
  await page.waitForFunction(() => window.__hochrendern.quelle && !document.getElementById("probe").disabled, null, { timeout: 60_000 });
  assert.ok(await page.isDisabled('[data-faktor="4"]'), "×4 gesperrt");
  assert.equal(await page.getAttribute('[data-faktor="2"]', "aria-pressed"), "true");
  assert.match(await page.textContent("#faktor-info"), /1920 × 1080 → 3840 × 2160 \(× 4 gäbe mehr als 4K\)/);
  await ctx.close();
});

await check("Schrift: eine Ebene anlegen, Schrift wählen, in der Vorschau ziehen; ×1 setzt sie ohne KI ins Video, wo sie hingezogen wurde; gemerkt", async () => {
  const { ctx, page, fehler, fremd } = await oeffne();
  await page.setInputFiles("#datei", fixture("flaeche.webm"));
  await page.waitForFunction(() => window.__hochrendern.quelle && !document.getElementById("probe").disabled, null, { timeout: 60_000 });
  assert.ok(await page.isHidden("#editor"), "ohne Ebene kein Editor");
  assert.ok(await page.evaluate(() => document.querySelectorAll("#s-schriften [data-schrift]").length) >= 20, "mindestens 20 Schriften");
  await page.click("#ebene-neu");
  assert.ok(await page.isVisible("#editor"));
  await page.fill("#s-text", "HALLO");
  await page.click('#s-schriften [data-schrift="Anton"]');
  await page.selectOption("#s-stil", "rein"); await page.selectOption("#s-auftritt", "keiner");
  await page.$eval("#s-farbe", (el) => { el.value = "#ff00ff"; el.dispatchEvent(new Event("input")); });
  await page.$eval("#s-groesse", (el) => { el.value = "0.25"; el.dispatchEvent(new Event("input")); });
  await page.waitForFunction(() => document.fonts.check('400 20px "Anton"'), null, { timeout: 30_000 });
  // die Ebene über dem Video zeigt die Schrift
  const magenta = (sel) => page.$eval(sel, (c) => { const d = c.getContext("2d").getImageData(0, 0, c.width, c.height).data; let n = 0; for (let i = 0; i < d.length; i += 4) if (d[i] > 180 && d[i + 1] < 90 && d[i + 2] > 180) n++; return n; });
  assert.ok(await page.isVisible("#schrift") && (await magenta("#schrift")) > 100, "Schrift in der Vorschau");
  // ziehen: von unten (y 0,82) nach oben (y 0,3)
  const box = await page.locator("#schrift").boundingBox();
  await page.mouse.move(box.x + box.width / 2, box.y + box.height * 0.82); await page.mouse.down();
  await page.mouse.move(box.x + box.width / 2, box.y + box.height * 0.5, { steps: 4 }); await page.mouse.move(box.x + box.width / 2, box.y + box.height * 0.3, { steps: 4 }); await page.mouse.up();
  const e = await page.evaluate(() => window.__hochrendern.ebenen[0]);
  assert.ok(Math.abs(e.y - 0.3) < 0.04 && Math.abs(e.x - 0.5) < 0.04, `gezogen (${e.x.toFixed(2)}, ${e.y.toFixed(2)})`);
  assert.deepEqual([e.text, e.schrift, e.farbe, e.stil], ["HALLO", "Anton", "#ff00ff", "rein"]);
  // ×1: nur Schrift, ohne KI
  await page.click('[data-faktor="1"]');
  assert.match(await page.textContent("#faktor-info"), /320 × 180, ohne KI – nur die Schrift kommt dazu/);
  await page.click("#probe");
  await page.waitForFunction(() => window.__hochrendern.probe?.ohneKi, null, { timeout: 60_000 });
  assert.ok((await magenta("#vergleich")) > 300, "die Probe zeigt die Schrift");
  await page.click("#los");
  await page.waitForFunction(() => !document.getElementById("ergebnis").hidden || document.getElementById("meldung").classList.contains("fehler"), null, { timeout: 300_000 });
  assert.ok(await page.isVisible("#ergebnis"), await page.textContent("#meldung"));
  assert.match(await page.textContent("#film-info"), /^320 × 180 · 30 Bilder · .* · 1 × Schrift · gerechnet in /);
  const v = await herunterladen(page, "c.mp4");
  assert.deepEqual([v.breite, v.hoehe, v.bilder], [320, 180, 30]);
  // im Video: Magenta oben in der Mitte, unten nichts
  const roh = execFileSync("ffmpeg", ["-v", "error", "-ss", "0.5", "-i", join(ordner, "c.mp4"), "-frames:v", "1", "-f", "rawvideo", "-pix_fmt", "rgb24", "-"]);
  let oben = 0, unten = 0;
  for (let i = 0; i < 320 * 180; i++) if (roh[3 * i] > 170 && roh[3 * i + 1] < 100 && roh[3 * i + 2] > 170) (Math.floor(i / 320) < 90 ? oben++ : unten++);
  assert.ok(oben > 400 && unten < 20, `Schrift oben im Video (${oben} oben, ${unten} unten)`);
  await page.reload();
  await page.waitForFunction(() => document.querySelectorAll("#ebenen button").length === 1);
  assert.equal(await page.textContent("#ebenen button"), "HALLO", "die Ebene ist gemerkt");
  assert.deepEqual(fehler, []); assert.deepEqual(fremd, []);
  await ctx.close();
});

await check("Handy: kein seitliches Scrollen", async () => {
  const ctx = await browser.newContext({ viewport: { width: 375, height: 800 }, isMobile: true, hasTouch: true });
  const page = await ctx.newPage();
  await page.goto(base);
  assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), "keine Breite über den Bildschirm");
  await ctx.close();
});

await browser.close();
server.close();
rmSync(ordner, { recursive: true, force: true });
const ok = ergebnisse.filter(Boolean).length;
console.log(`\n${ok}/${ergebnisse.length} bestanden`);
process.exit(ok === ergebnisse.length ? 0 : 1);
