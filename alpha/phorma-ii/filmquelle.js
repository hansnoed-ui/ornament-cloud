// PHORMA II – Video als Quelle (Etappe 2 von Montage und Wachstum, seit 19. Oktober 2026; Wunsch: «Eine neue Animation für Bilder (und wenn möglich:
// Videos)», «Als nächste Effekt für PHORMA II (Bild und Video)»). Die Bilder liest die Filmspur von PHORMA III bildgenau (MP4 mit WebCodecs, sonst
// durch Spulen), auf das Filmformat zugeschnitten. Hier nur der Plan (ohne DOM, für die Tests):
//   Montage und Wachstum zeigen das laufende Video: es beginnt mit dem ersten dieser beiden Effekte in der Kette und läuft bis zu ihrem Ende, in der
//   eigenen Zeit der Kette (Tempo «ruhig» heisst also auch: das Video läuft langsamer). Das Standbild – für die Analyse, für Physarum, Tiefe und
//   Tuch und für den Schluss – ist das Bild am Ende: dort kommt das laufende Video an.
import { kette } from "./ablauf.js?v=23";

/** die Effekte, die das laufende Video zeigen */
export const LEBENDIG = ["wachstum", "montage"];
/** höchstens so lange liest PHORMA II (wie die Filmspur von PHORMA III) */
export const HOECHSTENS = 30;

/**
 * Wo das Video in der Kette läuft: von (eigene Zeit der Kette, Tempo «normal») bis zum Ende, dauer Sekunden lang; ohne Montage und Wachstum steht
 * es (dauer 0: das Standbild ist das erste Bild). → { von, dauer, lebendig }
 */
export function videoPlan(ablauf) {
  const K = kette(ablauf), erster = K.teile.find((t) => LEBENDIG.includes(t.art));
  if (!erster) return { von: K.dauer, dauer: 0, lebendig: false };
  return { von: erster.von, dauer: K.dauer - erster.von, lebendig: true };
}

/** die Stelle im Video (Sekunden ab dem Anfang des gelesenen Ausschnitts) zur eigenen Zeit der Kette */
export const videoStelle = (plan, kettenzeit) => Math.min(plan.dauer, Math.max(0, kettenzeit - plan.von));

/** die Stelle im Video zur Filmzeit t (zeit aus zeitachse): vor der Kette das erste Bild, danach das Standbild */
export function videoStelleBei(zeit, plan, t) {
  const { abschnitt, tempo } = zeit;
  return videoStelle(plan, (Math.min(abschnitt.bis, Math.max(abschnitt.von, t)) - abschnitt.von) / tempo);
}
