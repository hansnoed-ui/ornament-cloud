// «Kunst» – Hypertext der Facebook-Beiträge mit dem Stichwort «Kunst» (Wunsch von Christian, 1. November 2026).
// Reine Logik ohne Oberfläche, damit Seite und Tests dieselben Regeln benutzen:
// Schlagwörter je Beitrag, verwandte Beiträge, Montage aus bis zu vier markierten Beiträgen, Zettel und ORNA-Begegnung dazu.
// Alles läuft im Browser, nichts wird gesendet. jev wird hier nie aufgerufen: jev.js enthält, was jev einmal beim Bauen bewertet hat
// (tools/build-jev-kunst.ts). Fehlt ein Wert von jev, wählt eine offen gekennzeichnete Regel nach gemeinsamen Wörtern; beides wird nie vermischt.
import { STROPHEN, KONSTELLATIONEN, nameVon, woerter } from "../drittes-rad/engine.js";

export { STROPHEN, KONSTELLATIONEN, nameVon };
export const MAX_MARKIERT = 4;

const norm = (w) => w.toLowerCase().replace(/ä/g, "a").replace(/ö/g, "o").replace(/ü/g, "u").replace(/ß/g, "ss");

/** Hashtags eines Texts, klein geschrieben, ohne # */
export const hashtags = (t) => [...new Set([...String(t).matchAll(/#([\p{L}\p{N}_]{3,})/gu)].map((m) => m[1].toLowerCase()))];

/** Sätze eines Texts (Zeilen zählen als Grenze), ohne leere und ohne reine Links oder Hashtag-Zeilen */
export function saetze(t) {
  return String(t)
    .split(/\n+/)
    .flatMap((z) => z.split(/(?<=[.!?…])\s+(?=[„«»"(\p{Lu}\d])/u))
    .map((s) => s.replace(/(\s*#[\p{L}\p{N}_]+)+\s*$/u, "").trim())
    .filter((s) => s.length >= 12 && !/^(https?:\/\/\S+|(#[\p{L}\p{N}_]+\s*)+)$/u.test(s));
}

/**
 * Bestand einlesen: Beiträge [{ i, d, t }] → Index mit Schlagwörtern.
 * Schlagwort = Nomen-Stamm (wie im Dritten Rad) oder Hashtag, das in mindestens zwei Beiträgen vorkommt und nicht in fast allen.
 */
export function bestand(beitraege) {
  const docs = beitraege.map((b) => {
    const w = woerter(b.t);
    for (const h of hashtags(b.t)) w.set("#" + h, "#" + h);
    return w;
  });
  const df = new Map();
  for (const d of docs) for (const st of d.keys()) df.set(st, (df.get(st) ?? 0) + 1);
  const n = Math.max(beitraege.length, 1);
  const zuHaeufig = Math.max(3, n * 0.25);
  const gewicht = (st) => { const f = df.get(st) ?? 0; return f < 2 || f > zuHaeufig ? 0 : Math.log(n / f); };
  // Schreibweise je Stamm: die häufigste
  const form = new Map();
  docs.forEach((d) => { for (const [st, sw] of d) { const m = form.get(st) ?? new Map(); m.set(sw, (m.get(sw) ?? 0) + 1); form.set(st, m); } });
  const name = (st) => [...(form.get(st) ?? new Map([[st, 1]]))].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))[0][0];
  const schlagwoerter = new Map();   // Stamm → [Index der Beiträge]
  docs.forEach((d, i) => { for (const st of d.keys()) if (gewicht(st) > 0) { const l = schlagwoerter.get(st) ?? []; l.push(i); schlagwoerter.set(st, l); } });
  return { beitraege, docs, df, gewicht, name, schlagwoerter, nr: new Map(beitraege.map((b, i) => [b.i, i])) };
}

/** Schlagwörter eines Beitrags, das seltenste zuerst */
export const schlagwoerterVon = (B, i) => [...B.docs[i].keys()].filter((st) => B.gewicht(st) > 0).sort((a, b) => B.gewicht(b) - B.gewicht(a) || a.localeCompare(b));

/** verwandte Beiträge: gemeinsame Schlagwörter, gewichtet nach Seltenheit; [{ i, wert, woerter: [Stamm …] }] */
export function verwandte(B, i, anzahl = 8) {
  const kandidaten = new Map();
  for (const st of B.docs[i].keys()) {
    const g = B.gewicht(st);
    if (!g) continue;
    for (const j of B.schlagwoerter.get(st) ?? []) if (j !== i) {
      const k = kandidaten.get(j) ?? { i: j, wert: 0, woerter: [] };
      k.wert += g; k.woerter.push(st); kandidaten.set(j, k);
    }
  }
  return [...kandidaten.values()]
    .sort((a, b) => b.wert - a.wert || a.i - b.i)
    .slice(0, anzahl)
    .map((k) => ({ ...k, woerter: k.woerter.sort((a, b) => B.gewicht(b) - B.gewicht(a)).slice(0, 4) }));
}

/** Zufall mit Startwert (mulberry32), damit «neu mischen» nachvollziehbar bleibt */
export function zufall(seed) {
  let a = seed >>> 0;
  return () => { a = (a + 0x6d2b79f5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}

/**
 * Montage: Sätze der markierten Beiträge im Wechsel, A B C D A B …, aus jedem Beitrag in seiner Reihenfolge,
 * mit einem Startwert für den Einstieg je Beitrag. Kein Satz wird verändert. Ergebnis: { text, quellen: [{ buchstabe, i, satz }] }.
 */
export function montage(B, markiert, seed = 1, grenze = 9) {
  const r = zufall(seed);
  const reihen = markiert.map((i) => {
    const s = saetze(B.beitraege[i].t);
    const start = s.length > 2 ? Math.floor(r() * Math.min(s.length - 1, 4)) : 0;
    return s.slice(start).concat(s.slice(0, start));
  });
  const proBeitrag = Math.max(1, Math.ceil(grenze / Math.max(markiert.length, 1)));
  const quellen = [];
  for (let runde = 0; runde < proBeitrag; runde++) {
    markiert.forEach((i, k) => { const s = reihen[k][runde]; if (s && quellen.length < grenze) quellen.push({ buchstabe: "ABCD"[k], i, satz: s }); });
  }
  return { text: quellen.map((q) => q.satz).join(" "), quellen };
}

// ---------- Zettel und ORNA-Begegnung ----------
const dokStrophe = (s) => [s.t, s.b, s.x].join(" ");
const dokPaar = (c) => [nameVon(c.artistId), nameVon(c.theoristId), c.text, c.question].join(" ");
let ZIELE = null;
function ziele() {
  if (ZIELE) return ZIELE;
  const z = STROPHEN.map((s) => woerter(dokStrophe(s)));
  const k = KONSTELLATIONEN.map((c) => woerter(dokPaar(c)));
  const df = new Map();
  for (const d of [...z, ...k]) for (const st of d.keys()) df.set(st, (df.get(st) ?? 0) + 1);
  const n = z.length + k.length;
  const gewicht = (st) => { const f = df.get(st) ?? 0; return !f || f > n * 0.08 ? 0 : Math.log(n / f); };
  return (ZIELE = { z, k, gewicht });
}

/** Regel: gemeinsame seltene Wörter zwischen den markierten Beiträgen und jedem Zettel bzw. jeder Konstellation */
function regel(B, markiert, art) {
  const Z = ziele();
  const liste = art === "zettel" ? Z.z : Z.k;
  const quelle = new Map();
  for (const i of markiert) for (const [st, sw] of B.docs[i]) if (!st.startsWith("#") && !quelle.has(st)) quelle.set(st, sw);
  let beste = null;
  liste.forEach((d, j) => {
    let wert = 0; const w = [];
    for (const [st, sw] of quelle) if (d.has(st)) { const g = Z.gewicht(st); if (g > 0) { wert += g; w.push([g, sw]); } }
    if (wert > 0 && (!beste || wert > beste.wert)) beste = { j, wert, woerter: w.sort((a, b) => b[0] - a[0]).slice(0, 3).map((x) => x[1]) };
  });
  return beste;
}

/** jev: Wahrscheinlichkeiten aus jev.js je Beitrag zusammenzählen; null, wenn für einen markierten Beitrag kein Wert vorliegt */
function nachJev(J, B, markiert, art) {
  if (!J || !J.gueltig) return null;
  const tab = art === "zettel" ? J.z : J.k;
  const summe = new Map();
  for (const i of markiert) {
    const zeile = tab[B.beitraege[i].i];
    if (!zeile) return null;
    for (const [j, p] of zeile) summe.set(j, (summe.get(j) ?? 0) + p);
  }
  const [j, p] = [...summe].sort((a, b) => b[1] - a[1] || a[0] - b[0])[0] ?? [];
  return j === undefined ? null : { j, p: p / markiert.length };
}

/**
 * Zettel und ORNA-Begegnung zu den markierten Beiträgen.
 * Ergebnis je Art: { art: "jev" | "Regel", ziel, grund } oder null (nichts gefunden).
 */
export function zuordnung(B, markiert, J) {
  const aus = (art) => {
    const ziel = (j) => (art === "zettel" ? STROPHEN[j] : KONSTELLATIONEN[j]);
    const j1 = nachJev(J, B, markiert, art);
    if (j1) return { art: "jev", ziel: ziel(j1.j), grund: `jev hat beim Bauen jeden Beitrag einzeln eingeschätzt; zusammengezählt liegt dieser am nächsten (${Math.round(j1.p * 100)} %).` };
    const r = regel(B, markiert, art);
    if (r) return { art: "Regel", ziel: ziel(r.j), grund: `Gemeinsame Wörter: ${r.woerter.map((w) => `«${w}»`).join(", ")}.` };
    return null;
  };
  return { zettel: aus("zettel"), begegnung: aus("begegnung") };
}

export const adresse = {
  zettel: (s) => `/b/zettel/${s.s}/`,
  begegnung: (c) => `/portfolio/nebeneinander-nacheinander/?pair=${encodeURIComponent(c.id)}`,
};
export const titelBegegnung = (c) => `${nameVon(c.artistId)} × ${nameVon(c.theoristId)}`;
export { norm };
