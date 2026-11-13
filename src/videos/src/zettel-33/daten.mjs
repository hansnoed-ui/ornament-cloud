// Daten des Films «Zettel 33 – Das Publikum»: Titel, Zyklus, Text und Leitsatz unverändert aus src/data/zu-seiner-zeit.json,
// der Text in Sätze geteilt (jeder Abschnitt wird gegen den Text geprüft). Dazu die Tonspur: Christians Stimme (ornament-studio, Lauf
// «zettel-33-ruhig-2», von ihm am 13. November 2026 freigegeben: «Ist ok»). Sie liegt nicht in diesem Repository; der Pfad kommt aus
// STIMME_ZETTEL_33 oder dem Nachbar-Repository ../ornament-studio/ablage/. Erzeugt src/zettel-33/data/zettel.json und public/zettel-33/stimme.mp3.
import { copyFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import process from "node:process";

const hier = (p) => new URL(p, import.meta.url);
const daten = JSON.parse(readFileSync(hier("../../../../src/data/zu-seiner-zeit.json"), "utf8"));
const z = daten.stanzas.find((s) => s.number === 33);

// Abschnitte, wie sie gesprochen werden (Beginn in Sekunden der Tonspur, aus der Stille zwischen den Sätzen gemessen)
const ABSCHNITTE = [
  [3.97, "Ein Publikum ist keine Menge, die dasselbe sieht."],
  [7.16, "Wahrnehmung bleibt unübertragbar; niemand kann die Farbe, Spannung oder Langeweile eines anderen übernehmen."],
  [13.83, "Gemeinsamkeit entsteht deshalb nicht im Erleben, sondern in den Anschlüssen daran."],
  [19.54, "Menschen vergleichen, erzählen, widersprechen, kehren zurück und lernen dabei, auf anderes empfindlich zu werden."],
  [26.9, "Das Publikum vereinigt Wahrnehmungen nicht."],
  [29.66, "Es kultiviert Bedingungen, unter denen getrennte Wahrnehmungen einander irritieren und verändern können."],
  [35.72, "Darin liegt seine eigentümliche Sozialität: Man muss nicht dasselbe gesehen haben, um an demselben Werk anders weiterzusehen."],
  [43.05, "Öffentlichkeit beginnt dort, wo Differenz nicht beseitigt, sondern als veränderbare Empfindlichkeit wiederverwendet wird."],
];
if (ABSCHNITTE.map(([, t]) => t).join(" ") !== z.text) throw new Error("Die Abschnitte weichen vom Text des Zettels ab");

mkdirSync(hier("data/"), { recursive: true });
writeFileSync(hier("data/zettel.json"), JSON.stringify({
  nummer: z.number, titel: z.title, zyklus: `${z.cycle.roman} ${z.cycle.name}`, leitsatz: z.bottom_line,
  abschnitte: ABSCHNITTE.map(([ab, text]) => ({ ab, text })), sprechEnde: 48.64,
}, null, 1));

const stimme = process.env.STIMME_ZETTEL_33 || fileURLToPath(hier("../../../../../ornament-studio/ablage/stimme-zettel-33-ruhig-2/stimme.mp3"));
mkdirSync(hier("../../public/zettel-33/"), { recursive: true });
if (existsSync(stimme)) copyFileSync(stimme, hier("../../public/zettel-33/stimme.mp3"));
else console.warn(`zettel-33: Tonspur fehlt (${stimme}); der Film wird ohne Ton gerendert`);
