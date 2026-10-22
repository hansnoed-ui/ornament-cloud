// «neubau» – ornament.cloud/b/ im Hochformat (1080 × 1920, 30 fps, ohne Ton), 22. Oktober 2026.
// Gestaltung des Neubaus (b/b.css), gebaut nach den Remotion-Skills: jede Szene in einer eigenen Datei und als eigene Composition (Root.tsx),
// verbunden mit TransitionSeries (weiche Blenden). Die Kopfzeile mit Signet und Hauptnavigation liegt als eigene Ebene darüber.
// Alle Texte, Zeichen, Farben und Fäden kommen unverändert aus der Website (daten.mjs).
import React from "react";
import { AbsoluteFill, Sequence } from "remotion";
import { TransitionSeries, linearTiming } from "@remotion/transitions";
import { fade } from "@remotion/transitions/fade";
import { Kopf } from "./Kopf";
import { Papier } from "./Teile";
import { AUFTAKT, Auftakt } from "./szenen/Auftakt";
import { EINSTIEG, Einstieg } from "./szenen/Einstieg";
import { ANGEBOTE, Angebote } from "./szenen/Angebote";
import { SATZ, Satz } from "./szenen/Satz";
import { FELD, Feld } from "./szenen/Feld";
import { RASTER, Raster } from "./szenen/Raster";
import { SPIELEN, Spielen } from "./szenen/Spielen";
import { SCHLUSS, Schluss } from "./szenen/Schluss";

export const UEBERGANG = 15;
// Szenen in ihrer Reihenfolge; nav: der Punkt der Hauptnavigation, der während der Szene aktiv ist (Index in daten.nav: Zettel, Apps, Raster, Angebot …)
export const SZENEN = [
  { id: "NeubauAuftakt", name: "Auftakt", Szene: Auftakt, dauer: AUFTAKT, nav: -1 },
  { id: "NeubauEinstieg", name: "Einstieg", Szene: Einstieg, dauer: EINSTIEG, nav: -1 },
  { id: "NeubauAngebote", name: "Angebote", Szene: Angebote, dauer: ANGEBOTE, nav: 3 },
  { id: "NeubauSatz", name: "Satz", Szene: Satz, dauer: SATZ, nav: -1 },
  { id: "NeubauFeld", name: "Feld", Szene: Feld, dauer: FELD, nav: 0 },
  { id: "NeubauRaster", name: "Raster", Szene: Raster, dauer: RASTER, nav: 2 },
  { id: "NeubauSpielen", name: "Spielen", Szene: Spielen, dauer: SPIELEN, nav: 1 },
  { id: "NeubauSchluss", name: "Schluss", Szene: Schluss, dauer: SCHLUSS, nav: -1 },
];
/** Beginn jeder Szene im ganzen Video (die Blenden überlappen) */
const BEGINN = SZENEN.map((_, i) => SZENEN.slice(0, i).reduce((s, z) => s + z.dauer, 0) - i * UEBERGANG);
export const DAUER = BEGINN[SZENEN.length - 1] + SZENEN[SZENEN.length - 1].dauer;

// Die Kopfzeile steht von der Mitte der Blende zum Einstieg bis zur Mitte der Blende zum Schluss
const KOPF_AB = BEGINN[1] + UEBERGANG / 2;
const KOPF_BIS = BEGINN[SZENEN.length - 1] + UEBERGANG / 2;
const aktiv = (f: number) => {
  const g = f + KOPF_AB;
  let n = -1;
  SZENEN.forEach((z, i) => { if (g >= BEGINN[i] + UEBERGANG / 2) n = z.nav; });
  return n;
};

export const NeubauVideo: React.FC = () => (
  <Papier>
    <TransitionSeries>
      {SZENEN.flatMap(({ name, Szene, dauer }, i) => [
        ...(i > 0 ? [<TransitionSeries.Transition key={`${name}-blende`} presentation={fade()} timing={linearTiming({ durationInFrames: UEBERGANG })} />] : []),
        <TransitionSeries.Sequence key={name} name={name} durationInFrames={dauer}><Szene /></TransitionSeries.Sequence>,
      ])}
    </TransitionSeries>
    <Sequence name="Kopfzeile" from={KOPF_AB} durationInFrames={KOPF_BIS - KOPF_AB}>
      <AbsoluteFill><Kopf aktiv={aktiv} dauer={KOPF_BIS - KOPF_AB} /></AbsoluteFill>
    </Sequence>
  </Papier>
);
