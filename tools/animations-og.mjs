// «Animationen» – die Vorschaukarte zum Teilen (Open Graph, X-Karte; 1200 × 630), gerechnet mit dem Motor der Seite selbst (4. November 2026,
// Wunsch: «eine tolle vorschaukachel für social media»). Ohne Foto: ein gezeichnetes Ausgangsbild (weiche Lichtflecken) treibt sechs Effekte
// mit «Bild zeigen: aus», sodass nur die Effekte zu sehen sind. Links das Wort «Animationen» mit dem Punkt im Akzent und der Satz der Seite.
// Seit 4. November 2026 (spät) in der kalten Palette der Seite (Blauschwarz, Kaltweiss, Säuregrün) und in Hanken Grotesk.
//   animations/og-animationen.jpg   1200 × 630, JPEG unter 300 KB (WhatsApp)
//
//   NODE_PATH=$(npm root -g) node tools/animations-og.mjs
import { createRequire } from "node:module";
import { join } from "node:path";
import { writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
let playwright;
try { playwright = require("playwright"); } catch { playwright = require(join(process.env.NODE_PATH || "", "playwright")); }
const { startServer } = await import(new URL("./serve-orma.mjs", import.meta.url).href);
const server = await startServer(0);
const base = `http://localhost:${server.address().port}/`;
const browser = await playwright.chromium.launch({ args: ["--use-angle=swiftshader", "--enable-unsafe-swiftshader"] });

const EFFEKTE = [["hoehenlinien", [.5, .3, .4, .3, .35, .45]], ["stroemung", [.55, .4, .35, .3, .6]], ["raster", [.5, .5, .5, .5, 0, .5]], ["voxel", [.45, .5, .5, .5, .5]], ["relief", [.55, .45, .45, .4, .2]], ["roentgen", [.6, .5, .5, .5, .3]]];

// 1. die Kacheln aus dem Motor: ein gezeichnetes Ausgangsbild, sechs Effekte ohne Bild, je 480 × 600
const seite = await browser.newPage({ viewport: { width: 1280, height: 900 } });
await seite.goto(`${base}animations/`);
await seite.waitForFunction(() => document.documentElement.classList.contains("bereit"), null, { timeout: 120000 });
const kacheln = await seite.evaluate(async (EFFEKTE) => {
  const { motor } = window.animationen;
  const c = document.createElement("canvas"); c.width = 800; c.height = 1000;
  const g = c.getContext("2d");
  g.fillStyle = "#000"; g.fillRect(0, 0, 800, 1000);
  const flecken = [[400, 420, 360, "#c9ff3d"], [180, 760, 260, "#e9ecf2"], [640, 230, 220, "#5aa8ff"], [620, 820, 300, "#3a7000"], [240, 200, 180, "#fff"]];
  for (const [x, y, r, farbe] of flecken) { const v = g.createRadialGradient(x, y, 0, x, y, r); v.addColorStop(0, farbe); v.addColorStop(1, "rgba(0,0,0,0)"); g.fillStyle = v; g.fillRect(0, 0, 800, 1000); }
  g.strokeStyle = "rgba(255,255,255,.5)"; g.lineWidth = 14; g.beginPath(); g.ellipse(400, 520, 250, 330, .3, 0, Math.PI * 2); g.stroke();
  await motor.bildLaden("og", c.toDataURL("image/png"));
  const aus = [];
  for (const [effekt, werte] of EFFEKTE) {
    motor.zeichnen({ bild: "og", grund: "schwarz", ohneBild: true, ebenen: [{ effekt, werte, modus: "normal", deckkraft: 1, quelle: "bild", seed: 3 }] }, 4.6, 480, 600);
    const k = document.createElement("canvas"); k.width = 480; k.height = 600; k.getContext("2d").drawImage(motor.leinwand, 0, 0);
    aus.push(k.toDataURL("image/jpeg", .9));
  }
  return aus;
}, EFFEKTE);
await seite.close();

// 2. die Karte: links Titel und Satz, rechts die sechs Kacheln, gesetzt wie die Seite (Hanken Grotesk, Haarlinien)
const html = `<!DOCTYPE html><html lang="de"><head><meta charset="utf-8"><link rel="stylesheet" href="${base}vendor/fonts/animationen.css"><style>
html, body { margin: 0; width: 1200px; height: 630px; overflow: hidden; background: #08090c; color: #e9ecf2; font-family: "Hanken Grotesk", "Helvetica Neue", Helvetica, system-ui, sans-serif; }
.karte { position: relative; width: 1200px; height: 630px; display: grid; grid-template-columns: 520px 1fr; }
.links { padding: 56px 0 56px 64px; display: grid; align-content: space-between; border-right: 1px solid rgba(233,236,242,.14); }
.marke { font-size: 22px; font-weight: 500; letter-spacing: -.01em; }
.marke b { color: #c9ff3d; font-weight: 500; }
h1 { margin: 0; font-size: 78px; font-weight: 600; line-height: .95; letter-spacing: -.045em; white-space: nowrap; }
h1 i { display: block; font-style: normal; font-weight: 300; font-size: 58px; letter-spacing: -.02em; margin-top: 10px; color: #c9ff3d; }
.satz { font-size: 20px; line-height: 1.35; color: rgba(233,236,242,.62); max-width: 24ch; margin: 0; }
.etikett { font-size: 12px; letter-spacing: .12em; text-transform: uppercase; color: rgba(233,236,242,.56); font-weight: 600; }
.rechts { display: grid; grid-template-columns: repeat(3, 1fr); grid-template-rows: repeat(2, 1fr); gap: 1px; background: rgba(233,236,242,.14); }
.rechts img { display: block; width: 100%; height: 100%; object-fit: cover; }
.linie { position: absolute; left: 64px; right: 0; bottom: 48px; height: 1px; background: rgba(233,236,242,.14); width: 392px; }
.linie i { position: absolute; left: 0; top: 0; height: 1px; width: 38%; background: #c9ff3d; }
</style></head><body><div class="karte">
<div class="links"><div><div class="etikett">ornament.cloud/animations</div></div>
<h1>Anima<span style="white-space:nowrap">tionen<b style="color:#c9ff3d;font-weight:600">.</b></span><i>Mischpult</i></h1>
<p class="satz">Dein Bild, dreissig Effekte, drei Ebenen. Mischen, als MP4 laden, als Werk mit deinem Namen sichern.</p>
<div class="linie"><i></i></div></div>
<div class="rechts">${kacheln.map((k) => `<img src="${k}" alt="">`).join("")}</div>
</div></body></html>`;
const karte = await browser.newPage({ viewport: { width: 1200, height: 630 }, deviceScaleFactor: 1 });
await karte.setContent(html, { waitUntil: "load" });
await karte.evaluate(() => document.fonts.ready);
const ziel = fileURLToPath(new URL("../animations/og-animationen.jpg", import.meta.url));
let quality = 86, bild;
do { bild = await karte.screenshot({ type: "jpeg", quality }); quality -= 6; } while (bild.length > 290_000 && quality > 40);
writeFileSync(ziel, bild);
console.log(`animations/og-animationen.jpg · ${bild.length} Bytes · Qualität ${quality + 6}`);
await browser.close();
server.close();
