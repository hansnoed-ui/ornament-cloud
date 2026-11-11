// Drums 0.2.0 (ornament.bienne, Phase 3, Schritt c) – alle Stimmen aus Drums 0.1.0 unverändert (dieselben Objekte), dazu drei akustische
// Stimmen für Art-Rock, Jazz und Kammermusik. Eigene Synthese, keine Samples:
//   fell    akustische Snare mit Ghost-Stufen: leise Schläge sind nicht nur leiser, sondern anders – weniger Fell, mehr Teppich, kürzer;
//           Artikulationen Schlag, Ghost und Rand. Die Stufen kommen aus den Musterzeilen (g1 g2 g3, siehe kern/muster.js).
//   kreuz   Cross-Stick: der Stock liegt quer über dem Fell und schlägt auf den Rand – Holzklick und der hohle Kessel darunter
//   besen   Besen auf der Snare: «x» Schlag (Fächer trifft das Fell), «wisch» Wischen (das Rauschen schwillt an und ab, eine Zählzeit lang)
// Nach der Veröffentlichung nicht mehr verändern; neue Klänge in drums-0.3.0.js.

import drums010 from "./drums-0.1.0.js";
import { zufall, SVF, moden, rauschen, spitze, stereo, saettige } from "./grund.js";

const P = (key, name, gruppe, min, max, std, einheit = "", mehr = {}) => ({ key, name, gruppe, min, max, std, einheit, ...mehr });
const V = (name, beschreibung, werte) => ({ name, beschreibung, werte });
function fertig(kanaele, staerke) {
  const m = spitze(...kanaele) || 1, g = (0.95 * Math.max(0, Math.min(1.2, staerke))) / m, n = kanaele[0].length, aus = Math.min(n, 240);
  for (const s of kanaele) { for (let i = 0; i < n; i++) s[i] *= g; for (let i = 0; i < aus; i++) s[n - 1 - i] *= i / aus; }
  return kanaele;
}

// ---------- akustische Snare mit Ghost-Stufen ----------
const fell = {
  key: "fell", name: "Snare akustisch", rolle: "drums", pan: 0, pegel: -2,
  parameter: [
    P("ton", "Fell", "Körper", 150, 350, 210, "Hz", { skala: "log" }),
    P("koerper", "Körper-Länge", "Körper", 40, 400, 150, "ms", { skala: "log" }),
    P("teppich", "Teppich", "Teppich", 0, 100, 60, "%"),
    P("teppichLaenge", "Teppich-Länge", "Teppich", 60, 600, 240, "ms", { skala: "log" }),
    P("hell", "Farbe", "Teppich", 2000, 10000, 4800, "Hz", { skala: "log" }),
    P("raum", "Kessel", "Körper", 0, 100, 40, "%", { hilfe: "Resonanz des Holzkessels" }),
    P("ghost", "Ghost-Charakter", "Anschlag", 0, 100, 70, "%", { hilfe: "wie stark leise Schläge zum Teppich-Wispern werden" }),
  ],
  artikulationen: [{ key: "x", name: "Schlag" }, { key: "rand", name: "Rand (Rimshot)" }],
  varianten: [
    V("Jazz", "mittel gestimmt, offen, viel Teppich", {}),
    V("trocken", "abgeklebt, kurz, Art-Rock", { koerper: 80, teppichLaenge: 130, raum: 15, hell: 4000 }),
    V("hoch", "hoch gestimmt, knackig, lange Ghosts", { ton: 290, koerper: 120, teppich: 70, hell: 6500, ghost: 85 }),
    V("tief offen", "tief, viel Kessel", { ton: 165, koerper: 260, raum: 70, teppichLaenge: 380, hell: 3500 }),
    V("Piccolo", "sehr hoch, kurz, hell", { ton: 340, koerper: 70, teppich: 55, teppichLaenge: 160, hell: 8000, raum: 20 }),
    V("Teppich los", "Spiralen locker: lang schnarrend, weiche Ghosts", { teppich: 95, teppichLaenge: 520, hell: 4200, ghost: 95 }),
  ],
  rechne(w, rate, { art = "x", staerke = 1, seed = 1 }) {
    const rnd = zufall(seed), rnd2 = zufall(seed ^ 0x2545f491), rand = art === "rand";
    // Ghost-Grad: 0 bei vollem Schlag, 1 bei ganz leisem; er verschiebt den Klang, nicht nur den Pegel
    const g = Math.max(0, Math.min(1, (0.55 - staerke) / 0.4)) * (w.ghost / 100), h = 0.55 + 0.45 * Math.min(1, staerke);
    const k = (w.koerper / 1000) * (1 - 0.55 * g), tl = (w.teppichLaenge / 1000) * (1 - 0.35 * g);
    const n = Math.ceil((Math.max(k, tl) * 1.35 + 0.03) * rate), mitte = new Float32Array(n), seite = new Float32Array(n);
    const fk = 1 - 0.7 * g;
    moden(mitte, rate, [{ f: w.ton, a: fk, t60: k }, { f: w.ton * 1.59, a: 0.5 * fk, t60: k * 0.6 }, { f: w.ton * 2.14, a: 0.3 * fk, t60: k * 0.45 }, { f: w.ton * 2.92, a: 0.15 * fk, t60: k * 0.3 }],
      { gleiten: -1.5, gleitZeit: 0.01, anschlag: (rand ? 0.0002 : 0.0007) / h });
    const tp = (w.teppich / 100) * (1.2 + 0.8 * g);
    rauschen(mitte, rate, rnd, { staerke: tp, t60: tl, auf: 0.0012 + 0.002 * g, art: "hoch", f: w.hell * (0.4 + 0.15 * g) * h, q: 0.6, f2: w.hell * 1.5, art2: "tief" });
    rauschen(seite, rate, rnd2, { staerke: tp * 0.6, t60: tl, auf: 0.0015, art: "hoch", f: w.hell * 0.5, q: 0.6 });
    if (!g || rand) rauschen(mitte, rate, rnd, { staerke: (rand ? 1.4 : 0.6) * h, t60: 0.01, auf: 0.0002, art: "band", f: 2600 * h, q: 0.8 });
    if (rand) moden(mitte, rate, [{ f: 760, a: 0.7, t60: 0.07 }, { f: 1650, a: 0.45, t60: 0.05 }], { anschlag: 0.0002 });
    if (w.raum > 0) { const kessel = new SVF().setze(w.ton * 0.62, 6, rate), rr = (w.raum / 100) * 0.6; for (let i = 0; i < n; i++) mitte[i] += kessel.schritt(mitte[i]).band * rr; }
    return fertig(stereo(saettige(mitte, 3), seite, 0.35), staerke);
  },
};

// ---------- Cross-Stick ----------
const kreuz = {
  key: "kreuz", name: "Cross-Stick", rolle: "drums", pan: -0.05, pegel: -6,
  parameter: [
    P("holz", "Holz", "Klang", 1000, 4000, 2100, "Hz", { skala: "log", hilfe: "Klick des Stocks auf dem Rand" }),
    P("kessel", "Kessel", "Klang", 250, 700, 420, "Hz", { skala: "log", hilfe: "der hohle Ton darunter" }),
    P("laenge", "Länge", "Hülle", 20, 250, 90, "ms", { skala: "log" }),
    P("hohl", "Hohl", "Klang", 0, 100, 55, "%", { hilfe: "Anteil des Kessels gegenüber dem Klick" }),
    P("teppich", "Teppich", "Klang", 0, 100, 15, "%", { hilfe: "leises Mitschnarren" }),
  ],
  artikulationen: [{ key: "x", name: "Schlag" }],
  varianten: [
    V("Holz", "warm, hohl, Bossa und Ballade", {}),
    V("hell", "trockener Klick, wenig Kessel", { holz: 3000, hohl: 25, laenge: 50 }),
    V("tief", "tief und rund", { kessel: 320, hohl: 75, laenge: 140, holz: 1500 }),
    V("trocken", "kurz, fast nur Klick", { hohl: 15, laenge: 30, holz: 2600 }),
    V("schnarrend", "mit lockerem Teppich", { teppich: 60, laenge: 120 }),
    V("hoch", "hoch gestimmter Kessel", { kessel: 640, holz: 3400, hohl: 50, laenge: 70 }),
  ],
  rechne(w, rate, { staerke = 1, seed = 1 }) {
    const rnd = zufall(seed), L = w.laenge / 1000, s = new Float32Array(Math.ceil((L * 1.4 + 0.03) * rate)), ho = w.hohl / 100;
    moden(s, rate, [{ f: w.holz, a: 1 - 0.5 * ho, t60: L * 0.35 }, { f: w.holz * 1.53, a: 0.5 * (1 - 0.5 * ho), t60: L * 0.25 }, { f: w.holz * 2.31, a: 0.25, t60: L * 0.18 }], { anschlag: 0.00015 });
    moden(s, rate, [{ f: w.kessel, a: 0.9 * ho, t60: L }, { f: w.kessel * 1.71, a: 0.45 * ho, t60: L * 0.6 }], { anschlag: 0.0004 });
    rauschen(s, rate, rnd, { staerke: 0.9 * (0.6 + 0.4 * staerke), t60: 0.003, auf: 0.0001, art: "band", f: w.holz * 1.4, q: 0.9 });
    if (w.teppich > 0) rauschen(s, rate, rnd, { staerke: (w.teppich / 100) * 0.4, t60: L * 1.2, auf: 0.002, art: "hoch", f: 3500, q: 0.6 });
    return fertig(stereo(s), staerke);
  },
};

// ---------- Besen ----------
const besen = {
  key: "besen", name: "Besen", rolle: "drums", pan: 0, pegel: -4,
  parameter: [
    P("hell", "Farbe", "Klang", 1500, 9000, 3800, "Hz", { skala: "log" }),
    P("fell", "Fell", "Klang", 0, 100, 35, "%", { hilfe: "wie viel Fellton beim Schlag mitklingt" }),
    P("schlag", "Schlag-Länge", "Hülle", 40, 400, 140, "ms", { skala: "log" }),
    P("wischen", "Wisch-Länge", "Hülle", 150, 1500, 520, "ms", { skala: "log", hilfe: "Dauer eines Wischers (etwa eine Zählzeit)" }),
    P("rau", "Rauheit", "Klang", 0, 100, 40, "%", { hilfe: "die einzelnen Borsten: körnig statt glatt" }),
  ],
  artikulationen: [{ key: "x", name: "Schlag" }, { key: "wisch", name: "Wischen" }],
  varianten: [
    V("Jazz", "weich, mittlere Wischer", {}),
    V("hell", "luftig, lange Wischer", { hell: 5500, wischen: 800, fell: 20 }),
    V("dunkel", "warm, mehr Fell", { hell: 2600, fell: 60, rau: 25 }),
    V("körnig", "einzelne Borsten hörbar", { rau: 85, hell: 4200 }),
    V("kurz", "knappe Schläge und Wischer", { schlag: 70, wischen: 260 }),
    V("Ballade", "sehr weich, lange Wischer", { hell: 3000, wischen: 1100, fell: 45, rau: 20, schlag: 220 }),
  ],
  rechne(w, rate, { art = "x", staerke = 1, seed = 1 }) {
    const rnd = zufall(seed), rnd2 = zufall(seed ^ 0x68e31da4), wisch = art === "wisch";
    const dauer = (wisch ? w.wischen : w.schlag) / 1000, n = Math.ceil((dauer * 1.3 + 0.03) * rate), mitte = new Float32Array(n), seite = new Float32Array(n);
    const bp = new SVF().setze(w.hell, 0.8, rate), bp2 = new SVF().setze(w.hell * 1.1, 0.8, rate), hp = new SVF().setze(700, 0.7, rate), hp2 = new SVF().setze(700, 0.7, rate);
    const rau = w.rau / 100;
    for (let i = 0; i < n; i++) {
      const t = i / rate, x = t / dauer;
      // Schlag: schneller Anstieg, Abklingen; Wischer: weich an- und abschwellend, mit kleiner Bewegung in der Farbe
      const e = wisch ? Math.sin(Math.PI * Math.min(1, x)) ** 1.5 * (x < 1 ? 1 : 0) : Math.min(1, t / 0.002) * Math.exp((-6.9 * t) / dauer);
      const korn = 1 - rau + rau * (rnd() < 0.35 ? 1.6 : 0.6);
      mitte[i] = hp.schritt(bp.schritt(rnd() * 2 - 1).band).hoch * e * korn;
      seite[i] = hp2.schritt(bp2.schritt(rnd2() * 2 - 1).band).hoch * e * korn;
    }
    if (!wisch && w.fell > 0) moden(mitte, rate, [{ f: 200, a: (w.fell / 100) * 0.25, t60: 0.12 }, { f: 318, a: (w.fell / 100) * 0.12, t60: 0.08 }], { anschlag: 0.002 });
    return fertig(stereo(mitte, seite, wisch ? 0.6 : 0.35), staerke * (wisch ? 0.7 : 1));
  },
};

export default {
  id: "drums", version: "0.2.0", name: "Drums",
  beschreibung: "Drums 0.1.0 und neu akustische Snare mit Ghost-Stufen, Cross-Stick und Besen (Schlag und Wischen).",
  stimmen: { ...drums010.stimmen, fell, kreuz, besen },
};
