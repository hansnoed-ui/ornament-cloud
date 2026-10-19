// PHORMA II – Web Worker: rechnet die ganze Bahn des Tuchs (tuchsim.js), ohne die Seite aufzuhalten, und meldet den Fortschritt.
import { tuchBahn } from "./tuchsim.js?v=26";

self.onmessage = (e) => {
  const { nr, ...auftrag } = e.data;
  try {
    const bahn = tuchBahn({ ...auftrag, fortschritt: (anteil) => self.postMessage({ nr, fortschritt: anteil }) });
    self.postMessage({ nr, bahn }, [bahn.lagen.buffer, bahn.heim.buffer]);
  } catch (fehler) { self.postMessage({ nr, fehler: fehler?.message ?? String(fehler) }); }
};
