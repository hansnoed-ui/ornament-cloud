// Kristallbild – Prototyp für the deleuzian scheme (Phase 0)
// Live-Bild und verzögerte Schichten als Facetten eines Kristalls.
// WebGL2, ohne Bibliotheken, ohne CDN. Alles bleibt im Browser.

import { SCHLIFFE, schliffEbenen } from './schliffe.js?v=8';
import { klangStarten, klangBild, klangAn, klangIstAn, klangSpur } from './klang.js?v=1';
import { aufnahmeDatei } from '../gemeinsam/aufnahme.js?v=1';

const $ = (id) => document.getElementById(id);

// ---------- Sprache ----------
const TEXTE = {
  de: {
    titel: 'Kristallbild', satz: 'Die Gegenwart spaltet sich in jedem Augenblick.',
    kamera: 'Kamera', video: 'Video oder Fotos', beispiel: 'Beispiel', hinweis: 'Alles bleibt auf deinem Gerät.',
    facetten: 'Facetten', tiefe: 'Zeittiefe', brechung: 'Brechung', verschmelzung: 'Verschmelzung',
    glossen: {
      keim: { begriff: 'le germe et le milieu', satz: 'Ein Keim lässt ein formloses Milieu kristallisieren. Wo du doppelt tippst, beginnt der Kristall: zuerst ist er nur Gegenwart, die Vergangenheit sammelt er erst im Wachsen.', zitat: '', quelle: 'Deleuze, L’image-temps, Minuit 1985, Kap. 4, sinngemäss' },
      formen: { begriff: 'le cristal', satz: 'Jeder Schliff fasst die Zeit anders: viele kleine Facetten zerstreuen sie, grosse Flächen zeigen sie ruhig.', zitat: '«Ce que le cristal révèle ou fait voir, c’est le fondement caché du temps, c’est-à-dire sa différenciation en deux jets, celui des présents qui passent et celui des passés qui se conservent.»', quelle: 'Deleuze, L’image-temps, Minuit 1985, Kap. 4' },
      zustaende: { begriff: 'les quatre états', satz: 'Deleuze unterscheidet vier Zustände des Kristalls und liest sie an vier Regisseuren ab.', zitat: '', quelle: 'Deleuze, L’image-temps, Minuit 1985, Kap. 4' },
      facetten: { begriff: 'le circuit', satz: 'Jede Facette ist ein kleiner Kreis zwischen dem Aktuellen und seinem Virtuellen. Mehr Facetten, engere Kreise.', zitat: '«le plus petit circuit»', quelle: 'Deleuze, L’image-temps, Minuit 1985, Kap. 4' },
      tiefe: { begriff: 'la coexistence', satz: 'Die Vergangenheit folgt nicht auf die Gegenwart, sie besteht neben ihr. Hier bestimmst du, wie weit die Facetten zurückreichen.', zitat: '«Le passé ne succède pas au présent qu’il n’est plus, il coexiste avec le présent qu’il a été.»', quelle: 'Deleuze, Le bergsonisme, PUF 1966, Kap. 3' },
      brechung: { begriff: 'le virtuel', satz: 'Was der Stein im Inneren bricht, ist nicht erfunden, sondern gewesen. Das Virtuelle ist wirklich, nur nicht aktuell.', zitat: '«Réels sans être actuels, idéaux sans être abstraits.»', quelle: 'Proust, Le Temps retrouvé; aufgenommen bei Deleuze, Le bergsonisme' },
      verschmelzung: { begriff: 'l’indiscernabilité', satz: 'Aktuelles und Virtuelles tauschen sich aus, bis man nicht mehr sagen kann, was was ist. Verschieden bleiben sie trotzdem.', zitat: '', quelle: 'Deleuze, L’image-temps, Kap. 4, sinngemäss' }
    },
    facetteJetzt: 'diese Facette: jetzt', facetteVor: 'diese Facette: vor {s} s', bildJetzt: 'das Bild: jetzt', komma2: ',',
    zustaende: [
      { kurz: 'vollkommen', titel: 'Der vollkommene Kristall', wer: 'Ophüls', text: 'Bei Max Ophüls ist der Kristall vollkommen: ein geschlossener Kreis, aus dem nichts entkommt. Die Zeiten kreisen um den Stein wie die Manege in «Lola Montès», jede Facette reicht ihre Zeit an die nächste weiter.' },
      { kurz: 'gesprungen', titel: 'Der gesprungene Kristall', wer: 'Renoir', text: 'Bei Jean Renoir hat der Kristall einen Riss. Durch ihn entweicht etwas: das Leben, eine Gegenwart, die noch nicht erstarrt ist und in die Zukunft geht. Das Theater in «Die goldene Karosse», das Spiel in «Die Spielregel». Jenseits des Risses zeigt der Stein nur noch das Jetzt.' },
      { kurz: 'im Entstehen', titel: 'Der Kristall im Entstehen', wer: 'Fellini', text: 'Bei Federico Fellini ist der Kristall nie fertig, er wächst unablässig. Facetten treten hervor und sinken zurück: Was hervortritt, ist jetzt, was zurücksinkt, wird Vergangenheit.' },
      { kurz: 'im Zerfall', titel: 'Der Kristall im Zerfall', wer: 'Visconti', text: 'Bei Luchino Visconti zerfällt der Kristall von innen. Eine Welt geht unter, und die Einsicht kommt zu spät. Alles im Stein ist schon tief vergangen, es vergilbt, trübt sich, und die Facetten verlieren ihren Halt. «Der Leopard», «Ludwig».' }
    ],
    zustand: 'Zustand',
    stein: 'Stein', brillant: 'Brillant', oval: 'Saphir', smaragd: 'Smaragd', bergkristall: 'Bergkristall', formen: 'Schliff',
    wenden: 'Kamera wenden', tonAn: 'Ton an', tonAus: 'Ton aus',
    begriff: 'Begriff', standbild: 'Standbild', aufnahme: 'Aufnahme', stopp: 'Stopp',
    teilen: 'Teilen', sichern: 'Sichern', komma: '.', 'ergebnis-hinweis': 'Gesichert im Ordner «Downloads». «Teilen» legt es direkt in die Galerie oder eine App.',
    keineAufnahme: 'Dieser Browser kann die Leinwand nicht aufnehmen. Das Standbild geht.',
    geste: 'Ziehen dreht den Kristall, zwei Finger zoomen, Doppeltipp setzt einen Keim.',
    familie: 'Zeit · Das Zeit-Bild, Kapitel 4', 'b-titel': 'Das Kristallbild',
    'b-text': [
      'Für Deleuze ist jede Gegenwart doppelt. In dem Moment, in dem sie da ist, wird sie schon zur Vergangenheit: Sie spaltet sich in eine Gegenwart, die vorübergeht, und eine Vergangenheit, die sich bewahrt.',
      'Das Kristallbild macht diese Spaltung sichtbar. Ein aktuelles Bild und sein virtuelles Bild verbinden sich so eng, dass man sie nicht mehr unterscheiden kann, obwohl sie verschieden bleiben. Deleuze denkt an den Spiegelsaal in Orson Welles’ «The Lady from Shanghai», an Max Ophüls’ «Lola Montès», an Alain Resnais.',
      'Hier spiegelt die Oberfläche des Steins die Gegenwart, das Aktuelle. Was er im Inneren bricht, ist Vergangenheit, das Virtuelle, und jede Facette zeigt eine andere Zeit. An den Kanten fallen beide zusammen.'
    ],
    'b-frage': 'Entsteht hier ein Nebeneinander verschiedener Zeiten, oder nur eine Verzögerung? Ein Effekt ist noch kein Kristall: Achte darauf, wann du die Gegenwart nicht mehr von ihrem Echo unterscheiden kannst.',
    'b-quelle': 'Gilles Deleuze, L’image-temps (Cinéma 2), Paris: Minuit 1985, Kapitel 4 «Les cristaux de temps». Deutsch: Das Zeit-Bild, Suhrkamp.',
    keineKamera: 'Die Kamera lässt sich nicht öffnen. Wähle ein Video, Fotos oder das Beispiel.',
    keinGL: 'Dieses Gerät kann WebGL 2 nicht anzeigen. Der Kristall braucht es.',
    kontextWeg: 'Die Grafik ist ausgestiegen. Bitte die Seite neu laden.',
    letzterLauf: 'Der letzte Versuch brach ab nach: '
  },
  en: {
    titel: 'Crystal-image', satz: 'The present splits at every moment.',
    kamera: 'Camera', video: 'Video or photos', beispiel: 'Example', hinweis: 'Everything stays on your device.',
    facetten: 'Facets', tiefe: 'Depth of time', brechung: 'Refraction', verschmelzung: 'Coalescence',
    glossen: {
      keim: { begriff: 'le germe et le milieu', satz: 'A seed makes a formless milieu crystallise. Where you double-tap, the crystal begins: at first it is only present, it gathers the past only as it grows.', zitat: '', quelle: 'Deleuze, The Time-Image, ch. 4, paraphrased' },
      formen: { begriff: 'le cristal', satz: 'Each cut holds time differently: many small facets scatter it, large planes show it calmly.', zitat: '“What the crystal reveals or makes visible is the hidden ground of time, that is, its differentiation into two flows, that of presents which pass and that of pasts which are preserved.”', quelle: 'Deleuze, Cinema 2: The Time-Image, tr. Tomlinson/Galeta, 1989, p. 98' },
      zustaende: { begriff: 'les quatre états', satz: 'Deleuze distinguishes four states of the crystal and reads them in four directors.', zitat: '', quelle: 'Deleuze, The Time-Image, ch. 4' },
      facetten: { begriff: 'le circuit', satz: 'Each facet is a small circuit between the actual and its virtual. More facets, tighter circuits.', zitat: '“the smallest circuit”', quelle: 'Deleuze, The Time-Image, ch. 4' },
      tiefe: { begriff: 'la coexistence', satz: 'The past does not follow the present, it coexists with it. Here you decide how far back the facets reach.', zitat: '« Le passé ne succède pas au présent qu’il n’est plus, il coexiste avec le présent qu’il a été. »', quelle: 'Deleuze, Le bergsonisme, PUF 1966, ch. 3 (original)' },
      brechung: { begriff: 'le virtuel', satz: 'What the stone refracts inside is not invented but has been. The virtual is real, just not actual.', zitat: '“Real without being actual, ideal without being abstract.”', quelle: 'Proust, Time Regained; taken up by Deleuze in Bergsonism' },
      verschmelzung: { begriff: 'l’indiscernabilité', satz: 'Actual and virtual exchange until you can no longer say which is which. Yet they remain distinct.', zitat: '', quelle: 'Deleuze, The Time-Image, ch. 4, paraphrased' }
    },
    facetteJetzt: 'this facet: now', facetteVor: 'this facet: {s} s ago', bildJetzt: 'the image: now', komma2: '.',
    zustaende: [
      { kurz: 'perfect', titel: 'The perfect crystal', wer: 'Ophüls', text: 'In Max Ophüls the crystal is perfect: a closed circuit from which nothing escapes. The times circle the stone like the circus ring in “Lola Montès”, each facet passing its time on to the next.' },
      { kurz: 'cracked', titel: 'The cracked crystal', wer: 'Renoir', text: 'In Jean Renoir the crystal has a crack. Through it something escapes: life, a present not yet frozen, moving towards the future. The theatre of “The Golden Coach”, the game of “The Rules of the Game”. Beyond the crack the stone shows only the now.' },
      { kurz: 'forming', titel: 'The crystal in formation', wer: 'Fellini', text: 'In Federico Fellini the crystal is never finished, it keeps growing. Facets push forward and sink back: what emerges is now, what recedes becomes past.' },
      { kurz: 'decomposing', titel: 'The crystal in decomposition', wer: 'Visconti', text: 'In Luchino Visconti the crystal decays from within. A world goes under, and understanding comes too late. Everything in the stone is already deeply past; it yellows, clouds over, and the facets lose their hold. “The Leopard”, “Ludwig”.' }
    ],
    zustand: 'State',
    stein: 'Stone', brillant: 'Brilliant', oval: 'Sapphire', smaragd: 'Emerald', bergkristall: 'Quartz', formen: 'Cut',
    wenden: 'Flip camera', tonAn: 'Sound on', tonAus: 'Sound off',
    begriff: 'Concept', standbild: 'Still', aufnahme: 'Record', stopp: 'Stop',
    teilen: 'Share', sichern: 'Save', komma: '.', 'ergebnis-hinweis': 'Saved to your “Downloads” folder. “Share” sends it straight to your gallery or an app.',
    keineAufnahme: 'This browser cannot record the canvas. Stills work.',
    geste: 'Drag to turn the crystal, pinch to zoom, double-tap to plant a seed.',
    familie: 'Time · The Time-Image, chapter 4', 'b-titel': 'The crystal-image',
    'b-text': [
      'For Deleuze every present is double. The moment it is there, it is already becoming past: it splits into a present that passes and a past that is preserved.',
      'The crystal-image makes this split visible. An actual image and its virtual image coalesce so closely that they become indiscernible, while remaining distinct. Deleuze thinks of the hall of mirrors in Orson Welles’s “The Lady from Shanghai”, of Max Ophüls’s “Lola Montès”, of Alain Resnais.',
      'Here the surface of the stone reflects the present, the actual. What it refracts inside is past, the virtual, and each facet shows another time. At the edges the two coalesce.'
    ],
    'b-frage': 'Do different times coexist here, or is it only a delay? An effect is not yet a crystal: notice when you can no longer tell the present from its echo.',
    'b-quelle': 'Gilles Deleuze, L’image-temps (Cinéma 2), Paris: Minuit 1985, chapter 4 “Les cristaux de temps”. English: Cinema 2: The Time-Image, University of Minnesota Press 1989.',
    keineKamera: 'The camera cannot be opened. Choose a video, photos or the example.',
    keinGL: 'This device cannot show WebGL 2, which the crystal needs.',
    kontextWeg: 'The graphics stopped. Please reload the page.',
    letzterLauf: 'The last attempt stopped after: '
  },
  fr: {
    titel: 'Image-cristal', satz: 'Le présent se dédouble à chaque instant.',
    kamera: 'Caméra', video: 'Vidéo ou photos', beispiel: 'Exemple', hinweis: 'Tout reste sur ton appareil.',
    facetten: 'Facettes', tiefe: 'Profondeur du temps', brechung: 'Réfraction', verschmelzung: 'Coalescence',
    glossen: {
      keim: { begriff: 'le germe et le milieu', satz: 'Un germe fait cristalliser un milieu informe. Là où tu touches deux fois, le cristal commence : d’abord il n’est que présent, il ne recueille le passé qu’en croissant.', zitat: '', quelle: 'Deleuze, L’image-temps, Minuit 1985, ch. 4, en substance' },
      formen: { begriff: 'le cristal', satz: 'Chaque taille saisit le temps autrement : de nombreuses petites facettes le dispersent, de grands plans le montrent calmement.', zitat: '« Ce que le cristal révèle ou fait voir, c’est le fondement caché du temps, c’est-à-dire sa différenciation en deux jets, celui des présents qui passent et celui des passés qui se conservent. »', quelle: 'Deleuze, L’image-temps, Minuit 1985, ch. 4' },
      zustaende: { begriff: 'les quatre états', satz: 'Deleuze distingue quatre états du cristal et les lit chez quatre cinéastes.', zitat: '', quelle: 'Deleuze, L’image-temps, Minuit 1985, ch. 4' },
      facetten: { begriff: 'le circuit', satz: 'Chaque facette est un petit circuit entre l’actuel et son virtuel. Plus de facettes, des circuits plus serrés.', zitat: '« le plus petit circuit »', quelle: 'Deleuze, L’image-temps, Minuit 1985, ch. 4' },
      tiefe: { begriff: 'la coexistence', satz: 'Le passé ne suit pas le présent, il coexiste avec lui. Ici tu décides jusqu’où remontent les facettes.', zitat: '« Le passé ne succède pas au présent qu’il n’est plus, il coexiste avec le présent qu’il a été. »', quelle: 'Deleuze, Le bergsonisme, PUF 1966, ch. 3' },
      brechung: { begriff: 'le virtuel', satz: 'Ce que la pierre réfracte à l’intérieur n’est pas inventé, mais a été. Le virtuel est réel, seulement pas actuel.', zitat: '« Réels sans être actuels, idéaux sans être abstraits. »', quelle: 'Proust, Le Temps retrouvé ; repris par Deleuze, Le bergsonisme' },
      verschmelzung: { begriff: 'l’indiscernabilité', satz: 'L’actuel et le virtuel s’échangent jusqu’à ce qu’on ne puisse plus dire lequel est lequel. Ils restent pourtant distincts.', zitat: '', quelle: 'Deleuze, L’image-temps, ch. 4, en substance' }
    },
    facetteJetzt: 'cette facette : maintenant', facetteVor: 'cette facette : il y a {s} s', bildJetzt: 'l’image : maintenant', komma2: ',',
    zustaende: [
      { kurz: 'parfait', titel: 'Le cristal parfait', wer: 'Ophuls', text: 'Chez Max Ophuls, le cristal est parfait : un circuit fermé dont rien ne s’échappe. Les temps tournent autour de la pierre comme la piste de « Lola Montès », chaque facette passe son temps à la suivante.' },
      { kurz: 'fêlé', titel: 'Le cristal fêlé', wer: 'Renoir', text: 'Chez Jean Renoir, le cristal a une fêlure. Par elle quelque chose s’échappe : la vie, un présent qui ne s’est pas encore figé et file vers l’avenir. Le théâtre du « Carrosse d’or », le jeu de « La Règle du jeu ». Au-delà de la fêlure, la pierre ne montre plus que le maintenant.' },
      { kurz: 'en formation', titel: 'Le cristal en formation', wer: 'Fellini', text: 'Chez Federico Fellini, le cristal n’est jamais achevé, il ne cesse de croître. Des facettes avancent et se retirent : ce qui surgit est présent, ce qui recule devient passé.' },
      { kurz: 'en décomposition', titel: 'Le cristal en décomposition', wer: 'Visconti', text: 'Chez Luchino Visconti, le cristal se décompose de l’intérieur. Un monde s’effondre, et la révélation arrive trop tard. Tout dans la pierre est déjà profondément passé : cela jaunit, se trouble, et les facettes perdent prise. « Le Guépard », « Ludwig ».' }
    ],
    zustand: 'État',
    stein: 'Pierre', brillant: 'Brillant', oval: 'Saphir', smaragd: 'Émeraude', bergkristall: 'Cristal de roche', formen: 'Taille',
    wenden: 'Retourner', tonAn: 'Son activé', tonAus: 'Son coupé',
    begriff: 'Concept', standbild: 'Image', aufnahme: 'Enregistrer', stopp: 'Arrêter',
    teilen: 'Partager', sichern: 'Télécharger', komma: ',', 'ergebnis-hinweis': 'Enregistré dans le dossier « Téléchargements ». « Partager » l’envoie directement dans la galerie ou une app.',
    keineAufnahme: 'Ce navigateur ne peut pas enregistrer le canevas. L’image fixe fonctionne.',
    geste: 'Glisser fait tourner le cristal, deux doigts pour zoomer, double toucher pour semer un germe.',
    familie: 'Temps · L’image-temps, chapitre 4', 'b-titel': 'L’image-cristal',
    'b-text': [
      'Pour Deleuze, tout présent est double. Au moment même où il est là, il devient déjà passé : il se dédouble en un présent qui passe et un passé qui se conserve.',
      'L’image-cristal rend ce dédoublement visible. Une image actuelle et son image virtuelle s’unissent si étroitement qu’elles deviennent indiscernables, tout en restant distinctes. Deleuze pense à la galerie des glaces de « La Dame de Shanghai » d’Orson Welles, à « Lola Montès » de Max Ophuls, à Alain Resnais.',
      'Ici, la surface de la pierre reflète le présent, l’actuel. Ce qu’elle réfracte à l’intérieur est passé, le virtuel, et chaque facette montre un autre temps. Sur les arêtes, les deux coïncident.'
    ],
    'b-frage': 'Des temps différents coexistent-ils ici, ou n’est-ce qu’un retard ? Un effet n’est pas encore un cristal : remarque le moment où tu ne distingues plus le présent de son écho.',
    'b-quelle': 'Gilles Deleuze, L’image-temps (Cinéma 2), Paris : Minuit 1985, chapitre 4 « Les cristaux de temps ».',
    keineKamera: 'La caméra ne s’ouvre pas. Choisis une vidéo ou l’exemple.',
    keinGL: 'Cet appareil ne peut pas afficher WebGL 2, nécessaire au cristal.',
    kontextWeg: 'Le graphisme s’est arrêté. Recharge la page.',
    letzterLauf: 'La dernière tentative s’est arrêtée après : '
  }
};

let sprache = (() => {
  try { const s = localStorage.getItem('kristall.sprache'); if (TEXTE[s]) return s; } catch {}
  const n = (navigator.language || 'de').slice(0, 2);
  return TEXTE[n] ? n : 'de';
})();

function uebersetzen() {
  const t = TEXTE[sprache];
  document.documentElement.lang = sprache;
  document.querySelectorAll('[data-t]').forEach((el) => {
    const k = el.dataset.t, v = t[k];
    if (Array.isArray(v)) { el.replaceChildren(...v.map((s) => { const p = document.createElement('p'); p.textContent = s; return p; })); }
    else if (v != null) el.textContent = v;
  });
  document.querySelectorAll('[data-t-label]').forEach((el) => { const v = t[el.dataset.tLabel]; if (v) { el.setAttribute('aria-label', v); el.title = v; } });
  if (aufnehmer) $('aufnahme').textContent = t.stopp;
  if (document.getElementById('b-zustand-titel')) zustandText();
  document.querySelectorAll('[data-zustand]').forEach((b) => { b.textContent = t.zustaende[+b.dataset.zustand].kurz; });
  requestAnimationFrame(() => zustandRastenMessen());
  document.querySelectorAll('[data-lang]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.lang === sprache)));
}
document.querySelectorAll('[data-lang]').forEach((b) => b.addEventListener('click', () => {
  sprache = b.dataset.lang;
  try { localStorage.setItem('kristall.sprache', sprache); } catch {}
  uebersetzen();
}));

// ---------- Absturzspur (Lehre aus PHORMA) ----------
const SPUR = 'kristall.spur';
function spur(schritt) {
  try {
    const s = JSON.parse(localStorage.getItem(SPUR) || '[]');
    s.push(schritt); localStorage.setItem(SPUR, JSON.stringify(s.slice(-12)));
  } catch {}
}
// Meldungen liegen unter der Kopfzeile, schliessen sich beim Antippen und nach zehn Sekunden
let meldungUhr = 0;
function melden(text) {
  const m = $('meldung'); m.textContent = text; m.hidden = false;
  clearTimeout(meldungUhr); meldungUhr = setTimeout(() => { m.hidden = true; }, 10000);
}
$('meldung').addEventListener('click', () => { $('meldung').hidden = true; });
// sauberes Ende festhalten, sonst hält die Spur jeden Neuladen für einen Absturz
addEventListener('pagehide', () => spur('Ende'));
document.addEventListener('visibilitychange', () => { if (document.hidden) spur('Pause'); });
let spurVorher = [];
try {
  const s = JSON.parse(localStorage.getItem(SPUR) || '[]'); spurVorher = s;
  if (s.length && !['✓ läuft', 'Start', 'Ende', 'Pause'].includes(s.at(-1))) melden(TEXTE[sprache].letzterLauf + s.slice(-3).join(' → '));
  localStorage.setItem(SPUR, JSON.stringify(['Start']));
} catch {}
// Fehler, die das Modul anhalten, landen ebenfalls in der Spur
addEventListener('error', (e) => spur('Fehler: ' + String(e.message || e.error || '?').slice(0, 160)));
addEventListener('unhandledrejection', (e) => spur('Fehler: ' + String(e.reason?.message || e.reason || '?').slice(0, 160)));
// Mit ?spur: die Spur unten auf der Seite, mit einer Taste zum Kopieren (am Telefon sind Bildschirmfotos nicht immer erlaubt).
// Gäste sehen das nie; nur wer die Adresse mit ?spur öffnet.
if (new URLSearchParams(location.search).has('spur')) {
  const kasten = document.createElement('div');
  kasten.style.cssText = 'position:fixed;left:8px;right:8px;top:calc(max(16px, env(safe-area-inset-top)) + 44px);z-index:9;max-height:30vh;overflow:auto;padding:10px 12px;background:rgba(10,10,11,.92);border-left:2px solid #c8102e;font:12px/1.4 "Barlow Condensed",sans-serif;color:#f1eee6;white-space:pre-wrap';
  const text = document.createElement('div'), taste = document.createElement('button');
  taste.textContent = 'Spur kopieren';
  taste.style.cssText = 'margin-top:8px;padding:6px 0;background:none;border:0;color:#c8102e;font:inherit;letter-spacing:.18em;text-transform:uppercase;cursor:pointer';
  // Grafikchip einmal erfragen und den Hilfskontext gleich freigeben (zu viele Kontexte kosten den Kristall seinen eigenen)
  let gl2 = '?';
  try { const c = document.createElement('canvas').getContext('webgl2'); const x = c && c.getExtension('WEBGL_debug_renderer_info'); gl2 = c ? (x ? c.getParameter(x.UNMASKED_RENDERER_WEBGL) : 'WebGL 2') : 'kein WebGL 2'; c?.getExtension('WEBGL_lose_context')?.loseContext(); } catch {}
  const inhalt = () => {
    let jetzt = []; try { jetzt = JSON.parse(localStorage.getItem(SPUR) || '[]'); } catch {}
    return 'Kristall ' + (document.querySelector('script[src*="kristall.js"]')?.getAttribute('src') || '') + '\n' + navigator.userAgent + '\nGrafik: ' + gl2 +
      '\nVorher: ' + spurVorher.join(' → ') + '\nJetzt: ' + jetzt.join(' → ');
  };
  let fest = '';
  const zeigen = () => { const t = inhalt(); if (t !== fest) { fest = t; text.textContent = t; } };
  taste.addEventListener('click', async () => {
    const t = inhalt();
    try { await navigator.clipboard.writeText(t); taste.textContent = 'Kopiert'; }
    catch { const r = document.createRange(); r.selectNodeContents(text); const sel = getSelection(); sel.removeAllRanges(); sel.addRange(r); taste.textContent = 'Markiert, jetzt kopieren'; }
    setTimeout(() => { taste.textContent = 'Spur kopieren'; }, 2500);
  });
  kasten.append(text, taste); document.body.append(kasten);
  zeigen(); setInterval(zeigen, 1000);
}

// ---------- Grafik ----------
const telefon = matchMedia('(pointer: coarse)').matches || Math.min(screen.width, screen.height) < 700;
const leinwand = $('leinwand');
const gl = leinwand.getContext('webgl2', { antialias: false, alpha: false, premultipliedAlpha: false, powerPreference: 'high-performance' });
// Ohne Grafikkarte (Software wie «Microsoft Basic Render Driver», SwiftShader, llvmpipe) rechnet der Prozessor jeden Bildpunkt:
// dann eine leichte Fassung mit weniger Bildpunkten und Strahlen (20.11.2026, Laptop in Edge ruckelte). ?voll erzwingt die volle.
const grafikName = (() => { try { const x = gl && gl.getExtension('WEBGL_debug_renderer_info'); return x ? String(gl.getParameter(x.UNMASKED_RENDERER_WEBGL)) : ''; } catch { return ''; } })();
const leicht = !new URLSearchParams(location.search).has('voll') &&
  (/basic render|swiftshader|llvmpipe|softpipe|software/i.test(grafikName) || new URLSearchParams(location.search).has('leicht'));
const SCHICHTEN = telefon || leicht ? 40 : 64;       // Zeitpuffer
const LANGE_SEITE = telefon || leicht ? 640 : 1080;  // Grösse der Zeitschichten im Puffer (Brechungen, Spiegelungen)
const MAX_DPR = leicht ? 0.6 : telefon ? 1.25 : 1.5;
const SCHARF_SEITE = leicht ? 960 : telefon ? 1280 : 1920;  // die Gegenwart: so scharf, wie der Bildschirm sie zeigt
const MAX_F = 60;              // Ebenen: der Brillant braucht 57
if (leicht) spur('Leichte Fassung (ohne Grafikkarte)');
if (!gl) { melden(TEXTE[sprache].keinGL); spur('kein WebGL2'); }
leinwand.addEventListener('webglcontextlost', (e) => { e.preventDefault(); melden(TEXTE[sprache].kontextWeg); spur('Kontext verloren'); });

const VS = `#version 300 es
in vec2 a; out vec2 v;
void main(){ v = a*0.5+0.5; gl_Position = vec4(a,0.,1.); }`;

// RISS 2: zerbrochener Stein mit Licht aus dem Spalt; RISS 1: nur die zwei Stücke; RISS 0: Notbetrieb ohne Bruch.
// Lehnt ein Grafiktreiber eine Stufe ab, versucht der Kristall die nächstkleinere.
const fsText = (riss) => `#version 300 es
#define RISS ${riss}
precision highp float; precision highp sampler2DArray;
#define MAX_K ${MAX_F}
#define WELLEN ${leicht ? 3 : telefon ? 4 : 5}
#define WEGE ${leicht ? 2 : telefon ? 3 : 4}
#define PWELLEN ${leicht ? 2 : telefon ? 2 : 3}
#define PROBEN ${leicht ? 4 : 8}
in vec2 v; out vec4 o;
uniform sampler2DArray uZeit;
uniform sampler2D uScharf;       // die Gegenwart in voller Auflösung (Zeitschichten bleiben klein)
uniform vec3 uN[MAX_K];        // Ebenen des Kristalls (Normalen)
uniform float uR[MAX_K];       // Abstände
uniform float uSchicht[MAX_K]; // Zeitschicht je Facette
uniform float uAlter[MAX_K];   // 0 = jetzt, 1 = tief vergangen
uniform int uK;
uniform float uKante;          // Stärke des Kantenlichts
uniform vec3 uTon;             // Färbung im Stein (Absorption je Weglänge)
uniform vec2 uLage;            // Lage des Kristalls im Bild
uniform float uSeite, uBrech, uT, uJetzt;
const float AUGE = 3.2, WAND = -2.0, TAN = 0.5;
// drei Lichter im Raum der Betrachtenden: sie bleiben stehen, wenn der Stein sich dreht
const vec3 L1 = vec3(0.53, 0.68, 0.5), L2 = vec3(-0.62, 0.55, 0.56), L3 = vec3(0.1, -0.35, 0.93);
uniform float uFeuer;
uniform float uUnschaerfe;     // Radius der Tiefenschärfe im Bild
uniform float uRad;            // Radius der Hüllkugel um den Stein
uniform int uZustand;          // 0 vollkommen, 1 gesprungen, 2 im Entstehen, 3 im Zerfall
uniform vec3 uRiss, uRissA, uRissB;   // Rissebene (gedreht mit dem Stein)
uniform float uVer;             // Verschmelzung: wie weit der Kristall ins Bild übergreift
uniform float uSpalt, uRissC;   // gesprungen: halbe Spaltbreite und Lage der Rissebene
uniform vec3 uRissVer;          // gesprungen: Richtung, in der die beiden Stücke auseinanderweichen
// Kennung der Rissfläche; z ist die Zusatzebene des gerade gerechneten Stücks (xyz Normale, w Abstand), null = keine.
// Kein globaler Zustand und kein Zugriff ausserhalb der Ebenenliste: manche Handytreiber lehnen beides ab.
const int RISSFLAECHE = 99;
vec3 ebeneZ(int k, vec4 z){ return k == RISSFLAECHE ? z.xyz : uN[min(k, MAX_K - 1)]; }

float h(float n){ return fract(sin(n*91.345+7.13)*43758.5453); }
vec3 holen(vec2 u, float s){ vec2 m = 1.0 - abs(mod(u, 2.0) - 1.0); return texture(uZeit, vec3(m.x, 1.0 - m.y, s)).rgb; }
vec3 jetztHolen(vec2 u){ vec2 m = 1.0 - abs(mod(u, 2.0) - 1.0); return texture(uScharf, vec2(m.x, 1.0 - m.y)).rgb; }

// Strahl trifft die Bildwand hinter dem Kristall: dort liegt die Zeit
vec2 wand(vec3 p, vec3 d){
  // begrenzte Abbildung: flache Austrittswinkel laufen nicht ins Unendliche (sonst Moiré)
  float hh = (AUGE - WAND) * TAN;
  vec2 q = p.xy + d.xy / max(-d.z, 0.42) * (p.z - WAND) * 0.55;
  return q / vec2(hh * uSeite, hh) * 0.5 + 0.5;
}
vec3 ebene(int k){ return uN[k]; }   // schon gedreht (auf dem Prozessor, einmal je Bild)

// konvexer Kristall als Schnitt von Halbräumen: Eintritt und Austritt exakt
bool treffenS(vec3 ro, vec3 rd, float sk, out float t0, out int i0){
  t0 = -1e9; float t1 = 1e9; i0 = 0;
  // Hüllkugel zuerst: wer sie verfehlt, verfehlt den Stein, ohne alle Ebenen zu prüfen
  float rr = uRad * sk, bb = dot(ro, rd), cc = dot(ro, ro) - rr * rr;
  if (cc > 0.0 && (bb > 0.0 || bb * bb < cc)) return false;
  for (int k = 0; k < MAX_K; k++) {
    if (k >= uK) break;
    vec3 n = ebene(k); float dn = dot(rd, n), ab = uR[k] * sk - dot(ro, n);
    if (abs(dn) < 1e-6) { if (ab < 0.0) return false; continue; }
    float t = ab / dn;
    if (dn < 0.0) { if (t > t0) { t0 = t; i0 = k; } } else { t1 = min(t1, t); }
  }
  return t0 < t1 && t1 > 0.0;
}
bool treffen(vec3 ro, vec3 rd, out float t0, out int i0){ return treffenS(ro, rd, 1.0, t0, i0); }
float austrittS(vec3 p, vec3 d, float sk, out int i1){
  float t1 = 1e9; i1 = 0;
  for (int k = 0; k < MAX_K; k++) {
    if (k >= uK) break;
    vec3 n = ebene(k); float dn = dot(d, n);
    if (dn > 1e-6) { float t = (uR[k] * sk - dot(p, n)) / dn; if (t < t1) { t1 = t; i1 = k; } }
  }
  return t1;
}
// Austritt aus dem Stein oder aus einem Stück des gesprungenen Steins (z = Rissebene des Stücks, null = ganzer Stein)
float austrittZ(vec3 p, vec3 d, vec4 z, out int i1){
  float t1 = austrittS(p, d, 1.0, i1), dz = dot(d, z.xyz);
  if (dz > 1e-6) { float tz = (z.w - dot(p, z.xyz)) / dz; if (tz < t1) { t1 = tz; i1 = RISSFLAECHE; } }
  return t1;
}
#if RISS
// eine Zusatzebene in den Ein- und Austritt eines Strahls einrechnen
void halbraum(vec3 ro, vec3 rd, vec4 z, inout float t0, inout float t1, inout int i0){
  float dn = dot(rd, z.xyz), ab = z.w - dot(ro, z.xyz);
  if (abs(dn) < 1e-6) { if (ab < 0.0) t1 = -1e9; return; }
  float t = ab / dn;
  if (dn < 0.0) { if (t > t0) { t0 = t; i0 = RISSFLAECHE; } } else t1 = min(t1, t);
}
// gesprungen: beide Stücke in einem Durchgang über die Ebenen. Gleiche Richtung, Ursprung um ±off verschoben;
// Stück A liegt jenseits der Rissebene, Stück B diesseits. ta, tb < 0: verfehlt.
void stueckeTreffen(vec3 ro, vec3 rd, vec3 off, out float ta, out int ia, out float tb, out int ib){
  float a0 = -1e9, a1 = 1e9, b0 = -1e9, b1 = 1e9; ia = 0; ib = 0; ta = -1.0; tb = -1.0;
  float rr = uRad + length(off), bb = dot(ro, rd), cc = dot(ro, ro) - rr * rr;
  if (cc > 0.0 && (bb > 0.0 || bb * bb < cc)) return;
  vec3 ra = ro - off, rb = ro + off;
  for (int k = 0; k < MAX_K; k++) {
    if (k >= uK) break;
    vec3 n = uN[k]; float dn = dot(rd, n), aa = uR[k] - dot(ra, n), ab = uR[k] - dot(rb, n);
    if (abs(dn) < 1e-6) { if (aa < 0.0) a1 = -1e9; if (ab < 0.0) b1 = -1e9; continue; }
    float sa = aa / dn, sb = ab / dn;
    if (dn < 0.0) { if (sa > a0) { a0 = sa; ia = k; } if (sb > b0) { b0 = sb; ib = k; } }
    else { a1 = min(a1, sa); b1 = min(b1, sb); }
  }
  halbraum(ra, rd, vec4(-uRiss, -uRissC), a0, a1, ia);
  halbraum(rb, rd, vec4(uRiss, uRissC), b0, b1, ib);
  if (a0 < a1 && a0 > 0.0) ta = a0;
  if (b0 < b1 && b0 > 0.0) tb = b0;
}
#endif
// Wellenlänge (nm) -> Farbgewicht, weich genug für ein sauberes Spektrum
vec3 spektrum(float l){
  float r = exp(-pow((l - 610.0) / 55.0, 2.0)) + 0.35 * exp(-pow((l - 420.0) / 30.0, 2.0));
  float g = exp(-pow((l - 545.0) / 50.0, 2.0));
  float b = exp(-pow((l - 450.0) / 40.0, 2.0));
  return vec3(r, g, b);
}

void main(){
  vec2 sc = v * 2.0 - 1.0;
  vec3 ro = vec3(0.0, 0.0, AUGE);
  vec3 rd = normalize(vec3(sc.x * uSeite * TAN, sc.y * TAN, -1.0));
  vec3 rk = ro - vec3(uLage, 0.0);   // Kristall verschoben

  // Aussen: die aktuelle Gegenwart
  // Tiefenschärfe wie in der Edelsteinfotografie: das Bild hinter dem Stein weich, der Stein scharf.
  // Mit der Verschmelzung wird das Bild wieder scharf: Aktuelles und Virtuelles gleichen sich an.
  vec3 jetzt = jetztHolen(v);
  float unsch = uUnschaerfe * pow(1.0 - uVer, 1.5);
  if (unsch > 0.0005) {
    vec2 r = vec2(unsch / uSeite, unsch);
    vec3 s = jetzt;
    for (int k = 0; k < PROBEN; k++) {
      float w = float(k) * 2.39996 + 0.5, rr = sqrt((float(k) + 0.5) / float(PROBEN));
      s += jetztHolen(v + vec2(cos(w), sin(w)) * rr * r);
    }
    jetzt = s / float(PROBEN + 1);
  }
  float vign = smoothstep(1.6, 0.35, length(sc * vec2(uSeite * 0.75, 1.0)));
  vec3 col = jetzt * mix(0.32, 0.78, vign);

  // Verschmelzung: der Kristall greift ins Bild über. Ein grösserer, unsichtbarer Kristall um den Stein
  // zerlegt das Bild in Facetten; jede bricht eine andere vergangene Zeit und spiegelt die Gegenwart.
  // Je stärker, desto weniger lässt sich sagen, wo der Stein endet und das Bild beginnt.
  if (uVer > 0.001) {
    float G = 1.0 + 2.6 * uVer, u0; int k0;
    if (treffenS(rk, rd, G, u0, k0) && u0 > 0.0) {
      vec3 g0 = rk + rd * u0, gn = ebene(k0);
      float A = 1.3 + 0.5 * uBrech, B = 0.006 + 0.02 * uBrech;
      vec3 geist = vec3(0.0), summe = vec3(0.0);
      for (int w = 0; w < PWELLEN; w++) {
        float l = mix(420.0, 680.0, (float(w) + 0.5) / float(PWELLEN));
        float ior = A + B / pow(l / 1000.0, 2.0);
        vec3 d = refract(rd, gn, 1.0 / ior);
        int i1; float t1 = austrittS(g0 + d * 1e-4, d, G, i1);
        vec3 q = g0 + d * t1, aus = refract(d, -ebene(i1), ior);
        if (dot(aus, aus) == 0.0) aus = reflect(d, -ebene(i1));
        vec3 gew = spektrum(l);
        geist += holen(wand(q + vec3(uLage, 0.0), aus), uSchicht[k0]) * gew;
        summe += gew;
      }
      geist /= summe;
      float fres = 0.04 + 0.96 * pow(1.0 - abs(dot(rd, gn)), 5.0);
      geist = mix(geist, jetztHolen(wand(g0 + vec3(uLage, 0.0), reflect(rd, gn))), clamp(fres, 0.0, 1.0));
      // feine Facettenkanten im Bild
      float zweite = -1e9;
      for (int k = 0; k < MAX_K; k++) { if (k >= uK) break; if (k != k0) zweite = max(zweite, dot(g0, ebene(k)) - uR[k] * G); }
      float linie = 1.0 - smoothstep(0.0, 0.008 * G, -zweite);
      col = mix(col, geist * mix(0.42, 0.9, vign), uVer * 0.85) + linie * 0.18 * uVer;
    }
  }

  // gesprungener Kristall (Renoir): der Stein ist in zwei Stücke zerbrochen, die auseinanderweichen.
  // Durch den Spalt entweicht Licht: die Gegenwart, das Leben, das nicht im Kristall bleibt.
  float t0; int i0; bool trifft = false; vec3 versatz = vec3(0.0); float jenseits = 0.0; vec4 z = vec4(0.0);
#if RISS
  if (uZustand == 1 && uSpalt > 0.0) {
    float ta, tb; int ia, ib;
    vec3 offA = uRissVer * uSpalt;
    stueckeTreffen(rk, rd, offA, ta, ia, tb, ib);
    if (ta > 0.0 && (tb <= 0.0 || ta < tb)) { z = vec4(-uRiss, -uRissC); t0 = ta; i0 = ia; versatz = offA; jenseits = 1.0; trifft = true; }
    else if (tb > 0.0) { z = vec4(uRiss, uRissC); t0 = tb; i0 = ib; versatz = -offA; trifft = true; }
  } else trifft = treffen(rk, rd, t0, i0) && t0 > 0.0;
#else
  trifft = treffen(rk, rd, t0, i0) && t0 > 0.0;
#endif

  // Licht aus dem Spalt: eine dünne leuchtende Schicht entlang der Rissebene, die über den Stein hinaus ins Bild strahlt
#if RISS >= 2
  if (uZustand == 1 && uSpalt > 0.0) {
    float dn = dot(rd, uRiss), tc = (uRissC - dot(rk, uRiss)) / (abs(dn) < 1e-4 ? 1e-4 : dn);
    if (tc > 0.0) {
      vec3 pc = rk + rd * tc;
      float weg = min(2.0 * uSpalt / max(abs(dn), 0.02), 3.5 * uSpalt);
      float r = length(pc) / uRad;
      float ab = exp(-max(r - 0.5, 0.0) * 1.5) * (1.0 + 0.5 * smoothstep(1.1, 0.6, r));
      float w = atan(dot(pc, uRissB), dot(pc, uRissA));
      float strahl = 0.45 + 0.55 * pow(0.5 + 0.5 * sin(w * 11.0 + 2.0 * sin(w * 3.0 + uT * 0.37) + uT * 0.21), 3.0);
      float hinter = (trifft && t0 < tc) ? 0.3 : 1.0;
      vec3 licht = mix(vec3(1.0, 0.84, 0.6), jetzt * 1.6 + 0.25, 0.45);
      vec3 schein = licht * (weg / uSpalt) * 0.3 * ab * strahl * hinter;
      col += schein / (1.0 + 0.6 * dot(col, vec3(0.333)));   // auf hellem Bild sanfter, damit nichts ausbrennt
    }
  }
#endif

  if (trifft) {
    vec3 p0 = rk - versatz + rd * t0, n0 = ebeneZ(i0, z);
    vec3 welt = vec3(uLage, 0.0) + versatz;
    bool bruch = i0 == RISSFLAECHE;
    int iz = bruch ? 0 : i0;
    // Kantenlicht: wie nah liegt der Punkt an einer zweiten Ebene?
    float zweite = -1e9;
    for (int k = 0; k < MAX_K; k++) { if (k >= uK) break; if (k != i0) zweite = max(zweite, dot(p0, ebene(k)) - uR[k]); }
    if (!bruch && dot(z.xyz, z.xyz) > 0.0) zweite = max(zweite, dot(p0, z.xyz) - z.w);
    float kante = 1.0 - smoothstep(0.0, mix(0.005, 0.012 + 0.01 * uBrech, step(0.5, uKante)), -zweite);

    // Spiegelung an der Oberfläche: das Aktuelle
    vec3 rf = reflect(rd, n0);
    vec3 spiegel = jetztHolen(wand(p0 + welt, rf));
    float fres = 0.04 + 0.96 * pow(1.0 - abs(dot(rd, n0)), 5.0);

    // Brechung ins Innere: das Virtuelle, je Facette eine andere Zeit, spektral zerlegt
    float A = 1.42 + 0.95 * uBrech, B = 0.004 + 0.03 * uBrech;
    float sch = uSchicht[iz];
    if (jenseits > 0.5) sch = uJetzt;      // jenseits des Risses: nichts Vergangenes mehr, nur das Jetzt
    vec3 innen = vec3(0.0), summe = vec3(0.0);
    for (int w = 0; w < WELLEN; w++) {
      float l = mix(410.0, 690.0, (float(w) + 0.5) / float(WELLEN));
      float ior = A + B / pow(l / 1000.0, 2.0);
      vec3 d = refract(rd, n0, 1.0 / ior), p = p0;
      float weg = 0.0;
      for (int b = 0; b < WEGE; b++) {       // innere Wege, mit Totalreflexion
        int i1; float t1 = austrittZ(p + d * 1e-4, d, z, i1);
        p = p + d * t1; weg += t1; vec3 n1 = ebeneZ(i1, z);
        vec3 aus = refract(d, -n1, ior);
        if (dot(aus, aus) > 0.0) { d = aus; break; }
        d = reflect(d, -n1);                 // Totalreflexion: noch einmal durch den Stein
      }
      vec3 gew = spektrum(l);
      // Feuer: wo ein Strahl den Stein Richtung Licht verlässt, blitzt seine Farbe auf
      float feuer = pow(max(dot(d, L1), 0.0), 260.0) + pow(max(dot(d, L2), 0.0), 260.0) + pow(max(dot(d, L3), 0.0), 260.0);
      innen += (holen(wand(p + welt, d), sch) + feuer * uFeuer) * gew * exp(-uTon * weg * 2.0);
      summe += gew;
    }
    innen /= summe;
    float alter = uAlter[iz];
    float lum = dot(innen, vec3(0.299, 0.587, 0.114));
    innen = mix(innen, vec3(lum) * vec3(0.9, 0.96, 1.08), alter * 0.4) * (1.0 - alter * 0.22);
    innen *= vec3(1.02, 1.0, 0.98) * 1.08;
    // Kristall im Zerfall (Visconti): die Vergangenheit vergilbt und trübt sich
    if (uZustand == 3) {
      float l2 = dot(innen, vec3(0.299, 0.587, 0.114));
      innen = mix(innen, l2 * vec3(1.06, 0.86, 0.6), 0.78);
      innen = mix(innen, vec3(0.5, 0.45, 0.38), 0.22 + 0.16 * sin(uT * 0.6 + float(iz) * 1.7));
      innen *= 0.86;
    }

    float glanz = (pow(max(dot(rf, L1), 0.0), 220.0) + 0.7 * pow(max(dot(rf, L2), 0.0), 300.0) + 0.5 * pow(max(dot(rf, L3), 0.0), 300.0)) * 0.9;
    col = mix(innen, spiegel * 1.15, clamp(fres, 0.0, 1.0)) + glanz;
    col = mix(col, vec3(1.0, 0.98, 0.94), kante * uKante);
    // die Bruchfläche: rau, milchig und von innen beleuchtet, das Licht des Spalts liegt auf ihr
    if (bruch) {
      float rau = 0.5 + 0.5 * sin(dot(p0, uRissA) * 61.0 + 3.0 * sin(dot(p0, uRissB) * 43.0)) * sin(dot(p0, uRissB) * 57.0 + 1.7);
      vec3 milch = mix(innen, vec3(dot(innen, vec3(0.33))) * 1.25, 0.5);
      col = mix(milch, vec3(1.0, 0.9, 0.72), 0.22 + 0.25 * rau) + glanz * 0.5;
      col = mix(col, vec3(1.0, 0.98, 0.94), kante * max(uKante, 0.5));
    }
  }
  o = vec4(col, 1.0);
}`;

function programm(vs, fs) {
  const mk = (typ, src) => { const s = gl.createShader(typ); gl.shaderSource(s, src); gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s)); return s; };
  const p = gl.createProgram(); gl.attachShader(p, mk(gl.VERTEX_SHADER, vs)); gl.attachShader(p, mk(gl.FRAGMENT_SHADER, fs)); gl.bindAttribLocation(p, 0, 'a');
  gl.linkProgram(p); if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(p)); return p;
}

// ---------- Nachbearbeitung: Leuchten (Bloom) und glatte Kanten (FXAA) ----------
const NVS = `#version 300 es
in vec2 a; out vec2 v;
void main(){ v = a*0.5+0.5; gl_Position = vec4(a,0.,1.); }`;
// hell: die hellsten Stellen herausziehen und auf ein Viertel verkleinern
const FS_HELL = `#version 300 es
precision highp float; in vec2 v; out vec4 o; uniform sampler2D uQ; uniform vec2 uPx;
void main(){
  vec3 c = 0.25 * (texture(uQ, v + uPx * vec2(-1, -1)).rgb + texture(uQ, v + uPx * vec2(1, -1)).rgb
                 + texture(uQ, v + uPx * vec2(-1, 1)).rgb + texture(uQ, v + uPx * vec2(1, 1)).rgb);
  float l = max(c.r, max(c.g, c.b));
  o = vec4(c * smoothstep(0.62, 1.15, l), 1.0);
}`;
// weich: Gauss in einer Richtung, neun Abgriffe über lineare Filterung
const FS_WEICH = `#version 300 es
precision highp float; in vec2 v; out vec4 o; uniform sampler2D uQ; uniform vec2 uRichtung;
void main(){
  vec3 c = texture(uQ, v).rgb * 0.2270270270;
  c += (texture(uQ, v + uRichtung * 1.3846153846).rgb + texture(uQ, v - uRichtung * 1.3846153846).rgb) * 0.3162162162;
  c += (texture(uQ, v + uRichtung * 3.2307692308).rgb + texture(uQ, v - uRichtung * 3.2307692308).rgb) * 0.0702702703;
  o = vec4(c, 1.0);
}`;
// zusammen: FXAA auf dem Bild, Leuchten dazu, Korn
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
  c += (h(dot(v, vec2(12.9898, 78.233)) * 100.0 + uT) - 0.5) * 0.03;
  o = vec4(c, 1.0);
}`;
let progHell, progWeich, progZusammen, nachOrt = {}, halbFloat = false;
const ziele = {};   // szene (volle Grösse), glowA/glowB (ein Viertel)
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
    // Gerät kann nicht in HalfFloat zeichnen: auf 8 Bit zurück
    halbFloat = false; spur('kein HalfFloat-Ziel'); for (const n in ziele) { ziele[n].b = 0; } gl.bindFramebuffer(gl.FRAMEBUFFER, null); return zielBauen(name, b, hh);
  }
  gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  return z;
}
function nachbearbeiten(t) {
  const B = leinwand.width, H = leinwand.height, b4 = Math.max(1, Math.round(B / 4)), h4 = Math.max(1, Math.round(H / 4));
  const szene = ziele.szene, gA = zielBauen('glowA', b4, h4), gB = zielBauen('glowB', b4, h4);
  gl.activeTexture(gl.TEXTURE1);
  // hell herausziehen
  gl.bindFramebuffer(gl.FRAMEBUFFER, gA.fb); gl.viewport(0, 0, b4, h4);
  gl.useProgram(progHell); gl.bindTexture(gl.TEXTURE_2D, szene.tex);
  gl.uniform1i(nachOrt.hellQ, 1); gl.uniform2f(nachOrt.hellPx, 1.5 / B, 1.5 / H);
  gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  // zweimal weich: waagrecht, senkrecht
  gl.useProgram(progWeich); gl.uniform1i(nachOrt.weichQ, 1);
  gl.bindFramebuffer(gl.FRAMEBUFFER, gB.fb); gl.bindTexture(gl.TEXTURE_2D, gA.tex); gl.uniform2f(nachOrt.weichR, 1.6 / b4, 0); gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  gl.bindFramebuffer(gl.FRAMEBUFFER, gA.fb); gl.bindTexture(gl.TEXTURE_2D, gB.tex); gl.uniform2f(nachOrt.weichR, 0, 1.6 / h4); gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  // zusammen auf den Bildschirm
  gl.bindFramebuffer(gl.FRAMEBUFFER, null); gl.viewport(0, 0, B, H);
  gl.useProgram(progZusammen);
  gl.activeTexture(gl.TEXTURE1); gl.bindTexture(gl.TEXTURE_2D, szene.tex);
  gl.activeTexture(gl.TEXTURE2); gl.bindTexture(gl.TEXTURE_2D, gA.tex);
  gl.uniform1i(nachOrt.zSzene, 1); gl.uniform1i(nachOrt.zGlow, 2);
  gl.uniform2f(nachOrt.zPx, 1 / B, 1 / H); gl.uniform1f(nachOrt.zGlowStaerke, 0.85); gl.uniform1f(nachOrt.zT, t % 100);
  gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  gl.activeTexture(gl.TEXTURE0);
}

let prog, ort = {}, zeitTex = null, pufferB = 0, pufferH = 0, scharfTex = null, scharfB = 0, scharfH = 0;
if (gl) {
  // Lehnt der Grafiktreiber des Geräts den vollen Shader ab, läuft der Kristall ohne Bruch weiter, statt die Seite zu blockieren
  for (const stufe of [2, 1, 0]) {
    try { prog = programm(VS, fsText(stufe)); if (stufe < 2) spur('Shader Stufe ' + stufe); break; }
    catch (e) { spur('Shader ' + stufe + ' abgelehnt: ' + String(e.message || e).slice(0, 160)); console.error(e); if (!stufe) throw e; }
  }
  gl.useProgram(prog);
  const buf = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
  const a = gl.getAttribLocation(prog, 'a'); gl.enableVertexAttribArray(a); gl.vertexAttribPointer(a, 2, gl.FLOAT, false, 0, 0);
  halbFloat = !!gl.getExtension('EXT_color_buffer_float');
  progHell = programm(NVS, FS_HELL); progWeich = programm(NVS, FS_WEICH); progZusammen = programm(NVS, FS_ZUSAMMEN);
  nachOrt = { hellQ: gl.getUniformLocation(progHell, 'uQ'), hellPx: gl.getUniformLocation(progHell, 'uPx'),
    weichQ: gl.getUniformLocation(progWeich, 'uQ'), weichR: gl.getUniformLocation(progWeich, 'uRichtung'),
    zSzene: gl.getUniformLocation(progZusammen, 'uSzene'), zGlow: gl.getUniformLocation(progZusammen, 'uGlow'), zPx: gl.getUniformLocation(progZusammen, 'uPx'),
    zGlowStaerke: gl.getUniformLocation(progZusammen, 'uGlowStaerke'), zT: gl.getUniformLocation(progZusammen, 'uT') };
  for (const n of ['uZeit', 'uN', 'uR', 'uSchicht', 'uAlter', 'uK', 'uKante', 'uTon', 'uFeuer', 'uVer', 'uZustand', 'uUnschaerfe', 'uRad', 'uRiss', 'uRissA', 'uRissB', 'uLage', 'uSeite', 'uBrech', 'uT', 'uJetzt', 'uScharf', 'uSpalt', 'uRissC', 'uRissVer']) ort[n] = gl.getUniformLocation(prog, n);
  spur('Grafik bereit');
}

// Aufnahmeleinwand: schneidet die Quelle passend zu (cover) und spiegelt die Selfie-Kamera
const fang = document.createElement('canvas');
const fctx = fang.getContext('2d', { alpha: false, willReadFrequently: false });
const scharf = document.createElement('canvas');
const sctx = scharf.getContext('2d', { alpha: false, willReadFrequently: false });

// Auflösung passt sich an: ruckelt es, rechnet der Kristall mit weniger Bildpunkten (bis zur Hälfte)
let aufloesung = 1, messung = [], letzteAnpassung = 0;
function tempoMessen(ms, dt) {
  if (aufnehmer || document.hidden) { messung = []; return; }
  messung.push(dt);
  if (messung.length < 30 || ms - letzteAnpassung < 1500) return;
  messung.sort((a, b) => a - b);
  const mitte = messung[15]; messung = [];
  let neu = aufloesung;
  if (mitte > 24) neu = Math.max(leicht ? 0.35 : 0.5, aufloesung * 0.82);
  else if (mitte < 17.5 && aufloesung < 1) neu = Math.min(1, aufloesung * 1.12);
  if (neu !== aufloesung) { aufloesung = neu; letzteAnpassung = ms; groesse(); spur('Auflösung ' + aufloesung.toFixed(2)); }
}
function groesse() {
  const dpr = Math.min(devicePixelRatio || 1, MAX_DPR) * aufloesung;
  const b = Math.round(innerWidth * dpr), hh = Math.round(innerHeight * dpr);
  if (leinwand.width !== b || leinwand.height !== hh) { leinwand.width = b; leinwand.height = hh; }
  const seite = innerWidth / innerHeight;
  const pb = seite >= 1 ? LANGE_SEITE : Math.round(LANGE_SEITE * seite);
  const ph = seite >= 1 ? Math.round(LANGE_SEITE / seite) : LANGE_SEITE;
  if (gl && (pb !== pufferB || ph !== pufferH)) {
    pufferB = pb; pufferH = ph; fang.width = pb; fang.height = ph;
    if (zeitTex) gl.deleteTexture(zeitTex);
    zeitTex = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D_ARRAY, zeitTex);
    gl.texStorage3D(gl.TEXTURE_2D_ARRAY, 1, gl.RGBA8, pb, ph, SCHICHTEN);
    gl.texParameteri(gl.TEXTURE_2D_ARRAY, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D_ARRAY, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D_ARRAY, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D_ARRAY, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gefuellt = false;
  }
  // scharfe Gegenwart: so gross wie die Leinwand, höchstens SCHARF_SEITE, nie grösser als die Quelle
  const lang = Math.min(SCHARF_SEITE, Math.max(LANGE_SEITE, Math.round(Math.max(innerWidth, innerHeight) * Math.min(devicePixelRatio || 1, 2))));
  const sb = seite >= 1 ? lang : Math.round(lang * seite), sh = seite >= 1 ? Math.round(lang / seite) : lang;
  if (gl && (sb !== scharfB || sh !== scharfH)) {
    scharfB = sb; scharfH = sh; scharf.width = sb; scharf.height = sh;
    if (!scharfTex) scharfTex = gl.createTexture();
    gl.activeTexture(gl.TEXTURE3); gl.bindTexture(gl.TEXTURE_2D, scharfTex);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, sb, sh, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
    for (const [k, w] of [[gl.TEXTURE_MIN_FILTER, gl.LINEAR], [gl.TEXTURE_MAG_FILTER, gl.LINEAR], [gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE], [gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE]]) gl.texParameteri(gl.TEXTURE_2D, k, w);
    gl.activeTexture(gl.TEXTURE0);
  }
  if (fotos.length) fotoBuehneGroesse();
}
addEventListener('resize', groesse);

// ---------- Quellen ----------
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
    // gewünschte Seite fehlt: die andere versuchen
    blick = blick === 'user' ? 'environment' : 'user';
    try { strom = await navigator.mediaDevices.getUserMedia({ video: { facingMode: blick }, audio: false }); } catch (e2) {}
  }
  if (!strom) { spur('Kamera abgelehnt'); return melden(TEXTE[sprache].keineKamera); }
  videoEl.srcObject = strom; await videoEl.play();
  const zahl = await kameraZahl();
  spur('Kamera ' + videoEl.videoWidth + '×' + videoEl.videoHeight);
  // gespiegelt wird nur, was zum Gesicht schaut; ohne Angabe (Laptop mit einer Kamera) ebenfalls
  const echt = strom.getVideoTracks()[0]?.getSettings?.().facingMode;
  quelle = videoEl; spiegelnQuelle = echt ? echt === 'user' : zahl < 2; starten();
  $('wenden').hidden = zahl < 2;
}
$('wenden').addEventListener('click', () => { blick = blick === 'user' ? 'environment' : 'user'; kameraStarten(); });

function videoStarten(datei) {
  spur('Video gewählt');
  videoEl.srcObject = null; $('wenden').hidden = true; videoEl.src = URL.createObjectURL(datei);
  videoEl.play().then(() => { quelle = videoEl; spiegelnQuelle = false; starten(); }).catch(() => melden(TEXTE[sprache].keineKamera));
}

// Beispiel ohne Kamera: eine kleine Choreografie aus Figur, Licht und Schrift
const beispiel = document.createElement('canvas');
beispiel.width = 960; beispiel.height = 540;
function beispielMalen(t) {
  const c = beispiel.getContext('2d'), W = beispiel.width, H = beispiel.height;
  const g = c.createLinearGradient(0, 0, W, H); g.addColorStop(0, '#1b1a2a'); g.addColorStop(1, '#3a1c16');
  c.fillStyle = g; c.fillRect(0, 0, W, H);
  // Frankenthaler-Feld
  c.globalAlpha = 0.55; c.fillStyle = '#c9542f';
  c.beginPath(); c.ellipse(W * 0.3 + Math.sin(t * 0.4) * 60, H * 0.55, 220, 150, 0.3, 0, 7); c.fill();
  c.fillStyle = '#2f6f8f'; c.beginPath(); c.ellipse(W * 0.72, H * 0.4 + Math.cos(t * 0.3) * 40, 180, 120, -0.4, 0, 7); c.fill();
  c.globalAlpha = 1;
  // gehende Figur
  const x = ((t * 90) % (W + 200)) - 100, y = H * 0.62, s = Math.sin(t * 5);
  c.strokeStyle = '#ece8df'; c.lineWidth = 9; c.lineCap = 'round';
  c.beginPath(); c.arc(x, y - 120, 22, 0, 7); c.stroke();
  c.beginPath(); c.moveTo(x, y - 96); c.lineTo(x, y - 20);
  c.moveTo(x, y - 20); c.lineTo(x + s * 26, y + 50); c.moveTo(x, y - 20); c.lineTo(x - s * 26, y + 50);
  c.moveTo(x, y - 75); c.lineTo(x - s * 30, y - 30); c.moveTo(x, y - 75); c.lineTo(x + s * 30, y - 30); c.stroke();
  // Zwischentitel
  c.fillStyle = 'rgba(236,232,223,0.9)'; c.font = 'italic 46px Georgia, serif'; c.textAlign = 'center';
  c.fillText(Math.floor(t / 3) % 2 ? 'virtuel' : 'actuel', W / 2, 90);
}
// Beispiel: Christians Porträt «Wan, Pendel» aus dem ORNAMENT LAB; die gemalte Szene bleibt als Rückfall
// Beispiele: Christians Porträt «Wan, Pendel» und «Infinite Mantra»; jedes Tippen auf «Beispiel» nimmt das nächste
const BEISPIELE = ['beispiel.mp4?v=2', 'mantra.mp4?v=1'];
function beispielStarten(e) {
  let nr = 0;
  try { nr = e ? (+(localStorage.getItem('kristall.beispiel') || 0)) % BEISPIELE.length : 0; localStorage.setItem('kristall.beispiel', String(nr + 1)); } catch {}
  spur('Beispiel ' + (nr + 1));
  videoEl.srcObject = null; $('wenden').hidden = true; videoEl.src = BEISPIELE[nr];
  videoEl.play().then(() => { quelle = videoEl; spiegelnQuelle = false; starten(); })
    .catch(() => { spur('Beispielvideo fehlt'); quelle = beispiel; spiegelnQuelle = false; starten(); });
}

// der Klang darf erst nach einer Berührung beginnen
addEventListener('pointerdown', klangStarten, { capture: true });
$('kamera').addEventListener('click', kameraStarten);
$('beispiel').addEventListener('click', beispielStarten);
$('datei').addEventListener('change', (e) => {
  const alle = [...e.target.files]; e.target.value = '';
  const film = alle.find((f) => f.type.startsWith('video/'));
  if (film) return videoStarten(film);
  const fotos = alle.filter((f) => f.type.startsWith('image/'));
  if (fotos.length) fotosStarten(fotos);
});

// Fotos: ein Foto hat keine Zeit, also bekommt es eine. Eines wandert langsam durch seinen eigenen Ausschnitt,
// mehrere lösen einander ab. Der Zeitpuffer hält so frühere Ausschnitte und frühere Fotos fest:
// in den Facetten erscheinen sie als das Virtuelle neben dem aktuellen Bild.
const fotoBuehne = document.createElement('canvas');
let fotos = [], fotoStart = 0;
const FOTO_DAUER = 3.2, FOTO_BLENDE = 1.1;
// die Bühne der Fotos ist so gross wie die scharfe Gegenwart, nicht kleiner (sonst werden eigene Fotos weich)
function fotoBuehneGroesse() {
  const b = scharfB || 960, h = scharfH || Math.round(960 * innerHeight / Math.max(innerWidth, 1));
  if (fotoBuehne.width !== b || fotoBuehne.height !== h) { fotoBuehne.width = b; fotoBuehne.height = h; spur('Fotobühne ' + b + '×' + h); }
}
async function fotosStarten(dateien) {
  spur('Fotos gewählt: ' + dateien.length);
  for (const f of fotos) f.close?.();
  fotos = [];
  for (const d of dateien.slice(0, 24)) {
    try {
      const roh = await createImageBitmap(d);
      // Telefonregel: höchstens 2400 Punkte; so bleibt die Kamerafahrt durchs Foto auch am grossen Bildschirm scharf
      const s = Math.min(1, 2400 / Math.max(roh.width, roh.height));
      fotos.push(s < 1 ? await createImageBitmap(roh, { resizeWidth: Math.round(roh.width * s), resizeHeight: Math.round(roh.height * s), resizeQuality: 'high' }) : roh);
      if (s < 1) roh.close();
    } catch { spur('Foto unlesbar'); }
  }
  if (!fotos.length) return melden(TEXTE[sprache].keineKamera);
  fotoBuehneGroesse();
  $('wenden').hidden = true; quelle = fotoBuehne; spiegelnQuelle = false; fotoStart = performance.now() / 1000; starten();
}
function fotoMalen(t) {
  const c = fotoBuehne.getContext('2d'), W = fotoBuehne.width, H = fotoBuehne.height;
  const zeit = t - fotoStart, n = fotos.length;
  const nr = Math.floor(zeit / FOTO_DAUER), innen = zeit - nr * FOTO_DAUER;
  const zeichne = (k, alpha) => {
    const f = fotos[((k % n) + n) % n], lauf = (zeit - k * FOTO_DAUER) / (FOTO_DAUER + FOTO_BLENDE);
    // langsame Kamerafahrt durch das Foto, jede in eine andere Richtung
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

// ---------- Kristall ----------
const zustandRasten = [0.12, 0.38, 0.63, 0.89];
let facetten = 18, tiefe = 3, brech = 0.35, form = 'brillant', verschmelzung = 0, zustand = 0;
$('r-facetten').addEventListener('input', (e) => { facetten = +e.target.value; });
$('r-tiefe').addEventListener('input', (e) => { tiefe = +e.target.value; });
$('r-brechung').addEventListener('input', (e) => { brech = +e.target.value; });
$('r-verschmelzung').addEventListener('input', (e) => { verschmelzung = +e.target.value; });
// Schliff wählen: Form und Material; die Facettenzahl gilt nur für den freien Stein
function formWaehlen(name) {
  form = name;
  document.querySelectorAll('[data-form]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.form === name)));
  $('zeile-facetten').hidden = name !== 'stein';
  brech = SCHLIFFE[name].brechung; $('r-brechung').value = brech;
  try { localStorage.setItem('kristall.form', name); } catch {}
  spur('Form ' + name);
}
document.querySelectorAll('[data-form]').forEach((b) => b.addEventListener('click', () => formWaehlen(b.dataset.form)));
// Zustand wählen: kurzer Zwischentitel mit Film, in der Begriffsebene der ausführliche Text
let titelUhr = 0;
function zustandWaehlen(nr, still) {
  if (nr === 1 && zustand !== 1) rissStart = performance.now() / 1000;
  zustand = nr;
  document.querySelectorAll('[data-zustand]').forEach((b) => b.setAttribute('aria-pressed', String(+b.dataset.zustand === nr)));
  $('r-zustand').value = String(Math.round(zustandRasten[ZUSTAND_STELLE.indexOf(nr)] * 1000));
  zustandText();
  try { localStorage.setItem('kristall.zustand', String(nr)); } catch {}
  if (still) return;
  const z = TEXTE[sprache].zustaende[nr], g = $('geste');
  g.textContent = z.titel + ' · ' + z.wer; g.hidden = false; g.classList.remove('weg');
  clearTimeout(titelUhr); titelUhr = setTimeout(() => g.classList.add('weg'), 3200);
  spur('Zustand ' + ZUSTAENDE[nr]);
}
function zustandText() {
  const z = TEXTE[sprache].zustaende[zustand];
  $('b-zustand-titel').textContent = z.titel + ' · ' + z.wer;
  $('b-zustand-text').textContent = z.text;
}
document.querySelectorAll('[data-zustand]').forEach((b) => b.addEventListener('click', () => zustandWaehlen(+b.dataset.zustand)));
// die Spur: ziehen oder auf die Linie tippen, rastet bei den vier Zuständen ein (Reihenfolge eines Lebenslaufs)
// Die Rasten liegen unter der Mitte der Wörter; die Wörter selbst verteilen sich gleichmässig über die Breite.
const ZUSTAND_STELLE = [2, 0, 1, 3];
function zustandRastenMessen() {
  const nav = document.querySelector('.zustaende'), b = nav.getBoundingClientRect().width;
  if (!b) return;
  nav.querySelectorAll('button').forEach((el, k) => {
    zustandRasten[k] = (el.offsetLeft + el.offsetWidth / 2) / b;
    nav.style.setProperty('--z' + k, (zustandRasten[k] * 100).toFixed(2) + '%');
  });
  $('r-zustand').value = String(Math.round(zustandRasten[ZUSTAND_STELLE.indexOf(zustand)] * 1000));
}
const naechsteRaste = (v) => { let k = 0; for (let i = 1; i < 4; i++) if (Math.abs(zustandRasten[i] - v) < Math.abs(zustandRasten[k] - v)) k = i; return k; };
$('r-zustand').addEventListener('input', (e) => { const nr = ZUSTAND_STELLE[naechsteRaste(+e.target.value / 1000)]; if (nr !== zustand) zustandWaehlen(nr); });
$('r-zustand').addEventListener('change', (e) => {
  e.target.value = String(Math.round(zustandRasten[ZUSTAND_STELLE.indexOf(zustand)] * 1000));   // rastet ein
  if (einstiegStufe === 1) { clearTimeout(einstiegUhr); einstiegUhr = setTimeout(einstiegWeiter, 1800); }
});
addEventListener('resize', zustandRastenMessen);
document.fonts?.ready.then(zustandRastenMessen);
// jeder Besuch beginnt mit dem Brillanten ohne Verschmelzung (Christian, 19.11.2026)
formWaehlen('brillant');

let gegenwart = { x: 0.5, y: 0.5 }, ziel = { x: 0.5, y: 0.5 };
// Gesten: ein Finger dreht frei in jede Richtung (Trackball), zwei Finger zoomen und drehen um die Blickachse
const finger = new Map();
let gedrueckt = false, zoom = 1, zoomZiel = 1, zweiAlt = null, zuletztBewegt = 0;
const zweiMessen = () => { const [a, b] = [...finger.values()]; return { d: Math.hypot(b.x - a.x, b.y - a.y), w: Math.atan2(b.y - a.y, b.x - a.x) }; };
leinwand.addEventListener('pointerdown', (e) => {
  finger.set(e.pointerId, { x: e.clientX, y: e.clientY });
  leinwand.setPointerCapture(e.pointerId); $('geste').classList.add('weg');
  gedrueckt = true; schwung.fill(0);
  if (finger.size === 2) zweiAlt = zweiMessen();
});
leinwand.addEventListener('pointermove', (e) => {
  const f = finger.get(e.pointerId); if (!f) return;
  const dx = e.clientX - f.x, dy = e.clientY - f.y; f.x = e.clientX; f.y = e.clientY;
  const jetzt = performance.now(), dt = Math.max(8, Math.min(50, jetzt - zuletztBewegt)); zuletztBewegt = jetzt;
  if (finger.size === 1) {
    const k = 3.4 / Math.min(innerWidth, innerHeight);
    // Bildschirm: x nach rechts, y nach unten; Welt: y nach oben, z zum Auge
    const ax = dy * k, ay = dx * k;
    drehen(ax, ay, 0);
    const g = 16.7 / dt; schwung[0] = ax * g; schwung[1] = ay * g; schwung[2] = 0;
  } else if (finger.size === 2 && zweiAlt) {
    const n = zweiMessen();
    zoomZiel = Math.max(0.55, Math.min(2.4, zoomZiel * n.d / Math.max(1, zweiAlt.d)));
    let dw = n.w - zweiAlt.w; if (dw > Math.PI) dw -= 2 * Math.PI; if (dw < -Math.PI) dw += 2 * Math.PI;
    drehen(0, 0, -dw);
    zweiAlt = n;
  }
});
const loslassen = (e) => {
  finger.delete(e.pointerId);
  if (finger.size < 2) zweiAlt = null;
  if (finger.size === 0) { gedrueckt = false; if (performance.now() - zuletztBewegt > 80) schwung.fill(0); }
};
leinwand.addEventListener('pointerup', loslassen);
leinwand.addEventListener('pointercancel', loslassen);
leinwand.addEventListener('wheel', (e) => { e.preventDefault(); zoomZiel = Math.max(0.55, Math.min(2.4, zoomZiel * Math.exp(-e.deltaY * 0.0012))); }, { passive: false });

const ebenen = new Float32Array(MAX_F * 3), ebenenW = new Float32Array(MAX_F * 3), abstand = new Float32Array(MAX_F), schicht = new Float32Array(MAX_F), alter = new Float32Array(MAX_F);
let gebaut = '', gebautSeite = 0, anzahl = 0, huelle = 1;
// der Stein passt ins Bild, hochkant wie quer
const massstab = () => Math.min(1, (innerWidth / innerHeight) * 1.35) * 0.78;
// ein unregelmässiger Edelstein: Ebenen auf einer Fibonacci-Kugel, gestreckt und leicht verworfen
function kristallBauen() {
  const ms = massstab();
  if (form !== 'stein') {
    const e = schliffEbenen(form, ms);
    anzahl = e.length;
    e.forEach(([x, y, z, d], i) => { ebenen.set([x, y, z], i * 3); abstand[i] = d; });
  } else {
    // ein unregelmässiger Edelstein: Ebenen auf einer Fibonacci-Kugel, gestreckt und leicht verworfen
    const n = facetten, gold = Math.PI * (3 - Math.sqrt(5));
    for (let i = 0; i < n; i++) {
      const y = 1 - (i + 0.5) / n * 2, r = Math.sqrt(1 - y * y), w = i * gold;
      let x = Math.cos(w) * r, z = Math.sin(w) * r, yy = y * 0.78;
      x += (Math.sin(i * 12.9) * 0.5) * 0.12; z += (Math.cos(i * 7.3) * 0.5) * 0.12;
      const l = Math.hypot(x, yy, z);
      ebenen[i * 3] = x / l; ebenen[i * 3 + 1] = yy / l; ebenen[i * 3 + 2] = z / l;
      abstand[i] = (0.82 + 0.1 * Math.abs(Math.sin(i * 3.7))) * ms;
    }
    anzahl = n;
  }
  for (let i = 0; i < anzahl; i++) alter[i] = ((i * 0.618034) % 1) * 0.92 + 0.08;   // jede Facette eine andere Zeit
  gebaut = form + facetten;
  // Hüllradius: in vielen Richtungen den Abstand bis zur Oberfläche messen, das Grösste zählt
  huelle = 0;
  for (let j = 0; j < 400; j++) {
    const y = 1 - (j + 0.5) / 200, r = Math.sqrt(Math.max(0, 1 - y * y)), w = j * 2.39996;
    const u = [Math.cos(w) * r, y, Math.sin(w) * r];
    let weit = 1e9;
    for (let i = 0; i < anzahl; i++) {
      const dn = u[0] * ebenen[i * 3] + u[1] * ebenen[i * 3 + 1] + u[2] * ebenen[i * 3 + 2];
      if (dn > 1e-6) weit = Math.min(weit, abstand[i] / dn);
    }
    huelle = Math.max(huelle, weit);
  }
}
// Normalen einmal je Bild drehen statt in jedem Bildpunkt
function ebenenDrehen() {
  for (let i = 0; i < anzahl; i++) {
    const x = ebenen[i * 3], y = ebenen[i * 3 + 1], z = ebenen[i * 3 + 2];
    for (let r = 0; r < 3; r++) ebenenW[i * 3 + r] = lage[r] * x + lage[3 + r] * y + lage[6 + r] * z;
  }
}
// Drehung als Matrix (column-major), gedreht wird immer um Achsen des Bildschirms:
// so geht es nach oben, unten und über Kopf gleich gut, ohne Anschlag und ohne Kippen
const lage = new Float32Array(9);
const schwung = new Float32Array(3);              // Winkelgeschwindigkeit je Bild (Bildschirmachsen)
const LEERLAUF = [0.0004, 0.0016, 0];             // ruhiges Eigendrehen
function achsDrehung(x, y, z) {
  const w = Math.hypot(x, y, z); if (w < 1e-9) return null;
  const ux = x / w, uy = y / w, uz = z / w, c = Math.cos(w), s = Math.sin(w), t = 1 - c;
  return [t * ux * ux + c, t * ux * uy + s * uz, t * ux * uz - s * uy,
          t * ux * uy - s * uz, t * uy * uy + c, t * uy * uz + s * ux,
          t * ux * uz + s * uy, t * uy * uz - s * ux, t * uz * uz + c];
}
function drehen(x, y, z) {
  const q = achsDrehung(x, y, z); if (!q) return;
  const r = lage.slice();
  for (let j = 0; j < 3; j++) for (let i = 0; i < 3; i++)
    lage[j * 3 + i] = q[i] * r[j * 3] + q[3 + i] * r[j * 3 + 1] + q[6 + i] * r[j * 3 + 2];
  ordnen();
}
// Rundungsfehler wegnehmen (Gram-Schmidt), sonst verzieht sich der Stein nach vielen Umdrehungen
function ordnen() {
  const a = [lage[0], lage[1], lage[2]], b = [lage[3], lage[4], lage[5]];
  let l = Math.hypot(...a); a.forEach((v, i) => (a[i] = v / l));
  const d = a[0] * b[0] + a[1] * b[1] + a[2] * b[2]; b.forEach((v, i) => (b[i] = v - d * a[i]));
  l = Math.hypot(...b); b.forEach((v, i) => (b[i] = v / l));
  const c = [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
  lage.set([...a, ...b, ...c]);
}
// Anfangslage wie bisher: leicht von oben, etwas gedreht
lage.set([1, 0, 0, 0, 1, 0, 0, 0, 1]); drehen(0, 0.4, 0); drehen(-0.5, 0, 0);
function schwingen(f) {
  if (gedrueckt) return;
  // Schwung klingt weich zum Eigendrehen aus; die Lage bleibt, wo man sie hingedreht hat
  const a = 1 - Math.pow(0.975, f);
  for (let i = 0; i < 3; i++) schwung[i] += (LEERLAUF[i] - schwung[i]) * a;
  drehen(schwung[0] * f, schwung[1] * f, schwung[2] * f);
}
// ---------- Die vier Zustände des Kristalls (Cinéma 2, Kapitel 4) ----------
const ZUSTAENDE = ['vollkommen', 'gesprungen', 'entstehen', 'zerfall'];
const alterAkt = new Float32Array(MAX_F), faktor = new Float32Array(MAX_F).fill(1);
const RISS = (() => {   // Rissebene im Stein, mit zwei Richtungen in ihr für den gezackten Verlauf
  const n = [0.75, 1, 0.3], l = Math.hypot(...n); n.forEach((v, i) => (n[i] = v / l));
  const a = [0, n[2], -n[1]], la = Math.hypot(...a); a.forEach((v, i) => (a[i] = v / la));
  const b = [n[1] * a[2] - n[2] * a[1], n[2] * a[0] - n[0] * a[2], n[0] * a[1] - n[1] * a[0]];
  return [...n, ...a, ...b];
})();
const rissW = new Float32Array(9);
// gesprungen: beim Wechsel springt der Stein mit einem Ruck auf, dann atmet der Spalt langsam
let rissStart = -10;
const rissVer = new Float32Array(3);
function rissSetzen(t) {
  const rad = huelle * zoom, seit = performance.now() / 1000 - rissStart;
  const ruck = Math.min(1, seit * 7) * (1 + 0.9 * Math.exp(-seit * 2.6) * Math.sin(seit * 15));
  const atem = 1 + 0.3 * Math.sin(t * 0.55) + 0.12 * Math.sin(t * 1.7);
  for (let r = 0; r < 3; r++) rissVer[r] = rissW[r] + 0.9 * rissW[6 + r];   // auseinander und seitlich verschoben
  const l = Math.hypot(rissVer[0], rissVer[1], rissVer[2]); for (let r = 0; r < 3; r++) rissVer[r] /= l;
  gl.uniform1f(ort.uSpalt, zustand === 1 ? 0.12 * rad * ruck * atem : 0);
  gl.uniform1f(ort.uRissC, 0.04 * rad);
  gl.uniform3fv(ort.uRissVer, rissVer);
}
function zustandAnwenden(t) {
  for (let i = 0; i < anzahl; i++) {
    faktor[i] = 1; alterAkt[i] = alter[i];
    if (zustand === 0) {
      // vollkommen (Ophüls): ein geschlossener Kreis, die Zeiten wandern rings um den Stein wie eine Manege
      const az = Math.atan2(ebenen[i * 3 + 2], ebenen[i * 3]) / (2 * Math.PI) + 0.5;
      alterAkt[i] = ((az + ebenen[i * 3 + 1] * 0.15 + t * 0.045) % 1) * 0.92 + 0.08;
    } else if (zustand === 2) {
      // im Entstehen (Fellini): Facetten wachsen hervor und sinken zurück; was hervortritt, ist jetzt
      const w = 0.5 + 0.5 * Math.sin(t * 0.55 + i * 2.399);
      faktor[i] = 0.72 + 0.28 * w; alterAkt[i] = (1 - w) * 0.92 + 0.08;
    } else if (zustand === 3) {
      // im Zerfall (Visconti): alles ist schon tief vergangen, Facetten sinken langsam ein
      alterAkt[i] = 0.55 + 0.45 * alter[i];
      faktor[i] = 1 - 0.16 * Math.pow(0.5 + 0.5 * Math.sin(t * 0.13 + i * 1.7), 4);
    }
  }
  // Keim: der junge Kristall ist klein und trägt nur Gegenwart; Facette um Facette tritt er hervor
  const w = keimWachstum(performance.now() / 1000);
  if (w < 1) {
    const e = 1 - Math.pow(1 - w, 3);
    for (let i = 0; i < anzahl; i++) {
      const rang = ((i * 0.618034) % 1);
      faktor[i] *= (0.06 + 0.94 * e) * (0.7 + 0.3 * Math.min(1, Math.max(0, w * 1.8 - rang * 0.8)));
      alterAkt[i] *= e;
    }
  } else keimStart = -1;
  for (let k = 0; k < 3; k++) {
    const x = RISS[k * 3], y = RISS[k * 3 + 1], z = RISS[k * 3 + 2];
    for (let r = 0; r < 3; r++) rissW[k * 3 + r] = lage[r] * x + lage[3 + r] * y + lage[6 + r] * z;
  }
}
function zeitSetzen(kopf, intervall, t) {
  if (gebaut !== form + facetten || gebautSeite !== innerWidth / innerHeight) { kristallBauen(); gebautSeite = innerWidth / innerHeight; }
  zustandAnwenden(t);
  for (let i = 0; i < anzahl; i++) {
    const zurueck = Math.min(SCHICHTEN - 1, Math.round(alterAkt[i] * tiefe / intervall));
    schicht[i] = (kopf - zurueck + SCHICHTEN) % SCHICHTEN;
  }
}

// ---------- Schleife ----------
let laeuft = false, kopf = 0, letzterFang = 0, gefuellt = false, standbildWunsch = false;
// ---------- Geführter Einstieg: zuerst Stein und Bild, dann Schliffe, dann Zustände und Regler, zuletzt die Tasten ----------
const EINSTIEG = 'kristall.einstieg';
let einstiegStufe = 3, einstiegUhr = 0, einstiegBegonnen = false;
function einstiegTeile() {
  const r = $('regler');
  return [[r.querySelector('.formen:not(.zustaende)')], [r.querySelector('.zustaende'), r.querySelector('.zt-regler')], [r.querySelector('.zt-tasten')]];
}
function einstiegZeigen(stufe) {
  einstiegStufe = stufe;
  $('regler').dataset.einstieg = String(stufe);
  einstiegTeile().forEach((teile, k) => teile.forEach((el) => { if (el) el.inert = k >= stufe; }));
  if (stufe >= 3) { clearTimeout(einstiegUhr); try { localStorage.setItem(EINSTIEG, 'fertig'); } catch {} }
}
// nächste Stufe: nach einer Handlung oder spätestens nach einer Weile
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
  formWaehlen('brillant'); einstiegZeigen(0);
  einstiegUhr = setTimeout(einstiegWeiter, 7000);
}
leinwand.addEventListener('pointerup', () => { if (einstiegStufe === 0) { clearTimeout(einstiegUhr); einstiegUhr = setTimeout(einstiegWeiter, 1400); } });
document.querySelectorAll('[data-form], [data-zustand]').forEach((b) => b.addEventListener('click', () => { if (einstiegStufe === 1) { clearTimeout(einstiegUhr); einstiegUhr = setTimeout(einstiegWeiter, 1800); } }));
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

function starten() {
  einstiegBeginnen(); $('ton').hidden = false; tonZeigen(); requestAnimationFrame(zustandRastenMessen);
  $('auftakt').hidden = true; $('kopf').hidden = false; $('regler').hidden = false; $('geste').hidden = false; requestAnimationFrame(() => mitteSetzen(true));
  setTimeout(() => $('geste').classList.add('weg'), 5000);
  groesse();
  if (!laeuft && gl) { laeuft = true; requestAnimationFrame(bild); }
}

function malenIn(ctx, B, H) {
  const q = quelle; if (!q) return false;
  const qb = q.videoWidth || q.width, qh = q.videoHeight || q.height;
  if (!qb || !qh) return false;
  ctx.save();
  if (spiegelnQuelle) { ctx.translate(B, 0); ctx.scale(-1, 1); }
  // Weicht das Format der Quelle stark vom Bildschirm ab (Hochformat am Laptop, Querformat am Handy), wird nicht
  // beschnitten: das ganze Bild steht in der Mitte, daneben bleibt es dunkel wie der Saal (Christian, 19.11.2026).
  const deck = Math.max(B / qb, H / qh), ganz = Math.min(B / qb, H / qh);
  if (deck / ganz > 1.7) {
    ctx.fillStyle = '#0a0a0b'; ctx.fillRect(0, 0, B, H);
    const b = qb * ganz, hh = qh * ganz;
    ctx.drawImage(q, (B - b) / 2, (H - hh) / 2, b, hh);
  } else {
    const b = qb * deck, hh = qh * deck;
    ctx.drawImage(q, (B - b) / 2, (H - hh) / 2, b, hh);
  }
  ctx.restore();
  return true;
}
const fangen = () => malenIn(fctx, pufferB, pufferH);
// die Gegenwart jedes Bild neu und scharf auf die Grafikkarte
function scharfFangen() {
  if (!scharfTex || !malenIn(sctx, scharfB, scharfH)) return;
  gl.activeTexture(gl.TEXTURE3); gl.bindTexture(gl.TEXTURE_2D, scharfTex);
  gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, gl.RGBA, gl.UNSIGNED_BYTE, scharf);
  gl.activeTexture(gl.TEXTURE0);
}

let ersterLauf = true, letzteMs = 0;
const abstandZ = new Float32Array(MAX_F);
function bild(ms) {
  const t = ms / 1000;
  if (quelle === beispiel) beispielMalen(t);
  else if (quelle === fotoBuehne) fotoMalen(performance.now() / 1000);
  const intervall = Math.max(1 / 60, tiefe / (SCHICHTEN - 1));
  gl.bindTexture(gl.TEXTURE_2D_ARRAY, zeitTex);
  if (t - letzterFang >= intervall || !gefuellt) {
    if (fangen()) {
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
  gegenwart.x += (ziel.x - gegenwart.x) * 0.12; gegenwart.y += (ziel.y - gegenwart.y) * 0.12;
  zeitSetzen(kopf, intervall, t);
  const dtMs = ms - (letzteMs || ms - 16.7), f = Math.min(4, Math.max(0.25, dtMs / 16.7)); letzteMs = ms;
  tempoMessen(ms, dtMs);
  schwingen(f);
  zoom += (zoomZiel - zoom) * (1 - Math.pow(0.82, f));
  for (let i = 0; i < anzahl; i++) abstandZ[i] = abstand[i] * zoom * faktor[i];
  ebenenDrehen();
  klangBild(ebenenW, anzahl, { tiefe, brech, feuer: SCHLIFFE[form].feuer, zustand, ver: milieu() });
  // erst in die Szene zeichnen, dann Leuchten und glatte Kanten
  const sz = zielBauen('szene', leinwand.width, leinwand.height);
  gl.bindFramebuffer(gl.FRAMEBUFFER, sz.fb);
  gl.viewport(0, 0, leinwand.width, leinwand.height);
  gl.useProgram(prog);
  gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D_ARRAY, zeitTex);
  gl.uniform1i(ort.uZeit, 0);
  gl.activeTexture(gl.TEXTURE3); gl.bindTexture(gl.TEXTURE_2D, scharfTex); gl.uniform1i(ort.uScharf, 3); gl.activeTexture(gl.TEXTURE0);
  gl.uniform3fv(ort.uN, ebenenW); gl.uniform1fv(ort.uR, abstandZ); gl.uniform1fv(ort.uSchicht, schicht); gl.uniform1fv(ort.uAlter, alterAkt);
  gl.uniform1i(ort.uK, anzahl); gl.uniform1f(ort.uKante, SCHLIFFE[form].kante); gl.uniform3fv(ort.uTon, SCHLIFFE[form].ton); gl.uniform1f(ort.uFeuer, SCHLIFFE[form].feuer); gl.uniform1f(ort.uVer, milieu());
  gl.uniform1i(ort.uZustand, zustand); gl.uniform1f(ort.uUnschaerfe, 0.0025); gl.uniform1f(ort.uRad, huelle * zoom * 1.03); gl.uniform3fv(ort.uRiss, rissW.subarray(0, 3)); gl.uniform3fv(ort.uRissA, rissW.subarray(3, 6)); gl.uniform3fv(ort.uRissB, rissW.subarray(6, 9)); rissSetzen(t); gl.uniform1f(ort.uSeite, innerWidth / innerHeight);
  gl.uniform2f(ort.uLage, (gegenwart.x - 0.5) * 1.2, (gegenwart.y - 0.5) * 0.9); gl.uniform1f(ort.uJetzt, kopf);
  gl.uniform1f(ort.uBrech, brech); gl.uniform1f(ort.uT, t % 100);
  gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  nachbearbeiten(t);
  if (standbildWunsch) { standbildWunsch = false; leinwand.toBlob((b) => b && zeigen(b, 'kristallbild-' + zeitstempel() + '.png')); }
  if (ersterLauf && gefuellt) { ersterLauf = false; spur('✓ läuft'); }
  requestAnimationFrame(bild);
}

// ---------- Ergebnis ----------
// Nach Standbild oder Aufnahme: eine Vorschau mit «Teilen» (Android: direkt in Galerie, Messenger, Instagram)
// und «Sichern» (Download in den Ordner «Downloads»)
let ergebnis = null;   // { blob, name, url }
function sichern(blob, name) {
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name;
  document.body.append(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 4000);
}
function zeigen(blob, name) {
  schliessen();
  const url = URL.createObjectURL(blob), film = blob.type.startsWith('video');
  ergebnis = { blob, name, url };
  const bild = $('ergebnis-bild');
  bild.replaceChildren();
  const el = document.createElement(film ? 'video' : 'img');
  el.src = url;
  if (film) { el.muted = true; el.loop = true; el.playsInline = true; el.autoplay = true; el.controls = false; }
  // mit Ton: Tippen auf die Vorschau schaltet ihn ein und aus
  if (film) el.addEventListener('click', () => { el.muted = !el.muted; if (el.paused) el.play(); });
  else el.alt = '';
  bild.append(el);
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
    zeigen(b, 'kristallbild-' + zeitstempel() + (b.type.includes('mp4') ? '.mp4' : '.webm'));
  };
  aufnehmer.start(1000); aufnahmeStart = performance.now();
  knopf.classList.add('laeuft');
  const zeigeUhr = () => { knopf.textContent = '● ' + dauer((performance.now() - aufnahmeStart) / 1000) + ' · ' + TEXTE[sprache].stopp; };
  zeigeUhr(); uhr = setInterval(zeigeUhr, 250);
  spur('Aufnahme');
});
// eindeutige Namen, damit Downloads sich nicht überschreiben
function zeitstempel() {
  const d = new Date(), z = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}${z(d.getMonth() + 1)}${z(d.getDate())}-${z(d.getHours())}${z(d.getMinutes())}${z(d.getSeconds())}`;
}

// ---------- Glossen: der Begriff am Rand, während man einstellt ----------
// Jede Glosse kommt nur einmal je Besuch von selbst; danach bleibt das Bild frei, der Begriff liegt unter «Begriff».
// Am Handy zeigt sie nur Begriff und Satz, Antippen öffnet die ganze Lektüre (Christian, 19.11.2026).
let glosseUhr = 0, glosseSchluessel = '';
const glosseGezeigt = new Set(), glosseDauer = () => (innerWidth <= 560 ? 4500 : 7000);
function glosse(k) {
  const g = TEXTE[sprache].glossen[k]; if (!g) return;
  if (glosseGezeigt.has(k)) return;
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
for (const [id, k] of [['r-facetten', 'facetten'], ['r-tiefe', 'tiefe'], ['r-brechung', 'brechung'], ['r-verschmelzung', 'verschmelzung']]) {
  $(id).addEventListener('pointerdown', () => glosse(k));
  $(id).addEventListener('input', () => { if (glosseSchluessel !== k || $('glosse').hidden) glosse(k); else { clearTimeout(glosseUhr); glosseUhr = setTimeout(glosseWeg, glosseDauer()); } });
}
document.querySelectorAll('[data-form]').forEach((b) => b.addEventListener('click', () => glosse('formen')));
$('glosse').addEventListener('click', () => { glosseWeg(); $('begriff').hidden = false; });

// ---------- Eine Facette antippen: welche Zeit trägt sie? ----------
function facetteUnter(x, y) {
  const sx = (x / innerWidth) * 2 - 1, sy = 1 - (y / innerHeight) * 2, seite = innerWidth / innerHeight;
  let d = [sx * seite * 0.5, sy * 0.5, -1]; const l = Math.hypot(...d); d = d.map((v) => v / l);
  const o = [-(gegenwart.x - 0.5) * 1.2, -(gegenwart.y - 0.5) * 0.9, 3.2];
  let t0 = -1e9, t1 = 1e9, i0 = -1;
  for (let k = 0; k < anzahl; k++) {
    const n = [ebenenW[k * 3], ebenenW[k * 3 + 1], ebenenW[k * 3 + 2]];
    const dn = n[0] * d[0] + n[1] * d[1] + n[2] * d[2], ab = abstandZ[k] - (n[0] * o[0] + n[1] * o[1] + n[2] * o[2]);
    if (Math.abs(dn) < 1e-6) { if (ab < 0) return -1; continue; }
    const t = ab / dn;
    if (dn < 0) { if (t > t0) { t0 = t; i0 = k; } } else t1 = Math.min(t1, t);
  }
  return t0 < t1 && t0 > 0 ? i0 : -1;
}
let tippStart = null, zeitUhr = 0, letzterTipp = null;
// ---------- Keim und Milieu: ein Doppeltipp setzt einen Keim, aus dem der Kristall wächst ----------
let keimStart = -1;
let keimGesetzt = false;
// Bildpunkt auf die Ebene des Kristalls (z = 0) zurückrechnen, als Lage 0…1
function aufEbene(x, y) {
  const seite = innerWidth / innerHeight, sx = (x / innerWidth) * 2 - 1, sy = 1 - (y / innerHeight) * 2;
  const lx = Math.max(-seite * 1.3, Math.min(seite * 1.3, sx * seite * 0.5 * 3.2)), ly = Math.max(-1.25, Math.min(1.25, sy * 1.6));
  return { x: lx / 1.2 + 0.5, y: ly / 0.9 + 0.5 };
}
// der Stein sitzt in der freien Bildfläche zwischen Kopf und Bedienung, etwas unter ihrer Mitte (Christian, 19.11.2026)
function mitteSetzen(anfang) {
  const kopf = $('kopf').getBoundingClientRect(), r = $('regler').getBoundingClientRect();
  const oben = kopf.height ? kopf.bottom : 0, unten = r.height && r.top > innerHeight * 0.4 ? r.top : innerHeight;
  if (!keimGesetzt) { const m = aufEbene(innerWidth / 2, oben + (unten - oben) * 0.6); ziel.x = m.x; ziel.y = m.y; if (anfang) { gegenwart.x = m.x; gegenwart.y = m.y; } }
  // ist die freie Fläche niedrig (Telefon hochkant), beginnt der Stein etwas kleiner; Zoomen bleibt frei
  if (anfang) { const frei = (unten - oben) / innerHeight; zoomZiel = zoom = Math.max(0.65, Math.min(1, frei / 0.72)); }
}
addEventListener('resize', () => requestAnimationFrame(() => mitteSetzen(false)));
function keimSetzen(x, y) {
  const m = aufEbene(x, y); keimGesetzt = true;
  ziel.x = m.x; ziel.y = m.y;
  gegenwart.x = ziel.x; gegenwart.y = ziel.y;     // der Keim sitzt sofort, gewachsen wird an Ort
  keimStart = performance.now() / 1000;
  glosse('keim'); spur('Keim');
}
const KEIM_DAUER = 3.2;
// das Milieu kristallisiert mit: die Verschmelzung schwillt beim Wachsen an und legt sich wieder
function milieu() { const w = keimWachstum(performance.now() / 1000); return w >= 1 ? verschmelzung : verschmelzung + (0.85 - verschmelzung) * Math.sin(Math.PI * w) * Math.max(0, Math.sign(0.85 - verschmelzung)); }
function keimWachstum(t) { return keimStart < 0 ? 1 : Math.min(1, (t - keimStart) / KEIM_DAUER); }
// am Rechner auch per Doppelklick
leinwand.addEventListener('dblclick', (e) => { if (keimWachstum(performance.now() / 1000) >= 1 || keimStart < 0) { letzterTipp = null; $('facettenzeit').classList.add('weg'); keimSetzen(e.clientX, e.clientY); } });
leinwand.addEventListener('pointerdown', (e) => { tippStart = finger.size <= 1 ? { x: e.clientX, y: e.clientY, t: performance.now() } : null; });
leinwand.addEventListener('pointerup', (e) => {
  const s0 = tippStart; tippStart = null;
  if (!s0 || performance.now() - s0.t > 350 || Math.hypot(e.clientX - s0.x, e.clientY - s0.y) > 8) return;
  // zweiter Tipp kurz nach dem ersten und nahe dabei: ein Keim
  if (letzterTipp && performance.now() - letzterTipp.t < 450 && Math.hypot(e.clientX - letzterTipp.x, e.clientY - letzterTipp.y) < 40) {
    letzterTipp = null; $('facettenzeit').classList.add('weg'); keimSetzen(e.clientX, e.clientY); return;
  }
  letzterTipp = { x: e.clientX, y: e.clientY, t: performance.now() };
  const T = TEXTE[sprache], i = facetteUnter(e.clientX, e.clientY), el = $('facettenzeit');
  if (i < 0) el.textContent = T.bildJetzt;
  else {
    const sek = alterAkt[i] * tiefe;
    el.textContent = sek < 0.15 ? T.facetteJetzt : T.facetteVor.replace('{s}', sek.toFixed(1).replace('.', T.komma2));
  }
  el.style.left = Math.min(innerWidth - 150, Math.max(12, e.clientX - 60)) + 'px';
  el.style.top = Math.max(70, e.clientY - 48) + 'px';
  el.hidden = false; el.classList.remove('weg');
  clearTimeout(zeitUhr); zeitUhr = setTimeout(() => el.classList.add('weg'), 1800);
});

// ---------- Begriffsebene ----------
$('begriff-auf').addEventListener('click', () => { $('begriff').hidden = false; });
$('begriff-zu').addEventListener('click', () => { $('begriff').hidden = true; });
addEventListener('keydown', (e) => { if (e.key === 'Escape') { $('begriff').hidden = true; schliessen(); } });

// jeder Besuch beginnt beim vollkommenen Kristall (Christian, 19.11.2026)
zustandWaehlen(0, true);
uebersetzen();
// Direktstart für Tests und Vorführungen: ?beispiel
if (new URLSearchParams(location.search).has('beispiel')) beispielStarten();
