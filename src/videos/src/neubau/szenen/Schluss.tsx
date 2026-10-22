// Schluss: das Signet atmet, der Punkt läuft; darunter der Name und der Satz aus der Beschreibung der Seite.
import React from "react";
import { interpolate, useCurrentFrame } from "remotion";
import daten from "../data/neubau.json";
import { F, Papier, RAND, SERIF, Signet, ein, klemm, weich } from "../Teile";

export const SCHLUSS = 165;

export const Schluss: React.FC = () => {
  const f = useCurrentFrame();
  return (
    <Papier>
      <div style={{ position: "absolute", left: 260, top: 470 }}>
        <Signet groesse={560} dicke={6}
          gezeichnet={interpolate(f, [0, 40], [0, 1], { ...klemm, easing: weich })}
          fuellung={interpolate(f, [34, 48], [0, 1], klemm)}
          lauf={interpolate(f, [40, 260], [0, 1])}
          b={0.6 + 0.3 * Math.sin(f / 26)} />
      </div>
      <div style={{ position: "absolute", left: RAND, right: RAND, top: 1170, textAlign: "center" }}>
        <div style={{ fontWeight: 500, fontSize: 84, letterSpacing: "0.01em", ...ein(f, 30, 22) }}>{daten.name}</div>
        <div style={{ marginTop: 34, fontFamily: SERIF, fontStyle: "italic", fontSize: 54, lineHeight: 1.25, color: F.grau, textWrap: "balance", ...ein(f, 48, 22) }}>{daten.claim}</div>
      </div>
    </Papier>
  );
};
