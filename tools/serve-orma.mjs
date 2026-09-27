// Vorschau von ORMA: liefert den Produktionsbuild (src/orma/dist/) unter /orma/ aus und daneben die
// Website mit ORNA unter / – dieselbe Adresse wie später, damit die Trennung von Speicher und Caches
// sichtbar geprüft werden kann. Ohne Abhängigkeiten.
//
//   node --experimental-strip-types tools/build-orma.ts && node tools/serve-orma.mjs [port]
//   → http://localhost:8766/orma/
import { createServer } from "node:http";
import { readFile, stat } from "node:fs/promises";
import { join, normalize, extname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = fileURLToPath(new URL("../", import.meta.url));
const DIST = join(ROOT, "src/orma/dist");
const TYPES = { ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".css": "text/css; charset=utf-8",
  ".json": "application/json", ".webmanifest": "application/manifest+json", ".png": "image/png", ".svg": "image/svg+xml", ".woff2": "font/woff2" };

export function startServer(port = 8766) {
  const server = createServer(async (req, res) => {
    const path = decodeURIComponent(new URL(req.url, "http://x").pathname);
    const [base, rest] = path.startsWith("/orma/") ? [DIST, path.slice(6)] : path === "/orma" ? [null, ""] : [ROOT, path.slice(1)];
    if (!base) { res.writeHead(301, { location: "/orma/" }); res.end(); return; }
    let file = normalize(join(base, rest));
    if (!file.startsWith(base)) { res.writeHead(403); res.end(); return; }
    try {
      if ((await stat(file)).isDirectory()) file = join(file, "index.html");
      const body = await readFile(file);
      res.writeHead(200, { "content-type": TYPES[extname(file)] || "application/octet-stream", "cache-control": "no-cache" });
      res.end(body);
    } catch { res.writeHead(404); res.end("nicht gefunden"); }
  });
  return new Promise(resolve => server.listen(port, "127.0.0.1", () => resolve(server)));
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const port = Number(process.argv[2]) || 8766;
  await startServer(port);
  console.log(`ORMA-Vorschau: http://localhost:${port}/orma/  (ORNA: http://localhost:${port}/portfolio/nebeneinander-nacheinander/app/)`);
}
