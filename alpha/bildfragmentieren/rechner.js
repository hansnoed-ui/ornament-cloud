// «Bildfragmentieren» – das Foto im Hintergrund zerlegen (Web Worker): Zeilen, Kanten und Dreiecke, damit die Seite dabei nicht stockt.
import { zerlegen } from "./fragmente.js?v=30";

self.onmessage = (e) => {
  const { nr, daten, w, h, massstab, feinheit } = e.data;
  try {
    self.postMessage({ nr, ergebnis: zerlegen(daten, w, h, { massstab, feinheit }) });
  } catch (fehler) {
    self.postMessage({ nr, fehler: String(fehler?.message ?? fehler) });
  }
};
