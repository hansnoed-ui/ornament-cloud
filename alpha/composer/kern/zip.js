// Ein ZIP-Archiv ohne Kompression als Blob aus Teilen (WAV lässt sich ohnehin kaum packen). Die Prüfsummen entstehen in Stücken, zwischen
// denen die Seite atmet; die Dateien werden nicht noch einmal in ein grosses Stück kopiert. Nach dem Muster von alpha/lab/kern/archiv.js.

const TABELLE = (() => { const t = new Uint32Array(256); for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; } return t; })();
const atmen = () => new Promise((ok) => setTimeout(ok, 0));

export async function crc32(bytes) {
  let c = 0xffffffff;
  for (let a = 0; a < bytes.length; a += 1 << 22) { const b = Math.min(bytes.length, a + (1 << 22)); for (let i = a; i < b; i++) c = TABELLE[(c ^ bytes[i]) & 0xff] ^ (c >>> 8); if (bytes.length > 1 << 22) await atmen(); }
  return (c ^ 0xffffffff) >>> 0;
}

/** dateien: [{ name, bytes: Uint8Array }] → Blob (application/zip) */
export async function zipBlob(dateien, datum = new Date()) {
  const enc = new TextEncoder(), teile = [], verzeichnis = [];
  const zeit = ((datum.getHours() << 11) | (datum.getMinutes() << 5) | (datum.getSeconds() >> 1)) & 0xffff;
  const tag = (((datum.getFullYear() - 1980) << 9) | ((datum.getMonth() + 1) << 5) | datum.getDate()) & 0xffff;
  let versatz = 0;
  for (const d of dateien) {
    const name = enc.encode(d.name), n = d.bytes.length, crc = await crc32(d.bytes);
    const k = new DataView(new ArrayBuffer(30));
    k.setUint32(0, 0x04034b50, true); k.setUint16(4, 20, true); k.setUint16(6, 0x0800, true); k.setUint16(10, zeit, true); k.setUint16(12, tag, true);
    k.setUint32(14, crc, true); k.setUint32(18, n, true); k.setUint32(22, n, true); k.setUint16(26, name.length, true);
    teile.push(new Uint8Array(k.buffer), name, d.bytes);
    const z = new DataView(new ArrayBuffer(46));
    z.setUint32(0, 0x02014b50, true); z.setUint16(4, 20, true); z.setUint16(6, 20, true); z.setUint16(8, 0x0800, true); z.setUint16(12, zeit, true); z.setUint16(14, tag, true);
    z.setUint32(16, crc, true); z.setUint32(20, n, true); z.setUint32(24, n, true); z.setUint16(28, name.length, true); z.setUint32(42, versatz, true);
    verzeichnis.push(new Uint8Array(z.buffer), name);
    versatz += 30 + name.length + n;
  }
  const groesse = verzeichnis.reduce((s, x) => s + x.length, 0), e = new DataView(new ArrayBuffer(22));
  e.setUint32(0, 0x06054b50, true); e.setUint16(8, dateien.length, true); e.setUint16(10, dateien.length, true); e.setUint32(12, groesse, true); e.setUint32(16, versatz, true);
  return new Blob([...teile, ...verzeichnis, new Uint8Array(e.buffer)], { type: "application/zip" });
}
