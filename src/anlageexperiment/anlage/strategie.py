"""Erste Forschungsstrategie (forschung-0.1.0) – ENTWICKLUNGSANNAHME, nicht als Live-Strategie freigegeben.

Regel: Trendfolge mit Bargeld als Normalzustand.
- KAUF-Signal: kein Bestand, Kurs über dem gleitenden Durchschnitt, Momentum ≥ Mindestwert, Schwankung ≤ Höchstwert.
- VERKAUF-Signal: Bestand vorhanden und Kurs um mehr als das Ausstiegsband unter dem Durchschnitt (Trendbruch).
  Das ist eine Strategieregel auf den Kursverlauf, keine Verlustgrenze auf das Kapital.
- Sonst HALTEN. Keine Mindestzahl an Trades.
Positionsgrösse: fester Anteil des aktuellen Kontowerts, gedeckelt durch Orderlimit und freies Geld. Nach Verlusten
wird nie vergrössert; die Grösse folgt nur dem aktuellen Wert. Kein Risikoaufschlag, weil das Ziel noch nicht erreicht ist.
"""
from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime
from decimal import Decimal

from .geld import CENT, D, NULL, abrunden, aufrunden
from .handelskosten import gebuehr, limit_aufschlag
from .konfig import Instrument, Mandat
from .marktdaten import Kurs


@dataclass
class Signal:
    art: str                 # KAUF | VERKAUF | HALTEN
    grund: str
    kennzahlen: dict


def _q(x: Decimal) -> str:
    return str(x.quantize(Decimal("0.00001")))


def signal(verlauf: list[tuple[datetime, Decimal]], kurs: Kurs, hat_bestand: bool, p: dict) -> Signal:
    n_min = int(p["min_historie"])
    if len(verlauf) < n_min:
        return Signal("HALTEN", f"Zu wenig Historie ({len(verlauf)} < {n_min})", {})
    fenster, mom_n = int(p["durchschnitt_stunden"]), int(p["momentum_stunden"])
    preise = [w for _, w in verlauf]
    jetzt = kurs.mitte
    schnitt = sum(preise[-fenster:], NULL) / fenster
    momentum = jetzt / preise[-mom_n - 1] - 1 if len(preise) > mom_n else NULL
    renditen = [(preise[i] / preise[i - 1]).ln() for i in range(len(preise) - fenster, len(preise)) if i > 0]
    m = sum(renditen, NULL) / len(renditen)
    schwankung = (sum(((r - m) ** 2 for r in renditen), NULL) / max(1, len(renditen) - 1)).sqrt()
    abstand = jetzt / schnitt - 1
    k = {"fenster": fenster, "durchschnitt": _q(schnitt), "abstand": _q(abstand), "momentum": _q(momentum),
         "schwankung": _q(schwankung), "kurs_mitte": _q(jetzt), "historie_punkte": len(preise),
         "historie_von": verlauf[0][0].strftime("%Y-%m-%dT%H:%M:%SZ"), "historie_bis": verlauf[-1][0].strftime("%Y-%m-%dT%H:%M:%SZ")}
    if hat_bestand:
        if abstand < -D(p["ausstieg_band"]):
            return Signal("VERKAUF", f"Trendbruch: Kurs {abstand:.2%} unter {fenster}-h-Durchschnitt", k)
        return Signal("HALTEN", "Bestand halten: kein Trendbruch", k)
    if abstand > 0 and momentum >= D(p["min_momentum"]) and schwankung <= D(p["max_schwankung_stunde"]):
        return Signal("KAUF", f"Kurs {abstand:.2%} über Durchschnitt, Momentum {momentum:.2%}, Schwankung {schwankung:.2%}/h", k)
    return Signal("HALTEN", "Kaufkriterien nicht alle erfüllt", k)


def kauf_limit(mandat: Mandat, inst: Instrument, kurs: Kurs) -> Decimal:
    """Marktfähiges Limit: Briefkurs plus kleiner Aufschlag (begrenzt Slippage, keine Wunschpreise)."""
    return aufrunden(kurs.brief * (1 + limit_aufschlag(mandat)), inst.preis_schritt)


def verkauf_limit(mandat: Mandat, inst: Instrument, kurs: Kurs) -> Decimal:
    return abrunden(kurs.geld * (1 - limit_aufschlag(mandat)), inst.preis_schritt)


def kaufmenge(mandat: Mandat, inst: Instrument, kurs: Kurs, konto_wert: Decimal, frei: Decimal) -> tuple[Decimal | None, str]:
    p = mandat.strategie
    limit = kauf_limit(mandat, inst, kurs)
    reserve = D(mandat.konten[inst.konto]["gebuehrenreserve_usd"])
    budget = min(D(p["zielanteil_je_position"]) * konto_wert, D(mandat.limits["max_order_usd"]), frei - reserve)
    # Gebühr abziehen (konservativ mit Mindestgebühr gerechnet)
    budget -= gebuehr(mandat, inst.konto, abrunden(max(budget, NULL) / limit, inst.mengen_schritt) or inst.mindest_menge, limit)
    if budget <= 0:
        return None, "Kein freies Geld nach Gebührenreserve"
    menge = abrunden(budget / limit, inst.mengen_schritt)
    if menge < inst.mindest_menge or menge * limit < inst.mindest_betrag_usd:
        return None, f"Möglicher Betrag {budget.quantize(CENT)} USD unter Mindestorder (Mindestmenge {inst.mindest_menge}{', nur ganze Anteile' if not inst.bruchstuecke else ''})"
    return menge, "ok"


# ------------------------------------------------------------------------------------- Bewertungsregel ----

def kombiniere(sig: Signal, analyse, jev, regel: dict) -> tuple[str, str]:
    """Versionierte Regel (jev-regel-0.1.0): verbindet Regelsignal, Vertex-Analyse und JEV-Bewertung."""
    if sig.art == "HALTEN":
        return "ABWARTEN", sig.grund
    if analyse is None or not analyse.nutzbar:
        return "ABWARTEN", f"Keine nutzbare Analyse ({getattr(analyse, 'status', 'fehlt')}) – keine modellbasierte Order"
    if jev is None or not jev.nutzbar:
        return "ABWARTEN", f"{getattr(jev, 'status', 'JEV_FEHLT')} – keine modellbasierte Order"
    a = jev.antworten
    aktion, konf = a["aktion"]["choice"], a["aktion"]["confidence"]
    if aktion == "WEITER_PRUEFEN":
        return "WEITER_PRUEFEN", f"JEV: weiter prüfen (Konfidenz {konf:.2f})"
    if aktion == "ABWARTEN":
        return "ABWARTEN", f"JEV: abwarten (Konfidenz {konf:.2f})"
    maengel = []
    if konf < float(regel["min_konfidenz_aktion"]):
        maengel.append(f"Konfidenz {konf:.2f} < {regel['min_konfidenz_aktion']}")
    if a["belegt"]["noul"] < float(regel["min_belegt"]):
        maengel.append(f"belegt {a['belegt']['noul']:.2f} < {regel['min_belegt']}")
    if a["widerspruch"]["noul"] > float(regel["max_widerspruch"]):
        maengel.append(f"Widerspruch {a['widerspruch']['noul']:.2f} > {regel['max_widerspruch']}")
    if a["passung"]["score"] < float(regel["min_passung"]):
        maengel.append(f"Passung {a['passung']['score']:.2f} < {regel['min_passung']}")
    if maengel:
        return "ABWARTEN", "JEV schlug eine Order vor, Regel nicht erfüllt: " + "; ".join(maengel)
    return "ORDER_VORSCHLAGEN", f"Signal {sig.art}; JEV: Order angemessen (Konfidenz {konf:.2f}, belegt {a['belegt']['noul']:.2f}, Passung {a['passung']['score']:.1f})"


def ersatzregel_ohne_jev(sig: Signal) -> tuple[str, str]:
    """Vorab festgelegte Ersatzentscheidung des virtuellen Vergleichsdepots ohne JEV."""
    if sig.art in ("KAUF", "VERKAUF"):
        return "ORDER_VORSCHLAGEN", f"Ersatzregel ohne JEV: Signal {sig.art}"
    return "ABWARTEN", sig.grund
