// «Das Dritte Rad»: die Auswahl am unteren Rand der Zielseiten (Strophe, ORNA, OMNA COLOR).
// Wird von den Seiten nur geladen, wenn die Adresse ?rad= trägt (dynamischer Import); sonst bleibt alles, wie es ist.
// Pro Schritt höchstens zwei Wege (je ein Vorschlag in den beiden anderen Bereichen) und immer «Zurück zum Start».
import { wege, adresse, BEREICH, WURZEL } from "./engine.js";

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
css.textContent = `
.drad{position:fixed;left:0;right:0;bottom:0;z-index:50;display:grid;gap:8px 12px;padding:10px 14px calc(10px + env(safe-area-inset-bottom));
  background:linear-gradient(180deg,#17132b,#0d0b1a);color:#ece3c8;border-top:1px solid #c9a45c;box-shadow:0 -8px 30px #0008;font:500 .85rem/1.35 system-ui,sans-serif}
.drad *{box-sizing:border-box}
.drad-kopf{display:flex;justify-content:space-between;align-items:center;gap:12px}
.drad-kopf b{font-weight:500;letter-spacing:.16em;text-transform:uppercase;font-size:.68rem;color:#c9a45c}
.drad a{color:inherit;text-decoration:none}
.drad-start{border:1px solid #5b4d2e;border-radius:999px;padding:3px 12px;font-size:.8rem}
.drad ul{list-style:none;margin:0;padding:0;display:grid;gap:8px;grid-template-columns:1fr 1fr}
.drad li a{display:grid;gap:1px;height:100%;border:1px solid #5b4d2e;border-radius:10px;padding:8px 12px;background:#ffffff08}
.drad li small{color:#c9a45c;font-size:.66rem;letter-spacing:.14em;text-transform:uppercase}
.drad li b{font-weight:500;font-size:.95rem}
.drad li em{font-style:normal;color:#a89f86;font-size:.76rem}
.drad a:hover,.drad a:focus-visible{border-color:#f0d78f;outline:none}
@media (max-width:560px){.drad ul{grid-template-columns:1fr}.drad li em{display:none}}
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
  const items = wege(a);
  nav.replaceChildren();
  const kopf = document.createElement("div"); kopf.className = "drad-kopf";
  const b = document.createElement("b"); b.textContent = "Das Dritte Rad · weiter";
  const start = document.createElement("a"); start.className = "drad-start"; start.href = adresse.start; start.textContent = "↺ Zurück zum Start";
  kopf.append(b, start);
  const ul = document.createElement("ul");
  for (const w of items) {
    const li = document.createElement("li"), l = document.createElement("a");
    l.href = w.url;
    const k = document.createElement("small"); k.textContent = BEREICH[w.bereich];
    const t = document.createElement("b"); t.textContent = w.titel;
    const g = document.createElement("em"); g.textContent = w.grund;
    l.append(k, t, g); li.append(l); ul.append(li);
  }
  nav.append(kopf, ul);
  document.body.style.paddingBottom = nav.offsetHeight + 16 + "px";
}

document.head.append(css);
document.body.append(nav);
zeichne();
document.body.style.paddingBottom = nav.offsetHeight + 16 + "px";

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
