// «Sketchory» – aus dem Foto oder Scan einer Kritzelkarte (Fineliner auf Papier) saubere Striche gewinnen, ohne DOM.
// Weg: Graustufen → Linien hell machen (helles Papier wird umgekehrt, egal wie das Bild kommt) → Papier und Schatten abziehen
// (Hintergrund aus Minimum und Unschärfe) → Schwelle (Otsu) → Staub weg, kleine Löcher zu → Abstandsfeld (Strichbreite)
// → Skelett (Zhang-Suen) → Pfade zwischen Enden und Kreuzungen → Ästchen weg → an Kreuzungen gerade weiterführen
// → glätten, gleichmässig abtasten → in einer Reihenfolge, wie ein Stift sie ziehen würde.
// Ergebnis in Pixeln des (verkleinerten) Analysebilds: Striche mit Punkten [x, y] und Halbbreite r je Punkt.

export const ANALYSE = 1400;   // längste Kante des Analysebilds

/** Luminanz aus RGBA (0–255) */
export function graustufen(rgba, w, h) {
  const L = new Float32Array(w * h);
  for (let i = 0, j = 0; i < L.length; i++, j += 4) L[i] = 0.2126 * rgba[j] + 0.7152 * rgba[j + 1] + 0.0722 * rgba[j + 2];
  return L;
}

/** Median über ein Histogramm (Werte 0–255) */
export function median(L) {
  const hist = new Uint32Array(256);
  for (let i = 0; i < L.length; i++) hist[Math.max(0, Math.min(255, L[i] | 0))]++;
  let s = 0;
  for (let v = 0; v < 256; v++) if ((s += hist[v]) >= L.length / 2) return v;
  return 255;
}

/** Schwelle nach Otsu für Werte 0–255 */
export function otsu(werte) {
  const hist = new Float64Array(256);
  for (let i = 0; i < werte.length; i++) hist[Math.max(0, Math.min(255, werte[i] | 0))]++;
  const n = werte.length;
  let summe = 0;
  for (let v = 0; v < 256; v++) summe += v * hist[v];
  let sB = 0, wB = 0, best = 0, schwelle = 0;
  for (let v = 0; v < 256; v++) {
    wB += hist[v];
    if (!wB) continue;
    const wF = n - wB;
    if (!wF) break;
    sB += v * hist[v];
    const mB = sB / wB, mF = (summe - sB) / wF;
    const zw = wB * wF * (mB - mF) ** 2;
    if (zw > best) { best = zw; schwelle = v; }
  }
  return schwelle + 0.5;
}

// ---------- Filter ----------

/** gleitendes Minimum (Radius r) in einer Richtung */
function minimum1(src, w, h, r, waagrecht) {
  const out = new Float32Array(src.length);
  const [n, m, schritt, zeile] = waagrecht ? [h, w, 1, w] : [w, h, w, 1];
  for (let a = 0; a < n; a++) {
    const basis = a * zeile;
    for (let b = 0; b < m; b++) {
      let mi = Infinity;
      for (let k = Math.max(0, b - r), e = Math.min(m - 1, b + r); k <= e; k++) { const v = src[basis + k * schritt]; if (v < mi) mi = v; }
      out[basis + b * schritt] = mi;
    }
  }
  return out;
}

/** Kastenunschärfe (Radius r) in einer Richtung, Ränder gespiegelt fortgesetzt */
function kasten1(src, w, h, r, waagrecht) {
  const out = new Float32Array(src.length);
  const [n, m, schritt, zeile] = waagrecht ? [h, w, 1, w] : [w, h, w, 1];
  const ref = (k) => (k < 0 ? -k - 1 : k >= m ? 2 * m - k - 1 : k);
  const d = 2 * r + 1;
  for (let a = 0; a < n; a++) {
    const basis = a * zeile;
    let s = 0;
    for (let k = -r; k <= r; k++) s += src[basis + Math.min(m - 1, ref(k)) * schritt];
    for (let b = 0; b < m; b++) {
      out[basis + b * schritt] = s / d;
      s += src[basis + Math.min(m - 1, Math.max(0, ref(b + r + 1))) * schritt] - src[basis + Math.min(m - 1, Math.max(0, ref(b - r))) * schritt];
    }
  }
  return out;
}

export function unschaerfe(src, w, h, r, durchgaenge = 1) {
  let a = src;
  for (let i = 0; i < durchgaenge; i++) a = kasten1(kasten1(a, w, h, r, true), w, h, r, false);
  return a;
}

/** Hintergrund (Papier, Schatten, Verlauf) der hell gemachten Linien: auf einem verkleinerten Bild Minimum, dann weich, wieder gross */
export function hintergrund(v, w, h, linie, weite) {
  const f = 4, kw = Math.ceil(w / f), kh = Math.ceil(h / f);
  const klein = new Float32Array(kw * kh);
  for (let y = 0; y < kh; y++) for (let x = 0; x < kw; x++) {
    let s = 0, n = 0;
    for (let yy = y * f; yy < Math.min(h, y * f + f); yy++) for (let xx = x * f; xx < Math.min(w, x * f + f); xx++) { s += v[yy * w + xx]; n++; }
    klein[y * kw + x] = s / n;
  }
  const rm = Math.max(1, Math.round(linie / f)), rb = Math.max(1, Math.round(weite / f));
  const glatt = unschaerfe(minimum1(minimum1(klein, kw, kh, rm, true), kw, kh, rm, false), kw, kh, rb, 3);
  const out = new Float32Array(w * h);
  for (let y = 0; y < h; y++) {
    const gy = Math.min(kh - 1, Math.max(0, (y + 0.5) / f - 0.5)), y0 = Math.floor(gy), y1 = Math.min(kh - 1, y0 + 1), fy = gy - y0;
    for (let x = 0; x < w; x++) {
      const gx = Math.min(kw - 1, Math.max(0, (x + 0.5) / f - 0.5)), x0 = Math.floor(gx), x1 = Math.min(kw - 1, x0 + 1), fx = gx - x0;
      const a = glatt[y0 * kw + x0] * (1 - fx) + glatt[y0 * kw + x1] * fx;
      const b = glatt[y1 * kw + x0] * (1 - fx) + glatt[y1 * kw + x1] * fx;
      out[y * w + x] = a * (1 - fy) + b * fy;
    }
  }
  return out;
}

// ---------- Flächen ----------

const N8 = (w) => [-w - 1, -w, -w + 1, -1, 1, w - 1, w, w + 1];

/** zusammenhängende Gebiete mit Wert wert (8er-Nachbarschaft für Striche, 4er für Löcher): Liste von Indexlisten und ob sie den Rand berühren */
function gebiete(maske, w, h, wert, acht) {
  const marke = new Int32Array(w * h).fill(-1);
  const liste = [];
  const stapel = new Int32Array(w * h);
  const nb = acht ? N8(w) : [-w, -1, 1, w];
  for (let s = 0; s < maske.length; s++) {
    if (maske[s] !== wert || marke[s] >= 0) continue;
    const id = liste.length, pixel = [];
    let oben = 0, rand = false;
    stapel[oben++] = s; marke[s] = id;
    while (oben) {
      const p = stapel[--oben];
      pixel.push(p);
      const x = p % w, y = (p / w) | 0;
      if (x === 0 || y === 0 || x === w - 1 || y === h - 1) { rand = true; }
      for (const d of nb) {
        const q = p + d, qx = q % w;
        if (q < 0 || q >= maske.length || Math.abs(qx - x) > 1 || maske[q] !== wert || marke[q] >= 0) continue;
        marke[q] = id; stapel[oben++] = q;
      }
    }
    liste.push({ pixel, rand });
  }
  return liste;
}

/** Abstandsfeld (Chamfer 3-4, geteilt durch 3): Abstand jedes Strichpixels zum nächsten Hintergrund */
export function abstand(maske, w, h) {
  const g = new Float32Array(w * h);
  const gross = 1e9;
  for (let i = 0; i < g.length; i++) g[i] = maske[i] ? gross : 0;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const i = y * w + x; if (!g[i]) continue;
    let v = g[i];
    v = Math.min(v, (x > 0 ? g[i - 1] : 0) + 3, (y > 0 ? g[i - w] : 0) + 3, (x > 0 && y > 0 ? g[i - w - 1] : 0) + 4, (x < w - 1 && y > 0 ? g[i - w + 1] : 0) + 4);
    g[i] = v;
  }
  for (let y = h - 1; y >= 0; y--) for (let x = w - 1; x >= 0; x--) {
    const i = y * w + x; if (!g[i]) continue;
    let v = g[i];
    v = Math.min(v, (x < w - 1 ? g[i + 1] : 0) + 3, (y < h - 1 ? g[i + w] : 0) + 3, (x < w - 1 && y < h - 1 ? g[i + w + 1] : 0) + 4, (x > 0 && y < h - 1 ? g[i + w - 1] : 0) + 4);
    g[i] = v;
  }
  for (let i = 0; i < g.length; i++) g[i] /= 3;
  return g;
}

/** Skelett nach Zhang-Suen (Maske wird kopiert); geht nur die Strichpixel durch */
export function skelett(maske, w, h) {
  const s = new Uint8Array(maske);
  for (let x = 0; x < w; x++) { s[x] = 0; s[(h - 1) * w + x] = 0; }
  for (let y = 0; y < h; y++) { s[y * w] = 0; s[y * w + w - 1] = 0; }
  let aktiv = [];
  for (let i = 0; i < s.length; i++) if (s[i]) aktiv.push(i);
  const weg = [];
  for (let geaendert = true; geaendert;) {
    geaendert = false;
    for (let teil = 0; teil < 2; teil++) {
      weg.length = 0;
      for (const i of aktiv) {
        if (!s[i]) continue;
        const p2 = s[i - w], p3 = s[i - w + 1], p4 = s[i + 1], p5 = s[i + w + 1], p6 = s[i + w], p7 = s[i + w - 1], p8 = s[i - 1], p9 = s[i - w - 1];
        const b = p2 + p3 + p4 + p5 + p6 + p7 + p8 + p9;
        if (b < 2 || b > 6) continue;
        const a = (!p2 && p3) + (!p3 && p4) + (!p4 && p5) + (!p5 && p6) + (!p6 && p7) + (!p7 && p8) + (!p8 && p9) + (!p9 && p2);
        if (a !== 1) continue;
        if (teil === 0 ? (p2 && p4 && p6) || (p4 && p6 && p8) : (p2 && p4 && p8) || (p2 && p6 && p8)) continue;
        weg.push(i);
      }
      if (weg.length) { geaendert = true; for (const i of weg) s[i] = 0; }
    }
    aktiv = aktiv.filter((i) => s[i]);
  }
  return s;
}

// ---------- Pfade ----------

// Nachbarn im Kreis (für die Zahl der Übergänge) und zuerst die geraden Nachbarn (für das Weitergehen)
const RING = (w) => [-w, -w + 1, 1, w + 1, w, w - 1, -1, -w - 1];
const GERADE_ZUERST = (w) => [-w, 1, w, -1, -w + 1, w + 1, w - 1, -w - 1];

/** Zahl der 0→1-Übergänge im Ring: 1 Ende, 2 Linie, ≥ 3 Kreuzung */
function uebergaenge(s, i, ring) {
  let n = 0;
  for (let k = 0; k < 8; k++) if (!s[i + ring[k]] && s[i + ring[(k + 1) % 8]]) n++;
  return n;
}

/** Skelett → Pfade (Listen von Pixelindizes) mit der Art ihrer Enden */
export function pfade(s, w, h) {
  const ring = RING(w), reihe = GERADE_ZUERST(w);
  const knoten = new Uint8Array(s.length);   // 1 Ende, 2 Kreuzung, 3 einzelner Punkt
  const pix = [];
  for (let i = 0; i < s.length; i++) {
    if (!s[i]) continue;
    pix.push(i);
    let nb = 0; for (const d of ring) nb += s[i + d];
    if (!nb) { knoten[i] = 3; continue; }
    const u = uebergaenge(s, i, ring);
    if (u === 1) knoten[i] = 1; else if (u >= 3) knoten[i] = 2;
  }
  const besucht = new Uint8Array(s.length);
  const liste = [];
  const nahStart = (q, start) => Math.abs((q % w) - (start % w)) <= 1 && Math.abs(((q / w) | 0) - ((start / w) | 0)) <= 1;
  const gehen = (start, erster) => {
    const pfad = [start, erster];
    let p = erster;
    while (!knoten[p]) {
      besucht[p] = 1;
      const zurueck = pfad[pfad.length - 2];
      let weiter = -1;
      // zuerst ein Knoten (dort endet der Pfad), aber nicht gleich wieder einer der Kreuzung, von der er kommt
      for (const d of reihe) {
        const q = p + d;
        if (!s[q] || !knoten[q] || q === zurueck) continue;
        if (pfad.length < 5 && (q === start || nahStart(q, start))) continue;
        weiter = q; break;
      }
      if (weiter < 0) for (const d of reihe) { const q = p + d; if (s[q] && !knoten[q] && !besucht[q]) { weiter = q; break; } }
      if (weiter < 0) break;
      pfad.push(weiter);
      p = weiter;
    }
    return pfad;
  };
  for (const i of pix) {
    if (knoten[i] === 3) { liste.push({ pixel: [i], enden: [1, 1] }); continue; }
    if (!knoten[i]) continue;
    for (const d of reihe) {
      const q = i + d;
      if (!s[q] || besucht[q]) continue;
      if (knoten[q]) {
        // zwei Knoten nebeneinander: nur einmal, und nur wenn beide Enden sind (ein Strich aus zwei Pixeln)
        if (q > i && knoten[i] === 1 && knoten[q] === 1) liste.push({ pixel: [i, q], enden: [1, 1] });
        continue;
      }
      const pfad = gehen(i, q);
      const letzter = pfad[pfad.length - 1];
      liste.push({ pixel: pfad, enden: [knoten[i], knoten[letzter] || 1] });
    }
  }
  // geschlossene Schlaufen ohne Knoten
  for (const i of pix) {
    if (knoten[i] || besucht[i]) continue;
    const pfad = [i]; besucht[i] = 1;
    let p = i;
    for (;;) {
      let weiter = -1;
      for (const d of reihe) { const q = p + d; if (s[q] && !besucht[q] && !knoten[q]) { weiter = q; break; } }
      if (weiter < 0) break;
      besucht[weiter] = 1; pfad.push(weiter); p = weiter;
    }
    const ende = pfad[pfad.length - 1];
    if (pfad.length > 2 && nahStart(ende, i)) { pfad.push(i); liste.push({ pixel: pfad, enden: [0, 0], zu: true }); }
    else liste.push({ pixel: pfad, enden: [1, 1] });
  }
  return liste;
}

// ---------- Glätten und Ordnen ----------

/** Punkte gauss-geglättet entlang des Pfads (Enden bleiben, Schlaufen ringsum) */
function glaetten(werte, sigma, zu) {
  const n = werte.length;
  if (n < 3 || sigma <= 0) return werte.slice();
  const r = Math.ceil(sigma * 2.5), gew = [];
  for (let k = -r; k <= r; k++) gew.push(Math.exp(-(k * k) / (2 * sigma * sigma)));
  const out = new Array(n);
  for (let i = 0; i < n; i++) {
    if (!zu && (i === 0 || i === n - 1)) { out[i] = werte[i]; continue; }
    // am offenen Ende das Fenster kürzen, damit die Enden nicht schrumpfen
    const rr = zu ? r : Math.min(r, i, n - 1 - i);
    let s = 0, g = 0;
    for (let k = -rr; k <= rr; k++) {
      let j = i + k;
      if (zu) j = ((j % (n - 1)) + (n - 1)) % (n - 1);
      s += werte[j] * gew[k + r]; g += gew[k + r];
    }
    out[i] = s / g;
  }
  if (zu) out[n - 1] = out[0];
  return out;
}

/** gleichmässig abtasten (Abstand a), Halbbreite linear mit */
function abtasten(xs, ys, rs, a) {
  const px = [xs[0]], py = [ys[0]], pr = [rs[0]];
  let rest = 0;
  for (let i = 1; i < xs.length; i++) {
    const dx = xs[i] - xs[i - 1], dy = ys[i] - ys[i - 1], l = Math.hypot(dx, dy);
    if (!l) continue;
    let t = a - rest;
    while (t <= l) {
      const f = t / l;
      px.push(xs[i - 1] + dx * f); py.push(ys[i - 1] + dy * f); pr.push(rs[i - 1] + (rs[i] - rs[i - 1]) * f);
      t += a;
    }
    rest = l - (t - a);
  }
  const n = xs.length - 1;
  if (Math.hypot(px[px.length - 1] - xs[n], py[py.length - 1] - ys[n]) > a * 0.25) { px.push(xs[n]); py.push(ys[n]); pr.push(rs[n]); }
  return { px, py, pr };
}

/** Richtung am Ende eines Pfads (zeigt vom Inneren nach aussen), über etwa k Pixel */
function richtung(pkt, w, amAnfang, k = 7) {
  const n = pkt.length;
  const a = amAnfang ? pkt[0] : pkt[n - 1], b = amAnfang ? pkt[Math.min(n - 1, k)] : pkt[Math.max(0, n - 1 - k)];
  const dx = (a % w) - (b % w), dy = ((a / w) | 0) - ((b / w) | 0), l = Math.hypot(dx, dy) || 1;
  return [dx / l, dy / l];
}

/**
 * Hauptfunktion: Bild (RGBA) → Striche.
 * optionen.empfindlichkeit: −50 … 50 (mehr = auch schwächere Linien)
 */
export function striche(rgba, w, h, optionen = {}) {
  const { empfindlichkeit = 0 } = optionen;
  const k = Math.max(w, h) / ANALYSE;                  // 1 bei voller Analysegrösse
  const L = graustufen(rgba, w, h);
  // helles Papier mit dunklen Linien wird umgekehrt; danach sind die Linien immer hell
  const umgekehrt = median(L) > 110;
  const v = new Float32Array(L.length);
  for (let i = 0; i < v.length; i++) v[i] = umgekehrt ? 255 - L[i] : L[i];
  const bg = hintergrund(v, w, h, 12 * k, 40 * k);
  let d = new Float32Array(v.length);
  for (let i = 0; i < d.length; i++) d[i] = Math.max(0, v[i] - bg[i]);
  // Kontrast strecken (98. Perzentil der Linien → 255), damit Otsu auch bei blassen Fotos greift
  let hoch = 0;
  { const hist = new Uint32Array(256); for (let i = 0; i < d.length; i++) hist[Math.min(255, d[i] | 0)]++;
    let s = 0; for (let x = 255; x >= 0; x--) { s += hist[x]; if (s >= d.length * 0.004) { hoch = x; break; } } }
  const f = 255 / Math.max(24, hoch);
  for (let i = 0; i < d.length; i++) d[i] = Math.min(255, d[i] * f);
  d = unschaerfe(d, w, h, 1, 1);
  const grund = Math.max(28, otsu(d));
  const schwelle = Math.min(235, Math.max(12, grund * Math.pow(2, -empfindlichkeit / 50)));
  let maske = new Uint8Array(w * h);
  for (let i = 0; i < maske.length; i++) maske[i] = d[i] > schwelle ? 1 : 0;

  // Staub weg (kleine Flecken), kleine Löcher in dicken Linien zu
  const minFlaeche = Math.max(6, Math.round(16 * k * k)), minLoch = Math.max(2, Math.round(3 * k * k));
  let staub = 0;
  for (const g of gebiete(maske, w, h, 1, true)) if (g.pixel.length < minFlaeche) { staub++; for (const p of g.pixel) maske[p] = 0; }
  for (const g of gebiete(maske, w, h, 0, false)) if (!g.rand && g.pixel.length < minLoch) for (const p of g.pixel) maske[p] = 1;

  const dist = abstand(maske, w, h);
  const sk = skelett(maske, w, h);

  // typische Halbbreite (Median über das Skelett)
  const rAlle = [];
  for (let i = 0; i < sk.length; i++) if (sk[i]) rAlle.push(dist[i]);
  rAlle.sort((a, b) => a - b);
  const rTyp = rAlle.length ? rAlle[rAlle.length >> 1] : 1;

  // Flächen (ausgefüllte Buchstaben, Punkte, Kleckse): im Mittel viel dicker als eine Linie. Ein Skelett gäbe ihre Ecken nicht wieder;
  // sie werden als Umriss gezeichnet und dann gefüllt. Ihre Skelettpixel fallen weg.
  const linie = Math.max(1, 2 * rTyp - 1), flaechen = [];
  for (const g of gebiete(maske, w, h, 1, true)) {
    let ske = 0, rMax = 0;
    for (const p of g.pixel) { if (sk[p]) ske++; if (dist[p] > rMax) rMax = dist[p]; }
    if (g.pixel.length / Math.max(1, ske) < Math.max(2.3 * linie, 5 * k) || rMax < 1.8 * rTyp) continue;
    const ringe = umriss(maske, w, g.pixel);
    if (!ringe.length) continue;
    for (const p of g.pixel) sk[p] = 0;
    ringe.sort((a, b) => b.length - a.length);
    const x = [], y = [];
    for (let j = 0; j < ringe[0].length; j += 2) { x.push(ringe[0][j]); y.push(ringe[0][j + 1]); }
    x.push(x[0]); y.push(y[0]);
    let laenge = 0;
    for (const r of ringe) for (let j = 2; j < r.length; j += 2) laenge += Math.hypot(r[j] - r[j - 2], r[j + 1] - r[j - 1]);
    flaechen.push({ x, y, r: x.map(() => rTyp), laenge, zu: true, flaeche: ringe });
  }
  let roh = pfade(sk, w, h);

  // Ästchen: kurze Pfade von einer Kreuzung zu einem freien Ende (entstehen beim Ausdünnen an Ecken und Enden)
  const aesteGrenze = (p) => Math.max(4 * k, 2.2 * Math.max(dist[p.pixel[0]], dist[p.pixel[p.pixel.length - 1]], rTyp));
  roh = roh.filter((p) => !((p.enden[0] === 2) !== (p.enden[1] === 2) && p.pixel.length < aesteGrenze(p)));

  // an Kreuzungen weiterführen: Enden, die in derselben Kreuzung (bis 2 px auseinander) liegen, paarweise nach Geradheit verbinden
  const enden = [];
  roh.forEach((p, i) => {
    if (p.zu || p.pixel.length < 2) return;
    if (p.enden[0] === 2) enden.push({ pfad: i, anfang: true, pixel: p.pixel[0], r: richtung(p.pixel, w, true) });
    if (p.enden[1] === 2) enden.push({ pfad: i, anfang: false, pixel: p.pixel[p.pixel.length - 1], r: richtung(p.pixel, w, false) });
  });
  const partner = new Map();   // "pfad:anfang" → { pfad, anfang }
  const schluessel = (e) => `${e.pfad}:${e.anfang ? 0 : 1}`;
  const paare = [];
  for (let a = 0; a < enden.length; a++) for (let b = a + 1; b < enden.length; b++) {
    const A = enden[a], B = enden[b];
    if (A.pfad === B.pfad) continue;
    const dx = (A.pixel % w) - (B.pixel % w), dy = ((A.pixel / w) | 0) - ((B.pixel / w) | 0);
    if (dx * dx + dy * dy > 8) continue;
    // gerade weiter heisst: die beiden Richtungen (je nach aussen) zeigen gegeneinander
    const gerade = -(A.r[0] * B.r[0] + A.r[1] * B.r[1]);
    if (gerade > 0.5) paare.push({ a: A, b: B, gerade });
  }
  // nur zwei Enden an einer Stelle (nach dem Entfernen eines Ästchens): immer verbinden
  const nachbarn = enden.map((A) => enden.filter((B) => B !== A && ((A.pixel % w) - (B.pixel % w)) ** 2 + (((A.pixel / w) | 0) - ((B.pixel / w) | 0)) ** 2 <= 8));
  enden.forEach((A, a) => {
    const n = nachbarn[a];
    if (n.length === 1 && nachbarn[enden.indexOf(n[0])].length === 1 && n[0].pfad !== A.pfad && a < enden.indexOf(n[0])) paare.push({ a: A, b: n[0], gerade: 2 });
  });
  paare.sort((x, y) => y.gerade - x.gerade);
  for (const { a, b } of paare) {
    if (partner.has(schluessel(a)) || partner.has(schluessel(b))) continue;
    partner.set(schluessel(a), b); partner.set(schluessel(b), a);
  }
  // Ketten bilden
  const benutzt = new Uint8Array(roh.length);
  const ketten = [];
  const ketteAb = (start, vonAnfang) => {
    // geht in Richtung des Pfadendes, das nicht vonAnfang ist, über die Partner weiter
    const teile = [];
    let i = start, vorwaerts = vonAnfang;
    for (;;) {
      benutzt[i] = 1;
      teile.push({ i, vorwaerts });
      const p = partner.get(`${i}:${vorwaerts ? 1 : 0}`);
      if (!p || benutzt[p.pfad]) break;
      i = p.pfad; vorwaerts = p.anfang;
    }
    return teile;
  };
  // zuerst Ketten von freien Enden aus, dann die übrigen (Ringe aus mehreren Pfaden)
  const reihenfolge = roh.map((p, i) => i).sort((a, b) => (partner.has(`${a}:0`) && partner.has(`${a}:1`)) - (partner.has(`${b}:0`) && partner.has(`${b}:1`)));
  for (const i of reihenfolge) {
    if (benutzt[i]) continue;
    const p = roh[i];
    if (p.zu) { benutzt[i] = 1; ketten.push({ teile: [{ i, vorwaerts: true }], zu: true }); continue; }
    // vom Anfang aus vorwärts; was vor dem Anfang hängt, rückwärts davor
    const vorne = partner.has(`${i}:0`) ? ketteAb(i, false) : null;
    if (vorne) benutzt[i] = 0;
    const hinten = ketteAb(i, true);
    const teile = vorne ? [...vorne.slice(1).reverse().map((t) => ({ i: t.i, vorwaerts: !t.vorwaerts })), ...hinten] : hinten;
    ketten.push({ teile, zu: false });
  }

  // Ketten → Punktlisten, geglättet und abgetastet
  const sigma = 1.6 * Math.max(1, k), abstandPunkte = 1.5 * Math.max(1, k);
  const ergebnis = [];
  for (const kette of ketten) {
    const idx = [];
    for (const t of kette.teile) {
      const px = roh[t.i].pixel, folge = t.vorwaerts ? px : [...px].reverse();
      for (const q of folge) if (idx[idx.length - 1] !== q) idx.push(q);
    }
    const zu = kette.zu || (idx.length > 6 && idx[0] === idx[idx.length - 1]);
    let xs = idx.map((q) => q % w), ys = idx.map((q) => (q / w) | 0), rs = idx.map((q) => Math.max(0.6, dist[q]));
    xs = glaetten(xs, sigma, zu); ys = glaetten(ys, sigma, zu); rs = glaetten(rs, sigma * 1.2, zu);
    const { px, py, pr } = idx.length > 1 ? abtasten(xs, ys, rs, abstandPunkte) : { px: xs, py: ys, pr: rs };
    let laenge = 0;
    for (let j = 1; j < px.length; j++) laenge += Math.hypot(px[j] - px[j - 1], py[j] - py[j - 1]);
    ergebnis.push({ x: px, y: py, r: pr, laenge, zu });
  }

  return { breite: w, hoehe: h, striche: ordnen([...ergebnis, ...flaechen]), rTyp, info: { umgekehrt, flaechen: flaechen.length, schwelle: Math.round(schwelle), staub, pixel: maske.reduce((a, b) => a + b, 0) } };
}

/** Umriss eines Gebiets (Pixelliste) als geschlossene Ringe [x0, y0, x1, y1, …]: Marching Squares auf der leicht weichgezeichneten Maske,
 *  so werden die Kanten glatt statt treppig. Löcher sind eigene Ringe (beim Füllen mit «evenodd»). */
export function umriss(maske, w, pixel) {
  let x0 = Infinity, y0 = Infinity, x1 = -1, y1 = -1;
  for (const p of pixel) { const x = p % w, y = (p / w) | 0; if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
  // Gitter mit 2 Pixeln Rand, nur dieses Gebiet
  const W = x1 - x0 + 5, H = y1 - y0 + 5, g0 = new Float32Array(W * H);
  for (const p of pixel) g0[((((p / w) | 0) - y0 + 2) * W) + (p % w) - x0 + 2] = 1;
  const g = new Float32Array(W * H);
  for (let y = 1; y < H - 1; y++) for (let x = 1; x < W - 1; x++) {
    let s = 0; for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) s += g0[(y + dy) * W + x + dx] * (dx && dy ? 1 : dx || dy ? 2 : 4);
    g[y * W + x] = s / 16;
  }
  const L = 0.5;
  // Kanten: waagrecht (x,y)–(x+1,y) = 2·i, senkrecht (x,y)–(x,y+1) = 2·i+1
  const punkt = new Map(), nachbar = new Map();
  const kante = (x, y, senk) => {
    const k = 2 * (y * W + x) + (senk ? 1 : 0);
    if (!punkt.has(k)) {
      const a = g[y * W + x], b = senk ? g[(y + 1) * W + x] : g[y * W + x + 1], t = (L - a) / (b - a);
      punkt.set(k, senk ? [x + x0 - 2 + 0.5, y + t + y0 - 2 + 0.5] : [x + t + x0 - 2 + 0.5, y + y0 - 2 + 0.5]);
    }
    return k;
  };
  const verbinde = (a, b) => { (nachbar.get(a) ?? nachbar.set(a, []).get(a)).push(b); (nachbar.get(b) ?? nachbar.set(b, []).get(b)).push(a); };
  for (let y = 0; y < H - 1; y++) for (let x = 0; x < W - 1; x++) {
    const a = g[y * W + x] > L, b = g[y * W + x + 1] > L, c = g[(y + 1) * W + x + 1] > L, d = g[(y + 1) * W + x] > L;
    const fall = a | (b << 1) | (c << 2) | (d << 3);
    if (!fall || fall === 15) continue;
    const o = () => kante(x, y, false), r = () => kante(x + 1, y, true), u = () => kante(x, y + 1, false), l = () => kante(x, y, true);
    const mitte = (g[y * W + x] + g[y * W + x + 1] + g[(y + 1) * W + x + 1] + g[(y + 1) * W + x]) / 4 > L;
    switch (fall) {
      case 1: case 14: verbinde(l(), o()); break;
      case 2: case 13: verbinde(o(), r()); break;
      case 3: case 12: verbinde(l(), r()); break;
      case 4: case 11: verbinde(r(), u()); break;
      case 6: case 9: verbinde(o(), u()); break;
      case 7: case 8: verbinde(l(), u()); break;
      case 5: if (mitte) { verbinde(l(), u()); verbinde(o(), r()); } else { verbinde(l(), o()); verbinde(r(), u()); } break;
      case 10: if (mitte) { verbinde(l(), o()); verbinde(r(), u()); } else { verbinde(o(), r()); verbinde(l(), u()); } break;
    }
  }
  const ringe = [], fertig = new Set();
  for (const start of nachbar.keys()) {
    if (fertig.has(start)) continue;
    const ring = [];
    let vor = -1, k = start;
    while (k !== undefined && !fertig.has(k)) {
      fertig.add(k);
      ring.push(...punkt.get(k));
      const n = nachbar.get(k).find((q) => q !== vor && !fertig.has(q));
      vor = k; k = n;
    }
    if (ring.length >= 6) ringe.push(ring);
  }
  return ringe;
}

/** Reihenfolge wie mit dem Stift: oben beginnen, dann jeweils der nächste Strich (bei Bedarf umgedreht) */
export function ordnen(liste) {
  const rest = liste.slice();
  const out = [];
  if (!rest.length) return out;
  let beste = 0;
  rest.forEach((s, i) => { if (Math.min(s.y[0], s.y[s.y.length - 1]) < Math.min(rest[beste].y[0], rest[beste].y[rest[beste].y.length - 1])) beste = i; });
  let s = rest.splice(beste, 1)[0];
  if (s.y[s.y.length - 1] < s.y[0]) s = umdrehen(s);
  out.push(s);
  while (rest.length) {
    const n = out[out.length - 1], ex = n.x[n.x.length - 1], ey = n.y[n.y.length - 1];
    let bi = 0, bd = Infinity, dreh = false;
    for (let i = 0; i < rest.length; i++) {
      const t = rest[i];
      const da = (t.x[0] - ex) ** 2 + (t.y[0] - ey) ** 2;
      const de = (t.x[t.x.length - 1] - ex) ** 2 + (t.y[t.y.length - 1] - ey) ** 2;
      if (da < bd) { bd = da; bi = i; dreh = false; }
      if (de < bd) { bd = de; bi = i; dreh = true; }
    }
    const t = rest.splice(bi, 1)[0];
    out.push(dreh ? umdrehen(t) : t);
  }
  return out;
}

const umdrehen = (s) => ({ ...s, x: [...s.x].reverse(), y: [...s.y].reverse(), r: [...s.r].reverse() });

/** Grösse des Analysebilds für ein Bild der Grösse w × h */
export function analyseMass(w, h) {
  const f = Math.min(1, ANALYSE / Math.max(w, h));
  return [Math.max(1, Math.round(w * f)), Math.max(1, Math.round(h * f))];
}
