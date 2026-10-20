# ornament.cloud/b/ – Plan für Suchmaschinen und Teilen

Stand: 20. Oktober 2026. Zuerst der deutschsprachige Markt (Schweiz, dann Deutschland und Österreich), danach Englisch und Spanisch.

## 1. Was die Seite schon mitbringt

- Jede Seite hat Titel, Beschreibung (40–200 Zeichen), Canonical, Open Graph, X-Karte und JSON-LD (`WebSite`, `Person`, `CreativeWork`
  je Zettel und Raster, `SoftwareApplication` je App, `Service` je Angebot). `tests/b.test.mjs` prüft das.
- Alle Seiten ausser der Werkstatt stehen in `sitemap.xml` (Block `B:START/END`), die Werkstatt ist `noindex` und nirgends verlinkt.
- Kein Skript, keine Schrift, kein Bild von aussen; die Seite ist in unter einer Sekunde da. Das zählt bei Google als Core Web Vitals.
- Vorschaukarten 1200 × 630 für jede Seite, je Zettel zusätzlich eine quadratische Karte 1080 × 1080 zum Herunterladen.
- Besuche zählt GoatCounter ohne Cookies; dort sieht man Herkunft, Seiten und Suchbegriffe (soweit Browser sie mitgeben).

## 2. Suchabsichten und Seiten (Deutschschweiz zuerst)

| Suchabsicht | Beispiele für Suchbegriffe | Seite |
|---|---|---|
| Jemand sucht einen Webdesigner in der Region | Webdesign Aargau, Website erstellen lassen Zürcher Unterland, Webdesign Kaiserstuhl, Website für Künstler | `/b/angebot/websites/` |
| Jemand will eine App ohne App-Store | Web-App entwickeln lassen Schweiz, PWA erstellen, App für Museum | `/b/angebot/apps/` |
| Ein Haus sucht Kuration | Ausstellung kuratieren lassen, Kurator Aargau, Ausstellungskonzept | `/b/angebot/kuration/` |
| Jemand sucht Begleitung | Begleitung in Übergängen, Gespräche Kaiserstuhl, Supervision Kunst | `/b/angebot/begleitung/` |
| Ein Team sucht einen Workshop | Workshop Beobachten, Systemtheorie Seminar, Kreativ-Workshop Team Schweiz | `/b/angebot/seminare/` |
| Eine Schule sucht ein Projekt | Kunstpädagogik Projektwoche, Kunstvermittlung Schule Aargau | `/b/angebot/kunstpaedagogik/` |
| Jemand sucht Theorie | Luhmann Zettelkasten, Systemtheorie Kunst, Anschluss Luhmann, Kontingenz, Re-Entry | `/b/zettel/` und die 49 Zettel |
| Jemand sucht ein Prüfinstrument | Prüfraster journalistische Texte, Gesellschaftsdiagnose prüfen, Prompt Theorieanalyse | `/b/raster/` |
| Jemand sucht ein Spiel oder Werkzeug | Denkspiel zu zweit, Gestaltungsübungen Farbe, Foto in Video verwandeln | `/b/apps/` |

Die Zettel sind der grösste Hebel: 49 Seiten zu Begriffen, die gesucht werden (Die Adresse, Der Algorithmus, Die Plattform, Die
Kontingenz, Das Vergessen), mit eigenem Leitsatz als Beschreibung. Sie bringen Besuche aus der Theorie, die Fäden führen weiter zu
Apps und Angeboten.

## 3. Die ersten vier Wochen

1. `/b/` in der Google Search Console und bei Bing Webmaster anmelden (Property `ornament.cloud`), Sitemap `https://ornament.cloud/sitemap.xml`
   einreichen, die Startseite `/b/` und `/b/angebot/` von Hand zur Indexierung anstossen.
2. Google Unternehmensprofil für «Christian Strickler, Kaiserstuhl» anlegen (Kategorie Webdesigner, zweite Kategorie Kurator),
   Website `https://ornament.cloud/b/`. Das bringt die regionalen Suchen.
3. Die bisherige Startseite `/` verlinkt `/b/` sichtbar (ein Satz unter dem Hinweis), damit die Fäden zwischen alt und neu laufen.
   Später wird `/b/` die Startseite; dann 301-Weiterleitungen von `/b/...` auf die neuen Adressen (GitHub Pages: Meta-Refresh-Seiten).
4. Je Woche ein Zettel auf Social Media: Karte 1080 × 1080 aus `/b/kacheln/`, Leitsatz als Text, Link auf den Zettel.
   Die Beiträge landen im Social-Media-Zettelkasten und auf `/b/zuletzt/`.
5. Drei Links von aussen: Pro Kaiserstuhl (Supervisionen 2026), FARO Kunstraum, Netzwerk inklusive Kultur – je mit `https://ornament.cloud/b/`.

## 4. Was noch fehlt (Entscheide von Christian)

- Texte zu Therapie, Seminaren, Kuration und Kunstpädagogik: Ausbildung, Setting, Preise. Ohne sie bleibt der Hinweis «Angaben folgen».
- Ein Foto oder ein Porträt für `/b/ueber/` (Google zeigt Personen gern mit Bild).
- Kundenstimmen oder drei Referenzprojekte mit Namen für Websites und Apps.
- Termine wieder sichtbar machen (`termine/`): regelmässige Einträge sind ein Signal für Aktualität.

## 5. International (danach)

- Der Zettelkasten liegt schon auf Englisch und Spanisch (`src/data/zu-seiner-zeit.en.json`, `.es.json`). Schritt 1: `/b/en/zettel/`
  und `/b/es/zettel/` aus denselben Daten bauen (`tools/build-b.mjs` mit Sprache), `hreflang` in allen drei Richtungen setzen,
  `og:locale` je Sprache, Sitemap mit `xhtml:link`.
- Schritt 2: Angebote auf Englisch (Websites, Apps, Seminare: die drei, die ohne Ortsbindung gehen).
- Schritt 3: die Apps selbst sind sprachneutral; die App-Seiten unter `/b/en/apps/` sind kurz.
- Nicht übersetzen: Begleitung und Kunstpädagogik (ortsgebunden), Werkstatt.

## 6. Messen

- GoatCounter: Seiten unter `/b/` nach Besuchen und Herkunft; einmal im Monat anschauen, welcher Zettel am meisten bringt.
- Search Console: Suchanfragen, Klickrate, Position je Seite; Seiten mit vielen Einblendungen und wenig Klicks bekommen einen
  besseren Titel.
- Ziel für das erste Quartal: 20 Anfragen über das Briefing-Formular, 5 davon aus der Region.
