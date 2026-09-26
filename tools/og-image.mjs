// Erzeugt das Vorschaubild (Open Graph / X-Karte, 1200 × 630) für «Nebeneinander, Nacheinander»
// direkt aus dem Rad: Seite mit einer festen Konstellation laden, das Rad-SVG übernehmen und
// zusammen mit dem Titel neu setzen. Benötigt Playwright.
//
//   NODE_PATH=$(npm root -g) node tools/og-image.mjs
//
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { extname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
let playwright;
try { playwright = require("playwright"); } catch { playwright = require(join(process.env.NODE_PATH || "", "playwright")); }

const PAIR = "agnes-martin__niklas-luhmann";
const OUT = new URL("../assets/og-nebeneinander-nacheinander.png", import.meta.url);
const root = fileURLToPath(new URL("../", import.meta.url));
const types = { ".html": "text/html", ".css": "text/css", ".js": "text/javascript", ".woff2": "font/woff2", ".svg": "image/svg+xml" };

const server = createServer(async (req, res) => {
  try {
    let p = decodeURIComponent(new URL(req.url, "http://x").pathname);
    if (p.endsWith("/")) p += "index.html";
    const body = await readFile(join(root, p));
    res.writeHead(200, { "content-type": types[extname(p)] || "application/octet-stream" }).end(body);
  } catch { res.writeHead(404).end(); }
}).listen(0);
const base = `http://localhost:${server.address().port}/`;

const browser = await playwright.chromium.launch();
const page = await browser.newPage({ viewport: { width: 1200, height: 630 }, deviceScaleFactor: 1, colorScheme: "light", reducedMotion: "reduce" });
await page.goto(`${base}portfolio/nebeneinander-nacheinander/?pair=${PAIR}`);
await page.waitForFunction(() => document.querySelector(".rad-wheel")?.__rad?.current);
await page.waitForTimeout(600);

await page.evaluate(({ fontsHref }) => {
  const svg = document.querySelector(".rad-wheel").cloneNode(true);
  const artist = document.querySelector(".rad-artist").textContent;
  const theorist = document.querySelector(".rad-theorist").textContent;
  document.head.insertAdjacentHTML("beforeend", `<link rel="stylesheet" href="${fontsHref}"><style>
    html, body { margin: 0; background: #fff; }
    .og { box-sizing: border-box; width: 1200px; height: 630px; display: grid; grid-template-columns: 560px 1fr; align-items: center; gap: 56px; padding: 0 80px 0 50px; color: #1f1d1a; }
    .og .rad-wheel { width: 560px; height: 560px; cursor: default; }
    .og-eyebrow { font: 600 15px/1 "Instrument Sans", system-ui, sans-serif; letter-spacing: .22em; text-transform: uppercase; color: #c2410c; margin: 0 0 28px; }
    .og-title { font: 400 62px/1.05 Newsreader, Georgia, serif; margin: 0 0 22px; letter-spacing: -.01em; }
    .og-lead { font: 400 22px/1.45 "Instrument Sans", system-ui, sans-serif; color: #6b665e; margin: 0 0 40px; }
    .og-pair { font: italic 400 24px/1.3 Newsreader, Georgia, serif; margin: 0; padding-top: 20px; border-top: 1px solid #e4e0d8; }
    .og-pair span { color: #6b665e; padding: 0 .2em; }
  </style>`);
  document.body.className = "";
  document.body.innerHTML = "";
  const box = document.createElement("div");
  box.className = "og";
  box.append(svg);
  box.insertAdjacentHTML("beforeend", `<div>
    <p class="og-eyebrow">Ornament Cloud</p>
    <h1 class="og-title">Nebeneinander,<br>Nacheinander</h1>
    <p class="og-lead">Eine interaktive Versuchsanordnung zu Raum und Zeit der Wahrnehmung.</p>
    <p class="og-pair">${artist}<span>×</span>${theorist}</p>
  </div>`);
  document.body.append(box);
}, { fontsHref: `${base}vendor/fonts/fonts.css` });
await page.evaluate(() => document.fonts.ready);
await page.waitForTimeout(300);
await page.screenshot({ path: fileURLToPath(OUT) });
await browser.close();
server.close();
console.log("geschrieben:", fileURLToPath(OUT));
