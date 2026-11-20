// Klang von Figur und Fläche. Web Audio, alles im Browser.
// Isolieren: der Daumen kratzt fein über die Leinwand; schliesst sich das Rund, klingt es wie eine Schale.
//   Die Fläche ist ein ruhig gehaltener Akkord, jede von Bacons Farben ein anderer Grundton.
// Schrei: Halten lässt einen fernen, gefilterten Schrei aufsteigen (Formanten eines offenen «a»), Ziehen ist ein tiefes Dehnen.
// Fleisch: ein weiches, nasses Reiben, je schneller, desto heller.

let ctx = null, haupt = null, trocken = null, nass = null, hall = null, ziel = null, rausch = null;
let kratzGain = null, kratzFilter = null, dehnGain = null, dehnFilter = null, nassGain = null, nassFilter = null;
let akkord = [], akkordGain = null, akkordFilter = null;
let stimme = null, stimmeGain = null, vibrato = null, atemGain = null, formanten = [];
let an = true;

function hallBauen(sek) {
  const n = Math.round(ctx.sampleRate * sek), ir = ctx.createBuffer(2, n, ctx.sampleRate);
  for (let k = 0; k < 2; k++) {
    const d = ir.getChannelData(k);
    let z = 0;
    for (let i = 0; i < n; i++) { const t = i / n; z += ((Math.random() * 2 - 1) - z) * (0.6 - 0.45 * t); d[i] = z * Math.pow(1 - t, 2.6) * 1.3; }
  }
  hall.buffer = ir;
}
function rauschQuelle(rate = 1) {
  const q = ctx.createBufferSource(); q.buffer = rausch; q.loop = true; q.playbackRate.value = rate; q.start(0, Math.random() * 1.5); return q;
}

// muss aus einer Berührung heraus aufgerufen werden (Autoplay-Regeln)
export function klangStarten() {
  if (ctx) { if (ctx.state === 'suspended') ctx.resume(); return; }
  const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return;
  ctx = new AC();
  haupt = ctx.createGain(); haupt.gain.value = an ? 1 : 0;
  const begrenzer = ctx.createDynamicsCompressor(); begrenzer.threshold.value = -16; begrenzer.ratio.value = 5;
  haupt.connect(begrenzer); begrenzer.connect(ctx.destination);
  ziel = ctx.createMediaStreamDestination(); begrenzer.connect(ziel);
  trocken = ctx.createGain(); trocken.gain.value = 0.8; trocken.connect(haupt);
  nass = ctx.createGain(); nass.gain.value = 0.45;
  hall = ctx.createConvolver(); nass.connect(hall); hall.connect(haupt);
  hallBauen(3.2);
  const n = ctx.sampleRate * 2, buf = ctx.createBuffer(1, n, ctx.sampleRate), d = buf.getChannelData(0);
  for (let i = 0; i < n; i++) d[i] = Math.random() * 2 - 1;
  rausch = buf;
  const kette = (quelle, typ, f, q) => {
    const fi = ctx.createBiquadFilter(); fi.type = typ; fi.frequency.value = f; fi.Q.value = q;
    const g = ctx.createGain(); g.gain.value = 0;
    quelle.connect(fi); fi.connect(g); g.connect(trocken); g.connect(nass);
    return [fi, g];
  };
  [kratzFilter, kratzGain] = kette(rauschQuelle(1), 'bandpass', 2600, 2.2);
  [dehnFilter, dehnGain] = kette(rauschQuelle(0.35), 'lowpass', 220, 4);
  [nassFilter, nassGain] = kette(rauschQuelle(0.6), 'bandpass', 700, 0.9);
  // die Fläche: drei Sinustöne, Grundton, Quinte, Oktave, leicht gegeneinander verstimmt
  akkordFilter = ctx.createBiquadFilter(); akkordFilter.type = 'lowpass'; akkordFilter.frequency.value = 900;
  akkordGain = ctx.createGain(); akkordGain.gain.value = 0;
  akkordFilter.connect(akkordGain); akkordGain.connect(trocken); akkordGain.connect(nass);
  for (const [m, typ, l] of [[1, 'sine', 0.5], [1.4983, 'sine', 0.28], [2.003, 'triangle', 0.12]]) {
    const o = ctx.createOscillator(); o.type = typ; o.frequency.value = 146.83 * m;
    const g = ctx.createGain(); g.gain.value = l; o.connect(g); g.connect(akkordFilter); o.start();
    akkord.push([o, m]);
  }
  // der Schrei: Sägezahn mit Vibrato durch drei Formantfilter, dazu Atem
  stimme = ctx.createOscillator(); stimme.type = 'sawtooth'; stimme.frequency.value = 190;
  vibrato = ctx.createOscillator(); vibrato.frequency.value = 5.6;
  const vt = ctx.createGain(); vt.gain.value = 4; vibrato.connect(vt); vt.connect(stimme.frequency); vibrato.start();
  stimmeGain = ctx.createGain(); stimmeGain.gain.value = 0;
  for (const [f, q, l] of [[800, 9, 1], [1150, 10, 0.6], [2900, 12, 0.25]]) {
    const fi = ctx.createBiquadFilter(); fi.type = 'bandpass'; fi.frequency.value = f; fi.Q.value = q;
    const g = ctx.createGain(); g.gain.value = l; stimme.connect(fi); fi.connect(g); g.connect(stimmeGain);
    formanten.push([fi, f]);
  }
  stimme.start();
  const atem = rauschQuelle(1), af = ctx.createBiquadFilter(); af.type = 'bandpass'; af.frequency.value = 1100; af.Q.value = 1.2;
  atemGain = ctx.createGain(); atemGain.gain.value = 0; atem.connect(af); af.connect(atemGain); atemGain.connect(stimmeGain);
  stimmeGain.connect(trocken); stimmeGain.connect(nass);
}

export function klangAn(wert) {
  an = wert;
  if (ctx) haupt.gain.setTargetAtTime(an ? 1 : 0, ctx.currentTime, 0.08);
}
export const klangIstAn = () => an;
export const klangSpur = () => (ctx && an ? ziel.stream.getAudioTracks()[0] || null : null);

// das Rund schliesst sich: eine Schale, angeschlagen
export function klangRund() {
  if (!ctx || !an || ctx.state !== 'running') return;
  const t = ctx.currentTime;
  for (const [f, l, dauer] of [[392, 0.05, 3.2], [392 * 2.76, 0.022, 2.1], [392 * 5.4, 0.01, 1.2]]) {
    const o = ctx.createOscillator(); o.type = 'sine'; o.frequency.value = f;
    const g = ctx.createGain(); g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(l, t + 0.01); g.gain.exponentialRampToValueAtTime(0.0002, t + dauer);
    o.connect(g); g.connect(trocken); g.connect(nass); o.start(t); o.stop(t + dauer + 0.05);
  }
}

// Grundtöne der fünf Flächen: Orange D, Rosa F, Violett G, Grün A, Nachtblau C
const GRUND = [146.83, 174.61, 196.0, 220.0, 130.81];

// je Bild: lesart, tempo (Bildhöhen je Sekunde), finger, halt, schrei, flut, zeichnen, werte, flaeche
export function klangBild({ lesart, tempo, finger, schrei, flut, zeichnen, werte, flaeche }) {
  if (!ctx || ctx.state !== 'running') return;
  const t = ctx.currentTime, z = 0.06;
  const v = Math.min(1, tempo / 2.2);
  kratzGain.gain.setTargetAtTime(zeichnen ? 0.05 + 0.08 * Math.sqrt(v) : 0, t, z);
  kratzFilter.frequency.setTargetAtTime(1800 + 2600 * v, t, z);
  const x = Math.max(0, Math.min(0.9999, flaeche)) * (GRUND.length - 1), i = Math.floor(x), f = x - i;
  const grund = GRUND[i] * Math.pow(GRUND[i + 1] / GRUND[i], f);
  for (const [o, m] of akkord) o.frequency.setTargetAtTime(grund * m, t, 0.4);
  akkordGain.gain.setTargetAtTime(0.045 * flut * (lesart === 0 ? 1 : 0.45), t, 0.6);
  akkordFilter.frequency.setTargetAtTime(500 + 900 * flut, t, 0.5);
  dehnGain.gain.setTargetAtTime(lesart === 1 && finger ? 0.12 * Math.sqrt(v) * (0.5 + werte[0]) : 0, t, 0.08);
  dehnFilter.frequency.setTargetAtTime(140 + 260 * v, t, 0.08);
  const s = lesart === 1 ? schrei : 0;
  stimmeGain.gain.setTargetAtTime(0.05 * s * s, t, 0.12);
  atemGain.gain.setTargetAtTime(0.6 + 0.6 * s, t, 0.2);
  stimme.frequency.setTargetAtTime(170 + 120 * s, t, 0.25);
  for (const [fi, f0] of formanten) fi.frequency.setTargetAtTime(f0 * (0.9 + 0.2 * s), t, 0.3);
  nassGain.gain.setTargetAtTime(lesart === 2 && finger ? 0.1 * Math.sqrt(v) + 0.02 : 0, t, 0.07);
  nassFilter.frequency.setTargetAtTime(420 + 900 * v + 120 * Math.sin(t * 11), t, 0.05);
}
