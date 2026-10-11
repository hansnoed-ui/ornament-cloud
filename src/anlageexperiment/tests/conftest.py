import json
import sys
from decimal import Decimal
from pathlib import Path

import pytest

BASIS = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(BASIS))

from anlage.buchhaltung import buche  # noqa: E402
from anlage.db import verbinde, zeit  # noqa: E402
from anlage.engine import Experiment  # noqa: E402
from anlage.geld import D  # noqa: E402
from anlage.konfig import STANDARD_MANDAT, Einstellungen, lade_mandat  # noqa: E402
from anlage.marktdaten import FixtureMarktdaten  # noqa: E402

FLACH = {"AAPL": "100", "MSFT": "100", "SPY": "100", "VWRA": "140", "BTC/USD": "65000", "ETH/USD": "2500"}


def mandat_mit(tmp_path, aenderung=None):
    roh = json.loads(STANDARD_MANDAT.read_text())
    if aenderung:
        aenderung(roh)
    pfad = tmp_path / f"mandat-{abs(hash(json.dumps(roh, sort_keys=True)))}.json"
    pfad.write_text(json.dumps(roh, ensure_ascii=False))
    return lade_mandat(pfad)


class Fabrik:
    def __init__(self, tmp_path):
        self.tmp = tmp_path

    def __call__(self, *, aenderung=None, flach=True, starten=True, db="exp.sqlite3", szenario="standard", **einst):
        m = mandat_mit(self.tmp, aenderung)
        e = Einstellungen(datenbank=str(self.tmp / db), szenario=szenario, **einst)
        md = FixtureMarktdaten(m, szenario)
        if flach:
            md.uebersteuert.update({k: D(v) for k, v in FLACH.items()})
        x = Experiment(e, mandat=m, marktdaten=md, conn=verbinde(e.datenbank), **self.extra)
        if starten and x.zyklus()["zustand"] == "SETUP":
            x.starten()
        return x

    extra: dict = {}


@pytest.fixture
def fabrik(tmp_path):
    f = Fabrik(tmp_path)
    f.extra = {}
    return f


def kaufe_direkt(x, konto, iid, menge, preis, depot="haupt"):
    """Testhilfe: eine bereits ausgeführte Position konsistent in Buchführung und simuliertem Broker anlegen (kein Zufluss)."""
    m, p = D(menge), D(preis)
    z = x.zyklus()
    buche(x.conn, depot, z["id"], x.jetzt(), konto, "KAUF", -m * p, instrument=iid, menge=m, referenz=f"test-kauf-{iid}-{m}-{p}")
    b = x.broker[depot][konto]
    b._cash_plus(-m * p)
    b._bestand_plus(iid, m)


def setze_uhr(x, iso_zeit):
    x.conn.execute("UPDATE meta SET wert=? WHERE schluessel='uhr'", (iso_zeit,))


def zaehle(x, sql, *a):
    return x.conn.execute(sql, a).fetchone()[0]
