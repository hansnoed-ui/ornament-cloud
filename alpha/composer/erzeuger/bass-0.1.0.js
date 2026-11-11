// Bass 0.1.0 – sechs Bassstimmen aus eigener Synthese, warm und fett:
//   Sub        reiner Sinus mit etwas zweiter Harmonischer und Sättigung (808, Dre)
//   Rund       Sinus und Dreieck durch ein Tiefpassfilter, das beim Anschlag kurz öffnet (Dub, Kruder & Dorfmeister, Trip-Hop)
//   Analog     Sägezahn und Rechteck, Suboszillator, 24-dB-Tiefpass mit Hüllkurve, Gleiten (G-Funk, Wu-Tang, Boom Bap)
//   Reese      drei gegeneinander verstimmte Sägezähne, bewegtes Filter, Sub darunter, unten mono und oben breit (Ed Rush, Goldie)
//   Kontrabass gezupfte Saite (Karplus-Strong, erweitert nach Jaffe und Smith) mit Fingeranschlag, Spannungsabfall und Holzkörper
//   E-Bass     dieselbe Saite mit Tonabnehmer statt Körper (Finger, Flatwound, Fretless)
// Jede Stimme rechnet eine Note: rechne(werte, rate, { frequenz, dauer, staerke, seed, gleitVon, beginn }) → [L, R], mit Ausklang.
// Jede Note wird auf eine Spitze von 0,9 × Stärke gebracht. Nach der Veröffentlichung nicht mehr verändern; neue Klänge in bass-0.2.0.js.

import { zufall, SVF, TAU, spitze } from "./grund.js";

const P = (key, name, gruppe, min, max, std, einheit = "", mehr = {}) => ({ key, name, gruppe, min, max, std, einheit, ...mehr });
const V = (name, beschreibung, werte) => ({ name, beschreibung, werte });

const OKTAVE = P("oktave", "Oktave", "Ton", -1, 2, 0, "", { schritt: 1, hilfe: "0 = tiefste Lage (Grundton 30–60 Hz)" });
const GLEIT = P("gleitZeit", "Gleiten", "Ton", 0, 400, 60, "ms", { hilfe: "Zeit für «~»-Töne, die vom vorigen her gleiten" });
const HUELLE = (auf, abklingen, halten, ab) => [
  P("auf", "Einsatz", "Hülle", 0.5, 80, auf, "ms", { skala: "log" }),
  P("abklingen", "Abklingen", "Hülle", 50, 6000, abklingen, "ms", { skala: "log", hilfe: "vom Einsatz zum Haltepegel" }),
  P("halten", "Haltepegel", "Hülle", 0, 100, halten, "%"),
  P("ab", "Ausklang", "Hülle", 10, 1500, ab, "ms", { skala: "log" }),
];
const ANTRIEB = (std) => P("antrieb", "Antrieb", "Farbe", 0, 24, std, "dB", { schritt: 0.1, hilfe: "Sättigung: Obertöne, hörbar auch auf kleinen Lautsprechern" });

/** Hüllkurve mit Einsatz, Abklingen auf den Haltepegel, Halten bis zum Notenende, Ausklang */
function huelle(w, rate, dauer) {
  const n = Math.ceil((dauer + (w.ab / 1000) * 1.2 + 0.005) * rate), e = new Float32Array(n);
  const A = Math.max(1, (w.auf / 1000) * rate), ende = Math.round(dauer * rate), halten = w.halten / 100, kd = Math.exp(-4.6 / ((w.abklingen / 1000) * rate)), kr = Math.exp(-6.9 / ((w.ab / 1000) * rate));
  let v = 0, d = 1;
  for (let i = 0; i < n; i++) {
    if (i < ende) { if (i < A) v = 0.5 - 0.5 * Math.cos((Math.PI * i) / A); else { d *= kd; v = halten + (1 - halten) * d; } }
    else v *= kr;
    e[i] = v;
  }
  return e;
}
/** Tonhöhe je Abtastwert: vom vorigen Ton her gleitend (exponentiell, in der eingestellten Zeit fast angekommen) */
function tonhoehe(f, gleitVon, gleitZeit, rate) {
  if (!gleitVon || gleitZeit <= 0) return () => f;
  const tau = (gleitZeit / 1000 / 4) * rate, r = Math.log(gleitVon / f);
  return (i) => f * Math.exp(r * Math.exp(-i / tau));
}
function saettige(x, g, n) { return g > 1 ? Math.tanh(g * x) / n : x; }
/** bandbegrenzter Sägezahn (PolyBLEP), Frequenz je Abtastwert änderbar */
class Saege {
  constructor(phase = 0) { this.p = phase; }
  schritt(d) {
    const p = this.p; let y = 2 * p - 1;
    if (p < d) { const t = p / d; y -= t + t - t * t - 1; } else if (p > 1 - d) { const t = (p - 1) / d; y -= t * t + t + t + 1; }
    this.p = (p + d) % 1; return y;
  }
}
/** auf Spitze 0,9 × Stärke, Ende 3 ms ausblenden */
function fertig(L, R, staerke) {
  const m = spitze(L, R) || 1, g = (0.9 * Math.min(1.2, staerke)) / m, n = L.length, aus = Math.min(n, 144);
  for (let i = 0; i < n; i++) { L[i] *= g; R[i] *= g; }
  for (let i = 0; i < aus; i++) { const k = i / aus; L[n - 1 - i] *= k; R[n - 1 - i] *= k; }
  return [L, R];
}
const mono = (s) => [s, Float32Array.from(s)];

// ---------- Sub ----------
const sub = {
  key: "sub", name: "Sub", rolle: "bass", pan: 0, pegel: -5,
  parameter: [OKTAVE, P("waerme", "Wärme", "Farbe", 0, 100, 25, "%", { hilfe: "zweite Harmonische: rund und hörbar" }), ANTRIEB(4), P("oben", "Tiefpass", "Farbe", 100, 2000, 600, "Hz", { skala: "log" }), ...HUELLE(4, 1200, 75, 90), GLEIT],
  varianten: [
    V("808 rund", "warm, langer Atem", {}),
    V("Dre", "fest, etwas Obertöne, kurz gleitend", { waerme: 40, antrieb: 8, oben: 900, halten: 85, ab: 70, gleitZeit: 40 }),
    V("DnB Sub", "rein und tief, gleichmässig", { waerme: 10, antrieb: 2, oben: 300, halten: 95, abklingen: 3000 }),
    V("gesättigt", "fett und rauh", { waerme: 55, antrieb: 14, oben: 1400 }),
    V("kurz", "punktiert", { halten: 20, abklingen: 220, ab: 50 }),
    V("lang gleitend", "808 mit langem Gleiten", { gleitZeit: 220, abklingen: 2500, halten: 60, ab: 300 }),
  ],
  rechne(w, rate, { frequenz, dauer, staerke = 0.8, gleitVon }) {
    const e = huelle(w, rate, dauer), n = e.length, s = new Float32Array(n), f = tonhoehe(frequenz, gleitVon, w.gleitZeit, rate), wa = (w.waerme / 100) * 0.45;
    const g = 10 ** (w.antrieb / 20), gn = Math.tanh(g), lp = new SVF().setze(w.oben, 0.7, rate);
    let ph = 0;
    for (let i = 0; i < n; i++) { const x = Math.sin(ph) + wa * Math.sin(2 * ph + 0.3); s[i] = lp.schritt(saettige(x * e[i], g, gn)).tief; ph += (TAU * f(i)) / rate; }
    return fertig(...mono(s), staerke);
  },
};

// ---------- Rund ----------
const rund = {
  key: "rund", name: "Rund", rolle: "bass", pan: 0, pegel: -7,
  parameter: [OKTAVE, P("koerper", "Dreieck", "Klang", 0, 100, 35, "%", { hilfe: "Dreieck zum Sinus: mehr Körper" }), P("hell", "Filter", "Klang", 120, 3000, 380, "Hz", { skala: "log" }),
    P("biss", "Biss", "Klang", 0, 4, 1.2, "Okt", { schritt: 0.1, hilfe: "wie weit das Filter beim Anschlag öffnet" }), P("bissZeit", "Biss-Zeit", "Klang", 10, 800, 120, "ms", { skala: "log" }), ANTRIEB(6), ...HUELLE(5, 900, 70, 120), GLEIT],
  varianten: [
    V("Kruder & Dorfmeister", "rund und tief, weicher Anschlag", {}),
    V("Dub tief", "sehr tief, langer Ton", { koerper: 20, hell: 260, biss: 0.6, halten: 90, abklingen: 2500, ab: 220 }),
    V("Trip-Hop", "dunkel, etwas Biss", { koerper: 45, hell: 320, biss: 1.8, bissZeit: 90, antrieb: 9 }),
    V("weich", "kaum Anschlag", { biss: 0.3, auf: 15, antrieb: 3 }),
    V("Holz", "mehr Dreieck, kurz", { koerper: 75, hell: 600, biss: 1.5, halten: 40, abklingen: 400 }),
    V("dunkel", "fast nur Grundton", { koerper: 10, hell: 180, biss: 0.4, antrieb: 4 }),
  ],
  rechne(w, rate, { frequenz, dauer, staerke = 0.8, gleitVon }) {
    const e = huelle(w, rate, dauer), n = e.length, s = new Float32Array(n), f = tonhoehe(frequenz, gleitVon, w.gleitZeit, rate), k = w.koerper / 100;
    const g = 10 ** (w.antrieb / 20), gn = Math.tanh(g), lp = new SVF(), lp2 = new SVF(), bz = (w.bissZeit / 1000) * rate;
    let ph = 0;
    for (let i = 0; i < n; i++) {
      if (i % 16 === 0) { const fc = w.hell * 2 ** (w.biss * Math.min(1, staerke + 0.2) * Math.exp(-i / bz)); lp.setze(fc, 0.6, rate); lp2.setze(fc * 1.3, 0.6, rate); }
      const p = ph / TAU % 1, tri = 4 * Math.abs(p - 0.5) - 1;
      const x = (1 - k) * Math.sin(ph) + k * tri * 0.9;
      s[i] = saettige(lp2.schritt(lp.schritt(x).tief).tief * e[i], g, gn);
      ph += (TAU * f(i)) / rate;
    }
    return fertig(...mono(s), staerke);
  },
};

// ---------- Analog ----------
/** 24-dB-Tiefpass aus zwei Zustandsvariablen Filtern; die Resonanz sitzt im zweiten */
function tiefpass24(rate) { const a = new SVF(), b = new SVF(); return { setze(f, res) { a.setze(f, 0.54, rate); b.setze(f, 1.31 + res * 6, rate); }, schritt(x) { return b.schritt(a.schritt(x).tief).tief; } }; }
const analog = {
  key: "analog", name: "Analog", rolle: "bass", pan: 0, pegel: -5,
  parameter: [OKTAVE, P("saege", "Sägezahn", "Oszillator", 0, 100, 60, "%", { hilfe: "Sägezahn gegen Rechteck" }), P("verstimmung", "Verstimmung", "Oszillator", 0, 30, 6, "Cent"), P("sub", "Sub", "Oszillator", 0, 100, 35, "%", { hilfe: "Sinus eine Oktave tiefer" }),
    P("filter", "Filter", "Filter", 60, 4000, 320, "Hz", { skala: "log" }), P("resonanz", "Resonanz", "Filter", 0, 100, 25, "%"), P("huelle", "Hüllkurve", "Filter", 0, 5, 2.2, "Okt", { schritt: 0.1 }),
    P("bissZeit", "Filter-Abklingen", "Filter", 20, 1500, 180, "ms", { skala: "log" }), ANTRIEB(8), ...HUELLE(3, 700, 70, 80), GLEIT],
  varianten: [
    V("G-Funk", "rund, gleitend, wie bei Dr. Dre", { saege: 40, sub: 50, filter: 260, resonanz: 30, huelle: 1.8, bissZeit: 260, gleitZeit: 90 }),
    V("Wu dreckig", "rauh und gesättigt", { saege: 80, verstimmung: 12, filter: 420, resonanz: 15, huelle: 2.5, antrieb: 15 }),
    V("Boom Bap", "kurz und dunkel", { saege: 55, sub: 45, filter: 200, huelle: 1.4, halten: 40, abklingen: 300 }),
    V("Funk", "spitz, viel Hüllkurve", { saege: 70, filter: 300, resonanz: 45, huelle: 3.4, bissZeit: 120 }),
    V("Pluck", "kurzer Zupfer", { filter: 250, huelle: 3, bissZeit: 90, halten: 10, abklingen: 250, ab: 60 }),
    V("Goa rollend", "kurz, hell, präzise", { saege: 90, sub: 30, filter: 500, resonanz: 35, huelle: 2.8, bissZeit: 70, halten: 5, abklingen: 140, ab: 30, gleitZeit: 0 }),
  ],
  rechne(w, rate, { frequenz, dauer, staerke = 0.8, gleitVon, seed = 1 }) {
    const rnd = zufall(seed), e = huelle(w, rate, dauer), n = e.length, s = new Float32Array(n), f = tonhoehe(frequenz, gleitVon, w.gleitZeit, rate);
    const o1 = new Saege(rnd()), o2 = new Saege(rnd()), dt = 2 ** (w.verstimmung / 1200), sa = w.saege / 100, su = w.sub / 100;
    const lp = tiefpass24(rate), g = 10 ** (w.antrieb / 20), gn = Math.tanh(g), bz = (w.bissZeit / 1000) * rate, res = w.resonanz / 100;
    let phs = 0, pq = rnd();
    for (let i = 0; i < n; i++) {
      const fi = f(i), d = fi / rate;
      if (i % 16 === 0) lp.setze(Math.min(rate * 0.4, w.filter * 2 ** (w.huelle * (0.5 + 0.5 * staerke) * Math.exp(-i / bz)) * (1 + fi / 400)), res);
      const saw = (o1.schritt(d) + o2.schritt(d * dt)) * 0.5;
      pq = (pq + d) % 1; const sq = pq < 0.5 ? 1 : -1;   // Rechteck geht durch das Filter, Aliasing bleibt dort unter dem Rauschen
      const x = sa * saw + (1 - sa) * sq * 0.8 + su * Math.sin(phs) * 1.2;
      s[i] = saettige(lp.schritt(x) * e[i], g, gn);
      phs += (Math.PI * fi) / rate;
    }
    return fertig(...mono(s), staerke);
  },
};

// ---------- Reese ----------
const reese = {
  key: "reese", name: "Reese", rolle: "bass", pan: 0, pegel: -6,
  parameter: [OKTAVE, P("schwebung", "Schwebung", "Oszillator", 2, 50, 18, "Cent", { hilfe: "Verstimmung der drei Sägezähne: langsames Drehen bis wildes Reiben" }), P("sub", "Sub", "Oszillator", 0, 100, 45, "%"),
    P("filter", "Filter", "Filter", 80, 5000, 700, "Hz", { skala: "log" }), P("resonanz", "Resonanz", "Filter", 0, 100, 15, "%"),
    P("bewegung", "Bewegung", "Filter", 0.03, 8, 0.25, "Hz", { skala: "log", hilfe: "Geschwindigkeit des Filters (läuft über die Noten hinweg weiter)" }), P("tiefe", "Tiefe", "Filter", 0, 3, 1, "Okt", { schritt: 0.05 }),
    P("breite", "Breite", "Farbe", 0, 100, 60, "%", { hilfe: "oberhalb von 150 Hz stereo; darunter immer mono" }), ANTRIEB(9), ...HUELLE(8, 4000, 90, 150), { ...GLEIT, std: 120 }],
  varianten: [
    V("Ed Rush dunkel", "tief, langsam drehend, gesättigt", { filter: 450, schwebung: 14, bewegung: 0.18, tiefe: 1.2, antrieb: 12 }),
    V("Goldie Halftime", "breit und weich", { filter: 650, schwebung: 20, bewegung: 0.12, tiefe: 0.8, breite: 85, sub: 55 }),
    V("Neuro", "schnell bewegt, Resonanz", { filter: 900, resonanz: 45, schwebung: 28, bewegung: 3, tiefe: 1.8, antrieb: 16 }),
    V("Sub-Reese", "fast nur Sub, ganz wenig Reibung", { filter: 220, sub: 80, schwebung: 9, tiefe: 0.5 }),
    V("reibend", "starke Schwebung, offen", { filter: 1400, schwebung: 42, bewegung: 0.5, tiefe: 1.4 }),
    V("langsam", "sehr langsame Welle", { filter: 600, bewegung: 0.05, tiefe: 2 }),
  ],
  rechne(w, rate, { frequenz, dauer, staerke = 0.8, gleitVon, seed = 1, beginn = 0 }) {
    const rnd = zufall(seed), e = huelle(w, rate, dauer), n = e.length, f = tonhoehe(frequenz, gleitVon, w.gleitZeit, rate);
    const d = w.schwebung / 1200, verh = [2 ** -d, 1, 2 ** d, 2 ** (-d * 0.37)], o = verh.map(() => new Saege(rnd()));
    const lpL = tiefpass24(rate), lpR = tiefpass24(rate), hpL = new SVF().setze(150, 0.7, rate), hpR = new SVF().setze(150, 0.7, rate), tm = new SVF().setze(150, 0.7, rate);
    const L = new Float32Array(n), R = new Float32Array(n), g = 10 ** (w.antrieb / 20), gn = Math.tanh(g), br = w.breite / 100, su = w.sub / 100, res = w.resonanz / 100;
    let phs = 0;
    for (let i = 0; i < n; i++) {
      const fi = f(i), dd = fi / rate;
      if (i % 32 === 0) { const t = beginn + i / rate, fc = Math.min(rate * 0.4, w.filter * 2 ** (w.tiefe * Math.sin(TAU * w.bewegung * t))); lpL.setze(fc, res); lpR.setze(fc * 1.05, res); }
      const a = o[0].schritt(dd * verh[0]), b = o[1].schritt(dd * verh[1]), c = o[2].schritt(dd * verh[2]), x = o[3].schritt(dd * verh[3]);
      const l = lpL.schritt((a + b + x * 0.6) / 2.6), r = lpR.schritt((c + b + x * 0.6) / 2.6), m = (l + r) / 2;
      const tief = tm.schritt(m).tief + su * Math.sin(phs) * 0.7;
      const hl = hpL.schritt(l).hoch, hr = hpR.schritt(r).hoch, hm = (hl + hr) / 2;
      L[i] = saettige((tief + hm + (hl - hm) * br) * e[i], g, gn); R[i] = saettige((tief + hm + (hr - hm) * br) * e[i], g, gn);
      phs += (TAU * fi) / rate;
    }
    return fertig(L, R, staerke);
  },
};

// ---------- Saite: Kontrabass und E-Bass ----------
/**
 * Erweiterte Karplus-Strong-Saite: Verzögerung mit gebrochener Länge (lineare Interpolation), Verlustfilter (Mittel zweier Werte, Gewicht
 * = Helligkeit), Verlust je Umlauf aus der Abklingzeit, nach Notenende stärker gedämpft. Anregung: ein Fingerimpuls (Halbsinus, Breite aus
 * «Finger») mit etwas Rauschen, durch einen Kamm für den Zupfpunkt. Beim Anschlag ist die Saite kurz gespannter (höher), das fällt ab.
 */
function saite(w, rate, { frequenz, dauer, staerke, seed, gleitVon }, aufnahme) {
  const rnd = zufall(seed), f = tonhoehe(frequenz, gleitVon, w.gleitZeit, rate), n = Math.ceil((dauer + (w.ab / 1000) * 1.3 + 0.01) * rate);
  const maxL = Math.ceil(rate / Math.min(frequenz, gleitVon ?? frequenz) * 1.1) + 4, buf = new Float32Array(maxL * 2 + 8), N = buf.length;
  const out = new Float32Array(n), ende = Math.round(dauer * rate), hell = 0.5 + 0.48 * (w.hell / 100);
  const breite = Math.max(2, Math.round((0.0006 + 0.004 * (w.finger / 100)) * rate)), kamm = Math.max(1, Math.round((rate / frequenz) * w.position));
  const anr = new Float32Array(breite + kamm + 2);
  for (let i = 0; i < breite; i++) anr[i] = Math.sin((Math.PI * i) / breite) * (0.9 + 0.2 * rnd()) + (rnd() - 0.5) * 0.15 * (1 - w.finger / 100);
  for (let i = anr.length - 1; i >= kamm; i--) anr[i] -= anr[i - kamm];
  let wpos = 0, alt = 0;
  const t60 = w.saite, tab = w.ab / 1000;
  for (let i = 0; i < n; i++) {
    const spann = 1 + (2 ** (w.anschlag / 1200) - 1) * Math.exp(-i / (0.05 * rate)), fi = f(i) * spann, L = rate / fi;
    const rp = wpos - L, a = Math.floor(rp), fr = rp - a, i0 = ((a % N) + N) % N, i1 = (i0 + 1) % N;
    const y = buf[i0] * (1 - fr) + buf[i1] * fr;
    const verlust = 10 ** (-3 / (fi * (i < ende ? t60 : Math.max(0.02, tab))));
    const gef = verlust * (hell * y + (1 - hell) * alt); alt = y;
    const ein = i < anr.length ? anr[i] * Math.min(1, staerke + 0.2) : 0;
    buf[wpos % N] = gef + ein;
    out[i] = y + ein; wpos++;   // die Anregung klingt sofort, nicht erst nach einem Umlauf
  }
  return aufnahme(out, rate, rnd);
}
const SAITE = (fingerStd, saiteStd, hellStd) => [OKTAVE,
  P("finger", "Finger", "Anschlag", 0, 100, fingerStd, "%", { hilfe: "weich = breite Fingerkuppe, dunkel; hart = Nagel oder Plektrum" }),
  P("position", "Zupfpunkt", "Anschlag", 0.05, 0.5, 0.18, "", { schritt: 0.01, hilfe: "nahe am Steg (klein) = hell und dünn, Mitte = rund" }),
  P("anschlag", "Spannung", "Anschlag", 0, 40, 12, "Cent", { hilfe: "beim Zupfen kurz höher" }),
  P("saite", "Nachklang", "Saite", 0.3, 8, saiteStd, "s", { skala: "log" }), P("hell", "Helligkeit", "Saite", 0, 100, hellStd, "%"),
  P("ab", "Abdämpfen", "Saite", 15, 800, 110, "ms", { skala: "log", hilfe: "wie schnell die Hand die Saite am Notenende dämpft" }), GLEIT, ANTRIEB(2)];

const kontrabass = {
  key: "kontrabass", name: "Kontrabass", rolle: "bass", pan: 0, pegel: -3,
  parameter: [...SAITE(55, 2.5, 35), P("koerper", "Körper", "Klang", 0, 100, 45, "%", { hilfe: "Holzresonanzen des Korpus" })],
  varianten: [
    V("Jazz", "warm und rund, mittel lang", {}),
    V("warm singend", "Richtung Avishai Cohen: viel Körper, langer Ton", { finger: 45, saite: 4, koerper: 70, hell: 40, anschlag: 16 }),
    V("Pizzicato hell", "knackig, kurz", { finger: 25, saite: 1.4, hell: 60, position: 0.12, koerper: 35 }),
    V("gedämpft", "kurz und dunkel", { finger: 75, saite: 0.6, hell: 15, ab: 60 }),
    V("Studio nah", "direkt, wenig Holz", { koerper: 20, hell: 45 }),
    V("tief rund", "weiche Kuppe, Mitte der Saite", { finger: 85, position: 0.3, hell: 25, koerper: 55 }),
  ],
  rechne(w, rate, o) {
    return saite(w, rate, o, (s, r) => {
      const k = w.koerper / 100, modi = [[98, 7], [185, 6], [420, 5]].map(([f, q]) => new SVF().setze(f, q, r)), lp = new SVF().setze(2500 + 4000 * (w.hell / 100), 0.7, r);
      const g = 10 ** (w.antrieb / 20), gn = Math.tanh(g);
      for (let i = 0; i < s.length; i++) { let b = 0; for (const m of modi) b += m.schritt(s[i]).band; s[i] = saettige(lp.schritt(s[i] * (1 - k * 0.5) + b * k * 0.9).tief, g, gn); }
      return fertig(...mono(s), o.staerke ?? 0.8);
    });
  },
};
const ebass = {
  key: "ebass", name: "E-Bass", rolle: "bass", pan: 0, pegel: -4,
  parameter: [...SAITE(40, 3.5, 50), P("abnehmer", "Tonabnehmer", "Klang", 0.05, 0.4, 0.12, "", { schritt: 0.01, hilfe: "Lage des Tonabnehmers: nah am Steg = mittig und knurrig" }), P("ton", "Tonregler", "Klang", 300, 6000, 1800, "Hz", { skala: "log" })],
  varianten: [
    V("Finger", "Precision mit den Fingern", {}),
    V("Flatwound", "dunkel, dumpf, Motown und Dub", { hell: 20, ton: 700, saite: 2.2, finger: 60 }),
    V("Dub", "sehr dunkel, tief, weich", { ton: 450, finger: 80, hell: 15, abnehmer: 0.25, antrieb: 4 }),
    V("Plektrum", "hart, präsent", { finger: 5, hell: 70, ton: 3500, position: 0.1 }),
    V("Fretless", "singend, weich gleitend", { finger: 50, anschlag: 4, saite: 5, gleitZeit: 140, ton: 1500 }),
    V("Funk", "knackig nah am Steg", { finger: 20, abnehmer: 0.07, position: 0.09, hell: 65, ab: 50 }),
  ],
  rechne(w, rate, o) {
    return saite(w, rate, o, (s, r) => {
      const d = Math.max(1, Math.round((r / o.frequenz) * w.abnehmer)), lp = new SVF().setze(w.ton, 0.8, r), g = 10 ** (w.antrieb / 20), gn = Math.tanh(g);
      for (let i = s.length - 1; i >= d; i--) s[i] = s[i] - 0.7 * s[i - d];
      for (let i = 0; i < s.length; i++) s[i] = saettige(lp.schritt(s[i]).tief, g, gn);
      return fertig(...mono(s), o.staerke ?? 0.8);
    });
  },
};

export default {
  id: "bass", version: "0.1.0", name: "Bass", melodisch: true,
  beschreibung: "Bassstimmen aus eigener Synthese: Sub, Rund, Analog, Reese, Kontrabass, E-Bass.",
  stimmen: Object.fromEntries([sub, rund, analog, reese, kontrabass, ebass].map((s) => [s.key, s])),
};
