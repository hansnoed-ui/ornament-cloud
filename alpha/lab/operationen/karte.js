// ORNAMENT LAB – Textkarte (seit Lab 0.1.18): ein Bild aus Text, wie die Titelkarte eines Films. Seit Lab 0.1.33 in der Gestaltung des
// Neubaus der Website (b/b.css, die Zettelkarten aus tools/b-kacheln.mjs; Wunsch vom 24. Oktober 2026: «nicht die claude-typische Schrift-
// und Farbkombination, sondern das neue Design der Website»): Kopfzeile in Grau, Titel in Instrument Sans, Satz in Newsreader kursiv,
// unten das Signet mit der Fusszeile, rechts unten das Feld 7 × 7 (das Ornament der Website; beim Zettel mit den Fäden zu den nahen Zetteln); Tinte auf Papier oder die
// echte Umkehr (Weiss auf Schwarz, Standard, wie die Bühne des Films), die Blaupause als einziger Akzent. Der Text kommt aus einem Befund
// (ein Zettel aus dem Zettelkasten: Zyklus, Nummer, Titel, Leitsatz) oder einer ORNA-Konstellation (Nummer, Künstler × Theoretiker,
// Operationsregel); beides bleibt wörtlich. Gezeichnet wird mit der Leinwand des Browsers, die Schriften kommen aus vendor/fonts
// (medien/schriften.js); in Node steht die Operation im Register, meldet aber ihre Voraussetzung (verfuegbar()).
import { SANS, SERIF, NEUBAU, schriftenLaden, schriftenDa, signetZeichnen, feldZeichnen } from "../medien/schriften.js";

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

/** das Feld 7 × 7 der Karte, das Ornament der Website: beim Zettel seine Nummer und die nahen Zettel (zettel.strophe gibt sie mit), bei der
 *  Konstellation leer (wie die Karte von ORNA im Neubau), bei einem eigenen Befund keines */
export const karteFeld = ({ text, konstellation }) => {
  if (konstellation) return { hier: null, nah: [] };
  if (text?.leitsatz && Number.isInteger(text.nummer)) return { hier: text.nummer, nah: (text.nahe ?? []).filter((n) => Number.isInteger(n) && n >= 1 && n <= 49) };
  return null;
};

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

/** der Satz der Karte: die Grössen aus der kürzeren Seite (wie die Zettelkarte des Neubaus, 1080 × 1080), verkleinert, bis alles Platz hat */
function setzen(ctx, W, H, inhalt, feld, groesse) {
  const kurz = Math.min(W, H), rand = Math.round(kurz * 0.074), breite = W - 2 * rand;
  const feldA = feld ? kurz * 0.037 : 0, feldOben = H - rand - 7 * feldA;
  for (let f = 1; f > 0.3; f *= 0.94) {
    const gross = Math.round(kurz * groesse * f), klein = Math.max(8, Math.round(kurz * 0.024 * f)), mittel = Math.round(gross * 0.6), fuss = Math.max(8, Math.round(kurz * 0.026 * f));
    ctx.font = `400 ${klein}px ${SANS}`; const kopf = zeilen(ctx, inhalt.kopf, breite);
    ctx.font = `500 ${gross}px ${SANS}`; const titel = zeilen(ctx, inhalt.titel, breite);
    ctx.font = `italic 400 ${mittel}px ${SERIF}`; const text = zeilen(ctx, inhalt.text, Math.min(breite, mittel * 12.5));
    ctx.font = `500 ${fuss}px ${SANS}`; const fussZeilen = zeilen(ctx, inhalt.fuss, breite - fuss * 2.2);
    const oben = rand + kopf.length * klein * 1.35 + (kopf.length ? kurz * 0.02 : 0);
    const mitte = titel.length * gross * 1.02 + (text.length ? mittel * 0.72 + text.length * mittel * 1.22 : 0);
    const fussHoehe = Math.max(fuss * 1.3, fussZeilen.length * fuss * 1.3), unten = Math.min(feld ? feldOben : H, H - rand - fussHoehe) - kurz * 0.03;
    if (oben + mitte <= unten || f * 0.94 <= 0.3) return { rand, breite, gross, klein, mittel, fuss, kopf, titel, text, fussZeilen, oben, feldA, feldOben, fussHoehe };
  }
  return null;
}

export const karte = {
  id: "lab.karte",
  name: "Textkarte",
  version: "0.2.0",
  klasse: "raeumlich",
  herkunft: { art: "neu", quelle: "ORNAMENT LAB", referenz: "Titel- und Zwischentitelkarten des Films; Gestaltung des Neubaus der Website (Instrument Sans, Newsreader, Papier und Tinte, die Blaupause; die Zettelkarten aus tools/b-kacheln.mjs)", datei: "alpha/lab/operationen/karte.js" },
  beschreibung: "Macht aus einem Zettel des Zettelkastens oder einer ORNA-Konstellation ein Bild in der Gestaltung der Website: Kopfzeile, Titel, Satz, Signet und Fusszeile, das Feld 7 × 7 der Website (beim Zettel mit den Fäden zu den nahen Zetteln); Weiss auf Schwarz oder Schwarz auf Weiss, im Mass des Bildes am Eingang.",
  eingaenge: [
    { name: "bild", typ: "IMAGE", optional: true, vorwaehlen: false },
    { name: "text", typ: "METADATA", optional: true },
    { name: "konstellation", typ: "CONSTELLATION", optional: true, vorwaehlen: false },
  ],
  ausgaenge: [{ name: "bild", typ: "IMAGE" }],
  parameter: [
    { id: "grund", name: "Grund", art: "wahl", standard: "nacht", optionen: [{ wert: "nacht", name: "Weiss auf Schwarz (die Website im Dunkeln)" }, { wert: "papier", name: "Schwarz auf Weiss (die Website im Hellen)" }] },
    { id: "groesse", name: "Schriftgrösse des Titels", art: "zahl", min: 0.03, max: 0.15, standard: 0.07, schritt: 0.005, hilfe: "Anteil der kürzeren Seite" },
    { id: "seite", name: "Rechengrösse (längste Seite, px)", art: "zahl", min: 256, max: 2048, standard: 1280, schritt: 1 },
  ],
  voraussetzungen: ["Leinwand (Canvas) des Browsers; die Schriften der Website aus vendor/fonts/ (sonst Ersatzschriften)"],
  ressourcen: { zeit: "sofort", speicher: "ein Bild" },
  reproduzierbar: "ja",
  varianten: "keine",
  /** nur im Browser; das Register und die Zusammenstellung fragen vorher */
  verfuegbar: () => typeof document !== "undefined",

  async ausfuehren({ bild, text, konstellation }, p) {
    if (!this.verfuegbar()) throw new Error("Die Textkarte braucht einen Browser (Leinwand)");
    await schriftenLaden();
    const inhalt = karteText({ text, konstellation }), feld = karteFeld({ text, konstellation });
    const seite = Math.round(p.seite);
    const f = bild ? Math.min(1, seite / Math.max(bild.width, bild.height)) : 1;
    const W = Math.max(2, Math.round((bild ? bild.width * f : seite) / 2) * 2), H = Math.max(2, Math.round((bild ? bild.height * f : (seite * 3) / 4) / 2) * 2);
    const c = document.createElement("canvas"); c.width = W; c.height = H;
    const ctx = c.getContext("2d"), F = p.grund === "papier" ? NEUBAU.hell : NEUBAU.dunkel;
    ctx.fillStyle = F.papier; ctx.fillRect(0, 0, W, H);
    const s = setzen(ctx, W, H, inhalt, feld, p.groesse);
    ctx.textBaseline = "top"; ctx.textAlign = "left";
    // Kopfzeile in Grau
    ctx.fillStyle = F.grau; ctx.font = `400 ${s.klein}px ${SANS}`;
    s.kopf.forEach((z, i) => ctx.fillText(z, s.rand, s.rand + i * s.klein * 1.35));
    // Titel (enger gesetzt, wie auf der Website) und der Satz in Newsreader kursiv
    let y = s.oben;
    ctx.fillStyle = F.tinte; ctx.font = `500 ${s.gross}px ${SANS}`;
    if ("letterSpacing" in ctx) ctx.letterSpacing = `${-0.025 * s.gross}px`;
    for (const z of s.titel) { ctx.fillText(z, s.rand, y); y += s.gross * 1.02; }
    if ("letterSpacing" in ctx) ctx.letterSpacing = "0px";
    if (s.text.length) {
      y += s.mittel * 0.72; ctx.font = `italic 400 ${s.mittel}px ${SERIF}`;
      for (const z of s.text) { ctx.fillText(z, s.rand, y); y += s.mittel * 1.22; }
    }
    // unten links das Signet mit der Fusszeile, rechts das Feld
    const yf = H - s.rand - s.fussHoehe + s.fuss * 0.15;
    const sb = signetZeichnen(ctx, s.rand, yf - s.fuss * 0.1, s.fuss * 1.2, F);
    ctx.fillStyle = F.tinte; ctx.font = `500 ${s.fuss}px ${SANS}`;
    s.fussZeilen.forEach((z, i) => ctx.fillText(z, s.rand + sb + s.fuss * 0.55, yf + i * s.fuss * 1.3));
    if (feld) feldZeichnen(ctx, W - s.rand - 7 * s.feldA, s.feldOben, s.feldA, feld, F);
    const out = ctx.getImageData(0, 0, W, H);
    return {
      ausgaben: [{ typ: "IMAGE", titel: inhalt.titel ? `Karte: ${inhalt.titel}` : "Karte", bild: { width: W, height: H, data: out.data } }],
      protokoll: { inhalt, masse: [W, H], zeilen: s.kopf.length + s.titel.length + s.text.length + s.fussZeilen.length, feld: feld ? { hier: feld.hier, nah: feld.nah.length } : null, gestaltung: "Neubau", schriften: schriftenDa() },
    };
  },
};
