# ornament-cloud

Statische Website für interaktive Werke, Web-Apps, Prüfraster und Videos:
**[ornament.cloud](https://ornament.cloud/)**. HTML, CSS und JavaScript werden direkt
ausgeliefert; die Website braucht weder einen Laufzeitserver noch ein Frontend-Framework.
Schriften, Bibliotheken und Medien liegen lokal im Repository.

## Lokal starten

Voraussetzung: **Node.js ab 22.18** (mit TypeScript-Unterstützung), empfohlen Node.js 24.

```sh
npm ci
npm start
```

Die Website läuft unter <http://localhost:8766/>. Die separate ORMA-Vorschau unter
`/orma/` braucht vorher `npm run build:orma`. Die eingecheckte Alpha-Fassung ist
unter `/alpha/orma/` erreichbar. Ein anderer Port geht mit `npm start -- 8080`.

## Prüfen

```sh
npm test                       # alle Unit-, Daten- und Strukturtests
npx playwright install chromium # einmalig: Browser für die E2E-Tests
npm run test:e2e                # alle Browser-Suiten, nacheinander
```

Die Browser-Tests starten ihren lokalen Server selbst. Playwright ist als reine
Entwicklungsabhängigkeit fest versioniert; eine globale Installation ist nicht nötig.
Auf Linux gegebenenfalls zuerst `npx playwright install-deps chromium` ausführen
(benötigt Systemrechte). Die vollständigen Browser-Tests enthalten Videoaufnahmen
und können mehrere Minuten dauern. `SCHNELL=1 npm run test:e2e` lässt die langen
Aufnahmen von The Fictory und Sketchory aus; das ist kein vollständiger Testlauf.

Eine einzelne Suite läuft beispielsweise mit `node tests/struktur.e2e.mjs`.

## Aufbau

| Bereich | Inhalt / Quelle |
| --- | --- |
| `index.html`, `styles.css`, `icons.js` | Startseite mit OMNA COLOR, Gestaltung und Symbole |
| `apps/` | The Fictory, ORNA und ORMA |
| `masterprompts/` | Die vier Prüfraster |
| `web/` | Sketchory, The Fictory, OMNA COLOR, Das Dritte Rad, Stellenfeld und Videos |
| `portfolio/nebeneinander-nacheinander/` | ORNA: Doppelrad, Feldansicht und installierbare App |
| `src/doppelspalt/` | Verbindliche ORNA-Daten und [Regeln des Werks](src/doppelspalt/REGELN.md) |
| `src/orma/` → `alpha/orma/` | Eigenständige App ORMA; [Dokumentation](src/orma/README.md) |
| `alpha/` | Prototypen und Prüfraster; öffentlich erreichbar, aber `noindex` |
| `src/alpha/` | Markdown-Quellen der erzeugten Alpha-Texte |
| `src/data/`, `src/zu-seiner-zeit/` → `zu-seiner-zeit/` | Zettelkasten auf Deutsch, Englisch und Spanisch; [Dokumentation](src/zu-seiner-zeit/README.md) |
| `src/videos/` | Eigenständiges Remotion-Projekt; [Render-Anleitung](src/videos/README.md) |
| `assets/`, `vendor/`, `werke/` | Medien, lokale Bibliotheken/Schriften und Artefakt-Momentaufnahmen |
| `tools/`, `tests/` | Erzeuger und Prüfungen |

Das Menü besteht aus **Apps, Prompts, Web, Zettel**. News, Termine und Portfolio
bleiben direkt erreichbar, sind aber nicht im Menü. Principesse und Metastabilität
stehen für sich und sind nur per Direktlink erreichbar. Die Alpha-Übersicht selbst
ist nicht verlinkt. Die ältere Videoseite «Mensch, Niklas!» bleibt erreichbar,
ist aber nicht mehr auf «Web» sichtbar und trägt `noindex`.

## Bauen

Nur den betroffenen Bereich bauen, danach `npm test` ausführen und den Diff prüfen.
Es gibt bewusst keinen Gesamtbuild, der getrennte Werke oder externe Dienste anfasst.

| Befehl | Ergebnis |
| --- | --- |
| `npm run build:orma` | Lokale ORMA-Vorschau in `src/orma/dist/` (nicht eingecheckt) |
| `npm run build:orma:alpha` | Veröffentlichbare ORMA-Fassung in `alpha/orma/` |
| `npm run build:orna` | ORNA-Daten, Feldansicht, App-Seiten und Service Worker |
| `npm run build:app` | Nur ORNA-App-Seiten und Service Worker |
| `npm run build:fictory` | The Fictory: Werkbank-Abschrift |
| `npm run build:alpha` | Alpha-Textseiten und Markdown-Downloads |
| `npm run build:zettel` | Zettelkasten, Suchdaten und dessen Sitemap-Block |
| `npm run build:drittes-rad` | Daten für Das Dritte Rad |
| `npm run build:feed` | RSS-Feed aus der News-Seite |

**ORNA und ORMA getrennt ändern und committen.** Generierte Dateien nicht von Hand
korrigieren. Quellen, Cache-Versionen und Sonderfälle stehen in der
[Wartungsanleitung](docs/entwicklung.md).

Bei Änderungen an `styles.css` die Cache-Marke in Seiten und Erzeugern gemeinsam
hochzählen (zurzeit 45), danach `npm run build:app`. Die Strukturtests prüfen das.
Vorschaubilder für Startseite und Drittes Rad erzeugt `node tools/start-og.mjs`:
`assets/og-ornament-cloud.png` und `alpha/drittes-rad/og-drittes-rad.jpg`.

## Veröffentlichen

Die Website wird als statischer Inhalt per FTP/SFTP ins Webverzeichnis der Domain
übertragen. Vorher die betroffenen Builds und Tests ausführen; eingecheckte
Build-Ausgaben gehören zum Upload. `.git`, `node_modules` und lokale Testberichte
nicht hochladen. Ein Push oder Pull Request allein ist kein bestätigtes Deployment.

Historische Gestaltungsentscheidungen und Änderungsabläufe stehen in der
[Git-Historie](https://github.com/hansnoed-ui/ornament-cloud/commits/main/).
