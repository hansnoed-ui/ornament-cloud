// ORNAMENT LAB – lebendige Effekte auf der Grafikkarte (WebGL 2, seit Lab 0.1.17). Wie bei PHORMA III ist ein Bild hier eine Rechnung
// der Zeit: Der Film über Stationen fragt für jedes seiner Bilder den Effekt einer Station neu an, mit den Parametern zu diesem Zeitpunkt
// (die Modulation folgt dem Klang Bild für Bild). So zeigt jedes der 900 Bilder eines 30-s-Films ein echtes Effektbild, in Sekunden.
// Die Effekte sind dieselben Operationen wie auf der CPU (operationen/*.js), mit denselben Parametern und in derselben Reihenfolge der
// Schritte, aber nicht bitgleich: Die Grafikkarte tastet anders ab, und wo die CPU der Reihe nach würfelt (Glitch: Bandhöhen,
// Wiederholung: Zufall), würfelt hier jede Zelle für sich. Das Ergebnis im Projekt bleibt das der CPU; die Grafikkarte rechnet nur Filmbilder.
// Ohne WebGL 2 gibt gpuEffekte() null zurück, dann bleibt der Film wie bisher (Stationen, Kamera, Überblendung).
import { farbdrehung, NACHT } from "../kern/bilddaten.js";
import { lagenWinkel, lagen0 } from "../operationen/schraffur.js";

const ECKE = `#version 300 es
in vec2 aLage; void main() { gl_Position = vec4(aLage, 0.0, 1.0); }`;

// gemeinsam: Bildkoordinaten in Pixeln (y nach unten wie im Bild), Mitte eines Pixels bei .5; uO ist die linke obere Ecke des Bereichs
const KOPF = `#version 300 es
precision highp float; precision highp int;
uniform sampler2D uBild; uniform vec2 uG, uO; uniform float uAnteil; out vec4 farbe;
const vec3 NACHT = vec3(${NACHT.map((v) => (v / 255).toFixed(5)).join(", ")});
const vec3 PAPIER = vec3(${[244, 241, 234].map((v) => (v / 255).toFixed(5)).join(", ")});
vec2 lage() { return gl_FragCoord.xy - uO; }
vec3 roh(vec2 p) { return texture(uBild, p / uG).rgb; }
float lum(vec3 c) { return dot(c, vec3(0.2126, 0.7152, 0.0722)); }
vec2 rand(vec2 p, int art) {   // 0 spiegeln, 1 wiederholen, 2 Grund (ausserhalb bleibt ausserhalb)
  if (art == 1) return mod(p, uG);
  if (art == 0) { vec2 m = mod(p, 2.0 * uG); return min(m, 2.0 * uG - m); }
  return p;
}
bool drin(vec2 p) { return p.x >= 0.5 && p.y >= 0.5 && p.x <= uG.x - 0.5 && p.y <= uG.y - 0.5; }
vec3 taste(vec2 p, int art) { if (art == 2 && !drin(p)) return NACHT; return roh(clamp(rand(p, art), vec2(0.5), uG - 0.5)); }
float hash(uvec3 v) { v = v * 1664525u + 1013904223u; v.x += v.y * v.z; v.y += v.z * v.x; v.z += v.x * v.y; v ^= v >> 16u; v.x += v.y * v.z; return float(v.x) / 4294967295.0; }
void aus(vec3 c) { vec3 e = roh(lage()); farbe = vec4(clamp(mix(e, c, uAnteil), 0.0, 1.0), 1.0); }
`;

const FARBE = `${KOPF}
uniform mat3 uDreh; uniform float u_saettigung, u_kontrast, u_stufen, u_umkehren;
void main() {
  vec3 c = uDreh * roh(lage());
  float l = lum(c); c = l + (c - l) * u_saettigung; c = 0.5 + (c - 0.5) * u_kontrast;
  float st = floor(u_stufen + 0.5);
  if (st >= 2.0) c = floor(clamp(c, 0.0, 1.0) * (st - 1.0) + 0.5) / (st - 1.0);
  if (u_umkehren > 0.5) c = 1.0 - c;
  aus(c);
}`;

const GLITCH = `${KOPF}
uniform float u_kanalversatz, u_richtung, u_streifen, u_streifenHoehe, u_verschiebung, u_bloecke, u_blockgroesse, uSeed; uniform int uKanaele;
float band(float y) {
  float h = max(1.0, u_streifenHoehe * uG.y), j = floor(y / h);
  uint s = uint(uSeed);
  return hash(uvec3(uint(j), s, 4u)) < u_streifen ? floor((2.0 * hash(uvec3(uint(j), s, 5u)) - 1.0) * u_verschiebung * uG.x + 0.5) : 0.0;
}
float lies(vec2 q, int c) {
  float y = clamp(q.y, 0.0, uG.y - 1.0), x = mod(q.x + band(y), uG.x);
  return roh(vec2(x, y) + 0.5)[c];
}
void main() {
  vec2 q = floor(lage());
  float L = max(uG.x, uG.y), B = max(2.0, floor(u_blockgroesse * L + 0.5));
  vec2 b = floor(q / B), n = ceil(uG / B), off = vec2(0.0);
  uint s = uint(uSeed), bi = uint(b.y * n.x + b.x);
  if (hash(uvec3(bi, s, 1u)) < u_bloecke) off = floor(vec2(hash(uvec3(bi, s, 2u)), hash(uvec3(bi, s, 3u))) * n) * B - b * B;
  float a = radians(u_richtung), kv = u_kanalversatz * uG.x;
  vec2 c = floor(vec2(cos(a), sin(a)) * kv + 0.5), p = q + off;
  vec3 k = vec3(lies(p + c, 0), lies(p, 1), lies(p - c, 2));
  aus(uKanaele == 1 ? k.bgr : uKanaele == 2 ? k.gbr : k);
}`;

const VERZERRUNG = `${KOPF}
uniform float u_staerke, u_radius, u_mitteX, u_mitteY, u_frequenz, u_phase, u_segmente; uniform int uArt, uRand;
void main() {
  vec2 P = lage(), C = vec2(u_mitteX, u_mitteY) * uG, d = P - C, S = P;
  float r = length(d), R = max(1.0, u_radius * length(uG) / 2.0), s = u_staerke, ph = radians(u_phase);
  if (uArt == 0) { if (r < R) { float t = 1.0 - r / R, a = s * 6.2831853 * t * t; S = C + mat2(cos(a), sin(a), -sin(a), cos(a)) * d; } }
  else if (uArt == 1) { float e = s >= 0.0 ? 1.0 + 2.0 * s : 1.0 / (1.0 - 2.0 * s); if (r < R && r > 0.0) S = C + d * (R * pow(r / R, e)) / r; }
  else if (uArt == 2) { float amp = s * 0.06 * min(uG.x, uG.y); S = P + amp * sin(6.2831853 * u_frequenz * P.yx / uG.yx + ph); }
  else if (uArt == 3) { float v = (lum(roh(P)) - 0.5) * 2.0 * s * 0.15 * max(uG.x, uG.y); S = P + vec2(cos(ph), sin(ph)) * v; }
  else {
    float seg = 6.2831853 / floor(u_segmente + 0.5), a = atan(d.y, d.x) - ph;
    a = mod(a, seg); if (a > seg / 2.0) a = seg - a;
    S = C + r * exp2(-s) * vec2(cos(a + ph), sin(a + ph));
  }
  aus(taste(S, uRand));
}`;

const RASTER = `${KOPF}
uniform float u_zelle, u_winkel, u_gewicht, u_amplitude, u_umkehren; uniform int uArt, uFarbe;
float deckung(float a) { return clamp(0.5 - a, 0.0, 1.0); }
vec2 C; float co, si;
vec2 bild(vec2 uv) { return C + vec2(co * uv.x - si * uv.y, si * uv.x + co * uv.y); }
float abtasten(vec2 uv) { float l = lum(taste(bild(uv), 0)); return pow(clamp(u_umkehren > 0.5 ? l : 1.0 - l, 0.0, 1.0), u_gewicht); }
void main() {
  C = uG / 2.0;
  float c = max(2.0, u_zelle * max(uG.x, uG.y)), a = radians(u_winkel); co = cos(a); si = sin(a);
  vec2 d = lage() - C, uv = vec2(co * d.x + si * d.y, -si * d.x + co * d.y), f = uv;
  float D = 0.0;
  if (uArt == 4) { f = (floor(uv / c) + 0.5) * c; D = 1.0; }
  else if (uArt == 0) { f = (floor(uv / c) + 0.5) * c; D = deckung(length(uv - f) - c * 0.71 * sqrt(abtasten(f))); }
  else if (uArt == 1 || uArt == 2) {
    f.y = (floor(uv.y / c) + 0.5) * c;
    D = deckung(abs(uv.y - f.y) - abtasten(vec2(uv.x, f.y)) * c / 2.0);
    if (uArt == 2) {
      float fu = (floor(uv.x / c) + 0.5) * c, w2 = max(0.0, 2.0 * abtasten(vec2(fu, uv.y)) - 1.0), d2 = deckung(abs(uv.x - fu) - w2 * c / 2.0);
      if (d2 > D) { D = d2; f = vec2(fu, uv.y); }
    }
  } else {
    float amp = u_amplitude * c, dicke = max(1.0, c * 0.16), j0 = floor(uv.y / c), weit = ceil(u_amplitude) + 1.0;
    for (int k = 0; k < 10; k++) {
      float j = j0 - 1.0 + float(k); if (j > j0 + weit) break;
      float basis = (j + 0.5) * c, h = basis - amp * abtasten(vec2(uv.x, basis)), dd = deckung(abs(uv.y - h) - dicke / 2.0);
      if (dd > D) { D = dd; f = vec2(uv.x, basis); }
    }
  }
  vec3 grund = uFarbe == 2 ? NACHT : PAPIER, tinte = (uFarbe != 0 || uArt == 4) ? taste(bild(f), 0) : NACHT;
  aus(mix(grund, tinte, D));
}`;

const WIEDERHOLUNG = `${KOPF}
uniform float u_spalten, u_zeilen, u_groesse, u_drehung, u_falloffGroesse, u_falloffDrehung, u_spiegeln, uSeed; uniform int uFalloff, uGrund;
void main() {
  float sp = floor(u_spalten + 0.5), ze = floor(u_zeilen + 0.5), n = sp * ze;
  vec2 P = lage(), cel = uG / vec2(sp, ze), ij = min(floor(P / cel), vec2(sp, ze) - 1.0);
  float k = ij.y * sp + ij.x;
  float f = uFalloff == 0 ? (n > 1.0 ? k / (n - 1.0) : 0.5) : uFalloff == 2 ? hash(uvec3(uint(k), uint(uSeed), 7u)) : min(1.0, length((ij + 0.5) / vec2(sp, ze) - 0.5) / 0.70710678);
  float s = max(0.05, u_groesse * (1.0 + u_falloffGroesse * (2.0 * f - 1.0)));
  float rot = radians(u_drehung + u_falloffDrehung * 180.0 * (2.0 * f - 1.0)), fit = min(cel.x / uG.x, cel.y / uG.y) * s;
  vec2 l = P - (ij + 0.5) * cel, u = mat2(cos(-rot), sin(-rot), -sin(-rot), cos(-rot)) * l / fit;
  if (u_spiegeln > 0.5 && mod(ij.x + ij.y, 2.0) == 1.0) u.x = -u.x;
  vec2 q = u + uG / 2.0;
  aus(drin(q) ? roh(q) : uGrund == 1 ? PAPIER : NACHT);
}`;

// Feedback: jedes Filmbild ist eine Iteration auf dem vorigen (uRueck); die erste Iteration beginnt beim Eingang
const FEEDBACK = `${KOPF}
uniform sampler2D uRueck; uniform mat3 uDreh; uniform float u_zoom, u_drehung, u_versatzX, u_versatzY, u_mischung, u_abklingen; uniform int uMischart, uRand;
void main() {
  vec2 P = lage(), C = uG / 2.0, d = P - C;
  float a = radians(u_drehung), c = cos(a) / u_zoom, s = sin(a) / u_zoom;
  vec2 S = C + vec2(c * d.x + s * d.y, -s * d.x + c * d.y) - vec2(u_versatzX, u_versatzY) * uG;
  vec3 r = NACHT;
  if (uRand != 2 || drin(S)) r = u_abklingen * (uDreh * texture(uRueck, clamp(rand(S, uRand), vec2(0.5), uG - 0.5) / uG).rgb);
  vec3 e = roh(P), m = u_mischung * e;
  vec3 o = uMischart == 1 ? max(r, m + r * (1.0 - u_mischung)) : uMischart == 2 ? abs(r - m) : m + r * (1.0 - u_mischung);
  farbe = vec4(clamp(o, 0.0, 1.0), 1.0);
}`;

const KOPIE = `${KOPF}
void main() { farbe = vec4(roh(lage()), 1.0); }`;

// Licht: Auszug (verkleinert), zwei Durchgänge Gauss je Richtung, dann über das Bild
const AUSZUG = `${KOPF}
uniform float u_schwelle, u_weich;
void main() {
  vec3 c = roh(lage()); float l = lum(c), u = u_schwelle - u_weich, o = u_schwelle + u_weich;
  float t = o > u ? clamp((l - u) / (o - u), 0.0, 1.0) : (l >= u_schwelle ? 1.0 : 0.0);
  farbe = vec4(c * t * t * (3.0 - 2.0 * t), 1.0);
}`;
const GAUSS = `#version 300 es
precision highp float; uniform sampler2D uBild; uniform vec2 uG, uSchritt; uniform float uSigma; out vec4 farbe;
void main() {
  vec2 uv = gl_FragCoord.xy / uG; vec3 s = vec3(0.0); float w = 0.0; int r = int(min(24.0, ceil(3.0 * uSigma)));
  for (int i = -24; i <= 24; i++) { if (i < -r || i > r) continue; float g = exp(-float(i * i) / (2.0 * uSigma * uSigma + 1e-6)); s += g * texture(uBild, uv + float(i) * uSchritt).rgb; w += g; }
  farbe = vec4(s / w, 1.0);
}`;
const LICHT = `${KOPF}
uniform sampler2D uGlut1, uGlut2; uniform float uZwei, u_staerke, u_saettigung; uniform mat3 uDreh; uniform int uMischart;
void main() {
  vec2 P = lage(); vec3 q = roh(P), g = texture(uGlut1, P / uG).rgb + uZwei * texture(uGlut2, P / uG).rgb;
  g = uDreh * g; float l = lum(g); g = (l + (g - l) * u_saettigung) * u_staerke;
  aus(uMischart == 1 ? 1.0 - (1.0 - q) * (1.0 - min(g, 1.0)) : uMischart == 2 ? g : q + g);
}`;

// Linienbilder (seit Lab 0.1.36, operationen/linienbild.js): der Ton aus einer gröberen Stufe der Textur (der Stift mittelt eine kleine
// Fläche), Grund und Tinte nach der Wahl «Farben», ein Würfel und Wertrauschen für Zufall und Zittern
const LINIEN = `${KOPF}
uniform float u_gewicht, u_umkehren, uZeit; uniform int uFarbe;
float deck(float a) { return clamp(0.5 - a, 0.0, 1.0); }
float stufeFuer(float px) { return log2(max(1.0, px * float(textureSize(uBild, 0).x) / uG.x)); }
float ton(vec2 p, float lod) {
  float l = lum(textureLod(uBild, clamp(p, vec2(0.5), uG - 0.5) / uG, lod).rgb);
  return pow(clamp(u_umkehren > 0.5 ? l : 1.0 - l, 0.0, 1.0), u_gewicht);
}
vec3 grund() { return uFarbe == 2 ? NACHT : PAPIER; }
vec3 tinte(vec2 p) { return uFarbe == 0 ? NACHT : roh(clamp(p, vec2(0.5), uG - 0.5)); }
void zeichne(float d, vec2 p) { aus(mix(grund(), tinte(p), d)); }
float wuerfel(vec2 g, float s) { return hash(uvec3(uint(int(g.x) + 65536), uint(int(g.y) + 65536), uint(s))); }
float rausch(vec2 x, float s) {
  vec2 i = floor(x), f = x - i, u = f * f * (3.0 - 2.0 * f);
  float a = wuerfel(i, s), b = wuerfel(i + vec2(1.0, 0.0), s), c = wuerfel(i + vec2(0.0, 1.0), s), d = wuerfel(i + 1.0, s);
  return a + (b - a) * u.x + (c - a) * u.y + (a - b - c + d) * u.x * u.y;
}
`;

// Pulslinien: die Phase ist das Integral der Frequenz entlang des Trägers, hier mit 48 festen Stützstellen je Linie oder Windung (die CPU: je Linie eine Tabelle)
const PULS = `${LINIEN}
uniform float u_abstand, u_hub, u_dichte, u_ruhe, u_strich, u_winkel, u_mitteX, u_mitteY, u_phase; uniform int uTraeger, uWelle;
const float TAU = 6.2831853, PI = 3.14159265;
float freq(float T, float c) { return u_dichte * (u_ruhe + (1.0 - u_ruhe) * T) / c; }
vec2 welle(float f) {
  if (uWelle == 1) return vec2(0.63662 * asin(sin(f)), 0.63662 * sign(cos(f)));
  if (uWelle == 2) { float t = tanh(3.0 * sin(f)), n = tanh(3.0); return vec2(t / n, 3.0 * cos(f) * (1.0 - t * t) / n); }
  if (uWelle == 3) return vec2(0.0);
  return vec2(sin(f), cos(f));
}
void main() {
  vec2 P = lage(); float L = max(uG.x, uG.y), c = max(2.0, u_abstand * L), halb = max(0.5, u_strich * c * 0.5), lod = stufeFuer(c * 0.5);
  float v = 0.0, T = 0.0, phi = 0.0, dphi = 0.0, zentrum = 1.0, j = 0.0; bool da = true;
  const int K = 48;
  if (uTraeger == 0) {
    float a = radians(u_winkel); vec2 e = vec2(cos(a), sin(a)), q = vec2(-e.y, e.x), C = uG / 2.0, d = P - C;
    float u = dot(d, e), w = dot(d, q); j = floor(w / c + 0.5); v = w - j * c;
    // feste Stützstellen entlang der ganzen Linie, damit die Phase von Pixel zu Pixel stetig bleibt
    float R = ceil(length(uG) / 2.0) + 2.0, h = 2.0 * R / float(K), s = u + R;
    for (int k = 0; k < K; k++) phi += freq(ton(C + ((float(k) + 0.5) * h - R) * e + j * c * q, lod), c) * h * clamp((s - float(k) * h) / h, 0.0, 1.0);
    T = ton(C + u * e + j * c * q, lod); dphi = freq(T, c);
  } else {
    vec2 M = vec2(u_mitteX, u_mitteY) * uG, d = P - M; float r = length(d), th = atan(d.y, d.x) + PI;
    zentrum = min(1.0, r / (2.0 * c));
    if (uTraeger == 2) { j = floor(r / c + 0.5); da = j >= 1.0; } else { j = floor(r / c - th / TAU + 0.5); da = j >= 0.0; }
    if (da) {
      float tot = 0.0, teil = 0.0, dt = TAU / float(K);
      for (int k = 0; k < K; k++) {
        float tk = (float(k) + 0.5) * dt, rho = uTraeger == 2 ? j * c : c * (j + tk / TAU);
        float x = freq(ton(M + rho * vec2(cos(tk - PI), sin(tk - PI)), lod), c) * rho * dt;
        tot += x; teil += x * clamp((th - (tk - 0.5 * dt)) / dt, 0.0, 1.0);
      }
      float rho = uTraeger == 2 ? j * c : c * (j + th / TAU), st = max(1.0, floor(tot + 0.5)) / max(tot, 1e-6);
      v = r - rho; T = ton(M + rho * vec2(cos(th - PI), sin(th - PI)), lod); phi = teil * st; dphi = freq(T, c) * st;
    }
  }
  float D = 0.0;
  if (da) {
    float A = u_hub * T * zentrum * max(0.0, c / 2.0 - halb);
    vec2 w = welle(TAU * (phi + u_phase / 360.0 + uZeit)); float sg = A * w.y * TAU * dphi;
    D = deck(abs(v - A * w.x) / sqrt(1.0 + sg * sg) - halb);
    if (uWelle == 3) { float s = (mod(j, 4.0) + 0.5) / 4.0; D *= smoothstep(s - 0.04, s + 0.04, T); }
  }
  zeichne(D, P);
}`;

// Schraffur in Lagen: Winkel und Schwellen der Lagen kommen aus operationen/schraffur.js
const SCHRAFFUR = `${LINIEN}
uniform float u_abstand, u_strich, u_weich, u_zittern, u_anschwellen, uW0, uW1, uW2, uW3, uS0, uS1, uS2, uS3; uniform int uN;
void main() {
  vec2 P = lage(), d = P - uG / 2.0; float c = max(2.0, u_abstand * max(uG.x, uG.y)), halb = max(0.5, u_strich * c * 0.5), T = ton(P, stufeFuer(c * 0.5)), D = 0.0;
  for (int k = 0; k < 4; k++) {
    if (k >= uN) break;
    float s = k == 0 ? uS0 : k == 1 ? uS1 : k == 2 ? uS2 : uS3, a = radians(k == 0 ? uW0 : k == 1 ? uW1 : k == 2 ? uW2 : uW3);
    if (T < s - u_weich) continue;
    vec2 e = vec2(cos(a), sin(a)); float u = dot(d, e), w = -e.y * d.x + e.x * d.y + (fract(float(k) * 0.37) + uZeit) * c;
    float j0 = floor(w / c + 0.5); w += u_zittern * c * 0.7 * (rausch(vec2(u / (4.0 * c), j0 + 17.0 * float(k)), 3.0) - 0.5);
    float v = w - floor(w / c + 0.5) * c;
    float st = u_anschwellen > 0.5 ? 0.35 + 0.65 * min(1.0, clamp((T - s) / max(0.05, 1.0 - s), 0.0, 1.0) * 1.4 + 0.2) : 1.0;
    D = max(D, deck(abs(v) - halb * st) * smoothstep(s - u_weich, s + u_weich, T));
  }
  zeichne(D, P);
}`;

// Fliessfeld: zehn Schritte je Richtung entlang des Feldes, das Korn gemittelt mit einer laufenden Welle im Kern
const FLUSS = `${LINIEN}
uniform float u_laenge, u_koernung, u_kontrast, u_skala, u_drehung, uWandel, uSaat; uniform int uFeld;
float L, korn, ns, rg, lodG, cd, sd;
vec2 feld(vec2 q) {
  float a = 12.566371 * rausch(q / ns + uWandel * vec2(1.0, -0.7), uSaat); vec2 e = vec2(cos(a), sin(a));
  if (uFeld <= 1) {
    float g1 = max(1.0, rg * 0.5);
    vec2 g = vec2(ton(q + vec2(g1, 0.0), lodG) - ton(q - vec2(g1, 0.0), lodG), ton(q + vec2(0.0, g1), lodG) - ton(q - vec2(0.0, g1), lodG)) / (2.0 * g1);
    float b = length(g), w = min(1.0, b * rg * 6.0);
    if (b > 1e-6) { vec2 t = uFeld == 0 ? vec2(-g.y, g.x) / b : g / b; if (dot(t, e) < 0.0) t = -t; e = mix(e, t, w); }
  } else if (uFeld == 3) { vec2 d = q - uG / 2.0; float r = max(length(d), 1.0); e = e * 0.25 + vec2(-d.y, d.x) / r * 0.75; }
  e = normalize(e + 1e-6);
  return vec2(cd * e.x - sd * e.y, sd * e.x + cd * e.y);
}
float koernchen(vec2 q) { return wuerfel(floor(q / korn), uSaat + 7.0); }
float kernw(float k) { return (0.5 + 0.5 * cos(3.14159265 * k / 11.0)) * (0.6 + 0.4 * sin(6.2831853 * (0.15 * k - uZeit))); }
void main() {
  vec2 P = lage(); L = max(uG.x, uG.y); korn = max(1.0, u_koernung * L); ns = max(4.0, u_skala * L);
  float lang = u_laenge * L, h = lang / 10.0; rg = max(2.0, lang / 3.0); lodG = stufeFuer(rg); cd = cos(radians(u_drehung)); sd = sin(radians(u_drehung));
  float g0 = kernw(0.0), summe = koernchen(P) * g0, gs = g0;
  vec2 f0 = feld(P);
  for (int r = 0; r < 2; r++) {
    vec2 q = P, v = r == 0 ? f0 : -f0;
    for (int k = 1; k <= 10; k++) {
      q += v * h;
      if (q.x < 0.0 || q.y < 0.0 || q.x >= uG.x || q.y >= uG.y) break;
      vec2 f = feld(q); if (dot(f, v) < 0.0) f = -f; v = f;
      float w = kernw(float(k)); summe += koernchen(q) * w; gs += w;
    }
  }
  float st = clamp(0.5 + (summe / gs - 0.5) * u_kontrast, 0.0, 1.0), T = ton(P, stufeFuer(korn * 0.75));
  zeichne(smoothstep(0.95 - T, 1.05 - T, st) * smoothstep(0.0, 0.12, T), P);
}`;

// Punktieren: neun Nachbarzellen, je ein gewürfelter Punkt, der bleibt, wenn ein zweiter Würfel unter dem Ton liegt; im Film schimmern sie
const PUNKTIEREN = `${LINIEN}
uniform float u_abstand, u_punkt, u_wachsen, u_linie, u_zittern, uSaat; uniform int uArt;
void main() {
  vec2 P = lage(); float c = max(3.0, u_abstand * max(uG.x, uG.y)), lod = stufeFuer(c * 0.5), halb = max(0.5, u_linie * c * 0.5);
  float mind = uArt == 0 ? 0.0 : uArt == 1 ? 0.2 : 0.3, d1 = 1e9, d2 = 1e9, dp = 0.0; vec2 p1 = vec2(-1.0), pp = vec2(-1.0); vec2 g = floor(P / c);
  for (int oy = -1; oy <= 1; oy++) for (int ox = -1; ox <= 1; ox++) {
    vec2 z = g + vec2(ox, oy);
    float h1 = wuerfel(z, uSaat), h2 = wuerfel(z, uSaat + 1.0), h3 = wuerfel(z, uSaat + 2.0);
    vec2 sch = 0.15 * vec2(sin(6.2831853 * (uZeit + h1)) - sin(6.2831853 * h1), cos(6.2831853 * (0.8 * uZeit + h2)) - cos(6.2831853 * h2));
    vec2 q = (z + 0.5 + u_zittern * 0.9 * (vec2(h1, h2) - 0.5) + sch) * c;
    float T = ton(q, lod);
    if (h3 >= mind + (1.0 - mind) * T) continue;
    float d = length(P - q);
    if (d < d1) { d2 = d1; d1 = d; p1 = q; } else if (d < d2) d2 = d;
    if (uArt == 0) { float dd = deck(d - u_punkt * c * (1.0 - u_wachsen + u_wachsen * sqrt(T))); if (dd > dp) { dp = dd; pp = q; } }
  }
  if (uArt == 0) { zeichne(dp, pp.x < 0.0 ? P : pp); return; }
  if (p1.x < 0.0) { zeichne(0.0, P); return; }
  float kante = deck((d2 - d1) / 2.0 - halb);
  if (uArt == 1) { zeichne(max(kante, deck(d1 - max(0.8, halb * 1.6))), p1); return; }
  aus(mix(roh(clamp(p1, vec2(0.5), uG - 0.5)), uFarbe == 1 ? PAPIER : NACHT, kante));
}`;

// Teilung: geviertelt, solange das Feld dunkel (oder seine Viertel verschieden) genug ist; gemittelt über eine gröbere Stufe der Textur
const TEILUNG = `${LINIEN}
uniform float u_tiefe, u_schwelle, u_anstieg, u_strich, u_linien; uniform int uFuellung, uKriterium;
void main() {
  vec2 P = lage(); float Lg = max(uG.x, uG.y), halb = max(0.5, u_strich * Lg * 0.5), n = max(1.0, floor(u_linien + 0.5)), tiefe = floor(u_tiefe + 0.5);
  vec2 O = (uG - Lg) / 2.0, x0 = O, ij = vec2(0.0); float s = Lg, T = 0.0, t = 0.0;
  for (int k = 0; k < 9; k++) {
    t = float(k); s = Lg / exp2(t); ij = floor((P - O) / s); x0 = O + ij * s;
    T = ton(x0 + s / 2.0, stufeFuer(s));
    float m = T;
    if (uKriterium == 1) {
      float v = 0.0, l = stufeFuer(s / 2.0);
      for (int q = 0; q < 4; q++) { vec2 a = vec2(float(q % 2), float(q / 2)); float x = ton(x0 + (a + 0.5) * s / 2.0, l) - T; v += x * x; }
      m = min(1.0, 4.0 * sqrt(v / 4.0));
    }
    if (t >= tiefe - 1.0 || s < 8.0 || m <= u_schwelle + t * u_anstieg) break;
  }
  vec2 l = P - x0; float rand = min(min(l.x, s - l.x), min(l.y, s - l.y));
  if (uFuellung == 0) { aus(mix(textureLod(uBild, clamp(x0 + s / 2.0, vec2(0.5), uG - 0.5) / uG, stufeFuer(s)).rgb, uFarbe == 1 ? PAPIER : NACHT, deck(rand - halb))); return; }
  float D;
  if (uFuellung == 1) D = deck(rand - halb);
  else if (uFuellung == 3) D = deck(max(abs(l.x - s / 2.0), abs(l.y - s / 2.0)) - s * 0.46 * sqrt(T));
  else {
    float h = wuerfel(ij, t + 101.0), h2 = wuerfel(ij, t + 202.0);
    bool quer = T + 0.35 * (sin(6.2831853 * (uZeit + h2)) - sin(6.2831853 * h2)) > h;
    vec2 u = l / s; float ax = quer ? 1.0 : 0.0, r = min(length(u - vec2(ax, 0.0)), length(u - vec2(1.0 - ax, 1.0))), q = r * n - 0.5;
    D = r <= 1.0 ? deck(abs(q - floor(q + 0.5)) / n * s - halb) : 0.0;
  }
  zeichne(D, P);
}`;

const index = (wert, liste) => Math.max(0, liste.indexOf(wert));
const RAND = ["spiegeln", "wiederholen", "grund"];
/** Ton und Farben der Linienbilder; uZeit: wie weit die Zeichnung von selbst gelaufen ist (Umläufe) */
const tonU = (p, t) => ({ u_gewicht: p.gewicht, u_umkehren: p.umkehren ? 1 : 0, uFarbe: { i: index(p.farbe, ["tinte", "papier", "nacht"]) }, uZeit: (p.lauf ?? 0) * t });

/** je Operation: Programm und Uniforms aus den Parametern; t (s) und schritt (Bild der Station) für das, was sich von selbst bewegt */
const EFFEKTE = {
  "lab.farbe": { quelle: FARBE, uniforms: (p) => ({ uDreh: farbdrehung(p.farbdrehung), u_saettigung: p.saettigung, u_kontrast: p.kontrast, u_stufen: p.stufen, u_umkehren: p.umkehren ? 1 : 0 }) },
  // Glitch würfelt etwa zehnmal je Sekunde neu, wie ein gestörter Datenstrom
  "lab.glitch": { quelle: GLITCH, uniforms: (p, { seed, schritt }) => ({ u_kanalversatz: p.kanalversatz, u_richtung: p.richtung, u_streifen: p.streifen, u_streifenHoehe: p.streifenHoehe, u_verschiebung: p.verschiebung,
    u_bloecke: p.bloecke, u_blockgroesse: p.blockgroesse, uSeed: (seed + Math.floor(schritt / 3)) % 16777216, uKanaele: { i: index(p.kanaele, ["normal", "tausch", "zyklisch"]) } }) },
  // die Welle läuft, das Kaleidoskop dreht sich langsam
  "lab.verzerrung": { quelle: VERZERRUNG, uniforms: (p, { t }) => ({ u_staerke: p.staerke, u_radius: p.radius, u_mitteX: p.mitteX, u_mitteY: p.mitteY, u_frequenz: p.frequenz,
    u_phase: p.phase + (p.art === "welle" ? 90 * t : p.art === "kaleidoskop" ? 12 * t : 0), u_segmente: p.segmente,
    uArt: { i: index(p.art, ["wirbel", "linse", "welle", "versetzen", "kaleidoskop"]) }, uRand: { i: index(p.rand, RAND) } }), nurBild: true },
  "lab.raster": { quelle: RASTER, uniforms: (p) => ({ u_zelle: p.zelle, u_winkel: p.winkel, u_gewicht: p.gewicht, u_amplitude: p.amplitude, u_umkehren: p.umkehren ? 1 : 0,
    uArt: { i: index(p.art, ["punkte", "linien", "kreuz", "wellen", "mosaik"]) }, uFarbe: { i: index(p.farbe, ["tinte", "papier", "nacht"]) } }) },
  "lab.wiederholung": { quelle: WIEDERHOLUNG, ohneAnteil: true, uniforms: (p, { seed }) => ({ u_spalten: p.spalten, u_zeilen: p.zeilen, u_groesse: p.groesse, u_drehung: p.drehung,
    u_falloffGroesse: p.falloffGroesse, u_falloffDrehung: p.falloffDrehung, u_spiegeln: p.spiegeln ? 1 : 0, uSeed: seed % 16777216,
    uFalloff: { i: index(p.falloff, ["linear", "radial", "zufall"]) }, uGrund: { i: index(p.grund, ["nacht", "papier"]) } }) },
  "lab.feedback": { quelle: FEEDBACK, rueckkopplung: true, uniforms: (p) => ({ uDreh: farbdrehung(p.farbdrehung), u_zoom: p.zoom, u_drehung: p.drehung, u_versatzX: p.versatzX, u_versatzY: p.versatzY,
    u_mischung: p.mischung, u_abklingen: p.abklingen, uMischart: { i: index(p.mischart, ["mischen", "heller", "differenz"]) }, uRand: { i: index(p.rand, RAND) } }) },
  "lab.licht": { licht: true },
  // die Linienbilder (seit 0.1.36): «lauf» bewegt die Zeichnung von selbst (uZeit in Umläufen), die Modulation folgt dem Klang
  "lab.puls": { quelle: PULS, uniforms: (p, { t }) => ({ ...tonU(p, t), u_abstand: p.abstand, u_hub: p.hub, u_dichte: p.dichte, u_ruhe: p.ruhe, u_strich: p.strich, u_winkel: p.winkel,
    u_mitteX: p.mitteX, u_mitteY: p.mitteY, u_phase: p.phase, uTraeger: { i: index(p.traeger, ["linien", "spirale", "kreise"]) }, uWelle: { i: index(p.welle, ["sinus", "zickzack", "rechteck", "schwelle"]) } }) },
  "lab.schraffur": { quelle: SCHRAFFUR, uniforms: (p, { t }) => {
    const w = lagenWinkel(p), n = w.length;
    return { ...tonU(p, t), u_abstand: p.abstand, u_strich: p.strich, u_weich: p.weich, u_zittern: p.zittern, u_anschwellen: p.anschwellen ? 1 : 0, uN: { i: n },
      ...Object.fromEntries([0, 1, 2, 3].flatMap((k) => [[`uW${k}`, w[k] ?? 0], [`uS${k}`, k < n ? lagen0(p, k) : 2]])) };
  } },
  "lab.fluss": { quelle: FLUSS, uniforms: (p, { t, seed }) => ({ ...tonU(p, t), u_laenge: p.laenge, u_koernung: p.koernung, u_kontrast: p.kontrast, u_skala: p.skala, u_drehung: p.drehung,
    uWandel: p.wandel * t, uSaat: seed % 65536, uFeld: { i: index(p.feld, ["kanten", "quer", "rauschen", "wirbel"]) } }) },
  "lab.punktieren": { quelle: PUNKTIEREN, uniforms: (p, { t, seed }) => ({ ...tonU(p, t), u_abstand: p.abstand, u_punkt: p.punkt, u_wachsen: p.wachsen, u_linie: p.linie, u_zittern: p.zittern,
    uSaat: seed % 65536, uArt: { i: index(p.art, ["punkte", "zellen", "mosaik"]) } }) },
  "lab.teilung": { quelle: TEILUNG, uniforms: (p, { t }) => ({ ...tonU(p, t), u_tiefe: p.tiefe, u_schwelle: p.schwelle, u_anstieg: p.anstieg, u_strich: p.strich, u_linien: p.linien,
    uFuellung: { i: index(p.fuellung, ["flaeche", "rahmen", "truchet", "boxen"]) }, uKriterium: { i: index(p.kriterium, ["dunkel", "kontrast"]) } }) },
};
/** die Operationen, die die Grafikkarte lebendig rechnet */
export const LEBENDIG = Object.freeze(Object.keys(EFFEKTE));

/** WebGL 2 auf einer eigenen kleinen Leinwand (gezeichnet wird nur in Bildpuffer), oder null */
export function gpuEffekte({ leinwand = null } = {}) {
  const c = leinwand ?? (typeof OffscreenCanvas !== "undefined" ? new OffscreenCanvas(16, 16) : typeof document !== "undefined" ? document.createElement("canvas") : null);
  const gl = c?.getContext?.("webgl2", { antialias: false, depth: false, stencil: false, premultipliedAlpha: false, preserveDrawingBuffer: false });
  if (!gl) return null;
  const programme = new Map(), texturen = new WeakMap(), zustaende = new Map();
  const dreieck = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, dreieck);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);

  const shader = (art, text) => {
    const s = gl.createShader(art); gl.shaderSource(s, text); gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(`WebGL: ${gl.getShaderInfoLog(s)}`);
    return s;
  };
  const programm = (text) => {
    if (programme.has(text)) return programme.get(text);
    const p = gl.createProgram();
    gl.attachShader(p, shader(gl.VERTEX_SHADER, ECKE)); gl.attachShader(p, shader(gl.FRAGMENT_SHADER, text));
    gl.bindAttribLocation(p, 0, "aLage"); gl.linkProgram(p);
    if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error(`WebGL: ${gl.getProgramInfoLog(p)}`);
    const orte = new Map(), ort = (n) => { if (!orte.has(n)) orte.set(n, gl.getUniformLocation(p, n)); return orte.get(n); };
    const x = { p, ort };
    programme.set(text, x);
    return x;
  };
  const textur = (w, h, daten = null, mip = false) => {
    const t = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, t);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, w, h, 0, gl.RGBA, gl.UNSIGNED_BYTE, daten);
    if (mip) gl.generateMipmap(gl.TEXTURE_2D);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, mip ? gl.LINEAR_MIPMAP_LINEAR : gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    return t;
  };
  /** das Eingangsbild als Textur, einmal je Bildobjekt */
  const eingangTextur = (b) => {
    let t = texturen.get(b);
    if (!t) { gl.pixelStorei(gl.UNPACK_ALIGNMENT, 1); t = textur(b.width, b.height, new Uint8Array(b.data.buffer, b.data.byteOffset, b.data.byteLength), true); texturen.set(b, t); }
    return t;
  };
  const ziele = new Map();
  /** ein Bildpuffer mit Textur (wiederverwendet je Name und Grösse) */
  const puffer = (name, w, h) => {
    const k = `${name}:${w}x${h}`;
    if (!ziele.has(k)) { const t = textur(w, h), f = gl.createFramebuffer(); gl.bindFramebuffer(gl.FRAMEBUFFER, f); gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, t, 0); ziele.set(k, { t, f, w, h }); }
    return ziele.get(k);
  };
  const setze = (x, werte) => {
    for (const [n, v] of Object.entries(werte)) {
      const o = x.ort(n); if (!o) continue;
      if (typeof v === "object" && v && "i" in v) gl.uniform1i(o, v.i);
      else if (Array.isArray(v) && v.length === 9) gl.uniformMatrix3fv(o, true, v);
      else if (Array.isArray(v) && v.length === 2) gl.uniform2f(o, v[0], v[1]);
      else gl.uniform1f(o, Number(v) || 0);
    }
  };
  /** ein Durchgang: Programm, Texturen (Name → Textur), Uniforms; in den Puffer ziel (null: Leinwand) im Bereich [x, y, w, h] */
  const zeichne = (text, tex, werte, ziel, [x, y, w, h]) => {
    const pr = programm(text);
    gl.useProgram(pr.p);
    gl.bindFramebuffer(gl.FRAMEBUFFER, ziel?.f ?? null);
    gl.viewport(x, y, w, h);
    let einheit = 0;
    for (const [n, t] of Object.entries(tex)) { gl.activeTexture(gl.TEXTURE0 + einheit); gl.bindTexture(gl.TEXTURE_2D, t); gl.uniform1i(pr.ort(n), einheit++); }
    setze(pr, { uG: [w, h], uO: [x, y], uAnteil: 1, ...werte });
    gl.bindBuffer(gl.ARRAY_BUFFER, dreieck); gl.enableVertexAttribArray(0); gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  };

  function licht(ein, p, ziel, bereich) {
    const [, , w, h] = bereich, L = Math.max(w, h);
    const r = Math.max(1, Math.round((p.radius * L) / 1.7)), lang = Math.round(r * p.streckung);
    const schichten = p.art === "kreuz" ? [[lang, 0], [0, lang]] : p.art === "waagrecht" ? [[lang, 0]] : p.art === "senkrecht" ? [[0, lang]] : [[r, r]];
    const gluten = schichten.map(([sx, sy], i) => {
      const dx = Math.max(1, Math.ceil(sx / 8)), dy = Math.max(1, Math.ceil(sy / 8)), kw = Math.max(1, Math.round(w / dx)), kh = Math.max(1, Math.round(h / dy));
      const a = puffer(`licht${i}a`, kw, kh), b = puffer(`licht${i}b`, kw, kh);
      zeichne(AUSZUG, { uBild: ein }, { u_schwelle: p.schwelle, u_weich: p.weich }, a, [0, 0, kw, kh]);
      zeichne(GAUSS, { uBild: a.t }, { uSchritt: [1 / kw, 0], uSigma: sx / dx }, b, [0, 0, kw, kh]);
      zeichne(GAUSS, { uBild: b.t }, { uSchritt: [0, 1 / kh], uSigma: sy / dy }, a, [0, 0, kw, kh]);
      return a.t;
    });
    zeichne(LICHT, { uBild: ein, uGlut1: gluten[0], uGlut2: gluten[1] ?? gluten[0] },
      { uZwei: gluten.length > 1 ? 1 : 0, u_staerke: p.staerke, u_saettigung: p.saettigung, uDreh: farbdrehung(p.farbdrehung), uMischart: { i: index(p.mischart, ["addieren", "aufhellen", "nurlicht"]) }, uAnteil: p.anteil ?? 1 }, ziel, bereich);
  }

  return {
    kann: (operation) => operation in EFFEKTE,
    /**
     * Ein Filmbild W × H: der Effekt auf dem Eingangsbild, unverzerrt eingepasst auf dunklem Grund. schluessel hält den Zustand
     * der Rückkopplung (Feedback) von Bild zu Bild; schritt zählt die Bilder dieser Station.
     */
    bild({ operation, eingang, parameter: p, seed = 1, t = 0, schritt = 0, schluessel = "", W, H }) {
      const e = EFFEKTE[operation];
      if (!e) throw new Error(`keine lebendige Fassung von ${operation}`);
      const f = Math.min(W / eingang.width, H / eingang.height), bw = Math.max(1, Math.round(eingang.width * f)), bh = Math.max(1, Math.round(eingang.height * f));
      const bereich = [Math.floor((W - bw) / 2), Math.floor((H - bh) / 2), bw, bh];
      const ziel = puffer("ziel", W, H), ein = eingangTextur(eingang);
      gl.bindFramebuffer(gl.FRAMEBUFFER, ziel.f); gl.viewport(0, 0, W, H);
      gl.clearColor(NACHT[0] / 255, NACHT[1] / 255, NACHT[2] / 255, 1); gl.clear(gl.COLOR_BUFFER_BIT);
      if (e.licht) licht(ein, p, ziel, bereich);
      else if (e.rueckkopplung) {
        // zwei Puffer im Wechsel; beim ersten Bild der Station beginnt die Schleife beim Eingang
        let z = zustaende.get(schluessel);
        if (!z || z.w !== bw || z.h !== bh) {
          z = { w: bw, h: bh, a: puffer(`fb-${schluessel}-a`, bw, bh), b: puffer(`fb-${schluessel}-b`, bw, bh) };
          zeichne(KOPIE, { uBild: ein }, {}, z.a, [0, 0, bw, bh]);
          zustaende.set(schluessel, z);
        }
        zeichne(e.quelle, { uBild: ein, uRueck: z.a.t }, e.uniforms(p, { seed, t, schritt }), z.b, [0, 0, bw, bh]);
        [z.a, z.b] = [z.b, z.a];
        zeichne(KOPIE, { uBild: z.a.t }, {}, ziel, bereich);
      } else zeichne(e.quelle, { uBild: ein }, { ...e.uniforms(p, { seed, t, schritt }), uAnteil: e.ohneAnteil ? 1 : p.anteil ?? 1 }, ziel, bereich);
      const daten = new Uint8ClampedArray(W * H * 4);
      gl.bindFramebuffer(gl.FRAMEBUFFER, ziel.f);
      gl.readPixels(0, 0, W, H, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array(daten.buffer));
      return { width: W, height: H, data: daten };
    },
    /** den Zustand einer Station freigeben, wenn sie nicht mehr auftritt */
    vergiss(schluessel) {
      const z = zustaende.get(schluessel); if (!z) return;
      zustaende.delete(schluessel);
      for (const k of [`fb-${schluessel}-a:${z.w}x${z.h}`, `fb-${schluessel}-b:${z.w}x${z.h}`]) { const x = ziele.get(k); if (x) { gl.deleteTexture(x.t); gl.deleteFramebuffer(x.f); ziele.delete(k); } }
    },
    frei() { gl.getExtension("WEBGL_lose_context")?.loseContext(); },
  };
}
