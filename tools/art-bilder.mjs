// «Art» – die Bilder der Werke (seit 19. Oktober 2026). Aus jeder Quelle in src/art/werke.json (bilder[].quelle, ein Pfad ab der Wurzel) entstehen zwei
// WebP-Fassungen in art/bilder/: <slug>-<n>-800.webp für Karten und Seite, <slug>-<n>-1600.webp für die Lupe (lange Seite höchstens 1600 px; kleinere Quellen
// werden nicht vergrössert). Die Masse in Pixeln stehen danach in src/art/bilder.json, damit die Seiten den Platz der Bilder vorab kennen (kein Springen beim Laden).
// Gerechnet wird im Browser (Playwright, Canvas → WebP), wie bei den übrigen Bildern der Website; es braucht kein weiteres Paket.
//   NODE_PATH=$(npm root -g) node tools/art-bilder.mjs
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
let playwright;
try { playwright = require("playwright"); } catch { playwright = require(join(process.env.NODE_PATH || "", "playwright")); }
const { startServer } = await import(new URL("./serve-orma.mjs", import.meta.url).href);

const ROOT = new URL("../", import.meta.url);
const daten = JSON.parse(readFileSync(new URL("src/art/werke.json", ROOT), "utf8"));
const GROESSEN = [800, 1600];

const server = await startServer(0);
const base = `http://localhost:${server.address().port}/`;
const browser = await playwright.chromium.launch();
const page = await browser.newPage();
await page.goto(`${base}src/art/werke.json`);
mkdirSync(new URL("art/bilder/", ROOT), { recursive: true });

const masse = {};
for (const w of daten.werke) {
  for (const [i, bild] of (w.bilder ?? []).entries()) {
    const name = `${w.slug}-${i + 1}`;
    for (const g of GROESSEN) {
      const { data, b, h } = await page.evaluate(async ({ src, g }) => {
        const img = new Image(); img.src = src; await img.decode();
        const s = Math.min(1, g / Math.max(img.naturalWidth, img.naturalHeight));
        const b = Math.round(img.naturalWidth * s), h = Math.round(img.naturalHeight * s);
        const c = document.createElement("canvas"); c.width = b; c.height = h;
        const x = c.getContext("2d"); x.imageSmoothingQuality = "high"; x.drawImage(img, 0, 0, b, h);
        return { data: c.toDataURL("image/webp", 0.86), b, h };
      }, { src: `${base}${bild.quelle}`, g });
      writeFileSync(new URL(`art/bilder/${name}-${g}.webp`, ROOT), Buffer.from(data.split(",")[1], "base64"));
      masse[`${name}-${g}`] = [b, h];
      console.log(`→ art/bilder/${name}-${g}.webp  ${b} × ${h}`);
    }
  }
}
writeFileSync(new URL("src/art/bilder.json", ROOT), JSON.stringify(masse, null, 1) + "\n");
console.log("geschrieben: src/art/bilder.json");
await browser.close();
server.close();
