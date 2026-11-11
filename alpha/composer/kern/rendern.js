// Offline rechnen: derselbe Motor wie in der Vorschau, vom Anfang bis zum Ende (oder über einen Abschnitt), ohne Schleife und Referenz.
// Die Latenz der Summenkette (Vorlauf des Limiters) wird ausgeglichen: es wird um sie länger gerechnet und vorne abgeschnitten.

import { Motor, BLOCK } from "./motor.js";

/**
 * projektZustand: wie Motor.setze; spuren: [{ id, kanaele }]. Gibt { summe: [L, R], stems: Map id → [L, R], rate, latenz } zurück.
 * melden(anteil 0–1) wird zwischendurch gerufen und darf ein Promise sein (dann wird darauf gewartet, damit die Seite bedienbar bleibt).
 */
export async function rendern({ rate, plugins, spuren, zustand, von = 0, bis = null, stems = true, melden = null }) {
  const m = new Motor(rate, plugins);
  for (const s of spuren) m.spurLaden(s.id, s.kanaele);
  m.setze({ ...zustand, allesVorher: false, referenzAn: false });
  for (const s of zustand.spuren ?? []) { const sp = m.spuren.get(s.id); if (sp) sp.gAus = sp.zustand.stumm ? 0 : 10 ** ((s.pegel ?? 0) / 20); }
  if (zustand.master) m.master.pegel = 10 ** ((zustand.master.pegel ?? 0) / 20);
  const ende = bis ?? m.laenge, n = Math.max(0, ende - von), latenz = m.master.kette.latenz(), gesamt = n + latenz;
  const summe = [new Float32Array(gesamt), new Float32Array(gesamt)];
  const einzeln = stems ? new Map([...m.spuren.keys()].map((id) => [id, [new Float32Array(n), new Float32Array(n)]])) : null;
  const aus = [new Float32Array(BLOCK), new Float32Array(BLOCK)], blockEinzeln = stems ? new Map([...m.spuren.keys()].map((id) => [id, [new Float32Array(BLOCK), new Float32Array(BLOCK)]])) : null;
  m.pos = von;
  let letzteMeldung = 0;
  for (let o = 0; o < gesamt; o += BLOCK) {
    const b = Math.min(BLOCK, gesamt - o);
    m.block(aus, b, blockEinzeln);
    summe[0].set(aus[0].subarray(0, b), o); summe[1].set(aus[1].subarray(0, b), o);
    if (einzeln) for (const [id, e] of blockEinzeln) { const z = einzeln.get(id), k = Math.min(b, n - o); if (k > 0) { z[0].set(e[0].subarray(0, k), o); z[1].set(e[1].subarray(0, k), o); } }
    if (melden && o - letzteMeldung > rate * 2) { letzteMeldung = o; await melden(o / gesamt); }
  }
  return { summe: summe.map((s) => s.subarray(latenz)), stems: einzeln, rate, latenz };
}
