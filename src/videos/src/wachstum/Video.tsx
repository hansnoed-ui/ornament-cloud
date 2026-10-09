// Video «wachstum» (9. Oktober 2026), 1 : 1 (1080 × 1080), ohne Ton und ohne Text: das Linienwachstum (differential line growth)
// spielt «ornament.cloud» – erst das Ornament in einer atmenden Wolke, dann wächst aus 14 kleinen Ringen je ein Zeichen des Namens.
// Intro und Outro sind das Signet der Vorlage (Intro ohne Kopfzeile, weil das Video keinen Text hat).
// Dazu die Startanimation der Website (9. Oktober 2026): nur die Zeichen, in 11 s statt 17 s, ohne Signet am Ende – hell und dunkel (Farben der Website).
// Das fertige Wort steht etwa 1,6 s, dann blenden die Zeichen aus; danach blendet die Seite den leeren Grund in die Startseite über.
import React from "react";
import { AbsoluteFill, Easing, Sequence, interpolate, useCurrentFrame } from "remotion";
import { Grund, INTRO, OUTRO, Outro, klemm } from "../vorlage/Bausteine";
import { Signet } from "../vorlage/Signet";
import { FARBE } from "../vorlage/stil";
import { WOLKE_START, buchstabenForm, wolkeForm, wolkeUmriss, type Buchstaben } from "./Formen";
import { BILD, Wachstum, flaecheInnen, pfad, type Param } from "./Wachstum";

const HOEHE = 1080;

// Zeitplan in Bildern (30 fps)
export const T = {
  intro: 0,
  wolke: INTRO,                 // 3 s
  wolkeLaenge: 300,             // 10 s
  buchstaben: INTRO + 300,      // 13 s
  buchstabenLaenge: 510,        // 17 s
  signet: INTRO + 300 + 510,    // 30 s
  ende: INTRO + 300 + 510 + OUTRO,
};

// Startanimation der Website: dieselben Zeichen in 11 s statt 17 s (gut 1,5-mal so schnell), ohne Signet; die letzten 20 Bilder blenden die Zeichen aus
const DAUER_START = 330;
const AUS_START = 20;           // Bilder, in denen die fertigen Zeichen am Ende ausblenden
export const TEMPO_START = T.buchstabenLaenge / DAUER_START;
export const TStart = { ende: DAUER_START };

// Farben: hell wie die Website im hellen Modus, dunkel wie im dunklen Modus (styles.css)
type Farben = { grund: string; tinte: string; punkt: string };
const HELL: Farben = { grund: FARBE.grund, tinte: FARBE.text, punkt: FARBE.akzent };
const DUNKEL: Farben = { grund: "#171614", tinte: "#ece8e1", punkt: "#f08a5d" };

// ---------- Intro ohne Kopfzeile (wie Intro der Vorlage; die Vorlage bleibt unverändert) ----------
const IntroOhneKopf: React.FC = () => {
  const f = useCurrentFrame();
  return (
    <AbsoluteFill style={{ opacity: interpolate(f, [INTRO - 12, INTRO], [1, 0], klemm), overflow: "hidden", backgroundColor: FARBE.grund }}>
      <div style={{ position: "absolute", left: 0, width: 1080, height: 1920, top: (HOEHE - 1920) / 2 }}><Signet tempo={2} kopf={null} /></div>
    </AbsoluteFill>
  );
};

// ---------- Die beiden Läufe (Zustand liegt ausserhalb von React; wer ein früheres Bild verlangt, rechnet von vorn) ----------
// Szene 1: wie im Sketch (minNodeDist 15, Abstossung 0,6, Feder 0,4, Grenze 1,5, maxSpeed 2,5, Reibung 0,92), Grenze = Wolke
const PARAM_WOLKE: Param = { minDist: 15, rep: 0.6, att: 0.4, bnd: 1.5, maxEdge: 8, vmax: 2.5, reib: 0.92, rand: 6, seed: 7 };
const SCHRITTE_WOLKE = 5;       // Rechenschritte je Bild
const FLAECHE_WOLKE = 116;      // px² je Punkt (der Sketch füllt etwa 212 000 px² mit rund 1 800 Punkten)

// Szene 2: dieselben Regeln, halb so gross gerechnet (die Buchstaben sind schmal), Grenze = Zeichen
const PARAM_BUCHSTABEN: Param = { minDist: 7.5, rep: 0.6, att: 0.4, bnd: 1.5, maxEdge: 4, vmax: 1.25, reib: 0.92, rand: 3, seed: 12345 };
const SCHRITTE_BUCHSTABEN = 3;
const FLAECHE_BUCHSTABEN = 22;
const VERSATZ = 24;             // Schritte zwischen dem Start zweier Zeichen
const DAUER_BUCHSTABEN = 900;   // Schritte, bis ein Zeichen gefüllt ist

let wolkeLauf: Wachstum | null = null;
const wolke = (schritt: number): Wachstum => {
  if (!wolkeLauf) {
    const ziel = Math.round(flaecheInnen(wolkeForm, PARAM_WOLKE.rand) / FLAECHE_WOLKE);
    wolkeLauf = new Wachstum(PARAM_WOLKE, wolkeForm, [{ ...WOLKE_START, n: 30, start: 0, dauer: 900, ziel, farbe: "tinte" }]);
  }
  wolkeLauf.bringe(schritt);
  return wolkeLauf;
};

let buchstabenLauf: { lauf: Wachstum; form: Buchstaben } | null = null;
const buchstaben = (schritt: number): Wachstum => {
  if (!buchstabenLauf) {
    const form = buchstabenForm(FLAECHE_BUCHSTABEN);
    const ringe = form.ringe.map((r, i) => ({ ...r, start: i * VERSATZ, dauer: DAUER_BUCHSTABEN, farbe: r.punkt ? "punkt" : "tinte" }));
    buchstabenLauf = { lauf: new Wachstum(PARAM_BUCHSTABEN, form.form, ringe), form };
  }
  buchstabenLauf.lauf.bringe(schritt);
  return buchstabenLauf.lauf;
};

const STRICH = 3.2;
const Linien: React.FC<{ lauf: Wachstum; farben?: Farben }> = ({ lauf, farben = HELL }) => (
  <g fill="none" strokeWidth={STRICH} strokeLinecap="round" strokeLinejoin="round">
    {lauf.ringe.map((l, i) => (l.knoten.length > 2 ? <path key={i} d={pfad(l.knoten)} stroke={l.ring.farbe === "punkt" ? farben.punkt : farben.tinte} /> : null))}
  </g>
);

// ---------- Szene 1: das Ornament in der Wolke ----------
const Wolke: React.FC = () => {
  const f = useCurrentFrame();
  const schritt = f * SCHRITTE_WOLKE;
  const lauf = wolke(schritt);
  const n = T.wolkeLaenge;
  const sicht = interpolate(f, [0, 12, n - 45, n], [0, 1, 1, 0], klemm);
  // zum Schluss zieht die Wolke ab: sie steigt auf und löst sich auf
  const hoch = interpolate(f, [n - 60, n], [0, -90], { ...klemm, easing: Easing.bezier(0.45, 0, 0.25, 1) });
  return (
    <AbsoluteFill style={{ opacity: sicht }}>
      <svg width={BILD} height={BILD} style={{ position: "absolute", inset: 0 }}>
        <g transform={`translate(0 ${hoch})`}>
          <path d={wolkeUmriss(schritt)} fill="none" stroke={FARBE.akzent} strokeWidth={STRICH} strokeLinejoin="round" opacity={interpolate(f, [0, 40], [0, 0.9], klemm)} />
          <Linien lauf={lauf} />
        </g>
      </svg>
    </AbsoluteFill>
  );
};

// ---------- Szene 2: aus 14 Ringen wachsen die Zeichen ----------
// tempo: Vielfaches der Rechenschritte je Bild (dieselben Schritte, also dasselbe Bild, nur schneller); laenge: Bilder der Szene
const Zeichen: React.FC<{ tempo?: number; laenge?: number; farben?: Farben; aus?: number }> = ({ tempo = 1, laenge = T.buchstabenLaenge, farben = HELL, aus = 14 }) => {
  const f = useCurrentFrame();
  const lauf = buchstaben(Math.round(f * SCHRITTE_BUCHSTABEN * tempo));
  return (
    <AbsoluteFill style={{ opacity: interpolate(f, [laenge - aus, laenge], [1, 0], klemm) }}>
      <svg width={BILD} height={BILD} style={{ position: "absolute", inset: 0 }}><Linien lauf={lauf} farben={farben} /></svg>
    </AbsoluteFill>
  );
};

export const WachstumVideo: React.FC = () => (
  <Grund>
    <Sequence durationInFrames={INTRO}><IntroOhneKopf /></Sequence>
    <Sequence from={T.wolke} durationInFrames={T.wolkeLaenge}><Wolke /></Sequence>
    <Sequence from={T.buchstaben} durationInFrames={T.buchstabenLaenge}><Zeichen /></Sequence>
    <Sequence from={T.signet} durationInFrames={OUTRO}><Outro hoehe={HOEHE} /></Sequence>
  </Grund>
);

/** Startanimation der Website: die Zeichen wachsen (11 s statt 17 s), stehen kurz als fertiges Wort und blenden aus; hell oder dunkel */
export const StartAnimation: React.FC<{ dunkel?: boolean }> = ({ dunkel = false }) => {
  const farben = dunkel ? DUNKEL : HELL;
  return (
    <Grund>
      <AbsoluteFill style={{ backgroundColor: farben.grund }}>
        <Zeichen tempo={TEMPO_START} laenge={TStart.ende} farben={farben} aus={AUS_START} />
      </AbsoluteFill>
    </Grund>
  );
};
