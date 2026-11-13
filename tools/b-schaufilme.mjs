// Kurze Filme zu den Schaubildern (13. November 2026, Christian: «nimm einen schöneren screenshot bei principesse (mit 3d figuren drauf, kurze animation
// wäre auch schön) und gamma … als kurze animation der website»): die Seite wird Bild für Bild nach unten gerollt und aufgenommen, ffmpeg setzt daraus
// b/bilder/schau/<name>.mp4 (ohne Ton) und das Standbild <name>.jpg (1280 × 800). Principesse kommt aus dem Repository hansnoed-ui/principessa
// (PRINCIPESSE=<pfad>). Braucht Playwright und ffmpeg; Gamma rechnet ohne Grafikkarte mehrere Minuten.
//
//   PRINCIPESSE=../principessa NODE_PATH=$(npm root -g) node tools/b-schaufilme.mjs [principesse] [gamma]
import { createServer } from "node:http";
import { readFileSync, mkdirSync, mkdtempSync, rmSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { tmpdir } from "node:os";
import { extname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
let playwright;
try { playwright = require("playwright"); } catch { playwright = require(join(process.env.NODE_PATH || "", "playwright")); }
const ROOT = fileURLToPath(new URL("../", import.meta.url)), AUS = join(ROOT, "b/bilder/schau"); mkdirSync(AUS, { recursive: true });
const types = { ".html": "text/html", ".css": "text/css", ".js": "text/javascript", ".mjs": "text/javascript", ".json": "application/json", ".woff2": "font/woff2", ".jpg": "image/jpeg", ".png": "image/png", ".webp": "image/webp", ".svg": "image/svg+xml", ".mp4": "video/mp4", ".glb": "model/gltf-binary" };
const diene = (wurzel) => new Promise((ok) => { const s = createServer((req, res) => { let p = decodeURIComponent(new URL(req.url, "http://x").pathname); if (p.endsWith("/")) p += "index.html"; let body; try { body = readFileSync(join(wurzel, p)); } catch { res.writeHead(404).end(); return; } res.writeHead(200, { "content-type": types[extname(p)] || "application/octet-stream" }).end(body); }).listen(0, () => ok(s)); });

// von/bis: Anteil der Seitenhöhe, über den gerollt wird; bilder bei rate Bildern je Sekunde; stand: welches Bild (Anteil) das Standbild wird
export const SCHAUFILME = [
  { name: "principesse", fremd: "PRINCIPESSE", pfad: "", fenster: [960, 600], faktor: 1, warten: 9000, von: 0, bis: 1, bilder: 150, rate: 15, takt: 120, stand: 0.84 },
  { name: "gamma", pfad: "gamma/", fenster: [640, 400], faktor: 1, warten: 6000, von: 0.5, bis: 1, bilder: 96, rate: 12, takt: 150, stand: 0.45 },
];

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const nur = process.argv.slice(2);
  const browser = await playwright.chromium.launch({ args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader"] });
  for (const f of SCHAUFILME) {
    if (nur.length && !nur.includes(f.name)) continue;
    const wurzel = f.fremd ? process.env[f.fremd] && resolve(process.env[f.fremd]) : ROOT;
    if (!wurzel) { console.log(`${f.name}: übersprungen (${f.fremd}=<pfad> fehlt)`); continue; }
    const server = await diene(wurzel), ordner = mkdtempSync(join(tmpdir(), "schaufilm-"));
    const seite = await browser.newPage({ viewport: { width: f.fenster[0], height: f.fenster[1] }, deviceScaleFactor: f.faktor, colorScheme: "dark" });
    await seite.goto(`http://localhost:${server.address().port}/${f.pfad}`, { waitUntil: "load" });
    await seite.waitForTimeout(f.warten);
    const weg = await seite.evaluate(() => document.documentElement.scrollHeight - innerHeight);
    for (let i = 0; i < f.bilder; i++) {
      const t = i / (f.bilder - 1), y = Math.round(weg * (f.von + (f.bis - f.von) * t));
      await seite.evaluate((y) => window.scrollTo(0, y), y);
      await seite.waitForTimeout(f.takt);
      await seite.screenshot({ path: join(ordner, `${String(i).padStart(4, "0")}.jpg`), type: "jpeg", quality: 92 });
    }
    await seite.close(); server.close();
    execFileSync("ffmpeg", ["-loglevel", "error", "-y", "-framerate", String(f.rate), "-i", join(ordner, "%04d.jpg"), "-vf", "scale=960:600:flags=lanczos", "-c:v", "libx264", "-pix_fmt", "yuv420p", "-crf", "27", "-preset", "slow", "-movflags", "+faststart", "-an", join(AUS, `${f.name}.mp4`)]);
    execFileSync("ffmpeg", ["-loglevel", "error", "-y", "-i", join(ordner, `${String(Math.round((f.bilder - 1) * f.stand)).padStart(4, "0")}.jpg`), "-vf", "scale=1280:800:flags=lanczos", "-q:v", "3", join(AUS, `${f.name}.jpg`)]);
    rmSync(ordner, { recursive: true });
    console.log(`b/bilder/schau/${f.name}.mp4 und .jpg`);
  }
  await browser.close();
}
