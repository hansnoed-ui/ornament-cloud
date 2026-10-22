// PHORMA II – Video als Quelle (Etappe 2 von Montage und Wachstum, seit 19. Oktober 2026; Wunsch: «Eine neue Animation für Bilder (und wenn möglich:
// Videos)», «Als nächste Effekt für PHORMA II (Bild und Video)»). Die Bilder liest die Filmspur von PHORMA III bildgenau (MP4 mit WebCodecs, sonst
// durch Spulen), auf das Filmformat zugeschnitten. Hier nur der Plan (ohne DOM, für die Tests):
//   Das Video läuft durch die ganze Kette, vom ersten bis zum letzten Bild, in ihrer eigenen Zeit (Tempo «ruhig» heisst also auch: das Video läuft
//   langsamer); ist es kürzer als die Kette (gelesen werden höchstens 30 s), läuft es mehrmals hintereinander, so oft es ganz hineinpasst, jedes
//   Mal etwas gedehnt (nie langsamer als halb so schnell; buehne.js blendet dann zwischen den Bildern über). Das Standbild – für die Analyse und den
//   Schluss – ist das Bild am Ende. Seit dem 20. Oktober 2026 wiederholt (Wunsch: «Video wiederholen statt Zeitlupe bei sehr kurzen Videos»), bis
//   dahin lief ein kurzes Video einmal, entsprechend langsamer. Bis zum 19. Oktober 2026 lief es erst ab Montage oder
//   Wachstum, davor stand das Bild vom Ende (Rückmeldung: «bleibt ständig ein "altes" Video in den ersten drei Schritten hängen … dieses kommt dann
//   erst ab Wachstum»); danach stand ein kürzeres zuerst still und begann später (Rückmeldung: «beim Tuch erst in der zweiten Hälfte … ich vermute,
//   dass es daran liegt, wenn ein Video kürzer ist als die Länge der Animation»).
import { kette } from "./ablauf.js?v=38";

/** höchstens so lange liest PHORMA II (wie die Filmspur von PHORMA III) */
export const HOECHSTENS = 30;

/**
 * Wie das Video in der Kette läuft: dauer Sekunden Video (laenge: so viel ist da, ab «Video ab») runden Mal über die ganze Kette, faktor Sekunden
 * Video je Sekunde Kette (Tempo «normal»; 1, wenn genug Video da ist, sonst zwischen 0,5 und 1). → { dauer, runden, faktor, lebendig }
 */
export function videoPlan(ablauf, laenge = HOECHSTENS) {
  const K = kette(ablauf), dauer = Math.max(0, Math.min(K.dauer, laenge, HOECHSTENS));
  const runden = dauer > 0 ? Math.max(1, Math.floor(K.dauer / dauer + 1e-9)) : 1;
  return { dauer, runden, faktor: K.dauer > 0 ? (runden * dauer) / K.dauer : 1, lebendig: dauer > 0 };
}

/** die Stelle im Video (Sekunden ab dem Anfang des gelesenen Ausschnitts) zur eigenen Zeit der Kette; am Ende der letzten Runde das letzte Bild */
export function videoStelle(plan, kettenzeit) {
  const x = Math.max(0, kettenzeit * plan.faktor);
  if (plan.dauer <= 0 || x >= plan.runden * plan.dauer - 1e-9) return plan.dauer;
  return Math.max(0, x - Math.floor(x / plan.dauer + 1e-9) * plan.dauer);
}

/** die Stelle im Video zur Filmzeit t (zeit aus zeitachse): vor der Kette das erste Bild, danach das Standbild */
export function videoStelleBei(zeit, plan, t) {
  const { abschnitt, tempo } = zeit;
  return videoStelle(plan, (Math.min(abschnitt.bis, Math.max(abschnitt.von, t)) - abschnitt.von) / tempo);
}
