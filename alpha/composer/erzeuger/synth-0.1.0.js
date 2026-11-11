// Synth 0.1.0 – musikalische Synthesizerspuren: eine gemeinsame Engine mit fünf Verfahren und acht Klangfamilien mit je zwei Presets.
//
// Verfahren (alle im selben Notenweg: Tonhöhe → Oszillator → Filter → Hüllkurve, danach Spur-Nachbearbeitung):
//   analog     zwei Oszillatoren (Sägezahn, Puls mit Pulsbreite, Dreieck, Sinus; bandbegrenzt mit PolyBLEP), Sub, Rauschen, Unisono
//   fm         drei Operatoren (Phasenmodulation): Träger + zwei Modulatoren, parallel oder gestapelt, Rückkopplung am ersten Modulator;
//              Anschlag und eine eigene Hüllkurve steuern den Modulationsindex. Keine DX7-Emulation.
//   wavetable  Rahmen aus Teiltonspektren (je bis 40 Teiltöne), stufenlos überblendet; je Note nur Teiltöne unter der Nyquistgrenze
//   supersaw   sieben gegeneinander verstimmte Sägezähne mit Pegelausgleich, im Stereo verteilt
//   orgel      Zugriegel (Teiltöne 1/2 bis 8), Tastenklick, Perkussion
// Spur-Nachbearbeitung: gemeinsames Wow/Flutter (Tonhöhe, für alle Stimmen gleich, aus der absoluten Zeit), getrennt davon eine kleine Drift
// je Stimme, Bandrauschen, Sättigung, Chorus, Stereobreite.
//
// Die Zuordnung der Familien zu Künstlern ist ein gestalterischer Auftrag (synthesizer.md), keine Behauptung über deren Geräte oder Patches.
// Nach der Veröffentlichung nicht mehr verändern; neue Klänge in synth-0.2.0.js.

import { zufall, SVF, TAU, spitze, hash } from "./grund.js";

const P = (key, name, gruppe, min, max, std, einheit = "", mehr = {}) => ({ key, name, gruppe, min, max, std, einheit, ...mehr });

// ---------- Patches (Grundklang je Preset; die Makros verschieben ihn) ----------
const ADSR = (a, d, s, r) => ({ a, d, s, r });
export const PATCHES = Object.freeze({
  // Shadow Dub – Massive Attack als gestalterische Richtung: dunkle Akkorde, gefilterte Anschläge, kontrollierte Sättigung
  shadowChord: { name: "Shadow Chord", familie: "shadow", rolle: "pad", verfahren: "analog", poly: true, oktave: 3,
    osc: { w1: "saege", w2: "puls", pw: 0.42, mix: 0.45, verstimmung: 7, sub: 0.2, rauschen: 0.02, unisono: 2, spread: 6 },
    filter: { typ: 24, f: 520, res: 0.18, env: 1.1, key: 0.3, vel: 0.4 }, fenv: ADSR(0.06, 1.4, 0.25, 1.2), amp: ADSR(0.04, 1.2, 0.8, 1.6),
    lfo: { rate: 0.2, ton: 3, filter: 0.15, pwm: 0.08 }, drift: 3, tape: { wow: 4, flutter: 0, rauschen: 0.002, saettigung: 4 }, chorus: 0.25, breite: 0.6, echo: 0.25 },
  deepRoomDrone: { name: "Deep Room Drone", familie: "shadow", rolle: "drone", verfahren: "wavetable", poly: true, oktave: 2,
    wt: { rahmen: ["dunkel", "hohl", "glas"], pos: 0.1, wander: 0.5 }, osc: { sub: 0.35, unisono: 2, spread: 5 },
    filter: { typ: 24, f: 420, res: 0.3, env: 0.4, key: 0.2, vel: 0.1 }, fenv: ADSR(2, 4, 0.6, 4), amp: ADSR(2.5, 3, 0.9, 4),
    lfo: { rate: 0.07, ton: 2, filter: 0.4 }, drift: 4, tape: { wow: 2, flutter: 0, rauschen: 0.003, saettigung: 6 }, chorus: 0.2, breite: 0.8, echo: 0.15 },
  // Tape Memory – Boards of Canada als Richtung: warm, instabil, abgedunkelt
  amberMemory: { name: "Amber Memory Pad", familie: "tape", rolle: "pad", verfahren: "analog", poly: true, oktave: 3,
    osc: { w1: "puls", w2: "saege", pw: 0.5, mix: 0.35, verstimmung: 9, sub: 0.1, rauschen: 0.01, unisono: 2, spread: 8 },
    filter: { typ: 12, f: 1300, res: 0.1, env: 0.5, key: 0.4, vel: 0.2 }, fenv: ADSR(0.8, 2.5, 0.6, 2), amp: ADSR(0.9, 2, 0.85, 2.4),
    lfo: { rate: 0.35, ton: 2, filter: 0.1, pwm: 0.3 }, drift: 7, tape: { wow: 14, flutter: 3, rauschen: 0.012, saettigung: 6 }, chorus: 0.45, breite: 0.7, echo: 0.15 },
  wornKeys: { name: "Worn Electric Keys", familie: "tape", rolle: "keys", verfahren: "fm", poly: true, oktave: 3,
    fm: { algo: "parallel", r1: 1, i1: 1.6, d1: 0.9, s1: 0.15, r2: 14, i2: 0.6, d2: 0.05, s2: 0, fb: 0.05, vel: 0.8 },
    filter: { typ: 12, f: 3200, res: 0, env: 0, key: 0.5, vel: 0.3 }, fenv: ADSR(0.01, 1, 1, 1), amp: ADSR(0.004, 2.4, 0.15, 0.5),
    lfo: { rate: 4.5, amp: 0.08 }, drift: 5, tape: { wow: 12, flutter: 4, rauschen: 0.01, saettigung: 5 }, chorus: 0.3, breite: 0.5, echo: 0.2 },
  // Glass Circuit – Radiohead/Thom Yorke als Richtung: gläserne FM-Töne, Poly-Keys, rhythmische Modulation
  glassKeys: { name: "Glass Circuit Keys", familie: "glass", rolle: "keys", verfahren: "fm", poly: true, oktave: 4,
    fm: { algo: "parallel", r1: 3.5, i1: 2.2, d1: 0.35, s1: 0.1, r2: 1, i2: 0.6, d2: 1.5, s2: 0.3, fb: 0, vel: 1 },
    filter: { typ: 12, f: 6500, res: 0, env: 0, key: 0.3, vel: 0.2 }, fenv: ADSR(0.01, 1, 1, 1), amp: ADSR(0.002, 1.8, 0.2, 0.9),
    lfo: { rate: 0.3, ton: 2 }, drift: 2, tape: { wow: 3, flutter: 1, rauschen: 0.003, saettigung: 2 }, chorus: 0.2, breite: 0.5, echo: 0.3 },
  restlessPulse: { name: "Restless Poly Pulse", familie: "glass", rolle: "chord", verfahren: "analog", poly: true, oktave: 3,
    osc: { w1: "puls", w2: "puls", pw: 0.3, mix: 0.5, verstimmung: 5, sub: 0, rauschen: 0, unisono: 1, spread: 0 },
    filter: { typ: 24, f: 900, res: 0.35, env: 1.5, key: 0.4, vel: 0.5 }, fenv: ADSR(0.005, 0.25, 0.2, 0.3), amp: ADSR(0.005, 0.5, 0.6, 0.35),
    lfo: { rate: 0, takt: 16, filter: 0.9, pwm: 0.2 }, drift: 2, tape: { wow: 2, flutter: 0, rauschen: 0, saettigung: 3 }, chorus: 0.15, breite: 0.4, echo: 0.3 },
  // Spiral Goa – ineinandergreifende Sequenzen, Acid, Plucks
  spiralAcid: { name: "Spiral Acid Lead", familie: "goa", rolle: "acid", verfahren: "analog", poly: false, oktave: 2,
    osc: { w1: "saege", w2: "saege", pw: 0.5, mix: 0, verstimmung: 0, sub: 0, rauschen: 0, unisono: 1, spread: 0 },
    filter: { typ: 24, f: 260, res: 0.72, env: 3.2, key: 0.2, vel: 0.3 }, fenv: ADSR(0.002, 0.22, 0, 0.1), amp: ADSR(0.002, 0.4, 0.75, 0.04),
    akzent: 1, gleitZeit: 0.06, lfo: { rate: 0, ton: 0 }, drift: 0, tape: { wow: 0, flutter: 0, rauschen: 0, saettigung: 9 }, chorus: 0, breite: 0.1, echo: 0.25 },
  liquidArp: { name: "Liquid Resonance Arp", familie: "goa", rolle: "arp", verfahren: "analog", poly: true, oktave: 3,
    osc: { w1: "saege", w2: "puls", pw: 0.25, mix: 0.4, verstimmung: 4, sub: 0, rauschen: 0, unisono: 1, spread: 0 },
    filter: { typ: 24, f: 500, res: 0.6, env: 2.4, key: 0.5, vel: 0.5 }, fenv: ADSR(0.001, 0.12, 0.05, 0.1), amp: ADSR(0.001, 0.18, 0.1, 0.12),
    lfo: { rate: 0, takt: 64, filter: 1.2 }, drift: 0, tape: { wow: 0, flutter: 0, rauschen: 0, saettigung: 4 }, chorus: 0.1, breite: 0.5, echo: 0.4 },
  // Open Trance – Supersaw, Plucks
  openSky: { name: "Open Sky Saw", familie: "trance", rolle: "pad", verfahren: "supersaw", poly: true, oktave: 3,
    ss: { stimmen: 7, spread: 22, mitte: 0.6 }, filter: { typ: 12, f: 4500, res: 0.05, env: 0.3, key: 0.3, vel: 0.2 }, fenv: ADSR(0.3, 2, 0.8, 1.5), amp: ADSR(0.25, 1, 0.9, 1.2),
    lfo: { rate: 0.15, filter: 0.15 }, drift: 0, tape: { wow: 0, flutter: 0, rauschen: 0, saettigung: 2 }, chorus: 0, breite: 0.9, echo: 0.2 },
  crystalPluck: { name: "Crystal Trance Pluck", familie: "trance", rolle: "pluck", verfahren: "supersaw", poly: true, oktave: 4,
    ss: { stimmen: 5, spread: 14, mitte: 0.7 }, filter: { typ: 24, f: 900, res: 0.2, env: 3, key: 0.4, vel: 0.5 }, fenv: ADSR(0.001, 0.18, 0, 0.15), amp: ADSR(0.001, 0.35, 0, 0.2),
    lfo: { rate: 0 }, drift: 0, tape: { wow: 0, flutter: 0, rauschen: 0, saettigung: 2 }, chorus: 0, breite: 0.8, echo: 0.45 },
  // House Motion – Orgel-Akkorde, Stabs
  velvetOrgan: { name: "Velvet Organ Chord", familie: "house", rolle: "chord", verfahren: "orgel", poly: true, oktave: 3,
    orgel: { zug: [0.6, 1, 0.5, 0.7, 0.3, 0.25, 0, 0.1, 0.15], klick: 0.25, perk: 0.3 }, filter: { typ: 12, f: 5000, res: 0, env: 0, key: 0, vel: 0 }, fenv: ADSR(0.01, 1, 1, 1), amp: ADSR(0.003, 0.4, 0.7, 0.12),
    lfo: { rate: 6.2, ton: 4 }, drift: 0, tape: { wow: 0, flutter: 0, rauschen: 0, saettigung: 5 }, chorus: 0.4, breite: 0.5, echo: 0.1 },
  warmStab: { name: "Warm House Stab", familie: "house", rolle: "chord", verfahren: "analog", poly: true, oktave: 3,
    osc: { w1: "saege", w2: "saege", pw: 0.5, mix: 0.5, verstimmung: 10, sub: 0.1, rauschen: 0, unisono: 1, spread: 0 },
    filter: { typ: 24, f: 650, res: 0.25, env: 2, key: 0.4, vel: 0.6 }, fenv: ADSR(0.003, 0.28, 0.1, 0.2), amp: ADSR(0.003, 0.35, 0.3, 0.18),
    lfo: { rate: 0 }, drift: 1, tape: { wow: 0, flutter: 0, rauschen: 0, saettigung: 5 }, chorus: 0.3, breite: 0.5, echo: 0.2 },
  // Machine Pop – Kraftwerk als Richtung: präzise Pulse, synthetische Streicher, vokalartige Resonanz
  motorPulse: { name: "Motor Pulse", familie: "machine", rolle: "puls", verfahren: "analog", poly: false, oktave: 2,
    osc: { w1: "puls", w2: "puls", pw: 0.5, mix: 0.3, verstimmung: 1200, sub: 0, rauschen: 0, unisono: 1, spread: 0 },
    filter: { typ: 24, f: 1100, res: 0.15, env: 1, key: 0.5, vel: 0.2 }, fenv: ADSR(0.001, 0.12, 0.3, 0.05), amp: ADSR(0.001, 0.15, 0.6, 0.04),
    gleitZeit: 0, lfo: { rate: 0 }, drift: 0, tape: { wow: 0, flutter: 0, rauschen: 0, saettigung: 2 }, chorus: 0, breite: 0.2, echo: 0.2 },
  machineStrings: { name: "Machine Strings", familie: "machine", rolle: "pad", verfahren: "analog", poly: true, oktave: 3,
    osc: { w1: "saege", w2: "saege", pw: 0.5, mix: 0.5, verstimmung: 12, sub: 0, rauschen: 0, unisono: 2, spread: 10 }, vokal: "a",
    filter: { typ: 12, f: 3000, res: 0, env: 0.2, key: 0.3, vel: 0.1 }, fenv: ADSR(0.4, 1, 0.9, 1), amp: ADSR(0.45, 1, 0.9, 1.1),
    lfo: { rate: 5, ton: 5 }, drift: 2, tape: { wow: 0, flutter: 0, rauschen: 0, saettigung: 2 }, chorus: 0.6, breite: 0.8, echo: 0.1 },
  // Dark Pop – Depeche Mode als Richtung: markante Analog-Akkorde, metallische Anschläge
  darkBrass: { name: "Dark Brass", familie: "darkpop", rolle: "chord", verfahren: "analog", poly: true, oktave: 3,
    osc: { w1: "saege", w2: "saege", pw: 0.5, mix: 0.5, verstimmung: 8, sub: 0.15, rauschen: 0.01, unisono: 1, spread: 0 },
    filter: { typ: 24, f: 420, res: 0.15, env: 2.2, key: 0.4, vel: 0.6 }, fenv: ADSR(0.09, 0.6, 0.45, 0.4), amp: ADSR(0.03, 0.8, 0.8, 0.45),
    lfo: { rate: 5.5, ton: 3 }, drift: 2, tape: { wow: 0, flutter: 0, rauschen: 0, saettigung: 8 }, chorus: 0.2, breite: 0.5, echo: 0.2 },
  industrialBell: { name: "Industrial Bell Keys", familie: "darkpop", rolle: "keys", verfahren: "fm", poly: true, oktave: 4,
    fm: { algo: "stapel", r1: 1.41, i1: 3, d1: 0.5, s1: 0.2, r2: 3.73, i2: 1.6, d2: 0.15, s2: 0, fb: 0.2, vel: 1, schlag: 0.25 },
    filter: { typ: 12, f: 5500, res: 0, env: 0, key: 0.2, vel: 0.2 }, fenv: ADSR(0.01, 1, 1, 1), amp: ADSR(0.001, 2.2, 0.05, 1),
    lfo: { rate: 0 }, drift: 1, tape: { wow: 0, flutter: 0, rauschen: 0, saettigung: 5 }, chorus: 0.1, breite: 0.5, echo: 0.35 },
});

// ---------- Wavetable-Rahmen (Teiltonspektren, 40 Teiltöne) ----------
const T = 40;
const RAHMEN = {
  dunkel: Array.from({ length: T }, (_, k) => (k === 0 ? 1 : k < 6 ? 0.5 / (k + 1) ** 1.5 : 0.02 / (k + 1))),
  hohl: Array.from({ length: T }, (_, k) => (k % 2 === 0 ? 1 / (k + 1) : 0.05 / (k + 1))),
  glas: Array.from({ length: T }, (_, k) => [0, 2, 4, 7, 11, 15].includes(k) ? 0.7 / Math.sqrt(k + 1) : 0.01),
  saege: Array.from({ length: T }, (_, k) => 1 / (k + 1)),
  vokal: Array.from({ length: T }, (_, k) => { const f = (k + 1) * 110; return (Math.exp(-(((f - 700) / 180) ** 2)) + 0.6 * Math.exp(-(((f - 1150) / 220) ** 2)) + 0.1) / (k + 1) ** 0.3; }),
};

// ---------- Hilfen ----------
const SINUS = Float32Array.from({ length: 1024 }, (_, j) => Math.sin((TAU * j) / 1024));
function huellkurve(h, rate, dauer, { legato = false } = {}) {
  const n = Math.ceil((dauer + h.r * 1.3 + 0.005) * rate), e = new Float32Array(n), A = Math.max(1, h.a * rate), ende = Math.round(dauer * rate);
  const kd = Math.exp(-4.6 / Math.max(1, h.d * rate)), kr = Math.exp(-6.9 / Math.max(1, h.r * rate));
  let v = legato ? h.s : 0, d = legato ? 0 : 1;
  for (let i = 0; i < n; i++) {
    if (i < ende) { if (!legato && i < A) v = 0.5 - 0.5 * Math.cos((Math.PI * i) / A); else { d *= kd; v = h.s + (1 - h.s) * d; } }
    else v *= kr;
    e[i] = v;
  }
  return e;
}
const polyblep = (t, d) => (t < d ? (t /= d, t + t - t * t - 1) : t > 1 - d ? (t = (t - 1) / d, t * t + t + t + 1) : 0);
function welle(art, p, d, pw) {
  if (art === "saege") return 2 * p - 1 - polyblep(p, d);
  if (art === "puls") { let y = p < pw ? 1 : -1; y += polyblep(p, d); y -= polyblep((p - pw + 1) % 1, d); return y; }
  if (art === "dreieck") return 4 * Math.abs(p - 0.5) - 1;
  return Math.sin(TAU * p);
}
/** gemeinsames Wow/Flutter aus der absoluten Zeit: alle Stimmen schwanken gleich (Band), in Cent */
const wowFlutter = (t, wow, flutter) => wow * (0.6 * Math.sin(TAU * 0.55 * t) + 0.4 * Math.sin(TAU * 0.31 * t + 1.3)) + flutter * Math.sin(TAU * 7.3 * t + 0.7) * (0.6 + 0.4 * Math.sin(TAU * 0.9 * t));

/** die Makros auf einen Patch anwenden: gibt den wirksamen Patch zurück (Zuordnung siehe MAKROS) */
function wirksam(p, w) {
  const h = (w.helligkeit - 50) / 50, bw = w.bewegung / 40, wa = w.waerme / 50, al = w.alter / 30, br = w.breite / 60, ch = w.charakter / 50;
  const f = { ...p.filter, f: Math.min(16000, p.filter.f * 2 ** (h * 1.6 - (wa - 1) * 0.4)), env: p.filter.env * (0.6 + 0.4 * bw), res: Math.min(0.92, p.filter.res * (p.familie === "goa" || p.verfahren === "analog" ? ch : 1)) };
  const lfo = { ...p.lfo, ton: (p.lfo.ton ?? 0) * bw, filter: (p.lfo.filter ?? 0) * bw, pwm: (p.lfo.pwm ?? 0) * bw, amp: (p.lfo.amp ?? 0) * bw };
  const tape = { wow: p.tape.wow * al, flutter: p.tape.flutter * al, rauschen: p.tape.rauschen * al, saettigung: p.tape.saettigung * wa + (al - 1) * 1.5 };
  const fm = p.fm ? { ...p.fm, i1: p.fm.i1 * ch * 2 ** (h * 0.6), i2: p.fm.i2 * ch * 2 ** (h * 0.6) } : null;
  const wt = p.wt ? { ...p.wt, pos: Math.min(1, Math.max(0, p.wt.pos + h * 0.3)), wander: p.wt.wander * bw } : null;
  const osc = p.osc ? { ...p.osc, spread: (p.osc.spread ?? 0) * br, verstimmung: p.osc.verstimmung >= 1200 ? p.osc.verstimmung : p.osc.verstimmung * (0.5 + 0.5 * al) } : null;
  const ss = p.ss ? { ...p.ss, spread: p.ss.spread * br } : null;
  return { ...p, filter: f, lfo, tape, fm, wt, osc, ss, drift: p.drift * al, chorus: Math.min(1, p.chorus * br), breite: Math.min(1, p.breite * br), amp: { ...p.amp } };
}

/** eine Note rechnen → [L, R] */
function note(p, rate, { frequenz, dauer, staerke = 0.8, gleitVon = null, legato = false, beginn = 0, seed = 1, bpm = 100 }) {
  const rnd = zufall(seed), akz = p.akzent && staerke >= 0.95 ? 1 : 0, vel = Math.min(1.2, staerke);
  const amp = huellkurve(p.amp, rate, dauer, { legato }), n = amp.length;
  // die Filterhüllkurve so lang wie die Lautstärkehüllkurve (ihr Ausklang kann kürzer sein): danach bleibt sie auf ihrem letzten Wert
  const fe0 = huellkurve(akz ? { ...p.fenv, d: p.fenv.d * 0.6 } : p.fenv, rate, dauer, { legato }), fe = new Float32Array(n); fe.set(fe0.subarray(0, n)); if (fe0.length < n) fe.fill(fe0[fe0.length - 1] ?? 0, fe0.length);
  const L = new Float32Array(n), R = new Float32Array(n);
  const gz = (p.gleitZeit ?? 0.05) * rate, r0 = gleitVon ? Math.log(gleitVon / frequenz) : 0;
  const driftF = p.drift ? (() => { const a = (rnd() - 0.5) * 2, b = rnd() * TAU; return (t) => p.drift * (a * 0.6 + 0.4 * Math.sin(TAU * 0.13 * t + b)); })() : () => 0;
  const lfoRate = p.lfo.takt ? (bpm / 60) * (p.lfo.takt / 4) / 4 : p.lfo.rate;   // takt: Schritte je Takt (z. B. 16 = Sechzehntel)
  const fil = [new SVF(), new SVF(), new SVF(), new SVF()], res = p.filter.res;
  const vok = p.vokal ? [new SVF().setze(700, 6, rate), new SVF().setze(1150, 7, rate), new SVF().setze(700, 6, rate), new SVF().setze(1150, 7, rate)] : null;
  // Oszillatorzustände
  const uni = Math.max(1, p.osc?.unisono ?? 1), ph = Array.from({ length: 8 }, () => rnd()), ss = p.ss, ssPh = Array.from({ length: 7 }, () => rnd());
  let pf1 = rnd(), pf2 = rnd(), pfc = 0, fbAlt = 0, phSub = 0;
  const fmEnv1 = p.fm ? huellkurve({ a: 0.001, d: p.fm.d1, s: p.fm.s1, r: p.amp.r }, rate, dauer) : null, fmEnv2 = p.fm ? huellkurve({ a: 0.001, d: p.fm.d2, s: p.fm.s2, r: p.amp.r }, rate, dauer) : null;
  const ssDet = ss ? [-1, -0.62, -0.3, 0, 0.3, 0.62, 1].slice(0, ss.stimmen) : null;
  const rahmen = p.wt ? p.wt.rahmen.map((r) => RAHMEN[r]) : null, tab = new Float32Array(1024);
  // Steuerwerte (Gleiten, Drift, Wow/Flutter, LFO) alle 16 Abtastwerte: 3000 Mal je Sekunde reicht für die Tonhöhe und spart viel Rechenzeit
  let lfo = 0, f = frequenz, d = f / rate, tAbs = beginn;
  for (let i = 0; i < n; i++) {
    const t = i / rate;
    if ((i & 15) === 0) {
      tAbs = beginn + t;
      const gl = r0 ? Math.exp(r0 * Math.exp(-i / Math.max(1, gz / 4))) : 1;
      lfo = lfoRate ? Math.sin(TAU * lfoRate * tAbs) : 0;
      const cent = driftF(t) + wowFlutter(tAbs, p.tape.wow, p.tape.flutter) + (p.lfo.ton ?? 0) * lfo;
      f = frequenz * gl * 2 ** (cent / 1200); d = f / rate;
    }
    let l = 0, r = 0;
    if (p.verfahren === "analog") {
      const o = p.osc, pw = Math.min(0.95, Math.max(0.05, o.pw + (p.lfo.pwm ?? 0) * lfo * 0.4));
      for (let u = 0; u < uni; u++) {
        const det = uni > 1 ? ((u / (uni - 1)) * 2 - 1) * o.spread : 0, d1 = d * 2 ** (det / 1200), d2 = d * 2 ** ((det + o.verstimmung) / 1200);
        ph[u] = (ph[u] + d1) % 1; ph[u + 4] = (ph[u + 4] + d2) % 1;
        const x = (1 - o.mix) * welle(o.w1, ph[u], d1, pw) + o.mix * welle(o.w2, ph[u + 4], d2, pw), pan = uni > 1 ? (u / (uni - 1)) * 2 - 1 : 0;
        l += x * (1 - pan * 0.5); r += x * (1 + pan * 0.5);
      }
      l /= uni; r /= uni;
      phSub += (Math.PI * f) / rate; const sub = o.sub * Math.sin(phSub), nz = o.rauschen ? (rnd() * 2 - 1) * o.rauschen : 0;
      l += sub + nz; r += sub + nz;
    } else if (p.verfahren === "fm") {
      const m = p.fm, ve = vel ** m.vel, i1 = m.i1 * fmEnv1[i] * ve, i2 = m.i2 * fmEnv2[i] * ve;
      pf1 = (pf1 + d * m.r1) % 1; pf2 = (pf2 + d * m.r2) % 1; pfc = (pfc + d) % 1;
      const mod1 = Math.sin(TAU * pf1 + m.fb * fbAlt); fbAlt = mod1;
      const mod2 = Math.sin(TAU * pf2 + (m.algo === "stapel" ? 0 : 0));
      const x = m.algo === "stapel" ? Math.sin(TAU * pfc + i1 * Math.sin(TAU * pf1 + i2 * mod2 + m.fb * fbAlt)) : Math.sin(TAU * pfc + i1 * mod1 + i2 * mod2);
      const schlag = m.schlag && i < rate * 0.02 ? (rnd() * 2 - 1) * m.schlag * (1 - i / (rate * 0.02)) : 0;
      l = r = x + schlag;
    } else if (p.verfahren === "wavetable") {
      // eine Periode als Tabelle (1024 Werte), alle 2048 Abtastwerte aus den überblendeten Rahmen neu gebaut, nur Teiltöne unter Nyquist
      if (i % 2048 === 0) {
        const pos = Math.min(0.999, Math.max(0, p.wt.pos + p.wt.wander * 0.5 * (1 + Math.sin(TAU * 0.05 * tAbs + seed)))) * (rahmen.length - 1);
        const k0 = Math.floor(pos), fr = pos - k0, A = rahmen[k0], B = rahmen[Math.min(rahmen.length - 1, k0 + 1)], grenze = Math.min(T, Math.floor((rate * 0.45) / f));
        tab.fill(0); for (let k = 0; k < grenze; k++) { const a = A[k] + (B[k] - A[k]) * fr; if (a < 1e-4) continue; for (let j = 0; j < 1024; j++) tab[j] += a * SINUS[(j * (k + 1)) & 1023]; }
      }
      for (let u = 0; u < Math.min(2, uni); u++) {
        ph[u] = (ph[u] + d * 2 ** ((u ? p.osc.spread : -p.osc.spread) / 1200)) % 1;
        const x = ph[u] * 1024, j = Math.floor(x), f2 = x - j, y = tab[j & 1023] + (tab[(j + 1) & 1023] - tab[j & 1023]) * f2;
        if (u) r = 0.55 * y + 0.45 * l; else { l = y; r = y; }   // zweite Stimme nur teilweise getrennt: bleibt in Mono stabil
      }
      phSub += (Math.PI * f) / rate; const sub = (p.osc.sub ?? 0) * Math.sin(phSub); l += sub; r += sub;
    } else if (p.verfahren === "supersaw") {
      const norm = 1 / (ss.mitte + (1 - ss.mitte) * Math.sqrt(ss.stimmen - 1));
      for (let u = 0; u < ss.stimmen; u++) {
        const du = d * 2 ** ((ssDet[u] * ss.spread) / 1200); ssPh[u] = (ssPh[u] + du) % 1;
        const x = (2 * ssPh[u] - 1 - polyblep(ssPh[u], du)) * (ssDet[u] === 0 ? ss.mitte : 1 - ss.mitte) * norm, pan = ssDet[u];
        l += x * (1 - pan * 0.6); r += x * (1 + pan * 0.6);
      }
    } else if (p.verfahren === "orgel") {
      const z = p.orgel.zug, VER = [0.5, 1, 1.5, 2, 3, 4, 5, 6, 8];
      pfc = (pfc + d) % 2;   // Phase über zwei Perioden: der 16'-Zug (halbe Frequenz) bleibt stetig
      let x = 0; for (let k = 0; k < z.length; k++) if (z[k] && f * VER[k] < rate * 0.45) x += z[k] * Math.sin(TAU * pfc * VER[k]);
      const perk = p.orgel.perk * Math.exp(-t / 0.25) * Math.sin(TAU * pfc * 3), klick = i < rate * 0.004 ? (rnd() * 2 - 1) * p.orgel.klick : 0;
      l = r = (x / 3 + perk + klick);
    }
    // Filter: Grundfrequenz × Tonhöhenfolge × Hüllkurve × LFO
    if (i % 16 === 0) {
      const fc = Math.min(rate * 0.45, p.filter.f * (f / 261.6) ** p.filter.key * 2 ** ((p.filter.env * (1 + akz * 0.6)) * fe[i] * (0.4 + 0.6 * vel ** p.filter.vel) + (p.lfo.filter ?? 0) * lfo));
      const q1 = p.filter.typ === 24 ? 0.54 : 0.707 + res * 6, q2 = 1.31 + res * 7;
      fil[0].setze(fc, q1, rate); fil[1].setze(fc, q1, rate); fil[2].setze(fc, q2, rate); fil[3].setze(fc, q2, rate);
    }
    l = fil[0].schritt(l).tief; r = fil[1].schritt(r).tief;
    if (p.filter.typ === 24) { l = fil[2].schritt(l).tief; r = fil[3].schritt(r).tief; }
    if (vok) { l = l * 0.4 + vok[0].schritt(l).band * 1.5 + vok[1].schritt(l).band; r = r * 0.4 + vok[2].schritt(r).band * 1.5 + vok[3].schritt(r).band; }
    const a = amp[i] * (0.35 + 0.65 * vel) * (1 + akz * 0.4) * (p.lfo.amp ? 1 - p.lfo.amp * (0.5 + 0.5 * Math.sin(TAU * (p.lfo.rate || 4) * (beginn + t))) : 1);
    L[i] = l * a; R[i] = r * a;
  }
  return [L, R];
}

/** Spur-Nachbearbeitung: Bandrauschen, Sättigung, Chorus, Breite; danach auf eine Spitze von 0,5 gebracht */
function nachbearbeiten([L, R], rate, p, seed) {
  const rnd = zufall(seed ^ 0x51ed), n = L.length;
  if (p.tape.rauschen > 0) { const f = [new SVF().setze(5000, 0.5, rate), new SVF().setze(5200, 0.5, rate)]; for (let i = 0; i < n; i++) { L[i] += f[0].schritt(rnd() * 2 - 1).band * p.tape.rauschen; R[i] += f[1].schritt(rnd() * 2 - 1).band * p.tape.rauschen; } }
  if (p.tape.saettigung > 0) { const m = spitze(L, R) || 1, g = 10 ** (p.tape.saettigung / 20), gn = Math.tanh(g); for (let i = 0; i < n; i++) { L[i] = Math.tanh((L[i] / m) * g) / gn * m; R[i] = Math.tanh((R[i] / m) * g) / gn * m; } }
  if (p.chorus > 0) {   // zwei langsam bewegte Verzögerungen (7–14 ms), gegenphasig links und rechts
    const N = Math.ceil(0.03 * rate), bl = new Float32Array(N), br = new Float32Array(N), a = p.chorus;
    let w = 0;
    const lies = (b, d) => { const x = w - d, k = Math.floor(x), f = x - k, i0 = ((k % N) + N) % N, i1 = (i0 + 1) % N; return b[i0] * (1 - f) + b[i1] * f; };
    for (let i = 0; i < n; i++) {
      bl[w % N] = L[i]; br[w % N] = R[i];
      const m1 = (0.0105 + 0.0035 * Math.sin(TAU * 0.5 * i / rate)) * rate, m2 = (0.0105 + 0.0035 * Math.sin(TAU * 0.5 * i / rate + Math.PI)) * rate;
      const cl = lies(bl, m1), cr = lies(br, m2);
      L[i] = L[i] * (1 - a * 0.4) + cl * a * 0.7; R[i] = R[i] * (1 - a * 0.4) + cr * a * 0.7; w++;
    }
  }
  // Breite: Seitenanteil höchstens unverändert (nie über das Original hinaus verbreitert), damit Mono stabil bleibt
  const b = Math.min(1, 0.3 + 0.7 * p.breite); for (let i = 0; i < n; i++) { const m = (L[i] + R[i]) / 2, s = (L[i] - R[i]) / 2; L[i] = m + s * b; R[i] = m - s * b; }
  // Gleichanteil entfernen (Pulswellen mit ungleicher Breite tragen einen) und Rumpeln unter 30 Hz
  for (const k of [L, R]) { const h = new SVF().setze(30, 0.6, rate); for (let i = 0; i < n; i++) k[i] = h.schritt(k[i]).hoch; }
  const m = spitze(L, R) || 1; for (let i = 0; i < n; i++) { L[i] *= 0.5 / m; R[i] *= 0.5 / m; }
  return [L, R];
}

// ---------- Familien (Stimmen) mit Makros ----------
const MAKRO_TEXT = { helligkeit: "Filter (±1,6 Oktaven), bei FM der Modulationsindex, bei Wavetable die Lage im Spektrum", bewegung: "Tiefe aller LFOs und der Filterhüllkurve, Wandern im Wavetable", waerme: "Sättigung und etwas dunkleres Filter", alter: "Drift je Stimme, Band-Wow und -Flutter, Rauschen, Verstimmung", breite: "Unisono-Spreizung, Chorus, Stereobreite" };
const makros = (charakter, std = {}) => [
  P("helligkeit", "Helligkeit", "Makro", 0, 100, std.helligkeit ?? 50, "%"), P("bewegung", "Bewegung", "Makro", 0, 100, std.bewegung ?? 40, "%"),
  P("waerme", "Wärme", "Makro", 0, 100, std.waerme ?? 50, "%"), P("alter", "Alter", "Makro", 0, 100, std.alter ?? 30, "%"),
  P("breite", "Breite", "Makro", 0, 100, std.breite ?? 60, "%"), P("charakter", charakter.name, "Makro", 0, 100, std.charakter ?? 50, "%", { hilfe: charakter.hilfe }),
  P("oktave", "Lage", "Detail", -2, 2, 0, "Oktaven", { schritt: 1 }),
];
export const MAKROS = Object.freeze(Object.fromEntries(Object.entries({
  shadow: { name: "Spannung", hilfe: "Resonanz des Filters" }, tape: { name: "Glanz", hilfe: "FM-Index der Keys, Resonanz des Pads" }, glass: { name: "Metall", hilfe: "FM-Index: von weich zu gläsern-metallisch; beim Puls die Resonanz" },
  goa: { name: "Resonanz", hilfe: "Resonanz des Acid-Filters" }, trance: { name: "Biss", hilfe: "Resonanz" }, house: { name: "Biss", hilfe: "Resonanz" },
  machine: { name: "Resonanz", hilfe: "Resonanz" }, darkpop: { name: "Metall", hilfe: "FM-Index der Glocken, Resonanz des Brass" },
}).map(([k, c]) => [k, { ...MAKRO_TEXT, charakter: c.hilfe, charakterName: c.name }])));

const FAMILIEN = [
  { key: "shadow", name: "Shadow Dub", patches: ["shadowChord", "deepRoomDrone"], std: { helligkeit: 35, waerme: 65 } },
  { key: "tape", name: "Tape Memory", patches: ["amberMemory", "wornKeys"], std: { alter: 60, helligkeit: 40, waerme: 60 } },
  { key: "glass", name: "Glass Circuit", patches: ["glassKeys", "restlessPulse"], std: { helligkeit: 55 } },
  { key: "goa", name: "Spiral Goa", patches: ["spiralAcid", "liquidArp"], std: { helligkeit: 45, charakter: 60, alter: 0 } },
  { key: "trance", name: "Open Trance", patches: ["openSky", "crystalPluck"], std: { helligkeit: 60, breite: 80, alter: 0 } },
  { key: "house", name: "House Motion", patches: ["velvetOrgan", "warmStab"], std: { helligkeit: 50, alter: 10 } },
  { key: "machine", name: "Machine Pop", patches: ["motorPulse", "machineStrings"], std: { alter: 0, bewegung: 30 } },
  { key: "darkpop", name: "Dark Pop", patches: ["darkBrass", "industrialBell"], std: { helligkeit: 40, waerme: 60 } },
];
const stimme = (f) => {
  const c = MAKROS[f.key];
  return {
    key: f.key, name: f.name, rolle: "synth", pan: 0, pegel: -4,
    parameter: [{ key: "patch", name: "Preset", gruppe: "Detail", wahl: f.patches.map((k) => ({ wert: k, name: PATCHES[k].name })), std: f.patches[0] }, ...makros({ name: c.charakterName, hilfe: c.charakter }, f.std)],
    varianten: f.patches.flatMap((k) => { const p = PATCHES[k]; return [
      { name: p.name, beschreibung: `${p.rolle}, ${p.verfahren}${p.poly ? ", polyphon" : ", einstimmig"}`, werte: { patch: k } },
      { name: `${p.name} · dunkler`, beschreibung: "weniger Helligkeit, mehr Wärme und Alter", werte: { patch: k, helligkeit: Math.max(0, (f.std.helligkeit ?? 50) - 25), waerme: 80, alter: Math.min(100, (f.std.alter ?? 30) + 25) } },
    ]; }).concat(f.patches.length ? [{ name: `${PATCHES[f.patches[0]].name} · weit bewegt`, beschreibung: "viel Bewegung und Breite", werte: { patch: f.patches[0], bewegung: 85, breite: 95 } }] : []),
    /** einstimmig (Legato, Gleiten) oder polyphon, je nach Preset */
    poly: (w) => PATCHES[w.patch]?.poly !== false,
    rolleVon: (w) => PATCHES[w.patch]?.rolle,
    rechne(w, rate, o) { const p = wirksam(PATCHES[w.patch] ?? PATCHES[f.patches[0]], w); return note(p, rate, o); },
    nach(k, rate, w, seed) { const p = wirksam(PATCHES[w.patch] ?? PATCHES[f.patches[0]], w); return nachbearbeiten(k, rate, p, seed); },
    oktaveVon: (w) => (PATCHES[w.patch]?.oktave ?? 3) + (w.oktave ?? 0),
  };
};

export default {
  id: "synth", version: "0.1.0", name: "Synth", melodisch: true,
  beschreibung: "Synthesizerspuren: Shadow Dub, Tape Memory, Glass Circuit, Spiral Goa, Open Trance, House Motion, Machine Pop, Dark Pop.",
  stimmen: Object.fromEntries(FAMILIEN.map((f) => [f.key, stimme(f)])),
};
export const FAMILIEN_LISTE = FAMILIEN;
/** für die Tests: die Hüllkurve (Legato beginnt auf dem Haltepegel) */
export const _huellkurve = huellkurve;
