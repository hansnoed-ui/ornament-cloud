// ORNAMENT LAB – Adapter für PHORMA III (alpha/phorma-iii/, seit Lab 0.1.21). Die vier Szenen Gewebe, Irrfahrt, Lichtwürfel und Traube
// werden Operationen des Labs: aus einem Bild (und wahlweise einem Ton) baut buehne.js die Bühne (three.js, WebGL 2), die jedes Bild nur
// aus der Zeit rechnet – Tausende Linien oder Perlen im Raum, Bloom, Korn, harte Schnitte auf den Einsätzen des Tons. PHORMA bleibt
// unverändert: ton.js (Analyse der Tonspur), analyse.js (Helligkeit des Bildes), ablauf.js (Zeitachse) werden fest importiert und laufen
// auch in Node; buehne.js braucht den Browser (three.js über die Importmap in index.html) und wird erst dort geladen.
//   ausfuehren()  rechnet `bilder` Standbilder gleichmässig über die Szene: das sind die Varianten (Stationen des Films)
//   lebend()      gibt dem Film über Stationen (kern/stationen.js) die Bühne selbst: bild(t) zur Filmzeit t, in jedem Bild neu, im Takt
//                 der Tonspur – so fliesst der Film wie bei PHORMA (Christian, 24. Oktober 2026: PHORMA-Videos im Lab re-mixen)
import { tonAnalysieren } from "../../../alpha/phorma-iii/ton.js?v=23";
import { zeitachse, TITEL } from "../../../alpha/phorma-iii/ablauf.js?v=23";
import { analysieren } from "../../../alpha/phorma-iii/analyse.js?v=23";
import { modulLaden } from "../kern/laden.js";

export const PHORMA_ARTEN = Object.freeze(["gewebe", "irrfahrt", "lichtwuerfel", "traube"]);
const BESCHREIBUNG = {
  gewebe: "PHORMA III, Gewebe: die Umrisse des Bildes werden zu Flächen aus feinen Linien, die der Ton bewegt; bei kräftigen Einsätzen neue Bilder, am Ende steht das Bild wieder.",
  irrfahrt: "PHORMA III, Irrfahrt: ein Faden irrt durch einen Würfel aus Licht, quillt mit der Musik zu Rauch auf, bei Schlägen springt alles; Bloom und Negativ.",
  lichtwuerfel: "PHORMA III, Lichtwürfel: die Irrfahrt mit festem Würfel, der Faden irrt in ihm, ruhiger als die Irrfahrt.",
  traube: "PHORMA III, Traube: glänzende rote Perlen in einer Kugel aus Fäden, Schnitte im Takt, der Bass lässt sie glühen.",
};
const DATEI = { gewebe: "gewebe.js", irrfahrt: "irrfahrt.js", lichtwuerfel: "irrfahrt.js (fest)", traube: "traube.js" };

let buehneModul = null;
const imBrowser = () => typeof document !== "undefined";
/** WebGL 2 vorhanden? (einmal geprüft; die Bühne selbst prüft noch einmal) */
let webgl2 = null;
function webgl2Da() {
  if (!imBrowser()) return false;
  if (webgl2 === null) { try { const c = document.createElement("canvas"); webgl2 = Boolean(c.getContext("webgl2")); } catch { webgl2 = false; } }
  return webgl2;
}
const leinwand = (w, h) => { const c = document.createElement("canvas"); c.width = Math.max(2, Math.round(w)); c.height = Math.max(2, Math.round(h)); return c; };
const gerade = (n) => Math.max(2, Math.round(n / 2) * 2);

/** die Zeitachse der Szene: `dauer` Sekunden Effekt, ohne Signet; { ab, abschnitt: { von, bis }, phasen, dauer } (ablauf.js) */
export const szenenZeit = (art, dauer) => zeitachse({ tempo: "normal", signet: false, laenge: dauer, ablauf: art });
/** n Zeitpunkte gleichmässig über die Szene (für die Standbilder), gerundet auf Hundertstel */
export function zustandsZeiten(zeit, n) {
  const { von, bis } = zeit.abschnitt, m = Math.max(1, Math.round(n));
  return Array.from({ length: m }, (_, i) => Math.round((von + ((i + 0.5) / m) * (bis - von)) * 100) / 100);
}
/** der Ton ab `beginn` für `dauer` Sekunden (plus eine Sekunde Reserve) als Analyse von PHORMA, oder null (dann rechnet PHORMA mit Ersatzkurven) */
export function tonAnalyse(ton, beginn, dauer) {
  if (!ton?.pcm?.length || !ton.rate) return null;
  const a = Math.min(ton.pcm.length, Math.max(0, Math.floor(beginn * ton.rate))), b = Math.min(ton.pcm.length, Math.floor((beginn + dauer + 1) * ton.rate));
  if (b - a < 0.2 * ton.rate) return null;
  return tonAnalysieren(ton.pcm.subarray(a, b), ton.rate);
}

/** das Foto als Leinwand in Rechengrösse (längste Seite `seite`, gerade Masse) und seine Analyse auf halber Grösse (wie in PHORMA) */
function fotoUndAnalyse(bild, seite) {
  const f = Math.min(1, seite / Math.max(bild.width, bild.height));
  const B = gerade(bild.width * f), H = gerade(bild.height * f);
  const quelle = leinwand(bild.width, bild.height);
  quelle.getContext("2d").putImageData(new ImageData(new Uint8ClampedArray(bild.data), bild.width, bild.height), 0, 0);
  const foto = leinwand(B, H), fx = foto.getContext("2d", { willReadFrequently: true });
  fx.imageSmoothingQuality = "high"; fx.drawImage(quelle, 0, 0, B, H);
  const w = Math.max(4, Math.round(B / 2)), h = Math.max(4, Math.round(H / 2)), klein = leinwand(w, h), kx = klein.getContext("2d", { willReadFrequently: true });
  kx.imageSmoothingQuality = "high"; kx.drawImage(foto, 0, 0, w, h);
  const A = analysieren(kx.getImageData(0, 0, w, h).data, w, h, { massstab: B / w });
  return { foto, A, B, H };
}

/** die Bühne für eine Szene bauen; gibt { dauer, zeit, bild(t), entsorgen(), B, H, ton } */
async function buehneBauen(art, { bild, ton }, p, kontext = {}) {
  if (!imBrowser()) throw new Error("PHORMA braucht einen Browser mit WebGL 2");
  if (!webgl2Da()) throw new Error("PHORMA braucht WebGL 2; dieser Browser hat es nicht");
  buehneModul ??= await modulLaden(new URL("../../../alpha/phorma-iii/buehne.js?v=23", import.meta.url).href, { titel: `PHORMA ${TITEL[art]}`, melden: kontext.melden });
  const { foto, A, B, H } = fotoUndAnalyse(bild, Math.round(p.seite));
  const T = tonAnalyse(ton, p.beginn, p.dauer), zeit = szenenZeit(art, p.dauer);
  const grob = p.guete === "grob", test = B * H <= 320 * 320;
  const g = buehneModul.buehne(foto, A, art, { grob, test, quelle: "foto", ton: T, laenge: p.dauer, signet: false, spur: (s) => kontext.melden?.(`PHORMA ${TITEL[art]}: ${s}`, null) });
  await g.warm;
  if (g.verloren) { g.entsorgen(); throw new Error("PHORMA: die Grafik ist ausgestiegen (webglcontextlost)"); }
  const lese = leinwand(B, H), lx = lese.getContext("2d", { willReadFrequently: true });
  let entsorgt = false;
  return {
    dauer: zeit.dauer, zeit, B, H, ton: T,
    /** das Bild der Szene zur Filmzeit t (s), als Bilddaten B × H */
    bild(t) {
      if (entsorgt) throw new Error("PHORMA: die Bühne ist schon entsorgt");
      const c = g.bild(zeit, Math.min(zeit.dauer - 1e-3, Math.max(0, t)), B, H, { proben: 1 });
      lx.drawImage(c, 0, 0, B, H);
      const d = lx.getImageData(0, 0, B, H);
      return { width: B, height: H, data: d.data };
    },
    entsorgen() { if (!entsorgt) { entsorgt = true; g.entsorgen(); } },
  };
}

function phormaOperation(art) {
  return {
    id: `phorma.${art}`,
    name: `PHORMA: ${TITEL[art]}`,
    version: "0.1.0",
    klasse: "zeitlich",
    herkunft: { art: "adapter", quelle: "PHORMA III", datei: `alpha/phorma-iii/buehne.js, ${DATEI[art]}, ton.js, analyse.js, ablauf.js (v=23, unverändert)`, referenz: null },
    beschreibung: BESCHREIBUNG[art],
    eingaenge: [{ name: "bild", typ: "IMAGE" }, { name: "ton", typ: "AUDIO", optional: true }],
    ausgaenge: [{ name: "zustaende", typ: "IMAGE", mehrfach: 12 }],
    parameter: [
      { id: "dauer", name: "Dauer der Szene (s)", art: "zahl", min: 6, max: 120, standard: 30, schritt: 1 },
      { id: "beginn", name: "Ton ab (s)", art: "zahl", min: 0, max: 600, standard: 0, schritt: 0.5, hilfe: "ab hier läuft der Ton in der Szene" },
      { id: "bilder", name: "Standbilder (Varianten)", art: "zahl", min: 1, max: 12, standard: 6, schritt: 1, hilfe: "gleichmässig über die Szene" },
      { id: "guete", name: "Güte", art: "wahl", standard: "fein", optionen: [{ wert: "fein", name: "fein" }, { wert: "grob", name: "grob (wie am Telefon)" }] },
      { id: "seite", name: "Rechengrösse (längste Seite, px)", art: "zahl", min: 256, max: 2048, standard: 1280, schritt: 1 },
    ],
    voraussetzungen: ["Browser mit WebGL 2 (three.js aus vendor/, Importmap in index.html)"],
    ressourcen: { zeit: "Aufbau einige Sekunden (Programme übersetzen), dann rechnet die Grafikkarte jedes Bild", speicher: "Bühne in Rechengrösse (Float-Ziele)" },
    reproduzierbar: "ja",
    varianten: "selbst",
    /** nur im Browser mit WebGL 2; das Register, die Zusammenstellung und der Film fragen vorher */
    verfuegbar: () => webgl2Da(),
    /** die lebendige Fassung für den Film über Stationen: die Bühne selbst, bild(t) zur Filmzeit */
    async lebend(eingaben, p, kontext = {}) { return buehneBauen(art, eingaben, p, kontext); },

    async ausfuehren(eingaben, p, kontext = {}) {
      const b = await buehneBauen(art, eingaben, p, kontext);
      try {
        const zeiten = zustandsZeiten(b.zeit, p.bilder), ausgaben = [];
        for (const [i, t] of zeiten.entries()) {
          kontext.abbrechen?.throwIfAborted?.();
          kontext.melden?.(`PHORMA ${TITEL[art]}: Bild ${i + 1} von ${zeiten.length} (${t} s)`, i / zeiten.length);
          ausgaben.push({ typ: "IMAGE", titel: `${TITEL[art]} · ${t} s`, bild: b.bild(t), befund: { art: "verifiziert", zeit: t, phase: b.zeit.phasen.find((ph) => t >= ph.von && t < ph.bis)?.titel ?? null } });
          await new Promise((ok) => setTimeout(ok, 0));
        }
        return {
          ausgaben,
          protokoll: {
            hinweis: "PHORMA III rechnet jedes Bild aus der Zeit; die Standbilder sind Momente der Szene, der Film über Stationen rechnet sie lebendig in jedem Bild neu.",
            art, dauer: p.dauer, zeit: { von: b.zeit.abschnitt.von, bis: b.zeit.abschnitt.bis, dauer: b.zeit.dauer }, zeiten, mass: [b.B, b.H], guete: p.guete,
            ton: b.ton ? { dauer: Math.round(b.ton.dauer * 100) / 100, einsaetze: b.ton.einsaetze.length, schnitte: b.ton.schnitte.length, beginn: p.beginn } : "Ersatzkurven (kein Ton)",
          },
        };
      } finally { b.entsorgen(); }
    },
  };
}

export const phormaGewebe = phormaOperation("gewebe");
export const phormaIrrfahrt = phormaOperation("irrfahrt");
export const phormaLichtwuerfel = phormaOperation("lichtwuerfel");
export const phormaTraube = phormaOperation("traube");
export const PHORMA_OPERATIONEN = [phormaGewebe, phormaIrrfahrt, phormaLichtwuerfel, phormaTraube];
