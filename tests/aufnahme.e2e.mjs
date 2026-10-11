// «Aufnahme» (alpha/aufnahme/) – Browser-Tests (Playwright, Chromium) mit simulierter Bildschirmfreigabe (künstlicher, bewegter Bildschirm):
// Quelle wählen, Formate und Ausschnitt, Aufnahme auf beiden Wegen (Bild für Bild in Chrome/Edge und über die Leinwand),
// feste Dauer, Abbrechen im Vorlauf, Browser ohne Freigabe, Handy ohne seitliches Scrollen, keine Anfragen nach aussen.
//   NODE_PATH=$(npm root -g) node tests/aufnahme.e2e.mjs
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { join } from "node:path";

const require = createRequire(import.meta.url);
let playwright;
try { playwright = require("playwright"); } catch { playwright = require(join(process.env.NODE_PATH || "", "playwright")); }
const root = new URL("../", import.meta.url);
const { startServer } = await import(new URL("tools/serve-orma.mjs", root).href);
const server = await startServer(0);
const base = `http://localhost:${server.address().port}/alpha/aufnahme/`;
// simulierte Freigabe: ein künstlicher Bildschirm, ohne Rückfrage
const browser = await playwright.chromium.launch({ args: ["--use-fake-ui-for-media-stream", "--use-fake-device-for-media-stream"] });
const ergebnisse = [];
async function check(name, fn) {
  try { await fn(); ergebnisse.push(true); console.log("ok  ", name); }
  catch (e) { ergebnisse.push(false); console.log("FAIL", name, "\n     ", e.message.split("\n").slice(0, 8).join("\n      ")); }
}
async function oeffne({ vorher = null, ...opts } = {}) {
  const ctx = await browser.newContext({ viewport: { width: 1200, height: 900 }, acceptDownloads: true, ...opts });
  const page = await ctx.newPage();
  const fehler = [], fremd = [];
  page.on("pageerror", (e) => fehler.push(e.message));
  page.on("console", (m) => { if (m.type() === "error") fehler.push(m.text()); });
  page.on("request", (r) => { const u = new URL(r.url()); if (!["localhost", "127.0.0.1"].includes(u.hostname) && u.protocol.startsWith("http")) fremd.push(r.url()); });
  // die Seite bittet um einen Tab; simuliert wäre das der eigene, fast stillstehende Tab, der kaum Bilder liefert.
  // Nur mit Bildrate (ohne Wünsche zu Tab und Fenster) kommt der künstliche Bildschirm, der sich ständig bewegt – wie eine Animation.
  await page.addInitScript(() => {
    const echt = MediaDevices.prototype.getDisplayMedia;
    if (echt) MediaDevices.prototype.getDisplayMedia = function (o = {}) {
      window.__wunsch = o;
      return echt.call(this, { video: { frameRate: o.video?.frameRate }, audio: false });
    };
  });
  if (vorher) await page.addInitScript(vorher);
  await page.goto(base);
  return { ctx, page, fehler, fremd };
}
const text = (page, sel) => page.locator(sel).textContent();
/** freigeben; liefert die Grösse der Quelle (der künstliche Bildschirm richtet sich nach dem Fenster) */
async function freigeben(page) {
  await page.click("#quelle");
  await page.waitForSelector("#vorschau:not([hidden])");
  await page.waitForFunction(() => document.getElementById("masse").textContent.includes("×"));
  return page.evaluate(() => ({ b: document.getElementById("video").videoWidth, h: document.getElementById("video").videoHeight }));
}
const masse = async (page) => (await text(page, "#masse")).split(" × ").map(Number);
/** aufnehmen bis zum Ergebnis; liefert Grösse und Inhalt des Films */
async function aufnehmen(page, ms) {
  await page.click("#start");
  await page.waitForFunction(() => document.getElementById("start").textContent === "Stopp");
  if (ms) { await page.waitForTimeout(ms); await page.click("#start"); }
  await page.waitForSelector("#ergebnis:not([hidden])", { timeout: 20000 });
  return page.evaluate(async () => {
    const v = document.getElementById("film");
    if (!v.videoWidth) await new Promise((r) => v.addEventListener("loadeddata", r, { once: true }));
    v.currentTime = 0.5;
    await new Promise((r) => v.addEventListener("seeked", r, { once: true }));
    const blob = await (await fetch(v.src)).blob();
    const c = document.createElement("canvas"); c.width = 64; c.height = 64;
    const x = c.getContext("2d"); x.drawImage(v, 0, 0, 64, 64);
    const px = x.getImageData(0, 0, 64, 64).data;
    // Spanne je Farbkanal (der künstliche Bildschirm ist grün: Rot und Blau bleiben bei 0)
    const min = [255, 255, 255], max = [0, 0, 0];
    for (let i = 0; i < px.length; i += 4) for (let k = 0; k < 3; k++) { min[k] = Math.min(min[k], px[i + k]); max[k] = Math.max(max[k], px[i + k]); }
    const a = document.getElementById("laden");
    return { w: v.videoWidth, h: v.videoHeight, laenge: v.duration, groesse: blob.size, typ: blob.type, kontrast: Math.max(...max.map((m, k) => m - min[k])), datei: a.download, href: a.href, info: document.getElementById("film-info").textContent };
  });
}

await check("Vor der Freigabe: Schritte, leere Bühne, Aufnahme gesperrt, Dateiformat gewählt", async () => {
  const { ctx, page, fehler, fremd } = await oeffne();
  assert.equal(await page.locator("#leer").isVisible(), true);
  assert.equal(await page.locator("#start").isDisabled(), true);
  assert.equal(await page.locator("#kaputt").isHidden(), true);
  const formate = await page.locator("#datei option").allTextContents();
  assert.ok(formate.length >= 1 && formate.every((f) => /^(MP4|WebM)/.test(f)), formate.join());
  assert.equal(await page.locator(".schritte li").count(), 4);
  assert.deepEqual(fehler, []); assert.deepEqual(fremd, []);
  await ctx.close();
});

await check("Freigabe: Vorschau mit Ausschnitt über das ganze Bild, Angaben zum Video, Formate formen den Ausschnitt um", async () => {
  const { ctx, page, fehler } = await oeffne();
  const q = await freigeben(page);
  assert.ok(q.b > q.h && q.h >= 400, `Quelle ${q.b} × ${q.h}`);
  assert.equal(await text(page, "#masse"), `${q.b} × ${q.h}`, "anfangs das ganze Bild");
  const breit = 2 * Math.round((1080 * q.b) / q.h / 2);
  assert.match(await text(page, "#info"), new RegExp(`^Video: ${breit} × 1080 · `), "kurze Seite 1080");
  assert.match(await text(page, "#meldung"), /freigegeben/);
  const wunsch = await page.evaluate(() => ({ ...window.__wunsch, controller: !!window.__wunsch.controller }));
  assert.equal(wunsch.video.displaySurface, "browser", "die Seite bittet um einen Tab");
  assert.equal(wunsch.selfBrowserSurface, "exclude", "nicht sich selbst");
  assert.deepEqual(wunsch.video.frameRate, { ideal: 30, max: 30 });
  assert.equal(wunsch.audio, false);
  await page.click('[data-format="9:16"]');
  const [w916, h916] = await masse(page);
  assert.ok(h916 === q.h && Math.abs(w916 - (q.h * 9) / 16) <= 1, `9 : 16 über die ganze Höhe: ${w916} × ${h916}`);
  assert.match(await text(page, "#info"), /^Video: 1080 × 1920 · /, "9 : 16 in 1080 ergibt genau 1080 × 1920");
  await page.click('[data-format="1:1"]');
  assert.equal(await text(page, "#masse"), `${w916} × ${w916}`, "aus dem 9:16-Ausschnitt das grösste Quadrat");
  await page.click("#ganz");
  assert.equal(await text(page, "#masse"), `${q.h} × ${q.h}`, "Ganzes Bild: das grösste Quadrat im Bild");
  await page.selectOption("#groesse", "original");
  const gerade = 2 * Math.round(q.h / 2);
  assert.match(await text(page, "#info"), new RegExp(`^Video: ${gerade} × ${gerade} · `), "Grösse wie der Ausschnitt (gerade Zahl)");
  await page.click('[data-format="frei"]');
  await page.click("#ganz");
  assert.equal(await text(page, "#masse"), `${q.b} × ${q.h}`);
  assert.deepEqual(fehler, []);
  await ctx.close();
});

await check("Ausschnitt ziehen: neu aufziehen (Verhältnis bleibt), verschieben (bleibt im Bild), an einer Ecke ändern", async () => {
  const { ctx, page, fehler } = await oeffne();
  const q = await freigeben(page);
  await page.click('[data-format="16:9"]');
  await page.locator("#vorschau").evaluate((el) => el.scrollIntoView({ block: "center" }));
  const box = await page.locator("#vorschau").boundingBox();
  const s = box.width / q.b;
  // neu: von (100, 100) nach (500, 300) in Pixeln der Quelle
  await page.mouse.move(box.x + 100 * s, box.y + 100 * s);
  await page.mouse.down();
  await page.mouse.move(box.x + 300 * s, box.y + 200 * s, { steps: 4 });
  await page.mouse.move(box.x + 500 * s, box.y + 300 * s, { steps: 4 });
  await page.mouse.up();
  const [w, h] = await masse(page);
  assert.ok(Math.abs(w - 400) <= 3 && Math.abs(w / h - 16 / 9) < 0.02, `${w} × ${h}`);
  // verschieben weit über den Rand hinaus: bleibt ganz im Bild
  const r = await page.locator("#rahmen").boundingBox();
  await page.mouse.move(r.x + r.width / 2, r.y + r.height / 2);
  await page.mouse.down();
  await page.mouse.move(r.x + r.width / 2 + 2000, r.y + r.height / 2 + 2000, { steps: 5 });
  await page.mouse.up();
  const nach = await page.locator("#rahmen").boundingBox();
  assert.ok(Math.abs(nach.x + nach.width - (box.x + box.width)) < 2 && Math.abs(nach.y + nach.height - (box.y + box.height)) < 2, "unten rechts am Rand");
  assert.equal(await text(page, "#masse"), `${w} × ${h}`, "Grösse bleibt beim Schieben");
  // Ecke oben links ziehen: unten rechts bleibt stehen, Verhältnis bleibt
  const ecke = await page.locator('[data-ecke="nw"]').boundingBox();
  await page.mouse.move(ecke.x + ecke.width / 2, ecke.y + ecke.height / 2);
  await page.mouse.down();
  await page.mouse.move(ecke.x - 200 * s, ecke.y - 200 * s, { steps: 5 });
  await page.mouse.up();
  const [w2, h2] = await masse(page);
  const nach2 = await page.locator("#rahmen").boundingBox();
  assert.ok(w2 > w && Math.abs(w2 / h2 - 16 / 9) < 0.02, `${w2} × ${h2}`);
  assert.ok(Math.abs(nach2.x + nach2.width - (box.x + box.width)) < 2, "die gegenüberliegende Ecke blieb stehen");
  // ein Klick ohne Bewegung neben dem Rahmen lässt den Ausschnitt, wie er ist
  await page.mouse.click(box.x + 5, box.y + 5);
  assert.equal(await text(page, "#masse"), `${w2} × ${h2}`);
  assert.deepEqual(fehler, []);
  await ctx.close();
});

await check("Aufnahme Bild für Bild (Chrome, Edge): 9 : 16 in 1080 ergibt ein Video von 1080 × 1920 mit Inhalt", async () => {
  const { ctx, page, fehler } = await oeffne();
  await freigeben(page);
  await page.click('[data-format="9:16"]');
  await page.uncheck("#vorlauf");
  const f = await aufnehmen(page, 2500);
  assert.equal(`${f.w} × ${f.h}`, "1080 × 1920");
  assert.ok(f.groesse > 10000, `Grösse ${f.groesse}`);
  assert.ok(f.kontrast > 20, `das Bild ist nicht leer (Spanne ${f.kontrast})`);
  assert.match(f.datei, /^aufnahme-\d{4}-\d{2}-\d{2}-\d{4}\.(mp4|webm)$/);
  assert.match(f.href, /^blob:/);
  assert.match(f.info, /^1080 × 1920 · 0:0[23] · \d+\.\d MB · /);
  assert.ok(f.laenge > 2 && f.laenge < 4, `Länge steht in der Datei (${f.laenge} s)`);
  assert.equal(await page.locator("#start").textContent(), "Aufnahme starten");
  assert.equal(await page.locator('[data-format="1:1"]').isDisabled(), false, "nach der Aufnahme wieder frei");
  const download = page.waitForEvent("download");
  await page.click("#laden");
  assert.match((await download).suggestedFilename(), /^aufnahme-.*\.(mp4|webm)$/);
  await page.click("#verwerfen");
  assert.equal(await page.locator("#ergebnis").isHidden(), true);
  assert.deepEqual(fehler, []);
  await ctx.close();
});

await check("Aufnahme über die Leinwand (Firefox, Safari), mit fester Dauer von 5 Sekunden: hält von selbst an", async () => {
  const { ctx, page, fehler } = await oeffne({ vorher: () => { delete window.MediaStreamTrackProcessor; delete window.MediaStreamTrackGenerator; } });
  await freigeben(page);
  await page.click('[data-format="1:1"]');
  await page.selectOption("#groesse", "720");
  await page.selectOption("#dauer", "5");
  await page.uncheck("#vorlauf");
  assert.equal(await page.evaluate(() => "MediaStreamTrackProcessor" in window), false);
  const f = await aufnehmen(page, 0);
  assert.equal(`${f.w} × ${f.h}`, "720 × 720");
  assert.ok(f.kontrast > 20, "das Bild ist nicht leer");
  assert.match(f.info, /· 0:0[56] · /);
  assert.ok(f.laenge > 4.5 && f.laenge < 6.5, `Länge steht in der Datei (${f.laenge} s)`);
  assert.match(await text(page, "#meldung"), /Fertig/);
  assert.deepEqual(fehler, []);
  await ctx.close();
});

await check("Vorlauf: zählt 3, 2, 1; Abbrechen im Vorlauf nimmt nichts auf", async () => {
  const { ctx, page, fehler } = await oeffne();
  await freigeben(page);
  await page.click("#start");
  assert.equal(await text(page, "#zaehler"), "3");
  assert.equal(await text(page, "#start"), "Abbrechen");
  assert.equal(await page.locator("#groesse").isDisabled(), true, "Einstellungen gesperrt");
  await page.waitForTimeout(1200);
  assert.equal(await text(page, "#zaehler"), "2");
  await page.click("#start");
  await page.waitForTimeout(2200);
  assert.equal(await text(page, "#start"), "Aufnahme starten");
  assert.equal(await page.locator("#zaehler").isHidden(), true);
  assert.equal(await page.locator("#ergebnis").isHidden(), true);
  assert.equal(await page.locator("#groesse").isDisabled(), false);
  assert.deepEqual(fehler, []);
  await ctx.close();
});

await check("Freigabe beenden während der Aufnahme: das bisher Aufgenommene bleibt, die Bühne ist wieder leer", async () => {
  const { ctx, page, fehler } = await oeffne();
  await freigeben(page);
  await page.uncheck("#vorlauf");
  await page.click("#start");
  await page.waitForFunction(() => document.getElementById("start").textContent === "Stopp");
  await page.waitForTimeout(1500);
  await page.click("#beenden");
  await page.waitForSelector("#ergebnis:not([hidden])");
  assert.equal(await page.locator("#leer").isVisible(), true);
  assert.equal(await page.locator("#start").isDisabled(), true);
  assert.equal(await page.locator("#quelle").isDisabled(), false);
  assert.deepEqual(fehler, []);
  await ctx.close();
});

await check("Browser ohne Freigabe (z. B. Handy): Hinweis statt Knopf", async () => {
  const { ctx, page, fehler } = await oeffne({ vorher: () => { delete MediaDevices.prototype.getDisplayMedia; } });
  assert.equal(await page.locator("#kaputt").isVisible(), true);
  assert.equal(await page.locator("#quelle").isDisabled(), true);
  assert.deepEqual(fehler, []);
  await ctx.close();
});

await check("Handy (390 px): nichts ragt seitlich hinaus", async () => {
  const { ctx, page, fehler } = await oeffne({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), "kein seitliches Scrollen");
  await freigeben(page);
  assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), "auch mit Vorschau");
  assert.deepEqual(fehler, []);
  await ctx.close();
});

await browser.close();
server.close();
const fehlgeschlagen = ergebnisse.filter((x) => !x).length;
console.log(`\n${ergebnisse.length - fehlgeschlagen} von ${ergebnisse.length} bestanden`);
process.exit(fehlgeschlagen ? 1 : 0);
