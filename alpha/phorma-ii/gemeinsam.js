// PHORMA II – gemeinsame Bausteine der Bühne und der Effekte (Kamera wie in den Rezepten des Skills threejs-spektakel: die Fotofläche, Höhe 2,
// bei z = 0 füllt das Bild genau; Zeitkurven; Texturen aus den Karten der Analyse).
import * as THREE from "three";

export const FOV = 35;
export const ABSTAND = 1 / Math.tan(THREE.MathUtils.degToRad(FOV / 2));
export const QUAD_VERTEX = /* glsl */ `varying vec2 vUv; void main() { vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }`;
export const KUPFER = new THREE.Color(1.0, 0.42, 0.2);
export const anteil = (t, a, b) => Math.min(1, Math.max(0, (t - a) / (b - a)));
export const weich = (x) => x * x * (3 - 2 * x);
export const inOut = (x) => (x < 0.5 ? 4 * x * x * x : 1 - (-2 * x + 2) ** 3 / 2);
export const glocke = (t, a, b) => Math.sin(Math.PI * anteil(t, a, b));

/** Karte (Zeile 0 oben) als Textur mit v = 0 unten wie das Foto; HalfFloat, weil viele Telefone Float32-Texturen nicht glätten können
 *  (OES_texture_float_linear fehlt, dann liefern sie Schwarz) */
export function datenTextur(q, w, h, kanaele = 1) {
  const d = new Uint16Array(w * h * kanaele);
  for (let y = 0; y < h; y++) { const o = (h - 1 - y) * w * kanaele, z = y * w * kanaele; for (let i = 0; i < w * kanaele; i++) d[z + i] = THREE.DataUtils.toHalfFloat(q[o + i]); }
  const t = new THREE.DataTexture(d, w, h, kanaele === 1 ? THREE.RedFormat : THREE.RGBAFormat, THREE.HalfFloatType);
  t.minFilter = t.magFilter = THREE.LinearFilter; t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping; t.needsUpdate = true;
  return t;
}
export const ziel = (w, h, opt = {}) => new THREE.WebGLRenderTarget(w, h, { type: THREE.HalfFloatType, depthBuffer: false, ...opt });
export function kamera(B, H) { const k = new THREE.PerspectiveCamera(FOV, B / H, 0.05, 60); k.position.set(0, 0, ABSTAND); return k; }
export const quadMaterial = (fragmentShader, uniforms, extra = {}) => new THREE.ShaderMaterial({ vertexShader: QUAD_VERTEX, fragmentShader, uniforms, depthTest: false, depthWrite: false, ...extra });

