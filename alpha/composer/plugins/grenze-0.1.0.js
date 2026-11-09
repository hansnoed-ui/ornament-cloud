// Grenze 0.1.0 – Limiter für die Summe, mit Vorlauf und Erkennung des wahren Spitzenwerts (vierfach überabgetastet).
// Vorbild für Verhalten (nicht für Code): FabFilter Pro-L im Modus «transparent», die Ableton- und Reason-Limiter.
// Ablauf: Spitzenwert zwischen den Abtastwerten messen → nötige Verstärkung → Minimum über das Vorlauffenster halten → Freigabe →
// gleitender Mittelwert über den Vorlauf (die Absenkung ist vollständig, wenn die Spitze ankommt) → auf das verzögerte Signal anwenden.
// Decke 0 dB und keine Spitze darüber: das Signal kommt nur verzögert heraus. Nach der Veröffentlichung nicht mehr verändern.

import { ausDB, glaettung, WahrerSpitzenwert, TP_VERZOEGERUNG } from "../kern/dsp.js";

const VORLAUF = 0.0015;   // s
const laenge = (rate) => Math.max(8, Math.round(VORLAUF * rate));

export default {
  id: "grenze", version: "0.1.0", name: "Grenze", kurz: "GR",
  beschreibung: "Limiter mit 1,5 ms Vorlauf, misst den wahren Spitzenwert (dBTP). Für die Summe am Schluss.",
  parameter: [
    { key: "antrieb", name: "Antrieb", gruppe: "Grenze", min: 0, max: 18, std: 0, einheit: "dB", schritt: 0.1, hilfe: "vor dem Limiter lauter machen" },
    { key: "decke", name: "Decke", gruppe: "Grenze", min: -6, max: 0, std: -1, einheit: "dB", schritt: 0.1, hilfe: "höchster wahrer Spitzenwert (dBTP); −1 für Streaming" },
    { key: "freigabe", name: "Freigabe", gruppe: "Grenze", min: 10, max: 800, std: 80, einheit: "ms", skala: "log" },
  ],
  latenz: (rate) => laenge(rate) + TP_VERZOEGERUNG,

  erzeuge(rate) {
    const L = laenge(rate), D = L + TP_VERZOEGERUNG;
    const tp = [new WahrerSpitzenwert(), new WahrerSpitzenwert()];
    const verz = [new Float32Array(D + 1), new Float32Array(D + 1)];
    const halte = new Float32Array(L + 1).fill(1), mittel = new Float64Array(L).fill(1);
    let w = null, iv = 0, ih = 0, im = 0, summe = L, huelle = 1;
    return {
      setze(werte) { w = werte; },
      prozess(k, n) {
        if (!w) return { reduktion: 0 };
        const g0 = ausDB(w.antrieb), decke = ausDB(w.decke), aF = glaettung(w.freigabe / 1000, rate);
        let maxRed = 1;
        for (let i = 0; i < n; i++) {
          const l = k[0][i] * g0, r = k[1][i] * g0;
          const spitze = Math.max(tp[0].schritt(l), tp[1].schritt(r));
          halte[ih] = spitze > decke ? decke / spitze : 1; ih = (ih + 1) % (L + 1);
          let ziel = 1; for (let j = 0; j <= L; j++) if (halte[j] < ziel) ziel = halte[j];
          huelle = ziel < huelle ? ziel : aF * huelle + (1 - aF) * ziel;
          summe += huelle - mittel[im]; mittel[im] = huelle; im = (im + 1) % L;
          const g = Math.min(1, summe / L);
          verz[0][iv] = l; verz[1][iv] = r; iv = (iv + 1) % (D + 1);
          k[0][i] = verz[0][iv] * g; k[1][i] = verz[1][iv] * g;   // der älteste Wert: genau D Abtastwerte zurück
          if (g < maxRed) maxRed = g;
        }
        return { reduktion: 20 * Math.log10(maxRed) };
      },
    };
  },
};
