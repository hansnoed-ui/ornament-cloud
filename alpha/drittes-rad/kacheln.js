// «Das Dritte Rad»: die vier Wege als Kacheln, gemeinsam für die Radseite (index.html) und die Leiste auf den Originalseiten (weiter.js).
// Reihenfolge fest: Das Dritte Rad, Zettelkasten, ORNA, OMNA COLOR. Die Kachel des Bereichs, in dem man steht, zeigt «hier weiter».
// Importe mit ?v=<Marke>: setzt tools/build-drittes-rad.ts (gegen alte Module im Zwischenspeicher des Browsers, siehe dort).
import { BEREICH } from "./engine.js?v=ce8c1ac1";

export const KACHELN_CSS = `
.drad-kacheln{list-style:none;margin:0;padding:0;display:grid;gap:8px;grid-template-columns:repeat(2,minmax(0,1fr))}
.drad-kachel{display:grid;align-content:start;gap:1px;height:100%;box-sizing:border-box;border:1px solid #5b4d2e;border-radius:10px;padding:9px 12px;background:#ffffff08;color:#ece3c8;text-decoration:none;font:400 .85rem/1.35 "Instrument Sans","Segoe UI",system-ui,sans-serif}
.drad-kachel small{color:#c9a45c;font-size:.66rem;letter-spacing:.14em;text-transform:uppercase}
.drad-kachel b{font-weight:500;font-size:.95rem;overflow-wrap:anywhere}
.drad-kachel em{font-style:normal;color:#a89f86;font-size:.76rem}
.drad-kachel.rad{border-color:#c9a45c;background:#c9a45c14}
.drad-kachel.hier small::after{content:" · hier weiter"}
.drad-kachel:hover,.drad-kachel:focus-visible{border-color:#f0d78f;outline:none}
@media (min-width:760px){.drad-kacheln.breit{grid-template-columns:repeat(4,minmax(0,1fr))}}
@media (max-width:560px){.drad-kacheln.kompakt em{display:none}.drad-kacheln.kompakt .drad-kachel{padding:6px 10px}.drad-kacheln.kompakt b{font-size:.88rem;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}}
`;

/** items: die Wege aus wege() oder wegeImSpiel(); kompakt: für die schmale Leiste am Bildrand; breit: auf breiten Schirmen alle vier nebeneinander */
export function kachelnBauen(items, { kompakt = false, breit = false } = {}) {
  const ul = document.createElement("ul");
  ul.className = "drad-kacheln" + (kompakt ? " kompakt" : "") + (breit ? " breit" : "");
  for (const w of items) {
    const li = document.createElement("li"), a = document.createElement("a");
    a.className = "drad-kachel " + w.bereich + (w.hier ? " hier" : "");
    a.href = w.url;
    a.dataset.bereich = w.bereich;
    a.dataset.anim = w.bereich === "rad" ? "voll" : "schnell";
    const k = document.createElement("small"); k.textContent = BEREICH[w.bereich];
    const t = document.createElement("b"); t.textContent = w.titel;
    const g = document.createElement("em"); g.textContent = w.grund;
    a.append(k, t, g); li.append(a); ul.append(li);
  }
  return ul;
}
