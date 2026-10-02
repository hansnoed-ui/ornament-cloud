// «Das Dritte Rad»: gemeinsame Logik für das Rad (index.html) und die Auswahl auf den Zielseiten (weiter.js).
// Verbindet drei Bestände: Zettelkasten (Strophen, daten.js), ORNA (Personen, Konstellationen, direkt aus dem Rad) und OMNA COLOR (Übungen, daten.js).
// Alles läuft im Browser. Nichts wird gesendet. Zufall und Gewichtung sind nur Vorschläge, das Los darf absurd sein (Auftrag vom 2. Oktober 2026).
import { ZYKLEN, THEMEN, STROPHEN, UEBUNGEN } from "./daten.js";
import { constellations } from "../../portfolio/nebeneinander-nacheinander/js/data/constellations.js";
import { artists } from "../../portfolio/nebeneinander-nacheinander/js/data/artists.js";
import { theorists } from "../../portfolio/nebeneinander-nacheinander/js/data/theorists.js";

export { ZYKLEN, THEMEN, STROPHEN, UEBUNGEN };
export const KONSTELLATIONEN = constellations;
export const PERSONEN = [...artists, ...theorists];          // Index = Nummer des Zeichens (Künstler:innen 0–19, Theoretiker:innen 20–39)
export const WURZEL = new URL("../../", import.meta.url).href;

const personNr = new Map(PERSONEN.map((p, i) => [p.id, i]));
export const nrVon = (id) => personNr.get(id);
export const nameVon = (id) => PERSONEN[personNr.get(id)]?.name ?? id;

// ---------- Adressen der Ziele (rad=1 lässt dort die Auswahl erscheinen) ----------
export const adresse = {
  strophe: (s) => `${WURZEL}zu-seiner-zeit/strophe/${s.s}/?rad=1`,
  paar: (c) => `${WURZEL}portfolio/nebeneinander-nacheinander/?pair=${c.id}&rad=1`,
  uebung: (e) => `${WURZEL}alpha/omna-color/?u=${e.id}&rad=1`,
  start: `${WURZEL}alpha/drittes-rad/`,
};
export const BEREICH = { zeit: "Zettelkasten", form: "ORNA", farbe: "OMNA COLOR" };

// ---------- Wörter: grob auf den Stamm gekürzt, damit «Wiederholung» und «Wiederholungen» zusammenfallen ----------
const STOP = new Set(("werden wurde wurden wird einer einen einem eines diese dieser dieses diesen diesem nicht nichts immer sowie durch ohne wenn dann " +
  "dass auch aber oder doch noch schon mehr sich seine seiner seinen ihre ihrer ihren ihrem kann koennen koennte muss muessen soll sollen waere waeren haben " +
  "hatte haette nach nachdem damit dabei dafuer dagegen darin darum darauf daran daher davon hier dort jedoch sondern solche solchen welche welchen welcher " +
  "indem zwischen gegenueber innerhalb ausserhalb bereits jeweils wieder bleibt bleiben macht machen geht gehen gibt geben zeigt zeigen eigene eigenen eigenes " +
  "andere anderen anderer anderes ganz viele vieles etwas keine keinen jeder jede jedes einmal zuerst danach sobald waehrend gleich genau erst wirklich " +
  "wollen koennen worden gewesen gemacht diesmal heisst damit eurer euren deinen deine deiner dieselbe dieselben dasselbe ueber unter gegen bevor weil " +
  "sodass sowohl entweder weder dennoch ebenso ebenfalls kuenstler kuenstlerin kuenstlern theoretiker theoretikerin theoretiker beide beiden werke".split(" ")));
const norm = (w) => w.toLowerCase().replace(/ä/g, "a").replace(/ö/g, "o").replace(/ü/g, "u").replace(/ß/g, "ss");
const ENDEN = ["lichkeit", "ungen", "keiten", "heiten", "ierung", "lichen", "licher", "liches", "ischen", "ischer", "isches", "ische", "ung", "heit", "keit", "lich", "isch", "ern", "en", "er", "es", "em", "e", "n", "s"];
export function stamm(w) {
  for (const e of ENDEN) if (w.length - e.length >= 4 && w.endsWith(e)) return w.slice(0, -e.length);
  return w;
}
// Namen zählen nicht als gemeinsame Wörter: Personen werden über ihre Namen verbunden (grund), nicht über ihre Wortteile
const NAMENSTEILE = new Set([...PERSONEN.map((p) => p.name), ...STROPHEN.flatMap((s) => s.r.map((r) => r.p))].flatMap((n) => n.split(/[\s-]+/)).map(norm));
const NOMEN_ENDUNG = /(ung|heit|keit|schaft|ismus|tat|tion|ment|nis)$/;
/** Text → Map(Stamm → Schreibweise im Text). Nur Nomen: großgeschrieben und nicht bloß Satzanfang (Befehle wie «Wähle» fallen so heraus). */
export function woerter(text) {
  const t = String(text), m = new Map();
  for (const x of t.matchAll(/\p{L}{6,}/gu)) {
    const n = norm(x[0]);
    if (!/^\p{Lu}/u.test(x[0]) || STOP.has(n) || NAMENSTEILE.has(n)) continue;
    const vor = t.slice(0, x.index).trimEnd();
    if ((vor === "" || /[.!?:;»«„“"–—]$/.test(vor)) && !NOMEN_ENDUNG.test(n)) continue;
    const st = stamm(n);
    if (st.length >= 4 && !m.has(st)) m.set(st, x[0]);
  }
  return m;
}

// ---------- Bestand, einmal eingelesen ----------
const dokStrophe = (s) => [s.t, s.b, s.x, ...s.r.map((r) => `${r.p} ${r.w ?? ""} ${r.n}`)].join(" ");
const dokPaar = (c) => [nameVon(c.artistId), nameVon(c.theoristId), c.text, c.question].join(" ");
const dokUebung = (e) => [e.n, e.t, e.a, e.m, e.f].join(" ");
const IDX = {
  zeit: STROPHEN.map((s) => woerter(dokStrophe(s))),
  form: constellations.map((c) => woerter(dokPaar(c))),
  farbe: UEBUNGEN.map((e) => woerter(dokUebung(e))),
};
const DF = new Map();
const ALLE = [...IDX.zeit, ...IDX.form, ...IDX.farbe];
for (const d of ALLE) for (const st of d.keys()) DF.set(st, (DF.get(st) ?? 0) + 1);
const gewicht = (st) => { const df = DF.get(st) ?? 1; return df > ALLE.length * 0.08 ? 0 : Math.log(ALLE.length / df); };   // zu häufige Wörter zählen nicht
const SCHWELLE = 3.2;                                                                                                     // etwa ein seltenes gemeinsames Wort

/** gemeinsame Wörter zweier Maps: { wert, woerter: [Schreibweise …] } */
export function gemeinsam(a, b) {
  const t = [];
  for (const [st, sw] of a) { const g = b.has(st) ? gewicht(st) : 0; if (g > 0) t.push([g, /^\p{Lu}/u.test(sw) ? sw : (b.get(st) ?? sw)]); }
  t.sort((x, y) => y[0] - x[0]);
  const top = t.slice(0, 3);
  return { wert: top.reduce((s, x) => s + x[0], 0), woerter: top.map((x) => x[1]) };
}

// ---------- Profile: was ein Stück ausmacht ----------
const strophenNr = new Map(STROPHEN.map((s, i) => [s.s, i]));
const paarNr = new Map(constellations.map((c, i) => [c.id, i]));
const uebungNr = new Map(UEBUNGEN.map((e, i) => [e.id, i]));
export const strophe = (slug) => STROPHEN[strophenNr.get(slug)];
export const paar = (id) => constellations[paarNr.get(id)];
export const uebung = (id) => UEBUNGEN[uebungNr.get(id)];

export const profilStrophe = (s) => ({ bereich: "zeit", art: "strophe", item: s, stems: IDX.zeit[strophenNr.get(s.s)], personen: new Set(s.r.map((r) => r.s)) });
export const profilPaar = (c) => ({ bereich: "form", art: "paar", item: c, stems: IDX.form[paarNr.get(c.id)], personen: new Set([c.artistId, c.theoristId]) });
export const profilUebung = (e) => ({ bereich: "farbe", art: "uebung", item: e, stems: IDX.farbe[uebungNr.get(e.id)], personen: new Set() });
export function profilPerson(slug) {
  const stems = new Map();
  STROPHEN.forEach((s, i) => { if (s.r.some((r) => r.s === slug)) for (const [k, v] of IDX.zeit[i]) stems.set(k, v); });
  return { bereich: "zeit", art: "person", item: null, stems, personen: new Set([slug]) };
}
/** aus einer Beschreibung der aktuellen Seite ({art, slug|id}) ein Profil, sonst null (dann entscheidet nur das Los) */
export function profil(aktuell) {
  if (!aktuell) return null;
  if (aktuell.art === "strophe" && strophe(aktuell.slug)) return profilStrophe(strophe(aktuell.slug));
  if (aktuell.art === "paar" && paar(aktuell.id)) return profilPaar(paar(aktuell.id));
  if (aktuell.art === "uebung" && uebung(aktuell.id)) return profilUebung(uebung(aktuell.id));
  if (aktuell.art === "person") return profilPerson(aktuell.slug);
  return null;
}
const vereinen = (...ps) => ({ stems: new Map(ps.flatMap((p) => [...p.stems])), personen: new Set(ps.flatMap((p) => [...p.personen])) });

// ---------- Auswahl ----------
const zieh = (a, r = Math.random) => a[Math.floor(r() * a.length)];
const KANDIDATEN = {
  zeit: () => STROPHEN.map((s, i) => ({ item: s, stems: IDX.zeit[i], personen: new Set(s.r.map((r) => r.s)) })),
  form: () => constellations.map((c, i) => ({ item: c, stems: IDX.form[i], personen: new Set([c.artistId, c.theoristId]) })),
  farbe: () => UEBUNGEN.map((e, i) => ({ item: e, stems: IDX.farbe[i], personen: new Set() })),
};
export const titel = (bereich, item) =>
  bereich === "zeit" ? `«${item.t}» (Strophe ${item.n})` : bereich === "form" ? `${nameVon(item.artistId)} × ${nameVon(item.theoristId)}` : `${item.n} (${item.t})`;
export const adresseVon = (bereich, item) => adresse[{ zeit: "strophe", form: "paar", farbe: "uebung" }[bereich]](item);

/** Begründung: gemeinsame Person und gemeinsame Wörter */
export function grund(von, ziel) {
  const teile = [];
  const pers = [...von.personen].filter((p) => ziel.personen.has(p));
  if (pers.length) teile.push(`${pers.slice(0, 2).map((p) => `«${nameVon(p)}»`).join(" und ")} kommt in beiden vor`);
  const g = gemeinsam(von.stems, ziel.stems);
  if (g.woerter.length && g.wert >= SCHWELLE) teile.push(`gemeinsam: ${g.woerter.map((w) => `«${w}»`).join(", ")}`);
  return teile.join(" · ");
}
const wert = (von, k) => gemeinsam(von.stems, k.stems).wert + [...von.personen].filter((p) => k.personen.has(p)).length * 6;

/**
 * Ein Vorschlag im Bereich `bereich` zu `von` (Profil oder null).
 * Meist ein stimmiger Treffer unter den besten vier, manchmal (loseAnteil) das reine Los.
 * Rückgabe: { bereich, item, titel, grund, url, los }
 */
export function beste(von, bereich, { ausser = null, loseAnteil = 0.15, zufall = Math.random, nur = null } = {}) {
  let k = KANDIDATEN[bereich]().filter((x) => (nur ? nur(x.item) : true) && x.item !== ausser);
  let wahl = null;
  if (von && zufall() >= loseAnteil) {
    const top = k.map((x) => [wert(von, x), x]).filter((x) => x[0] >= SCHWELLE).sort((a, b) => b[0] - a[0]).slice(0, 4);
    if (top.length) wahl = zieh(top, zufall)[1];
  }
  const los = !wahl;
  if (!wahl) wahl = zieh(k, zufall);
  const g = von && !los ? grund(von, wahl) : "";
  return { bereich, item: wahl.item, profil: wahl, titel: titel(bereich, wahl.item), grund: g || "Los, ohne erkennbaren Zusammenhang", url: adresseVon(bereich, wahl.item), los: los || !g };
}

/** die zwei Wege von einer Zielseite aus: je ein Vorschlag in den beiden anderen Bereichen */
export function wege(aktuell, opt = {}) {
  const von = profil(aktuell);
  const hier = von ? von.bereich : aktuell?.bereich;
  return ["zeit", "form", "farbe"].filter((b) => b !== hier).map((b) => beste(von, b, { ...opt, ausser: von && von.bereich === b ? von.item : null }));
}

// ---------- Rad: Sektoren → Karten ----------
export const strophenAus = (roman) => STROPHEN.filter((s) => s.c === roman);
export const paareVon = (nr) => constellations.filter((c) => personNr.get(c.artistId) === nr || personNr.get(c.theoristId) === nr);
export const uebungenAus = (thema) => UEBUNGEN.filter((e) => e.t === thema);

/** Ziehung für drei Sektoren: Strophe im Zyklus, Konstellation der Person, Übung im Thema, bevorzugt stimmig, nie ganz berechenbar */
export function ziehung(zyklusIdx, personIdx, themaIdx, zufall = Math.random) {
  const s = zieh(strophenAus(ZYKLEN[zyklusIdx][0]), zufall);
  const ps = profilStrophe(s);
  const c = beste(ps, "form", { nur: (x) => paareVon(personIdx).includes(x), loseAnteil: 0.1, zufall }).item;
  const pp = profilPaar(c);
  const e = beste({ ...vereinen(ps, pp), bereich: "farbe" }, "farbe", { nur: (x) => x.t === THEMEN[themaIdx][0], loseAnteil: 0.1, zufall }).item;
  return { strophe: s, paar: c, uebung: e };
}

/**
 * Brücke schlagen: eine Strophe, die eine ORNA-Person tatsächlich nennt, deren Konstellation mit dieser Strophe und eine Übung, die beiden nahe liegt.
 * In einem von fünf Fällen eine absurde Brücke: drei zufällige Stücke, die nur das Zusammendenken verbindet.
 */
export function bruecke(zufall = Math.random) {
  if (zufall() < 0.2) {
    const s = zieh(STROPHEN, zufall), c = zieh(constellations, zufall), e = zieh(UEBUNGEN, zufall);
    return { strophe: s, paar: c, uebung: e, person: zufall() < 0.5 ? c.artistId : c.theoristId, absurd: true,
      notiz: "Eine absurde Brücke: Nichts verbindet diese drei, ausser dass du sie jetzt zusammendenkst." };
  }
  const mitPerson = STROPHEN.filter((s) => s.r.some((r) => personNr.has(r.s)));
  const s = zieh(mitPerson, zufall);
  const person = zieh(s.r.filter((r) => personNr.has(r.s)), zufall).s;
  const ps = profilStrophe(s);
  const c = beste(ps, "form", { nur: (x) => x.artistId === person || x.theoristId === person, loseAnteil: 0, zufall }).item;
  const pp = profilPaar(c);
  const e = beste({ ...vereinen(ps, pp), bereich: "farbe" }, "farbe", { loseAnteil: 0, zufall }).item;
  const g = gemeinsam(vereinen(ps, pp).stems, IDX.farbe[uebungNr.get(e.id)]).woerter;
  return { strophe: s, paar: c, uebung: e, person, absurd: false,
    notiz: `Brücke: In Strophe ${s.n} «${s.t}» wird ${nameVon(person)} genannt, und die Konstellation hängt daran.` + (g.length ? ` Die Übung teilt ${g.map((w) => `«${w}»`).join(", ")} mit beiden.` : " Die Übung hat das Los gezogen.") };
}

/** Fäden zwischen den drei Karten: gemeinsame Personen und Wörter, als kurze Sätze */
export function faeden(s, c, e) {
  const z = profilStrophe(s), f = profilPaar(c), u = profilUebung(e), zeilen = [];
  for (const p of [c.artistId, c.theoristId]) if (z.personen.has(p)) zeilen.push(`Die Strophe nennt ${nameVon(p)}, und ${nameVon(p)} ist Teil der Konstellation.`);
  for (const [a, b, an, bn] of [[z, f, "Zeit", "Form"], [f, u, "Form", "Farbe"], [z, u, "Zeit", "Farbe"]]) {
    const g = gemeinsam(a.stems, b.stems);
    if (g.woerter.length && g.wert >= SCHWELLE) zeilen.push(`${an} und ${bn} teilen ${g.woerter.map((w) => `«${w}»`).join(", ")}.`);
  }
  return zeilen;
}
