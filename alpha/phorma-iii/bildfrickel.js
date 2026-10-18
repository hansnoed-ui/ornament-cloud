// PHORMA III – Video-Gefrickel (Etappe 4 des Video-Ablaufs, seit 18. Oktober 2026; Wunsch: «Video-Gefrickel … am liebsten den heissesten Scheiss»):
// im Gefrickel zerlegt sich das Bild nach dem, was der Ton gerade spielt (stimme.js: karte.frickel, aus dem Plan von frickeln.js). Hier nur der Plan
// je Filmzeit (ohne Grafik, für die Tests); gezeichnet wird in video.js.
//   Scheibe   das Bild der Scheibe (der Fahrplan); auf einem vollen Schlag (laut 1) blitzt es kurz, an manchen teilt es sich in vier Streifen wie
//             ein Step-Sequencer – jeder Streifen zeigt eine der drei Scheiben davor, weiterlaufend; an einem harten Schnitt (über 0,1 s in der
//             Quelle) bei manchen ein kurzer Datamosh (das Bild davor, von der Bewegung der neuen Scheibe geschoben)
//   Wirbel    das Bild in Kacheln, so viele wie die Wiederholungen (2, 4, 8), jede blitzt auf
//   Bitcrush  verpixelt, je gröber, desto grösser die Pixel
//   Körner    Granular-Video: jedes Korn ein Fleck aus einer anderen Zeit, so lange es klingt
/** so lange dauert der Datamosh an einem Schnitt */
export const SCHNITT_MOSH = 0.14;

const hash = (n) => { let x = Math.imul(n ^ 0x9e3779b9, 0x85ebca6b) >>> 0; x = Math.imul(x ^ (x >>> 13), 0xc2b2ae35) >>> 0; return ((x ^ (x >>> 16)) >>> 0) / 4294967296; };
/** die Stelle einer Scheibe (Sekunden der Quelle, wie der Fahrplan) zur Zeit t */
const stelle = (e, t) => e.q + Math.max(0, t - e.t) * e.tempo;
/** wo eine Scheibe endet (in der Quelle) */
const endeVon = (e) => e.q + e.dauer * e.tempo;

/** die Kacheln eines Wirbels: teil Wiederholungen → [Spalten, Zeilen] (hochkant mehr Zeilen) */
export function kacheln(teil, hoch) {
  if (teil <= 1) return [1, 1];
  if (teil === 2) return hoch ? [1, 2] : [2, 1];
  if (teil <= 4) return [2, 2];
  return hoch ? [2, 4] : [4, 2];
}
/** die Grösse der Pixel beim Bitcrush (Anteil der Breite): 3 → 1/64, 5 → 1/40, 9 → 1/22 */
export const pixel = (crush) => (crush ? 1 / ({ 3: 64, 5: 40, 9: 22 }[crush] ?? Math.max(12, 120 / crush)) : 0);

/**
 * Das Bild des Gefrickels zur Filmzeit t (E: karte.frickel, nach t sortiert; hoch: das Format steht hochkant). Vor dem Gefrickel null, sonst
 * { art, kacheln: [nx, ny], pixel, blitz, mosh: { von, bis, i } | null, flecken: [{ q, rect: [x0, y0, x1, y1] }] } – rect im Bild (0..1, y nach
 * unten), q die Stelle der Quelle (wie der Fahrplan, ohne den Anfang des Ausschnitts).
 */
export function frickelBild(E, t, { hoch = true } = {}) {
  if (!E?.length || t < E[0].t) return null;
  const haupt = [], koerner = [];
  for (let i = 0; i < E.length && E[i].t <= t; i++) (E[i].art === "korn" ? koerner : haupt).push(i);
  const flecken = [];
  // die Körner, die gerade klingen: je ein Fleck an einem festen Ort (aus seiner Nummer), etwa quadratisch
  for (const i of koerner) {
    const g = E[i];
    if (t >= g.t + g.dauer) continue;
    const w = 0.12 + 0.2 * hash(i * 4 + 1), h = Math.min(0.9, w * (hoch ? 0.8 : 1.778) * (0.6 + 0.8 * hash(i * 4 + 2)));
    const x0 = hash(i * 4 + 3) * (1 - w), y0 = hash(i * 4 + 4) * (1 - h);
    flecken.push({ q: stelle(g, t), rect: [x0, y0, x0 + w, y0 + h] });
  }
  if (!haupt.length) return { art: "korn", kacheln: [1, 1], pixel: 0, blitz: 1, mosh: null, flecken };
  const j = haupt.length - 1, e = E[haupt[j]], dt = t - e.t;
  const bild = { art: e.art, kacheln: [1, 1], pixel: pixel(e.crush), blitz: 1, mosh: null, flecken };
  if (e.art === "wirbel") {
    bild.kacheln = kacheln(e.teil, hoch);
    bild.blitz = 1 + 0.6 * Math.exp(-dt / 0.05);
  } else {
    if (e.gain >= 1) bild.blitz = 1 + 0.25 * Math.exp(-dt / 0.06);
    const vorher = j > 0 ? E[haupt[j - 1]] : null;
    // der harte Schnitt: das Bild davor bleibt und wird geschoben (bei gut der Hälfte, je nach Scheibe)
    if (vorher && Math.abs(e.q - endeVon(vorher)) > 0.1 && dt < SCHNITT_MOSH && hash(haupt[j] * 7 + 5) < 0.55) bild.mosh = { von: e.t, bis: e.t + SCHNITT_MOSH, i: 1000 + haupt[j] };
    // der Step-Sequencer: auf manchen vollen Schlägen vier Streifen, links die älteste der drei Scheiben davor, rechts die jetzige
    else if (e.gain >= 1 && j >= 3 && hash(haupt[j] * 7 + 3) < 0.5) {
      bild.art = "raster";
      flecken.unshift(...[0, 1, 2].map((m) => ({ q: stelle(E[haupt[j - 3 + m]], E[haupt[j - 3 + m]].t + dt), rect: [m / 4, 0, (m + 1) / 4, 1] })));   // unter den Körnern
    }
  }
  return bild;
}

/** Welche Stellen der Quelle das Gefrickel zur Zeit t zusätzlich braucht (die Flecken; der Datamosh: { von, bis }) – für das Vorbereiten */
export function frickelBedarf(E, t, opt) {
  const b = frickelBild(E, t, opt);
  return b ? { quellen: b.flecken.map((f) => f.q), mosh: b.mosh } : { quellen: [], mosh: null };
}
