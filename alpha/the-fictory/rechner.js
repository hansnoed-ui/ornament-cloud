// «The Fictory» – Vorausrechnung in einem eigenen Faden (Web Worker, seit 11. Oktober 2026): derselbe Lauf wie auf der Seite, aus derselben
// Analyse, demselben Startwert und derselben Regel, also dieselben Zustände. Die Seite spielt währenddessen schon ab; sobald die Momentaufnahmen
// (alle MERKEN Schritte und an den Schlüsselschritten) da sind, stehen Zeitleiste, Standbilder und Export bereit.
import "./sprache.js?v=3";   // die Sätze der Ereignisse in der Sprache der Seite (sie kommt mit der Nachricht)
import { erzeugeLauf, anfang, schritt, kopie, SCHLUESSEL, GESAMT } from "./operationen.js?v=23";

self.onmessage = ({ data }) => {
  self.sprache?.setze(data.sprache);
  const M = erzeugeLauf(data.A, { seed: data.seed, regel: data.regel });
  const z = anfang(M), momente = [kopie(z)];
  while (z.schritt < GESAMT) {
    schritt(M, z);
    if (z.schritt % data.merken === 0 || SCHLUESSEL.includes(z.schritt)) momente.push(kopie(z));
  }
  // die Rechenfelder werden übergeben statt kopiert
  const felder = momente.flatMap((m) => [m.spuren, m.feldA, m.feldB, m.stromU, m.stromV, m.tinte].map((f) => f.buffer));
  self.postMessage({ momente }, felder);
};
