// Die Sprache des Reels (Deutsch, seit dem 23. Oktober 2026 auch Englisch): jede Szene holt ihre Texte über useDaten().
import React from "react";
import de from "./data/reel.json";
import en from "./data/reel-en.json";

export type Sprache = "de" | "en";
export type Daten = typeof de;
const DATEN: Record<Sprache, Daten> = { de, en };
const Kontext = React.createContext<Sprache>("de");
export const SpracheRahmen: React.FC<{ sprache: Sprache; children: React.ReactNode }> = ({ sprache, children }) => <Kontext.Provider value={sprache}>{children}</Kontext.Provider>;
export const useDaten = (): Daten => DATEN[React.useContext(Kontext)];
