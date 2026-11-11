// Grundbausteine der Klangerzeuger: Zufall aus dem Startwert, Zustandsvariables Filter (TPT nach Andrew Simper, Cytomic, als Formel
// veröffentlicht), bandbegrenzte Rechteckschwingung (PolyBLEP), Hüllkurven, Sättigung und eine Summe abklingender Moden für Fell,
// Holz und Metall. Alles rechnet einen Schlag auf einmal in Float32Array; Startwert gleich, Abtastwerte gleich.

export const TAU = 2 * Math.PI;

/** Zufall aus dem Startwert (mulberry32), gleichverteilt in [0, 1) */
export function zufall(seed) {
  let a = seed >>> 0 || 1;
  return () => { a = (a + 0x6d2b79f5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
/** Startwert aus Text und Zahlen (für Schläge im Zwischenspeicher) */
export function hash(...teile) { let h = 2166136261; for (const c of teile.join("|")) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619); } return h >>> 0; }

/** Zustandsvariables Filter, eine Stimme; tief, band, hoch und Kerbe aus derselben Rechnung */
export class SVF {
  constructor() { this.ic1 = 0; this.ic2 = 0; }
  setze(f, q, rate) { const g = Math.tan(Math.PI * Math.min(f, rate * 0.45) / rate), k = 1 / Math.max(0.05, q); this.k = k; this.a1 = 1 / (1 + g * (g + k)); this.a2 = g * this.a1; this.a3 = g * this.a2; return this; }
  schritt(v0) {
    const v3 = v0 - this.ic2, v1 = this.a1 * this.ic1 + this.a2 * v3, v2 = this.ic2 + this.a2 * this.ic1 + this.a3 * v3;
    this.ic1 = 2 * v1 - this.ic1; this.ic2 = 2 * v2 - this.ic2;
    this.tief = v2; this.band = v1; this.hoch = v0 - this.k * v1 - v2;
    return this;
  }
}
/** ein ganzer Puffer durch ein Filter: art tief | band | hoch */
export function filtere(s, art, f, q, rate) { const f1 = new SVF().setze(f, q, rate); for (let i = 0; i < s.length; i++) s[i] = f1.schritt(s[i])[art]; return s; }

/** bandbegrenztes Rechteck (PolyBLEP): für Metall aus sechs Schwingungen wie in klassischen Hi-Hat-Schaltungen */
export class Rechteck {
  constructor(f, rate, phase = 0) { this.d = f / rate; this.p = phase; }
  schritt() {
    const d = this.d, p = this.p;
    const blep = (t) => (t < d ? (t /= d, t + t - t * t - 1) : t > 1 - d ? (t = (t - 1) / d, t * t + t + t + 1) : 0);
    let y = p < 0.5 ? 1 : -1;
    y += blep(p); y -= blep((p + 0.5) % 1);
    this.p = (p + d) % 1;
    return y;
  }
}

/** weiche Sättigung, auf ±1 normiert: antrieb in dB, bei 0 unverändert */
export function saettige(s, antriebDB) {
  if (antriebDB <= 0) return s;
  const g = 10 ** (antriebDB / 20), n = Math.tanh(g);
  for (let i = 0; i < s.length; i++) s[i] = Math.tanh(g * s[i]) / n;
  return s;
}

/** Länge eines Schlags in Abtastwerten: bis die langsamste Abklingzeit (T60, s) 80 dB gefallen ist, höchstens 'max' Sekunden */
export const schlagLaenge = (t60, rate, max = 4) => Math.ceil(Math.min(max, t60 * 1.35 + 0.01) * rate);

/** exponentiell abklingend: Faktor je Abtastwert für eine Abklingzeit T60 (−60 dB) */
export const abkling = (t60, rate) => Math.exp(-6.907755 / Math.max(1e-4, t60 * rate));

/**
 * Moden: eine Summe gedämpfter Sinusschwingungen. moden: [{ f (Hz), a (Amplitude), t60 (s), phase? }]. Gemeinsam für alle:
 * gleiten (Halbtöne, die Tonhöhe wandert über 'gleitZeit' s dorthin, wie die Handballen auf der Bayan), anschlag (s, Dauer des Kontakts:
 * dämpft Moden oberhalb von etwa 1/anschlag und rundet den Einsatz).
 */
export function moden(aus, rate, liste, { gleiten = 0, gleitZeit = 0.15, anschlag = 0.0005, start = 0 } = {}) {
  const n = aus.length, fc = 1 / Math.max(1e-4, anschlag), auf = Math.max(1, Math.round(anschlag * rate));
  for (const m of liste) {
    if (m.f >= rate * 0.45 || m.a === 0) continue;
    // Anregung durch einen Kontakt der Dauer «anschlag»: oberhalb von fc fällt die Anregung mit 12 dB je Oktave
    const a = m.a / (1 + (m.f / fc) ** 2), r = abkling(m.t60, rate), w0 = (TAU * m.f) / rate, gl = gleiten && m.gleiten !== false ? gleiten : 0;
    let amp = a, ph = m.phase ?? 0;
    const ende = Math.min(n, start + Math.ceil(Math.min(4, m.t60 * 1.35 + 0.005) * rate));
    for (let i = start; i < ende; i++) {
      const t = (i - start) / rate, w = gl ? w0 * 2 ** ((gl * (1 - Math.exp(-t / gleitZeit))) / 12) : w0;
      const e = i - start < auf ? 0.5 - 0.5 * Math.cos((Math.PI * (i - start)) / auf) : 1;
      aus[i] += amp * e * Math.sin(ph);
      ph += w; amp *= r;
    }
  }
  return aus;
}

/** Rauschstoss: weisses Rauschen mit Einsatz (s), Abklingzeit T60 (s), gefiltert; auf aus addiert */
export function rauschen(aus, rate, rnd, { staerke = 1, t60 = 0.1, auf = 0.0005, art = "band", f = 3000, q = 0.7, start = 0, f2 = 0, art2 = "hoch" } = {}) {
  const n = Math.min(aus.length - start, Math.ceil(Math.min(4, t60 * 1.35 + auf) * rate)), r = abkling(t60, rate), na = Math.max(1, Math.round(auf * rate));
  const fl = new SVF().setze(f, q, rate), fl2 = f2 ? new SVF().setze(f2, 0.7, rate) : null;
  let amp = staerke;
  for (let i = 0; i < n; i++) {
    let v = fl.schritt(rnd() * 2 - 1)[art];
    if (fl2) v = fl2.schritt(v)[art2];
    const e = i < na ? i / na : 1;
    aus[start + i] += v * amp * e;
    if (i >= na) amp *= r;
  }
  return aus;
}

export function spitze(...kanaele) { let m = 0; for (const s of kanaele) for (const v of s) { const a = v < 0 ? -v : v; if (a > m) m = a; } return m; }

/** mono → stereo; breite > 0 mischt einen zweiten, unabhängigen Anteil (andere Rauschsaat) gegengleich in die Seiten */
export function stereo(mitte, seite = null, breite = 0) {
  const L = Float32Array.from(mitte), R = Float32Array.from(mitte);
  if (seite && breite > 0) for (let i = 0; i < L.length && i < seite.length; i++) { L[i] += seite[i] * breite; R[i] -= seite[i] * breite; }
  return [L, R];
}
