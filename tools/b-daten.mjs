// Neubau /b/: die Quellen lesen, die die Seite braucht. Nichts davon wird verändert; die Texte kommen wörtlich weiter.
import { readFileSync } from "node:fs";

const ROOT = new URL("../", import.meta.url);
const lies = (p) => readFileSync(new URL(p, ROOT), "utf8");

/** Adresse eines Zettels wie im Zettelkasten: «1-die-bruecke» */
export const zettelSlug = (z) => `${z.number}-${z.title.toLowerCase().replace(/ä/g, "ae").replace(/ö/g, "oe").replace(/ü/g, "ue").replace(/ß/g, "ss").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")}`;

/** Die 49 Zettel aus src/data/zu-seiner-zeit.json, mit Zyklus und Adresse */
export function ladeZettel() {
  const d = JSON.parse(lies("src/data/zu-seiner-zeit.json"));
  return d.stanzas.map((z) => ({ ...z, slug: zettelSlug(z), cycleDeck: d.cycles.find((c) => c.roman === z.cycle.roman)?.deck }));
}

export function ladeZettelkasten() {
  return JSON.parse(lies("src/data/zu-seiner-zeit.json"));
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

export function ladeWerke() { return JSON.parse(lies("src/art/werke.json")); }
export function ladeBeitraege() { return JSON.parse(lies("social-media/daten/eintraege.json")); }
