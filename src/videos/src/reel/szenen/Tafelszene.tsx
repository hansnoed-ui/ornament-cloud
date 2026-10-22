// Eine Antwort mit einer lebenden Tafel der Website: Satz oben, die Tafel gross, darunter die Station des Wegs.
import React from "react";
import { interpolate, useCurrentFrame } from "remotion";
import { Grund, LebendeTafel, Modus, RAND, Schlagzeile, Unterzeile, klemm, weich } from "../Teile";

export const Tafelszene: React.FC<{ m: Modus; satz: string; slug: string; vorlauf?: number; keim?: boolean; a: { name: string; text: string; zeichen: string } }> = ({ m, satz, slug, vorlauf, keim, a }) => {
  const f = useCurrentFrame();
  return (
    <Grund m={m}>
      <Schlagzeile f={f} text={satz} groesse={100} style={{ position: "absolute", left: RAND, right: RAND, top: 230 }} />
      <div style={{ position: "absolute", left: 70, top: 470, opacity: interpolate(f, [4, 14], [0, 1], klemm), scale: interpolate(f, [4, 30], [0.86, 1], { ...klemm, easing: weich }) }}>
        <LebendeTafel slug={slug} f={f} m={m} groesse={940} vorlauf={vorlauf} keim={keim} />
      </div>
      <Unterzeile f={f} a={22} m={m} {...a} style={{ position: "absolute", left: RAND, right: RAND, top: 1450 }} />
    </Grund>
  );
};
