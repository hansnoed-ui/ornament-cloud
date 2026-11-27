// Obertöne · gespannte Saiten, Darm auf Ebenholz · Begriff: Reihe. Sechzehn Saiten, die erste schwingt als Ganzes, die zweite in Hälften,
// die dritte in Dritteln. Jede in ihrem Tempo (ganze Vielfache), und alle kehren gemeinsam zurück.
import { TAU, welle } from './werkzeug.js';
export function baue({ c, B, H }) {
  const K = 16;
  return {
    stelle(p) {
      c.globalAlpha = 1; c.fillStyle = '#131110'; c.fillRect(0, 0, B, H);
      const x0 = B * 0.1, x1 = B * 0.9, stark = 0.35 + 0.65 * welle(p);
      for (let k = 1; k <= K; k++) {
        const y0 = H * (0.07 + 0.86 * (k - 0.5) / K), amp = H * 0.86 / K * 0.46 * stark, ph = TAU * k * p;
        // Hüllkurve der Schwingung (zart), dann die Saite im Augenblick
        c.strokeStyle = 'rgba(214,196,160,.13)'; c.lineWidth = 1.2;
        for (const vz of [-1, 1]) { c.beginPath(); for (let i = 0; i <= 240; i++) { const u = i / 240, y = y0 + vz * amp * Math.sin(Math.PI * k * u); if (i) c.lineTo(x0 + (x1 - x0) * u, y); else c.moveTo(x0, y); } c.stroke(); }
        c.strokeStyle = '#e4d6b4'; c.lineWidth = 2.6 - k * 0.08; c.beginPath();
        for (let i = 0; i <= 240; i++) { const u = i / 240, y = y0 + amp * Math.sin(Math.PI * k * u) * Math.cos(ph); if (i) c.lineTo(x0 + (x1 - x0) * u, y); else c.moveTo(x0, y); }
        c.stroke();
        c.fillStyle = '#b08a4a'; for (let j = 0; j <= k; j++) { c.beginPath(); c.arc(x0 + (x1 - x0) * j / k, y0, j === 0 || j === k ? 4 : 2.6, 0, TAU); c.fill(); }
      }
    },
  };
}
