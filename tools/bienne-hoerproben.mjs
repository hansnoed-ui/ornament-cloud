// Hörproben für ornament.bienne, Phase 1 (Harmonik 0.1.0) und Phase 2 (Metrum, Taktarten): je Modus ein harmonischer Verlauf, gespielt von vorhandenen Klängen
// (Velvet Rhodes Haze als Klavier-Voicings, Shadow Chord als Fläche, Bass «Rund»), Stimmführung glatt (0) und gebrochen (100).
//   node tools/bienne-hoerproben.mjs harmonik|metrum <ziel-ordner> [seed]
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
} else if (modus === "metrum") {
  // Phase 2, Schritt a: dieselbe Musik (D dorisch, gleicher Startwert) in verschiedenen Taktarten. Kick auf geraden, Snare auf ungeraden
  // Gruppenanfängen, Hi-Hat in Achteln mit Betonung aus der Gliederung, Bass auf jedem Gruppenanfang, Rhodes je Takt. 8 Takte bei 90 BPM.
  const ME = await imp("composer/kern/metrum.js");
  mkdirSync(ziel, { recursive: true });
  const T8 = 8, liste = [];
  for (const taktart of ["4/4", "5/4", "7/8", "6/8", "12/8", "11/8"]) {
    const a = ME.taktartLesen(taktart), n = ME.schritte(a), anf = ME.gruppenAnfaenge(a), bet = ME.betonungen(a), achtel = 2;
    const zeile = (f) => Array.from({ length: n }, (_, i) => f(i) ?? ".").join(" ");
    const kick = zeile((i) => { const k = anf.indexOf(i); return k >= 0 && k % 2 === 0 ? (k ? "x" : "x!") : null; });
    const snare = zeile((i) => { const k = anf.indexOf(i); return k >= 0 && k % 2 === 1 ? "x!" : null; });
    const hat = zeile((i) => (i % achtel ? null : bet[i] >= 0.75 ? "x" : "x_"));
    const zentrum = 2, sm = seed * 10 + 3;
    const v = H.verlaufErzeugen({ zentrum, modus: "dorisch", seed: sm, abschnitte: [{ takte: 4, kurve: "steigt", hoehe: 0.5 }, { takte: 4, kurve: "plateau", hoehe: 0.55 }], bruch: 30, wandel: 40, wiederkehr: 60, statementTakte: 4 });
    const rhodes = H.voicingsFuer(v.ereignisse, "klavier", { bruch: 30, seed: sm, zentrum, modus: "dorisch" });
    const bassV = H.voicingsFuer(v.ereignisse, "bass", { bruch: 30, seed, zentrum, modus: "dorisch" });
    const bassNoten = [];
    for (let b = 0; b < T8; b++) anf.forEach((s, k) => {
      const t = b + s / n, ende = b + (anf[k + 1] ?? n) / n, vo = bassV.find((x) => t >= x.t - 1e-6 && t < x.t + x.d - 1e-6);
      if (vo?.midi.length) bassNoten.push({ t, d: Math.max(0.05, ende - t - 0.02), midi: Math.min(...vo.midi), staerke: k ? 0.7 : 0.85 });
    });
    const p = PR.neuesProjekt({ rate: RATE }); p.kammerton = 440;
    const spur = (q, opt) => { q = { anzahl: T8 + 1, bpm: BPM, taktart, kammerton: 440, seed, ...q }; const sp = PR.erzeugteSpurDazu(p, q, opt); return { id: sp.id, kanaele: spurRechnen(q, RATE).kanaele }; };
    const drum = (stimme, takt, opt) => spur({ erzeuger: "drums@0.1.0", stimme, werte: werteVon("drums@0.1.0", stimme), takte: [takt], anzahl: T8, swing: 0, menschlich: 3, versatz: 0 }, opt);
    const spuren = [
      drum("kick", kick, { name: "Kick", typ: "drums", pegel: -3 }),
      drum("snare", snare, { name: "Snare", typ: "drums", pegel: -6, raum: { anteil: 14, nachhall: 1.2 } }),
      drum("hat", hat, { name: "Hi-Hat", typ: "drums", pegel: -14, pan: 0.15 }),
      spur({ erzeuger: "bass@0.1.0", stimme: "rund", werte: werteVon("bass@0.1.0", "rund", "weich"), noten: bassNoten }, { name: "Bass", typ: "bass", pegel: -6 }),
      spur({ erzeuger: "synth@0.2.0", stimme: "velvet", werte: { patch: "velvetRhodes" }, noten: noten(rhodes, { neuJeTakt: true, staerke: 0.6, auftakt: true }) }, { name: "Rhodes", typ: "synth", pegel: -9, raum: { anteil: 22, nachhall: 2.2 } }),
    ];
    const name = `metrum-${a.zaehler}-${a.nenner}`, sek = Math.round(T8 * ME.taktSek(BPM, a) * 10) / 10;
    console.log(`${taktart} (${a.gruppen.join("+")}), ${n} Sechzehntel je Takt, ${sek} s\n  Kick  ${kick}\n  Snare ${snare}\n  Hat   ${hat}`);
    speichern(join(ziel, `${name}.wav`), await mischen(p, spuren));
    liste.push({ datei: `${name}.mp3`, taktart, gliederung: a.gruppen.join("+"), sechzehntel: n, sekunden: sek, kick, snare, hat, klaenge: v.ereignisse.map((e) => `T${Math.floor(e.t) + 1} ${e.name}`) });
  }
  writeFileSync(join(ziel, "metrum.json"), JSON.stringify(liste, null, 1));
} else if (modus === "tuplets") {
  // Phase 2, Schritt b: Tuplets in den vier Taktarten, die Christian gut fand (4/4, 7/8, 12/8, 11/8). Takte 1–4 ohne, Takte 5–8 mit
  // Tuplet, damit der Unterschied in einer Probe zu hören ist. Gleiche Musik wie bei «metrum» (D dorisch, gleicher Startwert).
  const ME = await imp("composer/kern/metrum.js");
  mkdirSync(ziel, { recursive: true });
  const T8 = 8, liste = [];
  const IDEEN = {
    "4/4": { text: "Hi-Hat in Achteltriolen auf Zählzeit 3 und 4, Bass in Halbe-Triolen über der zweiten Takthälfte", hat: (z) => z.slice(0, 8).concat(["[x x_ x_]:4", "[x x_ x_]:4"]), bass: [0.5, 3] },
    "7/8": { text: "vier gleichmässige Hi-Hat-Schläge über der letzten Dreiergruppe (4 gegen 3)", hat: (z) => z.slice(0, 8).concat(["[x x_ x_ x_]:6"]) },
    "12/8": { text: "Hi-Hat in Duolen über jeder Dreiergruppe (2 gegen 3), der Bass bleibt im Dreier", hat: () => ["[x x_]:6", "[x x_]:6", "[x x_]:6", "[x x_]:6"] },
    "11/8": { text: "Quintole auf der letzten, kurzen Zweiergruppe, wie ein kleiner Wirbel in den nächsten Takt", hat: (z) => z.slice(0, 18).concat(["[x_ x_ x_ x x!]:4"]) },
  };
  for (const [taktart, idee] of Object.entries(IDEEN)) {
    const a = ME.taktartLesen(taktart), n = ME.schritte(a), anf = ME.gruppenAnfaenge(a), bet = ME.betonungen(a);
    const reihe = (f) => Array.from({ length: n }, (_, i) => f(i) ?? ".");
    const kick = reihe((i) => { const k = anf.indexOf(i); return k >= 0 && k % 2 === 0 ? (k ? "x" : "x!") : null; }).join(" ");
    const snare = reihe((i) => { const k = anf.indexOf(i); return k >= 0 && k % 2 === 1 ? "x!" : null; }).join(" ");
    const hatGerade = reihe((i) => (i % 2 ? null : bet[i] >= 0.75 ? "x" : "x_"));
    const hatTuplet = idee.hat(hatGerade).join(" "), hatZeilen = [0, 1, 2, 3].map(() => hatGerade.join(" ")).concat([0, 1, 2, 3].map(() => hatTuplet));
    const zentrum = 2, sm = seed * 10 + 3;
    const v = H.verlaufErzeugen({ zentrum, modus: "dorisch", seed: sm, abschnitte: [{ takte: 4, kurve: "steigt", hoehe: 0.5 }, { takte: 4, kurve: "plateau", hoehe: 0.55 }], bruch: 30, wandel: 40, wiederkehr: 60, statementTakte: 4 });
    const rhodes = H.voicingsFuer(v.ereignisse, "klavier", { bruch: 30, seed: sm, zentrum, modus: "dorisch" });
    const bassV = H.voicingsFuer(v.ereignisse, "bass", { bruch: 30, seed, zentrum, modus: "dorisch" });
    const tonBei = (t) => { const vo = bassV.find((x) => t >= x.t - 1e-6 && t < x.t + x.d - 1e-6); return vo?.midi.length ? Math.min(...vo.midi) : null; };
    const bassNoten = [];
    for (let b = 0; b < T8; b++) {
      const mitTuplet = b >= 4 && idee.bass, [von, k] = idee.bass ?? [1, 0];
      anf.forEach((s, j) => {
        const t = b + s / n, ende = b + (anf[j + 1] ?? n) / n;
        if (mitTuplet && t >= b + von - 1e-9) return;
        const m = tonBei(t); if (m != null) bassNoten.push({ t, d: Math.max(0.05, Math.min(ende, mitTuplet ? b + von : ende) - t - 0.02), midi: m, staerke: j ? 0.7 : 0.85 });
      });
      if (mitTuplet) for (let i = 0; i < k; i++) { const t = b + von + (i * (1 - von)) / k, m = tonBei(t); if (m != null) bassNoten.push({ t, d: (1 - von) / k - 0.02, midi: m + (i === 1 ? 7 : 0), staerke: 0.75 }); }
    }
    const p = PR.neuesProjekt({ rate: RATE }); p.kammerton = 440;
    const spur = (q, opt) => { q = { anzahl: T8 + 1, bpm: BPM, taktart, kammerton: 440, seed, ...q }; const sp = PR.erzeugteSpurDazu(p, q, opt); return { id: sp.id, kanaele: spurRechnen(q, RATE).kanaele }; };
    const drum = (stimme, takte, opt) => spur({ erzeuger: "drums@0.1.0", stimme, werte: werteVon("drums@0.1.0", stimme), takte, anzahl: T8, swing: 0, menschlich: 3, versatz: 0 }, opt);
    const spuren = [
      drum("kick", [kick], { name: "Kick", typ: "drums", pegel: -3 }),
      drum("snare", [snare], { name: "Snare", typ: "drums", pegel: -6, raum: { anteil: 14, nachhall: 1.2 } }),
      drum("hat", hatZeilen, { name: "Hi-Hat", typ: "drums", pegel: -13, pan: 0.15 }),
      spur({ erzeuger: "bass@0.1.0", stimme: "rund", werte: werteVon("bass@0.1.0", "rund", "weich"), noten: bassNoten }, { name: "Bass", typ: "bass", pegel: -6 }),
      spur({ erzeuger: "synth@0.2.0", stimme: "velvet", werte: { patch: "velvetRhodes" }, noten: noten(rhodes, { neuJeTakt: true, staerke: 0.6, auftakt: true }) }, { name: "Rhodes", typ: "synth", pegel: -9, raum: { anteil: 22, nachhall: 2.2 } }),
    ];
    const name = `tuplets-${a.zaehler}-${a.nenner}`, sek = Math.round(T8 * ME.taktSek(BPM, a) * 10) / 10;
    console.log(`${taktart}: ${idee.text}\n  Hat ab Takt 5: ${hatTuplet}`);
    speichern(join(ziel, `${name}.wav`), await mischen(p, spuren));
    liste.push({ datei: `${name}.mp3`, taktart, gliederung: a.gruppen.join("+"), sekunden: sek, idee: idee.text, hatOhne: hatGerade.join(" "), hatMit: hatTuplet });
  }
  writeFileSync(join(ziel, "tuplets.json"), JSON.stringify(liste, null, 1));
} else console.log("node tools/bienne-hoerproben.mjs harmonik|metrum|tuplets <ziel-ordner> [seed]");
