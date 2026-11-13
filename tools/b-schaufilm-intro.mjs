// Das Intro von Das Dritte Rad als langsamer Film für die Referenzkarte (13. November 2026, Christian: «das dritte rad: animierte intro, schön langsam»).
// Die Seite läuft in virtueller Zeit (Chrome DevTools, Emulation.setVirtualTimePolicy): je Bild 12 ms, abgespielt mit 30 Bildern je Sekunde, also
// knapp dreimal langsamer als im Browser und ohne Ruckeln. Am Schluss steht das letzte Bild zweieinhalb Sekunden. Braucht Playwright, ffmpeg und
// einen Server auf dem Repository (python3 -m http.server 8123).
//
//   NODE_PATH=$(npm root -g) node tools/b-schaufilm-intro.mjs
import { createRequire } from "node:module";
import { writeFileSync, mkdtempSync, rmSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
let playwright;
try { playwright = require("playwright"); } catch { playwright = require(join(process.env.NODE_PATH || "", "playwright")); }
const AUS = fileURLToPath(new URL("../b/bilder/schau/drittes-rad.mp4", import.meta.url)), ordner = mkdtempSync(join(tmpdir(), "intro-"));
const BILDER = 440, SCHRITT = 12, URL_SEITE = process.env.SEITE || "http://localhost:8123/beta/drittes-rad/";

const browser = await playwright.chromium.launch();
const seite = await browser.newPage({ viewport: { width: 960, height: 600 }, deviceScaleFactor: 1 });
const cdp = await seite.context().newCDPSession(seite);
await seite.goto("about:blank");
await cdp.send("Emulation.setVirtualTimePolicy", { policy: "pause" });
const schritt = (ms) => new Promise((ok) => { cdp.once("Emulation.virtualTimeBudgetExpired", ok); cdp.send("Emulation.setVirtualTimePolicy", { policy: "pauseIfNetworkFetchesPending", budget: ms }); });
seite.goto(URL_SEITE).catch(() => {});
for (let i = 0; i < BILDER; i++) {
  await schritt(SCHRITT);
  const { data } = await cdp.send("Page.captureScreenshot", { format: "jpeg", quality: 90 });
  writeFileSync(join(ordner, `${String(i).padStart(4, "0")}.jpg`), Buffer.from(data, "base64"));
}
await browser.close();
execFileSync("ffmpeg", ["-loglevel", "error", "-y", "-framerate", "30", "-i", join(ordner, "%04d.jpg"), "-vf", "tpad=stop_mode=clone:stop_duration=2.5", "-c:v", "libx264", "-pix_fmt", "yuv420p", "-crf", "27", "-preset", "slow", "-movflags", "+faststart", "-an", AUS]);
rmSync(ordner, { recursive: true });
console.log("b/bilder/schau/drittes-rad.mp4");
