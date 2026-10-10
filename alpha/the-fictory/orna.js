// «The Fictory» – optionale ORNA-Konstellation. Gezogen wird wie in ORNA: gleichverteilt über den ganzen kuratierten Bestand
// (crypto.getRandomValues, Rejection Sampling, nie dieselbe zweimal unmittelbar hintereinander; REGELN §3), aus den Daten von ORNA, die
// hier nur gelesen werden. Aus der gezogenen Konstellation wird EINE Operationsregel (regeln.js) für den ganzen Lauf abgeleitet:
// mit der jev-Tabelle (jev.js, beim Bauen erzeugt), sonst über Stichworte im Text. Der Gedanke ist immer ein unveränderter Satz des Textes.
// Die Ableitung ist eine gestalterische Interpretation; eine schwierige Passung bleibt als solche stehen.
import { constellations } from "../../portfolio/nebeneinander-nacheinander/js/data/constellations.js";
import { artists } from "../../portfolio/nebeneinander-nacheinander/js/data/artists.js";
import { theorists } from "../../portfolio/nebeneinander-nacheinander/js/data/theorists.js";
import { drawConstellation } from "../../portfolio/nebeneinander-nacheinander/js/lib/random.js";
import { REGELN, REGEL_IDS, saetze, pruefsumme } from "./regeln.js?v=7";
import { JEV } from "./jev.js?v=7";
import { zufall } from "./analyse.js?v=7";

export const BESTAND = constellations.length;
export const jevGueltig = () => Boolean(JEV && JEV.pruefsumme === pruefsumme(constellations) && JEV.eintraege);

/** Konstellation aus dem Bestand (Text und Frage unverändert) */
export const konstellation = (id) => constellations.find((c) => c.id === id) ?? null;

const person = (id) => [...artists, ...theorists].find((p) => p.id === id)?.name ?? id;

/** neue Ziehung: Konstellation und Zufallsstartwert für den ganzen Lauf */
export function ziehe(vorher = null) {
  const k = drawConstellation(constellations, vorher ?? undefined);
  const b = new Uint32Array(1);
  crypto.getRandomValues(b);
  return { id: k.id, seed: b[0] };
}

/** gewichtete Ziehung mit reproduzierbarem Zufall */
function gewichtet(r, eintraege) {
  const summe = eintraege.reduce((s, [, w]) => s + w, 0);
  let x = r() * summe;
  for (const [k, w] of eintraege) { x -= w; if (x <= 0) return k; }
  return eintraege[eintraege.length - 1][0];
}

/** Ableitung: Konstellation (Kennung) und Startwert → Regel, Gedanke (Satz), Herkunft, Passung */
export function ableiten(id, seed) {
  const k = constellations.find((c) => c.id === id);
  if (!k) throw new Error(`Konstellation nicht im Bestand: ${id}`);
  const s = saetze(k.text);
  const r = zufall((seed ^ 0xa5a5a5a5) >>> 0);
  const basis = {
    konstellation: { id: k.id, nummer: k.editorialNumber, kuenstler: person(k.artistId), theoretiker: person(k.theoristId), frage: k.question },
    herkunft: `ORNA, «Nebeneinander, Nacheinander»: kuratierter Bestand von ${BESTAND} Konstellationen, Datensatz ${k.id} (redaktionelle Nummer ${k.editorialNumber})`,
  };
  if (jevGueltig() && JEV.eintraege[id]) {
    const e = JEV.eintraege[id];
    const kandidaten = REGEL_IDS.map((rid) => [rid, e.regel[rid] ?? 0]).filter(([, p]) => p >= 0.05);
    const regel = kandidaten.length ? gewichtet(r, kandidaten) : REGEL_IDS.reduce((a, b) => ((e.regel[b] ?? 0) > (e.regel[a] ?? 0) ? b : a));
    const p = e.regel[regel] ?? 0;
    const satzNr = Math.min(s.length - 1, Math.max(0, e.satz[regel] ?? 0));
    return { ...basis, regel, satz: s[satzNr], satzNr, quelle: "jev", wahrscheinlichkeit: p,
      passung: p >= 0.4 ? "naheliegend" : p >= 0.15 ? "möglich" : "schwierig",
      begruendung: `jev (${JEV.modell}, beim Bauen am ${JEV.stand}) hielt diese Regel für ${p >= 0.4 ? "naheliegend" : p >= 0.15 ? "möglich" : "eine schwierige Passung"}; gezogen wurde mit dem Startwert aus den Einschätzungen von jev, gewichtet.` };
  }
  // ohne jev-Tabelle: Stichworte der Regeln im Text zählen
  const klein = s.map((t) => t.toLowerCase());
  const treffer = REGEL_IDS.map((rid) => [rid, klein.map((t) => REGELN[rid].stichworte.filter((w) => t.includes(w)).length)]);
  const kandidaten = treffer.map(([rid, je]) => [rid, je.reduce((a, b) => a + b, 0)]).filter(([, n]) => n > 0);
  if (!kandidaten.length) {
    const regel = REGEL_IDS[Math.floor(r() * REGEL_IDS.length)];
    return { ...basis, regel, satz: null, satzNr: null, quelle: "zufall", passung: "offen",
      begruendung: "Kein Satz enthält ein Stichwort einer Regel; die Regel ist ohne Beleg im Text gezogen. Die Passung bleibt offen." };
  }
  const regel = gewichtet(r, kandidaten);
  const je = treffer.find(([rid]) => rid === regel)[1];
  const satzNr = je.indexOf(Math.max(...je));
  const n = kandidaten.find(([rid]) => rid === regel)[1];
  return { ...basis, regel, satz: s[satzNr], satzNr, quelle: "stichworte", treffer: n, passung: n >= 3 ? "naheliegend" : n === 2 ? "möglich" : "schwierig",
    begruendung: `Zuordnung über Stichworte der Regel im Text (${n} Treffer), ohne jev; gezogen mit dem Startwert, gewichtet nach Treffern.` };
}
