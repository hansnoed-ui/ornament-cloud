"""Adapter, Geldrechnung, Export, Oberfläche."""
import json
from decimal import Decimal

import pytest
from starlette.testclient import TestClient

from anlage import web
from anlage.broker.live import IbkrAdapter, KrakenAdapter, json_mit_dezimal, kraken_signatur
from anlage.broker.basis import Abgelehnt
from anlage.buchhaltung import bargeld
from anlage.export import als_json
from anlage.geld import D, abrunden, chf_format
from anlage.jev import fragen, pruefe_antwort
from anlage.strategie import kaufmenge
from anlage.vertex import SCHEMA, VertexAdapter, auswerten

from conftest import kaufe_direkt, zaehle


def test_kein_float_fuer_geld():
    with pytest.raises(TypeError):
        D(0.1)
    assert D("0.1") + D("0.2") == D("0.3")
    assert abrunden(D("0.123456789"), D("0.00000001")) == D("0.12345678")
    assert chf_format(D("1000")) == "1'000.00"


def test_kraken_signatur_dokumentiertes_beispiel():
    # Beispiel aus Krakens REST-Dokumentation (Authentifizierung)
    daten = {"nonce": 1616492376594, "ordertype": "limit", "pair": "XBTUSD", "price": 37500, "type": "buy", "volume": 1.25}
    geheim = "kQH5HW/8p1uGOVjbgWA7FunAmGO8lsSUXNsu3eow76sz84Q18fWxnyRzBHCd3pd5nE9qa99HAZtuZuj6F1huXg=="
    assert kraken_signatur("/0/private/AddOrder", daten, geheim) == "4/dpxb3iT4tp/ZCVEwSnEsLxx0bqyhLpdfOpc6fn7OR8+UClSV5n9E6aSS8MPtnRfp32bAb0nmbRn6H8ndwLUQ=="


def test_kraken_antworten_auswerten(fabrik):
    x = fabrik()
    st = KrakenAdapter.status_aus_antwort("c1", "TX1", {"status": "open", "vol_exec": "0.0002", "userref": 1})
    assert st.status == "TEILGEFUELLT" and st.gefuellt == D("0.0002")
    assert KrakenAdapter.status_aus_antwort("c1", "TX1", {"status": "canceled", "vol_exec": "0"}).status == "STORNIERT"
    x.conn.execute("INSERT INTO orders (client_id, depot, konto, instrument, seite, typ, menge, limit_preis, status, zweck, erstellt, broker_ref) "
                   "VALUES ('c1','haupt','kraken','BTC/USD','KAUF','LIMIT','0.001','65000','OFFEN','STRATEGIE','2026-10-12T13:00:00Z','TX1')")
    f = KrakenAdapter.ausfuehrungen_aus_antwort({"trades": {"T1": {"ordertxid": "TX1", "time": 1760274000.1, "type": "buy", "vol": "0.0005",
                                                                    "price": "65000.1", "fee": "0.26"}, "T2": {"ordertxid": "FREMD", "time": 1, "type": "buy", "vol": "1", "price": "1", "fee": "0"}}},
                                                x.conn, x.m)
    assert len(f) == 1 and f[0].menge == D("0.0005") and f[0].gebuehr == D("0.26")   # fremde Ausführung wird nicht verbucht


def test_ibkr_antworten_und_bestaetigungspflicht():
    st = IbkrAdapter.sende_antwort("c1", [{"order_id": "987", "order_status": "Submitted"}])
    assert st.status == "OFFEN" and st.broker_ref == "987"
    with pytest.raises(Abgelehnt, match="nicht automatisch bestätigt"):
        IbkrAdapter.sende_antwort("c1", [{"id": "abc", "message": ["Order value exceeds …"]}])
    assert json_mit_dezimal({"quantity": D("0.1234"), "price": D("212.05")}) == b'{"quantity": 0.1234, "price": 212.05}'


def test_jev_fragen_und_schema():
    q = fragen()
    assert {v["type"] for v in q.values()} == {"noul", "score", "choice"}
    assert set(q["aktion"]["criteria"]) == {"WEITER_PRUEFEN", "ORDER_VORSCHLAGEN", "ABWARTEN"}
    gut = {"answers": {"belegt": {"type": "noul", "noul": 0.8}, "widerspruch": {"type": "noul", "noul": 0.2},
                       "passung": {"type": "score", "score": 3.1, "confidence": 0.7, "legend": {}, "probabilities": {}},
                       "aktion": {"type": "choice", "choice": "ABWARTEN", "confidence": 0.6, "probabilities": {}}}}
    assert pruefe_antwort(gut)["aktion"]["choice"] == "ABWARTEN"
    schlecht = json.loads(json.dumps(gut))
    schlecht["answers"]["aktion"]["choice"] = "KAUFE_ALLES"
    with pytest.raises(ValueError):
        pruefe_antwort(schlecht)


def test_vertex_endpunkt_und_auswertung(fabrik):
    x = fabrik(vertex_modus="echt", vertex_projekt="mein-projekt", vertex_modell="gemini-2.5-flash")
    assert x.vertex.endpunkt() == "https://aiplatform.googleapis.com/v1/projects/mein-projekt/locations/global/publishers/google/models/gemini-2.5-flash:generateContent"
    x.e.vertex_ort = "europe-west6"
    assert x.vertex.endpunkt().startswith("https://europe-west6-aiplatform.googleapis.com/v1/projects/mein-projekt/locations/europe-west6/")
    antwort = {"candidates": [{"content": {"parts": [{"text": json.dumps({"hypothese": "H", "belege": ["a"], "gegenargumente": ["g"], "datenluecken": []})}]}}],
               "usageMetadata": {"promptTokenCount": 900, "candidatesTokenCount": 80}, "modelVersion": "gemini-2.5-flash-001"}
    erg, usage, version = auswerten(antwort)
    assert erg["hypothese"] == "H" and usage["promptTokenCount"] == 900 and version == "gemini-2.5-flash-001"
    assert set(SCHEMA["required"]) == {"hypothese", "belege", "gegenargumente", "datenluecken"}


def test_vertex_ohne_budget_und_ohne_preis_kein_aufruf(fabrik):
    aufrufe = []
    v = VertexAdapter
    x = fabrik(vertex_modus="echt", vertex_projekt="p", vertex_modell="m")
    x.vertex = v(x.e, x.kosten, transport=lambda *a: aufrufe.append(a), token_quelle=lambda: "t")
    a = x.vertex.analysiere({"instrument": {"id": "X"}}, None)
    assert a.status == "KOSTENBUDGET_NICHT_FREIGEGEBEN" and aufrufe == []
    y = fabrik(db="b.sqlite3", vertex_modus="echt", vertex_projekt="p", vertex_modell="m",
               aenderung=lambda r: r["betriebskosten"]["vertex"].update(freigegebenes_budget_usd="1.00", max_aufrufe_je_tag=10))
    y.vertex = v(y.e, y.kosten, transport=lambda *a: aufrufe.append(a), token_quelle=lambda: "t")
    assert y.vertex.analysiere({"instrument": {"id": "X"}}, None).status == "PREIS_UNBEKANNT" and aufrufe == []


def test_gebuehrenkorrektur_einmal_verbucht(fabrik):
    x = fabrik()
    x.md.uebersteuert["BTC/USD"] = D("65000")
    from anlage.mandatspruefung import OrderVorschlag
    v = OrderVorschlag("kraken", "BTC/USD", "KAUF", D("0.0005"), D("65100"), "STRATEGIE")
    x.ov["haupt"].sende("korr-1", v, x.zyklus()["id"])
    x.broker["haupt"]["kraken"].verarbeite(x.jetzt())
    x.ov["haupt"].abgleichen()
    fill = x.conn.execute("SELECT fill_id, gebuehr FROM fills WHERE depot='haupt'").fetchone()
    x.broker["haupt"]["kraken"].gebuehr_korrigieren(fill[0], D(fill[1]) + D("0.05"))
    for _ in range(3):
        a = x.ov["haupt"].abgleichen()
    assert zaehle(x, "SELECT COUNT(*) FROM buchungen WHERE art='GEBUEHR_KORREKTUR'") == 1
    assert not a.abweichungen                                                          # Buchführung = Broker


def test_keine_vergroesserung_nach_verlusten(fabrik):
    x = fabrik()
    inst, kurs = x.m.instrument("BTC/USD"), x.kurse(x.jetzt())["BTC/USD"]
    gross, _ = kaufmenge(x.m, inst, kurs, D("100"), D("100"))
    klein, _ = kaufmenge(x.m, inst, kurs, D("50"), D("50"))
    assert klein < gross


def test_export_und_seiten_ohne_geheimnisse(fabrik, monkeypatch):
    x = fabrik()
    x.e._geheim.update({"KRAKEN_API_SECRET": "GEHEIM-XYZ-123", "TYPESAFE_API_KEY": "TS-GEHEIM-456"})
    for _ in range(5):
        x.schritt()
    inhalt = als_json(x.conn, x.m)
    assert "GEHEIM-XYZ-123" not in inhalt and "TS-GEHEIM-456" not in inhalt
    c = TestClient(web.erstelle_app(x))
    for pfad in ("/", "/journal", "/kosten", "/vergleich", "/entnahme?betrag=10", "/schliessen", "/export.json", "/export/entscheidungen.csv"):
        r = c.get(pfad)
        assert r.status_code == 200 and "GEHEIM-XYZ-123" not in r.text and "TS-GEHEIM-456" not in r.text
    assert "SIMULATION" in c.get("/").text
    assert c.post("/aktion/pause", data={"csrf": "falsch"}).status_code == 403


def test_oberflaeche_ablauf(fabrik):
    x = fabrik()
    c = TestClient(web.erstelle_app(x))
    post = lambda n, **d: c.post(f"/aktion/{n}", data={"csrf": web.CSRF, **d}, follow_redirects=False)
    assert "fehler" not in post("ziel", zielbetrag="1200", auto_gesendet="1", auto_zielabwicklung="1", begruendung="höher").headers["location"]
    assert "Parameter%20v3" in post("ziel", zielbetrag="1100", begruendung="nochmal").headers["location"]
    assert "meldung" in post("schritt", anzahl="2").headers["location"]
    assert "1’100.00" in c.get("/").text
    r = post("pause")
    assert x.zyklus()["zustand"] == "MANUELL_PAUSIERT"
    post("fortsetzen")
    assert x.zyklus()["zustand"] == "SIMULATION"
    r = post("einzahlung", konto="ibkr", betrag="10", begruendung="")
    assert "fehler" in r.headers["location"]
