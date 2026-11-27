// Formenfahrt (27. November 2026): eine ruhige Kamerafahrt ohne Schnitt durch einen dunklen Raum, in dem Formen aus dem Katalog von
// ORNAMENT FORMEN hintereinander stehen, am Schluss die Spur der Eigenzeit. Wunsch: «mach noch ein anderes, flüssigeres video mit einer fahrt
// durch verschiedene formen, ohne text (mit intro und outro), ca 45 sekunden»; Plan von Christian freigegeben («ja, so machen»).
// Die Formen baut alpha/formen/familien.js mit den Startwerten des Katalogs. Die Kamera fährt auf einer Catmull-Rom-Kurve nach Bogenlänge,
// also mit gleichmässigem Tempo, am Anfang und Ende sanft beschleunigt und gebremst. Nebel lässt die Formen in der Tiefe verschwinden.
// globalThis.film.bild(n) rechnet bis Bild n (30 fps, 36 s Fahrt) und liefert ein JPG.
import { T, TAU, rngFrom, pick, erzeugeRenderer, studio, materialien, setzeMaterial, radius } from '/alpha/formen/gemeinsam.js?v=1';
import { familien } from '/alpha/formen/familien.js?v=1';

const q = new globalThis.URLSearchParams(globalThis.location.search);
const BREITE = Number(q.get('b') || 1080), HOEHE = Number(q.get('h') || 1350), DICHTE = Number(q.get('d') || 2);
const FPS = 30, DAUER = 36, GRUND = 0x151412;

const leinwand = globalThis.document.getElementById('leinwand');
const renderer = erzeugeRenderer(leinwand);
renderer.setPixelRatio(1);
renderer.setSize(BREITE * DICHTE, HOEHE * DICHTE, false);
const szene = new T.Scene();
szene.background = new T.Color(GRUND);
szene.fog = new T.Fog(GRUND, 5.5, 13);
const kamera = new T.PerspectiveCamera(38, BREITE / HOEHE, 0.05, 80);
studio(renderer, szene);
const m = materialien();
setzeMaterial(m, 'messing');

// ---------- die Formen ----------
const FAM = Object.fromEntries(familien(m).map(f => [f.name, f]));
const glatt = x => x <= 0 ? 0 : x >= 1 ? 1 : x * x * (3 - 2 * x);
const STATIONEN = [
  // name, Ort (x, z), Grösse, eigene Zeit für update(t)
  { name: 'Rosette', ort: [0, 0], gross: 1.25, zeit: t => t },
  { name: 'Fries', ort: [5.6, -2.2], gross: 1.35 },
  { name: 'Körper', ort: [11.2, 0.4], gross: 1.2 },
  { name: 'Verflechtung', ort: [16.8, -1.9], gross: 1.25 },
  { name: 'Wachstum', ort: [22.4, 0.6], gross: 1.3, zeit: t => Math.min(9, Math.max(0, (t - 17.5) * 1.5)) },   // wächst, während die Kamera vorbeifährt
  { name: 'Reaktion–Diffusion', ort: [28, -1.6], gross: 1.25, ab: 19.5 },                                         // das Muster bildet sich ab 19,5 s, fertig wenn die Kamera ankommt
  { name: 'Quasiperiodisch', ort: [33.6, 0.5], gross: 1.05 },
];
const formen = [];
for (const [i, st] of STATIONEN.entries()) {
  const fam = FAM[st.name];
  const form = fam.bau(rngFrom(fam.start), { gemeinsam: false });
  const huelle = new T.Group(); huelle.add(form.obj);
  huelle.scale.setScalar(st.gross / (form.radius || radius(huelle)));
  const kipp = new T.Group(); kipp.rotation.x = (fam.neigung ?? -0.4) * 0.6; kipp.add(huelle);
  const halter = new T.Group(); halter.position.set(st.ort[0], 0, st.ort[1]); halter.add(kipp);
  szene.add(halter);
  formen.push({ st, form, halter, phase: i * 1.3 });
}

// ---------- die Spur der Eigenzeit als Schlussbild (Rechnung wie alpha/formen/eigenzeit/eigenzeit.js, vorab 90 s bei Koppelung 0,5) ----------
const ZK = (() => {
  const g = new T.Group(), r = rngFrom(2471), N = 4, DT = 1 / 120, DZ = 0.011;
  const rang = Array.from({ length: N }, (_, i) => -1 + 2 * i / (N - 1));
  for (let i = N - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [rang[i], rang[j]] = [rang[j], rang[i]]; }
  const geo = new T.IcosahedronGeometry(1, 1), M = new T.Matrix4(), p = new T.Vector3(), sk = new T.Vector3(), Q = new T.Quaternion();
  const ringe = [];
  for (let i = 0; i < N; i++) {
    const R = 0.32 + i * (0.68 / (N - 1)), k = pick(r, [6, 7, 8, 9, 10, 12]), bruch = pick(r, [0.382, 0.618, 0.414, 0.586, 0.236, 0.764]);
    const x = { R, k, bruch, theta: r(), rot: 0, n: 0, omega: 1 / (0.9 * Math.exp(0.56 * (rang[i] + (r() - 0.5) * 0.2))) };
    x.spur = new T.InstancedMesh(geo, m.b, 260 * (k - 1)); x.spur.count = 0; x.spur.frustumCulled = false;
    x.marken = new T.InstancedMesh(geo, m.perle, 260); x.marken.count = 0; x.marken.frustumCulled = false;
    x.reif = new T.Mesh(new T.TorusGeometry(R, 0.008, 8, 160), m.a); x.reif.rotation.x = Math.PI / 2;
    g.add(x.spur, x.marken, x.reif); ringe.push(x);
  }
  for (let st = 0; st < 90 * 120; st++) {
    const tempo = ringe.map(x => { let s = 0; for (const y of ringe) if (y !== x) s += Math.sin(TAU * (y.theta - x.theta)); return x.omega + 0.5 / (N - 1) * s; });
    ringe.forEach((x, i) => {
      const v = Math.floor(x.theta); x.theta += tempo[i] * DT;
      if (Math.floor(x.theta) > v && x.n < 260) {
        x.rot += (TAU / x.k) * x.bruch; x.n++;
        for (let j = 0; j < x.k; j++) {
          const a = TAU * j / x.k + x.rot; M.compose(p.set(x.R * Math.cos(a), x.n * DZ, x.R * Math.sin(a)), Q, sk.setScalar(j ? 0.013 : 0.022));
          if (j) x.spur.setMatrixAt(x.spur.count++, M); else x.marken.setMatrixAt(x.marken.count++, M);
        }
      }
    });
  }
  let hoch = 0;
  for (const x of ringe) { x.reif.position.y = x.n * DZ; hoch = Math.max(hoch, x.n * DZ); x.spur.instanceMatrix.needsUpdate = true; x.marken.instanceMatrix.needsUpdate = true; }
  g.position.y = -hoch / 2;
  const huelle = new T.Group(); huelle.add(g); huelle.scale.setScalar(1.35);
  const halter = new T.Group(); halter.position.set(39.4, 0, -1.4); halter.add(huelle); szene.add(halter);
  return { halter, ringe };
})();

// ---------- Kamerafahrt ----------
// je Station drei Punkte auf einem halben Bogen vor der Form; das Ziel ist die Mitte der Form
const kp = [], zp = [];
const bogen = (c, d, h0, h1, links = true) => {
  const s = links ? 1 : -1;
  // vor der Form (auf der Seite z positiv bzw. negativ), von hinten nach vorn
  for (const [k, w] of [[0, 0.75], [1, 0], [2, -0.75]]) {
    kp.push(new T.Vector3(c[0] - Math.sin(w) * d, h0 + (h1 - h0) * k / 2, c[1] + s * Math.cos(w) * d));
    zp.push(new T.Vector3(c[0], 0, c[1]));
  }
};
kp.push(new T.Vector3(-4.2, 1.6, 3.4)); zp.push(new T.Vector3(0, 0, 0));          // Anflug
// die Kamera bleibt auf einer Seite der Reihe (wie ein Gang an Skulpturen entlang); auf die Gegenseite zu wechseln, hiesse durch die Formen zu fahren
STATIONEN.forEach((st) => bogen(st.ort, st.name === 'Körper' ? 3.2 : 3.6, st.name === 'Fries' ? -0.9 : 0.55, st.name === 'Fries' ? 1.1 : 0.35, true));
bogen([39.4, -1.4], 4.2, 1.1, 1.6, true);                                            // die Spur der Eigenzeit
kp.push(new T.Vector3(44.5, 2.6, 4.2)); zp.push(new T.Vector3(39.4, 0.1, -1.4));  // Wegfahrt
const kurve = new T.CatmullRomCurve3(kp, false, 'centripetal');
kurve.arcLengthDivisions = 4000;
const ziel = new T.Vector3();

let bildNr = -1;
function stelle(t) {
  // Weg 0–1: gleichmässig nach Bogenlänge, am Anfang und Ende sanft
  const x = t / DAUER, u = Math.min(1, Math.max(0, 0.55 * x + 0.45 * glatt(x)));
  kurve.getPointAt(u, kamera.position);
  // das Ziel gleitet von Punkt zu Punkt der Zielliste, im selben Takt wie die Kamera durch ihre Punkte (je Form dreimal dieselbe Mitte)
  const k = kurve.getUtoTmapping(u) * (zp.length - 1), i = Math.min(zp.length - 2, Math.floor(k));
  ziel.lerpVectors(zp[i], zp[i + 1], glatt(k - i));
  kamera.lookAt(ziel);
  for (const f of formen) {
    f.halter.rotation.y = f.phase + t * 0.16;
    if (f.form.update) {
      if (f.st.ab !== undefined) { if (t >= f.st.ab) f.form.update(t); }
      else f.form.update(f.st.zeit ? f.st.zeit(t) : t);
    }
  }
  ZK.halter.rotation.y = t * 0.12;
  ZK.ringe.forEach((x, i) => { x.reif.rotation.z = Math.sin(t * (0.7 + i * 0.23)) * 0.04; });
}
const klein = globalThis.document.createElement('canvas'); klein.width = BREITE; klein.height = HOEHE;
const k2 = klein.getContext('2d'); k2.imageSmoothingQuality = 'high';
globalThis.film = {
  zustand: () => ({ kamera: kamera.position.toArray().map(v => +v.toFixed(2)), ziel: ziel.toArray().map(v => +v.toFixed(2)) }),
  bild(n) {
    // Formen mit eigener Rechnung (Reaktion–Diffusion) brauchen jedes Bild der Reihe nach
    while (bildNr < n) { bildNr++; stelle(bildNr / FPS); }
    renderer.render(szene, kamera);
    k2.drawImage(leinwand, 0, 0, BREITE, HOEHE);
    return klein.toDataURL('image/jpeg', 0.93);
  },
};
globalThis.bereit = true;
