// PHORMA I – Deutsch und Englisch (21. Oktober 2026, Wunsch: «auch alle downloadbaren Apps re-designen, auch doppelsprachig deutsch/englisch»).
// Dasselbe Muster wie in OMNA COLOR, ORNA und ORMA: ein Skript vor den Modulen, ohne Modul. Die Seite steht auf Deutsch; Stellen mit
// data-t="schlüssel" bekommen auf Englisch den Eintrag aus EN (innerHTML), data-t-attr="attr=schlüssel;…" setzt Attribute, data-t-href="de|en"
// die Adresse eines Links; app.js und pwa.js fragen sprache.t(deutscher Satz) – der Schlüssel ist dort der deutsche Text. Die Wahl: ?sprache=
// in der Adresse (Bühne und Links des Neubaus), sonst localStorage «ornament.sprache» (gilt für alle Apps der Website), sonst das Gerät.
// Beim Wechsel ein Ereignis «sprache» auf document; app.js schreibt Phasen, Kette, Zähler und Meldungen neu.
(() => {
  const DE = { _titel: "PHORMA I – Ornament Cloud · Alpha" };
  const EN = {
    _titel: "PHORMA I – Ornament Cloud · Alpha",
    "kopf.sprache": "Language", "kopf.ueber": "About the app",
    lead: "A photo falls apart into lines, then into shapes, then into colours – and comes back together at the end. Or as a transformation: sparks, a glass body, shards, echo and mountains, singly or combined. Or as a flight over the shapes of the photo. As a video for social media.",
    "buehne.aria": "Preview", "vorschau.aria": "Preview of the video: the photo in lines, shapes and colours",
    "leer.gross": "No signal", "leer.text": "Load a photo.",
    "zeit.aria": "Time in the film", "phasen.aria": "Jump to a phase", dauer: "Portrait 4 : 5, or 9 : 16",
    "schritt.foto": "Photo", "ablage.titel": "Choose a photo", "ablage.text": "or drag it here. It is broken down into rows, edges and triangles – on your device.", "datei.aria": "Choose a photo",
    testbild: "Try it with the sample picture", "tafel.aria": "Format, fragments and ground",
    format: "Format", "format.45": "4 : 5 portrait", "format.916": "9 : 16", fragmente: "Fragments", grob: "coarse", mittel: "medium", fein: "fine", grund: "Ground", schwarz: "Black", weiss: "White",
    "schritt.ablauf": "Sequence", "ablauf.text": "All of them begin in the dark and end with your photo. Transformation and relief flight are spatial (WebGL); their dot glows in the signet.", "ablaeufe.aria": "Sequence",
    "ablauf.fragmente": "Fragments", "ablauf.fragmente.text": "Lines, shapes, colours – the photo is assembled piece by piece",
    "ablauf.verwandlung": "Transformation", "ablauf.verwandlung.text": "Sparks condense into a glass body, it shatters, the shards draw trails through a tunnel, mountains rise from them – and they lie down flat into the photo",
    "ablauf.flug": "Relief flight", "ablauf.flug.text": "Glowing contour lines in the empty picture, then the mountains – a camera flight with zoom and turns over the shapes of your photo until it lies flat",
    "effekte.hinweis": "The effects of the transformation – singly or combined as you like:", "effekte.aria": "Effects of the transformation",
    "effekt.strom": "Stream", "effekt.strom.title": "Shining particles light up and move through the picture in bands",
    "effekt.koerper": "Body", "effekt.koerper.title": "Crystals merge into a glass body through which the photo shines",
    "effekt.scherben": "Shards", "effekt.scherben.title": "A ball of shards shatters, the shards assemble the photo",
    "effekt.echo": "Echo", "effekt.echo.title": "The edges of the photo draw trails into a tunnel as in TouchDesigner",
    "effekt.relief": "Relief", "effekt.relief.title": "The photo as mountains in raking light, with glowing contour lines",
    "schritt.gestaltung": "Design", "gestaltung.text": "The caption shows phase, counter and timecode as in an imaging tool; your title stands top left.",
    titel: "Title", tempo: "Pace", ruhig: "calm", normal: "normal", schnell: "fast", beschriftung: "Caption", signet: "Signet at the end",
    "schritt.video": "Video", "video.text": "The video is computed frame by frame at full size; the spatial sequences take a little longer for that.",
    "video.knopf": "Create video", png: "Still image (PNG)", "ergebnis.titel": "Your video", laden: "Download",
    "install.knopf": "Install PHORMA I as an app",
    "hinweis.1": "Everything stays in your browser: the photo is not uploaded, the video is made on your device.",
    "hinweis.2": "Format: portrait 4 : 5 (1080 × 1350, for the feed), or 9 : 16 (1080 × 1920, for reels and stories); the photo is cropped centrally if needed.",
    "hinweis.3": "The still image takes the position of the timeline, at full size; without a choice the finished coloured mosaic (otherwise the middle of the second phase).",
    "hinweis.4": "Video: MP4 (H.264), 30 frames per second, without sound.",
    "fuss.fragen": "Questions and comments about the website: <a href=\"mailto:hansnoed@gmail.com\">hansnoed@gmail.com</a>", "fuss.impressum": "Imprint",
    // app.js
    "Das ist kein Bild. Bitte ein Foto (JPG, PNG, HEIC je nach Browser) verwenden.": "That is not an image. Please use a photo (JPG, PNG, HEIC depending on the browser).",
    "Foto wird gelesen …": "Reading the photo …", "Dieses Foto kann der Browser nicht öffnen. Versuche es als JPG oder PNG.": "The browser cannot open this photo. Try it as JPG or PNG.",
    "Anderes Foto wählen": "Choose another photo", "Das Foto wird zerlegt …": "Breaking the photo down …", "Das Foto liess sich nicht zerlegen:": "The photo could not be broken down:",
    Zeilen: "rows", Kanten: "edges", Dreiecke: "triangles", "Bereit. Die Vorschau läuft; «Video erstellen» rechnet das MP4.": "Ready. The preview is running; «Create video» computes the MP4.",
    "Verwandlung und Relief-Flug brauchen WebGL 2; hier blendet an ihrer Stelle das Foto auf": "Transformation and relief flight need WebGL 2; here the photo fades in instead",
    "Bilder/s": "fps", Anhalten: "Pause", Abspielen: "Play", "Video wird gerechnet …": "Computing the video …",
    "Das Video liess sich nicht erstellen:": "The video could not be created:", "der Encoder hat keine Beschreibung geliefert": "the encoder delivered no description",
    "dieser Browser kann keine Videos erzeugen (weder WebCodecs noch MediaRecorder)": "this browser cannot produce videos (neither WebCodecs nor MediaRecorder)",
    aufnahme: (s) => `The video is being recorded in real time (${s} s). Keep this page visible.`,
    "gerechnet in": "computed in", "Fertig. Prüfe das Video und lade es herunter.": "Done. Check the video and download it.",
    // Phasen und Effekte (ablauf.js)
    Linien: "Lines", Formen: "Shapes", Farben: "Colours", Bild: "Picture", Funken: "Sparks", Strom: "Stream", Verdichten: "Condensing", Körper: "Body", Bruch: "Break", Montage: "Montage",
    Sammeln: "Gathering", Echo: "Echo", Höhenlinien: "Contour lines", Gebirge: "Mountains", Relief: "Relief", "Relief-Flug": "Relief flight", Höhenkurven: "Contour curves", Flug: "Flight", Fragmente: "Fragments", Scherben: "Shards", Verwandlung: "Transformation",
    // pwa.js
    "Im Browser dieser App lässt sich PHORMA I nicht installieren. Die Seite öffnet sich dafür in Chrome; dort noch einmal auf «PHORMA I als App installieren» tippen.": "PHORMA I cannot be installed from this app's browser. The page opens in Chrome for that; tap «Install PHORMA I as an app» there once more.",
    "Im Browser dieser App lässt sich PHORMA I nicht installieren. Über «···» oder das Menü «In Safari öffnen» wählen, dann dort «Teilen» und «Zum Home-Bildschirm».": "PHORMA I cannot be installed from this app's browser. Choose «···» or the menu «Open in Safari», then «Share» and «Add to Home Screen» there.",
    "Auf «Teilen» tippen, dann «Zum Home-Bildschirm» wählen.": "Tap «Share», then choose «Add to Home Screen».",
    "Im Browsermenü (⋮) «App installieren» oder «Zum Startbildschirm hinzufügen» wählen.": "In the browser menu (⋮) choose «Install app» or «Add to Home screen».",
    "Im Browsermenü (⋮) «PHORMA I installieren» wählen oder in der Adresszeile auf das Installationssymbol klicken. Im Inkognito-Fenster geht es nicht.": "In the browser menu (⋮) choose «Install PHORMA I» or click the install icon in the address bar. It does not work in an incognito window.",
    "Im Menü «Ablage» «Zum Dock hinzufügen» wählen.": "In the «File» menu choose «Add to Dock».",
    "Dieser Browser kann PHORMA I nicht installieren. Auf dem Smartphone geht es direkt, am Computer mit Chrome oder Edge.": "This browser cannot install PHORMA I. On a smartphone it works directly, on a computer with Chrome or Edge.",
    "In Chrome öffnen": "Open in Chrome", " Danach steht PHORMA I als eigenes Symbol auf dem Bildschirm und läuft auch ohne Netz; dein Foto bleibt auf dem Gerät.": " After that PHORMA I has its own icon on the screen and runs without a network too; your photo stays on the device.",
  };
  DE.aufnahme = (s) => `Video wird in Echtzeit aufgenommen (${s} s). Lass diese Seite sichtbar.`;
  const KEY = "ornament.sprache";
  // zuerst die Adresse (?sprache=de|en), dann die gemerkte Wahl, sonst das Gerät
  const erkannt = () => {
    const q = new URLSearchParams(location.search).get("sprache");
    if (q === "de" || q === "en") { try { localStorage.setItem(KEY, q); } catch { /* ohne Speicher */ } return q; }
    try { const s = localStorage.getItem(KEY); if (s === "de" || s === "en") return s; } catch { /* ohne Speicher */ }
    return /^en/i.test(navigator.language || "") ? "en" : "de";
  };
  let sprache = erkannt();
  const originale = new WeakMap();
  function anwenden() {
    const en = sprache === "en";
    document.documentElement.lang = en ? "en" : "de";
    document.title = en ? EN._titel : DE._titel;
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
