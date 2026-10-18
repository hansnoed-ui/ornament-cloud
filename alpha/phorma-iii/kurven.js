// PHORMA III – Kurven für das Gewebe (ohne DOM): Linien gleicher Höhe (Marching Squares) einer Karte, zu Zügen verkettet, die längsten zuerst,
// gleichmässig neu abgetastet. Beim Text sind es die Umrisse der Buchstaben, beim Foto Linien gleicher Helligkeit.

/** Linien der Höhe stufe in feld (w × h, Zeile 0 oben) als Züge [[x, y, x, y, …], …] in Punkten des Felds */
export function hoehenlinien(feld, w, h, stufe) {
  const kante = new Map();                                               // Kante → [Gegenstück, …]
  const punkt = new Map();                                               // Kante → [x, y]
  const id = (x, y, senkrecht) => 2 * (y * w + x) + (senkrecht ? 1 : 0);
  const v = (x, y) => feld[y * w + x];
  const auf = (k, x0, y0, x1, y1) => {                                   // Schnittpunkt auf der Kante, linear
    if (!punkt.has(k)) { const a = v(x0, y0), b = v(x1, y1), u = Math.abs(b - a) > 1e-9 ? (stufe - a) / (b - a) : 0.5; punkt.set(k, [x0 + (x1 - x0) * u, y0 + (y1 - y0) * u]); }
    return k;
  };
  const verbinde = (a, b) => { (kante.get(a) ?? kante.set(a, []).get(a)).push(b); (kante.get(b) ?? kante.set(b, []).get(b)).push(a); };
  for (let y = 0; y < h - 1; y++) for (let x = 0; x < w - 1; x++) {
    const c = (v(x, y) > stufe ? 8 : 0) | (v(x + 1, y) > stufe ? 4 : 0) | (v(x + 1, y + 1) > stufe ? 2 : 0) | (v(x, y + 1) > stufe ? 1 : 0);
    if (c === 0 || c === 15) continue;
    const o = () => auf(id(x, y, false), x, y, x + 1, y), u = () => auf(id(x, y + 1, false), x, y + 1, x + 1, y + 1);
    const l = () => auf(id(x, y, true), x, y, x, y + 1), r = () => auf(id(x + 1, y, true), x + 1, y, x + 1, y + 1);
    switch (c) {
      case 1: case 14: verbinde(l(), u()); break;
      case 2: case 13: verbinde(u(), r()); break;
      case 3: case 12: verbinde(l(), r()); break;
      case 4: case 11: verbinde(o(), r()); break;
      case 6: case 9: verbinde(o(), u()); break;
      case 7: case 8: verbinde(l(), o()); break;
      case 5: verbinde(l(), o()); verbinde(u(), r()); break;
      case 10: verbinde(o(), r()); verbinde(l(), u()); break;
    }
  }
  const besucht = new Set(), zuege = [];
  const gehe = (start) => {
    const z = [start]; besucht.add(start);
    let jetzt = start;
    for (;;) { const nach = (kante.get(jetzt) ?? []).find((k) => !besucht.has(k)); if (nach === undefined) break; besucht.add(nach); z.push(nach); jetzt = nach; }
    return z;
  };
  // erst die offenen Enden (Züge, die am Rand beginnen), dann die geschlossenen
  for (const [k, n] of kante) if (n.length === 1 && !besucht.has(k)) zuege.push(gehe(k));
  for (const k of kante.keys()) if (!besucht.has(k)) { const z = gehe(k); z.push(z[0]); zuege.push(z); }
  return zuege.map((z) => z.flatMap((k) => punkt.get(k)));
}

const laenge = (p) => { let s = 0; for (let i = 2; i < p.length; i += 2) s += Math.hypot(p[i] - p[i - 2], p[i + 1] - p[i - 1]); return s; };

/** einen Zug auf n Punkte in gleichen Abständen bringen */
export function abtasten(p, n) {
  const L = laenge(p), aus = new Float32Array(n * 2);
  let j = 0, s = 0;
  for (let k = 0; k < n; k++) {
    const ziel = (k / (n - 1)) * L;
    while (j < p.length / 2 - 2) { const d = Math.hypot(p[2 * j + 2] - p[2 * j], p[2 * j + 3] - p[2 * j + 1]); if (s + d >= ziel) break; s += d; j++; }
    const d = Math.hypot(p[2 * j + 2] - p[2 * j], p[2 * j + 3] - p[2 * j + 1]) || 1, u = Math.min(1, Math.max(0, (ziel - s) / d));
    aus[2 * k] = p[2 * j] + (p[2 * j + 2] - p[2 * j]) * u; aus[2 * k + 1] = p[2 * j + 1] + (p[2 * j + 3] - p[2 * j + 1]) * u;
  }
  return aus;
}

/**
 * Kurven für das Gewebe: Höhenlinien auf den stufen, zu lange Züge in Stücke von höchstens maxLaenge geteilt, zu kurze weggelassen, die längsten
 * anzahl Stücke, jedes mit punkte Punkten. Ergebnis: [Float32Array(punkte · 2)] in Punkten des Felds.
 */
export function gewebeKurven(feld, w, h, { stufen = [0.5], anzahl = 28, punkte = 80, minLaenge = 0.04, maxLaenge = 0.45 } = {}) {
  const m = Math.max(w, h), stuecke = [];
  for (const s of stufen) for (const z of hoehenlinien(feld, w, h, s)) {
    const L = laenge(z);
    if (L < minLaenge * m) continue;
    const teile = Math.ceil(L / (maxLaenge * m)), pro = Math.ceil(z.length / 2 / teile);
    for (let t = 0; t < teile; t++) { const st = z.slice(2 * Math.max(0, t * pro - 1), 2 * Math.min(z.length / 2, (t + 1) * pro + 1)); if (st.length >= 8) stuecke.push([laenge(st), st]); }
  }
  stuecke.sort((a, b) => b[0] - a[0]);
  return stuecke.slice(0, anzahl).map(([, p]) => abtasten(p, punkte));
}
