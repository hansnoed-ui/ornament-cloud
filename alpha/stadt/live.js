// «Die Paradoxie der Stadt» – jev live über den Cloudflare Worker (tools/jev-worker/). Das einzige Modul der Seite, das etwas sendet,
// und nur, wenn jemand beim Begleiten «jev live fragen» einschaltet. Gesendet wird die Lage der begleiteten Person als Zahlen und feste Wörter
// (fragen.js: liveLage), kein Name und kein freier Text. Der Schlüssel für jev liegt nur im Worker.

/** Adresse des Workers nach dem Einrichten eintragen (siehe tools/jev-worker/README.md), z. B. "https://jev-stadt.<konto>.workers.dev/stadt/querung".
 *  Leer: Der Schalter erscheint nicht, die Stadt rechnet nur mit der Tabelle. */
export const JEV_LIVE_ADRESSE = "";

/** Mit ?debug lässt sich zum Testen eine andere Adresse angeben (?jevlive=…); sonst gilt die eingetragene. */
export function liveAdresse(params) {
  if (params.has("debug") && /^https?:\/\//.test(params.get("jevlive") ?? "")) return params.get("jevlive");
  return JEV_LIVE_ADRESSE;
}

/** Verbindung für stadt.r.live: das Modell ruft frage(key, lage) auf und liest antworten[key] (Wahrscheinlichkeiten, oder null = Tabelle) */
export function liveVerbindung(adresse, { zeitlimit = 8000, beiAntwort = () => {} } = {}) {
  const v = {
    figur: null, antworten: {}, ausstehend: {}, zuletzt: null,
    frage(key, lage) {
      v.ausstehend[key] = true;
      fetch(adresse, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(lage), signal: AbortSignal.timeout(zeitlimit) })
        .then((r) => (r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`))))
        .then((j) => {
          const p = j?.wahrscheinlichkeiten;
          if (!p || typeof p !== "object") throw new Error("unerwartete Antwort");
          v.antworten[key] = p;
          v.zuletzt = { ok: true, modell: j.modell, zwischengespeichert: !!j.zwischengespeichert };
        })
        .catch((e) => { v.antworten[key] = null; v.zuletzt = { ok: false, fehler: String(e.message ?? e) }; })
        .finally(() => { delete v.ausstehend[key]; beiAntwort(v.zuletzt); });
    },
  };
  return v;
}
