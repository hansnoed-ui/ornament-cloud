// «Principesse» – App-Symbole (Wunsch vom 12. Oktober 2026: «Bitte baue mir die Principesse-App. Signet als Logo»).
// Motiv: die kleine Prinzessin aus dem Signet (alpha/principesse/signet.js), fertig gezeichnet, mit goldener Krone und farbigem Kleid,
// ohne Schrift, auf dem hellen Grund des Signets. Gezeichnet wird mit signet.js selbst, damit Symbol und Film gleich aussehen.
//   alpha/principesse/icons/icon-512.png            512 × 512   Android, Installation («any»)
//   alpha/principesse/icons/icon-192.png            192 × 192   Android, Browser
//   alpha/principesse/icons/icon-maskable-512.png   512 × 512   Android, maskierbar (Figur kleiner: das System schneidet zu)
//   alpha/principesse/icons/apple-touch-icon.png    180 × 180   iPhone und iPad (Startbildschirm)
//   alpha/principesse/icons/favicon-32.png           32 × 32    Symbol im Browser-Tab
// Keine Vorschaukachel und keine App-Seite (Wunsch: kein Eintrag, keine Vorschaukarte, nur über die eigene Seite).
//
//   NODE_PATH=$(npm root -g) node tools/principesse-icons.mjs
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
mkdirSync(fileURLToPath(new URL("../alpha/principesse/icons/", import.meta.url)), { recursive: true });

/** zeichnet ein Symbol n × n; anteil = Höhe der Figur im Verhältnis zur Seite */
async function symbol(n, anteil, ziel) {
  const page = await browser.newPage({ viewport: { width: n, height: n }, deviceScaleFactor: 1 });
  await page.goto(`${base}alpha/principesse/`);   // dieselbe Herkunft, damit signet.js als Modul geladen werden kann
  await page.evaluate(async ({ n, anteil }) => {
    document.documentElement.innerHTML = `<head><style>html,body{margin:0}canvas{display:block}</style></head><body><canvas width="${n}" height="${n}"></canvas></body>`;
    const { signet, FARBEN } = await import("./signet.js");
    const F = FARBEN.hell;
    // die Figur gross auf einer durchsichtigen Leinwand: fertig gezeichnet, Krone gefüllt, noch bevor der Name erscheint (2,68 s);
    // in allen Grössen mit den feinen Linien des Signets (Wunsch vom 12. Oktober 2026: die erste Fassung, nicht kräftigere Linien für kleine Symbole)
    const G = 1600, q = document.createElement("canvas"); q.width = q.height = G;
    const qx = q.getContext("2d");
    signet(qx, 2.68, F, G, G);
    // wo die Figur liegt (alles Gezeichnete)
    const d = qx.getImageData(0, 0, G, G).data;
    let x0 = G, y0 = G, x1 = 0, y1 = 0;
    for (let y = 0; y < G; y++) for (let x = 0; x < G; x++) if (d[(y * G + x) * 4 + 3] > 40) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
    const c = document.querySelector("canvas"), x = c.getContext("2d");
    // Grund: das Creme des Signets, zur Mitte hin ein Hauch heller
    const g = x.createRadialGradient(n / 2, n * 0.45, 0, n / 2, n / 2, n * 0.72);
    g.addColorStop(0, "#fffcf6"); g.addColorStop(1, F.grund);
    x.fillStyle = g; x.fillRect(0, 0, n, n);
    const s = (n * anteil) / (y1 - y0), w = (x1 - x0) * s, h = (y1 - y0) * s;
    x.imageSmoothingQuality = "high";
    x.drawImage(q, x0, y0, x1 - x0, y1 - y0, (n - w) / 2, (n - h) / 2, w, h);
  }, { n, anteil });
  await page.locator("canvas").screenshot({ path: fileURLToPath(new URL(ziel, import.meta.url)), type: "png" });
  await page.close();
}

await symbol(512, 0.8, "../alpha/principesse/icons/icon-512.png");
await symbol(192, 0.8, "../alpha/principesse/icons/icon-192.png");
await symbol(512, 0.6, "../alpha/principesse/icons/icon-maskable-512.png");   // sichere Zone: Kreis mit 80 % Durchmesser
await symbol(180, 0.8, "../alpha/principesse/icons/apple-touch-icon.png");
await symbol(32, 0.92, "../alpha/principesse/icons/favicon-32.png");
await browser.close();
server.close();
console.log("geschrieben: alpha/principesse/icons/");
