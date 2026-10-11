"""Zyklus als persistente Zustandsmaschine, versionierte Parameter (deine Entscheidungen) und Auszahlungsrechnung.

Zustände: SETUP → SIMULATION | AKTIV → ZIEL_ABWICKLUNG → ABRECHNUNG → AUSZAHLUNG_AUSSTEHEND → NEUSTART_BEREIT → (neuer Zyklus)
          sowie TECHNISCH_PAUSIERT, MANUELL_PAUSIERT, NICHT_HANDELSFAEHIG, KAPITAL_AUFGEBRAUCHT und ABGESCHLOSSEN.
TECHNISCH_PAUSIERT entsteht nur aus technischen Gründen (Daten, Orderzustand, Anmeldung, Kontoabgleich) – nie wegen Verlusten.
"""
from __future__ import annotations

import json
from dataclasses import dataclass, field
from datetime import datetime
from decimal import Decimal

from .db import iso, j, transaktion
from .geld import CENT, D, NULL, text, usd
from .konfig import HANDELSKONTEN, Mandat

HANDELND = ("SIMULATION", "AKTIV")
ZUSTAENDE = ("SETUP", "SIMULATION", "AKTIV", "ZIEL_ABWICKLUNG", "ABRECHNUNG", "AUSZAHLUNG_AUSSTEHEND", "NEUSTART_BEREIT",
             "TECHNISCH_PAUSIERT", "MANUELL_PAUSIERT", "NICHT_HANDELSFAEHIG", "KAPITAL_AUFGEBRAUCHT", "ABGESCHLOSSEN")
_H = set(HANDELND)
ERLAUBT = {
    "SETUP": _H,
    "SIMULATION": {"ZIEL_ABWICKLUNG", "TECHNISCH_PAUSIERT", "MANUELL_PAUSIERT", "NICHT_HANDELSFAEHIG", "KAPITAL_AUFGEBRAUCHT", "ABGESCHLOSSEN"},
    "AKTIV": {"ZIEL_ABWICKLUNG", "TECHNISCH_PAUSIERT", "MANUELL_PAUSIERT", "NICHT_HANDELSFAEHIG", "KAPITAL_AUFGEBRAUCHT", "ABGESCHLOSSEN"},
    "ZIEL_ABWICKLUNG": _H | {"ABRECHNUNG", "TECHNISCH_PAUSIERT", "MANUELL_PAUSIERT"},
    "ABRECHNUNG": _H | {"AUSZAHLUNG_AUSSTEHEND"},
    "AUSZAHLUNG_AUSSTEHEND": _H | {"NEUSTART_BEREIT", "MANUELL_PAUSIERT", "TECHNISCH_PAUSIERT", "ABGESCHLOSSEN"},
    "NEUSTART_BEREIT": {"ABGESCHLOSSEN", "TECHNISCH_PAUSIERT"},
    "TECHNISCH_PAUSIERT": set(ZUSTAENDE) - {"SETUP", "TECHNISCH_PAUSIERT"},
    "MANUELL_PAUSIERT": _H | {"ZIEL_ABWICKLUNG", "AUSZAHLUNG_AUSSTEHEND", "NICHT_HANDELSFAEHIG", "TECHNISCH_PAUSIERT", "ABGESCHLOSSEN"},
    "NICHT_HANDELSFAEHIG": _H | {"MANUELL_PAUSIERT", "KAPITAL_AUFGEBRAUCHT", "TECHNISCH_PAUSIERT", "ABGESCHLOSSEN"},
    "KAPITAL_AUFGEBRAUCHT": {"ABGESCHLOSSEN"},
    "ABGESCHLOSSEN": set(),
}

ZUSTAND_TEXT = {
    "SETUP": "Eingerichtet, noch nicht gestartet", "SIMULATION": "Simulierter Handel läuft", "AKTIV": "Live-Handel läuft",
    "ZIEL_ABWICKLUNG": "Ziel voraussichtlich erreicht – Positionen werden kontrolliert verkauft",
    "ABRECHNUNG": "Ausführungen und Kosten werden festgestellt", "AUSZAHLUNG_AUSSTEHEND": "Auszahlungsvorschlag wartet auf dich",
    "NEUSTART_BEREIT": "Überweisungen bestätigt und abgeglichen – Neustart möglich",
    "TECHNISCH_PAUSIERT": "Technische Pause (keine Verlustgrenze)", "MANUELL_PAUSIERT": "Von dir pausiert",
    "NICHT_HANDELSFAEHIG": "Restgeld unter Mindestorder – nicht handelbar, aber vorhanden",
    "KAPITAL_AUFGEBRAUCHT": "Kapital vollständig aufgebraucht", "ABGESCHLOSSEN": "Abgeschlossen",
}


class ZustandsFehler(ValueError):
    pass


def handelszustand(modus: str) -> str:
    return "AKTIV" if modus == "LIVE" else "SIMULATION"


def aktueller_zyklus(conn):
    return conn.execute("SELECT * FROM zyklen ORDER BY id DESC LIMIT 1").fetchone()


def zyklus_lesen(conn, zid: int):
    return conn.execute("SELECT * FROM zyklen WHERE id=?", (zid,)).fetchone()


def neuer_zyklus(conn, modus: str, zeit: datetime, zustand: str, startkapital: Decimal | None, grund: str, durch: str) -> int:
    nr = (conn.execute("SELECT MAX(nummer) FROM zyklen").fetchone()[0] or 0) + 1
    cur = conn.execute("INSERT INTO zyklen (nummer, modus, zustand, start, startkapital) VALUES (?,?,?,?,?)",
                       (nr, modus, zustand, iso(zeit), text(startkapital) if startkapital is not None else None))
    conn.execute("INSERT INTO zustandswechsel (zyklus_id, zeit, von, nach, grund, durch) VALUES (?,?,?,?,?,?)",
                 (cur.lastrowid, iso(zeit), None, zustand, grund, durch))
    return cur.lastrowid


def wechsel(conn, zid: int, nach: str, grund: str, durch: str, zeit: datetime, **felder) -> None:
    z = zyklus_lesen(conn, zid)
    von = z["zustand"]
    if nach not in ERLAUBT[von]:
        raise ZustandsFehler(f"Wechsel {von} → {nach} nicht erlaubt")
    sets = {"zustand": nach, **felder}
    if nach == "TECHNISCH_PAUSIERT":
        sets["vorheriger_zustand"] = von
    if nach == "ABGESCHLOSSEN":
        sets.setdefault("ende", iso(zeit))
    sql = ", ".join(f"{k}=?" for k in sets)
    conn.execute(f"UPDATE zyklen SET {sql} WHERE id=?", (*sets.values(), zid))
    conn.execute("INSERT INTO zustandswechsel (zyklus_id, zeit, von, nach, grund, durch) VALUES (?,?,?,?,?,?)",
                 (zid, iso(zeit), von, nach, grund, durch))


# ------------------------------------------------------------------------------ Parameter (deine Entscheidungen) ----

@dataclass(frozen=True)
class Parameter:
    version: int
    zielbetrag: Decimal
    auto_zielabwicklung: bool
    neustartkapital: Decimal
    langfrist_zufuehrung: Decimal
    ueberschuss_an: str
    durch: str
    begruendung: str | None
    zeit: str


def _param(r) -> Parameter:
    return Parameter(r["version"], D(r["zielbetrag"]), bool(r["auto_zielabwicklung"]), D(r["neustartkapital"]),
                     D(r["langfrist_zufuehrung"]), r["ueberschuss_an"], r["durch"], r["begruendung"], r["zeit"])


def parameter_initialisieren(conn, mandat: Mandat, zeit: datetime) -> None:
    if conn.execute("SELECT COUNT(*) FROM parameter_versionen").fetchone()[0]:
        return
    zs = mandat.zyklus_standard
    conn.execute("INSERT INTO parameter_versionen (zeit, zielbetrag, auto_zielabwicklung, neustartkapital, langfrist_zufuehrung, ueberschuss_an, durch, begruendung) "
                 "VALUES (?,?,?,?,?,?,?,?)", (iso(zeit), zs["zielbetrag_usd"], 1 if zs["auto_zielabwicklung"] else 0, zs["neustartkapital_usd"],
                                              zs["langfrist_zufuehrung_usd"], zs["ueberschuss_an"], f"STANDARD (Mandat {mandat.version})", "Standardwerte"))


def aktuelle_parameter(conn) -> Parameter:
    return _param(conn.execute("SELECT * FROM parameter_versionen ORDER BY version DESC LIMIT 1").fetchone())


def parameter_aendern(conn, zeit: datetime, begruendung: str, *, zielbetrag=None, auto_zielabwicklung=None,
                      neustartkapital=None, langfrist_zufuehrung=None, ueberschuss_an=None) -> Parameter:
    """Nur über deine Aktionen (Oberfläche/CLI) aufrufbar. Der Agent ruft das nie auf. Neue Version, nie überschreiben."""
    with transaktion(conn):
        p = aktuelle_parameter(conn)
        neu = {
            "zielbetrag": D(zielbetrag) if zielbetrag not in (None, "") else p.zielbetrag,
            "auto": p.auto_zielabwicklung if auto_zielabwicklung is None else bool(auto_zielabwicklung),
            "neustart": D(neustartkapital) if neustartkapital not in (None, "") else p.neustartkapital,
            "langfrist": D(langfrist_zufuehrung) if langfrist_zufuehrung not in (None, "") else p.langfrist_zufuehrung,
            "ueberschuss": ueberschuss_an or p.ueberschuss_an,
        }
        if neu["zielbetrag"] <= 0 or neu["neustart"] < 0 or neu["langfrist"] < 0:
            raise ValueError("Ziel muss positiv sein; Neustartkapital und langfristige Zuführung dürfen nicht negativ sein")
        if neu["ueberschuss"] not in ("an_mich", "neustart", "langfrist"):
            raise ValueError("Unbekannte Überschussregel")
        conn.execute("INSERT INTO parameter_versionen (zeit, zielbetrag, auto_zielabwicklung, neustartkapital, langfrist_zufuehrung, ueberschuss_an, durch, begruendung) "
                     "VALUES (?,?,?,?,?,?,?,?)", (iso(zeit), text(neu["zielbetrag"]), 1 if neu["auto"] else 0, text(neu["neustart"]),
                                                  text(neu["langfrist"]), neu["ueberschuss"], "ICH (Oberfläche)", begruendung or "ohne Begründung"))
        return aktuelle_parameter(conn)


# ------------------------------------------------------------------------------ Auszahlungsrechnung ----

@dataclass
class Aufteilung:
    bargeld_gesamt: Decimal
    kostenerstattung: Decimal
    an_mich: Decimal
    langfrist: Decimal
    auszahlungskosten: Decimal
    neustart: Decimal
    ueberweisungen: list = field(default_factory=list)      # [(konto, art, betrag)]
    behalten: dict = field(default_factory=dict)
    fehler: list = field(default_factory=list)

    @property
    def verfuegbar_netto(self) -> Decimal:
        return self.bargeld_gesamt - self.kostenerstattung - self.auszahlungskosten

    def als_dict(self) -> dict:
        return {"bargeld_gesamt": str(self.bargeld_gesamt), "kostenerstattung": str(self.kostenerstattung), "an_mich": str(self.an_mich),
                "langfrist": str(self.langfrist), "auszahlungskosten": str(self.auszahlungskosten), "neustart": str(self.neustart),
                "ueberweisungen": [[k, a, str(b)] for k, a, b in self.ueberweisungen], "behalten": {k: str(v) for k, v in self.behalten.items()},
                "fehler": self.fehler}


def verteile(mandat: Mandat, bargeld: dict[str, Decimal], kostenerstattung: Decimal, an_mich: Decimal, langfrist: Decimal) -> Aufteilung:
    """Teilt das verfügbare Bargeld auf: Überweisungen je Konto, Auszahlungskosten, Rest bleibt als Neustartkapital.
    Kein Geld wird zwischen Brokern verschoben; jedes Konto zahlt nur aus, was es selbst hat."""
    kostenerstattung, an_mich, langfrist = usd(kostenerstattung), usd(an_mich), usd(langfrist)
    gesamt = sum(bargeld.values(), NULL)
    abfluss = kostenerstattung + an_mich + langfrist
    fehler = []
    if min(kostenerstattung, an_mich, langfrist) < 0:
        fehler.append("Beträge dürfen nicht negativ sein")
    gebuehr = {k: D(mandat.konten[k]["bekannte_auszahlungskosten_usd"]) for k in bargeld}
    verhaeltnis = {k: mandat.startverteilung.get(k, NULL) / mandat.startkapital for k in bargeld}
    zahlende = set(k for k in bargeld if bargeld[k] > 0) if abfluss > 0 else set()
    behalten: dict[str, Decimal] = {}
    for _ in range(4):
        kosten = sum((gebuehr[k] for k in zahlende), NULL)
        neustart = gesamt - abfluss - kosten
        if neustart < 0:
            break
        behalten = {k: NULL for k in bargeld}
        rest = neustart
        # Zielanteile gemäss Startverteilung, begrenzt durch das, was das Konto nach eigener Auszahlungsgebühr hat
        for k in sorted(bargeld, key=lambda x: -verhaeltnis[x]):
            moeglich = bargeld[k] - (gebuehr[k] if k in zahlende else NULL)
            behalten[k] = max(NULL, min(usd(neustart * verhaeltnis[k]), moeglich, rest))
            rest -= behalten[k]
        for k in bargeld:      # Rest dort lassen, wo noch Platz ist
            moeglich = bargeld[k] - (gebuehr[k] if k in zahlende else NULL) - behalten[k]
            extra = max(NULL, min(rest, moeglich))
            behalten[k] += extra
            rest -= extra
        neu_zahlende = {k for k in bargeld if bargeld[k] - behalten[k] - (gebuehr[k] if k in zahlende else NULL) > 0} if abfluss > 0 else set()
        if neu_zahlende == zahlende:
            break
        zahlende = neu_zahlende
    kosten = sum((gebuehr[k] for k in zahlende), NULL)
    neustart = gesamt - abfluss - kosten
    if neustart < 0:
        fehler.append(f"Aufteilung übersteigt das verfügbare Bargeld um {usd(-neustart)} USD (keine Überziehung)")
        return Aufteilung(gesamt, kostenerstattung, an_mich, langfrist, kosten, neustart, [], {}, fehler)
    verfuegbar = {k: bargeld[k] - behalten[k] - (gebuehr[k] if k in zahlende else NULL) for k in bargeld}
    ueb = []
    for art, betrag in (("KOSTENERSTATTUNG", kostenerstattung), ("LANGFRIST", langfrist), ("AN_MICH", an_mich)):
        offen = betrag
        for k in sorted(verfuegbar, key=lambda x: -verfuegbar[x]):
            teil = min(offen, verfuegbar[k])
            if teil > 0:
                ueb.append((k, art, teil))
                verfuegbar[k] -= teil
                offen -= teil
        if offen > CENT / 2:
            fehler.append(f"{art}: {usd(offen)} USD nicht auf Konten verteilbar")
    return Aufteilung(gesamt, kostenerstattung, an_mich, langfrist, kosten, neustart, ueb, behalten, fehler)


def zielvorlage(mandat: Mandat, p: Parameter, bargeld: dict[str, Decimal], kostenerstattung: Decimal) -> tuple[Aufteilung, str]:
    """Vorschlag bei Zielerreichung. Standard bei genau 1'000 USD netto: 600 an mich / 200 langfristig / 200 Neustart.
    Bei anderem Ziel keine Hochrechnung: Neustart und langfristige Zuführung wie konfiguriert, Rest an dich.
    Netto = Bargeld − Erstattung externer Zykluskosten − bekannte Auszahlungskosten der zahlenden Konten."""
    langfrist, an_mich = p.langfrist_zufuehrung, NULL
    a = verteile(mandat, bargeld, kostenerstattung, an_mich, langfrist)
    for _ in range(5):                      # Auszahlungskosten hängen davon ab, welche Konten zahlen → Fixpunkt
        neu = a.verfuegbar_netto - langfrist - p.neustartkapital
        if neu == an_mich:
            break
        an_mich = neu
        a = verteile(mandat, bargeld, kostenerstattung, max(an_mich, NULL), langfrist)
    if an_mich < 0:
        a = verteile(mandat, bargeld, kostenerstattung, NULL, NULL)
        a.fehler.append("Verfügbarer Nettobetrag reicht nicht für konfiguriertes Neustartkapital plus langfristige Zuführung – bitte manuell aufteilen")
        return a, "MANUELL_AUFTEILEN"
    ueberschuss = a.verfuegbar_netto - p.zielbetrag
    hinweis = ""
    if ueberschuss > 0:
        if p.ueberschuss_an == "an_mich":
            hinweis = f"Überschuss {usd(ueberschuss)} USD über dem Ziel geht gemäss Entwurfsannahme an dich (änderbar)"
        else:
            an_mich -= ueberschuss
            if p.ueberschuss_an == "langfrist":
                langfrist += ueberschuss
            hinweis = f"Überschuss {usd(ueberschuss)} USD gemäss Regel '{p.ueberschuss_an}'"
            a = verteile(mandat, bargeld, kostenerstattung, an_mich, langfrist)
    return a, hinweis


def plan_speichern(conn, zid: int, art: str, status: str, a: Aufteilung, zeit: datetime, durch: str, begruendung: str, **extra) -> int:
    cur = conn.execute("INSERT INTO auszahlungsplaene (zyklus_id, art, status, erstellt, aktualisiert, verfuegbar_netto, bargeld_gesamt, kostenerstattung, "
                       "an_mich, langfrist, neustart, auszahlungskosten, quellen, hinweis, entnahme_betrag) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)",
                       (zid, art, status, iso(zeit), iso(zeit), text(a.verfuegbar_netto), text(a.bargeld_gesamt), text(a.kostenerstattung),
                        text(a.an_mich), text(a.langfrist), text(a.neustart), text(a.auszahlungskosten), j(a.als_dict()),
                        extra.get("hinweis"), extra.get("entnahme_betrag")))
    pid = cur.lastrowid
    conn.execute("INSERT INTO plan_versionen (plan_id, version, zeit, werte, durch, begruendung) VALUES (?,?,?,?,?,?)",
                 (pid, 1, iso(zeit), j(a.als_dict()), durch, begruendung))
    return pid


def plan_aktualisieren(conn, pid: int, a: Aufteilung, zeit: datetime, durch: str, begruendung: str, status: str | None = None) -> None:
    p = conn.execute("SELECT version FROM auszahlungsplaene WHERE id=?", (pid,)).fetchone()
    v = p["version"] + 1
    conn.execute("UPDATE auszahlungsplaene SET version=?, aktualisiert=?, verfuegbar_netto=?, bargeld_gesamt=?, kostenerstattung=?, an_mich=?, "
                 "langfrist=?, neustart=?, auszahlungskosten=?, quellen=?, status=COALESCE(?, status) WHERE id=?",
                 (v, iso(zeit), text(a.verfuegbar_netto), text(a.bargeld_gesamt), text(a.kostenerstattung), text(a.an_mich), text(a.langfrist),
                  text(a.neustart), text(a.auszahlungskosten), j(a.als_dict()), status, pid))
    conn.execute("INSERT INTO plan_versionen (plan_id, version, zeit, werte, durch, begruendung) VALUES (?,?,?,?,?,?)",
                 (pid, v, iso(zeit), j(a.als_dict()), durch, begruendung))


def plan_lesen(conn, pid: int):
    return conn.execute("SELECT * FROM auszahlungsplaene WHERE id=?", (pid,)).fetchone()


def offene_plaene(conn, zid: int | None = None):
    sql = "SELECT * FROM auszahlungsplaene WHERE status NOT IN ('ERLEDIGT','VERWORFEN')"
    args: tuple = ()
    if zid is not None:
        sql += " AND zyklus_id=?"
        args = (zid,)
    return conn.execute(sql + " ORDER BY id", args).fetchall()


def quellen(plan) -> dict:
    return json.loads(plan["quellen"] or "{}")
