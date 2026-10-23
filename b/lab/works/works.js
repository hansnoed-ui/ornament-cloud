// ornament.lab · Works: Bühne und Raster umschalten (gemerkt im Browser, #raster und #buehne im Link gehen vor), auf der Bühne blättern
// (Drehkarussell: Rad, Pfeiltasten, Wischen, Klick), Filme stumm abspielen (Bühne: das gezeigte Werk, Raster: beim Darüberfahren), Dock und Menü, der Punkt im Signet läuft wie im Neubau. Bei «weniger Bewegung» bleiben Punkt und Filme stehen.
const ruhig = matchMedia("(prefers-reduced-motion: reduce)").matches;
const html = document.documentElement;
const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];

if (!ruhig) for (const lauf of $$(".signet .lauf, .dock-marke .lauf, .kachel-signet .lauf, .kachel-logo .lauf")) lauf.beginElement?.();

const spiele = (v, an) => {
  if (!v) return;
  // erst wenn das erste Bild wirklich gemalt ist, gilt der Film als laufend; sonst blitzt beim Einblenden eine schwarze Fläche auf
  if (an && !ruhig) { if (!v.src) v.src = v.dataset.film; return v.play().then(() => new Promise((ok) => (v.requestVideoFrameCallback ? v.requestVideoFrameCallback(() => ok(true)) : v.addEventListener("timeupdate", () => ok(true), { once: true })))).catch(() => false); }
  v.pause(); return Promise.resolve(false);
};

/* ---------- Dock und Menü ---------- */
const dock = $(".dock"), menue = $("#menue"), knopf = $(".dock-menue");
const menueAuf = (auf) => {
  menue.hidden = !auf; knopf.setAttribute("aria-expanded", String(auf));
  if (auf && !ruhig) $(".kachel-logo .lauf", menue)?.beginElement?.();   // das Signet im Menü läuft los, sobald man es sieht
};
knopf?.addEventListener("click", () => menueAuf(menue.hidden));
document.addEventListener("keydown", (e) => { if (e.key === "Escape" && !menue.hidden) { menueAuf(false); knopf.focus(); } });
document.addEventListener("pointerdown", (e) => { if (!menue.hidden && !dock.contains(e.target)) menueAuf(false); });
menue?.addEventListener("click", (e) => { if (e.target.closest("a")) menueAuf(false); });


const dockSetzen = ({ text, href, bild }) => {
  const mitte = $(".dock-mitte"), marke = $(".dock-marke");
  $(".dock-text").textContent = text;
  if (mitte.tagName === "A" && href) mitte.href = href;
  if (bild) { let img = $("img", marke); if (!img) { marke.textContent = ""; img = marke.appendChild(new Image()); img.alt = ""; } img.src = bild; }
  else if (!$("svg", marke)) marke.replaceChildren($(".kopf .signet svg").cloneNode(true));   // ohne Werk: das Signet
  dock.classList.remove("dock-wechsel"); void dock.offsetWidth; dock.classList.add("dock-wechsel");
};

/* ---------- Übersicht: Bühne und Raster ---------- */
if (html.classList.contains("uebersicht")) {
  const buehne = $(".buehne"), dias = $$(".dia"), jetzt = $(".zaehler-jetzt");
  // Das Drehkarussell nach dem Vorbild von mubien.com (Screenshots von Christian, 23. Oktober 2026): ein flacher Ring auf Augenhöhe,
  // vorn eine grosse Karte im Hochformat, die Nachbarn kleiner und am Rand angeschnitten, die hinteren klein dahinter. Rad, Pfeile,
  // Wischen oder ein Klick auf eine Karte drehen den Ring; ein Klick auf die vordere Karte öffnet das Werk.
  // phase: Stellung des Rings (Index der vorderen Karte, als Kommazahl während der Drehung)
  const L = dias.length;
  const schmal = matchMedia("(max-width: 759px)");
  // Filme nur mit Maus: auf Telefonen (Chrome auf Android) liess ein Film in einer bewegten Karte den Bildschirm flackern,
  // dort bleibt das Standbild stehen
  const filme = matchMedia("(hover: hover) and (pointer: fine)");
  let phase = 0, i = 0, laeuft = false, ende = 0;
  const glatt = (t) => (1 - Math.cos(Math.PI * t)) / 2;   // sanft an- und auslaufend, ohne Ruck in der Mitte
  const setze = (d, k, v) => { if (d.style[k] !== v) d.style[k] = v; };
  const zeichne = () => {
    const rang = [];
    const R = schmal.matches ? 56 : 40;   // Halbmesser des Rings in vw: die Nachbarn stehen am Rand
    dias.forEach((d, j) => {
      let k = (((j - phase) % L) + L) % L;
      if (k > L / 2) k -= L;
      const w = (2 * Math.PI * k) / L, tief = 1 - Math.cos(w);   // 0 vorne, 2 hinten
      const x = Math.sin(w) * R, s = 1 / (1 + 3.4 * tief);       // Perspektive: Nachbarn gut ein Drittel so gross
      // Transform direkt setzen (keine CSS-Variablen, die bis in Bild und Film vererbt würden), und nur, was sich ändert
      setze(d, "transform", `translateX(${x.toFixed(3)}vw) scale(${s.toFixed(4)})`);
      rang.push([-tief, d]);
    });
    // Stapelfolge nach Rang: z-index ändert sich nur, wenn zwei Karten wirklich die Plätze tauschen
    rang.sort((a, b) => a[0] - b[0]).forEach(([, d], n) => setze(d, "zIndex", String(n + 1)));
  };
  const bewege = (ziel, ms) => new Promise((fertig) => {
    const von = phase, t0 = performance.now();
    const schritt = (t) => {
      const p = ruhig ? 1 : Math.min(1, (t - t0) / ms);
      phase = von + (ziel - von) * glatt(p); zeichne();
      p < 1 ? requestAnimationFrame(schritt) : fertig();
    };
    requestAnimationFrame(schritt);
  });
  const vorne = () => dias[i];
  /** die vordere Karte wird zum Werk: Dock, Zähler, Fokus, Film */
  const vornSetzen = () => {
    const d = vorne();
    for (const x of dias) { x.classList.toggle("ist", x === d); $(".dia-flaeche", x)?.setAttribute("tabindex", x === d ? "0" : "-1"); }
    jetzt.textContent = String(i + 1).padStart(2, "0");
    dockSetzen({ text: d.dataset.text, href: d.dataset.href, bild: d.dataset.bild });
    if (html.dataset.ansicht !== "raster" && filme.matches && d.classList.contains("hat-film")) spiele($("video", d), true).then((ok) => ok && d.classList.add("spielt"));
  };
  /** den Ring um d Karten drehen */
  const drehe = async (d) => {
    if (laeuft || !d) return;
    laeuft = true;
    // der Film hält nur an und bleibt sichtbar: ein Wechsel zurück aufs Standbild liess die Karte flackern
    for (const x of dias) { spiele($("video", x), false); x.classList.remove("ist"); }
    const ziel = phase + d;
    await bewege(ziel, 900 + 300 * Math.min(Math.abs(d), 3));
    phase = ((Math.round(ziel) % L) + L) % L; i = phase; zeichne();
    vornSetzen();
    laeuft = false; ende = performance.now();
  };
  const blaettern = (d) => drehe(d);
  html.dataset.karussell = "";
  zeichne(); vornSetzen();

  // Klick auf eine Nachbarkarte: sie dreht nach vorn (kürzester Weg); ein Klick auf die vordere Karte öffnet das Werk
  buehne.addEventListener("click", (e) => {
    if (gewischt) { e.preventDefault(); return; }
    const d = e.target.closest(".dia");
    if (!d || (d === vorne() && !laeuft)) return;
    e.preventDefault();
    let k = (dias.indexOf(d) - i + L) % L;
    if (k > L / 2) k -= L;
    drehe(k);
  }, true);
  document.addEventListener("keydown", (e) => {
    if (html.dataset.ansicht !== "buehne" || e.altKey || e.metaKey || e.ctrlKey || !menue.hidden) return;
    const d = { ArrowDown: 1, ArrowRight: 1, PageDown: 1, ArrowUp: -1, ArrowLeft: -1, PageUp: -1 }[e.key];
    if (d) { e.preventDefault(); blaettern(d); }
  });

  buehne.addEventListener("wheel", (e) => { e.preventDefault(); if (Math.abs(e.deltaY) + Math.abs(e.deltaX) < 12 || laeuft || performance.now() < ende + 500) return; blaettern((e.deltaY || e.deltaX) > 0 ? 1 : -1); }, { passive: false });
  let start = null, gewischt = false;
  buehne.addEventListener("pointerdown", (e) => { start = { x: e.clientX, y: e.clientY }; });
  buehne.addEventListener("pointerup", (e) => {
    if (!start) return;
    const dx = e.clientX - start.x, dy = e.clientY - start.y; start = null;
    if (Math.max(Math.abs(dx), Math.abs(dy)) < 40) return;
    gewischt = true; setTimeout(() => { gewischt = false; }, 50);   // der Klick nach dem Wischen öffnet kein Werk
    blaettern((Math.abs(dy) > Math.abs(dx) ? -dy : -dx) > 0 ? 1 : -1);
  });
  $(".buehne-tasten .weiter").addEventListener("click", (e) => { e.stopPropagation(); blaettern(1); });
  $(".buehne-tasten .zurueck").addEventListener("click", (e) => { e.stopPropagation(); blaettern(-1); });
  addEventListener("resize", zeichne);

  // Raster: Filme laufen beim Darüberfahren oder Fokussieren
  for (const a of $$("a.werk")) {
    const m = $(".medium.hat-film", a), v = m && $("video", m);
    if (!v) continue;
    const an = () => spiele(v, true).then((ok) => ok && m.classList.add("spielt"));
    const aus = () => { m.classList.remove("spielt"); spiele(v, false); };
    a.addEventListener("pointerenter", an); a.addEventListener("focus", an);
    a.addEventListener("pointerleave", aus); a.addEventListener("blur", aus);
  }

  const ansicht = (a, { merken = true } = {}) => {
    html.dataset.ansicht = a;
    for (const b of $$(".ansicht button")) b.setAttribute("aria-pressed", String(b.dataset.ansicht === a));
    if (merken) try { localStorage.setItem("works-ansicht", a); } catch {}
    const d = dias[i];
    if (a === "buehne") {
      dockSetzen({ text: d.dataset.text, href: d.dataset.href, bild: d.dataset.bild });
      if (filme.matches && d.classList.contains("hat-film")) spiele($("video", d), true).then((ok) => ok && d.classList.add("spielt"));
    } else {
      spiele($("video", d), false); d.classList.remove("spielt");
      const n = $$("a.werk:not(.platzhalter)").length;
      dockSetzen({ text: n ? `${n} ${n === 1 ? "Werk" : "Werke"} · nach oben` : "Noch kein Werk · nach oben", href: "#inhalt", bild: null });
    }
  };
  for (const b of $$(".ansicht button")) b.addEventListener("click", () => { ansicht(b.dataset.ansicht); if (location.hash) history.replaceState(null, "", location.pathname); scrollTo(0, 0); });
  addEventListener("hashchange", () => {
    if (["#raster", "#info", "#werke"].includes(location.hash)) { ansicht("raster", { merken: false }); $(location.hash)?.scrollIntoView(); }
    else if (location.hash === "#buehne") ansicht("buehne", { merken: false });
  });
  if (location.hash === "#info" || location.hash === "#werke") html.dataset.ansicht = "raster";
  ansicht(html.dataset.ansicht === "raster" ? "raster" : "buehne", { merken: false });
  if (location.hash === "#info" || location.hash === "#werke") $(location.hash)?.scrollIntoView();
}
