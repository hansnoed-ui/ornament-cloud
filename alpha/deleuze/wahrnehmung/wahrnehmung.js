// Wahrnehmung als Auswahl – Operator IV von the deleuzian scheme (Bergson, Matière et mémoire, 1896, Kapitel I;
// Deleuze, L’image-mouvement, 1983, Kapitel 4 und 5). Wahrnehmen heisst abziehen: Vom Bild bleibt, was uns angeht.
// Drei Lesarten nach Deleuzes drei Zuständen der Wahrnehmung: fest (Bergsons schwarzer Schirm, ein Zentrum),
// flüssig (die französische Schule, Epstein, Vigo: das Bild unter Wasser), gasförmig (Vertovs Kino-Auge: Körner ohne Zentrum).
// WebGL2, ohne Bibliotheken, ohne CDN. Aufbau, Quellen, Aufnahme, Glossen und Einstieg wie Dauer.

import { klangStarten, klangBild, klangAn, klangIstAn, klangSpur, klangTropfen } from './klang.js?v=1';
import { aufnahmeDatei } from '../gemeinsam/aufnahme.js?v=1';

const $ = (id) => document.getElementById(id);
const Q = new URLSearchParams(location.search);

// ---------- Sprache ----------
const TEXTE = {
  de: {
    titel: 'Wahrnehmung', satz: 'Wahrnehmen heisst weglassen: Vom Bild bleibt, was uns angeht.',
    kamera: 'Kamera', video: 'Video oder Fotos', beispiel: 'Beispiel', lesart: 'Lesart',
    glossen: {
      ecran: { begriff: 'l’écran noir', satz: 'Die Photographie ist in den Dingen schon genommen, aber durchscheinend. Dein Daumen ist der schwarze Schirm, auf dem sich das Bild abhebt.', zitat: '«… il manque, derrière la plaque, l’écran noir sur lequel se détacherait l’image.»', quelle: 'Bergson, Matière et mémoire, 1896, Kap. I' },
      eau: { begriff: 'la perception liquide', satz: 'Die französische Schule des Kinos liebte das Wasser. Dort gleitet die Wahrnehmung, und die Umrisse der Dinge werden flüssig.', zitat: '', quelle: 'Deleuze, L’image-mouvement, 1983, Kap. 5, sinngemäss' },
      gaz: { begriff: 'la perception gazeuse', satz: 'Vertovs Kino-Auge sieht ohne Mittelpunkt. Die Wahrnehmung kehrt in die Materie zurück, in die Bewegung jedes Korns.', zitat: '«Я — киноглаз. Я — глаз механический.»', quelle: 'Vertov, Kinoki. Perevorot, 1923' },
      lesarten: { begriff: 'trois états', satz: 'Drei Zustände der Wahrnehmung: fest, flüssig, gasförmig.', zitat: '', quelle: 'Deleuze, L’image-mouvement, 1983, Kap. 5' },
      licht: { begriff: 'la lumière', satz: 'Die Bilder sind Licht, bevor jemand sie sieht. Das Bewusstsein kommt nicht als Lampe hinzu, es hält das Licht nur an.', zitat: '', quelle: 'Deleuze, L’image-mouvement, 1983, Kap. 4, sinngemäss' },
      interesse: { begriff: 'la soustraction', satz: 'Wir nehmen das Ding wahr, abzüglich dessen, was uns nicht angeht. Je stärker das Interesse, desto weniger bleibt.', zitat: '', quelle: 'Bergson, Matière et mémoire, 1896, Kap. I, sinngemäss' },
      schirm: { begriff: 'le centre d’indétermination', satz: 'Ein lebender Körper lässt durch, was ihn nicht angeht, und hält an, was ihn betrifft. Hier bestimmst du, wie weit der Schirm wächst und wie lange er bleibt.', zitat: '', quelle: 'Bergson, Matière et mémoire, 1896, Kap. I, sinngemäss' },
      tiefe: { begriff: 'l’eau', satz: 'Je tiefer das Bild liegt, desto mehr verliert es seine Umrisse. Was sich bewegt, taucht auf.', zitat: '', quelle: 'Deleuze, L’image-mouvement, 1983, Kap. 5, sinngemäss' },
      wellen: { begriff: 'l’action et la réaction', satz: 'Jede Welle läuft weiter, wird zurückgeworfen und mischt sich mit den anderen. So wirken alle Bilder aufeinander.', zitat: '', quelle: 'Bergson, Matière et mémoire, 1896, Kap. I, sinngemäss' },
      funkeln: { begriff: 'la lumière de l’eau', satz: 'Die Wellen bündeln das Licht zu Netzen am Grund. Das Auge ist im Wasser, nicht davor.', zitat: '', quelle: 'Deleuze, L’image-mouvement, 1983, Kap. 5, sinngemäss' },
      wind: { begriff: 'l’intervalle', satz: 'Vertov verbindet jeden Punkt des Universums mit jedem anderen. Zwischen zwei Bewegungen liegt das Intervall, und dort sitzt das Auge.', zitat: '', quelle: 'Deleuze, L’image-mouvement, 1983, Kap. 5, sinngemäss' },
      freiheit: { begriff: 'l’œil dans la matière', satz: 'Ohne Mittelpunkt kehrt die Wahrnehmung in die Dinge zurück. Hier bestimmst du, wie lange die Körner frei bleiben.', zitat: '', quelle: 'Deleuze, L’image-mouvement, 1983, Kap. 5, sinngemäss' },
      koerner: { begriff: 'la perception moléculaire', satz: 'Je feiner die Körner, desto mehr Schwarz zwischen ihnen: das Bild als Menge von Molekülen.', zitat: '', quelle: 'Deleuze, L’image-mouvement, 1983, Kap. 5, sinngemäss' }
    },
    regler: [['Licht', 'Interesse', 'Schirm'], ['Tiefe', 'Wellen', 'Funkeln'], ['Wind', 'Freiheit', 'Körner']],
    reglerGlosse: [['licht', 'interesse', 'schirm'], ['tiefe', 'wellen', 'funkeln'], ['wind', 'freiheit', 'koerner']],
    lesarten: [
      { kurz: 'Fest', titel: 'Der schwarze Schirm', wer: 'Bergson', geste: 'Daumen auflegen: dort hebt sich das Bild ab.', text: 'Für Bergson ist die Welt eine Menge von Bildern, die alle aufeinander wirken. Die Photographie ist in den Dingen schon genommen, aber durchscheinend: Hinter der Platte fehlt der schwarze Schirm. Ein lebender Körper ist ein solcher Schirm. Er lässt durch, was ihn nicht angeht, und hält an, was ihn betrifft. Wahrnehmen heisst darum nicht hinzufügen, sondern abziehen. Deleuze nennt das den festen Zustand der Wahrnehmung, den menschlichen, mit einem Zentrum. Hier ist dein Daumen das Zentrum: Wo du hältst, wird es schwarz, und übrig bleibt, was sich bewegt und abhebt.' },
      { kurz: 'Flüssig', titel: 'Die flüssige Wahrnehmung', wer: 'Epstein, Vigo', geste: 'Tippen und halten: Wellen tragen das Bild.', text: 'Die französische Schule der Zwanzigerjahre, Epstein, L’Herbier, Grémillon, Vigo, filmte immer wieder Wasser. Deleuze sieht darin einen zweiten Zustand der Wahrnehmung: Sie ist nicht mehr an einen festen Punkt gebunden, sie gleitet, die Umrisse werden flüssig, Bewegung geht in Bewegung über. Hier liegt das Bild unter einer Wasserfläche. Dein Finger setzt Wellen, die Wellen bündeln das Licht, und was sich im Bild bewegt, setzt selbst Wellen.' },
      { kurz: 'Gas', titel: 'Das Kino-Auge', wer: 'Vertov', geste: 'Halten oder wischen: die Körner werden frei.', text: 'Dziga Vertov wollte ein Auge, das nicht menschlich ist: die Kamera als Kino-Auge, das jeden Punkt des Universums mit jedem anderen verbindet. Für Deleuze ist das der gasförmige Zustand der Wahrnehmung: ohne Mittelpunkt, molekular, in der Materie selbst. Hier besteht das Bild aus Zehntausenden Körnern. Wo du hältst oder wischst, lösen sie sich und treiben mit der Bewegung des Bildes weiter, dann finden sie langsam zurück.' }
    ],
    wenden: 'Kamera wenden', tonAn: 'Ton an', tonAus: 'Ton aus',
    begriff: 'Begriff', standbild: 'Standbild', aufnahme: 'Aufnahme', stopp: 'Stopp',
    teilen: 'Teilen', sichern: 'Sichern', komma: '.', 'ergebnis-hinweis': 'Gesichert im Ordner «Downloads». «Teilen» legt es direkt in die Galerie oder eine App.',
    keineAufnahme: 'Dieser Browser kann die Leinwand nicht aufnehmen. Das Standbild geht.',
    daumen: 'Daumen auflegen und halten',
    familie: 'Bild · L’image-mouvement, Kapitel 4 und 5', 'b-titel': 'Wahrnehmung',
    'b-text': [
      'Henri Bergson beginnt «Materie und Gedächtnis» 1896 mit einer Welt aus Bildern. Jedes Bild wirkt auf alle anderen und empfängt ihre Wirkung, ohne Auswahl, in alle Richtungen. Unter diesen Bildern gibt es besondere: lebende Körper. Sie antworten nicht sofort. Zwischen dem, was sie trifft, und dem, was sie tun, liegt ein Abstand, ein Zentrum der Unbestimmtheit.',
      'Daraus folgt Bergsons erstaunlichste These: Wahrnehmung fügt dem Bild nichts hinzu, sie nimmt weg. Wir nehmen das Ding wahr, abzüglich dessen, was uns nicht angeht. Deleuze macht daraus 1983 eine Grundlage seiner Kinobücher: Das Wahrnehmungsbild ist die erste Art des Bewegungsbildes, und es kennt drei Zustände, fest, flüssig und gasförmig.',
      'Hier liegt das Bild zuerst im Licht, durchscheinend, alle Momente zugleich. Erst dein Daumen macht ein Zentrum: Er zieht ab, was nicht interessiert. In den anderen Lesarten wird die Wahrnehmung flüssig wie Wasser und gasförmig wie Vertovs Körner.'
    ],
    'b-frage': 'Was hast du weggelassen, um dieses Bild zu sehen? Und wer entscheidet, was dich interessiert: du, dein Körper oder die Rechnung auf dieser Seite?',
    'b-quelle': 'Henri Bergson, Matière et mémoire, Paris: Alcan 1896, Kapitel I. Deutsch: Materie und Gedächtnis, Meiner. Gilles Deleuze, L’image-mouvement (Cinéma 1), Paris: Minuit 1983, Kapitel 4 und 5. Deutsch: Das Bewegungs-Bild, Suhrkamp. Dziga Vertov, «Kinoki. Perevorot», LEF 3, 1923.',
    keineKamera: 'Die Kamera lässt sich nicht öffnen. Wähle ein Video, Fotos oder das Beispiel.',
    keinGL: 'Dieses Gerät kann WebGL 2 nicht anzeigen. Die Wahrnehmung braucht es.',
    kontextWeg: 'Die Grafik ist ausgestiegen. Bitte die Seite neu laden.'
  },
  en: {
    titel: 'Perception', satz: 'To perceive is to subtract: what remains of the image is what concerns us.',
    kamera: 'Camera', video: 'Video or photos', beispiel: 'Example', lesart: 'Reading',
    glossen: {
      ecran: { begriff: 'l’écran noir', satz: 'The photograph is already taken inside things, but it is translucent. Your thumb is the black screen against which the image stands out.', zitat: '« … il manque, derrière la plaque, l’écran noir sur lequel se détacherait l’image. »', quelle: 'Bergson, Matter and Memory, 1896, ch. I (original)' },
      eau: { begriff: 'la perception liquide', satz: 'The French school of cinema loved water. There perception glides, and the outlines of things become fluid.', zitat: '', quelle: 'Deleuze, The Movement-Image, 1983, ch. 5, paraphrased' },
      gaz: { begriff: 'la perception gazeuse', satz: 'Vertov’s kino-eye sees without a centre. Perception returns into matter, into the movement of every grain.', zitat: '« Я — киноглаз. Я — глаз механический. »', quelle: 'Vertov, Kinoks: A Revolution, 1923 (original)' },
      lesarten: { begriff: 'trois états', satz: 'Three states of perception: solid, liquid, gaseous.', zitat: '', quelle: 'Deleuze, The Movement-Image, 1983, ch. 5' },
      licht: { begriff: 'la lumière', satz: 'Images are light before anyone sees them. Consciousness does not arrive like a lamp; it only stops the light.', zitat: '', quelle: 'Deleuze, The Movement-Image, 1983, ch. 4, paraphrased' },
      interesse: { begriff: 'la soustraction', satz: 'We perceive the thing minus what does not concern us. The stronger the interest, the less remains.', zitat: '', quelle: 'Bergson, Matter and Memory, 1896, ch. I, paraphrased' },
      schirm: { begriff: 'le centre d’indétermination', satz: 'A living body lets through what does not concern it and stops what affects it. Here you decide how far the screen grows and how long it stays.', zitat: '', quelle: 'Bergson, Matter and Memory, 1896, ch. I, paraphrased' },
      tiefe: { begriff: 'l’eau', satz: 'The deeper the image lies, the more it loses its outlines. What moves rises to the surface.', zitat: '', quelle: 'Deleuze, The Movement-Image, 1983, ch. 5, paraphrased' },
      wellen: { begriff: 'l’action et la réaction', satz: 'Each wave travels on, is thrown back and mingles with the others. This is how all images act on one another.', zitat: '', quelle: 'Bergson, Matter and Memory, 1896, ch. I, paraphrased' },
      funkeln: { begriff: 'la lumière de l’eau', satz: 'The waves gather light into nets on the bottom. The eye is in the water, not in front of it.', zitat: '', quelle: 'Deleuze, The Movement-Image, 1983, ch. 5, paraphrased' },
      wind: { begriff: 'l’intervalle', satz: 'Vertov links any point of the universe to any other. Between two movements lies the interval, and that is where the eye sits.', zitat: '', quelle: 'Deleuze, The Movement-Image, 1983, ch. 5, paraphrased' },
      freiheit: { begriff: 'l’œil dans la matière', satz: 'Without a centre, perception returns into things. Here you decide how long the grains stay free.', zitat: '', quelle: 'Deleuze, The Movement-Image, 1983, ch. 5, paraphrased' },
      koerner: { begriff: 'la perception moléculaire', satz: 'The finer the grains, the more black between them: the image as a crowd of molecules.', zitat: '', quelle: 'Deleuze, The Movement-Image, 1983, ch. 5, paraphrased' }
    },
    regler: [['Light', 'Interest', 'Screen'], ['Depth', 'Waves', 'Glitter'], ['Wind', 'Freedom', 'Grain']],
    reglerGlosse: [['licht', 'interesse', 'schirm'], ['tiefe', 'wellen', 'funkeln'], ['wind', 'freiheit', 'koerner']],
    lesarten: [
      { kurz: 'Solid', titel: 'The black screen', wer: 'Bergson', geste: 'Rest your thumb: there the image stands out.', text: 'For Bergson the world is a set of images that all act on one another. The photograph is already taken inside things, but it is translucent: behind the plate the black screen is missing. A living body is such a screen. It lets through what does not concern it and stops what affects it. To perceive is therefore not to add but to subtract. Deleuze calls this the solid state of perception, the human one, with a centre. Here your thumb is the centre: where you hold, it turns black, and what remains is what moves and stands out.' },
      { kurz: 'Liquid', titel: 'Liquid perception', wer: 'Epstein, Vigo', geste: 'Tap and hold: waves carry the image.', text: 'The French school of the 1920s, Epstein, L’Herbier, Grémillon, Vigo, filmed water again and again. Deleuze sees in it a second state of perception: no longer bound to a fixed point, it glides, outlines become fluid, movement passes into movement. Here the image lies beneath a surface of water. Your finger makes waves, the waves gather the light, and whatever moves in the image makes waves of its own.' },
      { kurz: 'Gas', titel: 'The kino-eye', wer: 'Vertov', geste: 'Hold or swipe: the grains break free.', text: 'Dziga Vertov wanted an eye that is not human: the camera as kino-eye, linking any point of the universe to any other. For Deleuze this is the gaseous state of perception: without a centre, molecular, in matter itself. Here the image consists of tens of thousands of grains. Where you hold or swipe, they come loose and drift on with the movement of the image, then slowly find their way back.' }
    ],
    wenden: 'Flip camera', tonAn: 'Sound on', tonAus: 'Sound off',
    begriff: 'Concept', standbild: 'Still', aufnahme: 'Record', stopp: 'Stop',
    teilen: 'Share', sichern: 'Save', komma: '.', 'ergebnis-hinweis': 'Saved to your “Downloads” folder. “Share” sends it straight to your gallery or an app.',
    keineAufnahme: 'This browser cannot record the canvas. Stills work.',
    daumen: 'Rest your thumb here and hold',
    familie: 'Image · The Movement-Image, chapters 4 and 5', 'b-titel': 'Perception',
    'b-text': [
      'Henri Bergson opens “Matter and Memory” in 1896 with a world of images. Each image acts on all the others and receives their action, without selection, in every direction. Among these images there are special ones: living bodies. They do not answer at once. Between what strikes them and what they do there is a gap, a centre of indetermination.',
      'From this follows Bergson’s most astonishing thesis: perception adds nothing to the image, it takes away. We perceive the thing minus what does not concern us. In 1983 Deleuze makes this a foundation of his cinema books: the perception-image is the first kind of movement-image, and it has three states, solid, liquid and gaseous.',
      'Here the image first lies in light, translucent, all moments at once. Only your thumb makes a centre: it subtracts what is of no interest. In the other readings perception becomes liquid like water and gaseous like Vertov’s grains.'
    ],
    'b-frage': 'What did you leave out to see this image? And who decides what interests you: you, your body, or the computation on this page?',
    'b-quelle': 'Henri Bergson, Matière et mémoire, Paris: Alcan 1896, chapter I. English: Matter and Memory, Zone Books 1988. Gilles Deleuze, L’image-mouvement (Cinéma 1), Paris: Minuit 1983, chapters 4 and 5. English: Cinema 1: The Movement-Image, University of Minnesota Press 1986. Dziga Vertov, “Kinoki. Perevorot”, LEF 3, 1923.',
    keineKamera: 'The camera cannot be opened. Choose a video, photos or the example.',
    keinGL: 'This device cannot show WebGL 2, which perception needs here.',
    kontextWeg: 'The graphics stopped. Please reload the page.'
  },
  fr: {
    titel: 'La perception', satz: 'Percevoir, c’est soustraire : de l’image ne reste que ce qui nous intéresse.',
    kamera: 'Caméra', video: 'Vidéo ou photos', beispiel: 'Exemple', lesart: 'Lecture',
    glossen: {
      ecran: { begriff: 'l’écran noir', satz: 'La photographie est déjà prise dans les choses, mais elle est translucide. Ton pouce est l’écran noir sur lequel l’image se détache.', zitat: '« … il manque, derrière la plaque, l’écran noir sur lequel se détacherait l’image. »', quelle: 'Bergson, Matière et mémoire, 1896, ch. I' },
      eau: { begriff: 'la perception liquide', satz: 'L’école française aimait l’eau. La perception y glisse, et les contours des choses deviennent fluides.', zitat: '', quelle: 'Deleuze, L’image-mouvement, 1983, ch. 5, en substance' },
      gaz: { begriff: 'la perception gazeuse', satz: 'Le ciné-œil de Vertov voit sans centre. La perception retourne dans la matière, dans le mouvement de chaque grain.', zitat: '« Я — киноглаз. Я — глаз механический. »', quelle: 'Vertov, Kinoki. Perevorot, 1923' },
      lesarten: { begriff: 'trois états', satz: 'Trois états de la perception : solide, liquide, gazeux.', zitat: '', quelle: 'Deleuze, L’image-mouvement, 1983, ch. 5' },
      licht: { begriff: 'la lumière', satz: 'Les images sont lumière avant que personne ne les voie. La conscience ne vient pas comme une lampe, elle ne fait qu’arrêter la lumière.', zitat: '', quelle: 'Deleuze, L’image-mouvement, 1983, ch. 4, en substance' },
      interesse: { begriff: 'la soustraction', satz: 'Nous percevons la chose, moins ce qui ne nous intéresse pas. Plus l’intérêt est fort, moins il en reste.', zitat: '', quelle: 'Bergson, Matière et mémoire, 1896, ch. I, en substance' },
      schirm: { begriff: 'le centre d’indétermination', satz: 'Un corps vivant laisse passer ce qui lui est indifférent et arrête ce qui l’intéresse. Ici tu décides jusqu’où l’écran grandit et combien de temps il reste.', zitat: '', quelle: 'Bergson, Matière et mémoire, 1896, ch. I, en substance' },
      tiefe: { begriff: 'l’eau', satz: 'Plus l’image est profonde, plus elle perd ses contours. Ce qui bouge remonte à la surface.', zitat: '', quelle: 'Deleuze, L’image-mouvement, 1983, ch. 5, en substance' },
      wellen: { begriff: 'l’action et la réaction', satz: 'Chaque vague poursuit sa course, est renvoyée et se mêle aux autres. Ainsi toutes les images agissent les unes sur les autres.', zitat: '', quelle: 'Bergson, Matière et mémoire, 1896, ch. I, en substance' },
      funkeln: { begriff: 'la lumière de l’eau', satz: 'Les vagues rassemblent la lumière en réseaux sur le fond. L’œil est dans l’eau, non devant elle.', zitat: '', quelle: 'Deleuze, L’image-mouvement, 1983, ch. 5, en substance' },
      wind: { begriff: 'l’intervalle', satz: 'Vertov met n’importe quel point de l’univers en rapport avec n’importe quel autre. Entre deux mouvements il y a l’intervalle, et c’est là que se tient l’œil.', zitat: '', quelle: 'Deleuze, L’image-mouvement, 1983, ch. 5, en substance' },
      freiheit: { begriff: 'l’œil dans la matière', satz: 'Sans centre, la perception retourne dans les choses. Ici tu décides combien de temps les grains restent libres.', zitat: '', quelle: 'Deleuze, L’image-mouvement, 1983, ch. 5, en substance' },
      koerner: { begriff: 'la perception moléculaire', satz: 'Plus les grains sont fins, plus il y a de noir entre eux : l’image comme foule de molécules.', zitat: '', quelle: 'Deleuze, L’image-mouvement, 1983, ch. 5, en substance' }
    },
    regler: [['Lumière', 'Intérêt', 'Écran'], ['Profondeur', 'Vagues', 'Reflets'], ['Vent', 'Liberté', 'Grain']],
    reglerGlosse: [['licht', 'interesse', 'schirm'], ['tiefe', 'wellen', 'funkeln'], ['wind', 'freiheit', 'koerner']],
    lesarten: [
      { kurz: 'Solide', titel: 'L’écran noir', wer: 'Bergson', geste: 'Pose le pouce : là, l’image se détache.', text: 'Pour Bergson, le monde est un ensemble d’images qui agissent toutes les unes sur les autres. La photographie est déjà prise dans les choses, mais elle est translucide : derrière la plaque, il manque l’écran noir. Un corps vivant est un tel écran. Il laisse passer ce qui lui est indifférent et arrête ce qui l’intéresse. Percevoir, ce n’est donc pas ajouter, c’est soustraire. Deleuze appelle cela l’état solide de la perception, l’état humain, avec un centre. Ici ton pouce est le centre : là où tu tiens, tout devient noir, et il reste ce qui bouge et se détache.' },
      { kurz: 'Liquide', titel: 'La perception liquide', wer: 'Epstein, Vigo', geste: 'Toucher et tenir : les vagues portent l’image.', text: 'L’école française des années vingt, Epstein, L’Herbier, Grémillon, Vigo, n’a cessé de filmer l’eau. Deleuze y voit un deuxième état de la perception : elle n’est plus liée à un point fixe, elle glisse, les contours deviennent fluides, le mouvement passe dans le mouvement. Ici l’image repose sous une surface d’eau. Ton doigt fait des vagues, les vagues rassemblent la lumière, et ce qui bouge dans l’image fait lui-même des vagues.' },
      { kurz: 'Gazeux', titel: 'Le ciné-œil', wer: 'Vertov', geste: 'Tenir ou glisser : les grains se libèrent.', text: 'Dziga Vertov voulait un œil qui ne soit pas humain : la caméra comme ciné-œil, qui met n’importe quel point de l’univers en rapport avec n’importe quel autre. Pour Deleuze, c’est l’état gazeux de la perception : sans centre, moléculaire, dans la matière même. Ici l’image est faite de dizaines de milliers de grains. Là où tu tiens ou glisses, ils se détachent et dérivent avec le mouvement de l’image, puis retrouvent lentement leur place.' }
    ],
    wenden: 'Retourner', tonAn: 'Son activé', tonAus: 'Son coupé',
    begriff: 'Concept', standbild: 'Image', aufnahme: 'Enregistrer', stopp: 'Arrêter',
    teilen: 'Partager', sichern: 'Télécharger', komma: ',', 'ergebnis-hinweis': 'Enregistré dans le dossier « Téléchargements ». « Partager » l’envoie directement dans la galerie ou une app.',
    keineAufnahme: 'Ce navigateur ne peut pas enregistrer le canevas. L’image fixe fonctionne.',
    daumen: 'Pose le pouce ici et tiens',
    familie: 'Image · L’image-mouvement, chapitres 4 et 5', 'b-titel': 'La perception',
    'b-text': [
      'Henri Bergson ouvre « Matière et mémoire », en 1896, sur un monde d’images. Chaque image agit sur toutes les autres et reçoit leur action, sans choix, dans toutes les directions. Parmi ces images, il en est de particulières : les corps vivants. Ils ne répondent pas aussitôt. Entre ce qui les frappe et ce qu’ils font, il y a un écart, un centre d’indétermination.',
      'De là suit la thèse la plus étonnante de Bergson : la perception n’ajoute rien à l’image, elle retranche. Nous percevons la chose, moins ce qui ne nous intéresse pas. En 1983, Deleuze en fait l’un des fondements de ses livres sur le cinéma : l’image-perception est la première espèce d’image-mouvement, et elle connaît trois états, solide, liquide et gazeux.',
      'Ici l’image repose d’abord dans la lumière, translucide, tous les instants à la fois. Seul ton pouce fait un centre : il soustrait ce qui n’intéresse pas. Dans les autres lectures, la perception devient liquide comme l’eau et gazeuse comme les grains de Vertov.'
    ],
    'b-frage': 'Qu’as-tu laissé de côté pour voir cette image ? Et qui décide de ce qui t’intéresse : toi, ton corps, ou le calcul de cette page ?',
    'b-quelle': 'Henri Bergson, Matière et mémoire, Paris : Alcan 1896, chapitre I. Gilles Deleuze, L’image-mouvement (Cinéma 1), Paris : Minuit 1983, chapitres 4 et 5. Dziga Vertov, « Kinoki. Perevorot », LEF 3, 1923.',
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
  $('daumen-text').textContent = t.daumen;
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
const SPUR = 'wahrnehmung.spur';
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
  if (s.length && !['✓ läuft', 'Start', 'Ende', 'Pause'].includes(s.at(-1))) console.warn('Wahrnehmung: der letzte Versuch brach ab nach', s.slice(-4).join(' → '));
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
const ARBEIT = leicht ? 480 : telefon ? 720 : 1024;        // Arbeitsbilder (Gegenwart klein, alle Momente), lange Seite
const SCHARF_SEITE = leicht ? 960 : telefon ? 1280 : 1920; // die Gegenwart: so scharf, wie der Bildschirm sie zeigt
const MAX_DPR = leicht ? 0.6 : 2;                          // fein wie der Bildschirm; ruckelt es, senkt tempoMessen die Auflösung
const FLUSS_SEITE = leicht ? 110 : telefon ? 180 : 240;    // feinste Stufe des optischen Flusses, zugleich das Feld des Interesses
const FELD_SEITE = leicht ? 192 : 384;                     // Feld des Daumens (Schirm, Freiheit)
const WELLE_SEITE = leicht ? 200 : telefon ? 380 : 520;    // Wasserfläche
// Körner: so viele, dass sie am Telefon einen feinen Raster bilden; bei weniger Leistung weniger
const KOERNER = Q.has('koerner') ? +Q.get('koerner') : leicht ? 14000 : telefon ? 90000 : 180000;   // ?koerner=… nur für Prüfungen
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
float innen(vec4 r){ return step(r.x, v.x) * step(v.x, r.z) * step(r.y, v.y) * step(v.y, r.w); }
`;

// Kopie der Gegenwart in die Arbeitsgrösse
const FS_KOPIE = KOPF + `uniform sampler2D uQ; void main(){ o = vec4(texture(uQ, v).rgb, 1.0); }`;
// ein Gedächtnis: gleitender Mittelwert (alle Momente zugleich, wie eine lange belichtete Platte)
const FS_EMA = KOPF + `uniform sampler2D uAlt, uJetzt; uniform float uRate;
void main(){ o = vec4(mix(texture(uAlt, v).rgb, texture(uJetzt, v).rgb, uRate), 1.0); }`;

// ---- Optischer Fluss nach Lucas und Kanade (1981), als Pyramide auf der Grafikkarte (wie in der Dauer) ----
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

// ---- Das Interesse: was sich bewegt, was sich vom ruhenden Grund abhebt, was Kontrast hat ----
// r: geglättetes Interesse (steigt schnell, sinkt langsam), g: Bewegung jetzt, b: Bewegung zuvor (für die Wellen)
// Der ruhende Grund lernt langsam (einige Sekunden): ein Gesicht, das still hält, bleibt eine Weile interessant.
const FS_GRUND = KOPF + `uniform sampler2D uAlt, uJetzt; uniform float uRate;
void main(){ o = vec4(mix(texture(uAlt, v).rgb, texture(uJetzt, v).rgb, uRate), 1.0); }`;
const FS_INTERESSE = KOPF + `uniform sampler2D uAlt, uFl, uL0, uL2, uJetzt, uGrund; uniform vec2 uPx; uniform float uNeu, uDt;
void main(){
  // Bewegung gegen die Umgebung: fährt oder zoomt die Kamera, bewegt sich alles, und das ist nicht interessant
  vec2 f = texture(uFl, v).xy, umg = vec2(0);
  for (int k = 0; k < 8; k++) { float w = float(k) * 0.785398; umg += texture(uFl, v + vec2(cos(w), sin(w)) * 0.09).xy; }
  umg /= 8.0;
  float bew = smoothstep(0.25, 1.6, length((f - umg) / uPx));   // Bildpunkte des Flusses je Videobild
  vec3 j = texture(uJetzt, v).rgb, g = texture(uGrund, v).rgb;
  float ab = smoothstep(0.08, 0.3, max(abs(j.r - g.r), max(abs(j.g - g.g), abs(j.b - g.b))));
  // Farbe: was lebt und leuchtet, fällt auf (Lippen, Haut, Blumen), Grau tritt zurück
  float sat = smoothstep(0.12, 0.45, max(j.r, max(j.g, j.b)) - min(j.r, min(j.g, j.b)));
  // Kontrast: fein gegen grob (Zentrum und Umfeld, wie im Auge)
  float kon = smoothstep(0.05, 0.22, abs(texture(uL0, v).r - texture(uL2, v).r));
  float neu = max(bew, max(0.9 * sat, max(0.38 * kon, 0.3 * ab)));
  // weich ausbreiten: Interesse hat einen kleinen Hof
  vec4 alt = texture(uAlt, v);
  float hof = 0.0;
  for (int k = 0; k < 8; k++) { float w = float(k) * 0.785398; hof = max(hof, texture(uAlt, v + vec2(cos(w), sin(w)) * uPx * 1.6).r); }
  float ziel = max(neu, hof * 0.7);
  float r = ziel > alt.r ? mix(alt.r, ziel, 1.0 - exp(-uDt / 0.12)) : mix(alt.r, ziel, 1.0 - exp(-uDt / 0.9));
  o = vec4(r, mix(alt.g, bew, uNeu), mix(alt.b, alt.g, uNeu), 1.0);
}`;

// ---- Das Feld des Daumens: der Schirm (fest) oder die Freiheit der Körner (gasförmig) ----
// Wo der Finger ruht, füllt es sich; es breitet sich aus wie ein Fleck in Papier, entlang dessen, was interessiert, schneller.
const FS_FELD = KOPF + `uniform sampler2D uAlt, uI; uniform vec2 uPx; uniform vec4 uStempel[16]; uniform vec4 uStempelR[16]; uniform int uN; uniform float uAb, uSeite, uSchritt, uWachs, uFolgen;
void main(){
  float w = texture(uAlt, v).r;
  float n4 = 0.25 * (texture(uAlt, v + vec2(uPx.x, 0)).r + texture(uAlt, v - vec2(uPx.x, 0)).r + texture(uAlt, v + vec2(0, uPx.y)).r + texture(uAlt, v - vec2(0, uPx.y)).r);
  w = mix(w, n4, 0.18);
  float nm = 0.0;
  for (int k = 0; k < 8; k++) { float a = float(k) * 0.785398; nm = max(nm, texture(uAlt, v + vec2(cos(a), sin(a)) * uPx * 2.0 * uSchritt).r); }
  // Der Schirm wächst dorthin, wo es etwas zu sehen gibt (uFolgen), ins Leere langsamer
  float i = texture(uI, v).r;
  float abfall = (0.013 + 0.05 * (1.0 - nm)) * mix(1.0, mix(1.6, 0.45, i), uFolgen) / max(uWachs, 0.05);
  w = max(w, nm - 2.0 * abfall);
  vec2 q = vec2(v.x * uSeite, v.y);
  for (int k = 0; k < 16; k++) {
    if (k >= uN) break;
    vec2 a = vec2(uStempel[k].x * uSeite, uStempel[k].y), b = vec2(uStempel[k].z * uSeite, uStempel[k].w);
    vec2 ab = b - a; float h = clamp(dot(q - a, ab) / max(dot(ab, ab), 1e-8), 0.0, 1.0);
    vec2 e = q - a - ab * h; float rr = mix(uStempelR[k].x, uStempelR[k].y, h);
    float r = length(e) / max(rr, 1e-4);
    float f = max(0.0, 1.0 - r * r); f *= f;
    w += uStempelR[k].z * f;
  }
  w = clamp(w - uAb * (0.3 + w), 0.0, 1.0);
  o = vec4(w, 0, 0, 1);
}`;

// ---------- Lesart I: fest. Der schwarze Schirm (Bergson) ----------
// Zuerst das Bild «an sich»: Licht, das durch alles geht, das Bild blass und durchscheinend, alle Momente zugleich.
// Wo der Schirm steht, hebt sich das Bild ab: scharf, in Farbe, auf Schwarz, und nur, was interessiert.
const FS_FEST = KOPF + `uniform sampler2D uScharf, uE, uA, uI; uniform float uLicht, uInteresse, uT, uSeite, uZeige; uniform vec4 uRahmen;
void main(){
  vec2 q = vec2(v.x * uSeite, v.y);
  vec3 jetzt = texture(uScharf, v).rgb, alle = texture(uE, v).rgb;
  // an sich: die Platte ohne Schirm. Das Bild als zarter Schatten im Licht, leicht irisierend wie eine Silberschicht
  vec3 an = mix(alle, jetzt, 0.35);
  float l = lu(an);
  vec3 milch = vec3(0.955, 0.947, 0.928);
  float tief = 0.12 + 0.3 * (1.0 - uLicht);
  float drift = fbm(q * 2.2 + vec2(uT * 0.031, -uT * 0.019));
  vec3 irr = 0.5 + 0.5 * cos(6.2831 * (vec3(0.0, 0.33, 0.67) + l * 1.4 + drift * 0.7));
  vec3 durch = milch - (1.0 - an) * tief * (0.94 + 0.12 * irr) * vec3(1.0, 1.0, 0.94);
  // Licht, das durch alles hindurchgeht: feine, wandernde Bahnen (die Wirkung aller Bilder auf alle)
  float bahn = sin((q.x * 0.6 + q.y) * 140.0 + drift * 18.0 - uT * 1.3);
  durch += pow(0.5 + 0.5 * bahn, 14.0) * 0.035 * uLicht * (0.4 + drift);
  // der Schirm: sein Rand ist kein Kreis, sondern ein Fleck mit feinem Saum, wie Entwickler auf Papier
  float a = texture(uA, v).r;
  float faser = fbm(q * 42.0) * 0.16 + fbm(q * 7.0 + 3.1) * 0.14;
  float s = a + faser - 0.15;
  float schirm = smoothstep(0.30, 0.42, s);
  // wahrgenommen: abgezogen, was nicht interessiert
  float i = texture(uI, v).r;
  float schwelle = mix(0.08, 0.8, uInteresse);
  float bleibt = smoothstep(schwelle - 0.16, schwelle + 0.1, i);
  vec3 wahr = jetzt * (0.025 + 0.975 * bleibt);
  // was bleibt, glänzt am Rand ein wenig: dort wird das Licht zurückgeworfen
  wahr *= 1.0 + 0.35 * bleibt * (1.0 - bleibt) * 4.0;
  vec3 c = mix(durch, wahr, schirm);
  // feine dunkle Linie, wo der Schirm beginnt (Entwicklungskante), und ein heller Hof davor
  float kante = smoothstep(0.27, 0.30, s) * (1.0 - smoothstep(0.30, 0.33, s));
  c *= 1.0 - 0.5 * kante;
  float hof = smoothstep(0.05, 0.28, s) * (1.0 - schirm);
  c += hof * 0.035;
  if (uZeige > 0.5) c = vec3(i, bleibt, texture(uA, v).r);   // ?zeige: Interesse, was bleibt, Schirm
  o = vec4(mix(vec3(0.039, 0.039, 0.043), c, innen(uRahmen)), 1.0);
}`;

// ---------- Lesart II: flüssig. Das Bild unter Wasser (Epstein, Vigo) ----------
// Wellengleichung auf einem Höhenfeld: r = Höhe jetzt, g = Höhe zuvor. Der Finger setzt Tropfen,
// die Bewegung im Bild selbst stösst die Fläche an.
const FS_WELLE = KOPF + `uniform sampler2D uH, uI; uniform vec2 uPx; uniform float uDaempf, uSeite, uBild; uniform vec4 uStempel[16]; uniform vec4 uStempelR[16]; uniform int uN;
void main(){
  vec2 s = texture(uH, v).xy; float h = s.x, hp = s.y;
  float n = texture(uH, v + vec2(uPx.x, 0)).x + texture(uH, v - vec2(uPx.x, 0)).x + texture(uH, v + vec2(0, uPx.y)).x + texture(uH, v - vec2(0, uPx.y)).x;
  float d = texture(uH, v + uPx).x + texture(uH, v - uPx).x + texture(uH, v + vec2(uPx.x, -uPx.y)).x + texture(uH, v + vec2(-uPx.x, uPx.y)).x;
  float lap = (4.0 * n + d - 20.0 * h) / 6.0;   // neun Punkte: die Ringe bleiben rund
  float neu = (2.0 * h - hp + 0.42 * lap) * uDaempf;
  vec2 q = vec2(v.x * uSeite, v.y);
  for (int k = 0; k < 16; k++) {
    if (k >= uN) break;
    vec2 a = vec2(uStempel[k].x * uSeite, uStempel[k].y), b = vec2(uStempel[k].z * uSeite, uStempel[k].w);
    vec2 ab = b - a; float t = clamp(dot(q - a, ab) / max(dot(ab, ab), 1e-8), 0.0, 1.0);
    float r = length(q - a - ab * t) / max(uStempelR[k].y, 1e-4);
    neu -= uStempelR[k].z * exp(-r * r * 3.0);
  }
  vec3 i = texture(uI, v).rgb;
  neu += uBild * (i.g - i.b);
  o = vec4(neu, h, 0, 1);
}`;
const FS_FLUESSIG = KOPF + `uniform sampler2D uScharf, uJetzt, uH, uI; uniform vec2 uPxH; uniform float uTiefe, uFunkeln, uSeite, uT; uniform vec4 uRahmen;
float H(vec2 p){ return texture(uH, p).x; }
void main(){
  vec2 ex = vec2(uPxH.x, 0), ey = vec2(0, uPxH.y);
  float h = H(v), hr = H(v + ex), hl = H(v - ex), hu = H(v + ey), hd = H(v - ey);
  vec2 g = 0.5 * vec2(hr - hl, hu - hd);
  float hxx = hr + hl - 2.0 * h, hyy = hu + hd - 2.0 * h, hxy = 0.25 * (H(v + ex + ey) - H(v + ex - ey) - H(v - ex + ey) + H(v - ex - ey));
  // Brechung: jeder Punkt am Grund sieht durch die geneigte Fläche an eine andere Stelle
  float tiefe = 8.0 + 30.0 * uTiefe;
  vec2 versatz = g * tiefe * 0.8 * uPxH;
  // Lichtnetz am Grund: wo die Brechung das Licht bündelt (Jacobi-Determinante der Abbildung), wird es hell
  float j11 = 1.0 + tiefe * hxx, j22 = 1.0 + tiefe * hyy, j12 = tiefe * hxy;
  float det = j11 * j22 - j12 * j12;
  float netz = clamp(1.0 / max(abs(det), 0.12), 0.0, 4.0) - 1.0;
  // Farbe zerlegt sich leicht, wie in Wasser
  vec3 c = vec3(texture(uScharf, v - versatz * 1.06).r, texture(uScharf, v - versatz).g, texture(uScharf, v - versatz * 0.94).b);
  vec3 weich = texture(uJetzt, v - versatz * 1.1).rgb;
  // was interessiert, taucht auf; das Ruhende sinkt
  float auf = texture(uI, v - versatz).r;
  float tauch = uTiefe * (1.0 - 0.45 * auf);
  c = mix(c, weich, 0.75 * tauch);
  vec3 wasser = vec3(0.02, 0.09, 0.11);
  c = mix(c, c * vec3(0.42, 0.74, 0.82) + wasser, tauch);
  c *= 1.0 + netz * (0.05 + 0.16 * uFunkeln);
  // die Oberfläche: Spiegelung eines hellen Fensters und feines Glitzern
  vec3 n = normalize(vec3(-g * 9.0, 1.0));
  vec3 R = reflect(vec3(0.0, 0.0, -1.0), n);
  float fen = pow(max(dot(R, normalize(vec3(-0.35, 0.55, 1.0))), 0.0), 600.0);
  float fres = pow(1.0 - n.z, 3.0);
  c += vec3(0.82, 0.86, 0.88) * fres * 0.35 + vec3(1.0, 0.97, 0.9) * fen * (0.3 + 1.6 * uFunkeln);
  o = vec4(mix(vec3(0.039, 0.039, 0.043), c, innen(uRahmen)), 1.0);
}`;

// ---------- Lesart III: gasförmig. Das Kino-Auge (Vertov) ----------
// Jedes Korn kennt seinen Platz im Bild (Heim) und trägt dessen Farbe. Zustand je Korn: xy Ort, zw Geschwindigkeit (Bildanteile je Sekunde).
// Frei wird es, wo der Daumen gehalten hat: dann treibt es mit der Bewegung des Bildes und einem leisen Wirbelwind;
// gebunden zieht es eine Feder zurück an seinen Platz.
const FS_KOERNER = KOPF + `uniform highp sampler2D uS; uniform sampler2D uFl, uA; uniform vec2 uGitter; uniform float uDt, uT, uWind, uSeite, uStart, uFps;
uniform vec4 uFinger[4]; uniform int uFN; uniform float uFingerR;
vec2 wirbel(vec2 p){
  float e = 0.01;
  float a = fbm(p + vec2(0, e)), b = fbm(p - vec2(0, e)), c = fbm(p + vec2(e, 0)), d = fbm(p - vec2(e, 0));
  return vec2(a - b, -(c - d)) / (2.0 * e);
}
void main(){
  ivec2 ij = ivec2(gl_FragCoord.xy);
  vec2 heim = (vec2(ij) + 0.5) / uGitter;
  if (uStart > 0.5) { o = vec4(heim, 0, 0); return; }
  vec4 s = texelFetch(uS, ij, 0);
  vec2 p = s.xy, vel = s.zw;
  float frei = smoothstep(0.04, 0.55, max(texture(uA, heim).r, 0.7 * texture(uA, p).r));
  // Fluss am Ort des Korns: Bildanteile je Videobild → je Sekunde
  vec2 fl = texture(uFl, clamp(p, 0.0, 1.0)).xy * uFps;
  vec2 w = wirbel(vec2(p.x * uSeite, p.y) * 2.6 + vec2(uT * 0.05, uT * 0.03)) * vec2(1.0 / uSeite, 1.0);
  vec2 gas = fl * (1.2 + 5.0 * uWind) + w * (0.015 + 0.1 * uWind);
  // gebunden: gedämpfte Feder; frei: die Geschwindigkeit folgt sanft dem Gas
  float k = 70.0 * pow(1.0 - frei, 2.0) + 0.15;
  vec2 feder = (heim - p) * k - vel * 2.0 * sqrt(k);
  vec2 acc = mix(feder, (gas - vel) * 1.6, frei);
  // der Daumen stösst die Körner beiseite und nimmt sie im Wischen mit
  vec2 qp = vec2(p.x * uSeite, p.y);
  for (int i = 0; i < 4; i++) {
    if (i >= uFN) break;
    vec2 d = qp - vec2(uFinger[i].x * uSeite, uFinger[i].y);
    float r2 = dot(d, d) / (uFingerR * uFingerR);
    float g = exp(-r2 * 1.5);
    vec2 weg = normalize(d + 1e-5) * vec2(1.0 / uSeite, 1.0);
    acc += (weg * 0.3 + uFinger[i].zw * 3.0) * g * frei;
  }
  vel += acc * uDt;
  vel *= 1.0 / (1.0 + 0.4 * uDt);
  p += vel * uDt;
  o = vec4(p, vel);
}`;
// Jedes Korn ein kleiner, weicher Fleck; in Bewegung zieht es sich zu einem Strich (wie eine lange belichtete Spur).
const VS_KORN = `#version 300 es
precision highp float; precision highp int;
in vec2 a; out vec2 vq; out vec3 vc; out float vf;
uniform highp sampler2D uS; uniform sampler2D uBild, uA; uniform ivec2 uGitter; uniform float uSeite, uGroesse, uStreck;
float lu(vec3 c){ return dot(c, vec3(0.2126, 0.7152, 0.0722)); }
void main(){
  ivec2 ij = ivec2(gl_InstanceID % uGitter.x, gl_InstanceID / uGitter.x);
  vec4 s = texelFetch(uS, ij, 0);
  vec2 heim = (vec2(ij) + 0.5) / vec2(uGitter);
  vec3 farbe = texture(uBild, heim).rgb;
  float frei = smoothstep(0.04, 0.55, texture(uA, heim).r);
  vec2 vel = s.zw * vec2(uSeite, 1.0);
  float sp = length(vel);
  vec2 dir = sp > 1e-4 ? vel / sp : vec2(1.0, 0.0), nrm = vec2(-dir.y, dir.x);
  // die Grösse folgt der Helligkeit: dunkle Stellen bleiben fein, helle schliessen sich
  float l = lu(farbe);
  float r = (1.0 / float(uGitter.y)) * mix(0.42 + 0.75 * sqrt(l), 1.15, uGroesse);
  float zieh = 1.0 + min(sp * uStreck, 5.0);
  vec2 off = (dir * a.x * zieh + nrm * a.y) * r;
  off.x /= uSeite;
  gl_Position = vec4((s.xy + off) * 2.0 - 1.0, 0.0, 1.0);
  vq = vec2(a.x, a.y); vf = frei;
  // frei geworden leuchtet das Korn auf und wird ein wenig kühler, wie Staub im Projektorlicht
  vc = farbe * (1.0 + 0.55 * frei) + vec3(0.02, 0.03, 0.05) * frei;
}`;
const FS_KORN = `#version 300 es
precision highp float; in vec2 vq; in vec3 vc; in float vf; out vec4 o;
void main(){
  float r2 = dot(vq, vq);
  float al = exp(-r2 * 2.6) * (1.0 - smoothstep(0.85, 1.0, r2));
  o = vec4(vc * al, al);
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
const FS_ZUSAMMEN = KOPF + `uniform sampler2D uSzene, uGlow; uniform vec2 uPx; uniform float uGlowStaerke, uT, uKorn; uniform vec3 uGlowFarbe;
float h(float n){ return fract(sin(n * 91.345 + 7.13) * 43758.5453); }
void main(){
  vec3 nw = texture(uSzene, v + vec2(-1, -1) * uPx).rgb, ne = texture(uSzene, v + vec2(1, -1) * uPx).rgb;
  vec3 sw = texture(uSzene, v + vec2(-1, 1) * uPx).rgb, se = texture(uSzene, v + vec2(1, 1) * uPx).rgb;
  vec3 m = texture(uSzene, v).rgb;
  float lnw = lu(nw), lne = lu(ne), lsw = lu(sw), lse = lu(se), lm = lu(m);
  float lmin = min(lm, min(min(lnw, lne), min(lsw, lse))), lmax = max(lm, max(max(lnw, lne), max(lsw, lse)));
  vec2 d = vec2(-((lnw + lne) - (lsw + lse)), (lnw + lsw) - (lne + lse));
  float red = max((lnw + lne + lsw + lse) * 0.03125, 1.0 / 128.0);
  d = clamp(d / (min(abs(d.x), abs(d.y)) + red), -8.0, 8.0) * uPx;
  vec3 A = 0.5 * (texture(uSzene, v + d * (1.0 / 3.0 - 0.5)).rgb + texture(uSzene, v + d * (2.0 / 3.0 - 0.5)).rgb);
  vec3 B = A * 0.5 + 0.25 * (texture(uSzene, v - d * 0.5).rgb + texture(uSzene, v + d * 0.5).rgb);
  float lb = lu(B);
  vec3 c = (lb < lmin || lb > lmax) ? A : B;
  c += texture(uGlow, v).rgb * uGlowFarbe * uGlowStaerke;
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

let flussB = 0, scharfTex = null, scharfB = 0, scharfH = 0, arbeitB = 0, arbeitH = 0, welleB = 0, welleH = 0, feldB = 0, feldH = 0;
let kornGx = 0, kornGy = 0, koernerAn = false, koernerNeu = true;
if (gl) {
  halbFloat = !!gl.getExtension('EXT_color_buffer_float');
  gl.getExtension('OES_texture_half_float_linear');
  try {
    for (const [n, fs] of Object.entries({ kopie: FS_KOPIE, ema: FS_EMA, lum: FS_LUM, lk: FS_LK, fglatt: FS_FGLATT, grund: FS_GRUND, interesse: FS_INTERESSE,
      feld: FS_FELD, fest: FS_FEST, welle: FS_WELLE, fluessig: FS_FLUESSIG, koerner: FS_KOERNER, hell: FS_HELL, weich: FS_WEICH, zusammen: FS_ZUSAMMEN })) P[n] = programm(fs);
    P.korn = programm(FS_KORN, VS_KORN);
  } catch (e) { spur('Shader: ' + String(e.message).slice(0, 140)); console.error(e); melden(TEXTE[sprache].keinGL); }
  const buf = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
  gl.enableVertexAttribArray(0); gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
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
    for (const [k, w] of [[gl.TEXTURE_MIN_FILTER, gl.LINEAR], [gl.TEXTURE_MAG_FILTER, gl.LINEAR], [gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE], [gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE]]) gl.texParameteri(gl.TEXTURE_2D, k, w);
  }
  const [ab, ah] = seitenMass(ARBEIT);
  if (ab !== arbeitB || ah !== arbeitH) {
    arbeitB = ab; arbeitH = ah;
    paar('jetzt', ab, ah, false); paar('alle', ab, ah); paar('grund', ab, ah);
    grundNeu = true;
  }
  const [fb, fh] = seitenMass(FLUSS_SEITE);
  if (fb !== flussB) {
    flussB = fb;
    for (let k = 0; k < 3; k++) { const [b2, h2] = seitenMass(Math.round(FLUSS_SEITE / (1 << k))); zielBauen('lum' + k, b2, h2); zielBauen('fl' + k, b2, h2); zielBauen('flb' + k, b2, h2); }
    paar('fluss', fb, fh); paar('i', fb, fh);
  }
  const [wb, wh] = seitenMass(FELD_SEITE);
  if (wb !== feldB || wh !== feldH) { feldB = wb; feldH = wh; paar('a', wb, wh); }
  const [hb, hh2] = seitenMass(WELLE_SEITE);
  if (hb !== welleB || hh2 !== welleH) { welleB = hb; welleH = hh2; paar('h', hb, hh2); }
  // Körner: ein Raster im Seitenverhältnis des Bildschirms, Zustand in voller Genauigkeit (Orte dürfen nicht wandern)
  const gy = Math.round(Math.sqrt(KOERNER * innerHeight / innerWidth)), gx = Math.round(KOERNER / gy);
  if (gx !== kornGx || gy !== kornGy) {
    kornGx = gx; kornGy = gy;
    const a = ziel32('korn0', gx, gy), c = ziel32('korn1', gx, gy);
    if (a.ok && c.ok) { const p = ziele.korn = { nr: 0 }; p.lesen = () => (p.nr ? c : a); p.schreiben = () => (p.nr ? a : c); p.tauschen = () => { p.nr = 1 - p.nr; }; koernerAn = true; koernerNeu = true; }
    else { koernerAn = false; spur('Körner aus (kein Float-Ziel)'); }
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
  videoEl.play().then(() => { quelle = videoEl; spiegelnQuelle = false; starten(); }).catch(() => melden(TEXTE[sprache].keineKamera));
}

// Beispiele: Christians Porträt «Wan, Pendel» und «Infinite Mantra» (liegen beim Kristall); jedes Tippen nimmt das nächste
const BEISPIELE = ['../kristall/beispiel.mp4?v=2', '../kristall/mantra.mp4?v=1'];
function beispielStarten(e) {
  let nr = 0;
  try { nr = e ? (+(localStorage.getItem('wahrnehmung.beispiel') || 0)) % BEISPIELE.length : 0; localStorage.setItem('wahrnehmung.beispiel', String(nr + 1)); } catch {}
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
  const film = alle.find((f) => f.type.startsWith('video/'));
  if (film) return videoStarten(film);
  const bilder = alle.filter((f) => f.type.startsWith('image/'));
  if (bilder.length) fotosStarten(bilder);
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
    try {
      const roh = await createImageBitmap(d);
      const s = Math.min(1, 2400 / Math.max(roh.width, roh.height));   // Telefonregel: höchstens 2400 Punkte
      fotos.push(s < 1 ? await createImageBitmap(roh, { resizeWidth: Math.round(roh.width * s), resizeHeight: Math.round(roh.height * s), resizeQuality: 'high' }) : roh);
      if (s < 1) roh.close();
    } catch { spur('Foto unlesbar'); }
  }
  if (!fotos.length) return melden(TEXTE[sprache].keineKamera);
  const alt = videoEl.srcObject; if (alt) alt.getTracks().forEach((t) => t.stop());
  videoEl.pause(); videoFrei();
  fotoBuehneGroesse();
  $('wenden').hidden = true; quelle = fotoBuehne; spiegelnQuelle = false; fotoStart = performance.now() / 1000; starten();
}
function fotoMalen(t) {
  const c = fotoBuehne.getContext('2d'), W = fotoBuehne.width, H = fotoBuehne.height;
  const zeit = t - fotoStart, n = fotos.length;
  const nr = Math.floor(zeit / FOTO_DAUER), innen = zeit - nr * FOTO_DAUER;
  const zeichne = (k, alpha) => {
    const f = fotos[((k % n) + n) % n], lauf = (zeit - k * FOTO_DAUER) / (FOTO_DAUER + FOTO_BLENDE);
    const z = 1.08 + 0.14 * (n === 1 ? 0.5 + 0.5 * Math.sin(zeit * 0.21) : lauf);
    const w = (n === 1 ? zeit * 0.13 : k * 2.4), rx = Math.cos(w) * 0.5, ry = Math.sin(w * 1.3) * 0.5;
    const s = Math.max(W / f.width, H / f.height) * z, b = f.width * s, h = f.height * s;
    c.globalAlpha = alpha;
    c.drawImage(f, (W - b) / 2 + rx * (b - W), (H - h) / 2 + ry * (h - H), b, h);
  };
  c.globalAlpha = 1; c.fillStyle = '#050506'; c.fillRect(0, 0, W, H);
  if (n === 1) { zeichne(0, 1); return; }
  zeichne(nr, 1);
  if (innen > FOTO_DAUER - FOTO_BLENDE) zeichne(nr + 1, (innen - (FOTO_DAUER - FOTO_BLENDE)) / FOTO_BLENDE);
  c.globalAlpha = 1;
}

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
const WERTE = [[0.6, 0.5, 0.5], [0.5, 0.5, 0.6], [0.5, 0.5, 0.45]];
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
  reglerBeschriften();
  lesartText();
  // jede Lesart beginnt unberührt: kein Schirm, keine Wellen, alle Körner an ihrem Platz
  if (war !== nr) { feldLeeren = true; welleLeeren = true; koernerNeu = true; menge = 0; }
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

// ---------- Stempel des Fingers ----------
// fest und gasförmig: Menge, die ins Feld fliesst; flüssig: Tiefe des Tropfens
const stempel = new Float32Array(16 * 4), stempelR = new Float32Array(16 * 4); let stempelN = 0;
const pinselRadius = () => 0.11 * (innerWidth < innerHeight ? 1 : 1.3);   // in Bildhöhen
function stempeln(x, y, menge, x0 = x, y0 = y, r = pinselRadius(), r0 = r) {
  if (stempelN < 16) { stempel.set([x0, y0, x, y], stempelN * 4); stempelR.set([r0, r, menge, 0], stempelN * 4); stempelN++; }
  else { const k = 15 * 4; stempel[k + 2] = x; stempel[k + 3] = y; stempelR[k + 1] = r; stempelR[k + 2] = Math.max(stempelR[k + 2], menge); }
}
// grobes Abbild für Klang, Ring und Glossen: wie viel ist ausgewählt, wie stark bewegt sich das Wasser?
let menge = 0, feldLeeren = true, welleLeeren = true;

// Nur im Vorspann führt eine unsichtbare Hand; sonst beginnt alles erst mit der Berührung (Christian, 19.11.2026)
const VORSPANN = Q.has('vorspann'), ZEIGE = Q.has('zeige');
let geisterStart = -1, geisterZug = 0, geisterTropfen = 0, geisterVor = null;
function geist(t, dt) {
  if (geisterStart < 0 || t < geisterStart) return;
  const u = (t - geisterStart) / 4.6;
  if (u > 1) { geisterStart = t + (lesart === 0 ? 2.6 : 1.8); geisterZug++; geisterVor = null; return; }
  const z = geisterZug, x = 0.5 + (z % 2 ? -0.1 : 0.08) + 0.09 * Math.sin(u * 2.7 + z), y = 0.58 + 0.07 * Math.cos(u * 2.1 + z * 1.7);
  if (lesart === 1) {
    if (t - geisterTropfen > 0.55) { geisterTropfen = t; stempeln(x, y, 1.6, x, y, pinselRadius() * 0.3, pinselRadius() * 0.3); }
  } else {
    stempeln(x, y, 1.1 * dt);
    if (lesart === 2 && geisterVor) fingerFeld.push([x, y, (x - geisterVor[0]) / dt, (y - geisterVor[1]) / dt]);
  }
  geisterVor = [x, y];
}

// ---------- Daumen: wo auflegen, und ein Ring, der sich füllt ----------
let daumenGelernt = false, haltZeit = 0;
function haltZeigen(x, y) { const h = $('halt'); h.style.left = x + 'px'; h.style.top = y + 'px'; h.classList.add('da'); }
function haltBild(dt) {
  if (finger.size) haltZeit += dt; else haltZeit = 0;
  $('halt-voll').style.strokeDashoffset = String(1 - Math.min(1, menge * 1.15));
  const gezogen = [...finger.values()].some((f) => f.bewegt > 120);
  if (!daumenGelernt && (haltZeit > 1.2 || gezogen)) { daumenGelernt = true; $('daumen').classList.add('weg'); setTimeout(() => { $('daumen').hidden = true; }, 800); }
}

// ---------- Gesten ----------
// fest: der ruhende Daumen lässt den Schirm wachsen, ziehen malt ihn; flüssig: Tropfen, gehalten im Takt, gezogen eine Bugwelle;
// gasförmig: halten löst die Körner, wischen nimmt sie mit.
const finger = new Map();
let fingerFeld = [];
const aufLeinwand = (cx, cy) => ({ x: cx / innerWidth, y: 1 - cy / innerHeight });
function tropfen(x, y, tiefe) {
  const r = pinselRadius() * 0.3;
  stempeln(x, y, tiefe * 1.8, x, y, r, r);
  klangTropfen(tiefe, x);
}
leinwand.addEventListener('pointerdown', (e) => {
  const t = performance.now() / 1000;
  finger.set(e.pointerId, { x: e.clientX, y: e.clientY, t: performance.now(), vx: 0, vy: 0, bewegt: 0, tropfen: t });
  leinwand.setPointerCapture(e.pointerId); $('geste').classList.add('weg');
  haltZeigen(e.clientX, e.clientY);
  geisterStart = -1;
  if (lesart === 1) { const p = aufLeinwand(e.clientX, e.clientY); tropfen(p.x, p.y, 1.0); }
  glosse(['ecran', 'eau', 'gaz'][lesart]);
});
leinwand.addEventListener('pointermove', (e) => {
  const f = finger.get(e.pointerId); if (!f) return;
  const jetzt = performance.now(), dt = Math.max(8, jetzt - f.t) / 1000;
  const dx = e.clientX - f.x, dy = e.clientY - f.y;
  const a = aufLeinwand(f.x, f.y), p = aufLeinwand(e.clientX, e.clientY);
  const tempo = Math.hypot(dx, dy) / dt;
  if (lesart === 1) {
    // Bugwelle: viele kleine Tropfen entlang des Wegs, schneller gezogen flacher
    const r = pinselRadius() * 0.16;
    stempeln(p.x, p.y, Math.min(0.5, 0.12 + tempo / 4000), a.x, a.y, r, r);
  } else {
    const r1 = pinselRadius() * Math.max(0.35, Math.min(1, 1.1 - tempo / 1800));
    stempeln(p.x, p.y, 0.08 + 0.05 * (lesart === 2 ? 1 : 0), a.x, a.y, r1, r1);
  }
  f.vx = dx / dt; f.vy = dy / dt; f.bewegt += Math.hypot(dx, dy);
  f.x = e.clientX; f.y = e.clientY; f.t = jetzt;
  haltZeigen(e.clientX, e.clientY);
});
const loslassen = (e) => {
  finger.delete(e.pointerId);
  if (finger.size === 0) $('halt').classList.remove('da');
};
leinwand.addEventListener('pointerup', loslassen);
leinwand.addEventListener('pointercancel', loslassen);

// ---------- Geführter Einstieg: zuerst Bild und Finger, dann die Lesarten, dann die Regler, zuletzt die Tasten ----------
const EINSTIEG = 'wahrnehmung.einstieg';
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
  einstiegBeginnen(); $('ton').hidden = false; tonZeigen(); grundNeu = true; alleNeu = true;
  $('auftakt').hidden = true; $('kopf').hidden = false; $('regler').hidden = false;
  $('geste').textContent = TEXTE[sprache].lesarten[lesart].geste; $('geste').hidden = false; $('geste').classList.remove('weg');
  setTimeout(() => $('geste').classList.add('weg'), 5500);
  if (!VORSPANN && !daumenGelernt) { $('daumen').hidden = false; $('daumen').classList.remove('weg'); }
  groesse();
  if (VORSPANN && geisterStart < 0) geisterStart = performance.now() / 1000 + 1.6;
  if (!laeuft && gl && P.fest) { laeuft = true; requestAnimationFrame(bild); }
}

// ---------- Schleife ----------
let grundNeu = true, alleNeu = true, grundStart = 0, standbildWunsch = false, ersterLauf = true, letzteMs = 0, bilderGezaehlt = 0, wellenEnergie = 0;
function bild(ms) {
  const t = ms / 1000;
  if (quelle === fotoBuehne) fotoMalen(performance.now() / 1000);
  const dtMs = ms - (letzteMs || ms - 16.7), dt = Math.min(0.1, Math.max(0.004, dtMs / 1000)); letzteMs = ms;
  tempoMessen(ms, dtMs);
  if (!scharfFangen()) { requestAnimationFrame(bild); return; }
  const seite = innerWidth / innerHeight;

  // 1. die Gegenwart in Arbeitsgrösse; die vorige bleibt für die Bewegung
  const J = ziele.jetzt;
  if (neuesBild) J.tauschen();
  rechne(P.kopie, J.schreiben(), { uQ: scharfTex });
  const jetzt = J.schreiben(), vor = J.lesen();

  // 2. der ruhende Grund (langsam) und alle Momente zugleich (fest: das Bild an sich)
  const G = ziele.grund;
  rechne(P.grund, G.schreiben(), { uAlt: G.lesen(), uJetzt: jetzt }, (u) => gl.uniform1f(u.uRate, grundNeu ? 1 : 1 - Math.exp(-dt / (t - grundStart < 1 ? 0.2 : 5))));
  G.tauschen(); if (grundNeu) grundStart = t; grundNeu = false;
  const E = ziele.alle;
  if (lesart === 0) { rechne(P.ema, E.schreiben(), { uAlt: E.lesen(), uJetzt: jetzt }, (u) => gl.uniform1f(u.uRate, alleNeu ? 1 : 1 - Math.exp(-dt / 1.6))); E.tauschen(); alleNeu = false; }
  else alleNeu = true;

  // 3. der optische Fluss zwischen dem vorigen und diesem Bild (nur wenn ein neues kam)
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
  } else rechne(P.fglatt, FL.schreiben(), { uF: FL.lesen(), uAlt: FL.lesen() }, (u) => { gl.uniform2f(u.uPx, 0, 0); gl.uniform1f(u.uNeu, 0); });
  FL.tauschen();
  const fluss = FL.lesen();

  // 4. das Interesse
  const I = ziele.i;
  rechne(P.interesse, I.schreiben(), { uAlt: I.lesen(), uFl: fluss, uL0: ziele.lum0, uL2: ziele.lum2, uJetzt: jetzt, uGrund: G.lesen() }, (u) => {
    gl.uniform2f(u.uPx, 1 / flussB, 1 / I.lesen().h); gl.uniform1f(u.uNeu, neuesBild ? 1 : 0); gl.uniform1f(u.uDt, dt);
  });
  I.tauschen();
  const interesse = I.lesen();

  // 5. die Finger
  fingerFeld = [];
  for (const f of finger.values()) {
    const p = aufLeinwand(f.x, f.y), ruhig = Math.max(0, 1 - Math.hypot(f.vx, f.vy) / 900);
    if (lesart === 1) {
      // gehalten: ein Tropfen im Takt, wie ein Herzschlag auf dem Wasser
      if (t - f.tropfen > 0.5) { f.tropfen = t; tropfen(p.x, p.y, 0.55 + 0.25 * ruhig); }
    } else stempeln(p.x, p.y, (0.3 + 0.9 * ruhig) * dt);
    if (lesart === 2) fingerFeld.push([p.x, p.y, f.vx / innerHeight * 0.35, -f.vy / innerHeight * 0.35]);
    f.vx *= Math.pow(0.02, dt); f.vy *= Math.pow(0.02, dt);
  }
  if (geisterStart > 0) geist(t, dt);

  // 6a. fest und gasförmig: das Feld des Daumens
  const A = ziele.a;
  if (lesart !== 1) {
    if (feldLeeren) { for (const z of [A.lesen(), A.schreiben()]) { gl.bindFramebuffer(gl.FRAMEBUFFER, z.fb); gl.clearColor(0, 0, 0, 1); gl.clear(gl.COLOR_BUFFER_BIT); } feldLeeren = false; }
    const halten = lesart === 0 ? 1.2 + 9 * WERTE[0][2] : 0.8 + 10 * WERTE[2][1];
    const wachs = lesart === 0 ? 0.35 + 1.2 * WERTE[0][2] : 0.6;
    rechne(P.feld, A.schreiben(), { uAlt: A.lesen(), uI: interesse }, (u) => {
      gl.uniform2f(u.uPx, 1 / feldB, 1 / feldH); gl.uniform4fv(u.uStempel, stempel); gl.uniform4fv(u.uStempelR, stempelR);
      gl.uniform1i(u.uN, stempelN); gl.uniform1f(u.uAb, dt / halten); gl.uniform1f(u.uSchritt, FELD_SEITE / 256); gl.uniform1f(u.uSeite, seite);
      gl.uniform1f(u.uWachs, wachs); gl.uniform1f(u.uFolgen, lesart === 0 ? 1 : 0);
    });
    A.tauschen();
    let summe = 0; for (let i = 0; i < stempelN; i++) summe += stempelR[i * 4 + 2];
    menge = Math.max(0, Math.min(1, menge + summe * 0.6 - dt / halten * (0.3 + menge)));
  }
  // 6b. flüssig: die Wasserfläche, zwei Schritte je Bild
  const Hh = ziele.h;
  if (lesart === 1) {
    if (welleLeeren) { for (const z of [Hh.lesen(), Hh.schreiben()]) { gl.bindFramebuffer(gl.FRAMEBUFFER, z.fb); gl.clearColor(0, 0, 0, 1); gl.clear(gl.COLOR_BUFFER_BIT); } welleLeeren = false; }
    const daempf = 0.9993 - 0.012 * Math.pow(1 - WERTE[1][1], 1.5);
    for (let s = 0; s < 2; s++) {
      rechne(P.welle, Hh.schreiben(), { uH: Hh.lesen(), uI: interesse }, (u) => {
        gl.uniform2f(u.uPx, 1 / welleB, 1 / welleH); gl.uniform1f(u.uDaempf, daempf); gl.uniform1f(u.uSeite, seite);
        gl.uniform4fv(u.uStempel, stempel); gl.uniform4fv(u.uStempelR, stempelR); gl.uniform1i(u.uN, s === 0 ? stempelN : 0);
        // die Bewegung im Bild setzt erst Wellen, wenn das Wasser berührt wurde (kein Autostart, Christian 19.11.2026)
        gl.uniform1f(u.uBild, s === 0 && neuesBild ? (0.004 + 0.02 * WERTE[1][1]) * Math.min(1, wellenEnergie * 2) : 0);
      });
      Hh.tauschen();
    }
    let summe = 0; for (let i = 0; i < stempelN; i++) summe += stempelR[i * 4 + 2];
    wellenEnergie = Math.min(1, wellenEnergie * Math.exp(-dt / (0.8 + 3 * WERTE[1][1])) + summe * 0.35);
    menge = wellenEnergie;
  }
  stempelN = 0;

  // 6c. gasförmig: die Körner
  if (lesart === 2 && koernerAn) {
    const K = ziele.korn;
    const fi = new Float32Array(16); fingerFeld.slice(0, 4).forEach((f, k) => fi.set(f, k * 4));
    // Videobilder je Sekunde schätzen, damit der Fluss in Bildanteile je Sekunde umgerechnet werden kann
    const fps = quelle === videoEl && !videoEl.srcObject ? 16 : 30;
    rechne(P.koerner, K.schreiben(), { uS: K.lesen(), uFl: fluss, uA: A.lesen() }, (u) => {
      gl.uniform2f(u.uGitter, kornGx, kornGy); gl.uniform1f(u.uDt, dt); gl.uniform1f(u.uT, t % 1000); gl.uniform1f(u.uWind, WERTE[2][0]);
      gl.uniform1f(u.uSeite, seite); gl.uniform1f(u.uStart, koernerNeu ? 1 : 0); gl.uniform1f(u.uFps, fps);
      gl.uniform4fv(u.uFinger, fi); gl.uniform1i(u.uFN, Math.min(4, fingerFeld.length)); gl.uniform1f(u.uFingerR, pinselRadius() * 0.9);
    });
    K.tauschen(); koernerNeu = false;
  }

  // 7. die Lesart
  const sz = zielBauen('szene', leinwand.width, leinwand.height, false);
  const rahmenGL = [rahmen[0], rahmen[1], rahmen[2], rahmen[3]];
  if (lesart === 0) {
    rechne(P.fest, sz, { uScharf: scharfTex, uE: E.lesen(), uA: A.lesen(), uI: interesse }, (u) => {
      gl.uniform1f(u.uLicht, WERTE[0][0]); gl.uniform1f(u.uZeige, ZEIGE ? 1 : 0); gl.uniform1f(u.uInteresse, WERTE[0][1]); gl.uniform1f(u.uT, t % 1000); gl.uniform1f(u.uSeite, seite);
      gl.uniform4f(u.uRahmen, ...rahmenGL);
    });
  } else if (lesart === 1) {
    rechne(P.fluessig, sz, { uScharf: scharfTex, uJetzt: jetzt, uH: Hh.lesen(), uI: interesse }, (u) => {
      gl.uniform2f(u.uPxH, 1 / welleB, 1 / welleH); gl.uniform1f(u.uTiefe, WERTE[1][0]); gl.uniform1f(u.uFunkeln, WERTE[1][2]);
      gl.uniform1f(u.uSeite, seite); gl.uniform1f(u.uT, t % 1000); gl.uniform4f(u.uRahmen, ...rahmenGL);
    });
  } else {
    gl.bindFramebuffer(gl.FRAMEBUFFER, sz.fb); gl.viewport(0, 0, sz.b, sz.h);
    gl.clearColor(0.02, 0.02, 0.024, 1); gl.clear(gl.COLOR_BUFFER_BIT);
    if (koernerAn) kornZeichnen(sz, jetzt, A.lesen(), seite);
    else rechne(P.kopie, sz, { uQ: scharfTex });   // ohne Float-Ziel keine Körner: dann wenigstens das Bild
  }
  nachbearbeiten(t);
  haltBild(dt);
  klangBild({ lesart, menge, finger: finger.size, werte: WERTE[lesart], dt });
  if (standbildWunsch) { standbildWunsch = false; leinwand.toBlob((b) => b && zeigen(b, 'wahrnehmung-' + zeitstempel() + '.png')); }
  if (ersterLauf && bilderGezaehlt > 2) { ersterLauf = false; spur('✓ läuft'); }
  requestAnimationFrame(bild);
}
function kornZeichnen(sz, bildTex, feld, seite) {
  const p = P.korn;
  gl.useProgram(p);
  gl.activeTexture(gl.TEXTURE1); gl.bindTexture(gl.TEXTURE_2D, ziele.korn.lesen().tex); gl.uniform1i(p.u.uS, 1);
  gl.activeTexture(gl.TEXTURE2); gl.bindTexture(gl.TEXTURE_2D, bildTex.tex); gl.uniform1i(p.u.uBild, 2);
  gl.activeTexture(gl.TEXTURE3); gl.bindTexture(gl.TEXTURE_2D, feld.tex); gl.uniform1i(p.u.uA, 3);
  gl.uniform2i(p.u.uGitter, kornGx, kornGy); gl.uniform1f(p.u.uSeite, seite);
  gl.uniform1f(p.u.uGroesse, WERTE[2][2]); gl.uniform1f(p.u.uStreck, 6);
  gl.enable(gl.BLEND); gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
  gl.drawArraysInstanced(gl.TRIANGLE_STRIP, 0, 4, kornGx * kornGy);
  gl.disable(gl.BLEND);
}
function nachbearbeiten(t) {
  const B = leinwand.width, H = leinwand.height, b4 = Math.max(1, Math.round(B / 4)), h4 = Math.max(1, Math.round(H / 4));
  const sz = ziele.szene, gA = zielBauen('glowA', b4, h4), gB = zielBauen('glowB', b4, h4);
  // im Licht der festen Lesart leuchtet nur, was heller ist als die Milch
  rechne(P.hell, gA, { uQ: sz }, (u) => { gl.uniform2f(u.uPx, 1.5 / B, 1.5 / H); gl.uniform1f(u.uAb, lesart === 0 ? 0.96 : 0.62); });
  rechne(P.weich, gB, { uQ: gA }, (u) => gl.uniform2f(u.uRichtung, 1.6 / b4, 0));
  rechne(P.weich, gA, { uQ: gB }, (u) => gl.uniform2f(u.uRichtung, 0, 1.6 / h4));
  rechne(P.zusammen, null, { uSzene: sz, uGlow: gA }, (u) => {
    gl.uniform2f(u.uPx, 1 / B, 1 / H); gl.uniform1f(u.uGlowStaerke, [0.25, 0.4, 0.55][lesart]);
    gl.uniform3f(u.uGlowFarbe, ...(lesart === 1 ? [0.85, 0.97, 1.0] : [1, 1, 1])); gl.uniform1f(u.uT, t % 100);
    gl.uniform1f(u.uKorn, [0.035, 0.03, 0.02][lesart]);
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
    zeigen(b, 'wahrnehmung-' + zeitstempel() + (b.type.includes('mp4') ? '.mp4' : '.webm'));
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
    return 'Wahrnehmung ' + (document.querySelector('script[src*="wahrnehmung.js"]')?.getAttribute('src') || '') + '\n' + navigator.userAgent + '\nGrafik: ' + (grafikName || '?') +
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

// Einstieg: «Fest» (Vorschlag 20.11.2026, Wahl durch Christian offen)
lesartWaehlen(0, true);
uebersetzen();
// Direktstart für Tests und Vorführungen: ?beispiel, ?lesart=0|1|2
if (Q.has('lesart')) lesartWaehlen(Math.max(0, Math.min(2, +Q.get('lesart') || 0)), true);
if (Q.has('beispiel')) beispielStarten();
// für Prüfungen: Werte setzen und den Finger von aussen führen
window.__wahrnehmung = { WERTE, stempeln, tropfen, finger, lesartWaehlen, fingerFeld: () => fingerFeld };
