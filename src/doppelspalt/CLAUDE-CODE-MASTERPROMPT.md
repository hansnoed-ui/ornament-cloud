# CLAUDE CODE MASTERPROMPT
## Doppelspalt der Wahrnehmung — interactive constellation wheel

Read this entire brief, `README-DATA.md`, `DATA-REVIEW.md`, and the supplied TypeScript data files before changing code.

## 1. Objective

Build a production-quality interactive web artwork called **„Doppelspalt der Wahrnehmung“** inside the existing website. Inspect the current stack, routing, CSS, components, design tokens, animations and deployment first. Respect the existing architecture; do not create a parallel mini-site or install unnecessary dependencies.

The central interface is a **concentric double wheel**:
- outer ring: 20 artists
- inner ring: 20 theorists
- rings rotate in opposite directions
- a touch/drag/flick gesture starts the movement
- both settle on one shared selection axis
- the selected constellation reveals the full names, curated text, then its open question

This is not a quiz, personality test, ranking, matching app, casino game or AI text generator. It is a **Konstellationsmaschine**.

**Das Rad erzeugt keine Antworten. Es erzeugt Konstellationen.**

## 2. Theoretical core

Kunst versucht, Wahrnehmung an Kommunikation anzuschließen – zunächst unter Umgehung oder Unterlaufen ihrer sprachlich-begrifflichen Verarbeitung. Wahrnehmung selbst lässt sich nicht übertragen: Sie ereignet sich körperlich an einer bestimmten Stelle und in einem bestimmten Moment.

**Verräumlichung und Verzeitlichung sind Wahrnehmungsmedien.**

**Raum lässt Unterschiede nebeneinander erscheinen.  
Zeit lässt Unterschiede nacheinander erscheinen.  
Wahrnehmung ereignet sich in beidem zugleich.**

Verräumlichung erzeugt Stellen, Abstände, Grenzen, Formen, Vergleichbarkeit und gleichzeitig verfügbare Möglichkeiten. Verzeitlichung erzeugt Ereignisse, Folgen, Dauer, Aktualisierung, Wiederkehr und irreversible Veränderung.

The interface should enact this rather than explain it didactically.

Internal logic:
**Möglichkeitsraum → Bewegung → Selektion → Aktualisierung → Beobachtung → erneute Offenheit**

Do not display these as tutorial labels during play.

## 3. Curated state space

The runtime state space is exactly `src/data/constellations.ts`.

Never:
1. create all 400 mathematical artist × theorist combinations,
2. draw from 400,
3. test validity,
4. repair an invalid draw.

Instead:
1. draw one record from the curated array,
2. derive its artist and theorist target angles,
3. animate the two rings independently toward those target positions.

Conceptual rule: **Noch bevor der Zufall beginnt, wurde bereits unterschieden.**

IMPORTANT: the editorial review is resolved. The supplied production corpus contains exactly **99 unique artist × theorist pairings**. Treat uniqueness of the person-pair as a hard production invariant. Do not generate replacements or additional combinations.

## 4. Random selection

Use the supplied `drawConstellation()` implementation or an equivalent using `crypto.getRandomValues()` with rejection sampling.

All 99 text records have equal probability.
Do not weight by gender, fame, artist, theorist, topic, previous frequency or any score.
Only UX exception: the exact same record may not occur twice immediately in succession.

The gesture must NOT determine the selected record. It determines the path: velocity, direction, rotations and duration.

## 5. Geometry

Use two concentric rings with 20 fixed person slots each:
`360 / 20 = 18 degrees`.

Use one common selection axis, preferably around 12 o’clock unless the existing composition suggests a better precise location.

The selected record determines:
- `artistTargetAngle`
- `theoristTargetAngle`

The two end positions are logically coupled by the selected record, but the trajectories must look independent:
- opposite directions
- different full-rotation counts
- slightly different durations
- different inertial/deceleration curves
- no visually obvious synchronized correction

The motion must not reveal the result early.

## 6. Gesture and spin physics

Mobile first. Primary interaction: thumb flick / drag.

Capture:
- start position
- direction
- velocity
- duration
- release velocity

The gesture may influence:
- initial velocity
- rotation count
- duration
- outer-ring direction

The inner ring reacts counter-rotationally.

Preferred implementation: `requestAnimationFrame`, no large physics library unless already present.

Use a hybrid motion:
A. gesture impulse  
B. apparently free inertial rotation with friction  
C. imperceptible controlled convergence on target angles

No visible snap.

Typical spin: ~3–6 s.
Avoid <1.5 s and routinely >7 s.

## 7. State machine

Implement explicit states:

```ts
type WheelState =
  | "idle"
  | "dragging"
  | "spinning"
  | "settling"
  | "selected";
```

No new draw while `spinning` or `settling`.
Prevent race conditions from rapid touches.

After a spin, do not reset to zero. The next movement begins from the reached angular state. The system’s past remains in its present position.

## 8. Visual language

Aim for:
**contemporary art publication × scientific apparatus × poetic instrument**

Background: white/off-white according to the existing site.
Palette: black and grayscale; at most a restrained existing accent.

Avoid:
- casino/spinner aesthetics
- neon
- chrome
- confetti
- gaming HUDs
- pseudo-AI futurism
- excessive shadows
- glossy buttons

Precision before spectacle. Whitespace before controls.

## 9. Symbols

Give each of the 40 people a distinct abstract SVG sign generated from one visual grammar:
- point
- line
- circle
- arc
- boundary
- interruption
- grid
- crossing
- repetition
- offset
- overlay
- open/closed form

No portraits, artwork reproductions, emojis, logos or dominant initials.

**The symbols are addresses, not illustrations.**

They must remain distinguishable at roughly 20–30 px visible size on mobile, with larger accessible touch targets.

## 10. Names and axis

On the moving wheel, prioritize symbols.
Full names appear clearly after selection and may appear subtly on hover/tap or near the selection axis.

Display the result as:
**Agnes Martin × Niklas Luhmann**

Use `×`, never “versus”, “match”, “winner” or score language.

The selection axis should be a fine shared line/notch/marker: precise, not dominant.

Keep the center mostly empty. Before first interaction, a minimal “drehen” cue is acceptable; hide it once motion begins.

## 11. Time trace

Experiment with a very subtle fading trace of a few previous angular states.
No motion blur, neon trail, glow or particles.

Concept:
**Vergangenheit kann Spuren hinterlassen. Zukunft bleibt unsichtbar.**

If the trace weakens the composition, omit it.

Never preview:
- target
- future pair
- landing point
- probabilities

## 12. Result reveal

After settling:
1. both selected symbols exactly meet the axis
2. other symbols recede slightly
3. 300–700 ms pause
4. full names appear
5. `text` appears
6. `question` appears with extra whitespace

No dramatic reveal.

Tone: **Das Ereignis ist eingetreten. Jetzt kann es beobachtet werden.**

Text max width desktop roughly 600–760 px with generous leading.
On mobile: wheel first, result below.
Do not label the question “Frage”, “Denk darüber nach”, etc. Let it stand.

Provide a discreet “noch einmal drehen”.

## 13. Intro copy

Use:

### Der Doppelspalt der Wahrnehmung

Kunst versucht, Wahrnehmung an Kommunikation anzuschließen – zunächst unter Umgehung oder Unterlaufen ihrer sprachlich-begrifflichen Verarbeitung. Wahrnehmung selbst lässt sich dabei nicht übertragen: Sie ereignet sich körperlich an einer bestimmten Stelle und in einem bestimmten Moment.

**Verräumlichung und Verzeitlichung sind Wahrnehmungsmedien.**

**Raum lässt Unterschiede nebeneinander erscheinen.  
Zeit lässt Unterschiede nacheinander erscheinen.  
Wahrnehmung ereignet sich in beidem zugleich.**

Verräumlichung erzeugt Stellen, Abstände, Grenzen, Formen und gleichzeitig verfügbare Möglichkeiten. Verzeitlichung erzeugt Ereignisse, Folgen, Dauer, Wiederkehr und irreversible Veränderung.

Kunstwerke operieren mit beiden Medien.

Das Rad bringt künstlerische und theoretische Positionen zufällig zusammen und beobachtet, was zwischen ihren unterschiedlichen Verräumlichungen und Verzeitlichungen geschieht.

**Das Rad erzeugt keine Antworten. Es erzeugt Konstellationen.**

Mobile: initially show only title + the three-line Raum/Zeit/Wahrnehmung statement + `mehr lesen`; expand the rest.

## 14. Responsive and accessibility

Priority:
1. smartphone portrait
2. tablet
3. desktop

A useful starting point:
```css
width: min(92vw, 680px);
aspect-ratio: 1;
```

No horizontal scrolling.

Support `prefers-reduced-motion`: short controlled movement, same complete result.

Keyboard:
- wheel focusable
- Space/Enter starts spin

ARIA:
- do not expose 40 symbols as a chaotic reading list
- after settling announce via live region: “Konstellation: Agnes Martin und Niklas Luhmann.”
- do not auto-read the full essay text

## 15. Technology and performance

Prefer SVG + CSS + TypeScript/JavaScript.
Avoid Canvas unless there is a strong existing-project reason.
Use transform/rotation efficiently.

Keep data, geometry, random selection, spin logic and visual components separate.

Suggested shape (adapt to project):
```text
src/
  data/
    artists.ts
    theorists.ts
    constellations.ts
  components/
    double-slit/
      DoubleSlitWheel
      ArtistRing
      TheoristRing
      SelectionAxis
      PairResult
      Intro
      PersonSymbol
  lib/
    double-slit/
      random.ts
      geometry.ts
      spin.ts
      validation.ts
```

## 16. Deep linking

Prepare stable record addressing so a later URL can load a record, e.g.:
`?pair=agnes-martin__niklas-luhmann`

Because `DATA-REVIEW.md` currently contains five repeated person-pairs, use the unique record `id` when necessary during development. Do not create a prominent share button yet.

## 17. No gamification

Never add:
- points
- scores
- progress 17/99
- achievements
- badges
- streaks
- rarity
- winners
- leaderboards
- confetti
- casino sounds

The user does not need to know there are 99 records.

## 18. Development diagnostics

Development only:
- choose a record by ID
- show target angles
- show current angles
- show state
- show rotation duration
- run dataset validation
- run the 100,000-draw simulation

Production: hide all diagnostics.

## 19. Data integrity

Do not rewrite, shorten, summarize, simplify or regenerate any `text` or `question`.

Run `validateDataset()` immediately.
The production dataset must return **no `DUPLICATE_PAIR` warnings or errors**.

After the curator resolves those five pairs, enable:
`assertDatasetValid({ strictUniquePairs: true })` must pass.

## 20. Tests

At minimum test:
- 20 artists
- 20 theorists
- 99 records
- all IDs/references valid
- all 40 people used
- no unreachable record
- 100,000 draws
- no immediate identical-record repeat
- mobile portrait
- tablet
- desktop
- slow drag
- fast flick
- opposite flick direction
- rapid repeated taps
- keyboard
- reduced motion
- screen-reader structure
- long names: Wendy Hui Kyong Chun, N. Katherine Hayles, Felix Gonzalez-Torres, George Spencer-Brown

## 21. Workflow

Do not blindly implement.

### Phase 1 — INSPECT
Inspect stack, routing, CSS, components, animation patterns, design tokens and deployment.

### Phase 2 — PLAN
Before code changes, report briefly:
- files to create/change
- data/component separation
- target-angle calculation
- touch physics
- validation strategy
- how existing site design will be preserved

Then implement.

### Phase 3 — GEOMETRY
Two rings, 20 slots each, axis, responsive SVG.

### Phase 4 — INTERACTION
Touch, drag, flick, counter-rotation, momentum, landing.

### Phase 5 — DATA
Integrate the supplied files without editorial changes.

### Phase 6 — VISUAL SYSTEM
40 symbols, typography, intro, result.

### Phase 7 — POLISH
Trace experiment, reduced motion, transitions, mobile refinement.

### Phase 8 — TEST
Run tests, fix failures, write a short technical note.

## 22. Success criteria

The work is finished when:
1. the double wheel feels physically satisfying on mobile
2. the two rings move credibly against one another
3. every landing resolves to a supplied curated record
4. no non-curated combination can be generated
5. motion does not reveal the target early
6. the user affects the path, not the selected record
7. the interface does not resemble gambling
8. symbols form one coherent visual language
9. text is excellent to read
10. the open question remains open
11. the software does not supply a synthesis
12. past is at most a trace
13. future remains invisible
14. the next spin starts from the reached state
15. after ten spins it still feels like a thinking machine, not a quiz

## 23. Final rule

When uncertain:
- precision before spectacle
- whitespace before extra control
- physical plausibility before effect
- keep differences open instead of forcing synthesis
- never alter curated prose autonomously

**Stabilisiere die Anordnung.  
Lass ein Ereignis geschehen.  
Zeige die entstandene Differenz.  
Schließe sie nicht.**

**Das Rad erzeugt keine Antworten. Es erzeugt Konstellationen.**

Begin now with **INSPECT and PLAN**. Change code only after that.
