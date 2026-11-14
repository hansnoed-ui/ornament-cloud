// Daten des Videos «Zettel 33 · Das Publikum»: liest die Strophe 33 unverändert aus src/data/zu-seiner-zeit.json
// und teilt den Text in seine Sätze. Erzeugt src/publikum/data/publikum.json – nicht von Hand bearbeiten, nicht eingecheckt.
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";

const hier = (p) => new URL(p, import.meta.url);
const zsz = JSON.parse(readFileSync(hier("../../../data/zu-seiner-zeit.json"), "utf8"));
const s = zsz.stanzas.find((x) => x.number === 33);
if (!s) throw new Error("Strophe 33 fehlt");

const saetze = s.text.match(/[^.!?]+[.!?]+(\s+|$)/g).map((x) => x.trim());
if (saetze.join(" ") !== s.text) throw new Error("Sätze weichen vom Text ab");
if (saetze.length !== 8) throw new Error(`8 Sätze erwartet, ${saetze.length} gefunden (der Zeitplan im Video folgt der Stimme)`);

mkdirSync(hier("data/"), { recursive: true });
writeFileSync(hier("data/publikum.json"), JSON.stringify({ nummer: s.number, titel: s.title, zyklus: s.cycle.name, saetze, leitsatz: s.bottom_line }, null, 1));
console.log("publikum: 8 Sätze, Leitsatz");
