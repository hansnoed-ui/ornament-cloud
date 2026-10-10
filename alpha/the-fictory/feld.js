// «The Fictory» – das wuchernde Feld (Reaktions-Diffusion aus operationen.js) als leuchtende Fläche mit Isolinien, gezeichnet mit einem
// WebGL-Shader. Das Bild hängt nur am Zustand (Feldwerte) und an der Leitfarbe, darum sieht ein Schlüsselzustand in jeder Auflösung gleich aus.
// Ohne WebGL zeichnet ein einfacher Ersatz das Feld als weich vergrösserte Farbfläche.

const ECKEN = `
attribute vec2 p;
varying vec2 uv;
void main() { uv = vec2(p.x * 0.5 + 0.5, 0.5 - p.y * 0.5); gl_Position = vec4(p, 0.0, 1.0); }`;

const FARBE = `
precision highp float;
uniform sampler2D feld;
uniform vec2 texel;
uniform vec3 leit;
uniform float alpha;
varying vec2 uv;
float wert(vec2 q) {
  // weich: vier versetzte Abtastungen zusätzlich zur Mitte
  float v = texture2D(feld, q).r * 0.4;
  v += texture2D(feld, q + vec2(texel.x, 0.0) * 0.6).r * 0.15;
  v += texture2D(feld, q - vec2(texel.x, 0.0) * 0.6).r * 0.15;
  v += texture2D(feld, q + vec2(0.0, texel.y) * 0.6).r * 0.15;
  v += texture2D(feld, q - vec2(0.0, texel.y) * 0.6).r * 0.15;
  return v;
}
void main() {
  float v = wert(uv);
  float koerper = smoothstep(0.12, 0.32, v);
  float rand = 1.0 - smoothstep(0.0, 0.025, abs(v - 0.2));                 // Kontur der wuchernden Form
  float iso = smoothstep(0.42, 0.5, abs(fract(v * 9.0) - 0.5));          // feine Höhenlinien im Innern
  // wenig Fläche, viel Linie: der Körper bleibt ein Hauch, Kontur und Höhenlinien tragen
  vec3 c = leit * 0.13 * koerper;
  c += mix(leit, vec3(1.0), 0.5) * rand * 0.95;
  c += leit * iso * koerper * 0.45;
  c += vec3(1.0) * pow(v, 4.0) * 0.12;
  gl_FragColor = vec4(c * alpha, 1.0);
}`;

let gl = null, glCanvas = null, programm = null, tex = null, versucht = false;

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
    tex = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, tex);
    for (const [k, v] of [[gl.TEXTURE_MIN_FILTER, gl.LINEAR], [gl.TEXTURE_MAG_FILTER, gl.LINEAR], [gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE], [gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE]]) gl.texParameteri(gl.TEXTURE_2D, k, v);
    gl.pixelStorei(gl.UNPACK_ALIGNMENT, 1);
    return true;
  } catch { gl = null; return false; }
}

/** Ist WebGL für das Feld verfügbar? (für die Angaben auf der Seite) */
export const feldMitShader = () => bereit();

/** zeichnet das Feld (z.feldB, Raster M.fw × M.fh) additiv («screen») in ctx */
export function zeichneFeld(ctx, W, H, z, M, leit, staerke) {
  if (staerke <= 0.001) return;
  const { fw, fh } = M, bytes = new Uint8Array(fw * fh);
  for (let i = 0; i < bytes.length; i++) bytes[i] = Math.max(0, Math.min(255, Math.round(z.feldB[i] * 255)));
  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.globalCompositeOperation = "screen";
  ctx.globalAlpha = 1;
  if (bereit()) {
    if (glCanvas.width !== W || glCanvas.height !== H) { glCanvas.width = W; glCanvas.height = H; }
    gl.viewport(0, 0, W, H);
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.LUMINANCE, fw, fh, 0, gl.LUMINANCE, gl.UNSIGNED_BYTE, bytes);
    gl.uniform2f(gl.getUniformLocation(programm, "texel"), 1 / fw, 1 / fh);
    gl.uniform3f(gl.getUniformLocation(programm, "leit"), leit[0] / 255, leit[1] / 255, leit[2] / 255);
    gl.uniform1f(gl.getUniformLocation(programm, "alpha"), staerke);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    ctx.drawImage(glCanvas, 0, 0, W, H);
  } else {
    const c = document.createElement("canvas"); c.width = fw; c.height = fh;
    const bild = new ImageData(fw, fh);
    for (let i = 0; i < bytes.length; i++) { const v = bytes[i] / 255 * staerke; bild.data.set([leit[0] * v, leit[1] * v, leit[2] * v, 255], i * 4); }
    c.getContext("2d").putImageData(bild, 0, 0);
    ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = "high";
    ctx.drawImage(c, 0, 0, W, H);
  }
  ctx.restore();
}
