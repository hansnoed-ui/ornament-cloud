// ornament.lucerne 0.1.0 – Stilprofil (Christians Auftrag vom 10. November 2026). Warme, leicht instabile Melodik aus eigenen Aufnahmen,
// gebrochene, präzise gesetzte Rhythmen, ein wiederkehrendes Motiv, das sich verwandelt. Bezugspunkte Boards of Canada und Aphex Twin
// im Umgang mit Material; die Regeln hier sind ein eigener Entwurf, keine Nachbildung.
//
// planen() macht aus einer Klangsammlung, einer Ausprägung, Makros, Sperren und Startwerten ein aufgelöstes Modell: Abschnitte,
// Harmonie je Takt, alle Ereignisse jeder Spur in musikalischer Zeit, Material je Rolle, Zeitmarken. Gespeichert wird das Ergebnis
// zusammen mit den Startwerten; Vorschau, Wiederladen und Export spielen dasselbe Modell. Zählung: in der Oberfläche und in den
// Konstanten dieser Datei beginnen Takte und Schritte bei 1 (Schritte 1, 5, 9, 13 = Zählzeiten 1–4); intern (t in Takten ab 0,
// Schritt 0–15) bei 0. Umrechnung: schritt0 = schritt1 − 1, takt0 = takt1 − 1.

import { zufall, hash } from "../erzeuger/grund.js";
import { stimmeVon } from "../erzeuger/register.js";
import { LEITERN, NOTEN } from "./linien.js";
import { SAMPLER } from "./sampler.js";

export const PROFIL = Object.freeze({ id: "ornament.lucerne", schema: "0.1.0", name: "ornament.lucerne", gruppe: "ornament" });

export const AUSPRAEGUNGEN = Object.freeze({
  erinnerung: { name: "Erinnerung", bpm: 84, bereich: [78, 104], fertig: true, hilfe: "warme Melodik, Raum, verlangsamte Materialschichten, gebrochener Groove" },
  bruch: { name: "Bruch", bpm: 138, bereich: [126, 154], fertig: false, hilfe: "präzisere Zerteilung, komplexere Perkussion über längerem Bogen (Halftime möglich)" },
  nacht: { name: "Nacht", bpm: 72, bereich: [60, 88], fertig: false, hilfe: "reduzierte Impulse, ausklingende Instrumente, atmosphärische Entwicklung" },
});

/** Makros 0–100 mit ihrer tatsächlichen Wirkung (so in LUCERNE.md dokumentiert) */
export const MAKROS = Object.freeze({
  waerme: { name: "Wärme", std: 45, wirkung: "Sättigung (tanh, Antrieb 1 + 5·W) und Höhenabsenkung (Tiefpass 18 kHz − 11 kHz·W) auf allen Sampler-Klängen ausser Akzenten" },
  instabilitaet: { name: "Instabilität", std: 35, wirkung: "Drift je Note (±12 Cent·I, fest je Note), gemeinsames Leiern der Schichten Motiv/Harmonie/Textur/Umgebung (Wow bis 25 Cent·I, Flutter 3 Cent·I), ab 60: Alterung (Rauschen, 12 Bit); Bass und Drums bleiben stabil" },
  fragmentierung: { name: "Fragmentierung", std: 30, wirkung: "Dichte und Länge der Schnitte: Auslassen (15 % + 50 %·F), Tauschen (10 % + 60 %·F), Zweiunddreissigstel-Wiederholung (40 %·F) in der Verwandlung; Schnitte an Phrasenenden und zerteilte Motivnoten in den anderen Abschnitten" },
  wiederkehr: { name: "Wiederkehr", std: 60, wirkung: "Anteil wörtlicher Motivwiederholungen (W) gegenüber Abwandlungen (Endton, Register, Dauer, Pause); die erste Aussage im Ersten Gedanken und in der Wiederkehr bleibt immer wörtlich" },
  unterbrechung: { name: "Unterbrechung", std: 45, wirkung: "Das Motiv setzt aus: ganze Aussagen bleiben still (12 % + 40 %·U, nie zweimal hintereinander) oder reissen mitten in der Phrase ab (10 % + 40 %·U); die erste Aussage jedes Abschnitts bleibt" },
  knarzen: { name: "Knarzen", std: 55, wirkung: "Drums: Sättigung (Kick 20 + 30·K, Snare 30 + 60·K), Snare und Hi-Hat mit weniger Bits (12 − 5·K) und tieferer Abtastrate (22 − 12·K kHz), Knistern auf den Hi-Hats (2 + 8·K je Sekunde)" },
  raum: { name: "Raum", std: 45, wirkung: "Hallanteil (8–40 %) und Nachhall (1,2–4 s) je Rolle gestaffelt, Echo des Motivs (punktierte Achtel, 0–30 %), Stereobreite der Texturen" },
});
export const SPERRBAR = Object.freeze(["motiv", "groove", "bass", "tempo", "tonart", "material"]);

export const NAMEN = Object.freeze({ auftauchen: "Auftauchen", gedanke: "Erster Gedanke", vertiefung: "Vertiefung", freistellung: "Freistellung", verwandlung: "Verwandlung", wiederkehr: "Wiederkehr", nachbild: "Nachbild" });
/** Gerüst Erinnerung: 88 Takte bei 84 BPM ≈ 251 s (Takte 1–8, 9–24, 25–40, 41–48, 49–64, 65–80, 81–88) */
export const GERUEST = Object.freeze([["auftauchen", 8], ["gedanke", 16], ["vertiefung", 16], ["freistellung", 8], ["verwandlung", 16], ["wiederkehr", 16], ["nachbild", 8]]);
export const AUSKLANG = 2;   // Takte nach dem Ende für ausklingende Räume (alle Spuren gleich lang)

/** Zweitaktgroove (Schritte 1–16, Zählung ab 1) */
export const GROOVE = Object.freeze({
  A: { kick: [1, 7, 9], snare: [5, 13], hat: [1, 3, 5, 7, 9, 11, 13, 15], offen: [], ghost: [12] },
  B: { kick: [1, 8, 11], snare: [5, 13], hat: [1, 3, 5, 7, 9, 11], offen: [15], ghost: [16] },
  V: { kick: [1, 4, 11], snare: [13], hat: [1, 3, 5, 9, 11, 13], offen: [], ghost: [7, 15] },   // Verwandlung: halbe Zeit, Kick auf 4
});
/** Swing je Rolle (Anteil eines Sechzehntels: 0,10 = 55:45, 0,16 = 58:42) und Mikroverschiebung (ms, fest + zufällig mit Startwert) */
// Schleppend (Urteil 10.11.): Snare und Ghosts deutlich hinter dem Schlag, Hi-Hats mit mehr Swing und etwas später, die Kick bleibt vorn
export const TIMING = Object.freeze({ kick: [0, 0, 2], snare: [0, 20, 3], hat: [0.2, 9, 4], offen: [0.2, 9, 3], ghost: [0.18, 16, 4], motiv: [0.1, 0, 4], gegen: [0.1, 6, 4], fragment: [0.12, 6, 0] });

/** Motivzelle: [Schritt (0–31 über zwei Takte), Dauer (Sechzehntel), Stufe, Oktave]. Ruf und Antwort, zusammen vier Takte */
export const ZELLE = Object.freeze({
  ruf: [[0, 3, 5, 0], [3, 3, 7, 0], [6, 6, 1, 1], [18, 2, 7, 0], [20, 10, 5, 0]],
  antwort: [[0, 3, 5, 0], [3, 3, 7, 0], [6, 4, 3, 1], [10, 2, 7, 0], [16, 12, 1, 1]],
});
/** Harmonie: Stufen, je zwei Takte (P1 Grundfolge i–VI–III–VII, P2 «andere Perspektive» i–iv–VI–v) */
const P1 = [1, 1, 6, 6, 3, 3, 7, 7], P2 = [1, 1, 4, 4, 6, 6, 5, 5];
const QUALITAET_MOLL = ["moll", "vermindert", "dur", "moll", "moll", "dur", "dur"];

const halbVon = (stufe, okt = 0, leiter = "moll") => { const st = LEITERN[leiter]?.stufen ?? LEITERN.moll.stufen, k = stufe - 1; return st[((k % 7) + 7) % 7] + 12 * Math.floor(k / 7) + 12 * okt; };

/**
 * ein Takt eines Grooves: Stellen als Zahlen (1–16) oder Text mit Form («7!» betont, «12_» leise; so speichert der Groove-Editor).
 * Gibt { kick: [Zahlen], …, form: { kick: { stelle: "!" | "_" }, … } }.
 */
function grooveTakt(def) {
  const out = { form: {} };
  for (const [k, liste] of Object.entries(def)) {
    if (!Array.isArray(liste)) { out[k] = liste; continue; }
    out[k] = liste.map((x) => { const m = /^(\d+)([!_]?)$/.exec(String(x)); if (!m) return null; if (m[2]) (out.form[k] ??= {})[Number(m[1])] = m[2]; return Number(m[1]); }).filter((x) => x != null);
  }
  return out;
}

/** Abschnitte (0-basiert, bis exklusiv). variieren: Längen aus dem Startwert, Funktion und Reihenfolge bleiben */
export function abschnitteFuer({ seed = 1, variieren = false, studie = false, geruest = null } = {}) {
  if (studie) return [{ typ: "gedanke", name: NAMEN.gedanke, von: 0, bis: 8 }, { typ: "vertiefung", name: NAMEN.vertiefung, von: 8, bis: 16 }];
  const rnd = zufall(hash(seed, "abschnitte"));
  let von = 0;
  // eigenes Gerüst (für längere, anders gebaute Tracks): [[typ, takte], …]; ein Typ darf mehrfach vorkommen (Name mit II, III …)
  const zaehler = {};
  return (geruest ?? GERUEST).map(([typ, l]) => { const lang = variieren && l === 16 ? [8, 16, 16][Math.floor(rnd() * 3)] : l; zaehler[typ] = (zaehler[typ] ?? 0) + 1; const a = { typ, name: NAMEN[typ] + (zaehler[typ] > 1 ? ` ${["", "II", "III", "IV"][zaehler[typ] - 1] ?? zaehler[typ]}` : ""), von, bis: von + lang }; von += lang; return a; });
}

// ---------- Material ----------
/** Tonart aus den Akkorden der Harmonie-Ausschnitte: die Molltonart, in der die meisten Akkorde leitereigen sind */
export function tonartAusMaterial(sammlung) {
  const ak = sammlung.ausschnitte.filter((a) => a.rolle === "harmonic_layer" && a.akkord).map((a) => a.akkord);
  if (!ak.length) return { grundton: 9, leiter: "moll", grund: "keine Akkorde im Material: a-Moll als Ausgang" };
  let best = null;
  for (let g = 0; g < 12; g++) {
    let s = 0;
    for (const a of ak) for (let d = 1; d <= 7; d++) if ((g + halbVon(d)) % 12 === a.grundton && QUALITAET_MOLL[d - 1] === a.art) s += d === 1 ? 1.5 : 1;
    if (!best || s > best.s) best = { g, s };
  }
  return { grundton: best.g, leiter: "moll", grund: `${best.s} von ${ak.length} Akkorden leitereigen` };
}

/** für einen Akkord (Grundton, Art) den passenden Ausschnitt und die nötige Transposition; Aliasse («auch») zählen wie eigene */
function akkordKlang(kandidaten, grundton, art) {
  let best = null;
  for (const a of kandidaten) for (const x of [a.akkord, ...(a.akkord?.auch ?? [])].filter(Boolean)) {
    const t = ((grundton - x.grundton + 18) % 12) - 6, wert = Math.abs(t) + (x.art === art ? 0 : 20);
    if (!best || wert < best.wert) best = { a, t, wert };
  }
  return best;
}

/**
 * Material je Rolle aus der Sammlung (reproduzierbar aus dem Startwert): bei mehreren Kandidaten einer Rolle entscheidet der Startwert.
 * Instrumente (Motiv) und Akkorde nehmen alle passenden Ausschnitte. Fehlt eine Rolle, bleibt sie leer (und der Plan nennt den Grund).
 */
export function materialWaehlen(sammlung, { seed = 1, auswahl = null } = {}) {
  const rnd = zufall(hash(seed, "material")), wahl = {}, quellen = auswahl ? new Set(auswahl) : null;
  const von = (rolle) => sammlung.ausschnitte.filter((a) => (a.rollen ?? [a.rolle]).includes(rolle) && (!quellen || quellen.has(a.quelle)) && !a.aus && !a.nurErsetzen);   // «nurErsetzen»: nur ausdrücklich über «Quelle ersetzen»
  for (const r of ["main_motif", "harmonic_layer"]) wahl[r] = von(r).map((a) => a.id);
  // Startwert 1 nimmt je Rolle die erste Wahl (höchster «vorrang»), weitere Startwerte gehen die Kandidaten der Reihe nach durch
  const reihe = (k) => [...k].sort((a, b) => (b.vorrang ?? 0) - (a.vorrang ?? 0) || a.id.localeCompare(b.id));
  ["counter_motif", "texture", "ambience", "fragment", "voice_optional"].forEach((r, i) => { const k = reihe(von(r)); wahl[r] = k.length ? [k[((seed - 1) * (i + 1)) % k.length].id] : []; });
  const ak = reihe(von("accent")); wahl.accent = ak.length ? Array.from({ length: Math.min(2, ak.length) }, (_, j) => ak[(seed - 1 + j) % ak.length].id) : [];
  void rnd;
  return wahl;
}

// ---------- Planen ----------
/**
 * eingabe: { sammlung, auspraegung, seed, seeds?: { groove, motiv, bass, material, fragment }, makros, sperren: { motiv, groove, … ,
 *   abschnitte: [typ] }, vorher (früherer Plan, für Sperren), studie (16 Takte), variieren, bpm?, auswahl? (Quell-IDs) }
 * Gibt den Plan: { profil, schema, auspraegung, bpm, grundton, leiter, kammerton, seeds, makros, sperren, abschnitte, takte, harmonie,
 *   material, spuren: [{ key, name, typ, rolle, pegel, pan, raum, echo, quelle }], resampling, marker, hinweise }
 */
export function planen(eingabe) {
  const { sammlung, auspraegung = "erinnerung", seed = 1, vorher = null, studie = false, variieren = false } = eingabe;
  const sp = { ...(eingabe.sperren ?? {}) }, alt = vorher && !studie === !vorher.studie ? vorher : null;
  const halte = (k) => !!(sp[k] && alt);
  const au = AUSPRAEGUNGEN[auspraegung] ?? AUSPRAEGUNGEN.erinnerung, hinweise = [];
  if (!au.fertig) hinweise.push(`Ausprägung «${au.name}» ist noch nicht ausgearbeitet: geplant wie «Erinnerung» im Tempo ${au.bpm} BPM`);
  const makros = { ...Object.fromEntries(Object.entries(MAKROS).map(([k, m]) => [k, m.std])), ...(eingabe.makros ?? {}) };
  const seeds = { groove: seed, motiv: seed, bass: seed, material: seed, fragment: seed, ...(eingabe.seeds ?? {}) };
  for (const k of ["groove", "motiv", "bass", "material"]) if (halte(k)) seeds[k] = alt.seeds[k];
  const bpm = halte("tempo") ? alt.bpm : eingabe.bpm ?? au.bpm;
  const material = structuredClone(halte("material") ? alt.material : materialWaehlen(sammlung, { seed: seeds.material, auswahl: eingabe.auswahl }));
  // «Quelle ersetzen» je Rolle: die übrigen Rollen behalten ihr Material (mit Sperre «material»), Ereignisse bleiben mit ihren Sperren
  for (const [rolle, ids] of Object.entries(eingabe.ersetze ?? {})) material[rolle] = [...ids];
  const GR = { ...GROOVE, ...(eingabe.groove ?? {}) }, TI = { ...TIMING, ...(eingabe.timing ?? {}) };
  const ton = halte("tonart") ? { grundton: alt.grundton, leiter: alt.leiter, grund: "gesperrt" } : tonartAusMaterial({ ausschnitte: sammlung.ausschnitte.filter((a) => material.harmonic_layer.includes(a.id)) });
  const abschnitte = halte("abschnitte_folge") ? alt.abschnitte : abschnitteFuer({ seed, variieren, studie, geruest: eingabe.geruest ?? alt?.geruest ?? null });
  const takte = abschnitte.at(-1).bis, gesamt = takte + AUSKLANG, T = 240 / bpm;
  const cut = (id) => sammlung.ausschnitte.find((a) => a.id === id);
  const quelleName = (id) => sammlung.quellen.find((q) => q.id === id)?.name ?? id;
  const plan = { profil: PROFIL.id, schema: PROFIL.schema, auspraegung, bpm, groove: eingabe.groove ?? null, timing: eingabe.timing ?? null, geruest: eingabe.geruest ?? alt?.geruest ?? null, ersetze: eingabe.ersetze ?? null, auswahl: eingabe.auswahl ?? null, grundton: ton.grundton, leiter: ton.leiter, kammerton: 440, seed, seeds, makros, sperren: sp, studie, abschnitte, takte, gesamt, material, spuren: [], resampling: [], marker: [], hinweise, tonartGrund: ton.grund };
  const typVon = (b) => abschnitte.find((a) => b >= a.von && b < a.bis) ?? { typ: "ausklang", von: takte, bis: gesamt };
  const M = (k) => makros[k] / 100;

  // Harmonie je Takt (Stufe der Leiter)
  const harmonie = [];
  for (const a of abschnitte) for (let b = a.von; b < a.bis; b++) {
    const p = b - a.von, L = a.bis - a.von;
    harmonie[b] = a.typ === "vertiefung" ? (p >= 8 || (L <= 8 && p >= 4) ? P2[p % 8] : P1[p % 8])
      : a.typ === "freistellung" ? (p < L / 2 ? 1 : 6)
      : a.typ === "verwandlung" ? (Math.floor(p / 4) % 2 ? 6 : 1)
      : a.typ === "wiederkehr" ? (p >= L - 8 ? [1, 1, 4, 4, 6, 6, 7, 7][p % 8] : P1[p % 8])
      : a.typ === "nachbild" || a.typ === "auftauchen" ? 1 : P1[p % 8];
  }
  for (let b = takte; b < gesamt; b++) harmonie[b] = 1;
  plan.harmonie = harmonie;
  const akkordVon = (stufe) => ({ grundton: (ton.grundton + halbVon(stufe, 0, ton.leiter)) % 12, art: QUALITAET_MOLL[stufe - 1] });
  const tonika = 60 + ton.grundton;   // Bezugston des Motivs (Oktave 4)

  // ---------- Drums (Erzeuger drums@0.1.0; Zeilen je Takt, vollständig ausgeschrieben) ----------
  const drumKeys = ["kick", "snare", "ghost", "hat", "offen"];
  let drumZeilen;
  if (halte("groove")) drumZeilen = alt.drumZeilen;
  else {
    const rnd = zufall(hash(seeds.groove, "groove")), z = Object.fromEntries(drumKeys.map((k) => [k, []]));
    for (let b = 0; b < gesamt; b++) {
      const a = typVon(b), p = b - a.von, L = a.bis - a.von, letzter = p === L - 1, nach = abschnitte.find((x) => x.von === a.bis)?.typ;
      let g = null;
      if (["gedanke", "vertiefung", "wiederkehr"].includes(a.typ)) g = grooveTakt(p % 2 ? GR.B : GR.A);
      else if (a.typ === "verwandlung") g = grooveTakt(GR.V);
      else if (a.typ === "auftauchen" && letzter && !studie) g = { kick: [], snare: [], hat: [9, 11, 13, 15], offen: [], ghost: [] };   // vorgezogener Eintritt
      else if (a.typ === "freistellung" && p < 4) g = { kick: [], snare: [], hat: [1, 5, 9, 13], offen: [], ghost: [], leise: true };
      else if (a.typ === "nachbild" && p < 4) g = { kick: [1], snare: [], hat: [1, 5, 9, 13], offen: [], ghost: [], leise: true };
      const v = { hat32: false };
      if (g && a.typ === "wiederkehr" && p % 4 === 2) g.kick = [...new Set([...g.kick, 4])].sort((x, y) => x - y);   // Erinnerung an die Verwandlung
      if (g && ["gedanke", "vertiefung", "wiederkehr", "verwandlung"].includes(a.typ)) {
        if (letzter && nach === "freistellung") { g.kick = g.kick.filter((s) => s <= 8); g.snare = g.snare.filter((s) => s <= 8); g.hat = g.hat.filter((s) => s <= 8); g.ghost = []; g.offen = []; }   // Bruch: die Drums brechen nach der halben Note ab
        else if (p % 8 === 7 || letzter) {
          const art = ["snare", "pause", "hat32"][Math.floor(rnd() * 3)];
          if (art === "snare") { g.ghost = [...g.ghost.filter((s) => s < 13), 14, 15]; g.snare = [...g.snare, 16]; }
          else if (art === "pause") { g.kick = g.kick.filter((s) => s < 9); g.offen = []; }
          else v.hat32 = true;
          plan.marker.push({ art: "fill", takt: b, text: art });
        } else if (p % 4 === 3) {
          const art = ["kick", "ghost", "hat", "akzent"][Math.floor(rnd() * 4)];
          if (art === "kick") g.kick = g.kick.map((s) => (s === 11 ? 12 : s === 9 ? 10 : s));
          else if (art === "ghost") g.ghost = g.ghost.map((s) => (s === 16 ? 4 : s === 12 ? 10 : s));
          else if (art === "hat") g.hat = g.hat.filter((s) => s !== 13);
          else v.akzent = true;
        }
      }
      // ein Takt als Zeile; eine Stelle mit «!» oder «_» (aus dem Groove-Editor) betont oder dämpft den Schlag
      const zeile = (stellen, tok, n = 16, key = null) => { const t = Array(n).fill("."); for (const s of stellen ?? []) { const i = n === 32 ? (s - 1) * 2 : s - 1; if (i < 0 || i >= n) continue; const basis = typeof tok === "function" ? tok(s) : tok, f = key ? g?.form?.[key]?.[s] : null; t[i] = f === "!" ? basis.replace(/[!_]$/, "")[0] + "!" : f === "_" ? basis.replace(/[!_]$/, "") + "_" : basis; } return t.join(" "); };
      if (g) g.form = g.form ?? {};
      if (!g) { for (const k of drumKeys) z[k].push(zeile([], ".")); continue; }
      z.kick.push(zeile(g.kick, (s) => (s === 1 ? "x" : "o"), 16, "kick"));
      z.snare.push(zeile(g.snare, (s) => (s === 13 && v.akzent ? "x!" : s === 16 ? "o" : "x"), 16, "snare"));
      z.ghost.push(zeile(g.ghost, (s) => (s % 2 ? "g" : "g_"), 16, "ghost"));
      z.offen.push(zeile(g.offen, "o", 16, "offen"));
      if (v.hat32) {
        const t = zeile(g.hat.filter((s) => s < 13), (s) => ((s - 1) % 4 === 0 ? "o" : "o_"), 32).split(" ");
        ["o_", "g", "g", "g_", "o_", "g", "o", "g_"].forEach((x, i) => (t[24 + i] = x));   // Zweiunddreissigstel nur auf der letzten Zählzeit
        z.hat.push(t.join(" "));
      } else z.hat.push(zeile(g.hat, (s) => (g.leise ? "g" : (s - 1) % 4 === 0 ? "o" : "o_"), 16, "hat"));
    }
    drumZeilen = z;
  }
  plan.drumZeilen = drumZeilen;
  const DRUM = { kick: ["kick", "Boom Bap", 0, "Kick"], snare: ["snare", "Boom Bap", -1, "Snare"], ghost: ["snare", "Boom Bap", -7, "Ghost-Snare"], hat: ["hat", "staubig", -5, "Hi-Hat"], offen: ["offen", "staubig", -10, "Hi-Hat offen"] };
  // Knarzen: Sättigung, weniger Bits, tiefere Abtastrate (Halten wie ein alter Sampler) und Staub auf den Hi-Hats; die Kick bleibt rund
  const kn = M("knarzen"), krumm = (seedK) => [{ art: "alterung", bits: Math.round(12 - 5 * kn), rate: Math.round(22000 - 12000 * kn), seed: seedK }];
  const DRUMNACH = {
    kick: kn > 0 ? [{ art: "waerme", menge: Math.round(20 + 30 * kn) }] : [],
    snare: kn > 0 ? [{ art: "waerme", menge: Math.round(30 + 60 * kn) }, ...krumm(2)] : [],
    ghost: kn > 0 ? [{ art: "waerme", menge: Math.round(30 + 60 * kn) }, ...krumm(3)] : [],
    hat: kn > 0 ? [...krumm(4), { art: "knistern", dichte: +(2 + 8 * kn).toFixed(1), db: -26, seed: 4 }] : [],
    offen: kn > 0 ? krumm(5) : [],
  };
  drumKeys.forEach((k) => {
    const [stimme, variante, pegel, name] = DRUM[k], st = stimmeVon("drums@0.1.0", stimme), v = st.varianten.find((x) => x.name === variante) ?? st.varianten[0], [sw, vers, mensch] = TI[k];
    const quelle = { art: "erzeugt", erzeuger: "drums@0.1.0", stimme, variante: v.name, werte: { ...v.werte }, takte: drumZeilen[k], fill: null, anzahl: gesamt, bpm, swing: sw, menschlich: mensch, versatz: vers, seed: hash(seeds.groove, k) % 99991 + 1, stil: "lucerne", lucerne: k, nach: DRUMNACH[k] };
    if (k === "offen") quelle.choke = { mit: "hat" };   // die geschlossene Hi-Hat schneidet die offene ab
    plan.spuren.push({ key: k, name, typ: "drums", rolle: "groove", pegel, pan: st.pan ?? 0, raum: { anteil: Math.round(6 + 14 * M("raum")), nachhall: 1.2 }, quelle });
  });
  { const hat = plan.spuren.find((x) => x.key === "hat").quelle, offen = plan.spuren.find((x) => x.key === "offen").quelle; offen.choke.zeiten = chokeZeiten(hat); }

  // ---------- Bass (bass@0.1.0, eigene Phrase: gemeinsamer Einsatz mit der Kick, Antwort, gehaltene Töne) ----------
  let bassZeilen;
  if (halte("bass")) bassZeilen = alt.bassZeilen;
  else {
    const rnd = zufall(hash(seeds.bass, "bass")); bassZeilen = [];
    for (let b = 0; b < gesamt; b++) {
      const a = typVon(b), p = b - a.von, r = harmonie[b], n = harmonie[b + 1] ?? r, t = Array(16).fill(".");
      const quinte = ((r - 1 + 4) % 7) + 1, naehe = ((n - 1 + (rnd() < 0.5 ? 1 : 6)) % 7) + 1;
      if (["gedanke", "vertiefung", "wiederkehr"].includes(a.typ) && !(a.typ === "gedanke" && p < 4 && !studie)) {
        const A = p % 2 === 0;
        if (A) { t[0] = `${r}`; for (let i = 1; i < 6; i++) t[i] = "-"; t[8] = `${r}`; t[9] = "-"; t[10] = "-"; if (a.typ === "wiederkehr" && p % 8 === 6) t[14] = `${r}'_`; }
        else { t[0] = `${r}`; for (let i = 1; i < 7; i++) t[i] = "-"; t[7] = `${quinte}_`; t[10] = `${r}`; t[11] = "-"; if (n !== r) t[13] = `${naehe}_`; }
        if (a.typ !== "freistellung" && b === a.bis - 1 && abschnitte.find((x) => x.von === a.bis)?.typ === "freistellung") for (let i = 8; i < 16; i++) t[i] = ".";
      } else if (a.typ === "verwandlung") {
        if (p % 2 === 0) { t[0] = `${r}`; for (let i = 1; i < 16; i++) t[i] = "-"; } else { for (let i = 0; i < 8; i++) t[i] = "-"; t[12] = `${r}_`; t[13] = "-"; }
      } else if (a.typ === "nachbild" && p === 0) { t[0] = "1"; for (let i = 1; i < 16; i++) t[i] = "-"; }
      bassZeilen.push(t.join(" "));
    }
  }
  plan.bassZeilen = bassZeilen;
  {
    const st = stimmeVon("bass@0.1.0", "rund"), v = st.varianten.find((x) => x.name === "Kruder & Dorfmeister") ?? st.varianten[0];
    plan.spuren.push({ key: "bass", name: "Bass · Rund", typ: "bass", rolle: "bass", pegel: st.pegel ?? -7, pan: 0, quelle: { art: "erzeugt", erzeuger: "bass@0.1.0", stimme: "rund", variante: v.name, werte: { ...v.werte }, takte: bassZeilen, anzahl: gesamt, bpm, grundton: ton.grundton, leiter: ton.leiter, kammerton: plan.kammerton, swing: 0, menschlich: 0, versatz: 0, seed: hash(seeds.bass, "b") % 99991 + 1, lucerne: "bass" } });
  }

  // ---------- Sampler-Spuren ----------
  const rndM = zufall(hash(seeds.motiv, "motiv")), rndF = zufall(hash(seeds.fragment, "fragment"));
  const warm = (extra = []) => [...extra, { art: "waerme", menge: makros.waerme }];
  const klangVon = (id, schritte = [], mehr = {}) => { const a = cut(id); return { quelle: a.quelle, von: a.von, bis: a.bis, grundMidi: a.tonhoehe?.midi != null ? Math.round(a.tonhoehe.midi) : null, cent: a.stimmung ?? 0, modus: "band", schritte, name: a.name ?? a.id, ausschnitt: a.id, aus: mehr.aus ?? 0.012, ...mehr }; };
  const sampler = (key, name, rolle, typ, klaenge, ereignisse, { pegel = -8, pan = 0, raum = null, echo = null, swing = 0, frei = false, nach = [] } = {}) => {
    if (!ereignisse.length) return;
    plan.spuren.push({ key, name, typ, rolle, pegel, pan, raum, echo, quelle: { art: "erzeugt", erzeuger: SAMPLER, rolle, anzahl: gesamt, bpm, seed: hash(seed, key) % 99991 + 1, swing, frei, klaenge, ereignisse, nach } });
  };
  const inst = M("instabilitaet"), frag = M("fragmentierung"), raumM = M("raum");
  const drift = (r) => Math.round((r() * 2 - 1) * 12 * inst);
  const alterung = inst > 0.6 ? [{ art: "alterung", rauschen: -52 + (inst - 0.6) * 20, bits: 12, seed: 5 }] : [];
  const schicht = (s) => [{ art: "instabil", menge: makros.instabilitaet, gemeinsam: true, seed: s }, ...alterung];
  const hall = (anteil, nachhall) => ({ anteil: Math.round(anteil * (0.4 + 1.2 * raumM)), nachhall: +(nachhall * (0.6 + 0.8 * raumM)).toFixed(2), daempfung: 5000, vorverz: 20 });

  // Hauptmotiv: Instrument aus den Motiv-Ausschnitten (Multisample, Band-Modus: jede Note nimmt den nächstgelegenen Ton)
  const motivKlaenge = {}, motivTon = [];
  for (const id of material.main_motif) { const a = cut(id); if (a?.tonhoehe?.midi == null) continue; const key = `m-${motivTon.length}`; motivKlaenge[key] = klangVon(id, warm(a.schritte ?? []), { aus: 0.3, ausklang: 0.16 }); motivTon.push({ key, midi: Math.round(a.tonhoehe.midi) }); }
  const instrument = (midi) => motivTon.reduce((x, y) => (Math.abs(y.midi - midi) < Math.abs(x.midi - midi) ? y : x));
  if (!motivTon.length) hinweise.push("kein Ausschnitt mit bestimmbarer Tonhöhe für das Hauptmotiv: Motiv fehlt");

  // Motivaussagen: 4 Takte (Ruf + Antwort), Abwandlungen nach «Wiederkehr»
  let motivNoten;
  if (halte("motiv")) motivNoten = alt.motivNoten;
  else {
    motivNoten = [];
    const aussage = (start, { woertlich = false, nur = null, oktave = 0, schluss = null, staerke = 0.82, umkehr = false, typ, abbruch = null } = {}) => {
      const ops = [], vorher = motivNoten.length;
      if (!woertlich && rndM() > M("wiederkehr")) { const alle = ["endton", "register", "dauer", "pause", "fragment"]; ops.push(alle[Math.floor(rndM() * alle.length)]); if (rndM() > 0.6) ops.push(alle[Math.floor(rndM() * alle.length)]); }
      const teile = [["ruf", 0], ["antwort", 2]];
      for (const [teil, off] of teile) {
        if (nur && nur !== teil) continue;
        if (teil === "antwort" && ops.includes("fragment")) continue;
        ZELLE[teil].forEach(([s, d, stufe, okt], i) => {
          if (teil === "antwort" && ops.includes("pause") && i === 1) return;
          let st = stufe, o = okt + oktave, dd = d;
          const letzte = i === ZELLE[teil].length - 1;
          if (teil === "antwort" && letzte && (ops.includes("endton") || schluss)) { st = schluss ?? [5, 3][Math.floor(rndM() * 2)]; o = st === 5 ? oktave : 1 + oktave; }
          if (teil === "antwort" && ops.includes("register")) o += 1;
          if (ops.includes("dauer") && letzte) dd = Math.max(2, Math.round(d * (rndM() < 0.5 ? 0.5 : 1.25)));
          motivNoten.push({ t: start + off + s / 16, d: dd / 16, midi: tonika + halbVon(st, o, ton.leiter), staerke: staerke * (i === 0 ? 1 : 0.88), typ, umkehr, cent: drift(rndM), versatz: Math.round(rndM() * TI.motiv[2]) });
        });
      }
      // Abbruch: die Phrase reisst nach «abbruch» (Anteil 0–1) ihrer Töne ab, der letzte Ton wird kurz gestossen und klingt nicht aus
      if (abbruch != null) {
        const zahl = motivNoten.length - vorher, bleiben = Math.max(1, Math.min(zahl - 1, Math.round(zahl * abbruch)));
        motivNoten.splice(vorher + bleiben);
        const letzte = motivNoten.at(-1); letzte.d = Math.min(letzte.d, 1 / 16); letzte.abgerissen = true;
        ops.push(`reisst nach ${bleiben} Tönen ab`);
      }
      plan.marker.push({ art: "motiv", takt: start, text: [typ, ...(ops.length ? ops : woertlich ? ["wörtlich"] : [])].join(" · ") });
    };
    // Unterbrechungen (Urteil 10.11.): ganze Aussagen bleiben still oder reissen ab; nie zwei stille hintereinander, die erste bleibt
    const rndU = zufall(hash(seeds.motiv, "unterbrechung")), U = M("unterbrechung");
    let stillZuvor = false;
    const unterbrochen = (erste, opts) => (start) => {
      const r = rndU(), r2 = rndU();
      if (!erste && !stillZuvor && r < 0.12 + 0.4 * U) { stillZuvor = true; plan.marker.push({ art: "motiv", takt: start, text: `${opts.typ} · Pause` }); return; }
      stillZuvor = false;
      aussage(start, { ...opts, abbruch: !erste && r2 < 0.1 + 0.4 * U ? 0.35 + 0.4 * rndU() : null });
    };
    for (const a of abschnitte) {
      const L = a.bis - a.von;
      if (a.typ === "auftauchen") aussage(a.von + L - 4, { nur: "ruf", staerke: 0.7, woertlich: true, typ: "Fragment" });   // Motivfragment, fern
      stillZuvor = false;
      if (a.typ === "gedanke") for (let p = 0; p < L; p += 4) unterbrochen(p === 0, { woertlich: p === 0, typ: "Gedanke" })(a.von + p);
      if (a.typ === "vertiefung") for (let p = 0; p < L; p += 4) unterbrochen(p === 0, { typ: "Vertiefung", staerke: 0.78 })(a.von + p);
      if (a.typ === "freistellung") for (let p = 0; p < L; p += 4) unterbrochen(p === 0, { typ: "Freistellung", staerke: 0.7, woertlich: p === 0 })(a.von + p);
      if (a.typ === "verwandlung") for (let p = 4; p < L; p += 8) aussage(a.von + p, { nur: "ruf", umkehr: true, staerke: 0.6, typ: "Verwandlung (rückwärts)" });
      if (a.typ === "wiederkehr") for (let p = 0; p < L; p += 4) unterbrochen(p === 0, { woertlich: p === 0, oktave: p >= 8 ? 1 : 0, schluss: p === 4 ? 5 : null, typ: "Wiederkehr" })(a.von + p);
    }
    // vorgezogener Eintritt der Wiederkehr: der erste Ton kommt eine Achtel zu früh
    const wk = abschnitte.find((a) => a.typ === "wiederkehr");
    if (wk) { const erste = motivNoten.find((x) => Math.abs(x.t - wk.von) < 1e-6); if (erste) { erste.t -= 2 / 16; erste.d += 2 / 16; erste.vorgezogen = true; } }
  }
  plan.motivNoten = motivNoten;
  if (motivTon.length) {
    const ev = [];
    for (const no of motivNoten) {
      const ins = instrument(no.midi), basis = { t: no.t, d: no.d, klang: ins.key, midi: no.midi, staerke: no.staerke, cent: no.cent, versatz: no.versatz, aus: no.abgerissen ? 0.02 : 0.18 };
      const typAb = typVon(Math.floor(no.t)).typ;
      // Fragmentierung zerteilt einzelne Motivnoten (nicht in der Freistellung und nicht in der ersten wörtlichen Aussage)
      if (!no.umkehr && !no.abgerissen && typAb !== "freistellung" && no.d >= 3 / 16 && rndF() < frag * 0.3) {
        const teile = no.d >= 6 / 16 ? 3 : 2;
        for (let j = 0; j < teile; j++) ev.push({ ...basis, t: no.t + (j * 2) / 16, d: 1 / 32, staerke: no.staerke * (1 - j * 0.15), aus: 0.03 });
        continue;
      }
      ev.push(no.umkehr ? { ...basis, schritte: [{ art: "umkehr" }], d: no.d * 2, aus: 0.05 } : basis);
    }
    sampler("motiv", `Hauptmotiv · ${quelleName(cut(material.main_motif[0])?.quelle)}`, "main_motif", "melodie", motivKlaenge, ev,
      { pegel: -2, pan: 0, swing: TI.motiv[0], raum: hall(26, 2.4), echo: { anteil: Math.round(30 * raumM), zeit: Math.round((0.75 * 60000) / bpm) }, nach: schicht(11) });
  }

  // Harmonie: Akkordschatten aus den Akkord-Ausschnitten, auf die Länge eines Akkords verlangsamt
  {
    const kand = material.harmonic_layer.map(cut).filter((a) => a?.akkord), klaenge = {}, ev = [];
    if (!kand.length) hinweise.push("keine Akkord-Ausschnitte: Harmonie-Schicht fehlt");
    let b = 0;
    while (kand.length && b < takte) {
      const a = typVon(b);
      if (a.typ === "auftauchen" || (a.typ === "gedanke" && b - a.von < 2 && !studie)) { b++; continue; }
      let e = b + 1; while (e < takte && harmonie[e] === harmonie[b] && typVon(e) === a) e++;
      const ak = akkordVon(harmonie[b]), w = akkordKlang(kand, ak.grundton, ak.art), key = w.a.id;
      klaenge[key] ??= klangVon(key, warm([{ art: "normal", db: -20 }]));
      const len = w.a.bis - w.a.von, dauer = (e - b) * T + 0.6, faktor = dauer / len;
      const strecken = faktor > 2.5 ? { art: "koerner", dauer, dichte: 55, laenge: 110, streuung: 0.06, tonhoehe: w.t, seed: b + 1, breite: 0.5 } : { art: "dehnung", faktor, halbtoene: w.t };
      ev.push({ t: b, d: e - b + 0.1, klang: key, staerke: a.typ === "verwandlung" ? 0.45 : 0.75, aus: 0.5, schritte: [strecken, { art: "huelle", ein: 0.35, aus: 0.5 }] });
      plan.marker.push({ art: "harmonie", takt: b, text: `${NOTEN[ak.grundton]} ${ak.art}` });
      b = e;
    }
    sampler("harmonie", `Akkordschatten · ${quelleName(kand[0]?.quelle)}`, "harmonic_layer", "flaeche", klaenge, ev, { pegel: -8, raum: hall(30, 3.2), nach: [...schicht(23), { art: "tiefpass", f: 6500, stufen: 1 }, { art: "hochpass", f: 160, stufen: 2 }] });
  }

  // Gegenmotiv (Vertiefung, Wiederkehr): lange Antworttöne in den Pausen des Motivs
  if (material.counter_motif.length) {
    const id = material.counter_motif[0], a = cut(id), ev = [], rndG = zufall(hash(seeds.motiv, "gegen"));   // eigener Zufallsstrom: unabhängig davon, ob das Motiv gesperrt ist
    const folge = [10, 7, 4, 7];   // Stufe 7, 5, 4, 5 → E, Cis, H, Cis in Fis-Moll (Halbtöne über der Tonika)
    for (const ab of abschnitte.filter((x) => ["vertiefung", "wiederkehr"].includes(x.typ))) for (let p = 0, k = 0; p + 3 <= ab.bis - ab.von; p += 4, k++) {
      const midi = tonika + folge[k % 4] + (folge[k % 4] > 8 ? 0 : 12);
      ev.push({ t: ab.von + p + 2 + 8 / 16, d: 1.3, klang: "g", midi, staerke: 0.7, versatz: TI.gegen[1] + Math.round(rndG() * TI.gegen[2]), cent: drift(rndG), aus: 1.2 });
    }
    if (a?.tonhoehe?.midi != null) sampler("gegen", `Gegenmotiv · ${quelleName(a.quelle)}`, "counter_motif", "melodie", { g: klangVon(id, warm([{ art: "normal", db: -20 }]), { aus: 0.4 }) }, ev, { pegel: -10, pan: 0.25, swing: TI.gegen[0], raum: hall(38, 3.6), nach: schicht(31) });
  }

  // Textur: Körner aus einem Ausschnitt; in der Verwandlung aus der bekannten Harmoniequelle (dieselbe Herkunft, anders verwendet)
  {
    const ev = [], klaenge = {};
    const tex = material.texture[0], verw = material.harmonic_layer[0];
    if (tex) klaenge.t = klangVon(tex, [{ art: "hochpass", f: 250 }, { art: "tiefpass", f: 4500 }, { art: "normal", db: -20 }]);
    if (verw) klaenge.v = klangVon(verw, [{ art: "hochpass", f: 200 }, { art: "normal", db: -20 }]);
    for (const a of abschnitte) {
      const dauer = (a.bis - a.von) * T, k = a.typ === "verwandlung" ? "v" : "t";
      if (!klaenge[k] || !["gedanke", "vertiefung", "verwandlung", "wiederkehr"].includes(a.typ)) continue;
      const korn = a.typ === "verwandlung" ? { art: "koerner", dauer, dichte: 28 + 40 * frag, laenge: 90 - 50 * frag, streuung: 0.5, streuungTon: 0, tonhoehe: 12, seed: a.von + 3, breite: 0.9 } : { art: "koerner", dauer, dichte: 35, laenge: 70, streuung: 0.4, seed: a.von + 1, breite: 0.6 + 0.3 * raumM };
      ev.push({ t: a.von, d: a.bis - a.von, klang: k, staerke: a.typ === "verwandlung" ? 0.6 : a.typ === "gedanke" ? 0.3 : 0.38, aus: 1, schritte: [korn, { art: "huelle", ein: 2, aus: 1.5 }] });
    }
    sampler("textur", "Textur · Körner", "texture", "flaeche", klaenge, ev, { pegel: -10, raum: hall(30, 3), nach: schicht(41) });
  }

  // Fragmente: eine rhythmische Phrase in Sechzehntel zerlegt und neu gesetzt (Verwandlung im Vordergrund, sonst an Phrasenenden)
  if (material.fragment.length) {
    const a = cut(material.fragment[0]), qb = a.quelleBpm ?? bpm, trans = transposition(a.tonart, ton), schritt16 = (60 / qb / 4) / 2 ** (trans / 12);
    const zahl = Math.max(1, Math.floor((a.bis - a.von) / 2 ** (-trans / 12) / schritt16 - 0.5));
    const ev = [];
    const schlag = (t, idx, st, d = 1 / 16) => ev.push({ t, d, klang: "f", ab: (idx % zahl) * schritt16, staerke: st, aus: 0.015 });
    for (const ab of abschnitte) {
      const L = ab.bis - ab.von;
      if (ab.typ === "verwandlung") for (let p = 0; p < L; p++) for (let s = 0; s < 16; s++) {
        if (p < 4 && s % 4) continue;   // Einführung: nur auf den Zählzeiten
        if (rndF() < 0.15 + 0.5 * frag) continue;
        const idx = rndF() < 0.1 + 0.6 * frag ? Math.floor(rndF() * zahl) : (p % 2) * 16 + s, st = s % 4 === 0 ? 0.75 : 0.5;
        if (rndF() < 0.4 * frag) { schlag(ab.von + p + s / 16, idx, st * 0.9, 1 / 32); schlag(ab.von + p + s / 16 + 1 / 32, idx, st * 0.7, 1 / 32); }
        else schlag(ab.von + p + s / 16, idx, st);
      }
      if (["gedanke", "vertiefung", "wiederkehr"].includes(ab.typ) && frag > 0.15) for (let p = 3; p < L; p += 4) {
        const n = Math.round(frag * 4);
        for (let j = 0; j < n; j++) schlag(ab.von + p + (16 - n + j) / 16, Math.floor(rndF() * zahl), 0.45);
      }
    }
    sampler("fragment", `Fragmente · ${quelleName(a.quelle)}`, "fragment", "perkussion", { f: klangVon(a.id, warm([{ art: "band", halbtoene: trans }, { art: "hochpass", f: 90 }, { art: "normal", db: -18 }])) }, ev, { pegel: -9, pan: -0.15, swing: TI.fragment[0], raum: hall(14, 1.4) });
    if (trans) hinweise.push(`Fragmente: ${trans > 0 ? "+" : ""}${trans} Halbtöne im Band-Modus (Tonart der Quelle → Tonart des Tracks); die Schnittlänge ändert sich mit`);
  }

  // Akzente: an Abschnittsanfängen und an der überraschenden Stelle in der Verwandlung
  if (material.accent.length) {
    const klaenge = Object.fromEntries(material.accent.map((id, i) => [`a${i}`, klangVon(id, [{ art: "normal", db: -16 }, { art: "tiefpass", f: 9000, stufen: 1 }])]));
    const ev = [];
    for (const ab of abschnitte) if (ab.typ !== "auftauchen") { ev.push({ t: ab.von, klang: `a${ev.length % material.accent.length}`, staerke: ab.typ === "nachbild" ? 0.45 : 0.8 }); plan.marker.push({ art: "akzent", takt: ab.von, text: ab.name }); }
    const vw = abschnitte.find((x) => x.typ === "verwandlung");
    if (vw) { const t = vw.von + Math.floor((vw.bis - vw.von) / 2) + 0.5; ev.push({ t, klang: "a0", staerke: 0.7, schritte: [{ art: "umkehr" }] }); plan.marker.push({ art: "bruch", takt: t, text: "Akzent rückwärts" }); }
    sampler("akzent", "Akzente", "accent", "perkussion", klaenge, ev, { pegel: -7, raum: hall(24, 2.2) });
  }

  // Stimme: bewusst dosiert (zwei Stellen in der Verwandlung, ein rückwärts verwischtes Echo im Nachbild)
  if (material.voice_optional.length) {
    const a = cut(material.voice_optional[0]), trans = transposition(a.tonart, ton), ev = [];
    const vw = abschnitte.find((x) => x.typ === "verwandlung"), nb = abschnitte.find((x) => x.typ === "nachbild");
    if (vw) { ev.push({ t: vw.von + 4, klang: "s", staerke: 0.7 }); ev.push({ t: vw.von + 12 + 0.5, klang: "s", staerke: 0.55, schritte: [{ art: "band", halbtoene: -12 }] }); }
    if (nb) ev.push({ t: nb.von + 4, klang: "s", staerke: 0.4, schritte: [{ art: "umkehr" }] });
    for (const e of ev) plan.marker.push({ art: "stimme", takt: e.t, text: "Stimmfragment" });
    sampler("stimme", `Stimme · ${quelleName(a.quelle)}`, "voice_optional", "stimme", { s: klangVon(a.id, warm([{ art: "band", halbtoene: trans }, { art: "hochpass", f: 220 }, { art: "tiefpass", f: 3800 }, { art: "normal", db: -20 }])) }, ev, { pegel: -11, pan: 0.12, raum: hall(34, 3), echo: { anteil: Math.round(25 * raumM), zeit: Math.round((0.75 * 60000) / bpm) } });
  }

  // Umgebung (frei, nach Zeit geführt): ein ferner, verlangsamter Teppich aus der Harmoniequelle; im Nachbild die Quelle unbearbeitet
  if (!studie) {
    const amb = material.ambience[0] ?? material.harmonic_layer[0], ev = [];
    if (amb) {
      const sek = (takt) => takt * T;
      for (const ab of abschnitte.filter((x) => ["auftauchen", "freistellung", "nachbild"].includes(x.typ))) {
        const dauer = (ab.bis - ab.von + (ab.typ === "auftauchen" ? 2 : ab.typ === "nachbild" ? AUSKLANG : 1)) * T;
        ev.push({ t: sek(ab.von), d: dauer, klang: "u", staerke: ab.typ === "auftauchen" ? 1 : 0.6, aus: 2.5, schritte: [{ art: "koerner", dauer: dauer + 3, dichte: 24, laenge: 120, streuung: 0.12, seed: ab.von + 7, breite: 0.8 }, { art: "tiefpass", f: 2400 }, { art: "hochpass", f: 140 }, { art: "huelle", ein: ab.typ === "auftauchen" ? 6 : 2.5, aus: 2.5 }] });
      }
      const nb = abschnitte.find((x) => x.typ === "nachbild"), quelle = cut(amb);
      if (nb && quelle) { ev.push({ t: sek(nb.von + 3), klang: "o", staerke: 0.75 }); plan.marker.push({ art: "material", takt: nb.von + 3, text: `Originalausschnitt ${quelleName(quelle.quelle)} ${quelle.von}–${quelle.bis} s` }); }
      sampler("umgebung", `Umgebung · ${quelleName(cut(amb)?.quelle)}`, "ambience", "flaeche", { u: klangVon(amb, [{ art: "normal", db: -22 }]), o: klangVon(amb, [{ art: "hochpass", f: 90 }, { art: "normal", db: -20 }], { aus: 1.5 }) }, ev, { pegel: -4, frei: true, raum: hall(28, 3.4), nach: schicht(53) });
    }
  }

  // Nachbild: zweite Klanggeneration – die erste Aussage des Motivs als Audio gerechnet, langsam und rückwärts wieder eingespielt
  {
    const nb = abschnitte.find((x) => x.typ === "nachbild"), gd = abschnitte.find((x) => x.typ === "gedanke");
    if (nb && gd && motivTon.length) {
      const id = `res:motiv@${gd.von}-${gd.von + 4}`;
      plan.resampling.push({ id, spur: "motiv", von: gd.von * T, bis: (gd.von + 4) * T });
      const ev = [{ t: nb.von, klang: "r", staerke: 0.7, schritte: [{ art: "band", halbtoene: -12 }, { art: "huelle", ein: 1.5, aus: 2 }] }, { t: nb.von + 4, klang: "r", staerke: 0.5, schritte: [{ art: "umkehr" }, { art: "band", halbtoene: -12 }, { art: "huelle", ein: 2, aus: 3 }] }];
      sampler("nachbild", "Nachbild · Resampling des Motivs", "main_motif", "melodie", { r: { quelle: id, von: 0, bis: 4 * T, grundMidi: null, cent: 0, modus: "band", schritte: [{ art: "tiefpass", f: 3000 }, { art: "normal", db: -20 }], name: "Motiv, erste Aussage (gerechnet)", aus: 0.5 } }, ev, { pegel: -8, raum: hall(40, 4), nach: schicht(61) });
      plan.marker.push({ art: "resampling", takt: nb.von, text: "zweite Generation des Motivs" });
    }
  }

  // gesperrte Abschnitte: Ereignisse und Zeilen in ihren Takten bleiben wie im vorigen Plan (nur bei gleicher Abschnittsfolge)
  const gesperrt = (sp.abschnitte ?? []).map((typ) => abschnitte.find((a) => a.typ === typ)).filter(Boolean);
  if (alt && gesperrt.length && JSON.stringify(alt.abschnitte) === JSON.stringify(abschnitte) && alt.bpm === bpm) {
    const drin = (t) => gesperrt.some((a) => t >= a.von - 1e-9 && t < a.bis - 1e-9);
    for (const x of plan.spuren) {
      const y = alt.spuren.find((v) => v.key === x.key), q = x.quelle;
      if (Array.isArray(q.takte) && y) q.takte = q.takte.map((z, b) => (drin(b) ? y.quelle.takte[b] ?? z : z));
      if (q.ereignisse) { const zuTakt = (e) => (q.frei ? e.t / T : e.t); q.ereignisse = [...q.ereignisse.filter((e) => !drin(zuTakt(e))), ...(y?.quelle.ereignisse ?? []).filter((e) => drin(zuTakt(e)))].sort((a, b) => a.t - b.t); if (y) Object.assign(q.klaenge, y.quelle.klaenge); }
    }
    plan.drumZeilen = Object.fromEntries(drumKeys.map((k) => [k, plan.spuren.find((x) => x.key === k).quelle.takte]));
    plan.bassZeilen = plan.spuren.find((x) => x.key === "bass").quelle.takte;
    for (const a of gesperrt) hinweise.push(`Abschnitt «${a.name}» gesperrt: unverändert übernommen`);
  }
  plan.motivNoten = plan.motivNoten.filter(Boolean);

  // Zeitmarken: Abschnitte (für das AV Studio), alles in Takten; Sekunden kommen beim Export dazu
  for (const a of abschnitte) plan.marker.push({ art: "abschnitt", takt: a.von, text: a.name });
  plan.marker.sort((x, y) => x.takt - y.takt);
  return plan;
}

/** Halbtöne, um die Tonart eines Ausschnitts (Moll-Bezug) in die Tonart des Tracks zu bringen (−6 … +5) */
export function transposition(tonart, ziel) {
  if (!tonart) return 0;
  const g = tonart.leiter === "dur" ? (tonart.grundton + 9) % 12 : tonart.grundton;   // Dur → parallele Molltonart
  return ((ziel.grundton - g + 18) % 12) - 6;
}

/** Material für das Resampling bereitstellen: aus einer gerechneten Spur den Zeitbereich als neue (abgeleitete) Quelle */
export function resamplingMaterial(plan, gerechnet, rate) {
  const out = new Map();
  for (const r of plan.resampling) {
    const k = gerechnet.get(r.spur);
    if (!k) continue;
    const a = Math.round(r.von * rate), b = Math.round(r.bis * rate);
    out.set(r.id, { kanaele: k.map((s) => s.slice(a, b)), rate });
  }
  return out;
}

/** Choke: die offene Hi-Hat endet, wo die geschlossene spielt (Zeiten in s aus den Rasterstellen, Swing und Versatz der geschlossenen) */
export function chokeZeiten(hatQuelle) {
  const T = 240 / hatQuelle.bpm, out = [];
  hatQuelle.takte.forEach((z, b) => {
    const t = z.trim().split(/\s+/), n = t.length;
    t.forEach((x, i) => { if (x !== "." && x !== "-") { const s16 = (i * 16) / n, ganz = Math.abs(s16 - Math.round(s16)) < 1e-6; out.push(b * T + (s16 / 16) * T + (ganz && Math.round(s16) % 2 ? (hatQuelle.swing ?? 0) * T / 16 : 0) + (hatQuelle.versatz ?? 0) / 1000); } });
  });
  return out;
}

/** alle Zeitmarken mit Sekunden (für Export und AV Studio) */
export const markerMitZeit = (plan) => plan.marker.map((m) => ({ ...m, takt1: Math.floor(m.takt) + 1, zeit: Math.round(m.takt * (240 / plan.bpm) * 1000) / 1000 }));
