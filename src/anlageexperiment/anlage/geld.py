"""Geldrechnung ausschliesslich mit Decimal. Binäre Gleitkommazahlen werden für Geld und Mengen abgewiesen."""
from __future__ import annotations

from decimal import ROUND_DOWN, ROUND_HALF_EVEN, ROUND_UP, Decimal, getcontext

getcontext().prec = 34

NULL = Decimal("0")
CENT = Decimal("0.01")


def D(wert) -> Decimal:
    """Wandelt str/int/Decimal in Decimal. float ist verboten, damit keine Rundungsfehler ins Geld geraten."""
    if isinstance(wert, Decimal):
        return wert
    if isinstance(wert, bool):
        raise TypeError("Wahrheitswert ist kein Geldbetrag")
    if isinstance(wert, float):
        raise TypeError("Gleitkommazahl für Geld oder Menge verboten – als Text übergeben")
    if isinstance(wert, int):
        return Decimal(wert)
    if isinstance(wert, str):
        return Decimal(wert.strip().replace("'", ""))
    if wert is None:
        raise TypeError("Kein Betrag")
    raise TypeError(f"Unbekannter Typ für Betrag: {type(wert).__name__}")


def D_oder_null(wert) -> Decimal:
    return NULL if wert is None or wert == "" else D(wert)


def usd(betrag: Decimal) -> Decimal:
    """Rundung für Anzeige und Berichte in USD (kaufmännisch-gerade)."""
    return D(betrag).quantize(CENT, rounding=ROUND_HALF_EVEN)


def abrunden(wert: Decimal, schritt: Decimal) -> Decimal:
    """Auf ein Vielfaches von `schritt` abrunden (z. B. Mengenschritt eines Instruments)."""
    schritt = D(schritt)
    if schritt <= 0:
        raise ValueError("Schritt muss positiv sein")
    return (D(wert) / schritt).to_integral_value(rounding=ROUND_DOWN) * schritt


def aufrunden(wert: Decimal, schritt: Decimal) -> Decimal:
    schritt = D(schritt)
    return (D(wert) / schritt).to_integral_value(rounding=ROUND_UP) * schritt


def text(betrag: Decimal | None) -> str | None:
    """Speicherform in der Datenbank (exakt, ohne Exponentenschreibweise)."""
    if betrag is None:
        return None
    return format(D(betrag).normalize(), "f") if D(betrag) != 0 else "0"


def chf_format(betrag: Decimal, stellen: int = 2) -> str:
    """Schweizer Schreibweise mit Apostroph, z. B. 1'000.00."""
    q = Decimal(1).scaleb(-stellen)
    b = D(betrag).quantize(q, rounding=ROUND_HALF_EVEN)
    vorzeichen = "−" if b < 0 else ""
    ganz, _, rest = format(abs(b), "f").partition(".")
    gruppen = []
    while len(ganz) > 3:
        gruppen.insert(0, ganz[-3:])
        ganz = ganz[:-3]
    gruppen.insert(0, ganz)
    return vorzeichen + "'".join(gruppen) + ("." + rest if stellen else "")
