// «Etwas soll gebaut werden.» (Tinte): ein Telefon kippt ins Bild und blättert durch die echte Startseite /b/.
import React from "react";
import { Img, interpolate, staticFile, useCurrentFrame } from "remotion";
import daten from "../data/reel.json";
import { C, Grund, RAND, Schlagzeile, Unterzeile, klemm, weich } from "../Teile";

export const AUFTRAG = 150;
const BREITE = 600, RAHMEN = 16, SCHIRM = BREITE - 2 * RAHMEN;
// Lage der Abschnitte in der Aufnahme (CSS-Pixel), von aufnahme.mjs über daten.mjs
const stellen = daten.stellen;
const m = SCHIRM / stellen.breite;   // CSS-Pixel → Bildpunkte im Video

export const Auftrag: React.FC = () => {
  const f = useCurrentFrame();
  const c = C("dunkel");
  const y = interpolate(f, [0, 30, 58, 84, 112, 150], [0, 0, stellen.angebote - 40, stellen.angebote - 40, stellen.feld - 40, stellen.feld + 140],
    { ...klemm, easing: weich }) * m;
  return (
    <Grund m="dunkel">
      <Schlagzeile f={f} text={daten.auftrag.satz} groesse={100} style={{ position: "absolute", left: RAND, right: RAND, top: 230 }} />
      <Unterzeile f={f} a={16} m="dunkel" {...daten.auftrag.a} style={{ position: "absolute", left: RAND, right: RAND, top: 470 }} />
      <div style={{
        position: "absolute", left: (1080 - BREITE) / 2, top: 700, width: BREITE, height: 1300, borderRadius: 86, padding: RAHMEN, boxSizing: "border-box",
        backgroundColor: "#1a1a1a", border: `2px solid ${c.linie}`, boxShadow: `0 40px 120px ${c.fadenHell}`,
        transform: `perspective(2200px) rotateX(${interpolate(f, [0, 34], [24, 0], { ...klemm, easing: weich })}deg) translateY(${interpolate(f, [0, 34], [520, 0], { ...klemm, easing: weich })}px)`,
      }}>
        <div style={{ width: SCHIRM, height: 1300 - 2 * RAHMEN, borderRadius: 70, overflow: "hidden", backgroundColor: "#ffffff", position: "relative" }}>
          <Img src={staticFile("reel/b-telefon.png")} style={{ position: "absolute", left: 0, top: 0, width: SCHIRM, translate: `0 ${-y}px` }} />
        </div>
      </div>
    </Grund>
  );
};
