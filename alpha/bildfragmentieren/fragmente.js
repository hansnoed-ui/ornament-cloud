// «Bildfragmentieren» – ein Foto in seine Teile zerlegen (ohne DOM, läuft im Web Worker rechner.js):
//   Zeilen:   die Helligkeit entlang waagrechter Linien (daraus wird im Film ein Relief aus Linien, wie eine Abtastung)
//   Kanten:   die Umrisse des Bilds als Linienzüge (Canny: Glätten, Sobel, dünne Kanten, Hysterese, dann zu Zügen verkettet)
//   Dreiecke: das Bild als Mosaik aus Dreiecken (Delaunay), dicht an den Kanten, locker in ruhigen Flächen, jedes mit seiner
//             mittleren Farbe und Helligkeit
// Alles in Koordinaten des Films (massstab: Film / Analysebild). Gleiches Bild, gleiches Ergebnis (fester Zufall).

/** fester Zufall (Park-Miller) */
export function zufall(saat = 1) {
  let s = (Math.abs(Math.floor(saat)) % 2147483646) + 1;
  return () => (s = (s * 16807) % 2147483647) / 2147483647;
}

/** Helligkeit 0–1 (Rec. 709) */
export function helligkeit(daten, w, h) {
  const L = new Float32Array(w * h);
  for (let i = 0; i < w * h; i++) L[i] = (0.2126 * daten[4 * i] + 0.7152 * daten[4 * i + 1] + 0.0722 * daten[4 * i + 2]) / 255;
  return L;
}

/** Kastenunschärfe (Radius r), waagrecht und senkrecht; zweimal angewandt fast wie eine Gausssche */
export function unschaerfe(q, w, h, r = 1) {
  if (r < 1) return q.slice();
  const a = new Float32Array(w * h), b = new Float32Array(w * h), n = 2 * r + 1;
  for (let y = 0; y < h; y++) {
    let s = 0;
    for (let k = -r; k <= r; k++) s += q[y * w + Math.min(w - 1, Math.max(0, k))];
    for (let x = 0; x < w; x++) {
      a[y * w + x] = s / n;
      s += q[y * w + Math.min(w - 1, x + r + 1)] - q[y * w + Math.max(0, x - r)];
    }
  }
  for (let x = 0; x < w; x++) {
    let s = 0;
    for (let k = -r; k <= r; k++) s += a[Math.min(h - 1, Math.max(0, k)) * w + x];
    for (let y = 0; y < h; y++) {
      b[y * w + x] = s / n;
      s += a[Math.min(h - 1, y + r + 1) * w + x] - a[Math.max(0, y - r) * w + x];
    }
  }
  return b;
}
const gauss = (q, w, h, r) => unschaerfe(unschaerfe(q, w, h, r), w, h, r);

/** Gradient (Sobel): Betrag und Richtung. G: ein Kanal oder eine Liste von Kanälen (dann zählt je Punkt der Kanal mit dem stärksten Gefälle) */
export function gradient(G, w, h) {
  const kanaele = Array.isArray(G) ? G : [G];
  const mag = new Float32Array(w * h), gx = new Float32Array(w * h), gy = new Float32Array(w * h);
  for (const K of kanaele) for (let y = 1; y < h - 1; y++) for (let x = 1; x < w - 1; x++) {
    const i = y * w + x;
    const a = K[i - w - 1], b = K[i - w], c = K[i - w + 1], d = K[i - 1], f = K[i + 1], g = K[i + w - 1], k = K[i + w], l = K[i + w + 1];
    const sx = c + 2 * f + l - a - 2 * d - g, sy = g + 2 * k + l - a - 2 * b - c, m = Math.hypot(sx, sy);
    if (m > mag[i]) { gx[i] = sx; gy[i] = sy; mag[i] = m; }
  }
  return { mag, gx, gy };
}

/** die drei Farbkanäle 0–1 */
export function farbkanaele(daten, w, h) {
  const k = [0, 1, 2].map(() => new Float32Array(w * h));
  for (let i = 0; i < w * h; i++) { k[0][i] = daten[4 * i] / 255; k[1][i] = daten[4 * i + 1] / 255; k[2][i] = daten[4 * i + 2] / 255; }
  return k;
}

/** Wert beim Anteil q (0–1) einer Liste von Zahlen (ohne die ganze Liste zu sortieren: Histogramm) */
function quantil(werte, q) {
  if (!werte.length) return 0;
  let max = 0;
  for (const v of werte) if (v > max) max = v;
  if (max <= 0) return 0;
  const N = 1024, hist = new Uint32Array(N);
  for (const v of werte) hist[Math.min(N - 1, Math.floor((v / max) * (N - 1)))]++;
  let s = 0;
  const ziel = q * werte.length;
  for (let k = 0; k < N; k++) { s += hist[k]; if (s >= ziel) return (k / (N - 1)) * max; }
  return max;
}

/**
 * Kanten nach Canny: dünn (nur das Maximum quer zur Kante), stark oder schwach (Hysterese, Schwellen aus der Verteilung des Bilds).
 * G: geglättete Helligkeit oder geglättete Farbkanäle (Liste). Gibt eine Maske (1 = Kante) und den Betrag des Gefälles.
 */
export function kantenMaske(G, w, h, { anteil: q = 0.88 } = {}) {
  const { mag, gx, gy } = gradient(G, w, h);
  const duenn = new Float32Array(w * h), werte = [];
  for (let y = 1; y < h - 1; y++) for (let x = 1; x < w - 1; x++) {
    const i = y * w + x, m = mag[i];
    if (m <= 0) continue;
    // Richtung auf vier Nachbarschaften gerundet
    const winkel = Math.atan2(gy[i], gx[i]), r = ((Math.round(winkel / (Math.PI / 4)) % 4) + 4) % 4;
    const [dx, dy] = [[1, 0], [1, 1], [0, 1], [-1, 1]][r];
    if (m >= mag[i + dy * w + dx] && m > mag[i - dy * w - dx]) { duenn[i] = m; werte.push(m); }
  }
  const hoch = Math.max(0.09, quantil(werte, q)), tief = hoch * 0.45;
  const maske = new Uint8Array(w * h), stapel = [];
  for (let i = 0; i < w * h; i++) if (duenn[i] >= hoch) { maske[i] = 1; stapel.push(i); }
  while (stapel.length) {
    const i = stapel.pop(), x = i % w, y = (i / w) | 0;
    for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
      const xx = x + dx, yy = y + dy;
      if (xx < 1 || yy < 1 || xx >= w - 1 || yy >= h - 1) continue;
      const j = yy * w + xx;
      if (!maske[j] && duenn[j] >= tief) { maske[j] = 1; stapel.push(j); }
    }
  }
  return { maske, mag };
}

const NACHBARN = [[1, 0], [0, 1], [-1, 0], [0, -1], [1, 1], [-1, 1], [-1, -1], [1, -1]];

/** Kantenpixel zu Zügen verketten: zuerst von den Enden aus, dann die geschlossenen Schleifen; Punkte als [x, y, x, y, …] */
export function verketten(maske, w, h, { minLaenge = 10 } = {}) {
  const besucht = new Uint8Array(w * h), zuege = [];
  const nachbarn = (i) => {
    const x = i % w, y = (i / w) | 0, n = [];
    for (const [dx, dy] of NACHBARN) {
      const xx = x + dx, yy = y + dy;
      if (xx >= 0 && yy >= 0 && xx < w && yy < h && maske[yy * w + xx]) n.push(yy * w + xx);
    }
    return n;
  };
  const folgen = (start) => {
    const pts = [];
    let i = start, rx = 0, ry = 0;
    for (;;) {
      besucht[i] = 1;
      const x = i % w, y = (i / w) | 0;
      pts.push(x, y);
      // weiter zum unbesuchten Nachbarn, der die bisherige Richtung am besten fortsetzt
      let best = -1, wert = -Infinity;
      for (const j of nachbarn(i)) {
        if (besucht[j]) continue;
        const dx = (j % w) - x, dy = ((j / w) | 0) - y;
        const v = (dx * rx + dy * ry) / Math.hypot(dx, dy) - (dx && dy ? 0.05 : 0);
        if (v > wert) { wert = v; best = j; }
      }
      if (best < 0) break;
      rx = (best % w) - x; ry = ((best / w) | 0) - y;
      i = best;
    }
    return pts;
  };
  for (let i = 0; i < w * h; i++) if (maske[i] && !besucht[i] && nachbarn(i).length === 1) { const p = folgen(i); if (p.length / 2 >= minLaenge) zuege.push(p); }
  for (let i = 0; i < w * h; i++) if (maske[i] && !besucht[i]) { const p = folgen(i); if (p.length / 2 >= minLaenge) zuege.push(p); }
  return zuege;
}

/** Linienzug vereinfachen (Ramer-Douglas-Peucker), Punkte als [x, y, …] */
export function vereinfachen(pts, eps = 0.9) {
  const n = pts.length / 2;
  if (n < 3) return pts.slice();
  const behalten = new Uint8Array(n);
  behalten[0] = behalten[n - 1] = 1;
  const stapel = [[0, n - 1]];
  while (stapel.length) {
    const [a, b] = stapel.pop();
    const ax = pts[2 * a], ay = pts[2 * a + 1], bx = pts[2 * b], by = pts[2 * b + 1], l = Math.hypot(bx - ax, by - ay) || 1;
    let max = 0, k = -1;
    for (let i = a + 1; i < b; i++) {
      const d = Math.abs((bx - ax) * (ay - pts[2 * i + 1]) - (ax - pts[2 * i]) * (by - ay)) / l;
      if (d > max) { max = d; k = i; }
    }
    if (max > eps && k > 0) { behalten[k] = 1; stapel.push([a, k], [k, b]); }
  }
  const aus = [];
  for (let i = 0; i < n; i++) if (behalten[i]) aus.push(pts[2 * i], pts[2 * i + 1]);
  return aus;
}

/** Delaunay-Triangulierung (Bowyer-Watson, Punkte nach x sortiert, fertige Dreiecke werden beiseitegelegt). Gibt Indizes [a, b, c, …]. */
export function delaunay(px, py) {
  const n = px.length;
  const reihe = Array.from({ length: n }, (_, i) => i).sort((a, b) => px[a] - px[b]);
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (let i = 0; i < n; i++) { minX = Math.min(minX, px[i]); minY = Math.min(minY, py[i]); maxX = Math.max(maxX, px[i]); maxY = Math.max(maxY, py[i]); }
  const d = Math.max(maxX - minX, maxY - minY) * 20, mx = (minX + maxX) / 2, my = (minY + maxY) / 2;
  const X = Float64Array.from([...px, mx - d, mx, mx + d]), Y = Float64Array.from([...py, my - d, my + d, my - d]);
  const kreis = (a, b, c) => {
    const ax = X[a], ay = Y[a], bx = X[b], by = Y[b], cx = X[c], cy = Y[c];
    const D = 2 * (ax * (by - cy) + bx * (cy - ay) + cx * (ay - by));
    if (Math.abs(D) < 1e-12) return { a, b, c, x: (ax + bx + cx) / 3, y: (ay + by + cy) / 3, r2: Infinity };
    const a2 = ax * ax + ay * ay, b2 = bx * bx + by * by, c2 = cx * cx + cy * cy;
    const x = (a2 * (by - cy) + b2 * (cy - ay) + c2 * (ay - by)) / D, y = (a2 * (cx - bx) + b2 * (ax - cx) + c2 * (bx - ax)) / D;
    return { a, b, c, x, y, r2: (ax - x) ** 2 + (ay - y) ** 2 };
  };
  let offen = [kreis(n, n + 1, n + 2)];
  const fertig = [];
  for (const p of reihe) {
    const x = X[p], y = Y[p], kanten = [], bleiben = [];
    for (const t of offen) {
      const dx = x - t.x;
      // rechts ausserhalb des Umkreises: kein späterer Punkt (nach x sortiert) kann es noch treffen
      if (dx > 0 && dx * dx > t.r2) { fertig.push(t); continue; }
      if (dx * dx + (y - t.y) ** 2 < t.r2) kanten.push(t.a, t.b, t.b, t.c, t.c, t.a);
      else bleiben.push(t);
    }
    // doppelte Kanten (zwischen zwei entfernten Dreiecken) fallen weg, der Rand des Lochs bleibt
    const zahl = new Map();
    for (let k = 0; k < kanten.length; k += 2) {
      const a = kanten[k], b = kanten[k + 1], s = a < b ? `${a},${b}` : `${b},${a}`;
      zahl.set(s, (zahl.get(s) ?? 0) + 1);
    }
    for (let k = 0; k < kanten.length; k += 2) {
      const a = kanten[k], b = kanten[k + 1];
      if (zahl.get(a < b ? `${a},${b}` : `${b},${a}`) === 1) bleiben.push(kreis(a, b, p));
    }
    offen = bleiben;
  }
  const aus = [];
  for (const t of [...fertig, ...offen]) if (t.a < n && t.b < n && t.c < n) aus.push(t.a, t.b, t.c);
  return aus;
}

/** Punkte für das Mosaik: Ecken und Rand, dann blaues Rauschen mit Mindestabstand, eng an Kanten, weit in ruhigen Flächen */
export function punkte(kante, w, h, zahl, rnd) {
  const px = [], py = [];
  const dazu = (x, y) => { px.push(x); py.push(y); };
  const basis = Math.sqrt((w * h) / zahl) * 0.78;
  // Rand: in ungefähr gleichen Abständen, damit das Mosaik das ganze Bild füllt
  const rand = Math.max(2, Math.round(basis * 1.4));
  for (let x = 0; x <= w; x += rand) { dazu(Math.min(x, w), 0); dazu(Math.min(x, w), h); }
  for (let y = rand; y < h; y += rand) { dazu(0, y); dazu(w, y); }
  dazu(w, 0); dazu(w, h);
  const abstand = (x, y) => basis * (1.3 - 0.85 * kante[Math.min(h - 1, y | 0) * w + Math.min(w - 1, x | 0)]);
  const zelle = basis * 0.4, gw = Math.ceil(w / zelle) + 1, gh = Math.ceil(h / zelle) + 1, gitter = Array.from({ length: gw * gh }, () => []);
  for (let i = 0; i < px.length; i++) gitter[Math.floor(py[i] / zelle) * gw + Math.floor(px[i] / zelle)].push(i);
  const reichweite = Math.ceil((basis * 1.3) / zelle);
  for (let versuch = 0; versuch < zahl * 40 && px.length < zahl; versuch++) {
    const x = rnd() * w, y = rnd() * h, d = abstand(x, y), gx = Math.floor(x / zelle), gy = Math.floor(y / zelle);
    let frei = true;
    for (let yy = Math.max(0, gy - reichweite); frei && yy <= Math.min(gh - 1, gy + reichweite); yy++)
      for (let xx = Math.max(0, gx - reichweite); frei && xx <= Math.min(gw - 1, gx + reichweite); xx++)
        for (const j of gitter[yy * gw + xx]) if ((px[j] - x) ** 2 + (py[j] - y) ** 2 < d * d) { frei = false; break; }
    if (!frei) continue;
    gitter[gy * gw + gx].push(px.length);
    dazu(x, y);
  }
  return { px, py };
}

/** mittlere Farbe und Helligkeit jedes Dreiecks (alle Bildpunkte darin, sonst der Schwerpunkt) */
function dreieckFarben(daten, w, h, px, py, idx) {
  const n = idx.length / 3, farben = new Uint8Array(n * 3), hell = new Float32Array(n);
  for (let t = 0; t < n; t++) {
    const a = idx[3 * t], b = idx[3 * t + 1], c = idx[3 * t + 2];
    const ax = px[a], ay = py[a], bx = px[b], by = py[b], cx = px[c], cy = py[c];
    const x0 = Math.max(0, Math.floor(Math.min(ax, bx, cx))), x1 = Math.min(w - 1, Math.ceil(Math.max(ax, bx, cx)));
    const y0 = Math.max(0, Math.floor(Math.min(ay, by, cy))), y1 = Math.min(h - 1, Math.ceil(Math.max(ay, by, cy)));
    const D = (by - cy) * (ax - cx) + (cx - bx) * (ay - cy) || 1e-9;
    let r = 0, g = 0, bl = 0, k = 0;
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
      const u = ((by - cy) * (x + 0.5 - cx) + (cx - bx) * (y + 0.5 - cy)) / D, v = ((cy - ay) * (x + 0.5 - cx) + (ax - cx) * (y + 0.5 - cy)) / D;
      if (u < -0.01 || v < -0.01 || u + v > 1.01) continue;
      const i = 4 * (y * w + x);
      r += daten[i]; g += daten[i + 1]; bl += daten[i + 2]; k++;
    }
    if (!k) {
      const x = Math.min(w - 1, Math.max(0, Math.round((ax + bx + cx) / 3))), y = Math.min(h - 1, Math.max(0, Math.round((ay + by + cy) / 3))), i = 4 * (y * w + x);
      r = daten[i]; g = daten[i + 1]; bl = daten[i + 2]; k = 1;
    }
    farben[3 * t] = r / k; farben[3 * t + 1] = g / k; farben[3 * t + 2] = bl / k;
    hell[t] = (0.2126 * r + 0.7152 * g + 0.0722 * bl) / k / 255;
  }
  return { farben, hell };
}

/** Farbton (0–1) und Sättigung (0–1) einer Farbe */
export function farbton(r, g, b) {
  const max = Math.max(r, g, b), min = Math.min(r, g, b), d = max - min;
  if (d < 1e-6) return { ton: 0, satt: 0 };
  let ton;
  if (max === r) ton = ((g - b) / d + 6) % 6;
  else if (max === g) ton = (b - r) / d + 2;
  else ton = (r - g) / d + 4;
  return { ton: ton / 6, satt: d / max };
}

/** Feinheit des Mosaiks: so viele Dreieckspunkte auf einem Bild von 1080 × 1920 (kleinere Formate entsprechend weniger) */
export const FEINHEIT = { grob: 520, mittel: 1150, fein: 2300 };

/**
 * Das Bild zerlegen. daten: RGBA des Analysebilds (w × h, meist die halbe Filmgrösse); massstab: Film / Analysebild.
 * feinheit: "grob" | "mittel" | "fein". Gibt { breite, hoehe, zeilen, kanten, dreiecke } in Filmkoordinaten.
 */
export function zerlegen(daten, w, h, { massstab = 1, feinheit = "mittel" } = {}) {
  const B = Math.round(w * massstab), H = Math.round(h * massstab);
  const L = helligkeit(daten, w, h);
  // Kanten auf den Farben, nicht nur auf der Helligkeit: ein rotes Ding vor gleich hellem Blau hat auch einen Umriss
  const G = farbkanaele(daten, w, h).map((k) => gauss(k, w, h, Math.max(2, Math.round(w / 220))));

  // Zeilen: alle 18 Filmpunkte eine Linie, darauf alle 8 Filmpunkte die Helligkeit (etwas weicher als das Bild)
  const weich = gauss(L, w, h, Math.max(1, Math.round(w / 270)));
  const abstand = 18, schritt = 8, reihen = Math.max(8, Math.floor(H / abstand)), spalten = Math.ceil(B / schritt) + 1;
  const werte = new Float32Array(reihen * spalten);
  const lesen = (x, y) => {
    const fx = Math.min(w - 1.001, Math.max(0, x)), fy = Math.min(h - 1.001, Math.max(0, y)), x0 = fx | 0, y0 = fy | 0, u = fx - x0, v = fy - y0;
    const i = y0 * w + x0;
    return weich[i] * (1 - u) * (1 - v) + weich[i + 1] * u * (1 - v) + weich[i + w] * (1 - u) * v + weich[i + w + 1] * u * v;
  };
  const oben = (H - (reihen - 1) * abstand) / 2;
  for (let r = 0; r < reihen; r++) for (let s = 0; s < spalten; s++) werte[r * spalten + s] = lesen((s * schritt) / massstab, (oben + r * abstand) / massstab);
  const zeilen = { werte, reihen, spalten, abstand, schritt, oben };

  // Kanten: dünne Umrisse, zu Zügen verkettet, vereinfacht; die längsten zuerst, höchstens so viele, dass der Film ruhig bleibt
  const { maske, mag } = kantenMaske(G, w, h);
  let zuege = verketten(maske, w, h, { minLaenge: Math.max(10, Math.round(w / 36)) })
    .map((p) => vereinfachen(p, 0.8))
    .map((p) => { let l = 0; for (let k = 2; k < p.length; k += 2) l += Math.hypot(p[k] - p[k - 2], p[k + 1] - p[k - 1]); return { p, l }; })
    .sort((a, b) => b.l - a.l);
  const budget = (w * h) / 10;   // Gesamtlänge der Kanten höchstens so viel (Analysepunkte)
  let summe = 0;
  zuege = zuege.filter((z) => (summe += z.l) <= budget || summe - z.l === 0);
  const kanten = zuege.map(({ p, l }) => {
    const pts = new Float32Array(p.length);
    let miny = Infinity;
    for (let k = 0; k < p.length; k++) { pts[k] = (p[k] + 0.5) * massstab; if (k % 2) miny = Math.min(miny, pts[k]); }
    return { pts, laenge: l * massstab, oben: miny };
  });

  // Dreiecke: Punkte nach der Stärke der Kanten verteilt (weichgezeichnet, damit auch die Umgebung einer Kante feiner wird)
  let maxMag = 0;
  for (const m of mag) if (m > maxMag) maxMag = m;
  const k0 = new Float32Array(w * h);
  for (let i = 0; i < w * h; i++) k0[i] = maxMag > 0 ? Math.min(1, mag[i] / (maxMag * 0.35)) : 0;
  const kante = gauss(k0, w, h, Math.max(2, Math.round(w / 90)));
  let km = 0;
  for (const v of kante) if (v > km) km = v;
  if (km > 0) for (let i = 0; i < w * h; i++) kante[i] = Math.sqrt(kante[i] / km);
  const zahl = Math.max(60, Math.round((FEINHEIT[feinheit] ?? FEINHEIT.mittel) * ((B * H) / (1080 * 1920)) ** 0.8));
  const rnd = zufall(w * 7919 + h * 104729 + zahl);
  const { px, py } = punkte(kante, w, h, zahl, rnd);
  const idx = delaunay(px, py);
  const { farben, hell } = dreieckFarben(daten, w, h, px, py, idx);
  const n = idx.length / 3, ecken = new Float32Array(n * 6);
  for (let t = 0; t < n; t++) for (let k = 0; k < 3; k++) { const p = idx[3 * t + k]; ecken[6 * t + 2 * k] = px[p] * massstab; ecken[6 * t + 2 * k + 1] = py[p] * massstab; }
  return { breite: B, hoehe: H, zeilen, kanten, dreiecke: { n, ecken, farben, hell } };
}

/**
 * Die drei Farbauszüge des Bilds für das Auseinanderlaufen der Farben (RGB-Versatz):
 * auf Schwarz je ein Kanal auf Schwarz (zusammengezählt ergibt sich das Bild), auf Weiss je ein Kanal auf Weiss (multipliziert ergibt sich das Bild).
 */
export function auszuege(daten, w, h, grund = "schwarz") {
  const aus = [0, 1, 2].map(() => new Uint8ClampedArray(w * h * 4));
  const leer = grund === "weiss" ? 255 : 0;
  for (let i = 0; i < w * h * 4; i += 4) for (let k = 0; k < 3; k++) {
    const a = aus[k];
    a[i] = a[i + 1] = a[i + 2] = leer; a[i + k] = daten[i + k]; a[i + 3] = 255;
  }
  return aus;
}
