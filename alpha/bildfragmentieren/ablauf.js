// «Bildfragmentieren» – Ablauf des Films (ohne DOM). 30 Bilder pro Sekunde, ohne Ton; Hochformat 4 : 5 (Standard, Feed), wahlweise 9 : 16 (Reels, Stories).
//   schwarzer Grund → 01 Linien: das Bild tastet sich als Relief aus waagrechten Linien ab, dann zeichnen sich die Umrisse
//   → 02 Formen: Dreiecke fliegen von aussen herein und setzen sich zu einem Mosaik in Grau zusammen
//   → 03 Farben: die Farben kommen dazu, Farbton um Farbton
//   → 04 Bild: Fragment um Fragment klappt das Foto selbst um, die Farbkanäle rasten ein → das Foto steht
//   → (wenn gewählt) das Signet von ornament.cloud wie in Sketchory.
import { SIGNET } from "../sketchory/ablauf.js?v=8";

export { FPS, anteil, weich, sanft, inOut, ausblenden, bezier, klemm } from "../sketchory/ablauf.js?v=8";

/** Bildmass des Films: Hochformat 4 : 5 (Standard, 1080 × 1350) oder "9:16" (1080 × 1920); Wunsch vom 15. Oktober 2026 */
export const FORMATE = ["4:5", "9:16"];
export function filmMass(format = "4:5") {
  return format === "9:16" ? [1080, 1920] : [1080, 1350];
}

/** Tempo: Faktor auf die Dauer der vier Phasen */
export const TEMPO = { ruhig: 1.3, normal: 1, schnell: 0.75 };

/** die vier Phasen und ihre Namen in der Beschriftung */
export const PHASEN = [["linien", "Linien"], ["formen", "Formen"], ["farben", "Farben"], ["zusammen", "Bild"]];

/** Zeitachse in Sekunden: { ab: { name: [anfang, ende] }, dauer, bilder } */
export function zeitachse({ tempo = "normal", signet = true } = {}) {
  const f = TEMPO[tempo] ?? (typeof tempo === "number" ? tempo : 1);
  const teile = [];
  let t = 0;
  const dazu = (name, d) => { teile.push([name, t, t + d]); t += d; };
  dazu("vor", 0.4);
  dazu("linien", 4.4 * f);
  dazu("formen", 3.6 * f);
  dazu("farben", 3.0 * f);
  dazu("zusammen", 3.2 * f);
  dazu("stehen", 3.2);
  if (signet) {
    dazu("bildAus", 1.2);
    dazu("pause", 0.3);
    dazu("signet", SIGNET);
    dazu("signetStehen", 0.8);
    dazu("signetAus", 1.3);
    dazu("schluss", 0.4);
  } else dazu("schluss", 0.3);   // ohne Abspann endet der Film auf dem Foto
  const ab = Object.fromEntries(teile.map(([name, a, b]) => [name, [a, b]]));
  return { ab, dauer: t, bilder: Math.round(t * 30), tempo: f };
}

/** Zeitcode für die Beschriftung: Minuten:Sekunden:Bilder */
export function zeitcode(t, fps = 30) {
  const b = Math.max(0, Math.floor(t * fps + 1e-6)), z = (n) => String(n).padStart(2, "0");
  return `${z(Math.floor(b / fps / 60))}:${z(Math.floor(b / fps) % 60)}:${z(b % fps)}`;
}

export function dateiname(zeit, endung) {
  const z = (n) => String(n).padStart(2, "0");
  return `bildfragmentieren-${zeit.getFullYear()}-${z(zeit.getMonth() + 1)}-${z(zeit.getDate())}-${z(zeit.getHours())}${z(zeit.getMinutes())}.${endung}`;
}
