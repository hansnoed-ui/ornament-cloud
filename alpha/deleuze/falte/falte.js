// Falte – Operator VIII von the deleuzian scheme (Gilles Deleuze, Le Pli. Leibniz et le baroque, 1988).
// Drei Lesarten: Rauschen (die kleinen Wahrnehmungen: das Bild zerfällt in ein Meer aus Körnchen, und über eine Schwelle
// tritt die Gestalt hervor, klar nur in einem kleinen Bezirk wie in der Monade), Draperie (die Falten der Materie: das Bild
// als schweres Tuch auf einem Tisch, simuliert in tuch.js: man greift und zieht, die Falten entstehen von selbst),
// Entfalten (Hantaïs «pliage»: das Bild als Blatt im Raum, blatt.js; gefaltet, mit Farbe übergossen und Klappe um Klappe
// wieder geöffnet; es bleibt, was aussen lag, und jede Runde giesst eine andere Farbe).
// WebGL2, ohne Bibliotheken, ohne CDN. Aufbau, Quellen, Aufnahme, Glossen und Einstieg wie im Ritornell.

import { TEXTE } from './texte.js?v=3';
import { klangStarten, klangBild, klangAn, klangIstAn, klangSpur, klangSprung, klangKnick, klangGiessen, klangAuf, klangFall, klangHeben } from './klang.js?v=2';
import { aufnahmeDatei } from '../gemeinsam/aufnahme.js?v=1';
import { tuchBauen } from './tuch.js?v=2';
import { stueckeBauen, blattDreiecke } from './blatt.js?v=1';
import { fotoLesen, istVideo, istFoto, istHeic, dateiMeldung, fotosMalen, fahrtSchalter, FAHRT_SVG } from '../gemeinsam/fotos.js?v=2';

const $ = (id) => document.getElementById(id);
const Q = new URLSearchParams(location.search);

// ---------- Sprache ----------
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
const SPUR = 'falte.spur';
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
  if (s.length && !['✓ läuft', 'Start', 'Ende', 'Pause'].includes(s.at(-1))) console.warn('Falte: der letzte Versuch brach ab nach', s.slice(-4).join(' → '));
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
const SCHARF_SEITE = leicht ? 960 : telefon ? 1280 : 1920;   // das Bild: so scharf, wie der Bildschirm es zeigt
const MAX_DPR = leicht ? 0.6 : 2;
if (leicht) spur('Leichte Fassung (ohne Grafikkarte)');
if (!gl) { melden(TEXTE[sprache].keinGL); spur('kein WebGL2'); }
leinwand.addEventListener('webglcontextlost', (e) => { e.preventDefault(); melden(TEXTE[sprache].kontextWeg); spur('Kontext verloren'); });

const VS = `#version 300 es
in vec2 a; out vec2 v;
void main(){ v = a*0.5+0.5; gl_Position = vec4(a,0.,1.); }`;
const HILFE = `
#define PI 3.14159265
float lu(vec3 c){ return dot(c, vec3(0.2126, 0.7152, 0.0722)); }
float h21(vec2 p){ p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }
float rauschen(vec2 p){ vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
  return mix(mix(h21(i), h21(i + vec2(1, 0)), f.x), mix(h21(i + vec2(0, 1)), h21(i + 1.0), f.x), f.y); }
// jede Stufe gedreht, damit keine Achsen im Rauschen stehen bleiben
float fbm(vec2 p){ float s = 0.0, a = 0.5; mat2 m = mat2(0.8, 0.6, -0.6, 0.8); for (int k = 0; k < 4; k++) { s += a * rauschen(p); p = m * p * 2.03 + 17.1; a *= 0.5; } return s / 0.9375; }
`;
const KOPF = `#version 300 es
precision highp float; precision highp sampler2D; in vec2 v; out vec4 o;
` + HILFE;

// rohe Baumwolle: warmes Weiss, die Fasern nie feiner als drei Bildpunkte (sonst Moiré)
const LEINEN = `
vec3 leinen(vec2 s, float hpx){
  float f1 = fbm(vec2(s.x * hpx / 3.4, s.y * hpx / 11.0)), f2 = fbm(vec2(s.x * hpx / 13.0 + 7.0, s.y * hpx / 3.6));
  return vec3(0.93, 0.912, 0.868) * (0.955 + 0.045 * f1 + 0.03 * f2);
}
// wie weit die Farbe an einer Stelle schon gelaufen ist (> 0: nass): sie fällt oben über das Paket und läuft in Rinnsalen
// hinunter, die einander überholen
float gussVor(vec2 x, float g){
  float rinn = pow(rauschen(vec2(x.x * 26.0, 3.1)), 3.0) * 0.16 + pow(rauschen(vec2(x.x * 61.0, 8.7)), 4.0) * 0.07;
  return g * 1.4 - (1.0 - x.y) - 0.08 * fbm(x * 5.0) + rinn * smoothstep(0.0, 0.3, g);
}
`;

// ---------- das gefaltete Blatt ----------
// Jede Falte ist eine Gerade (n · x = c); was auf ihrer Seite n · x > c liegt, klappt um die Gerade, um den Winkel w
// (PI: flach umgelegt, 0: offen). Für einen Punkt auf dem Tisch gehen wir alle Möglichkeiten durch, welche Lagen über ihm
// liegen (2 hoch Faltenzahl), und nehmen die oberste. So faltet jede Falte immer das ganze Paket, wie bei echtem Papier.
const FALZ = `
uniform vec4 uFalz[5]; uniform int uFalzN; uniform float uBlatt;
// x: Lage (−1: nichts), y: wie oft umgeklappt (ungerade: Rückseite), zw: Ort auf dem Blatt; kante: Abstand zum nächsten Falz,
// neig: wie steil die Lage steht (1: flach)
vec4 stapel(vec2 p, out float kante, out float neig){
  float best = -1.0; vec4 r = vec4(-1.0, 0.0, 0.0, 0.0); kante = 9.0; neig = 1.0;
  int nM = 1 << uFalzN;
  for (int m = 0; m < 32; m++) {
    if (m >= nM) break;
    vec2 x = p; bool ok = true; float ka = 9.0, ng = 1.0;
    for (int k = 4; k >= 0; k--) {
      if (k >= uFalzN) continue;
      vec4 F = uFalz[k]; float dd = dot(F.xy, x) - F.z;
      if (((m >> k) & 1) == 1) {
        float cs = cos(F.w); if (abs(cs) < 0.03) { ok = false; break; }
        float d = dd / cs; if (d <= 0.0) { ok = false; break; }
        x += F.xy * (d - dd); ka = min(ka, abs(dd)); ng = min(ng, abs(cs));
      } else {
        if (dd > 0.0) { ok = false; break; }
        ka = min(ka, -dd);
      }
    }
    if (!ok || x.x < 0.0 || x.x > uBlatt || x.y < 0.0 || x.y > 1.0) continue;
    float pos = 0.0, kl = 0.0;
    for (int k = 0; k < 5; k++) { if (k >= uFalzN) break; if (((m >> k) & 1) == 1) { pos = exp2(float(k + 1)) - 1.0 - pos; kl += 1.0; } }
    if (pos > best) { best = pos; r = vec4(pos, kl, x); kante = ka; neig = ng; }
  }
  return r;
}
` + LEINEN;

// ---------- die Szene: alle drei Lesarten in einem Durchgang ----------
// q in Bildhöhen (x mal Seitenverhältnis), y nach oben. Linien werden in Bildpunkten gerechnet: haarfein, nie treppig.
const FS_SZENE = KOPF + FALZ + `uniform sampler2D uScharf, uLein; uniform float uSeite, uT, uHpx, uDpr, uArt, uKoerner, uMeer;
uniform vec4 uRau, uRauB;
uniform vec4 uFalt; uniform float uGuss;
vec2 nachUV(vec2 qq){ return vec2(qq.x / uSeite, qq.y); }
void main(){
  vec2 q = vec2(v.x * uSeite, v.y);
  vec3 bild = texture(uScharf, v).rgb;
  vec3 c = bild;
  float px = 1.0 / uHpx;   // ein Bildpunkt in q

  if (uArt < 0.5) {
    // ===== Rauschen: das Bild zerfällt in kleine Wahrnehmungen, über eine Schwelle tritt die Gestalt hervor =====
    vec2 d = q - uRau.xy; float r = length(d);
    float wob = 1.0 + 0.14 * (fbm(d / max(r, 1e-4) * 1.4 + vec2(uT * 0.17, 0.0)) - 0.5);
    float rw = r / wob;
    float kl = (1.0 - smoothstep(uRau.z * 0.42, uRau.z * 1.05, rw)) * uRau.w;
    kl = kl * kl * (3.0 - 2.0 * kl);
    // der dunkle Grund (le fond sombre): fast nichts, nur ein Hauch des Bildes
    vec3 dunkel = bild * 0.035 + vec3(0.006, 0.008, 0.014);
    if (uKoerner < 0.5) {
      // ohne Körner (leichte Fassung): das Rauschen im Bild selbst, zitternde Stellen, verschoben vom Meer
      float k = (1.0 - smoothstep(uRauB.y * 0.3, uRauB.y, r)) * uRauB.x;
      vec2 zelle = floor(gl_FragCoord.xy / (2.4 * uDpr));
      float zt = floor(uT * 14.0);
      vec2 j = vec2(h21(zelle + zt), h21(zelle.yx + 3.7 + zt)) - 0.5;
      vec2 w = vec2(fbm(q * 3.0 + uT * 0.3), fbm(q * 3.0 + 5.0 - uT * 0.25)) - 0.5;
      vec3 b2 = texture(uScharf, v + nachUV((j * 0.05 + w * 0.14) * (1.0 - k))).rgb;
      float an = step(0.62 - 0.4 * k, h21(zelle + zt * 1.31));
      dunkel += b2 * an * mix(0.5, 1.0, k);
    }
    c = mix(bild, dunkel, uMeer);
    c = mix(c, bild, kl);
    // an der Schwelle: ein Hauch Licht, keine Linie
    c += vec3(1.0, 0.95, 0.86) * 0.015 * uRau.w * exp(-pow((rw - uRau.z * 0.86) * uHpx / (16.0 * uDpr), 2.0));
    // der Sprung: ein feiner Lichtring, der hinausläuft
    c += vec3(1.0, 0.93, 0.8) * uRauB.w * (1.0 - smoothstep(0.4, 1.5, abs(r - uRauB.z) * uHpx / uDpr)) * 0.55;
  } else if (uArt < 1.5) {
    // ===== Draperie: solange niemand das Tuch berührt, liegt das Bild glatt (das Tuch selbst zeichnet zeichneTuch)
    c = bild;
  } else {
    // ===== Entfalten: das Bild als Blatt, gefaltet, bemalt, wieder geöffnet =====
    float ka, ng; vec4 st = stapel(q, ka, ng);
    vec3 tisch = vec3(0.022, 0.021, 0.025) * (0.8 + 0.4 * fbm(q * 3.0));
    if (st.x < 0.0) c = tisch;
    else {
      vec2 s = st.zw, suv = vec2(s.x / uSeite, s.y);
      vec4 lw = texture(uLein, suv);
      bool rueck = mod(st.y, 2.0) > 0.5;
      vec3 roh = leinen(s, uHpx / uDpr);
      vec3 f;
      if (lw.a < 0.25) {
        // noch unbemalt: vorn das Bild, hinten das Papier, durch das das Bild schwach scheint
        vec3 b = texture(uScharf, suv).rgb;
        f = rueck ? roh * mix(vec3(0.86), vec3(lu(b)) * 0.5 + 0.55, 0.35) : b;
      } else {
        f = lw.rgb;
        if (rueck) f = mix(f, roh, 0.16) * 0.95;   // die Farbe ist durch die rohe Leinwand gedrungen
        // die Falze früherer Faltungen: eine feine dunkle Spur mit einem Licht daneben
        float cr = clamp((lw.a - 0.5) * 2.0, 0.0, 1.0) * uFalt.z;
        f *= 1.0 - 0.32 * cr;
      }
      if (uFalzN > 0) {
        // Schatten: liegt zum Licht hin (oben links) eine höhere Lage, fällt ihr Schatten hierher
        float k1, n1, k2, n2;
        vec2 o = normalize(vec2(-0.55, 0.8)) * px * uDpr;
        vec4 s1 = stapel(q + o * 4.0, k1, n1), s2 = stapel(q + o * 13.0, k2, n2);
        float sh = (s1.x > st.x + 0.5 ? 0.55 : 0.0) + (s2.x > st.x + 0.5 ? 0.3 : 0.0);
        f *= 1.0 - 0.5 * sh;
        // der Falz selbst: das Papier biegt sich, eine Lichtkante, daneben ein Hauch Dunkel
        float kp = ka * uHpx / uDpr;
        f += vec3(1.0, 0.97, 0.92) * (1.0 - smoothstep(0.3, 1.4, kp)) * 0.28;
        f *= 1.0 - 0.18 * exp(-kp / 2.5) * (1.0 - smoothstep(0.0, 1.2, kp));
        // eine steil stehende Klappe bekommt weniger Licht
        f *= 0.7 + 0.3 * ng;
      }
      if (uGuss > 0.0 && uGuss < 1.0) {
        // die Farbe läuft: eine nasse, glänzende Front, dahinter ein feuchter Schimmer
        float vor = gussVor(q, uGuss);
        float front = exp(-pow((vor - 0.05) / 0.03, 2.0));
        f = mix(f, f * 0.8 + vec3(0.32, 0.31, 0.3), front * 0.6);
        f *= 1.0 + 0.1 * smoothstep(0.0, 0.16, vor) * (1.0 - uGuss);
      }
      c = f;
    }
  }
  // feines Zittern unter einem Achtbit-Schritt: sonst stehen in den dunklen Flächen Stufen
  c += (h21(gl_FragCoord.xy + fract(uT) * 61.0) - 0.5) * (2.0 / 255.0);
  o = vec4(c, 1.0);
}`;

// ---------- Hantaï: die Farbe läuft über das gefaltete Paket ----------
// Gerechnet auf dem Blatt (v = Ort auf dem Blatt): Wohin kam dieser Punkt beim Falten, und lag er dort obenauf?
// Dann nimmt er die Farbe des Bildes an der Stelle, an der er lag. Was innen lag, bleibt rohe Leinwand.
// a: unter 0.25 unbemalt, sonst 0.5 + 0.5 · Falz
const FS_MALEN = KOPF + FALZ + `uniform sampler2D uAlt, uScharf; uniform float uSeite, uGuss, uDeck, uFarbe, uHpx; uniform vec3 uTinteD, uTinteH;
void main(){
  vec2 s = vec2(v.x * uSeite, v.y);
  vec4 alt = texture(uAlt, v);
  vec2 x = s; float pos = 0.0, cr = 0.0, px = 1.0 / uHpx;
  for (int k = 0; k < 5; k++) { if (k >= uFalzN) break;
    vec4 F = uFalz[k]; float dd = dot(F.xy, x) - F.z;
    cr = max(cr, 1.0 - smoothstep(0.6 * px, 2.0 * px, abs(dd)));
    if (dd > 0.0) { x -= 2.0 * dd * F.xy; pos = exp2(float(k + 1)) - 1.0 - pos; }
  }
  float ka, ng; vec4 st = stapel(x, ka, ng);
  bool oben = st.x >= 0.0 && abs(st.x - pos) < 0.5;
  vec3 roh = leinen(s, uHpx);
  bool leer = alt.a < 0.25;
  // unbemalt und obenauf: dort lag bis eben das Bild selbst; was innen lag, wird rohe Leinwand
  vec3 grund = leer ? (oben ? texture(uScharf, v).rgb : roh) : alt.rgb;
  float altCr = leer ? 0.0 : clamp((alt.a - 0.5) * 2.0, 0.0, 1.0);
  vec3 b = texture(uScharf, vec2(x.x / uSeite, x.y)).rgb;
  float l = lu(b);
  // wie bei einem Abzug in einer einzigen Farbe: dunkel ist dichte Farbe, hell lässt das Papier durchscheinen
  vec3 tinte = mix(uTinteD, uTinteH, pow(smoothstep(0.03, 0.95, l), 0.85));
  vec3 farbe = mix(mix(vec3(l), b, 1.12) * 1.02, tinte, uFarbe);
  // die Farbe sitzt im Gewebe: sie nimmt die Fasern der Leinwand an
  farbe *= 0.93 + 0.07 * (roh.r / 0.93);
  // sie läuft von oben über das Paket
  float front = smoothstep(0.0, 0.09, gussVor(x, uGuss));
  float auftrag = oben ? uDeck * front : 0.0;
  vec3 neu = mix(grund, farbe, auftrag);
  float neuCr = max(altCr * 0.82, cr * smoothstep(0.6, 1.0, uGuss));
  o = vec4(neu, 0.5 + 0.5 * neuCr);
}`;

// ---------- die kleinen Wahrnehmungen: Körner, die das Meer bewegt ----------
// Jedes Korn hat seinen Ort im Bild (geschichtet über das ganze Bild verteilt) und trägt dessen Farbe. Gespeichert wird nur,
// wie weit es von dort weggetrieben ist (klein, darum genau genug in HalfFloat), und sein Tempo.
const KORN_HEIM = `
uniform float uS, uSeiteK;
vec2 heim(vec2 ij){ return (ij + vec2(h21(ij * 0.73 + 1.3), h21(ij * 1.91 + 7.7))) / uS * vec2(uSeiteK, 1.0); }
`;
const FS_KORN = KOPF + KORN_HEIM + `uniform sampler2D uZustand; uniform float uDt, uT, uInit, uMeer, uWelle, uRuhe;
uniform vec4 uRau, uRauB;
// das Meer: ein quellenfreier Wirbelstrom (gedrehter Gradient eines Rauschfelds) und eine Dünung, die heranrollt
vec2 stroem(vec2 p, float t){
  vec2 s = p * 2.0 + vec2(t * 0.04, -t * 0.03); float e = 0.03;
  float a = fbm(s + vec2(e, 0.0)), b = fbm(s - vec2(e, 0.0)), c = fbm(s + vec2(0.0, e)), d = fbm(s - vec2(0.0, e));
  vec2 w = vec2(c - d, -(a - b)) / (2.0 * e) * 0.07;
  float ph = p.x * 4.0 + p.y * 1.4 - t * 1.2 + 2.6 * fbm(p * 1.1 + t * 0.05);
  w += vec2(cos(ph), sin(ph) * 0.8) * 0.1 * uWelle;
  return w;
}
void main(){
  vec2 ij = floor(gl_FragCoord.xy);
  if (uInit > 0.5) { o = vec4(0.0); return; }
  vec4 z = texelFetch(uZustand, ivec2(ij), 0);
  vec2 d = z.xy, vel = z.zw, h = heim(ij), p = h + d;
  float r = length(p - uRau.xy);
  float k = (1.0 - smoothstep(uRauB.y * 0.3, uRauB.y, r)) * uRauB.x;
  float kl = (1.0 - smoothstep(uRau.z * 0.65, uRau.z, r)) * uRau.w;
  k = max(k, kl);
  // um den Daumen zieht es jedes Korn heim; draussen treibt das Meer
  float K = mix(0.55, 6.0, k * k) + 8.0 * kl + 7.0 * uRuhe;
  vec2 ziel = stroem(p, uT) * uMeer * (1.0 - k) * (1.0 - uRuhe) - d * K;
  vel = mix(vel, ziel, 1.0 - exp(-uDt * 5.0));
  d += vel * uDt;
  // ein Rest Unruhe: keine Wahrnehmung steht ganz still, bis die Schwelle überschritten ist
  float zt = floor(uT * 60.0);
  d += (vec2(h21(ij + zt * 0.731), h21(ij.yx + zt * 1.173 + 3.1)) - 0.5) * 0.0016 * (1.0 - 0.7 * k) * (1.0 - kl) * uMeer;
  o = vec4(d, vel);
}`;
const VS_KORN = `#version 300 es
precision highp float; precision highp sampler2D;
uniform sampler2D uZustand, uScharf; uniform float uSeite, uPunkt, uHell, uMeer, uT; uniform vec4 uRau, uRauB;
out vec3 vF;
` + HILFE + KORN_HEIM + `
void main(){
  int S = int(uS);
  ivec2 ij = ivec2(gl_VertexID % S, gl_VertexID / S);
  vec4 z = texelFetch(uZustand, ij, 0);
  vec2 h = heim(vec2(ij)), p = h + z.xy;
  gl_Position = vec4((p.x / uSeite) * 2.0 - 1.0, p.y * 2.0 - 1.0, 0.0, 1.0);
  gl_PointSize = uPunkt;
  vec3 f = texture(uScharf, clamp(vec2(h.x / uSeite, h.y), 0.002, 0.998)).rgb;
  float r = length(p - uRau.xy);
  float k = (1.0 - smoothstep(uRauB.y * 0.3, uRauB.y, r)) * uRauB.x;
  float kl = (1.0 - smoothstep(uRau.z * 0.42, uRau.z * 1.05, r)) * uRau.w;
  kl = kl * kl * (3.0 - 2.0 * kl);
  float sel = h21(vec2(ij) * 0.37 + 9.1);
  // Glitzern auf dem Wasser: ab und zu fängt eine kleine Wahrnehmung das Licht
  float glitz = step(0.996, h21(vec2(ij) + floor(uT * 7.0 + sel * 7.0)));
  float hell = uHell * mix(0.42, 0.82, k) * (0.8 + 0.4 * sel);
  vec3 farbe = mix(vec3(lu(f)), f, mix(0.55, 1.15, k));
  vF = (farbe * hell + vec3(0.85, 0.92, 1.0) * glitz * uHell * 0.35) * (1.0 - kl) * uMeer;
  // kühl im Dunkeln, warm, wo sich die Wahrnehmung verdichtet
  vF *= mix(vec3(0.8, 0.9, 1.15), vec3(1.05, 1.0, 0.94), k);
  // an der Schwelle leuchten die Körner auf
  vF += f * uHell * 0.06 * uRau.w * exp(-pow((r - uRau.z * 0.9) / 0.03, 2.0)) * uMeer;
}`;
const FS_KORN_PUNKT = `#version 300 es
precision highp float; in vec3 vF; out vec4 o;
void main(){ vec2 d = gl_PointCoord * 2.0 - 1.0; float r2 = dot(d, d); if (r2 > 1.0) discard; o = vec4(vF * exp(-r2 * 2.6), 1.0); }`;

// ---------- das Tuch: ein feines Netz über dem Gitter der Simulation ----------
// Die Simulation liefert je Gitterpunkt Verschiebung, Höhe, Normale und Höhle; das Netz ist dreimal feiner und liest sie
// mit Catmull-Rom (glatte Falten, keine Facetten). Licht von oben links, flach über den Tisch: der Stoff wirft Schatten.
const TUCH_LESEN = `
uniform sampler2D uLage, uNorm; uniform vec2 uGitter, uMasche; uniform float uSeite; uniform vec3 uLicht;
vec4 cr(sampler2D tx, vec2 g){
  vec2 b = floor(g), f = g - b;
  vec2 f2 = f * f, f3 = f2 * f;
  vec2 w0 = -0.5 * f3 + f2 - 0.5 * f, w1 = 1.5 * f3 - 2.5 * f2 + 1.0, w2 = -1.5 * f3 + 2.0 * f2 + 0.5 * f, w3 = 0.5 * f3 - 0.5 * f2;
  ivec2 m = ivec2(uGitter) - 1;
  vec4 s = vec4(0.0);
  for (int j = 0; j < 4; j++) {
    float wy = j == 0 ? w0.y : j == 1 ? w1.y : j == 2 ? w2.y : w3.y;
    int yy = clamp(int(b.y) + j - 1, 0, m.y);
    vec4 r = texelFetch(tx, ivec2(clamp(int(b.x) - 1, 0, m.x), yy), 0) * w0.x + texelFetch(tx, ivec2(clamp(int(b.x), 0, m.x), yy), 0) * w1.x
           + texelFetch(tx, ivec2(clamp(int(b.x) + 1, 0, m.x), yy), 0) * w2.x + texelFetch(tx, ivec2(clamp(int(b.x) + 2, 0, m.x), yy), 0) * w3.x;
    s += r * wy;
  }
  return s;
}
// Ort im Raum: Ruhelage plus Verschiebung; z über dem Tisch
vec3 ort(vec2 g, out vec4 lg){ lg = cr(uLage, g); return vec3(g * uMasche + lg.xy, max(lg.z, 0.0)); }
// wohin der Schatten eines Punktes auf den Tisch fällt
vec2 schattenOrt(vec3 p){ return p.xy - uLicht.xy / uLicht.z * p.z; }
float tiefeAus(float z){ return 0.5 - z * 1.4; }
`;
const VS_TUCH = `#version 300 es
precision highp float; precision highp sampler2D;
in vec2 aG; out vec3 vP; out vec3 vN; out vec2 vUV; out float vHoehle; out float vStau;
` + TUCH_LESEN + `
void main(){
  vec4 lg; vec3 p = ort(aG, lg);
  vec4 nn = cr(uNorm, aG);
  vP = p; vN = nn.xyz; vHoehle = nn.w; vStau = lg.w;
  vUV = clamp(aG / (uGitter - 1.0), 0.0, 1.0);
  gl_Position = vec4(p.x / uSeite * 2.0 - 1.0, p.y * 2.0 - 1.0, tiefeAus(p.z), 1.0);
}`;
const VS_TUCH_SCHATTEN = `#version 300 es
precision highp float; precision highp sampler2D;
in vec2 aG;
` + TUCH_LESEN + `
void main(){
  vec4 lg; vec3 p = ort(aG, lg);
  vec2 s = schattenOrt(p);
  gl_Position = vec4(s.x / uSeite * 2.0 - 1.0, s.y * 2.0 - 1.0, tiefeAus(p.z), 1.0);
}`;
const FS_LEER = `#version 300 es
precision highp float; out vec4 o; void main(){ o = vec4(1.0); }`;
// der Schatten, weich: je höher der Stoff über der Stelle, desto breiter der Halbschatten
const TUCH_SCHATTEN = `
uniform sampler2D uSchatten; uniform vec2 uSchattenPx; uniform float uBias;
float schatten(vec3 p){
  vec2 s = schattenOrt(p); vec2 uv = vec2(s.x / uSeite, s.y);
  float ich = tiefeAus(p.z) * 0.5 + 0.5;
  float block = texture(uSchatten, uv).r;
  float ab = max(0.0, ich - block);
  float r = 1.5 + 260.0 * ab;
  float sum = 0.0;
  for (int i = 0; i < 12; i++) {
    float a = float(i) * 2.39996 + 0.7, rr = r * sqrt((float(i) + 0.5) / 12.0);
    float b = texture(uSchatten, uv + vec2(cos(a), sin(a)) * rr * uSchattenPx).r;
    sum += step(b, ich - uBias);
  }
  return sum / 12.0;
}
`;
const FS_TISCH = KOPF + `uniform float uSeite, uHpx, uT; uniform vec3 uLicht;
vec2 schattenOrt(vec3 p){ return p.xy - uLicht.xy / uLicht.z * p.z; }
float tiefeAus(float z){ return 0.5 - z * 1.4; }
` + TUCH_SCHATTEN + `
void main(){
  vec2 q = vec2(v.x * uSeite, v.y);
  // der Tisch: schwarzer Samt, kaum sichtbar, ein Hauch Licht von oben links
  vec3 c = vec3(0.016, 0.015, 0.018) * (0.85 + 0.3 * fbm(q * vec2(300.0, 40.0) * uHpx / 1400.0));
  c *= 0.8 + 0.4 * smoothstep(1.4, 0.0, length(q - vec2(0.0, 1.0)));
  c *= 1.0 - 0.75 * schatten(vec3(q, 0.0));
  o = vec4(c, 1.0);
}`;
const FS_TUCH = `#version 300 es
precision highp float; precision highp sampler2D;
in vec3 vP; in vec3 vN; in vec2 vUV; in float vHoehle; in float vStau; out vec4 o;
uniform sampler2D uScharf; uniform float uHpx, uDpr, uGlanz, uSchwer, uDa;
` + HILFE + TUCH_LESEN + TUCH_SCHATTEN + `
void main(){
  vec3 N = normalize(vN);
  // liegt die Rückseite oben (der Stoff hat sich umgeschlagen), dann leuchtet der Druck nur durch
  bool rueck = N.z < 0.0; if (rueck) N = -N;
  vec3 stoff = texture(uScharf, vUV).rgb;
  if (rueck) stoff = mix(vec3(lu(stoff)), stoff, 0.4) * 0.55 + vec3(0.05, 0.048, 0.045);
  vec3 L = normalize(uLicht);
  // Hell-Dunkel, so geeicht, dass glatt liegender Stoff das Bild genau so zeigt, wie es ist
  float wrap = (dot(N, L) + 0.25) / 1.25, flach = (L.z + 0.25) / 1.25;
  float licht = (0.06 + wrap) / (0.06 + flach);
  // die Täler versinken im dunklen Grund, die Grate fangen das Licht
  float hoehle = 1.0 - exp(-vHoehle * (60.0 + 40.0 * uSchwer));
  licht *= 1.0 - 0.72 * hoehle;
  float sch = schatten(vP);
  licht *= 1.0 - 0.7 * sch;
  vec3 col = stoff * mix(1.0, licht, uDa);
  // Seide oder Samt: Seide glänzt auf den Graten, Samt leuchtet an den Flanken
  vec3 H = normalize(L + vec3(0.0, 0.0, 1.0));
  float ex = mix(8.0, 48.0, uGlanz);
  float sp = max(0.0, pow(max(dot(N, H), 0.0), ex) - pow(H.z, ex)) * (1.0 - sch);
  col += mix(vec3(1.0, 0.95, 0.88), stoff * 1.3 + 0.12, 0.3) * sp * mix(0.1, 0.75, uGlanz) * uDa;
  float rand = pow(clamp(1.0 - N.z, 0.0, 1.0), 1.4);
  col += stoff * rand * 0.9 * (1.0 - uGlanz) * uDa * (0.3 + 0.7 * smoothstep(0.0, 0.6, lu(stoff))) * (1.0 - 0.5 * sch);
  // der Rand des Tuchs: eine feine Kante, das Gewebe hat eine Dicke
  vec2 rd = min(vUV, 1.0 - vUV) * vec2(uSeite, 1.0) * uHpx / uDpr;
  float kante = 1.0 - smoothstep(0.0, 1.6, min(rd.x, rd.y));
  col = mix(col, col * 0.55, kante * uDa);
  o = vec4(col, 1.0);
}`;

// ---------- Entfalten im Raum: die Stücke des Blattes, von oben gesehen, mit etwas Perspektive ----------
// Die Kamera steht uHc Bildhöhen über der Mitte: flach liegendes Papier deckt sich genau mit dem Bildschirm, eine Klappe,
// die sich hebt, kommt auf einen zu. Die Papierdicke (aus der Lage) zählt nur für Tiefe und Schatten.
const BLATT_RAUM = `
uniform float uSeite, uHc, uDicke; uniform vec3 uLicht;
vec2 schattenOrt(vec3 p){ return p.xy - uLicht.xy / uLicht.z * p.z; }
float tiefeAus(float z){ return 0.5 - z * 1.4; }
float dick(float lage){ return uDicke * sqrt(lage + 1.0); }
`;
const VS_BLATT = `#version 300 es
precision highp float;
layout(location = 1) in vec3 aP; layout(location = 2) in vec2 aS; layout(location = 3) in vec3 aN; layout(location = 4) in float aL;
out vec3 vP; out vec2 vS; out vec3 vN; out float vL;
` + BLATT_RAUM + `
void main(){
  vec3 p = aP; p.z += dick(aL) * 0.02;
  vP = vec3(aP.xy, aP.z + dick(aL)); vS = aS; vN = aN; vL = aL;
  vec2 c = vec2(uSeite * 0.5, 0.5);
  float w = (uHc - max(aP.z, -0.5 * uHc)) / uHc;
  vec2 s = c + (aP.xy - c) / w;
  gl_Position = vec4(vec2(s.x / uSeite, s.y) * 2.0 - 1.0, tiefeAus(aP.z + dick(aL)), 1.0) * w;
}`;
const VS_BLATT_SCHATTEN = `#version 300 es
precision highp float;
layout(location = 1) in vec3 aP; layout(location = 4) in float aL;
` + BLATT_RAUM + `
void main(){
  vec3 p = vec3(aP.xy, aP.z + dick(aL));
  vec2 s = schattenOrt(p);
  gl_Position = vec4(s.x / uSeite * 2.0 - 1.0, s.y * 2.0 - 1.0, tiefeAus(p.z), 1.0);
}`;
const FS_BLATT = `#version 300 es
precision highp float; precision highp sampler2D;
in vec3 vP; in vec2 vS; in vec3 vN; in float vL; out vec4 o;
uniform sampler2D uScharf, uLein; uniform float uHpx, uDpr, uGuss, uFalzRelief, uT;
` + HILFE + BLATT_RAUM + TUCH_SCHATTEN + LEINEN + `
void main(){
  vec3 N = normalize(vN);
  bool rueck = N.z < 0.0; if (rueck) N = -N;
  vec2 s = vS, suv = vec2(s.x / uSeite, s.y);
  float hpx = uHpx / uDpr;
  vec4 lw = texture(uLein, suv);
  vec3 roh = leinen(s, hpx);
  vec3 f;
  float relief = 0.0;
  if (lw.a < 0.25) {
    vec3 b = texture(uScharf, suv).rgb;
    // die Rückseite: rohes Papier, durch das das Bild schwach scheint
    f = rueck ? roh * mix(vec3(0.86), vec3(lu(b)) * 0.5 + 0.55, 0.35) : b;
  } else {
    f = lw.rgb;
    if (rueck) f = mix(f, roh, 0.16) * 0.95;
    // die Falze früherer Faltungen: ein feines Tal; die Kante zum Licht hin hell, die andere dunkel
    float e = 1.6 / hpx;
    float cr = clamp((lw.a - 0.5) * 2.0, 0.0, 1.0);
    float cx = clamp((texture(uLein, suv + vec2(e / uSeite, 0.0)).a - 0.5) * 2.0, 0.0, 1.0) - clamp((texture(uLein, suv - vec2(e / uSeite, 0.0)).a - 0.5) * 2.0, 0.0, 1.0);
    float cy = clamp((texture(uLein, suv + vec2(0.0, e)).a - 0.5) * 2.0, 0.0, 1.0) - clamp((texture(uLein, suv - vec2(0.0, e)).a - 0.5) * 2.0, 0.0, 1.0);
    relief = dot(vec2(cx, cy), normalize(uLicht.xy)) * uFalzRelief;
    f *= 1.0 - 0.22 * cr * uFalzRelief;
  }
  // Licht: so geeicht, dass flach liegendes Papier das Bild zeigt, wie es ist
  vec3 L = normalize(uLicht);
  float wrap = (dot(N, L) + 0.35) / 1.35, flach = (L.z + 0.35) / 1.35;
  float licht = (0.1 + wrap) / (0.1 + flach);
  licht *= 1.0 - 0.6 * schatten(vP);
  licht *= 1.0 + 0.55 * relief;
  vec3 col = f * licht;
  // Papier glänzt kaum, nur wenn eine Klappe das Licht spiegelt
  vec3 H = normalize(L + vec3(0.0, 0.0, 1.0));
  col += vec3(1.0, 0.97, 0.92) * max(0.0, pow(max(dot(N, H), 0.0), 18.0) - pow(H.z, 18.0)) * 0.25;
  if (uGuss > 0.0 && uGuss < 1.0) {
    // die Farbe läuft: eine nasse, glänzende Front, dahinter ein feuchter Schimmer
    float vor = gussVor(vP.xy, uGuss);
    float front = exp(-pow((vor - 0.03) / 0.025, 2.0));
    col = mix(col, col * 0.8 + vec3(0.2, 0.2, 0.2), front * 0.35);
    float nass = smoothstep(0.0, 0.1, vor) * (1.0 - uGuss);
    col *= 1.0 + 0.12 * nass;
    col += vec3(1.0) * nass * 0.35 * pow(max(dot(N, normalize(vec3(-0.3, 0.5, 1.0))), 0.0), 60.0) * (0.6 + 0.4 * fbm(vP.xy * 40.0 + uT));
  }
  o = vec4(col, 1.0);
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
  const p = gl.createProgram(); gl.attachShader(p, mk(gl.VERTEX_SHADER, vs)); gl.attachShader(p, mk(gl.FRAGMENT_SHADER, fs)); gl.bindAttribLocation(p, 0, 'a'); gl.bindAttribLocation(p, 1, 'aG');
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
  z.b = b; z.h = hh; z.f = f; z.neu = true;
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
  if (setze) setze(prog.u);
  zeichneFlaeche();
}

let scharfTex = null, scharfB = 0, scharfH = 0;
if (gl) {
  halbFloat = !!gl.getExtension('EXT_color_buffer_float');
  gl.getExtension('OES_texture_half_float_linear');
  try {
    for (const [n, fs] of Object.entries({ szene: FS_SZENE, malen: FS_MALEN, hell: FS_HELL, weich: FS_WEICH, zusammen: FS_ZUSAMMEN })) P[n] = programm(fs);
  } catch (e) { spur('Shader: ' + String(e.message).slice(0, 140)); console.error(e); melden(TEXTE[sprache].keinGL); }
  try { P.tisch = programm(FS_TISCH); P.tuch = programm(FS_TUCH, VS_TUCH); P.tuchSchatten = programm(FS_LEER, VS_TUCH_SCHATTEN); }
  catch (e) { spur('Tuch: ' + String(e.message).slice(0, 140)); console.error(e); }
  try { P.blatt = programm(FS_BLATT, VS_BLATT); P.blattSchatten = programm(FS_LEER, VS_BLATT_SCHATTEN); }
  catch (e) { spur('Blatt: ' + String(e.message).slice(0, 140)); console.error(e); }
  // die Körner nur mit HalfFloat-Zielen und Grafikkarte; sonst das Rauschen im Bild selbst
  if (halbFloat && !leicht && !Q.has('flach')) {
    try { P.korn = programm(FS_KORN); P.kornPunkt = programm(FS_KORN_PUNKT, VS_KORN); }
    catch (e) { spur('Körner: ' + String(e.message).slice(0, 140)); console.error(e); }
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
const seitenMass = (lang) => { const s = innerWidth / innerHeight; return s >= 1 ? [lang, Math.round(lang / s)] : [Math.round(lang * s), lang]; };
function texParam(ziel = gl.TEXTURE_2D) {
  for (const [k, w] of [[gl.TEXTURE_MIN_FILTER, gl.LINEAR], [gl.TEXTURE_MAG_FILTER, gl.LINEAR], [gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE], [gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE]]) gl.texParameteri(ziel, k, w);
}
function groesse() {
  const dpr = Math.min(devicePixelRatio || 1, MAX_DPR) * aufloesung;
  const b = Math.round(innerWidth * dpr), hh = Math.round(innerHeight * dpr);
  if (leinwand.width !== b || leinwand.height !== hh) { leinwand.width = b; leinwand.height = hh; }
  if (!gl) return;
  const lang = Math.min(SCHARF_SEITE, Math.max(640, Math.round(Math.max(innerWidth, innerHeight) * Math.min(devicePixelRatio || 1, 2))));
  const [sb, sh] = seitenMass(lang);
  if (sb !== scharfB || sh !== scharfH) {
    scharfB = sb; scharfH = sh; scharf.width = sb; scharf.height = sh;
    if (!scharfTex) scharfTex = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, scharfTex);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, sb, sh, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
    texParam();
  }
  // die Leinwand für Hantaï: so gross wie das Bild, 8 Bit genügen
  const [lb, lh] = seitenMass(leicht ? 720 : telefon ? 1080 : 1440);
  lein[0] = zielBauen('leinA', lb, lh, false); lein[1] = zielBauen('leinB', lb, lh, false);
  if (lein[0].neu || lein[1].neu) { lein[0].neu = lein[1].neu = false; leinwandLeeren(); }
  if (fotos.length) fotoBuehneGroesse();
}
addEventListener('resize', groesse);

// ---------- Quellen (wie im Ritornell) ----------
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
  try { nr = e ? (+(localStorage.getItem('falte.beispiel') || 0)) % BEISPIELE.length : 0; localStorage.setItem('falte.beispiel', String(nr + 1)); } catch {}
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

// Fotos: eine langsame Fahrt durch das Foto, mehrere lösen einander ab
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
    { dauer: FOTO_DAUER, blende: FOTO_BLENDE, art: 'atmen', mix: fahrt.schritt(t) });
}
// Fahrt durch das Foto an und aus (feines Zeichen unten rechts, nur bei Fotos); zuerst ruhig, das ganze Foto
const fahrtKnopf = document.createElement('button');
fahrtKnopf.className = 'fahrt'; fahrtKnopf.hidden = true; fahrtKnopf.innerHTML = FAHRT_SVG;
$('wenden').after(fahrtKnopf);
const fahrt = fahrtSchalter(fahrtKnopf, false);
function fahrtSehen() { const weg = quelle !== fotoBuehne; if (fahrtKnopf.hidden !== weg) fahrtKnopf.hidden = weg; }

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
function scharfFangen() {
  if (!scharfTex || !malenIn(sctx, scharfB, scharfH)) return false;
  gl.activeTexture(gl.TEXTURE2); gl.bindTexture(gl.TEXTURE_2D, scharfTex);
  gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
  gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, gl.RGBA, gl.UNSIGNED_BYTE, scharf);
  gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
  return true;
}

// ---------- Regler und Lesarten ----------
// Je Lesart drei Regler mit eigenem Sinn; die Werte bleiben je Lesart erhalten.
const WERTE = [[0.5, 0.45, 0.5], [0.55, 0.5, 0.55], [0.7, 0.85, 0.6]];
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
  glosse('baroque');
  spur('Lesart ' + nr);
}
function lesartText() {
  const z = TEXTE[sprache].lesarten[lesart];
  $('b-lesart-titel').textContent = z.titel + ' · ' + z.wer;
  $('b-lesart-text').textContent = z.text;
}
document.querySelectorAll('[data-lesart]').forEach((b) => b.addEventListener('click', () => lesartWaehlen(+b.dataset.lesart)));
$('r-lesart').addEventListener('input', (e) => { const nr = +e.target.value; if (nr !== lesart) lesartWaehlen(nr); });

// ---------- Zustand der drei Lesarten ----------
const lerp = (a, b, k) => a + (b - a) * k;
const naeher = (a, b, dt, tau) => a + (b - a) * (1 - Math.exp(-dt / tau));
const inQ = (cx, cy) => ({ x: cx / innerHeight, y: 1 - cy / innerHeight });   // in Bildhöhen, y nach oben

// Rauschen: I sammelt die kleinen Wahrnehmungen, solange der Daumen liegt; bei 1 ist die Schwelle erreicht
const rau = { x: 0.5, y: 0.5, I: 0, klar: 0, Rk: 0.05, meer: 0, ruhe: 1, ueber: false, seitSprung: 0, sprungR: 9, sprungA: 0, streuen: true, aktiv: false };
const KORN_S = telefon ? 384 : 576;   // 147 456 Körner am Telefon, 331 776 am grossen Bildschirm

// Draperie: das Bild liegt als Tuch auf einem Tisch (Simulation in tuch.js); jede Hand fasst es an einer Stelle
let tuch = null, tuchDa = 0, tuchGriffe = 0;
const TUCH_PUNKTE = leicht ? 2000 : telefon ? 3000 : 4800;
function tuchHolen() {
  const s = innerWidth / innerHeight;
  if (!tuch || (Math.abs(tuch.seite - s) > 1e-3 && !tuch.aktiv)) tuch = tuchBauen(s, TUCH_PUNKTE);
  return tuch;
}

// Entfalten: bis zu fünf Falten, dann giesst sich das Bild über das Paket und das Blatt öffnet sich wieder
const fz = { falten: [], aktiv: null, phase: 'flach', zeit: 0, guss: 0, bemalt: false, runde: 0 };
// jede neue Runde giesst eine andere Farbe, wie Hantaï, der dieselbe Leinwand mehrmals faltete: Blau, Rot, Sepia
const TINTEN = [[[0.02, 0.045, 0.2], [0.7, 0.78, 0.93]], [[0.42, 0.035, 0.02], [0.96, 0.8, 0.72]], [[0.09, 0.06, 0.04], [0.9, 0.86, 0.78]]];
const FALTEN_MAX = 5;
const lein = [null, null];   // [0]: die Leinwand, wie sie ist; [1]: während des Giessens die neue

function leinwandLeeren() {
  if (!gl || !lein[0]) return;
  for (const z of lein) { gl.bindFramebuffer(gl.FRAMEBUFFER, z.fb); gl.clearColor(0, 0, 0, 0); gl.clear(gl.COLOR_BUFFER_BIT); }
  gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  fz.bemalt = false;
}
// dieselbe Rechnung wie stapel() im Shader, für die Frage: liegt unter dem Finger überhaupt Papier?
function papierUnter(p, falten) {
  const s = innerWidth / innerHeight, n = falten.length;
  for (let m = 0; m < (1 << n); m++) {
    let x = p.x, y = p.y, ok = true;
    for (let k = n - 1; k >= 0; k--) {
      const F = falten[k], dd = F.nx * x + F.ny * y - F.c;
      if ((m >> k) & 1) { const cs = Math.cos(F.w); if (Math.abs(cs) < 0.03) { ok = false; break; } const d = dd / cs; if (d <= 0) { ok = false; break; } x += F.nx * (d - dd); y += F.ny * (d - dd); }
      else if (dd > 0) { ok = false; break; }
    }
    if (ok && x >= 0 && x <= s && y >= 0 && y <= 1) return true;
  }
  return false;
}
function falteAus(sx, sy, fx, fy) {
  const dx = sx - fx, dy = sy - fy, l = Math.hypot(dx, dy);
  if (l < 0.012) return null;
  const nx = dx / l, ny = dy / l;
  return { sx, sy, fx, fy, nx, ny, c: nx * (sx + fx) / 2 + ny * (sy + fy) / 2, w: Math.PI };
}

// ---------- Hände ----------
const finger = new Map();
let letzteBeruehrung = -99, bewegungHand = 0;
function fingerNeu(cx, cy) { return { x: cx, y: cy, x0: cx, y0: cy, lx: cx, ly: cy, bewegt: 0, zeit: 0, start: performance.now() }; }

function beruehren(id, cx, cy) {
  const f = fingerNeu(cx, cy);
  finger.set(id, f);
  if (id !== 'geist') { if (!daumenGelernt[lesart]) $('daumen').classList.add('weg'); haltZeigen(cx, cy); geisterStart = -1; finger.delete('geist'); }
  letzteBeruehrung = performance.now() / 1000;
  const p = inQ(cx, cy);
  if (lesart === 0) {
    if (!rau.aktiv || rau.meer < 0.05) { rau.streuen = true; rau.x = p.x; rau.y = p.y; rau.I = 0; rau.Rk = 0.04; }
    rau.aktiv = true; glosse('petites');
  }
  if (lesart === 1) {
    // die Hand fasst das Tuch dort, wo es jetzt liegt
    if (tuchHolen().fassen(id, p.x, p.y, 0.03)) { f.tuch = true; tuchGriffe++; }
    glosse('matiere'); loesenZeigen();
  }
  if (lesart === 2) {
    if ((fz.phase === 'flach' || fz.phase === 'warten') && fz.falten.length < FALTEN_MAX && papierUnter(p, fz.falten)) { f.falz = { x: p.x, y: p.y }; fz.phase = 'falten'; }
  }
}
function bewegen(id, cx, cy) {
  const f = finger.get(id); if (!f) return;
  f.bewegt += Math.hypot(cx - f.x, cy - f.y);
  f.x = cx; f.y = cy;
  if (id !== 'geist') haltZeigen(cx, cy);
  const p = inQ(cx, cy);
  if (lesart === 1 && f.tuch && tuch) tuch.ziehen(id, p.x, p.y);
  if (lesart === 2 && f.falz) {
    // die Klappe schwebt noch über dem Paket, solange die Hand sie hält
    fz.aktiv = falteAus(f.falz.x, f.falz.y, p.x, p.y);
    if (fz.aktiv) fz.aktiv.w = Math.PI - 0.5 * Math.min(1, Math.hypot(p.x - f.falz.x, p.y - f.falz.y) / 0.1);
  }
}
let nachUhr = 0;
// Takt und Durchgänge der Simulation; wird es zu langsam, rechnet das Tuch gröber
const TUCH_STUFEN = [[240, 4], [180, 3], [120, 3], [120, 2]];
let tuchStufe = telefon || leicht ? 1 : 0, tuchZeit = 4;
function loslassen(id) {
  const f = finger.get(id);
  finger.delete(id);
  if (id !== 'geist' && finger.size === 0) { $('halt').classList.remove('da'); if (!daumenGelernt[lesart]) setTimeout(daumenZeigen, 600); }
  letzteBeruehrung = performance.now() / 1000;
  if (!f) return;
  if (f.tuch && tuch) {
    // der Stoff fällt zurück auf den Tisch
    klangFall(Math.min(1, tuch.hoehe * 14));
    tuch.lassen(id);
    clearTimeout(nachUhr);
    nachUhr = setTimeout(() => { if (!finger.size && lesart === 1) glosse(tuchGriffe >= 3 ? 'infini' : 'draperie'); }, 2400);
  }
  if (lesart === 2 && f.falz) {
    if (fz.aktiv) {
      fz.falten.push(fz.aktiv); fz.aktiv = null;
      klangKnick(fz.falten.length); try { navigator.vibrate?.(6); } catch {}
      glosse('pliage'); spur('Falte ' + fz.falten.length);
    }
    fz.phase = fz.falten.length ? 'warten' : 'flach'; fz.zeit = performance.now() / 1000;
    loesenZeigen();
  }
  if (lesart === 0) {
    clearTimeout(nachUhr);
    nachUhr = setTimeout(() => { if (!finger.size && lesart === 0) glosse(rau.ueber || rau.klar > 0.1 ? 'fenetres' : 'mer'); }, 2200);
  }
}
leinwand.addEventListener('pointerdown', (e) => { leinwand.setPointerCapture(e.pointerId); beruehren(e.pointerId, e.clientX, e.clientY); });
leinwand.addEventListener('pointermove', (e) => bewegen(e.pointerId, e.clientX, e.clientY));
leinwand.addEventListener('pointerup', (e) => loslassen(e.pointerId));
leinwand.addEventListener('pointercancel', (e) => loslassen(e.pointerId));

// alles lösen: das Tuch fällt glatt, das Blatt wird wieder Bild, das Meer beruhigt sich
function allesLoesen() {
  // in der Draperie fällt das Tuch sichtbar zurück, sonst liegt es sofort wieder glatt
  if (tuch) { if (lesart === 1) tuch.loesen(); else tuch.ruhe(); }
  tuchGriffe = 0;
  fz.falten = []; fz.aktiv = null; fz.phase = 'flach'; fz.runde = 0; leinwandLeeren();
  rau.aktiv = false;
  loesenZeigen(); spur('gelöst');
}
function loesenZeigen() {
  const da = (lesart === 1 && !!tuch && tuch.aktiv && !tuch.heim) || (lesart === 2 && (fz.bemalt || fz.falten.length > 0));
  $('loesen').hidden = !da;
}

function haende(t, dt) {
  const W = WERTE[lesart];
  let tempo = 0;
  for (const f of finger.values()) { tempo = Math.max(tempo, Math.hypot(f.x - f.lx, f.y - f.ly) / innerHeight / dt); f.lx = f.x; f.ly = f.y; f.zeit += dt; }
  bewegungHand = naeher(bewegungHand, Math.min(1, tempo / 2), dt, 0.15);
  const ruhe = t - letzteBeruehrung;
  const daumen = finger.size > 0 ? [...finger.values()][0] : null;

  // ----- Rauschen -----
  const haelt = lesart === 0 && !!daumen;
  if (haelt) {
    const p = inQ(daumen.x, daumen.y);
    rau.x = naeher(rau.x, p.x, dt, 0.12); rau.y = naeher(rau.y, p.y, dt, 0.12);
    // wer den Daumen bewegt, stört die Wahrnehmung: die Summe wächst langsamer
    rau.I = Math.min(1.2, rau.I + dt / (0.9 + 4.2 * W[1]) * (1 - 0.75 * bewegungHand));
    if (!rau.ueber && rau.I >= 1) {
      rau.ueber = true; rau.sprungR = 0; rau.sprungA = 1; rau.seitSprung = 0;
      klangSprung(); try { navigator.vibrate?.(10); } catch {}
      glosse('seuil', true); spur('Schwelle');
    }
  } else {
    rau.I = Math.max(0, rau.I - dt / 2.4);
    if (rau.I < 0.5) rau.ueber = false;
  }
  rau.seitSprung += dt;
  const klarZiel = rau.ueber && (haelt || ruhe < 1.4) ? 1 : 0;
  rau.klar = naeher(rau.klar, klarZiel, dt, klarZiel ? 0.1 : 1.3);
  const RkZiel = (0.08 + 0.3 * W[2]) * (0.7 + 0.3 * Math.min(1, rau.seitSprung / 2.5));
  rau.Rk = naeher(rau.Rk, rau.ueber ? RkZiel : RkZiel * 0.6, dt, rau.ueber ? 0.25 : 1.2);
  rau.sprungR += dt * 0.55; rau.sprungA = Math.max(0, rau.sprungA - dt * 1.1);
  const meerZiel = lesart === 0 && rau.aktiv && (haelt || ruhe < 7) ? 1 : 0;
  rau.meer = naeher(rau.meer, meerZiel, dt, meerZiel ? 0.45 : 2.0);
  rau.ruhe = naeher(rau.ruhe, meerZiel ? 0 : 1, dt, 0.5);
  if (rau.meer < 0.01 && !meerZiel) rau.aktiv = false;

  // ----- Draperie: die Welt des Tuchs, nur solange man sie sieht -----
  if (tuch && tuch.aktiv && lesart === 1) {
    const W1 = WERTE[1], t0 = performance.now();
    const [takt, iter] = TUCH_STUFEN[tuchStufe];
    tuch.schritt(dt, { gewicht: W1[0], falten: W1[1], hub: 0.045 + 0.035 * W1[1], takt, iter });
    // zu langsam? dann weniger Durchgänge (das Telefon soll flüssig bleiben)
    const ms = performance.now() - t0;
    if (!FEST) { tuchZeit = tuchZeit * 0.9 + ms * 0.1; if (tuchZeit > 9 && tuchStufe < 3) { tuchStufe++; tuchZeit = 6; spur('Tuch Stufe ' + tuchStufe); } else if (tuchZeit < 3 && tuchStufe > 0) { tuchStufe--; tuchZeit = 6; } }
    // ein Weilchen nach dem Loslassen glättet sich der Stoff von selbst wieder (Christian, 21.11.2026)
    if (!finger.size && !tuch.heim && t - letzteBeruehrung > 1.8) { tuch.loesen(0.7); loesenZeigen(); }
    if (!tuch.aktiv) loesenZeigen();
  }
  tuchDa = naeher(tuchDa, tuch && tuch.aktiv ? 1 : 0, dt, 0.3);

  // ----- Entfalten -----
  // eine losgelassene Klappe fällt flach auf das Paket
  if (fz.phase !== 'oeffnen') for (const F of fz.falten) if (F.w < Math.PI) { F.w = naeher(F.w, Math.PI + 0.02, dt, 0.06); if (F.w >= Math.PI - 0.002) F.w = Math.PI; }
  if (fz.phase === 'warten' && !finger.size && t - fz.zeit > 1.3 && fz.falten.length) {
    fz.phase = 'giessen'; fz.guss = 0; fz.zeit = t; klangGiessen(); spur('giessen');
  }
  if (fz.phase === 'giessen') {
    fz.guss = Math.min(1, (t - fz.zeit) / 1.25);
    if (fz.guss >= 1) { lein.reverse(); fz.bemalt = true; fz.phase = 'oeffnen'; fz.zeit = t + 0.35; loesenZeigen(); }
  }
  if (fz.phase === 'oeffnen' && t > fz.zeit) {
    const F = fz.falten[fz.falten.length - 1];
    if (!F.hebt) { F.hebt = true; klangHeben(); }
    const u = Math.min(1, (t - fz.zeit) / 0.95), e = u * u * u * (u * (u * 6 - 15) + 10);
    F.w = Math.PI * (1 - e);
    if (u >= 1) {
      fz.falten.pop(); klangAuf(fz.falten.length, fz.falten.length === 0);
      fz.zeit = t + 0.12;
      if (!fz.falten.length) { fz.phase = 'flach'; fz.runde++; glosse('deplier'); }
    }
  }
}

// Nur im Vorspann führt eine unsichtbare Hand; sonst beginnt alles erst mit der Berührung (Christian, 19.11.2026)
const VORSPANN = Q.has('vorspann');
let geisterStart = -1;
const geistZug = (u, a, b, x0, y0, x1, y1) => {
  // zwischen a und b vom ersten zum zweiten Ort, sanft an- und auslaufend
  const W = innerWidth, H = innerHeight, s = W / H;
  const k = Math.max(0, Math.min(1, (u - a) / (b - a))), e = k * k * (3 - 2 * k);
  return [lerp(x0, x1, e) * H, (1 - lerp(y0, y1, e)) * H];
};
let geistPhase = '';
function geist(t) {
  if (geisterStart < 0 || t < geisterStart) return;
  const u = (t - geisterStart) % 20;
  const s = innerWidth / innerHeight;
  const halten = (pos) => { if (!finger.has('geist')) beruehren('geist', pos[0], pos[1]); else bewegen('geist', pos[0], pos[1]); letzteBeruehrung = t; };
  const lassen = () => { if (finger.has('geist')) loslassen('geist'); };
  const phase = u < 7 ? 'r' : u < 12.5 ? 'd' : 'e';
  if (phase !== geistPhase) { lassen(); geistPhase = phase; lesartWaehlen(phase === 'r' ? 0 : phase === 'd' ? 1 : 2, true); if (phase === 'r') allesLoesen(); }
  if (phase === 'r') {
    // Rauschen: der Daumen liegt auf dem Gesicht, bis die Gestalt hervortritt, und lässt dann los
    if (u > 0.6 && u < 5.4) halten(geistZug(u, 0.6, 5.4, 0.5 * s, 0.6, 0.52 * s, 0.57)); else lassen();
  } else if (phase === 'd') {
    // Draperie: zwei Griffe
    if (u > 7.4 && u < 9.2) halten(geistZug(u, 7.5, 9.0, 0.32 * s, 0.42, 0.52 * s, 0.3));
    else if (u > 9.6 && u < 11.4) halten(geistZug(u, 9.7, 11.2, 0.74 * s, 0.7, 0.58 * s, 0.84));
    else lassen();
  } else {
    // Entfalten: zwei Falten, dann giesst und öffnet es sich von selbst
    if (u > 12.8 && u < 13.9) halten(geistZug(u, 12.85, 13.8, 0.95 * s, 0.97, 0.52 * s, 0.6));
    else if (u > 14.2 && u < 15.2) halten(geistZug(u, 14.25, 15.1, 0.05 * s, 0.05, 0.42 * s, 0.38));
    else lassen();
  }
}

// ---------- Daumen: wo auflegen, und ein Ring, der sich füllt ----------
const daumenGelernt = [false, false, false];
let haltZeit = 0, daumenUhr = 0;
function daumenZeigen() {
  const d = $('daumen');
  clearTimeout(daumenUhr);
  if (!laeuft || VORSPANN || daumenGelernt[lesart]) { d.classList.add('weg'); daumenUhr = setTimeout(() => { d.hidden = true; }, 800); return; }
  $('daumen-text').textContent = TEXTE[sprache].daumen[lesart];
  d.hidden = false; requestAnimationFrame(() => d.classList.toggle('weg', finger.size > 0));
}
function haltZeigen(x, y) { const h = $('halt'); h.style.left = x + 'px'; h.style.top = y + 'px'; h.classList.add('da'); }
function haltBild(dt) {
  if (finger.size && !finger.has('geist')) haltZeit += dt; else haltZeit = 0;
  const g = [...finger.values()][0];
  const voll = lesart === 0 ? Math.min(1, rau.I) : lesart === 1 ? (g && g.tuch ? Math.min(1, Math.hypot(g.x - g.x0, g.y - g.y0) / innerHeight / 0.3) : 0) : (fz.falten.length + (fz.aktiv ? 1 : 0)) / FALTEN_MAX;
  $('halt-voll').style.strokeDashoffset = String(1 - Math.min(1, voll));
  const gelungen = lesart === 0 ? rau.klar > 0.5 : lesart === 1 ? !!tuch && tuch.stauchung > 0.04 : fz.falten.length >= 1;
  if (!daumenGelernt[lesart] && gelungen) { daumenGelernt[lesart] = true; daumenZeigen(); }
}

// ---------- Geführter Einstieg: zuerst Bild und Finger, dann die Lesarten, dann die Regler, zuletzt die Tasten ----------
const EINSTIEG = 'falte.einstieg';
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
const falzU = new Float32Array(20);
function faltenListe() { return fz.aktiv ? [...fz.falten, fz.aktiv] : fz.falten; }
function falzSetzen(u, liste) {
  falzU.fill(0);
  liste.slice(0, FALTEN_MAX).forEach((F, i) => falzU.set([F.nx, F.ny, F.c, F.w], i * 4));
  gl.uniform4fv(u.uFalz, falzU); gl.uniform1i(u.uFalzN, Math.min(FALTEN_MAX, liste.length)); gl.uniform1f(u.uBlatt, innerWidth / innerHeight);
}
function bild(ms) {
  const t = ms / 1000;
  fahrtSehen(); if (quelle === fotoBuehne) fotoMalen(performance.now() / 1000);
  const dtMs = ms - (letzteMs || ms - 16.7), dt = Math.min(0.1, Math.max(0.004, dtMs / 1000)); letzteMs = ms;
  tempoMessen(ms, dtMs);
  if (!scharfFangen()) { requestAnimationFrame(bild); return; }
  const seite = innerWidth / innerHeight, W = WERTE[lesart];

  if (geisterStart > 0) geist(t);
  haende(t, dt);

  const sz = zielBauen('szene', leinwand.width, leinwand.height, false);
  const dpr = leinwand.height / innerHeight;

  // Hantaï: während des Giessens die neue Leinwand rechnen
  if (fz.phase === 'giessen') {
    rechne(P.malen, lein[1], { uAlt: lein[0], uScharf: scharfTex }, (u) => {
      falzSetzen(u, fz.falten);
      gl.uniform1f(u.uSeite, seite); gl.uniform1f(u.uGuss, fz.guss); gl.uniform1f(u.uDeck, 0.35 + 0.65 * WERTE[2][1]);
      gl.uniform1f(u.uFarbe, WERTE[2][0]); gl.uniform1f(u.uHpx, lein[1].h);
      const [d, h] = TINTEN[fz.runde % TINTEN.length]; gl.uniform3f(u.uTinteD, ...d); gl.uniform3f(u.uTinteH, ...h);
    });
  }

  const mitKoernern = !!(P.kornPunkt && halbFloat);
  const zug = Math.min(1, rau.I);
  const rauR = rau.Rk * 1.7 + 0.05 * (0.4 + 0.6 * zug);
  rechne(P.szene, sz, { uScharf: scharfTex, uLein: fz.phase === 'giessen' ? lein[1] : lein[0] }, (u) => {
    gl.uniform1f(u.uSeite, seite); gl.uniform1f(u.uT, t % 1000); gl.uniform1f(u.uHpx, sz.h); gl.uniform1f(u.uDpr, dpr); gl.uniform1f(u.uArt, lesart);
    gl.uniform1f(u.uKoerner, mitKoernern ? 1 : 0); gl.uniform1f(u.uMeer, lesart === 0 ? rau.meer : 0);
    gl.uniform4f(u.uRau, rau.x, rau.y, rau.Rk, rau.klar); gl.uniform4f(u.uRauB, zug * zug * (3 - 2 * zug), rauR, rau.sprungR, rau.sprungA);
    falzSetzen(u, lesart === 2 ? faltenListe() : []);
    gl.uniform4f(u.uFalt, WERTE[2][0], WERTE[2][1], WERTE[2][2], fz.bemalt ? 1 : 0); gl.uniform1f(u.uGuss, fz.phase === 'giessen' ? fz.guss : 0);
  });
  if (mitKoernern && lesart === 0 && (rau.meer > 0.003 || rau.streuen)) koernerRechnen(t, dt, sz, seite, dpr, zug, rauR);
  if (lesart === 1 && tuch && tuch.aktiv && P.tuch) zeichneTuch(sz, seite, dpr, t);
  if (lesart === 2 && P.blatt) zeichneBlatt(sz, seite, dpr, t);
  nachbearbeiten(t, sz);
  haltBild(dt);

  // Ton
  const rascheln = tuch && tuch.aktiv ? Math.min(1, tuch.energie * 9) : 0, tiefe = tuch && tuch.aktiv ? Math.min(1, tuch.stauchung * 5) : 0;
  const papier = lesart === 2 && fz.aktiv ? bewegungHand : 0;
  const stumm = VORSPANN;
  klangBild({ meer: stumm ? 0 : lesart === 0 ? rau.meer : 0, zug: zug, klar: lesart === 0 ? rau.klar : 0, welle: WERTE[0][0],
    rascheln: lesart === 1 ? rascheln : 0, tiefe: lesart === 1 ? tiefe * tuchDa : 0, glanz: WERTE[1][2],
    papier, t });
  if (standbildWunsch) { standbildWunsch = false; leinwand.toBlob((b) => b && zeigen(b, 'falte-' + zeitstempel() + '.png')); }
  if (ersterLauf && bilderGezaehlt++ > 2) { ersterLauf = false; spur('✓ läuft'); }
  requestAnimationFrame(bild);
}
// die Körner: beim ersten Auflegen am Ort (das Bild, wie es ist), dann treibt sie das Meer, und der Daumen holt sie heim
let kornA = null, kornB = null;
function koernerRechnen(t, dt, sz, seite, dpr, zug, rauR) {
  if (!kornA) { kornA = zielBauen('kornA', KORN_S, KORN_S); kornB = zielBauen('kornB', KORN_S, KORN_S); }
  const W = WERTE[0];
  const rauB = [zug * zug * (3 - 2 * zug), rauR, 0, 0];
  const schritt = (init, h = dt) => {
    rechne(P.korn, kornB, { uZustand: kornA }, (u) => {
      gl.uniform1f(u.uDt, Math.min(h, 1 / 30)); gl.uniform1f(u.uT, t % 1000); gl.uniform1f(u.uInit, init ? 1 : 0);
      gl.uniform1f(u.uMeer, (0.35 + 0.9 * W[0]) * rau.meer); gl.uniform1f(u.uWelle, 0.4 + 1.2 * W[0]); gl.uniform1f(u.uRuhe, rau.ruhe);
      gl.uniform1f(u.uS, KORN_S); gl.uniform1f(u.uSeiteK, seite);
      gl.uniform4f(u.uRau, rau.x, rau.y, rau.Rk, rau.klar); gl.uniform4f(u.uRauB, ...rauB);
    });
    [kornA, kornB] = [kornB, kornA];
  };
  if (rau.streuen) { schritt(true); rau.streuen = false; }
  const n = Math.min(3, Math.ceil(dt / (1 / 40)));
  for (let i = 0; i < n; i++) schritt(false, dt / n);
  gl.bindFramebuffer(gl.FRAMEBUFFER, sz.fb); gl.viewport(0, 0, sz.b, sz.h);
  const pr = P.kornPunkt; gl.useProgram(pr);
  gl.activeTexture(gl.TEXTURE2); gl.bindTexture(gl.TEXTURE_2D, kornA.tex); gl.uniform1i(pr.u.uZustand, 2);
  gl.activeTexture(gl.TEXTURE3); gl.bindTexture(gl.TEXTURE_2D, scharfTex); gl.uniform1i(pr.u.uScharf, 3);
  gl.uniform1f(pr.u.uS, KORN_S); gl.uniform1f(pr.u.uSeiteK, seite); gl.uniform1f(pr.u.uSeite, seite);
  gl.uniform4f(pr.u.uRau, rau.x, rau.y, rau.Rk, rau.klar); gl.uniform4f(pr.u.uRauB, ...rauB);
  gl.uniform1f(pr.u.uMeer, rau.meer); gl.uniform1f(pr.u.uT, t % 1000);
  const punkt = Math.max(1.6, 1.6 * dpr);
  gl.uniform1f(pr.u.uPunkt, punkt);
  // gestreut geben die Körner das Bild so hell wieder, wie es war: Körner je Bildpunkt mal Fläche eines Korns ergibt eins
  const dichte = (KORN_S * KORN_S) / (seite * sz.h * sz.h);
  const flaeche = 1.12 * (punkt / 2) * (punkt / 2);
  gl.uniform1f(pr.u.uHell, Math.min(6, 0.95 / (dichte * flaeche)));
  gl.enable(gl.BLEND); gl.blendFunc(gl.ONE, gl.ONE);
  gl.disableVertexAttribArray(0);
  gl.drawArrays(gl.POINTS, 0, KORN_S * KORN_S);
  gl.enableVertexAttribArray(0);
  gl.disable(gl.BLEND);
}
// das Tuch: Schatten aus dem Licht, dann der Tisch, dann der Stoff (mit Tiefe, damit Falten einander verdecken)
const TUCH_LICHT = (() => { const l = [-0.5, 0.62, 0.4], n = Math.hypot(...l); return l.map((x) => x / n); })();
// Tiefe für die Szene und eine Schattenkarte aus der Richtung des Lichts (halbe Grösse genügt, der Schatten ist weich)
const rz = {};
function raumZiele(sz) {
  // Tiefe für die Szene, und die Schattenkarte (halbe Grösse genügt, der Schatten ist weich)
  if (!rz.rb) { rz.rb = gl.createRenderbuffer(); rz.sTex = gl.createTexture(); rz.sFb = gl.createFramebuffer(); }
  if (rz.b !== sz.b || rz.h !== sz.h || rz.fb !== sz.fb) {
    rz.b = sz.b; rz.h = sz.h; rz.fb = sz.fb;
    gl.bindRenderbuffer(gl.RENDERBUFFER, rz.rb); gl.renderbufferStorage(gl.RENDERBUFFER, gl.DEPTH_COMPONENT24, sz.b, sz.h);
    gl.bindFramebuffer(gl.FRAMEBUFFER, sz.fb); gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.RENDERBUFFER, rz.rb);
    rz.sb = Math.max(256, Math.round(sz.b / 2)); rz.sh = Math.max(256, Math.round(sz.h / 2));
    gl.bindTexture(gl.TEXTURE_2D, rz.sTex);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.DEPTH_COMPONENT24, rz.sb, rz.sh, 0, gl.DEPTH_COMPONENT, gl.UNSIGNED_INT, null);
    for (const [k, w] of [[gl.TEXTURE_MIN_FILTER, gl.NEAREST], [gl.TEXTURE_MAG_FILTER, gl.NEAREST], [gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE], [gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE]]) gl.texParameteri(gl.TEXTURE_2D, k, w);
    gl.bindFramebuffer(gl.FRAMEBUFFER, rz.sFb); gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.TEXTURE_2D, rz.sTex, 0);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  }
  return rz;
}
let tg = null;
function tuchGL(T, sz) {
  if (!tg || tg.T !== T) {
    if (tg) { gl.deleteTexture(tg.lage); gl.deleteTexture(tg.norm); gl.deleteBuffer(tg.buf); gl.deleteBuffer(tg.idx); gl.deleteVertexArray(tg.vao); }
    const tex = () => { const x = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, x);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA16F, T.NX, T.NY, 0, gl.RGBA, gl.FLOAT, null);
      for (const [k, w] of [[gl.TEXTURE_MIN_FILTER, gl.NEAREST], [gl.TEXTURE_MAG_FILTER, gl.NEAREST], [gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE], [gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE]]) gl.texParameteri(gl.TEXTURE_2D, k, w);
      return x; };
    // das Netz: dreimal feiner als das Gitter der Simulation
    const R = leicht ? 2 : 3, MX = (T.NX - 1) * R + 1, MY = (T.NY - 1) * R + 1;
    const ecken = new Float32Array(MX * MY * 2);
    for (let j = 0; j < MY; j++) for (let i = 0; i < MX; i++) { ecken[(j * MX + i) * 2] = i / R; ecken[(j * MX + i) * 2 + 1] = j / R; }
    const idx = new Uint32Array((MX - 1) * (MY - 1) * 6); let n = 0;
    for (let j = 0; j < MY - 1; j++) for (let i = 0; i < MX - 1; i++) { const k = j * MX + i; idx.set([k, k + 1, k + MX, k + 1, k + MX + 1, k + MX], n); n += 6; }
    const vao = gl.createVertexArray(); gl.bindVertexArray(vao);
    const buf = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, buf); gl.bufferData(gl.ARRAY_BUFFER, ecken, gl.STATIC_DRAW);
    gl.enableVertexAttribArray(1); gl.vertexAttribPointer(1, 2, gl.FLOAT, false, 0, 0);
    const ib = gl.createBuffer(); gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, ib); gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, idx, gl.STATIC_DRAW);
    gl.bindVertexArray(null);
    tg = { ...(tg || {}), T, lage: tex(), norm: tex(), buf, idx: ib, vao, n };
    spur('Tuch ' + T.NX + '×' + T.NY + ', Netz ' + MX + '×' + MY);
  }
  raumZiele(sz);
  return tg;
}
function schattenBinden(pr, e, bias) {
  gl.activeTexture(gl.TEXTURE0 + e); gl.bindTexture(gl.TEXTURE_2D, rz.sTex); gl.uniform1i(pr.u.uSchatten, e);
  gl.uniform2f(pr.u.uSchattenPx, 1 / rz.sb, 1 / rz.sh); gl.uniform1f(pr.u.uBias, bias);
}
// das Blatt im Raum: Schatten, Tisch, Papier
const BLATT_HC = 2.6, BLATT_DICKE = 0.0022;
let bg = null;
function zeichneBlatt(sz, seite, dpr, t) {
  if (!bg) {
    bg = { daten: new Float32Array(9 * 60000), vao: gl.createVertexArray(), buf: gl.createBuffer() };
    gl.bindVertexArray(bg.vao); gl.bindBuffer(gl.ARRAY_BUFFER, bg.buf); gl.bufferData(gl.ARRAY_BUFFER, bg.daten.byteLength, gl.DYNAMIC_DRAW);
    for (const [ort, n, ab] of [[1, 3, 0], [2, 2, 3], [3, 3, 5], [4, 1, 8]]) { gl.enableVertexAttribArray(ort); gl.vertexAttribPointer(ort, n, gl.FLOAT, false, 36, ab * 4); }
    gl.bindVertexArray(null);
  }
  const liste = faltenListe().slice(0, FALTEN_MAX);
  const st = stueckeBauen(liste, seite);
  const n = blattDreiecke(st, liste, liste.map((F) => F.w), bg.daten);
  gl.bindBuffer(gl.ARRAY_BUFFER, bg.buf); gl.bufferSubData(gl.ARRAY_BUFFER, 0, bg.daten, 0, n * 9);
  raumZiele(sz);
  const raum = (pr) => { gl.useProgram(pr); gl.uniform1f(pr.u.uSeite, seite); gl.uniform1f(pr.u.uHc, BLATT_HC); gl.uniform1f(pr.u.uDicke, BLATT_DICKE); gl.uniform3f(pr.u.uLicht, ...TUCH_LICHT); };
  // 1. Schattenkarte
  gl.bindFramebuffer(gl.FRAMEBUFFER, rz.sFb); gl.viewport(0, 0, rz.sb, rz.sh);
  gl.enable(gl.DEPTH_TEST); gl.depthFunc(gl.LESS); gl.depthMask(true); gl.clearDepth(1); gl.clear(gl.DEPTH_BUFFER_BIT);
  gl.colorMask(false, false, false, false);
  raum(P.blattSchatten);
  gl.bindVertexArray(bg.vao); gl.drawArrays(gl.TRIANGLES, 0, n); gl.bindVertexArray(null);
  gl.colorMask(true, true, true, true);
  // 2. der Tisch
  gl.disable(gl.DEPTH_TEST);
  rechne(P.tisch, sz, {}, (u) => {
    gl.uniform1f(u.uSeite, seite); gl.uniform1f(u.uHpx, sz.h); gl.uniform1f(u.uT, t % 1000); gl.uniform3f(u.uLicht, ...TUCH_LICHT);
    schattenBinden(P.tisch, 6, 0.00025);
  });
  // 3. das Papier
  gl.enable(gl.DEPTH_TEST); gl.clear(gl.DEPTH_BUFFER_BIT);
  const pr = P.blatt; raum(pr);
  gl.activeTexture(gl.TEXTURE2); gl.bindTexture(gl.TEXTURE_2D, scharfTex); gl.uniform1i(pr.u.uScharf, 2);
  gl.activeTexture(gl.TEXTURE3); gl.bindTexture(gl.TEXTURE_2D, (fz.phase === 'giessen' ? lein[1] : lein[0]).tex); gl.uniform1i(pr.u.uLein, 3);
  schattenBinden(pr, 6, 0.00025);
  gl.uniform1f(pr.u.uHpx, sz.h); gl.uniform1f(pr.u.uDpr, dpr); gl.uniform1f(pr.u.uT, t % 1000);
  gl.uniform1f(pr.u.uGuss, fz.phase === 'giessen' ? fz.guss : 0); gl.uniform1f(pr.u.uFalzRelief, WERTE[2][2]);
  gl.bindVertexArray(bg.vao); gl.drawArrays(gl.TRIANGLES, 0, n); gl.bindVertexArray(null);
  gl.disable(gl.DEPTH_TEST);
}
function zeichneTuch(sz, seite, dpr, t) {
  const T = tuch, G = tuchGL(T, sz);
  T.ausgeben();
  gl.bindTexture(gl.TEXTURE_2D, G.lage); gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, T.NX, T.NY, gl.RGBA, gl.FLOAT, T.lage);
  gl.bindTexture(gl.TEXTURE_2D, G.norm); gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, T.NX, T.NY, gl.RGBA, gl.FLOAT, T.normale);
  const gemeinsam = (pr) => {
    gl.useProgram(pr);
    gl.activeTexture(gl.TEXTURE2); gl.bindTexture(gl.TEXTURE_2D, G.lage); gl.uniform1i(pr.u.uLage, 2);
    gl.activeTexture(gl.TEXTURE3); gl.bindTexture(gl.TEXTURE_2D, G.norm); gl.uniform1i(pr.u.uNorm, 3);
    gl.uniform2f(pr.u.uGitter, T.NX, T.NY); gl.uniform2f(pr.u.uMasche, T.hx, T.hy); gl.uniform1f(pr.u.uSeite, seite);
    gl.uniform3f(pr.u.uLicht, ...TUCH_LICHT);
  };
  const schattenGeben = (pr, e) => {
    schattenBinden(pr, e, 0.004);
  };
  // 1. Schattenkarte: aus der Richtung des Lichts, nur die Tiefe
  gl.bindFramebuffer(gl.FRAMEBUFFER, rz.sFb); gl.viewport(0, 0, rz.sb, rz.sh);
  gl.enable(gl.DEPTH_TEST); gl.depthFunc(gl.LESS); gl.depthMask(true);
  gl.clearDepth(1); gl.clear(gl.DEPTH_BUFFER_BIT);
  gl.colorMask(false, false, false, false);
  gemeinsam(P.tuchSchatten);
  gl.bindVertexArray(G.vao); gl.drawElements(gl.TRIANGLES, G.n, gl.UNSIGNED_INT, 0); gl.bindVertexArray(null);
  gl.colorMask(true, true, true, true);
  // 2. der Tisch
  gl.disable(gl.DEPTH_TEST);
  rechne(P.tisch, sz, {}, (u) => {
    gl.uniform1f(u.uSeite, seite); gl.uniform1f(u.uHpx, sz.h); gl.uniform1f(u.uT, t % 1000); gl.uniform3f(u.uLicht, ...TUCH_LICHT);
    schattenGeben(P.tisch, 6);
  });
  // 3. der Stoff
  gl.enable(gl.DEPTH_TEST); gl.clear(gl.DEPTH_BUFFER_BIT);
  gemeinsam(P.tuch);
  gl.activeTexture(gl.TEXTURE4); gl.bindTexture(gl.TEXTURE_2D, scharfTex); gl.uniform1i(P.tuch.u.uScharf, 4);
  schattenGeben(P.tuch, 6);
  const W1 = WERTE[1];
  gl.uniform1f(P.tuch.u.uHpx, sz.h); gl.uniform1f(P.tuch.u.uDpr, dpr); gl.uniform1f(P.tuch.u.uGlanz, W1[2]); gl.uniform1f(P.tuch.u.uSchwer, W1[0]);
  gl.uniform1f(P.tuch.u.uDa, Math.min(1, tuchDa * 1.5));
  gl.bindVertexArray(G.vao); gl.drawElements(gl.TRIANGLES, G.n, gl.UNSIGNED_INT, 0); gl.bindVertexArray(null);
  gl.disable(gl.DEPTH_TEST);
}
function nachbearbeiten(t, sz) {
  const B = leinwand.width, H = leinwand.height, b4 = Math.max(1, Math.round(B / 4)), h4 = Math.max(1, Math.round(H / 4));
  const gA = zielBauen('glowA', b4, h4), gB = zielBauen('glowB', b4, h4);
  rechne(P.hell, gA, { uQ: sz }, (u) => { gl.uniform2f(u.uPx, 1.5 / B, 1.5 / H); gl.uniform1f(u.uAb, [0.8, 0.66, 0.72][lesart]); });
  rechne(P.weich, gB, { uQ: gA }, (u) => gl.uniform2f(u.uRichtung, 1.6 / b4, 0));
  rechne(P.weich, gA, { uQ: gB }, (u) => gl.uniform2f(u.uRichtung, 0, 1.6 / h4));
  const tief = lesart === 0 ? rau.meer : lesart === 1 ? tuchDa : fz.falten.length ? 1 : 0;
  rechne(P.zusammen, null, { uSzene: sz, uGlow: gA }, (u) => {
    gl.uniform2f(u.uPx, 1 / B, 1 / H); gl.uniform1f(u.uGlowStaerke, [0.12, 0.2, 0.14][lesart] * (0.3 + 0.7 * tief));
    gl.uniform1f(u.uT, t % 100); gl.uniform1f(u.uKorn, 0.024 + 0.012 * tief);
  });
}

// ---------- Ergebnis (wie im Ritornell) ----------
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
    zeigen(b, 'falte-' + zeitstempel() + (b.type.includes('mp4') ? '.mp4' : '.webm'));
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
// Die Randfläche zeigt immer nur eines: den Titel einer Lesart oder eine Glosse. Was dazukommt, wartet.
let randJetzt = null, randUhr = 0, randWechsel = 0;
const randSchlange = [], glosseGezeigt = new Set();
const randDauer = (art) => (art === 'titel' ? 2600 : innerWidth <= 560 ? 5200 : 7000);
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
    const g = TEXTE[sprache].glossen[e.k]; glosseGezeigt.add(e.k);
    $('glosse-begriff').textContent = g.begriff;
    $('glosse-satz').textContent = g.satz;
    $('glosse-zitat').textContent = g.zitat; $('glosse-zitat').hidden = !g.zitat;
    $('glosse-quelle').textContent = g.quelle; $('glosse-quelle').hidden = !g.quelle;
    const el = $('glosse'); el.hidden = false; requestAnimationFrame(() => requestAnimationFrame(() => el.classList.add('da')));
  }
  clearTimeout(randUhr); randUhr = setTimeout(randWeg, randDauer(e.art));
}
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
    return 'Falte ' + (document.querySelector('script[src*="falte.js"]')?.getAttribute('src') || '') + '\n' + navigator.userAgent + '\nGrafik: ' + (grafikName || '?') +
      (leicht ? ' (leicht)' : '') + (halbFloat ? '' : ' · 8 Bit') + (P.kornPunkt ? '' : ' · ohne Körner') + '\nVorher: ' + spurVorher.join(' → ') + '\nJetzt: ' + jetzt.join(' → ');
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

// Einstieg: «Rauschen»
lesartWaehlen(0, true);
uebersetzen();
// Direktstart für Tests und Vorführungen: ?beispiel, ?lesart=0|1|2
if (Q.has('lesart')) lesartWaehlen(Math.max(0, Math.min(2, +Q.get('lesart') || 0)), true);
if (Q.has('beispiel')) beispielStarten();
// für Prüfungen: Werte setzen, Finger von aussen führen
window.__falte = { WERTE, beruehren, bewegen, loslassen, lesartWaehlen, allesLoesen, rau, fz, tuch: () => tuch, zustand: () => ({ lesart, phase: fz.phase, falten: fz.falten.length, I: rau.I, klar: rau.klar }) };
