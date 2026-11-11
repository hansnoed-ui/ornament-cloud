// Das Feld auf Englisch (20. Oktober 2026): steht die App englisch (sprache.js), tragen die Fragen in der Liste und die Titel der Matrix
// die Übersetzung aus js/data/constellations.en.js; auf Deutsch den Text der Seite. Die Namen bleiben, die Adressen auch.
import { constellationsEn } from "../js/data/constellations.en.js?v=1";

const deutsch = new Map();   // Element → deutscher Text, beim ersten Wechsel gemerkt
const id = (a) => new URL(a.getAttribute("href"), location.href).searchParams.get("pair");

function anwenden() {
  const en = window.sprache?.en();
  for (const a of document.querySelectorAll(".feld-liste a[href*='pair=']")) {
    const frage = a.querySelector(".feld-frage"); if (!frage) continue;
    if (!deutsch.has(frage)) deutsch.set(frage, frage.textContent);
    const u = constellationsEn[id(a)];
    frage.textContent = en && u ? u.question : deutsch.get(frage);
  }
  for (const a of document.querySelectorAll(".feld-matrix a[title]")) {
    if (!deutsch.has(a)) deutsch.set(a, a.getAttribute("title"));
    const u = constellationsEn[id(a)];
    a.setAttribute("title", en && u ? u.question : deutsch.get(a));
  }
  for (const p of document.querySelectorAll(".feld-frei[data-namen]")) p.textContent = window.sprache ? window.sprache.t("feldFrei", p.dataset.namen) : p.textContent;
}
document.addEventListener("sprache", anwenden);
if (window.sprache) anwenden();
