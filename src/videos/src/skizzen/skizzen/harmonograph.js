// Harmonograph · Grafit auf Papier · Begriff: Wiederkehr ohne Rückkehr. Zwei Pendel, fast im Verhältnis 2 : 3; die Figur schliesst sich nie ganz.
// Die Verstimmung und die Phasen wandern über die Schleife, die ganze Zeichnung dreht und atmet.
import { TAU, mix, welle } from './werkzeug.js';
export function baue({ c, B, H }) {
  const N = 26000;
  return {
    stelle(p) {
      c.globalAlpha = 1; c.fillStyle = '#ece6da'; c.fillRect(0, 0, B, H);
      const v = 0.006 + 0.014 * Math.sin(TAU * p), ph = TAU * p, d = mix(0.0016, 0.0032, welle(p)), R = B * 0.43;
      c.strokeStyle = '#1b1a1c'; c.lineWidth = 0.9; c.lineJoin = 'round'; c.globalAlpha = 0.34;
      c.beginPath();
      for (let i = 0; i < N; i++) {
        const t = i * 0.02, e = Math.exp(-d * t);
        const x = e * (0.62 * Math.sin(2 * t + ph) + 0.38 * Math.sin((3 + v) * t + 0.4));
        const y = e * (0.62 * Math.sin((3 - v) * t + ph * 2) + 0.38 * Math.sin(2 * t + 1.9 - ph));
        if (i) c.lineTo(B / 2 + R * x, H / 2 + R * y * 1.12); else c.moveTo(B / 2 + R * x, H / 2 + R * y * 1.12);
      }
      c.stroke(); c.globalAlpha = 1;
    },
  };
}
