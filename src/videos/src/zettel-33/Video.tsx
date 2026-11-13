// «Zettel 33 – Das Publikum» (13. November 2026, Christian: «Film Zettel 33»): der Zettel aus «Zu seiner Zeit», gesprochen von Christian
// (Stimme aus ornament-studio). Das erste Video mit Ton. Aufbau: Intro mit Kopf – Titel – der Text Satz für Satz, jeder so lange, wie er
// gesprochen wird – der Leitsatz – Outro. Texte unverändert aus der Website (daten.mjs).
import React from "react";
import { Audio, Sequence, staticFile, useCurrentFrame } from "remotion";
import { Grund, INTRO, Intro, Leise, Marke, Oben, OUTRO, Outro, Titel, blende, steig } from "../vorlage/Bausteine";
import { FARBE, FPS, SERIF } from "../vorlage/stil";
import daten from "./data/zettel.json";

const s = (sek: number) => Math.round(sek * FPS);
const TON = INTRO;                                  // die Stimme beginnt nach dem Intro
const VOR = 6;                                      // ein Satz erscheint 0,2 s, bevor er gesprochen wird
const ab = daten.abschnitte.map((a) => TON + s(a.ab) - VOR);
const sprechEnde = TON + s(daten.sprechEnde);
export const T = { intro: 0, titel: INTRO, text: ab[0], leitsatz: sprechEnde + 12, signet: sprechEnde + 12 + s(3.4), ende: sprechEnde + 12 + s(3.4) + OUTRO };

const kennzeile = `Zettel ${daten.nummer} · ${daten.titel}`;

/** der Titel, während «Zettel dreiunddreissig. Das Publikum.» gesprochen wird */
const TitelSzene: React.FC<{ dauer: number }> = ({ dauer }) => {
  const f = useCurrentFrame();
  return (
    <div style={{ position: "absolute", left: 90, right: 90, top: 700, opacity: blende(f, 4, dauer), translate: `0 ${steig(f, 4)}px`, display: "flex", flexDirection: "column", gap: 28 }}>
      <Marke>Zettel {daten.nummer}</Marke>
      <Titel groesse={110}>{daten.titel}</Titel>
      <Leise>Zu seiner Zeit · {daten.zyklus}</Leise>
    </div>
  );
};

/** ein gesprochener Satz: gross in der Serifenschrift, oben die Kennzeile */
const Satz: React.FC<{ text: string; dauer: number }> = ({ text, dauer }) => {
  const f = useCurrentFrame();
  const lang = text.length > 110;
  return (
    <div style={{ position: "absolute", left: 90, right: 90, top: lang ? 560 : 640, opacity: blende(f, 0, dauer, 8), translate: `0 ${steig(f, 0, 14)}px` }}>
      <div style={{ fontFamily: SERIF, fontSize: lang ? 60 : 68, lineHeight: 1.3, color: FARBE.text, textWrap: "pretty" }}>{text}</div>
    </div>
  );
};

/** der Leitsatz des Zettels, still, kursiv */
const Leitsatz: React.FC<{ dauer: number }> = ({ dauer }) => {
  const f = useCurrentFrame();
  return (
    <div style={{ position: "absolute", left: 90, right: 90, top: 660, opacity: blende(f, 0, dauer), translate: `0 ${steig(f, 0)}px`, display: "flex", flexDirection: "column", gap: 30 }}>
      <Marke>Leitsatz</Marke>
      <div style={{ fontFamily: SERIF, fontStyle: "italic", fontSize: 70, lineHeight: 1.25, color: FARBE.text, textWrap: "balance" }}>{daten.leitsatz}</div>
    </div>
  );
};

/** Kennzeile oben, solange der Text läuft */
const Kopfzeile: React.FC<{ dauer: number }> = ({ dauer }) => {
  const f = useCurrentFrame();
  return <Oben o={blende(f, 0, dauer)} y={0}><Marke>{kennzeile}</Marke></Oben>;
};

export const Zettel33Video: React.FC = () => (
  <Grund>
    <Sequence durationInFrames={INTRO}><Intro kopf={{ titel: `ZETTEL ${daten.nummer}`, unter: ["zu seiner zeit", "kunst"] }} /></Sequence>
    <Sequence from={TON} durationInFrames={sprechEnde - TON + 6}><Audio src={staticFile("zettel-33/stimme.mp3")} /></Sequence>
    <Sequence from={T.titel} durationInFrames={ab[0] - T.titel}><TitelSzene dauer={ab[0] - T.titel} /></Sequence>
    <Sequence from={ab[0]} durationInFrames={T.leitsatz - ab[0]}><Kopfzeile dauer={T.leitsatz - ab[0]} /></Sequence>
    {daten.abschnitte.map((a, i) => {
      const bis = i + 1 < ab.length ? ab[i + 1] : sprechEnde + 6;
      return <Sequence key={i} from={ab[i]} durationInFrames={bis - ab[i]}><Satz text={a.text} dauer={bis - ab[i]} /></Sequence>;
    })}
    <Sequence from={T.leitsatz} durationInFrames={T.signet - T.leitsatz}><Leitsatz dauer={T.signet - T.leitsatz} /></Sequence>
    <Sequence from={T.signet} durationInFrames={OUTRO}><Outro /></Sequence>
  </Grund>
);
