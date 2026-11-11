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
- Schlüssel und Tokens (jev, Hostpoint, Stimme) nur als GitHub-Secrets – nie ins
  Repo, ins Frontend oder in den Chat. jev nie live aus dem Container aufrufen.
- Testdateien wie `gamma/_test.html` nie committen.

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
- Shaderfarben in Three.js-Szenen sind linear, der OutputPass macht sRGB:
  gewünschte sRGB-Farben vorher umrechnen.
