"""Kritische Abnahmetests (Abschnitt 10 des Bauauftrags). Jeder Test nennt den geprüften Punkt."""
import json
import urllib.error
from decimal import Decimal

import pytest

from anlage.ausfuehrung import Sperre
from anlage.broker.basis import PaperSchutzVerletzung
from anlage.broker.live import IbkrAdapter, KrakenAdapter
from anlage.broker.basis import OrderAuftrag
from anlage.buchhaltung import bargeld, bestaende, buche, kumulativ
from anlage.engine import AktionsFehler
from anlage.geld import D
from anlage.konfig import KonfigFehler
from anlage.mandatspruefung import OrderVorschlag, pruefe_order
from anlage.zyklus import Parameter, zielvorlage

from conftest import FLACH, kaufe_direkt, mandat_mit, setze_uhr, zaehle


def summe_einzahlungen(x, depot="haupt"):
    return sum(D(r[0]) for r in x.conn.execute("SELECT betrag FROM buchungen WHERE depot=? AND art='EINZAHLUNG'", (depot,)))


# ---------------------------------------------------------------------------------------------------------------- 1
def test_200_usd_gesamtstart_trotz_zweier_anbieter(fabrik, tmp_path):
    x = fabrik()
    assert summe_einzahlungen(x) == D("200")
    assert bargeld(x.conn, "haupt", "ibkr", x.jetzt()).gesamt + bargeld(x.conn, "haupt", "kraken", x.jetzt()).gesamt == D("200")
    assert x.broker["haupt"]["ibkr"].bargeld() + x.broker["haupt"]["kraken"].bargeld() == D("200")
    with pytest.raises(AktionsFehler):          # zweiter Start bucht nicht doppelt
        x.starten()
    assert summe_einzahlungen(x) == D("200")
    # Eine Startverteilung von 200 je Anbieter (= 400) wird abgewiesen
    with pytest.raises(KonfigFehler):
        mandat_mit(tmp_path, lambda r: r.update(startverteilung_usd={"ibkr": "200.00", "kraken": "200.00"}))


# ---------------------------------------------------------------------------------------------------------------- 2
def _zielnah_btc(x, preis="890000"):
    """Kraken: 0.001 BTC → mit dem künstlich gesetzten Kurs liegt der Netto-Liquidationswert knapp über 1'000 USD."""
    kaufe_direkt(x, "kraken", "BTC/USD", "0.001", "65000")
    x.md.uebersteuert["BTC/USD"] = D(preis)


def test_zielaenderung_auf_1200_verhindert_abwicklung_bei_1000(fabrik):
    x = fabrik()
    _zielnah_btc(x)
    assert x.bewertung().netto_liquidation >= D("1000")
    x.ziel_aendern("Ich will 1200", zielbetrag="1200")
    for _ in range(3):
        x.schritt()
    assert x.zyklus()["zustand"] == "SIMULATION"
    assert zaehle(x, "SELECT COUNT(*) FROM orders WHERE zweck='ZIELABWICKLUNG'") == 0


def test_automatik_aus_laesst_weiterlaufen(fabrik):
    x = fabrik()
    _zielnah_btc(x)
    x.ziel_aendern("weiterlaufen lassen", auto_zielabwicklung=False)
    x.schritt()
    assert x.zyklus()["zustand"] == "SIMULATION"


def test_zielaenderung_waehrend_laufender_verkaeufe_ohne_doppelorder(fabrik):
    x = fabrik()                                   # 13:00 UTC Montag: US-Börse noch zu
    kaufe_direkt(x, "kraken", "BTC/USD", "0.001", "65000")
    kaufe_direkt(x, "ibkr", "AAPL", "0.9", "100")
    x.md.uebersteuert["BTC/USD"] = D("400000")     # Krypto ~400 USD
    x.md.uebersteuert["AAPL"] = D("700")           # Aktie ~630 USD, Markt zu
    x.md.mengen["AAPL"] = D("0.4")                 # kleine Kursgrösse → Teilfüllungen
    x.schritt(weiter=False)
    assert x.zyklus()["zustand"] == "ZIEL_ABWICKLUNG"
    assert bestaende(x.conn, "haupt").get(("kraken", "BTC/USD")) is None     # Krypto sofort verkauft
    x.schritt()                                    # 14:00: Markt offen → AAPL-Verkauf, nur teilweise gefüllt
    aapl = x.conn.execute("SELECT * FROM orders WHERE instrument='AAPL' AND zweck='ZIELABWICKLUNG'").fetchall()
    assert len(aapl) == 1 and D(aapl[0]["gefuellt"]) > 0 and aapl[0]["status"] == "TEILGEFUELLT"
    x.ziel_aendern("doch höher", zielbetrag="1200")
    bericht = x.schritt(weiter=False)
    assert x.zyklus()["zustand"] == "SIMULATION"
    assert any("Zielabwicklung abgebrochen" in h for h in bericht["hinweise"])
    for _ in range(3):
        x.schritt()
    aapl = x.conn.execute("SELECT * FROM orders WHERE instrument='AAPL' AND zweck='ZIELABWICKLUNG'").fetchall()
    assert len(aapl) == 1 and aapl[0]["status"] == "STORNIERT"                 # keine zweite Order
    assert zaehle(x, "SELECT COUNT(*) FROM sim_orders WHERE depot='haupt' AND instrument='AAPL'") == 1
    assert D(aapl[0]["gefuellt"]) + bestaende(x.conn, "haupt")[("ibkr", "AAPL")] == D("0.9")   # Teilverkauf bleibt bestehen


# ---------------------------------------------------------------------------------------------------------------- 3
def test_manuelle_teilentnahme_unter_ziel_aenderung_verschieben_verwerfen(fabrik):
    x = fabrik()
    kaufe_direkt(x, "kraken", "ETH/USD", "0.03", "2500")       # 75 USD in ETH, 25 USD bar
    v = x.entnahme_vorschau("140")                             # mehr als das freie Bargeld → Teilverkauf nötig
    assert v["moeglich"] and v["verkaeufe"] and not v["vollstaendige_liquidation"]
    pid = x.entnahme_planen("140", "Teilentnahme")
    assert zaehle(x, "SELECT COUNT(*) FROM orders") == 0                      # vor Bestätigung wird nichts verkauft
    x.entnahme_verkaeufe_bestaetigen(pid)
    x.schritt()
    plan = x.conn.execute("SELECT * FROM auszahlungsplaene WHERE id=?", (pid,)).fetchone()
    assert plan["status"] == "BEREIT"
    eth_rest = bestaende(x.conn, "haupt")[("kraken", "ETH/USD")]
    assert eth_rest > 0                                                        # keine Zwangsliquidation
    x.plan_bearbeiten(pid, "nur 135", an_mich="135")                           # geänderte Verteilung
    x.plan_bestaetigen(pid)
    assert zaehle(x, "SELECT COUNT(*) FROM buchungen WHERE art='AUSZAHLUNG'") == 0   # keine automatische Überweisung
    u = x.conn.execute("SELECT * FROM ueberweisungen WHERE plan_id=?", (pid,)).fetchall()
    assert sum(D(r["betrag"]) for r in u) == D("135")
    for r in u:
        x.ueberweisung_ausgefuehrt(r["id"])
        x.ueberweisung_bestaetigt(r["id"], "BANK-REF-1")
    z = x.zyklus()
    assert z["zustand"] == "SIMULATION" and z["ziel_erreicht_am"] is None    # kein falscher Erfolgsvermerk
    assert x.kumulativ()["ausgezahlt_bestaetigt"] == D("135")
    # verschoben und verworfen
    p2 = x.entnahme_planen("5", "später")
    x.plan_verschieben(p2, "2026-12-01", "nicht jetzt")
    assert x.conn.execute("SELECT status FROM auszahlungsplaene WHERE id=?", (p2,)).fetchone()[0] == "VERSCHOBEN"
    x.plan_wieder_aufnehmen(p2)
    x.plan_verwerfen(p2, "PAUSIEREN", "doch nicht")
    assert x.zyklus()["zustand"] == "MANUELL_PAUSIERT"
    assert zaehle(x, "SELECT COUNT(*) FROM reservierungen WHERE plan_id=? AND aktiv=1", p2) == 0
    x.fortsetzen()
    assert x.zyklus()["zustand"] == "SIMULATION" and x.zyklus()["ziel_erreicht_am"] is None


# ---------------------------------------------------------------------------------------------------------------- 4
def test_genau_1000_netto_ergibt_600_200_200(fabrik):
    m = fabrik(starten=False).m
    p = Parameter(1, D("1000"), True, D("200"), D("200"), "an_mich", "test", None, "")
    a, hinweis = zielvorlage(m, p, {"ibkr": D("500"), "kraken": D("505")}, D("0"))   # 5 USD Kraken-Auszahlungskosten
    assert (a.an_mich, a.langfrist, a.neustart, a.verfuegbar_netto) == (D("600"), D("200"), D("200"), D("1000"))
    assert not a.fehler


def test_genau_1000_netto_im_ablauf(fabrik):
    x = fabrik()
    x.einzahlung("ibkr", "400", "Testaufbau für genau 1000 netto")
    x.einzahlung("kraken", "405", "Testaufbau für genau 1000 netto")
    for _ in range(2):
        x.schritt()
    assert x.zyklus()["zustand"] == "AUSZAHLUNG_AUSSTEHEND"
    plan = x.conn.execute("SELECT * FROM auszahlungsplaene").fetchone()
    assert (D(plan["an_mich"]), D(plan["langfrist"]), D(plan["neustart"])) == (D("600"), D("200"), D("200"))
    assert x.kumulativ()["ergebnis_nach_kosten"] == 0                          # Einzahlungen sind kein Gewinn


def test_anderes_ziel_keine_hochrechnung(fabrik):
    m = fabrik(starten=False).m
    p = Parameter(2, D("2000"), True, D("200"), D("200"), "an_mich", "ICH", None, "")
    a, _ = zielvorlage(m, p, {"ibkr": D("1000"), "kraken": D("1005")}, D("0"))
    assert (a.an_mich, a.langfrist, a.neustart) == (D("1600"), D("200"), D("200"))   # nicht 1200/400/400
    p = Parameter(3, D("300"), True, D("200"), D("200"), "an_mich", "ICH", None, "")
    a, status = zielvorlage(m, p, {"ibkr": D("150"), "kraken": D("160")}, D("0"))
    assert status == "MANUELL_AUFTEILEN" and a.fehler


# ---------------------------------------------------------------------------------------------------------------- 5
def test_1000_buchwert_aber_980_nach_ausfuehrung_keine_auszahlung(fabrik):
    x = fabrik()                                   # Montag 13:00 UTC: US-Börse zu
    kaufe_direkt(x, "ibkr", "AAPL", "1", "90")
    x.md.uebersteuert["AAPL"] = D("906")
    assert x.bewertung().netto_liquidation >= D("1000")
    x.schritt(weiter=False)
    assert x.zyklus()["zustand"] == "ZIEL_ABWICKLUNG"
    x.md.uebersteuert["AAPL"] = D("873")           # Kurs fällt bis zur Ausführung
    for _ in range(40):                            # Verkauf bei Marktöffnung, Abwicklung T+1
        x.schritt()
        if x.zyklus()["zustand"] != "ZIEL_ABWICKLUNG":
            break
    z = x.zyklus()
    assert z["zustand"] == "SIMULATION" and z["ziel_erreicht_am"] is None and z["sperre_bis"]
    assert zaehle(x, "SELECT COUNT(*) FROM auszahlungsplaene") == 0
    assert zaehle(x, "SELECT COUNT(*) FROM buchungen WHERE art IN ('AUSZAHLUNG','LANGFRIST_UEBERTRAG')") == 0
    wechsel = x.conn.execute("SELECT grund FROM zustandswechsel ORDER BY id DESC LIMIT 1").fetchone()[0]
    assert "kein Erfolg, keine Auszahlung" in wechsel and "980.03" in wechsel
    x.schritt()
    assert x.zyklus()["zustand"] == "SIMULATION"   # Sperrfrist verhindert sofortiges Flattern


# ---------------------------------------------------------------------------------------------------------------- 6
def test_kursgewinne_bei_offenen_kosten_kein_zu_frueher_erfolg(fabrik):
    x = fabrik()
    _zielnah_btc(x, "883000")
    nlw_ohne = x.bewertung().netto_liquidation
    assert nlw_ohne >= D("1000")
    x.betriebskosten_erfassen("Google Cloud", "HOSTING", "15.00", "OFFEN", notiz="noch nicht bezahlt")
    b = x.bewertung()
    assert b.netto_liquidation == nlw_ohne - D("15") and b.netto_liquidation < D("1000")
    assert b.wirtschaftlich == b.handelskontowert - D("15")
    x.schritt()
    assert x.zyklus()["zustand"] == "SIMULATION"


# ---------------------------------------------------------------------------------------------------------------- 7
def test_verlust_von_200_auf_50_keine_stop_loss_abschaltung(fabrik):
    x = fabrik()
    kaufe_direkt(x, "kraken", "BTC/USD", "0.0015", "65000")      # 97.50
    kaufe_direkt(x, "ibkr", "AAPL", "0.97", "100")              # 97.00
    x.md.uebersteuert["BTC/USD"] = D("16000")
    x.md.uebersteuert["AAPL"] = D("25")
    b = x.bewertung()
    assert b.handelskontowert < D("60")
    for _ in range(30):
        x.schritt()
    zustaende = {r[0] for r in x.conn.execute("SELECT nach FROM zustandswechsel")}
    assert x.zyklus()["zustand"] == "SIMULATION"
    assert not zustaende & {"TECHNISCH_PAUSIERT", "MANUELL_PAUSIERT", "KAPITAL_AUFGEBRAUCHT", "ZIEL_ABWICKLUNG"}
    assert bestaende(x.conn, "haupt")[("kraken", "BTC/USD")] == D("0.0015")   # kein Zwangsverkauf


# ---------------------------------------------------------------------------------------------------------------- 8
def test_kein_kredit_hebel_leerverkauf_fremdes_konto_oder_langfristdepot(fabrik, tmp_path):
    x = fabrik()
    k = x.kurse(x.jetzt())
    pr = lambda v, zustand="SIMULATION": pruefe_order(x.conn, x.m, "haupt", zustand, v, k, x.jetzt(), "PAPER", False)
    btc = k["BTC/USD"]
    gruende = pr(OrderVorschlag("kraken", "BTC/USD", "KAUF", D("0.003"), btc.brief, "STRATEGIE")).gruende   # ~195 USD > 100 USD
    assert any("Nicht genug freies" in g for g in gruende)                    # kein Kredit/Hebel
    gruende = pr(OrderVorschlag("kraken", "BTC/USD", "VERKAUF", D("0.001"), btc.geld, "STRATEGIE")).gruende
    assert any("keine Leerverkäufe" in g for g in gruende)
    assert not pr(OrderVorschlag("langfrist", "BTC/USD", "KAUF", D("0.0001"), btc.brief, "STRATEGIE")).ok
    assert not pr(OrderVorschlag("fremd", "AAPL", "KAUF", D("0.1"), D("100"), "STRATEGIE")).ok
    assert not pr(OrderVorschlag("kraken", "BTC-PERP", "KAUF", D("0.0001"), btc.brief, "STRATEGIE")).ok
    assert not pr(OrderVorschlag("kraken", "BTC/USD", "KAUF", D("0.0001"), btc.brief, "STRATEGIE", typ="OPTION")).ok
    assert not pr(OrderVorschlag("ibkr", "BTC/USD", "KAUF", D("0.0001"), btc.brief, "STRATEGIE")).ok        # falsches Konto
    with pytest.raises(ValueError):
        buche(x.conn, "haupt", 1, x.jetzt(), "langfrist", "KAUF", D("-1"))
    with pytest.raises(KonfigFehler):
        mandat_mit(tmp_path, lambda r: r["erlaubte_klassen"].append("futures"))
    with pytest.raises(KonfigFehler):
        mandat_mit(tmp_path, lambda r: r["universum"].append({**r["universum"][0], "id": "XAAPL", "klasse": "krypto_spot"}))


# ---------------------------------------------------------------------------------------------------------------- 9
def _mit_signal(x):
    """Steigender Markt: alle Instrumente wieder auf künstlichen Zufallspfad mit Aufwärtsdrift → Kaufsignale."""
    x.md.uebersteuert.clear()
    x.md.drift = {"aktie": 0.004, "etf": 0.003, "krypto_spot": 0.006}
    x.md._pfade.clear()


def test_jev_ausfall_keine_modellbasierten_orders(fabrik):
    def kaputt(url, kopf, rumpf):
        raise urllib.error.URLError("Verbindung abgelehnt")
    fabrik.extra = {"jev_transport": kaputt}
    x = fabrik(jev_modus="echt", jev_schluessel_via_proxy=True,
               aenderung=lambda r: r["betriebskosten"]["jev"].update(freigegebenes_budget_usd="1.00", max_aufrufe_je_tag=1000))
    _mit_signal(x)
    for _ in range(80):
        x.schritt()
    jev = [json.loads(r[0]) for r in x.conn.execute("SELECT jev FROM entscheidungen WHERE depot='haupt' AND jev IS NOT NULL")]
    assert jev and all(j["status"] == "JEV_NICHT_ERREICHBAR" for j in jev)
    assert zaehle(x, "SELECT COUNT(*) FROM orders WHERE depot='haupt' AND zweck='STRATEGIE'") == 0
    assert zaehle(x, "SELECT COUNT(*) FROM orders WHERE depot='v_ohne_jev'") > 0       # Vergleichsdepot ohne JEV handelt


def test_jev_fehlt_und_testantwort_nur_im_entwicklungsmodus(fabrik):
    x = fabrik(jev_modus="aus")
    _mit_signal(x)
    for _ in range(60):
        x.schritt()
    assert zaehle(x, "SELECT COUNT(*) FROM orders WHERE depot='haupt'") == 0
    assert all(json.loads(r[0])["status"] == "JEV_FEHLT" for r in x.conn.execute("SELECT jev FROM entscheidungen WHERE depot='haupt' AND jev IS NOT NULL"))
    y = fabrik(db="betrieb.sqlite3", umgebung="betrieb")       # Testantwort ausserhalb der Entwicklung → JEV_FEHLT
    assert y.jev.integrationsstatus() == "JEV_FEHLT" and y.vertex.integrationsstatus() == "VERTEX_FEHLT"


def test_veraltete_kurse_blockieren(fabrik):
    x = fabrik()
    _mit_signal(x)
    x.md.veraltet.update(x.m.universum)
    for _ in range(60):
        x.schritt()
    assert zaehle(x, "SELECT COUNT(*) FROM orders WHERE depot='haupt'") == 0
    assert any("Kurs" in h and "alt" in h for h in x.letzter_bericht["hinweise"])


def test_api_timeout_fragt_status_nach_statt_neu_zu_senden(fabrik):
    x = fabrik()
    _mit_signal(x)
    x.broker["haupt"]["kraken"].stoerung["timeout_nach_annahme"] = True
    x.broker["haupt"]["ibkr"].stoerung["timeout_nach_annahme"] = True
    for _ in range(60):
        x.schritt()
        if zaehle(x, "SELECT COUNT(*) FROM orders WHERE depot='haupt' AND notiz LIKE 'Zeitüberschreitung%'"):
            break
    unklar = x.conn.execute("SELECT * FROM orders WHERE depot='haupt' AND notiz LIKE 'Zeitüberschreitung%'").fetchone()
    assert unklar is not None                                                  # war UNKLAR, wurde abgefragt
    x.schritt()
    assert x.zyklus()["zustand"] == "SIMULATION"
    o = x.conn.execute("SELECT status FROM orders WHERE client_id=?", (unklar["client_id"],)).fetchone()
    assert o["status"] in ("OFFEN", "TEILGEFUELLT", "GEFUELLT")              # per Abfrage geklärt
    assert zaehle(x, "SELECT COUNT(*) FROM sim_orders WHERE depot='haupt' AND client_id=?", unklar["client_id"]) == 1
    # Antwort vor Annahme verloren → beim Broker unbekannt → NICHT_ANGEKOMMEN, kein automatischer Neuversand
    x.broker["haupt"]["kraken"].stoerung["timeout_vor_annahme"] = True
    x.broker["haupt"]["ibkr"].stoerung["timeout_vor_annahme"] = True
    for _ in range(80):
        x.schritt()
        if zaehle(x, "SELECT COUNT(*) FROM orders WHERE status='NICHT_ANGEKOMMEN'"):
            break
    weg = x.conn.execute("SELECT client_id FROM orders WHERE status='NICHT_ANGEKOMMEN'").fetchone()
    assert weg is not None
    assert zaehle(x, "SELECT COUNT(*) FROM sim_orders WHERE client_id=?", weg[0]) == 0


def test_unklare_order_fuehrt_zu_technischer_pause(fabrik):
    x = fabrik()
    _mit_signal(x)
    for _ in range(60):
        x.schritt()
        if zaehle(x, "SELECT COUNT(*) FROM orders WHERE depot='haupt'"):
            break
    o = x.conn.execute("SELECT client_id FROM orders WHERE depot='haupt'").fetchone()
    x.conn.execute("UPDATE orders SET status='UNKLAR' WHERE client_id=?", (o[0],))
    for b in x.broker["haupt"].values():
        b.stoerung["status_timeout"] = True
    x.schritt()
    z = x.zyklus()
    assert z["zustand"] == "TECHNISCH_PAUSIERT" and "unklar" in z["pause_gruende"].lower()
    for b in x.broker["haupt"].values():
        b.stoerung.pop("status_timeout")
    x.schritt()
    assert x.zyklus()["zustand"] == "SIMULATION"


def test_doppelte_scheduler_aufrufe(fabrik):
    x = fabrik()
    _mit_signal(x)
    fremd = Sperre(x.conn, "ausfuehrung", inhaber="anderer-prozess")
    assert fremd.erwerben()
    assert x.schritt()["status"] == "LAEUFT_BEREITS"
    fremd.freigeben()
    for _ in range(60):
        x.schritt()
        if zaehle(x, "SELECT COUNT(*) FROM orders WHERE depot='haupt'"):
            break
    vorher = (zaehle(x, "SELECT COUNT(*) FROM orders"), zaehle(x, "SELECT COUNT(*) FROM entscheidungen"))
    x.schritt(weiter=False)                         # gleicher Datenzeitpunkt noch einmal
    x.schritt(weiter=False)
    assert (zaehle(x, "SELECT COUNT(*) FROM orders"), zaehle(x, "SELECT COUNT(*) FROM entscheidungen")) == vorher


# ---------------------------------------------------------------------------------------------------------------- 10
def test_teilfuellung_plus_neustart_keine_doppelorder(fabrik):
    x = fabrik()
    _mit_signal(x)
    x.md.mengen.update({"BTC/USD": D("0.0002"), "ETH/USD": D("0.004"), "AAPL": D("0.05"), "MSFT": D("0.05"), "SPY": D("0.05")})
    for _ in range(80):
        x.schritt()
        if zaehle(x, "SELECT COUNT(*) FROM orders WHERE depot='haupt' AND status='TEILGEFUELLT'"):
            break
    teil = x.conn.execute("SELECT * FROM orders WHERE depot='haupt' AND status='TEILGEFUELLT'").fetchone()
    assert teil is not None
    # Prozess-Neustart: neues Experiment-Objekt auf derselben Datenbank
    y = fabrik(flach=False, starten=False)
    y.md.drift, y.md.mengen = x.md.drift, x.md.mengen
    y.schritt(weiter=False)
    y.schritt()
    n = zaehle(y, "SELECT COUNT(*) FROM orders WHERE depot='haupt' AND instrument=? AND seite=?", teil["instrument"], teil["seite"])
    assert n == 1
    assert zaehle(y, "SELECT COUNT(*) FROM sim_orders WHERE depot='haupt' AND instrument=?", teil["instrument"]) == 1


# ---------------------------------------------------------------------------------------------------------------- 11
def _zum_ziel(x):
    x.einzahlung("ibkr", "450", "Testaufbau Zielerreichung")
    x.einzahlung("kraken", "455", "Testaufbau Zielerreichung")
    x.schritt()
    x.schritt()
    assert x.zyklus()["zustand"] == "AUSZAHLUNG_AUSSTEHEND"
    return x.conn.execute("SELECT id FROM auszahlungsplaene WHERE art='ZIEL'").fetchone()[0]


def test_auszahlungen_bleiben_manuell_unbestaetigt_kein_neustart(fabrik):
    x = fabrik()
    pid = _zum_ziel(x)
    for _ in range(3):
        x.schritt()
    assert zaehle(x, "SELECT COUNT(*) FROM buchungen WHERE art IN ('AUSZAHLUNG','LANGFRIST_UEBERTRAG')") == 0
    with pytest.raises(AktionsFehler):
        x.neustart()
    x.plan_bestaetigen(pid)
    ueb = x.conn.execute("SELECT * FROM ueberweisungen WHERE plan_id=?", (pid,)).fetchall()
    for u in ueb:
        x.ueberweisung_ausgefuehrt(u["id"])
    x.schritt()
    assert x.zyklus()["zustand"] == "AUSZAHLUNG_AUSSTEHEND"         # ausgeführt, aber nicht bestätigt
    kum = x.kumulativ()
    assert kum["in_transfer"] > 0 and kum["langfrist_bestaetigt"] == 0
    # Geld in Transfer zählt nicht zugleich als aktives Kapital
    assert kum["aktives_kapital"] == bargeld(x.conn, "haupt", "ibkr", x.jetzt()).gesamt + bargeld(x.conn, "haupt", "kraken", x.jetzt()).gesamt
    x.ueberweisung_gescheitert(ueb[0]["id"], geld_zurueck=True, notiz="Bank lehnt ab")
    for u in ueb[1:]:
        x.ueberweisung_bestaetigt(u["id"], f"REF{u['id']}")
    x.schritt()
    assert x.zyklus()["zustand"] == "AUSZAHLUNG_AUSSTEHEND"         # gescheitert → sichtbar warten, kein Nachfüllen
    neu = x.ueberweisung_neu_planen(ueb[0]["id"])
    x.ueberweisung_ausgefuehrt(neu)
    x.ueberweisung_bestaetigt(neu, "REF-ERSATZ")
    x.schritt()
    assert x.zyklus()["zustand"] == "NEUSTART_BEREIT"
    alt = x.zyklus()["id"]
    x.neustart()
    z = x.zyklus()
    assert z["id"] != alt and z["zustand"] == "SIMULATION" and D(z["startkapital"]) == D("200")
    assert summe_einzahlungen(x) == D("1105")                       # kein automatischer Nachschuss


def test_externe_einzahlung_ist_kein_gewinn(fabrik):
    x = fabrik()
    vorher = x.kumulativ()["ergebnis_nach_kosten"]
    x.einzahlung("ibkr", "50", "zusätzliches Kapital – meine Entscheidung")
    nachher = x.kumulativ()
    assert nachher["ergebnis_nach_kosten"] == vorher and nachher["einzahlungen"] == D("250")
    with pytest.raises(AktionsFehler):
        x.einzahlung("ibkr", "50", "")                              # nur mit ausdrücklicher Begründung


def test_kapital_unter_mindestorder_bleibt_sichtbar(fabrik):
    x = fabrik()
    for konto, rest in (("ibkr", "2.40"), ("kraken", "1.30")):
        betrag = bargeld(x.conn, "haupt", konto, x.jetzt()).gesamt - D(rest)
        x.betriebskosten_erfassen("Testanbieter", "DATEN", betrag, "BEZAHLT", bezahlt_aus=f"konto:{konto}")
    x.schritt()
    z = x.zyklus()
    assert z["zustand"] == "NICHT_HANDELSFAEHIG"
    assert x.bewertung().handelskontowert == D("3.70")              # nicht als null verbucht
    assert "3.70" in x.conn.execute("SELECT grund FROM zustandswechsel ORDER BY id DESC").fetchone()[0]


def test_paper_ruft_nie_live_order_endpunkte(fabrik, monkeypatch):
    x = fabrik()
    aufrufe = []

    def transport(*a, **k):
        aufrufe.append(a)
        return 200, {"error": [], "result": {}}
    kraken = KrakenAdapter(x.m, "schluessel", "c2VjcmV0", x.live_freigabe, x.conn, transport)
    ibkr = IbkrAdapter(x.m, "https://localhost:5000/v1/api", "U123", x.live_freigabe, x.conn, transport)
    auftrag = OrderAuftrag("t-1", "kraken", "BTC/USD", "KAUF", "LIMIT", D("0.0001"), D("65000"))
    for adapter in (kraken, ibkr):
        with pytest.raises(PaperSchutzVerletzung):
            adapter.sende(auftrag)
        with pytest.raises(PaperSchutzVerletzung):
            adapter.storniere("t-1")
    assert aufrufe == []
    # Auch mit gesetzten Kraken-Schlüsseln nutzt PAPER nur den simulierten Broker
    monkeypatch.setenv("KRAKEN_API_KEY", "x")
    assert {b.art for d in x.broker.values() for b in d.values()} == {"simulation"}
    # Eine PAPER-Datenbank kann nicht im LIVE-Modus geöffnet werden
    with pytest.raises(KonfigFehler):
        fabrik(modus="LIVE", starten=False)


def test_live_ohne_freigegebenes_mandat_gesperrt(fabrik):
    aufrufe = []
    fabrik.extra = {"live_transport": lambda *a, **k: (aufrufe.append(a), (200, {"authenticated": True}))[1]}
    x = fabrik(modus="LIVE", db="live.sqlite3", starten=False)
    ok, grund = x.live_freigabe()
    assert not ok and "ENTWICKLUNGSANNAHME" in grund
    with pytest.raises(AktionsFehler):
        x.live_aktivieren("Ich aktiviere …")
    with pytest.raises(PaperSchutzVerletzung):
        x.broker["haupt"]["kraken"].sende(OrderAuftrag("l-1", "kraken", "BTC/USD", "KAUF", "LIMIT", D("0.0001"), D("65000")))
    assert not any("AddOrder" in str(a) for a in aufrufe)


def test_kostenlimit_blockiert_ohne_verluste_wegzubuchen(fabrik):
    antworten = []

    def jev(url, kopf, rumpf):
        antworten.append(1)
        return {"model": "jev-test", "usage": {"input_tokens": len(rumpf) // 4, "output_tokens": 30}, "answers": {
            "belegt": {"type": "noul", "noul": 0.9}, "widerspruch": {"type": "noul", "noul": 0.1},
            "passung": {"type": "score", "score": 3.5, "confidence": 0.8, "legend": {}, "probabilities": {}},
            "aktion": {"type": "choice", "choice": "ABWARTEN", "confidence": 0.8, "probabilities": {}}}}
    fabrik.extra = {"jev_transport": jev}
    x = fabrik(jev_modus="echt", jev_schluessel_via_proxy=True,
               aenderung=lambda r: r["betriebskosten"]["jev"].update(freigegebenes_budget_usd="0.10", max_aufrufe_je_tag=100,
                                                                     preis_eingabe_usd_je_mio_token="30"))
    _mit_signal(x)
    for _ in range(120):
        x.schritt()
    status = [json.loads(r[0])["status"] for r in x.conn.execute("SELECT jev FROM entscheidungen WHERE depot='haupt' AND jev IS NOT NULL")]
    assert "JEV_OK" in status and "KOSTENBUDGET_ERSCHOEPFT" in status
    assert 1 <= len(antworten) < len(status)                        # nach Erschöpfung keine weiteren Aufrufe
    assert x.kosten.verbraucht("jev")["summe"] <= D("0.10")          # Budget nie überschritten
    assert x.kumulativ()["betriebskosten_extern"] == x.kosten.verbraucht("jev")["summe"]   # Kosten bleiben stehen
    assert zaehle(x, "SELECT COUNT(*) FROM orders WHERE depot='haupt' AND zweck='STRATEGIE'") == 0
    assert zaehle(x, "SELECT COUNT(*) FROM buchungen WHERE art IN ('KORREKTUR','GEBUEHR_KORREKTUR')") == 0
    # ohne freigegebenes Budget: gar kein Aufruf
    antworten.clear()
    y = fabrik(db="ohnebudget.sqlite3", jev_modus="echt", jev_schluessel_via_proxy=True)
    _mit_signal(y)
    for _ in range(60):
        y.schritt()
    assert antworten == []
    assert any(json.loads(r[0])["status"] == "KOSTENBUDGET_NICHT_FREIGEGEBEN" for r in y.conn.execute("SELECT jev FROM entscheidungen WHERE jev IS NOT NULL"))


def test_kumulative_bilanz_ueber_mehrere_zyklen(fabrik):
    x = fabrik()
    pid = _zum_ziel(x)                                              # Zyklus 1: erfolgreich
    x.plan_bestaetigen(pid)
    for u in x.conn.execute("SELECT id FROM ueberweisungen WHERE plan_id=?", (pid,)).fetchall():
        x.ueberweisung_ausgefuehrt(u[0])
        x.ueberweisung_bestaetigt(u[0], f"R{u[0]}")
    x.schritt()
    x.neustart()
    k1 = x.kumulativ()
    assert k1["ausgezahlt_bestaetigt"] > 0 and k1["langfrist_bestaetigt"] == D("200")
    # Zyklus 2: Verlust, von mir abgeschlossen
    kaufe_direkt(x, "kraken", "BTC/USD", "0.001", "65000")
    x.md.uebersteuert["BTC/USD"] = D("30000")
    x.schritt()
    x.schliessen_bestaetigen("Verlust realisieren")
    for _ in range(3):
        x.schritt()
    x.zyklus_abschliessen("gescheiterter Zyklus")
    zyklus3 = x.neuer_zyklus()
    k3 = x.kumulativ()
    assert zaehle(x, "SELECT COUNT(*) FROM zyklen") == 3
    assert (k3["einzahlungen"], k3["ausgezahlt_bestaetigt"], k3["langfrist_bestaetigt"]) == (k1["einzahlungen"], k1["ausgezahlt_bestaetigt"], k1["langfrist_bestaetigt"])
    assert k3["ergebnis_nach_kosten"] < k1["ergebnis_nach_kosten"]  # der Verlust bleibt sichtbar
    ergebnisse = [r[0] for r in x.conn.execute("SELECT ergebnis FROM zyklen ORDER BY id")]
    assert ergebnisse[:2] == ["ERFOLG", "MANUELL_ABGESCHLOSSEN"]
