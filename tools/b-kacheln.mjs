// Neubau /b/: Vorschaukarten zum Teilen (Open Graph und X, 1200 × 630) für jede Seite unter b/ und je Zettel eine quadratische
// Karte (1080 × 1080) zum Herunterladen. Gezeichnet als HTML mit den Schriften der Seite, aufgenommen mit Playwright.
// Liest b/kacheln/liste.json (geschrieben von tools/build-b.mjs) und schreibt nach b/kacheln/.
//
//   NODE_PATH=$(npm root -g) node tools/b-kacheln.mjs            alle
//   NODE_PATH=$(npm root -g) node tools/b-kacheln.mjs zettel     nur Pfade, die so beginnen
import { createServer } from "node:http";
import { readFileSync, writeFileSync, mkdirSync, statSync } from "node:fs";
import { extname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";
import { SEITE, APPS, RASTER, ANGEBOTE } from "../src/b/inhalt.mjs";
import { ladeZettel, ladeZettelkasten } from "./b-daten.mjs";

const require = createRequire(import.meta.url);
let playwright;
try { playwright = require("playwright"); } catch { playwright = require(join(process.env.NODE_PATH || "", "playwright")); }

const ROOT = new URL("../", import.meta.url);
const root = fileURLToPath(ROOT);
const AUS = new URL("b/kacheln/", ROOT);
mkdirSync(AUS, { recursive: true });
const filter = process.argv[2] || "";
const esc = (s) => String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const kachelName = (pfad) => (pfad.replace(/\/$/, "").replace(/\//g, "-") || "start");

const zettel = ladeZettel();
const kasten = ladeZettelkasten();
const personAus = (c) => c.split(",")[0].trim();
const personen = new Map();
for (const z of zettel) for (const r of z.references) { const p = personAus(r.citation); (personen.get(p) || personen.set(p, []).get(p)).push(z.number); }
const nahe = (z) => { const s = new Set(); for (const r of z.references) for (const n of personen.get(personAus(r.citation)) || []) if (n !== z.number) s.add(n); return [...s]; };

const types = { ".html": "text/html", ".css": "text/css", ".js": "text/javascript", ".woff2": "font/woff2", ".svg": "image/svg+xml", ".png": "image/png", ".jpg": "image/jpeg", ".webp": "image/webp" };
const server = createServer(async (req, res) => {
  try { let p = decodeURIComponent(new URL(req.url, "http://x").pathname); if (p.endsWith("/")) p += "index.html"; res.writeHead(200, { "content-type": types[extname(p)] || "application/octet-stream" }).end(readFileSync(join(root, p))); }
  catch { res.writeHead(404).end(); }
}).listen(0);
const base = `http://localhost:${server.address().port}/`;

/** Das Feld 7 × 7 als Punkte, mit Fäden zwischen den nahen Zetteln */
function feldSvg({ hier = null, nah = [], gross = 1 } = {}) {
  const a = 36 * gross, r = 6 * gross, w = 7 * a;
  const pos = (n) => [((n - 1) % 7) * a + a / 2, Math.floor((n - 1) / 7) * a + a / 2];
  let s = `<svg viewBox="0 0 ${w} ${w}" width="${w}" height="${w}" xmlns="http://www.w3.org/2000/svg">`;
  if (hier) for (const n of nah) { const [x1, y1] = pos(hier), [x2, y2] = pos(n); const dx = x2 - x1, dy = y2 - y1, l = Math.hypot(dx, dy) || 1, k = Math.min(40 * gross, l * 0.22); s += `<path d="M${x1} ${y1} Q${(x1 + x2) / 2 - (dy / l) * k} ${(y1 + y2) / 2 + (dx / l) * k} ${x2} ${y2}" fill="none" stroke="#1d3fd6" stroke-width="${1.4 * gross}" opacity="0.8"/>`; }
  for (let n = 1; n <= 49; n++) { const [x, y] = pos(n); const h = n === hier, m = nah.includes(n); s += `<circle cx="${x}" cy="${y}" r="${h ? r * 1.6 : r}" fill="${h ? "#1d3fd6" : m ? "rgba(29,63,214,0.25)" : "none"}" stroke="${h || m ? "#1d3fd6" : "#8a8a8a"}" stroke-width="${1.2 * gross}"/>`; }
  return s + "</svg>";
}
// das Signet: die Re-entry-Schlaufe (r = b + a·cos t), wie in tools/build-b.mjs
const limacon = (() => { const LA = 1, LB = 0.45, LK = 1.2, N = 120; const p = Array.from({ length: N + 1 }, (_, i) => { const t = (i / N) * Math.PI * 2, r = LB + LA * Math.cos(t); return [LK * r * Math.cos(t), LK * r * Math.sin(t)]; }); const xs = p.map((q) => q[0]), ys = p.map((q) => q[1]); const mx = (Math.min(...xs) + Math.max(...xs)) / 2, my = (Math.min(...ys) + Math.max(...ys)) / 2, sp = Math.max(Math.max(...xs) - Math.min(...xs), Math.max(...ys) - Math.min(...ys)); return { d: p.map(([x, y], i) => `${i ? "L" : "M"}${(17 + ((x - mx) / sp) * 22).toFixed(2)} ${(12 + ((y - my) / sp) * 22).toFixed(2)}`).join("") + "Z", punkt: [(17 + ((p[50][0] - mx) / sp) * 22).toFixed(2), (12 + ((p[50][1] - my) / sp) * 22).toFixed(2)] }; })();
const signet = `<svg viewBox="0 0 34 24" width="48" height="34"><path d="${limacon.d}" fill="none" stroke="currentColor" stroke-width="1.4"/><circle cx="${limacon.punkt[0]}" cy="${limacon.punkt[1]}" r="2.2" fill="#1d3fd6"/></svg>`;

function seiteHtml({ breite, hoehe, kicker, titel, satz, feld, fuss, serif = false, titelGroesse }) {
  return `<!DOCTYPE html><html lang="de"><head><meta charset="utf-8"><link rel="stylesheet" href="/vendor/fonts/fonts.css"><style>
  html, body { margin: 0; } body { width: ${breite}px; height: ${hoehe}px; background: #fff; color: #000; font-family: "Instrument Sans", system-ui, sans-serif; position: relative; overflow: hidden; }
  .links { position: absolute; left: 72px; top: 64px; right: ${feld ? 380 : 72}px; bottom: 64px; display: flex; flex-direction: column; }
  .kicker { font-size: 24px; color: #6f6f6f; margin-bottom: 18px; }
  .titel { font-size: ${titelGroesse || 76}px; font-weight: 500; letter-spacing: -0.025em; line-height: 1; max-width: 14ch; }
  .satz { margin-top: 26px; font-size: 34px; line-height: 1.25; max-width: 30ch; ${serif ? 'font-family: "Newsreader", Georgia, serif; font-style: italic; font-size: 40px;' : "color: #333;"} }
  .fuss { margin-top: auto; display: flex; align-items: center; gap: 14px; font-size: 26px; font-weight: 500; }
  .fuss .punkt { position: absolute; }
  .feld { position: absolute; right: 72px; top: 50%; transform: translateY(-50%); }
  .linie { position: absolute; left: 72px; right: 72px; top: 40px; height: 1px; background: #dadada; }
</style></head><body>
  <div class="linie"></div>
  <div class="links">
    ${kicker ? `<div class="kicker">${esc(kicker)}</div>` : ""}
    <div class="titel">${esc(titel)}</div>
    ${satz ? `<div class="satz">${esc(satz)}</div>` : ""}
    <div class="fuss"><span style="color:#000">${signet}</span><span>${esc(fuss || "ornament.cloud")}</span></div>
  </div>
  ${feld ? `<div class="feld">${feld}</div>` : ""}
</body></html>`;
}

/** Was auf die Karte kommt, je Seite */
function karte(pfad) {
  const z = pfad.match(/^zettel\/(\d+)-/); if (z) { const s = zettel[+z[1] - 1]; return { kicker: `Zu seiner Zeit · ${s.cycle.roman} ${s.cycle.name} · Zettel ${s.number} von 49`, titel: s.title, satz: s.bottom_line, serif: true, feld: feldSvg({ hier: s.number, nah: nahe(s) }) }; }
  const a = pfad.match(/^apps\/([^/]+)\//); if (a) { const x = APPS.find((p) => p.slug === a[1]); return { kicker: `App · ${x.gattung}`, titel: x.name, satz: x.kurz, feld: feldSvg() }; }
  const r = pfad.match(/^raster\/([^/]+)\//); if (r) { const x = RASTER.find((p) => p.slug === r[1]); return { kicker: `Prüfraster · ${x.fassung}`, titel: x.name, satz: x.kurz, titelGroesse: 62, feld: feldSvg() }; }
  const g = pfad.match(/^angebot\/([^/]+)\//); if (g) { const x = ANGEBOTE.find((p) => p.slug === g[1]); return { kicker: `Leistung · ${SEITE.person.name}, Kaiserstuhl`, titel: x.name, satz: x.kurz, titelGroesse: 66, feld: feldSvg() }; }
  const fest = {
    "": { titel: "ornament.cloud", satz: "Webdesign, Vermittlung und Beratung, kuratorische Projekte, Produkte. 49 Zettel, sieben Apps, vier Prüfraster.", feld: feldSvg({ hier: 1, nah: nahe(zettel[0]) }) },
    "zettel/": { kicker: kasten.structure, titel: "Zu seiner Zeit", satz: kasten.subtitle, feld: feldSvg() },
    "apps/": { kicker: "Sieben Apps im Browser", titel: "Apps", satz: "ORNA, ORMA, OMNA COLOR, PHORMA I bis III, The Fictory.", feld: feldSvg() },
    "raster/": { kicker: "Vier Instrumente", titel: "Prüfraster", satz: "Grundlagenpapiere und Anwendungsprompts zum genaueren Hinsehen.", feld: feldSvg() },
    "angebot/": { kicker: SEITE.person.name + ", Kaiserstuhl", titel: "Angebot", satz: "Webdesign, Vermittlung und Beratung, kuratorische Projekte, Produkte.", feld: feldSvg() },
    "werke/": { kicker: SEITE.person.name, titel: "Werke", satz: "Originale, Prints in kleinen Auflagen und Arbeiten im Raum.", feld: feldSvg() },
    "zuletzt/": { kicker: "Aus Social Media", titel: "Zuletzt", satz: "Beiträge, gesichert mit Beleg und Schlagworten.", feld: feldSvg() },
    "ueber/": { kicker: "Kaiserstuhl am Rhein", titel: SEITE.person.name, satz: "Webdesign, Vermittlung und Beratung, kuratorische Projekte, Produkte.", titelGroesse: 66, feld: feldSvg() },
    "werkstatt/": { kicker: "Werkstatt", titel: "Print on Demand", satz: "Produkte aus dem Bestand.", feld: feldSvg() },
  };
  return fest[pfad];
}

const liste = JSON.parse(readFileSync(new URL("liste.json", AUS), "utf8")).filter((p) => p.startsWith(filter));
const browser = await playwright.chromium.launch();
const page = await browser.newPage({ viewport: { width: 1200, height: 630 }, deviceScaleFactor: 1 });
await page.goto(base + "b/", { waitUntil: "load" });     // die Schriften laden
let n = 0;
for (const pfad of liste) {
  const k = karte(pfad); if (!k) { console.warn("keine Karte für", pfad); continue; }
  await page.setViewportSize({ width: 1200, height: 630 });
  await page.setContent(seiteHtml({ breite: 1200, hoehe: 630, ...k }), { waitUntil: "load" });
  await page.evaluate(() => document.fonts.ready);
  const datei = new URL(`${kachelName(pfad)}.png`, AUS);
  writeFileSync(datei, await page.screenshot({ type: "png" }));
  n++;
  // je Zettel zusätzlich die quadratische Karte zum Herunterladen
  const z = pfad.match(/^zettel\/(\d+)-(.+)\//);
  if (z) {
    const s = zettel[+z[1] - 1];
    await page.setViewportSize({ width: 1080, height: 1080 });
    await page.setContent(`<!DOCTYPE html><html lang="de"><head><meta charset="utf-8"><link rel="stylesheet" href="/vendor/fonts/fonts.css"><style>
      html, body { margin: 0; } body { width: 1080px; height: 1080px; background: #fff; color: #000; font-family: "Instrument Sans", system-ui, sans-serif; position: relative; overflow: hidden; }
      .k { position: absolute; left: 80px; right: 80px; top: 80px; bottom: 80px; display: flex; flex-direction: column; }
      .kicker { font-size: 26px; color: #6f6f6f; }
      .titel { font-size: 84px; font-weight: 500; letter-spacing: -0.025em; line-height: 1; margin-top: 22px; }
      .satz { font-family: "Newsreader", Georgia, serif; font-style: italic; font-size: 50px; line-height: 1.22; margin-top: 36px; max-width: 22ch; }
      .unten { margin-top: auto; display: flex; justify-content: space-between; align-items: flex-end; }
      .fuss { display: flex; align-items: center; gap: 14px; font-size: 28px; font-weight: 500; }
    </style></head><body><div class="k">
      <div class="kicker">Zu seiner Zeit · ${esc(s.cycle.roman)} ${esc(s.cycle.name)} · Zettel ${s.number} von 49</div>
      <div class="titel">${esc(s.title)}</div>
      <div class="satz">${esc(s.bottom_line)}</div>
      <div class="unten"><div class="fuss">${signet}<span>ornament.cloud/b</span></div>${feldSvg({ hier: s.number, nah: nahe(s), gross: 1.1 })}</div>
    </div></body></html>`, { waitUntil: "load" });
    await page.evaluate(() => document.fonts.ready);
    writeFileSync(new URL(`zettel-${s.slug}-karte.png`, AUS), await page.screenshot({ type: "png" }));
    n++;
  }
  process.stdout.write(`${pfad || "/"} `);
}
await browser.close(); server.close();
const gross = [...liste.map((p) => `${kachelName(p)}.png`)].map((f) => [f, statSync(new URL(f, AUS)).size]).filter(([, s]) => s > 300 * 1024);
console.log(`\n${n} Karten geschrieben${gross.length ? `; über 300 KB: ${gross.map(([f]) => f).join(", ")}` : ""}`);
