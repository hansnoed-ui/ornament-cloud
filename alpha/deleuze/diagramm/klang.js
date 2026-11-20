// Klang des Diagramms. Web Audio, alles im Browser.
// Wischen: die Borsten kratzen über die Leinwand, je schneller, desto heller; Reiben ist ein tiefes, mattes Schaben.
// Fäden: der Strahl zischt leise, jede Schlaufe tickt wie ein Tropfen auf Baumwolle, Spritzer prasseln.
// Kräfte: ein tiefer Ton mit seiner Quinte; je mehr Kraft, desto mehr reiben sich die beiden (Schwebung) und öffnen sich.

let ctx = null, haupt = null, trocken = null, nass = null, hall = null, ziel = null, rausch = null;
let borstenGain = null, borstenFilter = null, reibGain = null, reibFilter = null, strahlGain = null, strahlFilter = null;
let ton = null, ton2 = null, tonGain = null, tonFilter = null;
let an = true;

function hallBauen(sek) {
  const n = Math.round(ctx.sampleRate * sek), ir = ctx.createBuffer(2, n, ctx.sampleRate);
  for (let k = 0; k < 2; k++) {
    const d = ir.getChannelData(k);
    let z = 0;
    for (let i = 0; i < n; i++) { const t = i / n; z += ((Math.random() * 2 - 1) - z) * (0.6 - 0.45 * t); d[i] = z * Math.pow(1 - t, 2.8) * 1.3; }
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
  trocken = ctx.createGain(); trocken.gain.value = 0.85; trocken.connect(haupt);
  nass = ctx.createGain(); nass.gain.value = 0.35;
  hall = ctx.createConvolver(); nass.connect(hall); hall.connect(haupt);
  hallBauen(2.6);
  const n = ctx.sampleRate * 2, buf = ctx.createBuffer(1, n, ctx.sampleRate), d = buf.getChannelData(0);
  for (let i = 0; i < n; i++) d[i] = Math.random() * 2 - 1;
  rausch = buf;
  const kette = (quelle, typ, f, q) => {
    const fi = ctx.createBiquadFilter(); fi.type = typ; fi.frequency.value = f; fi.Q.value = q;
    const g = ctx.createGain(); g.gain.value = 0;
    quelle.connect(fi); fi.connect(g); g.connect(trocken); g.connect(nass);
    return [fi, g];
  };
  // Borsten: helles, körniges Rauschen (ein Rauschen mit kurzen Lücken, wie Haare über Gewebe)
  [borstenFilter, borstenGain] = kette(rauschQuelle(1), 'bandpass', 1800, 1.4);
  // Reiben: tief und matt
  [reibFilter, reibGain] = kette(rauschQuelle(0.5), 'lowpass', 420, 0.8);
  // Strahl: dünnes Zischen
  [strahlFilter, strahlGain] = kette(rauschQuelle(1), 'highpass', 5200, 0.7);
  // Kräfte: A und E, leicht verstimmt
  ton = ctx.createOscillator(); ton.type = 'triangle'; ton.frequency.value = 110;
  ton2 = ctx.createOscillator(); ton2.type = 'sine'; ton2.frequency.value = 164.81;
  tonFilter = ctx.createBiquadFilter(); tonFilter.type = 'lowpass'; tonFilter.frequency.value = 400; tonFilter.Q.value = 2;
  tonGain = ctx.createGain(); tonGain.gain.value = 0;
  const t2 = ctx.createGain(); t2.gain.value = 0.6; ton2.connect(t2); t2.connect(tonFilter);
  ton.connect(tonFilter); tonFilter.connect(tonGain); tonGain.connect(trocken); tonGain.connect(nass); ton.start(); ton2.start();
}

export function klangAn(wert) {
  an = wert;
  if (ctx) haupt.gain.setTargetAtTime(an ? 1 : 0, ctx.currentTime, 0.08);
}
export const klangIstAn = () => an;
export const klangSpur = () => (ctx && an ? ziel.stream.getAudioTracks()[0] || null : null);

function tick(t, f, laut, x, dauer) {
  const q = ctx.createBufferSource(); q.buffer = rausch;
  const fi = ctx.createBiquadFilter(); fi.type = 'bandpass'; fi.frequency.value = f; fi.Q.value = 9;
  const g = ctx.createGain();
  g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(laut, t + 0.002); g.gain.exponentialRampToValueAtTime(0.0003, t + dauer);
  q.connect(fi); fi.connect(g);
  if (ctx.createStereoPanner) { const p = ctx.createStereoPanner(); p.pan.value = Math.max(-1, Math.min(1, (x - 0.5) * 1.4)); g.connect(p); p.connect(trocken); p.connect(nass); }
  else { g.connect(trocken); g.connect(nass); }
  q.start(t, Math.random() * 1.8, dauer + 0.02);
}
// eine Schlaufe des Fadens landet: gross = tiefer
export function klangSchlaufe(gross, x = 0.5) {
  if (!ctx || !an || ctx.state !== 'running') return;
  tick(ctx.currentTime, 900 + 2600 * (1 - Math.min(1, gross)) + Math.random() * 300, 0.05, x, 0.05);
}
// Spritzer: einige Tropfen kurz nacheinander
export function klangSpritzer(n, x = 0.5) {
  if (!ctx || !an || ctx.state !== 'running') return;
  for (let i = 0; i < n; i++) tick(ctx.currentTime + i * 0.012 + Math.random() * 0.02, 1500 + Math.random() * 4000, 0.07, x + (Math.random() - 0.5) * 0.3, 0.035);
}

// je Bild: lesart, tempo (Bildhöhen je Sekunde), reiben (0 bis 1), finger, menge, kraft, werte, dt
export function klangBild({ lesart, tempo, reiben, finger, kraft, werte }) {
  if (!ctx || ctx.state !== 'running') return;
  const t = ctx.currentTime, z = 0.06;
  const v = Math.min(1, tempo / 2.5);
  borstenGain.gain.setTargetAtTime(lesart === 0 && finger ? 0.16 * Math.sqrt(v) * (0.6 + 0.4 * werte[1]) : 0, t, z);
  borstenFilter.frequency.setTargetAtTime(900 + 3400 * v, t, z);
  reibGain.gain.setTargetAtTime(lesart === 0 ? 0.14 * reiben : 0, t, 0.12);
  reibFilter.frequency.setTargetAtTime(260 + 500 * reiben + 120 * Math.sin(t * 7), t, 0.05);
  strahlGain.gain.setTargetAtTime(lesart === 1 && finger ? 0.012 + 0.025 * werte[0] : 0, t, 0.1);
  strahlFilter.frequency.setTargetAtTime(4200 + 3000 * v, t, z);
  if (lesart === 2) {
    tonGain.gain.setTargetAtTime(0.09 * kraft, t, 0.15);
    ton2.frequency.setTargetAtTime(164.81 * (1 + 0.012 * kraft * (0.4 + werte[0])), t, 0.2);
    tonFilter.frequency.setTargetAtTime(260 + 1400 * kraft, t, 0.2);
  } else tonGain.gain.setTargetAtTime(0, t, 0.1);
}
