// Daten des Reels: liest Farben (hell und dunkel), den Dialog der Startseite und die Sätze unverändert aus dem Neubau (/b/)
// und legt die Beispielvideos der Apps nach public/reel/. Erzeugt src/reel/data/reel.json – nicht eingecheckt. Läuft mit «npm run vorbereiten».
// Die Bildschirmaufnahme der Seite macht aufnahme.mjs (einmal von Hand, braucht Playwright).
import { ANGEBOTE, APPS, DIALOG, SEITE } from "../../../../src/b/inhalt.mjs";
import { artists } from "../../../../portfolio/nebeneinander-nacheinander/js/data/artists.js";
import { theorists } from "../../../../portfolio/nebeneinander-nacheinander/js/data/theorists.js";
import { constellations } from "../../../../portfolio/nebeneinander-nacheinander/js/data/constellations.js";
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

// Die Konstellation, auf der ORNA im Reel stehen bleibt (Wunsch vom 23. Oktober 2026: «ORNA könnte auch noch eine Konstellation zeigen»):
// Doris Salcedo × George Spencer-Brown – kurz genug fürs Reel, und Spencer-Brown ist der Re-entry im Signet. Frage unverändert aus den Daten von ORNA.
const konst = constellations.find((k) => k.artistId === "doris-salcedo" && k.theoristId === "george-spencer-brown");
if (!konst) throw new Error("reel: Konstellation Salcedo × Spencer-Brown fehlt");
const name = (liste, id) => liste.find((p) => p.id === id).name;

// Die Antworten und Sätze des Reels (Wunsch von Christian vom 23. Oktober 2026: «Damit es sprachlich passt zu ‹Was bringst du mit?›»):
// nicht mehr die Wahlen des Dialogs der Startseite, sondern fünf eigene, je mit einem Satz
const ANTWORTEN = {
  bild: { wort: "ein Bild", satz: "Ein Bild, das Bewegung sucht" },        // PHORMA I, PHORMA II
  klang: { wort: "einen Klang", satz: "Ein Klang, der sich sehen lässt" },  // PHORMA III
  frage: { wort: "eine Frage", satz: "Eine Frage, die ein Gegenüber sucht" }, // ORNA
  idee: { wort: "eine Idee", satz: "Eine Idee, die in die Welt kommt" },    // die Angebote
  begriff: { wort: "einen Begriff", satz: "Ein Begriff, der Verbindung sucht" }, // der Zettelkasten
};
const appZeile = (slug) => ({ name: app(slug).name, text: app(slug).kurz, zeichen: zeichen(app(slug).zeichen) });

// «Diese Seite lädt nichts von aussen: keine Cookies, keine Werbung, keine Tracker.» → die drei Glieder nach dem Doppelpunkt
const ohne = T.fuss.ohne.slice(T.fuss.ohne.indexOf(": ") + 2).replace(/\.$/, "").split(", ");
if (ohne.length !== 3) throw new Error("reel: Satz «ohne» hat sich geändert");

mkdirSync(hier("data/"), { recursive: true });
writeFileSync(hier("data/reel.json"), JSON.stringify({
  hell, dunkel,
  name: SEITE.name,
  frage: DIALOG.frage,
  woerter: Object.values(ANTWORTEN).map((a) => a.wort),
  bild: { satz: ANTWORTEN.bild.satz, a: appZeile("phorma-i"), c: appZeile("phorma-ii") },
  klang: { satz: ANTWORTEN.klang.satz, b: appZeile("phorma-iii") },
  frage2: { satz: ANTWORTEN.frage.satz, a: { ...weg("frage", 0), zeichen: zeichen(app("orna").zeichen) },
    konstellation: { kuenstler: name(artists, konst.artistId), theoretiker: name(theorists, konst.theoristId), frage: konst.question } },
  // die vier Leistungen, wie sie die Navigation der Seite nennt («Angebot»)
  idee: { satz: ANTWORTEN.idee.satz, a: { name: T.nav["angebot/"], text: ANGEBOTE.map((x) => x.name).join(" · "), zeichen: zeichen("angebot") } },
  // die erste Station des Wegs «einen Begriff» auf der Startseite: «Im Feld nachsehen: 49 Begriffe von der Brücke bis zur Zukunft»
  begriff: { satz: ANTWORTEN.begriff.satz, a: { ...weg("begriff", 0), zeichen: zeichen("zettel") }, faeden,
    zettel: { nr: zettel.id, kenn: T.zettelN(zettel.id), titel: zettel.title, leitsatz: zettel.bottomLine } },
  titel: SEITE.titel.replace(/\.$/, "").split(", "),
  ohne,
  swiss: "made in Switzerland",
  stellen,
}));
if (!SEITE.lead.includes("made in Switzerland")) throw new Error("reel: «made in Switzerland» fehlt im Lead");
console.log(`reel: ${DIALOG.wahlen.length} Wahlen, Farben hell und dunkel`);
