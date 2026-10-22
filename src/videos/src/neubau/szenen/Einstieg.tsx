// Einstieg wie auf der Startseite: «Gestalten, vermitteln, kuratieren.», Wort für Wort; darunter der erste Satz des Leads in Grau,
// unten das atmende Signet (auf der Seite rechts neben dem Titel).
import React from "react";
import { interpolate, useCurrentFrame } from "remotion";
import daten from "../data/neubau.json";
import { F, OBEN, Papier, RAND, Signet, ein, klemm } from "../Teile";

export const EINSTIEG = 180;

export const Einstieg: React.FC = () => {
  const f = useCurrentFrame();
  const woerter = daten.einstieg.titel.split(" ");
  return (
    <Papier>
      <div style={{ position: "absolute", left: RAND, right: RAND, top: OBEN + 70, fontWeight: 500, fontSize: 132, letterSpacing: "-0.025em", lineHeight: 1 }}>
        {woerter.map((w, i) => <div key={w} style={ein(f, 8 + i * 10, 22)}>{w}</div>)}
      </div>
      <div style={{ position: "absolute", left: RAND, right: RAND, top: OBEN + 520, fontSize: 48, lineHeight: 1.3, color: F.grau, textWrap: "pretty", ...ein(f, 44) }}>
        {daten.einstieg.lead}
      </div>
      <div style={{ position: "absolute", left: 290, top: 1230, opacity: interpolate(f, [50, 70], [0, 1], klemm) }}>
        <Signet groesse={500} dicke={5} gezeichnet={interpolate(f, [50, 110], [0, 1], klemm)} fuellung={interpolate(f, [100, 116], [0, 1], klemm)} lauf={interpolate(f, [100, 340], [0, 1])} b={0.6 + 0.3 * Math.sin(f / 30)} />
      </div>
    </Papier>
  );
};
