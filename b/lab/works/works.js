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
  // Das Drehkarussell (Wunsch von Christian, 23. Oktober 2026: «in der ersten Ansicht gerne das ganze Karussell sehen, das erst bei Bewegung
  // dreht und eine Karte in den Vordergrund bringt»): zuerst stehen alle Karten im Ring; erst Rad, Pfeile, Wischen oder ein Klick drehen ihn,
  // dann wächst die vordere Karte zur Bühne. Weiteres Drehen: zurück in den Ring, drehen, wieder nach vorn. Esc oder Klick daneben: zurück in den Ring.
  // phase: Stellung des Rings (Index der vorderen Karte, als Kommazahl während der Drehung); vorn: 0 = Ring, 1 = vordere Karte auf der Bühne.
  const L = dias.length;
  const schmal = matchMedia("(max-width: 759px)");
  let phase = 0, vorn = 0, i = 0, laeuft = false, ende = 0;
  const glatt = (t) => (1 - Math.cos(Math.PI * t)) / 2;   // sanft an- und auslaufend, ohne Ruck in der Mitte
  const zeichne = () => {
    const R = schmal.matches ? 34 : 30, H = schmal.matches ? 30 : 34;   // Halbmesser des Rings in vw, Höhe der Ellipse in vh
    dias.forEach((d, j) => {
      let k = (((j - phase) % L) + L) % L;
      if (k > L / 2) k -= L;
      const w = (2 * Math.PI * k) / L, tiefe = (Math.cos(w) + 1) / 2;   // 1 vorne, 0 hinten
      // von leicht oben gesehen: hintere Karten stehen höher und kleiner, damit der ganze Ring sichtbar ist
      let x = Math.sin(w) * R, y = (tiefe - 0.5) * H - 7, s = schmal.matches ? 0.17 + 0.27 * tiefe : 0.11 + 0.19 * tiefe, o = 0.55 + 0.45 * tiefe, dreh = -Math.sin(w) * 34;
      const vorne = Math.abs(k) < 0.001;
      if (vorne) { x *= 1 - vorn; y *= 1 - vorn; s += (1 - s) * vorn; dreh *= 1 - vorn; o = 1; } else o *= 1 - vorn;
      d.style.setProperty("--x", x.toFixed(3)); d.style.setProperty("--y", y.toFixed(3)); d.style.setProperty("--s", s.toFixed(4));
      d.style.setProperty("--o", o.toFixed(3)); d.style.setProperty("--dreh", dreh.toFixed(2));
      d.style.setProperty("--z", String(Math.round(tiefe * 200) + (vorne ? 1 : 0)));
    });
  };
  const bewege = (zu, ms) => new Promise((fertig) => {
    const von = { phase, vorn }, t0 = performance.now();
    const schritt = (t) => {
      const p = ruhig || ms === 0 ? 1 : Math.min(1, (t - t0) / ms), e = glatt(p);
      if ("phase" in zu) phase = von.phase + (zu.phase - von.phase) * e;
      if ("vorn" in zu) vorn = von.vorn + (zu.vorn - von.vorn) * e;
      zeichne();
      p < 1 ? requestAnimationFrame(schritt) : fertig();
    };
    requestAnimationFrame(schritt);
  });
  const imRing = (an) => { if (an) html.dataset.karussell = ""; else delete html.dataset.karussell; };
  const vorne = () => dias[i];
  // der Film hält nur an und bleibt sichtbar: ein Wechsel zurück aufs Standbild liess die Karte beim Schrumpfen flackern
  const ruhigStellen = () => { for (const d of dias) { spiele($("video", d), false); d.classList.remove("ist"); } };

  /** in den Ring zurück (die vordere Karte schrumpft) */
  const zumRing = async () => { ruhigStellen(); imRing(true); await bewege({ vorn: 0 }, 900); };
  /** die vordere Karte auf die Bühne holen */
  const nachVorn = async () => {
    const d = vorne();
    await bewege({ vorn: 1 }, 1100);
    imRing(false); d.classList.add("ist");
    for (const x of dias) $(".dia-flaeche", x)?.setAttribute("tabindex", x === d ? "0" : "-1");
    if (d.classList.contains("hat-film")) spiele($("video", d), true).then((ok) => ok && d.classList.add("spielt"));
  };
  /** den Ring um d Karten drehen und die neue vordere Karte nach vorn holen */
  const drehe = async (d) => {
    if (laeuft || !d) return;
    laeuft = true;
    if (vorn > 0) await zumRing();
    const ziel = phase + d;
    await bewege({ phase: ziel }, 1000 + 350 * Math.min(Math.abs(d), 3));
    phase = ((Math.round(ziel) % L) + L) % L; i = phase; zeichne();
    jetzt.textContent = String(i + 1).padStart(2, "0");
    dockSetzen({ text: vorne().dataset.text, href: vorne().dataset.href, bild: vorne().dataset.bild });
    await nachVorn();
    laeuft = false; ende = performance.now();
  };
  const blaettern = (d) => (vorn === 0 && d === 0 ? (laeuft = true, nachVorn().then(() => { laeuft = false; })) : drehe(d));
  imRing(true); zeichne();
  for (const d of dias) d.classList.remove("ist");
  for (const x of dias) $(".dia-flaeche", x)?.setAttribute("tabindex", "-1");

  // Klick auf eine Karte im Ring: sie dreht nach vorn (kürzester Weg); auf der Bühne öffnet der Klick das Werk
  buehne.addEventListener("click", (e) => {
    if (gewischt) { e.preventDefault(); return; }
    const d = e.target.closest(".dia");
    if (vorn === 1 && d === vorne()) return;
    e.preventDefault();
    if (!d) { if (vorn === 1 && !laeuft && !e.target.closest("button, a, .zaehler")) { laeuft = true; zumRing().then(() => { laeuft = false; }); } return; }
    let k = (dias.indexOf(d) - i + L) % L;
    if (k > L / 2) k -= L;
    k === 0 ? blaettern(0) : drehe(k);
  }, true);
  document.addEventListener("keydown", (e) => {
    if (html.dataset.ansicht !== "buehne" || e.altKey || e.metaKey || e.ctrlKey || !menue.hidden) return;
    if (e.key === "Escape" && vorn === 1 && !laeuft) { laeuft = true; zumRing().then(() => { laeuft = false; }); return; }
    const d = { ArrowDown: 1, ArrowRight: 1, PageDown: 1, ArrowUp: -1, ArrowLeft: -1, PageUp: -1 }[e.key];
    if (d) { e.preventDefault(); blaettern(d); }
  });

  buehne.addEventListener("wheel", (e) => { e.preventDefault(); if (Math.abs(e.deltaY) + Math.abs(e.deltaX) < 12 || laeuft || performance.now() < ende + 600) return; blaettern((e.deltaY || e.deltaX) > 0 ? 1 : -1); }, { passive: false });
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
      if (vorn === 1 && d.classList.contains("hat-film")) spiele($("video", d), true).then((ok) => ok && d.classList.add("spielt"));
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
