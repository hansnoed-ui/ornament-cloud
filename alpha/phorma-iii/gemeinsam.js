// PHORMA III – gemeinsame Bausteine der Bühne und des Gewebes (Kamera wie in den Rezepten des Skills threejs-spektakel: die Fotofläche, Höhe 2,
// bei z = 0 füllt das Bild genau; Zeitkurven; Ziele und Flächenprogramme).
import * as THREE from "three";

export const FOV = 35;
export const ABSTAND = 1 / Math.tan(THREE.MathUtils.degToRad(FOV / 2));
export const QUAD_VERTEX = /* glsl */ `varying vec2 vUv; void main() { vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }`;
export const anteil = (t, a, b) => Math.min(1, Math.max(0, (t - a) / (b - a)));
export const weich = (x) => x * x * (3 - 2 * x);
export const inOut = (x) => (x < 0.5 ? 4 * x * x * x : 1 - (-2 * x + 2) ** 3 / 2);

export const ziel = (w, h, opt = {}) => new THREE.WebGLRenderTarget(w, h, { type: THREE.HalfFloatType, depthBuffer: false, ...opt });
export function kamera(B, H) { const k = new THREE.PerspectiveCamera(FOV, B / H, 0.05, 60); k.position.set(0, 0, ABSTAND); return k; }
export const quadMaterial = (fragmentShader, uniforms, extra = {}) => new THREE.ShaderMaterial({ vertexShader: QUAD_VERTEX, fragmentShader, uniforms, depthTest: false, depthWrite: false, ...extra });

