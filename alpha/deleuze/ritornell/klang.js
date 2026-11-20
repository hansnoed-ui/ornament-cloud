// Klang des Ritornells. Web Audio, alles im Browser, nichts geladen. Beginnt erst mit der ersten Berührung.
// Summen: eine gesummte Kinderstimme (Sägezahn durch Formanten eines geschlossenen «m»), das alte Spottlied sol sol mi la sol mi,
//   gleitet von Ton zu Ton wie ein Kind, das sich Mut macht. Darunter das Milieu: ein dunkles Rauschen, das zurückweicht, wo gesungen wird.
// Revier: jede Marke ein Schlag auf ein kleines Holz- oder Metallstück (Grundton, Obertöne, ein Klick), links und rechts im Raum,
//   mit einem Echo im Takt: die Wiederholung, die das Revier macht.
// Kosmos: die Obertonreihe über einem tiefen Grundton, langsam atmend, und der Refrain eine Oktave höher als Glas, weit im Hall.

let ctx = null, haupt = null, trocken = null, nass = null, hall = null, ziel = null, rausch = null, echo = null, echoRueck = null, echoGain = null;
let stimme = null, stimme2 = null, stimmeGain = null, stimmeTief = null, vibrato = null, vibratoTiefe = null, formanten = [], atemGain = null;
let milieuGain = null, milieuFilter = null, windGain = null, windFilter = null;
let kosmos = [], kosmosGain = null, kosmosFilter = null;
let an = true;

function hallBauen(sek) {
  const n = Math.round(ctx.sampleRate * sek), ir = ctx.createBuffer(2, n, ctx.sampleRate);
  for (let k = 0; k < 2; k++) {
    const d = ir.getChannelData(k);
    let z = 0;
    for (let i = 0; i < n; i++) {
      const t = i / n;
      z += ((Math.random() * 2 - 1) - z) * (0.7 - 0.55 * t);          // je später, desto dunkler
      const frueh = i < ctx.sampleRate * 0.08 && Math.random() < 0.004 ? (Math.random() * 2 - 1) * 0.9 : 0;   // erste Reflexionen
      d[i] = (z * Math.pow(1 - t, 3.0) + frueh) * 1.2;
    }
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
  const begrenzer = ctx.createDynamicsCompressor(); begrenzer.threshold.value = -14; begrenzer.ratio.value = 4; begrenzer.attack.value = 0.008; begrenzer.release.value = 0.25;
  haupt.connect(begrenzer); begrenzer.connect(ctx.destination);
  ziel = ctx.createMediaStreamDestination(); begrenzer.connect(ziel);
  trocken = ctx.createGain(); trocken.gain.value = 0.85; trocken.connect(haupt);
  nass = ctx.createGain(); nass.gain.value = 0.5;
  hall = ctx.createConvolver(); nass.connect(hall); hall.connect(haupt);
  hallBauen(3.8);
  // Echo im Takt (die Zeit setzt das Revier), mit Rückkopplung durch einen Tiefpass: jede Wiederholung etwas dunkler
  echo = ctx.createDelay(2); echo.delayTime.value = 0.45;
  echoRueck = ctx.createGain(); echoRueck.gain.value = 0.38;
  const echoTon = ctx.createBiquadFilter(); echoTon.type = 'lowpass'; echoTon.frequency.value = 2400;
  echoGain = ctx.createGain(); echoGain.gain.value = 0.0;
  echoGain.connect(echo); echo.connect(echoTon); echoTon.connect(echoRueck); echoRueck.connect(echo);
  echoTon.connect(trocken); echoTon.connect(nass);

  const n = ctx.sampleRate * 2, buf = ctx.createBuffer(1, n, ctx.sampleRate), d = buf.getChannelData(0);
  let braun = 0;
  for (let i = 0; i < n; i++) { const w = Math.random() * 2 - 1; braun = (braun + 0.02 * w) / 1.02; d[i] = i % 2 ? w : braun * 3.5; }
  rausch = buf;

  // das Milieu: tiefes Grollen und ein hoher Wind, beide sehr leise
  milieuFilter = ctx.createBiquadFilter(); milieuFilter.type = 'lowpass'; milieuFilter.frequency.value = 160; milieuFilter.Q.value = 0.7;
  milieuGain = ctx.createGain(); milieuGain.gain.value = 0;
  rauschQuelle(0.5).connect(milieuFilter); milieuFilter.connect(milieuGain); milieuGain.connect(trocken); milieuGain.connect(nass);
  windFilter = ctx.createBiquadFilter(); windFilter.type = 'bandpass'; windFilter.frequency.value = 900; windFilter.Q.value = 3;
  windGain = ctx.createGain(); windGain.gain.value = 0;
  rauschQuelle(1).connect(windFilter); windFilter.connect(windGain); windGain.connect(nass);

  // die Stimme: zwei leicht verstimmte Sägezähne, Vibrato, durch die Formanten eines gesummten «m» (Nasal: tief, dazu ein schwacher hoher)
  stimme = ctx.createOscillator(); stimme.type = 'sawtooth'; stimme.frequency.value = 392;
  stimme2 = ctx.createOscillator(); stimme2.type = 'triangle'; stimme2.frequency.value = 392; stimme2.detune.value = 7;
  vibrato = ctx.createOscillator(); vibrato.frequency.value = 5.2;
  vibratoTiefe = ctx.createGain(); vibratoTiefe.gain.value = 3.5; vibrato.connect(vibratoTiefe); vibratoTiefe.connect(stimme.frequency); vibratoTiefe.connect(stimme2.frequency); vibrato.start();
  stimmeTief = ctx.createBiquadFilter(); stimmeTief.type = 'lowpass'; stimmeTief.frequency.value = 1400; stimmeTief.Q.value = 0.5;
  stimmeGain = ctx.createGain(); stimmeGain.gain.value = 0;
  const mischer = ctx.createGain(); mischer.gain.value = 1;
  stimme.connect(mischer); const g2 = ctx.createGain(); g2.gain.value = 0.6; stimme2.connect(g2); g2.connect(mischer);
  for (const [f, q, l] of [[280, 5, 1.0], [1100, 8, 0.18], [2600, 10, 0.07]]) {
    const fi = ctx.createBiquadFilter(); fi.type = 'bandpass'; fi.frequency.value = f; fi.Q.value = q;
    const g = ctx.createGain(); g.gain.value = l; mischer.connect(fi); fi.connect(g); g.connect(stimmeTief);
    formanten.push([fi, f]);
  }
  const atem = rauschQuelle(1), af = ctx.createBiquadFilter(); af.type = 'bandpass'; af.frequency.value = 1500; af.Q.value = 0.8;
  atemGain = ctx.createGain(); atemGain.gain.value = 0.25; atem.connect(af); af.connect(atemGain); atemGain.connect(stimmeTief);
  stimmeTief.connect(stimmeGain); stimmeGain.connect(trocken); stimmeGain.connect(nass);
  const sEcho = ctx.createGain(); sEcho.gain.value = 0.35; stimmeGain.connect(sEcho); sEcho.connect(echoGain);
  stimme.start(); stimme2.start();

  // der Kosmos: Obertonreihe über G (49 Hz), jeder Teilton atmet in seinem eigenen Takt
  kosmosFilter = ctx.createBiquadFilter(); kosmosFilter.type = 'lowpass'; kosmosFilter.frequency.value = 600; kosmosFilter.Q.value = 0.4;
  kosmosGain = ctx.createGain(); kosmosGain.gain.value = 0;
  kosmosFilter.connect(kosmosGain); kosmosGain.connect(trocken); kosmosGain.connect(nass);
  for (let k = 1; k <= 12; k++) {
    const o = ctx.createOscillator(); o.type = 'sine'; o.frequency.value = 49 * k * (1 + (k > 6 ? (k - 6) * 0.0009 : 0));
    const g = ctx.createGain(); g.gain.value = 0.32 / Math.pow(k, 0.8);
    const lfo = ctx.createOscillator(); lfo.frequency.value = 0.05 + 0.031 * k;
    const lt = ctx.createGain(); lt.gain.value = 0.3 / Math.pow(k, 0.8); lfo.connect(lt); lt.connect(g.gain);
    const p = ctx.createStereoPanner ? ctx.createStereoPanner() : null;
    o.connect(g); if (p) { p.pan.value = Math.sin(k * 2.4) * 0.7; g.connect(p); p.connect(kosmosFilter); } else g.connect(kosmosFilter);
    o.start(); lfo.start();
    kosmos.push(g);
  }
}

export function klangAn(wert) {
  an = wert;
  if (ctx) haupt.gain.setTargetAtTime(an ? 1 : 0, ctx.currentTime, 0.08);
}
export const klangIstAn = () => an;
export const klangSpur = () => (ctx && an ? ziel.stream.getAudioTracks()[0] || null : null);
export const klangLaeuft = () => !!ctx && ctx.state === 'running';

// die Stimme gleitet zum nächsten Ton (in Hz); ein kleiner Akzent beim Ansatz
export function klangSummen(f, staerke) {
  if (!ctx || ctx.state !== 'running') return;
  const t = ctx.currentTime;
  stimme.frequency.cancelScheduledValues(t); stimme2.frequency.cancelScheduledValues(t);
  stimme.frequency.setTargetAtTime(f, t, 0.035); stimme2.frequency.setTargetAtTime(f, t, 0.035);
  for (const [fi, f0] of formanten) fi.frequency.setTargetAtTime(f0 * (0.92 + 0.16 * Math.min(1, f / 700)), t, 0.08);
  if (staerke > 0.05) {
    const g = stimmeGain.gain; g.cancelScheduledValues(t);
    g.setValueAtTime(g.value, t); g.linearRampToValueAtTime(0.11 * staerke, t + 0.03); g.setTargetAtTime(0.075 * staerke, t + 0.04, 0.12);
  }
}

// ein Schlag: Holz oder Metall, f in Hz, pan −1…1, hell 0…1 (wie viel Metall)
export function klangSchlag(f, pan = 0, laut = 1, hell = 0.4) {
  if (!ctx || ctx.state !== 'running' || !an) return;
  const t = ctx.currentTime + 0.005;
  const p = ctx.createStereoPanner ? ctx.createStereoPanner() : ctx.createGain();
  if (p.pan) p.pan.value = Math.max(-1, Math.min(1, pan));
  p.connect(trocken); p.connect(nass);
  const pe = ctx.createGain(); pe.gain.value = 0.5; p.connect(pe); pe.connect(echoGain);
  // Teiltöne eines Stabes (Marimba: 1, 4, 9.2; Metall dazu 2.76 und 5.4), jeder klingt kürzer
  const teile = [[1, 1, 1.6], [3.93, 0.32 * (1 - hell * 0.5), 0.35], [9.2, 0.08, 0.12], [2.76, 0.28 * hell, 1.1], [5.4, 0.16 * hell, 0.6]];
  for (const [m, l, dauer] of teile) {
    if (l <= 0.001 || f * m > 16000) continue;
    const o = ctx.createOscillator(); o.type = 'sine'; o.frequency.value = f * m;
    const g = ctx.createGain(); g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(0.12 * l * laut, t + 0.004); g.gain.exponentialRampToValueAtTime(0.0001, t + dauer * (0.6 + 0.8 * hell));
    o.connect(g); g.connect(p); o.start(t); o.stop(t + 2.4);
  }
  // der Klick des Schlegels
  const q = rauschQuelle(1.4), fi = ctx.createBiquadFilter(); fi.type = 'bandpass'; fi.frequency.value = Math.min(9000, f * 6); fi.Q.value = 1.5;
  const g = ctx.createGain(); g.gain.setValueAtTime(0.05 * laut, t); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.03);
  q.connect(fi); fi.connect(g); g.connect(p); q.stop(t + 0.1);
  setTimeout(() => { try { p.disconnect(); } catch {} }, 3000);
}

// eine Glasglocke für den Kosmos: reiner Ton mit leicht verstimmter Schwebung, sehr lang
export function klangGlas(f, laut = 1) {
  if (!ctx || ctx.state !== 'running' || !an) return;
  const t = ctx.currentTime + 0.005;
  const g = ctx.createGain(); g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(0.06 * laut, t + 0.02); g.gain.exponentialRampToValueAtTime(0.0001, t + 4.5);
  const n2 = ctx.createGain(); n2.gain.value = 1.4; g.connect(trocken); g.connect(n2); n2.connect(nass);
  for (const [m, l] of [[1, 1], [1.0035, 0.8], [2.0, 0.25], [3.01, 0.08]]) {
    const o = ctx.createOscillator(); o.type = 'sine'; o.frequency.value = f * m;
    const gg = ctx.createGain(); gg.gain.value = l; o.connect(gg); gg.connect(g); o.start(t); o.stop(t + 4.6);
  }
}

// je Bild: wie viel Stimme, Milieu, Kosmos; das Echo im Takt
export function klangBild({ summen, nacht, ordnung, kosmos: kos, echoZeit, echoMenge, bewegung }) {
  if (!ctx || ctx.state !== 'running') return;
  const t = ctx.currentTime;
  if (summen <= 0.02) stimmeGain.gain.setTargetAtTime(0, t, 0.35);
  atemGain.gain.setTargetAtTime(0.18 + 0.2 * summen, t, 0.2);
  vibratoTiefe.gain.setTargetAtTime(2.5 + 3.5 * summen, t, 0.3);
  const m = nacht * (1 - 0.8 * ordnung);
  milieuGain.gain.setTargetAtTime(0.16 * m, t, 0.5);
  milieuFilter.frequency.setTargetAtTime(110 + 140 * m + 200 * bewegung, t, 0.3);
  windGain.gain.setTargetAtTime(0.05 * m * (0.4 + bewegung), t, 0.4);
  windFilter.frequency.setTargetAtTime(600 + 900 * m + 900 * bewegung, t, 0.4);
  kosmosGain.gain.setTargetAtTime(0.12 * kos, t, 0.7);
  kosmosFilter.frequency.setTargetAtTime(300 + 2600 * kos, t, 0.9);
  if (echoZeit) echo.delayTime.setTargetAtTime(Math.min(1.9, echoZeit), t, 0.2);
  echoGain.gain.setTargetAtTime(echoMenge, t, 0.3);
}
