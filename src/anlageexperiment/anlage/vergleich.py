"""Virtuelle Vergleichsdepots und Messwerte.

- v_ohne_jev: gleiche Kandidaten und Grundlogik, ohne JEV, mit vorab festgelegter Ersatzentscheidung (siehe Mandat).
- v_kaufen_halten: vor Beginn festgelegte Kaufen-und-Halten-Referenz.
Beide starten mit denselben Startwerten, sehen dieselben Datenzeitpunkte und dieselben Kostenannahmen (Gebühren, Spannen,
Slippage, Teilfüllungen). Modellkosten fallen nur im Hauptsystem an und werden dort mitgerechnet.
Der maximale zwischenzeitliche Rückgang ist nur ein Messwert, nie eine Stop-Regel. Ein einzelner Lauf belegt keinen Vorteil von JEV.
"""
from __future__ import annotations

from decimal import Decimal

from .buchhaltung import externe_kosten
from .geld import D, NULL

NAMEN = {"haupt": "Hauptsystem (mit Vertex + JEV)", "v_ohne_jev": "Virtuell: ohne JEV (Ersatzregel)", "v_kaufen_halten": "Virtuell: Kaufen und Halten"}


def gesamtwert(conn, depot: str, handelskontowert: Decimal) -> Decimal:
    """Vergleichbarer Gesamtwert: aktives Kapital + bereits abgeflossene Beträge (Auszahlungen, Übertragungen) − externe Kosten
    − spätere Einzahlungen (externe Zuflüsse zählen nie als Ergebnis)."""
    def summe(sql, *a):
        return sum((D(r[0]) for r in conn.execute(sql, a)), NULL)
    spaeter = summe("SELECT betrag FROM buchungen WHERE depot=? AND art='EINZAHLUNG' AND (referenz IS NULL OR referenz NOT LIKE 'start:%')", depot)
    if depot != "haupt":
        return handelskontowert - spaeter
    abgeflossen = summe("SELECT betrag FROM ueberweisungen WHERE status IN ('AUSGEFUEHRT_GEMELDET','BESTAETIGT')")
    return handelskontowert + abgeflossen - externe_kosten(conn)["summe"] - spaeter


def messwerte(conn, depot: str, startkapital: Decimal, von: str | None = None, bis: str | None = None) -> dict:
    sql = "SELECT zeit, gesamt_inkl_entnahmen FROM werte WHERE depot=?"
    args: list = [depot]
    if von:
        sql += " AND zeit >= ?"
        args.append(von)
    if bis:
        sql += " AND zeit <= ?"
        args.append(bis)
    reihe = [(r[0], D(r[1])) for r in conn.execute(sql + " ORDER BY zeit", args)]
    gipfel, max_rueckgang = None, NULL
    for _, w in reihe:
        gipfel = w if gipfel is None or w > gipfel else gipfel
        if gipfel and gipfel > 0:
            max_rueckgang = max(max_rueckgang, (gipfel - w) / gipfel)
    gebuehren = -sum((D(r[0]) for r in conn.execute("SELECT betrag FROM buchungen WHERE depot=? AND art IN ('GEBUEHR','GEBUEHR_KORREKTUR','KONTOGEBUEHR')", (depot,))), NULL)
    implizit = NULL
    for r in conn.execute("SELECT menge, preis, mittelkurs FROM fills WHERE depot=? AND mittelkurs IS NOT NULL", (depot,)):
        implizit += abs(D(r["preis"]) - D(r["mittelkurs"])) * D(r["menge"])
    betrieb = externe_kosten(conn)["summe"] if depot == "haupt" else NULL
    handel = conn.execute("SELECT COUNT(DISTINCT client_id) FROM fills WHERE depot=?", (depot,)).fetchone()[0]
    ende = reihe[-1][1] if reihe else startkapital
    return {"depot": depot, "name": NAMEN[depot], "start": reihe[0][0] if reihe else None, "ende_zeit": reihe[-1][0] if reihe else None,
            "endwert": ende, "nettoergebnis": ende - startkapital, "handelsgebuehren": gebuehren, "spanne_slippage_implizit": implizit,
            "betriebskosten": betrieb, "handelszahl": handel, "max_rueckgang": max_rueckgang, "reihe": reihe}


def vergleich(conn, startkapital: Decimal) -> dict:
    zeiten = [conn.execute("SELECT MIN(zeit), MAX(zeit) FROM werte WHERE depot=?", (d,)).fetchone() for d in NAMEN]
    if any(z[0] is None for z in zeiten):
        return {"fenster": None, "depots": []}
    von, bis = max(z[0] for z in zeiten), min(z[1] for z in zeiten)
    return {"fenster": (von, bis), "depots": [messwerte(conn, d, startkapital, von, bis) for d in NAMEN],
            "hinweis": "Gemeinsames Zeitfenster, gleiche Startwerte und Datenzeitpunkte. Das Hauptsystem enthält Auszahlungen/Übertragungen "
                       "(als abgeflossene Beträge mitgezählt) und seine Modellkosten; die virtuellen Depots zahlen nichts aus. "
                       "Ein einzelner Lauf beweist keinen kausalen Vorteil von JEV. Bei künstlichen Daten ist der Vergleich nur ein Funktionstest."}
