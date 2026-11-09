// Echo 0.1.0 – Verzögerung mit Rückkopplung im Stil eines Dub- und Bandechos: Tief- und Hochpass im Rückkopplungsweg (jede Wiederholung
// dunkler und dünner), leichte Sättigung, auf Wunsch Ping-Pong. Vorbilder für Verhalten (nicht für Code): Roland Space Echo, Soundtoys
// EchoBoy, die Dub-Echos des Lab. Die Zeit in Millisekunden; der Composer setzt sie beim Anlegen aus dem Projekttempo (punktierte Achtel).
// Anteil 0 lässt das Signal unverändert. Nach der Veröffentlichung nicht mehr verändern.

import { SVF } from "../erzeuger/grund.js";

export default {
  id: "echo", version: "0.1.0", name: "Echo", kurz: "EC",
  beschreibung: "Dub- und Bandecho: Rückkopplung mit Filtern, Sättigung, Ping-Pong.",
  parameter: [
    { key: "anteil", name: "Anteil", gruppe: "Echo", min: 0, max: 100, std: 20, einheit: "%", schritt: 1 },
    { key: "zeit", name: "Zeit", gruppe: "Echo", min: 20, max: 2000, std: 375, einheit: "ms", skala: "log", hilfe: "beim Anlegen aus dem Tempo: punktierte Achtel" },
    { key: "rueck", name: "Rückkopplung", gruppe: "Echo", min: 0, max: 95, std: 45, einheit: "%" },
    { key: "dunkel", name: "Tiefpass", gruppe: "Farbe", min: 800, max: 16000, std: 3500, einheit: "Hz", skala: "log", hilfe: "jede Wiederholung dunkler" },
    { key: "duenn", name: "Hochpass", gruppe: "Farbe", min: 20, max: 1000, std: 180, einheit: "Hz", skala: "log", hilfe: "jede Wiederholung dünner: der Bass bleibt klar" },
    { key: "pingpong", name: "Ping-Pong", gruppe: "Farbe", min: 0, max: 1, std: 1, einheit: "", schritt: 1 },
    { key: "saettigung", name: "Band", gruppe: "Farbe", min: 0, max: 100, std: 20, einheit: "%", hilfe: "Sättigung im Rückkopplungsweg" },
  ],
  latenz: () => 0,
  erzeuge(rate) {
    const N = Math.ceil(2.1 * rate), b = [new Float32Array(N), new Float32Array(N)], lp = [new SVF(), new SVF()], hp = [new SVF(), new SVF()];
    let w = null, pos = 0, d = 1, glatt = 0;
    return {
      setze(werte) { w = werte; d = Math.max(1, Math.round((w.zeit / 1000) * rate)); lp.forEach((f) => f.setze(w.dunkel, 0.6, rate)); hp.forEach((f) => f.setze(w.duenn, 0.6, rate)); if (!glatt) glatt = d; },
      prozess(k, n) {
        if (!w || w.anteil === 0) return { reduktion: 0 };
        const [L, R] = k, fb = w.rueck / 100, nass = w.anteil / 100, sat = 1 + (w.saettigung / 100) * 3, sn = Math.tanh(sat), pp = w.pingpong >= 0.5;
        for (let i = 0; i < n; i++) {
          glatt += (d - glatt) * 0.0005;   // Zeitänderungen gleiten (wie ein Bandecho), kein Knacken
          const x = pos - glatt, j = Math.floor(x), f = x - j, i0 = ((j % N) + N) % N, i1 = (i0 + 1) % N;
          const yl = b[0][i0] * (1 - f) + b[0][i1] * f, yr = b[1][i0] * (1 - f) + b[1][i1] * f;
          const rl = Math.tanh(hp[0].schritt(lp[0].schritt(yl).tief).hoch * sat) / sn, rr = Math.tanh(hp[1].schritt(lp[1].schritt(yr).tief).hoch * sat) / sn;
          const p = pos % N;
          if (pp) { b[0][p] = (L[i] + R[i]) * 0.5 + rr * fb; b[1][p] = rl * fb; } else { b[0][p] = L[i] + rl * fb; b[1][p] = R[i] + rr * fb; }
          L[i] += yl * nass; R[i] += yr * nass; pos++;
        }
        return { reduktion: 0 };
      },
    };
  },
};
