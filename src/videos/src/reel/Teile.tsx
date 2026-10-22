// Bausteine des Reels in der Gestaltung von /b/: Grund in Papier oder Tinte (echte Umkehr wie hell und dunkel auf der Seite),
// Schlagzeilen Wort für Wort aus einer Maske, Unterzeilen mit Zeichen, die lebenden Tafeln aus src/b/tafeln.mjs.
import React from "react";
import { AbsoluteFill, Easing, continueRender, delayRender, interpolate } from "remotion";
// @ts-expect-error -- JS-Modul der Website ohne Typen
import { TAFELN, farben, W } from "../../../../src/b/tafeln.mjs";
import daten from "./data/reel.json";
import { SANS, Zeichen, schriften } from "../neubau/Teile";

export type Modus = "hell" | "dunkel";
export const C = (m: Modus) => (m === "hell" ? daten.hell : daten.dunkel);
export const RAND = 90;
export const klemm = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;
export const weich = Easing.bezier(0.16, 1, 0.3, 1);
export const TAKT = 15;   // ein Schlag (0,5 s bei 120 Schlägen je Minute): Schnitte und Einsätze liegen darauf, damit sich Musik darunterlegen lässt

/** Grund der Szene; wartet mit dem Rendern auf die Schriften */
export const Grund: React.FC<{ m: Modus; children: React.ReactNode }> = ({ m, children }) => {
  const [handle] = React.useState(() => delayRender("Schriften"));
  React.useEffect(() => { schriften.then(() => continueRender(handle)); }, [handle]);
  return <AbsoluteFill style={{ backgroundColor: C(m).papier, color: C(m).tinte, fontFamily: SANS, overflow: "hidden" }}>{children}</AbsoluteFill>;
};

/** Schlagzeile: jedes Wort steigt aus seiner Maske, ab Bild a, je Wort s Bilder später */
export const Schlagzeile: React.FC<{ f: number; text: string; a?: number; s?: number; groesse?: number; style?: React.CSSProperties; farbe?: (i: number) => string | undefined }> = ({ f, text, a = 0, s = 3, groesse = 104, style, farbe }) => (
  <div style={{ fontWeight: 500, fontSize: groesse, letterSpacing: "-0.03em", lineHeight: 1.02, display: "flex", flexWrap: "wrap", columnGap: "0.24em", ...style }}>
    {text.split(" ").map((w, i) => (
      <span key={i} style={{ display: "inline-block", overflow: "hidden", paddingBottom: "0.08em", marginBottom: "-0.08em" }}>
        <span style={{ display: "inline-block", color: farbe?.(i), translate: `0 ${interpolate(f, [a + i * s, a + i * s + 14], [110, 0], { ...klemm, easing: weich })}%` }}>{w}</span>
      </span>
    ))}
  </div>
);

/** Unterzeile: Zeichen in der Blaupause, Name, Beschreibung in Grau */
export const Unterzeile: React.FC<{ f: number; a: number; m: Modus; zeichen: string; name: string; text: string; style?: React.CSSProperties }> = ({ f, a, m, zeichen, name, text, style }) => (
  <div style={{ display: "flex", gap: 24, alignItems: "flex-start", opacity: interpolate(f, [a, a + 8], [0, 1], klemm), translate: `0 ${interpolate(f, [a, a + 16], [24, 0], { ...klemm, easing: weich })}px`, ...style }}>
    <div style={{ paddingTop: 4 }}><Zeichen markup={zeichen} groesse={56} p={interpolate(f, [a, a + 22], [0, 1], klemm)} dicke={4} farbe={C(m).faden} /></div>
    <div>
      <div style={{ fontWeight: 500, fontSize: 46, letterSpacing: "-0.01em" }}>{name}</div>
      <div style={{ fontSize: 36, lineHeight: 1.3, color: C(m).grau, marginTop: 4 }}>{text}</div>
    </div>
  </div>
);

// ---------- Die lebenden Tafeln der Website ----------
type Tafel = { neu: () => unknown; keim?: () => unknown; schritt: (z: unknown, dt: number) => void; svg: (z: unknown, c: unknown) => string };
const stand = new Map<string, { f: number; z: unknown }>();
/** Eine Tafel aus src/b/tafeln.mjs zum Bild f: deterministisch weitergerechnet (je Bild 1/30 s), ab vorlauf Sekunden nach dem Ruhebild */
export const LebendeTafel: React.FC<{ slug: string; f: number; m: Modus; groesse: number; vorlauf?: number; keim?: boolean }> = ({ slug, f, m, groesse, vorlauf = 0, keim = false }) => {
  const t = (TAFELN as Record<string, Tafel>)[slug];
  const schluessel = `${slug}:${vorlauf}:${keim}`;
  const ziel = Math.max(0, Math.round(f + vorlauf * 30));
  let e = stand.get(schluessel);
  if (!e || e.f > ziel) { e = { f: 0, z: keim && t.keim ? t.keim() : t.neu() }; stand.set(schluessel, e); }
  while (e.f < ziel) { t.schritt(e.z, 1 / 30); e.f++; }
  return <svg viewBox={`0 0 ${W} ${W}`} width={groesse} height={groesse} dangerouslySetInnerHTML={{ __html: t.svg(e.z, farben(m === "dunkel")) }} />;
};
