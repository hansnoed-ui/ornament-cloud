// Neubau /b/, Werkstatt: PDFs für Print on Demand aus dem Zettelkasten, gesetzt als HTML mit den Schriften der Seite, gedruckt mit Playwright.
// Die Texte kommen wörtlich aus src/data/zu-seiner-zeit.json. Schreibt nach b/werkstatt/pod/:
//   zu-seiner-zeit-buch-innen.pdf   Taschenbuch 6 × 9 Zoll, je Zettel eine Seite
//   zu-seiner-zeit-buch-cover.pdf   Umschlag dazu nach den Massen von Amazon KDP (Rücken aus der Seitenzahl, 0,125 Zoll Beschnitt)
//   zu-seiner-zeit-karten.pdf       49 Karten A6, Vorderseite Leitsatz, Rückseite Text (je Karte zwei Seiten nacheinander, für Duplex)
//   das-feld-a2.pdf                 Poster A2 mit allen 49 Titeln und Leitsätzen
//   notizbuch-umschlaege.pdf        sieben Umschläge 6 × 9 Zoll, 120 Seiten, einer je Zyklus
//
//   NODE_PATH=$(npm root -g) node tools/build-b-pod.mjs
import { createServer } from "node:http";
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { extname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";
import { SEITE } from "../src/b/inhalt.mjs";
import { ladeZettel, ladeZettelkasten } from "./b-daten.mjs";

const require = createRequire(import.meta.url);
let playwright;
try { playwright = require("playwright"); } catch { playwright = require(join(process.env.NODE_PATH || "", "playwright")); }

const ROOT = new URL("../", import.meta.url);
const root = fileURLToPath(ROOT);
const AUS = new URL("b/werkstatt/pod/", ROOT);
mkdirSync(AUS, { recursive: true });
const esc = (s) => String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const zettel = ladeZettel();
const kasten = ladeZettelkasten();

const types = { ".css": "text/css", ".woff2": "font/woff2" };
const server = createServer((req, res) => { try { const p = decodeURIComponent(new URL(req.url, "http://x").pathname); res.writeHead(200, { "content-type": types[extname(p)] || "application/octet-stream" }).end(readFileSync(join(root, p))); } catch { res.writeHead(404).end(); } }).listen(0);
const base = `http://localhost:${server.address().port}/`;

const KOPF = `<!DOCTYPE html><html lang="de"><head><meta charset="utf-8"><link rel="stylesheet" href="${base}vendor/fonts/fonts.css"><style>
  html, body { margin: 0; } body { color: #000; background: #fff; font-family: "Newsreader", Georgia, serif; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  .sans { font-family: "Instrument Sans", system-ui, sans-serif; }
  .seite { page-break-after: always; position: relative; box-sizing: border-box; overflow: hidden; }
  .seite:last-child { page-break-after: auto; }
  .ornament { display: grid; grid-template-columns: repeat(7, 1fr); gap: 5px; width: max-content; }
  .ornament i { display: block; width: 6px; height: 6px; border-radius: 50%; border: 0.6px solid #777; }
  .ornament i.hier { background: #000; border-color: #000; }
`;
const ornament = (hier, groesse = 6) => `<span class="ornament" style="grid-template-columns:repeat(7,${groesse}px)">${zettel.map((z) => `<i style="width:${groesse}px;height:${groesse}px"${z.number === hier ? ' class="hier"' : ""}></i>`).join("")}</span>`;
const limacon = (() => { const LA = 1, LB = 0.45, LK = 1.2, N = 120; const p = Array.from({ length: N + 1 }, (_, i) => { const t = (i / N) * Math.PI * 2, r = LB + LA * Math.cos(t); return [LK * r * Math.cos(t), LK * r * Math.sin(t)]; }); const xs = p.map((q) => q[0]), ys = p.map((q) => q[1]); const mx = (Math.min(...xs) + Math.max(...xs)) / 2, my = (Math.min(...ys) + Math.max(...ys)) / 2, sp = Math.max(Math.max(...xs) - Math.min(...xs), Math.max(...ys) - Math.min(...ys)); return p.map(([x, y], i) => `${i ? "L" : "M"}${(50 + ((x - mx) / sp) * 90).toFixed(1)} ${(50 + ((y - my) / sp) * 90).toFixed(1)}`).join("") + "Z"; })();
const signet = (groesse, strich = 1.2) => `<svg viewBox="0 0 100 100" width="${groesse}" height="${groesse}"><path d="${limacon}" fill="none" stroke="#000" stroke-width="${strich}" vector-effect="non-scaling-stroke"/></svg>`;

const browser = await playwright.chromium.launch();
const page = await browser.newPage();
async function pdf(name, html, opts) {
  await page.setContent(html, { waitUntil: "load" });
  await page.evaluate(() => document.fonts.ready);
  const buf = await page.pdf({ printBackground: true, preferCSSPageSize: true, ...opts });
  writeFileSync(new URL(name, AUS), buf);
  console.log(name, Math.round(buf.length / 1024), "KB");
  return buf;
}

/* ---------- 1. Das Buch: Innenteil 6 × 9 Zoll ---------- */
const buchSeiten = [];
buchSeiten.push(`<div class="seite titel"><div style="position:absolute;left:0;right:0;top:34%;text-align:center"><div class="sans" style="font-size:9pt;letter-spacing:0.08em;color:#555">${esc(SEITE.person.name)}</div><div class="sans" style="font-size:30pt;font-weight:500;letter-spacing:-0.02em;margin-top:14pt">Zettelkasten</div><div style="font-style:italic;font-size:12pt;margin-top:10pt;padding:0 40pt">${esc(kasten.subtitle)}</div><div style="margin:40pt auto 0;display:flex;justify-content:center">${ornament(null, 5)}</div></div></div>`);
buchSeiten.push(`<div class="seite" style="font-size:8.5pt;line-height:1.5"><div style="position:absolute;bottom:0.9in;left:0;right:0"><p>Zettelkasten. ${esc(kasten.subtitle)}.<br>${esc(kasten.version)} vom ${esc(kasten.date)}. ${esc(kasten.structure)}.</p><p>© ${new Date().getFullYear()} ${esc(SEITE.person.name)}, ${esc(SEITE.person.strasse)}, ${esc(SEITE.person.plz)}.<br>ornament.cloud</p><p>Die Verweise am Ende jedes Zettels sind Resonanz- und Anschlussstellen, keine Beweiskette.</p></div></div>`);
buchSeiten.push(`<div class="seite"><div class="sans" style="font-size:9pt;letter-spacing:0.08em;color:#555;margin-bottom:18pt">Sieben Zyklen</div>${kasten.cycles.map((c) => `<div style="margin-bottom:12pt;display:grid;grid-template-columns:28pt 1fr;gap:6pt"><span class="sans" style="color:#555;font-size:9pt;padding-top:2pt">${c.roman}</span><span><b class="sans" style="font-weight:500">${esc(c.name)}</b> · ${c.stanzas[0]}–${c.stanzas[6]}<br><span style="font-size:10pt;color:#333">${esc(c.deck)}</span></span></div>`).join("")}</div>`);
buchSeiten.push(`<div class="seite"></div>`);
for (const z of zettel) buchSeiten.push(`<div class="seite zettel"><div class="sans" style="display:flex;justify-content:space-between;align-items:flex-start;font-size:8pt;color:#555"><span>${esc(z.cycle.roman)} · ${esc(z.cycle.name)}</span>${ornament(z.number, 4)}</div>
  <div class="sans" style="font-size:22pt;font-weight:500;letter-spacing:-0.02em;margin-top:26pt;line-height:1.05">${z.number} · ${esc(z.title)}</div>
  <div style="font-style:italic;font-size:13pt;line-height:1.3;margin-top:12pt">${esc(z.bottom_line)}</div>
  <div style="font-size:10.5pt;line-height:1.5;margin-top:16pt">${esc(z.text)}</div>
  <div style="margin-top:16pt;border-top:0.5pt solid #000;padding-top:8pt;font-size:8.5pt;line-height:1.4">${z.references.map((r) => `<div style="margin-bottom:4pt"><span class="sans" style="color:#555">${esc(r.domain)}</span> · <b style="font-weight:500">${esc(r.citation)}</b> — ${esc(r.resonance)}</div>`).join("")}</div>
  <div class="sans" style="position:absolute;bottom:0;left:0;right:0;text-align:center;font-size:8pt;color:#555">${z.number}</div></div>`);
if (buchSeiten.length % 2) buchSeiten.push(`<div class="seite"></div>`);
const buchHtml = `${KOPF} @page { size: 6in 9in; margin: 0.75in 0.6in 0.7in 0.75in; } .seite { height: 7.55in; } </style></head><body>${buchSeiten.join("")}</body></html>`;
await pdf("zu-seiner-zeit-buch-innen.pdf", buchHtml);
const seitenzahl = buchSeiten.length;

/* ---------- 2. Umschlag des Buchs (KDP: Rücken 0,002252 Zoll je Seite bei weissem Papier, 0,125 Zoll Beschnitt) ---------- */
function umschlag({ titel, untertitel, ruecken, seitenzahl, hinten, ornamentHier = null }) {
  const spine = (seitenzahl * 0.002252).toFixed(3);
  const breite = (0.125 + 6 + +spine + 6 + 0.125).toFixed(3), hoehe = 9.25;
  return `${KOPF} @page { size: ${breite}in ${hoehe}in; margin: 0; } body { width: ${breite}in; height: ${hoehe}in; position: relative; }
    .hinten { position: absolute; left: 0; top: 0; width: 6.125in; height: ${hoehe}in; padding: 0.7in 0.6in 0.7in 0.7in; box-sizing: border-box; }
    .ruecken { position: absolute; left: 6.125in; top: 0; width: ${spine}in; height: ${hoehe}in; display: flex; align-items: center; justify-content: center; }
    .ruecken span { writing-mode: vertical-rl; font-size: ${Math.min(11, +spine * 60)}pt; white-space: nowrap; }
    .vorne { position: absolute; right: 0; top: 0; width: 6.125in; height: ${hoehe}in; padding: 0.7in 0.7in 0.7in 0.6in; box-sizing: border-box; }
  </style></head><body>
    <div class="hinten"><div style="font-size:11pt;line-height:1.5;margin-top:1.2in">${hinten}</div><div style="position:absolute;bottom:0.9in;left:0.7in" class="sans"><div style="font-size:9pt;color:#555">ornament.cloud</div></div></div>
    <div class="ruecken"><span class="sans">${esc(ruecken)}</span></div>
    <div class="vorne"><div class="sans" style="font-size:9pt;letter-spacing:0.08em;color:#555;margin-top:1in">${esc(SEITE.person.name)}</div><div class="sans" style="font-size:38pt;font-weight:500;letter-spacing:-0.025em;line-height:1;margin-top:14pt">${esc(titel)}</div><div style="font-style:italic;font-size:14pt;line-height:1.3;margin-top:14pt;max-width:26ch">${esc(untertitel)}</div><div style="position:absolute;bottom:0.9in;left:0.6in">${ornament(ornamentHier, 9)}</div></div>
  </body></html>`;
}
await pdf("zu-seiner-zeit-buch-cover.pdf", umschlag({ titel: "Zettelkasten", untertitel: kasten.subtitle, ruecken: `${SEITE.person.name} · Zettelkasten`, seitenzahl, hinten: `<p>${esc(kasten.structure)}: 49 Zettel von der Brücke bis zur Zukunft. Jeder hat einen Leitsatz, einen Text von rund hundert Wörtern und vier Verweise in Soziologie, Philosophie, Kunst und Literatur.</p><p>Ein Zettelkasten zum Lesen in jeder Reihenfolge.</p><p style="font-style:italic">${esc(zettel[0].bottom_line)}</p>` }));

/* ---------- 3. Karten A6: Vorderseite Leitsatz, Rückseite Text ---------- */
const karten = zettel.map((z) => `<div class="seite vorn"><div class="sans" style="font-size:7pt;color:#555;display:flex;justify-content:space-between"><span>${z.number} · ${esc(z.title)}</span>${ornament(z.number, 3.5)}</div><div style="position:absolute;left:9mm;right:9mm;top:38%;font-style:italic;font-size:14pt;line-height:1.3">${esc(z.bottom_line)}</div><div class="sans" style="position:absolute;bottom:9mm;left:9mm;font-size:7pt;color:#555">Zettelkasten · ornament.cloud</div></div>
<div class="seite hinten"><div class="sans" style="font-size:7pt;color:#555">${esc(z.cycle.roman)} · ${esc(z.cycle.name)}</div><div class="sans" style="font-size:14pt;font-weight:500;letter-spacing:-0.02em;margin-top:8pt">${esc(z.title)}</div><div style="font-size:8.6pt;line-height:1.4;margin-top:8pt">${esc(z.text)}</div><div style="font-size:6.5pt;line-height:1.35;margin-top:8pt;color:#333">${z.references.map((r) => `${esc(r.citation)}`).join(" · ")}</div></div>`).join("");
await pdf("zu-seiner-zeit-karten.pdf", `${KOPF} @page { size: 105mm 148mm; margin: 9mm; } .seite { height: 130mm; } </style></head><body>${karten}</body></html>`);

/* ---------- 4. Poster A2: das Feld ---------- */
const poster = `${KOPF} @page { size: 420mm 594mm; margin: 0; } body { width: 420mm; height: 594mm; position: relative; }
  .kopf { position: absolute; left: 24mm; right: 24mm; top: 22mm; display: flex; justify-content: space-between; align-items: flex-end; }
  .feld { position: absolute; left: 24mm; right: 24mm; top: 64mm; display: grid; grid-template-columns: repeat(7, 1fr); border-top: 0.4mm solid #000; border-left: 0.4mm solid #000; }
  .feld div { aspect-ratio: 1 / 1.25; border-right: 0.4mm solid #000; border-bottom: 0.4mm solid #000; padding: 4mm; box-sizing: border-box; display: flex; flex-direction: column; justify-content: space-between; }
  .feld .n { font-size: 8pt; color: #555; } .feld .t { font-size: 13pt; font-weight: 500; letter-spacing: -0.02em; line-height: 1.05; } .feld .s { font-style: italic; font-size: 7.6pt; line-height: 1.25; margin-top: 3mm; }
  .zyklen { position: absolute; left: 24mm; right: 24mm; top: 560mm; display: grid; grid-template-columns: repeat(7, 1fr); font-size: 8pt; color: #555; }
</style></head><body>
  <div class="kopf"><div><div class="sans" style="font-size:30pt;font-weight:500;letter-spacing:-0.025em;line-height:1">Zettelkasten</div><div style="font-style:italic;font-size:12pt;margin-top:4mm">${esc(kasten.subtitle)} · ${esc(kasten.structure)}</div></div><div class="sans" style="font-size:10pt;display:flex;align-items:center;gap:4mm">${signet(28, 0.5)}ornament.cloud</div></div>
  <div class="feld">${zettel.map((z) => `<div><div><div class="n sans">${z.number}</div><div class="t sans">${esc(z.title)}</div></div><div class="s">${esc(z.bottom_line)}</div></div>`).join("")}</div>
  <div class="zyklen sans">${kasten.cycles.map((c) => `<span>${c.roman} ${esc(c.name)}</span>`).join("")}</div>
</body></html>`;
await pdf("das-feld-a2.pdf", poster);

/* ---------- 5. Sieben Notizbücher: Umschläge, 120 Seiten ---------- */
const nb = kasten.cycles.map((c) => {
  const spine = (120 * 0.002252).toFixed(3), breite = (0.125 + 6 + +spine + 6 + 0.125).toFixed(3), hoehe = 9.25;
  const meine = c.stanzas.map((n) => zettel[n - 1]);
  return `<div class="seite" style="width:${breite}in;height:${hoehe}in;position:relative">
    <div style="position:absolute;left:0;top:0;width:6.125in;height:${hoehe}in;padding:0.9in 0.6in 0.9in 0.7in;box-sizing:border-box"><div style="font-size:10.5pt;line-height:1.5;margin-top:0.6in">${meine.map((z) => `<p style="margin:0 0 6pt"><b class="sans" style="font-weight:500">${z.number} · ${esc(z.title)}</b><br><span style="font-style:italic">${esc(z.bottom_line)}</span></p>`).join("")}</div><div class="sans" style="position:absolute;bottom:0.9in;left:0.7in;font-size:9pt;color:#555">ornament.cloud · Notizbuch ${c.roman}</div></div>
    <div style="position:absolute;left:6.125in;top:0;width:${spine}in;height:${hoehe}in;display:flex;align-items:center;justify-content:center"><span class="sans" style="writing-mode:vertical-rl;font-size:10pt;white-space:nowrap">Zettelkasten · ${c.roman} ${esc(c.name)}</span></div>
    <div style="position:absolute;right:0;top:0;width:6.125in;height:${hoehe}in;padding:0.9in 0.7in 0.9in 0.6in;box-sizing:border-box"><div class="sans" style="font-size:9pt;letter-spacing:0.08em;color:#555;margin-top:0.9in">Zettelkasten · ${c.roman}</div><div class="sans" style="font-size:44pt;font-weight:500;letter-spacing:-0.025em;line-height:1;margin-top:12pt">${esc(c.name)}</div><div style="font-style:italic;font-size:14pt;line-height:1.3;margin-top:14pt;max-width:24ch">${esc(c.deck)}</div><div style="position:absolute;bottom:0.9in;left:0.6in;display:grid;grid-template-columns:repeat(7,14px);gap:8px">${zettel.map((z) => `<i style="display:block;width:14px;height:14px;border-radius:50%;border:0.8px solid #000;${c.stanzas.includes(z.number) ? "background:#000" : ""}"></i>`).join("")}</div></div>
  </div>`;
}).join("");
{ const spine = (120 * 0.002252).toFixed(3), breite = (0.125 + 6 + +spine + 6 + 0.125).toFixed(3); await pdf("notizbuch-umschlaege.pdf", `${KOPF} @page { size: ${breite}in 9.25in; margin: 0; } </style></head><body>${nb}</body></html>`); }

await browser.close(); server.close();
console.log(`Buch: ${seitenzahl} Seiten, Rücken ${(seitenzahl * 0.002252).toFixed(3)} Zoll`);
