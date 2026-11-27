// Primzahlen · Kreide auf Kobalt · Begriff: Kontingenz. Niemand hat diese Ordnung gelegt, und doch zeigt jede Anordnung der Zahlen eine andere.
// Die Zahlen 1 bis 7000 wandern durch drei Anordnungen: Reihen zu 72, die eckige Spirale von Ulam, die runde von Sacks. Hell sind die Primzahlen.
import { TAU, kreisGewichte } from './werkzeug.js';
export function baue({ c, B, H }) {
  const N = 7000, prim = new Uint8Array(N + 1).fill(1); prim[0] = prim[1] = 0;
  for (let i = 2; i * i <= N; i++) if (prim[i]) for (let j = i * i; j <= N; j += i) prim[j] = 0;
  const A = new Float32Array(N * 2), U = new Float32Array(N * 2), S = new Float32Array(N * 2);
  let x = 0, y = 0, dx = 1, dy = 0, lauf = 1, getan = 0, wende = 0;
  const SP = 72, zeilen = Math.ceil(N / SP), ur = Math.sqrt(N) / 2;
  for (let n = 1; n <= N; n++) {
    const k = (n - 1) * 2;
    A[k] = (((n - 1) % SP) / (SP - 1) - 0.5) * 1.84; A[k + 1] = (Math.floor((n - 1) / SP) / (zeilen - 1) - 0.5) * 2.5;
    U[k] = x / ur * 0.92; U[k + 1] = y / ur * 0.92;
    x += dx; y += dy; if (++getan === lauf) { getan = 0; [dx, dy] = [-dy, dx]; if (++wende % 2 === 0) lauf++; }
    const r = Math.sqrt(n / N), th = TAU * Math.sqrt(n);
    S[k] = r * Math.cos(th) * 0.95; S[k + 1] = r * Math.sin(th) * 0.95;
  }
  return {
    stelle(p) {
      const w = kreisGewichte(p, 3, 4), M = B * 0.46;
      c.globalAlpha = 1; c.fillStyle = '#16296f'; c.fillRect(0, 0, B, H);
      for (let n = 1; n <= N; n++) {
        const k = (n - 1) * 2, px = B / 2 + M * (w[0] * A[k] + w[1] * U[k] + w[2] * S[k]), py = H / 2 + M * (w[0] * A[k + 1] + w[1] * U[k + 1] + w[2] * S[k + 1]);
        if (prim[n]) { c.fillStyle = '#f4f1e8'; c.globalAlpha = 0.95; c.beginPath(); c.arc(px, py, 3.4, 0, TAU); c.fill(); }
        else { c.fillStyle = '#8fa2e6'; c.globalAlpha = 0.22; c.fillRect(px - 1, py - 1, 2, 2); }
      }
      c.globalAlpha = 1;
    },
  };
}
