// Stein und Sonnenblume (Test, 28. November 2026): ein echter Materialscan als Stoff, mit echtem Licht. Christian zu den gemalten
// Stoff-Skizzen: «vor allem flache Zeichnungen, die sich unspektakulär bewegen»; zu Fotos: «auch das Internet kennt zig Millionen
// solche Bilder». Darum hier ein freier Scan von Poly Haven (marble_rock_02, Lizenz CC0): Farbe, Oberflächenrichtung und Höhenkarte.
// Die Höhenkarte wird zu einem echten Relief (die Ecken werfen Schatten), ein flaches Licht wandert in 30 s einmal um den Stein
// wie eine Sonne, die nicht untergeht. Eingelegt sind die Kerne der Sonnenblume (zweite Fassung: jeder Kern wandert auf seinem Winkel
// nach aussen) als Messing; sie folgen dem Relief des Steins. Die Dateien liegen in public/stoffe/ und sind nicht eingecheckt.
import { T, TAU, welle, mix } from './werkzeug.js';

const QUELLE = '/stoffe/marble_rock_02/', SEG = 640, BREIT = 3.2, HOCH = 4.0, RELIEF = 0.16;
const K = 273, M = 1300, C = 0.023, GOLD = Math.PI * (3 - Math.sqrt(5)), DREH = (K * GOLD) % (Math.PI * 2);

const ladeBild = (url) => new Promise((ok, nein) => { const b = new globalThis.Image(); b.onload = () => ok(b); b.onerror = nein; b.src = url; });

export async function baue({ szene, kamera, mat, renderer }) {
  const [farbe, normal, hoehe] = await Promise.all(['farbe.jpg', 'normal.jpg', 'hoehe.png'].map(n => ladeBild(QUELLE + n)));
  // Höhenkarte lesen (der Browser liefert 8 Bit, das reicht für das Relief)
  const hc = globalThis.document.createElement('canvas'); hc.width = hoehe.width; hc.height = hoehe.height;
  const hg = hc.getContext('2d', { willReadFrequently: true }); hg.drawImage(hoehe, 0, 0);
  const hd = hg.getImageData(0, 0, hc.width, hc.height).data, HW = hc.width, HH = hc.height;
  const hoeheBei = (u, v) => {   // u, v in 0–1, bilinear
    const x = Math.min(HW - 1.001, Math.max(0, u * (HW - 1))), y = Math.min(HH - 1.001, Math.max(0, v * (HH - 1)));
    const i = Math.floor(x), j = Math.floor(y), a = x - i, b = y - j, w = (ii, jj) => hd[(jj * HW + ii) * 4] / 255;
    return (w(i, j) * (1 - a) + w(i + 1, j) * a) * (1 - b) + (w(i, j + 1) * (1 - a) + w(i + 1, j + 1) * a) * b;
  };
  // der Stein: eine Platte, das Relief in die Geometrie gerechnet (so stimmen auch die Schatten)
  const geo = new T.PlaneGeometry(BREIT, HOCH, SEG, Math.round(SEG * HOCH / BREIT));
  const pos = geo.attributes.position, uv = geo.attributes.uv;
  for (let i = 0; i < pos.count; i++) pos.setZ(i, RELIEF * hoeheBei(uv.getX(i), 1 - uv.getY(i)));
  geo.computeVertexNormals();
  const tex = (b, srgb) => { const t = new T.Texture(b); t.colorSpace = srgb ? T.SRGBColorSpace : T.NoColorSpace; t.anisotropy = 8; t.needsUpdate = true; return t; };
  const stein = new T.Mesh(geo, new T.MeshStandardMaterial({ map: tex(farbe, true), normalMap: tex(normal, false), normalScale: new T.Vector2(1.2, 1.2), roughness: 0.82, metalness: 0, envMapIntensity: 0.12 }));
  stein.receiveShadow = true; stein.castShadow = true;
  const halter = new T.Group(); halter.add(stein); halter.rotation.x = -Math.PI / 2; szene.add(halter);
  // das Studio dämpfen: das Licht soll von der wandernden Sonne kommen
  szene.traverse(o => { if (o.isDirectionalLight) o.intensity = 0.15; if (o.isHemisphereLight) o.intensity = 0.12; });
  szene.background = new T.Color(0x0d0c0b);
  renderer.shadowMap.enabled = true; renderer.shadowMap.type = T.PCFSoftShadowMap;
  const sonne = new T.DirectionalLight(0xffe2b8, 8);
  sonne.castShadow = true; sonne.shadow.mapSize.set(4096, 4096); sonne.shadow.bias = -0.0004; sonne.shadow.normalBias = 0.01;
  Object.assign(sonne.shadow.camera, { left: -2.6, right: 2.6, top: 2.6, bottom: -2.6, near: 0.1, far: 20 });
  szene.add(sonne, sonne.target);
  const himmel = new T.HemisphereLight(0x8aa0c0, 0x1a120c, 0.1); szene.add(himmel);
  // die Kerne der Sonnenblume: Messing, flach gewölbt, in den Stein gesetzt
  const kerne = new T.InstancedMesh(new T.SphereGeometry(1, 20, 12), mat.messing, M);
  kerne.castShadow = true; kerne.frustumCulled = false; halter.add(kerne);
  const Mx = new T.Matrix4(), Q = new T.Quaternion(), S = new T.Vector3(), P = new T.Vector3(), MITTE = [0.15, -0.35];

  function stelle(p) {
    const tau = K * p, fr = tau - Math.floor(tau);
    for (let j = 0; j < M; j++) {
      const n = j + fr, r = C * Math.sqrt(n), a = -n * GOLD + tau * GOLD - DREH * p;
      const x = MITTE[0] + r * Math.cos(a), y = MITTE[1] + r * Math.sin(a);
      const h = RELIEF * hoeheBei(x / BREIT + 0.5, 1 - (y / HOCH + 0.5));
      const g = C * 0.86 * (0.55 + 0.45 * Math.sqrt(n / M)) * Math.min(1, n / 6) * Math.min(1, (M - n) / 40);
      P.set(x, y, h + g * 0.3); Mx.compose(P, Q, S.set(g, g, g * 0.6)); kerne.setMatrixAt(j, Mx);
    }
    kerne.instanceMatrix.needsUpdate = true;
    // die Sonne: flach, einmal rundherum; mittags etwas höher, nachts fast im Stein
    const w = TAU * p + 2.3, hoeheS = mix(0.035, 0.2, welle(p, 0.3));
    sonne.position.set(6 * Math.cos(w) * Math.cos(hoeheS), 6 * Math.sin(hoeheS), 6 * Math.sin(w) * Math.cos(hoeheS));
    sonne.target.position.set(0, 0, 0);
    sonne.color.setHSL(0.08 + 0.03 * Math.sin(hoeheS * 6), 0.7, 0.6 + 0.3 * hoeheS);
    // die Kamera schaut schräg über den Stein auf die Blume und atmet ein wenig
    const zk = MITTE[0], zy = -MITTE[1];
    kamera.position.set(zk + 0.3 * Math.sin(TAU * p), mix(3.0, 2.45, welle(p, 0.15)), zy + mix(1.35, 1.05, welle(p, 0.15)));
    kamera.lookAt(zk, 0, zy - 0.05);
  }
  return { stelle };
}
