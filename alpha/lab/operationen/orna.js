// ORNAMENT LAB – Adapter für ORNA (Konstellation). Liest den kuratierten Bestand von ORNA und benutzt die Ziehung und die Ableitung
// einer Operationsregel aus The Fictory unverändert (alpha/the-fictory/orna.js): gezogen wird gleichverteilt wie in ORNA, die Regel kommt
// aus der jev-Tabelle (beim Bauen von The Fictory erzeugt), sonst über Stichworte, sonst per Zufall. Texte bleiben unverändert.
// Jede dieser Wahlen wird mit ihrer Art protokolliert: Ziehung = Zufall, eigene Wahl = Mensch, Regel aus der Tabelle = jev, Stichworte = Regel.
import { constellations } from "../../../portfolio/nebeneinander-nacheinander/js/data/constellations.js";
import { artists } from "../../../portfolio/nebeneinander-nacheinander/js/data/artists.js";
import { theorists } from "../../../portfolio/nebeneinander-nacheinander/js/data/theorists.js";
import { ziehe, ableiten, konstellation, BESTAND } from "../../../alpha/the-fictory/orna.js";
import { REGELN } from "../../../alpha/the-fictory/regeln.js?v=23";
import { JEV } from "../../../alpha/the-fictory/jev.js?v=23";

const person = (id) => [...artists, ...theorists].find((p) => p.id === id)?.name ?? id;
export const KONSTELLATIONEN = constellations.map((k) => ({ wert: k.id, name: `${k.editorialNumber}. ${person(k.artistId)} × ${person(k.theoristId)}` }));

export const orna = {
  id: "orna.konstellation",
  name: "ORNA-Konstellation",
  version: "0.1.0",
  klasse: "selektion",
  herkunft: { art: "adapter", quelle: "ORNA (Nebeneinander, Nacheinander) und The Fictory", datei: "alpha/the-fictory/orna.js, portfolio/nebeneinander-nacheinander/js/data/", referenz: null },
  beschreibung: `Zieht eine Konstellation aus dem Bestand von ${BESTAND} (oder nimmt eine gewählte) und leitet daraus eine Operationsregel R1–R7 für The Fictory ab.`,
  eingaenge: [],
  ausgaenge: [{ name: "konstellation", typ: "CONSTELLATION" }],
  parameter: [
    { id: "konstellation", name: "Konstellation", art: "wahl", standard: "", optionen: [{ wert: "", name: "per Zufall ziehen (wie in ORNA)" }, ...KONSTELLATIONEN] },
  ],
  voraussetzungen: ["crypto.getRandomValues"],
  ressourcen: { zeit: "sofort", speicher: "gering" },
  reproduzierbar: "bedingt",   // die Ziehung ist echter Zufall; mit Kennung und Startwert ist die Ableitung reproduzierbar
  varianten: "keine",

  async ausfuehren(_, p, kontext = {}) {
    const entscheidungen = [];
    let id, seed;
    if (p.konstellation) {
      id = p.konstellation; seed = (kontext.seed ?? 1) >>> 0;
      entscheidungen.push({ art: "mensch", gegenstand: "konstellation", gewaehlt: id, details: { bestand: BESTAND } });
    } else {
      const z = ziehe(kontext.vorherigeKonstellation ?? null);
      id = z.id; seed = z.seed;
      entscheidungen.push({ art: "zufall", gegenstand: "konstellation", gewaehlt: id, details: { verfahren: "ORNA-Ziehung: gleichverteilt, crypto.getRandomValues, nie dieselbe zweimal hintereinander", bestand: BESTAND, startwert: seed } });
    }
    const a = ableiten(id, seed);
    const art = a.quelle === "jev" ? "jev" : a.quelle === "stichworte" ? "regel" : "zufall";
    entscheidungen.push({
      art, gegenstand: "operationsregel", optionen: Object.keys(REGELN), gewaehlt: a.regel,
      details: {
        quelle: a.quelle, passung: a.passung, begruendung: a.begruendung, satzNummer: a.satzNr === null ? null : a.satzNr + 1,
        ...(art === "jev" ? { modell: JEV.modell, stand: JEV.stand, wahrscheinlichkeit: a.wahrscheinlichkeit, wahrscheinlichkeiten: JEV.eintraege[id]?.regel, gezogenMitStartwert: seed, hinweis: "Tabelle aus dem Bau von The Fictory; das Lab ruft jev dafür nicht auf" } : {}),
      },
    });
    const k = konstellation(id);
    return {
      ausgaben: [{
        typ: "CONSTELLATION", titel: `${a.konstellation.nummer}. ${a.konstellation.kuenstler} × ${a.konstellation.theoretiker}`,
        daten: {
          id, startwert: seed, nummer: a.konstellation.nummer, kuenstler: a.konstellation.kuenstler, theoretiker: a.konstellation.theoretiker,
          text: k.text, frage: k.question, gedanke: a.satz, regel: a.regel, regelName: REGELN[a.regel].name, eingriff: REGELN[a.regel].eingriff,
          quelle: a.quelle, passung: a.passung, herkunft: a.herkunft, kennzeichnung: "gestalterische Interpretation, keine Aussage über die Personen",
        },
      }],
      entscheidungen,
      protokoll: { regel: a.regel, quelle: a.quelle, passung: a.passung },
    };
  },
};
