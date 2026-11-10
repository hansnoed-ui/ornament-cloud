// Synth 0.2.0 – musikalische Synthesizerspuren: eine gemeinsame Engine mit sieben Verfahren, elf Klangfamilien, 24 Presets und sechs
// Klangcharakteren (warm, weich, fiepsend, strahlen-flächig, knarzend, hallig-glänzend). Auftrag: synthesizer.md, 10. November 2026.
//
// Verfahren (alle im selben Notenweg: Tonhöhe → Oszillator → Filter → Hüllkurve, danach Spur-Nachbearbeitung):
//   analog     zwei Oszillatoren (Sägezahn, Puls mit Pulsbreite, Dreieck, Sinus; bandbegrenzt mit PolyBLEP), Sub, Rauschen, Unisono,
//              dazu Atem (Rauschen als Band um den Grundton: Flöte, Chor) und ein Vokalfilter, das zwischen Vokalen wandern kann
//   fm         drei Operatoren (Phasenmodulation): Träger + zwei Modulatoren, parallel oder gestapelt, Rückkopplung am ersten Modulator;
//              Anschlag und eine eigene Hüllkurve steuern den Modulationsindex. Keine DX7-Emulation.
//   wavetable  Rahmen aus Teiltonspektren (je bis 40 Teiltöne), stufenlos überblendet; je Note nur Teiltöne unter der Nyquistgrenze
//   supersaw   sieben gegeneinander verstimmte Sägezähne mit Pegelausgleich, im Stereo verteilt
//   orgel      Zugriegel (Teiltöne 1/2 bis 8), Tastenklick, Perkussion
//   saite      neu: gezupfte Saite (Karplus-Strong) mit Steg, der bei grosser Auslenkung schnarrt (Jawari-artig: die Obertöne wandern beim
//              Ausklingen), einer zweiten, leicht verstimmten Saite, mitschwingenden Saiten (Resonatoren) und Gleiten (Meend)
//   glocke     neu: additive Synthese mit unharmonischen Teiltönen, jeder mit eigener Abklingzeit (Spieldose, Celesta, Glocken)
// Spur-Nachbearbeitung: gemeinsames Wow/Flutter, Drift je Stimme, Bandrauschen, Sättigung, Chorus, Stereobreite wie in 0.1.0; neu:
// Knistern (Vinyl, Mikro-Klicks), Bitcrusher, Wavefolder, Wärme um 250 Hz, Schimmer (Oktave hoch im Hall), Glanzhall mit Vorverzögerung,
// Fiepen (kleine hohe Figuren in den Lücken der Spur). Hall und Schimmer rechnen die Schleife zweimal: kein Abriss an der Naht.
//
// Die zwölf Patches aus 0.1.0, die nicht ausdrücklich überarbeitet sind, klingen bitgleich wie in 0.1.0 (Test). Überarbeitet (Urteil
// 9.11.2026: «am schlimmsten die Glass Keys und die Keys allgemein»): Glass Circuit Keys und Worn Electric Keys.
//
// Die Zuordnung der Familien zu Künstlern ist ein gestalterischer Auftrag (synthesizer.md), keine Behauptung über deren Geräte oder Patches.
// Nach der Veröffentlichung nicht mehr verändern; neue Klänge in synth-0.3.0.js.

import { zufall, SVF, TAU, spitze, hash, moden } from "./grund.js";

const P = (key, name, gruppe, min, max, std, einheit = "", mehr = {}) => ({ key, name, gruppe, min, max, std, einheit, ...mehr });

// ---------- Patches (Grundklang je Preset; die Makros verschieben ihn) ----------
const ADSR = (a, d, s, r) => ({ a, d, s, r });
export const PATCHES = Object.freeze({
  // Shadow Dub – Massive Attack als gestalterische Richtung: dunkle Akkorde, gefilterte Anschläge, kontrollierte Sättigung
  shadowChord: { name: "Shadow Chord", familie: "shadow", rolle: "pad", verfahren: "analog", poly: true, oktave: 3, charaktere: ["warm", "knarzend"],
    osc: { w1: "saege", w2: "puls", pw: 0.42, mix: 0.45, verstimmung: 7, sub: 0.2, rauschen: 0.02, unisono: 2, spread: 6 },
    filter: { typ: 24, f: 520, res: 0.18, env: 1.1, key: 0.3, vel: 0.4 }, fenv: ADSR(0.06, 1.4, 0.25, 1.2), amp: ADSR(0.04, 1.2, 0.8, 1.6),
    lfo: { rate: 0.2, ton: 3, filter: 0.15, pwm: 0.08 }, drift: 3, tape: { wow: 4, flutter: 0, rauschen: 0.002, saettigung: 4 }, chorus: 0.25, breite: 0.6, echo: 0.25 },
  deepRoomDrone: { name: "Deep Room Drone", familie: "shadow", rolle: "drone", verfahren: "wavetable", poly: true, oktave: 2, charaktere: ["warm", "weich"],
    wt: { rahmen: ["dunkel", "hohl", "glas"], pos: 0.1, wander: 0.5 }, osc: { sub: 0.35, unisono: 2, spread: 5 },
    filter: { typ: 24, f: 420, res: 0.3, env: 0.4, key: 0.2, vel: 0.1 }, fenv: ADSR(2, 4, 0.6, 4), amp: ADSR(2.5, 3, 0.9, 4),
    lfo: { rate: 0.07, ton: 2, filter: 0.4 }, drift: 4, tape: { wow: 2, flutter: 0, rauschen: 0.003, saettigung: 6 }, chorus: 0.2, breite: 0.8, echo: 0.15 },
  // Tape Memory – Boards of Canada als Richtung: warm, instabil, abgedunkelt
  amberMemory: { name: "Amber Memory Pad", familie: "tape", rolle: "pad", verfahren: "analog", poly: true, oktave: 3, charaktere: ["warm", "weich"],
    osc: { w1: "puls", w2: "saege", pw: 0.5, mix: 0.35, verstimmung: 9, sub: 0.1, rauschen: 0.01, unisono: 2, spread: 8 },
    filter: { typ: 12, f: 1300, res: 0.1, env: 0.5, key: 0.4, vel: 0.2 }, fenv: ADSR(0.8, 2.5, 0.6, 2), amp: ADSR(0.9, 2, 0.85, 2.4),
    lfo: { rate: 0.35, ton: 2, filter: 0.1, pwm: 0.3 }, drift: 7, tape: { wow: 14, flutter: 3, rauschen: 0.012, saettigung: 6 }, chorus: 0.45, breite: 0.7, echo: 0.15 },
  // überarbeitet in 0.2.0: wärmer und runder (weniger Zinke, längeres Ausklingen, sanftes Tremolo, leichtes Knistern)
  wornKeys: { name: "Worn Electric Keys", familie: "tape", rolle: "offbeat", verfahren: "fm", poly: true, oktave: 3, charaktere: ["warm", "knarzend"],
    fm: { algo: "parallel", r1: 1, i1: 1.2, d1: 1.3, s1: 0.18, r2: 14, i2: 0.22, d2: 0.04, s2: 0, fb: 0.03, vel: 1.3 },
    filter: { typ: 12, f: 2200, res: 0, env: 0, key: 0.5, vel: 0.35 }, fenv: ADSR(0.01, 1, 1, 1), amp: ADSR(0.004, 3.2, 0.2, 0.6),
    lfo: { rate: 4.5, amp: 0.12 }, drift: 5, tape: { wow: 12, flutter: 4, rauschen: 0.01, saettigung: 5 }, chorus: 0.3, breite: 0.5, echo: 0.2, knistern: 0.15, waerme250: 0.3 },
  // Glass Circuit – Radiohead/Thom Yorke als Richtung: gläserne FM-Töne, Poly-Keys, rhythmische Modulation
  // überarbeitet in 0.2.0: harmonischer Modulator (2 statt 3,5: weniger Klirren), weicherer Anschlag, längerer gläserner Ausklang im Raum
  glassKeys: { name: "Glass Circuit Keys", familie: "glass", rolle: "spitzen", verfahren: "fm", poly: true, oktave: 4, charaktere: ["hallig", "weich"],
    fm: { algo: "parallel", r1: 2, i1: 1.3, d1: 0.7, s1: 0.12, r2: 1, i2: 0.45, d2: 1.8, s2: 0.3, fb: 0, vel: 1.2 },
    filter: { typ: 12, f: 4200, res: 0, env: 0, key: 0.3, vel: 0.3 }, fenv: ADSR(0.01, 1, 1, 1), amp: ADSR(0.008, 2.6, 0.22, 1.2),
    lfo: { rate: 0.3, ton: 2 }, drift: 2, tape: { wow: 3, flutter: 1, rauschen: 0.002, saettigung: 2 }, chorus: 0.3, breite: 0.6, echo: 0.3, hall: 0.3 },
  restlessPulse: { name: "Restless Poly Pulse", familie: "glass", rolle: "chord", verfahren: "analog", poly: true, oktave: 3, charaktere: ["knarzend"],
    osc: { w1: "puls", w2: "puls", pw: 0.3, mix: 0.5, verstimmung: 5, sub: 0, rauschen: 0, unisono: 1, spread: 0 },
    filter: { typ: 24, f: 900, res: 0.35, env: 1.5, key: 0.4, vel: 0.5 }, fenv: ADSR(0.005, 0.25, 0.2, 0.3), amp: ADSR(0.005, 0.5, 0.6, 0.35),
    lfo: { rate: 0, takt: 16, filter: 0.9, pwm: 0.2 }, drift: 2, tape: { wow: 2, flutter: 0, rauschen: 0, saettigung: 3 }, chorus: 0.15, breite: 0.4, echo: 0.3 },
  // Spiral Goa – ineinandergreifende Sequenzen, Acid, Plucks
  spiralAcid: { name: "Spiral Acid Lead", familie: "goa", rolle: "acid", verfahren: "analog", poly: false, oktave: 2, charaktere: ["knarzend"],
    osc: { w1: "saege", w2: "saege", pw: 0.5, mix: 0, verstimmung: 0, sub: 0, rauschen: 0, unisono: 1, spread: 0 },
    filter: { typ: 24, f: 260, res: 0.72, env: 3.2, key: 0.2, vel: 0.3 }, fenv: ADSR(0.002, 0.22, 0, 0.1), amp: ADSR(0.002, 0.4, 0.75, 0.04),
    akzent: 1, gleitZeit: 0.06, lfo: { rate: 0, ton: 0 }, drift: 0, tape: { wow: 0, flutter: 0, rauschen: 0, saettigung: 9 }, chorus: 0, breite: 0.1, echo: 0.25 },
  liquidArp: { name: "Liquid Resonance Arp", familie: "goa", rolle: "arp", verfahren: "analog", poly: true, oktave: 3, charaktere: ["fiepsend", "hallig"],
    osc: { w1: "saege", w2: "puls", pw: 0.25, mix: 0.4, verstimmung: 4, sub: 0, rauschen: 0, unisono: 1, spread: 0 },
    filter: { typ: 24, f: 500, res: 0.6, env: 2.4, key: 0.5, vel: 0.5 }, fenv: ADSR(0.001, 0.12, 0.05, 0.1), amp: ADSR(0.001, 0.18, 0.1, 0.12),
    lfo: { rate: 0, takt: 64, filter: 1.2 }, drift: 0, tape: { wow: 0, flutter: 0, rauschen: 0, saettigung: 4 }, chorus: 0.1, breite: 0.5, echo: 0.4 },
  // Open Trance – Supersaw, Plucks
  openSky: { name: "Open Sky Saw", familie: "trance", rolle: "pad", verfahren: "supersaw", poly: true, oktave: 3, charaktere: ["strahlend"],
    ss: { stimmen: 7, spread: 22, mitte: 0.6 }, filter: { typ: 12, f: 4500, res: 0.05, env: 0.3, key: 0.3, vel: 0.2 }, fenv: ADSR(0.3, 2, 0.8, 1.5), amp: ADSR(0.25, 1, 0.9, 1.2),
    lfo: { rate: 0.15, filter: 0.15 }, drift: 0, tape: { wow: 0, flutter: 0, rauschen: 0, saettigung: 2 }, chorus: 0, breite: 0.9, echo: 0.2 },
  crystalPluck: { name: "Crystal Trance Pluck", familie: "trance", rolle: "pluck", verfahren: "supersaw", poly: true, oktave: 4, charaktere: ["strahlend", "hallig"],
    ss: { stimmen: 5, spread: 14, mitte: 0.7 }, filter: { typ: 24, f: 900, res: 0.2, env: 3, key: 0.4, vel: 0.5 }, fenv: ADSR(0.001, 0.18, 0, 0.15), amp: ADSR(0.001, 0.35, 0, 0.2),
    lfo: { rate: 0 }, drift: 0, tape: { wow: 0, flutter: 0, rauschen: 0, saettigung: 2 }, chorus: 0, breite: 0.8, echo: 0.45 },
  // House Motion – Orgel-Akkorde, Stabs
  velvetOrgan: { name: "Velvet Organ Chord", familie: "house", rolle: "chord", verfahren: "orgel", poly: true, oktave: 3, charaktere: ["warm"],
    orgel: { zug: [0.6, 1, 0.5, 0.7, 0.3, 0.25, 0, 0.1, 0.15], klick: 0.25, perk: 0.3 }, filter: { typ: 12, f: 5000, res: 0, env: 0, key: 0, vel: 0 }, fenv: ADSR(0.01, 1, 1, 1), amp: ADSR(0.003, 0.4, 0.7, 0.12),
    lfo: { rate: 6.2, ton: 4 }, drift: 0, tape: { wow: 0, flutter: 0, rauschen: 0, saettigung: 5 }, chorus: 0.4, breite: 0.5, echo: 0.1 },
  warmStab: { name: "Warm House Stab", familie: "house", rolle: "chord", verfahren: "analog", poly: true, oktave: 3, charaktere: ["warm"],
    osc: { w1: "saege", w2: "saege", pw: 0.5, mix: 0.5, verstimmung: 10, sub: 0.1, rauschen: 0, unisono: 1, spread: 0 },
    filter: { typ: 24, f: 650, res: 0.25, env: 2, key: 0.4, vel: 0.6 }, fenv: ADSR(0.003, 0.28, 0.1, 0.2), amp: ADSR(0.003, 0.35, 0.3, 0.18),
    lfo: { rate: 0 }, drift: 1, tape: { wow: 0, flutter: 0, rauschen: 0, saettigung: 5 }, chorus: 0.3, breite: 0.5, echo: 0.2 },
  // Machine Pop – Kraftwerk als Richtung: präzise Pulse, synthetische Streicher, vokalartige Resonanz
  motorPulse: { name: "Motor Pulse", familie: "machine", rolle: "puls", verfahren: "analog", poly: false, oktave: 2, charaktere: [],
    osc: { w1: "puls", w2: "puls", pw: 0.5, mix: 0.3, verstimmung: 1200, sub: 0, rauschen: 0, unisono: 1, spread: 0 },
    filter: { typ: 24, f: 1100, res: 0.15, env: 1, key: 0.5, vel: 0.2 }, fenv: ADSR(0.001, 0.12, 0.3, 0.05), amp: ADSR(0.001, 0.15, 0.6, 0.04),
    gleitZeit: 0, lfo: { rate: 0 }, drift: 0, tape: { wow: 0, flutter: 0, rauschen: 0, saettigung: 2 }, chorus: 0, breite: 0.2, echo: 0.2 },
  machineStrings: { name: "Machine Strings", familie: "machine", rolle: "pad", verfahren: "analog", poly: true, oktave: 3, charaktere: ["strahlend", "weich"],
    osc: { w1: "saege", w2: "saege", pw: 0.5, mix: 0.5, verstimmung: 12, sub: 0, rauschen: 0, unisono: 2, spread: 10 }, vokal: "a",
    filter: { typ: 12, f: 3000, res: 0, env: 0.2, key: 0.3, vel: 0.1 }, fenv: ADSR(0.4, 1, 0.9, 1), amp: ADSR(0.45, 1, 0.9, 1.1),
    lfo: { rate: 5, ton: 5 }, drift: 2, tape: { wow: 0, flutter: 0, rauschen: 0, saettigung: 2 }, chorus: 0.6, breite: 0.8, echo: 0.1 },
  // Dark Pop – Depeche Mode als Richtung: markante Analog-Akkorde, metallische Anschläge
  darkBrass: { name: "Dark Brass", familie: "darkpop", rolle: "chord", verfahren: "analog", poly: true, oktave: 3, charaktere: ["warm", "knarzend"],
    osc: { w1: "saege", w2: "saege", pw: 0.5, mix: 0.5, verstimmung: 8, sub: 0.15, rauschen: 0.01, unisono: 1, spread: 0 },
    filter: { typ: 24, f: 420, res: 0.15, env: 2.2, key: 0.4, vel: 0.6 }, fenv: ADSR(0.09, 0.6, 0.45, 0.4), amp: ADSR(0.03, 0.8, 0.8, 0.45),
    lfo: { rate: 5.5, ton: 3 }, drift: 2, tape: { wow: 0, flutter: 0, rauschen: 0, saettigung: 8 }, chorus: 0.2, breite: 0.5, echo: 0.2 },
  industrialBell: { name: "Industrial Bell Keys", familie: "darkpop", rolle: "keys", verfahren: "fm", poly: true, oktave: 4, charaktere: ["hallig", "knarzend"],
    fm: { algo: "stapel", r1: 1.41, i1: 3, d1: 0.5, s1: 0.2, r2: 3.73, i2: 1.6, d2: 0.15, s2: 0, fb: 0.2, vel: 1, schlag: 0.25 },
    filter: { typ: 12, f: 5500, res: 0, env: 0, key: 0.2, vel: 0.2 }, fenv: ADSR(0.01, 1, 1, 1), amp: ADSR(0.001, 2.2, 0.05, 1),
    lfo: { rate: 0 }, drift: 1, tape: { wow: 0, flutter: 0, rauschen: 0, saettigung: 5 }, chorus: 0.1, breite: 0.5, echo: 0.35 },
  // Glass Circuit (neu in 0.2.0): fiepsend, kleine Funksignale mit Pitch-Sweep von unten, gezähmt
  signalSparrow: { name: "Signal Sparrow", familie: "glass", rolle: "spitzen", verfahren: "analog", poly: false, oktave: 5, charaktere: ["fiepsend"],
    osc: { w1: "sinus", w2: "puls", pw: 0.2, mix: 0.15, verstimmung: 0, sub: 0, rauschen: 0, unisono: 1, spread: 0 },
    filter: { typ: 12, f: 3800, res: 0.15, env: 0.8, key: 0.2, vel: 0.3 }, fenv: ADSR(0.002, 0.1, 0.2, 0.06), amp: ADSR(0.003, 0.14, 0.35, 0.09),
    gleitZeit: 0.03, ausdruck: { vib: 25, vibRate: 9, verzug: 0.05, scoop: 380, scoopZeit: 0.025 },
    lfo: { rate: 0 }, drift: 2, tape: { wow: 0, flutter: 0, rauschen: 0, saettigung: 0 }, chorus: 0, breite: 0.5, echo: 0.5, hall: 0.3 },
  // Velvet Dub – Kruder & Dorfmeister als Richtung: sehr warm und weich, gedämpfte Jazz-Akkorde, Dub-Echo, entspannt hinter dem Schlag
  velvetRhodes: { name: "Velvet Rhodes Haze", familie: "velvet", rolle: "offbeat", verfahren: "fm", poly: true, oktave: 3, charaktere: ["warm", "weich"],
    fm: { algo: "parallel", r1: 1, i1: 1.25, d1: 1.4, s1: 0.2, r2: 14, i2: 0.3, d2: 0.035, s2: 0, fb: 0, vel: 1.8 },
    filter: { typ: 12, f: 2400, res: 0.05, env: 0.3, key: 0.4, vel: 0.5 }, fenv: ADSR(0.005, 0.8, 0.6, 0.6), amp: ADSR(0.003, 3.4, 0.22, 0.7),
    lfo: { rate: 4.2, amp: 0.2 }, drift: 3, tape: { wow: 5, flutter: 1, rauschen: 0.004, saettigung: 5 }, chorus: 0.35, breite: 0.7, echo: 0.35,
    knistern: 0.12, waerme250: 0.4, hall: 0.12 },
  smokedFlute: { name: "Smoked Flute Echo", familie: "velvet", rolle: "ruf", verfahren: "analog", poly: false, oktave: 4, charaktere: ["weich", "knarzend"],
    osc: { w1: "sinus", w2: "dreieck", pw: 0.5, mix: 0.25, verstimmung: 4, sub: 0, rauschen: 0, unisono: 1, spread: 0 }, atem: 0.22,
    filter: { typ: 12, f: 1900, res: 0.05, env: 0.4, key: 0.6, vel: 0.4 }, fenv: ADSR(0.08, 0.6, 0.7, 0.4), amp: ADSR(0.07, 0.5, 0.85, 0.35),
    gleitZeit: 0.09, ausdruck: { vib: 18, vibRate: 5.2, verzug: 0.35, scoop: 45, scoopZeit: 0.07 },
    lfo: { rate: 0.2, filter: 0.1 }, drift: 3, tape: { wow: 3, flutter: 0, rauschen: 0.003, saettigung: 3 }, chorus: 0.1, breite: 0.4, echo: 0.5, knistern: 0.2 },
  // Raga Drift – Talvin Singh als Richtung: Tanpura-artiger Drone, sitarartige Leads mit Meend; raga-inspiriert, keine Raga-Praxis
  tanpuraGlow: { name: "Tanpura Glow Drone", familie: "raga", rolle: "tanpura", verfahren: "saite", poly: true, oktave: 2, charaktere: ["warm", "strahlend"],
    saite: { t60: 7, daempf: 0.22, hell: 0.55, jawari: 0.55, saiten: 2, verstimm: 2.5, taraf: [], tarafMix: 0 },
    filter: { typ: 12, f: 5200, res: 0, env: 0, key: 0, vel: 0.2 }, fenv: ADSR(0.01, 1, 1, 1), amp: ADSR(0.002, 9, 0.9, 1.6),
    lfo: { rate: 0 }, drift: 1, tape: { wow: 0, flutter: 0, rauschen: 0, saettigung: 3 }, chorus: 0.1, breite: 0.7, echo: 0.1, schimmer: 0.15, waerme250: 0.2 },
  sitarGlide: { name: "Sitar Glide Lead", familie: "raga", rolle: "alap", verfahren: "saite", poly: false, oktave: 3, charaktere: ["hallig", "knarzend"],
    saite: { t60: 2.8, daempf: 0.1, hell: 0.85, jawari: 0.7, saiten: 1, verstimm: 0, taraf: [1, 1.5, 2, 3], tarafMix: 0.3 },
    filter: { typ: 12, f: 6500, res: 0, env: 0, key: 0, vel: 0.3 }, fenv: ADSR(0.01, 1, 1, 1), amp: ADSR(0.002, 3, 0.6, 0.25),
    gleitZeit: 0.2, ausdruck: { vib: 12, vibRate: 5.5, verzug: 0.5, scoop: 0, scoopZeit: 0.05 },
    lfo: { rate: 0 }, drift: 1, tape: { wow: 0, flutter: 0, rauschen: 0, saettigung: 4 }, chorus: 0, breite: 0.5, echo: 0.3, hall: 0.2 },
  // Ice Organism – Björk als Richtung: Spieldose und Glas in kristallinem Glanz, atmende Chorflächen, knisternde Mikro-Beats
  musicBoxFrost: { name: "Music Box Frost", familie: "ice", rolle: "spitzen", verfahren: "glocke", poly: true, oktave: 4, charaktere: ["hallig", "fiepsend"],
    glocke: { teile: [[1, 1, 1], [2.756, 0.32, 0.45], [5.404, 0.16, 0.22], [8.933, 0.07, 0.12], [3.01, 0.12, 0.6]], t60: 2.6, anschlag: 0.0004, klick: 0.08 },
    filter: { typ: 12, f: 9000, res: 0, env: 0, key: 0, vel: 0.3 }, fenv: ADSR(0.01, 1, 1, 1), amp: ADSR(0.001, 10, 0.9, 1.5),
    lfo: { rate: 0 }, drift: 0, tape: { wow: 0, flutter: 0, rauschen: 0, saettigung: 0 }, chorus: 0.15, breite: 0.7, echo: 0.2, hall: 0.45, schimmer: 0.15 },
  breathingChoir: { name: "Breathing Choir Pad", familie: "ice", rolle: "flaeche", verfahren: "analog", poly: true, oktave: 3, charaktere: ["strahlend", "weich"],
    osc: { w1: "saege", w2: "puls", pw: 0.5, mix: 0.3, verstimmung: 8, sub: 0, rauschen: 0, unisono: 3, spread: 12 }, atem: 0.12,
    vokal: "a", vokalWeg: ["o", "a", "e"], vokalRate: 0.07,
    filter: { typ: 12, f: 2400, res: 0, env: 0.3, key: 0.3, vel: 0.1 }, fenv: ADSR(1.5, 3, 0.8, 2.5), amp: ADSR(1.4, 2, 0.9, 2.8),
    lfo: { rate: 0.12, amp: 0.25, filter: 0.2 }, drift: 3, tape: { wow: 0, flutter: 0, rauschen: 0, saettigung: 2 }, chorus: 0.5, breite: 0.9, echo: 0.1, schimmer: 0.35 },
  crackleGlass: { name: "Crackle Glass Texture", familie: "ice", rolle: "offbeat", verfahren: "fm", poly: true, oktave: 4, charaktere: ["knarzend", "hallig", "fiepsend"],
    fm: { algo: "parallel", r1: 2, i1: 1.2, d1: 0.12, s1: 0, r2: 7.1, i2: 0.8, d2: 0.05, s2: 0, fb: 0, vel: 1 },
    filter: { typ: 12, f: 7000, res: 0, env: 0, key: 0.2, vel: 0.3 }, fenv: ADSR(0.01, 1, 1, 1), amp: ADSR(0.001, 0.5, 0, 0.3),
    lfo: { rate: 0 }, drift: 0, tape: { wow: 0, flutter: 0, rauschen: 0, saettigung: 2 }, chorus: 0.1, breite: 0.6, echo: 0.3, knistern: 0.8, crush: 0.35, hall: 0.35 },
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

// ---------- Vokale (Formanten F1, F2 in Hz) ----------
const FORMANTE = { a: [700, 1150], o: [450, 800], u: [330, 700], e: [450, 1850], i: [320, 2300] };

// ---------- Klangcharaktere ----------
/** die sechs Klangcharaktere (synthesizer.md, Abschnitt 0): als Schlagwort je Preset und als Färbung, die jedes Preset dorthin schiebt */
export const CHARAKTERE = Object.freeze([
  { key: "warm", name: "warm", hilfe: "Filter dunkler und flacher, Sättigung, etwas mehr Verstimmung, Betonung um 250 Hz, Chorus" },
  { key: "weich", name: "weich", hilfe: "langsamer Einsatz und Ausklang, weniger Filterhüllkurve und Resonanz, kleiner FM-Index, Chorus" },
  { key: "fiepsend", name: "fiepsend", hilfe: "kleine hohe Figuren mit Tonhöhen-Sweeps in den Lücken der Spur, leise und gezähmt" },
  { key: "strahlend", name: "strahlen-flächig", hilfe: "mehr Unisono und Spreizung, langsam öffnendes Filter, längere Hüllkurven, Schimmer (Oktave hoch im Hall)" },
  { key: "knarzend", name: "knarzend", hilfe: "Vinyl-Knistern und Mikro-Klicks, Bitcrusher, Wavefolder, mehr Resonanz, Drift" },
  { key: "hallig", name: "hallig-glänzend", hilfe: "glänzender Hall mit Vorverzögerung, etwas heller, gläserner (FM)" },
]);
/** eine Färbung (Klangcharakter) mit Menge m (0–1) auf einen wirksamen Patch legen */
function faerben(r, art, m) {
  const f = r.filter;
  if (art === "warm") {
    f.f *= 2 ** (-0.9 * m); f.res *= 1 - 0.5 * m; r.tape.saettigung += 5 * m; r.chorus = Math.min(1, r.chorus + 0.15 * m); r.waerme250 = (r.waerme250 ?? 0) + 0.6 * m;
    if (r.osc && r.osc.verstimmung < 1200) r.osc.verstimmung *= 1 + 0.5 * m;
    if (r.fm) { r.fm.i1 *= 1 - 0.3 * m; r.fm.i2 *= 1 - 0.3 * m; }
  } else if (art === "weich") {
    r.amp.a = Math.max(r.amp.a, 0.02 + 0.35 * m); r.amp.r *= 1 + 1.2 * m; r.fenv = { ...r.fenv, a: Math.max(r.fenv.a, 0.3 * m) };
    f.env *= 1 - 0.6 * m; f.res *= 1 - 0.8 * m; r.chorus = Math.min(1, r.chorus + 0.3 * m);
    if (r.fm) { r.fm.i1 *= 1 - 0.5 * m; r.fm.i2 *= 1 - 0.5 * m; }
    if (r.saite) r.saite = { ...r.saite, hell: r.saite.hell * (1 - 0.5 * m), jawari: r.saite.jawari * (1 - 0.6 * m) };
  } else if (art === "fiepsend") r.fiep = (r.fiep ?? 0) + m;
  else if (art === "strahlend") {
    r.schimmer = (r.schimmer ?? 0) + 0.6 * m; f.f = Math.min(16000, f.f * 2 ** (0.5 * m)); f.env += 0.8 * m;
    r.fenv = { ...r.fenv, a: r.fenv.a + 1.5 * m }; r.amp.a += 0.4 * m; r.breite = Math.min(1, r.breite + 0.3 * m);
    if (r.osc) r.osc = { ...r.osc, unisono: Math.min(4, Math.max(r.osc.unisono ?? 1, 2 + Math.round(2 * m))), spread: Math.max(r.osc.spread ?? 0, 6) * (1 + m) };
    if (r.ss) r.ss.spread *= 1 + 0.5 * m;
  } else if (art === "knarzend") {
    r.knistern = (r.knistern ?? 0) + 0.7 * m; r.crush = Math.min(1, (r.crush ?? 0) + 0.35 * m); r.falten = Math.min(1, (r.falten ?? 0) + 0.3 * m);
    f.res = Math.min(0.85, f.res + 0.25 * m); r.tape.rauschen += 0.004 * m; r.drift += 4 * m;
  } else if (art === "hallig") {
    r.hall = Math.min(1, (r.hall ?? 0) + 0.7 * m); f.f = Math.min(16000, f.f * 2 ** (0.3 * m));
    if (r.fm) r.fm.i2 *= 1 + 0.5 * m;
  }
  return r;
}

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
  const r = { ...p, filter: f, lfo, tape, fm, wt, osc, ss, drift: p.drift * al, chorus: Math.min(1, p.chorus * br), breite: Math.min(1, p.breite * br), amp: { ...p.amp } };
  // neu in 0.2.0: Saite, Glocke, Atem, Ausdruck und die Färbung (alles nur, wo der Patch es hat oder eine Färbung gewählt ist)
  if (p.saite) r.saite = { ...p.saite, jawari: Math.min(0.95, p.saite.jawari * ch) };
  if (p.glocke) r.glocke = { ...p.glocke, hellMul: ch };
  if (p.atem) r.atem = p.atem * ch;
  if (p.ausdruck) { const a = (w.ausdruck ?? 50) / 50; r.ausdruck = { ...p.ausdruck, vib: p.ausdruck.vib * a, scoop: p.ausdruck.scoop * Math.min(1.5, a) }; r.gleitZeit = (p.gleitZeit ?? 0.05) * (0.6 + 0.4 * a); }
  if (w.faerbung && w.faerbung !== "keine") faerben(r, w.faerbung, (w.faerbungMenge ?? 60) / 100);
  return r;
}

/**
 * Saite (Karplus-Strong): Anregung durch ein gefiltertes Rauschen von einer Periode, Verzögerung mit linearer Interpolation (folgt dem
 * Gleiten), Tiefpass und Verlust in der Schleife. Jawari-artiger Steg: Auslenkungen über einem Bruchteil der laufenden Amplitude werden
 * gestaucht; der Bruchteil schwankt langsam, so wandern die Obertöne während des Ausklingens. Alles mit Schleifenverstärkung unter 1: stabil.
 */
function saiteStart(s, rate, frequenz, vel, legato, rnd) {
  const ns = Math.max(1, s.saiten), N = Math.ceil(rate / 20) + 4, ne = Math.max(2, Math.round(rate / frequenz));
  const a = 1 - Math.min(0.95, s.hell * Math.min(1, vel) * 0.95), exc = new Float32Array(ne);
  let y = 0, mittel = 0;
  for (let j = 0; j < ne; j++) { y = (1 - a) * (rnd() * 2 - 1) + a * y; exc[j] = y; mittel += y; }
  mittel /= ne; let m = 0; for (let j = 0; j < ne; j++) { exc[j] -= mittel; m = Math.max(m, Math.abs(exc[j])); }
  const g = (legato ? 0.35 : 1) * Math.min(1.2, vel) / (m || 1);
  for (let j = 0; j < ne; j++) exc[j] *= g;
  return { ns, N, w: 0, bufs: Array.from({ length: ns }, () => new Float32Array(N)), lp: new Float32Array(ns), huelle: new Float32Array(ns), exc, phJ: rnd() * TAU,
    tar: (s.taraf ?? []).map((r) => new SVF().setze(Math.min(rate * 0.45, frequenz * r), 80, rate)) };
}
function saiteSchritt(sa, s, f, rate, i) {
  let l = 0, r = 0;
  const jw = s.jawari * (0.75 + 0.25 * Math.sin(TAU * 0.17 * i / rate + sa.phJ));
  for (let k = 0; k < sa.ns; k++) {
    const fk = k ? f * 2 ** (s.verstimm / 1200) : f, D = Math.max(2, rate / fk - s.daempf / (1 - s.daempf)), b = sa.bufs[k];
    const x = sa.w - D, j = Math.floor(x), fr = x - j, i0 = ((j % sa.N) + sa.N) % sa.N, i1 = (i0 + 1) % sa.N;
    let y = b[i0] * (1 - fr) + b[i1] * fr;
    y = (1 - s.daempf) * y + s.daempf * sa.lp[k]; sa.lp[k] = y;
    y *= Math.exp(-6.9 / (s.t60 * fk));
    const ay = Math.abs(y); sa.huelle[k] = ay > sa.huelle[k] ? ay : sa.huelle[k] * 0.9995;
    if (jw > 0) { const th = sa.huelle[k] * (1 - jw); if (y > th) y = th + (y - th) * 0.3; }
    if (i < sa.exc.length) y += sa.exc[i] * (k ? 0.8 : 1);
    b[sa.w] = y;
    const pan = sa.ns > 1 ? (k ? 0.3 : -0.3) : 0; l += y * (1 - pan); r += y * (1 + pan);
  }
  sa.w = (sa.w + 1) % sa.N;
  if (sa.tar.length) { const x = (l + r) * 0.5 / 80; sa.tar.forEach((t, k) => { const v = t.schritt(x).band * s.tarafMix * 3; if (k % 2) r += v; else l += v; }); }
  return [l / sa.ns, r / sa.ns];
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
  const VF = FORMANTE[p.vokal] ?? FORMANTE.a, vok = p.vokal ? [new SVF().setze(VF[0], 6, rate), new SVF().setze(VF[1], 7, rate), new SVF().setze(VF[0], 6, rate), new SVF().setze(VF[1], 7, rate)] : null;
  // neu in 0.2.0: Ausdruck (Anschleifen von unten, verzögertes Vibrato), Atem, Saite, Glocke
  const au = p.ausdruck, ausdruckC = au ? (t) => (legato ? 0 : -au.scoop * Math.exp(-t / Math.max(0.005, au.scoopZeit))) + au.vib * Math.min(1, Math.max(0, (t - (legato ? 0 : au.verzug)) / 0.3)) * Math.sin(TAU * au.vibRate * t) : null;
  const atemF = p.atem ? new SVF() : null;
  const sa = p.verfahren === "saite" ? saiteStart(p.saite, rate, frequenz, vel, legato, rnd) : null;
  let gl = null;
  if (p.verfahren === "glocke") {
    const g = p.glocke, t60 = g.t60 * Math.sqrt(261.6 / frequenz); gl = new Float32Array(n);
    moden(gl, rate, g.teile.map(([r, a, tf], k) => ({ f: frequenz * r, a: a * (k ? vel ** 1.5 * (g.hellMul ?? 1) : 1), t60: t60 * tf, phase: rnd() * TAU })), { anschlag: g.anschlag });
    const kl = Math.min(n, Math.round(rate * 0.003)); if (g.klick) for (let j = 0; j < kl; j++) gl[j] += (rnd() * 2 - 1) * g.klick * vel * (1 - j / kl);
  }
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
      const gleit = r0 ? Math.exp(r0 * Math.exp(-i / Math.max(1, gz / 4))) : 1;
      lfo = lfoRate ? Math.sin(TAU * lfoRate * tAbs) : 0;
      let cent = driftF(t) + wowFlutter(tAbs, p.tape.wow, p.tape.flutter) + (p.lfo.ton ?? 0) * lfo;
      if (ausdruckC) cent += ausdruckC(t);
      f = frequenz * gleit * 2 ** (cent / 1200); d = f / rate;
      if (atemF) atemF.setze(Math.min(rate * 0.45, f * 1.02), 2.5, rate);
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
      if (atemF) { const z0 = rnd() * 2 - 1, b = atemF.schritt(z0).band * p.atem * (0.6 + 0.4 * vel) * 1.6 + z0 * p.atem * 0.03; l += b; r += b; }
    } else if (p.verfahren === "saite") {
      [l, r] = saiteSchritt(sa, p.saite, f, rate, i);
    } else if (p.verfahren === "glocke") {
      l = r = gl[i];
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
      if (vok && p.vokalWeg) {   // der Vokal wandert langsam (atmender Chor)
        const wg = p.vokalWeg, pos = (0.5 + 0.5 * Math.sin(TAU * (p.vokalRate ?? 0.07) * tAbs + seed % 7)) * (wg.length - 1), k0 = Math.min(wg.length - 2, Math.floor(pos)), fr = pos - k0;
        const A = FORMANTE[wg[k0]], B = FORMANTE[wg[k0 + 1]], F1 = A[0] + (B[0] - A[0]) * fr, F2 = A[1] + (B[1] - A[1]) * fr;
        vok[0].setze(F1, 6, rate); vok[1].setze(F2, 7, rate); vok[2].setze(F1, 6, rate); vok[3].setze(F2, 7, rate);
      }
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
  // neu in 0.2.0 (nur wo der Patch oder die Färbung es verlangt): Wärme um 250 Hz, Wavefolder, Bitcrusher, Knistern, Hall, Schimmer, Fiepen
  if (p.waerme250 > 0) for (const k of [L, R]) { const b = new SVF().setze(250, 0.7, rate), g = p.waerme250 * 0.8; for (let i = 0; i < n; i++) k[i] += b.schritt(k[i]).band * g; }
  if (p.falten > 0) falten(L, R, p.falten);
  if (p.crush > 0) crushen(L, R, p.crush);
  if (p.knistern > 0) knistern(L, R, rate, p.knistern, zufall(seed ^ 0x6b1c));
  if (p.hall > 0 || p.schimmer > 0) {
    const t = [L.slice(), R.slice()];
    if (p.hall > 0) hall(t, [L, R], rate, { anteil: p.hall * 0.55, nachhall: 3.2, daempfung: 9000, vorverz: 0.045 });
    if (p.schimmer > 0) hall(t, [L, R], rate, { anteil: p.schimmer * 0.5, nachhall: 5.5, daempfung: 7000, vorverz: 0.02, oktave: true });
  }
  if (p.fiep > 0) fiepen(L, R, rate, Math.min(1.5, p.fiep), zufall(seed ^ 0x2f17));
  // Breite: Seitenanteil höchstens unverändert (nie über das Original hinaus verbreitert), damit Mono stabil bleibt
  const b = Math.min(1, 0.3 + 0.7 * p.breite); for (let i = 0; i < n; i++) { const m = (L[i] + R[i]) / 2, s = (L[i] - R[i]) / 2; L[i] = m + s * b; R[i] = m - s * b; }
  // Gleichanteil entfernen (Pulswellen mit ungleicher Breite tragen einen) und Rumpeln unter 30 Hz
  for (const k of [L, R]) { const h = new SVF().setze(30, 0.6, rate); for (let i = 0; i < n; i++) k[i] = h.schritt(k[i]).hoch; }
  const m = spitze(L, R) || 1; for (let i = 0; i < n; i++) { L[i] *= 0.5 / m; R[i] *= 0.5 / m; }
  return [L, R];
}

// ---------- Effekte der Nachbearbeitung (neu in 0.2.0) ----------
function falten(L, R, menge) {
  const m = spitze(L, R) || 1, k = 1 + 3 * menge;
  for (const s of [L, R]) for (let i = 0; i < s.length; i++) { const x = s[i] / m; s[i] = (x * (1 - menge) + Math.sin((x * k * Math.PI) / 2) * menge * 0.8) * m; }
}
/** Bitcrusher: Abtastrate (Halten über bis zu 8 Werte) und Wortbreite (16 bis 6 Bit) verringert, mit dem Original gemischt */
function crushen(L, R, menge) {
  const m = spitze(L, R) || 1, halten = 1 + Math.round(menge * 7), stufen = 2 ** (15 - menge * 9);
  for (const s of [L, R]) { let h = 0; for (let i = 0; i < s.length; i++) { if (i % halten === 0) h = Math.round((s[i] / m) * stufen) / stufen * m; s[i] = s[i] * (1 - menge * 0.7) + h * menge * 0.7; } }
}
/** Vinyl-Knistern: Mikro-Klicks (Poisson, kurz, tiefpassgefiltert), seltene dumpfe Pops und ein leiser Staubteppich, relativ zum Effektivwert */
function knistern(L, R, rate, menge, rnd) {
  const n = L.length; let e = 0; for (let i = 0; i < n; i += 4) e += L[i] * L[i] + R[i] * R[i];
  const rms = Math.sqrt(e / (n / 2)) || 0.01, dichte = (3 + 22 * menge) / rate, pop = (0.3 + 0.8 * menge) / rate;
  const kl = [new Float32Array(n), new Float32Array(n)];
  for (let i = 0; i < n; i++) {
    if (rnd() < dichte) { const a = rms * (0.5 + 3 * rnd() ** 3) * menge * 1.6, s = rnd() < 0.5 ? 1 : -1, sl = 0.4 + 0.6 * rnd(); kl[0][i] += a * s * sl; kl[1][i] += a * s * (1.4 - sl); }
    if (rnd() < pop) { const a = rms * 1.2 * menge, d = Math.round(rate * 0.006); for (let j = 0; j < d && i + j < n; j++) { const v = a * Math.exp(-j / (d / 4)) * Math.sin((Math.PI * j) / (d / 2)); kl[0][i + j] += v; kl[1][i + j] += v; } }
  }
  const f = [new SVF().setze(6500, 0.6, rate), new SVF().setze(6500, 0.6, rate)], st = [new SVF().setze(3200, 0.7, rate), new SVF().setze(3200, 0.7, rate)];
  for (let c = 0; c < 2; c++) { const k = c ? R : L; for (let i = 0; i < n; i++) k[i] += f[c].schritt(kl[c][i]).tief + st[c].schritt(rnd() * 2 - 1).band * rms * 0.025 * menge; }
}
/** eine Oktave höher (zwei überlappende Körner, Hann-Fenster, 60 ms), aus der Schleife gelesen: ohne Naht */
function oktaveHoch(x, rate) {
  const n = x.length, G = Math.round(0.06 * rate), y = new Float32Array(n);
  for (const off of [0, Math.round(G / 2)]) for (let i = 0; i < n; i++) {
    // Verzögerung d fällt je Abtastwert um 1 (Lesekopf doppelt so schnell) und springt nach einem Korn zurück auf G
    const d = G - ((i + off) % G), j = (((i - d) % n) + n) % n;
    y[i] += x[j] * Math.sin((Math.PI * d) / G) ** 2;
  }
  return y;
}
/**
 * Hall aus vier Verzögerungen mit Hadamard-Rückkopplung (FDN), gedämpft im Kreis, mit Vorverzögerung. Die Schleife wird zweimal gerechnet
 * und der zweite Durchgang genommen: der Nachhall vom Ende liegt über dem Anfang, wie die Spur selbst eine Schleife ohne Naht ist.
 */
function hall([iL, iR], [L, R], rate, { anteil, nachhall, daempfung, vorverz, oktave = false }) {
  const n = iL.length; let x = new Float32Array(n); for (let i = 0; i < n; i++) x[i] = (iL[i] + iR[i]) * 0.5;
  if (oktave) x = oktaveHoch(x, rate);
  const len = [1557, 1617, 1491, 1422].map((v) => Math.round((v * rate * 1.7) / 44100)), g = len.map((l) => 10 ** ((-3 * l) / (rate * nachhall)));
  const buf = len.map((l) => new Float32Array(l)), pos = [0, 0, 0, 0], lp = [0, 0, 0, 0], a = Math.exp((-TAU * daempfung) / rate), pv = Math.max(1, Math.round(vorverz * rate));
  const ap = [[Math.round(0.0047 * rate), new Float32Array(Math.round(0.0047 * rate)), 0], [Math.round(0.0113 * rate), new Float32Array(Math.round(0.0113 * rate)), 0]];
  for (let durch = 0; durch < 2; durch++) for (let i = 0; i < n; i++) {
    let v = x[((i - pv) % n + n) % n];
    for (const q of ap) { const b = q[1][q[2]], w = v + 0.6 * b; q[1][q[2]] = w; v = b - 0.6 * w; q[2] = (q[2] + 1) % q[0]; }
    const o = pos.map((p2, k) => buf[k][p2]);
    for (let k = 0; k < 4; k++) { lp[k] = (1 - a) * o[k] + a * lp[k]; }
    const h = [lp[0] + lp[1] + lp[2] + lp[3], lp[0] - lp[1] + lp[2] - lp[3], lp[0] + lp[1] - lp[2] - lp[3], lp[0] - lp[1] - lp[2] + lp[3]];
    for (let k = 0; k < 4; k++) { buf[k][pos[k]] = v * 0.5 + h[k] * 0.5 * g[k]; pos[k] = (pos[k] + 1) % len[k]; }
    if (durch) { L[i] += (o[0] + o[2] * 0.6) * anteil; R[i] += (o[1] + o[3] * 0.6) * anteil; }
  }
}
/**
 * Fiepen: kleine hohe Figuren (2–4 Töne, 2–5 kHz, kurze Sweeps, Sample-&-Hold-Sprünge, manchmal ringmoduliert), selten, und nur dort,
 * wo die Spur gerade leise ist: sie antworten auf Lücken. Gezähmt: Tiefpass 6 kHz, Pegel unter dem der Spur.
 */
function fiepen(L, R, rate, menge, rnd) {
  const n = L.length, B = Math.round(0.05 * rate), nb = Math.floor(n / B), env = new Float32Array(nb);
  let mx = 0; for (let b = 0; b < nb; b++) { let e = 0; for (let i = b * B; i < (b + 1) * B; i += 2) e += L[i] * L[i]; env[b] = Math.sqrt(e / (B / 2)); mx = Math.max(mx, env[b]); }
  if (!nb) return;
  const pegel = (mx || 0.05) * (0.35 + 0.3 * Math.min(1, menge)), anzahl = Math.max(1, Math.round((n / rate) * 0.3 * menge)), lpL = new SVF().setze(6000, 0.6, rate), lpR = new SVF().setze(6000, 0.6, rate);
  const y = [new Float32Array(n), new Float32Array(n)];
  for (let c = 0; c < anzahl; c++) {
    let b = -1; for (let v = 0; v < 24; v++) { const k = Math.floor(rnd() * nb); if (env[k] < 0.4 * mx || !mx) { b = k; break; } }
    if (b < 0) continue;
    let i0 = b * B; const f0 = 2200 + rnd() * 2800, toene = 2 + Math.floor(rnd() * 3), ring = rnd() < 0.3 ? 80 + rnd() * 160 : 0, pan = (rnd() * 2 - 1) * 0.6;
    for (let t = 0; t < toene && i0 < n; t++) {
      const dauer = Math.round((0.03 + rnd() * 0.05) * rate), von = f0 * (0.7 + rnd() * 0.6), zu = f0 * (0.85 + rnd() * 0.4); let ph = 0;
      for (let j = 0; j < dauer && i0 + j < n; j++) {
        const fr = zu + (von - zu) * Math.exp(-j / (dauer * 0.25)), e = Math.min(1, j / (0.003 * rate)) * Math.exp(-j / (dauer * 0.4));
        ph += (TAU * fr) / rate; let v = Math.sin(ph) * e * pegel; if (ring) v *= Math.sin((TAU * ring * j) / rate);
        y[0][i0 + j] += v * (1 - pan); y[1][i0 + j] += v * (1 + pan);
      }
      i0 += dauer + Math.round((0.02 + rnd() * 0.05) * rate);
    }
  }
  for (let i = 0; i < n; i++) { L[i] += lpL.schritt(y[0][i]).tief; R[i] += lpR.schritt(y[1][i]).tief; }
}

// ---------- Familien (Stimmen) mit Makros ----------
const MAKRO_TEXT = { helligkeit: "Filter (±1,6 Oktaven), bei FM der Modulationsindex, bei Wavetable die Lage im Spektrum", bewegung: "Tiefe aller LFOs und der Filterhüllkurve, Wandern im Wavetable", waerme: "Sättigung und etwas dunkleres Filter", alter: "Drift je Stimme, Band-Wow und -Flutter, Rauschen, Verstimmung", breite: "Unisono-Spreizung, Chorus, Stereobreite" };
const makros = (charakter, std = {}) => [
  P("helligkeit", "Helligkeit", "Makro", 0, 100, std.helligkeit ?? 50, "%"), P("bewegung", "Bewegung", "Makro", 0, 100, std.bewegung ?? 40, "%"),
  P("waerme", "Wärme", "Makro", 0, 100, std.waerme ?? 50, "%"), P("alter", "Alter", "Makro", 0, 100, std.alter ?? 30, "%"),
  P("breite", "Breite", "Makro", 0, 100, std.breite ?? 60, "%"), P("charakter", charakter.name, "Makro", 0, 100, std.charakter ?? 50, "%", { hilfe: charakter.hilfe }),
  P("oktave", "Lage", "Detail", -2, 2, 0, "Oktaven", { schritt: 1 }),
  P("ausdruck", "Ausdruck", "Detail", 0, 100, 50, "%", { hilfe: "Vibrato, Anschleifen von unten und Gleitzeit (nur bei Presets mit Ausdruck: Flöte, Sitar, Signal)" }),
  P("faerbung", "Färbung", "Charakter", 0, 0, "keine", "", { wahl: [{ wert: "keine", name: "keine" }, ...CHARAKTERE.map((c) => ({ wert: c.key, name: c.name }))], hilfe: "schiebt das Preset in Richtung eines Klangcharakters" }),
  P("faerbungMenge", "Menge", "Charakter", 0, 100, 60, "%"),
];
export const MAKROS = Object.freeze(Object.fromEntries(Object.entries({
  shadow: { name: "Spannung", hilfe: "Resonanz des Filters" }, tape: { name: "Glanz", hilfe: "FM-Index der Keys, Resonanz des Pads" }, glass: { name: "Metall", hilfe: "FM-Index: von weich zu gläsern-metallisch; beim Puls die Resonanz" },
  goa: { name: "Resonanz", hilfe: "Resonanz des Acid-Filters" }, trance: { name: "Biss", hilfe: "Resonanz" }, house: { name: "Biss", hilfe: "Resonanz" },
  machine: { name: "Resonanz", hilfe: "Resonanz" }, darkpop: { name: "Metall", hilfe: "FM-Index der Glocken, Resonanz des Brass" },
  velvet: { name: "Bellen", hilfe: "FM-Index der Keys (fester Anschlag öffnet Glocke und Bellen), bei der Flöte der Atem" },
  raga: { name: "Jawari", hilfe: "Schnarren am Steg: wie stark die Obertöne beim Ausklingen wandern" },
  ice: { name: "Glanz", hilfe: "obere Teiltöne der Spieldose, FM-Index des Glases, Atem des Chors" },
}).map(([k, c]) => [k, { ...MAKRO_TEXT, charakter: c.hilfe, charakterName: c.name }])));

// Reihenfolge nach synthesizer.md: zuerst die Familien nahe der Grundrichtung
const FAMILIEN = [
  { key: "velvet", name: "Velvet Dub", patches: ["velvetRhodes", "smokedFlute"], std: { helligkeit: 40, waerme: 65, alter: 35 } },
  { key: "shadow", name: "Shadow Dub", patches: ["shadowChord", "deepRoomDrone"], std: { helligkeit: 35, waerme: 65 } },
  { key: "ice", name: "Ice Organism", patches: ["musicBoxFrost", "breathingChoir", "crackleGlass"], std: { helligkeit: 55, alter: 0 } },
  { key: "raga", name: "Raga Drift", patches: ["tanpuraGlow", "sitarGlide"], std: { helligkeit: 50, alter: 10 } },
  { key: "tape", name: "Tape Memory", patches: ["amberMemory", "wornKeys"], std: { alter: 60, helligkeit: 40, waerme: 60 } },
  { key: "glass", name: "Glass Circuit", patches: ["glassKeys", "restlessPulse", "signalSparrow"], std: { helligkeit: 55 } },
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
  id: "synth", version: "0.2.0", name: "Synth", melodisch: true,
  beschreibung: "Synthesizerspuren: Velvet Dub, Shadow Dub, Ice Organism, Raga Drift, Tape Memory, Glass Circuit, Spiral Goa, Open Trance, House Motion, Machine Pop, Dark Pop.",
  stimmen: Object.fromEntries(FAMILIEN.map((f) => [f.key, stimme(f)])),
};
export const FAMILIEN_LISTE = FAMILIEN;
/** für die Tests: die Hüllkurve (Legato beginnt auf dem Haltepegel) */
export const _huellkurve = huellkurve;
