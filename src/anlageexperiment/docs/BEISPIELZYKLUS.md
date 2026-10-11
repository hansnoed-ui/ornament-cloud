# Beispiel: ein vollständiger simulierter Zyklus

> Erzeugt mit `python skripte/beispielzyklus.py`. **Künstliches, absichtlich unrealistisches Demonstrationsszenario** (`demo_ziel`: starke Aufwärtsdrift) und **markierte Testantworten** für Vertex AI und JEV. Gezeigt wird der Ablauf der Zustandsmaschine – keine erreichbare Rendite, kein Backtest.

## 1. Start
- Experiment gestartet: 200.00 USD gesamt (IBKR 100.00, Kraken 100.00 – Simulationsbeispiel 100/100).
- Vergleichsdepots (ohne JEV, Kaufen und Halten) starten mit denselben Werten.

## 2. Handel bis zur Zielerreichung (Standardziel 1'000 USD)
- 2026-10-12T14:00:00Z · Zustand **SIMULATION** · Handelskontowert 199.44 USD
- 2026-10-25T18:00:00Z · Zustand **ZIEL_ABWICKLUNG** · Handelskontowert 1'016.53 USD
- 2026-10-27T14:00:00Z · Zustand **AUSZAHLUNG_AUSSTEHEND** · Handelskontowert 1'015.87 USD
- 88 journalisierte Entscheidungen, 10 Orders im Hauptsystem.

Zustandswechsel:

| Zeit | von → nach | durch | Grund |
|---|---|---|---|
| 2026-10-12T13:00 | – → SETUP | SYSTEM | Anwendung eingerichtet |
| 2026-10-12T13:00 | SETUP → SIMULATION | ICH | Experiment gestartet mit 200.00 USD gesamt |
| 2026-10-25T18:00 | SIMULATION → ZIEL_ABWICKLUNG | SYSTEM | Geschätzter Netto-Liquidationswert 1010.10 USD ≥ Ziel 1000.00 USD (Parameter v1). Neue Käufe gesperrt; keine Überweisung ausgelöst. |
| 2026-10-27T14:00 | ZIEL_ABWICKLUNG → ABRECHNUNG | SYSTEM | Alle Verkäufe ausgeführt und abgewickelt; Kosten werden festgestellt |
| 2026-10-27T14:00 | ABRECHNUNG → AUSZAHLUNG_AUSSTEHEND | SYSTEM | Verfügbarer Nettobetrag 1010.87 USD ≥ Ziel 1000.00 USD. Auszahlungsvorschlag #1 erstellt – nichts wird automatisch überwiesen. |

## 3. Auszahlungsvorschlag (nichts wird automatisch überwiesen)

- Verfügbares Bargeld: 1'015.87 USD, bekannte Auszahlungskosten 5.00 USD, verfügbarer Nettobetrag 1'010.87 USD
- Vorschlag: **610.87 an dich**, **200.00 ins langfristige Depot**, **200.00 bleiben als Neustartkapital**
- Hinweis: Überschuss 10.87 USD über dem Ziel geht gemäss Entwurfsannahme an dich (änderbar)

## 4. Deine Schritte
- Plan bestätigt → Überweisungen GEPLANT:
  - #1 kraken → LANGFRIST 200.00 USD
  - #2 kraken → AN_MICH 592.69 USD
  - #3 ibkr → AN_MICH 18.18 USD
- Alle als «ausgeführt» gemeldet → Zustand bleibt **AUSZAHLUNG_AUSSTEHEND**; in Transfer 810.87 USD (zählt weder als aktives Kapital noch als bestätigter Eingang).
- Eingänge mit Referenz bestätigt, Restkapital über beide Konten abgeglichen → **NEUSTART_BEREIT**
- Neustart von dir ausgelöst → Zyklus 2 im Zustand **SIMULATION** mit 200.00 USD (kein Nachschuss)

## 5. Kumulative Bilanz nach dem Neustart (+24 h)

| Posten | USD |
|---|---:|
| Einzahlungen gesamt | 200.00 |
| An dich ausgezahlt (bestätigt) | 610.87 |
| Ins langfristige Depot (bestätigt) | 200.00 |
| In Transfer | 0.00 |
| Aktives Kapital | 200.16 |
| Handelsgebühren | 11.03 |
| Auszahlungskosten (vom Konto) | 5.00 |
| Externe Betriebskosten | 0.00 |
| Ergebnis nach erfassten Kosten, vor Steuern | 811.03 |

## 6. Vergleich (gemeinsames Zeitfenster, nur Funktionstest bei künstlichen Daten)

| Depot | Endwert inkl. abgeflossener Beträge | Nettoergebnis | Gebühren | Orders mit Ausführung | Max. Rückgang (Messwert) |
|---|---:|---:|---:|---:|---:|
| Hauptsystem (mit Vertex + JEV) | 1'011.03 | 811.03 | 16.03 | 13 | 0.8 % |
| Virtuell: ohne JEV (Ersatzregel) | 1'706.77 | 1'506.77 | 1.70 | 5 | 1.1 % |
| Virtuell: Kaufen und Halten | 1'875.34 | 1'675.34 | 1.78 | 4 | 1.1 % |

_Gemeinsames Zeitfenster, gleiche Startwerte und Datenzeitpunkte. Das Hauptsystem enthält Auszahlungen/Übertragungen (als abgeflossene Beträge mitgezählt) und seine Modellkosten; die virtuellen Depots zahlen nichts aus. Ein einzelner Lauf beweist keinen kausalen Vorteil von JEV. Bei künstlichen Daten ist der Vergleich nur ein Funktionstest._
