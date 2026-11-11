// ORNAMENT LAB – Mischpult ohne DOM (seit Lab 0.1.45): Entzerrer und Filter (Biquads nach Robert Bristow-Johnson, Zustandsvariables Filter
// nach Zavalishin), Effekte (Zerkleinern, Sättigung, Chorus und Flanger, Echo im Tempo, Raum), Kompressor, Limiter mit Vorlauf, Bass in
// der Mitte, Lautheit nach ITU-R BS.1770 (LUFS) und die Kette «fertig mischen» (mastern). Reines JavaScript über Float32Array wie das
// Klangwerk (kern/klangwerk.js): dieselben Spuren ergeben in jedem Browser und in Node dieselben Abtastwerte.
import { nachhall } from "./klang.js";

const TAU = 2 * Math.PI;
const rund = (x, s = 100) => Math.round(x * s) / s;
export const dB = (x) => 20 * Math.log10(Math.max(1e-12, x));
export const ausDB = (d) => 10 ** (d / 20);

// ---------- Entzerrer: Biquads (Audio EQ Cookbook, R. Bristow-Johnson) ----------
/** Koeffizienten [b0, b1, b2, a1, a2] eines Biquads; «q» für Pässe und Glocke, bei den Regalen gibt q = 1/√2 die Flanke S = 1 */
export function biquad(art, f, rate, { q = Math.SQRT1_2, db = 0 } = {}) {
  const w = (TAU * Math.min(f, rate * 0.49)) / rate, c = Math.cos(w), s = Math.sin(w), A = 10 ** (db / 40), al = s / (2 * q), r = 2 * Math.sqrt(A) * al;
  const k = {
    tiefpass: [(1 - c) / 2, 1 - c, (1 - c) / 2, 1 + al, -2 * c, 1 - al],
    hochpass: [(1 + c) / 2, -(1 + c), (1 + c) / 2, 1 + al, -2 * c, 1 - al],
    bandpass: [al, 0, -al, 1 + al, -2 * c, 1 - al],
    glocke: [1 + al * A, -2 * c, 1 - al * A, 1 + al / A, -2 * c, 1 - al / A],
    tiefregal: [A * (A + 1 - (A - 1) * c + r), 2 * A * (A - 1 - (A + 1) * c), A * (A + 1 - (A - 1) * c - r), A + 1 + (A - 1) * c + r, -2 * (A - 1 + (A + 1) * c), A + 1 + (A - 1) * c - r],
    hochregal: [A * (A + 1 + (A - 1) * c + r), -2 * A * (A - 1 + (A + 1) * c), A * (A + 1 + (A - 1) * c - r), A + 1 - (A - 1) * c + r, 2 * (A - 1 - (A + 1) * c), A + 1 - (A - 1) * c - r],
  }[art];
  if (!k) throw new Error(`unbekanntes Filter «${art}»`);
  return [k[0] / k[3], k[1] / k[3], k[2] / k[3], k[4] / k[3], k[5] / k[3]];
}

/** eine Spur durch einen Biquad (direkte Form I) */
export function filtern(s, [b0, b1, b2, a1, a2]) {
  const out = new Float32Array(s.length);
  let x1 = 0, x2 = 0, y1 = 0, y2 = 0;
  for (let i = 0; i < s.length; i++) { const x = s[i], y = b0 * x + b1 * x1 + b2 * x2 - a1 * y1 - a2 * y2; x2 = x1; x1 = x; y2 = y1; y1 = y; out[i] = y; }
  return out;
}
const alleFiltern = (spuren, k) => spuren.map((s) => filtern(s, k));

// ---------- Messen: Lautheit (ITU-R BS.1770-4) ----------
/**
 * Integrierte Lautheit in LUFS: K-Bewertung (Regal +4 dB über 1,5 kHz, Hochpass bei 38 Hz, wie pyloudnorm), Blöcke von 400 ms alle 100 ms,
 * absolute Schwelle −70 LUFS, relative Schwelle 10 LU unter dem Mittel. −Infinity bei Stille.
 */
export function lautheit(spuren, rate) {
  const n = spuren[0].length, regal = biquad("hochregal", 1500, rate, { db: 4 }), hoch = biquad("hochpass", 38, rate, { q: 0.5 });
  const quad = new Float64Array(n + 1);
  for (const s of spuren) { const k = filtern(filtern(s, regal), hoch); for (let i = 0; i < n; i++) quad[i + 1] += k[i] * k[i]; }
  for (let i = 0; i < n; i++) quad[i + 1] += quad[i];
  const block = Math.round(0.4 * rate), hop = Math.round(0.1 * rate), z = [];
  for (let a = 0; a + block <= n; a += hop) z.push((quad[a + block] - quad[a]) / block);
  if (!z.length) z.push(quad[n] / Math.max(1, n));
  const L = (m) => -0.691 + 10 * Math.log10(Math.max(1e-20, m)), mittel = (a) => a.reduce((x, y) => x + y, 0) / a.length;
  const absolut = z.filter((m) => L(m) > -70);
  if (!absolut.length) return -Infinity;
  const relativ = L(mittel(absolut)) - 10, g = absolut.filter((m) => L(m) > relativ);
  return L(mittel(g.length ? g : absolut));
}

/** Spitze in dBFS (höchster Abtastwert, nicht der wahre Spitzenwert zwischen den Abtastwerten) */
export const spitzeDB = (spuren) => { let m = 0; for (const s of spuren) for (const v of s) m = Math.max(m, Math.abs(v)); return dB(m); };
function verstaerken(spuren, g) { for (const s of spuren) for (let i = 0; i < s.length; i++) s[i] *= g; return spuren; }

// ---------- Dynamik ----------
/**
 * Kompressor, die Kanäle gekoppelt (ein Stereobild bleibt stehen): Spitzendetektor, weiches Knie, Anstieg und Rückkehr als Glättung der
 * Absenkung in dB. «anteil» < 1 mischt das Unbearbeitete dazu (parallele Kompression wie in New York). Gibt { spuren, reduktion (dB) } zurück.
 */
export function komprimieren(spuren, rate, { schwelle = -18, verhaeltnis = 2, an = 0.01, ab = 0.15, knie = 6, anteil = 1 } = {}) {
  const n = spuren[0].length, ca = Math.exp(-1 / (an * rate)), cr = Math.exp(-1 / (ab * rate)), steigung = 1 / verhaeltnis - 1;
  const out = spuren.map(() => new Float32Array(n));
  let env = 0, tiefste = 0;
  for (let i = 0; i < n; i++) {
    let p = 0; for (const s of spuren) p = Math.max(p, Math.abs(s[i]));
    const ue = dB(p) - schwelle;
    const soll = 2 * ue < -knie ? 0 : 2 * Math.abs(ue) <= knie ? (steigung * (ue + knie / 2) ** 2) / (2 * knie) : steigung * ue;
    env = soll < env ? ca * env + (1 - ca) * soll : cr * env + (1 - cr) * soll;
    if (env < tiefste) tiefste = env;
    const g = 1 - anteil + anteil * ausDB(env);
    for (let c = 0; c < spuren.length; c++) out[c][i] = spuren[c][i] * g;
  }
  return { spuren: out, reduktion: rund(-tiefste) };
}

/**
 * Limiter mit Vorlauf: keine Spitze über «decke» (dBFS). Je Abtastwert die nötige Verstärkung, davon das Minimum über die nächsten «vorlauf»
 * Sekunden, dann eine Rückkehr («ab») und ein gleitendes Mittel über den Vorlauf: so senkt die Verstärkung schon vor einer Spitze weich ab
 * und liegt an der Spitze selbst sicher darunter. Ohne Verzögerung des Signals. Gibt { spuren, reduktion (dB) } zurück.
 */
export function begrenzen(spuren, rate, { decke = -1, vorlauf = 0.005, ab = 0.08 } = {}) {
  const n = spuren[0].length, L = Math.max(1, Math.round(vorlauf * rate)), grenze = ausDB(decke), cr = Math.exp(-1 / (ab * rate));
  const noetig = new Float32Array(n);
  for (let i = 0; i < n; i++) { let p = 0; for (const s of spuren) p = Math.max(p, Math.abs(s[i])); noetig[i] = p > grenze ? grenze / p : 1; }
  // gleitendes Minimum über [i, i + L] (monotone Warteschlange, von hinten)
  const g1 = new Float32Array(n), q = new Int32Array(n);
  let kopf = 0, ende = 0;
  for (let i = n - 1; i >= 0; i--) {
    while (ende > kopf && noetig[q[ende - 1]] >= noetig[i]) ende--;
    q[ende++] = i;
    while (q[kopf] > i + L) kopf++;
    g1[i] = noetig[q[kopf]];
  }
  const g2 = new Float32Array(n);
  let g = 1;
  for (let i = 0; i < n; i++) { g = Math.min(g1[i], g + (1 - g) * (1 - cr)); g2[i] = g; }
  const out = spuren.map(() => new Float32Array(n));
  let summe = 0, tiefste = 1;
  for (let i = 0; i < n; i++) {
    summe += g2[i]; if (i > L) summe -= g2[i - L - 1];
    const v = summe / Math.min(i + 1, L + 1);
    if (v < tiefste) tiefste = v;
    for (let c = 0; c < spuren.length; c++) out[c][i] = Math.max(-grenze, Math.min(grenze, spuren[c][i] * v));
  }
  return { spuren: out, reduktion: rund(-dB(tiefste)) };
}

/** Stereo: unter «grenze» Hz nur die Mitte (der Bass trägt im Club und am Telefon), darüber die Seite mal «breite» */
export function bassMitte([l, r], rate, grenze = 120, breite = 1) {
  const n = l.length, mitte = new Float32Array(n), seite = new Float32Array(n);
  for (let i = 0; i < n; i++) { mitte[i] = (l[i] + r[i]) / 2; seite[i] = ((l[i] - r[i]) / 2) * breite; }
  const s = filtern(seite, biquad("hochpass", grenze, rate));
  const L = new Float32Array(n), R = new Float32Array(n);
  for (let i = 0; i < n; i++) { L[i] = mitte[i] + s[i]; R[i] = mitte[i] - s[i]; }
  return [L, R];
}

// ---------- fertig mischen ----------
export const LAUTHEIT_ZIELE = Object.freeze([
  { wert: "-14", name: "−14 LUFS (Streaming, Instagram, YouTube)" }, { wert: "-10", name: "−10 LUFS (laut, Club)" },
  { wert: "-18", name: "−18 LUFS (ruhig, viel Dynamik)" }, { wert: "-23", name: "−23 LUFS (Rundfunk, EBU R 128)" },
]);
/**
 * Die Kette «fertig mischen»: Rumpeln weg (Hochpass 25 Hz), Wärme (Tiefenregal 120 Hz) und Glanz (Höhenregal 8 kHz), Bass in der Mitte,
 * ein leimender Bus-Kompressor (sanft, langsamer Anstieg: die Anschläge bleiben), dann die Lautheit auf das Ziel und ein Limiter auf
 * «decke». Der Limiter kostet etwas Lautheit; einmal nachgemessen und nachgezogen. Gibt { spuren, angaben } zurück.
 */
export function mastern(spuren, rate, { ziel = -14, decke = -1, waerme = 0, glanz = 0, breite = 1, kompression = 0.5 } = {}) {
  const vorher = lautheit(spuren, rate);
  let x = alleFiltern(spuren, biquad("hochpass", 25, rate));
  if (waerme) x = alleFiltern(x, biquad("tiefregal", 120, rate, { db: waerme }));
  if (glanz) x = alleFiltern(x, biquad("hochregal", 8000, rate, { db: glanz }));
  if (x.length === 2) x = bassMitte(x, rate, 120, breite);
  const l0 = lautheit(x, rate);
  if (!Number.isFinite(l0)) return { spuren: x, angaben: { lautheitVorher: null, lautheit: null, spitze: null, kompression: 0, begrenzung: 0 } };
  // der Kompressor arbeitet auf einem Signal bei −20 LUFS, so ist seine Schwelle von der Quelle unabhängig
  verstaerken(x, ausDB(-20 - l0));
  let komp = { reduktion: 0 };
  if (kompression > 0) { komp = komprimieren(x, rate, { schwelle: -10 - 6 * kompression, verhaeltnis: 1.5 + 2.5 * kompression, an: 0.02, ab: 0.2, knie: 8 }); x = komp.spuren; }
  let g = ausDB(ziel - lautheit(x, rate)), aus = null;
  for (let runde = 0; runde < 3; runde++) {
    aus = begrenzen(x.map((s) => s.map((v) => v * g)), rate, { decke });
    const l = lautheit(aus.spuren, rate);
    if (Math.abs(l - ziel) < 0.3 || aus.reduktion > 12) break;
    g *= ausDB(ziel - l);
  }
  return { spuren: aus.spuren, angaben: { lautheitVorher: Number.isFinite(vorher) ? rund(vorher, 10) : null, lautheit: rund(lautheit(aus.spuren, rate), 10), spitze: rund(spitzeDB(aus.spuren), 10), kompression: komp.reduktion, begrenzung: aus.reduktion } };
}

// ---------- Filter in Bewegung ----------
/**
 * Zustandsvariables Filter (Topologie wie in analogen Synthesizern, nach V. Zavalishin, «The Art of VA Filter Design»), die Grenzfrequenz
 * je Abtastwert aus «frequenzBei(i)» (alle 16 Abtastwerte neu gerechnet). resonanz 0 (keine Spitze) bis 1 (kurz vor dem Pfeifen).
 * art: tiefpass, hochpass, bandpass, kerbe.
 */
export function bewegtesFilter(s, rate, frequenzBei, { art = "tiefpass", resonanz = 0.3 } = {}) {
  const out = new Float32Array(s.length), k = 2 - 1.96 * Math.min(1, Math.max(0, resonanz));
  let ic1 = 0, ic2 = 0, a1 = 0, a2 = 0, a3 = 0;
  for (let i = 0; i < s.length; i++) {
    if ((i & 15) === 0) { const f = Math.min(0.45 * rate, Math.max(20, frequenzBei(i))), g = Math.tan((Math.PI * f) / rate); a1 = 1 / (1 + g * (g + k)); a2 = g * a1; a3 = g * a2; }
    const x = s[i], v3 = x - ic2, v1 = a1 * ic1 + a2 * v3, v2 = ic2 + a2 * ic1 + a3 * v3;
    ic1 = 2 * v1 - ic1; ic2 = 2 * v2 - ic2;
    out[i] = art === "hochpass" ? x - k * v1 - v2 : art === "bandpass" ? v1 * k : art === "kerbe" ? x - k * v1 : v2;
  }
  return out;
}

/** Hüllkurve einer Spur, 0–1 auf ihre Spitze gebracht (Anstieg 5 ms, Rückkehr 120 ms): für ein Filter, das dem Anschlag folgt (Auto-Wah) */
export function huellkurve(s, rate, { an = 0.005, ab = 0.12 } = {}) {
  const out = new Float32Array(s.length), ca = Math.exp(-1 / (an * rate)), cr = Math.exp(-1 / (ab * rate));
  let e = 0, max = 1e-9;
  for (let i = 0; i < s.length; i++) { const x = Math.abs(s[i]); e = x > e ? ca * e + (1 - ca) * x : cr * e + (1 - cr) * x; out[i] = e; if (e > max) max = e; }
  for (let i = 0; i < s.length; i++) out[i] /= max;
  return out;
}

// ---------- Effekte ----------
/** Zerkleinern (Bitcrusher): je «teilung» Abtastwerte einer gehalten (weniger Abtastrate, Aliasing), auf «bits» Bit gerundet */
export function zerkleinern(s, { bits = 8, teilung = 4 } = {}) {
  const out = new Float32Array(s.length), stufen = 2 ** (Math.max(1, bits) - 1), t = Math.max(1, Math.round(teilung));
  let h = 0;
  for (let i = 0; i < s.length; i++) { if (i % t === 0) h = Math.round(s[i] * stufen) / stufen; out[i] = h; }
  return out;
}

/**
 * Sättigung: «band» weich und leicht unsymmetrisch (gerade Obertöne, warm), «roehre» stärker unsymmetrisch, «hart» abgeschnitten,
 * «falten» der Wavefolder der Westküsten-Synthesizer (Buchla, Serge): was über 1 geht, klappt zurück, die Obertöne wandern mit dem Antrieb.
 * «antrieb» in dB vor der Kennlinie; danach auf den Effektivwert der Quelle zurück.
 */
export function saettigen(s, { art = "band", antrieb = 12 } = {}) {
  const g = ausDB(antrieb), out = new Float32Array(s.length);
  const kennlinie = {
    band: (x) => Math.tanh(x + 0.1 * x * x),
    roehre: (x) => (x >= 0 ? 1 - Math.exp(-x) : 0.7 * Math.tanh(1.6 * x)),
    hart: (x) => Math.max(-1, Math.min(1, x)),
    falten: (x) => Math.sin((Math.PI / 2) * x),
  }[art] ?? Math.tanh;
  let e0 = 0, e1 = 0, dc = 0;
  for (let i = 0; i < s.length; i++) { const y = kennlinie(s[i] * g); out[i] = y; e0 += s[i] * s[i]; dc += y; }
  dc /= Math.max(1, s.length);
  for (let i = 0; i < s.length; i++) { out[i] -= dc; e1 += out[i] * out[i]; }
  const k = e1 > 1e-12 ? Math.sqrt(e0 / e1) : 0;
  for (let i = 0; i < s.length; i++) out[i] *= k;
  return out;
}

/** Lesen aus einer Spur an einer gebrochenen Stelle hinter i (lineare Zwischenstelle) */
const zurueck = (s, x) => { const a = Math.floor(x), f = x - a; return a < 0 ? 0 : (s[a] ?? 0) * (1 - f) + (s[a + 1] ?? 0) * f; };

/**
 * Chorus und Flanger: eine verzögerte Kopie, deren Verzögerung langsam schwingt, links und rechts gegenläufig. Chorus 12–25 ms (die
 * Kopie schwebt wie ein zweiter Spieler), Flanger 0,5–5 ms mit Rückkopplung (der Kammfilter wandert, das Düsenjet-Rauschen).
 */
export function chorus(spuren, rate, { art = "chorus", geschwindigkeit = 0.8, tiefe = 0.5, rueck = 0, anteil = 0.5 } = {}) {
  const [mitte, hub] = art === "flanger" ? [0.0028, 0.0024 * tiefe] : [0.018, 0.007 * tiefe];
  const n = spuren[0].length, quelle = spuren.length > 1 ? spuren : [spuren[0], spuren[0]];
  return quelle.map((s, c) => {
    const out = new Float32Array(n), puffer = new Float32Array(n);
    for (let i = 0; i < n; i++) {
      const d = (mitte + hub * Math.sin((TAU * geschwindigkeit * i) / rate + c * Math.PI)) * rate;
      const v = zurueck(puffer, i - d);
      puffer[i] = s[i] + rueck * v;
      out[i] = s[i] * (1 - anteil * 0.5) + v * anteil;
    }
    return out;
  });
}

/**
 * Echo im Tempo, wie im Dub: «verzoegerung» Sekunden, im Ping-Pong (die erste Wiederholung links, die zweite rechts …), jede Wiederholung
 * durch einen Tiefpass dunkler («dunkel» 0 hell bis 1 dumpf) und um «rueck» leiser. Gibt Stereo zurück.
 */
export function echo(spuren, rate, { verzoegerung = 0.3, rueck = 0.45, anteil = 0.4, dunkel = 0.5, pingpong = true } = {}) {
  const n = spuren[0].length, d = Math.max(1, Math.round(verzoegerung * rate)), lpK = 0.9 - 0.75 * dunkel;
  const l = spuren[0], r = spuren[1] ?? spuren[0], eL = new Float32Array(n), eR = new Float32Array(n), L = new Float32Array(n), R = new Float32Array(n);
  let lpL = 0, lpR = 0;
  for (let i = 0; i < n; i++) {
    const zl = i >= d ? eL[i - d] : 0, zr = i >= d ? eR[i - d] : 0, ein = (l[i] + r[i]) / 2;
    if (pingpong) { lpL += lpK * (ein + rueck * zr - lpL); lpR += lpK * (rueck * zl - lpR); }
    else { lpL += lpK * (l[i] + rueck * zl - lpL); lpR += lpK * (r[i] + rueck * zr - lpR); }
    eL[i] = lpL; eR[i] = lpR;
    L[i] = l[i] + anteil * zl; R[i] = r[i] + anteil * zr;
  }
  return [L, R];
}

/** Raum: der Nachhall des Klangerzeugers (vier Kämme, zwei Allpässe nach Schroeder und Moorer) je Kanal, rechts leicht anders gestimmt */
export function raum(spuren, rate, { anteil = 0.4 } = {}) {
  const q = spuren.length > 1 ? spuren : [spuren[0], spuren[0]];
  return [nachhall(q[0], rate, anteil), nachhall(q[1], Math.round(rate * 1.031), anteil)];
}
