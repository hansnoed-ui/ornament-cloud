// Inhalte des Neubaus unter /b/ (Entwurf vom 20. Oktober 2026, siehe docs/superpowers/specs/2026-10-20-b-neubau-design.md).
// Alles Eigene steht hier: Verzeichnis der Apps, Raster, Angebote und Produkte sowie die Texte dazu. Die Zettel, ORNA und ORMA
// kommen unverändert aus ihren Quellen (src/data/, src/doppelspalt/, src/orma/) und stehen nicht hier.
// Leistungen und Hintergrund nach den Angaben von Christian vom 20. Oktober 2026; Preise und Setting fehlen noch.

export const SEITE = {
  name: "ornament.cloud",
  adresse: "https://ornament.cloud/b/",
  claim: "Beobachtung ist Anlass für Veränderung in der Realität.",
  // Einstieg über das Angebot (20. Oktober 2026, Wunsch: «landing-page: ich denke, es sollte die ‹Angebote›-Seite sein, damit der Einstieg in die Website klarer ist»;
  // Entscheid: /b/ beginnt mit den vier Leistungen, Feld, Apps und Zettel folgen). Bis dahin: «Theorie, die man anfassen kann.»
  titel: "Gestalten, vermitteln, kuratieren.",
  lead: "Webdesign, Vermittlung und Beratung, kuratorische Projekte und Produkte, made in Switzerland. Dazu ein Zettelkasten, sieben Apps und vier Prüfraster, die zeigen, wie hier gearbeitet wird.",
  claimAlt: "Theorie, die man anfassen kann.",
  beschreibung: "49 Zettel, sieben Apps, vier Prüfraster und vier Leistungen, made in Switzerland: Webdesign, Vermittlung und Beratung, kuratorische Projekte, Produkte.",
  person: { name: "Christian Strickler", ort: "zwischen Zürich, Basel und Aarau", strasse: "Rheingasse 8b", plz: "CH-5466 Kaiserstuhl", mail: "hansnoed@gmail.com" },
  sprache: "de-CH",
};

/** Der Dialog auf der Startseite: Was bringst du mit? Jede Wahl führt auf einen Weg aus drei Stationen. */
export const DIALOG = {
  frage: "Was bringst du mit?",
  wahlen: [
    { id: "bild", wort: "ein Bild", satz: "Ein Bild will sich bewegen.", weg: [["b/apps/phorma-ii/", "PHORMA II: eine Linie wächst und zeichnet dein Foto"], ["b/apps/the-fictory/", "The Fictory: das Bild zerfällt und setzt sich neu zusammen"], ["b/angebot/produkte/", "Ein Bild wird ein Werk: Auftragsarbeiten und Prints"]] },
    { id: "frage", wort: "eine Frage", satz: "Eine Frage sucht ein Gegenüber.", weg: [["b/apps/orna/", "ORNA: eine Drehung, eine Begegnung, eine offene Frage"], ["b/zettel/", "Der Zettelkasten: 49 Zettel, die aneinander anschliessen"], ["b/angebot/vermittlung/", "Ein Gespräch, das die Frage ernst nimmt"]] },
    { id: "auftrag", wort: "einen Auftrag", satz: "Etwas soll gebaut werden.", weg: [["b/angebot/webdesign/", "Websites und Apps: schnell, eigenständig, ohne Dienste von aussen"], ["b/angebot/produkte/", "Ein Werk für einen bestimmten Ort"], ["b/angebot/", "Alle vier Leistungen und der Weg zum Briefing"]] },
    { id: "begriff", wort: "einen Begriff", satz: "Ein Begriff will geprüft werden.", weg: [["b/zettel/", "Im Feld nachsehen: 49 Begriffe von der Brücke bis zur Zukunft"], ["b/raster/", "Vier Prüfraster für Theorien, Texte und Körper"], ["b/apps/orma/", "ORMA: zu zweit antworten, aufdecken, weiterdenken"]] },
    { id: "gruppe", wort: "eine Gruppe", satz: "Eine Klasse, ein Team, ein Haus.", weg: [["b/angebot/vermittlung/", "Vermittlung und Beratung: Seminare, Projekte, Ateliers in Institutionen"], ["b/apps/omna-color/", "OMNA COLOR: 180 Gestaltungsübungen aus zwei Farbrädern"], ["b/angebot/kuration/", "Ein Haus will ausstellen: kuratorische Projekte"]] },
  ],
};

/** Die sieben Apps. Sie bleiben, wie sie sind; hier steht nur ihre Darstellung. */
// Bilder der Apps (seit 20. Oktober 2026, Wunsch: «alle stilvoll re-designt, nicht dieses farbige Durcheinander … alles stilisiert, zur Seite passend»):
// sieben gezeichnete Tafeln aus tools/b-app-bilder.mjs (SVG, hell und dunkel), je App ein Motiv aus ihrer Mechanik; vorher die Standbilder und Symbole der Apps.
export const APPS = [
  { slug: "orna", name: "ORNA", werk: "Nebeneinander, Nacheinander", gattung: "Text und Theorie", kurz: "Eine Drehung, eine Begegnung, eine offene Frage.",
    text: "Zwei Ringe drehen gegeneinander: aussen zwanzig Künstler:innen, innen zwanzig Theoretiker:innen. Wo sie stehen bleiben, steht eine Konstellation aus dem kuratierten Bestand von 326: ein kurzer Text und eine Frage, die offen bleibt. Das Rad erzeugt keine Antworten, es erzeugt Konstellationen.",
    fuer: "Für alle, die mit einem Gedanken anfangen wollen und nicht mit einer Lösung.",
    url: "portfolio/nebeneinander-nacheinander/", app: "portfolio/nebeneinander-nacheinander/?installieren", feld: "portfolio/nebeneinander-nacheinander/feld/", bild: "b/bilder/apps/orna.svg", bildDunkel: "b/bilder/apps/orna-dunkel.svg", bildAlt: "ORNA, gezeichnet: zwei Ringe zu je zwanzig Feldern, gegeneinander gedreht; wo sie stehen bleiben, die Begegnung in Blau",
    beispiele: { art: "orna", ids: ["agnes-martin__niklas-luhmann", "sol-lewitt__george-spencer-brown", "mona-hatoum__hannah-arendt"] },
    bewegung: "So arbeitet ORNA: Zwei Ringe drehen gegeneinander und laufen aus. Wo sie stehen bleiben, treffen sich zwei Zeichen – eine Konstellation.",
    zeichen: "rad" },
  { slug: "orma", name: "ORMA", werk: "Nebeneinander, Nacheinander", gattung: "Text und Theorie", kurz: "Zehn Minuten zu zweit. Zwei Sichtweisen. Ein neuer Gedanke.",
    text: "Ein Kunst- und Denkspiel für zwei Personen an einem Gerät: drehen, lesen, einen Auftrag wählen, getrennt antworten, aufdecken, weiterdenken. Allein spielst du «Re-Entry»: Bringt das Rad dieselbe Konstellation wieder, antwortest du noch einmal, ohne die erste Antwort zu sehen. Ohne Punkte, ohne Zeitdruck, ohne Bewertung.",
    fuer: "Für Paare, Freund:innen, Kolleg:innen, Seminare und für alle, die mit sich selbst ins Gespräch kommen wollen.",
    url: "alpha/orma/", app: "alpha/orma/?installieren", bild: "b/bilder/apps/orma.svg", bildDunkel: "b/bilder/apps/orma-dunkel.svg", bildAlt: "ORMA, gezeichnet: ein Kreis, in der Mitte geteilt, links Papier, rechts Tinte; zwei Personen an einem Tisch",
    beispiele: { art: "orma", id: "eva-hesse__susan-leigh-star" },
    bewegung: "So arbeitet ORMA: Zwei Personen, zwei Gedanken zu einer Konstellation; dann wechselt die Seite, und derselbe Gedanke wird von der anderen her gelesen – der Re-Entry.",
    zeichen: "orma" },
  { slug: "omna-color", name: "OMNA COLOR", gattung: "Gestaltung", kurz: "Zwei Farbräder, 180 Gestaltungsübungen.",
    text: "Zwei Farbräder mit sieben Themen drehen gegeneinander: Farbe, Linie, Form, Raum und Material, Zeit und Körper, Zufall, Symbol und Würdigung. Zeigen sie zwei Farben, verbindet die Übung beide Themen; zeigen sie dieselbe, bleibt es beim reinen Thema. Jede Übung nennt Material, Schritte, Dauer und eine Frage zum Schluss.",
    fuer: "Für Ateliers, Schulklassen, Workshops und für alle, die mit den Händen denken.",
    url: "alpha/omna-color/", app: "alpha/omna-color/?installieren", bild: "b/bilder/apps/omna-color.svg", bildDunkel: "b/bilder/apps/omna-color-dunkel.svg", bildAlt: "OMNA COLOR, gezeichnet: zwei Räder mit je sieben Feldern, aussen in sieben Farben, innen als Linie, gegeneinander gedreht",
    beispiele: { art: "omna", ids: ["001", "045", "170"] },
    bewegung: "So arbeitet OMNA COLOR: Zwei Räder drehen gegeneinander. Der Strich oben trifft zwei Felder, und aus den beiden wird eine Übung.",
    zeichen: "farbe" },
  { slug: "phorma-i", name: "PHORMA I", gattung: "Bild und Video", kurz: "Ein Foto zerfällt in Linien, Formen und Farben.",
    text: "Aus einem Foto wird ein Film: Es zerfällt in Linien, Formen und Farben, verwandelt sich in Funken, Glas, Scherben, Echo und Gebirge oder wird im Flug erkundet. Das Ergebnis ist ein Video im Hochformat für Social Media. Alles rechnet auf deinem Gerät; das Bild verlässt es nicht.",
    fuer: "Für alle, die aus einem Bild ein Reel machen wollen, ohne Schnittprogramm.",
    url: "alpha/bildfragmentieren/", app: "alpha/bildfragmentieren/?installieren", bild: "b/bilder/apps/phorma-i.svg", bildDunkel: "b/bilder/apps/phorma-i-dunkel.svg", bildAlt: "PHORMA I, gezeichnet: ein Kristall aus Scherben, Dreiecke über einer Scheibe, eine Scherbe in Blau",
    beispiele: [
      { art: "video", datei: "assets/beispiele/phorma-i.mp4", bild: "assets/beispiele/phorma-i.jpg", mass: [540, 676], text: "Der Ablauf «Fragmente» mit dem Beispielfoto: Linien, Formen, Farben – und am Ende das Foto. Gerechnet aus der App, ohne Ton." },
      { art: "paar", vorher: "alpha/bildfragmentieren/beispiel.jpg", nachher: "assets/vorschau-phorma-i-2x.jpg", text: "Ein Foto wird ein Glaskristall: das Bild liegt auf den Flächen, die Linien sind die Kanten." },
    ],
    bewegung: "So arbeitet PHORMA I: Das Foto wird in Scherben zerlegt; die Scherben bewegen sich, als läge das Bild in einem Kristall.",
    zeichen: "scherbe" },
  { slug: "phorma-ii", name: "PHORMA II", gattung: "Bild und Video", kurz: "Eine leuchtende Linie wächst und zeichnet dein Foto.",
    text: "Eine Linie wächst und zeichnet das Bild, ein Schleimpilz findet seine Formen, eine Lichtebene tastet die Tiefe ab, das Bild weht als Seidentuch oder zerfällt im Takt in Rechtecke. Jeder Effekt einzeln oder als Kette, aus Foto oder Video. Ein Video im Hochformat, gerechnet auf der eigenen Grafikkarte.",
    fuer: "Für Künstler:innen, Galerien und Museen, die ein Werk in Bewegung zeigen wollen.",
    url: "alpha/phorma-ii/", bild: "b/bilder/apps/phorma-ii.svg", bildDunkel: "b/bilder/apps/phorma-ii-dunkel.svg", bildAlt: "PHORMA II, gezeichnet: eine einzige Linie, die aus einem Keim gewachsen ist und eine Scheibe füllt",
    beispiele: [
      { art: "video", datei: "assets/beispiele/phorma-ii.mp4", bild: "assets/beispiele/phorma-ii.jpg", mass: [540, 676], text: "Die Kette der App mit dem Beispielfoto, drei Effekte in einem Film: ein Schleimpilz legt sein Netz auf die Formen (Physarum), eine Lichtebene tastet das Relief ab (Tiefe), das Foto weht als Seidentuch und legt sich glatt (Tuch). Gerechnet aus der App, ohne Ton." },
      { art: "paar", vorher: "alpha/phorma-ii/beispiel.jpg", nachher: "assets/vorschau-phorma-ii-2x.jpg", text: "Dasselbe Foto, zerlegt in Rechtecke mit versetzten Ausschnitten, Rändern und Zahlentafeln (Montage)." },
    ],
    bewegung: "So arbeitet PHORMA II: Eine einzige Linie wächst aus einem Keim, faltet sich und füllt die Fläche – sie zeichnet das Foto.",
    zeichen: "linie" },
  { slug: "phorma-iii", name: "PHORMA III", gattung: "Bild und Video", kurz: "Aus Klang wird Bild.",
    text: "Zu Musik oder einer Stimme entstehen Gewebe aus feinen Linien, ein Faden im Würfel aus Licht oder glänzende Perlen in einer Kugel aus Fäden; ein Video wird gescratcht und verfrickelt. Das Ergebnis ist ein Video mit Ton. Das Intro der bisherigen Website ist damit gerechnet.",
    fuer: "Für Musiker:innen, Sprecher:innen und alle, die zu einem Ton ein Bild brauchen.",
    url: "alpha/phorma-iii/", app: "alpha/phorma-iii/?installieren", bild: "b/bilder/apps/phorma-iii.svg", bildDunkel: "b/bilder/apps/phorma-iii-dunkel.svg", bildAlt: "PHORMA III, gezeichnet: drei Bänder aus feinen Linien wie zerknitterte Seide, eines in Blau",
    beispiele: [
      { art: "video", datei: "assets/start-intro.mp4", bild: "assets/beispiele/phorma-iii-lichtwuerfel.jpg", mass: [540, 676], text: "Der Lichtwürfel: ein Faden irrt im Würfel aus Licht und legt sich zum Logo; gerechnet aus der Musik, mit Ton. Das Intro der bisherigen Website." },
      { art: "video", datei: "assets/beispiele/phorma-iii.mp4", bild: "assets/beispiele/phorma-iii.jpg", mass: [540, 676], text: "Drei Effekte zu einem kurzen Stück Musik, auf dem Takt geschnitten: Flächen aus feinen Linien klappen bei jedem Einsatz auf (Gewebe), ein Faden irrt durch den Würfel aus Licht (Irrfahrt), glänzende Perlen in einer Kugel aus Fäden fädeln sich zuletzt auf die Schlaufe des Logos (Traube). Gerechnet aus der App, mit Ton." },
    ],
    bewegung: "So arbeitet PHORMA III: Bänder aus feinen Linien bewegen sich zum Takt; jeder Schlag lässt das Gewebe schwellen.",
    zeichen: "faden" },
  { slug: "the-fictory", name: "The Fictory", gattung: "Bild und Video", kurz: "Ein Bild zerfällt, ordnet sich neu und setzt sich wieder zusammen.",
    text: "Leg ein Bild auf die Werkbank: Es zerfällt in seine Teile, ordnet sich neu, hinterlässt Spuren und setzt sich am Ende neu zusammen. Eine Animation, sechs Standbilder und ein Video. Wer will, gibt eine Regel aus ORNA mit; sie bestimmt den Eingriff.",
    fuer: "Für alle, die sehen wollen, was ein Bild noch sein könnte.",
    url: "alpha/the-fictory/", app: "alpha/the-fictory/app/", bild: "b/bilder/apps/the-fictory.svg", bildDunkel: "b/bilder/apps/the-fictory-dunkel.svg", bildAlt: "The Fictory, gezeichnet: ein Raster von Kacheln, jede aus ihrer Herkunft gewandert und gedreht, mit Spuren und Fäden",
    beispiele: [
      { art: "video", datei: "assets/beispiele/the-fictory.mp4", bild: "assets/beispiele/the-fictory.jpg", mass: [540, 766], text: "Der ganze Lauf von 30 Sekunden mit dem Beispielbild: Archiv, Zeitachse, Spuren, Kopplungen, Schnitt – und das Bild setzt sich wieder zusammen. Gerechnet aus der App." },
      { art: "paar", vorher: "alpha/the-fictory/beispiel.jpg", nachher: "assets/vorschau-the-fictory.jpg", text: "Ein Bild auf der Werkbank zerfällt in seine Teile; jedes Teil wird eine Spur." },
    ],
    bewegung: "So arbeitet The Fictory: Das Bild zerfällt in seine Teile, die Teile wandern, Fäden verbinden sie, und am Ende setzt sich das Bild wieder zusammen.",
    zeichen: "teile" },
];

/** Die vier Prüfraster (Masterprompts). Prompt und Papier liegen weiter unter alpha/. Seit 20. Oktober 2026 mit gezeichneter Tafel (tools/b-app-bilder.mjs),
 *  einem Satz zur Bewegung und einem Satz zum Ergebnis («Die Prüfraster müssen re-designt werden … analog zu den App-Beiträgen»). */
export const RASTER = [
  { slug: "nebeneinander-nacheinander", name: "Nebeneinander und Nacheinander", kurz: "Verräumlichung und Verzeitlichung als Achsen.",
    text: "Ordnet Theorien, Kunstpraxen und andere Ansätze danach, wie sie Verräumlichung und Verzeitlichung ins Verhältnis setzen. Vier Felder: Ereignis, Doppelspalt, Stilles Operieren, Ordnung. Das Raster ist die Grundlage von ORNA und ORMA.",
    achsen: { x: "Verräumlichung", y: "Verzeitlichung" }, felder: [["Ereignis", "Doppelspalt"], ["Stilles Operieren", "Ordnung"]], betont: [0, 1],
    seite: "alpha/pruefraster/", pdf: "alpha/pruefraster-nebeneinander-nacheinander.pdf", prompt: "alpha/pruefraster-anwendungsprompt-3.2.0.md", fassung: "Anwendungsprompt 3.2.0", stand: "fertig",
    anwendung: "Eine Theorie, eine Kunstpraxis, ein Manifest oder eine eigene Arbeitsweise. Der Prompt fragt nach den Unterscheidungen, mit denen der Ansatz Raum und Zeit erzeugt, und setzt ihn ins Feld.",
    bild: "b/bilder/raster/nebeneinander-nacheinander.svg", bildDunkel: "b/bilder/raster/nebeneinander-nacheinander-dunkel.svg", bildAlt: "Nebeneinander und Nacheinander, gezeichnet: zwei Achsen, vier Felder; ein Punkt wandert durch das Feld und bleibt in einem Feld stehen",
    bewegung: "So arbeitet das Raster: Ein Ansatz wird an zwei Achsen gemessen, Verräumlichung und Verzeitlichung, und landet in einem der vier Felder.", ergebnis: "eine Einordnung ins Feld entlang der acht Prüffragen, kurz oder ausführlich, mit den Unterscheidungen, die den Ansatz tragen." },
  { slug: "verteilapparat", name: "Der Verteilapparat des Körpers", kurz: "Wessen Körperereignis kommt wie weit?",
    text: "Ein Prüfinstrument dafür, wessen Körperereignis wie weit kommt, unter welcher Beschreibung, wer sie berichtigen kann und was daraus materiell folgt. Sieben Schwellen, Stimme gegen Messung, vier Felder: Ausgeliefertsein, Verhandelbare Teilhabe, Verschwinden, Privilegierte Opazität.",
    achsen: { x: "Selbstbeschreibung", y: "Fremderfassung" }, felder: [["Ausgeliefertsein", "Verhandelbare Teilhabe"], ["Verschwinden", "Privilegierte Opazität"]], betont: [0, 0],
    seite: "alpha/verteilapparat/", pdf: "alpha/verteilapparat-des-koerpers.pdf", prompt: "alpha/verteilapparat-anwendungsprompt-2.1.0.txt", fassung: "Anwendungsprompt 2.1.0", stand: "fertig",
    anwendung: "Ein Fall aus Medizin, Pflege, Schule, Sport, Behörde oder Kunst, in dem ein Körper etwas meldet. Der Prompt verfolgt die Meldung über die Schwellen und zeigt, wo sie verschwindet oder sich durchsetzt.",
    bild: "b/bilder/raster/verteilapparat.svg", bildDunkel: "b/bilder/raster/verteilapparat-dunkel.svg", bildAlt: "Der Verteilapparat des Körpers, gezeichnet: sieben Schwellen; eine Meldung läuft hindurch, an einigen Schwellen bleibt eine Spur zurück",
    bewegung: "So arbeitet das Raster: Eine Meldung des Körpers geht über sieben Schwellen; an jeder kann sie weiterkommen, verändert werden oder verschwinden.", ergebnis: "den Weg der Meldung über die sieben Schwellen, wo sie verschwindet oder sich durchsetzt, und das Feld, in dem sie landet." },
  { slug: "gesellschaftskonzepte", name: "Prüfraster für Gesellschaftskonzepte", kurz: "Einheit, Operation, Vermittlung.",
    text: "Ein voraussetzungsarmer Vorfilter für Ansätze, die eine Gesellschaftsdiagnose beanspruchen: Was gilt als Einheit der Gesellschaft, welche Operation hält sie am Laufen, und wie wird zwischen beidem vermittelt? In Arbeit, Fassung 0.4.",
    seite: "alpha/gesellschaftskonzepte/", pdf: "alpha/pruefraster-gesellschaftskonzepte-0.4.pdf", prompt: "alpha/gesellschaftskonzepte-anwendungsprompt-0.4.0.md", fassung: "Anwendungsprompt 0.4.0", stand: "in Arbeit",
    anwendung: "Ein Buch, ein Essay, ein Programm, das sagt, wie die Gesellschaft ist oder sein soll. Der Prompt prüft, ob die drei Fragen beantwortet sind, bevor er weiterliest.",
    bild: "b/bilder/raster/gesellschaftskonzepte.svg", bildDunkel: "b/bilder/raster/gesellschaftskonzepte-dunkel.svg", bildAlt: "Prüfraster für Gesellschaftskonzepte, gezeichnet: drei Kreise im Dreieck, verbunden; ein Lauf prüft sie der Reihe nach",
    bewegung: "So arbeitet das Raster: Drei Fragen der Reihe nach, Einheit, Operation, Vermittlung; erst wenn alle drei beantwortet sind, lohnt das Weiterlesen.", ergebnis: "ob Einheit, Operation und Vermittlung benannt sind, wo der Ansatz schweigt und ob er als Gesellschaftsdiagnose weiterzulesen ist." },
  { slug: "journalistische-texte", name: "Prüfraster journalistischer Texte", kurz: "Ereignis, Kontext, Übergang, Gegenprobe, Systembezüge.",
    text: "Wie macht ein journalistischer Text aus ausgewähltem Material eine Aussage, welche Unterscheidungen tragen diese Aussage, und was könnte ihre Geltung begrenzen oder verändern? Zwölf Verfahren der Gegenprobe und ein ausfüllbares Fallblatt. In Arbeit, Fassung 0.4.",
    seite: "alpha/journalistische-texte/", pdf: null, prompt: "alpha/journalistische-texte-anwendungsprompt-0.4.0.md", raster: "alpha/pruefraster-journalistische-texte-0.4.md", fassung: "Anwendungsprompt 0.4.0", stand: "in Arbeit",
    anwendung: "Ein Artikel, eine Reportage, ein Kommentar. Der Prompt liest ihn entlang von Ereignis, Kontext und Übergang und macht die Gegenprobe.",
    bild: "b/bilder/raster/journalistische-texte.svg", bildDunkel: "b/bilder/raster/journalistische-texte-dunkel.svg", bildAlt: "Prüfraster journalistischer Texte, gezeichnet: ein Text aus Zeilen; eine Marke geht die Zeilen durch, eine Zeile wird gegengeprüft",
    bewegung: "So arbeitet das Raster: Es sucht im Text das Ereignis, markiert den Kontext, folgt dem Übergang zur Aussage und macht die Gegenprobe.", ergebnis: "Ereignis, Kontext und Übergang des Textes, die zwölf Verfahren der Gegenprobe und das ausgefüllte Fallblatt." },
];

/** Die vier Leistungen (Wunsch vom 20. Oktober 2026: das Geschäft sind Webdesign, Vermittlung und Beratung, kuratorische Projekte und der
 *  Verkauf von Produkten; Soziale Arbeit, Maltherapie und die Stationen sind der Hintergrund dazu, siehe UEBER).
 *  Jeder Eintrag hat einen Gestaltungsdialog: drei Fragen mit Wahlen, aus denen ein Briefing entsteht. */
export const ANGEBOTE = [
  { slug: "webdesign", name: "Webdesign", kurz: "Websites und Apps: schnell, eigenständig, ohne Dienste von aussen.",
    text: "Eine Website, die in unter einer Sekunde da ist und nichts von Dritten lädt: keine Cookies, keine Werbung, keine Tracker, Schriften und Skripte auf dem eigenen Server. Dazu Apps, die im Browser laufen, sich auf den Startbildschirm legen lassen und ohne Netz weiterarbeiten. Gestaltet und gebaut aus einer Hand, vom ersten Gespräch bis zur Veröffentlichung, mit allem, was Suchmaschinen und Teilen brauchen. Diese Seite hier ist das Beispiel, die sieben Apps sind es auch.",
    fuer: "Für Künstler:innen, Praxen, Vereine, Galerien, Museen, Schulen und kleine Unternehmen, die eine Adresse brauchen, die bleibt, oder ein Werkzeug, das nicht in einem App-Store wohnt.",
    ablauf: ["Ein Gespräch über das, was die Seite oder die App tun soll, und für wen.", "Ein Entwurf im Browser, zum Anfassen, nicht als Bild; bei Apps ein lauffähiger Prototyp innert Tagen.", "Bau, Texte, Bilder, Veröffentlichung auf der eigenen Adresse; danach bleibt alles in deiner Hand."],
    dialog: [
      { frage: "Was soll entstehen?", wahlen: ["eine Website", "eine App", "beides", "weiss ich noch nicht"] },
      { frage: "Was gibt es schon?", wahlen: ["nichts", "eine alte Seite", "Texte und Bilder", "ein Logo und Farben"] },
      { frage: "Wie gross?", wahlen: ["eine Seite oder ein Werkzeug", "fünf bis zehn Seiten", "mit Shop oder Datenbank", "offen"] },
    ] },
  { slug: "vermittlung", name: "Vermittlung und Beratung", kurz: "Seminare, Workshops, Projekte mit Schulen und Teams; Beratung für Institutionen.",
    text: "Halbe Tage, ganze Tage, Projektwochen oder Reihen: Beobachten zweiter Ordnung, Systemtheorie ohne Hürden, Kunst als Werkzeug für Gruppen. Dazu Beratung für Wohnheime, Werkstätten, Stiftungen und Schulen, die Kunst zu einem Teil ihrer Arbeit machen wollen: ein Atelier aufbauen, Werke von Klient:innen zeigen, Maltherapie als Angebot einrichten. Der Hintergrund dafür sind 25 Jahre Soziale Arbeit in Institutionen und die Ausbildung in Maltherapie.",
    fuer: "Für Schulen, Museen, Unternehmen, Verwaltungen, Praxisteams, Weiterbildungen und für Institutionen mit Menschen, die mehr können, als man ihnen zutraut.",
    ablauf: ["Ein Gespräch über die Gruppe oder das Haus und die Frage, die mitkommt.", "Ein Vorschlag mit Ablauf, Dauer, Material und Preis.", "Der Tag, die Woche oder die Begleitung über ein Jahr; zum Schluss eine Präsentation im Haus oder im Netz."],
    dialog: [
      { frage: "Wer?", wahlen: ["eine Schulklasse", "ein Team aus einem Betrieb", "ein Wohnheim, eine Werkstatt, eine Stiftung", "ein offener Kurs"] },
      { frage: "Was?", wahlen: ["ein Seminar oder Workshop", "eine Projektwoche", "ein Atelier aufbauen", "Beratung zu Kunst im Haus"] },
      { frage: "Wie lange?", wahlen: ["zwei Stunden", "ein halber oder ganzer Tag", "eine Reihe", "ein Jahr"] },
    ] },
  { slug: "kuration", name: "Kuratorische Projekte", kurz: "Ausstellungen denken, ordnen, hängen.",
    text: "Vom Konzept bis zur Finissage: Werke auswählen, Räume lesen, Texte schreiben, mit Künstler:innen und Hausherren verhandeln, die Hängung bauen, die Vermittlung mitdenken. Zuletzt «Supervisionen», sechs Monate im Oberen Turm Kaiserstuhl mit neun Künstler:innen, für Pro Kaiserstuhl und die Gemeinde Zurzach (2026), davor ein Jahr lang Werke von Klient:innen im Behmen in Aarau, für das BKS Aargau und die Stiftung FARO (2024).",
    fuer: "Für Gemeinden, Kunsträume, Galerien, Stiftungen, Firmen mit Räumen und Künstler:innen, die eine Ausstellung nicht allein stemmen wollen.",
    ablauf: ["Ein Rundgang durch den Raum, mit dem Thema im Kopf.", "Konzept, Auswahl und Ablauf als Papier, Budget und Termine dazu.", "Aufbau, Eröffnung, Begleitprogramm, Abbau."],
    referenzen: [["2026", "«Supervisionen», Oberer Turm, Kaiserstuhl: sechs Monate, neun Künstler:innen; für Pro Kaiserstuhl, Gemeinde Zurzach"], ["2024", "Ausstellung mit Werken von Klient:innen, Behmen, Aarau: ein Jahr; für das BKS Aargau und die Stiftung FARO"]],
    dialog: [
      { frage: "Welcher Raum?", wahlen: ["ein Haus mit Geschichte", "ein White Cube", "ein öffentlicher Ort", "ein Büro oder Betrieb"] },
      { frage: "Wer stellt aus?", wahlen: ["eine Person", "eine Gruppe", "eine Sammlung", "offen"] },
      { frage: "Wann?", wahlen: ["in drei Monaten", "in einem Jahr", "nächstes Jahr", "offen"] },
    ] },
  { slug: "produkte", name: "Produkte", kurz: "Werke, Prints, Editionen und Auftragsarbeiten, klassisch und digital.",
    text: "Werke auf Papier und Leinwand, Prints in kleinen Auflagen, Installationen mit Bild, Bewegung und Ton, Arbeiten für Räume und Bildschirme. Dazu Editionen aus dem Zettelkasten: das Buch, das Kartenset, das Poster und die Notizbücher, gedruckt auf Bestellung. Bestellt wird per Mail, bezahlt per QR-Rechnung oder TWINT; Versand in der Schweiz inbegriffen. Auftragsarbeiten für Häuser, Firmen und Private nach Gespräch.",
    fuer: "Für Sammler:innen, Architekt:innen, Firmen, Gemeinden, Häuser und für alle, die ein Werk oder ein Buch für einen bestimmten Ort suchen.",
    ablauf: ["Aussuchen auf der Seite «Werke» oder ein Gespräch über den Ort und das, was er braucht.", "Bestellung per Mail, Bestätigung mit Rechnung; bei Auftragsarbeiten ein Entwurf als Skizze oder bewegte Vorschau.", "Versand versichert, oder Werk, Montage und Übergabe mit Zertifikat."],
    dialog: [
      { frage: "Was?", wahlen: ["ein Print oder Original", "ein Buch, Karten, ein Poster", "eine Auftragsarbeit", "etwas für einen Bildschirm"] },
      { frage: "Für welchen Ort?", wahlen: ["eine Wohnung", "ein Büro oder Empfang", "einen öffentlichen Raum", "ein Geschenk"] },
      { frage: "Wie viele?", wahlen: ["eines", "eine kleine Reihe", "eine Auflage", "offen"] },
    ] },
];

/** Produkte der Werkstatt (Print on Demand). Die Dateien erzeugt tools/build-b-pod.mjs; die Angaben sind für Amazon KDP vorbereitet. */
export const PRODUKTE = [
  { slug: "zu-seiner-zeit-buch", name: "Zettelkasten", untertitel: "49 Zettel zu Operation, Kunst, Gesellschaft und künstlicher Kommunikation", art: "Taschenbuch, 6 × 9 Zoll (15,24 × 22,86 cm), Innenteil schwarzweiss",
    datei: "pod/zu-seiner-zeit-buch-innen.pdf", cover: "pod/zu-seiner-zeit-buch-cover.pdf",
    beschreibung: "Sieben Zyklen, sieben Strophen je Zyklus: 49 Zettel von der Brücke bis zur Zukunft. Jeder Zettel hat einen Leitsatz, einen Text von rund hundert Wörtern und vier Verweise in Soziologie, Philosophie, Kunst und Literatur. Ein Zettelkasten zum Lesen in jeder Reihenfolge.",
    schlagworte: ["Systemtheorie", "Zettelkasten", "Kunsttheorie", "Soziologie", "Künstliche Kommunikation", "Plattform", "Beobachtung"],
    kategorien: ["Sachbuch › Soziologie › Theorie", "Kunst › Kunsttheorie"], preis: "CHF 19.90 / EUR 18.90 (Vorschlag)" },
  { slug: "zu-seiner-zeit-karten", name: "Zettelkasten – 49 Karten", untertitel: "Ein Zettelkasten als Kartenset", art: "49 Karten A6, Vorderseite Leitsatz, Rückseite Text; als PDF zum Druck",
    datei: "pod/zu-seiner-zeit-karten.pdf",
    beschreibung: "Die 49 Leitsätze als Karten: ziehen, legen, verbinden. Auf der Rückseite der ganze Zettel. Für Seminare, Ateliers und den Schreibtisch.",
    schlagworte: ["Kartenset", "Impulskarten", "Seminar", "Systemtheorie", "Kunst", "Coaching", "Zettelkasten"],
    kategorien: ["Spiele und Karten"], preis: "CHF 29.– (Vorschlag)" },
  { slug: "das-feld-poster", name: "Das Feld", untertitel: "Die 49 Zettel als Ornament, A2", art: "Poster A2 (420 × 594 mm), schwarz auf weiss, als PDF zum Druck",
    datei: "pod/das-feld-a2.pdf",
    beschreibung: "Sieben mal sieben: alle 49 Titel und Leitsätze auf einem Blatt, als Feld. Zum Aufhängen im Atelier, im Büro, im Seminarraum.",
    schlagworte: ["Poster", "Typografie", "Systemtheorie", "Zettelkasten", "Ornament", "Kunstdruck", "Beobachtung"],
    kategorien: ["Wandbilder und Poster"], preis: "CHF 39.– (Vorschlag)" },
  { slug: "notizbuecher", name: "Sieben Notizbücher", untertitel: "Ein Umschlag je Zyklus", art: "Notizbuch 6 × 9 Zoll, 120 Seiten liniert; Umschläge als PDF (KDP-Vorlage mit Rücken 0,3 Zoll)",
    datei: "pod/notizbuch-umschlaege.pdf",
    beschreibung: "Sieben Notizbücher, eines je Zyklus: Operation, Rekursion, Adresse, Koppelung, Kunst, Plattform, Zukunft. Auf dem Umschlag der Name des Zyklus, sein Satz und das Ornament seiner sieben Zettel.",
    schlagworte: ["Notizbuch", "Journal", "Systemtheorie", "Kunst", "Ornament", "Geschenk", "Zettelkasten"],
    kategorien: ["Schreibwaren"], preis: "CHF 12.90 je Buch (Vorschlag)" },
];

/** Über Christian Strickler. Nur, was belegt ist (Impressum, Termine, Video «Mensch, Niklas!»). */
export const UEBER = {
  text: [
    "Christian Strickler lebt und arbeitet zwischen Zürich, Basel und Aarau. Er macht Theorie zu Dingen, die man anfassen kann: einen Zettelkasten, ein Rad, das Künstler:innen und Theoretiker:innen zusammenbringt, Farbräder mit Übungen, Maschinen, die aus Fotos und Tönen Bilder machen, und Prüfraster, mit denen sich Theorien, Texte und Körperereignisse befragen lassen.",
    "Vier Leistungen: Webdesign, Vermittlung und Beratung, kuratorische Projekte und Produkte. Er gestaltet und baut Websites und Apps, leitet Seminare und Projekte mit Schulen und Teams, berät Institutionen, die Kunst zu einem Teil ihrer Arbeit machen wollen, kuratiert Ausstellungen und verkauft Werke, Prints und Editionen.",
    "Alles auf dieser Seite läuft ohne Dienste von aussen: keine Cookies, keine Werbung, keine Tracker. Besuche werden ohne Cookies gezählt. Die Apps rechnen auf deinem Gerät; deine Bilder verlassen es nicht.",
  ],
  hintergrund: {
    titel: "Hintergrund",
    text: [
      "Seit 1998 arbeitet er in der Sozialen Arbeit, in Wohnheimen, Werkstätten und Stiftungen für Menschen mit Behinderung: Stiftung Wagerenhof, NOVEOS Zürcher Oberland, wohnstätten zwyssig, Stiftung Züriwerk, Stiftung Kind & Autismus, Stiftung FARO in Windisch. Dort hat er Ateliers aufgebaut, Werke von Klient:innen gezeigt und gelernt, wie Kunst in einem Haus wirkt, das nicht für Kunst gebaut ist.",
      "Dazu kommen das Studium der Germanistik an der Universität Zürich (1994–1998), die Fachhochschule für Soziale Arbeit St. Gallen (2011–2013) und die Ausbildung in Maltherapie am iac Zürich (2022–2025).",
      "Kuratorisch zuletzt: ein Jahr lang Werke von Klient:innen im Behmen in Aarau, für das BKS Aargau und die Stiftung FARO (2024), und «Supervisionen» im Oberen Turm Kaiserstuhl, sechs Monate, neun Künstler:innen, für Pro Kaiserstuhl und die Gemeinde Zurzach (2026).",
    ],
  },
  liste: { titel: "Wenn etwas fertig ist, schreibe ich", text: "Kein Rhythmus und keine Ankündigungen. Eine kurze Mail, wenn ein Raster, eine App oder ein Text so weit ist, dass man damit arbeiten kann.", mailto: "mailto:hansnoed@gmail.com?subject=Liste&body=Bitte%20nimm%20mich%20in%20die%20Liste%20auf." },
};

/** Stichworte für Suchmaschinen je Seite (Deutschschweiz zuerst). */
export const SEO = {
  start: "Christian Strickler Zürich Basel Aarau, Webdesign Aargau, App Design Schweiz, Kuration Ausstellung, Systemtheorie Zettelkasten, Kunst und Theorie",
};
