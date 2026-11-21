// Fotos und Videos aus der Dateiwahl lesen, für alle Operatoren von the deleuzian scheme.
// Telefonfotos haben 12 bis 200 Megapixel. createImageBitmap entpackt sie in voller Grösse (bis 800 MB) und scheitert dann am
// Telefon; das Bild-Element verkleinert grosse JPEGs schon beim Entpacken. Darum zuerst createImageBitmap, sonst das
// Bild-Element, und gleich auf höchstens 2400 Punkte (Telefonregel). Erkannt wird nach Typ oder Endung, weil manche
// Dateiwähler keinen Typ mitgeben (Rückmeldung vom 21.11.2026: Foto am Android-Telefon liess sich nicht laden).

const MELDUNG = {
  de: { foto: 'Dieses Foto kann der Browser nicht lesen. Versuche ein anderes, als JPG, oder ein Video.',
        heic: 'HEIC-Fotos kann dieser Browser nicht lesen. Stelle die Kamera auf JPG um oder wähle ein anderes Foto.',
        nichts: 'Das ist weder Foto noch Video. Wähle ein Foto (JPG, PNG) oder ein Video (MP4, MOV, WebM).',
        video: 'Dieses Video kann der Browser nicht abspielen. Versuche ein anderes, als MP4.',
        fahrtAn: 'Fahrt durch das Foto anhalten', fahrtAus: 'Fahrt durch das Foto starten' },
  en: { foto: 'Your browser cannot read this photo. Try another one, as JPG, or a video.',
        heic: 'This browser cannot read HEIC photos. Set the camera to JPG or choose another photo.',
        nichts: 'This is neither a photo nor a video. Choose a photo (JPG, PNG) or a video (MP4, MOV, WebM).',
        video: 'Your browser cannot play this video. Try another one, as MP4.',
        fahrtAn: 'Stop moving through the photo', fahrtAus: 'Move slowly through the photo' },
  fr: { foto: 'Le navigateur ne peut pas lire cette photo. Essaie-en une autre, en JPG, ou une vidéo.',
        heic: 'Ce navigateur ne lit pas les photos HEIC. Règle l’appareil sur JPG ou choisis une autre photo.',
        nichts: 'Ce n’est ni une photo ni une vidéo. Choisis une photo (JPG, PNG) ou une vidéo (MP4, MOV, WebM).',
        video: 'Le navigateur ne peut pas lire cette vidéo. Essaie-en une autre, en MP4.',
        fahrtAn: 'Arrêter le travelling dans la photo', fahrtAus: 'Lancer un travelling lent dans la photo' },
};
export const dateiMeldung = (sprache, art) => (MELDUNG[sprache] || MELDUNG.de)[art];

const VIDEO = /\.(mp4|m4v|mov|webm|3gp|mkv)$/i, FOTO = /\.(jpe?g|png|webp|gif|avif|bmp|heic|heif)$/i;
export const istVideo = (f) => (f.type || '').startsWith('video/') || VIDEO.test(f.name || '');
export const istFoto = (f) => !istVideo(f) && ((f.type || '').startsWith('image/') || FOTO.test(f.name || '') || !f.type);
export const istHeic = (f) => /hei[cf]/i.test(f.type || '') || /\.hei[cf]$/i.test(f.name || '');

// liefert ein ImageBitmap oder eine Leinwand mit höchstens «groesst» Punkten an der langen Seite
export async function fotoLesen(datei, groesst = 2400) {
  let roh = null, fehler = '';
  try { roh = await createImageBitmap(datei, { imageOrientation: 'from-image' }); }
  catch (e) { fehler = 'Bitmap: ' + (e && e.name || e); }
  if (roh) {
    const s = Math.min(1, groesst / Math.max(roh.width, roh.height));
    if (s >= 1) return roh;
    try {
      const klein = await createImageBitmap(roh, { resizeWidth: Math.round(roh.width * s), resizeHeight: Math.round(roh.height * s), resizeQuality: 'high' });
      roh.close(); return klein;
    } catch (e) { const c = verkleinern(roh, s); roh.close(); return c; }
  }
  // zweiter Weg: das Bild-Element (dreht nach EXIF, verkleinert grosse JPEGs beim Entpacken)
  const url = URL.createObjectURL(datei);
  try {
    const img = new Image(); img.decoding = 'async'; img.src = url;
    await new Promise((ok, nein) => { img.onload = ok; img.onerror = () => nein(new Error('Bild-Element')); });
    try { await img.decode(); } catch {}
    const w = img.naturalWidth, h = img.naturalHeight;
    if (!w || !h) throw new Error('leeres Bild');
    return verkleinern(img, Math.min(1, groesst / Math.max(w, h)), w, h);
  } catch (e) {
    throw new Error((fehler ? fehler + '; ' : '') + (e && e.message || e) + ' · ' + (datei.type || 'ohne Typ') + ' · ' + (datei.size / 1e6).toFixed(1) + ' MB');
  } finally { URL.revokeObjectURL(url); }
}
function verkleinern(q, s, w = q.width, h = q.height) {
  const c = document.createElement('canvas');
  c.width = Math.max(1, Math.round(w * s)); c.height = Math.max(1, Math.round(h * s));
  const x = c.getContext('2d'); x.imageSmoothingQuality = 'high'; x.drawImage(q, 0, 0, c.width, c.height);
  return c;
}

// Fotos auf die Bühne malen. Ruhig (Wunsch vom 21.11.2026): das ganze Foto, ohne Zoom und ohne Fahrt; nur wenn es fast
// das Format der Bühne hat, füllt es sie. Bewegt: die Fahrt des Operators («fahrt» quer durchs Bild, «atmen» leicht
// pendelnd, «still» nur ein Hauch Zoom). mix (0 ruhig … 1 bewegt) blendet weich zwischen beiden.
export function fotosMalen(c, fotos, W, H, zeit, { dauer = 3.2, blende = 1.1, art = 'fahrt', mix = 1 } = {}) {
  const n = fotos.length; if (!n) return;
  const nr = Math.floor(zeit / dauer), innen = zeit - nr * dauer;
  const zeichne = (k, alpha) => {
    const f = fotos[((k % n) + n) % n], fw = f.width, fh = f.height;
    const deck = Math.max(W / fw, H / fh), ganz = Math.min(W / fw, H / fh);
    // ruhig: ganz; fast Passendes füllt (die Bühne hat bei Fotos ohnehin das Format des ersten Fotos, siehe rahmen)
    const s0 = deck / ganz < 1.15 ? deck : ganz;
    const x0 = (W - fw * s0) / 2, y0 = (H - fh * s0) / 2;
    // bewegt
    let z, dx = 0, dy = 0;
    if (art === 'fahrt') {
      const lauf = (zeit - k * dauer) / (dauer + blende);
      z = 1.08 + 0.14 * (n === 1 ? 0.5 + 0.5 * Math.sin(zeit * 0.21) : lauf);
      const w = (n === 1 ? zeit * 0.13 : k * 2.4);
      dx = Math.cos(w) * 0.5; dy = Math.sin(w * 1.3) * 0.5;
    } else if (art === 'atmen') z = 1.05 + 0.05 * Math.sin(zeit * 0.31);
    else z = 1.04 + 0.04 * Math.sin(zeit * 0.21);
    const s1 = deck * z, b1 = fw * s1, h1 = fh * s1;
    let x1 = (W - b1) / 2, y1 = (H - h1) / 2;
    if (art === 'fahrt') { x1 += dx * (b1 - W); y1 += dy * (h1 - H); }
    else if (art === 'atmen') x1 += Math.sin(zeit * 0.23) * W * 0.015;
    const m = mix * mix * (3 - 2 * mix), s = s0 + (s1 - s0) * m;
    c.globalAlpha = alpha;
    c.drawImage(f, x0 + (x1 - x0) * m, y0 + (y1 - y0) * m, fw * s, fh * s);
  };
  c.globalAlpha = 1; c.fillStyle = '#050506'; c.fillRect(0, 0, W, H);
  if (n === 1) { zeichne(0, 1); return; }
  zeichne(nr, 1);
  if (innen > dauer - blende) zeichne(nr + 1, (innen - (dauer - blende)) / blende);
  c.globalAlpha = 1;
}

// Schalter «Fahrt» (feines Zeichen auf dem Bild): Zustand, weiches Umblenden, Beschriftung
export function fahrtSchalter(knopf, anfang) {
  const z = { an: anfang, mix: anfang ? 1 : 0, zuletzt: 0 };
  let war = '';
  const zeigen = () => {
    const t = dateiMeldung(document.documentElement.lang, z.an ? 'fahrtAn' : 'fahrtAus');
    if (t === war) return; war = t;
    knopf.setAttribute('aria-pressed', String(z.an)); knopf.setAttribute('aria-label', t); knopf.title = t;
  };
  knopf.addEventListener('click', () => { z.an = !z.an; zeigen(); });
  z.zeigen = zeigen;
  z.schritt = (t) => { zeigen(); const dt = Math.min(0.1, Math.max(0, t - (z.zuletzt || t))); z.zuletzt = t; z.mix += ((z.an ? 1 : 0) - z.mix) * (1 - Math.exp(-dt / 0.45)); if (Math.abs(z.mix - (z.an ? 1 : 0)) < 0.002) z.mix = z.an ? 1 : 0; return z.mix; };
  zeigen();
  return z;
}

// Zeichen: ein Bildrahmen mit einer feinen Bahn, die schräg hindurchläuft (wie die Fahrt); aus: nur der Rahmen
export const FAHRT_SVG = `<svg viewBox="0 0 32 32" width="30" height="30" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round">
  <g class="kontur"><rect x="5" y="8" width="22" height="16" rx="0.5"/><path class="bahn" d="M9.5 20.5l11-9"/><path class="bahn" d="M16.4 11.5h4.1v4"/></g>
  <rect x="5" y="8" width="22" height="16" rx="0.5"/><path class="bahn" d="M9.5 20.5l11-9"/><path class="bahn" d="M16.4 11.5h4.1v4"/>
</svg>`;

// Rahmen der Bühne (Wunsch vom 21.11.2026: «das ganze 4:5-Foto ohne Rand bearbeiten»). Ohne Foto ist die Bühne der ganze
// Schirm. Mit Fotos nimmt sie das Format des ersten Fotos an und sitzt so gross wie möglich im freien Fenster zwischen
// Kopfband und Reglern; der Operator rechnet nur auf dieser Fläche, Standbild und Aufnahme kommen im Format des Fotos.
// Die Operatoren lesen rahmen.b/.h statt innerWidth/innerHeight und ziehen rahmen.x/.y von den Fingerorten ab.
export const rahmen = { x: 0, y: 0, b: innerWidth, h: innerHeight, seite: 0 };
let rahmenLeinwand = null, eigenesResize = false;
function rahmenRechnen() {
  let x = 0, y = 0, b = innerWidth, h = innerHeight;
  if (rahmen.seite > 0) {
    const kopf = document.getElementById('kopf'), regler = document.getElementById('regler');
    const oben = kopf && !kopf.hidden ? Math.max(0, kopf.getBoundingClientRect().bottom) : 0;
    let unten = regler && !regler.hidden ? Math.min(innerHeight, regler.getBoundingClientRect().top) : innerHeight;
    if (unten - oben < innerHeight * 0.3) unten = innerHeight;
    const fb = innerWidth, fh = unten - oben;
    if (fb / fh > rahmen.seite) { h = fh; b = fh * rahmen.seite; } else { b = fb; h = fb / rahmen.seite; }
    b = Math.round(b); h = Math.round(h); x = Math.round((fb - b) / 2); y = Math.round(oben + (fh - h) / 2);
  }
  const neu = x !== rahmen.x || y !== rahmen.y || b !== rahmen.b || h !== rahmen.h;
  Object.assign(rahmen, { x, y, b, h });
  if (rahmenLeinwand) {
    const st = rahmenLeinwand.style;
    if (rahmen.seite > 0) { st.left = x + 'px'; st.top = y + 'px'; st.width = b + 'px'; st.height = h + 'px'; st.right = 'auto'; st.bottom = 'auto'; }
    else st.left = st.top = st.width = st.height = st.right = st.bottom = '';
  }
  return neu;
}
function rahmenMelden() { if (rahmenRechnen() && !eigenesResize) { eigenesResize = true; dispatchEvent(new Event('resize')); eigenesResize = false; } }
addEventListener('resize', () => { if (!eigenesResize) rahmenRechnen(); });
// seite: Breite durch Höhe des Fotos, 0 für den ganzen Schirm
export function rahmenSetzen(leinwand, seite) {
  rahmenLeinwand = leinwand;
  if (seite === rahmen.seite) return;
  rahmen.seite = seite;
  if (!rahmenSetzen.beob && typeof ResizeObserver !== 'undefined') {
    rahmenSetzen.beob = new ResizeObserver(() => rahmenMelden());
    for (const id of ['kopf', 'regler']) { const el = document.getElementById(id); if (el) rahmenSetzen.beob.observe(el); }
  }
  rahmenMelden();
}
