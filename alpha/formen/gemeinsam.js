// ORNAMENT FORMEN 0.1 – gemeinsame Bausteine für Katalog und Ornamentkörper (26. November 2026).
// Alles rechnet auf dem Gerät; three.js kommt aus vendor/ (Importmap der Seite), kein CDN.
// Formen sind über Startwerte wiederholbar: derselbe Startwert ergibt immer dieselbe Form.
import * as THREE from 'three';

export const T = THREE;
export const TAU = Math.PI * 2;

// Zufall mit Startwert (mulberry32)
export function rngFrom(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
export const pick = (r, arr) => arr[Math.floor(r() * arr.length)];
export const neuerStartwert = () => 1 + Math.floor(Math.random() * 99999);

// ---------- Renderer und Licht ----------
export function erzeugeRenderer(canvas) {
  const renderer = new T.WebGLRenderer({ canvas, antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.setClearColor(0x000000, 0);
  renderer.toneMapping = T.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  return renderer;
}

// Gezeichnetes Studio (Verlauf und drei Softboxen) als Umgebung, damit Metall spiegelt; dazu ein Führungslicht.
export function studio(renderer, scene) {
  const c = document.createElement('canvas'); c.width = 1024; c.height = 512;
  const g = c.getContext('2d');
  const grd = g.createLinearGradient(0, 0, 0, 512);
  grd.addColorStop(0, '#b9bec6'); grd.addColorStop(0.5, '#6d7178'); grd.addColorStop(1, '#1e2024');
  g.fillStyle = grd; g.fillRect(0, 0, 1024, 512);
  g.filter = 'blur(18px)';
  g.fillStyle = '#ffffff'; g.fillRect(120, 90, 180, 120);
  g.fillStyle = '#fff4e0'; g.fillRect(560, 60, 260, 90);
  g.fillStyle = '#dfe8ff'; g.fillRect(860, 220, 110, 160);
  g.filter = 'none';
  const tex = new T.CanvasTexture(c);
  tex.mapping = T.EquirectangularReflectionMapping;
  tex.colorSpace = T.SRGBColorSpace;
  const pmrem = new T.PMREMGenerator(renderer);
  scene.environment = pmrem.fromEquirectangular(tex).texture;
  tex.dispose(); pmrem.dispose();
  const key = new T.DirectionalLight(0xffffff, 3.4); key.position.set(3, 4, 6); scene.add(key);
  scene.add(new T.HemisphereLight(0xffffff, 0x404048, 1.1));
}

// ---------- Materialien ----------
// Farben in sRGB; three.js rechnet sie beim Setzen selbst in linear um.
export const MATERIAL = {
  messing: { name: 'Messing', a: 0xc8a05a, b: 0x9a7639, perle: 0xead39d, punkt: 0xd4a650, metall: 0.9, rauh: 0.26 },
  kreide:  { name: 'Kreide',  a: 0xeeeae3, b: 0xc9c2b6, perle: 0xffffff, punkt: 0xe8e3da, metall: 0.0, rauh: 0.85 },
  kobalt:  { name: 'Kobalt',  a: 0x2a4ec2, b: 0xe8edf6, perle: 0x17286e, punkt: 0x7f9bff, metall: 0.05, rauh: 0.22 },
  ton:     { name: 'Ton',     a: 0xb5643f, b: 0x8a482b, perle: 0xd8a37b, punkt: 0xd07a52, metall: 0.0, rauh: 0.72 }
};

export function materialien() {
  return {
    a: new T.MeshStandardMaterial(),
    b: new T.MeshStandardMaterial(),
    perle: new T.MeshStandardMaterial(),
    beidseitig: new T.MeshStandardMaterial({ side: T.DoubleSide }),
    punkte: new T.PointsMaterial({ size: 0.012, sizeAttenuation: true })
  };
}

export function setzeMaterial(m, name) {
  const p = MATERIAL[name];
  const set = (mat, hex, dr) => {
    mat.color.setHex(hex);
    mat.metalness = p.metall;
    mat.roughness = Math.max(0, Math.min(1, p.rauh + dr));
    mat.needsUpdate = true;
  };
  set(m.a, p.a, 0); set(m.b, p.b, 0.05); set(m.perle, p.perle, -0.08); set(m.beidseitig, p.a, 0);
  m.punkte.color.setHex(p.punkt);
}

// ---------- Geometrie ----------
export class Kurve extends T.Curve {
  constructor(fn) { super(); this.fn = fn; }
  getPoint(t, target = new T.Vector3()) { return this.fn(t, target); }
}
export const roehre = (fn, segs, rad, mat, geschlossen = true) =>
  new T.Mesh(new T.TubeGeometry(new Kurve(fn), segs, rad, 8, geschlossen), mat);

const OBEN = new T.Vector3(0, 1, 0);
const _M = new T.Matrix4(), _q = new T.Quaternion(), _s = new T.Vector3(), _p = new T.Vector3(), _d = new T.Vector3();
const KEINE_DREHUNG = new T.Quaternion();

// Stäbe zwischen Punkten: Liste aus [a, b, Radius]
export function staebe(liste, mat) {
  const m = new T.InstancedMesh(new T.CylinderGeometry(1, 1, 1, 8), mat, Math.max(1, liste.length));
  liste.forEach(([a, b, rad], i) => {
    _d.subVectors(b, a); const len = _d.length() || 1e-4;
    _p.addVectors(a, b).multiplyScalar(0.5);
    _q.setFromUnitVectors(OBEN, _d.normalize());
    _M.compose(_p, _q, _s.set(rad, len, rad));
    m.setMatrixAt(i, _M);
  });
  m.count = liste.length;
  m.instanceMatrix.needsUpdate = true;
  m.frustumCulled = false;
  return m;
}
// Perlen: Liste aus {p, r}
export function perlen(liste, mat) {
  const m = new T.InstancedMesh(new T.SphereGeometry(1, 16, 12), mat, Math.max(1, liste.length));
  liste.forEach((b, i) => { _M.compose(b.p, KEINE_DREHUNG, _s.set(b.r, b.r, b.r)); m.setMatrixAt(i, _M); });
  m.count = liste.length;
  m.instanceMatrix.needsUpdate = true;
  m.frustumCulled = false;
  return m;
}
// Stacheln von der Mitte weg
export function stacheln(punkte, L, rad, mat) {
  const m = new T.InstancedMesh(new T.ConeGeometry(1, 1, 12), mat, punkte.length);
  punkte.forEach((p, i) => {
    _d.copy(p).normalize();
    _q.setFromUnitVectors(OBEN, _d);
    _p.copy(_d).multiplyScalar(p.length() + L / 2);
    _M.compose(_p, _q, _s.set(rad, L, rad));
    m.setMatrixAt(i, _M);
  });
  m.instanceMatrix.needsUpdate = true;
  m.frustumCulled = false;
  return m;
}
// Parametrische Fläche, u und v in [0,1], wahlweise geschlossen
export function flaeche(nu, nv, wrapU, wrapV, fn) {
  const cu = wrapU ? nu : nu + 1, cv = wrapV ? nv : nv + 1;
  const pos = new Float32Array(cu * cv * 3), v = new T.Vector3();
  for (let i = 0; i < cu; i++) for (let j = 0; j < cv; j++) {
    fn(i / nu, j / nv, v); const k = (i * cv + j) * 3;
    pos[k] = v.x; pos[k + 1] = v.y; pos[k + 2] = v.z;
  }
  const idx = [];
  for (let i = 0; i < nu; i++) for (let j = 0; j < nv; j++) {
    const i1 = (i + 1) % cu, j1 = (j + 1) % cv;
    const a = i * cv + j, b = i1 * cv + j, c = i1 * cv + j1, d = i * cv + j1;
    idx.push(a, b, d, b, c, d);
  }
  const g = new T.BufferGeometry();
  g.setAttribute('position', new T.BufferAttribute(pos, 3));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}
// Gedrechselter Knopf, Achse in z
export function knopf(r0, h, wuelste, segs, mat) {
  const pts = [new T.Vector2(0.0001, 0)];
  for (let n = 0; n <= 24; n++) {
    const u = n / 24;
    const x = r0 * Math.cos(u * Math.PI / 2) * (1 + 0.12 * Math.sin(u * Math.PI * wuelste * 2));
    pts.push(new T.Vector2(Math.max(0.0001, x), h * Math.sin(u * Math.PI / 2)));
  }
  const g = new T.LatheGeometry(pts, segs); g.rotateX(Math.PI / 2);
  return new T.Mesh(g, mat);
}
// Ecken und Kanten eines Polyeders (Diagonalen zerlegter Flächen fallen weg)
export function polyeder(geo) {
  const pos = geo.attributes.position, ecken = [], map = new Map(), ids = [];
  const v = new T.Vector3();
  const n = geo.index ? geo.index.count : pos.count;
  for (let i = 0; i < n; i++) {
    v.fromBufferAttribute(pos, geo.index ? geo.index.getX(i) : i);
    const k = v.x.toFixed(3) + ',' + v.y.toFixed(3) + ',' + v.z.toFixed(3);
    if (!map.has(k)) { map.set(k, ecken.length); ecken.push(v.clone().normalize()); }
    ids.push(map.get(k));
  }
  const alle = new Map();
  for (let i = 0; i < ids.length; i += 3) for (let e = 0; e < 3; e++) {
    const a = ids[i + e], b = ids[i + (e + 1) % 3];
    if (a !== b) alle.set(Math.min(a, b) + '-' + Math.max(a, b), [Math.min(a, b), Math.max(a, b)]);
  }
  let minL = Infinity;
  alle.forEach(([a, b]) => { minL = Math.min(minL, ecken[a].distanceTo(ecken[b])); });
  const kanten = [];
  alle.forEach(([a, b]) => { if (ecken[a].distanceTo(ecken[b]) < minL * 1.3) kanten.push([a, b]); });
  return { ecken, kanten };
}

// Radius um den Ursprung, über alle Teile (auch Instanzen)
export function radius(obj) {
  obj.updateMatrixWorld(true);
  let R = 0.001; const M = new T.Matrix4(), c = new T.Vector3();
  obj.traverse(o => {
    if (!o.geometry) return;
    if (!o.geometry.boundingSphere) o.geometry.computeBoundingSphere();
    const bs = o.geometry.boundingSphere;
    if (o.isInstancedMesh) {
      for (let i = 0; i < o.count; i++) {
        o.getMatrixAt(i, M); M.premultiply(o.matrixWorld);
        c.copy(bs.center).applyMatrix4(M);
        R = Math.max(R, c.length() + bs.radius * M.getMaxScaleOnAxis());
      }
    } else {
      c.copy(bs.center).applyMatrix4(o.matrixWorld);
      R = Math.max(R, c.length() + bs.radius * o.matrixWorld.getMaxScaleOnAxis());
    }
  });
  return R;
}

export function entsorge(obj) { obj.traverse(x => { if (x.geometry) x.geometry.dispose(); }); }
