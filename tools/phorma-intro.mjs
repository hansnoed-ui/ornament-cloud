// Intro der Website (assets/start-intro.mp4): die Irrfahrt aus PHORMA III (Wunsch vom 18. Oktober 2026: «das Video des Tests, welches im
// Ornament.cloud-Logo endet, als neue Intro-Sequenz der Website, mit Option Ton an/aus und Skip intro»). Gerechnet von der Anwendung selbst
// (alpha/phorma-iii/, Effekt Irrfahrt, Quelle «Nur Ton», Logo am Schluss, 4 : 5) mit einer Audiodatei, Bild für Bild in voller Grösse mit
// Bewegungsunschärfe, dann mit ffmpeg zu H.264 (Bereich tv, BT.709, schneller Start) und AAC zusammengesetzt.
//
//   NODE_PATH=$(npm root -g) node tools/phorma-intro.mjs <audiodatei> [--proben 2] [--aus assets/start-intro.mp4]
// Braucht ffmpeg. Die Musik des Intros vom 18. Oktober 2026 ist der Ton des Testvideos «Claude_444.mp4» (nicht im Repository).
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
let playwright;
try { playwright = require("playwright"); } catch { playwright = require(join(process.env.NODE_PATH || "", "playwright")); }
const root = fileURLToPath(new URL("../", import.meta.url));
const arg = (name, std) => { const i = process.argv.indexOf(`--${name}`); return i > 0 ? process.argv[i + 1] : std; };
const ton = process.argv[2] && !process.argv[2].startsWith("--") ? resolve(process.argv[2]) : null;
if (!ton) { console.error("Audiodatei fehlt: node tools/phorma-intro.mjs <audiodatei>"); process.exit(1); }
const proben = Number(arg("proben", 2)), aus = resolve(root, arg("aus", "assets/start-intro.mp4"));

const { startServer } = await import(new URL("tools/serve-orma.mjs", `file://${root}`).href);
const server = await startServer(0);
const browser = await playwright.chromium.launch({ args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader"] });
const page = await (await browser.newContext({ viewport: { width: 1280, height: 900 } })).newPage();
page.on("pageerror", (e) => console.error("Fehler:", e.message));
await page.addInitScript(() => {
  for (const [k, v] of [["ablauf", "irrfahrt"], ["quelle", "ton"], ["format", "4:5"], ["signet", "1"], ["frickeln", "0"]]) localStorage.setItem(`phorma-iii.${k}`, v);
});
await page.goto(`http://localhost:${server.address().port}/alpha/phorma-iii/`);
await page.setInputFiles("#tondatei", ton);
await page.waitForFunction(() => window.__phorma?.ton && window.__phorma?.buehneFertig && window.__phorma?.sz?.buehne, null, { timeout: 300_000 });
await page.waitForTimeout(1500);
await page.waitForFunction(() => window.__phorma?.buehneFertig && window.__phorma?.sz?.buehne, null, { timeout: 300_000 });
const dauer = await page.evaluate(() => { const S = window.__phorma; S.laeuft = false; return S.sz.zeit.dauer; });
const n = Math.round(dauer * 30), ordner = mkdtempSync(join(tmpdir(), "phorma-intro-"));
console.log(`${n} Bilder (${dauer.toFixed(1)} s), ${proben} Proben je Bild …`);
for (let i = 0; i < n; i++) {
  const url = await page.evaluate(async ([t, proben]) => {
    const { bild } = await import(document.querySelector('script[src^="app.js"]').src.replace(/app\.js\?v=(\d+)/, "film.js?v=$1"));
    const S = window.__phorma, sz = { ...S.sz, buehne: S.buehne, beschriftung: false };
    const c = document.createElement("canvas"); c.width = S.mass[0]; c.height = S.mass[1];
    bild(c.getContext("2d"), sz, t, { proben });
    return c.toDataURL("image/jpeg", 0.95);
  }, [i / 30, proben]);
  writeFileSync(join(ordner, `b${String(i).padStart(4, "0")}.jpg`), Buffer.from(url.split(",")[1], "base64"));
  if (i % 30 === 0) console.log(`${i} / ${n}`);
}
await browser.close(); server.close();
execFileSync("ffmpeg", ["-v", "error", "-y", "-framerate", "30", "-i", join(ordner, "b%04d.jpg"), "-i", ton, "-map", "0:v", "-map", "1:a", "-t", String(n / 30),
  "-vf", "scale=in_range=full:out_range=tv,format=yuv420p", "-colorspace", "bt709", "-color_primaries", "bt709", "-color_trc", "bt709", "-color_range", "tv",
  "-c:v", "libx264", "-preset", "slow", "-crf", "24", "-c:a", "aac", "-b:a", "128k", "-af", "afade=t=out:st=" + (n / 30 - 1).toFixed(2) + ":d=1", "-movflags", "+faststart", aus], { stdio: "inherit" });
rmSync(ordner, { recursive: true, force: true });
console.log(`fertig: ${aus}`);
