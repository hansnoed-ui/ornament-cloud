// «Das Dritte Rad»: die Auswahl am unteren Rand der Originalseiten (Strophe, ORNA, OMNA COLOR), wenn man aus dem Spiel hierher kommt.
// Wird von den Seiten nur geladen, wenn die Adresse ?rad= trägt (dynamischer Import); sonst bleibt alles, wie es ist.
// Vier Wege in jedem Schritt: zurück ins Rad, Zettelkasten, ORNA, OMNA COLOR. Sie führen ins Rad zurück, wo das Spiel im Design des Rads weitergeht.
// Importe mit ?v=<Marke>: setzt tools/build-drittes-rad.ts (gegen alte Module im Zwischenspeicher des Browsers, siehe dort).
import { wege, WURZEL } from "./engine.js?v=ce8c1ac1";
import { kachelnBauen, KACHELN_CSS } from "./kacheln.js?v=ce8c1ac1";

const W = new URL(WURZEL).pathname;
const IN = { zeit: W + "zu-seiner-zeit/", form: W + "portfolio/nebeneinander-nacheinander/", farbe: W + "alpha/omna-color/" };

/** Was zeigt diese Seite gerade? {art, slug|id} oder nur der Bereich */
function aktuell() {
  const p = location.pathname, q = new URLSearchParams(location.search);
  if (p.startsWith(IN.zeit)) {
    const s = p.match(/strophe\/([^/]+)\//), v = p.match(/verweis\/([^/]+)\//);
    return s ? { art: "strophe", slug: s[1], bereich: "zeit" } : v ? { art: "person", slug: v[1], bereich: "zeit" } : { bereich: "zeit" };
  }
  if (p.startsWith(IN.form)) {
    const id = document.querySelector(".rad-result")?.dataset.pair || q.get("pair");
    return id ? { art: "paar", id, bereich: "form" } : { bereich: "form" };
  }
  if (p.startsWith(IN.farbe)) {
    const m = /Übung (\d+)/.exec(document.querySelector("#card .idline")?.textContent || "");
    const id = m ? m[1] : q.get("u");
    return id ? { art: "uebung", id, bereich: "farbe" } : { bereich: "farbe" };
  }
  return null;
}

const css = document.createElement("style");
css.textContent = KACHELN_CSS + `
.drad{position:fixed;left:0;right:0;bottom:0;z-index:50;display:grid;gap:8px;padding:10px 14px calc(10px + env(safe-area-inset-bottom));
  background:linear-gradient(180deg,#17132b,#0d0b1a);color:#ece3c8;border-top:1px solid #c9a45c;box-shadow:0 -8px 30px #0008;font:400 .85rem/1.35 "Instrument Sans","Segoe UI",system-ui,sans-serif}
.drad *{box-sizing:border-box}
.drad-kopf{display:flex;justify-content:space-between;align-items:center;gap:12px}
.drad-kopf b{font-weight:500;letter-spacing:.16em;text-transform:uppercase;font-size:.68rem;color:#c9a45c}
`;

const nav = document.createElement("nav");
nav.className = "drad";
nav.setAttribute("aria-label", "Das Dritte Rad");
let letzte = "";

function zeichne() {
  const a = aktuell();
  if (!a) return;
  const schluessel = JSON.stringify(a);
  if (schluessel === letzte) return;
  letzte = schluessel;
  const kopf = document.createElement("div"); kopf.className = "drad-kopf";
  const b = document.createElement("b"); b.textContent = "Das Dritte Rad · weiter";
  kopf.append(b);
  nav.replaceChildren(kopf, kachelnBauen(wege(a), { kompakt: true, breit: true }));
}

document.head.append(css);
document.body.append(nav);
zeichne();
// Der Seite unten Platz lassen, solange die Leiste steht (Größe ändert sich mit der Breite)
const platz = () => { document.body.style.paddingBottom = nav.offsetHeight + 16 + "px"; };
platz();
if (typeof ResizeObserver !== "undefined") new ResizeObserver(platz).observe(nav);

// Die Seiten bleiben im Spiel: Links in die drei Bereiche tragen ?rad=1 weiter
document.addEventListener("click", (e) => {
  const l = e.target.closest && e.target.closest("a[href]");
  if (!l || l.target === "_blank" || l.hasAttribute("download")) return;
  const u = new URL(l.href, location.href);
  if (u.origin !== location.origin || u.searchParams.has("rad") || !Object.values(IN).some((p) => u.pathname.startsWith(p))) return;
  u.searchParams.set("rad", "1");
  l.href = u.href;
});

// ORNA und OMNA zeigen nach einer Drehung ein anderes Stück: die Vorschläge folgen
let t = 0;
const neu = () => { clearTimeout(t); t = setTimeout(zeichne, 250); };
const ornaErgebnis = document.querySelector(".rad-result");
if (ornaErgebnis) new MutationObserver(neu).observe(ornaErgebnis, { attributes: true, attributeFilter: ["data-pair"] });
const omnaKarte = document.querySelector("#card");
if (omnaKarte) new MutationObserver(neu).observe(omnaKarte, { childList: true, subtree: true });
