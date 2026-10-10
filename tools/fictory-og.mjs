// «The Fictory» – Bilder zum Zeigen und Teilen, im Look der Animation (dunkel, zerlegt, Fadenkreuze, Feldlinien, Scanlines).
// Quelle: src/the-fictory/vorschau-quelle.jpg (1200 × 1600), ein Standbild aus The Fictory, ausgewählt von Christian am 10. Oktober 2026
// (blau und ocker, mit wucherndem Feld, Punktraster und Scanlines; ersetzt das erste Motiv, ein Bildschirmfoto vom Galaxy S23).
//   assets/vorschau-the-fictory.jpg       640 × 800   Bild der Beitragskarte auf «Web»
//   alpha/the-fictory/og-the-fictory.jpg  1200 × 630  Vorschaukarte zum Teilen (Open Graph, X)
//
//   NODE_PATH=$(npm root -g) node tools/fictory-og.mjs
import { createRequire } from "node:module";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
let playwright;
try { playwright = require("playwright"); } catch { playwright = require(join(process.env.NODE_PATH || "", "playwright")); }
const { startServer } = await import(new URL("./serve-orma.mjs", import.meta.url).href);
const server = await startServer(0);
const base = `http://localhost:${server.address().port}/`;
const browser = await playwright.chromium.launch();

const STIL = `
  html, body { margin: 0; background: #151412; overflow: hidden; }
  .quelle { position: absolute; background: url(src/the-fictory/vorschau-quelle.jpg) no-repeat; }
  /* Scanlines über allem, wie in der Animation */
  .zeilen { position: absolute; inset: 0; background: repeating-linear-gradient(0deg, rgba(0,0,0,0.22) 0 1px, transparent 1px 3px); pointer-events: none; }`;

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

// Beitragskarte 4 : 5 – das Standbild (3 : 4) auf 640 Breite, mittig beschnitten
await bild(640, 800, `<div class="quelle" style="inset: 0; background-size: 640px auto; background-position: 0 50%;"></div>`, "../assets/vorschau-the-fictory.jpg", 74);          // unter 150 KB wie die anderen Bilder auf «Web»

// Vorschaukarte zum Teilen 1200 × 630 – links der Titel auf dem Grund der Werkbank, rechts die Animation
await bild(1200, 630, `
  <style>
    .text { position: absolute; left: 64px; top: 0; bottom: 0; width: 470px; display: flex; flex-direction: column; justify-content: center; color: #ebe6dc; }
    .text h1 { margin: 0; font: 400 92px/1 "Newsreader", Georgia, serif; letter-spacing: -0.02em; }
    .text p { margin: 26px 0 0; font: 400 30px/1.3 "Newsreader", Georgia, serif; color: #ebe6dc; max-width: 15em; }
    .text .fuss { margin-top: 44px; font: 500 19px/1.4 "Instrument Sans", system-ui, sans-serif; color: #9a9388; }
    .text .fuss b { display: block; font-weight: 500; color: #e0a640; letter-spacing: 0.02em; }
    .rechts { position: absolute; right: 0; top: 0; width: 640px; height: 630px; background-size: 640px auto; background-position: 0 -120px; }
    .kante { position: absolute; left: 560px; top: 0; width: 80px; height: 630px; background: linear-gradient(90deg, #151412, rgba(21,20,18,0)); }
  </style>
  <div class="quelle rechts"></div>
  <div class="kante"></div>
  <div class="text">
    <h1>The Fictory</h1>
    <p>Ein Bild zerfällt in seine Teile und geht weiter.</p>
    <div class="fuss"><b>ornament.cloud/alpha/the-fictory</b>Nebeneinander, Nacheinander</div>
  </div>`, "../alpha/the-fictory/og-the-fictory.jpg");

await browser.close();
server.close();
