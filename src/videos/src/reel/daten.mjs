// Daten des Reels: liest Farben (hell und dunkel), den Dialog der Startseite und die Sätze unverändert aus dem Neubau (/b/)
// und legt die Beispielvideos der Apps nach public/reel/. Erzeugt src/reel/data/reel.json – nicht eingecheckt. Läuft mit «npm run vorbereiten».
// Die Bildschirmaufnahme der Seite macht aufnahme.mjs (einmal von Hand, braucht Playwright).
import { APPS, DIALOG, SEITE } from "../../../../src/b/inhalt.mjs";
import { UI } from "../../../../src/b/ui.mjs";
import { ZEICHEN } from "../../../../src/b/zeichen.mjs";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";

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
// Aufnahmen von Christian (22. und 23. Oktober 2026), nicht im Repository – von Hand nach public/reel/ legen:
// phorma-iii-lauf.mp4 (PHORMA III, Irrfahrt, 1080 × 1350, Export vom 21. Oktober 2026, 21:08), phorma-i-lauf.mp4 (PHORMA I, Ablauf «Verwandlung», 720 × 900),
// phorma-iii-traube.mp4 (PHORMA III, Traube, 1080 × 1350, Export vom 23. Oktober 2026, 08:37), phorma-ii-raster.mp4 (PHORMA II, Raster und Montage, 1080 × 1350, 08:44)
// sowie die Logo-Animationen phorma-ii-logo.mp4 (1080 × 1350, Export vom 21. Oktober 2026, 21:55) und phorma-iii-logo.mp4 (1920 × 1080, Export vom 19. Oktober 2026, 14:10)
for (const n of ["phorma-iii-lauf", "phorma-i-lauf", "phorma-iii-traube", "phorma-ii-raster", "phorma-iii-logo", "phorma-ii-logo"]) if (!existsSync(hier(`../../public/reel/${n}.mp4`))) throw new Error(`reel: public/reel/${n}.mp4 fehlt`);
const aufnahme = hier("../../public/reel/b-stellen.json");
if (!existsSync(aufnahme)) throw new Error("reel: keine Aufnahme der Seite – zuerst «NODE_PATH=$(npm root -g) node src/reel/aufnahme.mjs»");
const stellen = JSON.parse(readFileSync(aufnahme, "utf8"));

// Der Zettelkasten (statt der Prüfraster, Wunsch vom 23. Oktober 2026): das Feld 7 × 7 mit den Fäden der Startseite (Paare von Zetteln, die dieselben
// Personen nennen) und ein Zettel, der aufleuchtet – der mit dem kürzesten Leitsatz unter denen mit mindestens zwei Fäden, damit er im Reel lesbar ist
const start = readFileSync(wurzel("b/index.html"), "utf8");
const faeden = JSON.parse(start.match(/class="feld-rahmen" data-faeden="([^"]+)"/)[1].replace(/&quot;/g, '"'));
const zsz = JSON.parse(readFileSync(wurzel("zu-seiner-zeit/zsz-daten.json"), "utf8"));
const zahl = (n) => faeden.filter(([a, b]) => a === n || b === n).length;
const zettel = zsz.stanzas.filter((z) => zahl(z.id) >= 2).sort((a, b) => a.bottomLine.length - b.bottomLine.length)[0];
if (!start.includes(zettel.bottomLine)) throw new Error("reel: Leitsatz des Zettels steht nicht auf der Startseite");

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
  // Bilder aus PHORMA I, II und III (Wunsch vom 22. und 23. Oktober 2026: «Bessere Clips»): Name und Kurzsatz der Apps
  bild: { satz: wahl("bild").satz, ...Object.fromEntries([["a", "phorma-i"], ["b", "phorma-iii"], ["c", "phorma-ii"]].map(([k, slug]) => [k, { name: app(slug).name, text: app(slug).kurz, zeichen: zeichen(app(slug).zeichen) }])) },
  frage2: { satz: wahl("frage").satz, a: { ...weg("frage", 0), zeichen: zeichen(app("orna").zeichen) } },
  auftrag: { satz: wahl("auftrag").satz, a: { ...weg("auftrag", 0), zeichen: zeichen("webdesign") } },
  // «Ein Begriff will geprüft werden.» → die erste Station des Wegs: «Im Feld nachsehen: 49 Begriffe von der Brücke bis zur Zukunft»
  begriff: { satz: wahl("begriff").satz, a: { ...weg("begriff", 0), zeichen: zeichen("zettel") }, faeden,
    zettel: { nr: zettel.id, kenn: T.zettelN(zettel.id), titel: zettel.title, leitsatz: zettel.bottomLine } },
  gruppe: { satz: wahl("gruppe").satz, a: { ...weg("gruppe", 1), zeichen: zeichen(app("omna-color").zeichen) } },
  titel: SEITE.titel.replace(/\.$/, "").split(", "),
  ohne,
  swiss: "made in Switzerland",
  stellen,
}));
if (!SEITE.lead.includes("made in Switzerland")) throw new Error("reel: «made in Switzerland» fehlt im Lead");
console.log(`reel: ${DIALOG.wahlen.length} Wahlen, Farben hell und dunkel`);
