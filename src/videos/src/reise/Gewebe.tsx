// «Gewebe» (29. Oktober 2026): das Netz der Reise als Gewebe aus Seidenfasern, gezeichnet mit WebGL 2 (ohne Bibliothek).
// Wunsch: «ein viel organischeres netzwerk … mehr ein gewebe, nicht einfach pünktchen … differenzierter als beim PHORMA III effekte».
// Jede Verbindung ist ein Band aus feinen, halb durchsichtigen Fasern (mehr Fasern, wo viel zusammenkommt). Das Band ist an den Enden zusammengezogen,
// so entstehen an den Knoten Knoten im Wortsinn statt Punkte; in der Mitte öffnet es sich, verdreht sich (jede Faser mit eigener Drehung) und flattert leise.
// Die Farbe läuft entlang der Faser von einem Ende zum anderen (Strophe weiss → Werk Senf → Name Blau, ORNA Rosa, Zyklus Grün); die Fasern addieren sich
// zum Licht. An der Station spannt sich das Band (schmaler, heller); neuronale Impulse laufen als Licht durch die Fasern.
// Die Projektion ist dieselbe wie in Video.tsx (projiziere), damit die Beschriftung im SVG darüber genau sitzt. Alles hängt nur vom Bild f ab.
import React from "react";
import daten from "./data/reise.json";

const K = daten.knoten, KA = daten.kanten;
const hex = (h: string) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16) / 255);
const FARBE = { strophe: "#a8a8a8",   // Strophen im Gewebe gedämpft (Rückmeldung: «die weissen leuchtfäden dürften etwas dunkler sein»)
   werk: "#e6b117", name: "#8fb0ff", orna: "#ffa3d1", zyklus: "#4fa37c" };
const farbeVon = (k: (typeof K)[number]) => hex(k.art === "name" ? (k.orna && !k.zsz ? FARBE.orna : FARBE.name) : FARBE[k.art as "strophe" | "werk" | "zyklus"]);

// ---------- die Fasern (einmal gebaut) ----------
const S = 22;   // Abschnitte je Faser
const FASERN = (() => {
  let saat = 4242;
  const z = () => { saat = (Math.imul(saat, 1664525) + 1013904223) >>> 0; return saat / 4294967296; };
  const ends: number[] = [], t: number[] = [], faser: number[] = [], kante: number[] = [], fa: number[] = [], fb: number[] = [];
  KA.forEach(([a, b, art], n) => {
    const zahl = [6, 9, 9, 4][art] + Math.min(7, Math.floor((K[a].grad + K[b].grad) / 10));
    const ca = farbeVon(K[a]), cb = farbeVon(K[b]);
    for (let q = 0; q < zahl; q++) {
      const u = zahl === 1 ? 0 : (q / (zahl - 1)) * 2 - 1 + (z() - 0.5) * 0.25, ph = z() * Math.PI * 2, sd = z();
      for (let s = 0; s < S; s++) for (const tt of [s / S, (s + 1) / S]) {
        ends.push(a, b); t.push(tt); faser.push(u, ph, sd); kante.push(n, art); fa.push(...ca); fb.push(...cb);
      }
    }
  });
  return { ends: new Float32Array(ends), t: new Float32Array(t), faser: new Float32Array(faser), kante: new Float32Array(kante), fa: new Float32Array(fa), fb: new Float32Array(fb), n: t.length };
})();

const VS = `#version 300 es
precision highp float;
in vec2 aEnds; in float aT; in vec3 aFaser; in vec2 aKante; in vec3 aFa; in vec3 aFb;
uniform sampler2D uPos, uKante;
uniform vec4 uKam1;   // Ziel xyz, Abstand
uniform vec4 uKam2;   // Gier, Neigung, Brennweite, Bild f
uniform vec4 uBild;   // Breite, Höhe, cx, cy
out vec4 vFarbe;
vec3 knoten(float i) { return texelFetch(uPos, ivec2(int(i), 0), 0).xyz; }
void main() {
  vec4 k = texelFetch(uKante, ivec2(int(aKante.x), 0), 0);   // Wachstum, hell, Grund, Ende
  float t = aT;
  if (t > k.x + 0.001 || k.z + k.y <= 0.0) { gl_Position = vec4(3.0, 3.0, 3.0, 1.0); vFarbe = vec4(0.0); return; }
  float f = uKam2.w, n = aKante.x, u = aFaser.x, ph = aFaser.y, sd = aFaser.z;
  vec3 A = knoten(aEnds.x), B = knoten(aEnds.y), d = B - A;
  float L = length(d) + 1e-3; vec3 dir = d / L;
  vec3 n1 = normalize(cross(dir, abs(dir.y) < 0.9 ? vec3(0.0, 1.0, 0.0) : vec3(1.0, 0.0, 0.0))), n2 = cross(dir, n1);
  // das ganze Band biegt sich langsam (wie biege in Video.tsx), die Fasern öffnen sich in der Mitte, verdrehen sich und flattern
  float bog = L * 0.16 * sin(n * 1.7 + f / 70.0) * (0.6 + 0.4 * sin(n * 0.37));
  float band = pow(sin(3.14159 * t), 0.8) * min(L * 0.1, 30.0) * (1.0 - 0.6 * k.y);
  float tw = ph + t * (2.2 + sd * 2.6) + f * 0.011 * (sd - 0.5);
  vec3 off = n1 * (cos(tw) * u * band + 4.0 * bog * t * (1.0 - t)) + n2 * (sin(tw) * u * band);
  off += (n1 * sin(t * 9.0 + f * 0.031 + sd * 20.0) + n2 * cos(t * 7.0 + f * 0.023 + sd * 13.0)) * band * 0.14;
  vec3 p = mix(A, B, t) + off;
  // Kamera wie projiziere()
  vec3 q = p - uKam1.xyz; float c = cos(uKam2.x), s = sin(uKam2.x);
  float x1 = q.x * c + q.z * s, z1 = -q.x * s + q.z * c, cn = cos(uKam2.y), sn = sin(uKam2.y);
  float y2 = q.y * cn - z1 * sn, z2 = q.y * sn + z1 * cn;
  float tiefe = max(40.0, uKam1.w + z2), m = uKam2.z / tiefe;
  gl_Position = vec4((uBild.z + x1 * m) / uBild.x * 2.0 - 1.0, 1.0 - (uBild.w + y2 * m) / uBild.y * 2.0, 0.0, 1.0);
  float nebel = clamp(1.0 - (tiefe - uKam1.w * 0.35) / (uKam1.w * 1.55) * 0.75, 0.25, 1.0);
  // neuronal: jede dritte Kante feuert in ihrem eigenen Takt, ein Lichtfleck läuft durch die Fasern
  float per = 300.0 + mod(n * 97.0, 520.0), pu = mod(f + n * 53.0, per) / 40.0, imp = 0.0;
  if (mod(n, 3.0) < 0.5 && pu < 1.0) { float w = mod(n, 2.0) > 0.5 ? pu : 1.0 - pu; imp = exp(-pow((t - w) * 11.0, 2.0)) * sin(pu * 3.14159); }
  vec3 farbe = mix(aFa, aFb, smoothstep(0.15, 0.85, t));
  float spitze = 0.15 + 0.85 * sd * sd;                 // Fasern sehr unterschiedlich kräftig (wenige hell, viele zart)
  float a = (k.z * nebel * spitze + k.y * (0.5 + 0.4 * spitze)) * (0.75 + 0.25 * m) + imp * (0.5 + k.w);
  vFarbe = vec4(farbe * (1.0 + 2.2 * imp) + vec3(k.y * 0.08), a);
}`;
const FS = `#version 300 es
precision highp float;
in vec4 vFarbe; out vec4 o;
void main() { o = vec4(vFarbe.rgb * vFarbe.a, vFarbe.a); }`;

type GL = { gl: WebGL2RenderingContext; prog: WebGLProgram; pos: WebGLTexture; kan: WebGLTexture; u: Record<string, WebGLUniformLocation | null> };
function baue(canvas: HTMLCanvasElement): GL {
  const gl = canvas.getContext("webgl2", { preserveDrawingBuffer: true, antialias: true, premultipliedAlpha: true })!;
  const sh = (typ: number, src: string) => { const s = gl.createShader(typ)!; gl.shaderSource(s, src); gl.compileShader(s); if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s) ?? "Shader"); return s; };
  const prog = gl.createProgram()!;
  gl.attachShader(prog, sh(gl.VERTEX_SHADER, VS)); gl.attachShader(prog, sh(gl.FRAGMENT_SHADER, FS)); gl.linkProgram(prog);
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(prog) ?? "Programm");
  gl.useProgram(prog);
  const vao = gl.createVertexArray(); gl.bindVertexArray(vao);
  const attr = (name: string, data: Float32Array, n: number) => {
    const b = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, b); gl.bufferData(gl.ARRAY_BUFFER, data, gl.STATIC_DRAW);
    const loc = gl.getAttribLocation(prog, name); gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc, n, gl.FLOAT, false, 0, 0);
  };
  attr("aEnds", FASERN.ends, 2); attr("aT", FASERN.t, 1); attr("aFaser", FASERN.faser, 3); attr("aKante", FASERN.kante, 2); attr("aFa", FASERN.fa, 3); attr("aFb", FASERN.fb, 3);
  const tex = (unit: number) => { const t = gl.createTexture()!; gl.activeTexture(gl.TEXTURE0 + unit); gl.bindTexture(gl.TEXTURE_2D, t);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST); return t; };
  const pos = tex(0), kan = tex(1);
  const u = Object.fromEntries(["uPos", "uKante", "uKam1", "uKam2", "uBild"].map((n) => [n, gl.getUniformLocation(prog, n)]));
  gl.uniform1i(u.uPos, 0); gl.uniform1i(u.uKante, 1);
  gl.enable(gl.BLEND); gl.blendFunc(gl.ONE, gl.ONE);
  return { gl, prog, pos, kan, u };
}

export type Zustand = {
  f: number; w: number; h: number; cx: number; cy: number;
  kamera: { ziel: [number, number, number]; abstand: number; gier: number; neigung: number; brenn: number };
  orte: Float32Array;    // 4 je Knoten: x, y, z, 0
  kanten: Float32Array;  // 4 je Kante: Wachstum 0–1, hell 0–1, Grund (Deckkraft), Ende
};

export const GewebeLeinwand: React.FC<{ z: Zustand }> = ({ z }) => {
  const ref = React.useRef<HTMLCanvasElement>(null), gl = React.useRef<GL | null>(null);
  React.useLayoutEffect(() => {
    if (!ref.current) return;
    if (!gl.current) gl.current = baue(ref.current);
    const { gl: g, pos, kan, u } = gl.current;
    g.viewport(0, 0, z.w, z.h); g.clearColor(0, 0, 0, 0); g.clear(g.COLOR_BUFFER_BIT);
    g.activeTexture(g.TEXTURE0); g.bindTexture(g.TEXTURE_2D, pos); g.texImage2D(g.TEXTURE_2D, 0, g.RGBA32F, K.length, 1, 0, g.RGBA, g.FLOAT, z.orte);
    g.activeTexture(g.TEXTURE1); g.bindTexture(g.TEXTURE_2D, kan); g.texImage2D(g.TEXTURE_2D, 0, g.RGBA32F, KA.length, 1, 0, g.RGBA, g.FLOAT, z.kanten);
    g.uniform4f(u.uKam1, z.kamera.ziel[0], z.kamera.ziel[1], z.kamera.ziel[2], z.kamera.abstand);
    g.uniform4f(u.uKam2, z.kamera.gier, z.kamera.neigung, z.kamera.brenn, z.f);
    g.uniform4f(u.uBild, z.w, z.h, z.cx, z.cy);
    g.drawArrays(g.LINES, 0, FASERN.n);
    g.flush();
  });
  return <canvas ref={ref} width={z.w} height={z.h} style={{ position: "absolute", inset: 0, width: z.w, height: z.h }} />;
};
