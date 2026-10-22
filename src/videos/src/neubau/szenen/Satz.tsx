// Der Satz zwischen den Leistungen und dem Zettelkasten, in der Serife wie auf der Startseite.
import React from "react";
import { useCurrentFrame } from "remotion";
import daten from "../data/neubau.json";
import { F, Papier, RAND, SERIF, ein } from "../Teile";

export const SATZ = 165;

export const Satz: React.FC = () => {
  const f = useCurrentFrame();
  return (
    <Papier>
      <div style={{ position: "absolute", left: RAND, right: RAND, top: 620, fontFamily: SERIF }}>
        <div style={{ fontSize: 112, lineHeight: 1.08, letterSpacing: "-0.01em", textWrap: "balance", ...ein(f, 6, 24) }}>{daten.satz.kurz}</div>
        <div style={{ marginTop: 56, fontSize: 56, lineHeight: 1.3, color: F.grau, textWrap: "pretty", ...ein(f, 34, 24) }}>{daten.satz.lang}</div>
      </div>
    </Papier>
  );
};
