// Höhenkarte der Gravur (Keilschnitt) für die Blender-Szenen: weiss = tief. Platte 4,8 × 6,0.
//   node gravur.mjs <ziel.png> [faktor]   faktor 1 → 4096 × 5120 (kugeln.py), 1.5 → 6144 × 7680 (furchen.py, echte Geometrie)
import { createRequire } from 'node:module'; import { readFileSync, writeFileSync } from 'node:fs'; import { join } from 'node:path';
const require = createRequire(import.meta.url); const { chromium } = require(join(process.env.NODE_PATH, 'playwright'));
const font = readFileSync(new URL('../../../../alpha/theorie/stein/schrift/marcellus-latin-400-normal.woff2', import.meta.url)).toString('base64');
const b = await chromium.launch(); const p = await b.newPage();
await p.setContent(`<style>@font-face{font-family:M;src:url(data:font/woff2;base64,${font})}</style><div style="font-family:M">x</div>`);
const F = Number(process.argv[3] ?? 1);
const url = await p.evaluate(async (F) => {
  await document.fonts.load('400 100px M');
  const W = Math.round(4096 * F), H = Math.round(5120 * F), c = document.createElement('canvas'); c.width = W; c.height = H; const g = c.getContext('2d');
  g.fillStyle = '#000'; g.fillRect(0, 0, W, H); g.fillStyle = '#fff'; g.textAlign = 'center'; g.textBaseline = 'middle';
  const Z = ['KUNST BAUT', 'STELLEN, AN DENEN', 'WAHRNEHMUNG', 'DIFFERENT', 'WIEDERKEHREN', 'KANN.'], gr = 150 * F;
  g.font = `400 ${gr}px M`; g.letterSpacing = `${gr * 0.08}px`;
  Z.forEach((z, i) => g.fillText(z, W / 2, H * 0.5 + (i - (Z.length - 1) / 2) * gr * 1.25));
  // Steinmetzzeichen: das Signet von ornament.cloud, die Re-entry-Schlaufe r = 0,45 + cos t (wie src/videos/src/vorlage/Signet.tsx),
  // als eine gehauene Linie unter dem Satz, darunter klein der Name
  if (F >= 1.5) {
    const pkt = (t) => { const r = 0.45 + Math.cos(t); return [1.2 * r * Math.cos(t), 1.2 * r * Math.sin(t)]; };
    const P = Array.from({ length: 721 }, (_, i) => pkt(i / 720 * Math.PI * 2));
    const xs = P.map(q => q[0]), ys = P.map(q => q[1]);
    const mx = (Math.min(...xs) + Math.max(...xs)) / 2, my = (Math.min(...ys) + Math.max(...ys)) / 2, sp = Math.max(...xs) - Math.min(...xs);
    const M = W * 0.075 / sp, cx = W / 2, cy = H * 0.5 + 4.7 * gr * 1.25;
    g.strokeStyle = '#fff'; g.lineWidth = gr * 0.075; g.lineJoin = g.lineCap = 'round'; g.beginPath();
    P.forEach(([x, y], i) => (i ? g.lineTo : g.moveTo).call(g, cx + (x - mx) * M, cy + (y - my) * M)); g.closePath(); g.stroke();
    g.font = `400 ${gr * 0.32}px M`; g.letterSpacing = `${gr * 0.32 * 0.18}px`;
    g.fillText('ORNAMENT.CLOUD', W / 2, cy + (Math.max(...ys) - my) * M + gr * 0.55);
  }
  const bl = document.createElement('canvas'); bl.width = W; bl.height = H; const bg = bl.getContext('2d');
  bg.filter = `blur(${7 * F}px)`; bg.drawImage(c, 0, 0);
  const roh = g.getImageData(0, 0, W, H), weich = bg.getImageData(0, 0, W, H).data, d = roh.data;
  for (let i = 0; i < d.length; i += 4) { const v = d[i] > 127 ? Math.min(255, weich[i] * 1.6) : 0; d[i] = d[i + 1] = d[i + 2] = v; }
  g.putImageData(roh, 0, 0);
  // weiche Kante, damit die Kerbe nicht senkrecht abfällt
  bg.filter = `blur(${1.5 * F}px)`; bg.clearRect(0, 0, W, H); bg.drawImage(c, 0, 0);
  return bl.toDataURL('image/png');
}, F);
writeFileSync(process.argv[2], Buffer.from(url.split(',')[1], 'base64')); await b.close();
