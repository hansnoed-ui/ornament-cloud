"""Vollständiger simulierter Zyklus inkl. manueller Auszahlungsbestätigung und Neustart.

    python skripte/beispielzyklus.py            schreibt docs/BEISPIELZYKLUS.md

Verwendet das ausdrücklich UNREALISTISCHE Demonstrationsszenario 'demo_ziel' (künstliche Kurse mit starker Aufwärtsdrift)
und markierte Testantworten für Vertex und JEV. Es zeigt nur den Ablauf, keine erreichbare Rendite.
"""
from __future__ import annotations

import sys
from pathlib import Path

BASIS = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(BASIS))

from anlage.db import verbinde  # noqa: E402
from anlage.engine import Experiment  # noqa: E402
from anlage.geld import chf_format, usd  # noqa: E402
from anlage.konfig import Einstellungen  # noqa: E402
from anlage.vergleich import vergleich  # noqa: E402

zeilen: list[str] = []


def log(s=""):
    print(s)
    zeilen.append(s)


def f(x):
    return chf_format(usd(x))


def main() -> None:
    x = Experiment(Einstellungen(datenbank=":memory:", szenario="demo_ziel", jev_modus="test", vertex_modus="test"), conn=verbinde(":memory:"))
    log("# Beispiel: ein vollständiger simulierter Zyklus")
    log()
    log("> Erzeugt mit `python skripte/beispielzyklus.py`. **Künstliches, absichtlich unrealistisches Demonstrationsszenario** "
        "(`demo_ziel`: starke Aufwärtsdrift) und **markierte Testantworten** für Vertex AI und JEV. "
        "Gezeigt wird der Ablauf der Zustandsmaschine – keine erreichbare Rendite, kein Backtest.")
    log()
    log("## 1. Start")
    x.starten()
    b = x.bewertung()
    log(f"- Experiment gestartet: {f(b.handelskontowert)} USD gesamt (IBKR {f(b.je_konto['ibkr']['bargeld'])}, Kraken {f(b.je_konto['kraken']['bargeld'])} – Simulationsbeispiel 100/100).")
    log("- Vergleichsdepots (ohne JEV, Kaufen und Halten) starten mit denselben Werten.")
    log()
    log("## 2. Handel bis zur Zielerreichung (Standardziel 1'000 USD)")
    alt = None
    for i in range(2000):
        r = x.schritt()
        if r["zustand"] != alt:
            b = x.bewertung()
            log(f"- {r['zeit']} · Zustand **{r['zustand']}** · Handelskontowert {f(b.handelskontowert)} USD")
            alt = r["zustand"]
        if r["zustand"] == "AUSZAHLUNG_AUSSTEHEND":
            break
    n_ent = x.conn.execute("SELECT COUNT(*) FROM entscheidungen WHERE depot='haupt'").fetchone()[0]
    n_ord = x.conn.execute("SELECT COUNT(*) FROM orders WHERE depot='haupt'").fetchone()[0]
    log(f"- {n_ent} journalisierte Entscheidungen, {n_ord} Orders im Hauptsystem.")
    log()
    log("Zustandswechsel:")
    log()
    log("| Zeit | von → nach | durch | Grund |")
    log("|---|---|---|---|")
    for w in x.conn.execute("SELECT * FROM zustandswechsel ORDER BY id"):
        log(f"| {w['zeit'][:16]} | {w['von'] or '–'} → {w['nach']} | {w['durch']} | {w['grund']} |")
    log()
    plan = x.conn.execute("SELECT * FROM auszahlungsplaene WHERE art='ZIEL'").fetchone()
    log("## 3. Auszahlungsvorschlag (nichts wird automatisch überwiesen)")
    log()
    log(f"- Verfügbares Bargeld: {f(plan['bargeld_gesamt'])} USD, bekannte Auszahlungskosten {f(plan['auszahlungskosten'])} USD, "
        f"verfügbarer Nettobetrag {f(plan['verfuegbar_netto'])} USD")
    log(f"- Vorschlag: **{f(plan['an_mich'])} an dich**, **{f(plan['langfrist'])} ins langfristige Depot**, **{f(plan['neustart'])} bleiben als Neustartkapital**")
    log(f"- Hinweis: {plan['hinweis']}")
    log()
    log("## 4. Deine Schritte")
    x.plan_bestaetigen(plan["id"])
    log("- Plan bestätigt → Überweisungen GEPLANT:")
    for u in x.conn.execute("SELECT * FROM ueberweisungen WHERE plan_id=?", (plan["id"],)).fetchall():
        log(f"  - #{u['id']} {u['konto']} → {u['art']} {f(u['betrag'])} USD")
    for u in x.conn.execute("SELECT * FROM ueberweisungen WHERE plan_id=?", (plan["id"],)).fetchall():
        x.ueberweisung_ausgefuehrt(u["id"], "beim Anbieter selbst ausgelöst")
    r = x.schritt()
    k = x.kumulativ()
    log(f"- Alle als «ausgeführt» gemeldet → Zustand bleibt **{r['zustand']}**; in Transfer {f(k['in_transfer'])} USD "
        f"(zählt weder als aktives Kapital noch als bestätigter Eingang).")
    for u in x.conn.execute("SELECT * FROM ueberweisungen WHERE plan_id=?", (plan["id"],)).fetchall():
        x.ueberweisung_bestaetigt(u["id"], f"BANK-REF-{u['id']:04d}", "Kontoauszug")
    r = x.schritt()
    log(f"- Eingänge mit Referenz bestätigt, Restkapital über beide Konten abgeglichen → **{r['zustand']}**")
    neu = x.neustart()
    z = x.zyklus()
    log(f"- Neustart von dir ausgelöst → Zyklus {z['nummer']} im Zustand **{z['zustand']}** mit {f(z['startkapital'])} USD (kein Nachschuss)")
    for _ in range(24):
        x.schritt()
    log()
    log("## 5. Kumulative Bilanz nach dem Neustart (+24 h)")
    log()
    k = x.kumulativ()
    log("| Posten | USD |")
    log("|---|---:|")
    for name, schl in (("Einzahlungen gesamt", "einzahlungen"), ("An dich ausgezahlt (bestätigt)", "ausgezahlt_bestaetigt"),
                       ("Ins langfristige Depot (bestätigt)", "langfrist_bestaetigt"), ("In Transfer", "in_transfer"),
                       ("Aktives Kapital", "aktives_kapital"), ("Handelsgebühren", "handelsgebuehren"),
                       ("Auszahlungskosten (vom Konto)", "betriebskosten_vom_konto"), ("Externe Betriebskosten", "betriebskosten_extern"),
                       ("Ergebnis nach erfassten Kosten, vor Steuern", "ergebnis_nach_kosten")):
        log(f"| {name} | {f(k[schl])} |")
    log()
    log("## 6. Vergleich (gemeinsames Zeitfenster, nur Funktionstest bei künstlichen Daten)")
    log()
    v = vergleich(x.conn, x.m.startkapital)
    log("| Depot | Endwert inkl. abgeflossener Beträge | Nettoergebnis | Gebühren | Orders mit Ausführung | Max. Rückgang (Messwert) |")
    log("|---|---:|---:|---:|---:|---:|")
    for d in v["depots"]:
        log(f"| {d['name']} | {f(d['endwert'])} | {f(d['nettoergebnis'])} | {f(d['handelsgebuehren'])} | {d['handelszahl']} | {d['max_rueckgang'] * 100:.1f} % |")
    log()
    log(f"_{v['hinweis']}_")
    ziel = BASIS / "docs" / "BEISPIELZYKLUS.md"
    ziel.write_text("\n".join(zeilen) + "\n", encoding="utf-8")
    print(f"\ngeschrieben: {ziel.relative_to(BASIS)}")


if __name__ == "__main__":
    main()
