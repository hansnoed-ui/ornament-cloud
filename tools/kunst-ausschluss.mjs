// «Kunst» (alpha/kunst/): Beiträge, die nicht auf die Seite kommen, auch wenn sie in der Auswahl stehen. tools/build-kunst.mjs wendet die Liste
// bei jedem Neubau an, tools/kunst-ausschluss.mjs allein (ohne Export) auf den vorhandenen Bestand.
//   13. November 2026, Christian: «im Facebook-Hypertext gibt es insgesamt 4 einträge zu "corona" (krise). Bitte rausnehmen»; auf die Frage
//   nach dem Umfang: «B» = alle Beiträge, in denen «Corona» vorkommt (damals 18), nicht aber solche, die nur Pandemie oder Impfung nennen.
//
//   node tools/kunst-ausschluss.mjs        wendet den Ausschluss auf alpha/kunst/beitraege.js an
import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

export const MUSTER = [/corona/i];
export const ausgeschlossen = (t) => MUSTER.some((m) => m.test(t));

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const datei = new URL("../alpha/kunst/beitraege.js", import.meta.url);
  const alt = readFileSync(datei, "utf8");
  const zeilen = alt.split("\n");
  const neu = zeilen.filter((z) => { if (!z.startsWith("  {")) return true; const b = JSON.parse(z.replace(/,$/, "")); return !ausgeschlossen(b.t); });
  // das Komma nach der letzten Zeile der Liste entfernen
  const ende = neu.lastIndexOf("];");
  neu[ende - 1] = neu[ende - 1].replace(/,$/, "");
  writeFileSync(datei, neu.join("\n"));
  console.log(`alpha/kunst/beitraege.js: ${zeilen.length - neu.length} Beiträge ausgeschlossen`);
}
