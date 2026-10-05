// Stil aller Videos von ornament.cloud: Farben und Schriften wie auf der Website (styles.css, heller Modus), Hochformat 9:16, 30 fps.
// Die Schriften kopiert vorbereiten.mjs aus vendor/fonts/ nach public/.
import { loadFont } from "@remotion/fonts";
import { staticFile } from "remotion";

export const FARBE = {
  grund: "#f8f8f6",
  text: "#1f1d1a",
  leise: "#6b665e",
  akzent: "#c2410c",
  linie: "#d6d6d3",
};

export const SERIF = "Newsreader, Georgia, serif";
export const SANS = "Instrument Sans, system-ui, sans-serif";

export const schriften = Promise.all([
  loadFont({ family: "Newsreader", url: staticFile("newsreader-normal-latin.woff2"), weight: "200 800" }),
  loadFont({ family: "Newsreader", url: staticFile("newsreader-italic-latin.woff2"), style: "italic", weight: "200 800" }),
  loadFont({ family: "Instrument Sans", url: staticFile("instrument-sans-normal-latin.woff2"), weight: "400 700" }),
]);

// Bildmasse (Hochformat 9:16) und Takt
export const BREITE = 1080;
export const HOEHE = 1920;
export const FPS = 30;
