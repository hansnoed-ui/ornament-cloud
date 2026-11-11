# Groove 0.1.0 (Drums aus dem Groove-Generator)

Anlass, 11. November 2026, Christian: «bringt drum n bass eigentlich immer den gleichen beat?» Ja: Kick, Snare und Hats standen als feste
Zeilen in `kern/muster.js` und waren in jedem Track gleich; der Startwert änderte nur Ablauf, Unterbrechungen, Effekte und die Darbuka aus
dem Stilmix. Ornament hatte je Abschnitt eigene Grooves, aber auch die waren fest.

Jetzt baut `kern/grooves.js` für **Drum and Bass** und **Ornament** je Startwert einen eigenen Groove (Schalter «Drums aus Grooves», an;
aus = die festen Muster wie bisher). Eigene Regeln, keine nachgebauten Breaks.

## Familien

| Familie | Kick | Snare | Hats |
|---|---|---|---|
| Two-Step | 1 und kurz vor 3, Varianten mit einer Kick mehr | 2 und 4, wenige Geisternoten | Achtel, gebrochen, Sechzehntel, Offbeat |
| Halftime | fast nur auf 1 | nur auf 3 | Sechzehntel, Dreiergruppen |
| Steppers | gerade auf 1 und 3 | 2 und 4 | Offbeat, Achtel |
| Jungle-Break | doppelte Kick, zerhackt | viele Geisternoten, Läufe in Zweiunddreissigsteln | Sechzehntel, Dreiergruppen, leichter Swing |
| Rollend | Two-Step mit leisen Kicks dazwischen | rollende Geisternoten | Dreiergruppen quer zum Takt, Swing 5 % |

Gewichte je Stil (`STIL_GROOVES`): DnB eher Two-Step, Rollend, Jungle; Ornament eher Halftime, Two-Step, Rollend.

## Phrase und Abschnitte

- Kick und Snare als Phrase über vier Takte (Takt 2 kann eine andere Kick-Figur haben, Takt 4 eine Kick mehr und einen Auftakt), Hats über zwei.
- Der Backbeat bleibt immer der Anker; Geisternoten nie auf einer Kick.
- Im ganzen Track bekommt jeder Abschnitt eine Abwandlung: **Gas geben** dichter oder als zerhackter Break, **Atmen** ausgedünnt
  (Kick nur auf 1, Hats in Vierteln oder Offbeats), **Stocken** mit Löchern, **Wiederfinden** leicht verändert, **Aufbau** nur Backbeat,
  Intro und Outro ruhige Hats. Jeder Abschnitt endet mit einem eigenen Wirbel.
- Die Grundzeilen hängen nur vom Startwert ab: «Spuren erzeugen» und «Track erzeugen» mit gleichem Startwert haben dieselbe Phrase. Der Bass
  folgt der Kick wie bisher (`kickVorlage`).

## Regler (Reiter Klang einer Drum-Spur)

Familie (aus dem Startwert oder fest), Dichte, Komplexität, «neu würfeln». Sie gelten für alle Drums des Grooves zusammen. Das Muster bleibt
von Hand änderbar; ein Regler erzeugt es neu.
