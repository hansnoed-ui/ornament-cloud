// Neubau /b/: Vorschaukarten zum Teilen (Open Graph und X, 1200 × 630) für jede Seite unter b/ und b/en/ und je Zettel eine quadratische
// Karte (1080 × 1080) zum Herunterladen. Gezeichnet als HTML mit den Schriften der Seite, aufgenommen mit Playwright.
// Liest b/kacheln/liste.json und b/en/kacheln/liste.json (geschrieben von tools/build-b.mjs) und schreibt daneben; die englischen Karten
// (seit 21. Oktober 2026, Rückmeldung: «Die Vorschaukarten … sind noch alle in deutsch … Auch die download karten beim Zettelkasten») nehmen
// die Texte aus inhalt.en.mjs und zu-seiner-zeit.en.json.
//
//   NODE_PATH=$(npm root -g) node tools/b-kacheln.mjs               alle, beide Sprachen
//   NODE_PATH=$(npm root -g) node tools/b-kacheln.mjs en zettel     nur Englisch, nur Pfade, die so beginnen
//   NODE_PATH=$(npm root -g) node tools/b-kacheln.mjs alt           nur die Karten der übrigen Seiten (ALT unten)
//
// Seit 24. Oktober 2026 (Frage: «Wie siehts eigentlich mit den Vorschaukarten für die ornament.cloud seiten») auch die Redaktion unter /b/ und
// die Seiten ausserhalb von /b/, die in der Sitemap stehen und bis dahin keine Karte hatten (News, Termine, Apps, Impressum, Web, Werke,
// Social Media): dieselbe Gestaltung, geschrieben nach assets/kacheln/ bzw. social-media/kacheln/.
import { createServer } from "node:http";
import { readFileSync, writeFileSync, mkdirSync, statSync } from "node:fs";
import { extname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";
import * as INHALT_DE from "../src/b/inhalt.mjs";
import * as INHALT_EN from "../src/b/inhalt.en.mjs";
import { ladeZettel, ladeZettelkasten } from "./b-daten.mjs";
import { ANWENDUNGEN as MV_ANWENDUNGEN, STANDARD as MV_STANDARD } from "../multiverse/anwendungen.js";
const INHALT = { de: INHALT_DE, en: INHALT_EN };

const require = createRequire(import.meta.url);
let playwright;
try { playwright = require("playwright"); } catch { playwright = require(join(process.env.NODE_PATH || "", "playwright")); }

const ROOT = new URL("../", import.meta.url);
const root = fileURLToPath(ROOT);
const args = process.argv.slice(2);
const SPRACHEN = args.filter((a) => a === "de" || a === "en");
const NUR_ALT = args.includes("alt");
const filter = args.find((a) => a !== "de" && a !== "en" && a !== "alt") || "";
const ausgabe = (sprache) => new URL(sprache === "de" ? "b/kacheln/" : `b/${sprache}/kacheln/`, ROOT);
const esc = (s) => String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const kachelName = (pfad) => (pfad.replace(/\/$/, "").replace(/\//g, "-") || "start");

const zettel = ladeZettel();   // die Nähe über die Personen ist in beiden Sprachen dieselbe
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
/** Multiverse (8. November 2026): vier Felder 2 × 2 mit den Pixelzeichen (an) der vier Anwendungen, die beim ersten Besuch laufen */
function multiverseSvg() {
  const g = 150, luft = 16, z = 7.6, w = g * 2 + luft;
  let s = `<svg viewBox="0 0 ${w} ${w}" width="${w}" height="${w}" xmlns="http://www.w3.org/2000/svg">`;
  MV_STANDARD.forEach((id, i) => {
    const a = MV_ANWENDUNGEN.find((x) => x.id === id), x0 = (i % 2) * (g + luft), y0 = Math.floor(i / 2) * (g + luft), o = (g - 13 * z) / 2;
    s += `<rect x="${x0}" y="${y0}" width="${g}" height="${g}" rx="14" fill="#000"/>`;
    for (const [x, y, d] of a.an) s += `<rect x="${(x0 + o + x * z + z * .1).toFixed(1)}" y="${(y0 + o + y * z + z * .1).toFixed(1)}" width="${(z * .8).toFixed(1)}" height="${(z * .8).toFixed(1)}" fill="${a.farbe}" opacity="${d}"/>`;
  });
  return s + "</svg>";
}
// das Signet: die Re-entry-Schlaufe (r = b + a·cos t), wie in tools/build-b.mjs
const limacon = (() => { const LA = 1, LB = 0.45, LK = 1.2, N = 120; const p = Array.from({ length: N + 1 }, (_, i) => { const t = (i / N) * Math.PI * 2, r = LB + LA * Math.cos(t); return [LK * r * Math.cos(t), LK * r * Math.sin(t)]; }); const xs = p.map((q) => q[0]), ys = p.map((q) => q[1]); const mx = (Math.min(...xs) + Math.max(...xs)) / 2, my = (Math.min(...ys) + Math.max(...ys)) / 2, sp = Math.max(Math.max(...xs) - Math.min(...xs), Math.max(...ys) - Math.min(...ys)); return { d: p.map(([x, y], i) => `${i ? "L" : "M"}${(17 + ((x - mx) / sp) * 22).toFixed(2)} ${(12 + ((y - my) / sp) * 22).toFixed(2)}`).join("") + "Z", punkt: [(17 + ((p[50][0] - mx) / sp) * 22).toFixed(2), (12 + ((p[50][1] - my) / sp) * 22).toFixed(2)] }; })();
const signet = `<svg viewBox="0 0 34 24" width="48" height="34"><path d="${limacon.d}" fill="none" stroke="currentColor" stroke-width="1.4"/><circle cx="${limacon.punkt[0]}" cy="${limacon.punkt[1]}" r="2.2" fill="#1d3fd6"/></svg>`;

/** Die Wörter der Karten je Sprache; die Inhalte kommen aus inhalt.mjs bzw. inhalt.en.mjs und dem Zettelkasten */
const W = {
  de: {
    zettel: (s) => `Zettelkasten · ${s.cycle.roman} ${s.cycle.name} · Zettel ${s.number} von 49`, app: "App", raster: "Prüfraster", angebot: "Leistung", fuss: "ornament.cloud/b",
    start: "Theorie, die man anfassen kann. Musik, Werke, sieben Apps, 49 Zettel, vier Prüfraster.",   // seit 13. November 2026 («Künstler zuerst»)
    apps: ["Sieben Apps im Browser", "Apps", "ORNA, ORMA, OMNA COLOR, PHORMA I bis III, The Fictory."],
    rasterSeite: ["Vier Instrumente", "Prüfraster", "Grundlagenpapiere und Anwendungsprompts zum genaueren Hinsehen."],
    angebotSeite: [", zwischen Zürich, Basel und Aarau", "Angebot", "Webdesign, Vermittlung und Beratung, kuratorische Projekte, Produkte."],
    werke: ["Werke", "Originale, Prints in kleinen Auflagen und Arbeiten im Raum."],
    hoeren: ["the i", "Hören", "Musik zum Hören im Browser."], atelier: ["ornament.cloud", "Atelier", "Werkzeuge im Bau, Proben und andere Fassungen."],
    zuletzt: ["Aus Social Media", "Zuletzt", "Beiträge, gesichert mit Beleg und Schlagworten."],
    ueber: ["Zwischen Zürich, Basel und Aarau", "Webdesign, Vermittlung und Beratung, kuratorische Projekte, Produkte."],
    werkstatt: ["Werkstatt", "Print on Demand", "Produkte aus dem Bestand."],
    redaktion: ["Werkstatt · Social Media", "Redaktion", "Bildschirmfotos, Bilder und Videos zu Zetteln machen."],
  },
  en: {
    zettel: (s) => `Zettelkasten · ${s.cycle.roman} ${s.cycle.name} · Note ${s.number} of 49`, app: "App", raster: "Test grid", angebot: "Service", fuss: "ornament.cloud/b/en",
    start: "Theory you can touch. Music, works, seven apps, 49 notes, four test grids.",
    apps: ["Seven apps in the browser", "Apps", "ORNA, ORMA, OMNA COLOR, PHORMA I to III, The Fictory."],
    rasterSeite: ["Four instruments", "Test grids", "Background papers and application prompts for looking closer."],
    angebotSeite: [", between Zurich, Basel and Aarau", "Services", "Web design, education and consulting, curatorial projects, products."],
    werke: ["Works", "Originals, prints in small editions and works in space."],
    hoeren: ["the i", "Listen", "Music to listen to in the browser."], atelier: ["ornament.cloud", "Studio", "Tools under construction, trials and other versions."],
    zuletzt: ["From social media", "Latest", "Posts, kept with source and keywords."],
    ueber: ["Between Zurich, Basel and Aarau", "Web design, education and consulting, curatorial projects, products."],
  },
};

function seiteHtml({ lang, breite, hoehe, kicker, titel, satz, feld, fuss, serif = false, titelGroesse, titelBreite = 14 }) {
  return `<!DOCTYPE html><html lang="${lang}"><head><meta charset="utf-8"><link rel="stylesheet" href="/vendor/fonts/fonts.css"><style>
  html, body { margin: 0; } body { width: ${breite}px; height: ${hoehe}px; background: #fff; color: #000; font-family: "Instrument Sans", system-ui, sans-serif; position: relative; overflow: hidden; }
  .links { position: absolute; left: 72px; top: 64px; right: ${feld ? 380 : 72}px; bottom: 64px; display: flex; flex-direction: column; }
  .kicker { font-size: 24px; color: #6f6f6f; margin-bottom: 18px; }
  .titel { font-size: ${titelGroesse || 76}px; font-weight: 500; letter-spacing: -0.025em; line-height: 1; max-width: ${titelBreite}ch; }
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

/** KONSTELLATION (8. November 2026, Wunsch: «eine tolle Vorschaukarte für /alpha/konstellation»): eine echte Konstellation aus dem Bestand der Seite,
    nicht ausgedacht. Name «Konstellation», Ort Kaiserstuhl (47.567000, 8.419000), Zeitpunkt 08.11.2026, 21:30:00 UTC, Online aus: Wetter aus dem Archiv,
    Exoplanet, Bild (Hiroshige, Met Open Access, CC0) und Textstelle (Vischer, ELTeC) sind das, was die Seite dazu zieht. Gestaltung wie die Seite:
    Forschungsprotokoll, Mono, Schwarz/Weiss/Grau, ein blauer Akzent, nummerierte Felder 01–04. */
function konstellationHtml() {
  const B = "#0b57d0", sterne = [[64, 26, "01"], [196, 22, "02"], [262, 92, "03"], [118, 128, "04"]], mitte = [150, 66];
  let fig = `<svg viewBox="0 0 300 150" width="300" height="150" xmlns="http://www.w3.org/2000/svg">`;
  for (const [x, y] of sterne) fig += `<line x1="${mitte[0]}" y1="${mitte[1]}" x2="${x}" y2="${y}" stroke="${B}" stroke-width="1" opacity=".55"/>`;
  fig += `<polyline points="${[...sterne, sterne[0]].map(([x, y]) => `${x},${y}`).join(" ")}" fill="none" stroke="#9aa3ad" stroke-width=".8" stroke-dasharray="2 4"/>`;
  fig += `<circle cx="${mitte[0]}" cy="${mitte[1]}" r="5" fill="${B}"/><circle cx="${mitte[0]}" cy="${mitte[1]}" r="11" fill="none" stroke="${B}" stroke-width=".8" opacity=".5"/>`;
  for (const [x, y, n] of sterne) fig += `<circle cx="${x}" cy="${y}" r="3.2" fill="#fff" stroke="#111418" stroke-width="1.2"/><text x="${x + 8}" y="${y - 6}" font-family="JetBrains Mono, monospace" font-size="11" fill="#5b6470">${n}</text>`;
  fig += `</svg>`;
  return `<!DOCTYPE html><html lang="de"><head><meta charset="utf-8"><link rel="stylesheet" href="/vendor/fonts/fonts.css"><style>
  html, body { margin: 0; } body { width: 1200px; height: 630px; background: #fff; color: #111418; font-family: "Instrument Sans", system-ui, sans-serif; position: relative; overflow: hidden; }
  .mono { font-family: "JetBrains Mono", "DejaVu Sans Mono", monospace; }
  .links { position: absolute; left: 64px; top: 56px; bottom: 52px; width: 430px; display: flex; flex-direction: column; }
  .kicker { font-size: 17px; color: #5b6470; letter-spacing: .02em; }
  .titel { font-size: 38px; font-weight: 600; letter-spacing: .26em; margin-top: 18px; line-height: 1; }
  .satz { font-family: "Newsreader", Georgia, serif; font-style: italic; font-size: 34px; line-height: 1.18; margin-top: 22px; max-width: 13em; }
  .fig { margin-top: 26px; }
  .fuss { margin-top: auto; }
  .proto { font-size: 13px; color: #5b6470; line-height: 1.55; border-top: 1px solid #d7dbe0; padding-top: 10px; }
  .adresse { display: flex; align-items: center; gap: 12px; font-size: 22px; font-weight: 500; margin-top: 14px; }
  .netz { position: absolute; left: 534px; right: 64px; top: 56px; bottom: 52px; display: grid; grid-template-columns: 1fr 1fr; grid-template-rows: 1fr 1fr; border-top: 1.5px solid #111418; }
  .zelle { padding: 16px 20px 18px 0; border-bottom: 1px solid #d7dbe0; display: flex; flex-direction: column; min-height: 0; overflow: hidden; }
  .zelle:nth-child(2n) { padding-left: 22px; padding-right: 0; border-left: 1px solid #d7dbe0; }
  .zelle:nth-child(n+3) { border-bottom: 0; }
  .h { font-size: 13px; font-weight: 600; letter-spacing: .16em; color: #5b6470; text-transform: uppercase; }
  .h b { color: ${B}; font-weight: 600; margin-right: .5em; }
  .gross { font-size: 52px; font-weight: 500; letter-spacing: -.02em; line-height: 1; margin-top: 18px; }
  .objekt { font-size: 34px; font-weight: 500; letter-spacing: -.01em; line-height: 1.05; margin-top: 20px; }
  .werte { font-size: 14px; color: #5b6470; line-height: 1.6; margin-top: auto; }
  .bild { margin-top: 12px; flex: 1; min-height: 0; background: url(/alpha/konstellation/catalog/images/files/met-55659.39458f1e65d7.jpg) 46% 62% / 118% auto no-repeat; }
  .zitat { font-family: "Newsreader", Georgia, serif; font-style: italic; font-size: 23px; line-height: 1.28; margin-top: 14px; }
</style></head><body>
  <div class="links">
    <div class="kicker mono">ornament.cloud · Alpha</div>
    <div class="titel mono">KONSTELLATION</div>
    <div class="satz">Ein Name, ein Ort,<br>ein Augenblick.</div>
    <div class="fig">${fig}</div>
    <div class="fuss">
      <div class="proto mono">Name «Konstellation» · 47.567000, 8.419000<br>08.11.2026, 21:30:00 UTC</div>
      <div class="adresse"><span>${signet}</span><span>ornament.cloud/alpha/konstellation</span></div>
    </div>
  </div>
  <div class="netz mono">
    <div class="zelle"><div class="h"><b>01</b>Wetter</div><div class="gross" style="font-family:'Instrument Sans',sans-serif">1.8 °C</div><div class="werte">Bewölkung 88 %<br>Wind 29.5 km/h aus 50°<br>1'033.1 hPa · Archivfund</div></div>
    <div class="zelle"><div class="h"><b>02</b>Exoplanet</div><div class="objekt" style="font-family:'Instrument Sans',sans-serif">Kepler-1652 b</div><div class="werte">1.6 Erdradien · 268 K<br>Umlauf 38.097 Tage<br>252 pc · entdeckt 2017</div></div>
    <div class="zelle"><div class="h"><b>03</b>Bild</div><div class="bild" role="img" aria-label="Hiroshige, Mishima"></div><div class="werte" style="margin-top:8px">Hiroshige · Mishima · Met, CC0</div></div>
    <div class="zelle"><div class="h"><b>04</b>Textstelle</div><div class="zitat">„Hunten, Gegensatz von drunten, das ist gut, gutes Wort, kannte es noch nicht, versteh’ es aber“</div><div class="werte">Vischer · Auch Einer · Stelle 79</div></div>
  </div>
</body></html>`;
}

/** Was auf die Karte kommt, je Seite und Sprache */
function karte(pfad, sprache) {
  const w = W[sprache], { SEITE, APPS, RASTER, ANGEBOTE } = INHALT[sprache], zettelS = ladeZettel(sprache), kasten = ladeZettelkasten(sprache);
  const z = pfad.match(/^zettel\/(\d+)-/); if (z) { const s = zettelS[+z[1] - 1]; return { kicker: w.zettel(s), titel: s.title, satz: s.bottom_line, serif: true, feld: feldSvg({ hier: s.number, nah: nahe(s) }) }; }
  const a = pfad.match(/^apps\/([^/]+)\//); if (a) { const x = APPS.find((p) => p.slug === a[1]); return { kicker: `${w.app} · ${x.gattung}`, titel: x.name, satz: x.kurz, feld: feldSvg() }; }
  const r = pfad.match(/^raster\/([^/]+)\//); if (r) { const x = RASTER.find((p) => p.slug === r[1]); return { kicker: `${w.raster} · ${x.fassung}`, titel: x.name, satz: x.kurz, titelGroesse: 62, feld: feldSvg() }; }
  const g = pfad.match(/^angebot\/([^/]+)\//); if (g) { const x = ANGEBOTE.find((p) => p.slug === g[1]); return { kicker: `${w.angebot} · ${SEITE.person.name}`, titel: x.name, satz: x.kurz, titelGroesse: 66, feld: feldSvg() }; }
  const fest = {
    "": { titel: "ornament.cloud", satz: w.start, feld: feldSvg({ hier: 1, nah: nahe(zettel[0]) }) },
    "zettel/": { kicker: kasten.structure, titel: "Zettelkasten", satz: kasten.subtitle, feld: feldSvg() },
    "apps/": { kicker: w.apps[0], titel: w.apps[1], satz: w.apps[2], feld: feldSvg() },
    "raster/": { kicker: w.rasterSeite[0], titel: w.rasterSeite[1], satz: w.rasterSeite[2], feld: feldSvg() },
    "angebot/": { kicker: SEITE.person.name + w.angebotSeite[0], titel: w.angebotSeite[1], satz: w.angebotSeite[2], feld: feldSvg() },
    "werke/": { kicker: SEITE.person.name, titel: w.werke[0], satz: w.werke[1], feld: feldSvg() },
    "hoeren/": { kicker: w.hoeren[0], titel: w.hoeren[1], satz: w.hoeren[2], feld: feldSvg() },     // seit 13. November 2026
    "atelier/": { kicker: w.atelier[0], titel: w.atelier[1], satz: w.atelier[2], feld: feldSvg() },
    "zuletzt/": { kicker: w.zuletzt[0], titel: w.zuletzt[1], satz: w.zuletzt[2], feld: feldSvg() },
    "ueber/": { kicker: w.ueber[0], titel: SEITE.person.name, satz: w.ueber[1], titelGroesse: 66, feld: feldSvg() },
    "werkstatt/": w.werkstatt ? { kicker: w.werkstatt[0], titel: w.werkstatt[1], satz: w.werkstatt[2], feld: feldSvg() } : null,
    "redaktion/": w.redaktion ? { kicker: w.redaktion[0], titel: w.redaktion[1], satz: w.redaktion[2], feld: feldSvg() } : null,
  };
  return fest[pfad];
}

/** Die Seiten ausserhalb von /b/ (nur deutsch): Datei der Karte ab der Wurzel und was daraufkommt; die Meta-Angaben stehen in den Seiten selbst
    bzw. kommen aus social-media/js/darstellung.js, tests/teilen.test.mjs hält beides zusammen */
const ALT = [
  { datei: "assets/kacheln/news.png", kicker: "Ornament Cloud", titel: "News", satz: "Neuigkeiten und Arbeitsstände, auch als Feed zum Abonnieren." },
  { datei: "assets/kacheln/termine.png", kicker: "Ornament Cloud", titel: "Termine", satz: "Anlässe, Treffen und Ausstellungen." },
  { datei: "assets/kacheln/apps.png", kicker: "Ornament Cloud", titel: "Apps", satz: "Kleine Apps zum Ausprobieren: Bild und Video, Text und Theorie, Gestaltung." },
  { datei: "assets/kacheln/impressum.png", kicker: "Christian Strickler · Kaiserstuhl", titel: "Impressum", satz: "Impressum, Allgemeine Geschäftsbedingungen und Datenschutz." },
  { datei: "assets/kacheln/web.png", kicker: "Ornament Cloud", titel: "Web", satz: "Sketchory, The Fictory, Das Dritte Rad, Stellenfeld, ORNA und weitere Beiträge." },
  { datei: "assets/kacheln/web-orna-erklaervideo.png", kicker: "Web · Erklärvideo, 51 Sekunden", titel: "ORNA – Zufällige Begegnungen", titelGroesse: 66, satz: "Wie sich Künstler:innen und Theoretiker:innen auf zwei Ringen begegnen." },
  { datei: "assets/kacheln/web-poststrukturalismus.png", kicker: "Web · Comic-Video", titel: "Liebling, ich habe den Poststrukturalismus strukturiert", titelGroesse: 54, titelBreite: 22, satz: "Zwölf Positionen, zwei Prüfraster." },
  { datei: "assets/kacheln/werke-reentry.png", kicker: "Werke · Modell zum Drehen", titel: "Re-entry-Knoten, Helix, S/F-Band", titelGroesse: 62, satz: "Knoten, Helix und Band: eine Sequenz im Raum, zum Abspielen und Drehen." },
  { datei: "assets/kacheln/werke-stellenfeld.png", kicker: "Werke · Sequenz in sechs Bildern", titel: "Stellenfeld", satz: "Stelle, Objekt, Raum, Zeit, Werk, Atmosphäre." },
  { datei: "social-media/kacheln/social-media.png", kicker: "Zettelkasten", titel: "Social Media", satz: "Ausgewählte Beiträge aus X, Facebook und Instagram." },
  { datei: "social-media/kacheln/schlagworte.png", kicker: "Social Media · Register", titel: "Schlagworte", satz: "Die Schlagworte im Zettelkasten «Social Media»." },
  { datei: "assets/kacheln/lab.png", kicker: "ORNAMENT LAB · Alpha", titel: "ornament.lab", satz: "Erzeugen · Beobachten · Weiterführen", serif: true, fuss: "ornament.cloud/alpha/lab", feld: feldSvg({ hier: 25, nah: [3, 13, 23, 36, 40, 46] }) },   // seit 25. Oktober 2026 (Wunsch: «Vorschaukarte für social media vom lab»)
  { datei: "assets/kacheln/gamma.png", kicker: "ornament.cloud · Gamma", titel: "Sechs Bereiche, ein Netz.", titelGroesse: 66, titelBreite: 22, satz: "Websites, Apps, Kunst, Specials, Zettel und Social von Christian Strickler.", fuss: "ornament.cloud/gamma", feld: feldSvg({ hier: 25, nah: [1, 7, 19, 31, 43, 49] }) },   // seit 31. Oktober 2026 (SEO-Check: Gamma hatte keine Vorschaukarte)
  { datei: "multiverse/og-multiverse.png", kicker: "ornament.cloud", titel: "Multiverse", satz: "Vier Anwendungen zugleich, nebeneinander und bedienbar.", fuss: "ornament.cloud/multiverse", feld: multiverseSvg() },   // seit 8. November 2026 (Wunsch: «Teilenkachel … Titel ‹ornament.cloud · Multiverse›»)
  { datei: "alpha/konstellation/og-konstellation.png", html: konstellationHtml() },   // seit 8. November 2026, eine echte Konstellation aus dem Bestand der Seite
  { datei: "social-media/kacheln/autorinnen.png", kicker: "Social Media · Register", titel: "Autor:innen", satz: "Die Autor:innen im Zettelkasten «Social Media»." },
];

const browser = await playwright.chromium.launch();
const page = await browser.newPage({ viewport: { width: 1200, height: 630 }, deviceScaleFactor: 1 });
await page.goto(base + "b/", { waitUntil: "load" });     // die Schriften laden
let n = 0;
const gross = [];
for (const sprache of NUR_ALT ? [] : SPRACHEN.length ? SPRACHEN : ["de", "en"]) {
const AUS = ausgabe(sprache); mkdirSync(AUS, { recursive: true });
const liste = JSON.parse(readFileSync(new URL("liste.json", AUS), "utf8")).filter((p) => p.startsWith(filter));
const zettelS = ladeZettel(sprache);
process.stdout.write(`\n${sprache}: `);
for (const pfad of liste) {
  const k = karte(pfad, sprache); if (!k) { console.warn("keine Karte für", pfad); continue; }
  await page.setViewportSize({ width: 1200, height: 630 });
  await page.setContent(seiteHtml({ lang: sprache, breite: 1200, hoehe: 630, ...k }), { waitUntil: "load" });
  await page.evaluate(() => document.fonts.ready);
  const datei = new URL(`${kachelName(pfad)}.png`, AUS);
  writeFileSync(datei, await page.screenshot({ type: "png" }));
  if (statSync(datei).size > 300 * 1024) gross.push(`${sprache}/${kachelName(pfad)}.png`);
  n++;
  // je Zettel zusätzlich die quadratische Karte zum Herunterladen
  const z = pfad.match(/^zettel\/(\d+)-(.+)\//);
  if (z) {
    const s = zettelS[+z[1] - 1];
    await page.setViewportSize({ width: 1080, height: 1080 });
    await page.setContent(`<!DOCTYPE html><html lang="${sprache}"><head><meta charset="utf-8"><link rel="stylesheet" href="/vendor/fonts/fonts.css"><style>
      html, body { margin: 0; } body { width: 1080px; height: 1080px; background: #fff; color: #000; font-family: "Instrument Sans", system-ui, sans-serif; position: relative; overflow: hidden; }
      .k { position: absolute; left: 80px; right: 80px; top: 80px; bottom: 80px; display: flex; flex-direction: column; }
      .kicker { font-size: 26px; color: #6f6f6f; }
      .titel { font-size: 84px; font-weight: 500; letter-spacing: -0.025em; line-height: 1; margin-top: 22px; }
      .satz { font-family: "Newsreader", Georgia, serif; font-style: italic; font-size: 50px; line-height: 1.22; margin-top: 36px; max-width: 22ch; }
      .unten { margin-top: auto; display: flex; justify-content: space-between; align-items: flex-end; }
      .fuss { display: flex; align-items: center; gap: 14px; font-size: 28px; font-weight: 500; }
    </style></head><body><div class="k">
      <div class="kicker">${esc(W[sprache].zettel(s))}</div>
      <div class="titel">${esc(s.title)}</div>
      <div class="satz">${esc(s.bottom_line)}</div>
      <div class="unten"><div class="fuss">${signet}<span>${esc(W[sprache].fuss)}</span></div>${feldSvg({ hier: s.number, nah: nahe(s), gross: 1.1 })}</div>
    </div></body></html>`, { waitUntil: "load" });
    await page.evaluate(() => document.fonts.ready);
    writeFileSync(new URL(`zettel-${s.slug}-karte.png`, AUS), await page.screenshot({ type: "png" }));
    n++;
  }
  process.stdout.write(`${pfad || "/"} `);
}
}
if (NUR_ALT || !SPRACHEN.length) {
  process.stdout.write("\nalt: ");
  await page.setViewportSize({ width: 1200, height: 630 });
  for (const k of ALT.filter((a) => a.datei.includes(filter))) {
    await page.setContent(k.html || seiteHtml({ lang: "de", breite: 1200, hoehe: 630, feld: feldSvg(), ...k }), { waitUntil: "load" });
    await page.evaluate(() => document.fonts.ready);
    const datei = new URL(k.datei, ROOT); mkdirSync(new URL("./", datei), { recursive: true });
    writeFileSync(datei, await page.screenshot({ type: "png" }));
    if (statSync(datei).size > 300 * 1024) gross.push(k.datei);
    n++; process.stdout.write(`${k.datei} `);
  }
}
await browser.close(); server.close();
console.log(`\n${n} Karten geschrieben${gross.length ? `; über 300 KB: ${gross.join(", ")}` : ""}`);
