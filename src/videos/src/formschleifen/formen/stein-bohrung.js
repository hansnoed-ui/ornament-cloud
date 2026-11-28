// Stein, gebohrt (Test, 28. November 2026). Christian zum ersten Test: «Der Marmor sieht gut aus, was die Sonnenblume da drauf macht,
// erschliesst sich mir nicht ganz.» Darum liegt das Ornament hier nicht auf dem Stein, es entsteht in ihm: Kern für Kern wird eine
// Mulde in den Marmor gebohrt, von der Mitte nach aussen, im goldenen Winkel (jede Bohrung schliesst an die vorige an). Sichtbar wird
// es nur im Streiflicht: Eine flache Sonne geht einmal um den Stein; steht sie tief, werfen die Mulden Schatten und die Spiralen
// erscheinen, steht sie höher, verschwinden sie fast in den Rissen des Steins. Am Ende füllt Sand die Mulden von aussen nach innen.
// Begriffe: Anschluss (3/2), nie fertig gesehen (3/4), Stelle (4/1). Scan: Poly Haven, marble_rock_02 (CC0), in public/stoffe/.
import { T, TAU, welle, sanft, mix } from './werkzeug.js';

const QUELLE = '/stoffe/marble_rock_02/', SEG = 760, BREIT = 3.2, HOCH = 4.0, RELIEF = 0.16;
const M = 520, C = 0.041, GOLD = Math.PI * (3 - Math.sqrt(5)), MITTE = [0.15, -0.35], RAD = 0.024, TIEF = 0.026;

const ladeBild = (url) => new Promise((ok, nein) => { const b = new globalThis.Image(); b.onload = () => ok(b); b.onerror = nein; b.src = url; });

export async function baue({ szene, kamera, renderer }) {
  const [farbe, normal, hoehe] = await Promise.all(['farbe.jpg', 'normal.jpg', 'hoehe.png'].map(n => ladeBild(QUELLE + n)));
  const hc = globalThis.document.createElement('canvas'); hc.width = hoehe.width; hc.height = hoehe.height;
  const hg = hc.getContext('2d', { willReadFrequently: true }); hg.drawImage(hoehe, 0, 0);
  const hd = hg.getImageData(0, 0, hc.width, hc.height).data, HW = hc.width, HH = hc.height;
  const hoeheBei = (u, v) => {
    const x = Math.min(HW - 1.001, Math.max(0, u * (HW - 1))), y = Math.min(HH - 1.001, Math.max(0, v * (HH - 1)));
    const i = Math.floor(x), j = Math.floor(y), a = x - i, b = y - j, w = (ii, jj) => hd[(jj * HW + ii) * 4] / 255;
    return (w(i, j) * (1 - a) + w(i + 1, j) * a) * (1 - b) + (w(i, j + 1) * (1 - a) + w(i + 1, j + 1) * a) * b;
  };
  const geo = new T.PlaneGeometry(BREIT, HOCH, SEG, Math.round(SEG * HOCH / BREIT));
  const pos = geo.attributes.position, uv = geo.attributes.uv, N = pos.count;
  const grund = new Float32Array(N), farbeV = new Float32Array(N * 3).fill(1);
  for (let i = 0; i < N; i++) { grund[i] = RELIEF * hoeheBei(uv.getX(i), 1 - uv.getY(i)); pos.setZ(i, grund[i]); }
  geo.setAttribute('color', new T.BufferAttribute(farbeV, 3));
  // die Bohrungen: fest an ihrem Ort (eine Bohrung wandert nicht); je Punkt der Platte die nächste Bohrung und der Abstand zu ihr
  const kx = new Float32Array(M), ky = new Float32Array(M);
  for (let n = 0; n < M; n++) { const r = C * Math.sqrt(n + 0.5), a = n * GOLD; kx[n] = MITTE[0] + r * Math.cos(a); ky[n] = MITTE[1] + r * Math.sin(a); }
  const naechste = new Int32Array(N).fill(-1), profil = new Float32Array(N), weit = C * Math.sqrt(M) + RAD;
  for (let i = 0; i < N; i++) {
    const x = pos.getX(i), y = pos.getY(i);
    if (Math.hypot(x - MITTE[0], y - MITTE[1]) > weit) continue;
    let best = -1, bd = RAD * RAD;
    for (let n = 0; n < M; n++) { const dx = x - kx[n], dy = y - ky[n], d = dx * dx + dy * dy; if (d < bd) { bd = d; best = n; } }
    if (best >= 0) { naechste[i] = best; profil[i] = Math.pow(1 - bd / (RAD * RAD), 1.4); }
  }
  const tex = (b, srgb) => { const t = new T.Texture(b); t.colorSpace = srgb ? T.SRGBColorSpace : T.NoColorSpace; t.anisotropy = 8; t.needsUpdate = true; return t; };
  const stein = new T.Mesh(geo, new T.MeshStandardMaterial({ map: tex(farbe, true), normalMap: tex(normal, false), normalScale: new T.Vector2(1.2, 1.2), roughness: 0.82, metalness: 0, envMapIntensity: 0.12, vertexColors: true }));
  stein.receiveShadow = true; stein.castShadow = true;
  const halter = new T.Group(); halter.add(stein); halter.rotation.x = -Math.PI / 2; szene.add(halter);
  szene.traverse(o => { if (o.isDirectionalLight) o.intensity = 0.15; if (o.isHemisphereLight) o.intensity = 0.12; });
  szene.background = new T.Color(0x0d0c0b);
  renderer.shadowMap.enabled = true; renderer.shadowMap.type = T.PCFSoftShadowMap;
  const sonne = new T.DirectionalLight(0xffe2b8, 8);
  sonne.castShadow = true; sonne.shadow.mapSize.set(4096, 4096); sonne.shadow.bias = -0.0004; sonne.shadow.normalBias = 0.01;
  Object.assign(sonne.shadow.camera, { left: -2.6, right: 2.6, top: 2.6, bottom: -2.6, near: 0.1, far: 20 });
  szene.add(sonne, sonne.target, new T.HemisphereLight(0x8aa0c0, 0x1a120c, 0.1));
  const anteil = new Float32Array(M);

  function stelle(p) {
    // gebohrt wird von innen nach aussen (p 0,04–0,56), gefüllt wird von aussen nach innen (p 0,7–0,97)
    for (let n = 0; n < M; n++) {
      const q = n / M, ein = sanft((p - (0.04 + 0.52 * q)) / 0.025), aus = sanft((p - (0.7 + 0.27 * (1 - q))) / 0.03);
      anteil[n] = ein * (1 - aus);
    }
    for (let i = 0; i < N; i++) {
      const n = naechste[i]; if (n < 0) continue;
      const t = anteil[n] * profil[i];
      pos.setZ(i, grund[i] - TIEF * t);
      const hell = 1 + 0.22 * t; farbeV[i * 3] = hell; farbeV[i * 3 + 1] = hell; farbeV[i * 3 + 2] = hell * 0.98;   // frisch gebohrter Stein ist heller
    }
    pos.needsUpdate = true; geo.attributes.color.needsUpdate = true; geo.computeVertexNormals();
    // die Sonne: zweimal tief (Spiralen erscheinen), dazwischen höher (sie verschwinden fast)
    const w = TAU * p + 2.3, hoeheS = mix(0.03, 0.42, Math.pow(welle(2 * p, 0.1), 2));
    sonne.position.set(6 * Math.cos(w) * Math.cos(hoeheS), 6 * Math.sin(hoeheS), 6 * Math.sin(w) * Math.cos(hoeheS));
    sonne.color.setHSL(0.075 + 0.04 * hoeheS, 0.7, 0.58 + 0.3 * hoeheS);
    const zk = MITTE[0], zy = -MITTE[1];
    kamera.position.set(zk + 0.3 * Math.sin(TAU * p), mix(3.0, 2.45, welle(p, 0.15)), zy + mix(1.35, 1.05, welle(p, 0.15)));
    kamera.lookAt(zk, 0, zy - 0.05);
  }
  return { stelle };
}
