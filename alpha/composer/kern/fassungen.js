// Fassungen 0.1.0 – eine Spur durch eine neue Quelle ersetzen, ohne Mischung und Bearbeitung zu verlieren. Kanalzug, Plugin-Kette,
// Pegel, Panorama, Unterbrechungen und Bereiche gehören zur Spur, nicht zur Quelle; ersetzt wird nur die Quelle (Datei oder Rezept).
// Die alte Quelle bleibt als Fassung an der Spur und lässt sich jederzeit zurückholen (A/B).
//
// An der Spur: versatz (s, die Quelle beginnt später; negativ = früher), wiederholen (kürzere Quelle bis zur Länge des Projekts
// wiederholen), angleich (dB, Pegelangleich an die vorige Fassung), dehnung (Faktor; Tempo angeglichen mit WSOLA, beim Laden angewandt).
// fassungen: [{ id, name, zeit, datei | quelle, versatz, wiederholen, angleich, dehnung }] – die nicht aktiven Fassungen.

import { ausDB } from "./dsp.js";

export const FASSUNGEN_VERSION = "0.1.0";
export const QUELLE_FELDER = ["datei", "quelle", "versatz", "wiederholen", "angleich", "dehnung"];

/**
 * Quelle vorbereiten: verschieben, wiederholen, Pegel angleichen. laenge (Abtastwerte) ist die Länge des Projekts ohne diese Spur;
 * ohne sie bleibt die Quelle so lang, wie sie ist. Gibt die Quelle selbst zurück, wenn nichts zu tun ist.
 */
export function vorbereiten(roh, rate, { versatz = 0, wiederholen = false, angleich = 0 } = {}, laenge = 0) {
  const v = Math.round((versatz || 0) * rate), g = angleich ? ausDB(angleich) : 1;
  if (!v && !(wiederholen && laenge > roh[0].length) && g === 1) return roh;
  const n0 = roh[0].length, n = Math.max(1, wiederholen && laenge > n0 + v ? laenge : n0 + Math.max(0, v));
  return roh.map((s) => {
    const out = new Float32Array(n);
    for (let i = 0; i < n; i++) {
      let j = i - v;
      if (wiederholen && j >= n0) j %= n0;
      if (j >= 0 && j < n0) out[i] = s[j] * g;
    }
    return out;
  });
}

/** Einsatzkurve (positive Energiezunahme) in Fenstern von hop Abtastwerten */
function einsatzKurve(kanaele, hop) {
  const n = kanaele[0].length, m = Math.floor(n / hop), e = new Float32Array(m), d = new Float32Array(m);
  for (let j = 0; j < m; j++) { let s = 0; for (const k of kanaele) for (let i = j * hop; i < (j + 1) * hop; i += 2) s += k[i] * k[i]; e[j] = Math.log1p(1000 * s / hop); }
  for (let j = 1; j < m; j++) d[j] = Math.max(0, e[j] - e[j - 1]);
  return d;
}

/**
 * Wie weit muss die neue Quelle verschoben werden, damit ihre Einsätze auf denen der alten liegen? Gesucht wird in ±maxSek über die
 * ersten 30 s. Gibt { versatz (s), guete (0–1) } zurück; versatz > 0 heisst: die neue Quelle kommt später.
 */
export function ausrichten(neu, alt, rate, { maxSek = 1, dauer = 30 } = {}) {
  const hop = 256, kurz = (k) => k.map((s) => s.subarray(0, Math.min(s.length, Math.round(dauer * rate))));
  const a = einsatzKurve(kurz(alt), hop), b = einsatzKurve(kurz(neu), hop), max = Math.round((maxSek * rate) / hop);
  const norm = (x) => Math.sqrt(x.reduce((s, v) => s + v * v, 0)) || 1, na = norm(a), nb = norm(b);
  let best = 0, bestWert = -Infinity;
  for (let lag = -max; lag <= max; lag++) {
    let s = 0;
    for (let j = 0; j < a.length; j++) { const i = j - lag; if (i >= 0 && i < b.length) s += a[j] * b[i]; }
    if (s > bestWert) { bestWert = s; best = lag; }
  }
  return { versatz: (best * hop) / rate, guete: Math.max(0, Math.min(1, bestWert / (na * nb))) };
}

/** die aktive Quelle einer Spur als Fassung (für die Liste) */
export function fassungVon(sp, name) {
  const f = { id: "f-" + Math.random().toString(36).slice(2, 8), name: name ?? sp.name, zeit: new Date().toISOString() };
  for (const k of QUELLE_FELDER) if (sp[k] !== undefined && sp[k] !== null) f[k] = structuredClone(sp[k]);
  return f;
}

/** eine Fassung zur aktiven Quelle machen; die bisherige kommt in die Liste. Gibt die abgelöste Fassung zurück. */
export function fassungWechseln(sp, id) {
  const i = (sp.fassungen ?? []).findIndex((f) => f.id === id);
  if (i < 0) return null;
  const neu = sp.fassungen[i], alt = fassungVon(sp, sp.fassungName ?? sp.name);
  for (const k of QUELLE_FELDER) delete sp[k];
  for (const k of QUELLE_FELDER) if (neu[k] !== undefined) sp[k] = structuredClone(neu[k]);
  sp.datei = sp.datei ?? null;
  sp.fassungName = neu.name;
  sp.fassungen.splice(i, 1, alt);
  return alt;
}
