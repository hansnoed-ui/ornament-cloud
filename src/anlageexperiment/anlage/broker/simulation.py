"""Simulierter Broker für PAPER und die virtuellen Vergleichsdepots. Macht nie einen Netzwerkaufruf.

Ausführungsmodell (konservativ):
- Kauf nur, wenn der Briefkurs (Ask) zum Prüfzeitpunkt ≤ Limit ist; Ausführungspreis = Ask × (1 + Slippage), höchstens Limit.
- Verkauf nur, wenn der Geldkurs (Bid) ≥ Limit ist; Preis = Bid × (1 − Slippage), mindestens Limit.
- Ein Hoch/Tief-Wert (OHLC) löst nie eine Ausführung aus; es zählen nur Geld-/Briefkurs zu diskreten Zeitpunkten.
- Pro Prüfzeitpunkt höchstens ein Anteil der angezeigten Kursgrösse → Teilfüllungen.
- Wertpapiere nur zu Börsenzeiten, Abwicklung T+n Handelstage; Krypto sofort.
- Cash-Konto: kein Kredit, keine Leerverkäufe.
"""
from __future__ import annotations

from datetime import datetime, timedelta
from decimal import Decimal

from ..db import iso, transaktion
from ..geld import D, NULL, abrunden, aufrunden, text
from ..handelskosten import gebuehr, slippage
from ..konfig import Mandat
from ..marktdaten import Marktdaten, markt_offen
from .basis import Abgelehnt, Ausfuehrung, AuthStatus, BrokerAdapter, BrokerOrderStatus, NichtAngemeldet, OrderAuftrag, Zeitueberschreitung


def plus_handelstage(t: datetime, n: int) -> datetime:
    while n > 0:
        t += timedelta(days=1)
        if t.weekday() < 5:
            n -= 1
    return t


class SimBroker(BrokerAdapter):
    art = "simulation"
    live = False

    def __init__(self, conn, mandat: Mandat, depot: str, konto: str, marktdaten: Marktdaten, uhr):
        self.conn, self.mandat, self.depot, self.konto, self.md, self.uhr = conn, mandat, depot, konto, marktdaten, uhr
        self.stoerung: dict = {}   # Testhilfe: timeout_vor_annahme, timeout_nach_annahme, abgemeldet, status_timeout
        self._verbraucht: dict = {}  # (Instrument, Seite, Kurszeit) → bereits ausgeführte Menge: Liquidität eines Kurses gibt es nur einmal

    # -- Geldbewegungen, die in der Realität ich selbst beim Broker auslöse (nur Simulation)
    def sim_einzahlen(self, betrag: Decimal) -> None:
        self._cash_plus(D(betrag))

    def sim_auszahlen(self, betrag: Decimal) -> None:
        if self.bargeld() < D(betrag):
            raise Abgelehnt("Simulation: Auszahlung höher als Bargeld")
        self._cash_plus(-D(betrag))

    def _cash_plus(self, delta: Decimal) -> None:
        alt = self.bargeld()
        self.conn.execute("INSERT INTO sim_konto (depot, konto, waehrung, betrag) VALUES (?,?,?,?) "
                          "ON CONFLICT (depot, konto, waehrung) DO UPDATE SET betrag = excluded.betrag",
                          (self.depot, self.konto, "USD", text(alt + delta)))

    def _bestand_plus(self, iid: str, delta: Decimal) -> None:
        alt = self.bestaende().get(iid, NULL)
        self.conn.execute("INSERT INTO sim_bestand (depot, konto, instrument, menge) VALUES (?,?,?,?) "
                          "ON CONFLICT (depot, konto, instrument) DO UPDATE SET menge = excluded.menge",
                          (self.depot, self.konto, iid, text(alt + delta)))

    # -- Schnittstelle
    def anmeldung(self) -> AuthStatus:
        if self.stoerung.get("abgemeldet"):
            return AuthStatus(False, "Simulation: Sitzung abgelaufen (Testfall)")
        return AuthStatus(True, "Simulation")

    def bargeld(self) -> Decimal:
        r = self.conn.execute("SELECT betrag FROM sim_konto WHERE depot=? AND konto=? AND waehrung='USD'", (self.depot, self.konto)).fetchone()
        return D(r["betrag"]) if r else NULL

    def bestaende(self) -> dict[str, Decimal]:
        return {r["instrument"]: D(r["menge"]) for r in self.conn.execute(
            "SELECT instrument, menge FROM sim_bestand WHERE depot=? AND konto=?", (self.depot, self.konto)) if D(r["menge"]) != 0}

    def _offen(self):
        return self.conn.execute("SELECT * FROM sim_orders WHERE depot=? AND konto=? AND status IN ('OFFEN','TEILGEFUELLT')",
                                 (self.depot, self.konto)).fetchall()

    def sende(self, a: OrderAuftrag) -> BrokerOrderStatus:
        if self.stoerung.get("abgemeldet"):
            raise NichtAngemeldet("Simulation: nicht angemeldet")
        if self.stoerung.pop("timeout_vor_annahme", False):
            raise Zeitueberschreitung("Simulation: keine Antwort, Order nicht angekommen")
        alt = self.status(a.client_id)
        if alt is not None:          # Idempotenz: gleiche Client-ID → keine zweite Order
            return alt
        inst = self.mandat.instrument(a.instrument)
        if inst is None or inst.konto != self.konto:
            raise Abgelehnt("Instrument nicht auf diesem Konto handelbar")
        if a.seite == "VERKAUF":
            reserviert = sum((D(o["menge"]) - D(o["gefuellt"]) for o in self._offen() if o["seite"] == "VERKAUF" and o["instrument"] == a.instrument), NULL)
            if a.menge > self.bestaende().get(a.instrument, NULL) - reserviert:
                raise Abgelehnt("Leerverkauf nicht möglich (Cash-Konto)")
        elif a.seite == "KAUF":
            reserviert = sum(((D(o["menge"]) - D(o["gefuellt"])) * D(o["limit_preis"]) for o in self._offen() if o["seite"] == "KAUF"), NULL)
            if a.menge * a.limit_preis + gebuehr(self.mandat, self.konto, a.menge, a.limit_preis) > self.bargeld() - reserviert:
                raise Abgelehnt("Nicht genug Bargeld (kein Kredit)")
        else:
            raise Abgelehnt("Unbekannte Orderseite")
        with transaktion(self.conn):
            self.conn.execute("INSERT INTO sim_orders (depot, client_id, konto, instrument, seite, menge, limit_preis, status, erstellt, broker_ref) "
                              "VALUES (?,?,?,?,?,?,?,?,?,?)", (self.depot, a.client_id, self.konto, a.instrument, a.seite, text(a.menge),
                                                                 text(a.limit_preis), "OFFEN", iso(self.uhr()), f"SIM-{a.client_id}"))
        if self.stoerung.pop("timeout_nach_annahme", False):
            raise Zeitueberschreitung("Simulation: Order angenommen, Antwort verloren")
        return BrokerOrderStatus(a.client_id, "OFFEN", NULL, f"SIM-{a.client_id}")

    def status(self, client_id: str) -> BrokerOrderStatus | None:
        if self.stoerung.get("status_timeout"):
            raise Zeitueberschreitung("Simulation: Statusabfrage ohne Antwort")
        r = self.conn.execute("SELECT * FROM sim_orders WHERE depot=? AND client_id=?", (self.depot, client_id)).fetchone()
        if r is None:
            return None
        return BrokerOrderStatus(client_id, r["status"], D(r["gefuellt"]), r["broker_ref"])

    def storniere(self, client_id: str) -> None:
        self.conn.execute("UPDATE sim_orders SET status='STORNIERT' WHERE depot=? AND client_id=? AND status IN ('OFFEN','TEILGEFUELLT')",
                          (self.depot, client_id))

    def ausfuehrungen(self) -> list[Ausfuehrung]:
        return [Ausfuehrung(r["fill_id"], r["client_id"], r["konto"], r["instrument"], r["seite"], D(r["menge"]), D(r["preis"]),
                            D(r["gebuehr"]), _t(r["zeit"]), _t(r["abwicklung"]), D(r["mittelkurs"]) if r["mittelkurs"] else None)
                for r in self.conn.execute("SELECT * FROM sim_fills WHERE depot=? AND konto=? ORDER BY zeit, fill_id", (self.depot, self.konto))]

    def gebuehr_korrigieren(self, fill_id: str, neue_gebuehr: Decimal) -> None:
        """Testhilfe: Der Broker meldet nachträglich eine andere Gebühr."""
        r = self.conn.execute("SELECT gebuehr FROM sim_fills WHERE depot=? AND fill_id=?", (self.depot, fill_id)).fetchone()
        self._cash_plus(D(r["gebuehr"]) - D(neue_gebuehr))
        self.conn.execute("UPDATE sim_fills SET gebuehr=? WHERE depot=? AND fill_id=?", (text(neue_gebuehr), self.depot, fill_id))

    def verarbeite(self, jetzt: datetime) -> int:
        """Gleicht offene Orders gegen den aktuellen Geld-/Briefkurs ab. Gibt die Zahl neuer Ausführungen zurück."""
        neu = 0
        anteil = D(self.mandat.simulation["teilfuellung_anteil_quote"])
        slip = slippage(self.mandat)
        for o in self._offen():
            inst = self.mandat.instrument(o["instrument"])
            kurs = self.md.kurs(inst.id, jetzt)
            if kurs is None or not markt_offen(inst, jetzt) or kurs.zeit != jetzt:
                continue
            limit, rest = D(o["limit_preis"]), D(o["menge"]) - D(o["gefuellt"])
            if o["seite"] == "KAUF":
                if kurs.brief > limit:
                    continue
                preis = min(limit, aufrunden(kurs.brief * (1 + slip), inst.preis_schritt))
                verfuegbar = kurs.brief_menge * anteil
            else:
                if kurs.geld < limit:
                    continue
                preis = max(limit, abrunden(kurs.geld * (1 - slip), inst.preis_schritt))
                verfuegbar = kurs.geld_menge * anteil
            schluessel = (inst.id, o["seite"], kurs.zeit)
            menge = min(rest, abrunden(verfuegbar - self._verbraucht.get(schluessel, NULL), inst.mengen_schritt))
            if menge <= 0:
                continue
            self._verbraucht[schluessel] = self._verbraucht.get(schluessel, NULL) + menge
            gefuellt = D(o["gefuellt"]) + menge
            geb_ges = gebuehr(self.mandat, self.konto, gefuellt, preis)
            geb = max(NULL, geb_ges - D(o["gebuehr_bisher"]))
            nr = self.conn.execute("SELECT COUNT(*) FROM sim_fills WHERE depot=? AND client_id=?", (self.depot, o["client_id"])).fetchone()[0]
            tage = int(self.mandat.konten[self.konto]["abwicklung_handelstage"].get(inst.klasse, 0))
            with transaktion(self.conn):
                self.conn.execute("INSERT INTO sim_fills VALUES (?,?,?,?,?,?,?,?,?,?,?,?)",
                                  (self.depot, f"{o['client_id']}#{nr + 1}", o["client_id"], self.konto, inst.id, o["seite"], text(menge),
                                   text(preis), text(geb), text(kurs.mitte), iso(jetzt), iso(plus_handelstage(jetzt, tage))))
                status = "GEFUELLT" if gefuellt >= D(o["menge"]) else "TEILGEFUELLT"
                self.conn.execute("UPDATE sim_orders SET gefuellt=?, gebuehr_bisher=?, status=? WHERE depot=? AND client_id=?",
                                  (text(gefuellt), text(D(o["gebuehr_bisher"]) + geb), status, self.depot, o["client_id"]))
                vorz = 1 if o["seite"] == "KAUF" else -1
                self._cash_plus(-vorz * menge * preis - geb)
                self._bestand_plus(inst.id, vorz * menge)
            neu += 1
        return neu


def _t(s: str) -> datetime:
    from ..db import zeit
    return zeit(s)
