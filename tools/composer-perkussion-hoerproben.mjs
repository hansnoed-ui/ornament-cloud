// Hörproben zu Perkussion 0.2.0 und Rhythmus 0.1.0 (Zyklen) als WAV 24 Bit und MP3, gemischt auf etwa −14 LUFS:
//   instrumente/  jedes neue Instrument mit einem passenden Zyklus (16 Takte), die Zimbeln mit einer Trommel darunter
//   zyklen/       jede Vorlage auf Tabla (Tala) bzw. Darbuka (Iqa), zwei Abschnitte mit Tihai am Wechsel
//   regler/       Teentaal auf der Tabla mit Dichte 20, 50, 85 und mit Polyrhythmus 70
// Die ganzen Tracks im Stil rechnet die Seite selbst (Track erzeugen), nicht dieses Werkzeug.
//   node tools/composer-perkussion-hoerproben.mjs <ziel-ordner>
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { execFileSync } from "node:child_process";

const root = new URL("../alpha/", import.meta.url);
const imp = (p) => import(new URL(p, root).href);
const { stimmeVon } = await imp("composer/erzeuger/register.js");
const { spurRechnen } = await imp("composer/kern/erzeugen.js");
const { rendern } = await imp("composer/kern/rendern.js");
const { PLUGINS } = await imp("composer/plugins/register.js");
const { messen } = await imp("composer/kern/messen.js");
const PR = await imp("composer/kern/projekt.js");
const { zyklusTakte, VORLAGEN } = await imp("composer/kern/zyklen.js");
const { wavSchreiben } = await imp("lab/kern/klangwerk.js");

const ziel = process.argv[2] ?? "hoerproben-perkussion-0.2", RATE = 48000, PK = "perkussion@0.2.0";
const RAUM = { anteil: 20, nachhall: 1.6, daempfung: 6000, vorverz: 15, groesse: 0.9, tiefschnitt: 180 };
const liste = [];

async function mischen(spuren, p) {
  let r = await rendern({ rate: RATE, plugins: PLUGINS, spuren, zustand: PR.motorZustand(p), stems: false });
  p.master.pegel = Math.max(-24, Math.min(18, -14 - messen(r.summe, RATE).lufs));
  r = await rendern({ rate: RATE, plugins: PLUGINS, spuren, zustand: PR.motorZustand(p), stems: false });
  return r.summe;
}
function speichern(ordner, name, k, text) {
  mkdirSync(join(ziel, ordner), { recursive: true });
  const wav = join(ziel, ordner, `${name}.wav`);
  writeFileSync(wav, wavSchreiben(k, RATE, { bits: "24" }));
  execFileSync("ffmpeg", ["-v", "error", "-y", "-i", wav, "-c:a", "libmp3lame", "-b:a", "256k", join(ziel, ordner, `${name}.mp3`)]);
  const m = messen(k, RATE);
  liste.push({ ordner, name, text, sek: Math.round((k[0].length / RATE) * 10) / 10 });
  console.log(`${ordner}/${name}: ${m.lufs} LUFS, ${m.tp} dBTP`);
}
/** eine Perkussionsspur aus einem Zyklus */
function spur(p, { stimme, variante, vorlage, bpm, anzahl, abschnitte, regler = {}, seed = 3, pegel = 0, swing = 0, menschlich = 4 }) {
  const st = stimmeVon(PK, stimme), v = st.varianten.find((x) => x.name === variante) ?? st.varianten[0];
  const { takte } = zyklusTakte({ vorlage, stimme: st, anzahl, bpm, abschnitte, dichte: 50, komplex: 35, variation: 45, poly: 0, ...regler, seed });
  const q = { art: "erzeugt", erzeuger: PK, stimme, variante: v.name, werte: { ...v.werte }, takte, anzahl, bpm, swing, menschlich, seed };
  const sp = PR.erzeugteSpurDazu(p, q, { name: st.name, typ: "perkussion", pegel: st.pegel + pegel, pan: st.pan, raum: RAUM });
  return { id: sp.id, kanaele: spurRechnen(q, RATE).kanaele, takte };
}
const ZWEI = (n) => [{ von: 0, bis: n / 2, typ: "haupt" }, { von: n / 2, bis: n, typ: "gas" }];

// 1. die neuen Instrumente
const INSTR = [
  ["mridangam", "Konzert", "rupak", 96, "Mridangam, Rupak (7 Schläge)"],
  ["kanjira", "klassisch", "dadra", 96, "Kanjira, Dadra (6)"],
  ["ghatam", "klassisch", "keharwa", 92, "Ghatam, Keharwa (8)"],
  ["dholak", "Volk", "keharwa", 92, "Dholak, Keharwa (8)"],
  ["daf", "kurdisch", "zarbi68", 96, "Daf, persisch 6/8"],
  ["davul", "Davul", "frei9", 100, "Davul, frei 9 (2+2+2+3)"],
  ["naqareh", "Zeremonie", "samai", 100, "Naqareh, Samai Thaqil (10/8)"],
];
for (const [stimme, variante, vorlage, bpm, text] of INSTR) {
  const p = PR.neuesProjekt({ rate: RATE }), s = spur(p, { stimme, variante, vorlage, bpm, anzahl: 16, abschnitte: ZWEI(16) });
  speichern("instrumente", `${stimme}-${vorlage}`, await mischen([s], p), `${text}, ${bpm} BPM. Zweiter Teil dichter, Tihai am Wechsel.`);
}
for (const [zimbel, trommel, vorlage, bpm, text] of [["manjira", "tabla", "keharwa", 92, "Manjira mit Tabla, Keharwa"], ["sagat", "darbuka", "maqsum", 100, "Sagat mit Darbuka, Maqsum"]]) {
  const p = PR.neuesProjekt({ rate: RATE });
  const a = spur(p, { stimme: trommel, vorlage, bpm, anzahl: 16, abschnitte: ZWEI(16) }), b = spur(p, { stimme: zimbel, vorlage, bpm, anzahl: 16, abschnitte: ZWEI(16), regler: { dichte: 35, komplex: 10 }, seed: 8, pegel: -2 });
  speichern("instrumente", `${zimbel}-mit-${trommel}`, await mischen([a, b], p), `${text}, ${bpm} BPM.`);
}

// 2. jede Vorlage
for (const [vorlage, v] of Object.entries(VORLAGEN)) {
  const tala = v.tradition.includes("Tala"), stimme = tala ? "tabla" : v.tradition.includes("persisch") ? "zarb" : "darbuka", bpm = tala ? 92 : 100;
  const p = PR.neuesProjekt({ rate: RATE }), s = spur(p, { stimme, vorlage, bpm, anzahl: 16, abschnitte: ZWEI(16), swing: 0.04 });
  speichern("zyklen", `${vorlage}-${stimme}`, await mischen([s], p), `${v.name} (${v.tradition}) auf ${stimmeVon(PK, stimme).name}, ${bpm} BPM. Quelle: ${v.quelle}.`);
}

// 3. Regler
for (const [name, regler, text] of [["dichte-20", { dichte: 20 }, "Dichte 20: Sam und Vibhag-Anfänge"], ["dichte-50", { dichte: 50 }, "Dichte 50: die Theka wie notiert"], ["dichte-85", { dichte: 85, komplex: 60 }, "Dichte 85, Komplexität 60: Füllschläge, Läufe"], ["polyrhythmus-70", { dichte: 40, poly: 70 }, "Polyrhythmus 70: tiefe Schläge alle 3 Matras gegen die 16"]]) {
  const p = PR.neuesProjekt({ rate: RATE }), s = spur(p, { stimme: "tabla", vorlage: "teentaal", bpm: 92, anzahl: 16, abschnitte: ZWEI(16), regler, swing: 0.04 });
  speichern("regler", `teentaal-${name}`, await mischen([s], p), `Tabla, Teentaal, 92 BPM. ${text}.`);
}
writeFileSync(join(ziel, "liste.json"), JSON.stringify(liste, null, 1));
