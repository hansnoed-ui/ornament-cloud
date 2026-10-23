# jev im ORNAMENT LAB – Integrationsstatus (23. Oktober 2026, Lab 0.1.12)

## Kurz

jev live ist im Lab **angeschlossen und wird eingeschaltet, sobald der Schlüssel als GitHub-Secret hinterlegt ist** (Anleitung unten). Bis dahin und immer, wenn jev nicht antwortet, wählt das Lab von Hand, nach offen gelegten Regeln und, bei ORNA-Konstellationen, nach der Tabelle aus The Fictory.

## Wie es gebaut ist

```
Lab im Browser  ──POST, nur Kennungen──▶  ornament.cloud/alpha/lab/jev/wahl.php  ──mit Schlüssel──▶  api.typesafe.ai/v1/systemone
 (kein Schlüssel)                          (PHP auf dem Webspace bei Hostpoint)                       (CHOICE)
                                           liest ~/ornament-geheim/typesafe-schluessel
                                           (ausserhalb der Website, nie ausgeliefert)
```

- **Schlüssel:** steht nur im GitHub-Secret `TYPESAFE_API_KEY`. Nach jedem Hochladen legt der Workflow `Hostpoint` ihn mit `tools/hostpoint/jev-schluessel.sh` über SSH in `~/ornament-geheim/typesafe-schluessel` ab, im Heimatordner des Webhostings, **neben** `www/` und damit nicht über eine Adresse erreichbar (Ordner 700, Datei 600). Übertragen wird über die Standardeingabe, nicht über die Befehlszeile; GitHub blendet das Secret in den Protokollen aus. Weder Seite noch Repository noch Chat enthalten ihn.
- **Ausschalten:** das Secret löschen und den Workflow einmal laufen lassen (oder auf den nächsten Push warten): dann löscht er die Datei. Zum Pausieren ohne Löschen genügt auf dem Webspace eine Datei `~/ornament-geheim/jev-lab.json` mit `{"aus": true}`.
- **Bereitschaft ohne Kosten:** Das Lab fragt beim Start `wahl.php` per GET. Die Antwort `{ "bereit": true }` oder `{ "bereit": false, "grund": … }` ruft jev nicht auf. Der Workflow zeigt sie im Schritt «Nachsehen» als Zeile «jev im Lab». Lokal (`starten.mjs`, ohne PHP) ist jev live aus.

## Was die Zwischenstelle prüft (`alpha/lab/jev/wahl.php`)

| Prüfung | Grenze |
|---|---|
| Herkunft | nur `Origin: https://ornament.cloud`, bei vorhandenem `Sec-Fetch-Site` nur `same-origin` |
| Form | nur POST mit JSON, höchstens 2000 Bytes |
| Inhalt | dieselben Regeln wie `labLage()` in `fragen.js`: Verlauf höchstens 8 Kennungen, 2–6 Optionen aus dem festen Katalog, keine weiteren Felder, keine freien Texte, keine Bilder. Seit 0.1.11 auch die Dramaturgie: alle sechs Merkmale mit je einer Stufe aus einer festen Liste, 2–6 Dramaturgien |
| Frage | baut sie selbst mit festem Wortlaut (wie `labFrage()`); ein Test hält beide Fassungen wörtlich gleich |
| Ziel | nur `https://api.typesafe.ai/v1/systemone`, keine Weiterleitungen |
| Je Adresse | 6 Fragen in der Minute, 60 am Tag (Adressen nur als Prüfsumme, am nächsten Tag vergessen) |
| Kosten | für alle zusammen höchstens 200 echte jev-Aufrufe am Tag und 2000 im Monat |
| Zwischenspeicher | gleiche Lage → gleiche Antwort, 30 Tage, ohne Kosten |

**Kosten:** etwa 1000 Eingabe-Token je Frage, bei 0,042 $ je Million rund 0,004 Cent. Gefragt wird nur auf Knopfdruck («jev fragen»). Die Monatsgrenze von 2000 Aufrufen entspricht höchstens rund 9 Cent. Die Grenzen lassen sich in `~/ornament-geheim/jev-lab.json` nur senken oder anpassen (`je_minute`, `je_tag_adresse`, `je_tag`, `je_monat`, `modell`).

Fehler kommen verständlich im Lab an (Schlüssel abgelehnt, Kontingent erschöpft, Tagesgrenze, nicht erreichbar); manuelle Wahl und Regeln bleiben dann verfügbar.

## Was im Lab eingebunden ist

| Stelle | Entscheidungsform | Art im Protokoll | Stand |
|---|---|---|---|
| Regel R1–R7 aus einer ORNA-Konstellation (`orna.konstellation`) | CHOICE (Wahrscheinlichkeiten, gewichtet gezogen) | **jev**, mit Modell, Stand, Wahrscheinlichkeit, allen Wahrscheinlichkeiten und Startwert | **aktiv**, über die Tabelle der Fictory (jev-1.13.0, beim Bauen erstellt); ohne gültige Tabelle über Stichworte (**Regel**) oder per Zufall (**Zufall**) |
| nächste Operation im Modus «jev-assistiert» | CHOICE über 2–6 Operationen aus einem festen Katalog | **jev**, mit `quelle: "live"`, Modell, Wahrscheinlichkeit der gewählten und aller Optionen, Lage, `zwischengespeichert`, Zeitpunkt | **live**, sobald das Secret gesetzt ist; sonst Knopf deaktiviert mit Grund |
| Dramaturgie einer Animation aus Bild und Klang (30 s) | CHOICE über sechs feste Dramaturgien, Lage nur aus gemessenen Stufen (`frage: "dramaturgie"`) | **jev**, mit Modell, Wahrscheinlichkeiten, Lage, Rang; ohne jev **Regel** mit Gründen | **live** seit Lab 0.1.11 (docs/VORSCHLAG.md) |
| Zusammenstellung einer Animation aus vielen Bild- und Klangeffekten | zehn CHOICE-Fragen in einem Aufruf (`frage: "komposition"`), daraus mit Startwert gezogen | **jev** mit Antworten und Startwert; von Hand geändert **Mensch**; ohne jev **Zufall** | **live** seit Lab 0.1.12 (docs/VORSCHLAG.md) |
| Vorschläge ohne jev | feste Regeln (Abwechslung der Klassen, Beobachtung nach Rekursion, Kopplung) | **Regel**, mit Gründen | **aktiv**, wird nie als jev-Urteil ausgegeben |

Die vier Entscheidungsarten **Mensch, Zufall, Regel, jev** bleiben im Projekt und in der Oberfläche getrennt (`ENTSCHEIDUNGSARTEN`); eine jev-Entscheidung aus der Tabelle und eine aus jev live unterscheiden sich durch `details.quelle`. jev bestimmt nie selbst: Der Mensch übernimmt einen Vorschlag, verwirft ihn oder ändert ihn.

## Schlüssel eintragen (einmal, geht auch am Handy im Browser)

1. Auf github.com das Repository `hansnoed-ui/ornament-cloud` öffnen → **Settings** → **Secrets and variables** → **Actions** (am Handy: die Desktop-Ansicht des Browsers hilft, wenn «Settings» fehlt).
2. **New repository secret**. Name: `TYPESAFE_API_KEY`. Secret: den jev-Schlüssel von TypeSafe einfügen. **Add secret**.
3. **Actions** → Workflow **Hostpoint** → **Run workflow** (Probelauf aus lassen). Nach etwa einer Minute steht im Schritt «Nachsehen» die Zeile `jev im Lab {"bereit":true}`.
4. Im Lab (ornament.cloud/alpha/lab/) steht unten «jev live: bereit». Im Modus «jev-assistiert» ist «jev fragen» dann frei.

Steht dort `{"bereit":false,"grund":"Kein Schlüssel hinterlegt"}`, hat der Schritt «jev-Schlüssel für das Lab» die Datei nicht ablegen können (sein Protokoll zeigt warum). Antwortet jev beim ersten Fragen mit «Schlüssel abgelehnt», ist der Schlüssel falsch oder nicht aktiv.

## Prüfen

    node --test tests/lab-jev-php.test.mjs     (wahl.php mit php -S und vorgetäuschtem jev: Herkunft, Lage, Wortlaut, Zwischenspeicher, Grenzen, Ausschalten)
    node --test tests/lab.test.mjs              (jev.js: Bereitschaft, Fehler der Zwischenstelle)
    NODE_PATH=$(npm root -g) node tests/lab.e2e.mjs   (Oberfläche mit vorgetäuschter Zwischenstelle: Übernahme als jev, Quelle live)

Ein echter Aufruf war aus der Entwicklungsumgebung nicht möglich: `api.typesafe.ai` und `docs.typesafe.ai` sind dort gesperrt. Die Form der Anfrage und der Antwort (`answers.wahl.probabilities`, `model`) ist dieselbe, mit der am 10.10.2026 die 326 Aufrufe für die Tabelle der Fictory gelaufen sind (`tools/build-jev-fictory.ts`). Der erste echte Aufruf geschieht auf dem Webspace, wenn jemand im Lab «jev fragen» drückt.

## SCORE und NOUL

Sie werden weiterhin bewusst nicht verwendet. Eine Bewertung von Varianten nach Kriterien (SCORE) oder eine Ja/Nein-Einschätzung (NOUL) würde leicht wie ein Qualitätsurteil über künstlerische Ergebnisse wirken. Mögliche, klar begrenzte Einsätze für später, über dieselbe Zwischenstelle mit eigener, fester Frage: **NOUL** für die technische Kompatibilität («Passt das Steuersignal zur Achse des Ziels?») und **SCORE** für Gegenproben mit offen gelegten Kriterien, immer als Hilfe gekennzeichnet und nie zum Sortieren.
