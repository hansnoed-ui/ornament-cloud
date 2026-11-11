// Metrum 0.1.0 (ornament.bienne, Phase 2, Schritt a): die Taktlänge an einer Stelle statt «240 / bpm» überall. Tempo heisst wie bisher
// Viertel pro Minute; eine Taktart sagt, wie viele Viertel ein Takt hat und wie er gegliedert ist (7/8 als 2+2+3). Für 4/4 kommt genau
// dieselbe Zahl heraus wie vorher (4 · 60 / bpm = 240 / bpm), alte Projekte klingen also gleich. Tuplets, Polymetrik und Humanisierung
// folgen in eigenen Schritten.

export const METRUM_VERSION = "0.1.0";

/** übliche Gliederung je Taktart, in Einheiten des Nenners (7/8: 2+2+3 Achtel) – eine andere lässt sich mit «7/8:3+2+2» angeben */
export const GLIEDERUNG = Object.freeze({
  "2/4": [1, 1], "3/4": [1, 1, 1], "4/4": [1, 1, 1, 1], "5/4": [3, 2], "6/4": [3, 3], "7/4": [4, 3],
  "5/8": [3, 2], "6/8": [3, 3], "7/8": [2, 2, 3], "9/8": [3, 3, 3], "10/8": [3, 3, 2, 2], "11/8": [3, 3, 3, 2], "12/8": [3, 3, 3, 3],
  "13/8": [3, 3, 3, 2, 2], "15/16": [4, 4, 4, 3],
});

/** «7/8», «7/8:3+2+2» oder { zaehler, nenner, gruppen } → { zaehler, nenner, gruppen, name }; ohne Angabe 4/4 */
export function taktartLesen(t = "4/4") {
  if (t && typeof t === "object") return taktartLesen(`${t.zaehler}/${t.nenner}${t.gruppen ? `:${t.gruppen.join("+")}` : ""}`);
  const m = /^\s*(\d+)\s*\/\s*(\d+)\s*(?::\s*([\d+\s]+))?$/.exec(String(t));
  if (!m) throw new Error(`Taktart «${t}» nicht lesbar`);
  const zaehler = +m[1], nenner = +m[2];
  if (zaehler < 1 || zaehler > 32 || ![1, 2, 4, 8, 16, 32].includes(nenner)) throw new Error(`Taktart «${t}» ausserhalb 1–32 / 1, 2, 4, 8, 16, 32`);
  const gruppen = m[3] ? m[3].split("+").map((x) => +x.trim()) : GLIEDERUNG[`${zaehler}/${nenner}`] ?? Array(zaehler).fill(1);
  if (gruppen.some((g) => !(g > 0)) || gruppen.reduce((s, g) => s + g, 0) !== zaehler) throw new Error(`Gliederung ${gruppen.join("+")} ergibt nicht ${zaehler}`);
  return { zaehler, nenner, gruppen, name: `${zaehler}/${nenner}` };
}

/** Länge eines Takts in Vierteln (7/8 → 3,5) */
export const viertel = (t) => { const a = taktartLesen(t); return (a.zaehler * 4) / a.nenner; };

/** Länge eines Takts in Sekunden; Tempo in Vierteln pro Minute. 4/4 ergibt genau 240 / bpm. */
export const taktSek = (bpm, t) => (viertel(t) * 60) / bpm;

/** Schritte eines Takts im Raster (16 = Sechzehntel): 4/4 → 16, 7/8 → 14, 6/8 → 12; null, wenn der Takt nicht aufgeht */
export function schritte(t, raster = 16) {
  const a = taktartLesen(t), n = (a.zaehler * raster) / a.nenner;
  return Number.isInteger(n) ? n : null;
}

/**
 * Betonung jedes Schritts (0–1) aus der Gliederung: Takteins 1, Beginn einer Gruppe 0,75, übrige Zählzeiten 0,5, Zwischenschritte 0,3
 * (Achtel) und 0,2 (feiner). Grundlage für Drum- und Bassmuster in ungeraden Takten.
 */
export function betonungen(t, raster = 16) {
  const a = taktartLesen(t), n = schritte(a, raster);
  if (n == null) throw new Error(`${a.name} geht im Raster ${raster} nicht auf`);
  const proZz = raster / a.nenner, out = Array.from({ length: n }, (_, i) => (i % (raster / 8) === 0 ? 0.3 : 0.2));
  for (let z = 0; z < a.zaehler; z++) if (Number.isInteger(z * proZz)) out[z * proZz] = 0.5;
  let z = 0;
  a.gruppen.forEach((g, k) => { out[Math.round(z * proZz)] = k ? 0.75 : 1; z += g; });
  return out;
}

/** Beginn jeder Gruppe in Schritten (7/8 im Sechzehntelraster → [0, 4, 8]) */
export function gruppenAnfaenge(t, raster = 16) {
  const a = taktartLesen(t), proZz = raster / a.nenner, out = [];
  let z = 0;
  for (const g of a.gruppen) { out.push(Math.round(z * proZz)); z += g; }
  return out;
}

// ---------- Polymetrik (Schritt c) ----------
const ggT = (a, b) => (b ? ggT(b, a % b) : a);

/** nach wie vielen Takten eine Schicht von «laenge» Schritten wieder mit der Takteins zusammenfällt (12 Schritte in 4/4 → 3 Takte) */
export const treffpunkt = (laenge, t, raster = 16) => { const n = schritte(t, raster); return laenge / ggT(laenge, n); };

/**
 * Eine Schicht mit eigenem Zyklus über den Takten: «muster» ist ein Zyklus aus Tokens (wie eine Musterzeile, ohne Klammern), der ohne
 * Rücksicht auf die Taktgrenzen weiterläuft. «neustart» (Takte) setzt den Zyklus an geplanten Stellen auf die Takteins zurück, damit
 * sich die Schichten dort sicher treffen – ohne Angabe treffen sie sich erst nach treffpunkt() Takten.
 * Gibt je Takt eine Musterzeile zurück (für Drums) und die Ereignisse mit Zeit in Takten (für Noten).
 */
export function zyklus(muster, t, takte, { raster = 16, neustart = null } = {}) {
  const tok = Array.isArray(muster) ? muster : String(muster).trim().split(/\s+/), L = tok.length, n = schritte(t, raster);
  if (n == null) throw new Error(`${taktartLesen(t).name} geht im Raster ${raster} nicht auf`);
  const zeilen = [], ereignisse = [];
  for (let b = 0; b < takte; b++) {
    const zeile = [];
    for (let s = 0; s < n; s++) {
      const g = (neustart ? b % neustart : b) * n + s, i = g % L, x = tok[i];
      zeile.push(x);
      if (x !== "." && x !== "-") ereignisse.push({ t: b + s / n, takt: b, schritt: s, index: i, runde: Math.floor(g / L), token: x });
    }
    zeilen.push(zeile.join(" "));
  }
  return { zeilen, ereignisse, laenge: L, treffenNach: neustart ?? treffpunkt(L, t, raster) };
}
