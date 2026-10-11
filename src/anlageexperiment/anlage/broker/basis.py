"""Austauschbare Broker-Schnittstelle. Modelle sehen diese Schicht nie; nur die Ausführung nach bestandener Mandatsprüfung."""
from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime
from decimal import Decimal


class BrokerFehler(Exception):
    pass


class Zeitueberschreitung(BrokerFehler):
    """Antwort blieb aus. Der Orderzustand ist UNKLAR und wird abgefragt – niemals blind erneut gesendet."""


class NichtAngemeldet(BrokerFehler):
    """Sitzung abgelaufen oder fehlend. Führt zu einer sichtbaren technischen Pause; Schutzmassnahmen werden nicht umgangen."""


class PaperSchutzVerletzung(BrokerFehler):
    """Ein Orderweg zu einem LIVE-Endpunkt wurde ausserhalb eines freigegebenen LIVE-Mandats angesprochen."""


class Abgelehnt(BrokerFehler):
    pass


@dataclass(frozen=True)
class OrderAuftrag:
    client_id: str
    konto: str
    instrument: str
    seite: str            # KAUF | VERKAUF
    typ: str              # LIMIT
    menge: Decimal
    limit_preis: Decimal


@dataclass
class BrokerOrderStatus:
    client_id: str
    status: str           # OFFEN | TEILGEFUELLT | GEFUELLT | STORNIERT | ABGELEHNT
    gefuellt: Decimal
    broker_ref: str | None = None


@dataclass(frozen=True)
class Ausfuehrung:
    fill_id: str
    client_id: str
    konto: str
    instrument: str
    seite: str
    menge: Decimal
    preis: Decimal
    gebuehr: Decimal
    zeit: datetime
    abwicklung: datetime
    mittelkurs: Decimal | None = None


@dataclass
class AuthStatus:
    angemeldet: bool
    grund: str = ""
    details: dict = field(default_factory=dict)


class BrokerAdapter:
    konto: str
    art: str = "basis"
    live: bool = False

    def anmeldung(self) -> AuthStatus: ...
    def sende(self, auftrag: OrderAuftrag) -> BrokerOrderStatus: ...
    def status(self, client_id: str) -> BrokerOrderStatus | None: ...
    def storniere(self, client_id: str) -> None: ...
    def ausfuehrungen(self) -> list[Ausfuehrung]: ...
    def bargeld(self) -> Decimal: ...
    def bestaende(self) -> dict[str, Decimal]: ...
