# Integrationsmatrix (Stand 11. Oktober 2026)

Legende: **geprüft** = gegen die echte Quelle verifiziert · **implementiert** = Code vorhanden und mit Fixtures getestet ·
**simuliert** = läuft nur gegen den Simulator bzw. künstliche Daten · **blockiert** = ohne Zugang nicht prüfbar.

| Baustein | geprüft | implementiert | simuliert | blockiert durch fehlenden Zugang |
|---|---|---|---|---|
| **JEV** (`anlage/jev.py`) | ✅ Schema live aus `api.typesafe.ai/openapi.json` (v0.2.0), Modelle aus `GET /v1/models`; **ein echter Aufruf** mit den vier Fragen am 11.10.2026: Modell `jev-1.13.0`, 876 Eingabe-/106 Ausgabe-Token, ≈ 0.000037 USD | ✅ Noul/Score/Choice, strenge Antwortprüfung, Kostenreservierung, Status JEV_FEHLT/JEV_NICHT_ERREICHBAR | Testantworten (klar markiert) nur im Entwicklungsmodus | – (docs.typesafe.ai war gesperrt; die API selbst war erreichbar) |
| **Vertex AI** (`anlage/vertex.py`) | ✅ Endpunkt, Pfad und Feldnamen am offiziellen SDK `google-genai` 2.29.0 (Quellcode) verifiziert | ✅ `generateContent` mit `responseSchema`, Auswertung `usageMetadata`/`modelVersion`, Kostenwächter | Testantworten (klar markiert) | Kein Google-Projekt/Zugang → **kein echter Aufruf**; Google-Doku-Hosts in der Build-Umgebung gesperrt; Modellpreise bewusst nicht eingetragen |
| **Kraken Pro** (`anlage/broker/live.py`) | ✅ Signaturverfahren gegen Krakens dokumentiertes Beispiel (identischer `API-Sign`) | ✅ AddOrder (Limit, `userref`), OpenOrders/ClosedOrders, CancelOrder, TradesHistory, Balance; PAPER-Schutz | Handel nur im Simulator | Kein Konto; `api.kraken.com` und Doku in der Build-Umgebung gesperrt → Antwortformate, Mindestorders, Gebühren, Schweizer Verfügbarkeit **nicht live geprüft** |
| **Kraken öffentliche Kurse** (`anlage/marktdaten.py`) | – | ✅ Ticker, OHLC | – | Host gesperrt → nicht live geprüft |
| **Interactive Brokers** (`anlage/broker/live.py`) | – | ✅ Client Portal Web API: Anmeldestatus, Tickle, Order (LMT, `cOID`), Orders, Trades, Storno, Ledger, Positionen; keine automatische Bestätigung von Warnhinweisen | Handel nur im Simulator | Kein Konto/Gateway; Doku-Host gesperrt → Endpunkte und Felder **nicht gegen ein Konto geprüft**; `conid` fehlen; Bruchstückhandel, Marktdatenabo, Zulassung von US-ETFs für Schweizer Privatkunden offen |
| **Simulierter Broker** (`anlage/broker/simulation.py`) | – | ✅ Geld/Brief, Slippage, Teilfüllungen, Marktzeiten, T+1, Cash-Konto, Störungsinjektion | ✅ | – |
| **Marktdaten Fixture** | – | ✅ | ✅ **künstliche Beispieldaten** | Kein historischer Datensatz → kein validierter Backtest |
| **Buchführung, Zyklus, Auszahlung** | – | ✅ | ✅ | – |
| **Oberfläche, Journal, Export** | ✅ im Browser (Chromium, 390 px und 1280 px) angesehen, keine horizontale Verschiebung | ✅ | – | – |
| **Google-Budgetwarnungen** | – | nicht implementiert (keine Bereitstellung); README beschreibt die Einrichtung | – | Kein Projekt |

## Konkrete offene Punkte vor Live

1. **IBKR**: Konto für Schweizer Wohnsitz (IBKR Pro, Cash), Bruchstückhandel über die API, Marktdatenabo und dessen Kosten, Sitzungsdauer
   des Gateways, `conid` je Instrument, ob US-domizilierte ETFs (z. B. SPY) für dich kaufbar sind (Basisinformationsblatt; sonst nur UCITS-ETFs).
2. **Kraken**: Schweizer Verfügbarkeit der Paare, `ordermin`/`costmin` aus `AssetPairs`, aktuelle Gebührenstufe, USD-Auszahlungskosten,
   Schlüssel ohne «Withdraw Funds» anlegen (die App kann das nicht prüfen).
3. **Vertex AI**: Projekt, Rolle, Modell-ID und aktuelle Preise eintragen; Budget freigeben.
4. **JEV**: Budget freigeben (Mandat), sonst entstehen im Hauptsystem keine modellbasierten Orders.

Wenn ein Kandidat ungeeignet ist: Der Broker-Adapter ist austauschbar (`BrokerAdapter` in `anlage/broker/basis.py`). Mögliche Alternativen
müssten Cash-Konten, API-Handel und Schweizer Wohnsitz unterstützen (z. B. für Krypto ein anderer Schweizer Spot-Anbieter, für Wertpapiere
ein Schweizer Broker mit API) – nicht geprüft, nur als Richtung.
