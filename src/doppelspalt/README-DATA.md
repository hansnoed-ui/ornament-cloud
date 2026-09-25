# Doppelspalt der Wahrnehmung — data package

This folder is the content and logic handoff for the interactive double wheel.

## Files

- `src/data/artists.ts` — 20 artist records
- `src/data/theorists.ts` — 20 theorist records
- `src/data/constellations.ts` — 99 curated text records
- `src/lib/double-slit/validation.ts` — dataset integrity checks
- `src/lib/double-slit/random.ts` — cryptographically backed uniform draw + 100k simulation helper
- `CLAUDE-CODE-MASTERPROMPT.md` — implementation brief
- `DATA-REVIEW.md` — record of the resolved duplicate-pair review

## Editorial invariants

1. Do not rewrite, shorten, simplify, translate, summarize, or generate replacements for `text` or `question`.
2. `editorialNumber` exists only so a human editor can refer to “Text 73”. Never use it for weighting, sorting a random draw, scoring, or IDs.
3. The runtime state space is the supplied `constellations` array. Never generate the 20 × 20 Cartesian product and filter afterward.
4. A user gesture changes the path/kinematics of the spin, not which record was selected.
5. No immediate repeat of the exact same record.
6. No gender, fame, topic, or frequency weighting.
7. The website copy contains no research/source links.
8. The production corpus contains 99 unique person-pairs. Do not introduce duplicate pairings.

## Conceptual core

**Das Rad erzeugt keine Antworten. Es erzeugt Konstellationen.**

Raum lässt Unterschiede nebeneinander erscheinen.  
Zeit lässt Unterschiede nacheinander erscheinen.  
Wahrnehmung ereignet sich in beidem zugleich.

The wheel should enact this logic rather than merely illustrate it.
