// Prüft die Beispiele von threejs-spektakel in Chromium (Playwright, ohne Grafikkarte über SwiftShader): Seite lädt ohne Fehler, Bilder zu
// fünf Zeitpunkten sind nicht leer und verschieden, ein Sprung zurück ergibt dasselbe Bild (deterministisch), wahlweise ein Video.
//
//   NODE_PATH=$(npm root -g) node .claude/skills/threejs-spektakel/beispiele/pruefen.mjs [name …] [--video] [--voll]
//
// three.js kommt aus dem CDN (Import-Map). Ist das CDN gesperrt (Cloud-Sitzung), three@0.185.1 in einen Ordner installieren und
// THREE=/pfad/zu/node_modules/three setzen: die Anfragen an cdn.jsdelivr.net werden dann lokal beantwortet.
// Die Bilder landen in AUSGABE (Standard: Temp-Ordner) als <name>-<t>.jpg; --voll prüft in voller Grösse statt halber.
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { join } from "node:path";
import { readFileSync, readdirSync, mkdirSync, writeFileSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";

const require = createRequire(import.meta.url);
let playwright;
try { playwright = require("playwright"); } catch { playwright = require(join(process.env.NODE_PATH || "", "playwright")); }
const hier = new URL("./", import.meta.url), root = new URL("../../../../", import.meta.url);
const { startServer } = await import(new URL("tools/serve-orma.mjs", root).href);
const server = await startServer(0);
const port = server.address().port;

const args = process.argv.slice(2);
const mitVideo = args.includes("--video"), voll = args.includes("--voll");
const namen = args.filter((a) => !a.startsWith("--"));
const alle = readdirSync(hier).filter((f) => f.endsWith(".html")).map((f) => f.slice(0, -5)).sort();
const auswahl = namen.length ? namen : alle;
// BILD=/pfad/zum/foto.jpg: eigenes Testfoto statt des Beispielbilds von Bildfragmentieren
const BILD = process.env.BILD;
const AUSGABE = process.env.AUSGABE || join(tmpdir(), "threejs-spektakel");
mkdirSync(AUSGABE, { recursive: true });

const THREE = process.env.THREE;
if (THREE) assert.ok(existsSync(join(THREE, "build/three.module.js")), `THREE=${THREE}: dort liegt kein three.js`);
const TYPEN = { ".js": "text/javascript", ".json": "application/json", ".wasm": "application/wasm" };

const browser = await playwright.chromium.launch({ args: ["--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"] });
const ergebnisse = [];
async function check(name, fn) {
  const t0 = Date.now();
  try { await fn(); ergebnisse.push(true); console.log("ok  ", name, `(${((Date.now() - t0) / 1000).toFixed(1)} s)`); }
  catch (e) { ergebnisse.push(false); console.log("FAIL", name, "\n     ", String(e.message).split("\n").slice(0, 10).join("\n      ")); }
}

/** im Browser: Bild zur Zeit t rechnen, Kennzahlen (Mittel, Streuung) und ein JPEG zurückgeben */
const messen = async (page, t) => page.evaluate(async (t) => {
  const F = window.__film;
  await F.bild(t);
  const quelle = F.renderer.domElement, w = 160, h = Math.round((160 * quelle.height) / quelle.width);
  const c = document.createElement("canvas"); c.width = w; c.height = h;
  const x = c.getContext("2d"); x.drawImage(quelle, 0, 0, w, h);
  const d = x.getImageData(0, 0, w, h).data;
  let s = 0, s2 = 0; const grau = new Float32Array(w * h);
  for (let i = 0; i < w * h; i++) { const g = (d[i * 4] + d[i * 4 + 1] + d[i * 4 + 2]) / 3; grau[i] = g; s += g; s2 += g * g; }
  const mittel = s / (w * h), streuung = Math.sqrt(s2 / (w * h) - mittel * mittel);
  const gross = document.createElement("canvas"); gross.width = quelle.width; gross.height = quelle.height;
  gross.getContext("2d").drawImage(quelle, 0, 0);
  return { mittel, streuung, grau: [...grau], jpeg: gross.toDataURL("image/jpeg", 0.85) };
}, t);
const abstand = (a, b) => a.grau.reduce((s, g, i) => s + Math.abs(g - b.grau[i]), 0) / a.grau.length;

for (const name of auswahl) {
  await check(`${name}: lädt, fünf Bilder nicht leer und verschieden, Sprung zurück deterministisch`, async () => {
    const ctx = await browser.newContext({ viewport: { width: 900, height: 1100 } });
    const page = await ctx.newPage();
    const fehler = [];
    page.on("pageerror", (e) => fehler.push(e.message));
    page.on("console", (m) => { if (m.type() === "error") fehler.push(m.text()); });
    if (THREE) await page.route(/cdn\.jsdelivr\.net\/npm\/three@0\.185\.1\//, (route) => {
      const pfad = new URL(route.request().url()).pathname.replace(/^\/npm\/three@[^/]+\//, "");
      try { route.fulfill({ status: 200, contentType: TYPEN[pfad.slice(pfad.lastIndexOf("."))] || "application/octet-stream", body: readFileSync(join(THREE, pfad)) }); }
      catch { route.fulfill({ status: 404, body: "fehlt" }); }
    });
    if (BILD) await page.route((url) => url.pathname === "/__testbild", (route) => route.fulfill({ status: 200, contentType: "image/jpeg", body: readFileSync(BILD) }));
    const bild = BILD ? "/__testbild" : "/alpha/bildfragmentieren/beispiel.jpg";
    await page.goto(`http://localhost:${port}/.claude/skills/threejs-spektakel/beispiele/${name}.html?${voll ? "" : "test&"}bild=${bild}`);
    // fertig, Fehlermeldung auf der Seite oder ein Fehler beim Laden der Module (dann gibt es keine Meldung)
    await Promise.race([
      page.waitForFunction(() => window.__film?.bereit || document.querySelector(".meldung.fehler"), null, { timeout: 180_000 }),
      new Promise((_, nein) => page.once("pageerror", (e) => nein(new Error(`Fehler beim Laden: ${e.message}`)))),
    ]);
    assert.deepEqual(fehler, [], "Fehler beim Laden");
    const dauer = await page.evaluate(() => window.__film.dauer);
    assert.ok(dauer > 3 && dauer < 60, `Dauer ${dauer}`);
    const zeiten = [0.05, 0.25, 0.5, 0.75, 0.98].map((a) => Math.round(a * dauer * 30) / 30);
    const bilder = [];
    for (const t of zeiten) {
      const m = await messen(page, t);
      writeFileSync(join(AUSGABE, `${name}-${t.toFixed(2)}.jpg`), Buffer.from(m.jpeg.split(",")[1], "base64"));
      assert.ok(m.streuung > 6, `t = ${t}: Bild fast leer (Streuung ${m.streuung.toFixed(1)}, Mittel ${m.mittel.toFixed(1)})`);
      bilder.push(m);
    }
    const unterschied = Math.max(...bilder.slice(1).map((b) => abstand(bilder[0], b)));
    assert.ok(unterschied > 5, `das Bild ändert sich kaum (${unterschied.toFixed(1)})`);
    // deterministisch: dasselbe t nach einem Sprung zurück
    const mitte = zeiten[2], wieder = await messen(page, mitte);
    const d = abstand(bilder[2], wieder);
    assert.ok(d < 1.5, `t = ${mitte} nach Sprung zurück anders (${d.toFixed(2)})`);
    assert.deepEqual(fehler, [], "Fehler beim Rechnen");
    if (mitVideo) {
      const { n, groesse } = await page.evaluate(async () => {
        let n = 0; const alt = window.VideoEncoder;
        window.VideoEncoder = class {                                        // Ersatz: Chromium hat hier kein H.264
          static async isConfigSupported(cfg) { return { supported: true, config: cfg }; }
          constructor({ output }) { this.output = output; this.encodeQueueSize = 0; }
          configure() {}
          encode(frame, { keyFrame }) {
            this.output({ type: keyFrame ? "key" : "delta", byteLength: 8, copyTo: (z) => z.set(new Uint8Array(8).fill(n & 255)) },
              n++ ? {} : { decoderConfig: { description: new Uint8Array([1, 0x64, 0, 0x28, 0xff, 0xe1, 0, 1, 0x67, 1, 0, 1, 0x68]).buffer } });
          }
          async flush() {} close() {}
        };
        const blob = await window.__film.video();
        window.VideoEncoder = alt;
        return { n, groesse: blob.size };
      });
      assert.equal(n, Math.round(dauer * 30), "jedes Bild im Video");
      assert.ok(groesse > n * 8, "MP4 geschrieben");
    }
    await ctx.close();
  });
}

await browser.close();
server.close();
console.log(`\n${ergebnisse.filter(Boolean).length}/${ergebnisse.length} bestanden · Bilder in ${AUSGABE}`);
process.exit(ergebnisse.every(Boolean) ? 0 : 1);
