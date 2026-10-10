// Beispielbild für «The Fictory» (alpha/the-fictory/beispiel.jpg), verkleinert aus src/the-fictory/beispiel-quelle.jpg:
// ein Bild von Christian vom 10. Oktober 2026 (Hochformat, Nachtblau mit weissen und kupfernen Linienbündeln, eine helle Spitze, ein Bogen).
// Es ersetzt die frühere, selbst gezeichnete Komposition (farbige Flächen auf Papier). 1080 px breit, damit es rasch lädt (gut 700 KB: die feinen Linien kosten); die Standbilder
// werden trotzdem mindestens 1600 px lang.
//   NODE_PATH=$(npm root -g) node tools/fictory-beispiel.mjs
import { createRequire } from "node:module";
import { join } from "node:path";
import { readFileSync, writeFileSync } from "node:fs";

const BREITE = 1080, QUALITAET = 0.78;
const require = createRequire(import.meta.url);
let playwright;
try { playwright = require("playwright"); } catch { playwright = require(join(process.env.NODE_PATH || "", "playwright")); }
const quelle = "data:image/jpeg;base64," + readFileSync(new URL("../src/the-fictory/beispiel-quelle.jpg", import.meta.url)).toString("base64");
const browser = await playwright.chromium.launch();
const page = await browser.newPage();
const daten = await page.evaluate(async ({ quelle, BREITE, QUALITAET }) => {
  const bild = new Image(); bild.src = quelle; await bild.decode();
  const c = document.createElement("canvas");
  c.width = BREITE; c.height = Math.round((bild.naturalHeight * BREITE) / bild.naturalWidth);
  const x = c.getContext("2d"); x.imageSmoothingQuality = "high";
  x.drawImage(bild, 0, 0, c.width, c.height);
  return { url: c.toDataURL("image/jpeg", QUALITAET), w: c.width, h: c.height };
}, { quelle, BREITE, QUALITAET });
writeFileSync(new URL("../alpha/the-fictory/beispiel.jpg", import.meta.url), Buffer.from(daten.url.split(",")[1], "base64"));
await browser.close();
console.log(`geschrieben: alpha/the-fictory/beispiel.jpg (${daten.w} × ${daten.h})`);
