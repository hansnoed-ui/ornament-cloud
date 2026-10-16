// Rezept 3 – Splitter: das Foto als ~400 Voronoi-Scherben mit Dicke, alle in EINER Geometrie (ein Draw-Call). Jede Ecke kennt die Mitte
// ihrer Scherbe, eine Zufallsachse und ihren Zufallswert; Flug, Drehung und Licht rechnet der Vertex-Shader aus der Zeit → zustandslos.
// Flach (Flug = 0) zeigt die Vorderseite das Foto unverändert; im Flug glühen die Schnittkanten.
import * as THREE from "three";
import { starte, filmlook, anteil, inOut, TEST } from "./gemeinsam.js";

const DAUER = 11;
const FOV = 35;

/** Polygon (Liste [x, y], gegen den Uhrzeiger) an der Halbebene (p − m) · n ≤ 0 abschneiden (Sutherland–Hodgman) */
function schneiden(poly, mx, my, nx, ny) {
  const aus = [], s = (p) => (p[0] - mx) * nx + (p[1] - my) * ny;
  for (let i = 0; i < poly.length; i++) {
    const a = poly[i], b = poly[(i + 1) % poly.length], sa = s(a), sb = s(b);
    if (sa <= 0) aus.push(a);
    if ((sa <= 0) !== (sb <= 0)) { const k = sa / (sa - sb); aus.push([a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k]); }
  }
  return aus;
}

/** Voronoi-Zellen aus einem verwackelten Raster (gx × gy) im Rechteck ±bw/2 × ±1 */
function voronoi(bw, gx, gy, zufall) {
  const orte = [];
  for (let j = 0; j < gy; j++) for (let i = 0; i < gx; i++)
    orte.push([(-0.5 + (i + 0.5 + (zufall() - 0.5) * 0.85) / gx) * bw, -1 + ((j + 0.5 + (zufall() - 0.5) * 0.85) / gy) * 2]);
  const zellen = [];
  for (let j = 0; j < gy; j++) for (let i = 0; i < gx; i++) {
    const [sx, sy] = orte[j * gx + i];
    let poly = [[-bw / 2, -1], [bw / 2, -1], [bw / 2, 1], [-bw / 2, 1]];
    for (let jj = Math.max(0, j - 2); jj <= Math.min(gy - 1, j + 2); jj++) for (let ii = Math.max(0, i - 2); ii <= Math.min(gx - 1, i + 2); ii++) {
      if (ii === i && jj === j) continue;
      const [ox, oy] = orte[jj * gx + ii];
      poly = schneiden(poly, (sx + ox) / 2, (sy + oy) / 2, ox - sx, oy - sy);
    }
    if (poly.length >= 3) zellen.push(poly);
  }
  return zellen;
}

function scherben(zellen, bw, dicke, zufall) {
  const P = [], N = [], M = [], Z = [], U = [], S = [];
  const ecke = (x, y, z, n, mitte, zz, seite) => { P.push(x, y, z); N.push(...n); M.push(...mitte); Z.push(...zz); U.push(x / bw + 0.5, (y + 1) / 2); S.push(seite); };
  for (const poly of zellen) {
    const cx = poly.reduce((s, p) => s + p[0], 0) / poly.length, cy = poly.reduce((s, p) => s + p[1], 0) / poly.length;
    const mitte = [cx, cy, -dicke / 2], zz = [zufall(), zufall(), zufall(), zufall()];
    for (let i = 1; i < poly.length - 1; i++) {                           // vorn (z = 0) und hinten (z = −dicke), als Fächer
      for (const p of [poly[0], poly[i], poly[i + 1]]) ecke(p[0], p[1], 0, [0, 0, 1], mitte, zz, 1);
      for (const p of [poly[0], poly[i + 1], poly[i]]) ecke(p[0], p[1], -dicke, [0, 0, -1], mitte, zz, 0);
    }
    for (let i = 0; i < poly.length; i++) {                               // Schnittkanten
      const a = poly[i], b = poly[(i + 1) % poly.length], l = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1;
      const n = [(b[1] - a[1]) / l, -(b[0] - a[0]) / l, 0];
      ecke(a[0], a[1], 0, n, mitte, zz, 0.5); ecke(a[0], a[1], -dicke, n, mitte, zz, 0.5); ecke(b[0], b[1], -dicke, n, mitte, zz, 0.5);
      ecke(a[0], a[1], 0, n, mitte, zz, 0.5); ecke(b[0], b[1], -dicke, n, mitte, zz, 0.5); ecke(b[0], b[1], 0, n, mitte, zz, 0.5);
    }
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.Float32BufferAttribute(P, 3));
  geo.setAttribute("normal", new THREE.Float32BufferAttribute(N, 3));
  geo.setAttribute("aMitte", new THREE.Float32BufferAttribute(M, 3));
  geo.setAttribute("aZufall", new THREE.Float32BufferAttribute(Z, 4));
  geo.setAttribute("aUv", new THREE.Float32BufferAttribute(U, 2));
  geo.setAttribute("aSeite", new THREE.Float32BufferAttribute(S, 1));
  return geo;
}

/** kleiner Zufallsgenerator mit Startwert (Mulberry32): dieselben Scherben bei jedem Laden */
const zufallAus = (s) => () => { s |= 0; s = (s + 0x6d2b79f5) | 0; let t = Math.imul(s ^ (s >>> 15), 1 | s); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };

starte("splitter", ({ renderer, foto, B, H }) => {
  const szene = new THREE.Scene();
  const kamera = new THREE.PerspectiveCamera(FOV, B / H, 0.05, 50);
  const abstand = 1 / Math.tan(THREE.MathUtils.degToRad(FOV / 2));
  const bw = (2 * B) / H, zufall = zufallAus(20261016);
  const gy = TEST ? 14 : 24, gx = Math.round((gy * B) / H);
  const geo = scherben(voronoi(bw, gx, gy, zufall), bw, 0.05, zufall);

  const mat = new THREE.ShaderMaterial({
    uniforms: {
      uFoto: { value: foto.textur }, uAus: { value: 0 }, uZurueck: { value: 0 }, uZeit: { value: 0 },
      uLicht: { value: new THREE.Vector3() }, uAkzent: { value: new THREE.Color("#ff6a1f") },
    },
    vertexShader: /* glsl */ `
      uniform float uAus, uZurueck, uZeit;
      attribute vec3 aMitte; attribute vec4 aZufall; attribute vec2 aUv; attribute float aSeite;
      varying vec2 vUv; varying vec3 vNormal, vSicht; varying float vSeite, vFlug;
      mat3 drehung(vec3 a, float w) {
        a = normalize(a); float s = sin(w), c = cos(w), o = 1.0 - c;
        return mat3(o * a.x * a.x + c, o * a.x * a.y + a.z * s, o * a.z * a.x - a.y * s,
                    o * a.x * a.y - a.z * s, o * a.y * a.y + c, o * a.y * a.z + a.x * s,
                    o * a.z * a.x + a.y * s, o * a.y * a.z - a.x * s, o * a.z * a.z + c);
      }
      void main() {
        float r = length(aMitte.xy);
        float start = 0.45 * min(r / 1.3, 1.0) + 0.3 * aZufall.w;          // innen zuerst, mit Streuung
        float f = smoothstep(start, start + 0.25, uAus) * (1.0 - smoothstep(start, start + 0.25, uZurueck));
        f = f * f * (3.0 - 2.0 * f);
        // Explosionszeichnung: vor allem in die Tiefe gestaffelt, wenig zur Seite → das Foto bleibt erkennbar
        vec3 richtung = vec3(aMitte.xy * 0.22 + (aZufall.xy - 0.5) * 0.18, 0.15 + 1.1 * aZufall.z);
        vec3 mitte = aMitte + richtung * f * (0.5 + 0.9 * aZufall.w)
                   + f * 0.06 * vec3(sin(uZeit * 0.9 + 6.28 * aZufall.x), cos(uZeit * 0.7 + 6.28 * aZufall.y), 0.0);   // schwebt
        mat3 R = drehung(aZufall.xyz - 0.5 + 1e-3, f * (0.12 + 0.55 * aZufall.w));   // wenig Drehung: die Bildseite bleibt der Kamera zugewandt
        vec4 mv = modelViewMatrix * vec4(R * (position - aMitte) + mitte, 1.0);
        gl_Position = projectionMatrix * mv;
        vNormal = normalMatrix * (R * normal); vSicht = -mv.xyz;
        vUv = aUv; vSeite = aSeite; vFlug = f;
      }`,
    fragmentShader: /* glsl */ `
      uniform sampler2D uFoto; uniform vec3 uLicht, uAkzent;
      varying vec2 vUv; varying vec3 vNormal, vSicht; varying float vSeite, vFlug;
      void main() {
        vec3 n = normalize(vNormal), v = normalize(vSicht), l = normalize(uLicht);
        if (!gl_FrontFacing) n = -n;
        float diff = max(dot(n, l), 0.0), glanz = pow(max(dot(n, normalize(l + v)), 0.0), 70.0);
        float fres = pow(1.0 - max(dot(n, v), 0.0), 3.0);
        vec3 foto = texture2D(uFoto, vUv).rgb;
        vec3 c;
        if (vSeite > 0.75) c = foto * mix(1.0, 0.45 + 0.85 * diff, vFlug) + vFlug * (0.35 * glanz + 0.2 * fres);    // vorn: das Foto
        else if (vSeite > 0.25) c = uAkzent * (0.18 + 0.9 * diff) + 0.9 * glanz;                                   // Schnittkante glüht
        else c = foto * 0.12 + 0.4 * fres;                                                                        // Rückseite dunkel
        gl_FragColor = vec4(c, 1.0);
      }`,
  });
  const netz = new THREE.Mesh(geo, mat);
  netz.frustumCulled = false;
  szene.add(netz);
  const look = filmlook(renderer, szene, kamera, { staerke: 0.45, radius: 0.25, schwelle: 0.85 });

  return {
    dauer: DAUER,
    bild(t) {
      const u = mat.uniforms;
      u.uZeit.value = t;
      u.uAus.value = 1.25 * inOut(anteil(t, 1, 4.6));
      u.uZurueck.value = 1.25 * inOut(anteil(t, 5.8, 9.6));
      const flug = Math.min(1, u.uAus.value) * (1 - Math.min(1, u.uZurueck.value));
      const w = 0.42 * Math.sin(((t - 1) / 9) * Math.PI) * flug;           // Kamera schwenkt im Flug zur Seite: die Tiefe wird sichtbar
      kamera.position.set(Math.sin(w) * abstand, 0.15 * flug, Math.cos(w) * abstand * (1 + 0.25 * flug));
      kamera.lookAt(0, 0, 0.3 * flug);
      kamera.updateMatrixWorld();                                          // sonst gilt unten noch die Kamera des letzten Bildes
      u.uLicht.value.set(Math.cos(t * 0.8) * 0.7, 0.6, 0.6).transformDirection(kamera.matrixWorldInverse);
      look.bloom.strength = 0.1 + 0.5 * flug;
      look.render(t);
    },
    entsorgen() { geo.dispose(); mat.dispose(); look.entsorgen(); },
  };
});
