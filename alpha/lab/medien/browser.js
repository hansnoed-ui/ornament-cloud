// ORNAMENT LAB – Medienspeicher im Browser. Bilder liegen als PNG (verlustfrei) unter medien/<ergebnis>.png, Daten als JSON, Videos als
// MP4/WebM. Alles bleibt lokal im Speicher der Seite, bis das Projekt als Archiv gespeichert wird; nichts wird hochgeladen.
import { sha256, begrenzen } from "../kern/bilddaten.js";
import { GRENZEN } from "../kern/projekt.js";

const leinwand = (w, h) => { const c = document.createElement("canvas"); c.width = w; c.height = h; return c; };
const alsBlob = (c, typ = "image/png") => new Promise((ok, nein) => c.toBlob((b) => (b ? ok(b) : nein(new Error("Bild konnte nicht kodiert werden"))), typ));
const ERLAUBT = new Set(["image/png", "image/jpeg", "image/webp", "image/gif", "image/avif", "image/bmp"]);
const HOECHSTENS_BYTES = 60 * 1024 * 1024;

export function browserMedien() {
  const bilder = new Map(), dateien = new Map(), urls = new Map();
  const merke = (e, bytes, mime) => { dateien.set(e.datei, bytes); const u = URL.createObjectURL(new Blob([bytes], { type: mime })); urls.get(e.datei) && URL.revokeObjectURL(urls.get(e.datei)); urls.set(e.datei, u); };
  async function dekodiere(bytes, mime) {
    const bmp = await createImageBitmap(new Blob([bytes], { type: mime }), { imageOrientation: "from-image" });
    const c = leinwand(bmp.width, bmp.height), x = c.getContext("2d", { willReadFrequently: true });
    x.drawImage(bmp, 0, 0); bmp.close?.();
    return x.getImageData(0, 0, c.width, c.height);
  }
  async function pngBytes(b) {
    const c = leinwand(b.width, b.height);
    c.getContext("2d").putImageData(b instanceof ImageData ? b : new ImageData(new Uint8ClampedArray(b.data), b.width, b.height), 0, 0);
    return new Uint8Array(await (await alsBlob(c)).arrayBuffer());
  }
  return {
    dateien,
    url: (e) => (e?.datei ? urls.get(e.datei) ?? null : null),
    async bild(e) {
      if (bilder.has(e.id)) return bilder.get(e.id);
      const bytes = dateien.get(e.datei);
      if (!bytes) throw new Error(`Mediendatei fehlt: ${e.datei}`);
      const b = await dekodiere(bytes, e.mime || "image/png");
      bilder.set(e.id, b);
      return b;
    },
    async ablegen(e, b) {
      const datei = `medien/${e.id}.png`, bytes = await pngBytes(b);
      e.datei = datei; merke(e, bytes, "image/png"); bilder.set(e.id, b);
      return { datei, sha256: await sha256(bytes), mime: "image/png", breite: b.width, hoehe: b.height, bytes: bytes.length };
    },
    async ablegenDaten(e, d) {
      const datei = `medien/${e.id}.json`, bytes = new TextEncoder().encode(JSON.stringify(d, null, 2));
      e.datei = datei; merke(e, bytes, "application/json");
      return { datei, sha256: await sha256(bytes), mime: "application/json", bytes: bytes.length };
    },
    async ablegenDatei(name, bytes, mime) {
      if (!/^medien\/[\w.-]+$/.test(name)) throw new Error(`unzulässiger Name: ${name}`);
      merke({ datei: name }, bytes, mime);
      return { datei: name, sha256: await sha256(bytes), mime, bytes: bytes.length };
    },
    /** eine Bilddatei des Benutzers lesen: Typ und Grösse prüfen, Ausrichtung anwenden, auf die Arbeitsgrösse begrenzen */
    async importiere(datei) {
      if (!ERLAUBT.has(datei.type)) throw new Error(`Dateityp ${datei.type || "unbekannt"} wird nicht angenommen (PNG, JPEG, WebP, GIF, AVIF, BMP)`);
      if (datei.size > HOECHSTENS_BYTES) throw new Error("Datei grösser als 60 MB");
      const bytes = new Uint8Array(await datei.arrayBuffer());
      const original = await dekodiere(bytes, datei.type);
      return { original: { name: datei.name, sha256: await sha256(bytes), breite: original.width, hoehe: original.height, mime: datei.type, bytes: bytes.length }, arbeit: begrenzen(original, GRENZEN.seite) };
    },
    /** Medien eines geöffneten Archivs übernehmen */
    uebernehmen(medien) {
      for (const u of urls.values()) URL.revokeObjectURL(u);
      bilder.clear(); dateien.clear(); urls.clear();
      for (const [name, bytes] of medien) merke({ datei: name }, bytes, name.endsWith(".png") ? "image/png" : name.endsWith(".json") ? "application/json" : name.endsWith(".mp4") ? "video/mp4" : name.endsWith(".webm") ? "video/webm" : "application/octet-stream");
    },
  };
}
