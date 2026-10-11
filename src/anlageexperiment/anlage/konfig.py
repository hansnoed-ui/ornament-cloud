"""Versionierte Mandatskonfiguration (Datei) und Laufzeit-Einstellungen (Umgebungsvariablen).

Die Mandatsdatei ist schreibgeschützt für die Anwendung: kein Codepfad schreibt sie. Deine Entscheidungen zu Ziel,
Entnahme und Aufteilung liegen versioniert in der Datenbank (Tabelle parameter_versionen), nicht hier.
"""
from __future__ import annotations

import hashlib
import json
import os
from dataclasses import dataclass, field
from decimal import Decimal
from pathlib import Path

from .geld import D

BASIS = Path(__file__).resolve().parent.parent
STANDARD_MANDAT = BASIS / "mandat" / "mandat-v1.json"

ERLAUBTE_KLASSEN = {"aktie", "etf", "krypto_spot"}
HANDELSKONTEN = ("ibkr", "kraken")


class KonfigFehler(ValueError):
    pass


@dataclass(frozen=True)
class Instrument:
    id: str
    name: str
    klasse: str
    konto: str
    boerse: str
    waehrung: str
    mengen_schritt: Decimal
    mindest_menge: Decimal
    mindest_betrag_usd: Decimal
    preis_schritt: Decimal
    bruchstuecke: bool
    aktiv: bool
    nur_simulation: bool = False
    kraken_paar: str | None = None
    ibkr_conid: int | None = None
    pruefpunkte: tuple[str, ...] = ()


@dataclass(frozen=True)
class Mandat:
    version: str
    status: str
    hash: str
    roh: dict
    startkapital: Decimal
    startverteilung: dict[str, Decimal]
    erlaubte_klassen: frozenset[str]
    universum: dict[str, Instrument]
    konten: dict
    handelskosten: dict
    limits: dict
    zyklus_standard: dict
    strategie: dict
    bewertungsregel: dict
    vergleich: dict
    betriebskosten: dict
    simulation: dict

    def instrument(self, iid: str) -> Instrument | None:
        return self.universum.get(iid)

    def instrumente_fuer(self, konto: str) -> list[Instrument]:
        return [i for i in self.universum.values() if i.konto == konto and i.aktiv]

    @property
    def live_freigegeben(self) -> bool:
        return self.status == "FREIGEGEBEN"


def lade_mandat(pfad: str | os.PathLike | None = None) -> Mandat:
    pfad = Path(pfad or os.environ.get("MANDAT_DATEI") or STANDARD_MANDAT)
    roh_bytes = pfad.read_bytes()
    roh = json.loads(roh_bytes)
    h = hashlib.sha256(roh_bytes).hexdigest()[:16]

    startkapital = D(roh["startkapital_gesamt_usd"])
    verteilung = {k: D(v) for k, v in roh["startverteilung_usd"].items()}
    if sum(verteilung.values()) != startkapital:
        raise KonfigFehler(f"Startverteilung {sum(verteilung.values())} ≠ Gesamtstartkapital {startkapital} (kein doppeltes Guthaben)")
    for k in verteilung:
        if k not in HANDELSKONTEN:
            raise KonfigFehler(f"Unbekanntes Handelskonto in Startverteilung: {k}")
    klassen = frozenset(roh["erlaubte_klassen"])
    if not klassen <= ERLAUBTE_KLASSEN:
        raise KonfigFehler(f"Nicht vereinbarte Anlageklasse: {sorted(klassen - ERLAUBTE_KLASSEN)}")

    universum: dict[str, Instrument] = {}
    for e in roh["universum"]:
        if e["klasse"] not in klassen:
            raise KonfigFehler(f"{e['id']}: Klasse {e['klasse']} nicht erlaubt")
        if e["konto"] not in HANDELSKONTEN:
            raise KonfigFehler(f"{e['id']}: Konto {e['konto']} ist kein Handelskonto des Experiments")
        if e["klasse"] == "krypto_spot" and e["konto"] != "kraken":
            raise KonfigFehler(f"{e['id']}: Krypto nur als Spot über das Krypto-Konto")
        if e["klasse"] in ("aktie", "etf") and e["konto"] != "ibkr":
            raise KonfigFehler(f"{e['id']}: Aktien/ETFs nur über das Wertpapierkonto (keine tokenisierten Abbildungen)")
        universum[e["id"]] = Instrument(
            id=e["id"], name=e["name"], klasse=e["klasse"], konto=e["konto"], boerse=e["boerse"], waehrung=e["waehrung"],
            mengen_schritt=D(e["mengen_schritt"]), mindest_menge=D(e["mindest_menge"]), mindest_betrag_usd=D(e["mindest_betrag_usd"]),
            preis_schritt=D(e["preis_schritt"]), bruchstuecke=bool(e["bruchstuecke"]), aktiv=bool(e["aktiv"]),
            nur_simulation=bool(e.get("nur_simulation", False)), kraken_paar=e.get("kraken_paar"), ibkr_conid=e.get("ibkr_conid"),
            pruefpunkte=tuple(e.get("pruefpunkte", ())),
        )
    zs = roh["zyklus_standard"]
    if zs.get("ueberschuss_an") not in ("an_mich", "neustart", "langfrist"):
        raise KonfigFehler("ueberschuss_an muss an_mich, neustart oder langfrist sein")
    return Mandat(
        version=roh["mandat_version"], status=roh["status"], hash=h, roh=roh, startkapital=startkapital,
        startverteilung=verteilung, erlaubte_klassen=klassen, universum=universum, konten=roh["konten"],
        handelskosten=roh["handelskosten"], limits=roh["limits"], zyklus_standard=zs, strategie=roh["strategie"],
        bewertungsregel=roh["bewertungsregel"], vergleich=roh["vergleich"], betriebskosten=roh["betriebskosten"],
        simulation=roh["simulation"],
    )


def _env(name: str, standard: str = "") -> str:
    return os.environ.get(name, standard).strip()


@dataclass
class Einstellungen:
    """Laufzeit-Einstellungen. Zugangsdaten werden nur hier aus der Umgebung gelesen und nie angezeigt, gespeichert oder exportiert."""
    modus: str = "PAPER"                 # PAPER | LIVE
    umgebung: str = "entwicklung"        # entwicklung | betrieb
    datenbank: str = str(BASIS / "daten" / "experiment.sqlite3")
    marktdaten: str = "fixture"          # fixture | kraken_oeffentlich
    jev_modus: str = "test"              # aus | test | echt
    jev_url: str = "https://api.typesafe.ai/v1/systemone"
    jev_modell: str = "jev-latest"
    jev_schluessel_via_proxy: bool = False
    vertex_modus: str = "test"           # aus | test | echt
    vertex_projekt: str = ""
    vertex_ort: str = "global"
    vertex_modell: str = ""
    ibkr_gateway: str = "https://localhost:5000/v1/api"
    ibkr_konto: str = ""
    live_freigabe_hash: str = ""
    szenario: str = "standard"
    _geheim: dict = field(default_factory=dict, repr=False)

    def geheimnis(self, name: str) -> str | None:
        return self._geheim.get(name) or None

    def hat(self, name: str) -> bool:
        return bool(self._geheim.get(name))

    @classmethod
    def aus_umgebung(cls) -> "Einstellungen":
        modus = _env("APP_MODUS", "PAPER").upper()
        if modus not in ("PAPER", "LIVE"):
            raise KonfigFehler("APP_MODUS muss PAPER oder LIVE sein")
        e = cls(
            modus=modus,
            umgebung=_env("APP_UMGEBUNG", "entwicklung"),
            datenbank=_env("DATENBANK", str(BASIS / "daten" / "experiment.sqlite3")),
            marktdaten=_env("MARKTDATEN", "fixture"),
            jev_modus=_env("JEV_MODUS", "test"),
            jev_url=_env("JEV_URL", "https://api.typesafe.ai/v1/systemone"),
            jev_modell=_env("JEV_MODELL", "jev-latest"),
            jev_schluessel_via_proxy=_env("JEV_SCHLUESSEL_VIA_PROXY", "0") in ("1", "ja", "true"),
            vertex_modus=_env("VERTEX_MODUS", "test"),
            vertex_projekt=_env("GOOGLE_CLOUD_PROJECT"),
            vertex_ort=_env("GOOGLE_CLOUD_LOCATION", "global"),
            vertex_modell=_env("VERTEX_MODELL"),
            ibkr_gateway=_env("IBKR_GATEWAY_URL", "https://localhost:5000/v1/api"),
            ibkr_konto=_env("IBKR_KONTO_ID"),
            live_freigabe_hash=_env("LIVE_FREIGABE_MANDAT_HASH"),
            szenario=_env("SIM_SZENARIO", "standard"),
        )
        for name in ("TYPESAFE_API_KEY", "KRAKEN_API_KEY", "KRAKEN_API_SECRET", "VERTEX_ZUGRIFFSTOKEN"):
            if os.environ.get(name):
                e._geheim[name] = os.environ[name]
        return e

    @property
    def entwicklung(self) -> bool:
        return self.umgebung == "entwicklung" and self.modus == "PAPER"
