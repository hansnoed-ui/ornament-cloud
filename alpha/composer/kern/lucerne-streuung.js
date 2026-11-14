// ornament.lucerne · Streuung (14.11.2026, Christians «Schritt 2»): Lucerne verteilt Groove, Einstieg, Bass-Einsatz, Beat-Loch,
// Drum-Variante, Aufbau, Makros, Geräusche und Flächen selbst über den Startwert. Die Palette stammt aus den Tracks, die Christian
// gutgeheissen hat (Maxi «directer», Strikk 3: T1b Piano, T2b Spunds, T3b Classics). Urteile wirken nur als sanfte Gewichte
// (vielfalt-statt-vorlieben): jede Vorlage bleibt möglich, Mischungen zwischen Vorlagen sind gewollt.
//
// Ohne Streuung («klassisch») plant Lucerne wie bisher; die Maxi bleibt damit bitgleich. streuen() gibt nur Eingaben für planen()
// zurück – was der Aufrufer ausdrücklich setzt, gewinnt immer.

import { zufall, hash } from "../erzeuger/grund.js";

/** Gewichte der Vorlagen (1 = gut). Höhere Werte machen eine Vorlage wahrscheinlicher, nie ausschliesslich. */
export const GEWICHTE_STD = Object.freeze({ maxi: 1, piano: 1, spunds: 1, classics: 1 });

/** Grooves je Vorlage (zwei Takte A/B, Schritte 1–16) */
const GROOVES = {
  maxi: { A: { kick: [1, 7, 9], snare: [5, 13], hat: [1, 3, 5, 7, 9, 11, 13, 15], offen: [], ghost: [12] }, B: { kick: [1, 8, 11], snare: [5, 13], hat: [1, 3, 5, 7, 9, 11], offen: [15], ghost: [16] } },
  piano: { A: { kick: [1, 4, 11], snare: [5, 13], hat: [1, 3, 5, 7, 9, 11, 13, 15], offen: [], ghost: [10, 16] }, B: { kick: [1, 7, 9, 12], snare: [5, 13], hat: [1, 3, 5, 7, 9, 11, 13], offen: [15], ghost: [8] } },
  spunds: { A: { kick: [1, 11], snare: [5, 13], hat: [1, 3, 4, 7, 9, 11, 12, 15], offen: [], ghost: [8, 16] }, B: { kick: [1, 4, 11], snare: [5, 13], hat: [1, 3, 5, 7, 9, 11, 13, 15], offen: [7], ghost: [14] }, C: { kick: [1, 8, 11, 14], snare: [5, 13], hat: [3, 7, 11, 15], offen: [16], ghost: [10] } },
  classics: { A: { kick: [1, 10], snare: [9], hat: [1, 3, 5, 7, 9, 11, 13, 15], offen: [], ghost: [12] }, B: { kick: [1, 4, 10, 12], snare: [9], hat: [1, 3, 5, 7, 9, 11, 13, 14, 15], offen: [16], ghost: [] } },
};
const TIMINGS = {
  maxi: { kick: [0, 0, 2], snare: [0, 20, 3], hat: [0.2, 9, 4], offen: [0.2, 9, 3], ghost: [0.18, 16, 4] },
  piano: { kick: [0, 0, 2], snare: [0, 14, 3], hat: [0.16, 6, 4], offen: [0.16, 6, 3], ghost: [0.16, 12, 4] },
  spunds: { kick: [0, 0, 1], snare: [0, 4, 2], hat: [0.12, 2, 3], offen: [0.12, 2, 2], ghost: [0.12, 6, 3] },
  classics: { kick: [0, 0, 1], snare: [0, 8, 3], hat: [0.18, 2, 3], offen: [0.18, 2, 3], ghost: [0.18, 10, 3] },
};
const DRUMS = {
  maxi: { kick: "Boom Bap", snare: "Boom Bap", ghost: "Boom Bap", hat: "staubig", offen: "staubig" },
  piano: { kick: "Boom Bap", snare: "Boom Bap", ghost: "Boom Bap", hat: "staubig", offen: "staubig" },
  spunds: { kick: "House 909", snare: "Minimal", ghost: "Minimal", hat: "eng", offen: "House" },
  classics: { kick: "808 lang", snare: "gross", ghost: "Minimal", hat: "fein", offen: "fein" },
};
const MAKROS = {
  maxi: { waerme: 45, instabilitaet: 35, fragmentierung: 30, wiederkehr: 60, unterbrechung: 45, knarzen: 55, raum: 45 },
  piano: { raum: 55, wiederkehr: 60, unterbrechung: 55, instabilitaet: 35, fragmentierung: 55, knarzen: 35, waerme: 55 },
  spunds: { raum: 40, wiederkehr: 55, unterbrechung: 30, instabilitaet: 5, fragmentierung: 60, knarzen: 0, waerme: 15 },
  classics: { knarzen: 0, waerme: 15, instabilitaet: 8, unterbrechung: 70, wiederkehr: 55, raum: 55, fragmentierung: 45 },
};
const BPM = { maxi: [80, 92], piano: [76, 86], spunds: [110, 122], classics: [64, 74] };
const FRAGMENTBEATS = [{ A: [1, 4, 7, 11, 14], B: [3, 7, 9, 13] }, { A: [1, 4, 7, 11, 14], B: [2, 6, 9, 12, 15] }, { A: [1, 5, 8, 12], B: [3, 6, 11, 14] }, null];
const FILLARTEN = [["pause", "offen"], ["kick", "offen"], ["kick", "pause"], ["pause", "hat32"], ["offen", "kick"], ["hat32", "pause"], ["snare", "pause"], ["pause", "kick"]];
const BASSRIFFS = [
  ["1 - . . 1 . 5 - . 1 . . 8 . 7 .", "1 - . . 1 . 5 - . 3 . 5 . . 1 ."],
  ["1 . . 1 . . 5 . 1 . . 8 . . 7 .", "1 - . . 4 . 5 - . 1 . . 3 . 1 ."],
  ["1 - - . . . 5 . 1 - . . . . 8 .", "1 - - . . . 3 . 1 - . . 5 . . ."],
];

const kopie = (x) => JSON.parse(JSON.stringify(x));

/** Gewichtete Wahl aus { schluessel: gewicht } */
function waehle(rnd, gew) {
  const e = Object.entries(gew).filter(([, w]) => w > 0), s = e.reduce((a, [, w]) => a + w, 0);
  let r = rnd() * s;
  for (const [k, w] of e) if ((r -= w) <= 0) return k;
  return e.at(-1)[0];
}
const eins = (rnd, liste) => liste[Math.floor(rnd() * liste.length)];

/** einen Groove leicht abwandeln: eine Kick wandert, ein Ghost kommt dazu oder fällt weg (nie Schlag 1, nie die Snare) */
function abwandeln(rnd, g) {
  const out = kopie(g);
  for (const t of Object.values(out)) {
    if (rnd() < 0.5 && t.kick.length > 1) { const i = 1 + Math.floor(rnd() * (t.kick.length - 1)), neu = t.kick[i] + (rnd() < 0.5 ? -1 : 1); if (neu > 1 && neu <= 16 && !t.kick.includes(neu) && !t.snare.includes(neu)) t.kick[i] = neu; t.kick.sort((a, b) => a - b); }
    if (rnd() < 0.35) { const s = eins(rnd, [4, 8, 10, 12, 14, 16]); if (t.ghost.includes(s)) t.ghost = t.ghost.filter((x) => x !== s); else if (!t.snare.includes(s)) t.ghost = [...t.ghost, s].sort((a, b) => a - b); }
  }
  return out;
}

/**
 * Gerüst aus Bausteinen. Bogen je Vorlage (Erzählung, Zerschnitten, Dunkel), Längen, Beats, Bass, Beat-Loch und Aufbau aus dem
 * Startwert. Ergebnis wie LUC_GERUEST: [[typ, takte, optionen], …]
 */
function geruestBauen(rnd, bogen, { loop = false, gruppen }) {
  const L = (...l) => eins(rnd, l), fills = () => eins(rnd, [8, 8, 4]), fa = () => eins(rnd, FILLARTEN);
  const riff = () => (rnd() < 0.55 ? eins(rnd, BASSRIFFS) : null);
  const beatVoll = () => { const k = ["A", "B", ...(gruppen.includes("C") ? ["C"] : [])]; return rnd() < 0.5 ? null : eins(rnd, [[k[0], k[1]], [k[1], k[0]], ...(k[2] ? [[k[2], k[0]]] : []), "gebrochen", "verschleppt", "boombap"]); };
  const mit = (o, k, v) => (v == null ? o : { ...o, [k]: v });
  const voll = (extra = {}) => { let o = { fills: fills(), fillArten: fa(), ...extra }; o = mit(o, "beat", beatVoll()); const r = riff(); if (r) o.bass = r; if (loop) o.loop = true; return o; };
  const loch = (atmo) => ({ beat: eins(rnd, ["keiner", "keiner", "nurKick", "nurHats"]), bass: eins(rnd, ["lang", "aus", "lang"]), ...(rnd() < 0.5 ? { motiv: false } : {}), atmo: { staerke: atmo, ein: 2, aus: 3 }, ...(loop ? { loop: rnd() < 0.6 } : {}) });
  const verw = () => ({ beat: eins(rnd, ["halbzeit", "halbzeit", "gebrochen", "verschleppt"]), bass: eins(rnd, ["lang", "kick", "lang"]), ...(loop ? { loop: false } : {}) });
  const aufbauIn = rnd() < 0.7;   // einmal ein Aufbau vor der Wiederkehr
  const g = [];
  const auft = L(2, 4, 4, 8);
  g.push(["auftauchen", auft, { beat: auft >= 8 && rnd() < 0.5 ? "nurKick" : "keiner", bass: "aus", ...(rnd() < 0.6 ? { harmonie: true } : {}), motiv: false, atmo: { staerke: +(0.6 + 0.4 * rnd()).toFixed(2), ein: 2, aus: 4 }, ...(loop ? { loop: rnd() < 0.5 } : {}) }]);
  if (bogen === "zerschnitten") {
    g.push(["gedanke", 16, voll()], ["verwandlung", L(8, 8, 16), { ...voll(), loop: false }], ["vertiefung", L(8, 16), voll()]);
    g.push(["freistellung", L(4, 8), loch(0.4)], ["verwandlung", 8, verw()]);
    g.push(["gedanke", 8, { ...voll(), ...(aufbauIn ? { aufbau: true, fills: 0 } : {}) }], ["verwandlung", L(8, 16), { ...voll(), loop: false }]);
    g.push(["wiederkehr", L(8, 16), voll()], ["nachbild", L(6, 8), { beat: "nurHats", bass: "aus", atmo: { staerke: 0.5, ein: 2, aus: 8 }, ...(loop ? { loop: true } : {}) }]);
  } else if (bogen === "dunkel") {
    const a = () => ({ staerke: +(0.65 + 0.3 * rnd()).toFixed(2), ein: 2, aus: 3 });
    g.push(["gedanke", L(12, 16), { ...voll(), atmo: a() }], ["verwandlung", L(4, 8), { beat: "keiner", bass: "lang", atmo: { staerke: 1, ein: 2, aus: 4 } }]);
    g.push(["vertiefung", 16, { ...voll(), atmo: a() }], ["freistellung", L(4, 8), { ...loch(0.95), beat: eins(rnd, ["nurKick", "keiner"]) }]);
    g.push(["wiederkehr", L(8, 12, 16), { ...voll(), atmo: a() }], ["nachbild", L(4, 6, 8), { beat: "keiner", bass: "aus", atmo: { staerke: 1, ein: 1, aus: 8 } }]);
  } else {   // erzählung (Maxi, Piano)
    g.push(["gedanke", 16, { ...voll(), ...(rnd() < 0.5 ? { harmonie: true } : {}) }], ["vertiefung", 16, voll()]);
    g.push(["freistellung", L(4, 8, 8), loch(0.6)], ["verwandlung", L(8, 12, 16), verw()]);
    g.push(["wiederkehr", 16, { ...voll(), ...(aufbauIn ? { aufbau: true } : {}) }], ["nachbild", 8, { beat: eins(rnd, ["nurHats", "keiner"]), bass: "aus", atmo: { staerke: 0.55, ein: 2, aus: 8 } }]);
  }
  // Riffs bleiben in einem Track beisammen: höchstens zwei verschiedene
  const riffs = [...new Set(g.map(([, , o]) => (Array.isArray(o.bass) ? JSON.stringify(o.bass) : null)).filter(Boolean))];
  if (riffs.length > 2) for (const [, , o] of g) if (Array.isArray(o.bass) && !riffs.slice(0, 2).includes(JSON.stringify(o.bass))) o.bass = JSON.parse(riffs[0]);
  return g;
}

/** Geräusche an den Übergängen: Riser endet vor einem Abschnitt, Einschlag auf dessen Eins, Luft und Rumpeln in den leisen Teilen */
function geraeuscheSetzen(rnd, geruest, menge) {
  const out = [];
  let von = 0;
  for (const [typ, l] of geruest) {
    if (von > 0 && rnd() < 0.45 * menge) {
      if (rnd() < 0.6) out.push({ takt: von, art: "riser", variante: eins(rnd, ["hell", "dunkel", "dunkel"]), dauer: eins(rnd, [2, 3, 4]), ende: true, staerke: 0.5 + 0.15 * rnd() });
      if (rnd() < 0.7) out.push({ takt: von, art: "einschlag", variante: eins(rnd, ["kurz", "tief", "weit"]), dauer: 2 + Math.floor(rnd() * 3), staerke: 0.65 + 0.2 * rnd() });
    }
    if (["auftauchen", "freistellung", "nachbild", "verwandlung"].includes(typ) && rnd() < 0.5 * menge) out.push({ takt: von + (typ === "auftauchen" ? 0 : 1), art: eins(rnd, ["luft", "rumpeln", "luft"]), variante: eins(rnd, ["weich", "fern", "hell", "Maschine"]), dauer: Math.max(3, l - 1), staerke: 0.45 + 0.2 * rnd() });
    von += l;
  }
  if (rnd() < 0.4 * menge) out.push({ takt: Math.max(0, von - 6), art: "fall", variante: "lang", dauer: 4, staerke: 0.55 });
  // Varianten je Art gültig halten
  const GUELTIG = { riser: ["hell", "dunkel", "Ton"], fall: ["lang", "kurz"], einschlag: ["tief", "kurz", "weit"], rumpeln: ["fern", "Maschine"], luft: ["hell", "weich"] };
  for (const x of out) if (!GUELTIG[x.art].includes(x.variante)) x.variante = GUELTIG[x.art][0];
  for (const x of out) x.staerke = +x.staerke.toFixed(2);
  return out;
}

/**
 * streuen(seed, { gewichte, material }) → Eingaben für planen() und eine kurze Beschreibung.
 * material (optional): { quelleBpm (Tempo eines Fragment-Loops, dann gilt dieses), nurMoll (Harmonie-Samples ohne Dur-Akkorde),
 *   loop (Fragment-Loop vorhanden) }
 */
export function streuen(seed, { gewichte = GEWICHTE_STD, material = {} } = {}) {
  const rnd = zufall(hash(seed, "streuung")), gew = { ...GEWICHTE_STD, ...gewichte };
  // Grundcharakter und eine zweite Vorlage für Mischungen (Drums aus der einen, Groove aus der anderen …)
  const haupt = waehle(rnd, gew), neben = waehle(rnd, { ...gew, [haupt]: (gew[haupt] ?? 1) * 0.3 });
  const von = () => (rnd() < 0.7 ? haupt : neben);
  const bogenVon = { maxi: "erzaehlung", piano: "erzaehlung", spunds: "zerschnitten", classics: "dunkel" };
  const bogen = rnd() < 0.75 ? bogenVon[haupt] : eins(rnd, ["erzaehlung", "zerschnitten", "dunkel"]);
  const gQ = von("groove"), groove = abwandeln(rnd, GROOVES[gQ]);
  const gruppen = Object.keys(groove);
  const tQ = von("timing"), timing = kopie(TIMINGS[tQ]);
  for (const k of Object.keys(timing)) { timing[k][1] = Math.max(0, Math.round(timing[k][1] * (0.75 + 0.5 * rnd()))); if (timing[k][0]) timing[k][0] = +(timing[k][0] * (0.85 + 0.3 * rnd())).toFixed(3); }
  // Drums: meist ein ganzes Set, manchmal Kick aus dem einen, Becken aus dem anderen
  const dQ = von("drums"), drumVarianten = { ...DRUMS[dQ] };
  if (rnd() < 0.3) { const d2 = DRUMS[neben]; if (rnd() < 0.5) drumVarianten.kick = d2.kick; else { drumVarianten.hat = d2.hat; drumVarianten.offen = d2.offen; } }
  const mQ = von("makros"), makros = Object.fromEntries(Object.entries(MAKROS[mQ]).map(([k, v]) => [k, Math.max(0, Math.min(100, Math.round(v + (rnd() * 2 - 1) * 12)))]));
  const [lo, hi] = BPM[von("tempo")], bpm = material.quelleBpm ?? +(lo + (hi - lo) * rnd()).toFixed(1);
  const einstieg = { auftakt: rnd() < 0.35, bassAb: eins(rnd, [0, 2, 2, 4, 8]) };
  const geruest = geruestBauen(rnd, bogen, { loop: !!material.loop, gruppen });
  const fragmentBeat = eins(rnd, FRAGMENTBEATS);
  const geraeusche = geraeuscheSetzen(rnd, geruest, bogen === "dunkel" ? 1.4 : bogen === "zerschnitten" ? 0.9 : 0.6);
  // Synthese-Fläche in einem bis drei ruhigen oder verwandelten Abschnitten (Index im Gerüst)
  const ruhig = geruest.map(([t], i) => (["verwandlung", "freistellung", "vertiefung"].includes(t) ? i : -1)).filter((i) => i >= 0);
  let flaechen = null;
  if (ruhig.length && rnd() < 0.55) { const ab = ruhig.filter(() => rnd() < 0.6).slice(0, 3); flaechen = [{ key: "flaeche", name: "Fläche (Synthese)", abschnitte: ab.length ? ab : [ruhig[0]], pegel: -18 + Math.round(rnd() * 2), oktave: eins(rnd, [0, -1]), staerke: 0.5 }]; }
  const harmonie = material.nurMoll ? eins(rnd, [{ p1: [1, 1, 1, 1, 4, 4, 1, 1], p2: [1, 1, 4, 4, 1, 1, 5, 5], schluss: [4, 4, 5, 5, 1, 1, 1, 1] }, { p1: [1, 1, 4, 4, 5, 5, 1, 1], p2: [1, 1, 5, 5, 4, 4, 1, 1], schluss: [4, 4, 5, 5, 1, 1, 1, 1] }]) : null;
  const eingaben = { groove, timing, drumVarianten, makros, bpm, einstieg, geruest, fragmentBeat: fragmentBeat ?? undefined, geraeusche, flaechen: flaechen ?? undefined, harmonie: harmonie ?? undefined };
  const beschreibung = { haupt, neben, bogen, groove: gQ, timing: tQ, drums: dQ, makros: mQ, bpm, takte: geruest.reduce((a, [, l]) => a + l, 0) };
  return { eingaben, beschreibung };
}
