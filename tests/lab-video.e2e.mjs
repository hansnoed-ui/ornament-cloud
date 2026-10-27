// ORNAMENT LAB · Video – Browsertest (Playwright, Chromium): Videos, Bild und Ton laden, Vorschau, teilen, rückgängig, trimmen und umstellen
// mit der Maus, Blende, Filter, Titel, Takt als Marken, abspielen, MP4 exportieren, Projekt speichern und wieder öffnen, am Telefon.
// Die Testvideos macht der Browser selbst (VP9 und Opus im MP4, mit WebCodecs und mp4-muxer), so braucht der Test kein ffmpeg.
//   NODE_PATH=$(npm root -g) node tests/lab-video.e2e.mjs
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { join } from "node:path";
import { readFileSync } from "node:fs";

const require = createRequire(import.meta.url);
let playwright;
try { playwright = require("playwright"); } catch { playwright = require(join(process.env.NODE_PATH || "", "playwright")); }
const root = new URL("../", import.meta.url);
const { startServer } = await import(new URL("tools/serve-orma.mjs", root).href);
const { leseZip } = await import(new URL("alpha/lab/kern/archiv.js", root).href);
const OF = await import(new URL("vendor/openfilm-0.2.6/film-doc.js", root).href);
const server = await startServer(0);
const base = `http://localhost:${server.address().port}/alpha/lab/video/`;
const browser = await playwright.chromium.launch();
const ergebnisse = [];
async function check(name, fn) {
  try { await fn(); ergebnisse.push(true); console.log("ok  ", name); }
  catch (e) { ergebnisse.push(false); console.log("FAIL", name, "\n     ", e.message.split("\n").slice(0, 8).join("\n      ")); }
}
async function oeffne(opts = {}) {
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 1000 }, acceptDownloads: true, ...opts });
  const page = await ctx.newPage();
  const fehler = [], fremd = [];
  page.on("pageerror", (e) => fehler.push(e.message));
  page.on("console", (m) => { if (m.type() === "error") fehler.push(m.text()); });
  page.on("request", (r) => { const u = new URL(r.url()); if (!["localhost", "127.0.0.1"].includes(u.hostname) && u.protocol.startsWith("http")) fremd.push(r.url()); });
  page.on("dialog", (d) => d.accept());
  await page.goto(base);
  await page.waitForFunction(() => globalThis.ornamentVideo);
  return { ctx, page, fehler, fremd };
}
const S = (page, fn, arg) => page.evaluate(fn, arg);

/** ein Testvideo im Browser: w × h, sekunden, die Farbe wechselt zur Hälfte (farben), Ton: ein Klick alle 0,5 s; VP9 und Opus im MP4 */
async function testvideo(page, { w = 320, h = 240, sekunden = 4, farben = ["#d02020", "#2040d0"], ton = true }) {
  return S(page, async ({ w, h, sekunden, farben, ton }) => {
    const { Muxer, ArrayBufferTarget } = await import("/vendor/mp4-muxer-5.2.2/mp4-muxer.js");
    const fps = 15, target = new ArrayBufferTarget(), rate = 48000;
    const muxer = new Muxer({ target, fastStart: "in-memory", video: { codec: "vp9", width: w, height: h, frameRate: fps }, ...(ton ? { audio: { codec: "opus", numberOfChannels: 1, sampleRate: rate } } : {}) });
    const ve = new VideoEncoder({ output: (c, m) => muxer.addVideoChunk(c, m), error: (e) => { throw e; } });
    ve.configure({ codec: "vp09.00.10.08", width: w, height: h, bitrate: 500_000, framerate: fps });
    const c = new OffscreenCanvas(w, h), x = c.getContext("2d");
    for (let i = 0; i < sekunden * fps; i++) {
      x.fillStyle = i < (sekunden * fps) / 2 ? farben[0] : farben[1]; x.fillRect(0, 0, w, h);
      x.fillStyle = "#fff"; x.fillRect((i * 7) % (w - 20), 10, 20, 20);
      const f = new VideoFrame(c, { timestamp: Math.round((i * 1e6) / fps) }); ve.encode(f, { keyFrame: i % fps === 0 }); f.close();
    }
    await ve.flush();
    if (ton) {
      const ae = new AudioEncoder({ output: (c, m) => muxer.addAudioChunk(c, m), error: (e) => { throw e; } });
      ae.configure({ codec: "opus", sampleRate: rate, numberOfChannels: 1, bitrate: 64000 });
      const n = sekunden * rate, d = new Float32Array(n);
      for (let i = 0; i < n; i++) { const t = (i % (rate / 2)) / rate; d[i] = 0.6 * Math.sin(2 * Math.PI * 220 * (i / rate)) * Math.exp(-t * 30); }
      for (let a = 0; a < n; a += 4800) { const m = Math.min(4800, n - a); const ad = new AudioData({ format: "f32-planar", sampleRate: rate, numberOfFrames: m, numberOfChannels: 1, timestamp: Math.round((a / rate) * 1e6), data: d.subarray(a, a + m) }); ae.encode(ad); ad.close(); }
      await ae.flush();
    }
    muxer.finalize();
    return Array.from(new Uint8Array(target.buffer));
  }, { w, h, sekunden, farben, ton }).then((a) => Buffer.from(a));
}
async function testbild(page) {
  return Buffer.from(await S(page, async () => {
    const c = new OffscreenCanvas(400, 300), x = c.getContext("2d");
    x.fillStyle = "#e8d020"; x.fillRect(0, 0, 400, 300); x.fillStyle = "#000"; x.fillRect(150, 100, 100, 100);
    return Array.from(new Uint8Array(await (await c.convertToBlob({ type: "image/png" })).arrayBuffer()));
  }));
}
/** WAV, 6 s, 44,1 kHz mono: ein Schlag alle 0,5 s (120 BPM) */
function testton() {
  const rate = 44100, n = rate * 6, b = Buffer.alloc(44 + n * 2);
  b.write("RIFF", 0); b.writeUInt32LE(36 + n * 2, 4); b.write("WAVEfmt ", 8); b.writeUInt32LE(16, 16); b.writeUInt16LE(1, 20); b.writeUInt16LE(1, 22);
  b.writeUInt32LE(rate, 24); b.writeUInt32LE(rate * 2, 28); b.writeUInt16LE(2, 32); b.writeUInt16LE(16, 34); b.write("data", 36); b.writeUInt32LE(n * 2, 40);
  for (let i = 0; i < n; i++) { const t = (i % (rate / 2)) / rate, v = Math.sin(2 * Math.PI * 80 * (i / rate)) * Math.exp(-t * 18) * 0.8; b.writeInt16LE(Math.round(v * 32767), 44 + i * 2); }
  return b;
}
/** die Farbe in der Mitte der Vorschau (nachdem das Bild gezeichnet ist) */
async function farbeBei(page, t, x = 0.5, y = 0.6) {
  await S(page, (t) => ornamentVideo.springe(t), t);
  await page.waitForTimeout(400);
  return S(page, ({ x, y }) => { const c = document.getElementById("bild"); return [...c.getContext("2d").getImageData(Math.floor(c.width * x), Math.floor(c.height * y), 1, 1).data].slice(0, 3); }, { x, y });
}
async function ziehen(page, sel, dx) {
  const el = page.locator(sel).first();
  await el.scrollIntoViewIfNeeded();
  const b = await el.boundingBox();
  const x = b.x + b.width / 2, y = b.y + b.height / 2;
  await page.mouse.move(x, y); await page.mouse.down(); await page.mouse.move(x + dx / 2, y, { steps: 4 }); await page.mouse.move(x + dx, y, { steps: 4 }); await page.mouse.up();
  await page.waitForTimeout(150);
}

const { ctx, page, fehler, fremd } = await oeffne();
let videoA, videoB, bild, gespeichert = null, vorher = null;

await check("Start: Kopf, Vorschau, Zeitleiste, Eigenschaften; leer; keine Fehler, nichts von aussen", async () => {
  for (const id of ["material", "vorschau", "eigenschaften", "zeitleiste"]) assert.ok(await page.locator(`#${id}`).isVisible(), id);
  assert.ok(await page.locator("#leer").isVisible());
  assert.equal(await page.locator("#format option").count(), 4);
  assert.deepEqual(fehler, []); assert.deepEqual(fremd, []);
});

await check("Material: zwei Videos, ein Bild, ein Ton; die Bilder kommen in die Folge, der Ton unter den Film", async () => {
  videoA = await testvideo(page, { sekunden: 4, farben: ["#d02020", "#2040d0"] });
  videoB = await testvideo(page, { sekunden: 3, farben: ["#20b040", "#20b040"], ton: false });
  bild = await testbild(page);
  await page.setInputFiles("#dateien", [
    { name: "rot-blau.mp4", mimeType: "video/mp4", buffer: videoA }, { name: "gruen.mp4", mimeType: "video/mp4", buffer: videoB },
    { name: "gelb.png", mimeType: "image/png", buffer: bild }, { name: "takt.wav", mimeType: "audio/wav", buffer: testton() }]);
  await page.waitForFunction(() => ornamentVideo.S.p.folge.length === 3 && ornamentVideo.S.p.ton.length === 1, null, { timeout: 30000 });
  const p = await S(page, () => ({ medien: Object.values(ornamentVideo.S.p.medien).map((m) => [m.art, m.dauer, m.breite]), dauer: ornamentVideo.F.dauer(ornamentVideo.S.p) }));
  assert.deepEqual(p.medien.map((m) => m[0]), ["video", "video", "bild", "ton"]);
  assert.ok(Math.abs(p.medien[0][1] - 4) < 0.15 && p.medien[0][2] === 320, JSON.stringify(p.medien));
  assert.ok(Math.abs(p.dauer - 11) < 0.2, `4 + 3 + 4 s Bild: ${p.dauer}`);
  assert.equal(await page.locator(".medium").count(), 4);
  assert.equal(await page.locator('.spur.folge .clip').count(), 3);
  assert.ok(await page.locator("#leer").isHidden());
});

await check("Vorschau: rot, dann blau, dann grün, dann das gelbe Bild", async () => {
  const rot = await farbeBei(page, 1), blau = await farbeBei(page, 3), gruen = await farbeBei(page, 5), gelb = await farbeBei(page, 9, 0.2, 0.5);
  assert.ok(rot[0] > 150 && rot[2] < 90, `rot: ${rot}`); assert.ok(blau[2] > 150 && blau[0] < 90, `blau: ${blau}`);
  assert.ok(gruen[1] > 130 && gruen[0] < 90, `grün: ${gruen}`); assert.ok(gelb[0] > 180 && gelb[1] > 160 && gelb[2] < 90, `gelb: ${gelb}`);
});

await check("Teilen mit S am Abspielkopf, Rückgängig und Wiederholen", async () => {
  await S(page, () => { ornamentVideo.S.auswahl = null; ornamentVideo.springe(2); });
  await page.locator("body").click({ position: { x: 5, y: 5 } });
  await page.keyboard.press("s");
  let f = await S(page, () => ornamentVideo.S.p.folge.map((c) => [c.medium, c.ein, c.aus]));
  assert.equal(f.length, 4); assert.deepEqual(f[0], ["rot-blau", 0, 2]); assert.equal(f[1][1], 2);
  await page.keyboard.press("Control+z");
  assert.equal(await S(page, () => ornamentVideo.S.p.folge.length), 3);
  await page.keyboard.press("Control+Shift+z");
  assert.equal(await S(page, () => ornamentVideo.S.p.folge.length), 4);
});

await check("Trimmen und Umstellen mit der Maus: das Ende des ersten Clips nach links, das Bild an den Anfang", async () => {
  await page.locator("#einrasten").uncheck();
  const id = await S(page, () => ornamentVideo.S.p.folge[0].id), zoom = await S(page, () => ornamentVideo.S.zoom);
  await ziehen(page, `.clip[data-id="${id}"] .griff.rechts`, -0.5 * zoom);
  const aus = await S(page, () => ornamentVideo.S.p.folge[0].aus);
  assert.ok(Math.abs(aus - 1.5) < 0.08, `das Ende rückt um 0,5 s: ${aus}`);
  const bildId = await S(page, () => ornamentVideo.S.p.folge.find((c) => c.medium === "gelb").id);
  const links = await page.locator(`.clip[data-id="${bildId}"]`).boundingBox();
  await ziehen(page, `.clip[data-id="${bildId}"] .beschriftung`, -(links.x - (await page.locator(".spur.folge").boundingBox()).x) - links.width / 2 + 4);
  assert.equal(await S(page, () => ornamentVideo.S.p.folge[0].medium), "gelb", "das Bild steht jetzt vorn");
  await page.keyboard.press("Control+z");
  assert.notEqual(await S(page, () => ornamentVideo.S.p.folge[0].medium), "gelb", "auch das Umstellen ist rückgängig zu machen");
  await page.keyboard.press("Control+Shift+z");
  await page.locator("#einrasten").check();
});

await check("Blende und Filter in den Eigenschaften: die Clips überlappen, Noir macht das Bild grau", async () => {
  const id = await S(page, () => ornamentVideo.S.p.folge[0].id);
  await page.locator(`.clip[data-id="${id}"]`).click({ position: { x: 30, y: 32 } });
  await page.locator('#inspektor select[data-feld="uebergang"]').selectOption("blende");
  const z = await S(page, () => ornamentVideo.F.zeitplan(ornamentVideo.S.p).clips.map((x) => [x.at, x.laenge]));
  assert.ok(z[1][0] < z[0][0] + z[0][1] - 0.3, `der zweite beginnt in der Blende: ${JSON.stringify(z)}`);
  assert.equal(await page.locator(".uebergang.blende").count(), 1);
  // Noir auf dem roten Teil des Videos (zweiter Clip: rot-blau ab 2 s, also blau; darum der Clip mit rot: der dritte, das zweite Video ist grün)
  const gruen = await S(page, () => ornamentVideo.S.p.folge.find((c) => c.medium === "gruen").id);
  await page.locator(`.clip[data-id="${gruen}"]`).click({ position: { x: 30, y: 32 } });
  await page.locator('#inspektor [data-vorlage="noir"]').click();
  const t = await S(page, (id) => { const x = ornamentVideo.F.zeitplan(ornamentVideo.S.p).clips.find((y) => y.c.id === id); return x.at + x.laenge / 2; }, gruen);
  const grau = await farbeBei(page, t);
  assert.ok(Math.max(...grau) - Math.min(...grau) < 12, `grau: ${grau}`);
  assert.match(await S(page, () => ornamentVideo.S.film.html), /grayscale\(1\)/);
});

await check("Titel: hinzufügen, Text ändern; er steht im Bild und als Seite im Film", async () => {
  await S(page, () => ornamentVideo.springe(0.5));
  await page.click("#titel-neu");
  await page.locator('#inspektor textarea[data-feld="text"]').fill("Hallo Welt");
  await page.locator('#inspektor select[data-feld="animation"]').selectOption("keine");
  await page.locator('#inspektor select[data-feld="band"]').selectOption("voll");
  const t = await S(page, () => ornamentVideo.S.p.titel.map((x) => [x.text, x.at]));
  assert.deepEqual(t, [["Hallo Welt", 0.5]]);
  const f = await farbeBei(page, 1.2, 0.05, 0.05);
  assert.ok(f[0] < 120 && f[0] > 40, `die Fläche des Titels (Schwarz, Deckkraft 0,55) dunkelt das Rot ab: ${f}`);
  assert.match(await S(page, () => Object.keys(ornamentVideo.S.film.seiten).join(",")), /titel\/titel-1\.html/);
});

await check("Effekte und Titelvorlagen (0.2): Super 8 legt Korn über den Clip, die Handkamera bewegt das Bild, der Glitch-Titel zeichnet", async () => {
  const id = await S(page, () => ornamentVideo.S.p.folge.find((c) => c.medium === "rot-blau").id);
  await page.locator(`.clip[data-id="${id}"]`).click({ position: { x: 30, y: 32 } });
  await page.locator('#inspektor [data-effektvorlage="super8"]').click();
  const e = await S(page, (id) => ornamentVideo.S.p.folge.find((c) => c.id === id).effekte, id);
  assert.equal(e.korn, 0.7); assert.equal(e.wackeln, 0.3);
  assert.match(await S(page, () => ornamentVideo.S.film.html), new RegExp(`effekt/korn-${id}\\.html#t=0,[\\d.]+" at="[\\d.]+" style="mix-blend-mode: overlay"`));
  assert.match(await page.textContent(`.clip[data-id="${id}"]`), /✦/);
  const t = await S(page, (id) => { const x = ornamentVideo.F.zeitplan(ornamentVideo.S.p).clips.find((y) => y.c.id === id); return x.at + 0.3; }, id);
  // Korn: benachbarte Pixel einer einfarbigen Fläche unterscheiden sich
  await S(page, (t) => ornamentVideo.springe(t), t); await page.waitForTimeout(400);
  const streuung = await S(page, () => { const c = document.getElementById("bild"), d = c.getContext("2d").getImageData(Math.floor(c.width * 0.3), Math.floor(c.height * 0.7), 40, 1).data; let mi = 255, ma = 0; for (let i = 0; i < d.length; i += 4) { mi = Math.min(mi, d[i]); ma = Math.max(ma, d[i]); } return ma - mi; });
  assert.ok(streuung > 6, `Korn sichtbar: ${streuung}`);
  // Titelvorlage
  await S(page, () => { const t = ornamentVideo.S.p.titel[0]; ornamentVideo.S.auswahl = t.id; ornamentVideo.alles(); });
  await page.locator('#inspektor [data-titelvorlage="glitch"]').click();
  const ti = await S(page, () => ornamentVideo.S.p.titel[0]);
  assert.deepEqual([ti.animation, ti.abgang, ti.schrift, ti.text], ["glitch", "glitch", "mono", "Hallo Welt"], "die Vorlage behält den Text");
  await page.locator('#inspektor [data-titelvorlage="wort"]').click();
  assert.equal(await S(page, () => ornamentVideo.S.p.titel[0].animation), "woerter");
  assert.deepEqual(fehler, []);
});

await check("Takt als Marken: die Schläge des Tons stehen als Marken auf dem Lineal, Ränder rasten dort ein", async () => {
  const id = await S(page, () => ornamentVideo.S.p.ton[0].id);
  await page.locator(`.clip[data-id="${id}"]`).click({ position: { x: 30, y: 20 } });
  await page.click("#takt");
  await page.waitForFunction(() => ornamentVideo.S.p.marken.length >= 8, null, { timeout: 10000 });
  const m = await S(page, () => ornamentVideo.S.p.marken);
  assert.ok(m.every((x) => Math.abs(x * 2 - Math.round(x * 2)) < 0.05), `alle 0,5 s: ${m}`);
  assert.ok(await page.locator(".lineal .marke").count() >= 8);
});

await check("Abspielen: der Abspielkopf läuft, Anhalten hält", async () => {
  await S(page, () => ornamentVideo.springe(0));
  await page.click("#spielen"); await page.waitForTimeout(900);
  const t = await S(page, () => ornamentVideo.S.t);
  await page.click("#spielen");
  assert.ok(t > 0.4 && t < 2, `${t}`);
  assert.equal(await S(page, () => ornamentVideo.S.spielt), false);
});

await check("MP4 exportieren: Bilder und Ton, so lang wie der Film", async () => {
  vorher = await S(page, () => JSON.stringify(ornamentVideo.S.p));
  await page.click("#export-oeffnen");
  await page.locator("#qualitaet").selectOption("mittel");
  await page.click("#export-start");
  await page.waitForSelector("#export-ergebnis:not([hidden]) video", { timeout: 240000 });
  const text = await page.textContent("#export-hinweis");
  assert.match(text, /^Fertig: /); assert.match(text, /Ton (aac|opus)/, text);
  const d = await S(page, () => ornamentVideo.F.dauer(ornamentVideo.S.p));
  const geht = await S(page, async () => { const v = document.querySelector("#export-ergebnis video"); if (v.readyState < 1) await new Promise((ok) => { v.onloadedmetadata = ok; v.onerror = ok; setTimeout(ok, 5000); }); return { dauer: v.duration, w: v.videoWidth, fehler: v.error?.code ?? null }; });
  if (geht.fehler === null && geht.dauer > 0) { assert.ok(Math.abs(geht.dauer - d) < 0.25, `${geht.dauer} statt ${d}`); assert.equal(geht.w, 1280); }
  else console.log("      (dieser Chromium spielt das MP4 nicht ab, geprüft sind nur die Angaben):", text);
  await page.click('#export button[value="schliessen"]');
});

await check("Speichern und wieder öffnen: ein OpenFilm-Ordner im ZIP, zurück dasselbe Projekt", async () => {
  const [dl] = await Promise.all([page.waitForEvent("download"), page.click("#speichern")]);
  assert.match(dl.suggestedFilename(), /\.film\.zip$/);
  gespeichert = await dl.path();
  const dateien = await leseZip(new Uint8Array(readFileSync(gespeichert)));
  assert.deepEqual([...dateien.keys()].filter((n) => n.startsWith("assets/")).length, 4);
  assert.ok(dateien.has(".film/ornament-video.json") && dateien.has("titel/titel-1.html"));
  assert.deepEqual(OF.readFilmFile(new TextDecoder().decode(dateien.get("film.html"))).problems, []);
  await page.click("#neu");
  assert.equal(await S(page, () => ornamentVideo.S.p.folge.length), 0);
  await page.setInputFiles("#oeffnen", gespeichert);
  await page.waitForFunction(() => ornamentVideo.S.p.folge.length > 0, null, { timeout: 30000 });
  assert.equal(await S(page, () => JSON.stringify(ornamentVideo.S.p)), vorher);
  const gelb = await farbeBei(page, 0.3, 0.2, 0.5);
  assert.ok(gelb[0] > 180 && gelb[2] < 90, `nach dem Öffnen zeichnet die Vorschau wieder (das gelbe Bild vorn): ${gelb}`);
});

await check("Keine Fehler, nichts von aussen", async () => { assert.deepEqual(fehler, []); assert.deepEqual(fremd, []); });
await ctx.close();

await check("Telefon (390 × 844): alles untereinander, keine Seite zum Seitwärtswischen, Video laden und teilen", async () => {
  const t = await oeffne({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 });
  const breite = await S(t.page, () => [document.documentElement.scrollWidth, innerWidth]);
  assert.ok(breite[0] <= breite[1] + 1, `keine waagrechte Seite: ${breite}`);
  const reihen = await S(t.page, () => ["vorschau", "zeitleiste", "eigenschaften", "material"].map((id) => document.getElementById(id).getBoundingClientRect().top));
  assert.ok(reihen.every((y, i) => i === 0 || y > reihen[i - 1]), `Vorschau, Zeitleiste, Eigenschaften, Material: ${reihen}`);
  await t.page.setInputFiles("#dateien", [{ name: "hoch.mp4", mimeType: "video/mp4", buffer: await testvideo(t.page, { w: 180, h: 320, sekunden: 2 }) }]);
  await t.page.waitForFunction(() => ornamentVideo.S.p.folge.length === 1, null, { timeout: 30000 });
  assert.equal(await S(t.page, () => ornamentVideo.S.p.format), "9:16", "ein Hochformat-Video stellt das Format auf 9:16");
  await S(t.page, () => ornamentVideo.springe(1)); await S(t.page, () => ornamentVideo.teilenJetzt());
  assert.equal(await S(t.page, () => ornamentVideo.S.p.folge.length), 2);
  assert.deepEqual(t.fehler, []);
  await t.ctx.close();
});

await browser.close(); server.close();
const gut = ergebnisse.filter(Boolean).length;
console.log(`\n${gut} von ${ergebnisse.length} Prüfungen bestanden`);
process.exit(gut === ergebnisse.length ? 0 : 1);
