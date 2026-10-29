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
  const c = K(kunst, theorie);
  // die Brücke: der Name (oder die Namen) des Paars, die auch im Zettelkasten stehen, mit ihren Strophen
  const namen = bruecke ? [bruecke] : [kunst, theorie];
  const p = namen.map((n) => Object.values(personen.persons).find((x) => x.name === n)).find(Boolean);
  return { art: "orna", ziel: [N(kunst), N(theorie)], weg, ueber, kopf: "ORNA · Konstellation", titel: `${kunst} × ${theorie}`, text: c.question, verweise: [],
    bruecke: p ? { name: p.name, strophen: p.stanzas.map((n) => ({ nummer: n, titel: zsz.stanzas.find((x) => x.number === n).title, i: S(n) })) } : null };
};
const spurReise = [
  stropheStation(1, [S(1)], null),
  stropheStation(28, [S(1), W(zitat(1, "Karen Barad")), S(28)], "über Karen Barad · dasselbe Werk"),
  ornaStation("Mona Hatoum", "Karen Barad", "Karen Barad", [S(28), W(zitat(28, "Karen Barad")), N("Karen Barad"), N("Mona Hatoum")], "über Karen Barad"),
  stropheStation(22, [N("Mona Hatoum"), W(zitat(22, "Mona Hatoum")), S(22)], "über Mona Hatoum"),
  ornaStation("On Kawara", "Susan Leigh Star", "Susan Leigh Star", [S(22), W(zitat(22, "Susan Leigh Star")), N("Susan Leigh Star"), N("On Kawara")], "über Susan Leigh Star"),
  stropheStation(2, [N("On Kawara"), W(zitat(2, "On Kawara")), S(2)], "über On Kawara"),
  stropheStation(49, [S(2), W(zitat(2, "Alfred North Whitehead")), S(49)], "über Alfred North Whitehead · dasselbe Werk"),
];
// ---------- weitere Suchaufträge (29. Oktober 2026): die Stationen von Hand, die Wege dazwischen sucht das Skript ----------
// Wunsch: «weitere "Reisen" durch den Zettelkasten und ORNA … den jeweiligen "Suchauftrag" … mit Zetteln, ORNA-Begegnungen, Namen, Werken, Verbindungen».
// Der Weg ist der kürzeste über echte Kanten (Breitensuche, ohne die Zyklen), von einem Ziel der vorigen Station zur neuen.
const NACHBARN = knoten.map(() => []), MIT_ZYKLEN = knoten.map(() => []);
for (const [a, b, art] of liste) { MIT_ZYKLEN[a].push(b); MIT_ZYKLEN[b].push(a); if (art !== "zyklus") { NACHBARN[a].push(b); NACHBARN[b].push(a); } }
// steht eine Strophe nur mit eigenen Namen da (z. B. 42 Die Plattform), führt der Weg über ihren Zyklus
// gleichesWerk: false (Wunsch vom 29. Oktober 2026: «nicht über "gleiches Werk" verbinden»): eine eigene, gewichtete Suche (ohneGleichesWerk)
const suche = (von, nach, gleichesWerk = true) => {
  if (!gleichesWerk) return ohneGleichesWerk(von, nach);
  try { return suche_(von, nach, NACHBARN, gleichesWerk); } catch { return suche_(von, nach, MIT_ZYKLEN, gleichesWerk); }
};
/** kürzester Weg ohne «dasselbe Werk»: verboten sind Strophe → Werk → Strophe und Werk → Name → Werk mit demselben Titel (dasselbe Werk, anders zitiert);
 *  ein Schritt über den Zyklus kostet 2, alle anderen 1 (so führt der Weg lieber über einen Zyklus als über weite Umwege) */
const ohneGleichesWerk = (von, nach) => {
  const kosten = new Map(), vor = new Map(), offen = [];
  const schl = (i, v) => `${i}|${v}`;
  for (const v of von) { kosten.set(schl(v, -1), 0); vor.set(schl(v, -1), null); offen.push([0, v, -1]); }
  while (offen.length) {
    offen.sort((a, b) => a[0] - b[0]);
    const [d, a, v] = offen.shift();
    if (d > kosten.get(schl(a, v))) continue;
    if (nach.includes(a)) { const w = []; let x = schl(a, v); while (x) { w.unshift(Number(x.split("|")[0])); x = vor.get(x); } return w; }
    for (const b of MIT_ZYKLEN[a]) {
      if (v >= 0 && knoten[a].art === "werk" && knoten[v].art === "strophe" && knoten[b].art === "strophe") continue;
      if (v >= 0 && knoten[a].art === "name" && knoten[v].art === "werk" && knoten[b].art === "werk" && knoten[v].titel === knoten[b].titel) continue;
      if (b === v) continue;
      const z = schl(b, a), nd = d + (knoten[a].art === "zyklus" || knoten[b].art === "zyklus" ? 2 : 1);
      if (!kosten.has(z) || nd < kosten.get(z)) { kosten.set(z, nd); vor.set(z, schl(a, v)); offen.push([nd, b, a]); }
    }
  }
  throw new Error(`reise: kein Weg ohne dasselbe Werk von ${von.map((i) => knoten[i].titel)} nach ${nach.map((i) => knoten[i].titel)}`);
};
const suche_ = (von, nach, NACHBARN, gleichesWerk) => {
  // Zustand: Knoten und ob der Schritt davor von einer Strophe kam (nur für ein Werk von Belang)
  const schl = (i, ausStrophe) => `${i}|${ausStrophe ? 1 : 0}`;
  const vor = new Map(von.map((v) => [schl(v, false), null])), schlange = von.map((v) => [v, false]);
  while (schlange.length) {
    const [a, ausStrophe] = schlange.shift();
    if (nach.includes(a)) { const w = [a]; let x = schl(a, ausStrophe); while (vor.get(x)) { x = vor.get(x); w.unshift(Number(x.split("|")[0])); } return w; }
    for (const b of NACHBARN[a]) {
      if (!gleichesWerk && knoten[a].art === "werk" && ausStrophe && knoten[b].art === "strophe") continue;
      const z = schl(b, knoten[a].art === "strophe");
      if (!vor.has(z)) { vor.set(z, schl(a, ausStrophe)); schlange.push([b, knoten[a].art === "strophe"]); }
    }
  }
  throw new Error(`reise: kein Weg von ${von.map((i) => knoten[i].titel)} nach ${nach.map((i) => knoten[i].titel)}`);
};
/** wie die Spur weitergeht, in Worten: die Namen und Strophen dazwischen; ein Werk zwischen zwei Strophen heisst «dasselbe Werk» */
const ueberVon = (w) => {
  const teile = [];
  for (let n = 1; n < w.length - 1; n++) {
    const k = knoten[w[n]];
    if (k.art === "name") teile.push(k.titel);
    else if (k.art === "strophe") teile.push(`${k.nummer} ${k.titel}`);
    else if (k.art === "zyklus") teile.push(`Zyklus ${k.titel}`);
    else if (k.art === "werk" && knoten[w[n - 1]].art === "strophe" && knoten[w[n + 1]].art === "strophe") teile.push(`${k.von} · dasselbe Werk`);
  }
  return teile.length ? `über ${[...new Set(teile)].join(" · ")}` : null;
};
const ersterSatz = (t) => t.split(/(?<=[.!?])\s+/)[0];
/** baut eine Spur aus Stationen: { strophe: n } oder { orna: [Künstler:in, Theoretiker:in] } */
const spurAus = (stationen, gleichesWerk = true) => {
  const spur = [];
  for (const st of stationen) {
    const vorher = spur.length ? spur[spur.length - 1].ziel : null;
    if (st.strophe) {
      const weg = vorher ? suche(vorher, [S(st.strophe)], gleichesWerk) : [S(st.strophe)];
      spur.push(stropheStation(st.strophe, weg, vorher ? ueberVon(weg) : null));
    } else {
      const [kunst, theorie] = st.orna, ziele = [N(kunst), N(theorie)];
      let weg = vorher ? suche(vorher, ziele, gleichesWerk) : [ziele[0]];
      const andere = ziele.find((z) => z !== weg[weg.length - 1]);
      weg = [...weg, andere];
      const station = ornaStation(kunst, theorie, null, weg, vorher ? ueberVon(weg.slice(0, -1).concat([weg[weg.length - 2]])) : null);
      station.praxis = ersterSatz(K(kunst, theorie).text);
      spur.push(station);
    }
  }
  return spur;
};
export const AUFTRAEGE = {
  // 1. Suchauftrag (29. Oktober 2026): «Vom Profil zum Feed zur Plattform (aber gerne mit Umwegen über ganz andere Zettel wie Ereignis, Person und Archiv)
  // plus eben: ORNA Begegnungen, Verweise auf Werke und Praxen. Weibliche Adressen mindestens 50%» – die Paare von ORNA sind darum Künstlerin × Theoretikerin
  profil: {
    titel: "Vom Profil zum Feed zur Plattform", umweg: "mit Umwegen über Ereignis, Person und Archiv",
    ziele: [36, 41, 42], umwege: [2, 17, 13],
    stationen: [
      { strophe: 36 }, { orna: ["Hanne Darboven", "Elena Esposito"] }, { strophe: 2 }, { strophe: 17 }, { orna: ["Louise Bourgeois", "Judith Butler"] },
      { strophe: 13 }, { strophe: 41 }, { orna: ["Marina Abramović", "Wendy Hui Kyong Chun"] }, { strophe: 42 },
    ],
  },
  // 2. Suchauftrag (29. Oktober 2026): «vom Körper zum Blinden Fleck zum Material zur Kunst. Begegnungen möglichst breit, ORNA frei entscheiden …
  // nicht über "gleiches Werk" verbinden, mind. 50% weiblich». Die Paare reichen vom unsicher gewordenen Vertrauten (Hatoum × Star) über Linie und Grenze
  // (Martin × Spencer-Brown) und Form und Material (Hesse × Barad) bis zur gemeinsamen Erinnerung (Salcedo × Arendt).
  koerper: {
    titel: "Vom Körper zum blinden Fleck zum Material zur Kunst", umweg: "mit Begegnungen quer durch ORNA, ohne Abkürzung über dasselbe Werk",
    ziele: [25, 5, 29, 35], umwege: [], gleichesWerk: false,
    stationen: [
      { strophe: 25 }, { orna: ["Mona Hatoum", "Susan Leigh Star"] }, { strophe: 5 }, { orna: ["Agnes Martin", "George Spencer-Brown"] },
      { orna: ["Eva Hesse", "Karen Barad"] }, { strophe: 29 }, { orna: ["Doris Salcedo", "Hannah Arendt"] }, { strophe: 35 },
    ],
  },
};
// die Adressen einer Spur (die Namen der Verweise und der Paare): für «weibliche Adressen mindestens 50%» geprüft; jeder Name muss hier eingeordnet sein
const FRAUEN = new Set(["Elena Esposito", "Sophie Calle", "Barbara Adam", "Virginia Woolf", "Cornelia Bohn", "Judith Butler", "Aleida Assmann", "Anne Carson", "José van Dijck",
  "Jenny Offill", "Luciana Parisi", "Jennifer Egan", "Hanne Darboven", "Louise Bourgeois", "Marina Abramović", "Wendy Hui Kyong Chun",
  "Annemarie Mol", "Ana Mendieta", "Clarice Lispector", "Jane Bennett", "Nathalie Heinich", "Hito Steyerl", "Mona Hatoum", "Susan Leigh Star", "Agnes Martin",
  "Eva Hesse", "Karen Barad", "Doris Salcedo", "Hannah Arendt"]);
const MAENNER = new Set(["Gilles Deleuze", "Jorge Luis Borges", "Alfred North Whitehead", "On Kawara", "Christian Boltanski", "Franz Kafka", "Michel Foucault", "Walid Raad",
  "Byung-Chul Han", "Christian Marclay", "David Beer", "Rafael Lozano-Hemmer", "Maurice Merleau-Ponty", "George Spencer-Brown", "René Magritte",
  "Richard Serra", "Francis Ponge", "Jacques Rancière", "Michel Houellebecq"]);
const adressen = (spur) => [...new Set(spur.flatMap((s) => (s.art === "orna" ? s.ziel.map((i) => knoten[i].titel) : s.verweise.map((v) => v.name))))];
const spuren = { reise: spurReise, ...Object.fromEntries(Object.entries(AUFTRAEGE).map(([k, a]) => [k, spurAus(a.stationen, a.gleichesWerk ?? true)])) };
for (const [k, a] of Object.entries(AUFTRAEGE)) {
  const namen = adressen(spuren[k]), unbekannt = namen.filter((n) => !FRAUEN.has(n) && !MAENNER.has(n));
  if (unbekannt.length) throw new Error(`reise ${k}: nicht eingeordnet: ${unbekannt.join(", ")}`);
  a.frauen = namen.filter((n) => FRAUEN.has(n)).length; a.namen = namen.length;
  if (a.frauen * 2 < a.namen) throw new Error(`reise ${k}: nur ${a.frauen} von ${a.namen} Adressen weiblich`);
}
// jeder Schritt eines Wegs muss eine Kante sein
for (const spur of Object.values(spuren)) for (const st of spur) for (let j = 1; j < st.weg.length; j++) {
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
  spur: spurReise, spuren,
  auftraege: Object.fromEntries(Object.entries(AUFTRAEGE).map(([k, a]) => [k, { titel: a.titel, umweg: a.umweg, frauen: a.frauen, namen: a.namen,
    ziele: a.ziele.map((n) => ({ nummer: n, titel: zsz.stanzas.find((x) => x.number === n).title })), umwege: a.umwege.map((n) => ({ nummer: n, titel: zsz.stanzas.find((x) => x.number === n).title })) }])),
}));
console.log(`reise: ${knoten.length} Knoten, ${liste.length} Kanten, ${zaehle.beide} Namen in beiden, ${Object.entries(spuren).map(([k, v]) => `${k} ${v.length}`).join(", ")} Stationen`);
