// Figur und Fläche – Operator VI von the deleuzian scheme (Deleuze, Francis Bacon. Logique de la sensation, 1981,
// Kapitel I «Le rond, la piste», III «L’athlétisme», IV «Le corps, la viande et l’esprit, le devenir-animal»).
// Ein Rund isoliert die Figur, ringsum wird alles zur flachen Farbe (aplat), und die Kräfte greifen den Körper an.
// Drei Lesarten: Isolieren (das Rund und die Fläche), Schrei (der Körper entweicht durch den Mund), Fleisch (la viande).
// Die Figur wird ohne KI vom Grund getrennt: eine Palette des Grundes vom Bildrand, eine Flutung vom Rand her auf einem
// kleinen Feld (was der Grund nicht erreicht, ist Figur), die Kante fein aus dem Farbabstand je Bildpunkt.
// WebGL2, ohne Bibliotheken, ohne CDN. Aufbau, Quellen, Aufnahme, Glossen und Einstieg wie Diagramm.

import { klangStarten, klangBild, klangAn, klangIstAn, klangSpur, klangRund } from './klang.js?v=1';
import { aufnahmeDatei } from '../gemeinsam/aufnahme.js?v=1';
import { fotoLesen, istVideo, istFoto, istHeic, dateiMeldung, fotosMalen, fahrtSchalter, FAHRT_SVG, rahmen as fotoRahmen, rahmenSetzen } from '../gemeinsam/fotos.js?v=4';

const $ = (id) => document.getElementById(id);
const Q = new URLSearchParams(location.search);

// ---------- Sprache ----------
// Zitate im Original, am Text geprüft (Seuil-Ausgabe); was nicht wörtlich ist, steht als «sinngemäss» da.
const TEXTE = {
  de: {
    titel: 'Figur und Fläche', satz: 'Ein Rund isoliert die Figur, ringsum wird alles zur flachen Farbe, und die Kräfte greifen den Körper an.',
    kamera: 'Kamera', video: 'Video oder Fotos', beispiel: 'Beispiel', lesart: 'Lesart',
    glossen: {
      rond: { begriff: 'le rond', satz: 'Ein Kreis, ein Oval, eine Bahn: Bacon setzt die Figur in ein Rund. So steht sie für sich und erzählt nichts mehr.', zitat: '«Isoler la Figure sera la condition première.»', quelle: 'Deleuze, Logique de la sensation, 1981, Kap. I' },
      aplat: { begriff: 'l’aplat', satz: 'Ringsum keine Landschaft, kein Raum, sondern grosse flache Farbfelder. Sie sind kein Hintergrund, sie umschliessen die Figur.', zitat: '«ce sont de grands aplats de couleur vive, uniforme et immobile.»', quelle: 'Deleuze, Logique de la sensation, 1981, Kap. I' },
      elements: { begriff: 'trois éléments', satz: 'Drei Elemente: die Fläche als Gerüst, das Rund als Kontur, die Figur. Die Kontur ist die Grenze, über die beide miteinander verkehren.', zitat: '«la structure matérielle, le rond-contour, l’image dressée.»', quelle: 'Deleuze, Logique de la sensation, 1981, Kap. I' },
      cri: { begriff: 'le cri', satz: 'Der Schrei ist kein Ausdruck von Angst. In ihm will der ganze Körper hinaus, durch das Loch des Mundes.', zitat: '«le cri de Bacon, c’est l’opération par laquelle le corps tout entier s’échappe par la bouche.»', quelle: 'Deleuze, Logique de la sensation, 1981, Kap. III' },
      fuite: { begriff: 'le point de fuite', satz: 'Der Körper sucht einen Punkt, durch den er sich davonmachen kann: ein Waschbecken, einen Schirm, einen Mund.', zitat: '«Le corps s’efforce précisément, ou attend précisément de s’échapper.»', quelle: 'Deleuze, Logique de la sensation, 1981, Kap. III' },
      horreur: { begriff: 'le cri plutôt que l’horreur', satz: 'Bacon wollte nicht das Schreckliche malen, das den Schrei auslöst, sondern den Schrei selbst: die unsichtbaren Kräfte, die am Körper zerren.', zitat: '«I wanted to paint the scream more than the horror.»', quelle: 'Bacon zu David Sylvester; Deleuze, Logique de la sensation, Vorwort und Kap. VIII' },
      viande: { begriff: 'la viande', satz: 'Fleisch ist der Körper, wo die Knochen ihn nicht mehr halten. Dort sind Mensch und Tier nicht mehr zu unterscheiden.', zitat: '«une zone d’indiscernabilité, d’indécidabilité, entre l’homme et l’animal»', quelle: 'Deleuze, Logique de la sensation, 1981, Kap. IV' },
      pitie: { begriff: 'pitié pour la viande', satz: 'Bacon malt das Fleisch nicht mit Grauen, sondern mit Mitleid. Wer leidet, ist Fleisch, und das geht jeden an.', zitat: '', quelle: 'Deleuze, Logique de la sensation, 1981, Kap. IV, sinngemäss' },
      lesarten: { begriff: 'la Figure', satz: 'Drei Wege mit der Figur: sie isolieren im Rund, ihr den Schrei abringen, sie zu Fleisch werden lassen.', zitat: '', quelle: 'Deleuze, Logique de la sensation, 1981, Kap. I, III, IV' },
      couleur: { begriff: 'la couleur', satz: 'Bacons Flächen: Orange, Rosa, Violett, Grün, Nachtblau. Jede Farbe gibt dem Rund eine andere Gegenfarbe.', zitat: '', quelle: 'Deleuze, Logique de la sensation, 1981, Kap. XVI, sinngemäss' },
      contour: { begriff: 'le contour', satz: 'Die Kontur ist eine Membran: Sie trennt Figur und Fläche und lässt beide durch sich hindurch verkehren. Hier bestimmst du, wie scharf die Figur aus ihrem Grund geschnitten wird.', zitat: '', quelle: 'Deleuze, Logique de la sensation, 1981, Kap. III, sinngemäss' },
      ombre: { begriff: 'l’ombre', satz: 'Bacons Figuren werfen Schatten wie Lachen. Der Körper entweicht in seinen Schatten, als wäre er ein Tier, das er beherbergt.', zitat: '', quelle: 'Deleuze, Logique de la sensation, 1981, Kap. III, sinngemäss' },
      force: { begriff: 'les forces', satz: 'Unsichtbare Kräfte ziehen, drücken, dehnen den Körper. Malen heisst, diese Kräfte sichtbar machen.', zitat: '', quelle: 'Deleuze, Logique de la sensation, 1981, Kap. VIII, sinngemäss' },
      spasme: { begriff: 'le spasme', satz: 'Ein Zucken geht durch den Körper, als warte er darauf, aus sich herauszukommen.', zitat: '«Bref un spasme : le corps comme plexus»', quelle: 'Deleuze, Logique de la sensation, 1981, Kap. III' },
      retour: { begriff: 'l’athlétisme', satz: 'Bacons Körper sind Athleten der Anstrengung: Sie spannen sich, geben nach und federn zurück. Hier, wie schnell.', zitat: '', quelle: 'Deleuze, Logique de la sensation, 1981, Kap. III, sinngemäss' },
      chair: { begriff: 'la chair', satz: 'Wie tief das Fleisch geht: von rosiger Haut bis zum rohen Stück, mit Bacons Blau und Violett in den Schatten.', zitat: '', quelle: 'Deleuze, Logique de la sensation, 1981, Kap. IV, sinngemäss' },
      fibres: { begriff: 'les fibres', satz: 'Die Fasern folgen den Linien des Gesichts, wie Muskeln unter der Haut. Längere Fasern, gröberes Fleisch.', zitat: '', quelle: 'Deleuze, Logique de la sensation, 1981, Kap. IV, sinngemäss' },
      humide: { begriff: 'l’humide', satz: 'Frisches Fleisch glänzt. Bacon malte es mit Rembrandt im Kopf, nass und lebendig.', zitat: '', quelle: 'Deleuze, Logique de la sensation, 1981, Kap. IV, sinngemäss' }
    },
    regler: [['Fläche', 'Kontur', 'Schatten'], ['Kraft', 'Spasmus', 'Rückkehr'], ['Fleisch', 'Fasern', 'Nässe']],
    reglerGlosse: [['couleur', 'contour', 'ombre'], ['force', 'spasme', 'retour'], ['chair', 'fibres', 'humide']],
    lesarten: [
      { kurz: 'Isolieren', titel: 'Das Rund und die Fläche', wer: 'Bacon', geste: 'Mit dem Daumen einen Kreis um die Figur ziehen.', text: 'Bacon setzt seine Figuren in ein Rund: einen Kreis auf dem Boden, ein Oval, eine Bahn wie in der Manege. Ringsum liegen grosse flache Farbfelder, Orange, Rosa, Violett, ohne Raum und ohne Landschaft. Deleuze nennt sie die aplats. Die Isolierung ist die erste Bedingung: Allein im Rund erzählt die Figur keine Geschichte mehr, sie wird nicht mehr erklärt, sie ist nur noch da. Hier ziehst du das Rund mit dem Daumen. Das Bild ringsum wird zur Fläche, die Figur bleibt lebendig im Rund und wirft ihren dunklen Schatten.' },
      { kurz: 'Schrei', titel: 'Der Schrei', wer: 'Bacon', geste: 'Ziehen verformt den Körper. Halten öffnet den Mund.', text: 'Bei Bacon geschieht in der Figur etwas, das nicht zu sehen ist: Kräfte zerren an ihr. Der Körper zieht sich zusammen, dehnt sich, zuckt, und er will hinaus, durch einen Punkt der Flucht: ein Waschbecken, einen Schirm, einen Mund. Der Schrei der Päpste nach Velázquez ist für Deleuze die Operation, durch die der ganze Körper durch den Mund entweicht. Bacon wollte den Schrei malen, nicht das Grauen. Hier verformt dein Daumen den Körper wie eine Masse, die zurückfedert. Hältst du ihn, öffnet sich ein Loch, der Körper strömt hinein, und wie ein Vorhang fallen senkrechte Schlieren über das Bild.' },
      { kurz: 'Fleisch', titel: 'Das Fleisch', wer: 'Bacon, Rembrandt', geste: 'Mit dem Daumen über die Figur streichen.', text: 'Bacon malt keine Gesichter, sondern Köpfe, und unter dem Kopf das Fleisch. Fleisch ist der Körper, wo die Knochen ihn nicht mehr tragen, eine Zone, in der Mensch und Tier nicht mehr zu unterscheiden sind. Bacon malt es nicht mit Grauen, sondern mit Mitleid: Jeder, der leidet, ist Fleisch. Er denkt dabei an Rembrandt und an die Metzgereien, und er gibt den Schatten Blau und Violett. Hier wird die Figur unter deinem Daumen zu Fleisch. Die Fasern folgen den Linien des Gesichts, Fett zieht sich hindurch, die frische Stelle glänzt, und dann sinkt das Fleisch langsam von den Knochen: Das Gesicht verliert seine Form, der Kopf bleibt.' }
    ],
    wenden: 'Kamera wenden', tonAn: 'Ton an', tonAus: 'Ton aus', loesen: 'Rund lösen', loesenHinweis: 'Unten links lösen: das Rund geht wieder auf.',
    begriff: 'Begriff', standbild: 'Standbild', aufnahme: 'Aufnahme', stopp: 'Stopp',
    teilen: 'Teilen', sichern: 'Sichern', komma: '.', 'ergebnis-hinweis': 'Gesichert im Ordner «Downloads». «Teilen» legt es direkt in die Galerie oder eine App.',
    keineAufnahme: 'Dieser Browser kann die Leinwand nicht aufnehmen. Das Standbild geht.',
    daumen: ['Einen Kreis um die Figur ziehen', 'Daumen auflegen, ziehen oder halten', 'Daumen über die Figur ziehen'],
    familie: 'Bild · Logique de la sensation, Kapitel I bis IV', 'b-titel': 'Figur und Fläche',
    'b-text': [
      'In «Francis Bacon. Logik der Sensation» (1981) beginnt Deleuze nicht mit dem Schrecken in Bacons Bildern, sondern mit ihrem Aufbau. Bacon unterscheidet drei Elemente: die grosse flache Farbfläche, das Rund oder die Kontur, und die Figur. Die Fläche ist kein Hintergrund, sie umschliesst die Figur von allen Seiten. Das Rund isoliert sie. So entgeht die Figur der Illustration und der Erzählung: Sie stellt nichts dar, sie ist ein Körper, auf den Kräfte wirken.',
      'Diese Kräfte sieht man nicht, aber man sieht, was sie tun. Der Körper zieht sich zusammen, dehnt sich, zuckt und will durch einen Punkt hinaus. Im Schrei entweicht er durch den Mund. Und wo die Knochen ihn nicht mehr halten, wird er Fleisch, die Zone, in der Mensch und Tier ununterscheidbar werden.',
      'Hier legst du das Rund, verformst den Körper oder lässt ihn zu Fleisch werden. Die Trennung von Figur und Fläche rechnet die Seite aus der Farbe des Bildes: was der Grund vom Rand her erreicht, wird Fläche.'
    ],
    'b-frage': 'Was bleibt von einem Gesicht, wenn nichts mehr um es herum erzählt? Und wessen Körper ist es, den du verformst?',
    'b-quelle': 'Gilles Deleuze, Francis Bacon. Logique de la sensation, Paris: La Différence 1981, Neuausgabe Seuil 2002, Kapitel I «Le rond, la piste», III «L’athlétisme», IV «Le corps, la viande et l’esprit, le devenir-animal». Deutsch: Francis Bacon. Logik der Sensation, Fink. David Sylvester, Interviews with Francis Bacon, London: Thames & Hudson 1975.',
    keineKamera: 'Die Kamera lässt sich nicht öffnen. Wähle ein Video, Fotos oder das Beispiel.',
    keinGL: 'Dieses Gerät kann WebGL 2 nicht anzeigen. Figur und Fläche braucht es.',
    kontextWeg: 'Die Grafik ist ausgestiegen. Bitte die Seite neu laden.'
  },
  en: {
    titel: 'Figure and field', satz: 'A round isolates the Figure, all around turns into flat colour, and forces seize the body.',
    kamera: 'Camera', video: 'Video or photos', beispiel: 'Example', lesart: 'Reading',
    glossen: {
      rond: { begriff: 'le rond', satz: 'A circle, an oval, a ring: Bacon sets the Figure in a round. So it stands by itself and no longer tells a story.', zitat: '« Isoler la Figure sera la condition première. »', quelle: 'Deleuze, The Logic of Sensation, 1981, ch. 1 (original)' },
      aplat: { begriff: 'l’aplat', satz: 'All around there is no landscape, no space, only large flat fields of colour. They are not a background; they enclose the Figure.', zitat: '« ce sont de grands aplats de couleur vive, uniforme et immobile. »', quelle: 'Deleuze, The Logic of Sensation, 1981, ch. 1 (original)' },
      elements: { begriff: 'trois éléments', satz: 'Three elements: the field as structure, the round as contour, the Figure. The contour is the boundary across which the two communicate.', zitat: '« la structure matérielle, le rond-contour, l’image dressée. »', quelle: 'Deleuze, The Logic of Sensation, 1981, ch. 1 (original)' },
      cri: { begriff: 'le cri', satz: 'The scream is not an expression of fear. In it the whole body wants out, through the hole of the mouth.', zitat: '« le cri de Bacon, c’est l’opération par laquelle le corps tout entier s’échappe par la bouche. »', quelle: 'Deleuze, The Logic of Sensation, 1981, ch. 3 (original)' },
      fuite: { begriff: 'le point de fuite', satz: 'The body seeks a point through which to slip away: a washbasin, an umbrella, a mouth.', zitat: '« Le corps s’efforce précisément, ou attend précisément de s’échapper. »', quelle: 'Deleuze, The Logic of Sensation, 1981, ch. 3 (original)' },
      horreur: { begriff: 'le cri plutôt que l’horreur', satz: 'Bacon did not want to paint the horror that causes the scream but the scream itself: the invisible forces tugging at the body.', zitat: '“I wanted to paint the scream more than the horror.”', quelle: 'Bacon to David Sylvester; Deleuze, The Logic of Sensation, preface and ch. 8' },
      viande: { begriff: 'la viande', satz: 'Meat is the body where the bones no longer hold it. There man and animal can no longer be told apart.', zitat: '« une zone d’indiscernabilité, d’indécidabilité, entre l’homme et l’animal »', quelle: 'Deleuze, The Logic of Sensation, 1981, ch. 4 (original)' },
      pitie: { begriff: 'pitié pour la viande', satz: 'Bacon paints meat not with horror but with pity. Whoever suffers is meat, and that concerns everyone.', zitat: '', quelle: 'Deleuze, The Logic of Sensation, 1981, ch. 4, paraphrased' },
      lesarten: { begriff: 'la Figure', satz: 'Three ways with the Figure: isolate it in the round, wring the scream from it, let it become meat.', zitat: '', quelle: 'Deleuze, The Logic of Sensation, 1981, ch. 1, 3, 4' },
      couleur: { begriff: 'la couleur', satz: 'Bacon’s fields: orange, pink, violet, green, night blue. Each colour gives the round a different counter-colour.', zitat: '', quelle: 'Deleuze, The Logic of Sensation, 1981, ch. 16, paraphrased' },
      contour: { begriff: 'le contour', satz: 'The contour is a membrane: it separates Figure and field and lets them pass into one another. Here you decide how sharply the Figure is cut from its ground.', zitat: '', quelle: 'Deleuze, The Logic of Sensation, 1981, ch. 3, paraphrased' },
      ombre: { begriff: 'l’ombre', satz: 'Bacon’s Figures cast shadows like pools. The body escapes into its shadow, as if it were an animal it shelters.', zitat: '', quelle: 'Deleuze, The Logic of Sensation, 1981, ch. 3, paraphrased' },
      force: { begriff: 'les forces', satz: 'Invisible forces pull, press and stretch the body. To paint is to make these forces visible.', zitat: '', quelle: 'Deleuze, The Logic of Sensation, 1981, ch. 8, paraphrased' },
      spasme: { begriff: 'le spasme', satz: 'A twitch runs through the body, as if it were waiting to get out of itself.', zitat: '« Bref un spasme : le corps comme plexus »', quelle: 'Deleuze, The Logic of Sensation, 1981, ch. 3 (original)' },
      retour: { begriff: 'l’athlétisme', satz: 'Bacon’s bodies are athletes of effort: they tense, give way and spring back. Here, how fast.', zitat: '', quelle: 'Deleuze, The Logic of Sensation, 1981, ch. 3, paraphrased' },
      chair: { begriff: 'la chair', satz: 'How deep the meat goes: from rosy skin to the raw cut, with Bacon’s blue and violet in the shadows.', zitat: '', quelle: 'Deleuze, The Logic of Sensation, 1981, ch. 4, paraphrased' },
      fibres: { begriff: 'les fibres', satz: 'The fibres follow the lines of the face, like muscles under the skin. Longer fibres, coarser meat.', zitat: '', quelle: 'Deleuze, The Logic of Sensation, 1981, ch. 4, paraphrased' },
      humide: { begriff: 'l’humide', satz: 'Fresh meat glistens. Bacon painted it with Rembrandt in mind, wet and alive.', zitat: '', quelle: 'Deleuze, The Logic of Sensation, 1981, ch. 4, paraphrased' }
    },
    regler: [['Field', 'Contour', 'Shadow'], ['Force', 'Spasm', 'Return'], ['Meat', 'Fibres', 'Wet']],
    reglerGlosse: [['couleur', 'contour', 'ombre'], ['force', 'spasme', 'retour'], ['chair', 'fibres', 'humide']],
    lesarten: [
      { kurz: 'Isolate', titel: 'The round and the field', wer: 'Bacon', geste: 'Draw a circle around the Figure with your thumb.', text: 'Bacon sets his Figures in a round: a circle on the floor, an oval, a ring as in the circus. All around lie large flat fields of colour, orange, pink, violet, without space and without landscape. Deleuze calls them aplats. Isolation is the first condition: alone in the round the Figure no longer tells a story, it is no longer explained, it is simply there. Here you draw the round with your thumb. The image around it becomes field, the Figure stays alive in the round and casts its dark shadow.' },
      { kurz: 'Scream', titel: 'The scream', wer: 'Bacon', geste: 'Drag to deform the body. Hold to open the mouth.', text: 'In Bacon something happens inside the Figure that cannot be seen: forces tug at it. The body contracts, stretches, twitches, and it wants out, through a point of escape: a washbasin, an umbrella, a mouth. For Deleuze the scream of the popes after Velázquez is the operation by which the whole body escapes through the mouth. Bacon wanted to paint the scream, not the horror. Here your thumb deforms the body like a mass that springs back. Hold it and a hole opens, the body pours into it, and vertical streaks fall over the image like a curtain.' },
      { kurz: 'Meat', titel: 'Meat', wer: 'Bacon, Rembrandt', geste: 'Stroke the Figure with your thumb.', text: 'Bacon does not paint faces but heads, and under the head the meat. Meat is the body where the bones no longer carry it, a zone where man and animal can no longer be told apart. Bacon paints it not with horror but with pity: everyone who suffers is meat. He thinks of Rembrandt and of butchers’ shops, and he gives the shadows blue and violet. Here the Figure turns to meat under your thumb. The fibres follow the lines of the face, fat runs through it, the fresh place glistens, and then the meat slowly sinks from the bones: the face loses its form, the head remains.' }
    ],
    wenden: 'Flip camera', tonAn: 'Sound on', tonAus: 'Sound off', loesen: 'Release the round', loesenHinweis: 'Bottom left to release: the round opens again.',
    begriff: 'Concept', standbild: 'Still', aufnahme: 'Record', stopp: 'Stop',
    teilen: 'Share', sichern: 'Save', komma: '.', 'ergebnis-hinweis': 'Saved to your “Downloads” folder. “Share” sends it straight to your gallery or an app.',
    keineAufnahme: 'This browser cannot record the canvas. Stills work.',
    daumen: ['Draw a circle around the Figure', 'Rest your thumb, drag or hold', 'Drag your thumb across the Figure'],
    familie: 'Image · The Logic of Sensation, chapters 1 to 4', 'b-titel': 'Figure and field',
    'b-text': [
      'In “Francis Bacon: The Logic of Sensation” (1981) Deleuze does not begin with the horror in Bacon’s pictures but with their structure. Bacon distinguishes three elements: the large flat field of colour, the round or contour, and the Figure. The field is not a background; it encloses the Figure on all sides. The round isolates it. So the Figure escapes illustration and narrative: it represents nothing, it is a body on which forces act.',
      'These forces cannot be seen, but one sees what they do. The body contracts, stretches, twitches and wants out through a point. In the scream it escapes through the mouth. And where the bones no longer hold it, it becomes meat, the zone where man and animal become indiscernible.',
      'Here you lay down the round, deform the body or let it become meat. The page computes the separation of Figure and field from the colour of the image: whatever the ground reaches from the edge becomes field.'
    ],
    'b-frage': 'What remains of a face when nothing around it tells a story? And whose body is it that you deform?',
    'b-quelle': 'Gilles Deleuze, Francis Bacon. Logique de la sensation, Paris: La Différence 1981, new edition Seuil 2002, chapters 1 “Le rond, la piste”, 3 “L’athlétisme”, 4 “Le corps, la viande et l’esprit, le devenir-animal”. English: Francis Bacon: The Logic of Sensation, Continuum 2003. David Sylvester, Interviews with Francis Bacon, London: Thames & Hudson 1975.',
    keineKamera: 'The camera cannot be opened. Choose a video, photos or the example.',
    keinGL: 'This device cannot show WebGL 2, which this page needs.',
    kontextWeg: 'The graphics stopped. Please reload the page.'
  },
  fr: {
    titel: 'La Figure et l’aplat', satz: 'Un rond isole la Figure, tout autour devient couleur plate, et des forces s’emparent du corps.',
    kamera: 'Caméra', video: 'Vidéo ou photos', beispiel: 'Exemple', lesart: 'Lecture',
    glossen: {
      rond: { begriff: 'le rond', satz: 'Un cercle, un ovale, une piste : Bacon pose la Figure dans un rond. Elle tient seule et ne raconte plus rien.', zitat: '« Isoler la Figure sera la condition première. »', quelle: 'Deleuze, Logique de la sensation, 1981, ch. I' },
      aplat: { begriff: 'l’aplat', satz: 'Autour, ni paysage ni espace, mais de grands champs de couleur plate. Ce n’est pas un fond, ils enserrent la Figure.', zitat: '« ce sont de grands aplats de couleur vive, uniforme et immobile. »', quelle: 'Deleuze, Logique de la sensation, 1981, ch. I' },
      elements: { begriff: 'trois éléments', satz: 'Trois éléments : l’aplat comme armature, le rond comme contour, la Figure. Le contour est la limite par où l’un et l’autre communiquent.', zitat: '« la structure matérielle, le rond-contour, l’image dressée. »', quelle: 'Deleuze, Logique de la sensation, 1981, ch. I' },
      cri: { begriff: 'le cri', satz: 'Le cri n’exprime pas la peur. En lui, le corps entier veut sortir, par le trou de la bouche.', zitat: '« le cri de Bacon, c’est l’opération par laquelle le corps tout entier s’échappe par la bouche. »', quelle: 'Deleuze, Logique de la sensation, 1981, ch. III' },
      fuite: { begriff: 'le point de fuite', satz: 'Le corps cherche un point par où se sauver : un lavabo, un parapluie, une bouche.', zitat: '« Le corps s’efforce précisément, ou attend précisément de s’échapper. »', quelle: 'Deleuze, Logique de la sensation, 1981, ch. III' },
      horreur: { begriff: 'le cri plutôt que l’horreur', satz: 'Bacon ne voulait pas peindre l’horreur qui fait crier, mais le cri lui-même : les forces invisibles qui tirent le corps.', zitat: '« I wanted to paint the scream more than the horror. »', quelle: 'Bacon à David Sylvester ; Deleuze, Logique de la sensation, préface et ch. VIII' },
      viande: { begriff: 'la viande', satz: 'La viande, c’est le corps là où les os ne le tiennent plus. L’homme et la bête n’y sont plus discernables.', zitat: '« une zone d’indiscernabilité, d’indécidabilité, entre l’homme et l’animal »', quelle: 'Deleuze, Logique de la sensation, 1981, ch. IV' },
      pitie: { begriff: 'pitié pour la viande', satz: 'Bacon peint la viande non avec horreur, mais avec pitié. Qui souffre est de la viande, et cela regarde chacun.', zitat: '', quelle: 'Deleuze, Logique de la sensation, 1981, ch. IV, en substance' },
      lesarten: { begriff: 'la Figure', satz: 'Trois voies avec la Figure : l’isoler dans le rond, lui arracher le cri, la laisser devenir viande.', zitat: '', quelle: 'Deleuze, Logique de la sensation, 1981, ch. I, III, IV' },
      couleur: { begriff: 'la couleur', satz: 'Les aplats de Bacon : orange, rose, violet, vert, bleu nuit. Chaque couleur donne au rond une autre couleur contraire.', zitat: '', quelle: 'Deleuze, Logique de la sensation, 1981, ch. XVI, en substance' },
      contour: { begriff: 'le contour', satz: 'Le contour est une membrane : il sépare la Figure et l’aplat et les fait communiquer. Ici tu décides avec quelle netteté la Figure est découpée de son fond.', zitat: '', quelle: 'Deleuze, Logique de la sensation, 1981, ch. III, en substance' },
      ombre: { begriff: 'l’ombre', satz: 'Les Figures de Bacon jettent des ombres comme des flaques. Le corps s’échappe dans son ombre, comme dans un animal qu’il abrite.', zitat: '', quelle: 'Deleuze, Logique de la sensation, 1981, ch. III, en substance' },
      force: { begriff: 'les forces', satz: 'Des forces invisibles tirent, pressent, étirent le corps. Peindre, c’est rendre ces forces visibles.', zitat: '', quelle: 'Deleuze, Logique de la sensation, 1981, ch. VIII, en substance' },
      spasme: { begriff: 'le spasme', satz: 'Un tressaillement traverse le corps, comme s’il attendait de sortir de lui-même.', zitat: '« Bref un spasme : le corps comme plexus »', quelle: 'Deleuze, Logique de la sensation, 1981, ch. III' },
      retour: { begriff: 'l’athlétisme', satz: 'Les corps de Bacon sont des athlètes de l’effort : ils se tendent, cèdent et reviennent. Ici, à quelle vitesse.', zitat: '', quelle: 'Deleuze, Logique de la sensation, 1981, ch. III, en substance' },
      chair: { begriff: 'la chair', satz: 'Jusqu’où va la viande : de la peau rosée jusqu’au morceau cru, avec le bleu et le violet de Bacon dans les ombres.', zitat: '', quelle: 'Deleuze, Logique de la sensation, 1981, ch. IV, en substance' },
      fibres: { begriff: 'les fibres', satz: 'Les fibres suivent les lignes du visage, comme des muscles sous la peau. Fibres plus longues, viande plus grossière.', zitat: '', quelle: 'Deleuze, Logique de la sensation, 1981, ch. IV, en substance' },
      humide: { begriff: 'l’humide', satz: 'La viande fraîche luit. Bacon la peignait en pensant à Rembrandt, humide et vivante.', zitat: '', quelle: 'Deleuze, Logique de la sensation, 1981, ch. IV, en substance' }
    },
    regler: [['Aplat', 'Contour', 'Ombre'], ['Force', 'Spasme', 'Retour'], ['Viande', 'Fibres', 'Humide']],
    reglerGlosse: [['couleur', 'contour', 'ombre'], ['force', 'spasme', 'retour'], ['chair', 'fibres', 'humide']],
    lesarten: [
      { kurz: 'Isoler', titel: 'Le rond et l’aplat', wer: 'Bacon', geste: 'Trace du pouce un cercle autour de la Figure.', text: 'Bacon pose ses Figures dans un rond : un cercle au sol, un ovale, une piste comme au cirque. Autour s’étendent de grands champs de couleur plate, orange, rose, violet, sans espace ni paysage. Deleuze les appelle les aplats. Isoler la Figure est la condition première : seule dans le rond, la Figure ne raconte plus d’histoire, on ne l’explique plus, elle est là. Ici tu traces le rond du pouce. L’image autour devient aplat, la Figure reste vivante dans le rond et jette son ombre sombre.' },
      { kurz: 'Cri', titel: 'Le cri', wer: 'Bacon', geste: 'Glisse pour déformer le corps. Tiens pour ouvrir la bouche.', text: 'Chez Bacon, il se passe dans la Figure quelque chose qu’on ne voit pas : des forces la tirent. Le corps se contracte, s’étire, tressaille, et il veut sortir, par un point de fuite : un lavabo, un parapluie, une bouche. Pour Deleuze, le cri des papes d’après Vélasquez est l’opération par laquelle le corps tout entier s’échappe par la bouche. Bacon voulait peindre le cri plutôt que l’horreur. Ici ton pouce déforme le corps comme une masse qui revient. Tiens-le, un trou s’ouvre, le corps s’y engouffre, et des traînées verticales tombent sur l’image comme un rideau.' },
      { kurz: 'Viande', titel: 'La viande', wer: 'Bacon, Rembrandt', geste: 'Passe le pouce sur la Figure.', text: 'Bacon ne peint pas des visages, mais des têtes, et sous la tête la viande. La viande, c’est le corps là où les os ne le portent plus, une zone où l’homme et la bête ne se distinguent plus. Bacon ne la peint pas avec horreur, mais avec pitié : quiconque souffre est de la viande. Il pense à Rembrandt et aux boucheries, et il donne aux ombres du bleu et du violet. Ici la Figure devient viande sous ton pouce. Les fibres suivent les lignes du visage, le gras la traverse, l’endroit frais luit, puis la viande descend lentement des os : le visage perd sa forme, la tête reste.' }
    ],
    wenden: 'Retourner', tonAn: 'Son activé', tonAus: 'Son coupé', loesen: 'Défaire le rond', loesenHinweis: 'En bas à gauche pour défaire : le rond se rouvre.',
    begriff: 'Concept', standbild: 'Image', aufnahme: 'Enregistrer', stopp: 'Arrêter',
    teilen: 'Partager', sichern: 'Télécharger', komma: ',', 'ergebnis-hinweis': 'Enregistré dans le dossier « Téléchargements ». « Partager » l’envoie directement dans la galerie ou une app.',
    keineAufnahme: 'Ce navigateur ne peut pas enregistrer le canevas. L’image fixe fonctionne.',
    daumen: ['Trace un cercle autour de la Figure', 'Pose le pouce, glisse ou tiens', 'Passe le pouce sur la Figure'],
    familie: 'Image · Logique de la sensation, chapitres I à IV', 'b-titel': 'La Figure et l’aplat',
    'b-text': [
      'Dans « Francis Bacon. Logique de la sensation » (1981), Deleuze ne commence pas par l’horreur des tableaux de Bacon, mais par leur structure. Bacon distingue trois éléments : le grand aplat de couleur, le rond ou contour, et la Figure. L’aplat n’est pas un fond, il enserre la Figure de tous côtés. Le rond l’isole. Ainsi la Figure échappe à l’illustration et au récit : elle ne représente rien, elle est un corps sur lequel agissent des forces.',
      'Ces forces, on ne les voit pas, mais on voit ce qu’elles font. Le corps se contracte, s’étire, tressaille et veut sortir par un point. Dans le cri, il s’échappe par la bouche. Et là où les os ne le tiennent plus, il devient viande, la zone où l’homme et la bête deviennent indiscernables.',
      'Ici tu poses le rond, tu déformes le corps ou tu le laisses devenir viande. La page calcule la séparation de la Figure et de l’aplat d’après la couleur de l’image : ce que le fond atteint depuis le bord devient aplat.'
    ],
    'b-frage': 'Que reste-t-il d’un visage quand plus rien autour ne raconte ? Et à qui est ce corps que tu déformes ?',
    'b-quelle': 'Gilles Deleuze, Francis Bacon. Logique de la sensation, Paris : La Différence 1981, rééd. Seuil 2002, chapitres I « Le rond, la piste », III « L’athlétisme », IV « Le corps, la viande et l’esprit, le devenir-animal ». David Sylvester, Interviews with Francis Bacon, Londres : Thames & Hudson 1975.',
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
const SPUR = 'figur.spur';
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
  if (s.length && !['✓ läuft', 'Start', 'Ende', 'Pause'].includes(s.at(-1))) console.warn('Figur: der letzte Versuch brach ab nach', s.slice(-4).join(' → '));
  localStorage.setItem(SPUR, JSON.stringify(['Start']));
} catch {}
addEventListener('error', (e) => spur('Fehler: ' + String(e.message || e.error || '?').slice(0, 160)));
addEventListener('unhandledrejection', (e) => spur('Fehler: ' + String(e.reason?.message || e.reason || '?').slice(0, 160)));

// ---------- Grafik ----------
const telefon = matchMedia('(pointer: coarse)').matches || Math.min(screen.width, screen.height) < 700;
const leinwand = $('leinwand');
const gl = leinwand.getContext('webgl2', { antialias: false, alpha: false, premultipliedAlpha: false, powerPreference: 'high-performance', preserveDrawingBuffer: false });
// Ohne Grafikkarte (Software wie SwiftShader, llvmpipe, «Basic Render Driver») eine leichte Fassung; ?voll erzwingt die volle
const grafikName = (() => { try { const x = gl && gl.getExtension('WEBGL_debug_renderer_info'); return x ? String(gl.getParameter(x.UNMASKED_RENDERER_WEBGL)) : ''; } catch { return ''; } })();
const leicht = !Q.has('voll') && (/basic render|swiftshader|llvmpipe|softpipe|software/i.test(grafikName) || Q.has('leicht'));
const ARBEIT = leicht ? 480 : telefon ? 720 : 960;          // Feld der Freistellung (Matte), lange Seite
const KLEIN = leicht ? 96 : telefon ? 128 : 160;            // Feld der Flutung: hier sucht der Grund vom Rand her seinen Weg
const FLUT_SCHRITTE = leicht ? 4 : 7;                       // Schritte der Flutung je Bild
const SCHARF_SEITE = leicht ? 960 : telefon ? 1280 : 1920;  // die Gegenwart: so scharf, wie der Bildschirm sie zeigt
const MAX_DPR = leicht ? 0.6 : 2;
const FEDER_SEITE = leicht ? 200 : telefon ? 320 : 420;     // Feld der Verformung (Schrei)
const FLEISCH_SEITE = leicht ? 360 : telefon ? 512 : 720;   // Feld des Fleisches
const LIC_SCHRITTE = leicht ? 6 : 11;                       // Schritte je Richtung entlang einer Faser
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
// jede Stufe gedreht, damit keine Achsen im Rauschen stehen bleiben
float fbm(vec2 p){ float s = 0.0, a = 0.5; mat2 m = mat2(0.8, 0.6, -0.6, 0.8); for (int k = 0; k < 5; k++) { s += a * rauschen(p); p = m * p * 2.03 + 17.1; a *= 0.5; } return s; }
// Farbabstand: Helligkeit schwächer, Buntheit stärker gewichtet (Schatten auf dem Grund bleiben Grund)
float fabst(vec3 a, vec3 b){ vec3 d = a - b; float y = lu(d); vec2 c = vec2(d.b - y, d.r - y); return 1.0 * y * y + 1.6 * dot(c, c); }
`;
const FS_KOPIE = KOPF + `uniform sampler2D uQ; void main(){ o = vec4(texture(uQ, v).rgb, 1.0); }`;
// klein rechnen: vier Proben je Punkt, damit die Flutung nicht auf Rauschen hereinfällt
const FS_KLEIN = KOPF + `uniform sampler2D uQ; uniform vec2 uPx;
void main(){ vec3 c = 0.25 * (texture(uQ, v + uPx * vec2(-0.5, -0.5)).rgb + texture(uQ, v + uPx * vec2(0.5, -0.5)).rgb + texture(uQ, v + uPx * vec2(-0.5, 0.5)).rgb + texture(uQ, v + uPx * vec2(0.5, 0.5)).rgb); o = vec4(c, 1.0); }`;

// ---------- Freistellung: der Grund flutet vom Rand her ----------
// B je Punkt des kleinen Feldes: wie sicher hier Grund ist. Saat am Rand (oben, links, rechts; unten nur, wo es wie Grund aussieht)
// und ausserhalb des Runds. Der Grund breitet sich zu Nachbarn ähnlicher Farbe aus, aber nur, wo die Farbe zur Palette des Grundes passt.
// Was er nicht erreicht, ist Figur: so bleiben auch graue Stellen im Gesicht Figur, wenn sie ringsum von Figur umgeben sind.
const FS_FLUT = KOPF + `uniform sampler2D uK, uAlt; uniform vec2 uPx; uniform vec3 uPal[8]; uniform float uSchritt, uSeite, uSigma; uniform vec4 uRahmen;
uniform vec4 uRing; uniform float uRingWink, uRingDa;
float wieGrund(vec3 c){ float d = 9.0; for (int k = 0; k < 8; k++) d = min(d, fabst(c, uPal[k])); return exp(-d / (uSigma * uSigma)); }
void main(){
  vec3 c = texture(uK, v).rgb;
  float like = wieGrund(c);
  // ausserhalb des Bildes (Letterbox) ist immer Grund
  if (v.x < uRahmen.x || v.y < uRahmen.y || v.x > uRahmen.z || v.y > uRahmen.w) { o = vec4(1.0, 0.0, 1.0, 1.0); return; }
  float saat = 0.0;
  vec2 r = (v - uRahmen.xy) / (uRahmen.zw - uRahmen.xy), px = uPx / (uRahmen.zw - uRahmen.xy);
  if (r.y > 1.0 - 1.6 * px.y || r.x < 1.6 * px.x || r.x > 1.0 - 1.6 * px.x) saat = 1.0;
  if (r.y < 1.6 * px.y) saat = smoothstep(0.6, 0.9, like);          // unten steht oft der Körper im Bild
  float innen = 0.0;
  if (uRingDa > 0.5) {
    vec2 q = vec2(v.x * uSeite, v.y) - uRing.xy; float cs = cos(uRingWink), sn = sin(uRingWink);
    vec2 e = vec2(cs * q.x + sn * q.y, -sn * q.x + cs * q.y) / uRing.zw;
    if (dot(e, e) > 1.12) saat = max(saat, 0.8);
    innen = 1.0 - smoothstep(0.55, 0.8, dot(e, e));
  }
  vec4 alt = texture(uAlt, v);
  float best = alt.r * 0.97, gbest = alt.g * 0.985;
  for (int y = -1; y <= 1; y++) for (int x = -1; x <= 1; x++) {
    if (x == 0 && y == 0) continue;
    vec2 n = v + vec2(x, y) * uPx * uSchritt;
    vec4 an = texture(uAlt, n);
    vec3 cn = texture(uK, n).rgb;
    // auf halbem Weg nachsehen, damit grosse Schritte keine feine Kante überspringen
    vec3 cm = texture(uK, v + vec2(x, y) * uPx * uSchritt * 0.5).rgb;
    float sim = exp(-max(fabst(c, cn), fabst(c, cm)) / 0.004);
    best = max(best, an.r * sim);
    gbest = max(gbest, an.g);
  }
  float B = max(saat * like, like * best);
  // G: Figur, die mit dem Inneren des Runds zusammenhängt. Was draussen liegt und nicht dazugehört, deckt die Fläche zu.
  float fig = smoothstep(0.75, 0.3, B);
  float G = fig * max(innen, gbest);
  o = vec4(B, G, like, 1.0);
}`;
// Matte in Arbeitsgrösse: tief innen Figur, weit draussen Grund, dazwischen entscheidet der Farbabstand je Bildpunkt (feine Kante).
const FS_MATTE = KOPF + `uniform sampler2D uQ, uB, uAlt; uniform vec3 uPal[8]; uniform float uSigma, uNeu; uniform vec2 uPxB;
float wieGrund(vec3 c){ float d = 9.0; for (int k = 0; k < 8; k++) d = min(d, fabst(c, uPal[k])); return exp(-d / (uSigma * uSigma)); }
void main(){
  // weich gelesen: einzelne Splitter im Haar sollen keine Löcher in die Figur reissen
  float Bu = 0.4 * texture(uB, v).r + 0.15 * (texture(uB, v + vec2(uPxB.x, 0.0)).r + texture(uB, v - vec2(uPxB.x, 0.0)).r + texture(uB, v + vec2(0.0, uPxB.y)).r + texture(uB, v - vec2(0.0, uPxB.y)).r);
  float likeHi = wieGrund(texture(uQ, v).rgb);
  float sicher = smoothstep(0.7, 0.3, Bu);
  float kante = (1.0 - smoothstep(0.3, 0.8, likeHi)) * smoothstep(0.995, 0.6, Bu);
  // Saum: Am Rand der Figur mischt das kleine Feld Figur und Grund, die Flutung hält dort ein Feld zu früh an.
  // Liegt gleich daneben sicherer Grund und sieht der Punkt selbst ganz wie Grund aus, gehört er zum Grund.
  float Bn = 0.0;
  for (int k = 0; k < 8; k++) { float a = float(k) * 0.785398; Bn = max(Bn, texture(uB, v + vec2(cos(a), sin(a)) * uPxB * 1.25).r); }
  float saum = smoothstep(0.75, 0.95, Bn) * smoothstep(0.55, 0.9, likeHi);
  float fg = max(sicher * (1.0 - saum), kante);
  float alt = texture(uAlt, v).r;
  o = vec4(mix(alt, fg, uNeu), 0.0, 0.0, 1.0);
}`;
// die Silhouette im Rund, Quelle des Schattens (wird danach weich gefaltet)
const FS_SILH = KOPF + `uniform sampler2D uM; uniform vec4 uRing; uniform float uRingWink, uSeite, uFlut;
void main(){
  vec2 q = vec2(v.x * uSeite, v.y) - uRing.xy; float cs = cos(uRingWink), sn = sin(uRingWink);
  vec2 e = vec2(cs * q.x + sn * q.y, -sn * q.x + cs * q.y) / uRing.zw;
  float innen = 1.0 - smoothstep(0.97, 1.01, length(e));
  o = vec4(smoothstep(0.3, 0.7, texture(uM, v).r) * innen * uFlut, 0.0, 0.0, 1.0);
}`;
// eine kleine Kopie der Matte, aus der die Seite Mitte und Grösse der Figur liest (für das Rund von selbst)
const FS_MKLEIN = KOPF + `uniform sampler2D uM; void main(){ o = vec4(texture(uM, v).r, 0.0, 0.0, 1.0); }`;

// ---------- Lesart I: Isolieren. Die Figur, das Rund, die Fläche ----------
// Ring in Bildhöhen (x mal Seitenverhältnis). uFlut: wie weit die Fläche von aussen herein ist, uRund: wie weit das Rund gefüllt ist.
const FS_SZENE = KOPF + `uniform sampler2D uScharf, uM, uB, uS1, uS2; uniform vec2 uPxS; uniform float uSeite, uT, uHpx;
uniform vec4 uRing; uniform float uRingWink, uRingStart, uRingDir, uRingZug, uFlut, uRund, uRmax;
uniform vec3 uAplat, uRond, uOmbre, uLigne; uniform float uKontur, uSchatten, uFigur;
void main(){
  vec3 bild = texture(uScharf, v).rgb;
  float m = texture(uM, v).r;
  // Kante der Figur: so scharf, wie das Feld es hergibt, nie treppig
  float w = clamp(fwidth(m) * 0.9, 0.025, 0.35) + 0.02 * (1.0 - uKontur);
  float fg = smoothstep(0.5 - w, 0.5 + w, m);
  vec2 q = vec2(v.x * uSeite, v.y);
  vec2 d = q - uRing.xy; float cs = cos(uRingWink), sn = sin(uRingWink);
  vec2 er = vec2(cs * d.x + sn * d.y, -sn * d.x + cs * d.y);
  vec2 e = er / uRing.zw; float rr = length(e);
  float g = length(e / uRing.zw) / max(rr, 1e-4);
  float dpx = (rr - 1.0) / max(g, 1e-4) * uHpx;        // Abstand zum Rund in Bildpunkten, + aussen
  // Chromatismus: die Fläche ist nie ganz flach, nur kaum merklich wärmer und kälter, dazu die Rückseite der Leinwand
  float gross = fbm(q * 1.3 + vec2(3.1, uT * 0.006)) - 0.5;
  // Leinwand: mittelfeine Wolken und ein Korn je Bildpunkt; feineres Rauschen gäbe Moiré wie Höhenlinien
  float faser = (fbm(q * vec2(38.0, 46.0)) - 0.5) * 0.6 + (h21(floor(v * vec2(uHpx * uSeite, uHpx)) + 0.5) - 0.5) * 0.4;
  vec3 aplat = uAplat * (1.0 + 0.07 * gross) + vec3(0.012, -0.004, -0.012) * gross * 2.0;
  aplat *= 1.0 + 0.03 * faser;
  vec3 rond = uRond * (1.0 + 0.06 * (fbm(q * 2.1 - 7.0) - 0.5)) * (1.0 + 0.03 * faser);
  // die Fläche flutet von aussen herein, mit einer gemalten, nicht ganz geraden Front
  float front = mix(uRmax + 0.2, 1.0, uFlut) + 0.09 * (fbm(q * 5.0 + 2.0) - 0.5) * (1.0 - uFlut);
  float aussen = smoothstep(front - 0.01, front + 0.03, rr);
  aussen = max(aussen, smoothstep(-1.0, 1.0, dpx) * step(0.999, uFlut));
  // das Rund füllt sich vom Rand zur Mitte
  float innen = (1.0 - smoothstep(-1.0, 1.0, dpx)) * smoothstep(1.0 - uRund * 1.05 - 0.02, 1.0 - uRund * 1.05 + 0.04, rr);
  float flaeche = aussen + innen;
  // der Schatten: eine dunkle Lache, die an der Figur hängt und nach links unten ausläuft.
  // Aus der Silhouette im Rund, zweimal weich gefaltet: nah an der Figur dicht und klar, weiter weg weich wie lasiert
  vec2 off = vec2(0.032 / uSeite, 0.07);
  float s1 = texture(uS1, v + off * 0.45).r, s2 = texture(uS2, v + off).r;
  float sch = max(smoothstep(0.12, 0.62, s1) * 0.92, smoothstep(0.06, 0.55, s2) * 0.78);
  // die Lache dünnt nach aussen aus, ohne Kante: ganz feines Rauschen in der Dichte wie Farbe auf roher Leinwand
  sch *= 0.94 + 0.06 * (fbm(q * 9.0 + 4.0) - 0.5) * 2.0;
  vec3 grund = mix(bild, aplat, aussen);
  grund = mix(grund, rond, innen);
  // gemalter Rand des Runds: innen ein Hauch dunkler, wie dicker aufgetragen
  grund *= 1.0 - 0.06 * innen * exp(-abs(dpx) / (22.0 * uHpx / 900.0));
  // der Schatten nimmt die Farbe der Fläche mit und wird tiefer, nicht grau
  vec3 tiefe = mix(grund * uOmbre * 2.2, uOmbre, 0.35);
  grund = mix(grund, tiefe, uSchatten * 0.9 * sch * flaeche);
  // die Linie des Runds, haarfein, zeichnet sich von ihrem Anfang her
  float wink = atan(e.y, e.x);
  float teil = fract((wink - uRingStart) * uRingDir / 6.28318 + 1.0);
  float zug = smoothstep(teil - 0.004, teil + 0.004, uRingZug);
  // ein einziger Haarstrich: Breite in Bildpunkten des Bildschirms, das Profil eine Glocke (nie treppig),
  // Druck und Dichte schwanken kaum merklich entlang des Umfangs wie bei einem Strich von Hand
  float px1 = uHpx / 900.0;
  float druck = 0.85 + 0.3 * (fbm(vec2(wink * 2.2 + 1.7, 0.5)) - 0.5) * 2.0;
  float lw = mix(0.35, 1.0, uKontur) * px1 * druck;
  float sg = 0.5 * lw + 0.42;
  float linie = exp(-0.5 * dpx * dpx / (sg * sg)) * min(1.0, lw / 0.7 + 0.35) * zug;
  grund = mix(grund, uLigne, linie * (0.6 + 0.35 * uKontur) * (0.9 + 0.1 * druck));
  // die Figur: unverändert lebendig, nur etwas dichter, und an der Kante eine Membran in der Farbe der Fläche
  vec3 fig = mix(bild, bild * bild * (3.0 - 2.0 * bild), 0.22 * uFigur);
  // das Rund isoliert: draussen deckt die Fläche alles zu, auch was zur Figur gehörte (ein Hauch Übergang, keine Treppe)
  fg *= mix(1.0, 1.0 - smoothstep(-0.8, 0.8, dpx), uFlut);
  float membran = fg * (1.0 - fg) * 4.0 * uKontur * innen;
  vec3 c = mix(grund, fig, fg);
  c = mix(c, mix(uAplat, uOmbre, 0.5), membran * 0.14);
  // feines Zittern unter einem Achtbit-Schritt: sonst stehen in den grossen Flächen Stufen wie Höhenlinien
  c += (h21(gl_FragCoord.xy + fract(uT) * 61.0) - 0.5) * (2.0 / 255.0);
  // im Alpha: wie sehr hier Figur steht (nach dem Schnitt durch das Rund), für das Fleisch
  o = vec4(c, fg);
}`;

// ---------- Lesart II: Schrei. Der Körper unter Kräften, und der Mund als Punkt der Flucht ----------
// Feld F: rg = woher das Bild kommt (in Bildhöhen), ba = Geschwindigkeit. Eine Feder zieht F zum Ziel, das die Finger setzen.
const FS_FEDER = KOPF + `uniform sampler2D uAlt, uM; uniform vec4 uFa[4]; uniform vec4 uFb[4]; uniform int uN; uniform float uSeite, uDt, uK, uDaempf, uSpasmus;
uniform vec2 uMitte;
void main(){
  vec4 alt = texture(uAlt, v);
  vec2 D = alt.rg, V = alt.ba;
  vec2 q = vec2(v.x * uSeite, v.y);
  vec2 T = vec2(0.0);
  for (int k = 0; k < 4; k++) {
    if (k >= uN) break;
    vec2 f0 = uFa[k].xy, f = uFa[k].zw;
    float halt = uFb[k].x, r = uFb[k].y, dreh = uFb[k].w;
    // ziehen: was unter dem Daumen lag, geht mit ihm (weiche Glocke um die jetzige Lage)
    vec2 z = q - f; float w = exp(-dot(z, z) / (r * r));
    T += (f0 - f) * w;
    // halten: der Körper wird in den Punkt gesogen und dreht sich dabei, wie Wasser im Becken
    float R = r * 1.45, wd = exp(-dot(z, z) / (R * R));
    float s = halt * wd;
    float a = s * 1.9, th = s * 1.6 * dreh;
    vec2 rot = vec2(cos(th) * z.x - sin(th) * z.y, sin(th) * z.x + cos(th) * z.y);
    T += f + rot * (1.0 + a) - q;
  }
  // Spasmus: ein Zucken geht durch die Figur, quer gestaucht, längs gedehnt
  float fg = texture(uM, v).r;
  vec2 dm = q - uMitte;
  T += vec2(dm.x * uSpasmus, -dm.y * uSpasmus * 0.6) * fg;
  vec2 A = uK * (T - D) - uDaempf * V;
  V += A * uDt; D += V * uDt;
  float lD = length(D); if (lD > 0.6) D *= 0.6 / lD;
  o = vec4(D, V);
}`;
const FS_SCHREI = KOPF + `uniform sampler2D uS, uF; uniform float uSeite, uT, uHpx; uniform vec4 uMund[4]; uniform int uN; uniform float uVorhang, uSchmier;
void main(){
  vec4 f = texture(uF, v);
  vec2 D = vec2(f.r / uSeite, f.g), V = vec2(f.b / uSeite, f.a);
  vec2 p = v + D;
  // Verwischung entlang der Bewegung: Bacons Wisch im Fleisch der Bewegung
  vec2 sv = V * uSchmier; float ls = length(sv * vec2(uSeite, 1.0)); if (ls > 0.08) sv *= 0.08 / ls;
  vec3 c = vec3(0.0); float ws = 0.0;
  for (int k = 0; k < 9; k++) { float t = float(k) / 8.0 - 0.5; float w = 1.0 - abs(t) * 1.2; c += texture(uS, p + sv * t).rgb * w; ws += w; }
  c /= ws;
  // der Vorhang: senkrechte Schlieren wie bei den Päpsten, jede Spalte zieht anders weit
  if (uVorhang > 0.002) {
    float x = v.x * uHpx * uSeite;
    float sp = rauschen(vec2(x / 2.3, 0.5)) * 0.6 + rauschen(vec2(x / 7.1, 3.5)) * 0.4;
    float lang = (0.02 + 0.16 * sp) * uVorhang;
    vec3 s = vec3(0.0);
    for (int k = 0; k < 8; k++) s += texture(uS, p + vec2(0.0, lang * (float(k) / 7.0 - 0.15))).rgb;
    s /= 8.0;
    float spalt = smoothstep(0.35, 0.75, rauschen(vec2(x / 3.7, 9.0)));
    c = mix(c, s * (0.86 + 0.24 * spalt), smoothstep(0.0, 0.5, uVorhang) * (0.55 + 0.45 * sp));
  }
  // der Mund: ein Loch, durch das der Körper entweicht, innen tiefes Rot, am Rand ein Saum
  vec2 q = vec2(v.x * uSeite, v.y);
  for (int k = 0; k < 4; k++) {
    if (k >= uN) break;
    vec2 z = (q - uMund[k].xy) / vec2(0.82, 1.0);
    float r = uMund[k].z; if (r < 0.001) continue;
    float d = length(z) + 0.012 * (rauschen(z * 40.0 + uT * 3.0) - 0.5) * r * 20.0;
    float loch = 1.0 - smoothstep(r * 0.55, r, d);
    float saum = smoothstep(r * 0.4, r * 0.95, d) * (1.0 - smoothstep(r * 0.95, r * 1.35, d));
    vec3 tief = mix(vec3(0.33, 0.02, 0.05), vec3(0.015, 0.004, 0.01), smoothstep(r * 0.9, r * 0.2, d));
    c = mix(c, tief, loch);
    c = mix(c, c * vec3(0.6, 0.25, 0.28), saum * 0.5);
  }
  o = vec4(c, 1.0);
}`;

// ---------- Lesart III: Fleisch ----------
// Maske M: r = Fleisch, g = frisch (glänzt). Der Daumen trägt auf, das Fleisch breitet sich in der Figur ein wenig aus.
const FS_MASKE = KOPF + `uniform sampler2D uAlt, uM; uniform vec2 uPx; uniform vec4 uS[16]; uniform vec4 uSR[16]; uniform int uN; uniform float uSeite, uAb, uFrisch, uDt, uStufe;
void main(){
  vec4 alt = texture(uAlt, v);
  vec4 n4 = 0.25 * (texture(uAlt, v + vec2(uPx.x, 0)) + texture(uAlt, v - vec2(uPx.x, 0)) + texture(uAlt, v + vec2(0, uPx.y)) + texture(uAlt, v - vec2(0, uPx.y)));
  float fg = texture(uM, v).r;
  float fl = max(alt.r, n4.r * 0.996 * smoothstep(0.3, 0.7, fg)) * uAb;
  float fr = alt.g * uFrisch;
  vec2 q = vec2(v.x * uSeite, v.y);
  for (int k = 0; k < 16; k++) {
    if (k >= uN) break;
    vec2 a = vec2(uS[k].x * uSeite, uS[k].y), b = vec2(uS[k].z * uSeite, uS[k].w);
    float r = uSR[k].x;
    vec2 ab = b - a; float L2 = dot(ab, ab);
    float h = clamp(dot(q - a, ab) / max(L2, 1e-12), 0.0, 1.0), d = length(q - a - ab * h) / r;
    // der Strich ist an den Rändern ausgefranst wie ein trockener Pinsel
    float rand = 1.0 - smoothstep(0.5 + 0.35 * fbm(q * 18.0 + uSR[k].w), 1.0, d);
    fl = max(fl, rand * uSR[k].y);
    fr = max(fr, rand);
  }
  // b: wie weit das Fleisch von den Knochen gesunken ist. Es sinkt, solange es Fleisch ist, langsam, fast ohne Ende,
  // und gleicht sich mit den Nachbarn aus, damit keine Treppen entstehen
  float sink = mix(alt.b, n4.b, 0.5);
  sink = min(1.0, sink + max(uDt * 0.1 * (1.15 - sink), uStufe) * smoothstep(0.15, 0.6, fl));
  sink *= smoothstep(0.0, 0.08, fl + n4.r * 0.5);
  o = vec4(min(fl, 1.0), fr, sink, 1.0);
}`;
const FS_TENSOR = KOPF + `uniform sampler2D uQ; uniform vec2 uPx;
void main(){
  float a = lu(texture(uQ, v + vec2(-uPx.x, uPx.y)).rgb), b = lu(texture(uQ, v + vec2(0.0, uPx.y)).rgb), c = lu(texture(uQ, v + uPx).rgb);
  float d = lu(texture(uQ, v - vec2(uPx.x, 0.0)).rgb), f = lu(texture(uQ, v + vec2(uPx.x, 0.0)).rgb);
  float g = lu(texture(uQ, v - uPx).rgb), h = lu(texture(uQ, v - vec2(0.0, uPx.y)).rgb), i = lu(texture(uQ, v + vec2(uPx.x, -uPx.y)).rgb);
  float gx = (c + 2.0 * f + i) - (a + 2.0 * d + g), gy = (a + 2.0 * b + c) - (g + 2.0 * h + i);
  o = vec4(gx * gx, gy * gy, gx * gy, 1.0);
}`;
const FS_FLEISCH = KOPF + `#define N ${LIC_SCHRITTE}
uniform sampler2D uS, uM, uFl, uT, uR, uBild; uniform vec2 uPx, uPxB; uniform float uSeite, uZeit, uTiefe, uFasern, uNass, uHpx;
vec3 fleischFarbe(float l, float tiefe){
  // Bacons Fleisch: tiefes Rot im Dunkeln, ein gedämpftes Violett im Übergang, rohes Rot, Rosa, Fett wie Rahm im Hellen
  l = clamp(l * mix(1.08, 0.8, tiefe) + mix(0.05, -0.03, tiefe), 0.0, 1.0);
  vec3 c0 = vec3(0.10, 0.012, 0.03), c1 = vec3(0.34, 0.045, 0.09), c2 = vec3(0.44, 0.2, 0.34), c3 = vec3(0.78, 0.27, 0.29);
  vec3 c4 = vec3(0.93, 0.57, 0.54), c5 = vec3(0.98, 0.88, 0.78);
  float t;
  if (l < 0.2) { t = l / 0.2; return mix(c0, c1, t * t * (3.0 - 2.0 * t)); }
  if (l < 0.38) { t = (l - 0.2) / 0.18; return mix(c1, c2, t * t * (3.0 - 2.0 * t)); }
  if (l < 0.55) { t = (l - 0.38) / 0.17; return mix(c2, c3, t * t * (3.0 - 2.0 * t)); }
  if (l < 0.76) { t = (l - 0.55) / 0.21; return mix(c3, c4, t * t * (3.0 - 2.0 * t)); }
  t = (l - 0.76) / 0.24; return mix(c4, c5, t * t * (3.0 - 2.0 * t));
}
float fbm3(vec2 p){ float s = 0.0, a = 0.5; mat2 m = mat2(0.8, 0.6, -0.6, 0.8); for (int k = 0; k < 3; k++) { s += a * rauschen(p); p = m * p * 2.03 + 17.1; a *= 0.5; } return s / 0.875; }
float ader(vec2 q, vec2 d0){ vec2 wq = q * 3.4 + d0 * 0.35; return fbm3(wq + vec2(fbm3(q * 1.7 + 4.0), fbm3(q * 1.7 - 3.0)) * 1.8); }
float fettAus(float a, float aw){ return 1.0 - smoothstep(0.004, 0.004 + aw * 1.2 + 0.012, abs(a - 0.55)); }
// Richtung der Fasern: entlang der Kanten, wo das Bild eine Richtung hat; sonst ein langsamer Strom aus Rauschen (nie die Achsen)
vec2 richtung(vec2 p){
  vec3 J = texture(uT, p).rgb;
  float a = J.r - J.g, b2 = 2.0 * J.b;
  float koh = sqrt(a * a + b2 * b2) / (J.r + J.g + 1e-4);
  float ang = 0.5 * atan(b2, a);
  vec2 t = vec2(-sin(ang), cos(ang));
  vec2 qq = vec2(p.x * uSeite, p.y) * 2.2;
  float n = fbm(qq) * 6.2832 * 1.3;
  vec2 w = vec2(cos(n), sin(n));
  if (dot(t, w) < 0.0) t = -t;
  return normalize(mix(w, t, smoothstep(0.06, 0.4, koh)) + 1e-5);
}
void main(){
  vec4 s4 = texture(uS, v);
  vec3 s = s4.rgb;
  vec4 F = texture(uFl, v);
  vec2 q = vec2(v.x * uSeite, v.y);
  // das Fleisch sinkt von den Knochen: was darüber lag, hängt nun hier, in senkrechten Bahnen ungleich lang wie zähe Masse
  // (die Bahnen hängen nur von x ab, darum laufen sie senkrecht; ein zweites, feines Band franst sie aus)
  float bahn = 0.55 + 0.9 * fbm3(vec2(q.x * 7.0, 2.3)) + 0.35 * (fbm3(vec2(q.x * 31.0, 7.7)) - 0.5);
  float sinkHier = max(F.b, texture(uFl, v + vec2(0.0, 0.05)).b);
  float sag = 0.14 * sinkHier * sinkHier * (2.0 - sinkHier) * bahn;
  vec2 vs = v + vec2(0.0, sag);
  vec4 Fs = texture(uFl, vs), ss = texture(uS, vs);
  float menge = max(F.r, Fs.r * smoothstep(0.0, 0.01, sag)) * s4.a * mix(1.0, ss.a, 0.6);
  if (menge < 0.004) { o = vec4(s, 1.0); return; }
  vec2 d0 = richtung(vs);
  float sum = 0.0, ws = 0.0, w2 = 0.0;
  float schritt = mix(0.5, 1.6, uFasern);
  for (int r = 0; r < 2; r++) {
    float sg = r == 0 ? 1.0 : -1.0;
    vec2 p = vs, dv = d0 * sg;
    for (int i = 0; i <= N; i++) {
      if (i > 0 || r == 0) { float w = 0.5 + 0.5 * cos(3.14159 * float(i) / float(N + 1)); sum += texture(uR, p).r * w; ws += w; w2 += w * w; }
      vec2 d = richtung(p);
      if (dot(d, dv) < 0.0) d = -d; dv = d;
      p += d * uPx * schritt;
    }
  }
  // auf eine Streuung von eins gebracht: die Fasern sind gleich deutlich, wie lang sie auch sind
  float faser = clamp((sum / ws - 0.5) / sqrt(w2 / (ws * ws) / 12.0), -2.5, 2.5);
  // die Helligkeit kommt geglättet aus dem Bild: Flächen von Fleisch, nicht die Splitter des Mosaiks
  // dazu ein Teil des scharfen Bildes, damit Augen, Mund und Nase im Fleisch noch zu lesen sind: Kopf, nicht Gesicht
  float lg = 0.0;
  // beim Sinken zieht es Schlieren: das geglättete Bild längs der Bahn gemittelt, wie Farbe, die mit dem Fleisch rutscht
  for (int k = 0; k < 4; k++) lg += lu(texture(uBild, v + vec2(0.0, sag * (0.25 + 0.25 * float(k)))).rgb);
  float l = mix(lg * 0.25, lu(ss.rgb), mix(0.55, 0.3, smoothstep(0.0, 0.08, sag)));
  // Fett: weiche, gebogene Adern in Rahm, von den Linien des Bildes mitgenommen
  // drei Proben im Abstand von gut einem Bildpunkt statt dFdx: so entstehen keine Blöcke aus 2 × 2 Punkten
  float eps = 1.5 / uHpx;
  vec2 qs = vec2(q.x, vs.y);
  float a0 = ader(qs, d0), ax = ader(qs + vec2(eps, 0.0), d0), ay = ader(qs + vec2(0.0, eps), d0);
  float aw = length(vec2(ax - a0, ay - a0)) / 1.5;
  float st = 0.3 + 0.6 * uFasern;
  float fett = fettAus(a0, aw) * st, fx = fettAus(ax, aw) * st, fy = fettAus(ay, aw) * st;
  // das Fleisch ist nicht überall gleich: grosse Zonen dunkler und röter, wie Muskel neben Muskel
  float zone = fbm3(qs * 2.6 + 9.0) - 0.5;
  float L = clamp(l * (0.9 + 0.26 * zone) + faser * 0.04 * (0.4 + uFasern) + fett * 0.3, 0.0, 1.0);
  vec3 c = fleischFarbe(L, uTiefe);
  c = mix(c, vec3(0.98, 0.9, 0.8), fett * 0.65);
  // nasser Glanz: Relief aus Fasern und Fett, Licht von links oben
  vec3 n = normalize(vec3(-(fx - fett) * 0.9, -(fy - fett) * 0.9, 1.0));
  vec3 Lg = normalize(vec3(-0.4, 0.6, 0.7)), H = normalize(Lg + vec3(0.0, 0.0, 1.0));
  c *= mix(1.0, max(dot(n, Lg), 0.0) / Lg.z, 0.4);
  float glanz = pow(max(dot(n, H), 0.0), 50.0) * uNass * (0.3 + 0.7 * max(F.g, Fs.g));
  c += glanz * vec3(1.0, 0.95, 0.94) * 0.6;
  c *= 1.0 + 0.08 * uNass * max(F.g, Fs.g);
  // unten an jeder Bahn sammelt es sich dunkel, wie ein Tropfen kurz vor dem Fallen
  c *= 1.0 - 0.28 * smoothstep(0.02, 0.0, abs(menge - 0.32)) * smoothstep(0.01, 0.05, sag);
  // Rand wie ein trockener Pinsel: die Fasern franzen ihn fein aus
  float deck = smoothstep(0.2, 0.5, menge + faser * 0.05);
  o = vec4(mix(s, c, deck), 1.0);
}`;

// ---------- die Spur des Daumens beim Ziehen des Runds: kurze Stücke mit runden Enden, Kante ein Bildpunkt ----------
const VS_SPUR = `#version 300 es
in vec2 a; in vec4 iAB;
uniform vec2 uZiel; uniform float uBreite;
out vec2 vq; flat out vec4 vAB;
void main(){
  vec2 A = iAB.xy * uZiel, B = iAB.zw * uZiel;
  float rm = uBreite + 1.5;
  vec2 dir = B - A; float L = length(dir); dir = L > 1e-4 ? dir / L : vec2(1.0, 0.0);
  vec2 n = vec2(-dir.y, dir.x);
  vec2 p = mix(A - dir * rm, B + dir * rm, a.x * 0.5 + 0.5) + n * rm * a.y;
  vq = p; vAB = vec4(A, B);
  gl_Position = vec4(p / uZiel * 2.0 - 1.0, 0.0, 1.0);
}`;
const FS_SPUR = `#version 300 es
precision highp float; in vec2 vq; flat in vec4 vAB; out vec4 o; uniform float uBreite, uAlpha;
void main(){
  vec2 A = vAB.xy, ab = vAB.zw - vAB.xy;
  float h = clamp(dot(vq - A, ab) / max(dot(ab, ab), 1e-6), 0.0, 1.0), d = length(vq - A - ab * h);
  float dk = clamp(uBreite + 0.5 - d, 0.0, 1.0);
  if (dk <= 0.0) discard;
  o = vec4(vec3(0.847, 0.149, 0.11) * dk * uAlpha, dk * uAlpha);
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
const FS_ZUSAMMEN = KOPF + `uniform sampler2D uSzene, uGlow; uniform vec2 uPx; uniform float uGlowStaerke, uT, uKorn;
float h(float n){ return fract(sin(n * 91.345 + 7.13) * 43758.5453); }
void main(){
  vec3 m = texture(uSzene, v).rgb, c = m;
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
function paar(name, b, hh, float = true) {
  const a = zielBauen(name + '0', b, hh, float), c = zielBauen(name + '1', b, hh, float);
  const p = ziele[name] || (ziele[name] = { nr: 0 });
  p.lesen = () => (p.nr ? c : a); p.schreiben = () => (p.nr ? a : c); p.tauschen = () => { p.nr = 1 - p.nr; };
  return p;
}
const zeichneFlaeche = () => gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
function rechne(prog, ziel, tex, setze) {
  gl.bindFramebuffer(gl.FRAMEBUFFER, ziel ? ziel.fb : null);
  gl.viewport(0, 0, ziel ? ziel.b : leinwand.width, ziel ? ziel.h : leinwand.height);
  gl.useProgram(prog);
  let e = 1;
  for (const [n, t] of Object.entries(tex)) {
    gl.activeTexture(gl.TEXTURE0 + e);
    gl.bindTexture(gl.TEXTURE_2D, t ? t.tex || t : null);
    gl.uniform1i(prog.u[n], e); e++;
  }
  if (setze) setze(prog.u);
  zeichneFlaeche();
}

const SPUR_MAX = 1200;
let scharfTex = null, scharfB = 0, scharfH = 0, arbeitB = 0, arbeitH = 0, kleinB = 0, kleinH = 0, federB = 0, federH = 0, fleischB = 0, fleischH = 0;
let rauschTex = null, rauschB = 0, spurVao = null, spurPuffer = null, bildB = 0, bildH = 0;
if (gl) {
  halbFloat = !!gl.getExtension('EXT_color_buffer_float');
  gl.getExtension('OES_texture_half_float_linear');
  try {
    for (const [n, fs] of Object.entries({ kopie: FS_KOPIE, klein: FS_KLEIN, flut: FS_FLUT, matte: FS_MATTE, mklein: FS_MKLEIN, szene: FS_SZENE,
      feder: FS_FEDER, schrei: FS_SCHREI, maske: FS_MASKE, tensor: FS_TENSOR, fleisch: FS_FLEISCH, hell: FS_HELL, weich: FS_WEICH, zusammen: FS_ZUSAMMEN, silh: FS_SILH })) P[n] = programm(fs);
    P.spur = programm(FS_SPUR, VS_SPUR);
  } catch (e) { spur('Shader: ' + String(e.message).slice(0, 140)); console.error(e); melden(TEXTE[sprache].keinGL); }
  const buf = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
  gl.enableVertexAttribArray(0); gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
  if (P.spur) {
    spurVao = gl.createVertexArray(); gl.bindVertexArray(spurVao);
    gl.bindBuffer(gl.ARRAY_BUFFER, buf); gl.enableVertexAttribArray(0); gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
    spurPuffer = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, spurPuffer);
    gl.bufferData(gl.ARRAY_BUFFER, SPUR_MAX * 16, gl.DYNAMIC_DRAW);
    const lAB = gl.getAttribLocation(P.spur, 'iAB');
    gl.enableVertexAttribArray(lAB); gl.vertexAttribPointer(lAB, 4, gl.FLOAT, false, 16, 0); gl.vertexAttribDivisor(lAB, 1);
    gl.bindVertexArray(null); gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  }
  spur('Grafik bereit' + (halbFloat ? '' : ' (8 Bit)'));
}

const scharf = document.createElement('canvas');
const sctx = scharf.getContext('2d', { alpha: false });
// eine winzige Kopie zum Lesen der Randfarben (die Palette des Grundes)
const probe = document.createElement('canvas');
const pctx = probe.getContext('2d', { alpha: false, willReadFrequently: true });

let aufloesung = 1, messung = [], letzteAnpassung = 0;
const FEST = Q.has('fest');
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
const seitenMass = (lang) => { const s = fotoRahmen.b / fotoRahmen.h; return s >= 1 ? [lang, Math.round(lang / s)] : [Math.round(lang * s), lang]; };
function texParam(filter = gl.LINEAR, min = filter) {
  for (const [k, w] of [[gl.TEXTURE_MIN_FILTER, min], [gl.TEXTURE_MAG_FILTER, filter], [gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE], [gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE]]) gl.texParameteri(gl.TEXTURE_2D, k, w);
}
let flutLeeren = true, federLeeren = true, fleischLeeren = true;
function groesse() {
  const dpr = Math.min(devicePixelRatio || 1, MAX_DPR) * aufloesung;
  const b = Math.round(fotoRahmen.b * dpr), hh = Math.round(fotoRahmen.h * dpr);
  if (leinwand.width !== b || leinwand.height !== hh) { leinwand.width = b; leinwand.height = hh; }
  if (!gl) return;
  const lang = Math.min(SCHARF_SEITE, Math.max(ARBEIT, Math.round(Math.max(fotoRahmen.b, fotoRahmen.h) * Math.min(devicePixelRatio || 1, 2))));
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
    zielBauen('arbeit', ab, ah, false); paar('matte', ab, ah, false);
    const [tb, th] = seitenMass(Math.round(ARBEIT / 2)); zielBauen('tensor', tb, th); zielBauen('tensorB', tb, th); zielBauen('glatt', tb, th, false); zielBauen('glattB', tb, th, false);
    zielBauen('mklein', 24, Math.max(8, Math.round(24 * ah / ab)), false);
  }
  const [kb, kh] = seitenMass(KLEIN);
  if (kb !== kleinB || kh !== kleinH) { kleinB = kb; kleinH = kh; zielBauen('klein', kb, kh, false); paar('flut', kb, kh, false); flutLeeren = true;
    probe.width = Math.max(24, Math.round(kb / 2)); probe.height = Math.max(24, Math.round(kh / 2)); }
  const [fb, fh] = seitenMass(FEDER_SEITE);
  if (fb !== federB || fh !== federH) { federB = fb; federH = fh; paar('feder', fb, fh); federLeeren = true; }
  const [mb, mh] = seitenMass(FLEISCH_SEITE);
  if (mb !== fleischB || mh !== fleischH) { fleischB = mb; fleischH = mh; paar('fleisch', mb, mh); fleischLeeren = true; }
  // Rauschen für die Fasern, so fein wie der Bildschirm (etwas gröber, damit die Fasern glatt sind)
  const fdpr = Math.min(devicePixelRatio || 1, MAX_DPR);
  const nb = Math.round(fotoRahmen.b * fdpr), nh = Math.round(fotoRahmen.h * fdpr);
  if (nb !== bildB || nh !== bildH) {
    bildB = nb; bildH = nh;
    const rb = Math.max(64, Math.round(nb / 1.5)), rh = Math.max(64, Math.round(nh / 1.5));
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

// ---------- Quellen (wie im Diagramm) ----------
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
  quelle = videoEl; spiegelnQuelle = echt ? echt === 'user' : zahl < 2; neueQuelle(); starten();
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
  videoEl.play().then(() => { quelle = videoEl; spiegelnQuelle = false; neueQuelle(); starten(); }).catch(() => { spur('Video unlesbar'); melden(dateiMeldung(sprache, 'video')); });
}

// Beispiele: Christians Porträt «Wan, Pendel» und «Infinite Mantra» (liegen beim Kristall); jedes Tippen nimmt das nächste
const BEISPIELE = ['../kristall/beispiel.mp4?v=2', '../kristall/mantra.mp4?v=1'];
function beispielStarten(e) {
  let nr = 0;
  try { nr = e ? (+(localStorage.getItem('figur.beispiel') || 0)) % BEISPIELE.length : 0; localStorage.setItem('figur.beispiel', String(nr + 1)); } catch {}
  spur('Beispiel ' + (nr + 1));
  const alt = videoEl.srcObject; if (alt) alt.getTracks().forEach((t) => t.stop());
  videoEl.srcObject = null; $('wenden').hidden = true; videoFrei(); videoEl.src = BEISPIELE[nr];
  videoEl.play().then(() => { quelle = videoEl; spiegelnQuelle = false; neueQuelle(); starten(); })
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
  const b = scharfB || 960, h = scharfH || Math.round(960 * fotoRahmen.h / Math.max(fotoRahmen.b, 1));
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
  $('wenden').hidden = true; quelle = fotoBuehne; spiegelnQuelle = false; fotoStart = performance.now() / 1000; neueQuelle(); starten();
}
// Bei Fotos fährt die Kamera nur sanft, damit die Figur im Rund bleibt
function fotoMalen(t) {
  fotoBuehneGroesse();
  fotosMalen(fotoBuehne.getContext('2d'), fotos, fotoBuehne.width, fotoBuehne.height, t - fotoStart,
    { dauer: FOTO_DAUER, blende: FOTO_BLENDE, art: 'still', mix: fahrt.schritt(t) });
}
// Fahrt durch das Foto an und aus (feines Zeichen unten rechts, nur bei Fotos); zuerst ruhig, das ganze Foto
const fahrtKnopf = document.createElement('button');
fahrtKnopf.className = 'fahrt'; fahrtKnopf.hidden = true; fahrtKnopf.innerHTML = FAHRT_SVG;
$('wenden').after(fahrtKnopf);
const fahrt = fahrtSchalter(fahrtKnopf, false);
function fahrtSehen() {
  const weg = quelle !== fotoBuehne; if (fahrtKnopf.hidden !== weg) fahrtKnopf.hidden = weg;
  // bei Fotos nimmt die Bühne das Format des ersten Fotos an (rahmen in gemeinsam/fotos.js)
  rahmenSetzen(leinwand, !weg && fotos.length ? fotos[0].width / fotos[0].height : 0);
}

let rahmen = [0, 0, 1, 1];   // wo das Bild steht, in Anteilen der Leinwand (y nach oben)
function malenIn(ctx, B, H) {
  const q = quelle; if (!q) return false;
  const qb = q.videoWidth || q.width, qh = q.videoHeight || q.height;
  if (!qb || !qh) return false;
  ctx.save();
  if (spiegelnQuelle) { ctx.translate(B, 0); ctx.scale(-1, 1); }
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
  const qz = quelle === videoEl && !videoEl.srcObject ? videoEl.currentTime : -2;
  neuesBild = qz === -2 || qz !== letzteQuellzeit; letzteQuellzeit = qz;
  return true;
}

// ---------- Palette des Grundes: die Farben am Rand (oben, links, rechts), in acht Gruppen ----------
const palette = new Float32Array(24); let paletteDa = false;
function paletteLesen() {
  const W = probe.width, H = probe.height;
  pctx.drawImage(scharf, 0, 0, W, H);
  let d; try { d = pctx.getImageData(0, 0, W, H).data; } catch { return; }
  const x0 = Math.floor(rahmen[0] * W) + 1, x1 = Math.ceil(rahmen[2] * W) - 2;
  const y0 = Math.floor((1 - rahmen[3]) * H) + 1, y1 = Math.ceil((1 - rahmen[1]) * H) - 2;   // Leinwand: y nach unten
  const L = (x, y) => { const i = (y * W + x) * 4; return [d[i] / 255, d[i + 1] / 255, d[i + 2] / 255]; };
  // Grund ist flach: nur Stellen nehmen, die sich von ihren Nachbarn kaum unterscheiden (Haar und Mosaik fallen weg)
  const flach = (x, y) => {
    const c = L(x, y); let m = 0;
    for (const [a, b] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const xx = Math.min(x1, Math.max(x0, x + a)), yy = Math.min(y1, Math.max(y0, y + b)), n = L(xx, yy);
      m = Math.max(m, Math.abs(n[0] - c[0]) + Math.abs(n[1] - c[1]) + Math.abs(n[2] - c[2]));
    }
    return m;
  };
  const alle = [], ruhig = [];
  const nimm = (x, y) => { const c = L(x, y); alle.push(c); if (flach(x, y) < 0.09) ruhig.push(c); };
  for (let x = x0; x <= x1; x++) { nimm(x, y0); nimm(x, y0 + 1); nimm(x, y0 + 2); }
  const unten = Math.round(y0 + (y1 - y0) * 0.78);   // unten steht oft der Körper: dort nicht
  for (let y = y0 + 2; y <= unten; y++) { nimm(x0, y); nimm(x0 + 1, y); nimm(x1, y); nimm(x1 - 1, y); }
  const pts = ruhig.length >= alle.length * 0.12 ? ruhig : alle;
  if (pts.length < 8) return;
  // k-Mittel, acht Gruppen, gleichmässig über den Rand verteilt begonnen
  const K = 8, z = [], zahl = new Array(K).fill(0);
  for (let k = 0; k < K; k++) z.push(pts[Math.floor((k + 0.5) * pts.length / K)].slice());
  for (let it = 0; it < 6; it++) {
    const s = z.map(() => [0, 0, 0, 0]);
    for (const p of pts) {
      let best = 0, bd = 9;
      for (let k = 0; k < K; k++) { const a = p[0] - z[k][0], b = p[1] - z[k][1], c = p[2] - z[k][2], dd = a * a + b * b + c * c; if (dd < bd) { bd = dd; best = k; } }
      const t = s[best]; t[0] += p[0]; t[1] += p[1]; t[2] += p[2]; t[3]++;
    }
    for (let k = 0; k < K; k++) { zahl[k] = s[k][3]; if (s[k][3]) z[k] = [s[k][0] / s[k][3], s[k][1] / s[k][3], s[k][2] / s[k][3]]; }
  }
  // seltene Farben am Rand sind eher angeschnittene Figur als Grund: sie fallen weg (weit weg gesetzt)
  const a = paletteDa ? 0.35 : 1;
  for (let k = 0; k < K; k++) {
    const weg = zahl[k] < pts.length * 0.06;
    for (let j = 0; j < 3; j++) { const ziel = weg ? 5 : z[k][j]; palette[k * 3 + j] = weg || palette[k * 3 + j] > 4 ? ziel : palette[k * 3 + j] + (ziel - palette[k * 3 + j]) * a; }
  }
  paletteDa = true;
}
function neueQuelle() { paletteDa = false; flutLeeren = true; }

// ---------- Regler und Lesarten ----------
// Je Lesart drei Regler mit eigenem Sinn; die Werte bleiben je Lesart erhalten.
const WERTE = [[0, 0.38, 0.6], [0.55, 0.35, 0.5], [0.62, 0.45, 0.6]];
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
  // das Rund bleibt, die Kräfte und das Fleisch beginnen neu
  if (war !== nr) { federLeeren = true; fleischLeeren = true; spurPunkte = []; }
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

// ---------- Bacons Flächen: fünf Paletten, der Regler gleitet zwischen ihnen ----------
// [Fläche, Rund, Schatten, Linie], sRGB. Nach Three Studies for Figures at the Base of a Crucifixion (Orange), den rosa
// und violetten Gründen der Bildnisse um 1970, dem Grün der Studien um 1971 und dem Nachtblau der späten Triptychen.
const PALETTEN = [
  [[0.89, 0.45, 0.16], [0.55, 0.15, 0.09], [0.12, 0.05, 0.035], [0.97, 0.91, 0.80]],
  [[0.87, 0.58, 0.61], [0.26, 0.31, 0.42], [0.09, 0.07, 0.10], [0.98, 0.94, 0.90]],
  [[0.43, 0.30, 0.55], [0.80, 0.39, 0.24], [0.06, 0.04, 0.08], [0.96, 0.89, 0.76]],
  [[0.31, 0.50, 0.37], [0.86, 0.70, 0.48], [0.04, 0.08, 0.06], [0.96, 0.93, 0.85]],
  [[0.13, 0.20, 0.36], [0.82, 0.43, 0.18], [0.02, 0.03, 0.06], [0.94, 0.89, 0.80]]
];
function farben(w) {
  const x = Math.max(0, Math.min(0.9999, w)) * (PALETTEN.length - 1), i = Math.floor(x), f = x - i, s = f * f * (3 - 2 * f);
  return PALETTEN[i].map((c, k) => c.map((a, j) => a + (PALETTEN[i + 1][k][j] - a) * s));
}

// ---------- das Rund ----------
// In Bildhöhen (x mal Seitenverhältnis): Mitte, Halbachsen, Winkel. Gezogen: eine Ellipse, die zur Spur passt.
let ring = null, ringZiel = null, ringZug = 0, flut = 0, ringSeit = 0, loesen = false, loesenGezeigt = false, loesenHinweisDa = false;
// das Rund lösen: die Linie zeichnet sich zurück, die Fläche zieht sich an den Rand, das Fleisch vergeht, die Kräfte lassen los
function rundLoesen() {
  if (!ring || loesen) return;
  loesen = true; spurPunkte = []; spurAlpha = 0;
  loesenZeigen();
  spur('Rund lösen');
}
function loesenZeigen() {
  const da = !!ring && !loesen;
  if (da === loesenGezeigt) return;
  loesenGezeigt = da; $('loesen').hidden = !da;
  // beim ersten Rund einmal sagen, wo es wieder aufgeht
  if (da && !loesenHinweisDa) {
    loesenHinweisDa = true;
    setTimeout(() => { if (!ring || loesen || finger.size) return; const g = $('geste'); g.textContent = TEXTE[sprache].loesenHinweis; g.hidden = false; g.classList.remove('weg'); clearTimeout(titelUhr); titelUhr = setTimeout(() => g.classList.add('weg'), 3200); }, 3400);
  }
}
function ringSetzen(r, zeichnen = true) {
  if (loesen) { loesen = false; ring = null; }
  if (!ring) { ring = { ...r }; flut = 0; }
  ringZiel = { ...r };
  if (zeichnen) ringZug = 0;
  ringSeit = performance.now() / 1000;
  klangRund();
  loesenZeigen();
  spur('Rund gesetzt');
}
function ellipseAus(punkte) {
  // gleichmässig entlang der Spur neu verteilen, sonst zählen langsame Stellen mehr
  const qs = punkte.map(([x, y]) => [x / fotoRahmen.h, 1 - y / fotoRahmen.h]);
  let L = 0; const acc = [0];
  for (let i = 1; i < qs.length; i++) { L += Math.hypot(qs[i][0] - qs[i - 1][0], qs[i][1] - qs[i - 1][1]); acc.push(L); }
  const n = 72, pts = [];
  for (let k = 0, j = 0; k < n; k++) {
    const s = (k / (n - 1)) * L; while (j < acc.length - 2 && acc[j + 1] < s) j++;
    const t = (s - acc[j]) / Math.max(1e-9, acc[j + 1] - acc[j]);
    pts.push([qs[j][0] + (qs[j + 1][0] - qs[j][0]) * t, qs[j][1] + (qs[j + 1][1] - qs[j][1]) * t]);
  }
  let mx = 0, my = 0; for (const p of pts) { mx += p[0]; my += p[1]; } mx /= n; my /= n;
  let a = 0, b = 0, c = 0; for (const p of pts) { const dx = p[0] - mx, dy = p[1] - my; a += dx * dx; b += dx * dy; c += dy * dy; } a /= n; b /= n; c /= n;
  const m = (a + c) / 2, d = Math.sqrt(((a - c) / 2) ** 2 + b * b);
  const l1 = m + d, l2 = Math.max(m - d, 1e-6), w = 0.5 * Math.atan2(2 * b, a - c);
  // ist die Spur nicht geschlossen, reicht ihr Umfang nicht: etwas grösser
  const zu = Math.hypot(pts[0][0] - pts[n - 1][0], pts[0][1] - pts[n - 1][1]) / Math.max(L, 1e-6);
  const k = 1 + 0.5 * Math.min(1, zu * 2.2);
  let rx = Math.sqrt(2 * l1) * k, ry = Math.sqrt(2 * l2) * k;
  rx = Math.min(0.95, Math.max(0.07, rx)); ry = Math.min(0.95, Math.max(0.06, ry));
  // Anfang und Richtung, damit die Linie sich dort zu zeichnen beginnt, wo der Daumen begann
  const cs = Math.cos(w), sn = Math.sin(w);
  const e0 = [(cs * (pts[0][0] - mx) + sn * (pts[0][1] - my)) / rx, (-sn * (pts[0][0] - mx) + cs * (pts[0][1] - my)) / ry];
  let flaeche = 0; for (let i = 1; i < n; i++) flaeche += (pts[i - 1][0] - mx) * (pts[i][1] - my) - (pts[i][0] - mx) * (pts[i - 1][1] - my);
  return { cx: mx, cy: my, rx, ry, w, start: Math.atan2(e0[1], e0[0]), dir: flaeche >= 0 ? 1 : -1 };
}
// das Rund von selbst: um die Figur, aus Mitte und Streuung der Matte
function ringVonSelbst(nahe) {
  const z = ziele.mklein, s = fotoRahmen.b / fotoRahmen.h;
  let r = { cx: s * 0.5, cy: 0.56, rx: Math.min(0.42 * s, 0.32), ry: 0.34, w: 0 };
  if (z && P.mklein) {
    rechne(P.mklein, z, { uM: ziele.matte.lesen() });
    const px = new Uint8Array(z.b * z.h * 4);
    gl.bindFramebuffer(gl.FRAMEBUFFER, z.fb); gl.readPixels(0, 0, z.b, z.h, gl.RGBA, gl.UNSIGNED_BYTE, px); gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    let S = 0, mx = 0, my = 0;
    for (let y = 0; y < z.h; y++) for (let x = 0; x < z.b; x++) { const w = px[(y * z.b + x) * 4] / 255; const qx = (x + 0.5) / z.b * s, qy = (y + 0.5) / z.h; S += w; mx += w * qx; my += w * qy; }
    if (S > z.b * z.h * 0.03) {
      mx /= S; my /= S;
      let a = 0, c = 0;
      for (let y = 0; y < z.h; y++) for (let x = 0; x < z.b; x++) { const w = px[(y * z.b + x) * 4] / 255; const dx = (x + 0.5) / z.b * s - mx, dy = (y + 0.5) / z.h - my; a += w * dx * dx; c += w * dy * dy; }
      a /= S; c /= S;
      // etwas nach oben: der Kopf, nicht die Schultern
      r = { cx: mx, cy: Math.min(0.8, my + Math.sqrt(c) * 0.3), rx: Math.min(0.36 * s, Math.max(0.12, Math.sqrt(a) * 1.6)), ry: Math.min(0.3, Math.max(0.14, Math.sqrt(c) * 1.4)), w: 0 };
    }
  }
  if (nahe) { r.cx = r.cx * 0.6 + nahe.x * s * 0.4; r.cy = r.cy * 0.6 + nahe.y * 0.4; }
  r.start = Math.PI / 2; r.dir = -1;
  return r;
}

// ---------- Hände ----------
const finger = new Map();
const aufLeinwand = (cx, cy) => ({ x: cx / fotoRahmen.b, y: 1 - cy / fotoRahmen.h });
let samen = 0;
function fingerNeu(cx, cy) {
  samen++;
  return { x: cx, y: cy, x0: cx, y0: cy, lx: cx, ly: cy, bewegt: 0, ruhe: 0, halt: 0, same: (samen * 37.17) % 97, dreh: samen % 2 ? 1 : -1, tempo: 0, zeit: 0 };
}
let spurPunkte = [], spurAlpha = 0;
const stempel = new Float32Array(16 * 4), stempelR = new Float32Array(16 * 4); let stempelN = 0;
function stempeln(x0, y0, x, y, r, menge, same) {
  if (stempelN < 16) { stempel.set([x0, y0, x, y], stempelN * 4); stempelR.set([r, menge, 0, same], stempelN * 4); stempelN++; }
  else { const k = 15 * 4; stempel[k + 2] = x; stempel[k + 3] = y; }
}

leinwand.addEventListener('pointerdown', (e) => {
  const f = fingerNeu((e.clientX - fotoRahmen.x), (e.clientY - fotoRahmen.y));
  finger.set(e.pointerId, f);
  leinwand.setPointerCapture(e.pointerId); $('geste').classList.add('weg');
  haltZeigen((e.clientX - fotoRahmen.x), (e.clientY - fotoRahmen.y));
  geisterStart = -1; finger.delete('geist');
  if (lesart === 0 && finger.size === 1) { spurPunkte = [[(e.clientX - fotoRahmen.x), (e.clientY - fotoRahmen.y)]]; spurAlpha = 1; }
  // Schrei und Fleisch brauchen eine Figur im Rund: fehlt es, legt die Seite es von selbst um die Figur
  if (lesart > 0 && !ring) ringSetzen(ringVonSelbst(aufLeinwand((e.clientX - fotoRahmen.x), (e.clientY - fotoRahmen.y))), true);
  glosse(['rond', 'cri', 'viande'][lesart]);
});
leinwand.addEventListener('pointermove', (e) => {
  const f = finger.get(e.pointerId); if (!f) return;
  f.bewegt += Math.hypot((e.clientX - fotoRahmen.x) - f.x, (e.clientY - fotoRahmen.y) - f.y);
  f.x = (e.clientX - fotoRahmen.x); f.y = (e.clientY - fotoRahmen.y);
  haltZeigen((e.clientX - fotoRahmen.x), (e.clientY - fotoRahmen.y));
  if (lesart === 0 && spurPunkte.length && finger.size === 1) {
    const l = spurPunkte[spurPunkte.length - 1];
    if (Math.hypot((e.clientX - fotoRahmen.x) - l[0], (e.clientY - fotoRahmen.y) - l[1]) > 1.5 && spurPunkte.length < SPUR_MAX) spurPunkte.push([(e.clientX - fotoRahmen.x), (e.clientY - fotoRahmen.y)]);
  }
});
let nachUhr = 0;
const loslassen = (e) => {
  const f = finger.get(e.pointerId);
  finger.delete(e.pointerId);
  if (finger.size === 0) $('halt').classList.remove('da');
  if (lesart === 0 && f) rundAusSpur(f);
  clearTimeout(nachUhr);
  if (lesart === 0) nachUhr = setTimeout(() => { if (!finger.size && lesart === 0 && ring) glosse('aplat'); }, 2400);
  if (lesart === 1) nachUhr = setTimeout(() => { if (!finger.size && lesart === 1) glosse('fuite'); }, 2000);
  if (lesart === 2) nachUhr = setTimeout(() => { if (!finger.size && lesart === 2) glosse('pitie'); }, 2600);
};
leinwand.addEventListener('pointerup', loslassen);
leinwand.addEventListener('pointercancel', loslassen);
function rundAusSpur(f) {
  const p = spurPunkte; spurPunkte = [];
  let L = 0; for (let i = 1; i < p.length; i++) L += Math.hypot(p[i][0] - p[i - 1][0], p[i][1] - p[i - 1][1]);
  if (p.length >= 8 && L > fotoRahmen.h * 0.22) { if (ring) glosse('elements'); ringSetzen(ellipseAus(p)); spurAus = p; spurAlpha = 1; }
  // nur getippt: das Rund von selbst, um die Figur nahe der Stelle
  else if (L < 24) ringSetzen(ringVonSelbst(aufLeinwand(f.x, f.y)));
}
let spurAus = null;

// je Bild: was die Hände seit dem letzten Bild getan haben
let tempoHand = 0, haltMax = 0, menge = 0, schreiEnergie = 0, vorhang = 0;
const fa = new Float32Array(16), fb = new Float32Array(16), mund = new Float32Array(16); let fn = 0;
function haende(t, dt) {
  const W = WERTE[lesart], s = fotoRahmen.b / fotoRahmen.h;
  let tempoMax = 0, hm = 0;
  fn = 0;
  for (const f of finger.values()) {
    const a = aufLeinwand(f.lx, f.ly), b = aufLeinwand(f.x, f.y);
    const px = Math.hypot(f.x - f.lx, f.y - f.ly), tempo = px / fotoRahmen.h / dt;
    f.tempo += (tempo - f.tempo) * (1 - Math.exp(-dt / 0.1)); tempoMax = Math.max(tempoMax, f.tempo);
    f.zeit += dt;
    if (px > 2.5) f.ruhe = 0; else f.ruhe += dt;
    if (lesart === 1) {
      // halten öffnet den Mund, ziehen schliesst ihn langsam wieder
      const ziel = f.ruhe > 0.25 ? 1 : 0;
      f.halt += (ziel - f.halt) * (1 - Math.exp(-dt / (ziel ? 1.3 / (0.4 + W[0]) : 0.5)));
      hm = Math.max(hm, f.halt);
      if (fn < 4) {
        const a0 = aufLeinwand(f.x0, f.y0);
        fa.set([a0.x * s, a0.y, b.x * s, b.y], fn * 4);
        fb.set([f.halt * (0.5 + W[0]), 0.1 + 0.08 * W[0], 1, f.dreh], fn * 4);
        mund.set([b.x * s, b.y, f.halt * (0.035 + 0.05 * W[0]), 0], fn * 4);
        fn++;
      }
    } else if (lesart === 2) {
      if (px > 0.3 || f.ruhe < 0.05) stempeln(a.x, a.y, b.x, b.y, 0.05 + 0.025 * W[1], 0.55 + 0.45 * W[0] + Math.min(0.4, f.zeit * 0.2), f.same);
      if (f.ruhe > 0.2) stempeln(b.x, b.y, b.x, b.y, (0.05 + 0.025 * W[1]) * (1 + Math.min(1.2, (f.ruhe - 0.2) * 0.5)), 1, f.same);
    }
    f.lx = f.x; f.ly = f.y;
  }
  tempoHand = tempoMax; haltMax = hm;
  menge = finger.size ? Math.max(hm, Math.min(1, menge + dt * tempoMax * 0.5)) : Math.max(0, menge - dt * 0.5);
  schreiEnergie += ((lesart === 1 ? hm : 0) - schreiEnergie) * (1 - Math.exp(-dt / 0.35));
  vorhang = Math.max(vorhang * Math.exp(-dt / 1.6), schreiEnergie);
}

// Nur im Vorspann führt eine unsichtbare Hand; sonst beginnt alles erst mit der Berührung (Christian, 19.11.2026)
const VORSPANN = Q.has('vorspann');
let geisterStart = -1, geistRingGesetzt = false;
function geist(t) {
  if (geisterStart < 0 || t < geisterStart) return;
  const u = t - geisterStart;
  // ein Oval um den Kopf ziehen, in 2,2 Sekunden
  if (u < 2.2 && !geistRingGesetzt) {
    const s = fotoRahmen.b / fotoRahmen.h, k = u / 2.2, e = k * k * (3 - 2 * k);
    const w = Math.PI * 0.5 + e * Math.PI * 2.08;
    const cx = (0.5 * s + Math.cos(w) * 0.27) * fotoRahmen.h, cy = (1 - (0.56 + Math.sin(w) * 0.33)) * fotoRahmen.h;
    if (!spurPunkte.length) spurAlpha = 1;
    spurPunkte.push([cx, cy]);
  } else if (!geistRingGesetzt) { geistRingGesetzt = true; rundAusSpur({ x: 0, y: 0 }); }
  // danach gleitet die Fläche durch Bacons Farben, in zwölf Sekunden einmal hin und zurück
  if (u > 5) WERTE[0][0] = 0.5 - 0.5 * Math.cos((u - 5) / 12 * Math.PI * 2);
}

// ---------- Daumen: wo auflegen, und ein Ring, der sich füllt ----------
let daumenGelernt = false, haltZeit = 0;
function haltZeigen(x, y) { const h = $('halt'); h.style.left = (x + fotoRahmen.x) + 'px'; h.style.top = (y + fotoRahmen.y) + 'px'; h.classList.add('da'); }
function haltBild(dt) {
  if (finger.size) haltZeit += dt; else haltZeit = 0;
  $('halt-voll').style.strokeDashoffset = String(1 - Math.min(1, lesart === 0 ? ringZug : menge));
  const gezogen = [...finger.values()].some((f) => f.bewegt > 120);
  if (!daumenGelernt && (haltZeit > 1.2 || gezogen || ring)) { daumenGelernt = true; $('daumen').classList.add('weg'); setTimeout(() => { $('daumen').hidden = true; }, 800); }
}

// ---------- Geführter Einstieg: zuerst Bild und Finger, dann die Lesarten, dann die Regler, zuletzt die Tasten ----------
const EINSTIEG = 'figur.einstieg';
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
  einstiegUhr = setTimeout(einstiegWeiter, 12000);
}
leinwand.addEventListener('pointerup', () => { if (einstiegStufe === 0) { clearTimeout(einstiegUhr); einstiegUhr = setTimeout(einstiegWeiter, 3200); } });
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
$('loesen').addEventListener('click', rundLoesen);
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
  if (VORSPANN && geisterStart < 0) geisterStart = performance.now() / 1000 + 0.8;
  if (!laeuft && gl && P.szene) { laeuft = true; requestAnimationFrame(bild); }
}

// ---------- Schleife ----------
let standbildWunsch = false, ersterLauf = true, letzteMs = 0, bilderGezaehlt = 0, nr = 0, figurMitte = [0.5, 0.5];
function zielLeeren(z, wert = 0) { gl.bindFramebuffer(gl.FRAMEBUFFER, z.fb); gl.viewport(0, 0, z.b, z.h); gl.clearColor(wert, wert, wert, wert); gl.clear(gl.COLOR_BUFFER_BIT); }
const lerp = (a, b, k) => a + (b - a) * k;
function bild(ms) {
  const t = ms / 1000;
  fahrtSehen(); if (quelle === fotoBuehne) fotoMalen(performance.now() / 1000);
  const dtMs = ms - (letzteMs || ms - 16.7), dt = Math.min(0.1, Math.max(0.004, dtMs / 1000)); letzteMs = ms;
  tempoMessen(ms, dtMs);
  if (!scharfFangen()) { requestAnimationFrame(bild); return; }
  const seite = fotoRahmen.b / fotoRahmen.h, W = WERTE[lesart];
  nr++;
  if (!paletteDa || nr % 20 === 0) paletteLesen();

  if (geisterStart > 0) geist(t);
  haende(t, dt);

  // das Rund gleitet zu seinem Ziel, die Linie zeichnet sich, die Fläche flutet herein; beim Lösen alles rückwärts
  if (loesen && ring) {
    ringZug = Math.max(0, ringZug - dt / 0.8);
    flut = Math.max(0, flut - dt / 1.3);
    if (flut <= 0 && ringZug <= 0) { ring = null; ringZiel = null; loesen = false; federLeeren = true; fleischLeeren = true; loesenZeigen(); spur('Rund gelöst'); }
  } else if (ringZiel) {
    const k = 1 - Math.exp(-dt / 0.18);
    for (const n of ['cx', 'cy', 'rx', 'ry']) ring[n] = lerp(ring[n], ringZiel[n], k);
    let dw = ringZiel.w - ring.w; while (dw > Math.PI / 2) dw -= Math.PI; while (dw < -Math.PI / 2) dw += Math.PI;
    ring.w += dw * k; ring.start = ringZiel.start; ring.dir = ringZiel.dir;
    ringZug = Math.min(1, ringZug + dt / 0.9);
    flut = Math.min(1, flut + dt / 2.2);
  }
  spurAlpha = Math.max(0, spurAlpha - (spurPunkte.length && finger.size ? 0 : dt / 0.7));

  // 1. die Gegenwart in Arbeitsgrösse und klein, dann die Flutung des Grundes, dann die Matte
  const A = ziele.arbeit, K = ziele.klein, F = ziele.flut, M = ziele.matte;
  if (neuesBild) {
    rechne(P.kopie, A, { uQ: scharfTex });
    rechne(P.klein, K, { uQ: A }, (u) => gl.uniform2f(u.uPx, 1 / kleinB, 1 / kleinH));
  }
  if (flutLeeren) { zielLeeren(F.lesen()); zielLeeren(F.schreiben()); zielLeeren(M.lesen()); zielLeeren(M.schreiben()); flutLeeren = false; }
  const sigma = 0.035 + 0.1 * WERTE[0][1];   // Kontur: wie scharf die Figur aus ihrem Grund geschnitten wird
  const ringU = ring ? [ring.cx, ring.cy, ring.rx, ring.ry] : [0, 0, 1, 1];
  for (let i = 0; i < FLUT_SCHRITTE; i++) {
    rechne(P.flut, F.schreiben(), { uK: K, uAlt: F.lesen() }, (u) => {
      gl.uniform2f(u.uPx, 1 / kleinB, 1 / kleinH); gl.uniform3fv(u.uPal, palette); gl.uniform1f(u.uSchritt, [1, 2, 1, 3, 1, 2, 1][i % 7]);
      gl.uniform1f(u.uSeite, seite); gl.uniform1f(u.uSigma, sigma); gl.uniform4f(u.uRahmen, ...rahmen);
      gl.uniform4f(u.uRing, ...ringU); gl.uniform1f(u.uRingWink, ring ? ring.w : 0); gl.uniform1f(u.uRingDa, ring && flut > 0.3 ? 1 : 0);
    });
    F.tauschen();
  }
  rechne(P.matte, M.schreiben(), { uQ: A, uB: F.lesen(), uAlt: M.lesen() }, (u) => {
    gl.uniform3fv(u.uPal, palette); gl.uniform1f(u.uSigma, sigma); gl.uniform1f(u.uNeu, nr < 4 ? 1 : 0.5); gl.uniform2f(u.uPxB, 1.2 / kleinB, 1.2 / kleinH);
  });
  M.tauschen();

  // 2. Figur, Rund und Fläche
  const sz = zielBauen('szene', leinwand.width, leinwand.height, false);
  const W0 = WERTE[0], [cA, cR, cO, cL] = farben(W0[0]);
  const rmax = ring ? Math.max(...[[0, 0], [seite, 0], [0, 1], [seite, 1]].map(([x, y]) => {
    const dx = x - ring.cx, dy = y - ring.cy, cs = Math.cos(ring.w), sn = Math.sin(ring.w);
    return Math.hypot((cs * dx + sn * dy) / ring.rx, (-sn * dx + cs * dy) / ring.ry);
  })) : 2;
  const fE = flut * flut * (3 - 2 * flut);
  // 1b. die Silhouette im Rund, zweimal weich: nah (S1) und weit (S2), Quelle des Schattens
  const sb = Math.max(32, Math.round(arbeitB / 3)), sh = Math.max(32, Math.round(arbeitH / 3));
  const S1 = zielBauen('sch1', sb, sh), S2 = zielBauen('sch2', sb, sh), SB = zielBauen('schB', sb, sh);
  if (ring) {
    rechne(P.silh, S1, { uM: M.lesen() }, (u) => { gl.uniform4f(u.uRing, ...ringU); gl.uniform1f(u.uRingWink, ring.w); gl.uniform1f(u.uSeite, seite); gl.uniform1f(u.uFlut, Math.min(1, flut * 1.4)); });
    const falten = (Z, schritt, mal) => { for (let i = 0; i < mal; i++) {
      rechne(P.weich, SB, { uQ: Z }, (u) => gl.uniform2f(u.uRichtung, schritt / sb, 0));
      rechne(P.weich, Z, { uQ: SB }, (u) => gl.uniform2f(u.uRichtung, 0, schritt / sh));
    } };
    rechne(P.kopie, S2, { uQ: S1 });
    falten(S1, 1, 2);
    falten(S2, 1, 1); falten(S2, 2, 1); falten(S2, 3, 2);
  }
  rechne(P.szene, sz, { uScharf: scharfTex, uM: M.lesen(), uB: F.lesen(), uS1: S1, uS2: S2 }, (u) => {
    gl.uniform2f(u.uPxS, 1 / sz.b, 1 / sz.h); gl.uniform1f(u.uSeite, seite); gl.uniform1f(u.uT, t % 1000); gl.uniform1f(u.uHpx, sz.h);
    gl.uniform4f(u.uRing, ...ringU); gl.uniform1f(u.uRingWink, ring ? ring.w : 0); gl.uniform1f(u.uRingStart, ring ? ring.start : 0); gl.uniform1f(u.uRingDir, ring ? ring.dir : 1);
    gl.uniform1f(u.uRingZug, ring ? ringZug : 0); gl.uniform1f(u.uFlut, ring ? fE : 0); gl.uniform1f(u.uRund, ring ? Math.max(0, Math.min(1, (flut - 0.3) / 0.7)) : 0); gl.uniform1f(u.uRmax, rmax);
    gl.uniform3f(u.uAplat, ...cA); gl.uniform3f(u.uRond, ...cR); gl.uniform3f(u.uOmbre, ...cO); gl.uniform3f(u.uLigne, ...cL);
    gl.uniform1f(u.uKontur, W0[1]); gl.uniform1f(u.uSchatten, W0[2]); gl.uniform1f(u.uFigur, ring ? fE : 0);
  });
  let fertig = sz;

  if (lesart === 1) {
    // 3b. Schrei: die Feder des Körpers, dann das verformte Bild
    const Fd = ziele.feder;
    if (federLeeren) { zielLeeren(Fd.lesen()); zielLeeren(Fd.schreiben()); federLeeren = false; }
    const k = 18 + 140 * W[2], spas = (finger.size || schreiEnergie > 0.02 || ring) ? W[1] * 0.07 * (Math.sin(t * 9.3) * 0.6 + Math.sin(t * 23.1 + 1.3) * 0.4) * (0.25 + 0.75 * Math.max(schreiEnergie, rauschenJs(t * 1.7))) : 0;
    if (ring) figurMitte = [ring.cx, ring.cy];
    const schritte = dt > 0.02 ? 2 : 1;
    for (let i = 0; i < schritte; i++) {
      rechne(P.feder, Fd.schreiben(), { uAlt: Fd.lesen(), uM: M.lesen() }, (u) => {
        gl.uniform4fv(u.uFa, fa); gl.uniform4fv(u.uFb, fb); gl.uniform1i(u.uN, fn); gl.uniform1f(u.uSeite, seite);
        gl.uniform1f(u.uDt, dt / schritte); gl.uniform1f(u.uK, k); gl.uniform1f(u.uDaempf, 2 * Math.sqrt(k) * 0.32); gl.uniform1f(u.uSpasmus, spas);
        gl.uniform2f(u.uMitte, ...figurMitte);
      });
      Fd.tauschen();
    }
    const s2 = zielBauen('szene2', leinwand.width, leinwand.height, false);
    rechne(P.schrei, s2, { uS: sz, uF: Fd.lesen() }, (u) => {
      gl.uniform1f(u.uSeite, seite); gl.uniform1f(u.uT, t % 1000); gl.uniform1f(u.uHpx, s2.h);
      gl.uniform4fv(u.uMund, mund); gl.uniform1i(u.uN, fn); gl.uniform1f(u.uVorhang, vorhang * (0.4 + 0.6 * W[0])); gl.uniform1f(u.uSchmier, 0.05 + 0.05 * W[0]);
    });
    fertig = s2;
  } else if (lesart === 2) {
    // 3c. Fleisch: Maske, Linien des Gesichts, dann das Fleisch
    const Fl = ziele.fleisch;
    if (fleischLeeren) { zielLeeren(Fl.lesen()); zielLeeren(Fl.schreiben()); fleischLeeren = false; }
    rechne(P.maske, Fl.schreiben(), { uAlt: Fl.lesen(), uM: M.lesen() }, (u) => {
      gl.uniform2f(u.uPx, 1 / fleischB, 1 / fleischH); gl.uniform4fv(u.uS, stempel); gl.uniform4fv(u.uSR, stempelR); gl.uniform1i(u.uN, stempelN);
      gl.uniform1f(u.uSeite, seite); gl.uniform1f(u.uAb, Math.exp(-dt / (loesen ? 0.5 : 240))); gl.uniform1f(u.uFrisch, Math.exp(-dt / 2.5)); gl.uniform1f(u.uDt, dt); gl.uniform1f(u.uStufe, halbFloat ? 0 : 1.2 / 255);
    });
    Fl.tauschen();
    if (neuesBild || nr < 3) {
      const T = ziele.tensor, TB = ziele.tensorB;
      rechne(P.tensor, T, { uQ: A }, (u) => gl.uniform2f(u.uPx, 1 / arbeitB, 1 / arbeitH));
      // dicht gefaltet (Abstand ein Punkt), sonst bleibt ein Raster in den Richtungen stehen
      for (let i = 0; i < 4; i++) {
        rechne(P.weich, TB, { uQ: T }, (u) => gl.uniform2f(u.uRichtung, 1 / T.b, 0));
        rechne(P.weich, T, { uQ: TB }, (u) => gl.uniform2f(u.uRichtung, 0, 1 / T.h));
      }
      // das Bild geglättet: Flächen von Fleisch statt Splitter
      const G = ziele.glatt, GB = ziele.glattB;
      rechne(P.weich, GB, { uQ: A }, (u) => gl.uniform2f(u.uRichtung, 1 / arbeitB, 0));
      rechne(P.weich, G, { uQ: GB }, (u) => gl.uniform2f(u.uRichtung, 0, 1 / arbeitH));
      for (let i = 0; i < 2; i++) {
        rechne(P.weich, GB, { uQ: G }, (u) => gl.uniform2f(u.uRichtung, 1 / G.b, 0));
        rechne(P.weich, G, { uQ: GB }, (u) => gl.uniform2f(u.uRichtung, 0, 1 / G.h));
      }
    }
    const s2 = zielBauen('szene2', leinwand.width, leinwand.height, false);
    rechne(P.fleisch, s2, { uS: sz, uM: M.lesen(), uFl: Fl.lesen(), uT: ziele.tensor, uR: rauschTex, uBild: ziele.glatt }, (u) => {
      gl.uniform2f(u.uPx, 1 / s2.b, 1 / s2.h); gl.uniform2f(u.uPxB, 1 / arbeitB, 1 / arbeitH); gl.uniform1f(u.uSeite, seite); gl.uniform1f(u.uZeit, t % 1000); gl.uniform1f(u.uHpx, s2.h);
      gl.uniform1f(u.uTiefe, W[0]); gl.uniform1f(u.uFasern, W[1]); gl.uniform1f(u.uNass, W[2]);
    });
    fertig = s2;
  }
  stempelN = 0;
  nachbearbeiten(t, fertig);
  spurZeichnen();
  haltBild(dt);
  klangBild({ lesart, tempo: tempoHand, finger: finger.size, halt: haltMax, schrei: schreiEnergie, flut: ring ? fE : 0, zeichnen: lesart === 0 && spurPunkte.length > 1 && finger.size > 0, werte: W, flaeche: W0[0], dt });
  if (standbildWunsch) { standbildWunsch = false; leinwand.toBlob((b) => b && zeigen(b, 'figur-' + zeitstempel() + '.png')); }
  if (ersterLauf && bilderGezaehlt++ > 2) { ersterLauf = false; spur('✓ läuft'); }
  requestAnimationFrame(bild);
}
// ein langsames Rauschen in JavaScript, für das Zucken des Spasmus
function rauschenJs(x) { const i = Math.floor(x), f = x - i, h = (n) => { const s = Math.sin(n * 127.1) * 43758.5453; return s - Math.floor(s); }; const u = f * f * (3 - 2 * f); return h(i) + (h(i + 1) - h(i)) * u; }

function spurZeichnen() {
  const p = spurPunkte.length > 1 ? spurPunkte : spurAus;
  if (!p || p.length < 2 || spurAlpha <= 0.01 || !spurVao) { if (spurAlpha <= 0.01) spurAus = null; return; }
  const n = Math.min(SPUR_MAX, p.length - 1), d = new Float32Array(n * 4);
  for (let i = 0; i < n; i++) d.set([p[i][0] / fotoRahmen.b, 1 - p[i][1] / fotoRahmen.h, p[i + 1][0] / fotoRahmen.b, 1 - p[i + 1][1] / fotoRahmen.h], i * 4);
  gl.bindFramebuffer(gl.FRAMEBUFFER, null); gl.viewport(0, 0, leinwand.width, leinwand.height);
  gl.useProgram(P.spur); gl.uniform2f(P.spur.u.uZiel, leinwand.width, leinwand.height);
  gl.uniform1f(P.spur.u.uBreite, Math.max(0.7, 0.9 * leinwand.height / Math.max(1, fotoRahmen.h))); gl.uniform1f(P.spur.u.uAlpha, spurAlpha);
  gl.bindVertexArray(spurVao);
  gl.bindBuffer(gl.ARRAY_BUFFER, spurPuffer); gl.bufferSubData(gl.ARRAY_BUFFER, 0, d);
  gl.enable(gl.BLEND); gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
  gl.drawArraysInstanced(gl.TRIANGLE_STRIP, 0, 4, n);
  gl.disable(gl.BLEND); gl.bindVertexArray(null);
}
function nachbearbeiten(t, sz) {
  const B = leinwand.width, H = leinwand.height, b4 = Math.max(1, Math.round(B / 4)), h4 = Math.max(1, Math.round(H / 4));
  const gA = zielBauen('glowA', b4, h4), gB = zielBauen('glowB', b4, h4);
  rechne(P.hell, gA, { uQ: sz }, (u) => { gl.uniform2f(u.uPx, 1.5 / B, 1.5 / H); gl.uniform1f(u.uAb, [0.78, 0.72, 0.7][lesart]); });
  rechne(P.weich, gB, { uQ: gA }, (u) => gl.uniform2f(u.uRichtung, 1.6 / b4, 0));
  rechne(P.weich, gA, { uQ: gB }, (u) => gl.uniform2f(u.uRichtung, 0, 1.6 / h4));
  rechne(P.zusammen, null, { uSzene: sz, uGlow: gA }, (u) => {
    gl.uniform2f(u.uPx, 1 / B, 1 / H); gl.uniform1f(u.uGlowStaerke, [0.16, 0.2, 0.28][lesart]);
    gl.uniform1f(u.uT, t % 100); gl.uniform1f(u.uKorn, [0.028, 0.03, 0.026][lesart]);
  });
}

// ---------- Ergebnis (wie im Diagramm) ----------
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
    zeigen(b, 'figur-' + zeitstempel() + (b.type.includes('mp4') ? '.mp4' : '.webm'));
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

// ---------- Glossen: einmal je Besuch von selbst, am Handy nur Begriff und Satz ----------
let glosseUhr = 0, glosseSchluessel = '';
const glosseGezeigt = new Set(), glosseDauer = () => (fotoRahmen.b <= 560 ? 4500 : 7000);
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

// ---------- ?spur: die Spur oben auf der Seite, mit einer Taste zum Kopieren ----------
if (Q.has('spur')) {
  const kasten = document.createElement('div');
  kasten.style.cssText = 'position:fixed;left:8px;right:8px;top:calc(max(16px, env(safe-area-inset-top)) + 44px);z-index:9;max-height:30vh;overflow:auto;padding:10px 12px;background:rgba(10,10,11,.92);border-left:2px solid #c8102e;font:12px/1.4 "Barlow Condensed",sans-serif;color:#f1eee6;white-space:pre-wrap';
  const text = document.createElement('div'), taste = document.createElement('button');
  taste.textContent = 'Spur kopieren';
  taste.style.cssText = 'margin-top:8px;padding:6px 0;background:none;border:0;color:#c8102e;font:inherit;letter-spacing:.18em;text-transform:uppercase;cursor:pointer';
  const inhalt = () => {
    let jetzt = []; try { jetzt = JSON.parse(localStorage.getItem(SPUR) || '[]'); } catch {}
    return 'Figur ' + (document.querySelector('script[src*="figur.js"]')?.getAttribute('src') || '') + '\n' + navigator.userAgent + '\nGrafik: ' + (grafikName || '?') +
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

// Einstieg: «Isolieren» (Vorschlag 20.11.2026)
lesartWaehlen(0, true);
uebersetzen();
// Direktstart für Tests und Vorführungen: ?beispiel, ?lesart=0|1|2
if (Q.has('lesart')) lesartWaehlen(Math.max(0, Math.min(2, +Q.get('lesart') || 0)), true);
if (Q.has('beispiel')) beispielStarten();
// für Prüfungen: Werte setzen, Finger von aussen führen, das Rund setzen
window.__figur = { WERTE, rundLoesen, ring: () => ring, finger, fingerNeu, lesartWaehlen, ringSetzen, ringVonSelbst, ellipseAus, rundAusSpur, spurPunkte: () => spurPunkte, setSpur: (p) => { spurPunkte = p; } };
