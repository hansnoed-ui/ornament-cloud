// Klang der Schichten der Zeit: ein tiefer Grund aus Erde und Bordun, der dunkler wird, je tiefer gegraben ist.
// Web Audio, alles im Browser. Graben körnt wie Erde unter der Hand; wer eine Schichtgrenze überschreitet,
// hört einen Stein, jede Schicht einen Ton tiefer. Im Kegel klingt jede neue Schicht wie eine ferne Glocke,
// in der Überschiebung grollt es, wenn die Schichten gleiten. Die Zeittiefe ist die Länge von Hall und Echo.

const STUFEN = [0, 3, 5, 7, 10, 12, 15, 17, 19, 22, 24, 27, 29, 31];   // Moll-Pentatonik, abwärts gelesen
const GRUND = 220;                                                     // a, die Oberfläche

let ctx = null, haupt = null, trocken = null, nass = null, hall = null, echo = null, echoRueck = null, ziel = null;
let rauschen = null, erdeGain = null, erdeFilter = null, bordun = null, bordunFilter = null, grollen = null, grollenGain = null;
let an = true, hallLaenge = 0, hallUhr = 0, letzteTiefe = -1, koerner = [], steine = [];

function hallBauen(sek) {
  const n = Math.round(ctx.sampleRate * sek), ir = ctx.createBuffer(2, n, ctx.sampleRate);
  for (let k = 0; k < 2; k++) {
    const d = ir.getChannelData(k);
    // dunkler Raum: der Nachhall verliert die Höhen schneller als die Tiefen (einfacher Tiefpass im Rauschen)
    let z = 0;
    for (let i = 0; i < n; i++) { const t = i / n; z += ((Math.random() * 2 - 1) - z) * (0.5 - 0.4 * t); d[i] = z * Math.pow(1 - t, 2.2) * 1.6; }
  }
  hall.buffer = ir; hallLaenge = sek;
}

// muss aus einer Berührung heraus aufgerufen werden (Autoplay-Regeln)
export function klangStarten() {
  if (ctx) { if (ctx.state === 'suspended') ctx.resume(); return; }
  const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return;
  ctx = new AC();
  haupt = ctx.createGain(); haupt.gain.value = 0;
  const begrenzer = ctx.createDynamicsCompressor(); begrenzer.threshold.value = -18; begrenzer.ratio.value = 6;
  haupt.connect(begrenzer); begrenzer.connect(ctx.destination);
  ziel = ctx.createMediaStreamDestination(); begrenzer.connect(ziel);
  trocken = ctx.createGain(); trocken.gain.value = 0.75; trocken.connect(haupt);
  nass = ctx.createGain(); nass.gain.value = 0.45;
  hall = ctx.createConvolver(); nass.connect(hall); hall.connect(haupt);
  // Echo: was eben war, kehrt aus der Tiefe wieder
  echo = ctx.createDelay(3); echoRueck = ctx.createGain(); echoRueck.gain.value = 0.35;
  const daempfer = ctx.createBiquadFilter(); daempfer.type = 'lowpass'; daempfer.frequency.value = 1400;
  echo.connect(daempfer); daempfer.connect(echoRueck); echoRueck.connect(echo); daempfer.connect(nass);
  hallBauen(3);
  // Rauschen als Rohstoff für Erde, Körner und Grollen
  const n = ctx.sampleRate * 2; rauschen = ctx.createBuffer(1, n, ctx.sampleRate);
  const d = rauschen.getChannelData(0); for (let i = 0; i < n; i++) d[i] = Math.random() * 2 - 1;
  // Erde: ein kaum hörbares, braunes Rauschen
  const erde = ctx.createBufferSource(); erde.buffer = rauschen; erde.loop = true;
  erdeFilter = ctx.createBiquadFilter(); erdeFilter.type = 'lowpass'; erdeFilter.frequency.value = 380;
  erdeGain = ctx.createGain(); erdeGain.gain.value = 0.012;
  erde.connect(erdeFilter); erdeFilter.connect(erdeGain); erdeGain.connect(trocken); erdeGain.connect(nass); erde.start();
  // Bordun: zwei Dreiecke in der Quinte, durch einen Tiefpass, der mit der Tiefe schliesst
  bordunFilter = ctx.createBiquadFilter(); bordunFilter.type = 'lowpass'; bordunFilter.frequency.value = 600; bordunFilter.Q.value = 0.7;
  bordun = ctx.createGain(); bordun.gain.value = 0.028;
  bordunFilter.connect(bordun); bordun.connect(trocken); bordun.connect(nass);
  for (const [f, g] of [[GRUND / 4, 1], [GRUND * 3 / 8, 0.6], [GRUND / 2 * 1.003, 0.35]]) {
    const o = ctx.createOscillator(), v = ctx.createGain(), lfo = ctx.createOscillator(), lg = ctx.createGain();
    o.type = 'triangle'; o.frequency.value = f; v.gain.value = g;
    lfo.frequency.value = 0.04 + Math.random() * 0.05; lg.gain.value = g * 0.5;
    lfo.connect(lg); lg.connect(v.gain); o.connect(v); v.connect(bordunFilter); o.start(); lfo.start();
  }
  // Grollen: tiefes Rauschen für die gleitenden Schichten
  grollen = ctx.createBufferSource(); grollen.buffer = rauschen; grollen.loop = true; grollen.playbackRate.value = 0.25;
  const gf = ctx.createBiquadFilter(); gf.type = 'lowpass'; gf.frequency.value = 140; gf.Q.value = 3;
  grollenGain = ctx.createGain(); grollenGain.gain.value = 0;
  grollen.connect(gf); gf.connect(grollenGain); grollenGain.connect(trocken); grollenGain.connect(nass); grollen.start();
  haupt.gain.setTargetAtTime(an ? 1 : 0, ctx.currentTime, 0.8);
}

export function klangAn(wert) {
  an = wert;
  if (ctx) haupt.gain.setTargetAtTime(an ? 1 : 0, ctx.currentTime, 0.25);
}
export const klangIstAn = () => an;
// Tonspur für die Aufnahme (null, solange kein Klang läuft)
export const klangSpur = () => (ctx && an ? ziel.stream.getAudioTracks()[0] || null : null);
const bereit = () => ctx && an && ctx.state === 'running';

// einmal je Bild: der Grund folgt der mittleren Tiefe, Hall und Echo der Zeittiefe
export function klangBild(s) {
  if (!bereit()) return;
  const t = ctx.currentTime;
  if (Math.abs(s.tiefe - letzteTiefe) > 0.1) {
    letzteTiefe = s.tiefe;
    echo.delayTime.setTargetAtTime(Math.min(2.4, Math.max(0.12, s.tiefe / 5)), t, 0.3);
    echoRueck.gain.setTargetAtTime(Math.min(0.6, 0.22 + s.tiefe * 0.03), t, 0.3);
    clearTimeout(hallUhr);
    const soll = Math.min(6, 1.5 + s.tiefe * 0.4);
    if (Math.abs(soll - hallLaenge) > 0.4) hallUhr = setTimeout(() => hallBauen(soll), 300);
  }
  bordunFilter.frequency.setTargetAtTime(160 + 1100 * Math.pow(1 - s.mittel, 1.6), t, 0.4);
  bordun.gain.setTargetAtTime(0.02 + 0.03 * s.mittel, t, 0.5);
  erdeFilter.frequency.setTargetAtTime(220 + 500 * (1 - s.mittel), t, 0.5);
  erdeGain.gain.setTargetAtTime(0.008 + 0.02 * s.fluss, t, 0.5);
  grollenGain.gain.setTargetAtTime(Math.min(0.22, s.gleiten * 0.5), t, 0.15);
}

// Graben: Körner aus Rauschen, je tiefer, desto dunkler; die Menge folgt der Geschwindigkeit des Fingers
export function klangGraben(staerke, tiefe) {
  if (!bereit() || staerke < 0.02) return;
  const t = ctx.currentTime;
  koerner = koerner.filter((x) => t - x < 0.1); if (koerner.length >= 3) return;
  const zahl = Math.min(3, 1 + Math.floor(staerke * 3));
  for (let k = 0; k < zahl; k++) {
    const auf = t + Math.random() * 0.04, dauer = 0.025 + Math.random() * 0.06;
    koerner.push(auf);
    const q = ctx.createBufferSource(); q.buffer = rauschen;
    const f = ctx.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = (2600 * (1 - tiefe) + 160) * (0.7 + Math.random() * 0.6); f.Q.value = 1.8;
    const g = ctx.createGain(); g.gain.setValueAtTime(0, auf);
    g.gain.linearRampToValueAtTime(0.18 * Math.min(1, staerke) + 0.04, auf + 0.004); g.gain.exponentialRampToValueAtTime(0.0001, auf + dauer);
    const p = ctx.createStereoPanner ? ctx.createStereoPanner() : null;
    q.connect(f); f.connect(g);
    if (p) { p.pan.value = Math.random() * 1.2 - 0.6; g.connect(p); p.connect(trocken); p.connect(nass); } else { g.connect(trocken); g.connect(nass); }
    q.start(auf, Math.random() * 1.8, dauer + 0.02);
  }
}

// ein Stein: kurzer, hölzerner Ton mit einem Klick; jede Schicht tiefer
function stein(f, laut, dauer) {
  const t = ctx.currentTime;
  steine = steine.filter((x) => t - x < 0.25); if (steine.length >= 3) return; steine.push(t);
  const g = ctx.createGain(); g.gain.setValueAtTime(0, t);
  g.gain.linearRampToValueAtTime(laut, t + 0.004); g.gain.exponentialRampToValueAtTime(0.0001, t + dauer);
  g.connect(trocken); g.connect(echo); g.connect(nass);
  for (const [m, a, d] of [[1, 1, 1], [2.02, 0.32, 0.4], [3.98, 0.12, 0.2]]) {
    const o = ctx.createOscillator(), v = ctx.createGain(); o.type = 'sine'; o.frequency.value = f * m;
    v.gain.setValueAtTime(a, t); v.gain.exponentialRampToValueAtTime(0.0001, t + dauer * d);
    o.connect(v); v.connect(g); o.start(t); o.stop(t + dauer + 0.05);
  }
  const k = ctx.createBufferSource(); k.buffer = rauschen;
  const kf = ctx.createBiquadFilter(); kf.type = 'highpass'; kf.frequency.value = 1800;
  const kg = ctx.createGain(); kg.gain.setValueAtTime(laut * 0.5, t); kg.gain.exponentialRampToValueAtTime(0.0001, t + 0.02);
  k.connect(kf); kf.connect(kg); kg.connect(trocken); k.start(t, Math.random(), 0.03);
}
export function klangSchwelle(k) {
  if (!bereit()) return;
  stein(GRUND * Math.pow(2, -STUFEN[Math.min(k, STUFEN.length - 1)] / 12), 0.16, 0.9 + k * 0.08);
}

// Glocke: Grundton mit unharmonischen Obertönen, weit weg im Hall
function glocke(f, laut, dauer, sinken) {
  const t = ctx.currentTime;
  const g = ctx.createGain(); g.gain.setValueAtTime(0, t);
  g.gain.linearRampToValueAtTime(laut, t + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, t + dauer);
  g.connect(trocken); g.connect(nass); g.connect(echo);
  for (const [m, a] of [[1, 1], [2.4, 0.4], [2.76, 0.3], [5.4, 0.1]]) {
    const o = ctx.createOscillator(), v = ctx.createGain(); o.frequency.value = f * m; v.gain.value = a;
    if (sinken) o.detune.linearRampToValueAtTime(-sinken, t + dauer);
    o.connect(v); v.connect(g); o.start(t); o.stop(t + dauer + 0.05);
  }
}
// Kegel: eine neue Schicht löst sich von der Spitze
export function klangRing(k) {
  if (!bereit()) return;
  glocke(GRUND / 2 * Math.pow(2, -STUFEN[k % 6] / 12), 0.05, 3.2, 0);
}
// Sprung in die Vergangenheit: eine tiefe Glocke, die sinkt
export function klangSprung() {
  if (!bereit()) return;
  glocke(GRUND / 4, 0.13, 5, 120);
}
