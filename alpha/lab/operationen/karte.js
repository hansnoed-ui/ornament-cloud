// ORNAMENT LAB – Textkarte (seit Lab 0.1.18): ein Bild aus Text, wie die Titelkarte eines Films. Kopfzeile, Titel, Text und Fusszeile in
// Papier auf Nacht (oder umgekehrt), im Mass des Bildes am Eingang (sonst 4:3). Der Text kommt aus einem Befund (ein Zettel aus dem
// Zettelkasten: Zyklus, Nummer, Titel, Leitsatz) oder einer ORNA-Konstellation (Nummer, Künstler × Theoretiker, Operationsregel); beides
// bleibt wörtlich. Gezeichnet wird mit der Leinwand des Browsers in den Schriften des Systems (keine Webschriften, wie der Zettelkasten);
// in Node steht die Operation im Register, meldet aber ihre Voraussetzung (verfuegbar()).
import { NACHT } from "../kern/bilddaten.js";

const PAPIER = [244, 241, 234];   // The Fictory, zeichnen.js PAPIER #f4f1ea
const SERIF = 'Georgia, "Times New Roman", "Noto Serif", serif';
const SANS = 'system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif';
const rgb = (c) => `rgb(${c[0]}, ${c[1]}, ${c[2]})`;

/** was auf der Karte steht: aus einem Zettel, einer Konstellation oder einem Befund mit eigenen Feldern (kopf, titel, text, fuss) */
export function karteText({ text, konstellation }) {
  if (konstellation) {
    const k = konstellation;
    return { kopf: `ORNA · Konstellation ${k.nummer}`, titel: `${k.kuenstler} × ${k.theoretiker}`, text: k.gedanke ?? "", fuss: k.regel ? `Operationsregel ${k.regel}: ${k.regelName}` : "" };
  }
  if (text?.leitsatz) return { kopf: `Zettelkasten · ${text.zyklus} ${text.zyklusTitel} · ${text.nummer} / 49`, titel: text.titel, text: text.leitsatz, fuss: "Zu seiner Zeit" };
  if (text) return { kopf: text.kopf ?? "", titel: text.titel ?? "", text: text.text ?? "", fuss: text.fuss ?? "" };
  return { kopf: "", titel: "", text: "", fuss: "" };
}

/** Zeilenumbruch nach der gemessenen Breite */
function zeilen(ctx, text, breite) {
  const aus = [];
  for (const absatz of String(text).split(/\n+/)) {
    let zeile = "";
    for (const wort of absatz.split(/\s+/).filter(Boolean)) {
      const probe = zeile ? `${zeile} ${wort}` : wort;
      if (zeile && ctx.measureText(probe).width > breite) { aus.push(zeile); zeile = wort; } else zeile = probe;
    }
    if (zeile) aus.push(zeile);
  }
  return aus;
}

export const karte = {
  id: "lab.karte",
  name: "Textkarte",
  version: "0.1.0",
  klasse: "raeumlich",
  herkunft: { art: "neu", quelle: "ORNAMENT LAB", referenz: "Titel- und Zwischentitelkarten des Films; Typografie des Zettelkastens (Systemschriften, Papier und Nacht)", datei: "alpha/lab/operationen/karte.js" },
  beschreibung: "Macht aus einem Zettel des Zettelkastens oder einer ORNA-Konstellation ein Bild: Kopfzeile, Titel, Text und Fusszeile, in Papier auf Nacht oder umgekehrt, im Mass des Bildes am Eingang.",
  eingaenge: [
    { name: "bild", typ: "IMAGE", optional: true, vorwaehlen: false },
    { name: "text", typ: "METADATA", optional: true },
    { name: "konstellation", typ: "CONSTELLATION", optional: true, vorwaehlen: false },
  ],
  ausgaenge: [{ name: "bild", typ: "IMAGE" }],
  parameter: [
    { id: "grund", name: "Grund", art: "wahl", standard: "nacht", optionen: [{ wert: "nacht", name: "Papier auf Nacht" }, { wert: "papier", name: "Nacht auf Papier" }] },
    { id: "groesse", name: "Schriftgrösse des Titels", art: "zahl", min: 0.03, max: 0.15, standard: 0.07, schritt: 0.005, hilfe: "Anteil der kürzeren Seite" },
    { id: "seite", name: "Rechengrösse (längste Seite, px)", art: "zahl", min: 256, max: 2048, standard: 1280, schritt: 1 },
  ],
  voraussetzungen: ["Leinwand (Canvas) des Browsers"],
  ressourcen: { zeit: "sofort", speicher: "ein Bild" },
  reproduzierbar: "ja",
  varianten: "keine",
  /** nur im Browser; das Register und die Zusammenstellung fragen vorher */
  verfuegbar: () => typeof document !== "undefined",

  async ausfuehren({ bild, text, konstellation }, p) {
    if (!this.verfuegbar()) throw new Error("Die Textkarte braucht einen Browser (Leinwand)");
    const inhalt = karteText({ text, konstellation });
    const seite = Math.round(p.seite);
    const f = bild ? Math.min(1, seite / Math.max(bild.width, bild.height)) : 1;
    const W = Math.max(2, Math.round((bild ? bild.width * f : seite) / 2) * 2), H = Math.max(2, Math.round((bild ? bild.height * f : (seite * 3) / 4) / 2) * 2);
    const c = document.createElement("canvas"); c.width = W; c.height = H;
    const ctx = c.getContext("2d"), vorn = p.grund === "papier" ? NACHT : PAPIER, hinten = p.grund === "papier" ? PAPIER : NACHT;
    ctx.fillStyle = rgb(hinten); ctx.fillRect(0, 0, W, H);
    const kurz = Math.min(W, H), rand = Math.round(kurz * 0.1), breite = W - 2 * rand;
    const gross = Math.round(kurz * p.groesse), klein = Math.round(gross * 0.42), mittel = Math.round(gross * 0.6);
    ctx.fillStyle = rgb(vorn); ctx.textBaseline = "top";
    // Kopfzeile oben, Fusszeile unten, Titel und Text in der Mitte
    ctx.font = `${klein}px ${SANS}`;
    if (inhalt.kopf) ctx.fillText(inhalt.kopf, rand, rand);
    if (inhalt.fuss) ctx.fillText(inhalt.fuss, rand, H - rand - klein);
    ctx.font = `${gross}px ${SERIF}`;
    const titelZeilen = zeilen(ctx, inhalt.titel, breite);
    ctx.font = `italic ${mittel}px ${SERIF}`;
    const textZeilen = zeilen(ctx, inhalt.text, breite);
    const hoehe = titelZeilen.length * gross * 1.15 + (textZeilen.length ? mittel * 0.9 + textZeilen.length * mittel * 1.35 : 0);
    let y = Math.max(rand + klein * 2, (H - hoehe) / 2);
    ctx.font = `${gross}px ${SERIF}`;
    for (const z of titelZeilen) { ctx.fillText(z, rand, y); y += gross * 1.15; }
    y += mittel * 0.9;
    ctx.font = `italic ${mittel}px ${SERIF}`;
    for (const z of textZeilen) { ctx.fillText(z, rand, y); y += mittel * 1.35; }
    const out = ctx.getImageData(0, 0, W, H);
    return {
      ausgaben: [{ typ: "IMAGE", titel: inhalt.titel ? `Karte: ${inhalt.titel}` : "Karte", bild: { width: W, height: H, data: out.data } }],
      protokoll: { inhalt, masse: [W, H], zeilen: titelZeilen.length + textZeilen.length },
    };
  },
};
