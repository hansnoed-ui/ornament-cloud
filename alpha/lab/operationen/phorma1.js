// ORNAMENT LAB – Adapter für PHORMA I, «Bildfragmentieren» (alpha/bildfragmentieren/, seit Lab 0.1.22; Christian, 24. Oktober 2026: «phorma-ii,
// phorma-i und the fictory auch berücksichtigen»). Der Ablauf «Fragmente» (Linien → Formen → Farben → Bild, Leinwand 2D) und die Verwandlung
// (Strom, Körper, Scherben, Echo, Relief, einzeln oder als Kette, und der Relief-Flug; three.js, WebGL 2) werden eine Operation des Labs.
// PHORMA I bleibt unverändert: fragmente.js (Zerlegung), ablauf.js, szene.js werden fest importiert (laufen auch in Node), raum.js erst im Browser.
//   Zettelkasten (visuell):  ein Zettel am Eingang «text» gibt den Titel der Beschriftung; sonst die Konstellation (Künstler × Theoretiker)
//   ORNA (operational):      die Operationsregel R1–R7 einer Konstellation am Eingang wählt den Ablauf (REGEL_ABLAUF), wenn der Mensch keinen wählt
//   ausfuehren()             rechnet `bilder` Standbilder gleichmässig über den Ablauf: die Varianten (Stationen des Films)
//   lebend()                 gibt dem Film über Stationen die Szene selbst; ihre Zeit beginnt mit dem Auftritt ihrer Stationen (zeitbasis «auftritt»)
import { zerlegen } from "../../../alpha/bildfragmentieren/fragmente.js?v=36";
import { kette, ablaufName, EFFEKTE, ABLAEUFE as PHASEN, VERWANDLUNG } from "../../../alpha/bildfragmentieren/ablauf.js?v=36";
import { szene, bild as filmBild, vorbereiten, FARBEN } from "../../../alpha/bildfragmentieren/szene.js?v=36";
import { zustandsZeiten } from "./phorma.js";
import { imBrowser, webgl2Da, leinwand, klemm, fotoBauen, EINGAENGE, BESCHRIFTUNG, beschriftungAn, titelAus, ablaufWaehlen } from "./buehnenhilfe.js";

/** die Abläufe zur Wahl: Fragmente, jeder Effekt der Verwandlung einzeln, der Relief-Flug und vier Ketten (in der festen Reihenfolge von PHORMA I) */
export const ABLAEUFE = Object.freeze([
  ["fragmente", "Fragmente: Linien → Formen → Farben → Bild"],
  ...EFFEKTE.map((e) => [e, PHASEN[e].titel]),
  ["flug", "Relief-Flug"],
  [VERWANDLUNG, "Verwandlung: Strom → Körper → Scherben → Echo → Relief"],
  ["strom+relief", "Strom → Relief"],
  ["koerper+scherben", "Körper → Scherben"],
  ["echo+relief", "Echo → Relief"],
].map(([wert, name]) => ({ wert, name })));
/**
 * Operationsregel (The Fictory, aus einer ORNA-Konstellation) → Ablauf von PHORMA I. Eine gestalterische Interpretation, offen gelegt:
 *   R1 Keine Rückkehr an dieselbe Stelle → Strom (die Teilchen fliegen einmal an ihren Platz)
 *   R2 Verzögerter Spiegel → Echo (die Rückkopplung bringt das Bild verspätet zurück)
 *   R3 Raster als Regel → Fragmente (Zeilen, Dreiecke, Mosaik)
 *   R4 Nur Unterschiede, die Unterschiede machen → Scherben (Bruch und Montage der Teile)
 *   R5 Fortwirkende Last → Relief (das Gebirge aus Höhenlinien, schwer)
 *   R6 Die Leerstelle bleibt → Körper (der Glaskörper, am Ende klar und leer)
 *   R7 Verflechtung → Verwandlung (alle Effekte verbunden, einer wächst aus dem anderen)
 */
export const REGEL_ABLAUF = Object.freeze({ R1: "strom", R2: "echo", R3: "fragmente", R4: "scherben", R5: "relief", R6: "koerper", R7: VERWANDLUNG });
/** Dauer eines Ablaufs bei Tempo «normal» (s): Fragmente und Relief-Flug aus ihren Phasen, die Verwandlung aus der Kette */
export const ablaufDauer = (art) => (art === "fragmente" || art === "flug" ? PHASEN[art].phasen.reduce((s, p) => s + p[2], 0) : kette(art).dauer);
export const TITEL = (art) => (art === "fragmente" || art === "flug" ? PHASEN[art].titel : art.split("+").map((e) => PHASEN[e].titel).join(" → "));

let raumModul = null;

/** die Szene bauen: Foto in Rechengrösse, Zerlegung auf halber Grösse (wie in PHORMA I), Verwandlung mit WebGL; gibt { dauer, zeit, bild(t), entsorgen(), … } */
async function szeneBauen({ bild, konstellation, text }, p, kontext = {}) {
  if (!imBrowser()) throw new Error("PHORMA I braucht einen Browser (Leinwand; WebGL 2 für die Verwandlung)");
  const wahl = ablaufWaehlen(p, konstellation, REGEL_ABLAUF, "fragmente", ABLAEUFE);
  const art = ablaufName(wahl.ablauf), raeumlich = art !== "fragmente";
  if (raeumlich && !webgl2Da()) throw new Error(`PHORMA I ${TITEL(art)} braucht WebGL 2; dieser Browser hat es nicht (Fragmente geht ohne)`);
  if (raeumlich) raumModul ??= await import("../../../alpha/bildfragmentieren/raum.js?v=36");
  const { foto, B, H, klein } = fotoBauen(bild, Math.round(p.seite));
  kontext.melden?.("PHORMA I: das Foto wird zerlegt", null);
  const daten = zerlegen(klein.daten, klein.w, klein.h, { massstab: B / klein.w, feinheit: p.feinheit });
  daten.breite = B; daten.hoehe = H;
  const tempo = p.dauer > 0 ? klemm(p.dauer / ablaufDauer(art), 0.2, 3) : "normal";
  const grund = FARBEN[p.grund] ? p.grund : "schwarz", F = FARBEN[grund];
  const raum = raeumlich ? raumModul.raum(foto, art, { grund: F.grund, akzent: F.punkt }) : null;
  const sz = szene(daten, { breite: B, hoehe: H, tempo, grund, signet: false, beschriftung: beschriftungAn(p, { text, konstellation }), titel: titelAus(text, konstellation),
    foto, leinwand, vorrat: {}, ablauf: art, raum });
  vorbereiten(sz);   // Stich und Farbauszüge im Voraus
  const lese = leinwand(B, H), lx = lese.getContext("2d", { willReadFrequently: true });
  let entsorgt = false;
  return {
    dauer: sz.zeit.dauer, zeit: sz.zeit, B, H, wahl, ablauf: art, tempo: sz.zeit.tempo, titel: sz.beschriftung ? sz.titel : null, zeitbasis: "auftritt",
    zerlegung: { zeilen: daten.zeilen.reihen, kanten: daten.kanten.length, dreiecke: daten.dreiecke.n },
    /** das Bild zur Zeit t (s) der Szene, als Bilddaten B × H */
    bild(t) {
      if (entsorgt) throw new Error("PHORMA I: die Szene ist schon entsorgt");
      filmBild(lx, sz, klemm(t, 0, sz.zeit.dauer - 1e-3));
      const d = lx.getImageData(0, 0, B, H);
      return { width: B, height: H, data: d.data };
    },
    entsorgen() { if (!entsorgt) { entsorgt = true; raum?.entsorgen(); } },
  };
}

export const phorma1 = {
  id: "phorma.i",
  name: "PHORMA I: Szene",
  version: "0.1.0",
  klasse: "zeitlich",
  herkunft: { art: "adapter", quelle: "PHORMA I (Bildfragmentieren)", datei: "alpha/bildfragmentieren/fragmente.js, ablauf.js, szene.js, raum.js (v=36, unverändert)", referenz: null },
  beschreibung: "PHORMA I: Fragmente (Linien tasten das Bild ab, Dreiecke fliegen herein, Farben, das Foto rastet ein) oder die Verwandlung – Strom, Körper, Scherben, Echo, Relief, einzeln oder als Kette – und der Relief-Flug. Eine ORNA-Konstellation kann den Ablauf wählen, ein Zettel gibt den Titel.",
  eingaenge: EINGAENGE,
  ausgaenge: [{ name: "zustaende", typ: "IMAGE", mehrfach: 12 }],
  parameter: [
    { id: "ablauf", name: "Ablauf", art: "wahl", standard: "", optionen: [{ wert: "", name: "aus der Konstellation (sonst Fragmente)" }, ...ABLAEUFE] },
    { id: "dauer", name: "Dauer des Ablaufs (s, 0 = eigenes Tempo)", art: "zahl", min: 0, max: 120, standard: 0, schritt: 1, hilfe: "PHORMA I rechnet in eigener Zeit; eine Dauer streckt oder rafft sie" },
    { id: "bilder", name: "Standbilder (Varianten)", art: "zahl", min: 1, max: 12, standard: 6, schritt: 1, hilfe: "gleichmässig über den Ablauf" },
    { id: "feinheit", name: "Feinheit der Zerlegung", art: "wahl", standard: "mittel", optionen: [{ wert: "grob", name: "grob" }, { wert: "mittel", name: "mittel" }, { wert: "fein", name: "fein" }] },
    { id: "grund", name: "Grund", art: "wahl", standard: "schwarz", optionen: [{ wert: "schwarz", name: "schwarz" }, { wert: "weiss", name: "weiss" }] },
    { id: "seite", name: "Rechengrösse (längste Seite, px)", art: "zahl", min: 256, max: 2048, standard: 1080, schritt: 1 },
    BESCHRIFTUNG,
  ],
  voraussetzungen: ["Browser mit Leinwand 2D; WebGL 2 für die Verwandlung und den Relief-Flug (three.js aus vendor/, Importmap in index.html)"],
  ressourcen: { zeit: "Zerlegung unter einer Sekunde, die Verwandlung baut ihre Programme auf, dann rechnet die Grafikkarte jedes Bild", speicher: "Szene in Rechengrösse" },
  reproduzierbar: "ja",
  varianten: "selbst",
  verfuegbar: () => imBrowser(),
  /** die lebendige Fassung für den Film über Stationen: die Szene selbst, ihre Zeit ab dem Auftritt ihrer Stationen */
  async lebend(eingaben, p, kontext = {}) { return szeneBauen(eingaben, p, kontext); },

  async ausfuehren(eingaben, p, kontext = {}) {
    const b = await szeneBauen(eingaben, p, kontext);
    try {
      const zeiten = zustandsZeiten(b.zeit, p.bilder), ausgaben = [], name = TITEL(b.ablauf);
      for (const [i, t] of zeiten.entries()) {
        kontext.abbrechen?.throwIfAborted?.();
        kontext.melden?.(`PHORMA I ${name}: Bild ${i + 1} von ${zeiten.length} (${t} s)`, i / zeiten.length);
        ausgaben.push({ typ: "IMAGE", titel: `${name} · ${t} s`, bild: b.bild(t), befund: { art: "verifiziert", zeit: t, phase: b.zeit.phasen.find((ph) => t >= ph.von && t < ph.bis)?.titel ?? null } });
        await new Promise((ok) => setTimeout(ok, 0));
      }
      return {
        ausgaben, entscheidungen: b.wahl.entscheidungen,
        protokoll: {
          hinweis: "PHORMA I rechnet jedes Bild aus der Zeit; die Standbilder sind Momente des Ablaufs, der Film über Stationen lässt ihn weiterlaufen.",
          ablauf: b.ablauf, ablaufHerkunft: b.wahl.herkunft, regel: b.wahl.regel, tempo: b.tempo, titel: b.titel, zerlegung: b.zerlegung,
          zeit: { von: b.zeit.abschnitt.von, bis: b.zeit.abschnitt.bis, dauer: b.zeit.dauer }, zeiten, mass: [b.B, b.H], feinheit: p.feinheit, grund: p.grund,
        },
      };
    } finally { b.entsorgen(); }
  },
};
