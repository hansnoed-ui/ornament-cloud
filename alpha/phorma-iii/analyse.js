// PHORMA III – das Bild verstehen (ohne DOM, im Web Worker rechner.js oder in Node für die Tests). Gerechnet auf der halben Filmgrösse.
//   hell     – Helligkeit 0..1 (daraus macht kurven.js die Linien gleicher Helligkeit fürs Gewebe)
//   ton      – Tonumfang und mittlere Helligkeit
// Aus PHORMA II übernommen; dort rechnet die Analyse zusätzlich Tiefe, Nahrung und Keime für Physarum, Tiefe und Tuch.

/** Mulberry32 (Zufall mit Startwert: dasselbe ergibt immer dasselbe) */
export function zufall(s = 1) {
  return () => { s |= 0; s = (s + 0x6d2b79f5) | 0; let t = Math.imul(s ^ (s >>> 15), 1 | s); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}

/** Kastenmittel mit Radius r (Summenbild), Rand: nur die Punkte im Bild */
export function kasten(q, w, h, r) {
  const S = new Float64Array((w + 1) * (h + 1)), aus = new Float32Array(w * h);
  for (let y = 0; y < h; y++) {
    let z = 0;
    for (let x = 0; x < w; x++) { z += q[y * w + x]; S[(y + 1) * (w + 1) + x + 1] = S[y * (w + 1) + x + 1] + z; }
  }
  for (let y = 0; y < h; y++) {
    const y0 = Math.max(0, y - r), y1 = Math.min(h, y + r + 1);
    for (let x = 0; x < w; x++) {
      const x0 = Math.max(0, x - r), x1 = Math.min(w, x + r + 1);
      aus[y * w + x] = (S[y1 * (w + 1) + x1] - S[y0 * (w + 1) + x1] - S[y1 * (w + 1) + x0] + S[y0 * (w + 1) + x0]) / ((x1 - x0) * (y1 - y0));
    }
  }
  return aus;
}
/** ungefähr gaussisch: drei Kastenmittel */
export function weichzeichnen(q, w, h, sigma) {
  if (sigma < 0.5) return Float32Array.from(q);
  const r = Math.max(1, Math.round(Math.sqrt((12 * sigma * sigma) / 3 + 1) / 2));
  return kasten(kasten(kasten(q, w, h, r), w, h, r), w, h, r);
}
function perzentil(q, p) {
  const n = q.length, schritt = Math.max(1, Math.floor(n / 20000)), probe = [];
  for (let i = 0; i < n; i += schritt) probe.push(q[i]);
  probe.sort((a, b) => a - b);
  return probe[Math.min(probe.length - 1, Math.floor(p * probe.length))];
}
/** alles zusammen; daten: RGBA (w × h, halbe Filmgrösse), massstab: Filmpunkte je Punkt der Analyse */
export function analysieren(daten, w, h, { massstab = 2 } = {}) {
  const t0 = Date.now(), n = w * h, hell = new Float32Array(n);
  for (let i = 0; i < n; i++) hell[i] = (0.2126 * daten[i * 4] + 0.7152 * daten[i * 4 + 1] + 0.0722 * daten[i * 4 + 2]) / 255;
  return {
    w, h, massstab, B: w * massstab, H: h * massstab, hell,
    // Tonumfang (3 und 97 %) und mittlere Helligkeit
    ton: [perzentil(hell, 0.03), perzentil(hell, 0.97)], mittel: hell.reduce((s, v) => s + v, 0) / n,
    ms: Date.now() - t0,
  };
}
