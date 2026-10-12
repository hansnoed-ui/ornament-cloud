// «Principesse» – das Bild im Hintergrund lesen (Web Worker): Pinselstriche und Glitzer, damit die Seite dabei nicht stockt.
import { malen } from "./malen.js?v=3";
import { glitzer } from "./glitzer.js?v=3";

self.onmessage = (e) => {
  const { nr, analyse, film, pinsel } = e.data;
  try {
    const gemaelde = malen(analyse.daten, analyse.w, analyse.h, { massstab: film.w / analyse.w, pinsel });
    const funken = film.daten ? glitzer(film.daten, film.w, film.h) : null;
    self.postMessage({ nr, gemaelde, funken });
  } catch (fehler) {
    self.postMessage({ nr, fehler: String(fehler?.message ?? fehler) });
  }
};
