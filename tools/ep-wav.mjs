// Baut aus den fertigen Masterdateien einer EP EINE durchgehende WAV (PCM, Stereo, 16 Bit, 44,1 kHz) und schreibt die Startmarken der Tracks
// in die Konfiguration der Hörseite (ep.json). Die Masterdateien werden nur gelesen.
//
//   node tools/ep-wav.mjs [--ep listen/directer/ep.json] [--aus <ziel.wav>] [--behalten] <master1> <master2> <master3>
//
// Reihenfolge der Master = Reihenfolge der Tracks in ep.json. Ohne --aus landet die WAV dort, wohin «audio» in ep.json zeigt
// (listen/directer/audio/the-i-directer.wav, von Git ignoriert). Braucht ffmpeg und ffprobe im PATH.
//
// Ablauf:
//   1. Jeder Master wird für sich vorbereitet (Zwischenexport im Temp-Ordner): Stereo, 44,1 kHz (soxr), 16 Bit (Dreiecks-Dither, nur wenn die
//      Quelle mehr als 16 Bit hat). Keine Pegeländerung, kein Normalisieren, kein Kürzen: Stille am Anfang und Ende bleibt, wie sie ist.
//      Ist ein Master schon 16 Bit / 44,1 kHz / Stereo, bleiben die Samples bitgleich.
//   2. Die Samplezahl jeder vorbereiteten Spur steht in ihrem data-Chunk. Die Startmarke eines Tracks ist die Summe der Samples davor.
//   3. Die Samples werden ohne Lücke hintereinander in eine WAV geschrieben, die Marken (startSample, samples) in ep.json.
//   4. Hat ein Track in ep.json ein Feld «datei», entsteht dort zusätzlich seine Einzeldatei zum Herunterladen (dieselben Samples).
// Die Zwischenexporte werden danach gelöscht (--behalten lässt sie liegen und nennt den Ordner).
import { spawnSync } from "node:child_process";
import { openSync, readSync, closeSync, writeSync, readFileSync, writeFileSync, mkdtempSync, rmSync, statSync, existsSync, mkdirSync, realpathSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve, dirname, basename } from "node:path";
import { fileURLToPath } from "node:url";

export const RATE = 44100, KANAELE = 2, BITS = 16, BLOCK = (KANAELE * BITS) / 8;

/** Liest fmt- und data-Chunk einer WAV (RIFF): Format, Lage und Länge der Samples */
export function wavInfo(datei) {
  const fd = openSync(datei, "r");
  try {
    const kopf = Buffer.alloc(12);
    readSync(fd, kopf, 0, 12, 0);
    if (kopf.toString("ascii", 0, 4) !== "RIFF" || kopf.toString("ascii", 8, 12) !== "WAVE") throw new Error(`${datei}: keine RIFF/WAVE-Datei`);
    const groesse = statSync(datei).size;
    let pos = 12, fmt = null;
    const ch = Buffer.alloc(8);
    while (pos + 8 <= groesse) {
      readSync(fd, ch, 0, 8, pos);
      const id = ch.toString("ascii", 0, 4), len = ch.readUInt32LE(4);
      if (id === "fmt ") {
        const f = Buffer.alloc(Math.min(len, 40));
        readSync(fd, f, 0, f.length, pos + 8);
        fmt = { format: f.readUInt16LE(0), kanaele: f.readUInt16LE(2), rate: f.readUInt32LE(4), blockAlign: f.readUInt16LE(12), bits: f.readUInt16LE(14) };
        if (fmt.format === 0xfffe && f.length >= 26) fmt.format = f.readUInt16LE(24);   // WAVE_FORMAT_EXTENSIBLE: Untertyp
      } else if (id === "data") {
        if (!fmt) throw new Error(`${datei}: data vor fmt`);
        const bytes = Math.min(len, groesse - pos - 8);
        return { ...fmt, dataStart: pos + 8, dataBytes: bytes, frames: Math.floor(bytes / fmt.blockAlign) };
      }
      pos += 8 + len + (len & 1);
    }
    throw new Error(`${datei}: kein data-Chunk`);
  } finally { closeSync(fd); }
}

/** 44-Byte-Kopf einer PCM-WAV */
export function wavKopf(frames, rate = RATE, kanaele = KANAELE, bits = BITS) {
  const block = (kanaele * bits) / 8, data = frames * block, b = Buffer.alloc(44);
  if (36 + data > 0xffffffff) throw new Error("Die WAV würde grösser als 4 GB");
  b.write("RIFF", 0, "ascii"); b.writeUInt32LE(36 + data, 4); b.write("WAVE", 8, "ascii");
  b.write("fmt ", 12, "ascii"); b.writeUInt32LE(16, 16); b.writeUInt16LE(1, 20); b.writeUInt16LE(kanaele, 22);
  b.writeUInt32LE(rate, 24); b.writeUInt32LE(rate * block, 28); b.writeUInt16LE(block, 32); b.writeUInt16LE(bits, 34);
  b.write("data", 36, "ascii"); b.writeUInt32LE(data, 40);
  return b;
}

/** Startmarken aus den Samplezahlen der vorbereiteten Spuren */
export function marken(samples) {
  let summe = 0;
  return samples.map((n) => { const s = summe; summe += n; return { startSample: s, samples: n }; });
}

/** Trägt die Marken in die Konfiguration ein, alles andere bleibt */
export function markenEintragen(ep, liste) {
  if (liste.length !== ep.tracks.length) throw new Error(`ep.json hat ${ep.tracks.length} Tracks, es gibt ${liste.length} Marken`);
  if (ep.abtastrate !== RATE) throw new Error(`ep.json: abtastrate ist ${ep.abtastrate}, die WAV hat ${RATE}`);
  ep.tracks.forEach((t, i) => { t.startSample = liste[i].startSample; t.samples = liste[i].samples; });
  return ep;
}

const zeit = (frames) => { const s = frames / RATE, m = Math.floor(s / 60); return `${m}:${(s - m * 60).toFixed(3).padStart(6, "0")}`; };

function lauf(cmd, args) {
  const r = spawnSync(cmd, args, { encoding: "utf8", maxBuffer: 64 * 1024 * 1024 });
  if (r.error) throw new Error(`${cmd} lässt sich nicht starten (${r.error.code}). Ist ffmpeg installiert und im PATH?`);
  if (r.status !== 0) throw new Error(`${cmd} ${args.join(" ")}\n${r.stderr.split("\n").slice(-15).join("\n")}`);
  return r.stdout;
}

function quelleLesen(datei) {
  const j = JSON.parse(lauf("ffprobe", ["-v", "error", "-select_streams", "a:0", "-show_entries", "stream=codec_name,sample_rate,channels,bits_per_raw_sample,bits_per_sample,sample_fmt", "-of", "json", datei]));
  const s = j.streams && j.streams[0];
  if (!s) throw new Error(`${datei}: keine Tonspur`);
  const bits = Number(s.bits_per_raw_sample) || Number(s.bits_per_sample) || (/^(s32|flt|dbl)/.test(s.sample_fmt) ? 32 : /^s16/.test(s.sample_fmt) ? 16 : 24);
  return { codec: s.codec_name, rate: Number(s.sample_rate), kanaele: Number(s.channels), bits };
}

/** Bereitet einen Master vor: Stereo, 44,1 kHz, 16 Bit; ohne Pegeländerung und ohne Kürzen */
function vorbereiten(master, ziel) {
  const q = quelleLesen(master);
  if (q.kanaele > 2) throw new Error(`${master}: ${q.kanaele} Kanäle. Bitte einen Stereo-Master angeben, eine Abmischung auf zwei Kanäle wäre ein Eingriff in den Master.`);
  const af = [];
  const filter = [];
  if (q.rate !== RATE) filter.push(`osr=${RATE}`, "resampler=soxr", "precision=28");
  if (q.bits > 16) filter.push("osf=s16", "dither_method=triangular");
  if (filter.length) af.push("-af", `aresample=${filter.join(":")}`);
  lauf("ffmpeg", ["-hide_banner", "-nostdin", "-y", "-i", master, "-map", "0:a:0", "-vn", "-ac", "2", ...af, "-c:a", "pcm_s16le", "-ar", String(RATE),
    "-map_metadata", "-1", "-fflags", "+bitexact", "-flags:a", "+bitexact", "-f", "wav", ziel]);
  const info = wavInfo(ziel);
  if (info.format !== 1 || info.kanaele !== KANAELE || info.bits !== BITS || info.rate !== RATE) throw new Error(`${ziel}: unerwartetes Format ${JSON.stringify(info)}`);
  return { quelle: q, info };
}

/** Spitzenwert und Anzahl Samples am Anschlag (±32767/−32768) eines vorbereiteten data-Chunks */
function spitze(datei, info) {
  const fd = openSync(datei, "r"), buf = Buffer.alloc(1 << 20);
  let pos = info.dataStart, rest = info.dataBytes, max = 0, anschlag = 0;
  try {
    while (rest > 0) {
      const n = readSync(fd, buf, 0, Math.min(buf.length, rest), pos);
      if (n <= 0) break;
      for (let i = 0; i + 1 < n; i += 2) { const v = buf.readInt16LE(i), a = v < 0 ? -v : v; if (a > max) max = a; if (v >= 32767 || v <= -32768) anschlag++; }
      pos += n; rest -= n;
    }
  } finally { closeSync(fd); }
  return { dbfs: max ? 20 * Math.log10(max / 32768) : -Infinity, anschlag };
}

function zusammenfuegen(spuren, ziel) {
  const frames = spuren.reduce((s, x) => s + x.info.frames, 0);
  mkdirSync(dirname(ziel), { recursive: true });
  const aus = openSync(ziel, "w"), buf = Buffer.alloc(4 << 20);
  try {
    writeSync(aus, wavKopf(frames));
    for (const { datei, info } of spuren) {
      const fd = openSync(datei, "r");
      let pos = info.dataStart, rest = info.frames * BLOCK;
      try {
        while (rest > 0) {
          const n = readSync(fd, buf, 0, Math.min(buf.length, rest), pos);
          if (n <= 0) throw new Error(`${datei}: endet zu früh`);
          writeSync(aus, buf, 0, n);
          pos += n; rest -= n;
        }
      } finally { closeSync(fd); }
    }
  } finally { closeSync(aus); }
  return frames;
}

function main(argv) {
  let epPfad = "listen/directer/ep.json", aus = null, behalten = false;
  const master = [];
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === "--ep") epPfad = argv[++i];
    else if (argv[i] === "--aus") aus = argv[++i];
    else if (argv[i] === "--behalten") behalten = true;
    else if (argv[i] === "-h" || argv[i] === "--help") { console.log(readFileSync(new URL(import.meta.url), "utf8").split("\nimport")[0]); return; }
    else master.push(argv[i]);
  }
  const ep = JSON.parse(readFileSync(epPfad, "utf8"));
  if (master.length !== ep.tracks.length) throw new Error(`${epPfad} hat ${ep.tracks.length} Tracks, angegeben sind ${master.length} Master. Reihenfolge = Trackreihenfolge.`);
  for (const m of master) if (!existsSync(m)) throw new Error(`Master fehlt: ${m}`);
  if (!aus) {
    if (!ep.audio || /^[a-z]+:/i.test(ep.audio)) throw new Error("«audio» in ep.json ist eine Adresse; bitte das Ziel mit --aus angeben");
    aus = resolve(dirname(epPfad), ep.audio);
  }
  const echt = (p) => { try { return realpathSync(p); } catch { return resolve(p); } };
  if (master.some((m) => echt(m) === echt(aus))) throw new Error("Das Ziel ist eine der Masterdateien. Die Master bleiben unangetastet: bitte ein anderes Ziel wählen.");

  const arbeit = mkdtempSync(join(tmpdir(), "ep-wav-"));
  try {
    const spuren = master.map((m, i) => {
      const datei = join(arbeit, `${String(i + 1).padStart(2, "0")}.wav`);
      process.stdout.write(`Track ${i + 1}: ${basename(m)} … `);
      const { quelle, info } = vorbereiten(m, datei);
      const sp = spitze(datei, info);
      console.log(`${quelle.codec} ${quelle.bits} Bit ${quelle.rate} Hz ${quelle.kanaele} Kanäle → ${info.frames} Samples (${zeit(info.frames)}), Spitze ${sp.dbfs.toFixed(2)} dBFS${sp.anschlag ? `, ${sp.anschlag} Samples am Anschlag` : ""}`);
      return { datei, info, quelle, sp };
    });
    const frames = zusammenfuegen(spuren, aus);
    // Einzeldateien zum Herunterladen: dieselben Samples wie in der durchgehenden WAV, je Track eine Datei («datei» in ep.json)
    const einzeln = [];
    ep.tracks.forEach((t, i) => {
      if (!t.datei) return;
      if (/^[a-z]+:/i.test(t.datei)) throw new Error(`Track ${i + 1}: «datei» ist eine Adresse, keine Datei`);
      const ziel = resolve(dirname(epPfad), t.datei);
      if (master.some((m) => echt(m) === echt(ziel)) || echt(ziel) === echt(aus)) throw new Error(`Track ${i + 1}: «datei» zeigt auf einen Master oder auf die EP-Datei`);
      zusammenfuegen([spuren[i]], ziel);
      einzeln.push(ziel);
    });
    const liste = marken(spuren.map((s) => s.info.frames));
    const kontrolle = wavInfo(aus);
    if (kontrolle.frames !== frames) throw new Error(`Kontrolle: ${kontrolle.frames} statt ${frames} Samples in ${aus}`);
    writeFileSync(epPfad, JSON.stringify(markenEintragen(ep, liste), null, 2) + "\n");

    console.log(`\n${aus}\n  PCM Stereo 16 Bit 44 100 Hz, ${frames} Samples (${zeit(frames)}), ${(statSync(aus).size / 1e6).toFixed(1)} MB`);
    console.log(`\nMarken in ${epPfad}:`);
    liste.forEach((m, i) => console.log(`  ${i + 1}  ${zeit(m.startSample).padStart(10)}  Sample ${String(m.startSample).padStart(10)}  ${ep.tracks[i].titel}`));
    if (einzeln.length) { console.log("\nEinzeldateien zum Herunterladen:"); for (const z of einzeln) console.log(`  ${z}  ${(statSync(z).size / 1e6).toFixed(1)} MB`); }
    if (spuren.some((s) => s.sp.anschlag)) console.log("\nHinweis: Samples am Anschlag. Beim Umrechnen auf 44,1 kHz können Spitzen zwischen den Samples hörbar werden; der Pegel wurde nicht verändert.");
    if (statSync(aus).size > 100e6) console.log("\nDie Datei ist grösser als 100 MB: nicht in Git (GitHub nimmt das nicht an), sondern separat hochladen (docs/ep-directer.md).");
    if (behalten) console.log(`\nZwischenexporte: ${arbeit}`);
  } finally {
    if (!behalten) rmSync(arbeit, { recursive: true, force: true });
  }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try { main(process.argv.slice(2)); } catch (e) { console.error(`\nFehler: ${e.message}`); process.exit(1); }
}
