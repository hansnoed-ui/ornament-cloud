// Social Media (seit 19. Oktober 2026): erzeugt alle Seiten des Bereichs aus social-media/daten/eintraege.json – mit demselben Modul,
// mit dem die Redaktion im Browser veröffentlicht (social-media/js/darstellung.js). Nötig nach Änderungen an darstellung.js oder von Hand an den Daten;
// tests/social-media.test.mjs meldet, wenn es vergessen ging.
//   node tools/build-social-media.mjs                      (Seiten, Feed, Sitemap)
//   node tools/build-social-media.mjs --daten <json> --ziel <ordner>   (Vorschau mit anderen Daten in einen anderen Ordner, ohne Sitemap)
import { readFileSync, writeFileSync, mkdirSync, readdirSync, rmSync, existsSync, cpSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { alleSeiten, sitemapEinsetzen, pruefen, BEREICH } from "../social-media/js/darstellung.js";

const ROOT = fileURLToPath(new URL("../", import.meta.url));
const arg = (n) => { const i = process.argv.indexOf(n); return i > 0 ? process.argv[i + 1] : null; };
const datenDatei = resolve(ROOT, arg("--daten") ?? `${BEREICH}daten/eintraege.json`);
const ziel = arg("--ziel") ? resolve(arg("--ziel")) : ROOT;
const daten = JSON.parse(readFileSync(datenDatei, "utf8"));

const fehler = daten.eintraege.flatMap((e) => pruefen(e, daten.eintraege).map((f) => `Zettel ${e.nr}: ${f}`));
if (fehler.length) { console.error(fehler.join("\n")); process.exit(1); }

const seiten = alleSeiten(daten);
for (const [pfad, inhalt] of seiten) {
  const datei = join(ziel, pfad);
  mkdirSync(dirname(datei), { recursive: true });
  writeFileSync(datei, inhalt);
}
// Seiten von Zetteln, die es nicht mehr gibt
const ids = new Set(daten.eintraege.map((e) => e.id));
for (const e of readdirSync(join(ziel, BEREICH), { withFileTypes: true })) {
  if (e.isDirectory() && /^\d+-/.test(e.name) && !ids.has(e.name)) { rmSync(join(ziel, BEREICH, e.name), { recursive: true }); console.log(`− ${BEREICH}${e.name}/`); }
}
if (ziel === ROOT) {
  const sm = join(ROOT, "sitemap.xml");
  writeFileSync(sm, sitemapEinsetzen(readFileSync(sm, "utf8"), daten.eintraege));
} else {
  // Vorschau: dazu, was die Seiten brauchen (Gestaltung, Skripte, Schriften, Medien der Beispieldaten)
  for (const p of ["styles.css", "icons.js", "kopfleiste.js", "vendor/fonts", "vendor/goatcounter", `${BEREICH}social.css`, `${BEREICH}js`]) cpSync(join(ROOT, p), join(ziel, p), { recursive: true });
  const medien = join(dirname(datenDatei), "medien");
  if (existsSync(medien)) cpSync(medien, join(ziel, BEREICH, "medien"), { recursive: true });
}
console.log(`${seiten.size} Dateien, ${daten.eintraege.length} Zettel → ${ziel === ROOT ? BEREICH : ziel}`);
