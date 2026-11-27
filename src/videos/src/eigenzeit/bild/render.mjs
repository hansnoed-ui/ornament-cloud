// rendert den Eigenzeit-Film Bild für Bild mit film.html in Chromium (Playwright, ohne Grafikkarte über SwiftShader) und schreibt JPGs
//   node render.mjs probe          → einzelne Bilder (je Szene eines) nach ../data/probe/
//   node render.mjs film           → 90 Bilder Intro in voller Auflösung (i0000.jpg …) und 990 Bilder Film (f0000.jpg …, 33 s, 30 fps)
//                                    nach public/eigenzeit/, rund 10 min
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

export const BILDER = 990, INTRO = 90;   // wie BILDER und INTRO in ../Video.tsx
const [art = "probe"] = globalThis.process.argv.slice(2);
const ziel = art === "probe" ? join(daten, "probe") : join(hier, "..", "..", "..", "public", "eigenzeit");
mkdirSync(ziel, { recursive: true });
const b = await chromium.launch({ args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"] });
const p = await b.newPage({ viewport: { width: 1800, height: 1700 } });
p.on("pageerror", (e) => console.log("pageerror", e.message));
await p.goto(`http://localhost:${server.address().port}/film/film.html?b=900&h=850&d=2`);
await p.waitForFunction(() => globalThis.bereit, null, { timeout: 120000 });
const speichern = async (name, n) => {
  const url = await p.evaluate(([i, g]) => globalThis.film.bild(i, g), [n, name.startsWith("i")]);
  writeFileSync(join(ziel, name), globalThis.Buffer.from(url.split(",")[1], "base64"));
};
const zeit = Date.now();
if (art === "probe") {
  // je Szene ein Bild: 3 s, 8 s, 16 s, 22 s, 29 s, 32,5 s
  for (const s of [-2.5, -1.5, -0.5, 3, 8, 16, 22, 29, 32.5]) { const n = Math.round(s * 30) + INTRO; await speichern(`probe-${String(n).padStart(4, "0")}.jpg`, n); console.log(s, "s", JSON.stringify(await p.evaluate(() => globalThis.film.zustand()))); }
} else {
  for (let i = 0; i < INTRO; i++) await speichern(`i${String(i).padStart(4, "0")}.jpg`, i);
  for (let i = 0; i < BILDER; i++) { await speichern(`f${String(i).padStart(4, "0")}.jpg`, i + INTRO); if (i % 60 === 0) console.log(i, Math.round((Date.now() - zeit) / 1000), "s"); }
}
console.log("fertig in", Math.round((Date.now() - zeit) / 1000), "s");
await b.close();
server.close();
