// PHORMA II – Web Worker: analysiert das Foto (analyse.js), ohne die Seite aufzuhalten. Die Karten gehen als übertragbare Puffer zurück.
import { analysieren } from "./analyse.js?v=4";

self.onmessage = (e) => {
  const { nr, daten, w, h, massstab, strich } = e.data;
  try {
    const A = analysieren(daten, w, h, { massstab, strich });
    const puffer = [A.hell.buffer, A.tiefe.buffer, A.nahrung.buffer, A.linien.haupt.punkte.buffer, A.linien.quer.punkte.buffer];
    self.postMessage({ nr, ergebnis: A }, puffer);
  } catch (fehler) { self.postMessage({ nr, fehler: fehler?.message ?? String(fehler) }); }
};
