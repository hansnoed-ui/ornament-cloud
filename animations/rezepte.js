// Animationen – «Neu mischen»: eine zufällige Mischung aus den Effekten für das eigene Bild. Seit 4. November 2026 ohne Beispielbilder
// und ohne vorgefertigte Werke (Wunsch: «keine beispielbilder»): jedes Werk bringt sein Bild mit, gesichert werden sie in werke.php.
import { EFFEKTE, EFFEKT_IDS } from "./effekte.js?v=29";
import { MODI } from "./motor.js?v=29";

/** das eigene Bild im Mischpult: hochgeladen oder auf die Bühne gezogen, bleibt im Browser, bis das Werk gesichert wird */
export const EIGEN = "eigen";

/** «neu mischen»: eine bis drei Ebenen aus verschiedenen Effekten, Mischmodi, Deckkraft, Regler; das Bild bleibt */
export function zufall(zz = Math.random, bild = EIGEN) {
  const wahl = (a) => a[Math.floor(zz() * a.length)];
  const n = 1 + Math.floor(zz() * 3), ids = [...EFFEKT_IDS].sort(() => zz() - .5).slice(0, n);
  const modi = Object.keys(MODI);
  return {
    bild,
    grund: zz() < .75 ? "schwarz" : "weiss",
    ebenen: ids.map((effekt, i) => ({
      effekt,
      // Wahlen (z. B. die Form der Montage) springen auf eine ihrer Stufen
      werte: EFFEKTE[effekt].regler.map((rg) => rg.stufen ? +(Math.floor(zz() * rg.stufen.length) / (rg.stufen.length - 1)).toFixed(3) : +(0.2 + zz() * 0.7).toFixed(2)),
      modus: i === 0 ? "normal" : wahl(modi),
      deckkraft: i === 0 ? 1 : +(0.45 + zz() * 0.55).toFixed(2),
      quelle: i > 0 && zz() < .3 ? "unten" : "bild",
      seed: Math.floor(zz() * 9),
    })),
  };
}
