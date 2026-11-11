// Perkussion 0.2.0 – mehr Instrumente aus Indien, dem Orient, Persien und der Türkei (Auftrag prompts/perkussion.md, Phase A,
// 10. November 2026). Gleiches Verfahren wie 0.1.0: abklingende Moden für Fell, Ton, Holz und Metall, Rauschstösse für den Kontakt,
// kein fremder Code, keine Samples. Die sechs Instrumente aus 0.1.0 (Tabla, Darbuka, Rahmentrommel, Riq, Zarb, Udu) sind hier dieselben
// Stimmen, bitgleich; dazu kennt jede Stimme ihre «Klassen» für den Zyklus-Generator (kern/zyklen.js):
//   M Bass und hoch zusammen (dha), B Bass offen (ge, doum), BC Bass geschlossen (ke), H hoch offen (na, tek), HC hoch geschlossen (ti, ka)
// Neu: Mridangam, Kanjira, Ghatam, Dholak (Indien), Daf (Persien, Kurdistan), Davul (Türkei, Balkan; Variante Dohol), Naqareh
// (persische Kesselpauken), Manjira (indische Zimbeln), Sagat (Fingerzimbeln). Jede Stimme hat nur die Schläge, die das Instrument hat.
// Die Physik ist vereinfacht; die Zahlen sind Schätzungen aus Messungen in der Literatur (Raman 1934 für die harmonischen Felle mit
// Fleck; Helmholtz-Resonanz für Ghatam und Udu; Kesselpauke nach Rossing, «Science of Percussion Instruments»), keine Nachbildung
// bestimmter Aufnahmen. Nach der Veröffentlichung nicht mehr verändern; neue Klänge in perkussion-0.3.0.js.

import alt, { schlag, schellen, MEMBRAN, GEMEINSAM, P, V } from "./perkussion-0.1.0.js";
import { moden, rauschen, TAU } from "./grund.js";

const S0 = alt.stimmen;
const mit = (s, klassen, mehr = {}) => ({ ...s, klassen, ...mehr });

// ---------- Mridangam (Karnatische Musik): rechtes Fell harmonisch (Fleck, wie die Tabla), linkes Fell tief mit Teigpaste ----------
const valanthalai = (f, art) => {
  const H = [1, 2, 3, 4, 5, 6.03].map((k) => f * k);
  if (art === "num") return { moden: [{ f: H[0], a: 0.12, t60: 0.08 }, { f: H[1], a: 1, t60: 0.8 }, { f: H[2], a: 0.55, t60: 0.6 }, { f: H[3], a: 0.3, t60: 0.4 }, { f: H[4], a: 0.18, t60: 0.25 }], anschlag: 0.0004, rauschen: [{ staerke: 0.2, t60: 0.008, auf: 0.0002, art: "band", f: 4200, q: 0.8, hellAbh: true }] };
  if (art === "din") return { moden: [{ f: H[0], a: 1, t60: 1.1 }, { f: H[1], a: 0.5, t60: 0.8 }, { f: H[2], a: 0.25, t60: 0.5 }, { f: H[3], a: 0.1, t60: 0.3 }], anschlag: 0.0011 };
  if (art === "cha") return { moden: [{ f: H[1], a: 0.4, t60: 0.9 }, { f: H[2], a: 1, t60: 1.3 }, { f: H[3], a: 0.6, t60: 1 }, { f: H[4], a: 0.35, t60: 0.7 }, { f: H[5], a: 0.15, t60: 0.4 }], anschlag: 0.0003, rauschen: [{ staerke: 0.15, t60: 0.006, auf: 0.0001, art: "band", f: 5000, q: 0.8 }] };
  // geschlossen: ta (Zeigefinger, trocken), ki (Fingerspitze, leiser), thi (Mitte, gedämpft)
  const l = art === "ki" ? 0.65 : 1;
  if (art === "thi") return { moden: [{ f: H[0] * 1.03, a: 0.8, t60: 0.06 }, { f: H[1] * 0.98, a: 0.3, t60: 0.04 }], anschlag: 0.0015, rauschen: [{ staerke: 0.3, t60: 0.02, auf: 0.0004, art: "band", f: 900, q: 0.8 }] };
  return { moden: [{ f: H[1] * 1.02, a: 0.5 * l, t60: 0.045 }, { f: f * 3.1, a: 0.35 * l, t60: 0.03 }], anschlag: art === "ki" ? 0.0007 : 0.0005, rauschen: [{ staerke: 0.45 * l, t60: 0.02, auf: 0.0003, art: "band", f: art === "ki" ? 2600 : 1600, q: 0.9 }] };
};
const thoppi = (f, art) => (art === "tha"
  ? { moden: [{ f: f * 1.15, a: 0.6, t60: 0.05 }, { f: f * 2.1, a: 0.25, t60: 0.03 }], anschlag: 0.002, rauschen: [{ staerke: 0.55, t60: 0.03, auf: 0.0006, art: "band", f: 650, q: 0.8 }] }
  : { moden: [{ f, a: 1, t60: 0.7 }, { f: f * 1.59, a: 0.22, t60: 0.35 }, { f: f * 2.3, a: 0.1, t60: 0.2 }], anschlag: 0.0022, gleiten: -0.8, gleitZeit: 0.2, rauschen: [{ staerke: 0.1, t60: 0.025, auf: 0.0008, art: "band", f: 320, q: 0.8 }] });
const MRID = {
  tham: (w) => [thoppi(w.links, "thom"), { ...valanthalai(w.ton, "num"), start: 0.002 }], dheem: (w) => [thoppi(w.links, "thom"), { ...valanthalai(w.ton, "din"), start: 0.002 }],
  thom: (w) => [thoppi(w.links, "thom")], tha: (w) => [thoppi(w.links, "tha")],
  num: (w) => [valanthalai(w.ton, "num")], din: (w) => [valanthalai(w.ton, "din")], cha: (w) => [valanthalai(w.ton, "cha")],
  ta: (w) => [valanthalai(w.ton, "ta")], ki: (w) => [valanthalai(w.ton, "ki")], thi: (w) => [valanthalai(w.ton, "thi")],
};
const MRID_PEGEL = { ki: 0.55, ta: 0.7, thi: 0.7, tha: 0.7, cha: 0.85 };
const mridangam = {
  key: "mridangam", name: "Mridangam", rolle: "perkussion", pan: 0.1, pegel: -2,
  parameter: [...GEMEINSAM(139, 110, 200), P("links", "linkes Fell", "Instrument", 55, 120, 82, "Hz", { skala: "log", hilfe: "das tiefe Fell (Thoppi) mit Teigpaste" })],
  artikulationen: [["tham", "Tham (beide)"], ["dheem", "Dheem (beide, offen)"], ["thom", "Thom (links, Bass)"], ["tha", "Tha (links, geschlossen)"], ["num", "Num (rechts, Rand)"], ["din", "Din (rechts, offen)"], ["cha", "Chapu (rechts, klingend)"], ["ta", "Ta (rechts, trocken)"], ["ki", "Ki (Fingerspitze)"], ["thi", "Thi (Mitte, gedämpft)"]].map(([key, name]) => ({ key, name })),
  klassen: { M: "tham", B: "thom", BC: "tha", H: "num", HC: "ki" },
  bols: { dha: "tham", dhin: "dheem", dhi: "dheem", ge: "thom", ghe: "thom", ke: "tha", ka: "tha", ki: "tha", kat: "tha", na: "num", ta: "num", tin: "din", tun: "din", tu: "din", te: "ki", ti: "ki", ra: "ta" },
  varianten: [
    V("Konzert", "in Cis, klar", {}),
    V("tief", "in C, dunkel", { ton: 131, links: 72, hell: -2, haerte: 40 }),
    V("hell", "in E, spritzig", { ton: 165, links: 92, hell: 2, haerte: 75 }),
    V("trocken", "nah, kurz", { klang: 0.55, breite: 15 }),
    V("singend", "langer Chapu", { klang: 1.6, hell: -0.5 }),
    V("Studio", "warm und breit", { hell: -1.5, haerte: 45, breite: 60 }),
  ],
  rechne(w, rate, { art = "tham", staerke, seed }) { return schlag(w, rate, { staerke, seed }, (MRID[art] ?? MRID.tham)(w), MRID_PEGEL[art] ?? 1); },
};

// ---------- Kanjira: kleine Rahmentrommel mit Echsenhaut und einem Schellenpaar; die linke Hand drückt das Fell (Tonhöhe steigt) ----------
const kanjira = {
  key: "kanjira", name: "Kanjira", rolle: "perkussion", pan: -0.2, pegel: -3,
  parameter: [...GEMEINSAM(185, 130, 280), P("druck", "Drücken", "Spiel", 0, 9, 5, "Halbtöne", { schritt: 0.1, hilfe: "wie weit die Hand das Fell beim Gum nach oben zieht" }), P("schellen", "Schelle", "Instrument", 0, 100, 40, "%")],
  artikulationen: [{ key: "dum", name: "Dum (Mitte)" }, { key: "gum", name: "Gum (Bass, steigt)" }, { key: "ta", name: "Ta (Rand, Slap)" }, { key: "ki", name: "Ki (Fingerspitze)" }],
  klassen: { M: "dum", B: "gum", BC: "ki", H: "ta", HC: "ki" },
  varianten: [V("klassisch", "hell, rund", {}), V("tief", "feucht gestimmt, tiefer", { ton: 150, hell: -2, klang: 1.3 }), V("Slap", "hart, spritzig", { haerte: 85, hell: 2, schellen: 55 }), V("ohne Schelle", "nur Fell", { schellen: 0 }), V("singend", "starkes Gum", { druck: 8, klang: 1.5 }), V("trocken", "kurz", { klang: 0.55, schellen: 25 })],
  rechne(w, rate, { art = "dum", staerke, seed }) {
    const f = w.ton, M = MEMBRAN.map((r) => f * r), sch = w.schellen / 100;
    let teile;
    if (art === "dum" || art === "gum") teile = [{ moden: [{ f: M[0], a: 1, t60: art === "gum" ? 0.9 : 0.45 }, { f: M[1], a: 0.25, t60: 0.25 }, { f: M[3], a: 0.2, t60: 0.2 }], anschlag: 0.0018, gleiten: art === "gum" ? w.druck : 0, gleitZeit: 0.18, funktion: sch ? schellen(2, 0.012, sch * 0.25) : null }];
    else if (art === "ta") teile = [{ moden: [4.9, 6.6, 8.7, 11.2].map((r, i) => ({ f: f * r, a: [1, 0.7, 0.45, 0.25][i], t60: [0.12, 0.09, 0.06, 0.05][i] })), anschlag: 0.0003, rauschen: [{ staerke: 0.4, t60: 0.007, auf: 0.0001, art: "band", f: 3600, q: 0.8, hellAbh: true }], funktion: sch ? schellen(3, 0.02, sch * 0.6) : null }];
    else teile = [{ moden: [5.3, 7.4].map((r, i) => ({ f: f * r, a: [0.6, 0.35][i], t60: 0.06 })), anschlag: 0.0006, rauschen: [{ staerke: 0.2, t60: 0.008, auf: 0.0002, art: "band", f: 2800, q: 0.8 }], funktion: sch ? schellen(1, 0.005, sch * 0.2) : null }];
    return schlag(w, rate, { staerke, seed }, teile, art === "ki" ? 0.55 : art === "ta" ? 0.85 : 1);
  },
};

// ---------- Ghatam: Tontopf; tief = Helmholtz-Resonanz der Öffnung am Bauch, hoch = die Moden des gebrannten Tons ----------
const TON = [1, 1.83, 2.71, 4.05, 5.6];
const ghatam = {
  key: "ghatam", name: "Ghatam", rolle: "perkussion", pan: 0.25, pegel: -3,
  parameter: [...GEMEINSAM(640, 420, 900), P("bauch", "Öffnung", "Instrument", 70, 160, 105, "Hz", { skala: "log", hilfe: "Helmholtz-Ton der Öffnung (Gumki)" }), P("biegen", "Gumki", "Spiel", -8, 4, -3, "Halbtöne", { schritt: 0.1, hilfe: "der Bauch an der Öffnung biegt den tiefen Ton" })],
  artikulationen: [{ key: "thom", name: "Thom (Öffnung, tief)" }, { key: "gum", name: "Gumki (tief, gebogen)" }, { key: "ta", name: "Ta (Hals, Finger)" }, { key: "ki", name: "Ki (Fingerspitze)" }, { key: "tha", name: "Tha (Handfläche)" }],
  klassen: { M: "thom", B: "thom", BC: "tha", H: "ta", HC: "ki" },
  varianten: [V("klassisch", "Ton aus Manamadurai, hell", {}), V("tief", "grosser Topf", { ton: 520, bauch: 88, hell: -2, klang: 1.2 }), V("hell", "kleiner Topf", { ton: 780, bauch: 125, hell: 2, haerte: 75 }), V("Gumki", "starkes Biegen", { biegen: -6, klang: 1.3 }), V("trocken", "kurz", { klang: 0.55 }), V("Raum", "weich, breit", { haerte: 30, breite: 65, hell: -1.5 })],
  rechne(w, rate, { art = "ta", staerke, seed }) {
    const f = w.ton, b = w.bauch;
    let teile;
    if (art === "thom" || art === "gum") teile = [{ moden: [{ f: b, a: 1, t60: art === "gum" ? 0.55 : 0.35 }, { f: b * 2.02, a: 0.06, t60: 0.15 }], anschlag: 0.004, gleiten: art === "gum" ? w.biegen : 0, gleitZeit: 0.12, rauschen: [{ staerke: 0.12, t60: 0.03, auf: 0.002, art: "band", f: 260, q: 0.8 }] },
      { moden: TON.slice(0, 3).map((r, i) => ({ f: f * r, a: [0.12, 0.08, 0.05][i], t60: 0.08 })), anschlag: 0.0015 }];
    else if (art === "tha") teile = [{ moden: TON.map((r, i) => ({ f: f * 0.9 * r, a: [1, 0.6, 0.4, 0.2, 0.1][i], t60: [0.1, 0.08, 0.06, 0.05, 0.04][i] })), anschlag: 0.0018, rauschen: [{ staerke: 0.45, t60: 0.025, auf: 0.0005, art: "band", f: 900, q: 0.8 }] }];
    else { const l = art === "ki" ? 0.6 : 1; teile = [{ moden: TON.map((r, i) => ({ f: f * r, a: [0.8, 1, 0.6, 0.35, 0.2][i] * l, t60: [0.12, 0.1, 0.08, 0.06, 0.05][i] })), anschlag: art === "ki" ? 0.0006 : 0.00035, rauschen: [{ staerke: 0.35 * l, t60: 0.008, auf: 0.0001, art: "band", f: art === "ki" ? 2200 : 3200, q: 0.8, hellAbh: true }] }]; }
    return schlag(w, rate, { staerke, seed }, teile, art === "ki" ? 0.55 : art === "tha" ? 0.8 : 1);
  },
};

// ---------- Dholak: Fasstrommel mit zwei Fellen; das Bassfell mit Paste innen, die Hand zieht den Ton nach oben (Ghe) ----------
const dholakBass = (w, art) => (art === "ka"
  ? { moden: [{ f: w.bass * 1.2, a: 0.6, t60: 0.05 }, { f: w.bass * 2.2, a: 0.25, t60: 0.03 }], anschlag: 0.002, rauschen: [{ staerke: 0.5, t60: 0.03, auf: 0.0006, art: "band", f: 560, q: 0.8 }] }
  : { moden: [{ f: w.bass, a: 1, t60: 0.75 }, { f: w.bass * 1.594, a: 0.3, t60: 0.4 }, { f: w.bass * 2.14, a: 0.2, t60: 0.3 }, { f: w.bass * 2.65, a: 0.08, t60: 0.2 }], anschlag: 0.0016, gleiten: art === "ghe" ? w.gleiten : w.gleiten * 0.25, gleitZeit: 0.16, rauschen: [{ staerke: 0.1, t60: 0.02, auf: 0.0005, art: "band", f: 600, q: 0.8 }] });
const dholakHoch = (w, art) => {
  const M = MEMBRAN.map((r) => w.ton * r);
  if (art === "na") return { moden: [{ f: M[0], a: 0.3, t60: 0.1 }, { f: M[1], a: 1, t60: 0.45 }, { f: M[2], a: 0.7, t60: 0.35 }, { f: M[5], a: 0.4, t60: 0.25 }, { f: M[8], a: 0.25, t60: 0.15 }], anschlag: 0.0003, rauschen: [{ staerke: 0.3, t60: 0.007, auf: 0.0001, art: "band", f: 4000, q: 0.8, hellAbh: true }] };
  if (art === "ta") return { moden: [{ f: M[0], a: 1, t60: 0.4 }, { f: M[1], a: 0.4, t60: 0.25 }, { f: M[3], a: 0.3, t60: 0.2 }], anschlag: 0.0008 };
  return { moden: [{ f: M[2] * 1.02, a: 0.5, t60: 0.04 }, { f: M[5], a: 0.3, t60: 0.03 }], anschlag: 0.0008, rauschen: [{ staerke: 0.4, t60: 0.02, auf: 0.0003, art: "band", f: 1800, q: 0.9 }] };
};
const DHOLAK = {
  dha: (w) => [dholakHoch(w, "na"), { ...dholakBass(w, "ge"), start: 0.002 }], ge: (w) => [dholakBass(w, "ge")], ghe: (w) => [dholakBass(w, "ghe")], ka: (w) => [dholakBass(w, "ka")],
  na: (w) => [dholakHoch(w, "na")], ta: (w) => [dholakHoch(w, "ta")], ti: (w) => [dholakHoch(w, "ti")],
};
const dholak = {
  key: "dholak", name: "Dholak", rolle: "perkussion", pan: -0.1, pegel: -2,
  parameter: [...GEMEINSAM(330, 240, 450), P("bass", "Bassfell", "Instrument", 70, 140, 96, "Hz", { skala: "log" }), P("gleiten", "Ghe steigt", "Spiel", 0, 8, 4, "Halbtöne", { schritt: 0.1 })],
  artikulationen: [{ key: "dha", name: "Dha (beide)" }, { key: "ge", name: "Ge (Bass)" }, { key: "ghe", name: "Ghe (Bass, steigt)" }, { key: "ka", name: "Ka (Bass, geschlossen)" }, { key: "na", name: "Na (hoch, Rand)" }, { key: "ta", name: "Ta (hoch, Mitte)" }, { key: "ti", name: "Ti (hoch, geschlossen)" }],
  klassen: { M: "dha", B: "ge", BC: "ka", H: "na", HC: "ti" },
  bols: { dhin: "dha", dhi: "dha", tin: "ta", tun: "ta", tu: "ta", te: "ti", ra: "ti", ke: "ka", ki: "ka", kat: "ka" },
  varianten: [V("Volk", "offen, rund", {}), V("Qawwali", "tief, viel Ghe", { bass: 84, gleiten: 6, hell: -1 }), V("hell", "straff, spritzig", { ton: 390, haerte: 75, hell: 2 }), V("trocken", "kurz", { klang: 0.55, gleiten: 2 }), V("weich", "Ballen, warm", { haerte: 30, hell: -2.5, klang: 1.2 }), V("breit", "Studio", { breite: 65, hell: -1 })],
  rechne(w, rate, { art = "dha", staerke, seed }) { return schlag(w, rate, { staerke, seed }, (DHOLAK[art] ?? DHOLAK.dha)(w), art === "ti" ? 0.6 : art === "ka" ? 0.7 : 1); },
};

// ---------- Daf: grosse Rahmentrommel mit Ringketten innen am Rahmen (Persien, Kurdistan) ----------
/** Ringketten: viele kleine Stahlringe, die nach dem Schlag gegeneinander schlagen; tiefer und dichter als die Schellen der Riq */
function ringe(anzahl, zeit, staerke) {
  return (s, rate, rnd) => {
    for (let k = 0; k < anzahl; k++) {
      const t = k === 0 ? 0 : rnd() * zeit, a = staerke * (0.25 + 0.75 * rnd()) * Math.exp(-t / (zeit * 0.6 + 1e-3)), basis = 1700 + rnd() * 1500;
      moden(s, rate, [1, 1.71, 2.42, 3.3].map((r, i) => ({ f: basis * r * (1 + 0.02 * (rnd() - 0.5)), a: a * [1, 0.7, 0.45, 0.3][i], t60: 0.18 - i * 0.03, phase: rnd() * TAU })), { anschlag: 0.00015, start: Math.round(t * rate) });
    }
    rauschen(s, rate, rnd, { staerke: staerke * 0.12, t60: zeit * 0.8, auf: 0.002, art: "band", f: 4500, q: 0.6 });
  };
}
const daf = {
  key: "daf", name: "Daf", rolle: "perkussion", pan: 0.05, pegel: -2,
  parameter: [...GEMEINSAM(60, 42, 95), P("ringe", "Ringe", "Instrument", 0, 100, 55, "%", { hilfe: "die Ringketten innen am Rahmen" }), P("rasseln", "Nachrasseln", "Spiel", 0, 100, 45, "%")],
  artikulationen: [{ key: "dum", name: "Dum (Mitte)" }, { key: "tek", name: "Tek (Rand)" }, { key: "fing", name: "Finger (Rand, leicht)" }, { key: "sak", name: "Sak (geschlossen)" }, { key: "riz", name: "Riz (Ringe geschüttelt)" }],
  klassen: { M: "dum", B: "dum", BC: "sak", H: "tek", HC: "fing" },
  varianten: [V("kurdisch", "tief mit Ringen", {}), V("Sufi", "gross, lang, viel Ring", { ton: 52, klang: 1.5, ringe: 75, rasseln: 70 }), V("ohne Ringe", "wie eine Tar", { ringe: 0, ton: 66 }), V("hell", "kleiner, straff", { ton: 76, hell: 2, haerte: 75 }), V("ECM Raum", "weich, schwebend", { haerte: 25, hell: -3, klang: 1.7, ringe: 30, breite: 70 }), V("trocken", "nah", { klang: 0.55, rasseln: 15 })],
  rechne(w, rate, { art = "dum", staerke, seed }) {
    const f = w.ton, M = MEMBRAN.map((r) => f * r), rg = w.ringe / 100, ras = 0.02 + 0.12 * (w.rasseln / 100);
    let teile;
    if (art === "dum") teile = [{ moden: [{ f: M[0], a: 1, t60: 1 }, { f: M[1], a: 0.3, t60: 0.6 }, { f: M[3], a: 0.3, t60: 0.45 }, { f: M[8], a: 0.1, t60: 0.25 }], anschlag: 0.003, funktion: rg ? ringe(4, ras, rg * 0.25) : null }];
    else if (art === "riz") teile = [{ funktion: ringe(14, ras * 2.5 + 0.08, rg || 0.5) }];
    else if (art === "sak") teile = [{ moden: [{ f: M[2], a: 0.6, t60: 0.06 }, { f: M[5], a: 0.4, t60: 0.05 }], anschlag: 0.002, rauschen: [{ staerke: 0.5, t60: 0.03, auf: 0.0005, art: "band", f: 850, q: 0.7 }], funktion: rg ? ringe(2, 0.008, rg * 0.15) : null }];
    else { const l = art === "fing" ? 0.6 : 1; teile = [{ moden: [5.4, 7, 8.9, 11.1].map((r, i) => ({ f: f * r, a: [1, 0.7, 0.45, 0.25][i] * l, t60: [0.22, 0.17, 0.12, 0.08][i] })), anschlag: art === "fing" ? 0.0006 : 0.0004, rauschen: [{ staerke: 0.3 * l, t60: 0.008, auf: 0.0002, art: "band", f: 2800, q: 0.8, hellAbh: true }], funktion: rg ? ringe(art === "fing" ? 3 : 6, ras, rg * (art === "fing" ? 0.35 : 0.6)) : null }]; }
    return schlag(w, rate, { staerke, seed }, teile, art === "fing" ? 0.55 : art === "sak" ? 0.6 : art === "riz" ? 0.6 : art === "tek" ? 0.85 : 1);
  },
};

// ---------- Davul (Dohol): grosse Doppelfelltrommel; Schlegel (Tokmak) auf dem Bassfell, dünne Rute (Çubuk) auf dem anderen ----------
/** mehrere schnelle Rutenschläge (Wirbel, «trr») */
function rute(f, anzahl, zeit, staerke) {
  return (s, rate, rnd) => {
    for (let k = 0; k < anzahl; k++) {
      const t = (k * zeit) / anzahl + rnd() * 0.004, a = staerke * (0.55 + 0.45 * rnd()) * (k === anzahl - 1 ? 1.2 : 1);
      moden(s, rate, [4.6, 6.3, 8.4].map((r, i) => ({ f: f * r, a: a * [1, 0.6, 0.35][i], t60: 0.1 })), { anschlag: 0.0003, start: Math.round(t * rate) });
      rauschen(s, rate, rnd, { staerke: a * 0.4, t60: 0.006, auf: 0.0001, art: "band", f: 3000, q: 0.8, start: Math.round(t * rate) });
    }
  };
}
const davul = {
  key: "davul", name: "Davul", rolle: "perkussion", pan: 0, pegel: -1,
  parameter: [...GEMEINSAM(56, 40, 90), P("rute", "Rutenfell", "Instrument", 100, 260, 165, "Hz", { skala: "log", hilfe: "das dünnere Fell für die Rute" })],
  artikulationen: [{ key: "dum", name: "Dum (Schlegel)" }, { key: "tek", name: "Tek (Rute)" }, { key: "kapali", name: "Kapalı (gedämpft)" }, { key: "trr", name: "Trr (Rutenwirbel)" }],
  klassen: { M: "dum", B: "dum", BC: "kapali", H: "tek", HC: "tek" },
  varianten: [V("Davul", "gross, offen", {}), V("Dohol", "persisch, etwas höher, trockener", { ton: 64, klang: 0.75, rute: 190 }), V("Feld", "draussen, lang", { klang: 1.5, hell: -1 }), V("tief", "sehr gross", { ton: 46, hell: -2, klang: 1.3 }), V("trocken", "nah, kurz", { klang: 0.5 }), V("weich", "Filzschlegel", { haerte: 25, hell: -3 })],
  rechne(w, rate, { art = "dum", staerke, seed }) {
    const f = w.ton, M = MEMBRAN.map((r) => f * r), r = w.rute;
    let teile;
    if (art === "dum" || art === "kapali") teile = [{ moden: [{ f: M[0], a: 1, t60: art === "kapali" ? 0.14 : 0.8 }, { f: M[1], a: 0.35, t60: art === "kapali" ? 0.08 : 0.5 }, { f: M[3], a: 0.25, t60: 0.35 }, { f: M[6], a: 0.1, t60: 0.2 }], anschlag: 0.004, gleiten: -0.7, gleitZeit: 0.25, rauschen: [{ staerke: 0.3, t60: 0.03, auf: 0.0012, art: "band", f: 180, q: 0.7 }, { staerke: 0.06, t60: 0.01, auf: 0.0005, art: "band", f: 1200, q: 0.8 }] }];
    else if (art === "trr") teile = [{ funktion: rute(r, 4, 0.07, 0.8) }];
    else teile = [{ moden: [4.6, 6.3, 8.4, 10.9].map((k, i) => ({ f: r * k * 0.25, a: [1, 0.6, 0.4, 0.2][i], t60: [0.18, 0.13, 0.1, 0.07][i] })), anschlag: 0.00025, rauschen: [{ staerke: 0.5, t60: 0.008, auf: 0.0001, art: "band", f: 3200, q: 0.8, hellAbh: true }] }];
    return schlag(w, rate, { staerke, seed }, teile, art === "tek" ? 0.75 : art === "trr" ? 0.7 : art === "kapali" ? 0.85 : 1);
  },
};

// ---------- Naqareh: ein Paar kleiner Kesselpauken, mit Stöcken gespielt (Persien) ----------
const KESSEL = [1, 1.5, 1.98, 2.44, 2.9];   // die Luft im Kessel rückt die Moden fast harmonisch (Rossing)
const naqareh = {
  key: "naqareh", name: "Naqareh", rolle: "perkussion", pan: 0.2, pegel: -3,
  parameter: [...GEMEINSAM(150, 100, 220), P("hoch", "hoher Kessel", "Instrument", 200, 420, 270, "Hz", { skala: "log" })],
  artikulationen: [{ key: "dom", name: "Dom (tiefer Kessel)" }, { key: "tak", name: "Tak (hoher Kessel)" }, { key: "kur", name: "Kur (tief, gedämpft)" }, { key: "rez", name: "Rez (Wirbel)" }],
  klassen: { M: "dom", B: "dom", BC: "kur", H: "tak", HC: "tak" },
  varianten: [V("Zeremonie", "hell, Stöcke", {}), V("tief", "grösser", { ton: 125, hoch: 230, hell: -1.5 }), V("trocken", "kurz", { klang: 0.55 }), V("weich", "Filzstöcke", { haerte: 25, hell: -3 }), V("Raum", "weit", { klang: 1.4, breite: 60 }), V("hell", "kleiner", { ton: 180, hoch: 330, hell: 2 })],
  rechne(w, rate, { art = "dom", staerke, seed }) {
    const kessel = (f, t60, a = 1) => ({ moden: KESSEL.map((r, i) => ({ f: f * r, a: a * [0.5, 1, 0.6, 0.35, 0.2][i], t60: t60 * [0.7, 1, 0.8, 0.6, 0.45][i] })), anschlag: 0.0003, rauschen: [{ staerke: 0.35 * a, t60: 0.006, auf: 0.0001, art: "band", f: 3500, q: 0.8, hellAbh: true }] });
    let teile;
    if (art === "dom") teile = [kessel(w.ton, 0.55)];
    else if (art === "kur") teile = [kessel(w.ton, 0.09)];
    else if (art === "tak") teile = [kessel(w.hoch, 0.35)];
    else teile = [0, 1, 2, 3, 4].map((k) => ({ ...kessel(k % 2 ? w.hoch : w.ton, 0.25, 0.5 + 0.12 * k), start: k * 0.026 }));
    return schlag(w, rate, { staerke, seed }, teile, art === "tak" ? 0.8 : art === "kur" ? 0.75 : 1);
  },
};

// ---------- Metall: Manjira (dicke kleine Zimbeln, Indien) und Sagat (Fingerzimbeln, Ägypten) ----------
// Zwei Becken klingen leicht verschieden: ihre Moden schweben gegeneinander. Die Moden liegen über 2 kHz und sind unharmonisch, damit
// nichts nach Kuhglocke klingt (Lehre aus dem Urteil vom 9. November 2026: kurze Sinuspulse um 1 kHz).
const ZIMBEL = [1, 1.59, 2.14, 2.76, 3.42, 4.18, 5.07];
function zimbelPaar(f, t60, a, rnd, verstimmt = 0.007) {
  return [0, 1].flatMap((b) => ZIMBEL.map((r, i) => ({ f: f * r * (1 + (b ? verstimmt : 0)) * (1 + 0.004 * (rnd() - 0.5)), a: a * [0.7, 1, 0.8, 0.6, 0.45, 0.3, 0.2][i] * (b ? 0.8 : 1), t60: t60 * (1 - i * 0.09), phase: rnd() * TAU })));
}
const zimbel = (name, key, std, min, max, arten, mehr) => ({
  key, name, rolle: "perkussion", pegel: -9, ...mehr,
  parameter: [...GEMEINSAM(std, min, max)],
  rechne(w, rate, { art = arten[0], staerke, seed }) {
    let rs = seed >>> 0 || 1; const rnd = () => ((rs = (Math.imul(rs, 1664525) + 1013904223) >>> 0) / 4294967296);
    const offen = art === arten[0], f = w.ton;
    const teile = offen
      ? [{ moden: zimbelPaar(f, 1.3, 1, rnd), anschlag: 0.00025, rauschen: [{ staerke: 0.2, t60: 0.02, auf: 0.0001, art: "band", f: 6000, q: 0.7, hellAbh: true }] }]
      : art === arten[1]
        ? [{ moden: zimbelPaar(f, 0.07, 0.8, rnd, 0.012), anschlag: 0.0004, rauschen: [{ staerke: 0.5, t60: 0.02, auf: 0.0002, art: "band", f: 4500, q: 0.7 }] }]
        : [{ moden: zimbelPaar(f * 0.97, 0.035, 0.5, rnd, 0.02), anschlag: 0.0006, rauschen: [{ staerke: 0.7, t60: 0.012, auf: 0.0002, art: "band", f: 3000, q: 0.8 }] }];
    return schlag(w, rate, { staerke, seed }, teile, offen ? 1 : 0.8);
  },
});
const manjira = { ...zimbel("Manjira", "manjira", 2350, 1800, 3200, ["chin", "chik", "chak"], { pan: 0.35 }),
  artikulationen: [{ key: "chin", name: "Chin (offen)" }, { key: "chik", name: "Chik (geschlossen)" }, { key: "chak", name: "Chak (gepresst)" }],
  klassen: { M: "chin", B: "chin", BC: "chak", H: "chik", HC: "chik" },
  varianten: [V("Bhajan", "warm, klingend", { hell: -2 }), V("hell", "kleiner", { ton: 2800, hell: 0 }), V("dunkel", "gross, Bronze", { ton: 2000, hell: -3.5, klang: 1.3 }), V("kurz", "nah", { klang: 0.5, hell: -2 }), V("Raum", "lang, breit", { klang: 1.6, breite: 70, hell: -2.5 }), V("weich", "leise angeschlagen", { haerte: 25, hell: -3 })] };
const sagat = { ...zimbel("Sagat", "sagat", 3100, 2500, 4200, ["zil", "tak", "klak"], { pan: -0.35 }),
  artikulationen: [{ key: "zil", name: "Zil (offen)" }, { key: "tak", name: "Tak (gedämpft)" }, { key: "klak", name: "Klak (gepresst)" }],
  klassen: { M: "zil", B: "zil", BC: "klak", H: "tak", HC: "tak" },
  varianten: [V("Raqs", "klar", { hell: -1.5 }), V("dunkel", "Messing", { ton: 2700, hell: -3.5 }), V("hell", "klein", { ton: 3600, hell: 0 }), V("kurz", "trocken", { klang: 0.5, hell: -2 }), V("Raum", "lang", { klang: 1.5, breite: 70, hell: -2.5 }), V("weich", "zart", { haerte: 25, hell: -3 })] };

// ---------- die Stimmen aus 0.1.0 mit ihren Klassen ----------
const tabla = mit(S0.tabla, { M: "dha", B: "ge", BC: "ke", H: "na", HC: "ti" });
const darbuka = mit(S0.darbuka, { M: "doum", B: "doum", BC: "pa", H: "tek", HC: "ka" });
const rahmen = mit(S0.rahmen, { M: "dum", B: "dum", BC: "sak", H: "tek", HC: "tek" });
const riq = mit(S0.riq, { M: "dum", B: "dum", BC: "sak", H: "tek", HC: "tek" });
const zarb = mit(S0.zarb, { M: "tom", B: "tom", BC: "eshare", H: "bak", HC: "eshare" });
const udu = mit(S0.udu, { M: "bum", B: "bum", BC: "fing", H: "ton", HC: "fing" });

export default {
  id: "perkussion", version: "0.2.0", name: "Perkussion",
  beschreibung: "Fell-, Ton-, Holz- und Metallmoden: Tabla, Mridangam, Kanjira, Ghatam, Dholak, Darbuka, Riq, Rahmentrommel, Daf, Zarb, Davul, Naqareh, Udu, Manjira, Sagat.",
  stimmen: Object.fromEntries([tabla, mridangam, kanjira, ghatam, dholak, darbuka, riq, rahmen, daf, zarb, davul, naqareh, udu, manjira, sagat].map((s) => [s.key, s])),
};
