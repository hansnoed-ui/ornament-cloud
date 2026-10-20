// ORNA – Deutsch und Englisch (20. Oktober 2026, Wunsch: «auch alle downloadbaren Apps re-designen, auch doppelsprachig deutsch/englisch»).
// Dasselbe Muster wie in OMNA COLOR (alpha/omna-color/sprache.js): ein Skript vor den eigenen, ohne Modul, für Rad (index.html) und Feld (feld/).
// Die Seiten stehen auf Deutsch; Stellen mit data-t="schlüssel" bekommen auf Englisch den Eintrag aus EN (innerHTML), data-t-attr="attr=schlüssel;…"
// setzt Attribute, data-t-href="de|en" die Adresse eines Links; Skripte fragen sprache.t(schlüssel, …). Die Wahl: localStorage «ornament.sprache»
// (gilt für alle Apps der Website), sonst die Sprache des Geräts. Beim Wechsel ein Ereignis «sprache» auf document; wheel.js schreibt das Ergebnis
// und die Legende neu, feld/feld.js die Fragen. Die Konstellationen auf Englisch: js/data/constellations.en.js (tools/build-konstellationen-en.mjs).
(() => {
  const DE = {
    _titel: "Nebeneinander, Nacheinander – Ornament Cloud", _titelFeld: "Das Feld – Nebeneinander, Nacheinander – Ornament Cloud",
    namenZeigen: "Namen zeigen", namenAus: "Namen ausblenden", aussenring: "Aussenring", innenring: "Innenring",
    linkKopieren: "Link kopieren", linkKopiert: "Link kopiert", adresseMarkiert: "Adresse zum Kopieren markiert",
    konstellation: (a, t) => `Konstellation: ${a} und ${t}.`, feldFrei: (namen) => `Keine Konstellation mit ${namen}.`,
    "install.inAppAndroid": "Im Browser dieser App lässt sich ORNA nicht installieren. Die Seite öffnet sich dafür in Chrome; dort noch einmal auf «ORNA als App installieren» tippen.",
    "install.inApp": "Im Browser dieser App lässt sich ORNA nicht installieren. Über «···» oder das Menü «In Safari öffnen» wählen, dann dort «Teilen» und «Zum Home-Bildschirm».",
    "install.ios": "Auf «Teilen» tippen, dann «Zum Home-Bildschirm» wählen.",
    "install.android": "Im Browsermenü (⋮) «App installieren» oder «Zum Startbildschirm hinzufügen» wählen.",
    "install.chrome": "Im Browsermenü (⋮) «ORNA installieren» wählen oder in der Adresszeile auf das Installationssymbol klicken. Im Inkognito-Fenster geht es nicht.",
    "install.safari": "Im Menü «Ablage» «Zum Dock hinzufügen» wählen.",
    "install.sonst": "Dieser Browser kann ORNA nicht installieren. Auf dem Smartphone geht es direkt, am Computer mit Chrome oder Edge.",
    "install.chromeOeffnen": "In Chrome öffnen", "install.danach": " Ist ORNA schon installiert, steht sie als eigenes Symbol auf dem Bildschirm und läuft auch ohne Netz.",
  };
  const EN = {
    _titel: "Side by Side, One after Another – Ornament Cloud", _titelFeld: "The Field – Side by Side, One after Another – Ornament Cloud",
    "kopf.sprache": "Language", "kopf.ueber": "About the app",
    lead: "An interactive experimental arrangement.",
    "install.knopf": "Install ORNA as an app",
    "install.alt": "Installation not working? In the browser menu (⋮) choose <span>«Add to Home screen»</span> and then <span>«Create shortcut»</span>.",
    "rad.stage": "The wheel", "rad.aria": "Turn the wheel. Drag, flick or press Enter.", drehen: "Spin",
    "hinweis.aria": "How to turn: drag or swipe, tap, Enter", "hinweis.ziehen": "drag or swipe", "hinweis.tippen": "tap", "hinweis.taste": "Enter key",
    namenZeigen: "Show names", namenAus: "Hide names", aussenring: "Outer ring", innenring: "Inner ring", und: " and ",
    nochmal: "spin again", linkKopieren: "Copy link", linkKopiert: "Link copied", adresseMarkiert: "Address selected for copying", adresse: "Address of this constellation",
    konstellation: (a, t) => `Constellation: ${a} and ${t}.`,
    "ticker.aria": "All names on the wheel",
    intro: "«Side by Side, One after Another» is an interactive experimental arrangement on the spatialisation and temporalisation of perception. On two counter-rotating wheels, artists and theorists meet in randomly selected constellations. Space holds possibilities side by side, while the turn puts them into a temporal sequence and actualises one encounter at a time. Each encounter yields a short text and an open question, but no final synthesis. The wheel does not produce answers – it produces constellations.",
    feldLink: "The field: all constellations side by side <span aria-hidden=\"true\">→</span>", zurueckApps: "← To the apps",
    "fuss.fragen": "Questions and comments about the website: <a href=\"mailto:hansnoed@gmail.com\">hansnoed@gmail.com</a>", "fuss.impressum": "Imprint",
    "feld.titel": "The Field",
    "feld.intro": "Four hundred pairings are arithmetically possible, 326 are written. The field shows both states at once: the curated constellations and the 74 places where none stands yet. The gaps are not forbidden. They record what the work considers connectable at this point in time, and they can fill as soon as another question opens them. The wheel brings forth one encounter after another. Here everything lies side by side.",
    "feld.legende": "<span class=\"feld-legende-voll\" aria-hidden=\"true\"></span> constellation <span class=\"feld-legende-leer\" aria-hidden=\"true\"></span> no constellation · rows: artists · columns: theorists · both in the order of the rings, not alphabetical",
    "feld.aria": "All constellations", "feld.caption": "Rows: artists, columns: theorists. Occupied fields lead to the constellation.", "feld.keine": "no constellation", "feld.sprung": "Artists",
    feldFrei: (namen) => `No constellation with ${namen}.`, zurueckRad: "← To the wheel",
    "install.inAppAndroid": "ORNA cannot be installed from this app's browser. The page opens in Chrome for that; tap «Install ORNA as an app» there once more.",
    "install.inApp": "ORNA cannot be installed from this app's browser. Choose «···» or the menu «Open in Safari», then «Share» and «Add to Home Screen» there.",
    "install.ios": "Tap «Share», then choose «Add to Home Screen».",
    "install.android": "In the browser menu (⋮) choose «Install app» or «Add to Home screen».",
    "install.chrome": "In the browser menu (⋮) choose «Install ORNA» or click the install icon in the address bar. It does not work in an incognito window.",
    "install.safari": "In the «File» menu choose «Add to Dock».",
    "install.sonst": "This browser cannot install ORNA. On a smartphone it works directly, on a computer with Chrome or Edge.",
    "install.chromeOeffnen": "Open in Chrome", "install.danach": " If ORNA is already installed, it has its own icon on the screen and runs without a network too.",
  };
  const KEY = "ornament.sprache";
  const erkannt = () => { try { const s = localStorage.getItem(KEY); if (s === "de" || s === "en") return s; } catch { /* ohne Speicher */ } return /^en/i.test(navigator.language || "") ? "en" : "de"; };
  let sprache = erkannt();
  const originale = new WeakMap();
  function anwenden() {
    const en = sprache === "en";
    document.documentElement.lang = en ? "en" : "de";
    const titel = document.documentElement.dataset.titel || "_titel";
    if (DE[titel]) document.title = en ? EN[titel] : DE[titel];
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
