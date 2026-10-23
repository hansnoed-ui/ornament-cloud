// ornament.lab · Works: Bühne und Raster umschalten (gemerkt im Browser, #raster und #buehne im Link gehen vor), auf der Bühne blättern
// (Rad, Pfeiltasten, Wischen, Tasten), Filme stumm abspielen (Bühne: das gezeigte Werk, Raster: beim Darüberfahren), Dock und Menü, die Uhr
// von Zürich, der Punkt im Signet läuft wie im Neubau. Bei «weniger Bewegung» bleiben Punkt und Filme stehen.
const ruhig = matchMedia("(prefers-reduced-motion: reduce)").matches;
const html = document.documentElement;
const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];

if (!ruhig) for (const lauf of $$(".signet .lauf, .dock-marke .lauf, .kachel-signet .lauf")) lauf.beginElement?.();

const spiele = (v, an) => {
  if (!v) return;
  if (an && !ruhig) { if (!v.src) v.src = v.dataset.film; return v.play().then(() => true).catch(() => false); }
  v.pause(); return Promise.resolve(false);
};

/* ---------- Dock und Menü ---------- */
const dock = $(".dock"), menue = $("#menue"), knopf = $(".dock-menue");
const menueAuf = (auf) => { menue.hidden = !auf; knopf.setAttribute("aria-expanded", String(auf)); if (auf) uhr(); };
knopf?.addEventListener("click", () => menueAuf(menue.hidden));
document.addEventListener("keydown", (e) => { if (e.key === "Escape" && !menue.hidden) { menueAuf(false); knopf.focus(); } });
document.addEventListener("pointerdown", (e) => { if (!menue.hidden && !dock.contains(e.target)) menueAuf(false); });
menue?.addEventListener("click", (e) => { if (e.target.closest("a")) menueAuf(false); });

function uhr() {
  const teile = Object.fromEntries(new Intl.DateTimeFormat("de-CH", { timeZone: "Europe/Zurich", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).formatToParts(new Date()).map((t) => [t.type, t.value]));
  const h = +teile.hour, m = +teile.minute;
  $(".uhr-zeit").textContent = `${teile.hour}:${teile.minute}`;
  const setze = (el, winkel, r) => { el.setAttribute("cx", (50 + r * Math.sin(winkel)).toFixed(2)); el.setAttribute("cy", (50 - r * Math.cos(winkel)).toFixed(2)); };
  setze($(".uhr .min"), (m / 60) * 2 * Math.PI, 46);
  setze($(".uhr .std"), (((h % 12) + m / 60) / 12) * 2 * Math.PI, 30);
}
setInterval(() => { if (!menue.hidden) uhr(); }, 20000);

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
  const dockStart = { text: $(".dock-text").textContent };
  let i = 0, sperre = 0;

  const zeige = (n, richtung) => {
    n = (n + dias.length) % dias.length;
    if (n === i) return;
    buehne.classList.toggle("rueckwaerts", richtung < 0);
    const alt = dias[i], neu = dias[n];
    for (const d of dias) d.classList.remove("war");
    alt.classList.replace("ist", "war"); neu.classList.add("ist");
    for (const d of dias) $(".dia-flaeche", d)?.setAttribute("tabindex", d === neu ? "0" : "-1");
    spiele($("video", alt), false); alt.classList.remove("spielt");
    if (neu.classList.contains("hat-film")) spiele($("video", neu), true).then((ok) => ok && neu.classList.add("spielt"));
    i = n;
    jetzt.textContent = String(n + 1).padStart(2, "0");
    dockSetzen({ text: neu.dataset.text, href: neu.dataset.href, bild: neu.dataset.bild });
  };
  const blaettern = (d) => { const t = performance.now(); if (t < sperre) return; sperre = t + 900; zeige(i + d, d); };

  buehne.addEventListener("wheel", (e) => { if (Math.abs(e.deltaY) + Math.abs(e.deltaX) < 12) return; e.preventDefault(); blaettern((e.deltaY || e.deltaX) > 0 ? 1 : -1); }, { passive: false });
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
    } else {
      spiele($("video", d), false); d.classList.remove("spielt");
      const n = $$("a.werk").length;
      dockSetzen({ text: n ? `${n} ${n === 1 ? "Werk" : "Werke"} · nach oben` : dockStart.text, href: n ? "#inhalt" : null, bild: null });
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
