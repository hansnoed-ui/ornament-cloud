# jev im ORNAMENT LAB – Integrationsstatus (23. Oktober 2026)

## Was vorhanden war (geprüft)

- **The Fictory:** `alpha/the-fictory/jev.js` ist eine Tabelle, die jev (jev-1.13.0) am 10.10.2026 beim Bauen erstellt hat (326 Aufrufe, `tools/build-jev-fictory.ts`). Sie enthält für jede ORNA-Konstellation die Wahrscheinlichkeiten der Regeln R1–R7. Die Seite ruft jev nie auf.
- **Die Paradoxie der Stadt** und das Dritte Rad nutzen ebenfalls Tabellen aus dem Bau. Für die Stadt gibt es einen fertigen Cloudflare Worker (`tools/jev-worker/`), dessen Adresse aber leer ist (`alpha/stadt/live.js`). Er ist also nicht live.
- **In dieser Entwicklungsumgebung:** Es gibt keinen jev-MCP-Server, keinen `TYPESAFE_API_KEY`, und `api.typesafe.ai` sowie `docs.typesafe.ai` sind von der Netzwerkregel gesperrt (CONNECT 403). Ein Live-Aufruf war hier deshalb nicht möglich. Es wurden keine Kosten verursacht.

## Was im Lab eingebunden ist

| Stelle | Entscheidungsform | Art im Protokoll | Stand |
|---|---|---|---|
| Regel R1–R7 aus einer ORNA-Konstellation (`orna.konstellation`) | CHOICE (Wahrscheinlichkeiten, gewichtet gezogen) | **jev**, mit Modell, Stand, Wahrscheinlichkeit, allen Wahrscheinlichkeiten und Startwert | **aktiv**, über die Tabelle der Fictory; ohne gültige Tabelle wird über Stichworte (**Regel**) oder per Zufall (**Zufall**) abgeleitet |
| nächste Operation im Modus «jev-assistiert» | CHOICE über 2–6 Operationen aus einem festen Katalog | **jev**, mit Modell, Wahrscheinlichkeiten und Lage | **vorbereitet, aus**: `jev/jev.js` (`JEV_LAB_ADRESSE` leer), `jev/fragen.js` (Lage, Frage), `jev/worker-entwurf.js` |
| Vorschläge ohne jev | feste Regeln (Abwechslung der Klassen, Beobachtung nach Rekursion, Kopplung) | **Regel**, mit Gründen | **aktiv**, wird nie als jev-Urteil ausgegeben |

Die vier Entscheidungsarten **Mensch, Zufall, Regel, jev** bleiben im Projekt und in der Oberfläche getrennt (`ENTSCHEIDUNGSARTEN`). Fällt jev aus, funktionieren die manuelle Wahl und die Regeln weiter, und der Knopf «jev fragen» ist dann deaktiviert und erklärt warum. jev bestimmt nie selbst: Der Mensch übernimmt einen Vorschlag, verwirft ihn oder ändert ihn.

## jev live einrichten (braucht Zustimmung, kleine Kosten)

1. Den Worker aus `src/lab/jev/worker-entwurf.js` nach dem Muster von `tools/jev-worker/` einrichten (eigene `wrangler.toml`, Secret `TYPESAFE_API_KEY`, `ERLAUBT` auf die Lab-Adresse setzen).
2. Die Adresse in `src/lab/jev/jev.js` als `JEV_LAB_ADRESSE` eintragen.
3. Kosten: etwa 1000 Eingabe-Token je Frage, bei 0,042 $ je Million rund 0,004 Cent. Gefragt wird nur auf Knopfdruck.

Die Lage enthält nur Operationskennungen (Verlauf, höchstens 8, und Optionen). Es werden keine Bilder, keine freien Texte und keine Namen übertragen. Die Frage hat einen festen Wortlaut (`labFrage`).

## SCORE und NOUL

Sie werden in 0.1 bewusst nicht verwendet. Eine Bewertung von Varianten nach Kriterien (SCORE) oder eine Ja/Nein-Einschätzung (NOUL) würde leicht wie ein Qualitätsurteil über künstlerische Ergebnisse wirken. Mögliche, klar begrenzte Einsätze für später: **NOUL** für die technische Kompatibilität («Passt das Steuersignal zur Achse des Ziels?») und **SCORE** für Gegenproben mit offen gelegten Kriterien, immer als Hilfe gekennzeichnet und nie zum Sortieren.
