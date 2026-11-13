// Social-Paket zu einer Musik-Veröffentlichung unter listen/<slug>/ (13. November 2026): je Track ein kurzer Film mit Ton in zwei Formaten
// (1080 × 1920 für Reels, Stories, TikTok; 1080 × 1080 für den Feed), ein Standbild und die Beitragstexte (deutsch und englisch).
// Alles kommt aus listen/<slug>/ep.json: Name, Titel, Cover, Audioquelle, Trackmarken. Die Audiodatei wird nur gelesen.
//
//   NODE_PATH=$(npm root -g) node tools/social-paket.mjs <slug> [--audio <Pfad>] [--aus <Ordner>] [--sekunden 24] [--nur <Tracknummer>] [--probe]
//
//   --audio     die durchgehende WAV der Veröffentlichung; ohne Angabe listen/<slug>/<«audio» aus ep.json> (nicht in Git, liegt auf dem Webserver)
//   --aus       Zielordner; ohne Angabe docs/social/<slug>/ (docs/ geht nicht auf den Webserver)
//   --sekunden  Länge der Filme; ohne Angabe «social.sekunden» aus ep.json, sonst 24
//   --nur       nur dieser Track (1 = erster)
//   --probe     statt der echten Datei ein gerechneter Ton (tools/beispielton.mjs) in der Länge jedes Tracks – nur zum Prüfen von Bild und Ablauf.
//               Die Dateien heissen dann PROBE-…, und texte.md sagt es im Kopf.
//
// Optionale Felder in ep.json: «art» (z. B. «Maxi»; «artEn» für die englischen Texte), «jahr» (sonst das Jahr aus «datum»), «adresse» (sonst https://ornament.cloud/listen/<slug>/) und
// «social»: { "sekunden": 24, "ausschnitte": { "<Tracktitel>": <Startsekunde im Track> }, "texte": { "de": "…", "en": "…" } }.
//
// Ablauf je Track:
//   1. Nur der Bereich des Tracks wird aus der WAV gelesen (RIFF von Hand: PCM 16/24/32 Bit, 32 Bit Float, mono/stereo, auch WAVE_FORMAT_EXTENSIBLE)
//      und zu Mono gemischt; die Datei von rund 200 MB liegt nie ganz im Speicher.
//   2. Analyse je Filmbild (30 je Sekunde): Hüllkurve (RMS) und Tiefenanteil (einpoliger Tiefpass bei 150 Hz, dann RMS), geglättet, auf 0–1 normiert.
//   3. Ausschnitt: «social.ausschnitte» oder das Fenster mit der höchsten mittleren Energie (Raster 1 s), nie über das Trackende hinaus.
//   4. Die Seite tools/social/szene.html zeichnet in Chromium Bild für Bild auf einen 2D-Canvas (window.bild(i), kein Echtzeit-Mitschnitt);
//      die JPEG gehen über eine Pipe an ffmpeg (image2pipe), der Ton des Ausschnitts kommt als kleine WAV dazu. H.264 (crf 20, yuv420p, faststart),
//      AAC 192 kbit/s, Bild und Ton 0,5 s ein- und 1 s ausgeblendet.
// Braucht ffmpeg im PATH und Playwright (Chromium). Die reinen Rechnungen sind exportiert und ohne Browser getestet (tests/social-paket.test.mjs).
import { createServer } from "node:http";
import { openSync, readSync, closeSync, readFileSync, writeFileSync, mkdirSync, mkdtempSync, rmSync, statSync, existsSync, realpathSync } from "node:fs";
import { extname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { spawn } from "node:child_process";
import { createRequire } from "node:module";
import { tmpdir } from "node:os";

export const FPS = 30, STRICHE = 96, SEKUNDEN = 24, EIN = 0.5, AUS = 1;
export const FORMATE = [{ name: "9x16", breite: 1080, hoehe: 1920 }, { name: "1x1", breite: 1080, hoehe: 1080 }];

// ---------- WAV ----------

/** Liest fmt- und data-Chunk einer WAV (Pfad oder Buffer): Format (1 = PCM, 3 = Float), Kanäle, Rate, Bits, Lage und Zahl der Samples */
export function wavKopf(quelle) {
  const istBuffer = Buffer.isBuffer(quelle), fd = istBuffer ? null : openSync(quelle, "r"), name = istBuffer ? "WAV" : quelle;
  const groesse = istBuffer ? quelle.length : statSync(quelle).size;
  const lies = (n, pos) => { if (istBuffer) return quelle.subarray(pos, pos + n); const b = Buffer.alloc(n); return b.subarray(0, readSync(fd, b, 0, n, pos)); };
  try {
    const kopf = lies(12, 0);
    if (kopf.length < 12 || kopf.toString("ascii", 0, 4) !== "RIFF" || kopf.toString("ascii", 8, 12) !== "WAVE") throw new Error(`${name}: keine RIFF/WAVE-Datei`);
    let pos = 12, fmt = null;
    while (pos + 8 <= groesse) {
      const ch = lies(8, pos), id = ch.toString("ascii", 0, 4), len = ch.readUInt32LE(4);
      if (id === "fmt ") {
        const f = lies(Math.min(len, 40), pos + 8);
        if (f.length < 16) throw new Error(`${name}: fmt-Chunk zu kurz`);
        fmt = { format: f.readUInt16LE(0), kanaele: f.readUInt16LE(2), rate: f.readUInt32LE(4), blockAlign: f.readUInt16LE(12), bits: f.readUInt16LE(14) };
        if (fmt.format === 0xfffe && f.length >= 26) fmt.format = f.readUInt16LE(24);   // WAVE_FORMAT_EXTENSIBLE: der Untertyp sagt PCM oder Float
      } else if (id === "data") {
        if (!fmt) throw new Error(`${name}: data vor fmt`);
        const lesbar = (fmt.format === 1 && [16, 24, 32].includes(fmt.bits)) || (fmt.format === 3 && fmt.bits === 32);
        if (!lesbar || fmt.kanaele < 1 || fmt.kanaele > 2 || fmt.blockAlign !== (fmt.kanaele * fmt.bits) / 8)
          throw new Error(`${name}: Format nicht unterstützt (Typ ${fmt.format}, ${fmt.bits} Bit, ${fmt.kanaele} Kanäle) – erwartet PCM 16/24/32 Bit oder 32 Bit Float, mono oder stereo`);
        const bytes = Math.min(len, groesse - pos - 8);   // manche Programme schreiben bei grossen Dateien eine falsche Länge: höchstens bis zum Dateiende
        return { ...fmt, dataStart: pos + 8, dataBytes: bytes, frames: Math.floor(bytes / fmt.blockAlign) };
      }
      pos += 8 + len + (len & 1);
    }
    throw new Error(`${name}: kein data-Chunk`);
  } finally { if (fd !== null) closeSync(fd); }
}

/** Die rohen Bytes eines Bereichs (start, anzahl in Frames) aus Pfad oder Buffer, auf das Vorhandene begrenzt */
export function wavBytes(quelle, kopf, start, anzahl) {
  const von = Math.max(0, Math.min(kopf.frames, Math.round(start))), n = Math.max(0, Math.min(kopf.frames - von, Math.round(anzahl)));
  const pos = kopf.dataStart + von * kopf.blockAlign, bytes = n * kopf.blockAlign;
  if (Buffer.isBuffer(quelle)) return quelle.subarray(pos, pos + bytes);
  const b = Buffer.alloc(bytes), fd = openSync(quelle, "r");
  try { let da = 0; while (da < bytes) { const r = readSync(fd, b, da, Math.min(1 << 22, bytes - da), pos + da); if (!r) break; da += r; } } finally { closeSync(fd); }
  return b;
}

/** Ein Bereich der WAV als Mono (Mittel der Kanäle), Float32 in −1…1. Gelesen wird in Stücken von 4 MB, nie die ganze Datei. */
export function wavBereich(quelle, kopf, start, anzahl) {
  const von = Math.max(0, Math.min(kopf.frames, Math.round(start))), n = Math.max(0, Math.min(kopf.frames - von, Math.round(anzahl)));
  const aus = new Float32Array(n), { blockAlign, kanaele, bits, format } = kopf, bps = bits / 8;
  const wert = format === 3 ? (b, o) => b.readFloatLE(o)
    : bits === 16 ? (b, o) => b.readInt16LE(o) / 32768
    : bits === 24 ? (b, o) => b.readIntLE(o, 3) / 8388608
    : (b, o) => b.readInt32LE(o) / 2147483648;
  const STUECK = Math.floor((1 << 22) / blockAlign);
  for (let i = 0; i < n; i += STUECK) {
    const m = Math.min(STUECK, n - i), b = wavBytes(quelle, kopf, von + i, m);
    for (let k = 0; k < m; k++) {
      const o = k * blockAlign;
      aus[i + k] = kanaele === 2 ? (wert(b, o) + wert(b, o + bps)) / 2 : wert(b, o);
    }
  }
  return aus;
}

/** Eine kleine WAV aus rohen Bytes im Format der Quelle (für ffmpeg: der Ausschnitt, bitgleich, ohne Umrechnen) */
export function wavDatei(kopf, bytes) {
  const k = Buffer.alloc(44);
  k.write("RIFF", 0); k.writeUInt32LE(36 + bytes.length, 4); k.write("WAVEfmt ", 8); k.writeUInt32LE(16, 16);
  k.writeUInt16LE(kopf.format, 20); k.writeUInt16LE(kopf.kanaele, 22); k.writeUInt32LE(kopf.rate, 24); k.writeUInt32LE(kopf.rate * kopf.blockAlign, 28);
  k.writeUInt16LE(kopf.blockAlign, 32); k.writeUInt16LE(kopf.bits, 34); k.write("data", 36); k.writeUInt32LE(bytes.length, 40);
  return Buffer.concat([k, bytes]);
}

// ---------- Analyse ----------

/** glättet ohne Verzug: einpolig vorwärts und rückwärts über die Bilder (zeit = Zeitkonstante in Bildern) */
export function glaetten(werte, zeit) {
  const n = werte.length, aus = Float32Array.from(werte), a = zeit > 0 ? Math.exp(-1 / zeit) : 0;
  for (let i = 1; i < n; i++) aus[i] = a * aus[i - 1] + (1 - a) * aus[i];
  for (let i = n - 2; i >= 0; i--) aus[i] = a * aus[i + 1] + (1 - a) * aus[i];
  return aus;
}

/** auf 0–1: geteilt durch den grössten Wert (Stille bleibt 0) */
export function normieren(werte) {
  let max = 0;
  for (const w of werte) if (w > max) max = w;
  return Float32Array.from(werte, (w) => (max > 0 ? Math.min(1, Math.max(0, w / max)) : 0));
}

/**
 * Hüllkurve und Tiefenanteil je Filmbild. pcm: Mono in −1…1. Liefert
 *   huelle, tiefe: geglättet und auf 0–1 normiert (Länge = Zahl der Bilder)
 *   energie: mittleres Quadrat je Bild, roh (für die Wahl des Ausschnitts)
 */
export function huellkurve(pcm, rate, { fps = FPS, grenze = 150 } = {}) {
  const bilder = Math.max(1, Math.round((pcm.length * fps) / rate));
  const energie = new Float32Array(bilder), tief = new Float32Array(bilder);
  const a = 1 - Math.exp((-2 * Math.PI * grenze) / rate);   // einpoliger Tiefpass
  let y = 0, i = 0;
  for (let b = 0; b < bilder; b++) {
    const bis = Math.min(pcm.length, b === bilder - 1 ? pcm.length : Math.round(((b + 1) * rate) / fps));
    let s = 0, st = 0;
    const von = i;
    for (; i < bis; i++) { const x = pcm[i]; y += a * (x - y); s += x * x; st += y * y; }
    const n = Math.max(1, bis - von);
    energie[b] = s / n; tief[b] = st / n;
  }
  const rms = (e) => Float32Array.from(e, Math.sqrt);
  return {
    huelle: normieren(glaetten(rms(energie), fps * 0.05)),
    tiefe: normieren(glaetten(rms(tief), fps * 0.12)),
    energie,
  };
}

/**
 * Wählt den Ausschnitt eines Tracks. energie: je Bild (aus huellkurve), sekunden: gewünschte Länge, vorgabe: Startsekunde aus ep.json (oder null).
 * Ohne Vorgabe das Fenster mit der höchsten mittleren Energie im Raster von 1 s. Liefert { start, dauer } in Sekunden, immer innerhalb des Tracks.
 */
export function ausschnittWaehlen(energie, { fps = FPS, sekunden = SEKUNDEN, vorgabe = null } = {}) {
  const ganz = energie.length / fps, dauer = Math.min(sekunden, ganz), spaetest = Math.max(0, ganz - dauer);
  if (vorgabe !== null && vorgabe !== undefined && Number.isFinite(Number(vorgabe))) return { start: Math.min(spaetest, Math.max(0, Number(vorgabe))), dauer, gewaehlt: "ep.json" };
  const summe = new Float64Array(energie.length + 1);
  for (let i = 0; i < energie.length; i++) summe[i + 1] = summe[i] + energie[i];
  const n = Math.round(dauer * fps);
  let best = 0, bestWert = -1;
  for (let s = 0; s <= Math.floor(spaetest + 1e-9); s++) {
    const i0 = Math.round(s * fps), wert = summe[Math.min(energie.length, i0 + n)] - summe[i0];
    if (wert > bestWert * (1 + 1e-9)) { bestWert = wert; best = s; }   // bei Gleichstand das frühere Fenster
  }
  return { start: best, dauer, gewaehlt: "Energie" };
}

/**
 * Die Hüllkurve des Ausschnitts auf anzahl Striche: je Strich das Mittel seiner Bilder, neu auf 0–1 normiert. Vorher wird ein Teil des
 * kleinsten Werts abgezogen: dicht gemasterte Musik schwankt wenig, die Zeile bliebe sonst fast gleich hoch.
 */
export function striche(huelle, anzahl = STRICHE) {
  const aus = new Float32Array(anzahl), n = huelle.length;
  for (let k = 0; k < anzahl; k++) {
    const von = Math.floor((k * n) / anzahl), bis = Math.max(von + 1, Math.floor(((k + 1) * n) / anzahl));
    let s = 0, m = 0;
    for (let i = von; i < Math.min(n, bis); i++) { s += huelle[i]; m++; }
    aus[k] = m ? s / m : 0;
  }
  const boden = 0.7 * aus.reduce((x, y) => Math.min(x, y), Infinity);
  return normieren(aus.map((w) => w - boden));
}

// ---------- Namen und Texte ----------

/** Kleinbuchstaben, Bindestriche, keine Umlaute */
export function kurzname(text) {
  return String(text).toLowerCase().replace(/ä/g, "ae").replace(/ö/g, "oe").replace(/ü/g, "ue").replace(/ß/g, "ss")
    .normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || "track";
}

/** <slug>-01-<trackslug>-9x16.mp4; im Probelauf mit PROBE- davor */
export function dateiname(slug, nr, titel, format, endung, { probe = false } = {}) {
  return `${probe ? "PROBE-" : ""}${kurzname(slug)}-${String(nr).padStart(2, "0")}-${kurzname(titel)}-${format}.${endung}`;
}

/** Vorgaben für die optionalen Felder von ep.json und die Gesamtdauer */
export function angaben(ep, slug) {
  const rate = ep.abtastrate || 44100, tracks = ep.tracks || [];
  const samples = tracks.reduce((s, t) => s + (t.samples || 0), 0);
  const adresse = ep.adresse || `https://ornament.cloud/listen/${slug}/`;
  return {
    name: ep.anzeigename || "", titel: ep.titel || slug, art: ep.art || "", artEn: ep.artEn || ep.art || "",
    jahr: ep.jahr ? String(ep.jahr) : /^\d{4}/.test(ep.datum || "") ? ep.datum.slice(0, 4) : "",
    adresse, adresseKurz: adresse.replace(/^https?:\/\//, "").replace(/\/+$/, ""),
    tracks: tracks.map((t) => t.titel), minuten: Math.max(1, Math.round(samples / rate / 60)),
    texte: { de: ep.social?.texte?.de || "", en: ep.social?.texte?.en || "" },
  };
}

/** höchstens drei schlichte Hashtags aus Name und Titel */
export function hashtags(a) {
  const tag = (t) => "#" + kurzname(t).replace(/-/g, "");
  return [...new Set([a.name, a.titel].filter(Boolean).map(tag))].slice(0, 3).join(" ");
}

/**
 * Beitragstexte: nur Angaben aus ep.json, keine Beschreibung der Musik. track: Nummer ab 1 oder null für die Veröffentlichung als Ganzes.
 * Liefert { de: { kurz, lang }, en: { kurz, lang } }.
 */
export function beitragstexte(ep, slug, track = null) {
  const a = angaben(ep, slug), n = a.tracks.length, tags = hashtags(a);
  const wer = a.name ? `${a.name} – ` : "", jahr = a.jahr ? ` (${a.jahr})` : "", klammer = (art) => (art || a.jahr ? ` (${[art, a.jahr].filter(Boolean).join(", ")})` : "");
  const sprachen = {
    de: {
      werk: a.art ? `der ${a.art} «${a.titel}»` : `«${a.titel}»`, werkAllein: `«${a.titel}»${klammer(a.art)}`,
      aus: "Aus", von: (i) => `Track ${i} von ${n}`, umfang: `${n} ${n === 1 ? "Track" : "Tracks am Stück"}, ${a.minuten} ${a.minuten === 1 ? "Minute" : "Minuten"}`, hoeren: "Hören:",
    },
    en: {
      werk: a.artEn ? `the ${a.artEn} “${a.titel}”` : `“${a.titel}”`, werkAllein: `“${a.titel}”${klammer(a.artEn)}`,
      aus: "From", von: (i) => `Track ${i} of ${n}`, umfang: `${n} ${n === 1 ? "track" : "tracks in one piece"}, ${a.minuten} ${a.minuten === 1 ? "minute" : "minutes"}`, hoeren: "Listen:",
    },
  };
  const aus = {};
  for (const [sprache, w] of Object.entries(sprachen)) {
    const eigen = a.texte[sprache] ? [a.texte[sprache]] : [];
    if (track === null) {
      aus[sprache] = {
        kurz: `${wer}${w.werkAllein}\n${a.adresse}`,
        lang: [...eigen, `${wer}${w.werkAllein}`, w.umfang + ": " + a.tracks.join(", "), `${w.hoeren} ${a.adresse}`, tags].filter(Boolean).join("\n"),
      };
    } else {
      const titel = a.tracks[track - 1];
      const q = sprache === "de" ? `«${titel}»` : `“${titel}”`;
      aus[sprache] = {
        kurz: `${wer}${q}. ${w.aus} ${w.werk}${jahr}.\n${a.adresse}`,
        lang: [...eigen, `${wer}${q}`, `${w.von(track)} ${sprache === "de" ? "aus" : "from"} ${w.werk}${jahr}`, w.umfang, `${w.hoeren} ${a.adresse}`, tags].filter(Boolean).join("\n"),
      };
    }
  }
  return aus;
}

/** texte.md: die Veröffentlichung als Ganzes, dann je Track; filme: [{ nr, titel, dateien: [..], start, dauer }] */
export function texteMd(ep, slug, { probe = false, filme = [] } = {}) {
  const a = angaben(ep, slug), z = [];
  const block = (t) => "```text\n" + t + "\n```";
  const abschnitt = (texte) => {
    for (const [kopf, sprache] of [["Deutsch", "de"], ["English", "en"]]) z.push(`### ${kopf}`, "", "Kurz:", "", block(texte[sprache].kurz), "", "Lang:", "", block(texte[sprache].lang), "");
  };
  z.push(`# ${probe ? "PROBE – " : ""}Beitragstexte: ${a.name ? a.name + " – " : ""}${a.titel}`, "");
  if (probe) z.push("**PROBE: Die Filme in diesem Ordner tragen einen gerechneten Testton, nicht die Musik. Nicht veröffentlichen.**", "");
  z.push(`Erzeugt von \`tools/social-paket.mjs ${slug}\` aus \`listen/${slug}/ep.json\`. Die Texte enthalten nur Angaben von dort; anpassen nach Belieben.`, "");
  z.push("## Die Veröffentlichung als Ganzes", "");
  abschnitt(beitragstexte(ep, slug, null));
  a.tracks.forEach((titel, i) => {
    z.push(`## ${String(i + 1).padStart(2, "0")} ${titel}`, "");
    const f = filme.find((x) => x.nr === i + 1);
    if (f) z.push(`Dateien: ${f.dateien.map((d) => "`" + d + "`").join(", ")}  `, `Ausschnitt: ab ${zeit(f.start)} im Track, ${f.dauer.toFixed(1).replace(".", ",")} s (${f.gewaehlt === "ep.json" ? "aus ep.json" : "automatisch: lauteste Stelle"})`, "");
    abschnitt(beitragstexte(ep, slug, i + 1));
  });
  return z.join("\n").replace(/\n+$/, "\n");
}

const zeit = (s) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`;

// ---------- Aufruf ----------

/** liest die Argumente der Befehlszeile */
export function argumente(argv) {
  const o = { slug: null, audio: null, aus: null, sekunden: null, nur: null, probe: false };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--probe") o.probe = true;
    else if (["--audio", "--aus", "--sekunden", "--nur"].includes(a)) {
      const w = argv[++i];
      if (w === undefined) throw new Error(`${a} braucht einen Wert`);
      o[a.slice(2)] = a === "--sekunden" || a === "--nur" ? Number(w) : w;
    } else if (a.startsWith("--")) throw new Error(`Unbekannte Angabe ${a}`);
    else if (o.slug === null) o.slug = a;
    else throw new Error(`Zu viele Angaben: ${a}`);
  }
  if (!o.slug || !/^[a-z0-9-]+$/.test(o.slug)) throw new Error("Aufruf: node tools/social-paket.mjs <slug> [--audio <Pfad>] [--aus <Ordner>] [--sekunden 24] [--nur <Tracknummer>] [--probe]");
  if (o.sekunden !== null && !(o.sekunden > 0)) throw new Error("--sekunden braucht eine Zahl über 0");
  if (o.nur !== null && !(Number.isInteger(o.nur) && o.nur >= 1)) throw new Error("--nur braucht eine Tracknummer ab 1");
  return o;
}

async function lauf() {
  const o = argumente(process.argv.slice(2));
  const root = fileURLToPath(new URL("../", import.meta.url)), ordner = join(root, "listen", o.slug);
  if (!existsSync(join(ordner, "ep.json"))) throw new Error(`listen/${o.slug}/ep.json fehlt – gibt es die Veröffentlichung «${o.slug}»?`);
  const ep = JSON.parse(readFileSync(join(ordner, "ep.json"), "utf8")), a = angaben(ep, o.slug);
  const sekunden = o.sekunden ?? (ep.social?.sekunden > 0 ? ep.social.sekunden : SEKUNDEN);
  const ziel = resolve(o.aus || join(root, "docs/social", o.slug)); mkdirSync(ziel, { recursive: true });
  const tracks = ep.tracks.map((t, i) => ({ ...t, nr: i + 1 })).filter((t) => o.nur === null || t.nr === o.nur);
  if (!tracks.length) throw new Error(`Track ${o.nur} gibt es nicht (${ep.tracks.length} Tracks)`);
  if (tracks.some((t) => !(t.samples > 0) || !(t.startSample >= 0))) throw new Error("ep.json: Trackmarken (startSample, samples) fehlen – zuerst tools/ep-wav.mjs laufen lassen");

  const audio = o.audio ? resolve(o.audio) : join(ordner, ep.audio || "");
  let kopf = null;
  if (!o.probe) {
    if (!ep.audio && !o.audio) throw new Error("ep.json nennt keine Audiodatei («audio»)");
    if (!existsSync(audio) || !statSync(audio).isFile())
      throw new Error(`Audiodatei fehlt: ${audio}\n  Sie ist nicht in Git. Sie liegt auf dem Webserver: ${a.adresse}${ep.audio}\n  Herunterladen nach listen/${o.slug}/${ep.audio} oder mit --audio <Pfad> angeben. Nur Bild und Ablauf prüfen: --probe`);
    kopf = wavKopf(audio);
    if (ep.abtastrate && kopf.rate !== ep.abtastrate) throw new Error(`${audio}: ${kopf.rate} Hz, ep.json sagt ${ep.abtastrate} Hz – die Trackmarken passen nicht zu dieser Datei`);
    const ende = Math.max(...ep.tracks.map((t) => t.startSample + t.samples));
    if (kopf.frames < ende) console.warn(`Achtung: ${audio} hat ${kopf.frames} Samples, ep.json rechnet mit ${ende} – ist es die richtige Datei?`);
    console.log(`Ton: ${audio} (${kopf.format === 3 ? "Float" : "PCM"} ${kopf.bits} Bit, ${kopf.kanaele === 2 ? "stereo" : "mono"}, ${kopf.rate} Hz, ${zeit(kopf.frames / kopf.rate)})`);
  } else console.log("PROBE: gerechneter Testton statt der Musik");

  const require = createRequire(import.meta.url);
  let playwright;
  try { playwright = require("playwright"); } catch { playwright = require(join(process.env.NODE_PATH || "", "playwright")); }
  const types = { ".html": "text/html; charset=utf-8", ".css": "text/css", ".js": "text/javascript", ".woff2": "font/woff2", ".jpg": "image/jpeg", ".png": "image/png", ".webp": "image/webp" };
  const server = createServer((req, res) => {
    const p = decodeURIComponent(new URL(req.url, "http://x").pathname), pfad = join(root, p);
    let body; try { if (!pfad.startsWith(root)) throw 0; body = readFileSync(pfad); } catch { res.writeHead(404).end(); return; }
    res.writeHead(200, { "content-type": types[extname(p)] || "application/octet-stream" }).end(body);
  });
  await new Promise((r) => server.listen(0, "127.0.0.1", r));
  const base = `http://127.0.0.1:${server.address().port}`;
  const browser = await playwright.chromium.launch();
  const temp = mkdtempSync(join(tmpdir(), "social-paket-")), filme = [];
  try {
    for (const t of tracks) {
      // 1. der Bereich des Tracks, im Probelauf ein gerechneter Ton in dessen Länge
      let quelle = audio, k = kopf, start = t.startSample;
      if (o.probe) {
        const { beispielton } = await import("./beispielton.mjs");
        quelle = beispielton({ dauer: t.samples / (ep.abtastrate || 44100), rate: ep.abtastrate || 44100 }); k = wavKopf(quelle); start = 0;
      }
      const pcm = wavBereich(quelle, k, start, t.samples);
      if (!pcm.length) throw new Error(`Track ${t.nr} «${t.titel}»: liegt ausserhalb der Audiodatei`);
      // 2. und 3. Analyse und Ausschnitt
      const ganz = huellkurve(pcm, k.rate), wahl = ausschnittWaehlen(ganz.energie, { sekunden, vorgabe: ep.social?.ausschnitte?.[t.titel] ?? null });
      const b0 = Math.round(wahl.start * FPS), bilder = Math.max(1, Math.min(ganz.huelle.length - b0, Math.round(wahl.dauer * FPS))), dauer = bilder / FPS;
      const huelle = normieren(ganz.huelle.subarray(b0, b0 + bilder)), tiefe = normieren(ganz.tiefe.subarray(b0, b0 + bilder));
      const tonPfad = join(temp, `ton-${t.nr}.wav`);
      writeFileSync(tonPfad, wavDatei(k, wavBytes(quelle, k, start + Math.round(wahl.start * k.rate), Math.round(dauer * k.rate))));
      console.log(`${String(t.nr).padStart(2, "0")} ${t.titel}: Ausschnitt ab ${zeit(wahl.start)} (${wahl.gewaehlt}), ${dauer.toFixed(1)} s, ${bilder} Bilder`);
      // 4. Filme
      const dateien = [];
      for (const f of FORMATE) {
        const t0 = Date.now(), name = dateiname(o.slug, t.nr, t.titel, f.name, "mp4", { probe: o.probe });
        const page = await browser.newPage({ viewport: { width: 1280, height: 800 }, deviceScaleFactor: 1 });
        const fehler = []; page.on("pageerror", (e) => fehler.push(e.message));
        await page.goto(`${base}/tools/social/szene.html`, { waitUntil: "load" });
        await page.evaluate((d) => window.einrichten(d), {
          breite: f.breite, hoehe: f.hoehe, cover: `/listen/${o.slug}/${ep.cover || "cover.jpg"}`, bilder,
          name: a.name, titel: t.titel, unterzeile: [a.titel, a.art].filter(Boolean).join(" · "), adresse: a.adresseKurz,
          striche: [...striche(huelle)], tiefe: [...tiefe],
        });
        const ein = Math.min(EIN, dauer / 4), aus = Math.min(AUS, dauer / 2);
        const ff = spawn("ffmpeg", ["-y", "-loglevel", "error", "-f", "image2pipe", "-framerate", String(FPS), "-c:v", "mjpeg", "-i", "-", "-i", tonPfad,
          // JPEG ist volle Spanne nach BT.601; der Film bekommt BT.709 in begrenzter Spanne und sagt das auch, damit die Farben des Covers überall stimmen
          "-vf", `scale=out_color_matrix=bt709:out_range=tv,format=yuv420p,fade=t=in:st=0:d=${ein.toFixed(3)},fade=t=out:st=${(dauer - aus).toFixed(3)}:d=${aus.toFixed(3)}`,
          "-af", `afade=t=in:st=0:d=${ein.toFixed(3)},afade=t=out:st=${(dauer - aus).toFixed(3)}:d=${aus.toFixed(3)}`,
          "-c:v", "libx264", "-preset", "medium", "-crf", "20", "-pix_fmt", "yuv420p", "-colorspace", "bt709", "-color_primaries", "bt709", "-color_trc", "bt709", "-color_range", "tv",
          "-c:a", "aac", "-b:a", "192k", "-t", dauer.toFixed(3), "-movflags", "+faststart", join(ziel, name)], { stdio: ["pipe", "inherit", "pipe"] });
        let ffFehler = ""; ff.stderr.on("data", (d) => { ffFehler += d; });
        const fertig = new Promise((ok, nein) => { ff.on("error", nein); ff.on("close", (code) => (code === 0 ? ok() : nein(new Error(`ffmpeg (${name}): ${ffFehler.trim() || "Code " + code}`)))); });
        ff.stdin.on("error", () => {});   // bricht ffmpeg ab, meldet es «close» mit dem Grund
        const standbild = Math.min(bilder - 1, Math.round(bilder * 0.4));
        for (let i = 0; i < bilder; i++) {
          const jpg = Buffer.from((await page.evaluate((i) => window.bildJpeg(i), i)).split(",")[1], "base64");
          if (i === standbild && f.name === "9x16") { const n = dateiname(o.slug, t.nr, t.titel, f.name, "jpg", { probe: o.probe }); writeFileSync(join(ziel, n), jpg); dateien.push(n); }
          if (ff.exitCode !== null) break;
          if (!ff.stdin.write(jpg)) await new Promise((r) => ff.stdin.once("drain", r));
        }
        ff.stdin.end();
        await fertig;
        await page.close();
        if (fehler.length) throw new Error(`Fehler in der Szene: ${fehler.join(" | ")}`);
        dateien.push(name);
        console.log(`   ${name}: ${Math.round(statSync(join(ziel, name)).size / 1024)} KB, gerechnet in ${((Date.now() - t0) / 1000).toFixed(1)} s`);
      }
      filme.push({ nr: t.nr, titel: t.titel, dateien: dateien.sort(), start: wahl.start, dauer, gewaehlt: wahl.gewaehlt });
    }
    writeFileSync(join(ziel, "texte.md"), texteMd(ep, o.slug, { probe: o.probe, filme }));
    console.log(`Fertig: ${ziel} (${filme.length} ${filme.length === 1 ? "Track" : "Tracks"}, texte.md)`);
  } finally {
    await browser.close(); server.close(); rmSync(temp, { recursive: true, force: true });
  }
}

if (process.argv[1] && realpathSync(process.argv[1]) === fileURLToPath(import.meta.url)) {
  lauf().catch((e) => { console.error(e.message); process.exit(1); });
}
