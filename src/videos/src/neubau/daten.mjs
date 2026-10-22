// Daten des Videos «neubau»: liest Farben, Texte, Zeichen und Fäden unverändert aus dem Neubau der Website (/b/).
// Erzeugt src/neubau/data/neubau.json – nicht von Hand bearbeiten, nicht eingecheckt. Läuft mit «npm run vorbereiten».
import { ANGEBOTE, APPS, RASTER, SEITE } from "../../../../src/b/inhalt.mjs";
import { UI } from "../../../../src/b/ui.mjs";
import { ZEICHEN } from "../../../../src/b/zeichen.mjs";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";

const hier = (p) => new URL(p, import.meta.url);
const datei = (p) => readFileSync(hier(`../../../../${p}`), "utf8");
const T = UI.de;

/** das Innere eines Zeichens (ohne <svg>), damit das Video es in eigener Grösse und Strichstärke zeichnet */
function zeichen(name) {
  const m = ZEICHEN[name]?.match(/<svg[^>]*>([\s\S]*)<\/svg>/);
  if (!m) throw new Error(`neubau: Zeichen «${name}» fehlt`);
  return m[1].replace(/ vector-effect="non-scaling-stroke"/g, "");
}

// Farben des hellen Modus aus b.css (:root, vor dem dunklen Modus)
const css = datei("b/b.css");
const root = css.slice(css.indexOf(":root"), css.indexOf("@media (prefers-color-scheme: dark)"));
const farbe = (n) => {
  const m = root.match(new RegExp(`--${n}:\\s*([^;]+);`));
  if (!m) throw new Error(`neubau: Farbe --${n} fehlt in b/b.css`);
  return m[1].trim();
};

// Die Fäden des Felds auf der Startseite (Paare von Zetteln, die dieselben Personen nennen), wie sie b.js zeichnet
const start = datei("b/index.html");
const faeden = JSON.parse(start.match(/class="feld-rahmen" data-faeden="([^"]+)"/)[1].replace(/&quot;/g, '"'));

// Der erste Zettel, wie ihn die Startseite zeigt
const zsz = JSON.parse(datei("zu-seiner-zeit/zsz-daten.json"));
const z1 = zsz.stanzas.find((s) => s.id === 1);
for (const t of [SEITE.titel, z1.title, z1.bottomLine]) if (!start.includes(t)) throw new Error(`neubau: «${t}» steht nicht auf der Startseite`);

/** der erste Satz eines Texts, unverändert */
const ersterSatz = (s) => {
  const m = s.match(/^[^.!?]+[.!?]/);
  if (!m || !s.startsWith(m[0])) throw new Error("neubau: kein erster Satz");
  return m[0];
};

mkdirSync(hier("data/"), { recursive: true });
writeFileSync(hier("data/neubau.json"), JSON.stringify({
  farben: { papier: farbe("papier"), tinte: farbe("tinte"), grau: farbe("grau"), linie: farbe("linie"), flaeche: farbe("flaeche"), faden: farbe("faden"), fadenHell: farbe("faden-hell") },
  name: SEITE.name,
  claim: SEITE.claim,
  nav: Object.values(T.nav),
  einstieg: { titel: SEITE.titel, lead: ersterSatz(SEITE.lead) },
  angebote: ANGEBOTE.map((a) => ({ name: a.name, kurz: a.kurz, zeichen: zeichen(a.slug) })),
  // auf der Startseite ein Absatz: «Theorie, die man anfassen kann. Diese Seite ist das Beispiel: …»
  satz: { kurz: SEITE.claimAlt, lang: T.start.satz },
  kasten: {
    titel: T.start.kasten, text: T.start.kastenText, zeichen: zeichen("zettel"), faeden,
    zettel: { kenn: T.zettelN(z1.id), titel: z1.title, leitsatz: z1.bottomLine },
  },
  raster: { titel: T.start.raster, text: ersterSatz(T.start.rasterText), zeichen: zeichen("raster"), liste: RASTER.map((r) => ({ name: r.name, kurz: r.kurz, stand: r.stand, zeichen: zeichen(r.slug) })) },
  spielen: { titel: T.start.spielen, text: ersterSatz(T.start.spielenText), zeichen: zeichen("spielen"), apps: APPS.map((a) => ({ name: a.name, kurz: a.kurz, zeichen: zeichen(a.zeichen) })) },
}));

console.log(`neubau: ${ANGEBOTE.length} Leistungen, ${faeden.length} Fäden, ${RASTER.length} Prüfraster, ${APPS.length} Apps`);
