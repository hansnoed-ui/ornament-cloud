// Drums 0.1.0 – elektronische Schlagzeugstimmen aus eigener Synthese: Kick, Snare, Clap, Hi-Hat (geschlossen, offen), Rim, Tom, Shaker, Ride.
// Ziel: fett und modern, auf der Höhe von Drum and Bass, Hip-Hop, Pop, Minimal, Goa und House. Vorbilder nur für das Verhalten:
// Sinus mit Tonhöhensturz für die Kick (wie analoge Bassdrum-Schaltungen), Fellmoden plus Teppichrauschen für die Snare, mehrere
// Rauschstösse für die Clap, sechs Rechteckschwingungen in unharmonischen Abständen für Metall. Kein fremder Code, keine Samples.
//
// Jede Stimme: { key, name, rolle, parameter, artikulationen, varianten, rechne(werte, rate, { art, staerke, seed }) → [L, R] }.
// Jeder Schlag wird auf eine Spitze von 0,95 × Stärke gebracht: Parameter verändern die Klangfarbe, nicht die Lautstärke (so bleibt der
// Vergleich ehrlich). Nach der Veröffentlichung nicht mehr verändern; neue Klänge in drums-0.2.0.js.

import { zufall, SVF, Rechteck, saettige, moden, rauschen, spitze, stereo, TAU } from "./grund.js";

const P = (key, name, gruppe, min, max, std, einheit = "", mehr = {}) => ({ key, name, gruppe, min, max, std, einheit, ...mehr });
const V = (name, beschreibung, werte) => ({ name, beschreibung, werte });

/** auf Spitze 0,95 × Stärke bringen, Ende 5 ms ausblenden */
function fertig(kanaele, staerke) {
  const m = spitze(...kanaele) || 1, g = (0.95 * Math.max(0, Math.min(1.2, staerke))) / m, n = kanaele[0].length, aus = Math.min(n, 240);
  for (const s of kanaele) { for (let i = 0; i < n; i++) s[i] *= g; for (let i = 0; i < aus; i++) s[n - 1 - i] *= i / aus; }
  return kanaele;
}
/** die Anschlagstärke macht leise Schläge etwas dunkler und weicher, wie bei echten Instrumenten */
const hell = (staerke) => 0.55 + 0.45 * Math.min(1, staerke);

// ---------- Kick ----------
const kick = {
  key: "kick", name: "Kick", rolle: "drums", pan: 0, pegel: 0,
  parameter: [
    P("tief", "Grundton", "Ton", 30, 100, 50, "Hz", { skala: "log", hilfe: "wohin die Tonhöhe fällt: der Bauch" }),
    P("hoch", "Start", "Ton", 80, 800, 300, "Hz", { skala: "log", hilfe: "wo die Tonhöhe beginnt: der Schlag" }),
    P("sturz", "Sturz", "Ton", 3, 150, 28, "ms", { skala: "log", hilfe: "wie schnell die Tonhöhe fällt; kurz = Punch, lang = Wumm" }),
    P("gleiten", "Gleiten", "Ton", -12, 0, 0, "Halbtöne", { schritt: 0.1, hilfe: "der Ton sinkt über die ganze Länge (808)" }),
    P("halten", "Halten", "Hülle", 0, 300, 30, "ms", { hilfe: "volle Lautstärke, bevor das Abklingen beginnt: Fett" }),
    P("laenge", "Länge", "Hülle", 60, 2500, 420, "ms", { skala: "log", hilfe: "Abklingen auf −60 dB" }),
    P("biss", "Biss", "Hülle", 0, 100, 0, "%", { hilfe: "Startphase der Schwingung: mehr Biss = härterer erster Ausschlag" }),
    P("sub", "Sub", "Ton", 0, 100, 0, "%", { hilfe: "reiner Sinus auf dem Grundton dazu, ohne Sturz" }),
    P("klick", "Klick", "Anschlag", 0, 100, 35, "%"),
    P("klickHell", "Klick-Farbe", "Anschlag", 1500, 12000, 4500, "Hz", { skala: "log" }),
    P("antrieb", "Antrieb", "Farbe", 0, 24, 5, "dB", { schritt: 0.1, hilfe: "Sättigung: Obertöne, mehr Präsenz auf kleinen Lautsprechern" }),
  ],
  artikulationen: [{ key: "x", name: "Schlag" }],
  varianten: [
    V("Pop", "rund, mittel lang", {}),
    V("DnB", "kurz und hart, viel Klick, gesättigt", { tief: 52, hoch: 260, sturz: 22, halten: 10, laenge: 260, klick: 55, klickHell: 5500, antrieb: 9, biss: 30 }),
    V("Boom Bap", "weich, dumpfer Klick, etwas Sub", { tief: 55, hoch: 180, sturz: 40, halten: 25, laenge: 380, klick: 25, klickHell: 2500, antrieb: 6, sub: 10 }),
    V("808 lang", "langer Sub, sinkt ab", { tief: 45, hoch: 120, sturz: 60, halten: 40, laenge: 1600, klick: 10, antrieb: 8, gleiten: -2, sub: 40 }),
    V("House 909", "schneller Sturz, Biss", { tief: 50, hoch: 340, sturz: 26, halten: 30, laenge: 420, klick: 45, klickHell: 3500, antrieb: 7, biss: 20 }),
    V("Minimal", "trocken und klickend", { tief: 48, hoch: 240, sturz: 14, halten: 5, laenge: 210, klick: 60, klickHell: 7000, antrieb: 3 }),
    V("Goa", "kurz, knallend, stark gesättigt", { tief: 46, hoch: 420, sturz: 11, halten: 18, laenge: 230, klick: 70, klickHell: 4000, antrieb: 12, biss: 50 }),
  ],
  rechne(w, rate, { staerke = 1, seed = 1 }) {
    const rnd = zufall(seed), h = hell(staerke), halten = w.halten / 1000, laenge = w.laenge / 1000, tau = w.sturz / 1000;
    const n = Math.ceil((halten + laenge * 1.2 + 0.02) * rate), s = new Float32Array(n);
    const hoch = w.tief + (w.hoch - w.tief) * (0.6 + 0.4 * h), dauer = halten + laenge;
    let ph = (w.biss / 100) * (Math.PI / 2), phSub = 0;
    for (let i = 0; i < n; i++) {
      const t = i / rate, unten = w.tief * 2 ** ((w.gleiten * Math.min(1, t / dauer)) / 12);
      const f = unten + (hoch - w.tief) * Math.exp(-t / tau);
      const e = t < halten ? 1 : Math.exp((-6.907755 * (t - halten)) / laenge);
      const eSub = Math.min(1, t / 0.006) * (t < halten ? 1 : Math.exp((-6.907755 * (t - halten)) / (laenge * 1.15)));
      s[i] = Math.sin(ph) * e + (w.sub / 100) * 0.8 * Math.sin(phSub) * eSub;
      ph += (TAU * f) / rate; phSub += (TAU * unten) / rate;
    }
    if (w.klick > 0) {
      rauschen(s, rate, rnd, { staerke: (w.klick / 100) * 0.9 * h, t60: 0.006, auf: 0.0002, art: "band", f: w.klickHell * h, q: 0.9 });
      s[0] += (w.klick / 100) * 0.5 * h; s[1] -= (w.klick / 100) * 0.25 * h;
    }
    saettige(s, w.antrieb);
    return fertig(stereo(s), staerke);
  },
};

// ---------- Snare ----------
const snare = {
  key: "snare", name: "Snare", rolle: "drums", pan: 0, pegel: -1,
  parameter: [
    P("ton", "Fell", "Körper", 120, 400, 185, "Hz", { skala: "log" }),
    P("spannung", "Spannung", "Körper", 0, 12, 4, "Halbtöne", { schritt: 0.1, hilfe: "der Ton beginnt höher und fällt: Snap" }),
    P("koerper", "Körper-Länge", "Körper", 30, 500, 170, "ms", { skala: "log" }),
    P("teppich", "Teppich", "Teppich", 0, 100, 65, "%", { hilfe: "Rauschen der Spiralen unter dem Fell" }),
    P("teppichLaenge", "Teppich-Länge", "Teppich", 40, 800, 320, "ms", { skala: "log" }),
    P("hell", "Teppich-Farbe", "Teppich", 1500, 12000, 5000, "Hz", { skala: "log" }),
    P("knack", "Knack", "Anschlag", 0, 100, 45, "%", { hilfe: "der harte Anfang: Crack" }),
    P("antrieb", "Antrieb", "Farbe", 0, 24, 6, "dB", { schritt: 0.1 }),
    P("breite", "Breite", "Farbe", 0, 100, 35, "%", { hilfe: "Teppich in Stereo" }),
  ],
  artikulationen: [{ key: "x", name: "Schlag" }, { key: "rand", name: "Rand (Rimshot)" }],
  varianten: [
    V("Pop", "ausgewogen", {}),
    V("DnB Crack", "hoch gestimmt, harter Knack, gesättigt", { ton: 210, spannung: 7, koerper: 130, teppich: 70, teppichLaenge: 280, hell: 5500, knack: 75, antrieb: 10 }),
    V("Boom Bap", "dunkler, mehr Körper", { ton: 175, spannung: 3, koerper: 200, teppich: 55, teppichLaenge: 340, hell: 3500, knack: 40, antrieb: 7 }),
    V("gross", "lang und breit für Pop und Halftime", { ton: 160, spannung: 5, koerper: 300, teppich: 70, teppichLaenge: 560, hell: 4000, knack: 55, antrieb: 8, breite: 60 }),
    V("House 909", "kurzer Ton, viel Rauschen", { ton: 230, spannung: 6, koerper: 110, teppich: 80, teppichLaenge: 330, hell: 6500, knack: 35, antrieb: 4 }),
    V("Minimal", "trocken, hell, kurz", { ton: 260, spannung: 2, koerper: 60, teppich: 50, teppichLaenge: 90, hell: 7000, knack: 60, antrieb: 2 }),
  ],
  rechne(w, rate, { art = "x", staerke = 1, seed = 1 }) {
    const rnd = zufall(seed), rnd2 = zufall(seed ^ 0x5bd1e995), h = hell(staerke), rand = art === "rand";
    const n = Math.ceil((Math.max(w.koerper, w.teppichLaenge) / 1000) * 1.3 * rate + 0.02 * rate), mitte = new Float32Array(n), seite = new Float32Array(n);
    const k = w.koerper / 1000, f0 = w.ton * 2 ** (w.spannung / 12);
    moden(mitte, rate, [{ f: f0, a: 1, t60: k }, { f: f0 * 1.59, a: 0.55, t60: k * 0.6 }, { f: f0 * 2.14, a: 0.32, t60: k * 0.45 }, { f: f0 * 2.65, a: 0.2, t60: k * 0.35 }],
      { gleiten: -w.spannung, gleitZeit: 0.012, anschlag: rand ? 0.0002 : 0.0006 / h });
    const tl = w.teppichLaenge / 1000, tp = (w.teppich / 100) * 1.4 * (rand ? 0.7 : 1);
    rauschen(mitte, rate, rnd, { staerke: tp, t60: tl, auf: 0.0008, art: "hoch", f: w.hell * 0.45 * h, q: 0.6, f2: w.hell * 1.6, art2: "tief" });
    rauschen(mitte, rate, rnd, { staerke: tp * 0.5, t60: tl * 0.6, auf: 0.0008, art: "band", f: w.hell * 0.6, q: 1.2 });
    if (w.breite > 0) rauschen(seite, rate, rnd2, { staerke: tp * 0.8, t60: tl, auf: 0.001, art: "hoch", f: w.hell * 0.5, q: 0.6 });
    const kn = (w.knack / 100) * (rand ? 1.6 : 1);
    if (kn > 0) {
      rauschen(mitte, rate, rnd, { staerke: kn * 1.2 * h, t60: 0.012, auf: 0.0002, art: "band", f: 2200 * h, q: 0.8 });
      if (rand) moden(mitte, rate, [{ f: 820, a: 0.8, t60: 0.06 }, { f: 1730, a: 0.5, t60: 0.04 }], { anschlag: 0.0002 });
    }
    saettige(mitte, w.antrieb);
    return fertig(stereo(mitte, seite, w.breite / 100), staerke);
  },
};

// ---------- Clap ----------
const clap = {
  key: "clap", name: "Clap", rolle: "drums", pan: 0, pegel: -3,
  parameter: [
    P("schlaege", "Stösse", "Hände", 1, 6, 4, "", { schritt: 1, hilfe: "wie viele Hände: einzelne Stösse vor dem Schwanz" }),
    P("abstand", "Abstand", "Hände", 3, 25, 10, "ms", { schritt: 0.1 }),
    P("hell", "Farbe", "Klang", 600, 4000, 1300, "Hz", { skala: "log" }),
    P("q", "Enge", "Klang", 0.4, 4, 1.4, "", { skala: "log", hilfe: "schmal = hohl und nasal, breit = Rauschen" }),
    P("schwanz", "Schwanz", "Klang", 40, 1200, 260, "ms", { skala: "log" }),
    P("raum", "Raumrest", "Klang", 0, 100, 25, "%", { hilfe: "ein dunkler, langer Rest wie in einem kleinen Raum" }),
    P("breite", "Breite", "Farbe", 0, 100, 60, "%", { hilfe: "links und rechts klatschen leicht versetzt" }),
    P("antrieb", "Antrieb", "Farbe", 0, 24, 4, "dB", { schritt: 0.1 }),
  ],
  artikulationen: [{ key: "x", name: "Klatsch" }],
  varianten: [
    V("909", "klassisch, vier Stösse", {}),
    V("808", "weicher, länger", { schlaege: 3, abstand: 11, hell: 1000, q: 1, schwanz: 380 }),
    V("dicht", "viele Hände", { schlaege: 6, abstand: 5, hell: 1500, q: 1.6, schwanz: 180, breite: 80 }),
    V("Minimal", "kurz und trocken", { schlaege: 3, abstand: 7, hell: 1800, q: 2, schwanz: 110, raum: 0 }),
    V("Raum gross", "mit langem Rest", { schlaege: 4, abstand: 12, hell: 1100, q: 1.1, schwanz: 650, raum: 75 }),
    V("Goa hell", "schmal und hoch", { schlaege: 4, abstand: 8, hell: 2600, q: 2.2, schwanz: 160, antrieb: 8 }),
  ],
  rechne(w, rate, { staerke = 1, seed = 1 }) {
    const schwanz = w.schwanz / 1000, n = Math.ceil(((w.schlaege * w.abstand) / 1000 + schwanz * 1.3 + (w.raum ? 0.6 : 0) + 0.02) * rate);
    const seiten = [0, 1].map((c) => {
      const rnd = zufall(seed * 2 + c + 11), s = new Float32Array(n), versatz = (c ? 1 : -1) * (w.breite / 100) * 0.0012;
      for (let k = 0; k < w.schlaege; k++) {
        const t = Math.max(0, (k * w.abstand) / 1000 * (1 + 0.18 * (rnd() - 0.5)) + (k ? versatz * rnd() : 0)), letzt = k === w.schlaege - 1;
        rauschen(s, rate, rnd, { staerke: (letzt ? 1 : 0.85) * (0.9 + 0.2 * rnd()), t60: letzt ? schwanz : 0.009, auf: 0.0003, art: "band", f: w.hell * hell(staerke), q: w.q, start: Math.round(t * rate) });
      }
      if (w.raum > 0) rauschen(s, rate, rnd, { staerke: (w.raum / 100) * 0.25, t60: 0.5 + schwanz, auf: 0.02, art: "band", f: w.hell * 0.8, q: 0.7, start: Math.round(((w.schlaege - 1) * w.abstand / 1000) * rate) });
      return saettige(s, w.antrieb);
    });
    const b = w.breite / 100, L = new Float32Array(n), R = new Float32Array(n);
    for (let i = 0; i < n; i++) { const m = (seiten[0][i] + seiten[1][i]) / 2; L[i] = m + (seiten[0][i] - m) * b; R[i] = m + (seiten[1][i] - m) * b; }
    return fertig([L, R], staerke);
  },
};

// ---------- Hi-Hat und Ride: Metall ----------
const METALL = [205.3, 304.4, 369.6, 522.7, 540, 800];   // Verhältnisse der sechs Schwingungen (in Hz bei Stimmung 1)
function metall(w, rate, { staerke, seed, laenge, glanz }) {
  const rnd = zufall(seed), rnd2 = zufall(seed ^ 0x27d4eb2d), h = hell(staerke), n = Math.ceil((laenge * 1.3 + 0.01) * rate);
  const osc = METALL.map((f) => new Rechteck(f * w.stimmung * (1 + 0.004 * (rnd() - 0.5)), rate, rnd()));
  const bp = new SVF().setze(glanz * h, 1.1, rate), hp1 = new SVF().setze(w.hell * h, 0.7, rate), hp2 = new SVF().setze(w.hell * h, 0.7, rate);
  const nhp = new SVF().setze(w.hell * h, 0.6, rate), side = new SVF().setze(w.hell * h, 0.6, rate), lp = new SVF().setze(w.oben * h, 0.7, rate), lp2 = new SVF().setze(w.oben * h, 0.7, rate);
  const mitte = new Float32Array(n), seite = new Float32Array(n), r = Math.exp(-6.907755 / (laenge * rate)), auf = Math.round(0.0002 * rate);
  const mt = w.metall / 100, an = w.anschlag / 100;
  let e = 1;
  for (let i = 0; i < n; i++) {
    let m = 0; for (const o of osc) m += o.schritt();
    m = hp2.schritt(hp1.schritt(bp.schritt(m / 6).band).hoch).hoch;
    const rau = nhp.schritt(rnd() * 2 - 1).hoch;
    const k = i < auf ? i / auf : 1, transient = 1 + an * 1.2 * Math.exp(-i / (0.0015 * rate));
    mitte[i] = lp.schritt((m * mt * 2.2 + rau * (1 - mt * 0.7)) * e * k * transient).tief;
    seite[i] = lp2.schritt(side.schritt(rnd2() * 2 - 1).hoch).tief * e * k * 0.7;
    e *= r;
  }
  saettige(mitte, w.antrieb);
  return fertig(stereo(mitte, seite, w.breite / 100), staerke);
}
const hatParameter = (laengeStd) => [
  P("metall", "Metall", "Klang", 0, 100, 55, "%", { hilfe: "sechs Rechteckschwingungen (Metall) gegen Rauschen (Luft)" }),
  P("stimmung", "Stimmung", "Klang", 0.5, 2, 1, "", { skala: "log" }),
  P("glanz", "Glanz", "Klang", 4000, 16000, 9000, "Hz", { skala: "log", hilfe: "Mitte des Metallbands" }),
  P("hell", "Hochpass", "Klang", 2500, 15000, 6500, "Hz", { skala: "log" }),
  P("oben", "Tiefpass", "Klang", 6000, 20000, 13000, "Hz", { skala: "log", hilfe: "nimmt das Zischen ganz oben weg" }),
  P("laenge", "Länge", "Hülle", 8, 2000, laengeStd, "ms", { skala: "log" }),
  P("anschlag", "Anschlag", "Hülle", 0, 100, 40, "%", { hilfe: "Spitze am Anfang: Stick" }),
  P("breite", "Breite", "Farbe", 0, 100, 25, "%"),
  P("antrieb", "Antrieb", "Farbe", 0, 24, 0, "dB", { schritt: 0.1 }),
];
const hat = {
  key: "hat", name: "Hi-Hat", rolle: "drums", pan: 0.15, pegel: -9,
  parameter: hatParameter(95),
  artikulationen: [{ key: "x", name: "geschlossen" }],
  varianten: [
    V("fein", "ausgewogen", {}),
    V("eng", "kurz, hell", { metall: 45, hell: 8000, glanz: 10500, laenge: 60, oben: 15000 }),
    V("909", "mehr Luft als Metall", { metall: 30, hell: 6500, laenge: 110 }),
    V("808", "viel Metall", { metall: 85, hell: 5500, glanz: 8500, laenge: 80, oben: 16000 }),
    V("Goa scharf", "sehr kurz und spitz", { metall: 50, hell: 9000, glanz: 12000, laenge: 45, anschlag: 70, oben: 17000 }),
    V("staubig", "dunkel und weich", { metall: 40, stimmung: 0.8, hell: 4500, glanz: 7000, laenge: 110, anschlag: 15, oben: 9000 }),
  ],
  rechne(w, rate, o) { return metall(w, rate, { ...o, laenge: w.laenge / 1000, glanz: w.glanz }); },
};
const offen = {
  ...hat, key: "offen", name: "Hi-Hat offen", pan: 0.2, pegel: -12,
  parameter: hatParameter(650),
  artikulationen: [{ key: "x", name: "offen" }],
  varianten: [
    V("fein", "ausgewogen", {}),
    V("House", "offen auf der Zwei-und", { metall: 35, hell: 6500, laenge: 600 }),
    V("808", "metallisch und lang", { metall: 85, hell: 5500, glanz: 8500, laenge: 900, oben: 16000 }),
    V("Goa zischend", "hell und lang", { metall: 45, hell: 8500, glanz: 12000, laenge: 750, anschlag: 30, oben: 17000 }),
    V("kurz", "halboffen", { laenge: 280 }),
    V("staubig", "dunkel", { metall: 40, stimmung: 0.8, hell: 4500, glanz: 7000, laenge: 700, anschlag: 15, oben: 9000 }),
  ],
};

// ---------- Rim, Tom, Shaker, Ride ----------
const rim = {
  key: "rim", name: "Rim", rolle: "drums", pan: -0.1, pegel: -8,
  parameter: [
    P("ton", "Ton", "Klang", 300, 1500, 520, "Hz", { skala: "log" }),
    P("holz", "Holz", "Klang", 800, 4000, 1700, "Hz", { skala: "log" }),
    P("laenge", "Länge", "Hülle", 10, 300, 55, "ms", { skala: "log" }),
    P("knack", "Knack", "Hülle", 0, 100, 60, "%"),
    P("antrieb", "Antrieb", "Farbe", 0, 24, 2, "dB", { schritt: 0.1 }),
  ],
  artikulationen: [{ key: "x", name: "Schlag" }],
  varianten: [V("Sidestick", "Holz", {}), V("808 Rim", "hoch und kurz", { ton: 1100, holz: 2600, laenge: 35, knack: 80 }), V("Minimal", "tief, klopfend", { ton: 380, holz: 1200, laenge: 80, knack: 40 }), V("Clave", "Holzstab", { ton: 1450, holz: 3200, laenge: 120, knack: 30 }), V("trocken", "nur Knack", { laenge: 18, knack: 90 }), V("Glas", "lang klingend", { ton: 900, holz: 3500, laenge: 220, knack: 40 })],
  rechne(w, rate, { staerke = 1, seed = 1 }) {
    const rnd = zufall(seed), L = w.laenge / 1000, s = new Float32Array(Math.ceil((L * 1.3 + 0.02) * rate));
    moden(s, rate, [{ f: w.ton, a: 1, t60: L }, { f: w.holz, a: 0.7, t60: L * 0.5 }, { f: w.holz * 1.47, a: 0.4, t60: L * 0.35 }, { f: w.holz * 2.09, a: 0.25, t60: L * 0.25 }], { anschlag: 0.0002 });
    rauschen(s, rate, rnd, { staerke: (w.knack / 100) * 1.5 * hell(staerke), t60: 0.004, auf: 0.0001, art: "band", f: w.holz * 1.3, q: 0.8 });
    return fertig(stereo(saettige(s, w.antrieb)), staerke);
  },
};
const tom = {
  key: "tom", name: "Tom", rolle: "drums", pan: -0.2, pegel: -4,
  parameter: [
    P("ton", "Ton", "Klang", 50, 400, 110, "Hz", { skala: "log" }),
    P("spannung", "Spannung", "Klang", 0, 12, 5, "Halbtöne", { schritt: 0.1 }),
    P("laenge", "Länge", "Hülle", 60, 2000, 420, "ms", { skala: "log" }),
    P("fell", "Fell", "Klang", 0, 100, 25, "%", { hilfe: "Rauschen des Fells" }),
    P("antrieb", "Antrieb", "Farbe", 0, 24, 4, "dB", { schritt: 0.1 }),
  ],
  artikulationen: [{ key: "x", name: "tief" }, { key: "m", name: "mittel" }, { key: "h", name: "hoch" }],
  varianten: [V("Studio", "natürlich", {}), V("808 Tom", "rein, langes Gleiten", { spannung: 9, laenge: 700, fell: 5 }), V("Boom Bap", "dumpf", { ton: 95, spannung: 3, laenge: 300, fell: 35 }), V("Goa", "hoch und kurz", { ton: 180, spannung: 12, laenge: 220, fell: 10, antrieb: 10 }), V("Floor", "tief und lang", { ton: 70, laenge: 900 }), V("Konzert", "hell und offen", { ton: 160, spannung: 2, laenge: 600, fell: 40 })],
  rechne(w, rate, { art = "x", staerke = 1, seed = 1 }) {
    const rnd = zufall(seed), f = w.ton * (art === "h" ? 1.5 : art === "m" ? 1.25 : 1), L = w.laenge / 1000, s = new Float32Array(Math.ceil((L * 1.3 + 0.02) * rate)), f0 = f * 2 ** (w.spannung / 12);
    moden(s, rate, [{ f: f0, a: 1, t60: L }, { f: f0 * 1.59, a: 0.3, t60: L * 0.4 }, { f: f0 * 2.14, a: 0.18, t60: L * 0.3 }, { f: f0 * 2.3, a: 0.12, t60: L * 0.25 }], { gleiten: -w.spannung, gleitZeit: 0.05, anschlag: 0.0008 });
    rauschen(s, rate, rnd, { staerke: (w.fell / 100) * 0.6, t60: L * 0.3, auf: 0.0005, art: "band", f: f * 6, q: 0.7 });
    return fertig(stereo(saettige(s, w.antrieb)), staerke);
  },
};
const shaker = {
  key: "shaker", name: "Shaker", rolle: "perkussion", pan: -0.35, pegel: -13,
  parameter: [
    P("laenge", "Länge", "Hülle", 20, 300, 90, "ms", { skala: "log" }),
    P("hell", "Farbe", "Klang", 2500, 14000, 7000, "Hz", { skala: "log" }),
    P("koerner", "Körner", "Klang", 5, 100, 60, "%", { hilfe: "wie viele Körner im Gefäss: wenig = Rasseln, viel = Rauschen" }),
    P("auf", "Einschwingen", "Hülle", 0, 100, 35, "%", { hilfe: "Bewegung vor dem Höhepunkt" }),
    P("breite", "Breite", "Farbe", 0, 100, 30, "%"),
  ],
  artikulationen: [{ key: "x", name: "vor" }, { key: "z", name: "zurück" }],
  varianten: [V("fein", "Samen", {}), V("Sand", "dicht und weich", { koerner: 100, hell: 5500, laenge: 120 }), V("Kaxixi", "rasselnd", { koerner: 20, hell: 4500, laenge: 110 }), V("eng", "kurz und hell", { laenge: 45, hell: 10000, auf: 10 }), V("Ganza", "metallisch hell", { koerner: 70, hell: 12000, laenge: 70 }), V("weich", "langsam", { laenge: 180, auf: 70, hell: 5000 })],
  rechne(w, rate, { art = "x", staerke = 1, seed = 1 }) {
    const L = (w.laenge / 1000) * (art === "z" ? 1.3 : 1), n = Math.ceil((L * 1.6 + 0.01) * rate), dichte = 400 + 6000 * (w.koerner / 100) ** 2;
    const seiten = [0, 1].map((c) => {
      const rnd = zufall(seed * 2 + c + 3), s = new Float32Array(n), anz = Math.round(dichte * L), spitzeT = L * (0.05 + 0.5 * (w.auf / 100)) * (art === "z" ? 1.4 : 1);
      for (let k = 0; k < anz; k++) {
        const t = rnd() * L * 1.5, hulle = t < spitzeT ? t / spitzeT : Math.exp((-4 * (t - spitzeT)) / L), i0 = Math.round(t * rate), a = hulle * (0.4 + 0.6 * rnd());
        for (let j = 0; j < 12 && i0 + j < n; j++) s[i0 + j] += a * (rnd() * 2 - 1) * Math.exp(-j / 3);
      }
      return filtere2(s, w.hell * hell(staerke), rate);
    });
    const b = w.breite / 100, Ls = new Float32Array(n), Rs = new Float32Array(n);
    for (let i = 0; i < n; i++) { const m = (seiten[0][i] + seiten[1][i]) / 2; Ls[i] = m + (seiten[0][i] - m) * b; Rs[i] = m + (seiten[1][i] - m) * b; }
    return fertig([Ls, Rs], staerke);
  },
};
function filtere2(s, f, rate) { const a = new SVF().setze(f, 1.2, rate), b = new SVF().setze(f * 0.5, 0.7, rate); for (let i = 0; i < s.length; i++) s[i] = b.schritt(a.schritt(s[i]).band).hoch; return s; }

const ride = {
  key: "ride", name: "Ride", rolle: "drums", pan: 0.3, pegel: -14,
  parameter: [
    P("ton", "Glocke", "Klang", 200, 900, 420, "Hz", { skala: "log" }),
    P("laenge", "Länge", "Hülle", 400, 6000, 2400, "ms", { skala: "log" }),
    P("glocke", "Glockenanteil", "Klang", 0, 100, 30, "%"),
    P("waschen", "Rauschen", "Klang", 0, 100, 55, "%", { hilfe: "das Zischen des Beckens" }),
    P("hell", "Hochpass", "Klang", 1500, 10000, 4000, "Hz", { skala: "log" }),
    P("breite", "Breite", "Farbe", 0, 100, 40, "%"),
  ],
  artikulationen: [{ key: "x", name: "Fläche" }, { key: "g", name: "Glocke" }],
  varianten: [V("Jazz", "trocken, klar", {}), V("dunkel", "alt und dunkel", { ton: 330, laenge: 3200, glocke: 15, waschen: 70, hell: 2500 }), V("hell", "modern", { ton: 520, laenge: 1800, glocke: 45, waschen: 40, hell: 6000 }), V("Goa", "kurz, zischend", { laenge: 900, waschen: 80, hell: 7000, glocke: 20 }), V("Glocke", "Glocke betont", { glocke: 85, waschen: 25 }), V("Crash", "gross und lang", { ton: 300, laenge: 5000, glocke: 5, waschen: 90, hell: 2000, breite: 80 })],
  rechne(w, rate, { art = "x", staerke = 1, seed = 1 }) {
    const rnd = zufall(seed), rnd2 = zufall(seed ^ 0x9e3779b9), L = w.laenge / 1000, n = Math.ceil((L * 1.1 + 0.02) * rate), mitte = new Float32Array(n), seite = new Float32Array(n);
    const gl = art === "g" ? Math.min(1, w.glocke / 100 + 0.6) : w.glocke / 100, liste = [];
    for (let k = 0; k < 28; k++) { const f = w.ton * (1.5 + k * 0.97 + rnd() * 0.8) ** 1.25; liste.push({ f, a: (0.5 / Math.sqrt(k + 1)) * (1 - gl * 0.6), t60: L * (0.25 + 0.75 * Math.exp(-f / 6000)), phase: rnd() * TAU }); }
    liste.push({ f: w.ton, a: gl * 1.2, t60: L * 0.5 }, { f: w.ton * 2.76, a: gl * 0.7, t60: L * 0.35 }, { f: w.ton * 5.4, a: gl * 0.4, t60: L * 0.2 });
    moden(mitte, rate, liste, { anschlag: art === "g" ? 0.0003 : 0.0002 });
    rauschen(mitte, rate, rnd, { staerke: (w.waschen / 100) * 0.35, t60: L * 0.7, auf: 0.002, art: "hoch", f: w.hell, q: 0.6 });
    rauschen(seite, rate, rnd2, { staerke: (w.waschen / 100) * 0.3, t60: L * 0.7, auf: 0.004, art: "hoch", f: w.hell, q: 0.6 });
    const hp = new SVF().setze(w.hell * 0.5, 0.7, rate); for (let i = 0; i < n; i++) mitte[i] = hp.schritt(mitte[i]).hoch;
    return fertig(stereo(mitte, seite, w.breite / 100), staerke);
  },
};

export default {
  id: "drums", version: "0.1.0", name: "Drums",
  beschreibung: "Elektronische Schlagzeugstimmen aus eigener Synthese: Kick, Snare, Clap, Hi-Hat, Rim, Tom, Shaker, Ride.",
  stimmen: Object.fromEntries([kick, snare, clap, hat, offen, rim, tom, shaker, ride].map((s) => [s.key, s])),
};
