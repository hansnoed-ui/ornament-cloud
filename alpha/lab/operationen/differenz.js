// ORNAMENT LAB – Differenz (Beobachtungsoperation). Macht sichtbar, worin sich zwei Zustände unterscheiden (Gegenprobe, Vergleich zweier
// Verläufe), wie die Difference-Komposition in Fusion, After Effects oder Resolume. Die Zahlen sind Messungen, keine Bewertung:
// eine grosse Differenz ist weder besser noch schlechter.
import { neuesBild, skalieren, luminanz } from "../kern/bilddaten.js";

export const differenz = {
  id: "lab.differenz",
  name: "Differenz",
  version: "0.1.0",
  klasse: "beobachtung",
  herkunft: { art: "neu", quelle: "ORNAMENT LAB", referenz: "Difference-Komposition (Fusion Merge, After Effects, Resolume)", datei: "alpha/lab/operationen/differenz.js" },
  beschreibung: "Zeigt die Unterschiede zwischen zwei Zuständen und misst sie. Messung, keine Bewertung.",
  eingaenge: [{ name: "bild", typ: "IMAGE" }, { name: "vergleich", typ: "IMAGE" }],
  ausgaenge: [{ name: "bild", typ: "IMAGE" }],
  parameter: [
    { id: "verstaerkung", name: "Verstärkung der Anzeige", art: "zahl", min: 1, max: 8, standard: 2, schritt: 0.5 },
    { id: "schwelle", name: "Schwelle für «verändert» (0–1)", art: "zahl", min: 0.02, max: 0.5, standard: 0.1, schritt: 0.01 },
  ],
  voraussetzungen: [],
  ressourcen: { zeit: "ein Durchgang über die Pixel", speicher: "ein Bild" },
  reproduzierbar: "ja",
  varianten: "keine",

  async ausfuehren({ bild, vergleich }, p) {
    const b = vergleich.width === bild.width && vergleich.height === bild.height ? vergleich : skalieren(vergleich, bild.width, bild.height);
    const out = neuesBild(bild.width, bild.height), n = bild.width * bild.height;
    let summe = 0, veraendert = 0;
    for (let i = 0; i < n * 4; i += 4) {
      const dr = Math.abs(bild.data[i] - b.data[i]), dg = Math.abs(bild.data[i + 1] - b.data[i + 1]), db = Math.abs(bild.data[i + 2] - b.data[i + 2]);
      const l = luminanz(dr, dg, db) / 255;
      summe += l; if (l > p.schwelle) veraendert++;
      out.data[i] = dr * p.verstaerkung; out.data[i + 1] = dg * p.verstaerkung; out.data[i + 2] = db * p.verstaerkung; out.data[i + 3] = 255;
    }
    const befund = {
      art: "verifiziert", hinweis: "Messung, keine Bewertung",
      mittlereAbweichung: Math.round((summe / n) * 1000) / 1000,
      anteilVeraendert: Math.round((veraendert / n) * 1000) / 1000,
      verglichenIn: [bild.width, bild.height], vergleichSkaliert: b !== vergleich,
    };
    return { ausgaben: [{ typ: "IMAGE", titel: "Differenz", bild: out, befund }], protokoll: befund };
  },
};
