// Millimeter · Bleistift und Farbstift auf Millimeterpapier · Begriff: Wiederkehr ohne Rückkehr. Gerade Linien, mit dem Lineal gezogen,
// von einem Punkt des Kreises zu einem anderen, den ein zweiter, langsamerer Umlauf bestimmt. Keine Linie ist gekrümmt, und doch
// entstehen Kurven: die Hüllen, die niemand zeichnet. Zweite Fassung von «harmonograph» nach den Regeln für höheren Anspruch:
// Ausschnitt statt Figur (der Kreis ist grösser als das Blatt und sitzt links unten), Stoff zuerst (vergilbtes Millimeterpapier,
// Grafit, der körnt, Farbstift, der wachsig deckt), die Hand ist mitgerechnet (jede Linie setzt etwas daneben an, drückt ungleich,
// schiesst über), eine Entscheidung (ein einziges Rot, spät und sparsam), Zeit mit Gewicht (die Zeichnung wächst langsam und steht).
// Bezüge (Haltung, keine Nachbildung): Emma Kunz, Pendelzeichnungen; Hilma af Klint; Channa Horwitz; Fadengrafik.
import { TAU, sanft, zufall } from './werkzeug.js';
export function baue({ c, B, H }) {
  const r = zufall(1953);
  // Papier: vergilbt, mit Millimeter-, Halbzentimeter- und Zentimeterlinien in blassem Orange, leicht schief aufgelegt
  const papier = globalThis.document.createElement('canvas'); papier.width = B; papier.height = H;
  { const g = papier.getContext('2d'), d = g.createImageData(B, H); let z = 4711;
    for (let y = 0; y < H; y++) for (let x = 0; x < B; x++) { z = (z * 1103515245 + 12345) & 0x7fffffff; const f = (z % 1000) / 1000, k = (y * B + x) * 4, t = 236 - 7 * f - 5 * Math.pow(Math.hypot(x / B - 0.5, y / H - 0.5) * 1.5, 2) * 4; d.data[k] = t; d.data[k + 1] = t - 6; d.data[k + 2] = t - 24; d.data[k + 3] = 255; }
    g.putImageData(d, 0, 0);
    g.translate(B / 2, H / 2); g.rotate(-0.012); g.translate(-B / 2, -H / 2);
    const mm = 9.6;
    for (let i = -20; i * mm < B + 200; i++) { const stark = i % 10 === 0 ? 0.5 : i % 5 === 0 ? 0.3 : 0.14; g.strokeStyle = `rgba(214,118,52,${stark})`; g.lineWidth = i % 10 === 0 ? 1.1 : 0.7; g.beginPath(); g.moveTo(i * mm, -200); g.lineTo(i * mm, H + 200); g.stroke(); }
    for (let i = -20; i * mm < H + 200; i++) { const stark = i % 10 === 0 ? 0.5 : i % 5 === 0 ? 0.3 : 0.14; g.strokeStyle = `rgba(214,118,52,${stark})`; g.lineWidth = i % 10 === 0 ? 1.1 : 0.7; g.beginPath(); g.moveTo(-200, i * mm); g.lineTo(B + 200, i * mm); g.stroke(); }
  }
  // Schichten: je eine Folge gerader Linien von Winkel t zu Winkel k·t auf zwei Kreisen; Stift, Zeitfenster, Zahl
  const MX = B * 0.3, MY = H * 0.68, R = B * 0.92;
  const SCHICHT = [
    { k: 2, n: 210, ra: 1.0, rb: 1.0, stift: [38, 38, 44], al: 0.42, lw: 0.9, von: 0.03, bis: 0.34 },
    { k: 3, n: 150, ra: 0.72, rb: 1.0, stift: [44, 72, 128], al: 0.5, lw: 1.1, von: 0.26, bis: 0.52 },
    { k: 5 / 2, n: 96, ra: 1.0, rb: 0.46, stift: [38, 38, 44], al: 0.36, lw: 0.8, von: 0.44, bis: 0.66 },
    { k: 4, n: 40, ra: 0.46, rb: 0.72, stift: [176, 46, 34], al: 0.62, lw: 1.3, von: 0.62, bis: 0.74 },
  ];
  const linien = [];
  for (const s of SCHICHT) for (let i = 0; i < s.n; i++) {
    const t = TAU * i / s.n, t2 = s.k * t, w = () => (r() - 0.5) * 5;
    linien.push({ s, zeit: s.von + (s.bis - s.von) * i / s.n, ax: MX + R * s.ra * Math.cos(t) + w(), ay: MY + R * s.ra * Math.sin(t) + w(), bx: MX + R * s.rb * Math.cos(t2) + w(), by: MY + R * s.rb * Math.sin(t2) + w(),
      druck: 0.65 + 0.5 * r(), ueber: 6 + 22 * r(), saat: r() * 1000 });
  }
  linien.sort((a, b) => a.zeit - b.zeit);
  function linie(l, fort, deck) {
    // der Stift setzt an, zieht mit ungleichem Druck und schiesst am Ende etwas über; Grafit körnt (kurze Aussetzer)
    const dx = l.bx - l.ax, dy = l.by - l.ay, len = Math.hypot(dx, dy) || 1, ux = dx / len, uy = dy / len, ende = fort * (len + l.ueber);
    const [fr, fg, fb] = l.s.stift, st = 46;
    for (let a = -l.ueber * 0.4; a < ende; a += st) {
      const b = Math.min(ende, a + st), q = Math.sin(l.saat + a * 0.013) * 43758.5453, kornig = 0.55 + 0.45 * (q - Math.floor(q));
      c.strokeStyle = `rgba(${fr},${fg},${fb},${(l.s.al * l.druck * kornig * deck).toFixed(3)})`; c.lineWidth = l.s.lw * (0.8 + 0.4 * kornig);
      c.beginPath(); c.moveTo(l.ax + ux * a, l.ay + uy * a); c.lineTo(l.ax + ux * b, l.ay + uy * b); c.stroke();
    }
  }
  return {
    stelle(p) {
      c.globalAlpha = 1; c.globalCompositeOperation = 'source-over'; c.drawImage(papier, 0, 0);
      c.globalCompositeOperation = 'multiply'; c.lineCap = 'butt';
      const weg = 1 - sanft((p - 0.9) / 0.09);          // am Ende wird radiert: alles verblasst zugleich
      for (const l of linien) {
        if (l.zeit > p) break;
        linie(l, sanft((p - l.zeit) / 0.012), weg);
      }
      // die Punkte auf dem Kreis, die das Lineal anlegt: kleine Einstiche
      c.globalCompositeOperation = 'source-over'; c.fillStyle = `rgba(30,30,36,${0.5 * weg})`;
      for (const l of linien) { if (l.zeit > p) break; if (l.s.k !== 2) continue; c.beginPath(); c.arc(l.ax, l.ay, 1.6, 0, TAU); c.fill(); }
    },
  };
}
