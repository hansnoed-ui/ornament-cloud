// Daten des Videos «Zettel 15 · Die Adresse» (14. November 2026): Nummer, Titel, Zyklus, Text und Leitsatz unverändert aus
// src/data/zu-seiner-zeit.json, der Text in seine Sätze geteilt (geprüft gegen den Text). Dazu die Zeiten der Sätze in der Tonspur
// (Sekunden, aus den Pausen gemessen) und die Tonspur selbst: Christians Stimme (ornament-studio, Lauf «zettel-15-ruhig»); sie liegt nicht
// in diesem Repository. Pfad aus STIMME_ZETTEL_15 oder dem Nachbar-Repository ../ornament-studio/ablage/. Schreibt src/adresse/data/adresse.json
// und public/adresse/stimme.mp3 (beides nicht eingecheckt).
import { copyFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import process from "node:process";

const hier = (p) => new URL(p, import.meta.url);
const z = JSON.parse(readFileSync(hier("../../../data/zu-seiner-zeit.json"), "utf8")).stanzas.find((s) => s.number === 15);
const saetze = z.text.match(/[^.!?]+[.!?]+(\s+|$)/g).map((x) => x.trim());
if (saetze.join(" ") !== z.text) throw new Error("adresse: Sätze weichen vom Text ab");

// [Beginn, Ende] je Satz in Sekunden der Tonspur; titel: «Zettel fünfzehn. Die Adresse.»; ende: letzte Silbe
const ZEITEN = { titel: [0, 4.04], saetze: [[4.66, 10.23], [10.7, 18.55], [19.68, 23.49], [23.92, 28.26], [28.86, 36.74], [37.16, 41.43], [41.85, 47.61]], ende: 47.61 };   // gemessen: silencedetect -36 dB, 0,15 s
if (ZEITEN.saetze.length !== saetze.length) throw new Error(`adresse: ${saetze.length} Sätze, aber ${ZEITEN.saetze.length} Zeiten`);

mkdirSync(hier("data/"), { recursive: true });
writeFileSync(hier("data/adresse.json"), JSON.stringify({ nummer: z.number, titel: z.title, zyklus: z.cycle.name, saetze, leitsatz: z.bottom_line, zeiten: ZEITEN }, null, 1));

const stimme = process.env.STIMME_ZETTEL_15 || fileURLToPath(hier("../../../../../ornament-studio/ablage/stimme-zettel-15-ruhig/stimme.mp3"));
mkdirSync(hier("../../public/adresse/"), { recursive: true });
if (existsSync(stimme)) copyFileSync(stimme, hier("../../public/adresse/stimme.mp3"));
else console.warn(`adresse: Tonspur fehlt (${stimme}); das Video wird ohne Ton gerendert`);
console.log(`adresse: ${saetze.length} Sätze, Leitsatz`);
