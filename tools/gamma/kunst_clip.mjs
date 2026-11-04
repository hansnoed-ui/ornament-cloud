// Rechnet den Clip für die flache Ansicht der Seite «Kunst» auf ornament.cloud/gamma/ (Christian, 4. November 2026:
// «Mach einen clip von ornament.cloud/animations für die flache ansicht der Kunst seite»): elf Effekte aus /animations, je auf einem seiner Werke,
// 2,2 s pro Effekt, 0,5 s weich überblendet; die letzte Überblendung führt in das erste Bild, so läuft die Schlaufe ohne Sprung.
// Format 1456 × 900 (goldenes Rechteck wie die Bühne ab 640 px; am Telefon, Bühne 1.3, schneidet object-fit: cover die Ränder).
//
// Aufruf (im Wurzelordner der Website, Playwright mit Chromium und ffmpeg nötig):
//   python3 -m http.server 8765 --bind 127.0.0.1 &
//   node tools/gamma/kunst_clip.mjs <ordner-mit-bildern> [name]
// Der Ordner liegt unter dem Wurzelordner (der Server liefert die Bilder) und enthält foto.webp (gamma/bilder/kunst-foto.webp),
// harbouring.webp (art/bilder/harbouring-1-1600.webp) und aus dem Projekt «Animations» herbarium, rosen, gemaelde, frida, portrait,
// mosaik, collage, karte als .jpg (je höchstens 2000 px breit; alle zehn liegen im Projekt «Animations» unter kunst-clip/bilder/). Schreibt gamma/bilder/<name>.mp4 und <name>.webp (Platzhalter, erstes Bild).
import { createRequire } from "module";
import { spawnSync, spawn } from "child_process";
import path from "path";
import fs from "fs";
const { chromium } = createRequire(import.meta.url)("playwright");

const [B, H] = [1456, 900], FPS = 30, S = 2.2, F = 0.5, T0 = 3;   // Grösse, Bilder/s, Länge je Effekt, Überblendung, Beginn in der Schlaufe des Effekts
const SEG = [["relief", "foto.webp"], ["fluid", "harbouring.webp"], ["zebra", "mosaik.jpg"], ["raster", "frida.jpg"], ["wirbel", "rosen.jpg"],
  ["pinsel", "karte.jpg"], ["montage", "collage.jpg"], ["sortieren", "gemaelde.jpg"], ["hoehenlinien", "portrait.jpg"], ["tinte", "herbarium.jpg"], ["voxel", "foto.webp"]];
const ordner = process.argv[2], name = process.argv[3] || "kunst-animationen";
if (!ordner) { console.error("Aufruf: node tools/gamma/kunst_clip.mjs <ordner-mit-bildern> [name]"); process.exit(1); }
const WURZEL = path.resolve(path.dirname(new URL(import.meta.url).pathname), "../.."), aus = path.join(WURZEL, "gamma/bilder", name);
const url = path.relative(WURZEL, path.resolve(ordner)).split(path.sep).join("/");
const total = SEG.length * S, N = Math.round(total * FPS), sm = (x) => x * x * (3 - 2 * x);
// Fassung fürs Netz: die Bühne ist höchstens 980 px breit, das Video 1280 px. Die feinen Texturen (Relief, Pinselstrom, Zebra) kosten viele Bits,
// darum CRF 32 (etwa 9 MB für 24 s); Linien und Kanten bleiben dabei scharf, ein Entrauschen sparte kaum etwas
export function netz(ein, ausDatei) {
  const r = spawnSync("ffmpeg", ["-v", "error", "-y", "-i", ein, "-vf", "scale=1280:-2:flags=lanczos,setsar=1", "-c:v", "libx264", "-preset", "veryslow", "-crf", "32",
    "-profile:v", "high", "-level", "4.0", "-pix_fmt", "yuv420p", "-color_primaries", "bt709", "-color_trc", "bt709", "-colorspace", "bt709",
    "-g", "90", "-movflags", "+faststart", "-an", ausDatei], { stdio: "inherit" });
  if (r.status) throw new Error("ffmpeg");
}
const stapel = ([e, img]) => ({ bild: img, grund: "schwarz", ebenen: [{ effekt: e, seed: 1 }] });

// Zuerst ein fast verlustfreies Zwischenvideo, dann die Fassung fürs Netz (so lässt sich die Kompression ohne neues Rechnen anpassen)
const meister = aus + "-meister.mp4";
const ff = spawn("ffmpeg", ["-v", "error", "-y", "-f", "image2pipe", "-framerate", String(FPS), "-c:v", "mjpeg", "-i", "-",
  "-c:v", "libx264", "-preset", "fast", "-crf", "10", "-pix_fmt", "yuv420p", "-an", meister], { stdio: ["pipe", "inherit", "inherit"] });
const browser = await chromium.launch({ args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"] });
const p = await browser.newPage(); p.on("pageerror", (e) => console.error("Fehler:", e.message));
await p.goto("http://127.0.0.1:8765/tools/gamma/kunst_clip.html"); await p.waitForFunction("window.bereit");
await p.evaluate((b) => laden(b), [...new Set(SEG.map((x) => x[1]))].map((n) => [n, `/${url}/${n}`]));
// Vorwärmen: die ersten Bilder nach dem Laden geraten sonst anders als später und die Schlaufe springt
for (let w = 0; w < 4; w++) await p.evaluate(([b, h, s, t]) => bild(b, h, [{ stapel: s, t, a: 1 }]), [B, H, stapel(SEG[0]), T0 + F]);
for (let k = 0; k < N; k++) {
  const T = (k / FPS + F) % total, i = Math.floor(T / S), tl = T - i * S, teile = [];
  if (tl < F) { const j = (i - 1 + SEG.length) % SEG.length; teile.push({ stapel: stapel(SEG[j]), t: T0 + S + tl, a: 1 }, { stapel: stapel(SEG[i]), t: T0 + tl, a: sm(tl / F) }); }
  else teile.push({ stapel: stapel(SEG[i]), t: T0 + tl, a: 1 });
  const d = await p.evaluate(([b, h, t]) => bild(b, h, t), [B, H, teile]);
  if (!ff.stdin.write(Buffer.from(d.split(",")[1], "base64"))) await new Promise((r) => ff.stdin.once("drain", r));
  if (k % 60 === 0) console.log(`${k} / ${N}`);
}
ff.stdin.end(); await new Promise((r) => ff.on("close", r)); await browser.close();
if (!process.env.NUR_MEISTER) { netz(meister, aus + ".mp4"); fs.unlinkSync(meister); }
spawnSync("ffmpeg", ["-v", "error", "-y", "-i", aus + ".mp4", "-frames:v", "1", "-vf", "scale=980:-2", "-c:v", "libwebp", "-quality", "60", aus + ".webp"], { stdio: "inherit" });
console.log("fertig:", aus + ".mp4");
