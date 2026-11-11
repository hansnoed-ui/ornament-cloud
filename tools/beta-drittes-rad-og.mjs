// Vorschaukarte für beta/drittes-rad/ (28. Oktober 2026): die Bühne der Seite selbst, 1200 × 630, mit einem festen Stand (Farbe «Linie», Orange),
// ohne Leiste und Knöpfe. Braucht einen Server an der Wurzel des Repositorys (z. B. py -m http.server 8765) und Playwright:
//   NODE_PATH=$(npm root -g) node tools/beta-drittes-rad-og.mjs [http://localhost:8765/]   → beta/drittes-rad/og-drittes-rad.jpg
import { createRequire } from "node:module";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
const { chromium } = createRequire(import.meta.url)(join(process.env.NODE_PATH ?? "", "playwright"));
const basis = process.argv[2] ?? "http://localhost:8765/";
const STAND = "?t=33-das-publikum~marina-abramovic__lucy-suchman~063~1~4";   // Strophe 33, Abramović × Suchman, Übung 063, Farbe 1 (Linie), Zeichen 4
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 1200, height: 630 }, reducedMotion: "reduce" });   // ohne Intro und ohne Übergänge
await p.goto(`${basis}beta/drittes-rad/${STAND}`);
await p.waitForFunction(() => window.radGeladen);
await p.addStyleTag({ content: `
  .leiste, .knoepfe { display: none !important; }
  .buehne { min-height: 630px !important; height: 630px; padding: 40px 56px !important; grid-template-columns: minmax(0, 6fr) minmax(0, 5fr) !important; }
  h1 { font-size: 132px !important; } .sagt { font-size: 23px !important; max-width: 25ch !important; }
  .adresse { margin: 0; font: 500 20px/1 var(--sans); opacity: .8; }
  .wheel { width: 540px !important; min-width: 0 !important; }` });
await p.evaluate(() => { scrollTo(0, 0); const a = document.createElement("p"); a.className = "adresse"; a.textContent = "ornament.cloud/beta/drittes-rad"; document.querySelector(".text").append(a); });
await p.waitForTimeout(300);
const ziel = fileURLToPath(new URL("../beta/drittes-rad/og-drittes-rad.jpg", import.meta.url));
await p.screenshot({ path: ziel, type: "jpeg", quality: 88, clip: { x: 0, y: 0, width: 1200, height: 630 } });
await b.close();
console.log("→", ziel);
