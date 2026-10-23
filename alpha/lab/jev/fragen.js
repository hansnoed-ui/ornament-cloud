// ORNAMENT LAB – jev für die Wahl der nächsten Operation und für die Dramaturgie einer Animation aus Bild und Klang (seit Lab 0.1.11),
// beides Entscheidungsform CHOICE. Für die Seite (jev.js); die Zwischenstelle wahl.php
// (PHP auf dem Webspace) hat dieselben Regeln und denselben Wortlaut, tests/lab-jev-php.test.mjs hält beide gleich. Die Lage enthält nur Kennungen aus einem festen Katalog, keine freien Texte, keine Bilder.
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
  "lab.profil": "Kompositorisches Profil: misst Schwerpunkt, Symmetrie, Lichtverteilung, Kontrast, Sättigung und Kantenrichtung des Bildes (Beobachtung)",
  "lab.komposition": "Komposition verändern: verstärkt, hebt auf oder kehrt um, was das Profil misst, etwa Symmetrie, Lichtgefälle oder Sättigung (räumliche Operation)",
  "lab.glitch": "Glitch: Blöcke zeigen Inhalt von anderer Stelle, Zeilen verrutschen, Farbkanäle trennen sich (räumliche Operation)",
  "lab.pixelsortierung": "Pixelsortierung: Abschnitte zwischen zwei Helligkeitsschwellen werden sortiert, das Bild zerfliesst in Streifen (räumliche Operation)",
  "lab.verzerrung": "Optische Verzerrung: Wirbel, Linse, Welle, Kaleidoskop oder Versetzen nach Helligkeit (räumliche Operation)",
  "lab.licht": "Licht: helle Stellen glühen oder streichen zu Lichtfahnen aus (räumliche Operation)",
  "lab.raster": "Raster und Linien: das Bild wird zu Punkten, Linien, Schraffur, Wellenlinien oder Mosaik (räumliche Operation)",
  "lab.neusetzen": "Zerlegen und neu setzen: Kacheln oder Streifen werden zufällig, nach Helligkeit oder umgekehrt neu geordnet (räumliche Operation)",
});

const KENNUNG = /^[a-z]+\.[a-z0-9-]+$/;

/** fester Katalog der Dramaturgien für eine Animation von 30 Sekunden aus Bild und Klang (kern/vorschlag.js hat die Schritte dazu) */
export const DRAMATURGIEN = Object.freeze({
  "vorschlag.puls": "Puls: sechs Varianten einer Feedback-Schleife, deren Zoom der Lautstärke folgt; harte Schnitte zwischen ihnen auf den Anschlägen des Klangs",
  "vorschlag.zerfall": "Zerfall: das Bild zerfällt in Farbflächen und setzt sich in sechs Zuständen neu zusammen (The Fictory); ruhige Übergänge, bei denen die dunklen Stellen zuerst erscheinen",
  "vorschlag.spiegel": "Spiegelung: die Symmetrie des Bildes wird verstärkt oder umgekehrt, je nach Lautstärke des Klangs; weiche Überblendungen im Takt der Anschläge",
  "vorschlag.farbwelle": "Farbwelle: die Farben drehen sich mit der Lautstärke durch den Farbkreis, in acht Varianten; Überblendungen im Takt der Anschläge",
  "vorschlag.raster": "Vervielfältigung: das Bild wird im Raster wiederholt, die Grösse der Kopien folgt der Lautstärke; Schnitte im Takt der Anschläge",
  "vorschlag.steigerung": "Steigerung: drei Operationen nacheinander (Farbe, Wiederholung, Feedback), das Bild verwandelt sich schrittweise immer weiter; lange, ruhige Übergänge",
});

/** gemessene Merkmale in festen Stufen: so sieht jev weder Bild noch Klang, nur diese Wörter (kern/vorschlag.js misst sie) */
export const MERKMALE = Object.freeze({
  bild: Object.freeze({
    kontrast: { niedrig: "Kontrast niedrig", mittel: "Kontrast mittel", hoch: "Kontrast hoch" },
    farbigkeit: { grau: "fast ohne Farbe", gedaempft: "gedämpfte Farben", bunt: "kräftige Farben" },
    symmetrie: { symmetrisch: "nahezu spiegelgleich", asymmetrisch: "deutlich asymmetrisch" },
    helligkeit: { dunkel: "eher dunkel", mittel: "mittlere Helligkeit", hell: "eher hell" },
  }),
  klang: Object.freeze({
    dichte: { ruhig: "wenige Anschläge (weniger als einer je zwei Sekunden)", bewegt: "regelmässige Anschläge (etwa einer bis zwei je Sekunde)", dicht: "dichte Anschläge (mehr als zwei je Sekunde)" },
    dynamik: { gleichmaessig: "die Lautstärke bleibt etwa gleich", anschwellend: "wird über die Zeit lauter", abschwellend: "wird über die Zeit leiser", wechselhaft: "die Lautstärke wechselt stark" },
  }),
});
const MERKMAL_SCHLUESSEL = [...Object.keys(MERKMALE.bild), ...Object.keys(MERKMALE.klang)];
const merkmalText = (k, v) => MERKMALE.bild[k]?.[v] ?? MERKMALE.klang[k]?.[v];

/**
 * eine Lage prüfen und bereinigen. Zwei feste Fragen:
 *   { verlauf: [Kennungen, höchstens 8], optionen: [Operationen aus KATALOG, 2–6] }                      nächste Operation
 *   { frage: "dramaturgie", merkmale: { alle Schlüssel aus MERKMALE, je eine Stufe }, optionen: [aus DRAMATURGIEN, 2–6] }
 */
export function labLage(roh) {
  if (!roh || typeof roh !== "object" || Array.isArray(roh)) throw new Error("Lage fehlt");
  if (roh.frage === "dramaturgie") return dramaturgieLage(roh);
  const fremd = Object.keys(roh).filter((k) => !["verlauf", "optionen"].includes(k));
  if (fremd.length) throw new Error(`unbekannte Felder: ${fremd.join(", ")}`);
  const verlauf = Array.isArray(roh.verlauf) ? roh.verlauf.slice(-8) : [];
  if (!verlauf.every((k) => typeof k === "string" && KENNUNG.test(k))) throw new Error("Verlauf enthält ungültige Kennungen");
  const optionen = [...new Set(Array.isArray(roh.optionen) ? roh.optionen : [])];
  if (optionen.length < 2 || optionen.length > 6 || !optionen.every((k) => KATALOG[k])) throw new Error("Optionen müssen 2–6 Kennungen aus dem Katalog sein");
  return { verlauf, optionen };
}

function dramaturgieLage(roh) {
  const fremd = Object.keys(roh).filter((k) => !["frage", "merkmale", "optionen"].includes(k));
  if (fremd.length) throw new Error(`unbekannte Felder: ${fremd.join(", ")}`);
  const m = roh.merkmale;
  if (!m || typeof m !== "object" || Array.isArray(m)) throw new Error("Merkmale fehlen");
  const fremdeMerkmale = Object.keys(m).filter((k) => !MERKMAL_SCHLUESSEL.includes(k));
  if (fremdeMerkmale.length) throw new Error(`unbekannte Merkmale: ${fremdeMerkmale.join(", ")}`);
  const merkmale = {};
  for (const k of MERKMAL_SCHLUESSEL) {
    if (typeof m[k] !== "string" || !Object.hasOwn(MERKMALE.bild[k] ?? MERKMALE.klang[k], m[k])) throw new Error(`Merkmal ${k} fehlt oder hat keine gültige Stufe`);
    merkmale[k] = m[k];
  }
  const optionen = [...new Set(Array.isArray(roh.optionen) ? roh.optionen : [])];
  if (optionen.length < 2 || optionen.length > 6 || !optionen.every((k) => typeof k === "string" && Object.hasOwn(DRAMATURGIEN, k))) throw new Error("Optionen müssen 2–6 Dramaturgien aus dem Katalog sein");
  return { frage: "dramaturgie", merkmale, optionen };
}

export const FRAGE_DRAMATURGIE = "In einem künstlerischen Labor sollen ein Bild und ein Klang zu einer Animation von 30 Sekunden werden; der Klang ist die Tonspur. Gemessen wurden nur die genannten Merkmale. Bei welcher der folgenden Dramaturgien geht die Bewegung am ehesten aus diesem Bild und diesem Klang hervor, statt ihnen von aussen übergestülpt zu werden?";

/** feste Frage an jev aus einer geprüften Lage */
export function labFrage(lage) {
  if (lage.frage === "dramaturgie") {
    const zeile = (gruppe) => Object.keys(MERKMALE[gruppe]).map((k) => merkmalText(k, lage.merkmale[k])).join("; ");
    return {
      zustand: { labor: "ORNAMENT LAB, Animation aus Bild und Klang", bild: zeile("bild"), klang: zeile("klang") },
      fragen: { wahl: { type: "choice", instructions: FRAGE_DRAMATURGIE, criteria: Object.fromEntries(lage.optionen.map((k) => [k, DRAMATURGIEN[k]])) } },
    };
  }
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
