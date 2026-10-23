// ORNAMENT LAB – Klangwerk ohne DOM: die Rechnungen der Klangtransformationen (AUDIO → AUDIO, docs/KLANGTRANSFORMATION.md).
// Umtasten (gefensterter Sinc), Dehnen ohne Tonhöhenänderung (WSOLA), Einsätze finden (spektraler Fluss), Tempo schätzen
// (Autokorrelation), Schnitte bilden und wieder einlegen, Körner lesen, Muster ziehen, Pegel und WAV in hoher Auflösung.
// Alles in reinem JavaScript über Float32Array: derselbe Startwert ergibt in jedem Browser und in Node dieselben Abtastwerte.
// Ein Klang hat hier die Form { spuren: [Float32Array, …], rate }: ein oder zwei Kanäle in der Abtastrate der Quelle.

const TAU = 2 * Math.PI;
export const rund = (x, s = 1000) => Math.round(x * s) / s;
export const halbton = (h) => 2 ** (h / 12);
export const pause = () => new Promise((ok) => setTimeout(ok, 0));

/** die Spuren eines Tons (Tondatei, Klangerzeuger oder Transformation); ältere Töne haben nur pcm (einkanalig) */
export const spurenVon = (ton) => (ton.spuren?.length ? ton.spuren : [ton.pcm]);

/** Kanäle gemischt (für Messungen und für Tonsignal); gemerkt am ersten Kanal, damit Messungen derselben Quelle sich wiederfinden */
const MISCHUNGEN = new WeakMap();
export function mono(spuren) {
  if (spuren.length === 1) return spuren[0];
  const alt = MISCHUNGEN.get(spuren[0]);
  if (alt?.zweite === spuren[1]) return alt.pcm;
  const n = spuren[0].length, out = new Float32Array(n);
  for (const s of spuren) for (let i = 0; i < n; i++) out[i] += s[i] / spuren.length;
  MISCHUNGEN.set(spuren[0], { zweite: spuren[1], pcm: out });
  return out;
}

/** ein AUDIO-Ergebnis für die Ausführung: Spuren, dazu die Mischung (pcm), mit der Tonsignal, Tonspur und ältere Medienspeicher arbeiten */
export const alsTon = (spuren, rate) => ({ spuren, pcm: mono(spuren), rate });

// ---------- Umtasten: gefensterter Sinc (Blackman), Tabelle mit linearer Zwischenstelle ----------
const NULLSTELLEN = 16, AUFLOESUNG = 512;
const KERN = (() => {
  const n = NULLSTELLEN * AUFLOESUNG, k = new Float32Array(n + 2);
  for (let i = 0; i <= n; i++) {
    const x = i / AUFLOESUNG, w = 0.42 + 0.5 * Math.cos((Math.PI * x) / NULLSTELLEN) + 0.08 * Math.cos((TAU * x) / NULLSTELLEN);
    k[i] = (x === 0 ? 1 : Math.sin(Math.PI * x) / (Math.PI * x)) * w;
  }
  return k;
})();

/** Abtastwert an der Stelle x (in Abtastwerten, gebrochen), mit Tiefpass bei «schnitt» (1 = Nyquist; < 1 beim Schneller-Lesen gegen Aliasing) */
function sincBei(s, x, schnitt) {
  const breite = NULLSTELLEN / schnitt, a = Math.max(0, Math.ceil(x - breite)), b = Math.min(s.length - 1, Math.floor(x + breite));
  let summe = 0;
  for (let k = a; k <= b; k++) {
    const d = Math.abs(x - k) * schnitt * AUFLOESUNG, j = d | 0;
    if (j >= NULLSTELLEN * AUFLOESUNG) continue;
    summe += s[k] * (KERN[j] + (KERN[j + 1] - KERN[j]) * (d - j));
  }
  return summe * schnitt;
}

/**
 * Eine Spur mit dem Verhältnis «schritt» neu lesen: Wert i der Ausgabe liegt bei i · schritt der Quelle. schritt 2 liest doppelt so schnell
 * (halb so lang, eine Oktave höher), 0,5 halb so schnell. Das ist das Prinzip des Tonbands und des Samplers (Varispeed, Re-Pitch).
 */
export function umtasten(s, schritt, laenge = Math.floor(s.length / schritt)) {
  const out = new Float32Array(Math.max(0, laenge)), schnitt = Math.min(1, 1 / schritt);
  if (Math.abs(schritt - 1) < 1e-9) { out.set(s.subarray(0, out.length)); return out; }
  for (let i = 0; i < out.length; i++) out[i] = sincBei(s, i * schritt, schnitt);
  return out;
}

/** Abtastrate wechseln (für das Ausspielen in 44,1, 48, 88,2 oder 96 kHz) */
export const rateWandeln = (s, von, nach) => (von === nach ? s : umtasten(s, von / nach, Math.round((s.length * nach) / von)));

/** Wert an einer gebrochenen Stelle, Hermite über vier Punkte (für die Körner: viele kurze Lesungen mit wechselnder Geschwindigkeit) */
function hermite(s, x) {
  const i = Math.floor(x), f = x - i;
  const a = s[i - 1] ?? 0, b = s[i] ?? 0, c = s[i + 1] ?? 0, d = s[i + 2] ?? 0;
  const c1 = 0.5 * (c - a), c2 = a - 2.5 * b + 2 * c - 0.5 * d, c3 = 0.5 * (d - a) + 1.5 * (b - c);
  return ((c3 * f + c2) * f + c1) * f + b;
}

// ---------- Dehnen ohne Tonhöhe: WSOLA (Verhelst und Roelands 1993) ----------
/**
 * Spuren auf «dehnung» mal ihre Länge bringen, ohne die Tonhöhe zu ändern. Kurze Abschnitte (Fenster) werden mit halber Überlappung neu
 * aneinandergelegt; jeder Abschnitt wird um höchstens ein Viertel Fenster verschoben, bis er am besten an die natürliche Fortsetzung des
 * vorigen passt (Kreuzkorrelation, auf einer vierfach verkleinerten Mischung gesucht). Alle Kanäle nehmen dieselben Stellen: das Stereobild bleibt.
 */
export function dehnen(spuren, rate, dehnung, { fenster = 0.06 } = {}) {
  const n = spuren[0].length, N = Math.max(64, 2 * Math.round((fenster * rate) / 2)), Hs = N / 2, Ha = Hs / dehnung;
  const L = Math.max(1, Math.round(n * dehnung)), toleranz = Math.round(N / 4), D = 4;
  const fen = new Float32Array(N);
  for (let k = 0; k < N; k++) fen[k] = 0.5 - 0.5 * Math.cos((TAU * k) / N);   // periodisches Hann: bei halber Überlappung Summe 1
  const klein = (() => { const m = mono(spuren), out = new Float32Array(Math.ceil(n / D)); for (let i = 0; i < out.length; i++) out[i] = m[i * D]; return out; })();
  const out = spuren.map(() => new Float32Array(L + N)), summe = new Float32Array(L + N);
  let vorher = 0;
  for (let m = 0; m * Hs < L; m++) {
    const soll = Math.round(m * Ha);
    let pos = Math.min(Math.max(0, soll), Math.max(0, n - 1));
    if (m > 0) {
      const natuerlich = vorher + Hs, a = Math.max(0, soll - toleranz), b = Math.min(n - N, soll + toleranz);
      let best = -Infinity;
      for (let p = a; p <= b; p += D) {
        let s = 0, e = 1e-9;
        for (let k = 0; k < N / D; k++) { const x = klein[(p / D | 0) + k] ?? 0, y = klein[(natuerlich / D | 0) + k] ?? 0; s += x * y; e += x * x; }
        const wert = s / Math.sqrt(e);
        if (wert > best) { best = wert; pos = p; }
      }
    }
    const ziel = m * Hs;
    for (let c = 0; c < spuren.length; c++) { const q = spuren[c], o = out[c]; for (let k = 0; k < N && pos + k < n; k++) o[ziel + k] += q[pos + k] * fen[k]; }
    for (let k = 0; k < N; k++) summe[ziel + k] += fen[k];
    vorher = pos;
  }
  // am Anfang und Ende überlappen weniger Fenster: durch die Summe der Fenster teilen, wo sie merklich ist
  return out.map((o) => { const r = new Float32Array(L); for (let i = 0; i < L; i++) r[i] = summe[i] > 0.1 ? o[i] / Math.max(1, summe[i]) : o[i]; return r; });
}

// ---------- Messen: Einsätze und Tempo ----------
function fft(re, im) {
  const n = re.length;
  for (let i = 1, j = 0; i < n; i++) {
    let bit = n >> 1;
    for (; j & bit; bit >>= 1) j ^= bit;
    j ^= bit;
    if (i < j) { [re[i], re[j]] = [re[j], re[i]]; [im[i], im[j]] = [im[j], im[i]]; }
  }
  for (let len = 2; len <= n; len <<= 1) {
    const w = -TAU / len, wr = Math.cos(w), wi = Math.sin(w);
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

/**
 * Stärke des Einsetzens je Rahmen: spektraler Fluss (logarithmisch verdichtet, nur Zunahmen), getrennt in drei Bändern (unter 200 Hz,
 * bis 3 kHz, darüber), jedes Band auf seine eigene Spitze gebracht, dann das stärkste genommen. So zählt ein Bassschlag so viel wie ein
 * Becken, obwohl das Rauschen viel mehr Frequenzen bewegt. Rahmen alle «hop» Abtastwerte.
 */
export function einsatzkurve(pcm, rate) {
  const N = 2 ** Math.round(Math.log2(rate * 0.023)), hop = N / 4, rahmen = Math.max(1, Math.floor((pcm.length - N) / hop) + 1);
  const fen = Float32Array.from({ length: N }, (_, k) => 0.5 - 0.5 * Math.cos((TAU * k) / N));
  const re = new Float32Array(N), im = new Float32Array(N), alt = new Float32Array(N / 2);
  const grenze = [200, 3000].map((hz) => Math.round((hz * N) / rate)), baender = [0, 1, 2].map(() => new Float32Array(rahmen));
  for (let r = 0; r < rahmen; r++) {
    for (let k = 0; k < N; k++) { re[k] = (pcm[r * hop + k] ?? 0) * fen[k]; im[k] = 0; }
    fft(re, im);
    for (let k = 1; k < N / 2; k++) {
      const m = Math.log1p(100 * Math.hypot(re[k], im[k]));
      if (r) baender[k < grenze[0] ? 0 : k < grenze[1] ? 1 : 2][r] += Math.max(0, m - alt[k]);
      alt[k] = m;
    }
  }
  const kurve = new Float32Array(rahmen);
  for (const b of baender) {
    let max = 1e-9; for (const v of b) max = Math.max(max, v);
    if (max < 1e-3) continue;   // ein leeres Band (etwa kein Bass) wird nicht hochgezogen
    for (let r = 0; r < rahmen; r++) kurve[r] = Math.max(kurve[r], b[r] / max);
  }
  return { kurve, hop, N, versatz: (3 * N) / 4 };   // der Fluss steigt am stärksten, wenn der Anschlag bei drei Vierteln des Fensters liegt
}

/**
 * einen Einsatz auf den Anschlag selbst setzen: in 1-ms-Blöcken um i den stärksten Anstieg suchen, dann zurück bis zur leisesten Stelle davor.
 * Gemessen an der ersten Differenz (ein einfacher Hochpass): tiefe Töne schwanken innerhalb einer Millisekunde zu stark.
 */
function anschlagSuchen(pcm, rate, i) {
  const b = Math.max(1, Math.round(rate / 1000)), von = Math.max(0, i - 25 * b), bloecke = Math.floor((Math.min(pcm.length, i + 25 * b) - von) / b);
  if (bloecke < 3) return i;
  const e = Array.from({ length: bloecke }, (_, k) => { let s = 0; for (let j = Math.max(1, von + k * b); j < von + (k + 1) * b; j++) s += (pcm[j] - pcm[j - 1]) ** 2; return Math.sqrt(s / b); });
  let m = 1;
  for (let k = 2; k < bloecke; k++) if (e[k] - e[k - 1] > e[m] - e[m - 1]) m = k;
  let k = m - 1;
  while (k > 0 && e[k - 1] < e[k]) k--;
  return von + k * b;
}

/**
 * Einsätze: Spitzen der Einsatzkurve über einer gleitenden Schwelle (Mittel der Umgebung plus ein Abstand, der mit der Empfindlichkeit
 * sinkt), mindestens «abstand» Sekunden auseinander. Ergebnis [{ i (Abtastwert), t (s), staerke 0–1 }], der Anfang ist immer dabei.
 */
export function einsaetzeFinden(pcm, rate, { empfindlichkeit = 0.5, abstand = 0.07 } = {}) {
  return gemerkt(pcm, `einsaetze ${rate} ${empfindlichkeit} ${abstand}`, () => einsaetzeRechnen(pcm, rate, empfindlichkeit, abstand));
}

/** Messungen je Klang merken: sechs Varianten derselben Quelle messen sie sonst sechsmal (der Schlüssel ist das Float32Array selbst) */
const MESSUNGEN = new WeakMap();
function gemerkt(pcm, schluessel, rechne) {
  let m = MESSUNGEN.get(pcm);
  if (!m) MESSUNGEN.set(pcm, (m = new Map()));
  if (!m.has(schluessel)) m.set(schluessel, rechne());
  return m.get(schluessel);
}

function einsaetzeRechnen(pcm, rate, empfindlichkeit, abstand) {
  const { kurve, hop, versatz } = einsatzkurve(pcm, rate);
  let max = 1e-9; for (const v of kurve) max = Math.max(max, v);
  const k = kurve.map((v) => v / max), umgebung = Math.max(2, Math.round((0.12 * rate) / hop)), nah = Math.max(1, Math.round((0.03 * rate) / hop));
  const delta = 0.02 + 0.3 * (1 - empfindlichkeit), mindestens = Math.round((abstand * rate) / hop);
  const out = [{ i: 0, t: 0, staerke: k[0] ?? 0 }];
  for (let r = 1; r < k.length; r++) {
    let s = 0, z = 0, spitze = true;
    for (let j = Math.max(0, r - umgebung); j <= Math.min(k.length - 1, r + umgebung); j++) { s += k[j]; z++; if (Math.abs(j - r) <= nah && k[j] > k[r]) spitze = false; }
    if (!spitze || k[r] < s / z + delta) continue;
    const i = anschlagSuchen(pcm, rate, Math.round(r * hop + versatz));
    const letzte = out.at(-1);
    if (i - letzte.i < mindestens * hop) { if (k[r] > letzte.staerke && letzte.i > 0) Object.assign(letzte, { i, t: i / rate, staerke: k[r] }); continue; }
    out.push({ i, t: i / rate, staerke: k[r] });
  }
  return out.map((e) => ({ i: e.i, t: rund(e.t, 1e4), staerke: rund(e.staerke) }));
}

/**
 * Tempo schätzen: Autokorrelation der Einsatzkurve über die Abstände von 60 bis 200 Schlägen je Minute, gewichtet mit einer flachen Glocke
 * um 120 (die Vorliebe für mittlere Tempi, Hypothese nach der Literatur zur Schlagerkennung). Eine Schätzung, kein Befund über die Musik.
 */
export const tempoSchaetzen = (pcm, rate) => gemerkt(pcm, `tempo ${rate}`, () => tempoRechnen(pcm, rate));
function tempoRechnen(pcm, rate) {
  const { kurve, hop } = einsatzkurve(pcm, rate), rr = rate / hop;
  let m = 0; for (const v of kurve) m += v / kurve.length;
  const k = kurve.map((v) => Math.max(0, v - m));
  const ac = (lag) => { let s = 0; for (let i = lag; i < k.length; i++) s += k[i] * k[i - lag]; return s / (k.length - lag); };
  let best = { bpm: 120, wert: -1 }, summe = 0, zahl = 0;
  for (let bpm = 60; bpm <= 200; bpm += 0.5) {
    const lag = (60 / bpm) * rr, a = Math.floor(lag), f = lag - a, w = ac(a) * (1 - f) + ac(a + 1) * f;
    const wert = (w + 0.5 * (ac(Math.round(lag * 2)) || 0)) * Math.exp(-0.5 * (Math.log2(bpm / 120) / 0.9) ** 2);
    summe += wert; zahl++;
    if (wert > best.wert) best = { bpm, wert };
  }
  return { bpm: rund(best.bpm, 10), sicherheit: rund(Math.min(1, best.wert / (summe / zahl) / 4), 100) };
}

/** Lautstärke am Anfang eines Abschnitts (Effektivwert der ersten 30 ms): Mass für den Akzent eines Schnitts */
export function anschlag(spuren, a, b, rate) {
  const z = Math.min(b, a + Math.round(0.03 * rate)), m = mono(spuren);
  let s = 0; for (let i = a; i < z; i++) s += m[i] * m[i];
  return Math.sqrt(s / Math.max(1, z - a));
}

// ---------- Schnitte ----------
/** Grenzen (Abtastwerte, aufsteigend, mit 0) → Schnitte [{ a, b, staerke }] bis zum Ende; zu kurze werden mit dem vorigen verbunden */
export function schnitteAus(grenzen, spuren, rate, { mindestens = 0.02, hoechstens = 512 } = {}) {
  const n = spuren[0].length, g = [...new Set([0, ...grenzen.map((x) => Math.max(0, Math.min(n, Math.round(x))))])].sort((x, y) => x - y).filter((x) => x < n);
  const out = [];
  for (let j = 0; j < g.length; j++) {
    const a = g[j], b = g[j + 1] ?? n;
    if (out.length && (a - out.at(-1).a) / rate < mindestens) { out.at(-1).b = b; continue; }
    out.push({ a, b });
    if (out.length >= hoechstens) { out.at(-1).b = n; break; }
  }
  if (out.length > 1 && (out.at(-1).b - out.at(-1).a) / rate < mindestens) out.at(-2).b = out.pop().b;
  let max = 1e-9;
  for (const s of out) { s.staerke = anschlag(spuren, s.a, s.b, rate); max = Math.max(max, s.staerke); }
  for (const s of out) s.staerke = rund(s.staerke / max);
  return out;
}

/** Grenzen in einem gleichmässigen Raster: «teilung» Schnitte je Schlag bei «bpm» */
export const rasterGrenzen = (n, rate, bpm, teilung) => { const d = (60 / bpm / teilung) * rate, out = []; for (let x = 0; x < n; x += d) out.push(Math.round(x)); return out; };

/**
 * Einen Abschnitt [a, b) der Spuren holen: rückwärts, in der Tonhöhe verschoben (umgetastet), auf «laenge» gekürzt; mit kurzen Rampen
 * an Anfang und Ende, damit kein Knacken entsteht («rampe» in Sekunden, am Anfang höchstens 2 ms, damit der Anschlag bleibt).
 */
export function abschnitt(spuren, rate, a, b, { rueckwaerts = false, tonhoehe = 1, laenge = Infinity, rampe = 0.004 } = {}) {
  return spuren.map((s) => {
    let x = s.slice(a, b);
    if (rueckwaerts) x.reverse();
    if (Math.abs(tonhoehe - 1) > 1e-6) x = umtasten(x, tonhoehe);
    if (laenge < x.length) x = x.slice(0, Math.max(1, Math.round(laenge)));
    const ein = Math.min(x.length >> 1, Math.round((rueckwaerts ? rampe : Math.min(rampe, 0.002)) * rate)), aus = Math.min(x.length >> 1, Math.round(rampe * rate));
    for (let i = 0; i < ein; i++) x[i] *= i / ein;
    for (let i = 0; i < aus; i++) x[x.length - 1 - i] *= i / aus;
    return x;
  });
}

/** Abschnitt (Spuren) bei «start» in die Ausgabe addieren; mit «ringsum» läuft, was über das Ende hinausragt, am Anfang weiter (nahtlose Schleife) */
export function einlegen(ziel, teil, start, { staerke = 1, ringsum = false } = {}) {
  const n = ziel[0].length;
  for (let c = 0; c < ziel.length; c++) {
    const q = teil[Math.min(c, teil.length - 1)], o = ziel[c];
    for (let k = 0; k < q.length; k++) {
      let i = start + k;
      if (i >= n) { if (!ringsum) break; i %= n; }
      if (i >= 0) o[i] += q[k] * staerke;
    }
  }
}

// ---------- Muster ----------
/** euklidischer Rhythmus: k Treffer möglichst gleichmässig auf n Schritte (Bresenham; dasselbe Muster wie Bjorklund bis auf die Drehung) */
export function euklid(k, n, drehung = 0) {
  const t = Math.max(0, Math.min(n, Math.round(k)));
  return Array.from({ length: n }, (_, i) => { const j = (((i + drehung) % n) + n) % n; return t > 0 && (j * t) % n < t; });
}

/** Text → Abstände in Schritten: je Wort ein Treffer, der Abstand zum nächsten ist 1 + (Buchstaben − 1) mod 4 (Lesen, nicht Deuten) */
export function textAbstaende(text) {
  return text.split(/\s+/).map((w) => w.replace(/[^\p{L}]/gu, "")).filter(Boolean).map((w) => ({ wort: w, abstand: 1 + ((w.length - 1) % 4), gross: w[0] !== w[0].toLowerCase() }));
}

// ---------- Körner (Granularsynthese) ----------
export const FENSTER = {
  hann: (u) => 0.5 - 0.5 * Math.cos(TAU * u),
  flach: (u) => (u < 0.15 ? 0.5 - 0.5 * Math.cos((Math.PI * u) / 0.15) : u > 0.85 ? 0.5 - 0.5 * Math.cos((Math.PI * (1 - u)) / 0.15) : 1),
  perkussiv: (u) => (u < 0.03 ? u / 0.03 : Math.exp(-5 * (u - 0.03))),
};

/** ein Korn: ab «pos» (Abtastwert, gebrochen) mit «schritt» lesen, «laenge» Abtastwerte, gefenstert, mit Panorama (gleiche Leistung) addieren */
export function korn(ziel, spuren, { start, pos, schritt, laenge, fenster, pan = 0, staerke = 1 }) {
  const n = ziel[0].length, w = FENSTER[fenster] ?? FENSTER.hann, q = spuren[0].length;
  const links = Math.cos(((pan + 1) * Math.PI) / 4), rechts = Math.sin(((pan + 1) * Math.PI) / 4);
  for (let k = 0; k < laenge && start + k < n; k++) {
    const x = pos + k * schritt;
    if (x < 0 || x >= q - 1) continue;
    const g = w(k / laenge) * staerke;
    if (ziel.length === 1) ziel[0][start + k] += g * hermite(spuren[0], x);
    else {
      const l = hermite(spuren[0], x), r = spuren.length > 1 ? hermite(spuren[1], x) : l;
      ziel[0][start + k] += g * l * links * Math.SQRT2; ziel[1][start + k] += g * r * rechts * Math.SQRT2;
    }
  }
}

// ---------- Pegel und Ausspielen ----------
export function spitze(spuren) { let m = 0; for (const s of spuren) for (const v of s) m = Math.max(m, Math.abs(v)); return m; }

/**
 * Pegel: «quelle» lässt den Pegel stehen und senkt nur ab, wo er über −0,3 dBFS ginge (Übersteuerung beim Übereinanderlegen);
 * «normal» bringt die Spitze auf −1 dBFS. Gibt die Verstärkung zurück.
 */
export function pegeln(spuren, art = "quelle") {
  const s = spitze(spuren), g = s < 1e-9 ? 0 : art === "normal" ? 0.891 / s : Math.min(1, 0.966 / s);
  if (g !== 1) for (const x of spuren) for (let i = 0; i < x.length; i++) x[i] *= g;
  return g;
}

export const AUSSPIELEN = Object.freeze({
  bits: [{ wert: "24", name: "24 Bit (Studio, verlustfrei)" }, { wert: "32f", name: "32 Bit Gleitkomma (wie gerechnet)" }, { wert: "16", name: "16 Bit mit Dither (CD)" }],
  raten: [{ wert: 0, name: "wie der Klang" }, { wert: 44100, name: "44,1 kHz" }, { wert: 48000, name: "48 kHz" }, { wert: 88200, name: "88,2 kHz" }, { wert: 96000, name: "96 kHz" }],
});

/**
 * Spuren → WAV-Datei. bits "16" (mit dreieckigem Dither, TPDF, aus dem Startwert), "24" oder "32f" (IEEE-Gleitkomma, WAVE_FORMAT_EXTENSIBLE
 * ist nicht nötig: Format 3 lesen alle gängigen Programme). Abtastwerte verschränkt (L R L R …).
 */
export function wavSchreiben(spuren, rate, { bits = "24", seed = 1 } = {}) {
  const k = spuren.length, n = spuren[0].length, b = bits === "16" ? 2 : bits === "24" ? 3 : 4, fmt = bits === "32f" ? 3 : 1;
  const buf = new ArrayBuffer(44 + n * k * b), v = new DataView(buf), bytes = new Uint8Array(buf);
  const text = (o, s) => { for (let i = 0; i < s.length; i++) v.setUint8(o + i, s.charCodeAt(i)); };
  text(0, "RIFF"); v.setUint32(4, 36 + n * k * b, true); text(8, "WAVE"); text(12, "fmt ");
  v.setUint32(16, 16, true); v.setUint16(20, fmt, true); v.setUint16(22, k, true); v.setUint32(24, rate, true);
  v.setUint32(28, rate * k * b, true); v.setUint16(32, k * b, true); v.setUint16(34, b * 8, true); text(36, "data"); v.setUint32(40, n * k * b, true);
  let a = seed >>> 0;
  const rnd = () => { a = (Math.imul(a, 1664525) + 1013904223) >>> 0; return a / 4294967296; };
  let o = 44;
  for (let i = 0; i < n; i++) for (let c = 0; c < k; c++) {
    const x = Math.max(-1, Math.min(1, spuren[c][i]));
    if (b === 4) v.setFloat32(o, spuren[c][i], true);
    else if (b === 2) v.setInt16(o, Math.max(-32768, Math.min(32767, Math.round(x * 32767 + rnd() - rnd()))), true);
    else { const z = Math.max(-8388608, Math.min(8388607, Math.round(x * 8388607))); bytes[o] = z & 255; bytes[o + 1] = (z >> 8) & 255; bytes[o + 2] = (z >> 16) & 255; }
    o += b;
  }
  return bytes;
}

/** WAV lesen (16, 24 oder 32 Bit ganzzahlig, 32 Bit Gleitkomma; beliebig viele Kanäle) → { spuren, rate } ohne Umrechnung der Abtastrate */
export function wavSpuren(bytes) {
  const v = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const text = (o) => String.fromCharCode(...bytes.subarray(o, o + 4));
  if (text(0) !== "RIFF" || text(8) !== "WAVE") throw new Error("keine WAV-Datei");
  let o = 12, rate = 0, k = 1, bits = 16, fmt = 1;
  while (o + 8 <= bytes.length) {
    const id = text(o), len = v.getUint32(o + 4, true);
    if (id === "fmt ") { fmt = v.getUint16(o + 8, true); k = v.getUint16(o + 10, true); rate = v.getUint32(o + 12, true); bits = v.getUint16(o + 22, true); if (fmt === 0xfffe) fmt = v.getUint16(o + 32, true); }
    if (id === "data") {
      const b = bits / 8, n = Math.floor(Math.min(len, bytes.length - o - 8) / b / k), spuren = Array.from({ length: k }, () => new Float32Array(n));
      for (let i = 0; i < n; i++) for (let c = 0; c < k; c++) {
        const p = o + 8 + (i * k + c) * b;
        spuren[c][i] = fmt === 3 && b === 4 ? v.getFloat32(p, true) : b === 2 ? v.getInt16(p, true) / 32768 : b === 3 ? ((bytes[p] | (bytes[p + 1] << 8) | (bytes[p + 2] << 16)) << 8 >> 8) / 8388608 : b === 4 ? v.getInt32(p, true) / 2147483648 : (bytes[p] - 128) / 128;
      }
      return { spuren, rate };
    }
    o += 8 + len + (len % 2);
  }
  throw new Error("WAV ohne Daten");
}

/**
 * Die Abtastrate einer Tondatei aus ihrem Kopf lesen, damit der Browser sie nicht auf eine feste Rate umrechnet: WAV, FLAC, MP3, Ogg
 * (Vorbis, Opus: immer 48 kHz) und MP4/M4A. null, wenn nichts zu finden ist.
 */
export function abtastrateLesen(bytes) {
  const s = (o, n = 4) => String.fromCharCode(...bytes.subarray(o, o + n)), v = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  try {
    if (s(0) === "RIFF" && s(8) === "WAVE") { for (let o = 12; o + 16 < bytes.length;) { const len = v.getUint32(o + 4, true); if (s(o) === "fmt ") return v.getUint32(o + 12, true); o += 8 + len + (len % 2); } }
    if (s(0) === "fLaC") return (bytes[18] << 12) | (bytes[19] << 4) | (bytes[20] >> 4);
    if (s(0) === "OggS") { const i = bytes.indexOf(0x01, 28); if (s(28, 8) === "OpusHead") return 48000; if (s(i + 1, 6) === "vorbis") return v.getUint32(i + 12, true); }
    const mp4a = (() => { for (let i = 4; i < Math.min(bytes.length - 40, 8 * 1024 * 1024); i++) if (bytes[i] === 0x6d && s(i, 4) === "mp4a") return i; return -1; })();
    if (s(4) === "ftyp" && mp4a > 0) return v.getUint16(mp4a + 4 + 24, false);
    let o = s(0, 3) === "ID3" ? 10 + ((bytes[6] & 127) << 21 | (bytes[7] & 127) << 14 | (bytes[8] & 127) << 7 | (bytes[9] & 127)) : 0;
    for (const ende = Math.min(bytes.length - 4, o + 64 * 1024); o < ende; o++) if (bytes[o] === 0xff && (bytes[o + 1] & 0xe0) === 0xe0) {
      const ver = (bytes[o + 1] >> 3) & 3, idx = (bytes[o + 2] >> 2) & 3;
      if (ver === 1 || idx === 3) continue;
      return [44100, 48000, 32000][idx] / (ver === 3 ? 1 : ver === 2 ? 2 : 4);
    }
  } catch { /* Kopf unvollständig */ }
  return null;
}
