// ornament.lab · Works: Bühne und Raster umschalten (gemerkt im Browser, #raster und #buehne im Link gehen vor), auf der Bühne blättern
// (Rad, Pfeiltasten, Wischen, Tasten), Filme stumm abspielen (Bühne: das gezeigte Werk, Raster: beim Darüberfahren), Dock und Menü, der Punkt im Signet läuft wie im Neubau. Bei «weniger Bewegung» bleiben Punkt und Filme stehen.
const ruhig = matchMedia("(prefers-reduced-motion: reduce)").matches;
const html = document.documentElement;
const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];

if (!ruhig) for (const lauf of $$(".signet .lauf, .dock-marke .lauf, .kachel-signet .lauf, .kachel-logo .lauf")) lauf.beginElement?.();

const spiele = (v, an) => {
  if (!v) return;
  if (an && !ruhig) { if (!v.src) v.src = v.dataset.film; return v.play().then(() => true).catch(() => false); }
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
  let i = 0, laeuft = false, ende = 0;
  const warte = (ms) => new Promise((r) => setTimeout(r, ruhig ? 0 : ms));

  // die Karten im Ring: k = Abstand zur Mitte (kürzester Weg rundherum); voll: die Mitte füllt die Bühne
  const ring = (mitte, { voll = false, nachbarn = true } = {}) => dias.forEach((d, j) => {
    const L = dias.length;
    let k = j - mitte;
    if (k > L / 2) k -= L;
    if (k < -L / 2) k += L;
    const a = Math.min(Math.abs(k), 3), r = Math.sign(k);
    const p = voll && k === 0 ? { x: 0, s: 1, o: 1, dreh: 0 }
      : { x: r * [0, 47, 73, 92][a], s: [0.42, 0.22, 0.12, 0.06][a], o: a > 2 || (voll && !nachbarn) ? 0 : 1, dreh: r * -22 };
    for (const [n, v] of Object.entries(p)) d.style.setProperty(`--${n}`, v);
    d.style.setProperty("--z", String(10 - a));
  });

  const wechsel = async (n) => {
    n = (n + dias.length) % dias.length;
    if (n === i || laeuft) return;
    laeuft = true;
    const alt = dias[i], neu = dias[n];
    spiele($("video", alt), false); alt.classList.remove("spielt");
    alt.classList.remove("ist");
    html.dataset.karussell = "";
    ring(i);                    // das Werk schrumpft zur Karte, die Nachbarn tauchen auf
    await warte(650);
    ring(n);                    // der Ring dreht um eins (oder mehr)
    i = n;
    jetzt.textContent = String(n + 1).padStart(2, "0");
    dockSetzen({ text: neu.dataset.text, href: neu.dataset.href, bild: neu.dataset.bild });
    await warte(700);
    delete html.dataset.karussell;
    neu.classList.add("ist");
    ring(n, { voll: true });    // das nächste wächst zur Bühne
    for (const d of dias) $(".dia-flaeche", d)?.setAttribute("tabindex", d === neu ? "0" : "-1");
    await warte(650);
    ring(n, { voll: true, nachbarn: false });
    if (neu.classList.contains("hat-film")) spiele($("video", neu), true).then((ok) => ok && neu.classList.add("spielt"));
    laeuft = false; ende = performance.now();
    takt();
  };
  const blaettern = (d) => wechsel(i + d);
  ring(0, { voll: true, nachbarn: false });

  // dreht von selbst weiter; der Fortschritt füllt das Dock. Hält an bei offenem Menü, im Raster, im Hintergrund und bei «weniger Bewegung»
  const DAUER = 6;
  const fortschritt = Object.assign(document.createElement("span"), { className: "dock-fortschritt" });
  fortschritt.setAttribute("aria-hidden", "true");
  fortschritt.style.setProperty("--dauer", `${DAUER}s`);
  $(".dock-leiste").prepend(fortschritt);
  const darf = () => !ruhig && dias.length > 1 && html.dataset.ansicht === "buehne";
  function takt() {
    fortschritt.classList.remove("laeuft"); void fortschritt.offsetWidth;
    if (darf()) fortschritt.classList.add("laeuft");
  }
  const pause = () => fortschritt.classList.toggle("pausiert", !menue.hidden || document.hidden);
  fortschritt.addEventListener("animationend", () => blaettern(1));
  document.addEventListener("visibilitychange", pause);
  new MutationObserver(pause).observe(menue, { attributes: true, attributeFilter: ["hidden"] });

  buehne.addEventListener("wheel", (e) => { e.preventDefault(); if (Math.abs(e.deltaY) + Math.abs(e.deltaX) < 12 || laeuft || performance.now() < ende + 450) return; blaettern((e.deltaY || e.deltaX) > 0 ? 1 : -1); }, { passive: false });
  let start = null;
  buehne.addEventListener("pointerdown", (e) => { start = { x: e.clientX, y: e.clientY }; });
  buehne.addEventListener("pointerup", (e) => {
    if (!start) return;
    const dx = e.clientX - start.x, dy = e.clientY - start.y; start = null;
    if (Math.max(Math.abs(dx), Math.abs(dy)) < 40) return;
    gewischt = true; setTimeout(() => { gewischt = false; }, 50);   // der Klick nach dem Wischen öffnet kein Werk
    blaettern((Math.abs(dy) > Math.abs(dx) ? -dy : -dx) > 0 ? 1 : -1);
  });
  let gewischt = false;
  buehne.addEventListener("click", (e) => { if (gewischt) e.preventDefault(); }, true);
  $(".buehne-tasten .weiter").addEventListener("click", () => blaettern(1));
  $(".buehne-tasten .zurueck").addEventListener("click", () => blaettern(-1));
  document.addEventListener("keydown", (e) => {
    if (html.dataset.ansicht !== "buehne" || e.altKey || e.metaKey || e.ctrlKey || !menue.hidden) return;
    const d = { ArrowDown: 1, ArrowRight: 1, PageDown: 1, " ": 1, ArrowUp: -1, ArrowLeft: -1, PageUp: -1 }[e.key];
    if (d) { e.preventDefault(); blaettern(d); }
  });

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
      if (d.classList.contains("hat-film")) spiele($("video", d), true).then((ok) => ok && d.classList.add("spielt"));
      takt();
    } else {
      takt();
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
