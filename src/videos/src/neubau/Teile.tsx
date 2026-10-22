// Bausteine des Videos «neubau» in der Gestaltung von ornament.cloud/b/ (b/b.css): Papier und Tinte, die Blaupause als einziger Akzent,
// Instrument Sans für Oberfläche und Titel, Newsreader für die Texte des Zettelkastens, dünne Linien statt Kästen.
// Unabhängig von der Vorlage der übrigen Videos (src/vorlage/).
import React from "react";
import { AbsoluteFill, Easing, continueRender, delayRender, interpolate, staticFile } from "remotion";
import { loadFont } from "@remotion/fonts";
import daten from "./data/neubau.json";

export const F = daten.farben;
export const SANS = "Instrument Sans, system-ui, sans-serif";
export const SERIF = "Newsreader, Georgia, serif";
export const RAND = 90;          // seitlicher Rand (sicherer Bereich)
export const OBEN = 330;         // Inhalt beginnt unter der Kopfzeile

export const schriften = Promise.all([
  loadFont({ family: "Instrument Sans", url: staticFile("instrument-sans-normal-latin.woff2"), weight: "400 700" }),
  loadFont({ family: "Newsreader", url: staticFile("newsreader-normal-latin.woff2"), weight: "200 800" }),
  loadFont({ family: "Newsreader", url: staticFile("newsreader-italic-latin.woff2"), style: "italic", weight: "200 800" }),
]);

export const klemm = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;
export const weich = Easing.bezier(0.16, 1, 0.3, 1);

/** Papier als Grund; wartet mit dem Rendern, bis die Schriften geladen sind */
export const Papier: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [handle] = React.useState(() => delayRender("Schriften"));
  React.useEffect(() => { schriften.then(() => continueRender(handle)); }, [handle]);
  return <AbsoluteFill style={{ backgroundColor: F.papier, color: F.tinte, fontFamily: SANS }}>{children}</AbsoluteFill>;
};

/** Ein Zeichen aus src/b/zeichen.mjs (24 × 24, Linie, runde Enden), zeichnet sich mit p von 0 bis 1 – wie auf der Seite beim Berühren */
export const Zeichen: React.FC<{ markup: string; groesse: number; p?: number; dicke?: number; farbe?: string }> = ({ markup, groesse, p = 1, dicke = 3.5, farbe = F.faden }) => (
  <svg
    viewBox="0 0 24 24" width={groesse} height={groesse}
    style={{ flex: "none", overflow: "visible", fill: "none", color: farbe, stroke: farbe, strokeWidth: dicke / (groesse / 24), strokeLinecap: "round", strokeLinejoin: "round", strokeDasharray: 1, strokeDashoffset: 1 - p }}
    dangerouslySetInnerHTML={{ __html: markup }}
  />
);

// ---------- Das Signet: die Re-entry-Schlaufe r = b + a·cos t (src/b/tafeln.mjs, «signet») ----------
const LA = 1, LK = 1.2, LOFF = -0.84;
const punkt = (b: number, t: number): [number, number] => { const r = b + LA * Math.cos(t); return [LK * r * Math.cos(t) + LOFF, LK * r * Math.sin(t)]; };
// Ausdehnung der weitesten Form (b = 0,95), damit die Schlaufe beim Atmen im Bild bleibt
const WEIT = Array.from({ length: 241 }, (_, i) => punkt(0.95, (i / 240) * Math.PI * 2));
const XS = WEIT.map((p) => p[0]), YS = WEIT.map((p) => p[1]);
const MX = (Math.min(...XS) + Math.max(...XS)) / 2, MY = (Math.min(...YS) + Math.max(...YS)) / 2;
const SP = Math.max(Math.max(...XS) - Math.min(...XS), Math.max(...YS) - Math.min(...YS));

/** Signet: gezeichnet (0–1), Füllung der inneren Schleife (0–1), Lauf des Punkts (Umläufe), b (Weite); c: Farben (Standard: heller Modus) */
export const Signet: React.FC<{ groesse: number; gezeichnet: number; fuellung: number; lauf: number; b?: number; dicke?: number; c?: { tinte: string; faden: string; fadenHell: string } }> = ({ groesse, gezeichnet, fuellung, lauf, b = 0.6, dicke = 4, c = F }) => {
  const m = groesse / SP;
  const bild = ([x, y]: [number, number]) => `${((x - MX) * m + groesse / 2).toFixed(2)} ${((y - MY) * m + groesse / 2).toFixed(2)}`;
  const ts = Array.from({ length: 241 }, (_, i) => (i / 240) * Math.PI * 2);
  const d = ts.map((t, i) => (i ? "L" : "M") + bild(punkt(b, t))).join("") + "Z";
  const innen = ts.filter((t) => b + Math.cos(t) < 0);
  const dInnen = innen.length > 2 ? innen.map((t, i) => (i ? "L" : "M") + bild(punkt(b, t))).join("") + "Z" : "";
  const t = -Math.PI / 2 + lauf * Math.PI * 2;
  const [px, py] = bild(punkt(b, t)).split(" ").map(Number);
  return (
    <svg width={groesse} height={groesse} style={{ overflow: "visible" }}>
      {dInnen ? <path d={dInnen} fill={c.fadenHell} opacity={fuellung} /> : null}
      <path d={d} fill="none" stroke={c.tinte} strokeWidth={dicke} strokeLinejoin="round" strokeLinecap="round" pathLength={1} strokeDasharray="1 1" strokeDashoffset={1 - gezeichnet} />
      {fuellung > 0 ? <circle cx={px} cy={py} r={dicke * 4 * fuellung} fill={c.faden} /> : null}
    </svg>
  );
};

/** ein Element, das ab Bild a einblendet und um 28 px aufsteigt */
export const ein = (f: number, a: number, d = 18) => ({
  opacity: interpolate(f, [a, a + d * 0.7], [0, 1], klemm),
  translate: `0 ${interpolate(f, [a, a + d], [28, 0], { ...klemm, easing: weich })}px`,
});
/** eine Haarlinie, die sich von links nach rechts zieht */
export const Linie: React.FC<{ f: number; a: number; d?: number; dicke?: number }> = ({ f, a, d = 20, dicke = 2 }) => (
  <div style={{ height: dicke, backgroundColor: F.linie, transformOrigin: "0 50%", scale: `${interpolate(f, [a, a + d], [0, 1], { ...klemm, easing: weich })} 1` }} />
);

/** Abschnittskopf wie auf der Startseite: Zeichen und Titel, darunter der Satz in Grau */
export const Abschnitt: React.FC<{ f: number; zeichen: string; titel: string; text: string }> = ({ f, zeichen, titel, text }) => (
  <div style={{ position: "absolute", left: RAND, right: RAND, top: OBEN + 40 }}>
    <div style={{ display: "flex", alignItems: "center", gap: 22, ...ein(f, 6) }}>
      <Zeichen markup={zeichen} groesse={64} p={interpolate(f, [6, 30], [0, 1], klemm)} dicke={4} />
      <div style={{ fontWeight: 500, fontSize: 84, letterSpacing: "-0.02em", lineHeight: 1.05 }}>{titel}</div>
    </div>
    <div style={{ marginTop: 26, fontSize: 44, lineHeight: 1.3, color: F.grau, textWrap: "pretty", ...ein(f, 16) }}>{text}</div>
  </div>
);
