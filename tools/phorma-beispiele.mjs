// Beispielvideos aus PHORMA I, II, III und The Fictory für den Neubau (20. Oktober 2026, Wunsch: «bei PHORMA I bis III entstehen ja Animationen. Das wäre schön,
// wenn ein solches Beispiel bei ‹Was dabei herauskommt› zu sehen wäre», dann: «bei PHORMA II und III würd ich mir bei den Beispielvideos noch ein bis
// zwei zusätzliche Effekte wünschen»).
// Rechnet die Filme hier, Bild für Bild aus den Szenen der Apps (ohne Browser-Encoder, WebGL über SwiftShader), in halber Grösse (540 breit) und
// kodiert sie mit ffmpeg klein: MP4 (H.264, crf 31, PHORMA III mit Korn und Ton crf 34; ein WebM wäre bei diesen feinen Linien nicht kleiner), dazu ein Standbild als Poster.
//   PHORMA I:    «Fragmente» mit dem Beispielfoto der App, ohne Ton
//   PHORMA II:   «Wachstum», «Physarum» und «Seidentuch» mit dem Beispielfoto, ohne Ton
//   PHORMA III:  «Gewebe» und «Traube» zu einem hier gerechneten Musikstück (tools/beispielton.mjs) – die Effekte folgen dem Ton, der Film trägt ihn
//   The Fictory: der ganze Lauf von 30 Sekunden mit dem Beispielbild (die Bühne der App, Schritt für Schritt), ohne Ton
// BILDER_ORDNER=… behält die Einzelbilder; HOECHSTENS_BILDER=24 rechnet nur die ersten Bilder (zum Messen); AUS=… schreibt anderswohin als nach
// assets/beispiele/; PROBEN=2 mittelt Proben je Bild (Bewegungsunschärfe in PHORMA II und III, entsprechend langsamer).
//
//   NODE_PATH=$(npm root -g) node tools/phorma-beispiele.mjs                          alle nach assets/beispiele/<name>.mp4 und .jpg
//   NODE_PATH=$(npm root -g) node tools/phorma-beispiele.mjs phorma-ii-tuch phorma-iii  einzelne (ein Name ohne Effekt meint alle Effekte der App)
import { createServer } from "node:http";
import { readFileSync, writeFileSync, mkdirSync, rmSync, statSync } from "node:fs";
import { extname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { execFileSync } from "node:child_process";
import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import { beispielton } from "./beispielton.mjs";

const require = createRequire(import.meta.url);
let playwright;
try { playwright = require("playwright"); } catch { playwright = require(join(process.env.NODE_PATH || "", "playwright")); }

const ROOT = new URL("../", import.meta.url), root = fileURLToPath(ROOT);
const AUS = process.env.AUS ? pathToFileURL(process.env.AUS.replace(/\/?$/, "/")) : new URL("assets/beispiele/", ROOT); mkdirSync(AUS, { recursive: true });
const FPS = 24, BREITE = 540, HOEHE = 675, PROBEN = Math.max(1, Number(process.env.PROBEN) || 1), HOECHSTENS = Number(process.env.HOECHSTENS_BILDER) || Infinity;
const nur = process.argv.slice(2);
const will = (name) => !nur.length || nur.some((n) => name === n || name.startsWith(`${n}-`));

const types = { ".html": "text/html", ".css": "text/css", ".js": "text/javascript", ".mjs": "text/javascript", ".woff2": "font/woff2", ".jpg": "image/jpeg", ".png": "image/png", ".webp": "image/webp", ".json": "application/json", ".webmanifest": "application/manifest+json", ".svg": "image/svg+xml", ".wasm": "application/wasm", ".bin": "application/octet-stream" };
const server = createServer((req, res) => { let p = decodeURIComponent(new URL(req.url, "http://x").pathname); if (p.endsWith("/")) p += "index.html"; let body; try { body = readFileSync(join(root, p)); } catch { res.writeHead(404).end(); return; } res.writeHead(200, { "content-type": types[extname(p)] || "application/octet-stream" }).end(body); }).listen(0);
const base = `http://localhost:${server.address().port}`;
const version = (html, datei) => html.match(new RegExp(`${datei.replace(".", "\\.")}\\?v=(\\d+)`))?.[1] || "";

const browser = await playwright.chromium.launch({ args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader"] });

/** Bilder rechnen: je Bild eine Funktion im Browser, die ein JPEG als Data-URL liefert; ton: WAV (Buffer), der unter den Film gelegt wird */
async function film(name, { seite, vorbereiten, bereit, bildFn, dauerFn, ton = null, poster: posterBei = 0.6, crf = 31 }) {
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  const fehler = []; page.on("pageerror", (e) => fehler.push(e.message));
  await page.goto(base + seite, { waitUntil: "load" });
  await vorbereiten(page);
  await bereit(page);
  const dauer = await page.evaluate(dauerFn);
  const n = Math.min(HOECHSTENS, Math.ceil(dauer * FPS));
  const ordner = join(process.env.BILDER_ORDNER || tmpdir(), `phorma-beispiel-${name}`); rmSync(ordner, { recursive: true, force: true }); mkdirSync(ordner, { recursive: true });
  const t0 = Date.now();
  for (let i = 0; i < n; i++) {
    const data = await page.evaluate(bildFn, [i / FPS, BREITE, HOEHE, PROBEN]);
    writeFileSync(join(ordner, `${String(i).padStart(4, "0")}.jpg`), Buffer.from(data.split(",")[1], "base64"));
    if (i % 48 === 0) console.log(`${name}: Bild ${i}/${n} (${Math.round((Date.now() - t0) / 1000)} s)`);
  }
  await page.close();
  if (fehler.length) console.warn(`${name}: Fehler im Browser:`, fehler.join(" | "));
  // kodieren: H.264 (crf 31, PHORMA III mit seinem Korn 34: so bleibt es unter 6 MB), Poster bei 60 % der Dauer (oder wo der Effekt am besten zu sehen ist); mit Ton: AAC, ausgeblendet über die letzten 1,2 s wie im Export der App
  const mp4 = fileURLToPath(new URL(`${name}.mp4`, AUS)), poster = fileURLToPath(new URL(`${name}.jpg`, AUS));
  const filmDauer = n / FPS, tonArgs = [];
  if (ton) {
    const wavPfad = join(ordner, "ton.wav"); writeFileSync(wavPfad, ton);
    tonArgs.push("-i", wavPfad, "-c:a", "aac", "-b:a", "96k", "-af", `afade=t=out:st=${Math.max(0, filmDauer - 1.2).toFixed(3)}:d=1.2`, "-t", filmDauer.toFixed(3));
  }
  execFileSync("ffmpeg", ["-y", "-loglevel", "error", "-framerate", String(FPS), "-i", join(ordner, "%04d.jpg"), ...tonArgs, "-c:v", "libx264", "-preset", "slow", "-crf", String(crf), "-pix_fmt", "yuv420p", "-vf", "scale=540:-2", "-movflags", "+faststart", ...(ton ? [] : ["-an"]), mp4]);
  execFileSync("ffmpeg", ["-y", "-loglevel", "error", "-i", join(ordner, `${String(Math.min(n - 1, Math.round(n * posterBei))).padStart(4, "0")}.jpg`), "-q:v", "4", poster]);
  if (!process.env.BILDER_ORDNER) rmSync(ordner, { recursive: true, force: true });
  console.log(`${name}: ${dauer.toFixed(1)} s, ${n} Bilder in ${Math.round((Date.now() - t0) / 1000)} s · MP4 ${Math.round(statSync(mp4).size / 1024)} KB · Poster ${Math.round(statSync(poster).size / 1024)} KB`);
}

const foto = (datei) => ({ name: "beispiel.jpg", mimeType: "image/jpeg", buffer: readFileSync(new URL(datei, ROOT)) });

if (will("phorma-i")) {
  const html = readFileSync(new URL("alpha/bildfragmentieren/index.html", ROOT), "utf8"), v = version(html, "szene.js");
  await film("phorma-i", {
    seite: "/alpha/bildfragmentieren/",
    vorbereiten: async (page) => { await page.evaluate((v) => { document.documentElement.dataset.szene = v; }, v); await page.click('[data-ablauf="fragmente"]'); await page.setInputFiles("#datei", foto("alpha/bildfragmentieren/beispiel.jpg")); },
    bereit: (page) => page.waitForFunction(() => !document.getElementById("video").disabled && window.__bildfragmentieren?.sz, null, { timeout: 120_000 }),
    dauerFn: () => window.__bildfragmentieren.sz.zeit.dauer,
    bildFn: async ([t, w, h]) => {
      const { bild, szene } = await import(`./szene.js?v=${document.documentElement.dataset.szene}`);
      const S = window.__bildfragmentieren;
      window.__sz ??= szene(S.daten, { breite: S.mass[0], hoehe: S.mass[1], foto: S.foto, leinwand: (a, b) => new OffscreenCanvas(a, b), beschriftung: true });
      const c = (window.__c ??= Object.assign(document.createElement("canvas"), { width: w, height: h })), x = c.getContext("2d");
      x.setTransform(w / S.mass[0], 0, 0, h / S.mass[1], 0, 0);
      bild(x, window.__sz, t);
      return c.toDataURL("image/jpeg", 0.88);
    },
  }).catch((e) => console.error("phorma-i:", e.message));
}

// PHORMA II: je ein Effekt mit dem Beispielfoto der App; das Poster dort, wo der Effekt auf dem Foto liegt (bei 60 % ist es schon das Foto)
const POSTER = { physarum: 0.34, tuch: 0.37 };
for (const wahl of ["wachstum", "physarum", "tuch"]) {
  if (!will(`phorma-ii-${wahl}`)) continue;
  const html = readFileSync(new URL("alpha/phorma-ii/index.html", ROOT), "utf8"), v = version(html, "film.js") || version(readFileSync(new URL("alpha/phorma-ii/app.js", ROOT), "utf8"), "film.js");
  await film(`phorma-ii-${wahl}`, {
    seite: "/alpha/phorma-ii/", poster: POSTER[wahl],
    vorbereiten: async (page) => { await page.evaluate((v) => { document.documentElement.dataset.film = v; }, v); await page.click(`[data-wahl="${wahl}"]`); await page.setInputFiles("#datei", foto("alpha/phorma-ii/beispiel.jpg")); },
    bereit: (page) => page.waitForFunction((wahl) => window.__phorma?.sz && window.__phorma?.buehne && window.__phorma.buehneFertig && !document.getElementById("video").disabled && window.__phorma.sz.zeit.ablauf === wahl, wahl, { timeout: 600_000 }),
    dauerFn: () => window.__phorma.sz.zeit.dauer,
    bildFn: async ([t, w, h, proben]) => {
      const { bild } = await import(`./film.js?v=${document.documentElement.dataset.film}`);
      const S = window.__phorma; S.laeuft = false;
      const sz = { ...S.sz, buehne: S.buehne, beschriftung: true };
      const c = (window.__c ??= Object.assign(document.createElement("canvas"), { width: w, height: h })), x = c.getContext("2d");
      x.setTransform(w / S.mass[0], 0, 0, h / S.mass[1], 0, 0);
      bild(x, sz, t, { proben });
      return c.toDataURL("image/jpeg", 0.88);
    },
  }).catch((e) => console.error(`phorma-ii-${wahl}:`, e.message));
}

// PHORMA III: je ein Effekt zum gerechneten Musikstück («Nur Ton», Musik wie sie ist, Logo am Schluss)
for (const wahl of ["gewebe", "traube"]) {
  if (!will(`phorma-iii-${wahl}`)) continue;
  const v = version(readFileSync(new URL("alpha/phorma-iii/app.js", ROOT), "utf8"), "film.js"), ton = beispielton({ dauer: 28 });
  await film(`phorma-iii-${wahl}`, {
    seite: "/alpha/phorma-iii/",
    ton, crf: 34,
    vorbereiten: async (page) => {
      await page.evaluate((v) => { document.documentElement.dataset.film = v; }, v);
      await page.click('[data-quelle="ton"]'); await page.click('[data-tonart="musik"]'); await page.click(`[data-wahl="${wahl}"]`);
      await page.evaluate(() => { const k = document.getElementById("frickeln"); if (k.checked) k.click(); });
      await page.setInputFiles("#tondatei", { name: "beispiel.wav", mimeType: "audio/wav", buffer: ton });
    },
    bereit: (page) => page.waitForFunction((wahl) => { const S = window.__phorma; return S?.ton && S.sz && S.buehne && S.buehneFertig && !document.getElementById("video").disabled && S.sz.zeit.ablauf === wahl; }, wahl, { timeout: 600_000 }),
    dauerFn: () => window.__phorma.sz.zeit.dauer,
    bildFn: async ([t, w, h, proben]) => {
      const { bild } = await import(`./film.js?v=${document.documentElement.dataset.film}`);
      const S = window.__phorma; S.laeuft = false;
      const sz = { ...S.sz, buehne: S.buehne, beschriftung: true };
      const c = (window.__c ??= Object.assign(document.createElement("canvas"), { width: w, height: h })), x = c.getContext("2d");
      x.setTransform(w / S.mass[0], 0, 0, h / S.mass[1], 0, 0);
      bild(x, sz, t, { proben });
      return c.toDataURL("image/jpeg", 0.88);
    },
  }).catch((e) => console.error(`phorma-iii-${wahl}:`, e.message));
}

if (will("the-fictory")) {
  await film("the-fictory", {
    seite: "/alpha/the-fictory/",
    vorbereiten: async (page) => {
      await page.click("#beispiel");
      await page.waitForSelector("#erzeugen-werkbank:not([hidden])", { timeout: 120_000 });
      await page.click("#erzeugen-werkbank");
      await page.waitForFunction(() => window.fictoryTest?.S.lauf, null, { timeout: 60_000 });
      await page.evaluate(() => window.fictoryTest.S.lauf.bereit);   // der Worker hat den ganzen Lauf vorausgerechnet
      await page.evaluate(() => { const b = document.getElementById("daten"); if (b) b.hidden = true; });   // ohne die Datenebene
    },
    bereit: (page) => page.waitForFunction(() => window.fictoryTest?.S.lauf && !window.fictoryTest.S.spielt || true, null, { timeout: 60_000 }),
    dauerFn: () => window.fictoryTest.GESAMT / 30,
    bildFn: async ([t, w, h]) => {
      const T = window.fictoryTest; T.springe(Math.round(t * 30));
      const c0 = document.getElementById("buehne");
      const hh = Math.round(w * c0.height / c0.width);
      const c = (window.__c ??= Object.assign(document.createElement("canvas"), { width: w, height: hh })), x = c.getContext("2d");
      x.drawImage(c0, 0, 0, w, hh);
      return c.toDataURL("image/jpeg", 0.88);
    },
  }).catch((e) => console.error("the-fictory:", e.message));
}
await browser.close(); server.close();
