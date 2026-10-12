// «Principesse» – ein Bild mit schwungvollen Pinselstrichen nachmalen (ohne DOM, im Web Worker).
// Nach dem Verfahren von Hertzmann («Painterly Rendering with Curved Brush Strokes», 1998): mehrere Durchgänge von breitem zu feinem Pinsel.
// Jeder Durchgang malt gegen eine weichgezeichnete Fassung des Bilds (je feiner der Pinsel, desto schärfer), und nur dort, wo der vorige
// Durchgang noch zu weit davon weg ist. Ein Strich beginnt an der Stelle mit dem grössten Fehler, nimmt dort die Farbe auf und folgt quer
// zum Helligkeitsgefälle (also den Formen entlang), gekrümmt und geglättet, bis die Farbe nicht mehr passt oder die Länge erreicht ist.
// Vorher wird das Bild aufgefrischt (Weissabgleich, Kontrast, Klarheit, Farbkraft) und geglättet (Rauschen, Leinwandstruktur und Körnung weg, Kanten bleiben).
// Wenige, lange Striche statt vieler kleiner: drei Durchgänge (die Feinheiten bringt am Schluss das scharfe Bild), jeder Durchgang malt der Reihe nach von oben nach unten.
// Ergebnis in Bildpunkten des fertigen Films (1080 × 1440): Striche mit Punkten, Farbe, Breite und Durchgang, in Malreihenfolge.
import { unschaerfe } from "../sketchory/strich.js?v=8";

/** kleiner, fester Zufall (gleiches Bild → gleiches Gemälde) */
export function zufall(saat = 1) {
  let s = saat >>> 0 || 1;
  return () => { s ^= s << 13; s >>>= 0; s ^= s >>> 17; s ^= s << 5; s >>>= 0; return s / 4294967296; };
}

/** RGBA → drei Farbkanäle (Float32) */
export function kanaele(rgba, w, h) {
  const r = new Float32Array(w * h), g = new Float32Array(w * h), b = new Float32Array(w * h);
  for (let i = 0, j = 0; i < r.length; i++, j += 4) { r[i] = rgba[j]; g[i] = rgba[j + 1]; b[i] = rgba[j + 2]; }
  return { r, g, b };
}

/**
 * Pinselstriche. rgba: Bild in Analysegrösse w × h (schon auf das Format des Films zugeschnitten), massstab: Bildpunkte des Films je Analysepunkt.
 * optionen.pinsel: Faktor für die Pinselbreiten (0.7 fein … 1.4 grob). optionen.saat: Startwert des Zufalls.
 */
export function malen(rgba, w, h, { massstab = 2, pinsel = 1, saat = 7, ...fein } = {}) {
  const E = { ...EINSTELLUNG, ...fein };
  const rnd = zufall(saat);
  let quelle = kanaele(rgba, w, h);
  if (E.auffrischen) quelle = optimieren(quelle, w, h);
  if (E.glatt) quelle = glaetten(quelle, w, h, { radius: E.glatt, farbweite: E.farbweite });
  // Pinselbreiten (Radius) im Film: breit für den Grund, fein für Augen und Kanten
  const RADIEN = E.radien.map((r) => r * pinsel);
  const { laenge, schwelle } = E;               // höchstens so viele Schritte (je ein Radius) pro Strich; so weit (RGB-Abstand) darf der vorige Durchgang abweichen
  const striche = [];
  // die Leinwand, wie sie bisher gemalt ist (anfangs leer = unendlich weit weg); daran misst jeder Durchgang, wo er nachbessern muss
  const leinwand = { r: new Float32Array(w * h), g: new Float32Array(w * h), b: new Float32Array(w * h), leer: new Uint8Array(w * h).fill(1) };
  let vorher = null;
  RADIEN.forEach((R, stufe) => {
    const Ra = R / massstab;                    // Radius in Analysepunkten
    // breite Pinsel untermalen grosszügig (weiche Fassung), feine arbeiten auf einer fast scharfen
    const ref = verwischt(quelle, w, h, Math.max(0, Math.round(stufe < 2 ? Ra * 0.45 : Math.min(Ra * 0.45, 6))));
    const hell = new Float32Array(w * h);
    for (let i = 0; i < hell.length; i++) hell[i] = 0.3 * ref.r[i] + 0.59 * ref.g[i] + 0.11 * ref.b[i];
    // Richtung: die geglättete Struktur der Umgebung (Strukturtensor), damit Striche auch in flachen Flächen ruhig den Formen folgen
    const [gx, gy] = richtungen(hell, w, h, Math.max(1, Math.round(Ra * 1.2)));
    const abst = (i, a, b) => (b.leer?.[i] ? 999 : Math.hypot(a.r[i] - b.r[i], a.g[i] - b.g[i], a.b[i] - b.b[i]));
    const raster = Math.max(1, Ra * (stufe ? E.raster : 0.95));
    const neu = [];
    for (let y0 = 0; y0 < h; y0 += raster) for (let x0 = 0; x0 < w; x0 += raster) {
      // Fehler im Feld: mittlerer Abstand zum vorigen Durchgang, und wo er am grössten ist
      let summe = 0, n = 0, bester = -1, bi = 0;
      const x1 = Math.min(w, x0 + raster), y1 = Math.min(h, y0 + raster);
      for (let y = Math.floor(y0); y < y1; y++) for (let x = Math.floor(x0); x < x1; x++) {
        const i = y * w + x;
        const f = abst(i, ref, leinwand);
        summe += f; n++;
        if (f > bester) { bester = f; bi = i; }
      }
      if (stufe && summe / Math.max(1, n) < schwelle[stufe]) continue;
      // im ersten Durchgang irgendwo im Feld beginnen, sonst an der schlechtesten Stelle
      const start = vorher ? bi : Math.min(w * h - 1, (Math.floor(y0 + rnd() * (y1 - y0)) * w + Math.floor(x0 + rnd() * (x1 - x0))));
      const st = strich(start % w, (start / w) | 0, Ra, ref, stufe ? leinwand : null, gx, gy, w, h, laenge[stufe], stufe < 2 ? 4 : 2, rnd);
      neu.push(st);
      aufmalen(leinwand, st, Ra * 0.88, w, h);
    }
    // innerhalb eines Durchgangs der Reihe nach: in Bändern von oben nach unten, hin und zurück, wie eine Hand, die über das Bild geht
    for (const s of reihe(neu, Ra * 5)) striche.push({ ...s, pts: s.pts.map((v) => v * massstab), r: R, stufe, saat: Math.floor(rnd() * 1e9) });
    vorher = leinwand;
  });
  return { striche, stufen: RADIEN.length, radien: RADIEN };
}

/** das fertige Bild in voller Grösse: aufgefrischt wie für das Malen, aber nur leicht geglättet (Körnung weg, scharf); RGBA */
export function klarbild(rgba, w, h) {
  const q = glaetten(optimieren(kanaele(rgba, w, h), w, h), w, h, { radius: 2, farbweite: 36, durchgaenge: 2 }), out = new Uint8ClampedArray(w * h * 4);
  for (let i = 0, j = 0; i < w * h; i++, j += 4) { out[j] = q.r[i]; out[j + 1] = q.g[i]; out[j + 2] = q.b[i]; out[j + 3] = 255; }
  return out;
}

/** Feinheiten: Pinselbreiten (Radius in Bildpunkten des Films) der Durchgänge, Länge und Schwelle je Durchgang, Abstand der Startfelder, Glätten */
export const EINSTELLUNG = { radien: [46, 22, 11], laenge: [7, 9, 10], schwelle: [0, 25, 30], raster: 1.3, glatt: 3, farbweite: 36, auffrischen: true };

/** Striche in Bänder der Höhe band ordnen (nach ihrer Mitte), von oben nach unten, abwechselnd von links und von rechts */
function reihe(striche, band) {
  const mitte = (s) => { let x = 0, y = 0; const n = s.pts.length / 2; for (let k = 0; k < s.pts.length; k += 2) { x += s.pts[k]; y += s.pts[k + 1]; } return [x / n, y / n]; };
  return striche.map((s) => { const [x, y] = mitte(s), b = Math.floor(y / band); return { s, b, x: b % 2 ? -x : x }; })
    .sort((a, c) => a.b - c.b || a.x - c.x).map((e) => e.s);
}

/** kantenerhaltend glätten (bilateral): Nachbarn zählen, je näher und je ähnlicher in der Farbe sie sind; zweimal */
export function glaetten(q, w, h, { radius = 3, farbweite = 36, durchgaenge = 2 } = {}) {
  const raum = [], sr = radius * 0.6, farbe = new Float32Array(442 * 4);
  for (let dy = -radius; dy <= radius; dy++) for (let dx = -radius; dx <= radius; dx++) if (dx * dx + dy * dy <= radius * radius + 1) raum.push(dx, dy, Math.exp(-(dx * dx + dy * dy) / (2 * sr * sr)));
  for (let i = 0; i < farbe.length; i++) farbe[i] = Math.exp(-((i / 4) ** 2) / (2 * farbweite * farbweite));
  let { r, g, b } = q;
  for (let d = 0; d < durchgaenge; d++) {
    const R = new Float32Array(w * h), G = new Float32Array(w * h), B = new Float32Array(w * h);
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const i = y * w + x, r0 = r[i], g0 = g[i], b0 = b[i];
      let sr_ = 0, sg = 0, sb = 0, sw = 0;
      for (let k = 0; k < raum.length; k += 3) {
        const xx = x + raum[k], yy = y + raum[k + 1];
        if (xx < 0 || yy < 0 || xx >= w || yy >= h) continue;
        const j = yy * w + xx, ab = Math.abs(r[j] - r0) + Math.abs(g[j] - g0) + Math.abs(b[j] - b0);
        const gw = raum[k + 2] * farbe[Math.min(farbe.length - 1, (ab * 4 * 0.58) | 0)];
        sr_ += r[j] * gw; sg += g[j] * gw; sb += b[j] * gw; sw += gw;
      }
      R[i] = sr_ / sw; G[i] = sg / sw; B[i] = sb / sw;
    }
    r = R; g = G; b = B;
  }
  return { r, g, b };
}

/**
 * auffrischen, wie man ein Foto eines Bilds von Hand bearbeiten würde:
 * 1. Weissabgleich: helle, fast unbunte Stellen (Papier, Weiss, Glanz) werden neutral (Farbstich des Lichts weg; zu drei Fünfteln, höchstens etwa ±7 %, damit gewollt cremige Farben cremig bleiben)
 * 2. Tonwerte: dunkelste und hellste 0,5 % auf Schwarz und Weiss spreizen (höchstens 1,8-fach), dann eine deutliche S-Kurve
 * 3. Klarheit: lokaler Kontrast (Helligkeit gegen ihre weiche Umgebung, Radius ~ 1/40 der Bildbreite)
 * 4. Farbkraft: alle Farben etwas satter, matte deutlich (Lebendigkeit)
 * Stärke 0 lässt das Bild, wie es ist; 1 ist die übliche Stärke.
 */
export function optimieren({ r, g, b }, w, h, staerke = 1) {
  const n = w * h, L = (i) => 0.3 * R[i] + 0.59 * G[i] + 0.11 * B[i];
  let R = Float32Array.from(r), G = Float32Array.from(g), B = Float32Array.from(b);
  const histo = (f) => { const hist = new Uint32Array(256); for (let i = 0; i < n; i++) hist[Math.max(0, Math.min(255, f(i) | 0))]++; return hist; };
  const stelle = (hist, anteil) => { let s = 0; for (let v = 0; v < 256; v++) { s += hist[v]; if (s >= anteil * n) return v; } return 255; };
  // 1. Weissabgleich
  const hellGrenze = stelle(histo(L), 0.9);
  let sr = 0, sg = 0, sb = 0, k = 0;
  for (let i = 0; i < n; i++) {
    const mx = Math.max(R[i], G[i], B[i]), mn = Math.min(R[i], G[i], B[i]);
    if (L(i) >= hellGrenze && mx > 90 && (mx - mn) / mx < 0.22) { sr += R[i]; sg += G[i]; sb += B[i]; k++; }
  }
  if (k > n * 0.004) {
    const grau = (sr + sg + sb) / 3, klemm = (x) => Math.max(0.88, Math.min(1.12, x)), mix = (x) => 1 + (x - 1) * 0.6 * staerke;
    const fr = mix(klemm(grau / sr)), fg = mix(klemm(grau / sg)), fb = mix(klemm(grau / sb));
    for (let i = 0; i < n; i++) { R[i] *= fr; G[i] *= fg; B[i] *= fb; }
  }
  // 2. Tonwerte und S-Kurve (auf alle drei Kanäle gleich, die Farbtöne bleiben)
  const hist = histo(L), lo = stelle(hist, 0.005), hi = stelle(hist, 0.995), mitte = (lo + hi) / 2;
  const f = 1 + (Math.min(1.8, 255 / Math.max(1, hi - lo)) - 1) * staerke;
  const o = Math.max(0, Math.min(255 - (hi - lo) * f, mitte - (mitte - lo) * f));
  const kurve = new Float32Array(256);
  for (let v = 0; v < 256; v++) {
    const x = Math.max(0, Math.min(1, (o + (v - lo) * f) / 255)), s = x * x * (3 - 2 * x);
    kurve[v] = 255 * (x + (s - x) * 0.55 * staerke);
  }
  const ton = (v) => { const c = Math.max(0, Math.min(255, v)), j = Math.min(254, c | 0), t = c - j; return kurve[j] + (kurve[j + 1] - kurve[j]) * t; };
  for (let i = 0; i < n; i++) { R[i] = ton(R[i]); G[i] = ton(G[i]); B[i] = ton(B[i]); }
  // 3. Klarheit
  const hell = new Float32Array(n);
  for (let i = 0; i < n; i++) hell[i] = L(i);
  const umgebung = unschaerfe(hell, w, h, Math.max(3, Math.round(w / 40)), 2);
  for (let i = 0; i < n; i++) {
    const d = (hell[i] - umgebung[i]) * 0.45 * staerke, m = Math.max(0, Math.min(1, Math.min(hell[i], 255 - hell[i]) / 40));
    R[i] = Math.max(0, Math.min(255, R[i] + d * m)); G[i] = Math.max(0, Math.min(255, G[i] + d * m)); B[i] = Math.max(0, Math.min(255, B[i] + d * m));
  }
  // 4. Farbkraft
  for (let i = 0; i < n; i++) {
    const l = L(i), mx = Math.max(R[i], G[i], B[i]), mn = Math.min(R[i], G[i], B[i]), satt = mx > 1 ? Math.min(1, (mx - mn) / mx) : 0;
    const plus = 1 + staerke * (0.14 + 0.3 * (1 - satt) ** 1.5);
    R[i] = Math.max(0, Math.min(255, l + (R[i] - l) * plus)); G[i] = Math.max(0, Math.min(255, l + (G[i] - l) * plus)); B[i] = Math.max(0, Math.min(255, l + (B[i] - l) * plus));
  }
  return { r: R, g: G, b: B };
}

/** ein Strich: Farbe am Anfang, dann quer zum Gefälle weiter, solange die Farbe passt */
function strich(x, y, R, ref, vorher, gx, gy, w, h, maxSchritte, minSchritte, rnd) {
  const i0 = y * w + x;
  const farbe = [ref.r[i0], ref.g[i0], ref.b[i0]];
  const pts = [x + 0.5, y + 0.5];
  let px = x + 0.5, py = y + 0.5, dx = 0, dy = 0;
  // Richtung ohne Gefälle: ein sanftes, festes Feld, damit auch flache Flächen geschwungen gemalt werden
  // ruhig: fast waagrecht, leicht wogend (wie ein Grund, den man in breiten Zügen anlegt)
  const feld = (u, v) => { const a = 0.28 * Math.sin(u * 0.012 + v * 0.019) + 0.12 * Math.sin(v * 0.031); return [Math.cos(a), Math.sin(a)]; };
  for (let k = 0; k < maxSchritte; k++) {
    const ix = Math.min(w - 1, Math.max(0, px | 0)), iy = Math.min(h - 1, Math.max(0, py | 0)), i = iy * w + ix;
    const passt = Math.hypot(ref.r[i] - farbe[0], ref.g[i] - farbe[1], ref.b[i] - farbe[2]);
    if (k > minSchritte) {
      if (vorher && !vorher.leer[i]) { const alt = Math.hypot(ref.r[i] - vorher.r[i], ref.g[i] - vorher.g[i], ref.b[i] - vorher.b[i]); if (alt < passt) break; }
      else if (passt > 75) break;
    }
    let ux = gx[i], uy = gy[i];
    const m = Math.hypot(ux, uy);
    let nx, ny;
    if (m < 0.6) [nx, ny] = dx || dy ? [dx, dy] : feld(px, py);
    else { nx = -uy / m; ny = ux / m; }
    if (dx * nx + dy * ny < 0) { nx = -nx; ny = -ny; }
    // glätten (Krümmung begrenzen): neue Richtung zur Hälfte aus der alten
    if (dx || dy) { nx = 0.55 * nx + 0.45 * dx; ny = 0.55 * ny + 0.45 * dy; }
    const l = Math.hypot(nx, ny) || 1;
    dx = nx / l; dy = ny / l;
    px += R * dx; py += R * dy;
    if (px < -R || py < -R || px > w + R || py > h + R) break;
    pts.push(px, py);
  }
  // ein Tupfer bekommt wenigstens eine kleine Richtung (sonst wäre er ein runder Fleck)
  if (pts.length === 2) { const [a, b] = feld(x, y); pts.push(x + 0.5 + a * R * 0.6, y + 0.5 + b * R * 0.6); }
  return { pts, farbe: farbe.map((v) => Math.round(v)) };
}

/** einen Strich auf die Leinwand der Rechnung malen (Kapseln mit Radius rr um jedes Stück) */
function aufmalen(lw, st, rr, w, h) {
  const [r, g, b] = st.farbe, p = st.pts, r2 = rr * rr;
  for (let k = 0; k + 3 < p.length || k === 0; k += 2) {
    const ax = p[k], ay = p[k + 1], bx = p[k + 2] ?? ax, by = p[k + 3] ?? ay;
    const dx = bx - ax, dy = by - ay, l2 = dx * dx + dy * dy || 1e-9;
    const x0 = Math.max(0, Math.floor(Math.min(ax, bx) - rr)), x1 = Math.min(w - 1, Math.ceil(Math.max(ax, bx) + rr));
    const y0 = Math.max(0, Math.floor(Math.min(ay, by) - rr)), y1 = Math.min(h - 1, Math.ceil(Math.max(ay, by) + rr));
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
      const t = Math.max(0, Math.min(1, ((x + 0.5 - ax) * dx + (y + 0.5 - ay) * dy) / l2));
      const ex = x + 0.5 - (ax + t * dx), ey = y + 0.5 - (ay + t * dy);
      if (ex * ex + ey * ey > r2) continue;
      const i = y * w + x;
      lw.r[i] = r; lw.g[i] = g; lw.b[i] = b; lw.leer[i] = 0;
    }
    if (p.length <= 2) break;
  }
}

function verwischt({ r, g, b }, w, h, radius) {
  if (radius < 1) return { r, g, b };
  return { r: unschaerfe(r, w, h, radius, 3), g: unschaerfe(g, w, h, radius, 3), b: unschaerfe(b, w, h, radius, 3) };
}

/** Strukturtensor: Gefälle, über die Umgebung (Radius r) geglättet; gibt eine Richtung quer zu den Kanten (als Gefälle-Vektor), mit Stärke */
function richtungen(L, w, h, r) {
  const [gx, gy] = sobel(L, w, h);
  let xx = new Float32Array(w * h), xy = new Float32Array(w * h), yy = new Float32Array(w * h);
  for (let i = 0; i < xx.length; i++) { xx[i] = gx[i] * gx[i]; xy[i] = gx[i] * gy[i]; yy[i] = gy[i] * gy[i]; }
  xx = unschaerfe(xx, w, h, r, 2); xy = unschaerfe(xy, w, h, r, 2); yy = unschaerfe(yy, w, h, r, 2);
  for (let i = 0; i < xx.length; i++) {
    const d = Math.sqrt((xx[i] - yy[i]) ** 2 + 4 * xy[i] ** 2), a = 0.5 * Math.atan2(2 * xy[i], xx[i] - yy[i]);
    // nur eine klare Richtung zählt (Kohärenz); Rauschen in Flächen gibt keine Richtung, dort malt der Pinsel ruhig weiter
    const m = d / (xx[i] + yy[i] + 1e-6) > 0.3 ? Math.sqrt(d) : 0;
    gx[i] = Math.cos(a) * m; gy[i] = Math.sin(a) * m;
  }
  return [gx, gy];
}

function sobel(L, w, h) {
  const gx = new Float32Array(w * h), gy = new Float32Array(w * h);
  for (let y = 1; y < h - 1; y++) for (let x = 1; x < w - 1; x++) {
    const i = y * w + x;
    gx[i] = (L[i - w + 1] + 2 * L[i + 1] + L[i + w + 1] - L[i - w - 1] - 2 * L[i - 1] - L[i + w - 1]) / 8;
    gy[i] = (L[i + w - 1] + 2 * L[i + w] + L[i + w + 1] - L[i - w - 1] - 2 * L[i - w] - L[i - w + 1]) / 8;
  }
  return [gx, gy];
}
