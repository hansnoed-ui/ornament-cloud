// ORNAMENT LAB – Datentypen zwischen Operationen. Eine Verbindung ist nur erlaubt, wenn der Ausgang einer Operation den Typ trägt,
// den der Eingang der nächsten verlangt (kompatibel()). Version 0.1 implementiert nur die Typen, die der erste Prozess braucht;
// die übrigen sind benannt, damit das Projektformat sie später ohne Bruch aufnehmen kann (Masterprompt §13, Audio-Format: docs/AUDIO-FORMAT.md).

export const TYPEN = Object.freeze({
  IMAGE: { name: "Bild", implementiert: true, datei: "png", beschreibung: "Rasterbild RGBA (ImageData-Form)" },
  ANIMATION: { name: "Animation", implementiert: true, datei: "mp4|webm", beschreibung: "Bildfolge einer Operation (Nacheinander), als Video exportierbar" },
  CONSTELLATION: { name: "Konstellation", implementiert: true, datei: "json", beschreibung: "ORNA-Konstellation mit abgeleiteter Operationsregel" },
  CONTROL_SIGNAL: { name: "Steuersignal", implementiert: true, datei: "json", beschreibung: "Folge von Werten 0–1, kann Parameter modulieren" },
  METADATA: { name: "Befund", implementiert: true, datei: "json", beschreibung: "Messungen und Beobachtungen, keine Bewertung" },
  VIDEO: { name: "Video", implementiert: false, beschreibung: "zeitbasiertes Bild mit eigener Bildrate (später ORNAMENT MOTION)" },
  AUDIO: { name: "Audiosignal", implementiert: false, beschreibung: "abgetastetes Signal (später ORNAMENT SOUND)" },
  TEXT: { name: "Text", implementiert: false, beschreibung: "Text mit Herkunft (später ORNAMENT TEXT, Prüfraster)" },
  GEOMETRY: { name: "Geometrie", implementiert: false, beschreibung: "Punkte, Linien, Flächen mit Attributen" },
  EVENT_SEQUENCE: { name: "Ereignisfolge", implementiert: false, beschreibung: "Trigger mit Zeitpunkten (Rhythmus, Schnitte)" },
});

export const TYP_IDS = Object.freeze(Object.keys(TYPEN));

/** Kann ein Ausgang vom Typ «von» in einen Eingang vom Typ «nach» gehen? Bewusst streng: keine stillen Umwandlungen. */
export function kompatibel(von, nach) {
  if (!TYPEN[von] || !TYPEN[nach]) return false;
  return von === nach;
}
