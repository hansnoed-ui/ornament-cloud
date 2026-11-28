// Granit, poliert (Probe, 28. November 2026). Christian: «Onyx und Granit als Probe.» Eine rohe Granitplatte wird von der Mitte aus
// spiegelnd poliert; im polierten Feld erscheint, was vor dem Stein ist: ein helles Fenster, das langsam durch den Spiegel wandert.
// Am Ende stumpft die Fläche wieder ab. Granit ist hart und lässt sich fast wie Glas polieren; seine Körner bleiben im Spiegel stehen.
// Bezüge: polierte Granitplatten an Grabmälern und Fassaden, der Stein als Spiegel des Betrachters *(G)*; Theorie: Beobachter (3/4),
// die Unterscheidung, die erst das Material sichtbar macht (2/1). Scan: ambientCG Granite002A (CC0), in public/stoffe/.
import { T, welle, sanft, mix } from './werkzeug.js';
import { steinplatte } from './stein-gemeinsam.js';

const MITTE = [0.05, -0.2];

export async function baue({ szene, kamera, renderer }) {
  const s = await steinplatte({ szene, renderer, quelle: '/stoffe/granit002a/' });
  s.stoff.normalScale.set(1.0, 1.0);
  // die Umgebung, die der Spiegel zeigt: dunkler Raum mit einem hohen hellen Fenster
  const c = globalThis.document.createElement('canvas'); c.width = 1024; c.height = 512; const g = c.getContext('2d');
  g.fillStyle = '#0d0c0b'; g.fillRect(0, 0, 1024, 512);
  // ein helles Band hoher Fenster rundherum (Obergaden), mit dunklen Pfosten: wohin der Spiegel auch schaut, er zeigt Fenster
  g.filter = 'blur(2px)'; g.fillStyle = '#fff1dc'; g.fillRect(0, 40, 1024, 150);
  g.fillStyle = '#0d0c0b'; for (let x = 0; x < 1024; x += 64) g.fillRect(x, 40, 14, 150); g.fillRect(0, 112, 1024, 6);
  g.filter = 'none';
  const env = new T.CanvasTexture(c); env.mapping = T.EquirectangularReflectionMapping; env.colorSpace = T.SRGBColorSpace;
  const pm = new T.PMREMGenerator(renderer); szene.environment = pm.fromEquirectangular(env).texture; pm.dispose();
  s.stoff.envMapIntensity = 3.0; s.stoff.color.setScalar(0.62);   // ein Spiegel braucht Helligkeit im Raum und Dunkel im Stein
  const abstand = new Float32Array(s.N);
  for (let i = 0; i < s.N; i++) abstand[i] = Math.hypot(s.pos.getX(i) - MITTE[0], s.pos.getY(i) - MITTE[1]);
  let ebene = 0; for (let i = 0; i < s.N; i++) ebene += s.grund[i]; ebene = ebene / s.N - 0.005;

  function stelle(p) {
    const front = 1.7 * sanft((p - 0.04) / 0.5), stumpf = 1.7 * sanft((p - 0.74) / 0.24);
    for (let i = 0; i < s.N; i++) {
      const d = abstand[i], g2 = sanft((front - d) / 0.08) * (1 - sanft((d - (1.7 - stumpf)) / 0.08) * (stumpf > 0 ? 1 : 0));
      s.pos.setZ(i, mix(s.grund[i], Math.min(s.grund[i], ebene), g2));
      s.glanz[i] = g2;
      const t = 1 - 0.18 * g2; s.farbeV[i * 3] = t; s.farbeV[i * 3 + 1] = t; s.farbeV[i * 3 + 2] = t;
    }
    s.fertig();
    // die Umgebung dreht langsam: das Fenster wandert durch den Spiegel
    szene.environmentRotation.y = mix(-0.5, 0.5, welle(p, 0.25));
    s.licht(p, mix(0.25, 0.5, welle(p)), 0.5);
    // flacher Blick über die Platte: erst so zeigt polierter Stein seinen Spiegel
    kamera.position.set(MITTE[0] + 0.35 * Math.sin(Math.PI * 2 * p), mix(0.95, 0.75, welle(p, 0.15)), -MITTE[1] + 2.3);
    kamera.lookAt(MITTE[0], 0, -MITTE[1] - 0.25);
  }
  return { stelle };
}
