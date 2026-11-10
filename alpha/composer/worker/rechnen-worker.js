// Rechnet erzeugte Spuren ausserhalb der Oberfläche (Flächen brauchen Sekunden). Dieselben Module wie im Hauptfaden: gleiche Abtastwerte.
// Nachricht: { id, q, bezug, rate } → Antwort { id, kanaele } (übertragen) oder { id, fehler }.
// Seit ornament.lucerne auch Sampler-Spuren (bezug.material: Quell-ID → { kanaele, rate }) und { id, art: "analyse", kanaele, rate } →
// { id, ergebnis } (Analyse einer Aufnahme für die Klangsammlung).
import { spurRechnen, flaechenSpurRechnen } from "../kern/erzeugen.js";
import { samplerSpurRechnen, SAMPLER } from "../kern/sampler.js";
import { analysieren } from "../kern/klangsammlung.js";

self.onmessage = ({ data }) => {
  const { id, q, bezug, rate } = data;
  try {
    if (data.art === "analyse") { self.postMessage({ id, ergebnis: analysieren(data.kanaele, data.rate) }); return; }
    const { kanaele } = q.erzeuger === SAMPLER ? samplerSpurRechnen(q, rate, bezug?.material ?? new Map()) : q.flaeche ? flaechenSpurRechnen(q, rate, bezug ?? {}) : spurRechnen(q, rate);
    self.postMessage({ id, kanaele }, kanaele.map((k) => k.buffer));
  } catch (e) { self.postMessage({ id, fehler: String(e?.message ?? e) }); }
};
