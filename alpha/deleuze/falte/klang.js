// Klang der Falte. Web Audio, alles im Browser, nichts geladen. Beginnt erst mit der ersten Berührung.
// Rauschen: das Meer bei Leibniz, aus vielen kleinen Geräuschen; eine Dünung, die heranrollt und sich bricht. Je länger der Daumen
//   liegt, desto enger werden Resonanzen in diesem Rauschen (D-Dur, wie eine Orgel im Wasser), und an der Schwelle tritt der Klang
//   rein hervor. Lässt man los, sinkt er ins Rauschen zurück.
// Draperie: das Rascheln von schwerem Stoff, so laut, wie er sich bewegt; darunter ein tiefer Continuo-Grund (Gambe auf D und A),
//   der mit der Tiefe der Falten wächst; ein weicher Fall, wenn die Hand loslässt.
// Entfalten: Papier knistert beim Falten, jeder Falz ein Knick; die Farbe giesst sich als Schwall über das Paket und tropft;
//   jede Falte, die sich öffnet, ein Cembaloton, aufsteigend, zuletzt ein Akkord.

let ctx = null, haupt = null, trocken = null, nass = null, hall = null, ziel = null, rausch = null;
let meerGain = null, meerFilter = null, gischtGain = null, gischtFilter = null, resoGain = null, resos = [], reinGain = null;
let stoffGain = null, stoffFilter = null, stoffTief = null, stoffTiefGain = null, gambeGain = null, gambeFilter = null;
let papierGain = null, papierFilter = null;
let an = true;
const AKKORD = [146.83, 185.0, 220.0, 293.66, 369.99, 440.0];   // D-Dur über d

function hallBauen(sek, z = hall) {
  const n = Math.round(ctx.sampleRate * sek), ir = ctx.createBuffer(2, n, ctx.sampleRate);
  for (let k = 0; k < 2; k++) {
    const d = ir.getChannelData(k);
    let w = 0;
    for (let i = 0; i < n; i++) {
      const t = i / n;
      w += ((Math.random() * 2 - 1) - w) * (0.7 - 0.55 * t);          // je später, desto dunkler
      const frueh = i < ctx.sampleRate * 0.08 && Math.random() < 0.004 ? (Math.random() * 2 - 1) * 0.9 : 0;
      d[i] = (w * Math.pow(1 - t, 3.0) + frueh) * 1.2;
    }
  }
  z.buffer = ir;
}
function rauschQuelle(rate = 1) {
  const q = ctx.createBufferSource(); q.buffer = rausch; q.loop = true; q.playbackRate.value = rate; q.start(0, Math.random() * 1.5); return q;
}
const panner = (pan) => { const p = ctx.createStereoPanner ? ctx.createStereoPanner() : ctx.createGain(); if (p.pan) p.pan.value = Math.max(-1, Math.min(1, pan)); return p; };

// muss aus einer Berührung heraus aufgerufen werden (Autoplay-Regeln)
export function klangStarten() {
  if (ctx) { if (ctx.state === 'suspended') ctx.resume(); return; }
  const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return;
  ctx = new AC();
  haupt = ctx.createGain(); haupt.gain.value = an ? 1 : 0;
  const begrenzer = ctx.createDynamicsCompressor(); begrenzer.threshold.value = -14; begrenzer.ratio.value = 4; begrenzer.attack.value = 0.008; begrenzer.release.value = 0.25;
  haupt.connect(begrenzer); begrenzer.connect(ctx.destination);
  ziel = ctx.createMediaStreamDestination(); begrenzer.connect(ziel);
  trocken = ctx.createGain(); trocken.gain.value = 0.85; trocken.connect(haupt);
  nass = ctx.createGain(); nass.gain.value = 0.5;
  hall = ctx.createConvolver(); nass.connect(hall); hall.connect(haupt);
  hallBauen(4.2);

  // zwei Sekunden Rauschen, abwechselnd weiss und braun (wie im Ritornell)
  const n = ctx.sampleRate * 2, buf = ctx.createBuffer(1, n, ctx.sampleRate), d = buf.getChannelData(0);
  let braun = 0;
  for (let i = 0; i < n; i++) { const w = Math.random() * 2 - 1; braun = (braun + 0.02 * w) / 1.02; d[i] = i % 2 ? w : braun * 3.5; }
  rausch = buf;

  // ----- das Meer -----
  meerFilter = ctx.createBiquadFilter(); meerFilter.type = 'lowpass'; meerFilter.frequency.value = 500; meerFilter.Q.value = 0.5;
  meerGain = ctx.createGain(); meerGain.gain.value = 0;
  const ml = rauschQuelle(0.9), mr = rauschQuelle(1.03), pl = panner(-0.6), pr = panner(0.6);
  ml.connect(pl); mr.connect(pr); pl.connect(meerFilter); pr.connect(meerFilter);
  meerFilter.connect(meerGain); meerGain.connect(trocken); meerGain.connect(nass);
  gischtFilter = ctx.createBiquadFilter(); gischtFilter.type = 'highpass'; gischtFilter.frequency.value = 3200;
  gischtGain = ctx.createGain(); gischtGain.gain.value = 0;
  rauschQuelle(1).connect(gischtFilter); gischtFilter.connect(gischtGain); gischtGain.connect(nass); gischtGain.connect(trocken);
  // die Resonanzen im Rauschen: je enger, desto mehr Klang und weniger Wasser
  resoGain = ctx.createGain(); resoGain.gain.value = 0;
  const resoQ = rauschQuelle(1.0);
  AKKORD.forEach((f, i) => {
    const b = ctx.createBiquadFilter(); b.type = 'bandpass'; b.frequency.value = f; b.Q.value = 3;
    const g = ctx.createGain(); g.gain.value = 1; const p = panner(Math.sin(i * 2.1) * 0.6);
    resoQ.connect(b); b.connect(g); g.connect(p); p.connect(resoGain);
    resos.push([b, g]);
  });
  resoGain.connect(trocken); resoGain.connect(nass);
  // der reine Klang über der Schwelle: Sinus und Dreieck, leicht schwebend
  reinGain = ctx.createGain(); reinGain.gain.value = 0;
  const reinFilter = ctx.createBiquadFilter(); reinFilter.type = 'lowpass'; reinFilter.frequency.value = 2400;
  AKKORD.forEach((f, i) => {
    for (const [typ, det, l] of [['sine', 0, 1], ['triangle', 4, 0.35]]) {
      const o = ctx.createOscillator(); o.type = typ; o.frequency.value = f; o.detune.value = det + (i % 2 ? -3 : 3);
      const g = ctx.createGain(); g.gain.value = 0.11 * l / (1 + i * 0.25); const p = panner(Math.cos(i * 1.7) * 0.5);
      o.connect(g); g.connect(p); p.connect(reinFilter); o.start();
    }
  });
  reinFilter.connect(reinGain); reinGain.connect(trocken); reinGain.connect(nass);

  // ----- der Stoff -----
  stoffFilter = ctx.createBiquadFilter(); stoffFilter.type = 'bandpass'; stoffFilter.frequency.value = 2600; stoffFilter.Q.value = 0.7;
  stoffGain = ctx.createGain(); stoffGain.gain.value = 0;
  rauschQuelle(1.1).connect(stoffFilter); stoffFilter.connect(stoffGain); stoffGain.connect(trocken); stoffGain.connect(nass);
  stoffTief = ctx.createBiquadFilter(); stoffTief.type = 'lowpass'; stoffTief.frequency.value = 380;
  stoffTiefGain = ctx.createGain(); stoffTiefGain.gain.value = 0;
  rauschQuelle(0.7).connect(stoffTief); stoffTief.connect(stoffTiefGain); stoffTiefGain.connect(trocken);
  // die Gambe: zwei Sägezähne auf D und A, ein langsames Vibrato, dunkel gefiltert
  gambeFilter = ctx.createBiquadFilter(); gambeFilter.type = 'lowpass'; gambeFilter.frequency.value = 300; gambeFilter.Q.value = 1.2;
  gambeGain = ctx.createGain(); gambeGain.gain.value = 0;
  const vib = ctx.createOscillator(); vib.frequency.value = 4.6; const vibT = ctx.createGain(); vibT.gain.value = 0.35; vib.connect(vibT); vib.start();
  for (const [f, l] of [[73.42, 1], [110.0, 0.55], [146.83, 0.25]]) {
    const o = ctx.createOscillator(); o.type = 'sawtooth'; o.frequency.value = f; vibT.connect(o.frequency);
    const g = ctx.createGain(); g.gain.value = 0.07 * l; o.connect(g); g.connect(gambeFilter); o.start();
  }
  gambeFilter.connect(gambeGain); gambeGain.connect(trocken); gambeGain.connect(nass);

  // ----- das Papier -----
  papierFilter = ctx.createBiquadFilter(); papierFilter.type = 'highpass'; papierFilter.frequency.value = 2800;
  papierGain = ctx.createGain(); papierGain.gain.value = 0;
  rauschQuelle(1.3).connect(papierFilter); papierFilter.connect(papierGain); papierGain.connect(trocken); papierGain.connect(nass);
}

export function klangAn(wert) {
  an = wert;
  if (ctx) haupt.gain.setTargetAtTime(an ? 1 : 0, ctx.currentTime, 0.08);
}
export const klangIstAn = () => an;
export const klangSpur = () => (ctx && an ? ziel.stream.getAudioTracks()[0] || null : null);

// die Schwelle: ein heller Anschlag, dann trägt der reine Akkord
export function klangSprung() {
  if (!ctx || ctx.state !== 'running' || !an) return;
  const t = ctx.currentTime + 0.005;
  const p = panner(0); p.connect(trocken); p.connect(nass);
  for (const [f, l, dauer] of [[587.33, 1, 3.4], [880, 0.5, 2.6], [1174.66, 0.28, 2.0], [1760, 0.12, 1.2]]) {
    for (const d of [0, 1.1]) {
      const o = ctx.createOscillator(); o.type = 'sine'; o.frequency.value = f + d;
      const g = ctx.createGain(); g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(0.045 * l, t + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, t + dauer);
      o.connect(g); g.connect(p); o.start(t); o.stop(t + dauer + 0.1);
    }
  }
  setTimeout(() => { try { p.disconnect(); } catch {} }, 4000);
}

// ein kurzer Rauschstoss, gefiltert, mit Hüllkurve (für Knick, Fall, Guss)
function stoss(t, { typ = 'bandpass', f = 1000, q = 1, laut = 0.1, an: a = 0.004, dauer = 0.2, rate = 1, pan = 0, hall: h = true, fBis = 0 }) {
  const quelle = rauschQuelle(rate), fi = ctx.createBiquadFilter(); fi.type = typ; fi.frequency.value = f; fi.Q.value = q;
  if (fBis) fi.frequency.exponentialRampToValueAtTime(fBis, t + dauer);
  const g = ctx.createGain(); g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(laut, t + a); g.gain.exponentialRampToValueAtTime(0.0001, t + a + dauer);
  const p = panner(pan);
  quelle.connect(fi); fi.connect(g); g.connect(p); p.connect(trocken); if (h) p.connect(nass);
  quelle.stop(t + a + dauer + 0.1);
  setTimeout(() => { try { p.disconnect(); } catch {} }, (a + dauer) * 1000 + 600);
}
// ein tiefer, weicher Ton (der Körper eines Knicks oder Falls)
function dumpf(t, f, laut, dauer) {
  const o = ctx.createOscillator(); o.type = 'sine'; o.frequency.setValueAtTime(f * 1.4, t); o.frequency.exponentialRampToValueAtTime(f, t + 0.05);
  const g = ctx.createGain(); g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(laut, t + 0.006); g.gain.exponentialRampToValueAtTime(0.0001, t + dauer);
  o.connect(g); g.connect(trocken); o.start(t); o.stop(t + dauer + 0.05);
}

// ein Falz: das Papier knickt
export function klangKnick(nr = 1) {
  if (!ctx || ctx.state !== 'running' || !an) return;
  const t = ctx.currentTime + 0.005;
  stoss(t, { typ: 'highpass', f: 2400, laut: 0.16, an: 0.002, dauer: 0.05, rate: 1.4, pan: (nr % 2 ? -0.3 : 0.3) });
  stoss(t + 0.012, { typ: 'bandpass', f: 900, q: 2, laut: 0.06, dauer: 0.09 });
  dumpf(t, 120 + nr * 8, 0.09, 0.16);
}
// das Tuch fällt aus der Hand
export function klangFall(staerke = 1) {
  if (!ctx || ctx.state !== 'running' || !an || staerke < 0.05) return;
  const t = ctx.currentTime + 0.005;
  stoss(t, { typ: 'lowpass', f: 900, q: 0.6, laut: 0.1 * staerke, an: 0.04, dauer: 0.5, rate: 0.8, fBis: 260 });
  dumpf(t + 0.03, 62, 0.07 * staerke, 0.5);
}
// das Bild giesst sich über das Paket: ein Schwall, der sich öffnet und verebbt
export function klangGiessen() {
  if (!ctx || ctx.state !== 'running' || !an) return;
  const t = ctx.currentTime + 0.005;
  stoss(t, { typ: 'lowpass', f: 220, q: 0.8, laut: 0.12, an: 0.35, dauer: 1.1, rate: 0.9, fBis: 1800 });
  stoss(t + 0.2, { typ: 'bandpass', f: 1400, q: 0.6, laut: 0.04, an: 0.3, dauer: 0.9, rate: 1.2, pan: 0.4 });
  // die Farbe tropft vom Paket: kleine Blasen, deren Ton steigt (so klingt ein Tropfen, der ins Nasse fällt)
  for (let i = 0; i < 11; i++) tropfen(t + 0.35 + Math.pow(Math.random(), 0.7) * 1.3, 700 + Math.random() * 900, 0.5 + 0.5 * Math.random(), Math.random() * 1.4 - 0.7);
}
function tropfen(t, f, laut, pan) {
  const o = ctx.createOscillator(); o.type = 'sine';
  o.frequency.setValueAtTime(f, t); o.frequency.exponentialRampToValueAtTime(f * 2.2, t + 0.05);
  const g = ctx.createGain(); g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(0.035 * laut, t + 0.004); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.07);
  const p = panner(pan); o.connect(g); g.connect(p); p.connect(trocken); p.connect(nass);
  o.start(t); o.stop(t + 0.1);
  setTimeout(() => { try { p.disconnect(); } catch {} }, (t - ctx.currentTime) * 1000 + 600);
}
// eine Klappe hebt sich: ein Luftzug, so lange sie steht
export function klangHeben() {
  if (!ctx || ctx.state !== 'running' || !an) return;
  const t = ctx.currentTime + 0.005;
  stoss(t, { typ: 'bandpass', f: 400, q: 0.7, laut: 0.05, an: 0.3, dauer: 0.6, rate: 0.9, fBis: 1500 });
}
// eine Falte öffnet sich: ein Wisch Papier und ein Cembaloton; zuletzt ein Akkord
const AUF = [587.33, 493.88, 440.0, 369.99, 293.66];
export function klangAuf(rest = 0, letzte = false) {
  if (!ctx || ctx.state !== 'running' || !an) return;
  const t = ctx.currentTime + 0.005;
  const toene = letzte ? [146.83, 220.0, 293.66, 369.99, 440.0] : [AUF[Math.min(AUF.length - 1, rest)]];
  toene.forEach((f, i) => cembalo(t + (letzte ? i * 0.045 : 0), f, letzte ? 0.75 : 1, letzte ? (i - 2) * 0.25 : 0));
}
// Cembalo: gezupfte Saite, viele Teiltöne, die hohen verklingen zuerst; ein Kiel-Klick zu Beginn
function cembalo(t, f, laut = 1, pan = 0) {
  const p = panner(pan); p.connect(trocken); p.connect(nass);
  for (let k = 1; k <= 9; k++) {
    if (f * k > 12000) break;
    const o = ctx.createOscillator(); o.type = 'sine'; o.frequency.value = f * k * (1 + 0.0004 * k * k);
    const l = (k === 1 ? 0.55 : 0.5 / Math.pow(k, 0.9)) * (k % 4 === 0 ? 0.5 : 1);
    const dauer = 2.6 / Math.pow(k, 0.55);
    const g = ctx.createGain(); g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(0.06 * l * laut, t + 0.003); g.gain.exponentialRampToValueAtTime(0.0001, t + dauer);
    o.connect(g); g.connect(p); o.start(t); o.stop(t + dauer + 0.05);
  }
  stoss(t, { typ: 'highpass', f: 4000, laut: 0.03 * laut, an: 0.001, dauer: 0.015, hall: false, pan });
  setTimeout(() => { try { p.disconnect(); } catch {} }, 3200);
}

// je Bild: Meer, Resonanz, reiner Klang; Stoff und Gambe; Papier
export function klangBild({ meer = 0, zug = 0, klar = 0, welle = 0.5, rascheln = 0, tiefe = 0, glanz = 0.5, papier = 0, t: zeit = 0 }) {
  if (!ctx || ctx.state !== 'running') return;
  const t = ctx.currentTime;
  // die Dünung: Wellen von ungleicher Länge, jede bricht und verebbt
  const w = 0.5 + 0.5 * Math.sin(zeit * (0.55 + 0.3 * welle) + 1.3 * Math.sin(zeit * 0.21));
  const brand = Math.pow(w, 3);
  const wasser = meer * (1 - 0.75 * zug) * (1 - 0.6 * klar);
  meerGain.gain.setTargetAtTime(0.2 * wasser * (0.45 + 0.55 * w), t, 0.25);
  meerFilter.frequency.setTargetAtTime(260 + 1300 * brand * (0.5 + welle), t, 0.3);
  gischtGain.gain.setTargetAtTime(0.03 * wasser * brand, t, 0.2);
  // die kleinen Wahrnehmungen ordnen sich: die Resonanzen werden enger und tragen
  const Q = 3 + 120 * zug * zug;
  for (const [b] of resos) b.Q.setTargetAtTime(Q, t, 0.3);
  resoGain.gain.setTargetAtTime(meer * zug * (1 - 0.7 * klar) * 0.12 * Math.sqrt(Q / 3) * 0.55, t, 0.3);
  reinGain.gain.setTargetAtTime(0.32 * klar * meer, t, klar > 0.5 ? 0.25 : 0.9);
  // Stoff
  // Seide raschelt hell und knisternd, Samt dumpf und weich
  stoffGain.gain.setTargetAtTime(0.09 * Math.pow(rascheln, 0.8) * (0.6 + 0.6 * glanz), t, 0.06);
  stoffFilter.frequency.setTargetAtTime((900 + 2600 * glanz) * (0.8 + 0.5 * rascheln), t, 0.1);
  stoffFilter.Q.setTargetAtTime(0.5 + 1.2 * glanz, t, 0.2);
  stoffTiefGain.gain.setTargetAtTime(0.12 * rascheln, t, 0.08);
  gambeGain.gain.setTargetAtTime(0.5 * tiefe, t, 0.9);
  gambeFilter.frequency.setTargetAtTime(220 + 700 * tiefe, t, 0.8);
  // Papier: es knistert unregelmässig, so lange gefaltet wird
  const knistern = papier > 0.01 ? (0.4 + 0.6 * Math.random()) * (Math.random() < 0.3 ? 1.8 : 0.6) : 0;
  papierGain.gain.setTargetAtTime(0.08 * Math.min(1, papier * 2.2) * knistern, t, 0.02);
}
