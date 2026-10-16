// «Bildfragmentieren» (alpha/bildfragmentieren/) – Browser-Tests (Playwright, Chromium): ein Testfoto zerlegen, Bilder des Films in den vier Phasen
// (Linien, Formen als Schraffur, Farben, das Foto), Abspann, Video über WebCodecs (Ersatz-Encoder, Chromium hat hier kein H.264), Standbild,
// Formate 4 : 5 und 9 : 16, Grund weiss, Handy ohne seitliches Scrollen, keine Anfragen nach aussen; Abläufe Kristall und Echo (WebGL, three.js lokal).
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
  const { bild, szene } = await import("./szene.js?v=18");
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
  // die Sonne: Mittel eines kleinen Felds (der Stich in 02/03 hat Lücken zwischen den Linien)
  const sonne = [0, 0, 0];
  let m = 0;
  for (let yy = my - 12; yy <= my + 12; yy++) for (let xx = mx - 12; xx <= mx + 12; xx++) { const k = (yy * sz.breite + xx) * 4; sonne[0] += d[k]; sonne[1] += d[k + 1]; sonne[2] += d[k + 2]; m++; }
  return { grund: grund / n, grau: grau / n, bunt: bunt / n, sonne: sonne.map((v) => Math.round(v / m)), t, dauer: sz.zeit.dauer };
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
  // nach dem Ende beginnt «Abspielen» wieder von vorn (Rückmeldung vom 15. Oktober 2026: sprang nur ins letzte Kapitel)
  await page.evaluate(() => { const z = document.getElementById("zeit"); z.value = String(window.__bildfragmentieren.sz.zeit.dauer - 0.3); z.dispatchEvent(new Event("input")); });
  await page.click("#spielen");
  await page.waitForFunction(() => !window.__bildfragmentieren.laeuft, null, { timeout: 5000 });
  assert.ok(await page.evaluate(() => window.__bildfragmentieren.ende), "am Ende angekommen");
  assert.ok(await page.evaluate(() => { const S = window.__bildfragmentieren, z = document.getElementById("zeit"); return S.t > S.sz.zeit.dauer - 0.1 && Number(z.value) > S.sz.zeit.dauer - 0.1; }),
    "am Ende bleibt die Vorschau auf dem letzten Bild, der Regler ganz rechts (sprang früher zurück ins stehende Bild)");
  await page.click("#spielen");
  await page.waitForTimeout(300);
  assert.ok(await page.evaluate(() => window.__bildfragmentieren.laeuft && window.__bildfragmentieren.t < 2), "beginnt wieder von vorn");
  assert.deepEqual(fehler, []); assert.deepEqual(fremd, []);
  await ctx.close();
});

await check("Beispielbild: «Mit dem Beispielbild ausprobieren» lädt beispiel.jpg, zerlegt es und spielt ab", async () => {
  const { ctx, page, fehler, fremd } = await oeffne();
  await page.click("#testbild");
  await bereit(page);
  assert.match(await page.getAttribute("#quelle", "src"), /^blob:/, "Vorschaubild gesetzt");
  assert.deepEqual(await page.evaluate(() => [window.__bildfragmentieren.bild.width, window.__bildfragmentieren.bild.height]), [1131, 1600], "das Beispielbild in voller Grösse");
  assert.ok(await page.evaluate(() => window.__bildfragmentieren.daten.kanten.length > 50), "viele Kanten im Beispiel");
  assert.deepEqual(fehler, []); assert.deepEqual(fremd, []);
  await ctx.close();
});

await check("Die vier Phasen: Linien auf Schwarz, Formen als Schraffur, dann Farben, am Ende das Foto; mit Abspann leerer Schluss", async () => {
  const { ctx, page, fehler } = await oeffne();
  await laden(page);
  await bereit(page);
  const linien = await messe(page, "linien", 0.8), formen = await messe(page, "formen", 0.95), farben = await messe(page, "farben", 0.98), bild = await messe(page, "stehen", 0.3);
  assert.ok(linien.grund > 0.6 && linien.bunt < 0.01, `Linien: weisse Linien auf Schwarz (${JSON.stringify(linien)})`);
  // Formen: ein schraffiertes Mosaik ohne Farbe; Grund (leere Stufe und Lücken der Schraffur) und Tinte (Linien, volle Flächen) gemischt (seit 15. Oktober 2026)
  assert.ok(formen.bunt < 0.01 && formen.grund > 0.15 && formen.grund < 0.9 && formen.grau > 0.1, `Formen: schraffiertes Mosaik in Schwarz-Weiss (${JSON.stringify(formen)})`);
  assert.ok(farben.bunt > 0.85, `Farben: bunt (${JSON.stringify(farben)})`);
  const [r, g, b] = farben.sonne;
  assert.ok(r > 110 && g > 0.7 * r && b < 0.5 * g, `die Sonne ist gelb getönt (${farben.sonne})`);
  const [r2, g2, b2] = bild.sonne;
  assert.ok(Math.abs(r2 - 255) < 20 && Math.abs(g2 - 210) < 25 && b2 < 90, `das Foto steht (${bild.sonne})`);
  assert.ok(bild.bunt > 0.95, "ganz das Foto, ohne Gitter");
  // beim Zusammensetzen: Teile schon Splitter des Fotos, Teile noch Mosaik
  const um = await messe(page, "zusammen", 0.4);
  assert.ok(um.bunt > 0.6, `beim Zusammensetzen bunt (${JSON.stringify(um)})`);
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

await check("Formen als Stich folgen dem Foto Bildpunkt für Bildpunkt: dunkle Teile dicht, helle leer (auf Weiss), auf Schwarz umgekehrt", async () => {
  const { ctx, page, fehler } = await oeffne();
  await laden(page);
  await bereit(page);
  // Testfoto: rote Fläche (dunkel) unten in der Mitte, gelbe Sonne (hell) oben; gemessen wird die Tinte in beiden Bereichen am Ende von 02
  const tinte = (grund) => page.evaluate(async (grund) => {
    const { bild, szene } = await import("./szene.js?v=18");
    const S = window.__bildfragmentieren, sz = szene(S.daten, { breite: S.mass[0], hoehe: S.mass[1], foto: S.foto, leinwand: (w, h) => new OffscreenCanvas(w, h), beschriftung: false, grund });
    const c = document.createElement("canvas"); c.width = sz.breite; c.height = sz.hoehe; const x = c.getContext("2d");
    bild(x, sz, sz.zeit.ab.farben[0] - 0.05);
    const mittel = (x0, y0, x1, y1) => { const d = x.getImageData(x0, y0, x1 - x0, y1 - y0).data; let s = 0; for (let i = 0; i < d.length; i += 4) s += d[i]; return s / (d.length / 4); };
    const B = sz.breite, H = sz.hoehe;   // das quere Testfoto ist auf 4 : 5 beschnitten: Sonne und rote Fläche liegen in der Mitte
    return { rot: mittel(B * 0.45, H * 0.68, B * 0.55, H * 0.78), sonne: mittel(B * 0.47, H * 0.27, B * 0.53, H * 0.33) };
  }, grund);
  const w = await tinte("weiss"), s = await tinte("schwarz");
  assert.ok(w.rot < w.sonne - 60, `auf Weiss: die dunkle Fläche dicht gestochen, die helle Sonne fast leer (${JSON.stringify(w)})`);
  assert.ok(s.sonne > s.rot + 60, `auf Schwarz: die helle Sonne dicht, die dunkle Fläche leerer (${JSON.stringify(s)})`);
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
        const { bild, szene } = await import("./szene.js?v=18");
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

/** im Browser: Bilder eines Ablaufs messen (halbe Grösse, ohne Beschriftung): Abstand zum Foto, Anteil Grund; mit oder ohne raum.js */
const raumMessen = (page, zeiten, mitRaum = true) => page.evaluate(async ([zeiten, mitRaum]) => {
  const { bild, szene } = await import("./szene.js?v=18");
  const S = window.__bildfragmentieren, sz = szene(S.daten, { breite: S.mass[0], hoehe: S.mass[1], foto: S.foto, leinwand: (w, h) => new OffscreenCanvas(w, h), beschriftung: false,
    ablauf: S.ablauf, raum: mitRaum ? S.raum : null });
  const w = sz.breite / 2, h = sz.hoehe / 2, c = document.createElement("canvas"); c.width = w; c.height = h;
  const x = c.getContext("2d", { willReadFrequently: true }); x.setTransform(0.5, 0, 0, 0.5, 0, 0);
  const v = document.createElement("canvas"); v.width = w; v.height = h;
  const vx = v.getContext("2d", { willReadFrequently: true }); vx.drawImage(sz.foto, 0, 0, w, h); const f = vx.getImageData(0, 0, w, h).data;
  const T = { ...sz.zeit, ...Object.fromEntries(sz.zeit.phasen.map((p) => [p.name, p])) };
  return zeiten.map((ausdruck) => {
    const t = new Function("z", `return ${ausdruck};`)(T);
    bild(x, sz, t);
    const d = x.getImageData(0, 0, w, h).data;
    let s = 0, dunkel = 0, n = 0;
    for (let i = 0; i < d.length; i += 4) { s += Math.abs(d[i] - f[i]) + Math.abs(d[i + 1] - f[i + 1]) + Math.abs(d[i + 2] - f[i + 2]); if (d[i] < 24 && d[i + 1] < 24 && d[i + 2] < 24) dunkel++; n++; }
    return { t, foto: s / n / 3, dunkel: dunkel / n, summe: [...d].filter((_, i) => i % 97 === 0) };
  });
}, [zeiten, mitRaum]);
const verschieden = (a, b) => a.summe.reduce((s, v, i) => s + Math.abs(v - b.summe[i]), 0) / a.summe.length;

await check("Abläufe Kristall und Echo: beginnen im Dunkeln, enden exakt beim Foto (three.js lokal, erst auf Wahl); Echo deterministisch; leuchtendes Signet", async () => {
  const { ctx, page, fehler, fremd } = await oeffne();
  await laden(page);
  await bereit(page);
  const geladen = () => page.evaluate(() => performance.getEntriesByType("resource").some((e) => e.name.includes("/vendor/three-0.185.1/three.module.min.js")));
  assert.equal(await geladen(), false, "Fragmente: three.js wird nicht geladen");
  // Kristall
  await page.click('[data-ablauf="kristall"]');
  await page.waitForFunction(() => window.__bildfragmentieren.sz?.raum?.art === "kristall", null, { timeout: 90_000 });
  assert.equal(await geladen(), true, "three.js aus vendor/");
  assert.deepEqual(await page.$$eval(".phasen button", (b) => b.map((x) => x.textContent)), ["01 Körper", "02 Bruch", "03 Montage"]);
  const [anfang, koerper, bruch, montage, ende, stehen] = await raumMessen(page,
    ["0.1", "z.koerper.von + 0.4", "z.bruch.von + 0.5 * (z.bruch.bis - z.bruch.von)", "z.montage.von + 0.5 * (z.montage.bis - z.montage.von)", "z.abschnitt.bis - 0.02", "z.ab.stehen[0] + 0.3"]);
  assert.ok(anfang.dunkel > 0.98 && koerper.dunkel > 0.6, `beginnt im Dunkeln (${anfang.dunkel}, ${koerper.dunkel})`);
  assert.ok(bruch.foto > 15 && montage.foto > 3, `Bruch und Montage zeigen noch nicht das Foto (${bruch.foto}, ${montage.foto})`);
  assert.ok(montage.foto < bruch.foto, "in der Montage setzt sich das Foto zusammen");
  assert.ok(ende.foto < 3 && stehen.foto < 4, `endet exakt beim Foto (${ende.foto}, ${stehen.foto})`);
  // Signet: die leuchtende Fassung unterscheidet sich von der einfachen
  const [glanz] = await raumMessen(page, ["z.ab.signetStehen[0] + 0.2"]), [einfach] = await raumMessen(page, ["z.ab.signetStehen[0] + 0.2"], false);
  assert.ok(verschieden(glanz, einfach) > 1, `leuchtendes Signet (${verschieden(glanz, einfach)})`);
  // Standbild mitten im Bruch, in voller Grösse
  await page.click("#zu-bruch");
  const [png] = await Promise.all([page.waitForEvent("download"), page.click("#png")]);
  const b = readFileSync(await png.path());
  assert.deepEqual([b.readUInt32BE(16), b.readUInt32BE(20)], [1080, 1350]);
  // Echo: Rückkopplung, deterministisch beim Springen
  await page.click('[data-ablauf="echo"]');
  await page.waitForFunction(() => window.__bildfragmentieren.sz?.raum?.art === "echo", null, { timeout: 90_000 });
  assert.deepEqual(await page.$$eval(".phasen button", (b) => b.map((x) => x.textContent)), ["01 Konturen", "02 Echo", "03 Bild"]);
  const [e0, eMitte, eKonturen, eMitte2, eEnde] = await raumMessen(page,
    ["z.konturen.von + 0.05", "z.echo.von + 0.6 * (z.echo.bis - z.echo.von)", "z.konturen.von + 1", "z.echo.von + 0.6 * (z.echo.bis - z.echo.von)", "z.abschnitt.bis - 0.02"]);
  assert.ok(e0.dunkel > 0.9 && eKonturen.dunkel > 0.4, `beginnt im Dunkeln, feine Linien (${e0.dunkel}, ${eKonturen.dunkel})`);
  assert.ok(verschieden(eMitte, eMitte2) < 1, `nach einem Sprung zurück dasselbe Bild (${verschieden(eMitte, eMitte2)})`);
  assert.ok(eMitte.foto > 15 && eEnde.foto < 3, `endet exakt beim Foto (${eMitte.foto}, ${eEnde.foto})`);
  await page.reload();
  assert.deepEqual(await page.$$eval("[data-ablauf]", (b) => b.map((x) => x.getAttribute("aria-pressed"))), ["false", "false", "true"], "die Wahl bleibt");
  assert.deepEqual(fehler, []); assert.deepEqual(fremd, []);
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
  assert.ok(await page.evaluate(() => [...document.querySelectorAll("[data-ablauf]")].every((x) => x.getBoundingClientRect().right <= window.innerWidth)), "Abläufe passen");
  assert.deepEqual(fehler, []);
  await ctx.close();
});

await browser.close();
server.close();
const ok = ergebnisse.filter(Boolean).length;
console.log(`\n${ok}/${ergebnisse.length} bestanden`);
process.exit(ok === ergebnisse.length ? 0 : 1);
