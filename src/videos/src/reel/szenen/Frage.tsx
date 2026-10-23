// «Eine Frage, die ein Gegenüber sucht» (Tinte): die lebende Tafel von ORNA dreht, die Ringe stehen, die Begegnung leuchtet;
// dann rückt das Rad nach oben und die Konstellation steht darunter: Künstlerin × Theoretiker und ihre Frage (unverändert aus den Daten von ORNA).
import React from "react";
import { interpolate, useCurrentFrame } from "remotion";
import daten from "../data/reel.json";
import { SERIF } from "../../neubau/Teile";
import { C, Grund, LebendeTafel, RAND, Schlagzeile, Unterzeile, klemm, weich } from "../Teile";

export const FRAGE = 210;
const STEHT = 118;   // die Ringe stehen, die Begegnung erscheint (ORNA dreht 3,6 s ab 2,4 s; Vorlauf 2,35 s)

export const Frage: React.FC = () => {
  const f = useCurrentFrame();
  const c = C("dunkel");
  const k = daten.frage2.konstellation;
  const rueck = interpolate(f, [STEHT + 6, STEHT + 28], [0, 1], { ...klemm, easing: weich });
  return (
    <Grund m="dunkel">
      <Schlagzeile f={f} text={daten.frage2.satz} groesse={100} style={{ position: "absolute", left: RAND, right: RAND, top: 230 }} />
      <Unterzeile f={f} a={14} m="dunkel" {...daten.frage2.a} style={{ position: "absolute", left: RAND, right: RAND, top: 470 }} />
      <div style={{ position: "absolute", left: 90, top: 610, width: 900, height: 900, opacity: interpolate(f, [4, 14], [0, 1], klemm),
        scale: interpolate(f, [4, 30], [0.86, 1], { ...klemm, easing: weich }) * interpolate(rueck, [0, 1], [1, 0.62]), transformOrigin: "50% 0" }}>
        <LebendeTafel slug="orna" f={f} m="dunkel" groesse={900} vorlauf={2.35} />
      </div>
      <div style={{ position: "absolute", left: RAND, right: RAND, top: 1240, opacity: rueck, translate: `0 ${interpolate(rueck, [0, 1], [40, 0])}px` }}>
        <div style={{ fontSize: 44, fontWeight: 500, letterSpacing: "-0.01em" }}>
          {k.kuenstler} <span style={{ color: c.faden }}>×</span> {k.theoretiker}
        </div>
        <div style={{ marginTop: 22, fontFamily: SERIF, fontStyle: "italic", fontSize: 92, lineHeight: 1.1, textWrap: "balance",
          opacity: interpolate(f, [STEHT + 24, STEHT + 34], [0, 1], klemm), translate: `0 ${interpolate(f, [STEHT + 24, STEHT + 42], [24, 0], { ...klemm, easing: weich })}px` }}>
          {k.frage}
        </div>
      </div>
    </Grund>
  );
};
