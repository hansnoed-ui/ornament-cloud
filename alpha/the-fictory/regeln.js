// «The Fictory» – die sieben Operationsregeln, in die ein Gedanke aus einer ORNA-Konstellation übersetzt werden kann.
// Jede Regel ist eine konkrete Änderung an den Bildoperationen (operationen.js liest nur die Kennung). Die Zuordnung zu einem Text
// ist eine gestalterische Interpretation, keine Aussage über die genannten Personen.
// Gemeinsam für Seite (orna.js), Simulation (operationen.js) und den Bau der jev-Tabelle (tools/build-jev-fictory.ts).

export const REGELN = Object.freeze({
  R1: {
    name: "Keine Rückkehr an dieselbe Stelle",
    kurz: "Eine Stelle mit Spur ist für spätere Schritte gesperrt.",
    eingriff: "In den Schritten 3 und 5 darf kein Teil auf eine Stelle zurück, an der schon eine Spur liegt. Findet ein Teil keine freie Stelle, bleibt es stehen.",
    stichworte: ["wiederhol", "rückkehr", "zurückkehr", "stempel", "verbrauch", "derselb", "unumkehr", "irrevers", "nicht rückgängig", "wiederkehr"],
  },
  R2: {
    name: "Verzögerter Spiegel",
    kurz: "Eine frühere Anordnung kehrt gespiegelt und verspätet als Spur zurück.",
    eingriff: "Zu Beginn der Schritte 2 und 5 kehrt die Anordnung eines früheren Schlüsselzustands an der Hauptachse gespiegelt als Spur zurück. Diese Spuren wirken danach wie alle anderen als Hindernis und Zähigkeit.",
    stichworte: ["spiegel", "beobacht", "verzöger", "rückkopp", "zeitversetz", "video", "feedback", "selbstbild", "abbild"],
  },
  R3: {
    name: "Raster als Regel",
    kurz: "Alle Zielstellen rasten auf ein Raster aus dem Bild ein.",
    eingriff: "Alle Zielstellen werden auf ein Raster gesetzt, dessen Weite aus der mittleren Grösse der ausgewählten Teile folgt.",
    stichworte: ["raster", "regel", "ordnung", "system", "serie", "zahl", "schema", "notation", "gitter", "modul", "zähl"],
  },
  R4: {
    name: "Nur Unterschiede, die Unterschiede machen",
    kurz: "Nur deutlich abweichende Teile bewegen sich; die übrigen bleiben als Bezugspunkte.",
    eingriff: "Nur Teile, die sich farblich deutlich von ihrer Umgebung abheben (Abstand über dem Median), bewegen sich. Die übrigen bleiben an ihrer Stelle als feste Bezugspunkte.",
    stichworte: ["unterschied", "differenz", "kontext", "unterscheid", "information", "kontrast", "abweich"],
  },
  R5: {
    name: "Fortwirkende Last",
    kurz: "Grosse Teile sind schwer, alles sinkt nach Fläche gewichtet.",
    eingriff: "Grosse Teile tragen Gewicht: Sie bewegen sich langsamer, und in den Schritten 4 und 5 sinken alle Teile nach unten, gewichtet nach ihrer Fläche.",
    stichworte: ["körper", "gewicht", "schwer", "material", "masse", "last", "haut", "leib", "gravit", "fleisch", "stoff"],
  },
  R6: {
    name: "Die Leerstelle bleibt",
    kurz: "Die verlassenen Stellen der Figuren bleiben offen; dort wächst nichts.",
    eingriff: "Die Stellen, die die Figuren verlassen, bleiben offen: Ihr Umriss bleibt sichtbar, und das wuchernde Feld kann dort nicht wachsen.",
    stichworte: ["leer", "abwesen", "lücke", "verlust", "verschwind", "schweig", "fehl", "zwischenraum", "erinner", "vergessen"],
  },
  R7: {
    name: "Verflechtung",
    kurz: "Gleichfarbige Teile werden zusätzlich gekoppelt.",
    eingriff: "Teile gleicher Farbgruppe werden zusätzlich miteinander gekoppelt. Der Anstoss in Schritt 4 überträgt sich über diese Kopplungen weiter.",
    stichworte: ["netz", "verbind", "verflecht", "beziehung", "relation", "gefüge", "kopplung", "gewebe", "knoten", "verschränk", "intra-aktion"],
  },
});

export const REGEL_IDS = Object.freeze(Object.keys(REGELN));

/** Sätze eines Konstellationstexts, unverändert (Trennung nach Satzzeichen mit folgendem Leerraum). */
export function saetze(text) {
  return String(text).split(/(?<=[.!?])\s+(?=[A-ZÄÖÜ«„"'(])/u).map((s) => s.trim()).filter(Boolean);
}

/** Prüfsumme über Regeln und Bestand (Kennung und Satzanzahl), damit eine veraltete jev-Tabelle erkannt wird. */
export function pruefsumme(konstellationen) {
  const roh = JSON.stringify([REGEL_IDS.map((k) => [k, REGELN[k].name, REGELN[k].eingriff]), konstellationen.map((k) => [k.id, saetze(k.text).length])]);
  let h = 0x811c9dc5;
  for (let i = 0; i < roh.length; i++) { h ^= roh.charCodeAt(i); h = Math.imul(h, 0x01000193) >>> 0; }
  return h.toString(16).padStart(8, "0");
}
