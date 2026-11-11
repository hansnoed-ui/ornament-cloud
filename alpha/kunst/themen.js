// «Kunst» – die Themen der Seite (Wunsch von Christian: «Kunst» am 1. November 2026; «Kommunikation», «Wahrnehmung», «psychisches System»,
// «Psyche» und «Gesellschaft» am 2. November 2026). Ein Beitrag gehört zu jedem Thema, dessen Muster in seinem Text vorkommt (Gross- und Kleinschreibung egal,
// auch in Zusammensetzungen wie «Kunstwerk» oder «Gesellschaftskonzepte»). Gemeinsam für tools/build-kunst.mjs und die Seite.
export const THEMEN = [
  { slug: "kunst", name: "Kunst", muster: /kunst/i },
  { slug: "kommunikation", name: "Kommunikation", muster: /kommunikation/i },
  { slug: "wahrnehmung", name: "Wahrnehmung", muster: /wahrnehm/i },
  { slug: "psychisches-system", name: "Psychisches System", muster: /psychische[nrs]?\s+system/i },
  { slug: "psyche", name: "Psyche", muster: /(?<![\p{L}])psychen?(?![\p{L}])/iu },
  { slug: "gesellschaft", name: "Gesellschaft", muster: /gesellschaft/i },
];
export const themenVon = (text) => THEMEN.filter((t) => t.muster.test(String(text))).map((t) => t.slug);
