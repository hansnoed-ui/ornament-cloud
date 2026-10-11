"""Marktdaten: Instrumente, Geld-/Briefkurse, Zeitstempel, Marktstatus.

`FixtureMarktdaten` erzeugt KÜNSTLICHE BEISPIELDATEN (deterministischer Zufallspfad). Sie sind in jeder Anzeige als
künstlich markiert und taugen nicht als Backtest. `KrakenOeffentlich` liest öffentliche Kraken-Kurse (ohne Schlüssel,
kein Order-Endpunkt); in der Build-Umgebung war api.kraken.com gesperrt, der Adapter ist daher nicht live geprüft.
"""
from __future__ import annotations

import json
import math
import random
import urllib.request
from dataclasses import dataclass
from datetime import datetime, time, timedelta, timezone
from decimal import Decimal
from zoneinfo import ZoneInfo

from .geld import D, abrunden
from .konfig import Instrument, Mandat

BOERSENZEITEN = {
    "NASDAQ": ("America/New_York", time(9, 30), time(16, 0)),
    "NYSE": ("America/New_York", time(9, 30), time(16, 0)),
    "NYSEARCA": ("America/New_York", time(9, 30), time(16, 0)),
    "LSE": ("Europe/London", time(8, 0), time(16, 30)),
}
FEIERTAGE_HINWEIS = "Börsenfeiertage sind in der Simulation nicht abgebildet; der Live-Adapter muss den Marktstatus des Brokers verwenden."


def markt_offen(inst: Instrument, t: datetime) -> bool:
    if inst.klasse == "krypto_spot":
        return True
    zone, auf, zu = BOERSENZEITEN[inst.boerse]
    lokal = t.astimezone(ZoneInfo(zone))
    return lokal.weekday() < 5 and auf <= lokal.time() < zu


@dataclass(frozen=True)
class Kurs:
    instrument: str
    geld: Decimal          # Bid: zu diesem Preis kann man verkaufen
    brief: Decimal         # Ask: zu diesem Preis kann man kaufen
    letzter: Decimal
    geld_menge: Decimal
    brief_menge: Decimal
    zeit: datetime         # Zeitpunkt der Kursfeststellung
    waehrung: str
    quelle: str
    kuenstlich: bool
    markt_offen: bool

    @property
    def mitte(self) -> Decimal:
        return (self.geld + self.brief) / 2

    def alter_sekunden(self, jetzt: datetime) -> int:
        return int((jetzt - self.zeit).total_seconds())

    def als_dict(self) -> dict:
        return {"instrument": self.instrument, "geld": str(self.geld), "brief": str(self.brief), "letzter": str(self.letzter),
                "zeit": self.zeit.strftime("%Y-%m-%dT%H:%M:%SZ"), "waehrung": self.waehrung, "quelle": self.quelle,
                "kuenstlich": self.kuenstlich, "markt_offen": self.markt_offen}


class Marktdaten:
    name = "basis"
    kuenstlich = False

    def kurs(self, iid: str, jetzt: datetime) -> Kurs | None: ...
    def verlauf(self, iid: str, bis: datetime, n: int) -> list[tuple[datetime, Decimal]]: ...
    def wechselkurs(self, von: str, nach: str, jetzt: datetime) -> tuple[Decimal, datetime] | None:
        return (Decimal(1), jetzt) if von == nach else None


STARTPREISE = {"AAPL": "230", "MSFT": "420", "SPY": "650", "VWRA": "140", "BTC/USD": "65000", "ETH/USD": "2500"}
SCHWANKUNG = {"aktie": 0.004, "etf": 0.003, "krypto_spot": 0.010}
SPANNE = {"aktie": Decimal("0.0005"), "etf": Decimal("0.0004"), "krypto_spot": Decimal("0.0008")}
GROESSE = {"aktie": Decimal("100"), "etf": Decimal("100"), "krypto_spot": Decimal("2")}
SZENARIEN = {
    # Drift je Stunde (log), auf Handelsstunden bei Wertpapieren
    "standard": {"aktie": 0.0, "etf": 0.0, "krypto_spot": 0.0},
    # Ausdrücklich unrealistisches Demonstrationsszenario, nur um den Zyklusablauf bis zur Auszahlung vorzuführen
    "demo_ziel": {"aktie": 0.004, "etf": 0.003, "krypto_spot": 0.0075},
    "fallend": {"aktie": -0.002, "etf": -0.0015, "krypto_spot": -0.006},
}


class FixtureMarktdaten(Marktdaten):
    """KÜNSTLICHE BEISPIELDATEN: reproduzierbarer Zufallspfad. Keine echten Kurse, keine Prognose."""
    name = "fixture"
    kuenstlich = True

    def __init__(self, mandat: Mandat, szenario: str = "standard", seed: int | None = None, epoche: datetime | None = None):
        self.mandat = mandat
        self.szenario = szenario
        self.drift = SZENARIEN[szenario]
        self.seed = seed if seed is not None else int(mandat.simulation["seed"])
        self.start = datetime.strptime(mandat.simulation["startzeit_utc"], "%Y-%m-%dT%H:%M:%SZ").replace(tzinfo=timezone.utc)
        self.epoche = epoche or (self.start - timedelta(hours=400))
        self._pfade: dict[str, list[float]] = {}
        self.veraltet: set[str] = set()      # Testhilfe: Kurse dieser Instrumente gelten als alt
        self.ausfall: set[str] = set()       # Testhilfe: keine Kurse
        self.uebersteuert: dict[str, Decimal] = {}   # Testhilfe: fester Mittelkurs
        self.mengen: dict[str, Decimal] = {}         # Testhilfe: Kursgrösse (für Teilfüllungen)

    def _stunde(self, t: datetime) -> int:
        return int((t - self.epoche).total_seconds() // 3600)

    def _pfad(self, inst: Instrument, k: int) -> float:
        p = self._pfade.setdefault(inst.id, [math.log(float(STARTPREISE.get(inst.id, "100")))])
        if len(p) <= k:
            rng = random.Random(f"{self.seed}:{inst.id}:{len(p)}")
            vol, drift = SCHWANKUNG[inst.klasse], self.drift[inst.klasse]
            while len(p) <= k:
                t = self.epoche + timedelta(hours=len(p))
                d = drift if t >= self.start else 0.0      # Szenario-Drift erst ab Simulationsstart, Vorgeschichte neutral
                schritt = d + vol * rng.gauss(0, 1) if markt_offen(inst, t) else 0.0
                p.append(p[-1] + schritt)
        return p[k]

    def _mitte(self, inst: Instrument, t: datetime) -> Decimal:
        if inst.id in self.uebersteuert:
            return self.uebersteuert[inst.id]
        k = max(0, self._stunde(t))
        return D(f"{math.exp(self._pfad(inst, k)):.8f}")

    def _letzte_offene_stunde(self, inst: Instrument, t: datetime) -> datetime:
        s = t.replace(minute=0, second=0)
        for _ in range(24 * 6):
            if markt_offen(inst, s):
                return s
            s -= timedelta(hours=1)
        return s

    def kurs(self, iid: str, jetzt: datetime) -> Kurs | None:
        inst = self.mandat.instrument(iid)
        if inst is None or iid in self.ausfall:
            return None
        offen = markt_offen(inst, jetzt)
        kurszeit = jetzt if offen else self._letzte_offene_stunde(inst, jetzt)
        if iid in self.veraltet:
            kurszeit = jetzt - timedelta(hours=2)
        mitte = self._mitte(inst, kurszeit)
        halb = mitte * SPANNE[inst.klasse] / 2
        menge = self.mengen.get(iid, GROESSE[inst.klasse])
        geld = abrunden(mitte - halb, inst.preis_schritt)
        brief = abrunden(mitte + halb, inst.preis_schritt) + inst.preis_schritt
        return Kurs(iid, geld, brief, abrunden(mitte, inst.preis_schritt), menge, menge, kurszeit, inst.waehrung,
                    "KÜNSTLICHE BEISPIELDATEN", True, offen)

    def verlauf(self, iid: str, bis: datetime, n: int) -> list[tuple[datetime, Decimal]]:
        inst = self.mandat.instrument(iid)
        werte: list[tuple[datetime, Decimal]] = []
        t = bis.replace(minute=0, second=0)
        grenze = 0
        while len(werte) < n and grenze < 24 * 60 and t >= self.epoche:
            if markt_offen(inst, t):
                werte.append((t, self._mitte(inst, t)))
            t -= timedelta(hours=1)
            grenze += 1
        return list(reversed(werte))


class KrakenOeffentlich(Marktdaten):
    """Öffentliche Kraken-Kurse (Ticker, OHLC). Kein Schlüssel, kein Order-Endpunkt.
    NICHT LIVE GEPRÜFT: api.kraken.com war in der Build-Umgebung gesperrt. Ticker liefert keinen Kurszeitstempel;
    als Zeit gilt der Empfangszeitpunkt. Wertpapierkurse liefert dieser Adapter nicht (→ diese Instrumente bleiben blockiert)."""
    name = "kraken_oeffentlich"
    URL = "https://api.kraken.com/0/public"

    def __init__(self, mandat: Mandat, abrufen=None):
        self.mandat = mandat
        self._abrufen = abrufen or self._http

    @staticmethod
    def _http(url: str) -> dict:
        with urllib.request.urlopen(url, timeout=10) as r:
            return json.loads(r.read())

    def kurs(self, iid: str, jetzt: datetime) -> Kurs | None:
        inst = self.mandat.instrument(iid)
        if inst is None or inst.klasse != "krypto_spot" or not inst.kraken_paar:
            return None
        try:
            j = self._abrufen(f"{self.URL}/Ticker?pair={inst.kraken_paar}")
        except Exception:
            return None
        if j.get("error"):
            return None
        (_, t), = j["result"].items()
        return Kurs(iid, D(t["b"][0]), D(t["a"][0]), D(t["c"][0]), D(t["b"][2]), D(t["a"][2]), jetzt, "USD",
                    "Kraken öffentlich (Ticker)", False, True)

    def verlauf(self, iid: str, bis: datetime, n: int) -> list[tuple[datetime, Decimal]]:
        inst = self.mandat.instrument(iid)
        if inst is None or not inst.kraken_paar:
            return []
        try:
            j = self._abrufen(f"{self.URL}/OHLC?pair={inst.kraken_paar}&interval=60")
        except Exception:
            return []
        if j.get("error"):
            return []
        reihen = next(v for k, v in j["result"].items() if k != "last")
        werte = [(datetime.fromtimestamp(int(r[0]), timezone.utc), D(r[4])) for r in reihen]
        return [w for w in werte if w[0] <= bis][-n:]


def erzeuge_marktdaten(mandat: Mandat, art: str, szenario: str = "standard") -> Marktdaten:
    if art == "fixture":
        return FixtureMarktdaten(mandat, szenario)
    if art == "kraken_oeffentlich":
        return KrakenOeffentlich(mandat)
    raise ValueError(f"Unbekannte Marktdatenquelle: {art}")
