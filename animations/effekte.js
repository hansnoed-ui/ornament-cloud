// Animationen – die Effekte als Bausteine. Jeder ist eine Funktion der Zeit in der Schlaufe (uPhi, uT) und liest seine Quelle mit
// Q(uv): das Bild (bildfüllend) oder die Ebenen darunter. Regler laufen von 0 bis 1 (uP[0] … uP[5]).
// Herkunft: die nachgebauten Effekte aus dem Projekt «Animations» (Python, Desktop «claude social media/Animations», UEBERGABE.md)
// und drei Referenzvideos vom 3. November 2026 (holotx, incrprl.dsgn, infinite mantra), hier neu als Shader für den Browser;
// seit 4. November 2026 ohne Seifenblase und Holo-Kugel, dafür Effekte, die stark aus der Bildinformation schöpfen (am Ende der Liste).

const r = (name, wert) => ({ name, wert });

// gemeinsame Blasen (Tusche und Linsen): Lage, Drift und Atmen je Blase
const BLASE = `
void blase(int i, float groesse, float atmen, out vec2 c, out float R){
  float fi = float(i); vec2 h = h22(vec2(fi, 3.) + uSeed), k = h22(vec2(fi, 11.) + uSeed);
  c = (h - .5) * vec2(A() * .92, .92) + .07 * vec2(cos(uPhi + k.x * TAU), sin(uPhi * (1. + floor(k.y * 2.)) + h.x * TAU));
  R = mix(.07, .22, k.x) * mix(.6, 1.7, groesse) * (1. + atmen * .14 * sin(uPhi * (1. + floor(h.y * 2.)) + fi));
}`;

// Bild als Gelände: Helligkeit als Höhe, ihr Gradient je Einheit in P (Kanten) und die Strömung entlang der Konturen
// (Senkrechte zum Gradienten, quellenfrei), in flachen Stellen von einem langsamen Rauschwirbel geführt
const FELD = `
float hoehe(vec2 uv, float l){ return lum(Kl(uv, l).rgb); }
vec2 feldG(vec2 uv, float l, float px){
  float e = px / uRes.y;
  return vec2(hoehe(uv + vec2(e / A(), 0.), l) - hoehe(uv - vec2(e / A(), 0.), l),
              hoehe(uv + vec2(0., e), l) - hoehe(uv - vec2(0., e), l)) / (2. * e);
}
vec2 strom(vec2 uv, float l, float px, float wirbel){
  vec2 g = feldG(uv, l, px), t = vec2(-g.y, g.x);
  float a = ln(P(uv) * 1.8, .6) * TAU;
  return normalize(t + (.4 + wirbel * 4.) * vec2(cos(a), sin(a)) + 1e-4);
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
    name: "Partikel", herkunft: "Zettelkasten: Teilchen lösen sich zur Wolke in der Grösse des Bildes und setzen es wieder zusammen",
    // seit 4. November 2026 zieht sich die Wolke nicht mehr zur Kugel zusammen (Wunsch: «bei der wolke soll sich das bild nicht
    // zusammenziehen sondern die dimension behalten»): jedes Teilchen treibt von seinem Platz aus im Strömungsfeld, mit etwas Tiefe
    regler: [r("Wolke", .8), r("Punktgrösse", .45), r("Glitzer", .5), r("Streuung", .5)],
    punkte: (w, a) => ({ cols: 400, rows: Math.round(400 / a) }),
    glsl: `void punkt(int id, out vec2 pos, out vec4 col, out float size){
  float i = float(id); vec2 g = vec2(mod(i, uCols), floor(i / uCols));
  vec2 j = h22(g + uSeed * 13.1), uv0 = (g + j) / vec2(uCols, uRows);
  vec4 c = Ql(uv0, .5); float Lk = lum(Kl(uv0, .5).rgb);
  if (uZeigen < .5) c = vec4(vec3(.95, .925, .9), 1.);   // ohne Bild: helle Teilchen, die Grösse kommt aus dem Bild
  float s = h12(g * 1.37 + 4.1 + uSeed);
  // läuft durch: die Teilchen kehren um, sobald das Bild steht (Exponent unter 1, Geschwindigkeit an der Naht über null)
  float k = pow(.5 - .5 * cos(uPhi), .5 + s * .5) * P0;
  vec2 p0 = P(uv0);
  vec2 drift = vec2(ln(p0 * 2.2 + s * .3, .8), ln(p0 * 2.2 + 7. + s * .3, .8)) * (.06 + .2 * P3);
  vec2 wirbel = lcurl(p0 * 1.5 + 3., .7) * .025 * P3;
  float z = (s - .5) * 2.;
  vec2 wolke = (p0 + drift + wirbel) * (1. + .1 * z * P3);    // Tiefe: leichte Perspektive, die Grösse bleibt
  pos = mix(p0 + .006 * vec2(ln(g * .02, .9), ln(g * .02 + 3., .9)), wolke, k);
  float tw = pow(.5 + .5 * sin(uPhi * float(2 + int(s * 5.)) + s * 60.), 6.) * P2;
  col = vec4(c.rgb * (.85 + tw * 1.6 + k * .3) * (1. - .25 * k * max(z, 0.)), 1.);
  size = mix(1.5, 6., P1) * uRes.y / 1350. * (1. + tw * .8) * (1. + .3 * k * z) * (uZeigen > .5 ? 1. : .15 + 1.6 * Lk * Lk);
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
    vec3 im = Kl(UV((c + .5) / N), 1.).rgb;
    float v = uZeigen > .5 ? max(lum(im), sat(im)) : smoothstep(.5, .9, 1. - lum(im)) + sat(im);   // ohne Bild: Tropfen sammeln sich im Dunklen
    if (uZeigen < .5) im = vec3(.95, .925, .9);   // ohne Bild: Tropfen aus dem Bild geformt, aber einfarbig
    float fx = floor(1. + h.x * 2.), fy = floor(1. + h.y * 2.);
    vec2 m = c + .5 + P1 * .8 * vec2(cos(uPhi * fx + h.x * TAU), sin(uPhi * fy + h.y * TAU));
    float rr = (.18 + .5 * v) * (1. + P2 * (h.y - .5) * 1.8) * (1. + .25 * P2 * sin(uPhi * fx + h.y * 9.));
    vec2 d = q - m; float w = rr * rr / (dot(d, d) + .02) * (uZeigen > .5 ? step(.04, v) : smoothstep(.15, .45, v));
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
  float s = P2 * (.55 + .45 * (.5 - .5 * cos(uPhi)));
  vec2 p = P(uv);
  vec2 u = uv + vec2(lfbm(p * 2.5, .7), lfbm(p * 2.5 + 7.3, .7)) * .06 * s * P0;
  float N = mix(5., 34., P1), fx = fract(u.x * N + uT);   // die Rillen gleiten um eine Rille pro Schlaufe
  vec2 b = vec2(u.x - (fx - .5) / N * 1.4 * s, u.y + .01 * s * sin(fx * PI));
  float ca = .004 * s + .008 * s * abs(fx - .5);
  vec3 c = vec3(Q(b + vec2(ca, 0)).r, Q(b).g, Q(b - vec2(ca, 0)).b);
  // Licht der Rillen nur als Faktor auf das Bild: Dunkles bleibt dunkel, keine weissen Streifen und Schlieren
  // (Rückmeldung vom 3. November 2026: «die weissen streifen und schlieren im hintergrund stören»)
  c *= 1. + P3 * s * (.3 * pow(1. - abs(fx - .5) * 2., 6.) - .2 * smoothstep(.3, .5, abs(fx - .5)));
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
  vec3 im = Kl(UV(cell / N), 1.).rgb;
  float rad = mix(.12, .52, clamp(max(lum(im), .2) * (.4 + P3 * 1.4), 0., 1.));
  if (uZeigen < .5) im = vec3(.95, .925, .9);
  float aa = 1.5 * N / uRes.y, m = smoothstep(rad + aa, rad - aa, length(g - cell));
  return vec4(im * m, m);
}`,
  },

  fluid: {
    name: "Tusche-Fluid", herkunft: "Fluid Distortion: das Bild treibt im Strömungsfeld, Regenbogensäume an den Schlieren",
    regler: [r("Stärke", .8), r("Massstab", .4), r("Dispersion", .5)],
    glsl: `vec4 effekt(vec2 uv){
  float sc = mix(1.2, 5., P1);
  vec2 q = P(uv);
  float st = .054 * P0 * (.8 + .2 * (.5 - .5 * cos(uPhi))) / sc;   // die Strömung hört nie ganz auf, sie atmet nur
  for (int i = 0; i < 6; i++) q -= lcurl(q * sc, .6) * st;
  vec2 d = UV(q) - uv; float k = P2 * .5;
  return vec4(Q(uv + d * (1. + k)).r, Q(uv + d).g, Q(uv + d * (1. - k)).b, 1.);
}`,
  },

  zebra: {
    name: "Op-Art-Zebra", herkunft: "Op-Art: Streifen biegen sich über dem Relief des Bildes",
    regler: [r("Streifen", .5), r("Relief", .6), r("Schwenk", .5), r("Lesbarkeit", .7), r("Farbakzent", .5), r("Drehungen", .5)],
    glsl: `vec4 effekt(vec2 uv){
  vec3 c = Ql(uv, 0.).rgb;
  float h = lum(Kl(uv, 4.5).rgb), L = lum(Kl(uv, 1.5).rgb);
  // Drehungen wie beim Wirbel: unter einem Drittel schwenken die Streifen hin und her (Schwenk), sonst drehen sie sich
  // ein- oder zweimal ganz pro Schlaufe (Wunsch vom 3. November 2026: «auch bei Op-Art-Zebra bitte eine ganze drehung»)
  float n = floor(P5 * 2.999);
  float ang = .5 + (n < .5 ? P2 * 1.3 * sin(uPhi) : n * uPhi);
  float per = mix(80., 12., P0), k = P1 * (.6 + .4 * (.5 - .5 * cos(2. * uPhi))) * 6.;
  float ph = dot(P(uv), vec2(cos(ang), sin(ang))) * per + k * h * 3.;
  float t = abs(fract(ph) - .5) * 2., aa = fwidth(ph) * 2.4;
  float duty = mix(.5, clamp(1. - L, .08, .92), P3 * uZeigen);   // ohne Bild: gleich breite Streifen, das Motiv nur im Relief
  vec3 col = vec3(smoothstep(duty - aa, duty + aa, t));
  col = mix(col, c, smoothstep(.22, .45, sat(c)) * P4 * uZeigen);
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
  vec4 c = Kl(uv0, 1.5);
  if (uZeigen < .5) c.rgb = vec3(lum(c.rgb));
  float L = lum(c.rgb), D = smoothstep(.1, .9, P3 > .5 ? L : 1. - L);   // dicker heisst dunkler (bei weisser Tinte heller)
  size = max(1., uRes.y / uRows * .9 * (.12 + .95 * D) * (1. - .55 * s));
  vec3 ct = uZeigen > .5 ? c.rgb : vec3(step(.5, P3));   // ohne Bild: reine Tinte, nur die Strichstärke kommt aus dem Bild
  vec3 tinte = P3 < .5 ? mix(vec3(0.), ct, P3 * 2.) : mix(ct, vec3(1.), P3 * 2. - 1.);
  float al = 1. - .6 * s;
  col = vec4(tinte * al, al);
}`,
  },

  tusche: {
    name: "Tuscheblasen", herkunft: "Infinite Mantra: farblose Blasen wölben, drehen und brechen das Bild darunter",
    // seit 3. November 2026 ohne eigene Farbe (Wunsch: «ich möchte dass sie das bild darunter transformieren, aber selber farblos bleiben»):
    // Membran als Linse, Kern dreht, Adern wellen, Rand bricht nach aussen; die Kontur hellt oder dunkelt nur, in Grau
    regler: [r("Anzahl", .5), r("Grösse", .5), r("Atmen", .6), r("Verzerrung", .7), r("Kontur", .25)],
    glsl: `${BLASE}
vec4 effekt(vec2 uv){
  vec2 p = P(uv), off = vec2(0.);
  float kontur = 0.; int n = int(mix(4., 14., P0));
  for (int i = 0; i < 14; i++){
    if (i >= n) break;
    vec2 c; float R; blase(i, P1, P2, c, R);
    vec2 v = (p - c) / R; float d = length(v);
    if (d > 1.15) continue;
    float fi = float(i), innen = 1. - smoothstep(.96, 1.04, d);
    vec2 o = -v * R * (1. - d * d) * .45 * innen;                                   // Linse: zur Mitte hin vergrössert
    vec2 kc = vec2(cos(fi * 2.3 + uPhi), sin(fi * 2.3 + uPhi)) * .35, w = v - kc;
    float kern = exp(-dot(w, w) * 6.);
    o += (rot(1.8 * kern * sin(uPhi + fi)) * w - w) * R * innen;                    // Kern: dreht das Bild
    o += vec2(ln(v * 2.5 + fi, .5), ln(v * 2.5 + fi + 4., .5)) * R * .06 * innen;   // Adern: feine Wellen
    float rand = exp(-pow((d - 1.) * 14., 2.));
    o += normalize(v + 1e-5) * R * .08 * rand;                                       // Rand: Brechung nach aussen
    off += o; kontur += rand;
  }
  vec3 col = Q(UV(p + off * P3 * 1.4)).rgb;
  return vec4(col * (1. - P4 * .45 * clamp(kontur, 0., 1.)), 1.);
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
    vec3 hof = Kl(UV(c), 3.).rgb * pow(1. - d, 2.) * (uZeigen > .5 ? .5 : 1.1);   // die Linse leuchtet in der Farbe des Bildes
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
  vec3 kc = Kl(UV(q), 0.).rgb, col = uZeigen > .5 ? kc : vec3(.043, .035, .039); float L = lum(kc);   // ohne Bild: Glitzer auf dunklem Grund
  float cs = 18. * uRes.y / 1350.;
  vec2 g = uv * uRes / cs, ci = floor(g), f = fract(g) - .5 - (h22(ci) - .5) * .5;
  float h = h12(ci + uSeed * 5.);
  float tw = pow(max(0., sin(uPhi * float(1 + int(h * 4.)) + h * 50.)), 24.);
  float an = step(h12(ci * 1.7 + 2.), P2 * (uZeigen > .5 ? .5 * (.2 + L + sat(kc)) : .1 + 4. * abs(L - lum(Kl(UV(q), 4.).rgb)) + sat(kc)));   // ohne Bild: Glitzer sitzt auf Kanten und Farbe
  float stern = exp(-length(f) * 14.) + .6 * (exp(-abs(f.x) * 40.) * exp(-abs(f.y) * 6.) + exp(-abs(f.y) * 40.) * exp(-abs(f.x) * 6.));
  vec3 gc = mix(vec3(1., .86, .55), vec3(1., .72, .84), h22(ci + 3.).x);
  col += gc * stern * tw * an * 1.6 + (1. - uZeigen) * gc * exp(-length(f) * 12.) * an * .55;   // ohne Bild glimmt jedes Korn leicht
  float dd = dot(uv, vec2(.7071)) - (uT * 2.4 - .7);
  col += P3 * .35 * exp(-dd * dd * 60.) * (.3 + L) * (uZeigen > .5 ? 1. : .25);
  return vec4(clamp(col, 0., 1.), 1.);
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
  float L = uZeigen > .5 ? pow(lum(Q(uv).rgb), .8) : .55;   // ohne Bild: reiner Rauch
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
    name: "Alkoholtinte", herkunft: "infinite mantra (Blüten): das Bild fliesst, darüber durchscheinende Farbschleier mit haarfeinen Tintenrändern",
    // seit 3. November 2026 neu (Rückmeldung: «die alkohol tinte ist noch etwas plump»): statt dicker Höhenlinien drei Schleier,
    // deren Farbe aus dem Bild kommt; an ihren Rändern sammelt sich die Tinte, die Kante selbst ist haarfein
    regler: [r("Fluss", .7), r("Ränder", .6), r("Lasur", .7), r("Massstab", .4)],
    glsl: `vec4 effekt(vec2 uv){
  vec2 p = P(uv), q = p; float sc = mix(.8, 3., P3);
  for (int i = 0; i < 4; i++) q -= lcurl(q * sc * .8, .5) * .025 * P0 / sc;   // das Bild fliesst in langen Schlieren
  vec3 bild = uZeigen > .5 ? Ql(UV(q), .5).rgb : vec3(1.), steuer = Kl(UV(q), .5).rgb;   // ohne Bild: weisses Papier, Schleier aus dem Bild
  vec3 col = mix(vec3(1.), bild, mix(.55, 1., P2));
  for (int j = 0; j < 3; j++){
    float fj = float(j);
    vec2 qj = q * sc * (1. + fj * .45) + fj * 7.3;
    qj += lcurl(qj * .7, .7 + fj * .1) * .35 * P0;
    float e = lfbm(qj, .8) + (lum(steuer) - .5) * .6 - (fj * .12 - .05), aa = fwidth(e) + 1e-4;
    float schleier = smoothstep(-aa, aa, e);
    float saum = schleier * exp(-e / (.05 + .03 * fj));        // die Tinte sammelt sich am Rand
    float linie = exp(-pow(e / (aa * 1.2), 2.));                 // haarfeine Kante
    vec3 farbe = Kl(UV(q + fj * .03), 2.5).rgb;
    col *= mix(vec3(1.), mix(vec3(1.), farbe, .4), schleier * .7 * P2);
    col *= mix(vec3(1.), farbe * farbe * .8 + .05, saum * .5 * P1);
    col = mix(col, farbe * farbe * .45, linie * .75 * P1);
  }
  return vec4(col, 1.);
}`,
  },
  // ——— fünf Effekte aus der Bildinformation (Wunsch vom 4. November 2026: Seifenblase und Holo-Kugel weg, dafür Effekte, die stark
  // mit dem Bild arbeiten und es auch bei «Bild zeigen: aus» klar lesbar machen). Sie lesen Helligkeit als Höhe, ihren Gradienten als
  // Kanten und Strömung (die Senkrechte zum Gradienten folgt den Konturen und ist quellenfrei) und die Farben als Druckauszüge.

  pinsel: {
    name: "Pinselstrom", herkunft: "Line Integral Convolution: Pinselstriche fliessen den Konturen des Bildes entlang, dunkel heisst mehr Tusche",
    regler: [r("Strichlänge", .55), r("Fluss", .3), r("Korn", .4), r("Kontrast", .55), r("Wirbel", .35)],
    glsl: `${FELD}
float korn(vec2 x, float cell){
  vec2 c = x / cell, i = floor(c), f = c - i; f = f * f * (3. - 2. * f);
  return mix(mix(h12(i + uSeed * 9.), h12(i + vec2(1, 0) + uSeed * 9.), f.x), mix(h12(i + vec2(0, 1) + uSeed * 9.), h12(i + 1. + uSeed * 9.), f.x), f.y);
}
vec4 effekt(vec2 uv){
  float k = uRes.y / 1350., lg = mix(12., 46., P0) * k, cell = mix(1.4, 4.5, P2) * k, st = lg / 12.;
  float m = 1. + floor(P1 * 2.999);    // eine bis drei Wellen laufen pro Schlaufe durch jeden Strich
  vec2 x0 = uv * uRes; float sum = 0., ws = 0.; vec3 cs = vec3(0.);
  for (int s = -1; s <= 1; s += 2){
    vec2 x = x0;
    for (int i = 0; i < 12; i++){
      float a = float(s) * (float(i) + .5) / 12.;                       // Lage im Strich, −1 … 1
      float w = .5 + .5 * cos(PI * a);                                   // Hann-Fenster: der Strich läuft weich aus
      float welle = 1. + .8 * cos(TAU * (a * 1.5 - uT * m));           // die Welle wandert den Strich entlang
      vec2 u = x / uRes;
      sum += w * welle * korn(x, cell); ws += w * welle;
      cs += w * Kl(u, 1.).rgb;
      x += float(s) * st * strom(u, 2.5, 4., P4);
    }
  }
  float r = clamp((sum / ws - .5) * mix(2.5, 7., P3) + .5, 0., 1.);
  vec3 farbe = cs / (12. * 2. * .5);                                    // Farbe, entlang des Strichs verwischt
  float D = 1. - lum(farbe);
  vec3 papier = vec3(.95, .925, .9), tusche = vec3(.06, .05, .06);
  vec3 aus = mix(papier, tusche, clamp(D * 1.35 + (.5 - r) * 1.1 - .12, 0., 1.));   // ohne Bild: Tusche auf Papier
  vec3 an = farbe * (.45 + 1.1 * r);
  return vec4(clamp(mix(aus, an, uZeigen), 0., 1.), 1.);
}`,
  },

  raster: {
    name: "Druckraster", herkunft: "Halbton: vier gedrehte Raster wie im Offsetdruck, Punkte verschmelzen als Distanzfelder im Dunkeln und atmen in Wellen",
    regler: [r("Raster", .45), r("Drehung", .5), r("Welle", .5), r("Verschmelzen", .5), r("Negativ", 0)],
    glsl: `float smin(float a, float b, float k){ float h = max(k - abs(a - b), 0.) / k; return min(a, b) - h * h * k * .25; }
// Deckung eines Rasters: Kanal ch (0 Helligkeit, 1–3 Cyan/Magenta/Gelb, 4–6 Rot/Grün/Blau, 7 Schwarz), Winkel ang, N Zellen je Bildhöhe
float schirm(vec2 p, float ang, float N, int ch){
  mat2 R = rot(ang); vec2 q = R * p * N, ci = floor(q);
  float d = 1e3, lod = max(0., log2(uRes.y / N) - 1.), sk = mix(.02, .45, P3);
  for (int y = -1; y <= 1; y++) for (int x = -1; x <= 1; x++){
    vec2 c = ci + vec2(x, y) + .5, pc = transpose(R) * (c / N);
    vec3 im = Kl(UV(pc), lod).rgb; float L = lum(im), K = 1. - max(im.r, max(im.g, im.b));
    vec3 cmy = (1. - im - K) / max(1. - K, .05);
    float v = ch == 0 ? 1. - L : ch == 1 ? cmy.x : ch == 2 ? cmy.y : ch == 3 ? cmy.z : ch == 4 ? im.r : ch == 5 ? im.g : ch == 6 ? im.b : ch == 7 ? K : L;
    float rr = .62 * sqrt(clamp(v, 0., 1.)) * (1. + P2 * .22 * sin(uPhi - length(pc) * 9.));   // Welle von der Mitte aus
    if (rr > .02) d = smin(d, length(q - c) - rr, sk);
  }
  float aa = N / uRes.y;
  return smoothstep(aa, -aa, d);
}
vec4 effekt(vec2 uv){
  vec2 p = P(uv); float N = mix(150., 40., P0);
  // Drehung: unter einem Drittel pendelt das Raster, sonst dreht es eine Viertel- oder halbe Drehung pro Schlaufe (das Raster ist
  // vierfach symmetrisch, darum schliesst die Schlaufe)
  float n = floor(P1 * 2.999), a0 = n < .5 ? .25 * sin(uPhi) : n * uPhi / 4.;
  vec3 papier = vec3(.95, .925, .9), nacht = vec3(.043, .035, .039), col;
  if (P4 < .5){
    if (uZeigen < .5) col = mix(papier, vec3(.06, .05, .06), schirm(p, a0 + .785, N, 0));   // ohne Bild: ein schwarzes Raster
    else {
      col = papier;
      col *= 1. - schirm(p, a0 + .262, N, 1) * vec3(1., .32, .06);   // Cyan 15°
      col *= 1. - schirm(p, a0 + 1.309, N, 2) * vec3(.07, 1., .45);  // Magenta 75°
      col *= 1. - schirm(p, a0, N, 3) * vec3(.0, .07, 1.);           // Gelb 0°
      col *= 1. - schirm(p, a0 + .785, N, 7) * .97;                  // Schwarz 45°
    }
  } else {
    if (uZeigen < .5) col = mix(nacht, papier, schirm(p, a0 + .785, N, 8));                  // ohne Bild: helle Punkte auf Schwarz
    else col = nacht + vec3(schirm(p, a0 + .262, N, 4), schirm(p, a0 + 1.309, N, 5), schirm(p, a0, N, 6)) * .95;   // Licht: Rot, Grün, Blau
  }
  return vec4(col, 1.);
}`,
  },

  relief: {
    name: "Relief", herkunft: "2.5D: Helligkeit als Tiefe, das Bild wird zum Relief, die Kamera schwebt (Parallaxe) und ein Licht kreist darüber",
    regler: [r("Tiefe", .55), r("Parallaxe", .45), r("Lichthöhe", .45), r("Glanz", .4), r("Material", .2)],
    glsl: `${FELD}
float H(vec2 uv){ return .45 * hoehe(uv, 1.) + .35 * hoehe(uv, 2.5) + .2 * hoehe(uv, 4.5); }
vec4 effekt(vec2 uv){
  vec2 cam = vec2(cos(uPhi), .6 * sin(uPhi)) * mix(0., .05, P1), u = uv;
  for (int i = 0; i < 5; i++) u = uv - cam * (H(u) - .5) / vec2(A(), 1.);   // Parallaxe: Nahes verschiebt sich stärker
  float e = 2.5 / uRes.y;
  vec2 g = vec2(H(u + vec2(e / A(), 0.)) - H(u - vec2(e / A(), 0.)), H(u + vec2(0., e)) - H(u - vec2(0., e))) / (2. * e);
  vec3 n = normalize(vec3(-g * mix(.004, .05, P0), 1.));
  float la = uPhi + .7;
  vec3 Ld = normalize(vec3(cos(la), sin(la), mix(.25, 1.2, P2)));
  float dif = max(dot(n, Ld), 0.), hoch = H(u);
  float ao = clamp(1. - (hoehe(u, 5.) - hoehe(u, 1.5)) * 1.6, .35, 1.);   // Mulden bekommen weniger Licht
  float spec = pow(max(dot(n, normalize(Ld + vec3(0., 0., 1.))), 0.), mix(6., 90., P3)) * P3 * 1.4;
  vec3 gips = vec3(.93, .9, .86), metall = vec3(.78, .6, .38);
  vec3 alb = uZeigen > .5 ? Ql(u, 0.).rgb : mix(gips, metall * (.55 + .45 * hoch), P4);   // ohne Bild: Gips oder Metall
  vec3 sc = mix(vec3(1.), metall * 1.3 + .2, P4 * (1. - uZeigen));
  vec3 col = alb * (.16 + .95 * dif) * ao + sc * spec;
  return vec4(clamp(col, 0., 1.), 1.);
}`,
  },

  hoehenlinien: {
    name: "Höhenlinien", herkunft: "Topografie: die Helligkeit als Gelände, Höhenlinien steigen langsam bergauf, jede vierte kräftiger",
    regler: [r("Linien", .45), r("Steigen", .3), r("Strich", .4), r("Wellen", .3), r("Flächen", .35)],
    glsl: `${FELD}
vec4 effekt(vec2 uv){
  vec2 p = P(uv);
  float h = .6 * hoehe(uv, 1.5) + .4 * hoehe(uv, 3.5) + lfbm(p * 2.5, .7) * .05 * P3;
  float N = mix(8., 46., P0), sp = 4. * floor(1. + P1 * 1.999);   // vier oder acht Linien pro Schlaufe: die kräftigen schliessen an
  float f = h * N - uT * sp, fr = fract(f), aa = max(fwidth(f), 1e-4);
  float d = min(fr, 1. - fr) / aa, k = uRes.y / 1350.;
  float idx = mod(floor(f + .5), 4.), w = mix(.5, 1.8, P2) * k * (idx < .5 ? 2.4 : 1.);
  float linie = clamp(w - d + .5, 0., 1.);
  float band = mod(floor(f), 2.) * .5 + .5 * h;                         // Höhenstufen als leise Flächen
  vec3 nacht = vec3(.043, .035, .039), papier = vec3(.95, .925, .9);
  vec3 aus = mix(nacht + papier * band * .16 * P4, papier, linie * (.65 + .35 * step(idx, .5)));
  vec3 im = Ql(uv, 0.).rgb;
  vec3 an = mix(im * (.22 + .3 * P4 * band), mix(im, vec3(1.), .35), linie);
  return vec4(mix(aus, an, uZeigen), 1.);
}`,
  },

  stroemung: {
    name: "Strömung", herkunft: "Flow Field: Lichtteilchen ziehen mit Schweif den Konturen des Bildes nach, wo Kanten sind, sammeln sie sich",
    regler: [r("Dichte", .5), r("Tempo", .4), r("Punktgrösse", .35), r("Wirbel", .3), r("Kanten", .6)],
    mischung: "add",
    // die Zahl der Teilchen folgt der Bildhöhe (kleine Vorschauen rechnen weniger), je Teilchen acht Punkte für den Schweif
    punkte: (w, a, h) => { const c = Math.max(40, Math.round((110 + 100 * w[0]) * Math.sqrt(Math.min(1, h / 1000)))); return { cols: c * 8, rows: Math.round(c / a) }; },
    glsl: `${FELD}
void punkt(int id, out vec2 pos, out vec4 col, out float size){
  float i = float(id), cx = uCols / 8., xx = mod(i, uCols), j = mod(xx, 8.);
  vec2 g = vec2(floor(xx / 8.), floor(i / uCols));
  float h = h12(g * 1.31 + uSeed), m = 2. + floor(P1 * 2.999);           // zwei bis vier Leben pro Schlaufe
  float zz = uT * m + h, u = fract(zz), cyc = mod(floor(zz), m);         // das Leben n und n + m sind dasselbe: die Schlaufe schliesst
  vec2 sp = (g + h22(g + cyc * 17.3 + uSeed)) / vec2(cx, uRows);
  vec3 c0 = Kl(sp, 1.).rgb; float L0 = lum(c0), ek = length(feldG(sp, 1.5, 3.));
  float wgt = mix(.25 + .75 * (1. - L0), smoothstep(1., 14., ek), P4);  // wo Teilchen entstehen: im Dunklen oder an Kanten
  pos = vec2(9.); col = vec4(0.); size = 0.;
  if (h12(g * 2.7 + cyc * 3.1 + 5.) > wgt) return;
  float age = max(u - j * .022, 0.), steps = age * 18.;
  vec2 q = P(sp), sl = vec2(.18 / 18.);
  for (int k = 0; k < 18; k++){
    float dt = clamp(steps - float(k), 0., 1.);
    if (dt <= 0.) break;
    q += dt * sl * strom(UV(q), 1.5, 3., P3);
  }
  pos = q;
  float a = sin(PI * u) * (1. - j / 8.) * (age > 0. ? 1. : 0.);
  vec3 c = uZeigen > .5 ? min(c0 * 1.4 + .05, 1.) : vec3(.95, .925, .9);   // ohne Bild: helles Licht, die Form kommt aus dem Bild
  col = vec4(c * a * 1.2, a);
  size = mix(1.5, 5., P2) * uRes.y / 1350. * (1. - j / 12.) + .6;
}`,
  },
  // ——— drei weitere nach Christians Stichworten vom 4. November 2026: «röntgen/laserscan, krasse montagen, absolut aktuelle prozess-visualisierung»

  roentgen: {
    name: "Röntgen-Scan", herkunft: "Röntgen und LiDAR: das Bild durchleuchtet (Dichte und Kanten), ein Laser fährt darüber und hinterlässt Höhenprofile",
    regler: [r("Durchleuchtung", .6), r("Scanlinien", .5), r("Höhe", .5), r("Spur", .5), r("Farbe", .3)],
    glsl: `${FELD}
vec4 effekt(vec2 uv){
  float k = uRes.y / 1350.;
  float L = hoehe(uv, 1.), det = hoehe(uv, .5) - hoehe(uv, 3.5), ek = length(feldG(uv, 1., 2.));
  float xr = clamp(.05 + .5 * pow(L, 1.3) + (1.6 * abs(det) + smoothstep(2., 30., ek) * .45) * (.4 + P0), 0., 1.);
  vec3 film = vec3(.5, .8, 1.) * xr;
  if (uZeigen > .5) film = mix(film, Ql(uv, 1.).rgb * (.35 + xr), P4);
  film += (h12(floor(uv * uRes) + floor(uT * 360.)) - .5) * .05;      // Filmkorn
  // Laser: fährt hinunter und wieder hinauf; hinter ihm bleiben Höhenprofile (Scanlinien, um die Bildhöhe nach oben verschoben)
  float ly = mix(-.06, 1.06, .5 + .5 * cos(uPhi)), dv = -sin(uPhi), hinter = (uv.y - ly) * sign(dv) * -1.;
  float spur = exp(-max(hinter, 0.) / mix(.08, .7, P3)) * step(0., hinter) * smoothstep(0., .25, abs(dv));
  float sp = mix(16., 5., P1) * k, amp = mix(4., 46., P2) * k, ypx = uv.y * uRes.y, r0 = floor(ypx / sp), prof = 0.; vec3 pc = vec3(0.);
  for (int j = 0; j < 9; j++){
    float yr = (r0 - float(j)) * sp; vec2 u = vec2(uv.x, yr / uRes.y);
    float hh = .6 * hoehe(u, 1.5) + .4 * hoehe(u, 3.);
    float d = abs(ypx - yr - hh * amp), l = clamp(1.1 * k + .4 - d, 0., 1.);
    if (l > prof){ prof = l; pc = uZeigen > .5 ? Kl(u, 1.).rgb : vec3(.55, 1., .85); }
  }
  vec3 laser = vec3(1., .16, .1);
  float dy = (uv.y - ly) * uRes.y / k;
  float strahl = exp(-dy * dy * .5) + .35 * exp(-abs(dy) / 22.);
  vec3 col = film * (1. - .75 * spur) + pc * prof * spur * 1.8 + laser * strahl * 1.2 + vec3(1.) * exp(-dy * dy * 2.) * .8;
  col *= 1. - .35 * dot(P(uv), P(uv));                                // Vignette
  return vec4(clamp(col, 0., 1.), 1.);
}`,
  },

  montage: {
    name: "Montage", herkunft: "Quadtree-Collage: das Bild zerfällt dort in kleine Kacheln, wo es viel Detail hat; Kacheln verrutschen, drehen, spiegeln und glitchen",
    regler: [r("Teilung", .5), r("Verrutschen", .5), r("Drehen", .4), r("Glitch", .4), r("Fugen", .5)],
    glsl: `${FELD}
vec4 effekt(vec2 uv){
  vec2 p = P(uv); float sz = .5, lv = 0.; vec2 c = floor(p / sz) * sz;
  float thr = mix(.3, .035, P0) * (1. + .45 * sin(uPhi));            // die Teilung atmet: Kacheln teilen und schliessen sich
  for (int i = 0; i < 6; i++){
    vec2 m = c + sz * .5; float lq = max(0., log2(sz * .5 * uRes.y) - 1.), q = sz * .25;
    float a = hoehe(UV(m + vec2(-q, -q)), lq), b = hoehe(UV(m + vec2(q, -q)), lq), e = hoehe(UV(m + vec2(-q, q)), lq), d = hoehe(UV(m + vec2(q, q)), lq);
    if (max(max(a, b), max(e, d)) - min(min(a, b), min(e, d)) < thr) break;
    sz *= .5; c = floor(p / sz) * sz; lv += 1.;
  }
  vec2 h = h22(c * 37.1 + lv * 3.3 + uSeed), f = (p - c) / sz - .5, m = c + sz * .5;
  float an = step(1. - P2 * .6, h.y) * floor(fract(uT * 2. + h.x) * 4.) * PI * .5;   // Vierteldrehungen, hart geschnitten
  f = rot(an) * f; if (h.x > .8) f.x = -f.x;
  float sl = pow(.5 + .5 * sin(uPhi + h.x * TAU), 3.);
  vec2 src = m + f * sz * mix(1., .6, step(.7, h.x)) + (h - .5) * sz * 3. * P1 * sl;
  vec3 col;
  if (uZeigen > .5){
    float gl = step(1. - P3 * .5, h22(c * 5.7 + floor(uT * 6.)).x), ca = .01 * gl;
    col = vec3(Ql(UV(src + vec2(ca, 0)), 0.).r, Ql(UV(src), 0.).g, Ql(UV(src - vec2(ca, 0)), 0.).b);
    if (h.y < P3 * .25) col = vec3(lum(col));                        // manche Kacheln grau, manche negativ
    else if (h.y < P3 * .4) col = 1. - col;
  } else {
    // ohne Bild: jede Kachel schraffiert, Dichte aus dem Ton des Bildes an ihrer Quelle, Winkel je Kachel
    float t = hoehe(UV(src), max(0., log2(sz * uRes.y) - 2.)), per = max(7. * uRes.y / 1350., 3.);
    vec2 dir = vec2(cos(h.x * PI), sin(h.x * PI));
    float s = abs(fract(dot(p * uRes.y, dir) / per) - .5) * 2.;
    col = mix(vec3(.043, .035, .039), vec3(.95, .925, .9), smoothstep(.12, 0., s - floor(t * 4. + .5) / 4. * .95));
  }
  vec2 fr = min((p - c), sz - (p - c)) * uRes.y; float fuge = clamp(mix(0., 2.5, P4) * uRes.y / 1350. - min(fr.x, fr.y) + .5, 0., 1.);
  col = mix(col, vec3(.043, .035, .039), fuge);
  return vec4(col, 1.);
}`,
  },

  entrauschen: {
    name: "Entrauschen", herkunft: "Diffusionsmodell: aus reinem Rauschen entsteht das Bild Schritt für Schritt, grob zuerst (latente Blöcke), dann fein, und zerfällt wieder",
    regler: [r("Rauschen", .9), r("Blöcke", .6), r("Haltezeit", .5), r("Körnung", .3), r("Fortschritt", 1)],
    glsl: `vec4 effekt(vec2 uv){
  float env = .5 - .5 * cos(uPhi), pr = smoothstep(0., mix(1., .5, P2), env), N = 40.;
  float st = floor(pr * N) / N;                                        // vierzig Entrauschungsschritte hin, vierzig zurück
  float k = uRes.y / 1350.; vec2 px = uv * uRes;
  float B = exp2(floor(mix(5.5, 0., pow(st, .6)) * P1 + .5)) * k;     // latente Blöcke: 32, 16, 8 … 1 Pixel
  vec2 bc = (floor(px / B) + .5) * B / uRes;
  vec3 x0 = Kl(bc, log2(max(B, 1.)) + mix(3., 0., st)).rgb;           // die Vorhersage wird schärfer
  float g = mix(1., 4., P3) * k;
  vec2 nq = floor(px / g) * .73; float rr = 6.;                     // Rauschen, das auf einem Kreis durch die Zeit läuft: es flimmert und schliesst
  vec3 eps = vec3(ln(nq, rr), ln(nq + 31.7, rr), ln(nq + 63.1, rr)) * 1.9;
  float a = st;                                                        // Signalanteil wie in einem linearen Zeitplan
  vec3 x = sqrt(a) * (x0 * 2. - 1.) + sqrt(1. - a) * eps * P0;
  vec3 col = clamp(x * .5 + .5, 0., 1.);
  if (uZeigen < .5){                                                   // ohne Bild: 1-Bit-Tusche, das Motiv entsteht als Streuraster
    float v = lum(col);
    col = mix(vec3(.043, .035, .039), vec3(.95, .925, .9), step(h12(floor(px / max(g, 1.)) + 7.), v));
  }
  // Fortschritt: ein Balken mit vierzig Strichen am unteren Rand
  float by = px.y / k;
  if (P4 > .5 && by > 26. && by < 30. && uv.x > .08 && uv.x < .92){
    float xx = (uv.x - .08) / .84, tick = step(.15, fract(xx * N));
    col = mix(col * .4, vec3(.95, .925, .9), step(xx, st) * tick * .9 + .1);
  }
  return vec4(col, 1.);
}`,
  },
  // ——— und drei aus Christians Listen vom 4. November 2026 (TouchDesigner-Bausteine und Bildeffekte): Feedback/Transform/Bloom,
  // Watercolor Bleed und Instancing (Geometry COMP mit Box SOP)

  echo: {
    name: "Echo", herkunft: "Feedback-Schleife: das Bild hinterlässt gezoomte, gedrehte Echos, die einer kreisenden Mitte nachziehen, dazu Bloom",
    regler: [r("Echos", .6), r("Kreisen", .5), r("Zoom", .5), r("Drall", .6), r("Bloom", .5)],
    // ohne Rückkopplungspuffer gerechnet: Echo k ist das Bild zur Zeit t − k·Δ, k-mal transformiert, so bleibt die Schlaufe geschlossen
    glsl: `${FELD}
vec4 effekt(vec2 uv){
  vec2 p = P(uv); vec3 acc = vec3(0.); int n = int(mix(3., 14., P0));
  vec3 papier = vec3(.95, .925, .9);
  for (int k = 0; k < 14; k++){
    if (k >= n) break;
    float fk = float(k), ph = uPhi - fk * .22;
    vec2 c = .14 * P1 * vec2(cos(ph), sin(2. * ph));
    vec2 q = c + rot(fk * (P3 - .5) * .16) * (p - c) / pow(mix(1., 1.09, P2), fk);
    vec2 uq = UV(q);
    vec3 im = Kl(uq, .5).rgb; float L = lum(im);
    float kante = smoothstep(2., 22., length(feldG(uq, 1., 2.)));
    vec3 tint = .5 + .5 * cos(TAU * (fk / float(n) * .8 + vec3(0., .33, .67) + uT));   // jedes Echo verschiebt den Farbton
    vec3 src = uZeigen > .5 ? (k == 0 ? Ql(uq, 0.).rgb : im * smoothstep(.3, .8, max(L, sat(im))) * mix(vec3(1.), tint, .6))
                            : kante * (k == 0 ? papier : mix(papier, tint, .7));         // ohne Bild: die Konturen als Echos
    float w = pow(mix(.55, .86, P0), fk);
    acc = max(acc, src * w);
  }
  vec3 b = uZeigen > .5 ? max(Kl(uv, 4.).rgb - .45, 0.) + max(Kl(uv, 2.5).rgb - .6, 0.)
                        : vec3(smoothstep(2., 14., length(feldG(uv, 3.5, 6.)))) * .35;
  acc += b * P4 * 1.6;
  return vec4(clamp(acc, 0., 1.), 1.);
}`,
  },

  aquarell: {
    name: "Aquarell", herkunft: "Watercolor Bleed: das Bild in Lasuren, die nass ineinanderlaufen, Pigment sammelt sich am Rand, Papierkörnung",
    regler: [r("Nässe", .6), r("Lasuren", .45), r("Ränder", .6), r("Körnung", .5), r("Pigment", .3)],
    glsl: `vec4 effekt(vec2 uv){
  vec2 p = P(uv), px = uv * uRes;
  vec2 w = vec2(lfbm(p * 2.6, .7), lfbm(p * 2.6 + 5.2, .7)) * .035 * P0;   // die Farbe läuft aus
  vec2 u = uv + w + vec2(lfbm(p * 9., .9), lfbm(p * 9. + 2.7, .9)) * .006 * P0;
  vec3 c = Kl(u, 2.).rgb; float L = lum(c);
  float lv = mix(3., 8., P1), e = (1. - L) * lv + lfbm(p * 7. + 3., .8) * .5 * P0;
  float st = floor(e), f = fract(e), dk = clamp(st, 0., lv) / lv;            // Deckung der Lasur in Stufen
  float rand = exp(-(1. - f) * 12.) * P2 * step(.5, e);                       // Pigment sammelt sich an der Kante zur helleren Stufe
  float korn = (gn(vec3(px / (2.2 * uRes.y / 1350.), uSeed)) * .5 + h12(floor(px)) - .5) * P3;
  vec3 papier = vec3(.96, .94, .9) * (1. - .04 * P3 * gn(vec3(px * .02, 7.)));
  vec3 pig = uZeigen > .5 ? mix(c, Kl(u, 4.).rgb, .3) : mix(vec3(.16, .22, .42), vec3(.42, .25, .16), P4);   // ohne Bild: eine Farbe (Indigo bis Sepia)
  vec3 sattTon = pig / max(lum(pig), .05) * .55;
  vec3 pc = uZeigen > .5 ? mix(pig, sattTon, .25) : pig;
  float dicht = clamp(dk * (1. + .25 * korn) + rand * .35, 0., 1.);
  vec3 col = papier * mix(vec3(1.), pc / max(papier, .05), dicht);           // subtraktiv auf Papier
  return vec4(clamp(col, 0., 1.), 1.);
}`,
  },

  voxel: {
    name: "Voxel", herkunft: "Instancing: das Bild als Feld aus tausenden Quadern, die Höhe aus der Helligkeit, eine Welle läuft durch, die Kamera schwenkt",
    regler: [r("Raster", .45), r("Neigung", .5), r("Schwenk", .5), r("Höhe", .5), r("Welle", .5)],
    glsl: `float vH(vec2 cell, float N, float Hm, out vec3 alb){
  vec2 m = (cell + .5) / N; vec3 im = Kl(UV(m), max(0., log2(uRes.y / N) - .5)).rgb; alb = im;
  float inb = step(abs(m.x), A() * .5) * step(abs(m.y), .5);
  return inb * Hm * (.04 + .96 * pow(lum(im), 1.1)) * (1. + P4 * .35 * sin(uPhi - length(m) * 9.));
}
vec4 effekt(vec2 uv){
  vec2 p = P(uv); float N = mix(28., 120., P0), Hm = mix(.03, .22, P3);
  float el = mix(1.3, .62, P1), az = -PI * .5 + P2 * .45 * sin(uPhi);
  vec3 v = vec3(cos(el) * cos(az), cos(el) * sin(az), sin(el));
  vec3 rr = normalize(cross(vec3(0., 0., 1.), v)), up = cross(v, rr);
  vec3 ro = rr * p.x * 1.02 + up * p.y * (1.02 / max(sin(el) + .25 * cos(el), .3)) + v * 2., rd = -v;
  rd.xy += 1e-5;
  float t = (Hm * 1.4 - ro.z) / rd.z; vec3 pos = ro + rd * t;
  vec2 cell = floor(pos.xy * N), stp = sign(rd.xy), tD = abs(1. / (rd.xy * N));
  vec2 tM = t + ((cell + max(stp, 0.)) / N - pos.xy) / rd.xy;
  float tE = t; int ax = -1; vec3 nrm = vec3(0., 0., 1.), alb = vec3(0.); float hit = 0., th = 0., hh = 0.;
  for (int i = 0; i < 200; i++){
    float h = vH(cell, N, Hm, alb), tX = min(tM.x, tM.y);
    if (ro.z + rd.z * tE <= h){ th = tE; nrm = ax == 0 ? vec3(-stp.x, 0., 0.) : ax == 1 ? vec3(0., -stp.y, 0.) : vec3(0., 0., 1.); hit = 1.; hh = h; break; }
    if (ro.z + rd.z * tX <= h){ th = (h - ro.z) / rd.z; nrm = vec3(0., 0., 1.); hit = 1.; hh = h; break; }
    if (tM.x < tM.y){ cell.x += stp.x; tE = tM.x; tM.x += tD.x; ax = 0; } else { cell.y += stp.y; tE = tM.y; tM.y += tD.y; ax = 1; }
  }
  vec3 nacht = vec3(.043, .035, .039);
  if (hit < .5) return vec4(nacht, 1.);
  vec3 hp = ro + rd * th; vec2 lc = fract(hp.xy * N);
  vec3 Ld = normalize(vec3(.5 * cos(uPhi * .0 + .8), .4, .8));
  float dif = max(dot(nrm, Ld), 0.), ao = .55 + .45 * clamp(hp.z / max(hh, 1e-4), 0., 1.);
  float fuge = nrm.z > .5 ? smoothstep(.0, .08, min(min(lc.x, 1. - lc.x), min(lc.y, 1. - lc.y))) : 1.;
  vec3 a = uZeigen > .5 ? Ql(UV((cell + .5) / N), 0.).rgb : vec3(.95, .925, .9) * (.5 + .5 * hh / Hm);   // ohne Bild: weisse Quader, die Höhe erzählt das Bild
  vec3 col = a * (.22 + .85 * dif) * ao * (.75 + .25 * fuge);
  return vec4(clamp(col, 0., 1.), 1.);
}`,
  },
  // ——— Nachtrag vom 4. November 2026 (Christians Liste «KI & Algorithmische Transformationen»): Pixel Sorting, Dolly-Zoom, Lichtstrahlen

  sortieren: {
    name: "Pixel Sorting", herkunft: "Glitch: Pixelreihen in einem Helligkeitsfenster werden nach Helligkeit sortiert und ziehen sich wie schmelzende Daten in die Länge",
    regler: [r("Fenster", .5), r("Länge", .55), r("Richtung", 0), r("Wandern", .5), r("Kontrast", .4)],
    glsl: `vec4 effekt(vec2 uv){
  float k = uRes.y / 1350., ang = P2 * PI * .5;            // 0 senkrecht, 1 waagrecht
  vec2 dir = vec2(sin(ang), cos(ang)) / uRes;              // ein Pixel in Sortierrichtung, in uv
  float mitte = .5 + .18 * sin(uPhi) * P3, br = mix(.12, .45, P0);
  float lo = mitte - br, hi = mitte + br;                  // das Fenster wandert durch die Helligkeiten
  float Lmax = mix(40., 520., P1) * k * (.75 + .25 * cos(uPhi)), st = Lmax / 40.;
  float L0 = lum(Kl(uv, .5).rgb);
  vec3 bild = Ql(uv, 0.).rgb, nacht = vec3(.043, .035, .039);
  if (L0 < lo || L0 > hi) return vec4(uZeigen > .5 ? bild : nacht, 1.);
  float a = 0., b = 0.;                                    // die Spanne finden, in der alle Pixel im Fenster liegen
  for (int i = 1; i <= 40; i++){ float l = lum(Kl(uv - dir * st * float(i), .5).rgb); if (l < lo || l > hi) break; a = float(i); }
  for (int i = 1; i <= 40; i++){ float l = lum(Kl(uv + dir * st * float(i), .5).rgb); if (l < lo || l > hi) break; b = float(i); }
  if (a + b < 1.) return vec4(uZeigen > .5 ? bild : nacht, 1.);
  float ls[24]; vec3 cs[24];                               // 24 Proben der Spanne, dann das Quantil an meiner Stelle
  for (int j = 0; j < 24; j++){ vec2 q = uv + dir * st * mix(-a, b, (float(j) + .5) / 24.); cs[j] = Kl(q, .5).rgb; ls[j] = lum(cs[j]); }
  float f = a / (a + b), ziel = f * 23.; int best = 0; float bd = 1e3;
  for (int j = 0; j < 24; j++){
    float rang = 0.; for (int m = 0; m < 24; m++) rang += ls[m] < ls[j] || (ls[m] == ls[j] && m < j) ? 1. : 0.;
    float d = abs(rang - ziel); if (d < bd){ bd = d; best = j; }
  }
  vec3 c = cs[best]; float v = ls[best];
  c = (c - .5) * (1. + P4) + .5;
  vec3 aus = mix(nacht, vec3(.95, .925, .9), clamp((v - lo) / (hi - lo) * (1. + P4) - P4 * .5, 0., 1.));   // ohne Bild: nur die sortierten Strähnen
  return vec4(clamp(uZeigen > .5 ? c : aus, 0., 1.), 1.);
}`,
  },

  vertigo: {
    name: "Dolly-Zoom", herkunft: "Vertigo-Effekt: Helligkeit als Tiefe; der Vordergrund bleibt gleich gross, der Hintergrund fährt heran und weg, mit Zoomschlieren",
    regler: [r("Zoom", .6), r("Vordergrund", .5), r("Schlieren", .5), r("Kante", .4)],
    glsl: `float tief(vec2 uv){ return smoothstep(mix(.15, .7, P1) - .06, mix(.15, .7, P1) + .06, .6 * lum(Kl(uv, 2.5).rgb) + .4 * lum(Kl(uv, 4.5).rgb)); }
vec4 effekt(vec2 uv){
  vec2 p = P(uv); float z = P0 * .45 * sin(uPhi), vz = cos(uPhi);
  float fg = tief(uv);
  vec3 hg = vec3(0.); float n = 0.;
  for (int i = 0; i < 8; i++){                             // Hintergrund: skaliert um die Mitte, Schlieren in Zoomrichtung
    float s = 1. / (1. + z + P2 * .04 * vz * (float(i) / 7. - .5) * P0);
    vec2 q = p * s; float g = 1. - tief(UV(q)) * .97; hg += Ql(UV(q), .5).rgb * g; n += g;
  }
  hg /= max(n, 1e-3);
  vec3 vor = uZeigen > .5 ? Ql(uv, 0.).rgb : vec3(.95, .925, .9) * (.75 + .25 * lum(Kl(uv, 1.).rgb));   // ohne Bild: helle Silhouette vor dem zoomenden Raster
  vec3 col = mix(hg * (1. - .25 * abs(z)), vor, fg);
  float kante = fg * (1. - fg) * 4.;
  col += kante * P3 * .5 * vec3(.95, .925, .9);
  return vec4(clamp(col, 0., 1.), 1.);
}`,
  },

  strahlen: {
    name: "Lichtstrahlen", herkunft: "God Rays: helle Bildteile werfen wabernde Lichtstrahlen in den Raum, darin schwebt Staub in drei Tiefen",
    regler: [r("Strahlen", .65), r("Wabern", .5), r("Staub", .5), r("Schwelle", .5), r("Bild", .5)],
    glsl: `vec4 effekt(vec2 uv){
  vec2 lp = vec2(.5 + .22 * cos(uPhi), .78 + .08 * sin(2. * uPhi));     // die Lichtquelle zieht einen kleinen Kreis
  vec2 d = (uv - lp) / 40. * mix(.6, 1., P0); vec2 q = uv; float dec = 1., acc = 0.;
  float thr = mix(.25, .8, P3);
  for (int i = 0; i < 40; i++){
    q -= d;
    float m = smoothstep(thr, thr + .25, lum(Kl(q, 2.).rgb));
    m *= .75 + .5 * P1 * (ln(q * vec2(9., 2.) + 3., .8) * .5 + .5);    // wabern
    acc += m * dec; dec *= .955;
  }
  acc *= mix(.02, .07, P0);
  vec3 licht = vec3(1., .9, .72);
  vec3 grund = uZeigen > .5 ? Ql(uv, 0.).rgb * mix(.25, 1., P4) : vec3(.043, .035, .039) + licht * smoothstep(thr, thr + .25, lum(Kl(uv, 1.5).rgb)) * .18;
  vec3 col = grund + licht * acc;
  float staub = 0.;                                                       // Staub in drei Tiefen, sichtbar im Licht
  for (int l = 0; l < 3; l++){
    float fl = float(l), cs = (14. + fl * 9.) * uRes.y / 1350.;
    vec2 off = vec2(cos(uPhi + fl * 2.), sin(uPhi * (1. + fl) + fl)) * (8. + fl * 5.) * uRes.y / 1350.;
    vec2 g = (uv * uRes + off) / cs, ci = floor(g), j = h22(ci + fl * 31. + uSeed);
    vec2 f = g - ci - .2 - .6 * j;
    float r = (.05 + .07 * j.x) * (1. - fl * .25);
    staub += smoothstep(r, r * .3, length(f)) * step(1. - P2 * .7, j.y) * (1. - fl * .3);
  }
  col += licht * staub * (.15 + acc * 2.5) * P2;
  return vec4(clamp(col, 0., 1.), 1.);
}`,
  },
};

export const EFFEKT_IDS = Object.keys(EFFEKTE);
