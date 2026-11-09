// Ganze Tracks und Synth-Hörbeispiele des ORNAMENT COMPOSER ohne Browser rechnen (gleiche Module, gleiche Abtastwerte wie im Composer).
//   node tools/composer-track.mjs track <stil> <sekunden> <ziel.wav> [seed]     ein ganzer Track wie «Track erzeugen» (auf −14 LUFS)
//   node tools/composer-track.mjs synth <ziel-ordner>                          Hörbeispiele aller Synth-Familien (WAV 24 Bit + MP3)
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { execFileSync } from "node:child_process";

const root = new URL("../alpha/", import.meta.url);
const imp = (p) => import(new URL(p, root).href);
const { stimmeVon } = await imp("composer/erzeuger/register.js");
const { PATCHES, FAMILIEN_LISTE } = await imp("composer/erzeuger/synth-0.1.0.js");
const { STILE, stilVon, taktLesen } = await imp("composer/kern/muster.js");
const { spurRechnen, flaechenSpurRechnen } = await imp("composer/kern/erzeugen.js");
const { rendern } = await imp("composer/kern/rendern.js");
const { PLUGINS } = await imp("composer/plugins/register.js");
const { messen } = await imp("composer/kern/messen.js");
const { anwenden } = await imp("composer/kern/unterbrechungen.js");
const PR = await imp("composer/kern/projekt.js");
const { linieErzeugen, kickSchritte, tonLesen } = await imp("composer/kern/linien.js");
const { sequenzErzeugen } = await imp("composer/kern/sequenzen.js");
const { abschnitte: abschnitteVon, ereignisseFuer, funktionVon, BESETZUNG } = await imp("composer/kern/arrangement.js");
const { wavSchreiben } = await imp("lab/kern/klangwerk.js");
const RATE = 48000;

async function mischen(p, spuren, ziel = -14) {
  let r = await rendern({ rate: RATE, plugins: PLUGINS, spuren, zustand: PR.motorZustand(p), stems: false });
  for (let k = 0; k < 2; k++) { const d = ziel - messen(r.summe, RATE).lufs; if (Math.abs(d) < 0.3) break; p.master.pegel = Math.max(-24, Math.min(18, p.master.pegel + d)); r = await rendern({ rate: RATE, plugins: PLUGINS, spuren, zustand: PR.motorZustand(p), stems: false }); }
  return r.summe;
}
function speichern(datei, k) {
  writeFileSync(datei, wavSchreiben(k, RATE, { bits: "24" }));
  execFileSync("ffmpeg", ["-v", "error", "-y", "-i", datei, "-c:a", "libmp3lame", "-b:a", "256k", datei.replace(/\.wav$/, ".mp3")]);
  const m = messen(k, RATE);
  console.log(`${datei.split(/[\\/]/).pop()}: ${m.dauer} s, ${m.lufs} LUFS, ${m.tp} dBTP`);
}
const tief = /^(x|o|dum|doum|tom|ge|ghe|dha|dhin|dhi|bum|tun)[!_]?$/;

/** Drums und Bass eines Stils, Synths und Fläche nach BESETZUNG (oder einer Auswahl), optional mit Arrangement */
function aufbauen(stil, anzahl, { seed = 1, synths = null, natur, arrangement = null, ohneEffekte = false } = {}) {
  const p = PR.neuesProjekt({ rate: RATE }), spuren = [], takt = 240 / stil.bpm;
  stil.spuren.forEach((s, i) => {
    const st = stimmeVon(s.erzeuger, s.stimme), v = st.varianten.find((x) => x.name === s.variante) ?? st.varianten[0];
    const q = { art: "erzeugt", erzeuger: s.erzeuger, stimme: s.stimme, werte: { ...v.werte }, takte: s.takte, fill: s.fill ?? null, anzahl, bpm: stil.bpm, swing: stil.swing, menschlich: s.menschlich ?? stil.menschlich, versatz: s.versatz ?? 0, seed: seed * 100 + i };
    spuren.push({ sp: PR.erzeugteSpurDazu(p, q, { name: st.name, typ: st.rolle, pegel: s.pegel ?? st.pegel, pan: st.pan, raum: stil.raum ?? null }), k: spurRechnen(q, RATE).kanaele });
  });
  const b = stil.bass, bst = stimmeVon("bass@0.1.0", b.stimme), bv = bst.varianten.find((x) => x.name === b.variante) ?? bst.varianten[0];
  const vorlage = stil.spuren.find((x) => x.stimme === "kick") ?? stil.spuren[0];
  const kicks = kickSchritte(vorlage.takte.map((z) => z.split(/\s+/).map((t) => (vorlage.stimme === "kick" ? t : tief.test(t) ? t : ".")).join(" ")));
  const bq = { art: "erzeugt", erzeuger: "bass@0.1.0", stimme: b.stimme, werte: { ...bv.werte }, leiter: b.leiter, grundton: 2, takte: linieErzeugen({ art: b.linie, leiter: b.leiter, kicks, anzahl: 8, seed }), anzahl, bpm: stil.bpm, swing: stil.swing, menschlich: 2, seed: seed * 100 + 50 };
  const bk = spurRechnen(bq, RATE).kanaele;
  spuren.push({ sp: PR.erzeugteSpurDazu(p, bq, { name: "Bass", typ: "bass", pegel: bst.pegel, bassfett: b.bassfett ?? null }), k: bk });
  const akkorde = Array.from({ length: Math.min(8, anzahl) }, (_, t) => { const z0 = String(bq.takte[t % bq.takte.length]).trim().split(/\s+/).map(tonLesen).find((x) => x && x !== "-"); return z0 ? ((z0.stufe - 1 + 70) % 7) + 1 : 1; });
  const besetzung = BESETZUNG[stil.key];
  for (const [fam, patch] of synths ?? besetzung.synths) {
    const st = stimmeVon("synth@0.1.0", fam), pt = PATCHES[patch];
    const q = { art: "erzeugt", erzeuger: "synth@0.1.0", stimme: fam, werte: { patch }, rolle: pt.rolle, anzahl, bpm: stil.bpm, grundton: 2, leiter: b.leiter, swing: stil.swing, menschlich: 2, seed: seed * 100 + 70 };
    q.takte = sequenzErzeugen({ rolle: pt.rolle, akkorde, kicks, anzahl, seed: q.seed, halftime: stil.bpm >= 140 && ["pad", "chord", "keys", "drone"].includes(pt.rolle) });
    const echoMs = Math.round((0.75 * 60000) / (stil.bpm >= 140 ? stil.bpm / 2 : stil.bpm));
    spuren.push({ sp: PR.erzeugteSpurDazu(p, q, { name: pt.name, typ: "synth", pegel: st.pegel, echo: ohneEffekte ? null : { anteil: Math.round((pt.echo ?? 0.2) * 100), zeit: echoMs }, raum: ohneEffekte ? null : { anteil: 18, nachhall: 2.6, daempfung: 5000, vorverz: 20 } }), k: spurRechnen(q, RATE).kanaele });
  }
  const nat = natur === undefined ? besetzung.natur : natur;
  if (nat) {
    const st = stimmeVon("natur@0.1.0", nat[0]), q = { erzeuger: "natur@0.1.0", stimme: nat[0], werte: { ...nat[1] }, flaeche: true, anzahl, bpm: stil.bpm, grundton: 2, leiter: b.leiter, seed: seed * 100 + 90 };
    const einsaetze = []; for (const s of stil.spuren.filter((x) => ["kick", "snare", "rahmen", "darbuka"].includes(x.stimme))) for (let t = 0; t < anzahl; t++) for (const e of taktLesen(s.takte[t % s.takte.length])) einsaetze.push(t * takt + e.stelle * takt);
    const h = RATE / 100, huelle = Float32Array.from({ length: Math.floor(bk[0].length / h) }, (_, j) => { let s2 = 0; for (let i = j * h; i < (j + 1) * h; i += 4) s2 += bk[0][i] ** 2; return Math.sqrt(s2 / (h / 4)); });
    spuren.push({ sp: PR.erzeugteSpurDazu(p, q, { name: st.name, typ: "flaeche", pegel: st.pegel, raum: { anteil: 30, nachhall: 3.6, daempfung: 4500, vorverz: 25, groesse: 1.6, tiefschnitt: 200, bewegung: 40 } }),
      k: flaechenSpurRechnen(q, RATE, { akkorde: Array.from({ length: anzahl }, (_, t) => ({ beginn: t * takt, stufe: akkorde[t % akkorde.length] })), einsaetze: einsaetze.sort((a, c) => a - c), huelle }).kanaele });
  }
  if (arrangement) for (const x of spuren) { x.sp.ereignisse = ereignisseFuer(funktionVon(x.sp.quelle), arrangement, { seed, takte: anzahl }); x.k = anwenden(x.k, RATE, x.sp.ereignisse, { bpm: stil.bpm, beginn: 0 }); }
  return { p, spuren: spuren.map((x) => ({ id: x.sp.id, kanaele: x.k })) };
}

const [modus, ...arg] = process.argv.slice(2);
if (modus === "track") {
  const stil = stilVon(arg[0]), sek = Number(arg[1] ?? 90), seed = Number(arg[3] ?? 1), { takte, abschnitte } = abschnitteVon(sek, stil.bpm);
  const { p, spuren } = aufbauen(stil, takte, { seed, arrangement: abschnitte });
  speichern(arg[2], await mischen(p, spuren));
  console.log(abschnitte.map((a) => `${a.name} ${(a.von * 240 / stil.bpm).toFixed(1)} s`).join(" · "));
} else if (modus === "synth") {
  const ziel = arg[0]; mkdirSync(ziel, { recursive: true });
  const bpm = 90, takt = 240 / bpm, VERGLEICH = ["1+3+5 - - -", "6,+1+3 - - -", "4,+6,+1 - - -", "5,+7,+2 - - -"];   // dieselbe Folge für alle Presets (Viertel)
  const stil = { ...stilVon("hiphop"), bpm };
  for (const f of FAMILIEN_LISTE) for (const patch of f.patches) {
    const pt = PATCHES[patch], st = stimmeVon("synth@0.1.0", f.key), basis = `${f.key}-${patch}`;
    const einzeln = (takte, werte, effekte, anzahl = 4) => {
      const p = PR.neuesProjekt({ rate: RATE }), q = { erzeuger: "synth@0.1.0", stimme: f.key, werte: { patch, ...werte }, rolle: pt.rolle, takte, anzahl, bpm, grundton: 2, leiter: "moll", seed: 7 };
      const sp = PR.erzeugteSpurDazu(p, q, { name: pt.name, typ: "synth", echo: effekte ? { anteil: Math.round((pt.echo ?? 0.2) * 100), zeit: Math.round(0.75 * 60000 / bpm) } : null, raum: effekte ? { anteil: 18, nachhall: 2.6 } : null });
      return { p, spuren: [{ id: sp.id, kanaele: spurRechnen(q, RATE).kanaele }] };
    };
    const demo = sequenzErzeugen({ rolle: pt.rolle, akkorde: [1, 6, 4, 5], kicks: [[0, 7, 10]], anzahl: 4, seed: 11 });
    let x = einzeln(demo, {}, true); speichern(join(ziel, `${basis}-1-demo.wav`), await mischen(x.p, x.spuren));
    const folge = pt.poly ? VERGLEICH : ["1 - 3 - 5 - 3 -", "6, - 1 - 3 - 1 -", "4, - 6, - 1 - 6, -", "5, - 7, - 2 - 7, -"];
    x = einzeln(folge, {}, false); speichern(join(ziel, `${basis}-2-vergleich-trocken.wav`), await mischen(x.p, x.spuren));
    x = einzeln(folge, {}, true); speichern(join(ziel, `${basis}-3-vergleich-effekte.wav`), await mischen(x.p, x.spuren));
    // Makro-Durchlauf: Helligkeit 0, 25, 50, 75, 100 (je ein Takt)
    const teile = []; for (const h of [0, 25, 50, 75, 100]) { const y = einzeln([folge[0]], { helligkeit: h }, false, 1); teile.push(y.spuren[0].kanaele); }
    const n = teile.reduce((a, t) => a + t[0].length, 0), lauf = [new Float32Array(n), new Float32Array(n)]; let o = 0; for (const t of teile) { lauf[0].set(t[0], o); lauf[1].set(t[1], o); o += t[0].length; }
    const pm = PR.neuesProjekt({ rate: RATE }), spm = PR.erzeugteSpurDazu(pm, { erzeuger: "synth@0.1.0" }, { name: "lauf", typ: "synth" });
    speichern(join(ziel, `${basis}-4-helligkeit-0-bis-100.wav`), await mischen(pm, [{ id: spm.id, kanaele: lauf }]));
    const mit = aufbauen(stil, 8, { seed: 3, synths: [[f.key, patch]], natur: null }); speichern(join(ziel, `${basis}-5-mit-drums-und-bass.wav`), await mischen(mit.p, mit.spuren));
  }
} else console.log("node tools/composer-track.mjs track <stil> <sekunden> <ziel.wav> [seed] | synth <ziel-ordner>");
