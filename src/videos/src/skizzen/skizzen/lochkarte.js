// Lochkarte · Karton, Licht von hinten · Begriff: Kontingenz. Eine Kette von Webkarten wie am Jacquard-Stuhl; gelocht ist jede
// Primzahl, dreissig Zahlen je Reihe. Niemand hat das Muster gelegt, und doch stehen die Löcher in acht Spalten: Ausser 2, 3 und 5
// liegt jede Primzahl in einer der acht Spalten, die mit 30 keinen Teiler teilen. Darin aber ohne Regel.
// Zweite Fassung von «primzahlen» nach den Regeln für höheren Anspruch: Ausschnitt statt Figur (die Kette läuft schräg durch das Bild
// und über die Ränder), Stoff zuerst (Karton mit Fasern, gestanzte Löcher, Schatten zwischen den Karten), eine Entscheidung (die
// Karten sind mit rotem Garn verschnürt), Zeit mit Gewicht (die Kette ist geschlossen und läuft einmal ganz durch).
// Bezüge (Haltung, keine Nachbildung): Jacquard-Karten; Ada Lovelace über die analytische Maschine, die algebraische Muster webe wie der
// Jacquard-Stuhl Blumen und Blätter; Hanne Darboven; Channa Horwitz.
import { TAU, zufall } from './werkzeug.js';
export function baue({ c, B, H }) {
  const SP = 30, RE = 14, KARTEN = 10, N = SP * RE * KARTEN, prim = new Uint8Array(N + 2).fill(1); prim[0] = prim[1] = 0;
  for (let i = 2; i * i <= N + 1; i++) if (prim[i]) for (let j = i * i; j <= N + 1; j += i) prim[j] = 0;
  const r = zufall(1804), KW = 820, KH = 500, LOCH = KW / (SP + 4) * 0.36, TEIL = KW / (SP + 4);
  // jede Karte einmal vorzeichnen: Karton, Löcher (durchsichtig), Nummer klein, Schnürlöcher
  const karten = Array.from({ length: KARTEN }, (_, k) => {
    const kc = globalThis.document.createElement('canvas'); kc.width = KW; kc.height = KH; const g = kc.getContext('2d');
    const d = g.createImageData(KW, KH); let z = 1000 + k * 77;
    for (let y = 0; y < KH; y++) for (let x = 0; x < KW; x++) { z = (z * 1103515245 + 12345) & 0x7fffffff; const f = (z % 1000) / 1000, i = (y * KW + x) * 4, t = 150 - 14 * f + 5 * Math.sin(x * 0.05 + y * 0.013 + k); d.data[i] = t + 10; d.data[i + 1] = t - 2; d.data[i + 2] = t - 28; d.data[i + 3] = 255; }
    g.putImageData(d, 0, 0);
    g.strokeStyle = 'rgba(80,60,30,.35)'; g.lineWidth = 2; g.strokeRect(1, 1, KW - 2, KH - 2);
    g.globalCompositeOperation = 'destination-out';
    for (let re = 0; re < RE; re++) for (let sp = 0; sp < SP; sp++) {
      const n = 1 + (k * RE + re) * SP + sp; if (!prim[n]) continue;
      g.beginPath(); g.arc(TEIL * (sp + 2) + (r() - 0.5) * 1.4, KH * 0.09 + (KH * 0.82) * (re + 0.5) / RE + (r() - 0.5) * 1.4, LOCH * (0.95 + 0.1 * r()), 0, TAU); g.fill();
    }
    for (const sx of [TEIL * 0.75, KW - TEIL * 0.75]) for (const sy of [KH * 0.22, KH * 0.5, KH * 0.78]) { g.beginPath(); g.arc(sx, sy, LOCH * 0.8, 0, TAU); g.fill(); }
    return kc;
  });
  // Licht hinter der Kette: warm, ungleichmässig
  const licht = c.createRadialGradient(B * 0.62, H * 0.42, 40, B * 0.55, H * 0.5, H * 0.75);
  licht.addColorStop(0, 'rgb(255,240,200)'); licht.addColorStop(0.55, 'rgb(240,178,92)'); licht.addColorStop(1, 'rgb(120,66,26)');
  return {
    stelle(p) {
      c.globalAlpha = 1; c.globalCompositeOperation = 'source-over'; c.fillStyle = licht; c.fillRect(0, 0, B, H);
      // die Kette schräg und gross, Ausschnitt; geschlossen: in 20 s läuft sie einmal ganz durch
      c.save(); c.translate(B * 0.52, H * 0.5); c.rotate(-0.42); c.scale(1.25, 1.25);
      const ganz = KARTEN * (KH + 6), lauf = p * ganz;
      for (let k = -2; k < KARTEN + 2; k++) {
        const y = -ganz / 2 + k * (KH + 6) - lauf, yy = ((y + ganz / 2) % ganz + ganz) % ganz - ganz / 2;
        if (yy > 1100 || yy < -1100 - KH) continue;
        const idx = ((k % KARTEN) + KARTEN) % KARTEN;
        c.drawImage(karten[idx], -KW / 2, yy);
        c.fillStyle = 'rgba(40,24,10,.5)'; c.fillRect(-KW / 2, yy + KH, KW, 6);   // Spalt zwischen zwei Karten
        // rotes Garn zur nächsten Karte
        c.strokeStyle = 'rgba(150,32,26,.92)'; c.lineWidth = 3;
        for (const sx of [-KW / 2 + TEIL * 0.75, KW / 2 - TEIL * 0.75]) { c.beginPath(); c.moveTo(sx, yy + KH * 0.78); c.bezierCurveTo(sx + 9, yy + KH * 0.95, sx - 9, yy + KH + 30, sx, yy + KH + 6 + KH * 0.22); c.stroke(); }
      }
      c.restore();
      // das Licht, das durch die Löcher fällt, blüht ein wenig über
      c.globalCompositeOperation = 'lighter'; c.globalAlpha = 0.14; c.filter = 'blur(10px)'; c.drawImage(c.canvas, 0, 0); c.filter = 'none';
      c.globalCompositeOperation = 'source-over'; c.globalAlpha = 1;
    },
  };
}
