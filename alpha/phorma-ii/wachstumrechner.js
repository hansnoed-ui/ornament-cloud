// PHORMA II – Web Worker: rechnet die ganze Bahn des Wachstums (wachstumsim.js), ohne die Seite aufzuhalten, und meldet den Fortschritt.
import { wachstumBahn } from "./wachstumsim.js?v=21";

self.onmessage = (e) => {
  const { nr, ...auftrag } = e.data;
  try {
    const bahn = wachstumBahn({ ...auftrag, fortschritt: (anteil) => self.postMessage({ nr, fortschritt: anteil }) });
    self.postMessage({ nr, bahn }, [bahn.lagen.buffer, bahn.anzahl.buffer, bahn.ab.buffer]);
  } catch (fehler) { self.postMessage({ nr, fehler: fehler?.message ?? String(fehler) }); }
};
