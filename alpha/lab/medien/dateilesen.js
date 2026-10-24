// ORNAMENT LAB – eine gewählte Datei sicher in den Speicher lesen (seit Lab 0.1.29). Chrome auf Android gibt eine Datei aus der Auswahl
// (Google Fotos, Drive, Downloads) nur als Verweis auf den Anbieter; wird sie in einem Stück gelesen, bricht das Lesen bei grossen oder noch
// ladenden Dateien oft mit NotReadableError ab: «The requested file could not be read, typically due to permission problems …». Darum wird
// in Stücken gelesen, ein misslungenes Stück nach einer kurzen Pause wiederholt, und erst danach gibt die Seite die Auswahl frei.

export const STUECK = 4 * 1024 * 1024;
const VERSUCHE = 4;
const pause = (ms) => new Promise((ok) => setTimeout(ok, ms));

/** ein Fehler beim Lesen, der vom Zugriff auf die Datei kommt (und nicht vom Inhalt) */
export const istZugriffsfehler = (f) => ["NotReadableError", "NotAllowedError", "SecurityError", "NotFoundError"].includes(f?.name) || /permission/i.test(f?.message ?? "");

/**
 * Datei → Uint8Array, in Stücken zu 4 MB. Jedes Stück wird bis zu viermal versucht (Pause 0,25 / 0,5 / 1 s). Hält der Zugriffsfehler an,
 * kommt eine Meldung, die sagt, was zu tun ist; der ursprüngliche Fehler steht in `ursache`.
 */
export async function dateiLesen(datei, { melden = () => {}, warten = pause } = {}) {
  const n = datei.size, bytes = new Uint8Array(n);
  for (let a = 0; a < n; a += STUECK) {
    const b = Math.min(n, a + STUECK);
    for (let v = 1; ; v++) {
      try {
        const teil = new Uint8Array(await datei.slice(a, b).arrayBuffer());
        if (teil.length !== b - a) throw Object.assign(new Error(`nur ${teil.length} von ${b - a} Bytes gelesen`), { name: "NotReadableError" });
        bytes.set(teil, a);
        break;
      } catch (f) {
        if (v >= VERSUCHE || !istZugriffsfehler(f)) throw zugriffsMeldung(f);
        await warten(250 * 2 ** (v - 1));
      }
    }
    if (n > STUECK) melden(b / n);
  }
  return bytes;
}

/** eine verständliche Meldung für das Telefon; andere Fehler bleiben, wie sie sind */
export function zugriffsMeldung(f) {
  if (!istZugriffsfehler(f)) return f;
  return Object.assign(new Error("das Telefon hat den Zugriff auf die Datei verweigert. Wähle sie bitte noch einmal aus. Liegt sie in Google Fotos oder Drive, "
    + "lade sie zuerst auf das Gerät herunter und wähle sie über «Dateien» bzw. «Downloads»"), { name: "Zugriffsfehler", ursache: `${f.name}: ${f.message}` });
}
