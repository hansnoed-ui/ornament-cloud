// «Animationen» – die Vorschaukarten zum Teilen (Open Graph, X-Karte; 1200 × 630), gerechnet mit dem Motor der Seite selbst.
// Erste Fassung 4. November 2026 (Wunsch: «eine tolle vorschaukachel für social media»): sechs Effekte ohne Bild auf gezeichneten Lichtflecken.
// Neu geschnitten am 8. November 2026 (Wunsch: «Die könnte noch besser aussehen», «Die 6 bilder sind ok aber nimm interessantere»):
// sechs Effekte auf Christians Werken, grösser und farbiger; links nur noch Marke, Wort und «Mischpult», kein Satz mehr (er wurde abgeschnitten,
// die Zahl der Effekte veraltete). Das untere linke Viertel bleibt leer: dort legt X den Titel der Seite über das Bild.
// Je Sprache eine Karte, neue Dateinamen, damit X und Mastodon die alte Karte nicht aus dem Zwischenspeicher zeigen:
//   animations/og-mix-de.jpg, og-mix-en.jpg, og-mix-es.jpg   je 1200 × 630, JPEG unter 300 KB (WhatsApp)
// Die alten Namen og-de/en/es.jpg bleiben als Kopie der neuen Karte liegen: X und andere halten die Seite mit der alten Bildadresse
// im Zwischenspeicher und zeigten sonst gar keine Karte (20. November 2026).
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

// Eine Grafik statt sechs Kacheln (20. November 2026, Wunsch: «nicht 6 bilder, die anwendung auf den punkt, eine grafik»):
// ein Werk, links davon das Original, rechts vom Schieber dieselbe Stelle mit drei gemischten Ebenen wie im Handy-Mischpult.
const WERK = "frida.jpg", T = 4.6;
const EBENEN = [["montage", "normal", 1], ["raster", "multiplizieren", .8], ["lichtformen", "bildschirm", .8]];
const [KB, KH] = [1614, 1260];   // doppelt so gross wie gesetzt (807 × 630), dann scharf verkleinert

// 1. Original und Mischung aus dem Motor
const seite = await browser.newPage({ viewport: { width: 1280, height: 900 } });
await seite.goto(`${base}animations/`);
await seite.waitForFunction(() => document.documentElement.classList.contains("bereit"), null, { timeout: 120000 });
const [original, mischung] = await seite.evaluate(async ([WERK, T, EBENEN, pfad, KB, KH]) => {
  const { motor } = window.animationen;
  await motor.bildLaden(WERK, `${pfad}/${WERK}`);
  const aus = [];
  for (const ebenen of [[["bild", "normal", 1]], EBENEN]) {
    motor.zeichnen({ bild: WERK, grund: "schwarz", ebenen: ebenen.map(([effekt, modus, deckkraft]) => ({ effekt, werte: [], modus, deckkraft, quelle: "bild", seed: 3 })) }, T, KB, KH);
    const k = document.createElement("canvas"); k.width = KB; k.height = KH; k.getContext("2d").drawImage(motor.leinwand, 0, 0);
    aus.push(k.toDataURL("image/jpeg", .92));
  }
  return aus;
}, [WERK, T, EBENEN, `${base}${ordner}`, KB, KH]);
await seite.close();

// 2. die Karten: links Marke, Wort, «Mischpult» und «1 Bild · 3 Ebenen», rechts das Werk mit Schieber und den Reitern 01–03
const SPRACHEN = {
  de: ["Animationen", "Mischpult", "1 Bild · 3 Ebenen", "Bild", ["Montage", "Druckraster", "Lichtformen"]],
  en: ["Animations", "Mixer", "1 image · 3 layers", "Image", ["Montage", "Halftone", "Light forms"]],
  es: ["Animaciones", "Mezclador", "1 imagen · 3 capas", "Imagen", ["Montaje", "Trama", "Formas de luz"]],
};
const SCHIEBER = 300;   // px vom linken Rand des Werks: links Original, rechts Mischung
const karte = await browser.newPage({ viewport: { width: 1200, height: 630 }, deviceScaleFactor: 1 });
for (const [sprache, [wort, pult, formel, bildWort, namen]] of Object.entries(SPRACHEN)) {
  const html = `<!DOCTYPE html><html lang="${sprache}"><head><meta charset="utf-8"><link rel="stylesheet" href="${base}vendor/fonts/animationen.css"><style>
html, body { margin: 0; width: 1200px; height: 630px; overflow: hidden; background: #08090c; color: #e9ecf2; font-family: "Hanken Grotesk", "Helvetica Neue", Helvetica, system-ui, sans-serif; }
.karte { width: 1200px; height: 630px; display: grid; grid-template-columns: 393px 807px; }
.links { position: relative; padding: 52px 0 0 56px; border-right: 1px solid rgba(233,236,242,.14); }
.etikett, .formel, .reiter, .marke { font-family: "Geist Mono", monospace; font-weight: 500; }
.etikett { font-size: 15px; letter-spacing: .12em; text-transform: uppercase; color: rgba(233,236,242,.62); }
.etikett b { color: #c9ff3d; font-weight: 500; }
h1 { margin: 92px 0 0; font-size: 60px; font-weight: 600; line-height: .95; letter-spacing: -.045em; white-space: nowrap; }
h1 b { color: #c9ff3d; font-weight: 600; }
h1 i { display: block; font-style: normal; font-weight: 300; font-size: 46px; letter-spacing: -.02em; margin-top: 12px; color: #c9ff3d; }
.linie { margin-top: 34px; width: 120px; height: 2px; background: #c9ff3d; }
.formel { margin-top: 22px; font-size: 17px; letter-spacing: .06em; color: rgba(233,236,242,.78); }
.rechts { position: relative; overflow: hidden; }
.rechts img { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; display: block; }
.rechts .mix { clip-path: inset(0 0 0 ${SCHIEBER}px); }
.schieber { position: absolute; top: 0; bottom: 0; left: ${SCHIEBER - 1}px; width: 2px; background: #c9ff3d; box-shadow: 0 0 18px rgba(201,255,61,.55); }
.knopf { position: absolute; top: 50%; left: 50%; width: 44px; height: 44px; margin: -22px 0 0 -22px; border-radius: 50%; background: #c9ff3d; color: #08090c;
  display: grid; place-items: center; font-size: 18px; font-weight: 700; letter-spacing: 4px; padding-left: 3px; box-sizing: border-box; box-shadow: 0 2px 14px rgba(0,0,0,.5); }
.reiter { position: absolute; top: 0; left: ${SCHIEBER}px; right: 0; display: flex; background: rgba(8,9,12,.82); backdrop-filter: blur(6px); border-bottom: 1px solid rgba(233,236,242,.14); }
.reiter div { flex: 1; padding: 13px 0 12px 18px; font-size: 12px; letter-spacing: .08em; color: rgba(233,236,242,.55); }
.reiter div span { display: block; margin-top: 4px; font-size: 15px; letter-spacing: .02em; color: #e9ecf2; white-space: nowrap; }
.reiter div:first-child { box-shadow: inset 0 -2px 0 #c9ff3d; }
.reiter i { display: inline-block; width: 7px; height: 7px; border-radius: 50%; background: #c9ff3d; margin-left: 7px; vertical-align: 1px; }
.marke { position: absolute; top: 18px; left: 18px; padding: 7px 11px; font-size: 12px; letter-spacing: .1em; text-transform: uppercase; color: #e9ecf2; background: rgba(8,9,12,.7); border: 1px solid rgba(233,236,242,.2); }
</style></head><body><div class="karte">
<div class="links"><div class="etikett">ornament<b>.</b>cloud</div>
<h1>${wort}<b>.</b><i>${pult}</i></h1><div class="linie"></div><div class="formel">${formel}</div></div>
<div class="rechts"><img src="${original}" alt=""><img class="mix" src="${mischung}" alt="">
<div class="marke">${bildWort}</div>
<div class="reiter">${namen.map((n, i) => `<div>0${i + 1}<i></i><span>${n}</span></div>`).join("")}</div>
<div class="schieber"><div class="knopf">‹›</div></div></div>
</div></body></html>`;
  await karte.setContent(html, { waitUntil: "load" });
  await karte.evaluate(async () => {   // das Wort schrumpft, bis es mit Punkt 40 px vor den Kacheln endet
    await document.fonts.ready;
    const h1 = document.querySelector("h1"), b = h1.querySelector("b"), rand = document.querySelector(".rechts").getBoundingClientRect().left - 40;
    for (let px = 60; px > 40 && b.getBoundingClientRect().right > rand; px -= 1) h1.style.fontSize = `${px}px`;
  });
  const name = `og-mix-${sprache}.jpg`;
  let quality = 88, bild;
  do { bild = await karte.screenshot({ type: "jpeg", quality }); quality -= 4; } while (bild.length > 290_000 && quality > 40);
  for (const n of [name, `og-${sprache}.jpg`]) writeFileSync(fileURLToPath(new URL(`../animations/${n}`, import.meta.url)), bild);
  console.log(`animations/${name} · ${bild.length} Bytes · Qualität ${quality + 4}`);
}
await browser.close();
server.close();
