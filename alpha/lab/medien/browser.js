// ORNAMENT LAB – Medienspeicher im Browser. Bilder liegen als PNG (verlustfrei) unter medien/<ergebnis>.png, Daten als JSON, Videos als
// MP4/WebM, Tondateien unverändert in ihrem Format (WAV, MP3, …). Alles bleibt lokal im Speicher der Seite, bis das Projekt als Archiv
// gespeichert wird; nichts wird hochgeladen. Ton wird mit Web Audio dekodiert, einkanalig gemischt und auf 44,1 kHz gebracht.
import { sha256, begrenzen } from "../kern/bilddaten.js";
import { GRENZEN } from "../kern/projekt.js";

const leinwand = (w, h) => { const c = document.createElement("canvas"); c.width = w; c.height = h; return c; };
const alsBlob = (c, typ = "image/png") => new Promise((ok, nein) => c.toBlob((b) => (b ? ok(b) : nein(new Error("Bild konnte nicht kodiert werden"))), typ));
const ERLAUBT = new Set(["image/png", "image/jpeg", "image/webp", "image/gif", "image/avif", "image/bmp"]);
const HOECHSTENS_BYTES = 60 * 1024 * 1024;
const TON = new Map([["audio/wav", "wav"], ["audio/x-wav", "wav"], ["audio/wave", "wav"], ["audio/mpeg", "mp3"], ["audio/mp3", "mp3"], ["audio/ogg", "ogg"], ["audio/flac", "flac"], ["audio/x-flac", "flac"], ["audio/mp4", "m4a"], ["audio/x-m4a", "m4a"], ["audio/aac", "aac"], ["audio/webm", "webm"], ["audio/opus", "opus"]]);
const TON_ENDUNG = Object.fromEntries([...TON].reverse().map(([mime, endung]) => [endung, mime]));
const RATE = 44100;
/** Typ einer Datei im Archiv nach ihrer Endung */
const mimeNachName = (name) => { const x = name.split(".").pop(); return x === "png" ? "image/png" : x === "json" ? "application/json" : x === "mp4" ? "video/mp4" : x === "webm" && !/-(animation|stationen)\./.test(name) ? "audio/webm" : x === "webm" ? "video/webm" : TON_ENDUNG[x] ?? "application/octet-stream"; };

/** Tonbytes → { pcm (einkanalig), rate, dauer, kanaele } über Web Audio (OfflineAudioContext rechnet auf eine feste Abtastrate um) */
async function dekodiereTon(bytes) {
  const Ctx = globalThis.OfflineAudioContext ?? globalThis.webkitOfflineAudioContext;
  if (!Ctx) throw new Error("Dieser Browser kann keinen Ton lesen (Web Audio fehlt)");
  const ctx = new Ctx(1, 1, RATE);
  const buf = await ctx.decodeAudioData(bytes.slice().buffer);
  const pcm = new Float32Array(buf.length), k = buf.numberOfChannels;
  for (let c = 0; c < k; c++) { const d = buf.getChannelData(c); for (let i = 0; i < d.length; i++) pcm[i] += d[i] / k; }
  return { pcm, rate: buf.sampleRate, dauer: buf.duration, kanaele: k };
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
    /** die Tondatei unverändert unter medien/<id>.<endung> ablegen */
    async ablegenTon(e, imp) {
      const datei = `medien/${e.id}.${imp.endung}`;
      e.datei = datei; merke(e, imp.bytes, imp.mime); toene.set(e.id, imp.dekodiert);
      return { datei, sha256: imp.original.sha256, mime: imp.mime, bytes: imp.bytes.length };
    },
    /** Medien eines geöffneten Archivs übernehmen */
    uebernehmen(medien) {
      for (const u of urls.values()) URL.revokeObjectURL(u);
      bilder.clear(); toene.clear(); dateien.clear(); urls.clear();
      for (const [name, bytes] of medien) merke({ datei: name }, bytes, mimeNachName(name));
    },
  };
}
