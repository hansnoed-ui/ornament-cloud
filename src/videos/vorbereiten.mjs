// Bereitet alle Videos vor: kopiert die Schriften der Website (vendor/fonts/) nach public/
// und führt jedes src/<video>/daten.mjs aus (liest Daten unverändert aus der Website, schreibt src/<video>/data/).
import { copyFileSync, existsSync, mkdirSync, readdirSync } from "node:fs";

const hier = (p) => new URL(p, import.meta.url);
const SCHRIFTEN = ["newsreader-normal-latin.woff2", "newsreader-italic-latin.woff2", "instrument-sans-normal-latin.woff2"];

mkdirSync(hier("public/"), { recursive: true });
for (const s of SCHRIFTEN) copyFileSync(hier(`../../vendor/fonts/${s}`), hier(`public/${s}`));

for (const d of readdirSync(hier("src/"), { withFileTypes: true })) {
  if (d.isDirectory() && existsSync(hier(`src/${d.name}/daten.mjs`))) await import(hier(`src/${d.name}/daten.mjs`).href);
}
