// Geometrie des Doppelrads: 20 feste Plätze pro Ring im 18°-Raster, eine gemeinsame Achse bei 12 Uhr.
//
// Drehwinkel eines Rings: positiv = im Uhrzeigersinn. Platz i liegt im Ring bei i · 18°.
// Er steht auf der Achse (0°), wenn die Drehung ≡ −i · 18° (mod 360) ist.

export const SLOTS = 20;
export const STEP = 360 / SLOTS;   // 18°

export function mod(a, n) {
  return ((a % n) + n) % n;
}

/** Winkel des Platzes i im eigenen Ring (Grad, im Uhrzeigersinn ab 12 Uhr). */
export function slotAngle(index) {
  return index * STEP;
}

/** Drehung des Rings, bei der Platz `index` genau auf der Achse steht (0 ≤ Winkel < 360). */
export function targetRotation(index) {
  return mod(-index * STEP, 360);
}

/** Welcher Platz steht bei dieser Drehung auf der Achse? */
export function indexAtAxis(rotation) {
  return mod(Math.round(-rotation / STEP), SLOTS);
}

/**
 * Aus einem kuratierten Datensatz die beiden Zielwinkel ableiten.
 * Die Plätze folgen der Reihenfolge der Datendateien.
 */
export function targetsFor(record, artists, theorists) {
  const artistIndex = artists.findIndex(p => p.id === record.artistId);
  const theoristIndex = theorists.findIndex(p => p.id === record.theoristId);
  if (artistIndex < 0 || theoristIndex < 0) throw new Error(`Unbekannte Person in ${record.id}`);
  return {
    artistIndex,
    theoristIndex,
    artistTarget: targetRotation(artistIndex),
    theoristTarget: targetRotation(theoristIndex),
  };
}
