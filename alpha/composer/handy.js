// Handy-Ansicht (20. November 2026, Christian: «etwas reduzierter, aber perfekt bedienbar»). Bis 820 px Breite sind Erzeugen,
// ornament.lucerne, Messung und Urteil zugeklappt: sichtbar bleiben die Hauptaktionen (Stil, Spuren erzeugen, Track erzeugen),
// alles andere erscheint nach Antippen der Überschrift. Nichts fällt weg; am Computer ist immer alles offen.
const TEILE = ".erzeugen, .lucerne, .messung, .urteile";
const KOPF = ".erzeugen > h2, .lucerne > h2, .messung-kopf > h2, .urteile > h2";

function markieren() {
  document.querySelectorAll(KOPF).forEach((h) => {
    if (h.dataset.klappe) return;
    h.dataset.klappe = "1"; h.tabIndex = 0; h.setAttribute("role", "button");
    const teil = h.closest(TEILE);
    h.setAttribute("aria-expanded", String(teil?.classList.contains("offen") ?? false));
  });
}

export function handyAnsicht() {
  const umschalten = (h) => {
    const teil = h.closest(TEILE); if (!teil) return;
    const offen = teil.classList.toggle("offen");
    h.setAttribute("aria-expanded", String(offen));
  };
  document.addEventListener("click", (e) => { const h = e.target.closest?.(KOPF); if (h) umschalten(h); });
  document.addEventListener("keydown", (e) => {
    if (e.key !== "Enter" && e.key !== " ") return;
    const h = e.target.closest?.(KOPF); if (!h) return;
    e.preventDefault(); e.stopPropagation(); umschalten(h);
  }, true);
  markieren();
  new MutationObserver(markieren).observe(document.body, { childList: true, subtree: true });
}

// Wiedergabe-Leiste: «mehr» zeigt Tempo, erste Eins und Pegelausgleich (nur am Handy sichtbar)
document.getElementById("transportMehr")?.addEventListener("click", (e) => {
  const offen = e.currentTarget.closest(".transport").classList.toggle("offen");
  e.currentTarget.setAttribute("aria-expanded", String(offen));
  e.currentTarget.textContent = offen ? "weniger" : "mehr";
});
