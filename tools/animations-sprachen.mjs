// Animationen auf Englisch und Spanisch (Wunsch vom 5. November 2026: «Bitte die seite Animations auch in Spanisch und englisch»):
// schreibt animations/en/index.html und animations/es/index.html aus der deutschen Seite animations/index.html. Die Texte stehen in
// animations/sprache.js (SEITE für die Seite, die übrigen für seite.js und motor.js); die Module bleiben dieselben, die Seiten laden ../seite.js.
// Nach jeder Änderung an animations/index.html oder animations/sprache.js neu laufen lassen:
//   node tools/animations-sprachen.mjs          (schreibt die Seiten)
//   node tools/animations-sprachen.mjs --pruefen (meldet nur, ob sie veraltet sind; tests/animations.test.mjs prüft dasselbe)
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";

const root = new URL("../", import.meta.url);
const { SEITE } = await import(new URL("animations/sprache.js", root).href);

const SPRACHEN = { en: { i: 1, locale: "en_GB" }, es: { i: 2, locale: "es_ES" } };
const NAMEN = { de: "Deutsch", en: "English", es: "Español" };

/** die Seite in einer Sprache aus dem deutschen Text */
export function seite(deutsch, sprache) {
  const { i, locale } = SPRACHEN[sprache];
  let s = deutsch;
  const ersetzen = (alt, neu, wo = alt) => {
    if (!s.includes(alt)) throw new Error(`${sprache}: «${wo}» steht nicht (mehr) in animations/index.html – animations/sprache.js (SEITE) nachführen`);
    s = s.split(alt).join(neu);
  };
  // Kommentare der deutschen Seite (Entstehung, Versionsmarke) gelten dort; hier steht, woher die Seite kommt
  s = s.replace(/<!--[\s\S]*?-->\n?/g, "");
  ersetzen('<html lang="de">', `<html lang="${sprache}">\n<!-- Erzeugt von tools/animations-sprachen.mjs aus animations/index.html und animations/sprache.js: dort ändern, nicht hier. -->`);
  // Adressen: eine Ebene tiefer
  ersetzen('href="../', 'href="../../');
  ersetzen('src="seite.js?v=', 'src="../seite.js?v=');
  ersetzen('content="https://ornament.cloud/animations/"', `content="https://ornament.cloud/animations/${sprache}/"`);
  ersetzen('content="de_CH"', `content="${locale}"`);
  // Sprachumschalter: die eigene Sprache ist aktuell
  const ziel = { de: "../", en: sprache === "en" ? "./" : "../en/", es: sprache === "es" ? "./" : "../es/" };
  const umschalter = s.match(/<nav class="sprachen"[^>]*>[\s\S]*?<\/nav>/)?.[0];
  if (!umschalter) throw new Error("Sprachumschalter (nav.sprachen) fehlt in animations/index.html");
  s = s.replace(umschalter, umschalter.replace(/<a href="[^"]*" hreflang="(de|en|es)"[^>]*>/g,
    (_, l) => `<a href="${ziel[l]}" hreflang="${l}" lang="${l}"${l === sprache ? ' aria-current="true"' : ""} title="${NAMEN[l]}">`));
  // die Texte, die längsten zuerst (kürzere stecken manchmal in längeren)
  for (const zeile of [...SEITE].sort((a, b) => b[0].length - a[0].length)) ersetzen(zeile[0], zeile[i], zeile[0].slice(0, 60));
  return s;
}

const deutsch = readFileSync(new URL("animations/index.html", root), "utf8");
const pruefen = process.argv.includes("--pruefen");
let veraltet = 0;
for (const sprache of Object.keys(SPRACHEN)) {
  const datei = new URL(`animations/${sprache}/index.html`, root), neu = seite(deutsch, sprache);
  let alt = "";
  try { alt = readFileSync(datei, "utf8"); } catch { /* noch nicht da */ }
  if (alt === neu) continue;
  veraltet++;
  if (pruefen) { console.log(`veraltet: animations/${sprache}/index.html`); continue; }
  mkdirSync(new URL(`animations/${sprache}/`, root), { recursive: true });
  writeFileSync(datei, neu);
  console.log(`geschrieben: animations/${sprache}/index.html`);
}
if (pruefen && veraltet) process.exit(1);
