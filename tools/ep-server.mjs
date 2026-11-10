// Lokaler Test der Hörseite: liefert die Website aus und beantwortet Range-Anfragen mit 206 Partial Content wie Apache bei Hostpoint,
// damit Springen zu späteren Tracks auch lokal vor dem vollständigen Laden geht. Ohne Abhängigkeiten.
//
//   node tools/ep-server.mjs [port] [wurzel]   → http://localhost:8795/listen/directer/
//   (auf dem Telefon im selben WLAN: http://<IP des Rechners>:8795/listen/directer/)
import { createServer } from "node:http";
import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import { join, normalize, extname, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

const TYPEN = { ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".mjs": "text/javascript; charset=utf-8", ".css": "text/css; charset=utf-8",
  ".json": "application/json", ".svg": "image/svg+xml", ".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".webp": "image/webp",
  ".wav": "audio/wav", ".mp3": "audio/mpeg", ".woff2": "font/woff2" };

/** "bytes=a-b" → [anfang, ende] (einschliesslich) oder null bei ungültig/nicht erfüllbar */
export function bereich(kopf, groesse) {
  const m = /^bytes=(\d*)-(\d*)$/.exec((kopf || "").trim());
  if (!m || (m[1] === "" && m[2] === "")) return null;
  let a, b;
  if (m[1] === "") { a = Math.max(groesse - Number(m[2]), 0); b = groesse - 1; }
  else { a = Number(m[1]); b = m[2] === "" ? groesse - 1 : Math.min(Number(m[2]), groesse - 1); }
  return a <= b && a < groesse ? [a, b] : null;
}

export function startServer(port = 8795, wurzel = fileURLToPath(new URL("../", import.meta.url))) {
  const basis = resolve(wurzel);
  const server = createServer(async (req, res) => {
    let datei;
    try {
      const pfad = decodeURIComponent(new URL(req.url, "http://x").pathname);
      datei = normalize(join(basis, pfad));
      if (datei !== basis && !datei.startsWith(basis + sep)) { res.writeHead(403); res.end(); return; }
      let st = await stat(datei);
      if (st.isDirectory()) {
        if (!pfad.endsWith("/")) { res.writeHead(301, { location: pfad + "/" }); res.end(); return; }
        datei = join(datei, "index.html"); st = await stat(datei);
      }
      const kopf = { "content-type": TYPEN[extname(datei).toLowerCase()] || "application/octet-stream", "cache-control": "no-cache", "accept-ranges": "bytes" };
      if (req.headers.range) {
        const r = bereich(req.headers.range, st.size);
        if (!r) { res.writeHead(416, { ...kopf, "content-range": `bytes */${st.size}` }); res.end(); return; }
        res.writeHead(206, { ...kopf, "content-range": `bytes ${r[0]}-${r[1]}/${st.size}`, "content-length": r[1] - r[0] + 1 });
        if (req.method === "HEAD") { res.end(); return; }
        createReadStream(datei, { start: r[0], end: r[1] }).pipe(res);
        return;
      }
      res.writeHead(200, { ...kopf, "content-length": st.size });
      if (req.method === "HEAD") { res.end(); return; }
      createReadStream(datei).pipe(res);
    } catch { if (!res.headersSent) { res.writeHead(404, { "content-type": "text/plain; charset=utf-8" }); res.end("nicht gefunden"); } }
  });
  return new Promise((ok) => server.listen(port, "0.0.0.0", () => ok(server)));
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const port = Number(process.argv[2]) || 8795;
  await startServer(port, process.argv[3]);
  console.log(`Hörseite: http://localhost:${port}/listen/directer/`);
}
