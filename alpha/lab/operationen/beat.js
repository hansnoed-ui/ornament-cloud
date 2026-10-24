// ORNAMENT LAB – Beat aus Bild (zeitliche Operation, Medienwechsel nach Klang, seit Lab 0.1.24). Ein kurzer Soundtrack aus einem Bild
// oder aus den Standbildern eines Videos: Schlagzeug, Bass und Melodie. Gemessen werden Farbe, Helligkeit, Feinheit, Komposition und,
// zwischen den Standbildern, die Bewegung (kern/beat.js). Jede der acht Stellen ist ein Parameter: «nach Regeln» wählt sie die Operation
// selbst nach offen gelegten Regeln (Entscheidungsart «regel»), sonst gilt, was gewählt ist: vom Menschen oder, über die Oberfläche,
// von jev (jev/fragen.js, Frage «beat»). Gerechnet wird in reinem JavaScript; derselbe Startwert ist derselbe Beat.
// Ausgänge: der Beat (AUDIO, Stereo) und seine Schläge als Ereignisfolge mit bpm und Raster, so schneidet ein Film über Stationen im Takt.
import { BEAT_FRAGEN } from "../jev/fragen.js";
import { beatMessen, regelPlan, beatRechnen, grundtonAusFarbton, NOTEN, ABSCHNITTE_HOECHSTENS, BEAT_VERSION } from "../kern/beat.js";

const NACH_REGELN = { wert: "auto", name: "nach Regeln aus dem Bild" };
const kurz = (t) => t.split(":")[0];
const wahl = (frage) => [NACH_REGELN, ...Object.entries(BEAT_FRAGEN[frage].katalog).map(([wert, t]) => ({ wert, name: kurz(t) }))];
export const BEAT_STELLEN = Object.freeze(Object.keys(BEAT_FRAGEN));
const NAMEN = { tempo: "Tempo", groove: "Groove", kit: "Schlagzeug", tonart: "Tonart", bass: "Bass", melodie: "Melodie", verlauf: "Verlauf", flaeche: "Fläche" };
const weitere = Array.from({ length: ABSCHNITTE_HOECHSTENS - 1 }, (_, i) => ({ name: `bild${i + 2}`, typ: "IMAGE", optional: true }));

export const beat = {
  id: "lab.beat",
  name: "Beat aus Bild",
  version: BEAT_VERSION,
  klasse: "zeitlich",
  herkunft: { art: "neu", quelle: "ORNAMENT LAB", referenz: "Drum-Machine (Roland TR-808: Bassdrum mit fallender Tonhöhe, Becken aus sechs Rechtecken), euklidische Rhythmen (Toussaint), Bild als Partitur wie beim Klangerzeuger", datei: "alpha/lab/operationen/beat.js, alpha/lab/kern/beat.js" },
  beschreibung: "Macht aus einem Bild oder den Standbildern eines Videos einen kurzen Beat mit Schlagzeug, Bass und Melodie. Farbe, Helligkeit, Feinheit, Komposition und Bewegung wählen Tempo, Groove, Klänge und Tonart, nach Regeln oder durch jev.",
  eingaenge: [{ name: "bild", typ: "IMAGE" }, ...weitere],
  ausgaenge: [{ name: "beat", typ: "AUDIO" }, { name: "schlaege", typ: "EVENT_SEQUENCE" }],
  parameter: [
    { id: "dauer", name: "Dauer (s)", art: "zahl", min: 4, max: 60, standard: 15, schritt: 0.5 },
    ...BEAT_STELLEN.map((id) => ({ id, name: NAMEN[id], art: "wahl", standard: "auto", optionen: wahl(id) })),
    { id: "grundton", name: "Grundton", art: "wahl", standard: "auto", optionen: [{ wert: "auto", name: "aus dem Farbton" }, ...NOTEN.map((n, i) => ({ wert: String(i), name: n }))] },
    { id: "kammerton", name: "Stimmung (Kammerton A)", art: "wahl", standard: "432", optionen: [{ wert: "432", name: "432 Hz" }, { wert: "440", name: "440 Hz" }] },
    { id: "nachhall", name: "Nachhall", art: "zahl", min: 0, max: 0.8, standard: 0.25, schritt: 0.05 },
  ],
  voraussetzungen: ["keine (reines JavaScript); zum Anhören ein Browser mit <audio>"],
  ressourcen: { zeit: "Messen auf höchstens 128 Pixeln je Seite, dann je Schlag einige tausend Schritte (15 s: unter einer Sekunde)", speicher: "der Beat in Stereo, 44,1 kHz, höchstens 60 s" },
  reproduzierbar: "ja",
  varianten: "moduliert",

  async ausfuehren(ein, p, kontext = {}) {
    const bilder = ["bild", ...weitere.map((w) => w.name)].map((k) => ein[k]).filter(Boolean);
    const messung = beatMessen(bilder);
    const regeln = regelPlan(messung.merkmale), plan = {}, nachRegeln = [];
    for (const k of BEAT_STELLEN) { if (p[k] === "auto") { plan[k] = regeln.plan[k]; nachRegeln.push(k); } else plan[k] = p[k]; }
    const grundton = p.grundton === "auto" ? grundtonAusFarbton(messung.merkmale, messung.werte) : Number(p.grundton);
    const entscheidungen = nachRegeln.length ? [{ art: "regel", gegenstand: "beat", optionen: nachRegeln, gewaehlt: nachRegeln.map((k) => `${NAMEN[k]}: ${plan[k]}`).join(", "),
      details: { merkmale: messung.merkmale, werte: messung.werte, gruende: Object.fromEntries(nachRegeln.map((k) => [k, regeln.gruende[k]])), version: BEAT_VERSION } }] : [];
    kontext.melden?.(`Beat: ${NAMEN.tempo} ${plan.tempo}, ${plan.groove}, ${plan.kit} …`);
    kontext.abbrechen?.throwIfAborted?.();
    const r = beatRechnen({ messung, plan, dauer: p.dauer, grundton, kammerton: Number(p.kammerton), nachhall: p.nachhall, seed: kontext.seed ?? 1 });
    const name = (k) => kurz(BEAT_FRAGEN[k].katalog[plan[k]]);
    return {
      ausgaben: [
        { typ: "AUDIO", titel: `Beat: ${Math.round(r.angaben.bpm)} BPM, ${name("groove")}, ${name("kit")}, ${NOTEN[grundton]} ${name("tonart")}, ${p.kammerton} Hz, ${p.dauer} s`, ton: { pcm: mischen(r.spuren), spuren: r.spuren, rate: r.rate } },
        { typ: "EVENT_SEQUENCE", titel: `Schläge: ${r.partitur.filter((x) => x.stimme !== "melodie").length}, ${Math.round(r.angaben.bpm)} BPM`, daten: {
          art: "rhythmus", quelle: "beat", bpm: r.angaben.bpm, raster: 16, takte: r.angaben.takte, beginn: 0, dauer: p.dauer, einheit: "s",
          ereignisse: r.partitur.filter((x) => x.stimme !== "melodie"), melodie: r.partitur.filter((x) => x.stimme === "melodie") } },
      ],
      entscheidungen,
      protokoll: { plan, nachRegeln, grundton: NOTEN[grundton], merkmale: messung.merkmale, werte: messung.werte, ...r.angaben,
        abbildung: "Farbton → Grundton (je 30° ein Halbton), Feinheit → Tempo in seiner Stufe und Dichte der Becken, Zeilen → Tonhöhe der Melodie, Standbild → Abschnitt, Bewegung → Energie (Verlauf «in Wellen»)",
        hinweis: "Abbildung, keine Deutung: welche Eigenschaft welchen Klang ergibt, ist eine gestalterische Entscheidung des Labs." },
    };
  },
};

function mischen([l, r]) { const m = new Float32Array(l.length); for (let i = 0; i < l.length; i++) m[i] = (l[i] + r[i]) / 2; return m; }
