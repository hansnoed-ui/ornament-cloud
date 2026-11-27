// Feder · Tusche auf Papier · Begriff: nichtreflexiv. Dieselbe Linie zweimal: gerechnet (gleichmässiges Tempo) und gezogen (in der Kurve
// langsamer, Zwei-Drittel-Gesetz). Oben die gerechnete, unten die gezogene; wo die Feder langsam ist, wird der Strich breit.
import { TAU, sanft } from './werkzeug.js';
export function baue({ c, B, H }) {
  const N = 2400, pkt = [];
  for (let i = 0; i <= N; i++) {
    const s = i / N, x = -0.86 + 1.72 * s;
    const y = 0.34 * Math.sin(TAU * 2.5 * s) * Math.sin(TAU * 0.5 * s) + 0.17 * Math.sin(TAU * 7 * s + 1) * Math.exp(-Math.pow((s - 0.55) / 0.2, 2)) + 0.1 * Math.sin(TAU * 13 * s) * Math.exp(-Math.pow((s - 0.3) / 0.08, 2));
    pkt.push([x, y]);
  }
  // Bogenlänge und Krümmung
  const lang = [0], kr = [0];
  for (let i = 1; i <= N; i++) lang.push(lang[i - 1] + Math.hypot(pkt[i][0] - pkt[i - 1][0], pkt[i][1] - pkt[i - 1][1]));
  for (let i = 1; i < N; i++) {
    const [ax, ay] = pkt[i - 1], [bx, by] = pkt[i], [cx, cy] = pkt[i + 1];
    const a = Math.hypot(bx - ax, by - ay), b = Math.hypot(cx - bx, cy - by), f = Math.abs((bx - ax) * (cy - by) - (by - ay) * (cx - bx));
    kr.push(f / Math.max(1e-9, a * b * (a + b) / 2));
  }
  kr.push(0);
  // Zeit je Punkt: gleichmässig, und nach dem Zwei-Drittel-Gesetz (Tempo ~ Krümmung^(-1/3))
  const tG = lang.map(l => l / lang[N]), tH = [0];
  for (let i = 1; i <= N; i++) tH.push(tH[i - 1] + (lang[i] - lang[i - 1]) * Math.cbrt(Math.min(400, kr[i]) + 1.5));
  for (let i = 0; i <= N; i++) tH[i] /= tH[N];
  const M = B * 0.5;
  function zug(zeit, oben, fort, breite) {
    const y0 = H / 2 + (oben ? -1 : 1) * H * 0.23;
    c.strokeStyle = '#18161a'; c.lineCap = 'round';
    let kopf = 0;
    for (let i = 1; i <= N; i++) {
      if (zeit[i] > fort) break; kopf = i;
      c.lineWidth = breite(i); c.beginPath(); c.moveTo(B / 2 + M * pkt[i - 1][0], y0 + M * pkt[i - 1][1]); c.lineTo(B / 2 + M * pkt[i][0], y0 + M * pkt[i][1]); c.stroke();
    }
    c.fillStyle = '#9c2b1c'; c.beginPath(); c.arc(B / 2 + M * pkt[kopf][0], y0 + M * pkt[kopf][1], 13, 0, TAU); c.fill();
  }
  return {
    stelle(p) {
      c.globalAlpha = 1; c.fillStyle = '#ece6da'; c.fillRect(0, 0, B, H);
      c.strokeStyle = 'rgba(24,22,26,.18)'; c.lineWidth = 1.5; c.beginPath(); c.moveTo(B * 0.07, H / 2); c.lineTo(B * 0.93, H / 2); c.stroke();
      // zeichnen (p 0,04–0,62), stehen, verblassen (p 0,88–1)
      const fort = sanft((p - 0.04) / 0.58) * 1.0001, blass = 1 - sanft((p - 0.88) / 0.1);
      c.globalAlpha = blass;
      zug(tG, true, fort, () => 7);
      zug(tH, false, fort, i => 1.5 + 3.4 * Math.cbrt(Math.min(400, kr[i]) + 1.5));
      c.globalAlpha = 1;
    },
  };
}
