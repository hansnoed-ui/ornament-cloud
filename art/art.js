// «Art» (seit 19. Oktober 2026): drei kleine Hilfen, ohne die alles auch geht.
// 1. Filter auf der Übersicht (Alle, Originale, Editionen, Digital, Gestaltung): zeigt nur die gewählte Art, Serien ohne Treffer verschwinden; die Wahl steht in der Adresse (?f=…).
// 2. Lupe auf der Werkseite: das Bild in 1600 px, erst beim Öffnen geladen; ein Klick wechselt zwischen ganz und nah, Esc schliesst.
// 3. Kaufleiste auf dem Telefon: erscheint unten, sobald Preis und Knopf aus dem Bild gescrollt sind.

const filter = document.querySelector(".art-filter");
if (filter) {
  const knoepfe = [...filter.querySelectorAll("button")];
  const waehlen = (f, merken) => {
    if (!knoepfe.some((k) => k.dataset.f === f)) f = "alle";
    for (const k of knoepfe) k.setAttribute("aria-pressed", String(k.dataset.f === f));
    for (const w of document.querySelectorAll("[data-art]")) w.hidden = f !== "alle" && w.dataset.art !== f;
    for (const s of document.querySelectorAll(".art-serie")) s.hidden = !s.querySelector("[data-art]:not([hidden])");
    if (merken) {
      const u = new URL(location.href);
      if (f === "alle") u.searchParams.delete("f"); else u.searchParams.set("f", f);
      history.replaceState(null, "", u);
    }
  };
  filter.hidden = false;
  for (const k of knoepfe) k.addEventListener("click", () => waehlen(k.dataset.f, true));
  waehlen(new URLSearchParams(location.search).get("f") ?? "alle", false);
}

const haupt = document.querySelector(".galerie-haupt");
const lupe = document.querySelector(".lupe");
if (haupt && lupe?.showModal) {
  const bild = lupe.querySelector("img"), flaeche = lupe.querySelector(".lupe-bild");
  haupt.addEventListener("click", () => {
    if (!bild.src) bild.src = bild.dataset.src;
    lupe.classList.remove("nah");
    lupe.showModal();
  });
  flaeche.addEventListener("click", (e) => {
    const nah = lupe.classList.toggle("nah");
    if (nah) {                                     // die angeklickte Stelle in die Mitte
      const r = bild.getBoundingClientRect();
      requestAnimationFrame(() => {
        flaeche.scrollLeft = (e.clientX - r.left) / r.width * bild.naturalWidth - innerWidth / 2;
        flaeche.scrollTop = (e.clientY - r.top) / r.height * bild.naturalHeight - innerHeight / 2;
      });
    }
  });
  lupe.querySelector(".lupe-zu").addEventListener("click", (e) => { e.stopPropagation(); lupe.close(); });
}

// (nach der Lage beim Blättern, nicht mit IntersectionObserver: der meldet nur Wechsel und verpasst einen Sprung über die Knöpfe hinweg)
const leiste = document.querySelector(".leiste"), handeln = document.querySelector(".angaben .handeln");
if (leiste && handeln) {
  let geplant = false;
  const pruefen = () => { geplant = false; leiste.classList.toggle("zeigen", handeln.getBoundingClientRect().bottom < 0); };
  addEventListener("scroll", () => { if (!geplant) { geplant = true; requestAnimationFrame(pruefen); } }, { passive: true });
  pruefen();
}
