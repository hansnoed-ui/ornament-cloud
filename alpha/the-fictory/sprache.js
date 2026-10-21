// The Fictory – Deutsch und Englisch (21. Oktober 2026, Wunsch: «auch alle downloadbaren Apps re-designen, auch doppelsprachig deutsch/englisch»).
// Dasselbe Muster wie in PHORMA I–III: ein Skript vor den Modulen; data-t="schlüssel" für die Seite, die deutschen Sätze als Schlüssel für app.js und
// pwa.js, die Stationen und Regeln über ihren Titel; Sätze mit Werten (Befunde in analyse.js, Ereignisse in operationen.js, die ORNA-Karte in
// orna.js) als Funktionen, die dort über TF(schlüssel, deutscher Satz, …) laufen – in Node (Tests) bleibt Deutsch. Die Texte eines fertigen Laufs
// behalten die Sprache, in der er erzeugt wurde; ein neuer Lauf nimmt die gewählte. Die Wahl: ?sprache= (Bühne und Links des Neubaus), sonst
// localStorage «ornament.sprache», sonst das Gerät.
(() => {
  const DE = { _titel: "The Fictory – Ornament Cloud · Alpha" };
  const EN = {
    _titel: "The Fictory – Ornament Cloud · Alpha",
    "kopf.sprache": "Language", "kopf.ueber": "About the app",
    lead: "A picture falls apart into its parts and goes on.", "ablauf.aria": "How it works",
    "ablauf.1": "Load a picture", "ablauf.1.text": "or the sample picture", "ablauf.2": "Check the analysis", "ablauf.2.text": "if you like", "ablauf.3": "ORNA", "ablauf.3.text": "draw a rule, if you like",
    "ablauf.4": "Generate", "ablauf.4.text": "30 seconds of animation", "ablauf.5": "Watch and save", "ablauf.5.text": "video and still images",
    "install.knopf": "Install The Fictory as an app",
    "werkbank.aria": "Workbench", "ablage.satz": "Put a picture on the workbench.", "Bild wählen": "Choose a picture", Beispielbild: "Sample picture", Erzeugen: "Generate", "status.laden": "It stays on your device.",
    "buehne.aria": "The animation", "zeitleiste.aria": "Timeline", Abspielen: "Play", Pause: "Pause", Neustart: "Restart", Daten: "Data", "daten.title": "Shows names, positions and counters. Not in still images and video.", "Anderes Bild": "Another picture",
    "standbilder.titel": "Six still images",
    "analyse.titel": "Check the analysis", "analyse.auf": "View and correct",
    "analyse.hinweis": "This is how the app reads your picture: colours, areas, edges, positions. It recognises no things. Tap into the preview to correct.",
    "gliederung.aria": "Preview of the picture's structure: areas in their mean colour, figures with a strong outline, ground hatched",
    "tipp.aria": "What a tap in the preview does", "tipp.teil": "Figure on/off", "tipp.grund": "Ground ↔ figure", "ansicht.aria": "View of the preview", "ansicht.gliederung": "Structure", "ansicht.original": "Original",
    "teile.hinweis": "Everything becomes parts. Figures lie on top.", "teile.aria": "Figures",
    Farbgruppen: "Colour groups", "Kleinste Fläche": "Smallest area", "regel.label": "Rule for new neighbourhoods", "regel.befund": "from the findings", "regel.farbe": "by colour group", "regel.groesse": "by area", "regel.helligkeit": "by brightness",
    zuruecksetzen: "Reset corrections", Befund: "Finding", Lesart: "Reading", Eingriff: "Intervention", "Lesart verwenden": "Use reading",
    "orna.titel": "ORNA", optional: "optional", "orna.hinweis": "A constellation drawn from ORNA gives the run a rule.", "orna.aria": "Include ORNA", "Ohne ORNA": "Without ORNA", "Konstellation ziehen": "Draw a constellation", "Neu ziehen": "Draw again",
    "erzeugen.titel": "Generate", "erzeugen.hinweis": "30 seconds, six steps. Each builds on the previous one; at the end the picture reassembles itself. The still images are moments of this run.",
    "Neuer Startwert": "New seed",
    "ergebnis.titel": "Export and check", "alle-png": "All six still images (ZIP)", "video.knopf": "Animation as video", protokoll: "Log (JSON)", "protokoll.laden": "Repeat a run from a log",
    Gegenprobe: "Counter-check", "gegen.hinweis": "The same run, only without effective traces from step 4 on. What changes?", "gegen.knopf": "Compute the counter-check",
    "ereignisse.titel": "Events of the run",
    "methode.titel": "What happens here", "methode.1": "<strong>Side by side:</strong> Every part stays findable (F1, F2 …), wherever it wanders.",
    "methode.2": "<strong>One after another:</strong> Traces and a proliferating field slow down and steer the later steps. At the end the picture reassembles itself; the traces decide in which order.",
    "methode.3": "No evaluation. No statement about how the picture came about or how it works.", "methode.4": "Integrations are determined on loading.",
    "fuss.fragen": "Questions and comments about the website: <a href=\"mailto:hansnoed@gmail.com\">hansnoed@gmail.com</a>", "fuss.impressum": "Imprint",
    // app.js
    "Bild wird gelesen …": "Reading the picture …", "Eingangsbild": "Input picture", "Gleich erzeugen, oder unten Analyse und ORNA anpassen.": "Generate right away, or adjust the analysis and ORNA below.",
    "Das Bild liess sich nicht lesen": "The picture could not be read", "Die Analyse hat sich geändert. «Erzeugen» übernimmt sie.": "The analysis has changed. «Generate» takes it over.",
    analyseKurz: (f, g, t) => `${f} areas, ${g} colour groups, ${t} figures`, Figur: "Figure", "Keine Figur": "No figure", "des Bildes": "of the picture",
    "Satz des Konstellationstexts, unverändert.": "of the constellation text, unchanged.", Satz: "Sentence", "Kein Satz trägt ein Stichwort einer Regel.": "No sentence carries a keyword of a rule.",
    Startwert: "Seed", "(aus der ORNA-Ziehung)": "(from the ORNA draw)", "Material wird aus dem Bild geschnitten …": "Cutting material from the picture …",
    "Es braucht mindestens zwei Teile. Wähle in der Vorschau weitere Flächen aus oder erhöhe die Zahl der Farbgruppen.": "At least two parts are needed. Select more areas in the preview or raise the number of colour groups.",
    "Läuft. Zeitleiste, Standbilder und Export werden nebenher gerechnet …": "Running. Timeline, still images and export are computed alongside …",
    erzeugt: (n, k, regel, seed) => `Generated: ${n} parts (${k} of them tiles of large areas), rule ${regel}, seed ${seed}.`, "keine (ohne ORNA)": "none (without ORNA)",
    uhr: (a, b, s) => `${a} of ${b} seconds${s ? `, still image ${s}` : ""}`, Bild: "Picture", "Zum Eingangsbild mit Gliederung": "To the input picture with structure", "Zu Schlüsselzustand": "To key state",
    Standbild: "Still image", "als PNG herunterladen": "download as PNG", "In der Animation": "In the animation",
    standbilderRechnen: (n) => `${n} still images are being computed …`, zipFertig: (n, m) => `ZIP with ${n} PNG (${m} px) and the log.`,
    "Dieser Browser kann keine Videos aus einer Zeichenfläche aufnehmen.": "This browser cannot record videos from a canvas.", videoLaeuft: (s) => `Recording the video (${s} s in real time) …`,
    videoFertig: (e, m, w, h, s, mb) => `Video: ${e} (${m}), ${w} × ${h} px, ${s} s and one second of hold, ${mb} MB.`,
    protokollFremd: (n) => `The log belongs to another picture (${n}). Load that picture first.`, protokollGleich: (n) => `Run repeated from the log: all ${n} key states match.`,
    "Lauf wiederholt, aber die Schlüsselzustände weichen ab (andere Fassung der Anwendung?).": "Run repeated, but the key states differ (another version of the app?).", "Protokoll nicht lesbar:": "Log not readable:",
    gegenMit: (n, g) => `With effective traces (still image ${n}). Broken couplings: ${g}.`, gegenOhne: (g, v) => `Trace field deleted before step 4. Broken couplings: ${g}. On average the parts stand ${v} % of the picture height differently.`,
    "Animation als": "Animation as", integrationen: (n, jev, video) => `Runs entirely in the browser, nothing is uploaded. ORNA: ${n} constellations. jev: ${jev}. Video: ${video}.`,
    "hat die Regeln beim Bauen vorgeschlagen und wird hier nicht aufgerufen": "suggested the rules at build time and is not called here", "keine gültige Tabelle, die Regel folgt Stichworten": "no valid table, the rule follows keywords", "in diesem Browser nicht möglich": "not possible in this browser",
    // Stationen (operationen.js)
    "Neue Nachbarschaften": "New neighbourhoods", "Abfolge als Bild": "Sequence as picture", "Wirksame Spuren": "Effective traces", "Gekoppelte Beziehungen": "Coupled relations", "Anders weitergehen": "Going on differently", "Neu zusammengesetzt": "Reassembled",
    // Regeln (regeln.js)
    "Keine Rückkehr an dieselbe Stelle": "No return to the same place", "In den Schritten 3 und 5 darf kein Teil auf eine Stelle zurück, an der schon eine Spur liegt. Findet ein Teil keine freie Stelle, bleibt es stehen.": "In steps 3 and 5 no part may return to a place where a trace already lies. If a part finds no free place, it stays put.",
    "Verzögerter Spiegel": "Delayed mirror", "Zu Beginn der Schritte 2 und 5 kehrt die Anordnung eines früheren Schlüsselzustands an der Hauptachse gespiegelt als Spur zurück. Diese Spuren wirken danach wie alle anderen als Hindernis und Zähigkeit.": "At the beginning of steps 2 and 5 the arrangement of an earlier key state returns as a trace, mirrored at the main axis. These traces then act like all others as obstacle and viscosity.",
    "Raster als Regel": "Grid as rule", "Alle Zielstellen werden auf ein Raster gesetzt, dessen Weite aus der mittleren Grösse der ausgewählten Teile folgt.": "All target places are set on a grid whose spacing follows from the mean size of the selected parts.",
    "Nur Unterschiede, die Unterschiede machen": "Only differences that make a difference", "Nur Teile, die sich farblich deutlich von ihrer Umgebung abheben (Abstand über dem Median), bewegen sich. Die übrigen bleiben an ihrer Stelle als feste Bezugspunkte.": "Only parts whose colour clearly stands out from their surroundings (distance above the median) move. The rest stay in place as fixed reference points.",
    "Fortwirkende Last": "Lasting load", "Grosse Teile tragen Gewicht: Sie bewegen sich langsamer, und in den Schritten 4 und 5 sinken alle Teile nach unten, gewichtet nach ihrer Fläche.": "Large parts carry weight: they move more slowly, and in steps 4 and 5 all parts sink downwards, weighted by their area.",
    "Die Leerstelle bleibt": "The empty place remains", "Die Stellen, die die Figuren verlassen, bleiben offen: Ihr Umriss bleibt sichtbar, und das wuchernde Feld kann dort nicht wachsen.": "The places the figures leave stay open: their outline remains visible, and the proliferating field cannot grow there.",
    Verflechtung: "Interweaving", "Teile gleicher Farbgruppe werden zusätzlich miteinander gekoppelt. Der Anstoss in Schritt 4 überträgt sich über diese Kopplungen weiter.": "Parts of the same colour group are additionally coupled with each other. The impulse in step 4 passes on through these couplings.",
    // ORNA-Karte (orna.js)
    herkunft: (n, id, nr) => `ORNA, «Nebeneinander, Nacheinander»: curated collection of ${n} constellations, record ${id} (editorial number ${nr})`,
    naheliegend: "Obvious", möglich: "Possible", schwierig: "Difficult", offen: "Open",
    begruendungJev: (modell, stand, p) => `jev (${modell}, at build time on ${stand}) considered this rule ${p >= 0.4 ? "obvious" : p >= 0.15 ? "possible" : "a difficult fit"}; the draw used the seed on jev's weighted assessments.`,
    "Kein Satz enthält ein Stichwort einer Regel; die Regel ist ohne Beleg im Text gezogen. Die Passung bleibt offen.": "No sentence contains a keyword of a rule; the rule was drawn without evidence in the text. The fit remains open.",
    begruendungStichworte: (n) => `Assignment via keywords of the rule in the text (${n} hits), without jev; drawn with the seed, weighted by hits.`,
    "Gestalterische Interpretation": "Design interpretation", "Keine Aussage der genannten Personen.": "No statement by the people named.", Gedanke: "Thought", Passung: "Fit", Kennzeichnung: "Labelling", "Ganzer Text": "Full text", anzeigen: "show", Herkunft: "Origin",
    // Befunde (analyse.js)
    "Grenzen, Konturen und Flächen": "Boundaries, contours and areas",
    befundFlaechen: (f, g, k, w, h) => `${f} connected areas in ${g} colour groups; mean edge strength ${k} (change of brightness per pixel, analysis ${w} × ${h} px).`,
    "Das Bild ist kleinteilig gegliedert; die Flächen sind eine Vereinfachung, die feine Übergänge zusammenfasst.": "The picture is finely structured; the areas are a simplification that sums up fine transitions.",
    "Das Bild lässt sich in wenige, klar begrenzte Flächen gliedern.": "The picture can be divided into a few clearly bounded areas.",
    eingriffFlaechen: (f, namen) => `The whole picture becomes material: all ${f} areas become parts, large ones cut into tiles. Figures (${namen}) lie on top; the original disappears after the first step.`,
    "Nachbarschaften, Abstände und Anordnungen": "Neighbourhoods, distances and arrangements",
    befundAnordnung: (w, s, m, st) => `Main axis of the parts ${w} (elongation ${s} : 1); mean distance to the nearest part ${m} of the picture height, spread ${st}.`,
    lesartAchse: (w) => `The parts tend to line up along a direction of ${w}.`, "Die Teile verteilen sich ohne deutliche Vorzugsrichtung.": "The parts are distributed without a clear preferred direction.",
    eingriffAnordnung: (achse) => `Step 1 lays the archive grid along ${achse ? "this axis" : "the longer side of the picture"}; step 2 lays the time axis in this direction.`,
    "Wiederholungen von Farben und Formen": "Repetitions of colours and shapes",
    farbWdh: (k, n) => `Colour group ${k} recurs in ${n} separate areas`, "Keine Farbgruppe kehrt in mehreren getrennten Figurflächen wieder": "No colour group recurs in several separate figure areas",
    formGruppen: (g) => `; similar shapes (elongation, filling, size): ${g}.`, "; keine ähnlichen Formen unter den Teilen.": "; no similar shapes among the parts.",
    "Gleiche Farbe kann als Zusammengehörigkeit getrennter Teile gelesen werden.": "The same colour can be read as separate parts belonging together.", "Zusammengehörigkeit ergibt sich hier eher aus Lage und Grösse als aus Farbe.": "Belonging together arises here more from position and size than from colour.",
    eingriffWdh: (regel) => `New neighbourhoods ${regel}.`, "nach Farbgruppe (gleiche Farben werden Nachbarn)": "by colour group (same colours become neighbours)", "nach Fläche (von gross nach klein)": "by area (from large to small)", "nach Helligkeit (von dunkel nach hell)": "by brightness (from dark to light)",
    "nach Farbgruppe": "by colour group", "nach Fläche": "by area", "nach Helligkeit": "by brightness",
    "Verbindungen und Unterbrechungen": "Connections and interruptions",
    befundVerbindung: (n, liste, u, uliste) => `${n} contacts between parts${liste}; ${u} same-coloured pairs with another area between them${uliste}.`,
    "Eine gleichfarbige, unterbrochene Folge kann als eine durchlaufende Fläche gelesen werden, die an einer Stelle unterbrochen ist.": "A same-coloured, interrupted sequence can be read as one continuous area that is interrupted at one place.",
    "Die Teile hängen eher über Nachbarschaft als über unterbrochene Linien zusammen.": "The parts are connected more through neighbourhood than through interrupted lines.",
    "Gemeinsame Grenzen im Bild werden in Schritt 4 zu Kopplungen mit der ursprünglichen Distanz als Ruhelänge: Sie ziehen das zerlegte Bild wieder zusammen.": "Shared boundaries in the picture become couplings in step 4 with the original distance as rest length: they pull the dismantled picture back together.",
    "Überlagerungen und Verdeckungen": "Overlaps and occlusions",
    einschluss: (a, b) => `${a} lies entirely within ${b}`, "Keine Fläche liegt ganz in einer anderen": "No area lies entirely within another", unterbrechungen: (n) => `; ${n} interruption(s) by a third area`,
    "Keine eingeschlossenen Flächen und keine Unterbrechungen durch Dritte gefunden.": "No enclosed areas and no interruptions by third areas found.",
    "Mögliche Verdeckung: Die innere oder trennende Fläche kann vor der anderen liegen – oder eine Öffnung in ihr sein. Die Gliederung entscheidet das nicht.": "Possible occlusion: the inner or separating area may lie in front of the other – or be an opening in it. The structure does not decide this.",
    "Hinweise auf Überlagerung ergeben sich aus der Gliederung nicht.": "The structure gives no indication of overlap.",
    "Schritt 2 legt die Teile auf der Zeitachse übereinander; eingeschlossene Teile bleiben dabei über ihrer Umgebung (wenn diese Lesart gilt).": "Step 2 stacks the parts on the time axis; enclosed parts stay above their surroundings (if this reading holds).",
    "Figur-Grund-Beziehungen und Gewichtungen": "Figure-ground relations and weightings",
    befundGrund: (namen, anteil, lage) => `Ground: ${namen} (${anteil} of the picture, at the edge). Centre of gravity of the parts ${lage}.`,
    "Randnahe, grosse Flächen werden als Grund gelesen, kleinere mit Kontrast als Figuren. Antippen in der Vorschau korrigiert das.": "Large areas near the edge are read as ground, smaller ones with contrast as figures. Tapping in the preview corrects this.",
    "Auch der Grund wird zu Teilen. Figuren liegen obenauf, und die gewichtigste trägt den Anstoss in Schritt 4.": "The ground becomes parts too. Figures lie on top, and the weightiest carries the impulse in step 4.",
    // Ereignisse (operationen.js)
    "Ende des Laufs: Das Ursprungsbild steht wieder, aus seinen Teilen neu zusammengesetzt; der Zustand bleibt stehen.": "End of the run: the original picture stands again, reassembled from its parts; the state remains.",
    gegenprobe: (st) => `Counter-check: trace field, proliferating field and current deleted before step ${st} (stamped traces remain visible but no longer act).`,
    regelR2: (welcher, grad, n) => `Rule R2: the arrangement of ${welcher} returns mirrored (axis ${grad}) as ${n} traces.`,
    kurz1: (n, regel) => `${n} parts, laid into the grid ${regel}.`,
    text1: (n, N, regel, nx, ny, r3, zuerst) => `Step 1: the picture is broken down into ${n} parts (areas, large areas into tiles); ${N} parts go ${regel} into an archive grid of ${nx} × ${ny} fields, each brought to its field size${r3 ? ", snapped in" : ""}. Arrived first: ${zuerst} …`,
    "Die Reihenfolge der Ankunft wird zur Zeitachse.": "The order of arrival becomes the time axis.",
    text2: (grad) => `Step 2: the order of arrival from step 1 becomes the time axis along ${grad}: what arrived early at the beginning, what arrived late at the end and on top; across it each part keeps its position from the input picture, at full size. Every intermediate state remains as a trace.`,
    "Sechs Runden: stempeln, ausweichen, nah an der Herkunft bleiben.": "Six rounds: stamping, evading, staying close to the origin.",
    text3: (n) => `Step 3: stamping and gliding on six times, offset against each other; each part chooses the neighbouring place with the least trace, but stays bound to its place of origin in the picture, and turns in its direction (traces so far: ${n}).`,
    regelR1: (name) => `Rule R1: ${name} finds no place without a trace and stays put.`,
    kurz4: (n) => `${n} couplings pull the picture together, twisted.`,
    text4: (n, baum, grenze, farbe, anstoss) => `Step 4: ${n} couplings with the distance from the input picture (${baum} framework, ${grenze} shared boundaries${farbe}) pull the picture back together; all parts return to their original size. Impulse: ${anstoss} turns by 90°. Places with a trace are viscous.`,
    farbeKopplungen: (n) => `, ${n} same colour`,
    kurz5: (n) => `A cut: ${n} parts break away.`,
    text5: (ort, meist, gerissen, weg, halten) => `Step 5: intervention – a cut across the main axis, between ${ort} (the part with the most trace, ${meist}) and the centre of gravity of the structure. ${gerissen} couplings break; ${weg} parts break away and turn, ${halten} hold together.`,
    "Jedes Teil kehrt zurück: das Bild setzt sich neu zusammen.": "Every part returns: the picture reassembles itself.",
    text6: (N, zuerst, zuletzt) => `Step 6: all couplings dissolve; each of the ${N} parts returns to its place of origin, at original size and without rotation, and the original picture reassembles itself. The traces decide the order: first ${zuerst} (little trace), last ${zuletzt}. Fine joints remain.`,
    // pwa.js
    "Im Browser dieser App lässt sich The Fictory nicht installieren. Die Seite öffnet sich dafür in Chrome; dort noch einmal auf «The Fictory als App installieren» tippen.": "The Fictory cannot be installed from this app's browser. The page opens in Chrome for that; tap «Install The Fictory as an app» there once more.",
    "Im Browser dieser App lässt sich The Fictory nicht installieren. Über «···» oder das Menü «In Safari öffnen» wählen, dann dort «Teilen» und «Zum Home-Bildschirm».": "The Fictory cannot be installed from this app's browser. Choose «···» or the menu «Open in Safari», then «Share» and «Add to Home Screen» there.",
    "Auf «Teilen» tippen, dann «Zum Home-Bildschirm» wählen.": "Tap «Share», then choose «Add to Home Screen».",
    "Im Browsermenü (⋮) «App installieren» oder «Zum Startbildschirm hinzufügen» wählen.": "In the browser menu (⋮) choose «Install app» or «Add to Home screen».",
    "Im Browsermenü (⋮) «The Fictory installieren» wählen oder in der Adresszeile auf das Installationssymbol klicken. Im Inkognito-Fenster geht es nicht.": "In the browser menu (⋮) choose «Install The Fictory» or click the install icon in the address bar. It does not work in an incognito window.",
    "Im Menü «Ablage» «Zum Dock hinzufügen» wählen.": "In the «File» menu choose «Add to Dock».",
    "Dieser Browser kann The Fictory nicht installieren. Auf dem Smartphone geht es direkt, am Computer mit Chrome oder Edge.": "This browser cannot install The Fictory. On a smartphone it works directly, on a computer with Chrome or Edge.",
    "In Chrome öffnen": "Open in Chrome", " Danach steht The Fictory als eigenes Symbol auf dem Bildschirm und läuft auch ohne Netz; dein Bild bleibt auf dem Gerät.": " After that The Fictory has its own icon on the screen and runs without a network too; your picture stays on the device.",
  };
  const KEY = "ornament.sprache";
  const erkannt = () => {
    const q = new URLSearchParams(location.search).get("sprache");
    if (q === "de" || q === "en") { try { localStorage.setItem(KEY, q); } catch { /* ohne Speicher */ } return q; }
    try { const s = localStorage.getItem(KEY); if (s === "de" || s === "en") return s; } catch { /* ohne Speicher */ }
    return /^en/i.test(navigator.language || "") ? "en" : "de";
  };
  // Im Worker (rechner.js lädt dieses Skript als Modul): keine Seite, die Sprache kommt mit der Nachricht; so tragen die Texte des
  // vorausgerechneten Laufs (Ereignisse, Standbilder) dieselbe Sprache wie die Seite.
  const seite = typeof document !== "undefined";
  let sprache = seite ? erkannt() : "de";
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
  globalThis.sprache = {
    get: () => sprache,
    en: () => sprache === "en",
    t: (k, ...a) => { const w = (sprache === "en" ? EN : DE)[k] ?? DE[k] ?? k; return typeof w === "function" ? w(...a) : w; },
    setze: (l) => { if (l !== "de" && l !== "en") return; sprache = l; if (!seite) return; try { localStorage.setItem(KEY, l); } catch { /* ohne Speicher */ } anwenden(); },
  };
  if (!seite) return;
  document.addEventListener("click", (e) => { const b = e.target.closest(".sprache [data-sprache]"); if (b) globalThis.sprache.setze(b.dataset.sprache); });
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", anwenden); else anwenden();
})();
