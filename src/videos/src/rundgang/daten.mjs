// Daten des Rundgangs: liest Menü, Leads, Namen und einen Zettel unverändert aus der Website.
// Erzeugt src/rundgang/data/rundgang.json – nicht von Hand bearbeiten, nicht eingecheckt. Läuft mit «npm run vorbereiten».
import { MENU } from "../../../../kopfleiste.js";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";

const hier = (p) => new URL(p, import.meta.url);
const seite = (p) => readFileSync(hier(`../../../../${p}`), "utf8");

/** den ersten Treffer einer Gruppe; fehlt er, bricht das Skript ab (die Website hat sich geändert) */
function eins(html, re, was) {
  const m = html.match(re);
  if (!m) throw new Error(`rundgang: ${was} nicht gefunden`);
  return m[1].trim();
}
/** Entitäten, wie sie in den Seiten vorkommen */
const text = (s) => s.replace(/&amp;/g, "&").replace(/&nbsp;/g, " ");
const lead = (html, was) => text(eins(html, /<p class="lead">([^<]+)<\/p>/, `Lead ${was}`));

// Startseite: der Satz aus der Beschreibung
const start = text(eins(seite("index.html"), /<meta name="description" content="([^"]+)"/, "Beschreibung der Startseite"));

// Apps: Lead und die Gruppen (h2) mit ihren Karten (h3), in der Reihenfolge der Seite
const appsHtml = seite("apps/index.html");
const gruppen = [...appsHtml.matchAll(/<h2 id="gruppe-[^"]+">([^<]+)<\/h2>([\s\S]*?)(?=<h2 |<\/main>)/g)].map(([, name, teil]) => ({
  name: text(name),
  apps: [...teil.matchAll(/<h3>([^<]+)<\/h3>/g)].map((m) => text(m[1])),
}));
if (gruppen.length < 2 || gruppen.some((g) => g.apps.length === 0)) throw new Error("rundgang: Gruppen der Apps unvollständig");

// Masterprompts: Lead und die Titel der Prüfraster (h2 ohne id; der Rückkanal hat eine)
const promptsHtml = seite("masterprompts/index.html");
const raster = [...promptsHtml.matchAll(/<h2>([^<]+)<\/h2>/g)].map((m) => text(m[1]));

// Zettelkasten: Titel, Unterzeile aus der Beschreibung, Zählzeile, und der erste Zettel als Beispiel
const zszHtml = seite("zu-seiner-zeit/index.html");
const zsz = JSON.parse(seite("zu-seiner-zeit/zsz-daten.json"));
const z = zsz.stanzas.find((s) => s.id === 1);
const zettel = {
  zyklus: z.cycle, zyklusTitel: z.cycleTitle, nr: z.id, von: zsz.stanzas.length,
  titel: z.title, schluss: z.bottomLine,
  verweise: z.refs.map((r) => ({ name: zsz.persons[r.slug].name, fach: r.discipline })),
};
// Kennzeile wie auf der Seite des Zettels («I · Operation · 1 / 49»); geprüft gegen die Seite selbst
const kenn = `${zettel.zyklus} · ${zettel.zyklusTitel} · ${zettel.nr} / ${zettel.von}`;
if (!seite(`zu-seiner-zeit/strophe/${z.slug}/index.html`).includes(kenn)) throw new Error("rundgang: Kennzeile des Zettels weicht ab");

mkdirSync(hier("data/"), { recursive: true });
writeFileSync(hier("data/rundgang.json"), JSON.stringify({
  start,
  menu: MENU.map(([name, , symbol]) => ({ name, symbol })),
  apps: { lead: lead(appsHtml, "Apps"), gruppen },
  prompts: { titel: eins(promptsHtml, /<h1>([^<]+)<\/h1>/, "Titel Masterprompts"), lead: lead(promptsHtml, "Masterprompts"), raster },
  zettel: {
    titel: eins(zszHtml, /<h1 class="werk-titel">([^<]+)<\/h1>/, "Titel Zettelkasten"),
    unter: text(eins(zszHtml, /<meta name="description" content="([^"]+)"/, "Beschreibung Zettelkasten")),
    meta: text(eins(zszHtml, /class="zsz-meta">([^<]+)</, "Zählzeile Zettelkasten")),
    // die Zyklen in ihrer Reihenfolge, je mit der Zahl ihrer Zettel (für das Raster 7 × 7)
    zyklen: [...new Set(zsz.stanzas.map((s) => s.cycle))].map((c) => ({ zyklus: c, zahl: zsz.stanzas.filter((s) => s.cycle === c).length })),
    beispiel: { ...zettel, kenn },
  },
  social: { lead: lead(seite("social-media/index.html"), "Social Media") },
  art: { lead: lead(seite("art/index.html"), "Art") },
}));

console.log(`rundgang: ${MENU.length} Kästchen, ${gruppen.reduce((n, g) => n + g.apps.length, 0)} Apps, ${raster.length} Prüfraster, Zettel «${zettel.titel}»`);
