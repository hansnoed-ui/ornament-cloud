// ORNAMENT LAB – jev für die Wahl der nächsten Operation (Entscheidungsform CHOICE). Gemeinsam für die Seite (jev.js) und den
// vorgeschlagenen Worker (worker-entwurf.js): Die Lage enthält nur Kennungen aus einem festen Katalog, keine freien Texte, keine Bilder.
// Die Frage hat einen festen Wortlaut; jev liefert Wahrscheinlichkeiten je Option. Das ist eine technische Entscheidungshilfe,
// kein Urteil über die Arbeit: der Mensch nimmt an, verwirft oder ändert (Masterprompt §11).

/** fester Katalog: Kennung → Beschreibung für jev (muss zum Register passen, tests/lab.test.mjs prüft das) */
export const KATALOG = Object.freeze({
  "fictory.prozess": "The Fictory: das Bild zerfällt in Teile, ordnet sich in sechs Operationen neu und setzt sich wieder zusammen (zeitliche Operation)",
  "lab.feedback": "Feedback: das Ergebnis wird wiederholt auf sich selbst angewandt, gezoomt, gedreht und farblich verschoben (rekursive Operation)",
  "lab.wiederholung": "Wiederholung mit Falloff: das Bild wird im Raster wiederholt, Grösse und Drehung verteilen sich über die Lage (räumliche Operation)",
  "lab.farbe": "Farbe modulieren: Farbdrehung, Sättigung, Kontrast, Tonwertstufen (räumliche Operation auf den Farben)",
  "lab.bildsignal": "Bildsignal: ein Merkmal des Bildes wird zu einem Steuersignal für andere Operationen (Kopplung)",
  "lab.differenz": "Differenz: zeigt und misst den Unterschied zu einem anderen Zustand (Beobachtung)",
});

const KENNUNG = /^[a-z]+\.[a-z0-9-]+$/;

/** eine Lage prüfen und bereinigen: { verlauf: [Kennungen, höchstens 8], optionen: [Kennungen aus dem Katalog, 2–6] } */
export function labLage(roh) {
  if (!roh || typeof roh !== "object" || Array.isArray(roh)) throw new Error("Lage fehlt");
  const fremd = Object.keys(roh).filter((k) => !["verlauf", "optionen"].includes(k));
  if (fremd.length) throw new Error(`unbekannte Felder: ${fremd.join(", ")}`);
  const verlauf = Array.isArray(roh.verlauf) ? roh.verlauf.slice(-8) : [];
  if (!verlauf.every((k) => typeof k === "string" && KENNUNG.test(k))) throw new Error("Verlauf enthält ungültige Kennungen");
  const optionen = [...new Set(Array.isArray(roh.optionen) ? roh.optionen : [])];
  if (optionen.length < 2 || optionen.length > 6 || !optionen.every((k) => KATALOG[k])) throw new Error("Optionen müssen 2–6 Kennungen aus dem Katalog sein");
  return { verlauf, optionen };
}

/** feste Frage an jev aus einer geprüften Lage */
export function labFrage(lage) {
  const bisher = lage.verlauf.length ? lage.verlauf.map((k, i) => `${i + 1}. ${KATALOG[k] ?? k}`).join("\n") : "noch keine Operation; nur das Ausgangsbild";
  return {
    zustand: { labor: "ORNAMENT LAB, experimentelle Bildoperationen", bisherigerVerlauf: bisher },
    fragen: {
      wahl: {
        type: "choice",
        instructions: "In einem künstlerischen Labor wird ein Bild schrittweise durch Operationen verändert; jedes Ergebnis kann weitergeführt werden. Welche der folgenden Operationen eröffnet als nächster Schritt am ehesten eine Fortsetzung, die sich vom bisherigen Verlauf deutlich unterscheidet, statt ihn nur zu wiederholen?",
        criteria: Object.fromEntries(lage.optionen.map((k) => [k, KATALOG[k]])),
      },
    },
  };
}
