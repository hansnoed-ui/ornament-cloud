// Daten des ORNA-Videos: liest Namen, Paarungen, die 40 Zeichen und die Konstellation Hesse × Star direkt aus der Website.
// Erzeugt src/orna/data/orna.json – nicht von Hand bearbeiten, nicht eingecheckt. Läuft mit «npm run vorbereiten».
import { artists } from "../../../../portfolio/nebeneinander-nacheinander/js/data/artists.js";
import { theorists } from "../../../../portfolio/nebeneinander-nacheinander/js/data/theorists.js";
import { constellations } from "../../../../portfolio/nebeneinander-nacheinander/js/data/constellations.js";
import { symbolMarkup } from "../../../../portfolio/nebeneinander-nacheinander/js/symbols.js";
import { mkdirSync, writeFileSync } from "node:fs";

const hier = (p) => new URL(p, import.meta.url);

/** die ersten n Sätze eines Texts, unverändert */
function auszug(text, n) {
  const saetze = text.match(/[^.!?]+[.!?]+(\s+|$)/g);
  const teil = saetze.slice(0, n).join("").trim();
  if (!text.startsWith(teil)) throw new Error("Auszug weicht vom Text ab");
  return teil;
}

const ai = Object.fromEntries(artists.map((p, i) => [p.id, i]));
const ti = Object.fromEntries(theorists.map((p, i) => [p.id, i]));
// die Konstellation, auf der das Rad im Video stehen bleibt (Beispiel aus dem Werkbericht)
const beispiel = constellations.find((c) => c.artistId === "eva-hesse" && c.theoristId === "susan-leigh-star");

mkdirSync(hier("data/"), { recursive: true });
writeFileSync(hier("data/orna.json"), JSON.stringify({
  artists: artists.map((p) => p.name),
  theorists: theorists.map((p) => p.name),
  symbols: Array.from({ length: 40 }, (_, i) => symbolMarkup(i, 1)),
  pairs: constellations.map((c) => [ai[c.artistId], ti[c.theoristId]]),
  count: constellations.length,
  // Auszug für die Textszene: die ersten beiden Sätze, Wort für Wort aus dem Text der Konstellation (im Video mit «[…]» als Auszug gekennzeichnet)
  beispiel: { a: ai[beispiel.artistId], t: ti[beispiel.theoristId], question: beispiel.question, auszug: auszug(beispiel.text, 2) },
}));

console.log(`orna: ${artists.length} + ${theorists.length} Personen, ${constellations.length} Konstellationen`);
