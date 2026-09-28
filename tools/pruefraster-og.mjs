// Erzeugt das Vorschaubild des Prüfrasters (Open Graph / X-Karte, 1200 × 630) für das Teilen auf Facebook & Co.
// Links Titel und Untertitel, rechts das Raster selbst: zwei Achsen (Verräumlichung waagrecht, Verzeitlichung
// senkrecht) und die vier Felder wie in Abbildung 1 des Grundlagenpapiers; Doppelspalt oben rechts betont.
//
//   NODE_PATH=$(npm root -g) node tools/pruefraster-og.mjs      → alpha/pruefraster/og-pruefraster.png
//
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";
import { join } from "node:path";

const require = createRequire(import.meta.url);
let playwright;
try { playwright = require("playwright"); } catch { playwright = require(join(process.env.NODE_PATH || "", "playwright")); }

const OUT = fileURLToPath(new URL("../alpha/pruefraster/og-pruefraster.png", import.meta.url));
const SERIF = `"Iowan Old Style", "Palatino Linotype", Palatino, "Book Antiqua", Georgia, serif`;
const SANS = `system-ui, "Helvetica Neue", Arial, sans-serif`;

// Felder: [Name, x, y] im Quadrat 0–360; oben = Verzeitlichung stark, rechts = Verräumlichung stark
const felder = [["Ereignis", 90, 90], ["Doppelspalt", 270, 90], ["Stilles", 90, 262], ["Ordnung", 270, 270]];
const html = `<!DOCTYPE html><html lang="de"><head><meta charset="utf-8"><style>
  html, body { margin: 0; width: 1200px; height: 630px; background: #f8f8f6; color: #1f1d1a; }
  .k { position: relative; width: 1200px; height: 630px; box-sizing: border-box; padding: 80px 88px; }
  .ober { margin: 0; font: 600 18px/1 ${SANS}; letter-spacing: 0.16em; text-transform: uppercase; color: #c2410c; }
  h1 { margin: 26px 0 0; width: 560px; font: 400 68px/1.04 ${SERIF}; }
  .unter { margin: 24px 0 0; width: 520px; font: 400 25px/1.36 ${SERIF}; color: #6b665e; }
  .fuss { position: absolute; left: 88px; bottom: 70px; margin: 0; font: 400 20px/1 ${SANS}; letter-spacing: 0.05em; color: #1f1d1a; }
  .fuss span { color: #6b665e; }
  svg { position: absolute; right: 88px; top: 124px; width: 370px; height: 370px; overflow: visible; }
  .lab { font: 500 13px ${SANS}; letter-spacing: 0.14em; fill: #6b665e; }
  .feld { font: 400 24px ${SERIF}; fill: #1f1d1a; }
</style></head><body><div class="k">
  <p class="ober">Grundlagenpapier · Anwendungsprompt</p>
  <h1>Prüfraster: Nebeneinander und Nacheinander</h1>
  <p class="unter">Verräumlichung und Verzeitlichung als Achsen für die Ordnung von Theorien, Kunstpraxen und weiteren Ansätzen</p>
  <p class="fuss">Christian Strickler · <span>ornament.cloud/alpha/pruefraster</span></p>
  <svg viewBox="0 0 360 360">
    <rect x="180" y="0" width="180" height="180" fill="#1f1d1a"/>
    <rect x="0" y="0" width="360" height="360" fill="none" stroke="#1f1d1a" stroke-width="1.5"/>
    <line x1="180" y1="0" x2="180" y2="360" stroke="#1f1d1a" stroke-width="1"/>
    <line x1="0" y1="180" x2="360" y2="180" stroke="#1f1d1a" stroke-width="1"/>
    ${felder.map(([n, x, y]) => `<text class="feld" x="${x}" y="${y + 8}" text-anchor="middle"${n === "Doppelspalt" ? ' fill="#f8f8f6" style="fill:#f8f8f6"' : ""}>${n}</text>`).join("")}
    <text class="feld" x="90" y="294" text-anchor="middle">Operieren</text>
    <text class="lab" x="180" y="392" text-anchor="middle">VERRÄUMLICHUNG →</text>
    <text class="lab" x="-22" y="180" text-anchor="middle" transform="rotate(-90 -22 180)">VERZEITLICHUNG →</text>
  </svg>
</div></body></html>`;

const browser = await playwright.chromium.launch();
const page = await browser.newPage({ viewport: { width: 1200, height: 630 }, deviceScaleFactor: 1, colorScheme: "light" });
await page.setContent(html);
await page.screenshot({ path: OUT });
await browser.close();
console.log(`Vorschaubild → ${OUT}`);
