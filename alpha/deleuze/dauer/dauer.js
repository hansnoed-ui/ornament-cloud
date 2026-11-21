// Dauer – Operator III von the deleuzian scheme (Bergson, «la durée»; Deleuze, Le bergsonisme, 1966; Cinéma 1, Kapitel 1)
// Die Uhr zerlegt die Bewegung in Momente; wo der Finger wartet, durchdringen sie sich zur Dauer.
// Drei Lesarten: Uhr (Marey, die verräumlichte Zeit), Zucker (Bergson 1907, «il faut attendre que le sucre fonde»),
// Spannung (Matière et mémoire, Kapitel IV: Rhythmen der Dauer, Kontraktion und Entspannung).
// WebGL2, ohne Bibliotheken, ohne CDN. Aufbau, Quellen, Aufnahme, Glossen und Einstieg wie Schichten der Zeit.

import { klangStarten, klangBild, klangAn, klangIstAn, klangSpur, klangTakt, klangBruch } from './klang.js?v=2';
import { aufnahmeDatei } from '../gemeinsam/aufnahme.js?v=1';
import { fotoLesen, istVideo, istFoto, istHeic, dateiMeldung, fotosMalen, fahrtSchalter, FAHRT_SVG, rahmen as fotoRahmen, rahmenSetzen, neuesBildKnopf } from '../gemeinsam/fotos.js?v=6';

const $ = (id) => document.getElementById(id);
const Q = new URLSearchParams(location.search);

// ---------- Sprache ----------
const TEXTE = {
  de: {
    titel: 'Dauer', satz: 'Die Uhr zerlegt die Zeit in Momente. Wer wartet, spürt, wie sie ineinander schmelzen.',
    kamera: 'Kamera', video: 'Video oder Fotos', beispiel: 'Beispiel', lesart: 'Lesart',
    glossen: {
      warten: { begriff: 'la durée', satz: 'Wo du wartest, hört die Zeit auf, aus Momenten zu bestehen. Sie durchdringen sich wie die Töne einer Melodie.', zitat: '«… comme il arrive quand nous nous rappelons, fondues pour ainsi dire ensemble, les notes d’une mélodie.»', quelle: 'Bergson, Essai sur les données immédiates de la conscience, 1889, Kap. II' },
      lesarten: { begriff: 'trois lectures', satz: 'Drei Arten, die Dauer zu lesen: gegen die Uhr, im Warten, in der Spannung.', zitat: '', quelle: 'Deleuze, Le bergsonisme, PUF 1966' },
      takt: { begriff: 'l’instant quelconque', satz: 'Die Uhr schneidet in gleichen Abständen. Kein Moment ist ausgezeichnet, jeder ist irgendeiner.', zitat: '', quelle: 'Deleuze, L’image-mouvement, Minuit 1983, Kap. 1, sinngemäss' },
      linien: { begriff: 'la chronophotographie géométrique', satz: 'Marey kleidete seine Läufer schwarz und nähte weisse Streifen auf die Glieder. Auf der Platte blieb ein Gerippe aus Linien, Moment neben Moment.', zitat: '', quelle: 'Marey, Le mouvement, 1894' },
      bruch: { begriff: 'le mécanisme cinématographique', satz: 'Lässt du los, zerfällt die Dauer wieder in Momente, wie Glas in Scherben. So arbeitet der Verstand: Er schneidet Momentaufnahmen aus dem, was fliesst.', zitat: '«Nous prenons des vues quasi instantanées sur la réalité qui passe …»', quelle: 'Bergson, L’évolution créatrice, 1907, Kap. IV' },
      momente: { begriff: 'les coupes immobiles', satz: 'Aus unbewegten Schnitten lässt sich keine Bewegung zusammensetzen, wie viele man auch nimmt.', zitat: '«… le mécanisme de notre connaissance usuelle est de nature cinématographique.»', quelle: 'Bergson, L’évolution créatrice, 1907, Kap. IV' },
      schmelze: { begriff: 'la multiplicité qualitative', satz: 'Grau bleiben die gezählten Momente. In der Dauer kehrt die Farbe zurück: Sie ist Qualität, nicht Menge.', zitat: '', quelle: 'Bergson, Essai, 1889, Kap. II, sinngemäss' },
      wartenR: { begriff: 'attendre', satz: 'Die Zeit des Wartens lässt sich nicht verkürzen. Hier bestimmst du, wie lange sich das Vergangene hält.', zitat: '«Si je veux me préparer un verre d’eau sucrée, j’ai beau faire, je dois attendre que le sucre fonde.»', quelle: 'Bergson, L’évolution créatrice, 1907, Kap. I' },
      wirbel: { begriff: 'le changement', satz: 'Die Vergangenheit bleibt nicht liegen, sie löst sich und strömt. Wirbel geben ihr die Bewegung.', zitat: '', quelle: 'Bergson, La pensée et le mouvant, 1934, sinngemäss' },
      schlieren: { begriff: 'l’interpénétration', satz: 'Wo Vergangenes und Gegenwärtiges sich mischen, bricht sich das Licht wie in Zuckerwasser.', zitat: '', quelle: 'Bergson, Essai, 1889, Kap. II, sinngemäss' },
      spannung: { begriff: 'la tension', satz: 'Gespannt zieht ein Bewusstsein viel Zeit in einen Augenblick zusammen; entspannt zerfällt es in Schwingungen wie die Materie.', zitat: '«En réalité, il n’y a pas un rythme unique de la durée.»', quelle: 'Bergson, Matière et mémoire, 1896, Kap. IV' },
      rhythmus: { begriff: 'les rythmes', satz: 'Jede Stelle des Bildes hat ihre eigene Dauer. Hier wählst du, welchen Rhythmus du hörst: schnell in Gold, langsam in Rot.', zitat: '', quelle: 'Deleuze, Le bergsonisme, 1966, Kap. 4, sinngemäss' },
      glut: { begriff: 'la contraction', satz: 'Was zu schnell ist, um es zu sehen, wird hier verstärkt: der Puls in einem Gesicht, das Flimmern einer Lampe.', zitat: '', quelle: 'Wu, Rubinstein u. a., Eulerian Video Magnification, MIT 2012' }
    },
    regler: [['Takt', 'Momente', 'Schmelze'], ['Warten', 'Wirbel', 'Schlieren'], ['Spannung', 'Rhythmus', 'Glut']],
    reglerGlosse: [['takt', 'momente', 'schmelze'], ['wartenR', 'wirbel', 'schlieren'], ['spannung', 'rhythmus', 'glut']],
    lesarten: [
      { kurz: 'Uhr', titel: 'Die Uhr', wer: 'Marey', geste: 'Den Finger ruhen lassen: dort schmilzt die Zeit.', text: 'Étienne-Jules Marey zerlegte ab 1882 die Bewegung in Momente: Vor einem schwarzen Schuppen hielt seine Flinte den Läufer zwölfmal in der Sekunde fest, alle Bilder auf einer Platte. Für Bergson ist das der Fehler unseres Denkens überhaupt: Es setzt die Bewegung aus unbewegten Schnitten zusammen, wie ein Kinematograph. Hier stehen die Momente grau nebeneinander, gezählt wie von einer Uhr. Wo dein Finger wartet, schmelzen sie ineinander, und die Farbe kehrt zurück.' },
      { kurz: 'Zucker', titel: 'Der Zucker', wer: 'Bergson', geste: 'Halten und warten: das Vergangene löst sich im Jetzt.', text: '«Will ich mir ein Glas Zuckerwasser bereiten, so muss ich, was ich auch tue, warten, bis der Zucker sich auflöst.» Mit diesem Satz zeigt Bergson, dass Zeit nicht beliebig zu verkürzen ist: Die Dauer des Wartens fällt mit meiner eigenen zusammen. Deleuze greift das Glas Zuckerwasser zu Beginn von «Das Bewegungs-Bild» auf. Wo du hältst, löst sich das Vergangene und strömt in Schlieren durch die Gegenwart; ziehst du, rührst du um.' },
      { kurz: 'Spannung', titel: 'Die Spannung', wer: 'Bergson', geste: 'Wo du wartest, zieht sich die Zeit zusammen.', text: 'In «Materie und Gedächtnis» beschreibt Bergson viele Dauern: Das rote Licht schwingt Billionen Mal in der Sekunde, wir ziehen es zu einer einzigen Farbe zusammen. Ein gespannteres Bewusstsein umfasst mehr Zeit in einem Augenblick, ein entspanntes zerfällt in Schwingungen, wie die Materie. Hier zeigt der obere Regler die Spannung: entspannt bleiben nur die Rhythmen des Bildes, schnelle in Gold, langsame in Rot; gespannt zieht sich alles Vergangene zu Licht zusammen. Wo du wartest, steigt die Spannung.' }
    ],
    wenden: 'Kamera wenden', tonAn: 'Ton an', tonAus: 'Ton aus',
    begriff: 'Begriff', standbild: 'Standbild', aufnahme: 'Aufnahme', stopp: 'Stopp',
    teilen: 'Teilen', sichern: 'Sichern', komma: '.', 'ergebnis-hinweis': 'Gesichert im Ordner «Downloads». «Teilen» legt es direkt in die Galerie oder eine App.',
    keineAufnahme: 'Dieser Browser kann die Leinwand nicht aufnehmen. Das Standbild geht.',
    geste: 'Den Finger ruhen lassen: dort schmilzt die Zeit.',
    daumen: 'Daumen auflegen und warten',
    familie: 'Zeit · Le bergsonisme, Kapitel 2', 'b-titel': 'Dauer',
    'b-text': [
      'Henri Bergson unterscheidet zwei Zeiten. Die eine misst die Uhr: gleiche Abschnitte, nebeneinander gereiht wie Punkte auf einer Linie. Sie ist eigentlich Raum. Die andere erleben wir: Die Momente folgen nicht aufeinander, sie durchdringen sich, wie die Töne einer Melodie, von denen jeder den vorigen in sich trägt. Diese Zeit nennt Bergson Dauer, «la durée».',
      'Deleuze liest Bergsons Dauer 1966 als Vielheit eigener Art: nicht eine Menge gleicher Teile, die man zählen kann, sondern eine qualitative Vielheit, die sich nicht teilen lässt, ohne ihre Art zu ändern. Dauer ist Gedächtnis, das Vergangene erhält sich im Gegenwärtigen. Im Kino beginnt Deleuze 1983 mit Bergsons Kritik: Das Kino setzt die Bewegung aus unbewegten Schnitten zusammen, aber es zeigt auch, wie sich ein Ganzes in der Zeit verändert.',
      'Hier beginnt alles mit der Uhr. Was sich bewegt, steht als Folge grauer Momente auf Schwarz, wie bei Marey. Erst wo du den Finger ruhen lässt, also wartest, schmelzen die Momente: Die Farbe kehrt zurück, das Vergangene hält sich im Jetzt.'
    ],
    'b-frage': 'Spürst du einen Unterschied zwischen den grauen Momenten und der geschmolzenen Zeit, oder ist beides nur ein anderes Bild? Achte darauf, ob du die Dauer betrachtest oder ob du selbst gewartet hast.',
    'b-quelle': 'Gilles Deleuze, Le bergsonisme, Paris: PUF 1966, Kapitel 2 «La durée comme donnée immédiate». Deutsch: Henri Bergson zur Einführung, Junius. Gilles Deleuze, L’image-mouvement (Cinéma 1), Paris: Minuit 1983, Kapitel 1. Henri Bergson, Essai sur les données immédiates de la conscience, 1889; Matière et mémoire, 1896; L’évolution créatrice, 1907.',
    keineKamera: 'Die Kamera lässt sich nicht öffnen. Wähle ein Video, Fotos oder das Beispiel.',
    keinGL: 'Dieses Gerät kann WebGL 2 nicht anzeigen. Die Dauer braucht es.',
    kontextWeg: 'Die Grafik ist ausgestiegen. Bitte die Seite neu laden.'
  },
  en: {
    titel: 'Duration', satz: 'The clock cuts time into moments. Whoever waits feels them melt into one another.',
    kamera: 'Camera', video: 'Video or photos', beispiel: 'Example', lesart: 'Reading',
    glossen: {
      warten: { begriff: 'la durée', satz: 'Where you wait, time stops consisting of moments. They interpenetrate like the notes of a melody.', zitat: '« … comme il arrive quand nous nous rappelons, fondues pour ainsi dire ensemble, les notes d’une mélodie. »', quelle: 'Bergson, Time and Free Will (Essai), 1889, ch. II (original)' },
      lesarten: { begriff: 'trois lectures', satz: 'Three ways to read duration: against the clock, in waiting, in tension.', zitat: '', quelle: 'Deleuze, Bergsonism, 1966' },
      takt: { begriff: 'l’instant quelconque', satz: 'The clock cuts at equal intervals. No moment is privileged; each is any-instant-whatever.', zitat: '', quelle: 'Deleuze, The Movement-Image, 1983, ch. 1, paraphrased' },
      linien: { begriff: 'la chronophotographie géométrique', satz: 'Marey dressed his runners in black and sewed white stripes along their limbs. On the plate a skeleton of lines remained, moment beside moment.', zitat: '', quelle: 'Marey, Le mouvement, 1894' },
      bruch: { begriff: 'le mécanisme cinématographique', satz: 'Let go, and duration falls back into moments, like glass into shards. This is how the intellect works: it cuts snapshots out of what flows.', zitat: '« Nous prenons des vues quasi instantanées sur la réalité qui passe … »', quelle: 'Bergson, Creative Evolution, 1907, ch. IV (original)' },
      momente: { begriff: 'les coupes immobiles', satz: 'No movement can be assembled from immobile sections, however many one takes.', zitat: '« … le mécanisme de notre connaissance usuelle est de nature cinématographique. »', quelle: 'Bergson, Creative Evolution, 1907, ch. IV (original)' },
      schmelze: { begriff: 'la multiplicité qualitative', satz: 'The counted moments stay grey. In duration colour returns: it is quality, not quantity.', zitat: '', quelle: 'Bergson, Time and Free Will, 1889, ch. II, paraphrased' },
      wartenR: { begriff: 'attendre', satz: 'The time of waiting cannot be shortened. Here you decide how long the past holds.', zitat: '« Si je veux me préparer un verre d’eau sucrée, j’ai beau faire, je dois attendre que le sucre fonde. »', quelle: 'Bergson, Creative Evolution, 1907, ch. I (original)' },
      wirbel: { begriff: 'le changement', satz: 'The past does not stay put, it dissolves and flows. Eddies give it movement.', zitat: '', quelle: 'Bergson, The Creative Mind, 1934, paraphrased' },
      schlieren: { begriff: 'l’interpénétration', satz: 'Where past and present mix, light bends as in sugared water.', zitat: '', quelle: 'Bergson, Time and Free Will, 1889, ch. II, paraphrased' },
      spannung: { begriff: 'la tension', satz: 'Tense, a consciousness contracts much time into an instant; relaxed, it falls apart into vibrations, like matter.', zitat: '« En réalité, il n’y a pas un rythme unique de la durée. »', quelle: 'Bergson, Matter and Memory, 1896, ch. IV (original)' },
      rhythmus: { begriff: 'les rythmes', satz: 'Each place in the image has its own duration. Here you choose which rhythm you hear: fast in gold, slow in red.', zitat: '', quelle: 'Deleuze, Bergsonism, 1966, ch. 4, paraphrased' },
      glut: { begriff: 'la contraction', satz: 'What is too fast to be seen is amplified here: the pulse in a face, the flicker of a lamp.', zitat: '', quelle: 'Wu, Rubinstein et al., Eulerian Video Magnification, MIT 2012' }
    },
    regler: [['Interval', 'Moments', 'Melting'], ['Waiting', 'Eddies', 'Schlieren'], ['Tension', 'Rhythm', 'Glow']],
    reglerGlosse: [['takt', 'momente', 'schmelze'], ['wartenR', 'wirbel', 'schlieren'], ['spannung', 'rhythmus', 'glut']],
    lesarten: [
      { kurz: 'Clock', titel: 'The clock', wer: 'Marey', geste: 'Let your finger rest: time melts there.', text: 'From 1882 Étienne-Jules Marey cut movement into moments: in front of a black shed his photographic gun caught a runner twelve times a second, all images on one plate. For Bergson this is the very error of our thinking: it assembles movement from immobile sections, like a cinematograph. Here the moments stand side by side in grey, counted as by a clock. Where your finger waits, they melt into one another, and colour returns.' },
      { kurz: 'Sugar', titel: 'The sugar', wer: 'Bergson', geste: 'Hold and wait: the past dissolves into the now.', text: '“If I want to mix a glass of sugar and water, I must, willy-nilly, wait until the sugar melts.” With this sentence Bergson shows that time cannot be shortened at will: the duration of waiting coincides with my own. Deleuze takes up the glass of sugared water at the start of “The Movement-Image”. Where you hold, the past dissolves and streams in schlieren through the present; drag, and you stir.' },
      { kurz: 'Tension', titel: 'The tension', wer: 'Bergson', geste: 'Where you wait, time contracts.', text: 'In “Matter and Memory” Bergson describes many durations: red light vibrates trillions of times a second, and we contract it into a single colour. A tenser consciousness grasps more time in an instant, a relaxed one falls apart into vibrations, like matter. Here the top slider is tension: relaxed, only the rhythms of the image remain, fast in gold, slow in red; tense, all the past contracts into light. Where you wait, tension rises.' }
    ],
    wenden: 'Flip camera', tonAn: 'Sound on', tonAus: 'Sound off',
    begriff: 'Concept', standbild: 'Still', aufnahme: 'Record', stopp: 'Stop',
    teilen: 'Share', sichern: 'Save', komma: '.', 'ergebnis-hinweis': 'Saved to your “Downloads” folder. “Share” sends it straight to your gallery or an app.',
    keineAufnahme: 'This browser cannot record the canvas. Stills work.',
    geste: 'Let your finger rest: time melts there.',
    daumen: 'Rest your thumb here and wait',
    familie: 'Time · Bergsonism, chapter 2', 'b-titel': 'Duration',
    'b-text': [
      'Henri Bergson distinguishes two times. One is measured by the clock: equal sections, lined up side by side like points on a line. It is really space. The other we live: the moments do not follow one another, they interpenetrate, like the notes of a melody, each carrying the one before. Bergson calls this time duration, “la durée”.',
      'In 1966 Deleuze reads Bergson’s duration as a multiplicity of its own kind: not a quantity of equal parts that can be counted, but a qualitative multiplicity that cannot be divided without changing in kind. Duration is memory; the past is preserved in the present. In cinema, Deleuze begins in 1983 with Bergson’s critique: cinema assembles movement from immobile sections, yet it also shows how a whole changes in time.',
      'Here everything begins with the clock. Whatever moves stands as a series of grey moments on black, as in Marey. Only where you let your finger rest, that is, where you wait, do the moments melt: colour returns, the past holds in the now.'
    ],
    'b-frage': 'Do you feel a difference between the grey moments and the melted time, or is it only another image? Notice whether you are looking at duration or whether you yourself have waited.',
    'b-quelle': 'Gilles Deleuze, Le bergsonisme, Paris: PUF 1966, chapter 2. English: Bergsonism, Zone Books 1988. Gilles Deleuze, L’image-mouvement (Cinéma 1), Paris: Minuit 1983, chapter 1. English: Cinema 1: The Movement-Image, University of Minnesota Press 1986. Henri Bergson, Time and Free Will, 1889; Matter and Memory, 1896; Creative Evolution, 1907.',
    keineKamera: 'The camera cannot be opened. Choose a video, photos or the example.',
    keinGL: 'This device cannot show WebGL 2, which duration needs.',
    kontextWeg: 'The graphics stopped. Please reload the page.'
  },
  fr: {
    titel: 'La durée', satz: 'L’horloge découpe le temps en instants. Qui attend les sent fondre les uns dans les autres.',
    kamera: 'Caméra', video: 'Vidéo ou photos', beispiel: 'Exemple', lesart: 'Lecture',
    glossen: {
      warten: { begriff: 'la durée', satz: 'Là où tu attends, le temps cesse d’être fait d’instants. Ils se pénètrent comme les notes d’une mélodie.', zitat: '« … comme il arrive quand nous nous rappelons, fondues pour ainsi dire ensemble, les notes d’une mélodie. »', quelle: 'Bergson, Essai sur les données immédiates de la conscience, 1889, ch. II' },
      lesarten: { begriff: 'trois lectures', satz: 'Trois manières de lire la durée : contre l’horloge, dans l’attente, dans la tension.', zitat: '', quelle: 'Deleuze, Le bergsonisme, PUF 1966' },
      takt: { begriff: 'l’instant quelconque', satz: 'L’horloge coupe à intervalles égaux. Aucun instant n’est privilégié, chacun est quelconque.', zitat: '', quelle: 'Deleuze, L’image-mouvement, Minuit 1983, ch. 1, en substance' },
      linien: { begriff: 'la chronophotographie géométrique', satz: 'Marey habillait ses coureurs de noir et cousait des bandes blanches le long des membres. Sur la plaque restait un squelette de lignes, instant après instant.', zitat: '', quelle: 'Marey, Le mouvement, 1894' },
      bruch: { begriff: 'le mécanisme cinématographique', satz: 'Quand tu lâches, la durée retombe en instants, comme le verre en éclats. Ainsi procède l’intelligence : elle découpe des instantanés dans ce qui coule.', zitat: '« Nous prenons des vues quasi instantanées sur la réalité qui passe … »', quelle: 'Bergson, L’évolution créatrice, 1907, ch. IV' },
      momente: { begriff: 'les coupes immobiles', satz: 'Avec des coupes immobiles, on ne reconstitue pas le mouvement, quel que soit leur nombre.', zitat: '« … le mécanisme de notre connaissance usuelle est de nature cinématographique. »', quelle: 'Bergson, L’évolution créatrice, 1907, ch. IV' },
      schmelze: { begriff: 'la multiplicité qualitative', satz: 'Les instants comptés restent gris. Dans la durée, la couleur revient : elle est qualité, non quantité.', zitat: '', quelle: 'Bergson, Essai, 1889, ch. II, en substance' },
      wartenR: { begriff: 'attendre', satz: 'Le temps de l’attente ne se raccourcit pas. Ici tu décides combien de temps le passé se maintient.', zitat: '« Si je veux me préparer un verre d’eau sucrée, j’ai beau faire, je dois attendre que le sucre fonde. »', quelle: 'Bergson, L’évolution créatrice, 1907, ch. I' },
      wirbel: { begriff: 'le changement', satz: 'Le passé ne reste pas en place, il se dissout et s’écoule. Les tourbillons lui donnent son mouvement.', zitat: '', quelle: 'Bergson, La pensée et le mouvant, 1934, en substance' },
      schlieren: { begriff: 'l’interpénétration', satz: 'Là où passé et présent se mêlent, la lumière se brise comme dans l’eau sucrée.', zitat: '', quelle: 'Bergson, Essai, 1889, ch. II, en substance' },
      spannung: { begriff: 'la tension', satz: 'Tendue, une conscience contracte beaucoup de temps en un instant ; détendue, elle se défait en vibrations, comme la matière.', zitat: '« En réalité, il n’y a pas un rythme unique de la durée. »', quelle: 'Bergson, Matière et mémoire, 1896, ch. IV' },
      rhythmus: { begriff: 'les rythmes', satz: 'Chaque lieu de l’image a sa propre durée. Ici tu choisis quel rythme tu entends : rapide en or, lent en rouge.', zitat: '', quelle: 'Deleuze, Le bergsonisme, 1966, ch. 4, en substance' },
      glut: { begriff: 'la contraction', satz: 'Ce qui est trop rapide pour être vu est amplifié ici : le pouls d’un visage, le scintillement d’une lampe.', zitat: '', quelle: 'Wu, Rubinstein et al., Eulerian Video Magnification, MIT 2012' }
    },
    regler: [['Cadence', 'Instants', 'Fonte'], ['Attente', 'Tourbillons', 'Stries'], ['Tension', 'Rythme', 'Braise']],
    reglerGlosse: [['takt', 'momente', 'schmelze'], ['wartenR', 'wirbel', 'schlieren'], ['spannung', 'rhythmus', 'glut']],
    lesarten: [
      { kurz: 'Horloge', titel: 'L’horloge', wer: 'Marey', geste: 'Laisser reposer le doigt : là, le temps fond.', text: 'À partir de 1882, Étienne-Jules Marey décompose le mouvement en instants : devant un hangar noir, son fusil photographique saisit le coureur douze fois par seconde, toutes les images sur une seule plaque. Pour Bergson, c’est l’erreur même de notre pensée : elle reconstitue le mouvement avec des coupes immobiles, comme un cinématographe. Ici les instants se tiennent côte à côte, en gris, comptés comme par une horloge. Là où ton doigt attend, ils fondent les uns dans les autres, et la couleur revient.' },
      { kurz: 'Sucre', titel: 'Le sucre', wer: 'Bergson', geste: 'Tenir et attendre : le passé se dissout dans le présent.', text: '« Si je veux me préparer un verre d’eau sucrée, j’ai beau faire, je dois attendre que le sucre fonde. » Par cette phrase, Bergson montre que le temps ne se raccourcit pas à volonté : la durée de l’attente coïncide avec la mienne. Deleuze reprend le verre d’eau sucrée au début de « L’image-mouvement ». Là où tu tiens, le passé se dissout et coule en stries à travers le présent ; si tu glisses, tu remues.' },
      { kurz: 'Tension', titel: 'La tension', wer: 'Bergson', geste: 'Là où tu attends, le temps se contracte.', text: 'Dans « Matière et mémoire », Bergson décrit des durées multiples : la lumière rouge vibre des milliers de milliards de fois par seconde, et nous la contractons en une seule couleur. Une conscience plus tendue embrasse plus de temps en un instant, une conscience détendue se défait en vibrations, comme la matière. Ici, le réglage du haut est la tension : détendue, il ne reste que les rythmes de l’image, rapides en or, lents en rouge ; tendue, tout le passé se contracte en lumière. Là où tu attends, la tension monte.' }
    ],
    wenden: 'Retourner', tonAn: 'Son activé', tonAus: 'Son coupé',
    begriff: 'Concept', standbild: 'Image', aufnahme: 'Enregistrer', stopp: 'Arrêter',
    teilen: 'Partager', sichern: 'Télécharger', komma: ',', 'ergebnis-hinweis': 'Enregistré dans le dossier « Téléchargements ». « Partager » l’envoie directement dans la galerie ou une app.',
    keineAufnahme: 'Ce navigateur ne peut pas enregistrer le canevas. L’image fixe fonctionne.',
    geste: 'Laisser reposer le doigt : là, le temps fond.',
    daumen: 'Pose le pouce ici et attends',
    familie: 'Temps · Le bergsonisme, chapitre 2', 'b-titel': 'La durée',
    'b-text': [
      'Henri Bergson distingue deux temps. L’un est mesuré par l’horloge : des sections égales, alignées côte à côte comme des points sur une ligne. C’est en vérité de l’espace. L’autre, nous le vivons : les instants ne se succèdent pas, ils se pénètrent, comme les notes d’une mélodie dont chacune porte la précédente. Ce temps, Bergson l’appelle la durée.',
      'En 1966, Deleuze lit la durée bergsonienne comme une multiplicité d’un genre propre : non pas une quantité de parties égales qu’on peut compter, mais une multiplicité qualitative qui ne se divise pas sans changer de nature. La durée est mémoire, le passé se conserve dans le présent. Au cinéma, Deleuze commence en 1983 par la critique bergsonienne : le cinéma reconstitue le mouvement avec des coupes immobiles, mais il montre aussi comment un tout change dans le temps.',
      'Ici tout commence par l’horloge. Ce qui bouge se tient en une série d’instants gris sur fond noir, comme chez Marey. C’est seulement là où tu laisses reposer le doigt, c’est-à-dire où tu attends, que les instants fondent : la couleur revient, le passé se maintient dans le présent.'
    ],
    'b-frage': 'Sens-tu une différence entre les instants gris et le temps fondu, ou n’est-ce qu’une autre image ? Remarque si tu regardes la durée ou si tu as toi-même attendu.',
    'b-quelle': 'Gilles Deleuze, Le bergsonisme, Paris : PUF 1966, chapitre 2 « La durée comme donnée immédiate ». Gilles Deleuze, L’image-mouvement (Cinéma 1), Paris : Minuit 1983, chapitre 1. Henri Bergson, Essai sur les données immédiates de la conscience, 1889 ; Matière et mémoire, 1896 ; L’évolution créatrice, 1907.',
    keineKamera: 'La caméra ne s’ouvre pas. Choisis une vidéo, des photos ou l’exemple.',
    keinGL: 'Cet appareil ne peut pas afficher WebGL 2, nécessaire à la durée.',
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
const SPUR = 'dauer.spur';
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
  if (s.length && !['✓ läuft', 'Start', 'Ende', 'Pause'].includes(s.at(-1))) console.warn('Dauer: der letzte Versuch brach ab nach', s.slice(-4).join(' → '));
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
const ARBEIT = leicht ? 520 : telefon ? 960 : 1280;      // Arbeitsbilder (Gegenwart klein, Momente, Dauer, Rhythmen), lange Seite
const SCHARF_SEITE = leicht ? 960 : telefon ? 1280 : 1920; // die Gegenwart: so scharf, wie der Bildschirm sie zeigt
const STROM_SEITE = leicht ? 128 : telefon ? 176 : 240;   // Gitter der Strömung im Zucker
const DRUCK_SCHRITTE = leicht ? 10 : telefon ? 18 : 26;   // Druckausgleich je Bild (Jacobi)
const MAX_DPR = leicht ? 0.6 : 2;                          // fein wie der Bildschirm; ruckelt es, senkt tempoMessen die Auflösung
const MOMENTE_MAX = 12;                                    // Ring der Momente (Uhr)
// Mareys Linien: Ketten von Leuchtpunkten, die mit dem Fluss reisen; je Takt wird ihre Lage festgehalten
const LINIEN_K = leicht ? 0 : telefon ? 22 : 30, LINIEN_L = 12;
const WARTEN_SEITE = leicht ? 256 : 512;                   // fein genug für die Haare des Pinsels
const FLUSS_SEITE = leicht ? 120 : telefon ? 200 : 260;                 // feinste Stufe des optischen Flusses                                  // Feld des Wartens
if (leicht) spur('Leichte Fassung (ohne Grafikkarte)');
if (!gl) { melden(TEXTE[sprache].keinGL); spur('kein WebGL2'); }
leinwand.addEventListener('webglcontextlost', (e) => { e.preventDefault(); melden(TEXTE[sprache].kontextWeg); spur('Kontext verloren'); });

const VS = `#version 300 es
in vec2 a; out vec2 v;
void main(){ v = a*0.5+0.5; gl_Position = vec4(a,0.,1.); }`;
const KOPF = `#version 300 es
precision highp float; precision highp sampler2DArray; in vec2 v; out vec4 o;
float lu(vec3 c){ return dot(c, vec3(0.2126, 0.7152, 0.0722)); }
`;

// Kopie der Gegenwart in die Arbeitsgrösse
const FS_KOPIE = KOPF + `uniform sampler2D uQ; void main(){ o = vec4(texture(uQ, v).rgb, 1.0); }`;

// Der ruhende Grund: was lange still steht, gehört zum Schuppen. Mareys schwarzer Schuppen ist hier eine Rechnung:
// sichtbar wird nur, was sich vom Grund abhebt.
const FS_GRUND = KOPF + `uniform sampler2D uAlt, uJetzt; uniform float uRate;
void main(){ vec3 a = texture(uAlt, v).rgb, j = texture(uJetzt, v).rgb;
  // wo sich viel bewegt, lernt der Grund langsamer: so bleibt ein Gesicht, das nur wenig wackelt, sichtbar
  float d = max(abs(a.r - j.r), max(abs(a.g - j.g), abs(a.b - j.b)));
  o = vec4(mix(a, j, uRate * mix(1.0, 0.5, smoothstep(0.08, 0.3, d))), 1.0); }`;

// Das Warten: ein Feld, in das der ruhende Finger Dauer füllt; es klingt langsam ab, wenn der Finger geht.
const FS_WARTEN = KOPF + `uniform sampler2D uAlt; uniform vec2 uPx; uniform vec4 uStempel[16]; uniform vec4 uStempelR[16]; uniform int uN; uniform float uAb, uSeite, uSchritt;
void main(){
  float w = texture(uAlt, v).r;
  float n4 = 0.25 * (texture(uAlt, v + vec2(uPx.x, 0)).r + texture(uAlt, v - vec2(uPx.x, 0)).r + texture(uAlt, v + vec2(0, uPx.y)).r + texture(uAlt, v - vec2(0, uPx.y)).r);
  w = mix(w, n4, 0.18);
  // wer lange wartet, dessen Dauer breitet sich aus wie ein Fleck in Papier: der höchste Nachbar zieht mit, leicht abfallend
  // acht Richtungen auf einem Kreis von zwei Gitterpunkten: der Fleck wächst rund, nicht als Raute
  float nm = 0.0;
  for (int k = 0; k < 8; k++) { float a = float(k) * 0.785398; nm = max(nm, texture(uAlt, v + vec2(cos(a), sin(a)) * uPx * 2.0 * uSchritt).r); }
  w = max(w, nm - 2.0 * (0.013 + 0.03 * (1.0 - nm)));
  vec2 q = vec2(v.x * uSeite, v.y);
  for (int i = 0; i < 16; i++) {
    if (i >= uN) break;
    vec2 a = vec2(uStempel[i].x * uSeite, uStempel[i].y), b = vec2(uStempel[i].z * uSeite, uStempel[i].w);
    vec2 ab = b - a; float h = clamp(dot(q - a, ab) / max(dot(ab, ab), 1e-8), 0.0, 1.0);
    // ein Pinselzug: die Breite läuft von r0 nach r1 (Spitze am Anfang und am Ende), die Haare ziehen feine Bahnen
    vec2 e = q - a - ab * h; float rr = mix(uStempelR[i].x, uStempelR[i].y, h);
    float r = length(e) / max(rr, 1e-4);
    float f = max(0.0, 1.0 - r * r); f *= f;
    if (uStempelR[i].w >= 0.0) {
      vec2 nrm = normalize(vec2(-ab.y, ab.x) + 1e-6);
      float quer = dot(e, nrm) / max(rr, 1e-4);
      f *= 0.6 + 0.4 * (0.5 + 0.5 * sin(quer * 19.0 + uStempelR[i].w)) * (0.7 + 0.3 * sin(quer * 47.0 + uStempelR[i].w * 2.3));
    }
    w += uStempelR[i].z * f;
  }
  w = clamp(w - uAb * (0.3 + w), 0.0, 1.0);
  o = vec4(w, 0, 0, 1);
}`;


// ---- Optischer Fluss nach Lucas und Kanade (1981), als Pyramide auf der Grafikkarte, wie cv::calcOpticalFlowPyrLK in OpenCV ----
// (Hinweis von Christian, 20.11.2026). Er zeigt, wohin sich jede Stelle zwischen zwei Bildern bewegt hat. Damit wird die Dauer
// zur stetigen Spur statt zur Treppe von Einzelbildern, und im Zucker schiebt die Bewegung des Bildes die Strömung.
const FS_LUM = KOPF + `uniform sampler2D uJetzt, uVor; uniform vec2 uPx;
void main(){
  // Kasten aus vier Proben: verkleinern ohne Flimmern
  vec2 a = vec2(-0.25, -0.25) * uPx, b = vec2(0.25, -0.25) * uPx, c = vec2(-0.25, 0.25) * uPx, d = vec2(0.25, 0.25) * uPx;
  float j = 0.25 * (lu(texture(uJetzt, v + a).rgb) + lu(texture(uJetzt, v + b).rgb) + lu(texture(uJetzt, v + c).rgb) + lu(texture(uJetzt, v + d).rgb));
  float p = 0.25 * (lu(texture(uVor, v + a).rgb) + lu(texture(uVor, v + b).rgb) + lu(texture(uVor, v + c).rgb) + lu(texture(uVor, v + d).rgb));
  o = vec4(j, p, 0, 1);
}`;
// ein Schritt: Startschätzung f0 (Bildanteile je Bild) verfeinern; Fenster 5 × 5 mit Gausschen Gewichten
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
  // Tikhonov: wo das Bild keine Struktur hat, bleibt die Schätzung, wie sie war
  a11 += 1e-4; a22 += 1e-4;
  float det = a11 * a22 - a12 * a12;
  vec2 d = -vec2(a22 * b1 - a12 * b2, a11 * b2 - a12 * b1) / det;   // in Gitterpunkten
  d = clamp(d, -2.0, 2.0);
  o = vec4(f0 + d * uPx, 0, 1);
}`;
// glätten, mit Rücksicht auf Kanten nicht nötig: die Dauer verzeiht weiche Felder
const FS_FGLATT = KOPF + `uniform sampler2D uF, uAlt; uniform vec2 uPx; uniform float uNeu;
void main(){
  vec2 f = vec2(0); float s = 0.0;
  for (int y = -1; y <= 1; y++) for (int x = -1; x <= 1; x++) { float g = (x == 0 && y == 0) ? 4.0 : (x == 0 || y == 0) ? 2.0 : 1.0; f += texture(uF, v + vec2(x, y) * uPx).xy * g; s += g; }
  f /= s;
  // zeitlich: kam kein neues Bild, klingt der Fluss sanft ab
  o = vec4(mix(texture(uAlt, v).xy * 0.85, f, uNeu), 0, 1);
}`;

// ---- Strömung (Zucker): ein kleines, stabiles Fluid nach Stam, «Stable Fluids» (SIGGRAPH 1999), mit Wirbelverstärkung.
// Aufbau, Randbedingungen und Warmstart des Drucks nach Pavel Dobryakov, WebGL Fluid Simulation (MIT, siehe LIZENZEN.md);
// gefunden von Christian, 20.11.2026. Statt Farbe trägt die Strömung hier die Vergangenheit des Bildes. ----
// Geschwindigkeit in Gitterpunkten je Sekunde; der Finger rührt, die Bewegung im Bild schiebt sanft mit.
const FS_V_ADVEKT = KOPF + `uniform sampler2D uV, uFl, uW; uniform vec2 uPx; uniform float uDt, uHalt, uBewegt, uSeite;
uniform vec4 uRuehr[8]; uniform int uRN; uniform float uRuehrR;
void main(){
  vec2 vel = texture(uV, v).xy;
  vec2 w = texture(uV, v - uDt * vel * uPx).xy * uHalt;
  // Bewegung im Bild: der optische Fluss schiebt die Strömung (in Gitterpunkten je Sekunde)
  vec2 fl = texture(uFl, v).xy / uPx;
  float wa = texture(uW, v).r;
  w += fl * uBewegt * (0.2 + wa);
  // der Finger rührt: Spritzer entlang des Wegs
  vec2 q = vec2(v.x * uSeite, v.y);
  for (int i = 0; i < 8; i++) {
    if (i >= uRN) break;
    vec2 p = vec2(uRuehr[i].x * uSeite, uRuehr[i].y);
    vec2 e = q - p; float g = exp(-dot(e, e) / (uRuehrR * uRuehrR));
    w += uRuehr[i].zw * g;
  }
  o = vec4(w, 0, 1);
}`;
const FS_CURL = KOPF + `uniform sampler2D uV; uniform vec2 uPx;
void main(){
  float L = texture(uV, v - vec2(uPx.x, 0)).y, R = texture(uV, v + vec2(uPx.x, 0)).y;
  float B = texture(uV, v - vec2(0, uPx.y)).x, T = texture(uV, v + vec2(0, uPx.y)).x;
  o = vec4(0.5 * ((R - L) - (T - B)), 0, 0, 1);
}`;
const FS_WIRBEL = KOPF + `uniform sampler2D uV, uC; uniform vec2 uPx; uniform float uWirbel, uDt;
void main(){
  float L = abs(texture(uC, v - vec2(uPx.x, 0)).x), R = abs(texture(uC, v + vec2(uPx.x, 0)).x);
  float B = abs(texture(uC, v - vec2(0, uPx.y)).x), T = abs(texture(uC, v + vec2(0, uPx.y)).x);
  float c = texture(uC, v).x;
  vec2 n = vec2(R - L, T - B); n /= length(n) + 1e-5;
  vec2 vel = texture(uV, v).xy + vec2(n.y, -n.x) * c * uWirbel * uDt;
  o = vec4(clamp(vel, -900.0, 900.0), 0, 1);
}`;
const FS_DIV = KOPF + `uniform sampler2D uV; uniform vec2 uPx;
void main(){
  float L = texture(uV, v - vec2(uPx.x, 0)).x, R = texture(uV, v + vec2(uPx.x, 0)).x;
  float B = texture(uV, v - vec2(0, uPx.y)).y, T = texture(uV, v + vec2(0, uPx.y)).y;
  // am Bildrand prallt die Strömung ab, statt hinauszulaufen
  vec2 C = texture(uV, v).xy;
  if (v.x - uPx.x < 0.0) L = -C.x; if (v.x + uPx.x > 1.0) R = -C.x;
  if (v.y - uPx.y < 0.0) B = -C.y; if (v.y + uPx.y > 1.0) T = -C.y;
  o = vec4(0.5 * ((R - L) + (T - B)), 0, 0, 1);
}`;
// Warmstart: der Druck des vorigen Bildes, abgeschwächt, als Anfang der Iteration
const FS_MAL = KOPF + `uniform sampler2D uQ; uniform float uF; void main(){ o = vec4(texture(uQ, v).xyz * uF, 1.0); }`;
const FS_DRUCK = KOPF + `uniform sampler2D uP, uD; uniform vec2 uPx;
void main(){
  float L = texture(uP, v - vec2(uPx.x, 0)).x, R = texture(uP, v + vec2(uPx.x, 0)).x;
  float B = texture(uP, v - vec2(0, uPx.y)).x, T = texture(uP, v + vec2(0, uPx.y)).x;
  o = vec4((L + R + B + T - texture(uD, v).x) * 0.25, 0, 0, 1);
}`;
const FS_GRAD = KOPF + `uniform sampler2D uP, uV; uniform vec2 uPx;
void main(){
  float L = texture(uP, v - vec2(uPx.x, 0)).x, R = texture(uP, v + vec2(uPx.x, 0)).x;
  float B = texture(uP, v - vec2(0, uPx.y)).x, T = texture(uP, v + vec2(0, uPx.y)).x;
  o = vec4(texture(uV, v).xy - 0.5 * vec2(R - L, T - B), 0, 1);
}`;

// ---- Die Dauer: jede Stelle sammelt ihre Vergangenheit; wie lange, bestimmt das Warten ----
// Uhr: nur was sich bewegt (vormultipliziert: rgb = Farbe × Anteil, a = Anteil). Zucker: das ganze Bild, mitgeführt von der Strömung.
const FS_DAUER = KOPF + `uniform sampler2D uD, uJetzt, uGrund, uW, uV, uFl; uniform vec2 uPx, uPxS; uniform float uDt, uSchnell, uLangsam, uAdvekt, uMatte, uLoesen, uSchmier, uSchmelz, uZufall, uHaltW, uSeite;
uniform vec4 uWisch[8], uWischR[8]; uniform int uWN;
float matte(vec3 c, vec3 g){ float d = max(abs(c.r - g.r), max(abs(c.g - g.g), abs(c.b - g.b))); return smoothstep(0.05, 0.2, d); }
void main(){
  float w = texture(uW, v).r;
  vec2 vel = texture(uV, v).xy;
  vec2 q = v - uDt * vel * uPxS * uAdvekt;
  vec4 d = texture(uD, q);
  // im Zucker löst sich, was lange wartet: es verläuft ein wenig in seine Nachbarschaft
  vec4 n4 = 0.25 * (texture(uD, q + vec2(uPx.x, 0)) + texture(uD, q - vec2(uPx.x, 0)) + texture(uD, q + vec2(0, uPx.y)) + texture(uD, q - vec2(0, uPx.y)));
  // in der Uhr schmilzt, was wartet: es breitet sich aus, statt in Streifen stehen zu bleiben
  d = mix(d, n4, max(uLoesen, uSchmelz) * smoothstep(0.1, 0.9, w));
  // der Pinsel (Zucker): wie ein Finger in nasser Farbe nimmt er auf, was unter ihm liegt, und trägt es den Zug entlang
  vec2 qa = vec2(v.x * uSeite, v.y);
  for (int i = 0; i < 8; i++) {
    if (i >= uWN) break;
    vec2 a = vec2(uWisch[i].x * uSeite, uWisch[i].y), b = vec2(uWisch[i].z * uSeite, uWisch[i].w), ab = b - a;
    float h = clamp(dot(qa - a, ab) / max(dot(ab, ab), 1e-8), 0.0, 1.0);
    vec2 e = qa - a - ab * h; float rr = mix(uWischR[i].x, uWischR[i].y, h);
    float f = max(0.0, 1.0 - dot(e, e) / max(rr * rr, 1e-8)); f = sqrt(f);
    float quer = dot(e, normalize(vec2(-ab.y, ab.x) + 1e-6)) / max(rr, 1e-4);
    // die Haare tragen ungleich viel: so bleibt der Zug gestreift
    f *= 0.55 + 0.45 * (0.5 + 0.5 * sin(quer * 19.0 + uWischR[i].w)) * (0.7 + 0.3 * sin(quer * 47.0 + uWischR[i].w * 2.3));
    vec2 weg = vec2((b.x - a.x) / uSeite, b.y - a.y);
    d = mix(d, texture(uD, v - weg), f * uWischR[i].z);
  }
  // die Gegenwart, verschmiert über den Weg seit dem vorigen Bild: aus der Treppe der Bilder wird eine stetige Spur
  vec2 fl = texture(uFl, v).xy * uSchmier;
  vec3 j = vec3(0); float m = 0.0; vec3 g = texture(uGrund, v).rgb;
  // die Proben zittern je Bildpunkt und Bild um ihren Platz: keine Leiter aus Kopien, sondern ein weicher Zug
  float zz = fract(52.9829189 * fract(dot(gl_FragCoord.xy, vec2(0.06711056, 0.00583715))) + uZufall);
  for (int k = 0; k < 8; k++) {
    vec2 q2 = v - fl * ((float(k) + zz) / 8.0);
    vec3 c = texture(uJetzt, q2).rgb; float mk = mix(1.0, matte(c, texture(uGrund, q2).rgb), uMatte);
    j += c * mk; m += mk;
  }
  j /= max(m, 1e-3); m /= 8.0;
  float r = mix(uSchnell, uLangsam, smoothstep(0.0, uHaltW, w));
  o = d + (vec4(j * m, m) - d) * r;
}`;

// Uhr: die Lichter halten länger als die Schatten, wie auf einer lange belichteten Platte
const FS_SPITZE = KOPF + `uniform sampler2D uAlt, uJetzt, uGrund, uW, uFl; uniform float uAbkl, uAbklW, uZufall; uniform vec2 uPx;
float matte(vec3 c, vec3 g){ float d = max(abs(c.r - g.r), max(abs(c.g - g.g), abs(c.b - g.b))); return smoothstep(0.05, 0.2, d); }
void main(){
  vec2 fl = texture(uFl, v).xy;
  vec3 h = vec3(0);
  float zz = fract(52.9829189 * fract(dot(gl_FragCoord.xy, vec2(0.06711056, 0.00583715))) + uZufall);
  for (int k = 0; k < 6; k++) { vec2 q = v - fl * ((float(k) + zz) / 6.0); vec3 j = texture(uJetzt, q).rgb; h = max(h, j * matte(j, texture(uGrund, q).rgb)); }
  float w = smoothstep(0.0, 0.85, texture(uW, v).r);
  // das Nachbild zerläuft im Warten zu einem Schein, statt als harte Spur stehen zu bleiben
  vec3 a = texture(uAlt, v).rgb;
  vec3 a4 = 0.25 * (texture(uAlt, v + vec2(uPx.x, 0)).rgb + texture(uAlt, v - vec2(uPx.x, 0)).rgb + texture(uAlt, v + vec2(0, uPx.y)).rgb + texture(uAlt, v - vec2(0, uPx.y)).rgb);
  a = mix(a, a4, 0.6 * w);
  o = vec4(max(a * mix(uAbkl, uAbklW, w), h * mix(1.0, 0.7, w)), 1.0);
}`;

// ---- Spannung: drei Gedächtnisse verschiedener Länge; ihre Differenzen sind die Rhythmen des Bildes ----
const FS_EMA = KOPF + `uniform sampler2D uAlt, uJetzt; uniform float uRate, uSpitze;
void main(){ vec3 a = texture(uAlt, v).rgb, j = texture(uJetzt, v).rgb;
  // uSpitze: statt Mittel das Hellste, langsam verblassend (die Lichter, die sich zusammenziehen)
  o = vec4(uSpitze > 0.5 ? max(a * uRate, j * j * 1.15) : a + (j - a) * uRate, 1.0); }`;

// ---------- Die drei Lesarten ----------
// Silbergelatine: Mareys Platten sind warmgrau, die Lichter leicht gelblich, die Tiefen kühl
const SILBER = `
vec3 silber(vec3 c){ float l = lu(c); l = l * l * (3.0 - 2.0 * l) * 0.55 + l * 0.45; return vec3(l) * vec3(1.02, 0.995, 0.955) + vec3(-0.01, -0.005, 0.012) * (1.0 - l); }
float matte(vec3 c, vec3 g){ float d = max(abs(c.r - g.r), max(abs(c.g - g.g), abs(c.b - g.b))); return smoothstep(0.05, 0.2, d); }
`;
// Uhr: die Momente als Mehrfachbelichtung auf Schwarz (hellstes gewinnt, wie auf der Platte), jeder mit seiner Kontur
// als feiner Linie (Mareys «chronophotographie géométrique»). Wo das Warten liegt, schmilzt das Gezählte zur Dauer in Farbe.
const FS_UHR = KOPF + SILBER + `
uniform sampler2D uScharf, uJetzt, uGrund, uD, uSp, uW; uniform sampler2DArray uRing;
uniform float uKopf, uN, uM, uLinie, uT, uSeite, uBruch, uBruchT, uPlatte; uniform vec4 uRahmen; uniform vec2 uBM;
float h21(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
vec2 h22(vec2 p){ return fract(sin(vec2(dot(p, vec2(127.1, 311.7)), dot(p, vec2(269.5, 183.3)))) * 43758.5453); }
// Bruchbild: Zellen um den Aufprall uBM, rundum NW Scherben, nach aussen länglich und grösser
const float NW = 15.0, RADIAL = 0.6;
vec2 lp(vec2 p){ vec2 rel = p - uBM; float a = atan(rel.y, rel.x); if (a < 0.0) a += 6.2831853;
  return vec2(log(length(rel) + 0.012) * NW / 6.2831853 * RADIAL, a * NW / 6.2831853); }
vec2 lpZurueck(vec2 z){ float r = exp(z.x * 6.2831853 / (NW * RADIAL)) - 0.012, a = z.y * 6.2831853 / NW; return uBM + r * vec2(cos(a), sin(a)); }
void zelle(vec2 z, out vec2 id, out vec2 mz, out float d1, out float d2){
  vec2 zi = floor(z); d1 = 9.0; d2 = 9.0; id = vec2(0); mz = vec2(0);
  for (int y = -1; y <= 1; y++) for (int x = -1; x <= 1; x++) {
    vec2 n = zi + vec2(x, y), nh = vec2(n.x, mod(n.y, NW)), pz = n + 0.12 + 0.76 * h22(nh);
    float dd = length(z - pz);
    if (dd < d1) { d2 = d1; d1 = dd; id = nh; mz = pz; } else if (dd < d2) d2 = dd;
  }
}
// manche Scherbe ist ein zweites Mal gebrochen: Seite (0/1) und Abstand zum zweiten Riss
vec2 gebrochen(vec2 z, vec2 id, vec2 mz){
  if (h21(id + 17.0) > 0.55) return vec2(0.0, 9.0);
  float w = h21(id + 23.0) * 3.14159; vec2 r = vec2(cos(w), sin(w));
  float d = dot(z - mz - (h22(id + 29.0) - 0.5) * 0.3, r);
  return vec2(step(0.0, d), abs(d) * 2.0);
}
void main(){
  vec3 s = texture(uScharf, v).rgb, g = texture(uGrund, v).rgb, j = texture(uJetzt, v).rgb;
  float m0 = matte(j, g);
  // die gezählte Zeit: graue Momente
  vec3 platte = vec3(0.0);
  for (int k = 1; k <= ${MOMENTE_MAX}; k++) {
    if (float(k) > uM) break;
    float lage = mod(uKopf - float(k - 1) + uN, uN);
    vec3 c = texture(uRing, vec3(v, lage)).rgb;
    float mk = matte(c, g);
    float alter = (float(k) - 0.5) / uM;
    float a = mix(0.92, 0.16, pow(alter, 0.9));
    // Kontur: eine Linie von gut einem Bildpunkt, wo die Gestalt den Schuppen verlässt
    float lin = 1.0 - smoothstep(0.0, uLinie, abs(mk - 0.5) / max(fwidth(mk), 1e-4));
    vec3 hell = silber(c) * mk * a * 0.82 * uPlatte + vec3(0.96, 0.94, 0.88) * lin * a * 0.55;
    platte = max(platte, hell);
  }
  vec3 gegenwart = silber(s);
  vec3 uhr = max(platte * (1.0 - 0.8 * m0), gegenwart * mix(0.2, 1.0, m0));
  // die Dauer: dieselben Momente, ineinander geschmolzen, in ihrer Farbe. Wie auf einer lange belichteten Platte
  // addiert sich das Licht (der Mittelwert allein wäre Schlamm): die Spur leuchtet, die Lichter halten am längsten.
  vec4 d = texture(uD, v);
  vec3 sp = texture(uSp, v).rgb;
  // das länger Gehaltene färbt sich warm, wie ein Nachbild: Rot ist Zeit (wie in den Schichten)
  float spl = lu(sp);
  vec3 nachbild = mix(vec3(spl), sp, 0.35) * vec3(1.0, 0.6, 0.34);
  vec3 licht = d.rgb * 2.1 + nachbild * 1.1;
  vec3 dauer = 1.0 - exp(-licht * 1.25);
  dauer = max(dauer, s * mix(0.2, 1.0, m0));
  dauer = mix(dauer, s, m0 * 0.4);
  float w = texture(uW, v).r;
  float sch = smoothstep(0.03, 0.55, w);
  vec3 c = mix(uhr, dauer, sch);
  // am Saum der Schmelze ein Hauch Wärme, wie Glas, das weich wird
  c += vec3(0.9, 0.3, 0.16) * pow(sch * (1.0 - sch) * 4.0, 2.0) * 0.05;
  // Loslassen: die Dauer zerspringt wie Glas unter einem Schlag. Um den Punkt, wo der Finger ging, liegen feine
  // Splitter, nach aussen lange Scherben (Zellen in logarithmisch-polaren Koordinaten), manche noch einmal gebrochen.
  // Jede zeigt einen grauen Moment aus dem Ring. Dann lösen sie sich in einer Welle von innen nach aussen,
  // kippen, fallen und lassen dunkle Fugen zurück, bis die Uhr wieder zählt.
  if (uBruch > 0.0) {
    vec2 p = vec2(v.x * uSeite, v.y);
    vec2 id1, mz1; float a1, b1;
    zelle(lp(p), id1, mz1, a1, b1);
    vec2 g1 = gebrochen(lp(p), id1, mz1);
    vec2 sid = id1 + g1.x * vec2(31.7, 47.3);
    vec2 mitte1 = lpZurueck(mz1);
    float wz = texture(uW, vec2(mitte1.x / uSeite, mitte1.y)).r;
    float feld = smoothstep(0.02, 0.12, wz);
    // die Welle: innen löst es sich zuerst, aussen später, mit Zufall
    float rn = clamp(length(mitte1 - uBM) / 0.45, 0.0, 1.0);
    float beginn = 0.12 + 0.42 * rn + 0.22 * h21(sid + 9.0);
    float fall = max(0.0, uBruchT - beginn);
    float tiefe = h21(sid + 5.0);
    vec2 aus = normalize(mitte1 - uBM + 1e-4);
    vec2 weg = aus * (0.004 + 0.03 * fall) * (0.4 + tiefe) + vec2(0.0, -1.0) * fall * fall * (0.1 + 0.25 * tiefe);
    // zweiter Blick: wo liegt der Punkt in der Scherbe, nachdem sie sich bewegt hat? Passt es nicht, liegt hier eine Fuge
    vec2 p2 = p - weg * feld;
    vec2 id2, mz2; float a2, b2;
    zelle(lp(p2), id2, mz2, a2, b2);
    vec2 g2 = gebrochen(lp(p2), id2, mz2);
    vec2 sid2 = id2 + g2.x * vec2(31.7, 47.3);
    float gleich = step(length(sid2 - sid), 0.01);
    float huelle = 1.0 - smoothstep(0.75, 1.0, uBruchT);
    // dahinter: Dunkel, wie ein Blick in die Tiefe hinter dem Glas
    c = mix(c, c * 0.28, feld * uBruch * huelle);
    float sicht = feld * gleich * (1.0 - smoothstep(0.0, 0.32, fall));
    if (sicht > 0.0) {
      float lage = mod(uKopf - floor(h21(sid) * uM) + uN, uN);
      vec2 q = vec2(p2.x / uSeite, p2.y);
      vec2 fa = (h22(sid + 11.0) - 0.5) * 0.002;
      vec3 mc = vec3(textureLod(uRing, vec3(q - fa, lage), 0.0).r, textureLod(uRing, vec3(q, lage), 0.0).g, textureLod(uRing, vec3(q + fa, lage), 0.0).b);
      // Neigung: anfangs kaum, im Fallen stärker; jede Scherbe fängt das Licht anders
      vec2 kipp = (h22(sid + 13.0) - 0.5) * (0.35 + 2.4 * fall);
      float licht = 0.84 + dot(kipp, vec2(-0.45, 0.6)) * 0.5;
      vec3 scherbe = silber(mc) * licht;
      float groesse = max(length(mitte1 - uBM), 0.02) * 6.2832 / NW;
      vec2 lokal = (p2 - lpZurueck(mz2)) / groesse;
      scherbe += vec3(0.96, 0.94, 0.9) * 0.16 * smoothstep(0.2, 0.9, dot(lokal, normalize(kipp + 1e-4)));
      // Fase an der Kante: zum Licht hin hell, abgewandt dunkel, so bekommt die Scherbe Dicke
      float rand = min(b2 - a2, g2.y), rb = fwidth(rand);
      float kante = 1.0 - smoothstep(0.0, rb * 1.8, rand);
      vec2 gr = vec2(dFdx(rand), dFdy(rand)); float bl = dot(normalize(gr + 1e-6), normalize(vec2(-0.5, 0.75)));
      scherbe = scherbe * (1.0 - kante * 0.45 * max(0.0, -bl)) + vec3(1.0, 0.98, 0.94) * kante * (0.25 + 0.5 * max(0.0, bl));
      c = mix(c, scherbe, sicht * uBruch * 0.95);
    }
  }
  // ausserhalb des Bildes (Saalschwarz) bleibt es schwarz
  vec2 r = step(uRahmen.xy, v) * step(v, uRahmen.zw);
  o = vec4(c * r.x * r.y, 1.0);
}`;
// ---- Mareys Linien ----
// Zustand je Punkt (RGBA32F, winzig): xy Ort, z Alter in Takten, w ob er auf der Gestalt liegt.
// Eine Kette beginnt neu, wo am meisten Bewegung ist, quer zur Bewegung gelegt: so fächert sie sich wie Mareys Glieder.
const FS_PUNKTE = KOPF + `uniform highp sampler2D uZ; uniform sampler2D uFl, uJetzt, uGrund; uniform float uNeu, uTakt, uTaktNr, uLaenge, uSeite, uStart;
float h21(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float matteAn(vec2 q){ vec3 c = texture(uJetzt, q).rgb, g = texture(uGrund, q).rgb; float d = max(abs(c.r - g.r), max(abs(c.g - g.g), abs(c.b - g.b))); return smoothstep(0.05, 0.2, d); }
void main(){
  ivec2 ij = ivec2(gl_FragCoord.xy); int L = textureSize(uZ, 0).x;
  vec4 s = texelFetch(uZ, ij, 0), m = texelFetch(uZ, ivec2(L / 2, ij.y), 0);
  float ch = float(ij.y), i = float(ij.x) / float(L - 1);
  bool neu = uStart > 0.5;
  if (uTakt > 0.5) {
    bool aus = any(lessThan(m.xy, vec2(0.02))) || any(greaterThan(m.xy, vec2(0.98)));
    neu = neu || aus || m.w < 0.3 || m.z > 36.0 || h21(vec2(ch, uTaktNr)) < 0.06;
  }
  if (neu) {
    vec2 best = vec2(0.5); float bm = -1.0;
    for (int k = 0; k < 12; k++) {
      vec2 c = mix(vec2(0.1), vec2(0.9), vec2(h21(vec2(ch * 13.1 + float(k), uTaktNr + 1.7)), h21(vec2(ch * 7.3 - float(k), uTaktNr * 1.31 + 5.2))));
      float b = matteAn(c) * (0.3 + length(texture(uFl, c).xy) * 300.0);
      if (b > bm) { bm = b; best = c; }
    }
    vec2 f = texture(uFl, best).xy * vec2(uSeite, 1.0);
    float a = length(f) > 2e-4 ? atan(f.y, f.x) + 1.5708 : h21(vec2(ch, uTaktNr * 2.1 + 9.0)) * 6.2832;
    a += (h21(vec2(ch + 4.0, uTaktNr)) - 0.5) * 0.6;
    vec2 p = best + vec2(cos(a) / uSeite, sin(a)) * (i - 0.5) * uLaenge;
    s = vec4(p, 0.0, matteAn(p));
  } else {
    if (uNeu > 0.5) {
      s.xy += texture(uFl, s.xy).xy;
      // die Kette bleibt ein Stab: innere Punkte rücken zur Mitte ihrer Nachbarn (wie Mareys Streifen auf dem Glied)
      int i0 = ij.x;
      if (i0 > 0 && i0 < L - 1) {
        vec2 a = texelFetch(uZ, ivec2(i0 - 1, ij.y), 0).xy, b = texelFetch(uZ, ivec2(i0 + 1, ij.y), 0).xy;
        a += texture(uFl, a).xy; b += texture(uFl, b).xy;
        s.xy = mix(s.xy, 0.5 * (a + b), 0.3);
      }
    }
    if (uTakt > 0.5) s.z += 1.0;
    s.w = mix(s.w, matteAn(s.xy), 0.35);
  }
  o = s;
}`;
const FS_PUNKTE_KOPIE = KOPF + `uniform highp sampler2D uZ; uniform int uZeile; void main(){ o = texelFetch(uZ, ivec2(gl_FragCoord.xy) - ivec2(0, uZeile), 0); }`;
// Jede Linie ein Streifen aus zwei Dreiecken, im Bruchstück mit weichem Rand (Kapsel), damit sie fein und glatt bleibt.
// uArt 0: die Glieder (Punkt zu Punkt in einem Moment); 1: die Bahnen (ein Punkt von Moment zu Moment); 2: die Knöpfe.
const VS_LINIE = `#version 300 es
precision highp float; precision highp sampler2D;
uniform highp sampler2D uHist, uZ; uniform sampler2D uW; uniform int uL, uK, uKopf, uN, uArt, uP; uniform float uM, uBreite; uniform vec2 uRes;
flat out vec4 vSeg; flat out float vA, vR;
vec4 holen(int m, int c, int i){
  if (m == 0) return texelFetch(uZ, ivec2(i, c), 0);
  int lage = (uKopf - (m - 1) + uN * 4) % uN;
  return texelFetch(uHist, ivec2(i, lage * uK + c), 0);
}
void main(){
  int id = gl_InstanceID; vec4 a, b; int m; float r = uBreite * 0.5, gut = 1.0;
  if (uArt == 0) {
    int n = uK * (uL - 1); m = id / n; int q = id % n, c = q / (uL - 1), i = q % (uL - 1);
    a = holen(m, c, i); b = holen(m, c, i + 1);
    gut = step(0.4, min(a.w, b.w)) * step(abs(a.z - b.z), 0.5);
    // ein Glied, das der Fluss auseinandergerissen hat, wird nicht gezogen
    gut *= step(length((b.xy - a.xy) * vec2(uRes.x / uRes.y, 1.0)), 0.045);
  } else if (uArt == 1) {
    int n = uK * uP; m = id / n; int q = id % n, c = q / uP, i = 1 + (q % uP) * 3;
    a = holen(m, c, i); b = holen(m + 1, c, i);
    float soll = m == 0 ? 0.0 : 1.0;
    gut = step(abs(a.z - b.z - soll), 0.25) * step(0.3, min(a.w, b.w)) * step(float(m + 1), uM);
    r *= 0.45;
  } else {
    int n = uK * uP; m = id / n; int q = id % n, c = q / uP, i = 1 + (q % uP) * 3;
    a = holen(m, c, i); b = a; gut = step(0.35, a.w) * 0.8; r *= 1.5;
  }
  gut *= step(float(m), uM);
  float alter = float(m) / max(uM, 1.0);
  float wz = texture(uW, 0.5 * (a.xy + b.xy)).r;
  // neue Ketten treten über drei Takte ein, statt auf einen Schlag zu erscheinen
  vA = gut * smoothstep(0.0, 3.0, a.z + 0.5) * 0.85 * mix(1.0, 0.12, pow(alter, 1.2)) * (1.0 - smoothstep(0.03, 0.45, wz)) * (uArt == 1 ? 0.55 : 1.0);
  vec2 p0 = a.xy * uRes, p1 = b.xy * uRes, d = p1 - p0; float len = length(d);
  vec2 t = len > 1e-3 ? d / len : vec2(1, 0), nn = vec2(-t.y, t.x);
  vec2 ec = vec2(float(gl_VertexID & 1) * 2.0 - 1.0, float(gl_VertexID >> 1) * 2.0 - 1.0);
  float h = r + 1.5;
  vec2 pp = (ec.x < 0.0 ? p0 : p1) + t * ec.x * h + nn * ec.y * h;
  vSeg = vec4(p0, p1); vR = r;
  gl_Position = vA > 0.003 ? vec4(pp / uRes * 2.0 - 1.0, 0, 1) : vec4(2, 2, 2, 1);
}`;
const FS_LINIE = `#version 300 es
precision highp float; flat in vec4 vSeg; flat in float vA, vR; out vec4 o; uniform vec3 uFarbe;
void main(){
  vec2 p = gl_FragCoord.xy, a = vSeg.xy, b = vSeg.zw, ab = b - a;
  float t = clamp(dot(p - a, ab) / max(dot(ab, ab), 1e-6), 0.0, 1.0);
  float d = length(p - a - ab * t);
  float k = clamp(vR + 0.5 - d, 0.0, 1.0) * vA;
  o = vec4(uFarbe * k, k);
}`;

// Zucker: wo gewartet wird, hält sich das Vergangene und wird von der Strömung verzogen;
// am Übergang bricht sich die Gegenwart in Schlieren, mit einer Spur Farbzerlegung wie in Sirup.
const FS_ZUCKER = KOPF + `
uniform sampler2D uScharf, uD, uW, uV; uniform vec2 uPxD, uPxW; uniform float uSchlieren, uSeite; uniform vec4 uRahmen;
void main(){
  float w = texture(uW, v).r;
  vec4 d = texture(uD, v);
  float lx = lu(texture(uD, v + vec2(uPxD.x * 1.5, 0)).rgb) - lu(texture(uD, v - vec2(uPxD.x * 1.5, 0)).rgb);
  float ly = lu(texture(uD, v + vec2(0, uPxD.y * 1.5)).rgb) - lu(texture(uD, v - vec2(0, uPxD.y * 1.5)).rgb);
  vec2 gw = vec2(texture(uW, v + vec2(uPxW.x, 0)).r - texture(uW, v - vec2(uPxW.x, 0)).r, texture(uW, v + vec2(0, uPxW.y)).r - texture(uW, v - vec2(0, uPxW.y)).r);
  float sch = smoothstep(0.02, 0.6, w);
  vec2 off = (vec2(lx, ly) * 0.018 * sch + gw * 0.035) * uSchlieren;
  off.x /= uSeite;
  vec3 s = vec3(texture(uScharf, v + off * 0.92).r, texture(uScharf, v + off).g, texture(uScharf, v + off * 1.1).b);
  vec3 c = mix(s, d.rgb, sch);
  // der Zug liegt auf wie nasse Farbe: auf der Lichtseite ein feiner Glanz, auf der anderen ein Hauch Schatten.
  // Kein Aufhellen der Fläche: lesbar wird der Pinsel an seinem Rand und an dem, was er mitgenommen hat.
  float relief = dot(gw / (uPxW.x * 2.0), normalize(vec2(-0.6, 0.8))) * 0.012;
  c *= 1.0 - 0.32 * clamp(-relief, 0.0, 1.0);
  c += vec3(1.0, 0.95, 0.86) * 0.22 * smoothstep(0.15, 0.9, relief);
  // Schlieren: nur wo das Gelöste sehr steile Kanten hat, ein schwacher Lichtfaden
  float kante = length(vec2(lx, ly));
  c += vec3(1.0, 0.93, 0.8) * smoothstep(0.25, 0.6, kante) * sch * 0.05 * uSchlieren;
  vec2 r = step(uRahmen.xy, v) * step(v, uRahmen.zw);
  o = vec4(c * mix(1.0, r.x * r.y, 1.0 - sch * 0.0), 1.0);
}`;
// Spannung: entspannt nur die Schwingungen (Materie), in der Mitte das Bild mit verstärkten Rhythmen,
// gespannt alles Vergangene zu Licht zusammengezogen (wie Sugimotos Kinos: ein ganzer Film in einer Belichtung).
const FS_SPANNUNG = KOPF + `
uniform sampler2D uScharf, uE1, uE2, uE3, uE4, uW; uniform float uSpannung, uGlut; uniform vec4 uRahmen;
void main(){
  vec3 s = texture(uScharf, v).rgb;
  vec3 e1 = texture(uE1, v).rgb, e2 = texture(uE2, v).rgb, e3 = texture(uE3, v).rgb, e4 = texture(uE4, v).rgb;
  vec3 hoch = e1 - e2, tief = e2 - e3;
  float w = texture(uW, v).r;
  float T = uSpannung, Tw = smoothstep(0.02, 0.9, w);   // das Warten zieht unmittelbar zur Kontraktion
  // Kernung: was unter dem Rauschen des Sensors liegt, bleibt still
  float kh = smoothstep(0.004, 0.014, length(hoch)), kt = smoothstep(0.004, 0.014, length(tief));
  float hl = lu(hoch), tl = lu(tief);
  vec3 gold = vec3(1.0, 0.8, 0.42), rot = vec3(0.85, 0.14, 0.09);
  float ah = (1.0 - exp(-abs(hl) * (6.0 + 26.0 * uGlut))) * kh;
  float at = (1.0 - exp(-abs(tl) * (4.0 + 16.0 * uGlut))) * kt;
  // Schwingung sitzt an den Kanten, die sich bewegen: feine Linien statt Flächen
  float kante = clamp(length(vec2(lu(texture(uScharf, v + vec2(0.002, 0)).rgb) - lu(texture(uScharf, v - vec2(0.002, 0)).rgb),
                                  lu(texture(uScharf, v + vec2(0, 0.001)).rgb) - lu(texture(uScharf, v - vec2(0, 0.001)).rgb))) * 3.0, 0.0, 1.0);
  vec3 schwingung = (gold * ah * 0.85 + rot * at * 0.7 * (1.0 - ah * 0.5)) * (0.3 + 0.7 * kante);
  // entspannt: die Materie, nur Schwingung
  vec3 entspannt = s * 0.06 + schwingung;
  // Mitte: Eulersche Verstärkung wie bei Wu u. a., Helligkeit und Farbe getrennt (der Puls liegt in der Farbe);
  // weich begrenzt, damit grosse Bewegungen nicht ausbrennen: verstärkt wird, was man sonst nicht sähe
  vec3 amp = (vec3(hl) * (1.5 + 14.0 * uGlut) + (hoch - vec3(hl)) * (2.5 + 26.0 * uGlut)) * kh;
  amp /= 1.0 + length(amp) / 0.16;
  vec3 mitte = s * 0.94 + amp + schwingung * 0.16;
  // gespannt: alles Vergangene als Licht, wie in Sugimotos Kinos ein ganzer Film in einer Belichtung
  // Die Glut: das gesammelte Licht wird nicht einfach weiss, es erhitzt sich wie Metall im Feuer,
  // von tiefem Rot über Orange und Gold zu einem warmen Weiss nur in den hellsten Stellen.
  // Die Gegenwart bleibt als Zeichnung darin, und wo sich etwas schnell bewegt, flackert die Glut.
  float energie = lu(e4) * 1.05 + lu(e3) * 0.45;
  float hitze = energie * (0.55 + 0.7 * uGlut) * (0.5 + 0.75 * lu(s)) * mix(0.75, 1.25, Tw) + ah * 0.18;
  hitze = hitze / (1.0 + 0.35 * hitze);                       // Schulter: hohe Hitze läuft weich aus
  vec3 glut = mix(vec3(0.0), vec3(0.42, 0.04, 0.02), smoothstep(0.02, 0.22, hitze));
  glut = mix(glut, vec3(0.86, 0.22, 0.05), smoothstep(0.18, 0.42, hitze));
  glut = mix(glut, vec3(1.0, 0.62, 0.2), smoothstep(0.38, 0.62, hitze));
  glut = mix(glut, vec3(1.0, 0.86, 0.6), smoothstep(0.58, 0.8, hitze));
  glut = mix(glut, vec3(1.0, 0.97, 0.9), smoothstep(0.78, 0.98, hitze));
  // die Zeichnung der Gegenwart: feine Kanten als dunkles Gold in der Glut, die Form bleibt lesbar
  glut = mix(glut, glut * 0.55 + vec3(0.5, 0.32, 0.12) * kante, kante * 0.5);
  // wo es kühl bleibt, schimmert die Gegenwart silbern durch: nicht alles wird Feuer
  vec3 gespannt = glut + vec3(lu(s)) * (0.05 + 0.14 * (1.0 - smoothstep(0.15, 0.55, hitze))) + rot * at * 0.08;
  vec3 c = T < 0.5 ? mix(entspannt, mitte, smoothstep(0.0, 1.0, T * 2.0)) : mix(mitte, gespannt, smoothstep(0.0, 1.0, T * 2.0 - 1.0));
  c = mix(c, gespannt, Tw);
  vec2 r = step(uRahmen.xy, v) * step(v, uRahmen.zw);
  o = vec4(max(c, 0.0) * r.x * r.y, 1.0);
}`;

// ---------- Nachbearbeitung: Leuchten, glatte Kanten, Filmkorn (wie Kristall und Schichten) ----------
const FS_HELL = KOPF + `uniform sampler2D uQ; uniform vec2 uPx;
void main(){
  vec3 c = 0.25 * (texture(uQ, v + uPx * vec2(-1, -1)).rgb + texture(uQ, v + uPx * vec2(1, -1)).rgb
                 + texture(uQ, v + uPx * vec2(-1, 1)).rgb + texture(uQ, v + uPx * vec2(1, 1)).rgb);
  float l = max(c.r, max(c.g, c.b));
  o = vec4(c * smoothstep(0.7, 1.2, l), 1.0);
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
  // Leuchten; in der Spannung warm getönt wie die Halation auf Film (das Licht blutet rötlich aus)
  c += texture(uGlow, v).rgb * uGlowFarbe * uGlowStaerke;
  // Korn wie auf Film: in den Mitteltönen am stärksten
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

let linienAn = false, punkteNeu = true, bruchStart = -9, bruchMenge = 0, bruchOrt = { x: 0.5, y: 0.5 };
let flussB = 0, scharfTex = null, scharfB = 0, scharfH = 0, ringTex = null, arbeitB = 0, arbeitH = 0, stromB = 0, stromH = 0;
if (gl) {
  halbFloat = !!gl.getExtension('EXT_color_buffer_float');
  gl.getExtension('OES_texture_half_float_linear');
  try {
    for (const [n, fs] of Object.entries({ kopie: FS_KOPIE, lum: FS_LUM, lk: FS_LK, fglatt: FS_FGLATT, grund: FS_GRUND, warten: FS_WARTEN, vAdvekt: FS_V_ADVEKT, curl: FS_CURL, wirbel: FS_WIRBEL,
      div: FS_DIV, mal: FS_MAL, druck: FS_DRUCK, grad: FS_GRAD, dauer: FS_DAUER, spitze: FS_SPITZE, ema: FS_EMA, uhr: FS_UHR, zucker: FS_ZUCKER, spannung: FS_SPANNUNG,
      hell: FS_HELL, weich: FS_WEICH, zusammen: FS_ZUSAMMEN, punkte: FS_PUNKTE, punkteKopie: FS_PUNKTE_KOPIE })) P[n] = programm(fs);
    if (LINIEN_K) P.linie = programm(FS_LINIE, VS_LINIE);
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
const seitenMass = (lang) => { const s = fotoRahmen.b / fotoRahmen.h; return s >= 1 ? [lang, Math.round(lang / s)] : [Math.round(lang * s), lang]; };
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
    for (const [k, w] of [[gl.TEXTURE_MIN_FILTER, gl.LINEAR], [gl.TEXTURE_MAG_FILTER, gl.LINEAR], [gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE], [gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE]]) gl.texParameteri(gl.TEXTURE_2D, k, w);
  }
  const [ab, ah] = seitenMass(ARBEIT);
  if (ab !== arbeitB || ah !== arbeitH) {
    arbeitB = ab; arbeitH = ah;
    paar('jetzt', ab, ah, false); paar('grund', ab, ah); paar('dauer', ab, ah); paar('spitze', ab, ah);
    // die Rhythmen auf einem gröberen Gitter: das ist zugleich der räumliche Tiefpass der Eulerschen Verstärkung
    const [eb, eh] = seitenMass(Math.round(ARBEIT / 2.5));
    paar('e1', eb, eh); paar('e2', eb, eh); paar('e3', eb, eh); paar('e4', eb, eh);
    if (ringTex) gl.deleteTexture(ringTex);
    ringTex = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D_ARRAY, ringTex);
    gl.texStorage3D(gl.TEXTURE_2D_ARRAY, 1, gl.RGBA8, ab, ah, MOMENTE_MAX);
    for (const [k, w] of [[gl.TEXTURE_MIN_FILTER, gl.LINEAR], [gl.TEXTURE_MAG_FILTER, gl.LINEAR], [gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE], [gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE]]) gl.texParameteri(gl.TEXTURE_2D_ARRAY, k, w);
    gefuellt = false;
  }
  const [vb, vh] = seitenMass(STROM_SEITE);
  if (vb !== stromB || vh !== stromH) {
    stromB = vb; stromH = vh;
    paar('v', vb, vh); paar('p', vb, vh); zielBauen('curl', vb, vh); zielBauen('div', vb, vh);
  }
  const [fb, fh] = seitenMass(FLUSS_SEITE);
  if (fb !== flussB) {
    flussB = fb;
    for (let k = 0; k < 3; k++) { const [b2, h2] = seitenMass(Math.round(FLUSS_SEITE / (1 << k))); zielBauen('lum' + k, b2, h2); zielBauen('fl' + k, b2, h2); zielBauen('flb' + k, b2, h2); }
    paar('fluss', fb, fh);
  }
  const [wb, wh] = seitenMass(WARTEN_SEITE);
  paar('w', wb, wh);
  if (LINIEN_K && P.linie && !ziele.hist && halbFloat) {
    const a = ziel32('punkte0', LINIEN_L, LINIEN_K), c = ziel32('punkte1', LINIEN_L, LINIEN_K), h = ziel32('hist', LINIEN_L, LINIEN_K * MOMENTE_MAX);
    if (a.ok && c.ok && h.ok) { const p = ziele.punkte = { nr: 0 }; p.lesen = () => (p.nr ? c : a); p.schreiben = () => (p.nr ? a : c); p.tauschen = () => { p.nr = 1 - p.nr; }; linienAn = true; }
    else spur('Linien aus (kein Float-Ziel)');
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
  try { nr = e ? (+(localStorage.getItem('dauer.beispiel') || 0)) % BEISPIELE.length : 0; localStorage.setItem('dauer.beispiel', String(nr + 1)); } catch {}
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
  $('wenden').hidden = true; quelle = fotoBuehne; spiegelnQuelle = false; fotoStart = performance.now() / 1000; starten();
}
function fotoMalen(t) {
  fotoBuehneGroesse();
  fotosMalen(fotoBuehne.getContext('2d'), fotos, fotoBuehne.width, fotoBuehne.height, t - fotoStart,
    { dauer: FOTO_DAUER, blende: FOTO_BLENDE, art: 'fahrt', mix: fahrt.schritt(t) });
}
// Fahrt durch das Foto an und aus (feines Zeichen unten rechts, nur bei Fotos); hier zuerst bewegt, weil der Operator Zeit im Bild liest
const fahrtKnopf = document.createElement('button');
fahrtKnopf.className = 'fahrt'; fahrtKnopf.hidden = true; fahrtKnopf.innerHTML = FAHRT_SVG;
$('wenden').after(fahrtKnopf);
neuesBildKnopf();
const fahrt = fahrtSchalter(fahrtKnopf, true);
function fahrtSehen() {
  const weg = quelle !== fotoBuehne; if (fahrtKnopf.hidden !== weg) fahrtKnopf.hidden = weg;
  // bei Fotos und eigenen Videos nimmt die Bühne das Format des Materials an (rahmen in gemeinsam/fotos.js);
  // Kamera und Beispiel bleiben auf dem ganzen Schirm
  const eigenesVideo = quelle === videoEl && videoUrl && videoEl.videoWidth && videoEl.videoHeight;
  rahmenSetzen(leinwand, !weg && fotos.length ? fotos[0].width / fotos[0].height : eigenesVideo ? videoEl.videoWidth / videoEl.videoHeight : 0);
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
const WERTE = [[0.45, 0.6, 0.5], [0.55, 0.5, 0.6], [0.45, 0.5, 0.45]];
let lesart = 1;
const regler = ['r-a', 'r-b', 'r-c'];
function reglerBeschriften() {
  const t = TEXTE[sprache];
  ['n-a', 'n-b', 'n-c'].forEach((id, k) => { $(id).textContent = t.regler[lesart][k]; });
  regler.forEach((id, k) => { $(id).value = String(WERTE[lesart][k]); $(id).setAttribute('aria-label', t.regler[lesart][k]); });
}
regler.forEach((id, k) => $(id).addEventListener('input', (e) => { WERTE[lesart][k] = +e.target.value; }));
const wert = (k) => WERTE[lesart][k];
// Uhr: Takt 0,1 bis 0,8 s zwischen den Momenten; 3 bis 12 Momente; Schmelze: wie schnell und wie lange die Dauer hält
const taktSek = () => 0.1 + 0.7 * Math.pow(WERTE[0][0], 1.4);
const momentZahl = () => Math.round(3 + 9 * WERTE[0][1]);
let titelUhr = 0;
function lesartWaehlen(nr, still) {
  lesart = nr;
  document.querySelectorAll('[data-lesart]').forEach((b) => b.setAttribute('aria-pressed', String(+b.dataset.lesart === nr)));
  $('r-lesart').value = String(nr);
  reglerBeschriften();
  lesartText();
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

// ---------- Das Warten: Stempel des Fingers ----------
const stempel = new Float32Array(16 * 4), stempelR = new Float32Array(16 * 4); let stempelN = 0;
const wisch = new Float32Array(8 * 4), wischR = new Float32Array(8 * 4); let wischN = 0;
const ruehr = new Float32Array(8 * 4); let ruehrN = 0, ruehrRadius = 0.1;
const pinselRadius = () => 0.12 * (fotoRahmen.b < fotoRahmen.h ? 1 : 1.3);   // in Bildhöhen
// r0, r1: Breite am Anfang und am Ende des Stücks; haar ≥ 0 zeichnet die Bahnen der Pinselhaare (Phase je Zug)
function stempeln(x, y, menge, x0 = x, y0 = y, r = pinselRadius(), r0 = r, haar = -1) {
  if (stempelN < 16) { stempel.set([x0, y0, x, y], stempelN * 4); stempelR.set([r0, r, menge, haar], stempelN * 4); stempelN++; }
  else { const k = 15 * 4; stempel[k + 2] = x; stempel[k + 3] = y; stempelR[k + 1] = r; stempelR[k + 2] = Math.max(stempelR[k + 2], menge); }
}
function ruehren(x, y, vx, vy) {
  if (ruehrN < 8) { ruehr.set([x, y, vx, vy], ruehrN * 4); ruehrN++; }
}
// grobes Abbild des Wartens für Klang und Glossen: wie viel Dauer liegt im Bild?
let wartenMenge = 0;

// Nur im Vorspann wartet eine unsichtbare Hand; sonst beginnt alles erst mit der Berührung (Christian, 19.11.2026)
const VORSPANN = Q.has('vorspann');
let geisterStart = -1, geisterZug = 0;
function geisterWarten(t, dt) {
  if (geisterStart < 0 || t < geisterStart) return;
  const u = (t - geisterStart) / 4.2;
  if (u > 1) { geisterStart = t + 2.2; geisterZug++; if (lesart === 0 && wartenMenge > 0.06) bruchAusloesen({ x: 0.5 + ((geisterZug - 1) % 2 ? -0.08 : 0.1), y: 0.6 }); return; }
  const z = geisterZug, x = 0.5 + (z % 2 ? -0.08 : 0.1) + 0.06 * Math.sin(u * 3.1 + z), y = 0.6 + 0.05 * Math.cos(u * 2.3 + z * 1.7);
  stempeln(x, y, 1.1 * dt);
  if (lesart === 1) ruehren(x, y, Math.cos(u * 6.0 + z) * 260, Math.sin(u * 5.0 + z) * 260);
}

// ---------- Daumen: wo auflegen, und ein Ring, der sich füllt, so lange gewartet wird ----------
let daumenGelernt = false, haltZeit = 0;
function haltZeigen(x, y) { const h = $('halt'); h.style.left = (x + fotoRahmen.x) + 'px'; h.style.top = (y + fotoRahmen.y) + 'px'; h.classList.add('da'); }
function haltBild(dt) {
  if (finger.size) haltZeit += dt; else haltZeit = 0;
  $('halt-voll').style.strokeDashoffset = String(1 - Math.min(1, wartenMenge * 1.15));
  const gezogen = [...finger.values()].some((f) => f.bewegt > 120);
  if (!daumenGelernt && (haltZeit > 1.2 || gezogen)) { daumenGelernt = true; $('daumen').classList.add('weg'); setTimeout(() => { $('daumen').hidden = true; }, 800); }
}

// ---------- Gesten ----------
// In allen Lesarten: der ruhende Finger füllt Dauer ein (halten = warten), ziehen verteilt sie dünner.
// Im Zucker rührt das Ziehen zusätzlich die Strömung um.
const finger = new Map();
const aufLeinwand = (cx, cy) => ({ x: cx / fotoRahmen.b, y: 1 - cy / fotoRahmen.h });
leinwand.addEventListener('pointerdown', (e) => {
  finger.set(e.pointerId, { x: (e.clientX - fotoRahmen.x), y: (e.clientY - fotoRahmen.y), t: performance.now(), vx: 0, vy: 0, bewegt: 0, k: 1, r: 0, haar: Math.random() * 60 });
  leinwand.setPointerCapture(e.pointerId); $('geste').classList.add('weg');
  haltZeigen((e.clientX - fotoRahmen.x), (e.clientY - fotoRahmen.y));
  geisterStart = -1;
  glosse('warten');
});
leinwand.addEventListener('pointermove', (e) => {
  const f = finger.get(e.pointerId); if (!f) return;
  const jetzt = performance.now(), dt = Math.max(8, jetzt - f.t) / 1000;
  const dx = (e.clientX - fotoRahmen.x) - f.x, dy = (e.clientY - fotoRahmen.y) - f.y;
  const a = aufLeinwand(f.x, f.y), p = aufLeinwand((e.clientX - fotoRahmen.x), (e.clientY - fotoRahmen.y));
  // entlang des Wegs wie ein Pinsel: langsam breit und satt, schnell schmal; der Zug beginnt spitz
  const tempo = Math.hypot(dx, dy) / dt;
  f.k += (Math.max(0.16, Math.min(1, 1.12 - tempo / 1500)) - f.k) * 0.3;
  const spitze = Math.min(1, f.bewegt / 70), R = pinselRadius() * 0.8;
  const r1 = R * f.k * (0.15 + 0.85 * spitze), r0 = f.r || r1 * 0.5;
  stempeln(p.x, p.y, 0.09 + 0.07 * (1 - f.k), a.x, a.y, r1, r0, f.haar);
  f.r = r1;
  if (lesart === 1) {
    const s = STROM_SEITE / fotoRahmen.h;   // Bildpunkte je Sekunde → Gitterpunkte je Sekunde
    ruehren(p.x, p.y, dx / dt * s * 0.55, -dy / dt * s * 0.55);
    ruehrRadius = 0.035 + 0.075 * f.k;
    if (wischN < 8) { wisch.set([a.x, a.y, p.x, p.y], wischN * 4); wischR.set([r0 * 0.9, r1 * 0.9, 0.9, f.haar], wischN * 4); wischN++; }
  }
  f.vx = dx / dt; f.vy = dy / dt; f.bewegt += Math.hypot(dx, dy);
  f.x = (e.clientX - fotoRahmen.x); f.y = (e.clientY - fotoRahmen.y); f.t = jetzt;
  haltZeigen((e.clientX - fotoRahmen.x), (e.clientY - fotoRahmen.y));
});
const loslassen = (e) => {
  const f = finger.get(e.pointerId);
  // wer im Zug loslässt, lässt eine Spitze stehen: der Pinsel hebt sich in Richtung der Bewegung ab
  if (f && f.r > 0 && performance.now() - f.t < 80) {
    const v = Math.hypot(f.vx, f.vy);
    if (v > 120) {
      const l = Math.min(90, v * 0.05), a = aufLeinwand(f.x, f.y), b = aufLeinwand(f.x + f.vx / v * l, f.y + f.vy / v * l);
      stempeln(b.x, b.y, 0.12, a.x, a.y, f.r * 0.08, f.r, f.haar);
    }
  }
  finger.delete(e.pointerId);
  if (finger.size === 0) $('halt').classList.remove('da');
  // in der Uhr zerspringt die Dauer, wenn der letzte Finger geht
  if (lesart === 0 && finger.size === 0 && wartenMenge > 0.06) bruchAusloesen(f ? aufLeinwand(f.x, f.y) : null);
};
function bruchAusloesen(ort) {
  bruchStart = performance.now() / 1000; bruchMenge = wartenMenge; if (ort) bruchOrt = ort;
  klangBruch(wartenMenge); glosse('bruch');
}
leinwand.addEventListener('pointerup', loslassen);
leinwand.addEventListener('pointercancel', loslassen);

// ---------- Geführter Einstieg: zuerst Bild und Finger, dann die Lesarten, dann die Regler, zuletzt die Tasten ----------
const EINSTIEG = 'dauer.einstieg';
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
  einstiegBeginnen(); $('ton').hidden = false; tonZeigen(); grundNeu = true; rhythmusNeu = true;
  $('auftakt').hidden = true; $('kopf').hidden = false; $('regler').hidden = false;
  $('geste').textContent = TEXTE[sprache].lesarten[lesart].geste; $('geste').hidden = false; $('geste').classList.remove('weg');
  setTimeout(() => $('geste').classList.add('weg'), 5500);
  if (!VORSPANN && !daumenGelernt) { $('daumen').hidden = false; $('daumen').classList.remove('weg'); }
  groesse();
  if (VORSPANN && geisterStart < 0) geisterStart = performance.now() / 1000 + 1.6;
  if (!laeuft && gl && P.uhr) { laeuft = true; requestAnimationFrame(bild); }
}

// ---------- Schleife ----------
let rhythmusNeu = true, grundStart = 0, kopf = 0, letzterTakt = 0, gefuellt = false, standbildWunsch = false, ersterLauf = true, letzteMs = 0, taktNr = 0, grundNeu = true;
function bild(ms) {
  const t = ms / 1000;
  fahrtSehen(); if (quelle === fotoBuehne) fotoMalen(performance.now() / 1000);
  const dtMs = ms - (letzteMs || ms - 16.7), dt = Math.min(0.1, Math.max(0.004, dtMs / 1000)); letzteMs = ms;
  tempoMessen(ms, dtMs);
  if (!scharfFangen()) { requestAnimationFrame(bild); return; }
  const AB = { b: arbeitB, h: arbeitH }, pxA = [1 / arbeitB, 1 / arbeitH];

  // 1. die Gegenwart in Arbeitsgrösse; die vorige bleibt für die Bewegung
  const J = ziele.jetzt;
  if (neuesBild) J.tauschen();
  rechne(P.kopie, J.schreiben(), { uQ: scharfTex });
  const jetzt = J.schreiben(), vor = J.lesen();

  // 2. der Ring der Momente (Uhr): ein Moment je Takt, mit leisem Ticken
  const takt = taktSek();
  // ein Moment fällt immer auf ein neues Videobild: so steht jeder sauber für sich
  const taktJetzt = !gefuellt || (t - letzterTakt >= takt && neuesBild);
  if (taktJetzt) {
    gl.bindFramebuffer(gl.READ_FRAMEBUFFER, jetzt.fb);
    gl.bindTexture(gl.TEXTURE_2D_ARRAY, ringTex);
    if (!gefuellt) { for (let l = 0; l < MOMENTE_MAX; l++) gl.copyTexSubImage3D(gl.TEXTURE_2D_ARRAY, 0, 0, 0, l, 0, 0, arbeitB, arbeitH); gefuellt = true; }
    else { kopf = (kopf + 1) % MOMENTE_MAX; gl.copyTexSubImage3D(gl.TEXTURE_2D_ARRAY, 0, 0, 0, kopf, 0, 0, arbeitB, arbeitH); }
    gl.bindFramebuffer(gl.READ_FRAMEBUFFER, null);
    letzterTakt = t; taktNr++;
    if (lesart === 0) klangTakt(taktNr, wartenMenge);
    if (lesart === 0 && linienAn && taktNr === 6) glosse('linien');
  }

  // 3. der ruhende Grund
  const G = ziele.grund;
  rechne(P.grund, G.schreiben(), { uAlt: G.lesen(), uJetzt: jetzt }, (u) => gl.uniform1f(u.uRate, grundNeu ? 1 : 1 - Math.exp(-dt / (t - grundStart < 1 ? 0.15 : 1.4))));
  G.tauschen(); if (grundNeu) grundStart = t; grundNeu = false;

  // 3b. der optische Fluss zwischen dem vorigen und diesem Bild (nur wenn ein neues kam)
  const FL = ziele.fluss;
  if (neuesBild) {
    for (let k = 0; k < 3; k++) { const z = ziele['lum' + k]; rechne(P.lum, z, { uJetzt: jetzt, uVor: vor }, (u) => gl.uniform2f(u.uPx, 1 / z.b, 1 / z.h)); }
    // von grob nach fein; auf jeder Stufe zwei Schritte
    let f0 = null;
    for (let k = 2; k >= 0; k--) {
      const L = ziele['lum' + k], A = ziele['fl' + k], B = ziele['flb' + k];
      rechne(P.lk, A, { uLum: L, uF0: f0 || L }, (u) => { gl.uniform2f(u.uPx, 1 / L.b, 1 / L.h); gl.uniform1f(u.uMitF0, f0 ? 1 : 0); });
      rechne(P.lk, B, { uLum: L, uF0: A }, (u) => { gl.uniform2f(u.uPx, 1 / L.b, 1 / L.h); gl.uniform1f(u.uMitF0, 1); });
      f0 = B;
    }
    rechne(P.fglatt, FL.schreiben(), { uF: f0, uAlt: FL.lesen() }, (u) => { gl.uniform2f(u.uPx, 1 / f0.b, 1 / f0.h); gl.uniform1f(u.uNeu, 1); });
  } else rechne(P.fglatt, FL.schreiben(), { uF: FL.lesen(), uAlt: FL.lesen() }, (u) => { gl.uniform2f(u.uPx, 0, 0); gl.uniform1f(u.uNeu, 0); });
  FL.tauschen();
  const fluss = FL.lesen();

  // 3c. Mareys Linien: die Punkte reisen mit dem Fluss; je Takt wird ihre Lage in den Verlauf geschrieben
  if (linienAn && lesart === 0) {
    const Z = ziele.punkte;
    rechne(P.punkte, Z.schreiben(), { uZ: Z.lesen(), uFl: fluss, uJetzt: jetzt, uGrund: G.lesen() }, (u) => {
      gl.uniform1f(u.uNeu, neuesBild ? 1 : 0); gl.uniform1f(u.uTakt, taktJetzt ? 1 : 0); gl.uniform1f(u.uTaktNr, taktNr % 997);
      gl.uniform1f(u.uLaenge, 0.13); gl.uniform1f(u.uSeite, fotoRahmen.b / fotoRahmen.h); gl.uniform1f(u.uStart, punkteNeu ? 1 : 0);
    });
    Z.tauschen(); punkteNeu = false;
    if (taktJetzt) {
      const Hs = ziele.hist;
      gl.bindFramebuffer(gl.FRAMEBUFFER, Hs.fb); gl.viewport(0, kopf * LINIEN_K, LINIEN_L, LINIEN_K);
      gl.useProgram(P.punkteKopie); gl.activeTexture(gl.TEXTURE1); gl.bindTexture(gl.TEXTURE_2D, Z.lesen().tex);
      gl.uniform1i(P.punkteKopie.u.uZ, 1); gl.uniform1i(P.punkteKopie.u.uZeile, kopf * LINIEN_K); zeichneFlaeche();
    }
  } else punkteNeu = true;

  // 4. das Warten: ruhende Finger füllen Dauer ein
  for (const f of finger.values()) {
    const p = aufLeinwand(f.x, f.y), ruhig = Math.max(0, 1 - Math.hypot(f.vx, f.vy) / 900);
    stempeln(p.x, p.y, (0.25 + 0.9 * ruhig) * dt * (lesart === 1 ? 1.2 : 1));
    f.vx *= Math.pow(0.02, dt); f.vy *= Math.pow(0.02, dt);
  }
  if (geisterStart > 0) geisterWarten(t, dt);
  const Wp = ziele.w, wb = Wp.lesen().b, wh = Wp.lesen().h;
  // wie lange die Dauer bleibt, wenn der Finger geht: Uhr nach «Schmelze», Zucker nach «Warten», Spannung mittel
  const bruchT = (t - bruchStart) / 1.7, bruch = lesart === 0 && bruchT >= 0 && bruchT < 1 ? 1 : 0;
  const halten = bruch ? 1.0 : lesart === 0 ? 0.6 + 6 * WERTE[0][2] : lesart === 1 ? 1.5 + 14 * WERTE[1][0] : 3;
  rechne(P.warten, Wp.schreiben(), { uAlt: Wp.lesen() }, (u) => {
    gl.uniform2f(u.uPx, 1 / wb, 1 / wh); gl.uniform4fv(u.uStempel, stempel); gl.uniform4fv(u.uStempelR, stempelR);
    gl.uniform1i(u.uN, stempelN); gl.uniform1f(u.uAb, dt / halten); gl.uniform1f(u.uSchritt, WARTEN_SEITE / 256); gl.uniform1f(u.uSeite, fotoRahmen.b / fotoRahmen.h);
  });
  Wp.tauschen();
  let summe = 0; for (let i = 0; i < stempelN; i++) summe += stempelR[i * 4 + 2];
  wartenMenge = Math.max(0, Math.min(1, wartenMenge + summe * 0.6 - dt / halten * (0.3 + wartenMenge)));
  stempelN = 0;
  const W = Wp.lesen();

  // 5. die Strömung (nur im Zucker)
  const V = ziele.v, pxS = [1 / stromB, 1 / stromH];
  if (lesart === 1) {
    const wirbel = WERTE[1][1];
    rechne(P.vAdvekt, V.schreiben(), { uV: V.lesen(), uFl: fluss, uW: W }, (u) => {
      gl.uniform2f(u.uPx, pxS[0], pxS[1]); gl.uniform1f(u.uDt, dt);
      gl.uniform1f(u.uHalt, 1 / (1 + (0.15 + 0.9 * (1 - wirbel)) * dt)); gl.uniform1f(u.uBewegt, 0.6 * (0.3 + wirbel)); gl.uniform1f(u.uSeite, fotoRahmen.b / fotoRahmen.h);
      gl.uniform4fv(u.uRuehr, ruehr); gl.uniform1i(u.uRN, ruehrN); gl.uniform1f(u.uRuehrR, ruehrRadius);
    });
    V.tauschen();
    rechne(P.curl, ziele.curl, { uV: V.lesen() }, (u) => gl.uniform2f(u.uPx, pxS[0], pxS[1]));
    rechne(P.wirbel, V.schreiben(), { uV: V.lesen(), uC: ziele.curl }, (u) => { gl.uniform2f(u.uPx, pxS[0], pxS[1]); gl.uniform1f(u.uWirbel, 3 + 32 * wirbel); gl.uniform1f(u.uDt, dt); });
    V.tauschen();
    rechne(P.div, ziele.div, { uV: V.lesen() }, (u) => gl.uniform2f(u.uPx, pxS[0], pxS[1]));
    const Pp = ziele.p;
    rechne(P.mal, Pp.schreiben(), { uQ: Pp.lesen() }, (u) => gl.uniform1f(u.uF, 0.8)); Pp.tauschen();
    for (let i = 0; i < DRUCK_SCHRITTE; i++) {
      rechne(P.druck, Pp.schreiben(), { uP: Pp.lesen(), uD: ziele.div }, (u) => gl.uniform2f(u.uPx, pxS[0], pxS[1]));
      Pp.tauschen();
    }
    rechne(P.grad, V.schreiben(), { uP: Pp.lesen(), uV: V.lesen() }, (u) => gl.uniform2f(u.uPx, pxS[0], pxS[1]));
    V.tauschen();
  }
  ruehrN = 0;

  // 6. die Dauer (Uhr und Zucker)
  const D = ziele.dauer;
  if (lesart !== 2) {
    const uhr = lesart === 0;
    // Uhr: ohne Warten kurzes Gedächtnis (0,3 s), im Warten bis 1,5 bis 5 s; Zucker: ohne Warten die Gegenwart, im Warten 2 bis 20 s
    const langsam = uhr ? 1.5 + 3.5 * WERTE[0][2] : 2 + 18 * WERTE[1][0];
    rechne(P.dauer, D.schreiben(), { uD: D.lesen(), uJetzt: jetzt, uGrund: G.lesen(), uW: W, uV: V.lesen(), uFl: fluss }, (u) => {
      gl.uniform1f(u.uHaltW, uhr ? 0.85 : 0.3); gl.uniform1f(u.uSeite, fotoRahmen.b / fotoRahmen.h);
      gl.uniform4fv(u.uWisch, wisch); gl.uniform4fv(u.uWischR, wischR); gl.uniform1i(u.uWN, uhr ? 0 : wischN);
      gl.uniform1f(u.uSchmier, uhr ? 1.6 : 0.5); gl.uniform1f(u.uSchmelz, uhr ? 0.5 : 0); gl.uniform1f(u.uZufall, Math.random());
      gl.uniform2f(u.uPx, pxA[0], pxA[1]); gl.uniform2f(u.uPxS, pxS[0], pxS[1]); gl.uniform1f(u.uDt, dt);
      gl.uniform1f(u.uSchnell, uhr ? 1 - Math.exp(-dt / 0.3) : 1); gl.uniform1f(u.uLangsam, 1 - Math.exp(-dt / langsam));
      gl.uniform1f(u.uAdvekt, uhr ? 0 : 1); gl.uniform1f(u.uMatte, uhr ? 1 : 0); gl.uniform1f(u.uLoesen, uhr ? 0 : 0.02 + 0.08 * WERTE[1][2]);
    });
    D.tauschen();
    wischN = 0;
    if (uhr) {
      const Sp = ziele.spitze;
      rechne(P.spitze, Sp.schreiben(), { uAlt: Sp.lesen(), uJetzt: jetzt, uGrund: G.lesen(), uW: W, uFl: fluss }, (u) => {
        gl.uniform1f(u.uAbkl, Math.exp(-dt / 0.25)); gl.uniform1f(u.uAbklW, Math.exp(-dt / (1.2 + 4 * WERTE[0][2])));
        gl.uniform1f(u.uZufall, Math.random()); gl.uniform2f(u.uPx, pxA[0], pxA[1]);
      });
      Sp.tauschen();
    }
  }

  if (lesart !== 2) rhythmusNeu = true;
  wischN = 0;
  // 7. die Rhythmen (Spannung): Gedächtnisse von etwa 1/f Sekunden
  if (lesart === 2) {
    const fHoch = 0.5 * Math.pow(12, WERTE[2][1]);   // 0,5 bis 6 Hz: Atem, Puls, Flimmern
    const raten = [1 - Math.exp(-dt * 2 * Math.PI * fHoch), 1 - Math.exp(-dt * 2 * Math.PI * fHoch / 3.5), 1 - Math.exp(-dt / 7), Math.exp(-dt / 5)];
    ['e1', 'e2', 'e3', 'e4'].forEach((n, k) => {
      const E = ziele[n];
      rechne(P.ema, E.schreiben(), { uAlt: E.lesen(), uJetzt: jetzt }, (u) => { gl.uniform1f(u.uRate, rhythmusNeu ? (k === 3 ? 0 : 1) : raten[k]); gl.uniform1f(u.uSpitze, k === 3 ? 1 : 0); });
      E.tauschen();
    });
    rhythmusNeu = false;
  }

  // 8. die Lesart
  const sz = zielBauen('szene', leinwand.width, leinwand.height, false);
  const rahmenGL = [rahmen[0], rahmen[1], rahmen[2], rahmen[3]];
  if (lesart === 0) {
    rechne(P.uhr, sz, { uScharf: scharfTex, uJetzt: jetzt, uGrund: G.lesen(), uD: D.lesen(), uSp: ziele.spitze.lesen(), uW: W, uRing: { array: ringTex } }, (u) => {
      gl.uniform1f(u.uKopf, kopf); gl.uniform1f(u.uN, MOMENTE_MAX); gl.uniform1f(u.uM, momentZahl());
      gl.uniform1f(u.uLinie, 1.1 * Math.max(1, leinwand.height / 1400)); gl.uniform1f(u.uT, t % 100); gl.uniform1f(u.uSeite, fotoRahmen.b / fotoRahmen.h);
      gl.uniform4f(u.uRahmen, ...rahmenGL);
      gl.uniform1f(u.uBruch, bruch ? Math.min(1, bruchT * 12) * Math.min(1, bruchMenge * 3) : 0); gl.uniform1f(u.uBruchT, Math.max(0, bruchT)); gl.uniform2f(u.uBM, bruchOrt.x * fotoRahmen.b / fotoRahmen.h, bruchOrt.y);
      gl.uniform1f(u.uPlatte, linienAn ? 0.78 : 1);
    });
    if (linienAn) linienZeichnen(sz, W);
  } else if (lesart === 1) {
    rechne(P.zucker, sz, { uScharf: scharfTex, uD: D.lesen(), uW: W, uV: V.lesen() }, (u) => {
      gl.uniform2f(u.uPxD, pxA[0], pxA[1]); gl.uniform2f(u.uPxW, WARTEN_SEITE / 256 / wb, WARTEN_SEITE / 256 / wh); gl.uniform1f(u.uSchlieren, 0.2 + 1.6 * WERTE[1][2]);
      gl.uniform1f(u.uSeite, fotoRahmen.b / fotoRahmen.h); gl.uniform4f(u.uRahmen, ...rahmenGL);
    });
  } else {
    rechne(P.spannung, sz, { uScharf: scharfTex, uE1: ziele.e1.lesen(), uE2: ziele.e2.lesen(), uE3: ziele.e3.lesen(), uE4: ziele.e4.lesen(), uW: W }, (u) => {
      gl.uniform1f(u.uSpannung, WERTE[2][0]); gl.uniform1f(u.uGlut, WERTE[2][2]); gl.uniform4f(u.uRahmen, ...rahmenGL);
    });
  }
  nachbearbeiten(t);
  haltBild(dt);
  klangBild({ lesart, warten: wartenMenge, finger: finger.size, werte: WERTE[lesart], takt });
  if (standbildWunsch) { standbildWunsch = false; leinwand.toBlob((b) => b && zeigen(b, 'dauer-' + zeitstempel() + '.png')); }
  if (ersterLauf && gefuellt) { ersterLauf = false; spur('✓ läuft'); }
  requestAnimationFrame(bild);
}
// Mareys Linien über die Platte: Glieder, Bahnen, Knöpfe; mit Vormultiplikation über das Bild gelegt
function linienZeichnen(sz, W) {
  const p = P.linie, M = Math.min(momentZahl(), MOMENTE_MAX - 1), PK = 4, dpr = leinwand.height / fotoRahmen.h;
  gl.bindFramebuffer(gl.FRAMEBUFFER, sz.fb); gl.viewport(0, 0, sz.b, sz.h);
  gl.useProgram(p);
  gl.activeTexture(gl.TEXTURE1); gl.bindTexture(gl.TEXTURE_2D, ziele.hist.tex); gl.uniform1i(p.u.uHist, 1);
  gl.activeTexture(gl.TEXTURE2); gl.bindTexture(gl.TEXTURE_2D, ziele.punkte.lesen().tex); gl.uniform1i(p.u.uZ, 2);
  gl.activeTexture(gl.TEXTURE3); gl.bindTexture(gl.TEXTURE_2D, W.tex); gl.uniform1i(p.u.uW, 3);
  gl.uniform1i(p.u.uL, LINIEN_L); gl.uniform1i(p.u.uK, LINIEN_K); gl.uniform1i(p.u.uKopf, kopf); gl.uniform1i(p.u.uN, MOMENTE_MAX); gl.uniform1i(p.u.uP, PK);
  gl.uniform1f(p.u.uM, M); gl.uniform2f(p.u.uRes, sz.b, sz.h);
  gl.enable(gl.BLEND); gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
  gl.uniform3f(p.u.uFarbe, 0.98, 0.96, 0.9);
  // die Bahnen (uArt 1) bleiben aus: mit ihnen wurde aus dem Fächer ein Gitter
  gl.uniform1f(p.u.uBreite, 0.75 * dpr); gl.uniform1i(p.u.uArt, 0); gl.drawArraysInstanced(gl.TRIANGLE_STRIP, 0, 4, (M + 1) * LINIEN_K * (LINIEN_L - 1));
  gl.uniform3f(p.u.uFarbe, 1.0, 0.9, 0.82);
  gl.uniform1f(p.u.uBreite, 0.8 * dpr); gl.uniform1i(p.u.uArt, 2); gl.drawArraysInstanced(gl.TRIANGLE_STRIP, 0, 4, (M + 1) * LINIEN_K * PK);
  gl.disable(gl.BLEND);
}
function nachbearbeiten(t) {
  const B = leinwand.width, H = leinwand.height, b4 = Math.max(1, Math.round(B / 4)), h4 = Math.max(1, Math.round(H / 4));
  const sz = ziele.szene, gA = zielBauen('glowA', b4, h4), gB = zielBauen('glowB', b4, h4);
  rechne(P.hell, gA, { uQ: sz }, (u) => gl.uniform2f(u.uPx, 1.5 / B, 1.5 / H));
  rechne(P.weich, gB, { uQ: gA }, (u) => gl.uniform2f(u.uRichtung, 1.6 / b4, 0));
  rechne(P.weich, gA, { uQ: gB }, (u) => gl.uniform2f(u.uRichtung, 0, 1.6 / h4));
  rechne(P.zusammen, null, { uSzene: sz, uGlow: gA }, (u) => {
    gl.uniform2f(u.uPx, 1 / B, 1 / H); gl.uniform1f(u.uGlowStaerke, lesart === 2 ? 0.45 : 0.4); gl.uniform3f(u.uGlowFarbe, ...(lesart === 2 ? [1.0, 0.62, 0.42] : [1, 1, 1])); gl.uniform1f(u.uT, t % 100);
    gl.uniform1f(u.uKorn, lesart === 0 ? 0.05 : 0.03);
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
    zeigen(b, 'dauer-' + zeitstempel() + (b.type.includes('mp4') ? '.mp4' : '.webm'));
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

// ---------- ?spur: die Spur unten auf der Seite, mit einer Taste zum Kopieren (wie im Kristall) ----------
if (Q.has('spur')) {
  const kasten = document.createElement('div');
  kasten.style.cssText = 'position:fixed;left:8px;right:8px;top:calc(max(16px, env(safe-area-inset-top)) + 44px);z-index:9;max-height:30vh;overflow:auto;padding:10px 12px;background:rgba(10,10,11,.92);border-left:2px solid #c8102e;font:12px/1.4 "Barlow Condensed",sans-serif;color:#f1eee6;white-space:pre-wrap';
  const text = document.createElement('div'), taste = document.createElement('button');
  taste.textContent = 'Spur kopieren';
  taste.style.cssText = 'margin-top:8px;padding:6px 0;background:none;border:0;color:#c8102e;font:inherit;letter-spacing:.18em;text-transform:uppercase;cursor:pointer';
  const inhalt = () => {
    let jetzt = []; try { jetzt = JSON.parse(localStorage.getItem(SPUR) || '[]'); } catch {}
    return 'Dauer ' + (document.querySelector('script[src*="dauer.js"]')?.getAttribute('src') || '') + '\n' + navigator.userAgent + '\nGrafik: ' + (grafikName || '?') +
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

// jeder Besuch beginnt mit dem Zucker (Christian, 20.11.2026)
lesartWaehlen(1, true);
uebersetzen();
// Direktstart für Tests und Vorführungen: ?beispiel, ?lesart=0|1|2
if (Q.has('lesart')) lesartWaehlen(Math.max(0, Math.min(2, +Q.get('lesart') || 0)), true);
if (Q.has('beispiel')) beispielStarten();
// für Prüfungen: Werte setzen und den Finger von aussen führen
window.__dauer = { WERTE, stempeln, ruehren, finger, lesartWaehlen };
