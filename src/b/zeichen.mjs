// Die Zeichen des Neubaus /b/: ein Satz Linien-Piktogramme auf einem Raster von 24 × 24, Strich 1.5, runde Enden, kein Füllen
// (Ausnahme: der Punkt). Jedes Element trägt pathLength="1", damit sich die Zeichen beim Berühren zeichnen können (b.css, .zeichen).
// Verwendet für Apps, Prüfraster, Leistungen, die Gattungen der Fäden und die Abschnitte der Startseite.

const P = 'pathLength="1" vector-effect="non-scaling-stroke"';
const svg = (inhalt, titel) => `<svg class="zeichen" viewBox="0 0 24 24" aria-hidden="true" focusable="false"${titel ? ` data-zeichen="${titel}"` : ""}>${inhalt}</svg>`;

export const ZEICHEN = {
  // ---- Apps ----
  rad: svg(`<circle cx="12" cy="12" r="9" ${P}/><circle cx="12" cy="12" r="5" ${P}/><path d="M12 3v2.5" ${P}/><path d="M12 7v2" ${P}/><circle cx="12" cy="12" r="0.9" ${P}/>`),
  orma: svg(`<path d="M12 3a9 9 0 0 0 0 18" ${P}/><path d="M12 3a9 9 0 0 1 0 18z" fill="currentColor" ${P}/><path d="M12 3v18" ${P}/>`),
  farbe: svg(`<circle cx="12" cy="12" r="9" ${P}/><circle cx="12" cy="12" r="3.5" ${P}/><path d="M12 3v5.5" ${P}/><path d="M20.1 8.4l-4.9 2" ${P}/><path d="M19.4 17.5l-4.6-3" ${P}/><path d="M12 21v-5.5" ${P}/><path d="M4.6 17.5l4.6-3" ${P}/><path d="M3.9 8.4l4.9 2" ${P}/>`),
  scherbe: svg(`<path d="M12 2.8l8 4.6v9.2l-8 4.6-8-4.6V7.4z" ${P}/><path d="M12 2.8v9.2l8 4.6" ${P}/><path d="M12 12l-8 4.6" ${P}/><path d="M4 7.4l8 4.6 8-4.6" ${P}/>`),
  netz: svg(`<path d="M5 7l8 5 5-7" ${P}/><path d="M13 12l-6 6" ${P}/><path d="M13 12l6 5" ${P}/><path d="M5 7l13-2" ${P}/><circle cx="13" cy="12" r="1.5" fill="currentColor" ${P}/>`),
  linie: svg(`<path d="M3 17c3-9 6 2 9-4s4-9 7-4-1 9-5 8" ${P}/><circle cx="14" cy="17" r="1.3" fill="currentColor" ${P}/>`),
  faden: svg(`<path d="M5 8l7-4 7 4v8l-7 4-7-4z" ${P}/><path d="M5 8l7 4 7-4" ${P}/><path d="M12 12v8" ${P}/><path d="M8 14c2-3 5 1 8-2" ${P}/>`),
  teile: svg(`<path d="M4 4h7v7H4z" ${P}/><path d="M14 3h7v7h-7z" ${P}/><path d="M3 14h7v7H3z" ${P}/><path d="M13 13h7v7h-7z" ${P}/>`),
  // ---- Prüfraster ----
  "nebeneinander-nacheinander": svg(`<path d="M4 4h16v16H4z" ${P}/><path d="M12 4v16" ${P}/><path d="M4 12h16" ${P}/><path d="M13 5h6v6h-6z" fill="currentColor" ${P}/>`),
  verteilapparat: svg(`<path d="M12 3v18" ${P}/><path d="M6 8h12" ${P}/><path d="M8 12h8" ${P}/><path d="M10 16h4" ${P}/><circle cx="12" cy="3.5" r="1.4" fill="currentColor" ${P}/>`),
  gesellschaftskonzepte: svg(`<circle cx="12" cy="6" r="2.2" ${P}/><circle cx="6" cy="17" r="2.2" ${P}/><circle cx="18" cy="17" r="2.2" ${P}/><path d="M10.9 7.9l-3.8 7.2" ${P}/><path d="M13.1 7.9l3.8 7.2" ${P}/><path d="M8.2 17h7.6" ${P}/>`),
  "journalistische-texte": svg(`<path d="M5 5h14" ${P}/><path d="M5 9h14" ${P}/><path d="M5 13h8" ${P}/><path d="M5 17h6" ${P}/><path d="M14 17l2.5 2.5L21 15" ${P}/>`),
  // ---- Leistungen ----
  webdesign: svg(`<path d="M3 5h18v14H3z" ${P}/><path d="M3 9h18" ${P}/><circle cx="6" cy="7" r="0.7" fill="currentColor" ${P}/><path d="M7 13h5" ${P}/><path d="M7 16h8" ${P}/>`),
  vermittlung: svg(`<circle cx="8" cy="9" r="3" ${P}/><circle cx="16" cy="9" r="3" ${P}/><path d="M3 20c0-3 2-5 5-5s5 2 5 5" ${P}/><path d="M13 15c3 0 5 2 5 5h3" ${P}/>`),
  kuration: svg(`<path d="M3 20h18" ${P}/><path d="M4 5h5v7H4z" ${P}/><path d="M11 8h5v5h-5z" ${P}/><path d="M18 4h3v9h-3z" ${P}/>`),
  produkte: svg(`<path d="M4 4h16v16H4z" ${P}/><path d="M7 7h10v10H7z" ${P}/><path d="M7 15c2-3 4-3 6-1s3 1 4-1" ${P}/><circle cx="10.5" cy="10" r="1.2" ${P}/>`),
  // ---- Gattungen der Fäden ----
  zettel: svg(`<path d="M5 3h11l3 3v15H5z" ${P}/><path d="M16 3v3h3" ${P}/><path d="M8 10h8" ${P}/><path d="M8 13.5h8" ${P}/><path d="M8 17h5" ${P}/>`),
  app: svg(`<path d="M4 4h7v7H4z" ${P}/><path d="M13 4h7v7h-7z" ${P}/><path d="M4 13h7v7H4z" ${P}/><path d="M13 13h7v7h-7z" ${P}/>`),
  raster: svg(`<path d="M4 4h16v16H4z" ${P}/><path d="M12 4v16" ${P}/><path d="M4 12h16" ${P}/>`),
  angebot: svg(`<path d="M4 16l6-9 4 5 6-8" ${P}/><circle cx="4" cy="16" r="1.4" fill="currentColor" ${P}/><circle cx="20" cy="4" r="1.4" fill="currentColor" ${P}/>`),
  konstellation: svg(`<circle cx="6" cy="6" r="2" ${P}/><circle cx="18" cy="18" r="2" ${P}/><circle cx="18" cy="6" r="2" ${P}/><circle cx="6" cy="18" r="2" ${P}/><path d="M7.5 7.5l9 9" ${P}/><path d="M16.5 7.5l-9 9" ${P}/>`),
  person: svg(`<circle cx="12" cy="8" r="4" ${P}/><path d="M4 21c0-4 3.5-7 8-7s8 3 8 7" ${P}/>`),
  // ---- Abschnitte der Startseite ----
  denken: svg(`<path d="M20.6 12a8.6 8.6 0 1 1-2.2-5.7" ${P}/><path d="M12 7a5 5 0 1 0 5 5" ${P}/><circle cx="12" cy="12" r="1.3" fill="currentColor" ${P}/>`),
  spielen: svg(`<circle cx="12" cy="12" r="9" ${P}/><path d="M12 3l0 9 6.4 6.4" ${P}/><circle cx="12" cy="12" r="1.3" fill="currentColor" ${P}/>`),
  arbeiten: svg(`<path d="M4 20l3.5-1 11-11-2.5-2.5-11 11z" ${P}/><path d="M13.5 8l2.5 2.5" ${P}/><path d="M4 20l1-3.5" ${P}/>`),
  werke: svg(`<path d="M3 4h18v16H3z" ${P}/><path d="M6 7h12v10H6z" ${P}/><path d="M6 15l4-4 3 3 2-2 3 3" ${P}/>`),
  zuletzt: svg(`<circle cx="12" cy="12" r="9" ${P}/><path d="M12 7v5l3.5 2" ${P}/>`),
  liste: svg(`<path d="M3 6h18v12H3z" ${P}/><path d="M3 7l9 6 9-6" ${P}/>`),
  // ---- Bedienung ----
  schliessen: svg(`<path d="M6 6l12 12" ${P}/><path d="M18 6L6 18" ${P}/>`),
  vollbild: svg(`<path d="M4 9V4h5" ${P}/><path d="M20 9V4h-5" ${P}/><path d="M4 15v5h5" ${P}/><path d="M20 15v5h-5" ${P}/>`),
  tab: svg(`<path d="M14 4h6v6" ${P}/><path d="M20 4l-9 9" ${P}/><path d="M18 13v7H4V6h7" ${P}/>`),
  pfeil: svg(`<path d="M4 12h15" ${P}/><path d="M13 6l6 6-6 6" ${P}/>`),
  lesen: svg(`<path d="M3 5h7a2 2 0 0 1 2 2v13a2 2 0 0 0-2-2H3z" ${P}/><path d="M21 5h-7a2 2 0 0 0-2 2v13a2 2 0 0 1 2-2h7z" ${P}/>`),
  zufall: svg(`<path d="M4 4h16v16H4z" ${P}/><circle cx="8.5" cy="8.5" r="1.2" fill="currentColor" ${P}/><circle cx="15.5" cy="8.5" r="1.2" fill="currentColor" ${P}/><circle cx="12" cy="12" r="1.2" fill="currentColor" ${P}/><circle cx="8.5" cy="15.5" r="1.2" fill="currentColor" ${P}/><circle cx="15.5" cy="15.5" r="1.2" fill="currentColor" ${P}/>`),
};

export const zeichen = (name) => ZEICHEN[name] || "";
