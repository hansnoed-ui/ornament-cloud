// «Sketchory» (alpha/sketchory/) – Browser-Tests (Playwright, Chromium): Beispielkarte lesen, umgekehrtes Bild (dunkle Linien auf hellem Papier)
// gibt dieselbe Zeichnung, Bilder des Films (schwarz, gezeichnet, Satz, Signet), Video über WebCodecs (hier mit einem Ersatz-Encoder, weil
// Chromium ohne H.264 kommt; geprüft wird der Weg bis zur MP4-Datei) und in Echtzeit über MediaRecorder, Standbild, Handy ohne seitliches Scrollen,
// keine Anfragen nach aussen.
//   NODE_PATH=$(npm root -g) node tests/sketchory.e2e.mjs        (mit SCHNELL=1 ohne die Aufnahme in Echtzeit, gut 20 Sekunden)
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
const base = `http://localhost:${server.address().port}/alpha/sketchory/`;
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
const bereit = (page) => page.waitForFunction(() => !document.getElementById("video").disabled && window.__sketchory?.sz, null, { timeout: 60_000 });

/** Anteil heller Pixel und ob Rot-Orange vorkommt, im Bild zur Zeit t (dieselbe Zeichenfunktion wie Vorschau und Video) */
const messeBild = (page, t) => page.evaluate(async (t) => {
  const { bild, szene } = await import("./szene.js?v=8");
  const S = window.__sketchory;
  const c = document.createElement("canvas"); c.width = 1080; c.height = 1440;
  const ctx = c.getContext("2d");
  const sz = szene(S.ergebnis, S.optionen);
  const zeit = typeof t === "string" ? sz.zeit.ab[t][0] + 0.05 : t;
  // vorwärts bis zur Zeit (die Ebene wächst nur vorwärts)
  for (let x = 0; x < zeit; x += 0.5) bild(ctx, sz, x);
  bild(ctx, sz, zeit);
  const d = ctx.getImageData(0, 0, 1080, 1440).data;
  let hell = 0, orange = 0, sonst = 0;
  for (let i = 0; i < d.length; i += 4) {
    if (d[i] > 200 && d[i + 1] > 200 && d[i + 2] > 200) hell++;
    else if (d[i] > 200 && d[i + 1] > 100 && d[i + 1] < 160 && d[i + 2] < 120) orange++;
    else if (d[i] > 40 || d[i + 1] > 40 || d[i + 2] > 40) sonst++;
  }
  return { hell: hell / (d.length / 4), orange, sonst: sonst / (d.length / 4), dauer: sz.zeit.dauer };
}, t);

await check("Beispielkarte: Linien gefunden, Vorschau läuft, Knöpfe frei", async () => {
  const { ctx, page, fehler, fremd } = await oeffne();
  assert.equal(await page.isDisabled("#video"), true, "vor dem Bild gesperrt");
  assert.equal(await page.isVisible(".ablage .plus svg"), true, "das grosse Plus");
  assert.ok((await page.locator(".plus").boundingBox()).width >= 80, "gross");
  await page.fill("#satz", "Wer zeichnet, denkt mit der Hand.");
  await page.click("#beispiel");
  await bereit(page);
  const text = await page.textContent("#auswertung");
  const n = Number(text.match(/^(\d+) Striche/)[1]);
  assert.ok(n > 60 && n < 400, text);
  assert.match(text, /Flächen/);
  assert.match(text, /helle Linien auf dunklem Grund/);
  assert.match(await page.textContent("#dauer"), /^\d+,\d s · 1080 × 1440 · 30 Bilder\/s$/);
  assert.equal(await page.inputValue("#schrift"), "grotesk", "Satz standardmässig in der Grotesk");
  assert.equal(await page.evaluate(() => document.fonts.check('600 68px "Inter Display"')), true, "Inter Display SemiBold geladen");
  assert.equal(await page.textContent("#spielen"), "Anhalten", "die Vorschau läuft");
  assert.equal(await page.isHidden("#leer"), true);
  await page.waitForTimeout(3500);
  const hell = await page.evaluate(() => {
    const c = document.getElementById("vorschau"), d = c.getContext("2d").getImageData(0, 0, c.width, c.height).data;
    let n = 0; for (let i = 0; i < d.length; i += 4) if (d[i] > 200) n++;
    return n / (d.length / 4);
  });
  assert.ok(hell > 0.01, `nach 3,5 s ist schon gezeichnet (${hell})`);
  assert.deepEqual(fehler, []); assert.deepEqual(fremd, []);
  await ctx.close();
});

await check("Bilder des Films: schwarz am Anfang, Zeichnung, Satz, Signet mit dem Punkt in Rot-Orange; nur Schwarz und Weiss", async () => {
  const { ctx, page, fehler } = await oeffne();
  await page.fill("#satz", "Wer zeichnet, denkt mit der Hand.");
  await page.click("#beispiel");
  await bereit(page);
  const anfang = await messeBild(page, 0.2);
  assert.equal(anfang.hell, 0, "schwarz");
  const halb = await messeBild(page, 2.6);
  const ganz = await messeBild(page, "stehen");
  assert.ok(halb.hell > 0.005 && halb.hell < ganz.hell * 0.9, `wächst: ${halb.hell} → ${ganz.hell}`);
  assert.ok(ganz.hell > 0.03 && ganz.hell < 0.4, `fertige Zeichnung ${ganz.hell}`);
  assert.ok(ganz.sonst < 0.02, `fast nur Schwarz und Weiss (${ganz.sonst})`);
  const satz = await messeBild(page, "textStehen");
  assert.ok(satz.hell > 0.002 && satz.hell < 0.05, `Satz ${satz.hell}`);
  assert.ok(satz.orange > 30, `oranger Punkt am Satzende (${satz.orange})`);
  const anfang2 = await page.evaluate(() => window.__sketchory.sz.zeit.ab.textEin[0] + 0.35);
  const frueh = await messeBild(page, anfang2);
  assert.ok(frueh.hell > 0 && frueh.hell < satz.hell * 0.3, `Buchstabe um Buchstabe: erst wenige (${frueh.hell} von ${satz.hell})`);
  assert.equal(frueh.orange, 0, "der Punkt kommt zuletzt");
  const signet = await messeBild(page, "signetStehen");
  assert.ok(signet.orange > 150, `Punkt in Rot-Orange (${signet.orange})`);
  assert.ok(signet.hell > 0.001);
  const ende = await messeBild(page, satz.dauer - 0.05);
  assert.equal(ende.hell + ende.orange + ende.sonst, 0, "am Schluss ist das Signet ausgeblendet, nur noch Grund");
  assert.deepEqual(fehler, []);
  await ctx.close();
});

await check("Dunkle Linien auf hellem Papier (umgekehrtes Foto mit Verlauf): dieselbe Zeichnung, weiss auf schwarz", async () => {
  const { ctx, page, fehler } = await oeffne();
  await page.click("#beispiel");
  await bereit(page);
  const vorher = Number((await page.textContent("#auswertung")).match(/^(\d+)/)[1]);
  const b64 = await page.evaluate(async () => {
    const img = await createImageBitmap(await (await fetch("beispiel.jpg")).blob());
    const c = new OffscreenCanvas(img.width, img.height), x = c.getContext("2d");
    x.drawImage(img, 0, 0);
    const d = x.getImageData(0, 0, c.width, c.height);
    // umkehren und einen Schatten über das Papier legen, wie bei einem Handyfoto
    for (let i = 0; i < d.data.length; i += 4) {
      const p = i / 4, sx = (p % c.width) / c.width, schatten = 1 - 0.25 * sx;
      for (let k = 0; k < 3; k++) d.data[i + k] = (255 - d.data[i + k]) * schatten;
    }
    x.putImageData(d, 0, 0);
    const blob = await c.convertToBlob({ type: "image/jpeg", quality: 0.9 });
    const b = new Uint8Array(await blob.arrayBuffer());
    let s = ""; for (let i = 0; i < b.length; i += 0x8000) s += String.fromCharCode(...b.subarray(i, i + 0x8000));
    return btoa(s);
  });
  await page.setInputFiles("#datei", { name: "papier.jpg", mimeType: "image/jpeg", buffer: Buffer.from(b64, "base64") });
  await page.waitForFunction(() => /umgekehrt/.test(document.getElementById("auswertung").textContent), null, { timeout: 60_000 });
  const text = await page.textContent("#auswertung");
  const nachher = Number(text.match(/^(\d+)/)[1]);
  assert.ok(Math.abs(nachher - vorher) <= vorher * 0.15, `${vorher} → ${nachher}`);
  assert.match(text, /dunkle Linien auf hellem Grund, umgekehrt/);
  assert.equal(await page.isVisible("#quelle"), true, "das geladene Bild als kleine Vorschau");
  assert.equal(await page.textContent("#ablage-titel"), "Anderes Bild wählen");
  assert.deepEqual(fehler, []);
  await ctx.close();
});

await check("Video über WebCodecs (Ersatz-Encoder): MP4 mit allen Bildern des Films, herunterladbar", async () => {
  // Ersatz für VideoEncoder: liefert für jedes Bild ein kleines Stück und beim ersten eine Beschreibung (avcC)
  const ersatz = () => {
    window.VideoEncoder = class {
      static async isConfigSupported(cfg) { return { supported: cfg.codec === "avc1.640028", config: cfg }; }
      constructor({ output }) { this.output = output; this.encodeQueueSize = 0; this.n = 0; }
      configure(cfg) { window.__cfg = cfg; }
      encode(frame, { keyFrame }) {
        if (frame.codedWidth !== 1080 || frame.codedHeight !== 1440) throw new Error("falsche Grösse");
        const daten = new Uint8Array(20 + (this.n % 7)).fill(this.n & 255);
        const chunk = { type: keyFrame ? "key" : "delta", timestamp: frame.timestamp, byteLength: daten.length, copyTo: (z) => z.set(daten) };
        this.output(chunk, this.n++ ? {} : { decoderConfig: { description: new Uint8Array([1, 0x64, 0, 0x28, 0xff, 0xe1, 0, 1, 0x67, 1, 0, 1, 0x68]).buffer } });
      }
      async flush() {}
      close() {}
    };
  };
  const { ctx, page, fehler } = await oeffne({ vorher: ersatz });
  await page.fill("#satz", "Ein Satz.");
  await page.click("#beispiel");
  await bereit(page);
  const bilder = await page.evaluate(() => window.__sketchory.sz.zeit.bilder);
  await page.click("#video");
  await page.waitForSelector("#ergebnis:not([hidden])", { timeout: 120_000 });
  assert.match(await page.textContent("#film-info"), /^1080 × 1440 · \d+,\d s · [\d,]+ MB · MP4 \(H\.264, avc1\.640028\)/);
  const [dl] = await Promise.all([page.waitForEvent("download"), page.click("#laden")]);
  assert.match(dl.suggestedFilename(), /^sketchory-\d{4}-\d\d-\d\d-\d{4}\.mp4$/);
  const d = new Uint8Array(readFileSync(await dl.path()));
  const k = kisten(d);
  assert.deepEqual(k.map((x) => x.typ), ["ftyp", "moov", "mdat"]);
  const finde = (liste, ...pfad) => pfad.reduce((l, t) => (Array.isArray(l) ? l : l.kinder).find((x) => x.typ === t), liste);
  const stsz = finde(k, "moov", "trak", "mdia", "minf", "stbl", "stsz");
  assert.equal(new DataView(d.buffer).getUint32(stsz.o + 16), bilder, "alle Bilder im Video");
  assert.equal((await page.evaluate(() => window.__cfg)).latencyMode, "quality");
  assert.deepEqual(fehler, []);
  await ctx.close();
});

if (!process.env.SCHNELL) await check("Video in Echtzeit (ohne H.264-Encoder, wie Chromium hier): Datei mit der Länge des Films", async () => {
  const { ctx, page, fehler } = await oeffne();
  await page.click("#beispiel");
  await bereit(page);
  const dauer = await page.evaluate(() => window.__sketchory.sz.zeit.dauer);
  await page.click("#video");
  await page.waitForSelector("#ergebnis:not([hidden])", { timeout: 120_000 });
  const info = await page.textContent("#film-info");
  assert.match(info, /video\/(mp4|webm)/);
  const laenge = await page.evaluate(() => new Promise((ok) => { const v = document.getElementById("film"); if (v.readyState >= 1) ok(v.duration); else v.onloadedmetadata = () => ok(v.duration); }));
  assert.ok(Math.abs(laenge - dauer) < 1.5, `Länge ${laenge} statt ${dauer}`);
  assert.deepEqual(fehler, []);
  await ctx.close();
});

await check("Strichstärke: sichtbar ohne «Feinheiten», wirkt sofort auf die Vorschau, − und + und Voreinstellungen, bleibt für die nächste Karte", async () => {
  const { ctx, page, fehler } = await oeffne();
  await page.click("#beispiel");
  await bereit(page);
  assert.equal(await page.isVisible("#staerke"), true, "der Regler ist ohne Aufklappen sichtbar");
  const hell = () => page.evaluate(() => {
    const c = document.getElementById("vorschau"), d = c.getContext("2d").getImageData(0, 0, c.width, c.height).data;
    let n = 0; for (let i = 0; i < d.length; i += 4) if (d[i] > 200) n++;
    return n / (d.length / 4);
  });
  const stellen = async (v) => { await page.locator("#staerke").fill(String(v)); await page.waitForFunction((v) => window.__sketchory.optionen.staerke === v / 100, v); await page.waitForTimeout(100); };
  await stellen(100);
  assert.equal(await page.textContent("#spielen"), "Abspielen", "beim Einstellen steht die Vorschau");
  const normal = await hell();
  await stellen(250);
  const dick = await hell();
  await stellen(40);
  const fein = await hell();
  assert.ok(dick > normal * 1.6 && fein < normal * 0.7, `fein ${fein} < normal ${normal} < dick ${dick}`);
  assert.equal(await page.textContent("#staerke-wert"), "40 %");
  assert.match(await page.textContent("#linie"), /^Linie im Video etwa \d+,\d px breit/);
  await page.click("#dicker");
  assert.equal(await page.textContent("#staerke-wert"), "50 %");
  await page.click("#duenner"); await page.click("#duenner"); await page.click("#duenner");
  assert.equal(await page.textContent("#staerke-wert"), "30 %", "nicht unter 30 %");
  await page.click('[data-staerke="160"]');
  assert.equal(await page.getAttribute('[data-staerke="160"]', "aria-pressed"), "true");
  await page.click("details.feinheiten summary");   // die Art der Breite steht in den Feinheiten
  await page.selectOption("#stil", "gleichmaessig");
  await page.waitForFunction(() => window.__sketchory.optionen.stil === "gleichmaessig" && window.__sketchory.optionen.staerke === 1.6);
  // dieselbe Einstellung im Video: die Szene des Exports nimmt die Optionen der Seite
  assert.equal(await page.evaluate(() => window.__sketchory.sz.linie > 0), true);
  // neu laden: die Einstellung ist noch da
  await page.reload();
  assert.equal(await page.inputValue("#staerke"), "160");
  assert.equal(await page.inputValue("#stil"), "gleichmaessig");
  assert.equal(await page.textContent("#staerke-wert"), "160 %");
  assert.deepEqual(fehler, []);
  await ctx.close();
});

await check("Schwarz auf Weiss: ganzer Film umgekehrt (Grund, Zeichnung, Satz, Signet mit Punkt im Rot-Orange der Website), Vorschau, Standbild, gemerkt", async () => {
  const { ctx, page, fehler } = await oeffne();
  await page.fill("#satz", "Wer zeichnet, denkt mit der Hand.");
  await page.click("#beispiel");
  await bereit(page);
  assert.equal(await page.getAttribute('[data-farbe="dunkel"]', "aria-pressed"), "true", "Standard: weiss auf Schwarz");
  await page.click('[data-farbe="hell"]');
  await page.waitForFunction(() => window.__sketchory.optionen.farbe === "hell");
  assert.equal(await page.getAttribute('[data-farbe="hell"]', "aria-pressed"), "true");
  assert.equal(await page.evaluate(() => document.querySelector(".rahmen").classList.contains("hell")), true);
  const zaehle = (t) => page.evaluate(async (t) => {
    const { bild, szene } = await import("./szene.js?v=8");
    const S = window.__sketchory, sz = szene(S.ergebnis, S.optionen);
    const c = document.createElement("canvas"); c.width = 1080; c.height = 1440;
    const x = c.getContext("2d"), zeit = sz.zeit.ab[t][0] + 0.05;
    for (let u = 0; u < zeit; u += 0.5) bild(x, sz, u);
    bild(x, sz, zeit);
    const d = x.getImageData(0, 0, 1080, 1440).data;
    let weiss = 0, schwarz = 0, orange = 0;
    for (let i = 0; i < d.length; i += 4) {
      if (d[i] > 235 && d[i + 1] > 235 && d[i + 2] > 235) weiss++;
      else if (d[i] < 40 && d[i + 1] < 40 && d[i + 2] < 40) schwarz++;
      else if (d[i] > 160 && d[i + 1] > 40 && d[i + 1] < 100 && d[i + 2] < 60) orange++;
    }
    const n = d.length / 4;
    return { weiss: weiss / n, schwarz: schwarz / n, orange };
  }, t);
  const zeichnung = await zaehle("stehen");
  assert.ok(zeichnung.weiss > 0.6 && zeichnung.schwarz > 0.03 && zeichnung.schwarz < 0.4, JSON.stringify(zeichnung));
  const satz = await zaehle("textStehen");
  assert.ok(satz.weiss > 0.9 && satz.schwarz > 0.002, JSON.stringify(satz));
  const signet = await zaehle("signetStehen");
  assert.ok(signet.weiss > 0.9 && signet.orange > 150 && signet.schwarz > 0.001, JSON.stringify(signet));
  // Vorschau zeigt die fertige Zeichnung schwarz auf Weiss
  const ecke = await page.evaluate(() => [...document.getElementById("vorschau").getContext("2d").getImageData(5, 5, 1, 1).data].slice(0, 3));
  assert.deepEqual(ecke, [255, 255, 255]);
  // Standbild ebenso
  const [dl] = await Promise.all([page.waitForEvent("download"), page.click("#png")]);
  const png = await page.evaluate(async (b64) => {
    const img = await createImageBitmap(new Blob([Uint8Array.from(atob(b64), (c) => c.charCodeAt(0))], { type: "image/png" }));
    const c = new OffscreenCanvas(img.width, img.height), x = c.getContext("2d"); x.drawImage(img, 0, 0);
    return [...x.getImageData(3, 3, 1, 1).data].slice(0, 3);
  }, readFileSync(await dl.path()).toString("base64"));
  assert.deepEqual(png, [255, 255, 255]);
  await page.reload();
  assert.equal(await page.getAttribute('[data-farbe="hell"]', "aria-pressed"), "true", "bleibt für die nächste Karte");
  assert.deepEqual(fehler, []);
  await ctx.close();
});

await check("Standbild: PNG 1080 × 1440; ohne Satz ist der Film kürzer", async () => {
  const { ctx, page, fehler } = await oeffne();
  await page.fill("#satz", "Mit einem Satz, der ein wenig länger ist als nötig.");
  await page.click("#beispiel");
  await bereit(page);
  const mit = await page.evaluate(() => window.__sketchory.sz.zeit.dauer);
  await page.fill("#satz", "");
  await page.waitForFunction((d) => window.__sketchory.sz.zeit.dauer < d, mit);
  const [dl] = await Promise.all([page.waitForEvent("download"), page.click("#png")]);
  const d = readFileSync(await dl.path());
  assert.deepEqual([...d.subarray(1, 4)].map((c) => String.fromCharCode(c)).join(""), "PNG");
  assert.deepEqual([d.readUInt32BE(16), d.readUInt32BE(20)], [1080, 1440]);
  assert.deepEqual(fehler, []);
  await ctx.close();
});

await check("Handy: nichts ragt seitlich hinaus, Vorschau im Hochformat 3 : 4", async () => {
  const { ctx, page, fehler } = await oeffne({ viewport: { width: 375, height: 760 }, isMobile: true, hasTouch: true });
  await page.click("#beispiel");
  await bereit(page);
  assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), "kein seitliches Scrollen");
  const box = await page.locator("#vorschau").boundingBox();
  assert.ok(Math.abs(box.width / box.height - 0.75) < 0.01, `${box.width} × ${box.height}`);
  assert.deepEqual(fehler, []);
  await ctx.close();
});

await browser.close();
server.close();
const fail = ergebnisse.filter((x) => !x).length;
console.log(`\n${ergebnisse.length - fail} ok, ${fail} fehlgeschlagen`);
process.exit(fail ? 1 : 0);
