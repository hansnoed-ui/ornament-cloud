// ORNAMENT LAB – kompositorisches Parametersystem als zwei Operationen (Masterprompt §8, §18; Methode: docs/KOMPOSITION.md).
//   lab.profil      Beobachtung: misst Schwerpunkt und Ausschnitt, Symmetrie, Lichtverteilung, Kontrast, Farbe und Kantenrichtung.
//   lab.komposition räumliche Operation: skaliert dieselben Komponenten (verstärken, aufheben, umkehren) oder gleicht sie einem
//                   Zielprofil an, das an einem anderen eigenen Bild gemessen wurde.
// Gefragt wurde bei ShotDeck, FilmGrab und Flim nur, welche Eigenschaften dort Kategorien sind (Bildausschnitt, Licht, Farbe, Symmetrie).
// Kein Bild von dort wird gelesen oder gespeichert: das Lab misst ausschliesslich Material, das die Person selbst hineinlegt.
import { begrenzen } from "../kern/bilddaten.js";
import { moduliere } from "../kern/modulation.js";
import { profil, pruefeProfil, komponiere, veraenderung, felder, SCHRITTE } from "../kern/komposition.js";

const zahl = (id, name, min, max, standard, schritt, hilfe) => ({ id, name, art: "zahl", min, max, standard, schritt, hilfe });
const faktor = (id, name, hilfe) => zahl(id, name, -1, 2, 1, 0.05, `${hilfe}. 1 lässt stehen, 0 hebt auf, −1 kehrt um, 2 verdoppelt`);
const VERLAUF_BILDER = 36;

export const kompositionProfil = {
  id: "lab.profil",
  name: "Kompositorisches Profil",
  version: "0.1.0",
  klasse: "beobachtung",
  herkunft: { art: "neu", quelle: "ORNAMENT LAB", referenz: "Kategorien von ShotDeck, FilmGrab und Flim (Bildausschnitt, Licht, Farbe, Symmetrie) als Messgrössen; Strukturtensor (Bildanalyse)", datei: "alpha/lab/operationen/komposition.js" },
  beschreibung: "Misst, wie ein Bild gebaut ist: Schwerpunkt und Ausschnitt, Symmetrie, Lichtgefälle, Mitte und Rand, Kontrast, Sättigung, Farbton und Kantenrichtung. Messung, keine Bewertung.",
  eingaenge: [{ name: "bild", typ: "IMAGE" }],
  ausgaenge: [{ name: "profil", typ: "METADATA" }],
  parameter: [],
  voraussetzungen: [],
  ressourcen: { zeit: "einige Durchgänge über höchstens 512 × 512 Messpunkte", speicher: "ein Gleitkommabild" },
  reproduzierbar: "ja",
  varianten: "keine",

  async ausfuehren({ bild }) {
    const d = profil(bild);
    return { ausgaben: [{ typ: "METADATA", titel: "Profil", daten: d }], protokoll: { profil: d } };
  },
};

export const komposition = {
  id: "lab.komposition",
  name: "Komposition verändern",
  version: "0.1.0",
  klasse: "raeumlich",
  herkunft: { art: "neu", quelle: "ORNAMENT LAB", referenz: "Attenuverter (VCV Rack) auf gemessene Bildkomponenten übertragen; Kategorien von ShotDeck, FilmGrab und Flim", datei: "alpha/lab/operationen/komposition.js" },
  beschreibung: "Verstärkt, hebt auf oder kehrt um, was das Profil misst: Lage des Schwerpunkts, Nähe, Symmetrie, Lichtgefälle, Mitte und Rand, Binnenkontrast, Sättigung. Mit einem Zielprofil gleicht sie das Bild einem anderen an. Profil vorher und nachher stehen im Protokoll.",
  eingaenge: [{ name: "bild", typ: "IMAGE" }, { name: "profil", typ: "METADATA", optional: true, vorwaehlen: false }],
  ausgaenge: [{ name: "bild", typ: "IMAGE" }],
  parameter: [
    faktor("ausschnitt", "Ausschnitt: Versatz des Schwerpunkts", "Lage des Gewichts gegenüber der Bildmitte, 0 rückt es in die Mitte"),
    zahl("naehe", "Nähe (Zoom um den Schwerpunkt)", 0.5, 3, 1, 0.05, "über 1 näher heran, unter 1 weiter weg"),
    { id: "rand", name: "Rand beim Verschieben", art: "wahl", standard: "wiederholen", optionen: [{ wert: "wiederholen", name: "wiederholen (im Kreis, aller Inhalt bleibt)" }, { wert: "spiegeln", name: "spiegeln" }, { wert: "grund", name: "dunkler Grund" }] },
    faktor("symmetrie", "Asymmetrie", "der asymmetrische Teil zur gewählten Achse, 0 macht spiegelgleich, −1 spiegelt"),
    { id: "achse", name: "Spiegelachse", art: "wahl", standard: "lr", optionen: [{ wert: "lr", name: "links–rechts" }, { wert: "ou", name: "oben–unten" }] },
    faktor("licht", "Lichtgefälle", "die Zunahme der Helligkeit quer über das Bild, −1 lässt das Licht von der anderen Seite kommen"),
    faktor("mitte", "Mitte/Rand", "der Unterschied zwischen heller oder dunkler Mitte und Rand"),
    faktor("kontrast", "Binnenkontrast", "die Tonwerte ohne Mittel und Lichtverteilung, −1 kehrt sie um"),
    faktor("saettigung", "Sättigung", "die Farbabweichung vom Grau, −1 ergibt Gegenfarben"),
    zahl("angleichung", "Angleichung an das Zielprofil", 0, 1, 1, 0.05, "nur mit Zielprofil: 0 gelten die Faktoren, 1 gilt das Ziel"),
    zahl("seite", "Rechengrösse (längste Seite, px)", 256, 2048, 1200, 1, "begrenzt Rechenzeit und Speicher"),
  ],
  voraussetzungen: [],
  ressourcen: { zeit: "sechs Schritte mit je einer Messung (1200 px: unter 1 s)", speicher: "zwei Gleitkommabilder" },
  reproduzierbar: "ja",
  varianten: "moduliert",

  async ausfuehren({ bild, profil: ziel }, p, kontext = {}) {
    const q = kontext.zeitRouten?.length ? moduliere(this, p, kontext.zeitRouten, 1) : p;
    const ein = begrenzen(bild, p.seite);
    if (ziel) pruefeProfil(ziel);
    const vorher = profil(felder(ein));
    const { bild: out, faktoren } = komponiere(ein, q, { ziel, angleichung: q.angleichung });
    const nachher = profil(out);
    const kurz = veraenderung(vorher, nachher);
    return {
      ausgaben: [{ typ: "IMAGE", titel: ziel ? "Komposition, angeglichen" : "Komposition", bild: out, befund: { art: "verifiziert", hinweis: "Messung, keine Bewertung", kurz, profil: nachher } }],
      protokoll: { reihenfolge: SCHRITTE, faktoren, zielprofil: Boolean(ziel), vorher, nachher, veraenderung: kurz },
    };
  },

  verlaufBilder: () => VERLAUF_BILDER,

  /** die Bildfolge: vom Eingang (alle Faktoren 1) bis zum Ergebnis, die Faktoren wandern gleichmässig */
  async *verlauf({ bild, profil: ziel }, p, kontext = {}) {
    const ein = begrenzen(bild, Math.min(p.seite, 900));
    if (ziel) pruefeProfil(ziel);
    for (let k = 0; k < VERLAUF_BILDER; k++) {
      kontext.abbrechen?.throwIfAborted?.();
      const t = k / (VERLAUF_BILDER - 1), s = t * t * (3 - 2 * t);
      const q = kontext.zeitRouten?.length ? moduliere(this, p, kontext.zeitRouten, t) : p;
      const zwischen = { ...q, angleichung: q.angleichung * s };
      for (const id of ["ausschnitt", "naehe", "symmetrie", "licht", "mitte", "kontrast", "saettigung"]) zwischen[id] = 1 + (q[id] - 1) * s;
      yield { k, bild: komponiere(ein, zwischen, { ziel, angleichung: zwischen.angleichung }).bild };
    }
  },
};
