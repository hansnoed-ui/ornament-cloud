// Bilder der Beispielzettel (erfundene Konten, nur für Tests und Vorschau, nie veröffentlicht): abstrakte Avatare, Bilder und ein Beleg, im Browser gezeichnet.
//   NODE_PATH=$(npm root -g) node tests/fixtures/social-media/bilder.mjs
import { createRequire } from "node:module";
import { join } from "node:path";
import { mkdirSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
const require = createRequire(import.meta.url);
let playwright;
try { playwright = require("playwright"); } catch { playwright = require(join(process.env.NODE_PATH || "", "playwright")); }
const hier = fileURLToPath(new URL("./medien/", import.meta.url));
const browser = await playwright.chromium.launch();
const page = await browser.newPage();
const BILDER = {
  // [Ordner/Datei, Breite, Höhe, Zeichnung]
  "1/avatar": [96, 96, "kreis:#2f4858:#86bbd8"], "2/avatar": [96, 96, "kreis:#6d2e46:#d5b9b2"], "3/avatar": [96, 96, "kreis:#33658a:#f6ae2d"],
  "4/avatar": [96, 96, "kreis:#3d405b:#e07a5f"], "5/avatar": [96, 96, "kreis:#264653:#e9c46a"],
  "2/bild-1": [1200, 900, "see"], "2/bild-2": [1200, 900, "plakat"], "3/bild-1": [1080, 1350, "fassade"], "3/bild-2": [1080, 1350, "schatten"], "3/bild-3": [1080, 1350, "netz"],
  "5/bild-1": [1200, 675, "grafik"],
};
for (const [name, [w, h, art]] of Object.entries(BILDER)) {
  const data = await page.evaluate(async ({ w, h, art }) => {
    const c = document.createElement("canvas"); c.width = w; c.height = h; const g = c.getContext("2d");
    let s = 7; const r = () => ((s = (s * 16807) % 2147483647) / 2147483647);
    if (art.startsWith("kreis")) {
      const [, a, b] = art.split(":"); const v = g.createLinearGradient(0, 0, w, h); v.addColorStop(0, a); v.addColorStop(1, b); g.fillStyle = v; g.fillRect(0, 0, w, h);
      g.strokeStyle = "rgba(255,255,255,.55)"; g.lineWidth = 2; for (let i = 0; i < 5; i++) { g.beginPath(); g.arc(w * r(), h * r(), 10 + 30 * r(), 0, 7); g.stroke(); }
    } else if (art === "see") {
      const v = g.createLinearGradient(0, 0, 0, h); v.addColorStop(0, "#c9d6df"); v.addColorStop(0.55, "#f0e6d8"); v.addColorStop(0.56, "#52707f"); v.addColorStop(1, "#1e3440"); g.fillStyle = v; g.fillRect(0, 0, w, h);
      g.strokeStyle = "rgba(255,255,255,.35)"; for (let i = 0; i < 60; i++) { const y = h * (0.57 + 0.43 * r()); g.beginPath(); g.moveTo(w * r(), y); g.lineTo(w * r(), y); g.stroke(); }
      g.fillStyle = "#1f1d1a"; g.fillRect(w * 0.62, h * 0.38, 6, h * 0.2); g.beginPath(); g.arc(w * 0.62 + 3, h * 0.36, 14, 0, 7); g.fill();
    } else if (art === "plakat") {
      g.fillStyle = "#efe9df"; g.fillRect(0, 0, w, h); g.fillStyle = "#c2410c"; g.fillRect(w * 0.1, h * 0.1, w * 0.8, h * 0.18);
      g.fillStyle = "#1f1d1a"; g.font = `600 ${h * 0.09}px sans-serif`; g.fillText("STADT FÜR ALLE", w * 0.12, h * 0.48); g.font = `${h * 0.05}px sans-serif`; g.fillText("Samstag, 14 Uhr, Helvetiaplatz", w * 0.12, h * 0.6);
    } else if (art === "fassade" || art === "schatten" || art === "netz") {
      g.fillStyle = art === "netz" ? "#f4f1ec" : "#e8e1d6"; g.fillRect(0, 0, w, h); g.strokeStyle = "#3b3b39"; g.lineWidth = 3;
      for (let i = 0; i < 9; i++) for (let j = 0; j < 7; j++) { const x = 60 + i * 115, y = 80 + j * 180; if (art === "fassade") g.strokeRect(x, y, 70, 110); else if (art === "schatten") { g.fillStyle = `rgba(31,29,26,${0.08 + 0.4 * r()})`; g.fillRect(x, y, 90 + 40 * r(), 140); } else { g.beginPath(); g.arc(x, y, 6, 0, 7); g.stroke(); if (i) { g.beginPath(); g.moveTo(x, y); g.lineTo(x - 115, y + 60 * (r() - 0.5)); g.stroke(); } } }
    } else if (art === "grafik") {
      g.fillStyle = "#ffffff"; g.fillRect(0, 0, w, h); g.fillStyle = "#1f1d1a"; g.font = "600 44px sans-serif"; g.fillText("Wer liest noch bis zum Ende?", 60, 90);
      const werte = [92, 71, 54, 38, 27, 19, 14]; werte.forEach((v, i) => { g.fillStyle = i === 6 ? "#c2410c" : "#6b665e"; g.fillRect(80 + i * 150, 600 - v * 4.8, 96, v * 4.8); g.font = "28px sans-serif"; g.fillText(`${v} %`, 80 + i * 150, 590 - v * 4.8); });
    }
    return c.toDataURL("image/webp", 0.82);
  }, { w, h, art });
  const datei = join(hier, `${name}.webp`);
  mkdirSync(join(datei, ".."), { recursive: true });
  writeFileSync(datei, Buffer.from(data.split(",")[1], "base64"));
}
await browser.close();
console.log(Object.keys(BILDER).length, "Bilder");
