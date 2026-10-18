// PHORMA III – Stimme (ohne DOM, auch in Node für die Tests): ein eigener Weg für Sprachaufnahmen neben der Musik (Wunsch vom 18. Oktober 2026:
// «einen separaten Workflow für Voice-Dateien. Diese sollen 1. gesäubert werden, etwas Enhance, leichter Hall, glasklarer Sound. 2. einen Ablauf, der
// sowohl Gefrickel, klare Voice und etwas Scratching beinhaltet – 3–4 Sekunden Scratching, dann 10 Sekunden klare Voice mit zwei, drei Hüpfern, am
// Ende 3–4 Sekunden Gefrickel. So soll das Video einerseits verständlich, aber auch dekonstruiert sein»).
//   saeubern    – Rumpeln weg (Hochpass 80 Hz), Rauschen weg (Spektral-Gate: das Rauschen je Band aus den leisesten Stellen, die Verstärkung je
//                 Band geglättet), die Pausen sanft geschlossen (Expander), Klang (weniger Dumpfes um 300 Hz, Präsenz um 4 kHz, Luft ab 10 kHz), De-Esser, gleichmässig verdichtet, ein
//                 kleiner, leiser Raum, gemastert auf −16 LUFS (Sprache) und −1 dBFS
//   stimmAblauf – aus der gesäuberten Stimme: Scratching auf dem ersten Wort (Hin und Her wie eine Platte unter der Hand, mit Fader), die klare
//                 Stimme mit zwei, drei Hüpfern (Stottern, Rücksprung, rückwärts), am Ende Gefrickel (frickeln.js, zwei Takte); gegen das Gefrickel hin
//                 unterlegt mit Drum and Bass (Rückmeldung: «am Ende gegen das Gefrickel hin gerne mit ein wenig Drum and Bass unterlegt»); wiederholbar je Wurf
import { frickeln, hallFilter, meistern } from "./frickeln.js?v=10";

/** wiederholbarer Zufall (mulberry32) */
function zufall(samen) {
  let a = (samen * 2654435761 + 977) >>> 0 || 1;
  return () => { a = (a + 0x6d2b79f5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
const klemm = (x, a, b) => Math.min(b, Math.max(a, x));
const db = (x) => 20 * Math.log10(Math.max(1e-9, x));

// ——— Filter (Biquads nach dem Audio-EQ-Cookbook von R. Bristow-Johnson) ———
function biquad(art, f0, rate, { q = 0.7071, gain = 0 } = {}) {
  const A = 10 ** (gain / 40), w = (2 * Math.PI * f0) / rate, c = Math.cos(w), s = Math.sin(w), al = s / (2 * q);
  let b0, b1, b2, a0, a1, a2;
  if (art === "hoch") { b0 = (1 + c) / 2; b1 = -(1 + c); b2 = (1 + c) / 2; a0 = 1 + al; a1 = -2 * c; a2 = 1 - al; }
  else if (art === "band") { b0 = al; b1 = 0; b2 = -al; a0 = 1 + al; a1 = -2 * c; a2 = 1 - al; }
  else if (art === "glocke") { b0 = 1 + al * A; b1 = -2 * c; b2 = 1 - al * A; a0 = 1 + al / A; a1 = -2 * c; a2 = 1 - al / A; }
  else { const r = 2 * Math.sqrt(A) * al;                                   // "regal": Höhen anheben ab f0
    b0 = A * ((A + 1) + (A - 1) * c + r); b1 = -2 * A * ((A - 1) + (A + 1) * c); b2 = A * ((A + 1) + (A - 1) * c - r);
    a0 = (A + 1) - (A - 1) * c + r; a1 = 2 * ((A - 1) - (A + 1) * c); a2 = (A + 1) - (A - 1) * c - r; }
  return [b0 / a0, b1 / a0, b2 / a0, a1 / a0, a2 / a0];
}
function filtern(x, [b0, b1, b2, a1, a2], aus = new Float32Array(x.length)) {
  let x1 = 0, x2 = 0, y1 = 0, y2 = 0;
  for (let i = 0; i < x.length; i++) { const v = b0 * x[i] + b1 * x1 + b2 * x2 - a1 * y1 - a2 * y2; x2 = x1; x1 = x[i]; y2 = y1; y1 = v; aus[i] = v; }
  return aus;
}

// ——— FFT (radix 2, an Ort und Stelle) ———
function fft(re, im, rueck = false) {
  const n = re.length;
  for (let i = 1, j = 0; i < n; i++) { let b = n >> 1; for (; j & b; b >>= 1) j ^= b; j ^= b; if (i < j) { [re[i], re[j]] = [re[j], re[i]]; [im[i], im[j]] = [im[j], im[i]]; } }
  for (let l = 2; l <= n; l <<= 1) {
    const w = ((rueck ? 2 : -2) * Math.PI) / l, wr = Math.cos(w), wi = Math.sin(w);
    for (let i = 0; i < n; i += l) {
      let cr = 1, ci = 0;
      for (let k = 0; k < l / 2; k++) {
        const a = i + k, b = a + l / 2, tr = re[b] * cr - im[b] * ci, ti = re[b] * ci + im[b] * cr;
        re[b] = re[a] - tr; im[b] = im[a] - ti; re[a] += tr; im[a] += ti;
        const nr = cr * wr - ci * wi; ci = cr * wi + ci * wr; cr = nr;
      }
    }
  }
}

/**
 * Rauschen weg (Spektral-Gate): Fenster 1024 (Wurzel aus Hann), Schritt 256. Das Rauschen je Band aus seinen leisesten Momenten (siehe unten); Verstärkung je Band max(Boden, 1 − 2 · Rauschen / Betrag), über die Zeit geglättet (rasch auf, langsam ab) und
 * über drei Nachbarbänder gemittelt – sonst zwitschert der Rest («musikalisches Rauschen»). Boden −24 dB: es bleibt ein Hauch Raum.
 */
export function entrauschen(x, { N = 1024, schritt = 256, staerke = 2, boden = 0.06 } = {}) {
  const n = x.length, F = Math.ceil((n + N) / schritt), B = N / 2 + 1;
  const w = Float64Array.from({ length: N }, (_, i) => Math.sqrt(0.5 - 0.5 * Math.cos((2 * Math.PI * i) / N)));
  const re = new Float64Array(N), im = new Float64Array(N), betrag = new Float32Array(F * B);
  const lesen = (f) => { const o = f * schritt - N; for (let i = 0; i < N; i++) { const k = o + i; re[i] = k >= 0 && k < n ? x[k] * w[i] : 0; im[i] = 0; } fft(re, im); };
  for (let f = 0; f < F; f++) { lesen(f); for (let b = 0; b < B; b++) betrag[f * B + b] = Math.hypot(re[b], im[b]); }
  const rausch = new Float32Array(B), spalte = new Float32Array(F);
  // je Band: der Betrag über rund 60 ms geglättet, davon das 5. Perzentil, mal 1,9 (so weit liegt es bei reinem Rauschen unter dessen Mittel) – so findet es
  // das Rauschen auch in Sprache fast ohne Pausen in den kurzen Lücken zwischen den Silben
  for (let b = 0; b < B; b++) { let g = betrag[b]; for (let f = 0; f < F; f++) { g = 0.7 * g + 0.3 * betrag[f * B + b]; spalte[f] = g; } spalte.sort(); rausch[b] = 1.9 * spalte[Math.floor(F * 0.05)]; }
  const aus = new Float32Array(n), g = new Float32Array(B).fill(1), roh = new Float32Array(B);
  for (let f = 0; f < F; f++) {
    lesen(f);
    for (let b = 0; b < B; b++) {
      const z = Math.max(boden, 1 - (staerke * rausch[b]) / (betrag[f * B + b] + 1e-12));
      roh[b] = z > g[b] ? g[b] + (z - g[b]) * 0.7 : g[b] + (z - g[b]) * 0.25;
    }
    for (let b = 0; b < B; b++) { g[b] = roh[b]; }
    for (let b = 0; b < B; b++) {
      const v = (roh[Math.max(0, b - 1)] + 2 * roh[b] + roh[Math.min(B - 1, b + 1)]) / 4;
      re[b] *= v; im[b] *= v; if (b > 0 && b < N / 2) { re[N - b] *= v; im[N - b] *= v; }
    }
    fft(re, im, true);
    const o = f * schritt - N;
    for (let i = 0; i < N; i++) { const k = o + i; if (k >= 0 && k < n) aus[k] += (re[i] / N) * w[i] / 2; }   // Hann über 75 % Überlappung: Summe 2
  }
  return aus;
}

/** Grundrauschen in dBFS: das 10. Perzentil des Effektivwerts über 50 ms */
export function grundrauschen(x, rate) {
  const blk = Math.round(0.05 * rate), w = [];
  for (let s = 0; s + blk <= x.length; s += blk) { let e = 0; for (let i = s; i < s + blk; i++) e += x[i] * x[i]; w.push(Math.sqrt(e / blk)); }
  w.sort((a, b) => a - b);
  return db(w[Math.floor(w.length * 0.1)] ?? 0);
}

/** Effektivwert-Hüllkurve (Einpol über zeit Sekunden) */
function huelle(x, rate, zeit) {
  const k = Math.exp(-1 / (zeit * rate)), e = new Float32Array(x.length);
  let q = 0;
  for (let i = 0; i < x.length; i++) { q = k * q + (1 - k) * x[i] * x[i]; e[i] = Math.sqrt(q); }
  return e;
}

/**
 * Die Stimme säubern: kanaele ([Float32Array], ein oder zwei), rate. Ergebnis: { kanaele: [L, R], rate, dauer, rauschenVorher, rauschenNachher } (dBFS).
 * hall: Anteil des kleinen Raums (0,1 = leicht), lufs: Ziel (Sprache −16).
 */
export function saeubern(kanaele, rate, { hall = 0.1, lufs = -16 } = {}) {
  const L0 = kanaele[0], R0 = kanaele[1] ?? kanaele[0], n = L0.length, x = new Float32Array(n);
  for (let i = 0; i < n; i++) x[i] = (L0[i] + R0[i]) / 2;
  const rauschenVorher = grundrauschen(x, rate);
  // 1 Rumpeln und Brummen der Tiefe weg
  filtern(x, biquad("hoch", 80, rate), x);
  // 2 Rauschen weg
  let y = entrauschen(x);
  // 2b die Pausen schliessen: unter der Sprache (Grundrauschen + 12 dB) sanft bis −12 dB leiser (Expander 1 : 2, 5 / 150 ms)
  { const e = huelle(y, rate, 0.01), boden = 10 ** ((grundrauschen(y, rate) + 12) / 20), an = Math.exp(-1 / (0.005 * rate)), ab = Math.exp(-1 / (0.15 * rate));
    let g = 1;
    for (let i = 0; i < n; i++) {
      const z = e[i] >= boden ? 1 : Math.max(0.25, e[i] / boden);
      g = z > g ? an * g + (1 - an) * z : ab * g + (1 - ab) * z; y[i] *= g;
    } }
  // 3 Klang: weniger Dumpfes, mehr Präsenz und Luft
  for (const k of [biquad("glocke", 300, rate, { q: 1, gain: -2.5 }), biquad("glocke", 4000, rate, { q: 0.9, gain: 3 }), biquad("regal", Math.min(10000, rate * 0.4), rate, { gain: 2.5 })]) y = filtern(y, k);
  // 4 De-Esser: trägt das Band um 6,5 kHz mehr als 45 % des Pegels, wird es bis −8 dB leiser
  { const band = filtern(y, biquad("band", Math.min(6500, rate * 0.35), rate, { q: 1 })), es = huelle(band, rate, 0.005), ganz = huelle(y, rate, 0.005);
    for (let i = 0; i < n; i++) { const r = es[i] / (ganz[i] + 1e-9), g = r > 0.45 ? Math.max(0.4, 0.45 / r) : 1; y[i] -= (1 - g) * band[i]; } }
  // 5 gleichmässig: 3 : 1 ab −24 dB (Effektivwert über 20 ms, 5 / 120 ms)
  { let spitze = 1e-9; for (let i = 0; i < n; i++) spitze = Math.max(spitze, Math.abs(y[i]));
    const mittel = Math.exp(-1 / (0.02 * rate)), an = Math.exp(-1 / (0.005 * rate)), ab = Math.exp(-1 / (0.12 * rate)), schwelle = spitze * 10 ** (-24 / 20) * 4;
    let q = 0, g = 1;
    for (let i = 0; i < n; i++) {
      q = mittel * q + (1 - mittel) * y[i] * y[i];
      const p = Math.sqrt(q), z = p > schwelle ? Math.pow(p / schwelle, 1 / 3 - 1) : 1;
      g = z < g ? an * g + (1 - an) * z : ab * g + (1 - ab) * z; y[i] *= g;
    } }
  // 6 ein kleiner, leiser Raum (kurz, gedämpft, 20 ms vor), rechts gespreizt
  const L = Float32Array.from(y), R = Float32Array.from(y);
  if (hall > 0) {
    // kurz (Rückkopplung 0,62) und leise: in den Pausen rund 40 dB unter der Stimme (gemessen an einer Sprachprobe; vorher füllte er sie bei −33 dB)
    const hl = hallFilter(rate, 0, { rueck: 0.62, daempfung: 0.55 }), hr = hallFilter(rate, 23, { rueck: 0.62, daempfung: 0.55 }), vor = Math.round(0.02 * rate);
    for (let i = 0; i < n; i++) { const s = i >= vor ? y[i - vor] * 0.03 : 0; L[i] += hall * 1.3 * hl(s); R[i] += hall * 1.3 * hr(s); }
  }
  // 7 gemastert (Sprache: −16 LUFS, kaum noch verdichtet)
  meistern(L, R, rate, { lufs, schwelleDb: -10, verhaeltnis: 1.5, hochpass: 40, ausblenden: 0.05 });
  const m = new Float32Array(n); for (let i = 0; i < n; i++) m[i] = (L[i] + R[i]) / 2;
  return { kanaele: [L, R], rate, dauer: n / rate, rauschenVorher, rauschenNachher: grundrauschen(m, rate) };
}

/** wo die Sprache beginnt (Probe): der erste Effektivwert über 20 ms, der ein Zehntel des lautesten erreicht, 20 ms davor */
export function sprachbeginn(x, rate) {
  const blk = Math.round(0.02 * rate), e = [];
  for (let s = 0; s + blk <= x.length; s += blk) { let q = 0; for (let i = s; i < s + blk; i++) q += x[i] * x[i]; e.push(Math.sqrt(q / blk)); }
  let max = 1e-9; for (const v of e) if (v > max) max = v;                   // ohne Spreizen: bei langen Aufnahmen sprengte ...e den Stapel
  const k = e.findIndex((v) => v >= 0.1 * max);
  return Math.max(0, (k < 0 ? 0 : k) * blk - blk);
}

/** 4-Punkt-Hermite an der Stelle p (Proben) */
function lies(x, p) {
  const n = x.length, j = Math.floor(p), f = p - j;
  if (j < 0 || j >= n - 1) return 0;
  const xm = x[j > 0 ? j - 1 : 0], x0 = x[j], x1 = x[j + 1], x2 = x[j + 2 < n ? j + 2 : j + 1];
  const c1 = 0.5 * (x1 - xm), c2 = xm - 2.5 * x0 + 2 * x1 - 0.5 * x2, c3 = 0.5 * (x2 - xm) + 1.5 * (x0 - x1);
  return ((c3 * f + c2) * f + c1) * f + x0;
}

/**
 * Scratching auf dem ersten Wort: dauer Sekunden aus Zügen wie mit der Hand auf der Platte (je 0,11–0,36 s). Arten: Baby (vor und zurück), Chirp
 * (vor offen, zurück zu), Transform (der Fader schneidet drei-, viermal), Zurückreissen. Die Tonhöhe folgt der Geschwindigkeit; langsam klingt die
 * Platte dumpfer (Tiefpass nach der Geschwindigkeit). Ergebnis: [L, R] und die Züge
 */
function scratching(L0, R0, rate, start, dauer, r) {
  const S = Math.round(dauer * rate), L = new Float32Array(S), R = new Float32Array(S), stoff = Math.round(0.9 * rate), zuege = [];
  const P = new Float32Array(S), F = new Float32Array(S);                    // für den Fahrplan des Bilds: Stelle (Proben) und Fader je Probe
  let t = 0, zl = 0, zr = 0;
  while (t < S) {
    const d = Math.min(S - t, Math.round((0.11 + 0.25 * r()) * rate)), w = r(), art = w < 0.42 ? "baby" : w < 0.68 ? "chirp" : w < 0.88 ? "transform" : "zurueck";
    const weite = (0.06 + 0.3 * r()) * rate, ort = start + r() * Math.max(1, stoff - weite), schnitte = 3 + Math.floor(r() * 2), rampe = 0.003 * rate;
    zuege.push({ t: t / rate, art });
    for (let i = 0; i < d; i++) {
      const u = i / d;
      let p, v;                                                               // Stelle (Proben) und Geschwindigkeit (1 = normal)
      if (art === "zurueck") { p = ort + weite * (1 - u * u); v = (-2 * weite * u) / d; }
      else { p = ort + weite * Math.sin(Math.PI * u); v = (weite * Math.PI * Math.cos(Math.PI * u)) / d; }
      let fader = 1;
      const rand = (x) => klemm(x / rampe, 0, 1);
      if (art === "chirp") fader = rand((d * 0.5 - i) + rampe);              // zurück: zu
      if (art === "transform") { const s = (u * schnitte * 2) % 2; fader = s < 1 ? rand(s * d / (schnitte * 2)) * rand((1 - s) * d / (schnitte * 2)) : 0; }
      fader *= rand(i) * rand(d - i);
      const a = Math.min(1, 0.3 + Math.abs(v)), fc = 700 + 9000 * Math.min(1, Math.abs(v)), k = 1 - Math.exp((-2 * Math.PI * fc) / rate);
      zl += (lies(L0, p) - zl) * k; zr += (lies(R0, p) - zr) * k;
      L[t + i] = zl * a * fader; R[t + i] = zr * a * fader;
      P[t + i] = p; F[t + i] = fader;
    }
    t += d;
  }
  return { L, R, zuege, P, F };
}

/**
 * Drum and Bass (174 BPM): Kick und Snare im Two-Step (Kick auf 1 und auf der Drei-und, Snare auf 2 und 4, leise Geister-Snares), Hi-Hats in Achteln
 * mit Sechzehntel-Wirbeln, dazu ein Reese-Bass (zwei leicht verstimmte Sägezähne, Tiefpass, im Takt der Kick geduckt). Ergebnis: [L, R], dauer s,
 * der erste Schlag bei 0; ein Takt dauert 240 / bpm Sekunden. Wiederholbar je samen.
 */
export function drumAndBass(rate, dauer, { samen = 1, bpm = 174, grundton = 43.65 } = {}) {
  const n = Math.round(dauer * rate), L = new Float32Array(n), R = new Float32Array(n), bass = new Float32Array(n), r = zufall(samen * 31 + 7);
  const schritt = (60 / bpm / 4) * rate, takte = Math.ceil(n / (16 * schritt));
  let z = (samen * 7919) | 1; const rausch = () => { z ^= z << 13; z ^= z >>> 17; z ^= z << 5; return ((z >>> 0) / 4294967296) * 2 - 1; };
  const kick = (o, g) => {                                                    // Sinus, der in 60 ms von 150 auf 45 Hz fällt, mit kurzem Klick
    let ph = 0;
    for (let i = 0; i < 0.35 * rate && o + i < n; i++) {
      const t = i / rate, f = 45 + 105 * Math.exp(-t / 0.025), e = Math.exp(-t / 0.16) * Math.min(1, i / 16);
      ph += (2 * Math.PI * f) / rate; const v = g * (Math.sin(ph) * e + (t < 0.004 ? 0.3 * rausch() : 0));
      L[o + i] += v; R[o + i] += v;
    }
  };
  const snare = (o, g) => {                                                   // Rauschen (hochpassig) und ein Ton um 190 Hz
    let a = 0, ph = 0;
    for (let i = 0; i < 0.2 * rate && o + i < n; i++) {
      const t = i / rate, x = rausch(); a += (x - a) * 0.25; ph += (2 * Math.PI * 190) / rate;
      const v = g * ((x - a) * Math.exp(-t / 0.07) * 0.8 + Math.sin(ph) * Math.exp(-t / 0.04) * 0.5);
      L[o + i] += v * 0.95; R[o + i] += v;
    }
  };
  const hat = (o, g, offen, pan) => {                                        // Rauschen über etwa 7 kHz
    let a = 0, b = 0;
    for (let i = 0; i < (offen ? 0.16 : 0.035) * rate && o + i < n; i++) {
      const t = i / rate, x = rausch(); a += (x - a) * 0.5; b += (a - b) * 0.5;
      const v = g * (x - b) * Math.exp(-t / (offen ? 0.06 : 0.012));
      L[o + i] += v * (1 - pan); R[o + i] += v * (1 + pan);
    }
  };
  const lauf = [[0, 0, 0, 0], [0, 0, 3, 5], [0, -2, 0, 3], [0, 5, 3, -2]][Math.floor(r() * 4)];   // Grundtöne je Takt (Halbtöne)
  for (let t = 0; t < takte; t++) for (let s = 0; s < 16; s++) {
    const o = Math.round((t * 16 + s) * schritt);
    if (o >= n) break;
    if (s === 0 || s === 10 || (s === 13 && r() < 0.3)) kick(o, 0.9);
    if (s === 4 || s === 12) snare(o, 0.6);
    else if ((s === 7 || s === 15) && r() < 0.5) snare(o, 0.15);
    if (s % 2 === 0) hat(o, s % 4 === 2 ? 0.28 : 0.18, s === 14 && r() < 0.5, 0.3);
    else if (r() < 0.3 + 0.3 * (t % 2)) hat(o, 0.1, false, -0.3);
  }
  // der Reese-Bass, je Takt ein Grundton, eine Oktave Raum für den Tiefpass, der langsam atmet
  { let p1 = 0, p2 = 0, a = 0, c = 0, d = 0;
    for (let i = 0; i < n; i++) {
      const takt = Math.floor(i / (16 * schritt)), f = grundton * 2 ** (lauf[takt % 4] / 12);
      p1 = (p1 + (f * 1.004) / rate) % 1; p2 = (p2 + (f * 0.996) / rate) % 1;
      const roh = (2 * p1 - 1) + (2 * p2 - 1), fc = 180 + 260 * (0.5 + 0.5 * Math.sin((2 * Math.PI * i) / (8 * 16 * schritt))), k = 1 - Math.exp((-2 * Math.PI * fc) / rate);
      a += (roh - a) * k; c += (a - c) * k; d += (c - d) * k;
      const s = (i % (8 * schritt)) / rate, duck = 1 - 0.7 * Math.exp(-s / 0.09) * (Math.floor(i / (8 * schritt)) % 2 === 0 || i % (16 * schritt) > 10 * schritt ? 1 : 0);
      bass[i] = d * 0.32 * duck;
    }
    for (let i = 0; i < n; i++) { L[i] += bass[i]; R[i] += bass[i]; } }
  return [L, R];
}

/**
 * Der Ablauf aus der gesäuberten Stimme: Scratching (scratch s) → klare Stimme (stimme s) mit zwei, drei Hüpfern → Gefrickel (frickel s).
 * Ergebnis: { kanaele: [L, R], rate, dauer, teile: [{ name, von, bis }], huepfer: [{ t, art }], zuege } – derselbe Wurf (samen) gibt dasselbe.
 */
export function stimmAblauf(kanaele, rate, { samen = 1, scratch = 3.5, stimme = 10, frickel = 3.5, dnb = true } = {}) {
  const L0 = kanaele[0], R0 = kanaele[1] ?? kanaele[0], n = L0.length, r = zufall(samen);
  const mono = new Float32Array(n); for (let i = 0; i < n; i++) mono[i] = (L0[i] + R0[i]) / 2;
  const start = sprachbeginn(mono, rate);
  const teileL = [], teileR = [], teile = [], stellen = [], faders = [];   // stellen/faders: der Fahrplan des Bilds je Teil (Proben der Quelle, Fader)
  let laenge = 0;
  const dazu = (l, rr, name) => { teileL.push(l); teileR.push(rr); if (name) teile.push({ name, von: laenge / rate, bis: (laenge + l.length) / rate }); laenge += l.length; };
  // 1 Scratching
  const sc = scratching(L0, R0, rate, start, scratch, r);
  dazu(sc.L, sc.R, "scratch"); stellen.push(sc.P); faders.push(sc.F);
  // 2 die klare Stimme mit Hüpfern: Stücke der Quelle, je an den Rändern 4 ms weich
  const ende = Math.min(n, start + Math.round(stimme * rate)), lang = (ende - start) / rate, huepfer = [];
  const anzahl = lang > 6 ? 2 + (r() < 0.5 ? 1 : 0) : lang > 3 ? 1 : 0, orte = [];
  for (let v = 0; orte.length < anzahl && v < 200; v++) {
    const h = 1.2 + r() * Math.max(0.1, lang - 2.4);
    if (orte.every((o) => Math.abs(o - h) > 2.2)) orte.push(h);
  }
  orte.sort((a, b) => a - b);
  const stuecke = [];                                                         // [von, bis, rückwärts]
  let zeiger = start;
  for (const h of orte) {
    const p = start + Math.round(h * rate), art = ["stotter", "sprung", "rueck"][Math.floor(r() * 3)];
    stuecke.push([zeiger, p, false]);
    huepfer.push({ art, quelle: h });
    if (art === "stotter") { const g = Math.round((0.07 + 0.07 * r()) * rate); for (let k = 0, m = 3 + Math.floor(r() * 2); k < m; k++) stuecke.push([p, p + g, false]); zeiger = p; }
    else if (art === "sprung") { zeiger = Math.max(start, p - Math.round((0.25 + 0.2 * r()) * rate)); }
    else { const g = Math.round(0.18 * rate); stuecke.push([p, p + g, true]); zeiger = p + g; }
  }
  stuecke.push([zeiger, ende, false]);
  { const m = stuecke.reduce((s, [a, b]) => s + Math.max(0, b - a), 0), L = new Float32Array(m), R = new Float32Array(m), rand = Math.round(0.004 * rate);
    let o = 0;
    const P = new Float32Array(m);
    for (const [a, b, rueck] of stuecke) {
      const k = Math.max(0, b - a);
      for (let i = 0; i < k; i++) {
        const q = rueck ? b - 1 - i : a + i, h = Math.min(1, i / rand, (k - i) / rand);
        L[o + i] = L0[q] * h; R[o + i] = R0[q] * h; P[o + i] = q;
      }
      o += k;
    }
    stellen.push(P); faders.push(null);
    // die Zeit jedes Hüpfers im Ergebnis: dort, wo sein erstes Stück endet
    let t = 0, j = 0;
    for (const [a, b] of stuecke) { t += Math.max(0, b - a); if (j < huepfer.length && b === start + Math.round(huepfer[j].quelle * rate)) { huepfer[j].t = (laenge + t) / rate; j++; } }
    dazu(L, R, "stimme");
  }
  // 3 Gefrickel: zwei Takte aus der ganzen Stimme, frickel s davon, ausgeblendet
  { const f = frickeln([L0, R0], rate, { samen, takte: 2 }), m = Math.min(f.kanaele[0].length, Math.round(frickel * rate)), aus = Math.round(0.6 * rate);
    const L = f.kanaele[0].slice(0, m), R = f.kanaele[1].slice(0, m);
    for (let i = 0; i < m; i++) { const h = Math.min(1, (m - i) / aus); L[i] *= h; R[i] *= h; }
    // 40 ms in die Stimme hinein überblendet
    const x = Math.min(Math.round(0.04 * rate), teileL.at(-1).length, m), vL = teileL.at(-1), vR = teileR.at(-1);
    for (let i = 0; i < x; i++) { const u = i / x, k = vL.length - x + i; vL[k] = vL[k] * (1 - u) + L[i] * u; vR[k] = vR[k] * (1 - u) + R[i] * u; }
    const v0 = laenge;
    teile.at(-1).bis = (v0 - x) / rate;
    dazu(L.subarray(x), R.subarray(x), null);
    // die Stellen im Gefrickel: je Probe die zuletzt begonnene Scheibe (die Körnerwolken, leise darunter, zählen nicht)
    const P = new Float32Array(m), stets = stellen.at(-1), letzt = stets.length ? stets[stets.length - 1] : start;
    P.fill(letzt);
    for (const e of [...f.plan].filter((e) => e.gain > 0.35).sort((a, b) => a.start - b.start))
      for (let i = 0; i < e.m && e.start + i < m; i++) P[e.start + i] = e.rueck ? e.b - 3 - e.versatz - i * e.tempo : e.a + 1 + e.versatz + i * e.tempo;
    stellen.at(-1).fill(P[0], stellen.at(-1).length - x);                   // in der Überblendung schon die erste Scheibe
    stellen.push(P.subarray(x)); faders.push(null);
    teile.push({ name: "frickel", von: (v0 - x) / rate, bis: laenge / rate });
  }
  const L = new Float32Array(laenge), R = new Float32Array(laenge);
  let o = 0;
  for (let i = 0; i < teileL.length; i++) { L.set(teileL[i], o); R.set(teileR[i], o); o += teileL[i].length; }
  // 4 Drum and Bass: einen Takt vor dem Gefrickel herein, in einem halben Takt eingeblendet (Rückmeldung: «drum n bass etwas später, kurz vor
  // gefrickel»; vorher drei Takte), ein Taktanfang genau beim Gefrickel; unter der
  // Stimme um bis zu 8 dB geduckt, damit sie verständlich bleibt
  let unterlegt = null;
  if (dnb) {
    const bpm = 174, takt = 240 / bpm, fr = teile.at(-1), von = Math.max(teile[1].von + 1, fr.von - takt), a = Math.round(von * rate);
    const [dL, dR] = drumAndBass(rate, laenge / rate - von, { samen, bpm }), vorlauf = (fr.von - von) % takt;   // so fällt ein Taktanfang auf das Gefrickel
    const versatz = Math.round(((takt - vorlauf) % takt) * rate), stimmHuelle = huelle(L.map((v, i) => (v + R[i]) / 2), rate, 0.05);
    let spitze = 1e-6; for (let i = a; i < Math.min(laenge, a + Math.round(takt * 3 * rate)); i++) spitze = Math.max(spitze, stimmHuelle[i]);
    const ein = 0.5 * takt * rate, fb = fr.von * rate;
    for (let i = a; i < laenge; i++) {
      const j = i - a + versatz; if (j >= dL.length) break;
      const h = Math.min(1, (i - a) / ein) ** 2, duck = i < fb ? 1 - 0.6 * Math.min(1, stimmHuelle[i] / spitze) : 1;
      L[i] += 0.32 * h * duck * dL[j]; R[i] += 0.32 * h * duck * dR[j];
    }
    unterlegt = { von, bis: laenge / rate, bpm };
  }
  meistern(L, R, rate, { lufs: -14, schwelleDb: -16, verhaeltnis: 1.6, hochpass: 40, ausblenden: 0.4 });
  return { kanaele: [L, R], rate, dauer: laenge / rate, teile, huepfer: huepfer.map(({ t, art }) => ({ t, art })), zuege: sc.zuege, unterlegt, karte: fahrplan(stellen, faders, rate) };
}

/** Takt des Fahrplans: so viele Stellen je Sekunde */
export const FAHRPLAN = 240;
/**
 * Der Fahrplan des Ablaufs für das Bild (PHORMA III, Effekt Video, seit 18. Oktober 2026: «nicht nur auf der Tonebene, sondern auch auf der Bild- bzw.
 * Video-Ebene»): je 1/240 s die Stelle der Quelle (Sekunden ab ihrem Anfang) und die Helligkeit (der Fader beim Scratchen, sonst 1). Aus den Teilen
 * in Proben (stellen) und ihren Fadern (oder null). → { rate: 240, pos, hell } – das Bild folgt so genau dem Ton: vor, zurück, gestottert, verfrickelt.
 */
export function fahrplan(stellen, faders, rate) {
  const n = stellen.reduce((s, p) => s + p.length, 0), k = Math.max(1, Math.ceil((n / rate) * FAHRPLAN)), pos = new Float32Array(k), hell = new Float32Array(k);
  let o = 0, j = 0;
  for (let t = 0; t < stellen.length; t++) {
    const P = stellen[t], F = faders[t];
    for (; j < k; j++) {
      const i = Math.round((j * rate) / FAHRPLAN) - o;
      if (i >= P.length) break;
      pos[j] = P[i] / rate; hell[j] = F ? F[i] : 1;
    }
    o += P.length;
  }
  for (; j < k; j++) { pos[j] = pos[j - 1] ?? 0; hell[j] = hell[j - 1] ?? 1; }
  return { rate: FAHRPLAN, pos, hell };
}
