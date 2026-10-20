// Inhalte des Neubaus unter /b/ (Entwurf vom 20. Oktober 2026, siehe docs/superpowers/specs/2026-10-20-b-neubau-design.md).
// Alles Eigene steht hier: Verzeichnis der Apps, Raster, Angebote und Produkte sowie die Texte dazu. Die Zettel, ORNA und ORMA
// kommen unverändert aus ihren Quellen (src/data/, src/doppelspalt/, src/orma/) und stehen nicht hier.
// Die Texte zu Therapie, Seminaren, Kuration und Kunstpädagogik sind Entwürfe ohne Angaben zu Ausbildung, Setting und Preisen –
// Christian ergänzt oder streicht.

export const SEITE = {
  name: "ornament.cloud",
  adresse: "https://ornament.cloud/b/",
  claim: "Beobachtung ist Anlass für Veränderung in der Realität.",
  beschreibung: "Kunst, Design, Webdesign, Therapie und Theorie an einem Ort: 49 Zettel, Apps zum Spielen und Gestalten, Prüfraster zum Hinsehen und sieben Angebote von Christian Strickler, Kaiserstuhl.",
  person: { name: "Christian Strickler", ort: "Kaiserstuhl AG, Schweiz", strasse: "Rheingasse 8b", plz: "CH-5466 Kaiserstuhl", mail: "hansnoed@gmail.com" },
  sprache: "de-CH",
};

/** Der Dialog auf der Startseite: Was bringst du mit? Jede Wahl führt auf einen Weg aus drei Stationen. */
export const DIALOG = {
  frage: "Was bringst du mit?",
  wahlen: [
    { id: "bild", wort: "ein Bild", satz: "Ein Bild will sich bewegen.", weg: [["b/apps/phorma-ii/", "PHORMA II: eine Linie wächst und zeichnet dein Foto"], ["b/apps/the-fictory/", "The Fictory: das Bild zerfällt und setzt sich neu zusammen"], ["b/angebot/kunstprojekte/", "Ein Bild wird ein Werk: künstlerische Projekte"]] },
    { id: "frage", wort: "eine Frage", satz: "Eine Frage sucht ein Gegenüber.", weg: [["b/apps/orna/", "ORNA: eine Drehung, eine Begegnung, eine offene Frage"], ["b/zettel/", "Der Zettelkasten: 49 Zettel, die aneinander anschliessen"], ["b/angebot/begleitung/", "Ein Gespräch, das die Frage ernst nimmt"]] },
    { id: "auftrag", wort: "einen Auftrag", satz: "Etwas soll gebaut werden.", weg: [["b/angebot/websites/", "Websites: schnell, eigenständig, ohne Dienste von aussen"], ["b/angebot/apps/", "Apps im Browser, die auch ohne Netz laufen"], ["b/angebot/", "Alle sieben Angebote und der Weg zum Briefing"]] },
    { id: "begriff", wort: "einen Begriff", satz: "Ein Begriff will geprüft werden.", weg: [["b/zettel/", "Im Feld nachsehen: 49 Begriffe von der Brücke bis zur Zukunft"], ["b/raster/", "Vier Prüfraster für Theorien, Texte und Körper"], ["b/apps/orma/", "ORMA: zu zweit antworten, aufdecken, weiterdenken"]] },
    { id: "gruppe", wort: "eine Gruppe", satz: "Eine Klasse, ein Team, ein Haus.", weg: [["b/angebot/seminare/", "Seminare und Weiterbildung: Beobachten lernen"], ["b/apps/omna-color/", "OMNA COLOR: 180 Gestaltungsübungen aus zwei Farbrädern"], ["b/angebot/kunstpaedagogik/", "Kunstpädagogische Projekte für Schulen und Museen"]] },
  ],
};

/** Die sieben Apps. Sie bleiben, wie sie sind; hier steht nur ihre Darstellung. */
export const APPS = [
  { slug: "orna", name: "ORNA", werk: "Nebeneinander, Nacheinander", gattung: "Text und Theorie", kurz: "Eine Drehung, eine Begegnung, eine offene Frage.",
    text: "Zwei Ringe drehen gegeneinander: aussen zwanzig Künstler:innen, innen zwanzig Theoretiker:innen. Wo sie stehen bleiben, steht eine Konstellation aus dem kuratierten Bestand von 326: ein kurzer Text und eine Frage, die offen bleibt. Das Rad erzeugt keine Antworten, es erzeugt Konstellationen.",
    fuer: "Für alle, die mit einem Gedanken anfangen wollen und nicht mit einer Lösung.",
    url: "portfolio/nebeneinander-nacheinander/", app: "portfolio/nebeneinander-nacheinander/app/", feld: "portfolio/nebeneinander-nacheinander/feld/", bild: "assets/og-nebeneinander-nacheinander.png", bildAlt: "Das Doppelrad von ORNA mit vierzig Zeichen",
    zeichen: "rad" },
  { slug: "orma", name: "ORMA", werk: "Nebeneinander, Nacheinander", gattung: "Text und Theorie", kurz: "Zehn Minuten zu zweit. Zwei Sichtweisen. Ein neuer Gedanke.",
    text: "Ein Kunst- und Denkspiel für zwei Personen an einem Gerät: drehen, lesen, einen Auftrag wählen, getrennt antworten, aufdecken, weiterdenken. Allein spielst du «Re-Entry»: Bringt das Rad dieselbe Konstellation wieder, antwortest du noch einmal, ohne die erste Antwort zu sehen. Ohne Punkte, ohne Zeitdruck, ohne Bewertung.",
    fuer: "Für Paare, Freund:innen, Kolleg:innen, Seminare und für alle, die mit sich selbst ins Gespräch kommen wollen.",
    url: "alpha/orma/", app: "alpha/orma/", bild: "alpha/orma-facebook-1200x630.jpg", bildAlt: "Das Symbol von ORMA, in der Mitte geteilt: links schwarz auf weiss, rechts weiss auf schwarz",
    zeichen: "orma" },
  { slug: "omna-color", name: "OMNA COLOR", gattung: "Gestaltung", kurz: "Zwei Farbräder, 180 Gestaltungsübungen.",
    text: "Zwei Farbräder mit sieben Themen drehen gegeneinander: Farbe, Linie, Form, Raum und Material, Zeit und Körper, Zufall, Symbol und Würdigung. Zeigen sie zwei Farben, verbindet die Übung beide Themen; zeigen sie dieselbe, bleibt es beim reinen Thema. Jede Übung nennt Material, Schritte, Dauer und eine Frage zum Schluss.",
    fuer: "Für Ateliers, Schulklassen, Workshops und für alle, die mit den Händen denken.",
    url: "alpha/omna-color/", app: "alpha/omna-color/app/", bild: "assets/vorschau-omna-color-app.jpg", bildAlt: "Die zwei Farbräder von OMNA COLOR",
    zeichen: "farbe" },
  { slug: "phorma-i", name: "PHORMA I", gattung: "Bild und Video", kurz: "Ein Foto zerfällt in Linien, Formen und Farben.",
    text: "Aus einem Foto wird ein Film: Es zerfällt in Linien, Formen und Farben, verwandelt sich in Funken, Glas, Scherben, Echo und Gebirge oder wird im Flug erkundet. Das Ergebnis ist ein Video im Hochformat für Social Media. Alles rechnet auf deinem Gerät; das Bild verlässt es nicht.",
    fuer: "Für alle, die aus einem Bild ein Reel machen wollen, ohne Schnittprogramm.",
    url: "alpha/bildfragmentieren/", app: "alpha/bildfragmentieren/app/", bild: "assets/vorschau-phorma-i.jpg", bildAlt: "Ein Standbild aus PHORMA I: ein Foto, zerlegt in Linien und Scherben",
    zeichen: "scherbe" },
  { slug: "phorma-ii", name: "PHORMA II", gattung: "Bild und Video", kurz: "Eine leuchtende Linie wächst und zeichnet dein Foto.",
    text: "Eine Linie wächst und zeichnet das Bild, ein Schleimpilz findet seine Formen, eine Lichtebene tastet die Tiefe ab, das Bild weht als Seidentuch oder zerfällt im Takt in Rechtecke. Jeder Effekt einzeln oder als Kette, aus Foto oder Video. Ein Video im Hochformat, gerechnet auf der eigenen Grafikkarte.",
    fuer: "Für Künstler:innen, Galerien und Museen, die ein Werk in Bewegung zeigen wollen.",
    url: "alpha/phorma-ii/", bild: "assets/vorschau-phorma-ii.jpg", bildAlt: "Ein Standbild aus PHORMA II: Nachtblau mit weissen und kupfernen Linienbündeln",
    zeichen: "linie" },
  { slug: "phorma-iii", name: "PHORMA III", gattung: "Bild und Video", kurz: "Aus Klang wird Bild.",
    text: "Zu Musik oder einer Stimme entstehen Gewebe aus feinen Linien, ein Faden im Würfel aus Licht oder glänzende Perlen in einer Kugel aus Fäden; ein Video wird gescratcht und verfrickelt. Das Ergebnis ist ein Video mit Ton. Das Intro der bisherigen Website ist damit gerechnet.",
    fuer: "Für Musiker:innen, Sprecher:innen und alle, die zu einem Ton ein Bild brauchen.",
    url: "alpha/phorma-iii/", app: "alpha/phorma-iii/app/", bild: "assets/vorschau-phorma-iii.jpg", bildAlt: "Ein Standbild aus PHORMA III: glänzende Perlen in einer Kugel aus Fäden",
    zeichen: "faden" },
  { slug: "the-fictory", name: "The Fictory", gattung: "Bild und Video", kurz: "Ein Bild zerfällt, ordnet sich neu und setzt sich wieder zusammen.",
    text: "Leg ein Bild auf die Werkbank: Es zerfällt in seine Teile, ordnet sich neu, hinterlässt Spuren und setzt sich am Ende neu zusammen. Eine Animation, sechs Standbilder und ein Video. Wer will, gibt eine Regel aus ORNA mit; sie bestimmt den Eingriff.",
    fuer: "Für alle, die sehen wollen, was ein Bild noch sein könnte.",
    url: "alpha/the-fictory/", app: "alpha/the-fictory/app/", bild: "assets/vorschau-the-fictory-app.jpg", bildAlt: "Ein Standbild aus The Fictory: ein Bild in Teilen auf der Werkbank",
    zeichen: "teile" },
];

/** Die vier Prüfraster (Masterprompts). Prompt und Papier liegen weiter unter alpha/. */
export const RASTER = [
  { slug: "nebeneinander-nacheinander", name: "Nebeneinander und Nacheinander", kurz: "Verräumlichung und Verzeitlichung als Achsen.",
    text: "Ordnet Theorien, Kunstpraxen und andere Ansätze danach, wie sie Verräumlichung und Verzeitlichung ins Verhältnis setzen. Vier Felder: Ereignis, Doppelspalt, Stilles Operieren, Ordnung. Das Raster ist die Grundlage von ORNA und ORMA.",
    achsen: { x: "Verräumlichung", y: "Verzeitlichung" }, felder: [["Ereignis", "Doppelspalt"], ["Stilles Operieren", "Ordnung"]], betont: [0, 1],
    seite: "alpha/pruefraster/", pdf: "alpha/pruefraster-nebeneinander-nacheinander.pdf", prompt: "alpha/pruefraster-anwendungsprompt-3.2.0.md", fassung: "Anwendungsprompt 3.2.0", stand: "fertig",
    anwendung: "Eine Theorie, eine Kunstpraxis, ein Manifest oder eine eigene Arbeitsweise. Der Prompt fragt nach den Unterscheidungen, mit denen der Ansatz Raum und Zeit erzeugt, und setzt ihn ins Feld." },
  { slug: "verteilapparat", name: "Der Verteilapparat des Körpers", kurz: "Wessen Körperereignis kommt wie weit?",
    text: "Ein Prüfinstrument dafür, wessen Körperereignis wie weit kommt, unter welcher Beschreibung, wer sie berichtigen kann und was daraus materiell folgt. Sieben Schwellen, Stimme gegen Messung, vier Felder: Ausgeliefertsein, Verhandelbare Teilhabe, Verschwinden, Privilegierte Opazität.",
    achsen: { x: "Selbstbeschreibung", y: "Fremderfassung" }, felder: [["Ausgeliefertsein", "Verhandelbare Teilhabe"], ["Verschwinden", "Privilegierte Opazität"]], betont: [0, 0],
    seite: "alpha/verteilapparat/", pdf: "alpha/verteilapparat-des-koerpers.pdf", prompt: "alpha/verteilapparat-anwendungsprompt-2.1.0.txt", fassung: "Anwendungsprompt 2.1.0", stand: "fertig",
    anwendung: "Ein Fall aus Medizin, Pflege, Schule, Sport, Behörde oder Kunst, in dem ein Körper etwas meldet. Der Prompt verfolgt die Meldung über die Schwellen und zeigt, wo sie verschwindet oder sich durchsetzt." },
  { slug: "gesellschaftskonzepte", name: "Prüfraster für Gesellschaftskonzepte", kurz: "Einheit, Operation, Vermittlung.",
    text: "Ein voraussetzungsarmer Vorfilter für Ansätze, die eine Gesellschaftsdiagnose beanspruchen: Was gilt als Einheit der Gesellschaft, welche Operation hält sie am Laufen, und wie wird zwischen beidem vermittelt? In Arbeit, Fassung 0.4.",
    seite: "alpha/gesellschaftskonzepte/", pdf: "alpha/pruefraster-gesellschaftskonzepte-0.4.pdf", prompt: "alpha/gesellschaftskonzepte-anwendungsprompt-0.4.0.md", fassung: "Anwendungsprompt 0.4.0", stand: "in Arbeit",
    anwendung: "Ein Buch, ein Essay, ein Programm, das sagt, wie die Gesellschaft ist oder sein soll. Der Prompt prüft, ob die drei Fragen beantwortet sind, bevor er weiterliest." },
  { slug: "journalistische-texte", name: "Prüfraster journalistischer Texte", kurz: "Ereignis, Kontext, Übergang, Gegenprobe, Systembezüge.",
    text: "Wie macht ein journalistischer Text aus ausgewähltem Material eine Aussage, welche Unterscheidungen tragen diese Aussage, und was könnte ihre Geltung begrenzen oder verändern? Zwölf Verfahren der Gegenprobe und ein ausfüllbares Fallblatt. In Arbeit, Fassung 0.4.",
    seite: "alpha/journalistische-texte/", pdf: null, prompt: "alpha/journalistische-texte-anwendungsprompt-0.4.0.md", raster: "alpha/pruefraster-journalistische-texte-0.4.md", fassung: "Anwendungsprompt 0.4.0", stand: "in Arbeit",
    anwendung: "Ein Artikel, eine Reportage, ein Kommentar. Der Prompt liest ihn entlang von Ereignis, Kontext und Übergang und macht die Gegenprobe." },
];

/** Die sieben Angebote. Jeder Eintrag hat einen Gestaltungsdialog: drei Fragen mit Wahlen, aus denen ein Briefing entsteht. */
export const ANGEBOTE = [
  { slug: "websites", name: "Websites", kurz: "Schnell, eigenständig, ohne Dienste von aussen.",
    text: "Eine Website, die in unter einer Sekunde da ist und nichts von Dritten lädt: keine Cookies, keine Werbung, keine Tracker, Schriften und Skripte auf dem eigenen Server. Gestaltet und gebaut aus einer Hand, vom ersten Gespräch bis zur Veröffentlichung, mit allem, was Suchmaschinen und Teilen brauchen. Diese Seite hier ist das Beispiel.",
    fuer: "Für Künstler:innen, Praxen, Vereine, Galerien, kleine Unternehmen und Projekte, die eine Adresse brauchen, die bleibt.",
    ablauf: ["Ein Gespräch über das, was die Seite tun soll, und für wen.", "Ein Entwurf als Seite im Browser, zum Anfassen, nicht als Bild.", "Bau, Texte, Bilder, Veröffentlichung auf der eigenen Adresse; danach bleibt alles in deiner Hand."],
    beweis: [["b/", "Diese Seite"], ["zu-seiner-zeit/", "Der Zettelkasten in drei Sprachen"], ["art/", "Die Seite «Art» mit Bestellung ohne Dienst"]],
    dialog: [
      { frage: "Was soll die Seite zuerst?", wahlen: ["zeigen, was ich mache", "etwas verkaufen", "Termine und Anmeldungen", "ein Archiv ordnen"] },
      { frage: "Was gibt es schon?", wahlen: ["nichts", "eine alte Seite", "Texte und Bilder", "ein Logo und Farben"] },
      { frage: "Wie gross?", wahlen: ["eine Seite", "fünf bis zehn Seiten", "mit Shop oder Datenbank", "weiss ich noch nicht"] },
    ] },
  { slug: "apps", name: "Apps", kurz: "Im Browser, installierbar, auch ohne Netz.",
    text: "Kleine Anwendungen, die im Browser laufen, sich auf den Startbildschirm legen lassen und ohne Netz weiterarbeiten: Werkzeuge, Spiele, Instrumente. Rechnen auf dem Gerät, keine Anmeldung, keine Daten, die das Gerät verlassen. Sieben davon stehen hier zum Ausprobieren.",
    fuer: "Für Museen, Schulen, Verlage, Praxen und für alle, die ein Werkzeug brauchen, das nicht in einem App-Store wohnt.",
    ablauf: ["Ein Gespräch über die eine Sache, die die App tun soll.", "Ein lauffähiger Prototyp innert Tagen, auf dem eigenen Telefon.", "Ausbau in Schritten, jeder Schritt öffentlich erreichbar."],
    beweis: [["b/apps/", "Die sieben Apps"], ["b/apps/orma/", "ORMA: ein Spiel ohne Server"], ["b/apps/phorma-iii/", "PHORMA III: Ton wird Bild, auf der Grafikkarte"]],
    dialog: [
      { frage: "Was für eine App?", wahlen: ["ein Werkzeug", "ein Spiel", "ein Instrument für Bild oder Ton", "eine Begleitung durch einen Ort"] },
      { frage: "Für wen?", wahlen: ["Besucher:innen", "Schüler:innen", "Kund:innen", "mich selbst"] },
      { frage: "Wo läuft sie?", wahlen: ["auf dem Telefon", "auf einem Bildschirm im Raum", "am Computer", "überall"] },
    ] },
  { slug: "kuration", name: "Kuration", kurz: "Ausstellungen denken, ordnen, hängen.",
    text: "Vom Konzept bis zur Finissage: Werke auswählen, Räume lesen, Texte schreiben, mit Künstler:innen und Hausherren verhandeln, die Hängung bauen, die Vermittlung mitdenken. Zuletzt «Supervisionen 2026» im Oberen Turm Kaiserstuhl mit neun Künstler:innen, im Auftrag von Pro Kaiserstuhl.",
    fuer: "Für Gemeinden, Kunsträume, Galerien, Firmen mit Räumen und Künstler:innen, die eine Ausstellung nicht allein stemmen wollen.",
    ablauf: ["Ein Rundgang durch den Raum, mit dem Thema im Kopf.", "Konzept, Auswahl und Ablauf als Papier, Budget und Termine dazu.", "Aufbau, Eröffnung, Begleitprogramm, Abbau."],
    beweis: [["termine/", "Supervisionen 2026, Oberer Turm Kaiserstuhl"], ["b/apps/orna/", "ORNA: Konstellationen als Ausstellungsprinzip"], ["b/werke/", "Eigene Werke"]],
    dialog: [
      { frage: "Welcher Raum?", wahlen: ["ein Haus mit Geschichte", "ein White Cube", "ein öffentlicher Ort", "ein Büro oder Betrieb"] },
      { frage: "Wer stellt aus?", wahlen: ["eine Person", "eine Gruppe", "eine Sammlung", "offen"] },
      { frage: "Wann?", wahlen: ["in drei Monaten", "in einem Jahr", "nächstes Jahr", "offen"] },
    ] },
  { slug: "begleitung", name: "Therapeutische Begleitung", kurz: "Gespräche in Übergängen.",
    text: "Gespräche für Menschen in einem Übergang: eine Arbeit endet, eine Krankheit verändert den Alltag, eine Beziehung ordnet sich neu, ein Werk will nicht weiter. Beobachten, was ist, bevor etwas anders wird. Wer will, arbeitet mit Bildern, Material und den Instrumenten dieser Seite. Einzeln oder in kleinen Gruppen.",
    fuer: "Für Erwachsene, die eine Zeit lang jemanden brauchen, der zuhört und mitdenkt, und für Fachpersonen, die Supervision suchen.",
    ablauf: ["Ein erstes Gespräch, unverbindlich, am Telefon oder in Kaiserstuhl.", "Eine Vereinbarung: wie oft, wie lange, was es kostet.", "Gespräche in einem Rhythmus, der sich dem Übergang anpasst."],
    beweis: [["b/apps/orma/", "ORMA allein: Re-Entry"], ["b/zettel/46-die-unterbrechung/", "Zettel 46: Die Unterbrechung"], ["b/raster/verteilapparat/", "Der Verteilapparat des Körpers"]],
    hinweis: "Angaben zu Ausbildung, Setting, Kosten und Krankenkasse folgen.",
    dialog: [
      { frage: "Worum geht es?", wahlen: ["einen Übergang", "eine Entscheidung", "ein Werk, das stockt", "Supervision"] },
      { frage: "Wie?", wahlen: ["einzeln", "zu zweit", "in einer kleinen Gruppe", "weiss ich noch nicht"] },
      { frage: "Wo?", wahlen: ["in Kaiserstuhl", "am Telefon oder per Video", "bei mir", "offen"] },
    ] },
  { slug: "seminare", name: "Seminare und Weiterbildung", kurz: "Beobachten lernen, mit Kunst und Theorie.",
    text: "Halbe Tage, ganze Tage oder Reihen: Beobachten zweiter Ordnung, Systemtheorie ohne Hürden, Kunst als Werkzeug für Teams. Gearbeitet wird mit ORNA, ORMA, OMNA COLOR und den Prüfrastern, nicht mit Folien. Jede Gruppe geht mit etwas heim, das sie selbst gemacht hat.",
    fuer: "Für Unternehmen, Verwaltungen, Schulen, Museen, Praxisteams und Weiterbildungen, die eine andere Art von Workshop suchen.",
    ablauf: ["Ein Gespräch über die Gruppe und die Frage, die sie mitbringt.", "Ein Vorschlag mit Ablauf, Dauer, Material und Preis.", "Der Tag; danach eine kurze Nachlese per Mail."],
    beweis: [["b/apps/omna-color/", "OMNA COLOR: 180 Übungen"], ["b/apps/orma/", "ORMA zu zweit"], ["b/raster/", "Die vier Prüfraster"]],
    dialog: [
      { frage: "Welche Gruppe?", wahlen: ["ein Team aus einem Betrieb", "ein Kollegium", "Studierende", "ein offener Kurs"] },
      { frage: "Welches Thema?", wahlen: ["Beobachten und Entscheiden", "Kreativität und Material", "Theorie, die man anfassen kann", "ein eigenes Thema"] },
      { frage: "Wie lange?", wahlen: ["zwei Stunden", "ein halber Tag", "ein ganzer Tag", "eine Reihe"] },
    ] },
  { slug: "kunstpaedagogik", name: "Kunstpädagogik", kurz: "Projekte mit Schulen und Museen.",
    text: "Projektwochen, Ateliers und Vermittlungsformate, in denen Kinder und Jugendliche mit Linie, Farbe, Material und Bildschirm arbeiten: von der Übung aus OMNA COLOR bis zum Reel aus PHORMA. Die Instrumente sind da, die Themen kommen aus der Klasse.",
    fuer: "Für Schulen, Museen, Jugendarbeit und Ferienangebote.",
    ablauf: ["Ein Gespräch mit der Lehrperson oder der Vermittlung.", "Ein Ablauf für die Tage, mit Material und Technik, die vor Ort ist.", "Die Tage selbst, mit einer Präsentation zum Schluss, im Haus oder im Netz."],
    beweis: [["b/apps/omna-color/", "OMNA COLOR"], ["b/apps/phorma-i/", "PHORMA I: ein Foto wird ein Film"], ["b/apps/the-fictory/", "The Fictory"]],
    dialog: [
      { frage: "Welche Stufe?", wahlen: ["Primarschule", "Sekundarstufe", "Gymnasium oder Berufsschule", "gemischt"] },
      { frage: "Welche Form?", wahlen: ["eine Projektwoche", "ein Nachmittag", "eine Reihe über ein Semester", "ein Angebot im Museum"] },
      { frage: "Womit?", wahlen: ["mit Papier, Farbe, Material", "mit dem Telefon", "mit beidem", "offen"] },
    ] },
  { slug: "kunstprojekte", name: "Künstlerische Projekte", kurz: "Klassisch und digital, im Auftrag oder frei.",
    text: "Werke auf Papier und Leinwand, Prints in kleinen Auflagen, Installationen mit Bild, Bewegung und Ton, Arbeiten für Räume und Bildschirme. Auftragsarbeiten für Häuser, Firmen und Private; eigene Reihen, die hier zu sehen und zu kaufen sind.",
    fuer: "Für Sammler:innen, Architekt:innen, Firmen, Gemeinden und Häuser, die ein Werk für einen bestimmten Ort suchen.",
    ablauf: ["Ein Gespräch über den Ort und das, was er braucht.", "Ein Entwurf, als Skizze oder als bewegte Vorschau.", "Das Werk, die Montage, die Übergabe mit Zertifikat."],
    beweis: [["b/werke/", "Werke und Prints"], ["werke/stellenfeld/", "Stellenfeld: sechs Stationen in 3D"], ["b/apps/phorma-ii/", "PHORMA II"]],
    dialog: [
      { frage: "Was für ein Werk?", wahlen: ["ein Bild", "ein Print in Auflage", "eine Installation mit Bewegung", "etwas für einen Bildschirm"] },
      { frage: "Für welchen Ort?", wahlen: ["eine Wohnung", "ein Büro oder Empfang", "einen öffentlichen Raum", "das Netz"] },
      { frage: "Wie gross?", wahlen: ["klein", "eine Wand", "ein Raum", "offen"] },
    ] },
];

/** Produkte der Werkstatt (Print on Demand). Die Dateien erzeugt tools/build-b-pod.mjs; die Angaben sind für Amazon KDP vorbereitet. */
export const PRODUKTE = [
  { slug: "zu-seiner-zeit-buch", name: "Zu seiner Zeit", untertitel: "49 Zettel zu Operation, Kunst, Gesellschaft und künstlicher Kommunikation", art: "Taschenbuch, 6 × 9 Zoll (15,24 × 22,86 cm), Innenteil schwarzweiss",
    datei: "pod/zu-seiner-zeit-buch-innen.pdf", cover: "pod/zu-seiner-zeit-buch-cover.pdf",
    beschreibung: "Sieben Zyklen, sieben Strophen je Zyklus: 49 Zettel von der Brücke bis zur Zukunft. Jeder Zettel hat einen Leitsatz, einen Text von rund hundert Wörtern und vier Verweise in Soziologie, Philosophie, Kunst und Literatur. Ein Zettelkasten zum Lesen in jeder Reihenfolge.",
    schlagworte: ["Systemtheorie", "Luhmann", "Zettelkasten", "Kunsttheorie", "Soziologie", "Künstliche Kommunikation", "Plattform"],
    kategorien: ["Sachbuch › Soziologie › Theorie", "Kunst › Kunsttheorie"], preis: "CHF 19.90 / EUR 18.90 (Vorschlag)" },
  { slug: "zu-seiner-zeit-karten", name: "Zu seiner Zeit – 49 Karten", untertitel: "Ein Zettelkasten als Kartenset", art: "49 Karten A6, Vorderseite Leitsatz, Rückseite Text; als PDF zum Druck",
    datei: "pod/zu-seiner-zeit-karten.pdf",
    beschreibung: "Die 49 Leitsätze als Karten: ziehen, legen, verbinden. Auf der Rückseite der ganze Zettel. Für Seminare, Ateliers und den Schreibtisch.",
    schlagworte: ["Kartenset", "Impulskarten", "Seminar", "Systemtheorie", "Kunst", "Coaching", "Zettelkasten"],
    kategorien: ["Spiele und Karten"], preis: "CHF 29.– (Vorschlag)" },
  { slug: "das-feld-poster", name: "Das Feld", untertitel: "Die 49 Zettel als Ornament, A2", art: "Poster A2 (420 × 594 mm), schwarz auf weiss, als PDF zum Druck",
    datei: "pod/das-feld-a2.pdf",
    beschreibung: "Sieben mal sieben: alle 49 Titel und Leitsätze auf einem Blatt, als Feld. Zum Aufhängen im Atelier, im Büro, im Seminarraum.",
    schlagworte: ["Poster", "Typografie", "Systemtheorie", "Zettelkasten", "Ornament", "Kunstdruck", "Luhmann"],
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
    "Christian Strickler arbeitet in Kaiserstuhl am Rhein. Er liest seit über zehn Jahren Niklas Luhmann und macht daraus Dinge, die man anfassen kann: einen Zettelkasten, ein Rad, das Künstler:innen und Theoretiker:innen zusammenbringt, Farbräder mit Übungen, Maschinen, die aus Fotos und Tönen Bilder machen, und Prüfraster, mit denen sich Theorien, Texte und Körperereignisse befragen lassen.",
    "Er gestaltet und baut Websites und Apps, kuratiert Ausstellungen, zuletzt «Supervisionen 2026» im Oberen Turm Kaiserstuhl im Auftrag von Pro Kaiserstuhl, und vertritt den FARO Kunstraum im Netzwerk inklusive Kultur. Dazu kommen Seminare, kunstpädagogische Projekte und Gespräche für Menschen in Übergängen.",
    "Alles auf dieser Seite läuft ohne Dienste von aussen: keine Cookies, keine Werbung, keine Tracker. Besuche werden ohne Cookies gezählt. Die Apps rechnen auf deinem Gerät; deine Bilder verlassen es nicht.",
  ],
  liste: { titel: "Wenn etwas fertig ist, schreibe ich", text: "Kein Rhythmus und keine Ankündigungen. Eine kurze Mail, wenn ein Raster, eine App oder ein Text so weit ist, dass man damit arbeiten kann.", mailto: "mailto:hansnoed@gmail.com?subject=Liste&body=Bitte%20nimm%20mich%20in%20die%20Liste%20auf." },
};

/** Stichworte für Suchmaschinen je Seite (Deutschschweiz zuerst). */
export const SEO = {
  start: "Christian Strickler Kaiserstuhl, Webdesign Aargau, App Design Schweiz, Kuration Ausstellung, Systemtheorie Luhmann Zettelkasten, Kunst und Theorie",
};
