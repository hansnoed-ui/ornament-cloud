// «Bildfragmentieren» – Ablauf des Films (ohne DOM). 30 Bilder pro Sekunde, ohne Ton; Hochformat 4 : 5 (Standard, Feed), wahlweise 9 : 16 (Reels, Stories).
// Zwei Gesamtabläufe (Wunsch vom 17. Oktober 2026: «einen zweiten Gesamtablauf neben dem Bildfragmentieren mit einer genialen Orchestrierung der neuen
// Effekte, plus die Möglichkeit, alle einzeln nutzen zu können»; «Bildfragmentieren soll in dieser Zusammenstellung bleiben»). Alle beginnen im Dunkeln
// und enden beim Foto:
//   Fragmente   – 01 Linien (Relief aus Zeilen, Umrisse) → 02 Formen (Dreiecke mit Stich) → 03 Farben (Körper) → 04 Bild (Montage, das Foto rastet ein)
//   Verwandlung – Strom → Körper → Scherben → Echo → Relief, jeder Effekt einzeln oder beliebig kombiniert (in dieser Reihenfolge)   [WebGL, raum.js]
//     Strom    – 01 Funken (Teilchen leuchten verstreut im Dunkeln auf) → 02 Strom (sie ziehen in feinen Fäden und Wirbeln) → 03 Bild (an ihren Platz)
//                vor einem weiteren Effekt statt 03: Verdichten (sie ballen sich zu einer leuchtenden Kugel)
//     Körper   – 01 Körper (drei Kristalle verschmelzen zu einem Glaskörper; nach Strom wächst er aus der Kugel) → 02 Bild (das Glas wird klar)
//     Scherben – 01 Bruch (ein Ball aus Scherben zerspringt; nach dem Körper: er selbst) → 02 Montage (die Scherben setzen das Foto zusammen)
//                (Körper und Scherben waren bis zum 17. Oktober 2026 ein Effekt «Kristall»; Wunsch: «diese einzeln anwählbar»)
//     Echo     – 01 Echo (die Kanten des Fotos ziehen Spuren in einen Tunnel; nach einem anderen Effekt zieht zuerst dessen Bild Spuren)
//                → 02 Bild (das Foto strömt durch den Tunnel herein und kommt zur Ruhe)
//     Relief   – 01 Höhenlinien (leuchten im Dunkeln auf) → 02 Gebirge (Streiflicht, Kamerafahrt) → 03 Bild (es wird flach und steht als Foto)
//   Nur der letzte Effekt endet beim Foto; die anderen gehen in den nächsten über (Kette, s. kette()).
// Danach steht das Foto, dann (wenn gewählt) das Signet von ornament.cloud – bei der Verwandlung in einer leuchtenden Fassung.
export { FPS, anteil, weich, sanft, inOut, ausblenden, bezier, klemm } from "../sketchory/ablauf.js?v=10";

/** Bildmass des Films: Hochformat 4 : 5 (Standard, 1080 × 1350) oder "9:16" (1080 × 1920); Wunsch vom 15. Oktober 2026 */
export const FORMATE = ["4:5", "9:16"];
export function filmMass(format = "4:5") {
  return format === "9:16" ? [1080, 1920] : [1080, 1350];
}

/** Das Signet kürzer als in Sketchory (Wunsch vom 15. Oktober 2026: «kann einiges kürzer sein»): die Zeichnung von ornament.cloud ohne den leeren
 *  Anfang (Bild 12 statt 0) bis zum fertigen Schriftzug (Bild 150), doppelt so schnell: 2,3 statt 6 s */
export const SIGNET_VON = 12, SIGNET_BIS = 150, SIGNET_TEMPO = 2;
export const SIGNET = (SIGNET_BIS - SIGNET_VON) / 30 / SIGNET_TEMPO;

/** Tempo: Faktor auf die Dauer der Phasen */
export const TEMPO = { ruhig: 1.3, normal: 1, schnell: 0.75 };

/** die vier Phasen von «Fragmente» und ihre Namen in der Beschriftung */
export const PHASEN = [["linien", "Linien"], ["formen", "Formen"], ["farben", "Farben"], ["zusammen", "Bild"]];

/** «Fragmente» und die Effekte der Verwandlung mit ihren Phasen (Name, Titel, Dauer bei Tempo «normal»; raum.js rechnet in diesen Sekunden).
 *  start – wo der Effekt beginnt, wenn er der erste ist; in einer Kette: ein – wo er nach einem anderen einsetzt, aus – wo er vor einem weiteren endet, weiter – die Phase, mit der er dann
 *  in den nächsten übergeht (Name, Titel, Beginn), ueber – wie lange er mit dem vorigen überblendet */
export const ABLAEUFE = {
  fragmente: { titel: "Fragmente", phasen: [["linien", "Linien", 4.4], ["formen", "Formen", 3.6], ["farben", "Farben", 3.0], ["zusammen", "Bild", 4.2]] },
  // Strom: Teilchen als glänzende Kugeln; seit 17. Oktober 2026 kürzer (Rückmeldung: «Strom ist ok, zu lang»: 12 statt 8,4 s)
  strom: { titel: "Strom", phasen: [["funken", "Funken", 1.6], ["strom", "Strom", 3.6], ["sammeln", "Bild", 3.2]], aus: 6.4, weiter: ["verdichten", "Verdichten", 4.4] },
  // Körper und Scherben: die beiden Hälften des früheren «Kristall»; die Scherben setzen genau im Bruch des Körpers ein (ihre Zeit 0,7 s)
  koerper: { titel: "Körper", phasen: [["koerper", "Körper", 4.3], ["klar", "Bild", 2.5]], ein: 1.7, aus: 4.3 },
  scherben: { titel: "Scherben", phasen: [["bruch", "Bruch", 3.2], ["montage", "Montage", 4.2]], ein: 0.4, aus: 3.0, ueber: 0.3 },
  // Echo: ohne Kaleidoskop und ohne stehende Konturen; das Schlussbild strömt durch den Tunnel herein (Rückmeldung: «die Zusammensetzung des
  // Schlussbildes wenig nachvollziehbar»)
  // allein oder zuerst beginnt Echo bei 1,5 s, mitten in der Bewegung (Wunsch: «die ersten 1–2 Sekunden überspringen: einblenden und schon mitten in
  // der Bewegung beginnen»); die Rückkopplung läuft vorher schon (Vorlauf in raum.js)
  echo: { titel: "Echo", phasen: [["echo", "Echo", 6.0], ["aufbau", "Bild", 3.4]], start: 1.5, aus: 5.0, ueber: 1.2 },
  // Relief: das Gebirge aus dem Showreel (Rückmeldung: «es war mit Abstand der Beste»)
  relief: { titel: "Relief", phasen: [["hoehenlinien", "Höhenlinien", 2.6], ["gebirge", "Gebirge", 5.0], ["flach", "Bild", 3.4]], ein: 1.0 },
};
/** die Effekte der Verwandlung in ihrer festen Reihenfolge: Energie → Materie → Echo → Landschaft → Bild */
export const EFFEKTE = ["strom", "koerper", "scherben", "echo", "relief"];
export const VERWANDLUNG = EFFEKTE.join("+");
const UEBER = 0.8;
/** «fragmente» oder die gewählten Effekte in fester Reihenfolge, mit «+» verbunden (z. B. "strom+echo"); Unbekanntes ergibt «Fragmente»;
 *  das frühere «kristall» wird zu Körper und Scherben */
export function ablaufName(a) {
  const teile = String(a ?? "").split("+").flatMap((e) => (e === "kristall" ? ["koerper", "scherben"] : [e]));
  const effekte = EFFEKTE.filter((e) => teile.includes(e));
  return effekte.length ? effekte.join("+") : "fragmente";
}
/** die Effekte eines Ablaufs (bei «Fragmente» keine) */
export const effekte = (a) => (ablaufName(a) === "fragmente" ? [] : ablaufName(a).split("+"));

/**
 * Die Kette der Effekte in Sekunden bei Tempo «normal»: { teile: [{ art, von, bis, ein, aus, erst, letzt }], phasen: [{ name, titel, von, bis }], dauer }.
 * Ein Teil läuft im Film von «von» bis «bis» und zeigt dabei seine eigene Zeit «ein» bis «aus»; der nächste setzt «ueber» Sekunden vor dem Ende ein.
 */
export function kette(a) {
  const liste = effekte(a), teile = [], phasen = [];
  let t = 0;
  liste.forEach((art, i) => {
    const E = ABLAEUFE[art], erst = i === 0, letzt = i === liste.length - 1;
    const ende = E.phasen.reduce((s, p) => s + p[2], 0);
    const ein = (erst ? E.start : E.ein) ?? 0, aus = letzt ? ende : E.aus ?? ende;
    const von = erst ? 0 : t - (E.ueber ?? UEBER), bis = von + aus - ein;
    teile.push({ art, von, bis, ein, aus, erst, letzt });
    if (phasen.length) phasen[phasen.length - 1].bis = von;                // die Beschriftung wechselt, sobald der nächste einsetzt
    const grenze = !letzt && E.weiter ? E.weiter[2] : aus;
    let p0 = 0;
    for (const [name, titel, d] of E.phasen) {
      const a0 = Math.max(p0, ein), a1 = Math.min(p0 + d, grenze);
      p0 += d;
      if (a1 - a0 >= 0.05) phasen.push({ name, titel, von: von + a0 - ein, bis: von + a1 - ein });
    }
    if (grenze < aus) phasen.push({ name: E.weiter[0], titel: E.weiter[1], von: von + grenze - ein, bis: von + aus - ein });
    t = bis;
  });
  return { teile, phasen, dauer: t };
}
/** Dauer eines räumlichen Ablaufs bei Tempo «normal» */
export const raumDauer = (a) => kette(a).dauer;

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
  if (art === "fragmente") folge(art, true);
  else {
    const K = kette(art);
    for (const p of K.phasen) { phasen.push({ name: p.name, titel: p.titel, von: von + p.von * f, bis: von + p.bis * f }); teile.push([p.name, von + p.von * f, von + p.bis * f]); }
    t = von + K.dauer * f;
  }
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
