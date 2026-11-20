// Brillante Ideen: eine Titelsequenz mit dem Brillanten aus dem Kristallbild (alpha/deleuze/kristall/).
// Der Punkt hinter «Ideen» ist ein echter, lichtbrechender Brillant (derselbe Schliff, derselbe Strahlengang).
// Dreht man ihn, legen sich die Bereiche als Glasschichten über die Seite; der Übergang geschieht Facette um Facette,
// jede Facette des Steins bricht das Bild auf ihre Weise. Alles rechnet im Browser (WebGL 2), nichts wird geladen ausser Schrift.

import { schliffEbenen } from '../deleuze/kristall/schliffe.js?v=8';

const $ = (id) => document.getElementById(id);
const leinwand = $('leinwand');

// ---------- Inhalt (Beispiele aus ornament.cloud) ----------
const BEREICHE = [
  { name: 'Webdesign', satz: 'Websites, die schnell sind, eigen und ohne Dienste von aussen.', href: '/angebot/webdesign/', ton: [124, 108, 255] },
  { name: 'Apps', satz: 'Denkspiele, Farbräder und Bildmaschinen, die im Browser laufen.', href: '/apps/', ton: [84, 146, 255] },
  { name: 'Vermittlung', satz: 'Seminare, Workshops und Beratung für Schulen, Teams und Institutionen.', href: '/angebot/vermittlung/', ton: [64, 196, 186] },
  { name: 'Kuration', satz: 'Ausstellungen denken, ordnen, hängen.', href: '/angebot/kuration/', ton: [232, 182, 98] },
  { name: 'Editionen', satz: 'Originale und Prints in kleinen Auflagen.', href: '/werke/', ton: [236, 112, 140] }
];
// Die Farben der Schichten sind das Spektrum des Steins: Violett, Blau, Türkis, Gold, Rosa.
const ZUSTAENDE = BEREICHE.length + 1;          // 0 = Titel, 1–5 = Bereiche
const SCHRITT = (Math.PI * 2) / ZUSTAENDE;      // eine Sechsteldrehung je Bereich

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
uniform float uDimm;               // offenes Menü: die Seite tritt zurück              // kurzes Aufblitzen, wenn der Stein seinen Platz findet
uniform vec2 uGem;                 // Mitte des Steins (Bildpunkte der Leinwand, unten links = 0)
uniform float uGemR;               // Radius des Steins in Bildpunkten
uniform vec2 uFeld;                // Mitte des grossen, unsichtbaren Steins, der das Bild zerlegt
uniform float uGross;              // dessen Grösse in Bildpunkten
uniform vec2 uAufl;                // Leinwand in Bildpunkten
uniform float uRad, uT, uFeuer;
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
  c += vec3(1.0, 0.985, 0.96) * (pow(max(dot(d, L1), 0.0), 22.0) * 1.5 + pow(max(dot(d, L2), 0.0), 34.0) * 1.1 + pow(max(dot(d, L3), 0.0), 10.0) * 0.35);
  return c + vec3(0.045, 0.04, 0.085);
}

vec4 stein(vec2 gq, float m){
  vec3 ro = vec3(0.0, 0.0, AUGE), rd = normalize(vec3(gq, -AUGE));
  float t0; int i0;
  if (!(treffen(ro, rd, t0, i0) && t0 > 0.0)) return vec4(0.0);
  vec3 p0 = ro + rd * t0, n0 = uN[i0];
  float zweite = -1e9;
  for (int k = 0; k < MAX_K; k++) { if (k >= uK) break; if (k != i0) zweite = max(zweite, dot(p0, uN[k]) - uR[k]); }
  float kante = 1.0 - smoothstep(0.0, 0.035, -zweite);
  vec3 rf = reflect(rd, n0);
  float fres = 0.04 + 0.96 * pow(1.0 - abs(dot(rd, n0)), 5.0);
  vec3 innen = vec3(0.0), summe = vec3(0.0);
  float glut = 0.0;
  for (int w = 0; w < WELLEN; w++) {
    float l = mix(410.0, 690.0, (float(w) + 0.5) / float(WELLEN));
    float ior = 2.32 + 0.034 / pow(l / 1000.0, 2.0);   // Diamant: 2.42, deutliche Dispersion
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
  float glanz = pow(max(dot(rf, L1), 0.0), 160.0) + 0.7 * pow(max(dot(rf, L2), 0.0), 220.0);
  vec3 col = mix(innen, umwelt(rf, m), clamp(fres, 0.0, 1.0)) + glanz;
  col = mix(col, vec3(1.0, 0.99, 0.97), kante * 0.22);
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
    m = smoothstep(th, th + 0.28, uF);
    vec2 off = n.xy * uWirbel * 0.03 * vec2(uAufl.y / uAufl.x, 1.0);
    col = vec3(seite(uv + off * 0.9, m).r, seite(uv + off, m).g, seite(uv + off * 1.1, m).b);
    col *= 1.0 + uWirbel * 0.2 * (dot(n, normalize(vec3(0.35, 0.6, 0.72))) - 0.62);
    // keine Kanten: an den Facettengrenzen nur ein Hauch Licht, weich über viele Bildpunkte
    float naht = 1.0 - smoothstep(0.0, 28.0 / uGross, zweit - best);
    col += naht * uWirbel * vec3(0.035, 0.034, 0.045);
    // in der Mitte der Drehung löst sich die Schrift ins Leere: das alte Wort geht, bevor das neue kommt
    col = mix(col, texture(uLeer, uv).rgb, pow(sin(3.14159 * uF), 2.0) * 0.4);
  } else {
    m = uF >= 0.9995 ? 1.0 : 0.0;
    col = seite(uv, m);
  }

  if (uDimm > 0.0) col = mix(col, texture(uLeer, uv).rgb * 0.85, uDimm);
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
  o = vec4(col, glow);
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
  const ref = c.measureText('Brillante Ideen').width + 30;
  const fs = Math.round(Math.min(hoch ? 46 : 84, (W * (hoch ? 0.76 : 0.6)) / ref * 100));
  c.font = `600 ${fs}px ${SCHRIFT}`; if ('letterSpacing' in c) c.letterSpacing = SPERREN(fs);
  const gemR = fs * 0.27, luecke = fs * 0.06, y = Math.round(H * 0.47 + fs * 0.35);
  const satz = Math.round(hoch ? 16 : 19);
  const saetze = ['Brillante Ideen', ...BEREICHE.map((b) => b.name)].map((t, k) => {
    const b = c.measureText(t).width, x = (W - (b + luecke + gemR * 2)) / 2;
    return { t, x, y, gem: { x: x + b + luecke + gemR, y: y - gemR * 0.62 } };
  });
  // Glasscheibe der Bereiche: das Wort steht, wo der Titel stand; der Titel liegt verschwommen darunter
  const sw = Math.min(W - (hoch ? 28 : 80), 620), pad = hoch ? 34 : 48;
  const scheibe = { x: (W - sw) / 2, y: y - fs * 0.95 - pad, w: sw, h: pad * 2 + fs * 0.95 + satz * 6.2 + 40 };
  // offenes Menü: der Stein gross über der Mitte, die Bereiche darunter
  const menuGem = { x: W / 2, y: Math.round(H * (hoch ? 0.36 : 0.34)), r: Math.min(W, H) * (hoch ? 0.16 : 0.1) };
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
  const z = lay.saetze[k];
  c.save();
  c.font = `600 ${lay.fs}px ${SCHRIFT}`; if ('letterSpacing' in c) c.letterSpacing = SPERREN(lay.fs);
  c.textBaseline = 'alphabetic';
  const g = c.createLinearGradient(0, z.y - lay.fs * 0.75, 0, z.y + lay.fs * 0.05);
  g.addColorStop(0, '#fbfaff'); g.addColorStop(0.65, '#e6e2f0'); g.addColorStop(1, '#bdb7cf');
  c.fillStyle = g; c.fillText(z.t, z.x, z.y);
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
function zeilenUmbruch(c, text, breite) {
  const w = text.split(' '), z = []; let akt = '';
  for (const s of w) { const p = akt ? akt + ' ' + s : s; if (c.measureText(p).width > breite && akt) { z.push(akt); akt = s; } else akt = p; }
  if (akt) z.push(akt);
  if (z.length < 2) return z;
  // ausgleichen: so schmal wie möglich bei gleicher Zeilenzahl, damit kein Wort allein steht
  let b = breite;
  while (b > 120) { const n = zeilenUmbruch(c, text, b - 10); if (n.length !== z.length) break; b -= 10; }
  return b === breite ? z : zeilenUmbruch(c, text, b);
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
}

// ---------- Brillant: Ebenen und Drehung ----------
// Christian, 20.11.2026: «weniger flach». Derselbe Schliff, in der Höhe gestreckt (tiefere Krone und Pavillon),
// und weniger geneigt gezeigt, damit man das Profil des Brillanten sieht und nicht nur seine Tafel.
const HOEHE = 1.3;
const roh = schliffEbenen('brillant', 1 / 1.15).map(([x, y, z, d]) => { const n = [x, y / HOEHE, z], l = Math.hypot(...n); return [n[0] / l, n[1] / l, n[2] / l, d / l]; });
const K = roh.length;
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
aufZeiger('pointerdown', (e) => {
  finger.set(e.pointerId, { x: e.clientX, y: e.clientY });
  try { e.currentTarget.setPointerCapture(e.pointerId); } catch {}
  tipp = { x: e.clientX, y: e.clientY, t: performance.now() };
  gezogen = true; ziel = null; omega = 0; letzteZug = performance.now();
  zugStart = Math.round(phi / SCHRITT) * SCHRITT; phi = zugStart;
});
aufZeiger('pointermove', (e) => {
  const f = finger.get(e.pointerId); if (!f || !gezogen) return;
  const dx = e.clientX - f.x, dy = e.clientY - f.y; f.x = e.clientX; f.y = e.clientY;
  letzteZug = performance.now();
  // waagrecht und senkrecht drehen beide: nach links oder oben wischen führt weiter.
  // Der Finger zieht nur zäh, und nie weiter als knapp einen Bereich.
  const k = 1.5 / Math.min(innerWidth, innerHeight);
  phi = Math.max(zugStart - SCHRITT * 0.85, Math.min(zugStart + SCHRITT * 0.85, phi + (-dx - dy * 0.8) * k));
});
const loslassen = (e) => {
  if (!finger.delete(e.pointerId)) return;
  if (finger.size) return;
  const warGezogen = gezogen; gezogen = false; omega = 0;
  // Tippen: auf den Stein öffnet und schliesst das Menü; daneben schliesst es nur
  if (tipp && Math.hypot(e.clientX - tipp.x, e.clientY - tipp.y) < 10 && performance.now() - tipp.t < 400) {
    if (warGezogen) phi = zugStart;
    const treffer = Math.hypot(e.clientX - gemJetzt.x, e.clientY - gemJetzt.y) < Math.max(30, gemJetzt.r * 2.2);
    if (treffer) menuSchalten(!menuAuf); else if (menuAuf) menuSchalten(false);
    ziel = Math.round(phi / SCHRITT) * SCHRITT;
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
  e.preventDefault();
  const jetzt = performance.now();
  if (jetzt < radSperre) { radSperre = Math.max(radSperre, jetzt + 260); return; }
  radSumme += e.deltaY + e.deltaX;
  if (Math.abs(radSumme) > 60) { weiter(Math.sign(radSumme)); radSumme = 0; radSperre = jetzt + 1500; }
}, { passive: false });
addEventListener('keydown', (e) => {
  if (['ArrowRight', 'ArrowDown', 'PageDown', ' '].includes(e.key)) { e.preventDefault(); weiter(1); }
  else if (['ArrowLeft', 'ArrowUp', 'PageUp'].includes(e.key)) { e.preventDefault(); weiter(-1); }
  else if (e.key === 'Escape' && menuAuf) menuSchalten(false);
  else if (e.key === 'Home') hin(0);
  else if (e.key === 'Enter' && document.activeElement === document.body) menuSchalten(!menuAuf);
});

// Menü: öffnet sich, wenn man den Stein antippt; der Stein steht dann gross über den Bereichen
const nav = $('bereiche');
['Brillante Ideen', ...BEREICHE.map((b) => b.name)].forEach((name, i) => {
  const t = document.createElement('button'); t.type = 'button'; t.textContent = name; if (!i) t.className = 'start';
  t.addEventListener('click', () => { menuSchalten(false); hin(i); });
  nav.append(t);
});
const knoepfe = [...nav.children].slice(1);
const steinKnopf = $('stein');
steinKnopf.addEventListener('click', () => menuSchalten(!menuAuf));
function menuSchalten(auf) {
  menuAuf = auf; spur(auf ? 'Menü auf' : 'Menü zu');
  document.body.classList.toggle('menu-auf', auf);
  nav.inert = !auf; steinKnopf.setAttribute('aria-expanded', String(auf));
}
nav.inert = true;
const mehr = $('mehr');

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
let praes = 0;
function projizieren(zustand, ruht, f, mu, gx, gy, rr) {
  const soll = ruht && zustand > 0 && mu > 0.6 ? 1 : 0;
  // langsam vortreten, rasch zurück, sobald der Stein sich wieder dreht
  praes += (soll - praes) * (1 - Math.pow(soll ? 0.95 : 0.85, f));
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
let letzteMs = 0, ersterLauf = true, zustandGezeigt = -1, blitz = 0, gelandet = false;
function bild(ms) {
  requestAnimationFrame(bild);
  if (document.hidden || !lay) return;
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
  const wirbel = Math.min(1, Math.sin(Math.PI * fr) * 1.1 + Math.min(0.5, Math.abs(omega) * 3));

  // Auftakt
  const ta = AUFTAKT ? t / AUFTAKT : 1;
  const zeigen = AUFTAKT ? sanft((t - 0.9) / 1.7) : 1;
  const flug = AUFTAKT ? ausrollen((t - 0.9) / 1.5) : 1;
  if (!gelandet && flug >= 1) { gelandet = true; blitz = 1; document.body.classList.add('bereit'); }
  blitz *= Math.pow(0.93, f);

  const ease = (x) => x * x * (3 - 2 * x), e = ease(fr);
  const gA = lay.saetze[A].gem, gB = lay.saetze[B].gem;
  const gr = { x: gA.x + (gB.x - gA.x) * e, y: gA.y, r: lay.gemR }, grossR = Math.min(W, H) * 0.11;
  // Menü: der Stein steigt gross über die Mitte und kehrt beim zweiten Tippen an seinen Platz zurück
  menu += ((menuAuf ? 1 : 0) - menu) * (1 - Math.pow(0.9, f));
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
  const gier = -phi + auftaktDreh + atem * 0.18 * Math.sin(t * 0.45);
  const neig = 0.3 + atem * 0.08 * Math.sin(t * 0.31 + 1.0) + (1 - flug) * 0.35;
  const roll = atem * 0.05 * Math.sin(t * 0.23);
  ebenenDrehen(gier, neig, roll);

  // Menü und Verweis
  const zustand = zuZustand(phi);
  const ruht = !gezogen && Math.abs(fr - Math.round(fr)) < 0.03 && Math.abs(omega) < 0.01;
  projizieren(zustand, !gezogen && Math.abs(fr - Math.round(fr)) < 0.015 && Math.abs(omega) < 0.003, f, mu, gx, gy, rr);
  if (zustand !== zustandGezeigt) {
    zustandGezeigt = zustand;
    knoepfe.forEach((k, i) => k.setAttribute('aria-current', String(i + 1 === zustand)));
    if (zustand) { const b = BEREICHE[zustand - 1]; mehr.href = b.href; mehr.setAttribute('aria-label', `${b.name}: mehr erfahren`); }
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
  gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, seitenTex[A]); gl.uniform1i(ort.uA, 0);
  gl.activeTexture(gl.TEXTURE1); gl.bindTexture(gl.TEXTURE_2D, seitenTex[B]); gl.uniform1i(ort.uB, 1);
  gl.activeTexture(gl.TEXTURE2); gl.bindTexture(gl.TEXTURE_2D, leerTex); gl.uniform1i(ort.uLeer, 2);
  gl.uniform3fv(ort.uN, ebenenW); gl.uniform1fv(ort.uR, abstandW); gl.uniform1i(ort.uK, K);
  gl.uniform1f(ort.uF, fr); gl.uniform1f(ort.uWirbel, ruhig ? Math.min(wirbel, 0.4) : wirbel);
  gl.uniform1f(ort.uZeigen, zeigen); gl.uniform1f(ort.uBlitz, ruhig ? 0 : blitz);
  gl.uniform2f(ort.uGem, gx * D, (H - gy) * D); gl.uniform1f(ort.uGemR, rr * D);
  gl.uniform2f(ort.uFeld, gx * D, (H - gy) * D); gl.uniform1f(ort.uGross, Math.max(W, H) * 0.55 * D); gl.uniform1f(ort.uDimm, sanft(menu));
  gl.uniform2f(ort.uAufl, Bw, Bh); gl.uniform1f(ort.uRad, huelle * 1.03); gl.uniform1f(ort.uT, t % 100); gl.uniform1f(ort.uFeuer, 1.4);
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
  gl.uniform1f(zusammen.ort.uGlowStaerke, 1.1); gl.uniform1f(zusammen.ort.uT, t % 100);
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
function flachStein(c, x, y, r, gier, neig, roll, glanz) {
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
    flaechen.push({ p, z, hell: Math.min(1.4, hell), funke, ton: (i * 47 + gier * 180) % 360 });
  });
  flaechen.sort((a, b) => a.z - b.z);
  c.save(); c.lineJoin = 'round';
  for (const f of flaechen) {
    c.beginPath(); f.p.forEach((q, j) => (j ? c.lineTo(x + q[0] * r, y - q[1] * r) : c.moveTo(x + q[0] * r, y - q[1] * r))); c.closePath();
    const v = Math.round(Math.min(255, 40 + f.hell * 200));
    c.fillStyle = `rgb(${Math.round(v * 0.92)},${Math.round(v * 0.93)},${v})`; c.fill();
    if (f.funke > 0.02) { c.fillStyle = `hsla(${f.ton},90%,70%,${f.funke * 0.55})`; c.fill(); }
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
function flachZeichnen(A, B, fr, zeigen, gx, gy, rr, gier, neig, roll, blitz, dimm) {
  const c = fctx; if (!c || !seitenBild[A]) return;
  c.setTransform(1, 0, 0, 1, 0, 0);
  const w = flach.width, h = flach.height;
  if (zeigen < 1) { c.drawImage(leerBild, 0, 0, w, h); c.globalAlpha = zeigen; }
  c.drawImage(seitenBild[A], 0, 0, w, h);
  c.globalAlpha = 1;
  if (fr > 0.001) {
    c.globalAlpha = fr * fr * (3 - 2 * fr); c.drawImage(seitenBild[B], 0, 0, w, h);
    // in der Mitte der Drehung löst sich die Schrift ins Leere
    c.globalAlpha = Math.pow(Math.sin(Math.PI * fr), 1.6) * 0.6; c.drawImage(leerBild, 0, 0, w, h);
    c.globalAlpha = 1;
  }
  if (dimm > 0.002) { c.globalAlpha = dimm; c.drawImage(leerBild, 0, 0, w, h); c.globalAlpha = 1; }
  c.setTransform(D, 0, 0, D, 0, 0);
  flachStein(c, gx, gy, rr, gier, neig, roll, ruhig ? 0 : blitz);
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
