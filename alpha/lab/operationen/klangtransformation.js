// ORNAMENT LAB – Klangtransformationen (AUDIO → AUDIO, docs/KLANGTRANSFORMATION.md): eigene Beats und Klänge schneller oder langsamer machen,
// zerlegen, neu rhythmisieren und in Körner auflösen. Vier Operationen nach Prinzipien der Referenzprogramme aus §5 des Masterprompts:
//   Tempo und Tonhöhe  – Tonband/Sampler (Re-Pitch: beides zusammen), Schnitte an den Einsätzen (wie REX-Dateien in Reason und der Modus
//                        «Beats» in Ableton Live: jeder Schlag bleibt, nur die Abstände ändern sich), WSOLA (Tempo ohne Tonhöhe und umgekehrt)
//   Dekonstruktion     – Schnitte umordnen, wiederholen (Stottern), umkehren, auslassen; Zufall mit Startwert oder die Konstellation liest
//   Neu-Rhythmisierung – die Schnitte auf ein neues Raster setzen: euklidisch, Zufall, die eigenen Einsätze, eine Ereignisfolge (der Rhythmus
//                        eines anderen Beats), ein Steuersignal (ein Bild gibt den Rhythmus) oder der Text einer Konstellation
//   Körner             – Granularsynthese wie Warp1 und GrainBuf in SuperCollider: Lesekopf, Korngrösse, Überlappung, Streuung
// Jede Operation gibt einen Klang aus, der wieder Ausgang sein kann (Rekursion), und alle Zahlen sind modulierbar: sechs Tempi, sechs
// Zerlegungen, sechs Raster stehen nebeneinander zum Anhören. Gerechnet wird in kern/klangwerk.js, in der Abtastrate und den Kanälen der Quelle.
import { zufall } from "../../../alpha/the-fictory/analyse.js?v=23";
import * as W from "../kern/klangwerk.js";

const DATEI = "alpha/lab/operationen/klangtransformation.js, alpha/lab/kern/klangwerk.js";
const z = (x, s = 100) => String(W.rund(x, s)).replace(".", ",");
const PEGEL = { id: "pegel", name: "Pegel", art: "wahl", standard: "quelle", optionen: [{ wert: "quelle", name: "wie die Quelle (nur gegen Übersteuerung)" }, { wert: "normal", name: "auf −1 dBFS bringen" }] };
const EMPFINDLICHKEIT = { id: "empfindlichkeit", name: "Empfindlichkeit für Einsätze", art: "zahl", min: 0, max: 1, standard: 0.5, schritt: 0.05 };
const lies = (werte, u) => { const p = Math.min(1, Math.max(0, u)) * (werte.length - 1), a = Math.floor(p), b = Math.min(werte.length - 1, a + 1); return werte[a] + (werte[b] - werte[a]) * (p - a); };
const angaben = (spuren, rate) => ({ abtastrate: rate, kanaele: spuren.length, eingangSekunden: W.rund(spuren[0].length / rate) });

/** Tempo der Quelle: angegeben, sonst geschätzt (mit Hinweis im Protokoll) */
function quellTempo(spuren, rate, angegeben) {
  if (angegeben > 0) return { bpm: angegeben, art: "angegeben" };
  const t = W.tempoSchaetzen(W.mono(spuren), rate);
  return { bpm: t.bpm, art: "geschätzt", sicherheit: t.sicherheit, hinweis: "Schätzung aus der Autokorrelation der Einsätze; bei Halb- oder Doppeltempo das Tempo angeben" };
}

/** Schnittgrenzen nach Wahl: gefundene Einsätze, ein Raster im Tempo oder die Zeitpunkte einer Ereignisfolge */
function schnitteBilden(spuren, rate, { art, empfindlichkeit, bpm, teilung, folge }) {
  if (art === "ereignisfolge") {
    if (!folge?.ereignisse?.length) throw new Error("Dekonstruktion: Schneiden an den Zeitpunkten einer Ereignisfolge braucht eine Ereignisfolge als Eingang (Einsätze aus «Tonsignal» oder eine Partitur)");
    return W.schnitteAus(folge.ereignisse.map((e) => ((folge.beginn ?? 0) + e.t) * rate), spuren, rate);
  }
  if (art === "raster") return W.schnitteAus(W.rasterGrenzen(spuren[0].length, rate, bpm, teilung), spuren, rate);
  return W.schnitteAus(W.einsaetzeFinden(W.mono(spuren), rate, { empfindlichkeit }).map((e) => e.i), spuren, rate);
}

// ---------------------------------------------------------------------------------------------------------------------------------
export const tempo = {
  id: "lab.tempo",
  name: "Tempo und Tonhöhe",
  version: "0.1.0",
  klasse: "zeitlich",
  herkunft: { art: "neu", quelle: "ORNAMENT LAB", referenz: "Tonband und Sampler (Re-Pitch), REX-Schnitte in Reason und Modus «Beats» in Ableton Live, WSOLA", datei: DATEI },
  beschreibung: "Macht einen Klang schneller oder langsamer: wie ein Tonband (die Tonhöhe geht mit), in Schnitten an den Einsätzen (jeder Schlag bleibt, das Raster rückt zusammen) oder gedehnt ohne Änderung der Tonhöhe. Tonhöhe auch ohne Tempo.",
  eingaenge: [{ name: "ton", typ: "AUDIO" }],
  ausgaenge: [{ name: "klang", typ: "AUDIO" }],
  parameter: [
    { id: "verfahren", name: "Verfahren", art: "wahl", standard: "dehnung", optionen: [
      { wert: "dehnung", name: "dehnen: Tempo ohne Tonhöhe (WSOLA)" },
      { wert: "schnitte", name: "Schnitte: jeder Schlag bleibt, das Raster rückt (Beats)" },
      { wert: "band", name: "Tonband: Tempo und Tonhöhe zusammen (Re-Pitch)" }] },
    { id: "tempo", name: "Tempo (Faktor, 2 = doppelt so schnell)", art: "zahl", min: 0.25, max: 4, standard: 1, schritt: 0.01 },
    { id: "zielBpm", name: "Ziel-Tempo (BPM, 0 = der Faktor gilt)", art: "zahl", min: 0, max: 300, standard: 0, schritt: 0.5 },
    { id: "quellBpm", name: "Tempo der Quelle (BPM, 0 = schätzen)", art: "zahl", min: 0, max: 300, standard: 0, schritt: 0.5 },
    { id: "halbtoene", name: "Tonhöhe (Halbtöne; beim Tonband folgt sie dem Tempo)", art: "zahl", min: -24, max: 24, standard: 0, schritt: 0.1 },
    { id: "fenster", name: "Fenster beim Dehnen (ms; kurz für Schläge, lang für Flächen)", art: "zahl", min: 10, max: 200, standard: 50, schritt: 1 },
    EMPFINDLICHKEIT,
    PEGEL,
  ],
  voraussetzungen: ["keine (reines JavaScript)"],
  ressourcen: { zeit: "Tonband: 32 bis 128 Rechenschritte je Abtastwert und Kanal; Dehnen: eine Suche je Fenster; Schnitte: eine Messung (FFT 1024 alle 6 ms)", speicher: "der Klang zwei- bis dreimal als Gleitkommazahlen" },
  reproduzierbar: "ja",
  varianten: "moduliert",
  moduliert: "tempo",   // was die Oberfläche zuerst über die Varianten verteilt

  async ausfuehren({ ton }, p, kontext = {}) {
    const spuren = W.spurenVon(ton), rate = ton.rate, n = spuren[0].length;
    const quelle = p.zielBpm > 0 ? quellTempo(spuren, rate, p.quellBpm) : null;
    const faktor = Math.min(4, Math.max(0.25, quelle ? p.zielBpm / quelle.bpm : p.tempo));
    const hoehe = p.verfahren === "band" ? faktor : W.halbton(p.halbtoene);
    const laenge = Math.round(n / faktor);
    kontext.melden?.(`Tempo und Tonhöhe: ${p.verfahren === "band" ? "Tonband" : p.verfahren === "schnitte" ? "Schnitte" : "dehnen"} …`);
    await W.pause();
    let aus, schnitte = null;
    if (p.verfahren === "band") aus = spuren.map((s) => W.umtasten(s, faktor, laenge));
    else if (p.verfahren === "dehnung") {
      const gedehnt = W.dehnen(spuren, rate, hoehe / faktor, { fenster: p.fenster / 1000 });
      aus = Math.abs(hoehe - 1) < 1e-6 ? gedehnt : gedehnt.map((s) => W.umtasten(s, hoehe, laenge));
    } else {
      schnitte = schnitteBilden(spuren, rate, { art: "einsaetze", empfindlichkeit: p.empfindlichkeit });
      aus = spuren.map(() => new Float32Array(laenge));
      for (const [j, s] of schnitte.entries()) {
        const platz = Math.round((s.b - s.a) / faktor);
        W.einlegen(aus, W.abschnitt(spuren, rate, s.a, s.b, { tonhoehe: hoehe, laenge: platz }), Math.round(s.a / faktor));
        if (j % 64 === 63) { kontext.abbrechen?.throwIfAborted?.(); await W.pause(); }
      }
    }
    const verstaerkung = W.pegeln(aus, p.pegel);
    const ht = p.verfahren === "band" ? 12 * Math.log2(faktor) : p.halbtoene;
    const name = { band: "Tonband", schnitte: "Schnitte", dehnung: "gedehnt" }[p.verfahren];
    return {
      ausgaben: [{ typ: "AUDIO", titel: `Tempo ×${z(faktor)}${quelle ? ` (${z(p.zielBpm, 10)} BPM)` : ""}, ${name}${Math.abs(ht) > 0.05 ? `, ${ht > 0 ? "+" : ""}${z(ht, 10)} HT` : ""}`, ton: W.alsTon(aus, rate) }],
      protokoll: { verfahren: p.verfahren, faktor: W.rund(faktor, 1e4), halbtoene: W.rund(ht, 100), quelle, ...angaben(spuren, rate), ausgangSekunden: W.rund(laenge / rate),
        schnitte: schnitte?.length ?? null, verstaerkung: W.rund(verstaerkung, 1e4),
        hinweis: p.verfahren === "band" ? "Die Tonhöhe folgt dem Tempo wie bei einem Tonband: doppelt so schnell ist eine Oktave höher." : p.verfahren === "schnitte" ? "Jeder Schnitt behält seine Geschwindigkeit; beim Verlangsamen entstehen Pausen, beim Beschleunigen werden Schnitte gekürzt." : "Das Dehnen legt kurze Fenster neu aneinander; bei starken Faktoren werden Anschläge weicher." },
    };
  },
};

// ---------------------------------------------------------------------------------------------------------------------------------
const REIHENFOLGEN = [
  { wert: "zufall", name: "zufällig (Startwert)" }, { wert: "nachbarn", name: "unter Nachbarn vertauscht" }, { wert: "rueckwaerts", name: "rückwärts" },
  { wert: "palindrom", name: "vorwärts, dann rückwärts" }, { wert: "verschraenkt", name: "verschränkt (erst die geraden, dann die ungeraden)" },
  { wert: "konstellation", name: "nach dem Text der Konstellation" }, { wert: "behalten", name: "behalten" },
];
const STOTTERN = [{ wert: "1", name: "der ganze Schnitt" }, { wert: "0.5", name: "die erste Hälfte" }, { wert: "0.25", name: "das erste Viertel" }, { wert: "0.125", name: "das erste Achtel" }];

/** Reihenfolge der Schnitte 0 … n−1 nach der Wahl; mit Konstellation: stabil sortiert nach dem Anfangsbuchstaben des Wortes, das dem Schnitt zufällt */
function ordnen(n, art, rnd, konstellation) {
  const idx = Array.from({ length: n }, (_, i) => i);
  if (art === "rueckwaerts") return idx.reverse();
  if (art === "palindrom") return [...idx, ...idx.slice(0, -1).reverse()];
  if (art === "verschraenkt") return [...idx.filter((i) => i % 2 === 0), ...idx.filter((i) => i % 2)];
  if (art === "zufall") { for (let i = n - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [idx[i], idx[j]] = [idx[j], idx[i]]; } return idx; }
  if (art === "nachbarn") { for (let i = 0; i + 1 < n; i++) if (rnd() < 0.5) { const j = Math.min(n - 1, i + 1 + Math.floor(rnd() * 2)); [idx[i], idx[j]] = [idx[j], idx[i]]; } return idx; }
  if (art === "konstellation") {
    const text = konstellation?.text || konstellation?.frage || "";
    const woerter = text.split(/\s+/).map((w) => w.replace(/[^\p{L}]/gu, "").toLowerCase().normalize("NFD")[0]).filter(Boolean);
    if (!woerter.length) throw new Error("Dekonstruktion: die Reihenfolge «nach dem Text der Konstellation» braucht eine Konstellation mit Text als Eingang");
    return idx.map((i) => ({ i, k: woerter[i % woerter.length] })).sort((a, b) => a.k.localeCompare(b.k) || a.i - b.i).map((x) => x.i);
  }
  return idx;
}

export const zerlegen = {
  id: "lab.zerlegen",
  name: "Dekonstruktion",
  version: "0.1.0",
  klasse: "zeitlich",
  herkunft: { art: "neu", quelle: "ORNAMENT LAB", referenz: "Slicing (REX-Dateien in Reason, Simpler/Slice in Ableton Live), Stottern und Umkehren des Breakbeat-Schnitts", datei: DATEI },
  beschreibung: "Zerschneidet einen Klang an seinen Einsätzen, in einem Raster oder an den Zeitpunkten einer Ereignisfolge und setzt die Schnitte neu zusammen: umgeordnet, wiederholt, umgekehrt, ausgelassen.",
  eingaenge: [{ name: "ton", typ: "AUDIO" }, { name: "einsaetze", typ: "EVENT_SEQUENCE", optional: true, vorwaehlen: false }, { name: "konstellation", typ: "CONSTELLATION", optional: true, vorwaehlen: false }],
  ausgaenge: [{ name: "klang", typ: "AUDIO" }, { name: "ordnung", typ: "EVENT_SEQUENCE" }],
  parameter: [
    { id: "schnitt", name: "Schneiden", art: "wahl", standard: "einsaetze", optionen: [{ wert: "einsaetze", name: "an den Einsätzen" }, { wert: "raster", name: "im Raster des Tempos" }, { wert: "ereignisfolge", name: "an den Zeitpunkten der Ereignisfolge (Eingang)" }] },
    EMPFINDLICHKEIT,
    { id: "bpm", name: "Tempo für das Raster (BPM, 0 = schätzen)", art: "zahl", min: 0, max: 300, standard: 0, schritt: 0.5 },
    { id: "teilung", name: "Schnitte je Schlag (Raster)", art: "zahl", min: 1, max: 8, standard: 2, schritt: 1 },
    { id: "reihenfolge", name: "Reihenfolge", art: "wahl", standard: "zufall", optionen: REIHENFOLGEN },
    { id: "wiederholen", name: "Wiederholen (Wahrscheinlichkeit)", art: "zahl", min: 0, max: 1, standard: 0.2, schritt: 0.05 },
    { id: "wiederholungen", name: "höchstens so oft", art: "zahl", min: 1, max: 8, standard: 3, schritt: 1 },
    { id: "stottern", name: "wiederholt wird", art: "wahl", standard: "0.5", optionen: STOTTERN },
    { id: "umkehren", name: "Umkehren (Wahrscheinlichkeit)", art: "zahl", min: 0, max: 1, standard: 0.15, schritt: 0.05 },
    { id: "auslassen", name: "Auslassen: Stille statt Schnitt (Wahrscheinlichkeit)", art: "zahl", min: 0, max: 1, standard: 0, schritt: 0.05 },
    PEGEL,
  ],
  voraussetzungen: ["keine (reines JavaScript)"],
  ressourcen: { zeit: "eine Messung der Einsätze (FFT 1024 alle 6 ms), dann Kopieren", speicher: "der Klang etwa doppelt; höchstens 512 Schnitte" },
  reproduzierbar: "ja",
  varianten: "moduliert",
  moduliert: "wiederholen",   // was die Oberfläche zuerst über die Varianten verteilt

  async ausfuehren({ ton, einsaetze, konstellation }, p, kontext = {}) {
    const spuren = W.spurenVon(ton), rate = ton.rate, seed = (kontext.seed ?? 1) >>> 0, rnd = zufall(seed);
    const tempo = p.schnitt === "raster" ? quellTempo(spuren, rate, p.bpm) : null;
    const schnitte = schnitteBilden(spuren, rate, { art: p.schnitt, empfindlichkeit: p.empfindlichkeit, bpm: tempo?.bpm, teilung: p.teilung, folge: einsaetze });
    const folge = ordnen(schnitte.length, p.reihenfolge, rnd, konstellation);
    // zuerst die Folge der Stücke festlegen (alle Zufallsentscheidungen), dann zusammensetzen
    const stuecke = [], zaehler = { wiederholt: 0, umgekehrt: 0, ausgelassen: 0 }, teil = Number(p.stottern);
    for (const j of folge) {
      const s = schnitte[j], rueckwaerts = rnd() < p.umkehren, still = rnd() < p.auslassen;
      const mal = rnd() < p.wiederholen ? 1 + Math.floor(rnd() * Math.round(p.wiederholungen)) : 0;
      if (rueckwaerts) zaehler.umgekehrt++; if (still) zaehler.ausgelassen++; if (mal) zaehler.wiederholt++;
      for (let r = 0; r < mal; r++) stuecke.push({ j, a: s.a, b: s.a + Math.max(16, Math.round((s.b - s.a) * teil)), rueckwaerts, still, wiederholung: r + 1 });
      stuecke.push({ j, a: s.a, b: s.b, rueckwaerts, still, wiederholung: 0 });
    }
    const n = stuecke.reduce((x, s) => x + s.b - s.a, 0), aus = spuren.map(() => new Float32Array(n)), ereignisse = [];
    let t = 0;
    for (const [i, s] of stuecke.entries()) {
      if (!s.still) W.einlegen(aus, W.abschnitt(spuren, rate, s.a, s.b, { rueckwaerts: s.rueckwaerts }), t);
      ereignisse.push({ t: W.rund(t / rate, 1e4), staerke: s.still ? 0 : schnitte[s.j].staerke, schnitt: s.j, quelle: W.rund(s.a / rate, 1e4), ...(s.rueckwaerts ? { rueckwaerts: true } : {}), ...(s.wiederholung ? { wiederholung: s.wiederholung } : {}), ...(s.still ? { still: true } : {}) });
      t += s.b - s.a;
      if (i % 128 === 127) { kontext.abbrechen?.throwIfAborted?.(); await W.pause(); }
    }
    const verstaerkung = W.pegeln(aus, p.pegel);
    const zufaellig = p.reihenfolge === "zufall" || p.reihenfolge === "nachbarn" || p.wiederholen > 0 || p.umkehren > 0 || p.auslassen > 0;
    const name = REIHENFOLGEN.find((r) => r.wert === p.reihenfolge).name.split(" (")[0];
    return {
      ausgaben: [
        { typ: "AUDIO", titel: `Dekonstruktion: ${schnitte.length} Schnitte, ${name}`, ton: W.alsTon(aus, rate) },
        { typ: "EVENT_SEQUENCE", titel: `Ordnung: ${stuecke.length} Stücke aus ${schnitte.length} Schnitten`, daten: { art: "schnitte", ereignisse, beginn: 0, dauer: W.rund(n / rate), einheit: "s", quelle: "klang" } },
      ],
      entscheidungen: zufaellig ? [{ art: "zufall", gegenstand: "zerlegung", gewaehlt: `${stuecke.length} Stücke`, details: { startwert: seed, reihenfolge: p.reihenfolge, ...zaehler } }] : [],
      protokoll: { schnitt: p.schnitt, schnitte: schnitte.length, stuecke: stuecke.length, ...zaehler, tempo, folge: folge.slice(0, 64), ...angaben(spuren, rate), ausgangSekunden: W.rund(n / rate), verstaerkung: W.rund(verstaerkung, 1e4) },
    };
  },
};

// ---------------------------------------------------------------------------------------------------------------------------------
const MUSTER = [
  { wert: "euklid", name: "euklidisch (Treffer gleichmässig verteilt)" }, { wert: "zufall", name: "Zufall (Startwert, Dichte)" },
  { wert: "quelle", name: "die eigenen Einsätze, ins neue Raster gesetzt" }, { wert: "ereignisfolge", name: "Ereignisfolge (Eingang: Rhythmus eines anderen Klangs)" },
  { wert: "signal", name: "Steuersignal (Eingang: über der Schwelle ein Treffer)" }, { wert: "konstellation", name: "Text der Konstellation (Wortlängen als Abstände)" },
];
const ZUORDNUNG = [
  { wert: "ort", name: "der Schnitt an derselben Stelle der Quelle" }, { wert: "reihe", name: "die Schnitte der Reihe nach" },
  { wert: "zufall", name: "zufällig (Startwert)" }, { wert: "staerke", name: "nach Stärke: kräftige Schnitte auf kräftige Treffer" },
];

export const rhythmus = {
  id: "lab.rhythmus",
  name: "Neu-Rhythmisierung",
  version: "0.1.0",
  klasse: "zeitlich",
  herkunft: { art: "neu", quelle: "ORNAMENT LAB", referenz: "Step-Sequencer und Slices (Reason Dr. Octo Rex, Bitwig, VCV), euklidische Rhythmen (Toussaint), Pattern in SuperCollider", datei: DATEI },
  beschreibung: "Setzt die Schnitte eines Klangs auf ein neues Raster: in einem anderen Tempo, nach einem euklidischen Muster, nach Zufall, nach dem Rhythmus eines anderen Klangs, nach einem Steuersignal oder dem Text einer Konstellation. Das Ergebnis lässt sich nahtlos schleifen.",
  eingaenge: [{ name: "ton", typ: "AUDIO" }, { name: "muster", typ: "EVENT_SEQUENCE", optional: true, vorwaehlen: false }, { name: "signal", typ: "CONTROL_SIGNAL", optional: true, vorwaehlen: false }, { name: "konstellation", typ: "CONSTELLATION", optional: true, vorwaehlen: false }],
  ausgaenge: [{ name: "klang", typ: "AUDIO" }, { name: "rhythmus", typ: "EVENT_SEQUENCE" }],
  parameter: [
    { id: "muster", name: "Muster", art: "wahl", standard: "euklid", optionen: MUSTER },
    { id: "bpm", name: "Tempo (BPM, 0 = wie die Quelle)", art: "zahl", min: 0, max: 300, standard: 0, schritt: 0.5 },
    { id: "quellBpm", name: "Tempo der Quelle (BPM, 0 = schätzen)", art: "zahl", min: 0, max: 300, standard: 0, schritt: 0.5 },
    { id: "takte", name: "Takte (4/4)", art: "zahl", min: 1, max: 16, standard: 2, schritt: 1 },
    { id: "schritte", name: "Schritte je Takt", art: "zahl", min: 4, max: 32, standard: 16, schritt: 1 },
    { id: "treffer", name: "Treffer je Takt (euklidisch)", art: "zahl", min: 1, max: 32, standard: 7, schritt: 1 },
    { id: "drehung", name: "Drehung (Schritte)", art: "zahl", min: 0, max: 31, standard: 0, schritt: 1 },
    { id: "dichte", name: "Dichte (Zufall; beim Signal: Schwelle 1 − Dichte)", art: "zahl", min: 0, max: 1, standard: 0.5, schritt: 0.05 },
    { id: "swing", name: "Swing", art: "zahl", min: 0, max: 0.6, standard: 0, schritt: 0.02 },
    { id: "zuordnung", name: "welcher Schnitt auf welchen Treffer", art: "wahl", standard: "ort", optionen: ZUORDNUNG },
    { id: "schnitt", name: "Schnitte der Quelle", art: "wahl", standard: "einsaetze", optionen: [{ wert: "einsaetze", name: "an den Einsätzen" }, { wert: "raster", name: "im Raster (ein Schritt je Schnitt)" }] },
    EMPFINDLICHKEIT,
    { id: "abschneiden", name: "ein Schnitt endet beim nächsten Treffer", art: "schalter", standard: true },
    { id: "umkehren", name: "Umkehren (Wahrscheinlichkeit)", art: "zahl", min: 0, max: 1, standard: 0, schritt: 0.05 },
    { id: "streuung", name: "Tonhöhe streuen (Halbtöne)", art: "zahl", min: 0, max: 12, standard: 0, schritt: 0.5 },
    { id: "schleife", name: "nahtlos schleifbar (der Nachklang läuft am Anfang weiter)", art: "schalter", standard: true },
    PEGEL,
  ],
  voraussetzungen: ["keine (reines JavaScript)"],
  ressourcen: { zeit: "Messung der Einsätze und des Tempos, dann Kopieren je Treffer", speicher: "das Raster (höchstens 16 Takte) in der Abtastrate der Quelle" },
  reproduzierbar: "ja",
  varianten: "moduliert",
  moduliert: "treffer",   // was die Oberfläche zuerst über die Varianten verteilt

  async ausfuehren({ ton, muster, signal, konstellation }, p, kontext = {}) {
    const spuren = W.spurenVon(ton), rate = ton.rate, seed = (kontext.seed ?? 1) >>> 0, rnd = zufall(seed);
    const quelle = quellTempo(spuren, rate, p.quellBpm), bpm = p.bpm > 0 ? p.bpm : quelle.bpm;
    const S = Math.round(p.schritte), gesamt = Math.round(p.takte) * S, jeSchlag = S / 4, schritt = 60 / bpm / jeSchlag, quellSchritt = 60 / quelle.bpm / jeSchlag;
    const dauer = gesamt * schritt, n = Math.round(dauer * rate), qn = spuren[0].length;
    const schnitte = schnitteBilden(spuren, rate, { art: p.schnitt, empfindlichkeit: p.empfindlichkeit, bpm: quelle.bpm, teilung: jeSchlag });
    const betont = (s) => (s % S === 0 ? 1 : s % jeSchlag === 0 ? 0.85 : 0.7);

    // 1. die Treffer: { schritt, staerke, schnitt? }
    let treffer = [];
    if (p.muster === "euklid") {
      const e = W.euklid(Math.min(S, p.treffer), S, Math.round(p.drehung));
      for (let s = 0; s < gesamt; s++) if (e[s % S]) treffer.push({ schritt: s, staerke: betont(s) });
    } else if (p.muster === "zufall") {
      for (let s = 0; s < gesamt; s++) if (s === 0 || rnd() < p.dichte * (s % jeSchlag === 0 ? 1.4 : 0.8)) treffer.push({ schritt: s, staerke: betont(s) * (0.7 + 0.3 * rnd()) });
    } else if (p.muster === "quelle") {
      for (const [j, x] of schnitte.entries()) { const s = Math.round(x.a / rate / quellSchritt); if (s < gesamt) treffer.push({ schritt: s, staerke: x.staerke, schnitt: j }); }
    } else if (p.muster === "ereignisfolge") {
      if (!muster?.ereignisse?.length) throw new Error("Neu-Rhythmisierung: das Muster «Ereignisfolge» braucht eine Ereignisfolge als Eingang");
      const raster = muster.raster && muster.ereignisse.every((e) => Number.isFinite(e.schritt));
      for (const e of muster.ereignisse) {
        const s = raster ? Math.round((e.schritt * S) / muster.raster) : Math.round(e.t / schritt);
        if (s < gesamt && (e.staerke ?? 1) > 0) treffer.push({ schritt: s, staerke: Math.max(0.2, e.staerke ?? 1) });
      }
    } else if (p.muster === "signal") {
      if (!signal?.werte?.length) throw new Error("Neu-Rhythmisierung: das Muster «Steuersignal» braucht ein Steuersignal als Eingang");
      for (let s = 0; s < gesamt; s++) { const v = lies(signal.werte, s / Math.max(1, gesamt - 1)); if (v >= 1 - p.dichte) treffer.push({ schritt: s, staerke: 0.4 + 0.6 * v }); }
    } else {
      const woerter = W.textAbstaende(konstellation?.text || konstellation?.frage || "");
      if (!woerter.length) throw new Error("Neu-Rhythmisierung: das Muster «Text der Konstellation» braucht eine Konstellation mit Text als Eingang");
      for (let s = 0, i = 0; s < gesamt && i < 4096; i++) { const w = woerter[i % woerter.length]; treffer.push({ schritt: s, staerke: w.gross ? 1 : 0.75, wort: w.wort }); s += w.abstand; }
    }
    const gesehen = new Set();
    treffer = treffer.filter((x) => !gesehen.has(x.schritt) && gesehen.add(x.schritt)).sort((a, b) => a.schritt - b.schritt);
    if (!treffer.length) throw new Error("Neu-Rhythmisierung: das Muster hat keinen Treffer (Dichte oder Treffer erhöhen)");

    // 2. welcher Schnitt auf welchen Treffer
    const nachStaerke = p.zuordnung === "staerke" ? schnitte.map((x, j) => j).sort((a, b) => schnitte[b].staerke - schnitte[a].staerke) : null;
    const rang = p.zuordnung === "staerke" ? new Map(treffer.map((x, i) => [x, i]).sort((a, b) => b[0].staerke - a[0].staerke).map(([x], r) => [x, r])) : null;
    for (const [i, x] of treffer.entries()) {
      if (x.schnitt !== undefined) continue;
      if (p.zuordnung === "reihe") x.schnitt = i % schnitte.length;
      else if (p.zuordnung === "zufall") x.schnitt = Math.floor(rnd() * schnitte.length);
      else if (p.zuordnung === "staerke") x.schnitt = nachStaerke[rang.get(x) % schnitte.length];
      else { const ort = ((x.schritt * quellSchritt * rate) % qn); let j = 0; while (j + 1 < schnitte.length && schnitte[j + 1].a <= ort) j++; x.schnitt = j; }
    }

    // 3. einlegen
    const aus = spuren.map(() => new Float32Array(n)), zeit = (s) => (s + (s % 2 ? p.swing : 0)) * schritt;
    let umgekehrt = 0;
    for (const [i, x] of treffer.entries()) {
      const s = schnitte[x.schnitt], t = zeit(x.schritt), naechste = treffer[i + 1] ? zeit(treffer[i + 1].schritt) : p.schleife ? dauer + zeit(treffer[0].schritt) : dauer;
      x.rueckwaerts = rnd() < p.umkehren; if (x.rueckwaerts) umgekehrt++;
      x.halbtoene = p.streuung > 0 ? W.rund((rnd() * 2 - 1) * p.streuung, 10) : 0;
      const laenge = p.abschneiden ? Math.round((naechste - t) * rate) : Infinity;
      W.einlegen(aus, W.abschnitt(spuren, rate, s.a, s.b, { rueckwaerts: x.rueckwaerts, tonhoehe: W.halbton(x.halbtoene), laenge }), Math.round(t * rate), { staerke: 0.55 + 0.45 * x.staerke, ringsum: p.schleife });
      if (i % 64 === 63) { kontext.abbrechen?.throwIfAborted?.(); await W.pause(); }
    }
    const verstaerkung = W.pegeln(aus, p.pegel);
    const name = MUSTER.find((m) => m.wert === p.muster).name.split(" (")[0];
    const zufaellig = p.muster === "zufall" || p.zuordnung === "zufall" || p.umkehren > 0 || p.streuung > 0;
    return {
      ausgaben: [
        { typ: "AUDIO", titel: `Rhythmus: ${name}, ${treffer.length} Treffer, ${z(bpm, 10)} BPM`, ton: W.alsTon(aus, rate) },
        { typ: "EVENT_SEQUENCE", titel: `Rhythmus: ${treffer.length} von ${gesamt} Schritten, ${z(bpm, 10)} BPM`, daten: {
          art: "rhythmus", bpm: W.rund(bpm, 100), takt: [4, 4], raster: S, takte: Math.round(p.takte), swing: p.swing,
          ereignisse: treffer.map((x) => ({ t: W.rund(zeit(x.schritt), 1e4), schritt: x.schritt, staerke: W.rund(x.staerke), schnitt: x.schnitt, ...(x.rueckwaerts ? { rueckwaerts: true } : {}), ...(x.halbtoene ? { halbtoene: x.halbtoene } : {}), ...(x.wort ? { wort: x.wort } : {}) })),
          beginn: 0, dauer: W.rund(dauer, 1e4), einheit: "s", quelle: "klang" } },
      ],
      entscheidungen: zufaellig ? [{ art: "zufall", gegenstand: "rhythmus", gewaehlt: `${treffer.length} Treffer`, details: { startwert: seed, muster: p.muster, zuordnung: p.zuordnung, umgekehrt } }] : [],
      protokoll: { muster: p.muster, zuordnung: p.zuordnung, bpm: W.rund(bpm, 100), quelle, schritte: gesamt, treffer: treffer.length, schnitte: schnitte.length, umgekehrt, ...angaben(spuren, rate), ausgangSekunden: W.rund(dauer), verstaerkung: W.rund(verstaerkung, 1e4),
        hinweis: "Das Raster ist eine Setzung, kein Befund über die Musik. Mit «nahtlos schleifbar» läuft der Nachklang des letzten Schnitts am Anfang weiter: die Datei lässt sich ohne Lücke wiederholen." },
    };
  },
};

// ---------------------------------------------------------------------------------------------------------------------------------
export const koerner = {
  id: "lab.koerner",
  name: "Körner (Granular)",
  version: "0.1.0",
  klasse: "zeitlich",
  herkunft: { art: "neu", quelle: "ORNAMENT LAB", referenz: "Granularsynthese: Warp1 und GrainBuf in SuperCollider (Lesekopf, Fenster, Überlappung); Granulatoren in Max/MSP und VCV", datei: DATEI },
  beschreibung: "Löst einen Klang in kurze Körner auf und setzt sie neu zusammen: der Lesekopf wandert, steht still oder folgt einem Steuersignal; Tonhöhe, Stelle und Richtung lassen sich streuen.",
  eingaenge: [{ name: "ton", typ: "AUDIO" }, { name: "signal", typ: "CONTROL_SIGNAL", optional: true, vorwaehlen: false }],
  ausgaenge: [{ name: "klang", typ: "AUDIO" }],
  parameter: [
    { id: "leser", name: "Lesekopf", art: "wahl", standard: "lauf", optionen: [{ wert: "lauf", name: "wandert (Geschwindigkeit unten)" }, { wert: "signal", name: "folgt dem Steuersignal (Eingang)" }] },
    { id: "dauer", name: "Dauer (s)", art: "zahl", min: 0.5, max: 60, standard: 8, schritt: 0.5 },
    { id: "position", name: "Beginn in der Quelle (0–1)", art: "zahl", min: 0, max: 1, standard: 0, schritt: 0.01 },
    { id: "lauf", name: "Geschwindigkeit des Lesekopfs (1 = Originalzeit, 0 = steht)", art: "zahl", min: -2, max: 2, standard: 0.5, schritt: 0.05 },
    { id: "korn", name: "Korngrösse (ms)", art: "zahl", min: 5, max: 500, standard: 90, schritt: 1 },
    { id: "ueberlappung", name: "Überlappung (Körner zugleich)", art: "zahl", min: 1, max: 32, standard: 6, schritt: 0.5 },
    { id: "streuung", name: "Streuung der Stelle (s)", art: "zahl", min: 0, max: 2, standard: 0.04, schritt: 0.01 },
    { id: "tonhoehe", name: "Tonhöhe (Halbtöne)", art: "zahl", min: -24, max: 24, standard: 0, schritt: 0.1 },
    { id: "tonstreuung", name: "Tonhöhe streuen (Halbtöne)", art: "zahl", min: 0, max: 12, standard: 0, schritt: 0.1 },
    { id: "umkehren", name: "Körner rückwärts (Wahrscheinlichkeit)", art: "zahl", min: 0, max: 1, standard: 0, schritt: 0.05 },
    { id: "breite", name: "Stereobreite", art: "zahl", min: 0, max: 1, standard: 0.6, schritt: 0.05 },
    { id: "fenster", name: "Form des Korns", art: "wahl", standard: "hann", optionen: [{ wert: "hann", name: "weich (Hann)" }, { wert: "flach", name: "flach mit kurzen Flanken" }, { wert: "perkussiv", name: "perkussiv (schnell an, abklingend)" }] },
    { ...PEGEL, standard: "normal" },
  ],
  voraussetzungen: ["keine (reines JavaScript)"],
  ressourcen: { zeit: "Dauer × Abtastrate × Überlappung Lesungen (8 s, 6 Körner zugleich: etwa 2 Millionen je Kanal); höchstens 40 000 Körner", speicher: "die Ausgabe zweikanalig" },
  reproduzierbar: "ja",
  varianten: "moduliert",
  moduliert: "korn",   // was die Oberfläche zuerst über die Varianten verteilt

  async ausfuehren({ ton, signal }, p, kontext = {}) {
    if (p.leser === "signal" && !signal?.werte?.length) throw new Error("Körner: der Lesekopf «folgt dem Steuersignal» braucht ein Steuersignal als Eingang");
    const spuren = W.spurenVon(ton), rate = ton.rate, seed = (kontext.seed ?? 1) >>> 0, rnd = zufall(seed);
    const qn = spuren[0].length, qd = qn / rate, n = Math.round(p.dauer * rate), laenge = Math.max(16, Math.round((p.korn / 1000) * rate));
    const abstand = laenge / p.ueberlappung, stereo = spuren.length > 1 || p.breite > 0, aus = Array.from({ length: stereo ? 2 : 1 }, () => new Float32Array(n));
    const anzahl = Math.min(40000, Math.ceil(n / abstand)), g = 1 / Math.sqrt(p.ueberlappung);
    let rueckwaerts = 0;
    for (let k = 0; k < anzahl; k++) {
      const start = Math.round(k * abstand + (rnd() - 0.5) * 0.5 * abstand), t = Math.max(0, start) / rate;
      let ort = p.leser === "signal" ? lies(signal.werte, t / p.dauer) * qd : p.position * qd + t * p.lauf;
      ort += (rnd() * 2 - 1) * p.streuung;
      ort = ((ort % qd) + qd) % qd;
      const schritt = W.halbton(p.tonhoehe + (rnd() * 2 - 1) * p.tonstreuung) * (rnd() < p.umkehren ? (rueckwaerts++, -1) : 1);
      const pos = schritt < 0 ? Math.min(qn - 2, ort * rate + laenge * -schritt) : Math.min(ort * rate, Math.max(0, qn - 2 - laenge * schritt));
      W.korn(aus, spuren, { start: Math.max(0, start), pos, schritt, laenge, fenster: p.fenster, pan: (rnd() * 2 - 1) * p.breite, staerke: g });
      if (k % 2000 === 1999) { kontext.abbrechen?.throwIfAborted?.(); kontext.melden?.(`Körner: ${k + 1} von ${anzahl}`); await W.pause(); }
    }
    const verstaerkung = W.pegeln(aus, p.pegel);
    if (verstaerkung === 0) throw new Error("Körner: es entsteht kein Klang (die Stelle liegt in der Stille)");
    return {
      ausgaben: [{ typ: "AUDIO", titel: `Körner: ${p.korn} ms, ${p.leser === "signal" ? "nach Signal" : `Lesekopf ×${z(p.lauf)}`}, ${z(p.dauer, 10)} s`, ton: W.alsTon(aus, rate) }],
      entscheidungen: [{ art: "zufall", gegenstand: "koerner", gewaehlt: `${anzahl} Körner`, details: { startwert: seed, rueckwaerts, verfahren: "Einsatz ±25 % des Abstands, Stelle, Tonhöhe, Richtung und Panorama je Korn aus dem Startwert" } }],
      protokoll: { leser: p.leser, koerner: anzahl, kornAbtastwerte: laenge, ...angaben(spuren, rate), kanaeleAus: aus.length, ausgangSekunden: p.dauer, verstaerkung: W.rund(verstaerkung, 1e4) },
    };
  },
};
