// PHORMA II – das Foto verstehen (ohne DOM, im Web Worker rechner.js oder in Node für die Tests). Gerechnet auf der halben Filmgrösse.
//   hell     – Helligkeit 0..1
//   tiefe    – 1 nah … 0 fern, aus dem Bild geschätzt (Schärfe, Lage, Farbe, Himmel), dann mit einem geführten Filter an die Kanten des Fotos gelegt;
//              die KI-Tiefe (tiefe-ki.js) ersetzt sie auf Wunsch und läuft durch denselben Filter (tiefeNormieren)
//   nahrung  – was die Agenten von Physarum riechen: Kanten, etwas Helligkeit
//   keime    – die Stellen, an denen Physarum beginnt (die markantesten, mit Mindestabstand)
//   linien   – der Stich: gleichmässig verteilte Strömungslinien (Jobard–Lefer) entlang der Richtung des Bilds (Strukturtensor), in Filmpunkten;
//              «haupt» folgt den Kanten, «quer» kreuzt sie (die zweite Lage in hellen Tönen)
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

/** Richtungsfeld aus dem Strukturtensor: doppelter Winkel der Tangente (cos 2θ, sin 2θ) und die Kantenstärke */
export function richtung(hell, w, h) {
  const L = weichzeichnen(hell, w, h, 1), [gx, gy] = sobel(L, w, h), n = w * h;
  const xx = new Float32Array(n), xy = new Float32Array(n), yy = new Float32Array(n), staerke = new Float32Array(n);
  for (let i = 0; i < n; i++) { xx[i] = gx[i] * gx[i]; xy[i] = gx[i] * gy[i]; yy[i] = gy[i] * gy[i]; staerke[i] = Math.hypot(gx[i], gy[i]); }
  const s1 = Math.max(1.5, w / 220), s2 = Math.max(6, w / 45);
  const f = [xx, xy, yy].map((q) => weichzeichnen(q, w, h, s1)), g = [xx, xy, yy].map((q) => weichzeichnen(q, w, h, s2));
  const c2 = new Float32Array(n), s2a = new Float32Array(n), eps = 2e-5;
  for (let i = 0; i < n; i++) {
    // fein + grob, dazu ein schwacher Grundzug (waagrechte Linien) für ruhige Flächen
    const a = f[0][i] + 0.4 * g[0][i], b = f[1][i] + 0.4 * g[1][i], c = f[2][i] + 0.4 * g[2][i] + eps;
    const th = 0.5 * Math.atan2(2 * b, a - c) + Math.PI / 2;           // Gradient → Tangente
    c2[i] = Math.cos(2 * th); s2a[i] = Math.sin(2 * th);
  }
  return { c2, s2: s2a, staerke: normieren(weichzeichnen(staerke, w, h, 1.5), 0.02, 0.98) };
}

/**
 * Gleichmässig verteilte Strömungslinien (Jobard & Lefer 1997) im Feld (B × H Filmpunkte, Feld auf w × h, Massstab m).
 * quer: senkrecht zum Feld. Ergebnis: { punkte: Float32Array (x, y), linien: [[anfang, anzahl, wichtigkeit, laenge]] }
 */
export function stromlinien(feld, w, h, m, { abstand = 7, quer = false, schritt = 2, maxLaenge = 1600 } = {}) {
  const B = w * m, H = h * m, dsep = abstand, dtest = abstand * 0.5, zelle = dsep;
  const gw = Math.ceil(B / zelle), gh = Math.ceil(H / zelle), kopf = new Int32Array(gw * gh).fill(-1);
  let kap = 1 << 16, px = new Float32Array(kap), py = new Float32Array(kap), nach = new Int32Array(kap), np = 0;
  const merke = (x, y) => {
    if (np >= kap) { kap *= 2; const a = new Float32Array(kap), b = new Float32Array(kap), c = new Int32Array(kap); a.set(px); b.set(py); c.set(nach); px = a; py = b; nach = c; }
    const z = Math.min(gh - 1, Math.floor(y / zelle)) * gw + Math.min(gw - 1, Math.floor(x / zelle));
    px[np] = x; py[np] = y; nach[np] = kopf[z]; kopf[z] = np++;
  };
  const frei = (x, y, d) => {
    if (x < 0 || y < 0 || x >= B || y >= H) return false;
    const cx = Math.floor(x / zelle), cy = Math.floor(y / zelle), d2 = d * d;
    for (let j = Math.max(0, cy - 1); j <= Math.min(gh - 1, cy + 1); j++) for (let i = Math.max(0, cx - 1); i <= Math.min(gw - 1, cx + 1); i++)
      for (let k = kopf[j * gw + i]; k >= 0; k = nach[k]) { const dx = px[k] - x, dy = py[k] - y; if (dx * dx + dy * dy < d2) return false; }
    return true;
  };
  // Feld bilinear im doppelten Winkel, dann die Richtung, die zur bisherigen passt
  const dir = (x, y, vx, vy) => {
    const fx = klemm(x / m - 0.5, 0, w - 1.001), fy = klemm(y / m - 0.5, 0, h - 1.001), x0 = fx | 0, y0 = fy | 0, ax = fx - x0, ay = fy - y0, i = y0 * w + x0;
    const mix = (q) => (q[i] * (1 - ax) + q[i + 1] * ax) * (1 - ay) + (q[i + w] * (1 - ax) + q[i + w + 1] * ax) * ay;
    let th = 0.5 * Math.atan2(mix(feld.s2), mix(feld.c2));
    if (quer) th += Math.PI / 2;
    let dx = Math.cos(th), dy = Math.sin(th);
    if (dx * vx + dy * vy < 0) { dx = -dx; dy = -dy; }
    return [dx, dy];
  };
  const kraft = (x, y) => feld.staerke[klemm(Math.floor(y / m), 0, h - 1) * w + klemm(Math.floor(x / m), 0, w - 1)];
  const eigeneFrei = (x, y, eigene, bis) => { for (let k = 0; k < bis; k += 2) { const dx = eigene[k] - x, dy = eigene[k + 1] - y; if (dx * dx + dy * dy < dtest * dtest) return false; } return true; };
  const halb = (x, y, vx, vy) => {
    const pts = [];
    let lx = x, ly = y, l = 0;
    while (l < maxLaenge / 2) {
      let [dx, dy] = dir(lx, ly, vx, vy);
      const [ex, ey] = dir(lx + dx * schritt * 0.5, ly + dy * schritt * 0.5, dx, dy);   // Mittelpunktregel
      const nx = lx + ex * schritt, ny = ly + ey * schritt;
      if (ex * vx + ey * vy < 0.55 && pts.length) break;                    // scharfer Knick
      if (!frei(nx, ny, dtest)) break;
      const alt = pts.length - 2 * Math.ceil((2 * dtest) / schritt + 2);    // nicht in sich selbst zurück
      if (alt > 0 && !eigeneFrei(nx, ny, pts, alt)) break;
      pts.push(nx, ny); lx = nx; ly = ny; vx = ex; vy = ey; l += schritt;
    }
    return pts;
  };
  const punkte = [], linien = [], queue = [];
  const linie = (x, y) => {
    if (!frei(x, y, dsep)) return;
    const [vx, vy] = dir(x, y, 1, 0.001);
    const vor = halb(x, y, vx, vy), rueck = halb(x, y, -vx, -vy);
    const n = (vor.length + rueck.length) / 2 + 1;
    if (n * schritt < Math.max(3 * dsep, 18)) return;
    const pts = new Float32Array(n * 2);
    let k = 0;
    for (let i = rueck.length - 2; i >= 0; i -= 2) { pts[k++] = rueck[i]; pts[k++] = rueck[i + 1]; }
    pts[k++] = x; pts[k++] = y;
    for (let i = 0; i < vor.length; i += 2) { pts[k++] = vor[i]; pts[k++] = vor[i + 1]; }
    let wicht = 0;
    for (let i = 0; i < n; i++) { merke(pts[2 * i], pts[2 * i + 1]); wicht += kraft(pts[2 * i], pts[2 * i + 1]); }
    linien.push([punkte.length / 2, n, wicht * schritt, n * schritt]);
    for (let i = 0; i < pts.length; i++) punkte.push(pts[i]);
    // neue Keime im Abstand dsep beidseits
    for (let i = 1; i < n - 1; i += 2) {
      const ax = pts[2 * i + 2] - pts[2 * i - 2], ay = pts[2 * i + 3] - pts[2 * i - 1], l = Math.hypot(ax, ay) || 1;
      queue.push(pts[2 * i] - (ay / l) * dsep, pts[2 * i + 1] + (ax / l) * dsep, pts[2 * i] + (ay / l) * dsep, pts[2 * i + 1] - (ax / l) * dsep);
    }
  };
  const abarbeiten = () => { for (let q = 0; q < queue.length; q += 2) linie(queue[q], queue[q + 1]); queue.length = 0; };
  linie(B / 2, H / 2); abarbeiten();
  // was die Keime nicht erreicht haben (Inseln), von einem Raster aus füllen
  for (let y = dsep / 2; y < H; y += dsep) for (let x = dsep / 2; x < B; x += dsep) { linie(x, y); abarbeiten(); }
  return { punkte: Float32Array.from(punkte), linien };
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

export const ABSTAND = { fein: 5.5, mittel: 7, grob: 9 };

/** alles zusammen; daten: RGBA (w × h, halbe Filmgrösse), massstab: Filmpunkte je Punkt der Analyse */
export function analysieren(daten, w, h, { massstab = 2, strich = "mittel" } = {}) {
  const t0 = Date.now(), n = w * h, hell = new Float32Array(n);
  for (let i = 0; i < n; i++) hell[i] = (0.2126 * daten[i * 4] + 0.7152 * daten[i * 4 + 1] + 0.0722 * daten[i * 4 + 2]) / 255;
  const tiefe = tiefeSchaetzen(daten, hell, w, h);
  const feld = richtung(hell, w, h);
  const nahrung = new Float32Array(n);
  for (let i = 0; i < n; i++) nahrung[i] = klemm(0.75 * feld.staerke[i] + 0.25 * hell[i]);
  const keime = keimeFinden(nahrung, w, h);
  const abstand = (ABSTAND[strich] ?? ABSTAND.mittel) * (w * massstab) / 1080;
  const haupt = stromlinien(feld, w, h, massstab, { abstand });
  const querLinien = stromlinien(feld, w, h, massstab, { abstand, quer: true });
  return {
    w, h, massstab, B: w * massstab, H: h * massstab, hell, tiefe, nahrung, keime, abstand,
    // Tonumfang (3 und 97 %) und mittlere Helligkeit: der Stich richtet sich danach (auf Papier oder auf Schwarz)
    ton: [perzentil(hell, 0.03), perzentil(hell, 0.97)], mittel: hell.reduce((s, v) => s + v, 0) / n,
    linien: { haupt, quer: querLinien },
    zahl: { linien: haupt.linien.length, querlinien: querLinien.linien.length, punkte: (haupt.punkte.length + querLinien.punkte.length) / 2 },
    ms: Date.now() - t0,
  };
}
