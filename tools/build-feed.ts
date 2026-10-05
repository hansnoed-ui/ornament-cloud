// Erzeugt den RSS-Feed (feed.xml) aus den Beiträgen der Seite «News» (news/index.html).
// Die News-Seite bleibt die einzige Quelle: Wer dort einen Eintrag ergänzt, lässt danach
//
//   node --experimental-strip-types tools/build-feed.ts
//
// laufen; tests/feed.test.mjs meldet, wenn es vergessen ging.
//
// Gelesen wird je <details class="entry" id="…"> das Datum (<time datetime>), der Titel (<h2>),
// der Untertitel (.post-meta) und der Text (.post-body). Die id ist die unveränderliche Adresse
// des Eintrags: Sie steht im <guid> und als Sprungziel im Link. Wird eine id geändert, gilt der
// Eintrag in den Lesern als neu — Titel und Text dürfen dagegen jederzeit geändert werden.
//
// Reines Node ohne Abhängigkeiten (REGELN §11). Geparst wird mit Ausdrücken, weil die News-Seite
// von Hand nach einem festen Muster gepflegt wird; weicht sie davon ab, bricht das Skript mit
// einer Meldung ab, statt einen stillen halben Feed zu schreiben.
import { readFileSync, writeFileSync } from "node:fs";

const WURZEL = new URL("../", import.meta.url);
const SEITE = "https://ornament.cloud";
const TITEL = "Ornament Cloud";
const BESCHREIBUNG = "Neuigkeiten und Arbeitsstände.";
const SPRACHE = "de-ch";

const lies = (p: string) => readFileSync(new URL(p, WURZEL), "utf8");

type Eintrag = {
  id: string;
  datum: string;      // YYYY-MM-DD
  titel: string;
  untertitel: string;
  text: string;       // HTML des Beitragstexts
};

// Wandelt &, < und > in Entitäten (für Titel und andere reine Textfelder)
const zeichen = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

// Entfernt Tags und glättet Leerraum (für Titel und Untertitel aus dem HTML)
const nurText = (s: string) => s.replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim();

// Nimmt die Einrückung der Seite aus dem Beitragstext (im Feed steht er ohne die Spalten der News-Seite)
const glatt = (s: string) => s.split("\n").map((z) => z.trimEnd().replace(/^ {1,10}/, "")).join("\n").trim();

// Relative Links der News-Seite (../alpha/…) werden im Feed zu vollen Adressen:
// Leser zeigen den Text ausserhalb der Seite an, dort trägt ein relativer Link nicht.
const volleLinks = (s: string) =>
  s.replace(/(href|src)="\.\.\/([^"]*)"/g, (_, attr, rest) => `${attr}="${SEITE}/${rest}"`)
   .replace(/(href|src)="\/([^"]*)"/g, (_, attr, rest) => `${attr}="${SEITE}/${rest}"`);

// RFC 822, wie RSS es verlangt. Die News-Seite nennt nur den Tag; als Zeit nehmen wir 12:00 UTC,
// damit ein Eintrag in keiner Zeitzone auf den Vortag rutscht.
const TAGE = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONATE = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
function rfc822(datum: string): string {
  const d = new Date(`${datum}T12:00:00Z`);
  if (Number.isNaN(d.getTime())) throw new Error(`Unlesbares Datum: ${datum}`);
  const zwei = (n: number) => String(n).padStart(2, "0");
  return `${TAGE[d.getUTCDay()]}, ${zwei(d.getUTCDate())} ${MONATE[d.getUTCMonth()]} ${d.getUTCFullYear()} `
       + `${zwei(d.getUTCHours())}:${zwei(d.getUTCMinutes())}:${zwei(d.getUTCSeconds())} +0000`;
}

export function lesen(html: string): Eintrag[] {
  // Erst die HTML-Kommentare entfernen: Oben in news/index.html steht die Anleitung zum Anlegen
  // eines Eintrags, und darin kommt <details class="entry"> als Beispiel vor. Ohne diesen Schritt
  // läse das Skript die Anleitung als vierten Beitrag.
  html = html.replace(/<!--[\s\S]*?-->/g, "");
  const bloecke = [...html.matchAll(/<details class="entry"(?<attr>[^>]*)>(?<inhalt>[\s\S]*?)<\/details>/g)];
  if (!bloecke.length) throw new Error("news/index.html: kein Eintrag gefunden (<details class=\"entry\">).");

  const eintraege = bloecke.map((b, i) => {
    const attr = b.groups!.attr ?? "";
    const inhalt = b.groups!.inhalt ?? "";
    const nr = `Eintrag ${i + 1}`;

    const id = attr.match(/\bid="([^"]+)"/)?.[1];
    if (!id) throw new Error(`${nr}: keine id. Jeder Eintrag braucht <details class="entry" id="…">.`);

    const datum = inhalt.match(/<time datetime="(\d{4}-\d{2}-\d{2})"/)?.[1];
    if (!datum) throw new Error(`${nr} (${id}): kein <time datetime="JJJJ-MM-TT">.`);

    const titel = inhalt.match(/<h2[^>]*>([\s\S]*?)<\/h2>/)?.[1];
    if (!titel) throw new Error(`${nr} (${id}): kein <h2> mit Titel.`);

    const untertitel = inhalt.match(/<span class="post-meta"[^>]*>([\s\S]*?)<\/span>/)?.[1] ?? "";
    const text = inhalt.match(/<div class="post-body"[^>]*>([\s\S]*?)<\/div>/)?.[1];
    if (!text) throw new Error(`${nr} (${id}): kein <div class="post-body"> mit dem Text.`);

    return { id, datum, titel: nurText(titel), untertitel: nurText(untertitel), text: volleLinks(glatt(text)) };
  });

  const doppelt = eintraege.map((e) => e.id).filter((id, i, a) => a.indexOf(id) !== i);
  if (doppelt.length) throw new Error(`Doppelte id: ${[...new Set(doppelt)].join(", ")}. Jede id darf nur einmal vorkommen.`);

  // Neueste zuerst. Bei gleichem Tag bleibt die Reihenfolge der Seite erhalten.
  return eintraege;
}

// Achtung: In einem XML-Kommentar darf kein doppelter Bindestrich stehen. Der Aufruf des Skripts
// gehört deshalb nicht in den Kopf von feed.xml (die Option trägt zwei), sondern nur hierher.
export function feed(eintraege: Eintrag[], gebaut: Date): string {
  const items = eintraege.map((e) => {
    // Untertitel über den Text, wie auf der Seite — im Leser ist er sonst nicht sichtbar.
    const rumpf = e.untertitel ? `<p><em>${zeichen(e.untertitel)}</em></p>\n${e.text}` : e.text;
    return `    <item>
      <title>${zeichen(e.titel)}</title>
      <link>${SEITE}/news/#${e.id}</link>
      <guid isPermaLink="false">${SEITE}/news/#${e.id}</guid>
      <pubDate>${rfc822(e.datum)}</pubDate>
      <description><![CDATA[${rumpf}]]></description>
    </item>`;
  }).join("\n");

  return `<?xml version="1.0" encoding="utf-8"?>
<!-- Erzeugt aus news/index.html mit tools/build-feed.ts. Nicht von Hand ändern. -->
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>${TITEL}</title>
    <link>${SEITE}/news/</link>
    <atom:link href="${SEITE}/feed.xml" rel="self" type="application/rss+xml"/>
    <description>${BESCHREIBUNG}</description>
    <language>${SPRACHE}</language>
    <!-- Nur der Tag, nicht die Uhrzeit: So ist ein Neubau am selben Tag Zeichen für Zeichen dieselbe Datei und erzeugt keine leere Änderung in git. -->
    <lastBuildDate>${rfc822(gebaut.toISOString().slice(0, 10))}</lastBuildDate>
${items}
  </channel>
</rss>
`;
}

// Direkt aufgerufen: Feed schreiben. Von den Tests importiert: nur die Funktionen oben.
if (import.meta.url === `file://${process.argv[1]}`) {
  const eintraege = lesen(lies("news/index.html"));
  writeFileSync(new URL("feed.xml", WURZEL), feed(eintraege, new Date()), "utf8");
  console.log(`feed.xml geschrieben: ${eintraege.length} Einträge, neuester ${eintraege[0].datum} (${eintraege[0].id}).`);
}
