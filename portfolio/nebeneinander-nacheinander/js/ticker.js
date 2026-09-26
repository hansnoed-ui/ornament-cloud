// Laufband mit allen 40 Namen der beiden Ringe, alphabetisch nach Vornamen.
// Die Namen kommen aus denselben Daten wie das Rad; die Liste wird zweimal
// hintereinander gesetzt, damit die Bewegung ohne Sprung weiterläuft.

import { artists } from "./data/artists.js?v=v4";
import { theorists } from "./data/theorists.js?v=v4";

const SPEED = 55;   // Pixel pro Sekunde

const names = [...artists, ...theorists].map(p => p.name).sort((a, b) => a.localeCompare(b, "de"));
const box = document.querySelector(".rad-ticker");

if (box) {
  const track = box.querySelector(".rad-ticker-track");
  const list = hidden => {
    const ul = document.createElement("ul");
    ul.className = "rad-ticker-list";
    if (hidden) ul.setAttribute("aria-hidden", "true");
    ul.innerHTML = names.map(n => `<li>${n}</li>`).join("");
    return ul;
  };
  track.append(list(false), list(true));
  const tempo = () => box.style.setProperty("--ticker-duration", `${track.firstElementChild.scrollWidth / SPEED}s`);
  tempo();
  addEventListener("resize", tempo);
  document.fonts?.ready.then(tempo);
}
