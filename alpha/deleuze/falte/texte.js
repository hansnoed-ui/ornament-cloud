// Texte der Falte, DE/EN/FR. Die Stellen aus «Le Pli» sind in eigenen Worten wiedergegeben («sinngemäss»), bis sie am Buch
// geprüft sind. Wörtlich stehen nur zwei Stellen aus Leibniz’ Monadologie (1714, Wikisource, Ausgabe Bertrand 1886, geprüft 21.11.2026).
const PL = { de: 'Deleuze, Le Pli, 1988', en: 'Deleuze, The Fold, 1988', fr: 'Deleuze, Le Pli, 1988' };
const SG = { de: ', sinngemäss', en: ', paraphrased', fr: ', en substance' };
const q = (s, k) => PL[s] + (k ? ', ' + k : '') + SG[s];
const M7 = '«Les Monades n’ont point de fenêtres, par lesquelles quelque chose y puisse entrer ou sortir.»';
const M60 = '«… ne peut être distincte que dans une petite partie des choses»';

export const TEXTE = {
  de: {
    titel: 'Falte', satz: 'Aus unzähligen kleinen Wahrnehmungen, die keiner bemerkt, tritt eine Gestalt hervor. Die Materie faltet sich, und jede Falte birgt eine weitere.',
    kamera: 'Kamera', video: 'Video oder Fotos', beispiel: 'Beispiel', lesart: 'Lesart',
    glossen: {
      baroque: { begriff: 'le pli', satz: 'Der Barock ist keine Epoche und kein Stil, sondern eine Operation: Er hört nicht auf, Falten zu machen, und treibt sie ins Unendliche, Falte auf Falte.', zitat: '', quelle: q('de', 'Kap. 1') },
      petites: { begriff: 'les petites perceptions', satz: 'Wir nehmen ständig unzählige winzige Dinge wahr, ohne sie zu bemerken. Einzeln bleiben sie unter der Schwelle, zusammen sind sie das dunkle Rauschen der Welt in uns.', zitat: '', quelle: q('de', 'Kap. 7') },
      mer: { begriff: 'le bruit de la mer', satz: 'Leibniz am Ufer: Wer das Rauschen des Meeres hört, hört auch jede einzelne Welle, nur nicht für sich, sondern im verworrenen Ganzen.', zitat: '', quelle: 'G. W. Leibniz, Nouveaux essais, Vorrede, sinngemäss' },
      seuil: { begriff: 'le seuil', satz: 'Eine Wahrnehmung wird bewusst, wenn die kleinen Wahrnehmungen so zueinander stehen, dass eine Schwelle überschritten wird. Deleuze nennt sie die Differentiale des Bewusstseins.', zitat: '', quelle: q('de', 'Kap. 7') },
      region: { begriff: 'la zone claire', satz: 'Jede Monade drückt die ganze Welt aus, aber klar nur einen kleinen Bezirk; der Rest bleibt dunkel. Hier, wie gross der klare Bezirk wird.', zitat: M60, quelle: 'G. W. Leibniz, Monadologie, § 60, 1714' },
      vagues: { begriff: 'les vagues', satz: 'Wie stark das Meer der kleinen Wahrnehmungen wogt.', zitat: '', quelle: '' },
      fenetres: { begriff: 'sans fenêtres', satz: 'Die Monade hat keine Fenster, nichts tritt von aussen ein. Die Welt ist in ihr gefaltet, und Wahrnehmen heisst, sie aus sich zu entfalten.', zitat: M7, quelle: 'G. W. Leibniz, Monadologie, § 7, 1714' },
      matiere: { begriff: 'les plis de la matière', satz: 'Die Materie besteht nicht aus Körnchen wie Kies, sondern ist wie ein Tuch, das sich faltet: ein Labyrinth des Stetigen, in jedem Teil wieder gefaltet.', zitat: '', quelle: q('de', 'Kap. 1') },
      draperie: { begriff: 'la draperie', satz: 'Im Barock macht sich die Falte vom Körper frei. Bei Bernini wirft der Stoff Falten, die keinem Körper mehr folgen, sondern einer Kraft, die von anderswo kommt.', zitat: '', quelle: q('de', 'Kap. 3') },
      infini: { begriff: 'pli selon pli', satz: 'Jede Falte trägt feinere in sich, bis ins Kleinste. Es gibt kein letztes Teilchen, nur immer kleinere Falten.', zitat: '', quelle: q('de', 'Kap. 1') },
      poids: { begriff: 'la pesanteur', satz: 'Wie schwer das Tuch ist: Schwerer Stoff haftet am Tisch und fällt in grosse, runde Falten.', zitat: '', quelle: '' },
      plis: { begriff: 'pli sur pli', satz: 'Wie viele Falten das Tuch wirft.', zitat: '', quelle: '' },
      lumiere: { begriff: 'le clair-obscur', satz: 'Samt oder Seide: wie das Licht auf den Falten liegt. Im Barock treten die Dinge aus einem dunklen Grund hervor.', zitat: '', quelle: q('de', 'Kap. 3') },
      pliage: { begriff: 'le pliage', satz: 'Simon Hantaï faltet die rohe Leinwand, bemalt, was aussen liegt, und faltet sie wieder auf. Das Bild entsteht aus dem, was die Falte verbarg.', zitat: '', quelle: q('de', 'Kap. 3, zu Hantaï') },
      deplier: { begriff: 'déplier', satz: 'Entfalten ist nicht das Gegenteil von Falten. Es folgt der Falte bis zur nächsten.', zitat: '', quelle: q('de', 'Kap. 3') },
      couleur: { begriff: 'la couleur', satz: 'Womit gemalt wird: mit dem Bild selbst oder mit einer einzigen Farbe, in jeder Runde einer anderen.', zitat: '', quelle: '' },
      couche: { begriff: 'la couche', satz: 'Wie deckend die Farbe ist: dünn wie eine Lasur oder satt.', zitat: '', quelle: '' },
      trace: { begriff: 'la pliure', satz: 'Wie deutlich die Falze stehen bleiben, wenn die Leinwand wieder offen liegt.', zitat: '', quelle: '' }
    },
    regler: [['Meer', 'Schwelle', 'Bezirk'], ['Gewicht', 'Falten', 'Glanz'], ['Farbe', 'Deckung', 'Falz']],
    reglerGlosse: [['vagues', 'seuil', 'region'], ['poids', 'plis', 'lumiere'], ['couleur', 'couche', 'trace']],
    lesarten: [
      { kurz: 'Rauschen', titel: 'Kleine Wahrnehmungen', wer: 'Leibniz, Deleuze', geste: 'Den Daumen auflegen und halten.', text: 'Leibniz steht am Ufer und hört das Meer. Das Rauschen besteht aus dem Geräusch jeder einzelnen Welle, und doch hört niemand eine Welle für sich. So nehmen wir ständig unzählige kleine Dinge wahr, ohne sie zu bemerken. Erst wenn sie so zueinander stehen, dass eine Schwelle überschritten wird, tritt eine bewusste Wahrnehmung hervor. Deleuze nennt die kleinen Wahrnehmungen die Differentiale des Bewusstseins. Hier zerfällt das Bild bei der Berührung in ein Meer aus Körnchen, jedes trägt die Farbe einer Stelle, keines zeigt etwas. Hältst du den Daumen, verdichten sie sich um ihn, und an der Schwelle springt die Gestalt hervor, klar nur in einem kleinen Bezirk, wie in der Monade, die die ganze Welt enthält und nur einen Teil davon deutlich. Der Ton geht denselben Weg: aus dem Rauschen wird ein Klang.' },
      { kurz: 'Draperie', titel: 'Falten der Materie', wer: 'Deleuze, Bernini', geste: 'Das Bild greifen und ziehen.', text: 'Für Leibniz und Deleuze ist die Materie kein Haufen harter Körnchen, sondern ein Gewebe, das sich faltet, und jede Falte enthält feinere, bis ins Unendliche. Im Barock macht sich die Falte vom Körper frei: Bei Bernini und El Greco werfen die Gewänder Falten, die keiner Gestalt mehr folgen, sondern einer Kraft. Hier liegt dein Bild als schweres Tuch auf einem dunklen Tisch. Greif es und zieh: Der Tisch hält den Stoff fest, er staucht sich vor deiner Hand und spannt sich hinter ihr, und weil er nicht kürzer werden kann, weicht er nach oben aus. So entstehen die Falten von selbst, keine gleicht der anderen, mit Glanz auf den Graten, Schatten auf dem Tisch und tiefem Dunkel in den Tälern. Lässt du los, fällt der Stoff zurück und bleibt, wie er liegt. Jeder neue Griff faltet das Gefaltete weiter. Mit zwei Fingern greifst du an zwei Stellen.' },
      { kurz: 'Entfalten', titel: 'Pliage', wer: 'Deleuze, Hantaï', geste: 'Über das Bild ziehen: es faltet sich.', text: 'Simon Hantaï malt seit 1960 mit der Falte: Er faltet und knüllt die rohe Leinwand, bemalt, was aussen liegt, und faltet sie wieder auf. Das Bild entsteht aus dem, was die Falte verborgen hat, als Muster aus Farbe und weisser Leinwand. Deleuze nimmt diese Arbeit in «Le Pli» auf, und er sagt: Entfalten ist nicht das Gegenteil von Falten, es folgt der Falte bis zur nächsten. Hier ist dein Bild ein Blatt. Zieh über das Bild, und es faltet sich dort, wo du ziehst, bis zu fünfmal übereinander. Wartest du, läuft die Farbe über das gefaltete Paket. Dann hebt sich Klappe um Klappe in den Raum, und es bleibt, was aussen lag. Faltest du wieder, giesst sich die nächste Farbe darüber: Blau, Rot, Sepia, wie bei Hantaï, der dieselbe Leinwand mehrmals faltete.' }
    ],
    wenden: 'Kamera wenden', tonAn: 'Ton an', tonAus: 'Ton aus', loesen: 'Alles lösen',
    begriff: 'Begriff', standbild: 'Standbild', aufnahme: 'Aufnahme', stopp: 'Stopp',
    teilen: 'Teilen', sichern: 'Sichern', komma: '.', 'ergebnis-hinweis': 'Gesichert im Ordner «Downloads». «Teilen» legt es direkt in die Galerie oder eine App.',
    keineAufnahme: 'Dieser Browser kann die Leinwand nicht aufnehmen. Das Standbild geht.',
    daumen: ['Daumen auflegen und halten', 'Greifen und ziehen', 'Über das Bild ziehen'],
    familie: 'Materie · Le Pli, 1988', 'b-titel': 'Falte',
    'b-text': [
      'In «Le Pli. Leibniz et le baroque» (1988) liest Deleuze Leibniz als Philosophen der Falte. Der Barock ist für ihn keine Epoche, sondern eine Operation, die nicht aufhört, Falten zu machen: in der Materie, im Stoff, im Marmor, in der Musik, und in der Seele.',
      'Zwei Stockwerke: Unten die Materie, gefaltet bis ins Unendliche, ein Gewebe ohne letzte Teilchen. Oben die Seele, die Monade ohne Fenster, in der die ganze Welt gefaltet liegt. Sie nimmt alles wahr, aber verworren, als Rauschen unzähliger kleiner Wahrnehmungen, und klar nur einen kleinen Bezirk.',
      'Hier tritt aus dem Rauschen eine Gestalt hervor, dein Bild fällt in Falten wie ein schweres Tuch, und es wird gefaltet, bemalt und wieder geöffnet wie die Leinwände von Simon Hantaï.'
    ],
    'b-frage': 'Was nimmst du gerade wahr, ohne es zu bemerken? Und was zeigt sich erst, wenn man es faltet?',
    'b-quelle': 'Gilles Deleuze, Le Pli. Leibniz et le baroque, Paris: Minuit 1988. Deutsch: Die Falte. Leibniz und der Barock, Frankfurt am Main: Suhrkamp 1995. G. W. Leibniz, Monadologie, 1714; Nouveaux essais sur l’entendement humain, 1704. Die Stellen aus «Le Pli» und den «Nouveaux essais» sind hier sinngemäss wiedergegeben; wörtlich sind nur die beiden Stellen aus der Monadologie.',
    keineKamera: 'Die Kamera lässt sich nicht öffnen. Wähle ein Video, Fotos oder das Beispiel.',
    keinGL: 'Dieses Gerät kann WebGL 2 nicht anzeigen. Die Falte braucht es.',
    kontextWeg: 'Die Grafik ist ausgestiegen. Bitte die Seite neu laden.'
  },
  en: {
    titel: 'Fold', satz: 'Out of countless small perceptions that no one notices, a form emerges. Matter folds, and every fold holds another.',
    kamera: 'Camera', video: 'Video or photos', beispiel: 'Example', lesart: 'Reading',
    glossen: {
      baroque: { begriff: 'le pli', satz: 'The Baroque is not an era or a style but an operation: it never stops making folds, and pushes them to infinity, fold upon fold.', zitat: '', quelle: q('en', 'ch. 1') },
      petites: { begriff: 'les petites perceptions', satz: 'We constantly perceive countless tiny things without noticing them. Alone they stay below the threshold; together they are the dark murmur of the world within us.', zitat: '', quelle: q('en', 'ch. 7') },
      mer: { begriff: 'le bruit de la mer', satz: 'Leibniz on the shore: whoever hears the roar of the sea also hears each single wave, only not by itself, but within the confused whole.', zitat: '', quelle: 'G. W. Leibniz, New Essays, preface, paraphrased' },
      seuil: { begriff: 'le seuil', satz: 'A perception becomes conscious when the small perceptions stand in such a relation that a threshold is crossed. Deleuze calls them the differentials of consciousness.', zitat: '', quelle: q('en', 'ch. 7') },
      region: { begriff: 'la zone claire', satz: 'Every monad expresses the whole world, but clearly only a small region; the rest stays dark. Here, how large the clear region becomes.', zitat: M60, quelle: 'G. W. Leibniz, Monadology, § 60, 1714' },
      vagues: { begriff: 'les vagues', satz: 'How strongly the sea of small perceptions surges.', zitat: '', quelle: '' },
      fenetres: { begriff: 'sans fenêtres', satz: 'The monad has no windows; nothing enters from outside. The world is folded within it, and to perceive is to unfold it from oneself.', zitat: M7, quelle: 'G. W. Leibniz, Monadology, § 7, 1714' },
      matiere: { begriff: 'les plis de la matière', satz: 'Matter is not made of grains like gravel but is like a cloth that folds: a labyrinth of the continuous, folded again in every part.', zitat: '', quelle: q('en', 'ch. 1') },
      draperie: { begriff: 'la draperie', satz: 'In the Baroque the fold frees itself from the body. In Bernini the fabric throws folds that no longer follow a body but a force coming from elsewhere.', zitat: '', quelle: q('en', 'ch. 3') },
      infini: { begriff: 'pli selon pli', satz: 'Every fold holds finer ones, down to the smallest. There is no last particle, only ever smaller folds.', zitat: '', quelle: q('en', 'ch. 1') },
      poids: { begriff: 'la pesanteur', satz: 'How heavy the cloth is: heavy fabric clings to the table and falls into large, round folds.', zitat: '', quelle: '' },
      plis: { begriff: 'pli sur pli', satz: 'How many folds the cloth throws.', zitat: '', quelle: '' },
      lumiere: { begriff: 'le clair-obscur', satz: 'Velvet or silk: how the light lies on the folds. In the Baroque things emerge from a dark ground.', zitat: '', quelle: q('en', 'ch. 3') },
      pliage: { begriff: 'le pliage', satz: 'Simon Hantaï folds the raw canvas, paints what lies outside and unfolds it again. The picture arises from what the fold concealed.', zitat: '', quelle: q('en', 'ch. 3, on Hantaï') },
      deplier: { begriff: 'déplier', satz: 'Unfolding is not the opposite of folding. It follows the fold up to the next one.', zitat: '', quelle: q('en', 'ch. 3') },
      couleur: { begriff: 'la couleur', satz: 'What it is painted with: the image itself, or a single colour, a different one each round.', zitat: '', quelle: '' },
      couche: { begriff: 'la couche', satz: 'How opaque the paint is: thin as a glaze, or full.', zitat: '', quelle: '' },
      trace: { begriff: 'la pliure', satz: 'How clearly the creases remain when the canvas lies open again.', zitat: '', quelle: '' }
    },
    regler: [['Sea', 'Threshold', 'Region'], ['Weight', 'Folds', 'Sheen'], ['Colour', 'Cover', 'Crease']],
    reglerGlosse: [['vagues', 'seuil', 'region'], ['poids', 'plis', 'lumiere'], ['couleur', 'couche', 'trace']],
    lesarten: [
      { kurz: 'Murmur', titel: 'Small perceptions', wer: 'Leibniz, Deleuze', geste: 'Rest your thumb and hold.', text: 'Leibniz stands on the shore and hears the sea. The roar is made of the sound of each single wave, and yet no one hears a wave by itself. In the same way we constantly perceive countless small things without noticing them. Only when they stand in such a relation that a threshold is crossed does a conscious perception emerge. Deleuze calls the small perceptions the differentials of consciousness. Here, when you touch, the image falls apart into a sea of grains; each carries the colour of one spot, none shows anything. Hold your thumb and they gather around it, and at the threshold the form leaps out, clear only in a small region, as in the monad that contains the whole world and only a part of it distinctly. The sound takes the same path: out of the murmur comes a tone.' },
      { kurz: 'Drapery', titel: 'Folds of matter', wer: 'Deleuze, Bernini', geste: 'Grab the image and pull.', text: 'For Leibniz and Deleuze matter is not a heap of hard grains but a fabric that folds, and every fold contains finer ones, to infinity. In the Baroque the fold frees itself from the body: in Bernini and El Greco the garments throw folds that no longer follow a figure but a force. Here your image lies as a heavy cloth on a dark table. Grab it and pull: the table holds the fabric, it bunches up in front of your hand and stretches behind it, and since it cannot get shorter, it gives way upwards. So the folds arise by themselves, no two alike, with sheen on the ridges, shadows on the table and deep dark in the valleys. Let go and the fabric falls back and stays as it lies. Every new grip folds the folded further. With two fingers you grab in two places.' },
      { kurz: 'Unfold', titel: 'Pliage', wer: 'Deleuze, Hantaï', geste: 'Drag across the image: it folds.', text: 'Since 1960 Simon Hantaï has painted with the fold: he folds and crumples the raw canvas, paints what lies outside, and unfolds it again. The picture arises from what the fold concealed, as a pattern of colour and white canvas. Deleuze takes up this work in “The Fold”, and he says: unfolding is not the opposite of folding, it follows the fold up to the next one. Here your image is a sheet. Drag across it and it folds where you drag, up to five times over. If you wait, the paint runs over the folded packet. Then flap after flap lifts into space, and what remains is what lay outside. Fold again and the next colour pours over it: blue, red, sepia, as with Hantaï, who folded the same canvas several times.' }
    ],
    wenden: 'Flip camera', tonAn: 'Sound on', tonAus: 'Sound off', loesen: 'Release all',
    begriff: 'Concept', standbild: 'Still', aufnahme: 'Record', stopp: 'Stop',
    teilen: 'Share', sichern: 'Save', komma: '.', 'ergebnis-hinweis': 'Saved to your “Downloads” folder. “Share” sends it straight to your gallery or an app.',
    keineAufnahme: 'This browser cannot record the canvas. Stills work.',
    daumen: ['Rest your thumb and hold', 'Grab and pull', 'Drag across the image'],
    familie: 'Matter · The Fold, 1988', 'b-titel': 'Fold',
    'b-text': [
      'In “The Fold: Leibniz and the Baroque” (1988) Deleuze reads Leibniz as the philosopher of the fold. For him the Baroque is not an era but an operation that never stops making folds: in matter, in fabric, in marble, in music, and in the soul.',
      'Two floors: below, matter, folded to infinity, a fabric without last particles. Above, the soul, the monad without windows, in which the whole world lies folded. It perceives everything, but confusedly, as the murmur of countless small perceptions, and clearly only a small region.',
      'Here a form emerges from the murmur, your image falls into folds like a heavy cloth, and it is folded, painted and opened again like the canvases of Simon Hantaï.'
    ],
    'b-frage': 'What are you perceiving right now without noticing it? And what only shows itself once it is folded?',
    'b-quelle': 'Gilles Deleuze, Le Pli. Leibniz et le baroque, Paris: Minuit 1988. English: The Fold: Leibniz and the Baroque, tr. Tom Conley, University of Minnesota Press 1993. G. W. Leibniz, Monadology, 1714; New Essays on Human Understanding, 1704. Passages from The Fold and the New Essays are paraphrased here; only the two passages from the Monadology are quoted verbatim.',
    keineKamera: 'The camera cannot be opened. Choose a video, photos or the example.',
    keinGL: 'This device cannot show WebGL 2, which this page needs.',
    kontextWeg: 'The graphics stopped. Please reload the page.'
  },
  fr: {
    titel: 'Le pli', satz: 'D’innombrables petites perceptions que nul ne remarque, une forme surgit. La matière se plie, et chaque pli en contient un autre.',
    kamera: 'Caméra', video: 'Vidéo ou photos', beispiel: 'Exemple', lesart: 'Lecture',
    glossen: {
      baroque: { begriff: 'le pli', satz: 'Le Baroque n’est ni une époque ni un style, mais une opération : il ne cesse de faire des plis, et les pousse à l’infini, pli sur pli.', zitat: '', quelle: q('fr', 'chap. 1') },
      petites: { begriff: 'les petites perceptions', satz: 'Nous percevons sans cesse d’innombrables choses minuscules sans les remarquer. Seules, elles restent sous le seuil ; ensemble, elles sont la rumeur obscure du monde en nous.', zitat: '', quelle: q('fr', 'chap. 7') },
      mer: { begriff: 'le bruit de la mer', satz: 'Leibniz au rivage : qui entend le bruit de la mer entend aussi chaque vague, non pas pour elle-même, mais dans le tout confus.', zitat: '', quelle: 'G. W. Leibniz, Nouveaux essais, préface, en substance' },
      seuil: { begriff: 'le seuil', satz: 'Une perception devient consciente quand les petites perceptions entrent dans un rapport tel qu’un seuil est franchi. Deleuze les appelle les différentielles de la conscience.', zitat: '', quelle: q('fr', 'chap. 7') },
      region: { begriff: 'la zone claire', satz: 'Chaque monade exprime le monde entier, mais clairement une petite région seulement ; le reste demeure obscur. Ici, quelle étendue prend la région claire.', zitat: M60, quelle: 'G. W. Leibniz, Monadologie, § 60, 1714' },
      vagues: { begriff: 'les vagues', satz: 'Avec quelle force ondule la mer des petites perceptions.', zitat: '', quelle: '' },
      fenetres: { begriff: 'sans fenêtres', satz: 'La monade n’a pas de fenêtres, rien n’entre du dehors. Le monde est plié en elle, et percevoir, c’est le déplier à partir de soi.', zitat: M7, quelle: 'G. W. Leibniz, Monadologie, § 7, 1714' },
      matiere: { begriff: 'les plis de la matière', satz: 'La matière n’est pas faite de grains comme du gravier, elle est comme une étoffe qui se plie : un labyrinthe du continu, replié en chacune de ses parties.', zitat: '', quelle: q('fr', 'chap. 1') },
      draperie: { begriff: 'la draperie', satz: 'Au Baroque, le pli s’affranchit du corps. Chez le Bernin, l’étoffe fait des plis qui ne suivent plus un corps, mais une force venue d’ailleurs.', zitat: '', quelle: q('fr', 'chap. 3') },
      infini: { begriff: 'pli selon pli', satz: 'Chaque pli en porte de plus fins, jusqu’au plus petit. Il n’y a pas de dernière particule, seulement des plis toujours plus petits.', zitat: '', quelle: q('fr', 'chap. 1') },
      poids: { begriff: 'la pesanteur', satz: 'Le poids de l’étoffe : un tissu lourd adhère à la table et tombe en grands plis ronds.', zitat: '', quelle: '' },
      plis: { begriff: 'pli sur pli', satz: 'Combien de plis fait l’étoffe.', zitat: '', quelle: '' },
      lumiere: { begriff: 'le clair-obscur', satz: 'Velours ou soie : comment la lumière se pose sur les plis. Au Baroque, les choses surgissent d’un fond sombre.', zitat: '', quelle: q('fr', 'chap. 3') },
      pliage: { begriff: 'le pliage', satz: 'Simon Hantaï plie la toile brute, peint ce qui est dehors, puis la déplie. Le tableau naît de ce que le pli cachait.', zitat: '', quelle: q('fr', 'chap. 3, sur Hantaï') },
      deplier: { begriff: 'déplier', satz: 'Déplier n’est pas le contraire de plier. C’est suivre le pli jusqu’à un autre pli.', zitat: '', quelle: q('fr', 'chap. 3') },
      couleur: { begriff: 'la couleur', satz: 'Avec quoi l’on peint : avec l’image elle-même, ou avec une seule couleur, une autre à chaque tour.', zitat: '', quelle: '' },
      couche: { begriff: 'la couche', satz: 'À quel point la couleur couvre : mince comme un glacis, ou pleine.', zitat: '', quelle: '' },
      trace: { begriff: 'la pliure', satz: 'Avec quelle netteté les pliures restent quand la toile est de nouveau ouverte.', zitat: '', quelle: '' }
    },
    regler: [['Mer', 'Seuil', 'Région'], ['Poids', 'Plis', 'Lustre'], ['Couleur', 'Couche', 'Pliure']],
    reglerGlosse: [['vagues', 'seuil', 'region'], ['poids', 'plis', 'lumiere'], ['couleur', 'couche', 'trace']],
    lesarten: [
      { kurz: 'Rumeur', titel: 'Petites perceptions', wer: 'Leibniz, Deleuze', geste: 'Pose le pouce et tiens.', text: 'Leibniz se tient au rivage et entend la mer. Le bruit est fait du bruit de chaque vague, et pourtant personne n’entend une vague pour elle-même. De même nous percevons sans cesse d’innombrables petites choses sans les remarquer. C’est seulement quand elles entrent dans un rapport tel qu’un seuil est franchi qu’une perception consciente surgit. Deleuze appelle les petites perceptions les différentielles de la conscience. Ici, quand tu touches, l’image se défait en une mer de grains ; chacun porte la couleur d’un endroit, aucun ne montre rien. Tiens le pouce, ils se rassemblent autour de lui, et au seuil la forme surgit, claire seulement dans une petite région, comme dans la monade qui contient le monde entier et n’en perçoit distinctement qu’une partie. Le son suit le même chemin : de la rumeur naît un son.' },
      { kurz: 'Draperie', titel: 'Les plis de la matière', wer: 'Deleuze, le Bernin', geste: 'Saisis l’image et tire.', text: 'Pour Leibniz et pour Deleuze, la matière n’est pas un tas de grains durs, mais un tissu qui se plie, et chaque pli en contient de plus fins, à l’infini. Au Baroque, le pli s’affranchit du corps : chez le Bernin et le Greco, les vêtements font des plis qui ne suivent plus une figure, mais une force. Ici ton image est posée comme une étoffe lourde sur une table sombre. Saisis-la et tire : la table retient l’étoffe, elle se tasse devant ta main et se tend derrière elle, et comme elle ne peut pas raccourcir, elle cède vers le haut. Ainsi les plis naissent d’eux-mêmes, aucun pareil à l’autre, avec du lustre sur les crêtes, des ombres sur la table et un noir profond dans les creux. Lâche, l’étoffe retombe et reste comme elle est. Chaque nouvelle prise plie davantage le plié. À deux doigts, tu saisis en deux endroits.' },
      { kurz: 'Déplier', titel: 'Pliage', wer: 'Deleuze, Hantaï', geste: 'Glisse sur l’image : elle se plie.', text: 'Depuis 1960, Simon Hantaï peint avec le pli : il plie et froisse la toile brute, peint ce qui est dehors, puis la déplie. Le tableau naît de ce que le pli a caché, comme un motif de couleur et de toile blanche. Deleuze reprend ce travail dans « Le Pli », et il dit : déplier n’est pas le contraire de plier, c’est suivre le pli jusqu’à un autre pli. Ici ton image est une feuille. Glisse sur l’image, elle se plie là où tu glisses, jusqu’à cinq fois. Si tu attends, la couleur coule sur le paquet plié. Puis les rabats se lèvent l’un après l’autre dans l’espace, et il reste ce qui était dehors. Plie encore, et la couleur suivante se verse : bleu, rouge, sépia, comme chez Hantaï, qui pliait plusieurs fois la même toile.' }
    ],
    wenden: 'Retourner', tonAn: 'Son activé', tonAus: 'Son coupé', loesen: 'Tout défaire',
    begriff: 'Concept', standbild: 'Image', aufnahme: 'Enregistrer', stopp: 'Arrêter',
    teilen: 'Partager', sichern: 'Télécharger', komma: ',', 'ergebnis-hinweis': 'Enregistré dans le dossier « Téléchargements ». « Partager » l’envoie directement dans la galerie ou une app.',
    keineAufnahme: 'Ce navigateur ne peut pas enregistrer le canevas. L’image fixe fonctionne.',
    daumen: ['Pose le pouce et tiens', 'Saisis et tire', 'Glisse sur l’image'],
    familie: 'Matière · Le Pli, 1988', 'b-titel': 'Le pli',
    'b-text': [
      'Dans « Le Pli. Leibniz et le baroque » (1988), Deleuze lit Leibniz comme le philosophe du pli. Le Baroque n’est pas pour lui une époque, mais une opération qui ne cesse de faire des plis : dans la matière, dans l’étoffe, dans le marbre, dans la musique, et dans l’âme.',
      'Deux étages : en bas, la matière, pliée à l’infini, un tissu sans dernières particules. En haut, l’âme, la monade sans fenêtres, où le monde entier est plié. Elle perçoit tout, mais confusément, comme la rumeur d’innombrables petites perceptions, et clairement une petite région seulement.',
      'Ici une forme surgit de la rumeur, ton image tombe en plis comme une lourde étoffe, et elle est pliée, peinte et dépliée comme les toiles de Simon Hantaï.'
    ],
    'b-frage': 'Que perçois-tu en ce moment sans le remarquer ? Et qu’est-ce qui ne se montre qu’une fois plié ?',
    'b-quelle': 'Gilles Deleuze, Le Pli. Leibniz et le baroque, Paris : Minuit 1988. G. W. Leibniz, Monadologie, 1714 ; Nouveaux essais sur l’entendement humain, 1704. Les passages du Pli et des Nouveaux essais sont ici rendus en substance ; seuls les deux passages de la Monadologie sont cités mot pour mot.',
    keineKamera: 'La caméra ne s’ouvre pas. Choisis une vidéo, des photos ou l’exemple.',
    keinGL: 'Cet appareil ne peut pas afficher WebGL 2, nécessaire ici.',
    kontextWeg: 'Le graphisme s’est arrêté. Recharge la page.'
  }
};
