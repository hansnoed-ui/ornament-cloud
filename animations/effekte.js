// Animationen – die Effekte als Bausteine. Jeder ist eine Funktion der Zeit in der Schlaufe (uPhi, uT) und liest seine Quelle mit
// Q(uv): das Bild (bildfüllend) oder die Ebenen darunter. Regler laufen von 0 bis 1 (uP[0] … uP[5]).
// Herkunft: die nachgebauten Effekte aus dem Projekt «Animations» (Python, Desktop «claude social media/Animations», UEBERGABE.md)
// und drei Referenzvideos vom 3. November 2026 (holotx, incrprl.dsgn, infinite mantra), hier neu als Shader für den Browser;
// seit 4. November 2026 ohne Seifenblase und Holo-Kugel, dafür Effekte, die stark aus der Bildinformation schöpfen (am Ende der Liste).

// alt: der Wert für Mischungen, die vor dem Regler gesichert wurden (sie behalten so ihr Aussehen), sonst gilt wert
const r = (name, wert, alt) => alt == null ? { name, wert } : { name, wert, alt };
// eine Wahl statt eines Schiebers: der Wert bleibt eine Zahl von 0 bis 1 (Stufe k von n ist k / (n − 1)), so laufen Adresse, Export und Werke wie bisher
const w = (name, stufen, k = 0) => ({ name, wert: k / (stufen.length - 1), stufen });
/** Stufe einer Wahl aus ihrem Wert 0 … 1 */
/** Wert des Reglers k einer Ebene: gesetzt, sonst Vorgabe; fehlt er in einer älteren Mischung (andere Regler gesetzt), gilt alt */
export const wertVon = (def, werte, k) => werte?.[k] ?? (werte?.length && def.regler[k].alt != null ? def.regler[k].alt : def.regler[k].wert);
export const stufe = (rg, v) => Math.min(rg.stufen.length - 1, Math.max(0, Math.round(v * (rg.stufen.length - 1))));

// gemeinsame Blasen (Tusche und Linsen): Lage, Drift und Atmen je Blase
const BLASE = `
void blase(int i, float groesse, float atmen, out vec2 c, out float R){
  float fi = float(i); vec2 h = h22(vec2(fi, 3.) + uSeed), k = h22(vec2(fi, 11.) + uSeed);
  c = (h - .5) * vec2(A() * .92, .92) + .07 * vec2(cos(uPhi + k.x * TAU), sin(uPhi * (1. + floor(k.y * 2.)) + h.x * TAU));
  R = mix(.07, .22, k.x) * mix(.6, 1.7, groesse) * (1. + atmen * .14 * sin(uPhi * (1. + floor(h.y * 2.)) + fi));
}
// Blasen aus dem Bild (Wunsch vom 5. November 2026: «dass die effekte das bild stärker mitnehmen und nicht bloss darüber gelegt werden»):
// jede Blase steigt in wenigen Schritten zu den Formen des Bildes hinauf (was sich hell, dunkel oder farbig vom ganzen Bild abhebt),
// so sitzen die Linsen auf dem Motiv statt auf leerem Grund; f ist, wie stark die Stelle hervortritt (macht die Blase grösser)
float bForm(vec2 c, float M){ vec3 a = Kl(UV(c), 4.5).rgb; return abs(lum(a) - M) * 2. + .7 * sat(a); }
vec2 zumBild(vec2 c, float k, out float f){
  float M = lum(Kl(vec2(.5), 14.).rgb), e = .05; f = bForm(c, M);   // M: die mittlere Helligkeit (kleinste Mip-Stufe)
  int S = uSparsam > .5 ? 1 : 3;                                  // Handy: ein Schritt statt drei
  for (int s = 0; s < 3; s++){
    if (s >= S || k < .01) break;
    vec2 g = vec2(bForm(c + vec2(e, 0.), M) - f, bForm(c + vec2(0., e), M) - f) / e;
    c += g / (length(g) + 1.2) * .075 * k; f = bForm(c, M);
  }
  return clamp(c, -vec2(A() * .5, .5) + .03, vec2(A() * .5, .5) - .03);
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

// Kubismus (Wunsch vom 5. November 2026: Raster und Höhenlinien «weiter in richtung kubistische bzw räumliche verformung und
// strukturierung und veränderung des ausgangsbildes»): das Bild zerfällt in Ebenen (Voronoi-Facetten, sie treiben leicht), und jede
// sieht es aus einer eigenen Perspektive: gedreht, gezoomt, verschoben, gekippt mit Verkürzung und mit eigener Blickrichtung auf das
// Relief der Helligkeit (Parallaxe). Gekippte Ebenen sind schattiert, eine tiefere Ebene liegt am Rand im Schatten der höheren, die
// Kanten als feine Linien. K = 0 lässt alles wie bisher (q = p).
const KUBUS = `
struct Kub { vec2 q, mitte, kipp; float licht, kante, dreh, zoom; };
Kub kubus(vec2 p, float K){
  Kub F; F.q = p; F.mitte = p; F.kipp = vec2(0.); F.licht = 1.; F.kante = 0.; F.dreh = 0.; F.zoom = 1.;
  if (K < .005) return F;
  float n = mix(3.5, 9., K * K);                                     // Raster der Keime je Bildhöhe: erst grob, dann feiner
  vec2 x = p * n, i0 = floor(x), c1 = vec2(0.), c2 = vec2(0.), g1 = vec2(0.), g2 = vec2(0.); float d1 = 1e3, d2 = 1e3;
  // Handy (uSparsam, 5. November 2026: die Kubismus-Ebenen haben die Grafik eines Handys abstürzen lassen): 3 × 3 statt 5 × 5 Keime,
  // ein Blick ins Bild je Keim statt zwei, und mehr Keime bleiben stehen, damit in 3 × 3 immer einer liegt
  int R = uSparsam > .5 ? 1 : 2;
  for (int j = -R; j <= R; j++) for (int i = -R; i <= R; i++){
    vec2 g = i0 + vec2(i, j), h = h22(g + uSeed * 5.3);
    vec2 c = g + .5 + (h - .5) * .7 + .1 * K * vec2(sin(uPhi + h.x * TAU), cos(uPhi + h.y * TAU));
    // Strukturierung aus dem Bild: Keime bleiben, wo das Motiv Kanten und Dunkel hat, auf leeren Flächen nur wenige (grosse Ebenen)
    vec2 cu = UV(c / n); float Lc = lum(Kl(cu, 3.).rgb), Lg = uSparsam > .5 ? .5 : lum(Kl(cu, 5.5).rgb);
    float detail = clamp(abs(Lc - Lg) * (uSparsam > .5 ? 1. : 5.) + (1. - Lc) * .35 + abs(Lc - .5) * .2, 0., 1.);
    if (h12(g * 1.7 + uSeed + 9.) > mix(uSparsam > .5 ? .75 : .3, 1., detail)) continue;
    float d = dot(x - c, x - c);
    if (d < d1){ d2 = d1; c2 = c1; g2 = g1; d1 = d; c1 = c; g1 = g; } else if (d < d2){ d2 = d; c2 = c; g2 = g; }
  }
  if (d2 > 1e2) return F;                                           // kein Nachbar gefunden (nur sparsam möglich): hier keine Ebene
  float k = uRes.y / 1350., ed = abs(dot(x - .5 * (c1 + c2), normalize(c2 - c1 + 1e-5))) / n * uRes.y;   // Abstand zur Kante in Pixeln
  vec2 hA = h22(g1 + uSeed * 5.3 + 17.), hB = h22(g1 + uSeed * 5.3 + 41.), m = c1 / n, v = p - m;
  float z1 = h12(g1 + uSeed + 3.), z2 = h12(g2 + uSeed + 3.);
  float e = .04, L0 = lum(Kl(UV(m), 3.).rgb);
  vec2 gr = vec2(lum(Kl(UV(m + vec2(e, 0.)), 3.).rgb) - lum(Kl(UV(m - vec2(e, 0.)), 3.).rgb),
                 lum(Kl(UV(m + vec2(0., e)), 3.).rgb) - lum(Kl(UV(m - vec2(0., e)), 3.).rgb)) / (2. * e);
  F.kipp = ((hA - .5) * 1.5 + gr * .12) * K;                         // Neigung der Ebene: Zufall und das Gefälle des Bildes
  F.dreh = (hB.x - .5) * .8 * K + .06 * K * sin(uPhi + hB.y * TAU);
  F.zoom = 1. + (hB.y - .5) * .55 * K;
  float pers = 1. / max(1. + dot(F.kipp, v) * 1.3, .35);             // Verkürzung der gekippten Ebene
  vec2 versatz = (hA.yx - .5) * .07 * K + .02 * K * vec2(cos(uPhi + hA.x * TAU), sin(uPhi + hA.y * TAU));
  vec2 q = m + rot(F.dreh) * v * F.zoom * pers + versatz;
  vec2 blick = normalize(hB - .5 + 1e-3) * .07 * K;                   // Mehrperspektive: jede Ebene blickt anders auf das Relief
  q -= blick * (lum(Kl(UV(q), 2.).rgb) - L0);
  F.q = q; F.mitte = m;
  vec3 nr = normalize(vec3(-F.kipp * .9, 1.)), Ld = normalize(vec3(-.5 + .25 * sin(uPhi), .55, .75));
  F.licht = mix(1., clamp(dot(nr, Ld) / Ld.z, .45, 1.35), .7 * K);
  F.licht *= 1. - .4 * K * step(z1, z2) * exp(-ed / (16. * k));      // Schatten der höheren Nachbarebene
  F.kante = clamp(1.1 * k + .5 - ed, 0., 1.) * smoothstep(.08, .35, K);
  return F;
}`;

export const EFFEKTE = {
  bild: {
    name: "Bild", herkunft: "das Bild selbst, atmend",
    regler: [r("Atmen", .4), r("Schwanken", .3), r("Grau", 0), r("Kontrast", 0)],
    glsl: `vec4 effekt(vec2 uv){
  vec2 p = P(uv) * (1. - P0 * .08 * HZ(.5 - .5 * cos(uPhi)));
  p = rot(PD(P1 * .06 * sin(uPhi))) * p;
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
    // randlos (Wunsch vom 4. November 2026: «gar keine schwarzen Ränder, das Bild soll immer vollständig gefüllt sein»): die Teilchen
    // liegen auch in einem Saum rund um das Bild (RAND je Seite), der beim Treiben die Ränder nachfüllt; Dichte im Bild wie bisher
    punkte: (w, a, h, d = 1) => { const n = 400 * Math.sqrt(d); return { cols: Math.round(n * 1.7), rows: Math.round(n / a * 1.7) }; },
    glsl: `void punkt(int id, out vec2 pos, out vec4 col, out float size){
  float i = float(id); vec2 g = vec2(mod(i, uCols), floor(i / uCols));
  vec2 j = h22(g + uSeed * 13.1), uv0 = (g + j) / vec2(uCols, uRows) * 1.7 - .35;   // RAND = .35
  vec4 c = Ql(uv0, .5); float Lk = lum(Kl(uv0, .5).rgb);
  if (uZeigen < .5) c = vec4(vec3(.95, .925, .9), 1.);   // ohne Bild: helle Teilchen, die Grösse kommt aus dem Bild
  float s = h12(g * 1.37 + 4.1 + uSeed);
  // läuft durch: die Teilchen kehren um, sobald das Bild steht (Exponent unter 1, Geschwindigkeit an der Naht über null)
  // seit 5. November 2026 (Runde 2, «auf höheres Niveau»): das Bild löst sich von der Mitte her nach aussen und setzt sich in derselben
  // Folge wieder zusammen (Nachlauf statt Gleichschritt), hält kurz als Bild und als Wolke (halt)
  vec2 p0 = P(uv0);
  float stag = .9 * length(p0 * vec2(.8, 1.)) + .35 * s;
  float k = pow(HZ(.5 - .5 * cos(halt(uPhi - stag, .55))), .5 + s * .5) * P0;
  vec2 drift = vec2(ln(p0 * 2.2 + s * .3, .8), ln(p0 * 2.2 + 7. + s * .3, .8)) * (.06 + .2 * P3);
  vec2 wirbel = lcurl(p0 * 1.5 + 3., .7) * .025 * P3;
  float z = (s - .5) * 2.;
  vec2 wolke = (p0 + drift + wirbel) * (1. + .1 * z * P3);    // Tiefe: leichte Perspektive, die Grösse bleibt
  pos = mix(p0 + .006 * vec2(ln(g * .02, .9), ln(g * .02 + 3., .9)), wolke, k);
  float tw = pow(.5 + .5 * sin(uPhi * float(2 + int(s * 5.)) + s * 60.), 6.) * P2 * (.15 + .85 * k);   // das stehende Bild funkelt kaum, die Wolke schon
  // Tiefe in der Wolke: nahe Teilchen werden gross und weich (Bokeh, durchscheinend), ferne klein und blass, der Farbton dreht mit der Tiefe
  float nah = max(z, 0.) * k, fern = max(-z, 0.) * k;
  vec3 cc = tonDreh(c.rgb, z * .45 * k * P3, 1. + .25 * k);
  float alpha = 1. - .55 * nah * smoothstep(.3, 1., s);
  col = vec4(cc * (1. - .15 * k + tw * 1.6 + k * .3) * (1. - .35 * fern) * alpha, alpha);
  // Runde 2: im stehenden Bild decken sich die Teilchen lückenlos (vorher schimmerte der schwarze Grund als Rauschen durch)
  float abstand = uRes.x * 1.7 / uCols;
  size = max(mix(1.5, 6., P1) * uRes.y / 1350., abstand * mix(3., .9, k)) * (1. + tw * .8) * (1. + 1.6 * nah * nah - .35 * fern) * (uZeigen > .5 ? 1. : .15 + 1.6 * Lk * Lk);
}`,
  },


  wasserglas: {
    name: "Wasserglas", herkunft: "Paper Shaders: Wasser, dann geriffeltes Glas, Stärke 0 → max → 0",
    regler: [r("Wasser", .6), r("Rillen", .4), r("Stärke", .8), r("Licht", .5)],
    glsl: `vec4 effekt(vec2 uv){
  float s = P2 * (.55 + .45 * HZ(.5 - .5 * cos(uPhi)));
  vec2 p = P(uv);
  vec2 u = uv + vec2(lfbm(p * 2.5, .7), lfbm(p * 2.5 + 7.3, .7)) * .06 * s * P0;
  // die Rillen gleiten um eine Rille pro Schlaufe und biegen sich über dem Relief des Bildes (5. November 2026: das Bild soll mitgenommen werden)
  float N = mix(5., 34., P1), fx = fract(u.x * N + uT + lum(Kl(u, 4.).rgb) * 2.2 * s);
  vec2 b = vec2(u.x - (fx - .5) / N * 1.4 * s, u.y + .01 * s * sin(fx * PI));
  float ca = .004 * s + .008 * s * abs(fx - .5);
  vec3 c = vec3(Q(b + vec2(ca, 0)).r, Q(b).g, Q(b - vec2(ca, 0)).b);
  // Licht der Rillen nur als Faktor auf das Bild: Dunkles bleibt dunkel, keine weissen Streifen und Schlieren
  // (Rückmeldung vom 3. November 2026: «die weissen streifen und schlieren im hintergrund stören»)
  c *= 1. + P3 * s * (.3 * pow(1. - abs(fx - .5) * 2., 6.) - .2 * smoothstep(.3, .5, abs(fx - .5)));
  return vec4(clamp(c, 0., 1.), 1.);
}`,
  },


  fluid: {
    name: "Tusche-Fluid", herkunft: "Fluid Distortion: das Bild treibt im Strömungsfeld, Regenbogensäume an den Schlieren",
    regler: [r("Stärke", .8), r("Massstab", .4), r("Dispersion", .5)],
    glsl: `vec4 effekt(vec2 uv){
  float sc = mix(1.2, 5., P1);
  vec2 q = P(uv);
  float st = .054 * P0 * (.8 + .2 * HZ(.5 - .5 * cos(uPhi))) / sc;   // die Strömung hört nie ganz auf, sie atmet nur
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
  float n = max(floor(P5 * 2.999), uLauf);   // Durchlauf: ganze Drehungen statt Schwenk
  float ang = .5 + (n < .5 ? P2 * 1.3 * sin(uPhi) : n * uPhi);
  float per = mix(80., 12., P0), k = P1 * (.6 + .4 * HZ(.5 - .5 * cos(2. * uPhi))) * 6.;
  float ph = dot(P(uv), vec2(cos(ang), sin(ang))) * per + k * h * 3.;
  float t = abs(fract(ph) - .5) * 2., aa = fwidth(ph) * 2.4;
  float duty = mix(.5, clamp(1. - L, .08, .92), P3 * uZeigen);   // ohne Bild: gleich breite Streifen, das Motiv nur im Relief
  vec3 col = vec3(smoothstep(duty - aa, duty + aa, t));
  col = mix(col, c, smoothstep(.22, .45, sat(c)) * P4 * uZeigen);
  return vec4(col, 1.);
}`,
  },




  glitzer: {
    name: "Glitzer-Morph", herkunft: "Rosen: Wirbel drehen und atmen, das Bild bricht in Pailletten aus seinen eigenen Farben, die im Licht kippen und funkeln, ein Glanzband zieht darüber",
    // seit 5. November 2026 kein Goldstaub mehr über dem Bild (Wunsch: «dass die effekte das bild stärker mitnehmen und nicht bloss darüber
    // gelegt werden»): jedes Korn ist ein Plättchen aus dem Bild an seiner Stelle, dicht auf hellen, farbigen und kantigen Formen
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
  vec3 kc = Kl(UV(q), 0.).rgb, col = uZeigen > .5 ? kc : vec3(.043, .035, .039);   // ohne Bild: Pailletten auf dunklem Grund
  // seit 5. November 2026 (Runde 2): Pailletten in zwei Grössen, fein, wo das Bild Detail hat, grob auf ruhigen Formen; jede trägt die
  // mittlere Farbe ihrer Stelle (ein Mosaik aus dem Bild) und ist ein gekipptes Plättchen mit eigener Normalen: ein Licht kreist und
  // hält an den Seiten (halt), die Plättchen werden hell, dunkel oder blitzen, je nachdem, wie sie zu ihm stehen
  float M = lum(Kl(vec2(.5), 14.).rgb), pl = 0., fac = 0., an = 0., h = 0.; vec3 fk = vec3(0.); vec2 f = vec2(0.);
  float hl = halt(uPhi, .5); vec3 Ld = normalize(vec3(.6 * cos(hl), .5 * sin(hl) + .2, .8));
  for (int sk = 0; sk < 2; sk++){
    float cs = (sk == 0 ? 30. : 14.) * uRes.y / 1350.;
    vec2 g = uv * uRes / cs + float(sk) * 17.3, ci = floor(g), jit = (h22(ci + float(sk) * 9.) - .5) * .45, ff = fract(g) - .5 - jit;
    vec2 qc = q + (ci + .5 + jit - g) * cs / uRes.y;                  // die Mitte des Korns, im Bild mitgedreht
    vec3 kk = Kl(UV(qc), sk == 0 ? 2.2 : 1.2).rgb; float Lk = lum(kk), kante = abs(Lk - lum(Kl(UV(qc), 3.5).rgb)) * 5.;
    float fein = smoothstep(.15, .45, kante);
    if (sk == 0 && fein > .5) continue;                               // grob nur auf ruhigen Formen
    if (sk == 1 && fein <= .5) continue;                              // fein nur im Detail
    float hh = h12(ci + uSeed * 5. + float(sk) * 3.);
    // Pailletten nur, wo das Bild sich abhebt: Kanten, Farbe, Licht über dem Mittel; leere Flächen bleiben ruhig
    float aa = step(h12(ci * 1.7 + 2.), P2 * smoothstep(.04, .4, kante + 1.1 * sat(kk) + abs(Lk - M) * 1.5) * 1.5);
    vec2 nk = (h22(ci + 7. + float(sk)) - .5) * 1.4 + .35 * vec2(sin(uPhi * float(1 + int(hh * 2.)) + hh * 40.), cos(uPhi + hh * 23.));
    vec3 nrm = normalize(vec3(nk, 1.));
    float dif = .55 + .75 * max(dot(nrm, Ld), 0.), spec = pow(max(dot(reflect(-Ld, nrm), vec3(0., 0., 1.)), 0.), 18.);
    pl = smoothstep(.5, .42, abs(ff.x) + abs(ff.y)) * aa; fac = spec; an = aa; h = hh; f = ff;
    fk = (uZeigen > .5 ? kk : mix(vec3(1., .86, .55), vec3(1., .72, .84), hh) * (.2 + .9 * Lk)) * dif;
  }
  col = mix(col, fk + fk * fac * 1.2, pl * mix(.6, .95, P2));
  float rand = smoothstep(.5, .42, abs(f.x) + abs(f.y)) - smoothstep(.42, .34, abs(f.x) + abs(f.y));
  col *= 1. - .35 * rand * an;                                         // feine dunkle Fuge zwischen den Plättchen
  float tw = pow(max(0., sin(uPhi * float(1 + int(h * 4.)) + h * 50.)), 24.) * (.3 + fac * 2.);
  float stern = exp(-length(f) * 14.) + .6 * (exp(-abs(f.x) * 40.) * exp(-abs(f.y) * 6.) + exp(-abs(f.y) * 40.) * exp(-abs(f.x) * 6.));
  col += mix(fk, vec3(1.), .55) * stern * tw * an * 1.2;               // der Funke hat die Farbe des Bildes
  float dd = dot(uv, vec2(.7071)) - (uT * 2.4 - .7), band = exp(-dd * dd * 60.);
  col *= 1. + P3 * band * (.3 + 1.2 * pl * (.3 + fac));               // Glanzband: hellt das Bild auf, die Pailletten darin blitzen
  return vec4(clamp(schulter(col), 0., 1.), 1.);
}`,
  },

  horizont: {
    name: "Horizont", herkunft: "incrprl.dsgn: über einer Lichtlinie steigt das Bild selbst als Rauch auf, darunter spiegelt es sich dunkel, Körnung und Strahlen",
    // seit 5. November 2026 bleibt das ganze Bild da (vorher nur ein Rauchfleck auf Schwarz; Wunsch: «dass die effekte das bild stärker
    // mitnehmen»): über der Linie wird es nach oben gezogen, verwirbelt und weich, darunter liegt es als dunkle, wellige Spiegelung
    regler: [r("Höhe", .6), r("Breite", .5), r("Körnung", .5), r("Strahlen", .5)],
    glsl: `vec4 effekt(vec2 uv){
  // seit 5. November 2026 (Runde 2): der Rauch steigt, hält oben und sinkt (halt), das Bild über der Linie bleibt kräftiger als seine
  // Spiegelung, der Rauch bleibt näher am Motiv (weniger Unschärfe) und trägt einen hellen Saum
  vec2 p = P(uv); float k = uRes.y / 1350., env = HZ(.5 - .5 * cos(halt(uPhi, .5)));
  float cx = PD(.25 * A() * sin(halt(uPhi, .4)));
  float wx = exp(-pow((p.x - cx) / (mix(.12, .65, P1) * A()), 2.)), Hh = mix(.12, .55, P0) * (.35 + .65 * env);
  float y = max(p.y, 0.);
  // über der Linie: das Bild wird aus der Nähe der Linie hochgezogen (hub), verwirbelt (dr) und zur Höhe hin weich
  float hub = wx * min(y, Hh) * .85, wy = y / (y + .12);
  vec2 dr = lcurl(p * vec2(2.4, 1.6) + 3., .8) * .045 * wx * wy * (.5 + P0);
  vec2 src = p - vec2(0., hub) + dr, us = UV(src);
  float lod = min(wx * wy * 2.4, 2.4);
  vec3 auf = Ql(us, lod).rgb; float La = lum(Kl(us, lod).rgb);
  float rand = lfbm(src * 3.2 + vec2(0., -y), .8) * .5;
  float m = wx * smoothstep(Hh * 1.25 + .05, Hh * .2, y - rand * Hh) * smoothstep(.3, .75, La + .45 + rand);   // hell steigt leichter auf
  vec3 oben = uZeigen > .5 ? mix(Ql(uv, 0.).rgb * .55, auf * 1.15 + .03, m) + auf * m * (1. - m) * .5 : vec3(.035) + vec3(.2 + .8 * La) * m;
  // unter der Linie: dunkle Spiegelung des Bildes, die Wellen werden zur Linie hin feiner
  float t = -min(p.y, 0.);
  vec2 sp = vec2(p.x + ln(vec2(p.x * 6., t * 40.), .9) * .012 * t * 3., t * 1.15);
  vec3 spieg = uZeigen > .5 ? Ql(UV(sp), 1. + t * 4.).rgb * (.3 - .18 * smoothstep(0., .5, t)) : vec3(.035) + vec3(lum(Kl(UV(sp), 2.).rgb) * .12);
  vec3 col = p.y > 0. ? oben : spieg;
  // die Linie trägt die Farben des Bildes an ihrer Stelle
  vec3 lf = uZeigen > .5 ? mix(vec3(1.), min(Kl(UV(vec2(p.x, 0.)), 2.).rgb * 1.5 + .25, 1.), .6) : vec3(1.);
  float px = abs(p.y) * uRes.y;
  float linie = (exp(-px * px / (1.2 * k * k)) * .9 + exp(-px / (6. * k)) * .12) * (.55 + .45 * smoothstep(1., 0., abs(p.x - cx) / (.6 * A())));
  float ang = 1. + .4 * sin(uPhi * 2.);
  float dist = abs(dot(p - vec2(cx, 0.), vec2(-sin(ang), cos(ang)))) * uRes.y / (1.5 * k);
  float strahl = exp(-dist * dist) * pow(.5 + .5 * sin(uPhi * 3.), 8.) * P3 * smoothstep(.6, 0., length(p - vec2(cx, 0.)));
  float korn = (h12(floor(uv * uRes) + floor(uT * 360.)) - .5) * .12 * P2;
  return vec4(clamp(schulter(col + korn + lf * (linie + strahl * .8)), 0., 1.), 1.);
}`,
  },

  // ——— fünf Effekte aus der Bildinformation (Wunsch vom 4. November 2026: Seifenblase und Holo-Kugel weg, dafür Effekte, die stark
  // mit dem Bild arbeiten und es auch bei «Bild zeigen: aus» klar lesbar machen). Sie lesen Helligkeit als Höhe, ihren Gradienten als
  // Kanten und Strömung (die Senkrechte zum Gradienten folgt den Konturen und ist quellenfrei) und die Farben als Druckauszüge.

  // Pinselstrom und Aquarell entfernt am 5. November 2026 (Wunsch: «Der pinseleffekt kann weg», «Ebenso: aquarell»)
  // Metaballs, Wirbel, Linien, Tuscheblasen, Glaslinsen, Röntgen-Scan und Papierriss entfernt am 5. November 2026
  // (Wunsch: «also wir nehme jetzt wieder raus: metaballs, wirbel, linien, tuscheblasen, glaslinsen, röntgenstrahl, papierriss»)
  // Alkoholtinte entfernt am 5. November 2026 (Wunsch: «alkoholtine kann raus»)
  // Traube, Physarum und Strömung entfernt am 5. November 2026 (Wunsch: «weg können traube, physarum (nicht: physarum-struktur), strömung»)

  raster: {
    name: "Druckraster", herkunft: "Halbton: vier gedrehte Raster wie im Offsetdruck, Punkte verschmelzen als Distanzfelder im Dunkeln und atmen in Wellen",
    // Kubismus (5. November 2026): 0 ist das bisherige Druckraster, darüber zerfällt es in gekippte, verschobene Ebenen, jede mit
    // eigenem Rasterwinkel und eigener Perspektive auf das Bild
    regler: [r("Raster", .45), r("Drehung", .5), r("Welle", .5), r("Verschmelzen", .5), r("Negativ", 0), r("Kubismus", .5, 0)],
    glsl: `${KUBUS}
float smin(float a, float b, float k){ float h = max(k - abs(a - b), 0.) / k; return min(a, b) - h * h * k * .25; }
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
  Kub F = kubus(P(uv), P5);
  vec2 p = F.q; float N = mix(150., 40., P0);
  // Drehung: unter einem Drittel pendelt das Raster, sonst dreht es eine Viertel- oder halbe Drehung pro Schlaufe (das Raster ist
  // vierfach symmetrisch, darum schliesst die Schlaufe)
  float n = max(floor(P1 * 2.999), uLauf), a0 = (n < .5 ? .25 * sin(uPhi) : n * uPhi / 4.) + F.dreh * .6;   // jede Ebene mit eigenem Rasterwinkel
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
  // Kubismus: die Ebenen als Flächen im Licht, ihre Kanten als feine Linien (auf Papier dunkel, im Negativ hell)
  col = P4 < .5 ? mix(col * F.licht, vec3(.06, .05, .06), F.kante * .75) : mix(col * F.licht, papier, F.kante * .6);
  return vec4(clamp(col, 0., 1.), 1.);
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
    // Kubismus (5. November 2026): 0 ist die bisherige Karte, darüber zerfällt das Gelände in gekippte Ebenen, jede aus eigener
    // Perspektive; die Neigung einer Ebene legt sich als Gefälle auf ihr Gelände, so laufen die Linien darin wie Schraffuren
    regler: [r("Linien", .45), r("Steigen", .3), r("Strich", .4), r("Wellen", .3), r("Flächen", .35), r("Kubismus", .5, 0)],
    glsl: `${FELD}
${KUBUS}
vec4 effekt(vec2 uv){
  Kub F = kubus(P(uv), P5);
  vec2 p = F.q, u = UV(p);
  float h = .6 * hoehe(u, 1.5) + .4 * hoehe(u, 3.5) + lfbm(p * 2.5, .7) * .05 * P3 + dot(F.kipp, p - F.mitte) * 1.2;
  float N = mix(8., 46., P0), sp = 4. * floor(1. + P1 * 1.999);   // vier oder acht Linien pro Schlaufe: die kräftigen schliessen an
  float f = h * N - uT * sp, fr = fract(f), aa = clamp(fwidth(f), 1e-4, .5);   // gedeckelt: an den Kanten der Ebenen springt f
  float d = min(fr, 1. - fr) / aa, k = uRes.y / 1350.;
  float idx = mod(floor(f + .5), 4.), w = mix(.5, 1.8, P2) * k * (idx < .5 ? 2.4 : 1.);
  float linie = clamp(w - d + .5, 0., 1.);
  float band = mod(floor(f), 2.) * .5 + .5 * h;                         // Höhenstufen als leise Flächen
  vec3 nacht = vec3(.043, .035, .039), papier = vec3(.95, .925, .9);
  vec3 aus = mix(nacht + papier * band * .16 * P4, papier, linie * (.65 + .35 * step(idx, .5)));
  vec3 im = Ql(u, 0.).rgb;
  vec3 an = mix(im * (.22 + .3 * P4 * band), mix(im, vec3(1.), .35), linie);
  vec3 col = mix(aus, an, uZeigen) * F.licht;
  return vec4(clamp(mix(col, papier, F.kante * .55), 0., 1.), 1.);
}`,
  },

  // ——— drei weitere nach Christians Stichworten vom 4. November 2026: «röntgen/laserscan, krasse montagen, absolut aktuelle prozess-visualisierung»


  montage: {
    name: "Montage", herkunft: "Quadtree-Collage: das Bild zerfällt dort in kleine Kacheln, wo es viel Detail hat; Kacheln verrutschen, drehen, spiegeln und glitchen, als Vierecke, Dreiecke, Vielecke oder Kreise",
    // Form seit 5. November 2026 (Wunsch: «nicht nur vierecke, sondern auch dreiecke, viel-ecke, kreise»): eine Wahl mit vier Stufen in P5,
    // Vierecke ist 0, so bleiben ältere Werke (fünf Werte) unverändert
    regler: [r("Teilung", .5), r("Verrutschen", .5), r("Drehen", .4), r("Glitch", .4), r("Fugen", .5), w("Form", ["Vierecke", "Dreiecke", "Vielecke", "Kreise"])],
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
  // Form der Kachel: kk ist ihre Kennung (für Zufall und Glitch), m ihre Mitte, rd der Abstand zur Fuge in Pixeln, innen 0 im Zwickel um einen Kreis
  int form = int(P5 * 3. + .5);
  vec2 kk = c, m = c + sz * .5, g = (p - c) / sz;
  vec2 fr = min(g, 1. - g) * sz * uRes.y; float rd = min(fr.x, fr.y), innen = 1.;
  if (form == 1){                                                      // Dreiecke: jede Kachel an einer Diagonale geteilt, Richtung je Kachel
    float sp = step(.5, h12(c * 19.7 + lv * 5.1 + uSeed)); vec2 gs = vec2(mix(g.x, 1. - g.x, sp), g.y);
    float ob = step(gs.x, gs.y); vec2 sw = mix(vec2(2. / 3., 1. / 3.), vec2(1. / 3., 2. / 3.), ob);
    m = c + vec2(mix(sw.x, 1. - sw.x, sp), sw.y) * sz; kk = c + ob * sz * .37;
    rd = min(rd, abs(gs.y - gs.x) * .7071 * sz * uRes.y);
  } else if (form == 2){                                               // Vielecke: Voronoi in der Grösse der Kachel, also fein, wo das Bild Detail hat
    vec2 qi = floor(p / sz), qf = fract(p / sz), mo = vec2(0.), mr = vec2(0.); float md = 9.;
    for (int y = -1; y <= 1; y++) for (int x = -1; x <= 1; x++){
      vec2 o = vec2(x, y), r0 = o + .12 + .76 * h22(qi + o + lv * 17.3 + uSeed) - qf; float d = dot(r0, r0);
      if (d < md){ md = d; mr = r0; mo = o; }
    }
    float ed = 9.;
    for (int y = -2; y <= 2; y++) for (int x = -2; x <= 2; x++){
      vec2 o = mo + vec2(x, y), r0 = o + .12 + .76 * h22(qi + o + lv * 17.3 + uSeed) - qf;
      if (dot(mr - r0, mr - r0) > 1e-5) ed = min(ed, dot(.5 * (mr + r0), normalize(r0 - mr)));
    }
    kk = (qi + mo) * sz + .123; m = p + mr * sz; rd = ed * sz * uRes.y;
  } else if (form == 3){                                               // Kreise: eine Scheibe je Kachel, in den Zwickeln liegt das Bild ruhig darunter
    float rk = mix(.5, .42, h12(c * 23.3 + lv + uSeed)), d = (rk - length(g - .5)) * sz * uRes.y;
    innen = clamp(d + .5, 0., 1.); rd = abs(d);
  }
  vec2 h = h22(kk * 37.1 + lv * 3.3 + uSeed), f = (p - m) / sz;
  float an = step(1. - P2 * .6, h.y) * floor(fract(uT * 2. + h.x) * 4.) * PI * .5;   // Vierteldrehungen, hart geschnitten
  f = rot(an) * f; if (h.x > .8) f.x = -f.x;
  float sl = pow(.5 + .5 * sin(uPhi + h.x * TAU), 3.);
  vec2 src = m + f * sz * mix(1., .6, step(.7, h.x)) + (h - .5) * sz * 3. * P1 * sl;
  vec3 col, grund;
  if (uZeigen > .5){
    float gl = step(1. - P3 * .5, h22(kk * 5.7 + floor(uT * 6.)).x), ca = .01 * gl;
    col = vec3(Ql(UV(src + vec2(ca, 0)), 0.).r, Ql(UV(src), 0.).g, Ql(UV(src - vec2(ca, 0)), 0.).b);
    if (h.y < P3 * .25) col = vec3(lum(col));                        // manche Kacheln grau, manche negativ
    else if (h.y < P3 * .4) col = 1. - col;
    grund = Ql(uv, 0.).rgb * .45;
  } else {
    // ohne Bild: jede Kachel schraffiert, Dichte aus dem Ton des Bildes an ihrer Quelle, Winkel je Kachel
    float t = hoehe(UV(src), max(0., log2(sz * uRes.y) - 2.)), per = max(7. * uRes.y / 1350., 3.);
    vec2 dir = vec2(cos(h.x * PI), sin(h.x * PI));
    float s = abs(fract(dot(p * uRes.y, dir) / per) - .5) * 2.;
    col = mix(vec3(.043, .035, .039), vec3(.95, .925, .9), smoothstep(.12, 0., s - floor(t * 4. + .5) / 4. * .95));
    grund = vec3(.043, .035, .039);
  }
  // seit 5. November 2026 (Runde 2): Kacheln mit Tiefe: zur Fuge hin leicht dunkler, verrutschte Kacheln heben sich etwas ab
  col *= (.8 + .2 * smoothstep(0., 9. * uRes.y / 1350., rd)) * (1. + .1 * sl * P1);
  col = mix(grund, col, innen);
  float fuge = clamp(mix(0., 2.5, P4) * uRes.y / 1350. - rd + .5, 0., 1.);
  col = mix(col, vec3(.043, .035, .039), fuge);
  return vec4(col, 1.);
}`,
  },

  entrauschen: {
    name: "Entrauschen", herkunft: "Diffusionsmodell: aus reinem Rauschen entsteht das Bild Schritt für Schritt, grob zuerst (latente Blöcke), dann fein, und zerfällt wieder",
    regler: [r("Rauschen", .9), r("Blöcke", .6), r("Haltezeit", .5), r("Körnung", .3), r("Fortschritt", 1)],
    glsl: `vec4 effekt(vec2 uv){
  // Durchlauf: jede Runde entsteht das Bild langsam neu und versinkt am Ende rasch im Rauschen, statt langsam zurückzulaufen
  float env = uLauf > .5 ? smoothstep(0., .85, fract(uT)) * (1. - smoothstep(.9, 1., fract(uT))) : .5 - .5 * cos(uPhi), pr = smoothstep(0., mix(1., .5, P2), env), N = 40.;
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
    name: "Echo", herkunft: "Feedback-Schleife: hinter dem Bild ziehen seine eigenen Formen als vergrösserte, gedrehte Echos einer kreisenden Mitte nach, jedes später, weicher und im Farbton verschoben, dazu Bloom",
    // seit 5. November 2026 (Christian: «vieles wirkt noch ein bisschen bescheiden»): die Echos sind die Formen des Bildes selbst (wo es sich
    // vom Grund abhebt), hinten grösser und unschärfer wie in einem Tunnel; jedes folgt der Mitte etwas später (Nachlauf statt Gleichschritt),
    // die Bahn hält an den Umkehrpunkten (halt), die Farbe dreht in OKLab, das Licht läuft weich aus (schulter)
    regler: [r("Echos", .6), r("Kreisen", .5), r("Zoom", .5), r("Drall", .6), r("Bloom", .5)],
    // ohne Rückkopplungspuffer gerechnet: Echo k ist das Bild zur Zeit t − k·Δ, k-mal transformiert, so bleibt die Schlaufe geschlossen
    glsl: `
float ecForm(vec3 a, float M){ return clamp((abs(lum(a) - M) * 2.4 + sat(a) * 1.3 - .1) * 3., 0., 1.); }
vec4 effekt(vec2 uv){
  vec2 p = P(uv); int n = int(mix(3., 12., P0)); if (uSparsam > .5) n = min(n, 6);
  float M = lum(Kl(vec2(.5), 14.).rgb), fn = float(n);
  vec3 col = Ql(uv, 4.).rgb * .22, hell = vec3(0.), dunkel = vec3(1.);   // tief hinten: das Bild, weich und dunkel; hell/dunkel: die Echos als Licht und als Schatten
  for (int k = 11; k >= 1; k--){                                     // von hinten nach vorn
    if (k >= n) continue;
    float fk = float(k), ph = uPhi - fk * mix(.12, .3, P1);           // jedes Echo folgt später: Nachlauf
    vec2 c = .16 * P1 * vec2(sin(halt(ph, .6)), .6 * sin(2. * ph + .4));
    float sk = pow(mix(1.02, 1.11, P2), fk), dr = fk * (P3 - .5) * .22 * (.6 + .4 * sin(halt(ph, .5)));
    vec2 q = c * (1. - 1. / sk) + rot(dr) * p / sk;                  // um die wandernde Mitte vergrössert und gedreht
    vec2 uq = UV(q);
    float m = ecForm(Kl(uq, 1.5 + fk * .2).rgb, M) * step(abs(q.x), A() * .5) * step(abs(q.y), .5);
    float tief = fk / fn;
    vec3 a = tonDreh(Ql(uq, .5 + fk * .3).rgb, tief * 1.6, 1. + .5 * tief);   // jedes Echo im Farbton gedreht, satter
    a *= mix(1., .5, tief);                                          // Luftperspektive: weiter hinten dunkler
    col = mix(col, a, m * mix(.95, .55, tief));
    hell = max(hell, a * m * pow(.8, fk)); dunkel = min(dunkel, mix(vec3(1.), a / mix(1., .5, tief), m * pow(.8, fk)));
  }
  vec3 vorn = Ql(uv, 0.).rgb; float m0 = ecForm(Kl(uv, 1.).rgb, M);
  col = mix(col, vorn, max(m0, .18));                                // vorn das Bild selbst
  // füllt das Motiv das ganze Bild, scheinen die Echos durch: auf dunklen Bildern aufhellend, auf hellen abdunkelnd
  float voll = smoothstep(.3, .9, m0);
  col = mix(max(col, hell * .8 * voll), min(col, mix(vec3(1.), dunkel, .85 * voll)), smoothstep(.42, .62, M));
  vec3 b = max(Kl(uv, 4.5).rgb - .5, 0.) * 1.2 + max(Kl(uv, 3.).rgb - .62, 0.) + max(col - .7, 0.) * .5;
  col += b * P4 * 1.4 * (.85 + .15 * sin(uPhi));
  return vec4(clamp(schulter(col), 0., 1.), 1.);
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
  float el = mix(1.3, .62, P1), az = -PI * .5 + P2 * .45 * (uLauf > .5 ? ln(vec2(.7, 1.9), .35) : sin(halt(uPhi, .6)));   // Durchlauf: die Kamera treibt ruhig im Rauschen (Rückmeldung vom 4. November 2026: «das voxel dreht sich jetzt unstoppbar»), Schwenk 0 steht still
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
  // seit 5. November 2026 (Runde 2): das Licht wandert langsam und hält an den Seiten, die höheren Nachbarn werfen Schatten auf die Deckel,
  // die Kanten der Deckel glänzen, die Seiten tragen die Farbe des Quaders gedunkelt, Fernes sinkt leicht ins Dunkel
  float hl = halt(uPhi, .6);
  vec3 Ld = normalize(vec3(.55 * cos(.8 + .9 * sin(hl)), .45 + .2 * cos(hl), .75));
  float dif = max(dot(nrm, Ld), 0.), ao = .5 + .5 * clamp(hp.z / max(hh, 1e-4), 0., 1.);
  float rk = min(min(lc.x, 1. - lc.x), min(lc.y, 1. - lc.y));
  float fuge = nrm.z > .5 ? smoothstep(.0, .08, rk) : 1.;
  float schatten = 0., glanz = 0.;
  if (nrm.z > .5){
    vec3 al2; vec2 dl = normalize(Ld.xy);
    float hn = vH(floor(hp.xy * N + dl * .9), N, Hm, al2), hn2 = uSparsam > .5 ? 0. : vH(floor(hp.xy * N + dl * 1.9), N, Hm, al2);
    schatten = max(smoothstep(0., Hm * .12, hn - hh), .6 * smoothstep(0., Hm * .2, hn2 - hh));
    glanz = (1. - smoothstep(.04, .14, rk)) * pow(max(dot(reflect(-Ld, nrm), v), 0.), 4.) * .35;
  }
  vec3 a = uZeigen > .5 ? Ql(UV((cell + .5) / N), 0.).rgb : vec3(.95, .925, .9) * (.5 + .5 * hh / Hm);   // ohne Bild: weisse Quader, die Höhe erzählt das Bild
  vec3 col = a * (.2 + .9 * dif * (1. - .55 * schatten)) * ao * (.75 + .25 * fuge) + glanz * mix(vec3(1.), a, .4);
  col = mix(col, nacht, .25 * smoothstep(.0, 1.2, th - 1.6));
  return vec4(clamp(schulter(col), 0., 1.), 1.);
}`,
  },
  // ——— Nachtrag vom 4. November 2026 (Christians Liste «KI & Algorithmische Transformationen»): Pixel Sorting, Dolly-Zoom, Lichtstrahlen

  sortieren: {
    name: "Pixel Sorting", herkunft: "Glitch: Pixelreihen in einem Helligkeitsfenster werden nach Helligkeit sortiert und ziehen sich wie schmelzende Daten in die Länge",
    regler: [r("Fenster", .5), r("Länge", .6), r("Richtung", 0), r("Wandern", .5), r("Kontrast", .4)],
    glsl: `vec4 effekt(vec2 uv){
  float k = uRes.y / 1350., ang = P2 * PI * .5;            // 0 senkrecht, 1 waagrecht
  vec2 dir = vec2(sin(ang), cos(ang)) / uRes;              // ein Pixel in Sortierrichtung, in uv
  float mitte = .5 + .18 * (uLauf > .5 ? ln(vec2(1.3, 2.1), 1.2) : sin(halt(uPhi, .6))) * P3, br = mix(.12, .45, P0);
  float lo = mitte - br, hi = mitte + br;                  // das Fenster wandert durch die Helligkeiten
  // seit 5. November 2026: die Strähnen wachsen, halten und ziehen sich zurück (halt), jede Spalte etwas versetzt, so schmilzt das Bild in Wellen
  float spalte = dot(uv, vec2(cos(ang), -sin(ang))) * 3.;
  float Lmax = mix(60., 640., P1) * k * mix(.3 + .7 * (.5 + .5 * cos(halt(uPhi - spalte * .8, .65))), 1., uLauf), st = Lmax / 40.;
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
  c = tonDreh(c, (f - .5) * .5 * P4, 1. + .35 * P4);                  // entlang der Strähne dreht der Farbton leicht (OKLab)
  c += smoothstep(.9, 1., f) * smoothstep(4., 18., a + b) * .25 * (.5 + P4);   // heller Kopf am Ende der Strähne
  vec3 aus = mix(nacht, vec3(.95, .925, .9), clamp((v - lo) / (hi - lo) * (1. + P4) - P4 * .5, 0., 1.));   // ohne Bild: nur die sortierten Strähnen
  return vec4(clamp(uZeigen > .5 ? c : aus, 0., 1.), 1.);
}`,
  },

  vertigo: {
    name: "Dolly-Zoom", herkunft: "Vertigo-Effekt: was sich vom Grund abhebt, bleibt stehen; dahinter fährt das Bild in Tiefenschichten heran und weg, hält an den Umkehrpunkten, und je schneller es fährt, desto länger die Zoomschlieren",
    // seit 5. November 2026 (Christian: «vieles wirkt noch ein bisschen bescheiden»): stärkerer Zoom, der an den Umkehrpunkten hält (halt) statt
    // gleichförmig zu pendeln; die Tiefe ist stufenlos (Parallaxe: Nahes fährt weniger als Fernes), die Schlieren folgen der Geschwindigkeit
    // (Bewegungsunschärfe), der Rand dunkelt im Sog ein, ein feiner Farbsaum nur während der Fahrt
    regler: [r("Zoom", .6), r("Vordergrund", .5), r("Schlieren", .5), r("Kante", .4)],
    glsl: `float vgF(vec2 uv, float M, float l){ vec3 a = Kl(uv, l).rgb; return abs(lum(a) - M) * 2.2 + .8 * sat(a); }
float vgVorn(vec2 uv, float M){ float t = mix(.12, .62, P1); return smoothstep(t - .12, t + .12, .55 * vgF(uv, M, 3.5) + .45 * vgF(uv, M, 5.5)); }
vec4 effekt(vec2 uv){
  vec2 p = P(uv); float M = lum(Kl(vec2(.5), 14.).rgb);
  float hz = halt(uPhi, .75), z = P0 * .7 * sin(hz), vz = P0 * .7 * cos(hz) * (1. + .75 * cos(2. * uPhi));   // Zoom und seine Geschwindigkeit
  float fg = vgVorn(uv, M), zf = fract(uT);
  if (uLauf > .5){ z = 0.; vz = P0 * .6; }
  float tiefe = 1. - vgVorn(UV(p / (1. + max(z, 0.))), M) * .7;      // Ferne an der Stelle, die der Hintergrund hierhin schiebt
  vec3 hg = vec3(0.); float n = 0.;
  int S = uSparsam > .5 ? 5 : 9;
  for (int i = 0; i < 9; i++){                                       // Bewegungsunschärfe entlang des Zooms, so lang wie die Fahrt schnell ist
    if (i >= S) break;
    float fi = float(i) / float(S - 1) - .5, dz = fi * vz * P2 * .16;
    float s = 1. / (1. + (z + dz) * tiefe);
    if (uLauf > .5){                                                 // Durchlauf: endloser Zoom, zwei Ebenen eine Oktave auseinander überblenden
      float sa = exp2(-(zf + dz) * P0 * 1.5), sb = sa * exp2(P0 * 1.5);
      vec2 qa = p * sa, qb = p * sb; float ga = (1. - vgVorn(UV(qa), M) * .97) * (1. - zf), gb = (1. - vgVorn(UV(qb), M) * .97) * zf;
      hg += Ql(UV(qa), .5).rgb * ga + Ql(UV(qb), .5).rgb * gb; n += ga + gb;
      continue;
    }
    vec2 q = p * s; float g = 1. - vgVorn(UV(q), M) * .97;
    float ca = abs(vz) * P2 * .006;                                    // Farbsaum nur, solange gefahren wird
    vec3 c = vec3(Ql(UV(q * (1. + ca)), .5).r, Ql(UV(q), .5).g, Ql(UV(q * (1. - ca)), .5).b);
    hg += c * g; n += g;
  }
  hg /= max(n, 1e-3);
  float sog = 1. - .55 * smoothstep(.15, .85, length(p) * 1.3) * (.35 + .65 * abs(z) / max(P0 * .7, .01));   // Vignette im Sog
  hg *= sog * (1. - .2 * max(z, 0.));
  vec3 vor = uZeigen > .5 ? Ql(uv, 0.).rgb : vec3(.95, .925, .9) * (.75 + .25 * lum(Kl(uv, 1.).rgb));   // ohne Bild: helle Silhouette vor dem zoomenden Raster
  vec3 col = mix(hg, vor, fg);
  float kante = fg * (1. - fg) * 4.;
  col += kante * P3 * .6 * mix(vec3(.95, .925, .9), min(Kl(uv, 2.).rgb * 1.4 + .2, 1.), .5);
  return vec4(clamp(schulter(col), 0., 1.), 1.);
}`,
  },

  strahlen: {
    name: "Lichtstrahlen", herkunft: "God Rays: die hellen Bildteile werfen Strahlen in ihren eigenen Farben, das Bild zieht sich im Licht in die Länge, darin schwebt farbiger Staub in drei Tiefen",
    // seit 5. November 2026 tragen die Strahlen die Farben des Bildes und dehnen es zum Licht hin (vorher weisslicher Schein darüber;
    // Wunsch: «dass die effekte das bild stärker mitnehmen und nicht bloss darüber gelegt werden»)
    regler: [r("Strahlen", .65), r("Wabern", .5), r("Staub", .5), r("Schwelle", .5), r("Bild", .5)],
    glsl: `vec4 effekt(vec2 uv){
  float hl = halt(uPhi, .55);
  vec2 lp = vec2(.5 + .24 * cos(hl), .78 + .08 * sin(2. * uPhi));       // die Lichtquelle zieht einen Kreis und verweilt an den Seiten
  vec2 d = (uv - lp) / 40. * mix(.6, 1., P0); vec2 q = uv; float dec = 1., acc = 0.; vec3 acc3 = vec3(0.);
  // Schwelle über der mittleren Helligkeit des Bildes (5. November 2026: helle Bilder liefen sonst ganz in Weiss aus)
  float M = lum(Kl(vec2(.5), 14.).rgb), thr = mix(M, 1., mix(.1, .75, P3)) - .08;
  int S = uSparsam > .5 ? 24 : 40;                                        // Handy: 24 Schritte
  for (int i = 0; i < 40; i++){
    if (i >= S) break;
    q -= d * 40. / float(S);
    vec3 kq = Kl(q, 2.).rgb;
    float m = smoothstep(thr, thr + .25, max(lum(kq), .85 * max(kq.r, max(kq.g, kq.b))));
    m *= .75 + .5 * P1 * (ln(q * vec2(9., 2.) + 3., .8) * .5 + .5);    // wabern
    acc += m * dec; acc3 += kq * m * dec; dec *= 1. - .045 * 40. / float(S);
  }
  float sk = mix(.015, .05, P0) * 40. / float(S); acc *= sk; acc3 *= sk;
  vec3 licht = vec3(1., .9, .72);
  vec3 farbe = uZeigen > .5 ? mix(licht * acc, acc3 * 1.5, .75) : licht * acc;   // das Licht in den Farben des Bildes
  // das Bild zieht sich im Licht in die Länge: je mehr Strahl, desto weiter von der Quelle weg gelesen
  vec2 zieh = (uv - lp) * min(acc, 1.2) * .1 * P0;
  // das Licht formt das Bild: was im Strahl liegt, leuchtet auf, der Rest sinkt ins Dunkel (Regler Bild hebt den Grund)
  vec3 grund = uZeigen > .5 ? Ql(uv - zieh, 0.).rgb * mix(mix(.18, .75, P4), 1.2, smoothstep(.02, .6, acc))
                            : vec3(.043, .035, .039) + licht * smoothstep(thr, thr + .25, lum(Kl(uv - zieh, 1.5).rgb)) * .18;
  vec3 col = grund + farbe;
  float staub = 0.;                                                       // Staub in drei Tiefen, sichtbar im Licht
  for (int l = 0; l < 3; l++){
    float fl = float(l), cs = (14. + fl * 9.) * uRes.y / 1350.;
    vec2 off = vec2(cos(uPhi + fl * 2.), sin(uPhi * (1. + fl) + fl)) * (8. + fl * 5.) * uRes.y / 1350.;
    vec2 g = (uv * uRes + off) / cs, ci = floor(g), j = h22(ci + fl * 31. + uSeed);
    vec2 f = g - ci - .2 - .6 * j;
    float r = (.05 + .07 * j.x) * (1. - fl * .25);
    staub += smoothstep(r, r * .3, length(f)) * step(1. - P2 * .7, j.y) * (1. - fl * .3);
  }
  vec3 sf = uZeigen > .5 ? mix(licht, min(Kl(uv, 1.).rgb * 1.6 + .15, 1.), .7) : licht;   // der Staub glimmt in der Farbe des Bildes darunter
  col += sf * staub * (.15 + acc * 2.5) * P2;
  return vec4(clamp(schulter(col), 0., 1.), 1.);
}`,
  },
  // ——— Nachtrag vom 5. November 2026 (Christian: «ob auch phorma iii effekte möglich sind: gewebe, blitze/spuren aus dem Lichtwürfel, traube (aber von den
  // Formen des Bildes ausgehend)», dazu «Physarum aus Phorma ii»): die vier Ideen aus PHORMA II und III neu als zustandslose Shader für das Mischpult,
  // ohne Ton; jede liest ihre Formen aus dem Bild (Linien gleicher Helligkeit, Konturen, Kanten, helle Flächen)

  gewebe: {
    name: "Gewebe", herkunft: "PHORMA III: die Linien gleicher Helligkeit des Bildes klappen zu Flächen aus feinen Linien auf, zerknittert wie Seide, und legen sich wieder aufs Bild",
    // seit 5. November 2026 (Rückmeldung: «gewebe sieht man teilweise keinen effekt»: auf flachen Bildzonen, etwa weissem Grund, gab es keine
    // Tonstufen und darum keine Linien): das Höhenfeld bekommt leise Knitterfalten, sodass auch flache Zonen Linien tragen, und über die ganze
    // Fläche legt sich ein feines Fadengewebe (Kette und Schuss), wo keine Linien liegen; beides klappt mit den Lagen auf
    regler: [r("Linien", .45), r("Lagen", .6), r("Aufklappen", .7), r("Knittern", .5), r("Papier", 1), r("Bild", .25)],
    glsl: `vec4 effekt(vec2 uv){
  vec2 p = P(uv);
  float auf = P2 * HZ(.5 - .5 * cos(uPhi));                 // an der Naht liegen alle Lagen auf den Umrissen: das Bild steht
  float N = mix(5., 12., P0); int L = int(mix(6., uSparsam > .5 ? 16. : 36., P1));   // Handy: höchstens 16 Lagen
  vec2 dA = lcurl(p * mix(1.2, 3.5, P3) + 1.7, .6) * .045 * (.4 + P3);
  vec2 dB = vec2(ln(p * 1.4 + 4., .5), ln(p * 1.4 + 9., .5)) * .32;
  float tw = ln(p * .7 + 2., .4) * 4. * P3;                 // die Fläche verdreht sich beim Aufklappen: Knitterfalten
  float tinte = 1.; vec3 farbe = vec3(0.); float fs = 0.;
  for (int i = 0; i < 36; i++){
    if (i >= L) break;
    float f = (float(i) + .5) / float(L);
    vec2 d = rot(f * tw) * (dA * f + dB * f * f) * auf;
    vec2 q = UV(p - d);
    vec3 c = Kl(q, 2.).rgb; float lc = lum(c), lf = lum(Kl(q, 4.).rgb);
    float hoeh = mix(lf, lc, smoothstep(.02, .08, abs(lc - lf)));   // flache Zonen weich gelesen (sonst zeichnet das Korn des Fotos Kiesel), Kanten scharf
    float v = (hoeh + .06 * ln(q * 1.8 + f * .4, .5) * (.5 + P3)) * N;   // Knitterfalten: auch flache Zonen tragen Linien
    float e = abs(fract(v + .5) - .5) / max(fwidth(v), 1e-4);
    float a = (1. - smoothstep(.15, .95, e)) * mix(.9, 2.4 / float(L) + .02, smoothstep(0., .35, auf)) * (1. - .4 * f * auf);
    tinte *= 1. - a; farbe += c * a; fs += a;
  }
  float deck = 1. - tinte;
  // Fadengewebe über die ganze Fläche: Kette und Schuss in der mittleren Lage, sichtbar, wo keine Linien liegen
  vec2 qw = p - rot(.5 * tw) * (dA * .5 + dB * .25) * auf;
  float M = mix(70., 130., P0) * (uSparsam > .5 ? .7 : 1.);
  float kette = pow(.5 + .5 * cos(qw.x * M * TAU + 2. * ln(qw * 2., .4)), 5.), schuss = pow(.5 + .5 * cos(qw.y * M * TAU + 2. * ln(qw * 2. + 5., .4)), 5.);
  float faden = (kette + schuss) * .5 * (.5 + .5 * ln(qw * 1.5 + 9., .5) + .5);   // das Gewebe ist nicht überall gleich dicht
  deck += (1. - deck) * faden * .24 * smoothstep(0., .3, auf);
  vec3 papier = vec3(.95, .925, .9), nacht = vec3(.043, .035, .039);
  vec3 grund = mix(nacht, papier, P4), stift = mix(papier, vec3(.06, .055, .06), P4);
  vec3 bc = farbe / max(fs, 1e-4);
  if (uZeigen > .5){                                        // mit Bild: die Fäden nehmen seine Farbe an, das Bild liegt leise darunter
    grund = mix(grund, Ql(uv, 0.).rgb * mix(1., .9, P4) + mix(0., .08, P4), P5);
    stift = mix(stift, P4 > .5 ? bc * .55 : min(bc * 1.5 + .1, 1.), .6);
  }
  return vec4(mix(grund, stift, deck), 1.);
}`,
  },

  blitze: {
    name: "Lichtwürfel", herkunft: "PHORMA III: in der Mitte dreht sich ein feiner Würfel aus Licht, in ihm irrt ein Faden; aus seinen Ecken schlagen Blitze, und Lichtspuren zeichnen die Konturen des Bildes nach",
    // überarbeitet am 5. November 2026 (Rückmeldung zum Handy: «Das sieht gar nicht gut aus» – flacher dicker Drahtwürfel, das Bild nicht zu sehen):
    // der Schein jedes Punkts rechnet mit, wie viele Nachbarn ihn überdecken (sonst wird er zur weissen Fläche), der Würfel hat Tiefe,
    // und die meisten Stränge sind jetzt Lichtspuren, die auf den stärksten Kanten des Bildes beginnen und den Linien gleicher Helligkeit folgen
    // seit 5. November 2026 (Wunsch: «differenzierte lichtformen … auch im würfel») wählt «Innen» das Licht im Würfel: ein irrender Faden, Plasma aus der Mitte,
    // ein Prisma (ein weisser Strahl fächert sich in Farben) oder Schichten, die als Lichtscan durch den Würfel steigen; die Länge der Stränge ist fest
    regler: [r("Spuren", .6), w("Innen", ["Faden", "Plasma", "Prisma", "Schichten"]), r("Würfel", .3), r("Blitze", .2), r("Kanten", .65), r("Glühen", .5)],
    mischung: "add", weich: true,
    // je Zeile ein Strang aus 120 Punkten (Handy 80; doppelt: Kern und Schein): zwölf Kanten des Würfels, acht Zeilen Licht in ihm, dann Blitze und Spuren
    // sparsam (Handy): kürzere Stränge, dafür mehr davon, damit das Motiv lesbar bleibt (Rechenzeit wächst mit dem Quadrat der Stranglänge)
    punkte: (w, a, h, d = 1) => ({ cols: d < 1 ? 160 : 240, rows: 20 + Math.round((120 + 420 * w[0]) * Math.min(1, d * 2)) }),
    glsl: `${FELD}
vec3 wDreh(vec3 v){
  float a = uPhi + .4, b = .5 + .2 * sin(uPhi);             // gleichmässig um die Hochachse, leicht nickend
  v.xz = rot(a) * v.xz; v.yz = rot(b) * v.yz; return v;
}
// der Würfel sitzt auf der hellsten Form des Bildes (Rückmeldung vom 5. November 2026: «noch viel mehr am Bild orientiert»)
vec2 wZentrum(){
  vec3 acc = vec3(0.);
  for (int y = 0; y < 5; y++) for (int x = 0; x < 5; x++){ vec2 u = (vec2(x, y) + .5) / 5.; float L = lum(Kl(u, 4.).rgb), g = pow(L, 3.) + .02; acc += vec3(P(u) * g, g); }
  return acc.xy / acc.z * .85;
}
vec2 WZ;
vec3 wBild(vec3 v, float s){ v = wDreh(v) * s; return vec3(v.xy * (2.4 / (2.4 - v.z)) + WZ, v.z / s); }
void punkt(int id, out vec2 pos, out vec4 col, out float size){
  float i = float(id), x = mod(i, uCols), zeile = floor(i / uCols), schein = mod(x, 2.), j = floor(x / 2.), n = uCols / 2.;
  float k = uRes.y / 1350., s = mix(.05, .22, P2), px = 1. / uRes.y, wDa = smoothstep(0., .08, P2);   // Würfel 0: kein Würfel, nur die Spuren
  float nb = 20. + max(2., floor((uRows - 20.) * mix(.04, .2, P3)));   // Zeilen 20 bis nb: Blitze, danach Spuren
  vec3 licht = vec3(.8, .89, 1.);
  pos = vec2(9.); col = vec4(0.); size = 0.;
  WZ = zeile < nb ? wZentrum() : vec2(0.);
  float kern = 4. * k + 1.2, glanz = (12. + 26. * P5) * k;   // Durchmesser der Gaussflecken; sichtbar ist gut ein Drittel
  // Deckung je Punkt nach dem Abstand der Nachbarn: so bleibt der Schein weich, statt zur Fläche zu werden
  #define DECK(abstand, groesse, ziel) min(1., (ziel) * 2.5 * max(abstand, 1.) / max(groesse, 1.))
  if (zeile < 12.){                                         // der Würfel: zwölf Kanten, hinten matter und feiner, die Ecken funkeln
    float ax = floor(zeile / 4.), c = mod(zeile, 4.), t = j / (n - 1.) * 2. - 1.;
    vec2 sg = vec2(mod(c, 2.) * 2. - 1., floor(c / 2.) * 2. - 1.);
    vec3 v = ax < .5 ? vec3(t, sg) : ax < 1.5 ? vec3(sg.x, t, sg.y) : vec3(sg, t);
    vec3 w3 = wBild(v, s); pos = w3.xy;
    float tief = clamp(.5 + w3.z * .29, 0., 1.), ab = s * 2. / n * uRes.y;
    float ecke = smoothstep(.9, 1., abs(t)) * (.6 + .4 * sin(uPhi * 3. + zeile));
    float kz = max(kern * (.8 + .5 * tief), ab * 3.2);
    float a = (.35 + .65 * tief) * (schein > .5 ? DECK(ab, glanz, .35) : DECK(ab, kz, .8));
    a *= (1. + ecke * (schein > .5 ? 2.5 : .6)) * wDa;
    col = vec4(licht * a, a);
    size = schein > .5 ? glanz * (.7 + .5 * tief) * (1. + ecke) : kz;
    return;
  }
  if (zeile < 20.){                                         // Licht im Würfel, nach der Wahl «Innen»
    float r = zeile - 12., tt = j / (n - 1.); int art = int(floor(P1 * 3. + .5));
    vec3 q3 = vec3(0.), c3 = licht; float ab = 1., a0 = 1.;
    if (art == 0){                                          // Faden: irrt, an den Wänden gespiegelt
      if (r > 1.5) return;
      vec3 d3 = normalize(vec3(.3, .5, .2) + r * .4);
      for (int z = 0; z < 200; z++){
        if (float(z) >= j) break;
        vec3 r3 = vec3(ln(vec2(float(z) * .05, r * 3.), .5), ln(vec2(float(z) * .05 + 7., r * 3.), .5), ln(vec2(float(z) * .05 + 13., r * 3.), .5));
        d3 = normalize(d3 + r3 * .5); q3 += d3 * .028;
        if (abs(q3.x) > 1.){ q3.x = sign(q3.x) * 2. - q3.x; d3.x = -d3.x; }
        if (abs(q3.y) > 1.){ q3.y = sign(q3.y) * 2. - q3.y; d3.y = -d3.y; }
        if (abs(q3.z) > 1.){ q3.z = sign(q3.z) * 2. - q3.z; d3.z = -d3.z; }
      }
      q3 *= .92; ab = .028 * s * uRes.y; a0 = .45 * (.5 + .5 * sin(j * .08 - uPhi * 2. + r));
    } else if (art == 1){                                   // Plasma: Entladungen aus einem glühenden Kern zu den Wänden, sie tasten umher
      vec3 d3 = normalize(h33(vec3(r, 3.1, uSeed)) * 2. - 1. + .8 * vec3(ln(vec2(r * 2.1, 1.), .35), ln(vec2(r * 2.1, 4.), .35), ln(vec2(r * 2.1, 7.), .35)) + 1e-3);
      vec3 ende = d3 / max(abs(d3.x), max(abs(d3.y), abs(d3.z)));
      vec3 u3 = normalize(cross(d3, vec3(.3, 1., .2))), v3 = cross(d3, u3);
      float zit = sin(PI * tt) * .3;
      q3 = ende * tt + (u3 * ln(vec2(tt * 3., r * 3. + 1.), 1.4) + v3 * ln(vec2(tt * 3. + 9., r * 3.), 1.4)) * zit;
      ab = length(ende) * s / n * uRes.y * 1.3;
      a0 = .9 * (1.3 - .5 * tt) * (.7 + .3 * sin(uPhi * 4. + r * 2.));
      c3 = mix(vec3(.75, .6, 1.), vec3(1., .92, 1.), 1. - tt);
      if (j < 1.5){ q3 = vec3(0.); a0 = 1.; c3 = vec3(1.); ab = 1.; }   // der Kern
    } else if (art == 2){                                   // Prisma: ein weisser Strahl tritt ein und fächert sich in der Mitte in Farben auf
      vec3 ein = vec3(-1., .7, .5);
      if (r < .5){ q3 = mix(ein, vec3(0.), tt); c3 = vec3(1.); a0 = .9; }
      else {
        float fr = (r - 1.) / 6., zit = .03 * sin(uPhi * 3. + r);
        vec3 aus = vec3(1., mix(.55, -.95, fr) + zit, mix(-.6, .6, fr));
        q3 = mix(vec3(0.), aus, tt);
        c3 = clamp(abs(fract(fr * .8 + vec3(0., 2., 1.) / 3.) * 6. - 3.) - 1., 0., 1.) * .9 + .1;
        a0 = .8;
      }
      ab = 1.6 * s / n * uRes.y;
    } else {                                                // Schichten: helle Quadrate steigen als Lichtscan durch den Würfel
      float y = mod(r / 8. + uPhi / TAU, 1.) * 2. - 1., u4 = tt * 4., seite = floor(min(u4, 3.999)), f = u4 - seite;
      vec2 e2 = seite < .5 ? vec2(-1. + 2. * f, -1.) : seite < 1.5 ? vec2(1., -1. + 2. * f) : seite < 2.5 ? vec2(1. - 2. * f, 1.) : vec2(-1., 1. - 2. * f);
      q3 = vec3(e2.x, y, e2.y) * .98;
      ab = 8. * s / n * uRes.y;
      a0 = .5 * smoothstep(1., .7, abs(y)) * (.4 + .6 * pow(.5 + .5 * sin(r * 2.4 + uPhi), 3.));
      c3 = mix(licht, vec3(.6, 1., .85), .5 + .5 * y);
    }
    vec3 w3 = wBild(q3, s); pos = w3.xy;
    float tief = clamp(.5 + w3.z * .29, 0., 1.), kz = max(kern * .8, ab * 3.2);
    float a = (.4 + .6 * tief) * a0 * (schein > .5 ? DECK(ab, glanz, .5) : DECK(ab, kz, 1.1)) * wDa;
    col = vec4(c3 * a, a);
    size = schein > .5 ? glanz : kz;
    return;
  }
  if (zeile < nb){                                          // Blitze aus den Ecken, die Kanten des Bildes fangen sie ein
    float b = zeile - 20.;
    float h = h12(vec2(b, 3.) + uSeed), m = 3. + floor(h12(vec2(b, 5.) + uSeed) * 3.);
    float zz = uT * m + h, u = fract(zz), cyc = mod(floor(zz), m);   // m Schläge pro Schlaufe: Schlag n und n + m sind derselbe
    vec2 hh = h22(vec2(b, cyc) * 1.7 + uSeed * 3.1);
    vec3 ecke = vec3(step(.5, hh.x), step(.5, hh.y), step(.5, h12(vec2(cyc, b) + 9.))) * 2. - 1.;
    vec2 q = wBild(ecke, s).xy, dir = normalize(q + (hh - .5) * .4 + 1e-4);
    float st = .4 / n;
    if (j > smoothstep(0., .12, u) * n) return;              // der Blitz schiesst in einem Augenblick aus, dann verglimmt er
    float kr = 0.;
    for (int z = 0; z < 200; z++){
      float fz = float(z);
      if (fz >= j) break;
      vec2 g = feldG(UV(q), 1., 3.), t = normalize(vec2(-g.y, g.x) + 1e-5);
      kr = smoothstep(.6, 7., length(g)) * P4; if (dot(t, dir) < 0.) t = -t;
      vec2 r2 = h22(vec2(b * 3.3 + cyc, floor(fz / 8.)) + uSeed) - .5;
      if (mod(fz, 8.) < .5) dir = rot(r2.x * 1.5 * (1. - .75 * kr)) * dir;   // frei zuckt er, auf einer Kante läuft er ihr nach
      dir = normalize(mix(dir, t, kr * .6));
      q += dir * st;
    }
    pos = q;
    float fl = .7 + .3 * step(.3, h12(vec2(floor(uT * 240.), b)));
    float a = (u < .12 ? 1.2 : exp(-(u - .12) * 5.)) * fl * (1. - .5 * j / n), ab = st * uRes.y;
    vec3 c = uZeigen > .5 ? mix(licht, min(Kl(UV(q), 1.).rgb * 1.6 + .1, 1.), .5) : licht;
    float kz = max(kern * (.9 + .5 * (1. - j / n)), ab * 3.2);
    a *= schein > .5 ? DECK(ab, glanz, .25) : DECK(ab, kz, .8);
    col = vec4(c * a * 1.2, a);
    size = schein > .5 ? glanz : kz;
    return;
  }
  // Lichtspuren: beginnen auf der stärksten von vier Kanten und folgen der Linie gleicher Helligkeit; ein heller Kopf läuft, der Schweif glimmt nach
  float sI = zeile - nb, h = h12(vec2(sI, 7.) + uSeed);
  float zz = uT * 2. + h, u = fract(zz), cyc = mod(floor(zz), 2.);
  vec2 sp = vec2(.5); float best = -1.;
  for (int c = 0; c < 6; c++){                             // die stärkste von sechs Kanten
    if (uSparsam > .5 && c > 3) break;
    vec2 cand = h22(vec2(sI * 1.37, cyc * 6. + float(c)) + uSeed * 1.3) * .96 + .02;
    float e = length(feldG(cand, 1., 2.5)); if (e > best){ best = e; sp = cand; }
  }
  float kr0 = smoothstep(mix(.3, 3., P4), mix(3., 12., P4), best);   // Spuren nur, wo das Bild eine Form hat
  if (kr0 < .02) return;
  float L = .0025 * n, st = L / n, rk = h12(vec2(sI, 9.)) < .5 ? 1. : -1.;
  float tail = n * .6, head = smoothstep(0., .7, u) * (n + tail);
  if (j > head) return;
  vec2 q = P(sp), dir = vec2(0.);
  float kr = kr0;
  for (int z = 0; z < 200; z++){
    if (float(z) >= j) break;
    vec2 g = feldG(UV(q), .8, 2.5), t = normalize(vec2(-g.y, g.x) + 1e-5) * rk;   // fein: die Spur hält sich genau an die Kontur
    if (dot(t, dir) < 0.) t = -t;
    dir = length(dir) < .5 ? t : normalize(mix(dir, t, .75));
    kr = smoothstep(.4, 6., length(g));
    q += dir * st;
  }
  pos = q;
  float f = clamp((head - j) / tail, 0., 1.), a = (.3 + .7 * pow(1. - f, 2.)) * (.3 + .7 * kr) * (.5 + .5 * kr0) * smoothstep(1., .8, u) * 1.4, ab = st * uRes.y;   // der Kopf leuchtet, die gezeichnete Linie bleibt stehen
  vec3 c = uZeigen > .5 ? min(Kl(UV(q), 1.).rgb * 1.5 + .12, 1.) : licht;   // ohne Bild: kaltes Licht, die Linien kommen aus dem Bild
  float kz = max(kern * (1. + .6 * (1. - f)), ab * 3.2);
  a *= schein > .5 ? DECK(ab, glanz, .3) : DECK(ab, kz, .85);
  col = vec4(c * a, a);
  size = schein > .5 ? glanz * (.6 + .6 * (1. - f)) : kz;
}`,
  },


  geflecht: {
    name: "Physarum-Struktur", herkunft: "PHORMA II weitergedacht: der Schleimpilz als Struktur statt als Spur – Netz, Adern, Zellen oder Membran, je dichter, wo das Bild Nahrung bietet",
    // Wunsch vom 5. November 2026: «varianten der strukturbildung …, nicht nur diese leuchten spuren»; der Regler «Struktur» geht von Netz (0)
    // über Adern (⅓) und Zellen (⅔) zur Membran (1), dazwischen blenden zwei Strukturen ineinander
    regler: [r("Struktur", 0), r("Dichte", .5), r("Nahrung", .55), r("Dicke", .5), r("Fluss", .5), r("Bild", .3)],
    glsl: `float pNahr(vec2 uv){ vec3 c = Kl(uv, 2.5).rgb; if (uSparsam > .5) return clamp(.9 * lum(c) + .5 * sat(c), 0., 1.);   // Handy: ein Blick ins Bild statt zwei
  return clamp(.6 * lum(c) + 2. * abs(lum(c) - lum(Kl(uv, 5.).rgb)) + .3 * sat(c), 0., 1.); }
// Voronoi auf einem Raster, dessen Keime nur dort bleiben, wo das Bild nährt: f1, f2 (Abstand zum nächsten und zweitnächsten Keim), Nahrung und Kennung des nächsten
// R: Suchradius in Zellen; auf Handys (uSparsam) 1 statt 2, das sind 9 statt 25 Keime je Pixel (am 5. November 2026 stürzte die Grafik eines Handys ab)
vec4 pVor(vec2 g, float N, float sk, out vec2 id){
  vec2 ci = floor(g); float f1 = 9., f2 = 9., fn = 0.; id = ci;
  int R = uSparsam > .5 ? 1 : 2;
  for (int y = -R; y <= R; y++) for (int x = -R; x <= R; x++){
    vec2 c = ci + vec2(x, y), h = h22(c + sk + uSeed * 4.1);
    vec2 m = c + .5 + (h - .5) * .85 + .18 * vec2(ln(c * .23 + sk, .6), ln(c * .23 + 5. + sk, .6));
    float fv = pNahr(UV(m / N));
    if (h12(c * 1.3 + sk) > mix(1., fv * fv * 2.2 + .04, P2)) continue;   // Keime sterben, wo das Bild keine Nahrung hat
    float d = length(g - m);
    if (d < f1){ f2 = f1; f1 = d; fn = fv; id = c; } else if (d < f2) f2 = d;
  }
  return vec4(f1, f2, fn, 0.);
}
vec4 effekt(vec2 uv){
  vec2 p = P(uv); float N = mix(6., 26., P1), s = P0 * 3., px = N / uRes.y;
  float w0 = max(0., 1. - abs(s)), w1 = max(0., 1. - abs(s - 1.)), w2 = max(0., 1. - abs(s - 2.)), w3 = max(0., 1. - abs(s - 3.));
  vec2 warp = lcurl(p * 1.6 + 2., .5) * .02 * (w0 * .7 + w1 + w3);
  vec2 g = (p + warp) * N, id;
  vec4 v = pVor(g, N, 0., id);
  float e = v.y - v.x, fo = pNahr(uv), dk = mix(.4, 1.8, P3);
  float fluss = .55 + .45 * sin(v.x * 9. - uPhi * 3. + h12(id) * TAU) * P4;   // der Plasmastrom pulsiert durch die Röhren
  float licht = 0.;
  if (w0 > 0.){                                            // Netz: Röhren zwischen den Keimen, dick, wo die Nahrung reich ist, Knoten an den Keimen
    float wd = (.03 + .1 * v.z) * dk;
    float t = 1. - smoothstep(wd, wd + px * 1.5, e);
    float kn = (1. - smoothstep(.07 * dk, .07 * dk + px * 2., v.x)) * smoothstep(.45, .9, v.z);   // Knoten nur, wo viel Nahrung liegt
    licht += w0 * (t * fluss * (.3 + .7 * smoothstep(.1, .55, fo)) + kn);
  }
  if (w1 > 0.){                                            // Adern: drei Ordnungen, jede feiner, verzweigt wie in einem Blatt
    vec2 id2, id3; vec4 v2 = pVor(g * 2.3 + 11., N * 2.3, 7., id2), v3 = uSparsam > .5 ? vec4(0., 9., 0., 0.) : pVor(g * 5.1 + 23., N * 5.1, 13., id3);   // Handy: ohne die feinste Ordnung
    float a1 = 1. - smoothstep(.05 * dk, .05 * dk + px * 1.5, e);
    float a2 = (1. - smoothstep(.05 * dk, .05 * dk + px * 3.4, v2.y - v2.x)) * smoothstep(.1, .5, fo) * .7;
    float a3 = (1. - smoothstep(.06 * dk, .06 * dk + px * 7.6, v3.y - v3.x)) * smoothstep(.25, .7, fo) * .45;
    licht += w1 * max(a1 * fluss, max(a2, a3) * (.7 + .3 * fluss));
  }
  if (w2 > 0.){                                            // Zellen: Haut, Plasma und Kern, sie atmen
    float at = 1. + .12 * sin(uPhi * floor(1. + h12(id + 3.) * 2.) + h12(id) * TAU) * P4;
    float haut = 1. - smoothstep(.04 * dk, .04 * dk + px * 1.5, e);
    float kern = (1. - smoothstep(.13 * dk * at, .13 * dk * at + px * 2., v.x)) * (.4 + .6 * v.z);
    float plasma = smoothstep(.0, .5, e) * .18 * (.4 + v.z);
    licht += w2 * (haut * (.35 + .65 * smoothstep(.1, .55, fo)) + kern + plasma);
  }
  if (w3 > 0.){                                            // Membran: gefaltete Bänder wie ein Labyrinth, gelenkt von der Helligkeit des Bildes
    float f = lfbm(p * mix(2., 6., P1) + warp * 20., .6) * 2.2 + lum(Kl(uv, 3.).rgb) * 2.4 * P2 + PD(sin(uPhi)) * .4 * P4;
    float b = abs(fract(f * mix(2., 5., P1)) - .5), fw = fwidth(f * mix(2., 5., P1));
    float band = 1. - smoothstep(.12 * dk, .12 * dk + fw * 1.5, b);
    float rand = (1. - smoothstep(.0, fw * 1.5, abs(b - .12 * dk))) * .6;
    licht += w3 * (band * .55 + rand) * (.35 + .65 * smoothstep(.05, .4, fo));
  }
  vec3 gold = vec3(1., .8, .32), nacht = vec3(.035, .03, .02);
  vec3 c = uZeigen > .5 ? mix(gold, min(Kl(uv, 1.5).rgb * 1.5 + .08, 1.), .65) : gold;   // ohne Bild: das gelbe Geflecht, die Dichte kommt aus dem Bild
  vec3 grund = uZeigen > .5 ? mix(nacht, Ql(uv, 0.).rgb * .5, P5) : nacht;
  vec3 col = grund + c * licht + c * .06 * smoothstep(.2, .7, fo);
  return vec4(clamp(col, 0., 1.), 1.);
}`,
  },
  lichtformen: {
    name: "Lichtformen", herkunft: "Licht aus den Formen des Bildes: glühende Kanten, Kaustiken wie Licht durch Wasser, Strahlenbündel, die aus den hellen Formen brechen, prismatische Säume oder Lichtschleier entlang der Konturen",
    // Wunsch vom 5. November 2026: «gibt es noch differenzierte lichtformen? … als effekt der sich auf die formen im bild bezieht»
    // seit 5. November 2026 (abends, Rückmeldung: «die lichtformen dürften noch etwas feingliedriger sein»): dünne Kerne statt dicker Kanten,
    // dazu haarfeine Linien gleicher Helligkeit in den Formen; die Kaustik als feineres Netz aus drei Lagen schmaler Grate; schmalere Strahlen;
    // enge Farbsäume am Prisma; der Schleier aus einzelnen feinen Fäden statt Flächen
    regler: [w("Form", ["Glühkanten", "Kaustik", "Strahlen", "Prisma", "Schleier"]), r("Stärke", .6), r("Schwelle", .45), r("Bewegung", .5), r("Wärme", .25), r("Bild", .2)],
    glsl: `${FELD}
vec3 lfSpek(float h){ return clamp(abs(fract(h + vec3(0., 2., 1.) / 3.) * 6. - 3.) - 1., 0., 1.); }
vec4 effekt(vec2 uv){
  vec2 p = P(uv); int f = int(floor(P0 * 4. + .5));
  float tempo = 1. + floor(P3 * 2.99), thr = mix(4., 30., P2), st = mix(.4, 1.6, P1);
  vec3 lc = mix(vec3(.8, .89, 1.), vec3(1., .8, .52), P4);
  if (uZeigen > .5) lc = mix(lc, min(Kl(uv, 1.).rgb * 1.5 + .1, 1.), .55);   // mit Bild: das Licht nimmt seine Farben an
  vec3 L = vec3(0.);
  if (f == 0){                                              // Glühkanten: ein scharfer Kern auf den Kanten, darum ein weiter Hof; ein Puls läuft die Höhenstufen entlang
    float e0 = length(feldG(uv, .5, 1.2)), e3 = length(feldG(uv, 2.5, 5.));
    float h = lum(Kl(uv, 1.5).rgb);
    // seit 5. November 2026 (Glühkanten standen fast still): zwei Lichtfelder wandern ruhig über das Bild und entzünden die Kanten, wo sie
    // vorbeiziehen; dazu läuft wie bisher ein Puls die Höhenstufen entlang
    float feld = smoothstep(.45, .85, .5 + .5 * ln(p * 1.5, .9)) * 1.4 + smoothstep(.55, .9, .5 + .5 * ln(p * 3.1 + 4.2, 1.3)) * .9;
    float lauf = (.35 + .65 * (.5 + .5 * sin(h * 22. - uPhi * tempo))) * mix(1., .1 + 1.6 * feld, .45 + .55 * P3);
    float kern = smoothstep(thr * 1.2, thr * 3., e0);                                           // dünner Kern auf der Kante
    float hof = pow(smoothstep(thr * .2, thr * 2.5, e3), 2.) * .3;                               // schmaler Hof
    float iso = h * 36. + ln(p * 3., .5) * 1.2, ia = fwidth(iso) + 1e-4;                         // haarfeine Linien gleicher Helligkeit in den Formen
    float adern = exp(-pow((abs(fract(iso + .5) - .5)) / (ia * 1.1), 2.)) * smoothstep(thr * .1, thr * 1.2, e3) * .55;
    L = lc * (kern * lauf * 1.1 + hof * (.4 + .6 * lauf) + adern * (.3 + .7 * lauf)) * st;
  } else if (f == 1){                                       // Kaustik: Licht durch bewegtes Wasser, gebrochen an den Formen des Bildes und hell, wo das Bild hell ist
    vec2 g3 = feldG(uv, 3., 6.);
    vec2 q = p * mix(9., 18., P1) + g3 * .012;
    float c1 = 1. - abs(ln(q, .7)), c2 = 1. - abs(ln(q * 1.7 + 5.3, .9)), c3 = 1. - abs(ln(q * 2.9 + 11.1, 1.1));
    float c = pow(c1, 14.) + pow(c2, 18.) * .7 + pow(c3, 22.) * .5 + pow(min(c1, c2), 7.) * .5;   // drei Lagen schmaler Grate: ein feines Netz
    float hell = smoothstep(mix(.05, .6, P2), 1., lum(Kl(uv, 2.).rgb)) + .5 * smoothstep(thr * .3, thr * 2., length(g3));
    L = lc * c * hell * .8;
  } else if (f == 2){                                       // Strahlenkranz: die Umrisse werfen feine Strahlen nach aussen, weg von der Mitte des Lichts
    vec2 zm = vec2(.5 + .05 * cos(uPhi), .52 + .04 * sin(uPhi)), d = uv - zm;
    float ang = atan(d.y * 1.25, d.x * A()), acc = 0., dec = 1.;
    int S = uSparsam > .5 ? 12 : 24;
    for (int i = 0; i < 24; i++){
      if (i >= S) break;
      vec2 q = uv - d * float(i) / float(S) * .35;
      float k = abs(lum(Kl(q, 1.5).rgb) - lum(Kl(q, 4.).rgb)) * 5.;
      acc += smoothstep(mix(.1, .6, P2), 1., k) * dec; dec *= .92;
    }
    float streif = .15 + .85 * pow(.5 + .5 * ln(vec2(ang * 60., 1.), .8 * P3 + .05), 4.) * (.5 + .5 * pow(.5 + .5 * ln(vec2(ang * 190., 3.), .5), 3.));   // viele schmale Strahlen
    L = lc * acc * .26 * st * streif;
  } else if (f == 3){                                       // Prisma: die Kanten zerlegen sich in Spektralfarben, Rot und Blau liegen versetzt
    vec2 g3 = feldG(uv, 3., 6.), o = normalize(g3 + 1e-5) / vec2(A(), 1.) * .0028 * st;
    float eR = smoothstep(thr * 1.3, thr * 3., length(feldG(uv - o, .6, 1.4)));                  // enge Säume: die Kanten fein gelesen
    float eG = smoothstep(thr * 1.3, thr * 3., length(feldG(uv, .6, 1.4)));
    float eB = smoothstep(thr * 1.3, thr * 3., length(feldG(uv + o, .6, 1.4)));
    float hue = atan(g3.y, g3.x) / TAU + uT * tempo + lum(Kl(uv, 2.).rgb) * .5;
    L = (vec3(eR, eG, eB) * .85 + lfSpek(hue) * max(eR, max(eG, eB)) * .5 + lfSpek(hue) * smoothstep(thr * .3, thr * 2., length(g3)) * .1) * st;
  } else {                                                  // Schleier: feine Lichtfäden, die den Konturen folgen und durch sie ziehen
    vec2 g3 = feldG(uv, 3., 6.), t = normalize(vec2(-g3.y, g3.x) + 1e-5), nrm = vec2(-t.y, t.x);
    float hof = smoothstep(thr * .1, thr * 1.2, length(g3)), v = 0.;
    int S = uSparsam > .5 ? 8 : 16;
    for (int i = 0; i < 16; i++){
      if (i >= S) break;
      float fi = float(i) / float(S) - .5;
      vec2 q = p + t * fi * .06;
      vec2 lok = vec2(dot(q, t) * 14., dot(q, nrm) * 230.);                                      // entlang der Kontur gestreckt: lange feine Fäden
      float n1 = 1. - abs(ln(lok, .9)), n2 = 1. - abs(ln(lok * vec2(1.3, 2.1) + 7., 1.1));
      v += pow(n1, 10.) + pow(n2, 14.) * .6;
    }
    v /= float(S);
    float faden = smoothstep(.04, .5, v);
    L = lc * (faden * 1.5 + .06) * hof * st;
  }
  vec3 grund = uZeigen > .5 ? Ql(uv, 0.).rgb * P5 : vec3(.02, .022, .03);
  return vec4(clamp(schulter(grund + L), 0., 1.), 1.);
}`,
  },
  strom: {
    name: "Strom", herkunft: "PHORMA I: das Bild löst sich in glänzende Kügelchen in seinen eigenen Farben, Funken leuchten auf, die Kügelchen ziehen in feinen Bändern und Wirbeln den Konturen nach und fliegen an ihren Platz zurück",
    // Wunsch vom 5. November 2026: «hol dir für die effekte von Phorma I: strom, körper». Wie in PHORMA I wird jeder Bildpunkt zu einer Kugel
    // mit Glanzlicht (motor.js, kugel: true); hier aber zieht der Strom die Kügelchen den Linien gleicher Helligkeit des Bildes entlang
    // (Nachbarn folgen derselben Stromlinie, verschieden weit: so entstehen Bänder statt Staub), ein Wirbelfeld dreht sie zu Schlaufen.
    // Die meisten Kügelchen sind klein, etwa jedes siebte mittel, jedes dreissigste gross; die grossen sind träger und lösen sich vom Band
    regler: [r("Strom", .7), r("Kugelgrösse", .45), r("Wirbel", .35), r("Länge", .5), r("Funken", .5), r("Tempo", .2)],
    kugel: true,
    punkte: (w, a, h, d = 1) => { const n = Math.round(260 * Math.sqrt(d * Math.min(1, h / 1000 + .2))); return { cols: Math.round(n * a * 1.15), rows: Math.round(n * 1.15) }; },
    glsl: `${FELD}
void punkt(int id, out vec2 pos, out vec4 col, out float size){
  float i = float(id); vec2 g = vec2(mod(i, uCols), floor(i / uCols));
  vec2 uv0 = (g + h22(g + uSeed * 7.7)) / vec2(uCols, uRows) * 1.1 - .05;   // ein schmaler Saum, damit die Ränder voll bleiben
  float s = h12(g * 1.37 + uSeed), b = h12(g * 2.11 + 9.3 + uSeed);
  float gr = b < .033 ? 2. + s : b < .15 ? 1. + .6 * s : .45 + .45 * s;     // Grösse: meist klein, einige mittel, wenige gross
  float m = 1. + floor(P5 * 1.99);                                         // ein oder zwei Atemzüge je Schlaufe
  float env = HZ(.5 - .5 * cos(uPhi * m));                                 // 0: das Bild steht exakt (Naht der Schlaufe)
  float weg = env * P0 * mix(.25, 1., s) / (1. + max(gr - 1., 0.) * .5);   // wie weit das Kügelchen auf seiner Stromlinie kommt
  vec2 p0 = P(uv0), q = p0;
  int N = uSparsam > .5 ? 10 : 22;
  float L = mix(.12, .6, P3), st = L / float(N), steps = weg * float(N);
  for (int k = 0; k < 22; k++){
    if (k >= N) break;
    float dt = clamp(steps - float(k), 0., 1.);
    if (dt <= 0.) break;
    vec2 v = strom(UV(q), 2., 5., .1) + lcurl(q * 3.2 + 1.3, .5) * .018 * P2;   // den Konturen entlang, dazu Wirbel
    q += normalize(v + 1e-5) * st * dt;
  }
  pos = q;
  vec4 c = Ql(uv0, .3); float Lk = lum(Kl(uv0, .3).rgb);
  if (uZeigen < .5) c = vec4(mix(vec3(.62, .66, .74), vec3(1., .97, .92), Lk), 1.);   // ohne Bild: Silber, hell, wo das Bild hell ist
  float funke = pow(.5 + .5 * sin(TAU * (s * 3. + lum(c.rgb) * 2. - uT * 2. * m)), 12.) * P4 * smoothstep(.05, .4, env);   // Funken laufen durch
  col = vec4(min(c.rgb * (1. + funke * 1.8) + funke * .25, 1.), 1.);
  float ab = uRes.y * 1.1 / uRows;                                         // Abstand der Kügelchen im Raster: in Ruhe deckt das Bild
  float flug = mix(1., .5, smoothstep(0., .5, weg));                    // im Flug kleiner: feine Bänder statt Brocken
  size = ab * mix(1.3, 3.2, P1) * gr * flug * (1. + funke * .4) * (uZeigen > .5 ? 1. : .5 + Lk) + .5;
}`,
  },
  koerper: {
    name: "Körper", herkunft: "PHORMA I: auf den Formen des Bildes wachsen Glaskörper, Dodekaeder, Geode und Ikosaeder, die ineinander übergehen und sich drehen; das Bild scheint durch ihre Facetten, gebrochen in Regenbogensäume, die Kanten spiegeln",
    // Wunsch vom 5. November 2026 («hol dir für die effekte von Phorma I: strom, körper»): das Glas wie in PHORMA I als Schnitt von 16 Platten
    // (6 Dodekaeder-, 10 Ikosaederflächen), Ein- und Austritt exakt, Brechung je Farbkanal. Neu aus dem Bild: die Körper setzen sich auf seine
    // stärksten Formen und sind dort gross, ihr Glas nimmt deren Farbe an, und was sie spiegeln, ist das Bild selbst (weich)
    regler: [r("Anzahl", .25), r("Grösse", .55), w("Form", ["Dodekaeder", "Geode", "Ikosaeder", "Wandel"], 3), r("Brechung", .6), r("Kanten", .55), r("Drehen", .35)],
    glsl: `${BLASE}
const vec3 kN[16] = vec3[16](
  normalize(vec3(0., 1.618, 1.)), normalize(vec3(0., -1.618, 1.)), normalize(vec3(1., 0., 1.618)), normalize(vec3(-1., 0., 1.618)), normalize(vec3(1.618, 1., 0.)), normalize(vec3(-1.618, 1., 0.)),
  normalize(vec3(1., 1., 1.)), normalize(vec3(-1., 1., 1.)), normalize(vec3(1., -1., 1.)), normalize(vec3(1., 1., -1.)), normalize(vec3(0., 1., 2.618)), normalize(vec3(0., -1., 2.618)),
  normalize(vec3(2.618, 0., 1.)), normalize(vec3(-2.618, 0., 1.)), normalize(vec3(1., 2.618, 0.)), normalize(vec3(-1., 2.618, 0.)));
const float kTAN = .3153, kZ = 3.2;
bool kSchnitt(vec3 o, vec3 d, vec2 rad, out float s0, out float s1, out vec3 n0, out vec3 n1){
  s0 = -1e9; s1 = 1e9; n0 = vec3(0., 0., 1.); n1 = vec3(0., 0., -1.);
  for (int i = 0; i < 16; i++){
    float r = i < 6 ? rad.x : rad.y; vec3 n = kN[i]; float dn = dot(d, n), on = dot(o, n);
    if (abs(dn) < 1e-6){ if (abs(on) > r) return false; continue; }
    float a = (-r - on) / dn, b = (r - on) / dn; vec3 na = -n, nb = n;
    if (a > b){ float t = a; a = b; b = t; vec3 tn = na; na = nb; nb = tn; }
    if (a > s0){ s0 = a; n0 = na; }
    if (b < s1){ s1 = b; n1 = nb; }
  }
  return s0 < s1 && s1 > 0.;
}
float kKante(vec3 p, vec2 rad, float breite){
  float a = -1e9, b = -1e9;
  for (int i = 0; i < 16; i++){ float v = abs(dot(p, kN[i])) - (i < 6 ? rad.x : rad.y); if (v > a){ b = a; a = v; } else if (v > b) b = v; }
  return 1. - smoothstep(0., breite, a - b);
}
mat3 kDreh(vec3 w){
  float ca = cos(w.x), sa = sin(w.x), cb = cos(w.y), sb = sin(w.y), cc = cos(w.z), sc = sin(w.z);
  return mat3(cc, sc, 0., -sc, cc, 0., 0., 0., 1.) * mat3(cb, 0., -sb, 0., 1., 0., sb, 0., cb) * mat3(1., 0., 0., 0., ca, sa, 0., -sa, ca);
}
vec2 kForm(float f){ float a = smoothstep(0., 1., clamp(f, 0., 1.)), b = smoothstep(0., 1., clamp(f - 1., 0., 1.)); return f < 1. ? vec2(1., 1.3 - .24 * a) : vec2(1. + .3 * b, 1.06 - .06 * b); }
const float kHH = (kZ + 1.) * kTAN;                                   // halbe Bildhöhe auf der Bildebene z = −1
vec2 kAufBild(vec3 o, vec3 d){ d.z = min(d.z, -.05); vec3 p = o + d * ((-1. - o.z) / d.z); return UV(p.xy / (2. * kHH)); }
vec4 effekt(vec2 uv){
  vec2 p = P(uv);
  vec3 ro = vec3(0., 0., kZ), rd = normalize(vec3(p * 2. * kTAN, -1.));
  int n = 1 + int(floor(P0 * 4.99)); if (uSparsam > .5) n = min(n, 2);
  float fw = P2 > .9 ? 1. - cos(uPhi) : P2 * 2.;                      // Wandel: Dodekaeder → Geode → Ikosaeder und zurück
  float env = HZ(.5 - .5 * cos(uPhi)), best = 1e9;
  int k = -1; vec3 lo, ld, n0, M; mat3 R; float s0, g; vec2 rad; vec3 ton;
  for (int j = 0; j < 5; j++){
    if (j >= n) break;
    float fj = float(j), fo; vec3 h = h33(vec3(fj, 7., uSeed + 4.));
    vec2 c = zumBild((h.xy - .5) * vec2(A() * .5, .5), 2.4, fo);    // auf die starken Formen des Bildes
    c += .02 * vec2(cos(uPhi + h.z * TAU), sin(uPhi + h.x * TAU));
    float gj = mix(.12, .34, P1) * mix(.55, 1.15, clamp(fo, 0., 1.)) * mix(.8, 1., env) / (1. + float(n - 1) * .22);
    c = clamp(c, -vec2(A() * .5, .5) + gj * 1.55, vec2(A() * .5, .5) - gj * 1.55);   // der Körper bleibt ganz im Bild
    vec3 Mj = vec3(c * 2. * kHH, 0.), drj = h * TAU + floor(P5 * 2.99) * uPhi * vec3(1., 1., 0.) + .25 * P5 * vec3(sin(uPhi), cos(uPhi), sin(uPhi + h.y * TAU));
    mat3 Rj = kDreh(drj), inv = transpose(Rj);
    float gw = gj * 2. * kHH;
    vec3 o = inv * (ro - Mj) / gw, d = inv * rd; float a, b; vec3 m0, m1; vec2 rj = kForm(fw + (h.z - .5) * .3 * step(.9, P2));
    if (kSchnitt(o, d, rj, a, b, m0, m1) && a > 0. && a * gw < best){
      best = a * gw; k = j; lo = o; ld = d; s0 = a; n0 = m0; M = Mj; R = Rj; g = gw; rad = rj;
      ton = mix(vec3(1.), clamp(Kl(UV(c), 3.).rgb * 1.5 + .25, 0., 1.), .45);   // das Glas nimmt die Farbe seiner Form an
    }
  }
  vec3 aussen = Ql(uv, 0.).rgb;
  if (k < 0) return vec4(aussen, 1.);
  vec3 e = lo + ld * s0, farbe; float dicke = 0.;
  for (int c = 0; c < 3; c++){                                          // je Farbkanal eigene Brechung: Regenbogensäume
    float ior = 1. + (.46 + .045 * float(c)) * mix(.15, 1.5, P3);
    vec3 d1 = refract(ld, n0, 1. / ior); float a, b; vec3 m0, m1;
    kSchnitt(e + d1 * 1e-4, d1, rad, a, b, m0, m1);
    vec3 x = e + d1 * b, d2 = refract(d1, -m1, ior);
    if (dot(d2, d2) < 1e-6) d2 = reflect(d1, -m1);
    farbe[c] = Ql(kAufBild(R * x * g + M, R * d2), .2)[c];
    if (c == 1) dicke = b;
  }
  farbe *= mix(vec3(1.), vec3(.86, .92, 1.), clamp(dicke * .35, 0., 1.)) * ton;
  vec3 rw = R * reflect(ld, n0);
  float F = .04 + .96 * pow(1. - max(dot(-ld, n0), 0.), 5.);
  vec3 spiegel = Kl(UV(rw.xy * .5), 5.).rgb * .8 + vec3(.04);            // gespiegelt wird das Bild selbst, weich
  if (uZeigen < .5) spiegel = mix(vec3(.02), vec3(.55, .6, .72), smoothstep(-.3, .9, rw.y));
  vec3 glanz = vec3(1., .95, .88) * pow(max(dot(rw, normalize(vec3(.6, .8, .5))), 0.), 220.) * 5.
             + vec3(1., .6, .3) * pow(max(dot(rw, normalize(vec3(-.7, -.2, .6))), 0.), 90.) * 1.2;
  farbe = mix(farbe, spiegel, F) + glanz;
  float kw = .007 / max(g, .2) * uRes.y / 1350. + .004;
  farbe = mix(farbe, vec3(.97), clamp(kKante(e, rad, kw) * P4, 0., 1.));   // feine Spiegelkanten
  return vec4(clamp(farbe, 0., 1.), 1.);
}`,
  },
  bluete: {
    name: "Membran-Blüte", herkunft: "infinite mantra (Membranen): durchscheinende, weich verformte Membranen setzen sich auf die Formen des Bildes, nehmen seine Farben an, fliessen und falten sich langsam wie Blütenblätter, und das Bild fliesst mit ihnen",
    // Referenzvideo vom 5. November 2026 (webdesigns/infinite-mantra-membran-bluete), Christian wollte es als Effekt. Die Membranen sind
    // Linsen: im Innern ist das Bild leicht vergrössert und gedreht, ihre Farbe kommt aus dem Bild (Wärme schiebt sie zu Aprikose bis Pflaume),
    // Überlagerungen dunkeln multiplikativ ab.
    // Seit 5. November 2026 (dritter Wunsch: «feine, rundlicher, weicher, verformender fliess und dass ausgangsbild mehr bewegt»): der Rand
    // jeder Membran wird von langsamem Rauschen verformt (rundliche Lappen statt harter Kreise), der Rand ist breit und weich, die Linie fein;
    // die Membranen gleiten weiter der Kontur entlang; das Bild fliesst als Ganzes in einem langsamen Wirbelfeld und in jeder Membran
    // stärker (Linse, Strömung, Wellen im Glas)
    regler: [r("Anzahl", .55), r("Grösse", .5), r("Falten", .5), r("Lasur", .6), r("Wärme", .7), r("Muscheln", .4)],
    glsl: `${BLASE}${FELD}
vec3 blPal(float t){                                                            // Aprikose, Rosé, Altrosa, Pflaume
  vec3 a = vec3(1., .7, .45), b = vec3(.95, .52, .5), c = vec3(.76, .32, .45), d = vec3(.36, .08, .24);
  return t < .33 ? mix(a, b, t / .33) : t < .66 ? mix(b, c, (t - .33) / .33) : mix(c, d, (t - .66) / .34);
}
vec4 effekt(vec2 uv){
  vec2 p = P(uv); float k = uRes.y / 1350.;
  vec2 off = lcurl(p * 1.3 + 3., 1.1) * .035 + strom(uv, 3.5, 8., .15) * .012 * sin(uPhi);   // das ganze Bild fliesst in einem langsamen Wirbelfeld und atmet entlang seiner Konturen
  vec3 lasur = vec3(1.);
  int n = int(mix(5., 16., P0));
  for (int i = 0; i < 16; i++){
    if (i >= n) break;
    float fi = float(i); vec2 c; float R, fo; blase(i, P1, .35, c, R);
    vec3 h = h33(vec3(fi, 5., uSeed + 2.));
    vec2 ca = zumBild((h22(vec2(fi, 3.) + uSeed) - .5) * vec2(A() * .8, .8), 2.2, fo);   // der Anker sitzt auf einer Form des Bildes
    R *= mix(.5, 1.25, clamp(fo, 0., 1.));
    // seit 5. November 2026 (Runde 2, Handy-Leistung): Membranen, die diesen Pixel sicher nicht erreichen, früh überspringen
    // (Drift höchstens .15, Rand höchstens 1,2 R, Falten strecken höchstens um 1/.7)
    if (length(p - ca) > R * 1.9 + .16) continue;
    float sw = sin(uPhi + h.z * TAU);                                            // ein weicher Atemzug je Schlaufe
    vec2 kt = strom(UV(ca), 3.5, 8., .15);                                       // Richtung der Kontur am Anker
    c = ca + kt * .09 * sw + vec2(-kt.y, kt.x) * .025 * cos(uPhi + h.y * TAU) + lcurl(ca * 2. + fi, 1.) * .03;   // gleitet der Kontur entlang und treibt
    float dr = h.y * TAU + (h.x < .5 ? -.35 : .35) * sw + atan(kt.y, kt.x) * .25;
    vec2 v = rot(dr) * (p - c);
    float fa = 1. - P2 * .3 * (.5 - .5 * cos(uPhi + h.z * TAU));                  // Falten: klappt sanft zur Ellipse und auf
    v.x /= fa;
    float th = atan(v.y, v.x), d = length(v) / R, rr = 1.;
    bool muschel = h.z < P5 * .8;
    if (muschel){                                                              // Muschel: der Rand wächst mit dem Winkel, weich
      float tn = fract(th / TAU + .5 + .012 * sin(uPhi + fi));
      rr = mix(.45, 1.05, smoothstep(0., 1., pow(tn, .9)));
    }
    vec2 ring = vec2(cos(th), sin(th));
    rr *= 1. + .1 * ln(ring * 1.4 + fi * 1.7, 1.2) + .05 * ln(ring * 3.1 + fi * 2.3 + 9., 1.);   // der Rand wogt: rundliche Lappen statt Kreis
    float rd = (d - rr) * R * uRes.y;                                           // Abstand zum Rand in Pixeln, innen negativ
    if (rd > 4. * k) continue;
    float innen = smoothstep(5. * k, -5. * k, rd);                               // breiter, weicher Rand
    float tief = 1. - min(d / rr, 1.);
    vec2 w = v / R;
    off += -(rot(-dr) * vec2(w.x * fa, w.y)) * R * tief * .2 * innen;             // Linse: das Bild zur Mitte gezogen
    off += kt * .035 * sw * innen * tief;                                        // und es fliesst mit der Membran der Kontur entlang
    off += lcurl(p * 5. + fi * 3., 1.3) * .02 * innen * tief;                      // Wellen im Glas
    vec3 farbe = Kl(UV(c), 3.5).rgb; farbe = clamp(mix(vec3(lum(farbe)), farbe, 1.7), 0., 1.);
    farbe = mix(farbe, blPal(clamp((1. - lum(farbe)) * .25 + h.x * .8 - .05, 0., 1.)), P4);   // Wärme: zur Palette der Referenz
    float rille = muschel ? .5 + .5 * cos(th * mix(10., 16., h.y) + d * 9.) : .5 + .5 * cos(d / rr * mix(14., 22., h.x) - uPhi);
    float a = P3 * (.5 + .38 * smoothstep(.1, 1., d / rr)) * (.94 + .06 * rille);   // zum Rand hin satter, die Rillen nur angedeutet
    lasur *= mix(vec3(1.), farbe, a * innen);
    float rand = exp(-rd * rd / (2.2 * k * k + 1e-4)) * .8;                        // feine Randlinie
    lasur *= mix(vec3(1.), farbe * farbe * .7, clamp(rand, 0., 1.) * (.3 + .5 * P3));
  }
  vec3 grund = uZeigen > .5 ? Ql(UV(p + off), .3).rgb : vec3(.92, .89, .85);   // ohne Bild: Cremepapier, die Membranen aus dem Bild
  // Runde 2: die Lasur bleibt leuchtend statt trüb: Farbe in OKLab etwas satter, das Licht weich abgefangen
  vec3 col = tonDreh(grund * lasur * 1.06, 0., 1.18);
  return vec4(clamp(schulter(col), 0., 1.), 1.);
}`,
  },
};

export const EFFEKT_IDS = Object.keys(EFFEKTE);
