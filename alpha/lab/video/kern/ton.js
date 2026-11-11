// ORNAMENT LAB · Video – den Ton des Films mischen, ohne DOM: der Ton der Videos der Folge und die Töne darunter, so wie der Film sie
// sagt (tonQuellen in folge.js): Zuschnitt, Tempo (die Tonhöhe bleibt, wie in OpenFilm: Dehnen nach WSOLA aus dem Klangwerk des Labs),
// Lautstärke und Ein- und Ausblenden (fadeGain von film-doc.js). Ergebnis Stereo in einer Abtastrate, gegen Übersteuerung begrenzt.
import { fadeGain } from "../../../../vendor/openfilm-0.2.6/film-doc.js";
import { dehnen, rateWandeln, pegeln, einsaetzeFinden, mono } from "../../kern/klangwerk.js";

/**
 * quellen: von tonQuellen(); daten: Map Medium-Id → { spuren: [Float32Array …], rate } (der decodierte Ton der Datei); dauer in s.
 * Gibt { spuren: [L, R], rate, spitze } zurück. Fehlt der Ton eines Mediums, bleibt er stumm.
 */
export function mischen(quellen, daten, dauer, { rate = 48000 } = {}) {
  const n = Math.max(1, Math.round(dauer * rate)), L = new Float32Array(n), R = new Float32Array(n);
  for (const q of quellen) {
    const d = daten.get(q.medium);
    if (!d?.spuren?.length) continue;
    const a = Math.max(0, Math.floor(q.von * d.rate)), b = Math.min(d.spuren[0].length, Math.ceil(q.bis * d.rate));
    if (b <= a) continue;
    let teil = d.spuren.slice(0, 2).map((s) => s.subarray(a, b));
    if (Math.abs(q.tempo - 1) > 1e-3) teil = dehnen(teil.map((s) => s.slice()), d.rate, 1 / q.tempo, { fenster: 0.05 });
    teil = teil.map((s) => rateWandeln(s, d.rate, rate));
    const [l, r] = teil.length > 1 ? teil : [teil[0], teil[0]];
    const start = Math.round(q.at * rate), laenge = Math.min(l.length, Math.round(q.laenge * rate));
    for (let i = 0; i < laenge; i++) {
      const j = start + i;
      if (j >= n) break;
      if (j < 0) continue;
      const g = q.lautstaerke * fadeGain(i / rate, q.laenge, q.fade);
      L[j] += l[i] * g; R[j] += r[i] * g;
    }
  }
  pegeln([L, R], "quelle");
  let spitze = 0; for (const s of [L, R]) for (const v of s) spitze = Math.max(spitze, Math.abs(v));
  return { spuren: [L, R], rate, spitze };
}

/** die Einsätze eines Tons in Filmsekunden (für «Schnitte im Takt»): die Stellen, an denen Ränder einrasten */
export function taktMarken(q, d, { empfindlichkeit = 0.45 } = {}) {
  const a = Math.max(0, Math.floor(q.von * d.rate)), b = Math.min(d.spuren[0].length, Math.ceil(q.bis * d.rate));
  const e = einsaetzeFinden(mono(d.spuren.map((s) => s.subarray(a, b))), d.rate, { empfindlichkeit, abstand: 0.12 });
  return e.filter((x) => x.staerke >= 0.25).map((x) => Math.round((q.at + x.t / q.tempo) * 1000) / 1000).filter((t) => t >= q.at && t <= q.at + q.laenge);
}
