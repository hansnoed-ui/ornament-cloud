// Comic-Bausteine für das Video «Doppelprüfung» (6. Oktober 2026, Wunsch von Christian: witzig, Comic-Stil, satte Farben, 3:4).
// Eigener Stil nur innerhalb dieses Videos; Intro und Outro bleiben das Signet der Vorlage.
// Dicke schwarze Konturen, harte Schlagschatten, Punktraster, schräg gesetzte Etiketten. Bewusst kein Cremeton und kein Terrakotta.
import React from "react";
import { AbsoluteFill, interpolate, spring } from "remotion";
import { SANS, SERIF } from "../vorlage/stil";

export const B = 1080, H = 1440, FPS = 30;

export const C = {
  blau: "#2337ff", rot: "#ff3b2f", gelb: "#ffd400", minz: "#19d3a2", mag: "#ff3d9a", orange: "#ff8a00", violett: "#8b3dff",
  ink: "#000000", papier: "#ffffff", grau: "#4a4a4a",
};

export const klemm = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;
/** federnder Auftritt ab Bild a (0 → 1, schiesst leicht über) */
export const pop = (f: number, a: number, steif = 180) => spring({ frame: f - a, fps: FPS, config: { damping: 11, stiffness: steif } });
/** weiches Einblenden ab Bild a */
export const ein = (f: number, a: number, d = 10) => interpolate(f, [a, a + d], [0, 1], klemm);
/** Ausblenden am Szenenende (letzte d Bilder) */
export const aus = (f: number, dauer: number, d = 10) => interpolate(f, [dauer - d, dauer], [1, 0], klemm);

/** weisser Grund mit Punktraster in einer Farbe */
export const Punkte: React.FC<{ farbe?: string; children?: React.ReactNode }> = ({ farbe = "rgba(35,55,255,.15)", children }) => (
  <AbsoluteFill style={{ backgroundColor: C.papier }}>
    <AbsoluteFill style={{ backgroundImage: `radial-gradient(circle, ${farbe} 3.2px, transparent 3.6px)`, backgroundSize: "22px 22px" }} />
    {children}
  </AbsoluteFill>
);

/** Etikett oben links: Titel einer Szene, schräg, mit hartem Schatten */
export const Etikett: React.FC<{ f: number; a?: number; farbe?: string; children: React.ReactNode; top?: number }> = ({ f, a = 0, farbe = C.gelb, children, top = 70 }) => {
  const p = pop(f, a);
  return (
    <div style={{
      position: "absolute", left: 70, top, fontFamily: SANS, fontWeight: 700, fontSize: 44, letterSpacing: "-0.01em",
      background: farbe, border: `6px solid ${C.ink}`, padding: "10px 24px", boxShadow: `8px 8px 0 ${C.ink}`,
      transform: `translateX(${interpolate(p, [0, 1], [-700, 0])}px) rotate(-2deg)`,
    }}>{children}</div>
  );
};

/** Panel: weisse Fläche mit dicker Kontur und Schlagschatten */
export const Panel: React.FC<{ x: number; y: number; w: number; h: number; style?: React.CSSProperties; children?: React.ReactNode }> = ({ x, y, w, h, style, children }) => (
  <div style={{ position: "absolute", left: x, top: y, width: w, height: h, background: C.papier, border: `7px solid ${C.ink}`, borderRadius: 6, boxShadow: `14px 14px 0 ${C.ink}`, boxSizing: "border-box", ...style }}>{children}</div>
);

/** Koordinaten-Abzeichen «X 4 / Y 5» */
export const Abzeichen: React.FC<{ f: number; a: number; x: number; y: number; X: number; Y: number }> = ({ f, a, x, y, X, Y }) => {
  const p = pop(f, a, 220);
  return (
    <div style={{
      position: "absolute", left: x, top: y, fontFamily: SANS, fontWeight: 700, fontSize: 56, background: C.minz, border: `6px solid ${C.ink}`,
      borderRadius: 8, padding: "8px 24px", boxShadow: `8px 8px 0 ${C.ink}`, transform: `scale(${p}) rotate(${interpolate(p, [0, 1], [-30, 3])}deg)`,
    }}>X {X} / Y {Y}</div>
  );
};

/** Bildunterschrift in der Serifenschrift; zitiert wird wörtlich aus der Studie */
export const Satz: React.FC<{ f: number; a: number; top: number; groesse?: number; children: React.ReactNode; klein?: React.ReactNode }> = ({ f, a, top, groesse = 46, children, klein }) => (
  <div style={{ position: "absolute", left: 70, right: 70, top, opacity: ein(f, a, 12), translate: `0 ${interpolate(f, [a, a + 14], [20, 0], klemm)}px` }}>
    <div style={{ fontFamily: SERIF, fontSize: groesse, lineHeight: 1.25, color: C.ink, textWrap: "balance" }}>{children}</div>
    {klein ? <div style={{ marginTop: 14, fontFamily: SANS, fontWeight: 700, fontSize: 30, color: C.grau }}>{klein}</div> : null}
  </div>
);

/** Sprechblase mit Spitze nach unten links */
export const Blase: React.FC<{ x: number; y: number; w: number; farbe: string; p: number; drehung?: number; children: React.ReactNode }> = ({ x, y, w, farbe, p, drehung = 0, children }) => (
  <div style={{ position: "absolute", left: x, top: y, width: w, transform: `scale(${p}) rotate(${drehung}deg)`, transformOrigin: "20% 100%" }}>
    <div style={{ position: "relative", background: farbe, border: `7px solid ${C.ink}`, borderRadius: 36, padding: "26px 34px", boxShadow: `10px 10px 0 ${C.ink}`, fontFamily: SANS, fontWeight: 700, fontSize: 50, lineHeight: 1.15 }}>
      {children}
      <svg width="70" height="60" style={{ position: "absolute", left: 60, bottom: -55, overflow: "visible" }}>
        <path d="M0 0 L18 52 L52 0" fill={farbe} stroke={C.ink} strokeWidth="7" strokeLinejoin="round" />
        <path d="M4 -6 H48" stroke={farbe} strokeWidth="9" />
      </svg>
    </div>
  </div>
);
