// ORNAMENT LAB – Adapter für The Fictory (alpha/the-fictory/). Benutzt Analyse, Prozess und Darstellung unverändert:
//   analysiere()  Farbgruppen (k-Means in Lab), Flächen, Figuren          → Befunde mit Befund, Lesart und Eingriff getrennt
//   erzeugeLauf() / schritt()  sechs Operationen in 900 Schritten          → die sechs Schlüsselzustände sind die sechs Varianten
//   zeichne()     jeder Zustand in beliebiger Grösse                       → Standbilder und die Bildfolge der Animation
// Die Operationsregel (R1–R7) kommt aus einer ORNA-Konstellation am zweiten Eingang oder wird hier von Hand gewählt.
// Braucht den Browser (Canvas); in Node steht die Operation im Register, meldet aber ihre Voraussetzung.
import { analysiere } from "../../../alpha/the-fictory/analyse.js?v=23";
import { erzeugeLauf, anfang, schritt, SCHLUESSEL, GESAMT, STATIONEN, TAKT, beschreibungen } from "../../../alpha/the-fictory/operationen.js?v=23";
import { baueMaterial, zeichne } from "../../../alpha/the-fictory/zeichnen.js?v=23";
import { REGELN } from "../../../alpha/the-fictory/regeln.js?v=23";

const ANALYSE_SEITE = 200;   // wie in The Fictory (app.js)

const leinwand = (w, h) => { const c = document.createElement("canvas"); c.width = Math.max(1, Math.round(w)); c.height = Math.max(1, Math.round(h)); return c; };
const mass = (seite, lang) => (seite >= 1 ? [lang, Math.round(lang / seite)] : [Math.round(lang * seite), lang]);
const gerade = (n) => n - (n % 2);

function vorbereiten(bild, p, konstellation, seed) {
  if (typeof document === "undefined") throw new Error("The Fictory braucht einen Browser (Canvas)");
  const arbeit = leinwand(bild.width, bild.height);
  arbeit.getContext("2d", { willReadFrequently: true }).putImageData(new ImageData(new Uint8ClampedArray(bild.data), bild.width, bild.height), 0, 0);
  const g = ANALYSE_SEITE / Math.max(bild.width, bild.height);
  const klein = leinwand(Math.max(8, bild.width * g), Math.max(8, bild.height * g));
  const kx = klein.getContext("2d", { willReadFrequently: true });
  kx.imageSmoothingQuality = "high";
  kx.drawImage(arbeit, 0, 0, klein.width, klein.height);
  const A = analysiere(kx.getImageData(0, 0, klein.width, klein.height), { farben: p.farben, mindestanteil: p.mindestanteil / 1000, korrekturen: [], verworfen: [], regel: null });
  if (A.teile.length < 2) throw new Error("The Fictory: Es braucht mindestens zwei Teile. Mehr Farbgruppen oder ein kleinerer Mindestanteil helfen.");
  const regel = p.regel || konstellation?.regel || null;
  const M = erzeugeLauf(A, { seed, regel });
  return { A, M, mat: baueMaterial(arbeit, A, M), regel };
}

export const fictory = {
  id: "fictory.prozess",
  name: "The Fictory: Prozess in sechs Operationen",
  version: "0.1.0",
  klasse: "zeitlich",
  herkunft: { art: "adapter", quelle: "The Fictory", datei: "alpha/the-fictory/analyse.js, operationen.js, zeichnen.js (v=23, unverändert)", referenz: null },
  beschreibung: "Das Bild zerfällt in seine Teile: neue Nachbarschaften, Abfolge als Bild, wirksame Spuren, gekoppelte Beziehungen, anders weitergehen, neu zusammengesetzt. Die sechs Schlüsselzustände sind die Varianten.",
  eingaenge: [{ name: "bild", typ: "IMAGE" }, { name: "konstellation", typ: "CONSTELLATION", optional: true }],
  ausgaenge: [{ name: "zustaende", typ: "IMAGE", mehrfach: 6 }],
  parameter: [
    { id: "farben", name: "Farbgruppen", art: "zahl", min: 3, max: 10, standard: 6, schritt: 1 },
    { id: "mindestanteil", name: "kleinste Fläche (‰ des Bildes)", art: "zahl", min: 1, max: 20, standard: 4, schritt: 1 },
    { id: "regel", name: "Operationsregel", art: "wahl", standard: "", optionen: [{ wert: "", name: "aus der Konstellation (oder keine)" }, ...Object.entries(REGELN).map(([k, r]) => ({ wert: k, name: `${k} ${r.name}` }))] },
    { id: "seite", name: "Grösse der Zustände (längste Seite, px)", art: "zahl", min: 480, max: 2048, standard: 1200, schritt: 1 },
  ],
  voraussetzungen: ["Browser mit Canvas 2D (WebGL optional für das Feld)"],
  ressourcen: { zeit: `${GESAMT} Schritte (${GESAMT / TAKT} s Animation), einige Sekunden Rechnung`, speicher: "Material in Arbeitsauflösung" },
  reproduzierbar: "ja",
  varianten: "selbst",

  async ausfuehren({ bild, konstellation }, p, kontext = {}) {
    const seed = (kontext.seed ?? 1) >>> 0;
    const { A, M, mat, regel } = vorbereiten(bild, p, konstellation, seed);
    const [w, h] = mass(A.seite, p.seite);
    const c = leinwand(w, h), ctx = c.getContext("2d", { willReadFrequently: true });
    const z = anfang(M), schluessel = {}, ausgaben = [];
    while (z.schritt < GESAMT) {
      kontext.abbrechen?.throwIfAborted?.();
      schritt(M, z);
      const k = SCHLUESSEL.indexOf(z.schritt);
      if (k >= 1) {
        schluessel[k] = { ereignisse: z.ereignisse.slice() };
        zeichne(ctx, w, h, z, M, mat);
        ausgaben.push({ typ: "IMAGE", titel: `${k} ${STATIONEN[k].titel}`, bild: ctx.getImageData(0, 0, w, h) });
        kontext.melden?.(`The Fictory: ${STATIONEN[k].titel}`, k / 6);
        await new Promise((ok) => setTimeout(ok, 0));
      }
    }
    const texte = beschreibungen(M, schluessel);
    texte.forEach((t, i) => { ausgaben[i].befund = { art: "verifiziert", station: t.nr, operation: t.text, kurz: t.kurz }; });
    const entscheidungen = p.regel ? [{ art: "mensch", gegenstand: "operationsregel", optionen: Object.keys(REGELN), gewaehlt: p.regel, details: { name: REGELN[p.regel].name } }] : [];
    return {
      ausgaben, entscheidungen,
      protokoll: {
        hinweis: "Farb- und geometriebasierte Gliederung, kein semantisches Bildverständnis. Eine ORNA-Ableitung ist eine gestalterische Interpretation.",
        analyse: { analysegroesse: [A.breite, A.hoehe], flaechen: A.flaechen.length, farbgruppen: A.zentren.length, figuren: A.teile.length,
          befunde: A.befunde.map(({ thema, befund, lesart, eingriff }) => ({ thema, befund: { art: "verifiziert", text: befund }, lesart: { art: "gestaltung", text: lesart }, eingriff })) },
        lauf: { startwert: seed, regel, regelName: regel ? REGELN[regel].name : null, regelHerkunft: p.regel ? "von Hand" : konstellation ? `ORNA ${konstellation.nummer}` : "keine", schritte: GESAMT, takt: TAKT, schluesselSchritte: SCHLUESSEL },
      },
    };
  },

  /** die ganze Bewegung: jeder zweite Schritt ein Bild (15 Bilder je Sekunde der Fictory-Zeit), endet im gewählten Zustand */
  async *verlauf({ bild, konstellation }, p, kontext = {}) {
    const { A, M, mat } = vorbereiten(bild, p, konstellation, (kontext.seed ?? 1) >>> 0);
    const [w0, h0] = mass(A.seite, Math.min(p.seite, 1080)), w = gerade(w0), h = gerade(h0);
    const c = leinwand(w, h), ctx = c.getContext("2d", { willReadFrequently: true }), spurCache = {};
    const ziel = SCHLUESSEL[Math.min(6, (kontext.teil ?? 5) + 1)];
    const z = anfang(M);
    zeichne(ctx, w, h, z, M, mat, spurCache);
    yield { k: 0, bild: ctx.getImageData(0, 0, w, h) };
    while (z.schritt < ziel) {
      kontext.abbrechen?.throwIfAborted?.();
      schritt(M, z);
      if (z.schritt % 2 === 0 || z.schritt === ziel) { zeichne(ctx, w, h, z, M, mat, spurCache); yield { k: z.schritt, bild: ctx.getImageData(0, 0, w, h) }; }
    }
  },
};
