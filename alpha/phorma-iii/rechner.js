// PHORMA III – Web Worker: analysiert das Bild (analyse.js), ohne die Seite aufzuhalten. Die Karten gehen als übertragbare Puffer zurück.
import { analysieren } from "./analyse.js?v=20";

self.onmessage = (e) => {
  const { nr, daten, w, h, massstab } = e.data;
  try {
    const A = analysieren(daten, w, h, { massstab });
    const puffer = [A.hell.buffer];
    self.postMessage({ nr, ergebnis: A }, puffer);
  } catch (fehler) { self.postMessage({ nr, fehler: fehler?.message ?? String(fehler) }); }
};
