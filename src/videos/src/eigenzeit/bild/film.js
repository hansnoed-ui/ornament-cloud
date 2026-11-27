// Eigenzeit als Film (27. November 2026): dieselbe Rechnung wie alpha/formen/eigenzeit/eigenzeit.js, aber Bild für Bild nach Zeitplan.
// Wunsch: «eine animation, 42 sekunden mit der zeitfigur bei den formen. genug bewegung und entwicklung». Szenenplan von Christian freigegeben.
// Startwert 2471, vier Ringe, Unterschied 70. Die Koppelung, der Beobachter und die Kamera folgen dem Zeitplan PLAN unten.
// Ändert sich die Rechnung der Seite, hier nachziehen (Konstanten und rechne/operation/beobachte sind übernommen).
// globalThis.film.bild(n) rechnet bis Bild n (30 fps) und liefert ein JPG, verkleinert auf die Zielgrösse (doppelt gerechnet, glatter).
// Bild 0–89 ist das Intro (s = −3 … 0, Christian: «nicht dieses intro, das ist zu lasch. ein neues bauen im stile der animation»):
// die Ringe tauchen nacheinander auf und schreiten schon, noch ohne Spur; die Kamera kippt von oben in die Seitenansicht des Films.
import { T, TAU, rngFrom, pick, erzeugeRenderer, studio, materialien, setzeMaterial } from '/alpha/formen/gemeinsam.js?v=1';

const q = new globalThis.URLSearchParams(globalThis.location.search);
const BREITE = Number(q.get('b') || 1080), HOEHE = Number(q.get('h') || 1350), DICHTE = Number(q.get('d') || 2);
// seit «bitte alles ohne weissen rahmen»: die Figur füllt das ganze Bild und sitzt etwas tiefer, oben steht der Text (Anteil der Bildhöhe)
const TIEFER = Number(q.get('tiefer') || 0.08);

// ---------- wie auf der Seite ----------
const KMAX = 1, DT = 1 / 120, TAU0 = 0.9, BEOBACHTER_TAKT = 1.7, LMAX = 260, DZ = 0.011, FAEDEN = 18;
const AKZENT = 0x8fb0ff, FADEN = new T.Color(0xf4f1ea);
const START = 2471, RINGE = 4, UNTERSCHIED = 70;

// ---------- Zeitplan (Sekunden ab Beginn des Films, ohne Intro) ----------
const FPS = 30, TEMPO = 3.2;   // die Rechnung läuft 3,2-mal so schnell wie die Bilder, damit die Spur in 33 s sichtbar wächst
const glatt = x => x <= 0 ? 0 : x >= 1 ? 1 : x * x * (3 - 2 * x);
const rampe = (s, a, b, von, bis) => von + (bis - von) * glatt((s - a) / (b - a));
const PLAN = {
  koppelung(s) {             // 0–11 s beziehungslos, 11–14 auf 0,55 (gekoppelt), 18–20 auf 1 (aufgegangen), 24–26 zurück auf 0,4
    if (s < 11) return 0;
    if (s < 18) return rampe(s, 11, 14, 0, 0.55);
    if (s < 24) return rampe(s, 18, 20, 0.55, 1);
    return rampe(s, 24, 26, 1, 0.4);
  },
  beobachter: s => s >= 24.5,
  spur: s => s >= 0,                                             // im Intro schreiten die Ringe, legen aber noch keine Schichten ab
  auftauchen: (s, i) => glatt((s + 2.8 - i * 0.38) / 0.7),       // Ring i erscheint im Intro nach dem vorigen
  naehe: s => rampe(s, -3, 0, 0.78, 1),                          // die Kamera kommt aus der Nähe
  drehung: s => 0.5 + 0.075 * s + rampe(s, 29.5, 33, 0, 0.9) - rampe(s, -3, 0, 0.6, 0),
  neigung(s) {
    if (s < 0) return rampe(s, -3, 0, 1.45, 0.12);
    if (s < 9) return rampe(s, 0, 9, 0.12, 0.3);
    if (s < 24) return rampe(s, 9, 22, 0.3, 0.22);
    return rampe(s, 24, 33, 0.22, 0.5);
  }
};

// ---------- Bühne ----------
const leinwand = globalThis.document.getElementById('leinwand');
const renderer = erzeugeRenderer(leinwand);
renderer.setPixelRatio(1);
renderer.setSize(BREITE * DICHTE, HOEHE * DICHTE, false);
leinwand.style.width = BREITE * DICHTE + 'px';
const szene = new T.Scene();
szene.background = new T.Color(0x151412);
const kamera = new T.PerspectiveCamera(32, BREITE / HOEHE, 0.05, 100);
studio(renderer, szene);
const m = materialien();
setzeMaterial(m, 'messing');

const geoLebend = new T.SphereGeometry(1, 20, 14);
const geoSchicht = new T.IcosahedronGeometry(1, 1);
const geoMarke = new T.IcosahedronGeometry(1, 2);
// Fäden und Feststellungen als dünne Stäbe statt Linien: Linien sind im Film nur ein Pixel breit, auf dem Telefon zu fein
const R_FADEN = 0.0055, R_FEST = 0.0065;
const geoStab = new T.CylinderGeometry(1, 1, 1, 6, 1, true);
const matFeststellung = new T.MeshBasicMaterial({ color: AKZENT, toneMapped: false });
const matFaden = new T.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.95, toneMapped: false });
const matBeobachter = new T.MeshBasicMaterial({ color: AKZENT, transparent: true, opacity: 0 });
const drehpunkt = new T.Group(); szene.add(drehpunkt);
const welt = new T.Group(); drehpunkt.add(welt);
const _M = new T.Matrix4(), _p = new T.Vector3(), _s = new T.Vector3(), Q0 = new T.Quaternion(), _q = new T.Quaternion(), _d = new T.Vector3(), _c = new T.Color();
const OBEN = new T.Vector3(0, 1, 0);
function stab(mesh, i, ax, ay, az, bx, by, bz, rad) {
  _d.set(bx - ax, by - ay, bz - az); const l = _d.length() || 1e-5;
  _p.set((ax + bx) / 2, (ay + by) / 2, (az + bz) / 2); _q.setFromUnitVectors(OBEN, _d.multiplyScalar(1 / l));
  _M.compose(_p, _q, _s.set(rad, l, rad)); mesh.setMatrixAt(i, _M);
}

const r = rngFrom(START), N = RINGE;
const rang = Array.from({ length: N }, (_, i) => -1 + 2 * i / (N - 1));
for (let i = N - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [rang[i], rang[j]] = [rang[j], rang[i]]; }
const ringe = [];
for (let i = 0; i < N; i++) {
  const R = 0.32 + i * (0.68 / (N - 1));
  const k = pick(r, [6, 7, 8, 9, 10, 12]);
  const bruch = pick(r, [0.382, 0.618, 0.414, 0.586, 0.236, 0.764]);
  const x = { R, k, bruch, rang: rang[i] + (r() - 0.5) * 0.2, theta: r(), n: 0, rot: 0, rotZeig: 0, y: 0, yZeig: 0 };
  x.lebend = new T.Group();
  const reif = new T.Mesh(new T.TorusGeometry(R, 0.007, 8, 180), m.a); reif.rotation.x = Math.PI / 2; x.lebend.add(reif);
  const perlen = new T.InstancedMesh(geoLebend, m.a, k - 1);
  for (let j = 1; j < k; j++) { const a = TAU * j / k; _M.compose(_p.set(R * Math.cos(a), 0, R * Math.sin(a)), Q0, _s.setScalar(0.026)); perlen.setMatrixAt(j - 1, _M); }
  x.lebend.add(perlen);
  const marke = new T.Mesh(geoLebend, m.perle); marke.scale.setScalar(0.05); marke.position.set(R, 0, 0); x.lebend.add(marke);
  x.spur = new T.InstancedMesh(geoSchicht, m.b, LMAX * (k - 1)); x.spur.count = 0; x.spur.frustumCulled = false;
  x.spurMarken = new T.InstancedMesh(geoMarke, m.perle, LMAX); x.spurMarken.count = 0; x.spurMarken.frustumCulled = false;
  welt.add(x.lebend, x.spur, x.spurMarken);
  const s = UNTERSCHIED / 100 * 0.8; x.tau = TAU0 * Math.exp(s * x.rang); x.omega = 1 / x.tau;
  ringe.push(x);
}
const faeden = new T.InstancedMesh(geoStab, matFaden, (N - 1) * FAEDEN); faeden.frustumCulled = false; welt.add(faeden);
for (let i = 0; i < faeden.count; i++) faeden.setColorAt(i, _c.setRGB(0, 0, 0));
const MAXF = 1500;
const feststellung = new T.InstancedMesh(geoStab, matFeststellung, MAXF); feststellung.count = 0; feststellung.frustumCulled = false; welt.add(feststellung);
const beobachterRing = new T.Mesh(new T.TorusGeometry(1.14, 0.006, 6, 220), matBeobachter); beobachterRing.rotation.x = Math.PI / 2; welt.add(beobachterRing);

// ---------- Rechnung (wie auf der Seite) ----------
let simT = 0, thetaB = 0, aufblitzen = 0, K = 0, beobachter = false, spurAn = false;
function operation(x) {
  x.rot += (TAU / x.k) * x.bruch;
  if (!spurAn || x.n >= LMAX) return;
  x.n++; x.y = x.n * DZ;
  const basis = x.spur.count;
  for (let j = 1; j < x.k; j++) {
    const a = TAU * j / x.k + x.rot;
    _M.compose(_p.set(x.R * Math.cos(a), x.y, x.R * Math.sin(a)), Q0, _s.setScalar(0.013));
    x.spur.setMatrixAt(basis + j - 1, _M);
  }
  x.spur.count = basis + x.k - 1; x.spur.instanceMatrix.needsUpdate = true;
  _M.compose(_p.set(x.R * Math.cos(x.rot), x.y, x.R * Math.sin(x.rot)), Q0, _s.setScalar(0.022));
  x.spurMarken.setMatrixAt(x.spurMarken.count++, _M); x.spurMarken.instanceMatrix.needsUpdate = true;
}
function beobachte() {
  aufblitzen = 1;
  for (let i = 0; i < ringe.length - 1 && feststellung.count < MAXF; i++) {
    const a = ringe[i], b = ringe[i + 1];
    stab(feststellung, feststellung.count++, a.R * Math.cos(a.rot), a.y, a.R * Math.sin(a.rot), b.R * Math.cos(b.rot), b.y, b.R * Math.sin(b.rot), R_FEST);
  }
  feststellung.instanceMatrix.needsUpdate = true;
}
function rechne() {
  const kk = K * KMAX;
  const tempo = ringe.map(x => { let s = 0; for (const y of ringe) if (y !== x) s += Math.sin(TAU * (y.theta - x.theta)); return x.omega + kk / (N - 1) * s; });
  ringe.forEach((x, i) => { const vorher = Math.floor(x.theta); x.theta += tempo[i] * DT; if (Math.floor(x.theta) > vorher) operation(x); });
  const vorherB = Math.floor(thetaB); thetaB += DT / BEOBACHTER_TAKT;
  if (Math.floor(thetaB) > vorherB && beobachter) beobachte();
  simT += DT;
}
function zeichneFaeden() {
  let n = 0;
  for (let i = 0; i < ringe.length - 1; i++) {
    const a = ringe[i], b = ringe[i + 1];
    const kraft = K * KMAX * Math.abs(Math.sin(TAU * (b.theta - a.theta))) / KMAX;
    const da = Math.min(a.skala ?? 1, b.skala ?? 1), ra = a.R * (a.skala ?? 1), rb = b.R * (b.skala ?? 1);   // im Intro wachsen die Fäden mit den Ringen
    const hell = (0.035 + 0.965 * Math.min(1, kraft * 1.6)) * da;   // ohne Koppelung fast unsichtbar: die Fäden tragen keine Spannung
    for (let f = 0; f < FAEDEN; f++, n++) {
      const w = TAU * f / FAEDEN;
      stab(faeden, n, ra * Math.cos(w + a.rotZeig), a.yZeig, ra * Math.sin(w + a.rotZeig), rb * Math.cos(w + b.rotZeig), b.yZeig, rb * Math.sin(w + b.rotZeig), R_FADEN * Math.max(da, 0.001));
      faeden.setColorAt(n, _c.setRGB(FADEN.r * hell, FADEN.g * hell, FADEN.b * hell));
    }
  }
  faeden.instanceMatrix.needsUpdate = true; faeden.instanceColor.needsUpdate = true;
}

// ---------- Bild für Bild ----------
const INTRO = 90;   // Bilder vor dem Film
let bildNr = -1, mitteY = 0, abstand = 0;
function schritt(s) {
  const dt = 1 / FPS;
  K = PLAN.koppelung(s); beobachter = PLAN.beobachter(s); spurAn = PLAN.spur(s);
  let ziel = simT + dt * TEMPO;
  while (simT + DT <= ziel) rechne();
  const g = 1 - Math.exp(-dt * 14);
  let hoehe = 0;
  for (const x of ringe) {
    x.rotZeig += (x.rot - x.rotZeig) * g; x.yZeig += (x.y - x.yZeig) * g;
    x.lebend.rotation.y = -x.rotZeig; x.lebend.position.y = x.yZeig;
    x.skala = PLAN.auftauchen(s, ringe.indexOf(x)); x.lebend.scale.setScalar(Math.max(0.0001, x.skala));
    hoehe = Math.max(hoehe, x.yZeig);
  }
  aufblitzen *= Math.exp(-dt * 3);
  beobachterRing.visible = beobachter; beobachterRing.position.y = hoehe;
  matBeobachter.opacity = 0.25 + 0.7 * aufblitzen;
  const halb = T.MathUtils.degToRad(kamera.fov / 2), noetig = Math.max(1.25, hoehe * 0.62 + 0.55);
  const zielAbstand = Math.max(noetig / Math.tan(halb), noetig / (Math.tan(halb) * kamera.aspect));
  const w = 1 - Math.exp(-dt * 3);
  if (!abstand) { abstand = zielAbstand; mitteY = hoehe / 2; }
  mitteY += (hoehe / 2 - mitteY) * w; abstand += (zielAbstand - abstand) * w;
}
function zeichne(s) {
  zeichneFaeden();
  welt.position.y = -mitteY;
  drehpunkt.rotation.set(PLAN.neigung(s), PLAN.drehung(s), 0);
  const a = abstand * PLAN.naehe(s) * 1.1, dy = TIEFER * 2 * Math.tan(T.MathUtils.degToRad(kamera.fov / 2)) * a;
  kamera.position.set(0, dy, a); kamera.lookAt(0, dy, 0);
  renderer.render(szene, kamera);
}
const klein = globalThis.document.createElement('canvas'); klein.width = BREITE; klein.height = HOEHE;
const k2 = klein.getContext('2d'); k2.imageSmoothingQuality = 'high';

globalThis.film = {
  bild(n) {
    while (bildNr < n) { bildNr++; schritt((bildNr - INTRO) / FPS); }
    zeichne((n - INTRO) / FPS);
    k2.drawImage(leinwand, 0, 0, BREITE, HOEHE);
    return klein.toDataURL('image/jpeg', 0.93);
  },
  zustand: () => ({ simT, K, schritte: ringe.map(x => x.n), feststellungen: feststellung.count })
};
globalThis.bereit = true;
