// Übernimmt eine redaktionelle Fassung der Konstellationen (CSV, Semikolon, UTF-8) unverändert
// in src/doppelspalt/src/data/constellations.ts. Texte und Fragen werden Zeichen für Zeichen
// übernommen; es wird nichts umgeschrieben, ergänzt oder weggelassen.
//
//   node --experimental-strip-types tools/import-konstellationen.ts src/doppelspalt/redaktion/<datei>.csv
//   node --experimental-strip-types tools/sync-doppelspalt-data.ts
//
// Spalten: nr;kuenstler_id;kuenstler;theoretiker_id;theoretiker;text;frage
// Der Import bricht ab, wenn eine Prüfung fehlschlägt, und schreibt dann nichts.
import { readFileSync, writeFileSync } from "node:fs";
import { artists } from "../src/doppelspalt/src/data/artists.ts";
import { theorists } from "../src/doppelspalt/src/data/theorists.ts";

const file = process.argv[2];
if (!file) throw new Error("Pfad zur CSV-Datei fehlt.");

/** CSV mit Semikolon, Anführungszeichen und Zeilenumbrüchen in Feldern (RFC 4180). */
function parseCsv(src: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [], field = "", quoted = false;
  for (let i = 0; i < src.length; i += 1) {
    const ch = src[i];
    if (quoted) {
      if (ch === '"' && src[i + 1] === '"') { field += '"'; i += 1; }
      else if (ch === '"') quoted = false;
      else field += ch;
    } else if (ch === '"') quoted = true;
    else if (ch === ";") { row.push(field); field = ""; }
    else if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && src[i + 1] === "\n") i += 1;
      row.push(field); rows.push(row); row = []; field = "";
    } else field += ch;
  }
  if (field !== "" || row.length) { row.push(field); rows.push(row); }
  return rows.filter(r => r.some(c => c !== ""));
}

const [header, ...body] = parseCsv(readFileSync(file, "utf8").replace(/^﻿/, ""));
const cols = ["nr", "kuenstler_id", "kuenstler", "theoretiker_id", "theoretiker", "text", "frage"];
if (header.join(";") !== cols.join(";")) throw new Error(`Unerwartete Spalten: ${header.join(";")}`);

const A = new Map(artists.map(p => [p.id, p.name]));
const T = new Map(theorists.map(p => [p.id, p.name]));
const errors: string[] = [];
const seen = new Map<string, number>();

const records = body.map((cells, i) => {
  if (cells.length !== cols.length) errors.push(`Zeile ${i + 2}: ${cells.length} statt ${cols.length} Spalten`);
  const [nr, artistId, artistName, theoristId, theoristName, text, question] = cells;
  const n = Number(nr);
  if (!Number.isInteger(n)) errors.push(`Zeile ${i + 2}: ungültige Nummer "${nr}"`);
  if (!A.has(artistId)) errors.push(`#${nr}: unbekannte kuenstler_id "${artistId}"`);
  else if (A.get(artistId) !== artistName) errors.push(`#${nr}: Name "${artistName}" passt nicht zu ${artistId}`);
  if (!T.has(theoristId)) errors.push(`#${nr}: unbekannte theoretiker_id "${theoristId}"`);
  else if (T.get(theoristId) !== theoristName) errors.push(`#${nr}: Name "${theoristName}" passt nicht zu ${theoristId}`);
  if (!text?.trim()) errors.push(`#${nr}: Text leer`);
  if (!question?.trim()) errors.push(`#${nr}: Frage leer`);
  const pairKey = `${artistId}__${theoristId}`;
  if (seen.has(pairKey)) errors.push(`#${nr}: Paar ${pairKey} schon in #${seen.get(pairKey)}`);
  seen.set(pairKey, n);
  return { editorialNumber: n, id: pairKey, pairKey, artistId, theoristId, text, question };
});
const nums = records.map(r => r.editorialNumber);
if (new Set(nums).size !== nums.length) errors.push("Nummern nicht eindeutig");
if (errors.length) throw new Error(`Import abgebrochen:\n- ${errors.join("\n- ")}`);

const src = readFileSync(new URL("../src/doppelspalt/src/data/constellations.ts", import.meta.url), "utf8");
const typeBlock = src.slice(0, src.indexOf("export const constellations"));
const q = (s: string) => JSON.stringify(s);
const out = typeBlock +
  `// Redaktionelle Fassung: ${file.split("/").pop()} (${records.length} Konstellationen), importiert mit tools/import-konstellationen.ts.\n` +
  "export const constellations: readonly Constellation[] = [\n" +
  records.map(r => [
    "  {",
    `    editorialNumber: ${r.editorialNumber},`,
    `    id: ${q(r.id)},`,
    `    pairKey: ${q(r.pairKey)},`,
    `    artistId: ${q(r.artistId)},`,
    `    theoristId: ${q(r.theoristId)},`,
    `    text: ${q(r.text)},`,
    `    question: ${q(r.question)},`,
    "  },",
  ].join("\n")).join("\n") + "\n];\n";
writeFileSync(new URL("../src/doppelspalt/src/data/constellations.ts", import.meta.url), out);
console.log(`importiert: ${records.length} Konstellationen, ${seen.size} eindeutige Paare`);
