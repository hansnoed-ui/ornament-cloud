// Geflecht · Schleimpilz, Myzel · Begriff: Anschluss. Kein Plan, nur Spuren, denen Spuren folgen; daraus wird ein Netz.
// Teilchen laufen, riechen ihre eigene Spur und biegen zu ihr hin (Physarum). Das Netz wächst von der Mitte nach aussen, verdichtet sich,
// reisst und flickt sich; am Ende verblasst die Spur, die Schleife beginnt im Leeren.
import { TAU, sanft, zufall } from './werkzeug.js';
export function baue({ c, B, H }) {
  const W = 540, HH = 675, A = 90000, r = zufall(2005);
  const spur = new Float32Array(W * HH), neu = new Float32Array(W * HH);
  const ax = new Float32Array(A), ay = new Float32Array(A), aw = new Float32Array(A), geburt = new Float32Array(A);
  for (let i = 0; i < A; i++) { const w = r() * TAU, rad = 250 * Math.sqrt(r()); ax[i] = W / 2 + rad * Math.cos(w); ay[i] = HH / 2 + rad * Math.sin(w) * 1.2; aw[i] = r() * TAU; geburt[i] = (rad / 250) * 0.66; }
  const klein = globalThis.document.createElement('canvas'); klein.width = W; klein.height = HH;
  const kc = klein.getContext('2d'), bild = kc.createImageData(W, HH);
  const lies = (x, y) => spur[(((y | 0) + HH) % HH) * W + (((x | 0) + W) % W)];
  let stand = -1;
  function schritt(p) {
    const SA = 0.6, SD = 5, RA = 0.5, ab = p > 0.86 ? 0.8 : 0.9, gabe = 1 - sanft((p - 0.8) / 0.08);
    for (let i = 0; i < A; i++) {
      if (geburt[i] > p) continue;
      const w = aw[i], x = ax[i], y = ay[i];
      const v = lies(x + SD * Math.cos(w), y + SD * Math.sin(w)), l = lies(x + SD * Math.cos(w - SA), y + SD * Math.sin(w - SA)), re = lies(x + SD * Math.cos(w + SA), y + SD * Math.sin(w + SA));
      if (v < l || v < re) aw[i] += (l > re ? -RA : re > l ? RA : (r() - 0.5) * RA);
      aw[i] += (r() - 0.5) * 0.12;   // leichtes Zittern, sonst bevorzugt das Raster seine Achsen
      ax[i] = (x + Math.cos(aw[i]) + W) % W; ay[i] = (y + Math.sin(aw[i]) + HH) % HH;
      { const k = (ay[i] | 0) * W + (ax[i] | 0); spur[k] = Math.min(6, spur[k] + gabe); }   // gedeckelt, sonst frisst das Dicke das Feine
    }
    for (let y = 0; y < HH; y++) {
      const o = ((y + HH - 1) % HH) * W, m = y * W, u = ((y + 1) % HH) * W;
      for (let x = 0; x < W; x++) {
        const xl = (x + W - 1) % W, xr = (x + 1) % W;
        neu[m + x] = ab * (spur[o + xl] + spur[o + x] + spur[o + xr] + spur[m + xl] + spur[m + x] + spur[m + xr] + spur[u + xl] + spur[u + x] + spur[u + xr]) / 9;
      }
    }
    spur.set(neu);
  }
  return {
    stelle(p, n) {
      if (n % 600 === 0 && stand > 0) return;   // Bild 600 gleicht Bild 0: leer
      while (stand < n) { stand++; schritt(stand / 600); schritt(stand / 600); }
      const d = bild.data;
      for (let i = 0; i < W * HH; i++) {
        const s = Math.min(1, spur[i] * 0.22), q = s * s * (3 - 2 * s), k = i * 4;
        d[k] = 12 + q * 225; d[k + 1] = 18 + q * 212; d[k + 2] = 14 + q * 150; d[k + 3] = 255;
      }
      kc.putImageData(bild, 0, 0);
      c.globalAlpha = 1; c.imageSmoothingEnabled = true; c.drawImage(klein, 0, 0, B, H);
    },
  };
}
