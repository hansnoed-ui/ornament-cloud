// Schluss (Papier): das Signet zeichnet sich, der Name, und die Frage als Knopf – die Einladung auf die Seite.
import React from "react";
import { interpolate, useCurrentFrame } from "remotion";
import daten from "../data/reel.json";
import { Signet } from "../../neubau/Teile";
import { C, Grund, klemm, weich } from "../Teile";

export const SCHLUSS = 120;

export const Schluss: React.FC = () => {
  const f = useCurrentFrame();
  const c = C("hell");
  return (
    <Grund m="hell">
      <div style={{ position: "absolute", left: 270, top: 430 }}>
        <Signet groesse={540} dicke={7} c={c}
          gezeichnet={interpolate(f, [0, 34], [0, 1], { ...klemm, easing: weich })}
          fuellung={interpolate(f, [28, 40], [0, 1], klemm)}
          lauf={interpolate(f, [0, 34], [0, 1], { ...klemm, easing: weich }) + interpolate(f, [34, 120], [0, 0.3], klemm)}
          b={0.45 + 0.25 * interpolate(f, [0, 120], [0, 1], { ...klemm, easing: weich })} />
      </div>
      <div style={{ position: "absolute", left: 0, right: 0, top: 1080, textAlign: "center", fontWeight: 500, fontSize: 104, letterSpacing: "-0.01em",
        opacity: interpolate(f, [22, 32], [0, 1], klemm), translate: `0 ${interpolate(f, [22, 40], [30, 0], { ...klemm, easing: weich })}px` }}>
        {daten.name}
      </div>
      <div style={{ position: "absolute", left: 0, right: 0, top: 1260, display: "flex", justifyContent: "center", opacity: interpolate(f, [40, 50], [0, 1], klemm),
        scale: interpolate(f, [40, 56], [0.9, 1], { ...klemm, easing: weich }) }}>
        <div style={{ fontSize: 56, padding: "18px 44px 22px", borderRadius: 999, backgroundColor: c.tinte, color: c.papier }}>{daten.frage}</div>
      </div>
    </Grund>
  );
};
