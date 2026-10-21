// Contents of the new site under /b/en/ (20 October 2026, wish: «die ganze Seite auf Englisch übersetzen»): the English counterpart of src/b/inhalt.mjs,
// same structure, same slugs, same images and files. Only the words change. The notes come from src/data/zu-seiner-zeit.en.json (tools/b-daten.mjs);
// the apps, the prompts and the social media posts stay in German, the pages say so. Examples from ORNA, ORMA and OMNA COLOR are translated here
// (art "texte"), because the apps' data has no English.
import { PRODUKTE } from "./inhalt.mjs";
export { PRODUKTE };

export const SEITE = {
  name: "ornament.cloud",
  adresse: "https://ornament.cloud/b/en/",
  claim: "Observation is an occasion for change in reality.",
  titel: "Designing, teaching, curating.",
  lead: "Web design, education and consulting, curatorial projects and products, made in Switzerland. Plus a Zettelkasten, seven apps and four test grids that show how work is done here.",
  claimAlt: "Theory you can touch.",
  beschreibung: "49 notes, seven apps, four test grids and four services, made in Switzerland: web design, education and consulting, curatorial projects, products.",
  person: { name: "Christian Strickler", ort: "between Zurich, Basel and Aarau", strasse: "Rheingasse 8b", plz: "CH-5466 Kaiserstuhl", mail: "hansnoed@gmail.com" },
  sprache: "en",
};

export const DIALOG = {
  frage: "What do you bring along?",
  wahlen: [
    { id: "bild", wort: "an image", satz: "An image wants to move.", weg: [["b/en/apps/phorma-ii/", "PHORMA II: a line grows and draws your photo"], ["b/en/apps/the-fictory/", "The Fictory: the image falls apart and reassembles"], ["b/en/angebot/produkte/", "An image becomes a work: commissions and prints"]] },
    { id: "frage", wort: "a question", satz: "A question is looking for a counterpart.", weg: [["b/en/apps/orna/", "ORNA: one turn, one encounter, one open question"], ["b/en/zettel/", "The Zettelkasten: 49 notes that connect to each other"], ["b/en/angebot/vermittlung/", "A conversation that takes the question seriously"]] },
    { id: "auftrag", wort: "a commission", satz: "Something is to be built.", weg: [["b/en/angebot/webdesign/", "Websites and apps: fast, independent, no outside services"], ["b/en/angebot/produkte/", "A work for a particular place"], ["b/en/angebot/", "All four services and the way to a briefing"]] },
    { id: "begriff", wort: "a concept", satz: "A concept wants to be tested.", weg: [["b/en/zettel/", "Look it up in the field: 49 concepts from the bridge to the future"], ["b/en/raster/", "Four test grids for theories, texts and bodies"], ["b/en/apps/orma/", "ORMA: answer in pairs, reveal, think on"]] },
    { id: "gruppe", wort: "a group", satz: "A class, a team, an institution.", weg: [["b/en/angebot/vermittlung/", "Education and consulting: seminars, projects, studios in institutions"], ["b/en/apps/omna-color/", "OMNA COLOR: 180 design exercises from two colour wheels"], ["b/en/angebot/kuration/", "An institution wants to exhibit: curatorial projects"]] },
  ],
};

export const APPS = [
  { slug: "orna", name: "ORNA", werk: "Nebeneinander, Nacheinander", gattung: "Text and theory", kurz: "One turn, one encounter, one open question.",
    text: "Two rings turn against each other: twenty artists on the outside, twenty theorists on the inside. Where they come to rest, a constellation from the curated stock of 326 appears: a short text and a question that stays open. The wheel does not produce answers, it produces constellations.",
    fuer: "For everyone who wants to begin with a thought rather than a solution.",
    url: "portfolio/nebeneinander-nacheinander/", app: "portfolio/nebeneinander-nacheinander/?installieren", feld: "portfolio/nebeneinander-nacheinander/feld/", bild: "b/bilder/apps/orna.svg", bildDunkel: "b/bilder/apps/orna-dunkel.svg", bildAlt: "ORNA, drawn: two rings of twenty fields each, turned against each other; where they come to rest, the encounter in blue",
    beispiele: { art: "texte", stuecke: [
      { titel: "Agnes Martin × Niklas Luhmann", text: "Agnes Martin offers the eye an extremely stable order of lines, intervals and repetitions. Niklas Luhmann distinguishes perception and communication as different operations: communication can presuppose perception and react to it, but cannot carry it out itself. Martin's paintings make this boundary immediately palpable. One can describe grids, dimensions and materials; that does not repeat what someone saw in front of the painting. At the same time, it is precisely the stable form that can trigger ever new events of perception.", frage: "How can a perception be communicated when the perception itself cannot be conveyed?", link: "portfolio/nebeneinander-nacheinander/?pair=agnes-martin__niklas-luhmann", linkText: "This constellation on the wheel (in German)" },
      { titel: "Sol LeWitt × George Spencer-Brown", text: "George Spencer-Brown begins with a distinction: a boundary is drawn, and with it two sides come into being. Sol LeWitt also frequently begins with a formal stipulation, an instruction, a grid, particular lines or rules of combination. What becomes decisive is what happens to this stipulation in execution. LeWitt himself stresses that different executants understand the same instruction differently and that even the same person never realises the same plan twice identically; plan and execution nevertheless remain related. Spencer-Brown makes the operation of distinction formally determinable, while LeWitt lets us observe what happens to a determination once it has to be carried out. The rule stabilises a space of possibility, but it does not fully contain its concrete actualisation.", frage: "Where does the form lie: in the rule or in its execution?", link: "portfolio/nebeneinander-nacheinander/?pair=sol-lewitt__george-spencer-brown", linkText: "This constellation on the wheel (in German)" },
      { titel: "Mona Hatoum × Hannah Arendt", text: "Hannah Arendt describes a common world as something that at once connects people and separates them, like a table around which different positions are gathered. Mona Hatoum keeps turning precisely familiar things and spatial orders into precarious situations. The shared object then guarantees no shared experience. People can stand in front of the same thing and still be affected by it in completely different ways. Spatial togetherness and a shared world come apart.", frage: "What makes a space common when the people in it cannot appear under the same conditions?", link: "portfolio/nebeneinander-nacheinander/?pair=mona-hatoum__hannah-arendt", linkText: "This constellation on the wheel (in German)" },
    ] },
    bewegung: "How ORNA works: two rings turn against each other and run down. Where they come to rest, two signs meet – a constellation.",
    zeichen: "rad" },
  { slug: "orma", name: "ORMA", werk: "Nebeneinander, Nacheinander", gattung: "Text and theory", kurz: "Ten minutes in pairs. Two points of view. One new thought.",
    text: "An art and thinking game for two people at one device: turn, read, choose a task, answer separately, reveal, think on. Alone, you play «Re-Entry»: if the wheel brings the same constellation again, you answer once more without seeing your first answer. No points, no time pressure, no grading.",
    fuer: "For couples, friends, colleagues, seminars and for everyone who wants to get into conversation with themselves.",
    url: "alpha/orma/", app: "alpha/orma/?installieren", bild: "b/bilder/apps/orma.svg", bildDunkel: "b/bilder/apps/orma-dunkel.svg", bildAlt: "ORMA, drawn: a circle divided in the middle, paper on the left, ink on the right; two people at one table",
    beispiele: { art: "texte", eins: true, stuecke: [
      { titel: "Eva Hesse × Susan Leigh Star", klein: "Entry (ORMA editorial text)", text: "Eva Hesse's works age. That confronts museums with practical decisions: how they are conserved, stored and exhibited. Susan Leigh Star studies infrastructures, that is, what provides stability in the background. With Hesse it becomes visible that this care co-determines how a changeable work lives on. The sculpture and its care cannot be fully separated.",
        listeTitel: "Three tasks to choose from", liste: [["example", "Choose an object near you. What would someone have to do so that it still exists in twenty years? What would be allowed to change?"], ["objection", "Care can also falsify a work. Find a case where it would be better to let something age than to preserve it."], ["design", "For an object you both know, write a care instruction in three sentences: one preserves it, one changes it, one leaves open who is responsible."]],
        frage: "Who holds an ageing work together?" },
    ] },
    bewegung: "How ORMA works: two people, two thoughts on one constellation; then the side changes, and the same thought is read from the other – the re-entry.",
    zeichen: "orma" },
  { slug: "omna-color", name: "OMNA COLOR", gattung: "Design", kurz: "Two colour wheels, 180 design exercises.",
    text: "Two colour wheels with seven themes turn against each other: colour, line, form, space and material, time and body, chance, symbol and appreciation. If they show two colours, the exercise links both themes; if they show the same one, it stays with the pure theme. Every exercise names material, steps, duration and a question at the end.",
    fuer: "For studios, school classes, workshops and for everyone who thinks with their hands.",
    url: "alpha/omna-color/", app: "alpha/omna-color/?installieren", bild: "b/bilder/apps/omna-color.svg", bildDunkel: "b/bilder/apps/omna-color-dunkel.svg", bildAlt: "OMNA COLOR, drawn: two wheels of seven fields each, the outer in seven colours, the inner as a line, turned against each other",
    beispiele: { art: "texte", stuecke: [
      { klein: "Colour · 8 minutes", titel: "Collect ten colours", liste: [[null, "Look around you for ten different colours."], [null, "Lay the objects or pieces of paper side by side."], [null, "Arrange them so that similar colours lie together."]], nummeriert: true, nach: "Material: 10 small coloured objects or pieces of paper", frage: "Which colour was the hardest to find?" },
      { klein: "Form · Line · 15 minutes", titel: "Colour in the areas between lines", liste: [[null, "Look in the drawing for areas completely enclosed by lines."], [null, "Colour in these areas."], [null, "Compare the coloured areas with places where there are only lines."]], nummeriert: true, nach: "Material: a line drawing of your own, coloured pencils", frage: "What stands out more after colouring in?" },
      { klein: "Chance · Line · Time & body · 15 minutes", titel: "Paint without a fixed motif", liste: [[null, "Begin with one colour and a first trace."], [null, "Look briefly and decide what you want to add next to it, above it or after it."], [null, "Repeat until you want to stop. No recognisable object needs to emerge."]], nummeriert: true, nach: "Material: paper, watercolours, brush, water", frage: "Which spot led you to a next step?" },
    ] },
    bewegung: "How OMNA COLOR works: two wheels turn against each other. The mark at the top hits two fields, and the two become an exercise.",
    zeichen: "farbe" },
  { slug: "phorma-iii", name: "PHORMA III", gattung: "Image and video", kurz: "Sound becomes image.",
    text: "To music or a voice, weaves of fine lines emerge, a thread in a cube of light or shiny pearls in a sphere of threads; a video is scratched and mangled. The result is a video with sound. The intro of the previous website was computed with it.",
    fuer: "For musicians, speakers and everyone who needs an image for a sound.",
    url: "alpha/phorma-iii/", app: "alpha/phorma-iii/?installieren", bild: "b/bilder/apps/phorma-iii.svg", bildDunkel: "b/bilder/apps/phorma-iii-dunkel.svg", bildAlt: "PHORMA III, drawn: three bands of fine lines like crumpled silk, one in blue",
    beispiele: [
      { art: "video", datei: "assets/start-intro.mp4", bild: "assets/beispiele/phorma-iii-lichtwuerfel.jpg", mass: [540, 676], text: "The cube of light: a thread wanders in a cube of light and settles into the logo; computed from the music, with sound. The intro of the previous website." },
      { art: "video", datei: "assets/beispiele/phorma-iii.mp4", bild: "assets/beispiele/phorma-iii.jpg", mass: [540, 676], text: "Three effects to a short piece of music, cut on the beat: surfaces of fine lines unfold at every onset (Weave), a thread wanders through the cube of light (Odyssey), shiny pearls in a sphere of threads finally string themselves onto the loop of the logo (Grape). Computed from the app, with sound." },
      { art: "video", datei: "assets/beispiele/phorma-iii-traube.mp4", bild: "assets/beispiele/phorma-iii-traube.jpg", mass: [640, 360], text: "The Grape to a piece of music: shining beads in a ball of threads, with depth of field; every strong entry cuts to a new shot, and at the end the beads thread themselves onto the loop of the logo. With sound." },
    ],
    bewegung: "How PHORMA III works, in five effects to the sound: surfaces of fine lines (Weave), a thread in a cube of light, wild or calm (Odyssey, Cube of light), beads in a ball of threads (Grape) or the video itself, scratched and fiddled (Video). Every beat moves the picture. The drawing shows the weave.",
    zeichen: "faden" },
  { slug: "phorma-ii", name: "PHORMA II", gattung: "Image and video", kurz: "Five effects for photo and video: Growth, Physarum, Depth, Cloth, Montage.",
    text: "A line grows and draws the image, a slime mould finds its shapes, a plane of light scans the depth, the image blows in the wind as a silk cloth or falls apart into rectangles in time with the beat. Each effect on its own or as a chain, from photo or video. A portrait-format video, computed on your own graphics card.",
    fuer: "For artists, galleries and museums who want to show a work in motion.",
    url: "alpha/phorma-ii/", app: "alpha/phorma-ii/?installieren", bild: "b/bilder/apps/phorma-ii.svg", bildDunkel: "b/bilder/apps/phorma-ii-dunkel.svg", bildAlt: "PHORMA II, drawn: a single line that has grown from a seed and fills a disc",
    beispiele: [
      { art: "video", datei: "assets/beispiele/phorma-ii.mp4", bild: "assets/beispiele/phorma-ii.jpg", mass: [540, 676], text: "The app's chain with the example photo, three effects in one film: a slime mould lays its network over the shapes (Physarum), a plane of light scans the relief (Depth), the photo blows as a silk cloth and settles flat (Cloth). Computed from the app, without sound." },
      { art: "paar", vorher: "alpha/phorma-ii/beispiel.jpg", nachher: "assets/vorschau-phorma-ii-2x.jpg", text: "The same photo, broken into rectangles with shifted crops, borders and number plates (Montage)." },
    ],
    bewegung: "How PHORMA II works, in five effects, alone or as a chain: a line grows and draws the photo (Growth), a slime mould finds its shapes (Physarum), a plane of light scans the depth (Depth), the photo billows as a silk cloth (Cloth) or breaks into rectangles to the beat (Montage). The drawing shows the growth.",
    zeichen: "linie" },
  { slug: "phorma-i", name: "PHORMA I", gattung: "Image and video", kurz: "A photo becomes a film: Fragments, Transformation or Relief flight.",
    text: "A photo becomes a film: it falls apart into lines, shapes and colours, turns into sparks, glass, shards, echo and mountains, or is explored in flight. The result is a portrait-format video for social media. Everything computes on your device; the image never leaves it.",
    fuer: "For everyone who wants to make a reel from an image, without an editing program.",
    url: "alpha/bildfragmentieren/", app: "alpha/bildfragmentieren/?installieren", bild: "b/bilder/apps/phorma-i.svg", bildDunkel: "b/bilder/apps/phorma-i-dunkel.svg", bildAlt: "PHORMA I, drawn: a crystal of shards, triangles over a disc, one shard in blue",
    beispiele: [
      { art: "video", datei: "assets/beispiele/phorma-i.mp4", bild: "assets/beispiele/phorma-i.jpg", mass: [540, 676], text: "The sequence «Fragments» on a portrait: lines settle into contours, shapes break into shards, then the colours arrive – and at the end the picture. Without sound." },
      { art: "video", datei: "assets/beispiele/phorma-i-verwandlung.mp4", bild: "assets/beispiele/phorma-i-verwandlung.jpg", mass: [540, 676], text: "The sequence «Transformation»: shining sparks stream (Stream), condense into a glass body (Body), it shatters (Shards), the shards trail through a tunnel (Echo), they become mountains with contour lines (Relief) – and lie down flat as the photo. Without sound." },
      { art: "paar", vorher: "alpha/bildfragmentieren/beispiel.jpg", nachher: "assets/vorschau-phorma-i-2x.jpg", text: "A photo becomes a glass crystal: the image lies on the facets, the lines are the edges." },
    ],
    bewegung: "How PHORMA I works, in three sequences: «Fragments» assembles the photo from lines, shapes and colours; «Transformation» leads through sparks, a glass body, shards, echo and mountains to the photo; the «Relief flight» flies over the shapes until the picture lies flat. The drawing shows the shards.",
    zeichen: "scherbe" },
  { slug: "the-fictory", name: "The Fictory", gattung: "Image and video", kurz: "An image falls apart, rearranges itself and comes back together.",
    text: "Put an image on the workbench: it falls apart into its pieces, rearranges itself, leaves traces and in the end reassembles. An animation, six stills and a video. If you like, give it a rule from ORNA; it determines the intervention.",
    fuer: "For everyone who wants to see what else an image could be.",
    url: "alpha/the-fictory/", app: "alpha/the-fictory/?installieren", bild: "b/bilder/apps/the-fictory.svg", bildDunkel: "b/bilder/apps/the-fictory-dunkel.svg", bildAlt: "The Fictory, drawn: a grid of tiles, each wandered and turned away from its origin, with traces and threads",
    beispiele: [
      { art: "video", datei: "assets/beispiele/the-fictory.mp4", bild: "assets/beispiele/the-fictory.jpg", mass: [540, 766], text: "The whole run of 30 seconds with the example image: archive, timeline, traces, couplings, cut – and the image reassembles. Computed from the app." },
      { art: "paar", vorher: "alpha/the-fictory/beispiel.jpg", nachher: "assets/vorschau-the-fictory.jpg", text: "An image on the workbench falls apart into its pieces; each piece becomes a trace." },
    ],
    bewegung: "How The Fictory works: the image falls apart into its pieces, the pieces wander, threads connect them, and in the end the image comes back together.",
    zeichen: "teile" },
];

export const RASTER = [
  { slug: "nebeneinander-nacheinander", name: "Side by Side and One after Another", kurz: "Spatialisation and temporalisation as axes.",
    text: "Orders theories, art practices and other approaches by how they relate spatialisation and temporalisation. Four fields: event, double slit, silent operating, order. The grid is the foundation of ORNA and ORMA.",
    achsen: { x: "Spatialisation", y: "Temporalisation" }, felder: [["Event", "Double slit"], ["Silent operating", "Order"]], betont: [0, 1],
    seite: "alpha/pruefraster/", pdf: "alpha/pruefraster-nebeneinander-nacheinander.pdf", prompt: "alpha/pruefraster-anwendungsprompt-3.2.0.md", fassung: "application prompt 3.2.0", stand: "finished",
    anwendung: "A theory, an art practice, a manifesto or your own way of working. The prompt asks for the distinctions with which the approach produces space and time, and places it in the field.",
    bild: "b/bilder/raster/nebeneinander-nacheinander.svg", bildDunkel: "b/bilder/raster/nebeneinander-nacheinander-dunkel.svg", bildAlt: "Side by Side and One after Another, drawn: two axes, four fields; a point wanders through the field and comes to rest in one field",
    bewegung: "How the grid works: an approach is measured on two axes, spatialisation and temporalisation, and lands in one of the four fields.", ergebnis: "a placement in the field along the eight test questions, short or detailed, with the distinctions that carry the approach." },
  { slug: "verteilapparat", name: "The Distribution Apparatus of the Body", kurz: "Whose bodily event gets how far?",
    text: "A test instrument for whose bodily event gets how far, under which description, who can correct it and what materially follows. Seven thresholds, voice against measurement, four fields: being at the mercy, negotiable participation, disappearance, privileged opacity.",
    achsen: { x: "Self-description", y: "External registration" }, felder: [["Being at the mercy", "Negotiable participation"], ["Disappearance", "Privileged opacity"]], betont: [0, 0],
    seite: "alpha/verteilapparat/", pdf: "alpha/verteilapparat-des-koerpers.pdf", prompt: "alpha/verteilapparat-anwendungsprompt-2.1.0.txt", fassung: "application prompt 2.1.0", stand: "finished",
    anwendung: "A case from medicine, care, school, sport, administration or art in which a body reports something. The prompt follows the report across the thresholds and shows where it disappears or prevails.",
    bild: "b/bilder/raster/verteilapparat.svg", bildDunkel: "b/bilder/raster/verteilapparat-dunkel.svg", bildAlt: "The Distribution Apparatus of the Body, drawn: seven thresholds; a report passes through, at some thresholds a trace remains",
    bewegung: "How the grid works: a report from the body passes seven thresholds; at each it can get through, be changed or disappear.", ergebnis: "the path of the report across the seven thresholds, where it disappears or prevails, and the field in which it lands." },
  { slug: "gesellschaftskonzepte", name: "Test Grid for Concepts of Society", kurz: "Unity, operation, mediation.",
    text: "A low-threshold pre-filter for approaches that claim a diagnosis of society: what counts as the unity of society, which operation keeps it running, and how is mediation between the two achieved? In progress, version 0.4.",
    seite: "alpha/gesellschaftskonzepte/", pdf: "alpha/pruefraster-gesellschaftskonzepte-0.4.pdf", prompt: "alpha/gesellschaftskonzepte-anwendungsprompt-0.4.0.md", fassung: "application prompt 0.4.0", stand: "in progress",
    anwendung: "A book, an essay, a programme that says how society is or should be. The prompt checks whether the three questions are answered before it reads on.",
    bild: "b/bilder/raster/gesellschaftskonzepte.svg", bildDunkel: "b/bilder/raster/gesellschaftskonzepte-dunkel.svg", bildAlt: "Test Grid for Concepts of Society, drawn: three circles in a triangle, connected; a run checks them one after another",
    bewegung: "How the grid works: three questions one after another, unity, operation, mediation; only when all three are answered is it worth reading on.", ergebnis: "whether unity, operation and mediation are named, where the approach stays silent and whether it is worth reading on as a diagnosis of society." },
  { slug: "journalistische-texte", name: "Test Grid for Journalistic Texts", kurz: "Event, context, transition, cross-check, system references.",
    text: "How does a journalistic text turn selected material into a statement, which distinctions carry this statement, and what could limit or change its validity? Twelve procedures of cross-checking and a fillable case sheet. In progress, version 0.4.",
    seite: "alpha/journalistische-texte/", pdf: null, prompt: "alpha/journalistische-texte-anwendungsprompt-0.4.0.md", raster: "alpha/pruefraster-journalistische-texte-0.4.md", fassung: "application prompt 0.4.0", stand: "in progress",
    anwendung: "An article, a report, a commentary. The prompt reads it along event, context and transition and does the cross-check.",
    bild: "b/bilder/raster/journalistische-texte.svg", bildDunkel: "b/bilder/raster/journalistische-texte-dunkel.svg", bildAlt: "Test Grid for Journalistic Texts, drawn: a text of lines; a marker goes through the lines, one line is cross-checked",
    bewegung: "How the grid works: it looks for the event in the text, marks the context, follows the transition to the statement and does the cross-check.", ergebnis: "event, context and transition of the text, the twelve procedures of cross-checking and the completed case sheet." },
];

export const ANGEBOTE = [
  { slug: "webdesign", name: "Web design", kurz: "Websites and apps: fast, independent, no outside services.",
    text: "A website that is there in under a second and loads nothing from third parties: no cookies, no advertising, no trackers, fonts and scripts on your own server. Plus apps that run in the browser, can be placed on the home screen and keep working without a network. Designed and built from one hand, from the first conversation to publication, with everything search engines and sharing need. This site is the example, and so are the seven apps.",
    fuer: "For artists, practices, associations, galleries, museums, schools and small businesses that need an address that lasts, or a tool that does not live in an app store.",
    ablauf: ["A conversation about what the site or the app should do, and for whom.", "A draft in the browser, to touch rather than a picture; for apps a working prototype within days.", "Build, texts, images, publication at your own address; afterwards everything stays in your hands."],
    dialog: [
      { frage: "What should come into being?", wahlen: ["a website", "an app", "both", "I don't know yet"] },
      { frage: "What is already there?", wahlen: ["nothing", "an old site", "texts and images", "a logo and colours"] },
      { frage: "How big?", wahlen: ["one page or one tool", "five to ten pages", "with a shop or a database", "open"] },
    ] },
  { slug: "vermittlung", name: "Education and consulting", kurz: "Seminars, workshops, projects with schools and teams; consulting for institutions.",
    text: "Half days, whole days, project weeks or series: second-order observation, systems theory without hurdles, art as a tool for groups. Plus consulting for residential homes, workshops, foundations and schools that want to make art a part of their work: setting up a studio, showing clients' works, establishing art therapy as an offer. The background is 25 years of social work in institutions and training in art therapy.",
    fuer: "For schools, museums, companies, administrations, practice teams, further education and for institutions with people who can do more than they are given credit for.",
    ablauf: ["A conversation about the group or the institution and the question that comes with it.", "A proposal with programme, duration, material and price.", "The day, the week or the accompaniment over a year; at the end a presentation in the house or on the web."],
    dialog: [
      { frage: "Who?", wahlen: ["a school class", "a team from a company", "a residential home, a workshop, a foundation", "an open course"] },
      { frage: "What?", wahlen: ["a seminar or workshop", "a project week", "setting up a studio", "consulting on art in the institution"] },
      { frage: "How long?", wahlen: ["two hours", "half a day or a whole day", "a series", "a year"] },
    ] },
  { slug: "kuration", name: "Curatorial projects", kurz: "Thinking, ordering and hanging exhibitions.",
    text: "From concept to closing: selecting works, reading rooms, writing texts, negotiating with artists and hosts, building the hanging, thinking the education along. Most recently «Supervisionen», six months in the Oberer Turm in Kaiserstuhl with nine artists, for Pro Kaiserstuhl and the municipality of Zurzach (2026), before that a year of clients' works at the Behmen in Aarau, for the BKS Aargau and the FARO Foundation (2024).",
    fuer: "For municipalities, art spaces, galleries, foundations, companies with rooms and artists who do not want to carry an exhibition alone.",
    ablauf: ["A walk through the space, with the theme in mind.", "Concept, selection and programme on paper, budget and dates included.", "Installation, opening, accompanying programme, dismantling."],
    referenzen: [["2026", "«Supervisionen», Oberer Turm, Kaiserstuhl: six months, nine artists; for Pro Kaiserstuhl, municipality of Zurzach"], ["2024", "Exhibition of clients' works, Behmen, Aarau: one year; for the BKS Aargau and the FARO Foundation"]],
    dialog: [
      { frage: "Which space?", wahlen: ["a house with a history", "a white cube", "a public place", "an office or a business"] },
      { frage: "Who exhibits?", wahlen: ["one person", "a group", "a collection", "open"] },
      { frage: "When?", wahlen: ["in three months", "in a year", "next year", "open"] },
    ] },
  { slug: "produkte", name: "Products", kurz: "Works, prints, editions and commissions, classic and digital.",
    text: "Works on paper and canvas, prints in small editions, installations with image, motion and sound, works for rooms and screens. Plus editions from the Zettelkasten: the book, the card set, the poster and the notebooks, printed on demand. Orders by email, payment by QR invoice or TWINT; shipping within Switzerland included. Commissions for institutions, companies and private clients after a conversation.",
    fuer: "For collectors, architects, companies, municipalities, institutions and for everyone looking for a work or a book for a particular place.",
    ablauf: ["Choose on the «Works» page, or a conversation about the place and what it needs.", "Order by email, confirmation with invoice; for commissions a draft as a sketch or a moving preview.", "Insured shipping, or work, installation and handover with certificate."],
    dialog: [
      { frage: "What?", wahlen: ["a print or an original", "a book, cards, a poster", "a commission", "something for a screen"] },
      { frage: "For which place?", wahlen: ["a home", "an office or reception", "a public space", "a gift"] },
      { frage: "How many?", wahlen: ["one", "a small series", "an edition", "open"] },
    ] },
];

export const UEBER = {
  text: [
    "Christian Strickler lives and works between Zurich, Basel and Aarau. He turns theory into things you can touch: a Zettelkasten, a wheel that brings artists and theorists together, colour wheels with exercises, machines that make images from photos and sounds, and test grids for questioning theories, texts and bodily events.",
    "Four services: web design, education and consulting, curatorial projects and products. He designs and builds websites and apps, leads seminars and projects with schools and teams, advises institutions that want to make art a part of their work, curates exhibitions and sells works, prints and editions.",
    "Everything on this site runs without outside services: no cookies, no advertising, no trackers. Visits are counted without cookies. The apps compute on your device; your images never leave it.",
  ],
  hintergrund: {
    titel: "Background",
    text: [
      "Since 1998 he has worked in social work, in residential homes, workshops and foundations for people with disabilities: Stiftung Wagerenhof, NOVEOS Zürcher Oberland, wohnstätten zwyssig, Stiftung Züriwerk, Stiftung Kind & Autismus, Stiftung FARO in Windisch. There he set up studios, showed clients' works and learned how art works in a house that was not built for art.",
      "Added to this are German studies at the University of Zurich (1994–1998), the University of Applied Sciences for Social Work in St. Gallen (2011–2013) and training in art therapy at iac Zurich (2022–2025).",
      "Curatorial work most recently: a year of clients' works at the Behmen in Aarau, for the BKS Aargau and the FARO Foundation (2024), and «Supervisionen» in the Oberer Turm in Kaiserstuhl, six months, nine artists, for Pro Kaiserstuhl and the municipality of Zurzach (2026).",
    ],
  },
  liste: { titel: "When something is finished, I write", text: "No rhythm and no announcements. A short email when a grid, an app or a text is ready to work with.", mailto: "mailto:hansnoed@gmail.com?subject=List&body=Please%20add%20me%20to%20the%20list." },
};

export const SEO = {
  start: "Christian Strickler Zurich Basel Aarau, web design Switzerland, app design, curation exhibition, systems theory Zettelkasten, art and theory",
};
