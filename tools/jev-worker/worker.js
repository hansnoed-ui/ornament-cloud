// jev live für «Die Paradoxie der Stadt» – ein Cloudflare Worker zwischen der Seite und jev (api.typesafe.ai).
// Er hält den Schlüssel (Secret TYPESAFE_API_KEY), nimmt nur eine streng geprüfte Lage an (fragen.js: liveLage), baut daraus selbst
// die Frage an jev und gibt nur die Wahrscheinlichkeiten zurück. Kein freier Text, keine Namen, keine Weitergabe an Dritte.
// Antworten werden 30 Tage zwischengespeichert (gleiche Lage, gleiche Antwort); Aufrufe je Adresse begrenzt (Bindung BEGRENZUNG, wenn eingerichtet).
//
//   cd tools/jev-worker && npx wrangler deploy          (einmal vorher: npx wrangler secret put TYPESAFE_API_KEY)
//
// Anfrage:  POST /stadt/querung   { …Lage… }          Antwort: { wahrscheinlichkeiten: { eben: 0.7, … }, modell, zwischengespeichert }
import { liveLage, liveFrage } from "../../alpha/stadt/fragen.js";

const JEV = "https://api.typesafe.ai/v1/systemone";
const STANDARD_ERLAUBT = "https://ornament.cloud";
const HALTBAR = 30 * 24 * 3600;

const kopfzeilen = (herkunft) => ({
  "access-control-allow-origin": herkunft,
  "access-control-allow-methods": "POST, OPTIONS",
  "access-control-allow-headers": "content-type",
  "access-control-max-age": "86400",
  vary: "Origin",
});
const antwort = (daten, status, herkunft) => new Response(JSON.stringify(daten), { status, headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store", ...(herkunft ? kopfzeilen(herkunft) : {}) } });

/** Schlüssel für den Zwischenspeicher: die bereinigte Lage in fester Reihenfolge */
async function schluessel(lage) {
  const roh = new TextEncoder().encode(JSON.stringify(lage));
  const h = await crypto.subtle.digest("SHA-256", roh);
  return `https://jev-stadt.zwischenspeicher/${[...new Uint8Array(h)].map((b) => b.toString(16).padStart(2, "0")).join("")}`;
}

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const herkunft = request.headers.get("origin") ?? "";
    const erlaubt = (env.ERLAUBT ?? STANDARD_ERLAUBT).split(",").map((s) => s.trim()).filter(Boolean);
    const ok = erlaubt.includes(herkunft);
    if (url.pathname !== "/stadt/querung") return antwort({ fehler: "unbekannter Weg" }, 404, ok ? herkunft : null);
    if (request.method === "OPTIONS") return ok ? new Response(null, { status: 204, headers: kopfzeilen(herkunft) }) : new Response(null, { status: 403 });
    if (!ok) return antwort({ fehler: "Herkunft nicht erlaubt" }, 403, null);
    if (request.method !== "POST") return antwort({ fehler: "nur POST" }, 405, herkunft);
    if (!env.TYPESAFE_API_KEY) return antwort({ fehler: "Schlüssel fehlt" }, 503, herkunft);

    if (env.BEGRENZUNG?.limit) {
      const { success } = await env.BEGRENZUNG.limit({ key: request.headers.get("cf-connecting-ip") ?? "unbekannt" });
      if (!success) return antwort({ fehler: "zu viele Anfragen" }, 429, herkunft);
    }
    const text = await request.text();
    if (text.length > 2000) return antwort({ fehler: "zu gross" }, 413, herkunft);
    let lage;
    try { lage = liveLage(JSON.parse(text)); } catch (e) { return antwort({ fehler: String(e.message ?? e).slice(0, 120) }, 400, herkunft); }

    const speicher = typeof caches !== "undefined" ? caches.default : null;
    const k = await schluessel(lage);
    if (speicher) {
      const alt = await speicher.match(k);
      if (alt) return antwort({ ...(await alt.json()), zwischengespeichert: true }, 200, herkunft);
    }
    const { zustand, fragen } = liveFrage(lage);
    let r;
    try {
      r = await fetch(JEV, {
        method: "POST",
        headers: { "content-type": "application/json", authorization: `Bearer ${env.TYPESAFE_API_KEY}` },
        body: JSON.stringify({ model: env.JEV_MODELL ?? "jev-latest", state: zustand, questions: fragen }),
        signal: AbortSignal.timeout(9000),
      });
    } catch { return antwort({ fehler: "jev nicht erreichbar" }, 502, herkunft); }
    if (!r.ok) return antwort({ fehler: `jev: HTTP ${r.status}` }, 502, herkunft);
    const j = await r.json();
    const p = j?.answers?.wahl?.probabilities;
    if (!p || typeof p !== "object") return antwort({ fehler: "jev: unerwartete Antwort" }, 502, herkunft);
    const daten = { wahrscheinlichkeiten: Object.fromEntries(lage.optionen.map((o) => [o, Math.max(0, Math.min(1, Number(p[o]) || 0))])), modell: String(j.model ?? "jev") };
    if (speicher) ctx?.waitUntil?.(speicher.put(k, new Response(JSON.stringify(daten), { headers: { "content-type": "application/json", "cache-control": `public, max-age=${HALTBAR}` } })));
    return antwort({ ...daten, zwischengespeichert: false }, 200, herkunft);
  },
};
