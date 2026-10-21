// PHORMA II – Deutsch und Englisch (21. Oktober 2026, Wunsch: «auch alle downloadbaren Apps re-designen, auch doppelsprachig deutsch/englisch»).
// Dasselbe Muster wie in PHORMA I (alpha/bildfragmentieren/sprache.js): ein Skript vor den Modulen; data-t="schlüssel" für die Seite, die deutschen
// Sätze als Schlüssel für app.js, die Phasen und Effekte aus ablauf.js über ihren Titel. Die Wahl: ?sprache= in der Adresse (Bühne und Links des
// Neubaus), sonst localStorage «ornament.sprache», sonst das Gerät. Beim Wechsel ein Ereignis «sprache» auf document; app.js schreibt neu.
(() => {
  const DE = { _titel: "PHORMA II – Ornament Cloud · Alpha" };
  const EN = {
    _titel: "PHORMA II – Ornament Cloud · Alpha",
    "kopf.sprache": "Language", "kopf.ueber": "About the app",
    lead: "A slime mould of a hundred thousand agents finds the shapes of your photo, then a plane of light scans its depth – then it blows as a silk cloth and settles flat. Or a glowing line grows from a seed and draws it, or it breaks apart in rhythm into nested rectangles until everything snaps into place. Each effect singly or as a chain. As a video for social media.",
    "buehne.aria": "Preview", "vorschau.aria": "Preview of the video", "laden.text": "Reading the video …",
    "leer.gross": "No signal", "leer.text": "Load a photo.", "zeit.aria": "Time in the film", "phasen.aria": "Jump to a phase", dauer: "Portrait 4 : 5, or 9 : 16",
    "schritt.quelle": "Photo or video", "ablage.titel": "Choose a photo or video", "ablage.text": "or drag it here. It is analysed on your device: edges, tonal range and depth.", "datei.aria": "Choose a photo or video",
    "film.ab": "Video from", "film.hinweis": "All effects show the running video, up to 30 s from here, from the beginning to the end of the film (if the video is shorter, it runs several times in a row). Without sound.",
    testbild: "Try it with the sample picture", "tafel.aria": "Format and depth",
    format: "Format", "format.45": "4 : 5 portrait", "format.916": "9 : 16", tiefe: "Depth", "tiefe.bild": "from the picture", "tiefe.ki": "with AI",
    "ki.hinweis": "The AI (Depth Anything V2) runs on your device; the first time it loads the model (about 25–50 MB) from Hugging Face. Your photo is not uploaded.",
    "schritt.effekte": "Effects", "effekte.text": "One effect alone or several as a chain. All begin in the dark and end with your photo; in a chain each passes into the next, always in this order.", "ablaeufe.aria": "Choose an effect",
    "wahl.drei": "All three as a chain", "wahl.drei.text": "The net finds the shapes, a plane of light scans the depth, the photo blows as a cloth – until it lies flat",
    "wahl.fuenf": "All five as a chain", "wahl.fuenf.text": "A glowing line grows, the net finds the shapes, a plane of light scans the depth, the photo blows as a cloth and finally breaks apart into rectangles",
    "wahl.physarum": "Physarum", "wahl.physarum.text": "Hundreds of thousands of agents stream out of seeds and form a glowing net that finds the shapes of your photo",
    "wahl.tiefe": "Depth", "wahl.tiefe.text": "A plane of light scans the picture from front to back; in raking light it stands as a relief",
    "wahl.tuch": "Cloth", "wahl.tuch.text": "The photo as a silk cloth in the wind – a cloth simulation – that finally settles flat into the picture",
    "wahl.wachstum": "Growth", "wahl.wachstum.text": "A single glowing line grows from a seed, folds and draws your photo – dense in the light, wide in the dark –, takes on its colours and becomes the picture",
    "wahl.montage": "Montage", "wahl.montage.text": "The photo breaks apart in rhythm into nested rectangles – enlarged, shifted, drawn into stripes, with fine edges and number plates –, until everything snaps into place",
    "effekte.hinweis": "Or put together your own chain:", "effekte.aria": "Your own chain",
    "effekt.wachstum": "Growth", "effekt.physarum": "Physarum", "effekt.tiefe": "Depth", "effekt.tuch": "Cloth", "effekt.montage": "Montage",
    "phorma3.hinweis": "Video or music? For that there is <a href=\"../phorma-iii/\">PHORMA III</a>: sound becomes image.",
    "schritt.gestaltung": "Design", "gestaltung.text": "The caption shows phase, counter and timecode as in an imaging tool; your title stands top left.",
    titel: "Title", tempo: "Pace", ruhig: "calm", normal: "normal", schnell: "fast", beschriftung: "Caption", signet: "Signet at the end", unschaerfe: "Motion blur",
    "schritt.video": "Video", "video.text": "The video is computed frame by frame at full size; with motion blur eight samples per frame – that takes a few minutes.",
    "video.knopf": "Create video", png: "Still image (PNG)", "ergebnis.titel": "Your video", laden: "Download",
    "hinweis.1": "Everything stays in your browser: the photo is not uploaded, the video is made on your device. Only «Depth with AI» loads a model from the net once.",
    "hinweis.2": "Without AI the depth is estimated from the picture – from sharpness, position, colour and sky – and laid against the edges of the photo.",
    "hinweis.3": "Format: portrait 4 : 5 (1080 × 1350, for the feed), or 9 : 16 (1080 × 1920, for reels and stories); the photo is cropped centrally if needed.",
    "hinweis.4": "Video: MP4 (H.264), 30 frames per second, without sound. PHORMA II needs WebGL 2.",
    "fuss.fragen": "Questions and comments about the website: <a href=\"mailto:hansnoed@gmail.com\">hansnoed@gmail.com</a>", "fuss.impressum": "Imprint",
    // app.js
    "Das ist weder Foto noch Video. Bitte ein Foto (JPG, PNG, HEIC je nach Browser) oder ein Video (MP4, MOV, WebM) verwenden.": "That is neither a photo nor a video. Please use a photo (JPG, PNG, HEIC depending on the browser) or a video (MP4, MOV, WebM).",
    "Foto wird gelesen …": "Reading the photo …", "Dieses Foto kann der Browser nicht öffnen. Versuche es als JPG oder PNG.": "The browser cannot open this photo. Try it as JPG or PNG.",
    "Anderes Foto wählen": "Choose another photo", "Anderes Foto oder Video wählen": "Choose another photo or video",
    "Video wird geöffnet …": "Opening the video …", "Schritt 1 von 3": "Step 1 of 3", "Schritt 2 von 3": "Step 2 of 3", "Schritt 3 von 3": "Step 3 of 3",
    "Das Video liess sich nicht öffnen:": "The video could not be opened:", "Versuche es als MP4.": "Try it as MP4.",
    "Video wird gelesen …": "Reading the video …", "Schritt 1 von 3 · bis 30 s, Bild für Bild": "Step 1 of 3 · up to 30 s, frame by frame",
    "Die Bilder des Videos liessen sich nicht lesen": "The frames of the video could not be read", "Das Standbild wird analysiert …": "Analysing the still image …",
    "Das Foto wird analysiert …": "Analysing the photo …", "Das Foto liess sich nicht analysieren:": "The photo could not be analysed:",
    Keime: "seeds", "Kanten · Tiefe · Tonumfang": "edges · depth · tonal range",
    "Bereit. Die Vorschau läuft; «Video erstellen» rechnet das MP4.": "Ready. The preview is running; «Create video» computes the MP4.",
    "Bereit. Tiefe von der KI": "Ready. Depth from the AI", "Die KI-Tiefe liess sich nicht laden": "The AI depth could not be loaded", "es bleibt die aus dem Bild geschätzte Tiefe.": "the depth estimated from the picture remains.",
    "Die Grafik dieses Geräts ist ausgestiegen (meist: zu wenig Grafikspeicher). Wähle einen einzelnen Effekt oder lade die Seite neu.": "The graphics of this device have given out (usually: too little graphics memory). Choose a single effect or reload the page.",
    "PHORMA II braucht WebGL 2; hier blendet an seiner Stelle das Foto auf": "PHORMA II needs WebGL 2; here the photo fades in instead",
    "Die Effekte werden vorbereitet …": "Preparing the effects …", und: "and", wird: "is being computed", werden: "are being computed", "berechnet …": "…",
    "Bilder/s": "fps", "Die KI-Tiefe wird vorbereitet …": "Preparing the AI depth …", "Tiefe aus dem Bild geschätzt.": "Depth estimated from the picture.",
    "Auf dem Handy nicht verfügbar": "Not available on the phone", "«Mit KI» gibt es nur am Computer: auf Handys brachte die KI-Tiefe den Browser zum Absturz.": "«With AI» exists only on the computer: on phones the AI depth crashed the browser.",
    "Die KI-Tiefe hat beim letzten Mal den Browser zum Absturz gebracht; sie ist darum ausgeschaltet (Tiefe aus dem Bild).": "The AI depth crashed the browser last time; it is therefore switched off (depth from the picture).",
    Anhalten: "Pause", Abspielen: "Play", "Das Video liess sich nicht erstellen:": "The video could not be created:",
    unschaerfeProben: (p) => `Computing the video, with motion blur (${p} samples per frame) …`, "Video wird gerechnet …": "Computing the video …",
    aufnahme: (s) => `The video is being recorded in real time (${s} s, without motion blur). Keep this page visible.`,
    "gerechnet in": "computed in", "Fertig. Prüfe das Video und lade es herunter.": "Done. Check the video and download it.",
    "Das Tiefenmodell wird geladen …": "Loading the depth model …", "Die KI schätzt die Tiefe …": "The AI is estimating the depth …",
    // Phasen und Effekte (ablauf.js)
    Physarum: "Physarum", Tiefe: "Depth", Tuch: "Cloth", Wachstum: "Growth", Montage: "Montage", Keim: "Seed", Netz: "Net", Bild: "Picture", Scan: "Scan", Farbe: "Colour", Schnitte: "Cuts",
    // Installieren (pwa.js, seit 21. Oktober 2026 als App)
    "install.knopf": "Install PHORMA II as an app",
    "Im Browser dieser App lässt sich PHORMA II nicht installieren. Die Seite öffnet sich dafür in Chrome; dort noch einmal auf «PHORMA II als App installieren» tippen.": "PHORMA II cannot be installed from this app's browser. The page opens in Chrome for that; tap «Install PHORMA II as an app» there once more.",
    "Im Browser dieser App lässt sich PHORMA II nicht installieren. Über «···» oder das Menü «In Safari öffnen» wählen, dann dort «Teilen» und «Zum Home-Bildschirm».": "PHORMA II cannot be installed from this app's browser. Choose «···» or the menu «Open in Safari», then «Share» and «Add to Home Screen» there.",
    "Auf «Teilen» tippen, dann «Zum Home-Bildschirm» wählen.": "Tap «Share», then choose «Add to Home Screen».",
    "Im Browsermenü (⋮) «App installieren» oder «Zum Startbildschirm hinzufügen» wählen.": "In the browser menu (⋮) choose «Install app» or «Add to Home screen».",
    "Im Browsermenü (⋮) «PHORMA II installieren» wählen oder in der Adresszeile auf das Installationssymbol klicken. Im Inkognito-Fenster geht es nicht.": "In the browser menu (⋮) choose «Install PHORMA II» or click the install icon in the address bar. It does not work in an incognito window.",
    "Im Menü «Ablage» «Zum Dock hinzufügen» wählen.": "In the «File» menu choose «Add to Dock».",
    "Dieser Browser kann PHORMA II nicht installieren. Auf dem Smartphone geht es direkt, am Computer mit Chrome oder Edge.": "This browser cannot install PHORMA II. On a smartphone it works directly, on a computer with Chrome or Edge.",
    "In Chrome öffnen": "Open in Chrome", " Danach steht PHORMA II als eigenes Symbol auf dem Bildschirm und läuft auch ohne Netz; Foto und Video bleiben auf dem Gerät.": " After that PHORMA II has its own icon on the screen and runs without a network too; photo and video stay on the device.",
  };
  DE.unschaerfeProben = (p) => `Video wird gerechnet, mit Bewegungsunschärfe (${p} Proben je Bild) …`;
  DE.aufnahme = (s) => `Video wird in Echtzeit aufgenommen (${s} s, ohne Bewegungsunschärfe). Lass diese Seite sichtbar.`;
  const KEY = "ornament.sprache";
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
