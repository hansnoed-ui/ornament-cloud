// ORNAMENT FORMEN 0.1 – Sehrinde (27. November 2026). Versuch zu docs/formen-konzept.md, Stufe 3, Ansicht «Sehrinde»:
// dieselbe Form im Gesichtsfeld und in der Karte der Sehrinde. Die Karte ist stark vereinfacht log-polar gerechnet (Schwartz 1977):
// waagrecht der Winkel, senkrecht der Logarithmus des Abstands von der Mitte. Kreise, Strahlen und logarithmische Spiralen im
// Gesichtsfeld werden dort zu geraden Streifen; umgekehrt werden Streifen und Waben auf der Rinde im Gesichtsfeld zu Tunnel, Strahlen,
// Spirale und Gitter (Formkonstanten nach Klüver; Erklärung nach Ermentrout und Cowan 1979). Alles in Canvas 2D, ohne WebGL.
const TAU = Math.PI * 2, GOLD = 180 * (3 - Math.sqrt(5));   // 137,5077…°
const RMIN = 0.03, LOG = -Math.log(RMIN);                   // innerster Abstand der Karte und ihre Höhe in Logarithmen
const FARBE = { grund: '#151412', a: '#c8a05a', b: '#8e6c34', hell: '#f6ecd0', leise: 'rgba(244,241,234,.16)' };

const $ = id => document.getElementById(id);
const auge = $('auge'), rinde = $('rinde'), ca = auge.getContext('2d'), cr = rinde.getContext('2d');
const z = { winkel: GOLD, kerne: 900, wachstum: 'scheibe', familie: 0, richtung: 'auge', muster: 'quer',
  laeuft: !window.matchMedia('(prefers-reduced-motion: reduce)').matches, t: 0 };

// ---------- Grösse ----------
function passeAn(c) {
  const d = Math.min(window.devicePixelRatio || 1, 2), w = Math.round(c.clientWidth * d), h = Math.round(c.clientHeight * d);
  if (w && h && (c.width !== w || c.height !== h)) { c.width = w; c.height = h; }
}

// ---------- Vom Auge zur Rinde: Kerne ----------
/** Kern mit Alter n (0 = eben entstanden): Abstand von der Mitte 0–1, Winkel, Grösse im Verhältnis zum Abstand */
function kern(n, N, phi) {
  if (z.wachstum === 'scheibe') { const r = Math.sqrt(n / N); return { r, th: n * phi, rel: 0.5 / Math.sqrt(Math.max(n, 0.5)) }; }
  const b = LOG / N;                                         // Schnecke, Zapfen: jeder Kern um denselben Faktor weiter aussen
  return { r: Math.exp(-b * (N - n)), th: n * phi, rel: 0.62 * Math.sqrt(2 * b) };
}
function zeichneKerne() {
  const N = z.kerne, phi = z.winkel * Math.PI / 180, lauf = z.t * 6, fr = lauf - Math.floor(lauf), nr = Math.floor(lauf);
  const W = auge.width, H = auge.height, R = Math.min(W, H) * 0.47, cx = W / 2, cy = H / 2;
  const RW = rinde.width, RH = rinde.height, rand = RH * 0.06;
  ca.fillStyle = FARBE.grund; ca.fillRect(0, 0, W, H);
  cr.fillStyle = FARBE.grund; cr.fillRect(0, 0, RW, RH);
  for (let j = 0; j < N; j++) {
    const n = j + fr, k = nr - j, { r, th, rel } = kern(n, N, phi);
    const hervor = z.familie && ((k % z.familie) + z.familie) % z.familie === 0;
    const farbe = hervor ? FARBE.hell : (((k % 2) + 2) % 2 ? FARBE.a : FARBE.b);
    const ein = Math.min(1, n / 4) * Math.min(1, (N - n) / 6);  // entsteht in der Mitte, vergeht am Rand
    // Gesichtsfeld
    const g = Math.max(0.6, R * r * rel * ein * (hervor ? 1.25 : 1));
    ca.fillStyle = farbe; ca.beginPath(); ca.arc(cx + R * r * Math.cos(th), cy + R * r * Math.sin(th), g, 0, TAU); ca.fill();
    // Rinde: waagrecht der Winkel, senkrecht log r; die Grösse wächst zur Mitte (dort hat die Rinde am meisten Platz)
    if (r < RMIN) continue;
    const u = ((th % TAU) + TAU) % TAU / TAU, v = 1 - Math.log(r / RMIN) / LOG;
    const gr = Math.min(RH * 0.06, Math.max(0.6, rel * ein * (RH - 2 * rand) / LOG * (hervor ? 1.25 : 1)));
    const x = u * RW, y = rand + v * (RH - 2 * rand);
    cr.fillStyle = farbe;
    for (const dx of [0, -RW, RW]) { if (x + dx < -gr || x + dx > RW + gr) continue; cr.beginPath(); cr.arc(x + dx, y, gr, 0, TAU); cr.fill(); }
  }
  ca.strokeStyle = FARBE.leise; ca.lineWidth = 1; ca.beginPath(); ca.arc(cx, cy, R * 1.02, 0, TAU); ca.stroke();
}

/** die beiden nächsten Nachbarn eines Kerns am Rand: ihre Nummernabstände sind die Zahl der sichtbaren Spiralarme */
function arme() {
  const N = z.kerne, phi = z.winkel * Math.PI / 180, n0 = Math.round(N * 0.8), a = kern(n0, N, phi), liste = [];
  for (let d = 1; d <= Math.min(144, N - n0 - 1); d++) {
    const b = kern(n0 + d, N, phi);
    liste.push([Math.hypot(a.r * Math.cos(a.th) - b.r * Math.cos(b.th), a.r * Math.sin(a.th) - b.r * Math.sin(b.th)), d]);
  }
  liste.sort((p, q) => p[0] - q[0]);
  return liste.slice(0, 2).map(x => x[1]).sort((p, q) => p - q);
}

// ---------- Von der Rinde zum Auge: Muster ----------
const M = 2 * 9 / Math.sqrt(3);   // Wellenzahl der Waben: so gewählt, dass sie um den ganzen Winkel herum aufgehen
/** Muster am Ort der Rinde (X = log des Abstands, Y = Winkel), Wert −1 bis 1 */
function muster(X, Y, ph) {
  if (z.muster === 'quer') return Math.cos(14 * X - ph);
  if (z.muster === 'laengs') return Math.cos(16 * Y + ph * 0.5);
  if (z.muster === 'schraeg') return Math.cos(10 * X + 8 * Y - ph);
  return (Math.cos(M * X - ph) + Math.cos(-M / 2 * X + 9 * Y - ph * 0.5) + Math.cos(-M / 2 * X - 9 * Y - ph * 0.5)) / 1.5 - 0.33;
}
const klein = { a: document.createElement('canvas'), r: document.createElement('canvas') };
function ton(f, daten, i, blende = 1) {
  const s = Math.min(1, Math.max(0, 0.5 + 1.6 * f)), q = s * s * (3 - 2 * s) * blende;   // weiche Kante statt Verlauf
  daten[i] = 21 + q * (212 - 21); daten[i + 1] = 20 + q * (172 - 20); daten[i + 2] = 18 + q * (98 - 18); daten[i + 3] = 255;
}
function zeichneMuster() {
  const ph = z.t * 1.6;
  // Rinde
  const rw = 360, rh = Math.max(60, Math.round(360 * rinde.height / rinde.width));
  klein.r.width = rw; klein.r.height = rh;
  const kr = klein.r.getContext('2d'), br = kr.createImageData(rw, rh);
  for (let y = 0; y < rh; y++) for (let x = 0; x < rw; x++) ton(muster((1 - y / rh) * LOG + Math.log(RMIN), x / rw * TAU, ph), br.data, (y * rw + x) * 4);
  kr.putImageData(br, 0, 0);
  cr.imageSmoothingEnabled = true; cr.drawImage(klein.r, 0, 0, rinde.width, rinde.height);
  // Gesichtsfeld: jeder Bildpunkt fragt die Rinde an seinem Ort
  const n = 420; klein.a.width = klein.a.height = n;
  const ka = klein.a.getContext('2d'), ba = ka.createImageData(n, n);
  for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) {
    const dx = (x + 0.5 - n / 2) / (n * 0.47), dy = (y + 0.5 - n / 2) / (n * 0.47), r = Math.hypot(dx, dy), i = (y * n + x) * 4;
    if (r > 1.02 || r < RMIN * 0.6) { ba.data[i] = 21; ba.data[i + 1] = 20; ba.data[i + 2] = 18; ba.data[i + 3] = 255; continue; }
    const blende = Math.min(1, (1.02 - r) / 0.04) * Math.min(1, (r - RMIN * 0.6) / 0.03);
    ton(muster(Math.log(r), Math.atan2(dy, dx), ph), ba.data, i, blende);
  }
  ka.putImageData(ba, 0, 0);
  ca.fillStyle = FARBE.grund; ca.fillRect(0, 0, auge.width, auge.height);
  const s = Math.min(auge.width, auge.height);
  ca.imageSmoothingEnabled = true; ca.drawImage(klein.a, (auge.width - s) / 2, (auge.height - s) / 2, s, s);
}

// ---------- Texte ----------
const TEXT = {
  scheibe: 'Jeder neue Kern setzt im gleichen Winkel an den vorigen an. Unten dieselbe Scheibe so, wie sie auf der Sehrinde läge: die Mitte breit gezogen, der Rand zusammengedrängt. Aus den Spiralarmen werden schräge Reihen. Zieh am Winkel: ein halbes Grad genügt, und die Ordnung kippt in beiden Bildern.',
  spirale: 'Hier rückt jeder Kern um denselben Faktor weiter nach aussen, wie die Kammern einer Schnecke oder die Schuppen eines Zapfens. Auf der Sehrinde wird daraus ein regelmässiges Gitter: Für die Rinde ist die Spirale ein Fries.',
  quer: 'Umgekehrt: Angenommen, auf der Sehrinde laufen Streifen quer. Im Gesichtsfeld entsteht daraus ein Tunnel aus Ringen, die nach aussen wandern.',
  laengs: 'Streifen längs der Rinde werden im Gesichtsfeld zu Strahlen, die aus der Mitte kommen.',
  schraeg: 'Schräge Streifen auf der Rinde werden im Gesichtsfeld zur Spirale. Die Rinde kennt nur gerade Linien; die Spirale macht erst die Karte.',
  waben: 'Waben auf der Rinde werden im Gesichtsfeld zu einem Gitter, das zur Mitte hin feiner wird, wie ein Spinnennetz oder eine Kuppel von innen.',
};
const de = (x, n = 2) => x.toFixed(n).replace('.', ',');
function zeigeTexte() {
  const auf = z.richtung === 'auge';
  $('erklaerung').textContent = auf ? TEXT[z.wachstum] : TEXT[z.muster];
  $('gruppeForm').hidden = $('gruppeFamilie').hidden = !auf; $('gruppeMuster').hidden = auf; $('winkelFeld').hidden = !auf;
  $('winkelAus').textContent = de(z.winkel) + '°';
  $('kerneAus').textContent = String(z.kerne);
  if (auf) {
    const [p, q] = arme(), ab = z.winkel - GOLD;
    $('arme').innerHTML = `Nächste Nachbarn am Rand: <b>${p}</b> und <b>${q}</b> Kerne später · Abweichung vom goldenen Winkel <b>${ab >= 0 ? '+' : '−'}${de(Math.abs(ab))}°</b>`;
  } else $('arme').textContent = '';
  $('lauf').textContent = z.laeuft ? 'Anhalten' : 'Abspielen';
}

// ---------- Bedienung ----------
function pillen(id, schluessel, zahl = false) {
  $(id).addEventListener('click', e => {
    const b = e.target.closest('button[data-wert]'); if (!b) return;
    z[schluessel] = zahl ? Number(b.dataset.wert) : b.dataset.wert;
    $(id).querySelectorAll('button').forEach(x => x.setAttribute('aria-pressed', String(x === b)));
    zeigeTexte(); zeichne();
  });
}
pillen('richtung', 'richtung'); pillen('wachstum', 'wachstum'); pillen('familie', 'familie', true); pillen('muster', 'muster');
const setzeWinkel = w => { z.winkel = Math.min(140.5, Math.max(134.5, w)); $('winkel').value = String(z.winkel); zeigeTexte(); zeichne(); };
$('winkel').addEventListener('input', e => setzeWinkel(Number(e.target.value)));
$('gold').addEventListener('click', () => setzeWinkel(GOLD));
$('kerne').addEventListener('input', e => { z.kerne = Number(e.target.value); zeigeTexte(); zeichne(); });
$('lauf').addEventListener('click', () => { z.laeuft = !z.laeuft; zeigeTexte(); });
// am Gesichtsfeld seitlich ziehen ändert den Winkel fein (am Handy bleibt senkrechtes Scrollen frei)
let zug = null;
auge.addEventListener('pointerdown', e => { if (z.richtung !== 'auge') return; zug = { x: e.clientX, w: z.winkel }; try { auge.setPointerCapture(e.pointerId); } catch { /* ohne Fang weiter */ } });
auge.addEventListener('pointermove', e => { if (zug) setzeWinkel(zug.w + (e.clientX - zug.x) * 0.004); });
const los = () => { zug = null; };
auge.addEventListener('pointerup', los); auge.addEventListener('pointercancel', los);

// ---------- Lauf ----------
function zeichne() { passeAn(auge); passeAn(rinde); if (z.richtung === 'auge') zeichneKerne(); else zeichneMuster(); }
let zuletzt = performance.now();
function bild(jetzt) {
  const dt = Math.min(0.05, (jetzt - zuletzt) / 1000); zuletzt = jetzt;
  if (z.laeuft) { z.t += dt; zeichne(); }
  else if (auge.width !== Math.round(auge.clientWidth * Math.min(window.devicePixelRatio || 1, 2))) zeichne();
  requestAnimationFrame(bild);
}
window.sehrinde = z;   // für Prüfungen
zeigeTexte(); zeichne(); requestAnimationFrame(bild);
