// Sequenzen für Synthesizerspuren, als Melodiezeilen (eine je Takt; Akkorde mit «+», siehe linien.js). Die Grundtöne kommen aus den
// Akkorden der Bassspur (Stufe je Takt), Rhythmus und Akzente aus dem Groove der Drums (Kickschritte). Alles aus dem Startwert.
//
// Rollen: pad (Akkord je Takt), drone (Grundton und Quinte über zwei Takte), chord (kurze Stabs auf den Offbeats oder dem Groove),
// keys (gebrochene Akkorde in Achteln), arp (Arpeggio in Sechzehnteln, Richtung und Umfang wählbar), pluck (Arpeggio in Achteln mit Pausen),
// acid (Sechzehntel-Linie mit Akzent und Slide), lead (sparsame Melodie), puls (Maschinenpuls in Achteln).

import { zufall } from "../erzeuger/grund.js";

export const ROLLEN = Object.freeze([
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
export function sequenzErzeugen({ rolle = "pad", akkorde = [1], kicks = null, anzahl = 8, seed = 1, halftime = false }) {
  const rnd = zufall(seed), takte = Math.min(anzahl, 8), zeilen = [];
  if (rolle === "schwebe") return schwebe(akkorde, rnd);
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
