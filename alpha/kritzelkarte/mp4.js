// «Kritzelkarte» – ein kleiner MP4-Schreiber für ein einzelnes H.264-Video (aus WebCodecs), ohne Ton, ohne Abhängigkeiten.
// Aufbau: ftyp, moov (vorne, damit das Video sofort abspielt: «faststart»), mdat mit allen Bildern in einem Stück.
// Bilder in Ausgabereihenfolge, ohne B-Bilder (so liefern sie die Encoder der Browser mit latencyMode «quality» und avc-Format).

const text = (s) => [...s].map((z) => z.charCodeAt(0));
const u8 = (n) => [n & 255];
const u16 = (n) => [(n >>> 8) & 255, n & 255];
const u32 = (n) => [(n >>> 24) & 255, (n >>> 16) & 255, (n >>> 8) & 255, n & 255];

/** eine Kiste: Grösse, Typ, Inhalt (Zahlenlisten oder Uint8Array) */
function kiste(typ, ...teile) {
  const inhalt = teile.flatMap((t) => (t instanceof Uint8Array ? Array.from(t) : t));
  return [...u32(inhalt.length + 8), ...text(typ), ...inhalt];
}
const voll = (typ, version, flags, ...teile) => kiste(typ, u8(version), u8(flags >> 16), u16(flags & 0xffff), ...teile);
const MATRIX = [0x00010000, 0, 0, 0, 0x00010000, 0, 0, 0, 0x40000000].flatMap(u32);

/**
 * proben: [{ daten: Uint8Array, key: boolean }] in Reihenfolge; avcC: Beschreibung des Decoders (decoderConfig.description).
 * Gibt die Datei als Uint8Array.
 */
export function mp4({ breite, hoehe, fps, avcC, proben }) {
  const takt = fps * 1000, schritt = 1000;            // Zeitbasis der Spur: 30 000 je Sekunde, ein Bild = 1000
  const n = proben.length, dauerSpur = n * schritt, dauerFilm = Math.round((n * 1000) / fps);
  const ftyp = kiste("ftyp", text("isom"), u32(512), text("isom"), text("iso2"), text("avc1"), text("mp41"));

  const moovMit = (offset) => {
    const avc1 = kiste("avc1",
      [0, 0, 0, 0, 0, 0], u16(1),                      // reserviert, data_reference_index
      u16(0), u16(0), u32(0), u32(0), u32(0),
      u16(breite), u16(hoehe), u32(0x00480000), u32(0x00480000), u32(0), u16(1),
      new Array(32).fill(0), u16(0x0018), u16(0xffff),
      kiste("avcC", avcC),
      // Farbraum: BT.709, eingeschränkter Bereich (so rechnen die Browser Leinwand → YUV)
      kiste("colr", text("nclx"), u16(1), u16(1), u16(1), u8(0)),
      kiste("pasp", u32(1), u32(1)));
    const stsd = voll("stsd", 0, 0, u32(1), avc1);
    const stts = voll("stts", 0, 0, u32(1), u32(n), u32(schritt));
    const keys = proben.map((p, i) => (p.key ? i + 1 : 0)).filter(Boolean);
    const stss = voll("stss", 0, 0, u32(keys.length), keys.flatMap(u32));
    const stsc = voll("stsc", 0, 0, u32(1), u32(1), u32(n), u32(1));
    const stsz = voll("stsz", 0, 0, u32(0), u32(n), proben.flatMap((p) => u32(p.daten.length)));
    const stco = voll("stco", 0, 0, u32(1), u32(offset));
    const stbl = kiste("stbl", stsd, stts, stss, stsc, stsz, stco);
    const minf = kiste("minf", voll("vmhd", 0, 1, u16(0), u16(0), u16(0), u16(0)),
      kiste("dinf", voll("dref", 0, 0, u32(1), voll("url ", 0, 1))), stbl);
    const mdia = kiste("mdia",
      voll("mdhd", 0, 0, u32(0), u32(0), u32(takt), u32(dauerSpur), u16(0x55c4), u16(0)),
      voll("hdlr", 0, 0, u32(0), text("vide"), u32(0), u32(0), u32(0), text("VideoHandler"), [0]),
      minf);
    const tkhd = voll("tkhd", 0, 3, u32(0), u32(0), u32(1), u32(0), u32(dauerFilm), u32(0), u32(0),
      u16(0), u16(0), u16(0), u16(0), MATRIX, u32(breite << 16), u32(hoehe << 16));
    const mvhd = voll("mvhd", 0, 0, u32(0), u32(0), u32(1000), u32(dauerFilm), u32(0x00010000), u16(0x0100),
      u16(0), u32(0), u32(0), MATRIX, new Array(24).fill(0), u32(2));
    return kiste("moov", mvhd, kiste("trak", tkhd, mdia));
  };
  // die Lage der Bilder hängt von der Grösse von moov ab, die nicht von der Lage abhängt: einmal messen, dann richtig schreiben
  const groesseMoov = moovMit(0).length;
  const summe = proben.reduce((s, p) => s + p.daten.length, 0);
  const kopfMdat = 8;
  const moov = moovMit(ftyp.length + groesseMoov + kopfMdat);
  const out = new Uint8Array(ftyp.length + moov.length + kopfMdat + summe);
  let o = 0;
  out.set(ftyp, o); o += ftyp.length;
  out.set(moov, o); o += moov.length;
  out.set([...u32(summe + kopfMdat), ...text("mdat")], o); o += kopfMdat;
  for (const p of proben) { out.set(p.daten, o); o += p.daten.length; }
  return out;
}

/** Kisten einer Datei auflisten (für Prüfungen): [{ typ, o, groesse, kinder }] */
export function kisten(d, von = 0, bis = d.length) {
  const v = new DataView(d.buffer, d.byteOffset, d.byteLength), liste = [];
  const BEHAELTER = new Set(["moov", "trak", "mdia", "minf", "stbl", "dinf"]);
  for (let o = von; o + 8 <= bis;) {
    const groesse = v.getUint32(o), typ = String.fromCharCode(...d.subarray(o + 4, o + 8));
    if (groesse < 8 || o + groesse > bis) break;
    liste.push({ typ, o, groesse, kinder: BEHAELTER.has(typ) ? kisten(d, o + 8, o + groesse) : [] });
    o += groesse;
  }
  return liste;
}
