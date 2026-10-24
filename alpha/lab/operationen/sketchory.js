// ORNAMENT LAB – Adapter für Sketchory (alpha/sketchory/, seit Lab 0.1.23; Christian, 24. Oktober 2026: «Workflows aus allen Bild- und Video-Apps
// mit Zettelkasten und ORNA verbinden, visuell und operational»). Aus dem Foto einer Kritzelkarte (Fineliner auf Papier) werden saubere Striche,
// die sich im Film Strich für Strich zeichnen, stehen und ausblenden; dann erscheint ein Satz Buchstabe für Buchstabe (ohne das Signet der App).
// Sketchory bleibt unverändert: strich.js (Lesen der Karte), ablauf.js, szene.js und signet.js werden fest importiert (laufen auch in Node, bis auf die Leinwand).
//   Zettelkasten (visuell):  der Leitsatz (oder der Titel) eines Zettels am Eingang «text» ist der Satz des Films – der Gedanke eines Zettels, gezeichnet
//   ORNA (visuell):          ohne Zettel der Gedanke (oder die Frage) der Konstellation am Eingang «konstellation»
//   ORNA (operational):      die Operationsregel R1–R7 der Konstellation wählt die Handschrift – Strich, Schrift, Grund (REGEL_HANDSCHRIFT), wo der Mensch nichts wählt
//   ausfuehren()             rechnet `bilder` Standbilder gleichmässig über die Szene: die Varianten (Stationen des Films)
//   lebend()                 gibt dem Film über Stationen die Szene selbst; ihre Zeit beginnt mit dem Auftritt ihrer Stationen (zeitbasis «auftritt»)
import { striche, analyseMass } from "../../../alpha/sketchory/strich.js?v=10";
import { szene, bild as filmBild, schriftSetzen, SCHRIFTEN } from "../../../alpha/sketchory/szene.js?v=10";
import { BREITE, HOEHE } from "../../../alpha/sketchory/ablauf.js?v=10";
import { zustandsZeiten } from "./phorma.js";
import { imBrowser, leinwand, gerade, klemm, EINGAENGE } from "./buehnenhilfe.js";

/** woher der Satz kommt: der Zettel zuerst (sein Leitsatz, die Bottom-Line), sonst der Gedanke der Konstellation; der Mensch kann es festlegen */
export const SATZ_QUELLEN = Object.freeze([
  { wert: "auto", name: "Leitsatz des Zettels, sonst Gedanke der Konstellation" },
  { wert: "leitsatz", name: "Leitsatz des Zettels" },
  { wert: "titel", name: "Titel des Zettels" },
  { wert: "gedanke", name: "Gedanke der Konstellation" },
  { wert: "frage", name: "Frage der Konstellation" },
  { wert: "keiner", name: "ohne Satz (nur die Zeichnung)" },
]);
/** Den Satz wählen; gibt { satz, quelle: "zettel.leitsatz" | "zettel.titel" | "orna.gedanke" | "orna.frage" | null }. Der Text bleibt wörtlich (Sketchory setzt nur den Punkt). */
export function satzWaehlen(p, { text, konstellation } = {}) {
  const aus = (quelle, s) => (s ? { satz: String(s).replace(/\s+/g, " ").trim(), quelle } : null);
  const kandidaten = {
    leitsatz: () => aus("zettel.leitsatz", text?.leitsatz),
    titel: () => aus("zettel.titel", text?.titel),
    gedanke: () => aus("orna.gedanke", konstellation?.gedanke),
    frage: () => aus("orna.frage", konstellation?.frage),
  };
  const q = p.satz || "auto", keiner = { satz: "", quelle: null };
  if (q === "keiner") return keiner;
  if (q === "auto") return kandidaten.leitsatz() ?? kandidaten.gedanke() ?? keiner;
  return kandidaten[q]?.() ?? keiner;
}

/** die Handschrift: Strich (Stil von Sketchory), Schrift und Grund; drei Felder, jedes vom Menschen, aus der Regel der Konstellation oder Standard */
export const FELDER = Object.freeze(["stil", "schrift", "farbe"]);
export const STILE = Object.freeze([{ wert: "gezeichnet", name: "gezeichnet (Strichbreite wie auf der Karte)" }, { wert: "gleichmaessig", name: "gleichmässig (alle Striche gleich breit)" }]);
export const SCHRIFTEN_WAHL = Object.freeze(["grotesk", "sans", "serif"].map((k) => ({ wert: k, name: SCHRIFTEN[k].name })));   // «helvetica» nur, wo sie installiert ist: nicht im Lab
export const FARBEN_WAHL = Object.freeze([{ wert: "dunkel", name: "weiss auf Schwarz" }, { wert: "hell", name: "schwarz auf Weiss" }]);
export const STANDARD = Object.freeze({ stil: "gezeichnet", schrift: "grotesk", farbe: "dunkel" });   // wie Sketchory selbst
/**
 * Operationsregel (The Fictory, aus einer ORNA-Konstellation) → Handschrift. Eine gestalterische Interpretation, offen gelegt; sieben verschiedene:
 *   R1 Keine Rückkehr an dieselbe Stelle → gezeichnet, Grotesk, weiss auf Schwarz (der Strich einmal gezogen, nicht nachgezogen: wie die Karte selbst)
 *   R2 Verzögerter Spiegel → gezeichnet, Serife, schwarz auf Weiss (das Spiegelbild der dunklen Fassung; die Serife blickt zurück)
 *   R3 Raster als Regel → gleichmässig, Grotesk, weiss auf Schwarz (jeder Strich gleich breit: das Regelmass)
 *   R4 Nur Unterschiede, die Unterschiede machen → gezeichnet, Instrument Sans, schwarz auf Weiss (die Unterschiede der Strichbreite, auf Weiss am deutlichsten)
 *   R5 Fortwirkende Last → gezeichnet, Serife, weiss auf Schwarz (die Serife trägt, der Strich behält sein Gewicht)
 *   R6 Die Leerstelle bleibt → gleichmässig, Instrument Sans, schwarz auf Weiss (viel Weiss, nichts betont)
 *   R7 Verflechtung → gleichmässig, Serife, weiss auf Schwarz (gleiche Striche, Buchstaben, die ineinandergreifen)
 */
export const REGEL_HANDSCHRIFT = Object.freeze({
  R1: { stil: "gezeichnet", schrift: "grotesk", farbe: "dunkel" },
  R2: { stil: "gezeichnet", schrift: "serif", farbe: "hell" },
  R3: { stil: "gleichmaessig", schrift: "grotesk", farbe: "dunkel" },
  R4: { stil: "gezeichnet", schrift: "sans", farbe: "hell" },
  R5: { stil: "gezeichnet", schrift: "serif", farbe: "dunkel" },
  R6: { stil: "gleichmaessig", schrift: "sans", farbe: "hell" },
  R7: { stil: "gleichmaessig", schrift: "serif", farbe: "dunkel" },
});
export const handschriftName = (h) => `${h.stil} · ${h.schrift} · ${h.farbe}`;
/**
 * Die Handschrift wählen, Feld für Feld: der Mensch (Parameter gesetzt), sonst die Regel der Konstellation (REGEL_HANDSCHRIFT), sonst der Standard.
 * Gibt { wahl, herkunft: { stil, schrift, farbe } je "mensch" | "orna" | "standard", regel } und die Entscheidung fürs Protokoll (nur, wenn ORNA ein Feld bestimmt).
 */
export function handschriftWaehlen(p, konstellation) {
  const regel = konstellation?.regel ?? null, tabelle = (regel && REGEL_HANDSCHRIFT[regel]) || null;
  const wahl = {}, herkunft = {};
  for (const f of FELDER) {
    if (p[f]) { wahl[f] = p[f]; herkunft[f] = "mensch"; }
    else if (tabelle) { wahl[f] = tabelle[f]; herkunft[f] = "orna"; }
    else { wahl[f] = STANDARD[f]; herkunft[f] = "standard"; }
  }
  const vonOrna = FELDER.filter((f) => herkunft[f] === "orna");
  const entscheidungen = vonOrna.length ? [{
    art: "regel", gegenstand: "handschrift", optionen: [...new Set([...Object.values(REGEL_HANDSCHRIFT).map(handschriftName), handschriftName(wahl)])], gewaehlt: handschriftName(wahl),
    details: { regel, regelName: konstellation.regelName ?? null, konstellation: konstellation.nummer ?? null, felder: vonOrna, tabelle: REGEL_HANDSCHRIFT, hinweis: "feste Tabelle Operationsregel → Handschrift (gestalterische Interpretation); Felder, die der Mensch setzt, bleiben" },
  }] : [];
  return { wahl, herkunft, regel, entscheidungen };
}

let schriften = null;
/** die Schriften des Satzes laden (lab.css hat die @font-face-Regeln aus Sketchory), einmal; ohne document.fonts sofort weiter */
const schriftenLaden = () => (schriften ??= (imBrowser() && document.fonts?.load
  ? Promise.all(['600 68px "Inter Display"', '500 66px "Instrument Sans"', "400 74px Newsreader"].map((f) => document.fonts.load(f))).catch(() => {})
  : Promise.resolve()));

/** das Bild auf die Analysegrösse von Sketchory (längste Seite 1400) als Bildpunkte */
function analyseBild(bild) {
  const [w, h] = analyseMass(bild.width, bild.height);
  const quelle = leinwand(bild.width, bild.height);
  quelle.getContext("2d").putImageData(new ImageData(new Uint8ClampedArray(bild.data), bild.width, bild.height), 0, 0);
  const a = leinwand(w, h), ax = a.getContext("2d", { willReadFrequently: true });
  ax.imageSmoothingQuality = "high"; ax.drawImage(quelle, 0, 0, w, h);
  return { daten: ax.getImageData(0, 0, w, h).data, w, h };
}

/** das Mass des Ausgabebilds: im Mass des Bildes am Eingang (längste Seite `seite`, nicht grösser als das Bild) oder hoch 3 : 4 wie Sketchory */
export function ausgabeMass(bild, format, seite) {
  if (format === "hoch") { const H = gerade(seite); return { B: gerade((H * BREITE) / HOEHE), H }; }
  const f = Math.min(1, seite / Math.max(bild.width, bild.height));
  return { B: gerade(bild.width * f), H: gerade(bild.height * f) };
}

/**
 * Die Szene bauen: Karte lesen (Striche), Satz und Handschrift wählen, Sketchorys Szene mit Messkontext und Leinwand; das Bild der App (1080 × 1440) wird
 * ins Ausgabemass eingepasst, der Grund ringsum. Gibt { dauer, zeit, bild(t), entsorgen(), … }; die Zeit endet vor dem Signet der App.
 */
async function szeneBauen({ bild, konstellation, text }, p, kontext = {}) {
  if (!imBrowser()) throw new Error("Sketchory braucht einen Browser (Leinwand 2D)");
  const { satz, quelle } = satzWaehlen(p, { text, konstellation });
  const h = handschriftWaehlen(p, konstellation);
  kontext.melden?.("Sketchory: die Karte wird gelesen", null);
  const a = analyseBild(bild);
  kontext.abbrechen?.throwIfAborted?.();
  const ergebnis = striche(a.daten, a.w, a.h, { empfindlichkeit: p.empfindlichkeit });
  await schriftenLaden();
  const messer = leinwand(8, 8).getContext("2d");
  const messen = (s, g, schrift) => { schriftSetzen(messer, schrift, g); return messer.measureText(s).width; };
  const sz = szene(ergebnis, { stil: h.wahl.stil, staerke: p.staerke, zeichnen: p.zeichnen, text: satz, schrift: h.wahl.schrift, farbe: h.wahl.farbe, streckung: p.streckung, punkt: Boolean(p.punkt), messen, leinwand });
  const { ab } = sz.zeit, eigen = ab.pause2[0];   // die Szene bis vor das Signet: Zeichnen, Stehen, Ausblenden, der Satz
  const faktor = p.dauer > 0 ? klemm(p.dauer / eigen, 0.2, 3) : 1, dauer = eigen * faktor;
  const phasen = Object.entries(ab).filter(([name]) => !["pause2", "signet", "signetStehen", "signetAus", "schluss"].includes(name)).map(([titel, [von, bis]]) => ({ titel, von: von * faktor, bis: bis * faktor }));
  const zeit = { ab, eigen, faktor, dauer, abschnitt: { von: ab.zeichnen[0] * faktor, bis: dauer }, phasen };
  const { B, H } = ausgabeMass(bild, p.format, Math.round(p.seite));
  const s = Math.min(B / BREITE, H / HOEHE), ox = (B - BREITE * s) / 2, oy = (H - HOEHE * s) / 2;
  const lese = leinwand(B, H), lx = lese.getContext("2d", { willReadFrequently: true });
  let entsorgt = false;
  return {
    dauer, zeit, B, H, satz: sz.text, quelle, handschrift: h, striche: ergebnis.striche.length, zeitbasis: "auftritt",
    /** das Bild zur Zeit t (s) der Szene, als Bilddaten B × H: der Grund, darin Sketchorys Bild eingepasst */
    bild(t) {
      if (entsorgt) throw new Error("Sketchory: die Szene ist schon entsorgt");
      const tt = klemm(t / faktor, 0, eigen - 1e-3);
      lx.setTransform(1, 0, 0, 1, 0, 0); lx.globalAlpha = 1; lx.fillStyle = sz.farben.grund; lx.fillRect(0, 0, B, H);
      lx.save(); lx.setTransform(s, 0, 0, s, ox, oy); lx.beginPath(); lx.rect(0, 0, BREITE, HOEHE); lx.clip();
      filmBild(lx, sz, tt);
      lx.restore(); lx.setTransform(1, 0, 0, 1, 0, 0);
      const d = lx.getImageData(0, 0, B, H);
      return { width: B, height: H, data: d.data };
    },
    entsorgen() { if (!entsorgt) { entsorgt = true; sz.ebene.width = sz.ebene.height = 2; } },
  };
}

export const sketchory = {
  id: "sketchory.satz",
  name: "Sketchory: Karte und Satz",
  version: "0.1.0",
  klasse: "zeitlich",
  herkunft: { art: "adapter", quelle: "Sketchory", datei: "alpha/sketchory/strich.js, ablauf.js, szene.js, signet.js (v=10, unverändert)", referenz: null },
  beschreibung: "Sketchory: aus dem Foto einer Kritzelkarte (Fineliner auf Papier) werden saubere Striche, die sich Strich für Strich zeichnen, stehen und ausblenden; dann erscheint ein Satz Buchstabe für Buchstabe – der Leitsatz eines Zettels oder der Gedanke einer ORNA-Konstellation. Die Operationsregel der Konstellation wählt die Handschrift (Strich, Schrift, Grund).",
  eingaenge: EINGAENGE,
  ausgaenge: [{ name: "zustaende", typ: "IMAGE", mehrfach: 12 }],
  parameter: [
    { id: "satz", name: "Der Satz", art: "wahl", standard: "auto", optionen: SATZ_QUELLEN, hilfe: "wörtlich aus dem Zettel oder der Konstellation am Eingang; ohne beide nur die Zeichnung" },
    { id: "stil", name: "Strich", art: "wahl", standard: "", optionen: [{ wert: "", name: "aus der Konstellation (sonst gezeichnet)" }, ...STILE] },
    { id: "schrift", name: "Schrift des Satzes", art: "wahl", standard: "", optionen: [{ wert: "", name: "aus der Konstellation (sonst Grotesk)" }, ...SCHRIFTEN_WAHL] },
    { id: "farbe", name: "Grund", art: "wahl", standard: "", optionen: [{ wert: "", name: "aus der Konstellation (sonst weiss auf Schwarz)" }, ...FARBEN_WAHL] },
    { id: "zeichnen", name: "Zeichnen (s)", art: "zahl", min: 2, max: 12, standard: 4.5, schritt: 0.5, hilfe: "wie lange die Karte sich zeichnet; Stehen, Ausblenden und der Satz kommen dazu" },
    { id: "dauer", name: "Dauer der Szene (s, 0 = eigenes Tempo)", art: "zahl", min: 0, max: 120, standard: 0, schritt: 1, hilfe: "Sketchory rechnet in eigener Zeit; eine Dauer streckt oder rafft die ganze Szene" },
    { id: "bilder", name: "Standbilder (Varianten)", art: "zahl", min: 1, max: 12, standard: 6, schritt: 1, hilfe: "gleichmässig über die Szene, vom Zeichnen bis zum Satz" },
    { id: "staerke", name: "Strichstärke (Faktor)", art: "zahl", min: 0.5, max: 2, standard: 1, schritt: 0.1 },
    { id: "streckung", name: "Streckung der Buchstaben", art: "zahl", min: 1, max: 1.4, standard: 1.15, schritt: 0.05 },
    { id: "punkt", name: "oranger Punkt am Satzende", art: "schalter", standard: true },
    { id: "empfindlichkeit", name: "Empfindlichkeit beim Lesen der Karte", art: "zahl", min: -50, max: 50, standard: 0, schritt: 10, hilfe: "höher: auch blasse Linien; tiefer: nur kräftige" },
    { id: "format", name: "Format", art: "wahl", standard: "bild", optionen: [{ wert: "bild", name: "im Mass des Bildes (Sketchory eingepasst, Grund ringsum)" }, { wert: "hoch", name: "hoch 3 : 4 wie Sketchory" }] },
    { id: "seite", name: "Rechengrösse (längste Seite, px)", art: "zahl", min: 256, max: 2048, standard: 1080, schritt: 1 },
  ],
  voraussetzungen: ["Browser mit Leinwand 2D (kein WebGL nötig); die Schriften des Satzes aus vendor/fonts/ (lab.css: Inter Display, Instrument Sans, Newsreader)"],
  ressourcen: { zeit: "das Lesen der Karte einige Sekunden (Analyse bis 1400 px, auf dem Hauptfaden), dann zeichnet die Leinwand jedes Bild", speicher: "die Zeichnungsebene 1080 × 1440 und das Bild in Rechengrösse" },
  reproduzierbar: "ja",
  varianten: "selbst",
  verfuegbar: () => imBrowser(),
  /** die lebendige Fassung für den Film über Stationen: die Szene selbst, ihre Zeit ab dem Auftritt ihrer Stationen */
  async lebend(eingaben, p, kontext = {}) { return szeneBauen(eingaben, p, kontext); },

  async ausfuehren(eingaben, p, kontext = {}) {
    const b = await szeneBauen(eingaben, p, kontext);
    try {
      const zeiten = zustandsZeiten(b.zeit, p.bilder), ausgaben = [];
      for (const [i, t] of zeiten.entries()) {
        kontext.abbrechen?.throwIfAborted?.();
        kontext.melden?.(`Sketchory: Bild ${i + 1} von ${zeiten.length} (${t} s)`, i / zeiten.length);
        const phase = b.zeit.phasen.find((ph) => t >= ph.von && t < ph.bis)?.titel ?? null;
        ausgaben.push({ typ: "IMAGE", titel: `Sketchory · ${t} s${phase ? ` · ${phase}` : ""}`, bild: b.bild(t), befund: { art: "verifiziert", zeit: t, phase } });
        await new Promise((ok) => setTimeout(ok, 0));
      }
      return {
        ausgaben, entscheidungen: b.handschrift.entscheidungen,
        protokoll: {
          hinweis: "Sketchory zeichnet jedes Bild aus der Zeit; die Standbilder sind Momente der Szene, der Film über Stationen lässt sie weiterlaufen. Der Satz bleibt wörtlich; Sketchory setzt nur den Punkt.",
          satz: b.satz, satzQuelle: b.quelle, handschrift: b.handschrift.wahl, handschriftHerkunft: b.handschrift.herkunft, regel: b.handschrift.regel, striche: b.striche,
          zeit: { von: b.zeit.abschnitt.von, bis: b.zeit.abschnitt.bis, dauer: b.dauer, eigen: b.zeit.eigen, faktor: b.zeit.faktor }, zeiten, mass: [b.B, b.H], format: p.format, empfindlichkeit: p.empfindlichkeit,
        },
      };
    } finally { b.entsorgen(); }
  },
};
