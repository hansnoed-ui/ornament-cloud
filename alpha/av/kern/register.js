// ORNAMENT AV STUDIO – Effektregister: die 23 Effekte von /animations (animations/effekte.js) über einen Adapter. Die Effekte dort sind
// nicht versioniert (sie werden auf der Seite /animations weiterentwickelt). Damit alte Filme gleich aussehen, hält jedes AV-Projekt den
// Fingerabdruck jedes benutzten Effekts fest (FNV-1a über GLSL, Regler und Punkte-Art). Weicht er beim Öffnen ab, meldet das Studio,
// dass sich der Effekt seither verändert hat. Echte Versionen (eingefrorene Kopien) folgen, sobald ein Werk das braucht.

import { EFFEKTE, EFFEKT_IDS } from "../../../animations/effekte.js?v=34";

export function fingerabdruck(id) {
  const e = EFFEKTE[id]; if (!e) return null;
  const text = `${e.glsl}|${e.regler.map((r) => `${r.name}:${r.wert}`).join(",")}|${e.punkte ? "p" : ""}${e.schwerkraft ? "s" : ""}`;
  let h = 2166136261; for (let i = 0; i < text.length; i++) { h ^= text.charCodeAt(i); h = Math.imul(h, 16777619); }
  return (h >>> 0).toString(16).padStart(8, "0");
}

/** das Register: id, Name, Herkunft, Regler, Art (Fläche, Punkte, Schwerkraft), Fingerabdruck */
export const REGISTER = Object.freeze(EFFEKT_IDS.map((id) => {
  const e = EFFEKTE[id];
  return { id, name: e.name, herkunft: e.herkunft ?? "", regler: e.regler.map((r) => r.name), art: e.punkte ? "punkte" : e.schwerkraft ? "schwerkraft" : "flaeche", fingerabdruck: fingerabdruck(id) };
}));

/** Abweichungen der in einem Projekt festgehaltenen Fingerabdrücke: [{ id, war, ist }] */
export function abweichungen(festgehalten = {}) {
  return Object.entries(festgehalten).filter(([id, f]) => fingerabdruck(id) !== f).map(([id, war]) => ({ id, war, ist: fingerabdruck(id) }));
}
