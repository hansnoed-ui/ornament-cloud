# DATA REVIEW — resolved production corpus

The production corpus now contains:

- **20 artists**
- **20 theorists**
- **99 text records**
- **99 unique artist × theorist pairings**

## Duplicate-pair review resolved

The earlier source corpus contained five repeated person-pairs. The curator approved resolving them before production. The following editorial records were replaced with new constellations while the other version of each repeated pair was retained:

| Editorial no. | New constellation |
|---:|---|
| 24 | Roman Opalka × Lucy Suchman |
| 42 | Marina Abramović × Henri Bergson |
| 46 | Mona Hatoum × N. Katherine Hayles |
| 63 | Sol LeWitt × Judith Butler |
| 78 | Robert Smithson × Michel Foucault |

The retained earlier/later versions are:

- Marina Abramović × Susan Leigh Star — #15 retained
- Mona Hatoum × Claude Shannon — #22 retained
- Robert Smithson × Hannah Arendt — #23 retained
- Roman Opalka × Susan Leigh Star — #70 retained
- Sol LeWitt × George Spencer-Brown — #25 retained

The five replacement texts follow the same editorial rule as the corpus: a short theoretical constellation followed by one open question. They do not provide a synthetic “third thought”; that remains with the user.

## Integrity status

`assertDatasetValid()` now treats unique person-pairs as a production invariant and should pass with **zero duplicate-pair warnings**.

Each record ID and `pairKey` is the pure pair key:

```text
artist-slug__theorist-slug
```

`editorialNumber` remains a human maintenance reference only and must never influence random selection.

## Source cleanup

Citation/export debris from the research drafting stage is not part of the website copy. The production data contains the theoretical prose and open questions, not museum/publisher link residue.
