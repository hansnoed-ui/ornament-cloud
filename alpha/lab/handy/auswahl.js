// ornament.lab · Handy: was am Handy zur Wahl steht. Ohne DOM, damit Tests es prüfen können (tests/lab-handy.test.mjs).

/** die sechs Bildschirme, in der Reihenfolge der Schalter */
export const NAMEN = Object.freeze(["Material", "Effekt", "Varianten", "Klang", "Film", "Galerie"]);

// Die Effekte am Handy: schnelle Bildoperationen, die es auch lebendig im Film gibt. «ziel» ist der Parameter, den die sechs Varianten verteilen.
export const EFFEKTE = Object.freeze([
  { id: "lab.fluss", name: "Fliessfeld", ziel: "laenge" },
  { id: "lab.schraffur", name: "Schraffur", ziel: "schwelle" },
  { id: "lab.punktieren", name: "Punktieren", ziel: "punkt" },
  { id: "lab.teilung", name: "Teilung", ziel: "schwelle" },
  { id: "lab.raster", name: "Raster", ziel: "zelle" },
  { id: "lab.neusetzen", name: "Neu setzen", ziel: "beteiligt" },
  { id: "lab.pixelsortierung", name: "Sortieren", ziel: "unten" },
  { id: "lab.glitch", name: "Glitch", ziel: "kanalversatz" },
  { id: "lab.wiederholung", name: "Wiederholung", ziel: "groesse" },
  { id: "lab.feedback", name: "Feedback", ziel: "zoom" },
]);
