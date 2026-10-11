# Überblick vor einer späteren Live-Aktivierung

Dieser Bauauftrag aktiviert nichts. Das hier ist die Entscheidungsgrundlage, die vor einer Live-Version des Mandats (Status
`FREIGEGEBEN`) vorliegen soll. Alle Zahlen zu Gebühren stammen aus öffentlichen Angaben bzw. Drittquellen und sind **vor Live zu prüfen**.

## 1. Instrumente (Mandat 1.0.0, Entwicklungsannahme)

| Konto | Instrument | Klasse | Bruchstücke | Hinweis |
|---|---|---|---|---|
| IBKR | AAPL, MSFT | Aktie | angenommen | Bruchstückhandel über API prüfen |
| IBKR | SPY | ETF (US) | angenommen | **nur Simulation** – für Schweizer Privatkunden ohne Basisinformationsblatt evtl. nicht kaufbar |
| IBKR | VWRA | ETF (UCITS, USD) | nein | ~140 USD je Anteil → mit ~100 USD Kontoguthaben **nicht kaufbar** (in der Simulation sichtbar: «unter Mindestorder») |
| Kraken | BTC/USD, ETH/USD | Krypto-Spot | ja | Mindestorders je Paar laut `AssetPairs` |

Echte Aktien/ETFs nur über IBKR; keine tokenisierten Aktien.

## 2. Strategie `forschung-0.1.0` (nicht freigegeben)

Trendfolge mit Bargeld als Normalzustand (24-h-Durchschnitt, Momentum ≥ 1 %, Schwankung ≤ 3 %/h; Ausstieg bei 2 % unter dem Durchschnitt),
Positionsziel 45 % des Kontowerts, höchstens 60 USD je Order. JEV-Regel `jev-regel-0.1.0`: Order nur bei Aktion ORDER_VORSCHLAGEN mit
Konfidenz ≥ 0.55, «belegt» ≥ 0.60, «Widerspruch» ≤ 0.50, Passung ≥ 2.5/4.

**Befund aus der Simulation (künstliche, driftfreie Kurse, 30 Tage):** 65 Orders, 19.79 USD Gebühren plus 5.60 USD Spanne/Slippage –
zusammen rund **12.7 % des Startkapitals**; Endwert 169.63 USD. Kaufen-und-Halten: 4 Orders, 1.78 USD Gebühren, Endwert 212.20 USD.
Bei 200 USD frisst eine stündliche Trendfolge das Kapital über Kosten auf, unabhängig von JEV. Das ist kein Beleg für reale
Märkte, aber ein klarer Engpass. Vor Live empfehle ich eine **langsamere Variante** (z. B. Tageskurse, breiteres Ausstiegsband,
Mindesthaltedauer) als neue, vorab festgelegte Strategieversion – nicht nachträglich an Testdaten angepasst.

Hinweis: Mit Testantworten verhalten sich Hauptsystem und Vergleich «ohne JEV» identisch; ein Unterschied entsteht erst mit echten JEV-Antworten.
Im einzigen echten Probeaufruf antwortete JEV bei künstlichen Daten WEITER_PRUEFEN (Konfidenz 0.82), es wäre also keine Order entstanden.

## 3. Kapitalverteilung

Insgesamt 200 USD, nicht 200 je Anbieter. 100/100 ist ein Simulationsbeispiel. Keine automatische Geldverschiebung zwischen Brokern.

**Engpass zwei Anbieter:** Mit je ~100 USD sind Positionen klein (≤ 45 USD), Mindestgebühren wirken stark (IBKR Fixed: Minimum 1 USD,
höchstens 1 % des Handelswerts → bei 45 USD rund 0.45 USD je Order; Kraken-Einstiegsstufe konservativ 0.80 % Taker). Eine Verteilung auf
nur einen Anbieter würde die Positionsgrösse verdoppeln, ändert aber Anlageklassen – das ist deine Entscheidung, nicht meine.

## 4. Positions- und Orderlimits (transparent, keine Verlustgrenze)

Höchstens 50 % je Instrument nach Kauf, höchstens 60 USD je Order, Gebührenreserve 2 USD (IBKR) bzw. 1 USD (Kraken), Kursalter
höchstens 15 min (Wertpapiere) bzw. 3 min (Krypto), offene Kauforders höchstens 4 h. Keine Verlustschwelle, kein Stop-Loss.

## 5. Wiederkehrende und einmalige Kosten (zu prüfen)

| Posten | Annahme | Wirkung bei 200 USD |
|---|---|---|
| IBKR-Kommissionen | Fixed: 0.005 USD/Stück, min. 1 USD, max. 1 % | bis 1 % je Order |
| Kraken-Gebühren | 0.40 % Maker / 0.80 % Taker (konservativ) | 0.8 % je Order |
| Spanne + Slippage | 0.2 % Slippage angenommen | ~0.2–0.3 % je Order |
| IBKR-Marktdaten für API-Kurse | Abo nötig, Preis offen | ein paar USD pro Monat wären bei 100 USD Kontowert mehrere Prozent monatlich – **vor Live klären** |
| Auszahlungen | IBKR: erste im Monat angenommen gratis; Kraken: 5 USD angenommen | bei jeder Zielauszahlung |
| JEV | gemessen ≈ 0.000037 USD je Bewertung | vernachlässigbar (100 Bewertungen/Tag ≈ 0.004 USD) |
| Vertex AI | Preis je Modell eintragen | voraussichtlich Bruchteile eines Cents je Analyse; Google rechnet verzögert ab |
| Hosting | lokal 0 USD | ein dauerhaft laufender Rechner wäre für IBKR ohnehin nötig (Gateway-Anmeldung durch dich) |

## 6. Benötigte Berechtigungen

- **Kraken**: Query Funds, Query Open Orders & Trades, Create & Modify Orders, Cancel/Close Orders. **Kein Withdraw Funds**, keine Staking-/Earn-Rechte.
- **IBKR**: Handelsrechte für Aktien/ETFs im Cash-Konto, kein Margin, keine Optionen/Futures. Wenn möglich ein separater Benutzer ohne
  Überweisungsrechte. Falls IBKR Rechte nicht so trennen lässt, gilt: die App implementiert keine Auszahlungs-Endpunkte; trotzdem vor Live entscheiden.
- **Google Cloud**: Rolle für Vertex-Modellaufrufe; keine weiteren Dienste nötig. Budgetwarnung einrichten (keine harte Sperre).
- **TypeSafe/JEV**: API-Schlüssel; Budget im Mandat.
- **Langfristiges Depot**: kein API-Zugang (Version 1).

## 7. Unbeaufsichtigter Betrieb

Nicht zugesichert: IBKR verlangt eine Anmeldung im Gateway durch dich und beendet Sitzungen; die App pausiert dann technisch und
umgeht keine Schutzmassnahmen. Kraken-Schlüssel laufen nicht ab, aber Konto- und Rechteänderungen werden erst beim nächsten Abgleich sichtbar.
