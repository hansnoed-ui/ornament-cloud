// «Bildfragmentieren» – transparente geometrische Körper für die Farbwellen (ohne DOM): Ikosaeder, Dodekaeder (sein Dual) und eine
// geodätische Kugel (das Ikosaeder zweimal unterteilt). Ecken auf der Einheitskugel, Kanten als Paare, Flächen als Dreiecke (das Dodekaeder
// ohne Flächen, es bleibt ein Gitter). Dazu Drehen und perspektivisch Abbilden.
// (Wunsch vom 15. Oktober 2026: «die farbigen Kreise sind too much … lieber ersetzen durch komplexe transparente geometrische Körper»)

const PHI = (1 + Math.sqrt(5)) / 2;
const einheit = (v) => { const l = Math.hypot(...v); return v.map((x) => x / l); };

const ICO_ECKEN = [[-1, PHI, 0], [1, PHI, 0], [-1, -PHI, 0], [1, -PHI, 0], [0, -1, PHI], [0, 1, PHI], [0, -1, -PHI], [0, 1, -PHI],
  [PHI, 0, -1], [PHI, 0, 1], [-PHI, 0, -1], [-PHI, 0, 1]].map(einheit);
const ICO_FLAECHEN = [[0, 11, 5], [0, 5, 1], [0, 1, 7], [0, 7, 10], [0, 10, 11], [1, 5, 9], [5, 11, 4], [11, 10, 2], [10, 7, 6], [7, 1, 8],
  [3, 9, 4], [3, 4, 2], [3, 2, 6], [3, 6, 8], [3, 8, 9], [4, 9, 5], [2, 4, 11], [6, 2, 10], [8, 6, 7], [9, 8, 1]];

/** Kanten aus Dreiecksflächen (jede einmal) */
function kantenAus(flaechen) {
  const set = new Map();
  for (const f of flaechen) for (let k = 0; k < 3; k++) {
    const a = f[k], b = f[(k + 1) % 3];
    set.set(a < b ? `${a},${b}` : `${b},${a}`, a < b ? [a, b] : [b, a]);
  }
  return [...set.values()];
}

/** jede Dreiecksfläche in vier teilen, neue Ecken auf die Kugel */
function unterteilen({ ecken, flaechen }) {
  const v = ecken.map((e) => [...e]), mitte = new Map(), neu = [];
  const m = (a, b) => {
    const k = a < b ? `${a},${b}` : `${b},${a}`;
    if (!mitte.has(k)) { v.push(einheit(v[a].map((x, i) => (x + v[b][i]) / 2))); mitte.set(k, v.length - 1); }
    return mitte.get(k);
  };
  for (const [a, b, c] of flaechen) { const ab = m(a, b), bc = m(b, c), ca = m(c, a); neu.push([a, ab, ca], [b, bc, ab], [c, ca, bc], [ab, bc, ca]); }
  return { ecken: v, flaechen: neu };
}

const ikosaeder = { ecken: ICO_ECKEN, flaechen: ICO_FLAECHEN, kanten: kantenAus(ICO_FLAECHEN) };
const geo = unterteilen(unterteilen({ ecken: ICO_ECKEN, flaechen: ICO_FLAECHEN }));
const geode = { ...geo, kanten: kantenAus(geo.flaechen) };
// Dodekaeder: die Mitten der Ikosaederflächen; verbunden, wo zwei Flächen eine Kante teilen
const dodeka = ICO_FLAECHEN.map((f) => einheit([0, 1, 2].map((i) => (ICO_ECKEN[f[0]][i] + ICO_ECKEN[f[1]][i] + ICO_ECKEN[f[2]][i]) / 3)));
const dodekaKanten = [];
for (let a = 0; a < ICO_FLAECHEN.length; a++) for (let b = a + 1; b < ICO_FLAECHEN.length; b++)
  if (ICO_FLAECHEN[a].filter((x) => ICO_FLAECHEN[b].includes(x)).length === 2) dodekaKanten.push([a, b]);
const dodekaeder = { ecken: dodeka, flaechen: [], kanten: dodekaKanten };

export const KOERPER = { ikosaeder, dodekaeder, geode };

/**
 * Körper gedreht (um x, y, z in dieser Reihenfolge) und perspektivisch abgebildet: Mitte (mx, my), Radius r (für eine Ecke auf der Höhe der Mitte).
 * Gibt je Ecke [x, y, z] (z: −1 hinten … 1 vorn, nach der Drehung).
 */
export function abbilden(koerper, mx, my, r, [ax, ay, az]) {
  const ca = Math.cos(ax), sa = Math.sin(ax), cb = Math.cos(ay), sb = Math.sin(ay), cc = Math.cos(az), sc = Math.sin(az);
  return koerper.ecken.map(([x, y, z]) => {
    let y1 = y * ca - z * sa, z1 = y * sa + z * ca;
    const x2 = x * cb + z1 * sb, z2 = -x * sb + z1 * cb;
    const x3 = x2 * cc - y1 * sc, y3 = x2 * sc + y1 * cc;
    const p = 1 / (1 - z2 * 0.22);
    return [mx + x3 * r * p, my + y3 * r * p, z2];
  });
}
