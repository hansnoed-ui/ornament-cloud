// Höhenkarte der Gravur (Keilschnitt) für die Blender-Szene: weiss = tief. 4096 × 5120 für eine Platte 4,8 × 6,0.
import { createRequire } from 'node:module'; import { readFileSync, writeFileSync } from 'node:fs'; import { join } from 'node:path';
const require = createRequire(import.meta.url); const { chromium } = require(join(process.env.NODE_PATH, 'playwright'));
const font = readFileSync(new URL('../../../../alpha/theorie/stein/schrift/marcellus-latin-400-normal.woff2', import.meta.url)).toString('base64');
const b = await chromium.launch(); const p = await b.newPage();
await p.setContent(`<style>@font-face{font-family:M;src:url(data:font/woff2;base64,${font})}</style><div style="font-family:M">x</div>`);
const url = await p.evaluate(async () => {
  await document.fonts.load('400 100px M');
  const W = 4096, H = 5120, c = document.createElement('canvas'); c.width = W; c.height = H; const g = c.getContext('2d');
  g.fillStyle = '#000'; g.fillRect(0, 0, W, H); g.fillStyle = '#fff'; g.textAlign = 'center'; g.textBaseline = 'middle';
  const Z = ['KUNST BAUT', 'STELLEN, AN DENEN', 'WAHRNEHMUNG', 'DIFFERENT', 'WIEDERKEHREN', 'KANN.'], gr = 150;
  g.font = `400 ${gr}px M`; g.letterSpacing = `${gr * 0.08}px`;
  Z.forEach((z, i) => g.fillText(z, W / 2, H * 0.5 + (i - (Z.length - 1) / 2) * gr * 1.25));
  const bl = document.createElement('canvas'); bl.width = W; bl.height = H; const bg = bl.getContext('2d');
  bg.filter = 'blur(7px)'; bg.drawImage(c, 0, 0);
  const roh = g.getImageData(0, 0, W, H), weich = bg.getImageData(0, 0, W, H).data, d = roh.data;
  for (let i = 0; i < d.length; i += 4) { const v = d[i] > 127 ? Math.min(255, weich[i] * 1.6) : 0; d[i] = d[i + 1] = d[i + 2] = v; }
  g.putImageData(roh, 0, 0);
  // weiche Kante, damit die Kerbe nicht senkrecht abfällt
  bg.filter = 'blur(1.5px)'; bg.clearRect(0, 0, W, H); bg.drawImage(c, 0, 0);
  return bl.toDataURL('image/png');
});
writeFileSync(process.argv[2], Buffer.from(url.split(',')[1], 'base64')); await b.close();
