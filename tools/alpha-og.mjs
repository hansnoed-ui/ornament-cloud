// Erzeugt die Vorschaubilder der Grundlagenpapiere im Alpha-Bereich (Open Graph / X-Karte, 1200 × 630).
// Links Titel und Untertitel, rechts das Vierfeld des jeweiligen Papiers (zwei Achsen, vier Felder), ein Feld
// dunkel hervorgehoben – wie in der Abbildung des Papiers.
//
//   NODE_PATH=$(npm root -g) node tools/alpha-og.mjs
//     → alpha/pruefraster/og-pruefraster.png, alpha/verteilapparat/og-verteilapparat.png,
//       alpha/gesellschaftskonzepte/og-gesellschaftskonzepte.png
//
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";
import { join } from "node:path";

const require = createRequire(import.meta.url);
let playwright;
try { playwright = require("playwright"); } catch { playwright = require(join(process.env.NODE_PATH || "", "playwright")); }

const SERIF = `"Iowan Old Style", "Palatino Linotype", Palatino, "Book Antiqua", Georgia, serif`;
const SANS = `system-ui, "Helvetica Neue", Arial, sans-serif`;

// felder: oben links, oben rechts, unten links, unten rechts (je Zeilen eines Namens); dunkel: Index des betonten Feldes
const KARTEN = [
  { out: "../alpha/pruefraster/og-pruefraster.png", titel: "Prüfraster: Nebeneinander und Nacheinander",
    unter: "Verräumlichung und Verzeitlichung als Achsen für die Ordnung von Theorien, Kunstpraxen und weiteren Ansätzen",
    adresse: "ornament.cloud/alpha/pruefraster", x: "VERRÄUMLICHUNG →", y: "VERZEITLICHUNG →",
    felder: [["Ereignis"], ["Doppelspalt"], ["Stilles", "Operieren"], ["Ordnung"]], dunkel: 1 },
  { out: "../alpha/verteilapparat/og-verteilapparat.png", titel: "Der Verteilapparat des Körpers",
    unter: "Wessen Körperereignis wie weit kommt, unter welcher Beschreibung, wer sie berichtigen kann und was daraus materiell folgt",
    adresse: "ornament.cloud/alpha/verteilapparat", x: "SELBSTBESCHREIBUNG →", y: "FREMDERFASSUNG →",
    felder: [["Ausgeliefert-", "sein"], ["Verhandelbare", "Teilhabe"], ["Verschwinden"], ["Privilegierte", "Opazität"]], dunkel: 0 },
  // Typologie des Papiers: oben mehrere eigenständige Operationen, unten eine Hauptoperation; links Vermittlung als Verfahren,
  // rechts durch Ersatzform. Betont ist «Tragfähige Beschreibung».
  { out: "../alpha/gesellschaftskonzepte/og-gesellschaftskonzepte.png", titel: "Prüfraster für Gesellschaftskonzepte",
    unter: "Einheit · Operation · Vermittlung: Kann ein Ansatz sagen, wie aus einer Absicht eine Wirkung wird?",
    adresse: "ornament.cloud/alpha/gesellschaftskonzepte", x: "VERFAHREN → ERSATZFORM", y: "EINE → MEHRERE OPERATIONEN",
    felder: [["Tragfähige", "Beschreibung"], ["Panorama"], ["Milieu-", "beschreibung"], ["Programm"]], dunkel: 0, titelGroesse: 56 },
];

const esc = s => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;");
const feldText = (zeilen, x, y, hell) => zeilen.map((z, i) =>
  `<text class="feld" x="${x}" y="${y + 8 + (i - (zeilen.length - 1) / 2) * 28}" text-anchor="middle"${hell ? ' style="fill:#f8f8f6"' : ""}>${esc(z)}</text>`).join("");

function html(k) {
  const pos = [[90, 90], [270, 90], [90, 270], [270, 270]];
  const [dx, dy] = [[0, 0], [180, 0], [0, 180], [180, 180]][k.dunkel];
  return `<!DOCTYPE html><html lang="de"><head><meta charset="utf-8"><style>
  html, body { margin: 0; width: 1200px; height: 630px; background: #f8f8f6; color: #1f1d1a; }
  .k { position: relative; width: 1200px; height: 630px; box-sizing: border-box; padding: 80px 88px; }
  .ober { margin: 0; font: 600 18px/1 ${SANS}; letter-spacing: 0.16em; text-transform: uppercase; color: #c2410c; }
  h1 { margin: 26px 0 0; width: 560px; font: 400 68px/1.04 ${SERIF}; }
  .unter { margin: 24px 0 0; width: 520px; font: 400 25px/1.36 ${SERIF}; color: #6b665e; }
  .fuss { position: absolute; left: 88px; bottom: 70px; margin: 0; font: 400 20px/1 ${SANS}; letter-spacing: 0.05em; color: #1f1d1a; }
  .fuss span { color: #6b665e; }
  svg { position: absolute; right: 88px; top: 124px; width: 370px; height: 370px; overflow: visible; }
  .lab { font: 500 13px ${SANS}; letter-spacing: 0.14em; fill: #6b665e; }
  .feld { font: 400 24px ${SERIF}; fill: #1f1d1a; }
</style></head><body><div class="k">
  <p class="ober">Grundlagenpapier · Anwendungsprompt</p>
  <h1${k.titelGroesse ? ` style="font-size:${k.titelGroesse}px"` : ""}>${esc(k.titel)}</h1>
  <p class="unter">${esc(k.unter)}</p>
  <p class="fuss">Christian Strickler · <span>${esc(k.adresse)}</span></p>
  <svg viewBox="0 0 360 360">
    <rect x="${dx}" y="${dy}" width="180" height="180" fill="#1f1d1a"/>
    <rect x="0" y="0" width="360" height="360" fill="none" stroke="#1f1d1a" stroke-width="1.5"/>
    <line x1="180" y1="0" x2="180" y2="360" stroke="#1f1d1a" stroke-width="1"/>
    <line x1="0" y1="180" x2="360" y2="180" stroke="#1f1d1a" stroke-width="1"/>
    ${k.felder.map((z, i) => feldText(z, pos[i][0], pos[i][1], i === k.dunkel)).join("")}
    <text class="lab" x="180" y="392" text-anchor="middle">${esc(k.x)}</text>
    <text class="lab" x="-22" y="180" text-anchor="middle" transform="rotate(-90 -22 180)">${esc(k.y)}</text>
  </svg>
</div></body></html>`;
}

const browser = await playwright.chromium.launch();
const page = await browser.newPage({ viewport: { width: 1200, height: 630 }, deviceScaleFactor: 1, colorScheme: "light" });
for (const k of KARTEN) {
  const out = fileURLToPath(new URL(k.out, import.meta.url));
  await page.setContent(html(k));
  await page.screenshot({ path: out });
  console.log(`Vorschaubild → ${out}`);
}
await browser.close();
