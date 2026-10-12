// «Sketchory» – Bilder zum Zeigen und Teilen, gerechnet mit der Anwendung selbst (alpha/sketchory/, dieselbe Zeichenfunktion wie Vorschau und Video):
// die Beispielkarte (alpha/sketchory/beispiel.jpg, die Karte zu Marcel Duchamp), weiss auf Schwarz, Strichstärke 100 %.
//   assets/vorschau-sketchory.jpg            640 × 800   Bild der Beitragskarte auf «Web»: die Karte, gerade beim Zeichnen (mit der Stiftspitze)
//   alpha/sketchory/og-sketchory.jpg         1200 × 630  Vorschaukarte zum Teilen (Open Graph, X): links Titel und Satz mit orangem Punkt, rechts die fertige Karte
//
//   NODE_PATH=$(npm root -g) node tools/sketchory-og.mjs
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

// 1. Bilder aus der Anwendung: die Karte beim Zeichnen und fertig (1080 × 1440)
const app = await browser.newPage({ viewport: { width: 1280, height: 900 } });
await app.addInitScript(() => { try { localStorage.clear(); } catch { /* egal */ } });
await app.goto(`${base}alpha/sketchory/`);
await app.click("#beispiel");
await app.waitForFunction(() => window.__sketchory?.sz, null, { timeout: 60_000 });
const [beimZeichnen, fertig] = await app.evaluate(async () => {
  const marke = document.querySelector('script[src^="app.js"]').getAttribute("src").split("?")[1];
  const { bild, szene, standbild } = await import(`./szene.js?${marke}`);
  const S = window.__sketchory;
  const sz = szene(S.ergebnis, { ...S.optionen, farbe: "dunkel", staerke: 1, stil: "gezeichnet" });
  const c = document.createElement("canvas"); c.width = 1080; c.height = 1440;
  const ctx = c.getContext("2d");
  // beim Zeichnen: gut drei Viertel der Karte, die Stiftspitze sichtbar
  const t = sz.zeit.ab.zeichnen[0] + (sz.zeit.ab.zeichnen[1] - sz.zeit.ab.zeichnen[0]) * 0.8;
  for (let u = 0; u < t; u += 0.25) bild(ctx, sz, u);
  bild(ctx, sz, t);
  const a = c.toDataURL("image/png");
  standbild(ctx, szene(S.ergebnis, { ...S.optionen, farbe: "dunkel", staerke: 1, stil: "gezeichnet" }));
  return [a, c.toDataURL("image/png")];
});
await app.close();

async function bild(breite, hoehe, inhalt, ziel, qualitaet = 84) {
  const page = await browser.newPage({ viewport: { width: breite, height: hoehe }, deviceScaleFactor: 1 });
  await page.goto(`${base}vendor/fonts/fonts.css`);
  await page.setContent(`<!DOCTYPE html><html lang="de"><head><meta charset="utf-8"><base href="${base}">
    <style>
      @font-face { font-family: "Inter Display"; font-weight: 500; src: url(vendor/fonts/inter-display-500-latin.woff2) format("woff2"); }
      @font-face { font-family: "Instrument Sans"; font-weight: 400 500; src: url(vendor/fonts/instrument-sans-normal-latin.woff2) format("woff2"); }
      html, body { margin: 0; background: #000; overflow: hidden; }
      img { display: block; }
    </style></head><body>${inhalt}</body></html>`);
  await page.evaluate(async () => { await document.fonts.load('500 80px "Inter Display"'); await document.fonts.load('400 20px "Instrument Sans"'); await document.fonts.ready; });
  await page.waitForTimeout(300);
  const out = fileURLToPath(new URL(ziel, import.meta.url));
  await page.screenshot({ path: out, type: "jpeg", quality: qualitaet });
  console.log("geschrieben:", out);
  await page.close();
}

// 2. Beitragskarte 4 : 5 – die Karte beim Zeichnen; 3 : 4 auf 640 Breite (853 hoch), mittig auf 800 beschnitten (der Rand ist schwarz)
await bild(640, 800, `<img src="${beimZeichnen}" width="640" height="853" style="margin-top: -26px">`, "../assets/vorschau-sketchory.jpg", 80);

// 3. Vorschaukarte zum Teilen 1200 × 630 – links Titel und Satz wie im Video (Grotesk, höhere Buchstaben, oranger Punkt), rechts die fertige Karte
await bild(1200, 630, `
  <style>
    .karte { position: absolute; right: 56px; top: -24px; width: 510px; height: 680px; }
    .text { position: absolute; left: 72px; top: 0; bottom: 0; width: 560px; display: flex; flex-direction: column; justify-content: center; color: #fff; }
    .text h1 { margin: 0; font: 500 96px/1 "Inter Display", "Helvetica Neue", Arial, sans-serif; letter-spacing: -0.02em; transform: scaleY(1.15); transform-origin: left bottom; }
    .text p { margin: 34px 0 0; font: 500 34px/1.3 "Inter Display", "Helvetica Neue", Arial, sans-serif; letter-spacing: -0.01em; max-width: 13.5em; }
    .punkt { color: #f08a5d; }
    .fuss { margin-top: 46px; font: 400 20px/1.4 "Instrument Sans", system-ui, sans-serif; color: #9b968d; }
    .fuss b { display: block; font-weight: 500; color: #ece8e1; letter-spacing: 0.02em; }
  </style>
  <img class="karte" src="${fertig}" alt="">
  <div class="text">
    <h1>Sketchory<span class="punkt">.</span></h1>
    <p>Eine Kritzelkarte zeichnet sich von selbst<span class="punkt">.</span></p>
    <div class="fuss"><b>ornament.cloud/alpha/sketchory</b>Bild, Satz und Signet als Video</div>
  </div>`, "../alpha/sketchory/og-sketchory.jpg");

await browser.close();
server.close();
