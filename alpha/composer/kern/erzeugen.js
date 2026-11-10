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
  if (q.flaeche) return flaechenSpurRechnen(q, rate);
  if (q.grundton !== undefined || q.leiter) return notenSpurRechnen(q, rate);
  const st = stimmeVon(q.erzeuger, q.stimme), werte = { ...Object.fromEntries(st.parameter.map((p) => [p.key, p.std])), ...q.werte };
  const takt = (60 / q.bpm) * 4, anzahl = Math.max(1, q.anzahl ?? 8), n = Math.round(anzahl * takt * rate);
  const L = new Float32Array(n), R = new Float32Array(n), rnd = zufall(q.seed ?? 1), cache = new Map();
  const erste = st.artikulationen[0].key, gueltig = new Set(st.artikulationen.map((a) => a.key));
  let schlaege = 0;
  for (let b = 0; b < anzahl; b++) {
    // Teile (seit Composer 0.3): je Abschnitt eigene Muster und ein Wirbel im letzten Takt des Abschnitts
    const teil = Array.isArray(q.teile) ? q.teile.find((x) => b >= x.von && b < x.bis) : null;
    const fuellen = teil ? !!(teil.fill ?? q.fill) && b === teil.bis - 1 && teil.bis - teil.von >= 2 : q.fill && anzahl >= 4 && ((b + 1) % 8 === 0 || b === anzahl - 1);
    const muster = teil?.takte ?? q.takte, zeile = fuellen ? teil?.fill ?? q.fill : muster[(teil ? b - teil.von : b) % muster.length];
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
  // Teile (seit Composer 0.3): je Abschnitt eine eigene Linie; die Zeilen werden über die ganze Länge ausgeschrieben
  if (Array.isArray(q.teile) && q.teile.length) {
    const anzahl = Math.max(1, q.anzahl ?? 8), takte = Array.from({ length: anzahl }, (_, b) => { const t = q.teile.find((x) => b >= x.von && b < x.bis), m = t?.takte ?? q.takte; return m[(t ? b - t.von : b) % m.length]; });
    return notenSpurRechnen({ ...q, takte, teile: null }, rate);
  }
  // Die Zeilen wiederholen sich nach q.takte.length Takten: einen Durchlauf als Schleife rechnen (der Ausklang des letzten Tons liegt über
  // dem Anfang) und über die ganze Länge legen. Für lange Tracks ein Vielfaches schneller und Abtastwert für Abtastwert eine Wiederholung.
  const zyklus = Math.max(1, q.takte?.length ?? 1), gesamt = Math.max(1, q.anzahl ?? 8);
  if (gesamt > zyklus) {
    const eins = notenSpurRechnen({ ...q, anzahl: zyklus }, rate), n = Math.round(gesamt * (240 / q.bpm) * rate);
    const k = eins.kanaele.map((s) => { const out = new Float32Array(n); for (let o = 0; o < n; o += s.length) out.set(s.subarray(0, Math.min(s.length, n - o)), o); return out; });
    return { kanaele: k, schlaege: eins.schlaege * Math.ceil(gesamt / zyklus) };
  }
  const st = stimmeVon(q.erzeuger, q.stimme), werte = { ...Object.fromEntries(st.parameter.map((p) => [p.key, p.std])), ...q.werte };
  const takt = (60 / q.bpm) * 4, anzahl = Math.max(1, q.anzahl ?? 8), n = Math.round(anzahl * takt * rate), L = new Float32Array(n), R = new Float32Array(n);
  const noten = notenLesen(q.takte, { bpm: q.bpm, anzahl, leiter: q.leiter ?? "moll", swing: q.swing ?? 0, menschlich: q.menschlich ?? 0, versatz: q.versatz ?? 0, seed: q.seed ?? 1 });
  const f0 = grundFrequenz(q.grundton ?? 2, q.kammerton) * 2 ** (st.oktaveVon ? st.oktaveVon(werte) : werte.oktave ?? 0);
  const poly = st.poly ? st.poly(werte) : false;
  // einstimmig: vor der nächsten Note (in der Schleife auch der ersten nach dem Ende) klingt die vorige in 6 ms aus; «~» gleitet und
  // setzt die Hüllkurven nicht neu an (Legato, wie beim Slide eines Acid-Basses). Mehrstimmig: jede Note klingt ihren Ausklang zu Ende.
  const blende = Math.round(0.006 * rate);
  let vorher = null;
  noten.forEach((no, k) => {
    const frequenz = f0 * 2 ** (no.halbtoene / 12), legato = !poly && no.gleiten && vorher !== null;
    const [hl, hr] = st.rechne(werte, rate, { frequenz, dauer: no.dauer, staerke: no.staerke, seed: hash(q.seed ?? 1, k), gleitVon: no.gleiten && vorher ? vorher : null, legato, beginn: no.beginn, bpm: q.bpm });
    let bis = hl.length;
    if (poly) {   // ein langer Ausklang endet spätestens 2 s nach dem Beginn des übernächsten Akkords (weich ausgeblendet)
      const spaeter = noten.find((x, j) => j > k && x.gruppe > no.gruppe + 1)?.beginn;
      // (gehaltene Töne «=» klingen über mehrere Akkorde: nie vor ihrem eigenen Ende abschneiden)
      if (spaeter !== undefined) bis = Math.min(hl.length, Math.round(Math.max(spaeter - no.beginn + 2, no.dauer + 0.3) * rate));
      const aus = Math.min(bis, Math.round(0.3 * rate));
      if (bis < hl.length) for (let i = bis - aus; i < bis; i++) { const g = (bis - i) / aus; hl[i] *= g; hr[i] *= g; }
    } else {
      const naechste = noten.find((x, j) => j > k && x.gruppe !== no.gruppe)?.beginn ?? noten[0].beginn + anzahl * takt;
      bis = Math.min(hl.length, Math.max(blende, Math.round((naechste - no.beginn) * rate)));   // ausgeblendet, bevor die nächste einsetzt
    }
    let i0 = Math.round(no.beginn * rate); i0 = ((i0 % n) + n) % n;
    for (let i = 0; i < bis; i++) { const g = !poly && i >= bis - blende ? (bis - i) / blende : 1, j = (i0 + i) % n; L[j] += hl[i] * g; R[j] += hr[i] * g; }
    vorher = frequenz;
  });
  const kanaele = st.nach ? st.nach([L, R], rate, werte, q.seed ?? 1) : [L, R];
  return { kanaele, schlaege: noten.length };
}

// ---------- Flächen und Naturklänge ----------
/**
 * q: { erzeuger, stimme, werte, anzahl, bpm, grundton, leiter, seed, flaeche: true, dauer? (s, für lange Installationen statt anzahl Takte) }
 * bezug: { akkorde: [{ beginn, stufe }], einsaetze: [s], huelle: Float32Array (100 je s), sample: { kanaele, rate }, daten: [Zahlen] } – aus
 * den anderen Spuren und dem Import, vom Aufrufer bestimmt. Die Spur ist eine Schleife ohne Naht.
 */
export function flaechenSpurRechnen(q, rate, bezug = q.bezug ?? {}) {
  const st = stimmeVon(q.erzeuger, q.stimme), werte = { ...Object.fromEntries(st.parameter.map((p) => [p.key, p.std])), ...q.werte };
  const dauer = q.dauer ?? Math.max(1, q.anzahl ?? 8) * (60 / q.bpm) * 4;
  const kanaele = st.rechne(werte, rate, { dauer, bpm: q.bpm, seed: q.seed ?? 1, grundton: q.grundton ?? 2, leiter: q.leiter ?? "moll", kammerton: q.kammerton, ...bezug });
  return { kanaele, schlaege: 0 };
}
