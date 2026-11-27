// «Eigenzeit» (27. November 2026): die Zeitfigur aus ORNAMENT FORMEN (alpha/formen/eigenzeit/) als Film, 4:5, 42 s, ohne Ton.
// Wunsch: «eine animation, 42 sekunden mit der zeitfigur bei den formen. genug bewegung und entwicklung, damit es interessant zum anschauen ist»;
// Format 4:5, Signet mit wenigen Begriffen, stumm; Szenenplan von Christian freigegeben («ja, so machen»).
// Intro seit derselben Sitzung aus der Figur selbst statt des hellen Signets («nicht dieses intro, das ist zu lasch. ein neues bauen im stile der
// animation»): randlos dunkel, die Ringe tauchen auf, «EIGENZEIT» darüber, dann zieht sich das Bild in die Bühne zusammen. Das Outro bleibt das Signet.
// Die Figur rendert bild/render.mjs Bild für Bild (dieselbe Rechnung wie die Seite, Zeitplan in bild/film.js) nach public/eigenzeit/
// (nicht eingecheckt); die Texte liest daten.mjs unverändert aus der Seite.
import React from "react";
import { AbsoluteFill, Img, Sequence, interpolate, staticFile, useCurrentFrame } from "remotion";
import { Grund, INTRO, Leise, Marke, OUTRO, Outro, blende, klemm, steig, weich } from "../vorlage/Bausteine";
import { FARBE, SANS, SERIF } from "../vorlage/stil";
import daten from "./data/eigenzeit.json";

export const HOEHE = 1350;
/** Einzelbilder in public/eigenzeit/: Intro i0000.jpg … (90, volle Auflösung) und Film f0000.jpg … (33 s × 30 fps), wie in bild/render.mjs */
export const BILDER = 990;
export const T = { intro: 0, film: INTRO, outro: INTRO + BILDER, ende: INTRO + BILDER + OUTRO };

/** Bühne: x 90–990, y 150–1000, wie die Einzelbilder (900 × 850) */
const BUEHNE = { x: 90, y: 150, b: 900, h: 850 };
const s = (sek: number) => Math.round(sek * 30);
const NACHT = "#151412";
/** im Intro deckt die Bühne das ganze Bild (gleiches Seitenverhältnis 900 : 850, mittig) */
const DECKE = { b: BUEHNE.b * 1.6, h: BUEHNE.h * 1.6 };

const EigenzeitIntro: React.FC = () => {
  const f = useCurrentFrame();
  const z = interpolate(f, [58, INTRO], [0, 1], { ...klemm, easing: weich });
  const b = interpolate(z, [0, 1], [DECKE.b, BUEHNE.b]), h = interpolate(z, [0, 1], [DECKE.h, BUEHNE.h]);
  const x = interpolate(z, [0, 1], [540 - DECKE.b / 2, BUEHNE.x]), y = interpolate(z, [0, 1], [675 - DECKE.h / 2, BUEHNE.y]);
  const titel = interpolate(f, [8, 22, 50, 62], [0, 1, 1, 0], klemm);
  return (
    <AbsoluteFill>
      <div style={{ position: "absolute", left: x, top: y, width: b, height: h, background: NACHT, overflow: "hidden" }}>
        <Img src={staticFile(`eigenzeit/i${String(Math.min(INTRO - 1, f)).padStart(4, "0")}.jpg`)} style={{ width: "100%", height: "100%", display: "block" }} />
      </div>
      <div style={{ position: "absolute", left: 90, right: 90, top: 1010, textAlign: "center", opacity: titel, translate: `0 ${steig(f, 8, 22)}px` }}>
        <div style={{ fontFamily: SANS, fontWeight: 600, fontSize: 92, letterSpacing: "0.2em", marginRight: "-0.2em", color: "#f4f1ea" }}>EIGENZEIT</div>
        <div style={{ marginTop: 18, fontFamily: SANS, fontSize: 32, letterSpacing: "0.16em", color: FARBE.akzent }}>formen · 3d</div>
      </div>
    </AbsoluteFill>
  );
};

// Kennzeilen über der Bühne und Sätze darunter, in Bildern ab Beginn des Films (Szenenplan)
const KENNZEILEN: [number, number, string][] = [
  [s(0), s(11), "Eigenzeit"], [s(11), s(18), "gekoppelt"], [s(18), s(24), "aufgegangen"], [s(24), s(30), "Beobachter"], [s(30), s(33), "Eigenzeit"],
];
const SAETZE: [number, number, string, boolean?][] = [
  [s(0), s(6), daten.rhythmus], [s(6), s(11), daten.uhr], [s(11), s(18), daten.gekoppelt], [s(18), s(24), daten.aufgegangen],
  [s(24), s(30), `${daten.beobachter} […]`], [s(30), s(33), daten.wiederkehr, true],
];

const Film: React.FC = () => {
  const f = useCurrentFrame();
  const i = Math.min(BILDER - 1, Math.max(0, f));
  return (
    <AbsoluteFill>
      <div style={{ position: "absolute", left: BUEHNE.x, top: BUEHNE.y, width: BUEHNE.b, height: BUEHNE.h, background: NACHT,
        opacity: interpolate(f, [BILDER - 16, BILDER], [1, 0], klemm) }}>
        <Img src={staticFile(`eigenzeit/f${String(i).padStart(4, "0")}.jpg`)} style={{ width: BUEHNE.b, height: BUEHNE.h, display: "block" }} />
      </div>
      {KENNZEILEN.map(([a, b, text]) => (
        <div key={a} style={{ position: "absolute", left: 90, right: 90, top: 78, opacity: blende(f, a + (a ? 0 : 8), b), translate: `0 ${steig(f, a + (a ? 0 : 8))}px` }}>
          <Marke>{text}</Marke>
        </div>
      ))}
      {SAETZE.map(([a, b, text, gross]) => (
        <div key={a} style={{ position: "absolute", left: 90, right: 90, top: 1040, opacity: blende(f, a + 6, b), translate: `0 ${steig(f, a + 6)}px` }}>
          {gross
            ? <div style={{ fontFamily: SERIF, fontSize: 76, lineHeight: 1.1, color: FARBE.text }}>{text}</div>
            : <Leise>{text}</Leise>}
        </div>
      ))}
    </AbsoluteFill>
  );
};

export const EigenzeitVideo: React.FC = () => (
  <Grund>
    <Sequence from={T.intro} durationInFrames={INTRO} layout="none"><EigenzeitIntro /></Sequence>
    <Sequence from={T.film} durationInFrames={BILDER} layout="none"><Film /></Sequence>
    <Sequence from={T.outro} durationInFrames={OUTRO} layout="none"><Outro hoehe={HOEHE} /></Sequence>
  </Grund>
);
