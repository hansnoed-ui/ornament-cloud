# Testergebnisse

Lauf am 11. Oktober 2026, Python 3.13.16, `python -m pytest tests -v`: **37 bestanden, 0 fehlgeschlagen** (9.4 s).
Alle Tests laufen offline gegen Simulator, Fixtures und gefälschte Transporte; kein Test ruft einen echten Broker oder ein Modell auf.

## Abnahmekriterien → Tests (`tests/test_abnahme.py`)

| Kriterium aus dem Auftrag | Test | Ergebnis |
|---|---|---|
| 200 USD Gesamtstart trotz zweier Anbieter; kein doppeltes Guthaben | `test_200_usd_gesamtstart_trotz_zweier_anbieter` | ✅ |
| Ziel 1'000 → 1'200 verhindert Zielabwicklung bei 1'000 | `test_zielaenderung_auf_1200_verhindert_abwicklung_bei_1000`, `test_automatik_aus_laesst_weiterlaufen` | ✅ |
| Änderung während laufender Verkäufe ohne Doppelorders abgeglichen (inkl. Teilfüllung) | `test_zielaenderung_waehrend_laufender_verkaeufe_ohne_doppelorder` | ✅ |
| Manuelle Teilentnahme unter Ziel, geänderte Verteilung, verschobene und verworfene Auszahlung; keine automatische Überweisung, kein falscher Erfolg | `test_manuelle_teilentnahme_unter_ziel_aenderung_verschieben_verwerfen` | ✅ |
| Genau 1'000 USD netto → 600/200/200 | `test_genau_1000_netto_ergibt_600_200_200`, `test_genau_1000_netto_im_ablauf` | ✅ |
| Anderes Ziel: keine Hochrechnung, sonst manuelle Aufteilung | `test_anderes_ziel_keine_hochrechnung` | ✅ |
| 1'000 Buchwert, 980 nach Ausführung → keine Auszahlung | `test_1000_buchwert_aber_980_nach_ausfuehrung_keine_auszahlung` (980.03 USD) | ✅ |
| Kursgewinne bei offenen Kosten: kein zu früher Erfolg | `test_kursgewinne_bei_offenen_kosten_kein_zu_frueher_erfolg` | ✅ |
| Verlust 200 → 50: keine Stop-Loss-Abschaltung | `test_verlust_von_200_auf_50_keine_stop_loss_abschaltung` | ✅ |
| Kein Kredit, Hebel, Leerverkauf, fremdes Konto, kein Zugriff aufs langfristige Depot | `test_kein_kredit_hebel_leerverkauf_fremdes_konto_oder_langfristdepot` | ✅ |
| JEV-Ausfall → keine modellbasierten Orders | `test_jev_ausfall_keine_modellbasierten_orders`, `test_jev_fehlt_und_testantwort_nur_im_entwicklungsmodus` | ✅ |
| Veraltete Kurse | `test_veraltete_kurse_blockieren` | ✅ |
| API-Timeout: Status abfragen statt neu senden | `test_api_timeout_fragt_status_nach_statt_neu_zu_senden`, `test_unklare_order_fuehrt_zu_technischer_pause` | ✅ |
| Doppelte Scheduler-Aufrufe | `test_doppelte_scheduler_aufrufe` | ✅ |
| Teilfüllung plus Neustart → keine Doppelorder | `test_teilfuellung_plus_neustart_keine_doppelorder` | ✅ |
| Auszahlungen manuell; unbestätigte Transfers starten keinen Zyklus; Geld in Transfer nicht doppelt gezählt; gescheiterte Überweisung wartet | `test_auszahlungen_bleiben_manuell_unbestaetigt_kein_neustart` | ✅ |
| Externe Einzahlungen kein Gewinn | `test_externe_einzahlung_ist_kein_gewinn` | ✅ |
| Kapital unter Mindestorder bleibt sichtbar | `test_kapital_unter_mindestorder_bleibt_sichtbar` | ✅ |
| PAPER ruft nie LIVE-Order-Endpunkte | `test_paper_ruft_nie_live_order_endpunkte`, `test_live_ohne_freigegebenes_mandat_gesperrt` | ✅ |
| Kostenlimit blockiert kostenpflichtige Arbeit, ohne Verluste wegzubuchen | `test_kostenlimit_blockiert_ohne_verluste_wegzubuchen` | ✅ |
| Kumulative Bilanz über erfolgreiche und gescheiterte Zyklen | `test_kumulative_bilanz_ueber_mehrere_zyklen` | ✅ |

## Weitere Tests (`tests/test_adapter.py`)

Kein Float für Geld; Kraken-Signatur gegen Krakens dokumentiertes Beispiel; Kraken-/IBKR-Antwortauswertung (fremde Ausführungen werden nicht
verbucht, IBKR-Bestätigungspflicht wird nicht automatisch bestätigt); JEV-Fragen und Schemaprüfung; Vertex-Endpunkt und -Auswertung;
Vertex ohne Budget/Preis ruft nicht auf; Gebührenkorrektur genau einmal verbucht; keine Positionsvergrösserung nach Verlusten;
Export und alle Seiten ohne Geheimnisse; Formular-Token; Oberflächenablauf.

## Ausserhalb der Testsuite geprüft

- Ein echter JEV-Aufruf (`python -m anlage.cli jev-pruefen --budget-usd 0.01`): `JEV_OK`, Modell `jev-1.13.0`, 876/106 Token, ≈ 0.000037 USD.
- Bestehende Website-Tests des Repositorys (`node --test tests/navigation.test.mjs tests/struktur.test.mjs tests/teilen.test.mjs`): 31/31 bestanden.
- Oberfläche in Chromium bei 390 px und 1280 px Breite angesehen; keine horizontale Verschiebung.

## Einzelergebnisse

```
tests/test_abnahme.py::test_200_usd_gesamtstart_trotz_zweier_anbieter PASSED
tests/test_abnahme.py::test_zielaenderung_auf_1200_verhindert_abwicklung_bei_1000 PASSED
tests/test_abnahme.py::test_automatik_aus_laesst_weiterlaufen PASSED
tests/test_abnahme.py::test_zielaenderung_waehrend_laufender_verkaeufe_ohne_doppelorder PASSED
tests/test_abnahme.py::test_manuelle_teilentnahme_unter_ziel_aenderung_verschieben_verwerfen PASSED
tests/test_abnahme.py::test_genau_1000_netto_ergibt_600_200_200 PASSED
tests/test_abnahme.py::test_genau_1000_netto_im_ablauf PASSED
tests/test_abnahme.py::test_anderes_ziel_keine_hochrechnung PASSED
tests/test_abnahme.py::test_1000_buchwert_aber_980_nach_ausfuehrung_keine_auszahlung PASSED
tests/test_abnahme.py::test_kursgewinne_bei_offenen_kosten_kein_zu_frueher_erfolg PASSED
tests/test_abnahme.py::test_verlust_von_200_auf_50_keine_stop_loss_abschaltung PASSED
tests/test_abnahme.py::test_kein_kredit_hebel_leerverkauf_fremdes_konto_oder_langfristdepot PASSED
tests/test_abnahme.py::test_jev_ausfall_keine_modellbasierten_orders PASSED
tests/test_abnahme.py::test_jev_fehlt_und_testantwort_nur_im_entwicklungsmodus PASSED
tests/test_abnahme.py::test_veraltete_kurse_blockieren PASSED
tests/test_abnahme.py::test_api_timeout_fragt_status_nach_statt_neu_zu_senden PASSED
tests/test_abnahme.py::test_unklare_order_fuehrt_zu_technischer_pause PASSED
tests/test_abnahme.py::test_doppelte_scheduler_aufrufe PASSED
tests/test_abnahme.py::test_teilfuellung_plus_neustart_keine_doppelorder PASSED
tests/test_abnahme.py::test_auszahlungen_bleiben_manuell_unbestaetigt_kein_neustart PASSED
tests/test_abnahme.py::test_externe_einzahlung_ist_kein_gewinn PASSED
tests/test_abnahme.py::test_kapital_unter_mindestorder_bleibt_sichtbar PASSED
tests/test_abnahme.py::test_paper_ruft_nie_live_order_endpunkte PASSED
tests/test_abnahme.py::test_live_ohne_freigegebenes_mandat_gesperrt PASSED
tests/test_abnahme.py::test_kostenlimit_blockiert_ohne_verluste_wegzubuchen PASSED
tests/test_abnahme.py::test_kumulative_bilanz_ueber_mehrere_zyklen PASSED
tests/test_adapter.py::test_kein_float_fuer_geld PASSED
tests/test_adapter.py::test_kraken_signatur_dokumentiertes_beispiel PASSED
tests/test_adapter.py::test_kraken_antworten_auswerten PASSED
tests/test_adapter.py::test_ibkr_antworten_und_bestaetigungspflicht PASSED
tests/test_adapter.py::test_jev_fragen_und_schema PASSED
tests/test_adapter.py::test_vertex_endpunkt_und_auswertung PASSED
tests/test_adapter.py::test_vertex_ohne_budget_und_ohne_preis_kein_aufruf PASSED
tests/test_adapter.py::test_gebuehrenkorrektur_einmal_verbucht PASSED
tests/test_adapter.py::test_keine_vergroesserung_nach_verlusten PASSED
tests/test_adapter.py::test_export_und_seiten_ohne_geheimnisse PASSED
tests/test_adapter.py::test_oberflaeche_ablauf PASSED
============================== 37 passed in 9.37s ==============================
```
