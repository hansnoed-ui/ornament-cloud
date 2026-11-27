// «Formenfahrt» (27. November 2026): eine ruhige Kamerafahrt ohne Schnitt durch Formen aus dem Katalog von ORNAMENT FORMEN, 4:5, 45 s, ohne Ton.
// Wunsch: «mach noch ein anderes, flüssigeres video mit einer fahrt durch verschiedene formen, ohne text (mit intro und outro), ca 45 sekunden»;
// Plan freigegeben («ja, so machen»). Die Fahrt rendert bild/render.mjs Bild für Bild nach public/formenfahrt/ (nicht eingecheckt).
// Intro und Outro wie beim Video «Eigenzeit»: das Signet auf dem dunklen Grund der Formen, der Punkt in Messing; im Intro als einziges Wort
// «Ornament Formen» in Messing (die Kopfzeile des Signets ist fest im Rot-Orange).
import React from "react";
import { AbsoluteFill, Img, Sequence, interpolate, staticFile, useCurrentFrame } from "remotion";
import { Grund, INTRO, OUTRO, klemm, weich } from "../vorlage/Bausteine";
import { Signet } from "../vorlage/Signet";
import { SANS } from "../vorlage/stil";

export const HOEHE = 1350;
/** Einzelbilder in public/formenfahrt/ (f0000.jpg …, 1080 × 1350): 36 s Fahrt, wie BILDER in bild/render.mjs */
export const BILDER = 1080;
export const T = { intro: 0, fahrt: INTRO, outro: INTRO + BILDER, ende: INTRO + BILDER + OUTRO };

const C = { grund: "#151412", text: "#f4f1ea", akzent: "#d4a650" };
const SIGNET = { grund: C.grund, tinte: C.text, punkt: C.akzent };

const Mitte: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <AbsoluteFill style={{ overflow: "hidden", backgroundColor: C.grund }}>
    <div style={{ position: "absolute", left: 0, width: 1080, height: 1920, top: (HOEHE - 1920) / 2 }}>{children}</div>
  </AbsoluteFill>
);

const Anfang: React.FC = () => {
  const f = useCurrentFrame();
  return (
    <AbsoluteFill style={{ opacity: interpolate(f, [INTRO - 14, INTRO], [1, 0], klemm) }}>
      <Mitte><Signet tempo={2} stil={SIGNET} /></Mitte>
      <div style={{ position: "absolute", left: 0, right: 0, top: 236, textAlign: "center", fontFamily: SANS, fontWeight: 600, fontSize: 44,
        letterSpacing: "0.22em", marginRight: "-0.22em", textTransform: "uppercase", color: C.akzent,
        opacity: interpolate(f, [8, 30], [0, 1], klemm), translate: `0 ${interpolate(f, [8, 30], [16, 0], { ...klemm, easing: weich })}px` }}>
        Ornament Formen
      </div>
    </AbsoluteFill>
  );
};

const Fahrt: React.FC = () => {
  const f = useCurrentFrame();
  const i = Math.min(BILDER - 1, Math.max(0, f));
  return (
    <AbsoluteFill style={{ opacity: interpolate(f, [0, 16, BILDER - 20, BILDER], [0, 1, 1, 0], klemm) }}>
      <Img src={staticFile(`formenfahrt/f${String(i).padStart(4, "0")}.jpg`)} style={{ width: 1080, height: HOEHE, display: "block" }} />
    </AbsoluteFill>
  );
};

export const FormenfahrtVideo: React.FC = () => (
  <Grund>
    <AbsoluteFill style={{ backgroundColor: C.grund }} />
    <Sequence from={T.fahrt} durationInFrames={BILDER} layout="none"><Fahrt /></Sequence>
    <Sequence durationInFrames={INTRO}><Anfang /></Sequence>
    <Sequence from={T.outro} durationInFrames={OUTRO}><Mitte><Signet stil={SIGNET} /></Mitte></Sequence>
  </Grund>
);
