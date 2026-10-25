// ORNAMENT LAB – Projektarchiv (.ornalab.zip): projekt.json und die Mediendateien unter medien/. Geschrieben mit dem ZIP-Schreiber
// von The Fictory (unverändert wiederverwendet), gelesen mit dem kleinen Leser hier (Methoden «stored» und «deflate»; deflate über
// DecompressionStream, das Browser und Node 18+ haben). Prüfsummen werden beim Lesen kontrolliert.
import { zip, crc32 } from "../../../alpha/the-fictory/zip.js?v=23";
import { serialisiere, ladeProjekt } from "./projekt.js";

export const ENDUNG = ".ornalab.zip";
export const HOECHSTENS = 512 * 1024 * 1024;   // ein Archiv über 512 MB wird nicht geöffnet

function archivDateien(projekt, medien) {
  const dateien = [{ name: "projekt.json", bytes: new TextEncoder().encode(serialisiere(projekt)) }];
  for (const [name, bytes] of medien) {
    if (!/^medien\/[\w.-]+$/.test(name)) throw new Error(`unzulässiger Pfad im Archiv: ${name}`);
    dateien.push({ name, bytes });
  }
  return dateien;
}

/** projekt + medien (Map: Pfad → Uint8Array) → ZIP-Bytes */
export function packe(projekt, medien, datum = new Date()) {
  return zip(archivDateien(projekt, medien), datum);
}

const TABELLE = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; }
  return t;
})();
const STUECK = 4 * 1024 * 1024;
const atmen = () => new Promise((ok) => setTimeout(ok, 0));

/**
 * dasselbe Archiv wie packe, aber als Blob aus Teilen (seit Lab 0.1.38): Die Medien werden nicht noch einmal in ein einziges grosses Stück
 * kopiert, und die Prüfsummen entstehen in Stücken zu 4 MB, zwischen denen die Seite atmet. Mit Filmen wird ein Projekt schnell 100 MB und
 * mehr; als ein Stück (und dann noch einmal als Blob) scheiterte das Speichern auf Telefonen, ohne dass eine Meldung kam.
 */
export async function packeBlob(projekt, medien, { melden = () => {}, datum = new Date() } = {}) {
  const dateien = archivDateien(projekt, medien), enc = new TextEncoder();
  const gesamt = dateien.reduce((s, d) => s + d.bytes.length, 0) || 1;
  const zeit = ((datum.getHours() << 11) | (datum.getMinutes() << 5) | (datum.getSeconds() >> 1)) & 0xffff;
  const tag = (((datum.getFullYear() - 1980) << 9) | ((datum.getMonth() + 1) << 5) | datum.getDate()) & 0xffff;
  const teile = [], verzeichnis = [];
  let versatz = 0, fertig = 0;
  for (const d of dateien) {
    const name = enc.encode(d.name), n = d.bytes.length;
    let c = 0xffffffff;
    for (let a = 0; a < n; a += STUECK) {
      const b = Math.min(n, a + STUECK);
      for (let i = a; i < b; i++) c = TABELLE[(c ^ d.bytes[i]) & 0xff] ^ (c >>> 8);
      fertig += b - a;
      if (n > STUECK) { melden(fertig / gesamt); await atmen(); }
    }
    const crc = (c ^ 0xffffffff) >>> 0;
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
    melden(fertig / gesamt);
  }
  const groesse = verzeichnis.reduce((s, b) => s + b.length, 0);
  const ende = new DataView(new ArrayBuffer(22));
  ende.setUint32(0, 0x06054b50, true); ende.setUint16(8, dateien.length, true); ende.setUint16(10, dateien.length, true);
  ende.setUint32(12, groesse, true); ende.setUint32(16, versatz, true);
  return new Blob([...teile, ...verzeichnis, new Uint8Array(ende.buffer)], { type: "application/zip" });
}

async function inflateRaw(bytes) {
  const s = new Blob([bytes]).stream().pipeThrough(new DecompressionStream("deflate-raw"));
  return new Uint8Array(await new Response(s).arrayBuffer());
}

/** ZIP-Bytes → { name: Uint8Array }; nur einfache Pfade, keine Verzeichnissprünge */
export async function leseZip(bytes) {
  if (bytes.length > HOECHSTENS) throw new Error("Archiv zu gross");
  const dv = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  let eocd = -1;
  for (let i = bytes.length - 22; i >= Math.max(0, bytes.length - 65557); i--) if (dv.getUint32(i, true) === 0x06054b50) { eocd = i; break; }
  if (eocd < 0) throw new Error("kein ZIP-Archiv");
  const anzahl = dv.getUint16(eocd + 10, true);
  let p = dv.getUint32(eocd + 16, true);
  const dec = new TextDecoder();
  const out = new Map();
  for (let n = 0; n < anzahl; n++) {
    if (dv.getUint32(p, true) !== 0x02014b50) throw new Error("Verzeichnis des Archivs beschädigt");
    const methode = dv.getUint16(p + 10, true), crc = dv.getUint32(p + 16, true);
    const komprimiert = dv.getUint32(p + 20, true), gross = dv.getUint32(p + 24, true);
    const nl = dv.getUint16(p + 28, true), xl = dv.getUint16(p + 30, true), kl = dv.getUint16(p + 32, true), lokal = dv.getUint32(p + 42, true);
    const name = dec.decode(bytes.subarray(p + 46, p + 46 + nl));
    p += 46 + nl + xl + kl;
    if (name.endsWith("/")) continue;
    if (name.includes("..") || name.startsWith("/") || name.includes("\\")) throw new Error(`unzulässiger Pfad im Archiv: ${name}`);
    if (dv.getUint32(lokal, true) !== 0x04034b50) throw new Error(`Eintrag beschädigt: ${name}`);
    const start = lokal + 30 + dv.getUint16(lokal + 26, true) + dv.getUint16(lokal + 28, true);
    const roh = bytes.subarray(start, start + komprimiert);
    let daten;
    if (methode === 0) daten = roh;
    else if (methode === 8) daten = await inflateRaw(roh);
    else throw new Error(`Kompressionsart ${methode} wird nicht unterstützt (${name})`);
    if (daten.length !== gross || crc32(daten) !== crc) throw new Error(`Prüfsumme stimmt nicht: ${name}`);
    out.set(name, daten);
  }
  return out;
}

/** Archiv öffnen: geprüftes Projekt und seine Medien */
export async function entpacke(bytes) {
  const dateien = await leseZip(bytes);
  const json = dateien.get("projekt.json");
  if (!json) throw new Error("projekt.json fehlt im Archiv");
  const projekt = ladeProjekt(new TextDecoder().decode(json));
  const medien = new Map([...dateien].filter(([n]) => n.startsWith("medien/")));
  const fehlt = [...projekt.ergebnisse, ...(projekt.exporte ?? [])].filter((e) => e.datei && !medien.has(e.datei)).map((e) => e.datei);
  return { projekt, medien, fehlt };
}
