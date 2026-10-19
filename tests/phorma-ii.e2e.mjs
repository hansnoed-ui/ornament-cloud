// PHORMA II (alpha/phorma-ii/) – Browser-Tests (Playwright, Chromium, WebGL über SwiftShader): ein Testfoto analysieren (Physarum, Tiefe, Tuch, Wachstum, Montage), jede Phase der Kette
// zeigt etwas und etwas anderes, jeder Effekt beginnt im Dunkeln und endet exakt beim Foto, dasselbe Bild nach einem Sprung zurück (Simulationen
// mit Wiedereinstiegspunkten), Bewegungsunschärfe, Video über WebCodecs (Ersatz-Encoder), Standbild, KI-Tiefe ohne Netz fällt auf die geschätzte
// zurück, keine Anfragen nach aussen, Handy ohne seitliches Scrollen. Mit ?test (weniger Agenten, gröbere Netze). Die Tests fürs Gewebe (Text, Ton,
// Video) stehen seit dem 18. Oktober 2026 in tests/phorma-iii.e2e.mjs.
//   NODE_PATH=$(npm root -g) node tests/phorma-ii.e2e.mjs
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
const base = `http://localhost:${server.address().port}/alpha/phorma-ii/?test`;
const browser = await playwright.chromium.launch({ args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader"] });
const ergebnisse = [];
async function check(name, fn) {
  if (process.env.NUR && !name.includes(process.env.NUR)) return;      // NUR=Video: nur die Prüfungen mit diesem Wort
  try { await fn(); ergebnisse.push(true); console.log("ok  ", name); }
  catch (e) { ergebnisse.push(false); console.log("FAIL", name, "\n     ", e.message.split("\n").slice(0, 8).join("\n      ")); }
}
async function oeffne({ vorher = null, ablauf = null, ...opts } = {}) {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 950 }, acceptDownloads: true, ...opts });
  const page = await ctx.newPage();
  const fehler = [], fremd = [];
  page.on("pageerror", (e) => fehler.push(e.message));
  page.on("console", (m) => { if (m.type() === "error") fehler.push(m.text()); });
  page.on("request", (r) => { const u = new URL(r.url()); if (!["localhost", "127.0.0.1"].includes(u.hostname) && u.protocol.startsWith("http")) fremd.push(r.url()); });
  if (ablauf) await page.addInitScript((a) => { try { localStorage.setItem("phorma-ii.ablauf", a); } catch { /* egal */ } }, ablauf);
  if (vorher) await page.addInitScript(vorher);
  await page.goto(base);
  return { ctx, page, fehler, fremd };
}
// Testfoto, im Browser gezeichnet: Himmel, Sonne, eine rote Fläche, Wiese; quer (3 : 2)
const FOTO = await (async () => {
  const p = await (await browser.newContext()).newPage();
  const url = await p.evaluate(() => {
    const w = 1500, h = 1000, c = document.createElement("canvas"); c.width = w; c.height = h; const x = c.getContext("2d");
    const g = x.createLinearGradient(0, 0, 0, h * 0.6); g.addColorStop(0, "#2f5fb0"); g.addColorStop(1, "#9cc2ee");
    x.fillStyle = g; x.fillRect(0, 0, w, h * 0.6);
    x.fillStyle = "#3c8a3a"; x.fillRect(0, h * 0.6, w, h * 0.4);
    for (let i = 0; i < 4000; i++) { x.fillStyle = `rgba(20,60,20,${(i % 7) / 14})`; x.fillRect((i * 7919) % w, h * 0.6 + ((i * 104729) % (h * 0.4)), 3, 9); }
    x.fillStyle = "#ffd23f"; x.beginPath(); x.arc(w * 0.5, h * 0.3, 140, 0, 7); x.fill();
    x.fillStyle = "#d0302a"; x.fillRect(w * 0.35, h * 0.62, w * 0.3, h * 0.25);
    return c.toDataURL("image/jpeg", 0.92);
  });
  await p.context().close();
  return Buffer.from(url.split(",")[1], "base64");
})();
const laden = (page) => page.setInputFiles("#datei", { name: "foto.jpg", mimeType: "image/jpeg", buffer: FOTO });
const bereit = (page) => page.waitForFunction(() => !document.getElementById("video").disabled && window.__phorma?.sz && window.__phorma?.buehne && window.__phorma.buehneFertig, null, { timeout: 180_000 });

/** ein Bild des Films zur Zeit t in halber Grösse: mittlere Helligkeit und ihre Streuung, Anteil Tinte (deutlich anders als das Papier: leer 0), Anteil fast schwarz, grösste Abweichung vom Foto, ein Fingerabdruck */
const messe = (page, t, { proben = 1 } = {}) => page.evaluate(async ([t, proben]) => {
  const { bild } = await import("./film.js?v=23");
  const S = window.__phorma; S.laeuft = false;
  const sz = { ...S.sz, buehne: S.buehne, beschriftung: false };   // die Szene der Seite (mit Ton, Text und Signet wie eingestellt)
  const w = S.mass[0] / 2, h = S.mass[1] / 2, c = document.createElement("canvas"); c.width = w; c.height = h; const x = c.getContext("2d");
  x.setTransform(0.5, 0, 0, 0.5, 0, 0);
  bild(x, sz, t, { proben });
  const d = x.getImageData(0, 0, w, h).data;
  const f = document.createElement("canvas"); f.width = w; f.height = h; const fx = f.getContext("2d"); fx.drawImage(S.foto, 0, 0, w, h);
  const q = fx.getImageData(0, 0, w, h).data;
  let hell = 0, hell2 = 0, schwarz = 0, abw = 0, mittelAbw = 0, n = 0, abdruck = 0, tinte = 0;
  const L = new Float32Array(d.length / 4); for (let i = 0; i < d.length; i += 4) L[i / 4] = (d[i] + d[i + 1] + d[i + 2]) / 3;
  const median = Float32Array.from(L).sort()[L.length >> 1];
  for (const l of L) if (Math.abs(l - median) > 30) tinte++;
  for (let i = 0; i < d.length; i += 4) {
    const l = (d[i] + d[i + 1] + d[i + 2]) / 3; hell += l; hell2 += l * l; n++; if (l < 8) schwarz++;
    const a = Math.max(Math.abs(d[i] - q[i]), Math.abs(d[i + 1] - q[i + 1]), Math.abs(d[i + 2] - q[i + 2])); if (a > abw) abw = a; mittelAbw += a;
    abdruck = (abdruck * 31 + d[i] * 7 + d[i + 1] * 3 + d[i + 2]) >>> 0;
  }
  return { hell: hell / n, streu: Math.sqrt(Math.max(0, hell2 / n - (hell / n) ** 2)), tinte: tinte / n, schwarz: schwarz / n, abw, mittelAbw: mittelAbw / n, abdruck, dauer: sz.zeit.dauer, zeit: { teile: sz.zeit.teile.map((tl) => [tl.art, tl.von, tl.bis]), phasen: sz.zeit.phasen.map((p) => [p.art, p.name, p.von, p.bis]), abschnitt: sz.zeit.abschnitt, stehen: sz.zeit.ab.stehen } };
}, [t, proben]);

// Ersatz für den H.264-Encoder (SwiftShader hat keinen): liefert kleine Stücke und eine Beschreibung
const ERSATZ_ENCODER = () => {
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

await check("Testfoto: wird analysiert, die Bühne steht, die Kette aller drei Effekte als Sprungknöpfe; nichts von aussen", async () => {
  const { ctx, page, fehler, fremd } = await oeffne();
  assert.equal(await page.getAttribute('[data-format="4:5"]', "aria-pressed"), "true");
  for (const e of ["physarum", "tiefe", "tuch"]) assert.equal(await page.getAttribute(`[data-effekt="${e}"]`, "aria-pressed"), "true", `${e} gewählt`);
  await laden(page);
  await bereit(page);
  assert.match(await page.textContent("#auswertung"), /^\d+ Keime · Kanten · Tiefe/);
  assert.equal(await page.textContent("#kette"), "Physarum → Tiefe → Tuch");
  const knoepfe = await page.$$eval(".phasen button", (b) => b.map((x) => x.textContent));
  assert.deepEqual(knoepfe, ["01 Keime", "02 Netz", "03 Scan", "04 Raum", "05 Tuch", "06 Bild"]);
  assert.deepEqual(fehler, []); assert.deepEqual(fremd, []);
  await ctx.close();
});

await check("Effekte einzeln anwählen: eine Karte wählt genau einen Effekt, die Schalter stellen eine eigene Kette zusammen, die Wahl bleibt", async () => {
  const { ctx, page, fehler } = await oeffne();
  await laden(page); await bereit(page);
  const gedrueckt = () => page.$$eval("[data-wahl], [data-effekt]", (b) => b.filter((x) => x.getAttribute("aria-pressed") === "true").map((x) => x.dataset.wahl ?? `+${x.dataset.effekt}`));
  assert.deepEqual(await gedrueckt(), ["physarum+tiefe+tuch", "+physarum", "+tiefe", "+tuch"], "am Anfang die ganze Kette");
  for (const e of ["tiefe", "physarum"]) {
    await page.click(`[data-wahl="${e}"]`);
    await page.waitForFunction((e) => window.__phorma.ablauf === e && window.__phorma.buehne && window.__phorma.sz.zeit.teile.length === 1, e, { timeout: 60_000 });
    assert.deepEqual(await gedrueckt(), [e, `+${e}`], `${e} allein`);
  }
  assert.equal(await page.textContent("#kette"), "Physarum");
  await page.click('[data-effekt="tuch"]');
  await page.waitForFunction(() => window.__phorma.ablauf === "physarum+tuch");
  assert.deepEqual(await gedrueckt(), ["+physarum", "+tuch"], "eigene Kette: keine Karte");
  assert.equal(await page.textContent("#kette"), "Physarum → Tuch");
  await page.click('[data-effekt="physarum"]'); await page.click('[data-effekt="tuch"]');
  assert.equal(await page.evaluate(() => window.__phorma.ablauf), "tuch", "einer bleibt immer");
  assert.deepEqual(await gedrueckt(), ["tuch", "+tuch"]);
  await page.reload(); await laden(page); await bereit(page);
  assert.equal(await page.evaluate(() => window.__phorma.ablauf), "tuch", "die Wahl bleibt nach dem Neuladen");
  await page.click('[data-wahl="physarum+tiefe+tuch"]');
  await page.waitForFunction(() => window.__phorma.sz.zeit.teile.length === 3);
  assert.equal(await page.textContent("#kette"), "Physarum → Tiefe → Tuch");
  assert.deepEqual(fehler, []);
  await ctx.close();
});

await check("Kette: jede Phase zeigt etwas, jede etwas anderes; am Anfang dunkel, am Ende exakt das Foto, nach einem Sprung zurück dasselbe Bild", async () => {
  const { ctx, page, fehler } = await oeffne();
  await laden(page); await bereit(page);
  const { zeit } = await messe(page, 0);
  const anfang = await messe(page, 0.2);
  assert.ok(anfang.hell < 3, `vor dem Film dunkel (${anfang.hell.toFixed(1)})`);
  const bilder = [];
  for (const [art, name, a, b] of zeit.phasen) {
    const m = await messe(page, a + 0.6 * (b - a));
    assert.ok(m.schwarz < 0.995 && m.hell > 2, `${art}/${name} zeigt etwas (${m.hell.toFixed(1)})`);
    bilder.push([`${art}/${name}`, m]);
  }
  const abdruecke = new Set(bilder.map(([, m]) => m.abdruck));
  assert.equal(abdruecke.size, bilder.length, "jede Phase anders");
  // Physarum ist kein Foto, Tiefe und Tuch im Raum weichen deutlich ab
  for (const [n, m] of bilder.filter(([n]) => /netz|raum|tuch\/tuch/.test(n))) assert.ok(m.mittelAbw > 6, `${n} weicht vom Foto ab (${m.mittelAbw.toFixed(1)})`);
  const ende = await messe(page, zeit.stehen[0] + 0.5), letzt = await messe(page, zeit.abschnitt.bis - 1 / 30);
  assert.ok(ende.abw <= 3, `das Foto steht exakt (${ende.abw})`);
  assert.ok(letzt.abw <= 3, `das letzte Bild der Kette ist das Foto (${letzt.abw})`);
  // Sprung zurück: Physarum (Simulation) und das Tuch (Simulation) zeigen dasselbe Bild
  const tNetz = zeit.phasen[1][2] + 1.2, tTuch = zeit.phasen[4][2] + 1.5;
  const a = await messe(page, tNetz), b = await messe(page, tTuch);
  await messe(page, zeit.phasen[0][2] + 0.3);
  assert.equal((await messe(page, tNetz)).abdruck, a.abdruck, "Netz nach dem Sprung zurück gleich");
  await messe(page, zeit.phasen[4][2] + 0.2);
  assert.equal((await messe(page, tTuch)).abdruck, b.abdruck, "Tuch nach dem Sprung zurück gleich");
  assert.deepEqual(fehler, []);
  await ctx.close();
});

await check("Jeder Effekt allein: beginnt im Dunkeln und endet exakt beim Foto", async () => {
  for (const e of ["physarum", "tiefe", "tuch", "wachstum", "montage"]) {
    const { ctx, page, fehler } = await oeffne({ ablauf: e });
    await laden(page); await bereit(page);
    assert.equal(await page.textContent("#kette"), { physarum: "Physarum", tiefe: "Tiefe", tuch: "Tuch", wachstum: "Wachstum", montage: "Montage" }[e]);
    const { zeit } = await messe(page, 0);
    assert.equal(zeit.teile.length, 1);
    const anfang = await messe(page, zeit.abschnitt.von + 0.15), mitte = await messe(page, (zeit.abschnitt.von + zeit.abschnitt.bis) / 2);
    const ende = await messe(page, zeit.abschnitt.bis - 1 / 30);
    assert.ok(anfang.hell < 12, `${e}: Anfang dunkel (${anfang.hell.toFixed(1)})`);
    assert.ok(mitte.mittelAbw > 5, `${e}: in der Mitte nicht das Foto (${mitte.mittelAbw.toFixed(1)})`);
    assert.ok(ende.abw <= 3, `${e}: Ende exakt (${ende.abw})`);
    assert.deepEqual(fehler, []);
    await ctx.close();
  }
});

await check("Montage nach dem Tuch: Rechtecke schneiden das Tuch weg, die Montage beginnt zerschnitten, rastet exakt ein; das Signet im selben Stil", async () => {
  const { ctx, page, fehler } = await oeffne({ ablauf: "tuch+montage" });
  await laden(page); await bereit(page);
  assert.equal(await page.textContent("#kette"), "Tuch → Montage");
  const { zeit } = await messe(page, 0), [, von, bis] = zeit.teile[1];
  assert.equal(zeit.teile.map((t) => t[0]).join("+"), "tuch+montage");
  const anfang = await messe(page, von + 0.9), mitte = await messe(page, von + 5.5), ende = await messe(page, bis - 1 / 30);
  assert.ok(anfang.mittelAbw > 5, `beginnt nicht beim fertigen Foto, gleich zerschnitten (${anfang.mittelAbw.toFixed(1)})`);
  assert.ok(mitte.mittelAbw > 5, `in der Mitte zerfallen (${mitte.mittelAbw.toFixed(1)})`);
  assert.ok(ende.abw <= 3, `endet exakt (${ende.abw})`);
  assert.match(await page.evaluate((t) => window.__phorma.buehne.zaehler(window.__phorma.sz.zeit, t), von + 5.5), /^montage · felder \d+ · schnitt \d+\/\d+$/);
  // das Signet am Schluss im Stil der Montage: geschnitten, während es sich zeichnet, dann steht es unverändert
  const ab = await page.evaluate(() => ({ montage: window.__phorma.buehne.montageSchluss, signet: window.__phorma.sz.zeit.ab.signet, stehen: window.__phorma.sz.zeit.ab.signetStehen }));
  assert.equal(ab.montage, true, "Signet im Stil der Montage");
  assert.ok(Math.abs(ab.signet[0] - bis - 1.0) < 1e-6, "nahtlos: das Signet kommt eine Sekunde nach dem Schlussbild");
  const uebergang = await messe(page, ab.signet[0] + 0.05);
  assert.ok(uebergang.mittelAbw < 4, `am Anfang des Signets noch das Foto, nur der Anfang der Schlaufe darüber (${uebergang.mittelAbw.toFixed(1)})`);
  const geschnitten = await messe(page, ab.signet[0] + 1.5), endeGeschnitten = await page.evaluate(() => window.__phorma.buehne.ende);
  assert.ok(endeGeschnitten < 1 && geschnitten.hell > 0.5, `während des Signets geschnitten (ende ${endeGeschnitten}, hell ${geschnitten.hell.toFixed(2)})`);
  await messe(page, (ab.stehen[0] + ab.stehen[1]) / 2);
  assert.equal(await page.evaluate(() => window.__phorma.buehne.ende), 1, "das Signet steht zuletzt unverändert");
  assert.deepEqual(fehler, []);
  await ctx.close();
});

// ein Zählvideo (wie in tests/phorma-iii.e2e.mjs): grau, links rot, rechts blau, in der Mitte die Nummer des Bilds in 3 × 3 Feldern (schwarz/weiss)
const zaehlvideo = (page, { sekunden = 16 } = {}) => page.evaluate(async (sekunden) => {
  const { Muxer, ArrayBufferTarget } = await import("/vendor/mp4-muxer-5.2.2/mp4-muxer.js");
  const w = 160, h = 128, c = document.createElement("canvas"); c.width = w; c.height = h; const x = c.getContext("2d");
  const muxer = new Muxer({ target: new ArrayBufferTarget(), video: { codec: "vp9", width: w, height: h }, fastStart: "in-memory" });
  let fehler = null;
  const enc = new VideoEncoder({ output: (ch, meta) => muxer.addVideoChunk(ch, meta), error: (e) => { fehler = e; } });
  enc.configure({ codec: "vp09.00.10.08", width: w, height: h, bitrate: 1_500_000, framerate: 30 });
  for (let i = 0; i < sekunden * 30; i++) {
    x.fillStyle = "#808080"; x.fillRect(0, 0, w, h);
    x.fillStyle = "#e01010"; x.fillRect(0, 0, 40, h); x.fillStyle = "#1030e0"; x.fillRect(w - 40, 0, 40, h);
    for (let b = 0; b < 9; b++) { x.fillStyle = (i >> b) & 1 ? "#ffffff" : "#000000"; x.fillRect(56 + (b % 3) * 16, 40 + Math.floor(b / 3) * 16, 16, 16); }
    const f = new VideoFrame(c, { timestamp: Math.round((i * 1e6) / 30), duration: Math.round(1e6 / 30) });
    enc.encode(f, { keyFrame: i % 30 === 0 }); f.close();
    while (enc.encodeQueueSize > 4) await new Promise((ok) => setTimeout(ok, 2));
  }
  await enc.flush(); if (fehler) throw fehler; muxer.finalize();
  const a = new Uint8Array(muxer.target.buffer); let s = ""; for (let i = 0; i < a.length; i += 32768) s += String.fromCharCode(...a.subarray(i, i + 32768));
  return btoa(s);
}, sekunden).then((b) => Buffer.from(b, "base64"));
/** die Nummer des Zählvideos in einem Bild (quelle: "film" – das Bild des Films zur Zeit t, wie der Export; "foto" – das Standbild) */
const nummer = (page, t, quelle = "film") => page.evaluate(async ([t, quelle]) => {
  const { bild } = await import("./film.js?v=23");
  const S = window.__phorma; S.laeuft = false;
  const sz = { ...S.sz, buehne: S.buehne, beschriftung: false }, w = S.mass[0] / 2, h = S.mass[1] / 2;
  const c = document.createElement("canvas"); c.width = w; c.height = h; const x = c.getContext("2d");
  if (quelle === "foto") x.drawImage(S.foto, 0, 0, w, h);
  else { x.setTransform(0.5, 0, 0, 0.5, 0, 0); await S.filmVorbereiten(sz, t, 1); bild(x, sz, t, { proben: 1 }); x.setTransform(1, 0, 0, 1, 0, 0); }
  const s = Math.max(w / 160, h / 128);
  let nr = 0;
  for (let b = 0; b < 9; b++) { const d = x.getImageData(Math.round(w / 2 + (64 + (b % 3) * 16 - 80) * s), Math.round(h / 2 + (48 + Math.floor(b / 3) * 16 - 64) * s), 1, 1).data; if ((d[0] + d[1] + d[2]) / 3 > 128) nr |= 1 << b; }
  return nr;
}, [t, quelle]);

await check("Video als Quelle: Montage zeigt das laufende Video, es kommt am Ende beim Standbild an; Wachstum folgt ihm", async () => {
  const { ctx, page, fehler } = await oeffne({ ablauf: "montage" });
  await page.setInputFiles("#datei", { name: "zaehler.mp4", mimeType: "video/mp4", buffer: await zaehlvideo(page) });
  await page.waitForFunction(() => window.__phorma.film?.spur && window.__phorma.buehneFertig, null, { timeout: 240_000 });
  assert.equal(await page.isVisible("#film-start-box"), true, "«Video ab» erscheint");
  const { zeit } = await messe(page, 0), dauer = zeit.abschnitt.bis - zeit.abschnitt.von;
  assert.equal(await nummer(page, 0, "foto"), Math.round(dauer * 30), "das Standbild ist das Bild am Ende der Montage");
  // gegen Ende der Montage sind die Felder eingerastet: das Bild zeigt das laufende Video
  for (const tau of [dauer - 0.64, dauer - 0.6]) {   // eingerastet (bis 0,65 s vor dem Ende), noch nicht ins Standbild überblendet
    const n = await nummer(page, zeit.abschnitt.von + tau);
    assert.ok(Math.abs(n - Math.round(tau * 30)) <= 1, `bei ${tau.toFixed(2)} s das Bild ${Math.round(tau * 30)} des Videos (gelesen ${n})`);
  }
  assert.ok((await messe(page, zeit.abschnitt.bis - 1 / 30)).abw <= 3, "endet exakt beim Standbild");
  // ein anderer Effekt: das Wachstum (dauert länger, also ein anderes Standbild)
  await page.click('[data-wahl="wachstum"]');
  await page.waitForFunction(() => window.__phorma.ablauf === "wachstum" && window.__phorma.buehneFertig && window.__phorma.sz?.zeit.ablauf === "wachstum", null, { timeout: 240_000 });
  const z2 = (await messe(page, 0)).zeit, d2 = z2.abschnitt.bis - z2.abschnitt.von;
  assert.equal(await nummer(page, 0, "foto"), Math.round(d2 * 30), "neues Standbild am Ende des Wachstums");
  assert.ok((await messe(page, z2.abschnitt.bis - 1 / 30)).abw <= 3, "Wachstum endet exakt beim Standbild");
  assert.deepEqual(fehler, []);
  await ctx.close();
});

await check("Bewegungsunschärfe: acht Proben mitteln ein bewegtes Bild, das stehende Foto bleibt exakt", async () => {
  const { ctx, page, fehler } = await oeffne({ ablauf: "tuch" });
  await laden(page); await bereit(page);
  const { zeit } = await messe(page, 0);
  const t = zeit.phasen[0][2] + 3.2, eins = await messe(page, t), acht = await messe(page, t, { proben: 8 });
  assert.notEqual(eins.abdruck, acht.abdruck, "mit Unschärfe anders");
  assert.ok(Math.abs(eins.hell - acht.hell) < 6, `gleich hell (${eins.hell.toFixed(1)} / ${acht.hell.toFixed(1)})`);
  const steht = await messe(page, zeit.stehen[0] + 0.5, { proben: 8 });
  assert.ok(steht.abw <= 3, `stehendes Foto exakt (${steht.abw})`);
  assert.deepEqual(fehler, []);
  await ctx.close();
});

await check("Video über WebCodecs (Ersatz-Encoder): MP4 mit allen Bildern in 4 : 5; Standbild PNG in voller Grösse", async () => {
  const { ctx, page, fehler } = await oeffne({ vorher: ERSATZ_ENCODER, ablauf: "physarum" });
  await laden(page); await bereit(page);
  await page.uncheck("#unschaerfe"); await page.uncheck("#signet");
  await page.waitForFunction(() => !window.__phorma.sz.zeit.ab.signet);
  const bilder = await page.evaluate(() => window.__phorma.sz.zeit.bilder);
  await page.click("#video");
  await page.waitForSelector("#ergebnis:not([hidden])", { timeout: 600_000 });
  // der Ersatz-Encoder liest die Bilder nicht: die Grafik (SwiftShader, auf dem Prozessor) hängt dann weit hinterher; einmal Pixel lesen wartet sie ab
  await page.evaluate(() => { const gl = window.__phorma.buehne.canvas.getContext("webgl2"); gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array(4)); });
  const [dl] = await Promise.all([page.waitForEvent("download"), page.click("#laden")]);
  assert.match(dl.suggestedFilename(), /^phorma-ii-\d{4}-\d\d-\d\d-\d{4}\.mp4$/);
  const d = new Uint8Array(readFileSync(await dl.path()));
  const finde = (liste, ...pfad) => pfad.reduce((l, t) => (Array.isArray(l) ? l : l.kinder).find((x) => x.typ === t), liste);
  const stsz = finde(kisten(d), "moov", "trak", "mdia", "minf", "stbl", "stsz");
  assert.equal(new DataView(d.buffer).getUint32(stsz.o + 16), bilder, "alle Bilder im Video");
  assert.deepEqual(await page.evaluate(() => [window.__cfg.width, window.__cfg.height]), [1080, 1350]);
  await page.click(".phasen button:nth-child(2)");
  const [png] = await Promise.all([page.waitForEvent("download", { timeout: 120_000 }), page.click("#png")]);
  const b = readFileSync(await png.path());
  assert.deepEqual([b.readUInt32BE(16), b.readUInt32BE(20)], [1080, 1350]);
  assert.deepEqual(fehler, []);
  await ctx.close();
});

await check("Format 9 : 16 und zurück; das Foto steht in beiden exakt", async () => {
  const { ctx, page, fehler } = await oeffne({ ablauf: "tiefe" });
  await laden(page); await bereit(page);
  for (const [format, mass] of [["9:16", [1080, 1920]], ["4:5", [1080, 1350]]]) {
    await page.click(`[data-format="${format}"]`);
    await page.waitForFunction((m) => window.__phorma.sz?.breite === m[0] && window.__phorma.sz?.hoehe === m[1] && window.__phorma.buehne?.H === m[1] && !document.getElementById("video").disabled, mass, { timeout: 120_000 });
    const box = await page.locator("#vorschau").boundingBox();
    assert.ok(Math.abs(box.width / box.height - mass[0] / mass[1]) < 0.01);
    const ende = await messe(page, (await messe(page, 0)).zeit.stehen[0] + 0.4);
    assert.ok(ende.abw <= 3, `${format}: Foto exakt (${ende.abw})`);
  }
  assert.deepEqual(fehler, []);
  await ctx.close();
});

await check("Tiefe mit KI ohne Netz: Meldung, die geschätzte Tiefe bleibt, die Vorschau läuft weiter", async () => {
  const { ctx, page, fehler } = await oeffne({ ablauf: "tiefe" });
  await page.route(/^https:\/\/(cdn\.jsdelivr\.net|huggingface\.co)\//, (r) => r.abort());
  await laden(page); await bereit(page);
  await page.click('[data-tiefe="ki"]');
  assert.equal(await page.isVisible("#ki-hinweis"), true, "Hinweis zum Modell");
  await page.waitForFunction(() => /KI-Tiefe liess sich nicht laden/.test(document.getElementById("meldung").textContent), null, { timeout: 60_000 });
  assert.equal(await page.evaluate(() => window.__phorma.A.tiefe === window.__phorma.A.geschaetzt), true);
  const m = await messe(page, (await messe(page, 0)).zeit.phasen[1][2] + 1);
  assert.ok(m.hell > 5);
  assert.deepEqual(fehler.filter((f) => !/Failed to load resource|ERR_FAILED|net::/.test(f)), []);
  await page.click('[data-tiefe="bild"]');
  await ctx.close();
});

await check("Handy: nichts ragt seitlich hinaus, Beschriftungen auf einer Zeile", async () => {
  const { ctx, page, fehler } = await oeffne({ viewport: { width: 375, height: 740 }, isMobile: true, hasTouch: true });
  await laden(page); await bereit(page);
  assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth));
  assert.ok(await page.evaluate(() => [...document.querySelectorAll(".segment button")].every((x) => x.scrollWidth <= x.clientWidth + 1)), "Beschriftungen auf einer Zeile");
  assert.ok(await page.evaluate(() => [...document.querySelectorAll("[data-wahl], [data-effekt], .phasen button")].every((x) => x.getBoundingClientRect().right <= window.innerWidth)), "Effekte und Phasen passen");
  assert.deepEqual(fehler, []);
  await ctx.close();
});

await browser.close();
server.close();
const ok = ergebnisse.filter(Boolean).length;
console.log(`\n${ok}/${ergebnisse.length} bestanden`);
process.exit(ok === ergebnisse.length ? 0 : 1);
