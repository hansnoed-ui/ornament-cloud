// «Sketchory» – das Bild im Hintergrund lesen (Web Worker), damit die Seite dabei nicht stockt.
import { striche } from "./strich.js?v=6";

self.onmessage = (e) => {
  const { nr, daten, breite, hoehe, empfindlichkeit } = e.data;
  try {
    self.postMessage({ nr, ergebnis: striche(daten, breite, hoehe, { empfindlichkeit }) });
  } catch (fehler) {
    self.postMessage({ nr, fehler: String(fehler?.message ?? fehler) });
  }
};
