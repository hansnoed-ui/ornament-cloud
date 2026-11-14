// Geräusch 0.1.0 (12.11.2026, für Strikk 2 freigegeben) – Übergänge und Ereignisse aus eigener Synthese, keine Samples:
//   riser     Rauschen, dessen Band nach oben wandert, dazu ein steigender, leicht verstimmter Ton; endet auf dem Zielschlag
//   fall      das Gegenstück: von oben nach unten, nach einem Einschlag
//   einschlag tiefer Schlag mit Sinus-Sturz, Rauschstoss und langem, dunklem Nachklang (für einen Abschnittsbeginn)
//   rumpeln   dunkles, langsam an- und abschwellendes Grollen (Wind, ferne Maschine)
//   luft      helles, breites Rauschen mit langsam wanderndem Filter, sehr leise unter Flächen
// Jede Note ist ein Ereignis: «dauer» ist die Länge, die Frequenz bestimmt nur den Ton im Riser (Tonart des Tracks).
// Nach der Veröffentlichung nicht mehr verändern; neue Klänge in geraeusch-0.2.0.js.

import { zufall, SVF, spitze } from "./grund.js";

const P = (key, name, gruppe, min, max, std, einheit = "", mehr = {}) => ({ key, name, gruppe, min, max, std, einheit, ...mehr });
const V = (name, beschreibung, werte) => ({ name, beschreibung, werte });
const TAU = 2 * Math.PI;
function fertig(L, R, staerke) {
  const m = spitze(L, R) || 1, g = (0.9 * Math.min(1.2, staerke)) / m, n = L.length, aus = Math.min(n, 480);
  for (let i = 0; i < n; i++) { L[i] *= g; R[i] *= g; }
  for (let i = 0; i < aus; i++) { const k = i / aus; L[n - 1 - i] *= k; R[n - 1 - i] *= k; }
  return [L, R];
}
const glatt = (x) => x * x * (3 - 2 * x);

/** Rauschen durch ein wanderndes Bandpass-Filter (f(t) in Hz), je Kanal eigene Saat: breit */
function bandRauschen(n, rate, seed, f, q, huelle) {
  const L = new Float32Array(n), R = new Float32Array(n), ra = zufall(seed), rb = zufall(seed ^ 0x51ed27), fa = new SVF(), fb = new SVF();
  for (let i = 0; i < n; i++) {
    if (i % 64 === 0) { const fi = f(i / n); fa.setze(fi, q, rate); fb.setze(fi * 1.04, q, rate); }
    const h = huelle(i / n);
    L[i] = fa.schritt(ra() * 2 - 1).band * h; R[i] = fb.schritt(rb() * 2 - 1).band * h;
  }
  return [L, R];
}

const riser = {
  key: "riser", name: "Riser", rolle: "geraeusch", pan: 0, pegel: -10,
  parameter: [P("von", "von", "Filter", 100, 2000, 250, "Hz", { skala: "log" }), P("bis", "bis", "Filter", 1000, 16000, 7000, "Hz", { skala: "log" }),
    P("ton", "Ton", "Klang", 0, 100, 35, "%", { hilfe: "Anteil des steigenden Tons" }), P("steigen", "Steigen", "Klang", 0, 24, 12, "Halbtöne")],
  varianten: [V("hell", "Rauschen nach oben, etwas Ton", {}), V("dunkel", "langsam, tief, wenig Ton", { von: 120, bis: 2500, ton: 15, steigen: 7 }), V("Ton", "deutlicher Ton, wie eine Sirene", { ton: 70, steigen: 12 })],
  rechne(w, rate, { frequenz = 220, dauer = 4, staerke = 0.8, seed = 1 }) {
    const n = Math.round(dauer * rate), [L, R] = bandRauschen(n, rate, seed, (x) => w.von * (w.bis / w.von) ** glatt(x), 1.4, (x) => x ** 2.2);
    let ph1 = 0, ph2 = 0;
    for (let i = 0; i < n; i++) {
      const x = i / n, f = frequenz * 2 ** ((w.steigen * glatt(x)) / 12), a = (w.ton / 100) * 0.35 * x ** 2.5;
      ph1 += (TAU * f) / rate; ph2 += (TAU * f * 1.006) / rate;
      L[i] += Math.sin(ph1) * a; R[i] += Math.sin(ph2) * a;
    }
    return fertig(L, R, staerke);
  },
};
const fall = {
  key: "fall", name: "Fall", rolle: "geraeusch", pan: 0, pegel: -12,
  parameter: [P("von", "von", "Filter", 1000, 16000, 6000, "Hz", { skala: "log" }), P("bis", "bis", "Filter", 60, 1000, 150, "Hz", { skala: "log" })],
  varianten: [V("lang", "von hell nach dunkel", {}), V("kurz", "schneller Fall", { von: 4000, bis: 300 })],
  rechne(w, rate, { dauer = 3, staerke = 0.8, seed = 1 }) {
    const n = Math.round(dauer * rate), [L, R] = bandRauschen(n, rate, seed, (x) => w.von * (w.bis / w.von) ** Math.sqrt(x), 1.2, (x) => Math.min(1, x * 40) * (1 - x) ** 1.6);
    return fertig(L, R, staerke);
  },
};
const einschlag = {
  key: "einschlag", name: "Einschlag", rolle: "geraeusch", pan: 0, pegel: -6,
  parameter: [P("tief", "Tiefe", "Klang", 30, 80, 42, "Hz"), P("nachklang", "Nachklang", "Hülle", 1, 8, 3.5, "s", { skala: "log" }), P("rauschen", "Rauschen", "Klang", 0, 100, 45, "%")],
  varianten: [V("tief", "Kino-Einschlag, langer Nachklang", {}), V("kurz", "trocken, knapp", { nachklang: 1.4, rauschen: 30 }), V("weit", "sehr lang, viel Raum", { nachklang: 7, rauschen: 55 })],
  rechne(w, rate, { dauer = 3, staerke = 0.9, seed = 1 }) {
    const lang = Math.max(dauer, w.nachklang * 1.2), n = Math.round(lang * rate), rnd = zufall(seed), rnd2 = zufall(seed ^ 0x2f), L = new Float32Array(n), R = new Float32Array(n);
    const lp = new SVF().setze(1800, 0.7, rate), lp2 = new SVF().setze(1700, 0.7, rate), tief = new SVF().setze(160, 0.7, rate), tief2 = new SVF().setze(160, 0.7, rate);
    let ph = 0;
    for (let i = 0; i < n; i++) {
      const t = i / rate, f = w.tief + 90 * Math.exp(-t / 0.05), e = Math.exp((-6.9 * t) / w.nachklang);
      ph += (TAU * f) / rate;
      const boom = Math.sin(ph) * Math.exp((-6.9 * t) / (w.nachklang * 0.5)), stoss = Math.exp(-t / 0.015) * 1.2;
      const nl = rnd() * 2 - 1, nr = rnd2() * 2 - 1, r = w.rauschen / 100;
      L[i] = boom + (lp.schritt(nl).tief * stoss + tief.schritt(nl).tief * e * 2.5) * r;
      R[i] = boom + (lp2.schritt(nr).tief * stoss + tief2.schritt(nr).tief * e * 2.5) * r;
    }
    return fertig(L, R, staerke);
  },
};
const rumpeln = {
  key: "rumpeln", name: "Rumpeln", rolle: "geraeusch", pan: 0, pegel: -14,
  parameter: [P("tief", "Farbe", "Filter", 60, 600, 180, "Hz", { skala: "log" }), P("bewegung", "Bewegung", "Filter", 0, 100, 40, "%")],
  varianten: [V("fern", "dunkles Grollen", {}), V("Maschine", "etwas heller, mehr Bewegung", { tief: 320, bewegung: 70 })],
  rechne(w, rate, { dauer = 8, staerke = 0.7, seed = 1 }) {
    const n = Math.round(dauer * rate), b = w.bewegung / 100;
    const [L, R] = bandRauschen(n, rate, seed, (x) => w.tief * (1 + b * 0.6 * Math.sin(TAU * x * 1.7)), 0.8, (x) => Math.sin(Math.PI * x) ** 1.3);
    return fertig(L, R, staerke);
  },
};
const luft = {
  key: "luft", name: "Luft", rolle: "geraeusch", pan: 0, pegel: -20,
  parameter: [P("hell", "Farbe", "Filter", 2000, 14000, 6500, "Hz", { skala: "log" }), P("bewegung", "Bewegung", "Filter", 0, 100, 50, "%")],
  varianten: [V("hell", "breite, helle Luft", {}), V("weich", "dunkler, ruhiger", { hell: 3500, bewegung: 25 })],
  rechne(w, rate, { dauer = 8, staerke = 0.6, seed = 1 }) {
    const n = Math.round(dauer * rate), b = w.bewegung / 100;
    const [L, R] = bandRauschen(n, rate, seed, (x) => w.hell * (1 + b * 0.5 * Math.sin(TAU * x * 0.9 + 1)), 0.5, (x) => glatt(Math.min(1, x * 4)) * glatt(Math.min(1, (1 - x) * 4)));
    return fertig(L, R, staerke);
  },
};

export default {
  id: "geraeusch", version: "0.1.0", name: "Geräusche", melodisch: true,
  beschreibung: "Übergänge aus eigener Synthese: Riser, Fall, Einschlag, Rumpeln, Luft.",
  stimmen: Object.fromEntries([riser, fall, einschlag, rumpeln, luft].map((s) => [s.key, s])),
};
