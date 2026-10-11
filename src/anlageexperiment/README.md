# Anlageexperiment (Vertex AI + JEV) – lokaler Prototyp

Kleine, nachvollziehbare Anwendung für ein privates Anlageexperiment mit **insgesamt 200 USD**: Aktien/ETFs über Interactive
Brokers, Krypto-Spot über Kraken Pro, Analyse über Vertex AI, Bewertung über JEV, feste Mandatsprüfung, Buchführung mit
Zyklusverwaltung und eine deutsche Oberfläche.

**Stand 11. Oktober 2026: nur Simulation (PAPER).** Es gibt keinen echten Handel, keine kostenpflichtige Bereitstellung und
keine Auszahlungsberechtigung. Kurse sind **künstliche Beispieldaten**. Strategie, Universum und Limits sind
**Entwicklungsannahmen**, nicht freigegeben.

| Dokument | Inhalt |
|---|---|
| [docs/INTEGRATIONSMATRIX.md](docs/INTEGRATIONSMATRIX.md) | was geprüft, implementiert, simuliert oder blockiert ist |
| [docs/LIVE-UEBERBLICK.md](docs/LIVE-UEBERBLICK.md) | Instrumente, Strategie, Kapital, Limits, Kosten und Rechte vor einer späteren Live-Aktivierung, mit Engpässen |
| [docs/BEISPIELZYKLUS.md](docs/BEISPIELZYKLUS.md) | vollständiger simulierter Zyklus inkl. manueller Auszahlungsbestätigung und Neustart |
| [docs/TESTERGEBNISSE.md](docs/TESTERGEBNISSE.md) | kritische Abnahmetests mit Ergebnis |
| [mandat/mandat-v1.json](mandat/mandat-v1.json) | versionierte Mandatskonfiguration |
| [.env.example](.env.example) | Einstellungen ohne Geheimnisse |

## Bestandsaufnahme und Annahmen

- Das Repository ist die statische Website ornament.cloud. Ein Python-Stack war nicht vorhanden; die Anwendung steht daher eigenständig in
  `src/anlageexperiment/` und verändert keine Website-Dateien. Vorlagen enden auf `.jinja`, damit die Seiten-Tests des Repositorys sie nicht als Website-Seiten werten.
- **Vorhandene JEV-Anbindung** (`tools/jev-worker/`, `tools/build-jev-*.ts`): `POST https://api.typesafe.ai/v1/systemone`, Schlüssel per
  `TYPESAFE_API_KEY` oder über einen Proxy, der ihn einsetzt. Dieses Muster wurde übernommen.
- Python 3.13, Starlette, Jinja2, SQLite – alles war in der Umgebung vorhanden; keine neue Infrastruktur.
- Geld ausschliesslich mit `Decimal`; Floats werden für Geld und Mengen abgewiesen.
- Annahmen, die du jederzeit änderst: Startverteilung 100/100 (Simulationsbeispiel), Ziel 1'000 USD, Neustart 200, langfristig 200,
  **Überschuss über dem Ziel an dich** (Entwurfsannahme), Sperrfrist 24 h nach verfehlter Zielabwicklung.

## Installation, Start, Test

```sh
cd src/anlageexperiment
python3 -m venv .venv && . .venv/bin/activate      # optional
pip install -r requirements.txt
cp .env.example .env                                # anpassen; nie Schlüssel einchecken
set -a; . ./.env; set +a

python -m anlage.web                                # Oberfläche: http://127.0.0.1:8765
python -m anlage.cli start                          # oder: Experiment über die Kommandozeile starten
python -m anlage.cli schritt 24                     # 24 simulierte Stunden
python -m anlage.cli status
python -m pytest tests -q                           # kritische Tests (37)
python skripte/beispielzyklus.py                    # schreibt docs/BEISPIELZYKLUS.md
```

Ein normaler Start löst nie echte Orders aus: `APP_MODUS` ist standardmässig `PAPER`, und im PAPER-Modus gibt es nur den simulierten Broker.

## Bedienung

Die Übersicht zeigt oben sehr deutlich **SIMULATION** bzw. **LIVE** und ob die Kurse künstlich sind. Darunter: Zyklus und Zustand mit
konkreten Pausengründen, Handelskontowert, geschätzter Netto-Liquidationswert und wirtschaftlicher Nettowert mit Bewertungsgrundlage,
das änderbare Ziel, Guthaben je Anbieter (gesamt, abgewickelt, reserviert, frei), offene Orders, die letzte Entscheidung mit
Begründung, JEV-Bewertung und Gegenargument, Datenalter und Integrationsstatus, Handels- und externe Betriebskosten getrennt,
die kumulative Bilanz und die letzten Zustandswechsel. Weitere Seiten: **Entnahme planen**, Plan-Seite (Auszahlungsvorschlag),
**Journal** mit CSV/JSON-Export, **Vergleich**, **Kosten**.

Deine Aktionen (der Agent kann keine davon auslösen):

- **Ziel ändern**, Neustartkapital, langfristige Zuführung, Überschussregel, **automatische Zielabwicklung aus/an** – jeweils als neue,
  begründete Parameterversion. Während einer Zielabwicklung wird vor jedem Orderversand geprüft, ob Ziel und Automatik noch gelten;
  sonst wird kontrolliert abgebrochen (bereits ausgeführte Verkäufe bleiben, Restorders werden storniert und abgeglichen).
- **Auszahlungsvorschlag**: ändern (neue Version), bestätigen, verschieben, wieder aufnehmen, verwerfen (danach fortsetzen oder pausieren).
- **Überweisungen**: du führst sie beim Anbieter selbst aus, meldest «ausgeführt» (Geld ist dann *in Transfer*) und bestätigst den
  Eingang mit Referenz/Beleg. Gescheiterte Überweisungen bleiben sichtbar; es wird nie automatisch nachgefüllt.
- **ENTNAHME PLANEN** jederzeit: Vorschau mit freiem Bargeld, nötigen Teilverkäufen, Kosten und Restkapital; Verkäufe erst nach Bestätigung.
- **PAUSE** (stoppt neue Orders, storniert offene Kauforders, verkauft nichts) und getrennt **POSITIONEN SCHLIESSEN** (erst Vorschau, dann Bestätigung).
- **Neustart** nach bestätigten und abgeglichenen Überweisungen; **Zyklus abschliessen** und **neuer Zyklus** mit vorhandenem Kapital; **Einzahlung** nur mit Begründung.

## Architektur

| Baustein | Datei | Aufgabe |
|---|---|---|
| a) Marktdaten | `anlage/marktdaten.py` | Kurse (Geld/Brief/Zeit/Währung), Marktzeiten; Fixture (künstlich) und öffentlicher Kraken-Kurs |
| b) Analyse | `anlage/vertex.py` | Vertex AI `generateContent` mit JSON-Schema: Hypothese, Belege, Gegenargumente, Datenlücken |
| c) JEV | `anlage/jev.py` | vier eng umrissene Fragen (Noul, Noul, Score, Choice), strenge Schemaprüfung |
| d) Strategie | `anlage/strategie.py` | Regelsignal, Mengenrechnung, versionierte Bewertungsregel, Ersatzregel ohne JEV |
| e) Mandatsprüfung | `anlage/mandatspruefung.py` | Instrument, Konto, Geld, Gebührenreserve, Bestände, Kursalter, Marktstatus, Limits, Zustand |
| f) Ausführung | `anlage/ausfuehrung.py`, `anlage/broker/` | stabile Client-IDs, UNKLAR statt Neuversand, Abgleich, Sperre; Simulation, Kraken, IBKR |
| g) Buchführung, Zyklus | `anlage/buchhaltung.py`, `anlage/zyklus.py`, `anlage/kosten.py` | einzige Wahrheit für Kapital und Kosten; Zustandsmaschine; Auszahlungsrechnung; Kostenwächter |
| h) Oberfläche, Journal | `anlage/web.py`, `anlage/vorlagen/`, `anlage/export.py` | deutsche Oberfläche, Entscheidungsjournal, CSV/JSON |
| Orchestrierung | `anlage/engine.py` | ein Schritt je Datenzeitpunkt; alle Aktionen, die nur du auslöst |
| Vergleich | `anlage/vergleich.py` | virtuelle Depots ohne JEV und Kaufen-und-Halten, Messwerte |

Ablauf einer Entscheidung: Kurs frisch und Markt offen → Regelsignal (KAUF/VERKAUF; HALTEN wird nicht einzeln protokolliert) →
Menge rechnet der Code → Vertex formuliert Hypothese und Gegenargumente → JEV bewertet → Regel `jev-regel-0.1.0` →
Mandatsprüfung → Order mit Client-ID aus Depot, Zyklus, Instrument und Kurszeit. Modelle sehen nie Zugangsdaten und wählen
weder Instrument noch Menge; ihre Ausgaben sind Daten, nie Anweisungen oder Code.

**Keine Verlustgrenze**: Es gibt keinen Stop-Loss, keine Drawdown-Abschaltung, keine kapitalabhängige Pause. `TECHNISCH_PAUSIERT`
entsteht nur bei unklaren Orders, ungeklärtem Kontostand oder fehlender Anmeldung; veraltete Kurse blockieren nur das betroffene Instrument.
Der Strategieausstieg «Trendbruch» ist eine normale Regel auf den Kursverlauf.

## JEV einrichten

1. Schlüssel aus der TypeSafe-Konsole als `TYPESAFE_API_KEY` setzen (oder einen Proxy nutzen, der ihn einsetzt, dann `JEV_SCHLUESSEL_VIA_PROXY=1`).
2. `JEV_MODUS=echt`.
3. In der Mandatsdatei unter `betriebskosten.jev` ein Budget (`freigegebenes_budget_usd`) und `max_aufrufe_je_tag` freigeben – als neue Mandatsversion.
4. Prüfen: `python -m anlage.cli jev-pruefen --budget-usd 0.01` macht genau einen Aufruf mit Beispieldaten.

Ohne JEV (`JEV_FEHLT`), bei Ausfall (`JEV_NICHT_ERREICHBAR`), ungültiger Antwort oder erschöpftem Budget entstehen keine
modellbasierten Orders. Laufende Orders werden weiter abgeglichen; Zielabwicklung, Entnahmen und POSITIONEN SCHLIESSEN bleiben möglich.
Testantworten gibt es nur bei `APP_UMGEBUNG=entwicklung` im PAPER-Modus und sie sind überall als «TESTANTWORT» gekennzeichnet.

## Vertex AI einrichten

1. Google-Cloud-Projekt mit Abrechnung, Vertex AI API aktivieren, Rolle mit Berechtigung für Modellaufrufe (z. B. «Vertex AI User»). Siehe
   die offizielle Anleitung zur Einrichtung der Cloud-Umgebung. Eine Agentenplattform ist dafür nicht nötig.
2. Anmeldung: `gcloud auth application-default login` und `pip install google-auth requests` – oder kurzlebig `VERTEX_ZUGRIFFSTOKEN=$(gcloud auth print-access-token)`.
3. `VERTEX_MODUS=echt`, `GOOGLE_CLOUD_PROJECT`, `GOOGLE_CLOUD_LOCATION` (z. B. `global`), `VERTEX_MODELL` (aktuelles Modell aus der Google-Modellliste).
4. In der Mandatsdatei unter `betriebskosten.vertex` **Preise je Mio. Token aus der aktuellen Google-Preisliste** und ein Budget eintragen.
   Ohne Preis wird nichts reserviert und nichts aufgerufen (`PREIS_UNBEKANNT`).
5. Prüfen: `python -m anlage.cli vertex-pruefen --budget-usd 0.05`.
6. Empfohlen: zusätzlich ein Google-Budget mit Warnungen anlegen. Das ist **keine** harte Ausgabensperre; die harte Sperre ist der Kostenwächter
   dieser Anwendung (konservative Reservierung vor jedem Aufruf). Google rechnet verzögert ab.

## Konten und API (erst vor einer Live-Aktivierung)

- **Kraken Pro**: API-Schlüssel nur mit *Query Funds*, *Query Open Orders & Trades*, *Create & Modify Orders*, *Cancel/Close Orders*.
  **Kein «Withdraw Funds».** Die Anwendung kann die Rechte eines Schlüssels nicht selbst auslesen – bitte beim Anlegen dokumentieren.
  Mindestorders je Paar über `AssetPairs` (`ordermin`, `costmin`) abrufen und ins Mandat übernehmen.
- **Interactive Brokers**: IBKR Pro, Cash-Konto, Client Portal Gateway lokal starten und im Browser anmelden (inkl. 2FA). Die Anwendung
  automatisiert den Login nicht; läuft die Sitzung ab, pausiert sie technisch. Warnhinweise mit Bestätigungspflicht werden nie automatisch
  bestätigt. `conid` je Instrument ins Mandat eintragen. Rechte: wenn möglich ein Benutzer ohne Auszahlungs-/Überweisungsrechte.
- Echthandel nur mit: eigener Datenbank, `APP_MODUS=LIVE`, einer neuen Mandatsversion mit `status: FREIGEGEBEN`, passendem
  `LIVE_FREIGABE_MANDAT_HASH` und `python -m anlage.cli live-aktivieren --bestaetigung "Ich aktiviere Mandat … (…) für echten Handel"`.
  Danach keine Einzelgenehmigung für gewöhnliche Käufe und Verkäufe innerhalb des Mandats.

## Sicherheit

Zugangsdaten nur aus Umgebungsvariablen, nie in Browser, Datenbank, Prompt, Export oder Log (getestet). Die Oberfläche bindet an
127.0.0.1 und prüft ein Formular-Token. Simulations- und Live-Datenbank sind getrennt (eine PAPER-Datenbank lässt sich nicht im
LIVE-Modus öffnen). Auszahlungs-Endpunkte sind nicht implementiert. Das langfristige Depot hat keinen API-Zugang und erscheint nur
über deine bestätigten Zuführungen.

> Hinweis: Dieser Ordner liegt im Repository der Website. Wenn das Repository als Website veröffentlicht wird, sind Code und
> Dokumentation öffentlich lesbar (es sind keine Geheimnisse darin; `daten/` und `.env` sind ausgeschlossen).

## Grenzen

- Kurse sind künstlich; es gibt **keinen validierten Backtest**. Börsenfeiertage sind in der Simulation nicht abgebildet.
- Broker-Adapter sind nicht gegen Konten geprüft (siehe Integrationsmatrix). Keine Behauptung dauerhafter unbeaufsichtigter Automatisierung.
- Persönliche Steuern werden nicht berechnet; alle Ergebnisse gelten nach erfassten Kosten, vor Steuern.
- Ein einzelner Lauf belegt keinen Vorteil von JEV oder Vertex AI.
