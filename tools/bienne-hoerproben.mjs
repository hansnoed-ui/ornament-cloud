// Hörproben für ornament.bienne, Phase 1 (Harmonik 0.1.0): je Modus ein harmonischer Verlauf, gespielt von vorhandenen Klängen
// (Velvet Rhodes Haze als Klavier-Voicings, Shadow Chord als Fläche, Bass «Rund»), Stimmführung glatt (0) und gebrochen (100).
//   node tools/bienne-hoerproben.mjs harmonik <ziel-ordner> [seed]
// Alles synthetisch. Je Probe 12 Takte bei 90 BPM (32 s), −16 LUFS, dazu eine Textdatei mit Klängen und Voicings.
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { execFileSync } from "node:child_process";

const root = new URL("../alpha/", import.meta.url);
const imp = (p) => import(new URL(p, root).href);
const H = await imp("composer/kern/harmonik.js");
const { stimmeVon } = await imp("composer/erzeuger/register.js");
const { spurRechnen } = await imp("composer/kern/erzeugen.js");
const { rendern } = await imp("composer/kern/rendern.js");
const { PLUGINS } = await imp("composer/plugins/register.js");
const { messen } = await imp("composer/kern/messen.js");
const PR = await imp("composer/kern/projekt.js");
const { wavSchreiben } = await imp("lab/kern/klangwerk.js");
const RATE = 48000, BPM = 90, TAKTE = 12;

async function mischen(p, spuren, ziel = -16) {
  let r = await rendern({ rate: RATE, plugins: PLUGINS, spuren, zustand: PR.motorZustand(p), stems: false });
  for (let k = 0; k < 3; k++) { const d = ziel - messen(r.summe, RATE).lufs; if (Math.abs(d) < 0.2) break; p.master.pegel = Math.max(-24, Math.min(18, p.master.pegel + d)); r = await rendern({ rate: RATE, plugins: PLUGINS, spuren, zustand: PR.motorZustand(p), stems: false }); }
  return r.summe;
}
function speichern(datei, k) {
  writeFileSync(datei, wavSchreiben(k, RATE, { bits: "24" }));
  execFileSync("ffmpeg", ["-v", "error", "-y", "-i", datei, "-c:a", "libmp3lame", "-b:a", "224k", datei.replace(/\.wav$/, ".mp3")]);
  const m = messen(k, RATE); console.log(`  → ${datei.split(/[\\/]/).pop()}: ${m.dauer} s, ${m.lufs} LUFS, ${m.tp} dBTP`);
}
const werteVon = (erz, stimme, variante) => { const st = stimmeVon(erz, stimme), v = st.varianten.find((x) => x.name === variante) ?? st.varianten[0]; return { ...v.werte }; };

/** Voicings → Noten: lange Klänge werden je Takt neu angeschlagen (Rhodes) oder gehalten (Fläche, Bass mit Wiederanschlag je Takt) */
function noten(voicings, { neuJeTakt = false, staerke = 0.75, auftakt = false } = {}) {
  const out = [];
  for (const v of voicings) {
    if (!v.midi.length) continue;
    const stuecke = [];
    if (neuJeTakt) { let t = v.t; while (t < v.t + v.d - 1e-6) { const ende = Math.min(v.t + v.d, Math.floor(t + 1 + 1e-6)); stuecke.push([t, ende - t]); t = ende; } }
    else stuecke.push([v.t, v.d]);
    stuecke.forEach(([t, d], j) => v.midi.forEach((m, i) => out.push({ t: t + (auftakt ? i * 0.012 : 0), d: Math.max(0.1, d - 0.02), midi: m, staerke: staerke * (j ? 0.8 : 1) * (1 - i * 0.04) })));
  }
  return out;
}

const [modus, ziel, seedArg] = process.argv.slice(2);
const seed = Number(seedArg ?? 1);
if (modus === "harmonik") {
  mkdirSync(ziel, { recursive: true });
  const liste = [];
  for (const [k, m] of Object.entries(H.MODI)) for (const bruch of [0, 100]) {
    const zentrum = 2, abschnitte = [{ takte: 6, kurve: "steigt", hoehe: 0.55 }, { takte: 6, kurve: "plateau", hoehe: 0.6 }];
    const sm = seed * 10 + Object.keys(H.MODI).indexOf(k);   // je Modus ein eigener Startwert: verschiedene Grundideen
    const v = H.verlaufErzeugen({ zentrum, modus: k, seed: sm, abschnitte, bruch, wandel: 45, wiederkehr: 55, statementTakte: 6 });
    const rhodes = H.voicingsFuer(v.ereignisse, "klavier", { bruch, seed: sm, zentrum, modus: k });
    const flaeche = H.voicingsFuer(v.ereignisse, "flaeche", { bruch, seed: sm + 1, zentrum, modus: k, stimmen: 4 });
    const bass = H.voicingsFuer(v.ereignisse, "bass", { bruch, seed, zentrum, modus: k });
    const p = PR.neuesProjekt({ rate: RATE }); p.kammerton = 440;
    const spur = (erzeuger, stimme, werte, nn, opt) => { const q = { erzeuger, stimme, werte, noten: nn, anzahl: TAKTE + 1, bpm: BPM, kammerton: 440, seed }; const sp = PR.erzeugteSpurDazu(p, q, opt); return { id: sp.id, kanaele: spurRechnen(q, RATE).kanaele }; };
    const spuren = [
      spur("synth@0.2.0", "velvet", { patch: "velvetRhodes" }, noten(rhodes, { neuJeTakt: true, staerke: 0.7, auftakt: true }), { name: "Rhodes", typ: "synth", pegel: -4, raum: { anteil: 22, nachhall: 2.2 } }),
      spur("synth@0.2.0", "shadow", { patch: "shadowChord" }, noten(flaeche, { staerke: 0.55 }), { name: "Fläche", typ: "synth", pegel: -13, raum: { anteil: 30, nachhall: 3 } }),
      spur("bass@0.1.0", "rund", werteVon("bass@0.1.0", "rund", "weich"), noten(bass, { neuJeTakt: true, staerke: 0.8 }), { name: "Bass", typ: "bass", pegel: -6 }),
    ];
    const name = `harmonik-${k}-stimmfuehrung-${bruch}`;
    console.log(`${m.name} auf D, Regler ${bruch}: «${v.zelle.art}» · ${v.ereignisse.map((e) => e.name).join(" · ")}`);
    speichern(join(ziel, `${name}.wav`), await mischen(p, spuren));
    liste.push({ datei: `${name}.mp3`, modus: m.name, bruch, zelle: `${v.zelle.art}: ${v.zelle.eigenschaft}`, mittlereBewegung: Math.round(H.mittlereBewegung(flaeche) * 100) / 100,
      klaenge: v.ereignisse.map((e, i) => `T${(Math.floor(e.t) + 1)}${e.t % 1 ? `+${Math.round((e.t % 1) * 8)}/8` : ""} ${e.name}${e.art !== "akkord" ? ` (${e.art === "oberstimme" ? "Oberstimme" : "Bass"} ändert sich)` : ""} · Rhodes ${rhodes[i].midi.map(H.midiName).join(" ")}`),
      aussagen: v.aussagen.map((a) => `T${a.t + 1}: ${a.ops.join(", ")} (erkennbar ${a.erkennbar})`) });
  }
  writeFileSync(join(ziel, "harmonik.json"), JSON.stringify(liste, null, 1));
} else console.log("node tools/bienne-hoerproben.mjs harmonik <ziel-ordner> [seed]");
