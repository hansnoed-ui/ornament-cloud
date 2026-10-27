// «Fahrt» (27. Oktober 2026): eine 360°-Kamerafahrt um ein 3D-Modell, das aus einem Bild entstanden ist, mit Lab-Intro und -Outro.
// Wunsch: «eine 360 grad kamerafahrt um das portrait». Das Modell rechnet TRELLIS, Hunyuan3D oder Stable Fast 3D (Hugging Face) aus dem Bild,
// die Fahrt rendert Three.js (modell/, Kamera auf einer Kreisbahn, Lichter fahren mit); die Einzelbilder liegen in public/fahrt-<verfahren>/
// (nicht eingecheckt), siehe README.
// Format 4:5 wie «Wissen», Intro und Outro aus wissen/LabSignet.tsx.
import React from "react";
import { AbsoluteFill, Img, Sequence, continueRender, delayRender, interpolate, staticFile, useCurrentFrame } from "remotion";
import { schriften } from "../vorlage/stil";
import { LabSignet } from "../wissen/LabSignet";
import { LAB } from "../wissen/farben";

const klemm = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;
/** Zahl der Bilder in public/fahrt-<verfahren>/ (f0000.png …); eine volle Umdrehung */
export const BILDER = 300;
export const T = { intro: 0, fahrt: 105, outro: 105 + BILDER, ende: 105 + BILDER + 150 };

const Fahrt: React.FC<{ ordner: string }> = ({ ordner }) => {
  const f = useCurrentFrame();
  const i = Math.min(BILDER - 1, Math.max(0, f));
  return (
    <AbsoluteFill style={{ opacity: interpolate(f, [0, 16, BILDER - 16, BILDER], [0, 1, 1, 0], klemm) }}>
      <Img src={staticFile(`${ordner}/f${String(i).padStart(4, "0")}.png`)} style={{ width: 1080, height: 1350 }} />
    </AbsoluteFill>
  );
};

/** ordner: Unterordner von public/ mit den Einzelbildern (fahrt-trellis, fahrt-hunyuan, fahrt-sf3d) */
export const FahrtVideo: React.FC<{ ordner?: string }> = ({ ordner = "fahrt-trellis" }) => {
  const [handle] = React.useState(() => delayRender("Schriften"));
  React.useEffect(() => { schriften.then(() => continueRender(handle)); }, [handle]);
  return (
    <AbsoluteFill style={{ backgroundColor: LAB.grund }}>
      <Sequence from={T.intro} durationInFrames={T.fahrt + 10} layout="none"><LabSignet dauer={T.fahrt + 10} tempo={1.4} /></Sequence>
      <Sequence from={T.fahrt} durationInFrames={BILDER} layout="none"><Fahrt ordner={ordner} /></Sequence>
      <Sequence from={T.outro - 6} durationInFrames={T.ende - T.outro + 6} layout="none"><LabSignet dauer={T.ende - T.outro + 60} /></Sequence>
    </AbsoluteFill>
  );
};
