// Masterseite von the deleuzian scheme: der Kristall der Eingänge.
// Ein Brillant von oben, acht Facetten für die acht Operatoren der Phase 1. Jede Facette zeigt das Material
// schon durch ihren Begriff gelesen; die Tafel in der Mitte zeigt es, wie es ist.
// Die Facetten sind Skizzen mit Canvas 2D, nicht die Operatoren selbst. Alles bleibt im Browser.

const $ = (id) => document.getElementById(id);

// ---------- Katalog der Phase 1 ----------
const OPS = [
  { nr: 'I', jahr: 1985, href: '../kristall/', name: { de: 'Kristallbild', en: 'Crystal-image', fr: 'L’image-cristal' }, wort: { de: 'Kristall', en: 'Crystal', fr: 'Cristal' }, begriff: 'l’image-cristal' },
  { nr: 'II', jahr: 1985, name: { de: 'Schichten der Zeit', en: 'Sheets of the past', fr: 'Les nappes de passé' }, wort: { de: 'Schichten', en: 'Sheets', fr: 'Nappes' }, begriff: 'les nappes de passé' },
  { nr: 'III', jahr: 1966, name: { de: 'Dauer', en: 'Duration', fr: 'La durée' }, wort: { de: 'Dauer', en: 'Duration', fr: 'Durée' }, begriff: 'la durée' },
  { nr: 'IV', jahr: 1983, name: { de: 'Wahrnehmung als Auswahl', en: 'Perception as selection', fr: 'La perception comme sélection' }, wort: { de: 'Auswahl', en: 'Selection', fr: 'Perception' }, begriff: 'la perception' },
  { nr: 'V', jahr: 1981, name: { de: 'Diagramm', en: 'Diagram', fr: 'Le diagramme' }, wort: { de: 'Diagramm', en: 'Diagram', fr: 'Diagramme' }, begriff: 'le diagramme' },
  { nr: 'VI', jahr: 1981, name: { de: 'Figur und Fläche', en: 'Figure and field', fr: 'La Figure et l’aplat' }, wort: { de: 'Figur', en: 'Figure', fr: 'Figure' }, begriff: 'la Figure et l’aplat' },
  { nr: 'VII', jahr: 1980, name: { de: 'Ritornell', en: 'Refrain', fr: 'La ritournelle' }, wort: { de: 'Ritornell', en: 'Refrain', fr: 'Ritournelle' }, begriff: 'la ritournelle' },
  { nr: 'VIII', jahr: 1988, name: { de: 'Falte', en: 'Fold', fr: 'Le pli' }, wort: { de: 'Falte', en: 'Fold', fr: 'Pli' }, begriff: 'le pli' }
];

const TEXTE = {
  de: {
    leitsatz: 'Begriffe als Verfahren, angewendet auf dein eigenes Material.', material: 'Material', kamera: 'Kamera', datei: 'Foto oder Video', beispiel: 'Beispiel',
    hinweis: 'Alles bleibt auf deinem Gerät.', folgeTitel: 'Phase 1 · acht Begriffe', fussnote: 'Die Jahreszahl nennt die Quelle, wie die datierten Plateaus in «Mille plateaux».',
    kristallAria: 'Kristall mit acht Facetten; jede zeigt dein Material durch einen anderen Begriff. Die Liste darunter führt zu denselben Seiten.',
    laeuft: 'läuft', dreh: 'in Dreharbeiten', keineKamera: 'Die Kamera lässt sich nicht öffnen. Wähle ein Foto, ein Video oder das Beispiel.',
    keinBeispiel: 'Das Beispielvideo lädt nicht. Wähle ein Foto, ein Video oder die Kamera.', letzterLauf: 'Der letzte Besuch endete unerwartet: ', tafel: 'dein Material, wie es ist'
  },
  en: {
    leitsatz: 'Concepts as procedures, applied to your own material.', material: 'Material', kamera: 'Camera', datei: 'Photo or video', beispiel: 'Example',
    hinweis: 'Everything stays on your device.', folgeTitel: 'Phase 1 · eight concepts', fussnote: 'The year names the source, like the dated plateaus of “A Thousand Plateaus”.',
    kristallAria: 'Crystal with eight facets; each shows your material through a different concept. The list below leads to the same pages.',
    laeuft: 'now showing', dreh: 'in production', keineKamera: 'The camera cannot be opened. Choose a photo, a video or the example.',
    keinBeispiel: 'The example video does not load. Choose a photo, a video or the camera.', letzterLauf: 'The last visit ended unexpectedly: ', tafel: 'your material as it is'
  },
  fr: {
    leitsatz: 'Des concepts comme procédés, appliqués à ton propre matériau.', material: 'Matériau', kamera: 'Caméra', datei: 'Photo ou vidéo', beispiel: 'Exemple',
    hinweis: 'Tout reste sur ton appareil.', folgeTitel: 'Phase 1 · huit concepts', fussnote: 'L’année nomme la source, comme les plateaux datés de «Mille plateaux».',
    kristallAria: 'Cristal à huit facettes ; chacune montre ton matériau à travers un autre concept. La liste ci-dessous mène aux mêmes pages.',
    laeuft: 'à l’affiche', dreh: 'en tournage', keineKamera: 'La caméra ne s’ouvre pas. Choisis une photo, une vidéo ou l’exemple.',
    keinBeispiel: 'La vidéo d’exemple ne se charge pas. Choisis une photo, une vidéo ou la caméra.', letzterLauf: 'La dernière visite s’est terminée de façon inattendue : ', tafel: 'ton matériau tel qu’il est'
  }
};

// Gemeinsamer Schlüssel mit den Operatoren, damit die Sprache mitreist
let sprache = (() => {
  try { const s = localStorage.getItem('kristall.sprache'); if (TEXTE[s]) return s; } catch {}
  const n = (navigator.language || 'de').slice(0, 2);
  return TEXTE[n] ? n : 'de';
})();

function folgeBauen() {
  const t = TEXTE[sprache];
  $('folge').innerHTML = OPS.map((o, k) => {
    const inhalt = `<span class="tc">${o.jahr}</span><span class="wort" aria-hidden="true">${o.wort[sprache]}</span>`
      + `<span class="name">${o.nr} · ${o.name[sprache]}${sprache !== 'fr' ? `<i>${o.begriff}</i>` : ''}<span class="status">${o.href ? t.laeuft : t.dreh}</span></span>`;
    return o.href
      ? `<li id="${o.nr}" data-k="${k}"><a href="${o.href}">${inhalt}</a></li>`
      : `<li id="${o.nr}" data-k="${k}"><div class="zu" aria-disabled="true">${inhalt}</div></li>`;
  }).join('');
  $('folge').querySelectorAll('li').forEach((li) => {
    const k = +li.dataset.k;
    li.addEventListener('pointerenter', () => { hell = k; ruhe = performance.now(); untertitelZeigen(k); });
    li.addEventListener('pointerleave', () => { hell = -1; });
    li.querySelector('a')?.addEventListener('focus', () => { hell = k; untertitelZeigen(k); });
  });
}

function uebersetzen() {
  const t = TEXTE[sprache];
  document.documentElement.lang = sprache;
  document.querySelectorAll('[data-t]').forEach((el) => { const v = t[el.dataset.t]; if (v != null) el.textContent = v; });
  document.querySelectorAll('[data-t-aria]').forEach((el) => el.setAttribute('aria-label', t[el.dataset.tAria]));
  document.querySelectorAll('[data-lang]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.lang === sprache)));
  folgeBauen();
}
document.querySelectorAll('[data-lang]').forEach((b) => b.addEventListener('click', () => {
  sprache = b.dataset.lang;
  try { localStorage.setItem('kristall.sprache', sprache); } catch {}
  uebersetzen();
}));

// ---------- Absturzspur (Lehre aus PHORMA) ----------
const SPUR = 'start.spur';
function spur(schritt) { try { const s = JSON.parse(localStorage.getItem(SPUR) || '[]'); s.push(schritt); localStorage.setItem(SPUR, JSON.stringify(s.slice(-12))); } catch {} }
let meldungUhr = 0;
function melden(text) { const m = $('meldung'); m.textContent = text; m.hidden = false; clearTimeout(meldungUhr); meldungUhr = setTimeout(() => { m.hidden = true; }, 9000); }
$('meldung').addEventListener('click', () => { $('meldung').hidden = true; });
try {
  const s = JSON.parse(localStorage.getItem(SPUR) || '[]');
  if (s.length && s.at(-1) !== '✓ läuft' && s.at(-1) !== 'Start') melden(TEXTE[sprache].letzterLauf + s.slice(-3).join(' → '));
  localStorage.setItem(SPUR, JSON.stringify(['Start']));
} catch {}

uebersetzen();

// ---------- Material ----------
// Quelle ist ein Video (Beispiel, Datei, Kamera) oder ein Bild. Alles wird quadratisch ins Gedächtnis geschnitten.
const video = document.createElement('video');
video.muted = true; video.loop = true; video.playsInline = true; video.setAttribute('playsinline', '');
let bild = null, strom = null, dateiUrl = '', spiegeln = false, fokusY = 0.4;

function wahlZeigen(id) { ['m-kamera', 'm-datei', 'm-beispiel'].forEach((x) => $(x).setAttribute('aria-pressed', String(x === id))); }
function stromStoppen() { if (strom) { strom.getTracks().forEach((t) => t.stop()); strom = null; } video.srcObject = null; }
function urlFreigeben() { if (dateiUrl) { URL.revokeObjectURL(dateiUrl); dateiUrl = ''; } }

function beispiel() {
  spur('Beispiel'); stromStoppen(); urlFreigeben(); bild = null; spiegeln = false; fokusY = 0.36;
  video.src = '../kristall/beispiel.mp4?v=1';
  video.play().catch(() => {});
  wahlZeigen('m-beispiel');
}
video.addEventListener('error', () => { if (video.src.includes('beispiel')) { spur('Beispielvideo fehlt'); melden(TEXTE[sprache].keinBeispiel); } });

$('m-beispiel').addEventListener('click', beispiel);
$('m-kamera').addEventListener('click', async () => {
  spur('Kamera');
  try {
    const s = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 640 } }, audio: false });
    stromStoppen(); urlFreigeben(); bild = null; strom = s; spiegeln = true; fokusY = 0.5;
    video.removeAttribute('src'); video.srcObject = s; await video.play();
    wahlZeigen('m-kamera');
  } catch { spur('Kamera abgelehnt'); melden(TEXTE[sprache].keineKamera); }
});
$('datei').addEventListener('change', async (e) => {
  const f = e.target.files[0]; e.target.value = ''; if (!f) return;
  spur('Datei ' + f.type);
  if (f.type.startsWith('image/')) {
    try {
      const roh = await createImageBitmap(f);
      // Telefonregel: verkleinern, bevor etwas anderes geschieht. Für die Facetten genügen 800 Punkte.
      const s = Math.min(1, 800 / Math.max(roh.width, roh.height));
      const neu = s < 1 ? await createImageBitmap(f, { resizeWidth: Math.round(roh.width * s), resizeHeight: Math.round(roh.height * s), resizeQuality: 'high' }) : roh;
      if (neu !== roh) roh.close();
      stromStoppen(); urlFreigeben(); video.pause(); video.removeAttribute('src');
      if (bild && bild.close) bild.close();
      bild = neu; spiegeln = false; fokusY = 0.4;
      wahlZeigen('m-datei');
    } catch { spur('Bild unlesbar'); }
  } else {
    stromStoppen(); urlFreigeben(); bild = null; spiegeln = false; fokusY = 0.4;
    dateiUrl = URL.createObjectURL(f); video.src = dateiUrl; video.play().catch(() => {});
    wahlZeigen('m-datei');
  }
});

// ---------- Gedächtnis: die letzten Bilder, quadratisch und klein ----------
const SEITE = 220, TIEFE = 48;
const ring = Array.from({ length: TIEFE }, () => { const c = document.createElement('canvas'); c.width = c.height = SEITE; return c; });
let kopf = -1, gefuellt = 0;
const dauer = document.createElement('canvas'); dauer.width = dauer.height = SEITE;
const dctx = dauer.getContext('2d');

function quelleBereit() { return bild || (video.readyState >= 2 && video.videoWidth > 0); }
function einfangen() {
  const q = bild || video;
  const w = bild ? bild.width : video.videoWidth, h = bild ? bild.height : video.videoHeight;
  const s = Math.min(w, h), sx = (w - s) / 2, sy = Math.max(0, Math.min(h - s, h * fokusY - s / 2));
  kopf = (kopf + 1) % TIEFE; gefuellt = Math.min(TIEFE, gefuellt + 1);
  const c = ring[kopf].getContext('2d');
  c.save(); if (spiegeln) { c.translate(SEITE, 0); c.scale(-1, 1); }
  c.drawImage(q, sx, sy, s, s, 0, 0, SEITE, SEITE); c.restore();
  dctx.globalAlpha = gefuellt < 3 ? 1 : 0.06; dctx.drawImage(ring[kopf], 0, 0); dctx.globalAlpha = 1;
}
const frame = (alter) => ring[(kopf - Math.min(alter, gefuellt - 1) + TIEFE * 2) % TIEFE];

// ---------- Kristall ----------
const lw = $('kristall'), ctx = lw.getContext('2d');
let S = 0, dpr = 1, facetten = [], tisch = [];
function groesse() {
  dpr = Math.min(devicePixelRatio || 1, 2);
  const css = lw.getBoundingClientRect().width;
  S = Math.round(css * dpr); lw.width = lw.height = S;
  const c = S / 2, R = S * 0.485, r = S * 0.215;
  const P = (rad, k) => { const a = -Math.PI / 2 - Math.PI / 8 + k * Math.PI / 4; return [c + rad * Math.cos(a), c + rad * Math.sin(a)]; };
  tisch = [...Array(8)].map((_, k) => P(r, k));
  facetten = [...Array(8)].map((_, k) => {
    const poly = [P(r, k), P(r, k + 1), P(R, k + 1), P(R, k)];
    const xs = poly.map((p) => p[0]), ys = poly.map((p) => p[1]);
    const box = [Math.min(...xs), Math.min(...ys), Math.max(...xs) - Math.min(...xs), Math.max(...ys) - Math.min(...ys)];
    const mitte = poly.reduce((s, p) => [s[0] + p[0] / 4, s[1] + p[1] / 4], [0, 0]);
    return { poly, box, mitte };
  });
}
new ResizeObserver(groesse).observe(lw);

function pfad(poly) { ctx.beginPath(); poly.forEach((p, i) => (i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1]))); ctx.closePath(); }
// zeichnet ein Gedächtnisbild so, als bedecke es das ganze Quadrat, aber nur im Ausschnitt box
function decken(q, box, filter = 'none') {
  const k = SEITE / S, [x, y, w, h] = box;
  ctx.filter = filter;
  ctx.drawImage(q, x * k, y * k, w * k, h * k, x, y, w, h);
  ctx.filter = 'none';
}

const MALER = [
  // I Kristallbild: Gegenwart und eine Sekunde Vergangenheit im selben Stein
  (f, t) => { decken(frame(30), f.box, 'brightness(1.15) contrast(1.1)'); ctx.globalAlpha = 0.5; decken(frame(0), f.box); ctx.globalAlpha = 1; },
  // II Schichten der Zeit: jeder Streifen aus einer anderen Vergangenheit
  (f) => { const [x, y, w, h] = f.box, n = 9; for (let j = 0; j < n; j++) decken(frame(j * 5), [x + (w * j) / n, y, w / n + 1, h]); },
  // III Dauer: was andauert, verdichtet sich
  (f) => decken(dauer, f.box, 'contrast(1.15) saturate(1.2)'),
  // IV Wahrnehmung als Auswahl: nur was interessiert, bleibt farbig
  (f, t) => {
    decken(frame(0), f.box, 'grayscale(1) brightness(0.55)');
    const [mx, my] = f.mitte, rr = Math.min(f.box[2], f.box[3]) * (0.32 + 0.06 * Math.sin(t * 1.3));
    ctx.save(); ctx.beginPath(); ctx.arc(mx, my, rr, 0, 7); ctx.clip(); decken(frame(0), f.box, 'saturate(1.3)'); ctx.restore();
  },
  // V Diagramm: die Hand stört das Bild in Bändern
  (f, t) => {
    const [x, y, w, h] = f.box, n = 12, k = SEITE / S, q = frame(0);
    for (let j = 0; j < n; j++) {
      const yy = y + (h * j) / n, dx = Math.sin(t * 1.7 + j * 1.9) * Math.sin(t * 0.6 + j) * w * 0.12;
      ctx.drawImage(q, (x - dx) * k, yy * k, w * k, (h / n + 1) * k, x, yy, w, h / n + 1);
    }
  },
  // VI Figur und Fläche: die Figur bleibt, der Grund wird Farbfläche
  (f) => {
    decken(frame(0), f.box, 'grayscale(1) contrast(3.4) brightness(1.15)');
    ctx.globalCompositeOperation = 'multiply'; ctx.fillStyle = '#d8261c'; ctx.fillRect(...f.box); ctx.globalCompositeOperation = 'source-over';
  },
  // VII Ritornell: der Refrain, jedes Mal ein wenig später
  (f) => {
    const [x, y, w, h] = f.box, n = 3, tw = w / n, th = h / n;
    for (let a = 0; a < n; a++) for (let b = 0; b < n; b++) ctx.drawImage(frame((a * n + b) * 4), x + a * tw, y + b * th, tw + 1, th + 1);
  },
  // VIII Falte: das Bild faltet sich um seine Mitte
  (f) => {
    const [mx] = f.mitte; ctx.save(); ctx.translate(mx * 2, 0); ctx.scale(-1, 1);
    const box = [2 * mx - f.box[0] - f.box[2], f.box[1], f.box[2], f.box[3]];
    decken(frame(0), box, 'brightness(0.85) sepia(0.25)'); ctx.restore();
  }
];

let hell = -1, auto = -1, ruhe = 0, gezeigt = -2;
const bewegungRuhig = matchMedia('(prefers-reduced-motion: reduce)').matches;

function zeichnen(t) {
  ctx.clearRect(0, 0, S, S);
  if (!S || !gefuellt) return;
  const aktiv = hell >= 0 ? hell : auto;
  facetten.forEach((f, k) => {
    ctx.save(); pfad(f.poly); ctx.clip();
    MALER[k](f, t);
    if (!OPS[k].href) { ctx.fillStyle = 'rgba(10,10,11,0.18)'; ctx.fillRect(...f.box); }
    ctx.restore();
  });
  ctx.save(); pfad(tisch); ctx.clip(); decken(frame(0), [tisch[7][0] - 2, tisch[0][1] - 2, tisch[2][0] - tisch[7][0] + 4, tisch[4][1] - tisch[0][1] + 4]); ctx.restore();
  // Kanten: dünn und weiss, die gewählte Facette rot
  ctx.lineJoin = 'round';
  facetten.forEach((f, k) => { pfad(f.poly); ctx.strokeStyle = 'rgba(241,238,230,0.7)'; ctx.lineWidth = dpr; ctx.stroke(); });
  pfad(tisch); ctx.lineWidth = 1.4 * dpr; ctx.stroke();
  if (aktiv >= 0) { pfad(facetten[aktiv].poly); ctx.strokeStyle = '#d8261c'; ctx.lineWidth = 3 * dpr; ctx.stroke(); }
  // Nummern wie Zeitcodes
  ctx.font = `500 ${Math.round(11 * dpr)}px "Barlow Condensed", sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  facetten.forEach((f, k) => {
    ctx.lineWidth = 3 * dpr; ctx.strokeStyle = 'rgba(10,10,11,0.85)'; ctx.strokeText(OPS[k].nr, f.mitte[0], f.mitte[1]);
    ctx.fillStyle = k === aktiv ? '#d8261c' : '#f1eee6'; ctx.fillText(OPS[k].nr, f.mitte[0], f.mitte[1]);
  });
}

function untertitelZeigen(k) {
  if (k === gezeigt) return; gezeigt = k;
  const el = $('untertitel');
  if (k < 0) { el.classList.remove('da'); return; }
  const o = OPS[k], t = TEXTE[sprache];
  el.innerHTML = '';
  const a = document.createElement('span'); a.textContent = `${o.nr} · ${o.name[sprache]}${o.href ? '' : ' · ' + t.dreh}`;
  const b = document.createElement('em'); b.textContent = o.begriff;
  el.append(a, b); el.classList.add('da');
}

// ---------- Berühren ----------
function facetteUnter(e) {
  const r = lw.getBoundingClientRect(), x = (e.clientX - r.left) * dpr, y = (e.clientY - r.top) * dpr;
  return facetten.findIndex((f) => { pfad(f.poly); return ctx.isPointInPath(x, y); });
}
lw.addEventListener('pointermove', (e) => { if (e.pointerType !== 'mouse') return; const k = facetteUnter(e); hell = k; ruhe = performance.now(); untertitelZeigen(k); lw.style.cursor = k >= 0 && OPS[k].href ? 'pointer' : 'default'; });
lw.addEventListener('pointerleave', () => { hell = -1; });
lw.addEventListener('click', (e) => {
  if (video.paused && !bild) video.play().catch(() => {});
  const k = facetteUnter(e); ruhe = performance.now();
  if (k < 0) return;
  hell = k; untertitelZeigen(k);
  if (OPS[k].href) { spur('→ ' + OPS[k].nr); setTimeout(() => { location.href = OPS[k].href; }, 380); }
  else document.getElementById(OPS[k].nr)?.scrollIntoView({ behavior: bewegungRuhig ? 'auto' : 'smooth', block: 'center' });
});

// ---------- Lauf ----------
let sichtbar = true, letzte = 0, letzterWechsel = 0;
new IntersectionObserver((es) => { sichtbar = es[0].isIntersecting; if (sichtbar && !bild) video.play().catch(() => {}); else if (!sichtbar) video.pause(); }).observe(lw);
document.addEventListener('visibilitychange', () => { if (document.hidden) video.pause(); else if (sichtbar && !bild) video.play().catch(() => {}); });

function lauf(ms) {
  requestAnimationFrame(lauf);
  const t = ms / 1000;
  if (!sichtbar || document.hidden || !quelleBereit()) return;
  if (ms - letzte < (bewegungRuhig ? 500 : 33)) return; // höchstens 30 Bilder pro Sekunde, das schont das Telefon
  letzte = ms;
  einfangen();
  // Wer nichts berührt, sieht eine langsame Montage durch die Facetten
  if (!bewegungRuhig && hell < 0 && ms - ruhe > 5000) {
    if (ms - letzterWechsel > 3200) { auto = (auto + 1) % 8; letzterWechsel = ms; untertitelZeigen(auto); }
  } else if (hell < 0 && ms - ruhe <= 5000 && auto >= 0) { auto = -1; untertitelZeigen(-1); }
  zeichnen(t);
  if (gefuellt === 30) spur('✓ läuft');
}
groesse();
beispiel();
requestAnimationFrame(lauf);
