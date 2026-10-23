// ORNAMENT LAB – Projektarchiv (.ornalab.zip): projekt.json und die Mediendateien unter medien/. Geschrieben mit dem ZIP-Schreiber
// von The Fictory (unverändert wiederverwendet), gelesen mit dem kleinen Leser hier (Methoden «stored» und «deflate»; deflate über
// DecompressionStream, das Browser und Node 18+ haben). Prüfsummen werden beim Lesen kontrolliert.
import { zip, crc32 } from "../../../alpha/the-fictory/zip.js?v=23";
import { serialisiere, ladeProjekt } from "./projekt.js";

export const ENDUNG = ".ornalab.zip";
const HOECHSTENS = 512 * 1024 * 1024;   // ein Archiv über 512 MB wird nicht geöffnet

/** projekt + medien (Map: Pfad → Uint8Array) → ZIP-Bytes */
export function packe(projekt, medien) {
  const dateien = [{ name: "projekt.json", bytes: new TextEncoder().encode(serialisiere(projekt)) }];
  for (const [name, bytes] of medien) {
    if (!/^medien\/[\w.-]+$/.test(name)) throw new Error(`unzulässiger Pfad im Archiv: ${name}`);
    dateien.push({ name, bytes });
  }
  return zip(dateien);
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
  const fehlt = projekt.ergebnisse.filter((e) => e.datei && !medien.has(e.datei)).map((e) => e.datei);
  return { projekt, medien, fehlt };
}
