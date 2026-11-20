// Gemeinsam für alle Operatoren mit Aufnahme: die Länge des Videos in die Datei schreiben.
// MediaRecorder lässt sie im Dateikopf offen (fragmentiertes MP4: 0 oder nur die Länge des ersten Stücks; WebM: keine Angabe).
// Galerie und Player am Telefon zeigen dann z. B. «3 Sekunden» an (Rückmeldung von Christian, 20.11.2026; dasselbe wie bei PHORMA).
// Die Arbeit macht dauer.js aus The Fictory, wie in PHORMA II/III und im ORNAMENT LAB; das Bild bleibt Byte für Byte unverändert.
import { mitDauer } from '../../the-fictory/dauer.js?v=32';

/** fügt die Teile zu einer Datei mit eingetragener Länge zusammen; geht etwas schief, kommt die Datei unverändert zurück */
export async function aufnahmeDatei(teile, typ, sekunden) {
  const roh = new Blob(teile, { type: typ });
  try { return new Blob([mitDauer(await roh.arrayBuffer(), sekunden)], { type: typ }); }
  catch { return roh; }
}
