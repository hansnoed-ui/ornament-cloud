// Sampler 0.1.0 – aus eigenen Aufnahmen spielbare Klänge machen und als Spur setzen (ornament.lucerne, 10. November 2026).
// Eine Sampler-Spur ist ein Rezept wie die anderen erzeugten Spuren: Klänge (Ausschnitt einer Quelle + Bearbeitungsschritte) und
// Ereignisse in musikalischer Zeit (Takt, Schritt, Dauer in Takten). Erst beim Rechnen wird daraus Audiozeit. Die Aufnahmen selbst
// kommen von aussen («material»: Quell-ID → { kanaele, rate }), nie aus dem Repo.
//
// Zwei Arten, die Tonhöhe zu ändern, ausdrücklich getrennt:
//   band      Tonhöhe und Geschwindigkeit ändern sich gemeinsam (wie ein Tonband, Umtasten mit gefenstertem Sinc).
//             Ein Ton eine Oktave tiefer klingt doppelt so lang; ein Loop wird länger und braucht eine Entscheidung im Arrangement.
//   dehnung   Dauer und Tonhöhe getrennt: WSOLA-Zeitdehnung (dehnen aus klangwerk.js), danach umgetastet. Echte Zeitdehnung, aber mit den
//             Grenzen von WSOLA: bei dichtem, mehrstimmigem Material und grossen Faktoren hörbar verschmiert («flattert»).
// Bearbeitungsschritte: band, dehnung, umkehr, hochpass, tiefpass, waerme, instabil, alterung, knistern, koerner, huelle, pegel, normal.
// Nach der Veröffentlichung nicht mehr verändern; neue Fähigkeiten bekommen eine neue Version.

import { umtasten, dehnen, korn } from "../../lab/kern/klangwerk.js";
import { zufall, SVF } from "../erzeuger/grund.js";

export const SAMPLER = "sampler@0.1.0";
export const MODI = Object.freeze({
  band: { name: "Band (Playback)", hilfe: "Tonhöhe und Tempo ändern sich gemeinsam; die Dauer ändert sich mit der Transposition" },
  dehnung: { name: "Zeitdehnung (WSOLA)", hilfe: "Dauer und Tonhöhe getrennt; bei dichtem Material und grossen Faktoren hörbar verschmiert" },
});
export const SCHRITTE = Object.freeze(["band", "dehnung", "umkehr", "hochpass", "tiefpass", "waerme", "instabil", "alterung", "knistern", "koerner", "huelle", "pegel", "normal"]);

const stereo = (k) => (k.length >= 2 ? [k[0], k[1]] : [k[0], k[0]]);

/**
 * Ausschnitt [von, bis) einer Aufnahme (s), in die Rate des Projekts gebracht. Kurze Rampen gegen Knacken: am Anfang höchstens 2 ms
 * (der Anschlag bleibt), am Ende «aus» (s).
 */
export function ausschnitt(material, von, bis, rate, { ein = 0.002, aus = 0.012 } = {}) {
  const a = Math.max(0, Math.round(von * material.rate)), b = Math.min(material.kanaele[0].length, Math.round(bis * material.rate));
  let k = stereo(material.kanaele).map((s) => s.slice(a, Math.max(a + 1, b)));
  if (material.rate !== rate) k = k.map((s) => umtasten(s, material.rate / rate, Math.round((s.length * rate) / material.rate)));
  return rampen(k, rate, ein, aus);
}

function rampen(k, rate, ein, aus) {
  const n = k[0].length, e = Math.min(n >> 1, Math.round(ein * rate)), z = Math.min(n >> 1, Math.round(aus * rate));
  for (const s of k) { for (let i = 0; i < e; i++) s[i] *= i / e; for (let i = 0; i < z; i++) s[n - 1 - i] *= i / z; }
  return k;
}

// ---------- Bearbeitungsschritte ----------
const SCHRITT = {
  /** Band: halbtoene (+ cent) – Tonhöhe und Dauer gemeinsam */
  band: (k, rate, p) => { const f = 2 ** (((p.halbtoene ?? 0) + (p.cent ?? 0) / 100) / 12); return Math.abs(f - 1) < 1e-6 ? k : k.map((s) => umtasten(s, f)); },
  /** Zeitdehnung: faktor (Dauer), halbtoene (+ cent) unabhängig davon */
  dehnung: (k, rate, p) => {
    const f = 2 ** (((p.halbtoene ?? 0) + (p.cent ?? 0) / 100) / 12), faktor = p.faktor ?? 1;
    let x = Math.abs(faktor * f - 1) < 1e-6 ? k : dehnen(k, rate, faktor * f, { fenster: p.fenster ?? 0.08 });
    if (Math.abs(f - 1) > 1e-6) x = x.map((s) => umtasten(s, f));
    return x;
  },
  umkehr: (k) => k.map((s) => s.slice().reverse()),
  hochpass: (k, rate, p) => filtern(k, rate, "hoch", p.f ?? 200, p.q ?? 0.7, p.stufen ?? 2),
  tiefpass: (k, rate, p) => filtern(k, rate, "tief", p.f ?? 4000, p.q ?? 0.7, p.stufen ?? 2),
  /** Wärme 0–100: weiche Sättigung (tanh, Pegel ausgeglichen) und eine sanft fallende Höhe */
  waerme: (k, rate, p) => {
    const m = (p.menge ?? 0) / 100;
    if (m <= 0) return k;
    const d = 1 + m * 5, norm = 1 / Math.tanh(d * 0.5) * 0.5;
    const out = k.map((s) => Float32Array.from(s, (v) => Math.tanh(v * d) * norm));
    return filtern(out, rate, "tief", 18000 - m * 11000, 0.6, 1);
  },
  /**
   * Instabilität 0–100: langsames Leiern (Wow, 0,3–0,9 Hz) und feines Flattern (Flutter, 5–9 Hz) der Lesegeschwindigkeit. «gemeinsam»
   * (eine ganze Schicht schwankt zusammen) ist breiter und langsamer; einzeln (je Stimme) kleiner und eigen. Tiefer: maximal ±25 Cent.
   */
  instabil: (k, rate, p) => {
    const m = (p.menge ?? 0) / 100;
    if (m <= 0) return k;
    const rnd = zufall(p.seed ?? 1), wowHz = 0.3 + rnd() * 0.6, flHz = 5 + rnd() * 4, ph1 = rnd() * 6.28, ph2 = rnd() * 6.28;
    const wow = (p.gemeinsam ? 25 : 12) * m, fl = 3 * m, n = k[0].length, out = k.map(() => new Float32Array(n));
    let pos = 0;
    for (let i = 0; i < n; i++) {
      const t = i / rate, cent = wow * Math.sin(6.2832 * wowHz * t + ph1) + fl * Math.sin(6.2832 * flHz * t + ph2);
      for (let c = 0; c < k.length; c++) { const s = k[c], j = Math.floor(pos), f = pos - j; out[c][i] = j + 1 < s.length ? s[j] * (1 - f) + s[j + 1] * f : 0; }
      pos += 2 ** (cent / 1200);
    }
    return out;
  },
  /**
   * Alterung: Rauschen (dB unter dem Signal, eigener Pegel), reduzierte Auflösung (Bits) und reduzierte Abtastrate («rate» in Hz, Halten
   * ohne Glättung wie ein alter Sampler: knarzt in den Höhen), alles getrennt dosierbar
   */
  alterung: (k, rate, p) => {
    const rnd = zufall(p.seed ?? 7), bits = p.bits ?? 0, rausch = p.rauschen ?? -Infinity, stufen = bits > 0 ? 2 ** (bits - 1) : 0;
    const halten = p.rate > 0 && p.rate < rate ? rate / p.rate : 1;
    let spitze = 1e-9; for (const s of k) for (const v of s) spitze = Math.max(spitze, Math.abs(v));
    const r = Number.isFinite(rausch) ? spitze * 10 ** (rausch / 20) : 0;
    return k.map((s) => {
      let h = 0, wert = 0;
      return Float32Array.from(s, (v, i) => { if (halten > 1) { if (i >= h) { wert = v; h += halten; } v = wert; } let x = stufen ? Math.round(v * stufen) / stufen : v; if (r) x += (rnd() * 2 - 1) * r; return x; });
    });
  },
  /** Knistern: einzelne kurze Knackser wie Staub auf einer Platte (dichte je Sekunde, db unter der Spitze), zufällig in Stärke und Seite */
  knistern: (k, rate, p) => {
    const rnd = zufall(p.seed ?? 9), out = k.map((s) => s.slice()), n = out[0].length, zahl = Math.round((n / rate) * (p.dichte ?? 4));
    let spitze = 1e-9; for (const s of k) for (const v of s) spitze = Math.max(spitze, Math.abs(v));
    const g = spitze * 10 ** ((p.db ?? -30) / 20), lang = Math.max(2, Math.round(0.0006 * rate));
    for (let j = 0; j < zahl; j++) {
      const i0 = Math.floor(rnd() * Math.max(1, n - lang)), a = g * (0.2 + 0.8 * rnd() ** 2) * (rnd() < 0.5 ? -1 : 1), seite = rnd();
      for (let i = 0; i < lang; i++) { const v = a * (1 - i / lang) * (i % 2 ? -0.6 : 1); out[0][i0 + i] += v * (0.4 + 0.6 * seite); if (out[1]) out[1][i0 + i] += v * (1 - 0.6 * seite); }
    }
    return out;
  },
  /**
   * Körner: aus dem Klang eine Fläche von «dauer» s. Körner von laenge ms (20–120), dichte je Sekunde, Lesestelle wandert langsam durch
   * den Klang (streuung 0–1 = wie weit zufällig daneben), tonhoehe (Halbtöne, mit streuungTon zufällig darum herum), Hann-Fenster.
   */
  koerner: (k, rate, p) => {
    const rnd = zufall(p.seed ?? 3), dauer = p.dauer ?? 4, n = Math.round(dauer * rate), out = [new Float32Array(n), new Float32Array(n)];
    const L = Math.round(((p.laenge ?? 60) / 1000) * rate), quelleN = k[0].length, zahl = Math.round(dauer * (p.dichte ?? 40)), g = 1.6 / Math.sqrt(Math.max(1, ((p.dichte ?? 40) * (p.laenge ?? 60)) / 1000));
    for (let j = 0; j < zahl; j++) {
      const start = Math.floor(rnd() * Math.max(1, n - L)), wandern = (start / n) * (quelleN - L), streu = (rnd() * 2 - 1) * (p.streuung ?? 0.3) * quelleN;
      const pos = Math.max(0, Math.min(quelleN - L - 2, wandern + streu)), ton = (p.tonhoehe ?? 0) + (rnd() * 2 - 1) * (p.streuungTon ?? 0);
      korn(out, stereo(k), { start, pos, schritt: 2 ** (ton / 12), laenge: L, fenster: "hann", pan: (rnd() * 2 - 1) * (p.breite ?? 0.7), staerke: g });
    }
    return out;
  },
  /** Hüllkurve: ein (s), halten bis «laenge» (s, optional), aus (s); kürzt auf laenge + aus */
  huelle: (k, rate, p) => {
    const n0 = k[0].length, lang = p.laenge != null ? Math.min(n0, Math.round((p.laenge + (p.aus ?? 0.05)) * rate)) : n0;
    const out = k.map((s) => s.slice(0, lang)), e = Math.round((p.ein ?? 0.003) * rate), a = Math.round((p.aus ?? 0.05) * rate), ab = p.laenge != null ? Math.round(p.laenge * rate) : lang - a;
    for (const s of out) for (let i = 0; i < s.length; i++) { let g = i < e ? i / e : 1; if (i >= ab) g *= Math.max(0, 1 - (i - ab) / Math.max(1, a)); s[i] *= g; }
    return out;
  },
  pegel: (k, rate, p) => { const g = 10 ** ((p.db ?? 0) / 20); return k.map((s) => Float32Array.from(s, (v) => v * g)); },
  /** auf einen Effektivwert bringen (dB, Standard −20): Varianten werden lautheitsgleich vorgehört, ein lauterer Klang gewinnt nicht */
  normal: (k, rate, p) => {
    let e = 0, z = 0; for (const s of k) for (let i = 0; i < s.length; i += 2) { e += s[i] * s[i]; z++; }
    const rms = Math.sqrt(e / Math.max(1, z)), g = rms > 1e-7 ? 10 ** ((p.db ?? -20) / 20) / rms : 1;
    return k.map((s) => Float32Array.from(s, (v) => v * g));
  },
};

function filtern(k, rate, art, f, q, stufen) {
  return k.map((s) => {
    let x = s.slice();
    for (let st = 0; st < stufen; st++) { const fl = new SVF().setze(Math.min(f, rate * 0.45), q, rate); for (let i = 0; i < x.length; i++) x[i] = fl.schritt(x[i])[art]; }
    return x;
  });
}

/** Schritte nacheinander anwenden (das Original bleibt unverändert) */
export function bearbeiten(kanaele, rate, schritte = []) {
  let k = kanaele;
  for (const s of schritte ?? []) {
    const f = SCHRITT[s.art];
    if (!f) throw new Error(`Sampler: unbekannter Schritt «${s.art}»`);
    k = f(k, rate, s);
  }
  return k;
}

/** Dauer nach dem Band-Modus: ein Klang von d Sekunden, um h Halbtöne transponiert, dauert d / 2^(h/12) */
export const bandDauer = (d, halbtoene) => d / 2 ** (halbtoene / 12);

// ---------- Spur ----------
/**
 * q: { erzeuger: "sampler@0.1.0", rolle, anzahl (Takte), bpm, seed, swing (0–0,5 Anteil eines Sechzehntels), klaenge, ereignisse, frei? }
 *   klaenge: { key: { quelle, von, bis, grundMidi?, cent? (Stimmkorrektur), modus ("band" | "dehnung"), schritte: [...], name } }
 *   ereignisse: [{ t (Takte ab 0, z. B. 8 + 6/16), d? (Takte), klang, midi?, staerke (0–1), versatz? (ms), schritte? (zusätzlich), pan? }]
 *   «t» ist die Rasterstelle; Swing (nur auf ungeraden Sechzehnteln) und versatz kommen beim Rechnen genau einmal dazu.
 *   frei: die Ereignisse sind nicht an den Takt gebunden (t in Sekunden statt Takten): Atmosphären, die nach Zeit geführt werden.
 * material: Map Quell-ID → { kanaele, rate }. Fehlt eine Quelle, wird die Spur ohne diese Ereignisse gerechnet und «fehlt» gemeldet.
 * Gibt { kanaele, schlaege, fehlt: [Quell-IDs] }.
 */
export function samplerSpurRechnen(q, rate, material) {
  const takt = 240 / q.bpm, n = Math.round((q.anzahl ?? 8) * takt * rate), L = new Float32Array(n), R = new Float32Array(n);
  const cache = new Map(), fehlt = new Set();
  const basis = (key) => {
    if (cache.has(key)) return cache.get(key);
    const kl = q.klaenge[key], m = kl && material?.get?.(kl.quelle);
    let k = null;
    if (!kl) throw new Error(`Sampler: Klang «${key}» fehlt im Rezept`);
    if (!m) fehlt.add(kl.quelle);
    else k = bearbeiten(ausschnitt(m, kl.von, kl.bis, rate, { aus: kl.aus ?? 0.012 }), rate, kl.schritte);
    cache.set(key, k);
    return k;
  };
  let schlaege = 0;
  for (const e of q.ereignisse ?? []) {
    const kl = q.klaenge[e.klang], grund = basis(e.klang);
    if (!grund) continue;
    // Tonhöhe: Band (Dauer ändert sich mit) oder Zeitdehnung (Dauer bleibt); die Stimmkorrektur der Quelle kommt immer dazu
    const halb = e.midi != null && kl.grundMidi != null ? e.midi - kl.grundMidi : 0, cent = (kl.cent ?? 0) + (e.cent ?? 0);
    const schritte = [...(halb || cent ? [{ art: kl.modus === "dehnung" ? "dehnung" : "band", halbtoene: halb, cent }] : []), ...(e.schritte ?? [])];
    const schluessel = `${e.klang}|${JSON.stringify(schritte)}`;
    let k = cache.get(schluessel);
    if (!k) { k = bearbeiten(grund, rate, schritte); cache.set(schluessel, k); }
    // Dauer: Gate mit Ausklang
    const aus = e.aus ?? kl.ausklang ?? 0.12;
    const dauerS = e.d != null ? e.d * (q.frei ? 1 : takt) : null;
    let beginn;
    if (q.frei) beginn = e.t;
    else {
      const b = Math.floor(e.t + 1e-9), schritt = Math.round((e.t - b) * 16 * 1000) / 1000, ganz = Math.abs(schritt - Math.round(schritt)) < 1e-6;
      beginn = e.t * takt + (ganz && Math.round(schritt) % 2 === 1 ? (q.swing ?? 0) * (takt / 16) : 0);
    }
    beginn += (e.versatz ?? 0) / 1000;
    // «ab»: Lesestelle im bearbeiteten Klang (s) – für Schnitte aus einer Phrase; kurze Einblendung, damit der Schnitt nicht knackt
    const i0 = Math.round(beginn * rate), g = e.staerke ?? 0.8, pan = e.pan ?? 0, gl = g * Math.min(1, 1 - pan), gr = g * Math.min(1, 1 + pan);
    const off = Math.max(0, Math.round((e.ab ?? 0) * rate)), rest = Math.max(0, k[0].length - off), ein = e.ab ? Math.round(0.002 * rate) : 0;
    const ende = dauerS != null ? Math.min(rest, Math.round((dauerS + aus) * rate)) : rest, ab = dauerS != null ? Math.min(ende, Math.round(dauerS * rate)) : ende, a = Math.max(1, ende - ab);
    for (let i = 0; i < ende; i++) {
      const j = i0 + i;
      if (j < 0) continue;
      if (j >= n) break;
      const h = (i < ab ? 1 : 1 - (i - ab) / a) * (i < ein ? i / ein : 1);
      L[j] += k[0][off + i] * gl * h; R[j] += k[1][off + i] * gr * h;
    }
    schlaege++;
  }
  // «nach»: Schritte auf der ganzen Spur (z. B. gemeinsames Leiern einer Schicht); die Länge bleibt
  const kanaele = q.nach?.length ? bearbeiten([L, R], rate, q.nach).map((s) => (s.length === n ? s : Float32Array.from({ length: n }, (_, i) => s[i] ?? 0))) : [L, R];
  return { kanaele, schlaege, fehlt: [...fehlt] };
}

/** eine fertige Spur als neue Quelle (Resampling, zweite Klanggeneration): gibt { kanaele, rate } zum Einlegen ins Material */
export const resampeln = (kanaele, rate) => ({ kanaele: kanaele.map((s) => s.slice()), rate });
