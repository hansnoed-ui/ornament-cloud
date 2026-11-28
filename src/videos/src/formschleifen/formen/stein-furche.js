// Stein, Fahrt durch die Furchen (Versuch, 28. November 2026). Christian: «Vielleicht sind ja auch gemeisselte Effekte möglich, Fahrt
// durch die Furchen etc. Schauen, wo eine solche Darstellung inhaltlich passt. Hieroglyphen etc.?»
// Ein Satz der Theorie ist in Marmor gehauen (Keilschnitt, Marcellus). Die Kamera beginnt oben, wo man liest, sinkt flach über den Stein,
// bis die Buchstaben zu Gräben und Wänden werden, fährt die Zeile entlang und steigt am Ende wieder auf. Vom Lesen zum Begehen: die Schrift
// wird Ornament, sobald man ihr zu nahe kommt (Zettel 3/1: Ornament als Schrift der Kunst; 3/7: wenn die Führung vom Auge zum Körper geht).
import { T, welle, sanft, mix } from './werkzeug.js';
import { steinplatte, BREIT, HOCH } from './stein-gemeinsam.js';

const ZEILEN = ['KUNST BAUT', 'STELLEN'], TIEF = 0.06;

export async function baue({ szene, kamera, renderer }) {
  await globalThis.document.fonts.load('400 120px Marcellus');
  const s = await steinplatte({ szene, renderer, seg: 900 });
  // Schrift als Höhenfeld (Keilschnitt: tiefste Stelle in der Mitte des Strichs, nach aussen ansteigend)
  const W = 1600, H = 2000, c = globalThis.document.createElement('canvas'); c.width = W; c.height = H;
  const g = c.getContext('2d', { willReadFrequently: true });
  g.fillStyle = '#000'; g.fillRect(0, 0, W, H); g.fillStyle = '#fff'; g.textAlign = 'center'; g.textBaseline = 'middle';
  g.font = '400 300px Marcellus, serif'; g.letterSpacing = '24px';
  ZEILEN.forEach((z, i) => g.fillText(z, W / 2, H * 0.44 + i * 360));
  // Keil: mehrfach weichzeichnen und mit dem Original verrechnen ergibt einen Grat in der Mitte des Strichs
  const b = globalThis.document.createElement('canvas'); b.width = W; b.height = H; const bg = b.getContext('2d');
  bg.filter = 'blur(9px)'; bg.drawImage(c, 0, 0); bg.filter = 'none';
  const roh = g.getImageData(0, 0, W, H).data, weich = bg.getImageData(0, 0, W, H).data;
  const keil = (u, v) => {
    const x = Math.min(W - 1, Math.max(0, Math.round(u * (W - 1)))), y = Math.min(H - 1, Math.max(0, Math.round(v * (H - 1)))), i = (y * W + x) * 4;
    return roh[i] > 127 ? Math.min(1, weich[i] / 255 * 1.6) : 0;
  };
  const uv = s.geo.attributes.uv;
  for (let i = 0; i < s.N; i++) {
    const k = keil(uv.getX(i), 1 - uv.getY(i));
    s.grund[i] -= TIEF * k; s.pos.setZ(i, s.grund[i]);
    const hell = 1 + 0.12 * k; s.farbeV[i * 3] = hell; s.farbeV[i * 3 + 1] = hell; s.farbeV[i * 3 + 2] = hell * 0.97;
  }
  s.fertig();
  // die Mitte der ersten Zeile in Weltkoordinaten (die Platte liegt flach: Punkt (x, y) der Platte liegt in der Welt bei x, -y)
  const zeileZ = (v) => -((0.5 - v) * HOCH);
  const ziel = new T.Vector3(), SEG = s.geo.parameters.widthSegments, SEGH = s.geo.parameters.heightSegments;
  /** höchste Stelle des Steins im Umkreis r um den Weltpunkt (x, z): darüber muss die Kamera bleiben */
  const oberflaeche = (x, z, r = 0.05) => {
    let m = -1;
    for (let dx = -r; dx <= r; dx += r / 3) for (let dz = -r; dz <= r; dz += r / 3) {
      const col = Math.round((x + dx + BREIT / 2) / BREIT * SEG), row = Math.round(((z + dz) + HOCH / 2) / HOCH * SEGH);
      if (col < 0 || col > SEG || row < 0 || row > SEGH) continue;
      m = Math.max(m, s.grund[row * (SEG + 1) + col]);
    }
    return m < 0 ? 0.16 : m;
  };
  let glatt = null;

  function stelle(p) {
    // 0 bis 0,2 oben lesen; 0,2 bis 0,35 sinken; 0,35 bis 0,75 flach die Zeile entlang; 0,75 bis 1 aufsteigen und zurück
    const tief = sanft((p - 0.18) / 0.17) * (1 - sanft((p - 0.74) / 0.2));
    const lauf = sanft((p - 0.3) / 0.48);
    const x = mix(0, mix(-1.2, 1.2, lauf), tief), zz = zeileZ(mix(0.53, 0.44, tief));
    const kx = x - 0.3 * tief, kz = zz + mix(1.1, 0.06, tief);
    // tief unten fährt die Kamera knapp über dem Stein; geglättet, damit sie nicht über jedes Korn hüpft
    const boden = oberflaeche(kx, kz) + 0.05;
    glatt = glatt === null ? boden : mix(glatt, boden, 0.25);
    const hoehe = mix(3.2, glatt, Math.pow(tief, 0.6));
    kamera.position.set(kx, hoehe, kz);
    ziel.set(x + 0.32 * tief, mix(0, glatt - 0.11, tief), zz - mix(0.05, 0.0, tief));   // schräg hinab in die Furchen, kein Horizont
    kamera.lookAt(ziel);
    kamera.fov = mix(30, 50, tief); kamera.updateProjectionMatrix();
    s.licht(p, mix(0.05, 0.22, welle(p, 0.1)), 0.4);
  }
  return { stelle };
}
