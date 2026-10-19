// Social Media – Seite eines Zettels (seit 19. Oktober 2026): Zitiervorschlag kopieren, Karussell.
import { karusselle } from "./karussell.js";

karusselle();
for (const knopf of document.querySelectorAll("[data-kopieren]")) {
  const quelle = document.querySelector(knopf.dataset.kopieren);
  if (!quelle || !navigator.clipboard) continue;
  knopf.hidden = false;
  knopf.addEventListener("click", async () => {
    try { await navigator.clipboard.writeText(quelle.textContent.trim()); knopf.textContent = "Kopiert"; }
    catch { knopf.textContent = "Kopieren ging nicht – bitte markieren"; }
    setTimeout(() => { knopf.textContent = "Kopieren"; }, 2400);
  });
}
