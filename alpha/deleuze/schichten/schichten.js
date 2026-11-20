// Schichten der Zeit – Operator II von the deleuzian scheme (Cinéma 2, Kapitel 5: «Pointes de présent et nappes de passé»)
// Das Bild als Gelände aus Zeit: Wo gegraben wird, liegt eine ältere Schicht frei; in den Wänden alle Zeiten dazwischen.
// Drei Lesarten: Kegel (Bergson), Grabung (Welles), Überschiebung (Resnais). WebGL2, ohne Bibliotheken, ohne CDN.
// Aufbau, Quellen, Aufnahme, Glossen und Einstieg wie im Kristallbild (../kristall/kristall.js).

import { klangStarten, klangBild, klangAn, klangIstAn, klangSpur, klangGraben, klangSchwelle, klangRing, klangSprung } from './klang.js?v=1';
import { aufnahmeDatei } from '../gemeinsam/aufnahme.js?v=1';

const $ = (id) => document.getElementById(id);

// ---------- Sprache ----------
const TEXTE = {
  de: {
    titel: 'Schichten der Zeit', satz: 'Die Vergangenheit liegt in Schichten, und man springt hinein.',
    kamera: 'Kamera', video: 'Video oder Fotos', beispiel: 'Beispiel',
    tiefe: 'Zeittiefe', schichten: 'Schichten', fluss: 'Fluss', lesart: 'Lesart',
    rand: 'Rand', rand4: 'Ornament', rand1: 'Relief', rand2: 'Kintsugi', rand3: 'Saum', rand5: 'Riss', stoff4: 'Riss',
    stoff: 'Stoff', stoff3: 'Achat', stoff1: 'Lasur',
    glossen: {
      graben: { begriff: 'les nappes de passé', satz: 'Die Vergangenheit ist nicht vorbei, sie liegt unter der Gegenwart, in Schichten. Wer gräbt, findet keine einzelne Erinnerung, sondern eine ganze Region der Zeit.', zitat: '«Wer sich der eigenen verschütteten Vergangenheit zu nähern trachtet, muss sich verhalten wie ein Mann, der gräbt.»', quelle: 'Walter Benjamin, Ausgraben und Erinnern, um 1932' },
      tiefe: { begriff: 'la coexistence', satz: 'Die Schichten folgen nicht aufeinander, sie bestehen nebeneinander. Hier bestimmst du, wie weit die tiefste zurückreicht.', zitat: '«Le passé ne succède pas au présent qu’il n’est plus, il coexiste avec le présent qu’il a été.»', quelle: 'Deleuze, Le bergsonisme, PUF 1966, Kap. 3' },
      schichten: { begriff: 'les régions du passé', satz: 'Jede Schicht enthält die ganze Vergangenheit, nur mehr oder weniger zusammengezogen. Mehr Schichten, feinere Stufen.', zitat: '«… mille et mille répétitions de notre vie psychologique, figurées par autant de sections A’B’, A’’B’’, etc., du même cône.»', quelle: 'Bergson, Matière et mémoire, 1896, Kap. III' },
      fluss: { begriff: 'la transformation des nappes', satz: 'Die Schichten bleiben nicht, wie sie sind: Sie füllen sich, wandern, schieben sich übereinander. Hier bestimmst du, wie schnell.', zitat: '', quelle: 'Deleuze, L’image-temps, Minuit 1985, Kap. 5, sinngemäss' },
      lesarten: { begriff: 'trois lectures', satz: 'Drei Arten, in die Schichten zu gelangen: der Kegel Bergsons, die Grabung bei Welles, das Gleiten bei Resnais.', zitat: '', quelle: 'Deleuze, L’image-temps, Minuit 1985, Kap. 5' },
      sprung: { begriff: 'le saut', satz: 'Man holt die Vergangenheit nicht herauf, man versetzt sich in sie: ein Sprung in eine Region der Zeit, und erst dort wird die Erinnerung Bild.', zitat: '', quelle: 'Bergson, Matière et mémoire; Deleuze, L’image-temps, Kap. 5, sinngemäss' }
    },
    schichtJetzt: 'hier: jetzt', schichtVor: 'hier: vor {s} s', komma2: ',',
    lesarten: [
      { kurz: 'Kegel', titel: 'Der Kegel', wer: 'Bergson', geste: 'Tippen setzt die Spitze, dort springt man hinein.', text: 'Henri Bergson zeichnet das Gedächtnis als umgekehrten Kegel. Seine Spitze berührt die Ebene der Gegenwart; jeder Schnitt durch den Kegel ist eine Schicht der ganzen Vergangenheit, enger an der Spitze, weiter zum Grund. Erinnern heisst für Bergson nicht, die Vergangenheit heraufholen, sondern sich in sie versetzen, mit einem Sprung. Wo du tippst, berührt die Spitze das Bild, und die Schichten lösen sich von ihr.' },
      { kurz: 'Grabung', titel: 'Die Grabung', wer: 'Welles', geste: 'Ziehen gräbt. Je tiefer, desto älter.', text: 'In «Citizen Kane» befragt ein Reporter die Zeugen eines Lebens. Jeder öffnet eine andere Schicht der Vergangenheit, und in jeder wird nach demselben gesucht, nach «Rosebud». Deleuze liest Welles’ Tiefenschärfe als Erkundung solcher Schichten. Grabe, wo du suchst: Je tiefer, desto älter, und in den Wänden liegen alle Zeiten dazwischen.' },
      { kurz: 'Überschiebung', titel: 'Die Überschiebung', wer: 'Resnais', geste: 'Ziehen schiebt die Schichten übereinander.', text: 'Bei Alain Resnais lassen sich die Schichten nicht mehr ordnen. In «Hiroshima mon amour» schiebt sich Nevers über Hiroshima, in «L’année dernière à Marienbad» weiss niemand, welche Vergangenheit gilt. Deleuze spricht von einer Verwandlung der Schichten. Wie in den Glarner Alpen, wo älteres Gestein auf jüngerem liegt, gleiten hier frühere Zeiten über spätere; die Ränder fliessen wie Farbe bei Helen Frankenthaler.' }
    ],
    wenden: 'Kamera wenden', tonAn: 'Ton an', tonAus: 'Ton aus',
    begriff: 'Begriff', standbild: 'Standbild', aufnahme: 'Aufnahme', stopp: 'Stopp',
    teilen: 'Teilen', sichern: 'Sichern', komma: '.', 'ergebnis-hinweis': 'Gesichert im Ordner «Downloads». «Teilen» legt es direkt in die Galerie oder eine App.',
    keineAufnahme: 'Dieser Browser kann die Leinwand nicht aufnehmen. Das Standbild geht.',
    geste: 'Ziehen gräbt. Je tiefer, desto älter.',
    familie: 'Zeit · Das Zeit-Bild, Kapitel 5', 'b-titel': 'Schichten der Zeit',
    'b-text': [
      'Für Deleuze, der hier Henri Bergson folgt, vergeht die Vergangenheit nicht. Sie bewahrt sich als Ganzes, und zwar nicht in einer Folge von Momenten, sondern in Schichten, die nebeneinander bestehen. Jede Schicht ist die ganze Vergangenheit, nur mehr oder weniger zusammengezogen.',
      'Um sich zu erinnern, holt man nichts herauf: Man springt in eine Schicht und sucht dort. Das Kino kann diesen Sprung zeigen. Orson Welles lässt in «Citizen Kane» jeden Zeugen eine eigene Schicht öffnen; Alain Resnais lässt die Schichten so ineinandergleiten, dass niemand mehr sagen kann, welche gilt. Deleuze nennt das die «nappes de passé», Schichten der Vergangenheit, und stellt ihnen die «pointes de présent» gegenüber, Spitzen der Gegenwart.',
      'Hier ist die Oberfläche des Bildes die Gegenwart. Darunter liegt das, was eben war, Schicht um Schicht. Wo du gräbst, liegt eine ältere frei, und in den Wänden der Grube stehen alle Zeiten dazwischen.'
    ],
    'b-frage': 'Liegen hier Zeiten nebeneinander, oder siehst du nur ein verzögertes Video? Eine Schicht ist mehr als ein früheres Bild: Achte darauf, ob du in eine Schicht springst oder sie nur von oben betrachtest.',
    'b-quelle': 'Gilles Deleuze, L’image-temps (Cinéma 2), Paris: Minuit 1985, Kapitel 5 «Pointes de présent et nappes de passé». Deutsch: Das Zeit-Bild, Suhrkamp. Henri Bergson, Matière et mémoire, 1896, Kapitel III.',
    keineKamera: 'Die Kamera lässt sich nicht öffnen. Wähle ein Video, Fotos oder das Beispiel.',
    keinGL: 'Dieses Gerät kann WebGL 2 nicht anzeigen. Die Schichten brauchen es.',
    kontextWeg: 'Die Grafik ist ausgestiegen. Bitte die Seite neu laden.'
  },
  en: {
    titel: 'Sheets of the past', satz: 'The past lies in sheets, and one leaps into them.',
    kamera: 'Camera', video: 'Video or photos', beispiel: 'Example',
    tiefe: 'Depth of time', schichten: 'Sheets', fluss: 'Flow', lesart: 'Reading',
    rand: 'Edge', rand4: 'Ornament', rand1: 'Relief', rand2: 'Kintsugi', rand3: 'Fringe', rand5: 'Tear', stoff4: 'Tear',
    stoff: 'Matter', stoff3: 'Agate', stoff1: 'Glaze',
    glossen: {
      graben: { begriff: 'les nappes de passé', satz: 'The past is not over, it lies beneath the present, in sheets. Whoever digs finds no single memory but a whole region of time.', zitat: '“He who seeks to approach his own buried past must conduct himself like a man digging.”', quelle: 'Walter Benjamin, Excavation and Memory, c. 1932' },
      tiefe: { begriff: 'la coexistence', satz: 'The sheets do not follow one another, they coexist. Here you decide how far back the deepest one reaches.', zitat: '« Le passé ne succède pas au présent qu’il n’est plus, il coexiste avec le présent qu’il a été. »', quelle: 'Deleuze, Le bergsonisme, PUF 1966, ch. 3 (original)' },
      schichten: { begriff: 'les régions du passé', satz: 'Each sheet contains the whole past, only more or less contracted. More sheets, finer steps.', zitat: '« … mille et mille répétitions de notre vie psychologique, figurées par autant de sections A’B’, A’’B’’, etc., du même cône. »', quelle: 'Bergson, Matière et mémoire, 1896, ch. III (original)' },
      fluss: { begriff: 'la transformation des nappes', satz: 'The sheets do not stay as they are: they fill up, drift, slide over one another. Here you decide how fast.', zitat: '', quelle: 'Deleuze, The Time-Image, ch. 5, paraphrased' },
      lesarten: { begriff: 'trois lectures', satz: 'Three ways into the sheets: Bergson’s cone, the excavation in Welles, the sliding in Resnais.', zitat: '', quelle: 'Deleuze, The Time-Image, ch. 5' },
      sprung: { begriff: 'le saut', satz: 'One does not bring the past up, one places oneself in it: a leap into a region of time, and only there does memory become image.', zitat: '', quelle: 'Bergson, Matter and Memory; Deleuze, The Time-Image, ch. 5, paraphrased' }
    },
    schichtJetzt: 'here: now', schichtVor: 'here: {s} s ago', komma2: '.',
    lesarten: [
      { kurz: 'Cone', titel: 'The cone', wer: 'Bergson', geste: 'Tap to set the tip, that is where one leaps in.', text: 'Henri Bergson draws memory as an inverted cone. Its tip touches the plane of the present; each section through the cone is a sheet of the whole past, narrow near the tip, wide towards the base. To remember, for Bergson, is not to bring the past up but to place oneself in it, with a leap. Where you tap, the tip touches the image and the sheets detach from it.' },
      { kurz: 'Excavation', titel: 'The excavation', wer: 'Welles', geste: 'Drag to dig. The deeper, the older.', text: 'In “Citizen Kane” a reporter questions the witnesses of a life. Each opens a different sheet of the past, and in each the same thing is sought, “Rosebud”. Deleuze reads Welles’s depth of field as an exploration of such sheets. Dig where you search: the deeper, the older, and in the walls lie all the times in between.' },
      { kurz: 'Thrust', titel: 'The overthrust', wer: 'Resnais', geste: 'Drag to push the sheets over one another.', text: 'In Alain Resnais the sheets can no longer be put in order. In “Hiroshima mon amour” Nevers slides over Hiroshima; in “Last Year at Marienbad” no one knows which past holds. Deleuze speaks of a transformation of the sheets. As in the Glarus Alps, where older rock lies on top of younger, earlier times slide over later ones here; the edges flow like paint in Helen Frankenthaler.' }
    ],
    wenden: 'Flip camera', tonAn: 'Sound on', tonAus: 'Sound off',
    begriff: 'Concept', standbild: 'Still', aufnahme: 'Record', stopp: 'Stop',
    teilen: 'Share', sichern: 'Save', komma: '.', 'ergebnis-hinweis': 'Saved to your “Downloads” folder. “Share” sends it straight to your gallery or an app.',
    keineAufnahme: 'This browser cannot record the canvas. Stills work.',
    geste: 'Drag to dig. The deeper, the older.',
    familie: 'Time · The Time-Image, chapter 5', 'b-titel': 'Sheets of the past',
    'b-text': [
      'For Deleuze, following Henri Bergson, the past does not pass. It is preserved as a whole, not as a sequence of moments but in sheets that coexist. Each sheet is the whole past, only more or less contracted.',
      'To remember, one brings nothing up: one leaps into a sheet and searches there. Cinema can show this leap. Orson Welles has each witness in “Citizen Kane” open a sheet of his own; Alain Resnais lets the sheets slide into one another until no one can say which holds. Deleuze calls them “nappes de passé”, sheets of the past, and sets them against the “pointes de présent”, peaks of the present.',
      'Here the surface of the image is the present. Beneath it lies what just was, sheet upon sheet. Where you dig, an older one is laid bare, and in the walls of the pit stand all the times in between.'
    ],
    'b-frage': 'Do times coexist here, or are you only watching a delayed video? A sheet is more than an earlier image: notice whether you leap into a sheet or only look down on it.',
    'b-quelle': 'Gilles Deleuze, L’image-temps (Cinéma 2), Paris: Minuit 1985, chapter 5 “Pointes de présent et nappes de passé”. English: Cinema 2: The Time-Image, University of Minnesota Press 1989. Henri Bergson, Matière et mémoire, 1896, chapter III.',
    keineKamera: 'The camera cannot be opened. Choose a video, photos or the example.',
    keinGL: 'This device cannot show WebGL 2, which the sheets need.',
    kontextWeg: 'The graphics stopped. Please reload the page.'
  },
  fr: {
    titel: 'Nappes de passé', satz: 'Le passé se tient en nappes, et l’on y saute.',
    kamera: 'Caméra', video: 'Vidéo ou photos', beispiel: 'Exemple',
    tiefe: 'Profondeur du temps', schichten: 'Nappes', fluss: 'Flux', lesart: 'Lecture',
    rand: 'Bord', rand4: 'Ornement', rand1: 'Relief', rand2: 'Kintsugi', rand3: 'Frange', rand5: 'Lacéré', stoff4: 'Lacéré',
    stoff: 'Matière', stoff3: 'Agate', stoff1: 'Glacis',
    glossen: {
      graben: { begriff: 'les nappes de passé', satz: 'Le passé n’est pas fini, il gît sous le présent, en nappes. Qui fouille ne trouve pas un souvenir isolé, mais toute une région du temps.', zitat: '« Wer sich der eigenen verschütteten Vergangenheit zu nähern trachtet, muss sich verhalten wie ein Mann, der gräbt. »', quelle: 'Walter Benjamin, Ausgraben und Erinnern, vers 1932 (original)' },
      tiefe: { begriff: 'la coexistence', satz: 'Les nappes ne se suivent pas, elles coexistent. Ici tu décides jusqu’où remonte la plus profonde.', zitat: '« Le passé ne succède pas au présent qu’il n’est plus, il coexiste avec le présent qu’il a été. »', quelle: 'Deleuze, Le bergsonisme, PUF 1966, ch. 3' },
      schichten: { begriff: 'les régions du passé', satz: 'Chaque nappe contient tout le passé, seulement plus ou moins contracté. Plus de nappes, des degrés plus fins.', zitat: '« … mille et mille répétitions de notre vie psychologique, figurées par autant de sections A’B’, A’’B’’, etc., du même cône. »', quelle: 'Bergson, Matière et mémoire, 1896, ch. III' },
      fluss: { begriff: 'la transformation des nappes', satz: 'Les nappes ne restent pas telles quelles : elles se comblent, dérivent, glissent les unes sur les autres. Ici tu décides à quelle vitesse.', zitat: '', quelle: 'Deleuze, L’image-temps, Minuit 1985, ch. 5, en substance' },
      lesarten: { begriff: 'trois lectures', satz: 'Trois manières d’entrer dans les nappes : le cône de Bergson, la fouille chez Welles, le glissement chez Resnais.', zitat: '', quelle: 'Deleuze, L’image-temps, Minuit 1985, ch. 5' },
      sprung: { begriff: 'le saut', satz: 'On ne fait pas remonter le passé, on s’y place : un saut dans une région du temps, et c’est là seulement que le souvenir devient image.', zitat: '', quelle: 'Bergson, Matière et mémoire ; Deleuze, L’image-temps, ch. 5, en substance' }
    },
    schichtJetzt: 'ici : maintenant', schichtVor: 'ici : il y a {s} s', komma2: ',',
    lesarten: [
      { kurz: 'Cône', titel: 'Le cône', wer: 'Bergson', geste: 'Toucher place la pointe, c’est là qu’on saute.', text: 'Henri Bergson dessine la mémoire comme un cône renversé. Sa pointe touche le plan du présent ; chaque section du cône est une nappe du passé tout entier, étroite près de la pointe, large vers la base. Se souvenir, pour Bergson, ce n’est pas faire remonter le passé, mais s’y placer, d’un saut. Là où tu touches, la pointe touche l’image, et les nappes s’en détachent.' },
      { kurz: 'Fouille', titel: 'La fouille', wer: 'Welles', geste: 'Glisser creuse. Plus profond, plus ancien.', text: 'Dans « Citizen Kane », un reporter interroge les témoins d’une vie. Chacun ouvre une autre nappe de passé, et dans chacune on cherche la même chose, « Rosebud ». Deleuze lit la profondeur de champ de Welles comme une exploration de ces nappes. Fouille là où tu cherches : plus profond, plus ancien, et dans les parois gisent tous les temps intermédiaires.' },
      { kurz: 'Charriage', titel: 'Le charriage', wer: 'Resnais', geste: 'Glisser pousse les nappes les unes sur les autres.', text: 'Chez Alain Resnais, les nappes ne se laissent plus ordonner. Dans « Hiroshima mon amour », Nevers glisse sur Hiroshima ; dans « L’année dernière à Marienbad », personne ne sait quel passé vaut. Deleuze parle d’une transformation des nappes. Comme dans les Alpes glaronaises, où la roche ancienne repose sur la plus jeune, des temps antérieurs glissent ici sur des temps postérieurs ; les bords coulent comme la peinture chez Helen Frankenthaler.' }
    ],
    wenden: 'Retourner', tonAn: 'Son activé', tonAus: 'Son coupé',
    begriff: 'Concept', standbild: 'Image', aufnahme: 'Enregistrer', stopp: 'Arrêter',
    teilen: 'Partager', sichern: 'Télécharger', komma: ',', 'ergebnis-hinweis': 'Enregistré dans le dossier « Téléchargements ». « Partager » l’envoie directement dans la galerie ou une app.',
    keineAufnahme: 'Ce navigateur ne peut pas enregistrer le canevas. L’image fixe fonctionne.',
    geste: 'Glisser creuse. Plus profond, plus ancien.',
    familie: 'Temps · L’image-temps, chapitre 5', 'b-titel': 'Nappes de passé',
    'b-text': [
      'Pour Deleuze, qui suit ici Henri Bergson, le passé ne passe pas. Il se conserve tout entier, non comme une suite de moments, mais en nappes qui coexistent. Chaque nappe est le passé tout entier, seulement plus ou moins contracté.',
      'Pour se souvenir, on ne fait rien remonter : on saute dans une nappe et l’on y cherche. Le cinéma peut montrer ce saut. Orson Welles fait ouvrir à chaque témoin de « Citizen Kane » sa propre nappe ; Alain Resnais fait glisser les nappes les unes dans les autres, jusqu’à ce que personne ne sache laquelle vaut. Deleuze les appelle « nappes de passé » et leur oppose les « pointes de présent ».',
      'Ici, la surface de l’image est le présent. Dessous gît ce qui vient d’être, nappe après nappe. Là où tu fouilles, une nappe plus ancienne apparaît, et dans les parois de la fosse se tiennent tous les temps intermédiaires.'
    ],
    'b-frage': 'Des temps coexistent-ils ici, ou ne vois-tu qu’une vidéo retardée ? Une nappe est plus qu’une image antérieure : remarque si tu sautes dans une nappe ou si tu la regardes seulement d’en haut.',
    'b-quelle': 'Gilles Deleuze, L’image-temps (Cinéma 2), Paris : Minuit 1985, chapitre 5 « Pointes de présent et nappes de passé ». Henri Bergson, Matière et mémoire, 1896, chapitre III.',
    keineKamera: 'La caméra ne s’ouvre pas. Choisis une vidéo, des photos ou l’exemple.',
    keinGL: 'Cet appareil ne peut pas afficher WebGL 2, nécessaire aux nappes.',
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
  lesartText();
  document.querySelectorAll('[data-lang]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.lang === sprache)));
}
document.querySelectorAll('[data-lang]').forEach((b) => b.addEventListener('click', () => {
  sprache = b.dataset.lang;
  try { localStorage.setItem('kristall.sprache', sprache); } catch {}
  uebersetzen();
}));

// ---------- Absturzspur (Lehre aus PHORMA): in der Konsole, auf der Seite nur mit ?spur ----------
const SPUR = 'schichten.spur', SPUR_ZEIGEN = new URLSearchParams(location.search).has('spur');
function spur(schritt) {
  try {
    const s = JSON.parse(localStorage.getItem(SPUR) || '[]');
    s.push(schritt); localStorage.setItem(SPUR, JSON.stringify(s.slice(-12)));
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
try {
  const s = JSON.parse(localStorage.getItem(SPUR) || '[]');
  if (s.length && !['✓ läuft', 'Start', 'Ende', 'Pause'].includes(s.at(-1))) {
    console.warn('Schichten: der letzte Versuch brach ab nach', s.slice(-4).join(' → '));
    if (SPUR_ZEIGEN) melden('Spur: ' + s.slice(-4).join(' → '));
  }
  localStorage.setItem(SPUR, JSON.stringify(['Start']));
} catch {}

// ---------- Grafik ----------
const telefon = matchMedia('(pointer: coarse)').matches || Math.min(screen.width, screen.height) < 700;
const SCHICHTEN = telefon ? 40 : 64;          // Zeitpuffer (Bilder)
const LANGE_SEITE = telefon ? 640 : 1080;     // Grösse der vergangenen Bilder im Puffer
const MAX_DPR = 2;   // fein wie der Bildschirm; ruckelt es, senkt tempoMessen die Auflösung (bis zur Hälfte)
const SCHARF_SEITE = telefon ? 1280 : 1920;   // die Gegenwart: so scharf, wie der Bildschirm sie zeigt
const GRUBE_SEITE = telefon ? 512 : 768;      // Tiefenkarte der Grabung: fein genug für glatte Terrassen (HalfFloat, ein Kanal genügt)

const leinwand = $('leinwand');
const gl = leinwand.getContext('webgl2', { antialias: false, alpha: false, premultipliedAlpha: false, powerPreference: 'high-performance', preserveDrawingBuffer: false });
if (!gl) { melden(TEXTE[sprache].keinGL); spur('kein WebGL2'); }
leinwand.addEventListener('webglcontextlost', (e) => { e.preventDefault(); melden(TEXTE[sprache].kontextWeg); spur('Kontext verloren'); });

const VS = `#version 300 es
in vec2 a; out vec2 v;
void main(){ v = a*0.5+0.5; gl_Position = vec4(a,0.,1.); }`;

// Die Grube: eine Tiefenkarte, in die der Finger gräbt. Sie füllt sich langsam wieder (Fluss),
// die Wände rutschen ein wenig nach. Werte 0 (Oberfläche, Gegenwart) bis 1 (tiefste Schicht).
const FS_GRUBE = `#version 300 es
precision highp float; in vec2 v; out vec4 o;
uniform sampler2D uAlt; uniform vec2 uPx; uniform vec4 uStempel[16]; uniform vec2 uStempelR[16]; uniform int uN; uniform float uAb, uSeite;
void main(){
  float d = texture(uAlt, v).r;
  float n = texture(uAlt, v + vec2(uPx.x, 0.)).r + texture(uAlt, v - vec2(uPx.x, 0.)).r + texture(uAlt, v + vec2(0., uPx.y)).r + texture(uAlt, v - vec2(0., uPx.y)).r;
  float n2 = texture(uAlt, v + uPx).r + texture(uAlt, v - uPx).r + texture(uAlt, v + vec2(uPx.x, -uPx.y)).r + texture(uAlt, v - vec2(uPx.x, -uPx.y)).r;
  d = mix(d, (n * 2.0 + n2) / 12.0, 0.08);   // die Wände setzen sich: kleine Unebenheiten glätten sich
  d = max(0.0, d - uAb * (0.4 + d));
  vec2 asp = vec2(uSeite, 1.0);
  for (int i = 0; i < 16; i++) {
    if (i >= uN) break;
    // ein Zug ist eine Strecke von a nach b, nicht eine Reihe von Tupfen: so bleiben die Ränder ruhig
    vec2 a = uStempel[i].xy * asp, b = uStempel[i].zw * asp, q = v * asp, ab = b - a;
    float h = clamp(dot(q - a, ab) / max(1e-8, dot(ab, ab)), 0.0, 1.0);
    float r = length(q - a - ab * h) / uStempelR[i].x;
    float f = max(0.0, 1.0 - r * r);
    d = min(1.0, d + uStempelR[i].y * f * f);
  }
  o = vec4(d, 0.0, 0.0, 1.0);
}`;

const FS = `#version 300 es
precision highp float; precision highp sampler2DArray;
in vec2 v; out vec4 o;
uniform sampler2DArray uZeit;   // die vergangenen Bilder, ein Ring
uniform sampler2D uScharf;      // die Gegenwart in voller Auflösung
uniform sampler2D uGrube;       // die Tiefenkarte der Grabung
uniform float uKopf, uN, uSpanne, uS, uSeite, uT, uFT;
uniform int uLesart;
uniform vec2 uSpitze, uSchub, uGleit;
uniform float uSprung;
uniform int uRand;      // Gestalt der Ränder in der Grabung
uniform int uKegel;     // Entwurf des Kegels: 1 Schnitte, 2 Abgrund
uniform float uPxH;     // ein Bildpunkt, in Bildhöhen
uniform int uUeber;     // Stoff der Überschiebung: 3 Achat, 1 Lasur (0 und 2 nur als Entwurf)
uniform vec4 uRahmen;   // wo das Bild auf der Leinwand steht (Rest Saalschwarz)

float hs(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float rausch(vec2 p){ vec2 i = floor(p), f = fract(p); f = f*f*(3.-2.*f);
  return mix(mix(hs(i), hs(i+vec2(1,0)), f.x), mix(hs(i+vec2(0,1)), hs(i+vec2(1,1)), f.x), f.y); }
float fbm(vec2 p){ float s = 0., a = .5; for (int i = 0; i < 4; i++){ s += a * rausch(p); p = p * 2.03 + 7.1; a *= .5; } return s; }
float lum(vec3 c){ return dot(c, vec3(.299,.587,.114)); }
vec2 spiegeln(vec2 u){ vec2 m = 1.0 - abs(mod(u, 2.0) - 1.0); return vec2(m.x, 1.0 - m.y); }
// ein Bild aus der Vergangenheit: lag in Bildern zurück vom jüngsten, weich zwischen zwei Bildern
vec3 schicht(vec2 u, float lag){
  vec2 q = spiegeln(u);
  vec3 jetzt = texture(uScharf, q).rgb;
  if (lag < 0.01) return jetzt;
  float l = min(lag, uN - 1.0), f = floor(l), w = l - f;
  float a = mod(uKopf - f + uN, uN), b = mod(uKopf - f - 1.0 + uN, uN);
  vec3 c = mix(texture(uZeit, vec3(q, a)).rgb, texture(uZeit, vec3(q, b)).rgb, w);
  return lag < 1.0 ? mix(jetzt, c, lag) : c;
}
// das Alter tönt: die Gegenwart neutral, ältere Schichten wärmer, matter, wie Sediment
vec3 alt(vec3 c, float a){ float l = lum(c); return mix(c, l * vec3(1.08, .93, .76), a * .5) * (1.0 - a * .14); }
float lagVon(float k){ return k / max(1.0, uS - 1.0) * uSpanne; }

vec2 imR(vec2 q){ vec2 a = uRahmen.xy, b = uRahmen.zw; return a + (b - a) * (1.0 - abs(mod((q - a) / (b - a), 2.0) - 1.0)); }

// ---- Décollage aus Bildtechniken: die gemeinsame Bildsprache aller Lesarten (Villeglé, Rotella, Höch) ----
// Jede Zeit ist ein Plakat, gedruckt in einem eigenen Verfahren: die Gegenwart als Foto, die älteren als Kupferstich,
// Raster, Holzschnitt, Cyanotypie. Die Grenzen sind Risse mit weissem Faserrand; das obere Blatt wirft einen Schatten.
vec3 verfahren(vec3 b, float m){
  float l = lum(b);
  vec2 q = gl_FragCoord.xy;
  vec3 papier = vec3(0.95, 0.92, 0.85);
  if (m < 0.5) return b;
  if (m < 1.5) {
    // Kupferstich: Linien schräg, je dunkler, desto breiter; im Schatten kreuzt eine zweite Lage
    float a = dot(q, vec2(0.866, 0.5)) / 5.0, f1 = abs(fract(a) - 0.5) * 2.0, fw = fwidth(a) * 2.0;
    float t1 = 1.0 - smoothstep((1.0 - l) * 0.9 - fw, (1.0 - l) * 0.9 + fw, f1);
    float a2 = dot(q, vec2(-0.5, 0.866)) / 5.0, f2 = abs(fract(a2) - 0.5) * 2.0;
    float t2 = (1.0 - smoothstep((0.55 - l) * 1.2 - fw, (0.55 - l) * 1.2 + fw, f2)) * step(l, 0.55);
    return mix(papier, vec3(0.16, 0.1, 0.07), 1.0 - (1.0 - t1) * (1.0 - t2));
  }
  if (m < 2.5) {
    // Raster: Punkte im gedrehten Gitter, gross im Dunkeln, in der Farbe des Bildes
    vec2 r = mat2(0.966, 0.259, -0.259, 0.966) * q / 7.0, f = fract(r) - 0.5;
    float rad = sqrt(max(0.0, 1.0 - l)) * 0.62, d = length(f), fw = fwidth(r.x) * 1.2;
    return mix(papier, b * 0.55, 1.0 - smoothstep(rad - fw, rad + fw, d));
  }
  if (m < 3.5) {
    // Holzschnitt: schwarz oder Papier, die Schwelle folgt den Spuren des Hohleisens; ein gedämpftes Rot im Licht
    float spur = sin(dot(q, vec2(0.2, 0.98)) / 3.2 + 4.0 * rausch(q / 60.0)) * 0.12;
    float s1 = smoothstep(-0.03, 0.03, l + spur - 0.45);
    vec3 c = mix(vec3(0.07, 0.06, 0.06), papier, s1);
    return mix(c, vec3(0.72, 0.2, 0.15), (1.0 - smoothstep(-0.03, 0.03, l + spur - 0.8)) * s1 * 0.7);
  }
  if (m > 4.5) {
    // Rötel: Kreide auf vergilbtem Bütten, die Körnung des Papiers fängt das Pigment
    float korn = rausch(q * 0.55) * 0.6 + rausch(q * 0.13) * 0.4;
    float t = smoothstep(0.15, 0.95, l + (korn - 0.5) * 0.35);
    return mix(vec3(0.52, 0.2, 0.12), vec3(0.93, 0.86, 0.72), t);
  }
  // Cyanotypie: Preussischblau, das Licht als Papier
  return mix(vec3(0.05, 0.17, 0.38), vec3(0.87, 0.9, 0.92), smoothstep(0.08, 0.92, l));
}
// Je tiefer die Schicht, desto älter das Verfahren: eine kleine Mediengeschichte rückwärts.
// a = 0 die erste vergangene Schicht: Raster (Zeitungsdruck), Cyanotypie, Kupferstich, Holzschnitt, Rötel, dann Holzschnitt und Rötel im Wechsel
float verfahrenNr(float a){ return a < 0.5 ? 2.0 : a < 1.5 ? 4.0 : a < 2.5 ? 1.0 : mod(a - 3.0, 2.0) < 0.5 ? 3.0 : 5.0; }
// fliessendes Alter (Kegel): das Blatt altert auf dem Weg nach aussen von Verfahren zu Verfahren
vec3 verfahrenAlter(vec3 b, float a){
  float i = floor(a), f = a - i;
  vec3 c = i < -0.5 ? b : verfahren(b, verfahrenNr(i));
  float ueber = smoothstep(0.62, 0.98, f);
  if (ueber > 0.0) c = mix(c, verfahren(b, verfahrenNr(i + 1.0)), ueber);
  return c;
}
// das Nachzittern: ältere Blätter folgen der Geste träger und zittern länger nach
uniform float uZitter;
vec2 zitter(float alter){
  float a = min(alter, 6.0);
  return uZitter * a * 0.0022 * vec2(sin(uT * 21.0 + alter * 1.7) + 0.5 * sin(uT * 47.0 + alter), cos(uT * 17.0 + alter * 2.3) + 0.5 * cos(uT * 39.0 - alter));
}
float rissVersatz(vec2 p){ return (fbm(p * 18.0) - 0.5) * 0.9 + (rausch(p * 140.0) - 0.5) * 0.25; }   // grob und fein, wie Papier reisst
// d: Abstand zum Riss in Bildpunkten, > 0 auf dem oberen Blatt
vec3 riss(vec3 oben, vec3 unten, float d, vec2 p, float id){
  float breite = 2.5 + 6.5 * rausch(p * 30.0 + id * 3.7);
  float fasern = rausch(p * vec2(900.0, 120.0)) * rausch(p * vec2(140.0, 800.0));
  vec3 o = mix(oben, vec3(0.96, 0.95, 0.92) * (0.93 + 0.07 * fasern), 1.0 - smoothstep(breite * 0.6, breite, d + fasern * 4.0));
  vec3 un = unten * (1.0 - 0.42 * exp(-max(-d, 0.0) / 8.0));
  return mix(un, o, smoothstep(-0.7, 0.7, d));
}

// ---- Grabung (Welles): Terrassen in der Tiefenkarte, Wände mit allen Zeiten dazwischen ----
float grube(vec2 u){ return texture(uGrube, u).r; }
// eine Linie gleicher Breite, weich über anderthalb Bildpunkte; Abstand und Breite in Bildhöhen
float linie(float abst, float breite){ float h = 0.5 * breite; return 1.0 - smoothstep(h - 0.75 * uPxH, h + 0.75 * uPxH, abs(abst)); }
// Grabung als Décollage: der Finger reisst Plakat um Plakat ab; jede Terrasse ist ein älteres Blatt
vec3 grabBlatt(vec2 u, float j){
  vec2 qb = u + (vec2(0.5) - u) * 0.018 * j + zitter(j);
  vec3 b = schicht(qb, lagVon(j));
  return verfahren(b, j < 0.5 ? 0.0 : verfahrenNr(j - 1.0)) * (1.0 - 0.05 * j);
}
vec3 grabungRiss(vec2 u){
  vec2 p = u * vec2(uSeite, 1.0);
  float d0 = grube(u);
  float d = clamp(d0 + 0.016 * (rausch(p * 3.2) - 0.5) * smoothstep(0.0, 0.15, d0), 0.0, 0.9999);
  float S = uS, x = d * S, k = floor(x), w = x - k;
  vec2 e = vec2(1.5 / ${GRUBE_SEITE}.0, 0.0);
  vec2 g = vec2(grube(u + e.xy) - grube(u - e.xy), grube(u + e.yx) - grube(u - e.yx)) / (2.0 * e.x);
  float gl = length(g * vec2(1.0 / uSeite, 1.0)) * S + 1e-4;
  float px = max(uPxH, 1e-5);
  float vers = rissVersatz(p) * 14.0;
  float bisUnten = (1.0 - w) / gl / px + vers, seitOben = w / gl / px - vers;     // in Bildpunkten, mit gerissenem Rand
  float da = smoothstep(0.4, 1.2, gl);
  bool unten = k < S - 1.5 && (k < 0.5 || bisUnten < seitOben);
  if (da < 0.01 || (k < 0.5 && !(k < S - 1.5))) return grabBlatt(u, k);
  if (unten) return riss(grabBlatt(u, k), grabBlatt(u, k + 1.0), mix(1e3, bisUnten, da), p, k);
  return riss(grabBlatt(u, k - 1.0), grabBlatt(u, k), mix(-1e3, -seitOben, da), p, k - 1.0);
}
vec3 grabung(vec2 u){
  if (uRand == 5) return grabungRiss(u);
  vec2 p = u * vec2(uSeite, 1.0);
  float d0 = grube(u);
  // nur eine ruhige, grossräumige Unregelmässigkeit: die Ränder sollen nicht zittern
  float d = clamp(d0 + 0.016 * (rausch(p * 3.2) - 0.5) * smoothstep(0.0, 0.15, d0), 0.0, 0.9999);
  float S = uS, x = d * S, k = floor(x), w = x - k;
  vec2 e = vec2(1.5 / ${GRUBE_SEITE}.0, 0.0);
  vec2 g = vec2(grube(u + e.xy) - grube(u - e.xy), grube(u + e.yx) - grube(u - e.yx)) / (2.0 * e.x);
  float gl = length(g * vec2(1.0 / uSeite, 1.0)) * S + 1e-4;
  // Abstand zur nächsttieferen Grenze und zur letzten, in Bildhöhen
  float bisUnten = (1.0 - w) / gl, seitOben = w / gl;
  float hoch = (uRand == 4 ? 0.026 : 0.016) + 0.004 * k;                    // tiefere Wände sind höher
  float da = smoothstep(0.4, 1.2, gl) * (1.0 - step(S - 1.5, k));   // nur, wo wirklich eine Grenze ist; unter der tiefsten Schicht keine
  float wand = (1.0 - smoothstep(0.0, hoch, bisUnten)) * da;
  float tw = clamp(bisUnten / hoch, 0.0, 1.0);      // 1 am oberen Rand der Wand, 0 an ihrem Fuss
  // Boden: die Schicht k, etwas verkleinert, als blicke man in einen Schacht
  vec2 mitte = vec2(0.5);
  vec2 qb = u + (mitte - u) * 0.018 * k;
  float ak = k / max(1.0, S - 1.0);
  vec3 boden = alt(schicht(qb, lagVon(k)), ak);
  // Schatten am Fuss der oberen Wand, die Tiefe dunkelt
  vec2 gn = normalize(g * vec2(1.0 / uSeite, 1.0) + 1e-6);
  float zumLicht = dot(gn, normalize(vec2(0.55, -0.65)));      // Licht von oben links
  float schattenBreite = 0.02 + 0.03 * max(0.0, -zumLicht);
  boden *= 1.0 - (0.35 + 0.3 * max(0.0, -zumLicht)) * (1.0 - smoothstep(0.0, schattenBreite, seitOben)) * smoothstep(0.5, 1.0, k);
  boden *= 1.0 - 0.3 * ak;
  // Wand: die Zeit läuft von Schicht k bis k+1 durch, waagrechte Sedimentbänder
  float kw = k + (1.0 - tw);
  vec2 qw = u + (mitte - u) * 0.018 * kw;
  vec3 band = alt(schicht(qw, lagVon(kw)), kw / max(1.0, S - 1.0));
  float sed = 0.84 + 0.16 * sin(tw * 9.0 * (1.0 + k * 0.4) + rausch(p * 5.0) * 1.5);
  float licht = 0.62 + 0.58 * zumLicht;
  band *= sed * licht * vec3(1.05, .97, .88) * (1.0 - 0.22 * ak) * 1.15;
  float tief = step(S - 2.5, k);                             // die Wand hinab zur tiefsten Schicht
  float px = max(uPxH, 0.0006);
  vec3 c1 = vec3(0.0);
  if (uRand == 1 || uRand == 4) {
    // Relief im Streiflicht: die Wand gewölbt, oben eine Lichtkante, unten Schatten, feine Lagen wie Gestein
    c1 = mix(boden, band * mix(0.5, 1.08, pow(tw, 0.7)), wand);
    if (uRand == 1) {
      float lz = tw * (3.0 + k * 0.7) + 0.25 * rausch(p * 4.0);
      float la = abs(fract(lz) - 0.5), lb = 0.5 * px / hoch * (3.0 + k * 0.7);
      float lagen = 1.0 - smoothstep(lb, lb + fwidth(lz) * 1.2, la);
      c1 *= 1.0 - 0.3 * lagen * wand;
    }
    float grat = pow(smoothstep(0.62, 1.0, tw), 3.0) * wand;
    c1 += vec3(1.0, 0.95, 0.86) * grat * (0.2 + 1.0 * max(0.0, zumLicht));
    c1 = mix(c1, vec3(1.0, 0.97, 0.92), linie(bisUnten - hoch, 1.1 * px) * da * (0.3 + 0.6 * max(0.0, zumLicht)));
    c1 *= 1.0 - 0.35 * grat * max(0.0, -zumLicht);
    float aussen = (1.0 - smoothstep(hoch, hoch + 0.012, bisUnten)) * step(hoch, bisUnten) * da;
    c1 *= 1.0 - 0.25 * aussen * max(0.0, -zumLicht);       // auch die obere Terrasse fängt Schatten
    if (uRand == 1) return c1;
  }
  vec3 c = uRand == 4 ? c1 : mix(boden, band, wand);
  if (uRand == 2) {
    // Kintsugi: jede Bruchkante mit Gold geschlossen, gleichmässig fein, rund wie ein Draht im Licht; die tiefste in rotem Lack
    float breite = (2.2 + 0.8 * tief) * px;
    float abst = bisUnten - hoch;
    float an = linie(abst, breite) * da;
    float quer = clamp(abs(abst) / (0.5 * breite), 0.0, 1.0);
    float rund = sqrt(max(0.0, 1.0 - quer * quer));                   // Querschnitt des Drahts
    float glanz = pow(max(0.0, sin(dot(p, vec2(9.0, 6.0)) - uT * 0.9) * 0.5 + 0.5), 10.0);
    vec3 gold = mix(vec3(0.42, 0.27, 0.09), vec3(0.98, 0.82, 0.46), rund * (0.55 + 0.45 * max(0.0, zumLicht)));
    gold += vec3(1.0, 0.95, 0.8) * pow(rund, 6.0) * (0.25 + 0.6 * glanz);
    gold = mix(gold, vec3(0.6, 0.08, 0.05) * (0.6 + 0.6 * rund), tief * 0.85);
    // das Gold wirft einen warmen Schein in die Wand darunter
    c *= 1.0 + vec3(0.16, 0.1, 0.02) * (1.0 - smoothstep(0.0, 0.01, max(0.0, -abst))) * step(abst, 0.0) * da * (1.0 - tief);
    return mix(c, gold, an);
  }
  if (uRand == 3) {
    // Spektralsaum: an der Wand zerfällt die Zeit in Farben, wie Licht im Kristall; Rot älter, Blau jünger
    vec2 q0 = u + (mitte - u) * 0.018 * kw, nach = gn * vec2(1.0 / uSeite, 1.0) * 0.0025;
    float r = schicht(q0 - nach, lagVon(kw + 0.4)).r, g2 = schicht(q0, lagVon(kw)).g, b = schicht(q0 + nach, lagVon(max(0.0, kw - 0.4))).b;
    vec3 spek = alt(vec3(r, g2, b), kw / max(1.0, S - 1.0)) * (0.8 + 0.35 * licht);
    c = mix(boden, spek, wand);
    float aussen = (1.0 - smoothstep(hoch, hoch + 0.016, bisUnten)) * step(hoch, bisUnten) * da;
    float x2 = (bisUnten - hoch) / 0.016;
    vec3 saum = vec3(exp(-pow((x2 - 0.15) / 0.18, 2.0)), exp(-pow((x2 - 0.45) / 0.2, 2.0)), exp(-pow((x2 - 0.75) / 0.22, 2.0)));
    c += (saum - 0.33) * aussen * 0.16 + saum * aussen * 0.06;
    c = mix(c, vec3(1.0, 0.98, 0.95), linie(bisUnten - hoch, 0.9 * px) * da * 0.35);
    return c;
  }
  if (uRand == 4) {
    // Ornament: in jeder Wand ein Fries wie in Ägypten, ein Zickzack zwischen zwei Linien, alle Striche gleich fein
    // die Zähne folgen dem Winkel der Wand, so laufen sie gleichmässig um jede Terrasse
    float s = (atan(gn.y, gn.x) / 6.2831853 + 0.5) * (18.0 + 4.0 * k);
    float zig = abs(fract(s) - 0.5) * 2.0;
    float band2 = wand * smoothstep(0.1, 0.14, tw) * (1.0 - smoothstep(0.86, 0.9, tw));
    float lw = 0.55 * px / hoch;                      // halbe Strichbreite, in Anteilen der Wand
    float dz = tw - (0.25 + 0.5 * zig);
    float zz = 1.0 - smoothstep(lw, lw + max(fwidth(dz), 1e-4), abs(dz));
    float ra = abs(tw - 0.12), rb = abs(tw - 0.88), fw = max(fwidth(tw), 1e-4);
    float raender = max(1.0 - smoothstep(lw, lw + fw, ra), 1.0 - smoothstep(lw, lw + fw, rb));
    vec3 farbe = mix(vec3(0.93, 0.86, 0.7), vec3(0.85, 0.15, 0.11), tief);
    c = mix(c, c * 0.6, band2 * 0.55);
    c = mix(c, farbe * (0.7 + 0.4 * licht), clamp(zz * band2 + raender * wand, 0.0, 1.0) * 0.8);
    return c;
  }
  // Kante oben an jeder Wand: haarfein weiss, an der tiefsten Schicht rot (Rot ist Zeit)
  vec3 kf = tief > 0.5 ? vec3(0.85, 0.15, 0.11) : vec3(1.0, 0.97, 0.9);
  return mix(c, kf, linie(bisUnten - hoch, 1.1 * px) * da * (0.45 + 0.4 * max(0.0, zumLicht)));
}

// ---- Kegel (Bergson): die Spitze ist die Gegenwart, jede Schicht ein Schnitt durch den Kegel ----
vec3 spitzePunkt(vec3 c, vec2 u){
  float r = length((u - uSpitze) * vec2(uSeite, 1.0));
  float sp = 1.0 - smoothstep(0.0045 - uPxH, 0.0045 + uPxH, r);
  float ring = linie(r - 0.011 - 0.03 * uSprung, 0.9 * uPxH) * (0.55 + 0.45 * uSprung);
  return mix(mix(c, vec3(0.85, 0.15, 0.11), sp), vec3(0.85, 0.15, 0.11), ring * (1.0 - sp));
}
// A, die Schnitte: Ringe aus gerissenem Papier, jeder ein älteres Plakat in einem anderen Verfahren; das innere liegt oben
vec3 ringBlatt(vec2 u, vec2 p, float kk, float id){
  float dreh = 0.05 * kk * (1.0 + 0.8 * uSprung);
  vec2 d = mat2(cos(dreh), sin(dreh), -sin(dreh), cos(dreh)) * p * (1.0 - min(kk, 14.0) * 0.028 * (1.0 + uSprung));
  vec3 b = schicht(uSpitze + d / vec2(uSeite, 1.0) + zitter(kk), min(kk, uS - 1.0) / max(1.0, uS - 1.0) * uSpanne);
  return verfahrenAlter(b, kk - 1.0) * (1.0 - 0.04 * min(kk, 8.0));
}
vec3 kegelSchnitte(vec2 u){
  vec2 p = (u - uSpitze) * vec2(uSeite, 1.0);
  float weit = length(max(uSpitze, 1.0 - uSpitze) * vec2(uSeite, 1.0));
  float B = weit / max(3.0, uS);
  // die Ringe sind von Hand gerissen: leicht unrund, jeder anders, nach aussen freier
  float r0 = length(p);
  float r = r0 + B * (0.55 + 0.9 * min(1.0, r0 / weit)) * (fbm(p * 1.6 + vec2(3.1, 7.7)) - 0.5);
  float ph = fract(uFT), rr = r / B - ph, k = floor(rr), inn = rr - k;
  float id = floor(r / B - uFT), id0 = id - k;                 // id: das Blatt, das mit dem Ring nach aussen wandert
  float kk = max(0.0, k + ph);
  vec2 pa = u * vec2(uSeite, 1.0);
  float vers = rissVersatz(pa) * 14.0;
  float zuInnen = inn * B / uPxH - vers, zuAussen = (1.0 - inn) * B / uPxH + vers;
  vec3 c;
  // der innere Ring liegt oben: zu seinem Rand hin ist dieser Ring das untere Blatt
  if (zuInnen < zuAussen && k >= 0.0) c = riss(ringBlatt(u, p, max(0.0, kk - 1.0), k < 0.5 ? -1.0 : id - 1.0), ringBlatt(u, p, kk, id), -zuInnen, pa, id - 1.0);
  else c = riss(ringBlatt(u, p, kk, k < -0.5 ? -1.0 : id), ringBlatt(u, p, kk + 1.0, id + 1.0), zuAussen, pa, id);
  return spitzePunkt(c, u);
}
// B, der Abgrund: das Bild steckt Rahmen in Rahmen in sich selbst; jeder Rahmen ein älteres Plakat, gerissen, das innere oben
vec3 rahmenBlatt(vec2 d, float R, float kk, float id){
  vec3 b = schicht(vec2(0.5) + d / R, clamp(kk / (max(3.0, uS) - 1.0), 0.0, 1.0) * uSpanne);
  return verfahrenAlter(b, kk - 1.0) * (1.0 - 0.04 * min(kk, 8.0));
}
vec3 kegelAbgrund(vec2 u){
  vec2 d = u - uSpitze;
  float r = 2.0 * max(abs(d.x), abs(d.y)) + 1e-5;
  float rmax = 2.0 * max(max(uSpitze.x, 1.0 - uSpitze.x), max(uSpitze.y, 1.0 - uSpitze.y));
  float rmin = 0.03, S = max(3.0, uS), lz = log(rmax / rmin) / S;
  float ph = fract(uFT), L = log(r / rmin) / lz - ph, k = floor(L);
  float id = floor(log(r / rmin) / lz - uFT);
  float R = rmin * exp((k + 1.0 + ph) * lz), Ri = R * exp(-lz), Ra = R * exp(lz);
  float kk = max(0.0, k + ph);
  float achse = abs(d.x) * uSeite > abs(d.y) ? uSeite : 1.0;
  vec2 pa = u * vec2(uSeite, 1.0);
  float vers = rissVersatz(pa) * 14.0;
  float zuInnen = (r - Ri) * 0.5 * achse / uPxH - vers, zuAussen = (R - r) * 0.5 * achse / uPxH + vers;
  float frisch = step(rmin * 0.6, r);
  vec3 c;
  if (zuInnen < zuAussen) c = riss(rahmenBlatt(d, Ri, max(0.0, kk - 1.0), id - 1.0), rahmenBlatt(d, R, kk, id), -zuInnen * frisch - (1.0 - frisch) * 1e3, pa, id - 1.0);
  else c = riss(rahmenBlatt(d, R, kk, id), rahmenBlatt(d, Ra, kk + 1.0, id + 1.0), zuAussen, pa, id);
  return spitzePunkt(c, u);
}
vec3 kegel(vec2 u){ return uKegel == 2 ? kegelAbgrund(u) : kegelSchnitte(u); }

// ---- Überschiebung (Resnais, Frankenthaler): ein fliessendes Feld, in Schichten geschnitten; ältere liegen oben ----
// steht das Bild mit Saalschwarz daneben (Rechner, Hochformat), bleiben verschobene Schichten in seinem Rahmen: gespiegelt statt schwarz
float imMaske(vec2 u){ vec2 d = min(u - uRahmen.xy, uRahmen.zw - u) / vec2(uPxH * uSeite, uPxH); return smoothstep(-0.5, 0.5, min(d.x, d.y)); }
vec3 lage(vec2 u, float k){
  vec2 schub = vec2(cos(k * 2.4), sin(k * 2.4)) * 0.012 * k + uGleit * k / uS;
  float ak = k / max(1.0, uS - 1.0);
  vec3 c = alt(schicht(imR(u + schub), lagVon(k)), ak * 0.8);
  // kaum getönt, wie verdünnte Farbe in roher Leinwand: Ocker, Rosé, Blaugrau, Gelb; die Gegenwart bleibt neutral
  float m = mod(k, 4.0);
  vec3 ton = m < 1. ? vec3(1.07,.98,.88) : m < 2. ? vec3(1.06,.94,.96) : m < 3. ? vec3(.93,.98,1.07) : vec3(1.06,1.03,.9);
  return c * mix(vec3(1.0), ton, step(0.5, k));
}
vec3 ueberschiebung(vec2 u){
  vec2 p = (u + uSchub) * vec2(uSeite, 1.0) * 1.1;
  vec2 wq = vec2(fbm(p + vec2(1.7, 0.0) + uFT * 0.05), fbm(p + vec2(9.2, 3.1) - uFT * 0.04));
  float f = fbm(p + 2.1 * wq + vec2(uFT * 0.03, 0.0));
  float S = uS, x = f * 8.0 + uFT * 0.05, fx = max(fwidth(x), 1e-5);
  float kx = floor(x), w = x - kx;
  float hiK = w > 0.5 ? kx + 1.0 : kx;                 // an der nächsten Grenze: die ältere Schicht liegt oben
  float s = (x - hiK) / fx;                             // Abstand zur Grenze in Bildpunkten, > 0 auf der älteren Seite
  float dIm = abs(s) * uPxH;                            // derselbe Abstand in Bildhöhen
  vec3 lo = lage(u, mod(hiK - 1.0, S)), hi = lage(u, mod(hiK, S));
  // die obere Schicht ist eine Lasur: die untere scheint ein wenig durch
  vec3 oben = mix(lo, hi, 0.84);
  oben *= 1.0 - 0.42 * exp(-pow(dIm / 0.0022, 2.0));          // am Rand sammelt sich das Pigment zu einer feinen Linie
  oben *= 1.0 + 0.07 * exp(-dIm / 0.03);                       // dahinter hell, wie getränkte Leinwand
  vec3 unten = lo * (1.0 - 0.28 * exp(-dIm / 0.012));           // die überschobene Schicht liegt im Schatten
  return mix(unten, oben, smoothstep(-0.75, 0.75, s));
}

// ---- Entwürfe für eine feinere Überschiebung (?ueber=1 Lasur, 2 Marmorierung, 3 Achat) ----
float feld(vec2 u){   // das fliessende Feld der Überschiebung, x zählt die Schichten
  vec2 p = (u + uSchub) * vec2(uSeite, 1.0) * 1.1;
  vec2 wq = vec2(fbm(p + vec2(1.7, 0.0) + uFT * 0.05), fbm(p + vec2(9.2, 3.1) - uFT * 0.04));
  return fbm(p + 2.1 * wq + vec2(uFT * 0.03, 0.0)) * 8.0 + uFT * 0.05;
}
// 1 Lasur (Frankenthaler, soak-stain): jede ältere Zeit ist verdünnte, leuchtende Farbe in roher Leinwand.
// Die Lachen liegen durchscheinend übereinander und mischen sich, wo sie sich decken. Am Rand steht das Pigment
// in einer dunklen, an- und abschwellenden Linie; innen folgen ihr feine Fliesslinien, wo das Wasser zurückwich;
// aussen ein heller Hof, wo das Wasser weiter lief als die Farbe. Die Fasern der Leinwand saugen den Rand aus.
vec3 lasur(vec2 u){
  vec2 p = u * vec2(uSeite, 1.0);
  float x0 = feld(u), fx = max(fwidth(x0), 1e-5);
  float faser = (rausch(p * vec2(520.0, 70.0)) - 0.5) * 0.7 + (rausch(p * vec2(80.0, 610.0)) - 0.5) * 0.5;
  float x = x0 + faser * fx * 3.0 + (fbm(p * 9.0) - 0.5) * fx * 10.0;
  float S = uS, k = floor(x), w = x - k;
  float korn = rausch(p * 900.0);
  vec3 leinwand = vec3(0.95, 0.92, 0.86) * (0.985 + 0.015 * sin(p.x * 1400.0) * sin(p.y * 1400.0));
  // unten die Gegenwart, hell von der Leinwand getragen
  vec3 jetzt = schicht(u, 0.0);
  vec3 c = mix(leinwand, 0.22 + 0.78 * jetzt, 0.5);
  vec3 tonOben = vec3(1.0);
  for (int j = 1; j >= 0; j--) {
    float kk = k - float(j);
    if (kk < 0.5) continue;
    float km = mod(kk, S);
    vec2 schub = vec2(cos(km * 2.4), sin(km * 2.4)) * 0.01 * km + uGleit * km / S;
    vec3 bild = schicht(imR(u + schub), lagVon(km));
    // je Lache ein Pigment (Krapp, Ultramarin, Siena, Indigo, Ocker), das ältere Bild als Zweiton:
    // seine Tiefen im Pigment, seine Lichter das Papier. Kein Gelb über Blau, darum nie grün.
    float m = mod(km, 5.0);
    vec3 ton = m < 1. ? vec3(0.62,0.13,0.2) : m < 2. ? vec3(0.16,0.22,0.6) : m < 3. ? vec3(0.66,0.3,0.12) : m < 4. ? vec3(0.3,0.17,0.42) : vec3(0.72,0.5,0.16);
    float L = pow(clamp(lum(bild), 0.0, 1.0), 0.8);
    vec3 zweiton = mix(ton * (0.55 + 0.25 * korn), leinwand, L);
    float deck = (j == 0 ? 0.72 : 0.16) * (0.92 + 0.16 * korn);
    c = mix(c, zweiton * mix(vec3(1.0), c, 0.35), deck);     // lasierend: das Untere scheint durch
    if (j == 0) tonOben = ton;
  }
  if (k >= 0.5) {
    float innen = w / fx;                                     // Bildpunkte vom Rand der obersten Lache nach innen
    vec2 pr = p * 7.0 + k * 1.7;
    // der Rand: dunkles Pigment, an- und abschwellend
    float staerke = 0.9 + 2.4 * rausch(pr);
    float rand = 1.0 - smoothstep(staerke * 0.5, staerke * 0.5 + 1.1, innen);
    // Fliesslinien: wo das Wasser zurückwich, blieb je eine feine Spur, nach innen schwächer und weiter
    float lz = log(1.0 + innen / 7.0) * 3.0 + 0.5 * rausch(pr * 0.6);
    float lf = abs(fract(lz) - 0.5) * 2.0, lw = fwidth(lz) * 1.3;
    float spur = (1.0 - smoothstep(lw * 0.6, lw * 1.8, 1.0 - lf)) * exp(-innen / 120.0) * smoothstep(3.0, 6.0, innen);
    vec3 pigment = tonOben * 0.75;
    c = mix(c, pigment, clamp(rand * 0.85 + spur * 0.55, 0.0, 1.0));
    c = mix(c, c * (0.4 + 0.6 * tonOben / max(max(tonOben.r, tonOben.g), tonOben.b)), 0.3 * exp(-innen / 10.0));   // der Saum ist satter als das Innere
  }
  // der helle Hof vor dem Rand
  float aussen = (1.0 - w) / fx;
  c = mix(c, leinwand * 1.03, 0.22 * exp(-aussen / 6.0) * step(0.5, k + 1.0));
  return c;
}
// 2 Marmorierung (Ebru): die Schichten liegen als Farbtropfen auf dem Wasser und werden mit einem Kamm gezogen;
// jede Linie ist eine Grenze zwischen zwei Zeiten
vec2 kamm(vec2 q, vec2 richtung, float abstand, float weg, float lambda){
  // ein Zinken je Abstand quer zur Richtung, der die Farbe mitnimmt (Jaffer, mathematisches Marmorieren); rückwärts gerechnet
  vec2 quer = vec2(-richtung.y, richtung.x);
  float s = dot(q, quer), d = abs(fract(s / abstand + 0.5) - 0.5) * abstand;
  return q - richtung * weg * lambda / (d + lambda);
}
vec3 marmor(vec2 u){
  vec2 q = (u + uSchub) * vec2(uSeite, 1.0);
  float t = uFT * 0.15;
  // zwei Kammzüge, der zweite hin und zurück (gel-git), dazu ein langsamer Wirbel
  q = kamm(q, vec2(0.0, 1.0), 0.06, 0.06 + 0.02 * sin(t), 0.012);
  q = kamm(q + vec2(0.03, 0.0), vec2(1.0, 0.0), 0.12, 0.09 * sin(t * 0.7 + 1.0), 0.02);
  vec2 m = vec2(0.5 * uSeite, 0.5); float r = length(q - m); float wi = 0.6 * exp(-r * 3.0);
  q = m + mat2(cos(wi), sin(wi), -sin(wi), cos(wi)) * (q - m);
  // die Tropfen: konzentrische Ringe, einer in den anderen gesetzt
  float x = 0.0;
  for (int i = 0; i < 4; i++) {
    vec2 c0 = vec2(hs(vec2(float(i), 3.1)) * uSeite, hs(vec2(float(i), 7.7)));
    x = max(x, (0.42 - length(q - c0)) * 22.0);
  }
  x = max(x, q.y * 3.0 + 0.5);
  float S = uS, fx = max(fwidth(x), 1e-5), k = floor(x), w = x - k;
  float km = mod(k, S);
  vec2 schub = uGleit * km / S;
  vec3 c = alt(schicht(imR(u + schub), lagVon(km)), km / max(1.0, S - 1.0) * 0.8);
  float mm = mod(km, 4.0);
  vec3 ton = mm < 1. ? vec3(1.0) : mm < 2. ? vec3(1.06,.95,.9) : mm < 3. ? vec3(.92,.97,1.06) : vec3(1.05,1.0,.88);
  c *= ton;
  // die Grenzen: dunkel und haarfein, mit einem lichten Hof, wie Farbe, die das Öl verdrängt
  float d = min(w, 1.0 - w) / fx;
  c *= 1.0 - 0.55 * exp(-pow(d / 0.9, 2.0));
  c = mix(c, vec3(0.97, 0.94, 0.88), 0.18 * exp(-pow((d - 2.2) / 0.9, 2.0)));
  return c;
}
// 3 Achat: wo eine Schicht über die andere geschoben ist, entsteht ein Band aus feinen Lagen, jede eine Zwischenzeit,
// durchscheinend wie Chalzedon, einzelne Lagen rot wie Karneol (Rot ist Zeit), poliert
vec3 achat(vec2 u){
  vec2 p = u * vec2(uSeite, 1.0);
  float x = feld(u), fx = max(fwidth(x), 1e-5);
  float S = uS, k = floor(x), w = x - k;
  float km = mod(k, S);
  vec2 schub = vec2(cos(km * 2.4), sin(km * 2.4)) * 0.01 * km + uGleit * km / S;
  vec3 c = alt(schicht(imR(u + schub), lagVon(km)), km / max(1.0, S - 1.0) * 0.8);
  // das Band: im letzten Teil jeder Schicht viele feine Lagen, nach aussen dichter, ungleich breit wie im Stein
  float b = smoothstep(0.5, 1.0, w);
  float n = 8.0 + 3.0 * mod(km, 3.0);
  float lz = pow(b, 1.5) * n + 0.7 * (rausch(p * 2.3 + km) - 0.5) * b;
  float lf = fract(lz), li = floor(lz);
  float zw = km + b;                                         // die Zwischenzeit dieser Lage
  vec2 schub2 = vec2(cos(zw * 2.4), sin(zw * 2.4)) * 0.01 * zw + uGleit * zw / S;
  vec3 zwischen = alt(schicht(imR(u + schub2), lagVon(zw)), zw / max(1.0, S - 1.0) * 0.8);
  float h = hs(vec2(li, km));
  vec3 kuehl = zwischen * vec3(0.8, 0.84, 0.9) + vec3(0.03, 0.035, 0.045);
  vec3 milch = mix(zwischen, vec3(0.88, 0.9, 0.92), 0.36);
  vec3 karneol = mix(zwischen, zwischen * vec3(1.06, 0.7, 0.6) + vec3(0.04, 0.0, 0.0), 0.7);
  vec3 chalz = h < 0.12 ? karneol : mod(li, 2.0) < 1.0 ? kuehl : milch;
  // innerhalb jeder Lage ein leichter Verlauf, wie Licht, das in den Stein dringt
  chalz *= 0.9 + 0.14 * smoothstep(0.0, 1.0, lf);
  float lfw = max(fwidth(lz), 1e-4);
  float linie = 1.0 - smoothstep(0.0, lfw * 1.3, min(lf, 1.0 - lf));
  chalz *= 1.0 - 0.3 * linie;
  c = mix(c, chalz, smoothstep(0.0, 0.1, b) * 0.9);
  // Politur: ein weicher Glanz quer über die Bänder
  vec2 g = vec2(dFdx(x), dFdy(x)) / fx;
  float glanz = pow(max(0.0, dot(normalize(g + 1e-5), normalize(vec2(-0.6, 0.8)))), 8.0) * b;
  c += vec3(0.09, 0.09, 0.1) * glanz;
  // die Grenze zur älteren Schicht: scharf, dunkel, darüber ein lichter Hauch
  float d = (1.0 - w) / fx;
  c *= 1.0 - 0.6 * exp(-pow(d / 0.9, 2.0));
  c = mix(c, vec3(0.95, 0.94, 0.92), 0.12 * exp(-pow(w / fx / 1.6, 2.0)));
  return c;
}

// ---- Überschiebung als Décollage (?ueber=4, Standard): ältere Plakate sind über jüngere geschoben ----
vec3 ueberBlatt(vec2 u, float km){
  vec2 schub = vec2(cos(km * 2.4), sin(km * 2.4)) * 0.012 * km + uGleit * km / uS + zitter(km);
  vec3 b = schicht(imR(u + schub), lagVon(km));
  return verfahren(b, km < 0.5 ? 0.0 : verfahrenNr(km - 1.0));
}
vec3 collage(vec2 u){
  vec2 p = u * vec2(uSeite, 1.0);
  float x0 = feld(u), fx = max(fwidth(x0), 1e-5);
  float x = x0 + rissVersatz(p) * fx * 14.0;
  float S = uS, kx = floor(x), w = x - kx;
  float hiK = w > 0.5 ? kx + 1.0 : kx;                 // an der nächsten Grenze liegt die ältere Schicht oben
  float s0 = (x - hiK) / fx;                            // Bildpunkte, > 0 auf dem älteren Blatt
  return riss(ueberBlatt(u, mod(hiK, S)), ueberBlatt(u, mod(hiK - 1.0, S)), s0, p, hiK);
}
// 5 Techniken: jede Zeit in einem anderen Verfahren, als lägen die Bildtechniken selbst übereinander:
// Gegenwart als Foto, dann Kupferstich, Raster, Holzschnitt, Cyanotypie; die Grenzen doppelt, schwarz und Gold
vec3 technik(vec2 u, float km){
  vec2 schub = vec2(cos(km * 2.4), sin(km * 2.4)) * 0.01 * km + uGleit * km / uS;
  vec3 b = schicht(imR(u + schub), lagVon(km));
  float l = lum(b);
  vec2 q = u * vec2(uSeite, 1.0) / max(uPxH, 1e-5);           // Bildpunkte
  float m = mod(km, 5.0);
  vec3 papier = vec3(0.95, 0.92, 0.85);
  if (m < 0.5) return b;
  if (m < 1.5) {
    // Kupferstich: Linien schräg, je dunkler, desto breiter; im Schatten eine zweite Lage quer
    float a = dot(q, vec2(0.866, 0.5)) / 5.0, f1 = abs(fract(a) - 0.5) * 2.0, fw = fwidth(a) * 2.0;
    float t1 = 1.0 - smoothstep((1.0 - l) * 0.9 - fw, (1.0 - l) * 0.9 + fw, f1);
    float a2 = dot(q, vec2(-0.5, 0.866)) / 5.0, f2 = abs(fract(a2) - 0.5) * 2.0;
    float t2 = (1.0 - smoothstep((0.55 - l) * 1.2 - fw, (0.55 - l) * 1.2 + fw, f2)) * step(l, 0.55);
    return mix(papier, vec3(0.16, 0.1, 0.07), max(1.0 - (1.0 - t1) * (1.0 - t2), 0.0));
  }
  if (m < 2.5) {
    // Raster: Punkte im gedrehten Gitter, gross im Dunkeln, in der Farbe des Bildes
    vec2 r = mat2(0.966, 0.259, -0.259, 0.966) * q / 7.0, f = fract(r) - 0.5;
    float rad = sqrt(1.0 - l) * 0.62, d = length(f), fw = fwidth(r.x) * 1.2;
    return mix(papier, b * 0.55, 1.0 - smoothstep(rad - fw, rad + fw, d));
  }
  if (m < 3.5) {
    // Holzschnitt: schwarz oder Papier, die Schwelle zittert in Hohlbeitel-Spuren; ein Rot, wo es hell wird
    float spur = sin(dot(q, vec2(0.2, 0.98)) / 3.2 + 4.0 * rausch(q / 60.0)) * 0.12;
    float s1 = smoothstep(-0.03, 0.03, l + spur - 0.45);
    vec3 c = mix(vec3(0.07, 0.06, 0.06), papier, s1);
    return mix(c, vec3(0.78, 0.16, 0.11), (1.0 - smoothstep(-0.03, 0.03, l + spur - 0.78)) * s1 * 0.85);
  }
  // Cyanotypie: Preussischblau, das Licht als Papier
  return mix(vec3(0.04, 0.16, 0.38), vec3(0.86, 0.9, 0.93), smoothstep(0.08, 0.92, l));
}
vec3 techniken(vec2 u){
  float x = feld(u), fx = max(fwidth(x), 1e-5);
  float S = uS, k = floor(x), w = x - k;
  vec3 c = technik(u, mod(k, S));
  float d = min(w, 1.0 - w) / fx, seite = w < 0.5 ? 1.0 : -1.0;
  // die Grenze: eine schwarze Linie, daneben ein Goldfaden auf der älteren Seite
  c = mix(c, vec3(0.05), 1.0 - smoothstep(0.6, 1.4, d));
  float gold = (1.0 - smoothstep(0.5, 1.2, abs(d - 3.0))) * step(0.0, seite);
  c = mix(c, vec3(0.86, 0.68, 0.32), gold * 0.9);
  return c;
}
// 6 Tusche (Suminagashi): Tusche treibt auf dem Wasser in Ringen; jede Zeit ist ein Ring aus vielen Pinsellinien
// verschiedener Stärke; dazwischen abwechselnd Bild und Papier, das Bild nur noch als Hauch
vec3 tusche(vec2 u){
  vec2 p = u * vec2(uSeite, 1.0);
  float x = feld(u), fx = max(fwidth(x), 1e-5);
  float S = uS, k = floor(x), w = x - k, km = mod(k, S);
  vec2 schub = uGleit * km / S;
  vec3 bild = schicht(imR(u + schub), lagVon(km));
  vec3 papier = vec3(0.95, 0.93, 0.88);
  float l = lum(bild);
  vec3 grau = mix(vec3(0.14, 0.13, 0.13), papier, smoothstep(0.05, 0.95, l));
  vec3 c = km < 0.5 ? bild : mod(km, 2.0) < 1.0 ? mix(papier, grau, 0.35) : mix(grau, papier, 0.15);
  // die Ringe: sechs je Schicht, ihre Stärke schwillt und verebbt wie ein Pinselzug
  float n = 6.0, r = w * n, rf = fract(r), ri = floor(r);
  float druck = 0.4 + 1.4 * rausch(vec2(ri * 3.1 + km * 7.0, 0.0) + p * 1.6);
  float d = min(rf, 1.0 - rf) / max(fwidth(r), 1e-5);
  float tinte = 1.0 - smoothstep(druck * 0.5, druck * 0.5 + 1.0, d);
  c = mix(c, vec3(0.08, 0.07, 0.07), tinte * 0.88 * step(0.5, km + w));
  // ein einziger roter Ring je Schicht: das Siegel der Zeit
  float rot = (1.0 - smoothstep(0.6, 1.5, abs(w - 0.5) / fx)) * step(0.5, km) * step(0.7, hs(vec2(km, 2.0)));
  c = mix(c, vec3(0.75, 0.16, 0.1), rot);
  return c;
}

void main(){
  vec3 c = uLesart == 0 ? kegel(v) : uLesart == 1 ? grabung(v) : uUeber == 1 ? lasur(v) : uUeber == 2 ? marmor(v) : uUeber == 3 ? achat(v) : uUeber == 4 ? collage(v) : uUeber == 5 ? techniken(v) : uUeber == 6 ? tusche(v) : ueberschiebung(v);
  if (uLesart == 2) c = mix(vec3(0.039, 0.039, 0.043), c, imMaske(v));
  vec2 sc = v * 2.0 - 1.0;
  c *= mix(0.62, 1.0, smoothstep(1.7, 0.4, length(sc * vec2(uSeite * 0.8, 1.0))));
  o = vec4(c, 1.0);
}`;

// ---------- Nachbearbeitung: Leuchten und glatte Kanten (wie im Kristall), dazu Filmkorn ----------
const FS_HELL = `#version 300 es
precision highp float; in vec2 v; out vec4 o; uniform sampler2D uQ; uniform vec2 uPx;
void main(){
  vec3 c = 0.25 * (texture(uQ, v + uPx * vec2(-1, -1)).rgb + texture(uQ, v + uPx * vec2(1, -1)).rgb
                 + texture(uQ, v + uPx * vec2(-1, 1)).rgb + texture(uQ, v + uPx * vec2(1, 1)).rgb);
  float l = max(c.r, max(c.g, c.b));
  o = vec4(c * smoothstep(0.7, 1.2, l), 1.0);
}`;
const FS_WEICH = `#version 300 es
precision highp float; in vec2 v; out vec4 o; uniform sampler2D uQ; uniform vec2 uRichtung;
void main(){
  vec3 c = texture(uQ, v).rgb * 0.2270270270;
  c += (texture(uQ, v + uRichtung * 1.3846153846).rgb + texture(uQ, v - uRichtung * 1.3846153846).rgb) * 0.3162162162;
  c += (texture(uQ, v + uRichtung * 3.2307692308).rgb + texture(uQ, v - uRichtung * 3.2307692308).rgb) * 0.0702702703;
  o = vec4(c, 1.0);
}`;
const FS_ZUSAMMEN = `#version 300 es
precision highp float; in vec2 v; out vec4 o;
uniform sampler2D uSzene, uGlow; uniform vec2 uPx; uniform float uGlowStaerke, uT;
float lu(vec3 c){ return dot(c, vec3(0.299, 0.587, 0.114)); }
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
  c += texture(uGlow, v).rgb * uGlowStaerke;
  c += (h(dot(v, vec2(12.9898, 78.233)) * 100.0 + uT) - 0.5) * 0.035;
  o = vec4(c, 1.0);
}`;

function programm(vs, fs) {
  const mk = (typ, src) => { const s = gl.createShader(typ); gl.shaderSource(s, src); gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s)); return s; };
  const p = gl.createProgram(); gl.attachShader(p, mk(gl.VERTEX_SHADER, vs)); gl.attachShader(p, mk(gl.FRAGMENT_SHADER, fs)); gl.bindAttribLocation(p, 0, 'a');
  gl.linkProgram(p); if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(p)); return p;
}
const orte = (p, namen) => Object.fromEntries(namen.map((n) => [n, gl.getUniformLocation(p, n)]));

let prog, progGrube, progHell, progWeich, progZusammen, ort, ortG, ortH, ortW, ortZ, halbFloat = false;
const ziele = {};
function zielBauen(name, b, hh) {
  const z = ziele[name] || (ziele[name] = { tex: gl.createTexture(), fb: gl.createFramebuffer() });
  if (z.b === b && z.h === hh) return z;
  z.b = b; z.h = hh;
  gl.bindTexture(gl.TEXTURE_2D, z.tex);
  gl.texImage2D(gl.TEXTURE_2D, 0, halbFloat ? gl.RGBA16F : gl.RGBA8, b, hh, 0, gl.RGBA, halbFloat ? gl.HALF_FLOAT : gl.UNSIGNED_BYTE, null);
  for (const [k, w] of [[gl.TEXTURE_MIN_FILTER, gl.LINEAR], [gl.TEXTURE_MAG_FILTER, gl.LINEAR], [gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE], [gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE]]) gl.texParameteri(gl.TEXTURE_2D, k, w);
  gl.bindFramebuffer(gl.FRAMEBUFFER, z.fb);
  gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, z.tex, 0);
  if (halbFloat && gl.checkFramebufferStatus(gl.FRAMEBUFFER) !== gl.FRAMEBUFFER_COMPLETE) {
    halbFloat = false; spur('kein HalfFloat-Ziel'); for (const n in ziele) ziele[n].b = 0; gl.bindFramebuffer(gl.FRAMEBUFFER, null); return zielBauen(name, b, hh);
  }
  gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  return z;
}
function zeichneFlaeche() { gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4); }
function nachbearbeiten(t) {
  const B = leinwand.width, H = leinwand.height, b4 = Math.max(1, Math.round(B / 4)), h4 = Math.max(1, Math.round(H / 4));
  const szene = ziele.szene, gA = zielBauen('glowA', b4, h4), gB = zielBauen('glowB', b4, h4);
  gl.activeTexture(gl.TEXTURE1);
  gl.bindFramebuffer(gl.FRAMEBUFFER, gA.fb); gl.viewport(0, 0, b4, h4);
  gl.useProgram(progHell); gl.bindTexture(gl.TEXTURE_2D, szene.tex);
  gl.uniform1i(ortH.uQ, 1); gl.uniform2f(ortH.uPx, 1.5 / B, 1.5 / H); zeichneFlaeche();
  gl.useProgram(progWeich); gl.uniform1i(ortW.uQ, 1);
  gl.bindFramebuffer(gl.FRAMEBUFFER, gB.fb); gl.bindTexture(gl.TEXTURE_2D, gA.tex); gl.uniform2f(ortW.uRichtung, 1.6 / b4, 0); zeichneFlaeche();
  gl.bindFramebuffer(gl.FRAMEBUFFER, gA.fb); gl.bindTexture(gl.TEXTURE_2D, gB.tex); gl.uniform2f(ortW.uRichtung, 0, 1.6 / h4); zeichneFlaeche();
  gl.bindFramebuffer(gl.FRAMEBUFFER, null); gl.viewport(0, 0, B, H);
  gl.useProgram(progZusammen);
  gl.activeTexture(gl.TEXTURE1); gl.bindTexture(gl.TEXTURE_2D, szene.tex);
  gl.activeTexture(gl.TEXTURE2); gl.bindTexture(gl.TEXTURE_2D, gA.tex);
  gl.uniform1i(ortZ.uSzene, 1); gl.uniform1i(ortZ.uGlow, 2);
  gl.uniform2f(ortZ.uPx, 1 / B, 1 / H); gl.uniform1f(ortZ.uGlowStaerke, 0.45); gl.uniform1f(ortZ.uT, t % 100);
  zeichneFlaeche();
  gl.activeTexture(gl.TEXTURE0);
}

let zeitTex = null, pufferB = 0, pufferH = 0, scharfTex = null, scharfB = 0, scharfH = 0;
const grubeZ = [null, null]; let grubeB = 0, grubeH = 0, grubeNr = 0;
if (gl) {
  halbFloat = !!gl.getExtension('EXT_color_buffer_float');
  prog = programm(VS, FS); progGrube = programm(VS, FS_GRUBE);
  progHell = programm(VS, FS_HELL); progWeich = programm(VS, FS_WEICH); progZusammen = programm(VS, FS_ZUSAMMEN);
  const buf = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
  gl.enableVertexAttribArray(0); gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
  ort = orte(prog, ['uZeit', 'uScharf', 'uGrube', 'uKopf', 'uN', 'uSpanne', 'uS', 'uSeite', 'uT', 'uFT', 'uLesart', 'uSpitze', 'uSchub', 'uGleit', 'uSprung', 'uRand', 'uKegel', 'uPxH', 'uUeber', 'uRahmen', 'uZitter']);
  ortG = orte(progGrube, ['uAlt', 'uPx', 'uStempel', 'uStempelR', 'uN', 'uAb', 'uSeite']);
  ortH = orte(progHell, ['uQ', 'uPx']); ortW = orte(progWeich, ['uQ', 'uRichtung']);
  ortZ = orte(progZusammen, ['uSzene', 'uGlow', 'uPx', 'uGlowStaerke', 'uT']);
  spur('Grafik bereit');
}

// Aufnahmeleinwände: schneiden die Quelle passend zu und spiegeln die Selfie-Kamera
const fang = document.createElement('canvas');
const fctx = fang.getContext('2d', { alpha: false });
const scharf = document.createElement('canvas');
const sctx = scharf.getContext('2d', { alpha: false });

// Auflösung passt sich an: ruckelt es, rechnet das Bild mit weniger Bildpunkten (bis zur Hälfte)
let aufloesung = 1, messung = [], letzteAnpassung = 0;
const FEST = new URLSearchParams(location.search).has('fest');   // feste Auflösung, für Standbilder und Prüfungen
function tempoMessen(ms, dt) {
  if (aufnehmer || document.hidden || FEST) { messung = []; return; }
  messung.push(dt);
  if (messung.length < 30 || ms - letzteAnpassung < 1500) return;
  messung.sort((a, b) => a - b);
  const mitte = messung[15]; messung = [];
  let neu = aufloesung;
  if (mitte > 24) neu = Math.max(0.5, aufloesung * 0.82);
  else if (mitte < 17.5 && aufloesung < 1) neu = Math.min(1, aufloesung * 1.12);
  if (neu !== aufloesung) { aufloesung = neu; letzteAnpassung = ms; groesse(); spur('Auflösung ' + aufloesung.toFixed(2)); }
}
function texParameter(ziel) {
  for (const [k, w] of [[gl.TEXTURE_MIN_FILTER, gl.LINEAR], [gl.TEXTURE_MAG_FILTER, gl.LINEAR], [gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE], [gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE]]) gl.texParameteri(ziel, k, w);
}
function groesse() {
  const dpr = Math.min(devicePixelRatio || 1, MAX_DPR) * aufloesung;
  const b = Math.round(innerWidth * dpr), hh = Math.round(innerHeight * dpr);
  if (leinwand.width !== b || leinwand.height !== hh) { leinwand.width = b; leinwand.height = hh; }
  if (!gl) return;
  const seite = innerWidth / innerHeight;
  const pb = seite >= 1 ? LANGE_SEITE : Math.round(LANGE_SEITE * seite);
  const ph = seite >= 1 ? Math.round(LANGE_SEITE / seite) : LANGE_SEITE;
  if (pb !== pufferB || ph !== pufferH) {
    pufferB = pb; pufferH = ph; fang.width = pb; fang.height = ph;
    if (zeitTex) gl.deleteTexture(zeitTex);
    zeitTex = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D_ARRAY, zeitTex);
    gl.texStorage3D(gl.TEXTURE_2D_ARRAY, 1, gl.RGBA8, pb, ph, SCHICHTEN);
    texParameter(gl.TEXTURE_2D_ARRAY);
    gefuellt = false;
  }
  const lang = Math.min(SCHARF_SEITE, Math.max(LANGE_SEITE, Math.round(Math.max(innerWidth, innerHeight) * Math.min(devicePixelRatio || 1, 2))));
  const sb = seite >= 1 ? lang : Math.round(lang * seite), sh = seite >= 1 ? Math.round(lang / seite) : lang;
  if (sb !== scharfB || sh !== scharfH) {
    scharfB = sb; scharfH = sh; scharf.width = sb; scharf.height = sh;
    if (!scharfTex) scharfTex = gl.createTexture();
    gl.activeTexture(gl.TEXTURE3); gl.bindTexture(gl.TEXTURE_2D, scharfTex);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, sb, sh, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
    texParameter(gl.TEXTURE_2D);
    gl.activeTexture(gl.TEXTURE0);
  }
  // die Grube: klein, ihre Werte werden weich gelesen; das Seitenverhältnis wie der Bildschirm
  const gb = seite >= 1 ? GRUBE_SEITE : Math.round(GRUBE_SEITE * seite), gh = seite >= 1 ? Math.round(GRUBE_SEITE / seite) : GRUBE_SEITE;
  if (gb !== grubeB || gh !== grubeH) {
    grubeB = gb; grubeH = gh;
    for (let i = 0; i < 2; i++) { const z = zielBauen('grube' + i, gb, gh); grubeZ[i] = z; gl.bindFramebuffer(gl.FRAMEBUFFER, z.fb); gl.clearColor(0, 0, 0, 1); gl.clear(gl.COLOR_BUFFER_BIT); }
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    abbild.fill(0);
  }
  if (fotos.length) fotoBuehneGroesse();
}
addEventListener('resize', groesse);

// ---------- Quellen (wie im Kristall) ----------
let quelle = null, spiegelnQuelle = false;
const videoEl = document.createElement('video');
videoEl.muted = true; videoEl.playsInline = true; videoEl.loop = true;

// Hauptkamera (Rückseite) zuerst; «Kamera wenden» schaltet auf die Selfie-Kamera und zurück
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
  videoUrl = URL.createObjectURL(datei); videoEl.src = videoUrl;   // die Datei selbst, in voller Qualität
  videoEl.play().then(() => { quelle = videoEl; spiegelnQuelle = false; starten(); }).catch(() => melden(TEXTE[sprache].keineKamera));
}

// Beispiele: Christians Porträt «Wan, Pendel» und «Infinite Mantra» (liegen beim Kristall); jedes Tippen nimmt das nächste
const BEISPIELE = ['../kristall/beispiel.mp4?v=2', '../kristall/mantra.mp4?v=1'];
function beispielStarten(e) {
  let nr = 0;
  try { nr = e ? (+(localStorage.getItem('schichten.beispiel') || 0)) % BEISPIELE.length : 0; localStorage.setItem('schichten.beispiel', String(nr + 1)); } catch {}
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

// Fotos: ein Foto hat keine Zeit, also bekommt es eine. Eine langsame Fahrt durch das Foto, mehrere lösen einander ab;
// so legen sich frühere Ausschnitte und frühere Fotos als Schichten unter die Gegenwart.
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
      // Telefonregel: höchstens 2400 Punkte
      const s = Math.min(1, 2400 / Math.max(roh.width, roh.height));
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

let rahmen = [0, 0, 1, 1];   // wo das Bild steht, in Anteilen der Leinwand
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
function scharfFangen() {
  if (!scharfTex || !malenIn(sctx, scharfB, scharfH)) return;
  gl.activeTexture(gl.TEXTURE3); gl.bindTexture(gl.TEXTURE_2D, scharfTex);
  gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, gl.RGBA, gl.UNSIGNED_BYTE, scharf);
  gl.activeTexture(gl.TEXTURE0);
}

// ---------- Regler und Lesarten ----------
let tiefe = 6, schichtZahl = 7, fluss = 0.35, lesart = 1;
$('r-tiefe').addEventListener('input', (e) => { tiefe = +e.target.value; });
$('r-schichten').addEventListener('input', (e) => { schichtZahl = +e.target.value; });
$('r-fluss').addEventListener('input', (e) => { fluss = +e.target.value; });
let titelUhr = 0;
function lesartWaehlen(nr, still) {
  lesart = nr;
  document.querySelectorAll('[data-lesart]').forEach((b) => b.setAttribute('aria-pressed', String(+b.dataset.lesart === nr)));
  $('r-lesart').value = String(nr);
  document.querySelector('.raender:not(.stoffe)').hidden = nr !== 1;
  document.querySelector('.stoffe').hidden = nr !== 2;
  lesartText();
  if (still) return;
  const z = TEXTE[sprache].lesarten[nr], g = $('geste');
  g.textContent = z.titel + ' · ' + z.wer; g.hidden = false; g.classList.remove('weg');
  clearTimeout(titelUhr); titelUhr = setTimeout(() => g.classList.add('weg'), 3200);
  glosse('lesarten');
  if (nr === 0) klangSprung();
  spur('Lesart ' + nr);
}
function lesartText() {
  const z = TEXTE[sprache].lesarten[lesart];
  $('b-lesart-titel').textContent = z.titel + ' · ' + z.wer;
  $('b-lesart-text').textContent = z.text;
}
document.querySelectorAll('[data-lesart]').forEach((b) => b.addEventListener('click', () => lesartWaehlen(+b.dataset.lesart)));
$('r-lesart').addEventListener('input', (e) => { const nr = +e.target.value; if (nr !== lesart) lesartWaehlen(nr); });

// ---------- Die Grube: Stempel des Fingers, auf der Grafikkarte und als grobes Abbild für Klang und Anzeige ----------
const stempel = new Float32Array(16 * 4), stempelR = new Float32Array(16 * 2); let stempelN = 0;
const AB_B = 48, AB_H = 96, abbild = new Float32Array(AB_B * AB_H);   // grob genügt: Klang und die Zeitanzeige
const pinselRadius = () => 0.085 * (innerWidth < innerHeight ? 1 : 1.25);   // in Bildhöhen
function stempeln(x, y, menge, x0 = x, y0 = y) {
  // eine Strecke von (x0, y0) nach (x, y), in 0…1 (Leinwand, y nach oben); weiches Profil (1 − r²)²
  const r = pinselRadius();
  if (stempelN < 16) { stempel.set([x0, y0, x, y], stempelN * 4); stempelR.set([r, menge], stempelN * 2); stempelN++; }
  else {
    // zu viele Züge in einem Bild: der letzte wird verlängert, statt dass einer verloren geht
    const k = 15 * 4; stempel[k + 2] = x; stempel[k + 3] = y; stempelR[15 * 2 + 1] = Math.max(stempelR[15 * 2 + 1], menge);
  }
  const seite = innerWidth / innerHeight, ax = x0 * seite, bx = x * seite, abx = bx - ax, aby = y - y0, l2 = Math.max(1e-8, abx * abx + aby * aby);
  for (let j = 0; j < AB_H; j++) for (let i = 0; i < AB_B; i++) {
    const qx = (i + 0.5) / AB_B * seite, qy = (j + 0.5) / AB_H;
    const h = Math.min(1, Math.max(0, ((qx - ax) * abx + (qy - y0) * aby) / l2));
    const q = Math.hypot(qx - ax - abx * h, qy - y0 - aby * h) / r;
    if (q < 1) { const f = 1 - q * q; const k = j * AB_B + i; abbild[k] = Math.min(1, abbild[k] + menge * f * f); }
  }
}
const abbildLesen = (x, y) => abbild[Math.min(AB_H - 1, Math.max(0, Math.floor(y * AB_H))) * AB_B + Math.min(AB_B - 1, Math.max(0, Math.floor(x * AB_B)))];
function grubeRechnen(dt) {
  const ab = fluss * fluss * 0.22 * dt;   // Fluss: wie schnell sich die Grube wieder füllt
  const alt = grubeZ[grubeNr], neu = grubeZ[1 - grubeNr];
  gl.bindFramebuffer(gl.FRAMEBUFFER, neu.fb); gl.viewport(0, 0, grubeB, grubeH);
  gl.useProgram(progGrube);
  gl.activeTexture(gl.TEXTURE4); gl.bindTexture(gl.TEXTURE_2D, alt.tex);
  gl.uniform1i(ortG.uAlt, 4); gl.uniform2f(ortG.uPx, 1 / grubeB, 1 / grubeH);
  gl.uniform4fv(ortG.uStempel, stempel); gl.uniform2fv(ortG.uStempelR, stempelR); gl.uniform1i(ortG.uN, stempelN); gl.uniform1f(ortG.uAb, ab); gl.uniform1f(ortG.uSeite, innerWidth / innerHeight);
  zeichneFlaeche();
  gl.activeTexture(gl.TEXTURE0);
  grubeNr = 1 - grubeNr; stempelN = 0;
  let summe = 0;
  for (let k = 0; k < abbild.length; k++) { const d = abbild[k]; abbild[k] = Math.max(0, d - ab * (0.4 + d)); summe += abbild[k]; }
  return summe / abbild.length;
}

// Nur im Vorspann gräbt eine unsichtbare Hand; sonst beginnt alles erst mit der Berührung (Christian, 19.11.2026)
let geisterStart = -1;
const GEISTER_DAUER = 2.6;
let geisterZug = 0;
const VORSPANN = new URLSearchParams(location.search).has('vorspann');   // für den vorgerechneten Film der Schwelle
// der Rand der Grabung: 4 Ornament mit Relief-Licht, 1 Relief, 2 Kintsugi, 3 Spektralsaum (0, die Haarlinie, nur mit ?rand=0)
const KEGEL = Math.max(1, Math.min(2, +(new URLSearchParams(location.search).get('kegel') ?? 1) || 1));   // Entwürfe für den Kegel
// der Stoff der Überschiebung: 3 Achat (Standard), 1 Lasur; ?ueber=0 der frühere Stand, 2 die Marmorierung (Entwürfe)
let ueber = 4;
try { const r = localStorage.getItem('schichten.stoff'); if (r === '1' || r === '3' || r === '4') ueber = +r; } catch {}
if (new URLSearchParams(location.search).has('ueber')) ueber = Math.max(0, Math.min(6, Math.round(+new URLSearchParams(location.search).get('ueber')) || 0));
function stoffWaehlen(nr, still) {
  ueber = nr;
  document.querySelectorAll('[data-stoff]').forEach((b) => b.setAttribute('aria-pressed', String(+b.dataset.stoff === nr)));
  if (still) return;
  try { localStorage.setItem('schichten.stoff', String(nr)); } catch {}
  spur('Stoff ' + nr);
}
document.querySelectorAll('[data-stoff]').forEach((b) => b.addEventListener('click', () => stoffWaehlen(+b.dataset.stoff)));
stoffWaehlen(ueber, true);
let rand = 5;
try { const r = localStorage.getItem('schichten.rand2'); if (r === '2' || r === '5') rand = +r; } catch {}   // wählbar: Riss, Kintsugi; die übrigen nur noch per ?rand
if (new URLSearchParams(location.search).has('rand')) rand = +new URLSearchParams(location.search).get('rand');
rand = Math.max(0, Math.min(5, Math.round(rand) || 0));
function randWaehlen(nr, still) {
  rand = nr;
  document.querySelectorAll('[data-rand]').forEach((b) => b.setAttribute('aria-pressed', String(+b.dataset.rand === nr)));
  if (still) return;
  try { localStorage.setItem('schichten.rand2', String(nr)); } catch {}
  spur('Rand ' + nr);
}
document.querySelectorAll('[data-rand]').forEach((b) => b.addEventListener('click', () => randWaehlen(+b.dataset.rand)));
randWaehlen(rand, true);
function geisterGraben(t, dt) {
  if (geisterStart < 0) return;
  const u = (t - geisterStart) / GEISTER_DAUER;
  if (u > 1) {
    // im Vorspann gräbt die Hand immer wieder, jedes Mal anderswo; sonst nur einmal
    if (VORSPANN) { geisterStart = t + 1.4; geisterZug++; } else geisterStart = -1;
    return;
  }
  // die Menge folgt der Zeit, nicht der Bildrate: auf jedem Gerät dieselbe Grube
  const z = geisterZug, sx = z % 2 ? -1 : 1, oy = [0, 0.1, -0.08, 0.04][z % 4];
  for (let s = 0; s < 3; s++) {
    const w = Math.max(0, u - s * 0.02);
    const x = 0.5 + sx * (-0.24 + 0.48 * w + 0.06 * Math.sin(w * 7.0 + z)), y = 0.64 + oy - 0.26 * w + 0.07 * Math.sin(w * 4.2 + 1.0 + z * 2.0);
    stempeln(x, y, (0.25 + 0.45 * w) * dt);
  }
  if (u > 0.3 && u < 0.8) stempeln(0.5 + 0.03 * Math.sin(u * 30) + sx * 0.04 * (z % 3), 0.5 + oy * 0.5, 0.9 * dt);   // in der Mitte tiefer
}

// ---------- Gesten ----------
// Grabung: ziehen gräbt; halten gräbt tiefer. Kegel: tippen oder ziehen setzt die Spitze. Überschiebung: ziehen schiebt.
const finger = new Map();
let spitze = { x: 0.5, y: 0.55 }, spitzeZiel = { x: 0.5, y: 0.55 }, sprung = 0;
let schub = { x: 0, y: 0 }, schubV = { x: 0, y: 0 }, gleit = { x: 0, y: 0 }, grabStaerke = 0, letzteSchicht = 0, zittern = 0;
const aufLeinwand = (e) => ({ x: e.clientX / innerWidth, y: 1 - e.clientY / innerHeight });
leinwand.addEventListener('pointerdown', (e) => {
  finger.set(e.pointerId, { x: e.clientX, y: e.clientY, t: performance.now() });
  leinwand.setPointerCapture(e.pointerId); $('geste').classList.add('weg');
  const p = aufLeinwand(e);
  if (lesart === 0) { spitzeZiel = p; sprung = 1; klangSprung(); glosse('sprung'); }
  else if (lesart === 1) { stempeln(p.x, p.y, 0.05); glosse('graben'); geisterStart = -1; }
});
leinwand.addEventListener('pointermove', (e) => {
  const f = finger.get(e.pointerId); if (!f) return;
  const dx = e.clientX - f.x, dy = e.clientY - f.y, jetzt = performance.now(), dt = Math.max(8, jetzt - f.t);
  f.x = e.clientX; f.y = e.clientY; f.t = jetzt;
  const p = aufLeinwand(e);
  if (lesart === 0) spitzeZiel = p;
  else if (lesart === 1) {
    // entlang des Wegs stempeln, damit schnelle Züge keine Lücken lassen
    const weg = Math.hypot(dx / innerHeight, dy / innerHeight);
    stempeln(p.x, p.y, 0.035 * Math.min(3, Math.max(1, weg / (pinselRadius() * 0.3))), p.x - dx / innerWidth, p.y + dy / innerHeight);
    grabStaerke = Math.min(1, grabStaerke + weg * 12);
  } else {
    schubV.x -= (dx / innerWidth) * 2.2; schubV.y += (dy / innerHeight) * 2.2;
  }
});
const loslassen = (e) => { finger.delete(e.pointerId); };
leinwand.addEventListener('pointerup', loslassen);
leinwand.addEventListener('pointercancel', loslassen);

// Antippen ohne Ziehen: welche Zeit liegt hier frei?
let tippStart = null, zeitUhr = 0;
leinwand.addEventListener('pointerdown', (e) => { tippStart = finger.size <= 1 ? { x: e.clientX, y: e.clientY, t: performance.now() } : null; }, true);
leinwand.addEventListener('pointerup', (e) => {
  const s0 = tippStart; tippStart = null;
  if (!s0 || performance.now() - s0.t > 300 || Math.hypot(e.clientX - s0.x, e.clientY - s0.y) > 8 || lesart === 2) return;
  const T = TEXTE[sprache], p = aufLeinwand(e), el = $('schichtzeit');
  let sek = 0;
  if (lesart === 1) { const k = Math.min(schichtZahl - 1, Math.floor(abbildLesen(p.x, p.y) * schichtZahl)); sek = k / Math.max(1, schichtZahl - 1) * tiefe; }
  else return;   // im Kegel springt man, die Anzeige gehört der Grabung
  el.textContent = sek < 0.15 ? T.schichtJetzt : T.schichtVor.replace('{s}', sek.toFixed(1).replace('.', T.komma2));
  el.style.left = Math.min(innerWidth - 150, Math.max(12, e.clientX - 60)) + 'px';
  el.style.top = Math.max(70, e.clientY - 48) + 'px';
  el.hidden = false; el.classList.remove('weg');
  clearTimeout(zeitUhr); zeitUhr = setTimeout(() => el.classList.add('weg'), 1800);
});

// ---------- Geführter Einstieg: zuerst Bild und Grube, dann die Lesarten, dann die Regler, zuletzt die Tasten ----------
const EINSTIEG = 'schichten.einstieg';
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
  if (fertig || new URLSearchParams(location.search).has('alles')) { einstiegZeigen(3); return; }
  einstiegZeigen(0);
  einstiegUhr = setTimeout(einstiegWeiter, 8000);
}
leinwand.addEventListener('pointerup', () => { if (einstiegStufe === 0) { clearTimeout(einstiegUhr); einstiegUhr = setTimeout(einstiegWeiter, 1600); } });
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
  setTimeout(() => $('geste').classList.add('weg'), 5000);
  groesse();
  if (VORSPANN && lesart === 1 && geisterStart < 0 && !geisterGegraben) { geisterGegraben = true; geisterStart = -2; }   // beginnt, sobald der Puffer gefüllt ist
  if (!laeuft && gl) { laeuft = true; requestAnimationFrame(bild); }
}
let geisterGegraben = false;

// ---------- Schleife ----------
let kopf = 0, letzterFang = 0, gefuellt = false, standbildWunsch = false, ersterLauf = true, letzteMs = 0, ft = 0, ringZaehler = 0;
function bild(ms) {
  const t = ms / 1000;
  if (quelle === fotoBuehne) fotoMalen(performance.now() / 1000);
  const intervall = Math.max(1 / 60, tiefe / (SCHICHTEN - 1));
  const dtMs = ms - (letzteMs || ms - 16.7), dt = Math.min(0.1, Math.max(0.004, dtMs / 1000)); letzteMs = ms;
  tempoMessen(ms, dtMs);
  // die Vergangenheit sammeln: ein Bild je Intervall in den Ring
  gl.bindTexture(gl.TEXTURE_2D_ARRAY, zeitTex);
  if (t - letzterFang >= intervall || !gefuellt) {
    if (malenIn(fctx, pufferB, pufferH)) {
      if (!gefuellt) {
        for (let l = 0; l < SCHICHTEN; l++) gl.texSubImage3D(gl.TEXTURE_2D_ARRAY, 0, 0, 0, l, pufferB, pufferH, 1, gl.RGBA, gl.UNSIGNED_BYTE, fang);
        gefuellt = true;
      } else {
        kopf = (kopf + 1) % SCHICHTEN;
        gl.texSubImage3D(gl.TEXTURE_2D_ARRAY, 0, 0, 0, kopf, pufferB, pufferH, 1, gl.RGBA, gl.UNSIGNED_BYTE, fang);
      }
      letzterFang = t;
    }
  }
  scharfFangen();
  if (geisterStart === -2 && gefuellt) geisterStart = t + 0.9;
  if (geisterStart > 0 && t >= geisterStart) geisterGraben(t, dt);
  // Fluss: Kegel und Überschiebung wandern, die Grube füllt sich
  sprung *= Math.pow(0.12, dt);
  ft += dt * (0.08 + fluss * 0.5 + sprung * 1.6) * (lesart === 2 ? 0.7 : 1);
  if (lesart === 0 && Math.floor(ft) !== ringZaehler) { ringZaehler = Math.floor(ft); klangRing(ringZaehler); }
  spitze.x += (spitzeZiel.x - spitze.x) * (1 - Math.pow(0.02, dt)); spitze.y += (spitzeZiel.y - spitze.y) * (1 - Math.pow(0.02, dt));
  schub.x += schubV.x * dt; schub.y += schubV.y * dt;
  schubV.x *= Math.pow(0.15, dt); schubV.y *= Math.pow(0.15, dt);
  // die Bilder der Schichten gleiten mit und finden langsam zurück, das Feld bleibt verschoben
  const gz = (v) => Math.max(-0.14, Math.min(0.14, v * 0.12));
  gleit.x += (gz(schubV.x) - gleit.x) * (1 - Math.pow(0.05, dt)); gleit.y += (gz(schubV.y) - gleit.y) * (1 - Math.pow(0.05, dt));
  const mittel = grubeRechnen(dt);
  // Klang: Körner beim Graben, ein Stein an jeder Schichtgrenze unter dem Finger
  const f0 = [...finger.values()][0];
  if (lesart === 1 && f0) {
    const d = abbildLesen(f0.x / innerWidth, 1 - f0.y / innerHeight), k = Math.min(schichtZahl - 1, Math.floor(d * schichtZahl));
    klangGraben(grabStaerke, d);
    if (k !== letzteSchicht) { if (k > letzteSchicht) klangSchwelle(k); letzteSchicht = k; }
  } else letzteSchicht = 0;
  // Nachzittern: steigt mit der Geste, klingt über gut eine Sekunde aus
  const anstoss = lesart === 1 ? grabStaerke : lesart === 2 ? Math.min(1, Math.hypot(schubV.x, schubV.y) * 0.6) : sprung;
  zittern = Math.max(zittern * Math.pow(0.08, dt), anstoss);
  grabStaerke *= Math.pow(0.02, dt);
  klangBild({ tiefe, mittel: lesart === 1 ? Math.min(1, mittel * 3) : lesart === 0 ? 0.45 : 0.3, fluss, gleiten: lesart === 2 ? Math.hypot(schubV.x, schubV.y) : 0 });

  // Szene
  const sz = zielBauen('szene', leinwand.width, leinwand.height);
  gl.bindFramebuffer(gl.FRAMEBUFFER, sz.fb);
  gl.viewport(0, 0, leinwand.width, leinwand.height);
  gl.useProgram(prog);
  gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D_ARRAY, zeitTex); gl.uniform1i(ort.uZeit, 0);
  gl.activeTexture(gl.TEXTURE3); gl.bindTexture(gl.TEXTURE_2D, scharfTex); gl.uniform1i(ort.uScharf, 3);
  gl.activeTexture(gl.TEXTURE4); gl.bindTexture(gl.TEXTURE_2D, grubeZ[grubeNr].tex); gl.uniform1i(ort.uGrube, 4);
  gl.activeTexture(gl.TEXTURE0);
  gl.uniform1f(ort.uKopf, kopf); gl.uniform1f(ort.uN, SCHICHTEN);
  gl.uniform1f(ort.uSpanne, Math.min(SCHICHTEN - 1, tiefe / intervall)); gl.uniform1f(ort.uS, schichtZahl);
  gl.uniform1f(ort.uSeite, innerWidth / innerHeight); gl.uniform1f(ort.uT, t % 100); gl.uniform1f(ort.uFT, ft % 1000);
  gl.uniform1i(ort.uLesart, lesart); gl.uniform2f(ort.uSpitze, spitze.x, spitze.y); gl.uniform2f(ort.uSchub, schub.x, schub.y); gl.uniform2f(ort.uGleit, gleit.x, gleit.y); gl.uniform1f(ort.uSprung, sprung); gl.uniform1i(ort.uRand, rand); gl.uniform1i(ort.uKegel, KEGEL); gl.uniform1f(ort.uPxH, 1 / leinwand.height); gl.uniform1i(ort.uUeber, ueber); gl.uniform4f(ort.uRahmen, rahmen[0], rahmen[1], rahmen[2], rahmen[3]); gl.uniform1f(ort.uZitter, zittern);
  zeichneFlaeche();
  nachbearbeiten(t);
  if (standbildWunsch) { standbildWunsch = false; leinwand.toBlob((b) => b && zeigen(b, 'schichten-' + zeitstempel() + '.png')); }
  if (ersterLauf && gefuellt) { ersterLauf = false; spur('✓ läuft'); }
  requestAnimationFrame(bild);
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

let aufnehmer = null, aufnahmeStart = 0, uhr = 0;
const dauer = (s) => Math.floor(s / 60) + ':' + String(Math.floor(s % 60)).padStart(2, '0');
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
    clearInterval(uhr);
    const sekunden = (performance.now() - aufnahmeStart) / 1000;
    const b = await aufnahmeDatei(teile, (aufnehmer.mimeType || 'video/webm').split(';')[0], sekunden);   // Länge in den Dateikopf
    aufnehmer = null; knopf.classList.remove('laeuft'); knopf.textContent = TEXTE[sprache].aufnahme;
    zeigen(b, 'schichten-' + zeitstempel() + (b.type.includes('mp4') ? '.mp4' : '.webm'));
  };
  aufnehmer.start(1000); aufnahmeStart = performance.now();
  knopf.classList.add('laeuft');
  const zeigeUhr = () => { knopf.textContent = '● ' + dauer((performance.now() - aufnahmeStart) / 1000) + ' · ' + TEXTE[sprache].stopp; };
  zeigeUhr(); uhr = setInterval(zeigeUhr, 250);
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
for (const [id, k] of [['r-tiefe', 'tiefe'], ['r-schichten', 'schichten'], ['r-fluss', 'fluss']]) {
  $(id).addEventListener('pointerdown', () => glosse(k));
  $(id).addEventListener('input', () => { if (glosseSchluessel !== k || $('glosse').hidden) glosse(k); else { clearTimeout(glosseUhr); glosseUhr = setTimeout(glosseWeg, glosseDauer()); } });
}
$('glosse').addEventListener('click', () => { glosseWeg(); $('begriff').hidden = false; });

// ---------- Begriffsebene ----------
$('begriff-auf').addEventListener('click', () => { $('begriff').hidden = false; });
$('begriff-zu').addEventListener('click', () => { $('begriff').hidden = true; });
addEventListener('keydown', (e) => { if (e.key === 'Escape') { $('begriff').hidden = true; schliessen(); } });

// jeder Besuch beginnt mit der Grabung
lesartWaehlen(1, true);
if (VORSPANN) { fluss = 0.75; $('r-fluss').value = String(fluss); }
uebersetzen();
// Direktstart für Tests und Vorführungen: ?beispiel, ?lesart=0|1|2
{ const q = new URLSearchParams(location.search); if (q.has('lesart')) lesartWaehlen(Math.max(0, Math.min(2, +q.get('lesart') || 0)), true); if (q.has('beispiel')) beispielStarten(); }
