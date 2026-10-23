// «Gestalten, vermitteln, kuratieren.»: drei Schläge, drei Wörter, Papier und Tinte kippen bei jedem Schnitt; Komma und Punkt in der Blaupause.
import React from "react";
import { interpolate, useCurrentFrame } from "remotion";
import daten from "../data/reel.json";
import { useLage } from "../Format";
import { C, Grund, Modus, klemm, weich } from "../Teile";

export const SCHLAG = 30;
export const TITEL = SCHLAG * 3;

export const Titel: React.FC = () => {
  const f = useCurrentFrame();
  const i = Math.min(2, Math.floor(f / SCHLAG));
  const m: Modus = i % 2 === 0 ? "hell" : "dunkel";
  const wort = daten.titel[i];
  const L = useLage();
  // so gross, dass das Wort mit Komma in die Breite passt (Instrument Sans 500, gesperrt: etwa 0,5 em je Zeichen)
  const g = Math.min(L.quer ? 300 : 216, (L.w - 2 * L.rand) / ((wort.length + 1) * 0.5));
  return (
    <Grund m={m}>
      <div style={{ position: "absolute", left: L.rand - 6, right: 0, top: L.mitteY - g * 0.75, fontWeight: 500, fontSize: g, letterSpacing: "-0.045em", lineHeight: 1, whiteSpace: "nowrap",
        scale: interpolate(f - i * SCHLAG, [0, SCHLAG], [1.08, 1], { ...klemm, easing: weich }), transformOrigin: "0 50%" }}>
        {wort}<span style={{ color: C(m).faden }}>{i < 2 ? "," : "."}</span>
      </div>
      <div style={{ position: "absolute", left: L.rand, top: L.mitteY + g * 0.55, display: "flex", gap: 14 }}>
        {[0, 1, 2].map((k) => <div key={k} style={{ width: 60, height: 6, backgroundColor: k <= i ? C(m).faden : C(m).linie }} />)}
      </div>
    </Grund>
  );
};
