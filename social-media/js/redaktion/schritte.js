// Redaktion – geführte Schritte (20. Oktober 2026, Wunsch: «das könnte man auch noch sauberer bauen»; Entscheid: Gestaltung des Neubaus und ein Bildschirm je Schritt).
// Das Formular bleibt, wie app.js es kennt (alle Kennungen, Klassen und Ereignisse); dieses Modul legt nur die Führung darüber:
// eine Leiste mit den Schritten (Material, Bereiche, Beitrag, Zeit, Zettel, Veröffentlichen), ein Schritt zur Zeit, «Zurück» und «Weiter»,
// Schritte mit hidden (die Bereiche vor dem Bildschirmfoto) werden übersprungen. Für Tests: window.rdSchritte.zeige(element) holt den Schritt
// des Elements nach vorn. Ohne dieses Modul stünden alle Schritte untereinander – nichts hängt davon ab.

const formular = document.getElementById("formular");
const schritte = [...formular.querySelectorAll(".rd-schritt")];
const leiste = document.getElementById("schritte");
let aktiv = 0;

const name = (s) => s.querySelector("legend .rd-name, legend")?.textContent.replace(/^\s*\d+\s*/, "").trim() || `Schritt ${schritte.indexOf(s) + 1}`;
const offen = (s) => !s.hidden;

function zeichneLeiste() {
  leiste.replaceChildren(...schritte.map((s, i) => {
    const li = document.createElement("li");
    const b = document.createElement("button");
    b.type = "button"; b.className = "rd-schritt-knopf"; b.textContent = name(s);
    b.disabled = !offen(s);
    b.setAttribute("aria-current", i === aktiv ? "step" : "false");
    if (i < aktiv && offen(s)) li.classList.add("ist-vorbei");
    if (!offen(s)) li.classList.add("ist-zu");
    b.addEventListener("click", () => gehe(i));
    li.append(b);
    return li;
  }));
}

function gehe(i, { ruhig = false } = {}) {
  if (i < 0 || i >= schritte.length || !offen(schritte[i])) return;
  aktiv = i;
  formular.dataset.schritt = String(i);
  schritte.forEach((s, k) => s.classList.toggle("ist-aktiv", k === i));
  zeichneLeiste();
  if (!ruhig) { schritte[i].scrollIntoView({ block: "start", behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" }); schritte[i].querySelector("legend")?.focus?.(); }
}
const naechster = (von, richtung) => { let i = von + richtung; while (i >= 0 && i < schritte.length && !offen(schritte[i])) i += richtung; return i; };

// Zurück und Weiter unter jedem Schritt (der letzte hat «Veröffentlichen» schon)
schritte.forEach((s, i) => {
  s.dataset.nr = String(i + 1);
  s.querySelector("legend")?.setAttribute("tabindex", "-1");
  const nav = document.createElement("p"); nav.className = "rd-nav";
  if (i > 0) { const z = document.createElement("button"); z.type = "button"; z.className = "rd-knopf rd-knopf--leise rd-zurueck"; z.textContent = "Zurück"; z.addEventListener("click", () => gehe(naechster(aktiv, -1))); nav.append(z); }
  if (i < schritte.length - 1) { const w = document.createElement("button"); w.type = "button"; w.className = "rd-knopf rd-weiter"; w.textContent = "Weiter"; w.addEventListener("click", () => gehe(naechster(aktiv, 1))); nav.append(w); }
  s.append(nav);
});

// Schritte, die auf- oder zugehen (die Bereiche nach dem Bildschirmfoto), halten die Leiste aktuell; wird der aktive Schritt geschlossen, geht es zum nächsten offenen
new MutationObserver(() => { if (!offen(schritte[aktiv])) gehe(naechster(aktiv, 1) < schritte.length ? naechster(aktiv, 1) : naechster(aktiv, -1), { ruhig: true }); else zeichneLeiste(); })
  .observe(formular, { attributes: true, attributeFilter: ["hidden"], subtree: true });

// Ein Fehler beim Veröffentlichen nennt Felder; die Meldung steht im letzten Schritt – der bleibt vorn
window.rdSchritte = {
  zeige(el) { const s = el?.closest?.(".rd-schritt"); const i = schritte.indexOf(s); if (i >= 0) gehe(i, { ruhig: true }); return i; },
  gehe,
  get aktiv() { return aktiv; },
};
gehe(0, { ruhig: true });
