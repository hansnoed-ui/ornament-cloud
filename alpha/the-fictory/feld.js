// «The Fictory» – der Grund: Tinte und Strömung (aus den bewegten Teilen, operationen.js) als Schlieren mit versetzten Farbkanälen und hellen
// Kanten, darüber das wuchernde Feld als feine Kontur; gezeichnet mit einem WebGL-Shader. Das Bild hängt nur am Zustand (Feldwerte) und an der Leitfarbe, darum sieht ein Schlüsselzustand in jeder Auflösung gleich aus.
// Ohne WebGL zeichnet ein einfacher Ersatz das Feld als weich vergrösserte Farbfläche.

const ECKEN = `
attribute vec2 p;
varying vec2 uv;
void main() { uv = vec2(p.x * 0.5 + 0.5, 0.5 - p.y * 0.5); gl_Position = vec4(p, 0.0, 1.0); }`;

const FARBE = `
precision highp float;
uniform sampler2D feld;      // wucherndes Feld (Gray-Scott, Kanal B)
uniform sampler2D tinte;     // Tinte der Strömung (RGB, Farben der Teile)
uniform sampler2D strom;     // Strömung (u, v; 0,5 = Stillstand)
uniform vec2 texel;
uniform vec3 leit;
uniform float alpha;
varying vec2 uv;
const float VMAX = 3.2;      // Zellen je Schritt bei vollem Ausschlag (wie STROM_SKALA in zeichneFeld)
float wert(vec2 q) {
  float v = texture2D(feld, q).r * 0.4;
  v += texture2D(feld, q + vec2(texel.x, 0.0) * 0.6).r * 0.15;
  v += texture2D(feld, q - vec2(texel.x, 0.0) * 0.6).r * 0.15;
  v += texture2D(feld, q + vec2(0.0, texel.y) * 0.6).r * 0.15;
  v += texture2D(feld, q - vec2(0.0, texel.y) * 0.6).r * 0.15;
  return v;
}
vec2 stromAn(vec2 q) { return (texture2D(strom, q).ra - 0.5) * 2.0 * VMAX * texel; }
float hell(vec3 c) { return dot(c, vec3(0.299, 0.587, 0.114)); }
void main() {
  vec2 v = stromAn(uv);
  // Schlieren: die Tinte entlang der Strömung zurück abgetastet (Bewegungsunschärfe, wie Feedback mit Verschiebung)
  vec3 t = vec3(0.0); float summe = 0.0;
  for (int i = 0; i < 8; i++) {
    float f = float(i) / 7.0, g = 1.0 - 0.75 * f;
    t += texture2D(tinte, uv - v * f * 9.0).rgb * g; summe += g;
  }
  t /= summe;
  // die Farbkanäle längs der Strömung leicht versetzt
  float rr = texture2D(tinte, uv - v * 3.0).r, bb = texture2D(tinte, uv + v * 3.0).b;
  t = vec3(mix(t.r, rr, 0.6), t.g, mix(t.b, bb, 0.6));
  // Farbton aus der Tinte, Helligkeit aus ihrer Dichte: auch dunkle Teile hinterlassen leuchtende Fahnen in ihrer Farbe
  float dichte = max(t.r, max(t.g, t.b));
  vec3 ton = t / max(dichte, 0.004);
  ton = mix(vec3(hell(ton)), ton, 1.35);                                   // etwas mehr Sättigung
  t = clamp(ton, 0.0, 1.0) * smoothstep(0.015, 0.55, dichte);
  // helle Kanten, wo die Tinte endet
  float dx = hell(texture2D(tinte, uv + vec2(texel.x, 0.0)).rgb) - hell(texture2D(tinte, uv - vec2(texel.x, 0.0)).rgb);
  float dy = hell(texture2D(tinte, uv + vec2(0.0, texel.y)).rgb) - hell(texture2D(tinte, uv - vec2(0.0, texel.y)).rgb);
  float kante = smoothstep(0.02, 0.12, length(vec2(dx, dy)));
  // Höhenlinien der Tintendichte: feine Bänder, die mit der Strömung wandern (statt Nebel)
  float baender = smoothstep(0.82, 1.0, 1.0 - abs(fract(dichte * 9.0) - 0.5) * 2.0) * smoothstep(0.03, 0.12, dichte);
  vec3 c = (t * 0.16 + mix(t, vec3(1.0), 0.15) * baender * 0.55 + mix(t, vec3(1.0), 0.5) * kante * 0.24);
  // das wuchernde Feld nur noch als feine Kontur
  float w = wert(uv);
  float rand = 1.0 - smoothstep(0.0, 0.025, abs(w - 0.2));
  c += mix(leit, vec3(1.0), 0.35) * rand * 0.16;
  gl_FragColor = vec4(c * alpha, 1.0);
}`;

let gl = null, glCanvas = null, programm = null, tex = null, texTinte = null, texStrom = null, versucht = false, puffer = null, pufferTinte = null, pufferStrom = null;
const STROM_SKALA = 127 / 3.2;      // Zellen je Schritt → Byte um 128 (VMAX im Shader)

function bereit() {
  if (versucht) return Boolean(gl);
  versucht = true;
  try {
    glCanvas = document.createElement("canvas");
    gl = glCanvas.getContext("webgl", { preserveDrawingBuffer: true, premultipliedAlpha: false, antialias: false });
    if (!gl) return false;
    const sh = (typ, text) => { const s = gl.createShader(typ); gl.shaderSource(s, text); gl.compileShader(s); if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s)); return s; };
    programm = gl.createProgram();
    gl.attachShader(programm, sh(gl.VERTEX_SHADER, ECKEN));
    gl.attachShader(programm, sh(gl.FRAGMENT_SHADER, FARBE));
    gl.linkProgram(programm);
    if (!gl.getProgramParameter(programm, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(programm));
    gl.useProgram(programm);
    const puffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, puffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
    const ort = gl.getAttribLocation(programm, "p");
    gl.enableVertexAttribArray(ort);
    gl.vertexAttribPointer(ort, 2, gl.FLOAT, false, 0, 0);
    const textur = (einheit, name) => {
      const t = gl.createTexture();
      gl.activeTexture(gl.TEXTURE0 + einheit); gl.bindTexture(gl.TEXTURE_2D, t);
      for (const [k, v] of [[gl.TEXTURE_MIN_FILTER, gl.LINEAR], [gl.TEXTURE_MAG_FILTER, gl.LINEAR], [gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE], [gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE]]) gl.texParameteri(gl.TEXTURE_2D, k, v);
      gl.uniform1i(gl.getUniformLocation(programm, name), einheit);
      return t;
    };
    tex = textur(0, "feld"); texTinte = textur(1, "tinte"); texStrom = textur(2, "strom");
    gl.pixelStorei(gl.UNPACK_ALIGNMENT, 1);
    return true;
  } catch { gl = null; return false; }
}

/** Ist WebGL für das Feld verfügbar? (für die Angaben auf der Seite) */
export const feldMitShader = () => bereit();

/** zeichnet das Feld (z.feldB, Raster M.fw × M.fh) additiv («screen») in ctx */
export function zeichneFeld(ctx, W, H, z, M, leit, staerke, vorschau = false) {
  if (staerke <= 0.001) return;
  const { fw, fh } = M;
  if (!puffer || puffer.length !== fw * fh) puffer = new Uint8Array(fw * fh);       // wiederverwendet: kein neuer Speicher je Bild
  const bytes = puffer;
  for (let i = 0; i < bytes.length; i++) bytes[i] = Math.max(0, Math.min(255, Math.round(z.feldB[i] * 255)));
  if (!pufferTinte || pufferTinte.length !== fw * fh * 3) { pufferTinte = new Uint8Array(fw * fh * 3); pufferStrom = new Uint8Array(fw * fh * 2); }
  for (let i = 0; i < pufferTinte.length; i++) pufferTinte[i] = Math.max(0, Math.min(255, Math.round(z.tinte[i] * 400)));
  for (let i = 0; i < fw * fh; i++) {
    pufferStrom[i * 2] = Math.max(0, Math.min(255, Math.round(128 + z.stromU[i] * STROM_SKALA)));
    pufferStrom[i * 2 + 1] = Math.max(0, Math.min(255, Math.round(128 + z.stromV[i] * STROM_SKALA)));
  }
  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.globalCompositeOperation = "screen";
  ctx.globalAlpha = 1;
  if (bereit()) {
    // das Feld ist weich: der Shader rechnet in halber Auflösung, das Ergebnis wird hochskaliert
    const w = Math.max(2, Math.round(W / 2)), h = Math.max(2, Math.round(H / 2));
    if (glCanvas.width !== w || glCanvas.height !== h) { glCanvas.width = w; glCanvas.height = h; }
    gl.viewport(0, 0, w, h);
    gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.LUMINANCE, fw, fh, 0, gl.LUMINANCE, gl.UNSIGNED_BYTE, bytes);
    gl.activeTexture(gl.TEXTURE1); gl.bindTexture(gl.TEXTURE_2D, texTinte);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, fw, fh, 0, gl.RGB, gl.UNSIGNED_BYTE, pufferTinte);
    gl.activeTexture(gl.TEXTURE2); gl.bindTexture(gl.TEXTURE_2D, texStrom);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.LUMINANCE_ALPHA, fw, fh, 0, gl.LUMINANCE_ALPHA, gl.UNSIGNED_BYTE, pufferStrom);
    gl.uniform2f(gl.getUniformLocation(programm, "texel"), 1 / fw, 1 / fh);
    gl.uniform3f(gl.getUniformLocation(programm, "leit"), leit[0] / 255, leit[1] / 255, leit[2] / 255);
    gl.uniform1f(gl.getUniformLocation(programm, "alpha"), staerke);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = vorschau ? "low" : "high";
    ctx.drawImage(glCanvas, 0, 0, W, H);
  } else {
    const c = document.createElement("canvas"); c.width = fw; c.height = fh;
    const bild = new ImageData(fw, fh);
    // ohne WebGL: die Tinte als weich vergrösserte Farbfläche, das Feld schwach darüber
    for (let i = 0; i < bytes.length; i++) { const v = bytes[i] / 255 * 0.2; bild.data.set([(pufferTinte[i * 3] * 0.5 + leit[0] * v) * staerke, (pufferTinte[i * 3 + 1] * 0.5 + leit[1] * v) * staerke, (pufferTinte[i * 3 + 2] * 0.5 + leit[2] * v) * staerke, 255], i * 4); }
    c.getContext("2d").putImageData(bild, 0, 0);
    ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = "high";
    ctx.drawImage(c, 0, 0, W, H);
  }
  ctx.restore();
}
