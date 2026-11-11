// ORNAMENT LAB · Video – den Film als MP4 rechnen, im Browser: jedes Bild wird genau gesucht und gezeichnet (medien/zeichnen.js, wie die
// Vorschau), mit WebCodecs kodiert (H.264, sonst VP9) und mit mp4-muxer 5.2.2 (MIT, vendor/) verpackt; der Ton ist der gemischte Ton des
// Films (kern/ton.js), AAC (sonst Opus). Schneller als Echtzeit nur, wo das Suchen schnell ist; die Dauer hängt vom Gerät ab.
import { Muxer, ArrayBufferTarget } from "../../../../vendor/mp4-muxer-5.2.2/mp4-muxer.js";
import { bildBei, tonQuellen, zeitplan, FORMATE } from "../kern/folge.js";
import { mischen } from "../kern/ton.js";
import { Quellen, zeichnen, suchen, bereit } from "./zeichnen.js";
import { istIsoBmff, tonMitWebCodecs } from "../../medien/mp4ton.js";

const VIDEO_KANDIDATEN = [["avc1.640028", "avc"], ["avc1.4d0028", "avc"], ["avc1.42001f", "avc"], ["vp09.00.40.08", "vp9"]];
export const QUALITAETEN = Object.freeze({ voll: { name: "volle Grösse (1080 p)", faktor: 1, bitrate: 12_000_000 }, mittel: { name: "720 p (kleiner, schneller)", faktor: 2 / 3, bitrate: 6_000_000 } });

/** kann dieser Browser MP4 kodieren? */
export const exportMoeglich = () => typeof VideoEncoder !== "undefined" && typeof VideoFrame !== "undefined";

async function videoKonfig(w, h, fps, bitrate) {
  for (const [codec, muxer] of VIDEO_KANDIDATEN) {
    const cfg = { codec, width: w, height: h, bitrate, framerate: fps, ...(muxer === "avc" ? { avc: { format: "avc" } } : {}) };
    try { if ((await VideoEncoder.isConfigSupported(cfg)).supported) return { cfg, muxer }; } catch { /* nächster */ }
  }
  return null;
}

/** den Ton einer Datei dekodieren: { spuren, rate } oder null. Zuerst Web Audio, dann (MP4, MOV, M4A) der Dekoder des Geräts über WebCodecs */
export async function tonDekodieren(bytes) {
  try {
    const AC = globalThis.OfflineAudioContext ?? globalThis.webkitOfflineAudioContext;
    const ctx = new AC(2, 1, 48000), b = await ctx.decodeAudioData(bytes.slice().buffer);
    return { spuren: Array.from({ length: Math.min(2, b.numberOfChannels) }, (_, c) => b.getChannelData(c)), rate: b.sampleRate };
  } catch { /* zweiter Weg */ }
  if (istIsoBmff(bytes)) { try { const t = await tonMitWebCodecs(bytes); return { spuren: t.spuren, rate: t.rate }; } catch { /* stumm */ } }
  return null;
}

async function tonKodieren([L, R], rate, sekunden) {
  if (typeof AudioEncoder === "undefined" || typeof AudioData === "undefined") return null;
  for (const [codec, muxer, bitrate] of [["mp4a.40.2", "aac", 256_000], ["opus", "opus", 192_000]]) {
    const cfg = { codec, sampleRate: rate, numberOfChannels: 2, bitrate };
    try { if (!(await AudioEncoder.isConfigSupported(cfg)).supported) continue; } catch { continue; }
    const proben = []; let meta = null, fehler = null;
    const enc = new AudioEncoder({
      output: (chunk, m) => { if (m?.decoderConfig && !meta) meta = m; const d = new Uint8Array(chunk.byteLength); chunk.copyTo(d); proben.push({ daten: d, key: chunk.type === "key", zeit: chunk.timestamp, dauer: chunk.duration ?? 0 }); },
      error: (e) => { fehler = e; },
    });
    enc.configure(cfg);
    const n = Math.min(L.length, Math.round(sekunden * rate)), block = 4096;
    for (let a = 0; a < n && !fehler; a += block) {
      const m = Math.min(block, n - a), d = new Float32Array(2 * m);
      d.set(L.subarray(a, a + m), 0); d.set(R.subarray(a, a + m), m);
      const ad = new AudioData({ format: "f32-planar", sampleRate: rate, numberOfFrames: m, numberOfChannels: 2, timestamp: Math.round((a / rate) * 1e6), data: d });
      enc.encode(ad); ad.close();
    }
    try { await enc.flush(); enc.close(); } catch { continue; }
    if (!fehler && proben.length) return { proben, meta, codec: muxer, rate, bitrate };
  }
  return null;
}

/**
 * Den Film rechnen. projekt, doc (der geprüfte OpenFilm-Film, film() in folge.js); urls: Map Medium-Id → Objekt-URL; bytes: Map Medium-Id →
 * Uint8Array (für den Ton); qualitaet aus QUALITAETEN; fps; melden(text, anteil); abbrechen: AbortSignal. Gibt { blob, bytes, sekunden,
 * bilder, breite, hoehe, codec, ton } zurück.
 */
export async function exportieren({ projekt, doc, urls, bytes, qualitaet = "voll", fps = 30, melden = () => {}, abbrechen = null }) {
  if (!exportMoeglich()) throw new Error("Dieser Browser kann kein MP4 kodieren (WebCodecs fehlt). Chrome oder Edge können es.");
  const buehne = FORMATE[projekt.format], q = QUALITAETEN[qualitaet] ?? QUALITAETEN.voll;
  const w = Math.round((buehne.w * q.faktor) / 2) * 2, h = Math.round((buehne.h * q.faktor) / 2) * 2;
  const dauer = zeitplan(projekt).dauer;
  if (!(dauer > 0)) throw new Error("Der Film ist leer: zuerst etwas in die Folge legen");
  const k = await videoKonfig(w, h, fps, q.bitrate);
  if (!k) throw new Error(`Dieser Browser kann ${w} × ${h} nicht als H.264 oder VP9 kodieren`);

  // 1 · der Ton
  melden("Der Ton wird gemischt …", 0);
  const quellenTon = tonQuellen(projekt, doc), daten = new Map();
  for (const id of new Set(quellenTon.map((x) => x.medium))) { abbrechen?.throwIfAborted?.(); const d = await tonDekodieren(bytes.get(id)); if (d) daten.set(id, d); }
  const mix = quellenTon.length && daten.size ? mischen(quellenTon, daten, dauer, { rate: 48000 }) : null;
  const ton = mix && mix.spitze > 1e-5 ? await tonKodieren(mix.spuren, mix.rate, dauer) : null;

  // 2 · die Bilder
  const target = new ArrayBufferTarget();
  const muxer = new Muxer({ target, fastStart: "in-memory", firstTimestampBehavior: "offset", video: { codec: k.muxer, width: w, height: h, frameRate: fps },
    ...(ton ? { audio: { codec: ton.codec, numberOfChannels: 2, sampleRate: ton.rate } } : {}) });
  ton?.proben.forEach((p, i) => muxer.addAudioChunkRaw(p.daten, p.key ? "key" : "delta", p.zeit, p.dauer, i ? undefined : ton.meta));
  let fehler = null;
  const enc = new VideoEncoder({ output: (chunk, meta) => muxer.addVideoChunk(chunk, meta), error: (e) => { fehler = e; } });
  enc.configure(k.cfg);
  const canvas = document.createElement("canvas"); canvas.width = w; canvas.height = h;
  const ctx = canvas.getContext("2d", { alpha: false, willReadFrequently: false });
  const quellen = new Quellen(urls, { stumm: true }), filterVon = (id) => projekt.folge.find((c) => c.id === id)?.filter ?? null;
  const n = Math.max(1, Math.ceil(dauer * fps)), start = performance.now();
  try {
    for (let i = 0; i < n; i++) {
      abbrechen?.throwIfAborted?.();
      const t = i / fps, dinge = bildBei(projekt, doc, t);
      for (const d of dinge) {
        if (d.art === "video") { const v = quellen.video(d.clip.id, d.medium.id); await bereit(v); await suchen(v, d.quelle); }
        else if (d.art === "bild") await bereit(quellen.bild(d.medium.id));
      }
      zeichnen(ctx, w, h, buehne, dinge, quellen, filterVon);
      const f = new VideoFrame(canvas, { timestamp: Math.round((i * 1e6) / fps), duration: Math.round(1e6 / fps) });
      enc.encode(f, { keyFrame: i % (fps * 2) === 0 }); f.close();
      if (enc.encodeQueueSize > 6) await new Promise((ok) => setTimeout(ok, 0));
      if (fehler) throw fehler;
      if (i % 10 === 0) {
        const verstrichen = (performance.now() - start) / 1000, rest = i ? (verstrichen / i) * (n - i) : 0;
        melden(`Bild ${i + 1} von ${n}${i > 30 ? `, noch etwa ${Math.ceil(rest)} s` : ""} …`, i / n);
      }
    }
    await enc.flush();
  } finally { if (enc.state !== "closed") enc.close(); quellen.schliessen(); }
  if (fehler) throw fehler;
  muxer.finalize();
  const out = new Uint8Array(target.buffer);
  return { blob: new Blob([out], { type: "video/mp4" }), bytes: out, sekunden: dauer, bilder: n, breite: w, hoehe: h, codec: k.cfg.codec, ton: ton ? `${ton.codec} ${ton.bitrate / 1000} kbit/s` : null };
}
