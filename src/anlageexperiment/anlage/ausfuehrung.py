"""Ausführung: Orders mit stabilen Client-IDs senden, abgleichen und Ausführungen idempotent verbuchen.

Grundsätze
- Eine Order wird zuerst als NEU gespeichert, dann gesendet. Gleiche Client-ID → nie eine zweite Order.
- Bei Zeitüberschreitung wird der Status UNKLAR und beim Broker nachgefragt – nie blind erneut gesendet.
- Ausführungen (Fills) werden über ihre Broker-ID genau einmal verbucht; spätere Gebührenkorrekturen als Differenz.
- Nur ein aktiver Ausführungsprozess je Depot (Sperre mit Ablaufzeit).
"""
from __future__ import annotations

import os
import time
import uuid
from dataclasses import dataclass, field
from datetime import datetime

from .broker.basis import Abgelehnt, BrokerFehler, NichtAngemeldet, OrderAuftrag, PaperSchutzVerletzung, Zeitueberschreitung
from .buchhaltung import OFFENE_ORDERSTATUS, bargeld, bestaende, buche
from .db import iso, transaktion
from .geld import D, NULL, text
from .mandatspruefung import OrderVorschlag

PROZESS_ID = f"{os.getpid()}-{uuid.uuid4().hex[:8]}"


class Sperre:
    """Prozessübergreifende Sperre in der Datenbank. Läuft nach `dauer_s` ab (abgestürzter Prozess blockiert nicht ewig)."""

    def __init__(self, conn, name: str, dauer_s: float = 300, inhaber: str | None = None):
        self.conn, self.name, self.dauer, self.inhaber = conn, name, dauer_s, inhaber or PROZESS_ID
        self.gehalten = False

    def erwerben(self) -> bool:
        with transaktion(self.conn):
            r = self.conn.execute("SELECT inhaber, ablauf FROM sperren WHERE name=?", (self.name,)).fetchone()
            if r and r["ablauf"] > time.time() and r["inhaber"] != self.inhaber:
                return False
            self.conn.execute("INSERT INTO sperren (name, inhaber, ablauf) VALUES (?,?,?) ON CONFLICT(name) DO UPDATE SET inhaber=excluded.inhaber, ablauf=excluded.ablauf",
                              (self.name, self.inhaber, time.time() + self.dauer))
        self.gehalten = True
        return True

    def freigeben(self) -> None:
        if self.gehalten:
            self.conn.execute("DELETE FROM sperren WHERE name=? AND inhaber=?", (self.name, self.inhaber))
            self.gehalten = False

    def __enter__(self):
        return self.erwerben()

    def __exit__(self, *a):
        self.freigeben()


@dataclass
class Abgleich:
    unklar: list[str] = field(default_factory=list)
    neue_ausfuehrungen: int = 0
    abweichungen: list[str] = field(default_factory=list)
    nicht_angemeldet: list[str] = field(default_factory=list)


class Orderverwaltung:
    def __init__(self, conn, mandat, depot: str, broker: dict, uhr):
        self.conn, self.mandat, self.depot, self.broker, self.uhr = conn, mandat, depot, broker, uhr

    def order(self, client_id: str):
        return self.conn.execute("SELECT * FROM orders WHERE client_id=?", (client_id,)).fetchone()

    def offene(self, konto: str | None = None, instrument: str | None = None):
        platz = ",".join("?" * len(OFFENE_ORDERSTATUS))
        sql = f"SELECT * FROM orders WHERE depot=? AND status IN ({platz})"
        args: tuple = (self.depot, *OFFENE_ORDERSTATUS)
        if konto:
            sql += " AND konto=?"
            args += (konto,)
        if instrument:
            sql += " AND instrument=?"
            args += (instrument,)
        return self.conn.execute(sql, args).fetchall()

    def sende(self, client_id: str, v: OrderVorschlag, zyklus_id: int | None, entscheidung_id: int | None = None,
              plan_id: int | None = None) -> str:
        """Speichert die Order (NEU) und sendet sie. Gibt den Status zurück. Bereits bekannte Client-ID → kein zweiter Versand."""
        jetzt = self.uhr()
        with transaktion(self.conn):
            if self.order(client_id) is not None:
                return self.order(client_id)["status"]
            self.conn.execute("INSERT INTO orders (client_id, depot, zyklus_id, konto, instrument, seite, typ, menge, limit_preis, status, zweck, "
                              "entscheidung_id, plan_id, erstellt, aktualisiert) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)",
                              (client_id, self.depot, zyklus_id, v.konto, v.instrument, v.seite, v.typ, text(v.menge), text(v.limit_preis),
                               "NEU", v.zweck, entscheidung_id, plan_id, iso(jetzt), iso(jetzt)))
        auftrag = OrderAuftrag(client_id, v.konto, v.instrument, v.seite, v.typ, v.menge, v.limit_preis)
        try:
            st = self.broker[v.konto].sende(auftrag)
            self._setze(client_id, st.status, broker_ref=st.broker_ref, gesendet=True)
            return st.status
        except Zeitueberschreitung as e:
            self._setze(client_id, "UNKLAR", notiz=f"Zeitüberschreitung beim Senden: {e} – Status wird abgefragt, nicht neu gesendet", gesendet=True)
            return "UNKLAR"
        except PaperSchutzVerletzung as e:
            self._setze(client_id, "ABGELEHNT", notiz=f"PAPER-Schutz: {e}")
            raise
        except NichtAngemeldet as e:
            self._setze(client_id, "ABGELEHNT", notiz=f"Nicht angemeldet, nicht gesendet: {e}")
            return "ABGELEHNT"
        except (Abgelehnt, BrokerFehler) as e:
            self._setze(client_id, "ABGELEHNT", notiz=str(e)[:300])
            return "ABGELEHNT"

    def _setze(self, client_id: str, status: str, *, broker_ref=None, notiz=None, gesendet=False) -> None:
        jetzt = iso(self.uhr())
        self.conn.execute("UPDATE orders SET status=?, aktualisiert=?, broker_ref=COALESCE(?, broker_ref), notiz=COALESCE(?, notiz), "
                          "gesendet=CASE WHEN ? THEN COALESCE(gesendet, ?) ELSE gesendet END WHERE client_id=?",
                          (status, jetzt, broker_ref, notiz, 1 if gesendet else 0, jetzt, client_id))

    def storniere(self, client_id: str, grund: str) -> None:
        o = self.order(client_id)
        if o is None or o["status"] not in OFFENE_ORDERSTATUS:
            return
        if o["status"] == "NEU":
            self._setze(client_id, "STORNIERT", notiz=grund)
            return
        try:
            self.broker[o["konto"]].storniere(client_id)
            self.conn.execute("UPDATE orders SET notiz=? WHERE client_id=?", (f"Storno angefragt: {grund}", client_id))
        except Zeitueberschreitung:
            self._setze(client_id, "UNKLAR", notiz=f"Storno ohne Antwort ({grund}) – Status wird abgefragt")
        except BrokerFehler as e:
            self.conn.execute("UPDATE orders SET notiz=? WHERE client_id=?", (f"Storno fehlgeschlagen: {e}", client_id))

    def abgleichen(self, konten: list[str] | None = None, toleranz=D("0.01")) -> Abgleich:
        erg = Abgleich()
        for konto, adapter in self.broker.items():
            if konten and konto not in konten:
                continue
            try:
                self._fills_buchen(adapter)
                erg.neue_ausfuehrungen += self._letzte_neue
            except Zeitueberschreitung as e:
                erg.unklar.append(f"{konto}: Ausführungen nicht abrufbar ({e})")
                continue
            except NichtAngemeldet as e:
                erg.nicht_angemeldet.append(f"{konto}: {e}")
                continue
            for o in self.offene(konto):
                try:
                    st = adapter.status(o["client_id"])
                except Zeitueberschreitung:
                    erg.unklar.append(f"{o['client_id']}: Status nicht abrufbar")
                    continue
                except NichtAngemeldet as e:
                    erg.nicht_angemeldet.append(f"{konto}: {e}")
                    break
                if st is None:
                    if o["status"] in ("NEU", "UNKLAR"):
                        self._setze(o["client_id"], "NICHT_ANGEKOMMEN", notiz="Beim Broker unbekannt: nie angekommen, nicht neu gesendet")
                    else:
                        erg.unklar.append(f"{o['client_id']}: beim Broker nicht mehr auffindbar")
                        self._setze(o["client_id"], "UNKLAR", notiz="Order beim Broker nicht auffindbar")
                    continue
                self._setze(o["client_id"], st.status, broker_ref=st.broker_ref)
            # Kontostand abgleichen: Broker gegen Buchführung
            try:
                b_cash, b_best = adapter.bargeld(), adapter.bestaende()
            except (Zeitueberschreitung, BrokerFehler) as e:
                erg.unklar.append(f"{konto}: Kontostand nicht abrufbar ({e})")
                continue
            l_cash = bargeld(self.conn, self.depot, konto, self.uhr()).gesamt
            if abs(b_cash - l_cash) > toleranz:
                erg.abweichungen.append(f"{konto}: Bargeld laut Broker {b_cash} ≠ Buchführung {l_cash}")
            l_best = {iid: m for (k, iid), m in bestaende(self.conn, self.depot, konto).items()}
            for iid in set(b_best) | set(l_best):
                if b_best.get(iid, NULL) != l_best.get(iid, NULL):
                    erg.abweichungen.append(f"{konto}/{iid}: Bestand laut Broker {b_best.get(iid, NULL)} ≠ Buchführung {l_best.get(iid, NULL)}")
        return erg

    _letzte_neue = 0

    def _fills_buchen(self, adapter) -> None:
        self._letzte_neue = 0
        for f in adapter.ausfuehrungen():
            o = self.order(f.client_id)
            if o is None or o["depot"] != self.depot:
                continue
            with transaktion(self.conn):
                cur = self.conn.execute("INSERT INTO fills (fill_id, depot, client_id, konto, instrument, seite, menge, preis, gebuehr, mittelkurs, zeit, abwicklung) "
                                        "VALUES (?,?,?,?,?,?,?,?,?,?,?,?) ON CONFLICT (depot, fill_id) DO NOTHING",
                                        (f.fill_id, self.depot, f.client_id, f.konto, f.instrument, f.seite, text(f.menge), text(f.preis),
                                         text(f.gebuehr), text(f.mittelkurs) if f.mittelkurs is not None else None, iso(f.zeit), iso(f.abwicklung)))
                if cur.rowcount == 1:
                    self._letzte_neue += 1
                    wert = f.menge * f.preis
                    if f.seite == "KAUF":
                        buche(self.conn, self.depot, o["zyklus_id"], f.zeit, f.konto, "KAUF", -wert, instrument=f.instrument, menge=f.menge,
                              referenz=f"fill:{f.fill_id}", notiz=f"{f.menge} {f.instrument} @ {f.preis}")
                    else:
                        buche(self.conn, self.depot, o["zyklus_id"], f.zeit, f.konto, "VERKAUF", wert, instrument=f.instrument, menge=-f.menge,
                              verfuegbar_ab=f.abwicklung, referenz=f"fill:{f.fill_id}", notiz=f"{f.menge} {f.instrument} @ {f.preis}")
                    if f.gebuehr:
                        buche(self.conn, self.depot, o["zyklus_id"], f.zeit, f.konto, "GEBUEHR", -f.gebuehr, referenz=f"geb:{f.fill_id}",
                              notiz=f"Gebühr {f.client_id}")
                else:
                    alt = self.conn.execute("SELECT gebuehr FROM fills WHERE depot=? AND fill_id=?", (self.depot, f.fill_id)).fetchone()
                    diff = f.gebuehr - D(alt["gebuehr"])
                    if diff != 0:
                        buche(self.conn, self.depot, o["zyklus_id"], self.uhr(), f.konto, "GEBUEHR_KORREKTUR", -diff,
                              referenz=f"gebkorr:{f.fill_id}:{text(f.gebuehr)}", notiz=f"Gebührenkorrektur {D(alt['gebuehr'])} → {f.gebuehr}")
                        self.conn.execute("UPDATE fills SET gebuehr=? WHERE depot=? AND fill_id=?", (text(f.gebuehr), self.depot, f.fill_id))
                summe = sum((D(r["menge"]) for r in self.conn.execute("SELECT menge FROM fills WHERE depot=? AND client_id=?", (self.depot, f.client_id))), NULL)
                self.conn.execute("UPDATE orders SET gefuellt=? WHERE client_id=?", (text(summe), f.client_id))
