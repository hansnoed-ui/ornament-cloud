// Ritornell – Operator VII von the deleuzian scheme (Deleuze und Guattari, Mille plateaux, 1980, Plateau 11 «1837 – De la ritournelle»).
// Drei Aspekte einer einzigen Sache, nicht drei Stufen: im Chaos ein fester Punkt (das Kind, das im Dunkeln summt),
// ein Kreis um diesen Punkt (das Zuhause, das Revier), und der Kreis, der sich öffnet (hinaus in den Kosmos).
// Drei Lesarten: Summen (die Stimme ordnet das Bild wie Sand auf einer Klangplatte, nach Chladni 1787),
// Revier (Marken im Takt, der Refrain wiederholt sie, aus der Wiederholung wächst ein Revier), Kosmos (die Öffnung,
// durch die das Bild als Spirale aus Zeit hinausströmt). Dazu ein Gedächtnis der letzten Sekunden des Bildes (Zeitschichten),
// aus dem das Chaos die Momente durcheinanderwirft und die Ringe des Refrains ihre Echos holen.
// WebGL2, ohne Bibliotheken, ohne CDN. Aufbau, Quellen, Aufnahme, Glossen und Einstieg wie Figur und Fläche.

import { klangStarten, klangBild, klangAn, klangIstAn, klangSpur, klangSummen, klangSchlag, klangGlas, klangOberton, klangFunke } from './klang.js?v=3';
import { aufnahmeDatei } from '../gemeinsam/aufnahme.js?v=1';
import { fotoLesen, istVideo, istFoto, istHeic, dateiMeldung, fotosMalen, fahrtSchalter, FAHRT_SVG, rahmen as fotoRahmen, rahmenSetzen } from '../gemeinsam/fotos.js?v=4';

const $ = (id) => document.getElementById(id);
const Q = new URLSearchParams(location.search);

// ---------- Sprache ----------
// Die Stellen aus Mille plateaux sind in eigenen Worten wiedergegeben («sinngemäss»), bis sie am Buch geprüft sind.
// Wörtlich steht nur Klee (Schöpferische Konfession, 1920).
const PL = { de: 'Deleuze, Guattari, Mille plateaux, 1980, Plateau 11', en: 'Deleuze, Guattari, A Thousand Plateaus, 1980, plateau 11', fr: 'Deleuze, Guattari, Mille plateaux, 1980, plateau 11' };
const SG = { de: ', sinngemäss', en: ', paraphrased', fr: ', en substance' };
const q = (s) => (k) => PL[s] + (k || '') + SG[s];
const TEXTE = {
  de: {
    titel: 'Ritornell', satz: 'Ein Kind im Dunkeln summt sich Mut zu. Aus dem Lied wird ein Kreis, aus dem Kreis ein Zuhause, und eines Tages öffnet er sich.',
    kamera: 'Kamera', video: 'Video oder Fotos', beispiel: 'Beispiel', lesart: 'Lesart',
    glossen: {
      chantonner: { begriff: 'la ritournelle', satz: 'Ein Kind im Dunkeln hat Angst und beruhigt sich, indem es vor sich hin singt. Das Lied ist ein erster fester Punkt im Chaos.', zitat: '', quelle: q('de')() },
      chaos: { begriff: 'le chaos', satz: 'Chaos ist nicht das Gegenteil des Rhythmus. Es ist das Milieu aller Milieus, aus dem jeder Rhythmus kommt und in das er zurückfällt.', zitat: '', quelle: q('de')() },
      sable: { begriff: 'Klangfiguren', satz: 'Chladni streute 1787 Sand auf eine gestrichene Platte: Der Sand sammelt sich dort, wo sie ruht. Hier zeichnet die Stimme die Linien, jede Note eine andere Figur.', zitat: '', quelle: 'E. F. F. Chladni, Entdeckungen über die Theorie des Klanges, Leipzig 1787' },
      voix: { begriff: 'le centre', satz: 'Wie weit die Stimme trägt: der feste Punkt ist zerbrechlich, ein kleiner Raum der Ordnung um das Kind.', zitat: '', quelle: q('de')() },
      milieu: { begriff: 'les milieux', satz: 'Das Milieu ist nicht ruhig. Es ist Schwingung, Wechsel, jeder Ort ein anderer Takt. Hier, wie heftig es das Bild durcheinanderwirft.', zitat: '', quelle: q('de')() },
      chezsoi: { begriff: 'le chez-soi', satz: 'Das Zuhause gibt es nicht schon vorher. Man muss einen Kreis um den unsicheren Mittelpunkt ziehen und einen begrenzten Raum einrichten.', zitat: '', quelle: q('de')() },
      expression: { begriff: 'les matières d’expression', satz: 'Ein Revier entsteht, wenn Farben, Laute und Linien nicht mehr nur dienen, sondern zu Marken werden. Der Vogel Scenopoeetes wendet jeden Morgen Blätter um, damit ihre helle Unterseite leuchtet.', zitat: '', quelle: q('de')() },
      rythme: { begriff: 'le rythme', satz: 'Rhythmus ist nicht Takt. Er liegt zwischen den Milieus, im Übergang, dort, wo sie sich berühren. Hier, wie schnell der Refrain geht.', zitat: '', quelle: q('de')() },
      territoire: { begriff: 'le territoire', satz: 'Das Revier ist ein Akt: Es wächst mit jeder Wiederholung der Marken. Hier, wie weit jede Marke ihr Revier zieht.', zitat: '', quelle: q('de')() },
      echo: { begriff: 'la reprise', satz: 'Ritornell heisst Wiederkehr. Jede Marke sendet bei jedem Schlag einen Ring aus, und der Ring trägt das Bild von eben, nie ganz dasselbe.', zitat: '', quelle: q('de')() },
      cosmos: { begriff: 'le cosmos', satz: 'Man öffnet den Kreis einen Spalt, lässt jemanden herein oder bricht selbst auf. Man verlässt das Revier auf einer Linie, die ins Weite führt.', zitat: '', quelle: q('de')() },
      klee: { begriff: 'rendre visible', satz: 'Nicht das Sichtbare wiedergeben, sondern Kräfte sichtbar machen, die nicht sichtbar sind: die Kräfte des Kosmos.', zitat: '«Kunst gibt nicht das Sichtbare wieder, sondern macht sichtbar.»', quelle: 'Paul Klee, Schöpferische Konfession, 1920' },
      trois: { begriff: 'trois aspects', satz: 'Chaos, Revier und Kosmos sind keine drei Stufen nacheinander, sondern drei Seiten derselben Sache: des Ritornells.', zitat: '', quelle: q('de')() },
      fuite: { begriff: 'les lignes de fuite', satz: 'Wie viele Linien aus der Öffnung hinausführen. Jede trägt das Bild in eine andere Zeit.', zitat: '', quelle: q('de')() },
      spirale: { begriff: 'la spirale', satz: 'Wie weit sich die Linien winden, bevor sie sich im Kosmos verlieren.', zitat: '', quelle: q('de')() },
      forces: { begriff: 'les forces cosmiques', satz: 'Die Kräfte des Kosmos sind nicht zu sehen, nur das, was sie mit dem Material tun. Hier, wie viel Licht im Dunkeln steht.', zitat: '', quelle: q('de')() }
    },
    regler: [['Stimme', 'Milieu', 'Sand'], ['Tempo', 'Revier', 'Echo'], ['Linien', 'Spirale', 'Sterne']],
    reglerGlosse: [['voix', 'milieu', 'sable'], ['rythme', 'territoire', 'echo'], ['fuite', 'spirale', 'forces']],
    lesarten: [
      { kurz: 'Summen', titel: 'Im Dunkeln', wer: 'Deleuze, Guattari, Chladni', geste: 'Den Daumen auflegen und halten.', text: 'Das Plateau über das Ritornell beginnt mit einem Kind, das im Dunkeln Angst hat und sich beruhigt, indem es vor sich hin singt. Das Lied ist ein erster stabiler Punkt im Chaos, zerbrechlich, aber er hält. Chaos heisst dabei nicht Unordnung schlechthin: Es ist das Milieu aller Milieus, Schwingung, Wechsel, aus dem jeder Rhythmus kommt. Hier fällt beim Berühren die Nacht über das Bild, die Momente der letzten Sekunden geraten durcheinander. Hältst du den Daumen, summt eine Stimme das alte Kinderlied, und um den Daumen zerfällt das Bild zu Sand auf einer Klangplatte wie bei Chladni: Wo die Platte schwingt, springen die Körner auf, wo sie ruht, sammeln sie sich zu Linien. Jede Note eine andere Figur, und jedes Korn trägt die Farbe der Stelle, von der es kam. Ziehst du den Daumen, pflügt er durch den Sand; lässt du los, fliegt jedes Korn zurück, und das Bild fügt sich wieder zusammen.' },
      { kurz: 'Revier', titel: 'Das Zuhause', wer: 'Deleuze, Guattari, Messiaen', geste: 'Im Takt auf das Bild tippen.', text: 'Das Zuhause gibt es nicht schon vorher. Man zieht einen Kreis um den unsicheren Punkt und richtet einen begrenzten Raum ein. Ein Revier entsteht, wenn Dinge des Milieus zu Marken werden: eine Farbe, ein Laut, eine Haltung, das helle Blatt des Vogels Scenopoeetes, der Gesang, den Messiaen aufschrieb. Und es entsteht durch Wiederholung. Hier setzt jedes Tippen eine Marke in den Takt. Der Refrain spielt sie immer wieder, jede Marke klingt und sendet einen Ring aus, der ein Echo des Bildes von eben trägt. Mit jeder Wiederholung wächst das Revier: innen klar und warm, draussen das Chaos. Tippst du auf eine Marke, verschwindet sie.' },
      { kurz: 'Kosmos', titel: 'Hinaus', wer: 'Deleuze, Guattari, Klee', geste: 'Im Kreis auflegen und nach aussen ziehen.', text: 'Schliesslich öffnet man den Kreis einen Spalt, lässt jemanden herein, ruft jemanden, oder man bricht selbst auf, wagt eine Improvisation. Das Ritornell verbindet sich mit den Kräften des Kosmos. Für Deleuze und Guattari ist das die Aufgabe der Kunst, mit Klee: nicht das Sichtbare wiedergeben, sondern Kräfte sichtbar machen. Hier legst du einen Kreis um das Bild. Draussen kreisen die Kräfte: Das Bild zieht als Langzeitbelichtung um den Kreis, wie die Sterne um den Pol. Ziehst du nach aussen, öffnet sich der Kreis. Durch die Öffnung strömt das Bild auf Linien hinaus, die sich zu einer Spirale winden, jede Windung ein früherer Moment. Darunter singt eine Stimme den Refrain in der Obertonreihe eines tiefen G, wie ein Obertonsänger, dazu Glasschalen und ferne Funken. Hältst du den Daumen in der Mitte kurz still, greifst du den Kreis und kannst ihn verschieben, auch mit zwei Fingern. Lässt du los, schliesst sich der Kreis langsam wieder.' }
    ],
    wenden: 'Kamera wenden', tonAn: 'Ton an', tonAus: 'Ton aus', loesen: 'Alles lösen',
    begriff: 'Begriff', standbild: 'Standbild', aufnahme: 'Aufnahme', stopp: 'Stopp',
    teilen: 'Teilen', sichern: 'Sichern', komma: '.', 'ergebnis-hinweis': 'Gesichert im Ordner «Downloads». «Teilen» legt es direkt in die Galerie oder eine App.',
    keineAufnahme: 'Dieser Browser kann die Leinwand nicht aufnehmen. Das Standbild geht.',
    daumen: ['Daumen auflegen und halten', 'Im Takt tippen', 'Auflegen und nach aussen ziehen'],
    familie: 'Klang · Mille plateaux, Plateau 11', 'b-titel': 'Ritornell',
    'b-text': [
      'In «Tausend Plateaus» (1980) widmen Deleuze und Guattari dem Ritornell ein ganzes Plateau, datiert auf 1837. Ein Ritornell ist ein kleiner wiederkehrender Refrain, und für sie ist es die Weise, wie Lebewesen und Menschen sich aus dem Chaos einen Ort schaffen: mit Lauten, Farben, Linien, Gesten, die sich wiederholen.',
      'Sie beschreiben drei Aspekte, keine drei Stufen. Im Dunkeln singt ein Kind und findet einen festen Punkt. Um den Punkt zieht man einen Kreis, das Zuhause, ein Revier aus Marken. Und man öffnet den Kreis wieder, lässt jemanden herein oder bricht auf, ins Weite, zu den Kräften des Kosmos. Das Revier ist dabei nie fertig: Es entsteht aus Wiederholung, und jede Wiederholung ist eine andere.',
      'Hier summt die Stimme das Bild in eine Ordnung, deine Marken bauen im Takt ein Revier, und ein geöffneter Kreis lässt das Bild als Spirale aus Zeit hinaus. Die Seite merkt sich dafür die letzten Sekunden des Bildes.'
    ],
    'b-frage': 'Welches Lied singst du, wenn es dunkel wird? Und wen lässt du in deinen Kreis?',
    'b-quelle': 'Gilles Deleuze, Félix Guattari, Mille plateaux. Capitalisme et schizophrénie 2, Paris: Minuit 1980, Plateau 11 «1837 – De la ritournelle». Deutsch: Tausend Plateaus, Merve 1992. Paul Klee, Schöpferische Konfession, Berlin 1920. E. F. F. Chladni, Entdeckungen über die Theorie des Klanges, Leipzig 1787. Die Stellen aus Mille plateaux sind hier sinngemäss wiedergegeben.',
    keineKamera: 'Die Kamera lässt sich nicht öffnen. Wähle ein Video, Fotos oder das Beispiel.',
    keinGL: 'Dieses Gerät kann WebGL 2 nicht anzeigen. Das Ritornell braucht es.',
    kontextWeg: 'Die Grafik ist ausgestiegen. Bitte die Seite neu laden.'
  },
  en: {
    titel: 'Refrain', satz: 'A child in the dark hums to find courage. The song becomes a circle, the circle a home, and one day it opens.',
    kamera: 'Camera', video: 'Video or photos', beispiel: 'Example', lesart: 'Reading',
    glossen: {
      chantonner: { begriff: 'la ritournelle', satz: 'A child in the dark is afraid and calms itself by singing under its breath. The song is a first stable point in chaos.', zitat: '', quelle: q('en')() },
      chaos: { begriff: 'le chaos', satz: 'Chaos is not the opposite of rhythm. It is the milieu of all milieus, from which every rhythm comes and into which it falls back.', zitat: '', quelle: q('en')() },
      sable: { begriff: 'Chladni figures', satz: 'In 1787 Chladni strewed sand on a bowed plate: the sand gathers where the plate is still. Here the voice draws the lines, each note a different figure.', zitat: '', quelle: 'E. F. F. Chladni, Entdeckungen über die Theorie des Klanges, Leipzig 1787' },
      voix: { begriff: 'le centre', satz: 'How far the voice carries: the stable point is fragile, a small space of order around the child.', zitat: '', quelle: q('en')() },
      milieu: { begriff: 'les milieux', satz: 'The milieu is not calm. It is vibration, alternation, each place another beat. Here, how violently it scatters the image.', zitat: '', quelle: q('en')() },
      chezsoi: { begriff: 'le chez-soi', satz: 'Home does not exist beforehand. One has to draw a circle around the uncertain centre and organise a limited space.', zitat: '', quelle: q('en')() },
      expression: { begriff: 'les matières d’expression', satz: 'A territory arises when colours, sounds and lines no longer just serve but become marks. Every morning the bird Scenopoeetes turns leaves over so that their pale undersides shine.', zitat: '', quelle: q('en')() },
      rythme: { begriff: 'le rythme', satz: 'Rhythm is not metre. It lies between milieus, in the passage where they touch. Here, how fast the refrain goes.', zitat: '', quelle: q('en')() },
      territoire: { begriff: 'le territoire', satz: 'The territory is an act: it grows with every repetition of the marks. Here, how far each mark draws its territory.', zitat: '', quelle: q('en')() },
      echo: { begriff: 'la reprise', satz: 'Refrain means return. On every beat each mark sends out a ring, and the ring carries the image of a moment ago, never quite the same.', zitat: '', quelle: q('en')() },
      cosmos: { begriff: 'le cosmos', satz: 'One opens the circle a crack, lets someone in or ventures out oneself. One leaves the territory on a line that leads into the open.', zitat: '', quelle: q('en')() },
      klee: { begriff: 'rendre visible', satz: 'Not to render the visible, but to make visible forces that are not visible: the forces of the cosmos.', zitat: '“Art does not reproduce the visible, but makes visible.”', quelle: 'Paul Klee, Creative Confession, 1920' },
      trois: { begriff: 'trois aspects', satz: 'Chaos, territory and cosmos are not three successive stages but three aspects of one and the same thing: the refrain.', zitat: '', quelle: q('en')() },
      fuite: { begriff: 'les lignes de fuite', satz: 'How many lines lead out of the opening. Each carries the image into a different time.', zitat: '', quelle: q('en')() },
      spirale: { begriff: 'la spirale', satz: 'How far the lines wind before they lose themselves in the cosmos.', zitat: '', quelle: q('en')() },
      forces: { begriff: 'les forces cosmiques', satz: 'The forces of the cosmos cannot be seen, only what they do to the material. Here, how much light stands in the dark.', zitat: '', quelle: q('en')() }
    },
    regler: [['Voice', 'Milieu', 'Sand'], ['Tempo', 'Territory', 'Echo'], ['Lines', 'Spiral', 'Stars']],
    reglerGlosse: [['voix', 'milieu', 'sable'], ['rythme', 'territoire', 'echo'], ['fuite', 'spirale', 'forces']],
    lesarten: [
      { kurz: 'Humming', titel: 'In the dark', wer: 'Deleuze, Guattari, Chladni', geste: 'Rest your thumb and hold.', text: 'The plateau on the refrain begins with a child who is afraid in the dark and calms itself by singing under its breath. The song is a first stable point in chaos, fragile, but it holds. Chaos does not simply mean disorder: it is the milieu of all milieus, vibration, alternation, from which every rhythm comes. Here, when you touch, night falls over the image and the moments of the last seconds are thrown together. Hold your thumb and a voice hums the old children’s tune, and around your thumb the image crumbles into sand on a sounding plate, as with Chladni: where the plate vibrates the grains leap, where it is still they gather into lines. Each note another figure, and each grain carries the colour of the place it came from. Drag your thumb and it ploughs through the sand; let go and every grain flies home, and the image puts itself back together.' },
      { kurz: 'Territory', titel: 'Home', wer: 'Deleuze, Guattari, Messiaen', geste: 'Tap the image in time.', text: 'Home does not exist beforehand. One draws a circle around the uncertain point and organises a limited space. A territory arises when things of the milieu become marks: a colour, a sound, a posture, the pale leaf of the bird Scenopoeetes, the song Messiaen wrote down. And it arises through repetition. Here every tap sets a mark into the beat. The refrain plays them again and again, each mark sounds and sends out a ring carrying an echo of the image a moment ago. With every repetition the territory grows: clear and warm inside, chaos outside. Tap a mark and it disappears.' },
      { kurz: 'Cosmos', titel: 'Out', wer: 'Deleuze, Guattari, Klee', geste: 'Rest inside the circle and pull outwards.', text: 'Finally one opens the circle a crack, lets someone in, calls someone, or ventures out oneself, risks an improvisation. The refrain joins the forces of the cosmos. For Deleuze and Guattari this is the task of art, with Klee: not to render the visible, but to make forces visible. Here you lay a circle around the image. Outside, the forces turn: the image circles it like a long exposure, as the stars circle the pole. Pull outwards and the circle opens. Through the opening the image streams out on lines that wind into a spiral, each turn an earlier moment. Beneath it a voice sings the refrain in the overtone series of a deep G, like an overtone singer, with glass bowls and distant sparks. Hold your thumb still in the middle for a moment and you grab the circle and can move it, also with two fingers. Let go and the circle slowly closes again.' }
    ],
    wenden: 'Flip camera', tonAn: 'Sound on', tonAus: 'Sound off', loesen: 'Release all',
    begriff: 'Concept', standbild: 'Still', aufnahme: 'Record', stopp: 'Stop',
    teilen: 'Share', sichern: 'Save', komma: '.', 'ergebnis-hinweis': 'Saved to your “Downloads” folder. “Share” sends it straight to your gallery or an app.',
    keineAufnahme: 'This browser cannot record the canvas. Stills work.',
    daumen: ['Rest your thumb and hold', 'Tap in time', 'Rest and pull outwards'],
    familie: 'Sound · A Thousand Plateaus, plateau 11', 'b-titel': 'Refrain',
    'b-text': [
      'In “A Thousand Plateaus” (1980) Deleuze and Guattari devote a whole plateau to the refrain, dated 1837. A refrain, ritournelle, is a small recurring tune, and for them it is the way living beings and people make themselves a place out of chaos: with sounds, colours, lines and gestures that repeat.',
      'They describe three aspects, not three stages. In the dark a child sings and finds a stable point. Around the point one draws a circle, home, a territory of marks. And one opens the circle again, lets someone in or sets out, into the open, towards the forces of the cosmos. The territory is never finished: it arises from repetition, and every repetition is different.',
      'Here the voice hums the image into an order, your marks build a territory in time, and an opened circle lets the image out as a spiral of time. For this the page remembers the last seconds of the image.'
    ],
    'b-frage': 'Which song do you sing when it gets dark? And whom do you let into your circle?',
    'b-quelle': 'Gilles Deleuze, Félix Guattari, Mille plateaux. Capitalisme et schizophrénie 2, Paris: Minuit 1980, plateau 11 “1837 – De la ritournelle”. English: A Thousand Plateaus, tr. Brian Massumi, University of Minnesota Press 1987, “1837: Of the Refrain”. Paul Klee, Schöpferische Konfession, Berlin 1920. E. F. F. Chladni, Entdeckungen über die Theorie des Klanges, Leipzig 1787. Passages from A Thousand Plateaus are paraphrased here.',
    keineKamera: 'The camera cannot be opened. Choose a video, photos or the example.',
    keinGL: 'This device cannot show WebGL 2, which this page needs.',
    kontextWeg: 'The graphics stopped. Please reload the page.'
  },
  fr: {
    titel: 'La ritournelle', satz: 'Un enfant dans le noir chantonne pour se rassurer. Le chant devient un cercle, le cercle un chez-soi, et un jour il s’ouvre.',
    kamera: 'Caméra', video: 'Vidéo ou photos', beispiel: 'Exemple', lesart: 'Lecture',
    glossen: {
      chantonner: { begriff: 'la ritournelle', satz: 'Un enfant dans le noir a peur et se rassure en chantonnant. Le chant est un premier point stable dans le chaos.', zitat: '', quelle: q('fr')() },
      chaos: { begriff: 'le chaos', satz: 'Le chaos n’est pas le contraire du rythme. C’est le milieu de tous les milieux, d’où vient chaque rythme et où il retombe.', zitat: '', quelle: q('fr')() },
      sable: { begriff: 'les figures de Chladni', satz: 'En 1787, Chladni répand du sable sur une plaque frottée à l’archet : le sable se rassemble là où elle est immobile. Ici la voix trace les lignes, chaque note une autre figure.', zitat: '', quelle: 'E. F. F. Chladni, Entdeckungen über die Theorie des Klanges, Leipzig 1787' },
      voix: { begriff: 'le centre', satz: 'Jusqu’où porte la voix : le point stable est fragile, un petit espace d’ordre autour de l’enfant.', zitat: '', quelle: q('fr')() },
      milieu: { begriff: 'les milieux', satz: 'Le milieu n’est pas calme. Il est vibration, alternance, chaque lieu une autre mesure. Ici, avec quelle force il disperse l’image.', zitat: '', quelle: q('fr')() },
      chezsoi: { begriff: 'le chez-soi', satz: 'Le chez-soi ne préexiste pas. Il faut tracer un cercle autour du centre incertain et organiser un espace limité.', zitat: '', quelle: q('fr')() },
      expression: { begriff: 'les matières d’expression', satz: 'Un territoire naît quand couleurs, sons et lignes ne servent plus seulement, mais deviennent des marques. Chaque matin, l’oiseau Scenopoeetes retourne des feuilles pour que leur face pâle se détache.', zitat: '', quelle: q('fr')() },
      rythme: { begriff: 'le rythme', satz: 'Le rythme n’est pas la mesure. Il est entre les milieux, dans le passage où ils se touchent. Ici, à quelle vitesse va la ritournelle.', zitat: '', quelle: q('fr')() },
      territoire: { begriff: 'le territoire', satz: 'Le territoire est un acte : il grandit à chaque reprise des marques. Ici, jusqu’où chaque marque étend son territoire.', zitat: '', quelle: q('fr')() },
      echo: { begriff: 'la reprise', satz: 'Ritournelle veut dire retour. À chaque temps, chaque marque émet un anneau, et l’anneau porte l’image d’il y a un instant, jamais tout à fait la même.', zitat: '', quelle: q('fr')() },
      cosmos: { begriff: 'le cosmos', satz: 'On entrouvre le cercle, on laisse entrer quelqu’un, ou l’on s’élance soi-même. On quitte le territoire sur une ligne qui mène au large.', zitat: '', quelle: q('fr')() },
      klee: { begriff: 'rendre visible', satz: 'Non pas rendre le visible, mais rendre visibles des forces qui ne le sont pas : les forces du cosmos.', zitat: '« L’art ne reproduit pas le visible ; il rend visible. »', quelle: 'Paul Klee, Confession créatrice, 1920' },
      trois: { begriff: 'trois aspects', satz: 'Chaos, territoire et cosmos ne sont pas trois moments successifs, mais trois aspects d’une seule et même chose : la ritournelle.', zitat: '', quelle: q('fr')() },
      fuite: { begriff: 'les lignes de fuite', satz: 'Combien de lignes sortent de l’ouverture. Chacune emporte l’image dans un autre temps.', zitat: '', quelle: q('fr')() },
      spirale: { begriff: 'la spirale', satz: 'Jusqu’où les lignes s’enroulent avant de se perdre dans le cosmos.', zitat: '', quelle: q('fr')() },
      forces: { begriff: 'les forces cosmiques', satz: 'Les forces du cosmos ne se voient pas, on voit seulement ce qu’elles font au matériau. Ici, combien de lumière tient dans le noir.', zitat: '', quelle: q('fr')() }
    },
    regler: [['Voix', 'Milieu', 'Sable'], ['Tempo', 'Territoire', 'Écho'], ['Lignes', 'Spirale', 'Étoiles']],
    reglerGlosse: [['voix', 'milieu', 'sable'], ['rythme', 'territoire', 'echo'], ['fuite', 'spirale', 'forces']],
    lesarten: [
      { kurz: 'Chantonner', titel: 'Dans le noir', wer: 'Deleuze, Guattari, Chladni', geste: 'Pose le pouce et tiens.', text: 'Le plateau de la ritournelle commence par un enfant qui a peur dans le noir et se rassure en chantonnant. Le chant est un premier point stable dans le chaos, fragile, mais il tient. Le chaos n’est pas simplement le désordre : c’est le milieu de tous les milieux, vibration, alternance, d’où vient tout rythme. Ici, quand tu touches, la nuit tombe sur l’image et les instants des dernières secondes se mêlent. Tiens le pouce : une voix chantonne la vieille comptine, et autour du pouce l’image s’effrite en sable sur une plaque sonore, comme chez Chladni : là où la plaque vibre, les grains sautent, là où elle est immobile, ils se rassemblent en lignes. Chaque note une autre figure, et chaque grain garde la couleur de l’endroit d’où il vient. Fais glisser le pouce : il laboure le sable ; lâche, et chaque grain retourne à sa place, l’image se recompose.' },
      { kurz: 'Territoire', titel: 'Le chez-soi', wer: 'Deleuze, Guattari, Messiaen', geste: 'Tape l’image en mesure.', text: 'Le chez-soi ne préexiste pas. On trace un cercle autour du point incertain et on organise un espace limité. Un territoire naît quand des choses du milieu deviennent des marques : une couleur, un son, une posture, la feuille pâle de l’oiseau Scenopoeetes, le chant que Messiaen a noté. Et il naît de la répétition. Ici chaque tape pose une marque dans la mesure. La ritournelle les rejoue sans cesse, chaque marque sonne et émet un anneau qui porte un écho de l’image d’il y a un instant. À chaque reprise le territoire grandit : clair et chaud dedans, le chaos dehors. Tape une marque, elle disparaît.' },
      { kurz: 'Cosmos', titel: 'Au large', wer: 'Deleuze, Guattari, Klee', geste: 'Pose le pouce dans le cercle et tire vers l’extérieur.', text: 'Enfin on entrouvre le cercle, on laisse entrer quelqu’un, on appelle quelqu’un, ou l’on s’élance soi-même, on hasarde une improvisation. La ritournelle rejoint les forces du cosmos. Pour Deleuze et Guattari, c’est la tâche de l’art, avec Klee : non pas rendre le visible, mais rendre visibles des forces. Ici tu poses un cercle autour de l’image. Dehors tournent les forces : l’image tourne autour du cercle comme en pose longue, comme les étoiles autour du pôle. Tire vers l’extérieur, et le cercle s’ouvre. Par l’ouverture, l’image s’écoule sur des lignes qui s’enroulent en spirale, chaque tour un instant plus ancien. Dessous, une voix chante la ritournelle dans la série des harmoniques d’un sol grave, comme un chanteur diphonique, avec des bols de verre et des étincelles lointaines. Garde le pouce immobile au centre un instant : tu saisis le cercle et peux le déplacer, aussi à deux doigts. Lâche, et le cercle se referme lentement.' }
    ],
    wenden: 'Retourner', tonAn: 'Son activé', tonAus: 'Son coupé', loesen: 'Tout défaire',
    begriff: 'Concept', standbild: 'Image', aufnahme: 'Enregistrer', stopp: 'Arrêter',
    teilen: 'Partager', sichern: 'Télécharger', komma: ',', 'ergebnis-hinweis': 'Enregistré dans le dossier « Téléchargements ». « Partager » l’envoie directement dans la galerie ou une app.',
    keineAufnahme: 'Ce navigateur ne peut pas enregistrer le canevas. L’image fixe fonctionne.',
    daumen: ['Pose le pouce et tiens', 'Tape en mesure', 'Pose et tire vers l’extérieur'],
    familie: 'Son · Mille plateaux, plateau 11', 'b-titel': 'La ritournelle',
    'b-text': [
      'Dans « Mille plateaux » (1980), Deleuze et Guattari consacrent à la ritournelle un plateau entier, daté de 1837. Une ritournelle est un petit refrain qui revient, et pour eux c’est la manière dont les vivants et les hommes se font un lieu à partir du chaos : avec des sons, des couleurs, des lignes, des gestes qui se répètent.',
      'Ils décrivent trois aspects, non trois étapes. Dans le noir un enfant chante et trouve un point stable. Autour du point on trace un cercle, le chez-soi, un territoire de marques. Et l’on rouvre le cercle, on laisse entrer quelqu’un ou l’on part, au large, vers les forces du cosmos. Le territoire n’est jamais achevé : il naît de la répétition, et chaque reprise est autre.',
      'Ici la voix chantonne l’image dans un ordre, tes marques bâtissent un territoire en mesure, et un cercle ouvert laisse sortir l’image en spirale de temps. Pour cela, la page garde en mémoire les dernières secondes de l’image.'
    ],
    'b-frage': 'Quelle chanson chantes-tu quand il fait noir ? Et qui laisses-tu entrer dans ton cercle ?',
    'b-quelle': 'Gilles Deleuze, Félix Guattari, Mille plateaux. Capitalisme et schizophrénie 2, Paris : Minuit 1980, plateau 11 « 1837 – De la ritournelle ». Paul Klee, Schöpferische Konfession, Berlin 1920. E. F. F. Chladni, Entdeckungen über die Theorie des Klanges, Leipzig 1787. Les passages de Mille plateaux sont ici rendus en substance.',
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
  $('daumen-text').textContent = t.daumen[lesart];
  if (randJetzt && randJetzt.art === 'titel') { const z = t.lesarten[lesart]; $('geste').textContent = z.titel + ' · ' + z.wer; }
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
const SPUR = 'ritornell.spur';
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
  if (s.length && !['✓ läuft', 'Start', 'Ende', 'Pause'].includes(s.at(-1))) console.warn('Ritornell: der letzte Versuch brach ab nach', s.slice(-4).join(' → '));
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
const SCHARF_SEITE = leicht ? 960 : telefon ? 1280 : 1920;  // die Gegenwart: so scharf, wie der Bildschirm sie zeigt
const HIST_SEITE = leicht ? 400 : telefon ? 640 : 900;      // das Gedächtnis: die letzten Sekunden, kleiner gerechnet
const HIST_N = leicht ? 10 : telefon ? 18 : 24;             // so viele Momente (Telefon: 18 × 360 × 640 × 4 Byte ≈ 16 MB)
const HIST_DT = 0.11;                                       // alle 0,11 Sekunden ein Moment
const CHAOS_SEITE = leicht ? 360 : telefon ? 540 : 720;     // das Milieu, weich gerechnet
const MAX_DPR = leicht ? 0.6 : 2;
if (leicht) spur('Leichte Fassung (ohne Grafikkarte)');
if (!gl) { melden(TEXTE[sprache].keinGL); spur('kein WebGL2'); }
leinwand.addEventListener('webglcontextlost', (e) => { e.preventDefault(); melden(TEXTE[sprache].kontextWeg); spur('Kontext verloren'); });

const VS = `#version 300 es
in vec2 a; out vec2 v;
void main(){ v = a*0.5+0.5; gl_Position = vec4(a,0.,1.); }`;
const KOPF = `#version 300 es
precision highp float; precision highp sampler2D; precision highp sampler2DArray; in vec2 v; out vec4 o;
#define PI 3.14159265
float lu(vec3 c){ return dot(c, vec3(0.2126, 0.7152, 0.0722)); }
float h21(vec2 p){ p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }
float rauschen(vec2 p){ vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
  return mix(mix(h21(i), h21(i + vec2(1, 0)), f.x), mix(h21(i + vec2(0, 1)), h21(i + 1.0), f.x), f.y); }
// jede Stufe gedreht, damit keine Achsen im Rauschen stehen bleiben
float fbm(vec2 p){ float s = 0.0, a = 0.5; mat2 m = mat2(0.8, 0.6, -0.6, 0.8); for (int k = 0; k < 4; k++) { s += a * rauschen(p); p = m * p * 2.03 + 17.1; a *= 0.5; } return s / 0.9375; }
uniform sampler2DArray uHist; uniform float uKopf, uN;
// das Gedächtnis: alter in Momenten (0 = eben), zwischen zwei Momenten weich überblendet, nie eine Stufe
vec3 hist(vec2 uv, float alter){
  alter = clamp(alter, 0.0, uN - 1.001); float a0 = floor(alter), f = alter - a0;
  float l0 = mod(uKopf - a0 + uN, uN), l1 = mod(uKopf - a0 - 1.0 + uN, uN);
  return mix(texture(uHist, vec3(uv, l0)).rgb, texture(uHist, vec3(uv, l1)).rgb, f);
}
`;
const CHLADNI = `
// Chladni: die klassische Figur einer gestrichenen Platte, cos(nπx)cos(mπy) − cos(mπx)cos(nπy), gedreht um den Daumen.
// Wert und Steigung (in q), damit die Knotenlinie genau einen Bildpunkt breit wird.
// uSk: Grösse der Platte in q, uVer: Lage (0.5: die ganze Platte liegt unter dem Daumen, wie bei Chladni eine Figur je Ton)
uniform float uSk, uVer;
vec3 chladni(vec2 p, float n, float m, float rot){
  float cs = cos(rot), sn = sin(rot);
  vec2 u = vec2(cs * p.x + sn * p.y, -sn * p.x + cs * p.y) / uSk + uVer;
  // n negativ: die symmetrische Figur (ohne Diagonalen), sonst die gegenläufige
  float sg = n < 0.0 ? 1.0 : -1.0; n = abs(n);
  float a = n * PI, b = m * PI;
  float P = cos(a * u.x) * cos(b * u.y) + sg * cos(b * u.x) * cos(a * u.y);
  float du = (-a * sin(a * u.x) * cos(b * u.y) - sg * b * sin(b * u.x) * cos(a * u.y)) / uSk;
  float dw = (-b * cos(a * u.x) * sin(b * u.y) - sg * a * cos(b * u.x) * sin(a * u.y)) / uSk;
  return vec3(P, cs * du - sn * dw, sn * du + cs * dw);
}
`;
const FS_KOPIE = KOPF + `uniform sampler2D uQ; void main(){ o = vec4(texture(uQ, v).rgb, 1.0); }`;

// ---------- das Milieu: die Nacht, in der die Momente durcheinandergeraten ----------
// Ein Strom aus verschachteltem Rauschen verschiebt das Bild, und jede Gegend zeigt einen anderen Moment der letzten Sekunden.
const FS_CHAOS = KOPF + `uniform float uSeite, uT, uWucht;
void main(){
  vec2 q = vec2(v.x * uSeite, v.y);
  float t = uT;
  vec2 w = vec2(fbm(q * 1.4 + vec2(0.0, t * 0.05)), fbm(q * 1.4 + vec2(5.2, 1.3 - t * 0.04))) - 0.5;
  vec2 w2 = vec2(fbm(q * 3.0 + w * 2.6 + vec2(t * 0.03, 0.0)), fbm(q * 3.0 - w * 2.6 + vec2(9.1, t * 0.025))) - 0.5;
  vec2 d = (w * 1.0 + w2 * 0.6) * 0.2 * uWucht;
  vec2 uv = clamp(v + vec2(d.x / uSeite, d.y), 0.002, 0.998);
  float a = smoothstep(0.2, 0.8, fbm(q * 1.1 + w * 1.8 + vec2(t * 0.02, -t * 0.013))) * (uN - 1.0) * (0.3 + 0.7 * uWucht);
  vec3 c = hist(uv, a);
  // die Strömung zerlegt das Licht ein wenig: Rot und Blau treiben an ihren Rändern auseinander
  vec2 sp = vec2(d.x / uSeite, d.y) * 0.06;
  c.r = mix(c.r, hist(clamp(uv + sp, 0.002, 0.998), a).r, 0.8);
  c.b = mix(c.b, hist(clamp(uv - sp, 0.002, 0.998), a).b, 0.8);
  float l = lu(c);
  // Nacht: entfärbt, kalt, dunkel; hellere Schlieren wie Mondlicht auf bewegtem Wasser
  float schliere = smoothstep(0.5, 0.9, fbm(q * vec2(1.6, 6.0) + w2 * 3.5 + vec2(0.0, t * 0.05)));
  c = mix(vec3(l), c, 0.32) * vec3(0.76, 0.86, 1.1);
  c *= 0.2 + 0.55 * schliere * smoothstep(0.05, 0.7, l);
  o = vec4(c, 1.0);
}`;

// ---------- die Szene: alle drei Lesarten in einem Durchgang ----------
// q in Bildhöhen (x mal Seitenverhältnis), y nach oben. Abstände für Linien werden in Bildpunkten gerechnet: haarfein, nie treppig.
const FS_SZENE = KOPF + CHLADNI + `uniform sampler2D uScharf, uChaos; uniform float uSeite, uT, uHpx, uDpr, uNacht, uArt, uKoerner;
uniform vec4 uZ, uMode, uModeB, uPuls;
uniform vec4 uMark[8]; uniform int uMarkN; uniform vec4 uRing[12]; uniform int uRingN; uniform vec4 uRev;
uniform vec4 uKos, uKosB; uniform vec2 uKosC; uniform float uGreif;
vec2 nachUV(vec2 qq){ return vec2(qq.x / uSeite, qq.y); }
void main(){
  vec2 q = vec2(v.x * uSeite, v.y);
  vec3 bild = texture(uScharf, v).rgb;
  vec3 nacht = texture(uChaos, v).rgb;
  vec3 c = mix(bild, nacht, uNacht);
  float px = 1.0 / uHpx;   // ein Bildpunkt in q

  if (uArt < 0.5) {
    // ===== Summen: um den Daumen ordnet die Stimme das Bild =====
    vec2 p = q - uZ.xy; float r = length(p);
    vec2 dir = p / max(r, 1e-4);
    float R = uZ.z * (1.0 + 0.1 * (fbm(dir * 1.6 + vec2(uT * 0.15, 0.0)) - 0.5));
    float zone = (1.0 - smoothstep(R * 0.62, R, r)) * uZ.w;
    if (zone > 0.001) {
      vec3 a = chladni(p, uMode.x, uMode.y, uModeB.y), b = chladni(p, uMode.z, uMode.w, uModeB.z);
      vec3 P = mix(a, b, uModeB.x);
      float gP = max(length(P.yz), 1e-3);
      float dn = abs(P.x) / gP * uHpx;                    // Abstand zur Knotenlinie in Bildpunkten
      // die Bäuche schwingen: dort verwischt das Bild quer zur Linie, an den Knoten bleibt es scharf
      vec2 quer = P.yz / gP;
      float amp = abs(P.x) * uModeB.w * zone * 9.0 * uDpr * px;
      vec3 s = bild * 0.36;
      s += (texture(uScharf, v + nachUV(quer * amp * 0.5)).rgb + texture(uScharf, v - nachUV(quer * amp * 0.5)).rgb) * 0.22;
      s += (texture(uScharf, v + nachUV(quer * amp)).rgb + texture(uScharf, v - nachUV(quer * amp)).rgb) * 0.1;
      vec3 geordnet = s * vec3(1.05, 1.0, 0.93);
      geordnet = mix(geordnet, geordnet * geordnet * (3.0 - 2.0 * geordnet), 0.25);
      if (uKoerner > 0.5) {
        // die Platte: dunkles Messing, in dem sich das Bild nur noch spiegelt; die Bäuche schimmern, wo sie schwingen.
        // Den Sand streuen die Körner darüber (eigener Durchgang), aus dem Bild selbst.
        float glanz = 0.5 + 0.5 * dot(normalize(vec3(-P.yz / gP, 1.6)), normalize(vec3(-0.5, 0.7, 0.6)));
        vec3 platte = mix(vec3(0.016, 0.014, 0.012), vec3(0.07, 0.058, 0.044), glanz * smoothstep(0.0, 1.2, abs(P.x)) * uModeB.w);
        platte += s * 0.085 * vec3(0.9, 0.95, 1.05);
        float pr = abs(r - uPuls.x) * uHpx / uDpr;
        platte += vec3(1.0, 0.92, 0.78) * (1.0 - smoothstep(0.3, 1.4, pr)) * uPuls.y * 0.22;
        // heimgekehrt: unter dem Sand kommt das Bild selbst wieder hervor, der Sand geht in ihm auf
        platte = mix(platte, bild, uPuls.w);
        c = mix(c, platte, zone);
        // der Rand der Platte: ein Hauch Licht, keine Linie
        c += vec3(1.0, 0.94, 0.8) * 0.045 * uZ.w * exp(-pow((r - R * 0.8) * uHpx / (16.0 * uDpr), 2.0));
      } else {
      // Sand: eine Linie auf dem Knoten. Ihre Stärke folgt der Platte wie echter Sand: wo die Platte flach schwingt,
      // liegt mehr Sand (breiter), wo sie steil ist, nur ein Haar. Daneben eine schmale Kerbe: der Sand wirft ein Relief.
      float lw = clamp(0.05 * uHpx / gP, 0.55 * uDpr, 1.25 * uDpr);
      float linie = 1.0 - smoothstep(lw * 0.5 - 0.5, lw * 0.5 + 0.6, dn);
      float kerbe = smoothstep(lw * 0.5 + 0.2, lw * 0.5 + 1.2, dn) * (1.0 - smoothstep(lw * 0.5 + 1.4, lw * 0.5 + 3.6 * uDpr, dn));
      vec2 zelle = floor(gl_FragCoord.xy / (2.6 * uDpr));
      vec2 j = vec2(h21(zelle), h21(zelle + 7.31));
      vec2 mitte = (zelle + 0.15 + 0.7 * j) * 2.6 * uDpr;
      float dd = length(gl_FragCoord.xy - mitte) / uDpr;
      float nahe = exp(-dn * dn / (2.0 * pow(5.0 * uDpr, 2.0)));
      float korn = (1.0 - smoothstep(0.35, 0.9, dd)) * step(h21(zelle + 3.1), nahe * 0.5) * (0.55 + 0.45 * h21(zelle + floor(uT * 7.0)));
      vec3 sand = vec3(1.0, 0.94, 0.78);
      vec3 quarz = mix(sand, vec3(0.86, 0.92, 1.0), h21(zelle + 9.7));        // jedes Korn ein wenig anders, wie Quarzsand
      float funke = step(0.985, h21(zelle + floor(uT * 3.0 + j.x * 3.0)));       // ab und zu fängt ein Korn das Licht
      float menge = uPuls.z * zone;
      geordnet *= 1.0 - 0.28 * kerbe * menge;
      geordnet = mix(geordnet, sand, clamp(linie * 0.85, 0.0, 1.0) * menge);
      geordnet = mix(geordnet, quarz * (1.0 + 1.6 * funke), clamp(korn * 0.8, 0.0, 1.0) * menge);
      geordnet += sand * nahe * 0.06 * menge;
      // ein feiner Ring bei jeder Note, der hinausläuft
      float pr = abs(r - uPuls.x) * uHpx / uDpr;
      geordnet = mix(geordnet, sand, (1.0 - smoothstep(0.3, 1.2, pr)) * uPuls.y * 0.6);
      c = mix(c, geordnet, zone);
      // der Rand der Ordnung: ein Hauch Licht, keine Linie
      c += sand * 0.05 * uZ.w * exp(-pow((r - R * 0.8) * uHpx / (14.0 * uDpr), 2.0));
      }
    }
  } else if (uArt < 1.5) {
    // ===== Revier: Marken, die im Takt klingen; aus ihrer Wiederholung wächst das Revier =====
    float F = 0.0; vec2 gF = vec2(0.0);
    for (int i = 0; i < 8; i++) { if (i >= uMarkN) break;
      vec2 d = q - uMark[i].xy; float rr = uMark[i].z; float e = exp(-dot(d, d) / (rr * rr));
      F += e; gF += -2.0 * d / (rr * rr) * e; }
    vec3 innenFarbe = bild * vec3(1.05, 1.0, 0.94);
    innenFarbe = mix(innenFarbe, innenFarbe * innenFarbe * (3.0 - 2.0 * innenFarbe), 0.18);
    if (uMarkN > 0) {
      float dF = (F - 0.5) / max(length(gF), 1e-3) * uHpx / uDpr;     // + innen, in Bildschirmpunkten
      float innen = smoothstep(-0.7, 0.7, dF);
      c = mix(c, innenFarbe, innen * uRev.y);
      // die Grenze: eine haarfeine Linie, innen eine zweite, schwächere; beim Schlag leuchtet sie auf
      float linie = 1.0 - smoothstep(0.3, 1.15, abs(dF));
      float linie2 = (1.0 - smoothstep(0.25, 0.95, abs(dF - 4.5))) * 0.32;
      vec3 lf = vec3(1.0, 0.95, 0.86);
      c = mix(c, lf, clamp(linie * (0.55 + 0.45 * uRev.x) + linie2, 0.0, 1.0) * uRev.y);
      c += lf * 0.08 * uRev.x * exp(-dF * dF / 60.0) * uRev.y;
      // das Revier liegt wie ein ausgeschnittenes Blatt über dem Chaos: draussen ein weicher Schatten, innen ein Hauch Licht
      c *= 1.0 - 0.42 * exp(-max(-dF, 0.0) / 11.0) * (1.0 - innen) * uRev.y;
      c += lf * 0.035 * exp(-max(dF, 0.0) / 26.0) * innen * uRev.y;
    }
    // die Ringe des Refrains: eine feine Front, dahinter ein schmales Band mit dem Bild von damals, leicht gebrochen
    vec3 echoSumme = vec3(0.0); float echoGew = 0.0; vec3 front = vec3(0.0); vec2 brechung = vec2(0.0);
    for (int i = 0; i < 12; i++) { if (i >= uRingN) break;
      vec4 R4 = uRing[i]; vec2 d = q - R4.xy; float dl = length(d); float s = R4.z - dl;
      float spx = s * uHpx / uDpr;
      // die Front zerlegt das Licht ein wenig: Rot läuft voraus, Blau hinterher
      front += vec3(1.0 - smoothstep(0.3, 1.1, abs(spx + 0.7)), 1.0 - smoothstep(0.3, 1.1, abs(spx)), 1.0 - smoothstep(0.3, 1.1, abs(spx - 0.7))) * R4.w;
      float band = smoothstep(0.0, 6.0, spx) * (1.0 - smoothstep(18.0, 70.0, spx)) * R4.w;
      if (band > 0.002) {
        vec2 n = d / max(dl, 1e-4);
        brechung += n * band * sin(spx * 0.18) * 5.0 * uDpr * px;
        float alter = R4.z / max(uRev.z, 1e-3) / uRev.w;
        echoSumme += hist(clamp(v - nachUV(n * band * 3.0 * px * uDpr), 0.002, 0.998), alter) * band; echoGew += band;
      }
    }
    if (echoGew > 0.0) {
      vec3 e = echoSumme / echoGew;
      vec3 hier = texture(uScharf, v + nachUV(brechung)).rgb;
      float w = clamp(echoGew, 0.0, 1.0);
      c = mix(c, mix(hier, e * vec3(1.06, 1.0, 0.92), uModeB.w), w * 0.9);
    }
    c = mix(c, vec3(1.0, 0.96, 0.88), clamp(front, 0.0, 1.0) * 0.62);
    // die Marken: ein feiner Kreis, beim Schlag ein roter Punkt mit Hof
    for (int i = 0; i < 8; i++) { if (i >= uMarkN) break;
      float dm = length(q - uMark[i].xy) * uHpx / uDpr; float glut = uMark[i].w;
      float kreis = 1.0 - smoothstep(0.3, 1.1, abs(dm - 7.0));
      float punkt = 1.0 - smoothstep(1.6, 2.6, dm);
      c = mix(c, vec3(0.96, 0.93, 0.88), kreis * 0.9);
      c = mix(c, vec3(0.85, 0.15, 0.11), punkt * (0.35 + 0.65 * glut));
      c += vec3(0.85, 0.2, 0.12) * glut * 0.35 * exp(-dm * dm / 260.0);
      // beim Schlag löst sich ein zweiter, kleiner Kreis und weitet sich
      float rp = 7.0 + (1.0 - glut) * 16.0;
      c = mix(c, vec3(1.0, 0.95, 0.88), (1.0 - smoothstep(0.3, 1.1, abs(dm - rp))) * glut * glut * 0.7);
    }
  } else {
    // ===== Kosmos: der Kreis öffnet sich, und das Bild strömt auf Linien in eine Spirale aus Zeit =====
    vec2 p = q - uKos.xy; float r = max(length(p), 1e-4), th = atan(p.y, p.x);
    float R = uKos.z, offen = uKos.w, phi = uKosB.x;
    float rpx = (r - R) * uHpx / uDpr;                        // + aussen, Bildschirmpunkte
    float innen = 1.0 - smoothstep(-0.8, 0.8, rpx);
    float dth = abs(mod(th - phi + PI, 2.0 * PI) - PI);
    float spalt = offen * 1.1;
    float wand = smoothstep(spalt - 0.05, spalt + 0.02, dth);
    // draussen: der Kosmos als Langzeitbelichtung. Um den Kreis drehen sich die Kräfte, und das Bild zieht als Strichspur
    // um ihn herum wie die Sterne um den Pol; jedes Stück einer Spur ist ein früherer Moment aus dem Gedächtnis.
    // Öffnet sich der Kreis, wölben sich die Bahnen zur Öffnung hin aus: der Kosmos fliesst durch den Spalt hinaus.
    float dsg = mod(th - phi + PI, 2.0 * PI) - PI;
    float beule = pow(0.5 + 0.5 * cos(dsg), 5.0);
    float hub = offen * (0.55 + 0.6 * uKosB.z) * beule;
    float rr = r * exp(-hub);                                    // auf einer Bahn bleibt rr gleich
    float kepler = 1.0 / (0.35 + rr / R);                         // innen kreist es schneller als aussen
    float lauf = uKosC.y * 9.0 * kepler;
    float aussen = smoothstep(-0.5, 1.5, rpx);
    // 1. das ganze Bild, um den Kreis verwischt: ein Nebel aus dem Bild selbst, kalt und tief
    vec3 neb = vec3(0.0);
    float bogen = 0.12 + 0.3 * kepler;
    float jit = h21(gl_FragCoord.xy + fract(uT * 7.0) * 31.0);         // versetzt, damit keine Geisterbilder stehen
    for (int j = 0; j < 8; j++) {
      float w = th - lauf * 0.02 - (float(j) + jit) * bogen / 8.0;
      neb += texture(uScharf, clamp(nachUV(uKos.xy + r * vec2(cos(w), sin(w))), 0.002, 0.998)).rgb;
    }
    neb /= 8.0;
    float nl = lu(neb);
    vec3 raum = vec3(0.008, 0.010, 0.026) + mix(vec3(nl), neb, 0.5) * vec3(0.16, 0.2, 0.36) * (0.35 + 0.65 * smoothstep(0.05, 0.8, nl));
    raum *= 0.8 + 0.4 * smoothstep(0.0, 1.0, fbm(vec2(rr * 4.0, dsg * 0.6) + uKosC.y * 0.1));
    // 2. die Spuren: jede Bahn (gut ein Bildpunkt breit) ein Stern mit eigenem Bogen und eigener Helligkeit
    float bahnF = rr * uHpx / (uDpr * 1.2);
    float id = floor(bahnF), fb = fract(bahnF);
    float hb = h21(vec2(id, 7.13)), hb2 = h21(vec2(id * 0.37, 3.31)), hb3 = h21(vec2(id * 1.91, 11.7));
    float profil = 1.0 - smoothstep(0.18, 0.5, abs(fb - 0.5));       // weich im Querschnitt, nie treppig
    float dicht = 0.12 + 0.3 * uKosB.w;                               // wie viele Bahnen einen Stern tragen
    float hat = step(hb, dicht);
    float lang = (0.35 + 1.6 * hb2 * hb2) * (0.6 + 0.6 * uKosB.z);    // Bogenlänge in Radiant
    float a = mod(th - hb3 * 6.2832 - lauf, 6.2832);                  // vom Kopf der Spur rückwärts
    float auf = 1.0 - smoothstep(lang * 0.92, lang, a);
    float kopf = exp(-a * 6.0 / max(lang, 0.2));
    float zug = auf * (0.25 + 0.75 * (1.0 - a / lang)) * hat * profil;
    vec3 sternF = hist(clamp(v, 0.002, 0.998), clamp(a / max(lang, 0.01), 0.0, 1.0) * (uN - 1.0));
    sternF = mix(vec3(lu(sternF)), sternF, 1.5) * 0.8 + vec3(0.36, 0.38, 0.5);
    float hell = (0.45 + 0.9 * hb * hb / max(dicht, 0.02)) * (0.6 + 0.4 * sin(uT * 0.7 + id));
    // jeder Stern hat seine Temperatur: einige warm wie Arktur, andere kühl wie Wega
    vec3 temp = mix(vec3(1.0, 0.8, 0.6), vec3(0.72, 0.84, 1.0), smoothstep(0.2, 0.8, hb2));
    raum += sternF * temp * zug * hell * 0.75 + temp * kopf * hat * profil * auf * 0.65;
    // ganz feine Bahnen ohne Stern: der Staub der Langzeitbelichtung
    raum += vec3(0.5, 0.56, 0.8) * profil * (h21(vec2(id, 1.7)) * 0.045) * (0.6 + nl);
    raum *= aussen;
    // die Linien der Flucht: jede windet sich anders aus der Öffnung, trägt das Bild weiter weg und weiter zurück in der Zeit
    float L = log(r / R);
    vec3 strom = vec3(0.0); float stromA = 0.0;
    if (L > -0.05 && offen > 0.01) {
      float reich = offen * 3.2;
      for (int k = 0; k < 7; k++) { if (float(k) >= uKosB.y) break;
        float fk = float(k), sk = fk - (uKosB.y - 1.0) * 0.5;
        float wind = mix(0.5, 2.6, uKosB.z) * (1.0 + 0.22 * fk);
        float ziel = phi + uKosC.y * (0.3 + 0.1 * fk) + sk * spalt * 0.5 / max(uKosB.y, 1.0) + L * wind * (mod(fk, 2.0) < 0.5 ? 1.0 : -1.0) * (fk < 0.5 ? 0.6 : 1.0);
        float du = mod(th - ziel + PI, 2.0 * PI) - PI;
        float breite = (0.035 + 0.08 * spalt) * (1.0 + 0.45 * L) / (0.7 + 0.15 * uKosB.y);
        float m = exp(-du * du / (breite * breite)) * (1.0 - smoothstep(reich * 0.55, reich, L)) * smoothstep(-0.05, 0.08, L);
        float kern = exp(-du * du / pow(breite * 0.12 + 0.6 * px / r, 2.0));
        if (m > 0.002) {
          // woher das Licht kommt: aus dem Inneren des Kreises nahe der Öffnung, fliessend
          float fl = fract(L * 0.55 - uT * 0.12 + fk * 0.19);
          vec2 quelle = uKos.xy + R * (0.92 - 0.75 * fl) * vec2(cos(phi + du / breite * spalt * 0.35), sin(phi + du / breite * spalt * 0.35));
          float alter = L * 5.0 + fk * 2.0;
          vec3 bc = hist(clamp(nachUV(quelle), 0.002, 0.998), alter);
          // ein Farbsaum entlang der Linie: das Licht zerlegt sich, je weiter es kommt
          float spek = clamp(L * 0.4, 0.0, 0.5);
          bc = mix(bc, bc * vec3(1.0 + 0.4 * sin(du / breite * 2.0), 1.0, 1.0 + 0.4 * sin(du / breite * 2.0 + 2.5)), spek);
          // feine Fasern in jeder Linie, wie Glasfasern, die das Bild tragen
          float faser = 0.62 + 0.38 * sin(du / breite * 10.0 + L * 4.0 + fk);
          // die Linie ist ein Bündel feiner Spuren, wie draussen: hell im Kern, sonst die Farbe des Bildes von damals
          float fein = 1.0 - smoothstep(0.15, 0.5, abs(fract(du / breite * 3.0 + L * 0.8 + fk * 0.37) - 0.5));
          strom += bc * m * (0.35 + 0.75 * fein) * faser + vec3(1.0, 0.97, 0.9) * kern * m * 0.28; stromA = max(stromA, m);
        }
      }
    }
    // aus der Öffnung fällt Licht in den Raum, wie aus einer Tür in die Nacht
    float tuer = exp(-dth * dth / max(spalt * spalt * 0.8, 1e-3)) * exp(-max(r - R, 0.0) / (0.06 + 0.2 * offen)) * offen * (1.0 - innen);
    vec3 draussen = raum + strom + vec3(1.0, 0.86, 0.66) * tuer * 0.22;
    // drinnen: das Bild wie hinter einer Glaslinse. Zum Rand hin vergrössert es und zerlegt das Licht,
    // zur Öffnung hin zieht es sich hinaus; ein Randlicht macht die Kugel.
    float rn = clamp(r / R, 0.0, 1.0);
    vec2 zurOeffnung = vec2(cos(phi), sin(phi));
    vec2 sog = zurOeffnung * offen * exp(-dth * dth / 0.6) * rn * rn * 0.05;
    vec2 pl = p * (1.0 - 0.13 * pow(rn, 4.0)) - sog;
    vec2 uvL = nachUV(uKos.xy + pl);
    float ab = 0.006 * pow(rn, 3.0);
    vec3 drin = vec3(texture(uScharf, nachUV(uKos.xy + pl * (1.0 + ab))).r, texture(uScharf, uvL).g, texture(uScharf, nachUV(uKos.xy + pl * (1.0 - ab))).b);
    drin *= vec3(1.04, 1.0, 0.95) * (1.0 - 0.18 * smoothstep(0.2, 1.0, rn) * (0.5 - 0.5 * dot(p / r, normalize(vec2(-0.6, 0.8)))));
    drin += vec3(1.0, 0.95, 0.88) * pow(rn, 9.0) * 0.22;
    c = mix(bild, mix(draussen, drin, innen), uNacht * uKosC.x);
    // die Wand des Kreises: haarfein, zeichnet sich ein, offen, wo der Daumen zieht
    float wl = (1.0 - smoothstep(0.3, 1.15 + 0.8 * uGreif, abs(rpx))) * wand * uKosC.x * (1.0 + 0.6 * uGreif);
    // gegriffen: der Rand glüht warm, wie ein Glas, das man in die Hand nimmt
    c += vec3(1.0, 0.82, 0.55) * exp(-rpx * rpx / 90.0) * uGreif * 0.35 * uKosC.x;
    float wl2 = (1.0 - smoothstep(0.25, 0.95, abs(rpx + 4.5))) * wand * uKosC.x * 0.3;
    c = mix(c, vec3(1.0, 0.95, 0.86), clamp(wl + wl2, 0.0, 1.0));
    // die Ränder der Öffnung glühen leicht
    float ecke = exp(-pow((dth - spalt) / 0.03, 2.0)) * exp(-rpx * rpx / 40.0) * offen;
    c += vec3(1.0, 0.85, 0.6) * ecke * 0.5 * uKosC.x;
  }
  // feines Zittern unter einem Achtbit-Schritt: sonst stehen in den dunklen Flächen Stufen
  c += (h21(gl_FragCoord.xy + fract(uT) * 61.0) - 0.5) * (2.0 / 255.0);
  o = vec4(c, 1.0);
}`;

// ---------- Sand: Körner aus dem Bild, die zu den Knotenlinien wandern ----------
// Jedes Korn hat seinen Ort im Bild, von dem es die Farbe nimmt. Wo die Platte schwingt, wird es hochgeworfen,
// und es rutscht dorthin, wo sie ruht. So zeichnet das Bild selbst die Figur, und bei jeder neuen Note springt der Sand
// auf und sucht die neuen Linien. Zustand je Korn (Ort relativ zum Daumen, Tempo) in einer HalfFloat-Textur.
const FS_KORN = KOPF + CHLADNI + `uniform sampler2D uZustand; uniform vec4 uMode, uModeB; uniform float uDt, uT, uStimme, uWurf, uInit, uRmax, uHeim, uSaatR;
uniform vec2 uVersatz, uHeimC;
vec2 saat(vec2 ij){ float a = h21(ij + 0.37), b = h21(ij * 1.31 + 5.17); return sqrt(a) * vec2(cos(b * 6.2832), sin(b * 6.2832)); }
void main(){
  vec2 ij = floor(gl_FragCoord.xy);
  if (uInit > 0.5) { o = vec4(saat(ij + 0.5) * uRmax, 0.0, 0.0); return; }
  vec4 z = texelFetch(uZustand, ivec2(ij), 0);
  // der Daumen wandert, der Sand bleibt liegen: so pflügt die Platte durch den Sand
  vec2 p = z.xy - uVersatz, w = z.zw;
  vec3 a = chladni(p, uMode.x, uMode.y, uModeB.y), b = chladni(p, uMode.z, uMode.w, uModeB.z);
  vec3 P = mix(a, b, uModeB.x);
  float g = max(length(P.yz), 0.5);
  // zum Knoten: ein Newton-Schritt, gedeckelt, damit nichts über die Linie schiesst
  // jedes Korn bleibt ein wenig neben dem Knoten liegen, so wird die Linie ein Sandwall; wo die Platte flach ist, ein breiter
  float neben = (h21(ij * 0.91 + 1.7) + h21(ij * 1.37 + 4.1) - 1.0) * 0.21;
  vec2 n = P.yz / g; float dist = (P.x - neben) / g;
  float schritt = clamp(dist, -0.01, 0.01) * min(1.0, uDt * (1.5 + 4.5 * uStimme)) * (1.0 - uHeim);
  p -= n * schritt;
  // loslassen: jedes Korn fliegt zurück an den Ort, von dem es kam, in einem Bogen und jedes in seinem Tempo;
  // so fügt sich das Bild aus dem Sand wieder zusammen
  if (uHeim > 0.001) {
    vec2 d = uHeimC + saat(ij + 0.5) * uSaatR - p;
    float eigen = 0.55 + 0.9 * h21(ij * 1.73 + 0.4);
    vec2 bogen = vec2(-d.y, d.x) * (h21(ij * 0.53 + 2.2) - 0.5) * 1.4 * min(1.0, length(d) * 6.0);
    p += (d + bogen) * min(1.0, uDt * (0.8 + 2.4 * uHeim) * eigen) * uHeim;
  }
  // die Platte wirft: zufällig, so stark, wie sie an der Stelle schwingt; beim Notenwechsel ein Sprung
  float zt = floor(uT * 60.0);
  vec2 r = vec2(h21(ij + zt * 0.731), h21(ij.yx + zt * 1.173 + 3.1)) * 2.0 - 1.0;
  float amp = min(abs(P.x), 1.6);
  w += r * amp * (0.16 * uStimme + 2.3 * uWurf) * uDt * (1.0 - uHeim);
  w += r * 0.02 * uDt;                        // ein Rest Unruhe: die Linie atmet
  w *= exp(-uDt * 7.0);
  p += w * uDt;
  float l = length(p); if (l > uRmax && uHeim < 0.5) { p *= uRmax / l; w *= -0.3; }
  o = vec4(p, w);
}`;
const VS_KORN = `#version 300 es
precision highp float; precision highp sampler2D;
uniform sampler2D uZustand, uScharf; uniform int uS; uniform vec4 uZ, uSaat; uniform float uSeite, uPunkt, uHell, uR;
out vec3 vF;
float h21(vec2 p){ p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }
vec2 saat(vec2 ij){ float a = h21(ij + 0.37), b = h21(ij * 1.31 + 5.17); return sqrt(a) * vec2(cos(b * 6.2832), sin(b * 6.2832)); }
void main(){
  ivec2 ij = ivec2(gl_VertexID % uS, gl_VertexID / uS);
  vec4 z = texelFetch(uZustand, ij, 0);
  vec2 q = uZ.xy + z.xy;
  gl_Position = vec4((q.x / uSeite) * 2.0 - 1.0, q.y * 2.0 - 1.0, 0.0, 1.0);
  gl_PointSize = uPunkt;
  // die Farbe vom Ort, an dem das Korn lag, als der Sand gestreut wurde
  vec2 her = uSaat.xy + saat(vec2(ij) + 0.5) * uSaat.z;
  vec3 f = texture(uScharf, clamp(vec2(her.x / uSeite, her.y), 0.002, 0.998)).rgb;
  float l = dot(f, vec3(0.2126, 0.7152, 0.0722));
  f = mix(vec3(l), f, 1.35) * 1.05 + 0.02;
  // Quarz: jedes Korn ein wenig anders
  float k = h21(vec2(ij) * 0.71 + 2.3);
  f = mix(f, vec3(1.0, 0.95, 0.84) * (0.4 + 0.6 * l), 0.08 + 0.14 * k);
  float flug = 1.0 / (1.0 + length(z.zw) * 22.0);
  float zone = (1.0 - smoothstep(uR * 0.72, uR, length(z.xy))) * uZ.w;
  vF = f * uHell * zone * (0.45 + 0.55 * flug) * (0.7 + 0.6 * k);
}`;
const FS_KORN_PUNKT = `#version 300 es
precision highp float; in vec3 vF; out vec4 o;
void main(){ vec2 d = gl_PointCoord * 2.0 - 1.0; float r2 = dot(d, d); if (r2 > 1.0) discard; o = vec4(vF * exp(-r2 * 2.6), 1.0); }`;

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
const zeichneFlaeche = () => gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
// Einheit 1 bleibt dem Gedächtnis (sampler2DArray), alle anderen Texturen ab Einheit 2
function rechne(prog, ziel, tex, setze) {
  gl.bindFramebuffer(gl.FRAMEBUFFER, ziel ? ziel.fb : null);
  gl.viewport(0, 0, ziel ? ziel.b : leinwand.width, ziel ? ziel.h : leinwand.height);
  gl.useProgram(prog);
  let e = 2;
  for (const [n, t] of Object.entries(tex)) {
    gl.activeTexture(gl.TEXTURE0 + e);
    gl.bindTexture(gl.TEXTURE_2D, t ? t.tex || t : null);
    gl.uniform1i(prog.u[n], e); e++;
  }
  if (prog.u.uHist) { gl.activeTexture(gl.TEXTURE1); gl.bindTexture(gl.TEXTURE_2D_ARRAY, histTex); gl.uniform1i(prog.u.uHist, 1); gl.uniform1f(prog.u.uKopf, histKopf); gl.uniform1f(prog.u.uN, HIST_N); }
  if (setze) setze(prog.u);
  zeichneFlaeche();
}

let scharfTex = null, scharfB = 0, scharfH = 0, histTex = null, histFb = null, histB = 0, histH = 0, histKopf = 0, histLeer = true, histZeit = 0;
if (gl) {
  halbFloat = !!gl.getExtension('EXT_color_buffer_float');
  gl.getExtension('OES_texture_half_float_linear');
  try {
    for (const [n, fs] of Object.entries({ kopie: FS_KOPIE, chaos: FS_CHAOS, szene: FS_SZENE, hell: FS_HELL, weich: FS_WEICH, zusammen: FS_ZUSAMMEN })) P[n] = programm(fs);
  } catch (e) { spur('Shader: ' + String(e.message).slice(0, 140)); console.error(e); melden(TEXTE[sprache].keinGL); }
  // Sand aus Körnern nur mit HalfFloat-Zielen und Grafikkarte; sonst die gezeichneten Linien wie bisher
  if (halbFloat && !leicht && !Q.has('linien')) {
    try { P.korn = programm(FS_KORN); P.kornPunkt = programm(FS_KORN_PUNKT, VS_KORN); }
    catch (e) { spur('Sand: ' + String(e.message).slice(0, 140)); console.error(e); }
  }
  const buf = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
  gl.enableVertexAttribArray(0); gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
  spur('Grafik bereit' + (halbFloat ? '' : ' (8 Bit)'));
}

const scharf = document.createElement('canvas');
const sctx = scharf.getContext('2d', { alpha: false });

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
function texParam(ziel = gl.TEXTURE_2D) {
  for (const [k, w] of [[gl.TEXTURE_MIN_FILTER, gl.LINEAR], [gl.TEXTURE_MAG_FILTER, gl.LINEAR], [gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE], [gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE]]) gl.texParameteri(ziel, k, w);
}
function groesse() {
  const dpr = Math.min(devicePixelRatio || 1, MAX_DPR) * aufloesung;
  const b = Math.round(fotoRahmen.b * dpr), hh = Math.round(fotoRahmen.h * dpr);
  if (leinwand.width !== b || leinwand.height !== hh) { leinwand.width = b; leinwand.height = hh; }
  if (!gl) return;
  const lang = Math.min(SCHARF_SEITE, Math.max(640, Math.round(Math.max(fotoRahmen.b, fotoRahmen.h) * Math.min(devicePixelRatio || 1, 2))));
  const [sb, sh] = seitenMass(lang);
  if (sb !== scharfB || sh !== scharfH) {
    scharfB = sb; scharfH = sh; scharf.width = sb; scharf.height = sh;
    if (!scharfTex) scharfTex = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, scharfTex);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, sb, sh, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
    texParam();
  }
  // das Gedächtnis: ein Stapel von Momenten (8 Bit genügt, es ist nur Bild)
  const [hb, hh2] = seitenMass(HIST_SEITE);
  if (hb !== histB || hh2 !== histH) {
    histB = hb; histH = hh2;
    if (histTex) gl.deleteTexture(histTex);
    histTex = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D_ARRAY, histTex);
    gl.texStorage3D(gl.TEXTURE_2D_ARRAY, 1, gl.RGBA8, hb, hh2, HIST_N);
    texParam(gl.TEXTURE_2D_ARRAY);
    if (!histFb) histFb = gl.createFramebuffer();
    histLeer = true;
  }
  const [cb, ch] = seitenMass(CHAOS_SEITE);
  zielBauen('chaos', cb, ch, false);
  if (fotos.length) fotoBuehneGroesse();
}
addEventListener('resize', groesse);
// einen Moment ins Gedächtnis legen (alle, wenn es noch leer ist: dann gibt es noch keine Vergangenheit)
function histSchreiben() {
  const n = histLeer ? HIST_N : 1;
  for (let i = 0; i < n; i++) {
    histKopf = (histKopf + 1) % HIST_N;
    gl.bindFramebuffer(gl.FRAMEBUFFER, histFb);
    gl.framebufferTextureLayer(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, histTex, 0, histKopf);
    gl.viewport(0, 0, histB, histH); gl.useProgram(P.kopie);
    gl.activeTexture(gl.TEXTURE2); gl.bindTexture(gl.TEXTURE_2D, scharfTex); gl.uniform1i(P.kopie.u.uQ, 2);
    zeichneFlaeche();
  }
  histLeer = false;
}

// ---------- Quellen (wie in Figur und Fläche) ----------
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
  try { nr = e ? (+(localStorage.getItem('ritornell.beispiel') || 0)) % BEISPIELE.length : 0; localStorage.setItem('ritornell.beispiel', String(nr + 1)); } catch {}
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
// Bei Fotos fährt die Kamera sanft: so hat auch ein Foto eine Vergangenheit, aus der das Gedächtnis schöpft
function fotoMalen(t) {
  fotoBuehneGroesse();
  fotosMalen(fotoBuehne.getContext('2d'), fotos, fotoBuehne.width, fotoBuehne.height, t - fotoStart,
    { dauer: FOTO_DAUER, blende: FOTO_BLENDE, art: 'atmen', mix: fahrt.schritt(t) });
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

function malenIn(ctx, B, H) {
  const q = quelle; if (!q) return false;
  const qb = q.videoWidth || q.width, qh = q.videoHeight || q.height;
  if (!qb || !qh) return false;
  ctx.save();
  if (spiegelnQuelle) { ctx.translate(B, 0); ctx.scale(-1, 1); }
  const deck = Math.max(B / qb, H / qh), ganz = Math.min(B / qb, H / qh);
  if (deck / ganz > 1.7) {
    ctx.fillStyle = '#0a0a0b'; ctx.fillRect(0, 0, B, H);
    ctx.drawImage(q, (B - qb * ganz) / 2, (H - qh * ganz) / 2, qb * ganz, qh * ganz);
  } else ctx.drawImage(q, (B - qb * deck) / 2, (H - qh * deck) / 2, qb * deck, qh * deck);
  ctx.restore();
  return true;
}
let neuesBild = true, letzteQuellzeit = -1;
function scharfFangen() {
  if (!scharfTex || !malenIn(sctx, scharfB, scharfH)) return false;
  gl.activeTexture(gl.TEXTURE2); gl.bindTexture(gl.TEXTURE_2D, scharfTex);
  gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
  gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, gl.RGBA, gl.UNSIGNED_BYTE, scharf);
  gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
  const qz = quelle === videoEl && !videoEl.srcObject ? videoEl.currentTime : -2;
  neuesBild = qz === -2 || qz !== letzteQuellzeit; letzteQuellzeit = qz;
  return true;
}
function neueQuelle() { histLeer = true; }

// ---------- Regler und Lesarten ----------
// Je Lesart drei Regler mit eigenem Sinn; die Werte bleiben je Lesart erhalten.
const WERTE = [[0.55, 0.5, 0.65], [0.45, 0.5, 0.6], [0.5, 0.45, 0.5]];
let lesart = 0;
const regler = ['r-a', 'r-b', 'r-c'];
function reglerBeschriften() {
  const t = TEXTE[sprache];
  ['n-a', 'n-b', 'n-c'].forEach((id, k) => { $(id).textContent = t.regler[lesart][k]; });
  regler.forEach((id, k) => { $(id).value = String(WERTE[lesart][k]); $(id).setAttribute('aria-label', t.regler[lesart][k]); });
}
regler.forEach((id, k) => $(id).addEventListener('input', (e) => { WERTE[lesart][k] = +e.target.value; }));
function lesartWaehlen(nr, still) {
  lesart = nr;
  $('buehne').dataset.art = String(nr);
  document.querySelectorAll('[data-lesart]').forEach((b) => b.setAttribute('aria-pressed', String(+b.dataset.lesart === nr)));
  $('r-lesart').value = String(nr);
  reglerBeschriften();
  lesartText();
  loesenZeigen();
  daumenZeigen();
  if (still) return;
  randLeeren();
  const z = TEXTE[sprache].lesarten[nr];
  randZeigen({ art: 'titel', text: z.titel + ' · ' + z.wer, lesart: nr });
  glosse('trois');
  spur('Lesart ' + nr);
}
function lesartText() {
  const z = TEXTE[sprache].lesarten[lesart];
  $('b-lesart-titel').textContent = z.titel + ' · ' + z.wer;
  $('b-lesart-text').textContent = z.text;
}
document.querySelectorAll('[data-lesart]').forEach((b) => b.addEventListener('click', () => lesartWaehlen(+b.dataset.lesart)));
$('r-lesart').addEventListener('input', (e) => { const nr = +e.target.value; if (nr !== lesart) lesartWaehlen(nr); });

// ---------- der Takt: eine Uhr für Stimme, Marken und Glas ----------
// Acht Schritte je Durchgang. Das Lied: das alte Spottlied der Kinder, sol sol mi la sol mi, überall auf der Welt gesungen.
const LIED = [392.0, 392.0, 329.63, 440.0, 392.0, 329.63, 0, 0];
// jede Note ihre Klangfigur [Ringe, Durchmesser]; bei jeder Wiederholung dreht sich die Figur ein wenig: die Wiederholung ist nie dieselbe
const FIGUREN = { 392: [2, 5], 329.63: [-3, 7], 440: [-2, 7], 293.66: [4, 7], 493.88: [-3, 8] };
const LEITER = [0, 2, 4, 7, 9, 12, 14, 16, 19, 21, 24];   // Pentatonik auf G
const OBERTON = { 392: 8, 329.63: 7, 440: 9 };
const schrittDauer = () => 60 / (lesart === 1 ? 66 + 84 * WERTE[1][0] : 92) / 2;
let schrittZeit = 0, schritt = -1, durchgang = 0;
// was der Takt bei jedem Schritt auslöst
function takt(t) {
  const d = schrittDauer();
  if (t - schrittZeit < d && schritt >= 0) return false;
  schrittZeit = schritt < 0 ? t : schrittZeit + d;
  if (t - schrittZeit > d) schrittZeit = t;                 // nach einer Pause nicht nachholen
  schritt = (schritt + 1) % 8; if (schritt === 0) durchgang++;
  return true;
}
const phaseImSchritt = (t) => Math.min(1, (t - schrittZeit) / schrittDauer());

// ---------- Zustand der drei Lesarten ----------
let nacht = 0, nachtZiel = 0;
// Summen
const sum = { x: 0.5, y: 0.5, R: 0.12, ordnung: 0, stimme: 0, halt: 0, k1: 2, m1: 5, k2: 2, m2: 5, rot1: 0, rot2: 0, mix: 1, puls: 9, pulsA: 0, aktiv: false, wurf: 0, streuen: true, saat: [0.5, 0.5, 0.3], heim: 0, los: 9, vx: 0.5, vy: 0.5 };
const KORN_S = telefon ? 320 : 448;   // 102 400 Körner am Telefon, 200 704 am grossen Bildschirm
// Revier
let marken = [], ringe = [], schlagGlut = 0, revierDa = 0;
const RING_TEMPO = 0.2, RING_DAUER = 2.2;   // die Ringe laufen langsam und reichen nicht weit: ein Ruf, kein Netz
// Kosmos
const kos = { x: 0.5, y: 0.5, R: 0.26, offen: 0, offenZiel: 0, phi: Math.PI / 2, zug: 0, aktiv: false, dreh: 0, seit: 0, greif: 0, zwei: null };
// der Kreis folgt der Hand, bleibt aber ganz im Bild
function kreisSchieben(x, y, dt, tau) {
  const s = fotoRahmen.b / fotoRahmen.h, r = kos.R * 0.7;
  x = Math.max(r, Math.min(s - r, x)); y = Math.max(0.2, Math.min(0.82, y));
  kos.x = tau ? naeher(kos.x, x, dt, tau) : x; kos.y = tau ? naeher(kos.y, y, dt, tau) : y;
  kos.zx = kos.mx = kos.x; kos.zy = kos.my = kos.y;   // wer schiebt, hält den Kreis selbst: kein Nachgleiten
}
// ein neu gesetzter Kreis springt nicht, er gleitet hin: zweifach geglättet, also sanft an- und auslaufend
function kreisGleiten(dt) {
  if (kos.zx === undefined) return;
  const tau = 0.22;
  kos.mx = naeher(kos.mx, kos.zx, dt, tau); kos.my = naeher(kos.my, kos.zy, dt, tau);
  kos.x = naeher(kos.x, kos.mx, dt, tau); kos.y = naeher(kos.y, kos.my, dt, tau);
}

// ---------- Hände ----------
const finger = new Map();
const inQ = (cx, cy) => ({ x: cx / fotoRahmen.h, y: 1 - cy / fotoRahmen.h });   // in Bildhöhen, y nach oben
let samen = 0, letzteBeruehrung = -99;
function fingerNeu(cx, cy) {
  samen++;
  return { x: cx, y: cy, x0: cx, y0: cy, lx: cx, ly: cy, bewegt: 0, zeit: 0, marke: -1, start: performance.now() };
}
function markeUnter(cx, cy) {
  const p = inQ(cx, cy); let best = -1, bd = 34 / fotoRahmen.h;
  marken.forEach((m, i) => { const d = Math.hypot(m.x - p.x, m.y - p.y); if (d < bd) { bd = d; best = i; } });
  return best;
}
function markeSetzen(cx, cy) {
  const p = inQ(cx, cy), t = performance.now() / 1000;
  // auf den nächsten Schritt gelegt: wer im Takt tippt, bekommt seinen Rhythmus
  const slot = schritt < 0 ? 0 : (schritt + (phaseImSchritt(t) > 0.5 ? 1 : 0)) % 8;
  const stufe = Math.max(0, Math.min(LEITER.length - 1, Math.round(p.y * (LEITER.length - 1))));
  const m = { x: p.x, y: p.y, slot, f: 196 * Math.pow(2, LEITER[stufe] / 12), pan: (cx / fotoRahmen.b) * 2 - 1, treffer: 0, glut: 1, r: 0 };
  marken.push(m); if (marken.length > 8) marken.shift();
  klangSchlag(m.f, m.pan, 1, 0.2 + 0.6 * (cx / fotoRahmen.b));
  ringe.push({ x: m.x, y: m.y, t0: t, a: 1 }); if (ringe.length > 12) ringe.shift();
  if (marken.length === 1) glosse('chezsoi');
  loesenZeigen();
  spur('Marke ' + marken.length);
}

leinwand.addEventListener('pointerdown', (e) => {
  const f = fingerNeu((e.clientX - fotoRahmen.x), (e.clientY - fotoRahmen.y));
  finger.set(e.pointerId, f);
  leinwand.setPointerCapture(e.pointerId);
  if (!daumenGelernt[lesart]) $('daumen').classList.add('weg');
  haltZeigen((e.clientX - fotoRahmen.x), (e.clientY - fotoRahmen.y));
  geisterStart = -1; finger.delete('geist');
  letzteBeruehrung = performance.now() / 1000;
  const p = inQ((e.clientX - fotoRahmen.x), (e.clientY - fotoRahmen.y));
  if (lesart === 0) { if (!sum.aktiv || sum.ordnung < 0.05) { sum.x = p.x; sum.y = p.y; sum.R = 0.06; sum.streuen = true; } sum.aktiv = true; glosse('chantonner'); }
  if (lesart === 1) f.marke = markeUnter((e.clientX - fotoRahmen.x), (e.clientY - fotoRahmen.y));
  if (lesart === 2) {
    const d = Math.hypot(p.x - kos.x, p.y - kos.y);
    if (!kos.aktiv || kos.zug < 0.2 || d > kos.R * 1.4) {
      // ein neuer Kreis um die Stelle, nie ganz am Rand
      const s = fotoRahmen.b / fotoRahmen.h;
      kos.R = Math.min(0.26, 0.4 * s);
      const zx = Math.max(kos.R * 0.7, Math.min(s - kos.R * 0.7, p.x)), zy = Math.max(0.3, Math.min(0.75, p.y));
      if (kos.aktiv && kos.zug > 0.2) { kos.zx = zx; kos.zy = zy; }   // sichtbar: hingleiten
      else { kos.x = kos.mx = kos.zx = zx; kos.y = kos.my = kos.zy = zy; }   // unsichtbar: dort erscheinen
      kos.zug = kos.aktiv ? kos.zug : 0; kos.aktiv = true; kos.offenZiel = 0;
      f.neuerKreis = true;
    } else if (d < kos.R * 0.5) f.greifbar = true;
    glosse('cosmos');
  }
});
leinwand.addEventListener('pointermove', (e) => {
  const f = finger.get(e.pointerId); if (!f) return;
  f.bewegt += Math.hypot((e.clientX - fotoRahmen.x) - f.x, (e.clientY - fotoRahmen.y) - f.y);
  f.x = (e.clientX - fotoRahmen.x); f.y = (e.clientY - fotoRahmen.y);
  haltZeigen((e.clientX - fotoRahmen.x), (e.clientY - fotoRahmen.y));
  if (lesart === 1 && f.marke >= 0 && marken[f.marke] && f.bewegt > 8) { const p = inQ(f.x, f.y); marken[f.marke].x = p.x; marken[f.marke].y = p.y; }
});
let nachUhr = 0;
const loslassen = (e) => {
  const f = finger.get(e.pointerId);
  finger.delete(e.pointerId);
  if (finger.size === 0) { $('halt').classList.remove('da'); if (!daumenGelernt[lesart]) setTimeout(daumenZeigen, 600); }
  letzteBeruehrung = performance.now() / 1000;
  if (lesart === 1 && f && f.bewegt < 14 && performance.now() - f.start < 450) {
    const k = markeUnter(f.x, f.y);
    if (k >= 0) { marken.splice(k, 1); loesenZeigen(); spur('Marke weg'); } else markeSetzen(f.x, f.y);
  }
  clearTimeout(nachUhr);
  if (lesart === 0) nachUhr = setTimeout(() => { if (!finger.size && lesart === 0) glosse('chaos'); }, 2200);
  if (lesart === 1) nachUhr = setTimeout(() => { if (!finger.size && lesart === 1 && marken.length >= 3) glosse('expression'); }, 5200);
  if (lesart === 2) nachUhr = setTimeout(() => { if (!finger.size && lesart === 2) glosse('klee'); }, 2400);
};
leinwand.addEventListener('pointerup', loslassen);
leinwand.addEventListener('pointercancel', loslassen);

// alles lösen: die Marken verstummen, die Stimme schweigt, der Kreis schliesst sich, die Nacht weicht
function allesLoesen() {
  marken = []; sum.aktiv = false; kos.offenZiel = 0; kos.aktiv = false;
  loesenZeigen(); spur('gelöst');
}
function loesenZeigen() {
  const da = (lesart === 1 && marken.length > 0) || (lesart === 2 && kos.aktiv);
  $('loesen').hidden = !da;
}

const lerp = (a, b, k) => a + (b - a) * k;
const naeher = (a, b, dt, tau) => a + (b - a) * (1 - Math.exp(-dt / tau));
let bewegungHand = 0;
function haende(t, dt) {
  const W = WERTE[lesart];
  let tempo = 0;
  for (const f of finger.values()) { tempo = Math.max(tempo, Math.hypot(f.x - f.lx, f.y - f.ly) / fotoRahmen.h / dt); f.lx = f.x; f.ly = f.y; f.zeit += dt; }
  bewegungHand = naeher(bewegungHand, Math.min(1, tempo / 2), dt, 0.15);
  const ruhe = t - letzteBeruehrung;
  const daumen = finger.size > 0 ? [...finger.values()][0] : null;

  // Summen: halten macht die Stimme, die Stimme macht die Ordnung
  if (lesart === 0 && daumen) {
    const p = inQ(daumen.x, daumen.y);
    sum.x = naeher(sum.x, p.x, dt, 0.25); sum.y = naeher(sum.y, p.y, dt, 0.25);
    sum.halt += dt;
  } else sum.halt = Math.max(0, sum.halt - dt * 2);
  const singt = lesart === 0 && !!daumen;
  sum.stimme = naeher(sum.stimme, singt ? 1 : 0, dt, singt ? 0.35 : 1.1);
  // mit Sand: nach dem Loslassen bleibt die Platte, bis die Körner heimgeflogen sind und das Bild wieder steht, dann weicht sie
  const mitSand = !!(P.kornPunkt && halbFloat);
  sum.los = singt ? 0 : sum.los + dt;
  sum.heim = naeher(sum.heim, singt ? 0 : 1, dt, singt ? 0.12 : 0.3);
  if (mitSand) sum.ordnung = naeher(sum.ordnung, singt ? 1 : sum.los < 2.2 ? sum.ordnung : 0, dt, singt ? 0.5 : 0.8);
  else sum.ordnung = naeher(sum.ordnung, singt ? 1 : 0, dt, singt ? 0.5 : 2.8);
  // solange gesungen wird, dreht sich die Platte langsam weiter: der Sand kommt nie ganz zur Ruhe
  if (singt) { const dr = dt * (0.16 + 0.5 * bewegungHand); sum.rot1 += dr; sum.rot2 += dr; }
  const Rziel = (0.2 + 0.5 * W[0]) * (0.35 + 0.65 * Math.min(1, sum.halt / 2.2));
  sum.R = naeher(sum.R, singt ? Rziel : sum.R, dt, 0.6);
  if (sum.ordnung < 0.01 && !singt) sum.aktiv = false;
  sum.mix = Math.min(1, sum.mix + dt / 0.32);
  sum.puls += dt * 0.32; sum.pulsA = Math.max(0, sum.pulsA - dt * 0.9);
  sum.wurf = Math.max(0, sum.wurf - dt * 7);

  // Revier: Marken glühen nach, Ringe laufen hinaus und verblassen; das Revier wächst mit jedem Treffer
  for (const m of marken) {
    m.glut = Math.max(0, m.glut - dt * 3.2);
    const rz = (0.06 + 0.12 * WERTE[1][1]) * (0.55 + 0.45 * Math.min(1, m.treffer / 6));
    m.r = naeher(m.r || 0.02, rz, dt, 0.5);
  }
  ringe = ringe.filter((r) => t - r.t0 < RING_DAUER);
  schlagGlut = Math.max(0, schlagGlut - dt * 2.5);
  revierDa = naeher(revierDa, marken.length ? 1 : 0, dt, 0.6);

  // Kosmos: ziehen öffnet, loslassen schliesst langsam. Den Kreis verschieben: den Daumen in der Mitte kurz still halten
  // und dann schieben, oder mit zwei Fingern schieben.
  let greift = false;
  kreisGleiten(dt);
  if (lesart === 2 && kos.aktiv && finger.size >= 2) {
    const [a, b] = [...finger.values()], m = inQ((a.x + b.x) / 2, (a.y + b.y) / 2);
    if (kos.zwei) kreisSchieben(kos.x + m.x - kos.zwei.x, kos.y + m.y - kos.zwei.y, dt, 0);
    kos.zwei = m; greift = true;
  } else kos.zwei = null;
  if (lesart === 2 && daumen && kos.aktiv && !greift) {
    const p = inQ(daumen.x, daumen.y), dx = p.x - kos.x, dy = p.y - kos.y, d = Math.hypot(dx, dy);
    if (daumen.greifbar && !daumen.greift && daumen.zeit > 0.42 && daumen.bewegt < 12) {
      daumen.greift = true; daumen.gx = kos.x - p.x; daumen.gy = kos.y - p.y;
      klangGlas(98, 0.45); try { navigator.vibrate?.(8); } catch {}
    }
    if (daumen.greift) { kreisSchieben(p.x + daumen.gx, p.y + daumen.gy, dt, 0.07); greift = true; }
    else if (!daumen.neuerKreis || daumen.bewegt > 30) {
      kos.offenZiel = Math.max(0, Math.min(1, (d - kos.R * 0.55) / 0.32));
      if (d > kos.R * 0.25) { let dw = Math.atan2(dy, dx) - kos.phi; while (dw > Math.PI) dw -= 2 * Math.PI; while (dw < -Math.PI) dw += 2 * Math.PI; kos.phi += dw * (1 - Math.exp(-dt / 0.12)); }
    }
  } else if (kos.aktiv) kos.offenZiel = ruhe > 0.6 ? 0 : kos.offenZiel;
  kos.offen = naeher(kos.offen, kos.offenZiel, dt, kos.offenZiel > kos.offen ? 0.25 : 3.2);
  kos.zug = naeher(kos.zug, kos.aktiv && lesart === 2 ? 1 : 0, dt, kos.aktiv ? 0.5 : 1.0);
  kos.dreh += dt * 0.05 * (0.3 + kos.offen);
  kos.greif = naeher(kos.greif, greift ? 1 : 0, dt, 0.12);
  if (kos.aktiv && !daumen && kos.offen < 0.02 && ruhe > 7) { kos.aktiv = false; loesenZeigen(); }

  // die Nacht: fällt mit der ersten Berührung, weicht, wenn nichts mehr singt (Rückkehr nach einigen Sekunden)
  const etwas = (lesart === 0 && (singt || sum.ordnung > 0.04)) || (lesart === 1 && marken.length > 0) || (lesart === 2 && (kos.aktiv || kos.offen > 0.02));
  nachtZiel = etwas ? 1 : 0;
  nacht = naeher(nacht, nachtZiel, dt, nachtZiel ? 0.7 : 2.4);
}

// je Schritt des Takts: die Stimme singt die nächste Note, die Marken klingen, der Kosmos läutet
function taktAusloesen(t) {
  const W = WERTE[lesart];
  if (lesart === 0 && sum.stimme > 0.05) {
    const f = LIED[schritt];
    if (f) {
      klangSummen(f, sum.stimme);
      const fig = FIGUREN[f] || [3, 2];
      const k2 = fig[0] + Math.sign(fig[0]) * (durchgang % 3 === 2 ? 1 : 0), m2 = fig[1] + (durchgang % 4 === 3 ? 2 : 0);
      // dieselbe Note: der Sand bleibt liegen und zittert nur; eine neue Note wirft ihn auf.
      // Mit jedem Durchgang dreht sich die Platte ein wenig: die Wiederholung ist nie dieselbe.
      const neu = k2 !== sum.k2 || m2 !== sum.m2 || schritt === 0;
      sum.k1 = sum.k2; sum.m1 = sum.m2; sum.rot1 = sum.rot2;
      sum.k2 = k2; sum.m2 = m2;
      if (schritt === 0) sum.rot2 += 0.3 + 0.1 * (durchgang % 5);
      sum.mix = neu ? 0 : 1; sum.puls = 0; sum.pulsA = 1; sum.wurf = neu ? 1 : 0.3;
    }
  }
  if (lesart === 1) {
    let klang = false;
    for (const m of marken) if (m.slot === schritt) {
      klangSchlag(m.f, m.pan, 0.85, 0.2 + 0.6 * ((m.pan + 1) / 2));
      m.glut = 1; m.treffer++; klang = true;
      ringe.push({ x: m.x, y: m.y, t0: t, a: 0.6 + 0.4 * WERTE[1][2] }); if (ringe.length > 12) ringe.shift();
    }
    if (klang) schlagGlut = 1;
  }
  if (lesart === 2 && kos.offen > 0.05) {
    // der Refrain in der Obertonreihe: sol = 8., la = 9., mi wird zum 7. Teilton; weit geöffnet eine Oktave höher
    const f = LIED[schritt];
    if (f) klangOberton(OBERTON[f] * (kos.offen > 0.6 ? 2 : 1), Math.min(1, 0.35 + kos.offen));
    // eine Glasschale am Anfang und in der Mitte jedes Durchgangs
    if ((schritt === 0 || schritt === 4) && kos.offen > 0.2) klangGlas(LIED[(durchgang + schritt) % 6] * (schritt ? 2 : 1), 0.4 + 0.6 * kos.offen, Math.cos(kos.phi) * 0.7);
  }
}

// Nur im Vorspann führt eine unsichtbare Hand; sonst beginnt alles erst mit der Berührung (Christian, 19.11.2026)
const VORSPANN = Q.has('vorspann');
let geisterStart = -1;
function geist(t) {
  if (geisterStart < 0 || t < geisterStart) return;
  const u = (t - geisterStart) % 16;
  const s = fotoRahmen.b / fotoRahmen.h, W = fotoRahmen.b, H = fotoRahmen.h;
  if (u < 6.5) {
    // Summen: der Daumen pflügt in einer langsamen Schleife durch den Sand
    if (lesart !== 0) { lesartWaehlen(0, true); kos.aktiv = false; kos.offenZiel = 0; }
    if (!finger.has('geist')) { const f = fingerNeu(W * 0.5, H * 0.48); finger.set('geist', f); sum.x = 0.5 * s; sum.y = 0.52; sum.R = 0.06; sum.aktiv = true; sum.streuen = true; }
    const f = finger.get('geist'), w = u * 0.95;
    f.x = W * (0.5 + 0.17 * Math.sin(w) * Math.min(1, u / 1.5)); f.y = H * (0.47 + 0.07 * Math.sin(2 * w + 0.6) * Math.min(1, u / 1.5)); letzteBeruehrung = t;
  } else if (u < 8.6) {
    // loslassen: die Körner fliegen heim, das Bild fügt sich
    finger.delete('geist');
  } else if (u < 14.4) {
    // Kosmos: ein Kreis um das Gesicht, der Daumen zieht ihn auf und wandert um ihn herum
    if (lesart !== 2) {
      lesartWaehlen(2, true);
      kos.R = Math.min(0.26, 0.4 * s); kos.x = kos.mx = kos.zx = 0.5 * s; kos.y = kos.my = kos.zy = 0.55;
      kos.zug = 0; kos.aktiv = true; kos.offenZiel = 0; kos.phi = Math.PI * 0.35;
    }
    const k = u - 8.6;
    if (k > 0.9 && k < 4.6) {
      if (!finger.has('geist')) finger.set('geist', fingerNeu(W * 0.5, H * 0.45));
      const f = finger.get('geist'), r = Math.min(1, (k - 0.9) / 1.6), wi = Math.PI * 0.35 - 0.55 * (k - 0.9);
      const px = 0.5 * s + (0.06 + 0.3 * r) * Math.cos(wi), py = 0.55 + (0.06 + 0.3 * r) * Math.sin(wi);
      f.x = px * H; f.y = (1 - py) * H; f.bewegt = 99; letzteBeruehrung = t;
    } else finger.delete('geist');
  } else {
    // der Kreis vergeht, der Kehrreim beginnt von vorn
    finger.delete('geist'); kos.aktiv = false; kos.offenZiel = 0;
    if (lesart !== 0) lesartWaehlen(0, true);
  }
}

// ---------- Daumen: wo auflegen, und ein Ring, der sich füllt ----------
// Jede Lesart hat ihre eigene Geste; die Hilfe zeigt sie, bis sie einmal gelungen ist. Sie ist die einzige Anleitung auf dem Bild:
// die Randfläche oben trägt nur Titel und Glossen, nie dieselbe Anweisung ein zweites Mal.
const daumenGelernt = [false, false, false];
let haltZeit = 0, daumenUhr = 0;
function daumenZeigen() {
  const d = $('daumen');
  clearTimeout(daumenUhr);
  if (!laeuft || VORSPANN || daumenGelernt[lesart]) { d.classList.add('weg'); daumenUhr = setTimeout(() => { d.hidden = true; }, 800); return; }
  $('daumen-text').textContent = TEXTE[sprache].daumen[lesart];
  d.hidden = false; requestAnimationFrame(() => d.classList.toggle('weg', finger.size > 0));
}
function haltZeigen(x, y) { const h = $('halt'); h.style.left = (x + fotoRahmen.x) + 'px'; h.style.top = (y + fotoRahmen.y) + 'px'; h.classList.add('da'); }
function haltBild(dt) {
  if (finger.size && !finger.has('geist')) haltZeit += dt; else haltZeit = 0;
  const voll = lesart === 0 ? sum.ordnung : lesart === 2 ? kos.offen : Math.min(1, marken.length / 4);
  $('halt-voll').style.strokeDashoffset = String(1 - Math.min(1, voll));
  const gelungen = lesart === 0 ? haltZeit > 1.2 : lesart === 1 ? marken.length >= 2 : kos.offen > 0.3;
  if (!daumenGelernt[lesart] && gelungen) { daumenGelernt[lesart] = true; daumenZeigen(); }
}

// ---------- Geführter Einstieg: zuerst Bild und Finger, dann die Lesarten, dann die Regler, zuletzt die Tasten ----------
const EINSTIEG = 'ritornell.einstieg';
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
  if (fertig || Q.has('alles') || VORSPANN) { einstiegZeigen(3); return; }
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
$('loesen').addEventListener('click', allesLoesen);
$('ton').addEventListener('click', () => {
  klangStarten(); klangAn(!klangIstAn()); tonZeigen();
  try { localStorage.setItem('kristall.ton', klangIstAn() ? 'an' : 'aus'); } catch {}
});

let laeuft = false;
function starten() {
  einstiegBeginnen(); $('ton').hidden = false; tonZeigen();
  $('auftakt').hidden = true; $('kopf').hidden = false; $('regler').hidden = false;
  groesse();
  if (VORSPANN && geisterStart < 0) geisterStart = performance.now() / 1000 + 0.8;
  if (!laeuft && gl && P.szene) { laeuft = true; requestAnimationFrame(bild); }
  daumenZeigen();
}

// ---------- Schleife ----------
let standbildWunsch = false, ersterLauf = true, letzteMs = 0, bilderGezaehlt = 0;
const markU = new Float32Array(32), ringU = new Float32Array(48);
function bild(ms) {
  const t = ms / 1000;
  fahrtSehen(); if (quelle === fotoBuehne) fotoMalen(performance.now() / 1000);
  const dtMs = ms - (letzteMs || ms - 16.7), dt = Math.min(0.1, Math.max(0.004, dtMs / 1000)); letzteMs = ms;
  tempoMessen(ms, dtMs);
  if (!scharfFangen()) { requestAnimationFrame(bild); return; }
  const seite = fotoRahmen.b / fotoRahmen.h, W = WERTE[lesart];

  if (geisterStart > 0) geist(t);
  haende(t, dt);
  if (takt(t)) taktAusloesen(t);

  // 1. das Gedächtnis und das Milieu
  if (histLeer || (neuesBild && t - histZeit >= HIST_DT)) { histSchreiben(); histZeit = t; }
  const CH = ziele.chaos;
  if (nacht > 0.002) {
    const wucht = lesart === 0 ? 0.35 + 0.65 * WERTE[0][1] : lesart === 1 ? 0.75 : 0.6;
    rechne(P.chaos, CH, {}, (u) => { gl.uniform1f(u.uSeite, seite); gl.uniform1f(u.uT, t % 1000); gl.uniform1f(u.uWucht, wucht * (0.4 + 0.6 * nacht)); });
  }

  // 2. die Szene
  const sz = zielBauen('szene', leinwand.width, leinwand.height, false);
  const dpr = leinwand.height / fotoRahmen.h;
  let mn = 0; markU.fill(0);
  for (const m of marken) { markU.set([m.x, m.y, m.r || 0.02, m.glut], mn * 4); mn++; }
  let rn = 0; ringU.fill(0);
  const ringTempo = RING_TEMPO;
  for (const r of ringe) { const a = t - r.t0; ringU.set([r.x, r.y, 0.004 + a * ringTempo, r.a * Math.pow(Math.max(0, 1 - a / RING_DAUER), 2.0)], rn * 4); rn++; }
  const sumZone = sum.ordnung * (lesart === 0 ? 1 : 0);
  rechne(P.szene, sz, { uScharf: scharfTex, uChaos: CH }, (u) => {
    gl.uniform1f(u.uSeite, seite); gl.uniform1f(u.uT, t % 1000); gl.uniform1f(u.uHpx, sz.h); gl.uniform1f(u.uDpr, dpr); gl.uniform1f(u.uNacht, nacht); gl.uniform1f(u.uArt, lesart);
    gl.uniform4f(u.uZ, sum.x, sum.y, sum.R, sumZone); const kn = P.kornPunkt && halbFloat; gl.uniform1f(u.uKoerner, kn ? 1 : 0);
    gl.uniform1f(u.uSk, kn ? sum.saat[2] * 2 : 0.2); gl.uniform1f(u.uVer, kn ? 0.5 : 0);
    gl.uniform4f(u.uMode, sum.k1, sum.m1, sum.k2, sum.m2);
    const mixE = sum.mix * sum.mix * (3 - 2 * sum.mix);
    gl.uniform4f(u.uModeB, mixE, sum.rot1, sum.rot2, lesart === 0 ? (0.25 + 0.75 * sum.stimme) * (0.6 + 0.4 * Math.sin(t * 31)) : 0.55 + 0.45 * WERTE[1][2]);
    gl.uniform4f(u.uPuls, sum.puls, sum.pulsA * sum.stimme, 0.25 + 0.75 * WERTE[0][2], heimBild());
    gl.uniform4fv(u.uMark, markU); gl.uniform1i(u.uMarkN, mn);
    gl.uniform4fv(u.uRing, ringU); gl.uniform1i(u.uRingN, rn);
    gl.uniform4f(u.uRev, schlagGlut, revierDa, ringTempo, HIST_DT);
    gl.uniform4f(u.uKos, kos.x, kos.y, kos.R, kos.offen);
    gl.uniform4f(u.uKosB, kos.phi, 2 + Math.round(WERTE[2][0] * 5), WERTE[2][1], 0.2 + 1.8 * WERTE[2][2]);
    gl.uniform2f(u.uKosC, kos.zug, kos.dreh); gl.uniform1f(u.uGreif, kos.greif);
  });
  if (P.kornPunkt && halbFloat && lesart === 0 && (sumZone > 0.002 || sum.streuen)) sandRechnen(t, dt, sz, seite, dpr, sumZone);
  nachbearbeiten(t, sz);
  haltBild(dt);
  const stumm = finger.has('geist') && finger.size === 1 && VORSPANN;
  // Funken wie Sternspuren: ferne hohe Teiltöne, so dicht, wie Sterne am Himmel stehen
  if (lesart === 2 && kos.zug > 0.4 && Math.random() < dt * (0.25 + 2.2 * WERTE[2][2]) * kos.zug * (0.4 + kos.offen)) {
    klangFunke(49 * (16 + Math.floor(Math.random() * 17)), Math.random() * 1.6 - 0.8, 0.3 + 0.7 * Math.random());
  }
  klangBild({ summen: stumm ? 0 : sum.stimme * (lesart === 0 ? 1 : 0), nacht, ordnung: lesart === 0 ? sum.ordnung : lesart === 1 ? revierDa * 0.6 : kos.offen, kosmos: lesart === 2 ? kos.offen * kos.zug : 0, kreis: lesart === 2 ? kos.zug : 0,
    echoZeit: schrittDauer() * 3, echoMenge: lesart === 1 ? 0.15 + 0.55 * WERTE[1][2] : lesart === 0 ? 0.25 : 0.1, bewegung: bewegungHand });
  if (standbildWunsch) { standbildWunsch = false; leinwand.toBlob((b) => b && zeigen(b, 'ritornell-' + zeitstempel() + '.png')); }
  if (ersterLauf && bilderGezaehlt++ > 2) { ersterLauf = false; spur('✓ läuft'); }
  requestAnimationFrame(bild);
}
// der Sand: erst streuen (wenn der Daumen neu aufliegt), dann je Bild ein Schritt, dann die Körner als Punkte in die Szene
let kornA = null, kornB = null, versatz = [0, 0];
const heimBild = () => { const u = Math.min(1, Math.max(0, (sum.los - 0.9) / 1.3)); return sum.heim * u * u * (3 - 2 * u); };
function sandRechnen(t, dt, sz, seite, dpr, zone) {
  if (!kornA) { kornA = zielBauen('kornA', KORN_S, KORN_S); kornB = zielBauen('kornB', KORN_S, KORN_S); }
  const Rmax = (0.2 + 0.5 * WERTE[0][0]) * 1.02;
  const mixE = sum.mix * sum.mix * (3 - 2 * sum.mix);
  const schritt = (init, h = dt) => {
    rechne(P.korn, kornB, { uZustand: kornA }, (u) => {
      gl.uniform4f(u.uMode, sum.k1, sum.m1, sum.k2, sum.m2); gl.uniform4f(u.uModeB, mixE, sum.rot1, sum.rot2, 0);
      gl.uniform1f(u.uDt, Math.min(h, 1 / 30)); gl.uniform1f(u.uT, t % 1000); gl.uniform1f(u.uStimme, sum.stimme);
      gl.uniform1f(u.uSk, sum.saat[2] * 2); gl.uniform1f(u.uVer, 0.5); gl.uniform1f(u.uWurf, sum.wurf); gl.uniform1f(u.uInit, init ? 1 : 0); gl.uniform1f(u.uRmax, Rmax);
      gl.uniform2f(u.uVersatz, versatz[0], versatz[1]); versatz = [0, 0];
      gl.uniform1f(u.uHeim, sum.heim); gl.uniform2f(u.uHeimC, sum.saat[0] - sum.x, sum.saat[1] - sum.y); gl.uniform1f(u.uSaatR, sum.saat[2]);
    });
    [kornA, kornB] = [kornB, kornA];
  };
  if (sum.streuen) { schritt(true); sum.streuen = false; sum.saat = [sum.x, sum.y, Rmax]; sum.vx = sum.x; sum.vy = sum.y; }
  versatz = [sum.x - sum.vx, sum.y - sum.vy]; sum.vx = sum.x; sum.vy = sum.y;
  // bei langsamen Bildern in kleinen Schritten rechnen, damit der Sand gleich schnell wandert
  const n = Math.min(3, Math.ceil(dt / (1 / 40)));
  for (let i = 0; i < n; i++) schritt(false, dt / n);
  gl.bindFramebuffer(gl.FRAMEBUFFER, sz.fb); gl.viewport(0, 0, sz.b, sz.h);
  const pr = P.kornPunkt; gl.useProgram(pr);
  gl.activeTexture(gl.TEXTURE2); gl.bindTexture(gl.TEXTURE_2D, kornA.tex); gl.uniform1i(pr.u.uZustand, 2);
  gl.activeTexture(gl.TEXTURE3); gl.bindTexture(gl.TEXTURE_2D, scharfTex); gl.uniform1i(pr.u.uScharf, 3);
  gl.uniform1i(pr.u.uS, KORN_S); gl.uniform4f(pr.u.uZ, sum.x, sum.y, sum.R, zone); gl.uniform1f(pr.u.uR, sum.R + sum.heim * 2.0);
  gl.uniform4f(pr.u.uSaat, sum.saat[0], sum.saat[1], sum.saat[2], 0); gl.uniform1f(pr.u.uSeite, seite);
  const punkt = Math.max(1.6, 1.7 * dpr);
  gl.uniform1f(pr.u.uPunkt, punkt);
  // ein einzelnes Korn ist nur ein Schimmer, erst die Linie leuchtet; gleich hell bei jeder Kornzahl, Punktgrösse und Plattengrösse
  // Gestreut gibt der Sand das Bild wieder, so hell wie es war: Körner je Bildpunkt mal Fläche eines Korns ergibt eins.
  // Erst wenn er sich in den Linien sammelt, leuchtet er darüber hinaus.
  const dichte = (KORN_S * KORN_S) / (Math.PI * Rmax * Rmax * sz.h * sz.h);
  const flaeche = 1.12 * (punkt / 2) * (punkt / 2);
  gl.uniform1f(pr.u.uHell, Math.min(2.6, (0.42 + 0.5 * WERTE[0][2]) / (dichte * flaeche)) * (1 - 0.85 * heimBild()));
  gl.enable(gl.BLEND); gl.blendFunc(gl.ONE, gl.ONE);
  gl.disableVertexAttribArray(0);
  gl.drawArrays(gl.POINTS, 0, KORN_S * KORN_S);
  gl.enableVertexAttribArray(0);
  gl.disable(gl.BLEND);
}
function nachbearbeiten(t, sz) {
  const B = leinwand.width, H = leinwand.height, b4 = Math.max(1, Math.round(B / 4)), h4 = Math.max(1, Math.round(H / 4));
  const gA = zielBauen('glowA', b4, h4), gB = zielBauen('glowB', b4, h4);
  rechne(P.hell, gA, { uQ: sz }, (u) => { gl.uniform2f(u.uPx, 1.5 / B, 1.5 / H); gl.uniform1f(u.uAb, [0.62, 0.68, 0.5][lesart]); });
  rechne(P.weich, gB, { uQ: gA }, (u) => gl.uniform2f(u.uRichtung, 1.6 / b4, 0));
  rechne(P.weich, gA, { uQ: gB }, (u) => gl.uniform2f(u.uRichtung, 0, 1.6 / h4));
  rechne(P.zusammen, null, { uSzene: sz, uGlow: gA }, (u) => {
    gl.uniform2f(u.uPx, 1 / B, 1 / H); gl.uniform1f(u.uGlowStaerke, [0.3, 0.26, 0.42][lesart] * (0.4 + 0.6 * nacht));
    gl.uniform1f(u.uT, t % 100); gl.uniform1f(u.uKorn, 0.026 + 0.012 * nacht);
  });
}

// ---------- Ergebnis (wie in Figur und Fläche) ----------
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
  aufnehmer = new MediaRecorder(strom, typA ? { mimeType: typA, videoBitsPerSecond: telefon ? 8e6 : 16e6, audioBitsPerSecond: 160e3 } : undefined);
  aufnehmer.ondataavailable = (e) => e.data.size && teile.push(e.data);
  aufnehmer.onstop = async () => {
    clearInterval(uhrAnzeige);
    const sekunden = (performance.now() - aufnahmeStart) / 1000;
    const b = await aufnahmeDatei(teile, (aufnehmer.mimeType || 'video/webm').split(';')[0], sekunden);   // Länge in den Dateikopf
    aufnehmer = null; knopf.classList.remove('laeuft'); knopf.textContent = TEXTE[sprache].aufnahme;
    zeigen(b, 'ritornell-' + zeitstempel() + (b.type.includes('mp4') ? '.mp4' : '.webm'));
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
// Die Randfläche zeigt immer nur eines: den Titel einer Lesart oder eine Glosse. Was dazukommt, wartet, bis das Vorige
// hinausgefahren ist; nichts überdeckt etwas anderes, nichts verschwindet ungelesen hinter einer Glosse.
let glosseSchluessel = '', randJetzt = null, randUhr = 0, randWechsel = 0;
const randSchlange = [], glosseGezeigt = new Set();
const randDauer = (art) => (art === 'titel' ? 2600 : fotoRahmen.b <= 560 ? 5200 : 7000);
function randLeeren() { randSchlange.length = 0; }
function randZeigen(e, sofort) {
  if (VORSPANN) return;
  if (sofort) { randSchlange.unshift(e); if (randJetzt) randWeg(); else if (!randWechsel) randNaechstes(); return; }
  if (randSchlange.length >= 3) randSchlange.splice(1, 1);
  randSchlange.push(e);
  if (!randJetzt && !randWechsel) randNaechstes();
}
function randNaechstes() {
  randWechsel = 0;
  let e;
  while ((e = randSchlange.shift())) { if (e.lesart === lesart && !(e.art === 'glosse' && glosseGezeigt.has(e.k) && !e.wieder)) break; }
  if (!e) { randJetzt = null; return; }
  randJetzt = e;
  if (e.art === 'titel') {
    const g = $('geste'); g.textContent = e.text; g.hidden = false;
    requestAnimationFrame(() => requestAnimationFrame(() => g.classList.remove('weg')));
  } else {
    const g = TEXTE[sprache].glossen[e.k]; glosseGezeigt.add(e.k); glosseSchluessel = e.k;
    $('glosse-begriff').textContent = g.begriff;
    $('glosse-satz').textContent = g.satz;
    $('glosse-zitat').textContent = g.zitat; $('glosse-zitat').hidden = !g.zitat;
    $('glosse-quelle').textContent = g.quelle; $('glosse-quelle').hidden = !g.quelle;
    const el = $('glosse'); el.hidden = false; requestAnimationFrame(() => requestAnimationFrame(() => el.classList.add('da')));
  }
  clearTimeout(randUhr); randUhr = setTimeout(randWeg, randDauer(e.art));
}
// hinausfahren lassen, dann das Nächste
function randWeg() {
  clearTimeout(randUhr);
  if (!randJetzt) return;
  if (randJetzt.art === 'titel') $('geste').classList.add('weg'); else $('glosse').classList.remove('da');
  randJetzt = null;
  clearTimeout(randWechsel); randWechsel = setTimeout(() => { if (!$('glosse').classList.contains('da')) $('glosse').hidden = true; randNaechstes(); }, 650);
}
function glosse(k, sofort) {
  if (VORSPANN || !TEXTE[sprache].glossen[k]) return;
  if (!sofort && glosseGezeigt.has(k)) return;
  if (randJetzt && randJetzt.k === k) { clearTimeout(randUhr); randUhr = setTimeout(randWeg, randDauer('glosse')); return; }
  if (randSchlange.some((e) => e.k === k)) return;
  randZeigen({ art: 'glosse', k, lesart, wieder: !!sofort }, sofort);
}
const glosseWeg = randWeg;
// Regler: die Glosse zum Regler kommt sofort, auch ein zweites Mal, und bleibt, solange man schiebt
regler.forEach((id, k) => {
  const g = () => TEXTE[sprache].reglerGlosse[lesart][k];
  $(id).addEventListener('pointerdown', () => glosse(g(), !glosseGezeigt.has(g())));
  $(id).addEventListener('input', () => { if (!randJetzt || randJetzt.k !== g()) glosse(g(), true); else { clearTimeout(randUhr); randUhr = setTimeout(randWeg, randDauer('glosse')); } });
});
$('glosse').addEventListener('click', () => { randWeg(); $('begriff').hidden = false; });

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
    return 'Ritornell ' + (document.querySelector('script[src*="ritornell.js"]')?.getAttribute('src') || '') + '\n' + navigator.userAgent + '\nGrafik: ' + (grafikName || '?') +
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

// Einstieg: «Summen»
lesartWaehlen(0, true);
uebersetzen();
// Direktstart für Tests und Vorführungen: ?beispiel, ?lesart=0|1|2
if (Q.has('lesart')) lesartWaehlen(Math.max(0, Math.min(2, +Q.get('lesart') || 0)), true);
if (Q.has('beispiel')) beispielStarten();
// für Prüfungen: Werte setzen, Finger von aussen führen
window.__ritornell = { WERTE, finger, fingerNeu, lesartWaehlen, markeSetzen, marken: () => marken, sum, kos, allesLoesen, zustand: () => ({ nacht, schritt, durchgang }) };
