// Tonhöhen und Linien: Tonarten mit A = 432 Hz, Melodiezeilen lesen, Basslinien aus einer Drumspur erzeugen.
//
// Eine Melodiezeile ist ein Takt aus Schritten (16 = Sechzehntel, 8 = Achtel, 4 = Viertel), durch Leerzeichen getrennt:
//   1 … 7        Stufe der Tonleiter (8, 9 … eine Oktave höher); b3, #4: Stufe mit Vorzeichen (Halbton tiefer, höher)
//   1'  1,       eine Oktave höher, tiefer (mehrfach möglich: 1'')
//   …~           in diesen Ton gleiten (vom vorigen her)
//   …!  …_       betont, leise
//   -            der vorige Ton klingt weiter (auch über den Taktstrich)
//   .            Pause
// Aus den Stufen wird mit Grundton und Tonleiter die Frequenz.

import { zufall } from "../erzeuger/grund.js";

export const KAMMERTON = 432;
export const NOTEN = Object.freeze(["C", "Cis", "D", "Es", "E", "F", "Fis", "G", "As", "A", "B", "H"]);
export const LEITERN = Object.freeze({
  moll: { name: "Moll (äolisch)", stufen: [0, 2, 3, 5, 7, 8, 10] },
  dorisch: { name: "Dorisch", stufen: [0, 2, 3, 5, 7, 9, 10] },
  phrygisch: { name: "Phrygisch", stufen: [0, 1, 3, 5, 7, 8, 10] },
  hijaz: { name: "Hijaz", stufen: [0, 1, 4, 5, 7, 8, 10] },
  harmonisch: { name: "harmonisch Moll (Nahawand)", stufen: [0, 2, 3, 5, 7, 8, 11] },
  dur: { name: "Dur", stufen: [0, 2, 4, 5, 7, 9, 11] },
});

/** Frequenz des Grundtons (0 = C … 11 = H) in der tiefsten Bass-Oktave: zwischen 30 und 60 Hz */
export function grundFrequenz(grundton, kammerton = KAMMERTON) {
  let f = kammerton * 2 ** ((grundton - 9) / 12);
  while (f >= 60) f /= 2;
  while (f < 30) f *= 2;
  return f;
}

/** ein Schritt → { stufe, vorzeichen, oktave, gleiten, staerke } oder "-" / null */
export function tonLesen(tok) {
  if (tok === "-") return "-";
  if (tok === "." || !tok) return null;
  const m = /^([b#]?)(\d+)(['’,]*)(~?)([!_]?)$/.exec(tok);
  if (!m) return null;
  const okt = [...m[3]].reduce((s, c) => s + (c === "," ? -1 : 1), 0);
  return { stufe: Number(m[2]), vorzeichen: m[1] === "b" ? -1 : m[1] === "#" ? 1 : 0, oktave: okt, gleiten: m[4] === "~", staerke: m[5] === "!" ? 1 : m[5] === "_" ? 0.5 : 0.8 };
}

/** Halbtöne über dem Grundton */
export function halbtoene(ton, leiter) {
  const st = LEITERN[leiter]?.stufen ?? LEITERN.moll.stufen, n = st.length, k = Math.max(1, ton.stufe) - 1;
  return st[k % n] + 12 * Math.floor(k / n) + ton.vorzeichen + 12 * ton.oktave;
}

/**
 * Takte → Noten [{ beginn (s), dauer (s), halbtoene, staerke, gleiten }]. Ein «-» verlängert den vorigen Ton, auch über den Taktstrich.
 * Swing und Menschlichkeit wie bei den Schlägen (der Beginn verschiebt sich, das Ende bleibt am Raster).
 */
export function notenLesen(zeilen, { bpm, anzahl, leiter, swing = 0, menschlich = 0, versatz = 0, seed = 1 }) {
  const takt = (60 / bpm) * 4, rnd = zufall(seed), noten = [];
  let letzte = [], gruppe = 0;
  for (let b = 0; b < anzahl; b++) {
    const t = String(zeilen[b % zeilen.length]).trim().split(/\s+/).filter(Boolean), n = t.length || 1, schritt = takt / n;
    t.forEach((tok, i) => {
      const beginn = b * takt + i * schritt;
      if (tok === "-") { for (const l of letzte) l.ende = beginn + schritt; return; }
      for (const l of letzte) if (l.ende > beginn) l.ende = beginn;   // eine neue Note oder Pause beendet die vorigen
      // ein Akkord: Stufen mit «+» verbunden (1+3+5); Betonung und Gleiten eines Teils gelten für alle
      const teile = tok.split("+").map(tonLesen).filter((x) => x && x !== "-");
      if (!teile.length) { letzte = []; return; }
      const sw = i % 2 === 1 ? swing * schritt : 0, jitter = ((rnd() * 2 - 1) * menschlich + versatz) / 1000;
      const staerke = Math.max(...teile.map((x) => x.staerke)), gleiten = teile.some((x) => x.gleiten);
      gruppe++;
      letzte = teile.map((x) => ({ beginn: beginn + sw + jitter, ende: beginn + schritt, halbtoene: halbtoene(x, leiter), staerke, gleiten, gruppe }));
      noten.push(...letzte);
    });
  }
  return noten.map((x) => ({ beginn: x.beginn, dauer: Math.max(0.02, x.ende - x.beginn), halbtoene: x.halbtoene, staerke: x.staerke, gleiten: x.gleiten, gruppe: x.gruppe }));
}

// ---------- Basslinien ----------
/** Folgen von Stufen je Takt (die Grundtöne der Harmonie), je Tonleiter einige zur Wahl */
const FOLGEN = {
  moll: [[1, 1, 6, 7], [1, 6, 4, 5], [1, 4, 1, 7], [1, 1, 4, 6]],
  dorisch: [[1, 1, 4, 4], [1, 7, 4, 1], [1, 2, 4, 1]],
  phrygisch: [[1, 1, 2, 1], [1, 2, 7, 1], [1, 1, 7, 2]],
  hijaz: [[1, 2, 1, 7], [1, 1, 2, 1], [1, 4, 2, 1]],
  harmonisch: [[1, 6, 5, 1], [1, 4, 5, 1], [1, 6, 2, 5]],
  dur: [[1, 6, 4, 5], [1, 4, 1, 5]],
};

export const LINIEN = Object.freeze([
  { key: "kick", name: "folgt der Kick", hilfe: "ein Ton auf jeder Kick, er klingt bis zur nächsten" },
  { key: "lang", name: "lang, Halftime", hilfe: "wenige lange Töne, gleitend: Reese, Drum and Bass" },
  { key: "riff", name: "Riff (Dub, Trip-Hop)", hilfe: "ein Zwei-Takt-Riff mit Pausen, rund und tief" },
  { key: "offbeat", name: "Offbeat (House, Goa)", hilfe: "zwischen die Kicks: rollend" },
  { key: "walking", name: "Walking (Jazz)", hilfe: "Viertel: Grundton, Akkordtöne, chromatische Annäherung" },
  { key: "zyklus", name: "lang, ungerader Zyklus (knarzend)", hilfe: "lange Töne über einen Zyklus von 3, 5 oder 7 Takten, Wechsel quer zum Takt, kurze knarzende Gleitbewegungen" },
]);

/** die Positionen der Kick (Sechzehntel 0–15) je Takt aus den Zeilen einer Drumspur */
export function kickSchritte(zeilen) {
  return zeilen.map((z) => { const t = String(z).trim().split(/\s+/), n = t.length; return t.map((x, i) => (x !== "." && x !== "-" ? Math.round((i * 16) / n) : -1)).filter((i) => i >= 0); });
}

/** eine Stufe schreiben, über 7 und unter 1 in die Nachbaroktave gefaltet (die Grundtöne 6 und 7 liegen schon als −1 und 0 unter dem Grundton) */
/** Grundtöne der Harmonie für den Bass: die Stufen 6 und 7 unter den Grundton (als −1 und 0) */
const tief = (g) => (g >= 6 ? g - 7 : g);
const fmt = (stufe, { okt = 0, gl = false, st = "", wurzel = false } = {}) => {
  let s = stufe, o = okt;
  while (s > 7) { s -= 7; o++; }
  while (s < 1) { s += 7; o--; }
  return `${s}${o > 0 ? "'".repeat(o) : o < 0 ? ",".repeat(-o) : ""}${gl ? "~" : ""}${st}`;
};

/**
 * Basslinie als Melodiezeilen (eine je Takt). art: kick | lang | riff | offbeat | walking. kicks: Kickschritte je Takt (aus kickSchritte)
 * oder null; anzahl Takte; seed. Die Linie wiederholt sich in Viertakt-Gruppen und verändert sich in der zweiten Hälfte etwas.
 */
export function linieErzeugen({ art = "kick", leiter = "moll", kicks = null, anzahl = 8, seed = 1 }) {
  const rnd = zufall(seed), folgen = FOLGEN[leiter] ?? FOLGEN.moll, folge = folgen[Math.floor(rnd() * folgen.length)];
  const k = kicks?.length ? kicks : [[0, 10]];
  if (art === "walking") return walkingZeilen(anzahl, folge, rnd);
  if (art === "zyklus") return zyklusZeilen(folge, rnd);
  const zeilen = [];
  for (let b = 0; b < anzahl; b++) {
    const g = tief(folge[b % folge.length]), spaet = b % 8 >= 4, schritte = Array(16).fill(".");
    if (art === "kick") {
      const ks = k[b % k.length];
      ks.forEach((s, i) => {
        const bis = i + 1 < ks.length ? ks[i + 1] : 16, oktave = i > 0 && rnd() < 0.25 ? 1 : 0, quinte = i > 0 && !oktave && rnd() < 0.2;
        schritte[s] = fmt(quinte ? g + 4 : g, { wurzel: !quinte, okt: oktave, gl: i === 0 && b > 0 && rnd() < 0.2, st: i === 0 ? "!" : "" });
        const lang = Math.max(1, Math.min(bis - s, spaet && rnd() < 0.4 ? 2 : bis - s));
        for (let j = s + 1; j < s + lang; j++) schritte[j] = "-";
      });
      if (spaet && rnd() < 0.5) { const p = 14 + Math.floor(rnd() * 2); if (schritte[p] === "-" || schritte[p] === ".") schritte[p] = fmt(tief(folge[(b + 1) % folge.length]), { wurzel: true, st: "_" }); }
    } else if (art === "lang") {
      schritte[0] = fmt(g, { wurzel: true, gl: b > 0 && rnd() < 0.5, st: "!" }); for (let j = 1; j < 16; j++) schritte[j] = "-";
      if (rnd() < 0.35) { schritte[10] = fmt(rnd() < 0.5 ? g + 2 : g - 1, { gl: true }); }
      if (spaet && rnd() < 0.3) schritte[14] = fmt(g, { wurzel: true, okt: 1, gl: true });
    } else if (art === "riff") {
      const RIFFE = [["1!", "-", "-", ".", ".", ".", "5,", "-", "7,", ".", "1", "-", ".", ".", "3", "."], ["1!", "-", ".", "1", ".", ".", "b7,", "-", ".", "1", "-", ".", "5,", "-", "-", "."], ["1!", "-", "-", "-", ".", "1", ".", ".", "3", "-", "1", "-", ".", ".", "7,", "-"]];
      const r = RIFFE[Math.floor((seed % 997) * 7) % RIFFE.length];
      r.forEach((x, i) => { const t = tonLesen(x); schritte[i] = !t || t === "-" ? x : fmt(t.stufe + g - 1, { wurzel: t.stufe === 1, okt: t.oktave, st: x.endsWith("!") ? "!" : "" }); });
      if (spaet && rnd() < 0.5) schritte[15] = fmt(g, { wurzel: true, okt: 1, st: "_" });
    } else if (art === "offbeat") {
      const ks = new Set(k[b % k.length]);
      for (let s = 0; s < 16; s++) if (!ks.has(s) && (s % 4 === 2 || (s % 4 === 3 && rnd() < 0.5) || (s % 4 === 1 && rnd() < 0.3))) schritte[s] = fmt(g, { wurzel: true, okt: s % 4 === 3 && rnd() < 0.3 ? 1 : 0, st: s % 4 === 2 ? "" : "_" });
    }
    zeilen.push(schritte.join(" "));
  }
  return zeilen;
}

function walkingZeilen(anzahl, folge, rnd) {
  const zeilen = [];
  for (let b = 0; b < anzahl; b++) {
    const g = tief(folge[b % folge.length]), n = tief(folge[(b + 1) % folge.length]);
    const zwei = [g + 2, g + 4, g + 1][Math.floor(rnd() * 3)], drei = [g + 4, g + 2, g + 5, g + 6][Math.floor(rnd() * 4)];
    // Schlag 4: chromatisch einen Halbton über oder unter dem nächsten Grundton, sonst ein Leiterton daneben
    const vier = rnd() < 0.55 ? (rnd() < 0.5 ? `#${fmt(n)}` : `b${fmt(n)}`) : fmt(n === g ? g + 1 : n + (n > g ? -1 : 1));
    const t = [fmt(g, { wurzel: true, st: "!" }), fmt(zwei), fmt(drei), vier];
    if (rnd() < 0.15) t[2] = `${fmt(drei)} ${fmt(drei + 1, { st: "_" })}`;   // ab und zu zwei Achtel
    zeilen.push(t.length === 4 && !t[2].includes(" ") ? t.join(" ") : achtel(t));
  }
  return zeilen;
}
/** Viertel mit einem Achtelpaar → acht Achtel */
function achtel(t) { const out = []; for (const x of t) { const p = x.split(" "); if (p.length === 2) out.push(p[0], p[1]); else out.push(x, "-"); } return out.join(" "); }

/**
 * Zyklus (seit Composer 0.2): ein Zyklus von 3, 5 oder 7 Takten, in dem die Töne lang liegen und quer zum Takt wechseln (Dauern von
 * 6 bis 22 Sechzehnteln, kaum je auf der Eins). Vor einem Wechsel oft eine kurze knarzende Bewegung: ein Nachbarton und zurück, gleitend.
 * Die Zeilen wiederholen sich als Ganzes; gegen die Viertakt-Gruppen der Drums verschiebt sich die Linie dadurch über den Track.
 */
function zyklusZeilen(folge, rnd) {
  const zy = [3, 5, 7][Math.floor(rnd() * 3)], S = zy * 16, z = Array(S).fill("-"), dauern = [10, 14, 6, 18, 12, 22, 9, 13];
  let pos = 0, k = 0;
  while (pos < S) {
    const g = tief(folge[k % folge.length]), d = Math.min(S - pos, dauern[Math.floor(rnd() * dauern.length)]);
    z[pos] = fmt(g, { gl: k > 0 && rnd() < 0.35, st: "!" });
    if (d >= 8 && rnd() < 0.65) {   // knarzen: Nachbarton (oder Oktave) kurz anschleifen, dann zurück
      const n = pos + d - 3, nb = rnd() < 0.3 ? fmt(g, { okt: 1, gl: true }) : fmt(g + (rnd() < 0.5 ? 1 : -1), { gl: true });
      z[n] = nb; z[n + 1] = fmt(g, { gl: true, st: "_" });
    }
    pos += d; k++;
  }
  const zeilen = [];
  for (let b = 0; b < zy; b++) zeilen.push(z.slice(b * 16, b * 16 + 16).join(" "));
  return zeilen;
}
