"""JEV (TypeSafe System One) – verbindlicher Bestandteil des Hauptsystems.

Schema verifiziert am 11.10.2026 gegen https://api.typesafe.ai/openapi.json (Version 0.2.0):
  POST /v1/systemone  {model, state, questions{name: {type: noul|score|choice, instructions, criteria}}}
  → {model, answers{name: NoulAnswer{noul} | ScoreAnswer{score, confidence, legend, probabilities}
                         | ChoiceAnswer{choice, confidence, probabilities}}, usage{input_tokens, output_tokens}}
  GET /v1/models → jev-latest, jev-preview. Ausgabe-Token derzeit kostenlos (laut Schema).

JEV beantwortet eng umrissene Fragen zu denselben belegten Daten. Seine Konfidenz ist KEINE Wahrscheinlichkeit eines
Kursgewinns; daraus wird keine Renditeprognose abgeleitet. Rechnen, Guthaben, Kursalter und Verbote prüft gewöhnlicher Code.
"""
from __future__ import annotations

import json
import urllib.error
import urllib.request
from dataclasses import dataclass, field

AKTIONEN = ("WEITER_PRUEFEN", "ORDER_VORSCHLAGEN", "ABWARTEN")
KRITERIEN_VERSION = "jev-kriterien-0.1.0"

STRATEGIEKRITERIEN = [
    "Ein Kauf passt nur, wenn der Kurs über seinem gleitenden Durchschnitt liegt, das Momentum positiv ist und die Schwankung begrenzt ist.",
    "Ein Verkauf passt, wenn der Kurs deutlich unter seinen Durchschnitt gefallen ist (Trendbruch).",
    "Bargeld halten und ABWARTEN sind gültige Ergebnisse; es gibt keine Mindestzahl an Trades.",
    "Unklare, widersprüchliche oder künstliche Daten sprechen für WEITER_PRUEFEN oder ABWARTEN.",
    "Es wird kein Gewinn versprochen; bewertet wird nur die Passung zu diesen Kriterien.",
]


def fragen() -> dict:
    return {
        "belegt": {"type": "noul",
                   "instructions": "Belegen die Zahlen im Abschnitt 'daten' die formulierte Anlagehypothese? Bewerte nur, ob die gelieferten Daten die Aussage stützen – nicht, ob sie wirtschaftlich klug ist.",
                   "criteria": {"true": "Die gelieferten Daten stützen jede tragende Aussage der Hypothese.",
                                "false": "Mindestens eine tragende Aussage der Hypothese ist durch die gelieferten Daten nicht gedeckt."}},
        "widerspruch": {"type": "noul",
                        "instructions": "Enthalten die gelieferten Daten oder die genannten Gegenargumente relevante Informationen, die der Hypothese widersprechen?",
                        "criteria": {"true": "Es gibt relevante widersprechende Informationen.",
                                     "false": "Es gibt keine relevanten widersprechenden Informationen."}},
        "passung": {"type": "score",
                    "instructions": "Wie gut passt der Vorschlag zu den angegebenen Strategiekriterien?",
                    "criteria": ["passt gar nicht", "passt kaum", "teilweise", "passt überwiegend", "passt vollständig"]},
        "aktion": {"type": "choice",
                   "instructions": "Welche nächste Handlung ist gemäss den Strategiekriterien angemessen?",
                   "criteria": {"WEITER_PRUEFEN": "Die Daten reichen für eine Entscheidung nicht aus oder sind widersprüchlich.",
                                "ORDER_VORSCHLAGEN": "Signal, Daten und Kriterien stimmen überein; ein Ordervorschlag ist gemäss den Kriterien angemessen.",
                                "ABWARTEN": "Die Kriterien sprechen gegen eine Order; Bargeld bzw. Bestand halten."}},
    }


@dataclass
class JevErgebnis:
    status: str                    # JEV_OK | JEV_TESTANTWORT | JEV_FEHLT | JEV_NICHT_ERREICHBAR | JEV_ANTWORT_UNGUELTIG | KOSTENBUDGET_* | PREIS_UNBEKANNT
    quelle: str
    modell: str | None = None
    antworten: dict = field(default_factory=dict)
    usage: dict | None = None
    fehler: str | None = None

    @property
    def nutzbar(self) -> bool:
        return self.status in ("JEV_OK", "JEV_TESTANTWORT") and set(self.antworten) >= {"belegt", "widerspruch", "passung", "aktion"}

    def als_dict(self) -> dict:
        return {"status": self.status, "quelle": self.quelle, "modell": self.modell, "antworten": self.antworten,
                "usage": self.usage, "fehler": self.fehler, "kriterien_version": KRITERIEN_VERSION}


def pruefe_antwort(j: dict) -> dict:
    """Validiert die Antwort streng gegen das Schema. Wirft ValueError bei Abweichung."""
    a = j.get("answers") or {}
    out = {}
    b = a.get("belegt", {})
    if b.get("type") != "noul" or not isinstance(b.get("noul"), (int, float)):
        raise ValueError("belegt: keine gültige Noul-Antwort")
    out["belegt"] = {"noul": float(b["noul"])}
    w = a.get("widerspruch", {})
    if w.get("type") != "noul" or not isinstance(w.get("noul"), (int, float)):
        raise ValueError("widerspruch: keine gültige Noul-Antwort")
    out["widerspruch"] = {"noul": float(w["noul"])}
    p = a.get("passung", {})
    if p.get("type") != "score" or not isinstance(p.get("score"), (int, float)):
        raise ValueError("passung: keine gültige Score-Antwort")
    out["passung"] = {"score": float(p["score"]), "confidence": float(p.get("confidence", 0)), "legend": p.get("legend")}
    c = a.get("aktion", {})
    if c.get("type") != "choice" or c.get("choice") not in AKTIONEN:
        raise ValueError("aktion: keine gültige Choice-Antwort")
    out["aktion"] = {"choice": c["choice"], "confidence": float(c.get("confidence", 0)), "probabilities": c.get("probabilities")}
    for name, v in (("belegt", out["belegt"]["noul"]), ("widerspruch", out["widerspruch"]["noul"])):
        if not 0 <= v <= 1:
            raise ValueError(f"{name}: Wert ausserhalb 0..1")
    return out


def testantwort(zustand: dict) -> JevErgebnis:
    """Klar markierte Testantwort für den Entwicklungsmodus. Niemals als reale Integration ausgeben."""
    k = zustand["daten"].get("kennzahlen", {})
    signal = zustand["daten"].get("signal")
    stark = signal in ("KAUF", "VERKAUF") and float(k.get("schwankung", "1")) < 0.03
    return JevErgebnis("JEV_TESTANTWORT", "TESTANTWORT (keine reale JEV-Bewertung)", "testantwort", {
        "belegt": {"noul": 0.8 if stark else 0.4},
        "widerspruch": {"noul": 0.2 if stark else 0.6},
        "passung": {"score": 3.4 if stark else 1.5, "confidence": 0.7, "legend": None},
        "aktion": {"choice": "ORDER_VORSCHLAGEN" if stark else "ABWARTEN", "confidence": 0.7, "probabilities": None},
    })


class JevAdapter:
    def __init__(self, einstellungen, kostenwaechter, transport=None):
        self.e, self.kosten = einstellungen, kostenwaechter
        self._transport = transport or self._http

    def _http(self, url: str, kopf: dict, rumpf: bytes, timeout: float = 30) -> dict:
        req = urllib.request.Request(url, data=rumpf, method="POST", headers=kopf)
        with urllib.request.urlopen(req, timeout=timeout) as r:
            return json.loads(r.read())

    def integrationsstatus(self) -> str:
        if self.e.jev_modus == "test":
            return "JEV_TESTANTWORT" if self.e.entwicklung else "JEV_FEHLT"
        if self.e.jev_modus != "echt":
            return "JEV_FEHLT"
        if not (self.e.hat("TYPESAFE_API_KEY") or self.e.jev_schluessel_via_proxy):
            return "JEV_FEHLT"
        return "JEV_KONFIGURIERT"

    def bewerte(self, zustand: dict, zyklus_id: int | None) -> JevErgebnis:
        st = self.integrationsstatus()
        if st == "JEV_TESTANTWORT":
            return testantwort(zustand)
        if st == "JEV_FEHLT":
            return JevErgebnis("JEV_FEHLT", "keine", fehler="JEV nicht konfiguriert (JEV_MODUS=echt und Schlüssel bzw. Proxy nötig; Testantworten nur im Entwicklungsmodus)")
        rumpf = json.dumps({"model": self.e.jev_modell, "state": zustand, "questions": fragen()}, ensure_ascii=False).encode()
        res = self.kosten.reserviere("jev", len(rumpf) // 3 + 400, 60, zyklus_id)
        if not res.erlaubt:
            return JevErgebnis(res.grund, "keine", fehler=f"Kein Aufruf: {res.grund}")
        kopf = {"content-type": "application/json"}
        if self.e.hat("TYPESAFE_API_KEY"):
            kopf["authorization"] = f"Bearer {self.e.geheimnis('TYPESAFE_API_KEY')}"
        try:
            j = self._transport(self.e.jev_url, kopf, rumpf)
        except (urllib.error.URLError, TimeoutError, OSError) as e:
            # Unklar, ob abgerechnet wurde → Reservierung bleibt konservativ als Kosten stehen
            self.kosten.abrechnen(res, None, None)
            return JevErgebnis("JEV_NICHT_ERREICHBAR", "keine", fehler=f"{type(e).__name__}: {str(e)[:200]}")
        usage = j.get("usage") or {}
        self.kosten.abrechnen(res, usage.get("input_tokens"), usage.get("output_tokens"), referenz=f"jev:{j.get('model')}")
        try:
            antworten = pruefe_antwort(j)
        except ValueError as e:
            return JevErgebnis("JEV_ANTWORT_UNGUELTIG", "JEV (api.typesafe.ai)", j.get("model"), usage=usage, fehler=str(e))
        return JevErgebnis("JEV_OK", "JEV (api.typesafe.ai)", j.get("model"), antworten, usage)
