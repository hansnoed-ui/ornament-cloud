// Masterseite von the deleuzian scheme: der Kristall der Eingänge.
// Ein Brillant von oben, acht Facetten für die acht Operatoren der Phase 1. Jede Facette zeigt das Material
// schon durch ihren Begriff gelesen; die Tafel in der Mitte zeigt es, wie es ist.
// Die Facetten sind Skizzen mit Canvas 2D, nicht die Operatoren selbst. Alles bleibt im Browser.

const $ = (id) => document.getElementById(id);

// ---------- Katalog der Phase 1 ----------
const OPS = [
  { nr: 'I', jahr: 1985, href: '../kristall/', film: 'kristall', name: { de: 'Kristallbild', en: 'Crystal-image', fr: 'L’image-cristal' }, wort: { de: 'Kristall', en: 'Crystal', fr: 'Cristal' }, begriff: 'l’image-cristal' },
  { nr: 'II', jahr: 1985, href: '../schichten/', film: 'schichten', name: { de: 'Schichten der Zeit', en: 'Sheets of the past', fr: 'Les nappes de passé' }, wort: { de: 'Schichten', en: 'Sheets', fr: 'Nappes' }, begriff: 'les nappes de passé' },
  { nr: 'III', jahr: 1966, href: '../dauer/', film: 'dauer', name: { de: 'Dauer', en: 'Duration', fr: 'La durée' }, wort: { de: 'Dauer', en: 'Duration', fr: 'Durée' }, begriff: 'la durée' },
  { nr: 'IV', jahr: 1983, href: '../wahrnehmung/', film: 'wahrnehmung', name: { de: 'Wahrnehmung als Auswahl', en: 'Perception as selection', fr: 'La perception comme sélection' }, wort: { de: 'Auswahl', en: 'Selection', fr: 'Perception' }, begriff: 'la perception',
    satz: { de: 'Wahrnehmen heisst weglassen: Vom Bild bleibt, was uns angeht.', en: 'To perceive is to subtract: what remains of the image is what concerns us.', fr: 'Percevoir, c’est soustraire : de l’image ne reste que ce qui nous intéresse.' },
    quelle: 'Cinéma 1. L’image-mouvement, 1983' },
  { nr: 'V', jahr: 1981, href: '../diagramm/', film: 'diagramm', name: { de: 'Diagramm', en: 'Diagram', fr: 'Le diagramme' }, wort: { de: 'Diagramm', en: 'Diagram', fr: 'Diagramme' }, begriff: 'le diagramme',
    satz: { de: 'Zufällige Striche der Hand stören das Klischee, und aus dem Chaos taucht die Figur auf.', en: 'Chance marks of the hand disturb the cliché, and the Figure rises out of the chaos.', fr: 'Des traits au hasard de la main brouillent le cliché, et la Figure surgit du chaos.' },
    quelle: 'Francis Bacon. Logique de la sensation, 1981' },
  { nr: 'VI', jahr: 1981, href: '../figur/', film: 'figur', name: { de: 'Figur und Fläche', en: 'Figure and field', fr: 'La Figure et l’aplat' }, wort: { de: 'Figur', en: 'Figure', fr: 'Figure' }, begriff: 'la Figure et l’aplat',
    satz: { de: 'Die Figur wird isoliert, der Grund wird zur flachen, gleichmässigen Farbfläche.', en: 'The Figure is isolated; the ground becomes a flat, even field of colour.', fr: 'La Figure est isolée ; le fond devient un aplat de couleur uniforme.' },
    quelle: 'Francis Bacon. Logique de la sensation, 1981' },
  { nr: 'VII', jahr: 1980, href: '../ritornell/', film: 'ritornell', name: { de: 'Ritornell', en: 'Refrain', fr: 'La ritournelle' }, wort: { de: 'Ritornell', en: 'Refrain', fr: 'Ritournelle' }, begriff: 'la ritournelle',
    satz: { de: 'Ein kleiner Refrain zieht einen Kreis um das Ungewisse und macht daraus ein Zuhause.', en: 'A little refrain draws a circle around the uncertain and makes a home of it.', fr: 'Une petite ritournelle trace un cercle autour de l’incertain et en fait un chez-soi.' },
    quelle: 'Deleuze, Guattari, Mille plateaux, 1980' },
  { nr: 'VIII', jahr: 1988, name: { de: 'Falte', en: 'Fold', fr: 'Le pli' }, wort: { de: 'Falte', en: 'Fold', fr: 'Pli' }, begriff: 'le pli',
    satz: { de: 'Die Materie faltet sich ins Unendliche, und jede Falte birgt eine weitere.', en: 'Matter folds to infinity, and every fold holds another.', fr: 'La matière se plie à l’infini, et chaque pli en contient un autre.' },
    quelle: 'Le Pli. Leibniz et le baroque, 1988' }
];

const TEXTE = {
  de: {
    folgeTitel: 'Phase 1 · acht Begriffe',
    kristallAria: 'Kristall mit acht Facetten; jede zeigt das Bild durch einen anderen Begriff. Die Liste darunter führt zu denselben Seiten.',
    laeuft: 'läuft', dreh: 'Dreharbeiten',
    letzterLauf: 'Der letzte Besuch endete unerwartet: ', tafel: 'das Bild, wie es ist', nach: 'nach Deleuze'
  },
  en: {
    folgeTitel: 'Phase 1 · eight concepts',
    kristallAria: 'Crystal with eight facets; each shows the image through a different concept. The list below leads to the same pages.',
    laeuft: 'now showing', dreh: 'in production',
    letzterLauf: 'The last visit ended unexpectedly: ', tafel: 'the image as it is', nach: 'after Deleuze'
  },
  fr: {
    folgeTitel: 'Phase 1 · huit concepts',
    kristallAria: 'Cristal à huit facettes ; chacune montre l’image à travers un autre concept. La liste ci-dessous mène aux mêmes pages.',
    laeuft: 'à l’affiche', dreh: 'en tournage',
    letzterLauf: 'La dernière visite s’est terminée de façon inattendue : ', tafel: 'l’image telle qu’elle est', nach: 'd’après Deleuze'
  }
};

// Gemeinsamer Schlüssel mit den Operatoren, damit die Sprache mitreist
let sprache = (() => {
  try { const s = localStorage.getItem('kristall.sprache'); if (TEXTE[s]) return s; } catch {}
  const n = (navigator.language || 'de').slice(0, 2);
  return TEXTE[n] ? n : 'de';
})();

let tafelK = -1; // die offene Tafel eines kommenden Begriffs

function folgeBauen() {
  const t = TEXTE[sprache];
  $('folge').innerHTML = OPS.map((o, k) => {
    const inhalt = `<span class="tc">${o.jahr}</span><span class="wort" aria-hidden="true">${o.wort[sprache]}</span>`
      + `<span class="name">${o.nr} · ${o.name[sprache]}${sprache !== 'fr' ? `<i>${o.begriff}</i>` : ''}<span class="status">${o.href ? t.laeuft : t.dreh}</span></span>`;
    return o.href
      ? `<li id="${o.nr}" data-k="${k}"><a href="${o.href}">${inhalt}</a></li>`
      : `<li id="${o.nr}" data-k="${k}"><button type="button" class="zu" aria-controls="glosse">${inhalt}</button></li>`;
  }).join('');
  $('folge').querySelectorAll('li').forEach((li) => {
    const k = +li.dataset.k;
    li.addEventListener('pointerenter', () => { hell = k; ruhe = performance.now(); untertitelZeigen(k); });
    li.addEventListener('pointerleave', () => { hell = -1; });
    li.querySelector('a, button')?.addEventListener('focus', () => { hell = k; untertitelZeigen(k); });
    li.querySelector('button')?.addEventListener('click', () => { hell = k; ruhe = performance.now(); untertitelZeigen(k); tafelZeigen(k); });
  });
}

function uebersetzen() {
  const t = TEXTE[sprache];
  document.documentElement.lang = sprache;
  document.querySelectorAll('[data-t]').forEach((el) => { const v = t[el.dataset.t]; if (v != null) el.textContent = v; });
  document.querySelectorAll('[data-t-aria]').forEach((el) => el.setAttribute('aria-label', t[el.dataset.tAria]));
  document.querySelectorAll('[data-lang]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.lang === sprache)));
  folgeBauen();
  if (tafelK >= 0 && !$('glosse').hidden) tafelZeigen(tafelK);
}
document.querySelectorAll('[data-lang]').forEach((b) => b.addEventListener('click', () => {
  sprache = b.dataset.lang;
  try { localStorage.setItem('kristall.sprache', sprache); } catch {}
  uebersetzen();
  const g = gezeigt; gezeigt = -2; if (g >= 0) untertitelZeigen(g); // die Beschriftung gleich in der neuen Sprache
}));

// ---------- Absturzspur (Lehre aus PHORMA) ----------
const SPUR = 'start.spur';
function spur(schritt) { try { const s = JSON.parse(localStorage.getItem(SPUR) || '[]'); s.push(schritt); localStorage.setItem(SPUR, JSON.stringify(s.slice(-12))); } catch {} }
let meldungUhr = 0;
function melden(text) { const m = $('meldung'); m.textContent = text; m.hidden = false; clearTimeout(meldungUhr); meldungUhr = setTimeout(() => { m.hidden = true; }, 9000); }
$('meldung').addEventListener('click', () => { $('meldung').hidden = true; });
// Die Spur ist ein Werkzeug für uns, kein Hinweis für Gäste: sie steht in der Konsole und nur mit «?spur» auf der Seite.
// Verlassen und Wegschalten werden vermerkt, sonst hielte die Seite jeden Besuch nach einem Tippen für abgebrochen.
try {
  const s = JSON.parse(localStorage.getItem(SPUR) || '[]');
  if (s.length && !['✓ läuft', 'Start', 'Ende', 'Pause'].includes(s.at(-1))) {
    console.info('[start] Der letzte Besuch endete unerwartet:', s.join(' → '));
    if (new URLSearchParams(location.search).has('spur')) melden(TEXTE[sprache].letzterLauf + s.slice(-3).join(' → '));
  }
  localStorage.setItem(SPUR, JSON.stringify(['Start']));
} catch {}
addEventListener('pagehide', () => spur('Ende'));

uebersetzen();

// ---------- Material ----------
// Der Kristall der Eingänge läuft mit dem Beispielvideo. Eigenes Material wählt man erst auf der Seite eines Operators
// (Christian, 19.11.2026: eine eigene Wahl nur für den Vorspann verwirrt).
const video = document.createElement('video');
video.muted = true; video.loop = true; video.playsInline = true; video.setAttribute('playsinline', '');
const bild = null, spiegeln = false, fokusY = 0.36;
function beispiel() { spur('Beispiel'); video.src = '../kristall/beispiel.mp4?v=1'; video.play().catch(() => {}); }
video.addEventListener('error', () => spur('Beispielvideo fehlt'));

// ---------- Vorspanne der fertigen Operatoren ----------
// Die Facetten der laufenden Operatoren zeigen deren echten Vorspann (Christian, 20.11.2026), klein gerechnet:
// facetten/*.mp4 sind 320 × 320, aus dem jeweiligen vorspann.mp4 geschnitten (tools/facetten.sh im Deleuze-Repo).
const FILME = OPS.map((o) => {
  if (!o.film) return null;
  const v = document.createElement('video');
  v.muted = true; v.loop = true; v.playsInline = true; v.setAttribute('playsinline', ''); v.preload = 'auto';
  v.src = `facetten/${o.film}.mp4?v=2`;
  v.addEventListener('error', () => spur('Facette ' + o.nr + ' fehlt'));
  return v;
});
const filmBereit = (v) => v && v.readyState >= 2 && v.videoWidth > 0;
function filmeLaufen(an) { FILME.forEach((v) => { if (!v) return; if (an) v.play().catch(() => {}); else v.pause(); }); }

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

// Ein Vorspann füllt die Facette ganz (wie object-fit: cover), mit dem Gesicht in der Mitte
function film(v, box) {
  const [x, y, w, h] = box, s = Math.max(w, h), n = v.videoWidth;
  const sw = n * (w / s), sh = n * (h / s);
  ctx.drawImage(v, (n - sw) / 2, (n - sh) * 0.45, sw, sh, x, y, w, h);
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

// Die Montage beginnt sofort bei I: Beschriftung und rote Kante stehen vom ersten Bild an (Christian, 20.11.2026: der erste
// Eindruck war leer und sprang nach fünf Sekunden). ruhe zählt erst ab der ersten Berührung.
let hell = -1, auto = 0, ruhe = -Infinity, gezeigt = -2;
const bewegungRuhig = matchMedia('(prefers-reduced-motion: reduce)').matches;

function zeichnen(t) {
  ctx.clearRect(0, 0, S, S);
  if (!S) return;
  const aktiv = hell >= 0 ? hell : auto;
  // Solange das Video lädt, steht schon der Schliff: Kanten ohne Bild
  if (gefuellt) facetten.forEach((f, k) => {
    ctx.save(); pfad(f.poly); ctx.clip();
    if (filmBereit(FILME[k])) film(FILME[k], f.box); else MALER[k](f, t);
    // Was noch gedreht wird, liegt etwas im Schatten
    if (!OPS[k].href) { ctx.fillStyle = 'rgba(10,10,11,0.34)'; ctx.fillRect(...f.box); }
    ctx.restore();
  });
  if (gefuellt) { ctx.save(); pfad(tisch); ctx.clip(); decken(frame(0), [tisch[7][0] - 2, tisch[0][1] - 2, tisch[2][0] - tisch[7][0] + 4, tisch[4][1] - tisch[0][1] + 4]); ctx.restore(); }
  // Kanten: dünn und weiss, die gewählte Facette rot
  ctx.lineJoin = 'round';
  facetten.forEach((f, k) => { pfad(f.poly); ctx.strokeStyle = 'rgba(241,238,230,0.7)'; ctx.lineWidth = dpr; ctx.stroke(); });
  pfad(tisch); ctx.lineWidth = 1.4 * dpr; ctx.stroke();
  if (aktiv >= 0) { pfad(facetten[aktiv].poly); ctx.strokeStyle = '#d8261c'; ctx.lineWidth = 3 * dpr; ctx.stroke(); }
  // Keine Nummern in den Facetten (Christian, 19.11.2026: unnötig); die Nummer steht in der Beschriftung darunter.
}

// Die Beschriftung steht unter dem Kristall, nie auf dem Bild (Christian, 19.11.2026):
// rote Kennzeile mit Nummer, Jahr und Stand, darunter der Name; der französische Begriff blau, ausser auf Französisch.
function untertitelZeigen(k) {
  if (k === gezeigt) return; gezeigt = k;
  const el = $('untertitel');
  if (k < 0) { el.classList.remove('da'); return; }
  const o = OPS[k], t = TEXTE[sprache];
  const kennung = document.createElement('span'); kennung.className = 'zt-kennung';
  kennung.textContent = `${o.nr} · ${o.jahr} · ${o.href ? t.laeuft : t.dreh}`;
  const name = document.createElement('span'); name.className = 'u-name'; name.textContent = o.name[sprache];
  if (sprache !== 'fr') { const i = document.createElement('i'); i.textContent = o.begriff; name.append(' ', i); }
  el.replaceChildren(kennung, name); el.classList.add('da');
}

// Ein kommender Begriff öffnet seine Tafel vom rechten Rand: Begriff, ein Satz, Quelle mit Jahr (Christian, 20.11.2026).
// Der Satz ist eine Lesart in eigenen Worten, kein Zitat; darum «nach Deleuze».
function tafelZeigen(k) {
  const o = OPS[k], t = TEXTE[sprache], g = $('glosse');
  if (!o.satz) return;
  tafelK = k;
  $('tafel-kennung').textContent = `${o.nr} · ${o.jahr} · ${t.dreh}`;
  const name = document.createElement('span'); name.textContent = o.name[sprache];
  const teile = [name];
  if (sprache !== 'fr') { const i = document.createElement('i'); i.textContent = o.begriff; teile.push(i); }
  $('tafel-name').replaceChildren(...teile);
  $('tafel-satz').textContent = o.satz[sprache];
  $('tafel-quelle').textContent = `${t.nach} · ${o.quelle}`;
  const zu = g.querySelector('.glosse-zu'); if (zu) zu.setAttribute('aria-label', ({ de: 'Schliessen', en: 'Close', fr: 'Fermer' })[sprache]);
  if (g.hidden) { g.hidden = false; g.classList.remove('da'); requestAnimationFrame(() => requestAnimationFrame(() => g.classList.add('da'))); }
  else g.classList.add('da');
  spur('Tafel ' + o.nr);
}
addEventListener('keydown', (e) => { if (e.key === 'Escape' && !$('glosse').hidden) $('glosse').querySelector('.glosse-zu')?.click(); });

// ---------- Berühren ----------
function facetteUnter(e) {
  const r = lw.getBoundingClientRect(), x = (e.clientX - r.left) * dpr, y = (e.clientY - r.top) * dpr;
  return facetten.findIndex((f) => { pfad(f.poly); return ctx.isPointInPath(x, y); });
}
lw.addEventListener('pointermove', (e) => { if (e.pointerType !== 'mouse') return; const k = facetteUnter(e); hell = k; ruhe = performance.now(); untertitelZeigen(k); lw.style.cursor = k >= 0 && OPS[k].href ? 'pointer' : 'default'; });
lw.addEventListener('pointerleave', () => { hell = -1; });
lw.addEventListener('click', (e) => {
  if (video.paused && !bild) video.play().catch(() => {});
  filmeLaufen(true);
  const k = facetteUnter(e); ruhe = performance.now();
  if (k < 0) return;
  hell = k; untertitelZeigen(k);
  if (OPS[k].href) { spur('→ ' + OPS[k].nr); setTimeout(() => { location.href = OPS[k].href; }, 380); }
  else tafelZeigen(k);
});

// ---------- Lauf ----------
let sichtbar = true, letzte = 0, letzterWechsel = 0;
new IntersectionObserver((es) => { sichtbar = es[0].isIntersecting; if (sichtbar && !bild) video.play().catch(() => {}); else if (!sichtbar) video.pause(); filmeLaufen(sichtbar); }).observe(lw);
document.addEventListener('visibilitychange', () => { if (document.hidden) { video.pause(); filmeLaufen(false); spur('Pause'); } else { spur('zurück'); if (sichtbar && !bild) video.play().catch(() => {}); filmeLaufen(sichtbar); } });

function lauf(ms) {
  requestAnimationFrame(lauf);
  const t = ms / 1000;
  if (!sichtbar || document.hidden) return;
  if (!quelleBereit()) { if (!gefuellt) zeichnen(t); return; }
  if (ms - letzte < (bewegungRuhig ? 500 : 33)) return; // höchstens 30 Bilder pro Sekunde, das schont das Telefon
  letzte = ms;
  if (!gefuellt) letzterWechsel = ms; // I bleibt nach dem ersten Bild noch volle drei Sekunden
  einfangen();
  // Wer nichts berührt, sieht eine langsame Montage durch die Facetten
  if (!bewegungRuhig && hell < 0 && ms - ruhe > 5000) {
    if (ms - letzterWechsel > 3200) { auto = (auto + 1) % 8; letzterWechsel = ms; untertitelZeigen(auto); }
  } else if (hell < 0 && gezeigt >= 0) auto = gezeigt; // nach einer Berührung bleibt die letzte Beschriftung stehen
  zeichnen(t);
  if (gefuellt === 30) spur('✓ läuft');
}
groesse();
untertitelZeigen(auto); letzterWechsel = performance.now();
beispiel();
requestAnimationFrame(lauf);
