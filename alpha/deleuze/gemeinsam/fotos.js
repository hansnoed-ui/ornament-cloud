// Fotos und Videos aus der Dateiwahl lesen, für alle Operatoren von the deleuzian scheme.
// Telefonfotos haben 12 bis 200 Megapixel. createImageBitmap entpackt sie in voller Grösse (bis 800 MB) und scheitert dann am
// Telefon; das Bild-Element verkleinert grosse JPEGs schon beim Entpacken. Darum zuerst createImageBitmap, sonst das
// Bild-Element, und gleich auf höchstens 2400 Punkte (Telefonregel). Erkannt wird nach Typ oder Endung, weil manche
// Dateiwähler keinen Typ mitgeben (Rückmeldung vom 21.11.2026: Foto am Android-Telefon liess sich nicht laden).

const MELDUNG = {
  de: { foto: 'Dieses Foto kann der Browser nicht lesen. Versuche ein anderes, als JPG, oder ein Video.',
        heic: 'HEIC-Fotos kann dieser Browser nicht lesen. Stelle die Kamera auf JPG um oder wähle ein anderes Foto.',
        nichts: 'Das ist weder Foto noch Video. Wähle ein Foto (JPG, PNG) oder ein Video (MP4, MOV, WebM).',
        video: 'Dieses Video kann der Browser nicht abspielen. Versuche ein anderes, als MP4.' },
  en: { foto: 'Your browser cannot read this photo. Try another one, as JPG, or a video.',
        heic: 'This browser cannot read HEIC photos. Set the camera to JPG or choose another photo.',
        nichts: 'This is neither a photo nor a video. Choose a photo (JPG, PNG) or a video (MP4, MOV, WebM).',
        video: 'Your browser cannot play this video. Try another one, as MP4.' },
  fr: { foto: 'Le navigateur ne peut pas lire cette photo. Essaie-en une autre, en JPG, ou une vidéo.',
        heic: 'Ce navigateur ne lit pas les photos HEIC. Règle l’appareil sur JPG ou choisis une autre photo.',
        nichts: 'Ce n’est ni une photo ni une vidéo. Choisis une photo (JPG, PNG) ou une vidéo (MP4, MOV, WebM).',
        video: 'Le navigateur ne peut pas lire cette vidéo. Essaie-en une autre, en MP4.' },
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
