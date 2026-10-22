// «Ein Bild will sich bewegen.» (Tinte): echte Läufe aus PHORMA II und The Fictory, im Rahmen aufgedeckt, auf den Schlag geschnitten.
import React from "react";
import { Sequence, interpolate, staticFile, useCurrentFrame } from "remotion";
import { Video } from "@remotion/media";
import daten from "../data/reel.json";
import { C, Grund, RAND, Schlagzeile, Unterzeile, klemm, weich } from "../Teile";

export const BILD = 135;
const SCHNITT = 75;
const B = 760, H = Math.round((B * 676) / 540);

export const Bild: React.FC = () => {
  const f = useCurrentFrame();
  const c = C("dunkel");
  return (
    <Grund m="dunkel">
      <Schlagzeile f={f} text={daten.bild.satz} groesse={100} style={{ position: "absolute", left: RAND, right: RAND, top: 230 }} />
      <div style={{ position: "absolute", left: (1080 - B) / 2, top: 500, width: B, height: H, overflow: "hidden", backgroundColor: c.linie,
        clipPath: `inset(${interpolate(f, [6, 22], [100, 0], { ...klemm, easing: weich })}% 0 0 0)` }}>
        <Sequence durationInFrames={SCHNITT} layout="absolute-fill">
          <Video src={staticFile("reel/phorma-ii.mp4")} trimBefore={195} muted objectFit="cover" style={{ width: "100%", height: "100%", scale: interpolate(f, [0, SCHNITT], [1.12, 1.02]) }} />
        </Sequence>
        <Sequence from={SCHNITT} layout="absolute-fill">
          <Video src={staticFile("reel/the-fictory.mp4")} trimBefore={360} muted objectFit="cover" style={{ width: "100%", height: "100%", scale: interpolate(f, [SCHNITT, BILD], [1.02, 1.1]) }} />
        </Sequence>
      </div>
      <div style={{ position: "absolute", left: RAND, right: RAND, top: 500 + H + 44 }}>
        {f < SCHNITT
          ? <Unterzeile f={f} a={20} m="dunkel" {...daten.bild.a} />
          : <Unterzeile f={f} a={SCHNITT} m="dunkel" {...daten.bild.b} />}
      </div>
    </Grund>
  );
};
