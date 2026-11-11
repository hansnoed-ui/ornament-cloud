// Raum 0.1.0 – Hall aus einem Rückkopplungsnetz von acht Verzögerungen (Feedback Delay Network nach Jot und Chaigne, Householder-Matrix),
// mit Vorverzögerung, frühen Reflexionen, vier Allpässen zur Verdichtung, Dämpfung der Höhen in der Schleife und langsamer Bewegung der
// Längen gegen metallisches Klingeln. Vorbilder für Klang und Bedienung (nicht für Code): Valhalla Room und VintageVerb, die Hallräume
// der ECM-Aufnahmen (Rainbow Studio Oslo): dunkel, weit, ohne Glanz. Nach der Veröffentlichung nicht mehr verändern.

import { Biquad, biquadKoeff, TAU } from "../kern/dsp.js";

const LINIEN = [29.7, 37.1, 41.1, 43.7, 53.1, 59.9, 67.7, 73.3];   // ms bei Grösse 1, teilerfremd gewählt
const ALLPASS = [[4.77, 0.62], [3.59, 0.62], [12.73, 0.55], [9.3, 0.55]];
const FRUEH = [[7.1, 0.82, -0.7], [11.3, 0.7, 0.6], [17.9, 0.62, -0.3], [23.3, 0.5, 0.8], [31.7, 0.42, -0.9], [41.9, 0.33, 0.2], [53.3, 0.25, -0.5], [61.1, 0.2, 0.9]];   // ms, Pegel, Panorama

class Verz {
  constructor(n) { this.b = new Float32Array(n); this.i = 0; }
  schreibe(x) { this.b[this.i] = x; this.i = (this.i + 1) % this.b.length; }
  /** d Abtastwerte zurück (gebrochen, linear interpoliert); d ≥ 1 */
  // dieselbe Rechnung wie bis 11.11.2026, nur meist ohne Modulo (Modulo kostete den Hall rund ein Drittel seiner Zeit): bitgleich, schneller
  lies(d) {
    const n = this.b.length, p = this.i - d, a = Math.floor(p), f = p - a;
    let i0 = a; if (i0 < 0) { i0 += n; if (i0 < 0) i0 = ((a % n) + n) % n; }
    const i1 = i0 + 1 === n ? 0 : i0 + 1;
    return this.b[i0] * (1 - f) + this.b[i1] * f;
  }
}

export default {
  id: "raum", version: "0.1.0", name: "Raum", kurz: "RM",
  beschreibung: "Hall: acht verkoppelte Verzögerungen, frühe Reflexionen, Höhendämpfung in der Schleife, langsame Bewegung. Für Perkussion, Flächen, Stimme.",
  parameter: [
    { key: "anteil", name: "Anteil", gruppe: "Mischung", min: 0, max: 100, std: 25, einheit: "%", schritt: 1, hilfe: "Überblendung trocken → nass (gleiche Leistung)" },
    { key: "vorverz", name: "Vorverzögerung", gruppe: "Mischung", min: 0, max: 150, std: 18, einheit: "ms", hilfe: "Abstand zwischen Schlag und Raum: macht den Schlag klar" },
    { key: "frueh", name: "frühe Reflexionen", gruppe: "Mischung", min: 0, max: 100, std: 40, einheit: "%" },
    { key: "nachhall", name: "Nachhall", gruppe: "Raum", min: 0.2, max: 12, std: 2.2, einheit: "s", skala: "log", hilfe: "Zeit, bis der Hall um 60 dB gefallen ist" },
    { key: "groesse", name: "Grösse", gruppe: "Raum", min: 0.3, max: 2.5, std: 1, einheit: "×", skala: "log" },
    { key: "daempfung", name: "Höhendämpfung", gruppe: "Raum", min: 1500, max: 16000, std: 6000, einheit: "Hz", skala: "log", hilfe: "tief = dunkler, weicher Raum (Stoff, Holz)" },
    { key: "bewegung", name: "Bewegung", gruppe: "Raum", min: 0, max: 100, std: 25, einheit: "%", hilfe: "langsame Schwankung der Längen: weicher, weniger Metall" },
    { key: "tiefschnitt", name: "Tiefschnitt", gruppe: "Farbe", min: 20, max: 600, std: 150, einheit: "Hz", skala: "log", hilfe: "Bass nicht in den Raum: bleibt trocken und klar" },
    { key: "hochschnitt", name: "Hochschnitt", gruppe: "Farbe", min: 2000, max: 20000, std: 9000, einheit: "Hz", skala: "log" },
    { key: "breite", name: "Breite", gruppe: "Farbe", min: 0, max: 100, std: 100, einheit: "%" },
  ],
  latenz: () => 0,

  erzeuge(rate) {
    const max = (ms) => Math.ceil((ms * 2.5 * rate) / 1000) + 64;
    const linien = LINIEN.map((ms) => new Verz(max(ms))), allp = ALLPASS.map(([ms]) => new Verz(Math.ceil((ms * rate) / 1000) + 2));
    const vor = new Verz(Math.ceil(0.22 * rate)), lp = new Float64Array(8), ein = [new Biquad(1), new Biquad(1)];
    const lfo = LINIEN.map((_, k) => ({ ph: (k * TAU) / 8, w: (TAU * (0.11 + 0.037 * k)) / rate }));
    let w = null, g = new Float64Array(8), lpA = 0, len = new Float64Array(8), dry = 1, wet = 0, vorN = 1;
    const x = new Float64Array(8), fruehD = new Float64Array(8);
    return {
      setze(werte) {
        w = werte;
        for (let k = 0; k < 8; k++) { len[k] = (LINIEN[k] * w.groesse * rate) / 1000; g[k] = 10 ** ((-3 * len[k]) / (w.nachhall * rate)); }
        lpA = Math.exp((-TAU * w.daempfung) / rate);
        ein[0].setze(biquadKoeff("hochpass", w.tiefschnitt, rate)); ein[1].setze(biquadKoeff("tiefpass", w.hochschnitt, rate));
        const a = (w.anteil / 100) * (Math.PI / 2); dry = Math.cos(a); wet = Math.sin(a);
        vorN = Math.max(1, Math.round((w.vorverz / 1000) * rate));
        for (let j = 0; j < 8; j++) fruehD[j] = (FRUEH[j][0] * w.groesse * rate) / 1000;
      },
      prozess(k, n) {
        if (!w || w.anteil === 0) return { reduktion: 0 };
        const [L, R] = k, tiefe = (w.bewegung / 100) * 0.0009 * rate, fr = w.frueh / 100, br = w.breite / 100;
        const m = this.puffer?.length >= n ? this.puffer : (this.puffer = new Float32Array(Math.max(n, 128)));
        for (let i = 0; i < n; i++) m[i] = (L[i] + R[i]) * 0.5;
        ein[0].kanal(m, 0, n); ein[1].kanal(m, 0, n);
        for (let i = 0; i < n; i++) {
          vor.schreibe(m[i]);
          const v = vor.lies(vorN);
          // frühe Reflexionen aus der vorverzögerten Mitte
          let eL = 0, eR = 0;
          if (fr > 0) for (let j = 0; j < 8; j++) { const s = vor.lies(vorN + fruehD[j]) * FRUEH[j][1], pan = FRUEH[j][2]; eL += s * (1 - pan) * 0.5; eR += s * (1 + pan) * 0.5; }
          // verdichten
          let d = v;
          for (let a = 0; a < 4; a++) { const ap = allp[a], gk = ALLPASS[a][1], z = ap.lies(ap.b.length - 1); const y = -gk * d + z; ap.schreibe(d + gk * y); d = y; }
          // Schleife: lesen, dämpfen, Householder mischen, zurückschreiben
          let summe = 0;
          for (let j = 0; j < 8; j++) {
            const o = lfo[j]; o.ph += o.w; if (o.ph > TAU) o.ph -= TAU;
            const y = linien[j].lies(len[j] + tiefe * (1 + Math.sin(o.ph)) + 1);
            lp[j] = (1 - lpA) * y + lpA * lp[j];
            x[j] = lp[j] * g[j]; summe += x[j];
          }
          const hh = (2 / 8) * summe;
          for (let j = 0; j < 8; j++) linien[j].schreibe(x[j] - hh + (j % 2 ? d : -d) * 0.5);
          const hL = x[0] - x[2] + x[4] - x[6] + x[1] * 0.5, hR = x[1] - x[3] + x[5] - x[7] + x[0] * 0.5;
          const sl = (hL + eL * 1.4) * 0.6, sr = (hR + eR * 1.4) * 0.6, mi = (sl + sr) / 2;
          L[i] = L[i] * dry + (mi + (sl - mi) * br) * wet;
          R[i] = R[i] * dry + (mi + (sr - mi) * br) * wet;
        }
        return { reduktion: 0 };
      },
    };
  },
};
