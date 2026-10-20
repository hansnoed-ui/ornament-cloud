// ornament.cloud/b/ – das Skript des Neubaus (ES-Modul, ohne Abhängigkeiten, ohne Aufrufe nach aussen).
// Vier Dinge: die Fäden im Feld zeichnen, auf der Startseite den Leitsatz wechseln, Teilen (Web Share oder Link kopieren),
// und auf den Angebotsseiten aus den Wahlen ein Briefing setzen. Ohne Skript bleibt alles lesbar und verlinkt.

const ruhig = matchMedia("(prefers-reduced-motion: reduce)").matches;
const zufall = (n) => { const a = new Uint32Array(1); try { crypto.getRandomValues(a); return a[0] % n; } catch { return Math.floor(Math.random() * n); } };

/* ---------- Meldung unten (Link kopiert) ---------- */
let meldungEl;
function melde(text) {
  if (!meldungEl) { meldungEl = document.createElement("div"); meldungEl.className = "meldung"; meldungEl.setAttribute("role", "status"); document.body.append(meldungEl); }
  meldungEl.textContent = text; meldungEl.classList.add("da");
  clearTimeout(meldungEl._t); meldungEl._t = setTimeout(() => meldungEl.classList.remove("da"), 1800);
}

/* ---------- Das Feld: Fäden zwischen Zellen ---------- */
function feld(rahmen) {
  const feld = rahmen.querySelector(".feld"), svg = rahmen.querySelector(".feld-faeden");
  if (!feld || !svg) return;
  const zellen = [...feld.querySelectorAll("a[data-n]")];
  const byN = new Map(zellen.map((z) => [+z.dataset.n, z]));
  let paare = [];
  try { paare = JSON.parse(rahmen.dataset.faeden || "[]"); } catch {}
  const nachbarn = new Map();
  for (const [a, b] of paare) { (nachbarn.get(a) || nachbarn.set(a, new Set()).get(a)).add(b); (nachbarn.get(b) || nachbarn.set(b, new Set()).get(b)).add(a); }

  const mitte = (z) => { const r = z.getBoundingClientRect(), f = feld.getBoundingClientRect(); return [r.left - f.left + r.width / 2, r.top - f.top + r.height / 2]; };
  let gezeichnet = false;
  function zeichnen() {
    const f = feld.getBoundingClientRect();
    svg.setAttribute("viewBox", `0 0 ${f.width} ${f.height}`);
    svg.replaceChildren();
    paare.forEach(([a, b], i) => {
      const za = byN.get(a), zb = byN.get(b); if (!za || !zb) return;
      const [x1, y1] = mitte(za), [x2, y2] = mitte(zb);
      // leicht gebogen, immer zur selben Seite: so kreuzen sich die Fäden wie in einem Ornament
      const dx = x2 - x1, dy = y2 - y1, l = Math.hypot(dx, dy) || 1, k = Math.min(60, l * 0.22);
      const cx = (x1 + x2) / 2 - (dy / l) * k, cy = (y1 + y2) / 2 + (dx / l) * k;
      const p = document.createElementNS("http://www.w3.org/2000/svg", "path");
      p.setAttribute("d", `M${x1.toFixed(1)} ${y1.toFixed(1)} Q${cx.toFixed(1)} ${cy.toFixed(1)} ${x2.toFixed(1)} ${y2.toFixed(1)}`);
      p.dataset.a = a; p.dataset.b = b;
      svg.append(p);
      if (rahmen.dataset.still != null) p.classList.add("leise");
      else if (!gezeichnet && !ruhig) { p.style.setProperty("--l", Math.ceil(p.getTotalLength()) + "px"); p.style.setProperty("--d", `${0.15 + i * 0.09}s`); p.classList.add("wachsen"); }
    });
    gezeichnet = true;
  }
  zeichnen();
  addEventListener("resize", () => { clearTimeout(feld._r); feld._r = setTimeout(zeichnen, 120); });

  function hervor(n) {
    const nah = nachbarn.get(n) || new Set();
    zellen.forEach((z) => z.classList.toggle("nah", nah.has(+z.dataset.n)));
    const still = rahmen.dataset.still != null;
    svg.querySelectorAll("path").forEach((p) => p.classList.toggle("leise", n == null ? still : +p.dataset.a !== n && +p.dataset.b !== n));
  }
  zellen.forEach((z) => {
    z.addEventListener("pointerenter", () => hervor(+z.dataset.n));
    z.addEventListener("focus", () => hervor(+z.dataset.n));
    z.addEventListener("pointerleave", () => hervor(null));
    z.addEventListener("blur", () => hervor(null));
  });
  return { zellen, hervor };
}

/* ---------- Startseite: der Leitsatz wechselt mit dem Feld ---------- */
function buehne(el) {
  const daten = document.getElementById("zettel-daten");
  if (!daten) return;
  let zettel = [];
  try { zettel = JSON.parse(daten.textContent); } catch { return; }
  const satz = el.querySelector(".leitsatz"), woher = el.querySelector(".woher a"), nochmal = el.querySelector(".nochmal");
  const rahmen = el.querySelector(".feld-rahmen"), f = rahmen && feld(rahmen);
  let aktuell = +(el.dataset.aktuell || 0);
  function zeige(n, { markieren = true } = {}) {
    const z = zettel.find((x) => x.n === n); if (!z) return;
    aktuell = n;
    satz.textContent = z.leitsatz;
    woher.textContent = `Zettel ${z.n} · ${z.titel}`;
    woher.href = `/b/zettel/${z.slug}/`;
    if (f && markieren) f.zellen.forEach((c) => c.classList.toggle("aktiv", +c.dataset.n === n));
  }
  // beim Aufruf ein anderer als der eingebaute, jedes Mal ein anderer
  let n = 1 + zufall(zettel.length); if (n === aktuell) n = (n % zettel.length) + 1;
  zeige(n);
  nochmal?.addEventListener("click", () => { let m = 1 + zufall(zettel.length); if (m === aktuell) m = (m % zettel.length) + 1; zeige(m); });
  if (f) {
    let beruehrt = null;
    f.zellen.forEach((c) => {
      c.addEventListener("pointerenter", (e) => { if (e.pointerType !== "touch") zeige(+c.dataset.n, { markieren: false }); });
      c.addEventListener("focus", () => zeige(+c.dataset.n, { markieren: false }));
      // auf dem Telefon: das erste Tippen zeigt den Satz, das zweite öffnet den Zettel
      c.addEventListener("click", (e) => {
        if (!matchMedia("(hover: none)").matches) return;
        const m = +c.dataset.n;
        if (beruehrt !== m) { e.preventDefault(); beruehrt = m; zeige(m); f.hervor(m); }
      });
    });
  }
}

/* ---------- Teilen ---------- */
function teilen(knopf) {
  knopf.addEventListener("click", async () => {
    const url = knopf.dataset.url || location.href, title = knopf.dataset.titel || document.title, text = knopf.dataset.text || "";
    if (navigator.share) { try { await navigator.share({ title, text, url }); return; } catch (e) { if (e && e.name === "AbortError") return; } }
    try { await navigator.clipboard.writeText(url); melde("Link kopiert"); } catch { prompt("Link zum Teilen", url); }
  });
}

/* ---------- Briefing auf den Angebotsseiten ---------- */
function briefing(form) {
  const out = form.querySelector("output"), mail = form.querySelector(".brief-mail"), kopieren = form.querySelector(".brief-kopieren");
  const angebot = form.dataset.angebot || "";
  function setzen() {
    const zeilen = [`Angebot: ${angebot}`];
    for (const fs of form.querySelectorAll("fieldset")) {
      const frage = fs.querySelector("legend")?.textContent.trim(), wahl = fs.querySelector("input:checked");
      if (wahl) zeilen.push(`${frage} ${wahl.nextElementSibling.textContent.trim()}.`);
    }
    const fertig = zeilen.length === 1 ? "" : zeilen.join("\n");
    out.textContent = fertig || "Wähle oben, dann steht hier dein Briefing.";
    out.classList.toggle("leer", !fertig);
    const body = (fertig || `Angebot: ${angebot}`) + "\n\nDazu noch:\n";
    mail.href = `mailto:hansnoed@gmail.com?subject=${encodeURIComponent("Anfrage: " + angebot)}&body=${encodeURIComponent(body)}`;
    return fertig;
  }
  form.addEventListener("change", setzen);
  kopieren?.addEventListener("click", async () => { const t = setzen(); if (!t) { melde("Erst wählen"); return; } try { await navigator.clipboard.writeText(t); melde("Briefing kopiert"); } catch { prompt("Briefing", t); } });
  setzen();
}

/* ---------- Start ---------- */
const start = document.querySelector(".buehne");
if (start) buehne(start); else document.querySelectorAll(".feld-rahmen").forEach(feld);
document.querySelectorAll(".teilen-knopf").forEach(teilen);
document.querySelectorAll("form.brief").forEach(briefing);
