// Bassfett 0.1.0 – macht Bass fetter und auf kleinen Lautsprechern hörbar. Drei Wege, getrennt regelbar:
//   Unteroktave   der tiefe Teil wird an seinen Nulldurchgängen geteilt (jede zweite Halbwelle umgedreht) und tiefpassgefiltert:
//                 ein Ton eine Oktave tiefer, der der Hülle des Originals folgt (Prinzip analoger Suboktav-Teiler)
//   Obertöne      der tiefe Teil wird gekrümmt (zweite und dritte Harmonische, Tschebyschow-Polynome), nur die neuen Obertöne über
//                 der Weiche werden dazugemischt: das Ohr ergänzt den Grundton auch dort, wo das Handy ihn nicht spielt
//                 (fehlender Grundton; Idee wie in virtuellen Bass-Verfahren und Subhoofer, Code eigen)
//   Wärme         weiche Sättigung der ganzen Spur
// In Grundstellung (alles 0) unverändert. Nach der Veröffentlichung nicht mehr verändern.

import { Biquad, biquadKoeff, ausDB, glaettung } from "../kern/dsp.js";

export default {
  id: "bassfett", version: "0.1.0", name: "Bassfett", kurz: "BF",
  beschreibung: "Unteroktave, Obertöne für kleine Lautsprecher, Wärme. Für Bass und Kick.",
  parameter: [
    { key: "sub", name: "Unteroktave", gruppe: "Tief", min: 0, max: 100, std: 0, einheit: "%", schritt: 1, hilfe: "ein Ton eine Oktave tiefer, folgt der Lautstärke" },
    { key: "weiche", name: "Weiche", gruppe: "Tief", min: 50, max: 250, std: 110, einheit: "Hz", skala: "log", hilfe: "was darunter liegt, gilt als Bass" },
    { key: "obertoene", name: "Obertöne", gruppe: "Hörbar", min: 0, max: 100, std: 0, einheit: "%", schritt: 1, hilfe: "für Handy und Laptop: das Ohr hört den Grundton mit" },
    { key: "farbe", name: "Farbe", gruppe: "Hörbar", min: 0, max: 100, std: 40, einheit: "%", hilfe: "0 = nur zweite Harmonische (weich), 100 = mehr dritte (knurrig)" },
    { key: "waerme", name: "Wärme", gruppe: "Ganz", min: 0, max: 24, std: 0, einheit: "dB", schritt: 0.1 },
    { key: "ausgang", name: "Ausgang", gruppe: "Ganz", min: -18, max: 6, std: 0, einheit: "dB", schritt: 0.1 },
  ],
  latenz: () => 0,

  erzeuge(rate) {
    const lp = [new Biquad(1), new Biquad(1)], subLp = [new Biquad(1), new Biquad(1)], hp = [new Biquad(1), new Biquad(1)], hp2 = [new Biquad(1), new Biquad(1)];
    let w = null, vorz = 1, alt = 0, hulle = 0, a = 0;
    const tmp = { tief: new Float32Array(128), sub: new Float32Array(128), ober: new Float32Array(128) };
    return {
      setze(werte) {
        w = werte;
        lp.forEach((f) => f.setze(biquadKoeff("tiefpass", w.weiche, rate))); subLp.forEach((f) => f.setze(biquadKoeff("tiefpass", w.weiche * 0.55, rate)));
        hp.forEach((f) => f.setze(biquadKoeff("hochpass", w.weiche * 1.1, rate))); hp2.forEach((f) => f.setze(biquadKoeff("hochpass", w.weiche * 1.1, rate)));
        a = glaettung(0.012, rate);
      },
      prozess(k, n) {
        if (!w || (w.sub === 0 && w.obertoene === 0 && w.waerme === 0 && w.ausgang === 0)) return { reduktion: 0 };
        if (tmp.tief.length < n) for (const key in tmp) tmp[key] = new Float32Array(n);
        const [L, R] = k, { tief, sub, ober } = tmp, s3 = w.farbe / 100;
        for (let i = 0; i < n; i++) tief[i] = (L[i] + R[i]) * 0.5;
        lp[0].kanal(tief, 0, n); lp[1].kanal(tief, 0, n);
        for (let i = 0; i < n; i++) {
          const x = tief[i];
          // Unteroktave: bei jedem Nulldurchgang von unten nach oben wechselt das Vorzeichen
          if (alt <= 0 && x > 0) vorz = -vorz;
          alt = x;
          const b = Math.abs(x); hulle = b > hulle ? b : a * hulle + (1 - a) * b;
          sub[i] = vorz * hulle;
          // Obertöne: T2(x) = 2x² − 1 (ohne Gleichanteil: 2x²), T3(x) = 4x³ − 3x, auf die Hülle bezogen
          const u = hulle > 1e-6 ? x / hulle : 0;
          ober[i] = hulle * ((1 - s3) * (2 * u * u - 1) + s3 * (4 * u * u * u - 3 * u));
        }
        subLp[0].kanal(sub, 0, n); subLp[1].kanal(sub, 0, n);
        hp[0].kanal(ober, 0, n); hp2[0].kanal(ober, 0, n);
        const gs = (w.sub / 100) * 1.4, go = (w.obertoene / 100) * 0.9, gw = ausDB(w.waerme), nw = Math.tanh(gw), out = ausDB(w.ausgang);
        for (let i = 0; i < n; i++) {
          const add = sub[i] * gs + ober[i] * go;
          let l = L[i] + add, r = R[i] + add;
          if (w.waerme > 0) { l = Math.tanh(gw * l) / nw; r = Math.tanh(gw * r) / nw; }
          L[i] = l * out; R[i] = r * out;
        }
        return { reduktion: 0 };
      },
    };
  },
};
