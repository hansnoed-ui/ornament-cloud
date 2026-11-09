// Rechnet erzeugte Spuren ausserhalb der Oberfläche (Flächen brauchen Sekunden). Dieselben Module wie im Hauptfaden: gleiche Abtastwerte.
// Nachricht: { id, q, bezug, rate } → Antwort { id, kanaele } (übertragen) oder { id, fehler }.
import { spurRechnen, flaechenSpurRechnen } from "../kern/erzeugen.js";

self.onmessage = ({ data: { id, q, bezug, rate } }) => {
  try {
    const { kanaele } = q.flaeche ? flaechenSpurRechnen(q, rate, bezug ?? {}) : spurRechnen(q, rate);
    self.postMessage({ id, kanaele }, kanaele.map((k) => k.buffer));
  } catch (e) { self.postMessage({ id, fehler: String(e?.message ?? e) }); }
};
