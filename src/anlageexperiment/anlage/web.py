"""Deutsche Oberfläche (Starlette + Jinja2). Läuft lokal (127.0.0.1); kein Schlüssel erreicht je den Browser.

Start:  python -m anlage.web        (Adresse http://127.0.0.1:8765)
"""
from __future__ import annotations

import json
import os
import secrets
import threading
import urllib.parse
from datetime import timedelta
from decimal import Decimal
from pathlib import Path

from jinja2 import Environment, FileSystemLoader, select_autoescape
from starlette.applications import Starlette
from starlette.requests import Request
from starlette.responses import HTMLResponse, PlainTextResponse, RedirectResponse, Response
from starlette.routing import Mount, Route
from starlette.staticfiles import StaticFiles

from . import export
from .buchhaltung import ARTEN, BEWERTUNGSGRUNDLAGE, OFFENE_ORDERSTATUS, externe_kosten, zyklus_kosten_offen
from .db import meta_lesen, zeit
from .engine import AktionsFehler, Experiment
from .geld import D, NULL, chf_format
from .konfig import HANDELSKONTEN
from .marktdaten import FEIERTAGE_HINWEIS, markt_offen
from .vergleich import NAMEN, vergleich
from .zyklus import ZUSTAND_TEXT, ZustandsFehler, aktuelle_parameter, offene_plaene, quellen

HIER = Path(__file__).parent
CSRF = secrets.token_urlsafe(24)


def _usd(x, stellen=2):
    if x is None or x == "":
        return "–"
    return chf_format(D(x) if not isinstance(x, Decimal) else x, stellen).replace("'", "’")   # typografischer Apostroph, wird nicht maskiert


def _pct(x):
    return "–" if x is None else f"{D(x) * 100:.1f} %".replace(".", ".")


def _menge(x):
    return "–" if x is None else format(D(x).normalize(), "f")


umgebung = Environment(loader=FileSystemLoader(HIER / "vorlagen"), autoescape=select_autoescape(["jinja"]))
umgebung.filters.update(usd=_usd, pct=_pct, menge=_menge, json_laden=lambda s: json.loads(s) if s else None)


class App:
    def __init__(self, experiment: Experiment | None = None):
        self.x = experiment or Experiment()
        self.lock = threading.RLock()

    def seite(self, name: str, request: Request, **ctx) -> HTMLResponse:
        t = umgebung.get_template(name)
        ctx.update(modus=self.x.e.modus, kuenstlich=self.x.md.kuenstlich, csrf=CSRF, meldung=request.query_params.get("meldung"),
                   fehler=request.query_params.get("fehler"), uhr=self.x.jetzt(), zustand_text=ZUSTAND_TEXT, pfad=request.url.path)
        return HTMLResponse(t.render(**ctx))

    # ---------------------------------------------------------------- Übersicht
    def uebersicht_daten(self) -> dict:
        x = self.x
        jetzt = x.jetzt()
        kurse = x.kurse(jetzt)
        z = x.zyklus()
        bew = x.bewertung("haupt", jetzt, kurse)
        p = aktuelle_parameter(x.conn)
        kum = x.kumulativ()
        letzte = x.conn.execute("SELECT * FROM entscheidungen WHERE depot='haupt' ORDER BY id DESC LIMIT 1").fetchone()
        daten = []
        for iid, k in kurse.items():
            inst = x.m.instrument(iid)
            daten.append({"id": iid, "name": inst.name, "klasse": inst.klasse, "konto": inst.konto, "kurs": k,
                          "alter_min": (k.alter_sekunden(jetzt) // 60) if k else None,
                          "zu_alt": (k is None) or k.alter_sekunden(jetzt) > int(x.m.limits["preisalter_max_sekunden"][inst.klasse]),
                          "offen": markt_offen(inst, jetzt), "nur_sim": inst.nur_simulation})
        integration = {"Marktdaten": x.md.name + (" – KÜNSTLICHE BEISPIELDATEN" if x.md.kuenstlich else ""),
                       "JEV": x.jev.integrationsstatus(), "Vertex AI": x.vertex.integrationsstatus()}
        for konto, b in x.broker["haupt"].items():
            try:
                st = b.anmeldung()
                integration[f"Broker {konto}"] = f"{b.art}: {'angemeldet' if st.angemeldet else 'NICHT ANGEMELDET'} – {st.grund}"
            except Exception as ex:  # Anzeige darf nie abstürzen
                integration[f"Broker {konto}"] = f"{b.art}: Fehler {type(ex).__name__}"
        budgets = {a: {"budget": D(x.m.betriebskosten[a]["freigegebenes_budget_usd"]), "verbraucht": x.kosten.verbraucht(a)["summe"],
                       "aufrufe_heute": x.kosten.aufrufe_heute(a), "max": x.m.betriebskosten[a]["max_aufrufe_je_tag"]} for a in ("vertex", "jev")}
        plaene = []
        for pl in offene_plaene(x.conn):
            plaene.append({"plan": pl, "q": quellen(pl), "ueb": x.conn.execute("SELECT * FROM ueberweisungen WHERE plan_id=? ORDER BY id", (pl["id"],)).fetchall()})
        offene = x.conn.execute(f"SELECT * FROM orders WHERE depot='haupt' AND status IN ({','.join('?' * len(OFFENE_ORDERSTATUS))}) ORDER BY erstellt",
                                OFFENE_ORDERSTATUS).fetchall()
        zid = z["id"] if z else None
        geb_zyklus = -sum((D(r[0]) for r in x.conn.execute("SELECT betrag FROM buchungen WHERE depot='haupt' AND zyklus_id=? AND art IN ('GEBUEHR','GEBUEHR_KORREKTUR')", (zid,))), NULL)
        return {"z": z, "p": p, "bew": bew, "kum": kum, "letzte": letzte, "daten": daten, "integration": integration, "budgets": budgets,
                "plaene": plaene, "offene": offene, "pause_gruende": json.loads(z["pause_gruende"] or "[]") if z else [],
                "bericht": x.letzter_bericht, "grundlage": BEWERTUNGSGRUNDLAGE, "geb_zyklus": geb_zyklus,
                "kosten_zyklus": externe_kosten(x.conn, zid) if zid else None, "kosten_offen_zyklus": zyklus_kosten_offen(x.conn, zid) if zid else NULL,
                "feiertage": FEIERTAGE_HINWEIS, "konten_cfg": x.m.konten, "mandat": x.m,
                "schliessen_laeuft": meta_lesen(x.conn, f"schliessen:{zid}") == "1" if zid else False,
                "zustandswechsel": x.conn.execute("SELECT * FROM zustandswechsel ORDER BY id DESC LIMIT 6").fetchall()}

    async def uebersicht(self, request: Request):
        with self.lock:
            return self.seite("uebersicht.jinja", request, **self.uebersicht_daten())

    # ---------------------------------------------------------------- Aktionen
    async def aktion(self, request: Request):
        form = await request.form()
        if form.get("csrf") != CSRF:
            return PlainTextResponse("Ungültiges Formular (CSRF)", status_code=403)
        name = request.path_params["name"]
        f = {k: (v.strip() if isinstance(v, str) else v) for k, v in form.items()}
        ziel = f.get("zurueck") or "/"
        try:
            with self.lock:
                meldung = self._aktion(name, f)
        except (AktionsFehler, ZustandsFehler, ValueError, ArithmeticError) as e:
            return RedirectResponse(f"{ziel}?fehler={urllib.parse.quote(str(e))}", status_code=303)
        if isinstance(meldung, Response):
            return meldung
        return RedirectResponse(f"{ziel}?meldung={urllib.parse.quote(meldung or 'Erledigt')}", status_code=303)

    def _aktion(self, name: str, f: dict):
        x = self.x
        if name == "starten":
            x.starten(); return "Experiment gestartet (Simulation)."
        if name == "schritt":
            n = max(1, min(int(f.get("anzahl", "1") or 1), 500))
            for _ in range(n):
                r = x.schritt()
                if r.get("status") == "LAEUFT_BEREITS":
                    return "Ein anderer Lauf ist aktiv – nichts doppelt ausgeführt."
            return f"{n} Schritt(e) ausgeführt."
        if name == "pause":
            x.pausieren(f.get("grund", "")); return "PAUSE: keine neuen Orders. Bestände bleiben unverändert."
        if name == "fortsetzen":
            x.fortsetzen(); return "Fortgesetzt."
        if name == "ziel":
            werte = {"zielbetrag": f.get("zielbetrag") or None, "neustartkapital": f.get("neustartkapital") or None,
                     "langfrist_zufuehrung": f.get("langfrist_zufuehrung") or None, "ueberschuss_an": f.get("ueberschuss_an") or None}
            if "auto_gesendet" in f:
                werte["auto_zielabwicklung"] = f.get("auto_zielabwicklung") == "1"
            p = x.ziel_aendern(f.get("begruendung", ""), **werte)
            return f"Parameter v{p.version} gespeichert (Ziel {_usd(p.zielbetrag)} USD, automatische Zielabwicklung {'an' if p.auto_zielabwicklung else 'aus'})."
        if name == "plan_bearbeiten":
            x.plan_bearbeiten(int(f["plan"]), f.get("begruendung", ""), an_mich=f.get("an_mich"), langfrist=f.get("langfrist"),
                              kostenerstattung=f.get("kostenerstattung")); return "Plan geändert (neue Version)."
        if name == "plan_bestaetigen":
            x.plan_bestaetigen(int(f["plan"])); return "Plan bestätigt. Überweisungen bitte selbst beim Anbieter ausführen und hier melden."
        if name == "plan_verschieben":
            x.plan_verschieben(int(f["plan"]), f.get("zeitpunkt", ""), f.get("begruendung", "")); return "Auszahlung verschoben."
        if name == "plan_wieder":
            x.plan_wieder_aufnehmen(int(f["plan"])); return "Plan wieder aufgenommen."
        if name == "plan_verwerfen":
            x.plan_verwerfen(int(f["plan"]), f.get("nach", "FORTSETZEN"), f.get("begruendung", "")); return "Plan verworfen."
        if name == "ueb_ausgefuehrt":
            x.ueberweisung_ausgefuehrt(int(f["ueb"]), f.get("notiz", "")); return "Als ausgeführt gemeldet – Geld ist in Transfer."
        if name == "ueb_bestaetigt":
            x.ueberweisung_bestaetigt(int(f["ueb"]), f.get("referenz", ""), f.get("beleg", "")); return "Eingang bestätigt."
        if name == "ueb_gescheitert":
            x.ueberweisung_gescheitert(int(f["ueb"]), f.get("geld_zurueck") == "1", f.get("notiz", "")); return "Als gescheitert vermerkt."
        if name == "ueb_neu":
            x.ueberweisung_neu_planen(int(f["ueb"])); return "Ersatzüberweisung geplant."
        if name == "neustart":
            x.neustart(); return "Neuer Zyklus gestartet."
        if name == "neuer_zyklus":
            x.neuer_zyklus(); return "Neuer Zyklus mit vorhandenem Kapital gestartet."
        if name == "abschliessen":
            x.zyklus_abschliessen(f.get("begruendung", "")); return "Zyklus abgeschlossen."
        if name == "einzahlung":
            x.einzahlung(f["konto"], f["betrag"], f.get("begruendung", "")); return "Einzahlung verbucht (kein Gewinn)."
        if name == "entnahme_planen":
            pid = x.entnahme_planen(f["betrag"], f.get("begruendung", ""))
            return RedirectResponse(f"/plan/{pid}?meldung={urllib.parse.quote('Entnahme geplant – bitte prüfen und bestätigen.')}", status_code=303)
        if name == "entnahme_bestaetigen":
            x.entnahme_verkaeufe_bestaetigen(int(f["plan"])); return "Entnahme reserviert; nötige Verkäufe werden ausgeführt."
        if name == "schliessen":
            x.schliessen_bestaetigen(f.get("begruendung", "")); return "Positionen werden geschlossen; Zyklus pausiert."
        if name == "kosten":
            x.betriebskosten_erfassen(f["anbieter"], f["art"], f["betrag"], f["status"], f.get("bezahlt_aus", "extern"), f.get("notiz", ""))
            return "Kosten erfasst."
        if name == "kosten_bezahlt":
            x.betriebskosten_bezahlt(int(f["id"])); return "Als bezahlt markiert."
        raise AktionsFehler(f"Unbekannte Aktion {name}")

    # ---------------------------------------------------------------- Unterseiten
    async def entnahme(self, request: Request):
        betrag = request.query_params.get("betrag")
        vorschau, fehler = None, None
        with self.lock:
            if betrag:
                try:
                    vorschau = self.x.entnahme_vorschau(betrag)
                except (AktionsFehler, ArithmeticError, ValueError) as e:
                    fehler = str(e)
            bew = self.x.bewertung()
            return self.seite("entnahme.jinja", request, betrag=betrag, vorschau=vorschau, vfehler=fehler, bew=bew, z=self.x.zyklus())

    async def schliessen(self, request: Request):
        with self.lock:
            return self.seite("schliessen.jinja", request, v=self.x.schliessen_vorschau(), z=self.x.zyklus())

    async def plan(self, request: Request):
        pid = int(request.path_params["pid"])
        with self.lock:
            pl = self.x.conn.execute("SELECT * FROM auszahlungsplaene WHERE id=?", (pid,)).fetchone()
            if pl is None:
                return PlainTextResponse("Plan nicht gefunden", status_code=404)
            return self.seite("plan.jinja", request, plan=pl, q=quellen(pl),
                              ueb=self.x.conn.execute("SELECT * FROM ueberweisungen WHERE plan_id=? ORDER BY id", (pid,)).fetchall(),
                              versionen=self.x.conn.execute("SELECT * FROM plan_versionen WHERE plan_id=? ORDER BY version", (pid,)).fetchall(),
                              p=aktuelle_parameter(self.x.conn), z=self.x.zyklus())

    async def journal(self, request: Request):
        with self.lock:
            c = self.x.conn
            return self.seite("journal.jinja", request,
                              entscheidungen=c.execute("SELECT * FROM entscheidungen WHERE depot='haupt' ORDER BY id DESC LIMIT 200").fetchall(),
                              wechsel=c.execute("SELECT * FROM zustandswechsel ORDER BY id DESC LIMIT 200").fetchall(),
                              parameter=c.execute("SELECT * FROM parameter_versionen ORDER BY version DESC").fetchall(),
                              buchungen=c.execute("SELECT * FROM buchungen WHERE depot='haupt' ORDER BY id DESC LIMIT 300").fetchall(),
                              orders=c.execute("SELECT * FROM orders WHERE depot='haupt' ORDER BY erstellt DESC LIMIT 200").fetchall(),
                              zyklen=c.execute("SELECT * FROM zyklen ORDER BY id DESC").fetchall(), arten=ARTEN, tabellen=export.TABELLEN)

    async def vergleichsseite(self, request: Request):
        with self.lock:
            v = vergleich(self.x.conn, self.x.m.startkapital)
            alle = [w for d in v["depots"] for _, w in d["reihe"]]
            if alle:
                lo, hi = min(alle), max(alle)
                v["min"], v["max"] = lo, hi
                spanne = (hi - lo) or D(1)
                for d in v["depots"]:
                    n = max(1, len(d["reihe"]) - 1)
                    d["punkte"] = " ".join(f"{i * 600 / n:.1f},{float(136 - (w - lo) / spanne * 132):.1f}" for i, (_, w) in enumerate(d["reihe"]))
            return self.seite("vergleich.jinja", request, v=v, namen=NAMEN, regel=self.x.m.vergleich)

    async def kostenseite(self, request: Request):
        with self.lock:
            return self.seite("kosten.jinja", request, kosten=self.x.conn.execute("SELECT * FROM betriebskosten ORDER BY id DESC LIMIT 300").fetchall(),
                              ext=externe_kosten(self.x.conn), cfg=self.x.m.betriebskosten,
                              budgets={a: self.x.kosten.verbraucht(a) for a in ("vertex", "jev")})

    async def export_json(self, request: Request):
        with self.lock:
            inhalt = export.als_json(self.x.conn, self.x.m, {"kumulativ": {k: str(v) for k, v in self.x.kumulativ().items()}})
        return Response(inhalt, media_type="application/json", headers={"content-disposition": "attachment; filename=anlageexperiment.json"})

    async def export_csv(self, request: Request):
        name = request.path_params["tabelle"]
        if name not in export.TABELLEN:
            return PlainTextResponse("Unbekannte Tabelle", status_code=404)
        with self.lock:
            inhalt = export.als_csv(self.x.conn, name)
        return Response(inhalt, media_type="text/csv; charset=utf-8", headers={"content-disposition": f"attachment; filename={name}.csv"})


def erstelle_app(experiment: Experiment | None = None) -> Starlette:
    a = App(experiment)
    app = Starlette(routes=[
        Route("/", a.uebersicht), Route("/aktion/{name}", a.aktion, methods=["POST"]),
        Route("/entnahme", a.entnahme), Route("/schliessen", a.schliessen), Route("/plan/{pid:int}", a.plan),
        Route("/journal", a.journal), Route("/vergleich", a.vergleichsseite), Route("/kosten", a.kostenseite),
        Route("/export.json", a.export_json), Route("/export/{tabelle}.csv", a.export_csv),
        Mount("/statisch", StaticFiles(directory=HIER / "statisch"), name="statisch"),
    ])
    app.state.anwendung = a
    return app


def main() -> None:
    import uvicorn
    host = os.environ.get("WEB_HOST", "127.0.0.1")
    port = int(os.environ.get("WEB_PORT", "8765"))
    uvicorn.run(erstelle_app(), host=host, port=port, log_level="warning")


if __name__ == "__main__":
    main()
