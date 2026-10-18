// PHORMA II – das MP4 und seine Tonspur: die Audiodatei als AAC (WebCodecs AudioEncoder; ohne AAC Opus), auf die Länge des Films gekürzt, am Ende
// ausgeblendet; Bild und Ton schreibt mp4-muxer 5.2.2 (MIT, lokal in vendor/) in Teilen (mp4Schreiber). tonKodieren und tonLesen nur im Browser.
import { Muxer, StreamTarget } from "../../vendor/mp4-muxer-5.2.2/mp4-muxer.js";

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

/**
 * MP4 schreiben, während die Bilder kodiert werden – ohne die Datei je am Stück im Speicher zu halten (Rückmeldung vom 18. Oktober 2026 von einem
 * Telefon: «Array buffer allocation failed»; ein Gewebe so lang wie die Musik ergab bei 14 Mbit/s weit über 100 MB in einem Block, dazu alle Bilder
 * noch einmal einzeln). mp4-muxer schreibt in Teilen (StreamTarget), der Platz für «moov» wird vorn reserviert (fastStart mit der Zahl der Stücke)
 * und am Schluss hineingeschrieben; das Ergebnis ist ein Blob aus den Teilen. Ton (aus tonKodieren) wird vorab übergeben.
 */
export function mp4Schreiber({ breite, hoehe, fps, codec, bilder, ton = null }) {
  const teile = [];
  let ende = 0;
  const target = new StreamTarget({
    onData: (daten, lage) => {
      if (lage > ende) { teile.push({ lage: ende, daten: new Uint8Array(lage - ende) }); ende = lage; }   // der vorn reservierte Platz für moov
      if (lage === ende) { teile.push({ lage, daten }); ende += daten.length; return; }
      // in schon Geschriebenes (moov am Schluss in den reservierten Platz): die betroffenen Teile überschreiben
      let rest = daten, p = lage;
      for (const t of teile) {
        if (!rest.length) break;
        if (p >= t.lage + t.daten.length || p < t.lage) continue;
        const o = p - t.lage, n = Math.min(rest.length, t.daten.length - o);
        t.daten.set(rest.subarray(0, n), o); rest = rest.subarray(n); p += n;
      }
      if (rest.length) { teile.push({ lage: p, daten: rest.slice() }); ende += rest.length; }
    },
  });
  const muxer = new Muxer({ target, firstTimestampBehavior: "offset", fastStart: { expectedVideoChunks: bilder, expectedAudioChunks: ton ? ton.proben.length : 0 },
    video: { codec: "avc", width: breite, height: hoehe, frameRate: fps }, ...(ton ? { audio: { codec: ton.codec, numberOfChannels: ton.kanaele, sampleRate: ton.rate } } : {}) });
  ton?.proben.forEach((p, i) => muxer.addAudioChunkRaw(p.daten, p.key ? "key" : "delta", p.zeit, p.dauer, i ? undefined : ton.meta));
  let n = 0;
  return {
    /** ein kodiertes Bild (daten: Uint8Array); beim ersten die Beschreibung des Encoders (avcC) */
    bild(daten, key, zeit, avcC) {
      muxer.addVideoChunkRaw(daten, key ? "key" : "delta", zeit, Math.round(1e6 / fps), n++ ? undefined : { decoderConfig: { codec, codedWidth: breite, codedHeight: hoehe, description: avcC } });
    },
    fertig() { muxer.finalize(); return new Blob(teile.map((t) => t.daten), { type: "video/mp4" }); },
    get groesse() { return ende; },
  };
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
