// ORNAMENT LAB – jev live (optional). Die Seite spricht nie direkt mit api.typesafe.ai und hält keinen Schlüssel: sie fragt einen eigenen
// Worker (Entwurf: worker-entwurf.js, eingerichtet wie tools/jev-worker/ für «Die Paradoxie der Stadt»). Solange JEV_LAB_ADRESSE leer ist,
// ist jev live aus; manuelle Wahl und die festen Regeln (regelVorschlaege) funktionieren immer. Stand: docs/JEV-STATUS.md.
import { labLage } from "./fragen.js";

export const JEV_LAB_ADRESSE = "";   // z. B. "https://jev-lab.<konto>.workers.dev/lab/wahl" – erst nach Einrichtung und Zustimmung eintragen

export const jevVerfuegbar = () => Boolean(JEV_LAB_ADRESSE);

/** fragt jev nach Wahrscheinlichkeiten für die nächste Operation; wirft, wenn jev aus oder nicht erreichbar ist */
export async function jevWahl({ verlauf, optionen }, { adresse = JEV_LAB_ADRESSE, abbrechen = null } = {}) {
  if (!adresse) throw new Error("jev live ist nicht eingerichtet");
  const lage = labLage({ verlauf, optionen });
  const r = await fetch(adresse, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(lage), signal: abbrechen ?? AbortSignal.timeout(12000) });
  if (!r.ok) throw new Error(`jev: HTTP ${r.status}`);
  const j = await r.json();
  const p = j?.wahrscheinlichkeiten;
  if (!p || typeof p !== "object") throw new Error("jev: unerwartete Antwort");
  const w = Object.fromEntries(lage.optionen.map((k) => [k, Math.max(0, Math.min(1, Number(p[k]) || 0))]));
  return { wahrscheinlichkeiten: w, modell: String(j.modell ?? "jev"), zwischengespeichert: Boolean(j.zwischengespeichert), lage };
}
