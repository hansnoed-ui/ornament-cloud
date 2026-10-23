// ORNAMENT LAB – Medienspeicher im Browser. Bilder liegen als PNG (verlustfrei) unter medien/<ergebnis>.png, Daten als JSON, Videos als
// MP4/WebM, Tondateien unverändert in ihrem Format (WAV, MP3, …). Alles bleibt lokal im Speicher der Seite, bis das Projekt als Archiv
// gespeichert wird; nichts wird hochgeladen. Ton wird mit Web Audio dekodiert, in seiner eigenen Abtastrate (aus dem Kopf der Datei gelesen)
// und mit beiden Kanälen; für die Messungen kommt eine einkanalige Mischung dazu. Erzeugte Klänge liegen als WAV mit 24 Bit (seit Lab 0.1.7).
import { sha256, begrenzen } from "../kern/bilddaten.js";
import { GRENZEN } from "../kern/projekt.js";
import { wavBytes } from "../kern/klang.js";
import { abtastrateLesen, wavSchreiben, mono } from "../kern/klangwerk.js";

const leinwand = (w, h) => { const c = document.createElement("canvas"); c.width = w; c.height = h; return c; };
const alsBlob = (c, typ = "image/png") => new Promise((ok, nein) => c.toBlob((b) => (b ? ok(b) : nein(new Error("Bild konnte nicht kodiert werden"))), typ));
const ERLAUBT = new Set(["image/png", "image/jpeg", "image/webp", "image/gif", "image/avif", "image/bmp"]);
const HOECHSTENS_BYTES = 60 * 1024 * 1024;
const TON = new Map([["audio/wav", "wav"], ["audio/x-wav", "wav"], ["audio/wave", "wav"], ["audio/mpeg", "mp3"], ["audio/mp3", "mp3"], ["audio/ogg", "ogg"], ["audio/flac", "flac"], ["audio/x-flac", "flac"], ["audio/mp4", "m4a"], ["audio/x-m4a", "m4a"], ["audio/aac", "aac"], ["audio/webm", "webm"], ["audio/opus", "opus"]]);
const TON_ENDUNG = Object.fromEntries([...TON].reverse().map(([mime, endung]) => [endung, mime]));
const VIDEO = new Set(["video/mp4", "video/webm", "video/quicktime", "video/x-m4v", "video/ogg"]);
const VIDEO_ENDUNG = { mp4: "video/mp4", m4v: "video/x-m4v", mov: "video/quicktime", webm: "video/webm", ogv: "video/ogg" };
const VIDEO_BYTES = 300 * 1024 * 1024, VIDEO_TON_SEKUNDEN = 120;
const RATE = 48000;   // wenn der Kopf der Datei keine Abtastrate verrät (bis Lab 0.1.6 wurde alles auf 44,1 kHz gebracht)
/** Typ einer Datei im Archiv nach ihrer Endung */
const mimeNachName = (name) => { const x = name.split(".").pop(); return x === "png" ? "image/png" : x === "json" ? "application/json" : x === "mp4" ? "video/mp4" : x === "webm" && !/-(animation|stationen)\./.test(name) ? "audio/webm" : x === "webm" ? "video/webm" : TON_ENDUNG[x] ?? "application/octet-stream"; };

/**
 * Tonbytes → { spuren (höchstens zwei Kanäle), pcm (einkanalig gemischt), rate, dauer, kanaele } über Web Audio. decodeAudioData rechnet auf die
 * Abtastrate des Kontexts um; darum bekommt der Kontext die Rate, die im Kopf der Datei steht: ein Beat mit 48 oder 96 kHz bleibt so.
 */
async function dekodiereTon(bytes) {
  const Ctx = globalThis.OfflineAudioContext ?? globalThis.webkitOfflineAudioContext;
  if (!Ctx) throw new Error("Dieser Browser kann keinen Ton lesen (Web Audio fehlt)");
  const eigen = abtastrateLesen(bytes), rate = eigen >= 8000 && eigen <= 192000 ? eigen : RATE;
  let buf;
  try { buf = await new Ctx(1, 1, rate).decodeAudioData(bytes.slice().buffer); }
  catch (f) { if (rate === RATE) throw f; buf = await new Ctx(1, 1, RATE).decodeAudioData(bytes.slice().buffer); }
  const k = buf.numberOfChannels, spuren = Array.from({ length: Math.min(2, k) }, (_, c) => buf.getChannelData(c));
  let pcm = mono(spuren);
  if (k > 2) { pcm = new Float32Array(buf.length); for (let c = 0; c < k; c++) { const d = buf.getChannelData(c); for (let i = 0; i < d.length; i++) pcm[i] += d[i] / k; } }
  return { spuren, pcm, rate: buf.sampleRate, dauer: buf.duration, kanaele: k };
}

export function browserMedien() {
  const bilder = new Map(), toene = new Map(), dateien = new Map(), urls = new Map();
  const merke = (e, bytes, mime) => { dateien.set(e.datei, bytes); const u = URL.createObjectURL(new Blob([bytes], { type: mime })); urls.get(e.datei) && URL.revokeObjectURL(urls.get(e.datei)); urls.set(e.datei, u); };
  async function dekodiere(bytes, mime) {
    const bmp = await createImageBitmap(new Blob([bytes], { type: mime }), { imageOrientation: "from-image" });
    const c = leinwand(bmp.width, bmp.height), x = c.getContext("2d", { willReadFrequently: true });
    x.drawImage(bmp, 0, 0); bmp.close?.();
    return x.getImageData(0, 0, c.width, c.height);
  }
  async function pngBytes(b) {
    const c = leinwand(b.width, b.height);
    c.getContext("2d").putImageData(b instanceof ImageData ? b : new ImageData(new Uint8ClampedArray(b.data), b.width, b.height), 0, 0);
    return new Uint8Array(await (await alsBlob(c)).arrayBuffer());
  }
  return {
    dateien,
    url: (e) => (e?.datei ? urls.get(e.datei) ?? null : null),
    async bild(e) {
      if (bilder.has(e.id)) return bilder.get(e.id);
      const bytes = dateien.get(e.datei);
      if (!bytes) throw new Error(`Mediendatei fehlt: ${e.datei}`);
      const b = await dekodiere(bytes, e.mime || "image/png");
      bilder.set(e.id, b);
      return b;
    },
    /** ein Tonmaterial: einkanaliges PCM aus der abgelegten Datei (einmal dekodiert, dann gemerkt) */
    async ton(e) {
      if (toene.has(e.id)) return toene.get(e.id);
      const bytes = dateien.get(e.datei);
      if (!bytes) throw new Error(`Mediendatei fehlt: ${e.datei}`);
      const t = await dekodiereTon(bytes);
      toene.set(e.id, t);
      return t;
    },
    async ablegen(e, b) {
      const datei = `medien/${e.id}.png`, bytes = await pngBytes(b);
      e.datei = datei; merke(e, bytes, "image/png"); bilder.set(e.id, b);
      return { datei, sha256: await sha256(bytes), mime: "image/png", breite: b.width, hoehe: b.height, bytes: bytes.length };
    },
    async ablegenDaten(e, d) {
      const datei = `medien/${e.id}.json`, bytes = new TextEncoder().encode(JSON.stringify(d, null, 2));
      e.datei = datei; merke(e, bytes, "application/json");
      return { datei, sha256: await sha256(bytes), mime: "application/json", bytes: bytes.length };
    },
    async ablegenDatei(name, bytes, mime) {
      if (!/^medien\/[\w.-]+$/.test(name)) throw new Error(`unzulässiger Name: ${name}`);
      merke({ datei: name }, bytes, mime);
      return { datei: name, sha256: await sha256(bytes), mime, bytes: bytes.length };
    },
    /** eine Bilddatei des Benutzers lesen: Typ und Grösse prüfen, Ausrichtung anwenden, auf die Arbeitsgrösse begrenzen */
    async importiere(datei) {
      if (!ERLAUBT.has(datei.type)) throw new Error(`Dateityp ${datei.type || "unbekannt"} wird nicht angenommen (PNG, JPEG, WebP, GIF, AVIF, BMP)`);
      if (datei.size > HOECHSTENS_BYTES) throw new Error("Datei grösser als 60 MB");
      const bytes = new Uint8Array(await datei.arrayBuffer());
      const original = await dekodiere(bytes, datei.type);
      return { original: { name: datei.name, sha256: await sha256(bytes), breite: original.width, hoehe: original.height, mime: datei.type, bytes: bytes.length }, arbeit: begrenzen(original, GRENZEN.seite) };
    },
    /** eine Tondatei des Benutzers lesen: Typ, Grösse und Länge prüfen und dekodieren (abgelegt wird sie erst mit ablegenTon) */
    async importiereTon(datei) {
      const mime = datei.type || TON_ENDUNG[datei.name.split(".").pop().toLowerCase()] || "", endung = TON.get(mime);
      if (!endung) throw new Error(`Dateityp ${mime || "unbekannt"} wird nicht angenommen (WAV, MP3, OGG, FLAC, M4A, AAC, WebM, Opus)`);
      if (datei.size > HOECHSTENS_BYTES) throw new Error("Datei grösser als 60 MB");
      const bytes = new Uint8Array(await datei.arrayBuffer());
      let t;
      try { t = await dekodiereTon(bytes); } catch (f) { throw new Error(`der Ton liess sich nicht dekodieren (${f.message || f.name})`); }
      if (t.dauer > GRENZEN.tonSekunden) throw new Error(`Ton länger als ${GRENZEN.tonSekunden / 60} Minuten (${Math.round(t.dauer)} s)`);
      if (t.dauer < 0.2) throw new Error("Ton kürzer als 0,2 s");
      return { bytes, endung, mime, dekodiert: t, original: { name: datei.name, sha256: await sha256(bytes), mime, bytes: bytes.length },
        ton: { dauer: Math.round(t.dauer * 1000) / 1000, abtastrate: t.rate, kanaele: t.kanaele } };
    },
    /**
     * ein Video lesen (seit Lab 0.1.14): Standbilder gleichmässig über die Länge, in Arbeitsgrösse, und die Tonspur, höchstens die ersten
     * 120 s, als WAV mit 24 Bit. Das Video selbst kommt nicht ins Projekt, nur was daraus gelesen wurde; seine Prüfsumme steht in der Herkunft.
     * Der Browser muss das Format abspielen können (MP4 mit H.264 oder WebM fast überall, MOV je nach Gerät).
     */
    async importiereVideo(datei, { bilder: n = 6, melden = () => {} } = {}) {
      const mime = datei.type || VIDEO_ENDUNG[datei.name.split(".").pop().toLowerCase()] || "";
      if (!VIDEO.has(mime)) throw new Error(`Dateityp ${mime || "unbekannt"} wird nicht angenommen (MP4, WebM, MOV)`);
      if (datei.size > VIDEO_BYTES) throw new Error("Video grösser als 300 MB");
      const bytes = new Uint8Array(await datei.arrayBuffer());
      const url = URL.createObjectURL(new Blob([bytes], { type: mime }));
      const v = document.createElement("video");
      v.muted = true; v.playsInline = true; v.preload = "auto"; v.src = url;
      try {
        await new Promise((ok, nein) => { v.onloadeddata = ok; v.onerror = () => nein(new Error("dieser Browser kann das Video nicht lesen")); setTimeout(() => nein(new Error("das Video lädt nicht")), 20000); });
        const dauer = v.duration;
        if (!Number.isFinite(dauer) || dauer < 0.2) throw new Error("das Video hat keine lesbare Länge");
        const w0 = v.videoWidth, h0 = v.videoHeight, f = Math.min(1, GRENZEN.seite / Math.max(w0, h0));
        const c = leinwand(Math.max(1, Math.round(w0 * f)), Math.max(1, Math.round(h0 * f))), x = c.getContext("2d", { willReadFrequently: true });
        const stills = [];
        for (let i = 0; i < n; i++) {
          const zeit = Math.min(dauer - 0.05, ((i + 0.5) / n) * dauer);
          melden(`Standbild ${i + 1} von ${n} …`, i / n);
          await new Promise((ok) => { v.onseeked = ok; v.currentTime = Math.max(0, zeit); });
          x.drawImage(v, 0, 0, c.width, c.height);
          stills.push({ zeit: Math.round(zeit * 100) / 100, arbeit: x.getImageData(0, 0, c.width, c.height) });
        }
        const original = { name: datei.name, sha256: await sha256(bytes), mime, bytes: bytes.length, breite: w0, hoehe: h0, dauer: Math.round(dauer * 1000) / 1000 };
        // die Tonspur: decodeAudioData liest den Ton auch aus einem Video; ohne Ton (oder unlesbar) bleibt es bei den Bildern
        let ton = null;
        try {
          melden("Tonspur wird gelesen …", null);
          const t = await dekodiereTon(bytes), m = Math.min(t.pcm.length, Math.round(VIDEO_TON_SEKUNDEN * t.rate));
          const spuren = t.spuren.map((s) => s.slice(0, m)), pcm = t.pcm.slice(0, m), wav = wavSchreiben(spuren, t.rate, { bits: "24" });
          if (m / t.rate >= 0.2) ton = { bytes: wav, endung: "wav", mime: "audio/wav", dekodiert: { spuren, pcm, rate: t.rate, dauer: m / t.rate, kanaele: spuren.length },
            original: { name: `${datei.name} (Tonspur)`, sha256: await sha256(wav), mime: "audio/wav", bytes: wav.length }, gekuerzt: t.dauer > VIDEO_TON_SEKUNDEN,
            ton: { dauer: Math.round((m / t.rate) * 1000) / 1000, abtastrate: t.rate, kanaele: spuren.length } };
        } catch { ton = null; }
        return { original, bilder: stills, ton };
      } finally { v.removeAttribute("src"); v.load(); URL.revokeObjectURL(url); }
    },
    /** die Tondatei unverändert unter medien/<id>.<endung> ablegen */
    async ablegenTon(e, imp) {
      const datei = `medien/${e.id}.${imp.endung}`;
      e.datei = datei; merke(e, imp.bytes, imp.mime); toene.set(e.id, imp.dekodiert);
      return { datei, sha256: imp.original.sha256, mime: imp.mime, bytes: imp.bytes.length };
    },
    /**
     * einen erzeugten Klang als WAV ablegen: der Klangerzeuger einkanalig mit 16 Bit (wie seit 0.1.5), eine Klangtransformation mit ihren
     * Kanälen, in der Abtastrate der Quelle und mit 24 Bit. Das PCM bleibt für die nächste Operation, Tonsignal und Tonspur gemerkt.
     */
    async ablegenKlang(e, { pcm, rate, spuren = null }) {
      const datei = `medien/${e.id}.wav`, bytes = spuren ? wavSchreiben(spuren, rate, { bits: "24" }) : wavBytes(pcm, rate);
      e.datei = datei; merke(e, bytes, "audio/wav"); toene.set(e.id, { pcm, spuren: spuren ?? [pcm], rate, dauer: pcm.length / rate, kanaele: spuren?.length ?? 1 });
      return { datei, sha256: await sha256(bytes), mime: "audio/wav", bytes: bytes.length };
    },
    /** Medien eines geöffneten Archivs übernehmen */
    uebernehmen(medien) {
      for (const u of urls.values()) URL.revokeObjectURL(u);
      bilder.clear(); toene.clear(); dateien.clear(); urls.clear();
      for (const [name, bytes] of medien) merke({ datei: name }, bytes, mimeNachName(name));
    },
  };
}
