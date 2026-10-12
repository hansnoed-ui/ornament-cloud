// «Principesse» (alpha/principesse/) – Browser-Tests (Playwright, Chromium): Beispiel malen lassen, Bilder des Films (leere Leinwand, Gemälde,
// funkelnder Glitzer, Foto mit Satz, Signet, leerer Schluss), Video über WebCodecs (Ersatz-Encoder, Chromium hat hier kein H.264), Standbild,
// Einstellungen, Handy ohne seitliches Scrollen, keine Anfragen nach aussen, als App installierbar und ohne Netz lauffähig.
//   NODE_PATH=$(npm root -g) node tests/principesse.e2e.mjs
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
const base = `http://localhost:${server.address().port}/alpha/principesse/`;
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
const bereit = (page) => page.waitForFunction(() => !document.getElementById("video").disabled && window.__principesse?.sz, null, { timeout: 90_000 });

/** Bild zur Zeit (Abschnitt + Versatz) messen: Anteil Grundfarbe, helle Funkenpunkte, Gold */
const messe = (page, abschnitt, plus = 0, extra = {}) => page.evaluate(async ([abschnitt, plus, extra]) => {
  const { bild, szene } = await import("./szene.js?v=1");
  const S = window.__principesse, sz = szene(S.gemaelde, S.funken, { ...S.optionen, ...extra });
  const c = document.createElement("canvas"); c.width = sz.breite; c.height = sz.hoehe; const x = c.getContext("2d");
  const ziel = abschnitt === "ende" ? sz.zeit.dauer - 0.05 : sz.zeit.ab[abschnitt][0] + plus;
  for (let t = 0; t < ziel; t += 0.5) bild(x, sz, t);
  bild(x, sz, ziel);
  const d = x.getImageData(0, 0, sz.breite, sz.hoehe).data, g = [0xf7, 0xf3, 0xec];
  let grund = 0, weiss = 0, gold = 0, dunkel = 0;
  for (let i = 0; i < d.length; i += 4) {
    if (Math.abs(d[i] - g[0]) < 3 && Math.abs(d[i + 1] - g[1]) < 3 && Math.abs(d[i + 2] - g[2]) < 3) grund++;
    if (d[i] > 245 && d[i + 1] > 245 && d[i + 2] > 245) weiss++;
    if (d[i] > 170 && d[i] < 230 && d[i + 1] > 125 && d[i + 1] < 185 && d[i + 2] < 90) gold++;
    if (d[i] < 70 && d[i + 1] < 70 && d[i + 2] < 70) dunkel++;
  }
  const n = d.length / 4;
  return { grund: grund / n, weiss, gold, dunkel: dunkel / n, dauer: sz.zeit.dauer };
}, [abschnitt, plus, extra]);

await check("Beispiel: wird nachgemalt, Glitzer gefunden, Vorschau läuft", async () => {
  const { ctx, page, fehler, fremd } = await oeffne();
  assert.equal(await page.isVisible(".ablage .plus svg"), true, "das grosse Plus");
  await page.click('[data-beispiel="meerjungfrau"]');
  await bereit(page);
  const text = await page.textContent("#auswertung");
  const striche = Number(text.match(/^([\d’']+) Pinselstriche/)[1].replace(/\D/g, ""));
  assert.ok(striche > 1500 && striche < 8000, text);   // wenige, ruhige Striche (drei Durchgänge)
  assert.match(text, /[\d’']+ Glitzerpunkte/);
  assert.equal(await page.textContent("#spielen"), "Anhalten");
  assert.deepEqual(fehler, []); assert.deepEqual(fremd, []);
  await ctx.close();
});

await check("Film: leere Leinwand, Gemälde deckt, Glitzer funkelt (und ist abschaltbar), Foto mit Satz, Signet mit goldener Krone, leerer Schluss", async () => {
  const { ctx, page, fehler } = await oeffne();
  await page.click('[data-beispiel="meerjungfrau"]');
  await bereit(page);
  // Foto und Satz dazu (das Foto: ein anderes Beispiel)
  await page.setInputFiles("#foto", { name: "foto.jpg", mimeType: "image/jpeg", buffer: readFileSync(new URL("alpha/principesse/beispiel-hund.jpg", root)) });
  await page.waitForFunction(() => window.__principesse.optionen?.foto);
  await page.fill("#satz", "Eine Krone für jeden Tag");
  await page.waitForFunction(() => window.__principesse.optionen?.text === "Eine Krone für jeden Tag");
  const leer = await messe(page, "vor", 0.2);
  assert.ok(leer.grund > 0.99, `leere Leinwand (${leer.grund})`);
  const halb = await messe(page, "malen", 1.0), voll = await messe(page, "stehen", 1.2);
  assert.ok(halb.grund < 0.6 && voll.grund < 0.01, `Gemälde deckt (${halb.grund} → ${voll.grund})`);
  const ohne = await messe(page, "stehen", 1.2, { glitzer: 0 });
  assert.ok(voll.weiss > ohne.weiss + 500, `Glitzer leuchtet (${ohne.weiss} → ${voll.weiss})`);
  const zweit = await messe(page, "zweitStehen", 2.5);
  assert.ok(zweit.grund < 0.05, "das Foto füllt das Bild");
  const signet = await messe(page, "signetStehen", 0.3);
  assert.ok(signet.grund > 0.8 && signet.gold > 500 && signet.dunkel > 0.002, `Signet (${JSON.stringify(signet)})`);
  const ende = await messe(page, "ende");
  assert.ok(ende.grund > 0.999, "am Schluss nur Grund");
  assert.deepEqual(fehler, []);
  await ctx.close();
});

await check("Einstellungen: Pinsel rechnet neu, Grund Nachtblau, Foto wieder weg; die Wahl bleibt", async () => {
  const { ctx, page, fehler } = await oeffne();
  await page.click('[data-beispiel="hund"]');
  await bereit(page);
  const vorher = await page.evaluate(() => window.__principesse.gemaelde.striche.length);
  await page.click('[data-pinsel="0.7"]');
  await page.waitForFunction((n) => window.__principesse.gemaelde.striche.length !== n, vorher, { timeout: 90_000 });
  assert.ok(await page.evaluate(() => window.__principesse.gemaelde.striche.length) > vorher, "feiner Pinsel, mehr Striche");
  await page.click('[data-farbe="dunkel"]');
  await page.waitForFunction(() => window.__principesse.optionen.farbe === "dunkel");
  assert.equal(await page.evaluate(() => document.querySelector(".rahmen").classList.contains("dunkel")), true);
  await page.reload();
  assert.equal(await page.getAttribute('[data-pinsel="0.7"]', "aria-pressed"), "true");
  assert.equal(await page.getAttribute('[data-farbe="dunkel"]', "aria-pressed"), "true");
  assert.deepEqual(fehler, []);
  await ctx.close();
});

await check("Video über WebCodecs (Ersatz-Encoder): MP4 mit allen Bildern im Format des Bilds; Standbild PNG", async () => {
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
  await page.click('[data-beispiel="fische"]');
  await bereit(page);
  const bilder = await page.evaluate(() => window.__principesse.sz.zeit.bilder);
  await page.click("#video");
  await page.waitForSelector("#ergebnis:not([hidden])", { timeout: 300_000 });
  const [dl] = await Promise.all([page.waitForEvent("download"), page.click("#laden")]);
  assert.match(dl.suggestedFilename(), /^principesse-\d{4}-\d\d-\d\d-\d{4}\.mp4$/);
  const d = new Uint8Array(readFileSync(await dl.path()));
  const finde = (liste, ...pfad) => pfad.reduce((l, t) => (Array.isArray(l) ? l : l.kinder).find((x) => x.typ === t), liste);
  const stsz = finde(kisten(d), "moov", "trak", "mdia", "minf", "stbl", "stsz");
  assert.equal(new DataView(d.buffer).getUint32(stsz.o + 16), bilder);
  assert.deepEqual(await page.evaluate(() => [window.__cfg.width, window.__cfg.height]), [1080, 1136]);
  const tkhd = finde(kisten(d), "moov", "trak", "tkhd"), v = new DataView(d.buffer);
  assert.deepEqual([v.getUint32(tkhd.o + tkhd.groesse - 8) >>> 16, v.getUint32(tkhd.o + tkhd.groesse - 4) >>> 16], [1080, 1136]);
  const [png] = await Promise.all([page.waitForEvent("download"), page.click("#png")]);
  const b = readFileSync(await png.path());
  assert.deepEqual([b.readUInt32BE(16), b.readUInt32BE(20)], [1080, 1136], "Standbild im Format des Bilds (Fische, fast quadratisch)");
  assert.deepEqual(fehler, []);
  await ctx.close();
});

await check("Format: wie das Bild (Standard), 3 : 4 und 1 : 1; Vorschau und Signet passen sich an, die Wahl bleibt", async () => {
  const { ctx, page, fehler } = await oeffne();
  await page.click('[data-beispiel="fische"]');
  await bereit(page);
  assert.equal(await page.getAttribute('[data-format="bild"]', "aria-pressed"), "true");
  assert.deepEqual(await page.evaluate(() => [window.__principesse.optionen.breite, window.__principesse.optionen.hoehe]), [1080, 1136]);
  await page.click('[data-format="1:1"]');
  await page.waitForFunction(() => window.__principesse.optionen?.hoehe === 1080, null, { timeout: 90_000 });
  assert.deepEqual(await page.evaluate(() => [document.getElementById("vorschau").width, document.getElementById("vorschau").height]), [540, 540]);   // Vorschau in halber Auflösung
  const box = await page.locator("#vorschau").boundingBox();
  assert.ok(Math.abs(box.width / box.height - 1) < 0.01, "Vorschau quadratisch");
  // das Signet passt auch ins Quadrat: Figur und Name im Bild, mit Rand
  const rand = await page.evaluate(async () => {
    const { bild, szene } = await import("./szene.js?v=1");
    const S = window.__principesse, sz = szene(S.gemaelde, S.funken, S.optionen);
    const c = document.createElement("canvas"); c.width = sz.breite; c.height = sz.hoehe; const x = c.getContext("2d");
    bild(x, sz, sz.zeit.ab.signetStehen[0] + 0.2);
    const d = x.getImageData(0, 0, sz.breite, sz.hoehe).data;
    let oben = sz.hoehe, unten = 0;
    for (let i = 0; i < d.length; i += 4) if (d[i] < 120 && d[i + 1] < 120) { const y = Math.floor(i / 4 / sz.breite); oben = Math.min(oben, y); unten = Math.max(unten, y); }
    return [oben, sz.hoehe - unten];
  });
  assert.ok(rand[0] > 40 && rand[1] > 40, `Signet mit Rand oben und unten (${rand})`);
  await page.reload();
  assert.equal(await page.getAttribute('[data-format="1:1"]', "aria-pressed"), "true", "bleibt gewählt");
  assert.deepEqual(fehler, []);
  await ctx.close();
});

await check("Handy: nichts ragt seitlich hinaus, Vorschau 3 : 4", async () => {
  const { ctx, page, fehler } = await oeffne({ viewport: { width: 360, height: 760 }, isMobile: true, hasTouch: true });
  await page.click('[data-beispiel="hund"]');
  await bereit(page);
  assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth));
  await page.click('[data-format="3:4"]');
  await page.waitForFunction(() => window.__principesse.optionen?.hoehe === 1440, null, { timeout: 90_000 });
  const box = await page.locator("#vorschau").boundingBox();
  assert.ok(Math.abs(box.width / box.height - 0.75) < 0.01);
  assert.ok(await page.evaluate(() => [...document.querySelectorAll(".segment button")].every((x) => x.scrollWidth <= x.clientWidth + 1)), "Beschriftungen auf einer Zeile");
  assert.deepEqual(fehler, []);
  await ctx.close();
});

await check("App (12. Oktober 2026): Knopf «Principesse als App installieren», Chrome meldet keine Hindernisse; nach dem ersten Besuch malt Principesse ohne Netz", async () => {
  const { ctx, page, fehler, fremd } = await oeffne();
  assert.ok(await page.locator("#installieren").isVisible(), "Knopf sichtbar (nicht in der installierten App)");
  await page.click("#installieren-knopf");
  assert.match(await page.locator("#installieren-hilfe").innerText(), /ohne Netz|Home-Bildschirm|installieren/);
  const scope = await page.evaluate(async () => (await navigator.serviceWorker.ready).scope);
  assert.match(scope, /\/alpha\/principesse\/$/);
  const cdp = await ctx.newCDPSession(page);
  assert.deepEqual((await cdp.send("Page.getInstallabilityErrors")).installabilityErrors, [], "Chrome meldet keine Hindernisse für die Installation");
  const manifest = await cdp.send("Page.getAppManifest");
  assert.deepEqual(manifest.errors, []);
  await page.reload(); await page.waitForFunction(() => navigator.serviceWorker.controller);
  const gespeichert = await page.evaluate(async () => (await (await caches.open("principesse-1")).keys()).map((r) => new URL(r.url).pathname + new URL(r.url).search));
  for (const d of ["/alpha/principesse/", "/alpha/principesse/beispiel-hund.jpg", "/alpha/principesse/icons/icon-512.png", "/vendor/fonts/inter-display-500-latin.woff2"])
    assert.ok(gespeichert.includes(d), `gespeichert: ${d}`);
  for (const m of ["app", "szene", "signet", "malen", "glitzer", "rechner", "pwa"]) assert.ok(gespeichert.some((d) => new RegExp(`^/alpha/principesse/${m}\\.js\\?v=\\d+$`).test(d)), `Modul ${m}.js mit Versionsmarke`);
  for (const m of ["sketchory/ablauf", "sketchory/mp4", "the-fictory/dauer"]) assert.ok(gespeichert.some((d) => d.startsWith(`/alpha/${m}.js?v=`)), `${m}.js`);
  // ohne Netz: die Seite kommt aus dem Speicher und malt
  await ctx.setOffline(true);
  await page.reload();
  await page.click('[data-beispiel="hund"]');
  await bereit(page);
  assert.ok((await page.evaluate(() => window.__principesse.gemaelde.striche.length)) > 1000, "ohne Netz gemalt");
  await page.waitForFunction(() => window.__principesse.klar, null, { timeout: 60_000 });
  await ctx.setOffline(false);
  assert.deepEqual(fehler.filter((f) => !/goatcounter|ERR_INTERNET_DISCONNECTED|Failed to load resource/.test(f)), []);
  assert.deepEqual(fremd, []);
  await ctx.close();
});

await browser.close();
server.close();
const fail = ergebnisse.filter((x) => !x).length;
console.log(`\n${ergebnisse.length - fail} ok, ${fail} fehlgeschlagen`);
process.exit(fail ? 1 : 0);
