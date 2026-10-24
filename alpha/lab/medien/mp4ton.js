// ORNAMENT LAB – die Tonspur aus einer MP4-, MOV- oder M4A-Datei (ISO Base Media, seit Lab 0.1.20), als zweiter Leseweg neben Web Audio.
// decodeAudioData liest auf manchen Telefonen keinen AAC-Ton (Chrome für Android hat den Dekoder nicht in seiner FFmpeg-Fassung, der Ton
// eines Handyvideos ist aber fast immer AAC). Darum liest dieses Modul die Kästen der Datei selbst (moov → trak mit Handler «soun» → stbl),
// holt daraus die kodierten Tonstücke und gibt sie dem Dekoder des Browsers (WebCodecs, AudioDecoder), der den Dekoder des Geräts nutzt.
// Nur AAC (mp4a mit esds), MP3 in MP4 und Opus (dOps); fragmentierte Dateien (moof) und verschlüsselte Spuren (enca) werden abgelehnt.
// Das Lesen der Kästen ist ohne Browser und in tests/lab.test.mjs geprüft; der Dekoder braucht den Browser (tests/lab.e2e.mjs).

const text = (b, o) => String.fromCharCode(b[o], b[o + 1], b[o + 2], b[o + 3]);
const u16 = (b, o) => (b[o] << 8) | b[o + 1];
const u32 = (b, o) => ((b[o] << 24) | (b[o + 1] << 16) | (b[o + 2] << 8) | b[o + 3]) >>> 0;
const u64 = (b, o) => u32(b, o) * 4294967296 + u32(b, o + 4);

/** fängt die Datei mit einem ftyp- oder moov-Kasten an (MP4, MOV, M4A, 3GP)? */
export function istIsoBmff(bytes) {
  if (!bytes || bytes.length < 12) return false;
  const art = text(bytes, 4);
  return ["ftyp", "moov", "mdat", "free", "skip", "wide", "styp"].includes(art);
}

/** die Kästen in [von, bis): [{ art, von (Inhalt), bis }] */
function kaesten(b, von, bis) {
  const aus = [];
  let o = von;
  while (o + 8 <= bis) {
    let groesse = u32(b, o), kopf = 8;
    const art = text(b, o + 4);
    if (groesse === 1) { groesse = u64(b, o + 8); kopf = 16; } else if (groesse === 0) groesse = bis - o;
    if (groesse < kopf) break;
    aus.push({ art, von: o + kopf, bis: Math.min(bis, o + groesse) });
    o += groesse;
  }
  return aus;
}
const kind = (b, k, art) => kaesten(b, k.von, k.bis).find((x) => x.art === art) ?? null;
const kinder = (b, k, art) => kaesten(b, k.von, k.bis).filter((x) => x.art === art);
/** voller Kasten: 1 Byte Version, 3 Bytes Flags */
const voll = (k) => ({ version: 0, von: k.von + 4, bis: k.bis });

/** die Länge eines MPEG-4-Deskriptors (bis zu vier Bytes mit Fortsetzungsbit); gibt [laenge, neues o] */
function deskriptorLaenge(b, o) {
  let l = 0;
  for (let i = 0; i < 4; i++) { const x = b[o++]; l = (l << 7) | (x & 0x7f); if (!(x & 0x80)) break; }
  return [l, o];
}
/** aus dem esds: { objekt (ObjectTypeIndication), konfiguration (DecoderSpecificInfo, bei AAC die AudioSpecificConfig) } */
function esds(b, k) {
  const v = voll(k);
  let o = v.von, objekt = null, konfiguration = null;
  // ES_Descriptor (3) → DecoderConfigDescriptor (4) → DecoderSpecificInfo (5); dazwischen können andere stehen
  const lies = (bis) => {
    while (o < bis) {
      const tag = b[o++], [l, o2] = deskriptorLaenge(b, o); o = o2;
      const ende = Math.min(bis, o + l);
      if (tag === 3) { o += 2; const flags = b[o++]; if (flags & 0x80) o += 2; if (flags & 0x40) o += 1 + b[o]; if (flags & 0x20) o += 2; lies(ende); }
      else if (tag === 4) { objekt = b[o]; o += 13; lies(ende); }
      else if (tag === 5) { konfiguration = b.slice(o, ende); o = ende; }
      else o = ende;
    }
    o = bis;
  };
  lies(v.bis);
  return { objekt, konfiguration };
}
/** der Audio Object Type aus der AudioSpecificConfig (die ersten fünf Bits, 31 heisst: sechs weitere Bits + 32) */
function aacObjekt(asc) {
  if (!asc?.length) return 2;
  let t = asc[0] >> 3;
  if (t === 31) t = 32 + (((asc[0] & 7) << 3) | (asc[1] >> 5));
  return t;
}
/** OpusHead (für WebCodecs) aus dem dOps-Kasten: Felder dort big-endian, in OpusHead little-endian */
function opusHead(b, k) {
  const n = k.bis - k.von, kanaele = b[k.von + 1], mapping = b[k.von + 10];
  const kopf = new Uint8Array(19 + (mapping ? 2 + kanaele : 0)), d = new DataView(kopf.buffer);
  kopf.set([0x4f, 0x70, 0x75, 0x73, 0x48, 0x65, 0x61, 0x64], 0);   // "OpusHead"
  kopf[8] = 1; kopf[9] = kanaele;
  d.setUint16(10, u16(b, k.von + 2), true); d.setUint32(12, u32(b, k.von + 4), true); d.setInt16(16, u16(b, k.von + 8), true);
  kopf[18] = mapping;
  if (mapping && n >= 13 + kanaele) kopf.set(b.subarray(k.von + 11, k.von + 13 + kanaele), 19);
  return kopf;
}

/** die Tonspur (die erste mit Handler «soun») als Kodierung und Stücke: { codec, description, sampleRate, numberOfChannels, timescale, stuecke: [{ offset, size, zeit, dauer }], dauer } */
export function tonspurLesen(bytes, { sekunden = Infinity } = {}) {
  const b = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  if (!istIsoBmff(b)) throw new Error("keine MP4-Datei");
  const oben = kaesten(b, 0, b.length), moov = oben.find((k) => k.art === "moov");
  if (!moov) throw new Error("kein moov-Kasten (vielleicht noch nicht fertig geschrieben)");
  if (oben.some((k) => k.art === "moof")) throw new Error("fragmentiertes MP4 wird nicht gelesen");
  let fehler = "keine Tonspur";
  for (const trak of kinder(b, moov, "trak")) {
    const mdia = kind(b, trak, "mdia"); if (!mdia) continue;
    const hdlr = kind(b, mdia, "hdlr");
    if (!hdlr || text(b, hdlr.von + 8) !== "soun") continue;
    const mdhd = kind(b, mdia, "mdhd"), stbl = kind(b, kind(b, mdia, "minf") ?? mdia, "stbl");
    if (!mdhd || !stbl) continue;
    const timescale = b[mdhd.von] === 1 ? u32(b, mdhd.von + 20) : u32(b, mdhd.von + 12);
    // die Kodierung (stsd): mp4a mit esds (AAC oder MP3), Opus mit dOps
    const stsd = kind(b, stbl, "stsd"); if (!stsd) continue;
    const eintrag = kaesten(b, stsd.von + 8, stsd.bis)[0]; if (!eintrag) continue;
    if (eintrag.art === "enca") { fehler = "die Tonspur ist verschlüsselt"; continue; }
    const version = u16(b, eintrag.von + 8), kanaele = u16(b, eintrag.von + 16), rate = u32(b, eintrag.von + 24) >>> 16;
    const kinderAb = eintrag.von + 28 + (version === 1 ? 16 : version === 2 ? 36 : 0);
    const k = kaesten(b, kinderAb, eintrag.bis);
    let codec = null, description = null, numberOfChannels = kanaele || 2, sampleRate = rate || 48000;
    if (eintrag.art === "mp4a") {
      const e = k.find((x) => x.art === "esds") ?? (k.find((x) => x.art === "wave") ? kind(b, k.find((x) => x.art === "wave"), "esds") : null);
      const d = e ? esds(b, e) : { objekt: 0x40, konfiguration: null };
      if (d.objekt === 0x40 || d.objekt === 0x66 || d.objekt === 0x67 || d.objekt === 0x68) {
        codec = `mp4a.40.${aacObjekt(d.konfiguration)}`; description = d.konfiguration;
        if (d.konfiguration?.length >= 2) {   // Abtastrate und Kanäle stehen auch in der AudioSpecificConfig
          const asc = d.konfiguration, idx = ((asc[0] & 7) << 1) | (asc[1] >> 7), RATEN = [96000, 88200, 64000, 48000, 44100, 32000, 24000, 22050, 16000, 12000, 11025, 8000, 7350];
          if (idx < RATEN.length) sampleRate = RATEN[idx];
          const ch = (asc[1] >> 3) & 15; if (ch >= 1 && ch <= 7) numberOfChannels = ch === 7 ? 8 : ch;
        }
      } else if (d.objekt === 0x6b || d.objekt === 0x69) codec = "mp3";
      else { fehler = `Kodierung ${d.objekt?.toString(16) ?? "?"} wird nicht gelesen`; continue; }
    } else if (eintrag.art === "Opus") {
      const d = k.find((x) => x.art === "dOps"); if (!d) { fehler = "Opus ohne dOps"; continue; }
      codec = "opus"; description = opusHead(b, d); numberOfChannels = b[d.von + 1] || 2; sampleRate = 48000;
    } else { fehler = `Tonkodierung «${eintrag.art}» wird nicht gelesen`; continue; }
    // die Stücke: Dauern (stts), Grössen (stsz), Zuordnung zu den Blöcken (stsc) und deren Lage (stco/co64)
    const stts = kind(b, stbl, "stts"), stsz = kind(b, stbl, "stsz"), stsc = kind(b, stbl, "stsc"), stco = kind(b, stbl, "stco") ?? kind(b, stbl, "co64");
    if (!stts || !stsz || !stsc || !stco) { fehler = "Tabellen der Tonspur unvollständig"; continue; }
    const n = u32(b, stsz.von + 8), feste = u32(b, stsz.von + 4);
    const groesse = (i) => (feste ? feste : u32(b, stsz.von + 12 + 4 * i));
    const dauern = []; { const m = u32(b, stts.von + 4); for (let i = 0; i < m; i++) dauern.push([u32(b, stts.von + 8 + 8 * i), u32(b, stts.von + 12 + 8 * i)]); }
    const zuordnung = []; { const m = u32(b, stsc.von + 4); for (let i = 0; i < m; i++) zuordnung.push([u32(b, stsc.von + 8 + 12 * i), u32(b, stsc.von + 12 + 12 * i)]); }
    const bloecke = u32(b, stco.von + 4), lage = (j) => (stco.art === "co64" ? u64(b, stco.von + 8 + 8 * j) : u32(b, stco.von + 8 + 4 * j));
    const stuecke = [];
    let i = 0, zeit = 0, di = 0, dRest = dauern[0]?.[0] ?? 0, zi = 0;
    const grenze = sekunden * timescale;
    aussen: for (let j = 0; j < bloecke && i < n; j++) {
      while (zi + 1 < zuordnung.length && j + 1 >= zuordnung[zi + 1][0]) zi++;
      let offset = lage(j);
      for (let s = 0; s < zuordnung[zi][1] && i < n; s++, i++) {
        while (dRest === 0 && di + 1 < dauern.length) { di++; dRest = dauern[di][0]; }
        const dauer = dauern[di]?.[1] ?? 0, size = groesse(i);
        if (zeit > grenze) break aussen;
        stuecke.push({ offset, size, zeit, dauer });
        offset += size; zeit += dauer; if (dRest > 0) dRest--;
      }
    }
    if (!stuecke.length) { fehler = "die Tonspur hat keine Stücke"; continue; }
    const letzt = stuecke.at(-1);
    return { codec, description: description ?? null, sampleRate, numberOfChannels, timescale, stuecke, dauer: (letzt.zeit + letzt.dauer) / timescale };
  }
  throw new Error(fehler);
}

/** AudioData → Float32Array je Kanal (höchstens zwei), in jedem Format, das der Browser liefert */
function kanaeleAus(frame, hoechstens = 2) {
  const n = frame.numberOfFrames, k = Math.min(hoechstens, frame.numberOfChannels), f = frame.format ?? "f32-planar";
  const aus = [];
  if (f.endsWith("-planar")) {
    for (let c = 0; c < k; c++) {
      if (f === "f32-planar") { const a = new Float32Array(n); frame.copyTo(a, { planeIndex: c }); aus.push(a); }
      else if (f === "s16-planar") { const a = new Int16Array(n); frame.copyTo(a, { planeIndex: c }); aus.push(Float32Array.from(a, (x) => x / 32768)); }
      else if (f === "s32-planar") { const a = new Int32Array(n); frame.copyTo(a, { planeIndex: c }); aus.push(Float32Array.from(a, (x) => x / 2147483648)); }
      else { const a = new Uint8Array(n); frame.copyTo(a, { planeIndex: c }); aus.push(Float32Array.from(a, (x) => (x - 128) / 128)); }
    }
    return aus;
  }
  const m = frame.numberOfChannels, roh = f === "f32" ? new Float32Array(n * m) : f === "s16" ? new Int16Array(n * m) : f === "s32" ? new Int32Array(n * m) : new Uint8Array(n * m);
  frame.copyTo(roh, { planeIndex: 0 });
  const teiler = f === "f32" ? 1 : f === "s16" ? 32768 : f === "s32" ? 2147483648 : 128, abzug = f === "u8" ? 128 : 0;
  for (let c = 0; c < k; c++) { const a = new Float32Array(n); for (let i = 0; i < n; i++) a[i] = (roh[i * m + c] - abzug) / teiler; aus.push(a); }
  return aus;
}

/**
 * Die Tonspur mit WebCodecs dekodieren: { spuren (höchstens zwei Kanäle, Float32Array), rate, dauer, kanaele }, höchstens `sekunden` lang.
 * Wirft, wenn der Browser WebCodecs oder die Kodierung nicht hat.
 */
export async function tonMitWebCodecs(bytes, { sekunden = Infinity, melden = () => {} } = {}) {
  if (typeof AudioDecoder === "undefined" || typeof EncodedAudioChunk === "undefined") throw new Error("dieser Browser hat kein WebCodecs");
  const spur = tonspurLesen(bytes, { sekunden: Number.isFinite(sekunden) ? sekunden + 1 : Infinity });
  const config = { codec: spur.codec, sampleRate: spur.sampleRate, numberOfChannels: spur.numberOfChannels, ...(spur.description ? { description: spur.description } : {}) };
  const pruefung = await AudioDecoder.isConfigSupported(config).catch(() => ({ supported: false }));
  if (!pruefung.supported) throw new Error(`der Dekoder des Geräts kann ${spur.codec} nicht`);
  const teile = [[], []];
  let rate = spur.sampleRate, kanaele = Math.min(2, spur.numberOfChannels), laenge = 0;
  const grenze = Number.isFinite(sekunden) ? sekunden : Infinity;
  const fertig = new Promise((ok, nein) => {
    const decoder = new AudioDecoder({
      output: (frame) => {
        try {
          rate = frame.sampleRate; kanaele = Math.min(2, frame.numberOfChannels);
          if (laenge / rate < grenze) { const k = kanaeleAus(frame); k.forEach((a, c) => teile[c].push(a)); laenge += frame.numberOfFrames; }
        } catch (f) { nein(f); } finally { frame.close(); }
      },
      error: (f) => nein(f instanceof Error ? f : new Error(String(f))),
    });
    (async () => {
      decoder.configure(config);
      const b = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
      for (const [i, s] of spur.stuecke.entries()) {
        if (s.offset + s.size > b.length) break;
        decoder.decode(new EncodedAudioChunk({ type: "key", timestamp: Math.round((s.zeit * 1e6) / spur.timescale), duration: Math.round((s.dauer * 1e6) / spur.timescale), data: b.subarray(s.offset, s.offset + s.size) }));
        if (i % 500 === 499) { melden(i / spur.stuecke.length); while (decoder.decodeQueueSize > 50) await new Promise((w) => setTimeout(w, 5)); }
      }
      await decoder.flush();
      decoder.close();
      ok();
    })().catch(nein);
  });
  await fertig;
  if (!laenge) throw new Error("der Dekoder lieferte keinen Ton");
  const m = Math.min(laenge, Math.floor(grenze * rate));
  const spuren = Array.from({ length: kanaele }, (_, c) => {
    const a = new Float32Array(m);
    let o = 0;
    for (const t of teile[c]) { if (o >= m) break; a.set(o + t.length <= m ? t : t.subarray(0, m - o), o); o += t.length; }
    return a;
  });
  return { spuren, rate, dauer: m / rate, kanaele: spur.numberOfChannels };
}
