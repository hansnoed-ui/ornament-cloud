// «PHORMA III» – Bilder der App (Wunsch vom 19. Oktober 2026: «Dann bau mir jetzt die App PHORMA III und leg sie auf die Alpha Seite»), wie bei PHORMA I
// (tools/phorma-bilder.mjs) von der Anwendung selbst gerechnet (alpha/phorma-iii/, Effekt «Traube», Quelle «Nur Ton» mit einem gleichmässigen Schlag),
// in voller Grösse, ohne Beschriftung und ohne Schriftzug, auf Schwarz.
//   Symbol: die Schlaufe des Signets als Perlenschnur (das Ende der Traube mit Logo)
//   Vorschau: die Kugel aus feinen Fäden mit der Traube darin (der erste Zustand)
//   assets/vorschau-phorma-iii.jpg                   640 × 800   Beitragsbild der Karte auf «Apps»: dasselbe Motiv wie die Kachel, im Hochformat
//                                                                (Wunsch: «Die Kachel ist toll. Kannst du das Bild auch im Beitrag bringen?»)
//   alpha/phorma-iii/app/og-phorma-iii.jpg          1200 × 630  Vorschaukachel zum Teilen (Open Graph, X) für die Seite app/ und die Anwendung
//   alpha/phorma-iii/icons/icon-512.png             512 × 512   Android, Installation («any»)
//   alpha/phorma-iii/icons/icon-192.png             192 × 192   Android, Browser
//   alpha/phorma-iii/icons/icon-maskable-512.png    512 × 512   Android, maskierbar (Schlaufe kleiner: das System schneidet zu)
//   alpha/phorma-iii/icons/apple-touch-icon.png     180 × 180   iPhone und iPad (Startbildschirm), auch das Bild auf der Alpha-Seite
//   alpha/phorma-iii/icons/favicon-32.png            32 × 32    Symbol im Browser-Tab
//
//   NODE_PATH=$(npm root -g) node tools/phorma-iii-bilder.mjs
import { mkdirSync, readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
let playwright;
try { playwright = require("playwright"); } catch { playwright = require(join(process.env.NODE_PATH || "", "playwright")); }
const { startServer } = await import(new URL("./serve-orma.mjs", import.meta.url).href);
const server = await startServer(0);
const base = `http://localhost:${server.address().port}/`;
const browser = await playwright.chromium.launch({ args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader"] });
const pfad = (p) => fileURLToPath(new URL(p, import.meta.url));

// ein gleichmässiger Schlag (12 s, wie in den Tests): damit hat die Traube Einsätze, Glut und das Logo am Schluss
const WAV = (() => {
  const rate = 22050, n = rate * 12, b = Buffer.alloc(44 + n * 2);
  b.write("RIFF", 0); b.writeUInt32LE(36 + n * 2, 4); b.write("WAVEfmt ", 8); b.writeUInt32LE(16, 16); b.writeUInt16LE(1, 20); b.writeUInt16LE(1, 22);
  b.writeUInt32LE(rate, 24); b.writeUInt32LE(rate * 2, 28); b.writeUInt16LE(2, 32); b.writeUInt16LE(16, 34); b.write("data", 36); b.writeUInt32LE(n * 2, 40);
  for (let i = 0; i < n; i++) {
    const t = i / rate, s = t % 0.75, schlag = t > 0.9 ? Math.exp(-s / 0.07) * (Math.sin(i * 0.03) + 0.5 * Math.sin(i * 1.1)) * 0.6 : 0;
    b.writeInt16LE(Math.round(Math.max(-1, Math.min(1, 0.05 * Math.sin(i * 0.05) + schlag)) * 32000), 44 + i * 2);
  }
  return b;
})();

// 1. die Traube: Nur Ton, Format 4 : 5, mit Logo; zwei Bilder der Bühne (WebGL, ohne die Schrift aus film.js)
const page = await browser.newPage({ viewport: { width: 1280, height: 950 } });
await page.goto(`${base}alpha/phorma-iii/`);
await page.click('[data-quelle="ton"]');
await page.click('[data-format="4:5"]');
if (!(await page.isChecked("#signet"))) await page.check("#signet");
await page.click('[data-wahl="traube"]');
await page.waitForSelector("#tondatei:not([disabled])", { timeout: 120_000 });
await page.setInputFiles("#tondatei", { name: "schlag.wav", mimeType: "audio/wav", buffer: WAV });
await page.waitForFunction(() => window.__phorma?.ton && window.__phorma.A, null, { timeout: 120_000 });
await page.waitForFunction(() => window.__phorma.ablauf === "traube" && window.__phorma.buehneSchluessel?.includes("|traube|") && window.__phorma.buehneFertig && !document.getElementById("video").disabled, null, { timeout: 300_000 });
const [kugel, schlaufe] = await page.evaluate(async () => {
  const S = window.__phorma, Z = S.sz.zeit, L = Z.phasen.find((p) => p.name === "logo");
  const zeichne = (t) => { const c = S.buehne.bild(Z, t, S.mass[0], S.mass[1], { proben: 4 }), k = document.createElement("canvas"); k.width = c.width; k.height = c.height; k.getContext("2d").drawImage(c, 0, 0); return k.toDataURL("image/png"); };
  return [zeichne(Z.phasen[0].von + 1.0), zeichne(L.bis - 0.6)];          // die Kugel nach dem Wachsen; die Schlaufe, wenn sie ruhig liegt
});
await page.close();

// wo die Perlen liegen (deutlich rote Punkte), je Bild
async function rahmen(src) {
  const p = await browser.newPage();
  const r = await p.evaluate(async (src) => {
    const b = new Image(); b.src = src; await b.decode();
    const c = new OffscreenCanvas(b.width, b.height), x = c.getContext("2d"); x.drawImage(b, 0, 0);
    const d = x.getImageData(0, 0, b.width, b.height).data;
    let x0 = b.width, y0 = b.height, x1 = 0, y1 = 0;
    for (let y = 0; y < b.height; y++) for (let i = 0; i < b.width; i++) {
      const k = (y * b.width + i) * 4;
      if (d[k] > 90 && d[k] > 1.6 * d[k + 1]) { if (i < x0) x0 = i; if (i > x1) x1 = i; if (y < y0) y0 = y; if (y > y1) y1 = y; }
    }
    return { b: b.width, h: b.height, x0, y0, x1, y1 };
  }, src);
  await p.close();
  return { ...r, mitte: [(r.x0 + r.x1) / 2, (r.y0 + r.y1) / 2], groesse: Math.max(r.x1 - r.x0, r.y1 - r.y0) };
}
const rS = await rahmen(schlaufe), rK = await rahmen(kugel);
console.log("Schlaufe:", rS, "Kugel:", rK);

// 2. App-Symbole: die Perlenschlaufe auf Schwarz, mit einem Hauch rotem Licht von hinten; anteil = Grösse der Schlaufe im Verhältnis zur Seite
mkdirSync(pfad("../alpha/phorma-iii/icons/"), { recursive: true });
async function symbol(n, anteil, ziel) {
  const p = await browser.newPage({ viewport: { width: n, height: n }, deviceScaleFactor: 1 });
  await p.setContent(`<!DOCTYPE html><html><head><style>html,body{margin:0}canvas{display:block}</style></head><body><canvas width="${n}" height="${n}"></canvas></body></html>`);
  await p.evaluate(async ({ n, anteil, src, mitte, groesse }) => {
    const b = new Image(); b.src = src; await b.decode();
    const x = document.querySelector("canvas").getContext("2d");
    const g = x.createRadialGradient(n / 2, n / 2, 0, n / 2, n / 2, n * 0.7);
    g.addColorStop(0, "#1c0d0e"); g.addColorStop(1, "#000");
    x.fillStyle = g; x.fillRect(0, 0, n, n);
    const s = (n * anteil) / groesse;
    x.imageSmoothingQuality = "high";
    x.globalCompositeOperation = "lighter";   // das Schwarz des Bilds verschwindet im Grund
    x.drawImage(b, n / 2 - mitte[0] * s, n / 2 - mitte[1] * s, b.width * s, b.height * s);
  }, { n, anteil, src: schlaufe, mitte: rS.mitte, groesse: rS.groesse });
  await p.locator("canvas").screenshot({ path: pfad(ziel), type: "png" });
  await p.close();
}
await symbol(512, 0.8, "../alpha/phorma-iii/icons/icon-512.png");
await symbol(192, 0.8, "../alpha/phorma-iii/icons/icon-192.png");
await symbol(512, 0.6, "../alpha/phorma-iii/icons/icon-maskable-512.png");   // sichere Zone: Kreis mit 80 % Durchmesser
await symbol(180, 0.8, "../alpha/phorma-iii/icons/apple-touch-icon.png");
await symbol(32, 0.94, "../alpha/phorma-iii/icons/favicon-32.png");

// 3. Beitragsbild für «Apps»: die Kugel im Hochformat der Karten (4 : 5 wie der Film), die Traube in der Mitte, etwas näher als im ganzen Bild
{
  const p = await browser.newPage({ viewport: { width: 640, height: 800 }, deviceScaleFactor: 1 });
  const s = (800 / rK.h) * 1.12;
  await p.setContent(`<!DOCTYPE html><html><head><style>
    html, body { margin: 0; width: 640px; height: 800px; overflow: hidden; background: #000; }
    img { position: absolute; left: ${320 - rK.mitte[0] * s}px; top: ${400 - rK.mitte[1] * s}px; width: ${rK.b * s}px; height: ${rK.h * s}px; }
  </style></head><body><img src="${kugel}"></body></html>`);
  await p.waitForTimeout(300);
  const out = pfad("../assets/vorschau-phorma-iii.jpg");
  await p.screenshot({ path: out, type: "jpeg", quality: 84 });
  console.log("geschrieben:", out);
  await p.close();
}

// 4. Vorschaukachel zum Teilen: links Titel und Satz, rechts die Kugel aus Fäden mit der Traube
{
  const p = await browser.newPage({ viewport: { width: 1200, height: 630 }, deviceScaleFactor: 1 });
  const s = 780 / rK.h;                                                      // die Kugel gross rechts, die Traube in ihrer Mitte
  await p.setContent(`<!DOCTYPE html><html lang="de"><head><meta charset="utf-8"><base href="${base}"><link rel="stylesheet" href="vendor/fonts/fonts.css"><style>
    html, body { margin: 0; width: 1200px; height: 630px; overflow: hidden; background: #000; }
    img { position: absolute; left: ${900 - rK.mitte[0] * s}px; top: ${330 - rK.mitte[1] * s}px; width: ${rK.b * s}px; height: ${rK.h * s}px; }
    .schatten { position: absolute; left: 0; top: 0; width: 680px; height: 630px; background: linear-gradient(90deg, #000 70%, transparent); }
    .text { position: absolute; left: 64px; top: 0; bottom: 0; width: 540px; display: flex; flex-direction: column; justify-content: center; color: #ebe6dc; }
    .marke { font: 600 15px/1 "Instrument Sans", sans-serif; letter-spacing: 0.16em; text-transform: uppercase; color: #9a9388; margin: 0 0 22px; }
    h1 { font: 400 88px/0.95 "Newsreader", serif; letter-spacing: 0.01em; margin: 0; white-space: nowrap; }
    p { font: 400 30px/1.32 "Newsreader", serif; margin: 26px 0 0; color: #ebe6dc; }
    .fuss { margin-top: 38px; font: 400 19px/1.45 "Instrument Sans", sans-serif; color: #9a9388; }
    .fuss b { display: block; font-weight: 500; color: #f08a5d; }
  </style></head><body>
    <img src="${kugel}"><div class="schatten"></div>
    <div class="text">
      <div class="marke">App · Video mit Ton · ohne Netz</div>
      <h1>PHORMA III</h1>
      <p>Aus Klang wird Bild – mit Musik, Stimme oder Video.</p>
      <div class="fuss"><b>ornament.cloud/alpha/phorma-iii/app</b>Alles bleibt auf dem Gerät.</div>
    </div></body></html>`);
  await p.evaluate(() => document.fonts.ready);
  await p.waitForTimeout(400);
  mkdirSync(pfad("../alpha/phorma-iii/app/"), { recursive: true });
  const out = pfad("../alpha/phorma-iii/app/og-phorma-iii.jpg");
  await p.screenshot({ path: out, type: "jpeg", quality: 86 });
  console.log("geschrieben:", out);
  await p.close();
}

await browser.close();
server.close();
console.log("geschrieben: alpha/phorma-iii/icons/");
