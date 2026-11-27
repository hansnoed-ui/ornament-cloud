// rendert eine Skizze Bild für Bild mit film.html in Chromium (Playwright, ohne Grafikkarte über SwiftShader)
//   node render.mjs <skizze> probe   → neun Bilder (p = 0, 1/8 … 1) nach ../../out/skizzen/probe-<skizze>/
//   node render.mjs <skizze> film    → 600 Bilder (20 s, 30 fps, 1080 × 1350) nach ../../public/skizzen/<skizze>/,
//                                      dann mit ffmpeg nach ../../out/skizzen/<skizze>.mp4 (H.264, yuv420p, faststart)
// Umgebung: NODE_PATH mit playwright. three.js und die Bausteine kommen aus dem Repository (vendor/, alpha/formen/).
import { createServer } from "node:http";
import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { createRequire } from "node:module";
import { execFileSync } from "node:child_process";
import { join, extname } from "node:path";
import { fileURLToPath } from "node:url";
const require = createRequire(import.meta.url);
const { chromium } = require(join(globalThis.process.env.NODE_PATH ?? "", "playwright"));
const hier = fileURLToPath(new URL(".", import.meta.url)), videos = join(hier, "..", "..");
const TYP = { ".html": "text/html", ".js": "text/javascript", ".png": "image/png" };
const server = createServer((req, res) => {
  const p = decodeURIComponent(new URL(req.url, "http://x").pathname);
  const datei = p.startsWith("/film/") ? join(hier, p.slice(6)) : null;
  if (!datei || !existsSync(datei)) { res.writeHead(404); res.end(); return; }
  res.writeHead(200, { "content-type": TYP[extname(datei)] ?? "application/octet-stream" }); res.end(readFileSync(datei));
}).listen(0);

const [form = "chladni", art = "probe"] = globalThis.process.argv.slice(2);
const ziel = art === "probe" ? join(videos, "out", "skizzen", `probe-${form}`) : join(videos, "public", "skizzen", form);
mkdirSync(ziel, { recursive: true });
const b = await chromium.launch({ args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"] });
const p = await b.newPage({ viewport: { width: 1080, height: 1350 } });
p.on("pageerror", (e) => console.log("pageerror", e.message));
p.on("console", (m) => { if (m.type() === "error") console.log("konsole", m.text()); });
await p.goto(`http://localhost:${server.address().port}/film/film.html?skizze=${form}`);
await p.waitForFunction(() => globalThis.bereit, null, { timeout: 60000 });
const BILDER = await p.evaluate(() => globalThis.film.BILDER);
const speichern = async (name, n) => {
  const url = await p.evaluate((i) => globalThis.film.bild(i), n);
  writeFileSync(join(ziel, name), globalThis.Buffer.from(url.split(",")[1], "base64"));
};
const zeit = Date.now();
if (art === "probe") {
  for (let k = 0; k <= 8; k++) await speichern(`p${k}.jpg`, Math.round((k / 8) * BILDER));
} else {
  for (let i = 0; i < BILDER; i++) { await speichern(`f${String(i).padStart(4, "0")}.jpg`, i); if (i % 90 === 0) console.log(form, i, Math.round((Date.now() - zeit) / 1000), "s"); }
  const mp4 = join(videos, "out", "skizzen", `${form}.mp4`);
  mkdirSync(join(videos, "out", "skizzen"), { recursive: true });
  execFileSync("ffmpeg", ["-y", "-loglevel", "error", "-framerate", "30", "-i", join(ziel, "f%04d.jpg"), "-c:v", "libx264", "-crf", "17", "-preset", "slow",
    "-pix_fmt", "yuv420p", "-movflags", "+faststart", mp4]);
  console.log("mp4", mp4);
}
console.log(form, "fertig in", Math.round((Date.now() - zeit) / 1000), "s");
await b.close();
server.close();
