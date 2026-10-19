// «OMNA COLOR» – App-Symbole (Wunsch vom 19. Oktober 2026: OMNA COLOR von «Web» nehmen, «sowohl als APP wie als Web-Anwendung bauen und bei den APPs
// (als letzte) unterbringen»). Motiv: das Rad selbst, mit derselben Geometrie wie in alpha/omna-color/index.html (Entwurf A «Flach & präzise»: satte Felder,
// durchsichtige Fugen, die Ringe durch Luft getrennt, Zeiger als Nadel), aussen und innen gegeneinander verdreht, in der Mitte die Mischfarbe der beiden Themen unter den Nadeln (Farbe und Zufall),
// auf dem Grund des dunklen Modus der Seite (#12141b).
//   alpha/omna-color/icons/icon-512.png            512 × 512   Android, Installation («any»)
//   alpha/omna-color/icons/icon-192.png            192 × 192   Android, Browser
//   alpha/omna-color/icons/icon-maskable-512.png   512 × 512   Android, maskierbar (Rad kleiner, ohne Nadel – das System schneidet zu)
//   alpha/omna-color/icons/apple-touch-icon.png    180 × 180   iPhone und iPad (Startbildschirm)
//   alpha/omna-color/icons/favicon-32.png           32 × 32    Symbol im Browser-Tab (nur das Rad)
//   assets/vorschau-omna-color-app.jpg              640 × 800   Vorschaukachel der Karte auf «Apps»: das App-Symbol als Kachel über einem grossen, leisen Rad
//   alpha/omna-color/app/og-omna-color-app.jpg      1200 × 630  Vorschaukachel der App-Seite zum Teilen (Open Graph, X)
//
//   NODE_PATH=$(npm root -g) node tools/omna-icons.mjs
import { mkdirSync } from "node:fs";
import { createRequire } from "node:module";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
let playwright;
try { playwright = require("playwright"); } catch { playwright = require(join(process.env.NODE_PATH || "", "playwright")); }
const { startServer } = await import(new URL("./serve-orma.mjs", import.meta.url).href);
const server = await startServer(0);
const base = `http://localhost:${server.address().port}/`;
const browser = await playwright.chromium.launch();
for (const ordner of ["../alpha/omna-color/icons/", "../alpha/omna-color/app/"]) mkdirSync(fileURLToPath(new URL(ordner, import.meta.url)), { recursive: true });

// wie in der Seite (THEMES, feld(), Radien 66–104 und 30–60, Fuge 1.6)
const FARBEN = ["#b3304d", "#d9782d", "#e4b83c", "#4f8a5b", "#3f6ba8", "#4e4a94", "#85508f"];
const GRUND = "#12141b", INK = "#efe3c6";

/** das Rad als SVG (viewBox wie in der Seite); aussen/innen: Drehung in Grad; nadel: Zeiger oben */
export function rad({ aussen = -25.7, innen = 77.1, nadel = true, mitte = [0, 5] } = {}) {
  const S = 360 / FARBEN.length, FUGE = 1.6;
  const pt = (r, deg) => { const a = deg * Math.PI / 180; return [r * Math.sin(a), -r * Math.cos(a)]; };
  const feld = (r1, r2, a0, a1) => {
    const d = (r) => Math.asin(FUGE / 2 / r) * 180 / Math.PI;
    const [x1, y1] = pt(r2, a0 + d(r2)), [x2, y2] = pt(r2, a1 - d(r2)), [x3, y3] = pt(r1, a1 - d(r1)), [x4, y4] = pt(r1, a0 + d(r1));
    return `M${x1} ${y1} A${r2} ${r2} 0 0 1 ${x2} ${y2} L${x3} ${y3} A${r1} ${r1} 0 0 0 ${x4} ${y4} Z`;
  };
  const ring = (r1, r2) => FARBEN.map((c, i) => `<path d="${feld(r1, r2, i * S, (i + 1) * S)}" fill="${c}"/>`).join("");
  const hex = (c) => [1, 3, 5].map((i) => parseInt(c.slice(i, i + 2), 16));
  const misch = `rgb(${hex(FARBEN[mitte[0]]).map((v, i) => Math.round((v + hex(FARBEN[mitte[1]])[i]) / 2)).join(",")})`;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="-112 -120 224 232">
    <g transform="rotate(${aussen})">${ring(66, 104)}</g>
    <g transform="rotate(${innen})">${ring(30, 60)}</g>
    <circle r="22" fill="${misch}" stroke="${INK}" stroke-width=".6"/>
    ${nadel ? `<path d="M 0 -118 V -100" stroke="${INK}" stroke-width="2.2" stroke-linecap="round" fill="none"/><path d="M 0 -66 V -55" stroke="${INK}" stroke-width="1.8" stroke-linecap="round" fill="none"/>` : ""}
  </svg>`;
}

/** n × n Pixel; anteil: Breite des Rads im Verhältnis zur Seite */
async function symbol(n, anteil, nadel, ziel) {
  const page = await browser.newPage({ viewport: { width: n, height: n }, deviceScaleFactor: 1 });
  const w = n * anteil;
  await page.setContent(`<!DOCTYPE html><html><head><style>
    html, body { margin: 0; width: ${n}px; height: ${n}px; overflow: hidden; background: radial-gradient(circle at 50% 46%, #1e2130 0, ${GRUND} 70%); }
    svg { position: absolute; left: ${(n - w) / 2}px; top: ${(n - w * 232 / 224) / 2 + (nadel ? 0 : n * 0.012)}px; width: ${w}px; height: ${w * 232 / 224}px; }
  </style></head><body>${rad({ nadel })}</body></html>`);
  const out = fileURLToPath(new URL(ziel, import.meta.url));
  await page.screenshot({ path: out, type: "png" });
  console.log("geschrieben:", out);
  await page.close();
}

await symbol(512, 0.74, true, "../alpha/omna-color/icons/icon-512.png");
await symbol(192, 0.74, true, "../alpha/omna-color/icons/icon-192.png");
await symbol(512, 0.62, false, "../alpha/omna-color/icons/icon-maskable-512.png");   // sichere Zone: Kreis mit 80 % Durchmesser
await symbol(180, 0.76, true, "../alpha/omna-color/icons/apple-touch-icon.png");
await symbol(32, 0.98, false, "../alpha/omna-color/icons/favicon-32.png");

const KACHEL = `box-shadow: 0 0 0 1px rgba(239,227,198,0.16), 0 30px 80px rgba(0,0,0,0.6); background: url(alpha/omna-color/icons/icon-512.png) center / cover;`;

// Vorschaukachel für «Apps»: das App-Symbol als Kachel über einem grossen, leisen Rad
{
  const page = await browser.newPage({ viewport: { width: 640, height: 800 }, deviceScaleFactor: 1 });
  await page.setContent(`<!DOCTYPE html><html><head><base href="${base}"><style>
    html, body { margin: 0; width: 640px; height: 800px; overflow: hidden; background: ${GRUND}; }
    .gross { position: absolute; left: -150px; top: 30px; width: 940px; height: 974px; opacity: 0.26; filter: blur(2px) saturate(1.1); }
    .schleier { position: absolute; inset: 0; background: radial-gradient(circle at 50% 50%, rgba(18,20,27,0.85) 0, rgba(18,20,27,0.5) 230px, rgba(18,20,27,0.1) 440px); }
    .kachel { position: absolute; left: 50%; top: 50%; width: 300px; height: 300px; margin: -150px 0 0 -150px; border-radius: 68px; ${KACHEL} }
  </style></head><body><div class="gross">${rad({ aussen: 12, innen: -40, nadel: false })}</div><div class="schleier"></div><div class="kachel"></div></body></html>`);
  await page.waitForTimeout(300);
  const out = fileURLToPath(new URL("../assets/vorschau-omna-color-app.jpg", import.meta.url));
  await page.screenshot({ path: out, type: "jpeg", quality: 82 });
  console.log("geschrieben:", out);
  await page.close();
}

// Vorschaukachel der App zum Teilen: links Titel und Satz, rechts die App-Kachel über dem leisen Rad
{
  const page = await browser.newPage({ viewport: { width: 1200, height: 630 }, deviceScaleFactor: 1 });
  await page.setContent(`<!DOCTYPE html><html lang="de"><head><meta charset="utf-8"><base href="${base}"><link rel="stylesheet" href="vendor/fonts/fonts.css"><style>
    html, body { margin: 0; width: 1200px; height: 630px; overflow: hidden; background: ${GRUND}; }
    .rechts { position: absolute; right: 0; top: 0; width: 660px; height: 630px; overflow: hidden; }
    .gross { position: absolute; left: -40px; top: -60px; width: 740px; height: 766px; opacity: 0.26; filter: blur(2px) saturate(1.1); }
    .schleier { position: absolute; inset: 0; background: radial-gradient(circle at 50% 50%, rgba(18,20,27,0.85) 0, rgba(18,20,27,0.5) 200px, rgba(18,20,27,0.1) 380px); }
    .kachel { position: absolute; left: 50%; top: 50%; width: 290px; height: 290px; margin: -145px 0 0 -145px; border-radius: 66px; ${KACHEL} }
    .kante { position: absolute; left: 540px; top: 0; width: 60px; height: 630px; background: linear-gradient(90deg, ${GRUND}, rgba(18,20,27,0)); }
    .text { position: absolute; left: 64px; top: 0; bottom: 0; width: 480px; display: flex; flex-direction: column; justify-content: center; color: #e8eaf1; }
    .marke { font: 600 15px/1 "Instrument Sans", sans-serif; letter-spacing: 0.16em; text-transform: uppercase; color: #9aa1b5; margin: 0 0 22px; }
    h1 { font: 500 76px/0.98 "Instrument Sans", sans-serif; letter-spacing: -0.02em; margin: 0; }
    p { font: 400 29px/1.32 "Instrument Sans", sans-serif; margin: 26px 0 0; }
    .fuss { margin-top: 38px; font: 400 19px/1.45 "Instrument Sans", sans-serif; color: #9aa1b5; }
    .fuss b { display: block; font-weight: 500; color: #e4b83c; }
  </style></head><body>
    <div class="rechts"><div class="gross">${rad({ aussen: 12, innen: -40, nadel: false })}</div><div class="schleier"></div><div class="kachel"></div></div>
    <div class="kante"></div>
    <div class="text">
      <div class="marke">App · installieren · ohne Netz</div>
      <h1>OMNA COLOR</h1>
      <p>Zwei Farbräder drehen gegeneinander und ziehen eine von 180 Gestaltungsübungen.</p>
      <div class="fuss"><b>ornament.cloud/alpha/omna-color/app</b>Auf dem Startbildschirm, auch ohne Netz.</div>
    </div></body></html>`);
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(400);
  const out = fileURLToPath(new URL("../alpha/omna-color/app/og-omna-color-app.jpg", import.meta.url));
  await page.screenshot({ path: out, type: "jpeg", quality: 86 });
  console.log("geschrieben:", out);
  await page.close();
}

await browser.close();
server.close();
