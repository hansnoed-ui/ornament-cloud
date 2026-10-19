// PHORMA II – Web Worker: rechnet die Bahn des Wachstums (wachstumsim.js), ohne die Seite aufzuhalten. Die Bilder gehen gleich nach dem Rechnen in
// Päckchen an die Seite (Rückmeldung vom 19. Oktober 2026 vom Telefon: «der Keim bleibt stehen» – die Vorschau wartete auf die ganze Bahn).
import { wachstumBahn } from "./wachstumsim.js?v=29";

self.onmessage = (e) => {
  const { nr, ...auftrag } = e.data;
  try {
    let paeckchen = [], ab = 0;
    const senden = (bilder) => { if (!paeckchen.length) return; self.postMessage({ nr, ab, bilder: paeckchen, gesamt: bilder }, paeckchen.map((b) => b.buffer)); ab += paeckchen.length; paeckchen = []; };
    const jeBild = (f, lagen) => { paeckchen.push(lagen); if (paeckchen.length >= 4) senden(jeBild.bilder); };
    const bahn = wachstumBahn({ ...auftrag, jeBild });
    senden(bahn.bilder);
    self.postMessage({ nr, fertig: true, bilder: bahn.bilder });
  } catch (fehler) { self.postMessage({ nr, fehler: fehler?.message ?? String(fehler) }); }
};
