// «The Fictory» – Bilder zum Zeigen und Teilen, im Look der Animation (dunkel, zerlegt, Fadenkreuze, Feldlinien, Scanlines).
// Quelle: src/the-fictory/vorschau-quelle.jpg (1600 × 1592), ein Bild von Christian vom 10. Oktober 2026: ein Raster aus 10 × 9 schimmernden Teilen
// auf tiefem Nachtblau (#00010c). Vorher: ein Standbild in Blau und Ocker, davor ein Bildschirmfoto vom Galaxy S23.
//   assets/vorschau-the-fictory.jpg       640 × 800   Bild der Beitragskarte auf «Web»
//   alpha/the-fictory/og-the-fictory-raster.jpg  1200 × 630  Vorschaukarte zum Teilen (Open Graph, X)
//   Neues Motiv, neuer Dateiname: Plattformen und Messenger speichern Vorschaubilder unter ihrer Adresse zwischen und zeigen sonst das alte.
//   alpha/the-fictory/og-the-fictory.jpg  dieselbe Datei unter der früheren Adresse (bis 10. Oktober 2026, 22 Uhr): Facebook merkt sich die Bildadresse
//   der Seite und zeigt sonst keine Vorschau, solange es die Seite nicht neu gelesen hat (Rückmeldung vom 11. Oktober 2026).
//
//   NODE_PATH=$(npm root -g) node tools/fictory-og.mjs
import { createRequire } from "node:module";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { copyFileSync } from "node:fs";

const require = createRequire(import.meta.url);
let playwright;
try { playwright = require("playwright"); } catch { playwright = require(join(process.env.NODE_PATH || "", "playwright")); }
const { startServer } = await import(new URL("./serve-orma.mjs", import.meta.url).href);
const server = await startServer(0);
const base = `http://localhost:${server.address().port}/`;
const browser = await playwright.chromium.launch();

const STIL = `
  html, body { margin: 0; background: #00010c; overflow: hidden; }       /* der Grund des Bildes */
  .quelle { position: absolute; background: url(src/the-fictory/vorschau-quelle.jpg) no-repeat #00010c; }
  /* Scanlines über allem, wie in der Animation */
  .zeilen { position: absolute; inset: 0; background: repeating-linear-gradient(0deg, rgba(0,0,0,0.14) 0 1px, transparent 1px 3px); pointer-events: none; }`;

async function bild(breite, hoehe, inhalt, ziel, qualitaet = 86) {
  const page = await browser.newPage({ viewport: { width: breite, height: hoehe }, deviceScaleFactor: 1 });
  await page.goto(`${base}vendor/fonts/fonts.css`);
  await page.setContent(`<!DOCTYPE html><html lang="de"><head><meta charset="utf-8"><base href="${base}"><link rel="stylesheet" href="vendor/fonts/fonts.css"><style>${STIL}</style></head><body>${inhalt}<div class="zeilen"></div></body></html>`);
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(300);
  const out = fileURLToPath(new URL(ziel, import.meta.url));
  await page.screenshot({ path: out, type: "jpeg", quality: qualitaet });
  console.log("geschrieben:", out);
  await page.close();
}

// Beitragskarte 4 : 5 – das ganze Raster (fast quadratisch) auf 640 Breite, oben und unten der Grund des Bildes
await bild(640, 800, `<div class="quelle" style="inset: 0; background-size: 640px auto; background-position: 50% 50%;"></div>`, "../assets/vorschau-the-fictory.jpg", 74);          // unter 150 KB wie die anderen Bilder auf «Web»

// Vorschaukarte zum Teilen 1200 × 630 – links der Titel auf dem Grund der Werkbank, rechts die Animation
await bild(1200, 630, `
  <style>
    .text { position: absolute; left: 64px; top: 0; bottom: 0; width: 470px; display: flex; flex-direction: column; justify-content: center; color: #ebe6dc; }
    .text h1 { margin: 0; font: 400 92px/1 "Newsreader", Georgia, serif; letter-spacing: -0.02em; }
    .text p { margin: 26px 0 0; font: 400 30px/1.3 "Newsreader", Georgia, serif; color: #ebe6dc; max-width: 15em; }
    .text .fuss { margin-top: 44px; font: 500 19px/1.4 "Instrument Sans", system-ui, sans-serif; color: #9a9388; }
    .text .fuss b { display: block; font-weight: 500; color: #f0d896; letter-spacing: 0.02em; }      /* das helle Creme der Teile */
    .rechts { position: absolute; right: 0; top: 0; width: 660px; height: 630px; background-size: auto 660px; background-position: 50% 50%; }
    .kante { position: absolute; left: 540px; top: 0; width: 60px; height: 630px; background: linear-gradient(90deg, #00010c, rgba(0,1,12,0)); }
  </style>
  <div class="quelle rechts"></div>
  <div class="kante"></div>
  <div class="text">
    <h1>The Fictory</h1>
    <p>Ein Bild zerfällt in seine Teile und geht weiter.</p>
    <div class="fuss"><b>ornament.cloud/alpha/the-fictory</b>Nebeneinander, Nacheinander</div>
  </div>`, "../alpha/the-fictory/og-the-fictory-raster.jpg");

await browser.close();
// die frühere Adresse der Vorschaukarte trägt dasselbe Bild (siehe oben)
copyFileSync(new URL("../alpha/the-fictory/og-the-fictory-raster.jpg", import.meta.url), new URL("../alpha/the-fictory/og-the-fictory.jpg", import.meta.url));
server.close();
