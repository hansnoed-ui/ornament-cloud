// Erzeugt die App-Symbole von ORMA (src/orma/app/icons/). Eigenes Motiv, getrennt von ORNA:
// zwei Ringe, die sich überschneiden – zwei Sichtweisen –, am oberen Schnittpunkt ein Punkt in der
// Akzentfarbe: dort entsteht der neue Gedanke. Dazu fein die Teilung des Rads.
//
//   NODE_PATH=$(npm root -g) node tools/orma-icons.mjs
//
import { writeFile, mkdir } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
let playwright;
try { playwright = require("playwright"); } catch { playwright = require(join(process.env.NODE_PATH || "", "playwright")); }

const OUT = fileURLToPath(new URL("../src/orma/app/icons/", import.meta.url));
const BG = "#f8f8f6", INK = "#1f1d1a", ACCENT = "#c2410c";

/** Motiv im 100er-Feld; k = Anteil der Fläche (maskierbar: kleiner, sichere Zone) */
export function svg(k) {
  const C = 50, R = 24 * k, D = 12 * k, parts = [];
  for (const dx of [-D, D]) {
    parts.push(`<circle cx="${C + dx}" cy="${C}" r="${R}" stroke-width="${1.2 * k}"/>`);
    for (let i = 0; i < 12; i += 1) {                    // Teilung: zwölf Plätze je Ring
      const a = i / 12 * Math.PI * 2 + (dx < 0 ? 0.13 : -0.13);
      const c = Math.cos(a), s = Math.sin(a), l = 3.2 * k;
      parts.push(`<path d="M${(C + dx + c * (R - l)).toFixed(2)},${(C + s * (R - l)).toFixed(2)}L${(C + dx + c * R).toFixed(2)},${(C + s * R).toFixed(2)}" stroke-width="${0.6 * k}" opacity="0.7"/>`);
    }
  }
  const yTop = C - Math.sqrt(R * R - D * D);
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect width="100" height="100" fill="${BG}"/>` +
    `<g fill="none" stroke="${INK}" stroke-linecap="round">${parts.join("")}</g>` +
    `<circle cx="${C}" cy="${yTop.toFixed(2)}" r="${(2.6 * k).toFixed(2)}" fill="${ACCENT}"/></svg>`;
}

const icons = [
  ["icon-192.png", 192, 1],
  ["icon-512.png", 512, 1],
  ["icon-maskable-512.png", 512, 0.8],
  ["apple-touch-icon.png", 180, 0.95],
];

if (import.meta.url === `file://${process.argv[1]}`) {
  await mkdir(OUT, { recursive: true });
  const browser = await playwright.chromium.launch();
  const page = await browser.newPage();
  for (const [name, size, k] of icons) {
    await page.setViewportSize({ width: size, height: size });
    await page.setContent(`<html><body style="margin:0">${svg(k).replace("<svg ", `<svg width="${size}" height="${size}" `)}</body></html>`);
    await page.screenshot({ path: join(OUT, name), clip: { x: 0, y: 0, width: size, height: size } });
  }
  await writeFile(join(OUT, "icon.svg"), svg(1));
  await browser.close();
  console.log("ORMA-Symbole geschrieben:", icons.map(i => i[0]).join(", "), "+ icon.svg");
}
