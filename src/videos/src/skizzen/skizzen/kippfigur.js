// Kippfigur · Samen auf Samt · Begriff: Unterscheidung. In der Scheibe liegen nur Punkte; die Arme macht das Auge. Nichts bewegt sich
// ausser der Hervorhebung: jeder 8., dann 13., 21., 34. Kern wird hell, und jedes Mal ist es eine andere Sonnenblume.
import { TAU, kreisGewichte } from './werkzeug.js';
export function baue({ c, B, H }) {
  const N = 1500, PHI = Math.PI * (3 - Math.sqrt(5)), FAM = [8, 13, 21, 34], R = B * 0.47;
  return {
    stelle(p) {
      c.globalAlpha = 1; c.fillStyle = '#231016'; c.fillRect(0, 0, B, H);
      const w = kreisGewichte(p, FAM.length, 10);
      for (let n = 1; n <= N; n++) {
        const r = Math.sqrt(n / N), th = n * PHI, x = B / 2 + R * r * Math.cos(th), y = H / 2 + R * r * Math.sin(th);
        let hell = 0; FAM.forEach((f, i) => { if (n % f === 0) hell += w[i]; });
        const g = R * 0.5 / Math.sqrt(N) * (0.9 + 0.75 * hell);
        c.fillStyle = `rgb(${Math.round(120 + 125 * hell)},${Math.round(84 + 150 * hell)},${Math.round(62 + 140 * hell)})`;
        c.beginPath(); c.arc(x, y, g, 0, TAU); c.fill();
      }
    },
  };
}
