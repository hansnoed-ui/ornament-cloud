// PHORMA II – Video als Quelle (Etappe 2 von Montage und Wachstum, seit 19. Oktober 2026; Wunsch: «Eine neue Animation für Bilder (und wenn möglich:
// Videos)», «Als nächste Effekt für PHORMA II (Bild und Video)»). Die Bilder liest die Filmspur von PHORMA III bildgenau (MP4 mit WebCodecs, sonst
// durch Spulen), auf das Filmformat zugeschnitten. Hier nur der Plan (ohne DOM, für die Tests):
//   Das Video läuft durch die ganze Kette, vom ersten bis zum letzten Bild, in ihrer eigenen Zeit (Tempo «ruhig» heisst also auch: das Video läuft
//   langsamer); ist es kürzer als die Kette (gelesen werden höchstens 30 s), läuft es entsprechend langsamer (buehne.js blendet dann zwischen den
//   Bildern über). Das Standbild – für die Analyse und den Schluss – ist das Bild am Ende. Bis zum 19. Oktober 2026 lief es erst ab Montage oder
//   Wachstum, davor stand das Bild vom Ende (Rückmeldung: «bleibt ständig ein "altes" Video in den ersten drei Schritten hängen … dieses kommt dann
//   erst ab Wachstum»); danach stand ein kürzeres zuerst still und begann später (Rückmeldung: «beim Tuch erst in der zweiten Hälfte … ich vermute,
//   dass es daran liegt, wenn ein Video kürzer ist als die Länge der Animation»).
import { kette } from "./ablauf.js?v=26";

/** höchstens so lange liest PHORMA II (wie die Filmspur von PHORMA III) */
export const HOECHSTENS = 30;

/**
 * Wie das Video in der Kette läuft: dauer Sekunden Video (laenge: so viel ist da, ab «Video ab») über die ganze Kette, faktor Sekunden Video je
 * Sekunde Kette (Tempo «normal»; 1, wenn genug Video da ist). → { dauer, faktor, lebendig }
 */
export function videoPlan(ablauf, laenge = HOECHSTENS) {
  const K = kette(ablauf), dauer = Math.max(0, Math.min(K.dauer, laenge, HOECHSTENS));
  return { dauer, faktor: K.dauer > 0 ? dauer / K.dauer : 1, lebendig: dauer > 0 };
}

/** die Stelle im Video (Sekunden ab dem Anfang des gelesenen Ausschnitts) zur eigenen Zeit der Kette */
export const videoStelle = (plan, kettenzeit) => Math.min(plan.dauer, Math.max(0, kettenzeit * plan.faktor));

/** die Stelle im Video zur Filmzeit t (zeit aus zeitachse): vor der Kette das erste Bild, danach das Standbild */
export function videoStelleBei(zeit, plan, t) {
  const { abschnitt, tempo } = zeit;
  return videoStelle(plan, (Math.min(abschnitt.bis, Math.max(abschnitt.von, t)) - abschnitt.von) / tempo);
}
