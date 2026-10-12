// «Principesse» – das Bild im Hintergrund lesen (Web Worker): Pinselstriche, Glitzer und das scharfe, aufgefrischte Bild, damit die Seite dabei nicht stockt.
// Zuerst Striche und Glitzer (damit kann die Vorschau schon beginnen), danach das scharfe Bild, das erst am Ende des Malens gebraucht wird.
import { malen, klarbild } from "./malen.js?v=11";
import { glitzer } from "./glitzer.js?v=11";

self.onmessage = (e) => {
  const { nr, analyse, film, pinsel } = e.data;
  try {
    const gemaelde = malen(analyse.daten, analyse.w, analyse.h, { massstab: film.w / analyse.w, pinsel });
    const funken = film.daten ? glitzer(film.daten, film.w, film.h) : null;
    self.postMessage({ nr, art: "gemaelde", gemaelde, funken });
  } catch (fehler) {
    self.postMessage({ nr, art: "gemaelde", fehler: String(fehler?.message ?? fehler) });
    return;
  }
  try {
    const klar = klarbild(film.daten, film.w, film.h);
    self.postMessage({ nr, art: "klar", klar }, [klar.buffer]);
  } catch (fehler) {
    self.postMessage({ nr, art: "klar", fehler: String(fehler?.message ?? fehler) });
  }
};
