// Tuschezug · Tusche auf Papier, ein Pinsel · Begriff: nichtreflexiv. Eine Linie, die nichts umreisst und über das Blatt hinausgeht.
// Zweite Fassung der Gotischen Linie nach den Regeln für höheren Anspruch: Ausschnitt statt Figur (die Bahn ist grösser als das Blatt),
// Stoff zuerst (Borsten, die trocken laufen und Streifen lassen; nasse Stellen, die auslaufen), die Hand ist mitgerechnet (in der Kurve
// langsam und breit, auf der Geraden schnell und dünn: Zwei-Drittel-Gesetz), eine Leerstelle rechts oben. Der Pinsel läuft einmal je
// Schleife um die geschlossene Bahn; was er vor einer Runde zog, ist zu einem blassen Grau getrocknet und wird überschrieben.
// Bezüge (Haltung, keine Nachbildung): Brice Marden, «Cold Mountain»; Henri Michaux; Cy Twombly; ostasiatische Grasschrift und ihr «fliegendes Weiss».
import { TAU, zufall } from './werkzeug.js';
export function baue({ c, B, H }) {
  const r = zufall(1911), N = 5200, BORSTEN = 26;
  const harm = [];
  for (let n = 1; n <= 17; n++) { const st = (n === 1 ? 0.62 : 1.0 / Math.pow(n, 1.02)) * (0.55 + 0.9 * r()); harm.push([n, st * (r() < 0.5 ? -1 : 1), st * (r() < 0.5 ? -1 : 1), r() * TAU, r() * TAU]); }
  const px = new Float32Array(N + 1), py = new Float32Array(N + 1);
  for (let i = 0; i <= N; i++) {
    const s = i / N; let x = 0, y = 0;
    for (const [n, ax, ay, fx, fy] of harm) { x += ax * Math.cos(TAU * n * s + fx); y += ay * Math.sin(TAU * n * s + fy); }
    px[i] = B * (0.4 + 0.5 * x); py[i] = H * (0.58 + 0.42 * y);   // nach links unten versetzt: rechts oben bleibt das Blatt leer
  }
  // Krümmung, Zeit nach dem Zwei-Drittel-Gesetz, Breite
  const kr = new Float32Array(N + 1), zeit = new Float32Array(N + 1), nx = new Float32Array(N + 1), ny = new Float32Array(N + 1);
  for (let i = 0; i <= N; i++) {
    const a = (i + N - 1) % N, b = (i + 1) % N, ax = px[i] - px[a], ay = py[i] - py[a], bx = px[b] - px[i], by = py[b] - py[i];
    const la = Math.hypot(ax, ay), lb = Math.hypot(bx, by);
    kr[i] = Math.abs(ax * by - ay * bx) / Math.max(1e-6, la * lb * (la + lb) / 2);
    const tx = px[b] - px[a], ty = py[b] - py[a], tl = Math.hypot(tx, ty) || 1; nx[i] = -ty / tl; ny[i] = tx / tl;
  }
  for (let i = 1; i <= N; i++) zeit[i] = zeit[i - 1] + Math.hypot(px[i] - px[i - 1], py[i] - py[i - 1]) * Math.cbrt(Math.min(0.05, kr[i]) * 400 + 0.6);
  for (let i = 0; i <= N; i++) zeit[i] /= zeit[N];
  const breite = i => (13 + 34 * Math.cbrt(Math.min(0.05, kr[i]) * 20)) * (0.8 + 0.35 * Math.sin(TAU * 5 * i / N + 1.3) * Math.sin(TAU * 2 * i / N));   // in der Kurve breit, dazu der Druck der Hand
  // Borsten: jede mit eigener Lage und eigenem Aussetzen (zusammenhängend entlang der Bahn)
  const lage = Array.from({ length: BORSTEN }, (_, b) => (b + 0.5) / BORSTEN * 2 - 1 + (r() - 0.5) * 0.05), saat = Array.from({ length: BORSTEN }, () => r() * 100);
  const wert = (b, s) => { const q = s * 34 + saat[b], i = Math.floor(q), f = q - i, h = k => { const v = Math.sin(k * 127.1 + b * 311.7) * 43758.5453; return v - Math.floor(v); }; return h(i) + (h(i + 1) - h(i)) * f * f * (3 - 2 * f); };
  // Papier einmal vorbereiten: warmes Weiss mit Fasern
  const papier = globalThis.document.createElement('canvas'); papier.width = B; papier.height = H;
  { const g = papier.getContext('2d'), d = g.createImageData(B, H); let z = 9173;
    for (let y = 0; y < H; y++) for (let x = 0; x < B; x++) { z = (z * 1103515245 + 12345) & 0x7fffffff; const f = (z % 1000) / 1000, k = (y * B + x) * 4, t = 233 - 9 * f + 4 * Math.sin(x * 0.011 + y * 0.004) + 3 * Math.sin(y * 0.9 + Math.sin(x * 0.02) * 3); d.data[k] = t; d.data[k + 1] = t - 5; d.data[k + 2] = t - 15; d.data[k + 3] = 255; }
    g.putImageData(d, 0, 0); }
  const TAUCH = 3;   // dreimal je Runde wird neu eingetaucht
  return {
    stelle(p) {
      c.globalAlpha = 1; c.globalCompositeOperation = 'source-over'; c.drawImage(papier, 0, 0);
      c.lineCap = 'round';
      // der Kopf des Pinsels: Stelle auf der Bahn zur Zeit p
      let kopf = 0; { let lo = 0, hi = N; while (hi - lo > 1) { const m = (lo + hi) >> 1; if (zeit[m] <= p) lo = m; else hi = m; } kopf = lo; }
      // von der ältesten Stelle (gleich vor dem Kopf) zur jüngsten zeichnen, damit Neues über Altem liegt
      for (let k = 1; k <= N; k++) {
        const i = (kopf + k) % N, j = (i + N - 1) % N; if (i === 0) continue;
        const alter = ((p - zeit[i]) % 1 + 1) % 1;                                  // 0 eben gezogen, gegen 1 uralt
        const nass = Math.max(0, 1 - alter / 0.06), trocken = alter < 0.5 ? 0.92 - 0.5 * alter : 0.67 - 1.1 * (alter - 0.5);
        const ladung = 1 - ((zeit[i] * TAUCH) % 1);                                  // Tusche im Pinsel seit dem letzten Eintauchen
        const w = breite(i) * (0.75 + 0.35 * ladung), deck = Math.max(0.05, trocken);
        if (nass > 0 && k % 3 === 0) { c.strokeStyle = `rgba(20,19,24,${0.05 * nass * ladung})`; c.lineWidth = w * 1.5; c.beginPath(); c.moveTo(px[j], py[j]); c.lineTo(px[i], py[i]); c.stroke(); }
        // nasser Kern: wo der Pinsel voll ist, schliessen sich die Borsten zur Fläche
        if (ladung > 0.45) { c.strokeStyle = `rgba(20,19,24,${(deck * Math.min(1, (ladung - 0.45) * 2.4) * 0.9).toFixed(3)})`; c.lineWidth = w * 0.86; c.beginPath(); c.moveTo(px[j], py[j]); c.lineTo(px[i], py[i]); c.stroke(); }
        c.lineWidth = w / BORSTEN * 2.1;
        for (let b = 0; b < BORSTEN; b++) {
          // eine Borste setzt aus, wenn die Tusche knapp wird; am Rand zuerst
          const not = wert(b, zeit[i] * 7 + i / N) + 0.25 * Math.abs(lage[b]);
          if (not > 0.22 + 1.0 * ladung) continue;
          const o = lage[b] * w / 2, a = deck * (0.55 + 0.45 * ladung) * (0.75 + 0.25 * wert(b, i / N * 3));
          c.strokeStyle = `rgba(22,21,26,${a.toFixed(3)})`;
          c.beginPath(); c.moveTo(px[j] + nx[j] * o, py[j] + ny[j] * o); c.lineTo(px[i] + nx[i] * o, py[i] + ny[i] * o); c.stroke();
        }
      }
    },
  };
}
