// ORNAMENT LAB – ENTWURF eines Cloudflare Workers für jev live (nicht eingerichtet, nicht veröffentlicht). Aufgebaut wie tools/jev-worker/
// (dort für «Die Paradoxie der Stadt», unverändert): hält den Schlüssel als Secret, nimmt nur eine geprüfte Lage an (fragen.js: labLage),
// baut die Frage selbst (labFrage) und gibt nur Wahrscheinlichkeiten der erlaubten Optionen zurück. Einrichten nur mit Zustimmung
// (Kosten: etwa 1000 Eingabe-Token je Aufruf, bei 0,042 $ je Million rund 0,004 Cent): docs/JEV-STATUS.md.
//
//   Anfrage:  POST /lab/wahl  { verlauf: [...], optionen: [...] }     Antwort: { wahrscheinlichkeiten: { "lab.feedback": 0.6, … }, modell }
import { labLage, labFrage } from "./fragen.js";

const JEV = "https://api.typesafe.ai/v1/systemone";
const kopf = (herkunft) => ({ "access-control-allow-origin": herkunft, "access-control-allow-methods": "POST, OPTIONS", "access-control-allow-headers": "content-type", vary: "Origin" });
const antwort = (daten, status, herkunft) => new Response(JSON.stringify(daten), { status, headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store", ...(herkunft ? kopf(herkunft) : {}) } });

export default {
  async fetch(request, env) {
    const url = new URL(request.url), herkunft = request.headers.get("origin") ?? "";
    const ok = (env.ERLAUBT ?? "http://localhost:8790").split(",").map((s) => s.trim()).includes(herkunft);
    if (url.pathname !== "/lab/wahl") return antwort({ fehler: "unbekannter Weg" }, 404, ok ? herkunft : null);
    if (request.method === "OPTIONS") return ok ? new Response(null, { status: 204, headers: kopf(herkunft) }) : new Response(null, { status: 403 });
    if (!ok) return antwort({ fehler: "Herkunft nicht erlaubt" }, 403, null);
    if (request.method !== "POST") return antwort({ fehler: "nur POST" }, 405, herkunft);
    if (!env.TYPESAFE_API_KEY) return antwort({ fehler: "Schlüssel fehlt" }, 503, herkunft);
    const text = await request.text();
    if (text.length > 2000) return antwort({ fehler: "zu gross" }, 413, herkunft);
    let lage;
    try { lage = labLage(JSON.parse(text)); } catch (e) { return antwort({ fehler: String(e.message ?? e).slice(0, 120) }, 400, herkunft); }
    const { zustand, fragen } = labFrage(lage);
    let r;
    try {
      r = await fetch(JEV, { method: "POST", headers: { "content-type": "application/json", authorization: `Bearer ${env.TYPESAFE_API_KEY}` },
        body: JSON.stringify({ model: env.JEV_MODELL ?? "jev-latest", state: zustand, questions: fragen }), signal: AbortSignal.timeout(9000) });
    } catch { return antwort({ fehler: "jev nicht erreichbar" }, 502, herkunft); }
    if (!r.ok) return antwort({ fehler: `jev: HTTP ${r.status}` }, 502, herkunft);
    const j = await r.json(), p = j?.answers?.wahl?.probabilities;
    if (!p || typeof p !== "object") return antwort({ fehler: "jev: unerwartete Antwort" }, 502, herkunft);
    return antwort({ wahrscheinlichkeiten: Object.fromEntries(lage.optionen.map((o) => [o, Math.max(0, Math.min(1, Number(p[o]) || 0))])), modell: String(j.model ?? "jev") }, 200, herkunft);
  },
};
