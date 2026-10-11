"""Kommandozeile.

  python -m anlage.cli start                      Experiment starten (Simulation, 200 USD gesamt)
  python -m anlage.cli schritt [N]                N simulierte Stunden ausführen
  python -m anlage.cli lauf --intervall 60        Scheduler-Schleife (ein Prozess; Sperre verhindert Doppelläufe)
  python -m anlage.cli status                     Kurzbericht
  python -m anlage.cli export DATEI.json          Journal und Buchungen exportieren
  python -m anlage.cli jev-pruefen --budget-usd 0.01      EIN echter JEV-Aufruf mit Beispieldaten (Integrationsprüfung)
  python -m anlage.cli vertex-pruefen --budget-usd 0.05   EIN echter Vertex-Aufruf mit Beispieldaten
  python -m anlage.cli live-aktivieren --bestaetigung "…" nur LIVE-Modus, nur mit freigegebenem Mandat
"""
from __future__ import annotations

import argparse
import json
import sys
import time

from .db import verbinde
from .engine import Experiment
from .export import als_json
from .geld import usd
from .jev import JevAdapter
from .konfig import Einstellungen, lade_mandat
from .kosten import Kostenwaechter
from .vertex import VertexAdapter

BEISPIEL = {"instrument": {"id": "BTC/USD", "name": "Bitcoin (Spot)", "klasse": "krypto_spot"}, "signal": "KAUF",
            "kennzahlen": {"fenster": 24, "abstand": "0.012", "momentum": "0.018", "schwankung": "0.009"},
            "datenquelle": "KÜNSTLICHE BEISPIELDATEN (Integrationsprüfung)", "kuenstliche_daten": True}


def _pruef_waechter(anbieter: str, budget: str):
    """Eigener Wächter auf einer Wegwerf-Datenbank: das Budget gilt nur für diesen einen, von dir ausdrücklich angeforderten Aufruf."""
    m = lade_mandat()
    m.betriebskosten[anbieter] = {**m.betriebskosten[anbieter], "freigegebenes_budget_usd": budget, "max_aufrufe_je_tag": 1}
    conn = verbinde(":memory:")
    from datetime import datetime, timezone
    return Kostenwaechter(conn, m, lambda: datetime.now(timezone.utc).replace(microsecond=0)), conn


def main(argv=None) -> int:
    ap = argparse.ArgumentParser(prog="anlage")
    sub = ap.add_subparsers(dest="befehl", required=True)
    sub.add_parser("start")
    s = sub.add_parser("schritt"); s.add_argument("n", nargs="?", type=int, default=1)
    s = sub.add_parser("lauf"); s.add_argument("--intervall", type=float, default=60); s.add_argument("--max", type=int, default=0)
    sub.add_parser("status")
    s = sub.add_parser("export"); s.add_argument("datei")
    s = sub.add_parser("jev-pruefen"); s.add_argument("--budget-usd", required=True)
    s = sub.add_parser("vertex-pruefen"); s.add_argument("--budget-usd", required=True)
    s = sub.add_parser("live-aktivieren"); s.add_argument("--bestaetigung", required=True)
    a = ap.parse_args(argv)

    if a.befehl in ("jev-pruefen", "vertex-pruefen"):
        e = Einstellungen.aus_umgebung()
        if a.befehl == "jev-pruefen":
            e.jev_modus = "echt"
            w, conn = _pruef_waechter("jev", a.budget_usd)
            r = JevAdapter(e, w).bewerte({"daten": BEISPIEL, "anlagehypothese": "Der Kurs liegt über seinem 24-Stunden-Durchschnitt bei positivem Momentum.",
                                          "gegenargumente": ["Kurze, künstliche Datenreihe"], "strategiekriterien": ["Testkriterium"]}, None)
            print(json.dumps(r.als_dict(), ensure_ascii=False, indent=1))
        else:
            e.vertex_modus = "echt"
            w, conn = _pruef_waechter("vertex", a.budget_usd)
            r = VertexAdapter(e, w).analysiere(BEISPIEL, None)
            print(json.dumps(r.als_dict(), ensure_ascii=False, indent=1))
        for k in conn.execute("SELECT anbieter, status, betrag, tokens_ein, tokens_aus, notiz FROM betriebskosten"):
            print("Kosten:", dict(k))
        return 0 if r.status in ("JEV_OK", "VERTEX_OK") else 2

    x = Experiment()
    if a.befehl == "start":
        x.starten(); print("Gestartet.")
    elif a.befehl == "schritt":
        for _ in range(a.n):
            r = x.schritt()
            for o in r.get("orders", []):
                print(r["zeit"], o)
        print(x.zyklus()["zustand"])
    elif a.befehl == "lauf":
        n = 0
        while not a.max or n < a.max:
            r = x.schritt()
            print(r.get("zeit"), r.get("zustand") or r.get("status"), "; ".join(r.get("gruende", []))[:200], flush=True)
            n += 1
            time.sleep(a.intervall)
    elif a.befehl == "status":
        b = x.bewertung()
        z = x.zyklus()
        print(f"Modus {x.e.modus} · Mandat {x.m.version} ({x.m.status}, Hash {x.m.hash}) · Zyklus {z['nummer']} · {z['zustand']}")
        print(f"Handelskontowert {usd(b.handelskontowert) if b.handelskontowert is not None else '–'} USD · Netto-Liquidationswert "
              f"{usd(b.netto_liquidation) if b.netto_liquidation is not None else '–'} USD")
        for k, v in x.kumulativ().items():
            print(f"  {k}: {usd(v)}")
    elif a.befehl == "export":
        with open(a.datei, "w", encoding="utf-8") as f:
            f.write(als_json(x.conn, x.m, {"kumulativ": {k: str(v) for k, v in x.kumulativ().items()}}))
        print("Geschrieben:", a.datei)
    elif a.befehl == "live-aktivieren":
        x.live_aktivieren(a.bestaetigung); print("Live-Aktivierung gespeichert.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
