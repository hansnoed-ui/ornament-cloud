// ORNAMENT LAB – Module erst bei Bedarf laden, mit Wiederholung (seit Lab 0.1.42). Christian (25. Oktober 2026, Chrome auf Android): «Fehler: Failed
// to fetch dynamically imported module: …/alpha/bildfragmentieren/raum.js?v=36» in der Zusammenstellung, obwohl die Datei auf Hostpoint liegt.
// Ein Telefon verliert kurz das Netz, und Chrome merkt sich ein misslungenes Modul für die ganze Seite: jedes weitere import() derselben Adresse
// scheitert sofort, ohne neu zu fragen, bis die Seite neu geladen ist (und damit das Projekt weg). Darum hier: nach einer kurzen Pause noch einmal
// mit einer neuen Adresse (…&neu=2), die Chrome als anderes Modul lädt. Scheitert eine Datei, die das Modul selbst importiert (three.js über die
// Import-Map), hilft keine neue Adresse; dann bleibt nur das Neuladen der Seite, und die Meldung sagt es.

const warte = (ms) => new Promise((r) => setTimeout(r, ms));
const mitVersuch = (url, n) => (n < 2 ? url : `${url}${url.includes("?") ? "&" : "?"}neu=${n}`);

/** ein Modul laden (url absolut, z. B. new URL("…", import.meta.url).href); bis zu `versuche` Mal, die Pause wächst; titel nennt es in der Meldung */
export async function modulLaden(url, { titel = "ein Teil des Labs", versuche = 3, pause = 800, melden = null, laden = (u) => import(u) } = {}) {
  let fehler = null;
  for (let n = 1; n <= versuche; n++) {
    try { return await laden(mitVersuch(url, n)); } catch (f) { fehler = f; }
    if (n < versuche) { melden?.(`${titel}: Laden misslungen, neuer Versuch (${n + 1} von ${versuche})`, null); await warte(pause * n); }
  }
  const f = new Error(`${titel} liess sich nicht laden (${versuche} Versuche, wohl ein kurzer Ausfall des Netzes). Bitte das Projekt speichern, die Seite neu laden und es noch einmal versuchen. (${fehler?.message ?? fehler})`);
  f.name = "Modulfehler"; f.cause = fehler;
  throw f;
}
