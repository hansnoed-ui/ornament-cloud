// ORNAMENT LAB – Adapter für PHORMA II (alpha/phorma-ii/, seit Lab 0.1.22; Christian, 24. Oktober 2026: «phorma-ii, phorma-i und the fictory auch
// berücksichtigen»). Die sechs Effekte Physarum, Tiefe, Wellenwanne, Tuch, Rasterdruck und Montage, einzeln oder als Kette, werden eine Operation
// des Labs: buehne.js (three.js, WebGL 2) rechnet jedes Bild aus der Zeit, film.js setzt es auf die Leinwand (mit Beschriftung, ohne Signet).
// PHORMA II bleibt unverändert: analyse.js, ablauf.js, film.js werden fest importiert (laufen auch in Node), buehne.js erst im Browser.
//   Zettelkasten (visuell):  ein Zettel am Eingang «text» gibt den Titel der Beschriftung; sonst die Konstellation (Künstler × Theoretiker)
//   ORNA (operational):      die Operationsregel R1–R7 einer Konstellation am Eingang wählt den Ablauf (REGEL_ABLAUF), wenn der Mensch keinen wählt
//   ausfuehren()             rechnet `bilder` Standbilder gleichmässig über die Kette: die Varianten (Stationen des Films)
//   lebend()                 gibt dem Film über Stationen die Bühne selbst; ihre Zeit beginnt mit dem Auftritt ihrer Stationen (zeitbasis «auftritt»)
import { analysieren } from "../../../alpha/phorma-ii/analyse.js?v=38";
import { kette, ablaufName, EFFEKTE, TITEL, KETTE } from "../../../alpha/phorma-ii/ablauf.js?v=38";
import { szene, bild as filmBild } from "../../../alpha/phorma-ii/film.js?v=38";
import { zustandsZeiten } from "./phorma.js";
import { imBrowser, webgl2Da, leinwand, klemm, fotoBauen, EINGAENGE, BESCHRIFTUNG, beschriftungAn, titelAus, ablaufWaehlen } from "./buehnenhilfe.js";
import { modulLaden } from "../kern/laden.js";

/** die Abläufe zur Wahl: jeder Effekt einzeln und vier Ketten (in der festen Reihenfolge von PHORMA II) */
export const ABLAEUFE = Object.freeze([
  ...EFFEKTE.map((e) => [e, TITEL[e]]),
  [KETTE, "Alle drei: Physarum → Tiefe → Tuch"],
  ["physarum+montage", "Physarum → Montage"],
  ["tiefe+tuch", "Tiefe → Tuch"],
  ["raster+montage", "Rasterdruck → Montage"],
].map(([wert, name]) => ({ wert, name })));
/**
 * Operationsregel (The Fictory, aus einer ORNA-Konstellation) → Ablauf von PHORMA II. Eine gestalterische Interpretation, offen gelegt:
 *   R1 Keine Rückkehr an dieselbe Stelle → Rasterdruck (der Druck kehrt nie ins Foto zurück)
 *   R2 Verzögerter Spiegel → Wellenwanne (das Bild spiegelt sich im Wasser, Ringe laufen verzögert aus)
 *   R3 Raster als Regel → Rasterdruck → Montage (Raster und Rechtecke)
 *   R4 Nur Unterschiede, die Unterschiede machen → Tiefe (nah und fern unterscheiden sich)
 *   R5 Fortwirkende Last → Tuch (das Bild fällt als Stoff)
 *   R6 Die Leerstelle bleibt → Montage (Ausschnitte von anderswo, Leerstellen dazwischen)
 *   R7 Verflechtung → Physarum (das Netz verbindet die Formen)
 */
export const REGEL_ABLAUF = Object.freeze({ R1: "raster", R2: "welle", R3: "raster+montage", R4: "tiefe", R5: "tuch", R6: "montage", R7: "physarum" });

let buehneModul = null;

/** die Bühne bauen: Foto in Rechengrösse, Analyse auf halber Grösse (wie in PHORMA II), Kette nach Wahl; gibt { dauer, zeit, bild(t), entsorgen(), … } */
async function buehneBauen({ bild, konstellation, text }, p, kontext = {}) {
  if (!imBrowser()) throw new Error("PHORMA II braucht einen Browser mit WebGL 2");
  if (!webgl2Da()) throw new Error("PHORMA II braucht WebGL 2; dieser Browser hat es nicht");
  buehneModul ??= await modulLaden(new URL("../../../alpha/phorma-ii/buehne.js?v=38", import.meta.url).href, { titel: "PHORMA II", melden: kontext.melden });
  const wahl = ablaufWaehlen(p, konstellation, REGEL_ABLAUF, KETTE, ABLAEUFE);
  const ablauf = ablaufName(wahl.ablauf);
  const { foto, B, H, klein } = fotoBauen(bild, Math.round(p.seite));
  const A = analysieren(klein.daten, klein.w, klein.h, { massstab: B / klein.w });
  const K = kette(ablauf), tempo = p.dauer > 0 ? klemm(p.dauer / K.dauer, 0.2, 3) : "normal";
  const grob = p.guete === "grob", test = B * H <= 320 * 320;
  let verloren = false;
  const g = buehneModul.buehne(foto, A, ablauf, { grob, test, tiefeQuelle: "bild", onVerloren: () => { verloren = true; }, spur: (s) => kontext.melden?.(`PHORMA II: ${s}`, null) });
  const sz = szene({ breite: B, hoehe: H, tempo, signet: false, beschriftung: beschriftungAn(p, { text, konstellation }), titel: titelAus(text, konstellation), foto, ablauf, buehne: g });
  await g.bereit;   // Programme übersetzt, das Tuch (Worker) vorausgerechnet
  if (verloren) { g.entsorgen(); throw new Error("PHORMA II: die Grafik ist ausgestiegen (webglcontextlost)"); }
  const lese = leinwand(B, H), lx = lese.getContext("2d", { willReadFrequently: true });
  let entsorgt = false;
  return {
    dauer: sz.zeit.dauer, zeit: sz.zeit, B, H, wahl, ablauf, tempo: sz.zeit.tempo, titel: sz.beschriftung ? sz.titel : null, zeitbasis: "auftritt",
    /** das Bild zur Zeit t (s) der Szene, als Bilddaten B × H */
    bild(t) {
      if (entsorgt) throw new Error("PHORMA II: die Bühne ist schon entsorgt");
      filmBild(lx, sz, klemm(t, 0, sz.zeit.dauer - 1e-3), { proben: 1 });
      const d = lx.getImageData(0, 0, B, H);
      return { width: B, height: H, data: d.data };
    },
    entsorgen() { if (!entsorgt) { entsorgt = true; g.entsorgen(); } },
  };
}

export const phorma2 = {
  id: "phorma.ii",
  name: "PHORMA II: Szene",
  version: "0.1.0",
  klasse: "zeitlich",
  herkunft: { art: "adapter", quelle: "PHORMA II", datei: "alpha/phorma-ii/buehne.js, film.js, ablauf.js, analyse.js und die Effekte (v=38, unverändert)", referenz: null },
  beschreibung: "PHORMA II: Physarum (ein Schleimpilz findet die Formen), Tiefe (das Foto wird Relief), Wellenwanne, Tuch (das Foto fällt als Seide), Rasterdruck, Montage (verschachtelte Rechtecke) – einzeln oder als Kette. Eine ORNA-Konstellation kann den Ablauf wählen, ein Zettel gibt den Titel.",
  eingaenge: EINGAENGE,
  ausgaenge: [{ name: "zustaende", typ: "IMAGE", mehrfach: 12 }],
  parameter: [
    { id: "ablauf", name: "Ablauf", art: "wahl", standard: "", optionen: [{ wert: "", name: "aus der Konstellation (sonst alle drei)" }, ...ABLAEUFE] },
    { id: "dauer", name: "Dauer der Kette (s, 0 = eigenes Tempo)", art: "zahl", min: 0, max: 120, standard: 0, schritt: 1, hilfe: "PHORMA II rechnet seine Effekte in eigener Zeit; eine Dauer streckt oder rafft sie" },
    { id: "bilder", name: "Standbilder (Varianten)", art: "zahl", min: 1, max: 12, standard: 6, schritt: 1, hilfe: "gleichmässig über die Kette" },
    { id: "guete", name: "Güte", art: "wahl", standard: "fein", optionen: [{ wert: "fein", name: "fein" }, { wert: "grob", name: "grob (wie am Telefon)" }] },
    { id: "seite", name: "Rechengrösse (längste Seite, px)", art: "zahl", min: 256, max: 2048, standard: 1080, schritt: 1 },
    BESCHRIFTUNG,
  ],
  voraussetzungen: ["Browser mit WebGL 2 (three.js aus vendor/, Importmap in index.html)"],
  ressourcen: { zeit: "Aufbau einige Sekunden (Programme, beim Tuch die Stoffsimulation), dann rechnet die Grafikkarte jedes Bild", speicher: "Bühne in Rechengrösse (HalfFloat-Ziele)" },
  reproduzierbar: "ja",
  varianten: "selbst",
  verfuegbar: () => webgl2Da(),
  /** die lebendige Fassung für den Film über Stationen: die Bühne selbst, ihre Zeit ab dem Auftritt ihrer Stationen */
  async lebend(eingaben, p, kontext = {}) { return buehneBauen(eingaben, p, kontext); },

  async ausfuehren(eingaben, p, kontext = {}) {
    const b = await buehneBauen(eingaben, p, kontext);
    try {
      const zeiten = zustandsZeiten(b.zeit, p.bilder), ausgaben = [], name = b.ablauf.split("+").map((e) => TITEL[e]).join(" → ");
      for (const [i, t] of zeiten.entries()) {
        kontext.abbrechen?.throwIfAborted?.();
        kontext.melden?.(`PHORMA II ${name}: Bild ${i + 1} von ${zeiten.length} (${t} s)`, i / zeiten.length);
        ausgaben.push({ typ: "IMAGE", titel: `${name} · ${t} s`, bild: b.bild(t), befund: { art: "verifiziert", zeit: t, phase: b.zeit.phasen.find((ph) => t >= ph.von && t < ph.bis)?.titel ?? null } });
        await new Promise((ok) => setTimeout(ok, 0));
      }
      return {
        ausgaben, entscheidungen: b.wahl.entscheidungen,
        protokoll: {
          hinweis: "PHORMA II rechnet jedes Bild aus der Zeit; die Standbilder sind Momente der Kette, der Film über Stationen lässt sie auf ihrer Bühne weiterlaufen.",
          ablauf: b.ablauf, ablaufHerkunft: b.wahl.herkunft, regel: b.wahl.regel, tempo: b.tempo, titel: b.titel,
          zeit: { von: b.zeit.abschnitt.von, bis: b.zeit.abschnitt.bis, dauer: b.zeit.dauer }, zeiten, mass: [b.B, b.H], guete: p.guete,
        },
      };
    } finally { b.entsorgen(); }
  },
};
