// ORNAMENT LAB · Video – das Projekt als ZIP mit dem Aufbau eines OpenFilm-Ordners: film.html, die Titel unter titel/, die eigenen Dateien
// unter assets/ und der Zustand des Editors unter .film/ornament-video.json (OpenFilm: «an editor's own state lives in its own folder (.film/)»).
// Ausgepackt ist es ein Film, den `npx openfilm open` öffnet und rendert. Geschrieben als Blob aus Teilen (wie das Projektarchiv des Labs,
// ohne alles noch einmal am Stück zu kopieren), gelesen mit dem ZIP-Leser des Labs.
import { crc32 } from "../../../the-fictory/zip.js?v=23";
import { leseZip } from "../../kern/archiv.js";
import { film, normieren } from "../kern/folge.js";

export const ENDUNG = ".film.zip";
export const ZUSTAND = ".film/ornament-video.json";
const atmen = () => new Promise((ok) => setTimeout(ok, 0));

/** projekt + Bytes der Medien (Map Medium-Id → Uint8Array) → Blob (ZIP, unkomprimiert) */
export async function projektPacken(projekt, bytes, { melden = () => {}, datum = new Date() } = {}) {
  const f = film(projekt), enc = new TextEncoder();
  const dateien = [
    { name: "film.html", bytes: enc.encode(f.html) },
    ...Object.entries(f.seiten).map(([name, html]) => ({ name, bytes: enc.encode(html) })),
    ...Object.values(projekt.medien).map((m) => { const b = bytes.get(m.id); if (!b) throw new Error(`die Datei von ${m.name} fehlt`); return { name: m.datei, bytes: b }; }),
    { name: ZUSTAND, bytes: enc.encode(JSON.stringify(projekt, null, 1)) },
  ];
  const zeit = ((datum.getHours() << 11) | (datum.getMinutes() << 5) | (datum.getSeconds() >> 1)) & 0xffff;
  const tag = (((datum.getFullYear() - 1980) << 9) | ((datum.getMonth() + 1) << 5) | datum.getDate()) & 0xffff;
  const teile = [], verzeichnis = [], gesamt = dateien.reduce((s, d) => s + d.bytes.length, 0) || 1;
  let versatz = 0, fertig = 0;
  for (const d of dateien) {
    const name = enc.encode(d.name), n = d.bytes.length, crc = crc32(d.bytes);
    const kopf = new DataView(new ArrayBuffer(30));
    kopf.setUint32(0, 0x04034b50, true); kopf.setUint16(4, 20, true); kopf.setUint16(6, 0x0800, true); kopf.setUint16(8, 0, true);
    kopf.setUint16(10, zeit, true); kopf.setUint16(12, tag, true); kopf.setUint32(14, crc, true); kopf.setUint32(18, n, true); kopf.setUint32(22, n, true);
    kopf.setUint16(26, name.length, true);
    teile.push(new Uint8Array(kopf.buffer), name, d.bytes);
    const z = new DataView(new ArrayBuffer(46));
    z.setUint32(0, 0x02014b50, true); z.setUint16(4, 20, true); z.setUint16(6, 20, true); z.setUint16(8, 0x0800, true);
    z.setUint16(12, zeit, true); z.setUint16(14, tag, true); z.setUint32(16, crc, true); z.setUint32(20, n, true); z.setUint32(24, n, true);
    z.setUint16(28, name.length, true); z.setUint32(42, versatz, true);
    verzeichnis.push(new Uint8Array(z.buffer), name);
    versatz += 30 + name.length + n;
    fertig += n; melden(fertig / gesamt); await atmen();
  }
  if (versatz > 0xffffffff) throw new Error("Das Projekt ist grösser als 4 GB; so grosse ZIP-Dateien schreibt der Editor nicht");
  const groesse = verzeichnis.reduce((s, b) => s + b.length, 0);
  const ende = new DataView(new ArrayBuffer(22));
  ende.setUint32(0, 0x06054b50, true); ende.setUint16(8, dateien.length, true); ende.setUint16(10, dateien.length, true);
  ende.setUint32(12, groesse, true); ende.setUint32(16, versatz, true);
  return new Blob([...teile, ...verzeichnis, new Uint8Array(ende.buffer)], { type: "application/zip" });
}

/** ZIP-Bytes → { projekt, bytes (Map Medium-Id → Uint8Array), fehlt: [Namen] } */
export async function projektEntpacken(zipBytes) {
  const dateien = await leseZip(zipBytes);
  const zustand = dateien.get(ZUSTAND);
  if (!zustand) {
    if (dateien.has("film.html")) throw new Error("Das ist ein OpenFilm-Film, aber nicht aus diesem Editor (.film/ornament-video.json fehlt). Fremde Filme öffnet er noch nicht.");
    throw new Error("Das ist kein Projekt dieses Editors");
  }
  const projekt = normieren(JSON.parse(new TextDecoder().decode(zustand)));
  const bytes = new Map(), fehlt = [];
  for (const m of Object.values(projekt.medien)) { const b = dateien.get(m.datei); if (b) bytes.set(m.id, b); else fehlt.push(m.name); }
  return { projekt, bytes, fehlt };
}
