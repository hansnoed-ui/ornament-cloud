// Social Media – die Zeitleiste filtern und ordnen (seit 19. Oktober 2026). Ohne Skript zeigt die Seite alle Zettel und die Register;
// mit Skript: Suche, Plattform, Schlagworte (alle gewählten müssen zutreffen), Autor:innen (eine der gewählten), eine Woche aus dem Zeitband,
// Ordnung nach Sicherung oder Veröffentlichung. Der Stand steht in der Adresse (?q=…&plattform=…&schlagwort=a,b&autor=…&woche=…&ordnung=…),
// gesetzt mit history.replaceState, damit man eine gefilterte Ansicht teilen kann.
import { zuerichVersatz, monatsname, falten } from "./darstellung.js";
import { karusselle } from "./karussell.js";

const liste = document.querySelector(".zeitleiste");
const filter = document.querySelector(".filter");
if (liste && filter) start();

function start() {
  karusselle();
  filter.hidden = false;
  const zettel = [...liste.querySelectorAll(".zettel")].map((li) => ({
    li,
    plattform: li.dataset.plattform,
    autor: li.dataset.autor,
    schlagworte: li.dataset.schlagworte.split("|").filter(Boolean),
    erfasst: +li.dataset.erfasst,
    veroeffentlicht: li.dataset.veroeffentlicht ? +li.dataset.veroeffentlicht : null,
    text: falten(li.querySelector(".zettel-karte").textContent.replace(/\s+/g, " ")),
  }));
  const suche = filter.querySelector('input[type="search"]');
  const stand = filter.querySelector(".filter-stand");
  const zurueck = [...document.querySelectorAll(".filter-zurueck")];
  const leer = document.querySelector(".sm-leer-gefiltert");
  const wochen = [...document.querySelectorAll(".zeitband .woche")];

  // Zustand aus der Adresse
  const p = new URLSearchParams(location.search);
  const z = {
    q: p.get("q") ?? "",
    plattform: p.get("plattform") ?? "",
    schlagworte: new Set((p.get("schlagwort") ?? "").split(",").filter(Boolean)),
    autoren: new Set((p.get("autor") ?? "").split(",").filter(Boolean)),
    woche: p.get("woche") ? +p.get("woche") : null,
    ordnung: p.get("ordnung") === "veroeffentlicht" ? "veroeffentlicht" : "erfasst",
  };
  suche.value = z.q;
  if (innerWidth < 1000 && !z.schlagworte.size) filter.querySelector(".filter-block")?.removeAttribute("open");
  if (z.autoren.size) filter.querySelectorAll(".filter-block")[1]?.setAttribute("open", "");

  const passt = (x, ohne = null) => {
    if (ohne !== "plattform" && z.plattform && x.plattform !== z.plattform) return false;
    if (ohne !== "schlagwort") for (const s of z.schlagworte) if (!x.schlagworte.includes(s)) return false;
    if (ohne !== "autor" && z.autoren.size && !z.autoren.has(x.autor)) return false;
    if (z.woche !== null && !(x.erfasst >= z.woche && x.erfasst < z.woche + 7 * 864e5)) return false;
    const woerter = falten(z.q).split(/\s+/).filter(Boolean);
    return woerter.every((w) => x.text.includes(w));
  };

  function adresse() {
    const q = new URLSearchParams();
    if (z.q) q.set("q", z.q);
    if (z.plattform) q.set("plattform", z.plattform);
    if (z.schlagworte.size) q.set("schlagwort", [...z.schlagworte].join(","));
    if (z.autoren.size) q.set("autor", [...z.autoren].join(","));
    if (z.woche !== null) q.set("woche", String(z.woche));
    if (z.ordnung !== "erfasst") q.set("ordnung", z.ordnung);
    const s = q.toString();
    history.replaceState(null, "", s ? `?${s}` : location.pathname);
  }

  /** Monat in Zürcher Zeit aus Millisekunden */
  const monat = (ms) => { const d = new Date(ms + zuerichVersatz(ms) * 60_000); return [d.getUTCFullYear(), d.getUTCMonth() + 1]; };

  function ordnen() {
    const schluessel = z.ordnung === "erfasst" ? "erfasst" : "veroeffentlicht";
    const sortiert = [...zettel].sort((a, b) => (b[schluessel] ?? -Infinity) - (a[schluessel] ?? -Infinity) || b.erfasst - a.erfasst);
    for (const m of liste.querySelectorAll(".monat")) m.remove();
    let vorher = "";
    for (const x of sortiert) {
      const ms = x[schluessel];
      const k = ms === null ? "ohne" : monat(ms).join("-");
      if (k !== vorher) {
        vorher = k;
        const li = document.createElement("li");
        li.className = "monat";
        li.dataset.monat = k;
        li.innerHTML = `<h2>${ms === null ? "Ohne Datum der Veröffentlichung" : monatsname(...monat(ms))}</h2>`;
        liste.append(li);
      }
      liste.append(x.li);
      x.li.querySelector(".zettel-zeit > time").hidden = z.ordnung !== "erfasst";
      x.li.querySelector(".zettel-zeit-anders").hidden = z.ordnung === "erfasst";
    }
    liste.setAttribute("aria-label", z.ordnung === "erfasst" ? "Zettel, zuletzt gesicherte zuerst" : "Zettel, zuletzt veröffentlichte zuerst");
  }

  function zeigen() {
    let sichtbar = 0;
    for (const x of zettel) { const ja = passt(x); x.li.hidden = !ja; if (ja) sichtbar++; }
    for (const m of liste.querySelectorAll(".monat")) {
      let n = m.nextElementSibling, irgendwer = false;
      while (n && !n.classList.contains("monat")) { if (!n.hidden) irgendwer = true; n = n.nextElementSibling; }
      m.hidden = !irgendwer;
    }
    // Knöpfe: gedrückt, und wie viele Zettel es mit diesem Wert gäbe
    for (const b of filter.querySelectorAll("[data-plattform]")) {
      b.setAttribute("aria-pressed", String(b.dataset.plattform === z.plattform));
      const n = zettel.filter((x) => passt(x, "plattform") && (!b.dataset.plattform || x.plattform === b.dataset.plattform)).length;
      b.querySelector(".anzahl").textContent = n;
      b.disabled = !n && b.dataset.plattform !== z.plattform;
    }
    for (const b of filter.querySelectorAll("button[data-schlagwort]")) {
      const an = z.schlagworte.has(b.dataset.schlagwort);
      b.setAttribute("aria-pressed", String(an));
      const n = zettel.filter((x) => passt(x) && (an || x.schlagworte.includes(b.dataset.schlagwort))).length;
      b.querySelector(".anzahl").textContent = n;
      b.hidden = !n && !an;
    }
    for (const b of filter.querySelectorAll("button[data-autor]")) {
      const an = z.autoren.has(b.dataset.autor);
      b.setAttribute("aria-pressed", String(an));
      const n = zettel.filter((x) => passt(x, "autor") && x.autor === b.dataset.autor).length;
      b.querySelector(".anzahl").textContent = n;
      b.hidden = !n && !an;
    }
    // Zeitband: die Balken in Tinte zeigen die Treffer, die hellen alle
    for (const w of wochen) {
      const t = w.querySelector(".woche-treffer");
      w.classList.toggle("gewaehlt", z.woche === +w.dataset.von);
      if (!t) continue;
      const von = +w.dataset.von, bis = +w.dataset.bis;
      const n = zettel.filter((x) => !x.li.hidden && x.erfasst >= von && x.erfasst < bis).length;
      const H = +t.dataset.h, h = n ? Math.max(3, (n / +t.dataset.max) * (H - 4)) : 0;
      t.setAttribute("y", (H - h).toFixed(1));
      t.setAttribute("height", h.toFixed(1));
    }
    const gefiltert = z.q || z.plattform || z.schlagworte.size || z.autoren.size || z.woche !== null;
    const woche = z.woche !== null ? (() => { const d = new Date(z.woche); return ` in der Woche ab ${d.getUTCDate()}.${d.getUTCMonth() + 1}.${d.getUTCFullYear()}`; })() : "";
    stand.textContent = gefiltert ? `${sichtbar} von ${zettel.length} Zetteln${woche}` : "";
    for (const k of zurueck) k.hidden = !gefiltert;
    leer.hidden = sichtbar > 0;
    adresse();
  }

  const neu = () => { zeigen(); };
  suche.addEventListener("input", () => { z.q = suche.value.trim(); neu(); });
  filter.addEventListener("click", (ev) => {
    const b = ev.target.closest("button");
    if (!b) return;
    if (b.dataset.plattform !== undefined) z.plattform = b.dataset.plattform;
    else if (b.dataset.schlagwort) z.schlagworte.has(b.dataset.schlagwort) ? z.schlagworte.delete(b.dataset.schlagwort) : z.schlagworte.add(b.dataset.schlagwort);
    else if (b.dataset.autor) z.autoren.has(b.dataset.autor) ? z.autoren.delete(b.dataset.autor) : z.autoren.add(b.dataset.autor);
    else if (b.dataset.ordnung) { z.ordnung = b.dataset.ordnung; for (const o of filter.querySelectorAll("[data-ordnung]")) o.setAttribute("aria-pressed", String(o === b)); ordnen(); }
    else return;
    neu();
  });
  for (const k of zurueck) k.addEventListener("click", () => {
    Object.assign(z, { q: "", plattform: "", woche: null });
    z.schlagworte.clear(); z.autoren.clear(); suche.value = "";
    neu();
  });
  // Schlagworte und Hashtags in den Zetteln filtern hier, statt die Seite neu zu laden
  liste.addEventListener("click", (ev) => {
    const a = ev.target.closest("a[data-schlagwort], a.hashtag");
    if (!a || ev.metaKey || ev.ctrlKey || ev.shiftKey) return;
    ev.preventDefault();
    if (a.dataset.schlagwort) z.schlagworte.add(a.dataset.schlagwort);
    else { z.q = new URL(a.href).searchParams.get("q") ?? ""; suche.value = z.q; }
    neu();
    filter.scrollIntoView({ block: "nearest" });
    liste.querySelector(".zettel:not([hidden])")?.scrollIntoView({ block: "start", behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" });
  });
  // eine Woche im Zeitband wählen (noch einmal: lösen)
  for (const w of wochen) {
    if (!w.querySelector(".woche-alle")) continue;
    w.setAttribute("tabindex", "0");
    w.setAttribute("role", "button");
    w.setAttribute("aria-label", w.querySelector("title").textContent);
    const waehlen = () => { z.woche = z.woche === +w.dataset.von ? null : +w.dataset.von; neu(); };
    w.addEventListener("click", waehlen);
    w.addEventListener("keydown", (ev) => { if (ev.key === "Enter" || ev.key === " ") { ev.preventDefault(); waehlen(); } });
  }

  if (z.ordnung !== "erfasst") { for (const o of filter.querySelectorAll("[data-ordnung]")) o.setAttribute("aria-pressed", String(o.dataset.ordnung === z.ordnung)); }
  ordnen();
  zeigen();
}
