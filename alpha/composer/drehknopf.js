// Drehknöpfe (Nachtpult, 20. November 2026): ausgewählte Schieberegler werden als Drehknopf gezeigt, wie an einem Gerät.
// Der Schieberegler bleibt unsichtbar im Seitenbaum und trägt weiter den Wert: app.js hört wie bisher auf
// input, change und dblclick und setzen inp.value; der Knopf zeichnet sich bei jedem Setzen neu. Ziehen nach oben oder rechts
// dreht auf, nach unten oder links zu; Umschalt dreht fein. Doppelklick oder doppeltes Antippen setzt zurück wie bisher.

const WAHL = ".bpm-knopf input[type=range], .param input[type=range], .regler-klein input[type=range], .regler.pan input[type=range]";
const BOGEN = 270, START = -135;   // Grad: von unten links (−135°) bis unten rechts (+135°)
const WEG = 180;                    // Pixel Ziehweg für den ganzen Bereich
const NS = "http://www.w3.org/2000/svg";

function punkt(r, grad) { const w = ((grad - 90) * Math.PI) / 180; return [20 + r * Math.cos(w), 20 + r * Math.sin(w)]; }
function bogen(r, von, bis) {
  if (bis - von < 0.5) return "";
  const [x1, y1] = punkt(r, von), [x2, y2] = punkt(r, bis);
  return `M${x1.toFixed(2)} ${y1.toFixed(2)}A${r} ${r} 0 ${bis - von > 180 ? 1 : 0} 1 ${x2.toFixed(2)} ${y2.toFixed(2)}`;
}

function anteil(inp) {
  const min = Number(inp.min || 0), max = Number(inp.max || 100), v = Number(inp.value);
  return max > min ? Math.min(1, Math.max(0, (v - min) / (max - min))) : 0;
}

function ausbauen(inp) {
  if (inp.dataset.drehknopf) return;
  inp.dataset.drehknopf = "1";
  const svg = document.createElementNS(NS, "svg");
  svg.setAttribute("viewBox", "0 0 40 40"); svg.setAttribute("aria-hidden", "true");
  const rille = document.createElementNS(NS, "path"), wert = document.createElementNS(NS, "path"), kappe = document.createElementNS(NS, "circle"), zeiger = document.createElementNS(NS, "line");
  rille.setAttribute("class", "dk-rille"); rille.setAttribute("d", bogen(17, START, START + BOGEN));
  wert.setAttribute("class", "dk-wert");
  kappe.setAttribute("class", "dk-kappe"); kappe.setAttribute("cx", "20"); kappe.setAttribute("cy", "20"); kappe.setAttribute("r", "12.5");
  zeiger.setAttribute("class", "dk-zeiger"); zeiger.setAttribute("x1", "20"); zeiger.setAttribute("y1", "9.5"); zeiger.setAttribute("x2", "20"); zeiger.setAttribute("y2", "15");
  svg.append(rille, wert, kappe, zeiger);
  const knopf = document.createElement("span");
  knopf.className = "drehknopf"; knopf.append(svg);
  // Mittelstellung (z. B. Panorama, Pegel um 0): der Wertbogen wächst von der Mitte aus
  const min = Number(inp.min || 0), max = Number(inp.max || 100);
  const mitte = min < 0 && max > 0 ? (0 - min) / (max - min) : null;

  const zeichnen = () => {
    const a = anteil(inp), grad = START + a * BOGEN;
    const ab = mitte === null ? START : START + mitte * BOGEN;
    wert.setAttribute("d", bogen(17, Math.min(ab, grad), Math.max(ab, grad)));
    zeiger.setAttribute("transform", `rotate(${grad.toFixed(1)} 20 20)`);
  };
  const desc = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value");
  Object.defineProperty(inp, "value", { configurable: true, get() { return desc.get.call(this); }, set(v) { desc.set.call(this, v); zeichnen(); } });
  inp.addEventListener("input", zeichnen);

  let start = null, letzterTipp = 0, bewegt = false;
  knopf.addEventListener("pointerdown", (e) => {
    if (e.button !== 0) return;
    e.preventDefault(); knopf.setPointerCapture(e.pointerId); inp.focus({ preventScroll: true });
    start = { x: e.clientX, y: e.clientY, a: anteil(inp), v: inp.value }; bewegt = false; knopf.classList.add("dreht");
  });
  knopf.addEventListener("pointermove", (e) => {
    if (!start) return;
    const d = (start.y - e.clientY) + (e.clientX - start.x);
    if (Math.abs(d) > 2) bewegt = true;
    if (!bewegt) return;
    const a = Math.min(1, Math.max(0, start.a + (d / (Number(inp.dataset.weg) || WEG)) * (e.shiftKey ? 0.15 : 1)));
    const schritt = Number(inp.step) || 1;
    let v = min + a * (max - min); v = Math.round((v - min) / schritt) * schritt + min;
    v = Math.min(max, Math.max(min, Number(v.toFixed(6))));
    if (String(v) !== inp.value) { inp.value = v; inp.dispatchEvent(new Event("input", { bubbles: true })); }
  });
  const loslassen = () => {
    if (!start) return;
    knopf.classList.remove("dreht");
    if (inp.value !== start.v) inp.dispatchEvent(new Event("change", { bubbles: true }));
    if (!bewegt) {   // Doppelklick oder doppeltes Antippen: zurück wie beim Schieberegler
      const jetzt = performance.now();
      if (jetzt - letzterTipp < 350) { inp.dispatchEvent(new MouseEvent("dblclick", { bubbles: true })); inp.dispatchEvent(new Event("change", { bubbles: true })); zeichnen(); letzterTipp = 0; }
      else letzterTipp = jetzt;
    }
    start = null;
  };
  knopf.addEventListener("pointerup", loslassen);
  knopf.addEventListener("pointercancel", loslassen);

  inp.classList.add("dk-regler");
  inp.after(knopf);
  inp.closest("label")?.classList.add("mit-drehknopf");
  zeichnen();
}

function durchsuchen(wurzel) {
  if (!(wurzel instanceof Element)) return;
  if (wurzel.matches?.(WAHL)) ausbauen(wurzel);
  wurzel.querySelectorAll?.(WAHL).forEach(ausbauen);
}

export function drehknoepfe() {
  durchsuchen(document.body);
  new MutationObserver((liste) => { for (const m of liste) for (const n of m.addedNodes) durchsuchen(n); })
    .observe(document.body, { childList: true, subtree: true });
}
