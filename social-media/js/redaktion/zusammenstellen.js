// Social Media – Redaktion: was ein Commit enthält (rein, ohne Netz; läuft im Browser und in den Tests).
// Aus den Daten, wie sie im Repository stehen, und einer Änderung (Zettel speichern oder löschen) werden: die neuen Daten, alle Seiten des Bereichs,
// die Sitemap und die Liste der Dateien, die wegfallen (Seiten gelöschter Zettel, Medien, auf die kein Zettel mehr verweist).
import { alleSeiten, sitemapEinsetzen, pruefen, datenText, BEREICH } from "../darstellung.js";

export const DATEN = `${BEREICH}daten/eintraege.json`;

/** alle Medienpfade (ab der Wurzel), auf die ein Zettel verweist */
export function medienVon(e) {
  return [e.beleg?.datei, e.autor?.avatar, e.karte?.datei, ...(e.medien ?? []).flatMap((m) => [m.datei, m.poster])].filter(Boolean).map((d) => BEREICH + d);
}

/**
 * aenderung: { art: "speichern", eintrag } oder { art: "loeschen", id }
 * vorhandene: Pfade, die im Repository unter social-media/ liegen (für das Aufräumen)
 * → { daten, schreiben: Map(Pfad → Text), loeschen: [Pfad], fehler: [Satz] }
 */
export function zusammenstellen({ daten: text, sitemap, aenderung, vorhandene = [] }) {
  const daten = JSON.parse(text);
  daten.eintraege ??= [];
  let betroffen = null;
  if (aenderung.art === "speichern") {
    const e = aenderung.eintrag;
    const i = daten.eintraege.findIndex((x) => x.id === e.id);
    betroffen = i >= 0 ? daten.eintraege[i] : null;
    if (i >= 0) daten.eintraege[i] = e; else daten.eintraege.push(e);
  } else if (aenderung.art === "loeschen") {
    const i = daten.eintraege.findIndex((x) => x.id === aenderung.id);
    if (i < 0) return { daten, schreiben: new Map(), loeschen: [], fehler: [`Den Zettel ${aenderung.id} gibt es nicht (mehr).`] };
    betroffen = daten.eintraege.splice(i, 1)[0];
    for (const x of daten.eintraege) if (x.verweise?.some((v) => v.id === betroffen.id)) x.verweise = x.verweise.filter((v) => v.id !== betroffen.id);
  }
  const fehler = daten.eintraege.flatMap((e) => pruefen(e, daten.eintraege).map((f) => `Zettel ${e.nr}: ${f}`));

  const schreiben = new Map([[DATEN, datenText(daten)], ["sitemap.xml", sitemapEinsetzen(sitemap, daten.eintraege)], ...alleSeiten(daten)]);

  // aufräumen: Seiten von Zetteln, die es nicht mehr gibt; Medien im Ordner des betroffenen Zettels, auf die keiner mehr verweist
  const ids = new Set(daten.eintraege.map((e) => e.id));
  const gebraucht = new Set(daten.eintraege.flatMap(medienVon));
  const loeschen = vorhandene.filter((p) => {
    if (schreiben.has(p)) return false;
    const seite = p.match(/^social-media\/(\d+-[a-z0-9-]+)\//);
    if (seite && !ids.has(seite[1])) return true;
    return betroffen && p.startsWith(`${BEREICH}medien/${betroffen.nr}/`) && !p.endsWith("/LIESMICH.md") && !gebraucht.has(p);
  });
  return { daten, schreiben, loeschen, fehler };
}
