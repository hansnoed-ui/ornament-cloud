// Maske einer Inschrift für eine Tafel (granit.py): Zeilen in Marcellus, darunter das Signet von ornament.cloud (Re-entry-Schlaufe)
// und der Name. 3000 Pixel je Meter; weiss = Schrift. Danach keil.py für den Keilschnitt.
//   node tafel.mjs <ziel.png> <breite_m> <hoehe_m> "ZEILE|ZEILE|…"
import { createRequire } from 'node:module'; import { readFileSync, writeFileSync } from 'node:fs'; import { join } from 'node:path';
const require = createRequire(import.meta.url); const { chromium } = require(join(process.env.NODE_PATH, 'playwright'));
const font = readFileSync(new URL('../../../../alpha/theorie/stein/schrift/marcellus-latin-400-normal.woff2', import.meta.url)).toString('base64');
const [ziel, bm, hm, zeilen] = process.argv.slice(2);
const b = await chromium.launch(); const p = await b.newPage();
await p.setContent(`<style>@font-face{font-family:M;src:url(data:font/woff2;base64,${font})}</style><div style="font-family:M">x</div>`);
const url = await p.evaluate(async ([bm, hm, zeilen]) => {
  await document.fonts.load('400 100px M');
  const PX = 3000, W = Math.round(bm * PX), H = Math.round(hm * PX), c = document.createElement('canvas'); c.width = W; c.height = H; const g = c.getContext('2d');
  g.fillStyle = '#000'; g.fillRect(0, 0, W, H); g.fillStyle = '#fff'; g.strokeStyle = '#fff'; g.textAlign = 'center'; g.textBaseline = 'middle';
  const Z = zeilen.split('|'); let gr = 600;
  for (; gr > 100; gr -= 10) { g.font = `400 ${gr}px M`; g.letterSpacing = `${gr * 0.08}px`; if (Math.max(...Z.map(z => g.measureText(z).width)) < W * 0.86) break; }
  const zh = gr * 1.22, oben = H * 0.36 - (Z.length - 1) / 2 * zh;
  Z.forEach((z, i) => g.fillText(z, W / 2, oben + i * zh));
  const pkt = (t) => { const r = 0.45 + Math.cos(t); return [1.2 * r * Math.cos(t), 1.2 * r * Math.sin(t)]; };
  const P = Array.from({ length: 721 }, (_, i) => pkt(i / 720 * Math.PI * 2));
  const xs = P.map(q => q[0]), ys = P.map(q => q[1]);
  const mx = (Math.min(...xs) + Math.max(...xs)) / 2, my = (Math.min(...ys) + Math.max(...ys)) / 2, sp = Math.max(...xs) - Math.min(...xs);
  const M = W * 0.13 / sp, cx = W / 2, cy = oben + (Z.length - 1) * zh + gr * 1.7 + (Math.max(...ys) - my) * M;
  g.lineWidth = gr * 0.07; g.lineJoin = g.lineCap = 'round'; g.beginPath();
  P.forEach(([x, y], i) => (i ? g.lineTo : g.moveTo).call(g, cx + (x - mx) * M, cy + (y - my) * M)); g.closePath(); g.stroke();
  g.font = `400 ${gr * 0.3}px M`; g.letterSpacing = `${gr * 0.3 * 0.2}px`;
  g.fillText('ORNAMENT.CLOUD', W / 2, cy + (Math.max(...ys) - my) * M + gr * 0.5);
  return [c.toDataURL('image/png'), gr];
}, [Number(bm), Number(hm), zeilen]);
console.log('Schriftgrösse', url[1], 'px');
writeFileSync(ziel, Buffer.from(url[0].split(',')[1], 'base64')); await b.close();
