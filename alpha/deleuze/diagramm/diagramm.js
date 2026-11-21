// Diagramm – Operator V von the deleuzian scheme (Deleuze, Francis Bacon. Logique de la sensation, 1981, Kapitel XII;
// Deleuze, Foucault, 1986). Zufällige Striche der Hand zerstören das Klischee, und aus dem Chaos taucht die Figur auf.
// Drei Lesarten nach Deleuzes drei Wegen mit dem Diagramm: örtlich gehalten (Bacon: wischen, fegen, reiben),
// über das ganze Bild (Pollock, Frankenthaler: die Farbe fliesst in Fäden), als Karte der Kräfte (Foucault: die abstrakte Maschine).
// WebGL2, ohne Bibliotheken, ohne CDN. Aufbau, Quellen, Aufnahme, Glossen und Einstieg wie Wahrnehmung.

import { klangStarten, klangBild, klangAn, klangIstAn, klangSpur, klangSchlaufe, klangSpritzer } from './klang.js?v=1';
import { aufnahmeDatei } from '../gemeinsam/aufnahme.js?v=1';
import { fotoLesen, istVideo, istFoto, istHeic, dateiMeldung, fotosMalen, fahrtSchalter, FAHRT_SVG } from '../gemeinsam/fotos.js?v=2';

const $ = (id) => document.getElementById(id);
const Q = new URLSearchParams(location.search);

// ---------- Sprache ----------
// Zitate im Original; was nicht wörtlich ist, steht als «sinngemäss» da.
const TEXTE = {
  de: {
    titel: 'Diagramm', satz: 'Zufällige Striche der Hand zerstören das Klischee, und aus dem Chaos taucht die Figur auf.',
    kamera: 'Kamera', video: 'Video oder Fotos', beispiel: 'Beispiel', lesart: 'Lesart',
    glossen: {
      diagramme: { begriff: 'le diagramme', satz: 'Das Diagramm sind die freien Striche und Flecken der Hand, die nichts bedeuten und nichts darstellen. Sie kommen ins Bild, um das Klischee zu zerstören.', zitat: '«Le diagramme, c’est donc l’ensemble opératoire des traits et des zones, des lignes et des taches asignifiantes et non représentatives.»', quelle: 'Deleuze, Logique de la sensation, 1981, Kap. XII' },
      allover: { begriff: 'l’all-over', satz: 'Im Action Painting breitet sich das Diagramm über das ganze Bild aus. Die Linie umgrenzt nichts mehr, sie läuft in alle Richtungen.', zitat: '', quelle: 'Deleuze, Logique de la sensation, 1981, Kap. XII, sinngemäss' },
      machine: { begriff: 'la machine abstraite', satz: 'Das Diagramm zeigt nicht, was ist, sondern wie Kräfte auf Kräfte wirken: eine Karte, die über das ganze Feld reicht.', zitat: '«Le diagramme n’est plus l’archive auditive ou visuelle, c’est la carte, la cartographie, coextensive à tout le champ social.»', quelle: 'Deleuze, Foucault, 1986' },
      lesarten: { begriff: 'trois voies', satz: 'Drei Wege mit dem Diagramm: es örtlich halten wie Bacon, es über alles laufen lassen wie Pollock, es als Karte der Kräfte lesen wie Foucault.', zitat: '', quelle: 'Deleuze, Logique de la sensation, 1981, Kap. XII; Foucault, 1986' },
      germe: { begriff: 'le chaos-germe', satz: 'Das Diagramm ist eine Katastrophe für das Bild, aber auch ein Keim: Aus ihm wächst eine neue Ordnung.', zitat: '«Le diagramme est bien un chaos, une catastrophe, mais c’est aussi un germe d’ordre ou de rythme.»', quelle: 'Deleuze, Logique de la sensation, 1981, Kap. XII' },
      hand: { begriff: 'la main libre', satz: 'Bacon wischt mit dem Lappen, fegt mit der Bürste, reibt mit dem Ärmel. Die Hand macht sich frei vom Auge und zieht das Bild mit, wohin sie will.', zitat: '', quelle: 'Deleuze, Logique de la sensation, 1981, Kap. XII, sinngemäss' },
      matiere: { begriff: 'la matière', satz: 'Je mehr Farbe, desto mehr Relief: Die Spur der Hand wird zu einem Körper aus Öl, in dem das Licht hängen bleibt.', zitat: '', quelle: 'Deleuze, Logique de la sensation, 1981, Kap. XII, sinngemäss' },
      figure: { begriff: 'la Figure', satz: 'Aus dem Chaos taucht die Figur auf, nicht mehr als Abbild, sondern gemalt. Hier bestimmst du, wie schnell.', zitat: '', quelle: 'Deleuze, Logique de la sensation, 1981, Kap. XII, sinngemäss' },
      strahl: { begriff: 'le dripping', satz: 'Pollock lässt die Farbe vom Stock fliessen, ohne die Leinwand zu berühren. Ein dicker Strahl gibt Lachen, ein dünner Haarlinien.', zitat: '', quelle: 'Herczyński, Cernuschi, Mahadevan, Physics Today, 2011, sinngemäss' },
      hoehe: { begriff: 'la corde liquide', satz: 'Je höher die Hand, desto mehr schlingt sich der Faden zu Schlaufen, bevor er landet. Langsame Hand, enge Kreise.', zitat: '', quelle: 'Herczyński, Cernuschi, Mahadevan, Physics Today, 2011, sinngemäss' },
      fond: { begriff: 'le fond', satz: 'Wie lange die Farbe nass bleibt: Unter den Fäden liegt rohe Leinwand, das Bild sickert nur als Hof ein. Trocknet die Farbe, kehrt das Klischee zurück.', zitat: '', quelle: 'Deleuze, Logique de la sensation, 1981, Kap. XII, sinngemäss' },
      force: { begriff: 'le rapport de forces', satz: 'Eine Kraft ist nie allein, sie ist immer schon ein Verhältnis zu anderen Kräften. Lege zwei Finger auf, und die Linien dazwischen geraten in Spannung.', zitat: '', quelle: 'Deleuze, Foucault, 1986, sinngemäss' },
      ligne: { begriff: 'la ligne abstraite', satz: 'Die Linien folgen den Kräften im Bild, nicht seinen Umrissen. Je länger sie sind, desto weiter reicht die Karte.', zitat: '', quelle: 'Deleuze, Foucault, 1986, sinngemäss' },
      forces: { begriff: 'peindre les forces', satz: 'Nicht Formen wiedergeben, sondern Kräfte sichtbar machen, die man nicht sieht: die Bewegung im Bild treibt die Linien.', zitat: '«Kunst gibt nicht das Sichtbare wieder, sondern macht sichtbar.»', quelle: 'Klee, Schöpferische Konfession, 1920; Deleuze, Logique de la sensation, Kap. VIII' }
    },
    regler: [['Hand', 'Materie', 'Figur'], ['Strahl', 'Höhe', 'Grund'], ['Kraft', 'Linie', 'Bewegung']],
    reglerGlosse: [['hand', 'matiere', 'figure'], ['strahl', 'hoehe', 'fond'], ['force', 'ligne', 'forces']],
    lesarten: [
      { kurz: 'Wischen', titel: 'Der Wisch', wer: 'Bacon', geste: 'Mit dem Daumen durchs Bild fegen. Halten verreibt.', text: 'Bevor Bacon zu malen beginnt, ist die Leinwand nicht leer. Sie ist voller Klischees: Photographien, Bilder, die man schon gesehen hat. Darum setzt er zufällige Spuren hinein, er wischt mit dem Lappen, fegt mit der Bürste, reibt, wirft Farbe. Deleuze nennt diese Spuren das Diagramm. Es ist eine Katastrophe für das Bild, aber auch ein Keim: Aus ihm taucht die Figur auf, die kein Abbild mehr ist. Hier liegt das Bild zuerst glatt da, als Klischee. Dein Daumen fegt hindurch, das Gesicht wird mitgerissen und lebt in der Farbe weiter. Halten verreibt und verdreht es. Dann kehrt die Figur zurück, gemalt.' },
      { kurz: 'Fäden', titel: 'Das All-over', wer: 'Pollock, Frankenthaler', geste: 'Ziehen: vier Strahlen fliessen. Langsam gibt Schlaufen, loslassen trocknet.', text: 'Pollock legt die Leinwand auf den Boden und lässt die Farbe vom Stock fliessen. Die Hand berührt das Bild nicht mehr. Für Deleuze ist das ein zweiter Weg der modernen Malerei: Das Diagramm wird nicht örtlich gehalten wie bei Bacon, es breitet sich über das ganze Bild aus, in alle Richtungen, ohne Mitte. Die Linie umgrenzt nichts mehr. Sobald du berührst, fällt das Klischee weg, und es bleibt rohe Leinwand. Von deinem Daumen fliessen mehrere Strahlen wie von einem Stock. Bei langsamer Hand schlingen sie sich zu Schlaufen, bei schneller werden sie gerade und dünn, ein Ruck spritzt. Das Gesicht lebt nur noch in den Fäden, und um sie herum sickert es als Hof in die Baumwolle wie bei Frankenthaler. Lässt du los, trocknet die Farbe, und das Klischee kehrt zurück.' },
      { kurz: 'Kräfte', titel: 'Die abstrakte Maschine', wer: 'Foucault, Deleuze', geste: 'Halten setzt eine Kraft. Ziehen lenkt die Linien.', text: '1986 schreibt Deleuze ein Buch über seinen Freund Michel Foucault. Dort bekommt das Diagramm einen zweiten Sinn: Es ist die Karte der Kräfteverhältnisse, eine abstrakte Maschine, die selbst noch keine Form hat, aber alle Formen verteilt. Foucaults Beispiel ist das Panoptikum, in dem alle gesehen werden, ohne den zu sehen, der sieht. Hier wird das Bild zu einer solchen Karte: Feine Linien folgen den Kräften im Bild, seinen Kanten und seinen Bewegungen. Dein Finger setzt eine neue Kraft, und alle Linien geraten in ihr Feld.' }
    ],
    wenden: 'Kamera wenden', tonAn: 'Ton an', tonAus: 'Ton aus',
    begriff: 'Begriff', standbild: 'Standbild', aufnahme: 'Aufnahme', stopp: 'Stopp',
    teilen: 'Teilen', sichern: 'Sichern', komma: '.', 'ergebnis-hinweis': 'Gesichert im Ordner «Downloads». «Teilen» legt es direkt in die Galerie oder eine App.',
    keineAufnahme: 'Dieser Browser kann die Leinwand nicht aufnehmen. Das Standbild geht.',
    daumen: ['Daumen auflegen und ziehen', 'Daumen auflegen und ziehen', 'Daumen auflegen und halten'],
    familie: 'Bild · Logique de la sensation, Kapitel XII', 'b-titel': 'Diagramm',
    'b-text': [
      'Francis Bacon erzählt David Sylvester, wie ein Bild bei ihm beginnt: mit Spuren, die er nicht beherrscht. Er wischt, fegt, wirft Farbe, und erst aus dieser Unordnung kommt ein Bild, das er nicht hätte planen können. Deleuze greift das 1981 in «Francis Bacon. Logik der Sensation» auf und nennt diese Spuren das Diagramm: Striche und Flecken, die nichts bedeuten und nichts darstellen.',
      'Das Diagramm ist zugleich Chaos und Keim. Es zerstört das Klischee, das schon vor dem Malen auf der Leinwand liegt, und lässt die Figur auftauchen. Die moderne Malerei kennt nach Deleuze drei Wege mit ihm: es auf einen Code zu bringen wie die Abstraktion, es über alles laufen zu lassen wie Pollock, oder es örtlich zu halten wie Bacon.',
      'Fünf Jahre später, im Buch über Foucault, wird das Diagramm zur abstrakten Maschine, zur Karte der Kräfte, die eine Gesellschaft durchziehen. Hier ist das Diagramm deine Hand: Sie wischt, lässt Farbe fliessen oder setzt Kräfte, und das Bild antwortet.'
    ],
    'b-frage': 'Was war schon im Bild, bevor deine Hand kam? Und was ist danach aufgetaucht, das du nicht geplant hast?',
    'b-quelle': 'Gilles Deleuze, Francis Bacon. Logique de la sensation, Paris: La Différence 1981, Kapitel XII «Le diagramme». Deutsch: Francis Bacon. Logik der Sensation, Fink. Gilles Deleuze, Foucault, Paris: Minuit 1986. Deutsch: Foucault, Suhrkamp. David Sylvester, Interviews with Francis Bacon, London: Thames & Hudson 1975. Andrzej Herczyński, Claude Cernuschi, L. Mahadevan, «Painting with drops, jets, and sheets», Physics Today 64, 6 (2011).',
    keineKamera: 'Die Kamera lässt sich nicht öffnen. Wähle ein Video, Fotos oder das Beispiel.',
    keinGL: 'Dieses Gerät kann WebGL 2 nicht anzeigen. Das Diagramm braucht es.',
    kontextWeg: 'Die Grafik ist ausgestiegen. Bitte die Seite neu laden.'
  },
  en: {
    titel: 'Diagram', satz: 'Chance marks of the hand destroy the cliché, and the Figure rises out of the chaos.',
    kamera: 'Camera', video: 'Video or photos', beispiel: 'Example', lesart: 'Reading',
    glossen: {
      diagramme: { begriff: 'le diagramme', satz: 'The diagram is the free marks and patches of the hand, which signify nothing and represent nothing. They enter the image to destroy the cliché.', zitat: '« Le diagramme, c’est donc l’ensemble opératoire des traits et des zones, des lignes et des taches asignifiantes et non représentatives. »', quelle: 'Deleuze, The Logic of Sensation, 1981, ch. XII (original)' },
      allover: { begriff: 'l’all-over', satz: 'In action painting the diagram spreads over the whole picture. The line no longer outlines anything; it runs in every direction.', zitat: '', quelle: 'Deleuze, The Logic of Sensation, 1981, ch. XII, paraphrased' },
      machine: { begriff: 'la machine abstraite', satz: 'The diagram does not show what is, but how forces act on forces: a map that extends over the whole field.', zitat: '« Le diagramme n’est plus l’archive auditive ou visuelle, c’est la carte, la cartographie, coextensive à tout le champ social. »', quelle: 'Deleuze, Foucault, 1986 (original)' },
      lesarten: { begriff: 'trois voies', satz: 'Three ways with the diagram: keep it local like Bacon, let it run over everything like Pollock, read it as a map of forces like Foucault.', zitat: '', quelle: 'Deleuze, The Logic of Sensation, 1981, ch. XII; Foucault, 1986' },
      germe: { begriff: 'le chaos-germe', satz: 'The diagram is a catastrophe for the image, but also a germ: a new order grows out of it.', zitat: '« Le diagramme est bien un chaos, une catastrophe, mais c’est aussi un germe d’ordre ou de rythme. »', quelle: 'Deleuze, The Logic of Sensation, 1981, ch. XII (original)' },
      hand: { begriff: 'la main libre', satz: 'Bacon wipes with a rag, sweeps with a brush, rubs with his sleeve. The hand frees itself from the eye and drags the image wherever it wants.', zitat: '', quelle: 'Deleuze, The Logic of Sensation, 1981, ch. XII, paraphrased' },
      matiere: { begriff: 'la matière', satz: 'The more paint, the more relief: the trace of the hand becomes a body of oil in which the light gets caught.', zitat: '', quelle: 'Deleuze, The Logic of Sensation, 1981, ch. XII, paraphrased' },
      figure: { begriff: 'la Figure', satz: 'The Figure rises out of the chaos, no longer as a likeness but painted. Here you decide how fast.', zitat: '', quelle: 'Deleuze, The Logic of Sensation, 1981, ch. XII, paraphrased' },
      strahl: { begriff: 'le dripping', satz: 'Pollock lets the paint run off a stick without touching the canvas. A thick jet makes pools, a thin one hairlines.', zitat: '', quelle: 'Herczyński, Cernuschi, Mahadevan, Physics Today, 2011, paraphrased' },
      hoehe: { begriff: 'la corde liquide', satz: 'The higher the hand, the more the thread coils into loops before it lands. A slow hand, tight circles.', zitat: '', quelle: 'Herczyński, Cernuschi, Mahadevan, Physics Today, 2011, paraphrased' },
      fond: { begriff: 'le fond', satz: 'How long the paint stays wet: beneath the threads lies raw canvas, the image seeps in only as a halo. When the paint dries, the cliché returns.', zitat: '', quelle: 'Deleuze, The Logic of Sensation, 1981, ch. XII, paraphrased' },
      force: { begriff: 'le rapport de forces', satz: 'A force is never alone; it is always already a relation to other forces. Rest two fingers and the lines between them come under tension.', zitat: '', quelle: 'Deleuze, Foucault, 1986, paraphrased' },
      ligne: { begriff: 'la ligne abstraite', satz: 'The lines follow the forces in the image, not its outlines. The longer they are, the further the map reaches.', zitat: '', quelle: 'Deleuze, Foucault, 1986, paraphrased' },
      forces: { begriff: 'peindre les forces', satz: 'Not to render forms but to make visible forces that cannot be seen: the movement in the image drives the lines.', zitat: '« Kunst gibt nicht das Sichtbare wieder, sondern macht sichtbar. »', quelle: 'Klee, Creative Confession, 1920 (original); Deleuze, The Logic of Sensation, ch. VIII' }
    },
    regler: [['Hand', 'Matter', 'Figure'], ['Jet', 'Height', 'Ground'], ['Force', 'Line', 'Movement']],
    reglerGlosse: [['hand', 'matiere', 'figure'], ['strahl', 'hoehe', 'fond'], ['force', 'ligne', 'forces']],
    lesarten: [
      { kurz: 'Wipe', titel: 'The wipe', wer: 'Bacon', geste: 'Sweep your thumb through the image. Holding rubs.', text: 'Before Bacon begins to paint, the canvas is not empty. It is full of clichés: photographs, images one has already seen. So he puts chance marks into it; he wipes with a rag, sweeps with a brush, rubs, throws paint. Deleuze calls these marks the diagram. It is a catastrophe for the image, but also a germ: out of it rises the Figure, which is no longer a likeness. Here the image first lies smooth, as a cliché. Your thumb sweeps through it, the face is dragged along and lives on in the paint. Holding rubs and twists it. Then the Figure returns, painted.' },
      { kurz: 'Threads', titel: 'The all-over', wer: 'Pollock, Frankenthaler', geste: 'Drag: four jets flow. Slowly for loops, let go and it dries.', text: 'Pollock lays the canvas on the floor and lets the paint run off a stick. The hand no longer touches the picture. For Deleuze this is a second way of modern painting: the diagram is not kept local as with Bacon, it spreads over the whole picture, in every direction, without a centre. The line no longer outlines anything. As soon as you touch, the cliché falls away and raw canvas remains. Several jets flow from your thumb as from a stick. When the hand is slow they coil into loops, when it is fast they turn straight and thin; a jolt splatters. The face now lives only in the threads, and around them it seeps into the cotton as a halo, as with Frankenthaler. Let go, the paint dries and the cliché returns.' },
      { kurz: 'Forces', titel: 'The abstract machine', wer: 'Foucault, Deleuze', geste: 'Holding sets a force. Dragging steers the lines.', text: 'In 1986 Deleuze writes a book on his friend Michel Foucault. There the diagram takes on a second sense: it is the map of relations of force, an abstract machine that has no form of its own yet distributes all forms. Foucault’s example is the Panopticon, in which everyone is seen without seeing the one who sees. Here the image becomes such a map: fine lines follow the forces in the image, its edges and its movements. Your finger sets a new force, and all the lines enter its field.' }
    ],
    wenden: 'Flip camera', tonAn: 'Sound on', tonAus: 'Sound off',
    begriff: 'Concept', standbild: 'Still', aufnahme: 'Record', stopp: 'Stop',
    teilen: 'Share', sichern: 'Save', komma: '.', 'ergebnis-hinweis': 'Saved to your “Downloads” folder. “Share” sends it straight to your gallery or an app.',
    keineAufnahme: 'This browser cannot record the canvas. Stills work.',
    daumen: ['Rest your thumb and drag', 'Rest your thumb and drag', 'Rest your thumb and hold'],
    familie: 'Image · The Logic of Sensation, chapter XII', 'b-titel': 'Diagram',
    'b-text': [
      'Francis Bacon tells David Sylvester how a picture begins for him: with marks he does not control. He wipes, sweeps, throws paint, and only out of this disorder comes an image he could not have planned. In 1981 Deleuze takes this up in “Francis Bacon: The Logic of Sensation” and calls these marks the diagram: lines and patches that signify nothing and represent nothing.',
      'The diagram is chaos and germ at once. It destroys the cliché that lies on the canvas even before painting, and lets the Figure emerge. According to Deleuze, modern painting knows three ways with it: reducing it to a code like abstraction, letting it run over everything like Pollock, or keeping it local like Bacon.',
      'Five years later, in the book on Foucault, the diagram becomes the abstract machine, the map of the forces that run through a society. Here the diagram is your hand: it wipes, lets paint flow or sets forces, and the image answers.'
    ],
    'b-frage': 'What was already in the image before your hand came? And what emerged afterwards that you did not plan?',
    'b-quelle': 'Gilles Deleuze, Francis Bacon. Logique de la sensation, Paris: La Différence 1981, chapter XII “Le diagramme”. English: Francis Bacon: The Logic of Sensation, Continuum 2003. Gilles Deleuze, Foucault, Paris: Minuit 1986. English: Foucault, University of Minnesota Press 1988. David Sylvester, Interviews with Francis Bacon, London: Thames & Hudson 1975. Andrzej Herczyński, Claude Cernuschi, L. Mahadevan, “Painting with drops, jets, and sheets”, Physics Today 64, 6 (2011).',
    keineKamera: 'The camera cannot be opened. Choose a video, photos or the example.',
    keinGL: 'This device cannot show WebGL 2, which the diagram needs here.',
    kontextWeg: 'The graphics stopped. Please reload the page.'
  },
  fr: {
    titel: 'Le diagramme', satz: 'Des traits au hasard de la main détruisent le cliché, et la Figure surgit du chaos.',
    kamera: 'Caméra', video: 'Vidéo ou photos', beispiel: 'Exemple', lesart: 'Lecture',
    glossen: {
      diagramme: { begriff: 'le diagramme', satz: 'Le diagramme, ce sont les traits et les taches libres de la main, qui ne signifient rien et ne représentent rien. Ils entrent dans l’image pour détruire le cliché.', zitat: '« Le diagramme, c’est donc l’ensemble opératoire des traits et des zones, des lignes et des taches asignifiantes et non représentatives. »', quelle: 'Deleuze, Logique de la sensation, 1981, ch. XII' },
      allover: { begriff: 'l’all-over', satz: 'Dans l’action painting, le diagramme s’étend à tout le tableau. La ligne ne cerne plus rien, elle court dans toutes les directions.', zitat: '', quelle: 'Deleuze, Logique de la sensation, 1981, ch. XII, en substance' },
      machine: { begriff: 'la machine abstraite', satz: 'Le diagramme ne montre pas ce qui est, mais comment des forces agissent sur des forces : une carte qui s’étend à tout le champ.', zitat: '« Le diagramme n’est plus l’archive auditive ou visuelle, c’est la carte, la cartographie, coextensive à tout le champ social. »', quelle: 'Deleuze, Foucault, 1986' },
      lesarten: { begriff: 'trois voies', satz: 'Trois voies avec le diagramme : le garder local comme Bacon, le laisser courir partout comme Pollock, le lire comme carte des forces avec Foucault.', zitat: '', quelle: 'Deleuze, Logique de la sensation, 1981, ch. XII ; Foucault, 1986' },
      germe: { begriff: 'le chaos-germe', satz: 'Le diagramme est une catastrophe pour l’image, mais aussi un germe : un ordre nouveau en sort.', zitat: '« Le diagramme est bien un chaos, une catastrophe, mais c’est aussi un germe d’ordre ou de rythme. »', quelle: 'Deleuze, Logique de la sensation, 1981, ch. XII' },
      hand: { begriff: 'la main libre', satz: 'Bacon essuie au chiffon, balaie à la brosse, frotte avec la manche. La main se libère de l’œil et entraîne l’image où elle veut.', zitat: '', quelle: 'Deleuze, Logique de la sensation, 1981, ch. XII, en substance' },
      matiere: { begriff: 'la matière', satz: 'Plus il y a de peinture, plus il y a de relief : la trace de la main devient un corps d’huile où la lumière s’accroche.', zitat: '', quelle: 'Deleuze, Logique de la sensation, 1981, ch. XII, en substance' },
      figure: { begriff: 'la Figure', satz: 'La Figure surgit du chaos, non plus comme ressemblance, mais peinte. Ici tu décides à quelle vitesse.', zitat: '', quelle: 'Deleuze, Logique de la sensation, 1981, ch. XII, en substance' },
      strahl: { begriff: 'le dripping', satz: 'Pollock laisse couler la peinture d’un bâton sans toucher la toile. Un jet épais fait des flaques, un jet fin des lignes déliées.', zitat: '', quelle: 'Herczyński, Cernuschi, Mahadevan, Physics Today, 2011, en substance' },
      hoehe: { begriff: 'la corde liquide', satz: 'Plus la main est haute, plus le fil s’enroule en boucles avant de toucher la toile. Main lente, cercles serrés.', zitat: '', quelle: 'Herczyński, Cernuschi, Mahadevan, Physics Today, 2011, en substance' },
      fond: { begriff: 'le fond', satz: 'Combien de temps la peinture reste humide : sous les fils, la toile brute ; l’image ne s’y imprègne qu’en auréole. Quand elle sèche, le cliché revient.', zitat: '', quelle: 'Deleuze, Logique de la sensation, 1981, ch. XII, en substance' },
      force: { begriff: 'le rapport de forces', satz: 'Une force n’est jamais seule, elle est toujours déjà en rapport avec d’autres forces. Pose deux doigts, et les lignes entre eux se tendent.', zitat: '', quelle: 'Deleuze, Foucault, 1986, en substance' },
      ligne: { begriff: 'la ligne abstraite', satz: 'Les lignes suivent les forces de l’image, non ses contours. Plus elles sont longues, plus la carte porte loin.', zitat: '', quelle: 'Deleuze, Foucault, 1986, en substance' },
      forces: { begriff: 'peindre les forces', satz: 'Non pas rendre des formes, mais rendre visibles des forces qui ne le sont pas : le mouvement de l’image pousse les lignes.', zitat: '« Kunst gibt nicht das Sichtbare wieder, sondern macht sichtbar. »', quelle: 'Klee, Credo du créateur, 1920 ; Deleuze, Logique de la sensation, ch. VIII' }
    },
    regler: [['Main', 'Matière', 'Figure'], ['Jet', 'Hauteur', 'Fond'], ['Force', 'Ligne', 'Mouvement']],
    reglerGlosse: [['hand', 'matiere', 'figure'], ['strahl', 'hoehe', 'fond'], ['force', 'ligne', 'forces']],
    lesarten: [
      { kurz: 'Essuyer', titel: 'Le coup de chiffon', wer: 'Bacon', geste: 'Balaie l’image du pouce. Tenir frotte.', text: 'Avant que Bacon ne commence à peindre, la toile n’est pas vide. Elle est pleine de clichés : photographies, images déjà vues. Alors il y jette des marques au hasard ; il essuie au chiffon, balaie à la brosse, frotte, jette de la peinture. Deleuze appelle ces marques le diagramme. C’est une catastrophe pour l’image, mais aussi un germe : il en surgit la Figure, qui n’est plus une ressemblance. Ici l’image repose d’abord, lisse, comme un cliché. Ton pouce la balaie, le visage est entraîné et continue de vivre dans la peinture. Tenir le frotte et le tord. Puis la Figure revient, peinte.' },
      { kurz: 'Fils', titel: 'L’all-over', wer: 'Pollock, Frankenthaler', geste: 'Glisse : quatre jets coulent. Lentement, des boucles ; lâche, ça sèche.', text: 'Pollock pose la toile au sol et laisse couler la peinture d’un bâton. La main ne touche plus le tableau. Pour Deleuze, c’est une deuxième voie de la peinture moderne : le diagramme n’est pas gardé local comme chez Bacon, il s’étend à tout le tableau, dans toutes les directions, sans centre. La ligne ne cerne plus rien. Dès que tu touches, le cliché tombe et il reste la toile brute. Plusieurs jets coulent de ton pouce comme d’un bâton. Quand la main est lente, ils s’enroulent en boucles ; rapide, ils deviennent droits et fins ; un coup sec éclabousse. Le visage ne vit plus que dans les fils, et autour d’eux il s’imprègne dans le coton en auréole, comme chez Frankenthaler. Lâche : la peinture sèche et le cliché revient.' },
      { kurz: 'Forces', titel: 'La machine abstraite', wer: 'Foucault, Deleuze', geste: 'Tenir pose une force. Glisser oriente les lignes.', text: 'En 1986, Deleuze écrit un livre sur son ami Michel Foucault. Le diagramme y prend un second sens : c’est la carte des rapports de forces, une machine abstraite qui n’a pas encore de forme, mais qui distribue toutes les formes. L’exemple de Foucault est le Panoptique, où chacun est vu sans voir celui qui voit. Ici l’image devient une telle carte : des lignes fines suivent les forces de l’image, ses bords et ses mouvements. Ton doigt pose une force nouvelle, et toutes les lignes entrent dans son champ.' }
    ],
    wenden: 'Retourner', tonAn: 'Son activé', tonAus: 'Son coupé',
    begriff: 'Concept', standbild: 'Image', aufnahme: 'Enregistrer', stopp: 'Arrêter',
    teilen: 'Partager', sichern: 'Télécharger', komma: ',', 'ergebnis-hinweis': 'Enregistré dans le dossier « Téléchargements ». « Partager » l’envoie directement dans la galerie ou une app.',
    keineAufnahme: 'Ce navigateur ne peut pas enregistrer le canevas. L’image fixe fonctionne.',
    daumen: ['Pose le pouce et glisse', 'Pose le pouce et glisse', 'Pose le pouce et tiens'],
    familie: 'Image · Logique de la sensation, chapitre XII', 'b-titel': 'Le diagramme',
    'b-text': [
      'Francis Bacon raconte à David Sylvester comment un tableau commence chez lui : par des marques qu’il ne maîtrise pas. Il essuie, balaie, jette de la peinture, et c’est seulement de ce désordre que sort une image qu’il n’aurait pas pu prévoir. En 1981, Deleuze reprend cela dans « Francis Bacon. Logique de la sensation » et appelle ces marques le diagramme : des traits et des taches qui ne signifient rien et ne représentent rien.',
      'Le diagramme est à la fois chaos et germe. Il détruit le cliché qui recouvre la toile avant même qu’on peigne, et fait surgir la Figure. Selon Deleuze, la peinture moderne connaît trois voies avec lui : le réduire à un code comme l’abstraction, le laisser courir sur tout le tableau comme Pollock, ou le garder local comme Bacon.',
      'Cinq ans plus tard, dans le livre sur Foucault, le diagramme devient la machine abstraite, la carte des forces qui traversent une société. Ici le diagramme est ta main : elle essuie, fait couler la peinture ou pose des forces, et l’image répond.'
    ],
    'b-frage': 'Qu’y avait-il déjà dans l’image avant que ta main n’arrive ? Et qu’est-ce qui a surgi ensuite, que tu n’avais pas prévu ?',
    'b-quelle': 'Gilles Deleuze, Francis Bacon. Logique de la sensation, Paris : La Différence 1981, chapitre XII « Le diagramme ». Gilles Deleuze, Foucault, Paris : Minuit 1986. David Sylvester, Interviews with Francis Bacon, Londres : Thames & Hudson 1975. Andrzej Herczyński, Claude Cernuschi, L. Mahadevan, « Painting with drops, jets, and sheets », Physics Today 64, 6 (2011).',
    keineKamera: 'La caméra ne s’ouvre pas. Choisis une vidéo, des photos ou l’exemple.',
    keinGL: 'Cet appareil ne peut pas afficher WebGL 2, nécessaire ici.',
    kontextWeg: 'Le graphisme s’est arrêté. Recharge la page.'
  }
};

let sprache = (() => {
  try { const s = localStorage.getItem('kristall.sprache'); if (TEXTE[s]) return s; } catch {}   // dieselbe Wahl wie im Kristall
  const n = (navigator.language || 'de').slice(0, 2);
  return TEXTE[n] ? n : 'de';
})();

function uebersetzen() {
  const t = TEXTE[sprache];
  document.documentElement.lang = sprache;
  document.querySelectorAll('[data-t]').forEach((el) => {
    const k = el.dataset.t, v = t[k];
    if (Array.isArray(v)) { el.replaceChildren(...v.map((s) => { const p = document.createElement('p'); p.textContent = s; return p; })); }
    else if (v != null && typeof v === 'string') el.textContent = v;
  });
  document.querySelectorAll('[data-t-label]').forEach((el) => { const v = t[el.dataset.tLabel]; if (typeof v === 'string') { el.setAttribute('aria-label', v); el.title = v; } });
  if (aufnehmer) $('aufnahme').textContent = t.stopp;
  document.querySelectorAll('[data-lesart]').forEach((b) => { b.textContent = t.lesarten[+b.dataset.lesart].kurz; });
  $('geste').textContent = t.lesarten[lesart].geste;
  $('daumen-text').textContent = t.daumen[lesart];
  reglerBeschriften();
  lesartText();
  document.querySelectorAll('[data-lang]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.lang === sprache)));
}
document.querySelectorAll('[data-lang]').forEach((b) => b.addEventListener('click', () => {
  sprache = b.dataset.lang;
  try { localStorage.setItem('kristall.sprache', sprache); } catch {}
  uebersetzen();
}));

// ---------- Absturzspur (Lehre aus PHORMA): in der Konsole, mit ?spur auf der Seite samt Taste «Spur kopieren» ----------
const SPUR = 'diagramm.spur';
function spur(schritt) {
  try {
    const s = JSON.parse(localStorage.getItem(SPUR) || '[]');
    s.push(schritt); localStorage.setItem(SPUR, JSON.stringify(s.slice(-14)));
  } catch {}
}
let meldungUhr = 0;
function melden(text) {
  const m = $('meldung'); m.textContent = text; m.hidden = false;
  clearTimeout(meldungUhr); meldungUhr = setTimeout(() => { m.hidden = true; }, 10000);
}
$('meldung').addEventListener('click', () => { $('meldung').hidden = true; });
addEventListener('pagehide', () => spur('Ende'));
document.addEventListener('visibilitychange', () => { if (document.hidden) spur('Pause'); });
let spurVorher = [];
try {
  const s = JSON.parse(localStorage.getItem(SPUR) || '[]'); spurVorher = s;
  if (s.length && !['✓ läuft', 'Start', 'Ende', 'Pause'].includes(s.at(-1))) console.warn('Diagramm: der letzte Versuch brach ab nach', s.slice(-4).join(' → '));
  localStorage.setItem(SPUR, JSON.stringify(['Start']));
} catch {}
addEventListener('error', (e) => spur('Fehler: ' + String(e.message || e.error || '?').slice(0, 160)));
addEventListener('unhandledrejection', (e) => spur('Fehler: ' + String(e.reason?.message || e.reason || '?').slice(0, 160)));


// ---------- Grafik ----------
const telefon = matchMedia('(pointer: coarse)').matches || Math.min(screen.width, screen.height) < 700;
const leinwand = $('leinwand');
const gl = leinwand.getContext('webgl2', { antialias: false, alpha: false, premultipliedAlpha: false, powerPreference: 'high-performance', preserveDrawingBuffer: false });
// Ohne Grafikkarte (Software wie SwiftShader, llvmpipe, «Basic Render Driver») eine leichte Fassung; ?voll erzwingt die volle (wie im Kristall)
const grafikName = (() => { try { const x = gl && gl.getExtension('WEBGL_debug_renderer_info'); return x ? String(gl.getParameter(x.UNMASKED_RENDERER_WEBGL)) : ''; } catch { return ''; } })();
const leicht = !Q.has('voll') && (/basic render|swiftshader|llvmpipe|softpipe|software/i.test(grafikName) || Q.has('leicht'));
const ARBEIT = leicht ? 480 : telefon ? 720 : 1024;        // Arbeitsbild für Bewegung und Struktur, lange Seite
const SCHARF_SEITE = leicht ? 960 : telefon ? 1280 : 1920; // die Gegenwart: so scharf, wie der Bildschirm sie zeigt
const MAX_DPR = leicht ? 0.6 : 2;                          // fein wie der Bildschirm; ruckelt es, senkt tempoMessen die Auflösung
const FLUSS_SEITE = leicht ? 110 : telefon ? 180 : 240;    // feinste Stufe des optischen Flusses
const WISCH_SEITE = leicht ? 480 : telefon ? 1024 : 1400;  // Feld der Verschiebung: so fein, dass die Borsten einzeln ziehen
const KRAFT_SEITE = leicht ? 200 : telefon ? 360 : 480;    // Feld der Kräfte
const SAUG_SEITE = leicht ? 256 : telefon ? 560 : 720;     // nasser Hof der Fäden in der Baumwolle
const LIC_SCHRITTE = leicht ? 8 : 16;                      // Schritte je Richtung entlang einer Kraftlinie
if (leicht) spur('Leichte Fassung (ohne Grafikkarte)');
if (!gl) { melden(TEXTE[sprache].keinGL); spur('kein WebGL2'); }
leinwand.addEventListener('webglcontextlost', (e) => { e.preventDefault(); melden(TEXTE[sprache].kontextWeg); spur('Kontext verloren'); });

const VS = `#version 300 es
in vec2 a; out vec2 v;
void main(){ v = a*0.5+0.5; gl_Position = vec4(a,0.,1.); }`;
const KOPF = `#version 300 es
precision highp float; in vec2 v; out vec4 o;
float lu(vec3 c){ return dot(c, vec3(0.2126, 0.7152, 0.0722)); }
float h21(vec2 p){ p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }
float rauschen(vec2 p){ vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
  return mix(mix(h21(i), h21(i + vec2(1, 0)), f.x), mix(h21(i + vec2(0, 1)), h21(i + 1.0), f.x), f.y); }
float fbm(vec2 p){ float s = 0.0, a = 0.5; for (int k = 0; k < 5; k++) { s += a * rauschen(p); p = p * 2.03 + 17.1; a *= 0.5; } return s; }
`;

const FS_KOPIE = KOPF + `uniform sampler2D uQ; void main(){ o = vec4(texture(uQ, v).rgb, 1.0); }`;

// ---- Optischer Fluss nach Lucas und Kanade (1981), als Pyramide auf der Grafikkarte (wie in Dauer und Wahrnehmung) ----
const FS_LUM = KOPF + `uniform sampler2D uJetzt, uVor; uniform vec2 uPx;
void main(){
  vec2 a = vec2(-0.25, -0.25) * uPx, b = vec2(0.25, -0.25) * uPx, c = vec2(-0.25, 0.25) * uPx, d = vec2(0.25, 0.25) * uPx;
  float j = 0.25 * (lu(texture(uJetzt, v + a).rgb) + lu(texture(uJetzt, v + b).rgb) + lu(texture(uJetzt, v + c).rgb) + lu(texture(uJetzt, v + d).rgb));
  float p = 0.25 * (lu(texture(uVor, v + a).rgb) + lu(texture(uVor, v + b).rgb) + lu(texture(uVor, v + c).rgb) + lu(texture(uVor, v + d).rgb));
  o = vec4(j, p, 0, 1);
}`;
const FS_LK = KOPF + `uniform sampler2D uLum, uF0; uniform vec2 uPx; uniform float uMitF0;
void main(){
  vec2 f0 = texture(uF0, v).xy * uMitF0;
  float a11 = 0.0, a12 = 0.0, a22 = 0.0, b1 = 0.0, b2 = 0.0;
  for (int y = -2; y <= 2; y++) for (int x = -2; x <= 2; x++) {
    vec2 p = v + vec2(x, y) * uPx;
    float g = exp(-float(x * x + y * y) / 4.5);
    float ix = 0.5 * (texture(uLum, p + vec2(uPx.x, 0)).r - texture(uLum, p - vec2(uPx.x, 0)).r);
    float iy = 0.5 * (texture(uLum, p + vec2(0, uPx.y)).r - texture(uLum, p - vec2(0, uPx.y)).r);
    float it = texture(uLum, p).r - texture(uLum, p - f0).g;
    a11 += g * ix * ix; a12 += g * ix * iy; a22 += g * iy * iy; b1 += g * ix * it; b2 += g * iy * it;
  }
  a11 += 1e-4; a22 += 1e-4;
  float det = a11 * a22 - a12 * a12;
  vec2 d = -vec2(a22 * b1 - a12 * b2, a11 * b2 - a12 * b1) / det;
  d = clamp(d, -2.0, 2.0);
  o = vec4(f0 + d * uPx, 0, 1);
}`;
const FS_FGLATT = KOPF + `uniform sampler2D uF, uAlt; uniform vec2 uPx; uniform float uNeu;
void main(){
  vec2 f = vec2(0); float s = 0.0;
  for (int y = -1; y <= 1; y++) for (int x = -1; x <= 1; x++) { float g = (x == 0 && y == 0) ? 4.0 : (x == 0 || y == 0) ? 2.0 : 1.0; f += texture(uF, v + vec2(x, y) * uPx).xy * g; s += g; }
  f /= s;
  o = vec4(mix(texture(uAlt, v).xy * 0.85, f, uNeu), 0, 1);
}`;

// ---------- Lesart I: Wischen (Bacon). Das Bild wird mitgerissen und lebt in der Farbe weiter ----------
// Das Feld W hält je Bildpunkt: rg = woher das Bild kommt (Verschiebung), b = Höhe der Farbe, a = wie stark verrieben.
// Ein Wisch verschiebt, was unter der Bürste liegt, um den Weg der Hand; jede Borste zieht ein wenig anders, darum Streifen.
// Weil nur die Verschiebung wandert und das Bild jedes Mal neu aus dem Video gelesen wird, bewegt sich das Gesicht im Wisch weiter.
const FS_WISCH = KOPF + `uniform sampler2D uAlt; uniform vec4 uS[16]; uniform vec4 uSR[16]; uniform int uN;
uniform float uSeite, uRueck, uRueckH, uLast, uReib;
void main(){
  vec2 q = vec2(v.x * uSeite, v.y);
  vec2 ver = vec2(0.0); float lad = 0.0, rill = 0.0, rib = 0.0;
  for (int k = 0; k < 16; k++) {
    if (k >= uN) break;
    vec2 a = vec2(uS[k].x * uSeite, uS[k].y), b = vec2(uS[k].z * uSeite, uS[k].w);
    float r = uSR[k].x, zug = uSR[k].y, same = uSR[k].w;
    if (uSR[k].z < 0.5) {
      vec2 ab = b - a; float L2 = dot(ab, ab);
      vec2 dir = L2 > 1e-12 ? ab * inversesqrt(L2) : vec2(1.0, 0.0), nrm = vec2(-dir.y, dir.x);
      float hu = dot(q - a, ab) / max(L2, 1e-12), h = clamp(hu, 0.0, 1.0);
      float d = length(q - a - ab * h) / r;
      if (d < 1.0) {
        // vor der Bürste liegt noch nichts auf ihr: die Kappe vorn zieht weich aus, sonst stauen sich Stufen je Bild
        float vorn = 1.0 - smoothstep(0.0, 1.0, (hu - 1.0) * sqrt(L2) / r);
        // quer zur Bahn, -1 bis 1: jede Borste hat ihren eigenen Zug, fein wie Haare
        float s = dot(q - a, nrm) / r;
        float borste = 0.55 * rauschen(vec2(s * 46.0 + same, same * 0.37)) + 0.3 * rauschen(vec2(s * 131.0 - same, 7.1)) + 0.15 * rauschen(vec2(s * 9.0, same));
        float rand = 1.0 - smoothstep(0.42, 1.0, d);
        ver += vec2(ab.x / uSeite, ab.y) * rand * vorn * zug * mix(0.12, 1.3, borste);
        lad = max(lad, rand); rill = max(rill, rand * borste);
      }
    } else {
      // Reiben: um den Daumen drehen, wie der Ärmel über das nasse Gesicht
      vec2 e = q - b; float d = length(e) / r;
      if (d < 1.0) {
        float w = 1.0 - d * d; w *= w;
        float wink = zug * w, c = cos(wink), s = sin(wink);
        vec2 quelle = vec2(c * e.x + s * e.y, -s * e.x + c * e.y);
        ver += vec2((e.x - quelle.x) / uSeite, e.y - quelle.y);
        rib = max(rib, w);
      }
    }
  }
  vec4 alt = texture(uAlt, v - ver);
  vec2 d = (alt.rg - ver) * uRueck;   // die Figur kehrt zurück: die Verschiebung klingt ab
  float hoehe = alt.b * uRueckH * (1.0 - 0.35 * lad - 0.04 * rib) + lad * uLast * (0.18 + 0.82 * rill);
  float reib = min(1.6, alt.a * uRueckH + rib * uReib);
  o = vec4(d, min(hoehe, 2.0), reib);
}`;
const FS_WISCHEN = KOPF + `uniform sampler2D uScharf, uW; uniform vec2 uPxW; uniform float uSeite, uMaterie, uT; uniform vec4 uRahmen;
vec3 bildBei(vec2 p){ return texture(uScharf, clamp(p, uRahmen.xy, uRahmen.zw)).rgb; }
void main(){
  vec4 w = texture(uW, v);
  vec2 d = w.rg; float h = w.b, reib = w.a;
  vec2 src = v + d;
  vec3 c = bildBei(src);
  // verrieben: weich, matt und etwas staubig (Bacon rieb Pastell und Staub in die nasse Farbe)
  if (reib > 0.01) {
    float m = smoothstep(0.0, 0.9, reib), rr = 0.016 * min(reib, 1.2), dreh = h21(v * 913.0) * 6.2832;
    vec3 s = vec3(0.0);
    for (int k = 0; k < 12; k++) {
      float a = float(k) * 2.39996 + dreh, rk = rr * sqrt((float(k) + 0.5) / 12.0);
      s += bildBei(src + vec2(cos(a) / uSeite, sin(a)) * rk);
    }
    s /= 12.0;
    float ls = lu(s);
    s = mix(s, vec3(ls) * vec3(1.03, 0.99, 0.93) + 0.04, 0.22 * m);
    c = mix(c, s, m);
  }
  // wo die Hand war, wird das Bild zu Öl: tiefer, wärmer, satter
  float gemalt = clamp(length(d * vec2(uSeite, 1.0)) * 30.0 + h * 2.5 + reib, 0.0, 1.0);
  vec3 oel = pow(max(c, 0.0), vec3(1.1)); float l = lu(oel);
  oel = mix(vec3(l), oel, 1.22) * vec3(1.035, 1.0, 0.955);
  c = mix(c, oel, 0.85 * gemalt);
  // Relief der Farbe: Licht von links oben, nasser Glanz auf den Graten
  float hx = texture(uW, v + vec2(uPxW.x, 0)).b - texture(uW, v - vec2(uPxW.x, 0)).b;
  float hy = texture(uW, v + vec2(0, uPxW.y)).b - texture(uW, v - vec2(0, uPxW.y)).b;
  vec3 n = normalize(vec3(-hx * uMaterie * 14.0, -hy * uMaterie * 14.0, 1.0));
  vec3 L = normalize(vec3(-0.45, 0.6, 0.66)), H = normalize(L + vec3(0.0, 0.0, 1.0));
  c *= mix(1.0, max(dot(n, L), 0.0) / L.z, 0.75);
  float glanz = max(0.0, pow(max(dot(n, H), 0.0), 70.0) - pow(H.z, 70.0));
  c += glanz * 0.55 * smoothstep(0.0, 0.08, h) * vec3(1.0, 0.98, 0.94);
  o = vec4(c, 1.0);
}`;

// ---------- Lesart II: Fäden (Pollock, Frankenthaler). Die Farbe fliesst und schlingt sich ----------
// Jeder Faden ist eine Folge kurzer Stücke mit runden Enden, auf der Grafikkarte als Abstandsfeld gezeichnet (Kante ein Bildpunkt).
// Das Ziel F hält die Deckung je Farbe: r = Lack mit dem Bild, g = schwarzer Lack, b = Aluminium, a = Deckung zusammen.
const VS_FADEN = `#version 300 es
in vec2 a; in vec4 iAB; in vec4 iW;
uniform vec2 uZiel;
out vec2 vq; flat out vec4 vAB; flat out vec4 vW;
void main(){
  vec2 A = iAB.xy * uZiel, B = iAB.zw * uZiel;
  float rm = max(iW.x, iW.y) + 1.5;
  vec2 dir = B - A; float L = length(dir); dir = L > 1e-4 ? dir / L : vec2(1.0, 0.0);
  vec2 n = vec2(-dir.y, dir.x);
  vec2 p = mix(A - dir * rm, B + dir * rm, a.x * 0.5 + 0.5) + n * rm * a.y;
  vq = p; vAB = vec4(A, B); vW = iW;
  gl_Position = vec4(p / uZiel * 2.0 - 1.0, 0.0, 1.0);
}`;
const FS_FADEN = `#version 300 es
precision highp float; in vec2 vq; flat in vec4 vAB; flat in vec4 vW; out vec4 o;
void main(){
  vec2 A = vAB.xy, ab = vAB.zw - vAB.xy;
  float h = clamp(dot(vq - A, ab) / max(dot(ab, ab), 1e-6), 0.0, 1.0);
  float r = mix(vW.x, vW.y, h), d = length(vq - A - ab * h);
  float dk = clamp(r + 0.5 - d, 0.0, 1.0);   // Kante genau ein Bildpunkt breit
  if (dk <= 0.0) discard;
  dk *= min(1.0, r * 1.6);                    // Haarlinien dünner als ein Punkt werden blasser statt breiter
  vec3 k = vW.z < 0.5 ? vec3(1.0, 0.0, 0.0) : vW.z < 1.5 ? vec3(0.0, 1.0, 0.0) : vec3(0.0, 0.0, 1.0);
  o = vec4(k * dk, dk);
}`;
// Frankenthaler: die Farbe sickert als nasser Hof in die ungrundierte Baumwolle. Eine Front wächst aus jedem Faden,
// entlang der Fasern schneller, und bleibt stehen, wenn das Wasser aufgebraucht ist (Wert = Wasser, das noch weiterwandert).
const FS_SAUG = KOPF + `uniform sampler2D uAlt, uF; uniform vec2 uPx; uniform float uSeite, uAb, uLauf;
void main(){
  float s = texture(uAlt, v).r, nm = 0.0;
  for (int k = 0; k < 8; k++) { float a = float(k) * 0.785398 + 0.39; nm = max(nm, texture(uAlt, v + vec2(cos(a), sin(a)) * uPx * 1.3).r); }
  vec2 q = vec2(v.x * uSeite, v.y);
  float faser = 0.6 * fbm(q * vec2(70.0, 9.0)) + 0.4 * fbm(q * vec2(11.0, 85.0) + 4.0);
  float abfall = (0.012 + 0.045 * (1.0 - faser)) / uLauf;
  float w = max(s, nm - abfall);
  w = max(w, min(1.0, textureLod(uF, v, 1.5).a * 1.8));
  o = vec4(w * uAb, 0.0, 0.0, 1.0);
}`;
const FS_FAEDEN = KOPF + `uniform sampler2D uScharf, uF, uS; uniform vec2 uPx; uniform float uNass, uSeite, uT; uniform vec4 uRahmen;
void main(){
  vec3 bild = texture(uScharf, v).rgb;
  vec4 f = textureLod(uF, v, 0.0);
  vec2 q = vec2(v.x * uSeite, v.y);
  // rohe Leinwand, ungrundiert: warmes Grau-Beige, Fasern ohne Gewebe
  float fa = fbm(q * 150.0) * 0.7 + (rauschen(q * vec2(640.0, 42.0)) - 0.5) * 0.3;
  vec3 lein = vec3(0.865, 0.82, 0.73) * (0.92 + 0.12 * fa);
  // der nasse Hof: darin erscheint das laufende Bild wie ein Aquarell, am Rand ein feiner dunklerer Saum (die Flutlinie)
  float w = texture(uS, v).r, ww = max(fwidth(w), 1e-4);
  float hof = smoothstep(0.0, 0.35, w);
  float saum = (smoothstep(0.0, ww * 1.5, w) - smoothstep(0.03, 0.11, w)) * smoothstep(0.0, 0.2, uNass);
  float l0 = lu(bild);
  vec3 farbstoff = clamp(mix(vec3(l0), bild, 1.7) * 1.05, 0.0, 1.0);
  vec3 fleck = lein * mix(vec3(1.0), 0.18 + 0.9 * farbstoff, 0.85 * hof);
  fleck *= 1.0 - 0.22 * saum;
  // das Klischee weicht der Leinwand, solange die Farbe nass ist; trocknet sie, kehrt es zurück
  float auf = smoothstep(0.0, 1.0, uNass);
  vec3 grund = mix(bild, fleck, auf);
  // die Fäden werfen einen kleinen Schatten nach rechts unten
  float sch = textureLod(uF, v + vec2(-1.4, 1.9) * uPx, 0.0).a;
  grund *= 1.0 - 0.32 * sch * (1.0 - f.a) * smoothstep(0.0, 0.45, uNass);
  float dk = f.a * smoothstep(0.0, 0.45, uNass);
  if (dk < 0.002) { o = vec4(grund, 1.0); return; }
  vec3 k = f.rgb / max(f.a, 1e-4);
  float l = lu(bild);
  vec3 lack = clamp(mix(vec3(l), bild, 1.55) * 1.1, 0.0, 1.0);
  vec3 silber = vec3(0.73, 0.745, 0.765) + 0.16 * (fbm(q * 7.0 + uT * 0.04) - 0.5);
  vec3 farbe = k.r * lack + k.g * vec3(0.028, 0.026, 0.03) + k.b * silber;
  // Lack steht auf: Relief aus der Deckung, Glanzlicht auf der Kuppe
  float ax = textureLod(uF, v + vec2(uPx.x, 0.0), 0.0).a - textureLod(uF, v - vec2(uPx.x, 0.0), 0.0).a;
  float ay = textureLod(uF, v + vec2(0.0, uPx.y), 0.0).a - textureLod(uF, v - vec2(0.0, uPx.y), 0.0).a;
  vec3 n = normalize(vec3(-ax * 0.9, -ay * 0.9, 1.0));
  vec3 L = normalize(vec3(-0.45, 0.6, 0.66)), H = normalize(L + vec3(0.0, 0.0, 1.0));
  farbe *= mix(1.0, max(dot(n, L), 0.0) / L.z, 0.6);
  // der Lack sammelt sich am Rand: eine feine dunklere Kante gibt dem Faden Halt
  farbe *= 1.0 - 0.45 * smoothstep(0.08, 0.6, length(vec2(ax, ay))) * (1.0 - k.g);
  float glanz = max(0.0, pow(max(dot(n, H), 0.0), 26.0) - pow(H.z, 26.0));
  farbe += glanz * (0.35 + 0.6 * k.b) * (1.0 - 0.4 * k.g);
  o = vec4(mix(grund, farbe, dk), 1.0);
}`;

// ---------- Lesart III: Kräfte (Foucault). Die Karte der Kräfteverhältnisse ----------
// Die Kraftlinien sind Linienintegralfaltung (Cabral, Leedom 1993) über einem Feld aus drei Kräften:
// der Struktur des Bildes (Strukturtensor, die Kanten entlang), seiner Bewegung (optischer Fluss) und den Kräften der Finger.
const FS_TENSOR = KOPF + `uniform sampler2D uQ; uniform vec2 uPx;
void main(){
  float a = lu(texture(uQ, v + vec2(-uPx.x, uPx.y)).rgb), b = lu(texture(uQ, v + vec2(0.0, uPx.y)).rgb), c = lu(texture(uQ, v + uPx).rgb);
  float d = lu(texture(uQ, v - vec2(uPx.x, 0.0)).rgb), f = lu(texture(uQ, v + vec2(uPx.x, 0.0)).rgb);
  float g = lu(texture(uQ, v - uPx).rgb), h = lu(texture(uQ, v - vec2(0.0, uPx.y)).rgb), i = lu(texture(uQ, v + vec2(uPx.x, -uPx.y)).rgb);
  float gx = (c + 2.0 * f + i) - (a + 2.0 * d + g), gy = (a + 2.0 * b + c) - (g + 2.0 * h + i);
  o = vec4(gx * gx, gy * gy, gx * gy, 1.0);
}`;
const FS_KRAFT = KOPF + `uniform sampler2D uAlt; uniform vec2 uPx; uniform vec4 uS[16]; uniform vec4 uSR[16]; uniform int uN; uniform float uSeite, uAb, uAbZeig;
void main(){
  vec4 alt = texture(uAlt, v);
  vec4 n4 = 0.25 * (texture(uAlt, v + vec2(uPx.x, 0)) + texture(uAlt, v - vec2(uPx.x, 0)) + texture(uAlt, v + vec2(0, uPx.y)) + texture(uAlt, v - vec2(0, uPx.y)));
  vec2 F = mix(alt.rg, n4.rg, 0.25) * uAb;
  // die Karte bleibt, solange Kräfte wirken, und verblasst danach; dann ist das Klischee wieder da
  float zeig = max(alt.b, n4.b - 0.03) * uAbZeig;
  vec2 q = vec2(v.x * uSeite, v.y);
  for (int k = 0; k < 16; k++) {
    if (k >= uN) break;
    vec2 a = vec2(uS[k].x * uSeite, uS[k].y), b = vec2(uS[k].z * uSeite, uS[k].w);
    float r = uSR[k].x;
    if (uSR[k].z < 0.5) {
      vec2 ab = b - a; float L2 = dot(ab, ab);
      float h = clamp(dot(q - a, ab) / max(L2, 1e-12), 0.0, 1.0), d = length(q - a - ab * h) / r;
      vec2 dir = L2 > 1e-12 ? ab * inversesqrt(L2) : vec2(0.0);
      F += dir * exp(-d * d * 2.0) * uSR[k].y;
      zeig = max(zeig, smoothstep(2.8, 0.8, d));
    } else {
      vec2 e = q - b; float l = length(e), d = l / r;
      vec2 t = vec2(-e.y, e.x) / max(l, 1e-4) * uSR[k].w, innen = -e / max(l, 1e-4);
      F += (t * 0.85 + innen * 0.3) * exp(-d * d * 0.55) * uSR[k].y;
      zeig = max(zeig, smoothstep(3.4, 1.0, d));
    }
  }
  float lf = length(F); if (lf > 1.6) F *= 1.6 / lf;
  o = vec4(F, min(zeig, 1.0), 1.0);
}`;
const FS_KFELD = KOPF + `uniform sampler2D uT, uFl, uK; uniform vec2 uPxFl; uniform float uBew, uKraft, uZeit, uSeite;
void main(){
  vec3 J = texture(uT, v).rgb;
  float a = J.r - J.g, b2 = 2.0 * J.b;
  float koh = sqrt(a * a + b2 * b2) / (J.r + J.g + 1e-4);
  float ang = 0.5 * atan(b2, a);
  vec2 tang = vec2(-sin(ang), cos(ang));   // entlang der Kanten
  vec2 m = texture(uFl, v).xy / uPxFl * 0.7; float lm = length(m); if (lm > 1.6) m *= 1.6 / lm;
  vec2 F = texture(uK, v).rg;
  // ein langsamer Wirbel aus Rauschen, damit auch leere Flächen fliessen
  vec2 qq = vec2(v.x * uSeite, v.y) * 2.4 + uZeit * 0.012;
  float n0 = fbm(qq), nx = fbm(qq + vec2(0.02, 0.0)), ny = fbm(qq + vec2(0.0, 0.02));
  vec2 wirbel = vec2(ny - n0, n0 - nx); wirbel /= max(length(wirbel), 1e-5);
  vec2 kraft = m * uBew * 1.3 + F * uKraft * 2.4;
  vec2 basis = tang * (0.2 + 0.9 * smoothstep(0.04, 0.45, koh));
  if (dot(basis, kraft + wirbel * 0.2) < 0.0) basis = -basis;
  vec2 g = basis + kraft + wirbel * 0.22;
  float lg = length(g);
  o = vec4(g / max(lg, 1e-5), min(lg, 4.0), 1.0);
}`;
const FS_KRAEFTE = KOPF + `#define N ${LIC_SCHRITTE}
uniform sampler2D uScharf, uV, uK, uR; uniform vec2 uPx; uniform float uSchritt, uPhase, uKraft; uniform vec4 uRahmen;
void main(){
  vec3 bild = texture(uScharf, v).rgb;
  vec4 k = texture(uK, v);
  float zeig = k.b;
  if (zeig < 0.003) { o = vec4(bild, 1.0); return; }
  float sum = 0.0, ws = 0.0, w2 = 0.0;
  vec2 d0 = texture(uV, v).xy;
  for (int r = 0; r < 2; r++) {
    float sg = r == 0 ? 1.0 : -1.0;
    vec2 p = v, dv = d0 * sg;
    for (int i = 0; i <= N; i++) {
      if (i > 0 || r == 0) {
        float s = float(i) * sg;
        // Fenster entlang der Linie, darin wandernde Pulse: die Kraft fliesst
        float w = (0.5 + 0.5 * cos(3.14159 * float(i) / float(N + 1))) * (0.6 + 0.4 * cos(s * 0.5 - uPhase));
        float n = texture(uR, p).r;
        sum += n * w; ws += w; w2 += w * w;
      }
      vec2 d = texture(uV, p).xy; if (dot(d, dv) < 0.0) d = -d; dv = d;
      p += d * uPx * uSchritt;
    }
  }
  float z = (sum / ws - 0.5) / sqrt(w2 / (ws * ws) / 12.0) * 1.6;
  // wie ein Kupferstich: im Dunkeln wenige, im Hellen viele Linien; Kante aus dem Verlauf, nicht hart
  float l = lu(bild);
  float schwelle = mix(1.05, -0.85, l);
  float hell = smoothstep(schwelle - 0.65, schwelle + 0.65, z);
  vec3 linie = clamp(mix(vec3(l), bild, 1.35) * 1.3 + 0.04, 0.0, 1.2);
  vec3 c = mix(bild * 0.07 + 0.008, linie, hell);
  c *= 1.0 + 0.55 * length(k.rg) * uKraft;
  o = vec4(mix(bild, c, smoothstep(0.0, 0.75, zeig)), 1.0);
}`;

// ---------- Nachbearbeitung: Leuchten, glatte Kanten, Filmkorn (wie in den anderen Operatoren) ----------
const FS_HELL = KOPF + `uniform sampler2D uQ; uniform vec2 uPx; uniform float uAb;
void main(){
  vec3 c = 0.25 * (texture(uQ, v + uPx * vec2(-1, -1)).rgb + texture(uQ, v + uPx * vec2(1, -1)).rgb
                 + texture(uQ, v + uPx * vec2(-1, 1)).rgb + texture(uQ, v + uPx * vec2(1, 1)).rgb);
  float l = max(c.r, max(c.g, c.b));
  o = vec4(c * smoothstep(uAb, uAb + 0.5, l), 1.0);
}`;
const FS_WEICH = KOPF + `uniform sampler2D uQ; uniform vec2 uRichtung;
void main(){
  vec3 c = texture(uQ, v).rgb * 0.2270270270;
  c += (texture(uQ, v + uRichtung * 1.3846153846).rgb + texture(uQ, v - uRichtung * 1.3846153846).rgb) * 0.3162162162;
  c += (texture(uQ, v + uRichtung * 3.2307692308).rgb + texture(uQ, v - uRichtung * 3.2307692308).rgb) * 0.0702702703;
  o = vec4(c, 1.0);
}`;
const FS_ZUSAMMEN = KOPF + `uniform sampler2D uSzene, uGlow; uniform vec2 uPx; uniform float uGlowStaerke, uT, uKorn, uFxaa;
float h(float n){ return fract(sin(n * 91.345 + 7.13) * 43758.5453); }
void main(){
  vec3 m = texture(uSzene, v).rgb, c = m;
  if (uFxaa > 0.5) {
    vec3 nw = texture(uSzene, v + vec2(-1, -1) * uPx).rgb, ne = texture(uSzene, v + vec2(1, -1) * uPx).rgb;
    vec3 sw = texture(uSzene, v + vec2(-1, 1) * uPx).rgb, se = texture(uSzene, v + vec2(1, 1) * uPx).rgb;
    float lnw = lu(nw), lne = lu(ne), lsw = lu(sw), lse = lu(se), lm = lu(m);
    float lmin = min(lm, min(min(lnw, lne), min(lsw, lse))), lmax = max(lm, max(max(lnw, lne), max(lsw, lse)));
    vec2 d = vec2(-((lnw + lne) - (lsw + lse)), (lnw + lsw) - (lne + lse));
    float red = max((lnw + lne + lsw + lse) * 0.03125, 1.0 / 128.0);
    d = clamp(d / (min(abs(d.x), abs(d.y)) + red), -8.0, 8.0) * uPx;
    vec3 A = 0.5 * (texture(uSzene, v + d * (1.0 / 3.0 - 0.5)).rgb + texture(uSzene, v + d * (2.0 / 3.0 - 0.5)).rgb);
    vec3 B = A * 0.5 + 0.25 * (texture(uSzene, v - d * 0.5).rgb + texture(uSzene, v + d * 0.5).rgb);
    float lb = lu(B);
    c = (lb < lmin || lb > lmax) ? A : B;
  }
  c += texture(uGlow, v).rgb * uGlowStaerke;
  float l = lu(c);
  c += (h(dot(v, vec2(12.9898, 78.233)) * 100.0 + uT) - 0.5) * uKorn * (0.35 + 1.3 * l * (1.0 - l));
  o = vec4(c, 1.0);
}`;
function programm(fs, vs = VS) {
  const mk = (typ, src) => { const s = gl.createShader(typ); gl.shaderSource(s, src); gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s)); return s; };
  const p = gl.createProgram(); gl.attachShader(p, mk(gl.VERTEX_SHADER, vs)); gl.attachShader(p, mk(gl.FRAGMENT_SHADER, fs)); gl.bindAttribLocation(p, 0, 'a');
  gl.linkProgram(p); if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(p));
  // Orte aller Uniforms: einmal erfragen, dann über p.u.Name
  p.u = {};
  const n = gl.getProgramParameter(p, gl.ACTIVE_UNIFORMS);
  for (let i = 0; i < n; i++) { const info = gl.getActiveUniform(p, i), name = info.name.replace(/\[0\]$/, ''); p.u[name] = gl.getUniformLocation(p, info.name); }
  return p;
}

const P = {};
let halbFloat = false;
const ziele = {};
// Ziel zum Hineinrechnen; float: HalfFloat, wenn möglich (Telefonregel: nie Float32)
function zielBauen(name, b, hh, float = true) {
  const z = ziele[name] || (ziele[name] = { tex: gl.createTexture(), fb: gl.createFramebuffer() });
  const f = float && halbFloat;
  if (z.b === b && z.h === hh && z.f === f) return z;
  z.b = b; z.h = hh; z.f = f;
  gl.bindTexture(gl.TEXTURE_2D, z.tex);
  gl.texImage2D(gl.TEXTURE_2D, 0, f ? gl.RGBA16F : gl.RGBA8, b, hh, 0, gl.RGBA, f ? gl.HALF_FLOAT : gl.UNSIGNED_BYTE, null);
  for (const [k, w] of [[gl.TEXTURE_MIN_FILTER, gl.LINEAR], [gl.TEXTURE_MAG_FILTER, gl.LINEAR], [gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE], [gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE]]) gl.texParameteri(gl.TEXTURE_2D, k, w);
  gl.bindFramebuffer(gl.FRAMEBUFFER, z.fb);
  gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, z.tex, 0);
  if (f && gl.checkFramebufferStatus(gl.FRAMEBUFFER) !== gl.FRAMEBUFFER_COMPLETE) {
    halbFloat = false; spur('kein HalfFloat-Ziel'); for (const k in ziele) ziele[k].b = 0; gl.bindFramebuffer(gl.FRAMEBUFFER, null); return zielBauen(name, b, hh, float);
  }
  gl.clearColor(0, 0, 0, 0); gl.clear(gl.COLOR_BUFFER_BIT);
  gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  return z;
}
// Ziel mit voller Genauigkeit, nur für die wenigen Punkte der Linien (Halbgenauigkeit liesse sie wandern)
function ziel32(name, b, hh) {
  const z = ziele[name] || (ziele[name] = { tex: gl.createTexture(), fb: gl.createFramebuffer() });
  if (z.b === b && z.h === hh) return z;
  z.b = b; z.h = hh;
  gl.bindTexture(gl.TEXTURE_2D, z.tex);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA32F, b, hh, 0, gl.RGBA, gl.FLOAT, null);
  for (const [k, w] of [[gl.TEXTURE_MIN_FILTER, gl.NEAREST], [gl.TEXTURE_MAG_FILTER, gl.NEAREST], [gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE], [gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE]]) gl.texParameteri(gl.TEXTURE_2D, k, w);
  gl.bindFramebuffer(gl.FRAMEBUFFER, z.fb);
  gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, z.tex, 0);
  z.ok = gl.checkFramebufferStatus(gl.FRAMEBUFFER) === gl.FRAMEBUFFER_COMPLETE;
  gl.clearColor(0, 0, 0, 0); gl.clear(gl.COLOR_BUFFER_BIT);
  gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  return z;
}
// Paar zum Hin- und Herrechnen
function paar(name, b, hh, float = true) {
  const a = zielBauen(name + '0', b, hh, float), c = zielBauen(name + '1', b, hh, float);
  const p = ziele[name] || (ziele[name] = { nr: 0 });
  p.lesen = () => (p.nr ? c : a); p.schreiben = () => (p.nr ? a : c); p.tauschen = () => { p.nr = 1 - p.nr; };
  return p;
}
const zeichneFlaeche = () => gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
// eine Fläche in ein Ziel rechnen; tex: { uName: textur } (2D) – die Einheiten werden der Reihe nach vergeben
function rechne(prog, ziel, tex, setze) {
  gl.bindFramebuffer(gl.FRAMEBUFFER, ziel ? ziel.fb : null);
  gl.viewport(0, 0, ziel ? ziel.b : leinwand.width, ziel ? ziel.h : leinwand.height);
  gl.useProgram(prog);
  let e = 1;
  for (const [n, t] of Object.entries(tex)) {
    gl.activeTexture(gl.TEXTURE0 + e);
    if (t && t.array) gl.bindTexture(gl.TEXTURE_2D_ARRAY, t.array); else gl.bindTexture(gl.TEXTURE_2D, t ? t.tex || t : null);
    gl.uniform1i(prog.u[n], e); e++;
  }
  if (setze) setze(prog.u);
  zeichneFlaeche();
}

const STUECKE_MAX = 6000;   // Stücke der Fäden je Bild
let flussB = 0, scharfTex = null, scharfB = 0, scharfH = 0, arbeitB = 0, arbeitH = 0, wischB = 0, wischH = 0, kraftB = 0, kraftH = 0;
let saugB = 0, saugH = 0, fadenB = 0, fadenH = 0, faedenLeeren = true, rauschTex = null, rauschB = 0, fadenVao = null, fadenPuffer = null;
if (gl) {
  halbFloat = !!gl.getExtension('EXT_color_buffer_float');
  gl.getExtension('OES_texture_half_float_linear');
  try {
    for (const [n, fs] of Object.entries({ kopie: FS_KOPIE, lum: FS_LUM, lk: FS_LK, fglatt: FS_FGLATT, wisch: FS_WISCH, wischen: FS_WISCHEN,
      faeden: FS_FAEDEN, saug: FS_SAUG, tensor: FS_TENSOR, kraft: FS_KRAFT, kfeld: FS_KFELD, kraefte: FS_KRAEFTE, hell: FS_HELL, weich: FS_WEICH, zusammen: FS_ZUSAMMEN })) P[n] = programm(fs);
    P.faden = programm(FS_FADEN, VS_FADEN);
  } catch (e) { spur('Shader: ' + String(e.message).slice(0, 140)); console.error(e); melden(TEXTE[sprache].keinGL); }
  const buf = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
  gl.enableVertexAttribArray(0); gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
  // Fäden: eigene Ablage der Eckpunkte, je Stück zwei Enden (iAB) und Breiten, Farbe, Same (iW)
  if (P.faden) {
    fadenVao = gl.createVertexArray(); gl.bindVertexArray(fadenVao);
    gl.bindBuffer(gl.ARRAY_BUFFER, buf); gl.enableVertexAttribArray(0); gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
    fadenPuffer = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, fadenPuffer);
    gl.bufferData(gl.ARRAY_BUFFER, STUECKE_MAX * 32, gl.DYNAMIC_DRAW);
    const lAB = gl.getAttribLocation(P.faden, 'iAB'), lW = gl.getAttribLocation(P.faden, 'iW');
    gl.enableVertexAttribArray(lAB); gl.vertexAttribPointer(lAB, 4, gl.FLOAT, false, 32, 0); gl.vertexAttribDivisor(lAB, 1);
    gl.enableVertexAttribArray(lW); gl.vertexAttribPointer(lW, 4, gl.FLOAT, false, 32, 16); gl.vertexAttribDivisor(lW, 1);
    gl.bindVertexArray(null); gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  }
  spur('Grafik bereit' + (halbFloat ? '' : ' (8 Bit)'));
}

const scharf = document.createElement('canvas');
const sctx = scharf.getContext('2d', { alpha: false });

// Auflösung passt sich an: ruckelt es, rechnet das Bild mit weniger Bildpunkten (bis zur Hälfte)
let aufloesung = 1, messung = [], letzteAnpassung = 0;
const FEST = Q.has('fest');   // feste Auflösung, für Standbilder und Prüfungen
function tempoMessen(ms, dt) {
  if (aufnehmer || document.hidden || FEST) { messung = []; return; }
  messung.push(dt);
  if (messung.length < 30 || ms - letzteAnpassung < 1500) return;
  messung.sort((a, b) => a - b);
  const mitte = messung[15]; messung = [];
  let neu = aufloesung;
  if (mitte > 24) neu = Math.max(leicht ? 0.35 : 0.5, aufloesung * 0.82);
  else if (mitte < 17.5 && aufloesung < 1) neu = Math.min(1, aufloesung * 1.12);
  if (neu !== aufloesung) { aufloesung = neu; letzteAnpassung = ms; groesse(); spur('Auflösung ' + aufloesung.toFixed(2)); }
}
const seitenMass = (lang) => { const s = innerWidth / innerHeight; return s >= 1 ? [lang, Math.round(lang / s)] : [Math.round(lang * s), lang]; };
function texParam(filter = gl.LINEAR, min = filter) {
  for (const [k, w] of [[gl.TEXTURE_MIN_FILTER, min], [gl.TEXTURE_MAG_FILTER, filter], [gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE], [gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE]]) gl.texParameteri(gl.TEXTURE_2D, k, w);
}
function groesse() {
  const dpr = Math.min(devicePixelRatio || 1, MAX_DPR) * aufloesung;
  const b = Math.round(innerWidth * dpr), hh = Math.round(innerHeight * dpr);
  if (leinwand.width !== b || leinwand.height !== hh) { leinwand.width = b; leinwand.height = hh; }
  if (!gl) return;
  const lang = Math.min(SCHARF_SEITE, Math.max(ARBEIT, Math.round(Math.max(innerWidth, innerHeight) * Math.min(devicePixelRatio || 1, 2))));
  const [sb, sh] = seitenMass(lang);
  if (sb !== scharfB || sh !== scharfH) {
    scharfB = sb; scharfH = sh; scharf.width = sb; scharf.height = sh;
    if (!scharfTex) scharfTex = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, scharfTex);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, sb, sh, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
    texParam();
  }
  const [ab, ah] = seitenMass(ARBEIT);
  if (ab !== arbeitB || ah !== arbeitH) {
    arbeitB = ab; arbeitH = ah;
    paar('jetzt', ab, ah, false);
    const [tb, th] = seitenMass(Math.round(ARBEIT / 2)); zielBauen('tensor', tb, th); zielBauen('tensorB', tb, th);
  }
  const [fb, fh] = seitenMass(FLUSS_SEITE);
  if (fb !== flussB) {
    flussB = fb;
    for (let k = 0; k < 3; k++) { const [b2, h2] = seitenMass(Math.round(FLUSS_SEITE / (1 << k))); zielBauen('lum' + k, b2, h2); zielBauen('fl' + k, b2, h2); zielBauen('flb' + k, b2, h2); }
    paar('fluss', fb, fh);
  }
  const [wb, wh] = seitenMass(WISCH_SEITE);
  if (wb !== wischB || wh !== wischH) { wischB = wb; wischH = wh; paar('w', wb, wh); wischLeeren = true; }
  const [gb, gh] = seitenMass(SAUG_SEITE);
  if (gb !== saugB || gh !== saugH) { saugB = gb; saugH = gh; paar('s', gb, gh); saugLeeren = true; }
  const [kb, kh] = seitenMass(KRAFT_SEITE);
  if (kb !== kraftB || kh !== kraftH) { kraftB = kb; kraftH = kh; paar('k', kb, kh); zielBauen('kfeld', kb, kh); kraftLeeren = true; }
  // Fäden: so fein wie der Bildschirm, unabhängig von der anpassenden Auflösung (sonst gingen sie bei jedem Ruckeln verloren)
  const fdpr = Math.min(devicePixelRatio || 1, MAX_DPR);
  const nb = Math.round(innerWidth * fdpr), nh = Math.round(innerHeight * fdpr);
  if (nb !== fadenB || nh !== fadenH) {
    fadenB = nb; fadenH = nh;
    const z = ziele.faeden || (ziele.faeden = { tex: gl.createTexture(), fb: gl.createFramebuffer() });
    z.b = nb; z.h = nh;
    gl.bindTexture(gl.TEXTURE_2D, z.tex);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, nb, nh, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
    texParam(gl.LINEAR, gl.LINEAR_MIPMAP_LINEAR); gl.generateMipmap(gl.TEXTURE_2D);
    gl.bindFramebuffer(gl.FRAMEBUFFER, z.fb); gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, z.tex, 0);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    faedenLeeren = true;
    // weisses Rauschen für die Kraftlinien, etwas gröber als der Bildschirm, damit die Linien zwei Punkte breit und glatt sind
    const rb = Math.max(64, Math.round(nb / 1.7)), rh = Math.max(64, Math.round(nh / 1.7));
    if (rb !== rauschB) {
      rauschB = rb;
      const d = new Uint8Array(rb * rh); for (let i = 0; i < d.length; i += 65536) crypto.getRandomValues(d.subarray(i, i + 65536));
      if (!rauschTex) rauschTex = gl.createTexture();
      gl.bindTexture(gl.TEXTURE_2D, rauschTex); gl.pixelStorei(gl.UNPACK_ALIGNMENT, 1);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.R8, rb, rh, 0, gl.RED, gl.UNSIGNED_BYTE, d);
      gl.pixelStorei(gl.UNPACK_ALIGNMENT, 4); texParam();
    }
  }
  if (fotos.length) fotoBuehneGroesse();
}
addEventListener('resize', groesse);

// ---------- Quellen (wie im Kristall und in den Schichten) ----------
let quelle = null, spiegelnQuelle = false;
const videoEl = document.createElement('video');
videoEl.muted = true; videoEl.playsInline = true; videoEl.loop = true;

let blick = 'environment';
async function kameraZahl() {
  try { return (await navigator.mediaDevices.enumerateDevices()).filter((d) => d.kind === 'videoinput').length; } catch (e) { return 1; }
}
async function kameraStarten() {
  spur('Kamera anfragen');
  const alt = videoEl.srcObject; if (alt) alt.getTracks().forEach((t) => t.stop());
  let strom = null;
  try { strom = await navigator.mediaDevices.getUserMedia({ video: { facingMode: blick, width: { ideal: 1920 }, height: { ideal: 1080 } }, audio: false }); }
  catch (e) {
    blick = blick === 'user' ? 'environment' : 'user';
    try { strom = await navigator.mediaDevices.getUserMedia({ video: { facingMode: blick }, audio: false }); } catch (e2) {}
  }
  if (!strom) { spur('Kamera abgelehnt'); return melden(TEXTE[sprache].keineKamera); }
  videoEl.removeAttribute('src'); videoEl.srcObject = strom; await videoEl.play();
  const zahl = await kameraZahl();
  spur('Kamera ' + videoEl.videoWidth + '×' + videoEl.videoHeight);
  const echt = strom.getVideoTracks()[0]?.getSettings?.().facingMode;
  quelle = videoEl; spiegelnQuelle = echt ? echt === 'user' : zahl < 2; starten();
  $('wenden').hidden = zahl < 2;
}
$('wenden').addEventListener('click', () => { blick = blick === 'user' ? 'environment' : 'user'; kameraStarten(); });

let videoUrl = null;
function videoFrei() { if (videoUrl) { URL.revokeObjectURL(videoUrl); videoUrl = null; } }
function videoStarten(datei) {
  spur('Video gewählt');
  const alt = videoEl.srcObject; if (alt) alt.getTracks().forEach((t) => t.stop());
  videoEl.srcObject = null; $('wenden').hidden = true; videoFrei();
  videoUrl = URL.createObjectURL(datei); videoEl.src = videoUrl;
  videoEl.play().then(() => { quelle = videoEl; spiegelnQuelle = false; starten(); }).catch(() => { spur('Video unlesbar'); melden(dateiMeldung(sprache, 'video')); });
}

// Beispiele: Christians Porträt «Wan, Pendel» und «Infinite Mantra» (liegen beim Kristall); jedes Tippen nimmt das nächste
const BEISPIELE = ['../kristall/beispiel.mp4?v=2', '../kristall/mantra.mp4?v=1'];
function beispielStarten(e) {
  let nr = 0;
  try { nr = e ? (+(localStorage.getItem('diagramm.beispiel') || 0)) % BEISPIELE.length : 0; localStorage.setItem('diagramm.beispiel', String(nr + 1)); } catch {}
  spur('Beispiel ' + (nr + 1));
  const alt = videoEl.srcObject; if (alt) alt.getTracks().forEach((t) => t.stop());
  videoEl.srcObject = null; $('wenden').hidden = true; videoFrei(); videoEl.src = BEISPIELE[nr];
  videoEl.play().then(() => { quelle = videoEl; spiegelnQuelle = false; starten(); })
    .catch(() => { spur('Beispielvideo fehlt'); melden(TEXTE[sprache].keineKamera); });
}

addEventListener('pointerdown', klangStarten, { capture: true });
$('kamera').addEventListener('click', kameraStarten);
$('beispiel').addEventListener('click', beispielStarten);
$('datei').addEventListener('change', (e) => {
  const alle = [...e.target.files]; e.target.value = '';
  const film = alle.find(istVideo);
  if (film) return videoStarten(film);
  const bilder = alle.filter(istFoto);
  if (bilder.length) fotosStarten(bilder);
  else if (alle.length) { spur('Datei unbekannt: ' + (alle[0].type || alle[0].name)); melden(dateiMeldung(sprache, 'nichts')); }
});

// Fotos: ein Foto hat keine Dauer, also bekommt es eine. Eine langsame Fahrt durch das Foto, mehrere lösen einander ab.
const fotoBuehne = document.createElement('canvas');
let fotos = [], fotoStart = 0;
const FOTO_DAUER = 3.2, FOTO_BLENDE = 1.1;
function fotoBuehneGroesse() {
  const b = scharfB || 960, h = scharfH || Math.round(960 * innerHeight / Math.max(innerWidth, 1));
  if (fotoBuehne.width !== b || fotoBuehne.height !== h) { fotoBuehne.width = b; fotoBuehne.height = h; }
}
async function fotosStarten(dateien) {
  spur('Fotos gewählt: ' + dateien.length);
  for (const f of fotos) f.close?.();
  fotos = [];
  for (const d of dateien.slice(0, 24)) {
    // Telefonregel: höchstens 2400 Punkte (fotoLesen in gemeinsam/fotos.js)
    try { fotos.push(await fotoLesen(d)); }
    catch (e) { spur('Foto unlesbar: ' + String(e.message || e).slice(0, 140)); }
  }
  if (!fotos.length) return melden(dateiMeldung(sprache, dateien.some(istHeic) ? 'heic' : 'foto'));
  const alt = videoEl.srcObject; if (alt) alt.getTracks().forEach((t) => t.stop());
  videoEl.pause(); videoFrei();
  fotoBuehneGroesse();
  $('wenden').hidden = true; quelle = fotoBuehne; spiegelnQuelle = false; fotoStart = performance.now() / 1000; starten();
}
function fotoMalen(t) {
  fotosMalen(fotoBuehne.getContext('2d'), fotos, fotoBuehne.width, fotoBuehne.height, t - fotoStart,
    { dauer: FOTO_DAUER, blende: FOTO_BLENDE, art: 'fahrt', mix: fahrt.schritt(t) });
}
// Fahrt durch das Foto an und aus (feines Zeichen unten rechts, nur bei Fotos); zuerst ruhig, das ganze Foto
const fahrtKnopf = document.createElement('button');
fahrtKnopf.className = 'fahrt'; fahrtKnopf.hidden = true; fahrtKnopf.innerHTML = FAHRT_SVG;
$('wenden').after(fahrtKnopf);
const fahrt = fahrtSchalter(fahrtKnopf, false);
function fahrtSehen() { const weg = quelle !== fotoBuehne; if (fahrtKnopf.hidden !== weg) fahrtKnopf.hidden = weg; }

let rahmen = [0, 0, 1, 1];   // wo das Bild steht, in Anteilen der Leinwand (y nach oben)
function malenIn(ctx, B, H) {
  const q = quelle; if (!q) return false;
  const qb = q.videoWidth || q.width, qh = q.videoHeight || q.height;
  if (!qb || !qh) return false;
  ctx.save();
  if (spiegelnQuelle) { ctx.translate(B, 0); ctx.scale(-1, 1); }
  // weicht das Format stark ab, steht das ganze Bild in der Mitte, daneben Saalschwarz (wie im Kristall)
  const deck = Math.max(B / qb, H / qh), ganz = Math.min(B / qb, H / qh);
  if (deck / ganz > 1.7) {
    const rb = qb * ganz / B, rh = qh * ganz / H; rahmen = [(1 - rb) / 2, (1 - rh) / 2, (1 + rb) / 2, (1 + rh) / 2];
    ctx.fillStyle = '#0a0a0b'; ctx.fillRect(0, 0, B, H);
    ctx.drawImage(q, (B - qb * ganz) / 2, (H - qh * ganz) / 2, qb * ganz, qh * ganz);
  } else { rahmen = [0, 0, 1, 1]; ctx.drawImage(q, (B - qb * deck) / 2, (H - qh * deck) / 2, qb * deck, qh * deck); }
  ctx.restore();
  return true;
}
let neuesBild = true, letzteQuellzeit = -1;
function scharfFangen() {
  if (!scharfTex || !malenIn(sctx, scharfB, scharfH)) return false;
  gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, scharfTex);
  gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
  gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, gl.RGBA, gl.UNSIGNED_BYTE, scharf);
  gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
  // kam ein neues Bild? (Video mit 16 Bildern je Sekunde, Leinwand mit 60): nur dann schiebt die Bewegung die Strömung
  const qz = quelle === videoEl && !videoEl.srcObject ? videoEl.currentTime : -2;
  neuesBild = qz === -2 || qz !== letzteQuellzeit; letzteQuellzeit = qz;
  return true;
}

// ---------- Regler und Lesarten ----------
// Je Lesart drei Regler mit eigenem Sinn; die Werte bleiben je Lesart erhalten.
const WERTE = [[0.55, 0.5, 0.45], [0.45, 0.5, 0.55], [0.55, 0.5, 0.5]];
let lesart = 0;
const regler = ['r-a', 'r-b', 'r-c'];
function reglerBeschriften() {
  const t = TEXTE[sprache];
  ['n-a', 'n-b', 'n-c'].forEach((id, k) => { $(id).textContent = t.regler[lesart][k]; });
  regler.forEach((id, k) => { $(id).value = String(WERTE[lesart][k]); $(id).setAttribute('aria-label', t.regler[lesart][k]); });
}
regler.forEach((id, k) => $(id).addEventListener('input', (e) => { WERTE[lesart][k] = +e.target.value; }));
let titelUhr = 0;
function lesartWaehlen(nr, still) {
  const war = lesart;
  lesart = nr;
  $('buehne').dataset.art = String(nr);
  document.querySelectorAll('[data-lesart]').forEach((b) => b.setAttribute('aria-pressed', String(+b.dataset.lesart === nr)));
  $('r-lesart').value = String(nr);
  $('daumen-text').textContent = TEXTE[sprache].daumen[nr];
  reglerBeschriften();
  lesartText();
  // jede Lesart beginnt unberührt: das Klischee, keine Fäden, keine Kräfte
  if (war !== nr) leeren();
  if (still) return;
  const z = TEXTE[sprache].lesarten[nr], g = $('geste');
  g.textContent = z.titel + ' · ' + z.wer; g.hidden = false; g.classList.remove('weg');
  clearTimeout(titelUhr); titelUhr = setTimeout(() => { g.textContent = z.geste; setTimeout(() => g.classList.add('weg'), 2600); }, 1800);
  glosse('lesarten');
  spur('Lesart ' + nr);
}
function lesartText() {
  const z = TEXTE[sprache].lesarten[lesart];
  $('b-lesart-titel').textContent = z.titel + ' · ' + z.wer;
  $('b-lesart-text').textContent = z.text;
}
document.querySelectorAll('[data-lesart]').forEach((b) => b.addEventListener('click', () => lesartWaehlen(+b.dataset.lesart)));
$('r-lesart').addEventListener('input', (e) => { const nr = +e.target.value; if (nr !== lesart) lesartWaehlen(nr); });

let nass = 0, trockenSeit = 0, saugLeeren = true;
let wischLeeren = true, kraftLeeren = true, tinte = 0, menge = 0, tempoHand = 0, reiben = 0, kraftEnergie = 0;
function leeren() {
  wischLeeren = true; faedenLeeren = true; saugLeeren = true; kraftLeeren = true; tinte = 0; menge = 0;
  for (const f of finger.values()) f.jets = null;
  nass = 0; trockenSeit = 0;
}

// ---------- Stempel der Hand ----------
// Wisch und Zug: von (x0, y0) nach (x, y); Reiben und Wirbel: um (x, y). Art 0 = Bahn, 1 = Drehung.
const stempel = new Float32Array(16 * 4), stempelR = new Float32Array(16 * 4); let stempelN = 0;
const pinselRadius = () => 0.085 * (innerWidth < innerHeight ? 1 : 1.3);   // in Bildhöhen
function stempeln(x0, y0, x, y, r, zug, art, same) {
  if (stempelN < 16) { stempel.set([x0, y0, x, y], stempelN * 4); stempelR.set([r, zug, art, same], stempelN * 4); stempelN++; }
  else { const k = 15 * 4; stempel[k + 2] = x; stempel[k + 3] = y; }
}

// ---------- Fäden: der Strahl aus der Hand ----------
// Ein zäher Strahl, der aus einer Höhe fällt, schlingt sich am Boden zu Schlaufen, solange die Hand langsamer ist als der Strahl
// (liquid rope coiling; Herczyński, Cernuschi, Mahadevan 2011 an Pollocks Bildern). Schnell gezogen wird er gerade und dünn,
// ein Ruck lässt Spritzer vorausfliegen. Rechnung in Bildhöhen (x mal Seitenverhältnis), gezeichnet in Bildpunkten des Ziels.
const stuecke = new Float32Array(STUECKE_MAX * 8); let stueckN = 0;
let zufall = 1;
const zuf = () => { zufall = (zufall * 16807) % 2147483647; return (zufall - 1) / 2147483646; };   // wiederholbar (Vorspann)
function stueck(x0, y0, x1, y1, r0, r1, art) {
  if (stueckN >= STUECKE_MAX) return;
  const s = innerWidth / innerHeight;
  stuecke.set([x0 / s, y0, x1 / s, y1, r0, r1, art, 0], stueckN * 8); stueckN++;
  tinte += Math.hypot((x1 - x0) * fadenH, (y1 - y0) * fadenH) * (r0 + r1) / (fadenB * fadenH) * 4;
}
// Pollocks Stock: aus einer Hand fliessen mehrere Strahlen nebeneinander, jeder mit eigener Schlaufe, Breite und Farbe.
const STRAHLEN = [[-1.5, 0, 1.0], [-0.5, 1, 0.8], [0.5, 0, 1.2], [1.5, 2, 0.7]];   // Lage am Stock, Farbe, Stärke
function strahl(f, x, y, dt, t) {
  const s = innerWidth / innerHeight, X = x * s, Y = y, W = WERTE[1];
  if (!f.jets) f.jets = STRAHLEN.map(([lage, art, k]) => ({ lage, art, k, hx: 0, hy: 0, vx: 0, vy: 0, px: 0, py: 0, phi: zuf() * 6.283, dreh: zuf() < 0.5 ? -1 : 1, r: 0, umlauf: 0, neu: true }));
  // der Stock liegt schräg in der Hand und dreht sich langsam
  const th = 0.7 + 0.5 * Math.sin(t * 0.37 + f.same), breite = 0.009 + 0.012 * W[0];
  let tempo = 0;
  f.jets.forEach((j, i) => { tempo = Math.max(tempo, einStrahl(j, X + Math.cos(th) * j.lage * breite, Y + Math.sin(th) * j.lage * breite, dt, t, x, i === 0)); });
  return tempo;
}
function einStrahl(j, X, Y, dt, t, x, spritzt) {
  const W = WERTE[1], skala = Math.max(0.8, fadenH / 1560);
  if (j.neu) { j.neu = false; j.hx = j.px = X; j.hy = j.py = Y; }
  const hx0 = j.hx, hy0 = j.hy;
  const vx = (X - hx0) / dt, vy = (Y - hy0) / dt;
  const a = 1 - Math.exp(-dt / 0.08); j.vx += (vx - j.vx) * a; j.vy += (vy - j.vy) * a;
  const tempo = Math.hypot(j.vx, j.vy);
  const U = 0.25 + 0.55 * W[1], R0 = (0.004 + 0.022 * W[1] + 0.004 * W[0]) * (0.6 + 0.5 * j.k);
  const rMin = (1.1 + 2.2 * W[0]) * skala * j.k, rMax = (4 + 14 * W[0]) * skala * j.k;
  const n = Math.max(6, Math.min(24, Math.ceil(Math.hypot(X - hx0, Y - hy0) / 0.004) + 4)), dts = dt / n;
  for (let i = 1; i <= n; i++) {
    const hx = hx0 + (X - hx0) * i / n, hy = hy0 + (Y - hy0) * i / n, ti = t - dt + dt * i / n;
    const rc = R0 * Math.pow(Math.max(0, 1 - tempo / U), 0.8) * (0.82 + 0.18 * Math.sin(ti * 2.3 + j.dreh + j.lage) + 0.12 * Math.sin(ti * 5.1 + j.lage * 2));
    const omega = Math.min(70, (0.6 * U + 0.2) / Math.max(rc, 0.0015));
    const phiAlt = j.phi; j.phi += omega * dts * j.dreh;
    if (spritzt && Math.floor(j.phi / 6.2832) !== Math.floor(phiAlt / 6.2832) && rc > 0.002) { j.umlauf++; if (j.umlauf % 2 === 0) klangSchlaufe(rc / 0.03, x); }
    const lag = 0.025 + 0.06 * W[1];
    const px = hx - j.vx * lag + rc * Math.cos(j.phi), py = hy - j.vy * lag + rc * Math.sin(j.phi);
    const vp = Math.hypot(px - j.px, py - j.py) / dts;
    const ziel = rMin + (rMax - rMin) * (0.07 / (vp + 0.07));
    const r = j.r ? j.r + (ziel - j.r) * 0.3 : ziel;
    if (j.r) stueck(j.px, j.py, px, py, j.r, r, j.art);
    j.px = px; j.py = py; j.r = r;
  }
  // Spritzer: ein Ruck wirft Tropfen voraus, länglich in Flugrichtung
  if (tempo > 1.3 && zuf() < dt * tempo * 3) {
    const ux = j.vx / tempo, uy = j.vy / tempo, k = 1 + Math.floor(zuf() * 3);
    for (let i = 0; i < k; i++) {
      const w = 0.015 + zuf() * 0.09 * Math.min(2, tempo / 2), q = (zuf() - 0.5) * 0.06;
      const sx = X + ux * w - uy * q, sy = Y + uy * w + ux * q, l = 0.002 + zuf() * 0.012;
      const r0 = (1 + zuf() * 2.6 * (0.4 + W[0])) * skala;
      stueck(sx, sy, sx + ux * l, sy + uy * l, r0, r0 * 0.35, j.art);
    }
    if (spritzt) klangSpritzer(k, x);
  }
  j.hx = X; j.hy = Y;
  return tempo;
}

// Nur im Vorspann führt eine unsichtbare Hand; sonst beginnt alles erst mit der Berührung (Christian, 19.11.2026)
const VORSPANN = Q.has('vorspann');
let geisterStart = -1;
// Bahnen der Hand je Lesart, in Anteilen der Leinwand (y nach oben); null = Hand oben
function geistBahn(u) {
  if (lesart === 0) {
    const z = Math.floor(u / 2.6) % 4, w = (u % 2.6);
    if (z === 0) { if (w > 1.5) return null; const s = w / 1.5, e = s * s * (3 - 2 * s); return [0.1 + 0.8 * e, 0.6 + 0.05 * Math.sin(e * 3.1)]; }
    if (z === 1) { if (w > 2.0) return null; return [0.43 + 0.004 * Math.sin(w * 9), 0.64]; }
    if (z === 2) { if (w > 1.2) return null; const s = w / 1.2, e = s * s * (3 - 2 * s); return [0.82 - 0.6 * e, 0.78 - 0.34 * e]; }
    if (w > 1.4) return null; const s = w / 1.4, e = s * s * (3 - 2 * s); return [0.7 - 0.45 * e, 0.42 + 0.3 * Math.sin(e * 2.2)];
  }
  if (lesart === 1) {
    const w = u % 6.5; if (w > 5.2) return null;
    const k = Math.floor(u / 6.5), g = 0.55 + 0.45 * Math.sin(w * 0.9);
    return [0.5 + 0.34 * Math.sin(w * 0.83 * g + k), 0.55 + 0.25 * Math.sin(w * 1.31 + k * 2.1)];
  }
  const z = Math.floor(u / 3.2) % 3, w = u % 3.2;
  if (w > 2.6) return null;
  if (z === 1) { const s = w / 2.6; return [0.25 + 0.5 * s, 0.35 + 0.3 * s]; }
  return z === 0 ? [0.42, 0.62] : [0.62, 0.48];
}
function geist(t) {
  if (geisterStart < 0 || t < geisterStart) return;
  const p = geistBahn(t - geisterStart), da = finger.get('geist');
  if (!p) { if (da) finger.delete('geist'); return; }
  const cx = p[0] * innerWidth, cy = (1 - p[1]) * innerHeight;
  if (!da) finger.set('geist', fingerNeu(cx, cy)); else { da.x = cx; da.y = cy; }
}

// ---------- Daumen: wo auflegen, und ein Ring, der sich füllt ----------
let daumenGelernt = false, haltZeit = 0;
function haltZeigen(x, y) { const h = $('halt'); h.style.left = x + 'px'; h.style.top = y + 'px'; h.classList.add('da'); }
function haltBild(dt) {
  if (finger.size) haltZeit += dt; else haltZeit = 0;
  $('halt-voll').style.strokeDashoffset = String(1 - Math.min(1, menge));
  const gezogen = [...finger.values()].some((f) => f.bewegt > 120);
  if (!daumenGelernt && (haltZeit > 1.2 || gezogen)) { daumenGelernt = true; $('daumen').classList.add('weg'); setTimeout(() => { $('daumen').hidden = true; }, 800); }
}

// ---------- Gesten ----------
// Die Finger merken sich nur ihre Lage; was sie tun, rechnet jedes Bild aus dem Weg seit dem letzten Bild (so auch die Hand im Vorspann).
const finger = new Map();
const aufLeinwand = (cx, cy) => ({ x: cx / innerWidth, y: 1 - cy / innerHeight });
let samen = 0;
function fingerNeu(cx, cy) {
  samen++;
  return { x: cx, y: cy, lx: cx, ly: cy, bewegt: 0, ruhe: 0, same: (samen * 37.17) % 97, dreh: samen % 2 ? 1 : -1, jet: null, tempo: 0 };
}
leinwand.addEventListener('pointerdown', (e) => {
  finger.set(e.pointerId, fingerNeu(e.clientX, e.clientY));
  leinwand.setPointerCapture(e.pointerId); $('geste').classList.add('weg');
  haltZeigen(e.clientX, e.clientY);
  geisterStart = -1; finger.delete('geist');
  glosse(['diagramme', 'allover', 'machine'][lesart]);
});
leinwand.addEventListener('pointermove', (e) => {
  const f = finger.get(e.pointerId); if (!f) return;
  f.bewegt += Math.hypot(e.clientX - f.x, e.clientY - f.y);
  f.x = e.clientX; f.y = e.clientY;
  haltZeigen(e.clientX, e.clientY);
});
let keimUhr = 0;
const loslassen = (e) => {
  finger.delete(e.pointerId);
  if (finger.size === 0) $('halt').classList.remove('da');
  // nach dem ersten Wisch: die Figur taucht wieder auf, und die Glosse sagt, warum
  if (lesart === 0) { clearTimeout(keimUhr); keimUhr = setTimeout(() => { if (!finger.size && lesart === 0) glosse('germe'); }, 2600); }
};
leinwand.addEventListener('pointerup', loslassen);
leinwand.addEventListener('pointercancel', loslassen);

// je Bild: was die Hände seit dem letzten Bild getan haben
function haende(t, dt) {
  const W = WERTE[lesart], R = pinselRadius();
  let tempoMax = 0, reibMax = 0;
  for (const f of finger.values()) {
    const a = aufLeinwand(f.lx, f.ly), b = aufLeinwand(f.x, f.y);
    const px = Math.hypot(f.x - f.lx, f.y - f.ly), tempo = px / innerHeight / dt;   // Bildhöhen je Sekunde
    f.tempo += (tempo - f.tempo) * (1 - Math.exp(-dt / 0.1)); tempoMax = Math.max(tempoMax, f.tempo);
    if (px > 2.5) f.ruhe = 0; else f.ruhe += dt;
    if (lesart === 0) {
      if (px > 0.3) stempeln(a.x, a.y, b.x, b.y, R, 0.35 + 0.75 * W[0], 0, f.same);
      if (f.ruhe > 0.18) { stempeln(b.x, b.y, b.x, b.y, R * 0.95, dt * (0.6 + 1.7 * W[0]) * f.dreh, 1, f.same); reibMax = Math.max(reibMax, Math.min(1, (f.ruhe - 0.18) / 2)); }
    } else if (lesart === 1) {
      strahl(f, b.x, b.y, dt, t);
    } else {
      if (px > 0.3) stempeln(a.x, a.y, b.x, b.y, R * 0.9, Math.min(1.5, tempo * 0.9) * (0.3 + 1.2 * W[0]), 0, 0);
      if (f.ruhe > 0.12) { stempeln(b.x, b.y, b.x, b.y, R * 1.1, dt * (1.2 + 3.5 * W[0]), 1, f.dreh); reibMax = Math.max(reibMax, Math.min(1, f.ruhe / 1.6)); }
    }
    f.lx = f.x; f.ly = f.y;
  }
  tempoHand = tempoMax; reiben = reibMax;
  if (lesart === 1) {
    // nass, solange die Hand malt; dann eine Weile stehen, dann trocknet alles weg und das Klischee kehrt zurück
    if (finger.size) { nass += (1 - nass) * (1 - Math.exp(-dt / 0.3)); trockenSeit = 0; }
    else if (nass > 0) {
      trockenSeit += dt;
      if (trockenSeit > 0.8) nass *= Math.exp(-dt / (0.4 + 2.6 * W[2]));
      if (nass < 0.01) { nass = 0; faedenLeeren = true; saugLeeren = true; tinte = 0; }
    }
    menge = nass;
  }
  else menge = finger.size ? Math.max(reiben, Math.min(1, menge + dt * tempoMax * 0.4)) : Math.max(0, menge - dt * 0.6);
  kraftEnergie = lesart === 2 ? Math.min(1, kraftEnergie * Math.exp(-dt / (1.2 + 3 * W[0])) + dt * finger.size * 0.9) : 0;
}

// ---------- Geführter Einstieg: zuerst Bild und Finger, dann die Lesarten, dann die Regler, zuletzt die Tasten ----------
const EINSTIEG = 'diagramm.einstieg';
let einstiegStufe = 3, einstiegUhr = 0, einstiegBegonnen = false;
function einstiegTeile() {
  const r = $('regler');
  return [[r.querySelector('.zustaende')], [r.querySelector('.zt-regler')], [r.querySelector('.zt-tasten')]];
}
function einstiegZeigen(stufe) {
  einstiegStufe = stufe;
  $('regler').dataset.einstieg = String(stufe);
  einstiegTeile().forEach((teile, k) => teile.forEach((el) => { if (el) el.inert = k >= stufe; }));
  if (stufe >= 3) { clearTimeout(einstiegUhr); try { localStorage.setItem(EINSTIEG, 'fertig'); } catch {} }
}
function einstiegWeiter() {
  clearTimeout(einstiegUhr);
  if (einstiegStufe >= 3) return;
  einstiegZeigen(einstiegStufe + 1); spur('Einstieg ' + einstiegStufe);
  if (einstiegStufe < 3) einstiegUhr = setTimeout(einstiegWeiter, 9000);
}
function einstiegBeginnen() {
  if (einstiegBegonnen) return; einstiegBegonnen = true;
  let fertig = false; try { fertig = localStorage.getItem(EINSTIEG) === 'fertig'; } catch {}
  if (fertig || Q.has('alles')) { einstiegZeigen(3); return; }
  einstiegZeigen(0);
  einstiegUhr = setTimeout(einstiegWeiter, 9000);
}
leinwand.addEventListener('pointerup', () => { if (einstiegStufe === 0) { clearTimeout(einstiegUhr); einstiegUhr = setTimeout(einstiegWeiter, 2200); } });
document.querySelectorAll('[data-lesart]').forEach((b) => b.addEventListener('click', () => { if (einstiegStufe === 1) { clearTimeout(einstiegUhr); einstiegUhr = setTimeout(einstiegWeiter, 1800); } }));
$('r-lesart').addEventListener('change', () => { if (einstiegStufe === 1) { clearTimeout(einstiegUhr); einstiegUhr = setTimeout(einstiegWeiter, 1800); } });
document.querySelectorAll('.zt-regler input').forEach((el) => el.addEventListener('change', () => { if (einstiegStufe === 2) { clearTimeout(einstiegUhr); einstiegUhr = setTimeout(einstiegWeiter, 1500); } }));

// ---------- Ton an und aus ----------
function tonZeigen() {
  const b = $('ton'), an = klangIstAn(), k = an ? 'tonAus' : 'tonAn';
  b.setAttribute('aria-pressed', String(an)); b.dataset.tLabel = k;
  b.setAttribute('aria-label', TEXTE[sprache][k]); b.title = TEXTE[sprache][k];
}
try { if (localStorage.getItem('kristall.ton') === 'aus') klangAn(false); } catch {}
$('ton').addEventListener('click', () => {
  klangStarten(); klangAn(!klangIstAn()); tonZeigen();
  try { localStorage.setItem('kristall.ton', klangIstAn() ? 'an' : 'aus'); } catch {}
});

let laeuft = false;
function starten() {
  einstiegBeginnen(); $('ton').hidden = false; tonZeigen();
  $('auftakt').hidden = true; $('kopf').hidden = false; $('regler').hidden = false;
  $('geste').textContent = TEXTE[sprache].lesarten[lesart].geste; $('geste').hidden = false; $('geste').classList.remove('weg');
  setTimeout(() => $('geste').classList.add('weg'), 5500);
  if (!VORSPANN && !daumenGelernt) { $('daumen').hidden = false; $('daumen').classList.remove('weg'); }
  groesse();
  if (VORSPANN && geisterStart < 0) geisterStart = performance.now() / 1000 + 1.2;
  if (!laeuft && gl && P.wischen) { laeuft = true; requestAnimationFrame(bild); }
}

// ---------- Schleife ----------
let standbildWunsch = false, ersterLauf = true, letzteMs = 0, bilderGezaehlt = 0;
function zielLeeren(z) { gl.bindFramebuffer(gl.FRAMEBUFFER, z.fb); gl.viewport(0, 0, z.b, z.h); gl.clearColor(0, 0, 0, 0); gl.clear(gl.COLOR_BUFFER_BIT); }
function bild(ms) {
  const t = ms / 1000;
  fahrtSehen(); if (quelle === fotoBuehne) fotoMalen(performance.now() / 1000);
  const dtMs = ms - (letzteMs || ms - 16.7), dt = Math.min(0.1, Math.max(0.004, dtMs / 1000)); letzteMs = ms;
  tempoMessen(ms, dtMs);
  if (!scharfFangen()) { requestAnimationFrame(bild); return; }
  const seite = innerWidth / innerHeight, W = WERTE[lesart];
  const rahmenGL = [rahmen[0], rahmen[1], rahmen[2], rahmen[3]];

  if (geisterStart > 0) geist(t);
  haende(t, dt);

  // 1. die Gegenwart in Arbeitsgrösse (nur die Kräfte brauchen Bewegung und Struktur)
  const J = ziele.jetzt;
  let fluss = null;
  if (lesart === 2) {
    if (neuesBild) J.tauschen();
    rechne(P.kopie, J.schreiben(), { uQ: scharfTex });
    const jetzt = J.schreiben(), vor = J.lesen();
    const FL = ziele.fluss;
    if (neuesBild) {
      for (let k = 0; k < 3; k++) { const z = ziele['lum' + k]; rechne(P.lum, z, { uJetzt: jetzt, uVor: vor }, (u) => gl.uniform2f(u.uPx, 1 / z.b, 1 / z.h)); }
      let f0 = null;
      for (let k = 2; k >= 0; k--) {
        const L = ziele['lum' + k], A = ziele['fl' + k], B = ziele['flb' + k];
        rechne(P.lk, A, { uLum: L, uF0: f0 || L }, (u) => { gl.uniform2f(u.uPx, 1 / L.b, 1 / L.h); gl.uniform1f(u.uMitF0, f0 ? 1 : 0); });
        rechne(P.lk, B, { uLum: L, uF0: A }, (u) => { gl.uniform2f(u.uPx, 1 / L.b, 1 / L.h); gl.uniform1f(u.uMitF0, 1); });
        f0 = B;
      }
      rechne(P.fglatt, FL.schreiben(), { uF: f0, uAlt: FL.lesen() }, (u) => { gl.uniform2f(u.uPx, 1 / f0.b, 1 / f0.h); gl.uniform1f(u.uNeu, 1); });
      bilderGezaehlt++;
      // Struktur des Bildes: Tensor der Kanten, weich gerechnet
      const T = ziele.tensor, TB = ziele.tensorB;
      rechne(P.tensor, T, { uQ: jetzt }, (u) => gl.uniform2f(u.uPx, 1 / arbeitB, 1 / arbeitH));
      for (let k = 0; k < 2; k++) {
        rechne(P.weich, TB, { uQ: T }, (u) => gl.uniform2f(u.uRichtung, 1.4 / T.b, 0));
        rechne(P.weich, T, { uQ: TB }, (u) => gl.uniform2f(u.uRichtung, 0, 1.4 / T.h));
      }
    } else rechne(P.fglatt, FL.schreiben(), { uF: FL.lesen(), uAlt: FL.lesen() }, (u) => { gl.uniform2f(u.uPx, 0, 0); gl.uniform1f(u.uNeu, 0); });
    FL.tauschen();
    fluss = FL.lesen();
  } else bilderGezaehlt++;

  const sz = zielBauen('szene', leinwand.width, leinwand.height, false);
  if (lesart === 0) {
    // 2a. Wischen: das Feld der Verschiebung
    const Wf = ziele.w;
    if (wischLeeren) { zielLeeren(Wf.lesen()); zielLeeren(Wf.schreiben()); wischLeeren = false; }
    const tau = 10 * Math.pow(0.6 / 10, W[2]);   // Figur: 0 bleibt lange (rund 30 s), Mitte rund 7 s, 1 kehrt in zwei Sekunden zurück
    rechne(P.wisch, Wf.schreiben(), { uAlt: Wf.lesen() }, (u) => {
      gl.uniform4fv(u.uS, stempel); gl.uniform4fv(u.uSR, stempelR); gl.uniform1i(u.uN, stempelN); gl.uniform1f(u.uSeite, seite);
      gl.uniform1f(u.uRueck, finger.size ? 1 : Math.exp(-dt / tau)); gl.uniform1f(u.uRueckH, finger.size ? 1 : Math.exp(-dt / (tau * 1.3)));
      gl.uniform1f(u.uLast, 0.03 + 0.2 * W[1]); gl.uniform1f(u.uReib, dt * 1.1);
    });
    Wf.tauschen();
    rechne(P.wischen, sz, { uScharf: scharfTex, uW: Wf.lesen() }, (u) => {
      gl.uniform2f(u.uPxW, 1 / wischB, 1 / wischH); gl.uniform1f(u.uSeite, seite); gl.uniform1f(u.uMaterie, 0.25 + 1.5 * W[1]);
      gl.uniform1f(u.uT, t % 1000); gl.uniform4f(u.uRahmen, ...rahmenGL);
    });
  } else if (lesart === 1) {
    // 2b. Fäden: die neuen Stücke in die Deckung, dann die kleinen Stufen für die Dichte
    const F = ziele.faeden;
    if (faedenLeeren) { zielLeeren(F); faedenLeeren = false; stueckN = 0; }
    if (stueckN && fadenVao) {
      gl.bindFramebuffer(gl.FRAMEBUFFER, F.fb); gl.viewport(0, 0, F.b, F.h);
      gl.useProgram(P.faden); gl.uniform2f(P.faden.u.uZiel, F.b, F.h);
      gl.bindVertexArray(fadenVao);
      gl.bindBuffer(gl.ARRAY_BUFFER, fadenPuffer); gl.bufferSubData(gl.ARRAY_BUFFER, 0, stuecke, 0, stueckN * 8);
      gl.enable(gl.BLEND); gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
      gl.drawArraysInstanced(gl.TRIANGLE_STRIP, 0, 4, stueckN);
      gl.disable(gl.BLEND); gl.bindVertexArray(null);
      gl.bindTexture(gl.TEXTURE_2D, F.tex); gl.generateMipmap(gl.TEXTURE_2D);
      stueckN = 0;
    }
    const S = ziele.s;
    if (saugLeeren) { zielLeeren(S.lesen()); zielLeeren(S.schreiben()); saugLeeren = false; }
    if (nass > 0) {
      rechne(P.saug, S.schreiben(), { uAlt: S.lesen(), uF: F }, (u) => {
        gl.uniform2f(u.uPx, 1 / saugB, 1 / saugH); gl.uniform1f(u.uSeite, seite); gl.uniform1f(u.uAb, finger.size ? 1 : Math.exp(-dt / 6));
        gl.uniform1f(u.uLauf, 0.6 + 1.2 * W[0]);
      });
      S.tauschen();
    }
    rechne(P.faeden, sz, { uScharf: scharfTex, uF: F, uS: S.lesen() }, (u) => {
      gl.uniform2f(u.uPx, 1 / F.b, 1 / F.h); gl.uniform1f(u.uNass, nass);
      gl.uniform1f(u.uSeite, seite); gl.uniform1f(u.uT, t % 1000); gl.uniform4f(u.uRahmen, ...rahmenGL);
    });
  } else {
    // 2c. Kräfte: die Kräfte der Finger, das Feld, die Linien
    const K = ziele.k;
    if (kraftLeeren) { zielLeeren(K.lesen()); zielLeeren(K.schreiben()); kraftLeeren = false; }
    rechne(P.kraft, K.schreiben(), { uAlt: K.lesen() }, (u) => {
      gl.uniform2f(u.uPx, 1 / kraftB, 1 / kraftH); gl.uniform4fv(u.uS, stempel); gl.uniform4fv(u.uSR, stempelR); gl.uniform1i(u.uN, stempelN);
      gl.uniform1f(u.uSeite, seite); gl.uniform1f(u.uAb, Math.exp(-dt / (1.2 + 3 * W[0]))); gl.uniform1f(u.uAbZeig, finger.size ? 1 : Math.exp(-dt / (1.0 + 3.5 * W[1])));
    });
    K.tauschen();
    const KF = ziele.kfeld;
    rechne(P.kfeld, KF, { uT: ziele.tensor, uFl: fluss, uK: K.lesen() }, (u) => {
      gl.uniform2f(u.uPxFl, 1 / flussB, 1 / ziele.fluss.lesen().h); gl.uniform1f(u.uBew, 0.2 + 1.6 * W[2]); gl.uniform1f(u.uKraft, 0.3 + 1.2 * W[0]);
      gl.uniform1f(u.uZeit, t % 1000); gl.uniform1f(u.uSeite, seite);
    });
    rechne(P.kraefte, sz, { uScharf: scharfTex, uV: KF, uK: K.lesen(), uR: rauschTex }, (u) => {
      gl.uniform2f(u.uPx, 1 / sz.b, 1 / sz.h); gl.uniform1f(u.uSchritt, (0.7 + 2.2 * W[1]) * (sz.h / Math.max(1, fadenH)) * 1.3);
      kraftPhase += dt * (0.8 + 4 * W[2]) * (0.35 + kraftEnergie);
      gl.uniform1f(u.uPhase, kraftPhase); gl.uniform1f(u.uKraft, 0.3 + 1.2 * W[0]); gl.uniform4f(u.uRahmen, ...rahmenGL);
    });
  }
  stempelN = 0;
  nachbearbeiten(t);
  haltBild(dt);
  klangBild({ lesart, tempo: tempoHand, reiben, finger: finger.size, menge, kraft: kraftEnergie, werte: W, dt });
  if (standbildWunsch) { standbildWunsch = false; leinwand.toBlob((b) => b && zeigen(b, 'diagramm-' + zeitstempel() + '.png')); }
  if (ersterLauf && bilderGezaehlt > 2) { ersterLauf = false; spur('✓ läuft'); }
  requestAnimationFrame(bild);
}
let kraftPhase = 0;
function nachbearbeiten(t) {
  const B = leinwand.width, H = leinwand.height, b4 = Math.max(1, Math.round(B / 4)), h4 = Math.max(1, Math.round(H / 4));
  const sz = ziele.szene, gA = zielBauen('glowA', b4, h4), gB = zielBauen('glowB', b4, h4);
  rechne(P.hell, gA, { uQ: sz }, (u) => { gl.uniform2f(u.uPx, 1.5 / B, 1.5 / H); gl.uniform1f(u.uAb, [0.7, 0.78, 0.62][lesart]); });
  rechne(P.weich, gB, { uQ: gA }, (u) => gl.uniform2f(u.uRichtung, 1.6 / b4, 0));
  rechne(P.weich, gA, { uQ: gB }, (u) => gl.uniform2f(u.uRichtung, 0, 1.6 / h4));
  rechne(P.zusammen, null, { uSzene: sz, uGlow: gA }, (u) => {
    gl.uniform2f(u.uPx, 1 / B, 1 / H); gl.uniform1f(u.uGlowStaerke, [0.22, 0.25, 0.45][lesart]);
    gl.uniform1f(u.uT, t % 100); gl.uniform1f(u.uKorn, [0.03, 0.035, 0.025][lesart]); gl.uniform1f(u.uFxaa, lesart === 0 ? 1 : 0);
  });
}
// ---------- Ergebnis (wie im Kristall) ----------
let ergebnis = null;
function sichern(blob, name) {
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name;
  document.body.append(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 4000);
}
function zeigen(blob, name) {
  schliessen();
  const url = URL.createObjectURL(blob), film = blob.type.startsWith('video');
  ergebnis = { blob, name, url };
  const feld = $('ergebnis-bild');
  feld.replaceChildren();
  const el = document.createElement(film ? 'video' : 'img');
  el.src = url;
  if (film) { el.muted = true; el.loop = true; el.playsInline = true; el.autoplay = true; el.controls = false; el.addEventListener('click', () => { el.muted = !el.muted; if (el.paused) el.play(); }); }
  else el.alt = '';
  feld.append(el);
  const datei = new File([blob], name, { type: blob.type });
  $('teilen').hidden = !(navigator.canShare && navigator.canShare({ files: [datei] }));
  $('ergebnis-mb').textContent = (blob.size / 1e6).toFixed(1).replace('.', TEXTE[sprache].komma) + ' MB · ' + name;
  $('ergebnis').hidden = false;
  spur('Ergebnis ' + name);
}
function schliessen() {
  $('ergebnis').hidden = true;
  if (ergebnis) { URL.revokeObjectURL(ergebnis.url); ergebnis = null; }
  $('ergebnis-bild').replaceChildren();
}
$('teilen').addEventListener('click', async () => {
  if (!ergebnis) return;
  try { await navigator.share({ files: [new File([ergebnis.blob], ergebnis.name, { type: ergebnis.blob.type })], title: TEXTE[sprache].titel }); }
  catch (e) { if (e.name !== 'AbortError') sichern(ergebnis.blob, ergebnis.name); }
});
$('sichern').addEventListener('click', () => { if (ergebnis) { sichern(ergebnis.blob, ergebnis.name); $('ergebnis-hinweis').hidden = false; } });
$('ergebnis-zu').addEventListener('click', schliessen);
$('standbild').addEventListener('click', () => { standbildWunsch = true; });

let aufnehmer = null, aufnahmeStart = 0, uhrAnzeige = 0;
const minSek = (s) => Math.floor(s / 60) + ':' + String(Math.floor(s % 60)).padStart(2, '0');
$('aufnahme').addEventListener('click', () => {
  const knopf = $('aufnahme');
  if (aufnehmer) { aufnehmer.stop(); return; }
  if (!leinwand.captureStream || !window.MediaRecorder) return melden(TEXTE[sprache].keineAufnahme);
  const typ = ['video/mp4;codecs=avc1', 'video/mp4', 'video/webm;codecs=vp9', 'video/webm'].find((m) => MediaRecorder.isTypeSupported(m)) || '';
  const teile = [];
  const strom = leinwand.captureStream(30), ton = klangSpur();
  if (ton) strom.addTrack(ton);
  const typA = ton ? (['video/mp4;codecs=avc1,mp4a.40.2', 'video/webm;codecs=vp9,opus', 'video/webm;codecs=vp8,opus'].find((m) => MediaRecorder.isTypeSupported(m)) || typ) : typ;
  aufnehmer = new MediaRecorder(strom, typA ? { mimeType: typA, videoBitsPerSecond: telefon ? 8e6 : 16e6, audioBitsPerSecond: 128e3 } : undefined);
  aufnehmer.ondataavailable = (e) => e.data.size && teile.push(e.data);
  aufnehmer.onstop = async () => {
    clearInterval(uhrAnzeige);
    const sekunden = (performance.now() - aufnahmeStart) / 1000;
    const b = await aufnahmeDatei(teile, (aufnehmer.mimeType || 'video/webm').split(';')[0], sekunden);   // Länge in den Dateikopf
    aufnehmer = null; knopf.classList.remove('laeuft'); knopf.textContent = TEXTE[sprache].aufnahme;
    zeigen(b, 'diagramm-' + zeitstempel() + (b.type.includes('mp4') ? '.mp4' : '.webm'));
  };
  aufnehmer.start(1000); aufnahmeStart = performance.now();
  knopf.classList.add('laeuft');
  const zeigeUhr = () => { knopf.textContent = '● ' + minSek((performance.now() - aufnahmeStart) / 1000) + ' · ' + TEXTE[sprache].stopp; };
  zeigeUhr(); uhrAnzeige = setInterval(zeigeUhr, 250);
  spur('Aufnahme');
});
function zeitstempel() {
  const d = new Date(), z = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}${z(d.getMonth() + 1)}${z(d.getDate())}-${z(d.getHours())}${z(d.getMinutes())}${z(d.getSeconds())}`;
}

// ---------- Glossen: einmal je Besuch von selbst, am Handy nur Begriff und Satz (wie im Kristall) ----------
let glosseUhr = 0, glosseSchluessel = '';
const glosseGezeigt = new Set(), glosseDauer = () => (innerWidth <= 560 ? 4500 : 7000);
function glosse(k) {
  const g = TEXTE[sprache].glossen[k]; if (!g || glosseGezeigt.has(k)) return;
  glosseGezeigt.add(k);
  const el = $('glosse');
  glosseSchluessel = k;
  $('glosse-begriff').textContent = g.begriff;
  $('glosse-satz').textContent = g.satz;
  $('glosse-zitat').textContent = g.zitat; $('glosse-zitat').hidden = !g.zitat;
  $('glosse-quelle').textContent = g.quelle; $('glosse-quelle').hidden = !g.quelle;
  el.hidden = false; requestAnimationFrame(() => el.classList.add('da'));
  clearTimeout(glosseUhr); glosseUhr = setTimeout(glosseWeg, glosseDauer());
}
function glosseWeg() { const el = $('glosse'); el.classList.remove('da'); setTimeout(() => { if (!el.classList.contains('da')) el.hidden = true; }, 700); }
regler.forEach((id, k) => {
  const g = () => TEXTE[sprache].reglerGlosse[lesart][k];
  $(id).addEventListener('pointerdown', () => glosse(g()));
  $(id).addEventListener('input', () => { if (glosseSchluessel !== g() || $('glosse').hidden) glosse(g()); else { clearTimeout(glosseUhr); glosseUhr = setTimeout(glosseWeg, glosseDauer()); } });
});
$('glosse').addEventListener('click', () => { glosseWeg(); $('begriff').hidden = false; });

// ---------- Begriffsebene ----------
$('begriff-auf').addEventListener('click', () => { $('begriff').hidden = false; });
$('begriff-zu').addEventListener('click', () => { $('begriff').hidden = true; });
addEventListener('keydown', (e) => { if (e.key === 'Escape') { $('begriff').hidden = true; schliessen(); } });

// ---------- ?spur: die Spur unten auf der Seite, mit einer Taste zum Kopieren (wie im Kristall) ----------
if (Q.has('spur')) {
  const kasten = document.createElement('div');
  kasten.style.cssText = 'position:fixed;left:8px;right:8px;top:calc(max(16px, env(safe-area-inset-top)) + 44px);z-index:9;max-height:30vh;overflow:auto;padding:10px 12px;background:rgba(10,10,11,.92);border-left:2px solid #c8102e;font:12px/1.4 "Barlow Condensed",sans-serif;color:#f1eee6;white-space:pre-wrap';
  const text = document.createElement('div'), taste = document.createElement('button');
  taste.textContent = 'Spur kopieren';
  taste.style.cssText = 'margin-top:8px;padding:6px 0;background:none;border:0;color:#c8102e;font:inherit;letter-spacing:.18em;text-transform:uppercase;cursor:pointer';
  const inhalt = () => {
    let jetzt = []; try { jetzt = JSON.parse(localStorage.getItem(SPUR) || '[]'); } catch {}
    return 'Diagramm ' + (document.querySelector('script[src*="diagramm.js"]')?.getAttribute('src') || '') + '\n' + navigator.userAgent + '\nGrafik: ' + (grafikName || '?') +
      (leicht ? ' (leicht)' : '') + (halbFloat ? '' : ' · 8 Bit') + '\nVorher: ' + spurVorher.join(' → ') + '\nJetzt: ' + jetzt.join(' → ');
  };
  let fest = '';
  const zeige = () => { const t = inhalt(); if (t !== fest) { fest = t; text.textContent = t; } };
  taste.addEventListener('click', async () => {
    const t = inhalt();
    try { await navigator.clipboard.writeText(t); taste.textContent = 'Kopiert'; }
    catch { const r = document.createRange(); r.selectNodeContents(text); const sel = getSelection(); sel.removeAllRanges(); sel.addRange(r); taste.textContent = 'Markiert, jetzt kopieren'; }
    setTimeout(() => { taste.textContent = 'Spur kopieren'; }, 2500);
  });
  kasten.append(text, taste); document.body.append(kasten);
  zeige(); setInterval(zeige, 1000);
}

// Einstieg: «Wischen» (Vorschlag 20.11.2026, von Christian bestätigt: «Gut so»)
lesartWaehlen(0, true);
uebersetzen();
// Direktstart für Tests und Vorführungen: ?beispiel, ?lesart=0|1|2
if (Q.has('lesart')) lesartWaehlen(Math.max(0, Math.min(2, +Q.get('lesart') || 0)), true);
if (Q.has('beispiel')) beispielStarten();
// für Prüfungen: Werte setzen und Finger von aussen führen
window.__diagramm = { WERTE, finger, fingerNeu, lesartWaehlen, tinte: () => tinte };
