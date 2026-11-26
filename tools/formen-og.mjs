// ORNAMENT FORMEN und Epsilon: Vorschaukarten zum Teilen (Open Graph und X, 1200 × 630), 26. November 2026.
// Frage: «Haben wir schon vorschaukarten für die "Formen"», Christian: «ja, so machen, Epsilon auch».
// Gestaltung wie die Karten des Neubaus (tools/b-kacheln.mjs): weisser Grund, Haarlinie, Kicker, Titel, Satz, Signet mit Adresse.
// Rechts steht die echte Form: das Skript öffnet die Seiten im unsichtbaren Browser, nimmt die Bühnen auf und setzt sie ein.
// Für Epsilon rechts die Namen der Projekte.
//
//   NODE_PATH=$(npm root -g) node tools/formen-og.mjs              alle vier
//   NODE_PATH=$(npm root -g) node tools/formen-og.mjs eigenzeit    nur Karten, deren Name so beginnt (katalog, koerper, eigenzeit, epsilon)
//
// → alpha/formen/og-katalog.png, alpha/formen/koerper/og-koerper.png, alpha/formen/eigenzeit/og-eigenzeit.png, epsilon/og-epsilon.png
// Gerechnet wird mit SwiftShader (WebGL auf dem Prozessor), damit es auch ohne Grafikkarte läuft; die Eigenzeit braucht dafür rund 40 s.
import { createServer } from "node:http";
import { readFileSync } from "node:fs";
import { extname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
let playwright;
try { playwright = require("playwright"); } catch { playwright = require(join(process.env.NODE_PATH || "", "playwright")); }

const ROOT = new URL("../", import.meta.url);
const root = fileURLToPath(ROOT);
const NUR = process.argv[2] || "";
const esc = (s) => String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

const types = { ".html": "text/html", ".css": "text/css", ".js": "text/javascript", ".woff2": "font/woff2", ".svg": "image/svg+xml", ".png": "image/png" };
const server = createServer((req, res) => {
  try { let p = decodeURIComponent(new URL(req.url, "http://x").pathname); if (p.endsWith("/")) p += "index.html"; res.writeHead(200, { "content-type": types[extname(p)] || "application/octet-stream" }).end(readFileSync(join(root, p))); }
  catch { res.writeHead(404).end(); }
}).listen(0);
const base = `http://localhost:${server.address().port}/`;

// Signet wie in tools/b-kacheln.mjs
const limacon = (() => { const LA = 1, LB = 0.45, LK = 1.2, N = 120; const p = Array.from({ length: N + 1 }, (_, i) => { const t = (i / N) * Math.PI * 2, r = LB + LA * Math.cos(t); return [LK * r * Math.cos(t), LK * r * Math.sin(t)]; }); const xs = p.map((q) => q[0]), ys = p.map((q) => q[1]); const mx = (Math.min(...xs) + Math.max(...xs)) / 2, my = (Math.min(...ys) + Math.max(...ys)) / 2, sp = Math.max(Math.max(...xs) - Math.min(...xs), Math.max(...ys) - Math.min(...ys)); return { d: p.map(([x, y], i) => `${i ? "L" : "M"}${(17 + ((x - mx) / sp) * 22).toFixed(2)} ${(12 + ((y - my) / sp) * 22).toFixed(2)}`).join("") + "Z", punkt: [(17 + ((p[50][0] - mx) / sp) * 22).toFixed(2), (12 + ((p[50][1] - my) / sp) * 22).toFixed(2)] }; })();
const signet = `<svg viewBox="0 0 34 24" width="48" height="34"><path d="${limacon.d}" fill="none" stroke="currentColor" stroke-width="1.4"/><circle cx="${limacon.punkt[0]}" cy="${limacon.punkt[1]}" r="2.2" fill="#1d3fd6"/></svg>`;

const NACHT = "#151412";
const BILD = 440;

function karte({ kicker, titel, satz, fuss, rechts, titelGroesse }) {
  return `<!DOCTYPE html><html lang="de"><head><meta charset="utf-8"><link rel="stylesheet" href="/vendor/fonts/fonts.css"><style>
  html, body { margin: 0; } body { width: 1200px; height: 630px; background: #fff; color: #000; font-family: "Instrument Sans", system-ui, sans-serif; position: relative; overflow: hidden; }
  .links { position: absolute; left: 72px; top: 64px; right: ${72 + BILD + 48}px; bottom: 64px; display: flex; flex-direction: column; }
  .kicker { font-size: 24px; color: #6f6f6f; margin-bottom: 18px; }
  .titel { font-size: ${titelGroesse || 72}px; font-weight: 500; letter-spacing: -0.025em; line-height: 1; }
  .satz { margin-top: 26px; font-size: 32px; line-height: 1.25; color: #333; }
  .fuss { margin-top: auto; display: flex; align-items: center; gap: 14px; font-size: 26px; font-weight: 500; }
  .linie { position: absolute; left: 72px; right: 72px; top: 40px; height: 1px; background: #dadada; }
  .rechts { position: absolute; right: 72px; top: ${(630 - BILD) / 2 + 12}px; width: ${BILD}px; height: ${BILD}px; }
  .rechts img { display: block; width: 100%; height: 100%; object-fit: cover; background: ${NACHT}; }
  .raster { display: grid; grid-template-columns: 1fr 1fr; gap: 6px; width: 100%; height: 100%; }
  .raster img { width: 100%; height: 100%; }
  .namen { display: flex; flex-direction: column; justify-content: center; height: 100%; }
  .namen div { font-size: 44px; font-weight: 500; letter-spacing: -0.03em; padding: 14px 0; border-top: 1px solid #dadada; display: flex; justify-content: space-between; align-items: baseline; }
  .namen div:last-child { border-bottom: 1px solid #dadada; }
  .namen span { color: #1d3fd6; font-size: 30px; }
</style></head><body>
  <div class="linie"></div>
  <div class="links">
    <div class="kicker">${esc(kicker)}</div>
    <div class="titel">${esc(titel)}</div>
    ${satz ? `<div class="satz">${esc(satz)}</div>` : ""}
    <div class="fuss"><span style="color:#000">${signet}</span><span>${esc(fuss)}</span></div>
  </div>
  <div class="rechts">${rechts}</div>
</body></html>`;
}

const bild = (buf) => `data:image/png;base64,${buf.toString("base64")}`;
const warte = (ms) => new Promise((r) => setTimeout(r, ms));

const browser = await playwright.chromium.launch({ args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"] });
const formSeite = async (pfad, breite = 1100, hoehe = 1000) => {
  const page = await browser.newPage({ viewport: { width: breite, height: hoehe }, deviceScaleFactor: 2, colorScheme: "light", reducedMotion: "no-preference" });
  page.on("pageerror", (e) => console.error(`${pfad}: ${e.message}`));
  await page.goto(base + pfad);
  await page.addStyleTag({ content: ".hinweis { display: none !important; }" });
  return page;
};
// quadratischer Ausschnitt aus der Mitte der Bühne
const buehnenBild = async (page, anteil = 0.94) => {
  const b = await page.locator("#buehne").boundingBox();
  const s = Math.min(b.width, b.height) * anteil;
  return page.screenshot({ clip: { x: b.x + (b.width - s) / 2, y: b.y + (b.height - s) / 2, width: s, height: s } });
};

const KARTEN = [
  { name: "katalog", out: "alpha/formen/og-katalog.png", alt: "Formenkatalog: links Titel und Satz, rechts vier Formen aus dem Katalog",
    async rechts() {
      const page = await formSeite("alpha/formen/", 1280, 1100);
      const bilder = [];
      for (const name of ["Rosette", "Körper", "Verflechtung", "Volumen"]) {
        const ansicht = page.locator("article.karte", { has: page.locator("h3", { hasText: new RegExp(`^${name}$`) }) }).locator(".ansicht");
        await ansicht.scrollIntoViewIfNeeded();
        await page.evaluate(() => window.scrollBy(0, -80));
        await warte(3500);
        bilder.push(await ansicht.screenshot());
      }
      await page.close();
      return `<div class="raster">${bilder.map((b) => `<img src="${bild(b)}" alt="">`).join("")}</div>`;
    },
    text: { kicker: "ornament.cloud · Formen", titel: "Formenkatalog", satz: "16 Formfamilien für generative Ornamente in 3D, jede über Startwerte wiederholbar.", fuss: "ornament.cloud/alpha/formen" } },
  { name: "koerper", out: "alpha/formen/koerper/og-koerper.png", alt: "Ornamentkörper: links Titel und Satz, rechts die Messing-Rosette mit Startwert 2471",
    async rechts() {
      const page = await formSeite("alpha/formen/koerper/");
      await warte(4000);
      const b = await buehnenBild(page, 0.9);
      await page.close();
      return `<img src="${bild(b)}" alt="">`;
    },
    text: { kicker: "ornament.cloud · Formen", titel: "Ornamentkörper", satz: "Ringe aus einer Regel um einen gedrechselten Kern, jeder mit eigenem Tempo.", fuss: "ornament.cloud/alpha/formen/koerper", titelGroesse: 64 } },
  { name: "eigenzeit", out: "alpha/formen/eigenzeit/og-eigenzeit.png", alt: "Eigenzeit: links Titel und Satz, rechts Ringe mit ihrer Spur, verschieden hoch gewachsen",
    async rechts() {
      const page = await formSeite("alpha/formen/eigenzeit/");
      await page.evaluate(() => { const el = document.getElementById("tempo"); el.value = 300; el.dispatchEvent(new Event("input")); });
      const b0 = await page.locator("#buehne").boundingBox();
      await page.mouse.move(b0.x + b0.width / 2, b0.y + b0.height / 2);
      await page.mouse.wheel(0, 220);   // etwas weiter weg, damit die Türme ganz im Bild stehen
      await warte(40000);
      const b = await buehnenBild(page, 0.94);
      await page.close();
      return `<img src="${bild(b)}" alt="">`;
    },
    text: { kicker: "ornament.cloud · Formen", titel: "Eigenzeit", satz: "Ringe ohne gemeinsame Uhr bauen eine Spur, die sich als Körper drucken lässt.", fuss: "ornament.cloud/alpha/formen/eigenzeit" } },
  { name: "epsilon", out: "epsilon/og-epsilon.png", alt: "Epsilon: links Titel, rechts die vier Projekte Formen, Theorie, Meine Stimme, Hochrendern",
    async rechts() {
      return `<div class="namen">${["Formen", "Theorie", "Meine Stimme", "Hochrendern"].map((n) => `<div>${esc(n)}<span>→</span></div>`).join("")}</div>`;
    },
    text: { kicker: "ornament.cloud · Epsilon", titel: "Aktuelle Projekte", satz: "Woran gerade gearbeitet wird.", fuss: "ornament.cloud/epsilon" } },
];

const kartenSeite = await browser.newPage({ viewport: { width: 1200, height: 630 }, deviceScaleFactor: 1 });
await kartenSeite.goto(base + "vendor/fonts/fonts.css");
for (const k of KARTEN.filter((k) => k.name.startsWith(NUR))) {
  const rechts = await k.rechts();
  await kartenSeite.setContent(karte({ ...k.text, rechts }));
  await kartenSeite.evaluate(() => document.fonts.ready);
  await kartenSeite.waitForTimeout(200);
  await kartenSeite.screenshot({ path: join(root, k.out) });
  console.log(`Vorschaukarte → ${k.out}`);
}
await browser.close();
server.close();
