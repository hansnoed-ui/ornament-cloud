// PHORMA II – das Foto verstehen (ohne DOM, im Web Worker rechner.js oder in Node für die Tests). Gerechnet auf der halben Filmgrösse.
//   hell     – Helligkeit 0..1
//   tiefe    – 1 nah … 0 fern, aus dem Bild geschätzt (Schärfe, Lage, Farbe, Himmel), dann mit einem geführten Filter an die Kanten des Fotos gelegt;
//              die KI-Tiefe (tiefe-ki.js) ersetzt sie auf Wunsch und läuft durch denselben Filter (tiefeNormieren)
//   nahrung  – was die Agenten von Physarum riechen: Kanten, etwas Helligkeit
//   keime    – die Stellen, an denen Physarum beginnt (die markantesten, mit Mindestabstand)
//   ton      – Tonumfang und mittlere Helligkeit für die Morphogenese
// (Bis zum 17. Oktober 2026 auch Strömungslinien für den Stich; er ist durch die Morphogenese ersetzt – Rückmeldung: «diese Stich-Optiken mag ich
// nicht besonders»; das Rezept steht weiter im Skill threejs-spektakel.)
// Zufall mit Startwert: dasselbe Foto ergibt immer dasselbe.

/** Mulberry32 */
export function zufall(s = 1) {
  return () => { s |= 0; s = (s + 0x6d2b79f5) | 0; let t = Math.imul(s ^ (s >>> 15), 1 | s); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
const klemm = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const glatt = (a, b, x) => { const t = klemm((x - a) / (b - a)); return t * t * (3 - 2 * t); };

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
function normieren(q, unten = 0.02, oben = 0.98) {
  const a = perzentil(q, unten), b = perzentil(q, oben), d = b - a || 1;
  for (let i = 0; i < q.length; i++) q[i] = klemm((q[i] - a) / d);
  return q;
}
/** geführter Filter (He et al.) mit Grauwert-Führung: legt eine weiche Karte an die Kanten der Führung */
export function gefuehrt(p, I, w, h, r, eps) {
  const n = w * h, II = new Float32Array(n), Ip = new Float32Array(n);
  for (let i = 0; i < n; i++) { II[i] = I[i] * I[i]; Ip[i] = I[i] * p[i]; }
  const mI = kasten(I, w, h, r), mp = kasten(p, w, h, r), mII = kasten(II, w, h, r), mIp = kasten(Ip, w, h, r);
  const a = new Float32Array(n), b = new Float32Array(n);
  for (let i = 0; i < n; i++) { const v = mII[i] - mI[i] * mI[i], c = mIp[i] - mI[i] * mp[i]; a[i] = c / (v + eps); b[i] = mp[i] - a[i] * mI[i]; }
  const ma = kasten(a, w, h, r), mb = kasten(b, w, h, r), aus = new Float32Array(n);
  for (let i = 0; i < n; i++) aus[i] = ma[i] * I[i] + mb[i];
  return aus;
}
function sobel(q, w, h) {
  const gx = new Float32Array(w * h), gy = new Float32Array(w * h);
  const at = (x, y) => q[klemm(y, 0, h - 1) * w + klemm(x, 0, w - 1)];
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const a = at(x - 1, y - 1), b = at(x, y - 1), c = at(x + 1, y - 1), d = at(x - 1, y), f = at(x + 1, y), g = at(x - 1, y + 1), k = at(x, y + 1), l = at(x + 1, y + 1);
    gx[y * w + x] = (c + 2 * f + l - a - 2 * d - g) / 8;
    gy[y * w + x] = (g + 2 * k + l - a - 2 * b - c) / 8;
  }
  return [gx, gy];
}

/** Tiefe aus dem Bild: nah ist, was unten liegt, scharf und gezeichnet ist, gegen die Mitte und satt; fern der helle, ruhige Himmel oben */
export function tiefeSchaetzen(daten, hell, w, h) {
  const n = w * h, lap = new Float32Array(n), sat = new Float32Array(n), cue = new Float32Array(n);
  for (let y = 1; y < h - 1; y++) for (let x = 1; x < w - 1; x++) { const i = y * w + x; lap[i] = Math.abs(4 * hell[i] - hell[i - 1] - hell[i + 1] - hell[i - w] - hell[i + w]); }
  const detail = normieren(weichzeichnen(lap, w, h, Math.max(4, w / 70)), 0.05, 0.95);
  for (let i = 0; i < n; i++) {
    const r = daten[i * 4], g = daten[i * 4 + 1], b = daten[i * 4 + 2], mx = Math.max(r, g, b), mn = Math.min(r, g, b);
    sat[i] = mx > 0 ? (mx - mn) / mx : 0;
  }
  const satW = weichzeichnen(sat, w, h, w / 60);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const i = y * w + x, u = x / w, v = y / h;
    const himmel = glatt(0.5, 0.85, hell[i]) * (1 - detail[i]) * (1 - v) ** 1.5 * (daten[i * 4 + 2] >= daten[i * 4] ? 1 : 0.6);
    const mitte = Math.exp(-((u - 0.5) ** 2) / 0.12 - ((v - 0.55) ** 2) / 0.2);
    cue[i] = 0.32 * v + 0.3 * detail[i] + 0.22 * mitte + 0.1 * satW[i] - 0.4 * himmel;
  }
  return tiefeNormieren(normieren(weichzeichnen(cue, w, h, w / 28)), w, h, hell);
}
/** eine Tiefenkarte (1 nah) an die Kanten des Fotos legen und auf 0..1 bringen – für die geschätzte und die KI-Tiefe */
export function tiefeNormieren(roh, w, h, hell) {
  let d = gefuehrt(roh, hell, w, h, Math.max(4, Math.round(w / 60)), 0.006);
  d = gefuehrt(d, hell, w, h, Math.max(2, Math.round(w / 140)), 0.002);
  return normieren(d, 0.01, 0.99);
}

/** Kantenstärke 0..1 (Sobel auf der leicht geglätteten Helligkeit) – für die Nahrung von Physarum und die Keime der Morphogenese */
export function kanten(hell, w, h) {
  const [gx, gy] = sobel(weichzeichnen(hell, w, h, 1), w, h), k = new Float32Array(w * h);
  for (let i = 0; i < k.length; i++) k[i] = Math.sqrt(gx[i] * gx[i] + gy[i] * gy[i]);
  return normieren(weichzeichnen(k, w, h, 1.5), 0.02, 0.98);
}

/** Keime für Physarum: Maxima der weichgezeichneten Nahrung mit Mindestabstand (in uv, oben 0) */
function keimeFinden(nahrung, w, h, n = 22) {
  const q = weichzeichnen(nahrung, w, h, w / 40), kand = [];
  const r = Math.max(2, Math.round(w / 60));
  for (let y = r; y < h - r; y += r) for (let x = r; x < w - r; x += r) kand.push([q[y * w + x], x, y]);
  kand.sort((a, b) => b[0] - a[0]);
  const keime = [], d = 0.14 * Math.min(w, h);
  for (const [, x, y] of kand) {
    if (keime.every(([kx, ky]) => Math.hypot(kx - x, ky - y) > d)) keime.push([x, y]);
    if (keime.length >= n) break;
  }
  return keime.map(([x, y]) => [x / w, y / h]);
}

/** alles zusammen; daten: RGBA (w × h, halbe Filmgrösse), massstab: Filmpunkte je Punkt der Analyse */
export function analysieren(daten, w, h, { massstab = 2 } = {}) {
  const t0 = Date.now(), n = w * h, hell = new Float32Array(n);
  for (let i = 0; i < n; i++) hell[i] = (0.2126 * daten[i * 4] + 0.7152 * daten[i * 4 + 1] + 0.0722 * daten[i * 4 + 2]) / 255;
  const tiefe = tiefeSchaetzen(daten, hell, w, h);
  const staerke = kanten(hell, w, h), nahrung = new Float32Array(n);
  for (let i = 0; i < n; i++) nahrung[i] = klemm(0.75 * staerke[i] + 0.25 * hell[i]);
  const keime = keimeFinden(nahrung, w, h);
  return {
    w, h, massstab, B: w * massstab, H: h * massstab, hell, tiefe, nahrung, keime,
    // Tonumfang (3 und 97 %) und mittlere Helligkeit: die Morphogenese bildet den Ton des Fotos auf ihre Muster ab
    ton: [perzentil(hell, 0.03), perzentil(hell, 0.97)], mittel: hell.reduce((s, v) => s + v, 0) / n,
    ms: Date.now() - t0,
  };
}
