// «Spielen»: die sieben Apps mit ihren Zeichen, eine nach der anderen.
import React from "react";
import { interpolate, useCurrentFrame } from "remotion";
import daten from "../data/neubau.json";
import { Abschnitt, Linie, OBEN, Papier, RAND, Zeichen, ein, klemm } from "../Teile";

export const SPIELEN = 210;

export const Spielen: React.FC = () => {
  const f = useCurrentFrame();
  return (
    <Papier>
      <Abschnitt f={f} zeichen={daten.spielen.zeichen} titel={daten.spielen.titel} text={daten.spielen.text} />
      <div style={{ position: "absolute", left: RAND, right: RAND, top: OBEN + 340 }}>
        {daten.spielen.apps.map((a, i) => {
          const s = 30 + i * 12;
          return (
            <div key={a.name}>
              <Linie f={f} a={s - 4} />
              <div style={{ padding: "26px 0", display: "flex", gap: 30, alignItems: "center" }}>
                <div style={{ opacity: interpolate(f, [s, s + 8], [0, 1], klemm) }}>
                  <Zeichen markup={a.zeichen} groesse={66} p={interpolate(f, [s, s + 24], [0, 1], klemm)} dicke={4} />
                </div>
                <div style={{ fontWeight: 500, fontSize: 58, letterSpacing: "-0.01em", ...ein(f, s + 4) }}>{a.name}</div>
              </div>
            </div>
          );
        })}
        <Linie f={f} a={30 + 7 * 12} />
      </div>
    </Papier>
  );
};
