// ORNAMENT LAB – Datentypen zwischen Operationen. Eine Verbindung ist nur erlaubt, wenn der Ausgang einer Operation den Typ trägt,
// den der Eingang der nächsten verlangt (kompatibel()). Implementiert sind nur die Typen, die tatsächlich gebraucht werden;
// die übrigen sind benannt, damit das Projektformat sie später ohne Bruch aufnehmen kann (Masterprompt §13, Audio-Format: docs/AUDIO-FORMAT.md).

export const TYPEN = Object.freeze({
  IMAGE: { name: "Bild", implementiert: true, datei: "png", beschreibung: "Rasterbild RGBA (ImageData-Form)" },
  ANIMATION: { name: "Animation", implementiert: true, datei: "mp4|webm", beschreibung: "Bildfolge einer Operation (Nacheinander), als Video exportierbar" },
  CONSTELLATION: { name: "Konstellation", implementiert: true, datei: "json", beschreibung: "ORNA-Konstellation mit abgeleiteter Operationsregel" },
  CONTROL_SIGNAL: { name: "Steuersignal", implementiert: true, datei: "json", beschreibung: "Folge von Werten 0–1, kann Parameter modulieren" },
  METADATA: { name: "Befund", implementiert: true, datei: "json", beschreibung: "Messungen und Beobachtungen, keine Bewertung" },
  AUDIO: { name: "Audiosignal", implementiert: true, datei: "wav|mp3|ogg|flac|m4a|webm", beschreibung: "abgetastetes Signal; im Lab nur als Material, das gemessen wird (seit Lab 0.1.3)" },
  EVENT_SEQUENCE: { name: "Ereignisfolge", implementiert: true, datei: "json", beschreibung: "Ereignisse mit Zeitpunkten in Sekunden (Einsätze, Trigger, später Rhythmus und Schnitte)" },
  VIDEO: { name: "Video", implementiert: false, beschreibung: "zeitbasiertes Bild mit eigener Bildrate (später ORNAMENT MOTION)" },
  TEXT: { name: "Text", implementiert: false, beschreibung: "Text mit Herkunft (später ORNAMENT TEXT, Prüfraster)" },
  GEOMETRY: { name: "Geometrie", implementiert: false, beschreibung: "Punkte, Linien, Flächen mit Attributen" },
});

export const TYP_IDS = Object.freeze(Object.keys(TYPEN));

/**
 * Das Audio-Operationsformat (Masterprompt §5): acht Formen, in denen Klang im Lab vorkommen kann, und wie jede in den Typen oben
 * dargestellt wird. Es gibt dafür keine eigenen Typen neben TYPEN: ein Steuerwert aus einem Klang ist dasselbe CONTROL_SIGNAL wie eines
 * aus einem Bild, darum koppelt er an dieselbe Modulation. Unterschieden werden die Formen über Felder in den Daten (`achse`, `art`)
 * oder über die Signatur einer Operation (Generator: ohne Eingang, Transformation: AUDIO → AUDIO). Beschreibung: docs/AUDIO-FORMAT.md.
 */
export const KLANGFORMEN = Object.freeze({
  audiosignal: { name: "Audiosignal", typ: "AUDIO", kennzeichen: "Material mit dauer, abtastrate, kanaele", implementiert: true },
  ereignis: { name: "Event / Trigger", typ: "EVENT_SEQUENCE", kennzeichen: "daten.ereignisse: [{ t, staerke? }]", implementiert: true },
  steuerwert: { name: "Steuerwert", typ: "CONTROL_SIGNAL", kennzeichen: "daten.werte 0–1", implementiert: true },
  parameterverlauf: { name: "zeitlicher Parameterverlauf", typ: "CONTROL_SIGNAL", kennzeichen: "daten.achse = \"zeit\" mit dauer und je", implementiert: true },
  spektrum: { name: "Frequenzspektrum", typ: "METADATA", kennzeichen: "daten.art = \"frequenzspektrum\"", implementiert: false },
  rhythmus: { name: "rhythmisches Muster", typ: "EVENT_SEQUENCE", kennzeichen: "daten.bpm, daten.raster", implementiert: false },
  generator: { name: "Klanggenerator", typ: "AUDIO", kennzeichen: "Operation ohne AUDIO-Eingang, Ausgang AUDIO", implementiert: false },
  transformation: { name: "Klangtransformation", typ: "AUDIO", kennzeichen: "Operation AUDIO → AUDIO", implementiert: false },
});

/** Kann ein Ausgang vom Typ «von» in einen Eingang vom Typ «nach» gehen? Bewusst streng: keine stillen Umwandlungen. */
export function kompatibel(von, nach) {
  if (!TYPEN[von] || !TYPEN[nach]) return false;
  return von === nach;
}
