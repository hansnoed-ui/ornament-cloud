// Erzeugt die Browser-Datendateien des Werks „Nebeneinander, Nacheinander“ maschinell aus den
// TypeScript-Originalen des Produktionspakets (src/doppelspalt). Keine Handübertragung von Texten.
//
//   node --experimental-strip-types tools/sync-doppelspalt-data.ts
//
import { writeFileSync } from "node:fs";
import { artists } from "../src/doppelspalt/src/data/artists.ts";
import { theorists } from "../src/doppelspalt/src/data/theorists.ts";
import { constellations } from "../src/doppelspalt/src/data/constellations.ts";

const out = new URL("../portfolio/nebeneinander-nacheinander/js/data/", import.meta.url);
const head = (src: string) =>
  `// Automatisch erzeugt aus src/doppelspalt/src/data/${src} – nicht von Hand bearbeiten.\n` +
  `// Texte und Fragen sind Teil des Werks und bleiben unverändert.\n`;
const write = (file: string, name: string, src: string, data: unknown) =>
  writeFileSync(new URL(file, out), head(src) + `export const ${name} = Object.freeze(` + JSON.stringify(data, null, 2) + ");\n");

write("artists.js", "artists", "artists.ts", artists);
write("theorists.js", "theorists", "theorists.ts", theorists);
write("constellations.js", "constellations", "constellations.ts", constellations);
console.log(`geschrieben: ${artists.length} Künstler, ${theorists.length} Theoretiker, ${constellations.length} Konstellationen`);
