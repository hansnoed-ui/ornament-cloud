// Brillante Ideen: eine Titelsequenz mit dem Brillanten aus dem Kristallbild (alpha/deleuze/kristall/).
// Der i-Punkt in «Brillante» (bis 0.16: der Punkt hinter «Ideen») ist ein echter, lichtbrechender Brillant (derselbe Schliff, derselbe Strahlengang).
// Dreht man ihn, legen sich die Bereiche als Glasschichten über die Seite; der Übergang geschieht Facette um Facette,
// jede Facette des Steins bricht das Bild auf ihre Weise. Alles rechnet im Browser (WebGL 2), nichts wird geladen ausser Schrift.

import { schliffEbenen } from '../deleuze/kristall/schliffe.js?v=8';

const $ = (id) => document.getElementById(id);
const leinwand = $('leinwand');

// ---------- Inhalt: drei Anwendungen von ornament.cloud (Christian, 20.11.2026; ersetzt Webdesign, Apps, Vermittlung, Kuration, Editionen;
// Composer und Multiverse wieder heraus, ORNAMENT LAB folgt, wenn es so weit ist) ----------
// Tippt man im Menü auf den Namen, öffnet sich die Vitrine (unten): Bild oder Film, Name, ein Satz, «Öffnen».
const BEREICHE = [
  { name: 'the deleuzian scheme', kopf: 'im Entstehen · Bild, Film, Ton', satz: 'Begriffe von Deleuze als Verfahren: Kristallbild, Schichten der Zeit, Dauer, Wahrnehmung, Diagramm, Figur – angewandt auf eigenes Material.',
    href: '/alpha/deleuze/start/', sprachen: ['de', 'en', 'fr'], bild: 'vorschau/deleuzian-scheme.jpg?v=3', ton: [228, 92, 96] },
  { name: 'Das Dritte Rad', kopf: 'Zeit · Form · Farbe', satz: 'Zeit, Form und Farbe drehen gegeneinander. Jede Drehung zieht einen Zettel, eine Begegnung aus ORNA und eine Übung aus OMNA COLOR.',
    href: '/beta/drittes-rad/', sprachen: ['de', 'en'], adressen: { de: '/beta/drittes-rad/?sprache=de', en: '/beta/drittes-rad/?sprache=en' }, schau: 'rad', ton: [232, 150, 80] },
  { name: 'Animations', kopf: 'Bild · Bewegung', satz: 'Ein Bild, 24 Effekte, bis zu drei Ebenen: das Mischpult für eigene Animationen.',
    href: '/animations/', sprachen: ['de', 'en', 'es'], adressen: { en: '/animations/en/', es: '/animations/es/' }, bild: 'vorschau/animations.jpg?v=2', film: 'vorschau/animations.mp4?v=2', ton: [124, 108, 255] }
];
// Die Farben der Schichten: Rot (Godard), Orange (das Rad), Violett.

// ---------- Sprache (0.25, Christian, 20.11.2026: «komplett deutsch, englisch, spanisch, französisch») ----------
// Gewählt wird nach der Sprache, die der Browser meldet (navigator.languages, dieselbe Angabe wie Accept-Language):
// sie sagt, was die Besucherin lesen will, auch in der mehrsprachigen Schweiz oder unterwegs, wo die Herkunft der
// IP-Adresse irren würde; zudem bleibt alles im Browser, ohne Abfrage bei einem Dienst. ?lang=fr erzwingt eine Sprache,
// ein Tippen auf DE EN FR ES oben rechts merkt sie sich auf diesem Gerät. Was keine der vier ist, liest Englisch.
const SPRACHEN = ['de', 'en', 'fr', 'es'];
const SPRACHE = (() => {
  const q = new URLSearchParams(location.search).get('lang');
  if (SPRACHEN.includes(q)) return q;
  try { const g = localStorage.getItem('brillant.sprache'); if (SPRACHEN.includes(g)) return g; } catch {}
  for (const l of navigator.languages || [navigator.language || '']) { const k = String(l).slice(0, 2).toLowerCase(); if (SPRACHEN.includes(k)) return k; }
  return 'en';
})();
const NBSP = ' ';   // schmales Leerzeichen vor «:» im Französischen
const TEXTE = {
  de: { titel: 'Brillante Ideen.', iBei: 2, menu: 'Menü', anwendungen: 'Anwendungen', mehr: 'Mehr erfahren', oeffnen: 'Öffnen', oeffnenAria: (n) => `${n} öffnen`,
    nurIn: { de: 'auf Deutsch', en: 'auf Englisch', fr: 'auf Französisch', es: 'auf Spanisch' }, vor: 'Vorherige Anwendung', nach: 'Nächste Anwendung', zu: 'Schliessen', sprache: 'Sprache',
    anw: [
      { kopf: 'im Entstehen · Bild, Film, Ton', satz: 'Begriffe von Deleuze als Verfahren: Kristallbild, Schichten der Zeit, Dauer, Wahrnehmung, Diagramm, Figur – angewandt auf eigenes Material.' },
      { kopf: 'Theorie · Kunstpraxis · Impuls', satz: 'Drei Ringe drehen gegeneinander. Jede Drehung verbindet einen Gedanken aus der Theorie mit einer künstlerischen Praxis und gibt einen Impuls für die eigene Arbeit.' },
      { kopf: 'Bild · Bewegung', satz: 'Ein Bild, 24 Effekte, bis zu drei Ebenen: das Mischpult für eigene Animationen.' }] },
  en: { titel: 'Brilliant Ideas.', iBei: 2, menu: 'Menu', anwendungen: 'Applications', mehr: 'Learn more', oeffnen: 'Open', oeffnenAria: (n) => `Open ${n}`,
    nurIn: { de: 'in German', en: 'in English', fr: 'in French', es: 'in Spanish' }, vor: 'Previous application', nach: 'Next application', zu: 'Close', sprache: 'Language',
    anw: [
      { kopf: 'in progress · image, film, sound', satz: 'Concepts of Deleuze as procedures: crystal-image, sheets of time, duration, perception, diagram, figure – applied to your own material.' },
      { kopf: 'theory · art practice · impulse', satz: 'Three rings turn against each other. Every turn joins a thought from theory with an artistic practice and gives an impulse for your own work.' },
      { kopf: 'image · motion', satz: 'One image, 24 effects, up to three layers: the mixing desk for your own animations.' }] },
  fr: { titel: 'Idées brillantes.', iBei: 8, menu: 'Menu', anwendungen: 'Applications', mehr: 'En savoir plus', oeffnen: 'Ouvrir', oeffnenAria: (n) => `Ouvrir ${n}`,
    nurIn: { de: 'en allemand', en: 'en anglais', fr: 'en français', es: 'en espagnol' }, vor: 'Application précédente', nach: 'Application suivante', zu: 'Fermer', sprache: 'Langue',
    anw: [
      { kopf: 'en cours · image, film, son', satz: `Les concepts de Deleuze comme procédés${NBSP}: image-cristal, nappes de passé, durée, perception, diagramme, Figure – appliqués à votre propre matériau.` },
      { kopf: 'théorie · pratique artistique · impulsion', satz: 'Trois anneaux tournent l’un contre l’autre. Chaque tour relie une pensée théorique à une pratique artistique et donne une impulsion pour votre propre travail.' },
      { kopf: 'image · mouvement', satz: `Une image, 24 effets, jusqu’à trois calques${NBSP}: la table de mixage pour vos propres animations.` }] },
  es: { titel: 'Ideas brillantes.', iBei: 8, menu: 'Menú', anwendungen: 'Aplicaciones', mehr: 'Saber más', oeffnen: 'Abrir', oeffnenAria: (n) => `Abrir ${n}`,
    nurIn: { de: 'en alemán', en: 'en inglés', fr: 'en francés', es: 'en español' }, vor: 'Aplicación anterior', nach: 'Aplicación siguiente', zu: 'Cerrar', sprache: 'Idioma',
    anw: [
      { kopf: 'en desarrollo · imagen, cine, sonido', satz: 'Conceptos de Deleuze como procedimientos: imagen-cristal, capas del pasado, duración, percepción, diagrama, figura – aplicados a tu propio material.' },
      { kopf: 'teoría · práctica artística · impulso', satz: 'Tres anillos giran unos contra otros. Cada giro une un pensamiento de la teoría con una práctica artística y da un impulso para tu propio trabajo.' },
      { kopf: 'imagen · movimiento', satz: 'Una imagen, 24 efectos, hasta tres capas: la mesa de mezclas para tus propias animaciones.' }] }
};
const T = TEXTE[SPRACHE];
BEREICHE.forEach((b, i) => Object.assign(b, T.anw[i]));
const TITEL = T.titel, TITEL_KURZ = TITEL.replace(/\.$/, '');
// feste Texte der Seite
document.documentElement.lang = SPRACHE;
document.title = `${TITEL_KURZ} · ornament.cloud`;
document.querySelector('h1').textContent = TITEL;
document.getElementById('mehr').firstChild.textContent = T.mehr + ' ';
document.getElementById('stein').setAttribute('aria-label', T.menu);
document.getElementById('bereiche').setAttribute('aria-label', T.anwendungen);
document.getElementById('vitrine').setAttribute('aria-label', T.anwendungen);
document.querySelector('.v-zu').setAttribute('aria-label', T.zu);
document.querySelector('.p-mehr').firstChild.textContent = T.mehr + ' ';
{
  const wahl = document.getElementById('sprachen'); wahl.setAttribute('aria-label', T.sprache);
  for (const k of SPRACHEN) {
    const a = document.createElement('a'); a.textContent = k.toUpperCase(); a.lang = k; a.hreflang = k;
    const u = new URL(location.href); u.searchParams.set('lang', k); a.href = u.pathname + u.search;
    if (k === SPRACHE) a.setAttribute('aria-current', 'true');
    a.addEventListener('click', () => { try { localStorage.setItem('brillant.sprache', k); } catch {} });
    wahl.append(a);
  }
}
let vitrineOffen = false;
const ZUSTAENDE = BEREICHE.length + 1;          // 0 = Titel, 1–3 = Anwendungen
const SCHRITT = (Math.PI * 2) / ZUSTAENDE;      // eine Vierteldrehung je Anwendung

// ---------- Absturzspur (Lehre aus PHORMA): nur in der Konsole, nie für Gäste ----------
const SPUR = 'brillant.spur';
function spur(s) { try { const a = JSON.parse(localStorage.getItem(SPUR) || '[]'); a.push(s); localStorage.setItem(SPUR, JSON.stringify(a.slice(-12))); } catch {} }
try {
  const a = JSON.parse(localStorage.getItem(SPUR) || '[]');
  if (a.length && !['✓ läuft', 'Ende', 'Pause'].includes(a.at(-1))) console.info('[brillant] Der letzte Besuch endete unerwartet:', a.join(' → '));
  localStorage.setItem(SPUR, JSON.stringify(['Start']));
} catch {}
addEventListener('pagehide', () => spur('Ende'));
document.addEventListener('visibilitychange', () => spur(document.hidden ? 'Pause' : 'zurück'));

const telefon = matchMedia('(pointer: coarse)').matches || Math.min(screen.width, screen.height) < 700;
const ruhig = matchMedia('(prefers-reduced-motion: reduce)').matches;
const MAX_DPR = telefon ? 2 : 2;
const MAX_F = 60;

// Ohne echte Grafikkarte (Windows «Microsoft Basic Render Driver», SwiftShader, llvmpipe) rechnet der Browser jeden
// Bildpunkt auf dem Prozessor: der Stein stünde still. Dann zeichnet die Seite flach (Canvas 2D) und lädt sicher.
// ?flach erzwingt die flache Fassung, ?gl die volle auch auf Software-Grafik (Prüfen im Container).
const frage = new URLSearchParams(location.search);
let gl = null;
try { gl = frage.has('flach') ? null : leinwand.getContext('webgl2', { antialias: false, alpha: false, premultipliedAlpha: false, powerPreference: 'high-performance' }); } catch { gl = null; }
if (gl && !frage.has('gl')) {
  const info = gl.getExtension('WEBGL_debug_renderer_info');
  const name = String(gl.getParameter(info ? info.UNMASKED_RENDERER_WEBGL : gl.RENDERER) || '');
  if (/SwiftShader|Basic Render|llvmpipe|softpipe|WARP|Software/i.test(name)) { spur('Software-Grafik: ' + name); gl = null; }
}
if (!gl) spur('flach');
let flach = null, fctx = null;   // flache Leinwand, entsteht erst bei Bedarf
leinwand.addEventListener('webglcontextlost', (e) => { e.preventDefault(); spur('Kontext verloren'); });

// ---------- Shader ----------
const VS = `#version 300 es
in vec2 a; out vec2 v;
void main(){ v = a*0.5+0.5; gl_Position = vec4(a,0.,1.); }`;

const FS = `#version 300 es
precision highp float;
#define MAX_K ${MAX_F}
#define WELLEN ${telefon ? 3 : 4}
#define WEGE 3
#define AA ${telefon ? 2 : 4}
in vec2 v; out vec4 o;
uniform sampler2D uA, uB, uLeer;   // Ausgangsschicht, Zielschicht, leerer Grund (für den Auftakt)
uniform vec3 uN[MAX_K];            // Ebenen des Brillanten, schon gedreht
uniform float uR[MAX_K];
uniform int uK;
uniform float uF;                  // Übergang von A nach B, 0 … 1
uniform float uWirbel;             // wie stark die Facetten das Bild gerade brechen
uniform float uZeigen;             // Auftakt: wie weit die Schrift schon steht, 0 … 1
uniform float uBlitz;
uniform float uStern, uZeit, uKreisel;              // 0.19: feine, irisierende Strahlen um den ruhenden i-Punkt
uniform float uDimm;               // offenes Menü: die Seite tritt zurück
uniform float uWeich;              // 0.29: Übergang ohne Facetten, als ruhige Blende (Menü)
uniform vec2 uGem;                 // Mitte des Steins (Bildpunkte der Leinwand, unten links = 0)
uniform float uGemR;               // Radius des Steins in Bildpunkten
uniform vec2 uFeld;                // Mitte des grossen, unsichtbaren Steins, der das Bild zerlegt
uniform float uGross;              // dessen Grösse in Bildpunkten
uniform vec2 uAufl;                // Leinwand in Bildpunkten
uniform float uRad, uT, uFeuer;
// Licht wird Glas: Strahlen aus dem Stein und die Scheibe, in der sie sich sammeln (Bildpunkte, unten links = 0)
uniform vec4 uScheibe;             // Mitte xy, halbe Breite und Höhe zw
uniform float uPraes;              // wie weit sich die Scheibe verdichtet hat, 0 … 1
uniform float uStrahl;             // Stärke der Strahlen
uniform vec3 uZiel;                // Mitte des Fächers (x), Oberkante (y), halbe Breite (z)
uniform float uFunkel, uPx;
uniform sampler2D uSchrift;
uniform vec3 uGlasTon;
// 0.9 Facette als Fenster: im Menü schaut man durch die Tafel des Steins auf ein Werk des Bereichs
uniform sampler2D uWerke;          // fünf Werke nebeneinander
uniform vec2 uWerk;                // Werk vor und nach der Drehung (-1 = keines)
uniform float uWerkF, uMenu, uFenster;
uniform int uTafel;
float gWm = 0.0;                   // Übergang des Werks in der gerade getroffenen Facette
vec3 werk(vec2 uv, float i){
  if (i < -0.5) return vec3(0.035, 0.03, 0.08);
  // ausserhalb des Bildes ins Dunkel, nie verschmiert
  vec2 r = smoothstep(vec2(0.0), vec2(0.06), uv) * smoothstep(vec2(0.0), vec2(0.06), 1.0 - uv);
  vec3 c = texture(uWerke, vec2((i + clamp(uv.x, 0.002, 0.998)) / 5.0, clamp(uv.y, 0.002, 0.998))).rgb;
  return mix(vec3(0.035, 0.03, 0.08), c, r.x * r.y);
}
vec3 werkJetzt(vec2 uv){ return mix(werk(uv, uWerk.x), werk(uv, uWerk.y), gWm); }
const float AUGE = 4.0;
const vec3 L1 = vec3(0.53, 0.68, 0.5), L2 = vec3(-0.62, 0.55, 0.56), L3 = vec3(0.1, -0.35, 0.93);

float h(float n){ return fract(sin(n * 91.345 + 7.13) * 43758.5453); }

// die Seite, wie sie gerade steht (mit dem Auftakt: Schrift erscheint in einem weichen Lichtstreif)
vec3 seite(vec2 uv, float m){
  uv = clamp(uv, vec2(0.0), vec2(1.0));
  vec3 a = texture(uA, uv).rgb;
  if (uZeigen < 1.0) {
    float w = (uv.x * 0.55 + (1.0 - uv.y) * 0.45);
    float z = smoothstep(w - 0.12, w + 0.12, uZeigen * 1.3 - 0.15);
    a = mix(texture(uLeer, uv).rgb, texture(uA, uv + vec2(0.0, (1.0 - z) * 0.01)).rgb, z);
  }
  if (m <= 0.0) return a;
  return mix(a, texture(uB, uv).rgb, m);
}

// konvexer Stein als Schnitt von Halbräumen: Eintritt und Austritt exakt
bool treffen(vec3 ro, vec3 rd, out float t0, out int i0){
  t0 = -1e9; float t1 = 1e9; i0 = 0;
  float bb = dot(ro, rd), cc = dot(ro, ro) - uRad * uRad;
  if (cc > 0.0 && (bb > 0.0 || bb * bb < cc)) return false;
  for (int k = 0; k < MAX_K; k++) {
    if (k >= uK) break;
    vec3 n = uN[k]; float dn = dot(rd, n), ab = uR[k] - dot(ro, n);
    if (abs(dn) < 1e-6) { if (ab < 0.0) return false; continue; }
    float t = ab / dn;
    if (dn < 0.0) { if (t > t0) { t0 = t; i0 = k; } } else { t1 = min(t1, t); }
  }
  return t0 < t1 && t1 > 0.0;
}
float austritt(vec3 p, vec3 d, out int i1){
  float t1 = 1e9; i1 = 0;
  for (int k = 0; k < MAX_K; k++) {
    if (k >= uK) break;
    vec3 n = uN[k]; float dn = dot(d, n);
    if (dn > 1e-6) { float t = (uR[k] - dot(p, n)) / dn; if (t < t1) { t1 = t; i1 = k; } }
  }
  return t1;
}
vec3 spektrum(float l){
  float r = exp(-pow((l - 610.0) / 55.0, 2.0)) + 0.35 * exp(-pow((l - 420.0) / 30.0, 2.0));
  float g = exp(-pow((l - 545.0) / 50.0, 2.0));
  float b = exp(-pow((l - 450.0) / 40.0, 2.0));
  return vec3(r, g, b);
}
// Umgebung des Steins: die Seite selbst, dazu ein stilles Atelierlicht (drei weiche Fenster)
vec3 umwelt(vec3 d, float m){
  vec2 gemUV = uGem / uAufl;
  vec3 c = seite(gemUV + d.xy * vec2(uAufl.y / uAufl.x, 1.0) * 0.16, m) * 1.25;
  c += vec3(1.0, 0.985, 0.96) * (pow(max(dot(d, L1), 0.0), 22.0) * 2.1 + pow(max(dot(d, L2), 0.0), 34.0) * 1.5 + pow(max(dot(d, L3), 0.0), 10.0) * 0.35) * (1.0 - uMenu * 0.12);
  // 0.14 (Christian: «echter»): Kupfer aus, der Stein bleibt klar; 0.7 gäbe den Kupfer-Look von 0.13
  const float KUPFER = 0.0;
  // im Menü ein warmes Atelier statt Fotos: Kupfer zu Violett, unten dunkel (Christian: so «sehr schön», ohne Foto)
  if (uMenu > 0.001) {
    vec3 kupfer = mix(vec3(0.98, 0.56, 0.27), vec3(0.50, 0.36, 0.92), smoothstep(-0.1, 1.1, d.x * 0.8 + d.y * 0.6));
    kupfer *= 0.35 + 0.65 * smoothstep(-0.9, 0.6, d.y);
    c = mix(c, kupfer * 0.9 + c * 0.3, uMenu * KUPFER);
  }
  return c + vec3(0.045, 0.04, 0.085);
}

// ---------- Licht wird Glas ----------
float rauschen(vec2 x){
  vec2 i = floor(x), f = fract(x); f = f * f * (3.0 - 2.0 * f);
  float a = h(i.x + i.y * 57.0), b = h(i.x + 1.0 + i.y * 57.0), c = h(i.x + (i.y + 1.0) * 57.0), d = h(i.x + 1.0 + (i.y + 1.0) * 57.0);
  return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
}
// Fächer feiner Spektralstrahlen: jeder Strahl eine Wellenlänge, von Rot bis Violett über die Breite der Scheibe.
// Sie treten unten aus dem Stein, werden mit dem Weg breiter und leiser, und funkeln, wenn der Stein sich dreht.
// 0.8 (Christian: «breiter, feiner, differenzierter»): 48 Strahlen, jeder mit eigener Stärke, Breite, Länge und
// Wellenlänge. Gerechnet werden nur die Strahlen nahe beim Bildpunkt (der Fächer ist geordnet), darum bleibt es schnell.
// nah: Abstand zum nächsten Strahl in Bildpunkten, daran wächst das Glas.
const int STRAHLEN = 48;
vec3 strahlen(vec2 P, out float nah){
  nah = 1e5;
  vec2 O = uGem - vec2(0.0, uGemR * 0.5);
  if (P.y >= O.y - 1.0) return vec3(0.0);
  float xt = O.x + (P.x - O.x) * (O.y - uZiel.y) / (O.y - P.y);
  float fp = ((xt - uZiel.x) / (2.0 * uZiel.z) + 0.5) * float(STRAHLEN - 1);
  int mitte = int(floor(fp + 0.5));
  vec3 s = vec3(0.0);
  for (int j = -5; j <= 5; j++) {
    int i = mitte + j;
    if (i < 0 || i >= STRAHLEN) continue;
    float fi = float(i);
    float f = (fi + (h(fi * 3.1) - 0.5) * 0.8) / float(STRAHLEN - 1);
    vec2 T = vec2(uZiel.x + (f - 0.5) * 2.0 * uZiel.z, uZiel.y);
    vec2 q = P - O, dir = normalize(T - O);
    float t = dot(q, dir);
    if (t < 0.0) continue;
    float lauf = length(T - O), quer = abs(q.x * dir.y - q.y * dir.x);
    float stark = 0.18 + 0.82 * pow(h(fi * 7.3 + 1.0), 2.2);      // wenige helle, viele leise
    float breit = 0.55 + 0.9 * h(fi * 1.7 + 2.0);
    float lang = 1.15 + 0.7 * h(fi * 4.1 + 3.0);
    float w = (0.32 * uPx + t * 0.0035) * breit, w2 = w * 12.0;
    float a = exp(-quer * quer / (w * w)) * stark + 0.03 * exp(-quer * quer / (w2 * w2));
    a *= smoothstep(uGemR * 0.2, uGemR * 0.85, t) * (1.0 - smoothstep(lauf * lang * 0.8, lauf * lang, t)) * (0.35 + 0.65 * exp(-t / (lauf * 1.2)));
    float fl = 0.55 + 0.45 * sin(uT * (0.5 + h(fi) * 0.9) + fi * 2.7 + uFunkel * (5.0 + 4.0 * h(fi * 9.1)));
    // Licht, nicht Disco: weisser Kern, Farbe als Saum, zum Rand des Fächers hin satter
    float l = mix(650.0, 440.0, f) + (h(fi * 5.9) - 0.5) * 70.0;
    float saum = 0.18 + 0.55 * abs(f - 0.5) * 2.0;
    s += mix(vec3(0.93, 0.91, 1.0), spektrum(l) * 1.2, saum) * a * fl;
    if (t < lauf * lang) nah = min(nah, quer);
  }
  return s * uStrahl * 0.5;
}
vec3 strahlen(vec2 P){ float n; return strahlen(P, n); }
float kasten(vec2 P){
  float R = 28.0 * uPx;
  vec2 d = abs(P - uScheibe.xy) - uScheibe.zw + vec2(R);
  return length(max(d, 0.0)) + min(max(d.x, d.y), 0.0) - R;
}
// die Scheibe: dickes Glas ohne Kante. Zum Rand hin wird sie zur Linse, bricht die Strahlen in ihre Farben,
// und sie verdichtet sich von oben, wo das Licht eintritt, Korn um Korn
vec3 glas(vec2 P, vec3 col, out float k){
  k = 0.0;
  float sd = kasten(P), weich = 40.0 * uPx;
  if (sd > weich * 0.4) return col;
  vec2 e = vec2(1.5 * uPx, 0.0);
  vec2 g = normalize(vec2(kasten(P + e.xy) - kasten(P - e.xy), kasten(P + e.yx) - kasten(P - e.yx)) + 1e-6);
  float innen = clamp(-sd / (54.0 * uPx), 0.0, 1.0), linse = pow(1.0 - innen, 2.0);
  float maske = 1.0 - smoothstep(-weich, weich * 0.4, sd);
  vec2 lp = (P - (uScheibe.xy - uScheibe.zw)) / (2.0 * uScheibe.zw);
  float korn = rauschen(P / (3.0 * uPx)) * 0.35 + rauschen(P / (14.0 * uPx)) * 0.65;
  // Das Glas wächst aus dem Licht: zuerst entlang der Strahlen, von oben, wo sie eintreffen; dann füllt es
  // den Raum zwischen ihnen, Korn um Korn
  float nah; vec3 direkt = strahlen(P, nah);
  float abstand = 2.0 * uZiel.z / float(STRAHLEN - 1);
  float zwischen = smoothstep(0.0, abstand * 1.4, nah);
  float front = (1.0 - lp.y) * 0.42 + zwischen * 0.4 + korn * 0.18;
  float da = smoothstep(front - 0.06, front + 0.14, uPraes * 1.3);
  k = maske * da;
  // wo das Glas noch fehlt, glimmen die Strahlen beim Eintreten auf: Licht, das gleich fest wird
  float werden = maske * (1.0 - da) * smoothstep(0.0, 0.5, uPraes) * (1.0 - zwischen);
  if (k < 0.002) return col + direkt * werden * 1.2;
  vec2 off = -g * linse * 26.0 * uPx + vec2(0.0, 6.0 * uPx);
  vec3 licht = strahlen(P + off);
  vec3 c = col * 0.6 + uGlasTon * (0.07 + 0.1 * lp.y) * (0.75 + 0.5 * korn) + licht * 1.5;
  // Tiefe: der dicke Rand fängt Licht von innen
  c += (uGlasTon * 0.5 + 0.2) * pow(linse, 2.0) * maske * 0.12 * (0.6 + 0.4 * lp.y);
  // wo das Licht oben eintritt, glimmt die Scheibe (Kaustik), leise über die ganze Breite
  float oben = uScheibe.y + uScheibe.w - P.y;
  c += (uGlasTon * 0.6 + 0.25) * exp(-oben / (16.0 * uPx)) * 0.32 * uStrahl * (0.5 + 0.5 * sin(lp.x * 19.0 + uFunkel * 3.0 + korn * 4.0));
  // Farbsaum: im dicken Rand zerlegt das Glas das Licht
  c += spektrum(mix(420.0, 680.0, 0.5 + 0.5 * sin(atan(g.y, g.x) * 2.0 + lp.x * 3.0 + uFunkel))) * pow(linse, 3.0) * maske * 0.09;
  // ein Glanz von links oben, kaum sichtbar
  c += vec3(0.95, 0.94, 1.0) * 0.045 * smoothstep(0.35, 1.0, lp.y * 0.65 + (1.0 - lp.x) * 0.35) * (1.0 - linse);
  // Schrift zuletzt: als Licht in der Scheibe, ihr Farbsaum zieht sich zusammen
  float ts = smoothstep(0.55, 1.0, uPraes);
  float sp = (1.0 - ts) * (1.0 - ts) * 4.0 * uPx / (2.0 * uScheibe.z) + 0.3 * uPx / (2.0 * uScheibe.z);
  vec2 tuv = lp + off / (2.0 * uScheibe.zw) * 0.12;
  vec4 tr = texture(uSchrift, tuv + vec2(sp, 0.0)), tg = texture(uSchrift, tuv), tb = texture(uSchrift, tuv - vec2(sp, 0.0));
  c = mix(c, c * 0.55, tg.a * ts * 0.6) + vec3(tr.r * tr.a, tg.g * tg.a, tb.b * tb.a) * ts * 1.04;
  return mix(col, c, k) + direkt * werden * 1.2;
}

vec4 stein(vec2 gq, float m){
  vec3 ro = vec3(0.0, 0.0, AUGE), rd = normalize(vec3(gq, -AUGE));
  float t0; int i0;
  if (!(treffen(ro, rd, t0, i0) && t0 > 0.0)) return vec4(0.0);
  vec3 p0 = ro + rd * t0, n0 = uN[i0];
  float zweite = -1e9;
  for (int k = 0; k < MAX_K; k++) { if (k >= uK) break; if (k != i0) zweite = max(zweite, dot(p0, uN[k]) - uR[k]); }
  float kante = 1.0 - smoothstep(0.0, 0.016, -zweite);   // 0.16: feinere Kanten (Christian)
  vec3 rf = reflect(rd, n0);
  float fres = 0.04 + 0.96 * pow(1.0 - abs(dot(rd, n0)), 5.0);
  // jede Facette wechselt das Werk zu ihrer eigenen Zeit
  float thW = h(float(i0) * 1.3 + 5.0) * 0.55;
  gWm = smoothstep(thW, thW + 0.45, uWerkF);
  vec3 innen = vec3(0.0), summe = vec3(0.0);
  float glut = 0.0;
  for (int w = 0; w < WELLEN; w++) {
    float l = mix(410.0, 690.0, (float(w) + 0.5) / float(WELLEN));
    float ior = 2.3 + 0.046 / pow(l / 1000.0, 2.0);    // Diamant 2.42, Dispersion bewusst verstärkt (Christian: «brillanter»)
    vec3 d = refract(rd, n0, 1.0 / ior), p = p0;
    for (int b = 0; b < WEGE; b++) {
      int i1; float t1 = austritt(p + d * 1e-4, d, i1);
      p = p + d * t1; vec3 n1 = uN[i1];
      vec3 aus = refract(d, -n1, ior);
      if (dot(aus, aus) > 0.0) { d = aus; break; }
      d = reflect(d, -n1);
    }
    vec3 gew = spektrum(l);
    float feuer = pow(max(dot(d, L1), 0.0), 200.0) + pow(max(dot(d, L2), 0.0), 200.0) + pow(max(dot(d, L3), 0.0), 120.0);
    innen += (umwelt(d, m) + feuer * uFeuer) * gew;
    glut += feuer;
    summe += gew;
  }
  innen /= summe;
  // Brillanz: ein Diamant lebt vom Gegensatz, tiefes Dunkel neben grellem Licht
  innen = pow(innen, vec3(1.35)) * 1.35;
  float glanz = (pow(max(dot(rf, L1), 0.0), 160.0) + 0.7 * pow(max(dot(rf, L2), 0.0), 220.0)) * 1.6;
  vec3 col = mix(innen, umwelt(rf, m), clamp(fres, 0.0, 1.0)) + glanz;
  col = mix(col, vec3(1.0, 0.99, 0.97), kante * 0.17);
  // im Menü viel Funkeln, aber nicht grell: Lichter weich zusammendrücken statt ausbrennen
  vec3 tief = pow(max(col, 0.0), vec3(1.15));
  col = mix(col, tief * 1.4 / (1.0 + tief * 0.38), uMenu);
  // die Tafel als Fenster: man sieht durch sie das Werk, leicht gebrochen und mit Farbsaum zum Rand
  if (uMenu > 0.001 && i0 == uTafel) {
    gWm = smoothstep(0.3, 0.7, uWerkF);
    vec3 rt = refract(rd, n0, 1.0 / 2.42);
    vec2 w = 0.5 + (gq + rt.xy * 0.22) / (2.0 * uFenster);
    vec2 aus = (w - 0.5) * 0.014;
    vec3 fenster = vec3(werkJetzt(w + aus).r, werkJetzt(w).g, werkJetzt(w - aus).b);
    float randW = smoothstep(0.32, 0.5, length(w - 0.5));
    fenster = fenster * (1.0 - randW * 0.35) + glanz * 0.5 + fres * 0.12;
    col = mix(col, fenster, uMenu * (1.0 - kante * 0.6));
  }
  return vec4(col, 1.0);
}

void main(){
  vec2 p = gl_FragCoord.xy, uv = v;
  float m = 0.0;
  vec3 col;
  // Übergang: ein grosser, unsichtbarer Brillant über der ganzen Seite. Jede seiner Facetten
  // bricht das Bild anders und wechselt zu ihrer eigenen Zeit in die neue Schicht.
  if (uWirbel > 0.002 || (uF > 0.0005 && uF < 0.9995)) {
    vec2 q = (p - uFeld) / uGross;
    float best = 1e9, zweit = 1e9; int bi = 0;
    for (int k = 0; k < MAX_K; k++) {
      if (k >= uK) break;
      vec3 n = uN[k];
      if (n.z > 0.08) {
        float z = (uR[k] - dot(n.xy, q)) / n.z;
        if (z < best) { zweit = best; best = z; bi = k; } else if (z < zweit) zweit = z;
      }
    }
    vec3 n = uN[bi];
    float th = h(float(bi) + 3.0) * 0.72;
    m = mix(smoothstep(th, th + 0.28, uF), smoothstep(0.0, 1.0, uF), uWeich);
    // 0.18 (Christian: «feiner, leicht irisierend»): kleinere Facetten, sanfterer Versatz, breiterer Farbsaum
    vec2 off = n.xy * uWirbel * 0.017 * vec2(uAufl.y / uAufl.x, 1.0);
    col = vec3(seite(uv + off * 0.7, m).r, seite(uv + off, m).g, seite(uv + off * 1.35, m).b);
    // Dünnschicht: jede Facette schimmert in ihrer eigenen, leisen Spektralfarbe, dort wo Licht ist
    vec3 iris = 0.5 + 0.5 * cos(6.2832 * (h(float(bi) * 1.7) + length(q) * 0.8 + vec3(0.0, 0.33, 0.67)));
    col += iris * uWirbel * 0.07 * (0.25 + dot(col, vec3(0.33)));
    col *= 1.0 + uWirbel * 0.2 * (dot(n, normalize(vec3(0.35, 0.6, 0.72))) - 0.62);
    // keine Kanten: an den Facettengrenzen nur ein Hauch Licht, weich über viele Bildpunkte
    // 0.21 (Christian: «noch präziser, etwas schimmernder»): Nähte haarfein und scharf, ein Lichtschimmer läuft an ihnen entlang
    float nb = (zweit - best) * uGross / uPx;                             // Abstand zur Naht in CSS-Bildpunkten
    float naht = exp(-nb * nb / 0.9) + 0.25 * exp(-nb / 3.0);
    float lauf = 0.55 + 0.45 * sin(uZeit * 1.6 + length(q) * 22.0 + float(bi) * 1.3);
    vec3 schimmer = mix(vec3(1.0, 0.98, 0.95), 0.5 + 0.5 * cos(6.2832 * (length(q) * 1.4 - uZeit * 0.12 + vec3(0.0, 0.33, 0.67))), 0.65);
    col += naht * uWirbel * schimmer * (0.05 + 0.13 * lauf);
    // in der Mitte der Drehung löst sich die Schrift ins Leere: das alte Wort geht, bevor das neue kommt
    col = mix(col, texture(uLeer, uv).rgb, pow(sin(3.14159 * uF), 2.0) * 0.4);
  } else {
    m = uF >= 0.9995 ? 1.0 : 0.0;
    col = seite(uv, m);
  }

  if (uDimm > 0.0) col = mix(col, texture(uLeer, uv).rgb * 0.85, uDimm);
  float lichtGlow = 0.0;
  if (uStrahl > 0.001 || uPraes > 0.001) {
    float k = 0.0;
    if (uPraes > 0.001) col = glas(p, col, k);
    if (uStrahl > 0.001 && p.y < uGem.y && p.y > uZiel.y - 2.6 * uScheibe.w) {
      vec3 s = strahlen(p) * (1.0 - k * 0.85);
      col += s; lichtGlow = min(1.0, dot(s, vec3(0.33)) * 1.6);
    }
  }
  // der Brillant, in jedem Bildpunkt mehrfach abgetastet: er ist klein und soll trotzdem scharf funkeln
  vec2 gq = (p - uGem) / uGemR;
  float glow = 0.0;
  if (dot(gq, gq) < uRad * uRad * 1.4) {
    vec4 s = vec4(0.0);
    for (int i = 0; i < AA; i++) {
      vec2 j = AA == 4 ? vec2(float(i % 2) - 0.5, float(i / 2) - 0.5) * 0.5 : vec2(i == 0 ? -0.25 : 0.25, i == 0 ? 0.25 : -0.25);
      s += stein(gq + j / uGemR, m);
    }
    s /= float(AA);
    col = mix(col, s.rgb, s.a);
    glow = s.a * smoothstep(0.75, 1.6, max(s.r, max(s.g, s.b)));
  }
  // Blitz: ein vierstrahliger Stern, wenn der Stein seinen Platz findet
  if (uBlitz > 0.001) {
    vec2 d = abs(p - uGem) / (uGemR * 4.5);
    float stern = (exp(-d.x * 2.2) * exp(-d.y * 60.0) + exp(-d.y * 2.2) * exp(-d.x * 60.0)) * 0.55 + exp(-dot(d, d) * 40.0) * 0.4;
    col += vec3(1.0, 0.97, 0.94) * stern * uBlitz;
    glow = max(glow, stern * uBlitz);
  }
  // 0.19 (Christian: «ruhig und langsam drehen, feine Lichtbrechungen ausstrahlen», erster Eindruck):
  // haarfeine Strahlen in Spektralfarben, jeder mit eigener Länge, langsam kreisend und einzeln aufglimmend
  if (uStern > 0.001) {
    vec2 d = p - uGem; float r = length(d) / uGemR;
    if (r > 0.75 && r < 9.0) {
      float an = atan(d.y, d.x), s = 0.0; vec3 farbe = vec3(0.0);
      for (int k = 0; k < 9; k++) {
        float fk = float(k);
        float a0 = fk * 2.39996 + uKreisel * 0.35 * (mod(fk, 2.0) * 2.0 - 1.0) + h(fk * 3.1) * 0.6;
        float da = abs(mod(an - a0 + 3.14159, 6.28318) - 3.14159);
        float quer = da * length(d);                                  // Abstand quer zum Strahl in Bildpunkten
        float breite = uPx * (0.55 + 0.35 * h(fk + 9.0));
        float lang = 2.2 + 4.5 * h(fk * 7.3);
        float glimm = pow(0.5 + 0.5 * sin(uZeit * (0.35 + 0.25 * h(fk * 5.0)) + fk * 1.9), 3.0);
        float w = exp(-quer * quer / (breite * breite)) * exp(-(r - 0.75) / lang) * smoothstep(0.75, 1.15, r) * glimm;
        vec3 iris = 0.5 + 0.5 * cos(6.2832 * (r * 0.09 + h(fk * 2.3) + vec3(0.0, 0.33, 0.67)));
        farbe += mix(vec3(1.0, 0.98, 0.95), iris, 0.6) * w; s += w;
      }
      float oben = 0.3 + 0.7 * smoothstep(-0.55, 0.15, d.y / length(d));   // über der Schrift voll, nach unten leise
      farbe *= oben; s *= oben;
      col += farbe * uStern * 0.55;
      glow = max(glow, min(1.0, s * uStern * 0.35));
    }
  }
  o = vec4(col, max(glow, lichtGlow));
}`;

// ---------- Nachbearbeitung: Leuchten nur aus dem Stein (Maske im Alphakanal), Korn ----------
const FS_HELL = `#version 300 es
precision highp float; in vec2 v; out vec4 o; uniform sampler2D uQ; uniform vec2 uPx;
void main(){
  vec4 s = 0.25 * (texture(uQ, v + uPx * vec2(-1, -1)) + texture(uQ, v + uPx * vec2(1, -1)) + texture(uQ, v + uPx * vec2(-1, 1)) + texture(uQ, v + uPx * vec2(1, 1)));
  o = vec4(s.rgb * s.a, 1.0);
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
uniform sampler2D uSzene, uGlow; uniform float uGlowStaerke, uT;
float h(float n){ return fract(sin(n * 91.345 + 7.13) * 43758.5453); }
void main(){
  vec3 c = texture(uSzene, v).rgb + texture(uGlow, v).rgb * uGlowStaerke;
  c += (h(dot(v, vec2(12.9898, 78.233)) * 100.0 + uT) - 0.5) * 0.018;
  o = vec4(c, 1.0);
}`;

function programm(fs) {
  const mk = (typ, src) => { const s = gl.createShader(typ); gl.shaderSource(s, src); gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s)); return s; };
  const p = gl.createProgram(); gl.attachShader(p, mk(gl.VERTEX_SHADER, VS)); gl.attachShader(p, mk(gl.FRAGMENT_SHADER, fs)); gl.bindAttribLocation(p, 0, 'a');
  gl.linkProgram(p); if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(p));
  const ort = {}; const n = gl.getProgramParameter(p, gl.ACTIVE_UNIFORMS);
  for (let i = 0; i < n; i++) { const u = gl.getActiveUniform(p, i).name.replace('[0]', ''); ort[u] = gl.getUniformLocation(p, u); }
  return { p, ort };
}
let haupt, hell, weich, zusammen, halbFloat = false;
if (gl) try {
  haupt = programm(FS); hell = programm(FS_HELL); weich = programm(FS_WEICH); zusammen = programm(FS_ZUSAMMEN);
  const buf = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
  gl.enableVertexAttribArray(0); gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
  halbFloat = !!gl.getExtension('EXT_color_buffer_float');
  spur('Grafik bereit');
} catch (e) { console.info('[brillant] Shader abgelehnt, flache Fassung:', e.message); spur('Shader abgelehnt'); gl = null; }

const ziele = {};
function zielBauen(name, b, hh) {
  const z = ziele[name] || (ziele[name] = { tex: gl.createTexture(), fb: gl.createFramebuffer() });
  if (z.b === b && z.h === hh) return z;
  z.b = b; z.h = hh;
  gl.bindTexture(gl.TEXTURE_2D, z.tex);
  // HalfFloat statt Float32 (Telefonregel); der Stein darf heller als Weiss werden, damit er leuchtet
  gl.texImage2D(gl.TEXTURE_2D, 0, halbFloat ? gl.RGBA16F : gl.RGBA8, b, hh, 0, gl.RGBA, halbFloat ? gl.HALF_FLOAT : gl.UNSIGNED_BYTE, null);
  texParam();
  gl.bindFramebuffer(gl.FRAMEBUFFER, z.fb);
  gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, z.tex, 0);
  if (halbFloat && gl.checkFramebufferStatus(gl.FRAMEBUFFER) !== gl.FRAMEBUFFER_COMPLETE) {
    halbFloat = false; spur('kein HalfFloat-Ziel'); for (const n in ziele) ziele[n].b = 0; gl.bindFramebuffer(gl.FRAMEBUFFER, null); return zielBauen(name, b, hh);
  }
  gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  return z;
}
function texParam() {
  for (const [k, w] of [[gl.TEXTURE_MIN_FILTER, gl.LINEAR], [gl.TEXTURE_MAG_FILTER, gl.LINEAR], [gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE], [gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE]]) gl.texParameteri(gl.TEXTURE_2D, k, w);
}

// ---------- Die Seiten als Bilder: Grund, Titel, Glasschichten ----------
const SCHRIFT = "'Brillant Display', system-ui, sans-serif";
const GRUND = '#0b0a1a';
let W = 0, H = 0, D = 1, aufloesung = 1;
let lay = null;               // Satzspiegel in CSS-Pixeln
const seitenTex = [];          // 0 = Titel, 1–5 = Bereiche
let leerTex = null;

function grundMalen(c, ton) {
  c.fillStyle = GRUND; c.fillRect(0, 0, W, H);
  // Uni, aber nicht flach: ein Hauch Licht in der Mitte, die Ränder ins Schwarz.
  // Jeder Bereich legt eine eigene, kaum merkliche Tönung darüber: die Schicht.
  const t = ton || [46, 36, 92];
  const r = c.createRadialGradient(W / 2, H * 0.46, 0, W / 2, H * 0.46, Math.hypot(W, H) * 0.6);
  r.addColorStop(0, rgba(t.map((v) => Math.round(v * 0.38)), ton ? 0.42 : 0.42)); r.addColorStop(0.6, 'rgba(16, 14, 40, 0.2)'); r.addColorStop(1, 'rgba(2, 2, 8, 0.6)');
  c.fillStyle = r; c.fillRect(0, 0, W, H);
}
const SPERREN = (fs) => `${-0.022 * fs}px`;
// Satzspiegel: jeder Zustand ist ein kurzer Satz, und sein Punkt ist der Brillant.
// Viel Leere, eine Zeile, die Schrift nicht grösser als nötig.
function satzspiegel(c) {
  const hoch = W / H < 0.9 || W < 640;
  c.font = `600 100px ${SCHRIFT}`; if ('letterSpacing' in c) c.letterSpacing = SPERREN(100);
  const ref = c.measureText(TITEL_KURZ).width + 30;
  const fs = Math.round(Math.min(hoch ? 46 : 84, (W * (hoch ? 0.76 : 0.6)) / ref * 100));
  c.font = `600 ${fs}px ${SCHRIFT}`; if ('letterSpacing' in c) c.letterSpacing = SPERREN(fs);
  const gemR = fs * 0.27, luecke = fs * 0.06, y = Math.round(H * 0.47 + fs * 0.35);
  const satz = Math.round(hoch ? 16 : 19);
  const saetze = [TITEL, ...BEREICHE.map((b) => b.name)].map((t, k) => {
    const b = c.measureText(t).width;
    if (!k) {
      // 0.17 (Christian): der Brillant ist der i-Punkt in «Brillante», der Satz endet mit einem gewöhnlichen Punkt
      const x = (W - b) / 2, i0 = c.measureText(t.slice(0, T.iBei)).width, iw = c.measureText(t.slice(0, T.iBei + 1)).width - i0;
      return { t, x, y, iPunkt: { x: x + i0, w: iw }, gem: { x: x + i0 + iw / 2, y: y - fs * 0.86, r: fs * 0.21 } };
    }
    // lange Namen («the deleuzian scheme») verkleinern, bis sie mit dem Stein in die Breite passen
    const platz = W * 0.88, eng = b + luecke + gemR * 2 > platz ? platz / (b + luecke + gemR * 2) : 1;
    const fk = Math.floor(fs * eng), bk = b * fk / fs, rk = gemR * fk / fs;
    const x = (W - (bk + luecke + rk * 2)) / 2;
    return { t, x, y, fs: eng < 1 ? fk : undefined, gem: { x: x + bk + luecke + rk, y: y - rk * 0.62, r: rk } };
  });
  // Glasscheibe der Bereiche: das Wort steht, wo der Titel stand; der Titel liegt verschwommen darunter
  const sw = Math.min(W - (hoch ? 28 : 80), 620), pad = hoch ? 34 : 48;
  const scheibe = { x: (W - sw) / 2, y: y - fs * 0.95 - pad, w: sw, h: pad * 2 + fs * 0.95 + satz * 6.2 + 40 };
  // offenes Menü: der Stein gross über der Mitte, die Bereiche darunter
  const menuGem = { x: W / 2, y: Math.round(H * 0.382), r: Math.min(W, H) * (hoch ? 0.2 : 0.13) };
  return { hoch, fs, gemR, satz, saetze, scheibe, menuGem };
}
// eine Glasscheibe ohne Kanten: weich auslaufend, was darunter liegt erscheint verschwommen und getönt
function scheibeMalen(c, unscharf, ton) {
  const P = lay.scheibe;
  const t = document.createElement('canvas'); t.width = Math.round(W * D); t.height = Math.round(H * D);
  const tc = t.getContext('2d'); tc.setTransform(D, 0, 0, D, 0, 0);
  tc.drawImage(unscharf, 0, 0, W, H);
  tc.fillStyle = 'rgba(12, 10, 30, 0.42)'; tc.fillRect(0, 0, W, H);
  const g = tc.createLinearGradient(0, P.y, 0, P.y + P.h);
  g.addColorStop(0, rgba(ton, 0.2)); g.addColorStop(0.55, rgba(ton, 0.1)); g.addColorStop(1, rgba(ton, 0.04));
  tc.fillStyle = g; tc.fillRect(0, 0, W, H);
  const sheen = tc.createLinearGradient(P.x, P.y, P.x + P.w * 0.8, P.y + P.h);
  sheen.addColorStop(0, 'rgba(255,255,255,0.075)'); sheen.addColorStop(0.4, 'rgba(255,255,255,0)'); sheen.addColorStop(1, 'rgba(255,255,255,0.03)');
  tc.fillStyle = sheen; tc.fillRect(0, 0, W, H);
  // Maske: klein gezeichnet und weich vergrössert, so läuft die Scheibe ohne Kante aus
  const k = 18, m = document.createElement('canvas'); m.width = Math.ceil(W / k); m.height = Math.ceil(H / k);
  const mc = m.getContext('2d'); mc.fillStyle = '#fff';
  mc.beginPath(); const rr = Math.min(P.h, P.w) * 0.22 / k;
  if (mc.roundRect) mc.roundRect(P.x / k, P.y / k, P.w / k, P.h / k, rr); else mc.rect(P.x / k, P.y / k, P.w / k, P.h / k);
  mc.fill();
  const m2 = document.createElement('canvas'); m2.width = Math.ceil(W / 6); m2.height = Math.ceil(H / 6);
  const m2c = m2.getContext('2d'); m2c.imageSmoothingQuality = 'high'; m2c.drawImage(m, 0, 0, m2.width, m2.height);
  tc.setTransform(1, 0, 0, 1, 0, 0); tc.globalCompositeOperation = 'destination-in'; tc.imageSmoothingQuality = 'high';
  tc.drawImage(m2, 0, 0, t.width, t.height);
  c.save(); c.setTransform(1, 0, 0, 1, 0, 0); c.drawImage(t, 0, 0); c.restore();
}
function satzMalen(c, k) {
  const z = lay.saetze[k], fs = z.fs || lay.fs;
  c.save();
  c.font = `600 ${fs}px ${SCHRIFT}`; if ('letterSpacing' in c) c.letterSpacing = SPERREN(fs);
  c.textBaseline = 'alphabetic';
  const g = c.createLinearGradient(0, z.y - fs * 0.75, 0, z.y + fs * 0.05);
  g.addColorStop(0, '#fbfaff'); g.addColorStop(0.65, '#e6e2f0'); g.addColorStop(1, '#bdb7cf');
  if (z.iPunkt) {
    // Text ohne den Punkt des i: auf eigener Ebene zeichnen und den Punkt wegnehmen, der Brillant sitzt dort
    const t = document.createElement('canvas'); t.width = Math.round(W * D); t.height = Math.round(H * D);
    const tc = t.getContext('2d'); tc.setTransform(D, 0, 0, D, 0, 0);
    tc.font = c.font; if ('letterSpacing' in tc) tc.letterSpacing = SPERREN(lay.fs); tc.textBaseline = 'alphabetic';
    const g2 = tc.createLinearGradient(0, z.y - lay.fs * 0.75, 0, z.y + lay.fs * 0.05);
    g2.addColorStop(0, '#fbfaff'); g2.addColorStop(0.65, '#e6e2f0'); g2.addColorStop(1, '#bdb7cf');
    tc.fillStyle = g2; tc.fillText(z.t, z.x, z.y);
    tc.globalCompositeOperation = 'destination-out';
    tc.fillRect(z.iPunkt.x - lay.fs * 0.02, z.y - lay.fs * 1.05, z.iPunkt.w + lay.fs * 0.04, lay.fs * 0.47);
    c.setTransform(1, 0, 0, 1, 0, 0); c.drawImage(t, 0, 0);
  } else { c.fillStyle = g; c.fillText(z.t, z.x, z.y); }
  c.restore();
  if (!k) return null;
  // darunter, klein und leise: ein Satz zum Bereich
  const b = BEREICHE[k - 1], ss = lay.satz;
  c.save();
  c.textAlign = 'center'; c.font = `500 ${ss}px ${SCHRIFT}`; if ('letterSpacing' in c) c.letterSpacing = '0px';
  c.fillStyle = 'rgba(210, 206, 226, 0.78)';
  let y = z.y + lay.fs * 0.5 + ss * 1.6;
  for (const zeile of zeilenUmbruch(c, b.satz, Math.min(lay.scheibe.w - 60, lay.hoch ? 300 : 420))) { c.fillText(zeile, W / 2, y); y += ss * 1.45; }
  c.restore();
  return { y: y + ss * 0.9, ton: b.ton.map((v) => Math.min(255, Math.round(v * 0.5 + 125))) };
}
const rgba = (t, a) => `rgba(${t[0]},${t[1]},${t[2]},${a})`;
function umbrechen(c, text, breite) {
  const w = text.split(' '), z = []; let akt = '';
  for (const s of w) { const p = akt ? akt + ' ' + s : s; if (c.measureText(p).width > breite && akt) { z.push(akt); akt = s; } else akt = p; }
  if (akt) z.push(akt);
  return z;
}
// ausgleichen: so schmal wie möglich bei gleicher Zeilenzahl, damit kein Wort allein steht.
// (Bis 0.7 rief sich das rekursiv auf und wuchs bei breiten Spalten exponentiell: am Laptop hing die Seite.)
function zeilenUmbruch(c, text, breite) {
  const z = umbrechen(c, text, breite);
  if (z.length < 2) return z;
  let b = breite;
  while (b > 120 && umbrechen(c, text, b - 10).length === z.length) b -= 10;
  return b === breite ? z : umbrechen(c, text, b);
}

function texAus(canvas, alt) {
  const t = alt || gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, t);
  gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, canvas);
  gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
  texParam();
  return t;
}
// Werke für das Fenster (vorerst aus ornament.cloud; Christian kann sie tauschen)
// 0.11 (Christian: «die Bilder im Innern passen grafisch nicht»): nur Bilder aus Licht und Dunkel, ohne Schrift,
// und alle tonal angeglichen (siehe tonen), damit sie wie ein Abzug im Glas wirken.
const WERKE = ['/b/bilder/schau/animations.jpg', '/b/bilder/fotografie/print-linien-800.jpg', '/b/bilder/fotografie/buehne-2-800.jpg',
  '/b/bilder/fotografie/turm-leer-800.jpg', '/b/bilder/fotografie/hund-und-objektiv-800.jpg'];
// Duoton von Nachtblau zu warmem Silber, ein Rest Farbe bleibt, Mitten leicht abgesenkt, Rand ins Dunkel
function tonen(c, x0, S) {
  const d = c.getImageData(x0, 0, S, S), p = d.data, m = S / 2;
  for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
    const i = (y * S + x) * 4, r = p[i] / 255, g = p[i + 1] / 255, b = p[i + 2] / 255;
    let l = Math.pow(0.2126 * r + 0.7152 * g + 0.0722 * b, 1.25);
    const rx = (x - m) / m, ry = (y - m) / m, v = Math.max(0, 1 - Math.pow(Math.hypot(rx, ry) / 1.25, 3));
    l *= v;
    const duo = [0.035 + l * 0.93, 0.031 + l * 0.88, 0.08 + l * 0.80];
    p[i] = 255 * (duo[0] * 0.82 + r * v * 0.18); p[i + 1] = 255 * (duo[1] * 0.82 + g * v * 0.18); p[i + 2] = 255 * (duo[2] * 0.82 + b * v * 0.18);
  }
  c.putImageData(d, x0, 0);
}
let werkTex = null;
let werkAtlas = null, werkS = 0, werkeDa = false;     // dieselben Werke für die flache Fassung
function werkeLaden() {
  if (gl) {
    werkTex = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, werkTex);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array([9, 8, 20, 255])); texParam();
  }
  const S = telefon ? 384 : 512, atlas = document.createElement('canvas'); atlas.width = S * 5; atlas.height = S;
  const c = atlas.getContext('2d'); c.fillStyle = '#090814'; c.fillRect(0, 0, atlas.width, S);
  Promise.all(WERKE.map((src, i) => new Promise((ok) => {
    const im = new Image(); im.decoding = 'async';
    im.onload = () => { const k = Math.min(im.width, im.height); c.drawImage(im, (im.width - k) / 2, (im.height - k) / 2, k, k, i * S, 0, S, S); tonen(c, i * S, S); ok(); };
    im.onerror = () => { spur('Werk fehlt: ' + src); ok(); };
    im.src = src;
  }))).then(() => { werkAtlas = atlas; werkS = S; werkeDa = true; if (gl) werkTex = texAus(atlas, werkTex); });
}
// 0.12 (Christian: «nicht gut mit diesen integrierten Fotos»): der Stein zeigt nur Licht; die Werke bleiben abschaltbar hier
const FOTOS = false;
if (FOTOS) werkeLaden();
document.body.classList.add('fenster');
const mehrOrt = [];
const seitenBild = [];          // dieselben Seiten als Canvas, für die flache Fassung
let leerBild = null;
function seitenBauen() {
  const neu = () => { const s = document.createElement('canvas'); s.width = Math.round(W * D); s.height = Math.round(H * D); const c = s.getContext('2d'); c.setTransform(D, 0, 0, D, 0, 0); return [s, c]; };
  let [s, c] = neu();
  lay = satzspiegel(c);
  grundMalen(c); leerBild = s;                             // leerer Grund für den Auftakt
  if (gl) leerTex = texAus(s, leerTex);
  // der Titel, weich gerechnet: das sieht man durch die Scheiben
  const [t0, c0] = neu(); grundMalen(c0); satzMalen(c0, 0);
  const klein = document.createElement('canvas'); klein.width = Math.max(8, Math.round(W / 12)); klein.height = Math.max(8, Math.round(H / 12));
  const kc = klein.getContext('2d'); kc.imageSmoothingQuality = 'high'; kc.drawImage(t0, 0, 0, klein.width, klein.height);
  const unscharf = document.createElement('canvas'); unscharf.width = Math.round(W / 3); unscharf.height = Math.round(H / 3);
  const uc = unscharf.getContext('2d'); uc.imageSmoothingQuality = 'high'; uc.drawImage(klein, 0, 0, unscharf.width, unscharf.height);
  for (let k = 0; k <= BEREICHE.length; k++) {
    [s, c] = neu();
    grundMalen(c, k ? BEREICHE[k - 1].ton : null);
    if (k) {
      // der Titel bleibt sichtbar, still, und die Scheibe des Bereichs legt sich darüber
      c.save(); c.globalAlpha = 0.5; satzMalen(c, 0); c.restore();
      scheibeMalen(c, unscharf, BEREICHE[k - 1].ton);
    }
    mehrOrt[k] = satzMalen(c, k);
    seitenBild[k] = s;
    if (gl) seitenTex[k] = texAus(s, seitenTex[k]);
  }
  if (gl) schriftBauen();
}

// ---------- Brillant: Ebenen und Drehung ----------
// Christian, 20.11.2026: «weniger flach». Derselbe Schliff, in der Höhe gestreckt (tiefere Krone und Pavillon),
// und weniger geneigt gezeigt, damit man das Profil des Brillanten sieht und nicht nur seine Tafel.
const HOEHE = 1.3;
const roh = schliffEbenen('brillant', 1 / 1.15).map(([x, y, z, d]) => { const n = [x, y / HOEHE, z], l = Math.hypot(...n); return [n[0] / l, n[1] / l, n[2] / l, d / l]; });
const K = roh.length;
const FENSTER = 0.76;
const TAFEL = roh.reduce((b, n, i) => (n[1] > roh[b][1] ? i : b), 0);
const ebenenW = new Float32Array(MAX_F * 3), abstandW = new Float32Array(MAX_F);
roh.forEach(([, , , d], i) => { abstandW[i] = d; });
let huelle = 0;
for (let j = 0; j < 400; j++) {
  const y = 1 - (j + 0.5) / 200, r = Math.sqrt(Math.max(0, 1 - y * y)), w = j * 2.39996, u = [Math.cos(w) * r, y, Math.sin(w) * r];
  let weit = 1e9;
  for (const [x, yy, z, d] of roh) { const dn = u[0] * x + u[1] * yy + u[2] * z; if (dn > 1e-6) weit = Math.min(weit, d / dn); }
  huelle = Math.max(huelle, weit);
}
// Lage: zuerst um die senkrechte Achse (das ist die Drehung, die die Bereiche wechselt), dann zur Betrachterin geneigt
function ebenenDrehen(gier, neig, roll) {
  const cg = Math.cos(gier), sg = Math.sin(gier), cn = Math.cos(neig), sn = Math.sin(neig), cr = Math.cos(roll), sr = Math.sin(roll);
  roh.forEach(([x, y, z], i) => {
    const x1 = cg * x + sg * z, z1 = -sg * x + cg * z, y1 = y;                 // um y
    const y2 = cn * y1 - sn * z1, z2 = sn * y1 + cn * z1;                    // um x (neigen)
    const x3 = cr * x1 - sr * y2, y3 = sr * x1 + cr * y2;                    // um z (leicht schräg)
    ebenenW[i * 3] = x3; ebenenW[i * 3 + 1] = y3; ebenenW[i * 3 + 2] = z2;
  });
}

// ---------- Bewegung: Drehwinkel, Schwung, Einrasten ----------
let phi = 0, omega = 0, ziel = null, gezogen = false, letzteZug = 0, zugStart = 0;
let menuAuf = false, menu = 0;
// 0.29 (Christian: «schwammiges Netz, halb lesbare Texte aus alten Fassungen»): solange das Menü offen ist oder der Stein
// nach dem Schliessen noch zum Titel zurückdreht, gibt es kein Facettennetz, und die Bereichsseiten (Name, Satz, Scheibe)
// bleiben leer; der Name steht im Menü allein unter dem Stein.
let ausMenu = false;
const gemJetzt = { x: -99, y: -99, r: 10 };
const zuZustand = (w) => ((Math.round(w / SCHRITT) % ZUSTAENDE) + ZUSTAENDE) % ZUSTAENDE;
function hin(k) {   // kürzester Weg zum Zustand k, sonst immer vorwärts
  const jetzt = Math.round(phi / SCHRITT);
  let d = (((k - jetzt) % ZUSTAENDE) + ZUSTAENDE) % ZUSTAENDE;
  if (d > ZUSTAENDE / 2) d -= ZUSTAENDE;
  ziel = (jetzt + d) * SCHRITT; spur('→ ' + k);
}
// Langsam blättern: höchstens ein Bereich weiter als der, auf dem man gerade steht
const weiter = (s) => { ziel = (Math.round(phi / SCHRITT) + s) * SCHRITT; };

// Gesten gelten für die volle wie für die flache Leinwand
const zeiger = [];
function aufZeiger(typ, fn) { zeiger.push([typ, fn]); leinwand.addEventListener(typ, fn); if (flach) flach.addEventListener(typ, fn); }
const finger = new Map();
let tipp = null;
// 0.15 (Christian: «den Brillanten frei drehen»): wer auf dem Stein ansetzt, dreht ihn in alle Richtungen, mit Schwung;
// daneben wischen blättert wie bisher. Steht er still, findet er langsam in seine Lage zurück.
const frei = { an: false, g: 0, n: 0, vg: 0, vn: 0, los: 0 };
const trifftStein = (x, y) => Math.hypot(x - gemJetzt.x, y - gemJetzt.y) < Math.max(30, Math.min(gemJetzt.r * 2.2, gemJetzt.r + 36));
aufZeiger('pointerdown', (e) => {
  finger.set(e.pointerId, { x: e.clientX, y: e.clientY });
  try { e.currentTarget.setPointerCapture(e.pointerId); } catch {}
  tipp = { x: e.clientX, y: e.clientY, t: performance.now() };
  if (finger.size === 1 && trifftStein(e.clientX, e.clientY)) { frei.an = true; frei.vg = frei.vn = 0; gezogen = false; return; }
  gezogen = true; ziel = null; omega = 0; letzteZug = performance.now();
  zugStart = Math.round(phi / SCHRITT) * SCHRITT; phi = zugStart;
});
aufZeiger('pointermove', (e) => {
  const f = finger.get(e.pointerId); if (!f || !(gezogen || frei.an)) return;
  const dx = e.clientX - f.x, dy = e.clientY - f.y; f.x = e.clientX; f.y = e.clientY;
  if (frei.an) {
    const k = 3.2 / Math.max(80, gemJetzt.r * 2.4);
    frei.g += dx * k; frei.n += dy * k; frei.vg = frei.vg * 0.5 + dx * k * 0.5; frei.vn = frei.vn * 0.5 + dy * k * 0.5;
    return;
  }
  letzteZug = performance.now();
  // waagrecht und senkrecht drehen beide: nach links oder oben wischen führt weiter.
  // Der Finger zieht nur zäh, und nie weiter als knapp einen Bereich.
  const k = 1.5 / Math.min(innerWidth, innerHeight);
  phi = Math.max(zugStart - SCHRITT * 0.85, Math.min(zugStart + SCHRITT * 0.85, phi + (-dx - dy * 0.8) * k));
});
const loslassen = (e) => {
  if (!finger.delete(e.pointerId)) return;
  if (finger.size) return;
  if (frei.an) {
    frei.an = false; frei.los = performance.now();
    // im Menü wird die waagrechte Drehung zum Blättern: Winkel in phi übernehmen, mit Schwung zum nächsten Bereich
    if (menuAuf) {
      phi -= frei.g; frei.g = 0;
      const vor = Math.abs(frei.vg) > 0.02 ? -Math.sign(frei.vg) * 0.5 : 0;
      ziel = Math.round(phi / SCHRITT + vor) * SCHRITT; frei.vg = 0;
      if (zuZustand(ziel) === 0) ziel += (vor < 0 ? -1 : 1) * SCHRITT;   // im Menü nicht auf dem Titel stehen bleiben
    }
  }
  const warGezogen = gezogen; gezogen = false; omega = 0;
  // Tippen: auf den Stein öffnet und schliesst das Menü; daneben schliesst es nur
  if (tipp && Math.hypot(e.clientX - tipp.x, e.clientY - tipp.y) < 10 && performance.now() - tipp.t < 400) {
    if (warGezogen) phi = zugStart;
    const treffer = trifftStein(e.clientX, e.clientY);
    ziel = Math.round(phi / SCHRITT) * SCHRITT;
    // Christian: im Menü nicht mehr zurückklickbar; Tippen daneben führt zurück zu «Brillante Ideen.»
    if (treffer) { if (!menuAuf) menuSchalten(true); } else if (menuAuf) menuSchalten(false);
    return;
  }
  if (!warGezogen) return;
  // ein Viertel des Weges genügt, dann dreht der Stein langsam in den nächsten Bereich
  const weg = (phi - zugStart) / SCHRITT;
  ziel = zugStart + (Math.abs(weg) > 0.22 ? Math.sign(weg) * SCHRITT : 0);
};
aufZeiger('pointerup', loslassen);
aufZeiger('pointercancel', loslassen);
// Mausrad und Touchpad: ein Bereich je Bewegung, dann Ruhe, bis der Stein steht
let radSumme = 0, radSperre = 0;
addEventListener('wheel', (e) => {
  if (vitrineOffen) return;
  e.preventDefault();
  const jetzt = performance.now();
  if (jetzt < radSperre) { radSperre = Math.max(radSperre, jetzt + 260); return; }
  radSumme += e.deltaY + e.deltaX;
  if (Math.abs(radSumme) > 60) { weiter(Math.sign(radSumme)); radSumme = 0; radSperre = jetzt + 1500; }
}, { passive: false });
addEventListener('keydown', (e) => {
  if (vitrineOffen) return;
  if (['ArrowRight', 'ArrowDown', 'PageDown', ' '].includes(e.key)) { e.preventDefault(); weiter(1); }
  else if (['ArrowLeft', 'ArrowUp', 'PageUp'].includes(e.key)) { e.preventDefault(); weiter(-1); }
  else if (e.key === 'Escape' && menuAuf) menuSchalten(false);
  else if (e.key === 'Home') hin(0);
  else if (e.key === 'Enter' && document.activeElement === document.body) menuSchalten(!menuAuf);
});

// Menü: öffnet sich, wenn man den Stein antippt; der Stein steht dann gross über den Bereichen
const nav = $('bereiche');
[TITEL_KURZ, ...BEREICHE.map((b) => b.name)].forEach((name, i) => {
  const t = document.createElement('button'); t.type = 'button'; t.textContent = name; if (!i) t.className = 'start';
  t.addEventListener('click', () => { menuSchalten(false); hin(i); });
  nav.append(t);
});
const knoepfe = [...nav.children].slice(1);
const steinKnopf = $('stein');
steinKnopf.addEventListener('click', () => menuSchalten(!menuAuf));
function menuSchalten(auf) {
  menuAuf = auf; ausMenu = true; spur(auf ? 'Menü auf' : 'Menü zu');
  // zurück heisst immer: «Brillante Ideen.»
  if (!auf) hin(0);
  // im Menü steht immer ein Bereich mit Namen da (Christian: «zeigt keine Titel mehr»)
  else if (zuZustand(phi) === 0) hin(1);
  document.body.classList.toggle('menu-auf', auf);
  nav.inert = !auf; steinKnopf.setAttribute('aria-expanded', String(auf));
}
nav.inert = true;
const mehr = $('mehr');
mehr.addEventListener('click', (e) => { const k = zuZustand(phi); if (k) { e.preventDefault(); vitrineAuf(k - 1); } });

// ---------- Projektion (Christian, 20.11.2026: «3d aus dem Brillanten projiziert, nach einer Drehung präsentieren») ----------
// Im offenen Menü wirft der Stein alle Bereiche als Glasflächen hinaus: sie stehen im Raum rund um seine Achse, jede
// auf ihrer Seite des Schliffs, und drehen mit ihm. Kommt die Drehung zur Ruhe, wendet sich die vordere Fläche ganz zu
// und tritt vor; die übrigen weichen ins Dunkel zurück.
const vorlage = $('projektion'), strahl = $('strahl'), strahlKern = strahl.firstElementChild;
const flaechen = BEREICHE.map((b, i) => {
  const el = i ? vorlage.cloneNode(true) : vorlage; el.removeAttribute('id');
  if (i) vorlage.parentNode.insertBefore(el, vorlage.nextSibling);
  const hell = b.ton.map((v) => Math.min(255, Math.round(v * 0.5 + 125)));
  el.href = b.href; el.style.setProperty('--ton', b.ton.join(',')); el.style.setProperty('--hell', `rgb(${hell.join(',')})`);
  el.querySelector('.p-nr').textContent = `0${i + 1}`;
  el.querySelector('.p-name').textContent = b.name;
  el.querySelector('.p-satz').textContent = b.satz;
  el.setAttribute('aria-hidden', 'true');
  return el;
});
// lange Namen («the deleuzian scheme») passen am Telefon nicht in eine Zeile: Schrift sanft verkleinern
function namenEinpassen() {
  flaechen.forEach((el) => {
    const n = el.querySelector('.p-name'); n.style.fontSize = '';
    const verfuegbar = el.clientWidth - 24, ist = n.scrollWidth;
    if (ist > verfuegbar) n.style.fontSize = Math.floor(parseFloat(getComputedStyle(n).fontSize) * verfuegbar / ist) + 'px';
  });
}
addEventListener('resize', namenEinpassen);
document.fonts.ready.then(namenEinpassen);

// ---------- Vitrine im Raum (0.23, Christian, 20.11.2026: «dynamischer, schwebender, dreidimensionaler») ----------
// Die fünf Anwendungen stehen als Karten im Raum, im Halbkreis um die Betrachterin: die vordere ganz zugewandt,
// die Nachbarn seitlich nach hinten gedreht und gedämpft. Beim Öffnen fliegen sie aus dem Stein, beim Schliessen
// kehren sie in ihn zurück. Die vordere Karte schwebt, neigt sich zum Finger (am Telefon zur Haltung des Geräts),
// ein Licht gleitet über ihr Glas, das Bild liegt eine Ebene tiefer als die Schrift (Parallaxe).
// Blättern: ziehen (die Karten folgen dem Finger mit Schwung), ‹ ›, Pfeiltasten oder eine Nachbarkarte antippen.
const vitrine = $('vitrine'), vRaum = vitrine.querySelector('.v-raum');
const vKarten = BEREICHE.map((b, i) => {
  // fehlt die gewählte Sprache, öffnet sich die Anwendung auf Englisch, wenn es sie so gibt, sonst in ihrer ersten Sprache
  const offen = b.sprachen.includes(SPRACHE) ? SPRACHE : (b.sprachen.includes('en') ? 'en' : b.sprachen[0]);
  const hell = b.ton.map((v) => Math.min(255, Math.round(v * 0.5 + 125)));
  const k = document.createElement('article'); k.className = 'v-karte'; k.setAttribute('aria-roledescription', 'Karte');
  k.style.setProperty('--ton', b.ton.join(',')); k.style.setProperty('--hell', `rgb(${hell.join(',')})`);
  k.innerHTML = `<div class="v-schatten" aria-hidden="true"></div><div class="v-koerper"><div class="v-buehne"><div class="v-bild"></div><div class="v-licht" aria-hidden="true"><i></i></div></div>
    <div class="v-text"><p class="v-kopf"></p><h2 class="v-name" id="v-name-${i}"></h2><p class="v-satz"></p>
    <div class="v-zeile"><a class="v-oeffnen" href="${(b.adressen && b.adressen[offen]) || b.href}">${T.oeffnen} <span aria-hidden="true">›</span></a><span class="v-sprachen"></span></div></div>
    <div class="v-glanz" aria-hidden="true"><i></i></div><div class="v-dunkel" aria-hidden="true"></div></div>`;
  k.querySelector('.v-kopf').textContent = b.kopf; k.querySelector('.v-name').textContent = b.name; k.querySelector('.v-satz').textContent = b.satz;
  k.querySelector('.v-oeffnen').setAttribute('aria-label', T.oeffnenAria(b.name));
  // in welchen Sprachen es die Anwendung gibt; fehlt die gewählte, steht dabei, in welcher sie sich öffnet
  const vs = k.querySelector('.v-sprachen'), hat = b.sprachen.includes(SPRACHE);
  vs.innerHTML = b.sprachen.map((l) => `<span${l === SPRACHE ? ' class="jetzt"' : ''} lang="${l}">${l.toUpperCase()}</span>`).join('');
  if (!hat) { const n = document.createElement('em'); n.textContent = T.nurIn[offen]; vs.prepend(n); vs.querySelectorAll('span').forEach((x) => x.remove()); }
  vs.setAttribute('aria-hidden', 'true');
  // the deleuzian scheme liest seine Sprache aus demselben Speicher, so reist die Wahl mit
  k.querySelector('.v-oeffnen').addEventListener('click', () => { try { localStorage.setItem('kristall.sprache', offen); } catch {} });
  const bild = k.querySelector('.v-bild');
  if (b.schau) bild.append(document.createElement('canvas'));
  else { const im = new Image(); im.alt = ''; im.decoding = 'async'; im.src = b.bild; bild.append(im); }
  if (b.hoch) bild.classList.add('hoch');
  vRaum.append(k);
  return { el: k, koerper: k.querySelector('.v-koerper'), bild, licht: k.querySelector('.v-licht i'), glanz: k.querySelector('.v-glanz'), glanzI: k.querySelector('.v-glanz i'),
    dunkel: k.querySelector('.v-dunkel'), schatten: k.querySelector('.v-schatten'), text: k.querySelector('.v-text'), oeffnen: k.querySelector('.v-oeffnen'),
    film: null, schauStopp: null, flug: 0 };
});
const N = BEREICHE.length;
const vMarken = vitrine.querySelector('.v-marken');
BEREICHE.forEach(() => vMarken.append(document.createElement('i')));
const vz = { pos: 0, ziel: 0, v: 0, auf: 0, aufZiel: 0, t0: 0, lauf: 0, aktiv: -1,
  zug: null, neig: { x: 0, y: 0 }, neigZiel: { x: 0, y: 0 }, kreisel: null, kreiselNull: null };
let vZuletzt = null, vitrineVoll = false;
const umlauf = (d) => ((d % N) + N + N / 2) % N - N / 2;   // kürzester Weg im Kreis, -2.5 … 2.5

function vitrineAuf(i) {
  vZuletzt = document.activeElement;
  vz.pos = vz.ziel = i; vz.v = 0; vz.aufZiel = 1; vz.t0 = performance.now(); vz.aktiv = -1;
  vKarten.forEach((k) => { k.flug = 0; });
  vitrineOffen = true; vitrine.hidden = false; vitrine.classList.add('auf'); document.body.classList.add('vitrine-auf'); spur('Vitrine ' + BEREICHE[i].name);
  cancelAnimationFrame(vz.lauf); vz.lauf = requestAnimationFrame(vitrineBild);
}
function vitrineZu() {
  if (!vitrineOffen || !vz.aufZiel) return;
  vz.aufZiel = 0; vz.t0 = performance.now(); vitrine.classList.remove('auf'); wecken();
  if (vZuletzt && vZuletzt.focus) vZuletzt.focus({ preventScroll: true });
}
function vitrineWeiter(s) { vz.ziel = Math.round(vz.ziel) + s; wecken(); }
// Die Bühne rechnet nur, solange sich etwas bewegt; steht alles, steht auch das Bild (kein Nachzittern der Schrift)
function wecken() { if (vitrineOffen && !vz.lauf) { vz.letzt = 0; vz.lauf = requestAnimationFrame(vitrineBild); } }

function filmAn(k, b) {
  const v = document.createElement('video');
  Object.assign(v, { muted: true, loop: true, playsInline: true, autoplay: true, poster: b.bild, preload: 'auto' });
  v.setAttribute('muted', ''); v.setAttribute('playsinline', ''); v.src = b.film;
  if (b.zoom) { v.style.transform = `scale(${b.zoom})`; v.style.transformOrigin = '50% 12%'; }   // die Bedienknöpfe am unteren Rand des Films bleiben ausserhalb
  v.addEventListener('playing', () => v.classList.add('laeuft'), { once: true });
  k.bild.append(v); k.film = v; v.play().catch(() => {});
}
// die vordere Karte bekommt ihren Film oder ihr bewegtes Schaubild, die übrigen nur ihr Standbild
function aktivSetzen(i) {
  vz.aktiv = i; if (vz.aufZiel) hin(i + 1);   // der Stein hinter dem Glas dreht mit
  [...vMarken.children].forEach((m, j) => m.classList.toggle('jetzt', j === i));
  vKarten.forEach((k, j) => {
    const b = BEREICHE[j], vorn = j === i;
    k.el.classList.toggle('vorn', vorn); k.el.setAttribute('aria-hidden', String(!vorn)); k.oeffnen.tabIndex = vorn ? 0 : -1;
    if (vorn) { vitrine.setAttribute('aria-labelledby', `v-name-${j}`); k.el.classList.remove('glanzlauf'); void k.el.offsetWidth; k.el.classList.add('glanzlauf'); }
    if (b.film && !ruhig) {
      if (vorn && !k.film) {
        // 0.30: während des Flugs aus dem Stein noch kein Film (das Entpacken kostet Bilder), er kommt danach
        const warten = vz.aufZiel ? 1000 - (performance.now() - vz.t0) : 0;
        clearTimeout(k.filmWarten);
        if (warten > 0) k.filmWarten = setTimeout(() => { if (vz.aktiv === j && vitrineOffen && vz.aufZiel && !k.film) filmAn(k, b); }, warten + 30);
        else filmAn(k, b);
      } else if (!vorn && k.film) { const v = k.film; k.film = null; v.classList.remove('laeuft'); setTimeout(() => { v.pause(); v.removeAttribute('src'); v.load(); v.remove(); }, 400); }
    }
    if (b.schau) {
      if (vorn && !k.schauStopp) k.schauStopp = schauZeichnen(k.bild.querySelector('canvas'), b, true);
      else if (!vorn && k.schauStopp) { k.schauStopp(); k.schauStopp = null; }
      // hinten steht ein Standbild
      if (!vorn && !k.schauStopp) schauZeichnen(k.bild.querySelector('canvas'), b, false);
    }
  });
}

// Neigung nur zum Zeiger und beim Ziehen. Die Haltung des Telefons (Kreisel) ist seit 0.26 aus: die Sensoren rauschen,
// die Karte bebte mit (Christian: «flackert und zittert»).

const daempf = (x, k, f) => x * Math.pow(k, f);
function vitrineBild(jetzt) {
  const f = Math.min(3, (jetzt - (vz.letzt || jetzt)) / 16.67 || 1); vz.letzt = jetzt;
  const t = jetzt / 1000, Wv = innerWidth, Hv = innerHeight;
  // Öffnen und Schliessen: jede Karte fliegt mit kleinem Versatz, die vordere zuerst
  const seit = (jetzt - vz.t0) / 1000;
  let alleZu = true;
  vKarten.forEach((k, i) => {
    const d = Math.abs(umlauf(i - vz.pos));
    if (vz.aufZiel) { const u = Math.max(0, Math.min(1, (seit - d * 0.07) / (ruhig ? 0.25 : 0.95))); k.flug = 1 - Math.pow(1 - u, 4); alleZu = false; }
    else { const u = Math.max(0, Math.min(1, (seit - (2.5 - d) * 0.035) / (ruhig ? 0.2 : 0.5))); k.flug = Math.min(k.flug, 1 - u * u * (3 - 2 * u)); if (k.flug > 0.001) alleZu = false; }
  });
  if (!vz.aufZiel && alleZu) {
    vitrineOffen = false; vitrine.hidden = true; vitrineVoll = false; document.body.classList.remove('vitrine-auf');
    vKarten.forEach((k) => { if (k.film) { k.film.pause(); k.film.remove(); k.film = null; } if (k.schauStopp) { k.schauStopp(); k.schauStopp = null; } });
    vz.aktiv = -1; vz.letzt = 0; return;
  }
  // Blättern: gedämpfte Feder zum Ziel, solange kein Finger zieht
  if (!vz.zug) {
    const a = (vz.ziel - vz.pos) * 0.012 - vz.v * 0.16;
    vz.v += a * f * (ruhig ? 3 : 1); vz.pos += vz.v * f;
    if (Math.abs(vz.ziel - vz.pos) < 0.0015 && Math.abs(vz.v) < 0.0015) { vz.pos = vz.ziel; vz.v = 0; }
  }
  const vorn = ((Math.round(vz.pos) % N) + N) % N;
  if (vorn !== vz.aktiv && vz.aufZiel) aktivSetzen(vorn);

  // Neigung zum Zeiger: weich nachgeführt; ohne Zeiger und Kreisel ein ruhiges Atmen
  const atmen = 0;   // 0.26: kein Schweben im Leerlauf mehr, die Tiefe kommt aus Raum, Schatten und Spiegelung
  vz.neig.x += (vz.neigZiel.x - vz.neig.x) * (1 - Math.pow(0.9, f));
  vz.neig.y += (vz.neigZiel.y - vz.neig.y) * (1 - Math.pow(0.9, f));
  const telefonHoch = Wv < 820;
  const breite = vKarten[0].el.offsetWidth || 320;
  const abstand = breite * (telefonHoch ? 0.82 : 0.74);
  // Ursprung des Flugs: der Stein, relativ zur Mitte der Bühne
  const r = vRaum.getBoundingClientRect(), mx = r.left + r.width / 2, my = r.top + r.height / 2;
  const sx = gemJetzt.x - mx, sy = gemJetzt.y - my;
  vKarten.forEach((k, i) => {
    const d = umlauf(i - vz.pos), ad = Math.abs(d), sg = Math.sign(d);
    // im Halbkreis: seitlich versetzt, nach hinten, zur Mitte gedreht
    let x = sg * abstand * Math.pow(ad, 0.82), z = -ad * breite * 0.62 - ad * ad * breite * 0.08;
    let ry = -Math.max(-1.6, Math.min(1.6, d)) * 34, rx = 0, y = ad * 10;
    let sch = 1;
    const vornGrad = Math.max(0, 1 - ad);      // 1 = ganz vorn
    // schweben: jede Karte in eigenem Takt, die vordere am deutlichsten
    const ph = i * 1.7;
    y += atmen * (Math.sin(t * 0.9 + ph) * (5 + 3 * vornGrad));
    rx += atmen * Math.sin(t * 0.63 + ph) * 1.6; ry += atmen * Math.cos(t * 0.51 + ph) * 2.2;
    // Neigung zum Finger nur für die vordere Karte
    rx += -vz.neig.y * 9 * vornGrad; ry += vz.neig.x * 11 * vornGrad;
    // Flug aus dem Stein: von dessen Ort, winzig, gedreht
    const fl = k.flug, gegen = 1 - fl;
    x = x * fl + sx * gegen; y = y * fl + sy * gegen; z = z * fl - 380 * gegen * (1 - fl * 0.4);
    ry += gegen * (sg || 1) * -120 * (1 - fl); rx += gegen * 40; sch = 0.35 + 0.65 * fl;
    const sichtbar = ad < 2.2 ? 1 : Math.max(0, 1 - (ad - 2.2) / 0.3);
    k.el.style.transform = `translate3d(${x.toFixed(1)}px, ${y.toFixed(1)}px, ${z.toFixed(1)}px) rotateY(${ry.toFixed(2)}deg) rotateX(${rx.toFixed(2)}deg) scale(${sch.toFixed(3)})`;
    k.el.style.opacity = (Math.min(1, fl * 1.6) * sichtbar).toFixed(3);
    k.el.style.zIndex = String(100 - Math.round(ad * 10));
    k.el.style.pointerEvents = fl > 0.9 && sichtbar > 0.5 ? 'auto' : 'none';
    k.dunkel.style.opacity = Math.min(0.72, ad * 0.5).toFixed(3);
    // Licht: ein weicher Fleck, der gegen die Neigung über das Glas gleitet; dazu ein irisierendes Band
    const lx = 50 + (ry / 34) * -40 + vz.neig.x * 22, ly = 30 - rx * 3 - vz.neig.y * 18;
    // 0.30: Licht und Glanz sind feste Verläufe, die nur verschoben werden (Transformation statt Neumalen in jedem Bild: flüssig am Handy)
    k.licht.style.transform = `translate3d(${((lx - 50) / 3).toFixed(2)}%, ${((ly - 50) / 3).toFixed(2)}%, 0)`;
    const gpx = Math.max(-20, Math.min(120, 50 + ry * 1.6 + vz.neig.x * 30)), gpy = Math.max(-20, Math.min(120, 50 + rx * 3));
    k.glanzI.style.transform = `translate3d(${(-gpx * 1.6 / 2.6).toFixed(2)}%, ${(-gpy * 1.6 / 2.6).toFixed(2)}%, 0)`;
    k.glanz.style.opacity = (0.35 + Math.min(0.65, Math.abs(ry) / 30 + Math.hypot(vz.neig.x, vz.neig.y) * 0.4)).toFixed(3);
    // Parallaxe: das Bild liegt hinter dem Glas und verschiebt sich gegen die Drehung
    // 0.26: nur noch ein Hauch Parallaxe und keine Vergrösserung, damit das Motiv ganz im Ausschnitt bleibt
    k.bild.style.transform = `translate3d(${(-ry * 0.12).toFixed(1)}px, ${(rx * 0.15).toFixed(1)}px, 0)`;
    // Schatten auf dem Boden: je höher die Karte schwebt, desto weicher und leiser
    const hoehe = Math.sin(t * 0.9 + ph) * atmen;
    k.schatten.style.transform = `translateY(${(26 + hoehe * 4).toFixed(1)}px) scale(${(0.86 - hoehe * 0.04).toFixed(3)}, 1)`;
    k.schatten.style.opacity = ((0.55 - hoehe * 0.12) * fl * Math.max(0, 1 - ad * 0.5)).toFixed(3);
  });
  vitrine.style.setProperty('--auf', (vKarten.reduce((m, k) => Math.max(m, k.flug), 0)).toFixed(3));
  // 0.30 (Christian: Karten «lassen sich nicht wegklicken»): der Zeitstempel des Bildes liegt vor dem Tippen, im ersten Bild
  // nach dem Schliessen stand der Flug also noch auf 1, und die Bühne hielt an. Schliessen läuft jetzt bis zum Ende.
  const fliegt = vKarten.some((k) => k.flug < 1) || !vz.aufZiel;
  // 0.30 (Christian: «ruckelig»): der Stein rechnet nicht mit, solange die Vitrine offen ist oder aufgeht; er ruht unter dem Schleier
  vitrineVoll = vz.aufZiel === 1;
  const bewegt = vz.zug || fliegt || vz.pos !== vz.ziel || Math.abs(vz.v) > 0 || Math.abs(vz.neigZiel.x - vz.neig.x) + Math.abs(vz.neigZiel.y - vz.neig.y) > 0.002;
  if (!bewegt) { vz.neig.x = vz.neigZiel.x; vz.neig.y = vz.neigZiel.y; }
  // 0.29 (Christian: «mal gehts, mal nicht»): Chrome rastert eine Karte in dem Massstab, den sie beim Entstehen ihrer Ebene
  // hatte, und behält ihn, solange sich die Transformation Bild für Bild ändert. Darum: unterwegs will-change (ruhig, ohne
  // Neurastern in jedem Bild), in Ruhe weg damit; die vordere Karte steht dann ganz ohne 3D-Transformation da. Beides zwingt
  // Chrome, sie in voller Grösse neu und scharf zu zeichnen, jedes Mal.
  vitrine.classList.toggle('bewegt', !!bewegt);
  if (!bewegt) {
    const vk = vKarten[((Math.round(vz.pos) % N) + N) % N];
    if (vk.flug >= 1 && Math.abs(vz.neig.x) + Math.abs(vz.neig.y) < 0.01) { vk.el.style.transform = 'none'; vk.bild.style.transform = 'none'; }
  }
  vz.lauf = bewegt ? requestAnimationFrame(vitrineBild) : 0;
}

// Ziehen: die Karten folgen dem Finger; loslassen mit Schwung zur nächsten Karte. Kurzes Tippen auf eine Nachbarkarte holt sie nach vorn.
vRaum.addEventListener('pointerdown', (e) => {
  if (e.button > 0) return;
  wecken();
  vz.zug = { x: e.clientX, y: e.clientY, pos: vz.pos, t: performance.now(), lx: e.clientX, lt: performance.now(), v: 0, bewegt: false, id: e.pointerId };
});
addEventListener('pointermove', (e) => {
  if (vitrineOffen && e.pointerType === 'mouse' && !vz.zug) {
    // Maus über der vorderen Karte: Neigung zum Zeiger
    const k = vKarten[vz.aktiv]; if (!k) return;
    const r = k.koerper.getBoundingClientRect();
    const nx = (e.clientX - (r.left + r.width / 2)) / (r.width / 2), ny = (e.clientY - (r.top + r.height / 2)) / (r.height / 2);
    const drin = Math.abs(nx) < 1.25 && Math.abs(ny) < 1.25;
    vz.neigZiel.x = drin ? Math.max(-1, Math.min(1, nx)) : 0; vz.neigZiel.y = drin ? Math.max(-1, Math.min(1, ny)) : 0; wecken();
  }
  const z = vz.zug; if (!z || z.id !== e.pointerId) return;
  const dx = e.clientX - z.x, dy = e.clientY - z.y;
  // 0.30: nach unten wischen schliesst; die Karten geben dem Finger ein wenig nach
  if (!z.bewegt && !z.runter && dy > 10 && dy > Math.abs(dx) * 1.2) { z.runter = true; try { vRaum.setPointerCapture(e.pointerId); } catch {} }
  if (z.runter) { vRaum.style.transform = `translate3d(0, ${(Math.max(0, dy) * 0.35).toFixed(1)}px, 0)`; vRaum.style.opacity = String(Math.max(0.4, 1 - dy / 600)); return; }
  if (!z.bewegt && Math.abs(dx) > 8) { z.bewegt = true; try { vRaum.setPointerCapture(e.pointerId); } catch {} }
  if (!z.bewegt) return;
  const breite = vKarten[0].el.offsetWidth || 320;
  vz.pos = z.pos - dx / (breite * 0.9);
  const jetzt = performance.now(), dt = Math.max(1, jetzt - z.lt);
  z.v = z.v * 0.6 + (-(e.clientX - z.lx) / (breite * 0.9) / dt * 16.67) * 0.4; z.lx = e.clientX; z.lt = jetzt;
  // beim Ziehen neigt sich die vordere Karte mit
  vz.neigZiel.x = Math.max(-1, Math.min(1, -z.v * 6));
});
const vLos = (e) => {
  const z = vz.zug; if (!z || z.id !== e.pointerId) return;
  vz.zug = null; vz.neigZiel.x = 0; wecken();
  if (z.runter) {
    vRaum.style.transition = 'transform 0.35s ease, opacity 0.35s ease'; vRaum.style.transform = ''; vRaum.style.opacity = '';
    setTimeout(() => { vRaum.style.transition = ''; }, 380);
    if (e.clientY - z.y > 70) vitrineZu();
    return;
  }
  if (z.bewegt) {
    vz.v = z.v; vz.ziel = Math.round(vz.pos + z.v * 9);
    vz.ziel = Math.max(Math.round(z.pos) - 2, Math.min(Math.round(z.pos) + 2, vz.ziel));
    return;
  }
  // Tippen: auf eine Nachbarkarte → nach vorn; neben die Karten → schliessen
  const karte = e.target.closest && e.target.closest('.v-karte');
  if (!karte) { vitrineZu(); return; }
  const i = vKarten.findIndex((k) => k.el === karte);
  if (i !== vz.aktiv) { vz.ziel = Math.round(vz.pos) + Math.round(umlauf(i - vz.pos)); e.preventDefault(); wecken(); }
};
addEventListener('pointerup', vLos);
addEventListener('pointercancel', (e) => { if (vz.zug && vz.zug.id === e.pointerId) { vz.zug = null; vz.ziel = Math.round(vz.pos); wecken(); } });
// ein Klick, der aus einem Zug entstand, öffnet nichts
vRaum.addEventListener('click', (e) => {
  const karte = e.target.closest('.v-karte'), i = vKarten.findIndex((k) => k.el === karte);
  if (i >= 0 && i !== vz.aktiv) e.preventDefault();
}, true);
vRaum.addEventListener('mouseleave', () => { vz.neigZiel.x = 0; vz.neigZiel.y = 0; wecken(); });
vitrine.querySelector('.v-zu').addEventListener('click', vitrineZu);
addEventListener('keydown', (e) => {
  if (!vitrineOffen) return;
  if (e.key === 'Escape') { e.preventDefault(); vitrineZu(); }
  else if (e.key === 'ArrowRight') { e.preventDefault(); vitrineWeiter(1); }
  else if (e.key === 'ArrowLeft') { e.preventDefault(); vitrineWeiter(-1); }
});
// Mausrad und Touchpad blättern seitlich
let vRad = 0, vRadSperre = 0;
vitrine.addEventListener('wheel', (e) => {
  e.preventDefault(); const jetzt = performance.now(); if (jetzt < vRadSperre) return;
  vRad += Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY;
  if (Math.abs(vRad) > 50) { vitrineWeiter(Math.sign(vRad)); vRad = 0; vRadSperre = jetzt + 450; }
}, { passive: false });
flaechen.forEach((el, i) => el.addEventListener('click', (e) => { e.preventDefault(); vitrineAuf(i); }));

// ---------- Schaubilder, die sich bewegen (0.24) ----------
// Das Dritte Rad: die drei Ringe der Anwendung (Zeit, Form, Farbe, aus ihrem eigenen SVG abgenommen) drehen gegeneinander,
// wie in der Anwendung selbst, auf dunklem Grund mit warmem Schein und einem Lichtrand.
// laufend = false zeichnet ein Standbild, sobald die Bilder da sind.
const schauBilder = new Map();
function schauBild(src) {
  if (!schauBilder.has(src)) { const im = new Image(); im.decoding = 'async'; im.src = src; schauBilder.set(src, im); }
  return schauBilder.get(src);
}
const SCHAU = {
  rad: { bilder: ['zeit', 'form', 'farbe', 'kern'].map((n) => `vorschau/rad-${n}.png`), malen: radMalen }
};
function schauZeichnen(c, b, laufend) {
  const art = SCHAU[b.schau], bilder = art.bilder.map(schauBild), x = c.getContext('2d');
  const dpr = Math.min(2, devicePixelRatio || 1), t0 = performance.now() - 4000;
  let lauf = 0, an = true;
  const schritt = () => {
    if (!an) return;
    const w = c.clientWidth, h = c.clientHeight;
    const fertig = w > 0 && bilder.every((im) => im.complete && im.naturalWidth);
    if (fertig) {
      if (c.width !== Math.round(w * dpr) || c.height !== Math.round(h * dpr)) { c.width = Math.round(w * dpr); c.height = Math.round(h * dpr); }
      x.setTransform(dpr, 0, 0, dpr, 0, 0);
      art.malen(x, w, h, ruhig ? 6 : (performance.now() - t0) / 1000, bilder, b.ton);
      if (!laufend || ruhig) { an = false; return; }
    }
    lauf = requestAnimationFrame(schritt);
  };
  lauf = requestAnimationFrame(schritt);
  return () => { an = false; cancelAnimationFrame(lauf); };
}
function grundMalenSchau(x, w, h, ton, mitte) {
  x.fillStyle = '#0b0a1a'; x.fillRect(0, 0, w, h);
  const g = x.createRadialGradient(mitte[0], mitte[1], 0, mitte[0], mitte[1], Math.max(w, h) * 0.62);
  g.addColorStop(0, `rgba(${ton.join(',')},0.24)`); g.addColorStop(0.45, `rgba(${ton.join(',')},0.07)`); g.addColorStop(1, 'rgba(11,10,26,0)');
  x.fillStyle = g; x.fillRect(0, 0, w, h);
}
function radMalen(x, w, h, t, [zeit, form, farbe, kern], ton) {
  const cx = w / 2, cy = h * 0.49, R = Math.min(h * 0.74, w * 0.46) / 2;   // mit Luft rundum (Christian: «passt nicht ganz in den Ausschnitt»)
  grundMalenSchau(x, w, h, ton, [cx, cy]);
  // Schatten unter dem schwebenden Rad
  x.save(); x.translate(cx, cy + R * 1.04); x.scale(1, 0.12);
  const s = x.createRadialGradient(0, 0, 0, 0, 0, R * 0.9); s.addColorStop(0, 'rgba(0,0,0,0.55)'); s.addColorStop(1, 'rgba(0,0,0,0)');
  x.fillStyle = s; x.beginPath(); x.arc(0, 0, R * 0.9, 0, Math.PI * 2); x.fill(); x.restore();
  // die drei Ringe drehen gegeneinander (die Bilder sind 720 px, der Rand des Zeitrings liegt bei 0.96 der halben Breite)
  const k = R / 0.96, ring = (im, w0) => { x.save(); x.translate(cx, cy); x.rotate(w0); x.drawImage(im, -k, -k, k * 2, k * 2); x.restore(); };
  ring(zeit, t * 0.05); ring(form, -t * 0.08 + 0.3); ring(farbe, t * 0.13 - 0.2); ring(kern, 0);
  // Lichtrand: ein feiner Bogen, der langsam um das Rad wandert, und ein Glanzfleck oben links
  x.save(); x.translate(cx, cy);
  const a0 = t * 0.35;
  for (const [breite, alpha] of [[3.5, 0.08], [1, 0.55]]) {
    x.lineWidth = breite; x.strokeStyle = `rgba(255,236,220,${alpha})`;
    x.beginPath(); x.arc(0, 0, R * 0.995, a0, a0 + 0.9); x.stroke();
  }
  x.lineWidth = 0.75; x.strokeStyle = `rgba(${ton.join(',')},0.5)`; x.beginPath(); x.arc(0, 0, R * 0.995, 0, Math.PI * 2); x.stroke();
  x.globalCompositeOperation = 'screen';
  const gl = x.createRadialGradient(-R * 0.42, -R * 0.5, 0, -R * 0.42, -R * 0.5, R * 0.9);
  gl.addColorStop(0, 'rgba(255,255,255,0.13)'); gl.addColorStop(1, 'rgba(255,255,255,0)');
  x.fillStyle = gl; x.beginPath(); x.arc(0, 0, R, 0, Math.PI * 2); x.fill();
  x.restore();
}
let praes = 0, glasK = 1;
// Mit Grafikkarte rechnet der Shader Licht und Glas (0.7, Christian: «Licht wird Glas»); die HTML-Flächen bleiben
// unsichtbar darüber liegen, damit man tippen und mit der Tastatur hinkommt.
const glasZ = { praes: 0, strahl: 0, ziel: [0, 0, 0], rect: [0, 0, 0, 0], funkel: 0 };
const schriftTex = [];
function schriftBauen() {
  namenEinpassen();
  flaechen.forEach((el, i) => {
    const pw = el.offsetWidth, ph = el.offsetHeight;
    const c = document.createElement('canvas'); c.width = Math.round(pw * D); c.height = Math.round(ph * D);
    const x = c.getContext('2d'); x.setTransform(D, 0, 0, D, 0, 0); x.textAlign = 'center';
    const hell = getComputedStyle(el).getPropertyValue('--hell') || '#b7b0ff';
    for (const kind of el.children) {
      const st = getComputedStyle(kind), fs = parseFloat(st.fontSize), lh = parseFloat(st.lineHeight) || fs * 1.3;
      x.font = `${st.fontWeight} ${fs}px ${SCHRIFT}`; if ('letterSpacing' in x) x.letterSpacing = st.letterSpacing === 'normal' ? '0px' : st.letterSpacing;
      x.fillStyle = kind.classList.contains('p-name') ? '#f7f5fc' : kind.classList.contains('p-satz') ? 'rgba(218,214,232,0.9)' : hell;
      const zeilen = kind.classList.contains('p-satz') ? zeilenUmbruch(x, kind.textContent, kind.offsetWidth + 2) : [kind.textContent];
      let y = kind.offsetTop + (lh - fs) / 2 + fs * 0.8;
      for (const z of zeilen) { x.fillText(z, pw / 2, y); y += lh; }
    }
    schriftTex[i] = texAus(c, schriftTex[i]);
  });
}
function projizierenGlas(zustand, soll, f, mu, gx, gy, rr) {
  // 0.9: keine Strahlen, keine Scheibe. Das Werk zeigt sich im Stein; darunter stehen nur Name, Satz und Verweis.
  if (soll) glasK = zustand;
  const ps = sanft(praes), el = flaechen[glasK - 1];
  const pw = el.offsetWidth, ph = el.offsetHeight, ruheY = Math.max(gy + rr * 1.3 + ph / 2, H * 0.618);   // goldener Schnitt: Stein auf 0.382, Name auf 0.618
  glasZ.strahl = 0; glasZ.praes = 0;
  flaechen.forEach((e, i) => {
    const da = i + 1 === glasK ? ps * Math.max(0, (mu - 0.5) / 0.5) : 0, aktiv = da > 0.95;
    e.style.opacity = String(da); e.style.pointerEvents = aktiv ? 'auto' : 'none'; e.tabIndex = aktiv ? 0 : -1; e.setAttribute('aria-hidden', String(!aktiv));
    if (da > 0) e.style.transform = `translate(${gx - pw / 2}px, ${ruheY - ph / 2 + (1 - da) * 10}px)`;
  });
  strahl.style.opacity = '0';
}
function projizieren(zustand, ruht, f, mu, gx, gy, rr) {
  const soll = ruht && zustand > 0 && mu > 0.6 ? 1 : 0;
  // langsam verdichten, rasch zurück, sobald der Stein sich wieder dreht
  praes += (soll - praes) * (1 - Math.pow(soll ? (gl ? 0.972 : 0.95) : 0.85, f));
  return projizierenGlas(zustand, soll, f, mu, gx, gy, rr);
  const aus = Math.max(0, (mu - 0.25) / 0.75);           // wie weit die Flächen schon aus dem Stein getreten sind
  const pw = vorlage.offsetWidth, ph = vorlage.offsetHeight;
  const ruheY = gy + rr * 1.35 + 30 + ph / 2;
  const R = Math.min(W * 0.46, 300), ps = sanft(praes);
  let kegel = null;
  for (let i = 0; i < flaechen.length; i++) {
    const el = flaechen[i];
    // Winkel der Fläche um die Achse des Steins: 0 = vorn
    let a = (i + 1) * SCHRITT - phi;
    a = Math.atan2(Math.sin(a), Math.cos(a));
    const vorn = Math.cos(a), sichtbar = Math.max(0, vorn);
    const vor = i + 1 === zustand ? ps : 0;                // diese Fläche präsentiert sich gerade
    const e = sanft(aus);
    if (e < 0.004 || sichtbar < 0.02) { el.style.opacity = '0'; el.style.pointerEvents = 'none'; el.tabIndex = -1; continue; }
    // unterwegs: auf dem Kreis um den Stein, leicht nach unten geneigt, kleiner; präsentiert: flach und ganz da
    const r = R * e * (1 - vor * 0.6);
    const cy = gy + (ruheY - gy) * e * (0.8 + 0.2 * vor) - (1 - vorn) * rr * 0.5;
    const s = (0.1 + 0.62 * e) + 0.28 * vor;
    const rx = (1 - e) * 60 + 14 * (1 - vor) * e;
    el.style.transform = `translate(${gx - pw / 2}px, ${cy - ph / 2}px) perspective(1000px) translateZ(${-r}px) rotateY(${a * 180 / Math.PI}deg) translateZ(${r}px) rotateX(${rx}deg) scale(${s})`;
    el.style.zIndex = String(Math.round(vorn * 10) + 10);
    el.style.opacity = String(Math.min(1, Math.pow(sichtbar, 1.8) * e * (0.6 + 0.4 * vor)));
    // der Lichtkegel folgt der Fläche, die am weitesten vorn steht
    const tiefe = 1000 / (1000 - (r * vorn - r)), x = gx + r * Math.sin(a) * tiefe;
    const st = Math.pow(sichtbar, 3) * e * (0.35 + 0.65 * vor);
    if (!kegel || st > kegel.st) kegel = { st, x, oben: cy - ph * s / 2, unten: cy + ph * s / 2 * Math.cos(rx * Math.PI / 180), halb: pw * s / 2 * Math.abs(vorn) * tiefe };
    const aktiv = vor > 0.95 && mu > 0.95;
    el.style.pointerEvents = aktiv ? 'auto' : 'none'; el.tabIndex = aktiv ? 0 : -1; el.setAttribute('aria-hidden', String(!aktiv));
  }
  // Lichtkegel vom Stein zur vordersten Fläche
  if (!kegel || kegel.st < 0.01) { strahl.style.opacity = '0'; return; }
  const { x, oben, unten, halb } = kegel;
  strahlKern.style.clipPath = `polygon(${gx - rr * 0.35}px ${gy}px, ${gx + rr * 0.35}px ${gy}px, ${x + halb}px ${oben + 6}px, ${x + halb * 0.96}px ${unten}px, ${x - halb * 0.96}px ${unten}px, ${x - halb}px ${oben + 6}px)`;
  strahl.style.opacity = String(kegel.st * 0.8);
}

// ---------- Auftakt ----------
// 0 – 1.1 s: der Stein allein, gross und drehend; bis 2.5 s gleitet er an seinen Platz, das Licht legt die Schrift frei.
const AUFTAKT = ruhig || new URLSearchParams(location.search).has('direkt') ? 0 : 2.6;
let start = -1;
const sanft = (x) => { x = Math.min(1, Math.max(0, x)); return x * x * (3 - 2 * x); };
const ausrollen = (x) => 1 - Math.pow(1 - Math.min(1, Math.max(0, x)), 3);

// ---------- Grösse ----------
let gebautFuer = '';
function groesse() {
  W = innerWidth; H = innerHeight;
  D = Math.min(devicePixelRatio || 1, MAX_DPR) * aufloesung;
  const ziel = gl ? leinwand : flachLeinwand();
  ziel.width = Math.round(W * D); ziel.height = Math.round(H * D);
  const schl = `${W}x${H}@${D}`;
  if (schriftDa && schl !== gebautFuer) { gebautFuer = schl; seitenBauen(); }
}
let schriftDa = false;
addEventListener('resize', () => { groesse(); });

// Tempo: ruckelt es, rechnet die Seite mit weniger Bildpunkten
let messung = [], letzteAnpassung = 0;
function tempoMessen(ms, dt) {
  if (document.hidden) { messung = []; return; }
  messung.push(dt);
  if (messung.length < 40 || ms - letzteAnpassung < 2000) return;
  messung.sort((a, b) => a - b); const mitte = messung[20]; messung = [];
  if (mitte > 24 && aufloesung > 0.55) { aufloesung *= 0.8; letzteAnpassung = ms; groesse(); spur('Auflösung ' + aufloesung.toFixed(2)); }
}

// ---------- Lauf ----------
let anlauf = [];
let letzteMs = 0, ersterLauf = true, zustandGezeigt = -1, blitz = 0, gelandet = false, kreisel = 0, stern = 0;
function bild(ms) {
  requestAnimationFrame(bild);
  if (document.hidden || !lay) return;
  if (vitrineVoll) { letzteMs = ms; return; }   // die Vitrine deckt den Stein: nicht rechnen, nichts flackert dahinter
  if (start < 0) start = ms;
  const t = (ms - start) / 1000;
  const dtMs = ms - (letzteMs || ms - 16.7), f = Math.min(4, Math.max(0.25, dtMs / 16.7)); letzteMs = ms;
  tempoMessen(ms, dtMs);

  // Bewegung
  if (!gezogen) {
    if (ziel != null) {
      // gedämpfte Feder zum Ziel, bewusst langsam: rund anderthalb Sekunden je Bereich
      const a = (ziel - phi) * 0.0055 - omega * 0.14;
      omega += a * f; phi += omega * f;
      if (Math.abs(ziel - phi) < 0.0004 && Math.abs(omega) < 0.0004) { phi = ziel; omega = 0; }
    } else if (Math.abs(omega) > 0.0005) { phi += omega * f; omega *= Math.pow(0.95, f); }
  }
  const p = phi / SCHRITT, a = Math.floor(p), fr = p - a;
  const A = ((a % ZUSTAENDE) + ZUSTAENDE) % ZUSTAENDE, B = (A + 1) % ZUSTAENDE;
  if (ausMenu && !menuAuf && menu < 0.02 && Math.abs(fr - Math.round(fr)) < 0.001 && omega === 0) ausMenu = false;
  const wirbel = ausMenu ? 0 : Math.min(1, Math.sin(Math.PI * fr) * 1.1 + Math.min(0.5, Math.abs(omega) * 3));

  // Auftakt
  const ta = AUFTAKT ? t / AUFTAKT : 1;
  const zeigen = AUFTAKT ? sanft((t - 0.9) / 1.7) : 1;
  const flug = AUFTAKT ? ausrollen((t - 0.9) / 1.5) : 1;
  if (!gelandet && flug >= 1) { gelandet = true; blitz = 1; document.body.classList.add('bereit'); }
  blitz *= Math.pow(0.93, f);
  // 0.19: auf dem i ruhend dreht der Stein langsam um sich (eine Umdrehung in rund 22 s, Christian: «ein wenig schneller») und strahlt fein aus
  const amI = A === 0 && fr < 0.02 && !gezogen && !frei.an && menu < 0.02 && gelandet;
  stern += ((amI && !ruhig ? 1 : 0) - stern) * (1 - Math.pow(amI ? 0.985 : 0.9, f));
  kreisel += (f / 60) * 0.28 * (ruhig ? 0 : Math.max(stern, 1 - sanft(menu)));

  const ease = (x) => x * x * (3 - 2 * x), e = ease(fr);
  const gA = lay.saetze[A].gem, gB = lay.saetze[B].gem;
  const gr = { x: gA.x + (gB.x - gA.x) * e, y: gA.y + (gB.y - gA.y) * e, r: gA.r + (gB.r - gA.r) * e }, grossR = Math.min(W, H) * 0.11;
  // Menü: der Stein steigt gross über die Mitte und kehrt beim zweiten Tippen an seinen Platz zurück
  // langsam gleiten (Christian: «langsamer in seine Position»)
  menu += ((menuAuf ? 1 : 0) - menu) * (1 - Math.pow(0.965, f));
  const mu = sanft(menu), mg = lay.menuGem;
  const gx0 = W / 2 + (gr.x - W / 2) * flug, gy0 = H * 0.47 + (gr.y - H * 0.47) * flug - Math.sin(Math.PI * flug) * H * 0.03 - Math.sin(Math.PI * fr) * lay.fs * 0.35;
  const rr0 = grossR + (gr.r - grossR) * flug;
  const gx = gx0 + (mg.x - gx0) * mu, gy = gy0 + (mg.y - gy0) * mu - Math.sin(Math.PI * mu) * lay.fs * 0.6, rr = rr0 + (mg.r - rr0) * mu;
  gemJetzt.x = gx; gemJetzt.y = gy; gemJetzt.r = rr;
  steinKnopf.style.transform = `translate(${gx - 28}px, ${gy - 28}px)`;
  // Drehung: die Drehung um die Achse zeigt die Bereiche; im Auftakt dreht er sich frei aus
  const auftaktDreh = AUFTAKT ? (1 - ausrollen(ta)) * 5.5 : 0;
  // im offenen Menü dreht der Stein nicht von selbst: die Flächen um ihn stehen still, bis man ihn dreht
  const atem = ruhig ? 0 : 1 - mu * 0.7;
  // frei gedreht: Schwung klingt aus; nach einer Weile Ruhe kehrt er in die nächste gleichwertige Lage zurück (achtzählig)
  if (!frei.an) {
    frei.g += frei.vg * f; frei.n += frei.vn * f;
    const daempf = Math.pow(0.955, f); frei.vg *= daempf; frei.vn *= daempf;
    if (performance.now() - frei.los > 2600 && Math.abs(frei.vg) + Math.abs(frei.vn) < 0.004) {
      const z = (1 - Math.pow(0.975, f)), A8 = Math.PI / 4, V = Math.PI * 2;
      frei.g += (Math.round(frei.g / A8) * A8 - frei.g) * z; frei.n += (Math.round(frei.n / V) * V - frei.n) * z;
    }
  }
  const gier = -phi + auftaktDreh + atem * 0.18 * Math.sin(t * 0.45) + frei.g + kreisel;
  // im Menü kippt der Stein zur Betrachterin: man schaut von oben durch seine Tafel
  const neig = 0.3 + atem * 0.08 * Math.sin(t * 0.31 + 1.0) + (1 - flug) * 0.35 + mu * 0.95 + frei.n;
  const roll = atem * 0.05 * Math.sin(t * 0.23);
  ebenenDrehen(gier, neig, roll);

  // Menü und Verweis
  const zustand = zuZustand(phi);
  const ruht = !gezogen && Math.abs(fr - Math.round(fr)) < 0.03 && Math.abs(omega) < 0.01;
  projizieren(zustand, !gezogen && Math.abs(fr - Math.round(fr)) < 0.015 && Math.abs(omega) < 0.003, f, mu, gx, gy, rr);
  if (zustand !== zustandGezeigt) {
    zustandGezeigt = zustand;
    knoepfe.forEach((k, i) => k.setAttribute('aria-current', String(i + 1 === zustand)));
    if (zustand) { const b = BEREICHE[zustand - 1]; mehr.href = b.href; mehr.setAttribute('aria-label', `${b.name}: ${T.mehr}`); }
  }
  const zeigeMehr = zustand > 0 && ruht && menu < 0.05;
  if (zeigeMehr !== mehr.classList.contains('da')) {
    mehr.classList.toggle('da', zeigeMehr); mehr.tabIndex = zeigeMehr ? 0 : -1;
    if (zeigeMehr) { const o = mehrOrt[zustand]; mehr.style.setProperty('--ton', `rgb(${o.ton.join(',')})`); mehr.style.left = '50%'; mehr.style.top = (o.y - 14) + 'px'; mehr.style.translate = '-50% 0'; }
  }

  // Läuft die volle Fassung zu langsam (Software-Grafik, die sich nicht zu erkennen gab), zur flachen wechseln
  if (gl && !frage.has('gl')) {
    anlauf.push(dtMs);
    if (anlauf.length === 24) { anlauf.sort((x, y) => x - y); if (anlauf[12] > 70) { spur('zu langsam: flach'); gl = null; gebautFuer = ''; groesse(); } }
  }
  if (!gl) { flachZeichnen(A, B, fr, zeigen, gx, gy, rr, gier, neig, roll, blitz, sanft(menu)); if (ersterLauf) { ersterLauf = false; spur('✓ läuft'); } return; }

  // Zeichnen
  const Bw = leinwand.width, Bh = leinwand.height;
  const sz = zielBauen('szene', Bw, Bh);
  gl.bindFramebuffer(gl.FRAMEBUFFER, sz.fb); gl.viewport(0, 0, Bw, Bh);
  const { p: P, ort } = haupt; gl.useProgram(P);
  gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, ausMenu && A ? leerTex : seitenTex[A]); gl.uniform1i(ort.uA, 0);
  gl.activeTexture(gl.TEXTURE1); gl.bindTexture(gl.TEXTURE_2D, ausMenu && B ? leerTex : seitenTex[B]); gl.uniform1i(ort.uB, 1);
  gl.activeTexture(gl.TEXTURE2); gl.bindTexture(gl.TEXTURE_2D, leerTex); gl.uniform1i(ort.uLeer, 2);
  gl.uniform3fv(ort.uN, ebenenW); gl.uniform1fv(ort.uR, abstandW); gl.uniform1i(ort.uK, K);
  gl.uniform1f(ort.uF, fr); gl.uniform1f(ort.uWirbel, ruhig ? Math.min(wirbel, 0.4) : wirbel);
  gl.uniform1f(ort.uZeigen, zeigen); gl.uniform1f(ort.uBlitz, ruhig ? 0 : blitz); gl.uniform1f(ort.uStern, stern); gl.uniform1f(ort.uZeit, t); gl.uniform1f(ort.uKreisel, kreisel);
  gl.uniform2f(ort.uGem, gx * D, (H - gy) * D); gl.uniform1f(ort.uGemR, rr * D);
  gl.uniform2f(ort.uFeld, gx * D, (H - gy) * D); gl.uniform1f(ort.uGross, Math.max(W, H) * 0.34 * D); gl.uniform1f(ort.uDimm, sanft(menu)); gl.uniform1f(ort.uWeich, ausMenu ? 1 : 0);
  gl.uniform2f(ort.uAufl, Bw, Bh); gl.uniform1f(ort.uRad, huelle * 1.03); gl.uniform1f(ort.uT, t % 100); gl.uniform1f(ort.uFeuer, 2.3);
  const tonG = BEREICHE[glasK - 1].ton;
  gl.activeTexture(gl.TEXTURE3); gl.bindTexture(gl.TEXTURE_2D, schriftTex[glasK - 1]); gl.uniform1i(ort.uSchrift, 3);
  gl.uniform4f(ort.uScheibe, ...glasZ.rect); gl.uniform1f(ort.uPraes, glasZ.praes); gl.uniform1f(ort.uStrahl, ruhig ? glasZ.strahl * 0.6 : glasZ.strahl);
  gl.uniform3f(ort.uZiel, ...glasZ.ziel); gl.uniform1f(ort.uFunkel, gier); gl.uniform1f(ort.uPx, D);
  gl.uniform3f(ort.uGlasTon, tonG[0] / 255, tonG[1] / 255, tonG[2] / 255);
  gl.activeTexture(gl.TEXTURE4); gl.bindTexture(gl.TEXTURE_2D, werkTex); gl.uniform1i(ort.uWerke, 4);
  gl.uniform2f(ort.uWerk, A - 1, B - 1); gl.uniform1f(ort.uWerkF, fr * fr * (3 - 2 * fr)); gl.uniform1f(ort.uMenu, mu);
  gl.uniform1f(ort.uFenster, FENSTER); gl.uniform1i(ort.uTafel, FOTOS ? TAFEL : -1);
  gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  nachbearbeiten(t, sz);

  if (ersterLauf) { ersterLauf = false; spur('✓ läuft'); }
}
function nachbearbeiten(t, sz) {
  const Bw = leinwand.width, Bh = leinwand.height, b4 = Math.max(1, Math.round(Bw / 4)), h4 = Math.max(1, Math.round(Bh / 4));
  const gA = zielBauen('glowA', b4, h4), gB = zielBauen('glowB', b4, h4);
  gl.activeTexture(gl.TEXTURE0);
  gl.bindFramebuffer(gl.FRAMEBUFFER, gA.fb); gl.viewport(0, 0, b4, h4);
  gl.useProgram(hell.p); gl.bindTexture(gl.TEXTURE_2D, sz.tex); gl.uniform1i(hell.ort.uQ, 0); gl.uniform2f(hell.ort.uPx, 1.5 / Bw, 1.5 / Bh);
  gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  gl.useProgram(weich.p); gl.uniform1i(weich.ort.uQ, 0);
  for (let i = 0; i < 2; i++) {
    gl.bindFramebuffer(gl.FRAMEBUFFER, gB.fb); gl.bindTexture(gl.TEXTURE_2D, gA.tex); gl.uniform2f(weich.ort.uRichtung, (1.4 + i) / b4, 0); gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    gl.bindFramebuffer(gl.FRAMEBUFFER, gA.fb); gl.bindTexture(gl.TEXTURE_2D, gB.tex); gl.uniform2f(weich.ort.uRichtung, 0, (1.4 + i) / h4); gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  }
  gl.bindFramebuffer(gl.FRAMEBUFFER, null); gl.viewport(0, 0, Bw, Bh);
  gl.useProgram(zusammen.p);
  gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, sz.tex); gl.uniform1i(zusammen.ort.uSzene, 0);
  gl.activeTexture(gl.TEXTURE1); gl.bindTexture(gl.TEXTURE_2D, gA.tex); gl.uniform1i(zusammen.ort.uGlow, 1);
  gl.uniform1f(zusammen.ort.uGlowStaerke, 1.35 - sanft(menu) * 0.4); gl.uniform1f(zusammen.ort.uT, t % 100);
  gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  gl.activeTexture(gl.TEXTURE0);
}

// ---------- Flache Fassung (Canvas 2D) ----------
// Derselbe Satz, dieselbe Drehung; der Brillant als Körper aus 64 Facetten, geschattet nach drei Lichtern.
function flachLeinwand() {
  if (!flach) {
    flach = document.createElement('canvas'); flach.id = 'flach'; flach.setAttribute('aria-hidden', 'true');
    flach.className = 'flach';
    leinwand.after(flach); leinwand.hidden = true;
    for (const [typ, fn] of zeiger) flach.addEventListener(typ, fn);
    fctx = flach.getContext('2d', { alpha: false });
  }
  return flach;
}
// Körper des Brillanten: Rundiste (16), Tafel (8), Kalette; Masse wie in schliffe.js (Tafel 57 %, Pavillon 40.75°)
const KOERPER = (() => {
  const g = [], t = [], TY = 0.3 * 1.3, KY = -0.86 * 1.3;
  for (let i = 0; i < 16; i++) { const a = (i / 16) * Math.PI * 2; g.push([Math.cos(a), 0, Math.sin(a)]); }
  for (let i = 0; i < 8; i++) { const a = ((i + 0.5) / 8) * Math.PI * 2; t.push([Math.cos(a) * 0.57, TY, Math.sin(a) * 0.57]); }
  const kal = [0, KY, 0], fl = [];
  for (let k = 0; k < 8; k++) {
    const g0 = g[2 * k], g1 = g[2 * k + 1], g2 = g[(2 * k + 2) % 16], t0 = t[(k + 7) % 8], t1 = t[k];
    fl.push([g0, g1, t1, t0], [g1, g2, t1]);              // Krone: Haupt- und Rundistenfacetten
    fl.push([g1, t[(k + 1) % 8], t1]);                      // Sterne
  }
  for (let i = 0; i < 16; i++) fl.push([g[(i + 1) % 16], g[i], kal]);   // Pavillon
  fl.push([...t].reverse());                               // Tafel
  return fl;
})();
function flachStein(c, x, y, r, gier, neig, roll, glanz, fenster = null) {
  const cg = Math.cos(gier), sg = Math.sin(gier), cn = Math.cos(neig), sn = Math.sin(neig), cr = Math.cos(roll), sr = Math.sin(roll);
  const dreh = ([px, py, pz]) => {
    const x1 = cg * px + sg * pz, z1 = -sg * px + cg * pz;
    const y2 = cn * py - sn * z1, z2 = sn * py + cn * z1;
    return [cr * x1 - sr * y2, sr * x1 + cr * y2, z2];
  };
  const L = [[0.53, 0.68, 0.5], [-0.62, 0.55, 0.56], [0.1, -0.35, 0.93]];
  const flaechen = [];
  KOERPER.forEach((f, i) => {
    const p = f.map(dreh);
    const u = p[1].map((v, j) => v - p[0][j]), w = p[2].map((v, j) => v - p[0][j]);
    let n = [u[1] * w[2] - u[2] * w[1], u[2] * w[0] - u[0] * w[2], u[0] * w[1] - u[1] * w[0]];
    const l = Math.hypot(...n) || 1; n = n.map((v) => v / l);
    // Aussenseite zeigt von der Mitte weg
    const m = p.reduce((s, q) => [s[0] + q[0] / p.length, s[1] + q[1] / p.length, s[2] + q[2] / p.length], [0, 0, 0]);
    if (n[0] * m[0] + n[1] * (m[1] + 0.2) + n[2] * m[2] < 0) n = n.map((v) => -v);
    if (n[2] <= 0) return;
    const z = m[2];
    // Licht: Spiegelung der drei Fenster, dazu das Funkeln je Facette in den Farben des Spektrums
    const rf = [2 * n[2] * n[0], 2 * n[2] * n[1], 2 * n[2] * n[2] - 1];
    let hell = 0.1 + 0.25 * n[2];
    for (const q of L) hell += Math.pow(Math.max(0, rf[0] * q[0] + rf[1] * q[1] + rf[2] * q[2]), 18) * 1.1;
    const funke = Math.pow(Math.max(0, Math.sin(gier * 3 + i * 1.7)), 12);
    flaechen.push({ p, z, i, tafel: i === KOERPER.length - 1, hell: Math.min(1.4, hell), funke, ton: (i * 47 + gier * 180) % 360 });
  });
  flaechen.sort((a, b) => a.z - b.z);
  c.save(); c.lineJoin = 'round';
  for (const f of flaechen) {
    c.beginPath(); f.p.forEach((q, j) => (j ? c.lineTo(x + q[0] * r, y - q[1] * r) : c.moveTo(x + q[0] * r, y - q[1] * r))); c.closePath();
    const v = Math.round(Math.min(255, 40 + f.hell * 200));
    c.fillStyle = `rgb(${Math.round(v * 0.92)},${Math.round(v * 0.93)},${v})`; c.fill();
    if (f.funke > 0.02) { c.fillStyle = `hsla(${f.ton},90%,70%,${f.funke * 0.55})`; c.fill(); }
    // Facette als Fenster (0.9, auch flach): die Tafel zeigt das Werk, die übrigen Facetten tragen Splitter davon
    if (fenster && fenster.mu > 0.01 && werkeDa) flachFenster(c, f, x, y, r, fenster);
    c.strokeStyle = 'rgba(255,255,255,0.28)'; c.lineWidth = Math.max(0.5, r * 0.025); c.stroke();
  }
  // weicher Schein und, beim Ankommen, ein feiner Stern
  c.globalCompositeOperation = 'lighter';
  const s = c.createRadialGradient(x, y, 0, x, y, r * 1.9);
  s.addColorStop(0, 'rgba(210,205,255,0.09)'); s.addColorStop(1, 'rgba(210,205,255,0)');
  c.fillStyle = s; c.fillRect(x - r * 1.9, y - r * 1.9, r * 3.8, r * 3.8);
  if (glanz > 0.01) {
    c.strokeStyle = `rgba(255,250,240,${glanz * 0.7})`; c.lineWidth = Math.max(0.6, r * 0.05);
    const a = r * 4 * glanz + r;
    c.beginPath(); c.moveTo(x - a, y); c.lineTo(x + a, y); c.moveTo(x, y - a * 0.7); c.lineTo(x, y + a * 0.7); c.stroke();
  }
  c.restore();
}
function flachFenster(c, f, x, y, r, { A, B, fr, mu }) {
  const S = werkS;
  const zeichne = (k, alpha, gross, dx, dy) => {
    if (k < 1 || alpha < 0.01) return;
    c.globalAlpha = alpha;
    c.drawImage(werkAtlas, (k - 1) * S, 0, S, S, x - gross + dx, y - gross + dy, gross * 2, gross * 2);
  };
  c.save(); c.clip();
  if (f.tafel) {
    const wb = smoothstep01((fr - 0.3) / 0.4);
    const g = r * FENSTER * 1.02;
    zeichne(A, mu * 0.96 * (1 - wb), g, 0, 0); zeichne(B, mu * 0.96 * wb, g, 0, 0);
    // Glanz von links oben
    c.globalAlpha = mu * 0.5;
    const gl2 = c.createLinearGradient(x - g, y - g, x + g * 0.4, y + g * 0.4);
    gl2.addColorStop(0, 'rgba(255,255,255,0.22)'); gl2.addColorStop(0.5, 'rgba(255,255,255,0)'); c.fillStyle = gl2; c.fill();
  } else {
    // jede Facette ein anderer Ausschnitt, und sie wechselt zu ihrer eigenen Zeit
    const th = ((f.i * 0.618) % 1) * 0.55, wb = smoothstep01((fr - th) / 0.45);
    const m = f.p.reduce((s, q) => [s[0] + q[0] / f.p.length, s[1] + q[1] / f.p.length], [0, 0]);
    const g = r * 1.7, dx = -m[0] * r * 0.9, dy = m[1] * r * 0.9;
    zeichne(A, mu * 0.55 * (1 - wb), g, dx, dy); zeichne(B, mu * 0.55 * wb, g, dx, dy);
  }
  c.restore();
}
const smoothstep01 = (x) => { x = Math.min(1, Math.max(0, x)); return x * x * (3 - 2 * x); };
function flachZeichnen(A, B, fr, zeigen, gx, gy, rr, gier, neig, roll, blitz, dimm) {
  const c = fctx; if (!c || !seitenBild[A]) return;
  const bildA = ausMenu && A ? leerBild : seitenBild[A], bildB = ausMenu && B ? leerBild : seitenBild[B];
  c.setTransform(1, 0, 0, 1, 0, 0);
  const w = flach.width, h = flach.height;
  if (zeigen < 1) { c.drawImage(leerBild, 0, 0, w, h); c.globalAlpha = zeigen; }
  c.drawImage(bildA, 0, 0, w, h);
  c.globalAlpha = 1;
  if (fr > 0.001) {
    c.globalAlpha = fr * fr * (3 - 2 * fr); c.drawImage(bildB, 0, 0, w, h);
    // in der Mitte der Drehung löst sich die Schrift ins Leere
    c.globalAlpha = Math.pow(Math.sin(Math.PI * fr), 1.6) * 0.6; c.drawImage(leerBild, 0, 0, w, h);
    c.globalAlpha = 1;
  }
  if (dimm > 0.002) { c.globalAlpha = dimm; c.drawImage(leerBild, 0, 0, w, h); c.globalAlpha = 1; }
  c.setTransform(D, 0, 0, D, 0, 0);
  flachStein(c, gx, gy, rr, gier, neig, roll, ruhig ? 0 : blitz, { A, B, fr, mu: dimm });
}

// Erst die Schrift, dann die Seiten (sonst stünde der Titel in einer Ersatzschrift im Bild)
groesse();
Promise.all([document.fonts.load(`600 100px ${SCHRIFT}`), document.fonts.load(`500 16px ${SCHRIFT}`)])
  .catch(() => spur('Schrift fehlt'))
  .finally(() => {
    schriftDa = true; groesse();
    requestAnimationFrame(bild);
    const s = new URLSearchParams(location.search).get('bereich');
    if (s) { const k = BEREICHE.findIndex((b) => b.name.toLowerCase() === s.toLowerCase()) + 1; if (k > 0) { phi = k * SCHRITT; } }
  });
