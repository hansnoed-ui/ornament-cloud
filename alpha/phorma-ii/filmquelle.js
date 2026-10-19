// PHORMA II – Video als Quelle (Etappe 2 von Montage und Wachstum, seit 19. Oktober 2026; Wunsch: «Eine neue Animation für Bilder (und wenn möglich:
// Videos)», «Als nächste Effekt für PHORMA II (Bild und Video)»). Die Bilder liest die Filmspur von PHORMA III bildgenau (MP4 mit WebCodecs, sonst
// durch Spulen), auf das Filmformat zugeschnitten. Hier nur der Plan (ohne DOM, für die Tests):
//   Das Video läuft durch die ganze Kette, in ihrer eigenen Zeit (Tempo «ruhig» heisst also auch: das Video läuft langsamer), und kommt an ihrem Ende
//   an; ist die Kette länger als das Video (höchstens 30 s), steht zuerst sein erstes Bild. Das Standbild – für die Analyse und den Schluss – ist das
//   Bild am Ende. Bis zum 19. Oktober 2026 lief es erst ab Montage oder Wachstum, davor stand das Bild vom Ende (Rückmeldung: «bleibt ständig ein
//   "altes" Video in den ersten drei Schritten hängen … dieses kommt dann erst ab Wachstum»).
import { kette } from "./ablauf.js?v=26";

/** höchstens so lange liest PHORMA II (wie die Filmspur von PHORMA III) */
export const HOECHSTENS = 30;

/**
 * Wo das Video in der Kette läuft (eigene Zeit der Kette, Tempo «normal»): von bis zum Ende, dauer Sekunden lang; laenge: so viel Video ist da
 * (Sekunden ab «Video ab»). → { von, dauer, lebendig }
 */
export function videoPlan(ablauf, laenge = HOECHSTENS) {
  const K = kette(ablauf), dauer = Math.max(0, Math.min(K.dauer, laenge, HOECHSTENS));
  return { von: K.dauer - dauer, dauer, lebendig: dauer > 0 };
}

/** die Stelle im Video (Sekunden ab dem Anfang des gelesenen Ausschnitts) zur eigenen Zeit der Kette */
export const videoStelle = (plan, kettenzeit) => Math.min(plan.dauer, Math.max(0, kettenzeit - plan.von));

/** die Stelle im Video zur Filmzeit t (zeit aus zeitachse): vor der Kette das erste Bild, danach das Standbild */
export function videoStelleBei(zeit, plan, t) {
  const { abschnitt, tempo } = zeit;
  return videoStelle(plan, (Math.min(abschnitt.bis, Math.max(abschnitt.von, t)) - abschnitt.von) / tempo);
}
