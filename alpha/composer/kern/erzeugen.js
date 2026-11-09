// Eine erzeugte Spur rechnen: Stimme + Werte + Muster + Tempo + Startwert → Stereospur. Schläge werden im Zwischenspeicher gehalten
// (Artikulation, Stärke in Achtelstufen, eine von vier Abwandlungen), damit 16 Takte nicht 256 Schläge neu rechnen. Der Nachklang am
// Ende wird an den Anfang gelegt: die Spur läuft als Schleife ohne Naht.

import { stimmeVon } from "../erzeuger/register.js";
import { zufall, hash } from "../erzeuger/grund.js";
import { taktLesen } from "./muster.js";
import { notenLesen, grundFrequenz } from "./linien.js";

/**
 * q: { erzeuger, stimme, werte, takte: [Zeilen], fill?, anzahl (Takte), bpm, swing (0–0,5), menschlich (ms), versatz (ms), seed }
 * Gibt { kanaele: [L, R], schlaege } zurück.
 */
export function spurRechnen(q, rate) {
  if (q.grundton !== undefined || q.leiter) return notenSpurRechnen(q, rate);
  const st = stimmeVon(q.erzeuger, q.stimme), werte = { ...Object.fromEntries(st.parameter.map((p) => [p.key, p.std])), ...q.werte };
  const takt = (60 / q.bpm) * 4, anzahl = Math.max(1, q.anzahl ?? 8), n = Math.round(anzahl * takt * rate);
  const L = new Float32Array(n), R = new Float32Array(n), rnd = zufall(q.seed ?? 1), cache = new Map();
  const erste = st.artikulationen[0].key, gueltig = new Set(st.artikulationen.map((a) => a.key));
  let schlaege = 0;
  for (let b = 0; b < anzahl; b++) {
    const fuellen = q.fill && anzahl >= 4 && ((b + 1) % 8 === 0 || b === anzahl - 1);
    const zeile = fuellen ? q.fill : q.takte[b % q.takte.length];
    for (const s of taktLesen(zeile, erste)) {
      if (!gueltig.has(s.art)) continue;
      const schritt = takt / s.n, swing = s.schritt % 2 === 1 ? (q.swing ?? 0) * schritt : 0;
      const zeit = b * takt + s.stelle * takt + swing + ((q.versatz ?? 0) + (rnd() * 2 - 1) * (q.menschlich ?? 0)) / 1000;
      const staerke = Math.max(0.05, Math.min(1.1, s.staerke * (1 + (rnd() * 2 - 1) * 0.07)));
      const stufe = Math.max(1, Math.round(staerke * 8)) / 8, abw = Math.floor(rnd() * 4);
      const k = `${s.art}|${stufe}|${abw}`;
      if (!cache.has(k)) cache.set(k, st.rechne(werte, rate, { art: s.art, staerke: stufe, seed: hash(q.seed ?? 1, s.art, abw) }));
      const [hl, hr] = cache.get(k), g = staerke / stufe;
      let i0 = Math.round(zeit * rate); i0 = ((i0 % n) + n) % n;
      for (let i = 0; i < hl.length; i++) { const j = (i0 + i) % n; L[j] += hl[i] * g; R[j] += hr[i] * g; }
      schlaege++;
    }
  }
  return { kanaele: [L, R], schlaege };
}

/** einen einzelnen Schlag (zum Anhören) */
export function schlagRechnen(q, art, rate, staerke = 0.9) {
  const st = stimmeVon(q.erzeuger, q.stimme), werte = { ...Object.fromEntries(st.parameter.map((p) => [p.key, p.std])), ...q.werte };
  return st.rechne(werte, rate, { art: art ?? st.artikulationen[0].key, staerke, seed: hash(q.seed ?? 1, art, 0) });
}

// ---------- melodische Spuren (Bass) ----------

/**
 * q: { erzeuger, stimme, werte, takte (Melodiezeilen), anzahl, bpm, grundton (0–11), leiter, swing, menschlich, versatz, seed }.
 * Jede Note wird einzeln gerechnet; «~» gleitet vom vorigen Ton her. Der Ausklang am Ende wird an den Anfang gelegt (Schleife ohne Naht).
 */
export function notenSpurRechnen(q, rate) {
  const st = stimmeVon(q.erzeuger, q.stimme), werte = { ...Object.fromEntries(st.parameter.map((p) => [p.key, p.std])), ...q.werte };
  const takt = (60 / q.bpm) * 4, anzahl = Math.max(1, q.anzahl ?? 8), n = Math.round(anzahl * takt * rate), L = new Float32Array(n), R = new Float32Array(n);
  const noten = notenLesen(q.takte, { bpm: q.bpm, anzahl, leiter: q.leiter ?? "moll", swing: q.swing ?? 0, menschlich: q.menschlich ?? 0, versatz: q.versatz ?? 0, seed: q.seed ?? 1 });
  const f0 = grundFrequenz(q.grundton ?? 2) * 2 ** (werte.oktave ?? 0);
  // einstimmig: vor der nächsten Note (in der Schleife auch der ersten nach dem Ende) klingt die vorige in 6 ms aus
  const blende = Math.round(0.006 * rate);
  let vorher = null;
  noten.forEach((no, k) => {
    const frequenz = f0 * 2 ** (no.halbtoene / 12);
    const [hl, hr] = st.rechne(werte, rate, { frequenz, dauer: no.dauer, staerke: no.staerke, seed: hash(q.seed ?? 1, k), gleitVon: no.gleiten && vorher ? vorher : null, beginn: no.beginn });
    const naechste = k + 1 < noten.length ? noten[k + 1].beginn : noten[0].beginn + anzahl * takt;
    const bis = Math.min(hl.length, Math.max(blende, Math.round((naechste - no.beginn) * rate)));   // ausgeblendet, bevor die nächste einsetzt
    let i0 = Math.round(no.beginn * rate); i0 = ((i0 % n) + n) % n;
    for (let i = 0; i < bis; i++) { const g = i >= bis - blende ? (bis - i) / blende : 1, j = (i0 + i) % n; L[j] += hl[i] * g; R[j] += hr[i] * g; }
    vorher = frequenz;
  });
  return { kanaele: [L, R], schlaege: noten.length };
}
