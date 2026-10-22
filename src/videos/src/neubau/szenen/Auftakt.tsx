// Auftakt: das Signet zeichnet sich gross, die innere Schleife füllt sich in der Blaupause, der Punkt beginnt zu laufen; darunter der Name.
import React from "react";
import { interpolate, useCurrentFrame } from "remotion";
import daten from "../data/neubau.json";
import { Papier, Signet, ein, klemm, weich } from "../Teile";

export const AUFTAKT = 105;

export const Auftakt: React.FC = () => {
  const f = useCurrentFrame();
  return (
    <Papier>
      <div style={{ position: "absolute", left: 230, top: 520 }}>
        <Signet
          groesse={620} dicke={7}
          gezeichnet={interpolate(f, [4, 58], [0, 1], { ...klemm, easing: weich })}
          fuellung={interpolate(f, [52, 68], [0, 1], klemm)}
          lauf={interpolate(f, [58, 180], [0, 1], klemm)}
          b={interpolate(f, [0, 105], [0.45, 0.7], { ...klemm, easing: weich })}
        />
      </div>
      <div style={{ position: "absolute", left: 0, right: 0, top: 1290, textAlign: "center", fontWeight: 500, fontSize: 84, letterSpacing: "0.01em", ...ein(f, 46, 22) }}>
        {daten.name}
      </div>
    </Papier>
  );
};
