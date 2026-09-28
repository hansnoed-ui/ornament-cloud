// Erzeugt das Vorschaubild von «Zu seiner Zeit» (Open Graph / X-Karte, 1200 × 630) für das Teilen auf Facebook & Co.
// Ruhig wie die Seiten: weisser Grund, Titel in Serif, Untertitel grau, rechts das Raster der 49 Strophen
// (sieben Zyklen × sieben), eine Strophe hervorgehoben – wie der Portfolio-Beitrag. Texte aus der JSON-Datei.
//
//   NODE_PATH=$(npm root -g) node tools/zsz-og.mjs      → zu-seiner-zeit/og-zu-seiner-zeit.png
//
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const require = createRequire(import.meta.url);
let playwright;
try { playwright = require("playwright"); } catch { playwright = require(join(process.env.NODE_PATH || "", "playwright")); }

const OUT = fileURLToPath(new URL("../zu-seiner-zeit/og-zu-seiner-zeit.png", import.meta.url));
const data = JSON.parse(readFileSync(new URL("../src/data/zu-seiner-zeit.json", import.meta.url), "utf8"));
const esc = s => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

// Raster: eine Reihe je Zyklus, ein Punkt je Strophe; hervorgehoben ist dieselbe wie im Portfolio (Reihe 6, Punkt 2 = Nr. 37)
const dots = [];
for (let r = 0; r < 7; r++) for (let c = 0; c < 7; c++) {
  const on = r === 5 && c === 1;
  dots.push(`<circle cx="${c * 44}" cy="${r * 44}" r="${on ? 7 : 3.4}"/>`);
}
const roman = data.cycles.map((c, r) => `<text x="-30" y="${r * 44 + 4.5}" text-anchor="end">${c.roman}</text>`).join("");

const html = `<!DOCTYPE html><html lang="de"><head><meta charset="utf-8"><style>
  html, body { margin: 0; width: 1200px; height: 630px; background: #ffffff; color: #141414; }
  .karte { position: relative; width: 1200px; height: 630px; box-sizing: border-box; padding: 84px 96px; }
  h1 { margin: 0; font: 400 104px/1 "Iowan Old Style", "Palatino Linotype", Palatino, "Book Antiqua", Georgia, serif; letter-spacing: 0.005em; }
  .unter { margin: 30px 0 0; width: 560px; font: 400 32px/1.32 "Iowan Old Style", "Palatino Linotype", Palatino, "Book Antiqua", Georgia, serif; color: #6e6e6e; }
  .fuss { position: absolute; left: 96px; right: 96px; bottom: 72px; display: flex; justify-content: space-between; align-items: baseline;
          padding-top: 22px; border-top: 1px solid #141414; font: 400 21px/1 system-ui, "Helvetica Neue", Arial, sans-serif; letter-spacing: 0.06em; color: #141414; }
  .fuss span:last-child { color: #6e6e6e; }
  svg { position: absolute; right: 118px; top: 96px; width: 300px; height: 300px; overflow: visible; }
  svg text { font: 500 13px system-ui, "Helvetica Neue", Arial, sans-serif; letter-spacing: 0.12em; fill: #9a9a97; }
</style></head><body><div class="karte">
  <h1>${esc(data.title)}</h1>
  <p class="unter">${esc(data.subtitle)}</p>
  <svg viewBox="-60 -20 320 300" fill="#141414">${roman}${dots.join("")}</svg>
  <p class="fuss"><span>${data.cycles.length} Zyklen · ${data.stanzas.length} Strophen</span><span>ornament.cloud/zu-seiner-zeit</span></p>
</div></body></html>`;

const browser = await playwright.chromium.launch();
const page = await browser.newPage({ viewport: { width: 1200, height: 630 }, deviceScaleFactor: 1, colorScheme: "light" });
await page.setContent(html);
await page.screenshot({ path: OUT });
await browser.close();
console.log(`Vorschaubild → ${OUT}`);
