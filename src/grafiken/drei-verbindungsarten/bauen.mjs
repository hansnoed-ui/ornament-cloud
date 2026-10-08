// Erzeugt drei-verbindungsarten.png (3200 × 4000) und drei-verbindungsarten-1600.jpg (1600 × 2000).
// Die Zwischen-HTML liegt im Temp-Ordner (nicht im Repo: tests/navigation.test.mjs prüft jede HTML-Datei).
//   NODE_PATH=$(npm root -g) node src/grafiken/drei-verbindungsarten/bauen.mjs
// Der Text steht wörtlich in TEXT; die Figuren entstehen aus wenigen Zahlen (siehe unten).
import { mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import { join } from "node:path";
import { execFileSync } from "node:child_process";

const require = createRequire(import.meta.url);
let playwright;
try { playwright = require("playwright"); } catch { playwright = require(join(process.env.NODE_PATH || "", "playwright")); }

const HIER = fileURLToPath(new URL("./", import.meta.url));
const SCHRIFTEN = fileURLToPath(new URL("../../../vendor/fonts/fonts.css", import.meta.url));
const W = 1600, H = 2000;

const FARBE = { papier: "#f7f7f4", tinte: "#1b2233", grau: "#5d6470", haar: "#d4d5d0", luhmann: "#1c4a9e", barad: "#c2410c" };

const REIHEN = [
  { art: "Gleich", sinn: ["dieselbe Aussage", "in zwei Vokabularen"],
    l: { name: "Quasi-Objekt", sub: "König, Fussball, Kunstwerk", zitat: ["«… durch Beobachtung anderer", "Beobachter mit Hilfe", "desselben Objekts»"] },
    r: { name: "Feste Teile", sub: "Photoplatte, Versuchsanordnung", zitat: ["«reproducible and", "unambiguously communicable»"] },
    satz: ["Gemeinsame Kontrolle braucht ein Ding, das stillhält."] },
  { art: "Nahe", sinn: ["gleicher Mechanismus,", "entgegengesetzte Folge"],
    l: { name: "Wiederverwendung", sub: "Kondensation und Konfirmation", zitat: ["«in einem etwas anderen", "Kontext (zumindest:", "zeitlich später)»"] },
    r: { name: "Offene Apparate", sub: "jede Iteration verschiebt sie", zitat: ["«Boundaries do not sit still.»"] },
    satz: ["Dieselbe Schleife – sie hält die Identität fest,", "sie löst die Grenze auf."] },
  { art: "Ergänzt", sinn: ["jede Seite füllt", "die Lücke der anderen"],
    l: { name: "Medium und Form", sub: "der Vorrat, unverbraucht", zitat: ["«nur an den Formen und nicht", "als solches beobachtet", "werden»"] },
    r: { name: "Markierung", sub: "die Spur im Material", zitat: ["«sedimented out and enfolded", "in further materializations»"] },
    satz: ["Er kann die Veränderung des Trägers nicht sehen,", "sie kann die Spur nicht wiedererkennen."] },
];

// Zeilenraster
const X = { rand: 110, schiene: 110, links: 356, linksEnde: 722, mitte: 928, rechts: 1134, rechtsEnde: 1490 };
const KOPF_UNTEN = 432, ZEILE = 462, C_OFFSET = 176; // Mitte der Figur: Zeilenanfang + C_OFFSET

const f = (n) => Math.round(n * 100) / 100;
const esc = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;");

// ---- Figuren (Ursprung = Mitte der Figur) ----
const R = 100; // Radius des Rings

function gleich() {
  // eine Grenze, zwei Striche: genau übereinander, innen Luhmann, aussen Barad; in der Mitte das Ding, das stillhält
  return `
    <circle r="${R - 3.5}" fill="none" stroke="${FARBE.luhmann}" stroke-width="7"/>
    <circle r="${R + 3.5}" fill="none" stroke="${FARBE.barad}" stroke-width="7"/>
    <circle r="9" fill="${FARBE.tinte}"/>`;
}

function nahe() {
  // dieselbe Schleife, sechs Durchläufe. Luhmann: jedes Mal in einem «etwas anderen Kontext» (Schwankung unter 1°),
  // die Linien verdichten sich zu einer. Barad: jedes Mal um 13° weitergerückt, die Grenze wandert.
  const rx = 132, ry = 62, n = 6;
  const schleife = `<ellipse id="schleife" rx="${rx}" ry="${ry}" fill="none" stroke="currentColor" stroke-width="3.6"/>`;
  const schwanken = [0, 0.9, -0.7, 0.5, -1, 0.35];
  let blau = "", orange = "";
  for (let k = 0; k < n; k++) {
    blau += `<use href="#schleife" color="${FARBE.luhmann}" opacity=".34" transform="rotate(${schwanken[k]})"/>`;
    if (k > 0) orange += `<use href="#schleife" color="${FARBE.barad}" opacity=".55" transform="rotate(${k * 13})"/>`;
  }
  return `<defs>${schleife}</defs>${orange}${blau}<circle r="6" fill="${FARBE.tinte}"/>`;
}

function ergaenzt() {
  // ein Ring aus Luhmann- und Barad-Stücken: wo die eine Seite Lücke hat, steht die andere
  const stuecke = [26, 11, 17, 31, 9, 19, 14, 24, 10, 21, 13, 27, 12, 18, 33, 15, 16, 20, 11, 24, 12, 7]; // Grad, abwechselnd
  const faktor = 360 / stuecke.reduce((a, b) => a + b, 0);
  let winkel = -90 - stuecke[0] * faktor / 2, svg = "";
  stuecke.forEach((g, i) => {
    const a0 = winkel, a1 = winkel + g * faktor; winkel = a1;
    const farbe = i % 2 === 0 ? FARBE.luhmann : FARBE.barad;
    const p = (a) => [Math.cos((a * Math.PI) / 180) * R, Math.sin((a * Math.PI) / 180) * R];
    const [x0, y0] = p(a0 + .7), [x1, y1] = p(a1 - .7);
    svg += `<path d="M${f(x0)},${f(y0)} A${R},${R} 0 ${g * faktor > 180 ? 1 : 0} 1 ${f(x1)},${f(y1)}" fill="none" stroke="${farbe}" stroke-width="16"/>`;
  });
  return svg;
}

const FIGUREN = [gleich, nahe, ergaenzt];

// Leitlinie von der Seite zur Figur (endet knapp vor der Figur)
const LEIT = [[R + 23, R + 23], [152, 152], [R + 24, R + 24]];

function reihe(r, i) {
  const y0 = KOPF_UNTEN + i * ZEILE, c = y0 + C_OFFSET;
  const [ll, lr] = LEIT[i];
  const seite = (t, farbe, x, anker) => `
    <text x="${x}" y="${c + 13}" text-anchor="${anker}" class="term" fill="${farbe}" style="fill:${farbe}">${esc(t.name)}</text>
    <text x="${x}" y="${c + 49}" text-anchor="${anker}" class="sub">${esc(t.sub)}</text>
    ${t.zitat.map((z, k) => `<text x="${x}" y="${c + 94 + k * 32}" text-anchor="${anker}" class="zitat">${esc(z)}</text>`).join("")}`;
  return `
  <g>
    <line x1="${X.rand}" x2="${X.rechtsEnde}" y1="${y0}" y2="${y0}" stroke="${FARBE.haar}" stroke-width="1.5"/>
    <text x="${X.schiene}" y="${y0 + 86}" class="art">${esc(r.art)}</text>
    ${r.sinn.map((t, k) => `<text x="${X.schiene}" y="${y0 + 124 + k * 27}" class="sinn">${esc(t)}</text>`).join("")}
    <line x1="${X.linksEnde + 14}" x2="${X.mitte - ll}" y1="${c}" y2="${c}" stroke="${FARBE.luhmann}" stroke-width="2"/>
    <line x1="${X.mitte + lr}" x2="${X.rechts - 14}" y1="${c}" y2="${c}" stroke="${FARBE.barad}" stroke-width="2"/>
    <circle cx="${X.mitte - ll}" cy="${c}" r="4.5" fill="${FARBE.luhmann}"/>
    <circle cx="${X.mitte + lr}" cy="${c}" r="4.5" fill="${FARBE.barad}"/>
    <g transform="translate(${X.mitte} ${c})">${FIGUREN[i]()}</g>
    ${seite(r.l, FARBE.luhmann, X.linksEnde, "end")}
    ${seite(r.r, FARBE.barad, X.rechts, "start")}
    ${r.satz.map((t, k) => `<text x="${X.mitte}" y="${c + 214 + k * 39}" text-anchor="middle" class="satz">${esc(t)}</text>`).join("")}
  </g>`;
}

const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" role="img"
  aria-label="Drei Arten von Verbindung zwischen Luhmann und Barad: gleich (Quasi-Objekt und Feste Teile), nahe (Wiederverwendung und Offene Apparate), ergänzt (Medium und Form und Markierung).">
  <title>Drei Arten von Verbindung – Luhmann und Barad</title>
  <defs>
    <style>
      text { font-family: "Instrument Sans", system-ui, sans-serif; fill: ${FARBE.tinte}; }
      .titel { font-family: Newsreader, Georgia, serif; font-weight: 300; font-size: 108px; letter-spacing: -2px; font-variation-settings: "opsz" 72; }
      .frage { font-family: Newsreader, Georgia, serif; font-style: italic; font-weight: 400; font-size: 38px; fill: ${FARBE.grau}; }
      .lead { font-size: 27px; fill: ${FARBE.grau}; }
      .kopf { font-family: Newsreader, Georgia, serif; font-style: italic; font-weight: 500; font-size: 34px; }
      .kopfgrau { font-size: 21px; fill: ${FARBE.grau}; letter-spacing: .3px; }
      .art { font-family: Newsreader, Georgia, serif; font-weight: 400; font-size: 62px; letter-spacing: -.5px; font-variation-settings: "opsz" 60; }
      .sinn { font-size: 21px; fill: ${FARBE.grau}; }
      .term { font-weight: 600; font-size: 36px; letter-spacing: -.2px; }
      .sub { font-size: 23px; fill: ${FARBE.grau}; }
      .zitat { font-family: Newsreader, Georgia, serif; font-style: italic; font-weight: 400; font-size: 25.5px; fill: ${FARBE.tinte}; }
      .satz { font-family: Newsreader, Georgia, serif; font-weight: 400; font-size: 33px; }
      .fuss { font-size: 18px; fill: ${FARBE.grau}; }
    </style>
  </defs>
  <rect width="${W}" height="${H}" fill="${FARBE.papier}"/>

  <text x="${X.rand}" y="178" class="titel">Drei Arten von Verbindung</text>
  <text x="${X.rand}" y="238" class="frage">Luhmann und Barad: wo sich die Operationen verbinden lassen</text>
  <text x="${X.rand}" y="296" class="lead">Jede Verbindung ist an der Prüffrage begründet, auf der sie beruht,</text>
  <text x="${X.rand}" y="332" class="lead">nicht an der Stelle, an der die beiden im Diagramm landen.</text>

  <!-- Spaltenköpfe: links Luhmann, rechts Barad, Mitte beide zusammengelegt -->
  <text x="${X.linksEnde}" y="402" text-anchor="end" class="kopf" fill="${FARBE.luhmann}" style="fill:${FARBE.luhmann}">Luhmann</text>
  <text x="${X.rechts}" y="402" class="kopf" style="fill:${FARBE.barad}">Barad</text>
  <text x="${X.mitte}" y="402" text-anchor="middle" class="kopfgrau">beide zusammengelegt</text>

  ${REIHEN.map(reihe).join("\n")}

  <line x1="${X.rand}" x2="${X.rechtsEnde}" y1="1818" y2="1818" stroke="${FARBE.haar}" stroke-width="1.5"/>
  <text x="${X.rand}" y="1860" class="fuss">Luhmann, Die Kunst der Gesellschaft (1995), S. 81 und 170; Die Gesellschaft der Gesellschaft (1997), S. 143</text>
  <text x="${X.rand}" y="1888" class="fuss">Barad, Signs 28/3 (2003), S. 817 und 823; Feminism, Science, and the Philosophy of Science (1996), S. 181</text>
  <text x="${X.rand}" y="1930" class="fuss">Prüfraster Nebeneinander · Nacheinander, Fassung 3.2.0 – Register Begriff</text>
</svg>`;

const html = `<!doctype html>
<html lang="de"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Drei Arten von Verbindung</title>
<link rel="stylesheet" href="file://${SCHRIFTEN}">
<style>html,body{margin:0;background:${FARBE.papier}}svg{display:block;width:100%;height:auto;max-width:${W}px;margin:0 auto}</style>
</head><body>
${svg}
</body></html>`;

const zwischen = join(await mkdtemp(join(tmpdir(), "verbindungsarten-")), "index.html");
await writeFile(zwischen, html);

const browser = await playwright.chromium.launch();
const page = await browser.newPage({ viewport: { width: W, height: H }, deviceScaleFactor: 2, colorScheme: "light" });
await page.goto("file://" + zwischen);
await page.evaluate(() => document.fonts.ready);
await page.waitForTimeout(300);
await page.screenshot({ path: join(HIER, "drei-verbindungsarten.png"), clip: { x: 0, y: 0, width: W, height: H } });
await browser.close();

// JPG für Messenger und Social Media (Pillow)
execFileSync("python3", ["-c", `from PIL import Image
im = Image.open(${JSON.stringify(join(HIER, "drei-verbindungsarten.png"))}).convert("RGB").resize((1600, 2000), Image.LANCZOS)
im.save(${JSON.stringify(join(HIER, "drei-verbindungsarten-1600.jpg"))}, quality=92)`]);
console.log("fertig");
