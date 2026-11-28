// Laufende Inschrift für meisseln.py: ein Satz der Theorie, genau eine Musterlänge (2,6 m) lang, damit er mit der Platte nahtlos
// weiterläuft. 2800 Pixel je Meter, 10 cm hoch; weiss = Schrift. Danach keil.py für den Keilschnitt.
//   node inschrift.mjs <ziel.png> ["SATZ"]
import { createRequire } from 'node:module'; import { readFileSync, writeFileSync } from 'node:fs'; import { join } from 'node:path';
const require = createRequire(import.meta.url); const { chromium } = require(join(process.env.NODE_PATH, 'playwright'));
const font = readFileSync(new URL('../../../../alpha/theorie/stein/schrift/marcellus-latin-400-normal.woff2', import.meta.url)).toString('base64');
const SATZ = process.argv[3] ?? 'MATERIAL IST, WAS WIDERSTAND LEISTET';
const b = await chromium.launch(); const p = await b.newPage();
await p.setContent(`<style>@font-face{font-family:M;src:url(data:font/woff2;base64,${font})}</style><div style="font-family:M">x</div>`);
const url = await p.evaluate(async (SATZ) => {
  await document.fonts.load('400 100px M');
  const W = 7280, H = 280, c = document.createElement('canvas'); c.width = W; c.height = H; const g = c.getContext('2d');
  g.fillStyle = '#000'; g.fillRect(0, 0, W, H); g.fillStyle = '#fff'; g.textBaseline = 'middle';
  const text = SATZ + '  ·  ';
  // Schriftgrösse so, dass Versalhöhe rund 7,5 cm; Sperrung so, dass der Satz samt Trenner genau W füllt
  const gr = 300; g.font = `400 ${gr}px M`; g.letterSpacing = '0px';
  const roh = g.measureText(text).width, sperr = (W - roh) / text.length;
  g.letterSpacing = `${sperr}px`;
  // zweimal zeichnen, damit der Übergang am Rand stimmt
  g.fillText(text, sperr / 2, H * 0.53); g.fillText(text, sperr / 2 - W, H * 0.53);
  return [c.toDataURL('image/png'), sperr];
}, SATZ);
console.log('Sperrung', url[1].toFixed(1), 'px');
writeFileSync(process.argv[2], Buffer.from(url[0].split(',')[1], 'base64')); await b.close();
