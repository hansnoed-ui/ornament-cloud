// «Bildfragmentieren» – Ablauf des Films (ohne DOM). 30 Bilder pro Sekunde, ohne Ton; Hochformat 4 : 5 (Standard, Feed), wahlweise 9 : 16 (Reels, Stories).
// Der Film ist eine Kette von Workflows (seit 16. Oktober 2026 wählbar und kombinierbar); jeder endet beim Foto, darum lassen sie sich hintereinanderhängen:
//   Fragmente – 01 Linien (Relief aus Zeilen, Umrisse) → 02 Formen (Dreiecke mit Stich) → 03 Farben (Körper) → 04 Bild (Montage, das Foto rastet ein)
//   Glas – ein Glaskörper (Dodekaeder → Geode → Ikosaeder) bricht das Foto · Splitter – das Foto als Scherben in die Tiefe und zurück
//   Relief – die Helligkeit wird zum Gebirge im Streiflicht, mit Höhenlinien
// Zwischen zwei Workflows steht das Foto kurz; am Schluss steht es länger, dann (wenn gewählt) das Signet von ornament.cloud wie in Sketchory.
export { FPS, anteil, weich, sanft, inOut, ausblenden, bezier, klemm } from "../sketchory/ablauf.js?v=8";

/** Bildmass des Films: Hochformat 4 : 5 (Standard, 1080 × 1350) oder "9:16" (1080 × 1920); Wunsch vom 15. Oktober 2026 */
export const FORMATE = ["4:5", "9:16"];
export function filmMass(format = "4:5") {
  return format === "9:16" ? [1080, 1920] : [1080, 1350];
}

/** Das Signet kürzer als in Sketchory (Wunsch vom 15. Oktober 2026: «kann einiges kürzer sein»): die Zeichnung von ornament.cloud ohne den leeren
 *  Anfang (Bild 12 statt 0) bis zum fertigen Schriftzug (Bild 150), doppelt so schnell: 2,3 statt 6 s */
export const SIGNET_VON = 12, SIGNET_BIS = 150, SIGNET_TEMPO = 2;
export const SIGNET = (SIGNET_BIS - SIGNET_VON) / 30 / SIGNET_TEMPO;

/** Tempo: Faktor auf die Dauer der vier Phasen */
export const TEMPO = { ruhig: 1.3, normal: 1, schnell: 0.75 };

/** die vier Phasen von «Fragmente» und ihre Namen in der Beschriftung */
export const PHASEN = [["linien", "Linien"], ["formen", "Formen"], ["farben", "Farben"], ["zusammen", "Bild"]];

/** die Workflows: «Fragmente» (Canvas 2D) und drei räumliche (WebGL, raum.js); Dauer der räumlichen bei Tempo «normal» */
export const WORKFLOWS = [["fragmente", "Fragmente"], ["glas", "Glas"], ["splitter", "Splitter"], ["relief", "Relief"]];
export const RAUM = { glas: 8.4, splitter: 8.6, relief: 9 };
/** gültige Kette: bekannte Namen, keiner doppelt, mindestens einer */
export function kette(ablauf) {
  const k = [...new Set((Array.isArray(ablauf) ? ablauf : String(ablauf ?? "").split(",")).map((a) => String(a).trim()))].filter((a) => WORKFLOWS.some(([n]) => n === a));
  return k.length ? k : ["fragmente"];
}

/**
 * Zeitachse in Sekunden: { ab: { name: [anfang, ende] }, abschnitte: [{ art, von, bis }], phasen: [{ name, titel, von, bis }], fragmente, dauer, bilder }.
 * ablauf: die Kette der Workflows (Standard nur «Fragmente», wie bis zum 16. Oktober 2026). Ohne «Fragmente» liegen dessen Phasen weit vor dem Film
 * (ab −100 s): so zeichnet szene.js von Anfang an das Foto, ohne eigenen Zweig.
 */
export function zeitachse({ tempo = "normal", signet = true, ablauf = ["fragmente"] } = {}) {
  const f = TEMPO[tempo] ?? (typeof tempo === "number" ? tempo : 1);
  const liste = kette(ablauf), teile = [], abschnitte = [], phasen = [];
  let t = 0;
  const dazu = (name, d) => { teile.push([name, t, t + d]); t += d; };
  const fragmente = (titel) => {
    dazu("linien", 4.4 * f);
    dazu("formen", 3.6 * f);
    dazu("farben", 3.0 * f);
    dazu("zusammen", 4.2 * f);   // seit dem 15. Oktober 2026 1 s länger: dazu die Geometrie über dem ganzen Bild
    if (titel) for (const [name, t2] of PHASEN) { const [, a, b] = teile.find(([n]) => n === name); phasen.push({ name, titel: t2, von: a, bis: b }); }
  };
  dazu("vor", 0.4);
  liste.forEach((art, i) => {
    // vor einem räumlichen Workflow steht das Foto (am Anfang blendet es auf; nach «Fragmente» rastet es noch ein: 1,4 s)
    if (art !== "fragmente") dazu(`halt${i}`, i === 0 ? 0.9 : liste[i - 1] === "fragmente" ? 1.4 : 0.6);
    else if (i > 0) dazu(`halt${i}`, 0.6);
    const von = t;
    if (art === "fragmente") fragmente(true);
    else { dazu(art, RAUM[art] * f); phasen.push({ name: art, titel: WORKFLOWS.find(([n]) => n === art)[1], von, bis: t }); }
    abschnitte.push({ art, von, bis: t });
  });
  dazu("stehen", liste.at(-1) === "fragmente" ? 3.2 : 2.6);
  if (signet) {
    // der ganze Abspann seit dem 15. Oktober 2026 4,75 statt 10 s
    dazu("bildAus", 0.9);
    dazu("pause", 0.15);
    dazu("signet", SIGNET);
    dazu("signetStehen", 0.6);
    dazu("signetAus", 0.6);
    dazu("schluss", 0.2);
  } else dazu("schluss", 0.3);   // ohne Abspann endet der Film auf dem Foto
  const ab = Object.fromEntries(teile.map(([name, a, b]) => [name, [a, b]]));
  if (!liste.includes("fragmente")) {                      // Phasen von «Fragmente» ausserhalb des Films, s. o.
    const ende = t; t = -100; fragmente(false);
    for (const [name, a, b] of teile.slice(-4)) ab[name] = [a, b];
    t = ende;
  }
  return { ab, abschnitte, phasen, ablauf: liste, fragmente: liste.includes("fragmente"), dauer: t, bilder: Math.round(t * 30), tempo: f };
}

/** Zeitcode für die Beschriftung: Minuten:Sekunden:Bilder */
export function zeitcode(t, fps = 30) {
  const b = Math.max(0, Math.floor(t * fps + 1e-6)), z = (n) => String(n).padStart(2, "0");
  return `${z(Math.floor(b / fps / 60))}:${z(Math.floor(b / fps) % 60)}:${z(b % fps)}`;
}

export function dateiname(zeit, endung) {
  const z = (n) => String(n).padStart(2, "0");
  return `bildfragmentieren-${zeit.getFullYear()}-${z(zeit.getMonth() + 1)}-${z(zeit.getDate())}-${z(zeit.getHours())}${z(zeit.getMinutes())}.${endung}`;
}
