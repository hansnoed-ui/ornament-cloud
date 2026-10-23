// Daten des Reels auf Deutsch und Englisch: liest Farben (hell und dunkel), Frage, Titel und Sätze unverändert aus dem Neubau (/b/ und /b/en/).
// Erzeugt src/reel/data/reel.json und reel-en.json – nicht eingecheckt. Läuft mit «npm run vorbereiten».
// Die Bildschirmaufnahmen der Seite macht aufnahme.mjs (einmal von Hand je Sprache, braucht Playwright).
import * as DE from "../../../../src/b/inhalt.mjs";
import * as EN from "../../../../src/b/inhalt.en.mjs";
import { ladeZettel } from "../../../../tools/b-daten.mjs";
import { constellationsEn } from "../../../../portfolio/nebeneinander-nacheinander/js/data/constellations.en.js";
import { artists } from "../../../../portfolio/nebeneinander-nacheinander/js/data/artists.js";
import { theorists } from "../../../../portfolio/nebeneinander-nacheinander/js/data/theorists.js";
import { constellations } from "../../../../portfolio/nebeneinander-nacheinander/js/data/constellations.js";
import { UI } from "../../../../src/b/ui.mjs";
import { ZEICHEN } from "../../../../src/b/zeichen.mjs";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";

const hier = (p) => new URL(p, import.meta.url);
const wurzel = (p) => new URL(`../../../../${p}`, import.meta.url);

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

// Beispielvideos der Apps (assets/beispiele/) nach public/reel/
mkdirSync(hier("../../public/reel/"), { recursive: true });
// Aufnahmen von Christian (22. und 23. Oktober 2026), nicht im Repository – von Hand nach public/reel/ legen:
// phorma-iii-lauf.mp4 (PHORMA III, Irrfahrt, 1080 × 1350, Export vom 21. Oktober 2026, 21:08), phorma-i-lauf.mp4 (PHORMA I, Ablauf «Verwandlung», 720 × 900),
// phorma-iii-traube.mp4 (PHORMA III, Traube, 1080 × 1350, Export vom 23. Oktober 2026, 08:37), phorma-ii-raster.mp4 (PHORMA II, Raster und Montage, 1080 × 1350, 08:44)
// sowie die Logo-Animationen phorma-ii-logo.mp4 (1080 × 1350, Export vom 21. Oktober 2026, 21:55) und phorma-iii-logo.mp4 (1920 × 1080, Export vom 19. Oktober 2026, 14:10)
for (const n of ["phorma-iii-lauf", "phorma-i-lauf", "phorma-iii-traube", "phorma-ii-raster", "phorma-iii-logo", "phorma-ii-logo"]) if (!existsSync(hier(`../../public/reel/${n}.mp4`))) throw new Error(`reel: public/reel/${n}.mp4 fehlt`);
/** die Aufnahme der Startseite im Telefon (aufnahme.mjs): Bild und Lage der Abschnitte */
function telefon(sprache) {
  const n = sprache === "de" ? "b-stellen" : `b-stellen-${sprache}`;
  const datei = hier(`../../public/reel/${n}.json`);
  if (!existsSync(datei)) throw new Error(`reel: keine Aufnahme der Seite (${sprache}) – zuerst «NODE_PATH=$(npm root -g) node src/reel/aufnahme.mjs ${sprache}»`);
  return { bild: `reel/${sprache === "de" ? "b-telefon" : `b-telefon-${sprache}`}.png`, stellen: JSON.parse(readFileSync(datei, "utf8")) };
}

// Der Zettelkasten (statt der Prüfraster, Wunsch vom 23. Oktober 2026): das Feld 7 × 7 mit den Fäden der Startseite (Paare von Zetteln, die dieselben
// Personen nennen) und ein Zettel, der aufleuchtet – der mit dem kürzesten Leitsatz unter denen mit mindestens zwei Fäden, damit er im Reel lesbar ist
const start = readFileSync(wurzel("b/index.html"), "utf8");
const faeden = JSON.parse(start.match(/class="feld-rahmen" data-faeden="([^"]+)"/)[1].replace(/&quot;/g, '"'));
const zsz = JSON.parse(readFileSync(wurzel("zu-seiner-zeit/zsz-daten.json"), "utf8"));
const zahl = (n) => faeden.filter(([a, b]) => a === n || b === n).length;
const zettel = zsz.stanzas.filter((z) => zahl(z.id) >= 2).sort((a, b) => a.bottomLine.length - b.bottomLine.length)[0];
if (!start.includes(zettel.bottomLine)) throw new Error("reel: Leitsatz des Zettels steht nicht auf der Startseite");
// derselbe Zettel auf Englisch (wie unter /b/en/)
const zettelEn = ladeZettel("en").find((z) => z.number === zettel.id);
if (!readFileSync(wurzel("b/en/index.html"), "utf8").includes(zettelEn.bottom_line)) throw new Error("reel: englischer Leitsatz steht nicht auf /b/en/");

// Die Konstellation, auf der ORNA im Reel stehen bleibt (Wunsch vom 23. Oktober 2026: «ORNA könnte auch noch eine Konstellation zeigen»):
// Doris Salcedo × George Spencer-Brown – kurz genug fürs Reel, und Spencer-Brown ist der Re-entry im Signet. Frage unverändert aus den Daten von ORNA.
const konst = constellations.find((k) => k.artistId === "doris-salcedo" && k.theoristId === "george-spencer-brown");
if (!konst) throw new Error("reel: Konstellation Salcedo × Spencer-Brown fehlt");
const name = (liste, id) => liste.find((p) => p.id === id).name;
const konstEn = constellationsEn[`${konst.artistId}__${konst.theoristId}`];
if (!konstEn?.question) throw new Error("reel: englische Frage der Konstellation fehlt");

// Die Antworten und Sätze des Reels (Wunsch von Christian vom 23. Oktober 2026: «Damit es sprachlich passt zu ‹Was bringst du mit?›»):
// nicht mehr die Wahlen des Dialogs der Startseite, sondern fünf eigene, je mit einem Satz. Geschützte Leerzeichen (\u00a0) halten zusammen,
// was nicht auf zwei Zeilen gehört: «ein Gegenüber», «die Welt» (Rückmeldung vom 23. Oktober 2026: «ein Gegenüber»)
// Englisch (23. Oktober 2026, Wunsch: «Bitte beide auch in englisch»): übersetzt von Claude, nahe an den deutschen Sätzen, je als Antwort auf «What do you bring along?»
const ANTWORTEN = {
  de: {
    bild: { wort: "ein Bild", satz: "Ein Bild, das Bewegung sucht" },        // PHORMA I, PHORMA II
    klang: { wort: "einen Klang", satz: "Einen Klang, der sich sehen lässt" },  // PHORMA III
    frage: { wort: "eine Frage", satz: "Eine Frage, die ein\u00a0Gegenüber sucht" }, // ORNA
    idee: { wort: "eine Idee", satz: "Eine Idee, die in die\u00a0Welt kommt" },    // die Angebote
    begriff: { wort: "einen Begriff", satz: "Einen Begriff, der Verbindung sucht" }, // der Zettelkasten
  },
  en: {
    bild: { wort: "an image", satz: "An image that seeks movement" },
    klang: { wort: "a sound", satz: "A sound you\u00a0can\u00a0see" },
    frage: { wort: "a question", satz: "A question that seeks a\u00a0counterpart" },
    idee: { wort: "an idea", satz: "An idea that comes into the\u00a0world" },
    begriff: { wort: "a concept", satz: "A concept that seeks connection" },
  },
};

/** alle Texte des Reels in einer Sprache */
function bauen(sprache) {
  const Q = sprache === "de" ? DE : EN, T = UI[sprache], A = ANTWORTEN[sprache];
  const app = (slug) => Q.APPS.find((a) => a.slug === slug);
  const appZeile = (slug) => ({ name: app(slug).name, text: app(slug).kurz, zeichen: zeichen(app(slug).zeichen) });
  const wahl = (id) => Q.DIALOG.wahlen.find((x) => x.id === id) ?? (() => { throw new Error(`reel: Wahl «${id}» fehlt`); })();
  /** ein Eintrag des Wegs («Name: Beschreibung»), geteilt am ersten Doppelpunkt */
  const weg = (id, k) => { const s = wahl(id).weg[k][1], n = s.indexOf(": "); return n < 0 ? { name: s, text: "" } : { name: s.slice(0, n), text: s.slice(n + 2) }; };
  // «Diese Seite lädt nichts von aussen: keine Cookies, keine Werbung, keine Tracker.» → die drei Glieder nach dem Doppelpunkt
  const ohne = T.fuss.ohne.slice(T.fuss.ohne.indexOf(": ") + 2).replace(/\.$/, "").split(", ");
  if (ohne.length !== 3) throw new Error("reel: Satz «ohne» hat sich geändert");
  if (!Q.SEITE.lead.includes("made in Switzerland")) throw new Error("reel: «made in Switzerland» fehlt im Lead");
  const z = sprache === "de" ? { titel: zettel.title, leitsatz: zettel.bottomLine } : { titel: zettelEn.title, leitsatz: zettelEn.bottom_line };
  return {
    sprache, hell, dunkel,
    name: Q.SEITE.name,
    frage: Q.DIALOG.frage,
    woerter: Object.values(A).map((a) => a.wort),
    bild: { satz: A.bild.satz, a: appZeile("phorma-i"), c: appZeile("phorma-ii") },
    klang: { satz: A.klang.satz, b: appZeile("phorma-iii") },
    frage2: { satz: A.frage.satz, a: { ...weg("frage", 0), zeichen: zeichen(app("orna").zeichen) },
      konstellation: { kuenstler: name(artists, konst.artistId), theoretiker: name(theorists, konst.theoristId), frage: sprache === "de" ? konst.question : konstEn.question } },
    // die vier Leistungen, wie sie die Navigation der Seite nennt («Angebot», «Services»)
    idee: { satz: A.idee.satz, a: { name: T.nav["angebot/"], text: Q.ANGEBOTE.map((x) => x.name).join(" · "), zeichen: zeichen("angebot") } },
    // die erste Station des Wegs «einen Begriff» auf der Startseite: «Im Feld nachsehen: 49 Begriffe von der Brücke bis zur Zukunft»
    begriff: { satz: A.begriff.satz, a: { ...weg("begriff", 0), zeichen: zeichen("zettel") }, faeden,
      zettel: { nr: zettel.id, kenn: T.zettelN(zettel.id), ...z } },
    titel: Q.SEITE.titel.replace(/\.$/, "").split(", "),
    ohne,
    swiss: "made in Switzerland",
    telefon: telefon(sprache),
  };
}

mkdirSync(hier("data/"), { recursive: true });
writeFileSync(hier("data/reel.json"), JSON.stringify(bauen("de")));
writeFileSync(hier("data/reel-en.json"), JSON.stringify(bauen("en")));
console.log("reel: Deutsch und Englisch, Farben hell und dunkel");
