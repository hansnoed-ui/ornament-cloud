// «The Fictory» – App-Symbole (Wunsch von Christian, 11. Oktober 2026: eine herunterladbare App für die App-Seite «inklusive coolem App-Symbol»).
// Motiv: ein einzelnes Teil aus Christians Raster (src/the-fictory/vorschau-quelle.jpg, Zeile 5, Spalte 7: die schimmernde Raute mit dem
// «Auge»), freigestellt auf dem Nachtblau des Rasters, mit Passermarken in den Ecken (die Werkbank) und feinen Scanlines wie in der Animation.
//   alpha/the-fictory/icons/icon-512.png            512 × 512   Android, Installation («any»)
//   alpha/the-fictory/icons/icon-192.png            192 × 192   Android, Browser
//   alpha/the-fictory/icons/icon-maskable-512.png   512 × 512   Android, maskierbar (Motiv kleiner, ohne Ecken – das System schneidet zu)
//   alpha/the-fictory/icons/apple-touch-icon.png    180 × 180   iPhone und iPad (Startbildschirm)
//   alpha/the-fictory/icons/favicon-32.png           32 × 32    Symbol im Browser-Tab
//   assets/vorschau-the-fictory-app.jpg              640 × 800   Vorschaukachel der Karte auf «Apps»: das App-Symbol als abgerundete Kachel,
//                                                                 schwebend über dem abgedunkelten Raster (Wunsch: «auch dafür eine schöne Vorschaukachel»)
//   alpha/the-fictory/app/og-the-fictory-app.jpg     1200 × 630  eigene Vorschaukachel der App zum Teilen (Open Graph, X) für die Seite app/
//                                                                 (Wunsch vom 11. Oktober 2026: «Eigene Vorschaukachel für die App»)
//
//   NODE_PATH=$(npm root -g) node tools/fictory-icons.mjs
import { mkdirSync } from "node:fs";
import { createRequire } from "node:module";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
let playwright;
try { playwright = require("playwright"); } catch { playwright = require(join(process.env.NODE_PATH || "", "playwright")); }
const { startServer } = await import(new URL("./serve-orma.mjs", import.meta.url).href);
const server = await startServer(0);
const base = `http://localhost:${server.address().port}/`;
const browser = await playwright.chromium.launch();
mkdirSync(fileURLToPath(new URL("../alpha/the-fictory/icons/", import.meta.url)), { recursive: true });

// Lage des Teils in der Quelle (1600 × 1592): Mitte und Radius, innerhalb dessen nur dieses Teil liegt
export const TEIL = { x: 1010, y: 797, r: 84 };

/** zeichnet ein Symbol (b × h, sonst quadratisch); anteil = Radius des Teils im Verhältnis zur halben kürzeren Seite; ecken = Passermarken */
async function symbol(n, anteil, ecken, ziel, h = n) {
  const b = n;
  const page = await browser.newPage({ viewport: { width: b, height: h }, deviceScaleFactor: 1 });
  await page.setContent(`<!DOCTYPE html><html><head><base href="${base}"><style>html,body{margin:0;background:#00010c}canvas{display:block}</style></head><body><canvas width="${b}" height="${h}"></canvas></body></html>`);
  await page.evaluate(async ({ b, h, anteil, ecken, TEIL }) => {
    const bild = new Image(); bild.src = "src/the-fictory/vorschau-quelle.jpg"; await bild.decode();
    const c = document.querySelector("canvas"), x = c.getContext("2d"), n = Math.min(b, h), m = n / 2, mx = b / 2, my = h / 2;
    // Grund: das Nachtblau des Rasters, in der Mitte ein Hauch heller (das Teil leuchtet)
    const g = x.createRadialGradient(mx, my, 0, mx, my, Math.max(b, h) * 0.55);
    g.addColorStop(0, "#0d1040"); g.addColorStop(0.55, "#04052a"); g.addColorStop(1, "#00010c");
    x.fillStyle = g; x.fillRect(0, 0, b, h);
    // das Teil, weich freigestellt (Nachbarn im Raster fallen weg)
    const r = m * anteil, s = r / TEIL.r;
    const t = document.createElement("canvas"); t.width = t.height = Math.ceil(2 * r);
    const tx = t.getContext("2d");
    tx.imageSmoothingQuality = "high";
    tx.drawImage(bild, TEIL.x - TEIL.r, TEIL.y - TEIL.r, 2 * TEIL.r, 2 * TEIL.r, 0, 0, t.width, t.height);
    const maske = tx.createRadialGradient(r, r, 0, r, r, r);
    maske.addColorStop(0, "#000"); maske.addColorStop(0.86, "#000"); maske.addColorStop(1, "rgba(0,0,0,0)");
    tx.globalCompositeOperation = "destination-in"; tx.fillStyle = maske; tx.fillRect(0, 0, t.width, t.height);
    x.globalCompositeOperation = "lighter";           // das Teil leuchtet auf dem Grund, wie in der Animation
    x.drawImage(t, mx - r, my - r);
    x.globalCompositeOperation = "source-over";
    // Passermarken der Werkbank in den vier Ecken
    if (ecken) {
      const a = n * 0.13, l = n * 0.075, w = Math.max(1, n / 128);
      x.strokeStyle = "rgba(235,230,220,0.72)"; x.lineWidth = w; x.lineCap = "square";
      for (const [ex, ey, dx, dy] of [[a, a, 1, 1], [b - a, a, -1, 1], [a, h - a, 1, -1], [b - a, h - a, -1, -1]]) {
        x.beginPath(); x.moveTo(ex, ey + dy * l); x.lineTo(ex, ey); x.lineTo(ex + dx * l, ey); x.stroke();
      }
    }
    // Scanlines, nur ab mittlerer Grösse (klein würden sie zu Grau)
    if (n >= 128) { x.fillStyle = "rgba(0,0,0,0.16)"; for (let y = 0; y < h; y += 3) x.fillRect(0, y, b, 1); }
  }, { b, h, anteil, ecken, TEIL });
  const out = fileURLToPath(new URL(ziel, import.meta.url));
  const jpg = ziel.endsWith(".jpg");
  await page.locator("canvas").screenshot({ path: out, type: jpg ? "jpeg" : "png", ...(jpg ? { quality: 82 } : {}) });
  console.log("geschrieben:", out);
  await page.close();
}

await symbol(512, 0.66, true, "../alpha/the-fictory/icons/icon-512.png");
await symbol(192, 0.66, true, "../alpha/the-fictory/icons/icon-192.png");
await symbol(512, 0.5, false, "../alpha/the-fictory/icons/icon-maskable-512.png");   // sichere Zone: Kreis mit 80 % Durchmesser
await symbol(180, 0.68, true, "../alpha/the-fictory/icons/apple-touch-icon.png");
await symbol(32, 0.92, false, "../alpha/the-fictory/icons/favicon-32.png");

// Vorschaukachel für «Apps»: das fertige Symbol (icon-512.png) als App-Kachel über dem Raster
{
  const page = await browser.newPage({ viewport: { width: 640, height: 800 }, deviceScaleFactor: 1 });
  await page.setContent(`<!DOCTYPE html><html><head><base href="${base}"><style>
    html, body { margin: 0; width: 640px; height: 800px; overflow: hidden; background: #00010c; }
    .raster { position: absolute; inset: -30px; background: url(src/the-fictory/vorschau-quelle.jpg) 50% 50% / 760px auto no-repeat #00010c; opacity: 0.42; filter: blur(1.5px) saturate(1.2); }
    .schleier { position: absolute; inset: 0; background: radial-gradient(circle at 50% 50%, rgba(0,1,12,0.86) 0, rgba(0,1,12,0.55) 230px, rgba(0,1,12,0.15) 420px); }
    .kachel { position: absolute; left: 50%; top: 50%; width: 300px; height: 300px; margin: -150px 0 0 -150px; border-radius: 68px; overflow: hidden;
      background: url(alpha/the-fictory/icons/icon-512.png) center / cover;
      box-shadow: 0 0 0 1px rgba(235,230,220,0.18), 0 30px 80px rgba(0,0,0,0.75), 0 0 120px rgba(70,80,255,0.35); }
    .kachel::after { content: ""; position: absolute; inset: 0; border-radius: inherit; background: linear-gradient(160deg, rgba(255,255,255,0.13), rgba(255,255,255,0) 42%); }
    .zeilen { position: absolute; inset: 0; background: repeating-linear-gradient(0deg, rgba(0,0,0,0.14) 0 1px, transparent 1px 3px); }
  </style></head><body><div class="raster"></div><div class="schleier"></div><div class="kachel"></div><div class="zeilen"></div></body></html>`);
  await page.evaluate(() => Promise.all([...document.querySelectorAll("div")].map(() => document.fonts.ready)));
  await page.waitForTimeout(400);
  const out = fileURLToPath(new URL("../assets/vorschau-the-fictory-app.jpg", import.meta.url));
  await page.screenshot({ path: out, type: "jpeg", quality: 80 });
  console.log("geschrieben:", out);
  await page.close();
}

// Vorschaukachel der App zum Teilen: links Titel und Satz wie auf der Karte der Fictory, rechts die App-Kachel über dem Raster
{
  const page = await browser.newPage({ viewport: { width: 1200, height: 630 }, deviceScaleFactor: 1 });
  await page.goto(`${base}vendor/fonts/fonts.css`);
  await page.setContent(`<!DOCTYPE html><html lang="de"><head><meta charset="utf-8"><base href="${base}"><link rel="stylesheet" href="vendor/fonts/fonts.css"><style>
    html, body { margin: 0; width: 1200px; height: 630px; overflow: hidden; background: #00010c; }
    .rechts { position: absolute; right: 0; top: 0; width: 660px; height: 630px; overflow: hidden; }
    .raster { position: absolute; inset: -20px; background: url(src/the-fictory/vorschau-quelle.jpg) 50% 50% / 720px auto no-repeat #00010c; opacity: 0.42; filter: blur(1.5px) saturate(1.2); }
    .schleier { position: absolute; inset: 0; background: radial-gradient(circle at 50% 50%, rgba(0,1,12,0.86) 0, rgba(0,1,12,0.55) 200px, rgba(0,1,12,0.12) 380px); }
    .kachel { position: absolute; left: 50%; top: 50%; width: 290px; height: 290px; margin: -145px 0 0 -145px; border-radius: 66px; overflow: hidden;
      background: url(alpha/the-fictory/icons/icon-512.png) center / cover;
      box-shadow: 0 0 0 1px rgba(235,230,220,0.18), 0 30px 80px rgba(0,0,0,0.75), 0 0 120px rgba(70,80,255,0.35); }
    .kachel::after { content: ""; position: absolute; inset: 0; border-radius: inherit; background: linear-gradient(160deg, rgba(255,255,255,0.13), rgba(255,255,255,0) 42%); }
    .kante { position: absolute; left: 540px; top: 0; width: 60px; height: 630px; background: linear-gradient(90deg, #00010c, rgba(0,1,12,0)); }
    .text { position: absolute; left: 64px; top: 0; bottom: 0; width: 470px; display: flex; flex-direction: column; justify-content: center; color: #ebe6dc; }
    .marke { font: 600 15px/1 "Instrument Sans", sans-serif; letter-spacing: 0.16em; text-transform: uppercase; color: #9a9388; margin: 0 0 22px; }
    h1 { font: 400 86px/0.95 "Newsreader", serif; letter-spacing: -0.02em; margin: 0; }
    p { font: 400 30px/1.32 "Newsreader", serif; margin: 26px 0 0; color: #ebe6dc; }
    .fuss { margin-top: 38px; font: 400 19px/1.45 "Instrument Sans", sans-serif; color: #9a9388; }
    .fuss b { display: block; font-weight: 500; color: #e9c46a; }
    .zeilen { position: absolute; inset: 0; background: repeating-linear-gradient(0deg, rgba(0,0,0,0.14) 0 1px, transparent 1px 3px); }
  </style></head><body>
    <div class="rechts"><div class="raster"></div><div class="schleier"></div><div class="kachel"></div></div>
    <div class="kante"></div>
    <div class="text">
      <div class="marke">App · installieren · ohne Netz</div>
      <h1>The Fictory</h1>
      <p>Ein Bild zerfällt in seine Teile und geht weiter. Jetzt auf dem Startbildschirm.</p>
      <div class="fuss"><b>ornament.cloud/alpha/the-fictory/app</b>Dein Bild bleibt auf dem Gerät.</div>
    </div>
    <div class="zeilen"></div></body></html>`);
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(400);
  mkdirSync(fileURLToPath(new URL("../alpha/the-fictory/app/", import.meta.url)), { recursive: true });
  const out = fileURLToPath(new URL("../alpha/the-fictory/app/og-the-fictory-app.jpg", import.meta.url));
  await page.screenshot({ path: out, type: "jpeg", quality: 86 });
  console.log("geschrieben:", out);
  await page.close();
}

await browser.close();
server.close();
