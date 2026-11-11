// Klangsammlung 0.1.0 – eigene Aufnahmen als wachsender Bestand (ornament.lucerne, 10. November 2026). Drei Ebenen:
//   Quelle      die unveränderte Datei: stabile ID aus dem Inhalt (SHA-256), Name, Format, Analyse. Wird nie verändert.
//   Ausschnitt  ein Zeitbereich einer Quelle (Original-Start und -Ende in Sekunden), mit Art, Rolle und Tonhöhe
//   Variante    eine Bearbeitung eines Ausschnitts oder einer Variante (Eltern-Kind-Kette): Umkehr, Band, Zeitdehnung, Körner, Resampling
// Die Audiodaten selbst liegen nicht hier (und nie im öffentlichen Repo): im Browser in IndexedDB, für die Werkzeuge in ornament-material.
// Projekte speichern nur IDs, Zeitbereiche und Bearbeitungen; eine fehlende Datei wird mit Name und Prüfsumme gemeldet.
// Alle Funktionen geben eine neue Sammlung zurück (die alte bleibt für Rückgängig und Vergleich erhalten). Keine feste Zahl von Quellen.

import { mono, einsaetzeFinden, tempoSchaetzen } from "../../lab/kern/klangwerk.js";
import { hash } from "../erzeuger/grund.js";

export const SAMMLUNG_FORMAT = "ornament-klangsammlung", SAMMLUNG_VERSION = "0.1.0", ANALYSE_VERSION = "0.1.0";

/** stabile musikalische Rollen (getrennt von der Datei, die sie gerade spielt) */
export const ROLLEN = Object.freeze({
  main_motif: { name: "Hauptmotiv", hilfe: "spielbares Instrument oder Phrase, trägt das Motiv" },
  harmonic_layer: { name: "Harmonie", hilfe: "Akkordschatten, gehaltene Töne, Resonanzen" },
  counter_motif: { name: "Gegenmotiv", hilfe: "Antwort auf das Motiv, oft aus derselben Quelle" },
  texture: { name: "Textur", hilfe: "bewegte Fläche oder Körner aus dem Material" },
  ambience: { name: "Umgebung", hilfe: "freie Atmosphäre, nach Zeit geführt, nicht auf das Raster gezwungen" },
  accent: { name: "Akzent", hilfe: "kurzes Ereignis: Schlag, Anschlag, Übergang" },
  voice_optional: { name: "Stimme", hilfe: "Fragment, bewusst dosiert" },
  fragment: { name: "Fragmente", hilfe: "Schnitte einer bekannten Phrase in neuem Rhythmus" },
});

/** Arten nach Zeitbindung (F7): One-Shot, getakteter Loop, Phrase, freie Atmosphäre */
export const ARTEN = Object.freeze({
  oneshot: { name: "One-Shot", zeit: "ereignis" },
  loop: { name: "Loop", zeit: "takt" },
  phrase: { name: "Phrase", zeit: "takt" },
  atmosphaere: { name: "Atmosphäre", zeit: "frei" },
});

/** editierbare Ausgangsbereiche für abgeleitete Ausschnitte (Sekunden; Motiv in Takten) */
export const BEREICHE = Object.freeze({ korn: [0.02, 0.12], schnitt: [0.03, 0.25], ereignis: [0.1, 2], stimme: [0.3, 3], motivTakte: [1, 4] });

/** praktische Grenzen der Browser-Engine (Float32 stereo im Speicher: 48 kHz ≈ 0,37 MB je Sekunde) */
export const GRENZEN = Object.freeze({ dateiMB: 250, quelleSek: 15 * 60, speicherMB: 1200, analyseStueck: 30 });
export const speicherMB = (sek, rate = 48000, kanaele = 2) => (sek * rate * kanaele * 4) / 1048576;

/** stabile Quell-ID aus dem Inhalt: dieselbe Datei bekommt immer dieselbe ID, eine neue Datei verändert keine bestehende */
export const quelleId = (sha256) => `src-${sha256.slice(0, 12)}`;
export const ausschnittId = (quelle, von, bis, rolle = "") => `cut-${(hash(quelle, Math.round(von * 1000), Math.round(bis * 1000), rolle) >>> 0).toString(36)}`;
export const varianteId = (eltern, bearbeitung) => `var-${(hash(eltern, JSON.stringify(bearbeitung)) >>> 0).toString(36)}`;

export const NOTEN = ["C", "Cis", "D", "Es", "E", "F", "Fis", "G", "As", "A", "B", "H"];
export const notenName = (midi) => `${NOTEN[((Math.round(midi) % 12) + 12) % 12]}${Math.floor(Math.round(midi) / 12) - 1}`;

export function neueSammlung() {
  return { format: SAMMLUNG_FORMAT, version: SAMMLUNG_VERSION, quellen: [], ausschnitte: [], varianten: [], verlauf: [] };
}

const kopie = (s) => ({ ...s, quellen: [...s.quellen], ausschnitte: [...s.ausschnitte], varianten: [...s.varianten], verlauf: [...(s.verlauf ?? [])] });
const notiz = (s, text) => { s.verlauf.push({ zeit: new Date().toISOString(), text }); if (s.verlauf.length > 200) s.verlauf.shift(); return s; };

/**
 * Eine Quelle zur Klangsammlung hinzufügen («Zur Klangsammlung hinzufügen»). Ist dieselbe Datei (Prüfsumme) schon da, bleibt alles, wie
 * es ist, und die vorhandene Analyse wird wiederverwendet. Kein Track und kein Arrangement wird dabei verändert.
 * meta: { name, sha256, bytes, rate, kanaele, dauer, herkunft ("eigen" | "extern" | "test"), lizenz, notiz, grundton? (manuell, MIDI) }
 */
export function quelleHinzufuegen(sammlung, meta, analyse) {
  const id = quelleId(meta.sha256), da = sammlung.quellen.find((q) => q.id === id);
  if (da) return { sammlung, quelle: da, neu: false };
  const s = kopie(sammlung);
  const quelle = { id, name: meta.name, sha256: meta.sha256, bytes: meta.bytes ?? null, rate: meta.rate, kanaele: meta.kanaele, dauer: meta.dauer,
    herkunft: meta.herkunft ?? "eigen", lizenz: meta.lizenz ?? (meta.herkunft === "eigen" ? "eigene Aufnahme" : "nicht angegeben"), notiz: meta.notiz ?? "",
    test: meta.herkunft === "test", grundtonManuell: meta.grundton ?? null, aufgenommen: new Date().toISOString(), analyse };
  s.quellen.push(quelle);
  return { sammlung: notiz(s, `Quelle ${quelle.name} (${id}) hinzugefügt`), quelle, neu: true };
}

/** Ausschnitte (mit Original-Zeitmarken) zur Sammlung; gleiche ID = gleicher Ausschnitt, wird nicht doppelt angelegt */
export function ausschnitteHinzufuegen(sammlung, liste) {
  const s = kopie(sammlung), da = new Set(s.ausschnitte.map((a) => a.id));
  for (const a of liste) if (!da.has(a.id)) { s.ausschnitte.push(a); da.add(a.id); }
  return notiz(s, `${liste.length} Ausschnitte`);
}

/** eine Variante (Kind) eines Ausschnitts oder einer anderen Variante; das Original bleibt erhalten */
export function varianteHinzufuegen(sammlung, eltern, bearbeitung, mehr = {}) {
  const id = varianteId(eltern, bearbeitung);
  if (sammlung.varianten.some((v) => v.id === id)) return { sammlung, id };
  const s = kopie(sammlung);
  s.varianten.push({ id, eltern, bearbeitung, ...mehr });
  return { sammlung: notiz(s, `Variante ${id} von ${eltern}`), id };
}

/** der Ursprung eines Ausschnitts oder einer Variante: Kette bis zur Quelle mit Original-Zeitbereich */
export function herkunft(sammlung, id) {
  const kette = [];
  let x = id;
  for (let i = 0; i < 20 && x; i++) {
    const v = sammlung.varianten.find((y) => y.id === x);
    if (v) { kette.push({ id: v.id, bearbeitung: v.bearbeitung }); x = v.eltern; continue; }
    const a = sammlung.ausschnitte.find((y) => y.id === x);
    if (a) { const q = sammlung.quellen.find((y) => y.id === a.quelle); kette.push({ id: a.id, von: a.von, bis: a.bis }); return { quelle: q, ausschnitt: a, kette: kette.reverse() }; }
    break;
  }
  return null;
}

/** finden nach Rolle, Art, Inhalt (Text in Name/Notiz/Beschreibung), Grundton, Tempo, Herkunft */
export function suchen(sammlung, { rolle, art, text, grundton, tempo, herkunft: hk, quelle } = {}) {
  const t = text?.toLowerCase();
  return sammlung.ausschnitte.filter((a) => {
    const q = sammlung.quellen.find((x) => x.id === a.quelle);
    if (rolle && !(a.rollen ?? [a.rolle]).includes(rolle)) return false;
    if (art && a.art !== art) return false;
    if (quelle && a.quelle !== quelle) return false;
    if (hk && q?.herkunft !== hk) return false;
    if (grundton !== undefined && (a.tonhoehe?.midi == null || ((a.tonhoehe.midi - grundton) % 12 + 12) % 12 !== 0)) return false;
    if (tempo && !(q?.analyse?.tempo && Math.abs(q.analyse.tempo.bpm - tempo) < 4)) return false;
    if (t && !`${a.name ?? ""} ${a.beschreibung ?? ""} ${q?.name ?? ""} ${q?.notiz ?? ""}`.toLowerCase().includes(t)) return false;
    return true;
  });
}

// ---------- Analyse ----------
function fft(re, im) {
  const n = re.length;
  for (let i = 1, j = 0; i < n; i++) { let bit = n >> 1; for (; j & bit; bit >>= 1) j ^= bit; j ^= bit; if (i < j) { [re[i], re[j]] = [re[j], re[i]]; [im[i], im[j]] = [im[j], im[i]]; } }
  for (let len = 2; len <= n; len <<= 1) {
    const w = (-2 * Math.PI) / len, wr = Math.cos(w), wi = Math.sin(w);
    for (let i = 0; i < n; i += len) {
      let cr = 1, ci = 0;
      for (let k = 0; k < len / 2; k++) {
        const a = i + k, b = a + len / 2, tr = re[b] * cr - im[b] * ci, ti = re[b] * ci + im[b] * cr;
        re[b] = re[a] - tr; im[b] = im[a] - ti; re[a] += tr; im[a] += ti;
        const t = cr * wr - ci * wi; ci = cr * wi + ci * wr; cr = t;
      }
    }
  }
}
const r1 = (x, s = 10) => Math.round(x * s) / s;
const db = (x) => 20 * Math.log10(Math.max(1e-9, x));

/**
 * Tonhöhe eines kurzen Bereichs (YIN, de Cheveigné und Kawahara 2002) und Tonklasse-Profil (Chroma). Gibt { hz, midi, sicherheit,
 * mehrstimmig, chroma: [3 stärkste Tonklassen] } – sicherheit 0–1 aus der Periodizität; «mehrstimmig», wenn mehrere nicht verwandte
 * Tonklassen ähnlich stark sind: dann ist die Tonhöhe kein eindeutiger Einzelton und wird nur als Vorschlag gezeigt.
 */
export function tonhoeheSchaetzen(pcm, rate, { von = 0, bis = pcm.length / rate, fmin = 50, fmax = 1200 } = {}) {
  const a = Math.max(0, Math.round(von * rate)), b = Math.min(pcm.length, Math.round(bis * rate));
  const W = Math.round(rate * 0.05), tmax = Math.min(W, Math.floor(rate / fmin)), tmin = Math.max(2, Math.floor(rate / fmax));
  const schaetzungen = [];
  for (let s = a; s + W + tmax < b && schaetzungen.length < 40; s += Math.max(W, Math.floor((b - a - W - tmax) / 40))) {
    const d = new Float32Array(tmax + 1);
    for (let t = tmin; t <= tmax; t++) { let sum = 0; for (let i = 0; i < W; i += 2) { const x = pcm[s + i] - pcm[s + i + t]; sum += x * x; } d[t] = sum; }
    let lauf = 0, best = -1, bestWert = 1;
    const c = new Float32Array(tmax + 1);
    for (let t = 1; t <= tmax; t++) { lauf += d[t] || 0; c[t] = t < tmin ? 1 : (d[t] * t) / Math.max(1e-12, lauf); }
    for (let t = tmin; t < tmax; t++) if (c[t] < 0.25 && c[t] < c[t - 1] && c[t] <= c[t + 1]) { best = t; bestWert = c[t]; break; }
    if (best < 0) for (let t = tmin; t < tmax; t++) if (c[t] < bestWert) { bestWert = c[t]; best = t; }
    let energie = 0; for (let i = 0; i < W; i += 4) energie += pcm[s + i] ** 2;
    if (best > 0 && energie > 1e-6) {
      const l = c[best - 1], m = c[best], r = c[best + 1] ?? m, versatz = (l - r) / (2 * (l - 2 * m + r) || 1);
      schaetzungen.push({ hz: rate / (best + (Math.abs(versatz) < 1 ? versatz : 0)), klar: 1 - Math.min(1, bestWert) });
    }
  }
  const chroma = chromaVon(pcm, rate, a, b);
  const ordnung = chroma.map((w, k) => [w, k]).sort((x, y) => y[0] - x[0]);
  const chromaTop = ordnung.slice(0, 3).map(([w, k]) => ({ ton: NOTEN[k], klasse: k, anteil: r1(w, 100) }));
  // mehrstimmig: zweite und dritte Tonklasse fast so stark wie die erste und nicht Quinte/Oktave des Grundtons
  const verwandt = (k1, k2) => [0, 7, 5].includes(((k2 - k1) % 12 + 12) % 12);
  const mehrstimmig = ordnung[1][0] > ordnung[0][0] * 0.7 && !verwandt(ordnung[0][1], ordnung[1][1]) || ordnung[2][0] > ordnung[0][0] * 0.75;
  if (!schaetzungen.length) return { hz: null, midi: null, sicherheit: 0, mehrstimmig, chroma: chromaTop };
  const klar = schaetzungen.filter((x) => x.klar > 0.75);
  const basis = (klar.length >= 3 ? klar : schaetzungen).map((x) => 69 + 12 * Math.log2(x.hz / 440)).sort((x, y) => x - y);
  const midi = basis[basis.length >> 1], streuung = basis.filter((m) => Math.abs(m - midi) < 0.5).length / basis.length;
  const sicherheit = r1((klar.length / schaetzungen.length) * streuung * (mehrstimmig ? 0.5 : 1), 100);
  return { hz: r1(440 * 2 ** ((midi - 69) / 12), 10), midi: r1(midi, 100), note: notenName(midi), sicherheit, mehrstimmig, chroma: chromaTop };
}

/** Tonklassen-Profil (Chroma) eines Bereichs: FFT-Betrag 55–2000 Hz auf zwölf Tonklassen, Summe 1 */
export function chromaVon(pcm, rate, a = 0, b = pcm.length) {
  const N = 8192, out = new Float64Array(12), re = new Float64Array(N), im = new Float64Array(N);
  const schritte = Math.max(1, Math.min(24, Math.floor((b - a - N) / (N / 2))));
  for (let k = 0; k < schritte; k++) {
    const s = a + Math.floor(((b - a - N) * k) / Math.max(1, schritte - 1 || 1));
    if (s < 0 || s + N > pcm.length) continue;
    for (let i = 0; i < N; i++) { re[i] = pcm[s + i] * (0.5 - 0.5 * Math.cos((2 * Math.PI * i) / N)); im[i] = 0; }
    fft(re, im);
    for (let i = Math.ceil((55 * N) / rate); i < Math.min(N / 2, (2000 * N) / rate); i++) {
      const hz = (i * rate) / N, m = Math.sqrt(re[i] ** 2 + im[i] ** 2), klasse = ((Math.round(69 + 12 * Math.log2(hz / 440)) % 12) + 12) % 12;
      out[klasse] += m;
    }
  }
  const summe = out.reduce((x, y) => x + y, 0) || 1;
  return Array.from(out, (x) => x / summe);
}

/**
 * Akkord aus einem Chroma-Profil (Dur- und Molldreiklang als Schablonen): { grundton, art, sicherheit 0–1, ton (stärkste Tonklasse des
 * Akkords) }. Sicherheit aus dem Anteil der drei Akkordtöne an der ganzen Energie; mehrdeutige Klänge bekommen eine kleine Sicherheit.
 */
export function akkordSchaetzen(chroma) {
  let best = null, zweit = 0;
  for (let g = 0; g < 12; g++) for (const [art, t] of [["dur", [0, 4, 7]], ["moll", [0, 3, 7]]]) {
    const anteil = t.reduce((a, i) => a + chroma[(g + i) % 12], 0) + 0.15 * chroma[g];
    if (!best || anteil > best.anteil) { zweit = best?.anteil ?? 0; best = { grundton: g, art, anteil, t }; } else if (anteil > zweit) zweit = anteil;
  }
  const ton = best.t.map((i) => (best.grundton + i) % 12).sort((a, b) => chroma[b] - chroma[a])[0];
  return { grundton: best.grundton, art: best.art, name: `${NOTEN[best.grundton]}-${best.art === "dur" ? "Dur" : "Moll"}`, ton, sicherheit: r1(Math.max(0, Math.min(1, (best.anteil - 0.3) / 0.4)) * Math.min(1, (best.anteil - zweit) * 12 + 0.3), 100) };
}

/** Tonart-Kandidaten aus einem Chroma-Profil (Krumhansl-Kessler), die drei besten mit Korrelation */
export function tonartKandidaten(chroma) {
  const dur = [6.35, 2.23, 3.48, 2.33, 4.38, 4.09, 2.52, 5.19, 2.39, 3.66, 2.29, 2.88], moll = [6.33, 2.68, 3.52, 5.38, 2.6, 3.53, 2.54, 4.75, 3.98, 2.69, 3.34, 3.17];
  const korr = (x, y) => { const mx = x.reduce((a, b) => a + b) / 12, my = y.reduce((a, b) => a + b) / 12; let s = 0, sx = 0, sy = 0; for (let i = 0; i < 12; i++) { s += (x[i] - mx) * (y[i] - my); sx += (x[i] - mx) ** 2; sy += (y[i] - my) ** 2; } return s / Math.sqrt(sx * sy || 1); };
  const out = [];
  for (let k = 0; k < 12; k++) {
    const rot = (p) => p.map((_, i) => p[((i - k) % 12 + 12) % 12]);
    out.push({ grundton: k, leiter: "dur", name: `${NOTEN[k]}-Dur`, r: korr(chroma, rot(dur)) }, { grundton: k, leiter: "moll", name: `${NOTEN[k]}-Moll`, r: korr(chroma, rot(moll)) });
  }
  return out.sort((a, b) => b.r - a.r).slice(0, 3).map((x) => ({ ...x, r: r1(x.r, 100) }));
}

/**
 * Eine Quelle analysieren (gemessen, nicht gehört): Pegel, Lautheitsverlauf je 100 ms, Einsätze (spektraler Fluss), Dichte, Pausen,
 * grössere Veränderungen (Neuheit aus Pegel, Helligkeit und Dichte), Tempo mit Sicherheit, Tonart-Kandidaten. Alle Zeiten in Sekunden
 * der Originaldatei. Lange Quellen werden in Stücken gerechnet (ruft «fortschritt» zwischendurch auf).
 */
export function analysieren(kanaele, rate, { fortschritt } = {}) {
  const pcm = mono(kanaele), n = pcm.length, dauer = n / rate, hop = Math.round(rate / 10);
  let spitze = 0; for (const k of kanaele) for (let i = 0; i < k.length; i++) { const v = Math.abs(k[i]); if (v > spitze) spitze = v; }
  // Verlauf je 100 ms: Effektivwert und Helligkeit (Anteil der Nulldurchgänge als einfache Näherung des Schwerpunkts)
  const verlauf = [];
  for (let s = 0; s + hop <= n; s += hop) {
    let e = 0, z = 0; for (let i = s; i < s + hop; i++) { e += pcm[i] * pcm[i]; if (i > s && (pcm[i] >= 0) !== (pcm[i - 1] >= 0)) z++; }
    verlauf.push({ db: r1(db(Math.sqrt(e / hop))), hell: Math.round((z * rate) / (2 * hop)) });
  }
  fortschritt?.(0.2);
  const einsaetze = einsaetzeFinden(pcm, rate, { empfindlichkeit: 0.55, abstand: 0.06 }).map((e) => ({ t: e.t, staerke: e.staerke }));
  fortschritt?.(0.5);
  const tempo = tempoSchaetzen(pcm, rate);
  const mittelDb = db(Math.sqrt(verlauf.reduce((a, v) => a + 10 ** (v.db / 10), 0) / Math.max(1, verlauf.length)));
  // Pausen: mindestens 0,4 s mehr als 24 dB unter dem Mittel
  const pausen = [];
  for (let i = 0; i < verlauf.length; i++) {
    if (verlauf[i].db > mittelDb - 24) continue;
    let j = i; while (j + 1 < verlauf.length && verlauf[j + 1].db <= mittelDb - 24) j++;
    if (j - i >= 3) pausen.push({ von: r1(i / 10), bis: r1((j + 1) / 10) });
    i = j;
  }
  // Abschnitte: Grenzen an starken Veränderungen von Pegel, Helligkeit und Einsatzdichte (Mittel über 2 s davor/danach)
  const dichte = new Float32Array(verlauf.length); for (const e of einsaetze) { const k = Math.floor(e.t * 10); if (k < dichte.length) dichte[k] += 1; }
  const merk = (k, f) => { let s = 0, c = 0; for (let j = Math.max(0, k); j < Math.min(verlauf.length, k + 20); j++) { s += f(j); c++; } return c ? s / c : 0; };
  const neuheit = verlauf.map((_, k) => Math.abs(merk(k, (j) => verlauf[j].db) - merk(k - 20, (j) => verlauf[j].db)) / 6
    + Math.abs(Math.log2((merk(k, (j) => verlauf[j].hell) + 50) / (merk(k - 20, (j) => verlauf[j].hell) + 50))) * 1.5
    + Math.abs(merk(k, (j) => dichte[j]) - merk(k - 20, (j) => dichte[j])) * 3);
  const grenzen = [0];
  for (let k = 20; k < neuheit.length - 20; k++) {
    let spitzeHier = true; for (let j = k - 15; j <= k + 15; j++) if (neuheit[j] > neuheit[k]) { spitzeHier = false; break; }
    if (spitzeHier && neuheit[k] > 0.9 && k - grenzen.at(-1) * 10 >= 30) grenzen.push(r1(k / 10));
  }
  fortschritt?.(0.7);
  const bereiche = grenzen.map((von, i) => {
    const bis = grenzen[i + 1] ?? r1(dauer), a = Math.round(von * 10), b = Math.max(a + 1, Math.round(bis * 10)), teil = verlauf.slice(a, b);
    const pegel = r1(db(Math.sqrt(teil.reduce((x, v) => x + 10 ** (v.db / 10), 0) / Math.max(1, teil.length))));
    const zahl = einsaetze.filter((e) => e.t >= von && e.t < bis).length, je = r1(zahl / Math.max(0.1, bis - von), 100);
    const ton = tonhoeheSchaetzen(pcm, rate, { von, bis: Math.min(bis, von + 8) });
    const ruhig = teil.length ? teil.reduce((x, v) => x + Math.abs(v.db - pegel), 0) / teil.length : 0;   // mittlere Abweichung vom Pegel
    const art = pegel < mittelDb - 18 ? (ton.sicherheit > 0.4 ? "ausklang" : "pause") : je > 4.5 ? "rhythmisch" : je < 1.2 && ruhig < 4 ? "anhaltend" : "gemischt";
    const chroma = chromaVon(pcm, rate, Math.round(von * rate), Math.round(Math.min(bis, von + 12) * rate)).map((x) => r1(x, 1000));
    return { von, bis, pegelDb: pegel, einsaetzeJeS: je, hell: Math.round(teil.reduce((x, v) => x + v.hell, 0) / Math.max(1, teil.length)), art, tonhoehe: ton, chroma, akkord: akkordSchaetzen(chroma) };
  });
  fortschritt?.(0.9);
  const tonarten = tonartKandidaten(chromaVon(pcm, rate, 0, n));
  fortschritt?.(1);
  return { version: ANALYSE_VERSION, dauer: r1(dauer, 1000), rate, kanaele: kanaele.length, spitzeDb: r1(db(spitze)), mittelDb: r1(mittelDb),
    tempo: { bpm: tempo.bpm, sicherheit: tempo.sicherheit, hinweis: "Schätzung aus der Einsatzkurve; Halbe/Doppelte möglich" },
    tonarten, einsaetze, pausen, bereiche, verlauf: verlauf.map((v) => v.db) };
}

/**
 * Ausschnitte vorschlagen (3–8 je Quelle, wenn das Material es hergibt), verteilt über die Aufnahme. Die Rollen kommen aus dem Material:
 *   ausklang/anhaltend mit Tonhöhe  → harmonic_layer (Resonanz, Akkordschatten), einstimmig klar → main_motif (spielbares Instrument)
 *   rhythmisch                      → fragment (Phrase zerlegen) und accent (einzelne starke Einsätze)
 *   gemischt/anhaltend ohne Ton     → texture (Körner) oder ambience (frei)
 * Jeder Vorschlag hat einen Grund («grund») und ist editierbar.
 */
export function ausschnitteVorschlagen(quelle, { bpm = 88, hoechstens = 8 } = {}) {
  const an = quelle.analyse, takt = 240 / bpm, vorschlaege = [];
  const dazu = (von, bis, rolle, art, grund, mehr = {}) => {
    von = r1(Math.max(0, von), 1000); bis = r1(Math.min(an.dauer, bis), 1000);
    if (bis - von < 0.05 || vorschlaege.some((x) => x.rolle === rolle && Math.abs(x.von - von) < 1)) return;
    const name = mehr.name ?? `${ROLLEN[rolle].name}${mehr.akkord ? ` · ${NOTEN[mehr.akkord.grundton]}-${mehr.akkord.art === "dur" ? "Dur" : "Moll"}` : mehr.tonhoehe?.note ? ` · ${mehr.tonhoehe.note}` : ""} · ${von}–${bis} s`;
    vorschlaege.push({ id: ausschnittId(quelle.id, von, bis, rolle), quelle: quelle.id, von, bis, rolle, rollen: [rolle], art, grund, vorschlag: true, name, ...mehr });
  };
  const staerkste = (von, bis, k = 1) => an.einsaetze.filter((e) => e.t >= von && e.t < bis).sort((a, b) => b.staerke - a.staerke).slice(0, k);
  for (const b of an.bereiche) {
    const lang = b.bis - b.von, ton = b.tonhoehe, ak = b.akkord, hoerbar = b.pegelDb > an.mittelDb - 30;
    // tonal: Akkordschatten und ein spielbarer Ton (Oberstimme, mehrstimmig gekennzeichnet) – auch aus ruhigen Stellen
    if (hoerbar && ak && ak.sicherheit >= 0.2 && b.art !== "rhythmisch") {
      dazu(b.von + 0.1, Math.min(b.bis, b.von + 3), "harmonic_layer", "atmosphaere", `${ak.name} (Sicherheit ${ak.sicherheit}, aus den Tonklassen), ${b.art}, ${b.pegelDb} dB`, { akkord: { grundton: ak.grundton, art: ak.art }, tonhoehe: ton });
      const midi = 72 + ak.ton, hz = 440 * 2 ** ((midi - 69) / 12);
      dazu(b.von + 0.2, Math.min(b.bis, b.von + 1.6), "main_motif", "oneshot", `Ton ${notenName(midi)} aus dem Akkord (mehrstimmig: nur Vorschlag, Grundton prüfen)`, { tonhoehe: { midi, note: notenName(midi), sicherheit: r1(ak.sicherheit * 0.6, 100), mehrstimmig: true }, schritte: [{ art: "hochpass", f: Math.round(hz * 0.8), stufen: 2 }, { art: "normal", db: -20 }] });
    }
    if (!ton.mehrstimmig && ton.sicherheit > 0.45 && hoerbar) dazu(b.von, Math.min(b.bis, b.von + 2), "main_motif", "oneshot", `klarer Ton ${ton.note} (Sicherheit ${ton.sicherheit})`, { tonhoehe: ton });
    if (b.art === "rhythmisch" && lang >= takt) {
      const st = staerkste(b.von + 0.5, b.bis - takt)[0]?.t ?? b.von, tk = an.tempo?.sicherheit > 0.3 ? an.tempo.bpm : null;
      dazu(st, st + (tk ? 480 / tk : takt * 2), "fragment", "phrase", `rhythmisch (${b.einsaetzeJeS} Einsätze/s), zwei Takte ab einem starken Einsatz${tk ? ` bei geschätzt ${tk} BPM` : ""}`, { quelleBpm: tk ?? bpm, tonart: ak ? { grundton: ak.grundton, leiter: ak.art } : null });
      for (const e of staerkste(b.von, b.bis, 2)) dazu(e.t - 0.005, e.t + 0.6, "accent", "oneshot", `starker Einsatz (${e.staerke})`);
    } else if (lang > 4 && hoerbar) {
      dazu(b.von + lang * 0.25, b.von + lang * 0.25 + Math.min(8, lang * 0.5), lang > 10 ? "texture" : "ambience", "atmosphaere", `${b.art}, ${b.pegelDb} dB, Helligkeit ${b.hell}`);
    }
  }
  // Auswahl: je Rolle der Reihe nach, damit tonale Stellen am Ende einer langen Aufnahme nicht wegfallen (3–8 je Quelle)
  const REIHE = ["harmonic_layer", "main_motif", "fragment", "accent", "texture", "ambience", "harmonic_layer", "accent", "main_motif", "fragment"];
  const out = [], rest = [...vorschlaege];
  for (let runde = 0; out.length < hoechstens && rest.length; runde++) {
    let genommen = false;
    for (const rolle of REIHE) { const i = rest.findIndex((x) => x.rolle === rolle); if (i >= 0 && out.length < hoechstens) { out.push(rest.splice(i, 1)[0]); genommen = true; } }
    if (!genommen) break;
  }
  return out.sort((a, b) => a.von - b.von);
}

// ---------- Ersetzen ----------
/**
 * «Quelle ersetzen» für eine Rolle prüfen: was bleibt (Motiv, Noten, Positionen, Abschnitte, Seed), was sich ändert (Dauer, Grundton,
 * Pegel, Transienten), und neue Marker statt der alten (alte Slice-Positionen werden nie ungeprüft übertragen).
 * alt, neu: Ausschnitte (neu darf ohne Zeitbereich sein: dann wird einer vorgeschlagen). Gibt { pruefung: [Text], vorschlag: Ausschnitt }.
 */
export function ersetzenPruefen(sammlung, alt, neueQuelle, { bpm = 88 } = {}) {
  const q = sammlung.quellen.find((x) => x.id === neueQuelle), an = q?.analyse;
  if (!an) return { pruefung: ["Quelle ohne Analyse"], vorschlag: null };
  const dauerAlt = alt.bis - alt.von, kandidaten = ausschnitteVorschlagen(q, { bpm, hoechstens: 20 });
  const passend = kandidaten.find((k) => k.rolle === alt.rolle) ?? kandidaten.find((k) => k.art === alt.art) ?? kandidaten[0];
  const pruefung = [];
  if (!passend) return { pruefung: ["keine passende Stelle gefunden: Zeitbereich von Hand wählen"], vorschlag: null };
  const vorschlag = { ...passend, rolle: alt.rolle, rollen: [alt.rolle], id: ausschnittId(q.id, passend.von, passend.bis, alt.rolle), ersetzt: alt.id, name: `${ROLLEN[alt.rolle]?.name ?? alt.rolle} · ${q.name} ${passend.von}–${passend.bis} s`, vorrang: (alt.vorrang ?? 0) + 1 };
  if (alt.akkord && !vorschlag.akkord) vorschlag.akkord = passend.akkord ?? null;
  const dNeu = vorschlag.bis - vorschlag.von;
  pruefung.push(`Dauer: ${r1(dauerAlt, 100)} s → ${r1(dNeu, 100)} s${alt.art === "phrase" || alt.art === "loop" ? ` (${r1(dNeu / (240 / bpm), 100)} Takte bei ${bpm} BPM: Tempo-/Längenprüfung nötig)` : ""}`);
  if (alt.tonhoehe?.midi != null || vorschlag.tonhoehe?.midi != null) {
    const a = alt.tonhoehe, b = vorschlag.tonhoehe;
    pruefung.push(`Grundton: ${a?.note ?? "unbekannt"} → ${b?.note ?? "unbekannt"}${b?.mehrstimmig ? " (mehrstimmig: nur Vorschlag)" : ""}${b?.sicherheit != null ? `, Sicherheit ${b.sicherheit}` : ""}; Korrektur möglich`);
  }
  const transienten = an.einsaetze.filter((e) => e.t >= vorschlag.von && e.t < vorschlag.bis).length;
  pruefung.push(`Transienten im neuen Bereich: ${transienten}; Slice-Marker werden neu vorgeschlagen, nicht übernommen`);
  pruefung.push("bleibt: Motiv, Noten, Taktpositionen, Abschnittsgrenzen, Seed");
  vorschlag.marker = an.einsaetze.filter((e) => e.t >= vorschlag.von && e.t < vorschlag.bis).map((e) => r1(e.t - vorschlag.von, 1000));
  return { pruefung, vorschlag };
}
