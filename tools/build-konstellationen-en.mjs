// Die 326 Konstellationen von ORNA auf Englisch (20. Oktober 2026, Wunsch: «auch alle downloadbaren Apps … doppelsprachig deutsch/englisch»; Entscheid:
// «Alles, auch die 326 Konstellationen»). Quelle: src/doppelspalt/src/data/en/konstellationen-*.json (je Datei ein Teil, Schlüssel die ID, Werte text und
// question); dieses Werkzeug prüft, dass jede Konstellation aus constellations.ts genau einmal übersetzt ist, und schreibt
// portfolio/nebeneinander-nacheinander/js/data/constellations.en.js, das wheel.js und feld/feld.js laden. Namen bleiben, wie sie sind.
//
//   node tools/build-konstellationen-en.mjs
import { readFileSync, writeFileSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";

const ROOT = new URL("../", import.meta.url);
const QUELLE = new URL("src/doppelspalt/src/data/en/", ROOT);
export const ZIEL = new URL("portfolio/nebeneinander-nacheinander/js/data/constellations.en.js", ROOT);

/** die IDs aus constellations.ts, in der Reihenfolge der Datei */
export function ids() {
  const t = readFileSync(new URL("src/doppelspalt/src/data/constellations.ts", ROOT), "utf8");
  return [...t.matchAll(/editorialNumber: \d+,\s*id: "([^"]+)"/g)].map((m) => m[1]);
}

/** alle Teile zusammen: { id: { text, question } } */
export function lesen() {
  const alle = {};
  for (const f of readdirSync(QUELLE).filter((n) => /^konstellationen-\d+\.json$/.test(n)).sort()) {
    const teil = JSON.parse(readFileSync(new URL(f, QUELLE), "utf8"));
    for (const [id, u] of Object.entries(teil)) {
      if (alle[id]) throw new Error(`${f}: ${id} doppelt`);
      if (!u || typeof u.text !== "string" || typeof u.question !== "string" || !u.text.trim() || !u.question.trim()) throw new Error(`${f}: ${id} ohne text oder question`);
      alle[id] = { text: u.text, question: u.question };
    }
  }
  return alle;
}

export function pruefen(alle = lesen()) {
  const soll = ids(), fehlt = soll.filter((id) => !alle[id]), zuviel = Object.keys(alle).filter((id) => !soll.includes(id));
  if (fehlt.length || zuviel.length) throw new Error(`Konstellationen auf Englisch: ${fehlt.length} fehlen (${fehlt.slice(0, 5).join(", ")}${fehlt.length > 5 ? " …" : ""}), ${zuviel.length} unbekannt (${zuviel.slice(0, 5).join(", ")})`);
  return soll.map((id) => [id, alle[id]]);
}

export function bauen() {
  const liste = pruefen();
  return `// Erzeugt von tools/build-konstellationen-en.mjs aus src/doppelspalt/src/data/en/. Nicht von Hand bearbeiten.\n// Die ${liste.length} Konstellationen von ORNA auf Englisch: je ID text und question; Namen und Adressen wie im Original.\nexport const constellationsEn = ${JSON.stringify(Object.fromEntries(liste), null, 1)};\n`;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const js = bauen();
  writeFileSync(ZIEL, js);
  console.log(`geschrieben: ${fileURLToPath(ZIEL)} (${ids().length} Konstellationen)`);
}
