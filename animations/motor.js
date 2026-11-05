// Animationen – der Motor: ein WebGL-2-Kontext rechnet bis zu drei Ebenen übereinander (je Effekt, Quelle, Mischmodus, Deckkraft)
// und gibt das Bild auf eine eigene Leinwand aus, die Reel, Werke und Mischpult abzeichnen. Alles hängt nur von der Zeit t in der
// Schlaufe ab (phi = 2π·t/DAUER, ganzzahlige Frequenzen): Bild N ist wieder Bild 0, und das MP4 entsteht Bild für Bild.
import { EFFEKTE, wertVon } from "./effekte.js?v=28";
import { t } from "./sprache.js?v=28";

export const DAUER = 12, FPS = 30, LAENGEN = [12, 30, 60];
/** Länge der Schlaufe eines Stapels in Sekunden (Vorgabe 12) */
export const dauerVon = (stapel) => LAENGEN.includes(stapel?.dauer) ? stapel.dauer : DAUER;
/** Anteil der Teilchen in den schweren Punkt-Effekten auf Handys (und nach einem verlorenen Kontext) */
export const DICHTE_SPARSAM = .3;
/** höchstens so viele Punkte je Ebene auf Handys (5. November 2026: Absturz bei der Teilchenwolke mit Glitzer, seit #611 mit Saum fast 600 000 Punkte) */
export const PUNKTE_SPARSAM = 120_000;
export const MODI = { normal: 0, multiplizieren: 1, differenz: 2, bildschirm: 3, ueberlagern: 4 };

// Hash ohne Sinus (Dave Hoskins, MIT) und Gradientenrauschen; «ln» läuft auf einem Kreis durch die Zeit und schliesst so die Schlaufe.
const KOPF = `#version 300 es
precision highp float; precision highp int;
uniform sampler2D uBild, uUnten;
uniform vec2 uRes, uFit;
uniform float uPhi, uT, uSeed, uQuelle, uLod, uCols, uRows, uZeigen, uLauf, uPsi, uL, uSparsam;
uniform float uP[6];
#define PI 3.14159265
#define TAU 6.28318531
#define P0 uP[0]
#define P1 uP[1]
#define P2 uP[2]
#define P3 uP[3]
#define P4 uP[4]
#define P5 uP[5]
float A(){ return uRes.x / uRes.y; }
vec2 P(vec2 uv){ return (uv - .5) * vec2(A(), 1.); }
vec2 UV(vec2 p){ return p / vec2(A(), 1.) + .5; }
// «Bild zeigen: aus» (Wunsch vom 4. November 2026: «dass sich der Effekt aufs Bild bezieht aber dieses nicht zeigt»):
// Kl liest immer das Bild (Steuerkarte für Helligkeit, Relief, Farben), Ql zeigt statt des Bildes ein neutrales Haarlinien-Raster E,
// an dem sich Verzerrungen, Linsen und Strömungen weiter ablesen lassen
vec4 Kl(vec2 uv, float l){ return uQuelle > .5 ? textureLod(uUnten, clamp(uv, 0., 1.), 0.) : textureLod(uBild, (uv - .5) * uFit + .5, uLod + l); }
vec4 E(vec2 uv){
  float k = uRes.y / 1350., d = abs(fract(uv.y * uRes.y / (9. * k)) - .5) * 9. * k;
  float l = clamp(1.1 * k + .6 - d, 0., 1.);
  return vec4(mix(vec3(.043, .035, .039), vec3(.95, .925, .9), l * .8), 1.);
}
vec4 Ql(vec2 uv, float l){ return (uZeigen > .5 || uQuelle > .5) ? Kl(uv, l) : E(uv); }
vec4 Q(vec2 uv){ return Ql(uv, 0.); }
float lum(vec3 c){ return dot(c, vec3(.299, .587, .114)); }
float sat(vec3 c){ return max(c.r, max(c.g, c.b)) - min(c.r, min(c.g, c.b)); }
mat2 rot(float a){ float c = cos(a), s = sin(a); return mat2(c, -s, s, c); }
vec3 h33(vec3 p){ p = fract(p * vec3(.1031, .1030, .0973)); p += dot(p, p.yxz + 33.33); return fract((p.xxy + p.yxx) * p.zyx); }
float h12(vec2 p){ vec3 q = fract(vec3(p.xyx) * .1031); q += dot(q, q.yzx + 33.33); return fract((q.x + q.y) * q.z); }
vec2 h22(vec2 p){ vec3 q = fract(vec3(p.xyx) * vec3(.1031, .1030, .0973)); q += dot(q, q.yzx + 33.33); return fract((q.xx + q.yz) * q.zy); }
float gn(vec3 p){
  vec3 i = floor(p), f = fract(p), u = f * f * f * (f * (f * 6. - 15.) + 10.);
  #define G(o) dot(h33(i + o) * 2. - 1., f - o)
  return 1.6 * mix(mix(mix(G(vec3(0,0,0)), G(vec3(1,0,0)), u.x), mix(G(vec3(0,1,0)), G(vec3(1,1,0)), u.x), u.y),
                   mix(mix(G(vec3(0,0,1)), G(vec3(1,0,1)), u.x), mix(G(vec3(0,1,1)), G(vec3(1,1,1)), u.x), u.y), u.z);
}
// «Durchlauf» (Wunsch vom 4. November 2026: «die Animation, sagen wir 30 sekunden einfach weiterlaufen lässt, anstatt den effekt hin und
// zurück zu bewegen»): uPhi läuft in Zyklen von rund 12 s (eine ganze Zahl pro Schlaufe), das Rauschen dagegen einmal um einen grösseren
// Kreis über die ganze Schlaufe (uPsi, Radius × uL), es wiederholt sich also nicht und fliesst gleich schnell. HZ hält ein Hin-und-zurück
// auf dem vollen Wert, PD schaltet ein Pendeln ab.
float HZ(float e){ return mix(e, 1., uLauf); }
float PD(float s){ return s * (1. - uLauf); }
float ln(vec2 p, float r){ r *= uL; return gn(vec3(p.x + uSeed * 7.31, p.y + r * cos(uPsi), r * sin(uPsi) + uSeed * 3.7)); }
float lfbm(vec2 p, float r){ float s = 0., a = .5; for (int i = 0; i < 4; i++){ s += a * ln(p, r); p = p * 2.03 + vec2(1.7, 9.2); a *= .5; } return s; }
vec2 lcurl(vec2 p, float r){ float e = .02, n = ln(p, r); return vec2(ln(p + vec2(0, e), r) - n, -(ln(p + vec2(e, 0), r) - n)) / e; }
// Handwerk (5. November 2026, nach den Motion-Skills von iart.ai: «Easing ist der grösste Hebel», Licht weich abfangen, Farbe
// wahrnehmungsgleich mischen): halt() verzögert eine Phase an den Umkehrpunkten (sin(halt(uPhi, h)) hält an den Enden, h 0 = Sinus),
// ez() ist ein weicher Übergang 0 → 1, schulter() fängt Licht über .75 weich ab statt hart auf Weiss, okl()/okr() rechnen in OKLab
// und tonDreh() dreht den Farbton dort, ohne dass die Helligkeit springt
float halt(float ph, float h){ return ph + .5 * h * sin(2. * ph); }
float ez(float x){ x = clamp(x, 0., 1.); return x * x * x * (x * (x * 6. - 15.) + 10.); }
vec3 schulter(vec3 c){ vec3 k = vec3(.75); return mix(c, k + .25 * (1. - exp(-(c - k) / .25)), step(k, c)); }
vec3 okl(vec3 c){
  c = pow(max(c, 0.), vec3(2.2));
  vec3 l = pow(max(mat3(.4122214708, .2119034982, .0883024619, .5363325363, .6806995451, .2817188376, .0514459929, .1073969566, .6299787005) * c, 0.), vec3(1. / 3.));
  return mat3(.2104542553, 1.9779984951, .0259040371, .7936177850, -2.4285922050, .7827717662, -.0040720468, .4505937099, -.8086757660) * l;
}
vec3 okr(vec3 o){
  vec3 l = mat3(1., 1., 1., .3963377774, -.1055613458, -.0894841775, .2158037573, -.0638541728, -1.2914855480) * o; l = l * l * l;
  vec3 c = mat3(4.0767416621, -1.2684380046, -.0041960863, -3.3077115913, 2.6097574011, -.7034186147, .2309699292, -.3413193965, 1.7076147010) * l;
  return pow(max(c, 0.), vec3(1. / 2.2));
}
vec3 tonDreh(vec3 c, float a, float s){ vec3 o = okl(c); o.yz = rot(a) * o.yz * s; return okr(o); }
`;

const VS_FLAECHE = `#version 300 es
out vec2 vUv;
void main(){ vec2 p = vec2((gl_VertexID << 1) & 2, gl_VertexID & 2); vUv = p; gl_Position = vec4(p * 2. - 1., 0., 1.); }`;

const fsEffekt = (glsl) => `${KOPF}
in vec2 vUv; out vec4 o;
${glsl}
void main(){ o = effekt(vUv); }`;

const vsPunkte = (glsl) => `${KOPF}
out vec4 vCol;
${glsl}
void main(){ vec2 pos; vec4 c; float s; punkt(gl_VertexID, pos, c, s);
  gl_Position = vec4(pos / vec2(A() * .5, .5), 0., 1.); gl_PointSize = s; vCol = c; }`;

const FS_PUNKTE = `#version 300 es
precision highp float;
in vec4 vCol; out vec4 o;
void main(){ float d = length(gl_PointCoord - .5) * 2.; o = vCol * smoothstep(1., .7, d); }`;
// weiche Punkte (Gauss) für Linien aus vielen Punkten: ihre Summe ist glatt, wo sie sich überlappen (Lichtwürfel, 5. November 2026)
const FS_PUNKTE_WEICH = `#version 300 es
precision highp float;
in vec4 vCol; out vec4 o;
void main(){ vec2 d = (gl_PointCoord - .5) * 2.; o = vCol * max(exp(-dot(d, d) * 5.) - .0067, 0.); }`;
// glänzende Kügelchen (Strom, 5. November 2026, nach PHORMA I): Licht von links oben, ein scharfes Glanzlicht, dunkler zum Rand
const FS_PUNKTE_KUGEL = `#version 300 es
precision highp float;
in vec4 vCol; out vec4 o;
void main(){ vec2 d = (gl_PointCoord - .5) * 2.; float r2 = dot(d, d);
  if (r2 > 1.) discard;
  vec3 n = vec3(d.x, -d.y, sqrt(1. - r2)), L = normalize(vec3(-.5, .6, .65));
  float dif = .5 + .6 * max(dot(n, L), 0.), spec = pow(max(dot(reflect(-L, n), vec3(0., 0., 1.)), 0.), 36.);
  float aa = smoothstep(1., .82, sqrt(r2));
  o = vec4((vCol.rgb * dif * (.75 + .25 * n.z) + spec * .85 * vCol.a) * aa, vCol.a * aa); }`;

// Mischen: die Ebene ist vormultipliziert (Punkte lassen den Grund durch), gemischt wird mit der Farbe ohne Deckung
const FS_MISCH = `#version 300 es
precision highp float;
uniform sampler2D uA, uL; uniform int uModus; uniform float uDeck;
in vec2 vUv; out vec4 o;
void main(){
  vec3 a = texture(uA, vUv).rgb; vec4 L = texture(uL, vUv);
  vec3 l = L.a > 1e-4 ? min(L.rgb / L.a, 1.) : vec3(0.);
  vec3 m = l;
  if (uModus == 1) m = a * l;
  else if (uModus == 2) m = abs(a - l);
  else if (uModus == 3) m = 1. - (1. - a) * (1. - l);
  else if (uModus == 4) m = mix(2. * a * l, 1. - 2. * (1. - a) * (1. - l), step(.5, a));
  o = vec4(mix(a, m, clamp(uDeck * L.a, 0., 1.)), 1.);
}`;

const FS_KOPIE = `#version 300 es
precision highp float;
uniform sampler2D uA; in vec2 vUv; out vec4 o;
void main(){ o = vec4(texture(uA, vUv).rgb, 1.); }`;

// Warum es keinen Kontext gibt (Christian am 5. November 2026 auf dem Handy: «Diese Seite braucht WebGL 2 … gestern gings noch»):
// ein Browser, der WebGL 2 kennt, aber keinen Kontext gibt, hat WebGL meist nach einem Grafikabsturz für die Seite gesperrt
function ohneKontext(meldung) {
  if (typeof WebGL2RenderingContext === "undefined") return t("Dieser Browser kann kein WebGL 2.");
  let webgl1 = false;
  try { webgl1 = !!document.createElement("canvas").getContext("webgl"); } catch { /* auch nicht */ }
  const grund = meldung ? ` (${meldung})` : "";
  return webgl1
    ? t("Der Browser gibt gerade keinen WebGL-2-Kontext her{grund}. Den Browser ganz schliessen und neu öffnen hilft meistens.", { grund })
    : t("Der Browser hat WebGL gerade gesperrt oder ausgeschaltet{grund}, oft nach einem Grafikabsturz. Den Browser ganz schliessen (auch aus der Liste der offenen Apps wischen) und neu öffnen, dann geht es wieder.", { grund });
}

/** Handys und Tablets rechnen sparsam: weniger Teilchen in den schweren Punkt-Effekten, damit die Grafik nicht abstürzt */
export const SPARSAM = (() => {
  try { return matchMedia("(pointer: coarse)").matches || (navigator.deviceMemory ?? 8) <= 4; } catch { return false; }
})();
/** Laptops mit eingebauter Intel-Grafik (und Software-Grafik) rechnen ebenfalls sparsam (5. November 2026: Abstürze am Laptop) */
const SCHWACHE_GRAFIK = /Intel|SwiftShader|llvmpipe|Software|Mali|Adreno|PowerVR/i;
function grafikName(gl) {
  try { const x = gl.getExtension("WEBGL_debug_renderer_info"); return x ? String(gl.getParameter(x.UNMASKED_RENDERER_WEBGL)) : ""; } catch { return ""; }
}
/** höchstens so viele Pixel zeichnet ein Effekt in einem Zug, darüber in Streifen */
export const STREIFEN_PIXEL = 1 << 18;

export function motorErstellen({ sparsam = SPARSAM, verloren = () => {}, zurueck = () => {} } = {}) {
  const leinwand = document.createElement("canvas");
  leinwand.width = 4; leinwand.height = 5;
  let meldung = "";
  leinwand.addEventListener("webglcontextcreationerror", (e) => { meldung = e.statusMessage || ""; });
  const gl = leinwand.getContext("webgl2", { antialias: false, alpha: false, premultipliedAlpha: false, preserveDrawingBuffer: true });
  if (!gl) throw new Error(ohneKontext(meldung));

  const grafik = grafikName(gl);
  const motor = { leinwand, gl, sparsam: sparsam || SCHWACHE_GRAFIK.test(grafik), grafik, kaputt: new Map(), uebersetzt: 0 };
  const programme = new Map();
  let B = 0, H = 0, acc = [], lage = null;
  const bilder = new Map();
  function shader(typ, quelle) {
    const s = gl.createShader(typ); gl.shaderSource(s, quelle); gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s) || "Shader");
    return s;
  }
  function programm(name, vs, fs) {
    if (programme.has(name)) return programme.get(name);
    motor.uebersetzt++;   // die Seite misst Bilder, in denen übersetzt wurde, nicht als langsam
    const p = gl.createProgram();
    gl.attachShader(p, shader(gl.VERTEX_SHADER, vs)); gl.attachShader(p, shader(gl.FRAGMENT_SHADER, fs)); gl.linkProgram(p);
    if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error(`${name}: ${gl.getProgramInfoLog(p)}`);
    const orte = new Map(), ort = (u) => { if (!orte.has(u)) orte.set(u, gl.getUniformLocation(p, u)); return orte.get(u); };
    const pr = { p, ort };
    programme.set(name, pr);
    return pr;
  }
  // ein Effekt, der sich nicht übersetzen lässt, fällt aus (seine Ebene bleibt leer), statt die ganze Seite anzuhalten
  const effektProgramm = (id) => {
    if (motor.kaputt.has(id)) return null;
    const e = EFFEKTE[id];
    try {
      return e.punkte ? programm(id, vsPunkte(e.glsl), e.weich ? FS_PUNKTE_WEICH : e.kugel ? FS_PUNKTE_KUGEL : FS_PUNKTE) : programm(id, VS_FLAECHE, fsEffekt(e.glsl));
    } catch (f) {
      if (gl.isContextLost()) return null;   // kein Fehler des Effekts: der Kontext ist weg
      const text = `Effekt «${e.name}»: ${f.message}`;
      motor.kaputt.set(id, text); console.error(text);
      return null;
    }
  };

  function ziel(b, h) {
    const tex = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, b, h, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    const fb = gl.createFramebuffer();
    gl.bindFramebuffer(gl.FRAMEBUFFER, fb); gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, tex, 0);
    return { tex, fb };
  }
  function groesse(b, h) {
    if (b === B && h === H) return;
    for (const z of [...acc, lage]) if (z) { gl.deleteTexture(z.tex); gl.deleteFramebuffer(z.fb); }
    B = b; H = h; leinwand.width = b; leinwand.height = h;
    acc = [ziel(b, h), ziel(b, h)]; lage = ziel(b, h);
  }

  function hochladen(img) {
    const tex = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, gl.RGBA, gl.UNSIGNED_BYTE, img);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
    gl.generateMipmap(gl.TEXTURE_2D);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.MIRRORED_REPEAT); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.MIRRORED_REPEAT);
    return tex;
  }
  async function bildLaden(schluessel, url) {
    const img = new Image(); img.decoding = "async"; img.src = url; await img.decode();
    if (bilder.has(schluessel) && !gl.isContextLost()) gl.deleteTexture(bilder.get(schluessel).tex);   // ein neues eigenes Bild ersetzt das alte
    bilder.set(schluessel, { tex: gl.isContextLost() ? null : hochladen(img), img, b: img.naturalWidth, h: img.naturalHeight });
  }

  // Kontext verloren (Grafikabsturz, zu viele Tabs, App im Hintergrund): warten, bis der Browser ihn zurückgibt, dann alles neu aufbauen
  // und ab jetzt sparsam rechnen, damit derselbe schwere Effekt ihn nicht gleich wieder umwirft
  function aufbauen() {
    gl.bindVertexArray(gl.createVertexArray());
    programme.clear(); motor.kaputt.clear();
    B = 0; H = 0; acc = []; lage = null;
    for (const e of bilder.values()) e.tex = hochladen(e.img);
  }
  aufbauen();
  leinwand.addEventListener("webglcontextlost", (e) => { e.preventDefault(); motor.sparsam = true; verloren(); });
  leinwand.addEventListener("webglcontextrestored", () => { aufbauen(); zurueck(); });

  // In Streifen zeichnen (5. November 2026, Christian: «ich hab zurzeit viele abstürze … am laptop»): ein schwerer Effekt rechnet ein
  // grosses Bild nicht in einem einzigen Zug, sondern in Bändern von höchstens STREIFEN_PIXEL Pixeln, jedes für sich an die Grafik
  // geschickt. So bleibt jeder Auftrag kurz, und Windows setzt die Grafik nicht nach zwei Sekunden zurück (TDR), was Chrome mit einem
  // Absturz und gesperrtem WebGL quittiert. Das Bild bleibt Pixel für Pixel dasselbe.
  function streifen(b, h) {
    const n = Math.min(16, Math.ceil((b * h) / STREIFEN_PIXEL));
    if (n <= 1) { gl.drawArrays(gl.TRIANGLES, 0, 3); return; }
    gl.enable(gl.SCISSOR_TEST);
    for (let k = 0; k < n; k++) {
      const y0 = Math.floor((k * h) / n), y1 = Math.floor(((k + 1) * h) / n);
      gl.scissor(0, y0, b, y1 - y0); gl.drawArrays(gl.TRIANGLES, 0, 3); gl.flush();
    }
    gl.disable(gl.SCISSOR_TEST);
  }

  const fp = (pr, name, ...v) => gl[`uniform${v.length}f`](pr.ort(name), ...v);
  const textur = (pr, name, einheit, tex) => { gl.activeTexture(gl.TEXTURE0 + einheit); gl.bindTexture(gl.TEXTURE_2D, tex); gl.uniform1i(pr.ort(name), einheit); };
  const GRUND = { schwarz: [0, 0, 0], weiss: [1, 1, 1] };

  /** zeichnet den Stapel zur Zeit t (Sekunden) in b × h Pixel; danach liegt das Bild auf der Leinwand */
  function zeichnen(stapel, t, b, h) {
    if (gl.isContextLost()) return;
    groesse(b, h);
    const bild = bilder.get(stapel.bild);
    if (!bild?.tex) return;
    const a = b / h, ab = bild.b / bild.h;
    const fit = a > ab ? [1, ab / a] : [a / ab, 1];
    const lod = Math.max(0, Math.log2((bild.h * fit[1]) / h));
    const D = dauerVon(stapel), zyklen = Math.max(1, Math.round(D / DAUER));
    const tt = ((t % D) + D) % D / D, tz = (tt * zyklen) % 1;
    gl.viewport(0, 0, b, h);
    gl.bindFramebuffer(gl.FRAMEBUFFER, acc[0].fb);
    const g = GRUND[stapel.grund] ?? GRUND.schwarz;
    gl.clearColor(g[0], g[1], g[2], 1); gl.clear(gl.COLOR_BUFFER_BIT);
    let i = 0;
    for (const e of stapel.ebenen) {
      if (!e || e.aus || !EFFEKTE[e.effekt]) continue;
      const def = EFFEKTE[e.effekt];
      const pr = effektProgramm(e.effekt);
      if (!pr) continue;
      gl.bindFramebuffer(gl.FRAMEBUFFER, lage.fb);
      gl.clearColor(0, 0, 0, 0); gl.clear(gl.COLOR_BUFFER_BIT);
      gl.useProgram(pr.p);
      textur(pr, "uBild", 0, bild.tex); textur(pr, "uUnten", 1, acc[i].tex);
      fp(pr, "uRes", b, h); fp(pr, "uFit", fit[0], fit[1]); fp(pr, "uLod", lod);
      fp(pr, "uPhi", tz * Math.PI * 2); fp(pr, "uT", tz); fp(pr, "uPsi", tt * Math.PI * 2); fp(pr, "uL", D / DAUER); fp(pr, "uLauf", stapel.durchlauf ? 1 : 0); fp(pr, "uSeed", e.seed ?? 0); fp(pr, "uQuelle", e.quelle === "unten" ? 1 : 0); fp(pr, "uZeigen", stapel.ohneBild ? 0 : 1); fp(pr, "uSparsam", motor.sparsam ? 1 : 0);
      const w = def.regler.map((r, k) => wertVon(def, e.werte, k));
      gl.uniform1fv(pr.ort("uP[0]"), Float32Array.from({ length: 6 }, (_, k) => w[k] ?? 0));
      if (def.punkte) {
        let { cols, rows } = def.punkte(w, a, h, motor.sparsam ? DICHTE_SPARSAM : 1);
        if (motor.sparsam && cols * rows > PUNKTE_SPARSAM) rows = Math.max(1, Math.floor(PUNKTE_SPARSAM / cols));   // Obergrenze auf Handys
        fp(pr, "uCols", cols); fp(pr, "uRows", rows);
        gl.enable(gl.BLEND);
        if (def.mischung === "add") gl.blendFunc(gl.ONE, gl.ONE); else gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
        gl.drawArrays(gl.POINTS, 0, cols * rows);
        gl.disable(gl.BLEND);
      } else streifen(b, h);
      const m = programm("misch", VS_FLAECHE, FS_MISCH);
      gl.bindFramebuffer(gl.FRAMEBUFFER, acc[1 - i].fb);
      gl.useProgram(m.p);
      textur(m, "uA", 0, acc[i].tex); textur(m, "uL", 1, lage.tex);
      gl.uniform1i(m.ort("uModus"), MODI[e.modus] ?? 0); gl.uniform1f(m.ort("uDeck"), e.deckkraft ?? 1);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
      i = 1 - i;
    }
    const k = programm("kopie", VS_FLAECHE, FS_KOPIE);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.useProgram(k.p); textur(k, "uA", 0, acc[i].tex);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  }

  /** alle Effekte einmal übersetzen (Prüfung, für die Entwicklung; die Seite übersetzt jeden Effekt erst, wenn er gebraucht wird) */
  function pruefen() {
    for (const id of Object.keys(EFFEKTE)) effektProgramm(id);
    return [...motor.kaputt.values()];
  }

  return Object.assign(motor, { zeichnen, bildLaden, pruefen, hatBild: (s) => bilder.has(s) });
}

// ——— MP4: 1080 × 1350, 30 fps, eine Schlaufe; WebCodecs mit mp4-muxer (lokal in vendor/), sonst MediaRecorder in Echtzeit ———
const CODECS = ["avc1.640028", "avc1.4d0028", "avc1.42e028", "avc1.640032", "avc1.42e032"];
async function konfiguration(b, h) {
  if (typeof VideoEncoder === "undefined" || typeof VideoFrame === "undefined") return null;
  for (const codec of CODECS) {
    const cfg = { codec, width: b, height: h, bitrate: 12_000_000, framerate: FPS, avc: { format: "avc" }, latencyMode: "quality" };
    try { if ((await VideoEncoder.isConfigSupported(cfg)).supported) return cfg; } catch { /* nächster */ }
  }
  return null;
}

export async function videoErstellen(motor, stapel, { breite = 1080, hoehe = 1350, fortschritt = () => {}, abbruch = () => false } = {}) {
  const n = dauerVon(stapel) * FPS;
  const cfg = await konfiguration(breite, hoehe);
  if (cfg) {
    const { Muxer, ArrayBufferTarget } = await import("../vendor/mp4-muxer-5.2.2/mp4-muxer.js");
    const muxer = new Muxer({ target: new ArrayBufferTarget(), fastStart: "in-memory", firstTimestampBehavior: "offset",
      video: { codec: "avc", width: breite, height: hoehe, frameRate: FPS } });
    let fehler = null;
    const enc = new VideoEncoder({ output: (chunk, meta) => { try { muxer.addVideoChunk(chunk, meta); } catch (e) { fehler ??= e; } }, error: (e) => { fehler ??= e; } });
    enc.configure(cfg);
    for (let i = 0; i < n; i++) {
      if (fehler) throw fehler;
      if (abbruch()) { enc.close(); return null; }
      motor.zeichnen(stapel, i / FPS, breite, hoehe);
      const frame = new VideoFrame(motor.leinwand, { timestamp: Math.round((i * 1e6) / FPS), duration: Math.round(1e6 / FPS) });
      enc.encode(frame, { keyFrame: i % (FPS * 2) === 0 }); frame.close();
      while (enc.encodeQueueSize > 4) await new Promise((ok) => setTimeout(ok, 4));
      if (i % 3 === 0) { fortschritt(i / n); await new Promise((ok) => setTimeout(ok, 0)); }
    }
    await enc.flush(); enc.close();
    if (fehler) throw fehler;
    muxer.finalize();
    return { blob: new Blob([muxer.target.buffer], { type: "video/mp4" }), endung: "mp4" };
  }
  const typen = [["video/mp4;codecs=avc1.42E01E", "mp4"], ["video/mp4", "mp4"], ["video/webm;codecs=vp9", "webm"], ["video/webm", "webm"]];
  const typ = typeof MediaRecorder !== "undefined" && typen.find(([m]) => MediaRecorder.isTypeSupported(m));
  if (!typ) throw new Error(t("Dieser Browser kann keine Videos erzeugen."));
  const c = document.createElement("canvas"); c.width = breite; c.height = hoehe;
  const ctx = c.getContext("2d", { alpha: false });
  const strom = c.captureStream(FPS);
  const rec = new MediaRecorder(strom, { mimeType: typ[0], videoBitsPerSecond: 12_000_000 });
  const teile = []; rec.ondataavailable = (e) => { if (e.data.size) teile.push(e.data); };
  const fertig = new Promise((ok) => { rec.onstop = ok; });
  rec.start();
  const t0 = performance.now();
  await new Promise((ok) => {
    const schritt = () => {
      const t = (performance.now() - t0) / 1000;
      if (t >= dauerVon(stapel) || abbruch()) { ok(); return; }
      motor.zeichnen(stapel, t, breite, hoehe); ctx.drawImage(motor.leinwand, 0, 0);
      fortschritt(t / dauerVon(stapel)); requestAnimationFrame(schritt);
    };
    schritt();
  });
  rec.stop(); await fertig;
  if (abbruch()) return null;
  return { blob: new Blob(teile, { type: typ[0].split(";")[0] }), endung: typ[1] };
}
