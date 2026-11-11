// Kanalzug 0.1.0 – der Kanal einer Spur: Hochpass → drei Bänder EQ → Kompressor → Sättigung → Tiefpass → Ausgang.
// Vorbilder für Verhalten und Bedienung (nicht für Code): der Kanalzug einer Konsole, FabFilter Pro-Q (Regale und Glocke), Pro-C (Knie,
// Angriff, Freigabe, paralleler Anteil), Soundtoys Decapitator und Bandsättigung (weiche Kennlinie, Wärme als Unsymmetrie).
// Jede Stufe in Grundstellung tut nichts: alle Parameter auf Standard geben die Eingangswerte unverändert zurück (getestet).
// Nach der Veröffentlichung nicht mehr verändern; Klangänderungen gehören in kanalzug-0.2.0.js.

import { Biquad, biquadKoeff, ausDB, Gleichanteil, glaettung } from "../kern/dsp.js";

const P = (key, name, gruppe, min, max, std, einheit, mehr = {}) => ({ key, name, gruppe, min, max, std, einheit, ...mehr });

export default {
  id: "kanalzug", version: "0.1.0", name: "Kanalzug", kurz: "KZ",
  beschreibung: "Hochpass, drei Bänder EQ, Kompressor mit parallelem Anteil, weiche Sättigung mit Wärme, Tiefpass und Ausgang. Ohne Latenz.",
  parameter: [
    P("hochpass", "Hochpass", "Filter", 20, 400, 20, "Hz", { skala: "log", aus: 20, hilfe: "12 dB je Oktave; 20 Hz = aus" }),
    P("tiefpass", "Tiefpass", "Filter", 1500, 20000, 20000, "Hz", { skala: "log", aus: 20000, hilfe: "12 dB je Oktave; 20 kHz = aus. Dunkel machen, Glanz nehmen" }),
    P("tiefF", "Tiefen bei", "EQ", 30, 400, 100, "Hz", { skala: "log" }),
    P("tiefDB", "Tiefen", "EQ", -12, 12, 0, "dB", { schritt: 0.1, hilfe: "Regal unterhalb der Frequenz" }),
    P("mitteF", "Mitten bei", "EQ", 150, 6000, 800, "Hz", { skala: "log" }),
    P("mitteQ", "Mitten Breite (Q)", "EQ", 0.3, 4, 0.9, "", { skala: "log" }),
    P("mitteDB", "Mitten", "EQ", -12, 12, 0, "dB", { schritt: 0.1, hilfe: "Glocke" }),
    P("hochF", "Höhen bei", "EQ", 1500, 16000, 6000, "Hz", { skala: "log" }),
    P("hochDB", "Höhen", "EQ", -12, 12, 0, "dB", { schritt: 0.1, hilfe: "Regal oberhalb der Frequenz" }),
    P("schwelle", "Schwelle", "Kompressor", -48, 0, -18, "dB", { schritt: 0.5 }),
    P("verhaeltnis", "Verhältnis", "Kompressor", 1, 12, 1, ":1", { skala: "log", aus: 1, hilfe: "1:1 = aus" }),
    P("angriff", "Angriff", "Kompressor", 0.1, 100, 10, "ms", { skala: "log", hilfe: "kurz = fängt Anschläge, lang = lässt sie durch" }),
    P("freigabe", "Freigabe", "Kompressor", 20, 1200, 150, "ms", { skala: "log" }),
    P("aufholen", "Aufholen", "Kompressor", 0, 24, 0, "dB", { schritt: 0.1 }),
    P("anteil", "Anteil (parallel)", "Kompressor", 0, 100, 100, "%", { schritt: 1, hilfe: "unter 100 % mischt das Unkomprimierte dazu (New-York-Kompression)" }),
    P("antrieb", "Antrieb", "Sättigung", 0, 24, 0, "dB", { schritt: 0.1, aus: 0, hilfe: "wie stark in die Kennlinie gefahren wird; der Pegel kleiner Signale bleibt" }),
    P("waerme", "Wärme", "Sättigung", 0, 100, 0, "%", { schritt: 1, hilfe: "Unsymmetrie: gerade Obertöne wie bei Band und Röhre" }),
    P("ausgang", "Ausgang", "Ausgang", -24, 12, 0, "dB", { schritt: 0.1 }),
  ],
  latenz: () => 0,

  erzeuge(rate) {
    const hp = new Biquad(), lp = new Biquad(), tief = new Biquad(), mitte = new Biquad(), hoch = new Biquad(), gleich = new Gleichanteil(rate);
    let w = null, neu = true, gr = 0, ausAlt = 1;
    const sat = { u: new Float64Array(2) };   // letzter Eingang der Kennlinie je Kanal (ADAA)
    return {
      setze(werte) { w = werte; neu = true; },
      prozess(k, n) {
        if (!w) return { reduktion: 0 };
        if (neu) {
          neu = false;
          hp.setze(biquadKoeff("hochpass", w.hochpass, rate)); lp.setze(biquadKoeff("tiefpass", w.tiefpass, rate));
          tief.setze(biquadKoeff("tiefregal", w.tiefF, rate, { db: w.tiefDB })); mitte.setze(biquadKoeff("glocke", w.mitteF, rate, { q: w.mitteQ, db: w.mitteDB }));
          hoch.setze(biquadKoeff("hochregal", w.hochF, rate, { db: w.hochDB }));
        }
        const [L, R] = k;
        for (let c = 0; c < 2; c++) {
          const s = k[c];
          if (w.hochpass > 20) hp.kanal(s, c, n);
          if (w.tiefDB !== 0) tief.kanal(s, c, n);
          if (w.mitteDB !== 0) mitte.kanal(s, c, n);
          if (w.hochDB !== 0) hoch.kanal(s, c, n);
        }
        // Kompressor: Pegel aus dem lauteren Kanal (verkoppelt), weiches Knie 6 dB, Glättung der Reduktion im Pegelbereich
        let maxRed = 0;
        if (w.verhaeltnis > 1 || w.aufholen !== 0) {
          const T = w.schwelle, Rv = w.verhaeltnis, W = 6, aA = glaettung(w.angriff / 1000, rate), aF = glaettung(w.freigabe / 1000, rate);
          const nass = w.anteil / 100, trocken = 1 - nass;
          for (let i = 0; i < n; i++) {
            const a = Math.max(Math.abs(L[i]), Math.abs(R[i])), x = a > 1e-9 ? 20 * Math.log10(a) : -180, d = x - T;
            const y = 2 * d < -W ? x : 2 * d > W ? T + d / Rv : x + ((1 / Rv - 1) * (d + W / 2) ** 2) / (2 * W);
            const ziel = y - x;
            gr = ziel < gr ? aA * gr + (1 - aA) * ziel : aF * gr + (1 - aF) * ziel;
            if (gr < maxRed) maxRed = gr;
            const g = nass * ausDB(gr + w.aufholen) + trocken;
            L[i] *= g; R[i] *= g;
          }
        } else gr = 0;
        // Sättigung: tanh mit Ableitung über die Stammfunktion (ADAA erster Ordnung) gegen Aliasing, ohne Überabtastung und ohne Latenz.
        // Kleine Signale behalten ihren Pegel (geteilt durch die Steigung im Arbeitspunkt), die Wärme verschiebt den Arbeitspunkt.
        if (w.antrieb > 0) {
          const g = ausDB(w.antrieb), b = (w.waerme / 100) * 0.6, tb = Math.tanh(b), steig = g * (1 - tb * tb);
          const F = (x) => { const a = Math.abs(x); return a + Math.log1p(Math.exp(-2 * a)) - Math.LN2; };
          for (let c = 0; c < 2; c++) {
            const s = k[c]; let u1 = sat.u[c];
            for (let i = 0; i < n; i++) {
              const u = g * s[i] + b, du = u - u1;
              const y = Math.abs(du) > 1e-6 ? (F(u) - F(u1)) / du : Math.tanh(0.5 * (u + u1));
              s[i] = (y - tb) / steig; u1 = u;
            }
            sat.u[c] = u1;
            if (b > 0) gleich.kanal(s, c, n);
          }
        } else { sat.u[0] = sat.u[1] = (w.waerme / 100) * 0.6; }
        if (w.tiefpass < 20000) { lp.kanal(L, 0, n); lp.kanal(R, 1, n); }
        // Ausgang: innerhalb des Blocks gleitend, damit Regeln nicht knackt
        const ziel = ausDB(w.ausgang);
        if (ziel !== 1 || ausAlt !== 1) {
          for (let i = 0; i < n; i++) { const g = ausAlt + ((ziel - ausAlt) * (i + 1)) / n; L[i] *= g; R[i] *= g; }
          ausAlt = ziel;
        }
        return { reduktion: maxRed };
      },
    };
  },
};
