import { artists } from "../../data/artists";
import { theorists } from "../../data/theorists";
import { constellations } from "../../data/constellations";

export type ValidationIssue = {
  level: "error" | "warning";
  code: string;
  message: string;
};

export function validateDataset(options: { strictUniquePairs?: boolean } = {}): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const strictUniquePairs = options.strictUniquePairs ?? true;

  if (artists.length !== 20) issues.push({ level: "error", code: "ARTIST_COUNT", message: `Expected 20 artists, found ${artists.length}.` });
  if (theorists.length !== 20) issues.push({ level: "error", code: "THEORIST_COUNT", message: `Expected 20 theorists, found ${theorists.length}.` });
  if (constellations.length !== 99) issues.push({ level: "error", code: "CONSTELLATION_COUNT", message: `Expected 99 constellations, found ${constellations.length}.` });

  const allPeople = [...artists, ...theorists];
  const personIds = new Set<string>();
  for (const person of allPeople) {
    if (personIds.has(person.id)) issues.push({ level: "error", code: "DUPLICATE_PERSON_ID", message: `Duplicate person id: ${person.id}` });
    personIds.add(person.id);
  }

  const artistIds = new Set(artists.map(p => p.id));
  const theoristIds = new Set(theorists.map(p => p.id));
  const constellationIds = new Set<string>();
  const pairMap = new Map<string, number[]>();
  const usedArtists = new Set<string>();
  const usedTheorists = new Set<string>();

  for (const item of constellations) {
    if (constellationIds.has(item.id)) issues.push({ level: "error", code: "DUPLICATE_CONSTELLATION_ID", message: `Duplicate constellation id: ${item.id}` });
    constellationIds.add(item.id);

    if (!artistIds.has(item.artistId as never)) issues.push({ level: "error", code: "UNKNOWN_ARTIST", message: `Unknown artistId in #${item.editorialNumber}: ${item.artistId}` });
    if (!theoristIds.has(item.theoristId as never)) issues.push({ level: "error", code: "UNKNOWN_THEORIST", message: `Unknown theoristId in #${item.editorialNumber}: ${item.theoristId}` });
    if (!item.text.trim()) issues.push({ level: "error", code: "EMPTY_TEXT", message: `Empty text in #${item.editorialNumber}.` });
    if (!item.question.trim()) issues.push({ level: "error", code: "EMPTY_QUESTION", message: `Empty question in #${item.editorialNumber}.` });

    const expectedPairKey = `${item.artistId}__${item.theoristId}`;
    if (item.pairKey !== expectedPairKey) issues.push({ level: "error", code: "PAIR_KEY_MISMATCH", message: `pairKey mismatch in #${item.editorialNumber}: expected ${expectedPairKey}, found ${item.pairKey}.` });
    if (item.id !== expectedPairKey) issues.push({ level: "error", code: "CONSTELLATION_ID_MISMATCH", message: `id mismatch in #${item.editorialNumber}: expected ${expectedPairKey}, found ${item.id}.` });

    usedArtists.add(item.artistId);
    usedTheorists.add(item.theoristId);
    const nums = pairMap.get(item.pairKey) ?? [];
    nums.push(item.editorialNumber);
    pairMap.set(item.pairKey, nums);
  }

  for (const artist of artists) if (!usedArtists.has(artist.id)) issues.push({ level: "error", code: "UNUSED_ARTIST", message: `Artist never appears: ${artist.name}` });
  for (const theorist of theorists) if (!usedTheorists.has(theorist.id)) issues.push({ level: "error", code: "UNUSED_THEORIST", message: `Theorist never appears: ${theorist.name}` });

  for (const [pairKey, nums] of pairMap) {
    if (nums.length > 1) {
      issues.push({
        level: strictUniquePairs ? "error" : "warning",
        code: "DUPLICATE_PAIR",
        message: `Pair ${pairKey} occurs in editorial entries ${nums.join(", ")}.`,
      });
    }
  }

  return issues;
}

export function assertDatasetValid(options: { strictUniquePairs?: boolean } = {}): void {
  const issues = validateDataset(options);
  const errors = issues.filter(issue => issue.level === "error");
  if (errors.length) {
    throw new Error(`Doppelspalt dataset validation failed:\n${errors.map(e => `- [${e.code}] ${e.message}`).join("\n")}`);
  }
  const warnings = issues.filter(issue => issue.level === "warning");
  if (warnings.length && typeof console !== "undefined") {
    console.warn(`Doppelspalt dataset warnings:\n${warnings.map(w => `- [${w.code}] ${w.message}`).join("\n")}`);
  }
}
