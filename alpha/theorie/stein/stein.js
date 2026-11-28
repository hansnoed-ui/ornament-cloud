// Theorie der Kunst · In Stein (Versuch, 28. November 2026). Ein Satz der Theorie ist in einen Marmor graviert; man liest ihn nur, wenn
// das Licht flach darüber streift. Das Licht folgt dem Finger (oder der Neigung des Telefons); ohne Eingabe wandert es langsam um den
// Stein. Bezug: Streiflicht ist das Verfahren, mit dem Archäologen verblasste Inschriften lesbar machen; Zettel 3/4 («Man kehrt
// zurück, wo man nicht fertig geworden ist»). Die Gravur wird als Höhenfeld aus der Schrift gerechnet und mit der Oberfläche des
// Scans zu einer einzigen Oberflächenkarte verbunden; Geometrie bleibt flach, darum läuft es auch am Telefon.
import * as T from 'three';

const SAETZE = [
  ['Hauptthese', 'Kunst baut Stellen, an denen Wahrnehmung different wiederkehren kann.'],
  ['3/4', 'Man kehrt zurück, wo man nicht fertig geworden ist.'],
  ['3/2', 'Ornament ist Wiederholung, die sich nicht ganz wiederholt.'],
  ['4/1', 'Im Raum verlassen die Dinge ihre Stelle. In der Zeit verlässt die Stelle ihre Dinge.'],
  ['3/7', 'Im Rapport kehrt eine Figur wieder, in der gotischen Linie eine Art, sich zu bewegen.'],
  ['4/8', 'Der Sand liegt, wo nichts schwingt. Die Mitte ist, wo keiner hintritt.'],
  ['7/1', 'Material ist, was Widerstand leistet. Was nachgibt, ist Vorrat.'],
];
const $ = id => document.getElementById(id);
const ruhig = matchMedia('(prefers-reduced-motion: reduce)').matches;
let nr = 0;
function zeigeText() { $('zn').textContent = SAETZE[nr][0]; $('satz').textContent = SAETZE[nr][1]; }
zeigeText();

const lade = (url) => new Promise((ok, nein) => { const b = new Image(); b.onload = () => ok(b); b.onerror = nein; b.src = url; });
const cv = $('stein');
let renderer;
try { renderer = new T.WebGLRenderer({ canvas: cv, antialias: true, powerPreference: 'low-power' }); } catch { renderer = null; }
if (!renderer) document.body.classList.add('ohne');
else start().catch(() => document.body.classList.add('ohne'));

async function start() {
  cv.addEventListener('webglcontextlost', (e) => { e.preventDefault(); document.body.classList.add('ohne'); });
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 2));
  renderer.toneMapping = T.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.1;
  renderer.outputColorSpace = T.SRGBColorSpace;
  const [farbe, normalBild] = await Promise.all([lade('stoff/farbe.jpg'), lade('stoff/normal.jpg')]);
  const szene = new T.Scene(), kamera = new T.OrthographicCamera(-1, 1, 1, -1, 0.1, 10); kamera.position.z = 5;
  // Farbe und Oberflächenkarte werden auf das Format des Bildschirms zugeschnitten (wie ein Steinschnitt, nicht gestreckt);
  // in die Oberflächenkarte kommt zusätzlich die Gravur aus der Schrift
  const NW = 1024; let NH = 1024;
  const fc = document.createElement('canvas'), fg = fc.getContext('2d');
  const nc = document.createElement('canvas'), ng = nc.getContext('2d', { willReadFrequently: true });
  const hoehe = document.createElement('canvas'), hg = hoehe.getContext('2d', { willReadFrequently: true });
  let scan = null;
  const farbTex = new T.CanvasTexture(fc); farbTex.colorSpace = T.SRGBColorSpace;
  const normalTex = new T.CanvasTexture(nc); normalTex.colorSpace = T.NoColorSpace;
  function zuschneiden() {
    const a = cv.clientHeight / cv.clientWidth; NH = Math.min(2048, Math.round(NW * a));
    for (const c of [fc, nc, hoehe]) { c.width = NW; c.height = NH; }
    const sw = farbe.width * Math.min(1, NW / NH), sh = farbe.height * Math.min(1, NH / NW), sx = (farbe.width - sw) / 2, sy = (farbe.height - sh) / 2;
    fg.drawImage(farbe, sx, sy, sw, sh, 0, 0, NW, NH);
    ng.drawImage(normalBild, sx, sy, sw, sh, 0, 0, NW, NH);
    scan = ng.getImageData(0, 0, NW, NH);
    farbTex.dispose(); normalTex.dispose(); farbTex.image = fc; normalTex.image = nc; farbTex.needsUpdate = true;
  }
  const stoff = new T.MeshStandardMaterial({ map: farbTex, normalMap: normalTex, normalScale: new T.Vector2(1.6, 1.6), roughness: 0.72, metalness: 0 });
  const platte = new T.Mesh(new T.PlaneGeometry(2, 2), stoff); szene.add(platte);
  const licht = new T.DirectionalLight(0xffe6c4, 3.2); szene.add(licht);
  szene.add(new T.AmbientLight(0x8090a8, 0.18));

  function graviere() {
    // Schrift auf die Fläche setzen, so gross wie sie passt; schmale Bildschirme bekommen mehr Zeilen
    const satz = SAETZE[nr][1];
    hg.fillStyle = '#000'; hg.fillRect(0, 0, NW, NH);
    hg.fillStyle = '#fff'; hg.textAlign = 'center'; hg.textBaseline = 'middle';
    const breite = NW * 0.8;
    let gr = 120, zeilen = [];
    for (; gr > 30; gr -= 4) {
      hg.font = `600 ${gr}px "Hanken Grotesk", system-ui, sans-serif`;
      zeilen = []; let z = '';
      for (const w of satz.split(' ')) { const t = z ? z + ' ' + w : w; if (hg.measureText(t).width > breite && z) { zeilen.push(z); z = w; } else z = t; }
      zeilen.push(z);
      if (zeilen.length * gr * 1.12 < Math.min(NH * 0.4, NW * 0.62)) break;
    }
    zeilen.forEach((z, i) => hg.fillText(z, NW / 2, NH * 0.47 + (i - (zeilen.length - 1) / 2) * gr * 1.12));
    // weiche Kante: eine gravierte Kerbe ist nicht senkrecht
    hg.filter = 'blur(2.2px)'; hg.drawImage(hoehe, 0, 0); hg.filter = 'none';
    const h = hg.getImageData(0, 0, NW, NH).data, out = ng.createImageData(NW, NH), s = scan.data, o = out.data, k = 3.2;
    for (let y = 0; y < NH; y++) for (let x = 0; x < NW; x++) {
      const i = (y * NW + x) * 4, xl = Math.max(0, x - 1), xr = Math.min(NW - 1, x + 1), yu = Math.max(0, y - 1), yd = Math.min(NH - 1, y + 1);
      const dx = (h[(y * NW + xr) * 4] - h[(y * NW + xl) * 4]) / 255, dy = (h[(yd * NW + x) * 4] - h[(yu * NW + x) * 4]) / 255;
      // Kerbe: nach innen geneigt; der Scan liefert die Oberfläche (beides als Steigung addiert)
      let nx = (s[i] / 255 * 2 - 1) + k * dx, ny = (s[i + 1] / 255 * 2 - 1) - k * dy, nz = s[i + 2] / 255 * 2 - 1;
      const l = Math.hypot(nx, ny, nz) || 1; nx /= l; ny /= l; nz /= l;
      const tief = h[i] / 255;
      o[i] = (nx * 0.5 + 0.5) * 255; o[i + 1] = (ny * 0.5 + 0.5) * 255; o[i + 2] = (nz * 0.5 + 0.5) * 255 * (1 - 0.25 * tief); o[i + 3] = 255;
    }
    ng.putImageData(out, 0, 0); normalTex.needsUpdate = true;
  }

  function groesse() {
    const w = cv.clientWidth, h = cv.clientHeight; renderer.setSize(w, h, false);
    zuschneiden(); graviere();
  }
  addEventListener('resize', groesse); await document.fonts.ready; groesse();

  // Licht führen: Finger, Maus oder Neigung; sonst wandert es langsam
  let ziel = null, letzte = 0;
  const setze = (x, y) => { ziel = [x * 2 - 1, -(y * 2 - 1)]; letzte = performance.now(); $('hinweis').style.opacity = 0; };
  cv.addEventListener('pointermove', e => setze(e.clientX / cv.clientWidth, e.clientY / cv.clientHeight));
  cv.addEventListener('pointerdown', e => setze(e.clientX / cv.clientWidth, e.clientY / cv.clientHeight));
  addEventListener('deviceorientation', e => { if (e.gamma == null) return; setze(0.5 + e.gamma / 60, 0.5 + (e.beta - 40) / 60); });
  let tipp = null;
  cv.addEventListener('pointerdown', e => { tipp = [e.clientX, e.clientY, performance.now()]; });
  cv.addEventListener('pointerup', e => { if (tipp && Math.hypot(e.clientX - tipp[0], e.clientY - tipp[1]) < 8 && performance.now() - tipp[2] < 300) { nr = (nr + 1) % SAETZE.length; zeigeText(); graviere(); } tipp = null; });

  const jetzt = new T.Vector2(0.7, 0.2);
  function bild(t) {
    if (!ziel || t - letzte > 6000) { const w = ruhig ? 0.7 : t * 0.00018; ziel = null; jetzt.lerp(new T.Vector2(Math.cos(w), Math.sin(w) * 0.8), 0.02); }
    else jetzt.lerp(new T.Vector2(ziel[0], ziel[1]), 0.12);
    // Licht kommt von der Seite, auf die der Finger zeigt, und immer flach: je weiter aussen, desto flacher
    const r = Math.min(1, jetzt.length()), hoeheL = 0.55 - 0.47 * r;
    licht.position.set(jetzt.x, jetzt.y, Math.max(0.06, hoeheL) * 1.4).normalize();
    renderer.render(szene, kamera);
    requestAnimationFrame(bild);
  }
  requestAnimationFrame(bild);
}
