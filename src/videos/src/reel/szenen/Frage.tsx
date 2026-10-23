// «Eine Frage, die ein Gegenüber sucht» (Tinte): die lebende Tafel von ORNA dreht, die Ringe stehen, die Begegnung leuchtet;
// dann rückt das Rad nach oben und die Konstellation steht darunter: Künstlerin × Theoretiker und ihre Frage (unverändert aus den Daten von ORNA).
// Im Querformat bleibt das Rad rechts stehen, die Konstellation kommt links unter die Unterzeile.
import React from "react";
import { interpolate, useCurrentFrame } from "remotion";
import daten from "../data/reel.json";
import { SERIF } from "../../neubau/Teile";
import { useLage } from "../Format";
import { C, Grund, LebendeTafel, Textspalte, Unterzeile, klemm, weich } from "../Teile";

export const FRAGE = 210;
const STEHT = 118;   // die Ringe stehen, die Begegnung erscheint (ORNA dreht 3,6 s ab 2,4 s; Vorlauf 2,35 s)

export const Frage: React.FC = () => {
  const f = useCurrentFrame();
  const c = C("dunkel");
  const k = daten.frage2.konstellation;
  const L = useLage();
  const rueck = interpolate(f, [STEHT + 6, STEHT + 28], [0, 1], { ...klemm, easing: weich });
  const S = Math.min(L.bild.b, L.bild.h);              // Seite des Rads
  const klein = L.quer ? 1 : 0.62;                     // so klein wird es, wenn die Konstellation erscheint
  const fragGr = L.quer ? 84 : { "9:16": 92, "4:5": 78, "1:1": 62, "16:9": 84 }[L.format];
  const konstellation = (
    <div style={{ opacity: rueck, translate: `0 ${interpolate(rueck, [0, 1], [40, 0])}px`, marginTop: L.quer ? 30 : 0 }}>
      <div style={{ fontSize: L.quer ? 38 : 44, fontWeight: 500, letterSpacing: "-0.01em", whiteSpace: "nowrap" }}>
        {k.kuenstler} <span style={{ color: c.faden }}>×</span> {k.theoretiker}
      </div>
      <div style={{ marginTop: 22, fontFamily: SERIF, fontStyle: "italic", fontSize: fragGr, lineHeight: 1.1, textWrap: "balance",
        opacity: interpolate(f, [STEHT + 24, STEHT + 34], [0, 1], klemm), translate: `0 ${interpolate(f, [STEHT + 24, STEHT + 42], [24, 0], { ...klemm, easing: weich })}px` }}>
        {k.frage}
      </div>
    </div>
  );
  return (
    <Grund m="dunkel">
      <Textspalte f={f} satz={daten.frage2.satz} groesse={L.kopf.gr * 0.88}>
        <Unterzeile f={f} a={14} m="dunkel" {...daten.frage2.a} />
        {L.quer ? konstellation : null}
      </Textspalte>
      <div style={{ position: "absolute", left: L.bild.x + (L.bild.b - S) / 2, top: L.bild.y, width: S, height: S, opacity: interpolate(f, [4, 14], [0, 1], klemm),
        scale: interpolate(f, [4, 30], [0.86, 1], { ...klemm, easing: weich }) * interpolate(rueck, [0, 1], [1, klein]), transformOrigin: "50% 0" }}>
        <LebendeTafel slug="orna" f={f} m="dunkel" groesse={S} vorlauf={2.35} />
      </div>
      {L.quer ? null : <div style={{ position: "absolute", left: L.rand, right: L.rand, top: L.bild.y + S * klein + 40 }}>{konstellation}</div>}
    </Grund>
  );
};
