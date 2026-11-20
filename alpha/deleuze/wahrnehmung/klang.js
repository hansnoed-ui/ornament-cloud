// Klang der Wahrnehmung. Web Audio, alles im Browser.
// Wahrnehmen heisst abziehen, und so klingt es auch: Das Licht ist weisses Rauschen, in dem alle Frequenzen zugleich sind.
// Fest: Wo der Schirm wächst, schliesst sich ein Filter, bis aus dem Rauschen ein einziger Ton übrig bleibt (Subtraktion).
// Flüssig: jeder Tropfen ein kleines, steigendes «Plopp» wie eine Luftblase, darunter leises Wasser.
// Gasförmig: frei gewordene Körner knistern als winzige Klangkörner, verstreut im Raum.

let ctx = null, haupt = null, trocken = null, nass = null, hall = null, ziel = null, rausch = null;
let licht = null, lichtFilter = null, lichtGain = null, ton = null, ton2 = null, tonGain = null, wasserGain = null, wasserFilter = null;
let an = true, kornSchuld = 0;

function hallBauen(sek) {
  const n = Math.round(ctx.sampleRate * sek), ir = ctx.createBuffer(2, n, ctx.sampleRate);
  for (let k = 0; k < 2; k++) {
    const d = ir.getChannelData(k);
    let z = 0;
    for (let i = 0; i < n; i++) { const t = i / n; z += ((Math.random() * 2 - 1) - z) * (0.6 - 0.45 * t); d[i] = z * Math.pow(1 - t, 2.6) * 1.4; }
  }
  hall.buffer = ir;
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
  nass = ctx.createGain(); nass.gain.value = 0.5;
  hall = ctx.createConvolver(); nass.connect(hall); hall.connect(haupt);
  hallBauen(3.8);
  const n = ctx.sampleRate * 2, buf = ctx.createBuffer(1, n, ctx.sampleRate), d = buf.getChannelData(0);
  for (let i = 0; i < n; i++) d[i] = Math.random() * 2 - 1;
  rausch = buf;
  // Licht: Rauschen durch einen Filter, der sich mit dem Schirm schliesst
  licht = ctx.createBufferSource(); licht.buffer = rausch; licht.loop = true;
  lichtFilter = ctx.createBiquadFilter(); lichtFilter.type = 'bandpass'; lichtFilter.frequency.value = 5200; lichtFilter.Q.value = 0.25;
  lichtGain = ctx.createGain(); lichtGain.gain.value = 0;
  licht.connect(lichtFilter); lichtFilter.connect(lichtGain); lichtGain.connect(trocken); lichtGain.connect(nass); licht.start();
  // der Ton, der übrig bleibt: d und a, leicht verstimmt
  ton = ctx.createOscillator(); ton.type = 'sine'; ton.frequency.value = 146.83;
  ton2 = ctx.createOscillator(); ton2.type = 'sine'; ton2.frequency.value = 220.4;
  tonGain = ctx.createGain(); tonGain.gain.value = 0;
  const t2 = ctx.createGain(); t2.gain.value = 0.45; ton2.connect(t2); t2.connect(tonGain);
  ton.connect(tonGain); tonGain.connect(trocken); tonGain.connect(nass); ton.start(); ton2.start();
  // Wasser: tiefes, weiches Rauschen
  const w = ctx.createBufferSource(); w.buffer = rausch; w.loop = true; w.playbackRate.value = 0.5;
  wasserFilter = ctx.createBiquadFilter(); wasserFilter.type = 'lowpass'; wasserFilter.frequency.value = 520; wasserFilter.Q.value = 0.9;
  wasserGain = ctx.createGain(); wasserGain.gain.value = 0;
  w.connect(wasserFilter); wasserFilter.connect(wasserGain); wasserGain.connect(trocken); wasserGain.connect(nass); w.start();
}

export function klangAn(wert) {
  an = wert;
  if (ctx) haupt.gain.setTargetAtTime(an ? 1 : 0, ctx.currentTime, 0.08);
}
export const klangIstAn = () => an;
export const klangSpur = () => (ctx && an ? ziel.stream.getAudioTracks()[0] || null : null);

// ein Tropfen: tiefe 0 bis 1, x 0 bis 1 (links bis rechts)
export function klangTropfen(tiefe, x = 0.5) {
  if (!ctx || !an || ctx.state !== 'running') return;
  const t = ctx.currentTime;
  const o = ctx.createOscillator(); o.type = 'sine';
  const f0 = 520 + Math.random() * 380 - tiefe * 160;
  o.frequency.setValueAtTime(f0, t); o.frequency.exponentialRampToValueAtTime(f0 * (2.1 + Math.random() * 0.5), t + 0.07);
  const g = ctx.createGain();
  g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(0.16 * Math.min(1, tiefe + 0.2), t + 0.004); g.gain.exponentialRampToValueAtTime(0.0004, t + 0.13);
  const p = ctx.createStereoPanner ? ctx.createStereoPanner() : null;
  o.connect(g);
  if (p) { p.pan.value = (x - 0.5) * 1.2; g.connect(p); p.connect(trocken); p.connect(nass); } else { g.connect(trocken); g.connect(nass); }
  o.start(t); o.stop(t + 0.16);
}

// ein winziges Klangkorn (gasförmig)
function korn(t, laut) {
  const q = ctx.createBufferSource(); q.buffer = rausch;
  const f = ctx.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = 2400 + Math.random() * 7000; f.Q.value = 6 + Math.random() * 10;
  const g = ctx.createGain(); const d = 0.006 + Math.random() * 0.018;
  g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(laut, t + 0.001); g.gain.exponentialRampToValueAtTime(0.0003, t + d);
  q.connect(f); f.connect(g);
  if (ctx.createStereoPanner) { const p = ctx.createStereoPanner(); p.pan.value = Math.random() * 2 - 1; g.connect(p); p.connect(trocken); p.connect(nass); }
  else { g.connect(trocken); g.connect(nass); }
  q.start(t, Math.random() * 1.8, d + 0.01);
}

// je Bild: lesart, menge (Schirm, Wellen oder Freiheit, 0 bis 1), finger, werte, dt
export function klangBild({ lesart, menge, finger, werte, dt }) {
  if (!ctx || ctx.state !== 'running') return;
  const t = ctx.currentTime, z = 0.12;
  if (lesart === 0) {
    // ohne Schirm: offenes, helles Rauschen (alle Bilder zugleich); mit Schirm: der Filter schliesst sich auf den Ton
    const m = Math.min(1, menge * 1.3);
    lichtGain.gain.setTargetAtTime((0.05 + 0.03 * werte[0]) * (1 - 0.85 * m), t, z);
    lichtFilter.frequency.setTargetAtTime(5200 * Math.pow(146.83 / 5200, m), t, z);
    lichtFilter.Q.setTargetAtTime(0.25 + 24 * m * m, t, z);
    tonGain.gain.setTargetAtTime(0.11 * m * (0.6 + 0.4 * werte[1]), t, z);
  } else {
    lichtGain.gain.setTargetAtTime(0, t, z); tonGain.gain.setTargetAtTime(0, t, z);
  }
  wasserGain.gain.setTargetAtTime(lesart === 1 ? 0.04 + 0.12 * menge : 0, t, 0.3);
  if (lesart === 1) wasserFilter.frequency.setTargetAtTime(380 + 900 * menge, t, 0.2);
  if (lesart === 2 && an) {
    // so viele Körner je Sekunde, wie frei sind; höchstens sechs je Bild
    kornSchuld += dt * (menge * 140 + (finger ? 10 : 0));
    let n = 0;
    while (kornSchuld >= 1 && n < 6) { korn(t + Math.random() * dt, 0.05 + 0.08 * Math.random()); kornSchuld -= 1; n++; }
    if (kornSchuld > 6) kornSchuld = 0;
  } else kornSchuld = 0;
}
