// Vorlage für alle Videos von ornament.cloud: das animierte Signet (Intro in kurzer Fassung, Outro in voller Länge), seit 5. Oktober 2026.
// Zuerst ein leerer, heller Bildschirm. In der Mitte zeichnet sich die Re-entry-Schlaufe (die flache Ausgangsform
// des Artefakts «Re-entry-Knoten», werke/reentry/: r = LB + LA · cos t), ein orangeroter Punkt durchläuft sie.
// Darunter erscheinen zuerst nur Kästchen, eines je Zeichen, und aus jedem bildet sich ein Buchstabe von «ornament.cloud».
import React from "react";
import { AbsoluteFill, Easing, interpolate, useCurrentFrame } from "remotion";
import { FARBE, SANS } from "./stil";

const klemm = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;
const weich = Easing.bezier(0.16, 1, 0.3, 1);

// Schlaufe wie im Artefakt (LA = 1, LB = 0.45, LK = 1.2, LOFF = −0.84), hier flach in der Bildebene
const LA = 1, LB = 0.45, LK = 1.2, LOFF = -0.84;
const punkt = (t: number): [number, number] => {
  const r = LB + LA * Math.cos(t);
  return [LK * r * Math.cos(t) + LOFF, LK * r * Math.sin(t)];
};
const N = 360;
const PUNKTE = Array.from({ length: N + 1 }, (_, i) => punkt((i / N) * Math.PI * 2));
// Mitte und Ausdehnung der Schlaufe, damit sie im Bild zentriert steht
const xs = PUNKTE.map((p) => p[0]), ys = PUNKTE.map((p) => p[1]);
const MX = (Math.min(...xs) + Math.max(...xs)) / 2, MY = (Math.min(...ys) + Math.max(...ys)) / 2;
const SPANNE = Math.max(Math.max(...xs) - Math.min(...xs), Math.max(...ys) - Math.min(...ys));
const MASS = 520 / SPANNE;                       // Schlaufe etwa 520 px breit
const bild = ([x, y]: [number, number]) => [540 + (x - MX) * MASS, 820 + (y - MY) * MASS] as const;
const PFAD = PUNKTE.map((p, i) => `${i ? "L" : "M"}${bild(p).map((v) => v.toFixed(1)).join(",")}`).join("");

const NAME = "ornament.cloud";
// Schriftzug (Wunsch vom 5. Oktober 2026): etwas kleiner, feiner (Gewicht 400) und mit mehr Buchstabenabstand
const KASTEN = 52, ABSTAND = 4, SCHRIFT = 52, GEWICHT = 400, SPERRUNG = 0.14 * SCHRIFT;   // seit 5. Oktober 2026 kleiner (vorher 62 px) und tiefer

/** Breite jedes Zeichens in der Schrift der Website (ohne Zwischenspeicher: gemessen wird erst, wenn die Schrift geladen ist) */
const breiten = (gewicht = GEWICHT): number[] => {
  const c = document.createElement("canvas").getContext("2d")!;
  c.font = `${gewicht} ${SCHRIFT}px ${SANS}`;
  return NAME.split("").map((z) => c.measureText(z).width);
};

// Obere Kante der Schlaufe (für den Kopf im Intro)
const OBEN = Math.min(...PUNKTE.map((p) => bild(p)[1]));

/** Kopfzeile über der Schlaufe (im Intro): ein Name in Versalien, darunter Stichworte mit kleinem Punkt dazwischen, im Rot-Orange der Seite.
 *  Beispiel aus dem ORNA-Video: { titel: "ORNA", unter: ["app", "web"] } */
export type Kopf = { titel: string; unter?: string[] };

/** Optionaler Stil für ein einzelnes Video (seit 6. Oktober 2026, «Drei im Doppelspalt der Wahrnehmung»: Pop-Art).
 *  Ohne Angabe bleibt das Signet genau wie in allen anderen Videos. */
export type SignetStil = { grund?: string; tinte?: string; punkt?: string; strich?: number; punktR?: number; gewicht?: number };

/** tempo: 1 = Outro (180 Bilder), 2 = kurze Fassung als Intro (90 Bilder). kopf: nur im Intro. stil: siehe SignetStil. */
export const Signet: React.FC<{ tempo?: number; kopf?: Kopf | null; stil?: SignetStil }> = ({ tempo = 1, kopf = null, stil = {} }) => {
  const { grund = FARBE.grund, tinte = FARBE.text, punkt: punktFarbe = FARBE.akzent, strich = 3, punktR = 13, gewicht = GEWICHT } = stil;
  const bildNr = useCurrentFrame();
  const f = bildNr * tempo;
  // 0–14 leer; 14–56 die Schlaufe zeichnet sich; ab 40 läuft der Punkt (eine Runde in 54 Bildern)
  const gezeichnet = interpolate(f, [14, 56], [0, 1], { ...klemm, easing: Easing.bezier(0.45, 0, 0.25, 1) });
  // der Punkt läuft im Intro nicht doppelt so schnell mit, sondern ruhig: eine Runde in 64 Bildern (am Schluss in 54)
  const start = 40 / tempo, runde = tempo > 1 ? 64 : 54;
  const lauf = Math.max(0, bildNr - start) / runde;
  const [px, py] = bild(punkt(-Math.PI / 2 + lauf * Math.PI * 2));
  const punktSicht = interpolate(f, [40, 48], [0, 1], klemm);
  // nachdem alle Buchstaben stehen, rücken die Kästchen auf die natürliche Breite der Buchstaben zusammen
  const zusammen = interpolate(f, [128, 146], [0, 1], { ...klemm, easing: Easing.bezier(0.65, 0, 0.35, 1) });
  const w = breiten(gewicht).map((b) => interpolate(zusammen, [0, 1], [KASTEN, b]));
  const abstand = interpolate(zusammen, [0, 1], [ABSTAND, SPERRUNG]);
  const breite = w.reduce((x, y) => x + y, 0) + (NAME.length - 1) * abstand;
  return (
    <AbsoluteFill style={{ backgroundColor: grund }}>
      <svg width={1080} height={1920} style={{ position: "absolute", inset: 0 }}>
        <path d={PFAD} fill="none" stroke={tinte} strokeWidth={strich} strokeLinecap="round" strokeLinejoin="round"
          pathLength={1} strokeDasharray="1 1" strokeDashoffset={1 - gezeichnet} />
        <circle cx={px} cy={py} r={punktR} fill={punktFarbe} opacity={punktSicht} />
      </svg>
      {kopf ? (
        <div style={{
          position: "absolute", left: 0, right: 0, top: OBEN - 230, display: "flex", flexDirection: "column", alignItems: "center", gap: 18,
          color: FARBE.akzent, fontFamily: SANS, opacity: interpolate(f, [10, 40], [0, 1], klemm),
          translate: `0 ${interpolate(f, [10, 40], [16, 0], { ...klemm, easing: weich })}px`,
        }}>
          <div style={{ fontWeight: 600, fontSize: 44, letterSpacing: "0.22em", marginRight: "-0.22em", textTransform: "uppercase" }}>{kopf.titel}</div>
          {kopf.unter?.length ? (
            <div style={{ fontWeight: 500, fontSize: 32, letterSpacing: "0.16em", marginRight: "-0.16em", display: "flex", alignItems: "center", gap: "0.5em" }}>
              {kopf.unter.map((w, i) => (
                <React.Fragment key={i}>{i ? <span style={{ fontSize: "0.6em" }}>•</span> : null}{w}</React.Fragment>
              ))}
            </div>
          ) : null}
        </div>
      ) : null}
      <div style={{ position: "absolute", top: 1175, left: (1080 - breite) / 2, display: "flex", gap: abstand }}>
        {NAME.split("").map((z, i) => {
          const a = 58 + i * 2;           // Kästchen erscheinen nacheinander
          const b = 78 + i * 3;           // dann bildet sich aus jedem ein Buchstabe
          const kasten = interpolate(f, [a, a + 8], [0, 1], klemm);
          const wird = interpolate(f, [b, b + 14], [0, 1], { ...klemm, easing: weich });
          return (
            <div key={i} style={{ position: "relative", width: w[i], height: KASTEN * 1.3 }}>
              {/* das Kästchen: zuerst eine Fläche, die sich zum Buchstaben zusammenzieht */}
              <div style={{
                position: "absolute", inset: 0, opacity: kasten * (1 - wird),
                border: `${Math.max(3, strich * 0.6)}px solid ${tinte}`, background: tinte + "14",
                scale: interpolate(wird, [0, 1], [1, 0.55]), borderRadius: interpolate(wird, [0, 1], [0, 18]),
              }} />
              <div style={{
                position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center",
                fontFamily: SANS, fontWeight: gewicht, fontSize: SCHRIFT, lineHeight: 1, color: z === "." ? punktFarbe : tinte,
                opacity: wird, scale: interpolate(wird, [0, 1], [1.35, 1]),
                clipPath: `inset(${interpolate(wird, [0, 1], [50, 0])}% ${interpolate(wird, [0, 1], [50, 0])}%)`,
              }}>{z}</div>
            </div>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};
