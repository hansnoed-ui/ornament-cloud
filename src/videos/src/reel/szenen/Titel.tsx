// «Gestalten, vermitteln, kuratieren.»: drei Schläge, drei Wörter, Papier und Tinte kippen bei jedem Schnitt; Komma und Punkt in der Blaupause.
import React from "react";
import { interpolate, useCurrentFrame } from "remotion";
import daten from "../data/reel.json";
import { C, Grund, Modus, RAND, klemm, weich } from "../Teile";

export const SCHLAG = 30;
export const TITEL = SCHLAG * 3;

export const Titel: React.FC = () => {
  const f = useCurrentFrame();
  const i = Math.min(2, Math.floor(f / SCHLAG));
  const m: Modus = i % 2 === 0 ? "hell" : "dunkel";
  const g = f - i * SCHLAG;
  const wort = daten.titel[i];
  return (
    <Grund m={m}>
      <div style={{ position: "absolute", left: RAND - 6, right: 0, top: 800, fontWeight: 500, fontSize: wort.length > 9 ? 196 : 216, letterSpacing: "-0.045em", lineHeight: 1, whiteSpace: "nowrap",
        scale: interpolate(g, [0, SCHLAG], [1.08, 1], { ...klemm, easing: weich }), transformOrigin: "0 50%" }}>
        {wort}<span style={{ color: C(m).faden }}>{i < 2 ? "," : "."}</span>
      </div>
      <div style={{ position: "absolute", left: RAND, top: 1100, display: "flex", gap: 14 }}>
        {[0, 1, 2].map((k) => <div key={k} style={{ width: 60, height: 6, backgroundColor: k <= i ? C(m).faden : C(m).linie }} />)}
      </div>
    </Grund>
  );
};
