"""Gebührenmodelle je Anbieter (konfiguriert im Mandat, Quellen dort vermerkt)."""
from __future__ import annotations

from decimal import Decimal

from .geld import CENT, D, NULL, aufrunden
from .konfig import Mandat


def gebuehr(mandat: Mandat, konto: str, menge: Decimal, preis: Decimal) -> Decimal:
    """Gebühr für eine (Teil-)Ausführung mit kumulierter Menge `menge` zum Preis `preis` – auf den Cent aufgerundet."""
    menge, preis = D(menge), D(preis)
    if menge <= 0:
        return NULL
    m = mandat.handelskosten[konto]
    wert = menge * preis
    if m["modell"] == "je_stueck_mit_min_max":
        g = max(D(m["min_je_order_usd"]), menge * D(m["je_stueck_usd"]))
        g = min(g, wert * D(m["max_anteil_handelswert"]))
    elif m["modell"] == "prozent":
        g = wert * D(m["taker_anteil"])
    else:
        raise ValueError(f"Unbekanntes Gebührenmodell {m['modell']}")
    return aufrunden(g, CENT)


def slippage(mandat: Mandat) -> Decimal:
    return D(mandat.handelskosten["slippage_anteil"])


def limit_aufschlag(mandat: Mandat) -> Decimal:
    return D(mandat.handelskosten["marktfaehiges_limit_aufschlag"])
