// Messen statt raten: Lautheit nach ITU-R BS.1770-4 und EBU R 128 (integriert, Lautheitsumfang LRA nach EBU Tech 3342), wahrer
// Spitzenwert, Anteil der Energie unter 120 Hz, 120 Hz–2 kHz und über 2 kHz (Linkwitz-Riley-Weichen 4. Ordnung), Stereobreite,
// Korrelation und das langzeitige Spektrum in Terzbändern. Für eine Mischung, eine Spur oder eine Referenz gleich.

import { Biquad, biquadKoeff, kFilterKoeff, lufsAus, WahrerSpitzenwert, dB, TAU } from "./dsp.js";

const stereo = (k) => (k.length === 1 ? [k[0], k[0]] : k);

/** K-gewichtete Energie je 100 ms (Summe über die Kanäle), Grundlage für alle Lautheiten */
function energieJe100ms(kanaele, rate) {
  const [a, b] = kFilterKoeff(rate), n = kanaele[0].length, hop = Math.round(rate / 10), z = Math.floor(n / hop), e = new Float64Array(z);
  for (let c = 0; c < kanaele.length; c++) {
    const s = Float32Array.from(kanaele[c]), f1 = new Biquad(1).setze(a), f2 = new Biquad(1).setze(b);
    f1.kanal(s, 0); f2.kanal(s, 0);
    for (let j = 0; j < z; j++) { let q = 0; for (let i = j * hop; i < (j + 1) * hop; i++) q += s[i] * s[i]; e[j] += q / hop; }
  }
  return e;
}
const mittelFenster = (e, laenge) => { const out = []; for (let j = 0; j + laenge <= e.length; j++) { let s = 0; for (let k = 0; k < laenge; k++) s += e[j + k]; out.push(s / laenge); } return out; };

/** integrierte Lautheit (LUFS), absolut bei −70 und relativ bei −10 LU gegated, Blöcke 400 ms mit 75 % Überlappung */
export function lautheitIntegriert(kanaele, rate) { return integriert(mittelFenster(energieJe100ms(stereo(kanaele), rate), 4)); }
function integriert(bloecke) {
  const abs = bloecke.filter((m) => lufsAus(m) > -70);
  if (!abs.length) return -Infinity;
  const mittel = (a) => a.reduce((x, y) => x + y, 0) / a.length, rel = lufsAus(mittel(abs)) - 10, g = abs.filter((m) => lufsAus(m) > rel);
  return lufsAus(mittel(g.length ? g : abs));
}
/** Lautheitsumfang (LU): kurzzeitige Lautheit (3 s), gegated bei −70 und −20 LU, 95. minus 10. Perzentil */
function lautheitsumfang(e) {
  const kurz = mittelFenster(e, 30).filter((m) => lufsAus(m) > -70);
  if (kurz.length < 2) return 0;
  const rel = lufsAus(kurz.reduce((x, y) => x + y, 0) / kurz.length) - 20, l = kurz.map(lufsAus).filter((x) => x > rel).sort((a, b) => a - b);
  const q = (p) => l[Math.min(l.length - 1, Math.max(0, Math.round(p * (l.length - 1))))];
  return l.length ? q(0.95) - q(0.1) : 0;
}

export function wahrerSpitzenwert(kanaele) {
  let m = 0;
  for (const s of kanaele) { const t = new WahrerSpitzenwert(); for (let i = 0; i < s.length; i++) { const v = t.schritt(s[i]); if (v > m) m = v; } for (let i = 0; i < 8; i++) { const v = t.schritt(0); if (v > m) m = v; } }
  return dB(m);
}

/** Energieanteile in drei Bändern (Weichen bei 120 Hz und 2 kHz, Linkwitz-Riley 4. Ordnung = zwei Butterworth hintereinander) */
function baender(mitte, rate) {
  const lr = (art, f) => { const k = biquadKoeff(art, f, rate); return (s) => { const a = new Biquad(1).setze(k), b = new Biquad(1).setze(k); a.kanal(s, 0); b.kanal(s, 0); return s; }; };
  const energie = (s) => { let q = 0; for (const v of s) q += v * v; return q; };
  const tief = energie(lr("tiefpass", 120)(Float32Array.from(mitte)));
  const hoch = energie(lr("hochpass", 2000)(Float32Array.from(mitte)));
  const mittel = energie(lr("hochpass", 120)(lr("tiefpass", 2000)(Float32Array.from(mitte))));
  const s = tief + mittel + hoch || 1;
  return { unter120: tief / s, mitten: mittel / s, ueber2k: hoch / s };
}

function fft(re, im) {
  const n = re.length;
  for (let i = 1, j = 0; i < n; i++) { let b = n >> 1; for (; j & b; b >>= 1) j ^= b; j ^= b; if (i < j) { [re[i], re[j]] = [re[j], re[i]]; [im[i], im[j]] = [im[j], im[i]]; } }
  for (let len = 2; len <= n; len <<= 1) {
    const w = -TAU / len, wr = Math.cos(w), wi = Math.sin(w);
    for (let i = 0; i < n; i += len) { let cr = 1, ci = 0; for (let k = 0; k < len / 2; k++) { const a = i + k, b = a + len / 2, xr = re[b] * cr - im[b] * ci, xi = re[b] * ci + im[b] * cr; re[b] = re[a] - xr; im[b] = im[a] - xi; re[a] += xr; im[a] += xi; const t = cr * wr - ci * wi; ci = cr * wi + ci * wr; cr = t; } }
  }
}

/** Terzmitten von 25 Hz bis 16 kHz */
export const TERZEN = Object.freeze([25, 31.5, 40, 50, 63, 80, 100, 125, 160, 200, 250, 315, 400, 500, 630, 800, 1000, 1250, 1600, 2000, 2500, 3150, 4000, 5000, 6300, 8000, 10000, 12500, 16000]);

/** langzeitiges Spektrum der Mitte (L+R)/2 in Terzbändern, dB (Leistung je Band), aus höchstens 400 Fenstern zu 8192 Werten */
function spektrum(mitte, rate) {
  const N = 8192, schritt = Math.max(N / 2, Math.floor((mitte.length - N) / 400)), fen = Float32Array.from({ length: N }, (_, k) => 0.5 - 0.5 * Math.cos((TAU * k) / N));
  const leistung = new Float64Array(N / 2), re = new Float64Array(N), im = new Float64Array(N);
  let z = 0;
  for (let o = 0; o + N <= mitte.length; o += schritt) { for (let k = 0; k < N; k++) { re[k] = mitte[o + k] * fen[k]; im[k] = 0; } fft(re, im); for (let k = 0; k < N / 2; k++) leistung[k] += re[k] * re[k] + im[k] * im[k]; z++; }
  return TERZEN.map((f) => {
    const a = Math.max(1, Math.round((f / 2 ** (1 / 6) * N) / rate)), b = Math.max(a + 1, Math.round((f * 2 ** (1 / 6) * N) / rate));
    let s = 0; for (let k = a; k < b && k < N / 2; k++) s += leistung[k];
    return Math.round(10 * Math.log10(Math.max(1e-20, s / Math.max(1, z))) * 10) / 10;
  });
}

/** alles auf einmal; für eine Spur von drei Minuten etwa eine Sekunde */
export function messen(kanaele, rate) {
  const k = stereo(kanaele), n = k[0].length, mitte = new Float32Array(n);
  let mm = 0, ss = 0, lr = 0, ll = 0, rr = 0, spitze = 0;
  for (let i = 0; i < n; i++) {
    const l = k[0][i], r = k[1][i], m = (l + r) / 2, s = (l - r) / 2;
    mitte[i] = m; mm += m * m; ss += s * s; lr += l * r; ll += l * l; rr += r * r;
    const a = Math.max(Math.abs(l), Math.abs(r)); if (a > spitze) spitze = a;
  }
  const e = energieJe100ms(k, rate), r1 = (x, s = 10) => Math.round(x * s) / s;
  return {
    lufs: r1(integriert(mittelFenster(e, 4))), lra: r1(lautheitsumfang(e)), tp: r1(wahrerSpitzenwert(k)), spitze: r1(dB(spitze)),
    baender: Object.fromEntries(Object.entries(baender(mitte, rate)).map(([a, v]) => [a, r1(v, 1000)])),
    breite: r1(ss / Math.max(1e-20, mm), 1000), korrelation: r1(lr / Math.max(1e-20, Math.sqrt(ll * rr)), 100),
    spektrum: spektrum(mitte, rate), dauer: r1(n / rate, 100), rate,
  };
}
