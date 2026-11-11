// Groove 0.1.0 – Drum-Grooves aus dem Startwert für Drum and Bass und Ornament (11. November 2026).
//
// Christian: «bringt drum n bass eigentlich immer den gleichen beat?» – ja, bis hier standen Kick, Snare und Hats als feste Zeilen in
// kern/muster.js, in jedem Track gleich; der Startwert änderte nur das Drumherum. Jetzt baut ein Generator je Track einen eigenen Groove:
//   Familie   Two-Step, Halftime, Steppers, Jungle-Break oder Rollend (aus dem Startwert, je Stil gewichtet, oder von Hand gewählt)
//   Phrase    vier Takte Kick und Snare, zwei Takte Hats; Takt 2 und 4 weichen ab, Takt 4 endet mit einem Auftakt
//   Abschnitte  jeder Abschnitt des Tracks bekommt eine eigene Abwandlung (Gas geben dichter oder als zerhackter Break, Atmen ausgedünnt,
//             Stocken mit Löchern, Wiederfinden leicht verändert) und einen eigenen Wirbel am Ende
// Der Backbeat (Snare auf 2 und 4, im Halftime auf 3) bleibt als Anker. Ausgabe sind gewöhnliche Musterzeilen (kern/muster.js): ansehen,
// von Hand ändern, unterbrechen wie bisher. Gleiche Eingaben, gleiche Zeilen.

import { zufall } from "../erzeuger/grund.js";

export const GROOVE = "groove@0.1.0";

/**
 * Familien. kicks: Kick-Stellen je Takt (Sechzehntel, die erste Zeile ist die typische); mehr: Stellen für zusätzliche Kicks;
 * snare: Hauptschläge; geister: Stellen für Geisternoten (vorn die wahrscheinlicheren); gp: Grundwahrscheinlichkeit einer Geisternote;
 * hats: Gefühle der Hi-Hat mit Gewicht; swing: Swing der Hats (Anteil eines Sechzehntels).
 */
export const FAMILIEN = Object.freeze({
  zweischritt: { name: "Two-Step", beschreibung: "Kick auf 1 und kurz vor 3, Snare auf 2 und 4: der klassische Zweischritt",
    kicks: [[0, 10], [0, 10], [0, 7, 10], [0, 10, 13], [0, 3, 10], [0, 10, 11], [0, 6, 10]], mehr: [7, 13, 14, 3, 6, 11],
    snare: [4, 12], geister: [7, 15, 9, 14, 2, 10], gp: 0.3, hats: { achtel: 3, gebrochen: 3, sechzehntel: 2, offbeat: 2 }, swing: 0 },
  halftime: { name: "Halftime", beschreibung: "Snare nur auf 3, viel Raum: fühlt sich halb so schnell an, die Hats laufen voll",
    kicks: [[0], [0, 11], [0, 3], [0, 6, 11], [0, 14], [0, 10, 11]], mehr: [11, 14, 6, 3, 13],
    snare: [8], geister: [14, 3, 11, 6, 15, 13], gp: 0.25, hats: { sechzehntel: 3, gebrochen: 2, rollend: 2, achtel: 1 }, swing: 0.03 },
  steppers: { name: "Steppers", beschreibung: "Kick gerade auf 1 und 3, treibend und schlicht",
    kicks: [[0, 8], [0, 8], [0, 8, 14], [0, 6, 8], [0, 8, 11]], mehr: [14, 6, 11, 3],
    snare: [4, 12], geister: [15, 7, 14, 2], gp: 0.2, hats: { offbeat: 3, achtel: 3, sechzehntel: 1 }, swing: 0 },
  jungle: { name: "Jungle-Break", beschreibung: "zerhackter Breakbeat: doppelte Kick, viele Geisternoten, Snare-Läufe",
    kicks: [[0, 2, 10, 11], [0, 2, 10], [0, 2, 11], [0, 10, 11]], mehr: [6, 14, 7],
    snare: [4, 12], geister: [7, 9, 15, 14, 6, 2, 13], gp: 0.55, hats: { sechzehntel: 3, rollend: 2, gebrochen: 2 }, swing: 0.04, laeufe: true },
  rollend: { name: "Rollend", beschreibung: "Two-Step mit leisen Kicks dazwischen und rollenden Geister-Snares, Hats in Dreiergruppen",
    kicks: [[0, 10], [0, 7, 10], [0, 10, 14]], mehr: [6, 14, 3, 13], leise: [6, 14, 13],
    snare: [4, 12], geister: [7, 10, 15, 2, 9, 14], gp: 0.45, hats: { rollend: 3, sechzehntel: 3, gebrochen: 1 }, swing: 0.05, laeufe: true },
});

/** Gewichte der Familien je Stil (Ornament ist Halftime-Gefühl, DnB eher Two-Step und Break) */
export const STIL_GROOVES = Object.freeze({
  dnb: { zweischritt: 30, rollend: 25, jungle: 20, steppers: 15, halftime: 10 },
  ornament: { halftime: 30, zweischritt: 25, rollend: 25, jungle: 10, steppers: 10 },
});

// Hi-Hat-Gefühle (ein Takt); «rollend» betont in Dreiergruppen quer zum Takt (3+3+3+3+4)
const HATS = {
  achtel: "x . o . x . o . x . o . x . o .",
  gebrochen: "x . o g x . o . x . o g x . o g",
  sechzehntel: "x g o g x g o g x g o g x g o g",
  offbeat: ". . x . . . x . . . x . . . x .",
  rollend: "x g g x g g x g g x g g x g o g",
  viertel: "x . . . o . . . x . . . o . . .",
};

const leer = () => Array(16).fill(".");
const zl = (a) => a.join(" ");
const tok = (z) => String(z).trim().split(/\s+/);
const waehle = (rnd, liste) => liste[Math.floor(rnd() * liste.length)];
function gewichtet(rnd, gew) {
  const e = Object.entries(gew).filter(([, w]) => w > 0), s = e.reduce((a, [, w]) => a + w, 0);
  let r = rnd() * s;
  for (const [k, w] of e) if ((r -= w) < 0) return k;
  return e[e.length - 1][0];
}

/** Familie aus dem Startwert (je Stil gewichtet) */
export function familieWaehlen(stil, seed) {
  return gewichtet(zufall(seed * 4099 + 5), STIL_GROOVES[stil] ?? STIL_GROOVES.dnb);
}

// ---------- Bausteine ----------

function kickTakt(fam, stellen, { leise = [] } = {}) {
  const t = leer();
  for (const s of stellen) if (!fam.snare.includes(s)) t[s] = s === 0 ? "x!" : "x";
  for (const s of leise) if (t[s] === "." && !fam.snare.includes(s)) t[s] = "x_";
  return t;
}
/** eine Kick mehr (an einer freien Stelle aus «mehr») */
function kickDazu(fam, t, rnd) {
  let frei = fam.mehr.filter((s) => t[s] === "." && !fam.snare.includes(s));
  if (!frei.length) frei = [3, 6, 7, 11, 13, 14, 2].filter((s) => t[s] === "." && !fam.snare.includes(s));
  if (frei.length) t[waehle(rnd, frei.slice(0, 3))] = "x";
  return t;
}

/** ein Snare-Takt: Hauptschläge betont, Geisternoten nach Wahrscheinlichkeit (nicht auf der Kick) */
function snareTakt(fam, kick, p, rnd, { geister = true, rand = 0 } = {}) {
  const t = leer();
  for (const s of fam.snare) t[s] = "x!";
  if (!geister) return t;
  fam.geister.forEach((s, i) => {
    if (t[s] !== "." || kick[s] !== "." && kick[s] !== "x_") return;
    if (rnd() < p * (1.25 - i * 0.12)) t[s] = rnd() < rand ? "rand_" : "g";
  });
  return t;
}
/** Auftakt am Ende einer Phrase: eine Geisternote oder ein kleiner Lauf (Zweiunddreissigstel) */
function auftakt(fam, t, rnd, komplex) {
  const r = rnd();
  if (fam.laeufe && r < 0.35 + komplex * 0.4) { t[14] = "g"; t[15] = "[g o]"; }
  else if (r < 0.5 + komplex * 0.3) { if (t[15] === ".") t[15] = "g"; if (komplex > 0.5 && t[13] === ".") t[13] = "g"; }
  return t;
}

/** Hats: ein Gefühl, zwei Takte; Takt 2 weicht ab, die Dichte nimmt Geisternoten weg oder setzt welche dazu */
function hatTakte(gefuehl, rnd, { dichte, komplex }) {
  const a = tok(HATS[gefuehl]);
  const duenn = (t) => t.map((x) => (x === "g" && rnd() > dichte * 1.4 ? "." : x));
  const t1 = duenn([...a]), t2 = duenn([...a]);
  if (komplex > 0.25 && rnd() < komplex) { const s = waehle(rnd, [3, 7, 11, 13]); if (t2[s] === ".") t2[s] = "g"; }
  if (komplex > 0.4 && rnd() < komplex * 0.6) t2[14] = "[x x]";
  if (rnd() < 0.3) t2[15] = ".";
  return [zl(t1), zl(t2)];
}
function offenTakte(gefuehl, rnd) {
  const art = gefuehl === "offbeat" ? "keine" : waehle(rnd, gefuehl === "achtel" ? ["ende", "offbeats", "keine"] : ["ende", "ende", "keine", "zwei"]);
  const t1 = leer(), t2 = leer();
  if (art === "ende") t2[14] = "x";
  if (art === "offbeats") { t1[6] = "o"; t2[6] = "o"; t2[14] = "x"; }
  if (art === "zwei") { t1[10] = "o"; t2[2] = "o"; t2[10] = "o"; }
  return [zl(t1), zl(t2)];
}
function shakerTakte(rnd, dichte) {
  const art = waehle(rnd, dichte > 0.55 ? ["voll", "voll", "offbeat"] : ["voll", "offbeat", "achtel"]);
  return [{ voll: "x g o g x g o g x g o g x g o g", offbeat: ". . o . . . o . . . o . . . o .", achtel: "o . g . o . g . o . g . o . g ." }[art]];
}
function rimTakte(rnd) {
  const a = leer(), b = leer();
  const s = waehle(rnd, [[14], [3, 10], [6], [10, 15]]);
  s.forEach((i) => (b[i] = "x_"));
  if (rnd() < 0.4) a[waehle(rnd, [7, 11])] = "x_";
  return [zl(a), zl(b)];
}

/** Wirbel am Ende eines Abschnitts (letzter Takt der Snare) */
function fillTakt(fam, rnd, komplex) {
  const halb = fam.snare.length === 1, auswahl = halb ? [
    ". . . . . . . . x! . . g x x [x x] [x x]",
    ". . . . . . g . x! . . . x . x x",
    ". . . . . . . . x! . . . [g g] [o o] [x x] [x! x!]",
  ] : [
    ". . . . x! . . . x . x . x x x x",
    ". . . . x! . . g . . x . [x x] x [x x] x",
    ". . . . x! . g . x . . x . x x x",
    ". . . . x! . . . [g g] [g o] [o o] [o x] [x x] [x x] [x x] [x! x!]",
  ];
  if (fam.laeufe && komplex > 0.4) auswahl.push(halb ? ". . g . . . g . x! . g x [g g] x [x x] [x x]" : ". . x . x! . g x . x . x [x x] x [x x] [x x]");
  return waehle(rnd, auswahl);
}

// ---------- Phrase und Abschnitte ----------

/** die Grundphrase einer Familie: Kick und Snare je vier Takte, Hats zwei */
function phrase(fam, rnd, { dichte, komplex }, mutation = 0) {
  const A = rnd() < 0.45 ? fam.kicks[0] : waehle(rnd, fam.kicks);
  const B = rnd() < 0.25 + komplex * 0.45 ? waehle(rnd, fam.kicks) : A;
  const leise = fam.leise ? fam.leise.filter(() => rnd() < 0.3 + dichte * 0.5) : [];
  const k = [kickTakt(fam, A, { leise }), kickTakt(fam, B, { leise }), kickTakt(fam, A, { leise }), kickDazu(fam, kickTakt(fam, A, { leise }), rnd)];
  if (mutation > 0) kickDazu(fam, k[1], rnd);
  const p = fam.gp * (0.35 + dichte * 1.3) + mutation * 0.1, rand = komplex > 0.5 ? (komplex - 0.5) * 0.5 : 0;
  const s1 = snareTakt(fam, k[0], p, rnd, { rand }), s2 = snareTakt(fam, k[1], p, rnd, { rand });
  const s4 = auftakt(fam, snareTakt(fam, k[3], p, rnd, { rand }), rnd, komplex);
  return { kick: k.map(zl), snare: [zl(s1), zl(s2), zl(s1), zl(s4)] };
}

/** zerhackter Break für «Gas geben» (auch ausserhalb der Jungle-Familie) */
function brk(rnd, opt) {
  return phrase(FAMILIEN.jungle, rnd, { dichte: Math.max(0.6, opt.dichte), komplex: Math.max(0.6, opt.komplex) });
}

/**
 * einen Groove erzeugen. stil: "dnb" | "ornament"; familie: Schlüssel oder "auto"; dichte und komplex 0–100; abschn: die Abschnitte des
 * Tracks (kern/arrangement.js) oder null für eine Schleife. Gibt { familie, name, info, spuren: { stimme: { takte, fill, teile, swing } } }.
 * Die Grundzeilen hängen nicht von den Abschnitten ab: Spuren erzeugen und Track erzeugen mit gleichem Startwert haben dieselbe Phrase.
 */
export function grooveErzeugen({ stil = "dnb", seed = 1, familie = "auto", dichte = 50, komplex = 50, abschn = null } = {}) {
  const key = familie && familie !== "auto" && FAMILIEN[familie] ? familie : familieWaehlen(stil, seed), fam = FAMILIEN[key];
  const opt = { dichte: dichte / 100, komplex: komplex / 100 }, rnd = zufall(seed * 1009 + 7);
  const grund = phrase(fam, rnd, opt);
  const gefuehl = gewichtet(rnd, { ...fam.hats, ...(opt.dichte > 0.65 ? { sechzehntel: (fam.hats.sechzehntel ?? 1) + 2 } : opt.dichte < 0.35 ? { achtel: (fam.hats.achtel ?? 1) + 2, offbeat: (fam.hats.offbeat ?? 0) + 1 } : {}) });
  const hat = hatTakte(gefuehl, rnd, opt), offen = offenTakte(gefuehl, rnd), shaker = shakerTakte(rnd, opt.dichte), rim = rimTakte(rnd);
  const spuren = {
    kick: { takte: grund.kick, fill: null, teile: null },
    snare: { takte: grund.snare, fill: fillTakt(fam, rnd, opt.komplex), teile: null },
    hat: { takte: hat, fill: null, teile: null, swing: fam.swing },
    offen: { takte: offen, fill: null, teile: null, swing: fam.swing },
    shaker: { takte: shaker, fill: null, teile: null, swing: fam.swing },
    rim: { takte: rim, fill: null, teile: null },
  };
  const abschnitte = [];
  if (abschn?.length) {
    for (const s of Object.values(spuren)) s.teile = [];
    abschn.forEach((a, idx) => {
      const r = zufall(seed * 2003 + idx * 101 + 13), v = abwandlung(a.typ, fam, r, opt, grund, gefuehl);
      const fill = ["intro", "outro"].includes(a.typ) ? null : fillTakt(fam, r, opt.komplex);
      for (const [stimme, s] of Object.entries(spuren)) s.teile.push({ von: a.von, bis: a.bis, takte: v[stimme] ?? null, fill: stimme === "snare" ? fill : null });
      abschnitte.push({ typ: a.typ, art: v.art });
    });
  }
  const info = `${fam.name}: ${fam.beschreibung}. Hats ${gefuehl === "rollend" ? "in Dreiergruppen" : gefuehl}${fam.swing ? `, Swing ${Math.round(fam.swing * 100)} %` : ""}.`;
  return { familie: key, name: fam.name, gefuehl, info, abschnitte, spuren };
}

/** Abwandlung je Abschnitt; null = die Grundzeilen */
function abwandlung(typ, fam, r, opt, grund, gefuehl) {
  if (typ === "gas") {
    if (fam !== FAMILIEN.jungle && r() < 0.25 + opt.komplex * 0.5) { const b = brk(r, opt); return { ...b, hat: hatTakte("sechzehntel", r, { ...opt, dichte: 1 }), offen: [zl(leer()), ". . x . . . . . . . x . . . . ."], art: "Break" }; }
    const k = grund.kick.map((z) => zl(kickDazu(fam, tok(z), r)));
    const p = phrase(fam, r, { dichte: Math.min(1, opt.dichte + 0.35), komplex: Math.min(1, opt.komplex + 0.2) }, 1);
    return { kick: k, snare: p.snare, hat: hatTakte(gefuehl === "rollend" ? "rollend" : "sechzehntel", r, { ...opt, dichte: 1 }), offen: [". . x . . . . . . . x . . . . .", ". . x . . . . . . . x . . . x ."], shaker: ["x g o g x g o g x g o g x g o g"], art: "dichter" };
  }
  if (typ === "atmen") {
    const sn = leer(); sn[fam.snare.length === 1 ? 8 : 12] = "o";
    return { kick: ["x! . . . . . . . . . . . . . . .", zl(leer())], snare: [zl(leer()), zl(sn)], hat: hatTakte(r() < 0.5 ? "viertel" : "offbeat", r, { ...opt, dichte: 0.2 }), offen: [zl(leer())], shaker: [". . o . . . o . . . o . . . o ."], rim: [". . . . x_ . . . . . . x_ . . . .", ". . . x_ . . . . . . x_ . . . . x_"], art: "ausgedünnt" };
  }
  if (typ === "stocken") {
    const s = grund.snare.map((z) => zl(tok(z).map((x) => (x === "x!" ? x : "."))));
    return { kick: [grund.kick[0], "x! . . . . . . . . . . . . . . ."], snare: s.slice(0, 2), rim: [". . . . . . x_ . . . . . . . x_ ."], art: "mit Löchern" };
  }
  if (typ === "wiederfinden") { const p = phrase(fam, r, opt, 1); return { kick: p.kick, snare: p.snare, art: "leicht verändert" }; }
  if (typ === "aufbau") return { snare: [zl(snareTakt(fam, leer(), 0, r, { geister: false }))], hat: hatTakte("achtel", r, opt), art: "nur Backbeat" };
  if (typ === "outro" || typ === "intro") return { hat: hatTakte("viertel", r, { ...opt, dichte: 0.2 }), offen: [zl(leer())], art: "ruhig" };
  return { art: "Grundgroove" };
}
