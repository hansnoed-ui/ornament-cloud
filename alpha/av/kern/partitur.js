// ORNAMENT AV STUDIO – audiovisuelle Partitur: eine Werkfamilie legt Ebenen (Effekte aus /animations), Zuordnungen (Audiosignal → Regler)
// und das Verhalten je Abschnitt fest. Die Partitur ist Daten (im Projekt speicherbar und änderbar); stapelBei() macht daraus zu jeder
// Zeit den Stapel, den der Motor von /animations zeichnet.
//
// Eine Zuordnung: { ebene, ziel: Reglerindex | "deck", quelle: "huelle.bass" | "impuls.kick" | …, von, bis, kurve (Exponent), gewicht }.
// Der Wert eines Reglers ist seine Basis plus die Summe seiner Zuordnungen (von + (bis − von) · signal^kurve), auf 0–1 begrenzt.
// Drei Beziehungen (av-studio.md §3): Synchronität (Impulse), Eigenbewegung (die Effekte laufen in ihrer eigenen Zeit weiter),
// Gegenbewegung («ruhe»: wird die Musik dicht, wird ein Regler ruhiger).

import { wert, abschnittBei } from "./steuerung.js";

export const PARTITUR_VERSION = "0.1.0";

/** Verhalten je Abschnitt (Arrangement 0.2): Faktor auf die Deckkraft der Ebenen 2 und 3, Grau, Helligkeit des Ganzen */
const ABSCHNITT = {
  intro:        { e2: 0, e3: 0.5, grau: 0.2, licht: 0.75 },
  aufbau:       { e2: "rampe", e3: 0.8, grau: 0.1, licht: 0.9 },
  haupt:        { e2: 1, e3: 1, grau: 0, licht: 1 },
  gas:          { e2: 1, e3: 1, grau: 0, licht: 1.05 },
  stocken:      { e2: 1, e3: 0.6, grau: 0.2, licht: 0.95 },
  atmen:        { e2: "atmen", e3: 0.7, grau: 0.1, licht: 0.85 },
  verlieren:    { e2: 1, e3: 1, grau: 0.6, licht: 0.8 },
  wiederfinden: { e2: 1, e3: 1, grau: 0, licht: 1.1, blitz: true },
  outro:        { e2: "ab", e3: "ab", grau: 0.3, licht: "ab" },
};

export const FAMILIEN = Object.freeze({
  organisch: {
    name: "Organische Materie", beschreibung: "das Material bleibt lesbar und atmet mit den Flächen; der Bass treibt eine Strömung, das Licht folgt den Höhen",
    ebenen: [
      { effekt: "bild", werte: [0.25, 0.15, 0, 0.1] },
      { effekt: "fluid", werte: [0.2, 0.5, 0.4], modus: "normal", deckkraft: 0.85 },
      { effekt: "strahlen", werte: [0.3, 0.4, 0.3, 0.6, 1], modus: "bildschirm", deckkraft: 0.55 },
    ],
    zuordnungen: [
      { ebene: 0, ziel: 0, quelle: "huelle.pad", von: 0, bis: 0.6, kurve: 1 },
      { ebene: 0, ziel: 1, quelle: "huelle.bass", von: 0, bis: 0.4, kurve: 1.5 },
      { ebene: 0, ziel: 3, quelle: "impuls.kick", von: 0, bis: 0.35, kurve: 1 },
      { ebene: 1, ziel: 0, quelle: "huelle.bass", von: 0, bis: 0.65, kurve: 1.2 },
      { ebene: 1, ziel: 2, quelle: "huelle.natur", von: 0, bis: 0.5, kurve: 1 },
      { ebene: 2, ziel: 0, quelle: "huelle.pad", von: 0, bis: 0.5, kurve: 1 },
      { ebene: 2, ziel: 2, quelle: "huelle.oben", von: 0, bis: 0.6, kurve: 1 },
      { ebene: 2, ziel: "deck", quelle: "impuls.backbeat", von: 0, bis: 0.3, kurve: 1 },
      { ebene: 1, ziel: 1, quelle: "huelle.summe", von: 0, bis: -0.3, kurve: 1, art: "ruhe" },   // Gegenbewegung: dichte Musik, ruhigere Strömung
    ],
  },
  archiv: {
    name: "Lebendes Archiv", beschreibung: "das Material als Erinnerung: Rauschen und Körnung mit dem Backbeat, Echos mit Melodie und Flächen, die Kick drückt das Bild",
    ebenen: [
      { effekt: "bild", werte: [0.15, 0.1, 0.5, 0.25] },
      { effekt: "entrauschen", werte: [0.25, 0.2, 0.4, 0.4, 0.7], modus: "normal", deckkraft: 0.8 },
      { effekt: "echo", werte: [0.25, 0.2, 0.2, 0.2, 0.3], modus: "bildschirm", deckkraft: 0.6 },
    ],
    zuordnungen: [
      { ebene: 0, ziel: 0, quelle: "impuls.kick", von: 0, bis: 0.5, kurve: 1 },
      { ebene: 0, ziel: 2, quelle: "huelle.melodie", von: 0, bis: -0.4, kurve: 1 },
      { ebene: 1, ziel: 0, quelle: "impuls.backbeat", von: 0, bis: 0.6, kurve: 1 },
      { ebene: 1, ziel: 1, quelle: "huelle.backbeat", von: 0, bis: 0.4, kurve: 1.5 },
      { ebene: 1, ziel: 3, quelle: "huelle.oben", von: 0, bis: 0.4, kurve: 1 },
      { ebene: 2, ziel: 0, quelle: "huelle.pad", von: 0, bis: 0.6, kurve: 1 },
      { ebene: 2, ziel: 4, quelle: "impuls.kick", von: 0, bis: 0.5, kurve: 1 },
      { ebene: 2, ziel: 2, quelle: "huelle.bass", von: 0, bis: 0.3, kurve: 1.5 },
    ],
  },
});

const signal = (sig, quelle, t) => { const [art, g] = quelle.split("."); return wert(sig[art]?.[g] ?? [], t, sig.fps); };
const rampe = (u) => u * u * (3 - 2 * u);

/**
 * der Stapel zur Musikzeit t: { bild, dauer, grund, ebenen: [{ effekt, werte, modus, deckkraft, seed }] } und die Lichtwerte
 * (licht 0–1.2 für das Ganze, dunkel 0–1 aus den Bildbrüchen). familie: ein Eintrag aus FAMILIEN (oder eine geänderte Kopie).
 */
export function stapelBei(t, familie, sig, { bild = "material", seed = 1, dauer = 60, dunkel = 0 } = {}) {
  const ab = abschnittBei(t, sig.abschnitte), v = ABSCHNITT[ab.typ] ?? ABSCHNITT.haupt;
  const ebenen = familie.ebenen.map((e, i) => ({ effekt: e.effekt, werte: [...e.werte], modus: e.modus ?? "normal", deckkraft: e.deckkraft ?? 1, seed: seed + i * 7 }));
  for (const z of familie.zuordnungen) {
    const e = ebenen[z.ebene]; if (!e) continue;
    const s = Math.max(0, Math.min(1, signal(sig, z.quelle, t))) ** (z.kurve ?? 1), d = (z.von ?? 0) + ((z.bis ?? 1) - (z.von ?? 0)) * s;
    if (z.ziel === "deck") e.deckkraft = Math.min(1, Math.max(0, e.deckkraft + d * (z.gewicht ?? 1)));
    else e.werte[z.ziel] = Math.min(1, Math.max(0, (e.werte[z.ziel] ?? 0) + d * (z.gewicht ?? 1)));
  }
  // Abschnitte: Ebenen 2 und 3 ein- und ausblenden, Grau, Licht; Wiederfinden: ein Lichtstoss am Anfang
  const fak = (x) => (x === "rampe" ? rampe(ab.u) : x === "ab" ? 1 - rampe(ab.u) : x === "atmen" ? 0.4 + 0.6 * signal(sig, "huelle.pad", t) : x);
  if (ebenen[1]) ebenen[1].deckkraft *= fak(v.e2);
  if (ebenen[2]) ebenen[2].deckkraft *= fak(v.e3);
  if (ebenen[0]?.effekt === "bild") ebenen[0].werte[2] = Math.min(1, (ebenen[0].werte[2] ?? 0) + v.grau);
  let licht = fak(v.licht);
  if (v.blitz) licht += 0.6 * Math.exp(-(t - ab.a) / 0.35);
  return { stapel: { bild, dauer, grund: "schwarz", durchlauf: true, ebenen }, licht, dunkel, abschnitt: ab };
}
