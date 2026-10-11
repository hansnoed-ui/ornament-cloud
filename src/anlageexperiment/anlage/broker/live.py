"""Live-Adapter für Kraken Pro (Krypto-Spot) und Interactive Brokers (Aktien/ETFs, Client Portal Web API).

EHRLICHER STAND (11.10.2026): Beide Adapter sind nach der öffentlichen Dokumentationsstruktur gebaut, aber NICHT gegen
ein Konto oder einen echten Endpunkt geprüft. In der Build-Umgebung waren die Hosts von Kraken und IBKR gesperrt, und es
existiert kein Konto. Signatur und Antwortauswertung sind mit Fixtures getestet.

Schutz: Jeder Order-Weg (senden, stornieren) prüft VOR jeder Netzwerkverbindung die Live-Freigabe. In PAPER oder ohne
freigegebenes Mandat wird PaperSchutzVerletzung ausgelöst und kein Byte gesendet. Auszahlungs-Endpunkte sind nicht
implementiert. Logins werden nicht automatisiert; abgelaufene Sitzungen führen zu einer sichtbaren technischen Pause.
"""
from __future__ import annotations

import base64
import hashlib
import hmac
import json
import re
import ssl
import time
import urllib.parse
import urllib.request
from datetime import datetime, timedelta, timezone
from decimal import Decimal

from ..geld import D, NULL
from ..konfig import Mandat
from .basis import (Abgelehnt, Ausfuehrung, AuthStatus, BrokerAdapter, BrokerFehler, BrokerOrderStatus, NichtAngemeldet,
                    OrderAuftrag, PaperSchutzVerletzung, Zeitueberschreitung)
from .simulation import plus_handelstage


def http_transport(methode: str, url: str, kopf: dict, rumpf: bytes | None, ssl_kontext=None, timeout: float = 10):
    req = urllib.request.Request(url, data=rumpf, method=methode, headers=kopf)
    try:
        with urllib.request.urlopen(req, timeout=timeout, context=ssl_kontext) as r:
            return r.status, json.loads(r.read() or b"null")
    except TimeoutError as e:
        raise Zeitueberschreitung(str(e)) from e
    except urllib.error.HTTPError as e:
        return e.code, None
    except urllib.error.URLError as e:
        if isinstance(e.reason, TimeoutError):
            raise Zeitueberschreitung(str(e)) from e
        raise BrokerFehler(f"Verbindung fehlgeschlagen: {e.reason}") from e


def json_mit_dezimal(obj) -> bytes:
    """JSON mit exakten Dezimalzahlen als Zahl-Literal (ohne Umweg über float)."""
    roh = json.dumps(obj, default=lambda d: f"__DEZ__{format(d, 'f')}__" if isinstance(d, Decimal) else str(d))
    return re.sub(r'"__DEZ__(-?[0-9.]+)__"', r"\1", roh).encode()


class LiveAdapter(BrokerAdapter):
    live = True

    def __init__(self, konto: str, freigabe, transport=None):
        self.konto = konto
        self._freigabe = freigabe          # callable → (bool, grund)
        self._transport = transport or http_transport

    def _order_weg_pruefen(self) -> None:
        ok, grund = self._freigabe()
        if not ok:
            raise PaperSchutzVerletzung(f"Order-Endpunkt gesperrt: {grund}")


# ------------------------------------------------------------------------------------------------ Kraken ----

KRAKEN_ASSET = {"XBTUSD": "XXBT", "ETHUSD": "XETH"}


def kraken_signatur(pfad: str, daten: dict, geheimnis_b64: str) -> str:
    """API-Sign = Base64(HMAC-SHA512(Base64-Decode(secret), pfad + SHA256(nonce + POST-Daten)))."""
    post = urllib.parse.urlencode(daten)
    sha = hashlib.sha256((str(daten["nonce"]) + post).encode()).digest()
    mac = hmac.new(base64.b64decode(geheimnis_b64), pfad.encode() + sha, hashlib.sha512)
    return base64.b64encode(mac.digest()).decode()


def kraken_userref(client_id: str) -> int:
    """Kraken erlaubt eine 32-Bit-Benutzerreferenz; abgeleitet aus der stabilen Client-ID."""
    return int(hashlib.sha256(client_id.encode()).hexdigest()[:7], 16)


class KrakenAdapter(LiveAdapter):
    art = "kraken"
    URL = "https://api.kraken.com"

    def __init__(self, mandat: Mandat, schluessel: str | None, geheimnis: str | None, freigabe, conn, transport=None):
        super().__init__("kraken", freigabe, transport)
        self.mandat, self._k, self._g, self.conn = mandat, schluessel, geheimnis, conn
        self._nonce = int(time.time() * 1000)

    def _privat(self, methode: str, daten: dict | None = None) -> dict:
        if not (self._k and self._g):
            raise NichtAngemeldet("KRAKEN_API_KEY/KRAKEN_API_SECRET fehlen")
        self._nonce = max(self._nonce + 1, int(time.time() * 1000))
        daten = {"nonce": self._nonce, **(daten or {})}
        pfad = f"/0/private/{methode}"
        kopf = {"API-Key": self._k, "API-Sign": kraken_signatur(pfad, daten, self._g),
                "Content-Type": "application/x-www-form-urlencoded; charset=utf-8"}
        status, j = self._transport("POST", self.URL + pfad, kopf, urllib.parse.urlencode(daten).encode())
        if status != 200 or j is None:
            raise BrokerFehler(f"Kraken HTTP {status}")
        if j.get("error"):
            fehler = ";".join(j["error"])
            if "Invalid key" in fehler or "Permission denied" in fehler:
                raise NichtAngemeldet(f"Kraken: {fehler}")
            raise Abgelehnt(f"Kraken: {fehler}")
        return j["result"]

    def _paar(self, iid: str) -> str:
        return self.mandat.instrument(iid).kraken_paar

    def anmeldung(self) -> AuthStatus:
        try:
            self._privat("Balance")
            return AuthStatus(True, "Kraken-Schlüssel gültig (Auszahlungsrecht kann die App nicht prüfen – beim Anlegen weglassen)")
        except NichtAngemeldet as e:
            return AuthStatus(False, str(e))
        except BrokerFehler as e:
            return AuthStatus(False, f"Kraken nicht erreichbar: {e}")

    def sende(self, a: OrderAuftrag) -> BrokerOrderStatus:
        self._order_weg_pruefen()
        r = self._privat("AddOrder", {"ordertype": "limit", "type": "buy" if a.seite == "KAUF" else "sell", "volume": format(a.menge, "f"),
                                      "pair": self._paar(a.instrument), "price": format(a.limit_preis, "f"), "userref": kraken_userref(a.client_id)})
        txid = (r.get("txid") or [None])[0]
        return BrokerOrderStatus(a.client_id, "OFFEN", NULL, txid)

    def _suche(self, client_id: str) -> tuple[str, dict] | None:
        ref = kraken_userref(client_id)
        for methode, feld in (("OpenOrders", "open"), ("ClosedOrders", "closed")):
            r = self._privat(methode, {"userref": ref})
            for txid, o in (r.get(feld) or {}).items():
                if int(o.get("userref") or 0) == ref:
                    return txid, o
        return None

    @staticmethod
    def status_aus_antwort(client_id: str, txid: str, o: dict) -> BrokerOrderStatus:
        ausgef = D(o.get("vol_exec", "0"))
        st = o.get("status")
        if st == "closed":
            s = "GEFUELLT"
        elif st in ("canceled", "expired"):
            s = "STORNIERT"
        else:
            s = "TEILGEFUELLT" if ausgef > 0 else "OFFEN"
        return BrokerOrderStatus(client_id, s, ausgef, txid)

    def status(self, client_id: str) -> BrokerOrderStatus | None:
        treffer = self._suche(client_id)
        return None if treffer is None else self.status_aus_antwort(client_id, *treffer)

    def storniere(self, client_id: str) -> None:
        self._order_weg_pruefen()
        treffer = self._suche(client_id)
        if treffer:
            self._privat("CancelOrder", {"txid": treffer[0]})

    def ausfuehrungen(self) -> list[Ausfuehrung]:
        r = self._privat("TradesHistory")
        return self.ausfuehrungen_aus_antwort(r, self.conn, self.mandat)

    @staticmethod
    def ausfuehrungen_aus_antwort(r: dict, conn, mandat: Mandat) -> list[Ausfuehrung]:
        erg = []
        for tid, t in (r.get("trades") or {}).items():
            o = conn.execute("SELECT client_id, instrument FROM orders WHERE broker_ref=? AND konto='kraken'", (t["ordertxid"],)).fetchone()
            if o is None:
                continue          # fremde Ausführung (nicht von dieser App) → nicht verbuchen, im Abgleich sichtbar
            zt = datetime.fromtimestamp(float(t["time"]), timezone.utc).replace(microsecond=0)
            erg.append(Ausfuehrung(f"kraken:{tid}", o["client_id"], "kraken", o["instrument"], "KAUF" if t["type"] == "buy" else "VERKAUF",
                                   D(t["vol"]), D(t["price"]), D(t["fee"]), zt, zt))
        return erg

    def bargeld(self) -> Decimal:
        return D(self._privat("Balance").get("ZUSD", "0"))

    def bestaende(self) -> dict[str, Decimal]:
        b = self._privat("Balance")
        erg = {}
        for inst in self.mandat.instrumente_fuer("kraken"):
            asset = KRAKEN_ASSET.get(inst.kraken_paar or "")
            if asset and D(b.get(asset, "0")) != 0:
                erg[inst.id] = D(b[asset])
        return erg


# ------------------------------------------------------------------------------------------------ IBKR ----

IBKR_STATUS = {"Submitted": "OFFEN", "PreSubmitted": "OFFEN", "PendingSubmit": "OFFEN", "Filled": "GEFUELLT",
               "Cancelled": "STORNIERT", "Inactive": "ABGELEHNT", "PendingCancel": "OFFEN"}


class IbkrAdapter(LiveAdapter):
    """Client Portal Web API über das lokal laufende Gateway (Anmeldung erfolgt durch dich im Browser, inkl. 2FA)."""
    art = "ibkr"

    def __init__(self, mandat: Mandat, gateway: str, konto_id: str, freigabe, conn, transport=None):
        super().__init__("ibkr", freigabe, transport)
        self.mandat, self.gw, self.acct, self.conn = mandat, gateway.rstrip("/"), konto_id, conn
        host = urllib.parse.urlparse(self.gw).hostname
        self._ssl = None
        if host in ("localhost", "127.0.0.1"):
            # Das Gateway nutzt lokal ein selbst signiertes Zertifikat (offizielle Anleitung: curl -k). Nur für localhost.
            self._ssl = ssl.create_default_context()
            self._ssl.check_hostname = False
            self._ssl.verify_mode = ssl.CERT_NONE

    def _ruf(self, methode: str, pfad: str, rumpf=None):
        kopf = {"Content-Type": "application/json", "User-Agent": "anlageexperiment/1"}
        daten = json_mit_dezimal(rumpf) if rumpf is not None else None
        status, j = self._transport(methode, self.gw + pfad, kopf, daten, self._ssl)
        if status == 401:
            raise NichtAngemeldet("IBKR: Sitzung nicht angemeldet oder abgelaufen")
        if status != 200:
            raise BrokerFehler(f"IBKR HTTP {status}")
        return j

    def _conid(self, iid: str) -> int:
        c = self.mandat.instrument(iid).ibkr_conid
        if not c:
            raise Abgelehnt(f"IBKR conid für {iid} fehlt in der Mandatskonfiguration")
        return int(c)

    def anmeldung(self) -> AuthStatus:
        try:
            j = self._ruf("POST", "/iserver/auth/status")
        except NichtAngemeldet as e:
            return AuthStatus(False, str(e))
        except BrokerFehler as e:
            return AuthStatus(False, f"IBKR-Gateway nicht erreichbar: {e}")
        if not (j or {}).get("authenticated"):
            return AuthStatus(False, "IBKR_SITZUNG_ABGELAUFEN – bitte im Gateway neu anmelden", j or {})
        if (j or {}).get("competing"):
            return AuthStatus(False, "IBKR: konkurrierende Sitzung aktiv", j)
        try:
            self._ruf("POST", "/tickle")      # dokumentierter Keep-Alive, keine Umgehung der Anmeldung
        except BrokerFehler:
            pass
        return AuthStatus(True, "IBKR angemeldet", j)

    def sende(self, a: OrderAuftrag) -> BrokerOrderStatus:
        self._order_weg_pruefen()
        rumpf = {"orders": [{"conid": self._conid(a.instrument), "orderType": "LMT", "side": "BUY" if a.seite == "KAUF" else "SELL",
                             "quantity": a.menge, "price": a.limit_preis, "tif": "DAY", "cOID": a.client_id}]}
        j = self._ruf("POST", f"/iserver/account/{self.acct}/orders", rumpf)
        return self.sende_antwort(a.client_id, j)

    @staticmethod
    def sende_antwort(client_id: str, j) -> BrokerOrderStatus:
        eintrag = (j or [{}])[0] if isinstance(j, list) else (j or {})
        if "order_id" in eintrag:
            return BrokerOrderStatus(client_id, IBKR_STATUS.get(eintrag.get("order_status", ""), "OFFEN"), NULL, str(eintrag["order_id"]))
        if "id" in eintrag and "message" in eintrag:
            # Warnhinweis mit Bestätigungspflicht: wird bewusst NICHT automatisch bestätigt.
            raise Abgelehnt(f"IBKR verlangt Bestätigung, nicht automatisch bestätigt: {' '.join(map(str, eintrag['message']))[:200]}")
        raise BrokerFehler(f"IBKR: unerwartete Antwort {str(j)[:200]}")

    def status(self, client_id: str) -> BrokerOrderStatus | None:
        j = self._ruf("GET", "/iserver/account/orders")
        for o in (j or {}).get("orders", []):
            if o.get("order_ref") == client_id:
                ausgef = D(str(o.get("filledQuantity", "0")))
                s = IBKR_STATUS.get(o.get("status", ""), "OFFEN")
                if s == "OFFEN" and ausgef > 0:
                    s = "TEILGEFUELLT"
                return BrokerOrderStatus(client_id, s, ausgef, str(o.get("orderId")))
        return None

    def storniere(self, client_id: str) -> None:
        self._order_weg_pruefen()
        st = self.status(client_id)
        if st and st.broker_ref:
            self._ruf("DELETE", f"/iserver/account/{self.acct}/order/{st.broker_ref}")

    def ausfuehrungen(self) -> list[Ausfuehrung]:
        j = self._ruf("GET", "/iserver/account/trades") or []
        erg = []
        for t in j:
            o = self.conn.execute("SELECT client_id, instrument FROM orders WHERE client_id=? AND konto='ibkr'", (t.get("order_ref"),)).fetchone()
            if o is None:
                continue
            zt = datetime.fromtimestamp(int(t["trade_time_r"]) / 1000, timezone.utc).replace(microsecond=0)
            erg.append(Ausfuehrung(f"ibkr:{t['execution_id']}", o["client_id"], "ibkr", o["instrument"],
                                   "KAUF" if t.get("side") == "B" else "VERKAUF", D(str(t["size"])), D(str(t["price"])),
                                   D(str(t.get("commission", "0"))), zt, plus_handelstage(zt, 1)))
        return erg

    def bargeld(self) -> Decimal:
        j = self._ruf("GET", f"/portfolio/{self.acct}/ledger") or {}
        return D(str(j.get("USD", {}).get("cashbalance", "0")))

    def bestaende(self) -> dict[str, Decimal]:
        j = self._ruf("GET", f"/portfolio/{self.acct}/positions/0") or []
        nach_conid = {i.ibkr_conid: i.id for i in self.mandat.instrumente_fuer("ibkr") if i.ibkr_conid}
        return {nach_conid[p["conid"]]: D(str(p["position"])) for p in j if p.get("conid") in nach_conid and p.get("position")}
