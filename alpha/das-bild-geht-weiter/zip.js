// Kleiner ZIP-Schreiber ohne Kompression (Methode «stored»): genügt für PNG-Dateien, die schon komprimiert sind. Ohne Abhängigkeiten.
const TABELLE = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; }
  return t;
})();
export function crc32(bytes) {
  let c = 0xffffffff;
  for (let i = 0; i < bytes.length; i++) c = TABELLE[(c ^ bytes[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

/** dateien: [{ name, bytes: Uint8Array }] → Uint8Array (ZIP) */
export function zip(dateien, datum = new Date()) {
  const enc = new TextEncoder();
  const zeit = ((datum.getHours() << 11) | (datum.getMinutes() << 5) | (datum.getSeconds() >> 1)) & 0xffff;
  const tag = (((datum.getFullYear() - 1980) << 9) | ((datum.getMonth() + 1) << 5) | datum.getDate()) & 0xffff;
  const teile = [], verzeichnis = [];
  let versatz = 0;
  for (const d of dateien) {
    const name = enc.encode(d.name), crc = crc32(d.bytes), n = d.bytes.length;
    const kopf = new DataView(new ArrayBuffer(30));
    kopf.setUint32(0, 0x04034b50, true); kopf.setUint16(4, 20, true); kopf.setUint16(6, 0x0800, true); kopf.setUint16(8, 0, true);
    kopf.setUint16(10, zeit, true); kopf.setUint16(12, tag, true); kopf.setUint32(14, crc, true); kopf.setUint32(18, n, true); kopf.setUint32(22, n, true);
    kopf.setUint16(26, name.length, true); kopf.setUint16(28, 0, true);
    teile.push(new Uint8Array(kopf.buffer), name, d.bytes);
    const z = new DataView(new ArrayBuffer(46));
    z.setUint32(0, 0x02014b50, true); z.setUint16(4, 20, true); z.setUint16(6, 20, true); z.setUint16(8, 0x0800, true); z.setUint16(10, 0, true);
    z.setUint16(12, zeit, true); z.setUint16(14, tag, true); z.setUint32(16, crc, true); z.setUint32(20, n, true); z.setUint32(24, n, true);
    z.setUint16(28, name.length, true); z.setUint32(42, versatz, true);
    verzeichnis.push(new Uint8Array(z.buffer), name);
    versatz += 30 + name.length + n;
  }
  const groesse = verzeichnis.reduce((s, b) => s + b.length, 0);
  const ende = new DataView(new ArrayBuffer(22));
  ende.setUint32(0, 0x06054b50, true); ende.setUint16(8, dateien.length, true); ende.setUint16(10, dateien.length, true);
  ende.setUint32(12, groesse, true); ende.setUint32(16, versatz, true);
  const alles = [...teile, ...verzeichnis, new Uint8Array(ende.buffer)];
  const out = new Uint8Array(alles.reduce((s, b) => s + b.length, 0));
  let o = 0;
  for (const b of alles) { out.set(b, o); o += b.length; }
  return out;
}
