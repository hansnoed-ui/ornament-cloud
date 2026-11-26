# ornament.cloud – Regeln für Claude

Die Website von Christian Strickler (Künstler, ornament.cloud): reines HTML, CSS
und JavaScript, ohne Build-System für die ganze Seite und ohne CDN. Ausführliche
Beschreibung aller Seiten in `README.md`. Diese Datei hält nur fest, was jede
Sitzung wissen muss, damit dieselben Fehler nicht zweimal passieren.

**Neue Lehre? Hier eintragen** (kurz, mit dem Grund), statt sie nur im Chat zu nennen.

## Sprache und Zusammenarbeit

- Deutsch, Schweizer Rechtschreibung (ss, nie ß) – in Texten, Kommentaren, Commits, PRs.
- Christian arbeitet fast nur am Handy (Android, Chrome). Antworten kurz; jede
  Abschlussmeldung endet mit «So nutzt du es» (Adresse, wo tippen).
- Vorschlag zuerst, Code erst nach seinem OK, wenn er eine Richtung offen lässt.
- Ruhig und fein gestalten, nicht grell; keine «KI-typische» Schrift oder Farbe.

## Veröffentlichen

- **Jeder Push auf `main` geht sofort live** (`.github/workflows/hostpoint.yml`,
  rsync auf Hostpoint). Mergen nur nach Christians ausdrücklichem «live» oder OK.
- Was nicht auf den Server gehört, steht in `tools/hostpoint/ausschluss.txt`
  (u. a. `src/`, `tools/`, `tests/`, `docs/`, `.claude/`, diese Datei).
  Neue Werkzeug- oder Doku-Dateien ausserhalb dieser Ordner dort eintragen.
- ornament.cloud ist aus der Cloud-Sitzung nicht erreichbar; live prüfen heisst
  den Workflow-Lauf ansehen.
- Vor jeder Meldung «bereit» den Merge-Status des PRs prüfen (`mergeable_state`).
  Mehrere Threads arbeiten parallel; Christian mergt teils selbst sofort, also
  vor neuen Commits nachsehen, ob der PR schon gemergt ist.

## Quellen statt Ausgaben ändern

- **Gamma:** Quelle ist `tools/gamma/index.src.html`. `gamma/index.html` wird mit
  `python3 tools/gamma/build.py [vorschau.html]` erzeugt. Nie nur
  `gamma/index.html` ändern – der nächste Build überschreibt es.
- Erzeugte Seiten (Zettelkasten, Alpha-Texte, Art, Neubau `/b/`, Social Media,
  App-Abschriften) kommen aus `tools/build-*.{mjs,ts}`; dort ändern, dann neu bauen.
- Das Menü kommt aus `kopfleiste.js` / `tools/kopfleiste.mjs`, nicht von Hand in
  die Seiten schreiben.
- Unter Windows laufen `tools/build-*.ts` über `npm run` stumm durch, ohne etwas zu
  schreiben (der Vergleich `import.meta.url === file://…` greift dort nicht). Direkt
  aufrufen: `node --experimental-strip-types -e "import {build} from './tools/build-zu-seiner-zeit.ts'; build()" --input-type=module`.
- **Neubau an der Wurzel (seit 16.11.2026):** Dateien liegen in `b/`, die Seiten heissen aber
  `/`, `/en/`, `/angebot/…` (`praefix` in `src/b/ui.mjs`, `ordner` für Dateien). `.htaccess` liefert
  die Bereiche aus `b/` aus und leitet `/b/…`-Seiten per 301 um. Neuer Bereich unter `b/` → in die
  Liste in `.htaccess` eintragen (`tests/wurzel.test.mjs`). Seitenlinks nie mit `/b/` schreiben;
  Bilder, Skripte, Vorschaukarten bleiben unter `/b/`.
- **Startseite:** `/` ist der Neubau. Vom 21. bis 22.11.2026 stand dort die Brillant-Seite und der Neubau-Start hiess `/start/`;
  `/start/` leitet seither per 301 auf `/`, die Brillant-Seite liegt wieder unter `/alpha/brillant/` (noindex, erste Webdesign-Referenz).
- SEO: Gibt es eine Seite im Neubau und ältere Fassungen, zeigt das canonical der alten auf
  den Neubau, und die alte fällt aus der Sitemap (16. November 2026: Strophen).
- **Register:** `src/register.json` führt jede Arbeit mit Tür und Status. Wer eine Seite
  öffnet, sperrt, verlinkt oder neu anlegt, trägt es dort nach (`tests/register.test.mjs`).
- **Musik:** `"oeffentlich"` in `listen/<slug>/ep.json` steuert `/b/hoeren/`, Startseite und
  Sitemap; die Hörseite selbst (kanonisch oder `noindex`) von Hand passend setzen.
- Vorschaukarten gezielt rechnen (`tools/b-kacheln.mjs de hoeren`), nie alle: ein Lauf ohne
  Namen ändert rund 250 PNG ohne sichtbaren Unterschied (13.11.2026).

## Versionsmarken

- Browser behalten Dateien zehn Minuten. Wer ein Modul, Skript oder Stylesheet
  ändert, erhöht dessen `?v=` in allen einbindenden Seiten (Details in `README.md`,
  Abschnitt «Versionsmarke»).
- **ORNAMENT LAB:** `LAB_VERSION` in `alpha/lab/kern/projekt.js`. Bei parallelen
  PRs vor dem Merge prüfen, ob die Nummer schon vergeben ist.

## Was nicht angefasst wird

- Die Apps (Zettelkasten, ORNA, PHORMA, The Fictory, Signet) werden vom Lab nur
  gelesen, nie verändert.
- Die Lab-Seiten bleiben `noindex` und ausserhalb der Sitemap.
- Die Prüfraster sind seit 13.11.2026 nicht öffentlich (`RASTER_OEFFENTLICH` in `tools/build-b.mjs`):
  nicht verlinken, nicht in die Sitemap, nicht auf Start- oder Übersichtsseiten nennen.
- Schlüssel und Tokens (jev, Hostpoint, Stimme) nur als GitHub-Secrets – nie ins
  Repo, ins Frontend oder in den Chat. jev nie live aus dem Container aufrufen.
- Testdateien wie `gamma/_test.html` nie committen.
- `google5f34a117d8e3442e.html` an der Wurzel nie löschen: Damit bestätigt Google die
  Inhaberschaft in der Search Console (16.11.2026); ohne sie geht der Zugang verloren.

## Prüfen vor dem Abschluss

- Unit-Tests: `node --test tests/<bereich>.test.mjs`
- Browser-Tests: `NODE_PATH=$(npm root -g) node tests/<bereich>.e2e.mjs`
  (`fictory.e2e.mjs` braucht `LANG=de_CH.UTF-8`, sonst läuft die Seite englisch).
- Nach Änderungen an Kopf, Menü oder neuen Seiten: `tests/struktur.test.mjs`,
  `tests/navigation.test.mjs`; nach Änderungen am Deploy: `tests/hostpoint.test.mjs`.
- Sichtbares mit Playwright als Bild prüfen, auch in Handybreite (390 px) und dunkel.
- Keine deckenden festen Elemente über WebGL-Leinwand oder Bühne legen
  (Edge unter Windows schnitt sonst unten einen Streifen in Kopfhöhe ab; Kopf
  darum `rgba(0,0,0,.99)` statt `#000`).
- Composer-Motor (`alpha/composer/kern/motor.js`) rechnet jede Spur samt Kette live im AudioWorklet. Mehr Arbeit je Abtastwert
  auf jeder Spur (Messer, Hall) überlastet langsame Rechner: der Ton bricht weg (11.11.2026, 18 Spuren, acht Hallräume).
  Last im Browser messen (Worklet meldet `last`), veröffentlichte Plugins nur bitgleich beschleunigen (Fingerabdruck-Test).
- **Composer-Prüfstand** nach jeder Änderung an Erzeugern, Arrangement, Plugins oder Mischung (26.11.2026):
  `NODE_PATH=$(npm root -g) node tools/composer-pruefstand.mjs --spuren` bedient die echte App im unsichtbaren Browser (alle Stile, 90 s,
  Zufall fest → bitgleich, rund 10 min), misst Lautheit, Spitze, Knackser, Abrisse, Clipping, Löcher, Dropouts, stille Spur-Takte,
  Rechenzeit, mit `--spuren` auch jede Spur einzeln (ein harter Schnitt einer Spur geht in der Mischung unter), und vergleicht mit
  `tests/composer-pruefstand/basis.json`; Exit 1 bei Verschlechterung, Bericht in `pruefstand/bericht.md`. Gewollte Änderungen mit
  `--basis-schreiben` festhalten. `--gemini` hört zusätzlich mit `gemini-4-hydrogen` (nur Hinweise, kein Beleg). Browser auf `de-CH`,
  sonst übersetzt die App die Meldungen. «Knackser» zählt auch harte Einsätze von Instrumenten: in der Basis stehen sie als bekannt.
- Composer ist viersprachig (21.11.2026, `alpha/composer/sprache.js`): der Code schreibt deutsch, die Anzeige übersetzt aus
  `sprache-texte.js`. Neue sichtbare Texte dort mit EN/ES/FR nachtragen, sonst bleiben sie deutsch (`tests/composer-sprache.test.mjs`).
- Fotos aus der Dateiwahl in den Deleuze-Operatoren nur über `alpha/deleuze/gemeinsam/fotos.js` lesen (21.11.2026): `createImageBitmap`
  scheitert am Telefon an grossen Fotos (50–200 MP), das Bild-Element nicht; manche Dateiwähler geben keinen Typ mit.
- Shaderfarben in Three.js-Szenen sind linear, der OutputPass macht sRGB:
  gewünschte sRGB-Farben vorher umrechnen.
