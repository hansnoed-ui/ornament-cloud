
/* Delta: Zufallszettel, dunkle Zeichnungen und Bewegung. Lädt nichts nach, keine Bibliotheken.
   Ohne Skript steht alles still und sichtbar da; bei «weniger Bewegung» gibt es keine Animationen. */
(function () {
  var doc = document.documentElement;
  var ruhig = matchMedia("(prefers-reduced-motion: reduce)").matches;
  var maus = matchMedia("(hover: hover) and (pointer: fine)").matches;
  function alle(sel, wo) { return Array.prototype.slice.call((wo || document).querySelectorAll(sel)); }

  /* ── Zufälliger Zettel ── */
  var daten = JSON.parse(document.getElementById("zettel-daten").textContent);
  var satz = document.querySelector(".zettel-satz"), feld = document.querySelector(".feld");
  var knopf = satz.querySelector(".nochmal"), jetzt = 0;
  function zeige(i) {
    var z = daten[i]; jetzt = i;
    satz.querySelector(".titelzeile .n").textContent = "Zettel " + (z.n < 10 ? "0" : "") + z.n;
    satz.querySelector(".titelzeile .t").textContent = z.t;
    var l = satz.querySelector(".leitsatz");
    l.textContent = z.l;
    if (!ruhig) { l.classList.remove("neu"); void l.offsetWidth; l.classList.add("neu"); }
    satz.querySelector(".lesen").href = "../b/zettel/" + z.s + "/";
    alle("a", feld).forEach(function (a) { a.classList.toggle("an", +a.dataset.n === z.n); });
  }
  function zufall() { var i; do { i = Math.floor(Math.random() * daten.length); } while (i === jetzt && daten.length > 1); zeige(i); }
  knopf.hidden = false; knopf.addEventListener("click", zufall);
  if (maus) alle("a", feld).forEach(function (a) {
    a.addEventListener("mouseenter", function () { zeige(+a.dataset.n - 1); });
    a.addEventListener("focus", function () { zeige(+a.dataset.n - 1); });
  });
  zufall();

  /* ── Zeichnungen hell oder dunkel ── */
  var dunkel = matchMedia("(prefers-color-scheme: dark)");
  function bilder() { alle("img[data-dunkel]").forEach(function (img) {
    if (!img.dataset.hell) img.dataset.hell = img.getAttribute("src");
    img.src = dunkel.matches ? img.dataset.dunkel : img.dataset.hell; }); }
  bilder(); if (dunkel.addEventListener) dunkel.addEventListener("change", bilder);

  var lauf = document.getElementById("s-lauf");
  if (ruhig) return;                                   // ab hier nur Bewegung
  doc.classList.add("bewegt");

  /* ── Wörter einzeln einblenden (Überschriften) ── */
  function woerter(el) {
    var teile = [];
    (function geh(knoten) {
      Array.prototype.slice.call(knoten.childNodes).forEach(function (k) {
        if (k.nodeType === 3) {
          var frag = document.createDocumentFragment();
          k.textContent.split(/(\s+)/).forEach(function (w) {
            if (!w) return;
            if (/^\s+$/.test(w)) { frag.appendChild(document.createTextNode(w)); return; }
            var aussen = document.createElement("span"); aussen.className = "w";
            var innen = document.createElement("span"); innen.textContent = w;
            aussen.appendChild(innen); frag.appendChild(aussen); teile.push(aussen);
          });
          knoten.replaceChild(frag, k);
        } else if (k.nodeType === 1 && !/^(SMALL|SVG)$/i.test(k.nodeName)) geh(k);
      });
    })(el);
    teile.forEach(function (t, i) { t.style.setProperty("--i", i); });
    return teile;
  }
  alle("h1, h2, .satz-gross").forEach(function (h) { woerter(h); h.classList.add("wortweise"); });

  /* ── Was beim Hereinscrollen erscheint ── */
  var auf = alle(".abschnitt-kopf .etikett, .abschnitt-kopf .rechts, .karte, .reihe, .app, .beitrag, .balken, .werke-bild, .mit-text details, .zettel-satz > *, .fuss-raster > *, .leiste, .zahlen > div, .kurzzeile, .aufruf .text, .aufruf .knopfreihe, .split-text .knopf");
  auf.forEach(function (el) { el.classList.add("auf"); });
  alle(".vier, .apps, .zahlen, .fuss-raster").forEach(function (gruppe) {
    alle(":scope > *", gruppe).forEach(function (k, i) { k.style.setProperty("--i", i % 4); });
  });
  alle(".feld a, .feld .zyklus").forEach(function (a, i) { a.style.setProperty("--i", i % 8 + Math.floor(i / 8)); });
  var beobachtet = auf.concat(alle(".wortweise, .feld, .r-bild, .split-bild, .mit-bild, .karte-bild, .wortmarke, .zahlen b"));
  function zaehlen(b) {
    var ziel = +b.dataset.zahl, t0 = null, dauer = 1100;
    function schritt(t) { if (t0 === null) t0 = t; var p = Math.min(1, (t - t0) / dauer); var v = Math.round(ziel * (1 - Math.pow(1 - p, 3)));
      b.textContent = (v < 10 ? "0" : "") + v; if (p < 1) requestAnimationFrame(schritt); }
    requestAnimationFrame(schritt);
  }
  if ("IntersectionObserver" in window) {
    var io = new IntersectionObserver(function (eintraege) {
      eintraege.forEach(function (e) {
        if (!e.isIntersecting) return;
        e.target.classList.add("sicht"); io.unobserve(e.target);
        if (e.target.dataset && e.target.dataset.zahl) zaehlen(e.target);
      });
    }, { rootMargin: "0px 0px -8% 0px", threshold: 0.12 });
    beobachtet.forEach(function (el) { io.observe(el); });
  } else beobachtet.forEach(function (el) { el.classList.add("sicht"); });

  /* ── Grauer Satz wird beim Scrollen Wort für Wort dunkel ── */
  var satzGross = document.querySelector(".satz-gross"), satzWoerter = satzGross ? alle(".w", satzGross) : [];
  var tick = false;
  function faerben() {
    tick = false;
    var r = satzGross.getBoundingClientRect(), h = innerHeight;
    var p = Math.max(0, Math.min(1, (h * 0.85 - r.top) / (h * 0.55)));
    var n = Math.round(p * satzWoerter.length);
    satzWoerter.forEach(function (w, i) { w.classList.toggle("dunkel", i < n); });
  }
  if (satzGross) { addEventListener("scroll", function () { if (!tick) { tick = true; requestAnimationFrame(faerben); } }, { passive: true }); faerben(); }

  /* ── Einstieg: Ladezähler, Signet zeichnet sich, Fadenkreuz mit Koordinaten ── */
  var einstieg = document.querySelector(".einstieg"), bild = document.querySelector(".einstieg-bild");
  var schonGesehen = false;
  try { schonGesehen = sessionStorage.getItem("delta-geladen") === "1"; sessionStorage.setItem("delta-geladen", "1"); } catch (e) {}
  var zahl = document.querySelector(".lade-zahl");
  function start() {
    einstieg.classList.add("bereit");
    setTimeout(function () { if (lauf && lauf.beginElement) { einstieg.classList.add("laeuft"); lauf.beginElement(); } }, 1700);
  }
  if (schonGesehen) { einstieg.classList.add("ohne-lade"); requestAnimationFrame(start); }
  else {
    einstieg.classList.add("laedt");
    var t0 = null;
    requestAnimationFrame(function laden(t) {
      if (t0 === null) t0 = t;
      var p = Math.min(1, (t - t0) / 1200);
      zahl.textContent = Math.round(100 * (1 - Math.pow(1 - p, 2))) + "%";
      if (p < 1) requestAnimationFrame(laden);
      else { einstieg.classList.remove("laedt"); einstieg.classList.add("geladen"); start(); }
    });
  }
  if (maus && bild) {
    var kx = bild.querySelector(".kreuz-x"), ky = bild.querySelector(".kreuz-y"), koord = bild.querySelector(".koord.mitte");
    bild.addEventListener("pointermove", function (e) {
      var r = bild.getBoundingClientRect(), x = Math.round(e.clientX - r.left), y = Math.round(e.clientY - r.top);
      bild.classList.add("zielt");
      kx.style.transform = "translateY(" + y + "px)"; ky.style.transform = "translateX(" + x + "px)";
      koord.style.transform = "translate(" + (x + 12) + "px," + (y + 10) + "px)";
      koord.textContent = "X:" + x + "PX · Y:" + y + "PX";
    });
    bild.addEventListener("pointerleave", function () { bild.classList.remove("zielt"); koord.style.transform = ""; koord.textContent = "X:49 · Y:07"; });
  }

  /* ── Kopf: Linie unter dem Kopf, sobald gescrollt wird ── */
  var kopf = document.querySelector(".kopf");
  addEventListener("scroll", function () { kopf.classList.toggle("gerollt", scrollY > 8); }, { passive: true });
})();
