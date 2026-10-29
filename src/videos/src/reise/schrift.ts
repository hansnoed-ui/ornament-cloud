// Schrift der Reise je Fassung (29. Oktober 2026): die erste Fassung mit Newsreader und Instrument Sans wie die Vorlage; die Fassung «Gewebe» moderner,
// eine Grotesk im Stil von Helvetica Now (Wunsch: «die schrift insgesamt etwas moderner im style helvetica now»). Helvetica Now selbst ist eine Kaufschrift
// und liegt nicht vor; Inter Display (vendor/fonts/, 500 und 600) kommt ihr am nächsten. Ohne Kursive: Kernsätze stehen gerade, abgesetzt durch Farbe.
import React from "react";
import { loadFont } from "@remotion/fonts";
import { staticFile } from "remotion";
import { SANS, SERIF } from "../vorlage/stil";

export type Schrift = { serif: string; sans: string; kursiv: "italic" | "normal"; spur: string };
export const KLASSISCH: Schrift = { serif: SERIF, sans: SANS, kursiv: "italic", spur: "-0.01em" };
export const GROTESK: Schrift = { serif: "Inter Display, Instrument Sans, sans-serif", sans: "Inter Display, Instrument Sans, sans-serif", kursiv: "normal", spur: "-0.025em" };
export const SchriftKontext = React.createContext<Schrift>(KLASSISCH);
export const interLaden = () => Promise.all([
  loadFont({ family: "Inter Display", url: staticFile("inter-display-500-latin.woff2"), weight: "500" }),
  loadFont({ family: "Inter Display", url: staticFile("inter-display-600-latin.woff2"), weight: "600" }),
]);
