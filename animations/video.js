// Animationen – ein Video statt eines Bildes (Prototyp, 7. November 2026, Christian: «Wenn ich jetzt auch noch videos würde hochladen
// wollen …», dann «Wir probieren das. Mach es so, dass es jederzeit rückgängig gemacht werden kann»).
//
// Rückgängig: VIDEO_AN = false, und die Seite nimmt wieder nur Bilder an, alles andere bleibt, wie es war. Der ganze Rest des Videos
// steckt in diesem Modul; motor.js und seite.js rufen es nur an wenigen, markierten Stellen («Video:») auf.
//
// Wie es geht: Die Effekte lesen das Bild in jedem Frame neu aus (uBild im Shader) und hängen nur von der Zeit in der Schlaufe ab.
// Ein Video wird darum beim Laden einmal in Einzelbilder zerlegt (30 je Sekunde, verkleinert, als JPEG im Speicher des Browsers),
// und der Motor legt zu jeder Zeit t das passende Einzelbild als uBild unter die Effekte. So ist jedes Bild des MP4 genau bestimmt,
// die Schlaufe schliesst, und es läuft kein <video> mit, das hinterherhinkt. Damit das Video in der Schlaufe keine Naht hat, blendet
// es in der ersten Sekunde jeder Runde vom Ende in den Anfang über. Länger als die Schlaufe muss es nicht sein: 13 s (12 s Schlaufe
// und 1 s Überblendung) werden übernommen, der Rest abgeschnitten.
import { t } from "./sprache.js?v=33";

/** Schalter: false nimmt Videos ganz heraus (Datei-Auswahl, Ziehen, Motor), die Seite ist dann wie vor dem 7. November 2026 */
export const VIDEO_AN = true;
/** so viele Sekunden eines Videos werden höchstens übernommen: eine Schlaufe von 12 s und die Überblendung */
export const VIDEO_SEK = 13;
/** längste Seite der Einzelbilder (Laptop) und auf Handys und schwacher Grafik */
export const VIDEO_PX = 1080, VIDEO_PX_SPARSAM = 720;
/** Einzelbilder je Sekunde (wie das MP4) */
export const VIDEO_FPS = 30;
/** Überblendung vom Ende in den Anfang, in Sekunden (bei kurzen Videos höchstens ein Fünftel der Länge) */
export const UEBERBLENDUNG = 1;

/**
 * welches Einzelbild zur Zeit t (Sekunden) in einer Schlaufe von D Sekunden zu sehen ist: a, dazu in der Überblendung b mit dem
 * Anteil f (1 am Anfang der Runde, 0 nach der Überblendung). Das Video läuft k-mal je Schlaufe (k ganz, mindestens 1), dafür etwas
 * schneller oder langsamer: genau 1 ×, wenn es so lang ist wie Schlaufe und Überblendung.
 */
export function videoZeit(t, D, n, fps = VIDEO_FPS) {
  const L = n / fps, ue = Math.min(UEBERBLENDUNG, L * .2), Lr = L - ue;   // Lr: eine Runde ohne die Überblendung
  const k = Math.max(1, Math.round(D / Lr));
  const T = ((((t % D) + D) % D) / D) * k * Lr, s = T % Lr;
  const nr = (x) => Math.min(n - 1, Math.max(0, Math.round(x * fps)));
  if (ue > 0 && s < ue) return { a: nr(s), b: nr(s + Lr), f: 1 - s / ue, tempo: (k * Lr) / D };
  return { a: nr(s), b: -1, f: 0, tempo: (k * Lr) / D };
}

const warten = (ziel, ereignis) => new Promise((ok, nein) => {
  const weg = () => { ziel.removeEventListener(ereignis, ja); ziel.removeEventListener("error", fehler); };
  const ja = () => { weg(); ok(); }, fehler = () => { weg(); nein(new Error(t("Dieses Video kann der Browser nicht öffnen. Am sichersten geht MP4 (H.264).")) ); };
  ziel.addEventListener(ereignis, ja); ziel.addEventListener("error", fehler);
});

/**
 * zerlegt eine Videodatei in Einzelbilder: höchstens VIDEO_SEK Sekunden, längste Seite px, als JPEG-Blobs.
 * fortschritt(p) läuft von 0 bis 1, abbruch() bricht ab (gibt dann null).
 */
export async function videoZerlegen(datei, { px = VIDEO_PX, sek = VIDEO_SEK, fps = VIDEO_FPS, fortschritt = () => {}, abbruch = () => false } = {}) {
  const url = URL.createObjectURL(datei);
  const v = document.createElement("video");
  v.muted = true; v.playsInline = true; v.preload = "auto"; v.src = url;
  try {
    await warten(v, "loadeddata");
    let dauer = v.duration;
    if (!Number.isFinite(dauer)) { v.currentTime = 1e7; await warten(v, "seeked"); dauer = v.currentTime; }   // WebM aus MediaRecorder kennt seine Länge erst am Ende
    if (!(dauer > .3) || !v.videoWidth) throw new Error(t("Das Video ist zu kurz oder leer."));
    const k = Math.min(1, px / Math.max(v.videoWidth, v.videoHeight));
    const b = Math.max(2, Math.round(v.videoWidth * k)), h = Math.max(2, Math.round(v.videoHeight * k));
    const c = document.createElement("canvas"); c.width = b; c.height = h;
    const x = c.getContext("2d", { alpha: false });
    const n = Math.max(2, Math.floor(Math.min(dauer, sek) * fps));
    if (typeof v.requestVideoFrameCallback === "function") {
      const bilder = await abspielenUndFangen(v, x, c, n, fps, fortschritt, abbruch);
      if (bilder === null) return null;
      if (bilder) return speicherVon(bilder, b, h, fps, dauer);
    }
    // ohne requestVideoFrameCallback (oder wenn das Abspielen nicht ging): jedes Einzelbild einzeln suchen, genau, aber langsamer
    const bilder = [];
    for (let i = 0; i < n; i++) {
      if (abbruch()) return null;
      v.currentTime = Math.min(dauer - .001, (i + .5) / fps);   // die Mitte des Einzelbilds, damit Rundung nicht aufs Nachbarbild fällt
      await warten(v, "seeked");
      x.drawImage(v, 0, 0, b, h);
      bilder.push(await new Promise((ok) => c.toBlob(ok, "image/jpeg", .85)));
      fortschritt((i + 1) / n);
    }
    return speicherVon(bilder, b, h, fps, dauer);
  } finally {
    v.removeAttribute("src"); v.load(); URL.revokeObjectURL(url);
  }
}

/**
 * spielt das Video stumm einmal in Echtzeit ab und fängt jedes gezeigte Bild mit seiner Zeit (requestVideoFrameCallback). Danach
 * bekommt jedes Einzelbild i das Bild, das zur Mitte (i + .5)/fps zu sehen war: so passen 24, 25, 30 und 60 Bilder je Sekunde.
 * Viel schneller als Einzelbild für Einzelbild zu suchen (jedes Suchen entschlüsselt ab dem letzten Schlüsselbild, bei Handyvideos
 * bis zu zwei Sekunden). Gibt null bei Abbruch und undefined, wenn das Abspielen nicht ging.
 */
async function abspielenUndFangen(v, x, c, n, fps, fortschritt, abbruch) {
  const ende = n / fps, gefangen = [];   // [Zeit, Blob-Versprechen]
  v.currentTime = 0;
  await warten(v, "seeked").catch(() => {});
  const fertig = new Promise((ok) => {
    const schluss = () => { v.pause(); ok(); };
    const bild = (_, meta) => {
      if (abbruch()) { schluss(); return; }
      x.drawImage(v, 0, 0, c.width, c.height);
      gefangen.push([meta.mediaTime, new Promise((ja) => c.toBlob(ja, "image/jpeg", .85))]);   // toBlob nimmt den Inhalt sofort
      fortschritt(Math.min(1, meta.mediaTime / ende));
      if (meta.mediaTime >= ende) schluss(); else v.requestVideoFrameCallback(bild);
    };
    v.requestVideoFrameCallback(bild);
    v.addEventListener("ended", schluss, { once: true });
  });
  try { await v.play(); } catch { return undefined; }
  await fertig;
  if (abbruch()) return null;
  if (gefangen.length < Math.min(n, 3)) return undefined;
  gefangen.sort((a, b) => a[0] - b[0]);
  const blobs = await Promise.all(gefangen.map((g) => g[1]));
  const bilder = [];
  for (let i = 0, j = 0; i < n; i++) {
    const mitte = (i + .5) / fps;
    while (j + 1 < gefangen.length && gefangen[j + 1][0] <= mitte) j++;
    bilder.push(blobs[j]);   // dasselbe Bild für mehrere Einzelbilder (24 fps, ausgelassene Bilder) teilt sich den Blob
  }
  return bilder;
}

/** die Einzelbilder mit einem kleinen Vorrat entschlüsselter Bilder: sofort(i) gibt sie ohne Warten (oder null), bild(i) wartet darauf */
export async function speicherVon(blobs, b, h, fps = VIDEO_FPS, dauer = blobs.length / fps) {
  const urls = blobs.map((x) => URL.createObjectURL(x));
  const fertig = new Map(), laufend = new Map(), VORRAT = 16;
  function bild(i) {
    if (fertig.has(i)) return Promise.resolve(fertig.get(i));
    if (!laufend.has(i)) {
      const img = new Image(); img.decoding = "async"; img.src = urls[i];
      laufend.set(i, img.decode().then(() => {
        laufend.delete(i); fertig.set(i, img);
        while (fertig.size > VORRAT) fertig.delete(fertig.keys().next().value);
        return img;
      }, (f) => { laufend.delete(i); throw f; }));
    }
    return laufend.get(i);
  }
  const sofort = (i) => { const img = fertig.get(i); if (img) { fertig.delete(i); fertig.set(i, img); } return img ?? null; };   // zuletzt gebraucht bleibt im Vorrat
  const vorladen = (i, m = 6) => { for (let j = 0; j < m; j++) { const k = (i + j) % blobs.length; if (!fertig.has(k) && laufend.size < 4) bild(k).catch(() => {}); } };
  const erstes = await bild(0);
  return {
    b, h, n: blobs.length, fps, dauer, bytes: blobs.reduce((s, x) => s + x.size, 0), erstes,
    bild, sofort, vorladen,
    freigeben() { urls.forEach((u) => URL.revokeObjectURL(u)); fertig.clear(); },
  };
}

/** ist die Datei ein Video, das hier angenommen wird (nur mit VIDEO_AN) */
export const istVideo = (datei) => VIDEO_AN && !!datei && (datei.type.startsWith("video/") || /\.(mp4|m4v|mov|webm)$/i.test(datei.name || ""));
