// Principesse und Gamma als ruhige Fahrt für die Referenzkarten (13. November 2026, Christian: «die principesse seite ist immer noch hektisch … zusätzlich flimmert
// der text»). Anders als tools/b-schaufilme.mjs läuft die Seite hier in virtueller Zeit (Chrome DevTools, Emulation.setVirtualTimePolicy): jedes Bild
// ist genau 50 ms nach dem vorigen, darum laufen die Effekte der Seite (Text, Figuren) gleichmässig statt zu flimmern. Die Fahrt hält an drei Stellen
// (Himmel, Wasser, Nacht) und gleitet dazwischen langsam. Braucht Playwright, ffmpeg und das Repository hansnoed-ui/principessa.
//
//   PRINCIPESSE=../principessa NODE_PATH=$(npm root -g) node tools/b-schaufilm-fahrt.mjs            Principesse
//   NODE_PATH=$(npm root -g) node tools/b-schaufilm-fahrt.mjs gamma                                  Gamma (aus diesem Repository)
import { createServer } from "node:http";
import { readFileSync, writeFileSync, mkdtempSync, rmSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { tmpdir } from "node:os";
import { extname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
let playwright;
try { playwright = require("playwright"); } catch { playwright = require(join(process.env.NODE_PATH || "", "playwright")); }
// Die Fahrt: [Anteil des Rollwegs, Bilder bis dorthin]; gleicher Anteil hintereinander heisst Halt. 20 Bilder je Sekunde.
const FILME = {
  principesse: { wurzel: resolve(process.env.PRINCIPESSE || "../principessa"), pfad: "", warten: 9000, fahrt: [[0.27, 0], [0.27, 50], [0.55, 110], [0.55, 50], [0.85, 120], [0.85, 80]] },
  gamma: { wurzel: fileURLToPath(new URL("../", import.meta.url)), pfad: "gamma/", warten: 6000, fahrt: [[0.58, 0], [0.58, 30], [0.72, 80], [0.72, 30], [0.86, 80], [0.86, 30], [1, 80], [1, 50]] },
};
const NAME = process.argv[2] || "principesse", F = FILME[NAME];
const AUS = fileURLToPath(new URL(`../b/bilder/schau/${NAME}.mp4`, import.meta.url));
const wurzel = F.wurzel, ordner = process.env.ORDNER || mkdtempSync(join(tmpdir(), "fahrt-"));
const types = { ".html": "text/html", ".css": "text/css", ".js": "text/javascript", ".mjs": "text/javascript", ".json": "application/json", ".woff2": "font/woff2", ".jpg": "image/jpeg", ".png": "image/png", ".webp": "image/webp", ".svg": "image/svg+xml", ".mp4": "video/mp4", ".glb": "model/gltf-binary" };
const server = await new Promise((ok) => { const s = createServer((req, res) => { let p = decodeURIComponent(new URL(req.url, "http://x").pathname); if (p.endsWith("/")) p += "index.html"; let body; try { body = readFileSync(join(wurzel, p)); } catch { res.writeHead(404).end(); return; } res.writeHead(200, { "content-type": types[extname(p)] || "application/octet-stream" }).end(body); }).listen(0, () => ok(s)); });

const RATE = 20, SCHRITT = 1000 / RATE;
const FAHRT = process.env.FAHRT ? JSON.parse(process.env.FAHRT) : F.fahrt;
const sanft = (t) => t * t * (3 - 2 * t);

const browser = await playwright.chromium.launch({ args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader"] });
const seite = await browser.newPage({ viewport: { width: 640, height: 400 }, deviceScaleFactor: 1, colorScheme: "dark" });
await seite.goto(`http://localhost:${server.address().port}/${F.pfad}`, { waitUntil: "load" });
await seite.waitForTimeout(F.warten);
const weg = await seite.evaluate(() => document.documentElement.scrollHeight - innerHeight);
const cdp = await seite.context().newCDPSession(seite);
await seite.evaluate((y) => window.scrollTo(0, y), Math.round(weg * FAHRT[0][0]));
await seite.waitForTimeout(4000);   // die Seite kommt an der ersten Stelle zur Ruhe, bevor die Zeit angehalten wird
await cdp.send("Emulation.setVirtualTimePolicy", { policy: "pause" });
const schritt = (ms) => new Promise((ok) => { cdp.once("Emulation.virtualTimeBudgetExpired", ok); cdp.send("Emulation.setVirtualTimePolicy", { policy: "pauseIfNetworkFetchesPending", budget: ms }); });
let n = 0;
for (let i = 1; i < FAHRT.length; i++) {
  const [von] = FAHRT[i - 1], [bis, bilder] = FAHRT[i];
  for (let k = 1; k <= bilder; k++) {
    const y = Math.round(weg * (von + (bis - von) * sanft(k / bilder)));
    await cdp.send("Runtime.evaluate", { expression: `window.scrollTo(0, ${y})` });
    await schritt(SCHRITT);
    const { data } = await cdp.send("Page.captureScreenshot", { format: "jpeg", quality: 92 });
    writeFileSync(join(ordner, `${String(n++).padStart(4, "0")}.jpg`), Buffer.from(data, "base64"));
  }
}
await browser.close(); server.close();
if (!process.env.ORDNER) {
  execFileSync("ffmpeg", ["-loglevel", "error", "-y", "-framerate", String(RATE), "-i", join(ordner, "%04d.jpg"), "-vf", "scale=960:600:flags=lanczos", "-c:v", "libx264", "-pix_fmt", "yuv420p", "-crf", "28", "-preset", "slow", "-movflags", "+faststart", "-an", AUS]);
  rmSync(ordner, { recursive: true });
}
console.log(`${n} Bilder, b/bilder/schau/${NAME}.mp4`);
