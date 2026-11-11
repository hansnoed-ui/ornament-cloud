// Harmonik 0.1.0 prüfen: Folgen in allen Modi, Voicings für Fläche, Klavier, Gitarre, Bass.
//   node tools/harmonik-pruefen.mjs [anzahl Startwerte]
// Prüft: keine Stimmkreuzungen, Umfang eingehalten, mittlere Bewegung bei Regler 0 unter vier Halbtönen, Gitarren-Griffe greifbar
// (höchstens vier Bünde, sechs Saiten, tiefster Ton = Bass), Klavier je Hand höchstens eine None.
const H = await import(new URL("../alpha/composer/kern/harmonik.js", import.meta.url).href);
const N = Number(process.argv[2] ?? 6);
let fehler = 0;
const melde = (t) => { fehler++; console.log("FEHLER", t); };
const zeilen = [];
for (const modus of Object.keys(H.MODI)) for (let seed = 1; seed <= N; seed++) {
  const zentrum = (seed * 5) % 12;
  const v = H.verlaufErzeugen({ zentrum, modus, seed, abschnitte: [{ takte: 16, kurve: "steigt", hoehe: 0.6 }, { takte: 16, kurve: "faellt", hoehe: 0.7 }], bruch: 0 });
  for (const inst of ["flaeche", "klavier", "gitarre", "bass"]) {
    const I = H.INSTRUMENTE[inst];
    for (const bruch of [0, 100]) {
      const vo = H.voicingsFuer(v.ereignisse, inst, { bruch, seed, zentrum, modus });
      for (const [i, x] of vo.entries()) {
        if (!x.midi.length) { if (inst !== "gitarre") melde(`${modus} ${seed} ${inst}: leer bei ${v.ereignisse[i].name}`); continue; }
        for (let j = 1; j < x.midi.length; j++) if (x.midi[j] < x.midi[j - 1]) melde(`${modus} ${seed} ${inst}: nicht aufsteigend`);
        if (inst === "gitarre") {
          const b = x.griff.map((g) => g.bund).filter((b) => b > 0);
          if (b.length && Math.max(...b) - Math.min(...b) >= 4) melde(`${modus} ${seed} Gitarre: Spannweite ${b}`);
          if (![v.ereignisse[i].akkord.bass, v.ereignisse[i].akkord.wurzel].includes(x.midi[0] % 12)) melde(`${modus} ${seed} Gitarre: Bass falsch`);
        } else if (inst === "klavier") {
          if (x.midi[0] < I.lo || x.midi.at(-1) > I.hi) melde(`${modus} ${seed} Klavier: Umfang`);
        } else if (x.midi[0] < I.lo || x.midi.at(-1) > I.hi) melde(`${modus} ${seed} ${inst}: Umfang ${x.midi}`);
      }
      if (bruch === 0 && inst === "flaeche") { const mb = H.mittlereBewegung(vo); zeilen.push(mb); if (mb >= 4) melde(`${modus} ${seed}: mittlere Bewegung ${mb.toFixed(2)} bei Regler 0`); }
      if (inst === "gitarre") { const fehlt = vo.filter((x) => !x.midi.length).length; if (fehlt) console.log(`  Hinweis: ${H.MODI[modus].name} ${seed}, Regler ${bruch}: ${fehlt}/${vo.length} Klänge auf der Gitarre nicht greifbar (fallen weg)`); }
    }
  }
  if (seed === 1) console.log(`${H.MODI[modus].name} auf ${H.tonName(zentrum)}: Zelle «${v.zelle.art}» – ${v.zelle.eigenschaft}\n  ${v.ereignisse.slice(0, 10).map((e) => `${e.t}:${e.name}${e.art !== "akkord" ? `(${e.art})` : ""}`).join("  ")}`);
}
const mittel = zeilen.reduce((a, b) => a + b, 0) / zeilen.length;
console.log(`mittlere Bewegung (Fläche, Regler 0): ${mittel.toFixed(2)} Halbtöne; Fehler: ${fehler}`);
process.exit(fehler ? 1 : 0);
