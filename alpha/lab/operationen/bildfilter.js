// ORNAMENT LAB – die gemeinsame Hülle der Bildfilter (seit Lab 0.1.10): Glitch, Pixelsortierung, Verzerrung, Licht, Raster, Neu setzen.
// Ein Filter ist hier keine abgeschlossene Effektkopie, sondern eine Operation wie jede andere: parametrisiert, über Varianten und
// Zeit modulierbar, verkettbar, mit protokolliertem Startwert. Die Hülle gibt jedem Filter dasselbe Verhalten:
//   Anteil   wie das Dry/Wet eines Effektgeräts im Rack (Reason, Bitwig): 0 lässt den Eingang stehen, 1 ist der volle Filter.
//   Verlauf  eine Bildfolge für «Animation des letzten Schritts» und die Modulation «über die Zeit». Ohne Zeitroute wächst der Anteil
//            vom Eingang bis zum Ergebnis; mit Zeitroute folgen die Parameter ihr, das letzte Bild ist das Ergebnis.
//   Flackern bei Filtern mit Zufall: jedes Bild des Verlaufs würfelt neu, wie ein Glitch, der nie zweimal gleich aussieht.
//            Die Startwerte sind seed + (n − 1 − k): das letzte Bild hat den protokollierten Startwert und gleicht dem Ergebnis.
// Gerechnet wird auf der CPU in reinem JavaScript, ohne DOM: dieselben Filter laufen im Browser und in den Tests, Bild für Bild
// reproduzierbar. Jeder Filter ist ein Durchgang über die Pixel oder wenige (Licht: drei Kastenfilter), damit es auch am Telefon trägt.
import { begrenzen } from "../kern/bilddaten.js";
import { moduliere } from "../kern/modulation.js";

export const zahl = (id, name, min, max, standard, schritt, hilfe) => ({ id, name, art: "zahl", min, max, standard, schritt, hilfe });
export const wahl = (id, name, standard, optionen) => ({ id, name, art: "wahl", standard, optionen: optionen.map(([wert, n]) => ({ wert, name: n })) });

/** die Parameter, die jeder Filter am Ende trägt */
export function gemeinsameParameter({ flackern = false, seite = 1200 } = {}) {
  return [
    zahl("anteil", "Anteil (Dry/Wet)", 0, 1, 1, 0.01, "0: Eingang, 1: voller Filter, dazwischen gemischt"),
    ...(flackern ? [{ id: "flackern", name: "im Verlauf neu würfeln (Flackern)", art: "schalter", standard: false }] : []),
    zahl("bilder", "Bilder im Verlauf", 2, 120, 36, 1, "Länge der Bildfolge für die Animation und die Modulation über die Zeit"),
    zahl("seite", "Rechengrösse (längste Seite, px)", 256, 2048, seite, 1, "begrenzt Rechenzeit und Speicher; am Telefon lieber klein"),
  ];
}

/** Eingang und Filterergebnis nach dem Anteil mischen (neues Bild; bei Anteil 1 das Ergebnis selbst) */
export function mischeAnteil(ein, aus, anteil) {
  if (anteil >= 1) return aus;
  const out = { width: aus.width, height: aus.height, data: new Uint8ClampedArray(aus.data.length) };
  const a = Math.max(0, anteil), e = ein.data, f = aus.data, o = out.data;
  for (let i = 0; i < o.length; i++) o[i] = e[i] + (f[i] - e[i]) * a;
  return out;
}

const glatt = (t) => t * t * (3 - 2 * t);

/**
 * Baut aus einer Beschreibung und einer reinen Rechenfunktion eine Operation fürs Register.
 * rechne(eingaenge, p, { seed, k }) → { bild, protokoll? }; eingaenge.bild ist schon auf die Rechengrösse begrenzt.
 */
export function bildfilter({ rechne, titel, verlaufSeite = 900, ...beschreibung }) {
  const op = {
    ...beschreibung,
    eingaenge: beschreibung.eingaenge ?? [{ name: "bild", typ: "IMAGE" }],
    ausgaenge: [{ name: "bild", typ: "IMAGE" }],
    voraussetzungen: [],
    reproduzierbar: "ja",
    varianten: "moduliert",

    async ausfuehren(ein, p, kontext = {}) {
      const q = kontext.zeitRouten?.length ? moduliere(op, p, kontext.zeitRouten, 1) : p;
      const seed = (kontext.seed ?? 1) >>> 0;
      const bild = begrenzen(ein.bild, p.seite);
      const r = rechne({ ...ein, bild }, q, { seed, k: 0 });
      return {
        ausgaben: [{ typ: "IMAGE", titel, bild: mischeAnteil(bild, r.bild, q.anteil) }],
        protokoll: { ...(r.protokoll ?? {}), anteil: q.anteil, rechengroesse: [bild.width, bild.height] },
      };
    },

    verlaufBilder: (p) => Math.round(p.bilder),

    /** die Bildfolge: ohne Zeitroute wächst der Anteil vom Eingang zum Ergebnis, mit Zeitroute folgen die Parameter der Route */
    async *verlauf(ein, p, kontext = {}) {
      const n = Math.max(2, Math.round(p.bilder)), seed = (kontext.seed ?? 1) >>> 0;
      const bild = begrenzen(ein.bild, Math.min(p.seite, verlaufSeite));
      const zeit = kontext.zeitRouten?.length > 0;
      for (let k = 0; k < n; k++) {
        kontext.abbrechen?.throwIfAborted?.();
        const u = k / (n - 1);
        const q = zeit ? moduliere(op, p, kontext.zeitRouten, u) : p;
        const s = p.flackern ? (seed + (n - 1 - k)) >>> 0 : seed;
        const anteil = zeit ? q.anteil : q.anteil * glatt(u);
        const r = anteil > 0 ? rechne({ ...ein, bild }, q, { seed: s, k }).bild : bild;
        kontext.melden?.(`Bild ${k + 1} von ${n}`, (k + 1) / n);
        yield { k, bild: mischeAnteil(bild, r, anteil) };
        if (k % 4 === 3) await new Promise((fertig) => setTimeout(fertig, 0));   // die Seite bleibt bedienbar (Telefon)
      }
    },
  };
  return op;
}
