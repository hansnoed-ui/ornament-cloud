// Werkzeuge der Skizzen: periodische Hüllkurven, Gewichte im Kreis, Zufall mit Startwert, Korn.
export const TAU = Math.PI * 2;
export const welle = (p, versatz = 0) => 0.5 - 0.5 * Math.cos(TAU * (p - versatz));
export const sanft = x => x <= 0 ? 0 : x >= 1 ? 1 : x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2;
export const mix = (a, b, t) => a + (b - a) * t;
export function kreisGewichte(p, n, schaerfe = 3) {
  const w = Array.from({ length: n }, (_, i) => Math.pow(0.5 + 0.5 * Math.cos(TAU * (p - i / n)), schaerfe)), s = w.reduce((a, b) => a + b, 0);
  return w.map(x => x / s);
}
export function zufall(seed) {
  let a = seed >>> 0;
  return () => { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
/** Korn über die fertige Leinwand: sechs Rauschbilder im Wechsel, weich überlagert */
export function kornMacher(c, B, H) {
  const bilder = Array.from({ length: 6 }, (_, s) => {
    const k = globalThis.document.createElement('canvas'); k.width = B / 2; k.height = H / 2;
    const g = k.getContext('2d'), d = g.createImageData(k.width, k.height); let x = 1234567 + s * 7919;
    for (let i = 0; i < d.data.length; i += 4) { x = (x * 1103515245 + 12345) & 0x7fffffff; const v = x % 256; d.data[i] = d.data[i + 1] = d.data[i + 2] = v; d.data[i + 3] = 255; }
    g.putImageData(d, 0, 0); return k;
  });
  return (n, staerke = 0.06, art = 'overlay') => { c.globalCompositeOperation = art; c.globalAlpha = staerke; c.drawImage(bilder[n % 6], 0, 0, B, H); c.globalCompositeOperation = 'source-over'; c.globalAlpha = 1; };
}
