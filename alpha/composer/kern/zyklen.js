// Rhythmus 0.1.0 – Zyklen und Generator für die Perkussion (Auftrag prompts/perkussion.md, Phase A, 10. November 2026).
//
// Ein Zyklus ist eine Folge von Schlägen (Matras bei der Tala, Zählzeiten beim Iqa) mit Gruppierung (Vibhag), Sam (der erste Schlag) und
// Khali (die «leere» Gruppe ohne Bass). Die Vorlagen stehen als Theka bzw. Grundmuster mit Quelle da; was nicht belegt ist, heisst
// «eigene Ableitung». Der Generator macht daraus Takte in der gewohnten Muster-Notation (kern/muster.js), damit jede erzeugte Spur wie
// eine handgeschriebene bleibt: Zeilen ansehen, von Hand ändern, unterbrechen. Er arbeitet auf drei Ebenen:
//   Schlag    Artikulation, Betonung (Sam laut, Füllschläge leise)
//   Muster    das Gerüst der Vorlage bleibt; «Dichte» nimmt weg (bis nur der Sam bleibt) oder füllt auf, «Komplexität» teilt Schläge,
//             verschiebt sie neben den Schlag und setzt Läufe (tirakita)
//   Phrase    vier Zyklen bilden eine Phrase: Wiederholung, kleine Abweichung, Rückkehr («Variation»); vor jedem Abschnittswechsel ein
//             Tihai (eine Figur dreimal, der letzte Schlag fällt auf den Sam des nächsten Abschnitts); dazu eine zweite Schicht tiefer
//             Schläge in anderer Länge (Polyrhythmus, z. B. 3 gegen 16), die sich auf dem Sam wieder trifft
// Jeder Abschnitt beginnt auf dem Sam. Zyklen laufen quer zu den Takten (Rupak mit 7 Matras gegen die Viertakt-Gruppen der Drums).
// Alles aus dem Startwert: gleiche Eingaben, gleiche Zeilen.

import { zufall, hash } from "../erzeuger/grund.js";

export const RHYTHMUS = "rhythmus@0.1.0";

const COURTNEY = "nach David R. Courtney, «Fundamentals of Tabla» (1995); von jeder Theka gibt es viele Fassungen";
const IQA = "verbreitete Lehrform (Doum/Tek); Taktart wie bei maqamworld.com/en/iqaa, die Folge selbst nicht gegen Noten geprüft";

/**
 * Vorlagen. theka: Matras durch Leerzeichen, Vibhag durch «|», mehrere Schläge in einer Matra mit «+» (dha+ge), Pause «.».
 * Tabla-Bols oder D (Doum, Bass), T (Tek, hoch), K (Ka, hoch, andere Hand), S (Slap, geschlossen). einheit: Länge einer Matra im
 * Verhältnis zur Grundeinheit (Malfuf zählt in Sechzehnteln, also 0,5). khali: Vibhag-Nummern (ab 0) ohne Bass.
 */
export const VORLAGEN = Object.freeze({
  teentaal: { name: "Teentaal", tradition: "Hindustani, Tala", theka: "dha dhin dhin dha | dha dhin dhin dha | dha tin tin ta | ta dhin dhin dha", khali: [2], quelle: COURTNEY },
  ektaal: { name: "Ektaal", tradition: "Hindustani, Tala", theka: "dhin dhin | dha+ge ti+ra+ki+ta | tu na | kat ta | dha+ge ti+ra+ki+ta | dhi na", khali: [1, 3], quelle: COURTNEY },
  jhaptal: { name: "Jhaptal", tradition: "Hindustani, Tala", theka: "dhi na | dhi dhi na | ti na | dhi dhi na", khali: [2], quelle: COURTNEY },
  rupak: { name: "Rupak", tradition: "Hindustani, Tala", theka: "tin tin na | dhi na | dhi na", khali: [0], quelle: `${COURTNEY}; der Sam fällt hier auf das Khali` },
  dadra: { name: "Dadra", tradition: "Hindustani, Tala", theka: "dha dhi na | dha ti na", khali: [1], quelle: COURTNEY },
  keharwa: { name: "Keharwa", tradition: "Hindustani, Tala", theka: "dha ge na ti | na ka dhi na", khali: [1], quelle: COURTNEY },
  maqsum: { name: "Maqsum", tradition: "arabisch, Iqa", theka: "D T | . T | D . | T .", khali: [], quelle: IQA },
  baladi: { name: "Baladi", tradition: "arabisch, Iqa", theka: "D D | . T | D . | T .", khali: [], quelle: IQA },
  saidi: { name: "Saidi", tradition: "arabisch, Iqa", theka: "D T | . D | D . | T .", khali: [], quelle: IQA },
  malfuf: { name: "Malfuf", tradition: "arabisch, Iqa", theka: "D . . | T . . | T .", khali: [], einheit: 0.5, quelle: IQA },
  samai: { name: "Samai Thaqil", tradition: "arabisch und türkisch, Iqa (10/8)", theka: "D . . | . T . | D D | T .", khali: [], quelle: IQA },
  zarbi68: { name: "Persisch 6/8", tradition: "persisch, Zarb", theka: "D . T | D T T", khali: [], quelle: "eigene Ableitung: 6/8-Gerüst, wie es in der persischen Zarb-Begleitung häufig ist; keine überlieferte Vorlage" },
  frei7: { name: "frei 7 (2+2+3)", tradition: "frei", theka: "D T | D T | D T T", khali: [], quelle: "eigene Ableitung aus der Gruppierung 2+2+3" },
  frei9: { name: "frei 9 (2+2+2+3)", tradition: "frei", theka: "D T | D T | D T | D T T", khali: [], quelle: "eigene Ableitung aus der Gruppierung 2+2+2+3 (wie Aksak)" },
  frei5: { name: "frei 5 (3+2)", tradition: "frei", theka: "D T T | D T", khali: [], quelle: "eigene Ableitung aus der Gruppierung 3+2" },
});

/** Klassen: M (Bass und hoch zusammen), B (Bass offen), BC (Bass geschlossen), H (hoch offen), HC (hoch geschlossen) */
export const KLASSE = Object.freeze({
  dha: "M", dhin: "M", dhi: "M", ge: "B", ghe: "B", ke: "BC", ka: "BC", ki: "BC", kat: "BC",
  na: "H", ta: "H", tin: "H", tun: "H", tu: "H", te: "HC", ti: "HC", ra: "HC",
  D: "B", T: "H", K: "HC", S: "BC",
});
/** Schreibweisen, die die Tabla anders nennt */
const ALIAS = { tu: "tun", kat: "ke" };

/** eine Vorlage zerlegen: [{ schlaege: [bol], vibhag (Nummer), erste (Beginn des Vibhag), khali }] */
export function zyklusLesen(v) {
  const out = [];
  String(v.theka).split("|").forEach((teil, g) => {
    teil.trim().split(/\s+/).filter(Boolean).forEach((tok, i) => out.push({ schlaege: tok === "." ? [] : tok.split("+"), vibhag: g, erste: i === 0, khali: (v.khali ?? []).includes(g) }));
  });
  return out;
}
export const matrasVon = (key) => zyklusLesen(VORLAGEN[key]).length;

/** ein Bol (oder D/T/K/S) für ein Instrument: eigener Bol, Tabla-Zuordnung oder Klasse */
export function bolFuer(bol, inst) {
  const arten = inst.arten;
  if (inst.bols?.[bol] && arten.has(inst.bols[bol])) return inst.bols[bol];
  const b = ALIAS[bol] && arten.has(ALIAS[bol]) ? ALIAS[bol] : bol;
  if (arten.has(b) && !/^[DTKS]$/.test(b)) return b;
  const k = KLASSE[bol] ?? "H", a = inst.klassen?.[k];
  return a && arten.has(a) ? a : inst.erste;
}
/** Instrument für den Generator aus einer Stimme der Perkussion */
export function instrumentVon(st) {
  const arten = new Set(st.artikulationen.map((a) => a.key)), erste = st.artikulationen[0].key;
  const k = st.klassen ?? {}, klassen = { M: k.M ?? erste, B: k.B ?? k.M ?? erste, BC: k.BC ?? k.B ?? erste, H: k.H ?? erste, HC: k.HC ?? k.H ?? erste };
  return { key: st.key, arten, erste, klassen, bols: st.bols ?? null, tihai: st.tihai ?? null };
}

/** Matra-Länge in Sechzehnteln: im schnellen Tempo (Halftime) eine Viertel, sonst eine Achtel */
export const matraAuto = (bpm) => (bpm >= 130 ? 4 : 2);

// Dichte und Komplexität je Abschnitt (Arrangement): ruhige Teile dünner, Gas geben dichter
const ABSCHNITT = { intro: [-30, -20], aufbau: [-15, -10], haupt: [0, 0], stocken: [-5, 0], atmen: [-35, -25], gas: [25, 20], verlieren: [-25, 10], wiederfinden: [10, 5], outro: [-30, -20] };

const FEIN = 32;   // Raster in Zweiunddreissigsteln

/**
 * Takte erzeugen. o: { vorlage, stimme (Stimme der Perkussion), anzahl (Takte), bpm, matra? (Sechzehntel je Matra), dichte, komplex,
 * variation, poly (alle 0–100; 50 = die Theka wie notiert), seed, abschnitte? [{ von, bis, typ }] }.
 * Gibt { takte: [Zeilen], info } zurück; jede Zeile ist ein Takt in der Muster-Notation (8, 16 oder 32 Schläge).
 */
export function zyklusTakte(o) {
  const v = VORLAGEN[o.vorlage] ?? VORLAGEN.teentaal, inst = instrumentVon(o.stimme), seed = o.seed ?? 1;
  const zyk = zyklusLesen(v), anzahl = Math.max(1, o.anzahl ?? 8);
  const matra = Math.max(1, Math.round(((o.matra || matraAuto(o.bpm ?? 100)) * 2) * (v.einheit ?? 1)));   // Matra in Zweiunddreissigsteln
  const lang = zyk.length * matra;
  const abschn = o.abschnitte?.length ? o.abschnitte : [{ von: 0, bis: anzahl, typ: "haupt" }];
  const ereig = new Map();   // Stelle (Zweiunddreissigstel ab Beginn) → { art, st }
  const setze = (pos, art, st) => { if (pos < 0 || pos >= anzahl * FEIN) return; const alt = ereig.get(pos); if (!alt || st >= alt.st) ereig.set(pos, { art, st }); };
  const k100 = (x) => Math.max(0, Math.min(100, x)) / 100;

  abschn.forEach((a, ai) => {
    const [dd, kk] = ABSCHNITT[a.typ] ?? [0, 0];
    const dichte = k100((o.dichte ?? 50) + dd), komplex = k100((o.komplex ?? 30) + kk), variation = k100(o.variation ?? 40), poly = k100(o.poly ?? 0);
    const beginn = a.von * FEIN, ende = a.bis * FEIN;
    if (ende <= beginn) return;
    // gleiche Abschnittsart, gleiches Grundmuster: wer wiederkommt, wird wiedererkannt
    const basis = zyklusMuster(zyk, inst, { matra, dichte, komplex, rnd: zufall(hash(seed, o.vorlage, a.typ)) });
    const phrasen = new Map();
    const tihai = (ende - beginn) >= 4 * FEIN ? tihaiBauen(inst, { matra, komplex, rnd: zufall(hash(seed, "tihai", ai)) }) : null;
    const tihaiAb = tihai ? ende - tihai.spanne : ende;
    const polyRnd = zufall(hash(seed, "poly", a.typ)), polyP = [3, 5, 7].find((p) => zyk.length % p) ?? 3;
    for (let z = 0, p0 = beginn; p0 < ende; z++, p0 += lang) {
      // Phrase aus vier Zyklen; nach zwei Phrasen entwickelt sich das Grundmuster ein wenig weiter
      const phr = Math.floor(z / 4), inPhr = z % 4;
      if (!phrasen.has(phr)) {
        const grund = phr > 0 && phr % 2 === 0 && variation > 0.4 ? veraendern(phrasen.get(phr - 1)[0], inst, { menge: 1, matra, rnd: zufall(hash(seed, "entw", ai, phr)) }) : phr > 0 ? phrasen.get(phr - 1)[0] : basis;
        const r = zufall(hash(seed, "phrase", ai, phr)), m = 1 + Math.round(variation * 3);
        const plan = variation < 0.25 ? [0, 0, 0, 1] : variation < 0.6 ? [0, 1, 0, 2] : [0, 1, 2, 3];
        const fassungen = [grund, ...[1, 2, 3].map((k) => veraendern(grund, inst, { menge: Math.max(1, Math.round(m * (k === 3 ? 1.3 : 1))), matra, rnd: zufall(hash(seed, "var", ai, phr, k) ^ Math.floor(r() * 1e9)) }))];
        phrasen.set(phr, [grund, plan.map((k) => fassungen[k])]);
      }
      const muster = phrasen.get(phr)[1][inPhr];
      for (const e of muster) { const pos = p0 + e.pos; if (pos < tihaiAb) setze(pos, e.art, e.st); }
      // Polyrhythmus: tiefe Schläge alle polyP Matras, ab dem Sam gezählt; sie kommen in der zweiten Hälfte der Phrase dazu
      if (poly > 0 && (inPhr >= 2 || poly > 0.7) && polyRnd() < 0.3 + poly) {
        for (let k = polyP; k < zyk.length; k += polyP) {
          const pos = p0 + k * matra, alt = ereig.get(pos);
          if (pos >= tihaiAb) break;
          if (alt && KLASSE_VON(alt.art, inst) === "H") ereig.set(pos, { art: inst.klassen.M, st: alt.st });
          else if (!alt) setze(pos, inst.klassen.B, poly >= 0.5 ? 0.8 : 0.45);
        }
      }
    }
    if (tihai) for (const e of tihai.schlaege) setze(tihaiAb + e.pos, e.art, e.st);
  });

  // in Takte schreiben: so grob wie möglich (8, 16 oder 32 Schläge je Takt)
  const takte = [];
  for (let b = 0; b < anzahl; b++) {
    const t = Array(FEIN).fill(".");
    for (let i = 0; i < FEIN; i++) { const e = ereig.get(b * FEIN + i); if (e) t[i] = e.art + (e.st >= 0.95 ? "!" : e.st <= 0.5 ? "_" : ""); }
    let teil = 1;
    for (const d of [4, 2]) if (t.every((x, i) => i % d === 0 || x === ".")) { teil = d; break; }
    takte.push(t.filter((_, i) => i % teil === 0).join(" "));
  }
  return { takte, info: { vorlage: v.name, tradition: v.tradition, quelle: v.quelle, matras: zyk.length, matraSechzehntel: matra / 2, zyklusTakte: lang / FEIN, vibhag: vibhagVon(zyk) } };
}

const vibhagVon = (zyk) => { const g = []; for (const m of zyk) { if (m.erste) g.push(0); g[g.length - 1]++; } return g; };
function KLASSE_VON(art, inst) { for (const [k, a] of Object.entries(inst.klassen)) if (a === art) return k; return KLASSE[art] ?? "H"; }

/**
 * ein Zyklus als Ereignisse { pos (Zweiunddreissigstel ab dem Sam), art, st, gewicht }: das Gerüst der Vorlage nach Dichte gefiltert,
 * nach Komplexität geteilt, verschoben und mit Läufen gefüllt.
 */
function zyklusMuster(zyk, inst, { matra, dichte, komplex, rnd }) {
  const out = [], schwelle = dichte <= 0.5 ? 1 - (dichte / 0.5) * 0.6 : 0.4;
  zyk.forEach((m, i) => {
    const p0 = i * matra, n = m.schlaege.length;
    m.schlaege.forEach((bol, j) => {
      const sam = i === 0 && j === 0, gewicht = sam ? 1 : j === 0 && m.erste ? (m.khali ? 0.72 : 0.85) : j === 0 ? 0.6 : 0.45;
      if (!sam && gewicht + (rnd() - 0.5) * 0.12 < schwelle) return;
      const pos = p0 + Math.floor((j * matra) / n);
      out.push({ pos, art: bolFuer(bol, inst), st: sam ? 1 : j === 0 && m.erste && !m.khali ? 0.8 : j === 0 ? 0.7 : 0.45, gewicht });
    });
  });
  // Füllschläge (Dichte über 50): leise, geschlossen, auf halben und Viertel-Matras
  if (dichte > 0.5) {
    const p = (dichte - 0.5) * 1.6, belegt = new Set(out.map((e) => e.pos));
    for (let pos = 0; pos < zyk.length * matra; pos += Math.max(1, matra / 2)) {
      if (belegt.has(pos) || rnd() >= p) continue;
      out.push({ pos, art: rnd() < 0.2 + komplex * 0.3 ? inst.klassen.BC : inst.klassen.HC, st: 0.45, gewicht: 0.3 });
    }
  }
  // Komplexität: einen Schlag teilen (ein zweiter, leiser Schlag eine halbe Matra später), einen neben den Schlag schieben, ein Lauf
  for (const e of [...out]) {
    if (e.gewicht >= 1) continue;
    const r = rnd();
    if (r < komplex * 0.25 && matra >= 2) out.push({ pos: e.pos + matra / 2, art: inst.klassen.HC, st: 0.45, gewicht: 0.3 });
    else if (r < komplex * 0.38 && e.gewicht < 0.8 && matra >= 2) e.pos += matra / 2;   // Synkope
  }
  if (komplex > 0.35 && matra >= 4 && rnd() < komplex) {
    // Lauf (tirakita): vier schnelle geschlossene Schläge in einer Matra vor einem Vibhag-Beginn
    const ziele = zyk.map((m, i) => (m.erste && i > 0 ? i : -1)).filter((i) => i > 0), z = ziele[Math.floor(rnd() * ziele.length)];
    if (z) { const von = (z - 1) * matra; for (let k = out.length - 1; k >= 0; k--) if (out[k].pos >= von && out[k].pos < von + matra) out.splice(k, 1); lauf(inst).forEach((art, k) => out.push({ pos: von + (k * matra) / 4, art, st: k === 0 ? 0.7 : 0.45, gewicht: 0.3 })); }
  }
  const len = zyk.length * matra;
  return dedup(out.filter((e) => e.pos < len));
}
const lauf = (inst) => (inst.arten.has("ti") && inst.arten.has("ra") && inst.arten.has("ki") ? ["ti", "ra", "ki", "ta"].map((b) => bolFuer(b, inst)) : [inst.klassen.HC, inst.klassen.HC, inst.klassen.BC, inst.klassen.H]);
const dedup = (liste) => { const m = new Map(); for (const e of liste) { const a = m.get(e.pos); if (!a || e.st > a.st) m.set(e.pos, e); } return [...m.values()].sort((a, b) => a.pos - b.pos); };

/** eine Abwandlung: menge kleine Eingriffe (ein Schlag fehlt, einer kommt dazu, eine Farbe wechselt, einer rückt); der Sam bleibt */
function veraendern(muster, inst, { menge, matra, rnd }) {
  const out = muster.map((e) => ({ ...e }));
  for (let k = 0; k < menge; k++) {
    const r = rnd(), frei = out.filter((e) => e.gewicht < 0.8);
    if (r < 0.3 && frei.length) out.splice(out.indexOf(frei[Math.floor(rnd() * frei.length)]), 1);
    else if (r < 0.6) { const len = Math.max(...out.map((e) => e.pos)) + matra, pos = Math.floor((rnd() * len) / Math.max(1, matra / 2)) * Math.max(1, matra / 2); if (pos > 0 && !out.some((e) => e.pos === pos)) out.push({ pos, art: rnd() < 0.5 ? inst.klassen.HC : inst.klassen.H, st: 0.45, gewicht: 0.3 }); }
    else if (r < 0.8 && frei.length) { const e = frei[Math.floor(rnd() * frei.length)], kl = KLASSE_VON(e.art, inst); e.art = inst.klassen[{ H: "HC", HC: "H", B: "BC", BC: "B", M: "B" }[kl] ?? "H"]; }
    else if (frei.length && matra >= 2) { const e = frei[Math.floor(rnd() * frei.length)]; e.pos += matra / 2; }
  }
  return dedup(out);
}

/**
 * Tihai: eine Figur dreimal mit gleichem Abstand; ihr letzter Schlag fällt auf den Sam danach (der Beginn des nächsten Abschnitts, dort
 * steht der Sam schon). Gibt { schlaege (relativ zum Beginn), spanne (Zweiunddreissigstel bis zum Sam) } zurück.
 */
function tihaiBauen(inst, { matra, komplex, rnd }) {
  const M = inst.klassen.M, HC = inst.klassen.HC, BC = inst.klassen.BC, H = inst.klassen.H, q = Math.max(1, matra / 4);
  // Figuren in Viertel-Matras: [art, Länge]; die letzte Note ist der Schlag, der auf dem Sam liegen soll
  const figuren = inst.tihai ?? [
    [[M, 4]],
    [[M, 2], [H, 2], [M, 4]],
    [[HC, 1], [HC, 1], [BC, 1], [HC, 1], [M, 4]],
  ];
  const f = figuren[Math.min(figuren.length - 1, Math.floor(komplex * figuren.length * 0.999 + rnd() * 0.5))];
  const offs = []; let o = 0; for (const [, l] of f) { offs.push(o); o += l; }
  const letzte = offs[offs.length - 1], laenge = o, luecke = f.length === 1 ? 4 : 2;
  const schlaege = [];
  for (let w = 0; w < 3; w++) f.forEach(([art], i) => { const t = w * (laenge + luecke) + offs[i]; if (w < 2 || i < f.length - 1) schlaege.push({ pos: t * q, art, st: i === f.length - 1 ? 0.8 : 0.7 }); });
  const spanne = (2 * (laenge + luecke) + letzte) * q;
  return { schlaege, spanne };
}

/**
 * Vorgaben je Stil: welche Stimme welchen Zyklus spielt (Phase A). Ornament: Tala und Iqa im Halftime-Raster; die Perkussion wechselt
 * je Abschnitt wie bisher.
 */
export const STIL_ZYKLEN = Object.freeze({
  ornament: { tabla: { vorlage: "teentaal", dichte: 35, komplex: 35, variation: 45, poly: 20 }, darbuka: { vorlage: "maqsum", dichte: 40, komplex: 30, variation: 40 }, zarb: { vorlage: "zarbi68", dichte: 35, komplex: 30, variation: 45, poly: 30 }, riq: { vorlage: "maqsum", dichte: 25, komplex: 10, variation: 30 } },
  dnb: { darbuka: { vorlage: "saidi", dichte: 35, komplex: 30, variation: 40 } },
  indien: { tabla: { vorlage: "keherwa", dichte: 55, komplex: 40, variation: 45, poly: 15 } },
  orient: { darbuka: { vorlage: "maqsum", dichte: 55, komplex: 40, variation: 45 }, rahmen: { vorlage: "maqsum", dichte: 20, komplex: 0, variation: 20 } },
  persisch: { zarb: { vorlage: "zarbi68", dichte: 55, komplex: 45, variation: 50, poly: 30 }, rahmen: { vorlage: "zarbi68", dichte: 25, komplex: 0, variation: 20 } },
  ecm: { rahmen: { vorlage: "frei7", dichte: 30, komplex: 20, variation: 50 }, darbuka: { vorlage: "frei7", dichte: 25, komplex: 30, variation: 50 }, udu: { vorlage: "frei9", dichte: 20, komplex: 20, variation: 50 } },
  hiphop: { darbuka: { vorlage: "baladi", dichte: 40, komplex: 25, variation: 40 } },
});
