// Arrangement 0.1.0 – aus Spuren, die als Schleifen laufen, einen ganzen Track machen: Abschnitte (Intro, Aufbau, Hauptteil, Breakdown,
// Hauptteil, Outro), in denen Spuren ein- und aussetzen, und Übergänge mit Filterfahrt, Stutter, Echo-Wurf, Rückwärts und am Schluss
// einem Tape-Stop. Alles sind gewöhnliche Unterbrechungen (kern/unterbrechungen.js) mit der Markierung «arr»: Sie stehen in der Liste der
// Spur, lassen sich einzeln ändern, ausschalten oder löschen. Nichts wird fest eingerechnet.

import { zufall } from "../erzeuger/grund.js";

/** Funktion einer Spur im Arrangement, aus Erzeuger und Stimme (bzw. Rolle bei Synths) */
export function funktionVon(q) {
  if (!q) return "fremd";
  if (q.flaeche) return "flaeche";
  if (q.erzeuger?.startsWith("bass@")) return "bass";
  if (q.erzeuger?.startsWith("synth@")) return ["pad", "drone"].includes(q.rolle) ? "pad" : "melodie";
  const s = q.stimme;
  if (s === "kick") return "kick";
  if (["snare", "clap", "rim", "tom"].includes(s)) return "backbeat";
  if (["hat", "offen", "shaker", "ride", "riq"].includes(s)) return "oben";
  return "perkussion";   // Tabla, Darbuka, Rahmentrommel, Zarb, Udu
}

// wer in welchem Abschnitt spielt (1 = spielt, 0 = still)
const PLAN = {
  //            intro aufbau haupt1 break haupt2 outro
  kick:        [0, 0, 1, 0, 1, 1],
  backbeat:    [0, 1, 1, 0, 1, 0],
  oben:        [0, 1, 1, 1, 1, 1],
  perkussion:  [0, 1, 1, 0, 1, 1],
  bass:        [0, 0, 1, 0, 1, 0],
  pad:         [1, 1, 1, 1, 1, 1],
  melodie:     [0, 1, 1, 1, 1, 0],
  flaeche:     [1, 1, 1, 1, 1, 1],
  fremd:       [1, 1, 1, 1, 1, 1],
};
const NAMEN = ["Intro", "Aufbau", "Hauptteil", "Breakdown", "Hauptteil 2", "Outro"];

/** Länge in Takten (ein Vielfaches von 4) und die Abschnitte für eine Dauer in Sekunden */
export function abschnitte(sekunden, bpm) {
  const takt = 240 / bpm, takte = Math.max(16, Math.round(sekunden / takt / 4) * 4);
  // Anteile: Intro 1, Aufbau 1, Hauptteil 2, Breakdown 1, Hauptteil 2, Outro 1 (Achtel der Länge), auf ganze Takte, Rest in die Hauptteile
  const achtel = takte / 8, roh = [1, 1, 2, 1, 2, 1].map((a) => Math.max(2, Math.round((a * achtel) / 2) * 2));
  let diff = takte - roh.reduce((a, b) => a + b, 0);
  for (let i = 0; diff !== 0; i = (i + 1) % 2) { const k = i ? 4 : 2; roh[k] += Math.sign(diff) * 2; diff -= Math.sign(diff) * 2; if (roh[k] < 2) roh[k] = 2; }
  let von = 0;
  return { takte, abschnitte: roh.map((l, i) => { const a = { name: NAMEN[i], von, bis: von + l }; von += l; return a; }) };
}

const E = (art, takt, schritte, werte = {}, mehr = {}) => ({ id: `a-${Math.random().toString(36).slice(2, 8)}`, art, takt, schritte, alle: 0, werte, seed: 1 + Math.floor(Math.random() * 9999), arr: true, ...mehr });

/**
 * die Ereignisse des Arrangements für eine Spur. abschnitte: aus abschnitte(); funktion: aus funktionVon(); seed für kleine Entscheidungen.
 * Gibt [Ereignisse] zurück (Unterbrechungen 0.1.0).
 */
export function ereignisseFuer(funktion, abschn, { seed = 1, takte } = {}) {
  const rnd = zufall(seed), plan = PLAN[funktion] ?? PLAN.fremd, out = [];
  // Stille in den Abschnitten, in denen die Spur nicht spielt (benachbarte zusammengefasst)
  for (let i = 0; i < abschn.length; i++) {
    if (plan[i]) continue;
    let j = i; while (j + 1 < abschn.length && !plan[j + 1]) j++;
    out.push(E("dropout", abschn[i].von, (abschn[j].bis - abschn[i].von) * 16, { rest: 0, kante: 12 }));
    i = j;
  }
  const [intro, aufbau, haupt1, brk, haupt2, outro] = abschn;
  // die Kick kommt in den letzten zwei Takten des Breakdowns zurück, mit einem Hochpass, der sich öffnet
  if (funktion === "kick" && brk.bis - brk.von >= 4) { const d = out.find((e) => e.art === "dropout" && e.takt === brk.von); if (d) d.schritte -= 32; }
  // Aufbau: Melodie und Höhen öffnen sich (Tiefpass auf), am Ende ein Stutter auf dem Backbeat
  if (["melodie", "oben", "pad"].includes(funktion)) out.push(E("filter", aufbau.von, (aufbau.bis - aufbau.von) * 16, { typ: "tief", von: 350, bis: 18000, resonanz: funktion === "melodie" ? 45 : 20 }));
  if (funktion === "backbeat") out.push(E("stutter", aufbau.bis - 0.25, 4, { teilung: 16, abfall: 0, steigen: 0.5 }));
  // Hauptteile: Echo-Würfe auf der Melodie am Ende jeder Vierergruppe, Glitch selten auf den Höhen
  if (funktion === "melodie") for (const h of [haupt1, haupt2]) for (let t = h.von + 3.5; t < h.bis; t += 4) out.push(E("echo", t, 8, { zeit: 16 / 3, rueck: 55, dunkel: 50, anteil: 80 }));
  if (funktion === "oben" && rnd() < 0.7) out.push(E("glitch", haupt2.von + 7.5, 8, { teilung: 32, dichte: 50, zerkleinern: 30 }));
  // Breakdown: am Ende läuft die Fläche/das Pad rückwärts in den zweiten Hauptteil
  if (funktion === "pad" || funktion === "flaeche") out.push(E("rueckwaerts", brk.bis - 0.5, 8, { kante: 6 }));
  if (funktion === "kick" && brk.bis - brk.von >= 4) out.push(E("filter", brk.bis - 2, 32, { typ: "hoch", von: 2000, bis: 40, resonanz: 20 }));
  // Outro: alles läuft am Schluss mit einem Tape-Stop aus
  out.push(E("tapestop", takte - 0.5, 8, { kurve: 1 }));
  return out.filter((e) => e.takt >= 0 && e.takt < takte);
}

/** Vorschläge je Stil: welche Synths und welche Fläche zum ganzen Track gehören */
export const BESETZUNG = Object.freeze({
  dnb: { synths: [["shadow", "deepRoomDrone"], ["glass", "glassKeys"]], natur: ["gezeiten", { verwandlung: 70, tonalitaet: 50 }] },
  hiphop: { synths: [["tape", "wornKeys"], ["shadow", "shadowChord"]], natur: ["pad", { art: "luft" }] },
  pop: { synths: [["darkpop", "darkBrass"], ["trance", "crystalPluck"]], natur: null },
  minimal: { synths: [["glass", "restlessPulse"], ["machine", "motorPulse"]], natur: ["pflanzen", {}] },
  goa: { synths: [["goa", "spiralAcid"], ["goa", "liquidArp"]], natur: ["pad", { art: "drone", akkord: "quint", verwandlung: 60 }] },
  house: { synths: [["house", "velvetOrgan"], ["trance", "openSky"]], natur: null },
  indien: { synths: [["tape", "amberMemory"]], natur: ["vogel", { dichte: 25 }] },
  orient: { synths: [["shadow", "shadowChord"]], natur: ["gezeiten", { wellen: 50, wind: 40 }] },
  ecm: { synths: [["shadow", "deepRoomDrone"], ["tape", "wornKeys"]], natur: ["walchor", { verwandlung: 50 }] },
  persisch: { synths: [["tape", "amberMemory"]], natur: ["vogel", { dichte: 15, raum: 90 }] },
});
