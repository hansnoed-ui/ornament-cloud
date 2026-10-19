// Hochrendern – ein Video Bild für Bild lesen. MP4 und MOV: mp4box.js 2.4.1 (BSD-3, vendor/) zerlegt, WebCodecs (VideoDecoder) entpackt jedes
// Bild genau, mit seinem Zeitstempel; die Drehung kommt aus der Matrix der Spur (Videos vom Telefon stehen oft quer in der Datei). Sonst (WebM,
// Codec hier nicht entpackbar) über das Spulen des Video-Elements, 30 Bilder je Sekunde.
import { drehungAusMatrix } from "../phorma-iii/filmspur.js?v=19";

/** die Beschreibung des Codecs (avcC, hvcC, vpcC, av1C) aus der Spur, für den VideoDecoder (wie in phorma-iii/filmspur.js) */
function beschreibung(MP4Box, trak) {
  for (const e of trak.mdia.minf.stbl.stsd.entries) {
    const box = e.avcC || e.hvcC || e.vpcC || e.av1C;
    if (!box) continue;
    const s = new MP4Box.DataStream(undefined, 0, MP4Box.Endianness?.BIG_ENDIAN ?? false);
    box.write(s);
    return new Uint8Array(s.buffer, 8);
  }
  return undefined;
}

/** alle Proben der Videospur (noch kodiert) und ihre Beschreibung; wirft, wenn es kein MP4 ist oder der Codec hier nicht geht */
async function zerlegen(datei) {
  if (typeof VideoDecoder === "undefined" || typeof EncodedVideoChunk === "undefined") throw new Error("ohne WebCodecs");
  if (datei.size > 2e9) throw new Error("Datei zu gross zum Zerlegen");
  const MP4Box = await import("../../vendor/mp4box-2.4.1/mp4box.js");
  const file = MP4Box.createFile(), proben = [];
  let info = null, fehler = null;
  file.onError = (e) => { fehler ??= new Error(`mp4box: ${e}`); };
  file.onReady = (i) => {
    info = i;
    const spur = i.videoTracks?.[0];
    if (!spur) { fehler ??= new Error("ohne Videospur"); return; }
    file.setExtractionOptions(spur.id, null, { nbSamples: 500 });
    file.start();
  };
  file.onSamples = (id, _u, samples) => {
    for (const s of samples) proben.push({ key: s.is_sync, zeit: Math.round((s.cts * 1e6) / s.timescale), dauer: Math.round((s.duration * 1e6) / s.timescale), daten: new Uint8Array(s.data) });
    file.releaseUsedSamples(id, samples.at(-1).number + 1);
  };
  const STUECK = 8 << 20;
  for (let ab = 0; ab < datei.size && !fehler;) {
    const buf = await datei.slice(ab, ab + STUECK).arrayBuffer();
    buf.fileStart = ab;
    const weiter = file.appendBuffer(buf);
    ab = Number.isFinite(weiter) && weiter > ab ? weiter : ab + buf.byteLength;
  }
  file.flush();
  if (fehler) throw fehler;
  if (!info?.videoTracks?.[0]) throw new Error("kein lesbares MP4");
  if (!proben.length) throw new Error("keine Bilder");
  const spur = info.videoTracks[0];
  const cfg = { codec: spur.codec, codedWidth: spur.video.width, codedHeight: spur.video.height, description: beschreibung(MP4Box, file.getTrackById(spur.id)) };
  if (!(await VideoDecoder.isConfigSupported(cfg).catch(() => ({ supported: false }))).supported) throw new Error(`Codec ${spur.codec} hier nicht entpackbar`);
  const dauer = spur.duration / spur.timescale || proben.reduce((s, p) => s + p.dauer, 0) / 1e6;
  return { proben, cfg, drehung: drehungAusMatrix(spur.matrix), dauer, fps: proben.length / dauer, breite: spur.video.width, hoehe: spur.video.height };
}

/**
 * Öffnet das Video: { weg, breite, hoehe (wie gezeigt, nach der Drehung), drehung, fps, dauer, anzahl, bilder() }. bilder() liefert der Reihe
 * nach { bild, zeit (µs), dauer (µs), fertig() } – bild ist ein VideoFrame oder das Video-Element; fertig() gibt es frei. el: ein <video> mit
 * der Datei als Quelle (für den Weg über das Spulen und die Vorschau).
 */
export async function oeffnen(datei, el) {
  let z = null, grund = "";
  if (/\.(mp4|m4v|mov)$/i.test(datei.name ?? "") || /mp4|quicktime/.test(datei.type ?? "")) {
    try { z = await zerlegen(datei); } catch (e) { grund = e?.message ?? String(e); }
  } else grund = "kein MP4";
  if (z) {
    const quer = z.drehung === 90 || z.drehung === 270;
    return { weg: "webcodecs", grund, breite: quer ? z.hoehe : z.breite, hoehe: quer ? z.breite : z.hoehe, drehung: z.drehung, fps: z.fps, dauer: z.dauer, anzahl: z.proben.length,
      bilder: () => entpacken(z) };
  }
  if (!el.videoWidth) await new Promise((ok, nein) => { el.addEventListener("loadedmetadata", ok, { once: true }); el.addEventListener("error", () => nein(new Error("das Video lässt sich nicht öffnen")), { once: true }); });
  const fps = 30, anzahl = Math.max(1, Math.floor(el.duration * fps));
  return { weg: "spulen", grund, breite: el.videoWidth, hoehe: el.videoHeight, drehung: 0, fps, dauer: el.duration, anzahl, bilder: () => spulen(el, anzahl, fps) };
}

async function* entpacken({ proben, cfg }) {
  const fertig = [];
  let fehler = null, i = 0, leeren = null, geleert = false;
  const dec = new VideoDecoder({ output: (f) => fertig.push(f), error: (e) => { fehler ??= e; } });
  dec.configure(cfg);
  try {
    while (true) {
      if (fehler) throw fehler;
      // nachfüllen, solange der Decoder wenig vor sich hat und nicht schon Bilder warten (er hat nur wenige Puffer)
      while (i < proben.length && dec.decodeQueueSize < 6 && fertig.length < 3) {
        const p = proben[i++];
        dec.decode(new EncodedVideoChunk({ type: p.key ? "key" : "delta", timestamp: p.zeit, duration: p.dauer, data: p.daten }));
      }
      // am Ende leeren, ohne darauf zu warten: die letzten Bilder kommen währenddessen und werden weitergegeben (sonst hielte er sie fest)
      if (i >= proben.length && !leeren) leeren = dec.flush().then(() => { geleert = true; }, (e) => { fehler ??= e; geleert = true; });
      if (fertig.length) {
        const f = fertig.shift();
        yield { bild: f, zeit: f.timestamp, dauer: f.duration ?? 0, fertig: () => f.close() };
        continue;
      }
      if (geleert) break;
      await new Promise((weiter) => setTimeout(weiter, 1));
    }
  } finally {
    for (const f of fertig) f.close();
    if (dec.state !== "closed") dec.close();
  }
}

async function* spulen(el, anzahl, fps) {
  el.pause();
  for (let k = 0; k < anzahl; k++) {
    const t = (k + 0.5) / fps;
    await new Promise((ok, nein) => {
      const z = setTimeout(() => nein(new Error("das Video lässt sich nicht spulen")), 10_000);
      el.addEventListener("seeked", () => { clearTimeout(z); ok(); }, { once: true });
      el.currentTime = t;
    });
    yield { bild: el, zeit: Math.round((k * 1e6) / fps), dauer: Math.round(1e6 / fps), fertig: () => {} };
  }
}
