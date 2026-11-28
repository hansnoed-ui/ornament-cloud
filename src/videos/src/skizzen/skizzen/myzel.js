// Myzel · Schleimpilz auf Rinde · Begriff: Anschluss. Kein Plan, nur Spuren, denen Spuren folgen; dazwischen drei Haferflocken, die das
// Netz findet und verbindet. Zweite Fassung von «geflecht» nach den Regeln für höheren Anspruch: Ausschnitt statt Figur (das Netz wächst
// vom unteren Rand herein, die Nahrung liegt ungleich verteilt), Stoff zuerst (gelber Plasmodienschleim auf feuchter, dunkler Rinde,
// dicke Adern und feine Fächer am Rand), eine Entscheidung (die Flocken sind die einzigen hellen Flächen), Zeit mit Gewicht (am Schluss
// zieht sich der Schleim zurück, die Adern trocknen ein).
// Bezüge (Haltung, keine Nachbildung): Toshiyuki Nakagaki, der Schleimpilz im Labyrinth (2000) und das Bahnnetz um Tokio (2010);
// Tomás Saraceno; Heather Barnett.
import { TAU, sanft, zufall } from './werkzeug.js';
export function baue({ c, B, H }) {
  const W = 540, HH = 675, A = 110000, r = zufall(2010);
  const spur = new Float32Array(W * HH), neu = new Float32Array(W * HH);
  const ax = new Float32Array(A), ay = new Float32Array(A), aw = new Float32Array(A), geburt = new Float32Array(A);
  // das Plasmodium kommt von unten links herein: jedes Teilchen entsteht in einer Halbscheibe, die mit der Zeit wächst
for (let i = 0; i < A; i++) { const w = -Math.PI * r(), rad = 560 * Math.sqrt(r()); ax[i] = Math.min(W - 3, Math.max(2, W * 0.32 + rad * Math.cos(w))); ay[i] = Math.min(HH - 3, Math.max(2, HH * 0.98 + rad * Math.sin(w))); aw[i] = r() * TAU; geburt[i] = (rad / 560) * 0.6; }
  const FLOCKEN = [[0.28, 0.32, 15], [0.74, 0.5, 12], [0.55, 0.12, 10]].map(([x, y, rad]) => [x * W, y * HH, rad]);
  const klein = globalThis.document.createElement('canvas'); klein.width = W; klein.height = HH;
  const kc = klein.getContext('2d'), bild = kc.createImageData(W, HH);
  // Rinde einmal vorbereiten
  const rinde = new Float32Array(W * HH);
  for (let y = 0; y < HH; y++) for (let x = 0; x < W; x++) { const a = Math.sin(x * 0.045 + Math.sin(y * 0.011) * 4) * 0.5 + Math.sin(x * 0.13 + y * 0.004) * 0.25 + Math.sin(x * 0.009) * 0.4; rinde[y * W + x] = a + (r() - 0.5) * 0.35; }
  const lies = (x, y) => spur[(((y | 0) + HH) % HH) * W + (((x | 0) + W) % W)];
  let stand = -1;
  function schritt(p) {
    const SA = 0.6, SD = 5, RA = 0.5, gabe = 1 - sanft((p - 0.72) / 0.14), ab = 0.92 - 0.06 * sanft((p - 0.74) / 0.2);
    for (let i = 0; i < A; i++) {
      if (geburt[i] > p) continue;
      const w = aw[i], x = ax[i], y = ay[i];
      const v = lies(x + SD * Math.cos(w), y + SD * Math.sin(w)), l = lies(x + SD * Math.cos(w - SA), y + SD * Math.sin(w - SA)), re = lies(x + SD * Math.cos(w + SA), y + SD * Math.sin(w + SA));
      if (v < l || v < re) aw[i] += (l > re ? -RA : RA);
      aw[i] += (r() - 0.5) * 0.14;
      let nx = x + Math.cos(aw[i]), ny = y + Math.sin(aw[i]);
      if (nx < 1 || nx > W - 2 || ny < 1 || ny > HH - 2) { aw[i] = r() * TAU; nx = x; ny = y; }
      ax[i] = nx; ay[i] = ny;
      const k = (ny | 0) * W + (nx | 0); spur[k] = Math.min(6, spur[k] + gabe);
    }
    for (const [fx, fy, rad] of FLOCKEN) for (let dy = -rad; dy <= rad; dy++) for (let dx = -rad; dx <= rad; dx++) if (dx * dx + dy * dy <= rad * rad) spur[((fy + dy) | 0) * W + ((fx + dx) | 0)] += 1.4 * gabe * (p > 0.12 ? 1 : 0);
    for (let y = 1; y < HH - 1; y++) for (let x = 1; x < W - 1; x++) {
      const m = y * W + x;
      neu[m] = ab * (spur[m - W - 1] + spur[m - W] + spur[m - W + 1] + spur[m - 1] + spur[m] + spur[m + 1] + spur[m + W - 1] + spur[m + W] + spur[m + W + 1]) / 9;
    }
    spur.set(neu);
  }
  return {
    stelle(p, n) {
      if (n % 600 === 0 && stand > 0) return;
      while (stand < n) { stand++; schritt(stand / 600); schritt(stand / 600); }
      const d = bild.data, glanz = 1 - sanft((p - 0.8) / 0.18);
      for (let y = 0; y < HH; y++) for (let x = 0; x < W; x++) {
        const i = y * W + x, s = Math.min(1, spur[i] * 0.22), q = s * s * (3 - 2 * s), k = i * 4, rb = rinde[i];
        // Rinde: dunkles Braun mit Furchen
        let R = 38 + 14 * rb, G = 28 + 10 * rb, Bl = 20 + 7 * rb;
        // Schleim: gelb, dick in den Adern, am Rand durchscheinend; eingetrocknet ein bräunlicher Schatten
        const g = q * glanz, alt = q * (1 - glanz) * 0.5;
        R = R * (1 - g) + 238 * g; G = G * (1 - g) + 196 * g; Bl = Bl * (1 - g) + 52 * g;
        R = R * (1 - alt) + 92 * alt; G = G * (1 - alt) + 70 * alt; Bl = Bl * (1 - alt) + 34 * alt;
        d[k] = R; d[k + 1] = G; d[k + 2] = Bl; d[k + 3] = 255;
      }
      kc.putImageData(bild, 0, 0);
      c.globalAlpha = 1; c.imageSmoothingEnabled = true; c.drawImage(klein, 0, 0, B, H);
      // die Flocken: hell, matt, mit Rand
      for (const [fx, fy, rad] of FLOCKEN) {
        const X = fx * B / W, Y = fy * H / HH, R = rad * B / W * 1.05;
        c.fillStyle = 'rgba(0,0,0,.35)'; c.beginPath(); c.ellipse(X + 5, Y + 6, R, R * 0.8, 0.4, 0, TAU); c.fill();
        c.fillStyle = '#e9dfc3'; c.beginPath(); c.ellipse(X, Y, R, R * 0.8, 0.4, 0, TAU); c.fill();
        c.strokeStyle = 'rgba(150,120,70,.6)'; c.lineWidth = 2; c.stroke();
      }
    },
  };
}
