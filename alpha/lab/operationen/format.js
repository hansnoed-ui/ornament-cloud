// ORNAMENT LAB – Format (räumliche Operation, seit Lab 0.1.37): ein Bild in ein Seitenverhältnis einpassen, als Ausschnitt ohne Rand und ohne
// Skalierung. Christian (25. Oktober 2026): «Wie ist es mit dem Ausgabeformat im Lab? Ich vermute, der Zettel und die ORNA-Konstellation müssen
// ins Format passen.» Der Film über Stationen nimmt das Format seiner ersten Station, Karten und Signatur zeichnen im Mass des Bildes am Eingang:
// darum reicht es, das Material zuerst in das Format zu bringen; alles Weitere (Abschnitte, Karten, Signatur, Film) entsteht dann in diesem Format.
// Die Zusammenstellung (kern/zusammenstellung.js, plan.format) tut genau das; die Operation steht aber auch für sich im Register.
// Reines JavaScript, ohne DOM; die Masse werden gerade (H.264 verlangt gerade Breite und Höhe).
import { neuesBild } from "../kern/bilddaten.js";

/** die Formate: Kennung → Seitenverhältnis und Name (die Kennung ist auch der Wert des Parameters «format» und von plan.format) */
export const FORMATE = Object.freeze({
  "9:16": { b: 9, h: 16, name: "9:16 hoch (Reels, Stories)" },
  "4:5": { b: 4, h: 5, name: "4:5 hoch (Instagram)" },
  "1:1": { b: 1, h: 1, name: "1:1 quadratisch" },
  "16:9": { b: 16, h: 9, name: "16:9 quer (Video)" },
});

const gerade = (n) => Math.max(2, Math.floor(n / 2) * 2);

/** der Ausschnitt eines Bildes w × h im Format: { x, y, b, h } (Masse gerade); lage 0..1 schiebt den Ausschnitt von links/oben nach rechts/unten */
export function ausschnitt(w, h, format, lage = 0.5) {
  const f = FORMATE[format];
  if (!f) throw new Error(`Format ${format} gibt es nicht`);
  const ziel = f.b / f.h, l = Math.min(1, Math.max(0, Number(lage) || 0));
  let b = w, hh = h;
  if (w / h > ziel) b = Math.min(w, Math.round(h * ziel)); else hh = Math.min(h, Math.round(w / ziel));
  b = gerade(b); hh = gerade(hh);
  return { x: Math.round((w - b) * l), y: Math.round((h - hh) * l), b, h: hh };
}

export const formatOperation = {
  id: "lab.format",
  name: "Format: Ausschnitt im Seitenverhältnis",
  version: "0.1.0",
  klasse: "raeumlich",
  herkunft: { art: "neu", quelle: "ORNAMENT LAB", referenz: "die Seitenverhältnisse der Kanäle (9:16 Reels und Stories, 4:5 und 1:1 Instagram, 16:9 Video); Ausschnitt wie object-fit: cover", datei: "alpha/lab/operationen/format.js" },
  beschreibung: "Passt das Bild in ein Seitenverhältnis ein: ein Ausschnitt ohne Rand und ohne Skalierung, mittig oder zur Seite geschoben, mit geraden Massen. Als erster Schritt einer Zusammenstellung gibt es dem ganzen Film sein Format; Karten und Signatur entstehen darin.",
  eingaenge: [{ name: "bild", typ: "IMAGE" }],
  ausgaenge: [{ name: "bild", typ: "IMAGE" }],
  parameter: [
    { id: "format", name: "Format", art: "wahl", standard: "9:16", optionen: Object.entries(FORMATE).map(([wert, f]) => ({ wert, name: f.name })) },
    { id: "lage", name: "Lage des Ausschnitts (0 = links oder oben, 1 = rechts oder unten)", art: "zahl", min: 0, max: 1, standard: 0.5, schritt: 0.01 },
  ],
  moduliert: "lage",
  voraussetzungen: [],
  ressourcen: { zeit: "sofort (Kopie des Ausschnitts)", speicher: "ein Bild" },
  reproduzierbar: "ja",
  varianten: "moduliert",

  async ausfuehren({ bild }, p) {
    const a = ausschnitt(bild.width, bild.height, p.format, p.lage), out = neuesBild(a.b, a.h);
    for (let y = 0; y < a.h; y++) out.data.set(bild.data.subarray(((a.y + y) * bild.width + a.x) * 4, ((a.y + y) * bild.width + a.x + a.b) * 4), y * a.b * 4);
    return { ausgaben: [{ typ: "IMAGE", titel: `Format ${p.format}`, bild: out }], protokoll: { format: p.format, quelle: [bild.width, bild.height], ausschnitt: a, lage: p.lage } };
  },
};
