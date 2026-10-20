// Neubau /b/: die Bilder der sieben Apps (20. Oktober 2026, Wunsch von Christian: «Die Beitragsbilder bzw. Karten für die Apps möchte ich alle
// stilvoll re-designt, nicht dieses farbige Durcheinander. Gerne die eine oder andere Farbe, aber alles stilisiert, zur Seite passend.»).
// Sieben Tafeln, 1200 × 1200, als SVG geschrieben (scharf in jeder Grösse, wenige Kilobyte): das Ruhebild der Tafeln aus src/b/tafeln.mjs,
// die auf den App-Seiten auch in Bewegung zu sehen sind (b/tafeln-leben.js). Jede Tafel hell und dunkel (echte Umkehr, wie die Seite;
// die Seite wählt mit <picture> nach prefers-color-scheme). Nur OMNA COLOR trägt Farbe – dort ist Farbe der Inhalt.
//
//   node tools/b-app-bilder.mjs                                   alle nach b/bilder/apps/<slug>.svg und <slug>-dunkel.svg
//   node tools/b-app-bilder.mjs phorma                            nur Apps, deren Kennung so beginnt
//   NODE_PATH=$(npm root -g) node tools/b-app-bilder.mjs --png    zusätzlich PNG-Abzüge zum Anschauen (Playwright), nicht eingecheckt
import { writeFileSync, mkdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";
import { TAFELN, svg, W } from "../src/b/tafeln.mjs";

export { TAFELN, svg };

const require = createRequire(import.meta.url);
const AUS = new URL("../b/bilder/apps/", import.meta.url);

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  mkdirSync(AUS, { recursive: true });
  const argv = process.argv.slice(2);
  const png = argv.includes("--png");
  const filter = argv.find((a) => !a.startsWith("--")) || "";
  const slugs = Object.keys(TAFELN).filter((s) => s.startsWith(filter));
  for (const slug of slugs) for (const dunkel of [false, true]) {
    const datei = new URL(`${slug}${dunkel ? "-dunkel" : ""}.svg`, AUS);
    writeFileSync(datei, svg(slug, dunkel));
    console.log(`${slug}${dunkel ? " dunkel" : ""}: ${Math.round(statSync(datei).size / 1024)} KB`);
  }
  if (png) {
    let playwright;
    try { playwright = require("playwright"); } catch { playwright = require(join(process.env.NODE_PATH || "", "playwright")); }
    const browser = await playwright.chromium.launch();
    const page = await browser.newPage({ viewport: { width: W, height: W }, deviceScaleFactor: 1 });
    const vorschau = new URL("vorschau/", AUS); mkdirSync(vorschau, { recursive: true });
    for (const slug of slugs) for (const dunkel of [false, true]) {
      await page.setContent(`<!doctype html><html><body style="margin:0">${svg(slug, dunkel)}</body></html>`);
      await page.screenshot({ path: fileURLToPath(new URL(`${slug}${dunkel ? "-dunkel" : ""}.png`, vorschau)), clip: { x: 0, y: 0, width: W, height: W } });
    }
    await browser.close();
    console.log("PNG-Abzüge in b/bilder/apps/vorschau/ (nicht einchecken)");
  }
}
