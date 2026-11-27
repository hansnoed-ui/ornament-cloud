// Texte des Eigenzeit-Videos: liest die Sätze unverändert aus der Eigenzeit-Seite (alpha/formen/eigenzeit/) und prüft, dass sie dort so stehen.
// Erzeugt src/eigenzeit/data/eigenzeit.json – nicht von Hand bearbeiten, nicht eingecheckt. Läuft mit «npm run vorbereiten».
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";

const hier = (p) => new URL(p, import.meta.url);
const seite = readFileSync(hier("../../../../alpha/formen/eigenzeit/index.html"), "utf8");
const skript = readFileSync(hier("../../../../alpha/formen/eigenzeit/eigenzeit.js"), "utf8");

/** Text eines Absatzes mit der Klasse leise-text, der so beginnt */
function absatz(anfang) {
  const m = [...seite.matchAll(/<p class="leise-text"[^>]*>([^<]+)<\/p>/g)].map((x) => x[1]).find((t) => t.startsWith(anfang));
  if (!m) throw new Error(`Absatz «${anfang}» nicht auf der Eigenzeit-Seite`);
  return m;
}
/** die Sätze eines Texts, unverändert */
const saetze = (text) => text.match(/[^.!?]+[.!?]+(\s+|$)/g).map((s) => s.trim());
/** ein Zustandstext aus TEXTE in eigenzeit.js */
function zustand(name) {
  const m = skript.match(new RegExp(`${name}: '([^']+)'`));
  if (!m) throw new Error(`Zustandstext ${name} nicht in eigenzeit.js`);
  return m[1];
}
const pruefe = (text, quelle) => { if (!quelle.includes(text)) throw new Error(`«${text}» steht so nicht auf der Seite`); return text; };

const einleitung = saetze(absatz("Jeder Ring schreitet"));
const beobachter = saetze(absatz("Der Beobachter ist ein dritter Rhythmus"));
const leitsatz = seite.match(/<p class="leitsatz">([^<]+)<\/p>/)[1];   // «Eigenzeit · Wiederkehr ohne Rückkehr»

mkdirSync(hier("data/"), { recursive: true });
writeFileSync(hier("data/eigenzeit.json"), JSON.stringify({
  rhythmus: pruefe(einleitung[0], seite),          // «Jeder Ring schreitet in seinem eigenen Rhythmus, Operation für Operation.»
  uhr: pruefe(einleitung[1], seite),               // «Es gibt keine gemeinsame Uhr.»
  gekoppelt: zustand("gekoppelt"),
  aufgegangen: zustand("aufgegangen"),
  beobachter: pruefe(beobachter[0], seite),        // erster Satz, im Video mit «[…]»
  wiederkehr: pruefe(leitsatz.split(" · ")[1], seite),
}, null, 2));
