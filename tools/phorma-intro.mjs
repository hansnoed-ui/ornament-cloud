// Intro der Website (assets/start-intro.mp4): seit 19. Oktober 2026 der Lichtwürfel aus PHORMA III (Wunsch: «diese Animation auch als Website
// Intro … gerne mit dem jetzigen Sound»), vorher die Irrfahrt (Wunsch vom 18. Oktober 2026: «das Video des Tests, welches im Ornament.cloud-Logo
// endet, als neue Intro-Sequenz der Website, mit Option Ton an/aus und Skip intro»). Gerechnet von der Anwendung selbst (alpha/phorma-iii/,
// Effekt --ablauf, Vorgabe lichtwuerfel, Quelle «Nur Ton», Logo am Schluss) mit einer Audiodatei, Bild für Bild in voller Grösse mit
// Bewegungsunschärfe, dann mit ffmpeg zu H.264 (Bereich tv, BT.709, schneller Start) und AAC zusammengesetzt. Zwei Fassungen: 16 : 9 quer
// (1920 × 1080, assets/start-intro-quer.mp4, für Laptop und Bildschirm) und 4 : 5 hoch (1080 × 1350, assets/start-intro.mp4, fürs Telefon).
// Ohne Filmkorn und ohne Entrauschen, in voller Grösse (Rückmeldung: «das Intro sieht im Browser am Laptop nicht gut aus, qualitativ und vom
// Bildschirmformat» – das Korn ergab in voller Grösse 27 MB, entrauscht und auf 864 px verkleinert wurden die Haarlinien weich und matschig).
//
//   NODE_PATH=$(npm root -g) node tools/phorma-intro.mjs <audiodatei> [--ablauf lichtwuerfel|irrfahrt] [--format 16:9|4:5] [--proben 4] [--crf 27]
//                                                         [--aus …] [--ordner <bilder>] [--faktor 2]
// --faktor 2: in doppelter Auflösung (3840 × 2160, 2160 × 2700), neu gerechnet wie der Export der Anwendung, nicht hochskaliert; dauert etwa viermal so lange.
// --ordner: ein Ordner mit schon gerechneten Bildern (nach einem Abbruch); sie werden weiterverwendet, nur das letzte wird neu gerechnet; er bleibt.
// Braucht ffmpeg. Die Musik des Intros vom 18. Oktober 2026 ist der Ton des Testvideos «Claude_444.mp4» (nicht im Repository); sie steckt auch im
// Intro selbst: ffmpeg -i assets/start-intro-quer.mp4 -vn ton.wav
import { existsSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
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
// crf 20 / 27 (hoch fürs Telefon unter 5 MB) und aq-mode 3 (mehr Bits für dunkle, flache Flächen): mit 27 / 30 zerfiel der feine Schein um die Linien auf Schwarz in Blöcke
// (Rückmeldung zum Lichtwürfel-Intro: «ganz zum Schluss scheint das Logo relativ stark verpixelt»); fast alles ist schwarz, die Dateien bleiben klein
const ablauf = arg("ablauf", "lichtwuerfel"), format = arg("format", "16:9"), proben = Number(arg("proben", 4)), crf = arg("crf", format === "16:9" ? "20" : "27");
const faktor = Number(arg("faktor", 1));
const aus = resolve(root, arg("aus", format === "16:9" ? "assets/start-intro-quer.mp4" : "assets/start-intro.mp4"));

const { startServer } = await import(new URL("tools/serve-orma.mjs", `file://${root}`).href);
const server = await startServer(0);
const browser = await playwright.chromium.launch({ args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader"] });
const page = await (await browser.newContext({ viewport: { width: 1280, height: 900 } })).newPage();
page.on("pageerror", (e) => console.error("Fehler:", e.message));
await page.addInitScript(([ablauf, format, faktor]) => {
  for (const [k, v] of [["ablauf", ablauf], ["quelle", "ton"], ["format", format], ["signet", "1"], ["frickeln", "0"], ["tonart", "musik"], ["faktor", faktor]]) localStorage.setItem(`phorma-iii.${k}`, v);
}, [ablauf, format, String(faktor)]);
await page.goto(`http://localhost:${server.address().port}/alpha/phorma-iii/`);
await page.setInputFiles("#tondatei", ton);
await page.waitForFunction(() => window.__phorma?.ton && window.__phorma?.buehneFertig && window.__phorma?.sz?.buehne, null, { timeout: 300_000 });
await page.waitForTimeout(1500);
await page.waitForFunction(() => window.__phorma?.buehneFertig && window.__phorma?.sz?.buehne, null, { timeout: 300_000 });
const dauer = await page.evaluate(() => { const S = window.__phorma; S.laeuft = false; S.buehne.korn = 0; return S.sz.zeit.dauer; });   // ohne Korn
const n = Math.round(dauer * 30), ordner = arg("ordner") ? resolve(arg("ordner")) : mkdtempSync(join(tmpdir(), "phorma-intro-"));
mkdirSync(ordner, { recursive: true });
const datei = (i) => join(ordner, `b${String(i).padStart(4, "0")}.png`);
let ab = 0; while (ab < n && existsSync(datei(ab))) ab++;
ab = Math.max(0, ab - 1);                                                  // das letzte vielleicht nur halb geschrieben
console.log(`Bilder in ${ordner}${ab ? `, weiter ab ${ab}` : ""}`);
console.log(`${n} Bilder (${dauer.toFixed(1)} s), ${proben} Proben je Bild …`);
for (let i = ab; i < n; i++) {
  const url = await page.evaluate(async ([t, proben]) => {
    const { bild } = await import(document.querySelector('script[src^="app.js"]').src.replace(/app\.js\?v=(\d+)/, "film.js?v=$1"));
    const S = window.__phorma, sz = { ...S.sz, buehne: S.buehne, beschriftung: false };
    const k = sz.faktor ?? 1, c = document.createElement("canvas"); c.width = S.mass[0] * k; c.height = S.mass[1] * k;
    const ctx = c.getContext("2d"); ctx.setTransform(k, 0, 0, k, 0, 0);
    bild(ctx, sz, t, { proben });
    return c.toDataURL("image/png");
  }, [i / 30, proben]);
  writeFileSync(datei(i), Buffer.from(url.split(",")[1], "base64"));
  if (i % 30 === 0) console.log(`${i} / ${n}`);
}
await browser.close(); server.close();
execFileSync("ffmpeg", ["-v", "error", "-y", "-framerate", "30", "-i", join(ordner, "b%04d.png"), "-i", ton, "-map", "0:v", "-map", "1:a", "-t", String(n / 30),
  "-vf", "scale=in_range=full:out_range=tv,format=yuv420p", "-colorspace", "bt709", "-color_primaries", "bt709", "-color_trc", "bt709", "-color_range", "tv",
  "-c:v", "libx264", "-preset", "veryslow", "-tune", "film", "-crf", crf, "-x264-params", "aq-mode=3:aq-strength=1.0", "-c:a", "aac", "-b:a", "128k", "-af", "afade=t=out:st=" + (n / 30 - 1).toFixed(2) + ":d=1", "-movflags", "+faststart", aus], { stdio: "inherit" });
if (!arg("ordner")) rmSync(ordner, { recursive: true, force: true });       // ein eigener Ordner bleibt (neu kodieren ohne neu zu rechnen)
console.log(`fertig: ${aus}`);
