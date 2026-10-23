// Die Formate des Reels (Wunsch vom 23. Oktober 2026: «noch eine Version 4:5 (Hochformat), 1:1 und 16:9 Querformat») und ihr Raster.
// Keine skalierten oder beschnittenen Fassungen: jede Szene liest hier, wo Schlagzeile, Bild und Unterzeilen stehen.
// Hochformate (9:16, 4:5, 1:1) stapeln: Schlagzeile oben, Bild darunter. 16:9 hat zwei Spalten: links der Text, rechts das Bild.
import React from "react";

export type Format = "9:16" | "4:5" | "1:1" | "16:9";
export const MASSE: Record<Format, [number, number]> = { "9:16": [1080, 1920], "4:5": [1080, 1350], "1:1": [1080, 1080], "16:9": [1920, 1080] };

type Rechteck = { x: number; y: number; b: number; h: number };
export type Lage = {
  format: Format; w: number; h: number; quer: boolean;
  rand: number;                                   // seitlicher Rand
  kopf: { x: number; y: number; b: number; gr: number };   // Textspalte: Schlagzeile (Grösse gr), darunter Unterzeile und, im Querformat, weitere Zeilen
  bild: Rechteck;                                 // Fläche für Tafel, Feld, Telefon
  clip: Rechteck;                                 // Fläche für die Aufnahmen (4:5)
  clipUnterY: number | null;                      // Unterzeile unter der Aufnahme (Hochformate); im Querformat steht sie in der Textspalte
  mitteY: number;                                 // Mitte für die reinen Typografie-Szenen
  logo: { cy: number; mass: number };             // Schluss: wo die Mitte des Logos steht und wie gross es ist (1 = wie im Export)
};

const LAGEN: Record<Format, Omit<Lage, "format" | "w" | "h">> = {
  "9:16": { quer: false, rand: 90, kopf: { x: 90, y: 230, b: 900, gr: 100 }, bild: { x: 90, y: 610, b: 900, h: 1060 }, clip: { x: 90, y: 470, b: 900, h: 1125 }, clipUnterY: 1635, mitteY: 960, logo: { cy: 942, mass: 1 } },
  "4:5": { quer: false, rand: 90, kopf: { x: 90, y: 100, b: 900, gr: 88 }, bild: { x: 90, y: 450, b: 900, h: 850 }, clip: { x: 90, y: 300, b: 900, h: 850 }, clipUnterY: 1175, mitteY: 675, logo: { cy: 620, mass: 0.92 } },
  "1:1": { quer: false, rand: 90, kopf: { x: 90, y: 70, b: 900, gr: 76 }, bild: { x: 90, y: 370, b: 900, h: 660 }, clip: { x: 90, y: 250, b: 900, h: 620 }, clipUnterY: 890, mitteY: 540, logo: { cy: 470, mass: 0.8 } },
  "16:9": { quer: true, rand: 120, kopf: { x: 120, y: 200, b: 840, gr: 92 }, bild: { x: 1000, y: 90, b: 800, h: 900 }, clip: { x: 1000, y: 90, b: 800, h: 900 }, clipUnterY: null, mitteY: 540, logo: { cy: 470, mass: 0.8 } },
};

const Kontext = React.createContext<Format>("9:16");
export const FormatRahmen: React.FC<{ format: Format; children: React.ReactNode }> = ({ format, children }) => <Kontext.Provider value={format}>{children}</Kontext.Provider>;
export const useLage = (): Lage => {
  const format = React.useContext(Kontext);
  const [w, h] = MASSE[format];
  return { format, w, h, ...LAGEN[format] };
};
/** ein Kasten mit Seitenverhältnis b : h (z. B. 4 : 5), so gross wie möglich in der Fläche r, waagrecht mittig, oben bündig */
export const einpassen = (r: Rechteck, b: number, h: number): Rechteck => {
  const hoehe = Math.min(r.h, (r.b * h) / b), breite = (hoehe * b) / h;
  return { x: r.x + (r.b - breite) / 2, y: r.y, b: breite, h: hoehe };
};
