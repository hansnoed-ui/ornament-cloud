// «Eine Idee, die in die Welt kommt» (Papier): ein Telefon kippt ins Bild und blättert durch die echte Startseite /b/ bis zu den vier Leistungen.
import React from "react";
import { Img, interpolate, staticFile, useCurrentFrame } from "remotion";
import { useDaten } from "../Sprache";
import { useLage } from "../Format";
import { C, Grund, Textspalte, Unterzeile, klemm, weich } from "../Teile";

export const IDEE = 150;
// Breite und Oberkante des Telefons je Format (es reicht absichtlich über den unteren Rand hinaus)
const TELEFON = { "9:16": [600, 700], "4:5": [520, 520], "1:1": [440, 420], "16:9": [480, 130] } as const;

export const Idee: React.FC = () => {
  const f = useCurrentFrame();
  const c = C("hell");
  const L = useLage();
  const daten = useDaten();
  // die Aufnahme der Startseite in der Sprache des Reels und die Lage ihrer Abschnitte (CSS-Pixel), von aufnahme.mjs über daten.mjs
  const stellen = daten.telefon.stellen;
  const [BREITE, oben] = TELEFON[L.format];
  const s = BREITE / 600;                    // Mass gegenüber dem Telefon im Hochformat 9:16
  const RAHMEN = 16 * s, SCHIRM = BREITE - 2 * RAHMEN, HOEHE = 1300 * s;
  const m = SCHIRM / stellen.breite;         // CSS-Pixel → Bildpunkte im Video
  const links = L.quer ? L.bild.x + (L.bild.b - BREITE) / 2 : (L.w - BREITE) / 2;
  const y = interpolate(f, [0, 34, 70, 150], [0, 0, stellen.angebote - 40, stellen.angebote + 10],
    { ...klemm, easing: weich }) * m;
  return (
    <Grund m="hell">
      <Textspalte f={f} satz={daten.idee.satz}>
        <Unterzeile f={f} a={16} m="hell" {...daten.idee.a} />
      </Textspalte>
      <div style={{
        position: "absolute", left: links, top: oben, width: BREITE, height: HOEHE, borderRadius: 86 * s, padding: RAHMEN, boxSizing: "border-box",
        backgroundColor: "#111111", border: "2px solid #2e2e2e", boxShadow: `0 40px 120px ${c.fadenHell}`,
        transform: `perspective(2200px) rotateX(${interpolate(f, [0, 34], [24, 0], { ...klemm, easing: weich })}deg) translateY(${interpolate(f, [0, 34], [520, 0], { ...klemm, easing: weich })}px)`,
      }}>
        <div style={{ width: SCHIRM, height: HOEHE - 2 * RAHMEN, borderRadius: 70 * s, overflow: "hidden", backgroundColor: "#ffffff", position: "relative" }}>
          <Img src={staticFile(daten.telefon.bild)} style={{ position: "absolute", left: 0, top: 0, width: SCHIRM, translate: `0 ${-y}px` }} />
        </div>
      </div>
    </Grund>
  );
};
