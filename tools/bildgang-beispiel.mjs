// Beispielbild für «Das Bild geht weiter» (alpha/das-bild-geht-weiter/beispiel.jpg): eine selbst gezeichnete Komposition mit Überlagerung,
// Wiederholung, Unterbrechung und Grund, damit alle Befunde der Analyse etwas zu sehen haben. Mit festem Zufall, also immer gleich.
//   NODE_PATH=$(npm root -g) node tools/bildgang-beispiel.mjs
import { createRequire } from "node:module";
import { join } from "node:path";
import { writeFileSync } from "node:fs";

const require = createRequire(import.meta.url);
let playwright;
try { playwright = require("playwright"); } catch { playwright = require(join(process.env.NODE_PATH || "", "playwright")); }
const browser = await playwright.chromium.launch();
const page = await browser.newPage();
const daten = await page.evaluate(() => {
  const W = 1200, H = 860, c = document.createElement("canvas");
  c.width = W; c.height = H;
  const x = c.getContext("2d");
  let s = 7;
  const r = () => ((s = (s * 16807) % 2147483647) / 2147483647);
  // Grund: warmes Papier mit leichtem Verlauf
  const g = x.createLinearGradient(0, 0, W, H);
  g.addColorStop(0, "#ece4d0"); g.addColorStop(1, "#e2d8c0");
  x.fillStyle = g; x.fillRect(0, 0, W, H);
  // eine unterbrochene dunkle Linie quer durchs Bild
  x.fillStyle = "#26262a"; x.fillRect(60, 560, 1080, 14);
  // grosse blaue Scheibe, von einem roten Rechteck teilweise verdeckt
  x.fillStyle = "#24427a"; x.beginPath(); x.arc(360, 360, 210, 0, 2 * Math.PI); x.fill();
  x.fillStyle = "#c2412f"; x.fillRect(430, 250, 250, 330);
  // drei gelbe Quadrate in einer Reihe (Wiederholung)
  x.fillStyle = "#e7b528";
  for (const [px, py] of [[790, 150], [930, 150], [1070, 150]]) x.fillRect(px - 45, py - 45, 90, 90);
  // grüne Form, die die Linie unterbricht
  x.fillStyle = "#4f7d53"; x.beginPath(); x.moveTo(760, 470); x.lineTo(1010, 520); x.lineTo(930, 700); x.lineTo(740, 660); x.closePath(); x.fill();
  // kleine rote Scheibe (Farbe kehrt wieder) und ein dunkles Dreieck
  x.fillStyle = "#c2412f"; x.beginPath(); x.arc(200, 720, 62, 0, 2 * Math.PI); x.fill();
  x.fillStyle = "#26262a"; x.beginPath(); x.moveTo(520, 680); x.lineTo(640, 820); x.lineTo(400, 820); x.closePath(); x.fill();
  // ein gelber Punkt in der blauen Scheibe (eingeschlossen)
  x.fillStyle = "#e7b528"; x.beginPath(); x.arc(290, 300, 38, 0, 2 * Math.PI); x.fill();
  // leichtes Korn, damit es kein reines Vektorbild ist
  const bild = x.getImageData(0, 0, W, H), d = bild.data;
  for (let i = 0; i < d.length; i += 4) { const n = (r() - 0.5) * 14; d[i] += n; d[i + 1] += n; d[i + 2] += n; }
  x.putImageData(bild, 0, 0);
  return c.toDataURL("image/jpeg", 0.9);
});
writeFileSync(new URL("../alpha/das-bild-geht-weiter/beispiel.jpg", import.meta.url), Buffer.from(daten.split(",")[1], "base64"));
await browser.close();
console.log("geschrieben: alpha/das-bild-geht-weiter/beispiel.jpg");
