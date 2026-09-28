# Zu seiner Zeit – Hypertext

Plateaus zu Operation, Kunst, Gesellschaft und künstlicher Kommunikation: 49 Strophen in sieben Zyklen
(I Operation · II Rekursion · III Adresse · IV Koppelung · V Kunst · VI Plattform · VII Zukunft).
Veröffentlicht unter `https://ornament.cloud/zu-seiner-zeit/`, im Portfolio verlinkt, in der Sitemap.

## Daten

- `src/data/zu-seiner-zeit.json` – **Single Source of Truth**. Texte, Titel, Bottom-Lines und Verweise werden
  wörtlich übernommen und nie automatisch umgeschrieben. Eine neue Fassung ersetzt die Datei als Ganzes.
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

- Wortzahl ausserhalb der Zielgrösse 80–110: Nr. 3 (75), Nr. 4 (71), Nr. 25 (119).
- Status «redaktionelle Rekonstruktion»: Nr. 30 Die Form, Nr. 33 Das Publikum.
- Begrifflich verwandte Strophen (B), externe Links und Begriffe: noch nicht eingetragen.
