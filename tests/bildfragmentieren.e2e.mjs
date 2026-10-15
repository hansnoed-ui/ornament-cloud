// «Bildfragmentieren» (alpha/bildfragmentieren/) – Browser-Tests (Playwright, Chromium): ein Testfoto zerlegen, Bilder des Films in den vier Phasen
// (Linien, Formen in Grau, Farben, das Foto), Abspann, Video über WebCodecs (Ersatz-Encoder, Chromium hat hier kein H.264), Standbild,
// Formate 4 : 5 und 9 : 16, Grund weiss, Handy ohne seitliches Scrollen, keine Anfragen nach aussen.
//   NODE_PATH=$(npm root -g) node tests/bildfragmentieren.e2e.mjs
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { join } from "node:path";
import { readFileSync } from "node:fs";

const require = createRequire(import.meta.url);
let playwright;
try { playwright = require("playwright"); } catch { playwright = require(join(process.env.NODE_PATH || "", "playwright")); }
const root = new URL("../", import.meta.url);
const { startServer } = await import(new URL("tools/serve-orma.mjs", root).href);
const { kisten } = await import(new URL("alpha/sketchory/mp4.js", root).href);
const server = await startServer(0);
const base = `http://localhost:${server.address().port}/alpha/bildfragmentieren/`;
const browser = await playwright.chromium.launch();
const ergebnisse = [];
async function check(name, fn) {
  try { await fn(); ergebnisse.push(true); console.log("ok  ", name); }
  catch (e) { ergebnisse.push(false); console.log("FAIL", name, "\n     ", e.message.split("\n").slice(0, 8).join("\n      ")); }
}
async function oeffne({ vorher = null, ...opts } = {}) {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 950 }, acceptDownloads: true, ...opts });
  const page = await ctx.newPage();
  const fehler = [], fremd = [];
  page.on("pageerror", (e) => fehler.push(e.message));
  page.on("console", (m) => { if (m.type() === "error") fehler.push(m.text()); });
  page.on("request", (r) => { const u = new URL(r.url()); if (!["localhost", "127.0.0.1"].includes(u.hostname) && u.protocol.startsWith("http")) fremd.push(r.url()); });
  if (vorher) await page.addInitScript(vorher);
  await page.goto(base);
  return { ctx, page, fehler, fremd };
}
// Testfoto, im Browser gezeichnet (unabhängig vom Testbild der Seite): blauer Himmel, eine gelbe Sonne, eine rote Fläche, grüne Wiese; quer (3 : 2)
const FOTO = await (async () => {
  const p = await (await browser.newContext()).newPage();
  const url = await p.evaluate(() => {
    const w = 1500, h = 1000, c = document.createElement("canvas"); c.width = w; c.height = h; const x = c.getContext("2d");
    x.fillStyle = "#2f5fb0"; x.fillRect(0, 0, w, h * 0.6);
    x.fillStyle = "#3c8a3a"; x.fillRect(0, h * 0.6, w, h * 0.4);
    x.fillStyle = "#ffd23f"; x.beginPath(); x.arc(w * 0.5, h * 0.3, 140, 0, 7); x.fill();
    x.fillStyle = "#d0302a"; x.fillRect(w * 0.35, h * 0.62, w * 0.3, h * 0.25);
    return c.toDataURL("image/jpeg", 0.92);
  });
  await p.context().close();
  return Buffer.from(url.split(",")[1], "base64");
})();
const laden = (page) => page.setInputFiles("#datei", { name: "foto.jpg", mimeType: "image/jpeg", buffer: FOTO });
const bereit = (page) => page.waitForFunction(() => !document.getElementById("video").disabled && window.__bildfragmentieren?.sz, null, { timeout: 90_000 });

/** ein Bild des Films zur Zeit (Abschnitt + Anteil der Dauer) messen: Anteil Grund, Anteil Grau, Anteil bunt, mittlere Farbe in der Mitte */
const messe = (page, abschnitt, anteil = 0, extra = {}) => page.evaluate(async ([abschnitt, anteil, extra]) => {
  const { bild, szene } = await import("./szene.js?v=3");
  const S = window.__bildfragmentieren, sz = szene(S.daten, { breite: S.mass[0], hoehe: S.mass[1], foto: S.foto, leinwand: (w, h) => new OffscreenCanvas(w, h), beschriftung: false, ...extra });
  const c = document.createElement("canvas"); c.width = sz.breite; c.height = sz.hoehe; const x = c.getContext("2d");
  const [a, b] = sz.zeit.ab[abschnitt], t = a + (b - a) * anteil;
  bild(x, sz, t);
  const d = x.getImageData(0, 0, sz.breite, sz.hoehe).data, g = sz.grund === "weiss" ? 255 : 0;
  let grund = 0, grau = 0, bunt = 0, n = 0;
  for (let i = 0; i < d.length; i += 16) {
    const r = d[i], gg = d[i + 1], bb = d[i + 2], max = Math.max(r, gg, bb), min = Math.min(r, gg, bb);
    n++;
    if (Math.abs(r - g) < 12 && Math.abs(gg - g) < 12 && Math.abs(bb - g) < 12) grund++;
    else if (max - min < 14) grau++;
    else bunt++;
  }
  // die Sonne (oben in der Mitte des Fotos): Farbe im Film
  const mx = Math.round(sz.breite / 2), my = Math.round(sz.hoehe * 0.3), j = (my * sz.breite + mx) * 4;
  return { grund: grund / n, grau: grau / n, bunt: bunt / n, sonne: [d[j], d[j + 1], d[j + 2]], t, dauer: sz.zeit.dauer };
}, [abschnitt, anteil, extra]);

await check("Testfoto: wird zerlegt, die Vorschau läuft, Zeilen, Kanten und Dreiecke stehen unter dem Bild; nichts von aussen", async () => {
  const { ctx, page, fehler, fremd } = await oeffne();
  assert.equal(await page.getAttribute('[data-format="4:5"]', "aria-pressed"), "true", "Standard 4 : 5");
  await laden(page);
  await bereit(page);
  assert.match(await page.textContent("#auswertung"), /\d+ Zeilen · \d+ Kanten · [\d’']+ Dreiecke/);
  assert.match(await page.textContent("#dauer"), /1080 × 1350/);
  assert.deepEqual(await page.evaluate(() => [document.getElementById("vorschau").width, document.getElementById("vorschau").height]), [540, 675], "Vorschau in halber Auflösung");
  await page.waitForTimeout(600);
  assert.ok(await page.evaluate(() => window.__bildfragmentieren.laeuft && window.__bildfragmentieren.t > 0), "die Vorschau läuft");
  // Zeitleiste und Sprung zu einer Phase
  await page.click("#zu-farben");
  assert.ok(await page.evaluate(() => { const S = window.__bildfragmentieren, [a, b] = S.sz.zeit.ab.farben; return !S.laeuft && S.t > a && S.t < b; }), "springt in die Farben und hält an");
  assert.match(await page.textContent("#zeitcode"), /^00:\d\d:\d\d$/);
  assert.deepEqual(fehler, []); assert.deepEqual(fremd, []);
  await ctx.close();
});

await check("Die vier Phasen: Linien auf Schwarz, Formen in Grau, dann Farben, am Ende das Foto; mit Abspann leerer Schluss", async () => {
  const { ctx, page, fehler } = await oeffne();
  await laden(page);
  await bereit(page);
  const linien = await messe(page, "linien", 0.8), formen = await messe(page, "formen", 0.95), farben = await messe(page, "farben", 0.98), bild = await messe(page, "stehen", 0.3);
  assert.ok(linien.grund > 0.6 && linien.bunt < 0.01, `Linien: weisse Linien auf Schwarz (${JSON.stringify(linien)})`);
  assert.ok(formen.grund < 0.05 && formen.grau > 0.8, `Formen: ein graues Mosaik füllt das Bild (${JSON.stringify(formen)})`);
  assert.ok(farben.bunt > 0.85, `Farben: bunt (${JSON.stringify(farben)})`);
  const [r, g, b] = farben.sonne;
  assert.ok(r > 200 && g > 160 && b < 120, `die Sonne ist gelb (${farben.sonne})`);
  const [r2, g2, b2] = bild.sonne;
  assert.ok(Math.abs(r2 - 255) < 20 && Math.abs(g2 - 210) < 25 && b2 < 90, `das Foto steht (${bild.sonne})`);
  assert.ok(bild.bunt > 0.95, "ganz das Foto, ohne Gitter");
  // beim Umklappen: Teile schon Foto, Teile noch Mosaik
  const um = await messe(page, "zusammen", 0.4);
  assert.ok(um.bunt > 0.6, `beim Umklappen bunt (${JSON.stringify(um)})`);
  const ende = await messe(page, "schluss", 0.5);
  assert.ok(ende.grund > 0.99, "am Ende leerer Grund");
  const signet = await messe(page, "signetStehen", 0.2);
  assert.ok(signet.grund > 0.9 && signet.grund < 0.999, "das Signet steht");
  // ohne Abspann endet der Film auf dem Foto
  const ohne = await messe(page, "schluss", 0.9, { signet: false });
  assert.ok(ohne.bunt > 0.95, "ohne Abspann: der letzte Augenblick ist das Foto");
  assert.ok(ohne.dauer < linien.dauer - 4, "ohne Abspann kürzer");
  // Grund weiss: Linien schwarz auf Weiss
  const weiss = await messe(page, "linien", 0.8, { grund: "weiss" });
  assert.ok(weiss.grund > 0.6 && weiss.bunt < 0.01, `weisser Grund (${JSON.stringify(weiss)})`);
  const weissBild = await messe(page, "stehen", 0.3, { grund: "weiss" });
  assert.deepEqual(weissBild.sonne.map((v) => Math.round(v / 30)), bild.sonne.map((v) => Math.round(v / 30)), "das Foto ist auf beiden Gründen dasselbe");
  assert.deepEqual(fehler, []);
  await ctx.close();
});

await check("Video über WebCodecs (Ersatz-Encoder): MP4 mit allen Bildern in 4 : 5; Standbild PNG an der Stelle der Zeitleiste", async () => {
  const ersatz = () => {
    window.VideoEncoder = class {
      static async isConfigSupported(cfg) { return { supported: cfg.codec === "avc1.640028", config: cfg }; }
      constructor({ output }) { this.output = output; this.encodeQueueSize = 0; this.n = 0; }
      configure(cfg) { window.__cfg = cfg; }
      encode(frame, { keyFrame }) {
        const daten = new Uint8Array(16).fill(this.n & 255);
        this.output({ type: keyFrame ? "key" : "delta", timestamp: frame.timestamp, byteLength: 16, copyTo: (z) => z.set(daten) },
          this.n++ ? {} : { decoderConfig: { description: new Uint8Array([1, 0x64, 0, 0x28, 0xff, 0xe1, 0, 1, 0x67, 1, 0, 1, 0x68]).buffer } });
      }
      async flush() {}
      close() {}
    };
  };
  const { ctx, page, fehler } = await oeffne({ vorher: ersatz });
  await laden(page);
  await bereit(page);
  const bilder = await page.evaluate(() => window.__bildfragmentieren.sz.zeit.bilder);
  await page.click("#video");
  await page.waitForSelector("#ergebnis:not([hidden])", { timeout: 300_000 });
  const [dl] = await Promise.all([page.waitForEvent("download"), page.click("#laden")]);
  assert.match(dl.suggestedFilename(), /^bildfragmentieren-\d{4}-\d\d-\d\d-\d{4}\.mp4$/);
  const d = new Uint8Array(readFileSync(await dl.path()));
  const finde = (liste, ...pfad) => pfad.reduce((l, t) => (Array.isArray(l) ? l : l.kinder).find((x) => x.typ === t), liste);
  const stsz = finde(kisten(d), "moov", "trak", "mdia", "minf", "stbl", "stsz");
  assert.equal(new DataView(d.buffer).getUint32(stsz.o + 16), bilder, "alle Bilder im Video");
  assert.deepEqual(await page.evaluate(() => [window.__cfg.width, window.__cfg.height]), [1080, 1350]);
  // Standbild: an der Stelle der Zeitleiste, in voller Grösse
  await page.click("#zu-formen");
  const [png] = await Promise.all([page.waitForEvent("download"), page.click("#png")]);
  const b = readFileSync(await png.path());
  assert.deepEqual([b.readUInt32BE(16), b.readUInt32BE(20)], [1080, 1350]);
  assert.deepEqual(fehler, []);
  await ctx.close();
});

await check("Formate: 9 : 16 und zurück zu 4 : 5; Vorschau und Signet passen sich an, die Wahl bleibt", async () => {
  const { ctx, page, fehler } = await oeffne();
  await laden(page);
  await bereit(page);
  for (const [format, mass] of [["9:16", [1080, 1920]], ["4:5", [1080, 1350]]]) {
    await page.click(`[data-format="${format}"]`);
    await page.waitForFunction((m) => window.__bildfragmentieren.sz?.breite === m[0] && window.__bildfragmentieren.sz?.hoehe === m[1] && !document.getElementById("video").disabled, mass, { timeout: 90_000 });
    const box = await page.locator("#vorschau").boundingBox();
    assert.ok(Math.abs(box.width / box.height - mass[0] / mass[1]) < 0.01, `${format}: Vorschau im Seitenverhältnis`);
    const bild = await messe(page, "stehen", 0.3);
    assert.ok(bild.bunt > 0.95, `${format}: das Foto füllt das Bild`);
    // das Signet steht in beiden Formaten in der Mitte und ganz im Bild
    {
      const mitte = await page.evaluate(async () => {
        const { bild, szene } = await import("./szene.js?v=3");
        const S = window.__bildfragmentieren, sz = szene(S.daten, { breite: S.mass[0], hoehe: S.mass[1], foto: S.foto, leinwand: (w, h) => new OffscreenCanvas(w, h) });
        const c = document.createElement("canvas"); c.width = sz.breite; c.height = sz.hoehe; const x = c.getContext("2d");
        bild(x, sz, sz.zeit.ab.signetStehen[0] + 0.2);
        const d = x.getImageData(0, 0, sz.breite, sz.hoehe).data;
        let l = sz.breite, r = 0, o = sz.hoehe, u = 0;
        for (let i = 0; i < d.length; i += 4) if (d[i] > 128) { const xx = (i / 4) % sz.breite, yy = Math.floor(i / 4 / sz.breite); l = Math.min(l, xx); r = Math.max(r, xx); o = Math.min(o, yy); u = Math.max(u, yy); }
        return [(l + r) / 2 / sz.breite, o, sz.hoehe - u];
      });
      assert.ok(Math.abs(mitte[0] - 0.5) < 0.03 && mitte[1] > 60 && mitte[2] > 60, `${format}: Signet in der Mitte, mit Rand oben und unten (${mitte})`);
    }
  }
  await page.click('[data-format="9:16"]');
  await page.reload();
  assert.equal(await page.getAttribute('[data-format="9:16"]', "aria-pressed"), "true", "bleibt gewählt");
  assert.deepEqual(fehler, []);
  await ctx.close();
});

await check("Handy: nichts ragt seitlich hinaus, Beschriftungen auf einer Zeile, Vorschau 4 : 5", async () => {
  const { ctx, page, fehler } = await oeffne({ viewport: { width: 360, height: 760 }, isMobile: true, hasTouch: true });
  await laden(page);
  await bereit(page);
  assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth));
  const box = await page.locator("#vorschau").boundingBox();
  assert.ok(Math.abs(box.width / box.height - 4 / 5) < 0.01);
  assert.ok(await page.evaluate(() => [...document.querySelectorAll(".segment button, .phasen button")].every((x) => x.scrollWidth <= x.clientWidth + 1)), "Beschriftungen auf einer Zeile");
  assert.deepEqual(fehler, []);
  await ctx.close();
});

await browser.close();
server.close();
const ok = ergebnisse.filter(Boolean).length;
console.log(`\n${ok}/${ergebnisse.length} bestanden`);
process.exit(ok === ergebnisse.length ? 0 : 1);
