// Auftakt (Tinte): ein blauer Punkt im Dunkel, er zieht die Schlaufe des Signets; dann die Frage der Startseite, Wort für Wort auf den Schlag.
import React from "react";
import { interpolate, useCurrentFrame } from "remotion";
import daten from "../data/reel.json";
import { Signet } from "../../neubau/Teile";
import { C, Grund, RAND, Schlagzeile, klemm, weich } from "../Teile";

export const AUFTAKT = 90;

export const Auftakt: React.FC = () => {
  const f = useCurrentFrame();
  const c = C("dunkel");
  return (
    <Grund m="dunkel">
      <div style={{ position: "absolute", left: RAND - 10, top: 430, scale: interpolate(f, [0, 30], [1.6, 1], { ...klemm, easing: weich }), transformOrigin: "30% 50%" }}>
        <Signet groesse={300} dicke={6} c={c}
          gezeichnet={interpolate(f, [4, 26], [0, 1], { ...klemm, easing: weich })}
          fuellung={interpolate(f, [0, 4], [0, 1], klemm)}
          lauf={interpolate(f, [4, 26], [0, 1], { ...klemm, easing: weich }) + interpolate(f, [26, 90], [0, 0.25], klemm)}
          b={0.55} />
      </div>
      <Schlagzeile f={f} text={daten.frage} a={18} s={8} groesse={176} style={{ position: "absolute", left: RAND, right: RAND, top: 820, lineHeight: 0.98 }}
        farbe={(i) => (i === 3 ? c.faden : undefined)} />
    </Grund>
  );
};
