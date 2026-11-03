// Animationen – die drei Bilder und je neun Animationen daraus (Wunsch vom 3. November 2026: «aus jedem Bild 9 verschiedene
// Animationen zur Ansicht und zum Download»). Eine Ebene: [Effekt, Regler (0–1, fehlende = Vorgabe), Modus, Deckkraft, Quelle].
import { EFFEKTE, EFFEKT_IDS } from "./effekte.js";
import { MODI } from "./motor.js";

export const BILDER = [
  { id: "fragmente", name: "Fragmente", url: "bilder/fragmente.jpg", text: "Collage, Rot und Orange auf Schwarz" },
  { id: "frida", name: "Frida", url: "bilder/frida.jpg", text: "Mosaik-Porträt mit Kopftuch, Lippen orange" },
  { id: "strudel", name: "Strudel", url: "bilder/strudel.jpg", text: "Farbstrudel aus Tropfenraster" },
];

const E = (effekt, werte = [], modus = "normal", deckkraft = 1, quelle = "bild", seed = 0) => ({ effekt, werte, modus, deckkraft, quelle, seed });

const ROH = {
  fragmente: [
    ["Glut und Staub", "schwarz", [E("partikel", [.9, .45, .7, .3])]],
    ["Tuschewirbel", "schwarz", [E("fluid", [.9, .35, .6])]],
    ["Archiv", "schwarz", [E("scan", [.8, .6, .5, .6])]],
    ["Tropfen", "schwarz", [E("metaballs", [.45, .6, .5, .4])]],
    ["Linsen", "schwarz", [E("linsen", [.55, .55, .75, .6], "normal", 1, "bild", 2)]],
    ["Horizont", "schwarz", [E("horizont", [.75, .55, .5, .6]), E("bild", [.5, .3, 0, .2], "bildschirm", .15)]],
    ["Holo", "schwarz", [E("holo", [.62, .6, .5, .35]), E("linien", [.4, .8, .6, 1], "bildschirm", .45)]],
    ["Gegenstreifen", "schwarz", [E("bild", [.4, .3]), E("zebra", [.45, .7, .5, .6, 0], "differenz", .85)]],
    ["Tinte unter Glas", "schwarz", [E("tinte", [.7, .5, .8, .4]), E("wasserglas", [.5, .22, .7, .5], "normal", 1, "unten")]],
  ],
  frida: [
    ["Op-Art", "schwarz", [E("zebra", [.5, .7, .6, .85, .9])]],
    ["Glitzer", "schwarz", [E("glitzer", [.9, .8, .8, .6])]],
    ["Mosaiktropfen", "schwarz", [E("metaballs", [.7, .45, .4, .5])]],
    ["Seifenblase", "schwarz", [E("seifenblase", [.82, .7, .5, .35])]],
    ["Linien", "weiss", [E("linien", [.55, .75, .5, .1])]],
    ["Tuscheblasen", "schwarz", [E("tusche", [.5, .55, .6, .8, .25])]],
    ["Fliessende Streifen", "schwarz", [E("fluid", [.8, .4, .5]), E("zebra", [.55, .5, .4, .8, .9], "multiplizieren", .65, "unten")]],
    ["Wirbel", "schwarz", [E("wirbel", [.55, .6, .5, .7])]],
    ["Holo-Frida", "schwarz", [E("holo", [.78, .45, .6, .6]), E("partikel", [.6, .35, .8, .7], "bildschirm", .4)]],
  ],
  strudel: [
    ["Wasserglas", "schwarz", [E("wasserglas", [.6, .5, .9, .6])]],
    ["Sog", "schwarz", [E("fluid", [1, .3, .7])]],
    ["Lasur", "weiss", [E("tinte", [.75, .6, .7, .45])]],
    ["Sternstaub", "schwarz", [E("partikel", [.8, .35, .7, .75])]],
    ["Spiralarme", "schwarz", [E("wirbel", [.5, .7, .6, .7], "normal", 1, "bild", 5)]],
    ["Nachtlinien", "schwarz", [E("linien", [.6, .7, .6, 1])]],
    ["Scan", "schwarz", [E("scan", [.7, .7, .6, .4])]],
    ["Blase im Strudel", "schwarz", [E("bild", [.5, .4]), E("seifenblase", [.65, .8, .6, 1], "normal", 1, "unten")]],
    ["Rauch über dem Horizont", "schwarz", [E("horizont", [.85, .65, .5, .6]), E("tinte", [.6, .5, .8, .5], "bildschirm", .45)]],
  ],
};

export const WERKE = BILDER.flatMap((b) => ROH[b.id].map(([titel, grund, ebenen], i) => ({
  id: `${b.id}-${i + 1}`, nr: i + 1, titel, bild: b.id, stapel: { bild: b.id, grund, ebenen },
})));

/** «neu mischen»: ein Bild, eine bis drei Ebenen aus verschiedenen Effekten, Mischmodi, Deckkraft, Regler */
export function zufall(zz = Math.random) {
  const wahl = (a) => a[Math.floor(zz() * a.length)];
  const n = 1 + Math.floor(zz() * 3), ids = [...EFFEKT_IDS].sort(() => zz() - .5).slice(0, n);
  const modi = Object.keys(MODI);
  return {
    bild: wahl(BILDER).id,
    grund: zz() < .75 ? "schwarz" : "weiss",
    ebenen: ids.map((effekt, i) => ({
      effekt,
      werte: EFFEKTE[effekt].regler.map(() => +(0.2 + zz() * 0.7).toFixed(2)),
      modus: i === 0 ? "normal" : wahl(modi),
      deckkraft: i === 0 ? 1 : +(0.45 + zz() * 0.55).toFixed(2),
      quelle: i > 0 && zz() < .3 ? "unten" : "bild",
      seed: Math.floor(zz() * 9),
    })),
  };
}
