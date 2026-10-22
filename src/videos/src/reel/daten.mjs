// Daten des Reels: liest Farben (hell und dunkel), den Dialog der Startseite und die Sätze unverändert aus dem Neubau (/b/)
// und legt die Beispielvideos der Apps nach public/reel/. Erzeugt src/reel/data/reel.json – nicht eingecheckt. Läuft mit «npm run vorbereiten».
// Die Bildschirmaufnahme der Seite macht aufnahme.mjs (einmal von Hand, braucht Playwright).
import { APPS, DIALOG, SEITE } from "../../../../src/b/inhalt.mjs";
import { UI } from "../../../../src/b/ui.mjs";
import { ZEICHEN } from "../../../../src/b/zeichen.mjs";
import { copyFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";

const hier = (p) => new URL(p, import.meta.url);
const wurzel = (p) => new URL(`../../../../${p}`, import.meta.url);
const T = UI.de;

const zeichen = (name) => {
  const m = ZEICHEN[name]?.match(/<svg[^>]*>([\s\S]*)<\/svg>/);
  if (!m) throw new Error(`reel: Zeichen «${name}» fehlt`);
  return m[1].replace(/ vector-effect="non-scaling-stroke"/g, "");
};

// Farben aus b/b.css: :root (hell) und der Block für den dunklen Modus
const css = readFileSync(wurzel("b/b.css"), "utf8");
const i = css.indexOf("@media (prefers-color-scheme: dark)");
const block = (s) => Object.fromEntries([...s.matchAll(/--(papier|tinte|grau|linie|faden|faden-hell):\s*([^;]+);/g)].map(([, n, w]) => [n === "faden-hell" ? "fadenHell" : n, w.trim()]));
const hell = block(css.slice(css.indexOf(":root"), i)), dunkel = block(css.slice(i, css.indexOf("}", css.indexOf("}", i) + 1)));
for (const f of [hell, dunkel]) if (Object.keys(f).length !== 6) throw new Error("reel: Farben in b/b.css unvollständig");

const wahl = (id) => {
  const w = DIALOG.wahlen.find((x) => x.id === id);
  if (!w) throw new Error(`reel: Wahl «${id}» fehlt`);
  return w;
};
/** ein Eintrag des Wegs («Name: Beschreibung»), geteilt am ersten Doppelpunkt */
const weg = (id, k) => { const s = wahl(id).weg[k][1], n = s.indexOf(": "); return n < 0 ? { name: s, text: "" } : { name: s.slice(0, n), text: s.slice(n + 2) }; };
const app = (slug) => APPS.find((a) => a.slug === slug);

// Beispielvideos der Apps (assets/beispiele/) nach public/reel/
mkdirSync(hier("../../public/reel/"), { recursive: true });
for (const n of ["phorma-ii", "the-fictory"]) copyFileSync(wurzel(`assets/beispiele/${n}.mp4`), hier(`../../public/reel/${n}.mp4`));
const aufnahme = hier("../../public/reel/b-stellen.json");
if (!existsSync(aufnahme)) throw new Error("reel: keine Aufnahme der Seite – zuerst «NODE_PATH=$(npm root -g) node src/reel/aufnahme.mjs»");
const stellen = JSON.parse(readFileSync(aufnahme, "utf8"));

// «Diese Seite lädt nichts von aussen: keine Cookies, keine Werbung, keine Tracker.» → die drei Glieder nach dem Doppelpunkt
const ohne = T.fuss.ohne.slice(T.fuss.ohne.indexOf(": ") + 2).replace(/\.$/, "").split(", ");
if (ohne.length !== 3) throw new Error("reel: Satz «ohne» hat sich geändert");

mkdirSync(hier("data/"), { recursive: true });
writeFileSync(hier("data/reel.json"), JSON.stringify({
  hell, dunkel,
  name: SEITE.name,
  frage: DIALOG.frage,
  // ohne «ein Bild wird ein Werk» (Prints): das Reel zeigt keine Werke
  woerter: DIALOG.wahlen.map((w) => w.wort),
  bild: { satz: wahl("bild").satz, a: { ...weg("bild", 0), zeichen: zeichen(app("phorma-ii").zeichen) }, b: { ...weg("bild", 1), zeichen: zeichen(app("the-fictory").zeichen) } },
  frage2: { satz: wahl("frage").satz, a: { ...weg("frage", 0), zeichen: zeichen(app("orna").zeichen) } },
  auftrag: { satz: wahl("auftrag").satz, a: { ...weg("auftrag", 0), zeichen: zeichen("webdesign") } },
  begriff: { satz: wahl("begriff").satz, a: { ...weg("begriff", 1), zeichen: zeichen("raster") } },
  gruppe: { satz: wahl("gruppe").satz, a: { ...weg("gruppe", 1), zeichen: zeichen(app("omna-color").zeichen) } },
  titel: SEITE.titel.replace(/\.$/, "").split(", "),
  ohne,
  swiss: "made in Switzerland",
  stellen,
}));
if (!SEITE.lead.includes("made in Switzerland")) throw new Error("reel: «made in Switzerland» fehlt im Lead");
console.log(`reel: ${DIALOG.wahlen.length} Wahlen, Farben hell und dunkel`);
