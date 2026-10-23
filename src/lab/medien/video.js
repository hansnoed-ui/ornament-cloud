// ORNAMENT LAB – kurze Animation aus einer Bildfolge. Bevorzugt WebCodecs (schneller als Echtzeit) mit mp4-muxer 5.2.2 (MIT, lokal in vendor/,
// wie PHORMA); H.264, sonst VP9 im MP4. Ohne WebCodecs: MediaRecorder (WebM) in Echtzeit, die Dauer wird mit dauer.js aus The Fictory nachgetragen.
import { Muxer, ArrayBufferTarget } from "../../../vendor/mp4-muxer-5.2.2/mp4-muxer.js";
import { mitDauer } from "../../../alpha/the-fictory/dauer.js?v=23";

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

/** bilder: async iterierbar von ImageData-artigen Bildern gleicher Grösse → { blob, mime, endung, bilder, codec } */
export async function videoAus(bilder, { fps = FPS, melden = () => {}, halten = 1 } = {}) {
  const it = bilder[Symbol.asyncIterator]();
  const erstes = (await it.next()).value;
  if (!erstes) throw new Error("keine Bilder");
  const w = erstes.width - (erstes.width % 2), h = erstes.height - (erstes.height % 2);
  const c = document.createElement("canvas"); c.width = w; c.height = h;
  const ctx = c.getContext("2d", { alpha: false });
  const malen = (b) => ctx.putImageData(b instanceof ImageData ? b : new ImageData(new Uint8ClampedArray(b.data), b.width, b.height), 0, 0);
  const k = await konfiguration(w, h);
  if (k) {
    const target = new ArrayBufferTarget();
    const muxer = new Muxer({ target, fastStart: "in-memory", firstTimestampBehavior: "offset", video: { codec: k.muxer, width: w, height: h, frameRate: fps } });
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
    return { blob: new Blob([target.buffer], { type: "video/mp4" }), mime: "video/mp4", endung: "mp4", bilder: n, codec: k.cfg.codec, breite: w, hoehe: h };
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
  const roh = new Uint8Array(await new Blob(stuecke).arrayBuffer());
  return { blob: new Blob([mitDauer(roh, (performance.now() - t0) / 1000)], { type: "video/webm" }), mime: "video/webm", endung: "webm", bilder: n, codec: typ, breite: w, hoehe: h };
}
