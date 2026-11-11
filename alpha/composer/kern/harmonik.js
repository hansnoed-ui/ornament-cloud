// Harmonik 0.1.0 – regelbasierte Harmonik für den Composer (Auftrag ornament.bienne, 10. November 2026), ohne Abhängigkeit von einem Stil.
// Akkorde als Klänge (Grundton, Intervalle, Bass) getrennt vom Voicing (konkrete MIDI-Töne je Instrument). Modi mit charakteristischem Ton,
// geliehene Akkorde (Modal Interchange), chromatische Medianten, Dur/Moll-Wechsel, Orgelpunkte, Slash-Bässe. Eine Stimmführungssuche mit
// Kostentabelle (Regler «glatt ↔ Bruch»), Spielbarkeit für Flächen, Klavier, Gitarre und Bass. Ein Generator, der eine Grundidee (Zelle
// mit Eigenschaft) erzeugt und in Aussagen abwandelt, mit unregelmässigem harmonischem Rhythmus, Oberstimmen- und Basswechseln innerhalb
// eines Klangs und einer Spannungskurve. Keine fest einprogrammierten Akkordfolgen, nur Regeln; alles aus dem Startwert.

import { zufall, hash } from "../erzeuger/grund.js";

export const HARMONIK_VERSION = "0.1.0";
const TONNAMEN = ["C", "Cis", "D", "Es", "E", "F", "Fis", "G", "As", "A", "B", "H"];
export const tonName = (pc) => TONNAMEN[((pc % 12) + 12) % 12];
export const midiName = (m) => `${tonName(m)}${Math.floor(m / 12) - 1}`;

/** Modi mit ihrem charakteristischen Ton (Halbtöne über dem Zentrum), der in Akkorden und Oberstimme hörbar vorkommen soll.
 * gewicht: wie oft ein Stil den Modus von sich aus wählt (modusWaehlen). Ionisch hat 0 (Christian, 11.11.2026: Hörproben Phase 1,
 * «die ersten gefallen noch nicht so»): er bleibt als Tonvorrat und für Modal Interchange erhalten, wird aber nur gespielt, wenn er
 * ausdrücklich verlangt ist. */
export const MODI = Object.freeze({
  ionisch: { name: "Ionisch (Dur)", stufen: [0, 2, 4, 5, 7, 9, 11], charakter: 11, hell: 5, gewicht: 0 },
  lydisch: { name: "Lydisch", stufen: [0, 2, 4, 6, 7, 9, 11], charakter: 6, hell: 6, gewicht: 20 },
  mixolydisch: { name: "Mixolydisch", stufen: [0, 2, 4, 5, 7, 9, 10], charakter: 10, hell: 4, gewicht: 20 },
  dorisch: { name: "Dorisch", stufen: [0, 2, 3, 5, 7, 9, 10], charakter: 9, hell: 3, gewicht: 20 },
  aeolisch: { name: "Äolisch (Moll)", stufen: [0, 2, 3, 5, 7, 8, 10], charakter: 8, hell: 2, gewicht: 20 },
  phrygisch: { name: "Phrygisch", stufen: [0, 1, 3, 5, 7, 8, 10], charakter: 1, hell: 1, gewicht: 20 },
});

/** Wählt einen Modus nach Gewicht. rnd: Zufallsfunktion 0–1 (zufall(seed)). gewichte überschreibt einzelne Gewichte je Stil,
 * etwa { phrygisch: 5 }; Modi mit Gewicht 0 kommen nie, ausser alle sind 0 (dann der erste). */
export function modusWaehlen(rnd, gewichte = {}) {
  const liste = Object.keys(MODI).map((k) => [k, Math.max(0, gewichte[k] ?? MODI[k].gewicht)]), summe = liste.reduce((s, [, g]) => s + g, 0);
  if (!summe) return liste[0][0];
  let r = rnd() * summe;
  for (const [k, g] of liste) { r -= g; if (r < 0 && g > 0) return k; }
  return liste.filter(([, g]) => g > 0).at(-1)[0];
}

/** Akkordtypen: Intervalle über dem Grundton → Kürzel. Der Name eines Klangs wird hieraus bestimmt, nicht gespeichert. */
const TYPEN = [
  [[0, 4, 7], ""], [[0, 3, 7], "m"], [[0, 3, 6], "dim"], [[0, 4, 8], "aug"],
  [[0, 4, 7, 11], "maj7"], [[0, 3, 7, 10], "m7"], [[0, 4, 7, 10], "7"], [[0, 3, 6, 10], "m7b5"], [[0, 3, 7, 11], "m(maj7)"],
  [[0, 2, 4, 7], "add9"], [[0, 2, 3, 7], "m(add9)"], [[0, 2, 3, 7, 10], "m9"], [[0, 2, 4, 7, 11], "maj9"], [[0, 2, 4, 7, 10], "9"],
  [[0, 2, 7], "sus2"], [[0, 5, 7], "sus4"], [[0, 5, 7, 10], "7sus4"], [[0, 4, 7, 9], "6"], [[0, 3, 7, 9], "m6"], [[0, 2, 4, 7, 9], "6/9"],
  [[0, 4, 6, 7, 11], "maj7#11"], [[0, 2, 4, 6, 7, 11], "maj9#11"], [[0, 4, 6, 11], "maj7#11"], [[0, 5, 10], "quart"], [[0, 5, 10, 15], "quart"],
  [[0, 7], "5"], [[0, 2, 7, 14], "5add9"], [[0, 3, 5, 7, 10], "m11"], [[0, 2, 3, 5, 7, 10], "m11"],
];
const typSchluessel = (iv) => [...new Set(iv.map((x) => ((x % 12) + 12) % 12))].sort((a, b) => a - b).join(",");
const TYP_INDEX = new Map(TYPEN.map(([iv, k]) => [typSchluessel(iv), k]));

/** Name eines Klangs { wurzel, intervalle, bass } (absolute Tonklassen), z. B. «Cmaj7/E»; unbekannte Strukturen: Töne in Klammern */
export function akkordName(a) {
  const k = TYP_INDEX.get(typSchluessel(a.intervalle));
  const kopf = k !== undefined ? `${tonName(a.wurzel)}${k}` : `${tonName(a.wurzel)}(${[...new Set(a.intervalle.map((i) => tonName(a.wurzel + i)))].join(" ")})`;
  return a.bass != null && (((a.bass - a.wurzel) % 12) + 12) % 12 !== 0 ? `${kopf}/${tonName(a.bass)}` : kopf;
}
export const tonklassen = (a) => [...new Set(a.intervalle.map((i) => (a.wurzel + i) % 12))];

/** Klang aus Tonklassen und Bass deuten: welche Wurzel ergibt den bekanntesten Typ? (für «Oberstimme ändert sich» → neuer Name) */
export function deuten(pcs, bass) {
  let best = null;
  for (const w of [bass, ...pcs]) {
    const iv = pcs.map((p) => (((p - w) % 12) + 12) % 12).sort((a, b) => a - b);
    const bekannt = TYP_INDEX.has(typSchluessel(iv)), wert = (bekannt ? 10 : 0) + (w === bass ? 3 : 0) + (iv.includes(4) || iv.includes(3) ? 1 : 0);
    if (!best || wert > best.wert) best = { wert, a: { wurzel: w, intervalle: iv, bass } };
  }
  return best.a;
}

// ---------- Akkordvorrat eines Modus ----------
/** der diatonische Klang auf einer Stufe (1–7) eines Modus: Dreiklang, Septakkord oder mit None (Terzschichtung aus der Leiter) */
export function stufenAkkord(zentrum, modus, stufe, { toene = 3 } = {}) {
  const st = MODI[modus].stufen, k = stufe - 1, wurzel = (zentrum + st[k]) % 12, iv = [];
  for (let j = 0; j < toene; j++) { const s = k + 2 * j; iv.push(st[s % 7] + 12 * Math.floor(s / 7) - st[k]); }
  return { wurzel, intervalle: iv, bass: wurzel, stufe, herkunft: "diatonisch", modus };
}

/**
 * Kandidaten-Graph: alle Klänge des Modus (Dreiklang, Septakkord, None, sus, add9) und geliehene Klänge (Modal Interchange aus den
 * parallelen Modi, chromatische Medianten über dem Zentrum, Dur/Moll über demselben Grundton). Je Kandidat eine Herkunft.
 */
export function vorrat(zentrum, modus) {
  const out = [], dazu = (a, herkunft) => { const pcs = tonklassen(a).sort().join(); if (!out.some((x) => tonklassen(x).sort().join() === pcs && x.bass === a.bass)) out.push({ ...a, herkunft: herkunft ?? a.herkunft }); };
  for (let s = 1; s <= 7; s++) {
    const d3 = stufenAkkord(zentrum, modus, s), d4 = stufenAkkord(zentrum, modus, s, { toene: 4 }), d5 = stufenAkkord(zentrum, modus, s, { toene: 5 });
    if (TYP_INDEX.get(typSchluessel(d3.intervalle)) === "dim") { dazu(d4); continue; }   // verminderte Dreiklänge nur als m7b5
    dazu(d3); dazu(d4); dazu({ ...d5, intervalle: d5.intervalle.filter((_, i) => i !== 3).concat([]) }, "diatonisch");   // None ohne Septime = add9
    const st = MODI[modus].stufen, sek = (st[(s) % 7] - st[s - 1] + 12) % 12, quarte = (st[(s + 2) % 7] - st[s - 1] + 12) % 12;
    if (quarte === 5 && [1, 4, 5].includes(s)) dazu({ ...d3, intervalle: [0, 5, 7] }, "diatonisch");   // sus4 nur auf Stufen mit reiner Quarte
    if (sek === 2 && [1, 2, 4, 5, 6].includes(s)) dazu({ ...d3, intervalle: [0, 2, 7] }, "diatonisch");
  }
  // Modal Interchange: Stufen der parallelen Modi, die der eigene Modus nicht hat (nur Dur- und Molldreiklänge und Septakkorde)
  for (const m of Object.keys(MODI).filter((x) => x !== modus)) for (const s of [2, 3, 4, 6, 7]) {
    const a = stufenAkkord(zentrum, m, s, { toene: 4 }), t = TYP_INDEX.get(typSchluessel(a.intervalle));
    if (["maj7", "m7", "7"].includes(t) && tonklassen(a).some((p) => !MODI[modus].stufen.includes((p - zentrum + 12) % 12))) dazu({ ...a, herkunft: "geliehen", aus: m }, "geliehen");
  }
  // chromatische Medianten (Dur und Moll, kleine und grosse Terz auf und ab) und der parallele Klang auf dem Zentrum
  for (const d of [3, 4, 8, 9]) { dazu({ wurzel: (zentrum + d) % 12, intervalle: [0, 4, 7], bass: (zentrum + d) % 12 }, "mediante"); dazu({ wurzel: (zentrum + d) % 12, intervalle: [0, 4, 7, 11], bass: (zentrum + d) % 12 }, "mediante"); }
  const tonika = stufenAkkord(zentrum, modus, 1);
  dazu({ ...tonika, intervalle: tonika.intervalle.includes(4) ? [0, 3, 7] : [0, 4, 7] }, "parallel");
  return out.map((a) => ({ ...a, name: akkordName(a) }));
}

// ---------- Spannung ----------
/** Gewichte des Spannungsmodells (Tabelle in BIENNE.md) */
export const SPANNUNG = Object.freeze({ dissonanz: 0.35, chromatik: 0.25, instabil: 0.2, dichte: 0.1, ohneGrundton: 0.1 });
/** Spannung eines Klangs 0–1 im Zusammenhang eines Modus (und, wenn gegeben, eines Voicings) */
export function spannung(a, zentrum, modus, voicing = null) {
  const pcs = tonklassen(a), st = MODI[modus].stufen;
  let reib = 0, paare = 0;
  for (let i = 0; i < pcs.length; i++) for (let j = i + 1; j < pcs.length; j++) { const d = Math.min((pcs[i] - pcs[j] + 12) % 12, (pcs[j] - pcs[i] + 12) % 12); paare++; reib += d === 1 ? 1 : d === 6 ? 0.8 : d === 2 ? 0.35 : 0; }
  const diss = Math.min(1, reib / Math.max(1, paare) * 2.2);
  const chrom = pcs.filter((p) => !st.includes((p - zentrum + 12) % 12)).length / pcs.length;
  const t = TYP_INDEX.get(typSchluessel(a.intervalle)) ?? "?";
  const instabil = (a.bass !== a.wurzel ? 0.5 : 0) + (["7", "sus4", "7sus4", "dim", "m7b5", "aug", "9"].includes(t) ? 0.6 : 0) + (a.wurzel === zentrum ? -0.3 : 0);
  let dichte = 0;
  if (voicing?.length > 2) { const s = [...voicing].sort((x, y) => x - y); let eng = 0; for (let i = 1; i < s.length; i++) if (s[i] - s[i - 1] <= 2) eng++; dichte = eng / (s.length - 1); }
  const ohne = voicing && !voicing.some((m) => m % 12 === a.wurzel) ? 1 : 0;
  const w = SPANNUNG;
  return Math.max(0, Math.min(1, w.dissonanz * diss + w.chromatik * chrom + w.instabil * Math.max(0, Math.min(1, instabil)) + w.dichte * dichte + w.ohneGrundton * ohne));
}
/** Zielkurven je Abschnitt: x 0–1 über den Abschnitt → Zielspannung */
export const KURVEN = Object.freeze({
  steigt: (x, h) => 0.15 + (h - 0.15) * x,
  haelt: (x, h) => h * 0.75,
  faellt: (x, h) => h - (h - 0.15) * x,
  offen: (x, h) => 0.3 + (h - 0.3) * Math.sin(Math.PI * x * 0.5),
  plateau: (x, h) => (x > 0.6 && x < 0.75 ? Math.min(1, h + 0.25) : h * 0.6),
});

// ---------- Stimmführung ----------
/** Kosten der Stimmführung (Tabelle in BIENNE.md); der Regler «Bruch» kehrt die Bewegungsgewichte schrittweise um */
export const KOSTEN = Object.freeze({ halbton: 1, sprung: 3, sprungAb: 5, kreuzung: 6, parallele: 4, gemeinsam: -2, engTief: 5, engTiefGrenze: 52, charakter: -1.5, fehlendeTerz: 4 });

/** Bewertung eines Übergangs von voicing a nach b (MIDI aufsteigend). bruch 0–1, parallelGewicht (Profil A: offene Quinten erwünscht) */
export function uebergangsKosten(a, b, { bruch = 0, parallelGewicht = 1 } = {}) {
  if (!a?.length) return 0;
  const K = KOSTEN, w = 1 - 2 * bruch;
  let k = 0;
  const n = Math.max(a.length, b.length);
  for (let i = 0; i < n; i++) {
    const x = a[Math.min(i, a.length - 1)], y = b[Math.min(i, b.length - 1)], d = Math.abs(y - x);
    k += w * K.halbton * d + (d > K.sprungAb ? w * K.sprung : 0) + (d === 0 ? w * K.gemeinsam : 0);
    if (i + 1 < a.length && i < b.length && y > a[i + 1]) k += K.kreuzung;   // Stimme überholt die alte Lage der nächsthöheren
    if (i > 0 && i - 1 < a.length && y < a[i - 1]) k += K.kreuzung;
  }
  // Quint- und Oktavparallelen der Aussenstimmen
  const au = (v) => (((v.at(-1) - v[0]) % 12) + 12) % 12;
  if ([0, 7].includes(au(a)) && au(a) === au(b) && Math.sign(b[0] - a[0]) === Math.sign(b.at(-1) - a.at(-1)) && b[0] !== a[0]) k += K.parallele * parallelGewicht;
  return k;
}

/** Kosten eines Voicings für sich: zu enge Lage im Tiefen, fehlende Terz, charakteristischer Ton des Modus (Belohnung) */
function eigenKosten(v, a, zentrum, modus) {
  let k = 0;
  for (let i = 1; i < v.length; i++) if (v[i - 1] < KOSTEN.engTiefGrenze && v[i] - v[i - 1] < 7) k += KOSTEN.engTief;
  const pcs = new Set(v.map((m) => m % 12)), terz = a.intervalle.find((i) => i % 12 === 3 || i % 12 === 4);
  if (terz != null && !pcs.has((a.wurzel + terz) % 12)) k += KOSTEN.fehlendeTerz;
  if (modus && pcs.has((zentrum + MODI[modus].charakter) % 12)) k += KOSTEN.charakter;
  return k;
}

/** Umfang je Rolle (MIDI) und Stimmenzahl */
export const INSTRUMENTE = Object.freeze({
  flaeche: { name: "Fläche (Synth)", lo: 48, hi: 79, stimmen: [3, 5] },
  klavier: { name: "Klavier (zwei Hände)", lo: 36, hi: 84, links: [36, 57], rechts: [55, 84], spanne: 14 },
  gitarre: { name: "Gitarre (Standardstimmung)", saiten: [40, 45, 50, 55, 59, 64], buende: 15, spanne: 4 },
  bass: { name: "Bass", lo: 28, hi: 52 },
});

/** alle Lagen eines Klangs im Umfang: enge Lage, Drop-2, Quartenlage, ohne Grundton; n Stimmen */
function lagenFlaeche(a, { lo, hi, n }) {
  const pcs = tonklassen(a), out = [];
  const voll = pcs.length >= n ? pcs : [...pcs, ...pcs].slice(0, n);
  const ohneGrund = pcs.length > 3 ? pcs.filter((p) => p !== a.wurzel) : null;
  for (const satz of [voll.slice(0, n), ohneGrund?.slice(0, n)].filter(Boolean)) {
    for (let r = 0; r < satz.length; r++) {
      const reihe = [...satz.slice(r), ...satz.slice(0, r)];
      for (let start = lo; start <= hi - 6; start++) {
        if (start % 12 !== reihe[0]) continue;
        const eng = [start]; for (const p of reihe.slice(1)) { let m = eng.at(-1) + 1; while (m % 12 !== p) m++; eng.push(m); }
        if (eng.at(-1) > hi) continue;
        out.push({ midi: eng, art: satz === ohneGrund ? "ohne Grundton" : "eng" });
        if (eng.length >= 4) { const d2 = [...eng]; const x = d2.splice(d2.length - 2, 1)[0] - 12; d2.unshift(x); if (d2[0] >= lo && new Set(d2).size === d2.length) out.push({ midi: d2.sort((p, q) => p - q), art: "drop-2" }); }
      }
    }
  }
  // Quartenlage aus Akkordtönen (wenn der Klang Quarten hergibt)
  for (let start = lo; start <= hi - 10; start++) { const q = [start, start + 5, start + 10, start + 15].filter((m) => m <= hi && pcs.includes(m % 12)); if (q.length >= 3 && q[0] === start) out.push({ midi: q, art: "Quarten" }); }
  return out;
}

/** Klavier: linke Hand Grundton/Quinte/Dezime tief und offen, rechte Hand eng; je Hand höchstens eine None Spannweite */
function lagenKlavier(a, I) {
  const pcs = tonklassen(a), bass = a.bass ?? a.wurzel, out = [];
  for (let lb = I.links[0]; lb <= I.links[1] - 7; lb++) {
    if (lb % 12 !== bass) continue;
    const linksOpt = [[lb], [lb, lb + 7], [lb, lb + 12]].concat(pcs.includes((bass + 7) % 12) ? [] : []).filter((l) => l.every((m) => pcs.includes(m % 12) || m === lb) && l.at(-1) - l[0] <= I.spanne);
    for (const links of linksOpt) for (const r of lagenFlaeche({ ...a, intervalle: a.intervalle }, { lo: Math.max(I.rechts[0], links.at(-1) + 3), hi: I.rechts[1], n: Math.min(4, pcs.length) })) {
      if (r.midi.at(-1) - r.midi[0] > I.spanne) continue;
      out.push({ midi: [...links, ...r.midi], art: `links ${links.length} · rechts ${r.art}` });
    }
  }
  return out;
}

/** Gitarre: Griff auf sechs Saiten (Bünde 0–15, höchstens vier Bünde Spannweite, Leersaiten bevorzugt), was nicht greifbar ist, fehlt */
export function griffe(a, I = INSTRUMENTE.gitarre) {
  // zuerst streng (tiefster Ton = Bass des Klangs, Terz dabei); sonst ohne Slash-Bass (spielt der Bass), zuletzt ohne Terz
  for (const [strengBass, mitTerz, art] of [[true, true, ""], [false, true, " (Bass im Bass)"], [false, false, " (ohne Terz)"]]) {
    const g = griffeSuchen(a, I, strengBass, mitTerz);
    if (g.length) return g.map((x) => ({ ...x, art: x.art + art }));
  }
  return [];
}
function griffeSuchen(a, I, strengBass, mitTerz) {
  const pcs = tonklassen(a), out = [], terz = mitTerz ? a.intervalle.find((i) => i % 12 === 3 || i % 12 === 4) : null;
  for (let pos = 0; pos <= I.buende - I.spanne; pos++) {
    const optionen = I.saiten.map((leer) => {
      const o = [null];
      if (pcs.includes(leer % 12)) o.push(0);
      for (let b = Math.max(1, pos); b < pos + I.spanne; b++) if (pcs.includes((leer + b) % 12)) o.push(b);
      return o;
    });
    const wahl = Array(6).fill(null);
    const tiefe = (s) => {
      if (s === 6) {
        const klingt = wahl.map((b, i) => (b == null ? null : I.saiten[i] + b)), toene = klingt.filter((m) => m != null).sort((x, y) => x - y);
        if (new Set(toene).size < toene.length - 1) return;   // höchstens ein doppelter Ton
        if (toene.length < 3) return;
        const erste = klingt.findIndex((m) => m != null), letzte = 5 - [...klingt].reverse().findIndex((m) => m != null);
        if (klingt.slice(erste, letzte + 1).filter((m) => m == null).length > 1) return;   // höchstens eine gedämpfte Saite dazwischen
        if (toene[0] % 12 !== (strengBass ? a.bass ?? a.wurzel : a.wurzel)) return;   // der tiefste Ton ist der Bass (bzw. der Grundton)
        const ps = new Set(toene.map((m) => m % 12));
        if (terz != null && !ps.has((a.wurzel + terz) % 12)) return;
        const gegriffen = wahl.filter((b) => b > 0); if (gegriffen.length && Math.max(...gegriffen) - Math.min(...gegriffen) >= I.spanne) return;
        out.push({ midi: toene, griff: wahl.map((b, i) => (b == null ? null : { saite: 6 - i, bund: b })).filter(Boolean), leer: wahl.filter((b) => b === 0).length, art: `Lage ${pos}` });
        return;
      }
      for (const o of optionen[s]) { wahl[s] = o; tiefe(s + 1); }
      wahl[s] = null;
    };
    tiefe(0);
  }
  // doppelte Griffe (gleiche Töne) entfernen
  const gesehen = new Set();
  return out.filter((g) => { const k = g.midi.join(); if (gesehen.has(k)) return false; gesehen.add(k); return true; });
}

/**
 * Voicings für eine Folge von Klängen und ein Instrument: je Klang alle Lagen im Umfang, bewertet gegen das vorige Voicing; unter den
 * besten drei wählt der Startwert (sonst klingt alles gleich «optimal»). bruch: 0–100 (glatt ↔ Bruch); an Abschnittsgrenzen (e.grenze)
 * wirkt er voll, sonst gedämpft. Gibt [{ t, d, midi, griff?, art, kosten }].
 */
export function voicingsFuer(ereignisse, instrument = "flaeche", { bruch = 0, seed = 1, zentrum = 0, modus = "aeolisch", stimmen = 4, parallelGewicht = 1 } = {}) {
  const I = INSTRUMENTE[instrument], rnd = zufall(hash(seed, "voicing", instrument));
  const out = [];
  let vorher = null;
  for (const e of ereignisse) {
    const b = (bruch / 100) * (e.grenze ? 1 : 0.45);
    let kand;
    if (instrument === "gitarre") kand = griffe(e.akkord, I);
    else if (instrument === "klavier") kand = lagenKlavier(e.akkord, I);
    else if (instrument === "bass") kand = [];
    else kand = lagenFlaeche(e.akkord, { lo: I.lo, hi: I.hi, n: Math.max(I.stimmen[0], Math.min(I.stimmen[1], stimmen)) });
    if (instrument === "bass") {
      const ziel = vorher?.[0] ?? 38, bass = e.akkord.bass ?? e.akkord.wurzel;
      let m = I.lo; while (m % 12 !== bass) m++;
      const lagen = []; for (; m <= I.hi; m += 12) lagen.push(m);
      const v = [lagen.reduce((x, y) => (Math.abs(y - ziel) < Math.abs(x - ziel) ? y : x))];
      out.push({ t: e.t, d: e.d, midi: v, art: "Bass", kosten: 0 }); vorher = v; continue;
    }
    if (!kand.length) { out.push({ t: e.t, d: e.d, midi: [], art: "nicht greifbar", kosten: Infinity }); continue; }
    const bewertet = kand.map((c) => ({ ...c, kosten: uebergangsKosten(vorher, c.midi, { bruch: b, parallelGewicht }) + eigenKosten(c.midi, e.akkord, zentrum, modus) + (instrument === "gitarre" ? -0.8 * c.leer - 0.3 * c.midi.length : 0) }))
      .sort((x, y) => x.kosten - y.kosten);
    const top = bewertet.slice(0, 3), r = rnd(), w = r < 0.6 ? top[0] : r < 0.9 ? top[1] ?? top[0] : top[2] ?? top[0];
    out.push({ t: e.t, d: e.d, midi: w.midi, griff: w.griff ?? null, art: w.art, kosten: Math.round(w.kosten * 10) / 10 });
    vorher = w.midi;
  }
  return out;
}

/** mittlere Bewegung (Halbtöne je Stimme und Wechsel) einer Voicing-Folge */
export function mittlereBewegung(v) {
  let s = 0, z = 0;
  for (let i = 1; i < v.length; i++) { const a = v[i - 1].midi, b = v[i].midi; if (!a.length || !b.length) continue; const n = Math.min(a.length, b.length); for (let j = 0; j < n; j++) { s += Math.abs(b[Math.round((j * (b.length - 1)) / Math.max(1, n - 1))] - a[Math.round((j * (a.length - 1)) / Math.max(1, n - 1))]); z++; } }
  return z ? s / z : 0;
}

// ---------- Generator ----------
/** Arten der Grundidee: jede mit einer Eigenschaft, die Abwandlungen erhalten sollen */
export const ZELLEN = Object.freeze({
  gemeinsamerTon: "ein gemeinsamer Ton bleibt oben, darunter wechseln die Klänge",
  bassAbwaerts: "der Bass steigt stufenweise ab, oben bleibt ein Ton liegen",
  mediante: "Mediante hin und zurück (Klang eine Terz entfernt, verbunden über einen gemeinsamen Ton)",
  durMoll: "Dur und Moll über demselben Grundton im Wechsel",
  orgelpunkt: "Orgelpunkt auf dem Zentrum, darüber wandern die Klänge",
});

const enthaelt = (a, pc) => tonklassen(a).includes(pc);

/** die Grundidee: 2–4 Klänge mit einer klaren Eigenschaft, gewählt mit Stimmführungskosten und Spannung unter den Kandidaten */
export function zelleErzeugen({ zentrum, modus, seed = 1, art = null, bruch = 0 }) {
  const rnd = zufall(hash(seed, "zelle")), V = vorrat(zentrum, modus), st = MODI[modus].stufen;
  const arten = Object.keys(ZELLEN), a = art ?? arten[Math.floor(rnd() * arten.length)];
  const tonika = V.find((x) => x.wurzel === zentrum && x.herkunft === "diatonisch" && x.intervalle.length === 4) ?? stufenAkkord(zentrum, modus, 1, { toene: 4 });
  const charakterTon = (zentrum + MODI[modus].charakter) % 12;
  const waehle = (liste, vorig, n = 3) => { const s = [...liste].sort((x, y) => wertung(x, vorig) - wertung(y, vorig)); return s[Math.min(s.length - 1, Math.floor(rnd() * Math.min(n, s.length)))]; };
  const wertung = (k, vorig) => {
    const g = tonklassen(k).filter((p) => vorig && enthaelt(vorig, p)).length;
    return -g * 1.2 * (1 - 2 * bruch) + (k.herkunft === "diatonisch" ? 0 : 1.5 - bruch) + (enthaelt(k, charakterTon) ? -1 : 0) + rnd() * 1.2;   // Bruch: wenige gemeinsame Töne, Geliehenes eher
  };
  let akkorde, eigenschaft = ZELLEN[a];
  if (a === "gemeinsamerTon") {
    const oben = [charakterTon, (zentrum + st[4]) % 12, (zentrum + st[2]) % 12][Math.floor(rnd() * 3)];
    const mit = V.filter((k) => enthaelt(k, oben) && k.wurzel !== zentrum);
    const n = 2 + Math.floor(rnd() * 2);
    akkorde = [tonika];
    for (let i = 0; i < n; i++) akkorde.push(waehle(mit.filter((k) => !akkorde.some((x) => x.name === k.name)), akkorde.at(-1)));
    eigenschaft += ` (${tonName(oben)})`;
    akkorde.oben = oben;
  } else if (a === "bassAbwaerts") {
    const oben = (zentrum + st[[2, 4][Math.floor(rnd() * 2)]]) % 12;
    akkorde = [];
    for (let i = 0; i < 4; i++) {
      const bassPc = (zentrum + st[(7 - i) % 7] + (i === 0 ? 0 : 0)) % 12, b = i === 0 ? zentrum : bassPc;
      const kand = V.filter((k) => enthaelt(k, oben) && enthaelt(k, b)).map((k) => ({ ...k, bass: b, name: akkordName({ ...k, bass: b }) }));
      akkorde.push(i === 0 ? tonika : kand.length ? waehle(kand, akkorde.at(-1)) : { ...tonika, bass: b, name: akkordName({ ...tonika, bass: b }) });
    }
    eigenschaft += ` (Bass ${akkorde.map((k) => tonName(k.bass)).join("–")}, oben ${tonName(oben)})`;
  } else if (a === "mediante") {
    const med = V.filter((k) => k.herkunft === "mediante" && tonklassen(k).some((p) => enthaelt(tonika, p)));
    const m = waehle(med, tonika);
    akkorde = [tonika, m, ...(rnd() < 0.5 ? [waehle(V.filter((k) => k.herkunft === "diatonisch" && k.wurzel !== zentrum), m)] : [])];
    eigenschaft += ` (${tonika.name} → ${m.name})`;
  } else if (a === "durMoll") {
    const par = V.find((k) => k.herkunft === "parallel") ?? tonika;
    const dritter = waehle(V.filter((k) => k.herkunft !== "mediante" && k.wurzel !== zentrum), par);
    akkorde = [stufenAkkord(zentrum, modus, 1), par, dritter].map((k) => ({ ...k, name: akkordName(k) }));
  } else {
    const ueber = V.filter((k) => k.wurzel !== zentrum && k.herkunft !== "mediante");
    akkorde = [tonika];
    for (let i = 0; i < 2 + Math.floor(rnd() * 2); i++) akkorde.push(waehle(ueber.filter((k) => !akkorde.some((x) => x.name === k.name)), akkorde.at(-1)));
    akkorde = akkorde.map((k) => ({ ...k, bass: zentrum, name: akkordName({ ...k, bass: zentrum }) }));
  }
  // der charakteristische Ton des Modus muss in der Zelle hörbar sein: sonst einen Klang (nicht den ersten) durch einen mit ihm ersetzen
  if (!akkorde.some((k) => enthaelt(k, charakterTon))) {
    const mit = V.filter((k) => enthaelt(k, charakterTon) && k.herkunft === "diatonisch" && k.wurzel !== zentrum);
    const i = Math.min(akkorde.length - 1, 1 + Math.floor(rnd() * Math.max(1, akkorde.length - 1)));
    if (mit.length) { const neu = waehle(mit, akkorde[i - 1]); akkorde[i] = a === "orgelpunkt" || a === "bassAbwaerts" ? { ...neu, bass: akkorde[i].bass ?? neu.wurzel } : neu; }
  }
  return { art: a, eigenschaft, akkorde: akkorde.map((k) => ({ wurzel: k.wurzel, intervalle: k.intervalle, bass: k.bass ?? k.wurzel, herkunft: k.herkunft, name: akkordName({ ...k, bass: k.bass ?? k.wurzel }) })) };
}

/** Wiedererkennbarkeit einer Aussage gegenüber der Zelle: gemeinsame Tonklassen und gleiche Basskontur, 0–1 */
export function wiedererkennbarkeit(zelle, aussage) {
  const n = Math.min(zelle.length, aussage.length);
  if (!n) return 0;
  let ton = 0, kontur = 0;
  for (let i = 0; i < n; i++) { const a = new Set(tonklassen(zelle[i])), b = tonklassen(aussage[i]); ton += b.filter((p) => a.has(p)).length / Math.max(a.size, b.length); }
  for (let i = 1; i < n; i++) if (Math.sign(((zelle[i].bass - zelle[i - 1].bass + 18) % 12) - 6) === Math.sign(((aussage[i].bass - aussage[i - 1].bass + 18) % 12) - 6)) kontur++;
  return 0.7 * (ton / n) + 0.3 * (n > 1 ? kontur / (n - 1) : 1);
}

/** Abwandlungen der Zelle (jede mit Namen): ersetzen, Umkehrung, erweitern/reduzieren, rotieren */
export const ABWANDLUNGEN = Object.freeze(["ersetzen", "umkehrung", "erweitern", "reduzieren", "rotieren"]);
function abwandeln(zelle, op, { zentrum, modus, rnd }) {
  const k = zelle.map((x) => ({ ...x, intervalle: [...x.intervalle] })), i = 1 + Math.floor(rnd() * Math.max(1, k.length - 1)), z = k[Math.min(i, k.length - 1)];
  if (op === "ersetzen") {
    const V = vorrat(zentrum, modus).filter((c) => c.herkunft !== "diatonisch" && tonklassen(c).some((p) => enthaelt(z, p)) && c.name !== z.name);
    if (V.length) { const c = V[Math.floor(rnd() * V.length)]; k[k.indexOf(z)] = { wurzel: c.wurzel, intervalle: c.intervalle, bass: c.bass, herkunft: c.herkunft }; }
  } else if (op === "umkehrung") { const t = z.intervalle.filter((x) => x % 12 !== 0); if (t.length) z.bass = (z.wurzel + t[Math.floor(rnd() * Math.min(2, t.length))]) % 12; }
  else if (op === "erweitern") { if (!z.intervalle.some((x) => x % 12 === 2)) z.intervalle.push(14); }
  else if (op === "reduzieren") { if (z.intervalle.length > 3) z.intervalle = z.intervalle.slice(0, 3); }
  else if (op === "rotieren") k.push(k.shift());
  return k.map((x) => ({ ...x, name: akkordName(x) }));
}

/** unregelmässiger harmonischer Rhythmus: Dauern in Takten für n Klänge, Summe = laenge; «wandel» 0–100 macht sie kürzer */
export function rhythmusDauern(n, laenge, { wandel = 50, rnd }) {
  const moegl = wandel > 66 ? [0.5, 1, 1, 1.5, 2] : wandel > 33 ? [1, 1.5, 2, 2, 3] : [2, 2, 3, 4, 4];
  const d = Array.from({ length: n }, () => moegl[Math.floor(rnd() * moegl.length)]);
  const s = d.reduce((a, b) => a + b, 0), f = laenge / s;
  const out = d.map((x) => Math.max(0.5, Math.round(x * f * 2) / 2));
  out[out.length - 1] += laenge - out.reduce((a, b) => a + b, 0);
  if (out.at(-1) < 0.5) { out[0] -= 0.5 - out.at(-1); out[out.length - 1] = 0.5; }
  return out;
}

/**
 * Harmonischer Verlauf. abschnitte: [{ takte, kurve ("steigt"|…), hoehe 0–1, zentrum?, modus?, grenzeBruch? }] (ohne Angabe ein Abschnitt).
 * Gibt { zentrum, modus, zelle, ereignisse: [{ t, d, akkord, name, art ("akkord"|"oberstimme"|"bass"), spannung, ziel, grenze, aussage,
 * abwandlung }], aussagen: [{ t, ops, erkennbar }] }. Ereignisse in Takten ab 0 (t), Dauer d.
 */
export function verlaufErzeugen({ zentrum = 0, modus = "dorisch", seed = 1, abschnitte = [{ takte: 16, kurve: "steigt", hoehe: 0.6 }], bruch = 0, wandel = 50, wiederkehr = 60, zelleArt = null, statementTakte = 8, verschieben = true }) {
  const rnd = zufall(hash(seed, "verlauf")), zelle = zelleErzeugen({ zentrum, modus, seed, art: zelleArt, bruch: bruch / 100 });
  const ereignisse = [], aussagen = [];
  let t0 = 0, letzte = null;
  abschnitte.forEach((ab, ai) => {
    const z0 = ab.zentrum ?? zentrum, m0 = ab.modus ?? modus, kurve = KURVEN[ab.kurve ?? "steigt"], h = ab.hoehe ?? 0.6;
    // Zentrum gewechselt: die Zelle über das neue Zentrum transponiert (vorbereitet über einen gemeinsamen Ton an der Grenze)
    const versatz = (z0 - zentrum + 12) % 12, basis = zelle.akkorde.map((k) => ({ ...k, wurzel: (k.wurzel + versatz) % 12, bass: (k.bass + versatz) % 12 }));
    for (let p = 0; p < ab.takte; p += statementTakte) {
      const laenge = Math.min(statementTakte, ab.takte - p), x = p / ab.takte;
      let akk = basis, ops = [];
      const woertlich = (p === 0 && ai === 0) || rnd() < wiederkehr / 100 || (letzte !== null && letzte < 0.5);
      if (!woertlich) {
        const n = 1 + (rnd() < 0.4 ? 1 : 0);
        for (let j = 0; j < n; j++) { const op = ABWANDLUNGEN[Math.floor(rnd() * ABWANDLUNGEN.length)]; akk = abwandeln(akk, op, { zentrum: z0, modus: m0, rnd }); ops.push(op); }
        // der Spannungskurve folgen: liegt die Aussage weit unter dem Ziel, eine Erweiterung oder ein geliehener Klang dazu
        const ziel = kurve(x + 0.5 * laenge / ab.takte, h), mitte = akk.reduce((s, k) => s + spannung(k, z0, m0), 0) / akk.length;
        if (ziel - mitte > 0.2) { akk = abwandeln(akk, "erweitern", { zentrum: z0, modus: m0, rnd }); ops.push("erweitern (Spannung)"); }
        if (mitte - ziel > 0.25) { akk = abwandeln(akk, "reduzieren", { zentrum: z0, modus: m0, rnd }); ops.push("reduzieren (Spannung)"); }
      }
      letzte = wiedererkennbarkeit(basis, akk);
      aussagen.push({ t: t0 + p, ops: ops.length ? ops : ["wörtlich"], erkennbar: Math.round(letzte * 100) / 100 });
      const dauern = rhythmusDauern(akk.length, laenge, { wandel, rnd });
      let t = t0 + p;
      akk.forEach((k, i) => {
        const d = dauern[i], grenze = i === 0 && p === 0;
        // Wechsel eine Achtel vor oder nach dem Schlag (nicht an Abschnittsgrenzen)
        const schub = verschieben && !grenze && rnd() < 0.25 ? (rnd() < 0.6 ? -0.125 : 0.125) : 0;
        const ev = { t: t + schub, d: d - schub, akkord: { wurzel: k.wurzel, intervalle: k.intervalle, bass: k.bass }, name: akkordName(k), art: "akkord", herkunft: k.herkunft, grenze, aussage: aussagen.length - 1 };
        ev.spannung = Math.round(spannung(ev.akkord, z0, m0) * 100) / 100; ev.ziel = Math.round(kurve((t - t0) / ab.takte, h) * 100) / 100;
        ereignisse.push(ev);
        // lange Klänge: erst ändert sich eine Oberstimme, später der Bass (der Klang wird neu gedeutet und benannt)
        if (d >= 2 && rnd() < 0.35 + wandel / 250) {
          const pcs = tonklassen(k), st = MODI[m0].stufen.map((s) => (s + z0) % 12), top = pcs.at(-1);
          // eine Stimme geht einen Schritt weiter (zu einem leitereigenen Ton, der noch nicht klingt); nur wenn der neue Klang deutbar ist
          let neu = null;
          for (const weg of [top, ...pcs.filter((p) => p !== k.wurzel && p !== top)]) for (const p of st.filter((x) => !pcs.includes(x) && Math.min((x - weg + 12) % 12, (weg - x + 12) % 12) <= 2)) {
            const c = deuten([...pcs.filter((q) => q !== weg), p], k.bass);
            if (!neu && TYP_INDEX.has(typSchluessel(c.intervalle))) neu = c;
          }
          if (!neu) { t += d; return; }
          const tm = Math.round((t + d / 2) * 2) / 2;
          ereignisse.push({ t: tm, d: t + d - tm, akkord: neu, name: akkordName(neu), art: "oberstimme", grenze: false, aussage: aussagen.length - 1, spannung: Math.round(spannung(neu, z0, m0) * 100) / 100, ziel: ev.ziel });
          const bassNeu = tonklassen(neu).map((p) => deuten(tonklassen(neu), p)).find((c) => c.bass !== neu.bass && TYP_INDEX.has(typSchluessel(c.intervalle)));
          if (d >= 3 && rnd() < 0.5 && bassNeu) {
            const bneu = bassNeu, tb = Math.round((t + d * 0.75) * 2) / 2;
            if (tb > tm) { ereignisse.at(-1).d = tb - tm; ereignisse.push({ t: tb, d: t + d - tb, akkord: bneu, name: akkordName(bneu), art: "bass", grenze: false, aussage: aussagen.length - 1, spannung: Math.round(spannung(bneu, z0, m0) * 100) / 100, ziel: ev.ziel }); }
          }
          ev.d = tm - ev.t;
        }
        t += d;
      });
    }
    t0 += ab.takte;
  });
  return { version: HARMONIK_VERSION, zentrum, modus, zelle, ereignisse, aussagen };
}
