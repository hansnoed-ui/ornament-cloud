// «The Fictory» – Länge eines aufgenommenen Videos in die Datei schreiben.
// MediaRecorder schreibt die Datei stückweise, bevor die Länge feststeht: Im fragmentierten MP4 (Chrome) steht im Kopf die Länge 0 oder nur die des
// ersten Stücks, im WebM fehlt sie ganz. Manche Player (z. B. die Galerie auf Android) zeigen dann eine falsche Länge (Rückmeldung vom 10. Oktober 2026:
// «3 Sekunden» bei einem Video von 30 Sekunden). Hier wird die Länge nachgetragen; das Bild bleibt Byte für Byte unverändert.

/** trägt die Länge ein; MP4: aus den Stücken selbst gerechnet (sonst aus sekunden), WebM: sekunden. Gibt die Bytes zurück (bei Unbekanntem unverändert). */
export function mitDauer(bytes, sekunden) {
  const d = new Uint8Array(bytes);
  try {
    if (typ(d, 4) === "ftyp") return mp4(d, sekunden);
    if (d[0] === 0x1a && d[1] === 0x45 && d[2] === 0xdf && d[3] === 0xa3) return webm(d, sekunden);
  } catch { /* unbekannter Aufbau: Datei unverändert lassen */ }
  return d;
}

// ---------- MP4 (ISO BMFF) ----------
const typ = (d, o) => String.fromCharCode(d[o], d[o + 1], d[o + 2], d[o + 3]);
const BEHAELTER = new Set(["moov", "trak", "mdia", "mvex", "moof", "traf"]);

function* kisten(d, v, von, bis) {
  for (let o = von; o + 8 <= bis;) {
    let gr = v.getUint32(o), kopf = 8;
    if (gr === 1) { gr = Number(v.getBigUint64(o + 8)); kopf = 16; } else if (gr === 0) gr = bis - o;
    if (gr < kopf || o + gr > bis) return;
    yield { o, gr, kopf, t: typ(d, o + 4) };
    o += gr;
  }
}
const finde = (d, v, k, t) => { for (const x of kisten(d, v, k.o + k.kopf, k.o + k.gr)) if (x.t === t) return x; return null; };
const zahl = (v, o, lang) => (lang ? Number(v.getBigUint64(o)) : v.getUint32(o));
const setze = (v, o, lang, n) => (lang ? v.setBigUint64(o, BigInt(Math.round(n))) : v.setUint32(o, Math.min(0xffffffff, Math.round(n))));

function mp4(d, sekunden) {
  const v = new DataView(d.buffer, d.byteOffset, d.byteLength);
  let moov = null;
  const ende = new Map();                       // Spur → Ende der letzten Probe (in der Zeitbasis der Spur)
  const vorgabe = new Map();                    // Spur → Vorgabedauer je Probe (trex)
  for (const k of kisten(d, v, 0, d.length)) {
    if (k.t === "moov") {
      moov = k;
      const mvex = finde(d, v, k, "mvex");
      if (mvex) for (const x of kisten(d, v, mvex.o + mvex.kopf, mvex.o + mvex.gr)) if (x.t === "trex") vorgabe.set(v.getUint32(x.o + 12), v.getUint32(x.o + 20));
    }
    if (k.t !== "moof") continue;
    for (const traf of kisten(d, v, k.o + k.kopf, k.o + k.gr)) {
      if (traf.t !== "traf") continue;
      const tfhd = finde(d, v, traf, "tfhd"), tfdt = finde(d, v, traf, "tfdt"), trun = finde(d, v, traf, "trun");
      if (!tfhd || !tfdt || !trun) continue;
      const spur = v.getUint32(tfhd.o + 12), tf = v.getUint32(tfhd.o + 8) & 0xffffff;
      let p = tfhd.o + 16, dauer = vorgabe.get(spur) ?? 0;
      if (tf & 0x1) p += 8; if (tf & 0x2) p += 4;
      if (tf & 0x8) dauer = v.getUint32(p);
      const basis = zahl(v, tfdt.o + 12, d[tfdt.o + 8] === 1);
      const rf = v.getUint32(trun.o + 8) & 0xffffff, n = v.getUint32(trun.o + 12);
      let q = trun.o + 16, summe = 0;
      if (rf & 0x1) q += 4; if (rf & 0x4) q += 4;
      const schritt = ((rf & 0x100) ? 4 : 0) + ((rf & 0x200) ? 4 : 0) + ((rf & 0x400) ? 4 : 0) + ((rf & 0x800) ? 4 : 0);
      for (let i = 0; i < n; i++, q += schritt) summe += (rf & 0x100) ? v.getUint32(q) : dauer;
      ende.set(spur, Math.max(ende.get(spur) ?? 0, basis + summe));
    }
  }
  if (!moov) return d;
  const mvhd = finde(d, v, moov, "mvhd");
  if (!mvhd) return d;
  const lang = d[mvhd.o + 8] === 1, zeitbasis = v.getUint32(mvhd.o + (lang ? 28 : 20));
  let film = 0;
  for (const trak of kisten(d, v, moov.o + moov.kopf, moov.o + moov.gr)) {
    if (trak.t !== "trak") continue;
    const tkhd = finde(d, v, trak, "tkhd"), mdia = finde(d, v, trak, "mdia"), mdhd = mdia && finde(d, v, mdia, "mdhd");
    if (!tkhd || !mdhd) continue;
    const spur = v.getUint32(tkhd.o + (d[tkhd.o + 8] === 1 ? 28 : 20));
    const ml = d[mdhd.o + 8] === 1, mbasis = v.getUint32(mdhd.o + (ml ? 28 : 20));
    const s = ende.has(spur) ? ende.get(spur) / mbasis : sekunden;
    if (!(s > 0)) continue;
    setze(v, mdhd.o + (ml ? 32 : 24), ml, s * mbasis);
    const tl = d[tkhd.o + 8] === 1;
    setze(v, tkhd.o + (tl ? 36 : 28), tl, s * zeitbasis);
    film = Math.max(film, s);
  }
  if (!(film > 0)) film = sekunden;
  if (film > 0) {
    setze(v, mvhd.o + (lang ? 32 : 24), lang, film * zeitbasis);
    const mvex = finde(d, v, moov, "mvex"), mehd = mvex && finde(d, v, mvex, "mehd");
    if (mehd) setze(v, mehd.o + 12, d[mehd.o + 8] === 1, film * zeitbasis);
  }
  return d;
}

// ---------- WebM (EBML) ----------
function vint(d, o) {
  const b = d[o]; let laenge = 1;
  while (laenge <= 8 && !(b & (0x80 >> (laenge - 1)))) laenge++;
  let wert = b & (0xff >> laenge), unbekannt = wert === (0xff >> laenge);
  for (let i = 1; i < laenge; i++) { wert = wert * 256 + d[o + i]; if (d[o + i] !== 0xff) unbekannt = false; }
  return { laenge, wert, unbekannt };
}
function element(d, o) {
  const id = vint(d, o), idBytes = d.subarray(o, o + id.laenge), gr = vint(d, o + id.laenge);
  return { o, id: [...idBytes].map((x) => x.toString(16).padStart(2, "0")).join(""), kopf: id.laenge + gr.laenge, gr: gr.unbekannt ? Infinity : gr.wert };
}
function webm(d, sekunden) {
  if (!(sekunden > 0)) return d;
  let o = 0;
  const ebml = element(d, o); o += ebml.kopf + ebml.gr;
  const seg = element(d, o);
  if (seg.id !== "18538067") return d;
  for (let p = o + seg.kopf; p < d.length;) {
    const e = element(d, p);
    if (e.id === "1549a966") {                                    // Info
      let skala = 1e6, hat = null;
      for (let q = p + e.kopf; q < p + e.kopf + e.gr;) {
        const k = element(d, q);
        if (k.id === "2ad7b1") { skala = 0; for (let i = 0; i < k.gr; i++) skala = skala * 256 + d[q + k.kopf + i]; }
        if (k.id === "4489") hat = k;
        q += k.kopf + k.gr;
      }
      const wert = (sekunden * 1e9) / skala;
      if (hat) {                                                  // vorhanden: überschreiben
        const dv = new DataView(d.buffer, d.byteOffset + hat.o + hat.kopf, hat.gr);
        if (hat.gr === 8) dv.setFloat64(0, wert); else if (hat.gr === 4) dv.setFloat32(0, wert);
        return d;
      }
      // fehlt: Duration (0x4489, float64) ans Ende von Info anfügen und die Grösse von Info neu schreiben (8 Byte); Segment hat unbekannte Grösse
      const inhalt = d.subarray(p + e.kopf, p + e.kopf + e.gr);
      const dauer = new Uint8Array(11); dauer.set([0x44, 0x89, 0x88]); new DataView(dauer.buffer).setFloat64(3, wert);
      const groesse = inhalt.length + dauer.length, kopf = new Uint8Array(4 + 8);
      kopf.set(d.subarray(p, p + 4));                             // ID von Info (4 Byte)
      kopf[4] = 0x01; for (let i = 0; i < 7; i++) kopf[11 - i] = Math.floor(groesse / 256 ** i) % 256;
      const neu = new Uint8Array(d.length + kopf.length + dauer.length - e.kopf);
      neu.set(d.subarray(0, p)); neu.set(kopf, p); neu.set(inhalt, p + kopf.length); neu.set(dauer, p + kopf.length + inhalt.length);
      neu.set(d.subarray(p + e.kopf + e.gr), p + kopf.length + groesse);
      if (!seg.gr || seg.gr === Infinity) return neu;
      return d;                                                   // Segment mit fester Grösse: nicht anfassen
    }
    if (e.id === "1f43b675" || e.gr === Infinity) break;          // erster Cluster: keine Info gefunden
    p += e.kopf + e.gr;
  }
  return d;
}
