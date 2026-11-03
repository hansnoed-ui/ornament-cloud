// Animationen – die Effekte als Bausteine. Jeder ist eine Funktion der Zeit in der Schlaufe (uPhi, uT) und liest seine Quelle mit
// Q(uv): das Bild (bildfüllend) oder die Ebenen darunter. Regler laufen von 0 bis 1 (uP[0] … uP[5]).
// Herkunft: die nachgebauten Effekte aus dem Projekt «Animations» (Python, Desktop «claude social media/Animations», UEBERGABE.md)
// und drei Referenzvideos vom 3. November 2026 (holotx, incrprl.dsgn, infinite mantra), hier neu als Shader für den Browser.

const r = (name, wert) => ({ name, wert });

// gemeinsame Blasen (Tusche und Linsen): Lage, Drift und Atmen je Blase
const BLASE = `
void blase(int i, float groesse, float atmen, out vec2 c, out float R){
  float fi = float(i); vec2 h = h22(vec2(fi, 3.) + uSeed), k = h22(vec2(fi, 11.) + uSeed);
  c = (h - .5) * vec2(A() * .92, .92) + .07 * vec2(cos(uPhi + k.x * TAU), sin(uPhi * (1. + floor(k.y * 2.)) + h.x * TAU));
  R = mix(.07, .22, k.x) * mix(.6, 1.7, groesse) * (1. + atmen * .14 * sin(uPhi * (1. + floor(h.y * 2.)) + fi));
}`;

export const EFFEKTE = {
  bild: {
    name: "Bild", herkunft: "das Bild selbst, atmend",
    regler: [r("Atmen", .4), r("Schwanken", .3), r("Grau", 0), r("Kontrast", 0)],
    glsl: `vec4 effekt(vec2 uv){
  vec2 p = P(uv) * (1. - P0 * .08 * (.5 - .5 * cos(uPhi)));
  p = rot(P1 * .06 * sin(uPhi)) * p;
  vec3 c = Q(UV(p)).rgb;
  c = mix(c, vec3(lum(c)), P2);
  c = (c - .5) * (1. + P3 * 1.2) + .5;
  return vec4(clamp(c, 0., 1.), 1.);
}`,
  },

  partikel: {
    name: "Partikel", herkunft: "Zettelkasten: Teilchen lösen sich zur Wolke und setzen das Bild wieder zusammen",
    regler: [r("Wolke", .8), r("Punktgrösse", .45), r("Glitzer", .5), r("Kugel", .3)],
    punkte: (w, a) => ({ cols: 400, rows: Math.round(400 / a) }),
    glsl: `void punkt(int id, out vec2 pos, out vec4 col, out float size){
  float i = float(id); vec2 g = vec2(mod(i, uCols), floor(i / uCols));
  vec2 j = h22(g + uSeed * 13.1), uv0 = (g + j) / vec2(uCols, uRows);
  vec4 c = Ql(uv0, .5);
  float s = h12(g * 1.37 + 4.1 + uSeed);
  float k = smoothstep(0., 1., (.5 - .5 * cos(uPhi)) * 1.6 - s * .6) * P0;
  float w = TAU * s * 7.;
  vec3 tk = vec3((.6 + .25 * cos(3. * w)) * cos(2. * w), (.6 + .25 * cos(3. * w)) * sin(2. * w), .25 * sin(3. * w));
  float th = j.x * TAU, ph = acos(2. * j.y - 1.);
  vec3 sp = vec3(sin(ph) * cos(th), sin(ph) * sin(th), cos(ph)) * (.55 + .35 * pow(h12(g + 9.), 3.));
  vec3 q = mix(tk, sp, P3) + .05 * vec3(ln(g * .013, .8), ln(g * .013 + 5., .8), 0.);
  q.xz = rot(uPhi) * q.xz; q.yz = rot(.4) * q.yz;
  pos = mix(P(uv0), q.xy * .46 / (1. + .3 * q.z), k);
  float tw = pow(.5 + .5 * sin(uPhi * float(2 + int(s * 5.)) + s * 60.), 6.) * P2;
  col = vec4(c.rgb * (.85 + tw * 1.6 + k * .3), 1.);
  size = mix(1.5, 6., P1) * uRes.y / 1350. * (1. + tw * .8);
}`,
  },

  metaballs: {
    name: "Metaballs", herkunft: "Punktbild: Punkte fliessen als Tropfen zusammen und auseinander",
    regler: [r("Raster", .4), r("Fluss", .6), r("Wildheit", .4), r("Schwelle", .45)],
    glsl: `vec4 effekt(vec2 uv){
  float N = mix(14., 60., P0);
  vec2 q = P(uv) * N, ci = floor(q);
  float f = 0.; vec3 cs = vec3(0.);
  for (int y = -2; y <= 2; y++) for (int x = -2; x <= 2; x++){
    vec2 c = ci + vec2(x, y), h = h22(c + uSeed * 3.7);
    vec3 im = Ql(UV((c + .5) / N), 1.).rgb;
    float v = max(lum(im), sat(im));
    float fx = floor(1. + h.x * 2.), fy = floor(1. + h.y * 2.);
    vec2 m = c + .5 + P1 * .8 * vec2(cos(uPhi * fx + h.x * TAU), sin(uPhi * fy + h.y * TAU));
    float rr = (.18 + .5 * v) * (1. + P2 * (h.y - .5) * 1.8) * (1. + .25 * P2 * sin(uPhi * fx + h.y * 9.));
    vec2 d = q - m; float w = rr * rr / (dot(d, d) + .02) * step(.04, v);
    f += w; cs += im * w;
  }
  vec3 col = cs / max(f, 1e-4);
  float thr = mix(.5, 1.6, P3), e = smoothstep(thr * .9, thr * 1.1, f);
  return vec4(col * e, e);
}`,
  },

  wasserglas: {
    name: "Wasserglas", herkunft: "Paper Shaders: Wasser, dann geriffeltes Glas, Stärke 0 → max → 0",
    regler: [r("Wasser", .6), r("Rillen", .4), r("Stärke", .8), r("Licht", .5)],
    glsl: `vec4 effekt(vec2 uv){
  float s = P2 * (.25 + .75 * (.5 - .5 * cos(uPhi)));
  vec2 p = P(uv);
  vec2 u = uv + vec2(lfbm(p * 2.5, .7), lfbm(p * 2.5 + 7.3, .7)) * .06 * s * P0;
  float N = mix(5., 34., P1), fx = fract(u.x * N);
  vec2 b = vec2(u.x - (fx - .5) / N * 1.4 * s, u.y + .01 * s * sin(fx * PI));
  float ca = .004 * s + .008 * s * abs(fx - .5);
  vec3 c = vec3(Q(b + vec2(ca, 0)).r, Q(b).g, Q(b - vec2(ca, 0)).b);
  c += P3 * s * (.5 * pow(1. - abs(fx - .5) * 2., 10.) - .18 * smoothstep(.3, .5, abs(fx - .5)));
  c += P3 * P0 * s * .25 * pow(max(0., 1. - abs(lfbm(p * 6., .9)) * 4.), 6.);
  return vec4(clamp(c, 0., 1.), 1.);
}`,
  },

  wirbel: {
    name: "Wirbel", herkunft: "Punktbild: Punkte wirbeln über die ganze Fläche zu Spiralarmen und zurück",
    regler: [r("Raster", .45), r("Wirbel", .6), r("Arme", .5), r("Punktgrösse", .6), r("Drehungen", .5)],
    glsl: `vec4 effekt(vec2 uv){
  vec2 p = P(uv); float rr = length(p), th = atan(p.y, p.x), env = .5 - .5 * cos(uPhi);
  float arme = floor(2. + P2 * 4.);
  float r2 = rr * (1. + .18 * P2 * env * sin(arme * th + rr * 8.));
  // Drehungen: unter einem Drittel wickelt sich der Wirbel auf und wieder ab (vor und zurück), sonst steht er
  // und dreht sich als Ganzes ein- oder zweimal pro Schlaufe (Wunsch vom 3. November 2026: «kann er eine ganze Drehung machen?»)
  float n = floor(P4 * 2.999);
  float tw = n < .5 ? env : .85;
  vec2 ps = rot(P1 * tw * 5. / (rr + .25) + n * uPhi) * vec2(cos(th), sin(th)) * r2;
  float N = mix(28., 110., P0);
  vec2 g = ps * N, cell = floor(g) + .5;
  vec3 im = Ql(UV(cell / N), 1.).rgb;
  float rad = mix(.12, .52, clamp(max(lum(im), .2) * (.4 + P3 * 1.4), 0., 1.));
  float aa = 1.5 * N / uRes.y, m = smoothstep(rad + aa, rad - aa, length(g - cell));
  return vec4(im * m, m);
}`,
  },

  scan: {
    name: "Scan", herkunft: "Collage «digitales Herbarium»: Scanbalken mit Pixel-Glitches, Koralle/Petrol, Rahmen mit Eckpunkten",
    regler: [r("Farbe", .8), r("Glitch", .6), r("Balken", .5), r("Raster", .5)],
    glsl: `vec4 effekt(vec2 uv){
  vec3 TEAL = vec3(14., 150., 162.) / 255., DT = vec3(8., 78., 90.) / 255., SAL = vec3(246., 178., 158.) / 255.;
  float x = uT * 2., pass = floor(x), by = 1.15 - fract(x) * 1.3, dy = uv.y - by;
  float band = exp(-dy * dy / (.0008 + .004 * P2)), k = uRes.y / 1350.;
  float row = floor(uv.y * uRes.y / (6. * k)), fr = floor(uT * 90.);
  float gl = P1 * band * step(.5, h12(vec2(row, fr) + uSeed));
  vec2 u = uv; u.x += (h12(vec2(row * 1.7, fr)) - .5) * .12 * gl;
  float bs = mix(4., 36., h12(vec2(floor(uv.y * 20.), fr))) * k / uRes.y;
  vec2 bq = vec2(bs / A(), bs);
  u = mix(u, (floor(u / bq) + .5) * bq, step(.3, P1 * band));
  vec3 c = Q(u).rgb; float L = lum(c);
  vec3 gm = L < .5 ? mix(DT, TEAL, L * 2.) : mix(TEAL, SAL, L * 2. - 1.);
  float gescannt = step(0., dy);
  c = mix(c, gm, mix(gescannt, 1. - gescannt, mod(pass, 2.)) * P0);
  c += band * .35 * vec3(.9, 1., 1.);
  vec2 hp = uv * uRes / (7. * k);
  c = mix(c, c * .8, smoothstep(.32, .22, length(fract(hp) - .5)) * P3 * .6);
  vec2 lo = (.08 + h22(vec2(pass, 3.) + uSeed) * .45) * uRes, hi = min(lo / uRes + .2 + h22(vec2(pass, 7.) + uSeed) * .3, vec2(.94)) * uRes;
  vec2 pp = uv * uRes;
  float innen = step(lo.x + k, pp.x) * step(pp.x, hi.x - k) * step(lo.y + k, pp.y) * step(pp.y, hi.y - k);
  float aussen = step(lo.x - k, pp.x) * step(pp.x, hi.x + k) * step(lo.y - k, pp.y) * step(pp.y, hi.y + k);
  float cd = min(min(length(pp - lo), length(pp - hi)), min(length(pp - vec2(lo.x, hi.y)), length(pp - vec2(hi.x, lo.y))));
  c = mix(c, vec3(.07), max(aussen - innen, smoothstep(6. * k, 4. * k, cd)) * P3);
  return vec4(clamp(c, 0., 1.), 1.);
}`,
  },

  fluid: {
    name: "Tusche-Fluid", herkunft: "Fluid Distortion: das Bild treibt im Strömungsfeld, Regenbogensäume an den Schlieren",
    regler: [r("Stärke", .8), r("Massstab", .4), r("Dispersion", .5)],
    glsl: `vec4 effekt(vec2 uv){
  float sc = mix(1.2, 5., P1);
  vec2 q = P(uv);
  float st = .054 * P0 * (.5 - .5 * cos(uPhi)) / sc;
  for (int i = 0; i < 6; i++) q -= lcurl(q * sc, .6) * st;
  vec2 d = UV(q) - uv; float k = P2 * .5;
  return vec4(Q(uv + d * (1. + k)).r, Q(uv + d).g, Q(uv + d * (1. - k)).b, 1.);
}`,
  },

  zebra: {
    name: "Op-Art-Zebra", herkunft: "Op-Art: Streifen biegen sich über dem Relief des Bildes",
    regler: [r("Streifen", .5), r("Relief", .6), r("Drehung", .5), r("Lesbarkeit", .7), r("Farbakzent", .5)],
    glsl: `vec4 effekt(vec2 uv){
  vec3 c = Ql(uv, 0.).rgb;
  float h = lum(Ql(uv, 4.5).rgb), L = lum(Ql(uv, 1.5).rgb);
  float ang = .5 + P2 * 1.3 * sin(uPhi);
  float per = mix(80., 12., P0), k = P1 * (.6 + .4 * (.5 - .5 * cos(2. * uPhi))) * 6.;
  float ph = dot(P(uv), vec2(cos(ang), sin(ang))) * per + k * h * 3.;
  float t = abs(fract(ph) - .5) * 2., aa = fwidth(ph) * 2.4;
  float duty = mix(.5, clamp(1. - L, .08, .92), P3);
  vec3 col = vec3(smoothstep(duty - aa, duty + aa, t));
  col = mix(col, c, smoothstep(.22, .45, sat(c)) * P4);
  return vec4(col, 1.);
}`,
  },

  linien: {
    name: "Linien", herkunft: "Linien-Dissolve: Punktlinien zerfasern nach rechts im Rauschen, dicker heisst dunkler",
    regler: [r("Linien", .5), r("Zerfall", .7), r("Rauschen", .5), r("Tinte", .5)],
    punkte: (w) => ({ cols: 420, rows: Math.round(50 + w[0] * 100) }),
    glsl: `void punkt(int id, out vec2 pos, out vec4 col, out float size){
  float i = float(id), x = mod(i, uCols), y = floor(i / uCols);
  vec2 uv0 = vec2((x + .5) / uCols, (y + .5) / uRows);
  float s = pow(smoothstep(.2, 1., uv0.x), 2.) * P1;   // links ruhig, nach rechts zerfasert
  vec2 p0 = P(uv0);
  vec2 d = vec2(ln(p0 * 3. + vec2(0., y * .37), .8), ln(p0 * 3. + vec2(9.1, y * .37), .8));
  pos = p0 + d * s * .22 * (.5 + P2) + vec2(s * .04, 0.);
  vec4 c = Ql(uv0, 1.5);
  float L = lum(c.rgb), D = smoothstep(.1, .9, P3 > .5 ? L : 1. - L);   // dicker heisst dunkler (bei weisser Tinte heller)
  size = max(1., uRes.y / uRows * .9 * (.12 + .95 * D) * (1. - .55 * s));
  vec3 tinte = P3 < .5 ? mix(vec3(0.), c.rgb, P3 * 2.) : mix(c.rgb, vec3(1.), P3 * 2. - 1.);
  float al = 1. - .6 * s;
  col = vec4(tinte * al, al);
}`,
  },

  tusche: {
    name: "Tuscheblasen", herkunft: "Infinite Mantra: durchscheinende Tuscheblasen, dunkler Rand, Kern, Adern",
    regler: [r("Anzahl", .5), r("Grösse", .5), r("Atmen", .6), r("Tusche", .7), r("Sepia", 0)],
    glsl: `${BLASE}
vec4 effekt(vec2 uv){
  vec2 p = P(uv);
  vec3 base = Q(uv).rgb;
  base = mix(base, base * vec3(241., 232., 221.) / 255., .3);
  float ab = 0.; int n = int(mix(4., 14., P0));
  for (int i = 0; i < 14; i++){
    if (i >= n) break;
    vec2 c; float R; blase(i, P1, P2, c, R);
    vec2 v = (p - c) / R; float d = length(v);
    if (d > 1.05) continue;
    float fi = float(i), innen = step(d, 1.);
    float rand = smoothstep(.82, .98, d) * (1. - smoothstep(.98, 1.04, d));
    vec2 kc = vec2(cos(fi * 2.3 + uPhi), sin(fi * 2.3 + uPhi)) * .35;
    float kern = exp(-dot(v - kc, v - kc) * 7.) * .9;
    float ader = smoothstep(.06, 0., abs(ln(v * 2.5 + fi, .5))) * .35;
    float spr = step(.985, h12(floor(p * uRes.y / 3.) + fi)) * .8;
    ab += innen * ((1. - d * d) * .35 + kern + ader + spr) + rand * 1.2;
  }
  vec3 tinte = mix(vec3(.9, .72, .28), vec3(.3, .6, .95), P4);
  return vec4(base * exp(-ab * P3 * 1.4 * tinte), 1.);
}`,
  },

  linsen: {
    name: "Glaslinsen", herkunft: "dunkles Gemälde: leuchtende Linsen, Brechung mit Farbsäumen, das Bild strömt mit",
    regler: [r("Anzahl", .6), r("Grösse", .5), r("Brechung", .7), r("Strömung", .6)],
    glsl: `${BLASE}
vec4 effekt(vec2 uv){
  vec2 p = P(uv), pb = p + lcurl(p * 1.6, .7) * .012 * P3;
  vec3 col = Q(UV(pb)).rgb; int n = int(mix(4., 15., P0));
  for (int i = 0; i < 15; i++){
    if (i >= n) break;
    vec2 c; float R; blase(i, P1, .6, c, R);
    vec2 v = (p - c) / R; float d = length(v);
    if (d > 1.) continue;
    float w = smoothstep(1., .55, d), mag = mix(1., .62 + .25 * d * d, P2), ca = .012 * P2 * d;
    vec2 pr = c + (pb - c) * mag, dir = normalize(v + 1e-5);
    vec3 lins = vec3(Q(UV(pr + dir * ca)).r, Q(UV(pr)).g, Q(UV(pr - dir * ca)).b);
    vec3 hof = Ql(UV(c), 3.).rgb * pow(1. - d, 2.) * .5;
    col = mix(col, 1. - (1. - lins) * (1. - hof), w);
  }
  return vec4(col, 1.);
}`,
  },

  glitzer: {
    name: "Glitzer-Morph", herkunft: "Rosen: Wirbel drehen und atmen, Gold- und Rosaglitzer funkelt, ein Lichtband zieht durch",
    regler: [r("Drehung", .7), r("Atmen", .6), r("Glitzer", .6), r("Lichtband", .5)],
    glsl: `vec4 effekt(vec2 uv){
  vec2 q = P(uv);
  for (int i = 0; i < 5; i++){
    float fi = float(i); vec2 h = h22(vec2(fi, 5.) + uSeed);
    vec2 c = (h - .5) * vec2(A() * .7, .7), v = q - c;
    float g = exp(-dot(v, v) / pow(.22 + .12 * h.y, 2.));
    q = c + rot(P0 * .65 * sin(uPhi + fi * 1.3) * g) * v * (1. - P1 * .07 * sin(2. * uPhi + fi) * g);
  }
  q.x += P1 * .012 * sin(uPhi) * uv.y;
  vec3 col = Q(UV(q)).rgb; float L = lum(col);
  float cs = 18. * uRes.y / 1350.;
  vec2 g = uv * uRes / cs, ci = floor(g), f = fract(g) - .5 - (h22(ci) - .5) * .5;
  float h = h12(ci + uSeed * 5.);
  float tw = pow(max(0., sin(uPhi * float(1 + int(h * 4.)) + h * 50.)), 24.);
  float an = step(h12(ci * 1.7 + 2.), P2 * .5 * (.2 + L + sat(col)));
  float stern = exp(-length(f) * 14.) + .6 * (exp(-abs(f.x) * 40.) * exp(-abs(f.y) * 6.) + exp(-abs(f.y) * 40.) * exp(-abs(f.x) * 6.));
  col += mix(vec3(1., .86, .55), vec3(1., .72, .84), h22(ci + 3.).x) * stern * tw * an * 1.6;
  float dd = dot(uv, vec2(.7071)) - (uT * 2.4 - .7);
  col += P3 * .35 * exp(-dd * dd * 60.) * (.3 + L);
  return vec4(clamp(col, 0., 1.), 1.);
}`,
  },

  seifenblase: {
    name: "Seifenblase", herkunft: "Rauch-Glasblase (Logo): schillernde Haut, Rauch im Innern, das Bild gebrochen",
    regler: [r("Grösse", .7), r("Schillern", .7), r("Rauch", .5), r("Umgebung", .35)],
    glsl: `vec4 effekt(vec2 uv){
  vec2 p = P(uv), c = vec2(0., .02 + .02 * sin(uPhi));
  float R = mix(.18, .46, P0);
  vec2 v = (p - c) / R; float d = length(v);
  vec3 bg = Q(uv).rgb * P3;
  if (d > 1.06) return vec4(bg, 1.);
  float z = sqrt(max(0., 1. - d * d));
  vec3 innen = Q(UV(c + rot(uPhi) * v * R * (.55 + .35 * z))).rgb;
  vec3 film = .5 + .5 * cos(TAU * (lfbm(v * 1.6, .8) * .8 + d * 1.4 + vec3(0., .33, .67)));
  float fres = pow(1. - z, 2.5);
  vec2 sv = v * 2.2; sv += lcurl(sv, .8) * .25;
  float rauch = smoothstep(.15, .7, lfbm(sv, .9) + .2) * P2;
  vec3 col = mix(bg, innen, .65 + .35 * z);
  col = col * (1. - .3 * fres) + film * fres * P1 * 1.2 + rauch * film * .35 * (.4 + .6 * z);
  vec2 g1 = v - vec2(-.42, .45), g2 = v - vec2(.35, -.4);
  col += .8 * exp(-dot(g1, g1) * 40.) + .4 * exp(-dot(g2, g2) * 60.);
  float rand = smoothstep(.93, 1., d) * smoothstep(1.06, 1., d);
  return vec4(clamp(mix(bg, col, smoothstep(1.03, .99, d)) + film * rand * P1 * .6, 0., 1.), 1.);
}`,
  },

  holo: {
    name: "Holo-Kugel", herkunft: "holotx: das Bild auf einer leuchtenden, körnigen Kugel, die pulsiert und sich dreht",
    regler: [r("Grösse", .6), r("Puls", .5), r("Körnung", .5), r("Blau", .5)],
    glsl: `vec4 effekt(vec2 uv){
  vec2 p = P(uv);
  float R = mix(.16, .44, P0) * (1. + P1 * .18 * sin(uPhi));
  vec2 v = p / R; float d = length(v);
  vec3 blau = vec3(.35, .52, 1.);
  float korn = h12(floor(uv * uRes) + floor(uT * 360.) * 1.37) - .5;
  if (d > 1.){ float gl = exp(-(d - 1.) * 18.) * .45; return vec4(blau * gl, gl); }
  float z = sqrt(1. - d * d);
  vec3 n = vec3(v, z); n.xz = rot(uPhi) * n.xz; n.yz = rot(.35) * n.yz;
  vec2 su = vec2(abs(fract(atan(n.x, n.z) / TAU + .5) * 2. - 1.), asin(clamp(n.y, -1., 1.)) / PI + .5);
  su += lcurl(n.xy * 2.2 + n.z, .8) * .03;
  vec3 im = Ql(su, 1.).rgb;
  vec3 col = mix(im, blau * (.25 + 1.3 * lum(im)), P3) * (.55 + .45 * z);
  col += blau * pow(1. - z, 2.) * .9 + korn * P2 * .35;
  float m = smoothstep(1., .985, d);
  return vec4(clamp(col, 0., 1.) * m + blau * .45 * (1. - m), m + .45 * (1. - m));
}`,
  },

  horizont: {
    name: "Horizont", herkunft: "incrprl.dsgn: über einer Lichtlinie steigt das Bild als Rauch auf, Körnung und Strahlen",
    regler: [r("Höhe", .6), r("Breite", .5), r("Körnung", .5), r("Strahlen", .5)],
    glsl: `vec4 effekt(vec2 uv){
  vec2 p = P(uv); float k = uRes.y / 1350., env = .5 - .5 * cos(uPhi);
  float cx = .25 * A() * sin(uPhi);
  vec2 rr = (p - vec2(cx, 0.)) / vec2(mix(.08, .4, P1), mix(.05, .35, P0) * (.35 + .65 * env));
  vec2 w = rr + lcurl(rr * 1.3, .8) * .35;
  float m = smoothstep(.25, .75, lfbm(w * 1.4, .8) + .75 - length(w) * .75) * mix(.55, 1., step(0., p.y));
  float L = pow(lum(Q(uv).rgb), .8);
  float px = abs(p.y) * uRes.y;
  float linie = (exp(-px * px / (1.2 * k * k)) * .9 + exp(-px / (6. * k)) * .12) * (.55 + .45 * smoothstep(1., 0., abs(p.x - cx) / (.6 * A())));
  float ang = 1. + .4 * sin(uPhi * 2.);
  float dist = abs(dot(p - vec2(cx, 0.), vec2(-sin(ang), cos(ang)))) * uRes.y / (1.5 * k);
  float strahl = exp(-dist * dist) * pow(.5 + .5 * sin(uPhi * 3.), 8.) * P3 * smoothstep(.6, 0., length(p - vec2(cx, 0.)));
  float korn = (h12(floor(uv * uRes) + floor(uT * 360.)) - .5) * .12 * P2;
  return vec4(clamp(vec3(.035 + korn + L * 1.25 * m + linie + strahl * .8), 0., 1.), 1.);
}`,
  },

  tinte: {
    name: "Alkoholtinte", herkunft: "infinite mantra (Blüten): das Bild fliesst als Lasur, dunkle Tintenränder",
    regler: [r("Fluss", .7), r("Ränder", .6), r("Lasur", .7), r("Massstab", .4)],
    glsl: `vec4 effekt(vec2 uv){
  vec2 p = P(uv); float sc = mix(.8, 3., P3);
  vec2 q1 = p + vec2(lfbm(p * sc, .7), lfbm(p * sc + 5.2, .7)) * .12 * P0;
  vec2 q2 = q1 + vec2(lfbm(q1 * sc * 1.7 + 2., .9), lfbm(q1 * sc * 1.7 + 8., .9)) * .06 * P0;
  vec3 c1 = Ql(UV(q1), 1.).rgb, c2 = Ql(UV(q2), 0.).rgb;
  float la = mix(.35, 1., P2);
  vec3 col = mix(vec3(1.), c1, la) * mix(vec3(1.), c2, la);
  float f = lfbm(q2 * sc * 1.3, .8) * 5.;
  float e = abs(fract(f) - .5), rand = 1. - smoothstep(0., fwidth(f) * 1.5 + .03, e);
  col = mix(col, c2 * c2 * .6, rand * P1);
  return vec4(mix(col, col * col, .25), 1.);
}`,
  },
};

export const EFFEKT_IDS = Object.keys(EFFEKTE);
