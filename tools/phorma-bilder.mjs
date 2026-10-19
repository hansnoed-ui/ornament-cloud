// «PHORMA I» – Bilder der App (Wunsch vom 17. Oktober 2026: «Jetzt daraus eine App bauen ("PHORMA I"). Und bei den Apps als Beitrag präsentieren
// (als erster Eintrag). Dazu: Beitragsbild (eine Kristallansicht), Vorschaubild für social media»).
// Motiv: der Glaskörper aus der Verwandlung (Effekt «Körper», 5,4 s: die Geode mit den gebrochenen Figuren des Beispielbilds), gerendert von der
// Anwendung selbst (alpha/bildfragmentieren/), in voller Grösse, ohne Beschriftung und ohne Signet, auf Schwarz.
//   assets/vorschau-phorma-i.jpg                      640 × 800   Beitragsbild der Karte auf «Apps»: die Kristallansicht im Hochformat des Films
//   assets/vorschau-phorma-i-2x.jpg                  1280 × 1600  dasselbe doppelt so gross, für Bildschirme mit hoher Dichte (srcset; seit 19. Oktober 2026)
//   alpha/bildfragmentieren/app/og-phorma-i.jpg      1200 × 630  Vorschaukachel zum Teilen (Open Graph, X) für die Seite app/
//   alpha/bildfragmentieren/icons/icon-512.png             512 × 512   Android, Installation («any»)
//   alpha/bildfragmentieren/icons/icon-192.png             192 × 192   Android, Browser
//   alpha/bildfragmentieren/icons/icon-maskable-512.png    512 × 512   Android, maskierbar (Kristall kleiner: das System schneidet zu)
//   alpha/bildfragmentieren/icons/apple-touch-icon.png     180 × 180   iPhone und iPad (Startbildschirm)
//   alpha/bildfragmentieren/icons/favicon-32.png            32 × 32    Symbol im Browser-Tab
//
//   NODE_PATH=$(npm root -g) node tools/phorma-bilder.mjs
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
let playwright;
try { playwright = require("playwright"); } catch { playwright = require(join(process.env.NODE_PATH || "", "playwright")); }
const { startServer } = await import(new URL("./serve-orma.mjs", import.meta.url).href);
const server = await startServer(0);
const base = `http://localhost:${server.address().port}/`;
const browser = await playwright.chromium.launch({ args: ["--use-angle=swiftshader", "--enable-unsafe-swiftshader"] });
const pfad = (p) => fileURLToPath(new URL(p, import.meta.url));
const ZEIT = 5.4;   // Sekunde im Effekt «Körper»: die Geode, gross und ruhig
// doppelt so gross wie der Film gerechnet und erst dann verkleinert (seit 19. Oktober 2026, Wunsch: «ein qualitativ besseres Beitragsbild für
// PHORMA I»): die Kanten des Glases werden scharf, die feinen Linien rauschen nicht mehr
const GROSS = 2;

// 1. die Kristallansicht: Beispielbild laden, nur «Körper» wählen, das Bild zur Zeit ZEIT in voller Grösse zeichnen
const kristall = await (async () => {
  const page = await browser.newPage({ viewport: { width: 1280, height: 950 } });
  await page.goto(`${base}alpha/bildfragmentieren/`);
  await page.click("[data-ablauf=fragmente]");
  await page.click("[data-effekt=koerper]");
  await page.setInputFiles("#datei", { name: "beispiel.jpg", mimeType: "image/jpeg", buffer: readFileSync(pfad("../alpha/bildfragmentieren/beispiel.jpg")) });
  await page.waitForFunction(() => window.__bildfragmentieren?.sz?.raum?.art === "koerper", null, { timeout: 180000 });
  const marke = readFileSync(pfad("../alpha/bildfragmentieren/app.js"), "utf8").match(/szene\.js\?v=(\d+)/)[1];
  const url = await page.evaluate(async ({ t, marke, gross }) => {
    const { szene, bild } = await import(`./szene.js?v=${marke}`);
    const S = window.__bildfragmentieren;
    const sz = szene(S.daten, { breite: S.mass[0] * gross, hoehe: S.mass[1] * gross, foto: S.foto, leinwand: (w, h) => new OffscreenCanvas(w, h), beschriftung: false, ablauf: S.ablauf, raum: S.raum, signet: false });
    const c = document.createElement("canvas"); c.width = sz.breite; c.height = sz.hoehe; bild(c.getContext("2d"), sz, t);
    return c.toDataURL("image/png");
  }, { t: ZEIT, marke, gross: GROSS });
  await page.close();
  return url;
})();

// wo der Kristall liegt (alles, was heller als der Grund ist)
const rahmen = await (async () => {
  const page = await browser.newPage();
  const r = await page.evaluate(async (src) => {
    const b = new Image(); b.src = src; await b.decode();
    const c = new OffscreenCanvas(b.width, b.height), x = c.getContext("2d"); x.drawImage(b, 0, 0);
    const d = x.getImageData(0, 0, b.width, b.height).data;
    let x0 = b.width, y0 = b.height, x1 = 0, y1 = 0;
    for (let y = 0; y < b.height; y++) for (let i = 0; i < b.width; i++) {
      const k = (y * b.width + i) * 4;
      if (d[k] + d[k + 1] + d[k + 2] > 60) { if (i < x0) x0 = i; if (i > x1) x1 = i; if (y < y0) y0 = y; if (y > y1) y1 = y; }
    }
    return { b: b.width, h: b.height, x0, y0, x1, y1 };
  }, kristall);
  await page.close();
  return r;
})();
const mitte = [(rahmen.x0 + rahmen.x1) / 2, (rahmen.y0 + rahmen.y1) / 2], groesse = Math.max(rahmen.x1 - rahmen.x0, rahmen.y1 - rahmen.y0);
console.log("Kristall:", rahmen);

// 2. App-Symbole: der Kristall auf Schwarz, mit einem Hauch Licht von hinten; anteil = Grösse des Kristalls im Verhältnis zur Seite
mkdirSync(pfad("../alpha/bildfragmentieren/icons/"), { recursive: true });
async function symbol(n, anteil, ziel) {
  const page = await browser.newPage({ viewport: { width: n, height: n }, deviceScaleFactor: 1 });
  await page.setContent(`<!DOCTYPE html><html><head><style>html,body{margin:0}canvas{display:block}</style></head><body><canvas width="${n}" height="${n}"></canvas></body></html>`);
  await page.evaluate(async ({ n, anteil, src, mitte, groesse }) => {
    const b = new Image(); b.src = src; await b.decode();
    const x = document.querySelector("canvas").getContext("2d");
    const g = x.createRadialGradient(n / 2, n / 2, 0, n / 2, n / 2, n * 0.7);
    g.addColorStop(0, "#14161f"); g.addColorStop(1, "#000");
    x.fillStyle = g; x.fillRect(0, 0, n, n);
    const s = (n * anteil) / groesse;
    x.imageSmoothingQuality = "high";
    x.globalCompositeOperation = "lighter";   // Schwarz des Renders verschwindet im Grund
    x.drawImage(b, n / 2 - mitte[0] * s, n / 2 - mitte[1] * s, b.width * s, b.height * s);
  }, { n, anteil, src: kristall, mitte, groesse });
  await page.locator("canvas").screenshot({ path: pfad(ziel), type: "png" });
  await page.close();
}
await symbol(512, 0.86, "../alpha/bildfragmentieren/icons/icon-512.png");
await symbol(192, 0.86, "../alpha/bildfragmentieren/icons/icon-192.png");
await symbol(512, 0.64, "../alpha/bildfragmentieren/icons/icon-maskable-512.png");   // sichere Zone: Kreis mit 80 % Durchmesser
await symbol(180, 0.86, "../alpha/bildfragmentieren/icons/apple-touch-icon.png");
await symbol(32, 0.98, "../alpha/bildfragmentieren/icons/favicon-32.png");

// 3. Beitragsbild für «Apps»: die Kristallansicht im Hochformat des Films (4:5), der Kristall in der Mitte
for (const [dichte, datei, qualitaet] of [[1, "vorschau-phorma-i.jpg", 90], [2, "vorschau-phorma-i-2x.jpg", 86]]) {
  const page = await browser.newPage({ viewport: { width: 640, height: 800 }, deviceScaleFactor: dichte });
  const s = 640 * 0.84 / groesse;
  await page.setContent(`<!DOCTYPE html><html><head><style>
    html, body { margin: 0; width: 640px; height: 800px; overflow: hidden; background: #000; }
    .licht { position: absolute; inset: 0; background: radial-gradient(circle at 50% 50%, #161924 0, #07080c 300px, #000 460px); }
    img { position: absolute; left: ${320 - mitte[0] * s}px; top: ${400 - mitte[1] * s}px; width: ${rahmen.b * s}px; height: ${rahmen.h * s}px; mix-blend-mode: lighten; }
  </style></head><body><div class="licht"></div><img src="${kristall}"></body></html>`);
  await page.waitForTimeout(300);
  const out = pfad(`../assets/${datei}`);
  await page.screenshot({ path: out, type: "jpeg", quality: qualitaet });
  console.log("geschrieben:", out);
  await page.close();
}

// 4. Vorschaukachel zum Teilen: links Titel und Satz, rechts der Kristall
{
  const page = await browser.newPage({ viewport: { width: 1200, height: 630 }, deviceScaleFactor: 1 });
  const s = 540 / groesse;
  await page.setContent(`<!DOCTYPE html><html lang="de"><head><meta charset="utf-8"><base href="${base}"><link rel="stylesheet" href="vendor/fonts/fonts.css"><style>
    html, body { margin: 0; width: 1200px; height: 630px; overflow: hidden; background: #000; }
    .licht { position: absolute; right: 0; top: 0; width: 700px; height: 630px; background: radial-gradient(circle at 60% 50%, #161924 0, #07080c 260px, #000 420px); }
    img { position: absolute; left: ${900 - mitte[0] * s}px; top: ${315 - mitte[1] * s}px; width: ${rahmen.b * s}px; height: ${rahmen.h * s}px; mix-blend-mode: lighten; }
    .text { position: absolute; left: 64px; top: 0; bottom: 0; width: 520px; display: flex; flex-direction: column; justify-content: center; color: #ebe6dc; }
    .marke { font: 600 15px/1 "Instrument Sans", sans-serif; letter-spacing: 0.16em; text-transform: uppercase; color: #9a9388; margin: 0 0 22px; }
    h1 { font: 400 104px/0.95 "Newsreader", serif; letter-spacing: 0.01em; margin: 0; }
    p { font: 400 30px/1.32 "Newsreader", serif; margin: 26px 0 0; color: #ebe6dc; }
    .fuss { margin-top: 38px; font: 400 19px/1.45 "Instrument Sans", sans-serif; color: #9a9388; }
    .fuss b { display: block; font-weight: 500; color: #e9c46a; }
  </style></head><body>
    <div class="licht"></div><img src="${kristall}">
    <div class="text">
      <div class="marke">App · Video · ohne Netz</div>
      <h1>PHORMA I</h1>
      <p>Als erste Anwendung in einer langen Reihe: Ein Foto wird zu Funken, Glas, Scherben, Echo und Gebirge.</p>
      <div class="fuss"><b>ornament.cloud/alpha/bildfragmentieren/app</b>Dein Foto bleibt auf dem Gerät.</div>
    </div></body></html>`);
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(400);
  mkdirSync(pfad("../alpha/bildfragmentieren/app/"), { recursive: true });
  const out = pfad("../alpha/bildfragmentieren/app/og-phorma-i.jpg");
  await page.screenshot({ path: out, type: "jpeg", quality: 86 });
  console.log("geschrieben:", out);
  await page.close();
}

await browser.close();
server.close();
console.log("geschrieben: alpha/bildfragmentieren/icons/");
