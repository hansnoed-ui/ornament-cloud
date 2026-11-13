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
