"""Feste Mandatsprüfung. Jede Order – egal ob aus Strategie, Zielabwicklung, Entnahme oder manuellem Schliessen –
muss diese Prüfung bestehen. Nur typisierte Vorschläge mit geprüften Instrument-IDs kommen hier an.

Bewusst NICHT enthalten: eine kapital- oder kursabhängige Verlustschwelle, Stop-Loss oder Drawdown-Abschaltung.
"""
from __future__ import annotations

from dataclasses import asdict, dataclass, field
from datetime import datetime
from decimal import Decimal

from .buchhaltung import bargeld, bestaende, frei_bestand, frei_fuer_kauf
from .geld import D, NULL
from .handelskosten import gebuehr, limit_aufschlag
from .konfig import HANDELSKONTEN, Mandat
from .marktdaten import Kurs, markt_offen

ZWECKE = ("STRATEGIE", "ZIELABWICKLUNG", "ENTNAHME", "SCHLIESSEN", "REFERENZ")
HANDELND = ("SIMULATION", "AKTIV", "VIRTUELL")
ZUSTAENDE_VERKAUF = {
    "STRATEGIE": HANDELND,
    "REFERENZ": ("VIRTUELL",),
    "ZIELABWICKLUNG": ("ZIEL_ABWICKLUNG",),
    "ENTNAHME": ("SIMULATION", "AKTIV", "MANUELL_PAUSIERT", "NICHT_HANDELSFAEHIG"),
    "SCHLIESSEN": ("SIMULATION", "AKTIV", "MANUELL_PAUSIERT", "NICHT_HANDELSFAEHIG", "ZIEL_ABWICKLUNG"),
}


@dataclass(frozen=True)
class OrderVorschlag:
    konto: str
    instrument: str
    seite: str
    menge: Decimal
    limit_preis: Decimal
    zweck: str
    typ: str = "LIMIT"


@dataclass
class Pruefung:
    ok: bool
    gruende: list[str] = field(default_factory=list)
    werte: dict = field(default_factory=dict)

    def als_dict(self) -> dict:
        return {"ok": self.ok, "gruende": self.gruende, "werte": {k: str(v) for k, v in self.werte.items()}}


def pruefe_order(conn, mandat: Mandat, depot: str, zustand: str, v: OrderVorschlag, kurse: dict[str, Kurs | None], jetzt: datetime,
                 modus: str, live_freigabe: bool) -> Pruefung:
    g: list[str] = []
    w: dict = {}
    kurs = kurse.get(v.instrument)

    # Form: nur typisierte Aktionen
    if v.typ != "LIMIT":
        g.append(f"Ordertyp {v.typ} nicht erlaubt (nur Limit)")
    if v.seite not in ("KAUF", "VERKAUF"):
        g.append(f"Orderseite {v.seite} nicht erlaubt")
    if v.zweck not in ZWECKE:
        g.append(f"Unbekannter Orderzweck {v.zweck}")
    if v.konto not in HANDELSKONTEN:
        g.append(f"Konto {v.konto} ist kein Handelskonto des Experiments (fremdes oder langfristiges Depot gesperrt)")
        return Pruefung(False, g, w)

    inst = mandat.instrument(v.instrument)
    if inst is None:
        g.append(f"Instrument {v.instrument} nicht im freigegebenen Universum")
        return Pruefung(False, g, w)
    if not inst.aktiv:
        g.append(f"{inst.id} ist deaktiviert")
    if inst.klasse not in mandat.erlaubte_klassen:
        g.append(f"Anlageklasse {inst.klasse} nicht erlaubt")
    if inst.konto != v.konto:
        g.append(f"{inst.id} gehört zu Konto {inst.konto}, nicht {v.konto}")
    if modus == "LIVE" and inst.nur_simulation:
        g.append(f"{inst.id} ist nur für die Simulation zugelassen")

    # Menge und Preis
    menge, limit = D(v.menge), D(v.limit_preis)
    if menge <= 0:
        g.append("Menge muss positiv sein")
    elif menge % inst.mengen_schritt != 0:
        g.append(f"Menge {menge} passt nicht zum Mengenschritt {inst.mengen_schritt}")
    if menge > 0 and menge < inst.mindest_menge:
        g.append(f"Menge unter Mindestmenge {inst.mindest_menge}")
    if limit <= 0:
        g.append("Limit muss positiv sein")
    elif menge * limit < inst.mindest_betrag_usd:
        g.append(f"Orderwert unter Mindestbetrag {inst.mindest_betrag_usd} USD")

    # Daten: Aktualität, Marktstatus, Herkunft
    if kurs is None:
        g.append(f"Keine Marktdaten für {inst.id}")
    else:
        alter = kurs.alter_sekunden(jetzt)
        max_alter = int(mandat.limits["preisalter_max_sekunden"][inst.klasse])
        w["preisalter_s"] = alter
        if alter > max_alter or alter < 0:
            g.append(f"Kurs veraltet ({alter} s > {max_alter} s)")
        if not markt_offen(inst, jetzt):
            g.append(f"Markt für {inst.id} geschlossen – keine sofortige Ausführung möglich")
        if modus == "LIVE" and kurs.kuenstlich:
            g.append("Künstliche Beispieldaten dürfen im LIVE-Modus nie Orders auslösen")
        auf = limit_aufschlag(mandat) * 2
        if v.seite == "KAUF" and limit > kurs.brief * (1 + auf):
            g.append("Kauflimit unplausibel weit über dem Briefkurs")
        if v.seite == "VERKAUF" and limit < kurs.geld * (1 - auf) and v.zweck in ("STRATEGIE", "REFERENZ"):
            g.append("Verkaufslimit unplausibel weit unter dem Geldkurs")

    # Zustand
    if v.seite == "KAUF":
        if zustand not in HANDELND:
            g.append(f"Käufe im Zustand {zustand} gesperrt")
        if v.zweck not in ("STRATEGIE", "REFERENZ"):
            g.append(f"Kauf mit Zweck {v.zweck} nicht vorgesehen")
    elif v.seite == "VERKAUF" and v.zweck in ZUSTAENDE_VERKAUF and zustand not in ZUSTAENDE_VERKAUF[v.zweck]:
        g.append(f"Verkauf mit Zweck {v.zweck} im Zustand {zustand} gesperrt")

    # Geld und Bestände: kein Kredit, kein Hebel, keine Leerverkäufe
    if v.seite == "KAUF" and menge > 0 and limit > 0:
        kosten = menge * limit + gebuehr(mandat, v.konto, menge, limit)
        frei = frei_fuer_kauf(conn, mandat, depot, v.konto, jetzt)
        reserve = D(mandat.konten[v.konto]["gebuehrenreserve_usd"])
        w.update(kosten=kosten, frei=frei, gebuehrenreserve=reserve)
        if kosten + reserve > frei:
            g.append(f"Nicht genug freies, abgewickeltes Guthaben ({frei} USD) für {kosten} USD plus Gebührenreserve {reserve} USD")
        if menge * limit > D(mandat.limits["max_order_usd"]):
            g.append(f"Order grösser als Limit {mandat.limits['max_order_usd']} USD")
        if kurs is not None:
            konto_wert = bargeld(conn, depot, v.konto, jetzt).gesamt
            alt_menge = NULL
            for (k, iid), m in bestaende(conn, depot, v.konto).items():
                if iid == inst.id:
                    alt_menge = m
                kk = kurse.get(iid)
                if kk is None:
                    g.append(f"Kontobewertung unvollständig: kein Kurs für {iid}")
                    continue
                konto_wert += m * kk.geld
            if konto_wert > 0:
                anteil = (alt_menge + menge) * kurs.geld / konto_wert
                w["anteil_nach_kauf"] = anteil.quantize(Decimal("0.0001"))
                if anteil > D(mandat.limits["max_anteil_je_instrument"]):
                    g.append(f"Positionsanteil nach Kauf {anteil:.2%} über Limit {D(mandat.limits['max_anteil_je_instrument']):.0%}")
    if v.seite == "VERKAUF" and menge > 0:
        frei_b = frei_bestand(conn, depot, v.konto, inst.id)
        w["freier_bestand"] = frei_b
        if menge > frei_b:
            g.append(f"Verkauf {menge} > freier Bestand {frei_b} (keine Leerverkäufe)")

    # Ausführungsweg
    if depot == "haupt" and modus == "LIVE" and not live_freigabe:
        g.append("LIVE-Modus ohne gültige Live-Freigabe des Mandats")

    return Pruefung(not g, g, w)
