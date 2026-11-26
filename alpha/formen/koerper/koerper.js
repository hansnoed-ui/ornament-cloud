// ORNAMENT FORMEN 0.1 – Ornamentkörper: Ringe aus einer Regel (Rosette, Welle, Kordel) um einen gedrechselten Kern.
// Jeder Ring dreht in eigenem Tempo; der Startwert legt alle Zufälle fest, das Rezept hält den Zustand fest.
import { T, TAU, rngFrom, pick, neuerStartwert, erzeugeRenderer, studio, materialien, setzeMaterial, MATERIAL, roehre, perlen, knopf, entsorge } from '../gemeinsam.js?v=1';

const $ = id => document.getElementById(id);
const P = { start: 2471, sym: 8, ringe: 4, tiefe: 60, staerke: 6, tempo: 100, material: 'messing' };
let laeuft = !window.matchMedia('(prefers-reduced-motion: reduce)').matches;

const buehne = $('buehne');
const renderer = erzeugeRenderer(document.createElement('canvas'));
buehne.appendChild(renderer.domElement);
const szene = new T.Scene();
const kamera = new T.PerspectiveCamera(32, 1, 0.1, 100);
studio(renderer, szene);

const m = materialien();
setzeMaterial(m, P.material);

const halter = new T.Group(); szene.add(halter);
let koerper = new T.Group(); halter.add(koerper);
let ringe = [], radiusAussen = 3;

function baue() {
  entsorge(koerper); halter.remove(koerper);
  koerper = new T.Group(); halter.add(koerper); ringe = [];
  const r = rngFrom(P.start);
  const S = P.sym, tiefe = P.tiefe / 100, dicke = P.staerke * 0.011;
  const verh = [1, 2 / 3, 3 / 4, 4 / 5, 3 / 5, 5 / 4, 1 / 2];
  let maxR = 0.5;
  for (let i = 0; i < P.ringe; i++) {
    const Ri = 0.62 + i * 0.6;
    const mult = (i > 0 && r() < 0.35) ? 2 : 1, k = S * mult;
    const art = i === 0 ? pick(r, ['rose', 'welle']) : pick(r, ['rose', 'welle', 'kordel']);
    const a = (0.1 + r() * 0.18) * (art === 'kordel' ? 0.55 : 1) * (mult === 2 ? 0.7 : 1);
    const b = (0.12 + r() * 0.3) * (0.15 + tiefe);
    const ph = r() * TAU;
    const fn = (t, v) => {
      const th = t * TAU; let rr, z;
      if (art === 'rose') { rr = Ri + a * Math.cos(k * th); z = b * Math.sin(k * th + ph); }
      else if (art === 'welle') { rr = Ri + a * 0.45 * Math.cos(2 * k * th); z = b * Math.cos(k * th); }
      else { rr = Ri + a * Math.cos(k * 2 * th); z = a * (0.5 + tiefe) * Math.sin(k * 2 * th); }
      return v.set(rr * Math.cos(th), rr * Math.sin(th), z);
    };
    const rad = dicke * (1 - i * 0.05) * (art === 'kordel' ? 0.7 : 1);
    const mesh = roehre(fn, Math.min(1400, Math.max(160, k * (art === 'kordel' ? 56 : 30))), rad, i % 2 ? m.b : m.a);
    if (r() < 0.55) {
      const n = art === 'kordel' ? S : k, off = art === 'welle' ? 0.5 : 0, groesse = rad * (1.5 + r() * 0.9), liste = [];
      for (let j = 0; j < n; j++) liste.push({ p: fn((j + off) / n, new T.Vector3()), r: groesse });
      mesh.add(perlen(liste, m.perle));
    }
    koerper.add(mesh);
    ringe.push({ mesh, tempo: pick(r, verh) * (i % 2 ? -1 : 1), wippen: 0.4 + r() * 0.8, ph: r() * TAU });
    maxR = Math.max(maxR, Ri + a + rad * 2.5);
  }
  const wuelste = 1 + Math.floor(r() * 3);
  koerper.add(knopf(0.3, 0.12 + tiefe * 0.22, wuelste, Math.max(24, S * 6), m.beidseitig));
  radiusAussen = maxR;
  passeKamera();
  zeigeRezept();
}

// ---------- Kamera ----------
let zoom = 1;
function passeKamera() {
  const w = buehne.clientWidth || 1, h = buehne.clientHeight || 1;
  kamera.aspect = w / h;
  const halb = T.MathUtils.degToRad(kamera.fov / 2);
  const abstand = Math.max(radiusAussen / Math.tan(halb), radiusAussen / (Math.tan(halb) * kamera.aspect));
  kamera.position.set(0, 0, abstand * 1.18 * zoom);
  kamera.lookAt(0, 0, 0);
  kamera.updateProjectionMatrix();
}
new ResizeObserver(() => {
  const w = buehne.clientWidth, h = buehne.clientHeight;
  if (!w || !h) return;
  renderer.setSize(w, h, false);
  passeKamera();
}).observe(buehne);

// ---------- Ziehen und Zoomen ----------
let drehung = 0.35, neigung = -0.62, zug = null;
buehne.addEventListener('pointerdown', e => {
  zug = { x: e.clientX, y: e.clientY, drehung, neigung };
  try { buehne.setPointerCapture(e.pointerId); } catch (err) { /* ohne Fang weiter */ }
  buehne.classList.add('zieht');
});
buehne.addEventListener('pointermove', e => {
  if (!zug) return;
  drehung = zug.drehung + (e.clientX - zug.x) * 0.008;
  neigung = Math.max(-1.5, Math.min(1.5, zug.neigung + (e.clientY - zug.y) * 0.008));
});
const ende = () => { zug = null; buehne.classList.remove('zieht'); };
buehne.addEventListener('pointerup', ende);
buehne.addEventListener('pointercancel', ende);
buehne.addEventListener('wheel', e => {
  e.preventDefault();
  zoom = Math.max(0.45, Math.min(2.2, zoom * Math.exp(e.deltaY * 0.001)));
  passeKamera();
}, { passive: false });

// ---------- Regler ----------
function zeigeRezept() {
  $('rezept').textContent =
    `Startwert ${P.start} · Symmetrie ${P.sym} · Ringe ${P.ringe} · Tiefe ${P.tiefe} · Stärke ${P.staerke} · ${MATERIAL[P.material].name}`;
}
let geplant = false;
function plane() {
  if (geplant) return; geplant = true;
  requestAnimationFrame(() => { geplant = false; baue(); });
}
for (const id of ['sym', 'ringe', 'tiefe', 'staerke']) {
  const el = $(id);
  el.addEventListener('input', () => { P[id] = +el.value; $(id + 'Aus').textContent = el.value; plane(); });
}
$('tempo').addEventListener('input', e => { P.tempo = +e.target.value; $('tempoAus').textContent = e.target.value + ' %'; });
$('start').addEventListener('change', e => {
  const v = Math.max(1, Math.min(99999, Math.round(+e.target.value) || 1));
  e.target.value = v; P.start = v; plane();
});
$('wuerfeln').addEventListener('click', () => { P.start = neuerStartwert(); $('start').value = P.start; plane(); });
$('material').addEventListener('click', e => {
  const b = e.target.closest('button[data-material]'); if (!b) return;
  P.material = b.dataset.material;
  $('material').querySelectorAll('button').forEach(x => x.setAttribute('aria-pressed', String(x === b)));
  setzeMaterial(m, P.material); zeigeRezept();
});
const laufKnopf = $('lauf');
const zeigeLauf = () => { laufKnopf.textContent = laeuft ? 'Anhalten' : 'Abspielen'; };
laufKnopf.addEventListener('click', () => { laeuft = !laeuft; zeigeLauf(); });
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
let t = 0, zuletzt = performance.now();
function bild(jetzt) {
  const dt = Math.min(0.05, (jetzt - zuletzt) / 1000); zuletzt = jetzt;
  if (laeuft) t += dt * (P.tempo / 100);
  const tiefe = P.tiefe / 100;
  for (const x of ringe) {
    x.mesh.rotation.z = t * 0.28 * x.tempo;
    x.mesh.rotation.x = Math.sin(t * 0.6 * x.wippen + x.ph) * 0.05 * (0.3 + tiefe);
  }
  halter.rotation.set(neigung, drehung, 0);
  renderer.render(szene, kamera);
  requestAnimationFrame(bild);
}

zeigeLauf();
baue();
requestAnimationFrame(bild);
