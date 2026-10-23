// Schreibt docs/OPERATIONEN.md aus dem Register (die Beschreibungen der Operationen sind die Quelle).
//   node src/lab/werkzeuge/operationsverzeichnis.mjs
import { writeFileSync } from "node:fs";
import { labRegister } from "../operationen/index.js";
import { KLASSEN } from "../kern/register.js";
import { TYPEN } from "../kern/typen.js";

const R = labRegister();
const zeile = (p) => p.art === "zahl" ? `${p.min} … ${p.max}, Standard ${p.standard}` : p.art === "wahl" ? (p.optionen.length > 8 ? `${p.optionen.length} Optionen, Standard «${p.optionen.find((o) => o.wert === p.standard).name}»` : p.optionen.map((o) => (o.wert === p.standard ? `**${o.name}**` : o.name)).join(" / ")) : `ein/aus, Standard ${p.standard ? "ein" : "aus"}`;
let md = `# Operationsverzeichnis – ORNAMENT LAB 0.1\n\nErzeugt aus dem Register mit \`node src/lab/werkzeuge/operationsverzeichnis.mjs\`. Die Beschreibungen in \`src/lab/operationen/\` sind die Quelle.\n\n`;
md += `| Kennung | Name | Klasse | Herkunft | Eingänge → Ausgänge | Varianten |\n|---|---|---|---|---|---|\n`;
for (const op of R.alle()) md += `| \`${op.id}\` ${op.version} | ${op.name} | ${KLASSEN[op.klasse]} | ${op.herkunft.art === "adapter" ? `Adapter: ${op.herkunft.quelle}` : `neu, nach ${op.herkunft.referenz}`} | ${op.eingaenge.map((e) => `${TYPEN[e.typ].name}${e.optional ? " (opt.)" : ""}`).join(" + ") || "–"} → ${op.ausgaenge.map((e) => TYPEN[e.typ].name).join(", ")} | ${{ moduliert: "über Modulation", selbst: "erzeugt selbst mehrere", keine: "eine" }[op.varianten]} |\n`;
for (const op of R.alle()) {
  md += `\n## ${op.name} (\`${op.id}\`)\n\n${op.beschreibung}\n\n`;
  md += `- **Herkunft:** ${op.herkunft.art === "adapter" ? `Adapter, ${op.herkunft.quelle}` : "neu im Lab"}; Datei ${op.herkunft.datei}${op.herkunft.referenz ? `; Prinzip nach ${op.herkunft.referenz}` : ""}\n`;
  md += `- **Voraussetzungen:** ${op.voraussetzungen.length ? op.voraussetzungen.join(", ") : "keine (läuft auch in Node)"}\n- **Ressourcen:** ${op.ressourcen.zeit}; Speicher: ${op.ressourcen.speicher}\n- **Reproduzierbar:** ${op.reproduzierbar}${op.verlauf ? "\n- **Eigener Verlauf** (Bildfolge für Animation): ja" : ""}\n\n| Parameter | Bereich |\n|---|---|\n`;
  for (const p of op.parameter) md += `| ${p.name} (\`${p.id}\`) | ${zeile(p)}${p.hilfe ? ` – ${p.hilfe}` : ""} |\n`;
}
writeFileSync(new URL("../docs/OPERATIONEN.md", import.meta.url), md);
console.log(`docs/OPERATIONEN.md: ${R.alle().length} Operationen`);
