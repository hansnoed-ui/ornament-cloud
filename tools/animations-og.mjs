// «Animationen» – die Vorschaukarten zum Teilen (Open Graph, X-Karte; 1200 × 630), gerechnet mit dem Motor der Seite selbst.
// Erste Fassung 4. November 2026 (Wunsch: «eine tolle vorschaukachel für social media»): sechs Effekte ohne Bild auf gezeichneten Lichtflecken.
// Neu geschnitten am 8. November 2026 (Wunsch: «Die könnte noch besser aussehen», «Die 6 bilder sind ok aber nimm interessantere»):
// sechs Effekte auf Christians Werken, grösser und farbiger; links nur noch Marke, Wort und «Mischpult», kein Satz mehr (er wurde abgeschnitten,
// die Zahl der Effekte veraltete). Das untere linke Viertel bleibt leer: dort legt X den Titel der Seite über das Bild.
// Je Sprache eine Karte, neue Dateinamen, damit X und Mastodon die alte Karte nicht aus dem Zwischenspeicher zeigen:
//   animations/og-de.jpg, og-en.jpg, og-es.jpg   je 1200 × 630, JPEG unter 300 KB (WhatsApp)
//
// Die Werke liegen im Projekt «Animations» unter kunst-clip/bilder/ (wie für tools/gamma/kunst_clip.mjs); der Ordner muss unter dem
// Wurzelordner liegen, damit der Server sie liefert (danach wieder löschen, sie gehören nicht ins Repo):
//   NODE_PATH=$(npm root -g) node tools/animations-og.mjs <ordner-mit-bildern>
import { createRequire } from "node:module";
import { join, relative, resolve } from "node:path";
import { writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
let playwright;
try { playwright = require("playwright"); } catch { playwright = require(join(process.env.NODE_PATH || "", "playwright")); }
const WURZEL = fileURLToPath(new URL("../", import.meta.url));
if (!process.argv[2]) { console.error("Aufruf: node tools/animations-og.mjs <ordner-mit-bildern>"); process.exit(1); }
const ordner = relative(WURZEL, resolve(process.argv[2])).split("\\").join("/");
const { startServer } = await import(new URL("./serve-orma.mjs", import.meta.url).href);
const server = await startServer(0);
const base = `http://localhost:${server.address().port}/`;
const browser = await playwright.chromium.launch({ args: ["--use-angle=swiftshader", "--enable-unsafe-swiftshader"] });

// Werk, Effekt, Zeitpunkt in der Schlaufe: bunt und schwarzweiss im Wechsel, jedes Werk nur einmal
const KACHELN = [["harbouring.webp", "fluid", 4.6], ["frida.jpg", "raster", 4.6], ["gemaelde.jpg", "sortieren", 4.6],
  ["mosaik.jpg", "zebra", 4.6], ["karte.jpg", "strom", 4.6], ["portrait.jpg", "relief", 4.6]];
const [KB, KH] = [538, 630];   // doppelt so gross wie gesetzt (269 × 315), dann scharf verkleinert

// 1. die Kacheln aus dem Motor
const seite = await browser.newPage({ viewport: { width: 1280, height: 900 } });
await seite.goto(`${base}animations/`);
await seite.waitForFunction(() => document.documentElement.classList.contains("bereit"), null, { timeout: 120000 });
const kacheln = await seite.evaluate(async ([KACHELN, pfad, KB, KH]) => {
  const { motor } = window.animationen;
  const aus = [];
  for (const [bild, effekt, t] of KACHELN) {
    await motor.bildLaden(bild, `${pfad}/${bild}`);
    motor.zeichnen({ bild, grund: "schwarz", ebenen: [{ effekt, werte: [], modus: "normal", deckkraft: 1, quelle: "bild", seed: 3 }] }, t, KB, KH);
    const k = document.createElement("canvas"); k.width = KB; k.height = KH; k.getContext("2d").drawImage(motor.leinwand, 0, 0);
    aus.push(k.toDataURL("image/jpeg", .92));
  }
  return aus;
}, [KACHELN, `${base}${ordner}`, KB, KH]);
await seite.close();

// 2. die Karten: links Marke, Wort und «Mischpult», rechts die sechs Kacheln (Hanken Grotesk, Haarlinien, Säuregrün)
const SPRACHEN = { de: ["Animationen", "Mischpult"], en: ["Animations", "Mixer"], es: ["Animaciones", "Mezclador"] };
const karte = await browser.newPage({ viewport: { width: 1200, height: 630 }, deviceScaleFactor: 1 });
for (const [sprache, [wort, pult]] of Object.entries(SPRACHEN)) {
  const html = `<!DOCTYPE html><html lang="${sprache}"><head><meta charset="utf-8"><link rel="stylesheet" href="${base}vendor/fonts/animationen.css"><style>
html, body { margin: 0; width: 1200px; height: 630px; overflow: hidden; background: #08090c; color: #e9ecf2; font-family: "Hanken Grotesk", "Helvetica Neue", Helvetica, system-ui, sans-serif; }
.karte { width: 1200px; height: 630px; display: grid; grid-template-columns: 393px 807px; }
.links { position: relative; padding: 52px 0 0 56px; border-right: 1px solid rgba(233,236,242,.14); }
.etikett { font-family: "Geist Mono", monospace; font-size: 15px; letter-spacing: .12em; text-transform: uppercase; color: rgba(233,236,242,.62); font-weight: 500; }
.etikett b { color: #c9ff3d; font-weight: 500; }
h1 { margin: 92px 0 0; font-size: 60px; font-weight: 600; line-height: .95; letter-spacing: -.045em; white-space: nowrap; }
h1 b { color: #c9ff3d; font-weight: 600; }
h1 i { display: block; font-style: normal; font-weight: 300; font-size: 46px; letter-spacing: -.02em; margin-top: 12px; color: #c9ff3d; }
.linie { margin-top: 34px; width: 120px; height: 2px; background: #c9ff3d; }
.rechts { display: grid; grid-template-columns: repeat(3, 1fr); grid-template-rows: repeat(2, 1fr); gap: 1px; background: #08090c; }
.rechts img { display: block; width: 100%; height: 100%; object-fit: cover; }
</style></head><body><div class="karte">
<div class="links"><div class="etikett">ornament<b>.</b>cloud</div>
<h1>${wort}<b>.</b><i>${pult}</i></h1><div class="linie"></div></div>
<div class="rechts">${kacheln.map((k) => `<img src="${k}" alt="">`).join("")}</div>
</div></body></html>`;
  await karte.setContent(html, { waitUntil: "load" });
  await karte.evaluate(async () => {   // das Wort schrumpft, bis es mit Punkt 40 px vor den Kacheln endet
    await document.fonts.ready;
    const h1 = document.querySelector("h1"), b = h1.querySelector("b"), rand = document.querySelector(".rechts").getBoundingClientRect().left - 40;
    for (let px = 60; px > 40 && b.getBoundingClientRect().right > rand; px -= 1) h1.style.fontSize = `${px}px`;
  });
  const name = `og-${sprache}.jpg`;
  let quality = 88, bild;
  do { bild = await karte.screenshot({ type: "jpeg", quality }); quality -= 4; } while (bild.length > 290_000 && quality > 40);
  writeFileSync(fileURLToPath(new URL(`../animations/${name}`, import.meta.url)), bild);
  console.log(`animations/${name} · ${bild.length} Bytes · Qualität ${quality + 4}`);
}
await browser.close();
server.close();
