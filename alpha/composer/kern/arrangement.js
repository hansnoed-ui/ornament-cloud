// Arrangement 0.2.0 – aus Spuren, die als Schleifen laufen, einen ganzen Track machen. Der Track soll «atmen, stocken, Gas geben, sich
// verlieren und wiederfinden», «wirbeln, wummen» (Christian, 9. November 2026). Der Ablauf wird aus dem Startwert gewählt:
//   Intro → Aufbau → (Mittelteile in wechselnder Folge: Hauptteil, Stocken, Atmen, Gas geben, Sich verlieren, Wiederfinden) → Outro
// Alles sind gewöhnliche Unterbrechungen (kern/unterbrechungen.js) mit der Markierung «arr»: Sie stehen in der Liste jeder Spur und lassen
// sich einzeln ändern, ausschalten oder löschen. Nichts wird fest eingerechnet. Arrangement 0.1.0 (feste Folge) ist damit ersetzt; einmal
// erzeugte Projekte behalten ihre Ereignisse.

import { zufall } from "../erzeuger/grund.js";

/** Funktion einer Spur im Arrangement, aus Erzeuger und Stimme (bzw. Rolle bei Synths) */
export function funktionVon(q) {
  if (!q) return "fremd";
  if (q.mix) return "mix";   // Perkussion aus einem zweiten Stil: Würze, nicht Dauerschicht
  // perkussive Naturtexturen (Tropfen, Zirpen, Knistern, Rufe, Impulse) nur in den ruhigen Teilen; durchgehend nervten sie (Urteil 9.11.2026)
  if (q.flaeche) return q.stimme === "pad" ? "pad" : ["regen", "feuer", "insekten", "vogel", "pflanzen"].includes(q.stimme) ? "naturklang" : "natur";
  if (q.erzeuger?.startsWith("bass@")) return "bass";
  if (q.erzeuger?.startsWith("synth@")) return ["pad", "drone", "schwebe", "flaeche", "tanpura", "alap"].includes(q.rolle) ? "pad" : "melodie";
  const s = q.stimme;
  if (s === "kick") return "kick";
  if (["snare", "clap", "tom"].includes(s)) return "backbeat";
  if (["hat", "offen", "shaker", "ride", "riq", "rim"].includes(s)) return "oben";   // Rim seit 0.3 bei den Höhen: spielt auch beim Atmen
  return "perkussion";   // Tabla, Darbuka, Rahmentrommel, Zarb, Udu
}

// wer in welchem Abschnitt spielt (1 = spielt, 0 = still)
const SPIELT = {
  //              kick backbeat oben perk bass pad melodie natur fremd mix naturklang
  intro:        [0, 0, 0, 0, 0, 1, 0, 1, 1, 0, 1],
  aufbau:       [0, 1, 1, 1, 0, 1, 1, 1, 1, 0, 0],
  haupt:        [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0],
  stocken:      [1, 1, 1, 1, 1, 1, 1, 1, 1, 0, 0],
  atmen:        [0, 0, 1, 1, 1, 1, 0, 1, 1, 0, 1],
  gas:          [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0],
  verlieren:    [0, 0, 0, 1, 0, 1, 1, 1, 1, 0, 1],
  wiederfinden: [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0],
  outro:        [0, 0, 1, 1, 0, 1, 0, 1, 1, 0, 1],
};
const FUNKTIONEN = ["kick", "backbeat", "oben", "perkussion", "bass", "pad", "melodie", "natur", "fremd", "mix", "naturklang"];
export const NAMEN = Object.freeze({ intro: "Intro", aufbau: "Aufbau", haupt: "Hauptteil", stocken: "Stocken", atmen: "Atmen", gas: "Gas geben", verlieren: "Sich verlieren", wiederfinden: "Wiederfinden", outro: "Outro" });
const FOLGEN = [
  ["haupt", "stocken", "verlieren", "wiederfinden", "gas"],
  ["haupt", "atmen", "gas", "verlieren", "wiederfinden"],
  ["gas", "verlieren", "wiederfinden", "stocken", "haupt"],
  ["haupt", "verlieren", "wiederfinden", "atmen", "gas"],
  ["atmen", "haupt", "stocken", "verlieren", "wiederfinden"],
];

/** Länge in Takten (ein Vielfaches von 4) und die Abschnitte für eine Dauer in Sekunden; der Ablauf aus dem Startwert */
export function abschnitte(sekunden, bpm, { seed = 1 } = {}) {
  const takt = 240 / bpm, takte = Math.max(16, Math.round(sekunden / takt / 4) * 4), rnd = zufall(seed * 7 + 3);
  const intro = takte >= 48 ? 8 : 4, aufbau = 4, outro = 4;
  let mitte = takte - intro - aufbau - outro;
  const folge = [...FOLGEN[Math.floor(rnd() * FOLGEN.length)]];
  // zu lang: zuerst Hauptteil, Stocken, Atmen oder Gas weglassen; wer sich verliert, findet sich auch wieder
  while (folge.length * 4 > mitte && folge.length > 1) { let k = -1; for (let i = folge.length - 1; i >= 0; i--) if (!["verlieren", "wiederfinden"].includes(folge[i])) { k = i; break; } folge.splice(k >= 0 ? k : folge.length - 1, 1); }
  const laengen = folge.map(() => 4);
  mitte -= folge.length * 4;
  for (let i = 0; mitte >= 4; i++) { const k = folge.findIndex((f, j) => j >= i % folge.length && ["haupt", "gas", "wiederfinden", "verlieren"].includes(f)); laengen[k >= 0 ? k : i % folge.length] += 4; mitte -= 4; }
  const liste = [["intro", intro], ["aufbau", aufbau], ...folge.map((f, i) => [f, laengen[i]]), ["outro", outro + mitte]];
  let von = 0;
  return { takte, abschnitte: liste.map(([typ, l]) => { const a = { typ, name: NAMEN[typ], von, bis: von + l }; von += l; return a; }) };
}

const E = (art, takt, schritte, werte = {}) => ({ id: `a-${Math.random().toString(36).slice(2, 8)}`, art, takt, schritte, alle: 0, werte, seed: 1 + Math.floor(Math.random() * 9999), arr: true });
const DRUMS = ["kick", "backbeat", "oben", "perkussion"];

/**
 * die Ereignisse des Arrangements für eine Spur. abschn: aus abschnitte(); funktion: aus funktionVon(). Die Stellen, an denen alle Spuren
 * gemeinsam stocken, hängen nur vom Startwert ab, nicht von der Spur.
 */
export function ereignisseFuer(funktion, abschn, { seed = 1, takte } = {}) {
  const f = FUNKTIONEN.indexOf(funktion) >= 0 ? funktion : "fremd", spalte = FUNKTIONEN.indexOf(f), out = [];
  const spielt = (a) => SPIELT[a.typ]?.[spalte] ?? 1;
  // 1. Stille, wo die Spur nicht spielt (benachbarte Abschnitte zusammengefasst)
  for (let i = 0; i < abschn.length; i++) {
    if (spielt(abschn[i])) continue;
    let j = i; while (j + 1 < abschn.length && !spielt(abschn[j + 1])) j++;
    let bis = abschn[j].bis;
    // die Kick kehrt in den letzten zwei Takten vor dem Wiederfinden zurück (mit Hochpass, der sich öffnet)
    if (f === "kick" && abschn[j + 1]?.typ === "wiederfinden" && bis - abschn[i].von > 4) bis -= 2;
    out.push(E("dropout", abschn[i].von, (bis - abschn[i].von) * 16, { rest: 0, kante: 12 }));
    i = j;
  }
  // die Mischperkussion setzt auch in ihren Abschnitten jeden zweiten Viertakt aus
  if (f === "mix") for (const a of abschn) if (spielt(a)) for (let t = a.von + 4; t < a.bis; t += 8) out.push(E("dropout", t, Math.min(4, a.bis - t) * 16, { rest: 0, kante: 20 }));
  abschn.forEach((a, idx) => {
    const L = a.bis - a.von, gem = zufall(seed * 131 + idx * 17), naechster = abschn[idx + 1];
    if (a.typ === "intro") {
      if (f === "pad") out.push(E("filter", a.von, L * 16, { typ: "tief", von: 180, bis: 16000, resonanz: 25 }));
      if (f === "natur" && naechster) out.push(E("knarz", a.von + L - 2, 32, { dichte: 30, laenge: 160, staerke: 50, farbe: "zittern" }));
    }
    if (a.typ === "aufbau") {
      if (["melodie", "oben", "pad"].includes(f)) out.push(E("filter", a.von, L * 16, { typ: "tief", von: 300, bis: 18000, resonanz: f === "melodie" ? 45 : 20 }));
      if (f === "backbeat" || f === "perkussion") out.push(E("wirbel", a.bis - 1, 16, { von: 8, bis: 64, steigen: 3, lauter: 60 }));   // Gas geben in den Hauptteil
    }
    if (a.typ === "haupt" || a.typ === "wiederfinden" || a.typ === "gas") {
      if (f === "bass") out.push(E("knarz", a.von, L * 16, { dichte: a.typ === "gas" ? 55 : 30, laenge: 140, staerke: 70, farbe: a.typ === "gas" ? "ring" : "mix" }));
      if (f === "pad") out.push(E("knarz", a.von, L * 16, { dichte: 25, laenge: 220, staerke: 60, farbe: "formant" }));
      if (f === "melodie") for (let t = a.von + 3.5; t < a.bis; t += 4) out.push(E("echo", t, 8, { zeit: 16 / 3, rueck: 60, dunkel: 50, anteil: 85 }));
    }
    if (a.typ === "wiederfinden" && f === "bass") out.push(E("wumm", a.von, 16, { hoch: 110, tief: 34, laenge: 1800, staerke: 75, ducken: 60 }));
    if (a.typ === "wiederfinden" && f === "kick" && L > 0) out.push(E("filter", a.von - 2, 32, { typ: "hoch", von: 2500, bis: 40, resonanz: 25 }));
    if (a.typ === "gas") {
      if (["backbeat", "oben"].includes(f)) for (let t = a.von + 3; t < a.bis; t += 4) out.push(E("wirbel", t, 16, { von: 8, bis: f === "oben" ? 128 : 64, steigen: f === "oben" ? 5 : 2, lauter: 50 }));
      if (f === "melodie") out.push(E("stutter", a.bis - 0.5, 8, { teilung: 32, abfall: 0, steigen: 1 }));
      if (f === "oben") out.push(E("filter", a.von, L * 16, { typ: "hoch", von: 2500, bis: 200, resonanz: 30 }));
    }
    if (a.typ === "stocken" && f !== "natur") {
      // alle Spuren halten gemeinsam an: je vier Takte zwei kurze Löcher (ein bis zwei Schläge), dazu am Ende ein Tape-Stop der Drums
      for (let g = 0; g < L; g += 4) for (const takt of [a.von + g + 1, a.von + g + 3]) {
        const schlag = Math.floor(gem() * 4), lang = 4 + 4 * Math.floor(gem() * 2);
        if (takt < a.bis) out.push(E("dropout", takt + schlag / 4, lang, { rest: 0, kante: 3 }));
      }
      if ([...DRUMS, "bass"].includes(f)) out.push(E("tapestop", a.bis - 0.5, 8, { kurve: 1.4 }));
    }
    if (a.typ === "atmen") {
      // ein- und ausatmen: Filter zu und auf über je zwei Takte; die Höhen lassen dabei Luft
      if (["bass", "pad", "perkussion", "oben"].includes(f)) for (let t = a.von; t < a.bis; t += 2) out.push(E("filter", t, 32, { typ: "tief", von: f === "bass" ? 1500 : 12000, bis: f === "bass" ? 120 : 400, resonanz: 20, zurueck: 1 }));
      if (f === "pad") out.push(E("knarz", a.von, L * 16, { dichte: 15, laenge: 300, staerke: 50, farbe: "zittern" }));
    }
    if (a.typ === "verlieren") {
      // die Drums lösen sich auf: Glitch, Echo, Rückwärts; zuletzt bleibt nur die Natur
      if (f === "perkussion") { out.push(E("glitch", a.von, Math.min(L, 2) * 16, { teilung: 32, dichte: 70, zerkleinern: 40 })); out.push(E("echo", a.von + 2, 8, { zeit: 16 / 3, rueck: 75, dunkel: 60, anteil: 90 })); }
      if (f === "pad") out.push(E("knarz", a.von, L * 16, { dichte: 60, laenge: 260, staerke: 80, farbe: "mix" }));
      if (f === "melodie") out.push(E("rueckwaerts", a.von + 1, 16, { kante: 10 }));
      if (!["natur", "kick"].includes(f) && L >= 2) out.push(E("dropout", a.bis - 1, 16, { rest: f === "pad" ? 30 : 0, kante: 40 }));   // die Kick kehrt hier schon zurück
    }
    if (a.typ === "outro" && f === "pad") out.push(E("filter", a.von, L * 16, { typ: "tief", von: 14000, bis: 250, resonanz: 20 }));
  });
  // Schluss: alles ausser der Natur läuft mit einem Tape-Stop aus
  if (f !== "natur") out.push(E("tapestop", takte - 0.5, 8, { kurve: 1 }));
  return out.filter((e) => e.takt >= 0 && e.takt < takte).sort((x, y) => x.takt - y.takt);
}

/**
 * Besetzung je Stil (seit 0.2.0 mit Stilmix): Perkussion aus einem anderen Stil als zweite Schicht, Bass (Linie), Synths mit Rolle,
 * zwei Naturschichten; «ohne» nimmt Stimmen des Stils aus dem Track (Orient ohne Riq: seine Schellen nervten). Keine Keys (Urteil vom 9. November 2026); Flächen als «Schwebe» in ungeraden Zyklen. Keine Tabla im Mix (ihr
 * helles «Na» lief als nervendes Dauergeräusch durch DnB, ECM und Goa), keine Pflanzentextur als Natur (Glocken sind keine Naturgeräusche).
 */
/**
 * Wechselnde Perkussion (Ornament Style): je Abschnitt spielen nur eine oder zwei der Stimmen (aus dem Startwert, nie zweimal dieselbe
 * Auswahl hintereinander); die übrigen schweigen dort. Gibt Map stimme → [Dropout-Ereignisse].
 */
export function wechselPerkussion(stimmen, abschn, { seed = 1 } = {}) {
  const rnd = zufall(seed * 977 + 11), aus = new Map(stimmen.map((s) => [s, []]));
  let vorher = "";
  for (const a of abschn) {
    let wahl;
    for (let v = 0; v < 6; v++) {
      const n = ["gas", "wiederfinden"].includes(a.typ) ? 2 : 1, rest = [...stimmen];
      wahl = Array.from({ length: Math.min(n, rest.length) }, () => rest.splice(Math.floor(rnd() * rest.length), 1)[0]).sort();
      if (wahl.join() !== vorher || stimmen.length < 2) break;
    }
    vorher = wahl.join();
    for (const s of stimmen) if (!wahl.includes(s)) aus.get(s).push(E("dropout", a.von, (a.bis - a.von) * 16, { rest: 0, kante: 20 }));
  }
  return aus;
}

/** Teile einer Spur aus den Abschnitten: defs { typ: Zeilen, fill } → [{ von, bis, takte | null, fill }] (Wirbel an jedem Abschnittsende) */
export function teileAus(defs, abschn) {
  if (!defs) return null;
  return abschn.map((a) => ({ von: a.von, bis: a.bis, takte: defs[a.typ] ?? null, fill: defs.fill ?? null })).filter((t) => t.takte || t.fill);
}

// Synths: [Familie, Preset, Rolle, { pegel (dB zum Standard), regler }]. Seit Synth 0.2.0 (melodien.md) kommen bei Ornament und Drum and
// Bass zur Schwebe zwei leise Schichten dazu: helle Spitzen (Spieldose, gedämpft) und unregelmässige Off-Beats in den Lücken der Drums.
export const BESETZUNG = Object.freeze({
  // bassTeile: je Abschnitt eine eigene Art der Linie (seit Composer 0.3); Wind der Gezeiten zurückgenommen (Urteil: «etwas dominant»)
  ornament: { linie: "zyklus", wechsel: ["tabla", "darbuka", "zarb", "riq"], synths: [["shadow", "deepRoomDrone", "schwebe"], ["ice", "musicBoxFrost", "spitzen", { pegel: -7, regler: { spitzen: 30, klassik: 60 } }], ["velvet", "velvetRhodes", "offbeat", { pegel: 0, regler: { offbeat: 30, ruhe: 50 } }]],
    bassTeile: { aufbau: "lang", haupt: "zyklus", gas: "kick", stocken: "riff", atmen: "lang", wiederfinden: "riff", outro: "lang" },
    natur: [["gezeiten", { verwandlung: 30, wellen: 70, wind: 8 }, { pegel: 4 }], ["walchor", { verwandlung: 40 }, { pegel: 3 }], ["vogel", { dichte: 30 }, { pegel: 3 }]] },
  dnb: { mix: [["orient", "darbuka"]], linie: "lang", synths: [["shadow", "deepRoomDrone", "schwebe"], ["ice", "musicBoxFrost", "spitzen", { pegel: -6, regler: { spitzen: 45, klassik: 60 } }], ["velvet", "velvetRhodes", "offbeat", { pegel: 0, regler: { offbeat: 30 } }]], natur: [["gezeiten", { verwandlung: 40, tonalitaet: 40 }], ["insekten", { verwandlung: 60, tonalitaet: 0 }]] },
  hiphop: { mix: [["orient", "darbuka"]], linie: "kick", synths: [["tape", "amberMemory", "schwebe"]], natur: [["regen", {}], ["walchor", { verwandlung: 50 }]] },
  pop: { mix: [["persisch", "zarb"]], linie: "zyklus", synths: [["darkpop", "darkBrass", "schwebe"]], natur: [["vogel", { dichte: 25 }]] },
  minimal: { mix: [["ecm", "udu"]], linie: "zyklus", synths: [["shadow", "deepRoomDrone", "schwebe"]], natur: [["regen", { verwandlung: 30 }], ["feuer", { variante: "Glut" }]] },
  goa: { mix: [["persisch", "zarb"]], linie: "zyklus", synths: [["goa", "spiralAcid"], ["shadow", "deepRoomDrone", "schwebe"]], natur: [["insekten", { verwandlung: 70 }], ["gezeiten", { verwandlung: 80 }]] },
  house: { mix: [["orient", "riq"]], linie: "offbeat", synths: [["house", "velvetOrgan"], ["trance", "openSky", "schwebe"]], natur: [["regen", { verwandlung: 40 }]] },
  indien: { mix: [["dnb", "hat"]], linie: "zyklus", synths: [["tape", "amberMemory", "schwebe"], ["raga", "tanpuraGlow", "tanpura", { pegel: -3 }]], natur: [["vogel", { dichte: 25 }], ["regen", {}]] },
  orient: { ohne: ["riq"], mix: [["dnb", "hat"]], linie: "zyklus", synths: [["shadow", "shadowChord", "schwebe"]], natur: [["gezeiten", { wellen: 50, wind: 40 }], ["feuer", {}]] },
  ecm: { mix: [["persisch", "zarb"]], linie: "zyklus", synths: [["shadow", "deepRoomDrone", "schwebe"]], natur: [["walchor", { verwandlung: 50 }], ["regen", { verwandlung: 30 }]] },
  persisch: { mix: [["orient", "darbuka"]], linie: "zyklus", synths: [["tape", "amberMemory", "schwebe"]], natur: [["vogel", { dichte: 15, raum: 90 }], ["insekten", {}]] },
});
