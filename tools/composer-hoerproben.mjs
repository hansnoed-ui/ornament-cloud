// Hörproben des ORNAMENT COMPOSER als WAV (24 Bit, 48 kHz): jeder Stil als Loop über 8 Takte (mit Kanalzug, Raum und Grenze, genau wie
// im Browser), jede Stimme mit allen Varianten nacheinander (je ein Schlag pro Artikulation, Pause dazwischen).
//   node tools/composer-hoerproben.mjs <ziel-ordner>
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const root = new URL("../alpha/", import.meta.url);
const imp = (p) => import(new URL(p, root).href);
const { ERZEUGER, stimmeVon } = await imp("composer/erzeuger/register.js");
const { STILE } = await imp("composer/kern/muster.js");
const { spurRechnen } = await imp("composer/kern/erzeugen.js");
const { rendern } = await imp("composer/kern/rendern.js");
const { PLUGINS } = await imp("composer/plugins/register.js");
const { messen } = await imp("composer/kern/messen.js");
const PR = await imp("composer/kern/projekt.js");
const { linieErzeugen, kickSchritte } = await imp("composer/kern/linien.js");
const { wavSchreiben } = await imp("lab/kern/klangwerk.js");

const ziel = process.argv[2] ?? "hoerproben", RATE = 48000;
mkdirSync(join(ziel, "stile"), { recursive: true }); mkdirSync(join(ziel, "stimmen"), { recursive: true });
const name = (s) => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

for (const [n, stil] of STILE.entries()) {
  const p = PR.neuesProjekt({ rate: RATE }), spuren = [];
  for (const [i, s] of stil.spuren.entries()) {
    const st = stimmeVon(s.erzeuger, s.stimme), v = st.varianten.find((x) => x.name === s.variante) ?? st.varianten[0];
    const q = { art: "erzeugt", erzeuger: s.erzeuger, stimme: s.stimme, variante: v.name, werte: { ...v.werte }, takte: s.takte, fill: s.fill ?? null, anzahl: 8, bpm: stil.bpm, swing: stil.swing, menschlich: s.menschlich ?? stil.menschlich, versatz: s.versatz ?? 0, seed: 100 + i, stil: stil.key };
    const sp = PR.erzeugteSpurDazu(p, q, { name: st.name, typ: st.rolle, pegel: s.pegel ?? st.pegel, pan: st.pan, raum: stil.raum ?? null });
    spuren.push({ id: sp.id, kanaele: spurRechnen(q, RATE).kanaele });
  }
  if (stil.bass) {   // der Bass zum Stil, aus der Kick (oder der tiefsten Schlagspur) erzeugt
    const st = stimmeVon("bass@0.1.0", stil.bass.stimme), v = st.varianten.find((x) => x.name === stil.bass.variante) ?? st.varianten[0];
    const vorlage = stil.spuren.find((x) => x.stimme === "kick") ?? stil.spuren[0], tief = /^(x|o|dum|doum|tom|ge|ghe|dha|dhin|dhi|bum|tun)[!_]?$/;
    const kicks = kickSchritte(vorlage.takte.map((z) => z.split(/\s+/).map((t) => (vorlage.stimme === "kick" ? t : tief.test(t) ? t : ".")).join(" ")));
    const q = { art: "erzeugt", erzeuger: "bass@0.1.0", stimme: st.key, variante: v.name, werte: { ...v.werte }, linie: stil.bass.linie, leiter: stil.bass.leiter, grundton: 2,
      takte: linieErzeugen({ art: stil.bass.linie, leiter: stil.bass.leiter, kicks, anzahl: 8, seed: 1 }), anzahl: 8, bpm: stil.bpm, swing: stil.swing, menschlich: 2, seed: 150 };
    const sp = PR.erzeugteSpurDazu(p, q, { name: "Bass", typ: "bass", pegel: st.pegel, bassfett: stil.bass.bassfett ?? null });
    spuren.push({ id: sp.id, kanaele: spurRechnen(q, RATE).kanaele });
  }
  // Summe auf −14 LUFS: zuerst messen, dann Summenpegel setzen
  let r = await rendern({ rate: RATE, plugins: PLUGINS, spuren, zustand: PR.motorZustand(p), stems: false });
  p.master.pegel = Math.max(-24, Math.min(12, -14 - messen(r.summe, RATE).lufs));
  r = await rendern({ rate: RATE, plugins: PLUGINS, spuren, zustand: PR.motorZustand(p), stems: false });
  const m = messen(r.summe, RATE);
  writeFileSync(join(ziel, "stile", `${String(n + 1).padStart(2, "0")}-${name(stil.name)}-${stil.bpm}bpm.wav`), wavSchreiben(r.summe, RATE, { bits: "24" }));
  console.log(`${stil.name}: ${m.lufs} LUFS, ${m.tp} dBTP, ${Math.round(m.baender.unter120 * 100)} % unter 120 Hz`);
}

for (const e of Object.values(ERZEUGER)) if (!e.melodisch) for (const st of Object.values(e.stimmen)) {
  const std = Object.fromEntries(st.parameter.map((p) => [p.key, p.std])), teile = [];
  for (const v of st.varianten) for (const a of st.artikulationen.slice(0, 6)) {
    teile.push(st.rechne({ ...std, ...v.werte }, RATE, { art: a.key, staerke: 0.9, seed: 7 }));
    teile.push([new Float32Array(RATE * 0.25), new Float32Array(RATE * 0.25)]);
  }
  const n = teile.reduce((s, t) => s + t[0].length, 0), L = new Float32Array(n), R = new Float32Array(n);
  let o = 0; for (const [l, r] of teile) { L.set(l, o); R.set(r, o); o += l.length; }
  writeFileSync(join(ziel, "stimmen", `${e.id}-${st.key}-alle-varianten.wav`), wavSchreiben([L, R], RATE, { bits: "24" }));
}
// Bass: jede Variante mit zwei Takten in D (Moll), Saiten als Walking, Synthesizer der Kick folgend
for (const st of Object.values(ERZEUGER["bass@0.1.0"].stimmen)) {
  const saite = st.key === "kontrabass" || st.key === "ebass", teile = [];
  for (const v of st.varianten) {
    const takte = saite ? ["1! 3 5 b1", "4, 6, 7, #7,"] : ["1! - - - - - - 1 - - 1' - - - 7, -", "6,~! - - - - - - 6, - - 6 - - - 7,~ -"];
    teile.push(spurRechnen({ erzeuger: "bass@0.1.0", stimme: st.key, werte: v.werte, takte, anzahl: 2, bpm: 90, grundton: 2, leiter: "moll", seed: 3 }, RATE).kanaele);
    teile.push([new Float32Array(RATE * 0.4), new Float32Array(RATE * 0.4)]);
  }
  const n = teile.reduce((s, t) => s + t[0].length, 0), L = new Float32Array(n), R = new Float32Array(n);
  let o = 0; for (const [l, r] of teile) { L.set(l, o); R.set(r, o); o += l.length; }
  writeFileSync(join(ziel, "stimmen", `bass-${st.key}-alle-varianten.wav`), wavSchreiben([L, R], RATE, { bits: "24" }));
}
console.log("fertig:", ziel);
