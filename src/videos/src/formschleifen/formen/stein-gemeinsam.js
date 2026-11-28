// Gemeinsames für die Stein-Verfahren (Bohren, Schleifen, Schneiden, Meisseln): Scan laden (Poly Haven, CC0, in public/stoffe/),
// Platte mit echtem Relief, Licht als flache Sonne mit Schatten, Kamera schräg über dem Stein.
import { T, TAU, welle, mix } from './werkzeug.js';

export const BREIT = 3.2, HOCH = 4.0, RELIEF = 0.16;
const ladeBild = (url) => new Promise((ok, nein) => { const b = new globalThis.Image(); b.onload = () => ok(b); b.onerror = nein; b.src = url; });

/** baut die Steinplatte; glanz: eine Glanzspur je Punkt (0 rauh, 1 poliert), die das Material liest */
export async function steinplatte({ szene, renderer, quelle = '/stoffe/marble_rock_02/', seg = 760 }) {
  const [farbe, normal, hoehe] = await Promise.all(['farbe.jpg', 'normal.jpg', 'hoehe.png'].map(n => ladeBild(quelle + n)));
  const hc = globalThis.document.createElement('canvas'); hc.width = hoehe.width; hc.height = hoehe.height;
  const hg = hc.getContext('2d', { willReadFrequently: true }); hg.drawImage(hoehe, 0, 0);
  const hd = hg.getImageData(0, 0, hc.width, hc.height).data, HW = hc.width, HH = hc.height;
  const hoeheBei = (u, v) => {
    const x = Math.min(HW - 1.001, Math.max(0, u * (HW - 1))), y = Math.min(HH - 1.001, Math.max(0, v * (HH - 1)));
    const i = Math.floor(x), j = Math.floor(y), a = x - i, b = y - j, w = (ii, jj) => hd[(jj * HW + ii) * 4] / 255;
    return (w(i, j) * (1 - a) + w(i + 1, j) * a) * (1 - b) + (w(i, j + 1) * (1 - a) + w(i + 1, j + 1) * a) * b;
  };
  const geo = new T.PlaneGeometry(BREIT, HOCH, seg, Math.round(seg * HOCH / BREIT));
  const pos = geo.attributes.position, uv = geo.attributes.uv, N = pos.count;
  const grund = new Float32Array(N), farbeV = new Float32Array(N * 3).fill(1), glanz = new Float32Array(N);
  for (let i = 0; i < N; i++) { grund[i] = RELIEF * hoeheBei(uv.getX(i), 1 - uv.getY(i)); pos.setZ(i, grund[i]); }
  geo.setAttribute('color', new T.BufferAttribute(farbeV, 3));
  geo.setAttribute('glanz', new T.BufferAttribute(glanz, 1));
  geo.computeVertexNormals();
  const tex = (b, srgb) => { const t = new T.Texture(b); t.colorSpace = srgb ? T.SRGBColorSpace : T.NoColorSpace; t.anisotropy = 8; t.needsUpdate = true; return t; };
  const stoff = new T.MeshStandardMaterial({ map: tex(farbe, true), normalMap: tex(normal, false), normalScale: new T.Vector2(1.2, 1.2), roughness: 0.82, metalness: 0, envMapIntensity: 0.14, vertexColors: true });
  // Glanz: wo poliert ist, wird der Stein glatt (weniger rauh, die Oberflächenstruktur des Scans flacher)
  stoff.onBeforeCompile = (sh) => {
    sh.vertexShader = 'attribute float glanz;\nvarying float vGlanz;\n' + sh.vertexShader.replace('#include <begin_vertex>', '#include <begin_vertex>\nvGlanz = glanz;');
    sh.fragmentShader = 'varying float vGlanz;\n' + sh.fragmentShader
      .replace('#include <roughnessmap_fragment>', '#include <roughnessmap_fragment>\nroughnessFactor = mix(roughnessFactor, 0.07, vGlanz);')
      .replace('#include <normal_fragment_maps>', '#include <normal_fragment_maps>\nnormal = normalize(mix(normal, nonPerturbedNormal, 0.85 * vGlanz));');
  };
  const stein = new T.Mesh(geo, stoff); stein.receiveShadow = true; stein.castShadow = true;
  const halter = new T.Group(); halter.add(stein); halter.rotation.x = -Math.PI / 2; szene.add(halter);
  szene.traverse(o => { if (o.isDirectionalLight) o.intensity = 0.15; if (o.isHemisphereLight) o.intensity = 0.12; });
  szene.background = new T.Color(0x0d0c0b);
  renderer.shadowMap.enabled = true; renderer.shadowMap.type = T.PCFSoftShadowMap;
  const sonne = new T.DirectionalLight(0xffe2b8, 8);
  sonne.castShadow = true; sonne.shadow.mapSize.set(4096, 4096); sonne.shadow.bias = -0.0004; sonne.shadow.normalBias = 0.01;
  Object.assign(sonne.shadow.camera, { left: -2.6, right: 2.6, top: 2.6, bottom: -2.6, near: 0.1, far: 20 });
  szene.add(sonne, sonne.target, new T.HemisphereLight(0x8aa0c0, 0x1a120c, 0.1));
  return {
    geo, pos, N, grund, farbeV, glanz, halter, sonne, stoff,
    fertig() { pos.needsUpdate = true; geo.attributes.color.needsUpdate = true; geo.attributes.glanz.needsUpdate = true; geo.computeVertexNormals(); },
    /** Sonne: hoeheS(p) als Höhe in Bogenmass; einmal herum je Schleife */
    licht(p, hoeheS, start = 2.3) {
      const w = TAU * p + start;
      sonne.position.set(6 * Math.cos(w) * Math.cos(hoeheS), 6 * Math.sin(hoeheS), 6 * Math.sin(w) * Math.cos(hoeheS));
      sonne.color.setHSL(0.075 + 0.04 * hoeheS, 0.7, 0.58 + 0.3 * hoeheS);
    },
    kamera(kamera, p, mitte, nah = 1) {
      const zk = mitte[0], zy = -mitte[1];
      kamera.position.set(zk + 0.3 * Math.sin(TAU * p), mix(3.0, 2.45, welle(p, 0.15)) * nah, zy + mix(1.35, 1.05, welle(p, 0.15)) * nah);
      kamera.lookAt(zk, 0, zy - 0.05);
    },
  };
}
