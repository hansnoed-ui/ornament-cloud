// Steigerung · Tusche auf Papier · Begriff: Wiederholung. Dasselbe Zeichen zweimal wiederholt: oben als Addition (Rapport: eins neben das
// andere, in Ruhe), unten als Steigerung (jede Wiederholung nimmt die vorige mit: gedreht, vergrössert, überlagert), bis das Feld voll ist.
import { sanft } from './werkzeug.js';
export function baue({ c, B, H }) {
  const haken = [[0, 1], [0, 0], [0.75, 0], [0.75, 0.5], [0.25, 0.5], [0.25, 1], [1, 1]];
  function zeichen(x, y, s, w, al) {
    c.save(); c.translate(x, y); c.rotate(w); c.globalAlpha = al; c.beginPath();
    haken.forEach(([u, v], i) => { const px = (u - 0.5) * s, py = (v - 0.5) * s; if (i) c.lineTo(px, py); else c.moveTo(px, py); });
    c.stroke(); c.restore();
  }
  return {
    stelle(p) {
      c.globalAlpha = 1; c.fillStyle = '#ece6da'; c.fillRect(0, 0, B, H);
      c.strokeStyle = '#18161a'; c.lineWidth = 5; c.lineJoin = 'miter'; c.lineCap = 'square';
      const fort = sanft((p - 0.03) / 0.72), blass = 1 - sanft((p - 0.88) / 0.1), n = 11;
      // oben: Addition
      for (let i = 0; i < n; i++) { const a = sanft(fort * n - i); if (a > 0) zeichen(B * (0.09 + 0.82 * i / (n - 1)), H * 0.2, 62, 0, a * blass); }
      c.lineWidth = 2; c.globalAlpha = 0.25 * blass; c.beginPath(); c.moveTo(B * 0.06, H * 0.33); c.lineTo(B * 0.94, H * 0.33); c.stroke();
      // unten: Steigerung, 60 Schritte, jeder um den goldenen Winkel gedreht und ein wenig grösser
      const m = 64, gw = Math.PI * (3 - Math.sqrt(5));
      for (let i = 0; i < m; i++) {
        const a = sanft(fort * m - i); if (a <= 0) break;
        const s = 62 * Math.pow(1.036, i), r = 7 * Math.sqrt(i) * 5.2;
        c.lineWidth = Math.max(1.4, 5 - i * 0.05);
        zeichen(B / 2 + r * Math.cos(i * gw), H * 0.66 + r * Math.sin(i * gw), s, i * gw * 0.5, a * blass * (0.95 - 0.006 * i));
      }
      c.globalAlpha = 1;
    },
  };
}
