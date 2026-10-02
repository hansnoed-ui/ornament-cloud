// «Das Dritte Rad»: gemeinsame Logik für das Rad (index.html) und die Auswahl auf den Zielseiten (weiter.js).
// Verbindet drei Bestände: Zettelkasten (Strophen, daten.js), ORNA (Personen, Konstellationen, direkt aus dem Rad) und OMNA COLOR (Übungen, daten.js).
// Alles läuft im Browser. Nichts wird gesendet. Zufall und Gewichtung sind nur Vorschläge, das Los darf absurd sein (Auftrag vom 2. Oktober 2026).
import { ZYKLEN, THEMEN, STROPHEN, UEBUNGEN } from "./daten.js";
import { constellations } from "../../portfolio/nebeneinander-nacheinander/js/data/constellations.js";
import { artists } from "../../portfolio/nebeneinander-nacheinander/js/data/artists.js";
import { theorists } from "../../portfolio/nebeneinander-nacheinander/js/data/theorists.js";
import { JEV } from "./jev.js";

export { ZYKLEN, THEMEN, STROPHEN, UEBUNGEN };
export const KONSTELLATIONEN = constellations;
export const PERSONEN = [...artists, ...theorists];          // Index = Nummer des Zeichens (Künstler:innen 0–19, Theoretiker:innen 20–39)
export const WURZEL = new URL("../../", import.meta.url).href;

const personNr = new Map(PERSONEN.map((p, i) => [p.id, i]));
const verweisName = new Map(STROPHEN.flatMap((s) => s.r.map((r) => [r.s, r.p])));   // Namen aller Personen, die Strophen nennen (auch außerhalb von ORNA)
export const nrVon = (id) => personNr.get(id);
export const nameVon = (id) => PERSONEN[personNr.get(id)]?.name ?? verweisName.get(id) ?? id;

// ---------- Adressen der Ziele (rad=1 lässt dort die Auswahl erscheinen) ----------
export const adresse = {
  strophe: (s) => `${WURZEL}zu-seiner-zeit/strophe/${s.s}/?rad=1`,
  paar: (c) => `${WURZEL}portfolio/nebeneinander-nacheinander/?pair=${c.id}&rad=1`,
  uebung: (e) => `${WURZEL}alpha/omna-color/?u=${e.id}&rad=1`,
  start: `${WURZEL}alpha/drittes-rad/`,
  /** ein Stand im Rad (Strophe, Konstellation, Übung, Farbe, Zeichen), optional mit offenem Stück (fokus: zeit | form | farbe) */
  spiel: (z, fokus) => `${WURZEL}alpha/drittes-rad/?t=${encodeURIComponent([z.strophe.s, z.paar.id, z.uebung.id, THEMEN.findIndex((x) => x[0] === z.uebung.t), nrVon(z.person)].join("~"))}` + (fokus ? `&f=${fokus}` : ""),
  /** zurück ins Rad: mit einem Stück als Anker ({art, slug|id}) dreht das Rad von dort aus weiter, sonst dreht es frei */
  rad: (a) => `${WURZEL}alpha/drittes-rad/?von=` + (a && a.art ? `${a.art}~${encodeURIComponent(a.slug ?? a.id)}` : "los"),
};
export const BEREICH = { rad: "Das Dritte Rad", zeit: "Zettelkasten", form: "ORNA", farbe: "OMNA COLOR" };

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

// ---------- jev: beim Bauen vorab bewertete Nähe (jev.js, erzeugt mit tools/build-jev-bruecken.ts) ----------
// Gilt nur, solange Strophen, Konstellationen und Übungen dieselben und in derselben Reihenfolge sind; sonst bleibt jev still.
const fnv = (texte) => { let h = 0x811c9dc5; for (const t of texte) { for (let i = 0; i < t.length; i++) { h ^= t.charCodeAt(i); h = Math.imul(h, 0x01000193) >>> 0; } h = Math.imul(h ^ 124, 0x01000193) >>> 0; } return h.toString(16).padStart(8, "0"); };
export const PRUEFSUMME = fnv([...STROPHEN.map((s) => s.s), ...constellations.map((c) => c.id), ...UEBUNGEN.map((e) => e.id)]);
export const JEV_GUELTIG = JEV.pruefsumme === PRUEFSUMME;
const JEV_LISTEN = { "zeit>form": JEV.zf, "zeit>farbe": JEV.zc, "form>zeit": JEV.fz, "form>farbe": JEV.fc, "farbe>zeit": JEV.cz, "farbe>form": JEV.cf };
/** Rang in jevs Liste (0 = am nächsten), -1 wenn jev das Stück nicht nennt */
const jevRang = (von, bereich, nr) => { const l = JEV_GUELTIG && von && von.nr != null ? JEV_LISTEN[`${von.bereich}>${bereich}`]?.[von.nr] : null; return l ? l.indexOf(nr) : -1; };
export const strophe = (slug) => STROPHEN[strophenNr.get(slug)];
export const paar = (id) => constellations[paarNr.get(id)];
export const uebung = (id) => UEBUNGEN[uebungNr.get(id)];

export const profilStrophe = (s) => ({ bereich: "zeit", art: "strophe", item: s, nr: strophenNr.get(s.s), stems: IDX.zeit[strophenNr.get(s.s)], personen: new Set(s.r.map((r) => r.s)) });
export const profilPaar = (c) => ({ bereich: "form", art: "paar", item: c, nr: paarNr.get(c.id), stems: IDX.form[paarNr.get(c.id)], personen: new Set([c.artistId, c.theoristId]) });
export const profilUebung = (e) => ({ bereich: "farbe", art: "uebung", item: e, nr: uebungNr.get(e.id), stems: IDX.farbe[uebungNr.get(e.id)], personen: new Set() });
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
  zeit: () => STROPHEN.map((s, i) => ({ bereich: "zeit", nr: i, item: s, stems: IDX.zeit[i], personen: new Set(s.r.map((r) => r.s)) })),
  form: () => constellations.map((c, i) => ({ bereich: "form", nr: i, item: c, stems: IDX.form[i], personen: new Set([c.artistId, c.theoristId]) })),
  farbe: () => UEBUNGEN.map((e, i) => ({ bereich: "farbe", nr: i, item: e, stems: IDX.farbe[i], personen: new Set() })),
};
export const titel = (bereich, item) =>
  bereich === "zeit" ? `«${item.t}» (Strophe ${item.n})` : bereich === "form" ? `${nameVon(item.artistId)} × ${nameVon(item.theoristId)}` : `${item.n} (${item.t})`;
export const adresseVon = (bereich, item) => adresse[{ zeit: "strophe", form: "paar", farbe: "uebung" }[bereich]](item);

/** Begründung: gemeinsame Person, gemeinsame Wörter, Nähe nach jev */
export function grund(von, ziel) {
  const teile = [];
  const pers = [...von.personen].filter((p) => ziel.personen.has(p));
  if (pers.length) teile.push(`${pers.slice(0, 2).map((p) => `«${nameVon(p)}»`).join(" und ")} kommt in beiden vor`);
  const g = gemeinsam(von.stems, ziel.stems);
  if (g.woerter.length && g.wert >= SCHWELLE) teile.push(`gemeinsam: ${g.woerter.map((w) => `«${w}»`).join(", ")}`);
  const gl = gleicheArt(von, ziel);
  if (gl) teile.push(gl.text);
  if (jevRang(von, ziel.bereich, ziel.nr) >= 0) teile.push(teile.length ? "jev sieht auch eine Nähe" : "jev sieht eine Nähe, auch ohne gemeinsames Wort");
  return teile.join(" · ");
}
const JEV_BONUS = [8, 7.2, 6.4, 5.6, 4.8, 4.2, 3.7, 3.4];   // nach Rang: jevs Nennung trägt allein über die Schwelle, ein gemeinsames Wort oder eine Person zählt dazu
/** Nähe innerhalb desselben Bereichs: Anklänge der Strophen untereinander (Zettelkasten), gleiches oder Nachbarthema (OMNA COLOR) */
function gleicheArt(von, k) {
  if (von.bereich !== k.bereich || !von.item) return null;
  if (von.bereich === "zeit" && (von.item.v || []).includes(k.item.n)) return { wert: 6, text: "ein Anklang im Zettelkasten" };
  if (von.bereich === "farbe" && von.item.t === k.item.t) return { wert: 3.3, text: `gleiches Thema «${k.item.t}»` };
  if (von.bereich === "farbe" && (von.item.nb || []).includes(k.item.t)) return { wert: 3.3, text: `Nachbarthema «${k.item.t}»` };
  return null;
}
const wert = (von, k) => {
  const r = jevRang(von, k.bereich, k.nr), g = gleicheArt(von, k);
  return gemeinsam(von.stems, k.stems).wert + [...von.personen].filter((p) => k.personen.has(p)).length * 6 + (r >= 0 ? JEV_BONUS[Math.min(r, JEV_BONUS.length - 1)] : 0) + (g ? g.wert : 0);
};

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

/** Name des Stücks, bei dem man steht, für Sätze wie «dreht von … aus weiter» */
function nenne(a) {
  if (a.art === "strophe") return `«${strophe(a.slug).t}»`;
  if (a.art === "paar") return `${nameVon(paar(a.id).artistId)} × ${nameVon(paar(a.id).theoristId)}`;
  if (a.art === "uebung") return `«${uebung(a.id).n}»`;
  return nameVon(a.slug);
}
/** Beschreibung eines Stücks als Anker ({art, slug|id}), so wie profil() und rueckkehr() sie lesen */
export const ankerVon = (bereich, item) => ({ zeit: { art: "strophe", slug: item.s }, form: { art: "paar", id: item.id }, farbe: { art: "uebung", id: item.id } })[bereich];

/**
 * Die vier Wege von einer Seite außerhalb des Rads aus (feste Reihenfolge): zurück ins Rad, dazu je ein Vorschlag in Zettelkasten, ORNA und OMNA COLOR.
 * Auch im Bereich, in dem man steht, kommt ein Vorschlag (ein anderes Stück derselben Art). Alle Wege führen in die Radseite, nicht zurück ins Original.
 */
export function wege(aktuell, opt = {}) {
  const von = profil(aktuell);
  const hier = von ? von.bereich : aktuell?.bereich;
  const rad = { bereich: "rad", titel: "Zurück ins Rad", grund: von ? `dreht von ${nenne(aktuell)} aus weiter` : "dreht frei weiter", url: adresse.rad(von ? aktuell : null), hier: false };
  return [rad, ...["zeit", "form", "farbe"].map((b) => {
    const w = beste(von, b, { ...opt, ausser: von && von.bereich === b ? von.item : null });
    return { bereich: b, titel: w.titel, grund: w.grund, url: adresse.spiel(rueckkehr(ankerVon(b, w.item), opt.zufall), b), hier: b === hier };
  })];
}

/**
 * Die vier Wege im Rad selbst: z = Stand {strophe, paar, uebung, person}, fokus = welches Stück gerade offen ist.
 * Die beiden anderen Bereiche öffnen das Stück, das schon im Stand liegt (ohne neue Ziehung); im Bereich des offenen Stücks kommt ein neues, verwandtes.
 */
export function wegeImSpiel(z, fokus, opt = {}) {
  const items = { zeit: z.strophe, form: z.paar, farbe: z.uebung };
  const profile = { zeit: profilStrophe(z.strophe), form: profilPaar(z.paar), farbe: profilUebung(z.uebung) };
  const anker = ankerVon(fokus, items[fokus]);
  const rad = { bereich: "rad", titel: "Zurück ins Rad", grund: `dreht von ${nenne(anker)} aus weiter`, url: adresse.rad(anker), hier: false };
  return [rad, ...["zeit", "form", "farbe"].map((b) => {
    if (b !== fokus) return { bereich: b, titel: titel(b, items[b]), grund: grund(profile[fokus], profile[b]) || "liegt im Rad daneben", url: adresse.spiel(z, b), hier: false };
    const w = beste(profile[fokus], b, { ...opt, ausser: items[b] });
    return { bereich: b, titel: w.titel, grund: w.grund, url: adresse.spiel(rueckkehr(ankerVon(b, w.item), opt.zufall), b), hier: true };
  })];
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
 * Brücke schlagen, auf drei Wegen: (1) eine Strophe, die eine ORNA-Person tatsächlich nennt, deren Konstellation und eine nahe Übung;
 * (2) was jev beim Bauen als nah beieinander bewertet hat, auch ohne gemeinsames Wort; (3) in einem von fünf Fällen eine absurde Brücke:
 * drei zufällige Stücke, die nur das Zusammendenken verbindet. Rückgabe: { strophe, paar, uebung, person, absurd, quelle: "person" | "jev" | "los", notiz }
 */
export function bruecke(zufall = Math.random) {
  const r = zufall();
  if (r < 0.2) {
    const s = zieh(STROPHEN, zufall), c = zieh(constellations, zufall), e = zieh(UEBUNGEN, zufall);
    return { strophe: s, paar: c, uebung: e, person: zufall() < 0.5 ? c.artistId : c.theoristId, absurd: true, quelle: "los",
      notiz: "Eine absurde Brücke: Nichts verbindet diese drei, ausser dass du sie jetzt zusammendenkst." };
  }
  if (r < 0.55 && JEV_GUELTIG) {
    const s = zieh(STROPHEN, zufall), nrK = zieh(JEV.zf[strophenNr.get(s.s)].slice(0, 5), zufall), c = constellations[nrK];
    const e = UEBUNGEN[zieh(JEV.fc[nrK].slice(0, 5), zufall)];
    const genannt = [c.artistId, c.theoristId].filter((id) => s.r.some((x) => x.s === id));
    const person = genannt.length ? zieh(genannt, zufall) : zufall() < 0.5 ? c.artistId : c.theoristId;
    const g = grund(profilStrophe(s), profilPaar(c));
    return { strophe: s, paar: c, uebung: e, person, absurd: false, quelle: "jev",
      notiz: `Brücke nach jev: Strophe ${s.n} «${s.t}» und ${titel("form", c)} liegen nah beieinander (${g || "jev sieht eine Nähe"}). Die Übung «${e.n}» liegt der Konstellation nah.` };
  }
  const mitPerson = STROPHEN.filter((s) => s.r.some((r) => personNr.has(r.s)));
  const s = zieh(mitPerson, zufall);
  const person = zieh(s.r.filter((r) => personNr.has(r.s)), zufall).s;
  const ps = profilStrophe(s);
  const c = beste(ps, "form", { nur: (x) => x.artistId === person || x.theoristId === person, loseAnteil: 0, zufall }).item;
  const pp = profilPaar(c);
  const e = beste({ ...vereinen(ps, pp), bereich: "farbe" }, "farbe", { loseAnteil: 0, zufall }).item;
  const g = gemeinsam(vereinen(ps, pp).stems, IDX.farbe[uebungNr.get(e.id)]).woerter;
  return { strophe: s, paar: c, uebung: e, person, absurd: false, quelle: "person",
    notiz: `Brücke: In Strophe ${s.n} «${s.t}» wird ${nameVon(person)} genannt, und die Konstellation hängt daran.` + (g.length ? ` Die Übung teilt ${g.map((w) => `«${w}»`).join(", ")} mit beiden.` : " Die Übung hat das Los gezogen.") };
}

/**
 * Zurück ins Rad: das Stück, bei dem man steht, bleibt als Anker liegen, das Rad sucht die beiden anderen dazu.
 * von = {art: strophe|paar|uebung|person, slug|id}. vorgabe: {person} erzwingt die Person im Zeichenring, {paar} eine bestimmte Konstellation.
 * Rückgabe wie bruecke(): { strophe, paar, uebung, person, notiz }, bei unbekanntem Stück null.
 */
export function rueckkehr(von, zufall = Math.random, vorgabe = {}) {
  const p = profil(von);
  if (!p) return null;
  const nennt = (s) => [...new Set(s.r.map((r) => r.s))].filter((id) => personNr.has(id));   // ORNA-Personen, die eine Strophe nennt
  const mit = (id) => (x) => x.artistId === id || x.theoristId === id;
  let s, c, e, person;
  // Zeit
  if (p.art === "strophe") s = p.item;
  else if (p.art === "paar") {
    const ids = vorgabe.person ? [vorgabe.person] : [p.item.artistId, p.item.theoristId];
    const k = STROPHEN.filter((x) => x.r.some((r) => ids.includes(r.s)));
    s = beste(p, "zeit", { nur: k.length ? (x) => k.includes(x) : null, loseAnteil: k.length ? 0 : 0.15, zufall }).item;
  } else if (p.art === "person") {
    const k = STROPHEN.filter((x) => x.r.some((r) => r.s === von.slug));
    s = zieh(k.length ? k : STROPHEN, zufall);
  } else s = beste(p, "zeit", { zufall }).item;
  const ps = profilStrophe(s);
  // Form
  if (p.art === "paar") {
    c = p.item;
    const n = nennt(s).filter((id) => mit(id)(c));
    person = vorgabe.person && mit(vorgabe.person)(c) ? vorgabe.person : zieh(n.length ? n : [c.artistId, c.theoristId], zufall);
  } else if (vorgabe.paar && (!vorgabe.person || mit(vorgabe.person)(vorgabe.paar))) {
    c = vorgabe.paar;
    person = vorgabe.person ?? (nennt(s).find((id) => mit(id)(c)) ?? (zufall() < 0.5 ? c.artistId : c.theoristId));
  } else {
    const kandidaten = vorgabe.person ? [vorgabe.person] : p.art === "person" && personNr.has(von.slug) ? [von.slug] : nennt(s);
    person = kandidaten.length ? zieh(kandidaten, zufall) : null;
    c = beste(p.art === "uebung" ? vereinen(ps, p) : ps, "form", { nur: person ? mit(person) : null, loseAnteil: person ? 0 : 0.15, zufall }).item;
    if (!person) person = zufall() < 0.5 ? c.artistId : c.theoristId;
  }
  // Farbe
  e = p.art === "uebung" ? p.item : beste(vereinen(ps, profilPaar(c)), "farbe", { loseAnteil: 0.1, zufall }).item;
  const genannt = nennt(s).includes(person) ? ` ${nameVon(person)} wird in Strophe ${s.n} «${s.t}» genannt.` : "";
  const notiz = "Zurück im Rad: " + ({
    strophe: `Strophe ${s.n} «${s.t}» bleibt liegen, das Rad sucht Form und Farbe dazu.`,
    paar: `${nameVon(c.artistId)} × ${nameVon(c.theoristId)} bleiben liegen, das Rad sucht Zeit und Farbe dazu.`,
    uebung: `Die Übung «${e.n}» bleibt liegen, das Rad sucht Zeit und Form dazu.`,
    person: `${nenne(von)} bleibt liegen, das Rad sucht Zeit, Form und Farbe dazu.`,
  })[p.art] + genannt;
  return { strophe: s, paar: c, uebung: e, person, absurd: false, notiz };
}

/** Fäden zwischen den drei Karten: gemeinsame Personen und Wörter, als kurze Sätze */
export function faeden(s, c, e) {
  const z = profilStrophe(s), f = profilPaar(c), u = profilUebung(e), zeilen = [];
  for (const p of [c.artistId, c.theoristId]) if (z.personen.has(p)) zeilen.push(`Die Strophe nennt ${nameVon(p)}, und ${nameVon(p)} ist Teil der Konstellation.`);
  for (const [a, b, an, bn] of [[z, f, "Zeit", "Form"], [f, u, "Form", "Farbe"], [z, u, "Zeit", "Farbe"]]) {
    const g = gemeinsam(a.stems, b.stems), jevNah = jevRang(a, b.bereich, b.nr) >= 0 || jevRang(b, a.bereich, a.nr) >= 0;
    if (g.woerter.length && g.wert >= SCHWELLE) zeilen.push(`${an} und ${bn} teilen ${g.woerter.map((w) => `«${w}»`).join(", ")}.${jevNah ? " jev sieht sie auch nah beieinander." : ""}`);
    else if (jevNah) zeilen.push(`jev sieht ${an} und ${bn} nah beieinander, auch ohne gemeinsames Wort.`);
  }
  return zeilen;
}
