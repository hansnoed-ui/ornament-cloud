"""SQLite-Datenbank: einzige verbindliche Grundlage für Kapital, Kosten, Orders, Entscheidungen und Zyklusstatus.

Beträge und Mengen werden als exakter Text (Decimal) gespeichert, Zeiten als UTC-ISO-Text.
"""
from __future__ import annotations

import json
import sqlite3
from contextlib import contextmanager
from datetime import datetime, timedelta, timezone
from pathlib import Path

SCHEMA = """
CREATE TABLE IF NOT EXISTS meta (schluessel TEXT PRIMARY KEY, wert TEXT);

CREATE TABLE IF NOT EXISTS parameter_versionen (
  version INTEGER PRIMARY KEY AUTOINCREMENT, zeit TEXT NOT NULL,
  zielbetrag TEXT NOT NULL, auto_zielabwicklung INTEGER NOT NULL, neustartkapital TEXT NOT NULL,
  langfrist_zufuehrung TEXT NOT NULL, ueberschuss_an TEXT NOT NULL, durch TEXT NOT NULL, begruendung TEXT
);

CREATE TABLE IF NOT EXISTS zyklen (
  id INTEGER PRIMARY KEY AUTOINCREMENT, nummer INTEGER NOT NULL, modus TEXT NOT NULL, zustand TEXT NOT NULL,
  vorheriger_zustand TEXT, start TEXT, ende TEXT, startkapital TEXT, ergebnis TEXT, ziel_erreicht_am TEXT,
  sperre_bis TEXT, pause_gruende TEXT DEFAULT '[]', abwicklung_param_version INTEGER, rueckkehr_manuell TEXT, hinweis TEXT
);

CREATE TABLE IF NOT EXISTS zustandswechsel (
  id INTEGER PRIMARY KEY AUTOINCREMENT, zyklus_id INTEGER, zeit TEXT NOT NULL, von TEXT, nach TEXT NOT NULL,
  grund TEXT, durch TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS buchungen (
  id INTEGER PRIMARY KEY AUTOINCREMENT, depot TEXT NOT NULL, zyklus_id INTEGER, zeit TEXT NOT NULL, konto TEXT NOT NULL,
  art TEXT NOT NULL, waehrung TEXT NOT NULL DEFAULT 'USD', betrag TEXT NOT NULL DEFAULT '0', instrument TEXT,
  menge TEXT NOT NULL DEFAULT '0', verfuegbar_ab TEXT, referenz TEXT, notiz TEXT,
  UNIQUE (depot, referenz)
);
CREATE INDEX IF NOT EXISTS buchungen_konto ON buchungen (depot, konto);

CREATE TABLE IF NOT EXISTS orders (
  client_id TEXT PRIMARY KEY, depot TEXT NOT NULL, zyklus_id INTEGER, konto TEXT NOT NULL, instrument TEXT NOT NULL,
  seite TEXT NOT NULL, typ TEXT NOT NULL, menge TEXT NOT NULL, limit_preis TEXT, status TEXT NOT NULL,
  gefuellt TEXT NOT NULL DEFAULT '0', zweck TEXT NOT NULL, entscheidung_id INTEGER, plan_id INTEGER,
  erstellt TEXT NOT NULL, gesendet TEXT, aktualisiert TEXT, broker_ref TEXT, notiz TEXT
);
CREATE INDEX IF NOT EXISTS orders_status ON orders (depot, status);

CREATE TABLE IF NOT EXISTS fills (
  fill_id TEXT NOT NULL, depot TEXT NOT NULL, client_id TEXT NOT NULL, konto TEXT NOT NULL, instrument TEXT NOT NULL,
  seite TEXT NOT NULL, menge TEXT NOT NULL, preis TEXT NOT NULL, gebuehr TEXT NOT NULL, mittelkurs TEXT,
  zeit TEXT NOT NULL, abwicklung TEXT NOT NULL, PRIMARY KEY (depot, fill_id)
);

CREATE TABLE IF NOT EXISTS entscheidungen (
  id INTEGER PRIMARY KEY AUTOINCREMENT, depot TEXT NOT NULL, zyklus_id INTEGER, zeit TEXT NOT NULL, instrument TEXT,
  schluessel TEXT NOT NULL UNIQUE, eingabe TEXT, datenzeiten TEXT, strategie_version TEXT, kriterien_version TEXT,
  regel_version TEXT, signal TEXT, vertex TEXT, jev TEXT, entscheidung TEXT NOT NULL, begruendung TEXT,
  gegenargument TEXT, mandatspruefung TEXT, client_id TEXT
);

CREATE TABLE IF NOT EXISTS betriebskosten (
  id INTEGER PRIMARY KEY AUTOINCREMENT, zeit TEXT NOT NULL, zyklus_id INTEGER, anbieter TEXT NOT NULL, art TEXT NOT NULL,
  status TEXT NOT NULL, betrag TEXT NOT NULL, bezahlt_aus TEXT NOT NULL DEFAULT 'extern',
  tokens_ein INTEGER, tokens_aus INTEGER, referenz TEXT, notiz TEXT
);

CREATE TABLE IF NOT EXISTS auszahlungsplaene (
  id INTEGER PRIMARY KEY AUTOINCREMENT, zyklus_id INTEGER NOT NULL, art TEXT NOT NULL, status TEXT NOT NULL,
  erstellt TEXT NOT NULL, aktualisiert TEXT, version INTEGER NOT NULL DEFAULT 1,
  verfuegbar_netto TEXT, bargeld_gesamt TEXT, kostenerstattung TEXT NOT NULL DEFAULT '0', an_mich TEXT NOT NULL DEFAULT '0',
  langfrist TEXT NOT NULL DEFAULT '0', neustart TEXT NOT NULL DEFAULT '0', auszahlungskosten TEXT NOT NULL DEFAULT '0', quellen TEXT, geplanter_zeitpunkt TEXT,
  zyklus_abschliessen INTEGER NOT NULL DEFAULT 0, entnahme_betrag TEXT, nach_verwerfen TEXT, hinweis TEXT
);

CREATE TABLE IF NOT EXISTS plan_versionen (
  id INTEGER PRIMARY KEY AUTOINCREMENT, plan_id INTEGER NOT NULL, version INTEGER NOT NULL, zeit TEXT NOT NULL,
  werte TEXT NOT NULL, durch TEXT NOT NULL, begruendung TEXT
);

CREATE TABLE IF NOT EXISTS ueberweisungen (
  id INTEGER PRIMARY KEY AUTOINCREMENT, plan_id INTEGER NOT NULL, konto TEXT NOT NULL, art TEXT NOT NULL,
  betrag TEXT NOT NULL, status TEXT NOT NULL, referenz TEXT, beleg TEXT, gemeldet TEXT, bestaetigt TEXT, notiz TEXT
);

CREATE TABLE IF NOT EXISTS reservierungen (
  id INTEGER PRIMARY KEY AUTOINCREMENT, depot TEXT NOT NULL, konto TEXT NOT NULL, zweck TEXT NOT NULL,
  betrag TEXT NOT NULL, plan_id INTEGER, aktiv INTEGER NOT NULL DEFAULT 1
);

CREATE TABLE IF NOT EXISTS sperren (name TEXT PRIMARY KEY, inhaber TEXT NOT NULL, ablauf REAL NOT NULL);

CREATE TABLE IF NOT EXISTS werte (
  id INTEGER PRIMARY KEY AUTOINCREMENT, depot TEXT NOT NULL, zeit TEXT NOT NULL, zyklus_id INTEGER,
  handelskontowert TEXT NOT NULL, netto_liquidation TEXT, wirtschaftlich TEXT, gesamt_inkl_entnahmen TEXT NOT NULL,
  UNIQUE (depot, zeit)
);

CREATE TABLE IF NOT EXISTS live_aktivierung (
  id INTEGER PRIMARY KEY AUTOINCREMENT, zeit TEXT NOT NULL, mandat_version TEXT NOT NULL, mandat_hash TEXT NOT NULL, bestaetigung TEXT NOT NULL
);

-- Zustand des simulierten Brokers (nur PAPER und virtuelle Vergleichsdepots)
CREATE TABLE IF NOT EXISTS sim_konto (depot TEXT, konto TEXT, waehrung TEXT, betrag TEXT NOT NULL, PRIMARY KEY (depot, konto, waehrung));
CREATE TABLE IF NOT EXISTS sim_bestand (depot TEXT, konto TEXT, instrument TEXT, menge TEXT NOT NULL, PRIMARY KEY (depot, konto, instrument));
CREATE TABLE IF NOT EXISTS sim_orders (
  depot TEXT, client_id TEXT, konto TEXT, instrument TEXT, seite TEXT, menge TEXT, limit_preis TEXT, status TEXT,
  gefuellt TEXT NOT NULL DEFAULT '0', gebuehr_bisher TEXT NOT NULL DEFAULT '0', erstellt TEXT, broker_ref TEXT,
  PRIMARY KEY (depot, client_id)
);
CREATE TABLE IF NOT EXISTS sim_fills (
  depot TEXT, fill_id TEXT, client_id TEXT, konto TEXT, instrument TEXT, seite TEXT, menge TEXT, preis TEXT, gebuehr TEXT,
  mittelkurs TEXT, zeit TEXT, abwicklung TEXT, PRIMARY KEY (depot, fill_id)
);
"""


def jetzt_utc() -> datetime:
    return datetime.now(timezone.utc).replace(microsecond=0)


def iso(t: datetime) -> str:
    return t.astimezone(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")


def zeit(s: str) -> datetime:
    return datetime.strptime(s, "%Y-%m-%dT%H:%M:%SZ").replace(tzinfo=timezone.utc)


def verbinde(pfad: str) -> sqlite3.Connection:
    if pfad != ":memory:":
        Path(pfad).parent.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(pfad, isolation_level=None, timeout=10, check_same_thread=False)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON")
    if pfad != ":memory:":
        conn.execute("PRAGMA journal_mode = WAL")
    conn.executescript(SCHEMA)
    return conn


@contextmanager
def transaktion(conn: sqlite3.Connection):
    """Atomare Transaktion mit Schreibsperre (BEGIN IMMEDIATE). Verschachtelt aufgerufen läuft sie in der äusseren mit."""
    if conn.in_transaction:
        yield conn
        return
    conn.execute("BEGIN IMMEDIATE")
    try:
        yield conn
    except BaseException:
        conn.execute("ROLLBACK")
        raise
    else:
        conn.execute("COMMIT")


def meta_lesen(conn, schluessel: str, standard: str | None = None) -> str | None:
    r = conn.execute("SELECT wert FROM meta WHERE schluessel = ?", (schluessel,)).fetchone()
    return r["wert"] if r else standard


def meta_schreiben(conn, schluessel: str, wert: str) -> None:
    conn.execute("INSERT INTO meta (schluessel, wert) VALUES (?, ?) ON CONFLICT(schluessel) DO UPDATE SET wert = excluded.wert", (schluessel, wert))


def j(obj) -> str:
    return json.dumps(obj, ensure_ascii=False, default=str, sort_keys=True)


class Uhr:
    """Simulationsuhr (PAPER) oder echte UTC-Zeit (LIVE)."""

    def __init__(self, conn, modus: str, startzeit: str, schritt_minuten: int):
        self.conn, self.modus, self.schritt = conn, modus, timedelta(minutes=schritt_minuten)
        if modus == "PAPER" and meta_lesen(conn, "uhr") is None:
            meta_schreiben(conn, "uhr", startzeit)

    def jetzt(self) -> datetime:
        if self.modus == "LIVE":
            return jetzt_utc()
        return zeit(meta_lesen(self.conn, "uhr"))

    def weiter(self) -> datetime:
        if self.modus == "LIVE":
            return jetzt_utc()
        neu = self.jetzt() + self.schritt
        meta_schreiben(self.conn, "uhr", iso(neu))
        return neu
