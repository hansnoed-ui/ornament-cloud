import type { Constellation } from "../../data/constellations";

/** Uniform integer in [0, upperExclusive) using rejection sampling to avoid modulo bias. */
export function secureRandomIndex(upperExclusive: number): number {
  if (!Number.isSafeInteger(upperExclusive) || upperExclusive <= 0 || upperExclusive > 0x100000000) {
    throw new RangeError("upperExclusive must be an integer between 1 and 2^32.");
  }

  const range = 0x100000000;
  const limit = range - (range % upperExclusive);
  const buffer = new Uint32Array(1);
  let value: number;

  do {
    crypto.getRandomValues(buffer);
    value = buffer[0];
  } while (value >= limit);

  return value % upperExclusive;
}

/**
 * Draws one of the curated records uniformly.
 * The immediately previous record is excluded, so when previousId is present
 * the draw is uniform across the remaining 98 records.
 */
export function drawConstellation(
  constellations: readonly Constellation[],
  previousId?: string,
): Constellation {
  if (constellations.length === 0) throw new Error("No constellations supplied.");

  const available =
    previousId && constellations.length > 1
      ? constellations.filter(item => item.id !== previousId)
      : [...constellations];

  return available[secureRandomIndex(available.length)];
}

/** Development-only smoke test. Do not ship this loop in a production interaction. */
export function simulateDraws(
  constellations: readonly Constellation[],
  draws = 100_000,
): Map<string, number> {
  const counts = new Map(constellations.map(item => [item.id, 0]));
  let previousId: string | undefined;

  for (let i = 0; i < draws; i += 1) {
    const item = drawConstellation(constellations, previousId);
    counts.set(item.id, (counts.get(item.id) ?? 0) + 1);
    if (item.id === previousId) throw new Error(`Immediate repeat at draw ${i}: ${item.id}`);
    previousId = item.id;
  }

  for (const item of constellations) {
    if ((counts.get(item.id) ?? 0) === 0) throw new Error(`Unreachable constellation: ${item.id}`);
  }
  return counts;
}
