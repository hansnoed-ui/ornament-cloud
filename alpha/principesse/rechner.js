// «Principesse» – das Bild im Hintergrund lesen (Web Worker): Pinselstriche, Glitzer und das scharfe, aufgefrischte Bild, damit die Seite dabei nicht stockt.
import { malen, klarbild } from "./malen.js?v=6";
import { glitzer } from "./glitzer.js?v=6";

self.onmessage = (e) => {
  const { nr, analyse, film, pinsel } = e.data;
  try {
    const gemaelde = malen(analyse.daten, analyse.w, analyse.h, { massstab: film.w / analyse.w, pinsel });
    const funken = film.daten ? glitzer(film.daten, film.w, film.h) : null;
    const klar = klarbild(film.daten, film.w, film.h);
    self.postMessage({ nr, gemaelde, funken, klar }, [klar.buffer]);
  } catch (fehler) {
    self.postMessage({ nr, fehler: String(fehler?.message ?? fehler) });
  }
};
