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
  "phorma.gewebe": "PHORMA Gewebe: die Umrisse des Bildes werden zu Flächen aus feinen Linien, die ein Ton bewegt (zeitliche Operation, eigene Bühne)",
  "phorma.irrfahrt": "PHORMA Irrfahrt: ein Faden irrt durch einen Würfel aus Licht und quillt mit der Musik zu Rauch auf (zeitliche Operation, eigene Bühne)",
  "phorma.lichtwuerfel": "PHORMA Lichtwürfel: ein Faden irrt in einem festen Würfel aus Licht (zeitliche Operation, eigene Bühne)",
  "phorma.traube": "PHORMA Traube: glänzende Perlen in einer Kugel aus Fäden, Schnitte im Takt des Tons (zeitliche Operation, eigene Bühne)",
  "phorma.ii": "PHORMA II: Physarum, Tiefe, Wellenwanne, Tuch, Rasterdruck oder Montage, einzeln oder als Kette (zeitliche Operation, eigene Bühne)",
  "phorma.i": "PHORMA I: Fragmente oder die Verwandlung aus Strom, Körper, Scherben, Echo, Relief (zeitliche Operation, eigene Bühne)",
  "sketchory.satz": "Sketchory: das Foto einer Kritzelkarte wird zur Strichzeichnung, die sich Strich für Strich zeichnet, dann ein Satz Buchstabe für Buchstabe (zeitliche Operation, eigene Bühne)",
});

const KENNUNG = /^[a-z]+\.[a-z0-9-]+$/;

/**
 * fester Katalog der Dramaturgien für eine Animation von 30 Sekunden aus Bild und Klang (kern/vorschlag.js hat die Schritte dazu).
 * Seit Lab 0.1.20 vorerst nur Dramaturgien aus lebendigen Effekten (medien/gpu.js): Zerfall (The Fictory) und Spiegelung (Komposition) sind
 * Standbilder mit Kamera und stehen einem fliessenden Film wie bei PHORMA entgegen (Christian, 24. Oktober 2026); ihre Operationen bleiben im Register.
 */
export const DRAMATURGIEN = Object.freeze({
  "vorschlag.puls": "Puls: sechs Varianten einer Feedback-Schleife, deren Zoom der Lautstärke folgt; harte Schnitte zwischen ihnen auf den Anschlägen des Klangs",
  "vorschlag.farbwelle": "Farbwelle: die Farben drehen sich mit der Lautstärke durch den Farbkreis, in acht Varianten; Überblendungen im Takt der Anschläge",
  "vorschlag.raster": "Vervielfältigung: das Bild wird im Raster wiederholt, die Grösse der Kopien folgt der Lautstärke; Schnitte im Takt der Anschläge",
  "vorschlag.zerfall": "Zerfall: das Bild zerfällt in Farbflächen und setzt sich in sechs Zuständen neu zusammen (The Fictory); ruhige Übergänge, bei denen die dunklen Stellen zuerst erscheinen",
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

/** Zusammenstellung durch jev (seit Lab 0.1.12): für jeden Abschnitt des Films ein Bildeffekt, dazu zwei Klangeffekte nacheinander,
    der Aufbau und der Übergang. Feste Kataloge, je eine CHOICE-Frage; die Zuordnung zu Operationen steht in kern/zusammenstellung.js */
export const ABSCHNITTE = 6;
// seit Lab 0.1.20 vorerst nur die sieben lebendigen Effekte (jedes Filmbild neu gerechnet, medien/gpu.js); Komposition, Pixelsortierung,
// Neu setzen und Zerfall (The Fictory) blieben Standbilder mit Kamera und stünden einem fliessenden Film entgegen (Christian, 24. Oktober 2026)
export const BILD_EFFEKTE = Object.freeze({
  "bild.feedback": "Feedback-Schleife: das Bild wird immer wieder auf sich selbst gelegt, gezoomt und gedreht, es entsteht ein Sog",
  "bild.wiederholung": "Wiederholung: das Bild vervielfacht sich im Raster, die Kopien werden grösser und kleiner",
  "bild.farbe": "Farbe: die Farben drehen sich durch den Farbkreis und werden kräftiger",
  "bild.glitch": "Glitch: Blöcke verrutschen, Zeilen springen, Farbkanäle trennen sich",
  "bild.verzerrung": "Verzerrung: das Bild wird verwirbelt, gewellt oder wie durch eine Linse gesehen",
  "bild.licht": "Licht: helle Stellen glühen auf und strahlen aus",
  "bild.raster": "Raster: das Bild wird zu Punkten und Linien wie im Druck",
  // die Szenen von PHORMA III (seit Lab 0.1.21): eigene Welten aus dem Bild, die Grafikkarte rechnet jedes Bild aus der Zeit und dem Ton
  "bild.gewebe": "Gewebe: die Umrisse des Bildes werden zu Flächen aus feinen Linien, die der Ton bewegt, bei kräftigen Einsätzen neue Bilder (PHORMA)",
  "bild.irrfahrt": "Irrfahrt: ein Faden irrt durch einen Würfel aus Licht, quillt mit der Musik zu Rauch auf, bei Schlägen springt alles (PHORMA)",
  "bild.lichtwuerfel": "Lichtwürfel: ein Faden irrt in einem festen Würfel aus Licht, ruhiger als die Irrfahrt (PHORMA)",
  "bild.traube": "Traube: glänzende rote Perlen in einer Kugel aus Fäden, Schnitte im Takt, der Bass lässt sie glühen (PHORMA)",
  // PHORMA II (seit Lab 0.1.22, eine Operation mit Abläufen): die Grafikkarte rechnet jedes Bild aus der Zeit
  "bild.physarum": "Physarum: ein Schleimpilz wächst aus den markanten Stellen und findet die Formen des Bildes als Netz (PHORMA II)",
  "bild.tiefe": "Tiefe: ein Lichtscan tastet das Bild ab, es bekommt Relief und wird Raum (PHORMA II)",
  "bild.welle": "Wellenwanne: das Bild liegt unter Wasser, Dünung und Ringe brechen es, helle Linien glänzen (PHORMA II)",
  "bild.tuch": "Tuch: das Bild fällt als Seidentuch und legt sich glatt (PHORMA II)",
  "bild.druck": "Rasterdruck: das Bild wird zum Vierfarbendruck aus Punkten, die Platten rasten ein und bleiben versetzt (PHORMA II)",
  "bild.montage": "Montage: das Bild zerfällt in verschachtelte Rechtecke mit eigenen Ausschnitten, harte Schnitte im Takt (PHORMA II)",
  // PHORMA I (seit Lab 0.1.22, eine Operation mit Abläufen)
  "bild.fragmente": "Fragmente: Linien tasten das Bild ab, Dreiecke fliegen herein, Farben, das Foto rastet ein (PHORMA I)",
  "bild.strom": "Strom: Teilchen leuchten auf, ziehen zu Bändern und fliegen an ihren Platz (PHORMA I)",
  "bild.koerper": "Körper: drei Kristalle verschmelzen zu einem Glaskörper, der am Ende klar wird (PHORMA I)",
  "bild.scherben": "Scherben: das Bild bricht, die Scherben setzen sich neu zusammen (PHORMA I)",
  "bild.echo": "Echo: eine Rückkopplung zieht das Bild durch einen Tunnel, es baut sich aus Echos auf (PHORMA I)",
  "bild.relief": "Relief: Höhenlinien werden zu einem Gebirge aus dem Bild, das sich wieder flach legt (PHORMA I)",
  // The Fictory (seit Lab 0.1.22 wieder, lebendig: der Prozess läuft im Film von Zustand zu Zustand)
  "bild.zerfall": "Zerfall: das Bild zerfällt in Farbflächen und setzt sich in sechs Zuständen neu zusammen (The Fictory)",
});
export const KLANG_EFFEKTE = Object.freeze({
  "klang.keine": "nichts: der Klang bleibt, wie er ist",
  "klang.schneller": "schneller: das Tempo steigt um ein Viertel, die Tonhöhe bleibt",
  "klang.langsamer": "langsamer: das Tempo sinkt um ein Fünftel, die Tonhöhe bleibt",
  "klang.tiefer": "tiefer: die Tonhöhe sinkt um eine Quarte, das Tempo bleibt",
  "klang.zerlegt": "zerlegt: der Klang wird an seinen Anschlägen geschnitten und neu geordnet, mit Wiederholungen und Umkehrungen",
  "klang.rhythmus": "neu rhythmisiert: die Schnitte des Klangs werden auf ein neues, euklidisches Raster gesetzt",
  "klang.koerner": "Körner: der Klang wird in kleine Körner zerstäubt und zu einer Fläche von 30 Sekunden gestreckt",
});
export const AUFBAU = Object.freeze({
  "aufbau.kette": "Kette: jeder Abschnitt verwandelt das Ergebnis des vorigen weiter, das Bild entfernt sich immer mehr vom Anfang",
  "aufbau.faecher": "Fächer: jeder Abschnitt geht wieder vom Ausgangsbild aus, die Effekte stehen nebeneinander",
});
export const FILM_UEBERGAENGE = Object.freeze({
  "film.schnitt": "harte Schnitte auf den Anschlägen des Klangs",
  "film.blende": "weiche Überblendungen im Takt der Anschläge",
  "film.schwelle": "Übergänge, bei denen die dunklen Stellen des nächsten Bildes zuerst erscheinen",
});
const ABSCHNITT_NAMEN = ["Anfang", "Entfaltung", "Verdichtung", "Höhepunkt", "Umbruch", "Ausklang"];
export const KOMPOSITION_FRAGEN = Object.freeze({
  aufbau: { katalog: AUFBAU, text: "Wie sollen die Abschnitte aufeinander aufbauen?" },
  uebergang: { katalog: FILM_UEBERGAENGE, text: "Welche Art von Übergang zwischen den Bildern passt?" },
  klang1: { katalog: KLANG_EFFEKTE, text: "Welcher Klangeffekt soll zuerst auf den Klang wirken?" },
  klang2: { katalog: KLANG_EFFEKTE, text: "Welcher Klangeffekt soll danach auf das Ergebnis wirken?" },
  ...Object.fromEntries(ABSCHNITT_NAMEN.map((n, i) => [`bild${i + 1}`, { katalog: BILD_EFFEKTE, text: `Welcher Bildeffekt prägt Abschnitt ${i + 1} von ${ABSCHNITT_NAMEN.length} («${n}», etwa Sekunde ${i * 5} bis ${i * 5 + 5})?` }])),
});
export const FRAGE_KOMPOSITION = "In einem künstlerischen Labor stellt jev aus vielen Bild- und Klangeffekten eine Animation von 30 Sekunden aus einem Bild und einem Klang zusammen; der bearbeitete Klang ist die Tonspur. Gemessen wurden nur die genannten Merkmale. Die Zusammenstellung soll abwechslungsreich sein und aus diesem Bild und diesem Klang hervorgehen.";

/**
 * eine Lage prüfen und bereinigen. Drei feste Fragen:
 *   { verlauf: [Kennungen, höchstens 8], optionen: [Operationen aus KATALOG, 2–6] }                      nächste Operation
 *   { frage: "dramaturgie", merkmale: { alle Schlüssel aus MERKMALE, je eine Stufe }, optionen: [aus DRAMATURGIEN, 2–6] }
 *   { frage: "komposition", merkmale: { wie oben } }                     Zusammenstellung, die Optionen sind die festen Kataloge
 */
export function labLage(roh) {
  if (!roh || typeof roh !== "object" || Array.isArray(roh)) throw new Error("Lage fehlt");
  if (roh.frage === "dramaturgie") return dramaturgieLage(roh);
  if (roh.frage === "komposition") return kompositionLage(roh);
  const fremd = Object.keys(roh).filter((k) => !["verlauf", "optionen"].includes(k));
  if (fremd.length) throw new Error(`unbekannte Felder: ${fremd.join(", ")}`);
  const verlauf = Array.isArray(roh.verlauf) ? roh.verlauf.slice(-8) : [];
  if (!verlauf.every((k) => typeof k === "string" && KENNUNG.test(k))) throw new Error("Verlauf enthält ungültige Kennungen");
  const optionen = [...new Set(Array.isArray(roh.optionen) ? roh.optionen : [])];
  if (optionen.length < 2 || optionen.length > 6 || !optionen.every((k) => KATALOG[k])) throw new Error("Optionen müssen 2–6 Kennungen aus dem Katalog sein");
  return { verlauf, optionen };
}

function merkmaleLage(m) {
  if (!m || typeof m !== "object" || Array.isArray(m)) throw new Error("Merkmale fehlen");
  const fremdeMerkmale = Object.keys(m).filter((k) => !MERKMAL_SCHLUESSEL.includes(k));
  if (fremdeMerkmale.length) throw new Error(`unbekannte Merkmale: ${fremdeMerkmale.join(", ")}`);
  const merkmale = {};
  for (const k of MERKMAL_SCHLUESSEL) {
    if (typeof m[k] !== "string" || !Object.hasOwn(MERKMALE.bild[k] ?? MERKMALE.klang[k], m[k])) throw new Error(`Merkmal ${k} fehlt oder hat keine gültige Stufe`);
    merkmale[k] = m[k];
  }
  return merkmale;
}
function kompositionLage(roh) {
  const fremd = Object.keys(roh).filter((k) => !["frage", "merkmale"].includes(k));
  if (fremd.length) throw new Error(`unbekannte Felder: ${fremd.join(", ")}`);
  return { frage: "komposition", merkmale: merkmaleLage(roh.merkmale) };
}
function dramaturgieLage(roh) {
  const fremd = Object.keys(roh).filter((k) => !["frage", "merkmale", "optionen"].includes(k));
  if (fremd.length) throw new Error(`unbekannte Felder: ${fremd.join(", ")}`);
  const merkmale = merkmaleLage(roh.merkmale);
  const optionen = [...new Set(Array.isArray(roh.optionen) ? roh.optionen : [])];
  if (optionen.length < 2 || optionen.length > 6 || !optionen.every((k) => typeof k === "string" && Object.hasOwn(DRAMATURGIEN, k))) throw new Error("Optionen müssen 2–6 Dramaturgien aus dem Katalog sein");
  return { frage: "dramaturgie", merkmale, optionen };
}

export const FRAGE_DRAMATURGIE = "In einem künstlerischen Labor sollen ein Bild und ein Klang zu einer Animation von 30 Sekunden werden; der Klang ist die Tonspur. Gemessen wurden nur die genannten Merkmale. Bei welcher der folgenden Dramaturgien geht die Bewegung am ehesten aus diesem Bild und diesem Klang hervor, statt ihnen von aussen übergestülpt zu werden?";

/** feste Frage an jev aus einer geprüften Lage */
export function labFrage(lage) {
  const zeile = (gruppe) => Object.keys(MERKMALE[gruppe]).map((k) => merkmalText(k, lage.merkmale[k])).join("; ");
  if (lage.frage === "komposition") return {
    zustand: { labor: "ORNAMENT LAB, Animation aus Bild und Klang, von jev zusammengestellt", bild: zeile("bild"), klang: zeile("klang") },
    fragen: Object.fromEntries(Object.entries(KOMPOSITION_FRAGEN).map(([k, f]) => [k, { type: "choice", instructions: `${FRAGE_KOMPOSITION} ${f.text}`, criteria: { ...f.katalog } }])),
  };
  if (lage.frage === "dramaturgie") {
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
