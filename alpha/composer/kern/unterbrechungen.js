// Unterbrechungen 0.1.0 – Ereignisse, die eine Spur an einer Stelle aufbrechen: Stutter, Tape-Stop, Tape-Start, Gate, Dropout, Echo-Wurf,
// Rückwärts, Filterfahrt, Glitch. Sie wirken auf die Tondaten der Spur, bevor die Plugin-Kette sie bekommt: der Hall einer Spur klingt also
// über ein Dropout hinweg weiter, wie bei einem Mute vor dem Effektweg. Vorschau und Export sind dadurch gleich.
//
// Ein Ereignis: { id, art, takt (Beginn in Takten ab 0, gebrochen: 3.75 = letzte Viertel von Takt 4), schritte (Länge in Sechzehnteln),
//                 alle (0 = einmal, sonst alle n Takte wiederholt), werte: { … }, seed }.
// Werte, die nicht gesetzt sind, bekommen den Standard der Art. Nach der Veröffentlichung nicht mehr verändern; neue Arten in 0.2.0.

import { SVF, zufall } from "../erzeuger/grund.js";

export const UNTERBRECHUNGEN_VERSION = "0.1.0";
const P = (key, name, min, max, std, einheit = "", mehr = {}) => ({ key, name, gruppe: "", min, max, std, einheit, ...mehr });
const TEILUNG = { wahl: [{ wert: 4, name: "Viertel" }, { wert: 8, name: "Achtel" }, { wert: 12, name: "Achteltriolen" }, { wert: 16, name: "Sechzehntel" }, { wert: 24, name: "Triolen 16tel" }, { wert: 32, name: "Zweiunddreissigstel" }] };

export const ARTEN = Object.freeze({
  stutter: { name: "Stutter", hilfe: "das erste Stück wird wiederholt", parameter: [
    { key: "teilung", name: "Teilung", ...TEILUNG, std: 16 }, P("abfall", "leiser werden", 0, 100, 20, "%"), P("steigen", "Tonhöhe steigt", -2, 2, 0, "Halbtöne je Stück", { schritt: 0.1 })] },
  tapestop: { name: "Tape-Stop", hilfe: "das Band bremst bis zum Stillstand", parameter: [P("kurve", "Kurve", 0.3, 3, 1, "", { skala: "log", hilfe: "klein = bremst spät, gross = bremst früh" })] },
  tapestart: { name: "Tape-Start", hilfe: "das Band läuft aus dem Stand an", parameter: [P("kurve", "Kurve", 0.3, 3, 1, "", { skala: "log" })] },
  gate: { name: "Gate", hilfe: "rhythmisch an und aus", parameter: [
    { key: "muster", name: "Muster", wahl: [{ wert: "x.x.x.x.x.x.x.x.", name: "Sechzehntel" }, { wert: "x..x..x.x..x..x.", name: "3-3-2" }, { wert: "xx.xx.x.xx.x.xx.", name: "gebrochen" }, { wert: "x...x...x...x...", name: "Viertel" }, { wert: "x.xx.x.xx.x.x.xx", name: "Trance-Gate" }, { wert: "xxx.xx.x.x..x...", name: "abnehmend" }], std: "x.x.x.x.x.x.x.x." },
    P("tiefe", "Tiefe", 0, 100, 100, "%"), P("kante", "Kante", 0.5, 20, 3, "ms", { skala: "log", hilfe: "Ein- und Ausblenden je Schritt" })] },
  dropout: { name: "Dropout", hilfe: "die Spur fällt weg", parameter: [P("rest", "Rest", 0, 100, 0, "%", { hilfe: "wie viel bleibt" }), P("kante", "Kante", 0.5, 40, 4, "ms", { skala: "log" })] },
  echo: { name: "Echo-Wurf", hilfe: "das erste Stück wird zum Echo, der Rest verstummt", parameter: [
    { key: "zeit", name: "Echo-Zeit", wahl: [{ wert: 8, name: "Achtel" }, { wert: 16 / 3, name: "punktierte Achtel" }, { wert: 4, name: "Viertel" }, { wert: 16, name: "Sechzehntel" }, { wert: 12, name: "Achteltriolen" }], std: 16 / 3 },
    P("rueck", "Rückkopplung", 0, 95, 60, "%"), P("dunkel", "dunkler werden", 0, 100, 50, "%"), P("anteil", "Echo laut", 0, 100, 80, "%")] },
  rueckwaerts: { name: "Rückwärts", hilfe: "das Stück läuft rückwärts", parameter: [P("kante", "Kante", 0.5, 40, 5, "ms", { skala: "log" })] },
  filter: { name: "Filterfahrt", hilfe: "ein Filter fährt über das Stück", parameter: [
    { key: "typ", name: "Filter", wahl: [{ wert: "tief", name: "Tiefpass (zu)" }, { wert: "hoch", name: "Hochpass (dünn)" }, { wert: "band", name: "Bandpass" }], std: "tief" },
    P("von", "von", 40, 20000, 18000, "Hz", { skala: "log" }), P("bis", "bis", 40, 20000, 300, "Hz", { skala: "log" }), P("resonanz", "Resonanz", 0, 100, 30, "%"),
    P("zurueck", "am Ende zurück", 0, 1, 0, "", { schritt: 1, hilfe: "1 = in der zweiten Hälfte wieder zurück" })] },
  glitch: { name: "Glitch", hilfe: "kleine Stücke werden zufällig wiederholt, umgedreht, zerkleinert oder weggelassen", parameter: [
    { key: "teilung", name: "Körnung", ...TEILUNG, std: 32 }, P("dichte", "Dichte", 0, 100, 60, "%"), P("zerkleinern", "Bitcrush", 0, 100, 30, "%")] },
});

/** Vorschläge für den schnellen Zugriff: an das Ende von Takt 4 (oder an die markierte Stelle) */
export const SCHNELL = Object.freeze([
  { name: "Stutter am Taktende", art: "stutter", takt: 3.75, schritte: 4, alle: 4 },
  { name: "Tape-Stop", art: "tapestop", takt: 3.5, schritte: 8, alle: 0 },
  { name: "Gate", art: "gate", takt: 2, schritte: 16, alle: 0 },
  { name: "Echo-Wurf", art: "echo", takt: 3.5, schritte: 8, alle: 4 },
  { name: "Dropout", art: "dropout", takt: 3, schritte: 16, alle: 0 },
  { name: "Rückwärts", art: "rueckwaerts", takt: 3.5, schritte: 8, alle: 0 },
  { name: "Filter zu", art: "filter", takt: 2, schritte: 32, alle: 0 },
  { name: "Glitch", art: "glitch", takt: 3.5, schritte: 8, alle: 4 },
]);

export const werteVon = (e) => ({ ...Object.fromEntries(ARTEN[e.art].parameter.map((p) => [p.key, p.std])), ...(e.werte ?? {}) });

/**
 * Ereignisse auf eine Kopie der Spur anwenden. tempo: { bpm, beginn (s der ersten Eins) }. Gibt neue Kanäle zurück (die Quelle bleibt).
 * Die Ereignisse wirken in der Reihenfolge ihres Beginns; ein Stück liest immer aus dem schon veränderten Stand davor (so lässt sich
 * ein Gate auf ein Stutter legen).
 */
export function anwenden(quelle, rate, ereignisse, tempo) {
  const k = quelle.map((s) => Float32Array.from(s));
  if (!ereignisse?.length) return k;
  const takt = (60 / tempo.bpm) * 4, n = k[0].length, laengeTakte = (n / rate - (tempo.beginn ?? 0)) / takt;
  const stellen = [];
  for (const e of ereignisse) {
    if (!ARTEN[e.art] || e.aus) continue;
    const wdh = e.alle > 0 ? Math.max(1, Math.ceil((laengeTakte - e.takt) / e.alle)) : 1;
    for (let r = 0; r < wdh; r++) stellen.push({ e, takt: e.takt + r * (e.alle || 0), r });
  }
  stellen.sort((a, b) => a.takt - b.takt);
  for (const { e, takt: t, r } of stellen) {
    const a = Math.round(((tempo.beginn ?? 0) + t * takt) * rate), len = Math.round((e.schritte / 16) * takt * rate), b = Math.min(n, a + len);
    if (a < 0 || a >= n || b - a < 16) continue;
    WIRKUNG[e.art](k, a, b, rate, werteVon(e), { takt, seed: (e.seed ?? 1) + r * 7919 });
  }
  return k;
}

/** weiche Kanten an einem Abschnitt: x(i) für i in [a, b) wird mit einer Rampe von 0 bzw. zu 0 multipliziert */
function rampe(k, a, b, ein) { const m = b - a; if (m <= 0) return; for (const s of k) for (let i = 0; i < m; i++) s[a + i] *= ein ? i / m : 1 - i / m; }
const kante = (ms, rate) => Math.max(8, Math.round((ms / 1000) * rate));
/** linear interpoliert lesen */
const lies = (s, x) => { const i = Math.floor(x), f = x - i; return i < 0 || i + 1 >= s.length ? 0 : s[i] * (1 - f) + s[i + 1] * f; };

const WIRKUNG = {
  stutter(k, a, b, rate, w, { takt }) {
    const st = Math.max(32, Math.round((takt / w.teilung) * rate)), quelle = k.map((s) => s.slice(a, a + st)), ra = Math.min(64, st >> 3);
    for (let o = a, j = 0; o < b; o += st, j++) {
      const g = (1 - w.abfall / 100) ** j, faktor = 2 ** ((w.steigen * j) / 12);
      for (let c = 0; c < k.length; c++) for (let i = 0; i < st && o + i < b; i++) {
        const e = Math.min(1, i / ra, (st - i) / ra);
        k[c][o + i] = lies(quelle[c], i * faktor) * g * e;
      }
    }
  },
  tapestop(k, a, b, rate, w) {
    const m = b - a, quelle = k.map((s) => s.slice(a, b)), out = k.map(() => new Float32Array(m));
    let pos = 0;
    for (let i = 0; i < m; i++) {
      const v = Math.max(0, 1 - (i / m)) ** w.kurve;
      for (let c = 0; c < k.length; c++) out[c][i] = lies(quelle[c], pos) * Math.min(1, v * 3);   // je langsamer, desto leiser, wie ein auslaufendes Band
      pos += v;
    }
    for (let c = 0; c < k.length; c++) k[c].set(out[c], a);
    rampe(k, b - Math.max(16, Math.round(m * 0.03)), b, false);
  },
  tapestart(k, a, b, rate, w) {
    const m = b - a, quelle = k.map((s) => s.slice(a, b)), out = k.map(() => new Float32Array(m));
    // so anlaufen, dass am Ende wieder die richtige Stelle erreicht ist: Geschwindigkeit (i/m)^kurve, Weg ab Ende zurückgerechnet
    let weg = 0; for (let i = 0; i < m; i++) weg += (i / m) ** w.kurve;
    let pos = m - weg;
    for (let i = 0; i < m; i++) { const v = (i / m) ** w.kurve; for (let c = 0; c < k.length; c++) out[c][i] = lies(quelle[c], pos) * Math.min(1, v * 8); pos += v; }
    for (let c = 0; c < k.length; c++) k[c].set(out[c], a);
  },
  gate(k, a, b, rate, w, { takt }) {
    const st = (takt / 16) * rate, kn = kante(w.kante, rate), tiefe = w.tiefe / 100, mu = String(w.muster);
    for (let i = a; i < b; i++) {
      const p = (i - a) / st, s = Math.floor(p), auf = mu[s % mu.length] === "x", pin = (p - s) * st;
      let g = auf ? Math.min(1, pin / kn, (st - pin) / kn) : 0;
      g = 1 - tiefe + tiefe * Math.max(0, g);
      for (const c of k) c[i] *= g;
    }
  },
  dropout(k, a, b, rate, w) {
    const kn = Math.min(kante(w.kante, rate), (b - a) >> 2), rest = w.rest / 100;
    for (let i = a; i < b; i++) { const e = Math.min(1, (i - a) / kn, (b - i) / kn), g = 1 - (1 - rest) * e; for (const c of k) c[i] *= g; }
  },
  echo(k, a, b, rate, w, { takt }) {
    const d = Math.max(64, Math.round((takt / w.zeit) * rate)), fb = w.rueck / 100, ant = w.anteil / 100, kn = 32;
    const stueck = k.map((s) => s.slice(a, Math.min(b, a + d)));
    rampe(stueck, stueck[0].length - kn, stueck[0].length, false);
    const lp = k.map(() => new SVF().setze(18000 * (1 - 0.85 * (w.dunkel / 100)) + 600, 0.6, rate));
    for (let c = 0; c < k.length; c++) for (let i = a + stueck[c].length; i < b; i++) k[c][i] = 0;   // trocken verstummt nach dem ersten Stück
    for (let wdh = 1, g = ant; a + wdh * d < b && g > 0.002; wdh++, g *= fb) {
      for (let c = 0; c < k.length; c++) { for (let i = 0; i < stueck[c].length; i++) stueck[c][i] = lp[c].schritt(stueck[c][i]).tief; for (let i = 0; i < stueck[c].length && a + wdh * d + i < b; i++) k[c][a + wdh * d + i] += stueck[c][i] * g; }
    }
    rampe(k, Math.max(a, b - 64), b, false);
  },
  rueckwaerts(k, a, b, rate, w) {
    for (const s of k) s.subarray(a, b).reverse();
    const kn = Math.min(kante(w.kante, rate), (b - a) >> 2);
    rampe(k, a, a + kn, true); rampe(k, b - kn, b, false);
  },
  filter(k, a, b, rate, w) {
    const f = k.map(() => new SVF()), q = 0.6 + 6 * (w.resonanz / 100), m = b - a, aus = Math.min(m, 256);
    for (let i = 0; i < m; i++) {
      let u = i / m; if (w.zurueck) u = u < 0.5 ? u * 2 : (1 - u) * 2;
      if (i % 16 === 0) { const fc = w.von * (w.bis / w.von) ** u; f.forEach((x) => x.setze(fc, q, rate)); }
      // am Ende in den ungefilterten Klang überblenden, damit die Spur danach ohne Sprung weitergeht
      const mix = !w.zurueck && i > m - aus ? (m - i) / aus : 1;
      for (let c = 0; c < k.length; c++) { const x = k[c][a + i], y = f[c].schritt(x)[w.typ]; k[c][a + i] = y * mix + x * (1 - mix); }
    }
  },
  glitch(k, a, b, rate, w, { takt, seed }) {
    const rnd = zufall(seed), st = Math.max(32, Math.round((takt / w.teilung) * rate)), ra = 24, dichte = w.dichte / 100, crush = w.zerkleinern / 100;
    const quelle = k.map((s) => s.slice(a, b));
    let vorig = 0;
    for (let o = 0; o < b - a; o += st) {
      if (rnd() > dichte) { vorig = o; continue; }
      const wahl = rnd(), m = Math.min(st, b - a - o);
      for (let c = 0; c < k.length; c++) for (let i = 0; i < m; i++) {
        let x;
        if (wahl < 0.35) x = quelle[c][vorig + i] ?? 0;                     // wiederholen
        else if (wahl < 0.55) x = quelle[c][o + m - 1 - i];                 // umdrehen
        else if (wahl < 0.7) x = 0;                                          // weglassen
        else if (wahl < 0.85) x = lies(quelle[c], o + i * 2);                // eine Oktave höher (doppelt so schnell)
        else x = quelle[c][o + i];
        if (crush > 0 && wahl > 0.5) { const stufen = 2 ** (12 - 9 * crush); x = Math.round(x * stufen) / stufen; }
        const e = Math.min(1, i / ra, (m - i) / ra);
        k[c][a + o + i] = x * e;
      }
      if (wahl >= 0.35) vorig = o;
    }
  },
};
