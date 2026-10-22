// ornament.cloud/b/ – das Skript des Neubaus (ES-Modul, ohne Abhängigkeiten, ohne Aufrufe nach aussen).
// Vier Dinge: die Fäden im Feld zeichnen, auf der Startseite den Leitsatz wechseln, Teilen (Web Share oder Link kopieren),
// und auf den Angebotsseiten aus den Wahlen ein Briefing setzen. Ohne Skript bleibt alles lesbar und verlinkt.

const EN = document.documentElement.lang === "en";   // /b/en/: die Meldungen auf Englisch (20. Oktober 2026)
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
  const vt = el.querySelector(".vorschau-titel");
  const rahmen = el.querySelector(".feld-rahmen"), f = rahmen && feld(rahmen);
  let aktuell = +(el.dataset.aktuell || 0);
  function zeige(n, { markieren = true } = {}) {
    const z = zettel.find((x) => x.n === n); if (!z) return;
    aktuell = n;
    satz.textContent = z.leitsatz;
    if (vt) { vt.querySelector(".n").textContent = `${EN ? "Note" : "Zettel"} ${z.n}`; vt.querySelector(".t").textContent = z.titel; }
    woher.href = `${EN ? "/b/en/" : "/b/"}zettel/${z.slug}/`;   // auf Englisch zum englischen Zettel (22. Oktober 2026: «lande ich in der deutschen Version»)
    if (!ruhig) { satz.classList.remove("wechsel"); void satz.offsetWidth; satz.classList.add("wechsel"); }
    if (f && markieren) f.zellen.forEach((c) => c.classList.toggle("aktiv", +c.dataset.n === n));
  }
  // beim Aufruf ein anderer als der eingebaute, jedes Mal ein anderer
  let n = 1 + zufall(zettel.length); if (n === aktuell) n = (n % zettel.length) + 1;
  zeige(n);
  const naechster = () => { let m = 1 + zufall(zettel.length); if (m === aktuell) m = (m % zettel.length) + 1; zeige(m); };
  nochmal?.addEventListener("click", naechster);
  // der Leitsatz wechselt von selbst alle neun Sekunden, solange niemand im Feld ist; nicht bei «weniger Bewegung»
  if (!ruhig && el.dataset.takt !== "0") {
    let takt = setInterval(naechster, 9000);
    el.addEventListener("pointerenter", () => clearInterval(takt));
    el.addEventListener("pointerleave", () => { clearInterval(takt); takt = setInterval(naechster, 9000); });
    el.addEventListener("focusin", () => clearInterval(takt));
  }
  if (f) {
    let beruehrt = null;
    f.zellen.forEach((c) => {
      c.addEventListener("pointerenter", (e) => { if (e.pointerType !== "touch") zeige(+c.dataset.n, { markieren: false }); });
      c.addEventListener("focus", () => zeige(+c.dataset.n, { markieren: false }));
      // auf dem Telefon: das erste Tippen zeigt den Satz, das zweite öffnet den Zettel
      c.addEventListener("click", (e) => {
        if (!matchMedia("(hover: none)").matches) return;
        const m = +c.dataset.n;
        if (beruehrt !== m) { e.preventDefault(); beruehrt = m; zeige(m); f.hervor(m); el.querySelector(".buehne-satz")?.scrollIntoView({ block: "nearest", behavior: ruhig ? "auto" : "smooth" }); }
      });
    });
  }
}

/* ---------- Teilen ---------- */
function teilen(knopf) {
  knopf.addEventListener("click", async () => {
    const url = knopf.dataset.url || location.href, title = knopf.dataset.titel || document.title, text = knopf.dataset.text || "";
    if (navigator.share) { try { await navigator.share({ title, text, url }); return; } catch (e) { if (e && e.name === "AbortError") return; } }
    try { await navigator.clipboard.writeText(url); melde(EN ? "Link copied" : "Link kopiert"); } catch { prompt(EN ? "Link to share" : "Link zum Teilen", url); }
  });
}

/* ---------- Prüfraster: den Anwendungsprompt kopieren (20. Oktober 2026) ---------- */
for (const k of document.querySelectorAll(".prompt-kopieren")) k.addEventListener("click", async () => {
  const text = document.getElementById(k.dataset.ziel)?.textContent || "";
  try { await navigator.clipboard.writeText(text); melde(EN ? "Prompt copied – now paste it into an AI assistant" : "Prompt kopiert – jetzt in einen KI-Assistenten einfügen"); }
  catch { melde(EN ? "Copying not possible – «Read prompt» opens the text" : "Kopieren nicht möglich – «Prompt lesen» öffnet den Text"); }
});

/* ---------- Briefing auf den Angebotsseiten ---------- */
function briefing(form) {
  const out = form.querySelector("output"), mail = form.querySelector(".brief-mail"), kopieren = form.querySelector(".brief-kopieren");
  const angebot = form.dataset.angebot || "";
  function setzen() {
    const zeilen = [`${EN ? "Service" : "Angebot"}: ${angebot}`];
    for (const fs of form.querySelectorAll("fieldset")) {
      const frage = fs.querySelector("legend")?.textContent.trim(), wahl = fs.querySelector("input:checked");
      if (wahl) zeilen.push(`${frage} ${wahl.nextElementSibling.textContent.trim()}.`);
    }
    const fertig = zeilen.length === 1 ? "" : zeilen.join("\n");
    out.textContent = fertig || form.dataset.leer || "Wähle oben, dann steht hier dein Briefing.";
    out.classList.toggle("leer", !fertig);
    const body = (fertig || `${EN ? "Service" : "Angebot"}: ${angebot}`) + (EN ? "\n\nAnd also:\n" : "\n\nDazu noch:\n");
    mail.href = `mailto:hansnoed@gmail.com?subject=${encodeURIComponent((form.dataset.anfrage || "Anfrage: ") + angebot)}&body=${encodeURIComponent(body)}`;
    return fertig;
  }
  form.addEventListener("change", setzen);
  kopieren?.addEventListener("click", async () => { const t = setzen(); if (!t) { melde(EN ? "Choose first" : "Erst wählen"); return; } try { await navigator.clipboard.writeText(t); melde(EN ? "Briefing copied" : "Briefing kopiert"); } catch { prompt("Briefing", t); } });
  setzen();
}

/* ---------- Die Bühne: eine Web-Anwendung in der neuen Seite (/b/apps/<app>/oeffnen/) ---------- */
const rahmen = document.querySelector(".app-rahmen");
if (rahmen) {
  document.querySelector(".app-knoepfe .vollbild")?.addEventListener("click", () => { const q = rahmen.requestFullscreen?.(); if (q && q.catch) q.catch(() => {}); });
  const zurueck = document.querySelector(".app-knoepfe .zurueck");
  const esc = (e) => { if (e.key === "Escape" && zurueck) location.href = zurueck.href; };
  addEventListener("keydown", esc);
  rahmen.addEventListener("load", () => { try { rahmen.contentWindow.addEventListener("keydown", esc); } catch {} });   // auch wenn die App den Fokus hat (gleiche Herkunft)
}

/* ---------- Die Titel der Apps: Buchstaben aus «ornament» (20. Oktober 2026, Wunsch: «bei diesen Titeln … sollen sich diese Wörter bzw. Buchstaben
   bilden, transformieren») – das Wort «ornament» steht da, die Buchstaben, die der Name braucht, bleiben und rücken an ihren Platz, die anderen
   verblassen, neue kommen dazu (ORNA aus o-r-n-a, ORMA aus o-r-m-a, PHORMA mit PH davor, OMNA COLOR aus o-m-n-a). Einmal beim Laden, nie bei «weniger Bewegung». */
const titelEl = document.querySelector(".stueck-kopf .titel[data-wort]");
if (titelEl && !ruhig) (async () => {
  const QUELLE = "ornament", wort = titelEl.dataset.wort;
  if (!/OR[NM]A|OMNA/i.test(wort)) return;   // nur die Namen, die mit «ornament» spielen (ORNA, ORMA, PHORMA, OMNA COLOR, später INPHORMA, PERPHORMA …)
  const text = [...titelEl.childNodes].find((n) => n.nodeType === 3 && n.textContent.trim()); if (!text) return;
  try { await document.fonts.ready; } catch {}
  const frei = QUELLE.split("").map((z, i) => ({ z, i, frei: true }));
  const ziel = wort.split("").map((z) => { const q = z === " " ? null : frei.find((f) => f.frei && f.z === z.toLowerCase()); if (q) q.frei = false; return { z, von: q ? q.i : -1 }; });
  if (!ziel.some((t) => t.von >= 0)) return;   // nichts aus «ornament»: der Titel bleibt, wie er ist (The Fictory)
  const span = (z, cls) => { const e = document.createElement("span"); e.className = "buchstabe " + cls; e.textContent = z === " " ? "\u00a0" : z; return e; };
  // 1. «ornament» steht da
  const quelle = QUELLE.split("").map((z, i) => span(z, ziel.some((t) => t.von === i) ? "bleibt" : "geht"));
  const halter = document.createElement("span"); halter.className = "wort"; halter.append(...quelle); text.replaceWith(halter);
  await new Promise((r) => setTimeout(r, 900));
  const lagen = quelle.map((e) => e.getBoundingClientRect());
  // 2. das Zielwort, die bleibenden Buchstaben kommen von ihrem alten Platz
  const neu = ziel.map((t) => span(t.z, t.von >= 0 ? "bleibt" : "kommt"));
  halter.replaceChildren(...neu);
  neu.forEach((e, k) => { const t = ziel[k]; if (t.von >= 0) { const a = lagen[t.von], b = e.getBoundingClientRect(); e.style.transform = `translate(${a.left - b.left}px, ${a.top - b.top}px)`; } });
  void halter.offsetWidth;
  halter.classList.add("bewegt");
  neu.forEach((e) => { e.style.transform = ""; });
  setTimeout(() => { halter.replaceWith(document.createTextNode(wort)); }, 1400);
})();

/* ---------- Signet: der Punkt läuft die Schlaufe entlang ---------- */
if (!ruhig) document.querySelectorAll(".signet animateMotion").forEach((a) => { try { a.beginElement(); } catch {} });

/* ---------- Start ---------- */
const start = document.querySelector(".buehne");
if (start) buehne(start); else document.querySelectorAll(".feld-rahmen").forEach(feld);
document.querySelectorAll(".teilen-knopf").forEach(teilen);
document.querySelectorAll("form.brief").forEach(briefing);
