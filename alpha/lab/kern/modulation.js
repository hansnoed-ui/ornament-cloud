// ORNAMENT LAB – das Modulationsprinzip (geprüft an VCV Rack, Bitwig Studio und TouchDesigner, Befunde: docs/MODULATION-DOSSIER.md).
// Ein Modulator ist eine Quelle, die an einer Stelle u (0–1) einen bipolaren Wert (−1 … +1) liefert. Eine Route verbindet ihn mit
// einem Zahlparameter einer beliebigen Operation; die Tiefe (−1 … +1) wirkt wie ein Attenuverter im Modularsystem: sie skaliert und
// kehrt um. u ist bewusst medienneutral: die Stelle einer Variante in der Reihe (Nebeneinander, wie das Falloff in Cavalry),
// die Zeit in einer Bildfolge (Nacheinander) oder später die Zeit in einem Klang. Dieselbe Route kann so Varianten verteilen,
// eine Animation steuern und künftig Klang- und Bildparameter koppeln.
// Aus dem Quellcode von VCV Rack übernommen (als Verfahren, nicht als Code): Grundwert + Signal × Abschwächer, erst die Summe
// aller Routen wird auf den Bereich begrenzt (Engine.cpp summiert gestapelte Kabel, Random.cpp/LFO.cpp begrenzen danach);
// «einpolig» verschiebt den Nullpunkt, nicht den Hub (LFO.cpp, Schalter OFFSET); ungültige Werte zählen als 0 (finitize).
import { zufall } from "../../../alpha/the-fictory/analyse.js?v=23";

export const QUELLEN = Object.freeze({
  keine: "keine Modulation",
  sinus: "Sinus (LFO)",
  dreieck: "Dreieck (LFO)",
  saege: "Sägezahn (Rampe)",
  zufall: "Zufall, gehalten (Sample & Hold)",
  signal: "Steuersignal aus einem Ergebnis",
});

/** Polarität einer Route: bipolar schwingt um den Grundwert, einpolig geht vom Grundwert aus in eine Richtung (gleicher Hub) */
export const POLARITAETEN = Object.freeze({
  bipolar: "bipolar (um den Grundwert)",
  einpolig: "einpolig (vom Grundwert aus)",
});

const bruch = (x) => x - Math.floor(x);
const endlich = (x) => (Number.isFinite(x) ? x : 0);

/** Abtastung (Sample & Hold): u auf h Stufen halten; jede Stufe trägt den Wert an ihrem Anfang, die letzte endet bei 1 */
export function halte(u, h) {
  const n = Math.round(h ?? 0);
  if (!(n >= 1)) return u;
  if (n === 1) return 0;
  return Math.min(n - 1, Math.floor(u * n)) / (n - 1);
}

/** Wert des Modulators an der Stelle u (0–1); m: { quelle, frequenz, phase, seed, stufen, halten, signal: { werte } } */
export function wert(m, u) {
  if (!m || m.quelle === "keine") return 0;
  if (m.quelle !== "zufall") u = halte(u, m.halten);
  const f = m.frequenz ?? 1, ph = m.phase ?? 0, x = u * f + ph;
  switch (m.quelle) {
    case "sinus": return Math.sin(2 * Math.PI * x);
    case "dreieck": return 1 - 4 * Math.abs(bruch(x + 0.25) - 0.5);
    case "saege": return 2 * bruch(x) - 1;
    case "zufall": {
      const stufen = Math.max(1, Math.round(m.stufen ?? 6));
      const k = Math.min(stufen - 1, Math.floor(bruch(x) * stufen) + stufen * Math.floor(x));
      return 2 * zufall(((m.seed ?? 1) ^ Math.imul(k + 1, 0x9e3779b1)) >>> 0)() - 1;
    }
    case "signal": {
      const w = m.signal?.werte;
      if (!w?.length) return 0;
      const p = bruch(x === 1 ? 0.999999 : x) * (w.length - 1), i = Math.floor(p), t = p - i;
      const v = endlich(w[i]) * (1 - t) + endlich(w[Math.min(w.length - 1, i + 1)]) * t;
      return 2 * v - 1;
    }
    default: throw new Error(`unbekannte Modulationsquelle: ${m.quelle}`);
  }
}

/** Wert einer Route vor der Tiefe: bipolar −1 … +1, einpolig 0 … 2 (derselbe Hub, der Grundwert wird zur unteren Kante) */
export function routenwert(r, u) {
  const v = endlich(wert(r.modulator, u));
  return r.polaritaet === "einpolig" ? v + 1 : v;
}

/**
 * Parameter einer Operation an der Stelle u modulieren. routen: [{ ziel, tiefe, polaritaet?, modulator }].
 * Nur Zahlparameter sind modulierbar; der Hub ist die halbe Spannweite des Parameters. Mehrere Routen auf dasselbe Ziel
 * werden zuerst summiert und erst dann auf min–max begrenzt, so hängt das Ergebnis nicht von ihrer Reihenfolge ab.
 */
export function moduliere(op, parameter, routen, u) {
  const out = { ...parameter }, summe = new Map();
  for (const r of routen ?? []) {
    const p = op.parameter.find((q) => q.id === r.ziel);
    if (!p || p.art !== "zahl" || !r.modulator || r.modulator.quelle === "keine") continue;
    const hub = ((p.max - p.min) / 2) * Math.max(-1, Math.min(1, endlich(r.tiefe ?? 0)));
    summe.set(p, (summe.get(p) ?? 0) + hub * routenwert(r, u));
  }
  for (const [p, d] of summe) {
    let v = Math.min(p.max, Math.max(p.min, endlich(out[p.id]) + d));
    if (p.schritt >= 1) v = Math.round(v / p.schritt) * p.schritt;
    out[p.id] = Math.round(v * 1e6) / 1e6;
  }
  return out;
}

/** die Stellen u für n Varianten: gleichmässig von 0 bis 1 (eine Variante: Mitte) */
export const stellen = (n) => (n <= 1 ? [0.5] : Array.from({ length: n }, (_, i) => i / (n - 1)));

/** eine Route ohne die Daten eines Steuersignals, fürs Projektprotokoll (das Signal steht als Ergebnis mit eigener Kennung im Projekt) */
export const routeFuersProtokoll = (r) => ({ ziel: r.ziel, tiefe: r.tiefe, ...(r.polaritaet && r.polaritaet !== "bipolar" ? { polaritaet: r.polaritaet } : {}), modulator: { ...r.modulator, signal: undefined } });
