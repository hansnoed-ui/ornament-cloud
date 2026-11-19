// Klang des Kristallbilds: ein leiser Glaston, der mit den Facetten bricht und mit der Zeittiefe nachhallt.
// Web Audio, alles im Browser. Jede Facette hat einen Ton; blitzt sie im Licht auf, klingt sie an.
// Die Brechung spaltet den Ton wie Licht in nahe Teiltöne, die Zeittiefe ist die Länge des Nachhalls.

const STIMMUNG = [0, 3, 5, 7, 10, 12, 15, 17, 19, 22, 24, 27];   // Moll-Pentatonik über zwei Oktaven
const GRUND = 293.66;                                             // d'
const LICHT = (() => { const l = [0.35, 0.55, 0.76], h = [l[0], l[1], l[2] + 1], n = Math.hypot(...h); return h.map((v) => v / n); })();

let ctx = null, haupt = null, trocken = null, nass = null, hall = null, echo = null, echoRueck = null, ziel = null;
let an = true, hallLaenge = 0, hallUhr = 0, letzteTiefe = -1;
const glanz = new Uint8Array(64);      // je Facette: blitzt gerade (Hysterese)
let anschlaege = [], grundTon = [];

function hallBauen(sek) {
  const n = Math.round(ctx.sampleRate * sek), ir = ctx.createBuffer(2, n, ctx.sampleRate);
  for (let k = 0; k < 2; k++) {
    const d = ir.getChannelData(k);
    for (let i = 0; i < n; i++) { const t = i / n; d[i] = (Math.random() * 2 - 1) * Math.pow(1 - t, 2.6) * (0.6 + 0.4 * Math.cos(t * 40 + k)); }
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
  trocken = ctx.createGain(); trocken.gain.value = 0.7; trocken.connect(haupt);
  nass = ctx.createGain(); nass.gain.value = 0.5;
  hall = ctx.createConvolver(); nass.connect(hall); hall.connect(haupt);
  // Echo: die Gegenwart kehrt als Vergangenheit wieder, gedämpft
  echo = ctx.createDelay(2); echoRueck = ctx.createGain(); echoRueck.gain.value = 0.38;
  const daempfer = ctx.createBiquadFilter(); daempfer.type = 'lowpass'; daempfer.frequency.value = 2600;
  echo.connect(daempfer); daempfer.connect(echoRueck); echoRueck.connect(echo); daempfer.connect(nass);
  hallBauen(2.5);
  // ein kaum hörbarer Grund: drei Sinustöne, die langsam atmen
  for (const [f, g] of [[GRUND / 2, 0.012], [GRUND * 0.75, 0.008], [GRUND, 0.006]]) {
    const o = ctx.createOscillator(), v = ctx.createGain(), lfo = ctx.createOscillator(), lg = ctx.createGain();
    o.frequency.value = f; v.gain.value = g; lfo.frequency.value = 0.05 + Math.random() * 0.07; lg.gain.value = g * 0.8;
    lfo.connect(lg); lg.connect(v.gain); o.connect(v); v.connect(nass); v.connect(trocken);
    o.start(); lfo.start(); grundTon.push(o);
  }
  haupt.gain.setTargetAtTime(an ? 1 : 0, ctx.currentTime, 0.8);
}

export function klangAn(wert) {
  an = wert;
  if (ctx) haupt.gain.setTargetAtTime(an ? 1 : 0, ctx.currentTime, 0.25);
}
export const klangIstAn = () => an;
// Tonspur für die Aufnahme (null, solange kein Klang läuft)
export const klangSpur = () => (ctx && an ? ziel.stream.getAudioTracks()[0] || null : null);

function anschlagen(i, anzahl, s) {
  const t = ctx.currentTime;
  // höchstens acht Anschläge je halbe Sekunde, sonst wird aus dem Funkeln ein Rauschen
  anschlaege = anschlaege.filter((x) => t - x < 0.5); if (anschlaege.length >= 8) return; anschlaege.push(t);
  const stufe = STIMMUNG[(i * 7) % STIMMUNG.length], f0 = GRUND * Math.pow(2, stufe / 12);
  const teile = 1 + Math.round(s.brech * 2);                     // Brechung: ein Ton zerfällt in bis zu drei nahe Töne
  const laut = (0.08 + 0.08 * s.feuer / 1.6) / Math.sqrt(teile);
  const dauer = s.zustand === 1 && Math.random() < 0.5 ? 0.18 : 1.6 + s.tiefe * 0.15;   // gesprungen: mancher Ton reisst ab
  for (let k = 0; k < teile; k++) {
    const auf = t + k * 0.018 * (1 + s.brech), cent = (k - (teile - 1) / 2) * (6 + 14 * s.brech);
    const f = f0 * Math.pow(2, cent / 1200);
    const g = ctx.createGain(); g.gain.setValueAtTime(0, auf);
    g.gain.linearRampToValueAtTime(laut, auf + 0.006); g.gain.exponentialRampToValueAtTime(0.0001, auf + dauer);
    g.connect(trocken); g.connect(echo); g.connect(nass);
    // Glas: Grundton und ein unharmonischer Oberton (Glocke 2.76)
    for (const [m, a] of [[1, 1], [2.76, 0.35], [5.4, 0.12]]) {
      const o = ctx.createOscillator(), v = ctx.createGain(); o.frequency.value = f * m; v.gain.value = a;
      if (s.zustand === 3) o.detune.linearRampToValueAtTime(-60, auf + dauer);   // im Zerfall: der Ton sinkt
      o.connect(v); v.connect(g); o.start(auf); o.stop(auf + dauer + 0.05);
    }
  }
}

// einmal je Bild: welche Facette spiegelt gerade das Licht ins Auge?
export function klangBild(ebenenW, anzahl, s) {
  if (!ctx || !an || ctx.state !== 'running') return;
  const t = ctx.currentTime;
  if (Math.abs(s.tiefe - letzteTiefe) > 0.05) {
    letzteTiefe = s.tiefe;
    echo.delayTime.setTargetAtTime(Math.min(1.2, Math.max(0.09, s.tiefe / 6)), t, 0.2);
    echoRueck.gain.setTargetAtTime(Math.min(0.62, 0.25 + s.tiefe * 0.05), t, 0.2);
    clearTimeout(hallUhr);
    const soll = Math.min(5.5, 1.2 + s.tiefe * 0.55);
    if (Math.abs(soll - hallLaenge) > 0.3) hallUhr = setTimeout(() => hallBauen(soll), 300);
  }
  nass.gain.setTargetAtTime(0.35 + 0.5 * s.ver, t, 0.3);
  for (let i = 0; i < Math.min(anzahl, glanz.length); i++) {
    const d = ebenenW[i * 3] * LICHT[0] + ebenenW[i * 3 + 1] * LICHT[1] + ebenenW[i * 3 + 2] * LICHT[2];
    if (!glanz[i] && d > 0.992) { glanz[i] = 1; anschlagen(i, anzahl, s); }
    else if (glanz[i] && d < 0.975) glanz[i] = 0;
  }
}
