// PHORMA III – Filmspur: die Bilder eines Videos bildgenau, für den Effekt «Video» (seit 18. Oktober 2026; Wunsch: «für Video (mit und ohne Ton)
// den selben Ablauf wie bei Audio … nicht nur auf der Tonebene, sondern auch auf der Bild- bzw. Video-Ebene»; Etappe 1: das Video läuft
// bildgenau und synchron zum Ton, Scratching, Cracks und Gefrickel folgen).
// Lesen: MP4 und MOV mit mp4box.js 2.4.1 (BSD-3, vendor/) und WebCodecs (VideoDecoder) – jedes Bild genau, die Drehung aus der Matrix der Spur
// (Videos vom Telefon stehen oft quer in der Datei); sonst (WebM, ohne WebCodecs, Codec unbekannt) über das Spulen des Video-Elements.
// Abgelegt: je Filmbild (30 je Sekunde) ein JPEG, auf das Filmformat zugeschnitten (wie ein Foto, mittig). Entpackt wird nur, was gerade gebraucht
// wird: für die Vorschau halb so gross und vorausgeladen, für den Export in voller Grösse.
export const FPS = 30;
/** mehr liest der Effekt nicht (rund 30 s × 30 Bilder × 150 kB); der Ablauf braucht rund 17 s */
export const HOECHSTENS = 30;

/** Drehung im Uhrzeigersinn (0, 90, 180, 270) aus der Matrix einer MP4-Spur ([a, b, u, c, d, v, x, y, w], Festkomma) */
export function drehungAusMatrix(m) {
  if (!m || m.length < 5) return 0;
  const w = Math.round((Math.atan2(m[1], m[0]) * 180) / Math.PI / 90) * 90;
  return ((w % 360) + 360) % 360;
}

/** die Quelle (w × h, im Uhrzeigersinn um drehung gedreht) auf B × H zeichnen, mittig beschnitten wie ein Foto */
export function zeichneBeschnitten(ctx, quelle, w, h, B, H, drehung = 0) {
  const quer = drehung === 90 || drehung === 270, dw = quer ? h : w, dh = quer ? w : h, s = Math.max(B / dw, H / dh);
  ctx.save();
  ctx.translate(B / 2, H / 2); ctx.rotate((drehung * Math.PI) / 180);
  ctx.drawImage(quelle, (-w * s) / 2, (-h * s) / 2, w * s, h * s);
  ctx.restore();
}

/**
 * Welches dekodierte Bild für welches Filmbild gilt: zeiten (aufsteigend, in Sekunden, die Zeitstempel der Bilder) → je Filmbild k (Zeit
 * von + k / FPS) die Nummer des letzten Bilds, das schon begonnen hat (vor dem ersten: das erste). Ohne DOM, für die Tests.
 */
export function zuordnen(zeiten, von, n) {
  const k = new Int32Array(n);
  let j = 0;
  for (let i = 0; i < n; i++) {
    const t = von + i / FPS + 1e-4;
    while (j + 1 < zeiten.length && zeiten[j + 1] <= t) j++;
    k[i] = j;
  }
  return k;
}

const leinwand = (w, h) => (typeof OffscreenCanvas !== "undefined" ? new OffscreenCanvas(w, h) : Object.assign(document.createElement("canvas"), { width: w, height: h }));
const alsJpeg = (c) => (c.convertToBlob ? c.convertToBlob({ type: "image/jpeg", quality: 0.86 }) : new Promise((ok) => c.toBlob(ok, "image/jpeg", 0.86)));

/**
 * Die Bilder von von bis bis (Sekunden) lesen: datei (File), el (das Video-Element, für den Ersatzweg), B × H (Filmgrösse).
 * fortschritt(i, n) meldet, abbruch() bricht ab (dann null). → spur (siehe unten) mit .weg ("webcodecs" | "spulen") und .grund (warum gespult)
 */
export async function filmspurLesen(datei, el, { von = 0, bis, breite: B, hoehe: H, fortschritt = () => {}, abbruch = () => false }) {
  bis = Math.min(bis, von + HOECHSTENS);
  const n = Math.max(1, Math.round((bis - von) * FPS)), c = leinwand(B, H), ctx = c.getContext("2d", { alpha: false });
  let blobs = null, weg = "webcodecs", grund = "";
  if (/\.(mp4|m4v|mov)$/i.test(datei.name ?? "") || /mp4|quicktime/.test(datei.type ?? "")) {
    try { blobs = await mitWebCodecs(datei, { von, n, B, H, c, ctx, fortschritt, abbruch }); }
    catch (e) { grund = e?.message ?? String(e); blobs = null; }
  } else grund = "kein MP4";
  if (abbruch()) return null;
  if (!blobs) { weg = "spulen"; blobs = await mitSpulen(el, { von, n, B, H, c, ctx, fortschritt, abbruch }); }
  if (!blobs) return null;
  return filmspur(blobs, { von, B, H, weg, grund });
}

/** die Beschreibung des Codecs (avcC, hvcC, vpcC, av1C) aus der Spur, für den VideoDecoder */
function beschreibung(MP4Box, trak) {
  for (const e of trak.mdia.minf.stbl.stsd.entries) {
    const box = e.avcC || e.hvcC || e.vpcC || e.av1C;
    if (!box) continue;
    const s = new MP4Box.DataStream(undefined, 0, MP4Box.Endianness?.BIG_ENDIAN ?? false);
    box.write(s);
    return new Uint8Array(s.buffer, 8);                                     // ohne den Kopf der Box
  }
  return undefined;
}

async function mitWebCodecs(datei, { von, n, B, H, c, ctx, fortschritt, abbruch }) {
  if (typeof VideoDecoder === "undefined" || typeof EncodedVideoChunk === "undefined") throw new Error("ohne WebCodecs");
  if (datei.size > 1.5e9) throw new Error("Datei zu gross zum Zerlegen");
  const MP4Box = await import("../../vendor/mp4box-2.4.1/mp4box.js");
  const bis = von + n / FPS, file = MP4Box.createFile();
  let info = null, fehler = null, genug = false, vorrat = [], proben = [];
  file.onError = (e) => { fehler ??= new Error(`mp4box: ${e}`); };
  file.onReady = (i) => {
    info = i;
    const spur = i.videoTracks?.[0];
    if (!spur) { fehler ??= new Error("ohne Videospur"); return; }
    file.setExtractionOptions(spur.id, null, { nbSamples: 200 });
    file.start();
  };
  // die Proben in Dekodier-Reihenfolge: ab dem letzten Schlüsselbild vor dem Ausschnitt bis zum ersten Schlüsselbild danach (B-Bilder: eine
  // Sekunde Rand)
  file.onSamples = (id, _u, samples) => {
    for (const s of samples) {
      if (genug) break;
      const d = s.dts / s.timescale;
      const p = { key: s.is_sync, t: s.cts / s.timescale, dauer: s.duration / s.timescale, data: new Uint8Array(s.data) };
      if (s.is_sync && d <= von) vorrat = [p];                             // eine neue Gruppe vor dem Ausschnitt: die alte braucht es nicht
      else if (s.is_sync && d > bis + 1) { genug = true; break; }
      else vorrat.push(p);
    }
    file.releaseUsedSamples(id, samples.at(-1).number + 1);
  };
  const STUECK = 4 << 20;
  for (let ab = 0; ab < datei.size && !genug && !fehler;) {
    if (abbruch()) return null;
    const buf = await datei.slice(ab, ab + STUECK).arrayBuffer();
    buf.fileStart = ab;
    const weiter = file.appendBuffer(buf);
    ab = Number.isFinite(weiter) && weiter > ab ? weiter : ab + buf.byteLength;
  }
  file.flush();
  if (fehler) throw fehler;
  if (!info) throw new Error("kein lesbares MP4");
  proben = vorrat;
  if (!proben.length) throw new Error("keine Bilder im Ausschnitt");
  const spur = info.videoTracks[0], drehung = drehungAusMatrix(spur.matrix);
  const cfg = { codec: spur.codec, codedWidth: spur.video.width, codedHeight: spur.video.height, description: beschreibung(MP4Box, file.getTrackById(spur.id)) };
  if (!(await VideoDecoder.isConfigSupported(cfg).catch(() => ({ supported: false }))).supported) throw new Error(`Codec ${spur.codec} hier nicht dekodierbar`);
  // Dekodieren: die Bilder kommen in Zeitfolge; jedes, das ein Filmbild trifft, wird gezeichnet und als JPEG abgelegt, dann gleich geschlossen
  // (der Decoder hat nur wenige Puffer)
  const fertigeBilder = [], warte = [];
  let dfehler = null;
  const dec = new VideoDecoder({ output: (f) => warte.push(f), error: (e) => { dfehler ??= e; } });
  dec.configure(cfg);
  const blobs = new Array(n).fill(null);
  let k = 0, vorig = null, vorigBlob = null;
  const ablegen = async (f, tNaechst) => {
    // f gilt für alle Filmbilder ab seinem Zeitstempel bis vor das nächste Bild
    let blob = null;
    while (k < n && (tNaechst === null || von + k / FPS + 1e-4 < tNaechst)) {
      if (!blob) { zeichneBeschnitten(ctx, f, f.displayWidth, f.displayHeight, B, H, drehung); blob = await alsJpeg(c); }
      blobs[k++] = blob;
      if (k % 10 === 0) fortschritt(k, n);
    }
    return blob;
  };
  const verarbeiten = async () => {
    while (warte.length) {
      const f = warte.shift(), t = f.timestamp / 1e6;
      if (vorig) { vorigBlob = (await ablegen(vorig, t)) ?? vorigBlob; vorig.close(); }
      vorig = f;
      fertigeBilder.push(t);
    }
  };
  for (const p of proben) {
    if (abbruch() || dfehler) break;
    dec.decode(new EncodedVideoChunk({ type: p.key ? "key" : "delta", timestamp: Math.round(p.t * 1e6), duration: Math.round(p.dauer * 1e6), data: p.data }));
    while (dec.decodeQueueSize > 4 || warte.length > 2) { await new Promise((ok) => setTimeout(ok, 1)); await verarbeiten(); }
    await verarbeiten();
    if (k >= n) break;
  }
  if (!dfehler && k < n) { await dec.flush().catch((e) => { dfehler ??= e; }); await verarbeiten(); }
  if (vorig) { if (k < n) await ablegen(vorig, null); vorig.close(); }
  for (const f of warte) f.close();
  try { dec.close(); } catch { /* schon zu */ }
  if (abbruch()) return null;
  if (dfehler) throw dfehler;
  if (k === 0) throw new Error("der Decoder lieferte kein Bild");
  for (; k < n; k++) blobs[k] = blobs[k - 1];                              // das Video ist kürzer: das letzte Bild hält
  fortschritt(n, n);
  return blobs;
}

const suchen = (v, t) => new Promise((ok, nein) => {
  const fertig = () => { clearTimeout(z); v.removeEventListener("seeked", fertig); ok(); };
  const z = setTimeout(() => { v.removeEventListener("seeked", fertig); nein(new Error("das Video lässt sich nicht spulen")); }, 10_000);
  v.addEventListener("seeked", fertig);
  v.currentTime = Math.abs(v.currentTime - t) < 1e-4 ? t + 1e-4 : t;
});
async function mitSpulen(el, { von, n, B, H, c, ctx, fortschritt, abbruch }) {
  const blobs = [];
  for (let k = 0; k < n; k++) {
    if (abbruch()) return null;
    const t = Math.min(el.duration - 1e-3, von + k / FPS + 1e-3);
    await suchen(el, t);
    zeichneBeschnitten(ctx, el, el.videoWidth, el.videoHeight, B, H, 0);   // das Element hat die Drehung schon angewandt
    blobs.push(await alsJpeg(c));
    if (k % 10 === 0) fortschritt(k, n);
  }
  fortschritt(n, n);
  return blobs;
}

/**
 * Die gelesene Spur: n Filmbilder ab Quellzeit von. bild(qt, { vorschau }) gibt synchron das Bild für Quellzeit qt (ImageBitmap) oder das nächste
 * schon entpackte (in der Vorschau lädt es die folgenden nach); vorbereiten(qts, { vorschau }) entpackt sie sicher (Export).
 */
export function filmspur(blobs, { von, B, H, weg = "", grund = "" }) {
  const n = blobs.length, lager = { klein: new Map(), gross: new Map() }, unterwegs = new Map(), GRENZE = { klein: 90, gross: 12 };
  const index = (qt) => Math.max(0, Math.min(n - 1, Math.floor((qt - von) * FPS + 1e-4)));
  const art = (vorschau) => (vorschau ? "klein" : "gross");
  function laden(k, a) {
    const L = lager[a], s = `${a}${k}`;
    if (L.has(k)) { const b = L.get(k); L.delete(k); L.set(k, b); return Promise.resolve(b); }   // zuletzt gebraucht: ans Ende
    if (unterwegs.has(s)) return unterwegs.get(s);
    const p = createImageBitmap(blobs[k], a === "klein" ? { resizeWidth: Math.max(2, Math.round(B / 2)), resizeHeight: Math.max(2, Math.round(H / 2)) } : {}).then((b) => {
      unterwegs.delete(s);
      L.set(k, b);
      while (L.size > GRENZE[a]) { const [alt, ab] = L.entries().next().value; ab.close?.(); L.delete(alt); }
      return b;
    });
    unterwegs.set(s, p);
    return p;
  }
  return {
    von, n, fps: FPS, breite: B, hoehe: H, weg, grund, dauer: n / FPS,
    index,
    bild(qt, { vorschau = true } = {}) {
      const k = index(qt), a = art(vorschau), L = lager[a];
      if (vorschau) { for (let j = Math.max(0, k - 8); j < Math.min(n, k + 18); j++) if (!L.has(j)) laden(j, a); }   // auch zurück: der Scratch läuft rückwärts
      else if (!L.has(k)) laden(k, a);
      if (L.has(k)) return L.get(k);
      for (let d = 1; d < 30; d++) { if (L.has(k - d)) return L.get(k - d); if (L.has(k + d)) return L.get(k + d); }
      return lager.klein.get(k) ?? lager.gross.get(k) ?? null;
    },
    async vorbereiten(qts, { vorschau = false } = {}) { await Promise.all([...new Set(qts.map(index))].map((k) => laden(k, art(vorschau)))); },
    entsorgen() { for (const L of Object.values(lager)) { for (const b of L.values()) b.close?.(); L.clear(); } },
  };
}
