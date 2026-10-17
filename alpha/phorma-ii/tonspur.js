// PHORMA II – die Tonspur im Video (nur im Browser): die Audiodatei als AAC (WebCodecs AudioEncoder; ohne AAC Opus), mit dem Bild zusammen in ein
// MP4 geschrieben – mit mp4-muxer 5.2.2 (MIT, lokal in vendor/), weil der MP4-Schreiber von Sketchory nur Bild kennt. Auf die Länge des Films
// gekürzt, am Ende ausgeblendet.
import { Muxer, ArrayBufferTarget } from "../../vendor/mp4-muxer-5.2.2/mp4-muxer.js";

/** die Tonspur (AudioBuffer) kodieren: { proben: [{ daten, key, zeit, dauer }], meta, codec, rate, kanaele } oder null, wenn der Browser es nicht kann */
export async function tonKodieren(buffer, dauer, { ausblenden = 1.2 } = {}) {
  if (typeof AudioEncoder === "undefined" || typeof AudioData === "undefined") return null;
  const rate = buffer.sampleRate, kanaele = Math.min(2, buffer.numberOfChannels);
  let cfg = null;
  for (const [codec, art] of [["mp4a.40.2", "aac"], ["opus", "opus"]]) {
    const c = { codec, sampleRate: rate, numberOfChannels: kanaele, bitrate: 192_000 };
    try { if ((await AudioEncoder.isConfigSupported(c)).supported) { cfg = { ...c, art }; break; } } catch { /* nächster */ }
  }
  if (!cfg) return null;
  const proben = [];
  let meta = null, fehler = null;
  const enc = new AudioEncoder({
    output: (chunk, m) => { if (m?.decoderConfig && !meta) meta = m; const d = new Uint8Array(chunk.byteLength); chunk.copyTo(d); proben.push({ daten: d, key: chunk.type === "key", zeit: chunk.timestamp, dauer: chunk.duration ?? 0 }); },
    error: (e) => { fehler = e; },
  });
  enc.configure({ codec: cfg.codec, sampleRate: rate, numberOfChannels: kanaele, bitrate: cfg.bitrate });
  const n = Math.min(buffer.length, Math.round(dauer * rate)), block = 4096, aus = Math.round(ausblenden * rate);
  const kan = Array.from({ length: kanaele }, (_, k) => buffer.getChannelData(k));
  for (let i0 = 0; i0 < n; i0 += block) {
    if (fehler) throw fehler;
    const m = Math.min(block, n - i0), d = new Float32Array(m * kanaele);
    for (let k = 0; k < kanaele; k++) for (let i = 0; i < m; i++) d[k * m + i] = kan[k][i0 + i] * Math.min(1, (n - (i0 + i)) / aus);
    const a = new AudioData({ format: "f32-planar", sampleRate: rate, numberOfFrames: m, numberOfChannels: kanaele, timestamp: Math.round((i0 / rate) * 1e6), data: d });
    enc.encode(a); a.close();
  }
  await enc.flush(); enc.close();
  if (fehler) throw fehler;
  return { proben, meta, codec: cfg.art, rate, kanaele };
}

/** Bild (H.264, avcC und Proben wie für Sketchory) und Ton zusammen als MP4 */
export function mp4MitTon({ breite, hoehe, fps, codec, avcC, bilder, ton }) {
  const muxer = new Muxer({ target: new ArrayBufferTarget(), fastStart: "in-memory", firstTimestampBehavior: "offset",
    video: { codec: "avc", width: breite, height: hoehe, frameRate: fps }, audio: { codec: ton.codec, numberOfChannels: ton.kanaele, sampleRate: ton.rate } });
  bilder.forEach((p, i) => muxer.addVideoChunkRaw(p.daten, p.key ? "key" : "delta", p.zeit, Math.round(1e6 / fps),
    i ? undefined : { decoderConfig: { codec, codedWidth: breite, codedHeight: hoehe, description: avcC } }));
  ton.proben.forEach((p, i) => muxer.addAudioChunkRaw(p.daten, p.key ? "key" : "delta", p.zeit, p.dauer, i ? undefined : ton.meta));
  muxer.finalize();
  return new Uint8Array(muxer.target.buffer);
}

/** Datei → { buffer (AudioBuffer), pcm (mono, Float32Array), rate } */
export async function tonLesen(datei) {
  const ctx = new (window.AudioContext || window.webkitAudioContext)();
  try {
    const buffer = await ctx.decodeAudioData(await datei.arrayBuffer());
    const pcm = new Float32Array(buffer.length);
    for (let k = 0; k < buffer.numberOfChannels; k++) { const c = buffer.getChannelData(k); for (let i = 0; i < c.length; i++) pcm[i] += c[i] / buffer.numberOfChannels; }
    return { buffer, pcm, rate: buffer.sampleRate };
  } finally { ctx.close?.(); }
}
