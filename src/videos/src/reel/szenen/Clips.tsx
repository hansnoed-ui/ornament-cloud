// Zwei Antworten mit Aufnahmen von Christian, Schnitte auf den Schlag, im Rahmen aufgedeckt; die Enden der Aufnahmen (das frühere Signet) bleiben draussen.
//  «Ein Bild, das Bewegung sucht» (Tinte): PHORMA I (Glaskörper, Scherben) und PHORMA II (Rasterdruck, dann Montage)
//  «Ein Klang, der sich sehen lässt» (Papier): PHORMA III (Traube, Irrfahrt)
// Sätze von Christian vom 23. Oktober 2026 («Damit es sprachlich passt zu ‹Was bringst du mit?›»).
import React from "react";
import { Sequence, interpolate, staticFile, useCurrentFrame } from "remotion";
import { Video } from "@remotion/media";
import daten from "../data/reel.json";
import { einpassen, useLage } from "../Format";
import { C, Grund, Modus, Textspalte, Unterzeile, klemm, weich } from "../Teile";

type Zeile = { name: string; text: string; zeichen: string };
// [Aufnahme in public/reel/, Beginn im Reel, Länge, Beginn in der Aufnahme (Bilder), Unterzeile]
type Schnitt = [string, number, number, number, Zeile];

const Clipszene: React.FC<{ m: Modus; satz: string; schnitte: Schnitt[] }> = ({ m, satz, schnitte }) => {
  const f = useCurrentFrame();
  const L = useLage();
  const c = C(m);
  const k4 = einpassen(L.clip, 4, 5);   // die Aufnahmen sind 4 : 5
  const i = schnitte.reduce((w, [, ab], k) => (f >= ab ? k : w), 0);
  // die Unterzeile wechselt nur, wenn die App wechselt
  const ab = schnitte.slice(0, i + 1).reduce((w, s, k) => (k > 0 && s[4] !== schnitte[k - 1][4] ? s[1] : w), 0);
  return (
    <Grund m={m}>
      {/* Hochformate: die Unterzeile unter der Aufnahme; Querformat: in der Textspalte unter der Schlagzeile */}
      <Textspalte f={f} satz={satz}>
        {L.quer ? <Unterzeile key={ab} f={f} a={ab === 0 ? 18 : ab} m={m} {...schnitte[i][4]} /> : null}
      </Textspalte>
      <div style={{ position: "absolute", left: k4.x, top: k4.y, width: k4.b, height: k4.h, overflow: "hidden", backgroundColor: "#000000", outline: `2px solid ${c.linie}`,
        clipPath: `inset(${interpolate(f, [4, 20], [100, 0], { ...klemm, easing: weich })}% 0 0 0)` }}>
        {schnitte.map(([datei, von, lang, lauf], k) => (
          <Sequence key={k} from={von} durationInFrames={lang} layout="absolute-fill">
            <Video src={staticFile(`reel/${datei}.mp4`)} trimBefore={lauf} muted objectFit="cover"
              style={{ width: "100%", height: "100%", scale: interpolate(f - von, [0, lang], [1.08, 1], { ...klemm, easing: weich }) }} />
          </Sequence>
        ))}
      </div>
      {L.clipUnterY !== null ? (
        <Unterzeile key={ab} f={f} a={ab === 0 ? 18 : ab} m={m} {...schnitte[i][4]} style={{ position: "absolute", left: L.rand, right: L.rand, top: L.clipUnterY }} />
      ) : null}
    </Grund>
  );
};

const P1 = daten.bild.a, P2 = daten.bild.c, P3 = daten.klang.b;
export const BILD = 135;
export const Bild: React.FC = () => (
  <Clipszene m="dunkel" satz={daten.bild.satz} schnitte={[
    ["phorma-i-lauf", 0, 45, 285, P1],        // PHORMA I: Glaskörper
    ["phorma-ii-raster", 45, 22, 120, P2],    // PHORMA II: Rasterdruck …
    ["phorma-ii-raster", 67, 23, 282, P2],    // … und Montage
    ["phorma-i-lauf", 90, 45, 420, P1],       // PHORMA I: Scherben
  ]} />
);
export const KLANG = 135;
export const Klang: React.FC = () => (
  <Clipszene m="hell" satz={daten.klang.satz} schnitte={[
    ["phorma-iii-traube", 0, 45, 114, P3],    // die Traube: ein Herz aus Perlen
    ["phorma-iii-lauf", 45, 45, 60, P3],      // Irrfahrt: ein Würfel, die Fäden wachsen
    ["phorma-iii-lauf", 90, 45, 228, P3],     // Irrfahrt: drei Würfel
  ]} />
);
