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
    ["Glut und Staub", "schwarz", [E("partikel", [.9, .45, .7, .65])]],
    ["Tuschewirbel", "schwarz", [E("fluid", [.9, .35, .6])]],
    ["Echo", "schwarz", [E("echo", [.6, .5, .5, .6, .5])]],
    ["Montage", "schwarz", [E("montage", [.55, .5, .4, .4, .5])]],
    ["Linsen", "schwarz", [E("linsen", [.55, .55, .75, .6], "normal", 1, "bild", 2)]],
    ["Horizont", "schwarz", [E("horizont", [.75, .55, .5, .6]), E("bild", [.5, .3, 0, .2], "bildschirm", .15)]],
    ["Pinselstrom", "weiss", [E("pinsel", [.6, .3, .4, .55, .35])]],
    ["Dolly-Zoom", "schwarz", [E("vertigo", [.6, .5, .5, .4])]],
    ["Tinte unter Glas", "schwarz", [E("tinte", [.7, .5, .8, .4]), E("wasserglas", [.5, .22, .7, .5], "normal", 1, "unten")]],
  ],
  frida: [
    ["Op-Art", "schwarz", [E("zebra", [.5, .7, .6, .85, .9])]],
    ["Glitzer", "schwarz", [E("glitzer", [.9, .8, .8, .6])]],
    ["Mosaiktropfen", "schwarz", [E("metaballs", [.7, .45, .4, .5])]],
    ["Druckraster", "weiss", [E("raster", [.5, .5, .5, .5, 0])]],
    ["Linien", "weiss", [E("linien", [.55, .75, .5, .1])]],
    ["Tuscheblasen", "schwarz", [E("tusche", [.5, .55, .6, .8, .25])]],
    ["Röntgen", "schwarz", [E("roentgen", [.6, .5, .5, .5, .3])]],
    ["Aquarell", "weiss", [E("aquarell", [.6, .45, .6, .5, .3])]],
    ["Relief", "schwarz", [E("relief", [.55, .45, .45, .4, .2])]],
  ],
  strudel: [
    ["Wasserglas", "schwarz", [E("wasserglas", [.6, .5, .9, .6])]],
    ["Pixel Sorting", "schwarz", [E("sortieren", [.5, .55, 0, .5, .4])]],
    ["Lasur", "weiss", [E("tinte", [.75, .6, .7, .45])]],
    ["Voxel", "schwarz", [E("voxel", [.45, .5, .5, .5, .5])]],
    ["Spiralarme", "schwarz", [E("wirbel", [.5, .7, .6, .7], "normal", 1, "bild", 5)]],
    ["Entrauschen", "schwarz", [E("entrauschen", [.9, .6, .5, .3, 1])]],
    ["Höhenlinien", "schwarz", [E("hoehenlinien", [.5, .3, .4, .3, .35])]],
    ["Strömung", "schwarz", [E("stroemung", [.55, .4, .35, .3, .6])]],
    ["Lichtstrahlen", "schwarz", [E("strahlen", [.65, .5, .5, .65, .5])]],
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
