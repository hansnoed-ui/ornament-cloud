// Daten des Videos «Reise» (28. Oktober 2026): ein Netz im Stil der Graphansicht von Obsidian aus dem Zettelkasten «Zu seiner Zeit» und ORNA.
// Liest unverändert aus der Website und schreibt src/reise/data/reise.json – nicht von Hand bearbeiten, nicht eingecheckt. Läuft mit «npm run vorbereiten».
//   Zettelkasten  src/data/zu-seiner-zeit.json (Zyklen, Strophen, Kernsätze, Verweise «Name, Werk») und zu-seiner-zeit/zsz-daten.json (Personen der Verweise)
//   ORNA          portfolio/nebeneinander-nacheinander/js/data/ (20 Künstler:innen, 20 Theoretiker:innen, 326 Konstellationen mit ihrer Frage)
//   Knoten        Zyklus, Strophe (Begriff), Werk (Quelle), Name; ein Name, der in beiden vorkommt, ist ein Knoten (Brücke zwischen den beiden)
//   Kanten        Zyklus–Strophe, Strophe–Werk, Werk–Name, in ORNA Künstler:in–Theoretiker:in (eine Kante je Konstellation)
//   Netz          Kraftsimulation in 3D mit festem Startwert; ORNA liegt als Doppelrad (aussen Kunst, innen Theorie) neben dem Zettelkasten
//   Spur          die Stationen der Reise; jede folgt einem Weg aus echten Kanten (das Skript bricht ab, wenn eine Kante fehlt)
import { artists } from "../../../../portfolio/nebeneinander-nacheinander/js/data/artists.js";
import { theorists } from "../../../../portfolio/nebeneinander-nacheinander/js/data/theorists.js";
import { constellations } from "../../../../portfolio/nebeneinander-nacheinander/js/data/constellations.js";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";

const hier = (p) => new URL(p, import.meta.url);
const lies = (p) => JSON.parse(readFileSync(new URL(p, import.meta.url), "utf8"));
const zsz = lies("../../../data/zu-seiner-zeit.json");
const personen = lies("../../../../zu-seiner-zeit/zsz-daten.json");

const knoten = [], index = new Map();
const knoten_ = (schluessel, art, titel, extra = {}) => {
  if (!index.has(schluessel)) { index.set(schluessel, knoten.length); knoten.push({ art, titel, ...extra }); }
  return index.get(schluessel);
};
const kanten = new Map();
const kante = (a, b, art) => { const s = a < b ? `${a}-${b}` : `${b}-${a}`; if (!kanten.has(s)) kanten.set(s, [Math.min(a, b), Math.max(a, b), art]); };

// Zettelkasten: Zyklen, Strophen, Werke, Namen
for (const z of zsz.cycles) knoten_(`zyklus:${z.roman}`, "zyklus", `${z.roman} ${z.name}`);
const strophe = new Map(personen.stanzas.map((s) => [s.id, s]));
for (const s of zsz.stanzas) {
  const st = knoten_(`strophe:${s.number}`, "strophe", s.title, { nummer: s.number });
  kante(index.get(`zyklus:${s.cycle.roman}`), st, "zyklus");
  // die Personen der Verweise in derselben Reihenfolge wie die Verweise (zsz-daten.json)
  const refs = strophe.get(s.number).refs;
  if (refs.length !== s.references.length) throw new Error(`reise: Verweise von Strophe ${s.number} passen nicht zusammen`);
  s.references.forEach((r, j) => {
    const name = personen.persons[refs[j].slug].name;
    if (!r.citation.startsWith(name)) throw new Error(`reise: «${r.citation}» beginnt nicht mit ${name}`);
    const werk = r.citation.slice(r.citation.indexOf(", ") + 2);
    const p = knoten_(`name:${name}`, "name", name, { zsz: true });
    const w = knoten_(`werk:${r.citation}`, "werk", werk, { von: name });
    kante(st, w, "werk"); kante(w, p, "name");
  });
}
// ORNA: die beiden Ringe und ihre Konstellationen
const ornaName = Object.fromEntries([...artists, ...theorists].map((p) => [p.id, p]));
artists.forEach((p, j) => { const i = knoten_(`name:${p.name}`, "name", p.name); Object.assign(knoten[i], { orna: "kunst", ring: j }); });
theorists.forEach((p, j) => { const i = knoten_(`name:${p.name}`, "name", p.name); Object.assign(knoten[i], { orna: "theorie", ring: j }); });
for (const c of constellations) kante(index.get(`name:${ornaName[c.artistId].name}`), index.get(`name:${ornaName[c.theoristId].name}`), "orna");
const liste = [...kanten.values()];

// Anordnung: Abstossung zwischen allen, Federn an den Kanten; Zyklen auf einem Kreis, ORNA als Doppelrad daneben; fester Startwert
let saat = 20261028;
const zufall = () => { saat = (Math.imul(saat, 1664525) + 1013904223) >>> 0; return saat / 4294967296; };
const ORNA_MITTE = [900, -60, 0];
const ziel = (k) => {
  if (k.art === "zyklus") { const w = ((knoten.indexOf(k)) / 7) * Math.PI * 2 - Math.PI / 2; return [Math.cos(w) * 470, Math.sin(w * 2) * 110, Math.sin(w) * 470]; }
  if (k.orna) {
    // Doppelrad in einer schrägen Ebene: aussen Kunst (Halbmesser 330), innen Theorie (190)
    const r = k.orna === "kunst" ? 330 : 190, w = (k.ring / 20) * Math.PI * 2 + (k.orna === "kunst" ? 0 : Math.PI / 20);
    return [ORNA_MITTE[0] + Math.cos(w) * r * 0.55, ORNA_MITTE[1] + Math.sin(w) * r, ORNA_MITTE[2] + Math.cos(w) * r * 0.83];
  }
  return null;
};
const P = knoten.map((k) => { const z = ziel(k); return z ? [...z] : [(zufall() - 0.5) * 900, (zufall() - 0.5) * 500, (zufall() - 0.5) * 900]; });
const SCHRITTE = 600;
for (let schritt = 0; schritt < SCHRITTE; schritt++) {
  const temp = 1 - schritt / SCHRITTE, f = knoten.map(() => [0, 0, 0]);
  for (let a = 0; a < P.length; a++) for (let b = a + 1; b < P.length; b++) {
    const d = [P[a][0] - P[b][0], P[a][1] - P[b][1], P[a][2] - P[b][2]], l2 = d[0] ** 2 + d[1] ** 2 + d[2] ** 2 + 1;
    if (l2 > 300 ** 2) continue;
    const s = 3200 / l2 / Math.sqrt(l2);
    for (let k = 0; k < 3; k++) { f[a][k] += d[k] * s; f[b][k] -= d[k] * s; }
  }
  for (const [a, b, art] of liste) {
    const d = [P[b][0] - P[a][0], P[b][1] - P[a][1], P[b][2] - P[a][2]], l = Math.hypot(...d) + 1e-6;
    const [lang, hart] = { zyklus: [120, 0.05], werk: [55, 0.06], name: [45, 0.06], orna: [0, 0] }[art];
    if (!hart) continue;
    const s = hart * (l - lang);
    for (let k = 0; k < 3; k++) { f[a][k] += (d[k] / l) * s; f[b][k] -= (d[k] / l) * s; }
  }
  knoten.forEach((k, i) => {
    const z = ziel(k), zug = z ? 0.3 : 0.004;
    const zz = z ?? [0, 0, 0];
    for (let n = 0; n < 3; n++) { f[i][n] += (zz[n] - P[i][n]) * zug; P[i][n] += Math.max(-14, Math.min(14, f[i][n])) * temp; }
  });
}

// Grad (Zahl der Kanten) bestimmt die Grösse eines Punkts wie in Obsidian
const grad = new Array(knoten.length).fill(0);
for (const [a, b] of liste) { grad[a]++; grad[b]++; }

// ---------- die Spur ----------
const S = (n) => index.get(`strophe:${n}`), W = (zitat) => { const i = index.get(`werk:${zitat}`); if (i === undefined) throw new Error(`reise: Werk ${zitat} fehlt`); return i; };
const N = (name) => index.get(`name:${name}`);
const K = (kunst, theorie) => {
  const c = constellations.find((x) => ornaName[x.artistId].name === kunst && ornaName[x.theoristId].name === theorie);
  if (!c) throw new Error(`reise: Konstellation ${kunst} × ${theorie} fehlt`);
  return c;
};
const zitat = (n, name) => zsz.stanzas.find((s) => s.number === n).references.find((r) => r.citation.startsWith(name)).citation;
/** eine Strophe als Station: Begriff, Zyklus, Kernsatz und ihre vier Verweise */
const stropheStation = (n, weg, ueber) => {
  const s = zsz.stanzas.find((x) => x.number === n), z = zsz.cycles.find((c) => c.roman === s.cycle.roman);
  return { art: "strophe", ziel: [S(n)], weg, ueber, kopf: `Strophe ${n} · ${z.roman} ${z.name}`, titel: s.title, text: s.bottom_line,
    verweise: s.references.map((r) => { const w = W(r.citation); return { name: knoten[w].von, werk: knoten[w].titel, w, p: N(knoten[w].von) }; }) };
};
/** eine Konstellation von ORNA als Station: das Paar, seine Frage und die Strophen, in denen der Name der Brücke auch steht */
const ornaStation = (kunst, theorie, bruecke, weg, ueber) => {
  const c = K(kunst, theorie), p = Object.values(personen.persons).find((x) => x.name === bruecke);
  return { art: "orna", ziel: [N(kunst), N(theorie)], weg, ueber, kopf: "ORNA · Konstellation", titel: `${kunst} × ${theorie}`, text: c.question, verweise: [],
    bruecke: { name: bruecke, strophen: p.stanzas.map((n) => ({ nummer: n, titel: zsz.stanzas.find((x) => x.number === n).title, i: S(n) })) } };
};
const spur = [
  stropheStation(1, [S(1)], null),
  stropheStation(28, [S(1), W(zitat(1, "Karen Barad")), S(28)], "über Karen Barad · dasselbe Werk"),
  ornaStation("Mona Hatoum", "Karen Barad", "Karen Barad", [S(28), W(zitat(28, "Karen Barad")), N("Karen Barad"), N("Mona Hatoum")], "über Karen Barad"),
  stropheStation(22, [N("Mona Hatoum"), W(zitat(22, "Mona Hatoum")), S(22)], "über Mona Hatoum"),
  ornaStation("On Kawara", "Susan Leigh Star", "Susan Leigh Star", [S(22), W(zitat(22, "Susan Leigh Star")), N("Susan Leigh Star"), N("On Kawara")], "über Susan Leigh Star"),
  stropheStation(2, [N("On Kawara"), W(zitat(2, "On Kawara")), S(2)], "über On Kawara"),
  stropheStation(49, [S(2), W(zitat(2, "Alfred North Whitehead")), S(49)], "über Alfred North Whitehead · dasselbe Werk"),
];
// jeder Schritt eines Wegs muss eine Kante sein
for (const st of spur) for (let j = 1; j < st.weg.length; j++) {
  const [a, b] = [st.weg[j - 1], st.weg[j]];
  if (!kanten.has(a < b ? `${a}-${b}` : `${b}-${a}`)) throw new Error(`reise: keine Kante ${knoten[a].titel} – ${knoten[b].titel}`);
}

const zaehle = {
  zyklen: zsz.cycles.length, strophen: zsz.stanzas.length, namen: knoten.filter((k) => k.zsz).length, werke: knoten.filter((k) => k.art === "werk").length,
  verweise: zsz.stanzas.reduce((s, x) => s + x.references.length, 0), orna: artists.length + theorists.length, konstellationen: constellations.length,
  beide: knoten.filter((k) => k.zsz && k.orna).length,
};

mkdirSync(hier("data/"), { recursive: true });
writeFileSync(hier("data/reise.json"), JSON.stringify({
  zaehle,
  knoten: knoten.map((k, i) => ({ art: k.art, titel: k.titel, orna: k.orna ?? null, zsz: !!k.zsz, grad: grad[i], p: P[i].map((v) => Math.round(v * 10) / 10) })),
  kanten: liste.map(([a, b, art]) => [a, b, ["zyklus", "werk", "name", "orna"].indexOf(art)]),
  spur,
}));
console.log(`reise: ${knoten.length} Knoten, ${liste.length} Kanten, ${zaehle.beide} Namen in beiden, ${spur.length} Stationen`);
