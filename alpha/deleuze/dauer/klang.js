// Klang der Dauer. Web Audio, alles im Browser.
// Uhr: jeder Moment ein leises Ticken, abwechselnd hoch und tief wie eine Hemmung. Wo gewartet wird, wird aus
// jedem Ticken ein Ton, der länger klingt, bis die Töne sich überlagern: Bergsons Melodie, deren Noten
// «fondues pour ainsi dire ensemble» sind. Zucker: ein leises Lösen, Körner wie Kristalle, die zergehen.
// Spannung: ein Ton, der im Rhythmus des Bildes schwingt; gespannt steigt er.

const MELODIE = [0, 7, 3, 10, 5, 12, 7, 3, 15, 10, 5, 8];   // Halbtöne über d (aufsteigend und zurück, ohne Schluss)
const GRUND = 146.83;                                         // d

let ctx = null, haupt = null, trocken = null, nass = null, hall = null, ziel = null;
let rausch = null, loesenGain = null, loesenFilter = null, ton = null, ton2 = null, tonGain = null, wiegen = null, wiegenTiefe = null;
let an = true, letzteKoerner = 0;

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
  hallBauen(4.5);
  // Rauschen für Ticken und Lösen
  const n = ctx.sampleRate * 2, buf = ctx.createBuffer(1, n, ctx.sampleRate), d = buf.getChannelData(0);
  for (let i = 0; i < n; i++) d[i] = Math.random() * 2 - 1;
  rausch = buf;
  // Lösen (Zucker): weiches, gefiltertes Rauschen
  const q = ctx.createBufferSource(); q.buffer = rausch; q.loop = true;
  loesenFilter = ctx.createBiquadFilter(); loesenFilter.type = 'bandpass'; loesenFilter.frequency.value = 3200; loesenFilter.Q.value = 0.7;
  loesenGain = ctx.createGain(); loesenGain.gain.value = 0;
  q.connect(loesenFilter); loesenFilter.connect(loesenGain); loesenGain.connect(trocken); loesenGain.connect(nass); q.start();
  // Spannung: zwei leicht verstimmte Töne, im Rhythmus gewogen
  ton = ctx.createOscillator(); ton.type = 'sine'; ton.frequency.value = GRUND;
  ton2 = ctx.createOscillator(); ton2.type = 'triangle'; ton2.frequency.value = GRUND * 1.003;
  tonGain = ctx.createGain(); tonGain.gain.value = 0;
  wiegen = ctx.createOscillator(); wiegen.frequency.value = 1.2; wiegenTiefe = ctx.createGain(); wiegenTiefe.gain.value = 0;
  wiegen.connect(wiegenTiefe); wiegenTiefe.connect(tonGain.gain);
  const t2 = ctx.createGain(); t2.gain.value = 0.35; ton2.connect(t2); t2.connect(tonGain);
  ton.connect(tonGain); tonGain.connect(trocken); tonGain.connect(nass);
  ton.start(); ton2.start(); wiegen.start();
}

export function klangAn(wert) {
  an = wert;
  if (ctx) haupt.gain.setTargetAtTime(an ? 1 : 0, ctx.currentTime, 0.08);
}
export const klangIstAn = () => an;
// die Tonspur für die Aufnahme
export const klangSpur = () => (ctx && an ? ziel.stream.getAudioTracks()[0] || null : null);

// ein Moment der Uhr; warten 0 bis 1: wie viel Dauer im Bild liegt
export function klangTakt(nr, warten) {
  if (!ctx || !an || ctx.state !== 'running') return;
  const t = ctx.currentTime;
  // das Ticken: kurzes Holz, abwechselnd hoch und tief; es tritt zurück, je mehr gewartet wird
  const tick = ctx.createBufferSource(); tick.buffer = rausch; tick.playbackRate.value = 1;
  const f = ctx.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = nr % 2 ? 2350 : 1850; f.Q.value = 9;
  const g = ctx.createGain(); const laut = 0.5 * (1 - 0.85 * warten);
  g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(laut, t + 0.002); g.gain.exponentialRampToValueAtTime(0.0005, t + 0.045);
  tick.connect(f); f.connect(g); g.connect(trocken);
  const n = ctx.createGain(); n.gain.value = 0.12; g.connect(n); n.connect(nass);
  tick.start(t, Math.random() * 1.5, 0.06);
  // der Ton: erst gar nicht, dann kurz, dann immer länger; die Töne überlagern sich zur Melodie
  if (warten < 0.04) return;
  const stufe = MELODIE[nr % MELODIE.length], fr = GRUND * 2 * Math.pow(2, stufe / 12);
  const o = ctx.createOscillator(), o2 = ctx.createOscillator(); o.type = 'sine'; o2.type = 'sine';
  o.frequency.value = fr; o2.frequency.value = fr * 2.001;
  const v = ctx.createGain(), v2 = ctx.createGain(); v2.gain.value = 0.18;
  const ein = 0.01 + 0.35 * warten, aus = 0.12 + 5.5 * warten * warten, spitze = 0.05 + 0.13 * warten;
  v.gain.setValueAtTime(0, t); v.gain.linearRampToValueAtTime(spitze, t + ein); v.gain.setTargetAtTime(0, t + ein, aus / 3.5);
  o.connect(v); o2.connect(v2); v2.connect(v); v.connect(trocken); v.connect(nass);
  o.start(t); o2.start(t); o.stop(t + ein + aus + 0.5); o2.stop(t + ein + aus + 0.5);
}

// laufend, je Bild: { lesart, warten, finger, werte, takt }
export function klangBild(s) {
  if (!ctx || !an) return;
  const t = ctx.currentTime;
  // Zucker: das Lösen rauscht, so lange etwas wartet; rühren macht es heller
  const zucker = s.lesart === 1;
  loesenGain.gain.setTargetAtTime(zucker ? 0.03 + 0.14 * s.warten : 0, t, 0.25);
  loesenFilter.frequency.setTargetAtTime(zucker ? 1800 + 2600 * s.werte[1] : 3000, t, 0.3);
  if (zucker && s.warten > 0.05 && t - letzteKoerner > 0.09 / (0.2 + s.warten) * Math.random()) {
    letzteKoerner = t;
    // ein Korn: ein hoher, gläserner Ton, der rasch zergeht
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.frequency.value = 2200 + Math.random() * 3800; o.type = 'sine';
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(0.012 + 0.02 * s.warten, t + 0.004); g.gain.exponentialRampToValueAtTime(0.0003, t + 0.18);
    o.connect(g); g.connect(nass); g.connect(trocken); o.start(t); o.stop(t + 0.2);
  }
  // Spannung: der Ton wiegt sich im gewählten Rhythmus; gespannt steigt er um eine Quinte
  const spannung = s.lesart === 2;
  const sp = spannung ? s.werte[0] : 0;
  tonGain.gain.setTargetAtTime(spannung ? 0.05 + 0.04 * s.warten : 0, t, 0.3);
  wiegenTiefe.gain.setTargetAtTime(spannung ? 0.03 + 0.05 * s.werte[2] : 0, t, 0.3);
  wiegen.frequency.setTargetAtTime(0.5 * Math.pow(12, s.werte[1] || 0), t, 0.3);
  const f = GRUND * Math.pow(2, (7 * Math.min(1, sp + s.warten * 0.6)) / 12);
  ton.frequency.setTargetAtTime(f, t, 0.4); ton2.frequency.setTargetAtTime(f * 1.003, t, 0.4);
}

// Loslassen in der Uhr: die Dauer zerspringt. Erst ein heller Sprung, dann rieseln die Scherben als Ticken
// auseinander, immer weiter auseinander, bis wieder die Uhr geht.
export function klangBruch(menge) {
  if (!ctx || !an || ctx.state !== 'running') return;
  const t0 = ctx.currentTime, m = Math.min(1, 0.3 + menge);
  // der Sprung: kurzes, helles Rauschen
  const q = ctx.createBufferSource(); q.buffer = rausch;
  const f = ctx.createBiquadFilter(); f.type = 'highpass'; f.frequency.value = 3800;
  const g = ctx.createGain();
  g.gain.setValueAtTime(0, t0); g.gain.linearRampToValueAtTime(0.22 * m, t0 + 0.003); g.gain.exponentialRampToValueAtTime(0.0004, t0 + 0.16);
  q.connect(f); f.connect(g); g.connect(trocken); g.connect(nass); q.start(t0, Math.random(), 0.2);
  // die Scherben: gläserne Töne aus der Melodie, zwei Oktaven höher, immer seltener
  const n = 9 + Math.round(9 * m);
  for (let i = 0; i < n; i++) {
    const t = t0 + 0.02 + 1.15 * Math.pow(i / n, 1.7) + Math.random() * 0.015;
    const fr = GRUND * 8 * Math.pow(2, MELODIE[(i * 5) % MELODIE.length] / 12) * (1 + (Math.random() - 0.5) * 0.004);
    const o = ctx.createOscillator(), v = ctx.createGain(); o.type = 'sine'; o.frequency.value = fr;
    const laut = (0.05 + 0.04 * Math.random()) * m * (1 - 0.6 * i / n);
    v.gain.setValueAtTime(0, t); v.gain.linearRampToValueAtTime(laut, t + 0.002); v.gain.exponentialRampToValueAtTime(0.0003, t + 0.25 + 0.3 * Math.random());
    o.connect(v); v.connect(trocken); v.connect(nass); o.start(t); o.stop(t + 0.6);
  }
}
