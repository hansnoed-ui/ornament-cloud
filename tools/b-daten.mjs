// Neubau /b/: die Quellen lesen, die die Seite braucht. Nichts davon wird verändert; die Texte kommen wörtlich weiter.
import { readFileSync } from "node:fs";

const ROOT = new URL("../", import.meta.url);
const lies = (p) => readFileSync(new URL(p, ROOT), "utf8");

/** Adresse eines Zettels wie im Zettelkasten: «1-die-bruecke» */
export const zettelSlug = (z) => `${z.number}-${z.title.toLowerCase().replace(/ä/g, "ae").replace(/ö/g, "oe").replace(/ü/g, "ue").replace(/ß/g, "ss").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")}`;

/** Die 49 Zettel aus src/data/zu-seiner-zeit.json, mit Zyklus und Adresse; auf Englisch (seit 20. Oktober 2026, /b/en/) aus zu-seiner-zeit.en.json,
 *  mit denselben Adressen wie auf Deutsch (so wie der Zettelkasten unter zu-seiner-zeit/en/ sie hat): Titel, Leitsatz, Text, Zyklus und die Verweise
 *  (Gebiet übersetzt, Zitat wie es ist, die Resonanz aus «notes») kommen aus der Übersetzung. */
export function ladeZettel(sprache = "de") {
  const d = JSON.parse(lies("src/data/zu-seiner-zeit.json"));
  const zettel = d.stanzas.map((z) => ({ ...z, slug: zettelSlug(z), cycleDeck: d.cycles.find((c) => c.roman === z.cycle.roman)?.deck }));
  if (sprache === "de") return zettel;
  const e = JSON.parse(lies(`src/data/zu-seiner-zeit.${sprache}.json`));
  return zettel.map((z) => {
    const u = e.stanzas[String(z.number)]; if (!u) return z;
    const zyklus = e.cycles[z.cycle.roman] || {};
    return { ...z, title: u.title, bottom_line: u.bottom_line, text: u.text, editorial_status: STATUS[sprache]?.[z.editorial_status] || z.editorial_status,
      cycle: { ...z.cycle, name: zyklus.name || z.cycle.name }, cycleDeck: zyklus.deck || z.cycleDeck,
      references: z.references.map((r, i) => ({ ...r, domain: e.domains?.[r.domain] || r.domain, resonance: u.notes?.[i] || r.resonance })) };
  });
}
const STATUS = { en: { Arbeitsfassung: "Working version", Redaktionsfassung: "Editorial version" } };

export function ladeZettelkasten(sprache = "de") {
  const d = JSON.parse(lies("src/data/zu-seiner-zeit.json"));
  if (sprache === "de") return d;
  const e = JSON.parse(lies(`src/data/zu-seiner-zeit.${sprache}.json`));
  const cycles = d.cycles.map((c) => ({ ...c, name: e.cycles[c.roman]?.name || c.name, deck: e.cycles[c.roman]?.deck || c.deck }));
  return { ...d, subtitle: e.subtitle || d.subtitle, structure: e.structure || d.structure, cycles, movement: cycles.map((c) => c.name) };
}

/** Namen der 20 + 20 Personen von ORNA */
export function ladePersonen() {
  const namen = {};
  for (const f of ["src/doppelspalt/src/data/artists.ts", "src/doppelspalt/src/data/theorists.ts"])
    for (const m of lies(f).matchAll(/id: "([^"]+)",\s*name: "([^"]+)"/g)) namen[m[1]] = m[2];
  return namen;
}

/** Die 326 Konstellationen von ORNA (Text und Frage unverändert) */
export function ladeKonstellationen() {
  const t = lies("src/doppelspalt/src/data/constellations.ts");
  const liste = [];
  for (const m of t.matchAll(/\{\s*editorialNumber: (\d+),\s*id: "([^"]+)",\s*pairKey: "[^"]+",\s*artistId: "([^"]+)",\s*theoristId: "([^"]+)",\s*text: "((?:[^"\\]|\\.)*)",\s*question: "((?:[^"\\]|\\.)*)",?\s*\}/g))
    liste.push({ nr: +m[1], id: m[2], artistId: m[3], theoristId: m[4], text: JSON.parse(`"${m[5]}"`), question: JSON.parse(`"${m[6]}"`) });
  return liste;
}

/** Die 48 Pilot-Konstellationen von ORMA, mit Namen und den Originaltexten von ORNA */
export function ladeOrma() {
  const namen = ladePersonen();
  const orna = new Map(ladeKonstellationen().map((k) => [k.id, k]));
  const p = JSON.parse(lies("src/orma/redaktion/pilot.json"));
  return p.konstellationen.map((k) => {
    const [a, t] = k.id.split("__");
    const o = orna.get(k.id);
    return { ...k, kuenstler: namen[a], theoretiker: namen[t], artistId: a, theoristId: t, text: o?.text, frage: o?.question, nr: o?.nr };
  });
}

/** Die 180 Gestaltungsübungen von OMNA COLOR (stehen in der Seite selbst, alpha/omna-color/index.html, «const EX = [...]») */
export function ladeOmna() {
  const m = lies("alpha/omna-color/index.html").match(/const EX = (\[.*?\]);/s);
  return m ? JSON.parse(m[1]) : [];
}

export function ladeWerke() { return JSON.parse(lies("src/art/werke.json")); }
export function ladeBeitraege() { return JSON.parse(lies("social-media/daten/eintraege.json")); }
