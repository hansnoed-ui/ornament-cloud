// Fotografien von Christian Strickler für den Neubau (13. November 2026: «Nimm noch etwas zum Thema Fotographie: Angebote/Werke»). Die Reihenfolge hier
// ist die Reihenfolge der Galerie auf «Werke». «gruppe» wählt aus, was wo steht: die Bühnenbilder auch auf der Leistung «Fotografie», «start»: true auf
// der Startseite. Titel und Bildbeschreibungen sind von Claude nach den Bildern geschrieben, von Christian am 13. November 2026 gutgeheissen («ok»);
// die Bühnenbilder sind offiziell für die Kaiserbühne (kaiserbuehne.ch) entstanden («kann man lassen»). Stück und Jahr fehlen; die Beschreibungen nennen niemanden. Vorlagen in src/b/fotos/, Grössen und Masse von tools/b-fotos.mjs.
export const FOTOS = [
  { slug: "buehne-3", gruppe: "buehne", fuer: { de: "für die Kaiserbühne", en: "for the Kaiserbühne" }, start: true, titel: { de: "Bühne III", en: "Stage III" },
    alt: { de: "Schwarzweiss: ein Mann kauert in einem grossen Rad aus Metallringen auf einer Steinmauer und hält sich oben fest; hinten sitzt ein Mann mit Mütze, rechts eine Frau mit einem Buch", en: "Black and white: a man crouches inside a large wheel of metal rings on a stone wall, holding on above; a man with a cap sits behind, a woman with a book on the right" } },
  { slug: "billardzimmer", gruppe: "raum", start: true, titel: { de: "Billardzimmer", en: "Billiard room" },
    alt: { de: "Ein hohes Fenster mit rot-weiss gestreiften Vorhängen zwischen dunkler Tapete, links ein ovaler Spiegel, rechts eine leuchtende Stehlampe, vorn die Ecke eines Billardtischs", en: "A tall window with red and white striped curtains between dark wallpaper, an oval mirror on the left, a glowing floor lamp on the right, the corner of a billiard table in front" } },
  { slug: "buehne-1", gruppe: "buehne", fuer: { de: "für die Kaiserbühne", en: "for the Kaiserbühne" }, titel: { de: "Bühne I", en: "Stage I" },
    alt: { de: "Bühnenszene in blauem Licht: eine Frau in gemustertem Kleid wirft den Kopf zurück und schreit, ein Mann mit Schirmmütze hält sie an den Schultern", en: "Stage scene in blue light: a woman in a patterned dress throws her head back and screams, a man in a cap holds her by the shoulders" } },
  { slug: "meer", gruppe: "landschaft", start: true, titel: { de: "Meer", en: "Sea" },
    alt: { de: "Dunkle Wolken über türkisfarbenem Meer, am Horizont ein heller Streifen", en: "Dark clouds over a turquoise sea, a bright band at the horizon" } },
  { slug: "hund-und-objektiv", gruppe: "ding", start: true, titel: { de: "Hund und Objektiv", en: "Dog and lens" },
    alt: { de: "Ein schwarzer Hund schnuppert an einem alten Objektiv, das auf einem Holzboden steht", en: "A black dog sniffs at an old lens standing on a wooden floor" } },
  { slug: "buehne-2", gruppe: "buehne", fuer: { de: "für die Kaiserbühne", en: "for the Kaiserbühne" }, titel: { de: "Bühne II", en: "Stage II" },
    alt: { de: "Schwarzweiss: eine Frau mit Locken steht lächelnd im Licht, im Vordergrund der Rücken eines Mannes im hellen Hemd, dazwischen ein Bogen aus Metallrohren", en: "Black and white: a woman with curls stands smiling in the light, in the foreground the back of a man in a light shirt, between them an arch of metal tubes" } },
  { slug: "see-und-berge", gruppe: "landschaft", titel: { de: "See und Berge", en: "Lake and mountains" },
    alt: { de: "Ein See vor einem bewaldeten Hügel mit Häusern am Ufer, dahinter blaue Berge unter Wolken", en: "A lake in front of a wooded hill with houses on the shore, blue mountains under clouds behind" } },
];

// Ansichten der Ausstellung «Supervisionen» (Oberer Turm Kaiserstuhl, 2026). Am 13. November 2026 zuerst zwölf Handybilder, am Abend von Christian
// ersetzt («Hier bitte die Bilder der Ausstellung ersetzen mit diesen», «mehr folgen»): sieben bearbeitete Aufnahmen, dann zwei weitere. Auf «turm-am-bild»
// und «turm-kreise» sind Besucherinnen zu erkennen; Christian hat die Bilder ausdrücklich geschickt. Die Werke an den Wänden stammen von den ausstellenden Künstler:innen; die
// Beschreibungen nennen niemanden. Steht auf der Leistung «Kuratorische Projekte» und (die ersten sechs) auf «Sehen», nicht in der Galerie auf «Werke».
export const AUSSTELLUNG = [
  { slug: "turm-ansicht", gruppe: "supervisionen", titel: { de: "Der Turm", en: "The tower" },
    alt: { de: "Durch Blätter gesehen: der Obere Turm von Kaiserstuhl aus Stein mit roter Uhr über den Dächern der Altstadt, dahinter Wald und Felder", en: "Seen through leaves: the stone Oberer Turm of Kaiserstuhl with its red clock above the roofs of the old town, forest and fields behind" } },
  { slug: "turm-leer", gruppe: "supervisionen", titel: { de: "Der Raum", en: "The room" },
    alt: { de: "Schwarzweiss: ein hoher Turmraum mit rohen Wänden und Balkendecke, in der Mitte ein Holzpfosten, rechts ein einzelner Stuhl, an der Wand lehnt ein Gemälde neben einem kleinen Fenster", en: "Black and white: a tall tower room with rough walls and a beamed ceiling, a wooden post in the centre, a single chair on the right, a painting leaning against the wall beside a small window" } },
  { slug: "turm-ecke", gruppe: "supervisionen", titel: { de: "In der Ecke", en: "In the corner" },
    alt: { de: "Eine Ecke des Turmraums: links ein grosses Bild mit gelbem und blauem Licht, rechts eine weisse Linienzeichnung auf schwarzem Grund", en: "A corner of the tower room: a large picture with yellow and blue light on the left, a white line drawing on a black ground on the right" } },
  { slug: "turm-blaetter", gruppe: "supervisionen", titel: { de: "Vor den Blättern", en: "Before the sheets" },
    alt: { de: "Drei Menschen von hinten vor gerahmten Blättern mit dunklen runden Formen, eine Frau zeigt auf ein Blatt; im Vordergrund die Scheiben eines Mobiles", en: "Three people from behind in front of framed sheets with dark round shapes, a woman pointing at one; the discs of a mobile in the foreground" } },
  { slug: "turm-farben", gruppe: "supervisionen", titel: { de: "Farbflächen", en: "Fields of colour" },
    alt: { de: "Ein Gemälde aus geschwungenen Farbflächen in Blau, Rot, Gelb und Orange an der rohen Wand, davor ein Tisch mit drei Blättern in Passepartouts", en: "A painting of curved fields of colour in blue, red, yellow and orange on the rough wall, a table with three matted sheets in front" } },
  { slug: "turm-am-bild", gruppe: "supervisionen", titel: { de: "Im Gespräch", en: "In conversation" },
    alt: { de: "Zwei Frauen stehen nah vor einem Gemälde in hellen Blau- und Sandtönen, eine streckt die Hand zur Leinwand aus", en: "Two women stand close to a painting in pale blue and sand tones, one reaching her hand towards the canvas" } },
  { slug: "turm-stillleben", gruppe: "supervisionen", titel: { de: "Vor den Stillleben", en: "Before the still lifes" },
    alt: { de: "Eine Frau im gemusterten Kleid steht mit dem Rücken zur Kamera vor vier gerahmten Blättern mit Stillleben aus Krügen, Flaschen und Schalen", en: "A woman in a patterned dress stands with her back to the camera in front of four framed sheets with still lifes of jugs, bottles and bowls" } },
  { slug: "turm-kreise", gruppe: "supervisionen", titel: { de: "Vor den Kreisen", en: "Before the circles" },
    alt: { de: "Zwei Frauen im Gespräch vor einer Reihe kleiner gerahmter Blätter mit Kreisen und Scheiben, eine erklärt mit den Händen", en: "Two women in conversation in front of a row of small framed sheets with circles and discs, one explaining with her hands" } },
  { slug: "turm-blau", gruppe: "supervisionen", klein: true, titel: { de: "Vier Bilder", en: "Four pictures" },
    alt: { de: "Eine Ecke des Turmraums mit vier Gemälden: links Felder in Gold und Schwarz, daneben ein tiefblaues Hochformat, rechts ein Wirbel in Blau und ein kleines Bild in Grau und Rosa; darüber schwarze Lichtschienen", en: "A corner of the tower room with four paintings: fields of gold and black on the left, a deep blue upright beside it, a swirl of blue and a small picture in grey and pink on the right; black lighting rails above" } },
  { slug: "turm-koepfe", gruppe: "supervisionen", titel: { de: "Zwei Köpfe", en: "Two heads" },
    alt: { de: "An der rohen Wand zwei gemalte Köpfe in Braun- und Violetttönen, links im Anschnitt ein Bild mit gelben Spuren auf dunklem Grün", en: "Two painted heads in browns and violets on the rough wall, on the left the edge of a picture with yellow traces on dark green" } },
  { slug: "turm-plakat", gruppe: "supervisionen", klein: true, titel: { de: "Das Plakat", en: "The poster" },
    alt: { de: "Das Plakat der Ausstellung in einem Schaufenster: «Supervisionen», 2. Mai bis 4. Oktober 2026, Oberer Turm Kaiserstuhl, mit vier Namen; in der Scheibe spiegelt sich ein Haus mit roten Fensterrahmen", en: "The exhibition poster in a shop window: «Supervisionen», 2 May to 4 October 2026, Oberer Turm Kaiserstuhl, with four names; a house with red window frames is reflected in the glass" } },
  { slug: "turm-karte", gruppe: "supervisionen", titel: { de: "Die Karte", en: "The card" },
    alt: { de: "Eine Hand hält Postkarten zur Ausstellung: eine gestickt wirkende Ansicht von Kaiserstuhl am Rhein mit Hase, Einhorn und Blumen auf schwarzem Grund, darunter der Schriftzug Supervisionen", en: "A hand holds postcards for the exhibition: an embroidered-looking view of Kaiserstuhl on the Rhine with a hare, a unicorn and flowers on a black ground, the word Supervisionen below" } },
];

// Prints (13. November 2026: Christian schickt acht Motive mit dem einen Wort «Prints»). Stehen auf «Werke» unter «Prints und Originale», ohne Bildzeile:
// Titel, Technik, Format, Auflage und Preis hat Christian noch nicht genannt; die «titel» hier sind Arbeitsnamen von Claude für Tooltip und Anker.
export const PRINTS = [
  { slug: "print-kueste", gruppe: "print", titel: { de: "Küste", en: "Coast" },
    alt: { de: "Geometrische Flächen in Orange, Blau und Braun: eine Küste mit Häusern, eine orange Sonne, in der blauen Mitte kleine Segel und ein Gesicht", en: "Geometric planes in orange, blue and brown: a coast with houses, an orange sun, small sails and a face in the blue centre" } },
  { slug: "print-linien", gruppe: "print", titel: { de: "Linien", en: "Lines" },
    alt: { de: "Weisse Linien auf Schwarz: ein dichtes Geflecht aus Schraffuren, Spiralen und Bändern, aus dem ein Gesicht im Profil tritt", en: "White lines on black: a dense weave of hatching, spirals and ribbons from which a face in profile emerges" } },
  { slug: "print-kopf-blau", gruppe: "print", titel: { de: "Kopf in Blau", en: "Head in blue" },
    alt: { de: "Ein gemalter Kopf mit blauem Gesicht, roten Lippen und zwei verschiedenen Augen vor hellblauem Grund, darüber zwei gelbe Scheiben an einem schwarzen Stab", en: "A painted head with a blue face, red lips and two different eyes on a pale blue ground, two yellow discs on a black rod above" } },
  { slug: "print-fragmente", gruppe: "print", titel: { de: "Fragmente", en: "Fragments" },
    alt: { de: "Vier farbige Formen auf Schwarz, aus Feldern in Pink, Rot, Orange und Blau gefügt, mit feiner Schraffur", en: "Four coloured shapes on black, joined from fields of pink, red, orange and blue, with fine hatching" } },
  { slug: "print-gruen", gruppe: "print", titel: { de: "Grün", en: "Green" },
    alt: { de: "Eine abstrakte Fläche: oben Grün in Flecken, zur Mitte hin hell, unten Blaugrün, wie ein Garten im Wasser gespiegelt", en: "An abstract surface: patches of green above, pale towards the middle, blue-green below, like a garden mirrored in water" } },
  { slug: "print-kopf-pink", gruppe: "print", titel: { de: "Kopf in Pink", en: "Head in pink" },
    alt: { de: "Ein grob gerasterter Frauenkopf in Schwarz und Weiss vor zwei grossen Kreisen aus feinen Ringen in Pink und Gelb", en: "A coarsely rasterised woman's head in black and white before two large circles of fine rings in pink and yellow" } },
  { slug: "print-schwarzweiss", gruppe: "print", titel: { de: "Schwarz und Weiss", en: "Black and white" },
    alt: { de: "Eine schwarze Form auf Weiss, von weissen Linien geteilt: Augen, ein Fisch, Zähne, Spiralen und Fächer greifen ineinander", en: "A black shape on white divided by white lines: eyes, a fish, teeth, spirals and fans interlock" } },
  { slug: "print-raster", gruppe: "print", titel: { de: "Raster", en: "Grid" },
    alt: { de: "Weiche Farbfelder in Rot, Gelb, Blau und Weiss hinter einem feinen Raster, wie durch geriffeltes Glas gesehen", en: "Soft fields of red, yellow, blue and white behind a fine grid, as if seen through ribbed glass" } },
];
