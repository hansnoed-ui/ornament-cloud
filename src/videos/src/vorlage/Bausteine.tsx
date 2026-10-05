// Bausteine für die Szenen aller Videos von ornament.cloud (aus dem ORNA-Video, 5. Oktober 2026).
// Sicherer Bereich: 90 px seitlich, Texte oben ab 150 px, unten ab 1475 px (dazwischen Platz für ein Bild, z. B. das Rad).
import React from "react";
import { AbsoluteFill, Easing, continueRender, delayRender, interpolate, useCurrentFrame } from "remotion";
import { Signet, type Kopf } from "./Signet";
import { FARBE, SANS, SERIF, schriften } from "./stil";

export const klemm = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;
export const weich = Easing.bezier(0.16, 1, 0.3, 1);
/** Ein- und Ausblenden eines Abschnitts von a bis b (je d Bilder) */
export const blende = (f: number, a: number, b: number, d = 12) =>
  interpolate(f, [a, a + d, b - d, b], [0, 1, 1, 0], klemm);
/** sanftes Aufsteigen um 24 px ab Bild a */
export const steig = (f: number, a: number, d = 18) => interpolate(f, [a, a + d], [24, 0], { ...klemm, easing: weich });

/** Kennzeile: Versalien, gesperrt, standardmässig im Rot-Orange */
export const Marke: React.FC<{ children: React.ReactNode; farbe?: string }> = ({ children, farbe = FARBE.akzent }) => (
  <div style={{ fontFamily: SANS, fontWeight: 600, fontSize: 30, letterSpacing: "0.16em", textTransform: "uppercase", color: farbe }}>{children}</div>
);
/** Titel in der Serifenschrift (Newsreader) */
export const Titel: React.FC<{ children: React.ReactNode; groesse?: number }> = ({ children, groesse = 76 }) => (
  <div style={{ fontFamily: SERIF, fontWeight: 400, fontSize: groesse, lineHeight: 1.12, color: FARBE.text, textWrap: "balance" }}>{children}</div>
);
/** leise Erklärzeile (Instrument Sans, grau) */
export const Leise: React.FC<{ children: React.ReactNode; groesse?: number }> = ({ children, groesse = 40 }) => (
  <div style={{ fontFamily: SANS, fontSize: groesse, lineHeight: 1.35, color: FARBE.leise, textWrap: "balance" }}>{children}</div>
);
/** Textblock oben bzw. unten im sicheren Bereich */
export const Oben: React.FC<{ children: React.ReactNode; o: number; y: number }> = ({ children, o, y }) => (
  <div style={{ position: "absolute", left: 90, right: 90, top: 150, opacity: o, translate: `0 ${y}px`, display: "flex", flexDirection: "column", gap: 22 }}>{children}</div>
);
export const Unten: React.FC<{ children: React.ReactNode; o: number; y: number }> = ({ children, o, y }) => (
  <div style={{ position: "absolute", left: 90, right: 90, top: 1475, opacity: o, translate: `0 ${y}px`, display: "flex", flexDirection: "column", gap: 16 }}>{children}</div>
);

/** Auszug aus einem Text des Werks: gross und gut lesbar, mit «[…]» als Auszug gekennzeichnet.
 *  Der Auszug muss wörtlich aus dem Text stammen (im Datenskript prüfen, nie von Hand abtippen). */
export const Auszug: React.FC<{ kennzeile: React.ReactNode; text: string; hinweis: string; dauer: number }> = ({ kennzeile, text, hinweis, dauer }) => {
  const f = useCurrentFrame();
  return (
    <>
      <Oben o={blende(f, 8, dauer)} y={steig(f, 8)}>
        <Marke>{kennzeile}</Marke>
      </Oben>
      <div style={{ position: "absolute", left: 90, right: 90, top: 560, opacity: blende(f, 14, dauer), translate: `0 ${steig(f, 14)}px` }}>
        <div style={{ fontFamily: SERIF, fontSize: 62, lineHeight: 1.32, color: FARBE.text, textWrap: "pretty" }}>
          {text} […]
        </div>
        <div style={{ marginTop: 44 }}><Leise groesse={32}>{hinweis}</Leise></div>
      </div>
    </>
  );
};

// ---------- Intro und Outro ----------
export const INTRO = 90;    // Bilder (3 s)
export const OUTRO = 180;   // Bilder (6 s)

/** Intro: das Signet in kurzer Fassung (doppelt so schnell), mit Kopfzeile, am Ende ausgeblendet */
export const Intro: React.FC<{ kopf: Kopf }> = ({ kopf }) => {
  const f = useCurrentFrame();
  return (
    <AbsoluteFill style={{ opacity: interpolate(f, [INTRO - 12, INTRO], [1, 0], klemm) }}>
      <Signet tempo={2} kopf={kopf} />
    </AbsoluteFill>
  );
};

/** Outro: das Signet in voller Länge, ohne Kopfzeile */
export const Outro: React.FC = () => <Signet />;

/** Grund jedes Videos: heller Hintergrund, wartet mit dem Rendern, bis die Schriften geladen sind */
export const Grund: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [handle] = React.useState(() => delayRender("Schriften"));
  React.useEffect(() => { schriften.then(() => continueRender(handle)); }, [handle]);
  return <AbsoluteFill style={{ backgroundColor: FARBE.grund }}>{children}</AbsoluteFill>;
};
