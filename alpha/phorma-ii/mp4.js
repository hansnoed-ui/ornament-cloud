// PHORMA II – das MP4: die Bilder schreibt mp4-muxer 5.2.2 (MIT, lokal in vendor/) in Teilen (mp4Schreiber). Bis zum 18. Oktober 2026 hiess die
// Datei tonspur.js und kodierte auch den Ton fürs Gewebe; das ist seither PHORMA III (alpha/phorma-iii/tonspur.js).
import { Muxer, StreamTarget } from "../../vendor/mp4-muxer-5.2.2/mp4-muxer.js";

/**
 * MP4 schreiben, während die Bilder kodiert werden – ohne die Datei je am Stück im Speicher zu halten (Rückmeldung vom 18. Oktober 2026 von einem
 * Telefon: «Array buffer allocation failed»; ein langes Video ergab bei 14 Mbit/s weit über 100 MB in einem Block, dazu alle Bilder
 * noch einmal einzeln). mp4-muxer schreibt in Teilen (StreamTarget), der Platz für «moov» wird vorn reserviert (fastStart mit der Zahl der Stücke)
 * und am Schluss hineingeschrieben; das Ergebnis ist ein Blob aus den Teilen.
 */
export function mp4Schreiber({ breite, hoehe, fps, codec, bilder }) {
  const teile = [];
  let ende = 0;
  const target = new StreamTarget({
    onData: (daten, lage) => {
      if (lage > ende) { teile.push({ lage: ende, daten: new Uint8Array(lage - ende) }); ende = lage; }   // der vorn reservierte Platz für moov
      if (lage === ende) { teile.push({ lage, daten }); ende += daten.length; return; }
      // in schon Geschriebenes (moov am Schluss in den reservierten Platz): die betroffenen Teile überschreiben
      let rest = daten, p = lage;
      for (const t of teile) {
        if (!rest.length) break;
        if (p >= t.lage + t.daten.length || p < t.lage) continue;
        const o = p - t.lage, n = Math.min(rest.length, t.daten.length - o);
        t.daten.set(rest.subarray(0, n), o); rest = rest.subarray(n); p += n;
      }
      if (rest.length) { teile.push({ lage: p, daten: rest.slice() }); ende += rest.length; }
    },
  });
  const muxer = new Muxer({ target, firstTimestampBehavior: "offset", fastStart: { expectedVideoChunks: bilder },
    video: { codec: "avc", width: breite, height: hoehe, frameRate: fps } });
  let n = 0;
  return {
    /** ein kodiertes Bild (daten: Uint8Array); beim ersten die Beschreibung des Encoders (avcC) */
    bild(daten, key, zeit, avcC) {
      muxer.addVideoChunkRaw(daten, key ? "key" : "delta", zeit, Math.round(1e6 / fps), n++ ? undefined : { decoderConfig: { codec, codedWidth: breite, codedHeight: hoehe, description: avcC } });
    },
    fertig() { muxer.finalize(); return new Blob(teile.map((t) => t.daten), { type: "video/mp4" }); },
    get groesse() { return ende; },
  };
}
