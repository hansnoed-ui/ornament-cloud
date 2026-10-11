"""Export des Entscheidungsjournals und aller relevanten Buchungen (CSV/JSON). Enthält nie Zugangsdaten."""
from __future__ import annotations

import csv
import io
import json

TABELLEN = ("buchungen", "orders", "fills", "entscheidungen", "zyklen", "zustandswechsel", "parameter_versionen",
            "auszahlungsplaene", "plan_versionen", "ueberweisungen", "betriebskosten", "werte", "reservierungen")


def tabelle(conn, name: str) -> list[dict]:
    if name not in TABELLEN:
        raise KeyError(name)
    return [dict(r) for r in conn.execute(f"SELECT * FROM {name} ORDER BY rowid")]


def als_csv(conn, name: str) -> str:
    zeilen = tabelle(conn, name)
    puffer = io.StringIO()
    if zeilen:
        w = csv.DictWriter(puffer, fieldnames=list(zeilen[0].keys()), delimiter=";")
        w.writeheader()
        w.writerows(zeilen)
    return puffer.getvalue()


def als_json(conn, mandat, zusatz: dict | None = None) -> str:
    daten = {"mandat": {"version": mandat.version, "hash": mandat.hash, "status": mandat.status},
             "hinweis": "Erfolg nach erfassten Kosten, vor persönlichen Steuern. Künstliche Beispieldaten sind als solche markiert.",
             **{t: tabelle(conn, t) for t in TABELLEN}, **(zusatz or {})}
    return json.dumps(daten, ensure_ascii=False, indent=1, default=str)
