// Spirale wird Fries · Kreide auf Schiefer · Begriff: Beobachter. Dieselbe Form, zwei Lesarten: Im Gesichtsfeld eine Schnecke, auf der
// Karte der Sehrinde (log-polar) ein gerader Fries. Die Punkte wandern zwischen beiden Lagen hin und her.
import { TAU, welle, sanft, mix } from './werkzeug.js';
export function baue({ c, B, H }) {
  const N = 1100, RMIN = 0.035, LOG = -Math.log(RMIN), PHI = Math.PI * (3 - Math.sqrt(5)), b = LOG / N;
  return {
    stelle(p) {
      c.globalAlpha = 1; c.fillStyle = '#1b1d1f'; c.fillRect(0, 0, B, H);
      const k = sanft((welle(p) - 0.12) / 0.76), lauf = p * 34, fr = lauf - Math.floor(lauf), nr = Math.floor(lauf), R = B * 0.46;
      for (let j = 0; j < N; j++) {
        const n = j + fr, id = nr - j, r = Math.exp(-b * (N - n)), th = n * PHI;
        // Lage als Schnecke
        const x1 = B / 2 + R * r * Math.cos(th), y1 = H / 2 + R * r * Math.sin(th), g1 = R * r * 0.62 * Math.sqrt(2 * b);
        // Lage auf der Karte: waagrecht der Winkel, senkrecht der Logarithmus des Abstands
        const u = ((th % TAU) + TAU) % TAU / TAU, v = Math.log(r / RMIN) / LOG;
        const x2 = B * (0.06 + 0.88 * u), y2 = H * (0.9 - 0.8 * v), g2 = H * 0.8 / LOG * 0.62 * Math.sqrt(2 * b);
        const ein = Math.min(1, n / 5) * Math.min(1, (N - n) / 8), hell = ((id % 21) + 21) % 21 === 0;
        c.fillStyle = hell ? '#f3efe6' : (((id % 2) + 2) % 2 ? '#8d8f8c' : '#bdbcb4');
        c.globalAlpha = hell ? 1 : 0.8;
        c.beginPath(); c.arc(mix(x1, x2, k), mix(y1, y2, k), Math.max(0.7, mix(g1, g2, k) * ein * (hell ? 1.35 : 1)), 0, TAU); c.fill();
      }
      c.globalAlpha = 1;
    },
  };
}
