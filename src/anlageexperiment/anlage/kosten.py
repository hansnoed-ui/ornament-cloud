"""Kostenwächter für kostenpflichtige Modellaufrufe (Vertex AI, JEV).

- Ohne freigegebenes Budget (Mandat: freigegebenes_budget_usd > 0 und max_aufrufe_je_tag > 0) keine kostenpflichtigen Aufrufe.
- Vor jedem Aufruf wird konservativ reserviert (Schätzung × Aufschlag). Passt die Reservierung nicht ins Budget → Aufruf gesperrt.
- Nach dem Aufruf wird mit der gemeldeten Token-Zahl abgerechnet; fehlt sie, bleibt die Reservierung als Kosten stehen.
- Ohne bekannten Preis wird nichts reserviert und nichts aufgerufen (Status PREIS_UNBEKANNT).
- Die Abrechnung bei Google/TypeSafe kann verzögert sein; erfasste Beträge sind Schätzungen aus der Token-Zählung.
- Der Wächter bucht nie Verluste weg und berührt die Handelsbuchführung nicht.
Google-Budgetwarnungen sind keine harte Ausgabensperre – diese harte Sperre ist der Wächter selbst.
"""
from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime

from .db import iso, transaktion
from .geld import CENT, D, NULL, aufrunden, text

MIO = D("1000000")


@dataclass
class Reservierung:
    id: int | None
    erlaubt: bool
    grund: str
    betrag: object = NULL


class Kostenwaechter:
    def __init__(self, conn, mandat, uhr):
        self.conn, self.mandat, self.uhr = conn, mandat, uhr

    def _cfg(self, anbieter: str) -> dict:
        return self.mandat.betriebskosten[anbieter]

    def verbraucht(self, anbieter: str) -> dict:
        r = self.conn.execute("SELECT status, betrag FROM betriebskosten WHERE anbieter=? AND art='MODELL' AND status!='FREIGEGEBEN'", (anbieter,)).fetchall()
        erg = {"RESERVIERT": NULL, "OFFEN": NULL, "BEZAHLT": NULL}
        for x in r:
            erg[x["status"]] += D(x["betrag"])
        erg["summe"] = sum(erg.values(), NULL)
        return erg

    def aufrufe_heute(self, anbieter: str) -> int:
        tag = iso(self.uhr())[:10]
        return self.conn.execute("SELECT COUNT(*) FROM betriebskosten WHERE anbieter=? AND art='MODELL' AND substr(zeit,1,10)=?", (anbieter, tag)).fetchone()[0]

    def schaetzung(self, anbieter: str, tokens_ein: int, tokens_aus: int) -> object | None:
        c = self._cfg(anbieter)
        if c.get("preis_eingabe_usd_je_mio_token") is None or c.get("preis_ausgabe_usd_je_mio_token") is None:
            return None
        roh = D(tokens_ein) * D(c["preis_eingabe_usd_je_mio_token"]) / MIO + D(tokens_aus) * D(c["preis_ausgabe_usd_je_mio_token"]) / MIO
        return roh

    def reserviere(self, anbieter: str, tokens_ein: int, tokens_aus: int, zyklus_id: int | None) -> Reservierung:
        c = self._cfg(anbieter)
        budget = D(c["freigegebenes_budget_usd"])
        if budget <= 0 or int(c["max_aufrufe_je_tag"]) <= 0:
            return Reservierung(None, False, "KOSTENBUDGET_NICHT_FREIGEGEBEN")
        roh = self.schaetzung(anbieter, tokens_ein, tokens_aus)
        if roh is None:
            return Reservierung(None, False, "PREIS_UNBEKANNT")
        betrag = max(CENT / 100, aufrunden(roh * D(self.mandat.betriebskosten["reserve_aufschlag"]), D("0.000001")))
        with transaktion(self.conn):
            if self.aufrufe_heute(anbieter) >= int(c["max_aufrufe_je_tag"]):
                return Reservierung(None, False, "AUFRUFLIMIT_TAG_ERREICHT")
            if self.verbraucht(anbieter)["summe"] + betrag > budget:
                return Reservierung(None, False, "KOSTENBUDGET_ERSCHOEPFT")
            cur = self.conn.execute("INSERT INTO betriebskosten (zeit, zyklus_id, anbieter, art, status, betrag, notiz) VALUES (?,?,?,?,?,?,?)",
                                    (iso(self.uhr()), zyklus_id, anbieter, "MODELL", "RESERVIERT", text(betrag),
                                     f"Reservierung für ~{tokens_ein} Eingabe-/{tokens_aus} Ausgabe-Token"))
        return Reservierung(cur.lastrowid, True, "RESERVIERT", betrag)

    def abrechnen(self, res: Reservierung, tokens_ein: int | None, tokens_aus: int | None, referenz: str | None = None) -> None:
        if res.id is None:
            return
        if tokens_ein is None:
            self.conn.execute("UPDATE betriebskosten SET status='OFFEN', notiz=notiz || ' – keine Token-Angabe, Reservierung bleibt als Kosten' WHERE id=?", (res.id,))
            return
        ist = self.schaetzung(self._anbieter(res.id), tokens_ein, tokens_aus or 0)
        notiz = "Geschätzt aus Token-Zählung; Abrechnung beim Anbieter kann verzögert sein"
        if ist > res.betrag:
            notiz += f" – ACHTUNG: Ist-Kosten über Reservierung ({res.betrag}); Schätzfaktor im Mandat prüfen"
        self.conn.execute("UPDATE betriebskosten SET status='OFFEN', betrag=?, tokens_ein=?, tokens_aus=?, referenz=?, notiz=? WHERE id=?",
                          (text(ist), tokens_ein, tokens_aus, referenz, notiz, res.id))

    def fehlgeschlagen(self, res: Reservierung, grund: str) -> None:
        """Aufruf kam nicht zustande (z. B. Verbindungsfehler vor dem Senden) → Reservierung freigeben, mit Grund."""
        if res.id is not None:
            self.conn.execute("UPDATE betriebskosten SET status='FREIGEGEBEN', notiz=? WHERE id=?", (f"Freigegeben: {grund}"[:300], res.id))

    def _anbieter(self, kid: int) -> str:
        return self.conn.execute("SELECT anbieter FROM betriebskosten WHERE id=?", (kid,)).fetchone()["anbieter"]


def erfasse_betriebskosten(conn, zeit: datetime, zyklus_id: int | None, anbieter: str, art: str, betrag, status: str,
                           bezahlt_aus: str = "extern", notiz: str = "") -> int:
    """Manuelle Erfassung (Hosting, Daten, Zuschuss …). Zuschüsse werden sichtbar gebucht und mindern den Aufwand nicht."""
    if art not in ("DATEN", "HOSTING", "MODELL", "SONSTIGE", "ZUSCHUSS"):
        raise ValueError("Unbekannte Kostenart")
    if status not in ("OFFEN", "BEZAHLT"):
        raise ValueError("Status muss OFFEN oder BEZAHLT sein")
    if D(betrag) < 0:
        raise ValueError("Betrag muss positiv sein")
    cur = conn.execute("INSERT INTO betriebskosten (zeit, zyklus_id, anbieter, art, status, betrag, bezahlt_aus, notiz) VALUES (?,?,?,?,?,?,?,?)",
                       (iso(zeit), zyklus_id, anbieter, art, status, text(D(betrag)), bezahlt_aus, notiz))
    return cur.lastrowid
