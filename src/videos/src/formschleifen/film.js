// Formschleifen (27. November 2026): je Formfamilie aus ORNAMENT FORMEN ein Video von 30 s, 4:5, ohne Text, ohne Signet, als nahtlose Schleife.
// Wunsch: «mit je einer der verschiedenen formen animationen […], welche zum thema und zu ornament.cloud und der theorie passen. lose, intuitiv,
// künstlerisch und ohne texte […] 30 sekunden videos, die in sich geschlossen sind und aus sich heraus transformieren und bewegen»; Thema
// «ganz allgemein die ornamentale kunst». Plan freigegeben: 4:5, ohne Signet als reine Schleife, alle 16 in Paketen zu vier.
// Jedes Formmodul (formen/<name>.js) rechnet aus der Phase p (0 bis 1) und nicht aus der Zeit: was bei p = 0 steht, steht bei p = 1 wieder,
// darum schliesst die Schleife ohne Sprung. globalThis.film.bild(n) liefert Bild n (30 fps, 900 Bilder) als JPG, mit Vignette und Korn.
import { T, erzeugeRenderer, studio } from '/alpha/formen/gemeinsam.js?v=1';

const q = new globalThis.URLSearchParams(globalThis.location.search);
const BREITE = Number(q.get('b') || 1080), HOEHE = Number(q.get('h') || 1350), DICHTE = Number(q.get('d') || 2);
const FORM = q.get('form') || 'rosette';
export const BILDER = 900;
const GRUND = 0x151310;

const leinwand = globalThis.document.getElementById('leinwand');
const renderer = erzeugeRenderer(leinwand);
renderer.setPixelRatio(1);
renderer.setSize(BREITE * DICHTE, HOEHE * DICHTE, false);
const szene = new T.Scene();
szene.background = new T.Color(GRUND);
const kamera = new T.PerspectiveCamera(32, BREITE / HOEHE, 0.05, 80);
studio(renderer, szene);

// Materialien: Messing und Kreide wie im Katalog, je ein- und beidseitig
const stoff = (hex, metall, rauh, extra = {}) => new T.MeshStandardMaterial({ color: hex, metalness: metall, roughness: rauh, ...extra });
const mat = {
  messing: stoff(0xc8a05a, 0.9, 0.26), messing2: stoff(0x9a7639, 0.9, 0.32), perle: stoff(0xead39d, 0.9, 0.18),
  kreide: stoff(0xeeeae3, 0, 0.8), messingB: stoff(0xc8a05a, 0.9, 0.26, { side: T.DoubleSide }), kreideB: stoff(0xeeeae3, 0, 0.8, { side: T.DoubleSide }),
};

const modul = await import(`./formen/${FORM}.js`);
const form = modul.baue({ szene, kamera, mat, grund: GRUND });

// ---------- Nachbearbeitung im 2D-Bild: Vignette und Korn ----------
const klein = globalThis.document.createElement('canvas'); klein.width = BREITE; klein.height = HOEHE;
const k2 = klein.getContext('2d'); k2.imageSmoothingQuality = 'high';
const vignette = k2.createRadialGradient(BREITE / 2, HOEHE * 0.48, HOEHE * 0.28, BREITE / 2, HOEHE / 2, HOEHE * 0.78);
vignette.addColorStop(0, 'rgba(0,0,0,0)'); vignette.addColorStop(1, 'rgba(0,0,0,0.55)');
const KORN = Array.from({ length: 6 }, (_, s) => {
  const c = globalThis.document.createElement('canvas'); c.width = 540; c.height = 675;
  const g = c.getContext('2d'), bild = g.createImageData(540, 675);
  let x = 1234567 + s * 7919;
  for (let i = 0; i < bild.data.length; i += 4) { x = (x * 1103515245 + 12345) & 0x7fffffff; const v = x % 256; bild.data[i] = bild.data[i + 1] = bild.data[i + 2] = v; bild.data[i + 3] = 255; }
  g.putImageData(bild, 0, 0); return c;
});

globalThis.film = {
  BILDER,
  bild(n) {
    form.stelle((n % BILDER) / BILDER, n);
    renderer.render(szene, kamera);
    k2.globalCompositeOperation = 'source-over'; k2.globalAlpha = 1;
    k2.drawImage(leinwand, 0, 0, BREITE, HOEHE);
    k2.fillStyle = vignette; k2.fillRect(0, 0, BREITE, HOEHE);
    k2.globalCompositeOperation = 'overlay'; k2.globalAlpha = 0.06;
    k2.drawImage(KORN[n % KORN.length], 0, 0, BREITE, HOEHE);
    k2.globalCompositeOperation = 'source-over'; k2.globalAlpha = 1;
    return klein.toDataURL('image/jpeg', 0.93);
  },
};
globalThis.bereit = true;
