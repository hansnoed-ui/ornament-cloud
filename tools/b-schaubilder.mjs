// Schaubilder des Neubaus (13. November 2026, Wunsch von Christian: «Erst principessa als website referenz und gamma», «Das Dritte Rad und OMNA COLOR
// scheinen mir gelungene Bereiche zum zeigen», «visuelles scheint mir zugänglicher»): Bildschirmfotos von vier Seiten, 1280 × 800, als JPEG nach
// b/bilder/schau/<name>.jpg. Gamma, Das Dritte Rad und OMNA COLOR kommen aus diesem Repository; Principesse aus dem Repository hansnoed-ui/principessa
// (principesse.ch), dessen Ordner mit PRINCIPESSE=<pfad> anzugeben ist – ohne ihn bleibt das vorhandene Bild stehen.
//
//   NODE_PATH=$(npm root -g) node tools/b-schaubilder.mjs                                   Gamma, Das Dritte Rad, OMNA COLOR
//   PRINCIPESSE=../principessa NODE_PATH=$(npm root -g) node tools/b-schaubilder.mjs        alle vier
//   NODE_PATH=$(npm root -g) node tools/b-schaubilder.mjs gamma                             einzelne
import { createServer } from "node:http";
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { extname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
let playwright;
try { playwright = require("playwright"); } catch { playwright = require(join(process.env.NODE_PATH || "", "playwright")); }

const ROOT = fileURLToPath(new URL("../", import.meta.url));
const AUS = join(ROOT, "b/bilder/schau"); mkdirSync(AUS, { recursive: true });
const types = { ".html": "text/html", ".css": "text/css", ".js": "text/javascript", ".mjs": "text/javascript", ".json": "application/json", ".woff2": "font/woff2", ".jpg": "image/jpeg", ".png": "image/png", ".webp": "image/webp", ".svg": "image/svg+xml", ".mp4": "video/mp4" };
const diene = (wurzel) => new Promise((ok) => { const s = createServer((req, res) => { let p = decodeURIComponent(new URL(req.url, "http://x").pathname); if (p.endsWith("/")) p += "index.html"; let body; try { body = readFileSync(join(wurzel, p)); } catch { res.writeHead(404).end(); return; } res.writeHead(200, { "content-type": types[extname(p)] || "application/octet-stream" }).end(body); }).listen(0, () => ok(s)); });

// warten: Zeit, bis die Seite ihr Bild hat; rollen: so weit nach unten (Principesse: der Film läuft beim Rollen bis zum Spaziergang)
export const SCHAUBILDER = [
  { name: "gamma", pfad: "gamma/", warten: 4000 },
  // Das Dritte Rad und OMNA COLOR näher (13. November 2026: im grossen Fenster stand das Rad klein auf viel Fläche): ein Fenster von 800 × 500, 1,6-fach
  // aufgenommen, gibt dasselbe Mass von 1280 × 800 mit dem Rad gross im Bild
  { name: "drittes-rad", pfad: "beta/drittes-rad/", warten: 4000, fenster: [800, 500], faktor: 1.6 },
  { name: "omna-color", pfad: "alpha/omna-color/?sprache=de&b=1", warten: 4000, fenster: [800, 500], faktor: 1.6, rollen: 110 },
  // Multiverse als Website-Referenz (13. November 2026, Christian: «und auch noch: Multiverse»)
  { name: "multiverse", pfad: "multiverse/", warten: 6000 },
  { name: "principesse", fremd: "PRINCIPESSE", pfad: "", warten: 9000, rollen: 900 },
];

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const nur = process.argv.slice(2);
  const browser = await playwright.chromium.launch({ args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader"] });
  for (const b of SCHAUBILDER) {
    if (nur.length && !nur.includes(b.name)) continue;
    const wurzel = b.fremd ? process.env[b.fremd] && resolve(process.env[b.fremd]) : ROOT;
    if (!wurzel) { console.log(`${b.name}: übersprungen (${b.fremd}=<pfad> fehlt)`); continue; }
    const server = await diene(wurzel);
    const [fb, fh] = b.fenster || [1280, 800];
    const seite = await browser.newPage({ viewport: { width: fb, height: fh }, deviceScaleFactor: b.faktor || 1, colorScheme: "dark" });
    await seite.goto(`http://localhost:${server.address().port}/${b.pfad}`, { waitUntil: "load" });
    await seite.waitForTimeout(b.warten);
    if (b.rollen) { await seite.evaluate((y) => window.scrollTo(0, y), b.rollen); await seite.waitForTimeout(1500); }
    writeFileSync(join(AUS, `${b.name}.jpg`), await seite.screenshot({ type: "jpeg", quality: 82 }));
    await seite.close(); server.close();
    console.log(`b/bilder/schau/${b.name}.jpg`);
  }
  await browser.close();
}
