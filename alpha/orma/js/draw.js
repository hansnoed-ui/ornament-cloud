// ORMA – Ziehung einer Pilot-Konstellation.
// Gezogen wird immer ein ganzer Datensatz (nie zwei unabhängige Namen); die Radstellung folgt daraus.
// Erste Ziehung: gleichverteilt über alle zwölf. Danach ist die zuletzt gezeigte ausgeschlossen,
// gezogen wird gleichverteilt aus den übrigen elf. Die Geste bestimmt nur die Bewegung.

/** Gleichverteilte ganze Zahl in [0, n) aus crypto.getRandomValues, mit Rejection Sampling */
export function randomIndex(n, random = defaultRandom) {
  if (!Number.isInteger(n) || n < 1 || n > 0x100000000) throw new RangeError(`randomIndex: n = ${n}`);
  const limit = Math.floor(0x100000000 / n) * n;      // grösstes Vielfaches von n unter 2^32
  for (;;) {
    const x = random();
    if (x < limit) return x % n;                       // oberhalb der Grenze verwerfen: keine Schieflage
  }
}

function defaultRandom() {
  const a = new Uint32Array(1);
  crypto.getRandomValues(a);
  return a[0];
}

/**
 * Nächste Konstellation: ids = die freigegebenen IDs, lastId = zuletzt gezeigte (oder null).
 * Eine unbekannte lastId schliesst nichts aus.
 */
export function drawNext(ids, lastId = null, random = defaultRandom) {
  const pool = ids.filter(id => id !== lastId);
  if (!pool.length) throw new Error("drawNext: keine Konstellation verfügbar");
  return pool[randomIndex(pool.length, random)];
}
