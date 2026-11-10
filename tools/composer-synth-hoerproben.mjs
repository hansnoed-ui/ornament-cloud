// Hörproben zu Synth 0.2.0 und den vier Schichten der Melodie (synthesizer.md, melodien.md) als WAV (24 Bit, 48 kHz):
//   presets/      je Preset: Demo (eigene Rolle, mit Echo und Raum), Vergleichsfolge trocken und mit Effekten (auf −20 LUFS angeglichen),
//                 Helligkeit 0 → 25 → 50 → 75 → 100 (ein Takt je Stufe)
//   familien/     je Familie das erste Preset mit Drums und Bass (Ornament, 174 BPM, Halftime), −14 LUFS
//   charaktere/   je Klangcharakter drei Varianten (Shadow Chord, Velvet Rhodes Haze, Breathing Choir Pad mit dieser Färbung), −20 LUFS
//   melodien/     DnB, Ornament, Indien: vier Schichten zusammen mit Drums und Bass, dann jede Schicht solo; Ornament in drei Varianten,
//                 alt (Synth 0.1.0, Keys und Lead) gegen neu mit demselben Groove; Klassik 0, 50, 100
//   offbeats/     die neuen Off-Beats (Achtel-Off-Beats, enge Lage) nur mit Drums und Bass: DnB mit Off-Beat 30, 60, 85; Ornament mit drei
//                 Klängen; dann DnB und Ornament mit allen Schichten
//   unregelmaessig/ Fläche, Off-Beats und Tanpura über 32 Takte ohne Wiederholung, mit wechselnden Abständen und Tonlängen
//   node tools/composer-synth-hoerproben.mjs <ziel-ordner> [presets|familien|charaktere|melodien|offbeats|unregelmaessig]
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const root = new URL("../alpha/", import.meta.url);
const imp = (p) => import(new URL(p, root).href);
const { stimmeVon } = await imp("composer/erzeuger/register.js");
const { STILE, stilVon } = await imp("composer/kern/muster.js");
const { spurRechnen } = await imp("composer/kern/erzeugen.js");
const { rendern } = await imp("composer/kern/rendern.js");
const { PLUGINS } = await imp("composer/plugins/register.js");
const { messen } = await imp("composer/kern/messen.js");
const PR = await imp("composer/kern/projekt.js");
const { linieErzeugen, kickSchritte, tonLesen } = await imp("composer/kern/linien.js");
const { sequenzErzeugen, REGLER_STD } = await imp("composer/kern/sequenzen.js");
const S2 = await imp("composer/erzeuger/synth-0.2.0.js");
const S1 = await imp("composer/erzeuger/synth-0.1.0.js");
const { taktLesen } = await imp("composer/kern/muster.js");
const { wavSchreiben } = await imp("lab/kern/klangwerk.js");

const ziel = process.argv[2] ?? "hoerproben-synth", RATE = 48000, nur = process.argv[3] ?? "";
for (const d of ["presets", "familien", "charaktere", "melodien", "offbeats", "unregelmaessig"]) mkdirSync(join(ziel, d), { recursive: true });
const name = (s) => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
const schreibe = (pfad, k) => { writeFileSync(join(ziel, pfad), wavSchreiben(k, RATE, { bits: "24" })); };
const log = [];

// ---------- Drums und Bass eines Stils ----------
function drumsUndBass(p, stilKey, anzahl, seed = 1) {
  const stil = stilVon(stilKey), spuren = [];
  for (const [i, s] of stil.spuren.entries()) {
    const st = stimmeVon(s.erzeuger, s.stimme), v = st.varianten.find((x) => x.name === s.variante) ?? st.varianten[0];
    const q = { art: "erzeugt", erzeuger: s.erzeuger, stimme: s.stimme, variante: v.name, werte: { ...v.werte }, takte: s.takte, fill: s.fill ?? null, anzahl, bpm: stil.bpm, swing: stil.swing, menschlich: s.menschlich ?? stil.menschlich, versatz: s.versatz ?? 0, seed: 100 + i, stil: stil.key };
    const sp = PR.erzeugteSpurDazu(p, q, { name: st.name, typ: st.rolle, pegel: s.pegel ?? st.pegel, pan: st.pan, raum: stil.raum ?? null });
    spuren.push({ id: sp.id, kanaele: spurRechnen(q, RATE).kanaele, q });
  }
  const st = stimmeVon("bass@0.1.0", stil.bass.stimme), v = st.varianten.find((x) => x.name === stil.bass.variante) ?? st.varianten[0];
  const vorlage = stil.spuren.find((x) => x.stimme === "kick") ?? stil.spuren[0], tief = /^(x|o|dum|doum|tom|ge|ghe|dha|dhin|dhi|bum|tun)[!_]?$/;
  const kicks = kickSchritte(vorlage.takte.map((z) => z.split(/\s+/).map((t) => (vorlage.stimme === "kick" ? t : tief.test(t) ? t : ".")).join(" ")));
  const bq = { art: "erzeugt", erzeuger: "bass@0.1.0", stimme: st.key, variante: v.name, werte: { ...v.werte }, linie: stil.bass.linie, leiter: stil.bass.leiter, grundton: 2,
    takte: linieErzeugen({ art: stil.bass.linie, leiter: stil.bass.leiter, kicks, anzahl: 8, seed }), anzahl, bpm: stil.bpm, swing: stil.swing, menschlich: 2, seed: 150 };
  const bsp = PR.erzeugteSpurDazu(p, bq, { name: "Bass", typ: "bass", pegel: st.pegel, bassfett: stil.bass.bassfett ?? null });
  spuren.push({ id: bsp.id, kanaele: spurRechnen(bq, RATE).kanaele, q: bq });
  // wie im Composer: Akkorde vom Bass (erster Ton je Takt), Lücken und Snare von den Drums
  const akkorde = bq.takte.map((z) => { const t = String(z).trim().split(/\s+/).map(tonLesen).find((x) => x && x !== "-"); return t ? ((t.stufe - 1 + 70) % 7) + 1 : 1; });
  const belegt = [], snares = [];
  for (let b = 0; b < 8; b++) { const bel = new Set(), sn = []; for (const s of stil.spuren) for (const x of taktLesen(s.takte[b % s.takte.length])) { const k = Math.round(x.stelle * 16); if (x.staerke >= 0.6) bel.add(k); if (["snare", "clap"].includes(s.stimme)) sn.push(k); } belegt.push([...bel]); snares.push(sn); }
  return { spuren, stil, akkorde, kicks, belegt, snares, leiter: stil.bass.leiter };
}

/** eine Synthspur wie «Synth dazu» im Composer: Kette mit Echo (Anteil des Presets) und Raum */
function synthSpur(p, { modul = "synth@0.2.0", fam, patch, rolle, takte, anzahl, bpm, leiter = "moll", grundton = 2, werte = {}, seed = 1, pegel = 0, effekte = true }) {
  const P = (modul === "synth@0.1.0" ? S1 : S2).PATCHES[patch], st = stimmeVon(modul, fam);
  const q = { art: "erzeugt", erzeuger: modul, stimme: fam, werte: { patch, ...werte }, rolle, takte, anzahl, bpm, grundton, leiter, kammerton: 432, swing: 0, menschlich: 2, seed };
  const echoMs = Math.round((0.75 * 60000) / (bpm >= 140 ? bpm / 2 : bpm));
  const sp = PR.erzeugteSpurDazu(p, q, { name: P.name, typ: "synth", pegel: st.pegel + pegel, echo: effekte ? { anteil: Math.round(Math.max(P.echo ?? 0.2, rolle === "offbeat" ? 0.4 : 0) * 100), zeit: echoMs } : null, raum: effekte ? { anteil: 18, nachhall: 2.6, daempfung: 5000, vorverz: 20 } : null });
  return { id: sp.id, kanaele: spurRechnen(q, RATE).kanaele, q };
}

/** rendern und die Summe auf eine Lautheit bringen */
async function mische(p, spuren, lufs) {
  let r = await rendern({ rate: RATE, plugins: PLUGINS, spuren, zustand: PR.motorZustand(p), stems: false });
  p.master.pegel = Math.max(-30, Math.min(20, lufs - messen(r.summe, RATE).lufs));
  r = await rendern({ rate: RATE, plugins: PLUGINS, spuren, zustand: PR.motorZustand(p), stems: false });
  return r.summe;
}
const kette = (...teile) => { const n = teile.reduce((s, t) => s + t[0].length, 0), L = new Float32Array(n), R = new Float32Array(n); let o = 0; for (const [l, r] of teile) { L.set(l, o); R.set(r, o); o += l.length; } return [L, R]; };
const stille = (s) => [new Float32Array(Math.round(s * RATE)), new Float32Array(Math.round(s * RATE))];

// Vergleichsfolge für alle Presets: Moll-Akkorde i – VI – iv – v (gehalten), einstimmig: lange Töne mit Gleiten
const VERGLEICH_POLY = ["1+3+5+7! - - - - - - - - - - - - - - -", "6,+1+3+5 - - - - - - - - - - - - - - -", "4,+6,+1+3 - - - - - - - - - - - - - - -", "5,+7,+2+4 - - - - - - - - . . . . . . ."];
const VERGLEICH_MONO = ["1! - - - - - - - 3~ - - - 5 - - -", "6, - - - - - - - 5,~ - - - 1 - - -", "4, - - - 3, - - - 4,~ - - - - - - -", "5,! - - - - - - - - - - - . . . ."];
const BPM = 90;

// ---------- Presets ----------
if (!nur || nur === "presets") for (const f of S2.FAMILIEN_LISTE) for (const k of f.patches) {
  const P = S2.PATCHES[k], st = stimmeVon("synth@0.2.0", f.key), mono = !st.poly({ patch: k }), vgl = mono ? VERGLEICH_MONO : VERGLEICH_POLY;
  const teil = async (takte, anzahl, effekte, werte = {}, lufs = -20, rolle = P.rolle) => { const p = PR.neuesProjekt({ rate: RATE }); return mische(p, [synthSpur(p, { fam: f.key, patch: k, rolle, takte, anzahl, bpm: BPM, werte, effekte, seed: 5 })], lufs); };
  const demo = sequenzErzeugen({ rolle: P.rolle, akkorde: [1, 6, 4, 5], kicks: [[0, 10]], belegt: [[0, 4, 8, 10, 12]], snares: [[4, 12]], anzahl: 8, seed: 11, regler: { ...REGLER_STD, spitzen: 70, offbeat: 70, ruhe: 20 } });
  const pre = `${String(S2.FAMILIEN_LISTE.indexOf(f) + 1).padStart(2, "0")}-${name(f.name)}-${name(P.name)}`;
  schreibe(`presets/${pre}-1-demo.wav`, await teil(demo, demo.length, true));
  schreibe(`presets/${pre}-2-vergleich-trocken.wav`, await teil(vgl, 4, false));
  schreibe(`presets/${pre}-3-vergleich-effekte.wav`, await teil(vgl, 4, true));
  const sweep = []; for (const h of [0, 25, 50, 75, 100]) sweep.push(await teil([vgl[0]], 1, true, { helligkeit: h }));
  schreibe(`presets/${pre}-4-helligkeit-0-bis-100.wav`, kette(...sweep));
  log.push(`${P.name}: fertig`); console.log(P.name);
}

// ---------- Familien mit Drums und Bass (Ornament) ----------
if (!nur || nur === "familien") for (const f of S2.FAMILIEN_LISTE) {
  const k = f.patches[0], P = S2.PATCHES[k], p = PR.neuesProjekt({ rate: RATE }), db = drumsUndBass(p, "ornament", 8);
  const takte = sequenzErzeugen({ rolle: P.rolle, akkorde: db.akkorde, kicks: db.kicks, belegt: db.belegt, snares: db.snares, anzahl: 8, seed: 21, halftime: true, regler: { ...REGLER_STD, spitzen: 60, offbeat: 60 } });
  const s = synthSpur(p, { fam: f.key, patch: k, rolle: P.rolle, takte, anzahl: 8, bpm: db.stil.bpm, leiter: db.leiter, seed: 9 });
  schreibe(`familien/${String(S2.FAMILIEN_LISTE.indexOf(f) + 1).padStart(2, "0")}-${name(f.name)}-${name(P.name)}-mit-drums-und-bass.wav`, await mische(p, [...db.spuren, s], -14));
  console.log(f.name, "mit Drums");
}

// ---------- Klangcharaktere ----------
if (!nur || nur === "charaktere") for (const ch of S2.CHARAKTERE) {
  const teile = [];
  for (const [fam, k] of [["shadow", "shadowChord"], ["velvet", "velvetRhodes"], ["ice", "breathingChoir"]]) {
    const p = PR.neuesProjekt({ rate: RATE });
    teile.push(await mische(p, [synthSpur(p, { fam, patch: k, rolle: "pad", takte: VERGLEICH_POLY.slice(0, 2), anzahl: 2, bpm: BPM, werte: { faerbung: ch.key, faerbungMenge: 80 }, seed: 3 })], -20), stille(0.5));
  }
  schreibe(`charaktere/${S2.CHARAKTERE.indexOf(ch) + 1}-${name(ch.name)}-shadow-velvet-choir.wav`, kette(...teile));
  console.log("Charakter", ch.name);
}

// ---------- Melodien: vier Schichten ----------
const SCHICHTEN = {
  dnb: [["flaeche", "ice", "breathingChoir", 0], ["spitzen", "ice", "musicBoxFrost", -6], ["offbeat", "velvet", "velvetRhodes", 0], ["drone", "shadow", "deepRoomDrone", -4, "schwebe"]],
  ornament: [["flaeche", "shadow", "shadowChord", -2], ["spitzen", "ice", "musicBoxFrost", -7], ["offbeat", "velvet", "velvetRhodes", 0], ["drone", "raga", "tanpuraGlow", -6, "tanpura"]],
  indien: [["drone", "raga", "tanpuraGlow", -2, "tanpura"], ["alap", "raga", "sitarGlide", -4, "alap"], ["spitzen", "ice", "musicBoxFrost", -8], ["offbeat", "velvet", "velvetRhodes", -1]],
};
async function schichten(stilKey, anzahl, { seed = 1, regler = {}, solo = null, leiter = null, schicht = null } = {}) {
  const p = PR.neuesProjekt({ rate: RATE }), db = drumsUndBass(p, stilKey, anzahl), spuren = [...db.spuren];
  const lt = leiter ?? db.leiter, halftime = db.stil.bpm >= 140;
  for (const [i, [rolle0, fam, k, pegel, rolleX]] of (schicht ?? SCHICHTEN[stilKey]).entries()) {
    const rolle = rolleX ?? rolle0;
    if (solo !== null && solo !== i) continue;
    const takte = sequenzErzeugen({ rolle, akkorde: db.akkorde, kicks: db.kicks, belegt: db.belegt, snares: db.snares, anzahl, seed: seed * 31 + i, halftime, regler: { ...REGLER_STD, ...regler }, zyklus: stilKey === "indien" ? 7 : 0 });
    spuren.push(synthSpur(p, { fam, patch: k, rolle, takte, anzahl, bpm: db.stil.bpm, leiter: lt, pegel, seed: seed + i }));
  }
  return mische(p, solo !== null ? spuren.slice(db.spuren.length) : spuren, solo !== null ? -18 : -14);
}
if (!nur || nur === "melodien") {
  for (const [stil, takte] of [["dnb", 32], ["ornament", 32], ["indien", 24]]) {
    schreibe(`melodien/${stil}-1-alle-schichten-mit-drums-und-bass.wav`, await schichten(stil, takte, { seed: 1 }));
    for (let i = 0; i < 4; i++) schreibe(`melodien/${stil}-2-solo-${i + 1}-${SCHICHTEN[stil][i][0]}-${name(S2.PATCHES[SCHICHTEN[stil][i][2]].name)}.wav`, await schichten(stil, 16, { seed: 1, solo: i }));
    console.log("Melodien", stil);
  }
  for (const seed of [2, 3, 4]) schreibe(`melodien/ornament-3-variante-${seed}.wav`, await schichten("ornament", 16, { seed }));
  schreibe(`melodien/ornament-4-neu.wav`, await schichten("ornament", 16, { seed: 1 }));
  // alt: Synth 0.1.0 mit den bisherigen Rollen (Glass Circuit Keys als Keys, Worn Electric Keys als Lead) über demselben Groove
  {
    const p = PR.neuesProjekt({ rate: RATE }), db = drumsUndBass(p, "ornament", 16), spuren = [...db.spuren];
    for (const [fam, k, rolle] of [["shadow", "deepRoomDrone", "schwebe"], ["glass", "glassKeys", "keys"], ["tape", "wornKeys", "lead"]]) {
      const takte = sequenzErzeugen({ rolle, akkorde: db.akkorde, kicks: db.kicks, anzahl: 16, seed: 7, halftime: true });
      spuren.push(synthSpur(p, { modul: "synth@0.1.0", fam, patch: k, rolle, takte, anzahl: 16, bpm: db.stil.bpm, leiter: db.leiter, pegel: -4, seed: 3 }));
    }
    schreibe(`melodien/ornament-4-alt-synth-0.1.0.wav`, await mische(p, spuren, -14));
  }
  for (const kl of [0, 50, 100]) schreibe(`melodien/flaeche-klassik-${kl}.wav`, await schichten("ornament", 16, { seed: 5, solo: 0, regler: { klassik: kl, weite: 80, wandel: 50 } }));
  // Maqam Bayati mit Vierteltönen: Sitar-Alap über dem Tanpura-Drone
  schreibe(`melodien/indien-5-maqam-bayati-viertelton.wav`, await schichten("indien", 16, { seed: 2, leiter: "bayati", schicht: SCHICHTEN.indien.slice(0, 2) }));
  console.log("Melodien fertig");
}
console.log("fertig:", ziel);

// ---------- Off-Beats: Akkord-Stiche auf den Achtel-Off-Beats, gehört mit Drums und Bass (ohne Schlag ist ein Off-Beat nicht zu beurteilen) ----------
if (!nur || nur === "offbeats") {
  for (const ob of [30, 60, 85]) schreibe(`offbeats/dnb-1-velvet-rhodes-off-beat-${ob}-mit-drums-und-bass.wav`, await schichten("dnb", 16, { seed: 1, regler: { offbeat: ob }, schicht: [["offbeat", "velvet", "velvetRhodes", 0]] }));
  for (const [fam, k] of [["velvet", "velvetRhodes"], ["shadow", "shadowChord"], ["glass", "glassKeys"]]) schreibe(`offbeats/ornament-2-${name(S2.PATCHES[k].name)}-mit-drums-und-bass.wav`, await schichten("ornament", 16, { seed: 1, regler: { offbeat: 60 }, schicht: [["offbeat", fam, k, 0]] }));
  for (const stil of ["dnb", "ornament"]) schreibe(`offbeats/${stil}-3-alle-schichten-mit-neuen-off-beats.wav`, await schichten(stil, 32, { seed: 1 }));
  console.log("Off-Beats");
}

// ---------- Unregelmässiger: Fläche, Off-Beats und Tanpura über 32 Takte ohne Wiederholung ----------
if (!nur || nur === "unregelmaessig") {
  for (const stil of ["dnb", "ornament"]) schreibe(`unregelmaessig/${stil}-1-alle-schichten.wav`, await schichten(stil, 32, { seed: 1 }));
  schreibe("unregelmaessig/dnb-2-flaeche-mit-drums-und-bass.wav", await schichten("dnb", 32, { seed: 1, schicht: [["flaeche", "ice", "breathingChoir", 0]] }));
  schreibe("unregelmaessig/ornament-2-tanpura-mit-drums-und-bass.wav", await schichten("ornament", 32, { seed: 1, schicht: [["drone", "raga", "tanpuraGlow", -2, "tanpura"]] }));
  schreibe("unregelmaessig/ornament-3-off-beats-mit-drums-und-bass.wav", await schichten("ornament", 32, { seed: 1, schicht: [["offbeat", "velvet", "velvetRhodes", 0]] }));
  schreibe("unregelmaessig/indien-1-alle-schichten.wav", await schichten("indien", 16, { seed: 1 }));
  console.log("Unregelmässig");
}
