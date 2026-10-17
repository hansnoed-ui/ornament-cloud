// «Bildfragmentieren» – Ablauf des Films (ohne DOM). 30 Bilder pro Sekunde, ohne Ton; Hochformat 4 : 5 (Standard, Feed), wahlweise 9 : 16 (Reels, Stories).
// Drei Abläufe zur Wahl (seit 16. Oktober 2026; Wunsch: «neben dem jetzigen Ablauf einen weiteren mit den neuen Effekten, oder zwei weitere …
// Es soll nicht beim Foto starten, nur damit enden»). Alle beginnen im Dunkeln und enden beim Foto:
//   Fragmente – 01 Linien (Relief aus Zeilen, Umrisse) → 02 Formen (Dreiecke mit Stich) → 03 Farben (Körper) → 04 Bild (Montage, das Foto rastet ein)
//   Kristall  – 01 Körper (drei Kristalle verschmelzen zu einem Glaskörper; das Foto nur durch das Glas) → 02 Bruch (er zerspringt in Scherben)
//               → 03 Montage (die Scherben setzen das Foto zusammen)                                                     [WebGL, raum.js]
//   Echo      – 01 Echo (die Kanten des Fotos ziehen Spuren in einen Tunnel, von Anfang an bewegt) → 02 Bild (das Foto baut sich Tonstufe um Tonstufe auf)
//   Strom     – 01 Funken (Teilchen leuchten verstreut im Dunkeln auf) → 02 Strom (sie ziehen zu Bändern zusammen) → 03 Bild (sie fliegen an ihren Platz)
//   Relief    – 01 Höhenlinien (leuchten im Dunkeln auf) → 02 Gebirge (Streiflicht, Kamerafahrt) → 03 Bild (es wird flach und steht als Foto)
// Danach steht das Foto, dann (wenn gewählt) das Signet von ornament.cloud – bei Kristall und Echo in einer leuchtenden Fassung.
export { FPS, anteil, weich, sanft, inOut, ausblenden, bezier, klemm } from "../sketchory/ablauf.js?v=9";

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

/** die Abläufe und ihre Phasen (Name, Titel, Dauer bei Tempo «normal»); Kristall und Echo rechnet raum.js (WebGL) */
export const ABLAEUFE = {
  fragmente: { titel: "Fragmente", phasen: [["linien", "Linien", 4.4], ["formen", "Formen", 3.6], ["farben", "Farben", 3.0], ["zusammen", "Bild", 4.2]] },
  kristall: { titel: "Kristall", raum: true, phasen: [["koerper", "Körper", 3.6], ["bruch", "Bruch", 3.2], ["montage", "Montage", 4.2]] },
  // Echo: Konturen kurz (Rückmeldung: «die Konturen alleine weniger»), ohne Kaleidoskop («dieser Teil geht gar nicht – gerne ersatzlos streichen»)
  echo: { titel: "Echo", raum: true, phasen: [["echo", "Echo", 6.0], ["aufbau", "Bild", 3.4]] },   // ohne stehende Konturen: Bewegung vom ersten Bild an
  // Strom: Teilchen als glänzende Kugeln (Rückmeldung: «sind das wirklich bloss drei Effekte? Wo ist dieser, verbessert?»)
  strom: { titel: "Strom", raum: true, phasen: [["funken", "Funken", 2.4], ["strom", "Strom", 5.6], ["sammeln", "Bild", 4.0]] },
  // Relief: das Gebirge aus dem Showreel (Rückmeldung: «es war mit Abstand der Beste»)
  relief: { titel: "Relief", raum: true, phasen: [["hoehenlinien", "Höhenlinien", 2.6], ["gebirge", "Gebirge", 5.0], ["flach", "Bild", 3.4]] },
};
/** ein bekannter Ablauf, sonst «Fragmente» */
export const ablaufName = (a) => (Object.hasOwn(ABLAEUFE, String(a)) ? String(a) : "fragmente");
/** Dauer eines räumlichen Ablaufs bei Tempo «normal» (raum.js rechnet in diesen Sekunden) */
export const raumDauer = (a) => ABLAEUFE[a].phasen.reduce((s, p) => s + p[2], 0);

/**
 * Zeitachse in Sekunden: { ab: { name: [anfang, ende] }, ablauf, abschnitt: { art, von, bis }, phasen: [{ name, titel, von, bis }], fragmente, dauer, bilder }.
 * Ohne «Fragmente» liegen dessen Phasen weit vor dem Film (ab −100 s): so bleiben die Zeichnungen von «Fragmente» aus, und szene.js zeichnet nach dem
 * Ablauf das Foto ohne eigenen Zweig.
 */
export function zeitachse({ tempo = "normal", signet = true, ablauf = "fragmente" } = {}) {
  const f = TEMPO[tempo] ?? (typeof tempo === "number" ? tempo : 1);
  const art = ablaufName(ablauf), teile = [], phasen = [];
  let t = 0;
  const dazu = (name, d) => { teile.push([name, t, t + d]); t += d; };
  const folge = (a, merken) => { for (const [name, titel, d] of ABLAEUFE[a].phasen) { if (merken) phasen.push({ name, titel, von: t, bis: t + d * f }); dazu(name, d * f); } };
  dazu("vor", 0.4);
  const von = t;
  folge(art, true);
  const abschnitt = { art, von, bis: t };
  dazu("stehen", 3.2);
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
  if (art !== "fragmente") {                               // Phasen von «Fragmente» ausserhalb des Films, s. o.
    const ende = t, n = teile.length; t = -100; folge("fragmente", false);
    for (const [name, a, b] of teile.slice(n)) ab[name] = [a, b];
    t = ende;
  }
  return { ab, ablauf: art, abschnitt, phasen, fragmente: art === "fragmente", dauer: t, bilder: Math.round(t * 30), tempo: f };
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
