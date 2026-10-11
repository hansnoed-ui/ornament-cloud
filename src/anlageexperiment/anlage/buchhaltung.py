"""Buchführung: einzige verbindliche Grundlage für Bargeld, Bestände, Kosten und kumulative Bilanz.

Bargeld und Bestände ergeben sich ausschliesslich aus Buchungen. Jede Buchung mit Referenz ist idempotent
(gleiche Referenz → keine zweite Buchung). Offene Orders und geplante Entnahmen reservieren Geld bzw. Bestände.
"""
from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime
from decimal import Decimal

from .db import iso
from .geld import D, NULL, text
from .handelskosten import gebuehr, slippage
from .konfig import HANDELSKONTEN, Mandat
from .marktdaten import Kurs

OFFENE_ORDERSTATUS = ("NEU", "GESENDET", "UNKLAR", "OFFEN", "TEILGEFUELLT")

ARTEN = {
    "EINZAHLUNG": "Externe Einzahlung (Kapitaleinsatz, nie Gewinn)",
    "KAUF": "Kauf", "VERKAUF": "Verkauf", "GEBUEHR": "Handelsgebühr", "GEBUEHR_KORREKTUR": "Gebührenkorrektur",
    "AUSZAHLUNG": "Auszahlung an mich", "KOSTENERSTATTUNG": "Erstattung externer Betriebskosten an mich",
    "LANGFRIST_UEBERTRAG": "Übertrag ins langfristige Depot", "RUECKBUCHUNG": "Rückbuchung gescheiterter Überweisung",
    "KONTOGEBUEHR": "Betriebskosten, direkt vom Handelskonto belastet",
}


def buche(conn, depot: str, zyklus_id: int | None, zeit: datetime, konto: str, art: str, betrag: Decimal = NULL, *,
          instrument: str | None = None, menge: Decimal = NULL, verfuegbar_ab: datetime | None = None,
          referenz: str | None = None, notiz: str | None = None) -> bool:
    """Schreibt eine Buchung. Gibt False zurück, wenn die Referenz bereits gebucht ist (idempotent)."""
    if art not in ARTEN:
        raise ValueError(f"Unbekannte Buchungsart {art}")
    if konto not in HANDELSKONTEN:
        raise ValueError(f"Buchung nur auf Handelskonten des Experiments, nicht auf {konto}")
    cur = conn.execute(
        "INSERT INTO buchungen (depot, zyklus_id, zeit, konto, art, waehrung, betrag, instrument, menge, verfuegbar_ab, referenz, notiz) "
        "VALUES (?,?,?,?,?,?,?,?,?,?,?,?) ON CONFLICT (depot, referenz) DO NOTHING",
        (depot, zyklus_id, iso(zeit), konto, art, "USD", text(betrag), instrument, text(menge),
         iso(verfuegbar_ab) if verfuegbar_ab else None, referenz, notiz))
    return cur.rowcount == 1


@dataclass(frozen=True)
class Bargeld:
    gesamt: Decimal          # inklusive noch nicht abgewickelter Verkaufserlöse
    abgewickelt: Decimal     # verfügbar für Käufe und Auszahlungen


def bargeld(conn, depot: str, konto: str, jetzt: datetime) -> Bargeld:
    gesamt = abgewickelt = NULL
    for r in conn.execute("SELECT betrag, verfuegbar_ab FROM buchungen WHERE depot = ? AND konto = ?", (depot, konto)):
        b = D(r["betrag"])
        gesamt += b
        if b < 0 or r["verfuegbar_ab"] is None or r["verfuegbar_ab"] <= iso(jetzt):
            abgewickelt += b
    return Bargeld(gesamt, abgewickelt)


def bestaende(conn, depot: str, konto: str | None = None) -> dict[tuple[str, str], Decimal]:
    sql = "SELECT konto, instrument, menge FROM buchungen WHERE depot = ? AND instrument IS NOT NULL"
    args: tuple = (depot,)
    if konto:
        sql += " AND konto = ?"
        args += (konto,)
    erg: dict[tuple[str, str], Decimal] = {}
    for r in conn.execute(sql, args):
        k = (r["konto"], r["instrument"])
        erg[k] = erg.get(k, NULL) + D(r["menge"])
    return {k: v for k, v in erg.items() if v != 0}


def bestand(conn, depot: str, konto: str, instrument: str) -> Decimal:
    return bestaende(conn, depot, konto).get((konto, instrument), NULL)


def einstandskurs(conn, depot: str, konto: str, instrument: str) -> Decimal | None:
    """Durchschnittlicher Kaufkurs der Käufe (nur zur Anzeige)."""
    menge = kosten = NULL
    for r in conn.execute("SELECT betrag, menge FROM buchungen WHERE depot=? AND konto=? AND instrument=? AND art='KAUF'", (depot, konto, instrument)):
        menge += D(r["menge"])
        kosten += -D(r["betrag"])
    return kosten / menge if menge > 0 else None


def reserviert_kauf(conn, mandat: Mandat, depot: str, konto: str) -> Decimal:
    summe = NULL
    platz = ",".join("?" * len(OFFENE_ORDERSTATUS))
    for r in conn.execute(f"SELECT menge, gefuellt, limit_preis FROM orders WHERE depot=? AND konto=? AND seite='KAUF' AND status IN ({platz})",
                          (depot, konto, *OFFENE_ORDERSTATUS)):
        rest = D(r["menge"]) - D(r["gefuellt"])
        if rest > 0:
            summe += rest * D(r["limit_preis"]) + gebuehr(mandat, konto, rest, D(r["limit_preis"]))
    return summe


def reserviert_verkauf(conn, depot: str, konto: str, instrument: str) -> Decimal:
    summe = NULL
    platz = ",".join("?" * len(OFFENE_ORDERSTATUS))
    for r in conn.execute(f"SELECT menge, gefuellt FROM orders WHERE depot=? AND konto=? AND instrument=? AND seite='VERKAUF' AND status IN ({platz})",
                          (depot, konto, instrument, *OFFENE_ORDERSTATUS)):
        summe += D(r["menge"]) - D(r["gefuellt"])
    return summe


def reserviert_entnahme(conn, depot: str, konto: str) -> Decimal:
    r = conn.execute("SELECT betrag FROM reservierungen WHERE depot=? AND konto=? AND aktiv=1", (depot, konto)).fetchall()
    return sum((D(x["betrag"]) for x in r), NULL)


def frei_fuer_kauf(conn, mandat: Mandat, depot: str, konto: str, jetzt: datetime) -> Decimal:
    """Abgewickeltes Bargeld minus offene Kaufreservierungen minus geplante Entnahmen (ohne Gebührenreserve)."""
    return bargeld(conn, depot, konto, jetzt).abgewickelt - reserviert_kauf(conn, mandat, depot, konto) - reserviert_entnahme(conn, depot, konto)


def frei_bestand(conn, depot: str, konto: str, instrument: str) -> Decimal:
    return bestand(conn, depot, konto, instrument) - reserviert_verkauf(conn, depot, konto, instrument)


# ---------------------------------------------------------------- Betriebskosten (extern) ----

def externe_kosten(conn, zyklus_id: int | None = None) -> dict[str, Decimal]:
    """Dem Experiment zugeordnete Betriebskosten, die NICHT im Handelskonto verbucht sind (sonst doppelt)."""
    sql = "SELECT status, betrag FROM betriebskosten WHERE art != 'ZUSCHUSS' AND bezahlt_aus = 'extern' AND status != 'FREIGEGEBEN'"
    args: tuple = ()
    if zyklus_id is not None:
        sql += " AND zyklus_id = ?"
        args = (zyklus_id,)
    erg = {"RESERVIERT": NULL, "OFFEN": NULL, "BEZAHLT": NULL}
    for r in conn.execute(sql, args):
        erg[r["status"]] += D(r["betrag"])
    erg["summe"] = erg["RESERVIERT"] + erg["OFFEN"] + erg["BEZAHLT"]
    return erg


def erstattete_kosten(conn, zyklus_id: int) -> Decimal:
    r = conn.execute("SELECT u.betrag FROM ueberweisungen u JOIN auszahlungsplaene p ON p.id=u.plan_id "
                     "WHERE p.zyklus_id=? AND u.art='KOSTENERSTATTUNG' AND u.status IN ('AUSGEFUEHRT_GEMELDET','BESTAETIGT')", (zyklus_id,)).fetchall()
    return sum((D(x["betrag"]) for x in r), NULL)


def zyklus_kosten_offen(conn, zyklus_id: int) -> Decimal:
    """Externe Betriebskosten des Zyklus, die noch nicht durch eine Kostenerstattung ausgeglichen sind."""
    return max(NULL, externe_kosten(conn, zyklus_id)["summe"] - erstattete_kosten(conn, zyklus_id))


# ---------------------------------------------------------------- Bewertung ----

@dataclass
class Bewertung:
    handelskontowert: Decimal | None
    netto_liquidation: Decimal | None
    wirtschaftlich: Decimal | None
    je_konto: dict
    fehlende_kurse: list[str]
    grundlage: str


BEWERTUNGSGRUNDLAGE = ("Handelskontowert = Bargeld (inkl. noch nicht abgewickelter Erlöse) + Positionen zum Geldkurs (Bid). "
                       "Netto-Liquidationswert = Bargeld + Positionen zum Geldkurs abzüglich Slippage und Verkaufsgebühren, "
                       "abzüglich offener externer Betriebskosten des Zyklus und bekannter Auszahlungskosten. "
                       "Wirtschaftlicher Nettowert = Handelskontowert − nicht im Konto verbuchte, dem Zyklus zugeordnete Kosten. "
                       "Alles vor persönlichen Steuern.")


def bewerte(conn, mandat: Mandat, depot: str, kurse: dict[str, Kurs | None], jetzt: datetime, zyklus_id: int | None = None) -> Bewertung:
    je_konto = {}
    fehlend: list[str] = []
    hkw = nlw = NULL
    best = bestaende(conn, depot)
    slip = slippage(mandat)
    for konto in HANDELSKONTEN:
        bg = bargeld(conn, depot, konto, jetzt)
        pos_wert = pos_liq = NULL
        positionen = []
        for (k, iid), menge in best.items():
            if k != konto:
                continue
            kurs = kurse.get(iid)
            if kurs is None:
                fehlend.append(iid)
                positionen.append({"instrument": iid, "menge": menge, "wert": None})
                continue
            wert = menge * kurs.geld
            liq = menge * kurs.geld * (1 - slip) - gebuehr(mandat, konto, menge, kurs.geld)
            pos_wert += wert
            pos_liq += liq
            positionen.append({"instrument": iid, "menge": menge, "wert": wert, "geld": kurs.geld, "kurszeit": kurs.zeit,
                               "einstand": einstandskurs(conn, depot, konto, iid)})
        hat_wert = bg.gesamt != 0 or pos_wert != 0
        auszahlkosten = D(mandat.konten[konto]["bekannte_auszahlungskosten_usd"]) if (hat_wert and depot == "haupt") else NULL
        je_konto[konto] = {"bargeld": bg.gesamt, "abgewickelt": bg.abgewickelt, "positionen_wert": pos_wert,
                           "positionen": positionen, "wert": bg.gesamt + pos_wert,
                           "reserviert_kauf": reserviert_kauf(conn, mandat, depot, konto),
                           "reserviert_entnahme": reserviert_entnahme(conn, depot, konto),
                           "frei": frei_fuer_kauf(conn, mandat, depot, konto, jetzt), "auszahlungskosten": auszahlkosten}
        hkw += bg.gesamt + pos_wert
        nlw += bg.gesamt + pos_liq - auszahlkosten
    kosten = zyklus_kosten_offen(conn, zyklus_id) if (zyklus_id is not None and depot == "haupt") else NULL
    if fehlend:
        return Bewertung(None, None, None, je_konto, sorted(set(fehlend)), BEWERTUNGSGRUNDLAGE)
    return Bewertung(hkw, nlw - kosten, hkw - kosten, je_konto, [], BEWERTUNGSGRUNDLAGE)


# ---------------------------------------------------------------- Kumulative Bilanz ----

def kumulativ(conn, depot: str = "haupt", handelskontowert: Decimal | None = None) -> dict:
    def summe(sql, *args):
        return sum((D(r[0]) for r in conn.execute(sql, args)), NULL)

    einz = summe("SELECT betrag FROM buchungen WHERE depot=? AND art='EINZAHLUNG'", depot)
    gebuehren = -summe("SELECT betrag FROM buchungen WHERE depot=? AND art IN ('GEBUEHR','GEBUEHR_KORREKTUR')", depot)
    kontogeb = -summe("SELECT betrag FROM buchungen WHERE depot=? AND art='KONTOGEBUEHR'", depot)
    u = {}
    for art in ("AN_MICH", "LANGFRIST", "KOSTENERSTATTUNG"):
        for st in ("AUSGEFUEHRT_GEMELDET", "BESTAETIGT"):
            u[(art, st)] = summe("SELECT betrag FROM ueberweisungen WHERE art=? AND status=?", art, st) if depot == "haupt" else NULL
    ext = externe_kosten(conn) if depot == "haupt" else {"summe": NULL, "BEZAHLT": NULL, "OFFEN": NULL, "RESERVIERT": NULL}
    zuschuss = summe("SELECT betrag FROM betriebskosten WHERE art='ZUSCHUSS'") if depot == "haupt" else NULL
    in_transfer = sum((v for (a, s), v in u.items() if s == "AUSGEFUEHRT_GEMELDET"), NULL)
    abgeflossen = sum(u.values(), NULL)
    aktiv = handelskontowert if handelskontowert is not None else NULL
    return {
        "einzahlungen": einz,
        "ausgezahlt_bestaetigt": u[("AN_MICH", "BESTAETIGT")],
        "kostenerstattung_bestaetigt": u[("KOSTENERSTATTUNG", "BESTAETIGT")],
        "langfrist_bestaetigt": u[("LANGFRIST", "BESTAETIGT")],
        "in_transfer": in_transfer,
        "aktives_kapital": aktiv,
        "handelsgebuehren": gebuehren,
        "betriebskosten_extern": ext["summe"], "betriebskosten_bezahlt": ext["BEZAHLT"],
        "betriebskosten_offen": ext["OFFEN"] + ext["RESERVIERT"],
        "betriebskosten_vom_konto": kontogeb,
        "zuschuesse": zuschuss,
        # Ergebnis nach erfassten Kosten, vor persönlichen Steuern. Einzahlungen sind nie Gewinn; Zuschüsse mindern den Aufwand nicht.
        "ergebnis_nach_kosten": aktiv + abgeflossen - einz - ext["summe"],
    }
