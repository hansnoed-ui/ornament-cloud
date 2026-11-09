// Glanz 0.1.0 – Obertöne und Luft: ein Exciter (der Teil oberhalb einer Frequenz wird weich gesättigt, nur die neu entstandenen Obertöne
// werden dazugemischt) und ein Höhenregal für Luft. Vorbilder für Verhalten (nicht für Code): Aphex Aural Exciter, das Air-Band von
// Maag EQ. Menge 0 und Luft 0 lassen das Signal unverändert. Nach der Veröffentlichung nicht mehr verändern.

import { Biquad, biquadKoeff } from "../kern/dsp.js";
import { SVF } from "../erzeuger/grund.js";

export default {
  id: "glanz", version: "0.1.0", name: "Glanz", kurz: "GL",
  beschreibung: "Exciter (neue Obertöne über einer Frequenz) und Luft (Höhenregal). Für Synths, Flächen, Perkussion.",
  parameter: [
    { key: "menge", name: "Glanz", gruppe: "Exciter", min: 0, max: 100, std: 0, einheit: "%", schritt: 1 },
    { key: "frequenz", name: "ab", gruppe: "Exciter", min: 1500, max: 12000, std: 4500, einheit: "Hz", skala: "log", hilfe: "nur oberhalb entstehen Obertöne" },
    { key: "biss", name: "Biss", gruppe: "Exciter", min: 0, max: 100, std: 40, einheit: "%", hilfe: "wie stark gesättigt wird: weich glänzend bis knisternd" },
    { key: "luft", name: "Luft", gruppe: "Luft", min: 0, max: 12, std: 0, einheit: "dB", schritt: 0.1 },
    { key: "luftF", name: "Luft ab", gruppe: "Luft", min: 6000, max: 18000, std: 12000, einheit: "Hz", skala: "log" },
  ],
  latenz: () => 0,
  erzeuge(rate) {
    const hp1 = [new SVF(), new SVF()], hp2 = [new SVF(), new SVF()], regal = new Biquad(2);
    let w = null;
    return {
      setze(werte) { w = werte; hp1.forEach((f) => f.setze(w.frequenz, 0.7, rate)); hp2.forEach((f) => f.setze(w.frequenz, 0.7, rate)); regal.setze(biquadKoeff("hochregal", w.luftF, rate, { db: w.luft })); },
      prozess(k, n) {
        if (!w || (w.menge === 0 && w.luft === 0)) return { reduktion: 0 };
        const m = (w.menge / 100) * 0.6, d = 2 + (w.biss / 100) * 10;
        if (w.menge > 0) for (let c = 0; c < 2; c++) { const s = k[c]; for (let i = 0; i < n; i++) { const h = hp1[c].schritt(s[i]).hoch; s[i] += hp2[c].schritt(Math.tanh(d * h) / d * 3 - h).hoch * m; } }
        if (w.luft !== 0) { regal.kanal(k[0], 0, n); regal.kanal(k[1], 1, n); }
        return { reduktion: 0 };
      },
    };
  },
};
