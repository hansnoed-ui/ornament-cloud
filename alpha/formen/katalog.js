// ORNAMENT FORMEN 0.1 – Katalog. Eine einzige WebGL-Fläche liegt fest über der Seite und zeichnet jede Familie in das
// Bildfeld ihrer Karte (Scissor). So bleibt es bei einem WebGL-Kontext, auch am Handy, das nur wenige erlaubt.
import { T, rngFrom, neuerStartwert, erzeugeRenderer, studio, materialien, setzeMaterial, radius, entsorge } from './gemeinsam.js?v=1';
import { ABSCHNITTE, familien } from './familien.js?v=2';

const ruhig = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
let laeuft = !ruhig;

const canvas = document.getElementById('gl');
const renderer = erzeugeRenderer(canvas);
const szene = new T.Scene();
const kamera = new T.PerspectiveCamera(30, 1, 0.1, 50);
kamera.position.set(0, 0, 3.95);
kamera.lookAt(0, 0, 0);
studio(renderer, szene);

const m = materialien();
let materialName = 'messing';
setzeMaterial(m, materialName);

// ---------- Karten ----------
const karten = [];
const abschnitteEl = document.getElementById('abschnitte');
const FAMILIEN = familien(m);

for (const ab of ABSCHNITTE) {
  const sec = document.createElement('section');
  sec.className = 'abschnitt';
  sec.innerHTML = `<div class="abschnitt-kopf"><h2>${ab.titel}</h2><p>${ab.satz}</p></div><div class="raster"></div>`;
  const raster = sec.querySelector('.raster');
  for (const fam of FAMILIEN.filter(f => f.abschnitt === ab.id)) {
    const el = document.createElement('article');
    el.className = 'karte';
    el.innerHTML = `
      <div class="ansicht" role="img" aria-label="${fam.name}, dreidimensional"></div>
      <h3>${fam.name}</h3>
      <p>${fam.text}</p>
      <div class="angabe"><b class="start"></b> · <span class="detail"></span></div>
      <div class="pillen">
        <button type="button" class="knopf klein leise neu">Neu</button>
        ${fam.uhr ? '<button type="button" class="knopf klein leise uhr" aria-pressed="false">Gemeinsame Uhr</button>' : ''}
      </div>`;
    raster.appendChild(el);
    const karte = {
      fam, el, ansicht: el.querySelector('.ansicht'), start: fam.start,
      halter: new T.Group(), drehung: fam.drehung ?? 0.3, neigung: fam.neigung ?? -0.4,
      gemeinsam: false, form: null, huelle: null, zieht: false
    };
    karte.halter.visible = false;
    szene.add(karte.halter);
    karten.push(karte);
    el.querySelector('.neu').addEventListener('click', () => { karte.start = neuerStartwert(); baue(karte); });
    const uhr = el.querySelector('.uhr');
    if (uhr) uhr.addEventListener('click', () => {
      karte.gemeinsam = !karte.gemeinsam;
      uhr.setAttribute('aria-pressed', String(karte.gemeinsam));
      baue(karte);
    });
    ziehen(karte);
  }
  abschnitteEl.appendChild(sec);
}

function baue(karte) {
  if (karte.huelle) { karte.halter.remove(karte.huelle); entsorge(karte.huelle); }
  let form;
  try { form = karte.fam.bau(rngFrom(karte.start), karte); }
  catch (e) { console.error(karte.fam.name, e); karte.el.querySelector('.detail').textContent = 'Fehler beim Erzeugen'; karte.form = null; return; }
  const huelle = new T.Group(); huelle.add(form.obj);
  huelle.scale.setScalar(1 / (form.radius || radius(huelle)));
  karte.halter.add(huelle);
  karte.huelle = huelle; karte.form = form;
  karte.el.querySelector('.start').textContent = '#' + karte.start;
  karte.el.querySelector('.detail').textContent = form.info;
}

// Ziehen dreht; am Handy nur seitlich, damit die Seite weiter scrollt
function ziehen(karte) {
  const v = karte.ansicht; let st = null;
  v.addEventListener('pointerdown', e => {
    st = { x: e.clientX, y: e.clientY, drehung: karte.drehung, neigung: karte.neigung, finger: e.pointerType === 'touch' };
    karte.zieht = true; v.classList.add('zieht');
    try { v.setPointerCapture(e.pointerId); } catch (err) { /* ohne Fang weiter */ }
  });
  v.addEventListener('pointermove', e => {
    if (!st) return;
    karte.drehung = st.drehung + (e.clientX - st.x) * 0.01;
    if (!st.finger) karte.neigung = Math.max(-1.5, Math.min(1.5, st.neigung + (e.clientY - st.y) * 0.01));
  });
  const ende = () => { st = null; karte.zieht = false; v.classList.remove('zieht'); };
  v.addEventListener('pointerup', ende);
  v.addEventListener('pointercancel', ende);
}

// ---------- Werkbank ----------
document.getElementById('material').addEventListener('click', e => {
  const b = e.target.closest('button[data-material]'); if (!b) return;
  materialName = b.dataset.material;
  document.querySelectorAll('#material button').forEach(x => x.setAttribute('aria-pressed', String(x === b)));
  setzeMaterial(m, materialName);
});
const laufKnopf = document.getElementById('lauf');
const zeigeLauf = () => { laufKnopf.textContent = laeuft ? 'Anhalten' : 'Abspielen'; };
laufKnopf.addEventListener('click', () => { laeuft = !laeuft; zeigeLauf(); });
document.getElementById('alle').addEventListener('click', () => {
  karten.forEach(k => { k.start = neuerStartwert(); baue(k); });
});

// ---------- Lauf ----------
let breite = 0, hoehe = 0;
function passeAn() {
  const w = document.documentElement.clientWidth, h = window.innerHeight;
  if (w === breite && h === hoehe) return;
  breite = w; hoehe = h; renderer.setSize(w, h, true);
}

let t = 0, zuletzt = performance.now();
function bild(jetzt) {
  const dt = Math.min(0.05, (jetzt - zuletzt) / 1000); zuletzt = jetzt;
  if (laeuft) t += dt;
  passeAn();
  renderer.setScissorTest(false); renderer.clear(); renderer.setScissorTest(true);
  for (const k of karten) {
    if (!k.form) continue;
    const rc = k.ansicht.getBoundingClientRect();
    if (rc.bottom < 0 || rc.top > hoehe || rc.right < 0 || rc.left > breite || rc.width < 2) continue;
    if (k.form.update) k.form.update(t, dt);
    if (laeuft && !k.zieht) k.drehung += dt * 0.15;
    k.halter.rotation.set(k.neigung, k.drehung, 0);
    k.halter.visible = true;
    if (k.fam.punkte) m.punkte.size = 0.011 * rc.height / hoehe;   // Punktgrösse bezieht three.js auf die ganze Fläche, nicht auf das Bildfeld
    const y = hoehe - rc.bottom;
    renderer.setViewport(rc.left, y, rc.width, rc.height);
    renderer.setScissor(rc.left, y, rc.width, rc.height);
    renderer.render(szene, kamera);
    k.halter.visible = false;
  }
  requestAnimationFrame(bild);
}

zeigeLauf();
karten.forEach(baue);
requestAnimationFrame(bild);
