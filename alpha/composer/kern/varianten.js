// Varianten des Kanalzugs je Spurtyp: vier Einstellungen nebeneinander, mit 1–4 während des Abspielens umschalten. «neutral» ist immer
// die erste (alles aus), damit die Wahl gegen den unbearbeiteten Klang hörbar bleibt. Ausgangspunkt ist Christians Geschmack
// (dunkel, warm, nah, starke Bässe, wenig über 2 kHz); die Zahlen sind Vorschläge, seine Urteile stehen in DECISIONS.md.
// Nur Abweichungen vom Standard des Kanalzugs 0.1.0 stehen hier.

export const SPURTYPEN = Object.freeze([
  { typ: "drums", name: "Drums", muster: /drum|schlag|beat-?drum/i },
  { typ: "perkussion", name: "Percussion", muster: /perc|tabla|zarb|hand/i },
  { typ: "bass", name: "Bass", muster: /bass|sub/i },
  { typ: "stimme", name: "Stimme", muster: /voc|stimm|voice|rap/i },
  { typ: "flaeche", name: "Fläche", muster: /pad|fl(ae|ä)che/i },
  { typ: "melodie", name: "Melodie", muster: /melod|lead|keys|piano|blaes/i },
  { typ: "rest", name: "Rest (Samples)", muster: /rest|other|sample/i },
  { typ: "summe", name: "Summe", muster: /master|mix|summe|beat/i },
]);

export function typAusName(name) { return (SPURTYPEN.find((t) => t.muster.test(name)) ?? { typ: "rest" }).typ; }

const V = (name, beschreibung, werte) => ({ name, beschreibung, werte });
const NEUTRAL = V("neutral", "alles aus, wie die Quelle", {});

export const VARIANTEN = Object.freeze({
  drums: [NEUTRAL,
    V("warm", "Band-Sättigung, etwas Bauch bei 90 Hz, Glanz ab 14 kHz weg", { tiefF: 90, tiefDB: 2, antrieb: 7, waerme: 35, tiefpass: 14000 }),
    V("Druck", "parallel komprimiert: Anschläge bleiben, der Raum zwischen den Schlägen kommt hoch", { schwelle: -26, verhaeltnis: 4, angriff: 12, freigabe: 110, aufholen: 9, anteil: 55, mitteF: 220, mitteDB: 1.5 }),
    V("staubig", "dunkel und gesättigt, wie von der Platte: Höhen ab 5 kHz zurück, Tiefpass bei 9 kHz", { hochpass: 35, hochF: 5000, hochDB: -4, antrieb: 10, waerme: 50, tiefpass: 9000, ausgang: -1 })],
  perkussion: [NEUTRAL,
    V("Holz", "Körper der Handtrommel bei 300 Hz, Höhen weich", { hochpass: 60, mitteF: 300, mitteQ: 1.1, mitteDB: 2.5, hochF: 7000, hochDB: -2.5 }),
    V("nah", "leicht komprimiert, Anschlag vorne", { schwelle: -22, verhaeltnis: 3, angriff: 8, freigabe: 90, aufholen: 4 }),
    V("staubig", "gesättigt und dunkel", { antrieb: 9, waerme: 40, tiefpass: 8000 })],
  bass: [NEUTRAL,
    V("rund", "Sub verstärkt, Obertöne über 4 kHz weg, sanft komprimiert", { tiefF: 70, tiefDB: 3, tiefpass: 4000, schwelle: -20, verhaeltnis: 3, angriff: 20, freigabe: 200, aufholen: 2 }),
    V("Sub fest", "Hochpass bei 28 Hz, stark und langsam komprimiert: gleichmässiger Boden", { hochpass: 28, schwelle: -24, verhaeltnis: 6, angriff: 30, freigabe: 300, aufholen: 5, antrieb: 4, waerme: 20 }),
    V("Holz", "Kontrabass: Griff bei 700 Hz, Röhrenwärme, Tiefpass bei 5 kHz", { mitteF: 700, mitteQ: 1.2, mitteDB: 3, antrieb: 8, waerme: 60, tiefpass: 5000 })],
  stimme: [NEUTRAL,
    V("Präsenz", "Hochpass 90 Hz, Glocke +3 dB bei 3 kHz, schnell komprimiert", { hochpass: 90, mitteF: 3000, mitteQ: 1, mitteDB: 3, schwelle: -22, verhaeltnis: 3, angriff: 5, freigabe: 120, aufholen: 4 }),
    V("nur Druck", "parallele Kompression wie im Song-Master der Studio-Kette (Wahl vom 29. Oktober 2026)", { hochpass: 80, schwelle: -30, verhaeltnis: 5, angriff: 3, freigabe: 140, aufholen: 10, anteil: 45, mitteF: 2500, mitteDB: 1.5 }),
    V("warm nah", "Brust bei 200 Hz, Höhen ab 8 kHz zurück, etwas Sättigung", { hochpass: 70, tiefF: 200, tiefDB: 2, hochF: 8000, hochDB: -3, antrieb: 5, waerme: 30 })],
  flaeche: [NEUTRAL,
    V("dunkel", "Höhen ab 3,5 kHz zurück, Tiefpass bei 8 kHz", { hochpass: 120, hochF: 3500, hochDB: -5, tiefpass: 8000 }),
    V("weich", "sanft komprimiert, etwas Band", { hochpass: 100, schwelle: -24, verhaeltnis: 2, angriff: 40, freigabe: 400, aufholen: 3, antrieb: 4, waerme: 30 }),
    V("Glanz", "Hochpass 150 Hz, Höhen ab 9 kHz +3 dB", { hochpass: 150, hochF: 9000, hochDB: 3 })],
  melodie: [NEUTRAL,
    V("warm", "Röhrenwärme, Tiefpass bei 7 kHz", { hochpass: 100, antrieb: 6, waerme: 55, tiefpass: 7000 }),
    V("vorne", "Glocke bei 1,5 kHz, leicht komprimiert", { hochpass: 120, mitteF: 1500, mitteDB: 2.5, schwelle: -20, verhaeltnis: 2.5, aufholen: 2 }),
    V("dunkel", "Höhen ab 3 kHz −6 dB", { hochpass: 80, hochF: 3000, hochDB: -6 })],
  rest: [NEUTRAL,
    V("dunkel", "Höhen ab 3,5 kHz zurück, Tiefpass bei 9 kHz: die Samples rücken nach hinten", { hochpass: 90, hochF: 3500, hochDB: -4, tiefpass: 9000 }),
    V("weich", "sanft komprimiert und gesättigt", { hochpass: 80, schwelle: -24, verhaeltnis: 2, angriff: 25, freigabe: 300, aufholen: 3, antrieb: 5, waerme: 35 }),
    V("Glanz", "Hochpass 150 Hz, Höhen ab 9 kHz +3 dB", { hochpass: 150, hochF: 9000, hochDB: 3 })],
  summe: [NEUTRAL,
    V("warm", "Band auf der Summe, Glanz ab 15 kHz weg", { antrieb: 4, waerme: 30, tiefpass: 15000 }),
    V("Bus-Kleber", "2:1, langsamer Angriff, wenig Reduktion", { schwelle: -18, verhaeltnis: 2, angriff: 30, freigabe: 250, aufholen: 1.5 }),
    V("dunkel", "Spellbound-Richtung: Höhen ab 2,5 kHz −3 dB, Bauch bei 80 Hz", { tiefF: 80, tiefDB: 2, hochF: 2500, hochDB: -3 })],
});

export const variantenFuer = (typ) => VARIANTEN[typ] ?? VARIANTEN.rest;
