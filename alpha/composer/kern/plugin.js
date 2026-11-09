// ORNAMENT COMPOSER – die Form eines Plugins. Ein Plugin beschreibt sich selbst und rechnet blockweise mit eigenem Zustand:
//
//   { id: "kanalzug", version: "0.1.0", name, kurz, beschreibung,
//     parameter: [{ key, name, gruppe, min, max, std, einheit, skala: "lin" | "log", schritt, aus, wahl }],
//     latenz(rate) → Abtastwerte,
//     erzeuge(rate) → { setze(werte), prozess(kanaele, n) → { reduktion } } }
//
// prozess rechnet an Ort und Stelle auf zwei Float32Array (links, rechts) der Länge ≥ n. Eine Version wird nie verändert, nachdem sie
// veröffentlicht ist: eine neue Klangidee ist eine neue Version (plugins/<id>-<version>.js), damit alte Mischungen gleich klingen.

export const schluessel = (def) => `${def.id}@${def.version}`;

export function standardWerte(def) { return Object.fromEntries(def.parameter.map((p) => [p.key, p.std])); }

/** Werte auf die Grenzen der Parameter bringen; Unbekanntes fällt weg, Fehlendes bekommt den Standard */
export function bereinigeWerte(def, werte = {}) {
  const out = {};
  for (const p of def.parameter) {
    const w = werte[p.key];
    if (p.wahl) out[p.key] = p.wahl.some((o) => o.wert === w) ? w : p.std;
    else out[p.key] = Number.isFinite(w) ? Math.min(p.max, Math.max(p.min, w)) : p.std;
  }
  return out;
}

export function pruefePlugin(def) {
  const fehler = [];
  if (!/^[a-z][a-z0-9-]*$/.test(def.id ?? "")) fehler.push("id");
  if (!/^\d+\.\d+\.\d+$/.test(def.version ?? "")) fehler.push("version");
  if (typeof def.erzeuge !== "function") fehler.push("erzeuge");
  for (const p of def.parameter ?? []) {
    if (p.wahl) { if (!p.wahl.some((o) => o.wert === p.std)) fehler.push(`${p.key}: Standard nicht in der Wahl`); }
    else if (!(p.min <= p.std && p.std <= p.max)) fehler.push(`${p.key}: Standard ausserhalb der Grenzen`);
  }
  return fehler;
}

/** Stellung eines Reglers (0–1) ↔ Wert, linear oder logarithmisch */
export function ausStellung(p, u) {
  const v = p.skala === "log" ? p.min * (p.max / p.min) ** u : p.min + (p.max - p.min) * u;
  return p.schritt ? Math.round(v / p.schritt) * p.schritt : v;
}
export function zuStellung(p, v) { return p.skala === "log" ? Math.log(v / p.min) / Math.log(p.max / p.min) : (v - p.min) / (p.max - p.min); }

/** ein Wert lesbar, mit Einheit; «aus», wenn der Parameter an dieser Stelle nichts tut */
export function zeigeWert(p, v) {
  if (p.wahl) return p.wahl.find((o) => o.wert === v)?.name ?? String(v);
  if (p.aus !== undefined && v === p.aus) return "aus";
  const e = p.einheit ?? "";
  if (e === "Hz") return v >= 1000 ? `${(v / 1000).toFixed(v >= 10000 ? 1 : 2).replace(".", ",")} kHz` : `${Math.round(v)} Hz`;
  if (e === "dB") return `${v > 0 ? "+" : v < 0 ? "−" : ""}${Math.abs(v).toFixed(1).replace(".", ",")} dB`;
  if (e === "ms") return `${v < 10 ? v.toFixed(1).replace(".", ",") : Math.round(v)} ms`;
  if (e === "%") return `${Math.round(v)} %`;
  if (e === ":1") return `${v.toFixed(1).replace(".", ",")}:1`;
  return `${(Math.round(v * 100) / 100).toString().replace(".", ",")}${e ? " " + e : ""}`;
}
