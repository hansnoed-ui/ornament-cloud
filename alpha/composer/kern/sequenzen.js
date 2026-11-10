// Sequenzen für Synthesizerspuren, als Melodiezeilen (eine je Takt; Akkorde mit «+», siehe linien.js). Die Grundtöne kommen aus den
// Akkorden der Bassspur (Stufe je Takt), Rhythmus und Akzente aus dem Groove der Drums (Kickschritte). Alles aus dem Startwert.
//
// Rollen: pad (Akkord je Takt), drone (Grundton und Quinte über zwei Takte), chord (kurze Stabs auf den Offbeats oder dem Groove),
// keys (gebrochene Akkorde in Achteln), arp (Arpeggio in Sechzehnteln, Richtung und Umfang wählbar), pluck (Arpeggio in Achteln mit Pausen),
// acid (Sechzehntel-Linie mit Akzent und Slide), lead (sparsame Melodie), puls (Maschinenpuls in Achteln).

import { zufall } from "../erzeuger/grund.js";

// Seit Synth 0.2.0 stehen zuerst die vier Schichten aus melodien.md (keine Popmelodien): lange, sich verändernde Flächen, helle Spitzen,
// unregelmässige Off-Beats, dazu Ruf (seltene Horn- und Flötenrufe), Alap (Ton für Ton über dem Drone) und Tanpura. Die spätromantischen
// Anleihen (Orgelpunkt, Vorhalt, chromatisch absteigende Innenstimme, weite Lage, Glockenakkorde) steuert der Regler «Klassik» in allen
// Schichten. Die älteren Rollen bleiben für bestehende Projekte und als Werkzeug.
export const REGLER = Object.freeze([
  { key: "wandel", name: "Wandel", hilfe: "wie schnell sich die Fläche verändert: Harmonie alle 8, 4 oder 2 Takte, wie oft eine Innenstimme wandert" },
  { key: "weite", name: "Weite", hilfe: "enge oder weite Lage, 3 bis 6 Stimmen" },
  { key: "spitzen", name: "Spitzen", hilfe: "wie viele helle Einzelklänge je Phrase (0 bis 3)" },
  { key: "offbeat", name: "Off-Beat", hilfe: "Wahrscheinlichkeit und Dichte der Off-Beat-Klänge in den Lücken der Drums" },
  { key: "klassik", name: "Klassik", hilfe: "Orgelpunkt, Vorhalte, chromatisch absteigende Innenstimme, Glockenakkorde, Sequenzen" },
  { key: "ruhe", name: "Ruhe", hilfe: "Anteil an Pausen und Stillstand" },
]);
export const REGLER_STD = Object.freeze({ wandel: 40, weite: 60, spitzen: 40, offbeat: 30, klassik: 50, ruhe: 40 });

export const ROLLEN = Object.freeze([
  { key: "flaeche", name: "Fläche (wandernde Stimmen)" }, { key: "spitzen", name: "Spitzen (helle Einzelklänge)" }, { key: "offbeat", name: "Off-Beat (unregelmässig)" },
  { key: "ruf", name: "Ruf (selten, Horn/Flöte)" }, { key: "alap", name: "Alap (Ton für Ton, Meend)" }, { key: "tanpura", name: "Tanpura (Drone gezupft)" },
  { key: "schwebe", name: "Schwebe (lange Akkorde, ungerader Zyklus)" }, { key: "pad", name: "Pad (Akkord je Takt)" }, { key: "drone", name: "Drone" }, { key: "chord", name: "Akkord-Stabs" }, { key: "keys", name: "Keys (gebrochen)" },
  { key: "arp", name: "Arpeggio" }, { key: "pluck", name: "Pluck" }, { key: "acid", name: "Acid (Akzent, Slide)" }, { key: "lead", name: "Lead" }, { key: "puls", name: "Puls" },
]);

/** Stufe schreiben (über 7 in die nächste Oktave gefaltet), wie in linien.js */
function fmt(stufe, { okt = 0, st = "", gl = false } = {}) {
  let s = stufe, o = okt;
  while (s > 7) { s -= 7; o++; }
  while (s < 1) { s += 7; o--; }
  return `${s}${o > 0 ? "'".repeat(o) : o < 0 ? ",".repeat(-o) : ""}${gl ? "~" : ""}${st}`;
}
const akkord = (g, toene, st = "") => toene.map((t, i) => fmt(g + t, { st: i === toene.length - 1 ? st : "" })).join("+");

/**
 * rolle; akkorde: Stufe je Takt (Länge beliebig, wird wiederholt); kicks: Kickschritte (0–15) je Takt oder null; anzahl Takte; seed;
 * halftime: Akkordwechsel nur alle zwei Takte (schnelle Stile im halben Gefühl). Gibt Zeilen zurück (höchstens 8 verschiedene Takte).
 */
export function sequenzErzeugen({ rolle = "pad", akkorde = [1], kicks = null, anzahl = 8, seed = 1, halftime = false, regler = null, belegt = null, snares = null, zyklus = 0 }) {
  const rnd = zufall(seed), takte = Math.min(anzahl, 8), zeilen = [];
  if (rolle === "schwebe") return schwebe(akkorde, rnd);
  const R = { ...REGLER_STD, ...(regler ?? {}) }, a = akkorde.length ? akkorde : [1];
  // Fläche, Spitzen, Off-Beats und Tanpura wiederholen sich erst nach bis zu 32 Takten: in acht Takten wäre jede Unregelmässigkeit nach
  // dem zweiten Durchlauf eine Regel (Urteil 10.11.: «könnten noch unregelmässiger verteilt sein, auch in der Tonlänge»)
  const lang = Math.min(anzahl, 32);
  if (rolle === "flaeche") return flaeche(a, rnd, R, lang, halftime);
  if (rolle === "spitzen") return spitzen(a, rnd, R, lang, snares);
  if (rolle === "offbeat") return offbeat(a, rnd, R, lang, { belegt, kicks, snares, zyklus });
  if (rolle === "ruf") return ruf(a, rnd, R, takte);
  if (rolle === "alap") return alap(rnd, R, takte);
  if (rolle === "tanpura") return tanpura(rnd, R, lang, halftime);
  const stufe = (b) => { const a = akkorde.length ? akkorde : [1]; return a[(halftime ? Math.floor(b / 2) * 2 : b) % a.length]; };
  const vier = rnd() < 0.5 ? [0, 2, 4, 6] : [0, 2, 4, 8];   // Septime oder None oben
  const richtung = ["auf", "ab", "aufab", "zufall"][Math.floor(rnd() * 4)];
  const acid = Array.from({ length: 16 }, () => rnd());   // ein Acid-Muster, das sich wiederholt und alle vier Takte leicht ändert
  for (let b = 0; b < takte; b++) {
    const g = stufe(b), z = Array(16).fill("."), ks = kicks?.length ? kicks[b % kicks.length] : [0, 10];
    if (rolle === "pad") { z[0] = akkord(g, vier); for (let i = 1; i < 16; i++) z[i] = "-"; if (halftime && b % 2) z.fill("-"); }
    else if (rolle === "drone") { if (b % 2 === 0) { z[0] = akkord(g, [0, 4, 7]); for (let i = 1; i < 16; i++) z[i] = "-"; } else z.fill("-"); }
    else if (rolle === "chord") {
      const stellen = rnd() < 0.5 ? [2, 6, 10, 14] : [0, 3, 6, 10, 13].filter(() => rnd() < 0.85);
      for (const s of stellen) { z[s] = akkord(g, [0, 2, 4, 6].slice(0, 3 + (rnd() < 0.5 ? 1 : 0)), ks.includes(s) ? "!" : ""); if (s + 1 < 16 && rnd() < 0.4) z[s + 1] = "-"; }
    } else if (rolle === "keys") {
      const toene = [0, 4, 2, 7, 4, 9, 2, 4];
      for (let s = 0; s < 16; s += 2) { if (rnd() < 0.82) z[s] = s === 0 ? akkord(g, [0, 2, 4]) : fmt(g + toene[(s / 2) % 8], { st: ks.includes(s) ? "!" : "" }); if (z[s] !== ".") z[s + 1] = "-"; }
    } else if (rolle === "arp" || rolle === "pluck") {
      const toene = [0, 2, 4, 7, 9, 11, 14], folge = richtung === "ab" ? [...toene].reverse() : richtung === "aufab" ? [...toene, ...toene.slice(1, -1).reverse()] : toene;
      const schritt = rolle === "pluck" ? 2 : 1;
      for (let s = 0, k = 0; s < 16; s += schritt, k++) {
        if (rolle === "pluck" && rnd() < 0.25) continue;
        const t = richtung === "zufall" ? toene[Math.floor(rnd() * toene.length)] : folge[k % folge.length];
        z[s] = fmt(g + t, { st: ks.includes(s) || s % 4 === 0 ? "!" : "_" });
      }
    } else if (rolle === "acid") {
      const neu = b % 4 === 3 ? 0.3 : 0;
      for (let s = 0; s < 16; s++) {
        const r = (acid[s] + neu * rnd()) % 1;
        if (r < 0.28) continue;
        const t = r < 0.5 ? 0 : r < 0.62 ? 7 : r < 0.72 ? 2 : r < 0.8 ? 5 : r < 0.88 ? 4 : 6, okt = r > 0.93 ? 1 : 0;
        z[s] = fmt(g + t, { okt, gl: r > 0.4 && r < 0.48 && s > 0, st: ks.includes(s) || r > 0.85 ? "!" : "" });
        if (r > 0.75 && s + 1 < 16 && z[s + 1] === ".") { z[s + 1] = "-"; s++; }
      }
    } else if (rolle === "lead") {
      for (let s = 0; s < 16; s += 2) {
        if (rnd() < 0.55) continue;
        z[s] = fmt(g + [0, 2, 4, 5, 7, 9][Math.floor(rnd() * 6)], { okt: 1, gl: rnd() < 0.2 });
        for (let j = s + 1; j < Math.min(16, s + 2 + Math.floor(rnd() * 4)); j++) z[j] = "-";
      }
    } else if (rolle === "puls") {
      const muster = [0, 7, 0, 7, 0, 9, 0, 7];
      for (let s = 0; s < 16; s += 2) z[s] = fmt(g + muster[s / 2], { okt: s % 4 === 2 ? 1 : 0, st: s === 0 ? "!" : "" });
    }
    zeilen.push(z.join(" "));
  }
  return zeilen;
}

/**
 * Schwebe (seit Composer 0.2): lange Akkorde über einen Zyklus von 3, 5 oder 7 Takten, Wechsel quer zum Takt (10 bis 26 Sechzehntel),
 * offene Lagen (Quinte, None, Undezime) statt enger Dreiklänge. Der Zyklus läuft gegen die Viertakt-Gruppen der Drums.
 */
function schwebe(akkorde, rnd) {
  const zy = [3, 5, 7][Math.floor(rnd() * 3)], S = zy * 16, z = Array(S).fill("-"), dauern = [14, 18, 10, 22, 26, 12];
  const lagen = [[0, 4, 7], [0, 4, 8], [0, 2, 4, 7], [-3, 0, 4], [-7, 0, 4, 8]];   // offen, aber höchstens eine None über dem Grundton
  let pos = 0, k = 0;
  while (pos < S) {
    const g = akkorde[k % akkorde.length] ?? 1, d = Math.min(S - pos, dauern[Math.floor(rnd() * dauern.length)]);
    z[pos] = akkord(g, lagen[Math.floor(rnd() * lagen.length)], k === 0 || rnd() < 0.4 ? "!" : "");
    pos += d; k++;
  }
  const zeilen = [];
  for (let b = 0; b < zy; b++) zeilen.push(z.slice(b * 16, b * 16 + 16).join(" "));
  return zeilen;
}

// ---------- die vier Schichten (seit Synth 0.2.0, nach melodien.md) ----------

/** Stufe mit Vorzeichen und Haltezeichen schreiben: { stufe, vz: -1|0|1, okt, st, gl, halten } */
function ton({ stufe, vz = 0, okt = 0, st = "", gl = false, halten = false }) {
  return `${vz < 0 ? "b" : vz > 0 ? "#" : ""}${fmt(stufe, { okt, gl, st })}${halten ? "=" : ""}`;
}
const leerZeilen = (S) => Array(S).fill(".");
const zeilenAus = (z) => { const out = []; for (let b = 0; b < z.length / 16; b++) out.push(z.slice(b * 16, b * 16 + 16).join(" ")); return out; };

/**
 * Fläche: lange Akkorde, die sich durch einzelne wandernde Stimmen verändern statt durch harte Wechsel. Harmonie je 8, 4 oder 2 Takte
 * (Wandel; bei Halftime doppelt so lang), Stimmführung mit kleinsten Schritten (die nächste Lage wird aus Kandidaten nach Abstand gewählt),
 * 3–6 Stimmen (Weite). Klassik: Orgelpunkt auf dem Grundton, Vorhalt 4–3 (die Terz kommt erst in der Mitte), chromatisch absteigende
 * Innenstimme (Oktave, Septime, kleine Septime, Sexte: Lamento-Gang), weite Lage über zwei bis drei Oktaven. Ruhe: am Ende einer langen
 * Harmonie manchmal ein Takt Stille. Gehaltene Stimmen tragen «=»: sie klingen ohne neuen Anschlag weiter.
 */
function flaeche(akkorde, rnd, R, L, halftime) {
  const S = L * 16, z = Array(S).fill("-"), k = R.klassik / 100;
  let span = R.wandel > 66 ? 2 : R.wandel > 33 ? 4 : 8; if (halftime) span = Math.min(L, span * 2);
  const nSt = 3 + Math.round((R.weite / 100) * 3), weit = R.weite / 100, orgel = k > 0.3 && rnd() < 0.4 + k * 0.5;
  let vorher = null;
  // Harmonien unterschiedlich lang (halb bis doppelt so lang wie «span»), manchmal ein oder zwei Takte Luft dazwischen
  const bloecke = [];
  let nachLuft = false, pedalKlingt = false;
  for (let b = 0; b < L;) {
    const len = Math.min(L - b, Math.max(1, Math.round(span * [0.5, 1, 1, 1.5, 2][Math.floor(rnd() * 5)])));
    bloecke.push([b, len]); b += len;
    if (b < L - 1 && rnd() < 0.1 + (R.ruhe / 100) * 0.3) { const luft = Math.min(L - b - 1, 1 + Math.floor(rnd() * 2)); bloecke.push([b, -luft]); b += luft; }
  }
  for (const [b0, len0] of bloecke) {
    if (len0 < 0) { z[b0 * 16] = "."; for (let p2 = b0 * 16 + 1; p2 < (b0 - len0) * 16; p2++) z[p2] = "-"; nachLuft = true; pedalKlingt = false; continue; }   // Luft: die Fläche schweigt
    const span = len0, g = akkorde[b0 % akkorde.length], leiter = [0, 2, 4, 6, 8, 11, 13, 15, 18, 20];   // 1 3 5 7 9, dann 5 7 9 … eine Oktave höher
    // Kandidaten: aufsteigend aus Akkordtönen, mit Sprüngen je nach Weite; der nächste am vorigen Klang gewinnt
    let best = null, bestD = Infinity;
    for (let c = 0; c < 8; c++) {
      const st = [g + (weit > 0.6 && rnd() < weit ? -7 : 0)]; let pos = 0;
      while (st.length < nSt) { pos += 1 + (rnd() < weit * 0.6 ? 1 : 0); st.push(g + leiter[Math.min(pos, leiter.length - 1)]); }
      const d = vorher ? st.reduce((s2, x, i) => s2 + Math.abs(x - (vorher[i] ?? vorher.at(-1))), 0) : 0;
      if (d < bestD) { bestD = d; best = st; }
    }
    const stimmen = best.map((x) => ({ stufe: x, vz: 0 })), anf = b0 * 16 + (rnd() < 0.4 ? 0 : [1, 2, 3, 4, 6][Math.floor(rnd() * 5)]), ende = Math.min(S, (b0 + span) * 16);
    // Vorhalt: die Terz (g+2) beginnt als Quarte (g+3) und löst sich in der Mitte auf
    const terz = stimmen.findIndex((x) => x.stufe % 7 === (g + 2) % 7 && x.stufe > g), vorhalt = terz > 0 && rnd() < k * 0.8;
    if (vorhalt) stimmen[terz] = { stufe: stimmen[terz].stufe + 1, vz: 0 };
    const pedal = orgel ? [{ stufe: 1, vz: 0, okt: -1 }] : [];
    const schreibe = (pos, liste, neu, st = "") => { z[pos] = [...pedal.map((p) => ton({ ...p, halten: pedalKlingt })), ...liste.map((x, i) => ton({ ...x, st: i === liste.length - 1 ? st : "", halten: !neu.includes(i) }))].join("+"); pedalKlingt = true; };
    // ein neuer Klang: Stimmen, die gleich bleiben, klingen weiter (Stimmführung über die Harmoniegrenze)
    const gleich = vorher ? stimmen.map((x, i) => (vorher[i] === x.stufe ? -1 : i)).filter((i) => i >= 0) : stimmen.map((_, i) => i);
    if (anf > b0 * 16 && vorher === null) z[b0 * 16] = ".";
    schreibe(anf, stimmen, vorher && !nachLuft ? gleich : stimmen.map((_, i) => i), b0 === 0 || nachLuft ? "!" : "");
    nachLuft = false;
    // Bewegung innerhalb der Harmonie: Vorhalt auflösen, Lamento-Gang, Wechselnoten in einer Innenstimme
    const punkte = []; for (let b = b0 + 1; b < Math.min(L, b0 + span); b++) punkte.push(b * 16 + (rnd() < 0.6 ? 0 : 2 + Math.floor(rnd() * 3)));
    if (vorhalt) punkte.unshift(anf + Math.max(4, Math.round((ende - anf) / 2 / 4) * 4 - 4));
    punkte.sort((x, y) => x - y);
    const lamento = k > 0.4 && nSt >= 4 && span >= 2 && rnd() < k * 0.7, innen = Math.min(stimmen.length - 2, 1 + Math.floor(rnd() * (stimmen.length - 2)));
    if (lamento) stimmen[innen] = { stufe: g + 7, vz: 0 };   // die Innenstimme beginnt auf der Oktave des Grundtons
    const gang = [{ d: 7, vz: 0 }, { d: 6, vz: 0 }, { d: 6, vz: -1 }, { d: 5, vz: 0 }, { d: 5, vz: -1 }];
    let schritt = 0, wechsel = false;
    for (const pos of punkte) {
      if (pos >= ende || pos <= anf) continue;
      const neu = [];
      if (vorhalt && stimmen[terz].stufe !== best[terz]) { stimmen[terz] = { stufe: best[terz], vz: 0 }; neu.push(terz); }
      else if (lamento && schritt < gang.length - 1) { schritt++; stimmen[innen] = { stufe: g + gang[schritt].d, vz: gang[schritt].vz }; neu.push(innen); }
      else if (rnd() < 0.3 + R.wandel / 150) {   // Wechselnote: eine Innenstimme geht einen Schritt und kehrt beim nächsten Punkt zurück
        const i = 1 + Math.floor(rnd() * Math.max(1, stimmen.length - 1)); i < stimmen.length && (wechsel = !wechsel, stimmen[i] = { stufe: wechsel ? best[i] + (rnd() < 0.5 ? 1 : -1) : best[i], vz: 0 }, neu.push(i));
      }
      if (neu.length) schreibe(pos, stimmen, neu);
    }
    // Ruhe: der letzte Takt einer langen Harmonie wird manchmal still
    if (span >= 4 && rnd() < (R.ruhe / 100) * 0.45) for (let p2 = (b0 + span - 1) * 16; p2 < ende; p2++) z[p2] = p2 === (b0 + span - 1) * 16 ? "." : "-";
    vorher = best;
  }
  return zeilenAus(z);
}

/**
 * Spitzen: helle Einzelklänge, selten, wie Lichtreflexe: 0–3 je Viertakt-Phrase, kurz nach einem Snare-Schlag oder am Phrasenende, nie
 * auf jeder Snare. Hohe Akkordtöne (None, Undezime, Oktave); mit Klassik manchmal ein Glockenklang aus Oktave und Quinte (Rachmaninow),
 * sonst manchmal ein Vorschlag, aus dem der Ton gleitet.
 */
function spitzen(akkorde, rnd, R, takte, snares) {
  const S = takte * 16, z = leerZeilen(S), k = R.klassik / 100, jePhrase = Math.round((R.spitzen / 100) * 3), sn = snares?.length ? snares : [[4, 12]];
  for (let ph = 0; ph < takte; ph += 4) {
    let n = jePhrase - (rnd() < R.ruhe / 200 ? 1 : 0); if (R.spitzen > 15 && n < 1) n = 1;
    const genutzt = new Set();
    for (let c = 0; c < n; c++) {
      const b = ph + Math.floor(rnd() * Math.min(4, takte - ph)), s0 = sn[b % sn.length], basis = rnd() < 0.6 && s0.length ? s0[Math.floor(rnd() * s0.length)] + 1 + Math.floor(rnd() * 3) : 12 + Math.floor(rnd() * 4);
      const pos = b * 16 + Math.min(15, basis); if (genutzt.has(b) || pos >= S) continue; genutzt.add(b);
      const g = akkorde[b % akkorde.length], hoch = g + [7, 8, 9, 11, 4][Math.floor(rnd() * 5)];   // schon über der Oktave: das Preset liegt hoch
      if (k > 0.3 && rnd() < k * 0.5) z[pos] = `${ton({ stufe: g + 7 })}+${ton({ stufe: g + 11, st: "!" })}`;   // Glocke: Oktave und Quinte
      else if (rnd() < 0.3 && pos > 0 && z[pos - 1] === ".") { z[pos - 1] = ton({ stufe: hoch + 1, st: "_" }); z[pos] = ton({ stufe: hoch, gl: true }); }
      else z[pos] = ton({ stufe: hoch, st: rnd() < 0.5 ? "!" : "" });
      if (pos + 1 < S && rnd() < 0.5) z[pos + 1] = "-";
    }
  }
  return zeilenAus(z);
}

/**
 * Off-Beats: kurze Akkord-Stiche auf den Achtel-Off-Beats, also zwischen den Schlägen, dort wo die offene Hi-Hat liegt, nie auf Kick oder
 * Snare. Unregelmässig ist, in welchen Takten sie kommen, nicht wo im Takt: je Sequenz eine Figur (ein, zwei oder mehr Stiche), die in
 * unregelmässig verteilten Takten wiederkehrt, ab und zu einen Stich verliert oder dazugewinnt; in der zweiten Hälfte manchmal eine zweite
 * Figur. Die Tonlänge wechselt: meist kurz, manchmal klingt ein Akkord über mehrere Schläge.
 * Die Stimmen bleiben eng in einer Lage (Terz, Quinte, Septime ohne Grundton oder Dreiklang; immer die nächste Umkehrung), das Echo der
 * Spur trägt sie weiter. Mit Klassik ein Quartvorhalt, der sich auf den nächsten Stich in die Terz löst. Das Raster folgt der Snare:
 * Snare auf 2 und 4 → Off-Beats auf 2, 6, 10, 14; Halftime (Snare auf 3) → 4 und 12. Mit «zyklus» (7, 10 oder 16 Sechzehntel, z. B. Rupak,
 * Jhaptal, Teental) folgen die Stellen den Betonungen eines Zyklus, der gegen den 4/4-Takt läuft.
 * Bis Version 0.2.0 der App lagen die Fetzen auf zufälligen Sechzehnteln neben der Hi-Hat und sprangen in der Lage: das klang verloren.
 */
const ZYKLEN = { 7: [0, 3, 5], 10: [0, 2, 5, 7], 16: [0, 4, 8, 12] };
const FIGUREN = {
  4: { selten: [[6], [14], [2]], mittel: [[6, 14], [2, 10], [2, 6], [6, 10]], dicht: [[2, 6, 14], [2, 6, 10, 14], [6, 10, 14]] },
  8: { selten: [[4], [12]], mittel: [[4, 12], [12, 14]], dicht: [[4, 12, 14], [4, 6, 12]] },
};
/** Stufe in ein Fenster von sieben Stufen um «mitte» falten: jede Tonklasse genau einmal, die Lage bleibt stehen */
const imFenster = (s, mitte) => { while (s > mitte + 3) s -= 7; while (s < mitte - 3) s += 7; return s; };
const enge = (g, toene, mitte, st = "") => toene.map((t) => imFenster(g + t, mitte)).sort((a, b) => a - b).map((s, i, a) => fmt(s, { st: i === a.length - 1 ? st : "" })).join("+");
function offbeat(akkorde, rnd, R, takte, { belegt, kicks, snares, zyklus }) {
  const S = takte * 16, z = leerZeilen(S), p = R.offbeat / 100, ruhe = R.ruhe / 100, k = R.klassik / 100;
  const jeTakt = (a, b) => (a?.length ? a[b % a.length] ?? [] : []);
  // nur Kick und Snare sperren (die Hi-Hat ist der Partner des Off-Beats); ohne beides die schweren Schläge aus «belegt»
  const hart = (b) => { const h = [...jeTakt(kicks, b), ...jeTakt(snares, b)]; return h.length || !belegt ? h : jeTakt(belegt, b).filter((s) => s % 4 === 0); };
  const sn = (snares ?? []).flat(), halb = sn.length > 0 && sn.includes(8) && !sn.includes(4) && !sn.includes(12);
  const fig = FIGUREN[halb ? 8 : 4], raster = halb ? [4, 12] : [2, 6, 10, 14];
  const wahl = (a) => a[Math.floor(rnd() * a.length)];
  const dichte = () => (p < 0.35 ? "selten" : p < 0.7 ? (rnd() < 0.5 ? "selten" : "mittel") : rnd() < 0.4 ? "mittel" : "dicht");
  const figurA = wahl(fig[dichte()]), figurB = rnd() < 0.4 ? wahl(fig[dichte()]) : figurA;
  const lage = R.weite > 70 ? [2, 4, 6, 8] : rnd() < 0.6 ? [2, 4, 6] : [0, 2, 4], mitte = 6;
  // Tonlänge je Stich: meist kurz, manchmal klingt ein Akkord über mehrere Schläge (bis zum nächsten Stich)
  const dauer = () => (rnd() < 0.2 + 0.1 * k ? (halb ? 6 : 3) + Math.floor(rnd() * (halb ? 7 : 5)) : (halb ? 2 : 1) + (rnd() < 0.45 ? 1 : 0));
  const haelfte = Math.max(4, Math.floor(takte / 2));
  // welche Takte: unregelmässig, mindestens zwei, mit Ruhe weniger
  const anteil = Math.max(0.12, Math.min(0.95, 0.3 + 0.55 * p - 0.25 * ruhe));
  const aktiv = Array.from({ length: takte }, () => rnd() < anteil);
  for (let n = aktiv.filter(Boolean).length, versuch = 0; n < Math.min(2, takte) && versuch < 20; versuch++) { const b = Math.floor(rnd() * takte); if (!aktiv[b]) { aktiv[b] = true; n++; } }
  for (let b = 0; b < takte; b++) {
    if (!aktiv[b]) continue;
    const g = akkorde[b % akkorde.length], sperre = hart(b);
    let stellen;
    if (ZYKLEN[zyklus]) {
      const im = []; for (let s2 = 0; s2 < 16; s2++) if (ZYKLEN[zyklus].includes((b * 16 + s2) % zyklus) && s2 % 4 !== 0 && !sperre.includes(s2)) im.push(s2);
      stellen = []; for (let c = 0; c < (b < haelfte ? figurA : figurB).length && im.length; c++) stellen.push(im.splice(Math.floor(rnd() * im.length), 1)[0]);
    } else {
      stellen = [...(b < haelfte ? figurA : figurB)];
      if (stellen.length > 1 && rnd() < 0.25) stellen.splice(Math.floor(rnd() * stellen.length), 1);   // einen Stich auslassen
      else if (rnd() < 0.15 + 0.2 * p) { const dazu = raster.filter((x) => !stellen.includes(x)); if (dazu.length) stellen.push(wahl(dazu)); }
      stellen = stellen.filter((s2) => !sperre.includes(s2));
      if (!stellen.length) { const frei = raster.filter((s2) => !sperre.includes(s2)); if (frei.length) stellen = [wahl(frei)]; }
    }
    stellen.sort((a, c) => a - c);
    const vorhalt = k > 0.45 && stellen.length >= 2 && lage.includes(2) && rnd() < (k - 0.3) * 0.7;
    stellen.forEach((s2, i) => {
      const pos = b * 16 + s2, toene = vorhalt && i === 0 ? lage.map((t) => (t === 2 ? 3 : t)) : lage;
      z[pos] = enge(g, toene, mitte, i > 0 && rnd() < 0.4 ? "_" : "");
      for (let j = 1, d = dauer(); j < d && pos + j < S && z[pos + j] === "."; j++) z[pos + j] = "-";
    });
  }
  return zeilenAus(z);
}

/**
 * Ruf: seltene, hornartige oder flötende Rufe aus Quarte, Quinte und Sexte (pentatonisch, Dvořák als Richtung): 2–4 lange Töne, danach
 * lange Stille; die Wiederkehr ist leicht verändert. Mit Ausdruck (Anschleifen, Vibrato) im Preset.
 */
function ruf(akkorde, rnd, R, takte) {
  const S = takte * 16, z = leerZeilen(S), rufe = [[5, 8, 8], [1, 5, 6, 5], [5, 6, 8], [8, 5, 6, 5], [1, 2, 5]];
  const motiv = rufe[Math.floor(rnd() * rufe.length)], einsatz = [0, 4].filter(() => rnd() > (R.ruhe / 100) * 0.5);
  for (const b of einsatz.length ? einsatz : [0]) {
    if (b >= takte) continue;
    let pos = b * 16 + 2 + Math.floor(rnd() * 3);
    motiv.forEach((st, i) => {
      if (pos >= S) return;
      const var2 = b > 0 && i === motiv.length - 1 ? (rnd() < 0.5 ? 1 : -1) : 0, d = [6, 4, 8, 10][Math.floor(rnd() * 4)];
      z[pos] = ton({ stufe: st + var2, gl: i > 0 && rnd() < 0.3, st: i === 0 ? "!" : "" });
      for (let j = pos + 1; j < Math.min(S, pos + d); j++) z[j] = "-";
      pos += d + (rnd() < 0.3 ? 2 : 0);
    });
  }
  return zeilenAus(z);
}

/**
 * Alap: wie die freie Einleitung eines Ragas (als Inspiration): Töne werden einzeln eingeführt, lange gehalten und gleitend verbunden
 * (Meend), dazu ab und zu ein Pendeln um einen Ton (Gamak-artig). Der Tonraum wächst über die Takte vom Grundton aus nach oben.
 */
function alap(rnd, R, takte) {
  const S = takte * 16, z = leerZeilen(S), folge = [1, 2, 1, 3, 2, 1, 4, 3, 5, 4, 3, 2, 1, 5, 6, 5, 8, 7, 6, 5, 4, 3, 2, 1];
  let pos = 2, k = 0;
  while (pos < S && k < folge.length) {
    const st = folge[k], d = 6 + Math.floor(rnd() * 10);
    z[pos] = ton({ stufe: st, gl: k > 0 && rnd() < 0.7, st: k === 0 ? "!" : "" });
    for (let j = pos + 1; j < Math.min(S, pos + d); j++) z[j] = "-";
    if (d >= 10 && rnd() < 0.35 && pos + d - 1 < S) {   // Gamak: drei Sechzehntel Pendeln, gleitend
      const e = pos + d - 4; z[e] = ton({ stufe: st + 1, gl: true, st: "_" }); z[e + 1] = ton({ stufe: st, gl: true }); z[e + 2] = ton({ stufe: st + 1, gl: true, st: "_" }); z[e + 3] = ton({ stufe: st, gl: true });
    }
    pos += d; k++;
    if (rnd() < (R.ruhe / 100) * 0.3) pos += 4;   // Atem
  }
  return zeilenAus(z);
}

/**
 * Tanpura: Pa (Quinte unten), Sa, Sa, Sa (tief), jeder Zupfer klingt bis zum nächsten. Das Grundmass ist ein Viertel (bei Halftime eine
 * Halbe), die Abstände wechseln aber (knapp, gedehnt, ein Zupfer ausgelassen), manche Zupfer werden früh abgedämpft, und mit Ruhe setzt
 * der Spieler ab und zu einen oder zwei Takte ab und beginnt den Zyklus wieder mit Pa.
 */
function tanpura(rnd, R, takte, halftime) {
  const S = takte * 16, z = leerZeilen(S), muster = ["5,", "1", "1", "1,"], weit = halftime ? 8 : 4, ruhe = R.ruhe / 100;
  for (let pos = 0, i = 0; pos < S;) {
    if (i > 0 && i % 4 === 0 && rnd() < 0.08 + ruhe * 0.25) { z[pos] = "."; pos += 16 * (1 + Math.floor(rnd() * 2)) - (pos % 16); i = 0; continue; }
    z[pos] = muster[i % 4] + (i % 4 === 0 ? "!" : rnd() < 0.3 ? "_" : "");
    const d = Math.max(2, Math.round(weit * [0.75, 1, 1, 1.25, 1.5, 2][Math.floor(rnd() * 6)]));
    const klingt = rnd() < 0.2 ? Math.max(2, Math.round(d * (0.4 + rnd() * 0.4))) : d;
    for (let j = 1; j < klingt && pos + j < S; j++) z[pos + j] = "-";
    pos += d; i++;
  }
  return zeilenAus(z);
}
