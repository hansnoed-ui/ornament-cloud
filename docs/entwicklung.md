# Entwicklung und Wartung

Befehle für Installation, Vorschau und Tests stehen in der [README](../README.md).
Die npm-Skripte verwenden die vorhandenen Erzeuger und den Node-Test-Runner.
Die Website selbst hat keine npm-Laufzeitabhängigkeiten. Videos werden unabhängig
unter `src/videos/` installiert und gerendert.

## Quellen und erzeugte Dateien

- **ORNA:** `src/doppelspalt/src/data/` ist die verbindliche Datenquelle. Texte und
  Fragen sind Teil des Werks und werden nicht beim Bauen umformuliert. Die aktuelle
  redaktionelle CSV steht in `src/doppelspalt/redaktion/manifest.json` unter
  `editorialFile`. Import: `node --experimental-strip-types tools/import-konstellationen.ts src/doppelspalt/redaktion/<datei>.csv`,
  danach `npm run build:orna`. Das aktualisiert Browser-Daten, Feldansicht sowie
  App-Seiten und Service Worker. Der Feld-Erzeuger schreibt nur zwischen
  `<!-- FELD:START -->` und `<!-- FELD:END -->`; Kopf und Einleitung sind Handarbeit.
- **ORMA:** Quellen in `src/orma/app/` und `src/orma/redaktion/pilot.json`.
  `build:orma` erzeugt die lokale Vorschau, `build:orma:alpha` die eingecheckte
  Alpha-Fassung. Beide lesen den ORNA-Bestand, schreiben aber nicht nach ORNA.
  Nach Änderungen am gemeinsamen Bestand auch ORMA prüfen; erforderliche
  ORMA-Build-Änderungen in einem eigenen Commit halten.
- **Zettelkasten:** `src/data/zu-seiner-zeit.json` bleibt als Original unverändert.
  Ergänzungen in `.extra.json`, Übersetzungen in `.en.json` und `.es.json`.
  Der Build erzeugt HTML, Suchdaten und den ZSZ-Block der Sitemap. CSS und JS unter
  `zu-seiner-zeit/` werden von Hand gepflegt.
- **Alpha-Texte:** Quellen unter `src/alpha/`, Zuordnung im `RASTER` des Erzeugers
  `tools/build-alpha-texte.ts`. Neue Fassung dort zuordnen und `build:alpha` ausführen.
  Downloads und Textseiten werden zusammen erzeugt.
- **Das Dritte Rad:** `build:drittes-rad` erzeugt `alpha/drittes-rad/daten.js` aus
  dem Zettelkasten und OMNA COLOR. Die Prüfungen erkennen veraltete Daten.
- **The Fictory:** Nach Änderungen an `alpha/the-fictory/index.html` mit
  `build:fictory` die installierbare Fassung unter `werkbank/`
  nachziehen. Die Werkbank nutzt `<base href="../">`; relative Links beziehen sich
  deshalb nicht auf den Werkbank-Ordner.
- **News:** Beiträge in `news/index.html` bearbeiten, danach `build:feed`.
  Die `id` eines bestehenden Beitrags bleibt unverändert (RSS-GUID und Sprungziel).

## Navigation, Versionen und Sichtbarkeit

Die [Regeln des Werks](../src/doppelspalt/REGELN.md) sind verbindlich.
`tests/navigation.test.mjs`, `tests/struktur.test.mjs` und `tests/orma.test.mjs`
halten Navigation, Sichtbarkeit und Ausnahmen fest.

- Gemeinsames Menü: Apps, Prompts, Web, Zettel; aktive Seite über `aria-current`.
- Hauptnavigation: «Ornament Cloud» und «Das Dritte Rad», mit Ausnahmen für
  eigenständige Apps und Werke. Neue Seiten brauchen dieselbe Position und
  Tastaturbedienung wie ihre Seitenfamilie.
- Alpha-Seiten bleiben `noindex` und ausserhalb der Sitemap. Freigegebene Links
  und die OMNA-COLOR-Einbettung auf der Startseite sind gezielte Ausnahmen.
  Principesse, Metastabilität und die Alpha-Übersicht nicht beiläufig verlinken.
- Neue öffentliche Seiten in `sitemap.xml` eintragen; generierte Blöcke über
  ihren Erzeuger aktualisieren. Verborgene Seiten nicht automatisch aufnehmen.
- Bei `styles.css` und `icons.js` die jeweiligen `?v=`-Marken in allen betroffenen
  Seiten und Erzeugern konsistent ändern. Für ORNA danach `build:app` ausführen.
- Alpha-Apps verwenden ebenfalls Versionsmarken in HTML und Modulimporten.
  Änderungen jeweils in allen abhängigen Importen nachziehen, einschliesslich
  gemeinsam verwendeter Dateien (z. B. `alpha/the-fictory/dauer.js`).
- ORMA vergibt Inhalts-Hashes selbst. App-Abschriften und Service-Worker-Dateilisten
  nie von Hand korrigieren.

## Bilder, Videos und externe Dienste

- Vorschauen: `tools/og-image.mjs` (ORNA), `tools/start-og.mjs` (Startseite,
  Drittes Rad, Web-Karten), `tools/alpha-og.mjs` (Alpha-Papiere) sowie
  `tools/fictory-og.mjs` und `tools/sketchory-og.mjs`. Parameter stehen in den
  jeweiligen Skripten. Playwright wird aus der lokalen Installation geladen;
  zusätzliche Bildwerkzeuge benötigen gegebenenfalls ihre eigenen Abhängigkeiten.
- Neue Social-Media-Motive unter einem neuen Dateinamen ablegen und die
  `og:*`-/`twitter:*`-Angaben anpassen, damit Plattform-Caches aktualisiert werden.
- Videos: [Anleitung](../src/videos/README.md) und Skill
  `.claude/skills/ornament-video/`. Lokale Schriften und gemeinsame Vorlagen nutzen.
- `tools/build-jev-*.ts` sprechen einen externen Dienst an und können Kosten
  verursachen. Sie sind absichtlich nicht Teil der normalen Build-/Test-Befehle.
  Details zum Live-Worker: [tools/jev-worker/README.md](../tools/jev-worker/README.md).
- GoatCounter wird lokal eingebunden, sendet Zählungen aber an den Statistikdienst.
  Auf localhost wird nicht gezählt. Eigene Besuche lassen sich pro Browser über
  `https://ornament.cloud/#toggle-goatcounter` ausschliessen. ORMA bleibt ohne Zählung.

## Nicht aktive Teile

`bg.js` und `slider.js` sind derzeit nicht eingebunden. Der ORNA-Werkbericht ist
nicht veröffentlicht; seine Quelle liegt unter `src/doppelspalt/werkbericht.md`.
Dateien unter `werke/` sind Momentaufnahmen und werden nicht automatisch mit den
ursprünglichen Artefakten synchronisiert.

Die ausführliche frühere README einschliesslich Gestaltungsgeschichte ist im
[Stand vor der Kürzung](https://github.com/hansnoed-ui/ornament-cloud/blob/d70b948/README.md)
erhalten; sie ist kein Ersatz für den aktuellen Code und die geltenden Regeln.
