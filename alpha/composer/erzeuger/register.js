// Alle Klangerzeuger mit allen Versionen. Eine erzeugte Spur nennt «drums@0.1.0» und bekommt genau diese Version.
import drums010 from "./drums-0.1.0.js";
import perkussion010 from "./perkussion-0.1.0.js";
import bass010 from "./bass-0.1.0.js";
import natur010 from "./natur-0.1.0.js";
import natur020 from "./natur-0.2.0.js";
import natur030 from "./natur-0.3.0.js";
import synth010 from "./synth-0.1.0.js";
import synth020 from "./synth-0.2.0.js";
import perkussion020 from "./perkussion-0.2.0.js";
import gitarre010 from "./gitarre-0.1.0.js";
import bass020 from "./bass-0.2.0.js";
import drums020 from "./drums-0.2.0.js";

export const ERZEUGER = Object.freeze(Object.fromEntries([drums010, perkussion010, perkussion020, bass010, natur010, natur020, natur030, synth010, synth020, gitarre010, bass020, drums020].map((e) => [`${e.id}@${e.version}`, e])));

/** die Stimme einer erzeugten Spur: «drums@0.1.0», «kick» → Stimme */
export function stimmeVon(erzeuger, stimme) {
  const e = ERZEUGER[erzeuger];
  if (!e) throw new Error(`Klangerzeuger ${erzeuger} fehlt in dieser Version des Composers`);
  const s = e.stimmen[stimme];
  if (!s) throw new Error(`${erzeuger} hat keine Stimme «${stimme}»`);
  return s;
}
