# Zu seiner Zeit – Hypertext

Plateaus zu Operation, Kunst, Gesellschaft und künstlicher Kommunikation: 49 Strophen in sieben Zyklen
(I Operation · II Rekursion · III Adresse · IV Koppelung · V Kunst · VI Plattform · VII Zukunft).
Veröffentlicht unter `https://ornament.cloud/zu-seiner-zeit/`, im Portfolio verlinkt, in der Sitemap.

## Daten

- `src/data/zu-seiner-zeit.json` – **Single Source of Truth**. Texte, Titel, Bottom-Lines und Verweise werden
  wörtlich übernommen und nie automatisch umgeschrieben. Eine neue Fassung ersetzt die Datei als Ganzes.
  Stand: Redaktionsfassung vom 29. September 2026 (21 Haupttexte mit Leitsätzen, Untertitel Zyklus II, 19 Verweise
  in 15 Strophen aus `Zu_seiner_Zeit_49_Strophen_Redaktion_2026-09-29.md`; alles Übrige aus der Arbeitsfassung vom 28. September).
  Die Rubrik je Verweis steht in `domain`; der Personenindex bildet seine Gruppen daraus (z. B. «Kybernetik» in Strophe 4).
- `src/data/zu-seiner-zeit.extra.json` – Ergänzungen, die in der Hauptdatei fehlen. Nur eintragen, was belegt ist:

  ```json
  {
    "strophen": { "37": { "related": [36, 41], "tags": ["kontingenz"] } },
    "personen": { "hito-steyerl": { "url": "https://…", "tags": [] } },
    "begriffe": [ { "slug": "kontingenz", "name": "Kontingenz", "stanzas": [38, 45] } ]
  }
  ```

  `related` = begrifflich verwandte Strophen (Art B), `url` = externer Link einer Person (nur https),
  `begriffe` = Begriffsseiten unter `begriff/<slug>/`. Ohne Eintrag bleibt alles leer; auf der Website erscheint
  dann nichts (keine Platzhalter). Der Build bricht bei unbekannten Nummern, Personen oder unsicheren Links ab.

## Übersetzungen (seit 3. Oktober 2026)

- `src/data/zu-seiner-zeit.en.json` (Englisch) und `src/data/zu-seiner-zeit.es.json` (Spanisch): je Strophe Titel, Leitsatz,
  Haupttext und die vier Notizen zu den Verweisen (`notes`), dazu Untertitel, Aufbau, Fassung, Zyklen (Name, Untertitel) und die
  Rubriken (`domains`). Namen und Werktitel bleiben wie im Original; nur beschreibende Werkangaben («Arbeiten zu …») sind unter `works`
  übersetzt. Der Titel «Zu seiner Zeit» bleibt in allen Sprachen.
- Seiten unter `zu-seiner-zeit/en/` und `zu-seiner-zeit/es/` mit denselben Adressen wie die deutsche Fassung (die Adressen kommen immer
  aus dem deutschen Titel). Oben im Kopf jeder Seite der Sprachwechsel «Deutsch · English · Español» auf dieselbe Seite; `hreflang` und
  Sitemap für alle drei Sprachen. Texte der Oberfläche: `UI` in `tools/build-zu-seiner-zeit.ts`, im Browser `TEXTE` in `zsz.js`.
- Ändert sich der deutsche Text, müssen die Übersetzungen nachgeführt werden (der Build prüft nur Vollständigkeit, nicht Inhalt).

## Abgeleitetes Datenmodell (tools/build-zu-seiner-zeit.ts, `model()`)

- Strophe: `id`, `slug` (`37-die-information`), `cycle`, `cycleTitle`, `title`, `bottomLine`, `text`, `status`,
  `references`, `related` (`sequence` = A, `conceptual` = B aus extra, `resonances` = C über dieselbe Person),
  `tags` (aus extra)
- Verweis: `discipline`, `person`, `work`, `note` (= resonance), `url` (aus extra, sonst `null`), `slug` (Person),
  `internalLinks` (andere Strophen mit derselben Person, `sameWork` wenn dasselbe Werk), `tags`
- Person und Werk werden aus «Person, Werk» beim ersten Komma getrennt (Werktitel dürfen Kommas enthalten).

## Seiten (erzeugt, nie von Hand bearbeiten)

`node --experimental-strip-types tools/build-zu-seiner-zeit.ts` schreibt nach `zu-seiner-zeit/`:
Startseite (7 Zyklen mit Nummer, Titel, Bottom-Line), `strophe/<slug>/` (49), `verweis/` und `verweis/<person>/`,
`begriff/<slug>/` (sobald Begriffe eingetragen sind), `spur/` (`?s=37` oder `?p=<person>`), `zufall/` (`?von=37`,
`noindex`), `zsz-daten.json` für Spur und Zufall – und den Block `ZSZ:START … ZSZ:END` in `sitemap.xml`.
Von Hand gepflegt: `zu-seiner-zeit/zsz.css` (Gestaltung) und `zu-seiner-zeit/zsz.js` (Seitenpanel, Spur, Zufall).
Vorschaubild zum Teilen (Facebook, X; 1200 × 630, auf allen Seiten eingebunden, Beschreibung = Bottom-Line bzw.
Untertitel): `NODE_PATH=$(npm root -g) node tools/zsz-og.mjs` → `zu-seiner-zeit/og-zu-seiner-zeit.png`.
Nach jeder Änderung an Daten, CSS oder JS den Build laufen lassen; ein Test meldet veraltete Seiten.

## Verhalten

- Strophe: Meta (Zyklus · Nummer / 49), Titel, **direkt darunter die Bottom-Line**, Text, «Weiterdenken» mit den vier
  Verweisen (ab 900 px vier Spalten, sonst untereinander). Ein Klick auf einen Verweis öffnet das Seitenpanel mit
  eigener Adresse `#verweis-<person>` (Zurück schliesst es); ohne JavaScript führt der Link zur Verweisseite.
  Erst ein externer Link verlässt die Website.
- Spur: immer nur die Nachbarschaft eines Knotens (aktuell, vorher, danach, verwandt, Resonanzen); ein Klick macht
  einen Nachbarn zum Mittelpunkt (`history.pushState`, Zurück/Vor funktionieren).
- Zufall: gleichverteilt (kryptografischer Zufall, Verwerfen statt Modulo), nie unmittelbar die geöffnete Strophe;
  ersetzt den Verlaufseintrag, damit Zurück zur vorherigen Strophe führt.
- Keine Webschriften, keine Abhängigkeiten; `prefers-reduced-motion` und Dunkelmodus werden respektiert.

## Hinweise zur Arbeitsfassung (nicht auf der Website)

- Wortzahl ausserhalb der Zielgrösse 80–110: Nr. 3 (75), Nr. 25 (119).
- Status «redaktionelle Rekonstruktion»: Nr. 30 Die Form, Nr. 33 Das Publikum.
- Begrifflich verwandte Strophen (B), externe Links und Begriffe: noch nicht eingetragen.
