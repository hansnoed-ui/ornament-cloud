// Die beiden Grenzen des Videos «wachstum»: eine atmende Wolke aus Kreisen und die Buchstaben von «ornament.cloud».
import { SANS } from "../vorlage/stil";
import { BILD, type Form, type Ring } from "./Wachstum";

// ---------- Wolke ----------
// Kreise (Mitte x, Mitte y, Radius) oben, unten ein flacher Sockel; die Radien atmen langsam (Zeit wie im Sketch: 0,008 je Schritt)
const DY = 40;                                      // alles etwas tiefer, damit die Wolke mittig steht
const KREISE: [number, number, number][] = [
  [540, 450 + DY, 175],
  [385, 505 + DY, 130],
  [700, 500 + DY, 145],
  [255, 625 + DY, 110],
  [835, 625 + DY, 108],
  [455, 375 + DY, 105],
  [625, 385 + DY, 112],
  [540, 610 + DY, 140],
];
const BASIS = 722 + DY;
const SOCKEL = { x0: 255, x1: 835, y0: 560 + DY };  // Rechteck unten, fast ganz von den Kreisen verdeckt, schliesst die Lücken über dem flachen Boden
const MITTE: [number, number] = [540, 520 + DY];

export const wolkeForm: Form = (x, y, schritt) => {
  const t = schritt * 0.008;
  let s = Math.min(x - SOCKEL.x0, SOCKEL.x1 - x, y - SOCKEL.y0);
  for (let i = 0; i < KREISE.length; i++) {
    const [cx, cy, r] = KREISE[i];
    const d = r * (1 + 0.045 * Math.sin(t * (0.8 + 0.23 * i) + i * 1.7)) - Math.hypot(x - cx, y - cy);
    if (d > s) s = d;
  }
  return Math.min(s, BASIS - y);
};

/** Umriss der Wolke als Pfad: von der Mitte aus der äussere Rand in 720 Richtungen */
export const wolkeUmriss = (schritt: number): string => {
  const teile: string[] = [];
  const N = 720;
  for (let i = 0; i < N; i++) {
    const a = (i / N) * Math.PI * 2, cx = Math.cos(a), cy = Math.sin(a);
    let r = 560;
    while (r > 0 && wolkeForm(MITTE[0] + cx * r, MITTE[1] + cy * r, schritt) <= 0) r -= 4;
    let lo = r, hi = r + 4;                                   // Rand liegt zwischen lo (innen) und hi (aussen)
    for (let k = 0; k < 5; k++) {
      const mid = (lo + hi) / 2;
      if (wolkeForm(MITTE[0] + cx * mid, MITTE[1] + cy * mid, schritt) > 0) lo = mid; else hi = mid;
    }
    teile.push(`${i ? "L" : "M"}${(MITTE[0] + cx * lo).toFixed(1)},${(MITTE[1] + cy * lo).toFixed(1)}`);
  }
  return teile.join("") + "Z";
};

export const WOLKE_START: Pick<Ring, "x" | "y" | "r"> = { x: 540, y: 480 + DY, r: 40 };

// ---------- Buchstaben ----------
const ZEILEN = ["orna", "ment.", "cloud"];
const PX = 300, GEWICHT = 700, SPERRUNG = 0.03, ABSTAND = 0.86;
const INF = 1e20;

/** Felzenszwalb: Abstand jedes Pixels zum nächsten Pixel mit Wert `wert` (eindimensional, in d) */
const edt1 = (f: Float64Array, n: number, d: Float64Array, v: Int32Array, z: Float64Array) => {
  let k = 0;
  v[0] = 0; z[0] = -INF; z[1] = INF;
  for (let q = 1; q < n; q++) {
    let s = (f[q] + q * q - (f[v[k]] + v[k] * v[k])) / (2 * q - 2 * v[k]);
    while (s <= z[k]) { k--; s = (f[q] + q * q - (f[v[k]] + v[k] * v[k])) / (2 * q - 2 * v[k]); }
    k++; v[k] = q; z[k] = s; z[k + 1] = INF;
  }
  k = 0;
  for (let q = 0; q < n; q++) {
    while (z[k + 1] < q) k++;
    d[q] = (q - v[k]) * (q - v[k]) + f[v[k]];
  }
};
const edt = (maske: Uint8Array, wert: number): Float64Array => {
  const f = new Float64Array(BILD * BILD);
  for (let i = 0; i < f.length; i++) f[i] = maske[i] === wert ? 0 : INF;
  const d = new Float64Array(BILD), v = new Int32Array(BILD), z = new Float64Array(BILD + 1), spalte = new Float64Array(BILD);
  for (let x = 0; x < BILD; x++) {
    for (let y = 0; y < BILD; y++) spalte[y] = f[y * BILD + x];
    edt1(spalte, BILD, d, v, z);
    for (let y = 0; y < BILD; y++) f[y * BILD + x] = d[y];
  }
  const zeile = new Float64Array(BILD);
  for (let y = 0; y < BILD; y++) {
    for (let x = 0; x < BILD; x++) zeile[x] = f[y * BILD + x];
    edt1(zeile, BILD, d, v, z);
    for (let x = 0; x < BILD; x++) f[y * BILD + x] = Math.sqrt(d[x]);
  }
  return f;
};

export type Buchstaben = { form: Form; ringe: (Pick<Ring, "x" | "y" | "r" | "ziel"> & { punkt: boolean })[] };

/** Maske des Schriftzugs (Instrument Sans, dreizeilig «orna / ment. / cloud»), Abstandsfeld und ein Keim je Zeichen in Leserichtung.
 *  Braucht die geladene Schrift und ein Canvas (also nur beim Rendern im Browser). `flaeche`: px² je Punkt. */
export const buchstabenForm = (flaeche: number): Buchstaben => {
  const c = document.createElement("canvas");
  c.width = BILD; c.height = BILD;
  const x = c.getContext("2d", { willReadFrequently: true })!;
  x.fillStyle = "#000";
  x.font = `${GEWICHT} ${PX}px ${SANS}`;
  x.letterSpacing = `${SPERRUNG * PX}px`;
  x.textBaseline = "alphabetic";
  const masse = ZEILEN.map((z) => x.measureText(z));
  const hoehe = (ZEILEN.length - 1) * ABSTAND * PX + masse[0].actualBoundingBoxAscent;
  const oben = (BILD - hoehe) / 2 + masse[0].actualBoundingBoxAscent;
  const basis = ZEILEN.map((_, i) => oben + i * ABSTAND * PX);
  ZEILEN.forEach((z, i) => x.fillText(z, (BILD - (masse[i].width - SPERRUNG * PX)) / 2, basis[i]));
  const daten = x.getImageData(0, 0, BILD, BILD).data;
  const maske = new Uint8Array(BILD * BILD);
  for (let i = 0; i < maske.length; i++) maske[i] = daten[i * 4 + 3] > 127 ? 1 : 0;

  // Abstandsfeld: innen positiv
  const aussen = edt(maske, 1), innen = edt(maske, 0);
  const feld = new Float32Array(BILD * BILD);
  for (let i = 0; i < feld.length; i++) feld[i] = maske[i] ? innen[i] - 0.5 : -(aussen[i] - 0.5);
  const form: Form = (px, py) => {
    const fx = Math.min(BILD - 2, Math.max(1, px)), fy = Math.min(BILD - 2, Math.max(1, py));
    const ix = fx | 0, iy = fy | 0, tx = fx - ix, ty = fy - iy, i = iy * BILD + ix;
    return feld[i] * (1 - tx) * (1 - ty) + feld[i + 1] * tx * (1 - ty) + feld[i + BILD] * (1 - tx) * ty + feld[i + BILD + 1] * tx * ty;
  };

  // Zusammenhängende Flächen = Zeichen; Keim an der Stelle mit dem grössten Abstand zum Rand
  type Teil = { flaeche: number; cx: number; cy: number; tiefe: number; minX: number; untenY: number };
  const marke = new Int32Array(BILD * BILD), teile: Teil[] = [], stapel = new Int32Array(BILD * BILD);
  for (let i = 0; i < maske.length; i++) {
    if (!maske[i] || marke[i]) continue;
    const nr = teile.length + 1;
    const t: Teil = { flaeche: 0, cx: 0, cy: 0, tiefe: -1, minX: BILD, untenY: 0 };
    let sp = 0;
    stapel[sp++] = i; marke[i] = nr;
    while (sp) {
      const p = stapel[--sp], px = p % BILD, py = (p / BILD) | 0;
      t.flaeche++;
      if (feld[p] > t.tiefe) { t.tiefe = feld[p]; t.cx = px; t.cy = py; }
      if (px < t.minX) t.minX = px;
      if (py > t.untenY) t.untenY = py;
      if (px > 0 && maske[p - 1] && !marke[p - 1]) { marke[p - 1] = nr; stapel[sp++] = p - 1; }
      if (px < BILD - 1 && maske[p + 1] && !marke[p + 1]) { marke[p + 1] = nr; stapel[sp++] = p + 1; }
      if (py > 0 && maske[p - BILD] && !marke[p - BILD]) { marke[p - BILD] = nr; stapel[sp++] = p - BILD; }
      if (py < BILD - 1 && maske[p + BILD] && !marke[p + BILD]) { marke[p + BILD] = nr; stapel[sp++] = p + BILD; }
    }
    teile.push(t);
  }
  // Leserichtung: erst nach Zeile (Unterkante nahe der Grundlinie), dann von links nach rechts
  const zeile = (t: Teil) => basis.reduce((b, y, i) => (Math.abs(t.untenY - y) < Math.abs(t.untenY - basis[b]) ? i : b), 0);
  teile.sort((a, b) => zeile(a) - zeile(b) || a.minX - b.minX);
  const klein = teile.reduce((a, t) => (t.flaeche < a.flaeche ? t : a), teile[0]);
  const ringe = teile.map((t) => ({ x: t.cx, y: t.cy, r: Math.max(3, Math.min(10, t.tiefe * 0.5)), ziel: Math.round(t.flaeche / flaeche), punkt: t === klein }));
  return { form, ringe };
};

