// «Ein Bild will sich bewegen.» (Tinte): vier Schnitte auf den Schlag, im Wechsel aus zwei Läufen von Christian –
// PHORMA I (Ablauf «Verwandlung»: Glaskörper, Scherben) und PHORMA III (Lichtwürfel, Fäden aus Klang); die Enden der Läufe (das frühere Signet) bleiben draussen.
import React from "react";
import { Sequence, interpolate, staticFile, useCurrentFrame } from "remotion";
import { Video } from "@remotion/media";
import daten from "../data/reel.json";
import { C, Grund, RAND, Schlagzeile, Unterzeile, klemm, weich } from "../Teile";

export const SCHUSS = 45;   // drei Schläge je Schnitt
const B = 900, H = (B * 5) / 4;
// [Lauf, Beginn im Lauf (Bilder), welche Unterzeile]
const SCHNITTE: ["phorma-i-lauf" | "phorma-iii-lauf", number, "a" | "b"][] = [
  ["phorma-i-lauf", 285, "a"],     // Glaskörper
  ["phorma-iii-lauf", 60, "b"],    // ein Würfel, die Fäden wachsen
  ["phorma-i-lauf", 420, "a"],     // Scherben
  ["phorma-iii-lauf", 228, "b"],   // drei Würfel
];
export const BILD = SCHNITTE.length * SCHUSS;

export const Bild: React.FC = () => {
  const f = useCurrentFrame();
  const c = C("dunkel");
  const i = Math.min(SCHNITTE.length - 1, Math.floor(f / SCHUSS));
  return (
    <Grund m="dunkel">
      <Schlagzeile f={f} text={daten.bild.satz} groesse={100} style={{ position: "absolute", left: RAND, right: RAND, top: 230 }} />
      <div style={{ position: "absolute", left: (1080 - B) / 2, top: 470, width: B, height: H, overflow: "hidden", backgroundColor: c.papier, outline: `2px solid ${c.linie}`,
        clipPath: `inset(${interpolate(f, [4, 20], [100, 0], { ...klemm, easing: weich })}% 0 0 0)` }}>
        {SCHNITTE.map(([lauf, ab], k) => (
          <Sequence key={k} from={k * SCHUSS} durationInFrames={SCHUSS} layout="absolute-fill">
            <Video src={staticFile(`reel/${lauf}.mp4`)} trimBefore={ab} muted objectFit="cover"
              style={{ width: "100%", height: "100%", scale: interpolate(f - k * SCHUSS, [0, SCHUSS], [1.08, 1], { ...klemm, easing: weich }) }} />
          </Sequence>
        ))}
      </div>
      {/* die Unterzeile wechselt mit der App; neu eingeblendet, wenn die App wechselt */}
      <Unterzeile key={i} f={f} a={i === 0 ? 18 : i * SCHUSS} m="dunkel" {...daten.bild[SCHNITTE[i][2]]} style={{ position: "absolute", left: RAND, right: RAND, top: 470 + H + 40 }} />
    </Grund>
  );
};
