// rendert die Formenfahrt Bild für Bild mit film.html in Chromium (Playwright, ohne Grafikkarte über SwiftShader) und schreibt JPGs
//   node render.mjs probe          → einzelne Bilder (je Szene eines) nach ../data/probe/
//   node render.mjs film           → 1080 Bilder (36 s Fahrt, 30 fps, 1080 × 1350) nach public/formenfahrt/ (f0000.jpg …), rund 20 min
// Umgebung: NODE_PATH mit playwright. three.js und die Bausteine kommen aus dem Repository (vendor/, alpha/formen/gemeinsam.js).
import { createServer } from "node:http";
import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { createRequire } from "node:module";
import { join, extname } from "node:path";
import { fileURLToPath } from "node:url";
const require = createRequire(import.meta.url);
const { chromium } = require(join(globalThis.process.env.NODE_PATH ?? "", "playwright"));
const hier = fileURLToPath(new URL(".", import.meta.url)), wurzel = join(hier, "..", "..", "..", "..", ".."), daten = join(hier, "..", "data");
const TYP = { ".html": "text/html", ".js": "text/javascript", ".png": "image/png" };
const server = createServer((req, res) => {
  const p = decodeURIComponent(new URL(req.url, "http://x").pathname);
  const datei = p.startsWith("/film/") ? join(hier, p.slice(6)) : p.startsWith("/vendor/") || p.startsWith("/alpha/formen/") ? join(wurzel, p) : null;
  if (!datei || !existsSync(datei)) { res.writeHead(404); res.end(); return; }
  res.writeHead(200, { "content-type": TYP[extname(datei)] ?? "application/octet-stream" }); res.end(readFileSync(datei));
}).listen(0);

export const BILDER = 1080;   // wie BILDER in ../Video.tsx
const [art = "probe"] = globalThis.process.argv.slice(2);
const ziel = art === "probe" ? join(daten, "probe") : join(hier, "..", "..", "..", "public", "formenfahrt");
mkdirSync(ziel, { recursive: true });
const b = await chromium.launch({ args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"] });
const p = await b.newPage({ viewport: { width: 2160, height: 2700 } });
p.on("pageerror", (e) => console.log("pageerror", e.message));
await p.goto(`http://localhost:${server.address().port}/film/film.html?b=1080&h=1350&d=2`);
await p.waitForFunction(() => globalThis.bereit, null, { timeout: 120000 });
const speichern = async (name, n) => {
  const url = await p.evaluate((i) => globalThis.film.bild(i), n);
  writeFileSync(join(ziel, name), globalThis.Buffer.from(url.split(",")[1], "base64"));
};
const zeit = Date.now();
if (art === "probe") {
  // je Station ein Bild
  for (const s of [1, 5.5, 10, 14.5, 19, 23.5, 28, 32, 35.5]) { const n = Math.round(s * 30); await speichern(`probe-${String(n).padStart(4, "0")}.jpg`, n); console.log(s, "s", JSON.stringify(await p.evaluate(() => globalThis.film.zustand()))); }
} else {
  for (let i = 0; i < BILDER; i++) { await speichern(`f${String(i).padStart(4, "0")}.jpg`, i); if (i % 60 === 0) console.log(i, Math.round((Date.now() - zeit) / 1000), "s"); }
}
console.log("fertig in", Math.round((Date.now() - zeit) / 1000), "s");
await b.close();
server.close();
