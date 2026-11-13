// Fotografien des Neubaus (13. November 2026, Christian: «Nimm noch etwas zum Thema Fotographie: Angebote/Werke»). Die Vorlagen liegen unter
// src/b/fotos/<slug>.jpg (längste Seite höchstens 2400 px; src/ geht nicht auf den Webspace), die Angaben in src/b/fotos.mjs. Dieses Werkzeug schreibt
// je Bild zwei Grössen nach b/bilder/fotografie/ (<slug>-1600.jpg und <slug>-800.jpg, längste Seite) und die Masse nach src/b/fotos.json.
// Braucht ffmpeg und ffprobe.
//
//   node tools/b-fotos.mjs                 alle
//   node tools/b-fotos.mjs meer            einzelne
import { execFileSync } from "node:child_process";
import { mkdirSync, writeFileSync, existsSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { resolve } from "node:path";
import { FOTOS, AUSSTELLUNG, PRINTS } from "../src/b/fotos.mjs";

const ROOT = new URL("../", import.meta.url), pfad = (p) => fileURLToPath(new URL(p, ROOT));
export const GROESSEN = [1600, 800];

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  mkdirSync(pfad("b/bilder/fotografie/"), { recursive: true });
  const nur = process.argv.slice(2), massDatei = pfad("src/b/fotos.json");
  const mass = existsSync(massDatei) ? JSON.parse(readFileSync(massDatei, "utf8")) : {};
  for (const f of [...FOTOS, ...AUSSTELLUNG, ...PRINTS]) {
    if (nur.length && !nur.includes(f.slug)) continue;
    const quelle = pfad(`src/b/fotos/${f.slug}.jpg`);
    const [b, h] = execFileSync("ffprobe", ["-v", "error", "-select_streams", "v:0", "-show_entries", "stream=width,height", "-of", "csv=p=0", quelle]).toString().trim().split(",").map(Number);
    mass[f.slug] = [b, h];
    for (const g of GROESSEN) {
      const skala = b >= h ? `scale=${Math.min(g, b)}:-2:flags=lanczos` : `scale=-2:${Math.min(g, h)}:flags=lanczos`;
      execFileSync("ffmpeg", ["-loglevel", "error", "-y", "-i", quelle, "-vf", skala, "-q:v", g === 1600 ? (f.klein ? "5" : "3") : "4", pfad(`b/bilder/fotografie/${f.slug}-${g}.jpg`)]);
    }
    console.log(`${f.slug}: ${b} × ${h}`);
  }
  writeFileSync(massDatei, JSON.stringify(mass, null, 1) + "\n");
}
