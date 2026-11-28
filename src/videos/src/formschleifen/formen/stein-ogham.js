// Ogham (28. November 2026). Christian: «Ogham bauen.» Ogham ist eine frühmittelalterliche Schrift Irlands und Britanniens *(G)*: Die
// Zeichen sind Gruppen von ein bis fünf Kerben an einer Mittellinie, und auf den stehenden Steinen ist diese Linie die Kante des Steins.
// Gelesen wird von unten nach oben *(G)*. Hier steht in Ogham das Wort ORNAMENT, Buchstabe für Buchstabe umgeschrieben (keine
// Übersetzung). Die Kerben werden der Reihe nach gehauen, die Kamera steigt mit, frisch gehauen ist der Stein hell; am Ende wachsen die
// Flechten wieder darüber, und die Kamera sinkt zurück. Bezüge: Schrift als reiner Rhythmus (3/2), Leroi-Gourhan (7/6: Zeichnen beginnt
// mit Kerben), Kerbhölzer. Stein: Poly Haven, lichen_rock (CC0), in public/stoffe/.
//
// Die vier Gruppen (Aicmí) nach der üblichen Umschrift *(G)*:
//   rechts der Kante  B L F S N   (1 bis 5 Striche)
//   links der Kante   H D T C Q
//   quer über die Kante, schräg   M G NG Z R
//   Vokale als kurze Kerben auf der Kante   A O U E I
import { T, TAU, welle, sanft, mix } from './werkzeug.js';

const QUELLE = '/stoffe/lichen_rock/', BREITE = 0.62, HOEHE = 3.7, SEGU = 240, SEGV = 1400, RELIEF = 0.05;
const GRUPPEN = { B: ['R', 1], L: ['R', 2], F: ['R', 3], S: ['R', 4], N: ['R', 5], H: ['L', 1], D: ['L', 2], T: ['L', 3], C: ['L', 4], Q: ['L', 5],
  M: ['X', 1], G: ['X', 2], Z: ['X', 4], R: ['X', 5], A: ['V', 1], O: ['V', 2], U: ['V', 3], E: ['V', 4], I: ['V', 5] };
const WORT = 'ORNAMENT', STRICH = 0.075, LUECKE = 0.17, LANG = 0.25, KURZ = 0.055, FUGE = 0.012, TIEF = 0.034;

const ladeBild = (url) => new Promise((ok, nein) => { const b = new globalThis.Image(); b.onload = () => ok(b); b.onerror = nein; b.src = url; });

export async function baue({ szene, kamera, renderer }) {
  const [farbe, normal, hoehe] = await Promise.all(['farbe.jpg', 'normal.jpg', 'hoehe.png'].map(n => ladeBild(QUELLE + n)));
  const hc = globalThis.document.createElement('canvas'); hc.width = hoehe.width; hc.height = hoehe.height;
  const hg = hc.getContext('2d', { willReadFrequently: true }); hg.drawImage(hoehe, 0, 0);
  const hd = hg.getImageData(0, 0, hc.width, hc.height).data, HW = hc.width, HH = hc.height;
  const hoeheBei = (u, v) => { const x = Math.floor(((u % 1) + 1) % 1 * (HW - 1)), y = Math.floor(((v % 1) + 1) % 1 * (HH - 1)); return hd[(y * HW + x) * 4] / 255; };

  // die Kerben: je Kerbe eine Strecke in Koordinaten (Abstand von der Kante a, Höhe h) auf der rechten (+) und linken (−) Fläche
  const kerben = []; let h = 0.35;
  for (const ch of WORT) {
    const [art, n] = GRUPPEN[ch];
    for (let k = 0; k < n; k++) {
      const y = h + k * STRICH;
      if (art === 'R') kerben.push({ seite: [1], a0: 0, h0: y, a1: LANG, h1: y });
      if (art === 'L') kerben.push({ seite: [-1], a0: 0, h0: y, a1: LANG, h1: y });
      if (art === 'X') kerben.push({ seite: [1, -1], a0: 0, h0: y, a1: LANG * 0.9, h1: y + 0.07, schraeg: true });
      if (art === 'V') kerben.push({ seite: [1, -1], a0: 0, h0: y, a1: KURZ, h1: y });
    }
    h += n * STRICH + LUECKE;
  }
  kerben.forEach((k, i) => { k.zeit = 0.05 + 0.62 * i / kerben.length; });

  const gruppe = new T.Group(); szene.add(gruppe);
  const tex = (b, srgb) => { const t = new T.Texture(b); t.colorSpace = srgb ? T.SRGBColorSpace : T.NoColorSpace; t.wrapS = t.wrapT = T.RepeatWrapping; t.anisotropy = 8; t.needsUpdate = true; return t; };
  const farbTex = tex(farbe, true), normTex = tex(normal, false);
  farbTex.repeat.set(BREITE / 2.2, HOEHE / 2.2); normTex.repeat.copy(farbTex.repeat);
  // zwei Flächen des Pfeilers, die sich in der Kante treffen; die Kante zeigt zur Kamera
  const flaechen = [1, -1].map(seite => {
    const geo = new T.PlaneGeometry(BREITE, HOEHE, SEGU, SEGV), pos = geo.attributes.position, N = pos.count;
    const a = new Float32Array(N), hh = new Float32Array(N), grund = new Float32Array(N), farbeV = new Float32Array(N * 3).fill(1);
    for (let i = 0; i < N; i++) {
      a[i] = seite > 0 ? pos.getX(i) + BREITE / 2 : BREITE / 2 - pos.getX(i); hh[i] = pos.getY(i) + HOEHE / 2;
      // die Kante ist leicht gerundet und bestossen
      grund[i] = RELIEF * hoeheBei(a[i] / 2.2 + (seite > 0 ? 0 : 0.5), hh[i] / 2.2) - 0.03 * Math.exp(-a[i] / 0.025);
    }
    geo.setAttribute('color', new T.BufferAttribute(farbeV, 3));
    // je Punkt die Kerbe, in der er liegt, und wie tief (Keil)
    const nr = new Int32Array(N).fill(-1), prof = new Float32Array(N);
    kerben.forEach((k, j) => {
      if (!k.seite.includes(seite)) return;
      const dx = k.a1 - k.a0, dy = k.h1 - k.h0, l2 = dx * dx + dy * dy;
      for (let i = 0; i < N; i++) {
        if (Math.abs(hh[i] - k.h0) > 0.12 || a[i] > k.a1 + FUGE) continue;
        const t = Math.max(0, Math.min(1, ((a[i] - k.a0) * dx + (hh[i] - k.h0) * dy) / l2)), d = Math.hypot(a[i] - k.a0 - t * dx, hh[i] - k.h0 - t * dy);
        if (d < FUGE) { const w = 1 - d / FUGE; if (w > prof[i]) { prof[i] = w; nr[i] = j; } }
      }
    });
    const mesh = new T.Mesh(geo, new T.MeshStandardMaterial({ map: farbTex, normalMap: normTex, normalScale: new T.Vector2(0.8, 0.8), roughness: 0.9, metalness: 0, vertexColors: true, envMapIntensity: 0.1 }));
    mesh.castShadow = mesh.receiveShadow = true;
    // die Fläche um die Kante drehen: lokal x = Abstand von der Kante, die Kante liegt bei x = 0
    // beide Flächen laufen von der Kante nach hinten weg, die Kante (x = 0) zeigt zur Kamera
    const halter = new T.Group(); mesh.position.set(seite * BREITE / 2, HOEHE / 2, 0); halter.add(mesh);
    halter.rotation.y = seite * Math.PI / 4;
    gruppe.add(halter);
    return { geo, pos, N, grund, farbeV, nr, prof, seite };
  });
  // der Fels darunter: dunkler Boden
  const boden = new T.Mesh(new T.CircleGeometry(4, 64), new T.MeshStandardMaterial({ color: 0x1a1612, roughness: 1 }));
  boden.rotation.x = -Math.PI / 2; boden.receiveShadow = true; gruppe.add(boden);

  szene.traverse(o => { if (o.isDirectionalLight) o.intensity = 0.12; if (o.isHemisphereLight) o.intensity = 0.1; });
  szene.background = new T.Color(0x0b0b0c);
  renderer.shadowMap.enabled = true; renderer.shadowMap.type = T.PCFSoftShadowMap;
  const sonne = new T.DirectionalLight(0xffe0b0, 7);
  sonne.castShadow = true; sonne.shadow.mapSize.set(4096, 4096); sonne.shadow.bias = -0.0004; sonne.shadow.normalBias = 0.01;
  Object.assign(sonne.shadow.camera, { left: -2.5, right: 2.5, top: 4, bottom: -1, near: 0.1, far: 20 });
  szene.add(sonne, sonne.target, new T.HemisphereLight(0x8090a0, 0x15100c, 0.12));
  const anteil = new Float32Array(kerben.length), frisch = new Float32Array(kerben.length);
  const oben = kerben[kerben.length - 1].h1;

  function stelle(p) {
    kerben.forEach((k, j) => {
      const ein = sanft((p - k.zeit) / 0.006), aus = sanft((p - (0.8 + 0.15 * k.h0 / oben)) / 0.05);
      anteil[j] = ein; frisch[j] = ein * (1 - aus);
    });
    for (const f of flaechen) {
      for (let i = 0; i < f.N; i++) {
        const j = f.nr[i], t = j < 0 ? 0 : anteil[j] * f.prof[i];
        f.pos.setZ(i, f.grund[i] - TIEF * t);
        // frisch gehauen: heller, grauer Stein; dann wachsen die Flechten zurück
        const hell = 1 + (j < 0 ? 0 : 2.2 * frisch[j] * Math.min(1, f.prof[i] * 1.6));
        f.farbeV[i * 3] = hell; f.farbeV[i * 3 + 1] = hell; f.farbeV[i * 3 + 2] = hell * 1.02;
      }
      f.pos.needsUpdate = true; f.geo.attributes.color.needsUpdate = true; f.geo.computeVertexNormals();
    }
    // die Kamera folgt der Front der Kerben nach oben und sinkt am Ende zurück
    const front = mix(0.3, oben, sanft((p - 0.03) / 0.66)), hoch = p < 0.72 ? front : mix(oben, 0.3, sanft((p - 0.72) / 0.26));
    kamera.position.set(0.3 * Math.sin(TAU * p), hoch + 0.2, 1.9);
    kamera.lookAt(0, hoch, 0);
    // flache Sonne von der Seite, wandert langsam
    const w = mix(-0.95, 0.95, welle(p, 0.25)) + Math.PI / 2;
    sonne.position.set(5 * Math.cos(w), hoch + 1.2, 5 * Math.sin(w) * 0.6 + 2);
    sonne.target.position.set(0, hoch, 0);
  }
  return { stelle };
}
