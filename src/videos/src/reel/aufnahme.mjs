// Bildschirmaufnahme für das Reel: die Startseite /b/ am Telefon (430 px breit, doppelte Dichte), ganze Länge, hell,
// dazu die Lage der Abschnitte. Schreibt public/reel/b-telefon.png und public/reel/b-stellen.json (nicht eingecheckt).
// Aufruf (braucht Playwright und Chromium): NODE_PATH=$(npm root -g) node src/reel/aufnahme.mjs [pfad/zu/chrome]
/* global process, document, scrollY */
import { createServer } from "node:http";
import { createRequire } from "node:module";
import { mkdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { extname, join } from "node:path";
import { fileURLToPath } from "node:url";

const { chromium } = createRequire(import.meta.url)("playwright");
const wurzel = fileURLToPath(new URL("../../../../", import.meta.url));
const ziel = new URL("../../public/reel/", import.meta.url);
const TYP = { ".html": "text/html", ".css": "text/css", ".js": "text/javascript", ".mjs": "text/javascript", ".svg": "image/svg+xml", ".woff2": "font/woff2", ".json": "application/json", ".jpg": "image/jpeg", ".png": "image/png" };

const server = createServer((req, res) => {
  let p = join(wurzel, decodeURIComponent(new URL(req.url, "http://x").pathname));
  try { if (statSync(p).isDirectory()) p = join(p, "index.html"); res.writeHead(200, { "content-type": TYP[extname(p)] || "application/octet-stream" }); res.end(readFileSync(p)); }
  catch { res.writeHead(404); res.end(); }
}).listen(0);
const port = server.address().port;

const browser = await chromium.launch({ executablePath: process.argv[2] || "/opt/pw-browsers/chromium_headless_shell-1194/chrome-linux/headless_shell" });
const seite = await browser.newPage({ viewport: { width: 430, height: 932 }, deviceScaleFactor: 2, colorScheme: "light", reducedMotion: "reduce" });
await seite.goto(`http://localhost:${port}/b/`, { waitUntil: "networkidle" });
await seite.waitForTimeout(800);
const stellen = await seite.evaluate(() => Object.fromEntries(
  [["angebote", ".angebote"], ["feld", "#feld-titel"], ["raster", "#raster-titel"], ["spielen", "#spielen-titel"]]
    .map(([n, s]) => [n, Math.round(document.querySelector(s).getBoundingClientRect().top + scrollY)])));
mkdirSync(ziel, { recursive: true });
await seite.screenshot({ path: fileURLToPath(new URL("b-telefon.png", ziel)), fullPage: true });
writeFileSync(new URL("b-stellen.json", ziel), JSON.stringify({ breite: 430, ...stellen }));
await browser.close();
server.close();
console.log("reel: Aufnahme /b/", stellen);
