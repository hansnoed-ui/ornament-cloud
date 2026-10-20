// OMNA COLOR – Deutsch und Englisch (20. Oktober 2026, Wunsch: «auch alle downloadbaren Apps re-designen, auch doppelsprachig deutsch/englisch»).
// Dasselbe Muster in allen Apps: ein Skript vor dem eigenen, ohne Modul, damit es überall gilt. Die Seite steht auf Deutsch; Stellen mit data-t="schlüssel"
// bekommen auf Englisch den Eintrag aus EN (innerHTML, die Texte sind unsere), data-t-attr="attr=schlüssel;…" setzt Attribute, data-t-href="de|en" die
// Adresse eines Links. Für Texte aus Skripten: sprache.t(schlüssel, …) aus DE oder EN. Die Wahl: gemerkt in localStorage («ornament.sprache», gilt für
// alle Apps der Website), sonst die Sprache des Geräts (Englisch → Englisch, alles andere → Deutsch). Der Schalter: .sprache [data-sprache]. Beim
// Wechsel ein Ereignis «sprache» auf document, damit die App Erzeugtes neu schreibt. Die Übungen auf Englisch liegen in ex.en.js.
(() => {
  const DE = {
    _titel: "OMNA COLOR – zwei Farbräder, 180 Gestaltungsübungen – Ornament Cloud",
    min: "Min.", material: "Material: ", schluss: "Zum Schluss", uebung: (id, thema) => `Übung ${id} · Thema ${thema}`,
    "thema.Farbe": "Farbe", "thema.Linie": "Linie", "thema.Form": "Form", "thema.Raum & Material": "Raum & Material", "thema.Zeit & Körper": "Zeit & Körper", "thema.Zufall": "Zufall", "thema.Symbol & Würdigung": "Symbol & Würdigung",
    "install.inAppAndroid": "Im Browser dieser App lässt sich OMNA COLOR nicht installieren. Die Seite öffnet sich dafür in Chrome; dort noch einmal auf «OMNA COLOR als App installieren» tippen.",
    "install.inApp": "Im Browser dieser App lässt sich OMNA COLOR nicht installieren. Über «···» oder das Menü «In Safari öffnen» wählen, dann dort «Teilen» und «Zum Home-Bildschirm».",
    "install.ios": "Auf «Teilen» tippen, dann «Zum Home-Bildschirm» wählen.",
    "install.android": "Im Browsermenü (⋮) «App installieren» oder «Zum Startbildschirm hinzufügen» wählen.",
    "install.chrome": "Im Browsermenü (⋮) «OMNA COLOR installieren» wählen oder in der Adresszeile auf das Installationssymbol klicken. Im Inkognito-Fenster geht es nicht.",
    "install.safari": "Im Menü «Ablage» «Zum Dock hinzufügen» wählen.",
    "install.sonst": "Dieser Browser kann OMNA COLOR nicht installieren. Auf dem Smartphone geht es direkt, am Computer mit Chrome oder Edge.",
    "install.chromeOeffnen": "In Chrome öffnen", "install.danach": " Danach steht OMNA COLOR als eigenes Symbol auf dem Bildschirm und läuft auch ohne Netz.",
  };
  const EN = {
    _titel: "OMNA COLOR – two colour wheels, 180 design exercises – Ornament Cloud",
    "kopf.sprache": "Language", "kopf.ueber": "About the app",
    "kopf.text": "Two colour wheels turn against each other. If they show two colours, the exercise links both themes; if they show the same one, it stays with the pure theme. 180 exercises.",
    "rad.aria": "Colour wheel with seven themes, an outer and an inner wheel", "rad.box": "Colour wheel",
    drehen: "Spin", leer: "Tap the wheel or <b>Spin</b>. What comes is an exercise with material, steps and a question at the end.",
    "nutzen.titel": "Using the exercises",
    "nutzen.1": "Choose an exercise and lay out the material named. Follow the steps and look at your result at the end. You need no prior knowledge.",
    "nutzen.2": "The times are rough guides. Drying times are added with wet paint. For exercises with a work of your own you can use a finished drawing, a picture or another suitable piece.",
    "nutzen.3": "The closing questions help you look. Even if you find no clear difference or no new observation, the exercise is complete.",
    "install.knopf": "Install OMNA COLOR as an app",
    "fuss.fragen": "Questions and comments about the website: <a href=\"mailto:hansnoed@gmail.com\">hansnoed@gmail.com</a>", "fuss.impressum": "Imprint",
    min: "min", material: "Material: ", schluss: "At the end", uebung: (id, thema) => `Exercise ${id} · theme ${thema}`,
    "thema.Farbe": "Colour", "thema.Linie": "Line", "thema.Form": "Form", "thema.Raum & Material": "Space & Material", "thema.Zeit & Körper": "Time & Body", "thema.Zufall": "Chance", "thema.Symbol & Würdigung": "Symbol & Appreciation",
    "install.inAppAndroid": "OMNA COLOR cannot be installed from this app's browser. The page opens in Chrome for that; tap «Install OMNA COLOR as an app» there once more.",
    "install.inApp": "OMNA COLOR cannot be installed from this app's browser. Choose «···» or the menu «Open in Safari», then «Share» and «Add to Home Screen» there.",
    "install.ios": "Tap «Share», then choose «Add to Home Screen».",
    "install.android": "In the browser menu (⋮) choose «Install app» or «Add to Home screen».",
    "install.chrome": "In the browser menu (⋮) choose «Install OMNA COLOR» or click the install icon in the address bar. It does not work in an incognito window.",
    "install.safari": "In the «File» menu choose «Add to Dock».",
    "install.sonst": "This browser cannot install OMNA COLOR. On a smartphone it works directly, on a computer with Chrome or Edge.",
    "install.chromeOeffnen": "Open in Chrome", "install.danach": " Afterwards OMNA COLOR has its own icon on the screen and runs without a network too.",
  };
  const KEY = "ornament.sprache";
  const erkannt = () => { try { const s = localStorage.getItem(KEY); if (s === "de" || s === "en") return s; } catch { /* ohne Speicher */ } return /^en/i.test(navigator.language || "") ? "en" : "de"; };
  let sprache = erkannt();
  const originale = new WeakMap();
  function anwenden() {
    const en = sprache === "en";
    document.documentElement.lang = en ? "en" : "de";
    if (DE._titel) document.title = en ? EN._titel : DE._titel;
    for (const el of document.querySelectorAll("[data-t]")) {
      if (!originale.has(el)) originale.set(el, el.innerHTML);
      const k = el.dataset.t;
      el.innerHTML = en && EN[k] != null ? EN[k] : originale.get(el);
    }
    for (const el of document.querySelectorAll("[data-t-attr]")) {
      for (const paar of el.dataset.tAttr.split(";")) {
        const [attr, k] = paar.split("=");
        const alt = `data-de-${attr}`;
        if (!el.hasAttribute(alt)) el.setAttribute(alt, el.getAttribute(attr) ?? "");
        el.setAttribute(attr, en && EN[k] != null ? EN[k] : el.getAttribute(alt));
      }
    }
    for (const a of document.querySelectorAll("[data-t-href]")) { const [de, enHref] = a.dataset.tHref.split("|"); a.setAttribute("href", en ? enHref : de); }
    for (const b of document.querySelectorAll(".sprache [data-sprache]")) { if (b.dataset.sprache === sprache) b.setAttribute("aria-current", "true"); else b.removeAttribute("aria-current"); }
    document.dispatchEvent(new CustomEvent("sprache", { detail: sprache }));
  }
  window.sprache = {
    get: () => sprache,
    en: () => sprache === "en",
    t: (k, ...a) => { const w = (sprache === "en" ? EN : DE)[k] ?? DE[k] ?? k; return typeof w === "function" ? w(...a) : w; },
    setze: (l) => { if (l !== "de" && l !== "en") return; sprache = l; try { localStorage.setItem(KEY, l); } catch { /* ohne Speicher */ } anwenden(); },
  };
  document.addEventListener("click", (e) => { const b = e.target.closest(".sprache [data-sprache]"); if (b) window.sprache.setze(b.dataset.sprache); });
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", anwenden); else anwenden();
})();
