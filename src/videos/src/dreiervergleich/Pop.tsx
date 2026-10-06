// Pop-Art-Bausteine für das Video «Drei im Doppelspalt» (6. Oktober 2026, Wunsch von Christian: wie «Liebling …», aber farblich leicht anders, viel Roy Lichtenstein).
// Die Grundbausteine (Federn, Blenden, Ben-Day-Punkte, Sprechblase) kommen aus ../doppelpruefung/Comic; hier die eigene Palette und die Lichtenstein-Elemente:
// Strahlenkranz, Knall mit Lautwort, Gedankenwolke, Stempel, Erzählkasten mit Auf- und Abtritt.
// Farben: jeder Autor in seiner Farbe aus der Streugrafik der Studie (Luhmann türkis, Baecker gelb, Lehmann korallrot), dazu Lichtenstein-Blau und -Rot;
// Grund ein warmes Papierweiss statt reinem Weiss. Nur 3:4 (1080 × 1440).
// Hochwertiger (Wunsch vom 6. Oktober 2026): jede Szene ein gerahmtes Bildfeld wie eine Comicseite, keine Schlagschatten im Web-Stil,
// Punktraster als Halbton-Verlauf, Erzählkästen in Versalien bündig in der Ecke, Knall doppelt gezackt.
import React from "react";
import { AbsoluteFill, Easing, interpolate, useCurrentFrame } from "remotion";
import { Signet, type Kopf, type SignetStil } from "../vorlage/Signet";
import { SANS, SERIF } from "../vorlage/stil";
import { benday, ein, klemm, pop } from "../doppelpruefung/Comic";

export const P = {
  tuerkis: "#12b5a9", gelb: "#ffd21f", koral: "#ff5b4a", blau: "#1747c9", rot: "#e0141e", himmel: "#7fd3ff",
  ink: "#000000", papier: "#fff9ee", weiss: "#ffffff", grau: "#8a8580", dunkel: "#3a3734",
};
export const AUTOR = {
  luhmann: { name: "Niklas Luhmann", farbe: P.tuerkis },
  baecker: { name: "Dirk Baecker", farbe: P.gelb },
  lehmann: { name: "Harry Lehmann", farbe: P.koral },
};

export const fett = (groesse: number, extra: React.CSSProperties = {}): React.CSSProperties => ({ fontFamily: SANS, fontWeight: 700, fontSize: groesse, ...extra });

/** Rahmen des Bildfelds (wie ein Comic-Panel auf der Seite): Papierrand aussen, schwarze Kontur */
export const RAND = 26;
export const Rahmen: React.FC = () => (
  <AbsoluteFill style={{ pointerEvents: "none" }}>
    <div style={{ position: "absolute", inset: 0, borderStyle: "solid", borderColor: P.papier, borderWidth: RAND }} />
    <div style={{ position: "absolute", inset: RAND, border: `9px solid ${P.ink}` }} />
  </AbsoluteFill>
);

/** Grund: weisses Bildfeld, oben rechts ein Halbton-Verlauf aus Ben-Day-Punkten in einer Farbe, aussen der Rahmen */
export const Grundpunkte: React.FC<{ farbe?: string; children?: React.ReactNode }> = ({ farbe = "rgba(23,71,201,.55)", children }) => (
  <AbsoluteFill style={{ backgroundColor: P.weiss }}>
    <AbsoluteFill style={{ ...benday(farbe, 4.4, 17), WebkitMaskImage: "radial-gradient(ellipse 95% 70% at 92% 6%, #000 0%, rgba(0,0,0,.55) 35%, transparent 72%)", maskImage: "radial-gradient(ellipse 95% 70% at 92% 6%, #000 0%, rgba(0,0,0,.55) 35%, transparent 72%)" }} />
    <AbsoluteFill style={{ ...benday(farbe, 3.2, 17), WebkitMaskImage: "radial-gradient(ellipse 80% 55% at 4% 100%, #000 0%, transparent 70%)", maskImage: "radial-gradient(ellipse 80% 55% at 4% 100%, #000 0%, transparent 70%)" }} />
    {children}
    <Rahmen />
  </AbsoluteFill>
);

/** Strahlenkranz hinter einem Knall (abwechselnd zwei Farben), dreht sich langsam */
export const Strahlen: React.FC<{ f: number; cx: number; cy: number; a: string; b: string; n?: number }> = ({ f, cx, cy, a, b, n = 24 }) => {
  const r = 1600, w = (Math.PI * 2) / n;
  return (
    <svg width="1080" height="1440" style={{ position: "absolute", inset: 0 }}>
      <rect width="1080" height="1440" fill={a} />
      <g transform={`rotate(${f * 0.15} ${cx} ${cy})`}>
        {Array.from({ length: n / 2 }, (_, i) => {
          const s = i * 2 * w;
          return <path key={i} d={`M${cx} ${cy} L${cx + r * Math.cos(s)} ${cy + r * Math.sin(s)} L${cx + r * Math.cos(s + w)} ${cy + r * Math.sin(s + w)} Z`} fill={b} />;
        })}
      </g>
    </svg>
  );
};

/** doppelt gezackter Knall mit Lautwort, wie «WHAAM!»: aussen eine Farbe, innen eine zweite */
export const Knall: React.FC<{ p: number; x: number; y: number; r?: number; farbe?: string; innen?: string; text: string; groesse?: number; textfarbe?: string; drehung?: number; opacity?: number }> = ({ p, x, y, r = 200, farbe = P.gelb, innen, text, groesse = 84, textfarbe = P.rot, drehung = -6, opacity = 1 }) => {
  const zacken = (n: number, k: number) => Array.from({ length: n }, (_, i) => { const rr = (i % 2 ? r * 0.6 : r * (0.94 + ((i * 37) % 9) / 45)) * k, w = (i / n) * Math.PI * 2 + 0.1; return `${rr * Math.cos(w)},${rr * 0.8 * Math.sin(w)}`; }).join(" ");
  return (
    <div style={{ position: "absolute", left: x - r, top: y - r, width: 2 * r, height: 2 * r, transform: `scale(${p}) rotate(${drehung}deg)`, opacity }}>
      <svg width={2 * r} height={2 * r} viewBox={`${-r} ${-r} ${2 * r} ${2 * r}`} style={{ position: "absolute", inset: 0, overflow: "visible" }}>
        <polygon points={zacken(26, 1)} fill={farbe} stroke={P.ink} strokeWidth="8" strokeLinejoin="miter" />
        <polygon points={zacken(18, 0.74)} fill={innen ?? (farbe === P.gelb ? P.weiss : P.gelb)} stroke={P.ink} strokeWidth="5" strokeLinejoin="miter" />
      </svg>
      <div style={fett(groesse, { position: "absolute", inset: 0, display: "grid", placeItems: "center", color: textfarbe, letterSpacing: "-0.01em", WebkitTextStroke: `5px ${P.ink}`, paintOrder: "stroke fill", fontWeight: 800, transform: "skewX(-8deg)" })}>{text}</div>
    </div>
  );
};

/** Sprechblase: weiss, kräftige Kontur, Spitze unten links (ohne Schatten) */
export const Blase: React.FC<{ x: number; y: number; w: number; farbe: string; p: number; drehung?: number; children: React.ReactNode }> = ({ x, y, w, farbe, p, drehung = 0, children }) => (
  <div style={{ position: "absolute", left: x, top: y, width: w, transform: `scale(${p}) rotate(${drehung}deg)`, transformOrigin: "20% 100%" }}>
    <div style={{ position: "relative", background: farbe, border: `8px solid ${P.ink}`, borderRadius: 44, padding: "30px 40px", ...fett(50, { lineHeight: 1.12, letterSpacing: "0.01em", textTransform: "uppercase" }) }}>
      {children}
      <svg width="80" height="70" style={{ position: "absolute", left: 70, bottom: -64, overflow: "visible" }}>
        <path d="M0 0 L14 62 L60 0" fill={farbe} stroke={P.ink} strokeWidth="8" strokeLinejoin="miter" />
        <path d="M5 -7 H55" stroke={farbe} strokeWidth="10" />
      </svg>
    </div>
  </div>
);

/** Gedankenwolke wie in Lichtensteins Liebes-Comics (Wellenrand, kleine Bläschen darunter) */
export const Wolke: React.FC<{ p: number; x: number; y: number; w: number; h: number; children: React.ReactNode; farbe?: string }> = ({ p, x, y, w, h, children, farbe = P.weiss }) => {
  const bogen = 18, rx = w / 2, ry = h / 2;
  const kreise = Array.from({ length: bogen }, (_, i) => { const t = (i / bogen) * Math.PI * 2; return [rx + rx * 0.92 * Math.cos(t), ry + ry * 0.86 * Math.sin(t)]; });
  return (
    <div style={{ position: "absolute", left: x, top: y, width: w, height: h + 120, transform: `scale(${p})`, transformOrigin: "30% 100%" }}>
      <svg width={w} height={h + 120} style={{ position: "absolute", inset: 0, overflow: "visible" }}>
        {kreise.map(([cx, cy], i) => <circle key={`s${i}`} cx={cx} cy={cy} r={Math.min(w, h) * 0.17} fill={P.ink} />)}
        <ellipse cx={rx} cy={ry} rx={rx * 0.92 + 4} ry={ry * 0.86 + 4} fill={P.ink} />
        {kreise.map(([cx, cy], i) => <circle key={`w${i}`} cx={cx} cy={cy} r={Math.min(w, h) * 0.17 - 8} fill={farbe} />)}
        <ellipse cx={rx} cy={ry} rx={rx * 0.92} ry={ry * 0.86} fill={farbe} />
        <circle cx={w * 0.22} cy={h + 30} r="26" fill={farbe} stroke={P.ink} strokeWidth="8" />
        <circle cx={w * 0.14} cy={h + 88} r="15" fill={farbe} stroke={P.ink} strokeWidth="7" />
      </svg>
      <div style={{ position: "absolute", left: w * 0.12, right: w * 0.12, top: 0, height: h, display: "grid", placeItems: "center", textAlign: "center" }}>{children}</div>
    </div>
  );
};

/** Stempel: fällt gross herein und sitzt schräg */
export const Stempel: React.FC<{ f: number; a: number; x: number; y: number; text: string; farbe?: string; groesse?: number; drehung?: number }> = ({ f, a, x, y, text, farbe = P.rot, groesse = 60, drehung = -9 }) => {
  const p = pop(f, a, 260);
  return (
    <div style={{
      position: "absolute", left: x, top: y, padding: "14px 30px", border: `10px solid ${farbe}`, borderRadius: 14, background: "rgba(255,255,255,.82)",
      transform: `scale(${interpolate(p, [0, 1], [2.8, 1])}) rotate(${drehung}deg)`, opacity: f >= a ? 1 : 0, ...fett(groesse, { color: farbe, letterSpacing: "0.03em", whiteSpace: "nowrap" }),
    }}>{text}</div>
  );
};

/** Erzählkasten wie bei Lichtenstein: gelb, Versalien, schwarze Kontur, ohne Schatten; Auftritt ab a, Abtritt bis b; zitiert wird wörtlich aus der Studie */
export const Kasten: React.FC<{ f: number; a: number; b?: number; top: number; groesse?: number; farbe?: string; children: React.ReactNode; klein?: React.ReactNode; links?: number }> = ({ f, a, b = 1e9, top, groesse = 44, farbe = P.gelb, children, klein, links = 70 }) => {
  const o = Math.min(ein(f, a, 10), interpolate(f, [b - 10, b], [1, 0], klemm));
  return (
    <div style={{ position: "absolute", left: links, right: 70, top, opacity: o, transform: `translateY(${interpolate(f, [a, a + 14], [20, 0], klemm)}px)` }}>
      <div style={{ display: "inline-block", background: farbe, border: `6px solid ${P.ink}`, padding: "20px 28px 18px", ...fett(groesse * 0.92, { lineHeight: 1.2, letterSpacing: "0.015em", textTransform: "uppercase", color: P.ink, textWrap: "balance" }) }}>{children}</div>
      {klein ? <div style={{ marginTop: 16, fontFamily: SERIF, fontStyle: "italic", fontSize: 34, color: P.dunkel }}>{klein}</div> : null}
    </div>
  );
};

/** Bildfeld innerhalb der Szene: kräftige Kontur, ohne Schatten */
export const Feld: React.FC<{ x: number; y: number; w: number; h: number; farbe?: string; style?: React.CSSProperties; children?: React.ReactNode }> = ({ x, y, w, h, farbe = P.weiss, style, children }) => (
  <div style={{ position: "absolute", left: x, top: y, width: w, height: h, background: farbe, border: `7px solid ${P.ink}`, boxSizing: "border-box", overflow: "hidden", ...style }}>{children}</div>
);

/** Kopfkasten oben links, bündig in der Ecke des Bildfelds (wie Lichtensteins Erzählkästen), in der Farbe des Autors */
export const Schild: React.FC<{ f: number; a?: number; farbe: string; children: React.ReactNode; top?: number }> = ({ f, a = 0, farbe, children }) => {
  const p = pop(f, a, 200);
  return (
    <div style={{
      position: "absolute", left: RAND + 9, top: RAND + 9, padding: "20px 34px 18px 40px", background: farbe, borderRight: `7px solid ${P.ink}`, borderBottom: `7px solid ${P.ink}`,
      ...fett(40, { letterSpacing: "0.05em", textTransform: "uppercase" }), clipPath: `inset(0 ${(1 - Math.min(1, p)) * 100}% 0 0)`,
    }}>{children}</div>
  );
};

/** Abschnitt innerhalb einer Szene: sichtbar von a bis b, mit weichem Wechsel */
export const Abschnitt: React.FC<{ f: number; a: number; b: number; children: React.ReactNode }> = ({ f, a, b, children }) => {
  if (f < a - 1 || f > b + 1) return null;
  const o = Math.min(interpolate(f, [a, a + 10], [0, 1], klemm), interpolate(f, [b - 10, b], [1, 0], klemm));
  return <AbsoluteFill style={{ opacity: o }}>{children}</AbsoluteFill>;
};

/** Kreisblende: die Szene öffnet sich in den ersten «dauer» Bildern von einem Punkt aus über der vorigen, mit schwarzem Rand am Kreis */
export const Iris: React.FC<{ dauer: number; mitte: [number, number]; children: React.ReactNode }> = ({ dauer, mitte, children }) => {
  const f = useCurrentFrame();
  const t = interpolate(f, [0, dauer], [0, 1], { ...klemm, easing: Easing.bezier(0.55, 0, 0.35, 1) });
  const r = t * 1900;
  if (t >= 1) return <AbsoluteFill>{children}</AbsoluteFill>;
  return (
    <AbsoluteFill>
      <AbsoluteFill style={{ clipPath: `circle(${r}px at ${mitte[0]}px ${mitte[1]}px)` }}>{children}</AbsoluteFill>
      <svg width="1080" height="1440" style={{ position: "absolute", inset: 0 }}><circle cx={mitte[0]} cy={mitte[1]} r={r} fill="none" stroke={P.ink} strokeWidth="14" /></svg>
    </AbsoluteFill>
  );
};

/** Das Signet der Vorlage im Pop-Stil: kräftige schwarze Schlaufe, roter Punkt, fette Buchstaben; die Bühne (1920 hoch) steht mittig im 3:4-Bild */
const POPSIGNET: SignetStil = { grund: "transparent", tinte: P.ink, punkt: P.rot, strich: 13, punktR: 26, gewicht: 700 };
const Mittig: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div style={{ position: "absolute", left: 0, width: 1080, height: 1920, top: (1440 - 1920) / 2 }}>{children}</div>
);

/** Intro: Bildfeld mit Halbton, darin das Signet in kurzer Fassung; der Kopf als gelber Erzählkasten */
export const PopIntro: React.FC<{ kopf: Kopf }> = ({ kopf }) => {
  const f = useCurrentFrame();
  return (
    <Grundpunkte farbe="rgba(224,20,30,.55)">
      <Mittig><Signet tempo={2} stil={POPSIGNET} /></Mittig>
      <div style={{ position: "absolute", left: 0, right: 0, top: 150, display: "flex", justifyContent: "center", opacity: ein(f, 6, 12), transform: `translateY(${interpolate(f, [6, 22], [-30, 0], klemm)}px)` }}>
        <div style={{ background: P.gelb, border: `7px solid ${P.ink}`, padding: "20px 40px 16px", textAlign: "center" }}>
          <div style={fett(64, { letterSpacing: "0.12em", textTransform: "uppercase", lineHeight: 1 })}>{kopf.titel}</div>
          {kopf.unter?.length ? <div style={fett(32, { fontWeight: 600, letterSpacing: "0.06em", marginTop: 12 })}>{kopf.unter.join("  •  ")}</div> : null}
        </div>
      </div>
    </Grundpunkte>
  );
};

/** Outro: das Signet in voller Länge im Pop-Stil */
export const PopOutro: React.FC = () => (
  <Grundpunkte farbe="rgba(23,71,201,.5)">
    <Mittig><Signet stil={POPSIGNET} /></Mittig>
  </Grundpunkte>
);
