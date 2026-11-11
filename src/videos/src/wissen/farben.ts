// Farben des Videos «Wissen»: der Look des Labs (Landing-Page beta/lab/, Lab 0.1) auf Schwarz, je Bereich des Tresors eine Farbe.
// Nur für dieses Video; die anderen Videos nehmen FARBE aus vorlage/stil.ts.
export const LAB = { grund: "#000000", tinte: "#ffffff", leise: "#9a9a9a", blau: "#8fb0ff", rot: "#e0533f", faden: "#3a4a7a" };

/** je Bereich eine Farbe und ein Name (Mehrzahl, wie im Video gezeigt) */
export const BEREICH: Record<string, { farbe: string; name: string; eins: string }> = {
  werke: { farbe: "#8fb0ff", name: "Werke", eins: "Werk" },
  konzepte: { farbe: "#f6b3c7", name: "Konzepte", eins: "Konzept" },
  quellen: { farbe: "#e0533f", name: "Quellen", eins: "Quelle" },
  ornament: { farbe: "#d8d8d8", name: "Rohnotizen zu ornament", eins: "Rohnotiz" },
  chats: { farbe: "#7a8aa8", name: "Chats", eins: "Chat" },
  artikel: { farbe: "#6f6f6f", name: "Artikel", eins: "Artikel" },
  uebrig: { farbe: "#555555", name: "Übriges", eins: "Notiz" },
};
