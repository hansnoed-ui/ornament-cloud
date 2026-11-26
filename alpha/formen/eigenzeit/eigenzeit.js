// ORNAMENT FORMEN 0.1 – Eigenzeit (26. November 2026). Christians Begriffe, ins Bild gesetzt (Vorschlag von Claude, Christians OK):
//  · Eigenzeit statt Uhr: jeder Ring hat einen eigenen Rhythmus und schreitet in Operationen, nicht gleichmässig.
//  · Koppelung und Zeitdruck: gekoppelte Ringe ziehen aneinander (Phasenkoppelung nach Kuramoto); die Fäden zwischen
//    benachbarten Ringen leuchten mit der Kraft, die zwischen ihnen wirkt. Zustand: aufgegangen, gekoppelt, beziehungslos.
//  · Spur als Körper: jede Operation legt eine Schicht ab; jeder Ring wächst so hoch, wie er Schritte macht.
//    Der Schritt ist ein irrationaler Bruchteil des Perlenabstands, darum deckt sich keine Schicht mit einer früheren.
//  · Beobachter (dritte Temporalisierung): ein dritter Rhythmus vergleicht die Ringe; nur dann werden Differenzen markiert.
// Die Rechnung läuft in festen Schritten (1/120 s), unabhängig von der Bildrate: gleicher Startwert, gleiche Regler, gleicher Verlauf.
import { T, TAU, rngFrom, pick, neuerStartwert, erzeugeRenderer, studio, materialien, setzeMaterial, MATERIAL, entsorge } from '../gemeinsam.js?v=1';

const $ = id => document.getElementById(id);
const P = { start: 2471, ringe: 4, unterschied: 70, koppelung: 50, beobachter: false, tempo: 100, material: 'messing' };
let laeuft = !window.matchMedia('(prefers-reduced-motion: reduce)').matches;

const KMAX = 1;            // grösste Koppelung (Zyklen je Sekunde), linear: bei Unterschied 70 etwa bis 30 beziehungslos, 35–75 gekoppelt, ab 80 aufgegangen
const DT = 1 / 120;        // fester Rechenschritt
const TAU0 = 0.9;          // mittlere Eigenzeit: Sekunden je Operation
const BEOBACHTER_TAKT = 1.7;
const LMAX = 260;          // Schichten je Ring
const DZ = 0.011;          // Höhe einer Schicht
const FENSTER = 8;         // Sekunden, über die der Zustand gemessen wird
const FAEDEN = 18;         // Fäden je Ringpaar
const AKZENT = 0x8fb0ff, FADEN = new T.Color(0xf4f1ea);

// ---------- Bühne ----------
const buehne = $('buehne');
const renderer = erzeugeRenderer(document.createElement('canvas'));
buehne.appendChild(renderer.domElement);
const szene = new T.Scene();
const kamera = new T.PerspectiveCamera(32, 1, 0.05, 100);
studio(renderer, szene);
const m = materialien();
setzeMaterial(m, P.material);

const geoLebend = new T.SphereGeometry(1, 16, 12);
const geoSchicht = new T.IcosahedronGeometry(1, 0);
const geoMarke = new T.IcosahedronGeometry(1, 1);
const matFeststellung = new T.LineBasicMaterial({ color: AKZENT, transparent: true, opacity: 0.85 });
const matFaden = new T.LineBasicMaterial({ vertexColors: true, transparent: true, opacity: 0.9 });
const matBeobachter = new T.MeshBasicMaterial({ color: AKZENT, transparent: true, opacity: 0 });

const drehpunkt = new T.Group(); szene.add(drehpunkt);
let welt = new T.Group(); drehpunkt.add(welt);

let ringe = [], faeden = null, feststellung = null, beobachterRing = null;
let simT = 0, thetaB = 0, anzahlFeststellungen = 0, voll = false, verlauf = [], naechsteProbe = 0, aufblitzen = 0;
const _M = new T.Matrix4(), _p = new T.Vector3(), _s = new T.Vector3(), Q0 = new T.Quaternion();

// ---------- Aufbau ----------
function baue() {
  entsorgeWelt();
  const r = rngFrom(P.start), N = P.ringe;
  // Rang der Eigenzeit: gleichmässig verteilt, gemischt, leicht verschoben
  const rang = Array.from({ length: N }, (_, i) => -1 + 2 * i / (N - 1));
  for (let i = N - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [rang[i], rang[j]] = [rang[j], rang[i]]; }
  ringe = [];
  for (let i = 0; i < N; i++) {
    const R = 0.32 + i * (0.68 / (N - 1));
    const k = pick(r, [6, 7, 8, 9, 10, 12]);
    const bruch = pick(r, [0.382, 0.618, 0.414, 0.586, 0.236, 0.764]);
    const x = { R, k, bruch, rang: rang[i] + (r() - 0.5) * 0.2, theta: r(), n: 0, rot: 0, rotZeig: 0, y: 0, yZeig: 0 };
    // der lebende Ring: feiner Reif, Perlen, eine grosse Marke
    x.lebend = new T.Group();
    const reif = new T.Mesh(new T.TorusGeometry(R, 0.007, 6, 140), m.a); reif.rotation.x = Math.PI / 2; x.lebend.add(reif);
    const perlen = new T.InstancedMesh(geoLebend, m.a, k - 1);
    for (let j = 1; j < k; j++) { const a = TAU * j / k; _M.compose(_p.set(R * Math.cos(a), 0, R * Math.sin(a)), Q0, _s.setScalar(0.026)); perlen.setMatrixAt(j - 1, _M); }
    x.lebend.add(perlen);
    const marke = new T.Mesh(geoLebend, m.perle); marke.scale.setScalar(0.05); marke.position.set(R, 0, 0); x.lebend.add(marke);
    // die Spur: Schichten aus kleinen Perlen und einer Marke je Schicht
    x.spur = new T.InstancedMesh(geoSchicht, m.b, LMAX * (k - 1)); x.spur.count = 0; x.spur.frustumCulled = false;
    x.spurMarken = new T.InstancedMesh(geoMarke, m.perle, LMAX); x.spurMarken.count = 0; x.spurMarken.frustumCulled = false;
    welt.add(x.lebend, x.spur, x.spurMarken);
    ringe.push(x);
  }
  setzeTempi();
  // Fäden zwischen benachbarten Ringen
  const seg = (N - 1) * FAEDEN;
  const fg = new T.BufferGeometry();
  fg.setAttribute('position', new T.BufferAttribute(new Float32Array(seg * 6), 3));
  fg.setAttribute('color', new T.BufferAttribute(new Float32Array(seg * 6), 3));
  faeden = new T.LineSegments(fg, matFaden); faeden.frustumCulled = false; welt.add(faeden);
  // Feststellungen des Beobachters
  const MAXF = 4000, sg = new T.BufferGeometry();
  sg.setAttribute('position', new T.BufferAttribute(new Float32Array(MAXF * 6), 3));
  sg.setDrawRange(0, 0);
  feststellung = new T.LineSegments(sg, matFeststellung); feststellung.frustumCulled = false; feststellung.userData.max = MAXF;
  welt.add(feststellung);
  beobachterRing = new T.Mesh(new T.TorusGeometry(1.14, 0.006, 6, 180), matBeobachter); beobachterRing.rotation.x = Math.PI / 2;
  welt.add(beobachterRing);
  simT = 0; thetaB = 0; anzahlFeststellungen = 0; voll = false; verlauf = []; naechsteProbe = 0; aufblitzen = 0;
  $('voll').hidden = true;
  zeigeRezept();
}

function entsorgeWelt() {
  welt.traverse(o => { if (o.geometry && o.geometry !== geoLebend && o.geometry !== geoSchicht && o.geometry !== geoMarke) o.geometry.dispose(); });
  drehpunkt.remove(welt);
  welt = new T.Group(); drehpunkt.add(welt);
}

function setzeTempi() {
  const s = P.unterschied / 100 * 0.8;
  for (const x of ringe) { x.tau = TAU0 * Math.exp(s * x.rang); x.omega = 1 / x.tau; }
}

// ---------- Rechnung ----------
function operation(x) {
  x.rot += (TAU / x.k) * x.bruch;
  if (voll) return;
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
  if (x.n >= LMAX) { voll = true; $('voll').hidden = false; }
}

function beobachte() {
  anzahlFeststellungen++; aufblitzen = 1;
  const pos = feststellung.geometry.attributes.position;
  let n = feststellung.geometry.drawRange.count / 2;
  for (let i = 0; i < ringe.length - 1 && n < feststellung.userData.max; i++, n++) {
    const a = ringe[i], b = ringe[i + 1];
    pos.setXYZ(n * 2, a.R * Math.cos(a.rot), a.y, a.R * Math.sin(a.rot));
    pos.setXYZ(n * 2 + 1, b.R * Math.cos(b.rot), b.y, b.R * Math.sin(b.rot));
  }
  feststellung.geometry.setDrawRange(0, n * 2);
  pos.needsUpdate = true;
}

function rechne() {
  const N = ringe.length, K = P.koppelung / 100 * KMAX;
  const tempo = ringe.map(x => {
    let s = 0;
    for (const y of ringe) if (y !== x) s += Math.sin(TAU * (y.theta - x.theta));
    return x.omega + K / (N - 1) * s;
  });
  ringe.forEach((x, i) => {
    const vorher = Math.floor(x.theta);
    x.theta += tempo[i] * DT;
    if (Math.floor(x.theta) > vorher) operation(x);
  });
  const vorherB = Math.floor(thetaB);
  thetaB += DT / BEOBACHTER_TAKT;
  if (Math.floor(thetaB) > vorherB && P.beobachter) beobachte();
  simT += DT;
  if (simT >= naechsteProbe) {
    verlauf.push({ t: simT, th: ringe.map(x => x.theta) });
    naechsteProbe += 0.25;
    while (verlauf.length > 2 && verlauf[1].t <= simT - FENSTER) verlauf.shift();
  }
}

// Zustand über die letzten acht Sekunden: wie weit die wirklichen Tempi zusammengezogen sind
function messe() {
  const nat = ringe.map(x => x.omega);
  const natSpanne = Math.max(...nat) - Math.min(...nat);
  if (verlauf.length < 2) return null;
  const a = verlauf[0], b = verlauf[verlauf.length - 1], dauer = b.t - a.t;
  if (dauer < FENSTER * 0.9) return null;
  const eff = ringe.map((_, i) => (b.th[i] - a.th[i]) / dauer);
  const spanne = Math.max(...eff) - Math.min(...eff), mittel = eff.reduce((s, v) => s + v, 0) / eff.length;
  let zustand;
  if (natSpanne < 1e-6 || spanne / Math.abs(mittel) < 0.012) zustand = 'aufgegangen';
  else if (P.koppelung === 0 || 1 - spanne / natSpanne < 0.08) zustand = 'beziehungslos';
  else zustand = 'gekoppelt';
  return { zustand, eff };
}

const TEXTE = {
  aufgegangen: 'Gleichtakt: Die Ringe teilen einen Takt, die Spur wird eben. Synchron, aber ohne neue Anschlüsse.',
  gekoppelt: 'Die Ringe ziehen aneinander und bleiben verschieden. Wo die Fäden hell werden, entsteht Zeitdruck.',
  beziehungslos: 'Jeder Ring läuft für sich. Die Fäden tragen keine Spannung, die Türme wachsen unabhängig.'
};

// ---------- Anzeige ----------
const komma = v => v.toFixed(2).replace('.', ',');
function zeigeZustand() {
  const z = messe();
  document.querySelectorAll('#zustaende span').forEach(s => s.classList.toggle('an', !!z && s.dataset.zustand === z.zustand));
  $('zustandText').textContent = z ? TEXTE[z.zustand] : 'Die Ringe laufen an …';
  const K = P.koppelung / 100 * KMAX;
  let druck = 0;
  for (let i = 0; i < ringe.length - 1; i++) druck += K * Math.abs(Math.sin(TAU * (ringe[i + 1].theta - ringe[i].theta))) / KMAX;
  druck /= Math.max(1, ringe.length - 1);
  $('druck').textContent = `Zeitdruck ${komma(druck)}` + (P.beobachter || anzahlFeststellungen ? ` · Feststellungen ${anzahlFeststellungen}` : '');
  $('ringliste').innerHTML = ringe.map((x, i) => {
    const jetzt = z ? ` · jetzt ${komma(1 / Math.max(0.01, z.eff[i]))} s` : '';
    return `<div>Ring ${i + 1} · eigen ${komma(x.tau)} s${jetzt} · ${x.n} Schritte</div>`;
  }).join('');
}

function zeigeRezept() {
  $('rezept').textContent =
    `Startwert ${P.start} · Ringe ${P.ringe} · Unterschied ${P.unterschied} · Koppelung ${P.koppelung} · Beobachter ${P.beobachter ? 'an' : 'aus'} · ${MATERIAL[P.material].name}`;
}

function zeichneFaeden() {
  const pos = faeden.geometry.attributes.position, col = faeden.geometry.attributes.color;
  const K = P.koppelung / 100 * KMAX;
  let n = 0;
  for (let i = 0; i < ringe.length - 1; i++) {
    const a = ringe[i], b = ringe[i + 1];
    const kraft = K * Math.abs(Math.sin(TAU * (b.theta - a.theta))) / KMAX;
    const hell = 0.1 + 0.9 * Math.min(1, kraft * 1.6);
    for (let f = 0; f < FAEDEN; f++, n++) {
      const w = TAU * f / FAEDEN;
      pos.setXYZ(n * 2, a.R * Math.cos(w + a.rotZeig), a.yZeig, a.R * Math.sin(w + a.rotZeig));
      pos.setXYZ(n * 2 + 1, b.R * Math.cos(w + b.rotZeig), b.yZeig, b.R * Math.sin(w + b.rotZeig));
      col.setXYZ(n * 2, FADEN.r * hell, FADEN.g * hell, FADEN.b * hell);
      col.setXYZ(n * 2 + 1, FADEN.r * hell, FADEN.g * hell, FADEN.b * hell);
    }
  }
  pos.needsUpdate = true; col.needsUpdate = true;
}

// ---------- Kamera ----------
let zoom = 1, mitteY = 0, abstand = 4;
function passeGroesse() {
  const w = buehne.clientWidth, h = buehne.clientHeight;
  if (!w || !h) return;
  renderer.setSize(w, h, false);
  kamera.aspect = w / h; kamera.updateProjectionMatrix();
}
new ResizeObserver(passeGroesse).observe(buehne);

let drehung = 0.4, neigung = 0.22, zug = null;
buehne.addEventListener('pointerdown', e => {
  zug = { x: e.clientX, y: e.clientY, drehung, neigung };
  try { buehne.setPointerCapture(e.pointerId); } catch (err) { /* ohne Fang weiter */ }
  buehne.classList.add('zieht');
});
buehne.addEventListener('pointermove', e => {
  if (!zug) return;
  drehung = zug.drehung + (e.clientX - zug.x) * 0.008;
  neigung = Math.max(-1.3, Math.min(1.45, zug.neigung + (e.clientY - zug.y) * 0.008));
});
const ende = () => { zug = null; buehne.classList.remove('zieht'); };
buehne.addEventListener('pointerup', ende);
buehne.addEventListener('pointercancel', ende);
buehne.addEventListener('wheel', e => {
  e.preventDefault();
  zoom = Math.max(0.4, Math.min(2.5, zoom * Math.exp(e.deltaY * 0.001)));
}, { passive: false });

// ---------- Regler ----------
const regler = (id, fn, einheit = '') => {
  const el = $(id);
  el.addEventListener('input', () => { P[id] = +el.value; $(id + 'Aus').textContent = el.value + einheit; fn(); zeigeRezept(); });
};
regler('ringe', baue);
regler('unterschied', setzeTempi);
regler('koppelung', () => {});
regler('tempo', () => {}, ' %');
$('start').addEventListener('change', e => {
  const v = Math.max(1, Math.min(99999, Math.round(+e.target.value) || 1));
  e.target.value = v; P.start = v; baue();
});
$('wuerfeln').addEventListener('click', () => { P.start = neuerStartwert(); $('start').value = P.start; baue(); });
$('beobachter').addEventListener('click', e => {
  P.beobachter = !P.beobachter; e.currentTarget.setAttribute('aria-pressed', String(P.beobachter)); zeigeRezept();
});
$('material').addEventListener('click', e => {
  const b = e.target.closest('button[data-material]'); if (!b) return;
  P.material = b.dataset.material;
  $('material').querySelectorAll('button').forEach(x => x.setAttribute('aria-pressed', String(x === b)));
  setzeMaterial(m, P.material); zeigeRezept();
});
const laufKnopf = $('lauf');
const zeigeLauf = () => { laufKnopf.textContent = laeuft ? 'Anhalten' : 'Abspielen'; };
laufKnopf.addEventListener('click', () => { laeuft = !laeuft; zeigeLauf(); });
$('neu').addEventListener('click', baue);
$('kopieren').addEventListener('click', () => {
  const k = $('kopieren');
  const fertig = () => { k.textContent = 'Kopiert'; setTimeout(() => { k.textContent = 'Rezept kopieren'; }, 1400); };
  const markiere = () => {
    const bereich = document.createRange(); bereich.selectNodeContents($('rezept'));
    const s = getSelection(); s.removeAllRanges(); s.addRange(bereich);
    k.textContent = 'Markiert, jetzt kopieren';
    setTimeout(() => { k.textContent = 'Rezept kopieren'; }, 2000);
  };
  try { navigator.clipboard.writeText($('rezept').textContent).then(fertig, markiere); } catch (err) { markiere(); }
});

// ---------- Lauf ----------
let zuletzt = performance.now(), rest = 0, anzeigeUhr = 0;
function bild(jetzt) {
  const dt = Math.min(0.05, (jetzt - zuletzt) / 1000); zuletzt = jetzt;
  if (laeuft) {
    rest += dt * P.tempo / 100;
    let n = 0;
    while (rest >= DT && n < 120) { rechne(); rest -= DT; n++; }
    if (n === 120) rest = 0;
    if (!zug) drehung += dt * 0.08;
  }
  const glatt = 1 - Math.exp(-dt * 14);
  let hoehe = 0;
  for (const x of ringe) {
    x.rotZeig += (x.rot - x.rotZeig) * glatt;
    x.yZeig += (x.y - x.yZeig) * glatt;
    x.lebend.rotation.y = -x.rotZeig;
    x.lebend.position.y = x.yZeig;
    hoehe = Math.max(hoehe, x.yZeig);
  }
  zeichneFaeden();
  aufblitzen *= Math.exp(-dt * 3);
  beobachterRing.visible = P.beobachter;
  beobachterRing.position.y = hoehe;
  matBeobachter.opacity = 0.25 + 0.7 * aufblitzen;
  // Kamera folgt der wachsenden Spur
  const ziel = hoehe / 2, noetig = Math.max(1.25, hoehe * 0.62 + 0.55);
  const halb = T.MathUtils.degToRad(kamera.fov / 2);
  const zielAbstand = Math.max(noetig / Math.tan(halb), noetig / (Math.tan(halb) * kamera.aspect)) * zoom;
  const weich = 1 - Math.exp(-dt * 3);
  mitteY += (ziel - mitteY) * weich; abstand += (zielAbstand - abstand) * weich;
  welt.position.y = -mitteY;
  drehpunkt.rotation.set(neigung, drehung, 0);
  kamera.position.set(0, 0, abstand); kamera.lookAt(0, 0, 0);
  renderer.render(szene, kamera);
  anzeigeUhr += dt;
  if (anzeigeUhr > 0.25) { anzeigeUhr = 0; zeigeZustand(); }
  requestAnimationFrame(bild);
}

zeigeLauf();
passeGroesse();
baue();
abstand = 6;
requestAnimationFrame(bild);
