// «PHORMA II» – Bilder für die Karte auf «Apps» und die Vorschaukachel zum Teilen (Wunsch vom 19. Oktober 2026: «Ich brauche dann auch noch ein
// qualitativ besseres Bild für die Beitragskarte von PHORMA II»), wie bei PHORMA I und III (tools/phorma-bilder.mjs, tools/phorma-iii-bilder.mjs) von
// der Anwendung selbst gerechnet (alpha/phorma-ii/, Effekt «Wachstum», das Beispielbild), in voller Grösse (1080 × 1350, vier Proben je Bild) und erst
// dann verkleinert, ohne Beschriftung und ohne Schriftzug.
//   Motiv: die leuchtende Linie, mitten in der Phase «Farbe» (sie hat das Motiv gefüllt und nimmt seine Farben an)
//   assets/vorschau-phorma-ii.jpg            640 × 800   Beitragsbild der Karte auf «Apps»
//   assets/vorschau-phorma-ii-2x.jpg        1280 × 1600  dasselbe doppelt so gross, für Bildschirme mit hoher Dichte (srcset)
//   alpha/phorma-ii/og-phorma-ii.jpg        1200 × 630   Vorschaukachel zum Teilen (Open Graph, X)
//
//   NODE_PATH=$(npm root -g) node tools/phorma-ii-bilder.mjs
import { createRequire } from "node:module";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
let playwright;
try { playwright = require("playwright"); } catch { playwright = require(join(process.env.NODE_PATH || "", "playwright")); }
const { startServer } = await import(new URL("./serve-orma.mjs", import.meta.url).href);
const server = await startServer(0);
const base = `http://localhost:${server.address().port}/`;
const browser = await playwright.chromium.launch({ args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader"] });
const pfad = (p) => fileURLToPath(new URL(p, import.meta.url));

// 1. das Wachstum mit dem Beispielbild, Format 4 : 5; ein Bild der Bühne (WebGL, ohne die Schrift aus film.js)
const page = await browser.newPage({ viewport: { width: 1280, height: 950 } });
await page.addInitScript(() => { try { localStorage.setItem("phorma-ii.ablauf", "wachstum"); localStorage.setItem("phorma-ii.format", "4:5"); } catch { /* egal */ } });
await page.goto(`${base}alpha/phorma-ii/`);
await page.click("#testbild");
await page.waitForFunction(() => window.__phorma?.ablauf === "wachstum" && window.__phorma.buehneFertig && !document.getElementById("video").disabled, null, { timeout: 600_000 });
const linie = await page.evaluate(() => {
  const S = window.__phorma, Z = S.sz.zeit, p = Z.phasen.find((x) => x.name === "farbe");
  S.laeuft = false;
  const c = S.buehne.bild(Z, p.von + 0.5 * (p.bis - p.von), S.mass[0], S.mass[1], { proben: 4 }), k = document.createElement("canvas");
  k.width = c.width; k.height = c.height; k.getContext("2d").drawImage(c, 0, 0);
  return k.toDataURL("image/png");
});
await page.close();

// 2. Beitragsbild für «Apps»: das ganze Bild, sorgfältig verkleinert (das Hochformat der Karten ist das des Films), einfach und doppelt so gross
for (const [b, datei, qualitaet] of [[640, "vorschau-phorma-ii.jpg", 90], [1080, "vorschau-phorma-ii-2x.jpg", 86]]) {
  const h = Math.round((b * 5) / 4), p = await browser.newPage({ viewport: { width: b, height: h }, deviceScaleFactor: 1 });
  await p.setContent(`<!DOCTYPE html><html><head><style>html,body{margin:0;background:#000}canvas{display:block}</style></head><body><canvas width="${b}" height="${h}"></canvas></body></html>`);
  await p.evaluate(async ([src, b, h]) => {
    const bild = new Image(); bild.src = src; await bild.decode();
    // in zwei Schritten verkleinern (1080 → 860 → 640): die feinen Linien bleiben scharf und flimmern nicht
    const zb = Math.round((bild.width + b) / 2), zh = Math.round((bild.height + h) / 2);
    const z = new OffscreenCanvas(zb, zh), zx = z.getContext("2d"); zx.imageSmoothingQuality = "high"; zx.drawImage(bild, 0, 0, zb, zh);
    const x = document.querySelector("canvas").getContext("2d"); x.imageSmoothingQuality = "high"; x.drawImage(z, 0, 0, b, h);
  }, [linie, b, h]);
  const out = pfad(`../assets/${datei}`);
  await p.locator("canvas").screenshot({ path: out, type: "jpeg", quality: qualitaet });
  console.log("geschrieben:", out);
  await p.close();
}

// 3. Vorschaukachel zum Teilen: links Titel und Satz, rechts die leuchtende Linie
{
  const p = await browser.newPage({ viewport: { width: 1200, height: 630 }, deviceScaleFactor: 1 });
  await p.setContent(`<!DOCTYPE html><html lang="de"><head><meta charset="utf-8"><base href="${base}"><link rel="stylesheet" href="vendor/fonts/fonts.css"><style>
    html, body { margin: 0; width: 1200px; height: 630px; overflow: hidden; background: #000; }
    img { position: absolute; right: 0; top: -40px; width: 568px; height: 710px; }
    .schatten { position: absolute; left: 0; top: 0; width: 760px; height: 630px; background: linear-gradient(90deg, #000 78%, transparent); }
    .text { position: absolute; left: 64px; top: 0; bottom: 0; width: 560px; display: flex; flex-direction: column; justify-content: center; color: #ebe6dc; }
    .marke { font: 600 15px/1 "Instrument Sans", sans-serif; letter-spacing: 0.16em; text-transform: uppercase; color: #9a9388; margin: 0 0 22px; }
    h1 { font: 400 88px/0.95 "Newsreader", serif; letter-spacing: 0.01em; margin: 0; white-space: nowrap; }
    p { font: 400 30px/1.32 "Newsreader", serif; margin: 26px 0 0; color: #ebe6dc; }
    .fuss { margin-top: 38px; font: 400 19px/1.45 "Instrument Sans", sans-serif; color: #9a9388; }
    .fuss b { display: block; font-weight: 500; color: #f08a5d; }
  </style></head><body>
    <img src="${linie}"><div class="schatten"></div>
    <div class="text">
      <div class="marke">Alpha · Video im Hochformat</div>
      <h1>PHORMA II</h1>
      <p>Aus Foto oder Video wird ein Film – Wachstum, Netz, Scan, Tuch und Montage.</p>
      <div class="fuss"><b>ornament.cloud/alpha/phorma-ii</b>Alles bleibt auf dem Gerät.</div>
    </div></body></html>`);
  await p.evaluate(() => document.fonts.ready);
  await p.waitForTimeout(400);
  const out = pfad("../alpha/phorma-ii/og-phorma-ii.jpg");
  await p.screenshot({ path: out, type: "jpeg", quality: 88 });
  console.log("geschrieben:", out);
  await p.close();
}

await browser.close();
server.close();
