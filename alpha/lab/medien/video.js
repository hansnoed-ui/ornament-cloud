// ORNAMENT LAB – kurze Animation aus einer Bildfolge. Bevorzugt WebCodecs (schneller als Echtzeit) mit mp4-muxer 5.2.2 (MIT, lokal in vendor/,
// wie PHORMA); H.264, sonst VP9 im MP4. Ohne WebCodecs: MediaRecorder (WebM) in Echtzeit, die Dauer wird mit dauer.js aus The Fictory nachgetragen.
// Eine Tonspur (seit Lab 0.1.4, Film über Stationen) kodiert tonspur.js aus PHORMA III (unverändert): AAC, sonst Opus. Seit Lab 0.1.7 in Stereo
// und zuerst mit 320 kbit/s (eigener Versuch hier, dann tonspur.js mit 256 kbit/s und weniger). Der Rückfall bleibt stumm.
import { Muxer, ArrayBufferTarget } from "../../../vendor/mp4-muxer-5.2.2/mp4-muxer.js";
import { mitDauer } from "../../../alpha/the-fictory/dauer.js?v=23";
import { dateiLesen } from "./dateilesen.js";
import { modulLaden } from "../kern/laden.js";

export const FPS = 30;
const KANDIDATEN = [["avc1.640028", "avc"], ["avc1.42001f", "avc"], ["vp09.00.10.08", "vp9"]];

async function konfiguration(w, h) {
  if (typeof VideoEncoder === "undefined" || typeof VideoFrame === "undefined") return null;
  for (const [codec, muxer] of KANDIDATEN) {
    const cfg = { codec, width: w, height: h, bitrate: 8_000_000, framerate: FPS, ...(muxer === "avc" ? { avc: { format: "avc" } } : {}) };
    try { if ((await VideoEncoder.isConfigSupported(cfg)).supported) return { cfg, muxer }; } catch { /* nächster */ }
  }
  return null;
}

/**
 * bilder: async iterierbar von ImageData-artigen Bildern gleicher Grösse → { blob, bytes, mime, endung, bilder, codec, ton }. bytes (seit 0.1.32)
 * ist derselbe Inhalt wie blob: wer ihn ablegt, liest den Blob nicht zurück (auf Android scheitert das, wenn der Blob-Speicher voll ist).
 * ton: { pcm (einkanalig), rate, beginn (s), dauer (s) } legt diesen Ausschnitt als Tonspur unter das MP4. Folgt dasselbe Bildobjekt
 * mehrmals (eine gehaltene Station), wird es nur einmal gemalt.
 */
export async function videoAus(bilder, { fps = FPS, melden = () => {}, halten = 1, ton = null } = {}) {
  const it = bilder[Symbol.asyncIterator]();
  const erstes = (await it.next()).value;
  if (!erstes) throw new Error("keine Bilder");
  const w = erstes.width - (erstes.width % 2), h = erstes.height - (erstes.height % 2);
  const c = document.createElement("canvas"); c.width = w; c.height = h;
  const ctx = c.getContext("2d", { alpha: false });
  let gemalt = null;
  const malen = (b) => b === gemalt || (gemalt = b, ctx.putImageData(b instanceof ImageData ? b : new ImageData(new Uint8ClampedArray(b.data), b.width, b.height), 0, 0));
  const k = await konfiguration(w, h);
  if (k) {
    const spur = ton ? await tonspur(ton) : null;
    const target = new ArrayBufferTarget();
    const muxer = new Muxer({ target, fastStart: "in-memory", firstTimestampBehavior: "offset", video: { codec: k.muxer, width: w, height: h, frameRate: fps },
      ...(spur ? { audio: { codec: spur.codec, numberOfChannels: spur.kanaele, sampleRate: spur.rate } } : {}) });
    spur?.proben.forEach((p, i) => muxer.addAudioChunkRaw(p.daten, p.key ? "key" : "delta", p.zeit, p.dauer, i ? undefined : spur.meta));
    let fehler = null;
    const enc = new VideoEncoder({ output: (chunk, meta) => muxer.addVideoChunk(chunk, meta), error: (e) => { fehler = e; } });
    enc.configure(k.cfg);
    let n = 0;
    const kodiere = async (b, wiederholt = 1) => {
      malen(b);
      for (let r = 0; r < wiederholt; r++) {
        const f = new VideoFrame(c, { timestamp: Math.round((n * 1e6) / fps), duration: Math.round(1e6 / fps) });
        enc.encode(f, { keyFrame: n % (fps * 2) === 0 }); f.close(); n++;
        if (enc.encodeQueueSize > 8) await new Promise((ok) => setTimeout(ok, 0));
      }
      if (fehler) throw fehler;
    };
    await kodiere(erstes);
    let vorher = erstes;
    for (let r = await it.next(); !r.done; r = await it.next()) { await kodiere(r.value); vorher = r.value; if (n % 15 === 0) melden(`Animation: ${n} Bilder kodiert`); }
    await kodiere(vorher, Math.round(halten * fps));   // am Ende kurz stehen bleiben
    await enc.flush(); enc.close(); muxer.finalize();
    if (fehler) throw fehler;
    const bytes = new Uint8Array(target.buffer);
    return { blob: new Blob([bytes], { type: "video/mp4" }), bytes, mime: "video/mp4", endung: "mp4", bilder: n, codec: k.cfg.codec, breite: w, hoehe: h, ton: spur ? `${spur.codec}${spur.kanaele === 2 ? " stereo" : ""}${spur.bitrate ? ` ${spur.bitrate / 1000} kbit/s` : ""}` : null };
  }
  // Rückfall: MediaRecorder in Echtzeit
  const typ = ["video/webm;codecs=vp9", "video/webm;codecs=vp8", "video/webm"].find((t) => typeof MediaRecorder !== "undefined" && MediaRecorder.isTypeSupported(t));
  if (!typ || !c.captureStream) throw new Error("Dieser Browser kann keine Videos erzeugen (weder WebCodecs noch MediaRecorder)");
  const strom = c.captureStream(0), spur = strom.getVideoTracks()[0];
  const rec = new MediaRecorder(strom, { mimeType: typ, videoBitsPerSecond: 6_000_000 });
  const stuecke = []; rec.ondataavailable = (e) => e.data.size && stuecke.push(e.data);
  const fertig = new Promise((ok) => { rec.onstop = ok; });
  rec.start(1000);
  const t0 = performance.now(); let n = 0;
  const zeige = async (b) => { malen(b); spur.requestFrame?.(); n++; await new Promise((ok) => setTimeout(ok, Math.max(0, t0 + (n * 1000) / fps - performance.now()))); };
  await zeige(erstes);
  for (let r = await it.next(); !r.done; r = await it.next()) await zeige(r.value);
  await new Promise((ok) => setTimeout(ok, halten * 1000));
  rec.stop(); await fertig;
  const roh = await dateiLesen(new Blob(stuecke)), bytes = mitDauer(roh, (performance.now() - t0) / 1000);
  return { blob: new Blob([bytes], { type: "video/webm" }), bytes, mime: "video/webm", endung: "webm", bilder: n, codec: typ, breite: w, hoehe: h, ton: null };
}

/**
 * einen Ausschnitt eines Tons (ein oder zwei Spuren) als Tonspur kodieren. tonKodieren aus PHORMA III erwartet einen AudioBuffer: hier dessen
 * Form. AAC kodieren die Browser nur bei 44,1 und 48 kHz: ein Klang mit 88,2 oder 96 kHz wird dafür auf 48 kHz umgetastet (die WAV behält ihre Rate).
 */
async function tonspur({ pcm, spuren = null, rate, beginn = 0, dauer }) {
  const { tonKodieren } = await modulLaden(new URL("../../../alpha/phorma-iii/tonspur.js?v=23", import.meta.url).href, { titel: "Die Tonspur (PHORMA III)" });
  const { rateWandeln } = await import("../kern/klangwerk.js");
  const ab = Math.max(0, Math.round(beginn * rate)), ziel = rate === 44100 || rate === 48000 ? rate : 48000;
  const kanaele = (spuren?.length ? spuren : [pcm]).slice(0, 2).map((s) => rateWandeln(s.subarray(Math.min(s.length, ab), Math.min(s.length, ab + Math.ceil(dauer * rate) + rate)), rate, ziel));
  const buffer = { sampleRate: ziel, numberOfChannels: kanaele.length, length: kanaele[0].length, getChannelData: (k) => kanaele[k] };
  return (await tonHoch(buffer, dauer)) ?? tonKodieren(buffer, dauer, { ausblenden: 0.5 });
}

/** AAC mit 320 kbit/s versuchen (wie tonKodieren, nur die höchste Stufe); null, wenn der Encoder das nicht kann */
async function tonHoch(buffer, dauer, ausblenden = 0.5) {
  if (typeof AudioEncoder === "undefined" || typeof AudioData === "undefined") return null;
  const cfg = { codec: "mp4a.40.2", sampleRate: buffer.sampleRate, numberOfChannels: buffer.numberOfChannels, bitrate: 320_000 };
  try { if (!(await AudioEncoder.isConfigSupported(cfg)).supported) return null; } catch { return null; }
  const proben = [];
  let meta = null, fehler = null;
  const enc = new AudioEncoder({
    output: (chunk, m) => { if (m?.decoderConfig && !meta) meta = m; const d = new Uint8Array(chunk.byteLength); chunk.copyTo(d); proben.push({ daten: d, key: chunk.type === "key", zeit: chunk.timestamp, dauer: chunk.duration ?? 0 }); },
    error: (e) => { fehler = e; },
  });
  enc.configure(cfg);
  const rate = buffer.sampleRate, k = buffer.numberOfChannels, n = Math.min(buffer.length, Math.round(dauer * rate)), aus = Math.round(ausblenden * rate), block = 4096;
  for (let i0 = 0; i0 < n; i0 += block) {
    if (fehler) break;
    const m = Math.min(block, n - i0), d = new Float32Array(m * k);
    for (let c = 0; c < k; c++) { const q = buffer.getChannelData(c); for (let i = 0; i < m; i++) d[c * m + i] = q[i0 + i] * Math.min(1, (n - (i0 + i)) / aus); }
    const a = new AudioData({ format: "f32-planar", sampleRate: rate, numberOfFrames: m, numberOfChannels: k, timestamp: Math.round((i0 / rate) * 1e6), data: d });
    enc.encode(a); a.close();
  }
  try { await enc.flush(); enc.close(); } catch { return null; }
  if (fehler || !proben.length) return null;
  return { proben, meta, codec: "aac", rate, kanaele: k, bitrate: cfg.bitrate };
}
