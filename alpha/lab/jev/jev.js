// ORNAMENT LAB – jev live (optional). Die Seite spricht nie direkt mit api.typesafe.ai und hält keinen Schlüssel: sie fragt die eigene
// Zwischenstelle wahl.php auf dem Webspace (gleiche Adresse wie das Lab), die den Schlüssel ausserhalb der Website liest. Ob sie bereit ist,
// sagt sie auf GET (jevPruefen, kostet nichts); vorher und ohne Schlüssel ist jev live aus, und manuelle Wahl und die festen Regeln
// (regelVorschlaege) funktionieren immer. Lokal (starten.mjs, ohne PHP) ist jev live ebenfalls aus. Stand: docs/JEV-STATUS.md.
import { labLage } from "./fragen.js";

export const JEV_LAB_ADRESSE = new URL("./wahl.php", import.meta.url).href;

let zustand = { bereit: false, grund: "noch nicht geprüft" };
export const jevVerfuegbar = () => zustand.bereit;
export const jevZustand = () => ({ ...zustand });

/** fragt die Zwischenstelle, ob jev live eingerichtet ist (ohne jev aufzurufen); wirft nie */
export async function jevPruefen({ adresse = JEV_LAB_ADRESSE, abbrechen = null } = {}) {
  try {
    const r = await fetch(adresse, { headers: { accept: "application/json" }, cache: "no-store", signal: abbrechen ?? AbortSignal.timeout(6000) });
    const j = r.ok && (r.headers.get("content-type") ?? "").includes("json") ? await r.json() : null;
    zustand = j && typeof j.bereit === "boolean" ? { bereit: j.bereit, grund: j.bereit ? "" : String(j.grund ?? "nicht bereit").slice(0, 80) } : { bereit: false, grund: "Zwischenstelle nicht erreichbar" };
  } catch { zustand = { bereit: false, grund: "Zwischenstelle nicht erreichbar" }; }
  return jevZustand();
}

/** fragt jev nach Wahrscheinlichkeiten für die nächste Operation; wirft, wenn jev aus oder nicht erreichbar ist */
export async function jevWahl({ verlauf, optionen }, { adresse = null, abbrechen = null } = {}) {
  const ziel = adresse ?? (zustand.bereit ? JEV_LAB_ADRESSE : null);
  if (!ziel) throw new Error("jev live ist nicht eingerichtet");
  const lage = labLage({ verlauf, optionen });
  const r = await fetch(ziel, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(lage), signal: abbrechen ?? AbortSignal.timeout(15000) });
  const j = await r.json().catch(() => null);
  if (!r.ok) throw new Error(j?.fehler ? String(j.fehler).slice(0, 160) : `HTTP ${r.status}`);
  const p = j?.wahrscheinlichkeiten;
  if (!p || typeof p !== "object") throw new Error("unerwartete Antwort");
  const w = Object.fromEntries(lage.optionen.map((k) => [k, Math.max(0, Math.min(1, Number(p[k]) || 0))]));
  return { wahrscheinlichkeiten: w, modell: String(j.modell ?? "jev"), zwischengespeichert: Boolean(j.zwischengespeichert), lage, quelle: "live", zeit: new Date().toISOString() };
}
