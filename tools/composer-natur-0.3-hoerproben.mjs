// Hörbeispiele der neuen Familien aus Natur 0.3.0 (Delfine, Nachtwald, Kosmos) als WAV 24 Bit und MP3, gemischt auf etwa −14 LUFS:
// jede Variante allein (8 Takte bei 80 BPM in D-Moll, 24 s) und je Familie ein Beispiel mit Drums und Bass (Ornament bzw. Drum and Bass).
//   node tools/composer-natur-0.3-hoerproben.mjs <ziel-ordner>
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { execFileSync } from "node:child_process";

const root = new URL("../alpha/", import.meta.url);
const imp = (p) => import(new URL(p, root).href);
const { stimmeVon } = await imp("composer/erzeuger/register.js");
const { STILE, taktLesen } = await imp("composer/kern/muster.js");
const { spurRechnen, flaechenSpurRechnen } = await imp("composer/kern/erzeugen.js");
const { rendern } = await imp("composer/kern/rendern.js");
const { PLUGINS } = await imp("composer/plugins/register.js");
const { messen } = await imp("composer/kern/messen.js");
const PR = await imp("composer/kern/projekt.js");
const { linieErzeugen, kickSchritte, tonLesen } = await imp("composer/kern/linien.js");
const { wavSchreiben } = await imp("lab/kern/klangwerk.js");

const ziel = process.argv[2] ?? "hoerproben-natur-0.3", RATE = 48000;
mkdirSync(ziel, { recursive: true });
const RAUM = { anteil: 30, nachhall: 3.6, daempfung: 4500, vorverz: 25, groesse: 1.6, tiefschnitt: 200, bewegung: 40 };

async function mischen(spuren, p) {
  let r = await rendern({ rate: RATE, plugins: PLUGINS, spuren, zustand: PR.motorZustand(p), stems: false });
  p.master.pegel = Math.max(-24, Math.min(18, -14 - messen(r.summe, RATE).lufs));
  r = await rendern({ rate: RATE, plugins: PLUGINS, spuren, zustand: PR.motorZustand(p), stems: false });
  return r.summe;
}
function speichern(name, k) {
  const wav = join(ziel, `${name}.wav`);
  writeFileSync(wav, wavSchreiben(k, RATE, { bits: "24" }));
  execFileSync("ffmpeg", ["-v", "error", "-y", "-i", wav, "-c:a", "libmp3lame", "-b:a", "256k", join(ziel, `${name}.mp3`)]);
  const m = messen(k, RATE);
  console.log(`${name}: ${m.lufs} LUFS, ${m.tp} dBTP, ${Math.round(m.baender.unter120 * 100)} % < 120 Hz, ${Math.round(m.baender.ueber2k * 100)} % > 2 kHz`);
}
/** Drums und Bass eines Stils; dazu die Akkorde des Basses und die Einsätze für die Fläche */
function begleitung(stilKey, p, anzahl) {
  const stil = STILE.find((s) => s.key === stilKey), spuren = [], takt = 240 / stil.bpm;
  stil.spuren.forEach((s, i) => {
    const st = stimmeVon(s.erzeuger, s.stimme), v = st.varianten.find((x) => x.name === s.variante) ?? st.varianten[0];
    const q = { art: "erzeugt", erzeuger: s.erzeuger, stimme: s.stimme, werte: { ...v.werte }, takte: s.takte, fill: s.fill ?? null, anzahl, bpm: stil.bpm, swing: stil.swing, menschlich: s.menschlich ?? stil.menschlich, seed: 100 + i };
    const sp = PR.erzeugteSpurDazu(p, q, { name: st.name, typ: st.rolle, pegel: s.pegel ?? st.pegel, pan: st.pan, raum: stil.raum ?? null });
    spuren.push({ id: sp.id, kanaele: spurRechnen(q, RATE).kanaele });
  });
  const b = stil.bass, bst = stimmeVon("bass@0.1.0", b.stimme), bv = bst.varianten.find((x) => x.name === b.variante) ?? bst.varianten[0];
  const vorlage = stil.spuren.find((x) => x.stimme === "kick") ?? stil.spuren[0], tief = /^(x|o|dum|doum|tom|ge|ghe|dha|dhin|dhi|bum|tun)[!_]?$/;
  const kicks = kickSchritte(vorlage.takte.map((z) => z.split(/\s+/).map((t) => (vorlage.stimme === "kick" ? t : tief.test(t) ? t : ".")).join(" ")));
  const bq = { art: "erzeugt", erzeuger: "bass@0.1.0", stimme: b.stimme, werte: { ...bv.werte }, leiter: b.leiter, grundton: 2, takte: linieErzeugen({ art: b.linie, leiter: b.leiter, kicks, anzahl: 8, seed: 1 }), anzahl, bpm: stil.bpm, swing: stil.swing, menschlich: 2, seed: 150 };
  const bsp = PR.erzeugteSpurDazu(p, bq, { name: "Bass", typ: "bass", pegel: bst.pegel, bassfett: b.bassfett ?? null });
  const bk = spurRechnen(bq, RATE).kanaele; spuren.push({ id: bsp.id, kanaele: bk });
  const akkorde = Array.from({ length: anzahl }, (_, t) => { const z0 = String(bq.takte[t % bq.takte.length]).trim().split(/\s+/).map(tonLesen).find((x) => x && x !== "-"); return { beginn: t * takt, stufe: z0 ? ((z0.stufe - 1 + 70) % 7) + 1 : 1 }; });
  const einsaetze = []; for (const s of stil.spuren.filter((x) => ["kick", "snare", "rahmen", "darbuka"].includes(x.stimme))) for (let t = 0; t < anzahl; t++) for (const e of taktLesen(s.takte[t % s.takte.length])) einsaetze.push(t * takt + e.stelle * takt);
  const h = RATE / 100, huelle = Float32Array.from({ length: Math.floor(bk[0].length / h) }, (_, j) => { let s2 = 0; for (let i = j * h; i < (j + 1) * h; i += 4) s2 += bk[0][i] ** 2; return Math.sqrt(s2 / (h / 4)); });
  return { stil, spuren, bezug: { akkorde, einsaetze: einsaetze.sort((a, c) => a - c), huelle }, leiter: b.leiter };
}

const dname = (x) => x.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
const MIT = { delfine: ["ornament", "Delfine singen"], nachtwald: ["dnb", "Teich bei Nacht"], kosmos: ["dnb", "Pulsar im Takt"] };
const akkordeAllein = Array.from({ length: 8 }, (_, t) => ({ beginn: t * 3, stufe: [1, 6, 4, 5][t % 4] }));
for (const fam of ["delfine", "nachtwald", "kosmos"]) {
  const st = stimmeVon("natur@0.3.0", fam);
  for (const [i, v] of st.varianten.entries()) {
    const p = PR.neuesProjekt({ rate: RATE }), q = { erzeuger: "natur@0.3.0", stimme: fam, werte: { ...v.werte }, flaeche: true, anzahl: 8, bpm: 80, grundton: 2, leiter: "moll", seed: 7 };
    const sp = PR.erzeugteSpurDazu(p, q, { name: fam, typ: "flaeche", raum: RAUM });
    speichern(`${fam}-${i + 1}-${dname(v.name)}`, await mischen([{ id: sp.id, kanaele: flaechenSpurRechnen(q, RATE, { akkorde: akkordeAllein }).kanaele }], p));
  }
  const [stilKey, vname] = MIT[fam], p = PR.neuesProjekt({ rate: RATE }), anzahl = 16, b = begleitung(stilKey, p, anzahl), v = st.varianten.find((x) => x.name === vname);
  const q = { erzeuger: "natur@0.3.0", stimme: fam, werte: { ...v.werte }, flaeche: true, anzahl, bpm: b.stil.bpm, grundton: 2, leiter: b.leiter, seed: 7 };
  const sp = PR.erzeugteSpurDazu(p, q, { name: fam, typ: "flaeche", pegel: st.pegel + 3, raum: RAUM });
  speichern(`${fam}-mit-${stilKey}-${dname(vname)}`, await mischen([...b.spuren, { id: sp.id, kanaele: flaechenSpurRechnen(q, RATE, b.bezug).kanaele }], p));
}
