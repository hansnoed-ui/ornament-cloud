// ORNAMENT COMPOSER – DSP-Grundbausteine ohne DOM, mit Zustand und blockweise: Biquad (RBJ-Kochbuch), K-Filter nach ITU-R BS.1770,
// wahrer Spitzenwert (vierfach überabgetastet) und Hilfen. Derselbe Code läuft im AudioWorklet (Vorschau) und offline (Export).
// Alles über Float32Array; Zustände in Float64, damit tiefe Filter bei 48 kHz nicht rauschen.

export const TAU = 2 * Math.PI;
export const dB = (x) => 20 * Math.log10(Math.max(1e-12, x));
export const ausDB = (d) => Math.exp(d * 0.11512925464970229);   // 10^(d/20)
export const begrenzt = (x, a, b) => (x < a ? a : x > b ? b : x);

/**
 * Koeffizienten eines Biquads nach dem Audio-EQ-Kochbuch von Robert Bristow-Johnson, normiert auf a0 = 1.
 * art: tiefpass, hochpass, glocke, tiefregal, hochregal. f in Hz, q Güte, db Verstärkung (Glocke und Regale).
 */
export function biquadKoeff(art, f, rate, { q = Math.SQRT1_2, db = 0 } = {}) {
  const w = (TAU * begrenzt(f, 1, rate * 0.49)) / rate, c = Math.cos(w), s = Math.sin(w), A = 10 ** (db / 40), al = s / (2 * q);
  let b0, b1, b2, a0, a1, a2;
  if (art === "tiefpass") { b0 = (1 - c) / 2; b1 = 1 - c; b2 = b0; a0 = 1 + al; a1 = -2 * c; a2 = 1 - al; }
  else if (art === "hochpass") { b0 = (1 + c) / 2; b1 = -(1 + c); b2 = b0; a0 = 1 + al; a1 = -2 * c; a2 = 1 - al; }
  else if (art === "glocke") { b0 = 1 + al * A; b1 = -2 * c; b2 = 1 - al * A; a0 = 1 + al / A; a1 = -2 * c; a2 = 1 - al / A; }
  else if (art === "tiefregal" || art === "hochregal") {
    const r = 2 * Math.sqrt(A) * al, h = art === "hochregal" ? 1 : -1;
    b0 = A * ((A + 1) + h * (A - 1) * c + r); b1 = -2 * h * A * ((A - 1) + h * (A + 1) * c); b2 = A * ((A + 1) + h * (A - 1) * c - r);
    a0 = (A + 1) - h * (A - 1) * c + r; a1 = 2 * h * ((A - 1) - h * (A + 1) * c); a2 = (A + 1) - h * (A - 1) * c - r;
  } else throw new Error(`unbekanntes Filter: ${art}`);
  return [b0 / a0, b1 / a0, b2 / a0, a1 / a0, a2 / a0];
}

/** ein Biquad mit Zustand je Kanal (Direktform II transponiert) */
export class Biquad {
  constructor(kanaele = 2) { this.k = [1, 0, 0, 0, 0]; this.z = Array.from({ length: kanaele }, () => new Float64Array(2)); }
  setze(k) { this.k = k; return this; }
  /** einen Kanal an Ort und Stelle filtern */
  kanal(s, c, n = s.length) {
    const [b0, b1, b2, a1, a2] = this.k, z = this.z[c];
    let z1 = z[0], z2 = z[1];
    for (let i = 0; i < n; i++) { const x = s[i], y = b0 * x + z1; z1 = b1 * x - a1 * y + z2; z2 = b2 * x - a2 * y; s[i] = y; }
    z[0] = z1; z[1] = z2;
  }
  zuruecksetzen() { for (const z of this.z) z.fill(0); }
}

/**
 * K-Filter nach ITU-R BS.1770-4 für jede Abtastrate (Herleitung über die bilineare Transformation wie in libebur128, MIT): Hochregal
 * +4 dB bei 1682 Hz, dann Hochpass bei 38 Hz mit b = [1, −2, 1]. Bei 48 kHz ergeben sich die Koeffizienten der Norm.
 */
export function kFilterKoeff(rate) {
  const G = 3.999843853973347, Q1 = 0.7071752369554196, f1 = 1681.974450955533;
  const K1 = Math.tan((Math.PI * f1) / rate), Vh = 10 ** (G / 20), Vb = Vh ** 0.4996667741545416, a0 = 1 + K1 / Q1 + K1 * K1;
  const regal = [(Vh + (Vb * K1) / Q1 + K1 * K1) / a0, (2 * (K1 * K1 - Vh)) / a0, (Vh - (Vb * K1) / Q1 + K1 * K1) / a0, (2 * (K1 * K1 - 1)) / a0, (1 - K1 / Q1 + K1 * K1) / a0];
  const Q2 = 0.5003270373238773, f2 = 38.13547087602444, K2 = Math.tan((Math.PI * f2) / rate), b0 = 1 + K2 / Q2 + K2 * K2;
  const hoch = [1, -2, 1, (2 * (K2 * K2 - 1)) / b0, (1 - K2 / Q2 + K2 * K2) / b0];
  return [regal, hoch];
}

/** K-gewichtete Energie (Summe der Quadrate über die Kanäle) blockweise: für Lautheit, Pegelausgleich und Referenzvergleich */
export class KEnergie {
  constructor(rate, kanaele = 2) { const [a, b] = kFilterKoeff(rate); this.f = [new Biquad(kanaele).setze(a), new Biquad(kanaele).setze(b)]; this.puffer = new Float32Array(128); }
  /** Summe der quadrierten, K-gewichteten Abtastwerte aller Kanäle (die Eingänge bleiben unverändert) */
  block(kanaele, n) {
    if (this.puffer.length < n) this.puffer = new Float32Array(n);
    const p = this.puffer; let s = 0;
    for (let c = 0; c < kanaele.length; c++) {
      p.set(kanaele[c].subarray(0, n));
      this.f[0].kanal(p, c, n); this.f[1].kanal(p, c, n);
      for (let i = 0; i < n; i++) s += p[i] * p[i];
    }
    return s;
  }
}

/** LUFS aus einer mittleren K-gewichteten Energie je Abtastwert (Summe über die Kanäle) */
export const lufsAus = (m) => -0.691 + 10 * Math.log10(Math.max(1e-20, m));

/**
 * Wahrer Spitzenwert: vierfach überabgetastet mit einem gefensterten Sinc (48 Koeffizienten, 12 je Phase, Kaiser β = 8), wie BS.1770-4
 * Anhang 2 es beschreibt (dort mit einem anderen, ähnlich langen Filter). Liefert je Eingangswert den grössten Betrag der vier Phasen.
 */
const PHASEN = 4, JE_PHASE = 12;
const TP_KOEFF = (() => {
  const L = PHASEN * JE_PHASE, h = new Float64Array(L), mitte = (L - 1) / 2, beta = 8;
  const i0 = (x) => { let s = 1, t = 1; for (let k = 1; k < 30; k++) { t *= (x / (2 * k)) ** 2; s += t; } return s; };
  for (let k = 0; k < L; k++) {
    const t = (k - mitte) / PHASEN, sinc = t === 0 ? 1 : Math.sin(Math.PI * t) / (Math.PI * t), r = (2 * k) / (L - 1) - 1;
    h[k] = sinc * (i0(beta * Math.sqrt(Math.max(0, 1 - r * r))) / i0(beta));
  }
  // je Phase auf Summe 1 normieren: eine Gleichspannung bleibt gleich hoch
  return Array.from({ length: PHASEN }, (_, p) => { const f = Float64Array.from({ length: JE_PHASE }, (_, j) => h[p + j * PHASEN]); const s = f.reduce((a, b) => a + b, 0); return f.map((x) => x / s); });
})();
/** Verzögerung des Spitzenwertmessers in Abtastwerten (die Mitte des Filters) */
export const TP_VERZOEGERUNG = JE_PHASE / 2;

export class WahrerSpitzenwert {
  constructor() { this.h = new Float64Array(JE_PHASE * 2); this.o = 0; }
  /** einen Wert hinein, den grössten Betrag (Abtastwert und Zwischenwerte) um TP_VERZOEGERUNG versetzt heraus */
  schritt(x) {
    const h = this.h, o = (this.o = (this.o + 1) % JE_PHASE);
    h[o] = x; h[o + JE_PHASE] = x;   // doppelt abgelegt, damit das Fenster ohne Modulo gelesen wird
    let m = 0;
    for (let p = 0; p < PHASEN; p++) {
      const f = TP_KOEFF[p]; let s = 0;
      for (let j = 0; j < JE_PHASE; j++) s += f[j] * h[o + JE_PHASE - j];
      const a = s < 0 ? -s : s; if (a > m) m = a;
    }
    return m;
  }
}

/** Gleichspannung entfernen (Hochpass erster Ordnung bei etwa 5 Hz), etwa nach einer unsymmetrischen Sättigung */
export class Gleichanteil {
  constructor(rate, kanaele = 2) { this.r = Math.exp((-TAU * 5) / rate); this.x = new Float64Array(kanaele); this.y = new Float64Array(kanaele); }
  kanal(s, c, n) { let x1 = this.x[c], y1 = this.y[c]; const r = this.r; for (let i = 0; i < n; i++) { const x = s[i], y = x - x1 + r * y1; x1 = x; y1 = y; s[i] = y; } this.x[c] = x1; this.y[c] = y1; }
}

/** Glättungsbeiwert eines Einpol-Filters für eine Zeitkonstante in Sekunden */
export const glaettung = (sek, rate) => (sek <= 0 ? 0 : Math.exp(-1 / (sek * rate)));
