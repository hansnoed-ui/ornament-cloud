// Video «untitled»: ein Bild von Cézanne zerfällt in Farbflächen, daraus wird ein Karussell von Farbfeldern,
// das in einen schwarzen Strudel abfliesst, auf dem eine Performerin Jet-Ski fährt.
// Der Film in der Mitte ist ein mit Seedance erzeugter Clip (30 s, 9:16), hochgerendert auf 1080 × 1920
// und als public/untitled/clip.mp4 abgelegt (nicht eingecheckt, siehe README). Ohne Ton wie alle Videos.
import React from "react";
import { AbsoluteFill, OffthreadVideo, Sequence, interpolate, staticFile, useCurrentFrame } from "remotion";
import { Grund, INTRO, Intro, OUTRO, Outro, klemm } from "../vorlage/Bausteine";

export const CLIP = 900; // Bilder (30 s)

// Zeitplan in Bildern (30 fps): jede Szene beginnt, wo die vorige endet
export const T = { intro: 0, clip: INTRO, signet: INTRO + CLIP, ende: INTRO + CLIP + OUTRO };

/** Der Seedance-Clip, aus dem hellen Grund ein- und am Ende wieder ausgeblendet (12 Bilder) */
const Clip: React.FC = () => {
  const f = useCurrentFrame();
  const o = interpolate(f, [0, 12, CLIP - 12, CLIP], [0, 1, 1, 0], klemm);
  return (
    <AbsoluteFill style={{ opacity: o }}>
      <OffthreadVideo src={staticFile("untitled/clip.mp4")} muted style={{ width: "100%", height: "100%", objectFit: "cover" }} />
    </AbsoluteFill>
  );
};

export const UntitledVideo: React.FC = () => (
  <Grund>
    <Sequence durationInFrames={INTRO}><Intro kopf={{ titel: "Untitled", unter: ["Cézanne", "Rothko", "Kapoor", "Holzinger"] }} /></Sequence>
    <Sequence from={T.clip} durationInFrames={CLIP}><Clip /></Sequence>
    <Sequence from={T.signet} durationInFrames={OUTRO}><Outro /></Sequence>
  </Grund>
);
