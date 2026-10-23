// «Ein Bild will sich bewegen.» (Tinte): Schnitte auf den Schlag aus Aufnahmen von Christian – PHORMA I (Glaskörper), PHORMA III (Traube, Irrfahrt)
// und PHORMA II (Rasterdruck, dann Montage, zwei schnelle Schnitte auf einem Platz). Die Enden der Aufnahmen (das frühere Signet) bleiben draussen.
// Wunsch vom 23. Oktober 2026: «einmal Irrfahrt ersetzen mit Traube, einmal Scherben ersetzen mit Raster und Montage».
import React from "react";
import { Sequence, interpolate, staticFile, useCurrentFrame } from "remotion";
import { Video } from "@remotion/media";
import daten from "../data/reel.json";
import { C, Grund, RAND, Schlagzeile, Unterzeile, klemm, weich } from "../Teile";

export const SCHUSS = 45;   // drei Schläge je Platz
const B = 900, H = (B * 5) / 4;
type Datei = "phorma-i-lauf" | "phorma-iii-traube" | "phorma-ii-raster" | "phorma-iii-lauf";
// [Aufnahme, Beginn im Reel, Länge, Beginn in der Aufnahme (Bilder), welche Unterzeile]
const SCHNITTE: [Datei, number, number, number, "a" | "b" | "c"][] = [
  ["phorma-i-lauf", 0, 45, 285, "a"],           // PHORMA I: Glaskörper
  ["phorma-iii-traube", 45, 45, 114, "b"],      // PHORMA III: die Traube, ein Herz aus Perlen
  ["phorma-ii-raster", 90, 22, 120, "c"],       // PHORMA II: Rasterdruck …
  ["phorma-ii-raster", 112, 23, 282, "c"],      // … und Montage
  ["phorma-iii-lauf", 135, 45, 228, "b"],       // PHORMA III: Irrfahrt, drei Würfel
];
export const BILD = 4 * SCHUSS;

export const Bild: React.FC = () => {
  const f = useCurrentFrame();
  const c = C("dunkel");
  const i = SCHNITTE.reduce((w, [, ab], k) => (f >= ab ? k : w), 0);
  // die Unterzeile wechselt nur, wenn die App wechselt
  const ab = SCHNITTE.slice(0, i + 1).reduce((w, s, k) => (k > 0 && s[4] !== SCHNITTE[k - 1][4] ? s[1] : w), 0);
  return (
    <Grund m="dunkel">
      <Schlagzeile f={f} text={daten.bild.satz} groesse={100} style={{ position: "absolute", left: RAND, right: RAND, top: 230 }} />
      <div style={{ position: "absolute", left: (1080 - B) / 2, top: 470, width: B, height: H, overflow: "hidden", backgroundColor: c.papier, outline: `2px solid ${c.linie}`,
        clipPath: `inset(${interpolate(f, [4, 20], [100, 0], { ...klemm, easing: weich })}% 0 0 0)` }}>
        {SCHNITTE.map(([datei, von, lang, lauf], k) => (
          <Sequence key={k} from={von} durationInFrames={lang} layout="absolute-fill">
            <Video src={staticFile(`reel/${datei}.mp4`)} trimBefore={lauf} muted objectFit="cover"
              style={{ width: "100%", height: "100%", scale: interpolate(f - von, [0, lang], [1.08, 1], { ...klemm, easing: weich }) }} />
          </Sequence>
        ))}
      </div>
      <Unterzeile key={ab} f={f} a={ab === 0 ? 18 : ab} m="dunkel" {...daten.bild[SCHNITTE[i][4]]} style={{ position: "absolute", left: RAND, right: RAND, top: 470 + H + 40 }} />
    </Grund>
  );
};
