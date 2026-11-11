// «PHORMA II» – die Symbole der App (die Bilder der Karte und zum Teilen rechnet tools/phorma-ii-bilder.mjs) (Wunsch vom 21. Oktober 2026: «ja, bau PHORMA II als App»), aus der Tafel des Neubaus
// (src/b/tafeln.mjs, Ruhebild: das Netz von Physarum – Adern aus fünf Keimen, die sich auf eine Form legen; bis 21. Oktober 2026 die wachsende Linie
// des Effekts «Wachstum», der seither weg ist): die Adern hell auf Schwarz, leicht leuchtend, Keime und Form in Blau; ohne den grauen Kreis der Tafel,
// auf das Netz zugeschnitten. Das kleine Symbol im Browser-Tab nimmt das Zeichen «netz» des Neubaus (src/b/zeichen.mjs), weil das feine Netz auf 32 px
// zu Rauschen würde.
//   alpha/phorma-ii/icons/icon-512.png             512 × 512   Android, Installation («any»)
//   alpha/phorma-ii/icons/icon-192.png             192 × 192   Android, Browser
//   alpha/phorma-ii/icons/icon-maskable-512.png    512 × 512   Android, maskierbar (Scheibe kleiner: das System schneidet zu)
//   alpha/phorma-ii/icons/apple-touch-icon.png     180 × 180   iPhone und iPad (Startbildschirm)
//   alpha/phorma-ii/icons/favicon-32.png            32 × 32    Symbol im Browser-Tab
// Die Vorschaukachel zum Teilen bleibt alpha/phorma-ii/og-phorma-ii.jpg (seit 19. Oktober 2026).
//
//   NODE_PATH=$(npm root -g) node tools/phorma-ii-symbole.mjs
import { mkdirSync, writeFileSync } from "node:fs";
import { TAFELN, farben, M } from "../src/b/tafeln.mjs";
import { createRequire } from "node:module";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
let playwright;
try { playwright = require("playwright"); } catch { playwright = require(join(process.env.NODE_PATH || "", "playwright")); }
const pfad = (p) => fileURLToPath(new URL(p, import.meta.url));

const LICHT = "#f4efe6", BLAU = "#8fb0ff";
const tafel = TAFELN["phorma-ii"], R = 430 + 6;   // die Scheibe der Tafel (R2 in tafeln.mjs), knapp um das Netz
/** das Netz auf ein Quadrat der Kante «kante»; rand: Anteil der Kante um das Netz */
function gross(kante, rand) {
  const halb = R / (1 - 2 * rand), vb = `${M - halb} ${M - halb} ${2 * halb} ${2 * halb}`;
  const klein = kante <= 192, faktor = Math.max(1, ((klein ? 1.7 : 1.3) * 2 * halb) / kante / 1.3);   // die feinste Ader gut 1,3 px (klein: 1,7 px) im fertigen Bild
  const inhalt = tafel.svg(tafel.neu(), { ...farben(true), tinte: LICHT, faden: BLAU, fadenHell: "rgba(143,176,255,0.2)", linie: "none" })
    .replace(/stroke-width="([\d.]+)"/g, (_, w) => `stroke-width="${(Number(w) * faktor).toFixed(2)}"`)
    .replace(/r="11"/g, `r="${Math.max(11, 6 * faktor).toFixed(1)}"`);
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${vb}" width="${kante}" height="${kante}">
    <defs><filter id="glut" x="-10%" y="-10%" width="120%" height="120%"><feGaussianBlur stdDeviation="${(1.6 * faktor).toFixed(2)}" result="w"/>
      <feMerge><feMergeNode in="w"/><feMergeNode in="SourceGraphic"/></feMerge></filter></defs>
    <rect x="${M - halb}" y="${M - halb}" width="${2 * halb}" height="${2 * halb}" fill="#000"/>
    <g${klein ? "" : ' filter="url(#glut)" opacity="0.94"'}>${inhalt}</g>
  </svg>`;
}
/** das Zeichen «netz» (24 × 24) hell auf Schwarz, für das Symbol im Tab */
const klein = (kante) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="${kante}" height="${kante}">
  <rect width="24" height="24" rx="5" fill="#000"/>
  <path d="M5 7l8 5 5-7M13 12l-6 6M13 12l6 5M5 7l13-2" fill="none" stroke="${LICHT}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
  <circle cx="13" cy="12" r="2" fill="${BLAU}"/>
</svg>`;

const BILDER = [
  ["icon-512.png", 512, () => gross(512, 0.1)],
  ["icon-192.png", 192, () => gross(192, 0.1)],
  ["icon-maskable-512.png", 512, () => gross(512, 0.2)],
  ["apple-touch-icon.png", 180, () => gross(180, 0.1)],
  ["favicon-32.png", 32, () => klein(32)],
];

const aus = pfad("../alpha/phorma-ii/icons/");
mkdirSync(aus, { recursive: true });
const browser = await playwright.chromium.launch();
const page = await browser.newPage({ deviceScaleFactor: 1 });
for (const [name, kante, svg] of BILDER) {
  await page.setViewportSize({ width: kante, height: kante });
  await page.setContent(`<!DOCTYPE html><html><body style="margin:0;background:#000">${svg()}</body></html>`);
  writeFileSync(join(aus, name), await page.screenshot({ type: "png", clip: { x: 0, y: 0, width: kante, height: kante } }));
  console.log(name, `${kante} × ${kante}`);
}
await browser.close();
