// PHORMA III – Deutsch und Englisch (21. Oktober 2026, Wunsch: «auch alle downloadbaren Apps re-designen, auch doppelsprachig deutsch/englisch»).
// Dasselbe Muster wie in PHORMA I und II: ein Skript vor den Modulen; data-t="schlüssel" für die Seite, die deutschen Sätze als Schlüssel für app.js
// und pwa.js, die Phasen und Effekte aus ablauf.js über ihren Titel. Die Wahl: ?sprache= in der Adresse (Bühne und Links des Neubaus), sonst
// localStorage «ornament.sprache», sonst das Gerät. Beim Wechsel ein Ereignis «sprache» auf document; app.js schreibt neu.
(() => {
  const DE = { _titel: "PHORMA III – Ornament Cloud · Alpha" };
  const EN = {
    _titel: "PHORMA III – Ornament Cloud · Alpha",
    "kopf.sprache": "Language", "kopf.ueber": "About the app",
    "buehne.aria": "Preview", "vorschau.aria": "Preview of the video", "leer.gross": "No signal", "leer.text": "Choose a piece of music, a voice or a video.",
    "zeit.aria": "Time in the film", "phasen.aria": "Jump to a phase", dauer: "Portrait 4 : 5, or 9 : 16 or landscape 16 : 9",
    "schritt.quelle": "Sound only – or a video", "quelle.aria": "Source", "quelle.ton": "Sound only", "quelle.video": "Video", "videodatei": "Choose a video file",
    "video.ablauf": "Scratch → video with skips → fiddling",
    "video.hinweis": "With the effect «Video» the sequence runs in picture and sound at once: first the beginning is rubbed back and forth like a record (the picture smears with the tempo and flashes with the fader), then the video runs clear with two or three skips – at each the picture breaks open: datamosh, macroblocks, slit-scan or pixel sorting, different with each throw –, at the end the fiddling – the picture jumps with every slice of the sound, a swirl lays it in tiles, bitcrush pixelates it, grains become patches from other times. With music as with a voice.",
    "video.ausschnitt": "Section of the video", "video.ausschnitt.hinweis": "With your own audio file you choose here which part of the video runs: drag or tap in the film strip, or the slider «from». The length follows the sound (if the sound comes from the video, «Cut a section» below cuts picture and sound together).",
    ab: "from", "video.standbild": "A still from the video is the beginning and the end, its sound becomes the soundtrack (unless you choose another audio file below). In the weave each cut takes the lines of a new picture from the video; with the effect «Video» the video itself is the picture.",
    "ton.allein": "The music or a voice alone makes the picture. Choose an audio file below under «Sound».",
    "tafel.aria": "Format", format: "Format", "format.45": "4 : 5 portrait", "format.916": "9 : 16", "format.169": "16 : 9 landscape", aufloesung: "Resolution", "aufloesung.1": "single", "aufloesung.2": "double (4K)",
    "schritt.effekt": "Effect", "ablaeufe.aria": "Choose an effect",
    "wahl.gewebe": "Weave", "wahl.gewebe.text": "From rings and lines (with a video: from its outlines) grow surfaces of fine lines like crumpled silk, black on paper; every strong beat cuts to a new picture",
    "wahl.irrfahrt": "Odyssey", "wahl.irrfahrt.text": "A glowing thread wanders through a cube of light and swells into smoke with the music; the bass bursts it, the highs throw sparks, every beat tosses the cube around",
    "wahl.lichtwuerfel": "Cube of light", "wahl.lichtwuerfel.text": "Like the odyssey, but calm: the cube stays in the middle and turns evenly, the thread wanders inside, finer and less blended",
    "wahl.traube": "Grape", "wahl.traube.text": "Shiny red pearls in a tangle of fine threads, with depth of field and smoke; the beat makes them swell, the bass glow, every strong onset cuts to a new shot – at the end they thread themselves onto the loop of the logo",
    "wahl.video": "Video", "wahl.video.text": "The video itself is the picture, frame-accurate and in sync with the sound – choose it above under «Video»; scratching, cracks and fiddling in the picture follow",
    "schritt.ton": "Sound", "ton.text": "An audio file (music or a voice; MP3, WAV, M4A – a short sample too) moves the weave and plays along in the preview and in the video; the film then lasts as long as the sound. Without the tick at «Sound on» or without a file it stays silent, and the weave follows a calm rhythm of its own.",
    tondatei: "Choose an audio file", "ton.weg": "Remove sound", "ton.an": "Sound on", "ausschnitt.titel": "Cut a section",
    "ausschnitt.hinweis": "To cut, drag or tap in the waveform, or the sliders «from» and «length». Without a choice the whole file counts (for a voice with sequence about 10 seconds from the first word).",
    laenge: "Length", Anhören: "Listen", Stopp: "Stop", Automatisch: "Automatic", "tonart.aria": "Kind of audio file", Musik: "Music", Stimme: "Voice",
    Verfrickeln: "Fiddle", "frickeln.hinweis": "Fiddling cuts the music at its onsets and builds a new piece from it like a modular synthesizer: snippets on a grid, backwards, higher and lower, chopped, swirls, filter, echo and reverb. Every throw sounds different and stays repeatable.",
    saeubern: "Clean and clarify", "stimm.ablauf": "Scratch → voice → fiddling", "stimm.dnb": "with drum and bass",
    "stimme.hinweis": "For voice recordings: cleaning removes hiss, hum and rumble, clarifies the voice (presence, air, fewer sibilants), evens it out and gives it a light room. The sequence makes it a piece that is intelligible and deconstructed at once: first 3–4 seconds of scratching on the first word, then about 10 seconds of the clear voice with two or three skips, at the end 3–4 seconds of fiddling; towards the fiddling, if you wish, underlaid with a little drum and bass.",
    wuerfeln: "Throw again",
    "schritt.gestaltung": "Design", "gestaltung.text": "The caption shows phase, counter and timecode as in an imaging tool; your title stands top left.",
    titel: "Title", tempo: "Pace", ruhig: "calm", normal: "normal", schnell: "fast", beschriftung: "Caption", signet: "Logo at the end", unschaerfe: "Motion blur",
    "schritt.video": "Video", "video.text": "The video is computed frame by frame at full size; with motion blur eight samples per frame – that takes a few minutes, at double resolution about four times as long.",
    "video.knopf": "Create video", png: "Still image (PNG)", "ergebnis.titel": "Your video", laden: "Download",
    "install.knopf": "Install PHORMA III as an app",
    "hinweis.1": "Everything stays in your browser: video and music are not uploaded, the video is made on your device.",
    "hinweis.2": "Format: portrait 4 : 5 (1080 × 1350, for the feed), or 9 : 16 (1080 × 1920, for reels and stories) or landscape 16 : 9 (1920 × 1080, for screens and websites); a video is cropped centrally if needed. On the computer, if you wish, at double resolution (2160 × 2700, 2160 × 3840 or 3840 × 2160): computed anew, not upscaled.",
    "hinweis.3": "Video: MP4 (H.264), 30 frames per second, with sound (AAC) if an audio file is chosen. PHORMA III needs WebGL 2.",
    "hinweis.4a": "For photos there is ", "hinweis.4b": ": a slime mould finds the shapes, the photo becomes space and blows as a silk cloth.",   // der Link bleibt in der Seite (kein Pfad hier: ein Test verlangt, dass kein Skript aus PHORMA II lädt)
    "fuss.fragen": "Questions and comments about the website: <a href=\"mailto:hansnoed@gmail.com\">hansnoed@gmail.com</a>", "fuss.impressum": "Imprint",
    // app.js
    "Das Video wird gelesen …": "Reading the video …", "Dieses Video kann der Browser nicht öffnen": "The browser cannot open this video", "Versuche MP4 (H.264) oder WebM.": "Try MP4 (H.264) or WebM.",
    bilderAusVideo: (n) => `${n} frames are being read from the video …`, "Die Bilder des Videos werden gelesen …": "Reading the frames of the video …",
    "Das Bild wird analysiert …": "Analysing the picture …", "Das Bild liess sich nicht analysieren:": "The picture could not be analysed:", "Helligkeit · Tonumfang": "brightness · tonal range",
    "Bereit. Die Vorschau läuft; «Video erstellen» rechnet das MP4.": "Ready. The preview is running; «Create video» computes the MP4.",
    "Die Bilder des Videos liessen sich nicht lesen": "The frames of the video could not be read", "Lade das Video noch einmal oder wähle ein anderes.": "Load the video again or choose another one.",
    "Die Grafik dieses Geräts ist ausgestiegen (meist: zu wenig Grafikspeicher). Lade die Seite neu oder versuche es im Format 4 : 5.": "The graphics of this device have given out (usually: too little graphics memory). Reload the page or try the format 4 : 5.",
    "PHORMA III braucht WebGL 2; hier blendet an seiner Stelle das Bild auf": "PHORMA III needs WebGL 2; here the picture fades in instead",
    "Das Gewebe wird vorbereitet …": "Preparing the weave …", "Bilder/s": "fps",
    "Wähle oben unter «Video» eine Videodatei: mit dem Effekt «Video» ist sie das Bild.": "Choose a video file above under «Video»: with the effect «Video» it is the picture.",
    "Der Ton wird gelesen …": "Reading the sound …", "Musik geladen: noch kein Bild gewählt – das Gewebe entsteht aus der Musik allein («Nur Ton»). Ein Video lässt sich oben jederzeit wählen.": "Music loaded: no picture chosen yet – the weave arises from the music alone («Sound only»). A video can be chosen above at any time.",
    "Diese Audiodatei kann der Browser nicht lesen": "The browser cannot read this audio file",
    "Die Stimme wird gesäubert …": "Cleaning the voice …", "Scratch, Stimme und Gefrickel werden gebaut …": "Building scratch, voice and fiddling …", "Der Ton wird verfrickelt …": "Fiddling the sound …",
    Ausschnitt: "Section", gesaeubert: (a, b) => `cleaned (noise ${a} → ${b} dB)`, ablaufTeil: (wer, n, dnb, wurf) => `Scratch, ${wer} with ${n} skips, ${dnb ? "drum and bass, " : ""}fiddling, throw ${wurf}`,
    verfrickelt: (wurf) => `fiddled, throw ${wurf}`, frickelMehr: (bpm, takte, scheiben) => ` · ${bpm} BPM, ${takte} bars from ${scheiben} snippets`, dieErsten: (s) => `the first ${s} s`,
    Einsätze: "onsets", Schnitte: "cuts", "Ton bereit: das Gewebe folgt ihm.": "Sound ready: the weave follows it.",
    Anhalten: "Pause", Abspielen: "Play", "Der Browser spielt den Ton erst nach einem Tippen: tippe auf «Anhalten» und wieder auf «Abspielen».": "The browser plays the sound only after a tap: tap «Pause» and then «Play» again.",
    "Das Video liess sich nicht erstellen:": "The video could not be created:", "Der Ton wird kodiert …": "Encoding the sound …", "Dieser Browser kann den Ton nicht kodieren; das Video ist ohne Ton.": "This browser cannot encode the sound; the video is without sound.",
    unschaerfeProben: (p) => `Computing the video, with motion blur (${p} samples per frame) …`, "Video wird gerechnet …": "Computing the video …",
    "dieser Browser kann keine Videos erzeugen (weder WebCodecs noch MediaRecorder)": "this browser cannot produce videos (neither WebCodecs nor MediaRecorder)",
    aufnahme: (s) => `The video is being recorded in real time (${s} s, without motion blur). Keep this page visible.`,
    "gerechnet in": "computed in", "Fertig. Prüfe das Video und lade es herunter.": "Done. Check the video and download it.",
    // Phasen und Effekte (ablauf.js)
    Gewebe: "Weave", Irrfahrt: "Odyssey", Lichtwürfel: "Cube of light", Traube: "Grape", Video: "Video", Bild: "Picture", Ende: "End", Logo: "Logo", Stille: "Silence", Würfel: "Cube", Zeichen: "Signs",
    // pwa.js
    "Im Browser dieser App lässt sich PHORMA III nicht installieren. Die Seite öffnet sich dafür in Chrome; dort noch einmal auf «PHORMA III als App installieren» tippen.": "PHORMA III cannot be installed from this app's browser. The page opens in Chrome for that; tap «Install PHORMA III as an app» there once more.",
    "Im Browser dieser App lässt sich PHORMA III nicht installieren. Über «···» oder das Menü «In Safari öffnen» wählen, dann dort «Teilen» und «Zum Home-Bildschirm».": "PHORMA III cannot be installed from this app's browser. Choose «···» or the menu «Open in Safari», then «Share» and «Add to Home Screen» there.",
    "Auf «Teilen» tippen, dann «Zum Home-Bildschirm» wählen.": "Tap «Share», then choose «Add to Home Screen».",
    "Im Browsermenü (⋮) «App installieren» oder «Zum Startbildschirm hinzufügen» wählen.": "In the browser menu (⋮) choose «Install app» or «Add to Home screen».",
    "Im Browsermenü (⋮) «PHORMA III installieren» wählen oder in der Adresszeile auf das Installationssymbol klicken. Im Inkognito-Fenster geht es nicht.": "In the browser menu (⋮) choose «Install PHORMA III» or click the install icon in the address bar. It does not work in an incognito window.",
    "Im Menü «Ablage» «Zum Dock hinzufügen» wählen.": "In the «File» menu choose «Add to Dock».",
    "Dieser Browser kann PHORMA III nicht installieren. Auf dem Smartphone geht es direkt, am Computer mit Chrome oder Edge.": "This browser cannot install PHORMA III. On a smartphone it works directly, on a computer with Chrome or Edge.",
    "In Chrome öffnen": "Open in Chrome", " Danach steht PHORMA III als eigenes Symbol auf dem Bildschirm und läuft auch ohne Netz; Video und Musik bleiben auf dem Gerät.": " After that PHORMA III has its own icon on the screen and runs without a network too; video and music stay on the device.",
  };
  DE.bilderAusVideo = (n) => `${n} Bilder werden aus dem Video gelesen …`;
  DE.gesaeubert = (a, b) => `gesäubert (Rauschen ${a} → ${b} dB)`;
  DE.ablaufTeil = (wer, n, dnb, wurf) => `Scratch, ${wer} mit ${n} Hüpfern, ${dnb ? "Drum and Bass, " : ""}Gefrickel, Wurf ${wurf}`;
  DE.verfrickelt = (wurf) => `verfrickelt, Wurf ${wurf}`;
  DE.frickelMehr = (bpm, takte, scheiben) => ` · ${bpm} BPM, ${takte} Takte aus ${scheiben} Schnipseln`;
  DE.dieErsten = (s) => `die ersten ${s} s`;
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
