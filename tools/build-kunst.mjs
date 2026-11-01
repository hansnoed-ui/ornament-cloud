// «Kunst» (alpha/kunst/): schreibt alpha/kunst/beitraege.js aus der Auswahl, die auf Christians Rechner aus dem Facebook-Export entsteht.
// Nur Beiträge, die Christian freigegeben hat, kommen ins Repository (es ist öffentlich).
//
//   node tools/build-kunst.mjs <auswahl.json> [--nur <kennungen.txt>]
//
// <auswahl.json>: Liste von Beiträgen mit Kennung, Datum und Text; erkannt werden die Feldnamen
//   Kennung: id | i     Datum: datetime | date | d (ISO oder Unix-Sekunden)     Text: text | t
// --nur: eine Datei mit einer Kennung je Zeile; dann nur diese Beiträge.
// Danach, wenn sich der Bestand geändert hat: tools/build-jev-kunst.ts (jev bewertet die neuen Beiträge; alte Werte bleiben im Zwischenspeicher).
import { readFileSync, writeFileSync } from "node:fs";

const [, , quelle, ...rest] = process.argv;
if (!quelle) { console.error("Aufruf: node tools/build-kunst.mjs <auswahl.json> [--nur <kennungen.txt>]"); process.exit(2); }
const nurDatei = rest[rest.indexOf("--nur") + 1];
const nur = rest.includes("--nur") ? new Set(readFileSync(nurDatei, "utf8").split(/\r?\n/).map((z) => z.trim()).filter(Boolean)) : null;

const roh = JSON.parse(readFileSync(quelle, "utf8"));
const liste = Array.isArray(roh) ? roh : roh.beitraege ?? roh.posts ?? [];
const tag = (v) => {
  if (typeof v === "number") return new Date(v * 1000).toISOString().slice(0, 10);
  const d = String(v ?? "").slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(d)) throw new Error(`Datum nicht erkannt: ${v}`);
  return d;
};
const beitraege = liste
  .map((b) => ({ i: String(b.id ?? b.i), d: tag(b.datetime ?? b.date ?? b.d ?? b.timestamp), t: String(b.text ?? b.t ?? "").replace(/\r\n?/g, "\n").trim() }))
  .filter((b) => b.t && (!nur || nur.has(b.i)))
  .sort((a, b) => a.d.localeCompare(b.d) || a.i.localeCompare(b.i));
const doppelt = beitraege.find((b, k) => k && b.i === beitraege[k - 1].i);
if (doppelt) throw new Error(`Kennung doppelt: ${doppelt.i}`);

const heute = new Date().toISOString().slice(0, 10);
const inhalt =
  `// Automatisch erzeugt von tools/build-kunst.mjs – nicht von Hand bearbeiten.\n` +
  `// Facebook-Beiträge von Christian Strickler mit dem Stichwort «Kunst», nur die von ihm freigegebenen.\n` +
  `// Felder: i = Kennung aus dem Export, d = Datum (JJJJ-MM-TT), t = Text.\n` +
  `export const STAND = ${JSON.stringify(heute)};\n` +
  `export const BEITRAEGE = [\n${beitraege.map((b) => "  " + JSON.stringify(b)).join(",\n")}\n];\n`;
writeFileSync(new URL("../alpha/kunst/beitraege.js", import.meta.url), inhalt);
console.log(`alpha/kunst/beitraege.js: ${beitraege.length} Beiträge (${(inhalt.length / 1024).toFixed(0)} KB)`);
