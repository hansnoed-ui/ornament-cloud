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

// Ansichten der Ausstellung «Supervisionen» (Oberer Turm Kaiserstuhl, 2026), von Christian am 13. November 2026 geschickt («bitte alle angemessen filtern
// und präsentieren»). Zwölf von zwanzig: Bilder mit erkennbaren Gesichtern, die Ansicht aus einem anderen Raum und der Aufbau im Erdgeschoss fehlen,
// «turm-figuren» ist auf die Figuren zugeschnitten (ohne die Person daneben). Die Werke an den Wänden stammen von den ausstellenden Künstler:innen; die
// Beschreibungen nennen niemanden. Steht nur auf der Leistung «Kuratorische Projekte», nicht in der Galerie auf «Werke».
export const AUSSTELLUNG = [
  { slug: "turm-raum", gruppe: "supervisionen", titel: { de: "Der Raum", en: "The room" },
    alt: { de: "Ein Raum mit rohen Kalkwänden, Holzboden und schweren Deckenbalken; an zwei Wänden hängen sieben Gemälde, links zwei abstrakte in Blau und Gelbgrün, rechts ein liegender Körper vor einem Mond über Wolken", en: "A room with rough lime walls, a wooden floor and heavy ceiling beams; seven paintings hang on two walls, two abstract ones in blue and yellow-green on the left, a reclining body before a moon above clouds on the right" } },
  { slug: "turm-besuch", gruppe: "supervisionen", titel: { de: "Zu zweit", en: "In pairs" },
    alt: { de: "Zwei Besucherinnen stehen mit dem Rücken zur Kamera vor einem grünen, aus Farbfeldern gebauten Gemälde; links ein tiefes Fenster in der Turmmauer", en: "Two visitors stand with their backs to the camera in front of a green painting built from fields of colour; a deep window in the tower wall on the left" } },
  { slug: "turm-treppe", gruppe: "supervisionen", titel: { de: "Neben der Treppe", en: "Beside the stairs" },
    alt: { de: "Links dunkles Holz einer Treppe, rechts an der rohen Wand ein gerahmtes Bild: eine liegende Figur aus Stein im Gras", en: "Dark wood of a staircase on the left, on the rough wall to the right a framed picture: a reclining stone figure in grass" } },
  { slug: "turm-stuehle-2", gruppe: "supervisionen", titel: { de: "Zwei Stühle", en: "Two chairs" },
    alt: { de: "Zwei schwarze Stühle stehen vor zwei Bildern mit weichen Farbverläufen in Gelb, Rosa und Grau an einer rohen Wand", en: "Two black chairs stand before two pictures with soft gradients in yellow, pink and grey on a rough wall" } },
  { slug: "turm-figuren", gruppe: "supervisionen", titel: { de: "Schwebend", en: "Suspended" },
    alt: { de: "Kleine weisse Figuren, halb Tier, halb Pflanze, hängen an feinen Drähten und Messingstäben vor dunklem Holz", en: "Small white figures, half animal, half plant, hang from fine wires and brass rods in front of dark wood" } },
  { slug: "turm-gelaender", gruppe: "supervisionen", titel: { de: "Über dem Geländer", en: "Above the railing" },
    alt: { de: "Über einem dunklen Holzgeländer hängen zwei Bilder: links geometrische Flächen in Orange und Blau mit gelber Sonne, rechts eine Stadt aus Kuppeln unter einer goldenen Scheibe", en: "Above a dark wooden railing hang two pictures: geometric planes in orange and blue with a yellow sun on the left, a city of domes under a golden disc on the right" } },
  { slug: "turm-gespraech", gruppe: "supervisionen", titel: { de: "Am Bild", en: "At the picture" },
    alt: { de: "Zwischen hängenden dunklen Formen aus Metall hindurch gesehen: zwei Menschen von hinten vor einem hellen Gemälde, einer zeigt auf eine Stelle; daneben ein Bild in Türkis und Grau", en: "Seen through hanging dark metal shapes: two people from behind in front of a pale painting, one pointing at a spot; beside it a picture in turquoise and grey" } },
  { slug: "turm-strahler", gruppe: "supervisionen", titel: { de: "Vier Blätter", en: "Four sheets" },
    alt: { de: "Vier gerahmte Drucke mit Stillleben aus Krügen und Schalen an einer rötlichen Wand, im Vordergrund ein Strahler an einer schwarzen Schiene", en: "Four framed prints with still lifes of jugs and bowls on a reddish wall, a spotlight on a black rail in the foreground" } },
  { slug: "turm-stuehle-1", gruppe: "supervisionen", titel: { de: "Schwarz, Weiss, Rot", en: "Black, white, red" },
    alt: { de: "Ein grosses Gemälde in Schwarz, Weiss und Rot hängt an der rohen Wand, zwei kleinere Bilder lehnen am Boden, vorn zwei schwarze Stühle und der Schatten eines Geländers", en: "A large painting in black, white and red hangs on the rough wall, two smaller pictures lean on the floor, two black chairs and the shadow of a railing in front" } },
  { slug: "turm-balken", gruppe: "supervisionen", titel: { de: "Zwischen den Balken", en: "Between the beams" },
    alt: { de: "Blick schräg zwischen dunklen Holzbalken hindurch auf ein tiefblaues Bild mit gelben Spuren und ein gelbgrünes daneben", en: "A slanted view between dark wooden beams onto a deep blue picture with yellow traces and a yellow-green one beside it" } },
  { slug: "turm-schienen", gruppe: "supervisionen", titel: { de: "Drei Köpfe", en: "Three heads" },
    alt: { de: "Zwischen schwarzen Lichtschienen hindurch gesehen: drei kleine Bilder an der Wand, ein Frauenkopf in Pink und Gelb, ein schwarzes Tier mit Krone vor türkisfarbenen Streifen, ein Kopf einer Statue", en: "Seen between black lighting rails: three small pictures on the wall, a woman's head in pink and yellow, a black animal with a crown before turquoise stripes, the head of a statue" } },
  { slug: "turm-ecke", gruppe: "supervisionen", titel: { de: "In der Ecke", en: "In the corner" },
    alt: { de: "Eine Ecke des Turmraums: links ein grosses Bild mit gelbem und blauem Licht, rechts eine weisse Linienzeichnung auf schwarzem Grund", en: "A corner of the tower room: a large picture with yellow and blue light on the left, a white line drawing on a black ground on the right" } },
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
