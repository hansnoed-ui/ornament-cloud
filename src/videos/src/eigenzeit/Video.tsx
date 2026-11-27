// «Eigenzeit» (27. November 2026): die Zeitfigur aus ORNAMENT FORMEN (alpha/formen/eigenzeit/) als Film, 4:5, 42 s, ohne Ton.
// Wunsch: «eine animation, 42 sekunden mit der zeitfigur bei den formen. genug bewegung und entwicklung, damit es interessant zum anschauen ist»;
// Format 4:5, wenige Begriffe, stumm; Szenenplan von Christian freigegeben («ja, so machen»).
// Danach: «nicht dieses intro, das ist zu lasch. ein neues bauen im stile der animation» und «bitte alles ohne weissen rahmen. wenn text dann wie
// die neuen videos von ornament.cloud. passendes outro» (Vorbild gewählt: «Zettel 33 · Das Publikum», publikum/Video.tsx).
// Darum: die Figur füllt das ganze Bild, von Anfang an (Intro aus der Figur selbst); oben die Kennzeile in gesperrten Versalien, darunter der
// Satz in der Serife, hell auf dunkel; am Schluss der Leitsatz kursiv; das Outro ist das Signet dunkel, der Punkt in Messing wie die Figur.
// Die Figur rendert bild/render.mjs Bild für Bild (dieselbe Rechnung wie die Seite, Zeitplan in bild/film.js) nach public/eigenzeit/
// (nicht eingecheckt); die Texte liest daten.mjs unverändert aus der Seite.
import React from "react";
import { AbsoluteFill, Img, Sequence, interpolate, staticFile, useCurrentFrame } from "remotion";
import { Grund, INTRO, OUTRO, blende, klemm, steig } from "../vorlage/Bausteine";
import { Signet } from "../vorlage/Signet";
import { SANS, SERIF } from "../vorlage/stil";
import daten from "./data/eigenzeit.json";

export const HOEHE = 1350;
/** Einzelbilder in public/eigenzeit/ (f0000.jpg …, 1080 × 1350): 3 s Intro und 33 s Film, wie in bild/render.mjs */
export const BILDER = 990;
export const T = { intro: 0, film: INTRO, outro: INTRO + BILDER, ende: INTRO + BILDER + OUTRO };

// Eigene Farben nur für dieses Video: der dunkle Grund der Bühne von ORNAMENT FORMEN, Kreide, Messing als Akzent
const C = { grund: "#151412", text: "#f4f1ea", leise: "#a39d92", akzent: "#d4a650" };
const SIGNET = { grund: C.grund, tinte: C.text, punkt: C.akzent };
const s = (sek: number) => T.film + Math.round(sek * 30);

// Kennzeilen und Sätze, in Bildern des ganzen Videos (Szenenplan); der letzte Satz ist der Leitsatz der Seite
const KENNZEILEN: [number, number, string][] = [
  [s(0), s(11), "Eigenzeit"], [s(11), s(18), "gekoppelt"], [s(18), s(24), "aufgegangen"], [s(24), s(30), "Beobachter"], [s(30), s(33), "Leitsatz"],
];
const SAETZE: [number, number, string][] = [
  [s(0), s(6), daten.rhythmus], [s(6), s(11), daten.uhr], [s(11), s(18), daten.gekoppelt], [s(18), s(24), daten.aufgegangen],
  [s(24), s(30), `${daten.beobachter} […]`],
];

const Figur: React.FC = () => {
  const f = useCurrentFrame();
  const i = Math.min(INTRO + BILDER - 1, f);
  return (
    <AbsoluteFill style={{ opacity: interpolate(f, [T.outro - 18, T.outro], [1, 0], klemm) }}>
      <Img src={staticFile(`eigenzeit/f${String(i).padStart(4, "0")}.jpg`)} style={{ width: 1080, height: HOEHE, display: "block" }} />
    </AbsoluteFill>
  );
};

/** Anfang: die Figur taucht auf, darüber der Titel wie bei Zettel 33 (Kennzeile, Titel in der Serife, unten eine leise Zeile) */
const Anfang: React.FC = () => {
  const f = useCurrentFrame();
  const o = interpolate(f, [4, 16, INTRO - 14, INTRO], [0, 1, 1, 0], klemm);
  return (
    <AbsoluteFill style={{ opacity: o }}>
      <div style={{ position: "absolute", left: 0, right: 0, top: 64, textAlign: "center", translate: `0 ${steig(f, 4) * 0.5}px` }}>
        <div style={{ fontFamily: SANS, fontWeight: 600, fontSize: 34, letterSpacing: "0.2em", textTransform: "uppercase", color: C.akzent }}>Ornament Formen</div>
        <div style={{ fontFamily: SERIF, fontSize: 84, lineHeight: 1.1, color: C.text, marginTop: 14 }}>Eigenzeit</div>
      </div>
      <div style={{ position: "absolute", left: 0, right: 0, top: 1240, textAlign: "center", fontFamily: SANS, fontSize: 28, letterSpacing: "0.14em", color: C.leise }}>ornament.cloud · formen · 3d</div>
    </AbsoluteFill>
  );
};

const Texte: React.FC = () => {
  const f = useCurrentFrame();
  return (<>
    {KENNZEILEN.map(([a, b, text]) => { const o = blende(f, a, b, 10); return o > 0 ? (
      <div key={a} style={{ position: "absolute", left: 90, top: 62, opacity: o, fontFamily: SANS, fontWeight: 600, fontSize: 25, letterSpacing: "0.16em", textTransform: "uppercase", color: C.akzent }}>{text}</div>
    ) : null; })}
    {SAETZE.map(([a, b, text]) => { const o = blende(f, a + 4, b, 10); return o > 0 ? (
      <div key={a} style={{ position: "absolute", left: 90, right: 90, top: 122, opacity: o, translate: `0 ${steig(f, a + 4) * 0.5}px`, fontFamily: SERIF, fontSize: 54, lineHeight: 1.2, color: C.text, textWrap: "pretty" }}>{text}</div>
    ) : null; })}
    {(() => { const o = blende(f, s(30) + 4, T.outro, 12); return o > 0 ? (
      <div style={{ position: "absolute", left: 90, right: 90, top: 122, opacity: o, translate: `0 ${steig(f, s(30) + 4) * 0.5}px`, fontFamily: SERIF, fontStyle: "italic", fontSize: 58, lineHeight: 1.18, color: C.text, textWrap: "balance" }}>{daten.wiederkehr}</div>
    ) : null; })()}
  </>);
};

export const EigenzeitVideo: React.FC = () => (
  <Grund>
    <AbsoluteFill style={{ backgroundColor: C.grund }} />
    <Figur />
    <Texte />
    <Sequence durationInFrames={INTRO}><Anfang /></Sequence>
    <Sequence from={T.outro} durationInFrames={OUTRO}>
      <AbsoluteFill style={{ overflow: "hidden", backgroundColor: C.grund }}><div style={{ position: "absolute", left: 0, width: 1080, height: 1920, top: (HOEHE - 1920) / 2 }}><Signet stil={SIGNET} /></div></AbsoluteFill>
    </Sequence>
  </Grund>
);
