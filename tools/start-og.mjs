// Erzeugt die Vorschaukarten (Open Graph / X-Karte, 1200 × 630) für das Teilen auf Social Media:
//   Startseite       ornament.cloud                      → assets/og-ornament-cloud.png
//   Masterprompts    ornament.cloud/masterprompts/       → assets/og-masterprompts.png
//   Das Dritte Rad   ornament.cloud/alpha/drittes-rad/   → alpha/drittes-rad/og-drittes-rad.jpg   (JPEG: der Farbverlauf der Seite wird als PNG über 500 KB gross, WhatsApp mag es kleiner)
// und die Bilder der beiden Karten auf der Seite «Web» (Hochformat 4 : 5, 640 × 800, dunkel in beiden Farbmodi):
//   OMNA COLOR       das Farbrad aus der Seite           → assets/vorschau-omna-color.jpg
//   Das Dritte Rad   das Rad aus der Seite               → assets/vorschau-drittes-rad.jpg
// Startseite: eine Wolke aus den 40 Zeichen von ORNA (direkt aus symbols.js gezeichnet), daneben Name und Satz der Startseite.
// Masterprompts: wie die Startseite links Titel, Welle und Satz der Seite; rechts die vier gezeichneten Vorschauen der Prüfraster,
// direkt aus masterprompts/index.html übernommen (zwei mal zwei, als Karten wie auf der Seite).
// Das Dritte Rad: das Rad selbst, aus der Seite übernommen, daneben der Titel auf dem nachtblauen Grund der Seite.
// Die Anordnung der Zeichen ist festgelegt (Zufallsfolge mit Startwert), das Bild wird bei jedem Lauf gleich.
//
//   NODE_PATH=$(npm root -g) node tools/start-og.mjs           (alle)
//   NODE_PATH=$(npm root -g) node tools/start-og.mjs start     (nur die Startseite; «masterprompts» nur die Karte der Seite Masterprompts, «rad» nur die Karte vom Dritten Rad, «vorschau» nur die beiden Bilder der Seite «Web»)
//
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { extname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
let playwright;
try { playwright = require("playwright"); } catch { playwright = require(join(process.env.NODE_PATH || "", "playwright")); }

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

const wahl = process.argv[2];
const browser = await playwright.chromium.launch();
const seite = () => browser.newPage({ viewport: { width: 1200, height: 630 }, deviceScaleFactor: 1, colorScheme: "light", reducedMotion: "reduce" });

// ---------- Startseite ----------
if (!wahl || wahl === "start") {
  const page = await seite();
  await page.goto(`${base}vendor/fonts/fonts.css`);                       // nur um einen Ursprung für die Module zu haben
  await page.setContent(`<!DOCTYPE html><html lang="de"><head><meta charset="utf-8"><base href="${base}"><link rel="stylesheet" href="vendor/fonts/fonts.css"></head><body></body></html>`);
  await page.evaluate(async () => {
    const { symbolMarkup, SYMBOL_COUNT } = await import("/portfolio/nebeneinander-nacheinander/js/symbols.js");
    const INK = "#1f1d1a", ORANGE = "#c2410c", VIOLETT = "#5b3fc4";
    // feste Zufallsfolgen (mulberry32), damit das Bild bei jedem Lauf gleich wird
    const folge = (start) => { let s = start; return () => { s = (s + 0x6D2B79F5) | 0; let t = Math.imul(s ^ (s >>> 15), 1 | s); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; };
    const zufall = folge(20261002);

    // die Wolke: Vereinigung von Kreisen mit einem Streifen bis zum glatten Boden (Koordinaten im Feld 520 × 320, oben bei y = 30)
    const KREISE = [[80, 286, 52], [150, 215, 70], [275, 160, 92], [395, 220, 72], [450, 286, 52]];     // die Kuppen
    const STREIFEN = [80, 226, 450, 338];                                                               // links, oben, rechts, unten
    const BODEN = 338, RAND = 25, ANZAHL = 40, ABSTAND = 56;
    const drin = (x, y, rand = 0) => y <= BODEN - rand && (KREISE.some(([cx, cy, r]) => Math.hypot(x - cx, y - cy) <= r - rand) || (x >= STREIFEN[0] + rand && x <= STREIFEN[2] - rand && y >= STREIFEN[1] + rand));
    // gleichmässig verteilen (Mitchells «bester Kandidat»): jeder neue Punkt liegt dort, wo er den grössten Abstand zu den bisherigen hat; danach stossen sich zu nahe Punkte noch ab
    const verteilen = (start) => {
      const z = folge(start), pts = [];
      while (pts.length < ANZAHL) {
        let beste = null, abstand = -1;
        for (let k = 0; k < 60; k++) {
          const x = z() * 520, y = 30 + z() * 320;
          if (!drin(x, y, RAND)) continue;
          const d = pts.reduce((m, [px, py]) => Math.min(m, Math.hypot(x - px, y - py)), 999);
          if (d > abstand) { abstand = d; beste = [x, y]; }
        }
        if (beste) pts.push(beste);
      }
      for (let it = 0; it < 120; it++) {
        for (let i = 0; i < pts.length; i++) {
          let fx = 0, fy = 0;
          for (let j = 0; j < pts.length; j++) {
            if (i === j) continue;
            const dx = pts[i][0] - pts[j][0], dy = pts[i][1] - pts[j][1], d = Math.hypot(dx, dy) || .01;
            if (d < ABSTAND) { const k = (ABSTAND - d) / d * .1; fx += dx * k; fy += dy * k; }
          }
          const nx = pts[i][0] + fx, ny = pts[i][1] + fy;
          if (drin(nx, ny, RAND)) { pts[i][0] = nx; pts[i][1] = ny; }
        }
      }
      const eng = Math.min(...pts.flatMap((p, i) => pts.slice(i + 1).map((q) => Math.hypot(p[0] - q[0], p[1] - q[1]))));
      return { pts, eng };
    };
    // von achtzig Würfen gilt der, in dem sich zwei Zeichen am wenigsten nahe kommen
    let wurf = null;
    for (let start = 1; start <= 80; start++) { const v = verteilen(start); if (!wurf || v.eng > wurf.eng) wurf = v; }
    const pts = wurf.pts;
    // Zeichen: alle 40 genau einmal, in gemischter Reihenfolge; einige in Orange und Violett wie die Navigation des Rads
    const reihe = Array.from({ length: ANZAHL }, (_, i) => i % SYMBOL_COUNT).sort(() => zufall() - .5);
    const farbe = (x, y) => { const t = (x - 120) / 300 - (y - 130) / 240; return t > .5 ? VIOLETT : t < -.46 ? ORANGE : INK; };   // oben rechts Violett, unten links Orange
    const zeichen = pts.map(([x, y], i) => `<g transform="translate(${x.toFixed(1)} ${y.toFixed(1)}) rotate(${(zufall() * 16 - 8).toFixed(1)})" style="color:${farbe(x, y)}">${symbolMarkup(reihe[i], 19)}</g>`).join("");

    // der Umriss: alle Formen mit dicker Linie, darüber dieselben Formen in der Farbe des Grundes; übrig bleibt nur die Aussenlinie der Wolke
    const formen = `${KREISE.map(([cx, cy, r]) => `<circle cx="${cx}" cy="${cy}" r="${r}"/>`).join("")}<rect x="${STREIFEN[0]}" y="${STREIFEN[1]}" width="${STREIFEN[2] - STREIFEN[0]}" height="${STREIFEN[3] - STREIFEN[1]}"/>`;
    const flaeche = `<g fill="#f8f8f6" stroke="#1f1d1a" stroke-opacity=".38" stroke-width="2.6">${formen}</g><g fill="#f8f8f6" stroke="none">${formen}</g>`;
    document.head.insertAdjacentHTML("beforeend", `<style>
      html, body { margin: 0; background: #f8f8f6; }
      .og { box-sizing: border-box; position: relative; width: 1200px; height: 630px; overflow: hidden; color: #1f1d1a; font-family: "Instrument Sans", system-ui, sans-serif; }
      .links { position: absolute; left: 88px; top: 0; bottom: 0; width: 520px; display: flex; flex-direction: column; justify-content: center; }
      .titel { margin: 0; font: 400 104px/0.98 Newsreader, Georgia, serif; letter-spacing: -.015em; }
      .welle { display: block; width: 440px; height: 26px; margin: 34px 0 30px; overflow: visible; }
      .welle path { fill: none; stroke: #1f1d1a; stroke-opacity: .55; stroke-width: 1.4; stroke-linecap: round; }
      .satz { margin: 0; width: 480px; font: 400 31px/1.34 Newsreader, Georgia, serif; color: #6b665e; }
      .adresse { position: absolute; left: 88px; bottom: 56px; margin: 0; font: 600 17px/1 "Instrument Sans", system-ui, sans-serif; letter-spacing: .22em; text-transform: uppercase; color: #c2410c; }
      .wolke { position: absolute; left: 626px; top: 142px; width: 520px; height: 320px; overflow: visible; }
      .sym-line { fill: none; stroke: currentColor; stroke-width: .09; stroke-linecap: round; stroke-linejoin: round; }
      .sym-dot { fill: currentColor; stroke: none; }
      .sym-ghost { opacity: .45; }
      .sym-over { stroke-width: .07; }
    </style>`);
    // die Welle der Startseite: eine feine, leicht unruhige Linie
    let w = "M0 14";
    for (let x = 6; x <= 440; x += 6) w += ` L${x} ${(13 + Math.sin(x / 34) * 4.2 + Math.sin(x / 11.3) * 1.6 + (zufall() - .5) * 1.1).toFixed(2)}`;
    document.body.innerHTML = `<div class="og">
      <div class="links">
        <h1 class="titel">Ornament<br>Cloud</h1>
        <svg class="welle" viewBox="0 0 440 26" aria-hidden="true"><path d="${w}"/></svg>
        <p class="satz">Beobachtung ist Anlass für Veränderungen in der Realität.</p>
      </div>
      <p class="adresse">ornament.cloud</p>
      <svg class="wolke" viewBox="0 30 520 320" aria-hidden="true">${flaeche}${zeichen}</svg>
    </div>`;
  });
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(300);
  const out = fileURLToPath(new URL("../assets/og-ornament-cloud.png", import.meta.url));
  await page.screenshot({ path: out });
  console.log("geschrieben:", out);
  await page.close();
}

// ---------- Masterprompts ----------
if (!wahl || wahl === "masterprompts") {
  const page = await seite();
  await page.goto(`${base}masterprompts/`);
  await page.evaluate(() => {
    const vorschauen = [...document.querySelectorAll("article.card .thumb svg")].map((svg) => svg.outerHTML);
    const satz = document.querySelector(".site-header .lead").textContent.trim();
    document.head.innerHTML = `<meta charset="utf-8"><link rel="stylesheet" href="/vendor/fonts/fonts.css"><style>
      html, body { margin: 0; background: #f8f8f6; }
      .og { --text: #1f1d1a; --surface: #ffffff; --serif: Newsreader, Georgia, serif;
        box-sizing: border-box; position: relative; width: 1200px; height: 630px; overflow: hidden; color: #1f1d1a; font-family: "Instrument Sans", system-ui, sans-serif; }
      .links { position: absolute; left: 88px; top: 0; bottom: 0; width: 520px; display: flex; flex-direction: column; justify-content: center; }
      .titel { margin: 0; font: 400 76px/0.98 Newsreader, Georgia, serif; letter-spacing: -.015em; }
      .welle { display: block; width: 440px; height: 26px; margin: 34px 0 30px; overflow: visible; }
      .welle path { fill: none; stroke: #1f1d1a; stroke-opacity: .55; stroke-width: 1.4; stroke-linecap: round; }
      .satz { margin: 0; width: 470px; font: 400 31px/1.34 Newsreader, Georgia, serif; color: #6b665e; }
      .adresse { position: absolute; left: 88px; bottom: 56px; margin: 0; font: 600 17px/1 "Instrument Sans", system-ui, sans-serif; letter-spacing: .22em; text-transform: uppercase; color: #c2410c; }
      .raster { position: absolute; left: 640px; top: 61px; display: grid; grid-template-columns: repeat(2, 242px); gap: 20px; }
      .kachel { box-sizing: border-box; width: 242px; height: 242px; display: grid; place-items: center; background: #ffffff; border: 1px solid #e4e0d8; border-radius: 14px; }
      .kachel svg { width: 86% !important; }
    </style>`;
    // dieselbe feine, leicht unruhige Welle wie auf der Startseitenkarte (feste Folge, damit das Bild bei jedem Lauf gleich wird)
    let s = 20261003, w = "M0 14";
    const z = () => { s = (s + 0x6D2B79F5) | 0; let t = Math.imul(s ^ (s >>> 15), 1 | s); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
    for (let x = 6; x <= 440; x += 6) w += ` L${x} ${(13 + Math.sin(x / 34) * 4.2 + Math.sin(x / 11.3) * 1.6 + (z() - .5) * 1.1).toFixed(2)}`;
    document.body.className = "";
    document.body.innerHTML = `<div class="og">
      <div class="links">
        <h1 class="titel">Masterprompts</h1>
        <svg class="welle" viewBox="0 0 440 26" aria-hidden="true"><path d="${w}"/></svg>
        <p class="satz">${satz}</p>
      </div>
      <p class="adresse">ornament.cloud/masterprompts</p>
      <div class="raster">${vorschauen.map((v) => `<div class="kachel">${v}</div>`).join("")}</div>
    </div>`;
  });
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(300);
  const out = fileURLToPath(new URL("../assets/og-masterprompts.png", import.meta.url));
  await page.screenshot({ path: out });
  console.log("geschrieben:", out);
  await page.close();
}

// ---------- Das Dritte Rad ----------
if (!wahl || wahl === "rad") {
  const page = await seite();
  await page.goto(`${base}alpha/drittes-rad/`);
  await page.waitForFunction(() => window.radGeladen === true);
  await page.waitForTimeout(400);
  await page.evaluate(() => {
    const rad = document.getElementById("svg").cloneNode(true);
    rad.removeAttribute("id");
    document.head.insertAdjacentHTML("beforeend", `<style>
      html, body { margin: 0 !important; padding: 0 !important; width: 1200px; height: 630px; overflow: hidden; }
      .og { position: relative; width: 1200px; height: 630px; overflow: hidden; }
      .og .rad { position: absolute; left: 48px; top: 20px; width: 590px; height: 590px; }
      .og .rad svg { width: 100%; height: 100%; display: block; overflow: visible; }
      .og .rechts { position: absolute; left: 690px; top: 70px; width: 440px; }
      .og .ober { margin: 0 0 26px; font: 600 17px/1 "Instrument Sans", system-ui, sans-serif; letter-spacing: .22em; text-transform: uppercase; color: #f08a5d; }
      .og h1 { margin: 0; font: 500 88px/1.02 "Instrument Sans", system-ui, sans-serif; letter-spacing: -.015em; color: #f0d78f; text-shadow: 0 0 34px #c9a45c55; }
      .og .satz { margin: 28px 0 0; font: 400 27px/1.42 "Instrument Sans", system-ui, sans-serif; color: #ece3c8; }
      .og .fuss { margin: 34px 0 0; padding-top: 22px; border-top: 1px solid #4a3f26; }
      .og .quellen { margin: 0; font: 500 17px/1.3 "Instrument Sans", system-ui, sans-serif; letter-spacing: .12em; text-transform: uppercase; color: #a89f86; }
      .og .quellen span { color: #a794ff; padding: 0 .35em; }
      .og .adresse { margin: 14px 0 0; font: 400 19px/1.2 "Instrument Sans", system-ui, sans-serif; letter-spacing: .04em; color: #ece3c8; opacity: .8; }
    </style>`);
    document.body.className = "";
    document.body.innerHTML = "";
    const box = document.createElement("div");
    box.className = "og";
    const holder = document.createElement("div");
    holder.className = "rad";
    holder.append(rad);
    box.append(holder);
    box.insertAdjacentHTML("beforeend", `<div class="rechts">
        <p class="ober">Ornament Cloud</p>
        <h1>Das Dritte<br>Rad</h1>
        <p class="satz">Drei Ringe auf einer Achse: Zeit, Form und Farbe.</p>
        <div class="fuss">
          <p class="quellen">Zettelkasten<span>·</span>ORNA<span>·</span>OMNA COLOR</p>
          <p class="adresse">ornament.cloud/alpha/drittes-rad</p>
        </div>
      </div>`);
    document.body.append(box);
  });
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(300);
  const out = fileURLToPath(new URL("../alpha/drittes-rad/og-drittes-rad.jpg", import.meta.url));
  await page.screenshot({ path: out, type: "jpeg", quality: 92 });
  console.log("geschrieben:", out);
  await page.close();
}

// ---------- Bilder der Seite «Web» ----------
if (!wahl || wahl === "vorschau") {
  const hochformat = { viewport: { width: 640, height: 800 }, deviceScaleFactor: 1, reducedMotion: "reduce" };
  // OMNA COLOR: das Farbrad im dunklen Modus der Seite, sonst nichts
  {
    const page = await browser.newPage({ ...hochformat, colorScheme: "dark" });
    await page.goto(`${base}alpha/omna-color/`);
    await page.waitForFunction(() => document.querySelectorAll("#outer path.seg").length > 0);
    await page.addStyleTag({ content: `
      html, body { margin: 0 !important; padding: 0 !important; }
      body { display: grid !important; place-items: center; width: 640px; height: 800px; overflow: hidden; }
      .seitenweg, .controls, #card { display: none !important; }
      main { margin: 0 !important; display: block !important; }
      .stage { display: block !important; }
      .wheel { width: 540px !important; margin: 0 auto; cursor: default; }` });
    await page.waitForTimeout(300);
    const out = fileURLToPath(new URL("../assets/vorschau-omna-color.jpg", import.meta.url));
    await page.screenshot({ path: out, type: "jpeg", quality: 88 });
    console.log("geschrieben:", out);
    await page.close();
  }
  // Das Dritte Rad: das Rad auf dem nachtblauen Grund der Seite
  {
    const page = await browser.newPage({ ...hochformat, colorScheme: "dark" });
    await page.goto(`${base}alpha/drittes-rad/`);
    await page.waitForFunction(() => window.radGeladen === true);
    await page.waitForTimeout(400);
    await page.evaluate(() => {
      const rad = document.getElementById("svg").cloneNode(true);
      rad.removeAttribute("id");
      document.head.insertAdjacentHTML("beforeend", `<style>
        html, body { margin: 0 !important; padding: 0 !important; width: 640px; height: 800px; overflow: hidden; }
        .vorschau { position: relative; width: 640px; height: 800px; overflow: hidden; }
        .vorschau .rad { position: absolute; left: 20px; top: 100px; width: 600px; height: 600px; }
        .vorschau .rad svg { width: 100%; height: 100%; display: block; overflow: visible; }
      </style>`);
      document.body.className = "";
      document.body.innerHTML = "";
      const box = document.createElement("div");
      box.className = "vorschau";
      const holder = document.createElement("div");
      holder.className = "rad";
      holder.append(rad);
      box.append(holder);
      document.body.append(box);
    });
    await page.waitForTimeout(300);
    const out = fileURLToPath(new URL("../assets/vorschau-drittes-rad.jpg", import.meta.url));
    await page.screenshot({ path: out, type: "jpeg", quality: 88 });
    console.log("geschrieben:", out);
    await page.close();
  }
}

await browser.close();
server.close();
