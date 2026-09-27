// Erzeugt die App-Symbole der installierbaren Web-App ORNA (portfolio/nebeneinander-nacheinander/app/).
//
// Zwei Motive, schwarz auf der Grundfarbe der Website:
// – leeres Rad: nur die vier Ringlinien, genau das erste Bild des Startbilds (js/intro.js).
//   Für Android: Chrome baut daraus den Systemstartbildschirm, danach füllen sich die Ringe nahtlos.
// – volles Rad: Ringe mit Teilung, Ablesemarke, Fadenkreuz. Für das iPhone (kein Systemstartbildschirm)
//   und als Symbol im Browser-Tab.
//
//   NODE_PATH=$(npm root -g) node tools/app-icons.mjs
//
import { writeFile } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
let playwright;
try { playwright = require("playwright"); } catch { playwright = require(join(process.env.NODE_PATH || "", "playwright")); }

const OUT = fileURLToPath(new URL("../portfolio/nebeneinander-nacheinander/app/", import.meta.url));
const BG = "#f8f8f6", INK = "#1f1d1a";

/** Motiv im 100er-Feld; k = Anteil der Fläche, den das Rad einnimmt (maskierbar: kleiner) */
function svg(k) {
  const C = 50, RO = 38 * k, RI = 25 * k, parts = [];
  const tick = (r, len, a, w) => {
    const c = Math.cos(a), s = Math.sin(a);
    parts.push(`<path d="M${(C + c * (r - len)).toFixed(2)},${(C + s * (r - len)).toFixed(2)}L${(C + c * r).toFixed(2)},${(C + s * r).toFixed(2)}" stroke-width="${w}"/>`);
  };
  parts.push(`<circle cx="${C}" cy="${C}" r="${RO}" stroke-width="${1.6 * k}"/>`);
  parts.push(`<circle cx="${C}" cy="${C}" r="${RI}" stroke-width="${1.2 * k}"/>`);
  for (let i = 0; i < 20; i += 1) {
    const a = i / 20 * Math.PI * 2;
    tick(RO, 5 * k, a + 0.03, 1.1 * k);                   // Aussenring leicht verdreht: gegenläufig
    tick(RI, 3.6 * k, a - 0.09, 0.9 * k);
  }
  const mark = `<path d="M${C},${(C - RO - 1.6 * k).toFixed(2)}l${(-3.2 * k).toFixed(2)},${(-5.4 * k).toFixed(2)}h${(6.4 * k).toFixed(2)}Z" fill="${INK}" stroke="none"/>`;
  const cross = `<path d="M${C - 4 * k},${C}H${C + 4 * k}M${C},${C - 4 * k}V${C + 4 * k}" stroke-width="${1 * k}"/>`;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect width="100" height="100" fill="${BG}"/>` +
    `<g fill="none" stroke="${INK}" stroke-linecap="round">${parts.join("")}${cross}</g>${mark}</svg>`;
}

/** Leeres Rad: die vier Ringe des Startbilds in denselben Verhältnissen (462 · 344 · 326 · 208 von 1000) */
function emptySvg(k) {
  const C = 50, s = 38 * k / 462;
  const ring = (r, w, o) => `<circle cx="${C}" cy="${C}" r="${(r * s).toFixed(2)}" stroke-width="${(w * k).toFixed(2)}" opacity="${o}"/>`;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect width="100" height="100" fill="${BG}"/>` +
    `<g fill="none" stroke="${INK}">${ring(462, 1.3, 1)}${ring(344, 0.8, 0.6)}${ring(326, 1.3, 1)}${ring(208, 0.8, 0.6)}</g></svg>`;
}

const icons = [
  ["icon-192.png", 192, 1, emptySvg],                  // Android: Symbol und Systemstartbildschirm
  ["icon-512.png", 512, 1, emptySvg],
  ["icon-maskable-512.png", 512, 0.78, emptySvg],      // maskierbar: Motiv in der sicheren Zone (innere 80 %)
  ["apple-touch-icon.png", 180, 0.92, svg],            // iPhone: volles Rad
];

const browser = await playwright.chromium.launch();
const page = await browser.newPage();
for (const [name, size, k, draw] of icons) {
  await page.setViewportSize({ width: size, height: size });
  await page.setContent(`<html><body style="margin:0">${draw(k).replace("<svg ", `<svg width="${size}" height="${size}" `)}</body></html>`);
  await page.screenshot({ path: join(OUT, name), clip: { x: 0, y: 0, width: size, height: size } });
}
await writeFile(join(OUT, "icon.svg"), svg(1));
await browser.close();
console.log("App-Symbole geschrieben:", icons.map(i => i[0]).join(", "), "+ icon.svg");
