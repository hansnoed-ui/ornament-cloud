// Kristallbild – Prototyp für the deleuzian scheme (Phase 0)
// Live-Bild und verzögerte Schichten als Facetten eines Kristalls.
// WebGL2, ohne Bibliotheken, ohne CDN. Alles bleibt im Browser.

import { SCHLIFFE, schliffEbenen } from './schliffe.js?v=7';

const $ = (id) => document.getElementById(id);

// ---------- Sprache ----------
const TEXTE = {
  de: {
    titel: 'Kristallbild', satz: 'Die Gegenwart spaltet sich in jedem Augenblick.',
    kamera: 'Kamera', video: 'Video oder Fotos', beispiel: 'Beispiel', hinweis: 'Alles bleibt auf deinem Gerät.',
    facetten: 'Facetten', tiefe: 'Zeittiefe', brechung: 'Brechung', verschmelzung: 'Verschmelzung',
    zustaende: [
      { kurz: 'vollkommen', titel: 'Der vollkommene Kristall', wer: 'Ophüls', text: 'Bei Max Ophüls ist der Kristall vollkommen: ein geschlossener Kreis, aus dem nichts entkommt. Die Zeiten kreisen um den Stein wie die Manege in «Lola Montès», jede Facette reicht ihre Zeit an die nächste weiter.' },
      { kurz: 'gesprungen', titel: 'Der gesprungene Kristall', wer: 'Renoir', text: 'Bei Jean Renoir hat der Kristall einen Riss. Durch ihn entweicht etwas: das Leben, eine Gegenwart, die noch nicht erstarrt ist und in die Zukunft geht. Das Theater in «Die goldene Karosse», das Spiel in «Die Spielregel». Jenseits des Risses zeigt der Stein nur noch das Jetzt.' },
      { kurz: 'im Entstehen', titel: 'Der Kristall im Entstehen', wer: 'Fellini', text: 'Bei Federico Fellini ist der Kristall nie fertig, er wächst unablässig. Facetten treten hervor und sinken zurück: Was hervortritt, ist jetzt, was zurücksinkt, wird Vergangenheit.' },
      { kurz: 'im Zerfall', titel: 'Der Kristall im Zerfall', wer: 'Visconti', text: 'Bei Luchino Visconti zerfällt der Kristall von innen. Eine Welt geht unter, und die Einsicht kommt zu spät. Alles im Stein ist schon tief vergangen, es vergilbt, trübt sich, und die Facetten verlieren ihren Halt. «Der Leopard», «Ludwig».' }
    ],
    zustand: 'Zustand',
    stein: 'Stein', brillant: 'Brillant', oval: 'Oval', smaragd: 'Smaragd', bergkristall: 'Bergkristall', formen: 'Schliff',
    begriff: 'Begriff', standbild: 'Standbild', aufnahme: 'Aufnahme', stopp: 'Stopp',
    teilen: 'Teilen', sichern: 'Sichern', komma: '.', 'ergebnis-hinweis': 'Gesichert im Ordner «Downloads». «Teilen» legt es direkt in die Galerie oder eine App.',
    keineAufnahme: 'Dieser Browser kann die Leinwand nicht aufnehmen. Das Standbild geht.',
    geste: 'Ziehen dreht den Kristall, zwei Finger zoomen.',
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
    zustaende: [
      { kurz: 'perfect', titel: 'The perfect crystal', wer: 'Ophüls', text: 'In Max Ophüls the crystal is perfect: a closed circuit from which nothing escapes. The times circle the stone like the circus ring in “Lola Montès”, each facet passing its time on to the next.' },
      { kurz: 'cracked', titel: 'The cracked crystal', wer: 'Renoir', text: 'In Jean Renoir the crystal has a crack. Through it something escapes: life, a present not yet frozen, moving towards the future. The theatre of “The Golden Coach”, the game of “The Rules of the Game”. Beyond the crack the stone shows only the now.' },
      { kurz: 'forming', titel: 'The crystal in formation', wer: 'Fellini', text: 'In Federico Fellini the crystal is never finished, it keeps growing. Facets push forward and sink back: what emerges is now, what recedes becomes past.' },
      { kurz: 'decomposing', titel: 'The crystal in decomposition', wer: 'Visconti', text: 'In Luchino Visconti the crystal decays from within. A world goes under, and understanding comes too late. Everything in the stone is already deeply past; it yellows, clouds over, and the facets lose their hold. “The Leopard”, “Ludwig”.' }
    ],
    zustand: 'State',
    stein: 'Stone', brillant: 'Brilliant', oval: 'Oval', smaragd: 'Emerald', bergkristall: 'Quartz', formen: 'Cut',
    begriff: 'Concept', standbild: 'Still', aufnahme: 'Record', stopp: 'Stop',
    teilen: 'Share', sichern: 'Save', komma: '.', 'ergebnis-hinweis': 'Saved to your “Downloads” folder. “Share” sends it straight to your gallery or an app.',
    keineAufnahme: 'This browser cannot record the canvas. Stills work.',
    geste: 'Drag to turn the crystal, pinch to zoom.',
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
    zustaende: [
      { kurz: 'parfait', titel: 'Le cristal parfait', wer: 'Ophuls', text: 'Chez Max Ophuls, le cristal est parfait : un circuit fermé dont rien ne s’échappe. Les temps tournent autour de la pierre comme la piste de « Lola Montès », chaque facette passe son temps à la suivante.' },
      { kurz: 'fêlé', titel: 'Le cristal fêlé', wer: 'Renoir', text: 'Chez Jean Renoir, le cristal a une fêlure. Par elle quelque chose s’échappe : la vie, un présent qui ne s’est pas encore figé et file vers l’avenir. Le théâtre du « Carrosse d’or », le jeu de « La Règle du jeu ». Au-delà de la fêlure, la pierre ne montre plus que le maintenant.' },
      { kurz: 'en formation', titel: 'Le cristal en formation', wer: 'Fellini', text: 'Chez Federico Fellini, le cristal n’est jamais achevé, il ne cesse de croître. Des facettes avancent et se retirent : ce qui surgit est présent, ce qui recule devient passé.' },
      { kurz: 'en décomposition', titel: 'Le cristal en décomposition', wer: 'Visconti', text: 'Chez Luchino Visconti, le cristal se décompose de l’intérieur. Un monde s’effondre, et la révélation arrive trop tard. Tout dans la pierre est déjà profondément passé : cela jaunit, se trouble, et les facettes perdent prise. « Le Guépard », « Ludwig ».' }
    ],
    zustand: 'État',
    stein: 'Pierre', brillant: 'Brillant', oval: 'Ovale', smaragd: 'Émeraude', bergkristall: 'Cristal de roche', formen: 'Taille',
    begriff: 'Concept', standbild: 'Image', aufnahme: 'Enregistrer', stopp: 'Arrêter',
    teilen: 'Partager', sichern: 'Télécharger', komma: ',', 'ergebnis-hinweis': 'Enregistré dans le dossier « Téléchargements ». « Partager » l’envoie directement dans la galerie ou une app.',
    keineAufnahme: 'Ce navigateur ne peut pas enregistrer le canevas. L’image fixe fonctionne.',
    geste: 'Glisser fait tourner le cristal, deux doigts pour zoomer.',
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
  if (aufnehmer) $('aufnahme').textContent = t.stopp;
  if (document.getElementById('b-zustand-titel')) zustandText();
  document.querySelectorAll('[data-zustand]').forEach((b) => { b.textContent = t.zustaende[+b.dataset.zustand].kurz; });
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
function melden(text) { const m = $('meldung'); m.textContent = text; m.hidden = false; }
try {
  const s = JSON.parse(localStorage.getItem(SPUR) || '[]');
  if (s.length && s.at(-1) !== '✓ läuft' && s.at(-1) !== 'Start') melden(TEXTE[sprache].letzterLauf + s.slice(-3).join(' → '));
  localStorage.setItem(SPUR, JSON.stringify(['Start']));
} catch {}

// ---------- Grafik ----------
const telefon = matchMedia('(pointer: coarse)').matches || Math.min(screen.width, screen.height) < 700;
const SCHICHTEN = telefon ? 40 : 64;       // Zeitpuffer
const LANGE_SEITE = telefon ? 480 : 720;   // Aufnahmegrösse im Puffer
const MAX_DPR = telefon ? 1.25 : 1.5;
const MAX_F = 60;              // Ebenen: der Brillant braucht 57

const leinwand = $('leinwand');
const gl = leinwand.getContext('webgl2', { antialias: false, alpha: false, premultipliedAlpha: false, powerPreference: 'high-performance' });
if (!gl) { melden(TEXTE[sprache].keinGL); spur('kein WebGL2'); }
leinwand.addEventListener('webglcontextlost', (e) => { e.preventDefault(); melden(TEXTE[sprache].kontextWeg); spur('Kontext verloren'); });

const VS = `#version 300 es
in vec2 a; out vec2 v;
void main(){ v = a*0.5+0.5; gl_Position = vec4(a,0.,1.); }`;

const FS = `#version 300 es
precision highp float; precision highp sampler2DArray;
#define MAX_K ${MAX_F}
#define WELLEN ${telefon ? 4 : 7}
#define WEGE ${telefon ? 3 : 5}
#define PWELLEN ${telefon ? 2 : 4}
in vec2 v; out vec4 o;
uniform sampler2DArray uZeit;
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
uniform int uZustand;          // 0 vollkommen, 1 gesprungen, 2 im Entstehen, 3 im Zerfall
uniform vec3 uRiss, uRissA, uRissB;   // Rissebene (gedreht mit dem Stein)
uniform float uVer;             // Verschmelzung: wie weit der Kristall ins Bild übergreift

float h(float n){ return fract(sin(n*91.345+7.13)*43758.5453); }
vec3 holen(vec2 u, float s){ vec2 m = 1.0 - abs(mod(u, 2.0) - 1.0); return texture(uZeit, vec3(m.x, 1.0 - m.y, s)).rgb; }

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
float austritt(vec3 p, vec3 d, out int i1){ return austrittS(p, d, 1.0, i1); }
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
  vec3 jetzt = holen(v, uJetzt);
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
      geist = mix(geist, holen(wand(g0 + vec3(uLage, 0.0), reflect(rd, gn)), uJetzt), clamp(fres, 0.0, 1.0));
      // feine Facettenkanten im Bild
      float zweite = -1e9;
      for (int k = 0; k < MAX_K; k++) { if (k >= uK) break; if (k != k0) zweite = max(zweite, dot(g0, ebene(k)) - uR[k] * G); }
      float linie = 1.0 - smoothstep(0.0, 0.008 * G, -zweite);
      col = mix(col, geist * mix(0.42, 0.9, vign), uVer * 0.85) + linie * 0.18 * uVer;
    }
  }

  float t0; int i0;
  if (treffen(rk, rd, t0, i0) && t0 > 0.0) {
    vec3 p0 = rk + rd * t0, n0 = ebene(i0);
    // Kantenlicht: wie nah liegt der Punkt an einer zweiten Ebene?
    float zweite = -1e9;
    for (int k = 0; k < MAX_K; k++) { if (k >= uK) break; if (k != i0) zweite = max(zweite, dot(p0, ebene(k)) - uR[k]); }
    float kante = 1.0 - smoothstep(0.0, mix(0.005, 0.012 + 0.01 * uBrech, step(0.5, uKante)), -zweite);

    // Spiegelung an der Oberfläche: das Aktuelle
    vec3 rf = reflect(rd, n0);
    vec3 spiegel = holen(wand(p0 + vec3(uLage, 0.0), rf), uJetzt);
    float fres = 0.04 + 0.96 * pow(1.0 - abs(dot(rd, n0)), 5.0);

    // Brechung ins Innere: das Virtuelle, je Facette eine andere Zeit, spektral zerlegt
    float A = 1.42 + 0.95 * uBrech, B = 0.004 + 0.03 * uBrech;
    float sch = uSchicht[i0];
    // gesprungener Kristall (Renoir): ein Riss, durch den die Gegenwart entweicht
    float riss = 0.0;
    if (uZustand == 1) {
      float sr = dot(p0, uRiss) + 0.03 * sin(dot(p0, uRissA) * 21.0) + 0.018 * sin(dot(p0, uRissB) * 37.0 + 1.3);
      riss = 1.0 - smoothstep(0.003, 0.014, abs(sr));
      if (sr > 0.0) sch = uJetzt;            // jenseits des Risses: nichts Vergangenes mehr, nur das Jetzt
    }
    vec3 innen = vec3(0.0), summe = vec3(0.0);
    for (int w = 0; w < WELLEN; w++) {
      float l = mix(410.0, 690.0, (float(w) + 0.5) / float(WELLEN));
      float ior = A + B / pow(l / 1000.0, 2.0);
      vec3 d = refract(rd, n0, 1.0 / ior), p = p0;
      float weg = 0.0;
      for (int b = 0; b < WEGE; b++) {       // innere Wege, mit Totalreflexion
        int i1; float t1 = austritt(p + d * 1e-4, d, i1);
        p = p + d * t1; weg += t1; vec3 n1 = ebene(i1);
        vec3 aus = refract(d, -n1, ior);
        if (dot(aus, aus) > 0.0) { d = aus; break; }
        d = reflect(d, -n1);                 // Totalreflexion: noch einmal durch den Stein
      }
      vec3 gew = spektrum(l);
      // Feuer: wo ein Strahl den Stein Richtung Licht verlässt, blitzt seine Farbe auf
      float feuer = pow(max(dot(d, L1), 0.0), 260.0) + pow(max(dot(d, L2), 0.0), 260.0) + pow(max(dot(d, L3), 0.0), 260.0);
      innen += (holen(wand(p + vec3(uLage, 0.0), d), sch) + feuer * uFeuer) * gew * exp(-uTon * weg * 2.0);
      summe += gew;
    }
    innen /= summe;
    float alter = uAlter[i0];
    float lum = dot(innen, vec3(0.299, 0.587, 0.114));
    innen = mix(innen, vec3(lum) * vec3(0.9, 0.96, 1.08), alter * 0.4) * (1.0 - alter * 0.22);
    innen *= vec3(1.02, 1.0, 0.98) * 1.08;
    // Kristall im Zerfall (Visconti): die Vergangenheit vergilbt und trübt sich
    if (uZustand == 3) {
      float l2 = dot(innen, vec3(0.299, 0.587, 0.114));
      innen = mix(innen, l2 * vec3(1.06, 0.86, 0.6), 0.78);
      innen = mix(innen, vec3(0.5, 0.45, 0.38), 0.22 + 0.16 * sin(uT * 0.6 + float(i0) * 1.7));
      innen *= 0.86;
    }

    float glanz = (pow(max(dot(rf, L1), 0.0), 220.0) + 0.7 * pow(max(dot(rf, L2), 0.0), 300.0) + 0.5 * pow(max(dot(rf, L3), 0.0), 300.0)) * 0.9;
    col = mix(innen, spiegel * 1.15, clamp(fres, 0.0, 1.0)) + glanz;
    col = mix(col, vec3(1.0, 0.98, 0.94), kante * uKante);
    if (uZustand == 1) col = mix(col, jetzt * 1.5 + vec3(0.28, 0.25, 0.2), riss);
  }
  col += (h(dot(v, vec2(12.9898, 78.233)) * 100.0 + uT) - 0.5) * 0.03;
  o = vec4(col, 1.0);
}`;

function programm(vs, fs) {
  const mk = (typ, src) => { const s = gl.createShader(typ); gl.shaderSource(s, src); gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s)); return s; };
  const p = gl.createProgram(); gl.attachShader(p, mk(gl.VERTEX_SHADER, vs)); gl.attachShader(p, mk(gl.FRAGMENT_SHADER, fs));
  gl.linkProgram(p); if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(p)); return p;
}

let prog, ort = {}, zeitTex = null, pufferB = 0, pufferH = 0;
if (gl) {
  prog = programm(VS, FS);
  gl.useProgram(prog);
  const buf = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
  const a = gl.getAttribLocation(prog, 'a'); gl.enableVertexAttribArray(a); gl.vertexAttribPointer(a, 2, gl.FLOAT, false, 0, 0);
  for (const n of ['uZeit', 'uN', 'uR', 'uSchicht', 'uAlter', 'uK', 'uKante', 'uTon', 'uFeuer', 'uVer', 'uZustand', 'uRiss', 'uRissA', 'uRissB', 'uLage', 'uSeite', 'uBrech', 'uT', 'uJetzt']) ort[n] = gl.getUniformLocation(prog, n);
  spur('Grafik bereit');
}

// Aufnahmeleinwand: schneidet die Quelle passend zu (cover) und spiegelt die Selfie-Kamera
const fang = document.createElement('canvas');
const fctx = fang.getContext('2d', { alpha: false, willReadFrequently: false });

function groesse() {
  const dpr = Math.min(devicePixelRatio || 1, MAX_DPR);
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
}
addEventListener('resize', groesse);

// ---------- Quellen ----------
let quelle = null, spiegelnQuelle = false;
const videoEl = document.createElement('video');
videoEl.muted = true; videoEl.playsInline = true; videoEl.loop = true;

async function kameraStarten() {
  spur('Kamera anfragen');
  try {
    const strom = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 720 } }, audio: false });
    videoEl.srcObject = strom; await videoEl.play();
    quelle = videoEl; spiegelnQuelle = true; starten();
  } catch (e) { spur('Kamera abgelehnt'); melden(TEXTE[sprache].keineKamera); }
}

function videoStarten(datei) {
  spur('Video gewählt');
  videoEl.srcObject = null; videoEl.src = URL.createObjectURL(datei);
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
function beispielStarten() { spur('Beispiel'); quelle = beispiel; spiegelnQuelle = false; starten(); }

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
async function fotosStarten(dateien) {
  spur('Fotos gewählt: ' + dateien.length);
  for (const f of fotos) f.close?.();
  fotos = [];
  for (const d of dateien.slice(0, 24)) {
    try {
      const roh = await createImageBitmap(d);
      // Telefonregel: höchstens 2400 Punkte; der Puffer braucht ohnehin weniger
      const s = Math.min(1, 1600 / Math.max(roh.width, roh.height));
      fotos.push(s < 1 ? await createImageBitmap(roh, { resizeWidth: Math.round(roh.width * s), resizeHeight: Math.round(roh.height * s), resizeQuality: 'high' }) : roh);
      if (s < 1) roh.close();
    } catch { spur('Foto unlesbar'); }
  }
  if (!fotos.length) return melden(TEXTE[sprache].keineKamera);
  fotoBuehne.width = 960; fotoBuehne.height = Math.round(960 * Math.max(innerHeight, 1) / Math.max(innerWidth, 1));
  quelle = fotoBuehne; spiegelnQuelle = false; fotoStart = performance.now() / 1000; starten();
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
let facetten = 18, tiefe = 3, brech = 0.35, form = 'brillant', verschmelzung = 0.4, zustand = 0;
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
  zustand = nr;
  document.querySelectorAll('[data-zustand]').forEach((b) => b.setAttribute('aria-pressed', String(+b.dataset.zustand === nr)));
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
try { const f = localStorage.getItem('kristall.form'); formWaehlen(SCHLIFFE[f] ? f : 'brillant'); } catch { formWaehlen('brillant'); }

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
leinwand.addEventListener('dblclick', () => { zoomZiel = 1; });

const ebenen = new Float32Array(MAX_F * 3), ebenenW = new Float32Array(MAX_F * 3), abstand = new Float32Array(MAX_F), schicht = new Float32Array(MAX_F), alter = new Float32Array(MAX_F);
let gebaut = '', gebautSeite = 0, anzahl = 0;
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
  const n = [0.35, 1, 0.25], l = Math.hypot(...n); n.forEach((v, i) => (n[i] = v / l));
  const a = [0, n[2], -n[1]], la = Math.hypot(...a); a.forEach((v, i) => (a[i] = v / la));
  const b = [n[1] * a[2] - n[2] * a[1], n[2] * a[0] - n[0] * a[2], n[0] * a[1] - n[1] * a[0]];
  return [...n, ...a, ...b];
})();
const rissW = new Float32Array(9);
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
function starten() {
  $('auftakt').hidden = true; $('kopf').hidden = false; $('regler').hidden = false; $('geste').hidden = false;
  setTimeout(() => $('geste').classList.add('weg'), 5000);
  groesse();
  if (!laeuft && gl) { laeuft = true; requestAnimationFrame(bild); }
}

function fangen() {
  const q = quelle; if (!q) return false;
  const qb = q.videoWidth || q.width, qh = q.videoHeight || q.height;
  if (!qb || !qh) return false;
  const s = Math.max(pufferB / qb, pufferH / qh), b = qb * s, hh = qh * s;
  fctx.save();
  if (spiegelnQuelle) { fctx.translate(pufferB, 0); fctx.scale(-1, 1); }
  fctx.drawImage(q, (pufferB - b) / 2, (pufferH - hh) / 2, b, hh);
  fctx.restore();
  return true;
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
  gegenwart.x += (ziel.x - gegenwart.x) * 0.12; gegenwart.y += (ziel.y - gegenwart.y) * 0.12;
  zeitSetzen(kopf, intervall, t);
  const f = Math.min(4, Math.max(0.25, (ms - (letzteMs || ms - 16.7)) / 16.7)); letzteMs = ms;
  schwingen(f);
  zoom += (zoomZiel - zoom) * (1 - Math.pow(0.82, f));
  for (let i = 0; i < anzahl; i++) abstandZ[i] = abstand[i] * zoom * faktor[i];
  ebenenDrehen();
  gl.viewport(0, 0, leinwand.width, leinwand.height);
  gl.useProgram(prog);
  gl.uniform1i(ort.uZeit, 0);
  gl.uniform3fv(ort.uN, ebenenW); gl.uniform1fv(ort.uR, abstandZ); gl.uniform1fv(ort.uSchicht, schicht); gl.uniform1fv(ort.uAlter, alterAkt);
  gl.uniform1i(ort.uK, anzahl); gl.uniform1f(ort.uKante, SCHLIFFE[form].kante); gl.uniform3fv(ort.uTon, SCHLIFFE[form].ton); gl.uniform1f(ort.uFeuer, SCHLIFFE[form].feuer); gl.uniform1f(ort.uVer, verschmelzung);
  gl.uniform1i(ort.uZustand, zustand); gl.uniform3fv(ort.uRiss, rissW.subarray(0, 3)); gl.uniform3fv(ort.uRissA, rissW.subarray(3, 6)); gl.uniform3fv(ort.uRissB, rissW.subarray(6, 9)); gl.uniform1f(ort.uSeite, innerWidth / innerHeight);
  gl.uniform2f(ort.uLage, (gegenwart.x - 0.5) * 1.2, (gegenwart.y - 0.5) * 0.9); gl.uniform1f(ort.uJetzt, kopf);
  gl.uniform1f(ort.uBrech, brech); gl.uniform1f(ort.uT, t % 100);
  gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
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
  aufnehmer = new MediaRecorder(leinwand.captureStream(30), typ ? { mimeType: typ, videoBitsPerSecond: 8e6 } : undefined);
  aufnehmer.ondataavailable = (e) => e.data.size && teile.push(e.data);
  aufnehmer.onstop = () => {
    clearInterval(uhr);
    const b = new Blob(teile, { type: (aufnehmer.mimeType || 'video/webm').split(';')[0] });
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

// ---------- Begriffsebene ----------
$('begriff-auf').addEventListener('click', () => { $('begriff').hidden = false; });
$('begriff-zu').addEventListener('click', () => { $('begriff').hidden = true; });
addEventListener('keydown', (e) => { if (e.key === 'Escape') { $('begriff').hidden = true; schliessen(); } });

try { const z = +localStorage.getItem('kristall.zustand'); zustandWaehlen(z >= 0 && z < 4 ? z : 0, true); } catch { zustandWaehlen(0, true); }
uebersetzen();
// Direktstart für Tests und Vorführungen: ?beispiel
if (new URLSearchParams(location.search).has('beispiel')) beispielStarten();
