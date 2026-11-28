// rendert eine Formschleife Bild für Bild mit film.html in Chromium (Playwright, ohne Grafikkarte über SwiftShader)
//   node render.mjs <form> naht    → prüft die Naht der Schleife (letztes Bild → erstes) gegen die Schritte daneben
//   node render.mjs <form> probe   → neun Bilder (p = 0, 1/8 … 1) nach ../../out/formschleifen/probe-<form>/
//   node render.mjs <form> film    → 900 Bilder (30 s, 30 fps, 1080 × 1350) nach ../../public/formschleifen/<form>/,
//                                    dann mit ffmpeg nach ../../out/formschleifen/<form>.mp4 (H.264, yuv420p, faststart)
// Umgebung: NODE_PATH mit playwright; DICHTE=1 rechnet ohne Überabtastung (viermal schneller, für die schweren Stein-Verfahren). three.js und die Bausteine kommen aus dem Repository (vendor/, alpha/formen/).
import { createServer } from "node:http";
import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { createRequire } from "node:module";
import { execFileSync } from "node:child_process";
import { join, extname } from "node:path";
import { fileURLToPath } from "node:url";
const require = createRequire(import.meta.url);
const { chromium } = require(join(globalThis.process.env.NODE_PATH ?? "", "playwright"));
const hier = fileURLToPath(new URL(".", import.meta.url)), videos = join(hier, "..", ".."), wurzel = join(videos, "..", "..");
const TYP = { ".html": "text/html", ".js": "text/javascript", ".png": "image/png", ".jpg": "image/jpeg", ".woff2": "font/woff2" };
const server = createServer((req, res) => {
  const p = decodeURIComponent(new URL(req.url, "http://x").pathname);
  const datei = p.startsWith("/film/") ? join(hier, p.slice(6)) : p.startsWith("/vendor/") || p.startsWith("/alpha/formen/") || p.startsWith("/alpha/theorie/stein/schrift/") ? join(wurzel, p)
    : p.startsWith("/stoffe/") ? join(videos, "public", p) : null;   // Materialscans (CC0), nicht eingecheckt
  if (!datei || !existsSync(datei)) { res.writeHead(404); res.end(); return; }
  res.writeHead(200, { "content-type": TYP[extname(datei)] ?? "application/octet-stream" }); res.end(readFileSync(datei));
}).listen(0);

const [form = "rosette", art = "probe"] = globalThis.process.argv.slice(2);
const ziel = art !== "film" ? join(videos, "out", "formschleifen", `probe-${form}`) : join(videos, "public", "formschleifen", form);
mkdirSync(ziel, { recursive: true });
const b = await chromium.launch({ args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"] });
const p = await b.newPage({ viewport: { width: 1080, height: 1350 } });
p.on("pageerror", (e) => console.log("pageerror", e.message));
p.on("console", (m) => { if (m.type() === "error") console.log("konsole", m.text()); });
await p.goto(`http://localhost:${server.address().port}/film/film.html?b=1080&h=1350&d=${globalThis.process.env.DICHTE ?? 2}&form=${form}`);
await p.waitForFunction(() => globalThis.bereit, null, { timeout: 300000 });
const BILDER = await p.evaluate(() => globalThis.film.BILDER);
const speichern = async (name, n) => {
  const url = await p.evaluate((i) => globalThis.film.bild(i), n);
  writeFileSync(join(ziel, name), globalThis.Buffer.from(url.split(",")[1], "base64"));
};
const zeit = Date.now();
if (art === "naht") {
  // die Naht der Schleife: Schritt vom letzten Bild zum ersten, verglichen mit den Schritten davor und danach (mittlere Abweichung, 0–255)
  const diff = (a, b) => p.evaluate(async ([x, y]) => {
    const lade = (u) => new Promise((ok) => { const i = new globalThis.Image(); i.onload = () => ok(i); i.src = u; });
    const [i1, i2] = [await lade(x), await lade(y)], c = globalThis.document.createElement("canvas"); c.width = 270; c.height = 338;
    const g = c.getContext("2d", { willReadFrequently: true });
    g.drawImage(i1, 0, 0, 270, 338); const d1 = g.getImageData(0, 0, 270, 338).data; g.drawImage(i2, 0, 0, 270, 338); const d2 = g.getImageData(0, 0, 270, 338).data;
    let s = 0; for (let k = 0; k < d1.length; k += 4) s += Math.abs(d1[k] - d2[k]); return s / (d1.length / 4);
  }, [a, b]);
  const b0 = await p.evaluate(() => globalThis.film.bild(0)), b1 = await p.evaluate(() => globalThis.film.bild(1));
  const y = await p.evaluate((n) => globalThis.film.bild(n), BILDER - 2), z = await p.evaluate((n) => globalThis.film.bild(n), BILDER - 1);
  const [davor, naht, danach] = [await diff(y, z), await diff(z, b0), await diff(b0, b1)];
  const gut = naht <= Math.max(0.6, 2.5 * Math.max(davor, danach));
  console.log(form, "Naht", naht.toFixed(2), "· Schritt davor", davor.toFixed(2), "· danach", danach.toFixed(2), gut ? "· in Ordnung" : "· SPRUNG");
} else if (art === "probe") {
  for (let k = 0; k <= 8; k++) await speichern(`p${k}.jpg`, Math.round((k / 8) * BILDER));
} else {
  for (let i = 0; i < BILDER; i++) { await speichern(`f${String(i).padStart(4, "0")}.jpg`, i); if (i % 90 === 0) console.log(form, i, Math.round((Date.now() - zeit) / 1000), "s"); }
  const mp4 = join(videos, "out", "formschleifen", `${form}.mp4`);
  mkdirSync(join(videos, "out", "formschleifen"), { recursive: true });
  execFileSync("ffmpeg", ["-y", "-loglevel", "error", "-framerate", "30", "-i", join(ziel, "f%04d.jpg"), "-c:v", "libx264", "-crf", "17", "-preset", "slow",
    "-pix_fmt", "yuv420p", "-movflags", "+faststart", mp4]);
  console.log("mp4", mp4);
}
console.log(form, "fertig in", Math.round((Date.now() - zeit) / 1000), "s");
await b.close();
server.close();
