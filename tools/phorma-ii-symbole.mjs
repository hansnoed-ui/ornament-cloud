// «PHORMA II» – die Symbole der App (die Bilder der Karte und zum Teilen rechnet tools/phorma-ii-bilder.mjs) (Wunsch vom 21. Oktober 2026: «ja, bau PHORMA II als App»), aus der Tafel des Neubaus
// (b/bilder/apps/phorma-ii-dunkel.svg: eine einzige Linie, aus einem Keim gewachsen, die eine Scheibe füllt – der Effekt «Wachstum»):
// die Linie hell auf Schwarz, leicht leuchtend, der Keim in Blau; ohne den grauen Kreis der Tafel, auf die Linie zugeschnitten. Das kleine Symbol im Browser-Tab nimmt das
// Zeichen «linie» des Neubaus (src/b/zeichen.mjs), weil die feine Linie auf 32 px zu Rauschen würde.
//   alpha/phorma-ii/icons/icon-512.png             512 × 512   Android, Installation («any»)
//   alpha/phorma-ii/icons/icon-192.png             192 × 192   Android, Browser
//   alpha/phorma-ii/icons/icon-maskable-512.png    512 × 512   Android, maskierbar (Scheibe kleiner: das System schneidet zu)
//   alpha/phorma-ii/icons/apple-touch-icon.png     180 × 180   iPhone und iPad (Startbildschirm)
//   alpha/phorma-ii/icons/favicon-32.png            32 × 32    Symbol im Browser-Tab
// Die Vorschaukachel zum Teilen bleibt alpha/phorma-ii/og-phorma-ii.jpg (seit 19. Oktober 2026).
//
//   NODE_PATH=$(npm root -g) node tools/phorma-ii-symbole.mjs
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
let playwright;
try { playwright = require("playwright"); } catch { playwright = require(join(process.env.NODE_PATH || "", "playwright")); }
const pfad = (p) => fileURLToPath(new URL(p, import.meta.url));

const tafel = readFileSync(pfad("../b/bilder/apps/phorma-ii-dunkel.svg"), "utf8");
const linie = tafel.match(/<path d="([^"]+)"/)?.[1];
const keim = tafel.match(/<circle cx="([\d.]+)" cy="([\d.]+)" r="12" fill="#8fb0ff"/);
if (!linie || !keim) throw new Error("Linie oder Keim in der Tafel nicht gefunden");

const LICHT = "#f4efe6", BLAU = "#8fb0ff";
// die Ausdehnung der Linie: auf sie wird zugeschnitten (sie füllt die Scheibe der Tafel nicht ganz)
const punkte = [...linie.matchAll(/([\d.]+) ([\d.]+)/g)].map((m) => [+m[1], +m[2]]);
const [x0, x1, y0, y1] = [Math.min(...punkte.map((q) => q[0])), Math.max(...punkte.map((q) => q[0])), Math.min(...punkte.map((q) => q[1])), Math.max(...punkte.map((q) => q[1]))];
const MX = (x0 + x1) / 2, MY = (y0 + y1) / 2, R = Math.max(x1 - x0, y1 - y0) / 2;
/** die Linie auf ein Quadrat der Kante «kante»; rand: Anteil der Kante um die Linie */
function gross(kante, rand) {
  const halb = R / (1 - 2 * rand), vb = `${MX - halb} ${MY - halb} ${2 * halb} ${2 * halb}`;
  const strich = Math.max(2.4, (1.3 * 2 * halb) / kante);         // gut 1,3 px im fertigen Bild
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${vb}" width="${kante}" height="${kante}">
    <defs><filter id="glut" x="-10%" y="-10%" width="120%" height="120%"><feGaussianBlur stdDeviation="${strich * 1.6}" result="w"/>
      <feMerge><feMergeNode in="w"/><feMergeNode in="SourceGraphic"/></feMerge></filter></defs>
    <rect x="${MX - halb}" y="${MY - halb}" width="${2 * halb}" height="${2 * halb}" fill="#000"/>
    <path d="${linie}" fill="none" stroke="${LICHT}" stroke-width="${strich}" stroke-linejoin="round" filter="url(#glut)" opacity="0.92"/>
    <circle cx="${keim[1]}" cy="${keim[2]}" r="${Math.max(12, strich * 4)}" fill="${BLAU}"/>
  </svg>`;
}
/** das Zeichen «linie» (24 × 24) hell auf Schwarz, für das Symbol im Tab */
const klein = (kante) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="${kante}" height="${kante}">
  <rect width="24" height="24" rx="5" fill="#000"/>
  <path d="M3 17c3-9 6 2 9-4s4-9 7-4-1 9-5 8" fill="none" stroke="${LICHT}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
  <circle cx="14" cy="17" r="1.8" fill="${BLAU}"/>
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
