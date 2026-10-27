// rendert Blicke auf ein GLB mit fahrt.html in Chromium (Playwright, ohne Grafikkarte über SwiftShader) und schreibt PNGs
//   node render.mjs probe <verfahren>                  → acht Winkel nach ../data/probe-<verfahren>/
//   node render.mjs fahrt <verfahren> [startWinkel]    → 300 Bilder einer vollen Umdrehung nach public/fahrt-<verfahren>/ (f0000.png …)
// Umgebung: THREE = Ordner des Pakets three (0.185.1), NODE_PATH mit playwright; MATERIAL=gips (nur Form) oder matt (Textur ohne Metall)
import { createServer } from "node:http";
import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { createRequire } from "node:module";
import { join, extname } from "node:path";
import { fileURLToPath } from "node:url";
const require = createRequire(import.meta.url);
const { chromium } = require(join(globalThis.process.env.NODE_PATH ?? "", "playwright"));
const hier = fileURLToPath(new URL(".", import.meta.url)), daten = join(hier, "..", "data"), THREE = globalThis.process.env.THREE;
if (!THREE || !existsSync(join(THREE, "build", "three.module.js"))) throw new Error("THREE muss auf das Paket three zeigen (npm i three@0.185.1 in einem Ordner ausserhalb)");
const TYP = { ".html": "text/html", ".js": "text/javascript", ".glb": "model/gltf-binary", ".png": "image/png" };
const server = createServer((req, res) => {
  const p = decodeURIComponent(new URL(req.url, "http://x").pathname);
  const datei = p.startsWith("/three/") ? join(THREE, p.slice(7)) : p === "/3d/fahrt.html" ? join(hier, "fahrt.html") : p.startsWith("/3d/") ? join(daten, p.slice(4)) : null;
  if (!datei || !existsSync(datei)) { res.writeHead(404); res.end(); return; }
  res.writeHead(200, { "content-type": TYP[extname(datei)] ?? "application/octet-stream" }); res.end(readFileSync(datei));
}).listen(0);
const [art = "probe", verfahren = "trellis", startWinkel = "0"] = globalThis.process.argv.slice(2);
const ziel = art === "probe" ? join(daten, `probe-${verfahren}`) : join(hier, "..", "..", "..", "public", `fahrt-${verfahren}`);
mkdirSync(ziel, { recursive: true });
const b = await chromium.launch({ args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader"] });
const p = await b.newPage({ viewport: { width: 1080, height: 1350 } });
p.on("pageerror", (e) => console.log("pageerror", e.message));
p.on("requestfailed", (r) => console.log("requestfailed", r.url(), r.failure()?.errorText));
await p.goto(`http://localhost:${server.address().port}/3d/fahrt.html?glb=/3d/${verfahren}.glb${globalThis.process.env.MATERIAL ? `&material=${globalThis.process.env.MATERIAL}` : ""}`);
await p.waitForFunction(() => globalThis.bereit, null, { timeout: 120000 });
console.log("Masse", JSON.stringify(await p.evaluate(() => globalThis.fahrt.masse)));
const speichern = async (name, winkel, hoehe) => {
  const url = await p.evaluate(([w, h]) => { globalThis.fahrt.bild(w, h); return globalThis.fahrt.png(); }, [winkel, hoehe]);
  writeFileSync(join(ziel, name), globalThis.Buffer.from(url.split(",")[1], "base64"));
};
if (art === "probe") for (let w = 0; w < 360; w += 45) await speichern(`probe-${String(w).padStart(3, "0")}.png`, w, 12);
else {
  // Kamera auf der Kreisbahn, die Höhe pendelt einmal zwischen 8° und 16°
  const N = 300, s0 = Number(startWinkel);
  for (let i = 0; i < N; i++) { await speichern(`f${String(i).padStart(4, "0")}.png`, s0 + (360 * i) / N, 12 + 4 * Math.sin((2 * Math.PI * i) / N)); if (i % 50 === 0) console.log(i); }
}
await b.close(); server.close(); console.log("fertig", ziel);
