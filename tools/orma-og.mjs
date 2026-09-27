// Erzeugt das Vorschaubild von ORMA (Open Graph / X-Karte, 1200 × 630): das Schlussbild der Startanimation –
// das zusammengesetzte Rad wie bei ORNA, darunter der Name –, vertikal in der Mitte geteilt, rechts invers.
// Baut dafür ORMA, lädt die App mit ?intro und setzt das fertige Startbild ohne Bewegung neu.
//
//   NODE_PATH=$(npm root -g) node tools/orma-og.mjs      → src/orma/app/og-orma.png
//
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";
import { join } from "node:path";

const require = createRequire(import.meta.url);
let playwright;
try { playwright = require("playwright"); } catch { playwright = require(join(process.env.NODE_PATH || "", "playwright")); }

const OUT = fileURLToPath(new URL("../src/orma/app/og-orma.png", import.meta.url));
const { buildOrma } = await import(new URL("./build-orma.ts", import.meta.url).href);
const { startServer } = await import(new URL("./serve-orma.mjs", import.meta.url).href);
buildOrma();
const server = await startServer(0);
const base = `http://localhost:${server.address().port}`;

const browser = await playwright.chromium.launch();
const page = await browser.newPage({ viewport: { width: 1200, height: 630 }, deviceScaleFactor: 1, colorScheme: "light" });
await page.goto(`${base}/orma/?intro`);
await page.waitForSelector(".orma-intro.is-assembling");
await page.evaluate(() => {
  const svg = document.querySelector(".oi-wheel").cloneNode(true);
  document.querySelector(".orma-intro").remove();
  document.head.insertAdjacentHTML("beforeend", `<style>
    *, *::before, *::after { transition: none !important; }
    .og { position: fixed; inset: 0; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 26px; background: #f8f8f6; color: #1f1d1a; }
    .og .oi-wheel { width: 440px; height: 440px; }
    .og .oi-name { font-size: 26px; }
    .og-lead { margin: 0; font: 400 20px/1.3 Georgia, "Times New Roman", serif; font-style: italic; letter-spacing: 0.01em; }
  </style>`);
  const box = document.createElement("div");
  box.className = "og orma-intro is-assembling";
  box.append(svg);
  box.insertAdjacentHTML("beforeend", `<p class="oi-name">ORMA</p><p class="og-lead">Zehn Minuten zu zweit. Zwei Sichtweisen. Ein neuer Gedanke.</p><div class="oi-invert"></div>`);
  document.body.append(box);
});
await page.waitForTimeout(300);
await page.screenshot({ path: OUT });
await browser.close();
server.close();
console.log("geschrieben:", OUT);
