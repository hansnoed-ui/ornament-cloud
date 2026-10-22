// PHORMA II – Pixel-Sortierung (seit 22. Oktober 2026, Wunsch: weitere Bildtransformationen, «spektakulär, aber nicht zuuu viel Rechenzeit»). In
// jedem Streifen sortieren sich die Zeilen nach ihrer Helligkeit, aber nur innerhalb eines Bands mittlerer Helligkeit: Zeilen ausserhalb sind
// Wände, dazwischen laufen die Läufe als glühende Schlieren aus. Die Streifen sind unregelmässig breit (Wunsch nach dem ersten Probefilm: «breitere
// Spalten, unregelmässig breitere und schmalere»): ein Drittel schmal (1–3 Punkte), die anderen bis 45 Punkte; ein Streifen sortiert als Ganzes nach
// der Helligkeit seiner Mittelspalte, seine Zeilen rutschen als Blöcke. Die Sortierung läuft wirklich, Schritt für Schritt (Odd-Even-Transposition auf der GPU,
// je Schritt ein Durchgang über das Bild: Paare benachbarter Punkte tauschen, wenn sie falsch liegen), so sieht man die Punkte fliessen.
//   01 Schwelle – das Foto, die Punkte im Band leuchten auf (als erster Effekt aus dem Dunkeln)
//   02 Sortieren – das Band öffnet sich nach unten, immer mehr läuft aus; in manchen Spalten steigt das Helle auf statt abzusinken
//   03 Bild (nur als letzter Effekt) – Spalte für Spalte zieht sich das Sortierte von oben zurück, das Foto steht
// Gerechnet in halber Grösse (8 Bit, genau, keine Rundungsfehler beim Tauschen), 220 Schritte je Sekunde eigener Zeit, alle 2 s ein
// Wiedereinstiegspunkt (wie Physarum): Bild n ist beim Abspielen, Spulen und im Video dasselbe. Mit Video laufen die Punkte ausserhalb des Bands mit.
import * as THREE from "three";
import { anteil, weich, glocke, quadMaterial } from "./gemeinsam.js?v=34";
import { phase } from "./ablauf.js?v=34";
import { zufall } from "./analyse.js?v=34";

export const SCHRITTE = 220;
const SICHERN = 440;

// Foto (linear) → Puffer (sRGB in 8 Bit)
const ANFANG = /* glsl */ `uniform sampler2D tFoto; varying vec2 vUv; void main() { gl_FragColor = vec4(pow(texture2D(tFoto, vUv).rgb, vec3(1.0 / 2.2)), 1.0); }`;
// ein Schritt: jedes Paar (Zeile 2k, 2k+1 oder 2k+1, 2k+2 im Wechsel) tauscht, wenn beide im Band liegen und falsch herum sind
const SORTIEREN = /* glsl */ `
  uniform sampler2D tQ, tFoto, tStreifen; uniform vec2 uPixel; uniform float uLo, uHi, uParitaet; varying vec2 vUv;
  float hell(vec3 c) { return dot(c, vec3(0.299, 0.587, 0.114)); }
  void main() {
    vec2 st = texture2D(tStreifen, vec2(vUv.x, 0.5)).xy;                    // die Mittelspalte des Streifens, sein Zufall
    float zeile = floor(vUv.y / uPixel.y), z = st.y;
    float lo = uLo - 0.08 * z, hi = uHi;                                    // je Streifen etwas anders: die Läufe sind verschieden lang
    bool unten = mod(zeile + uParitaet, 2.0) < 0.5;                         // diese Zeile ist die untere ihres Paars
    vec2 q = vUv + vec2(0.0, unten ? uPixel.y : -uPixel.y);
    vec4 a = texture2D(tQ, vUv), b = texture2D(tQ, q);
    // entschieden wird an der Mittelspalte: so tauschen alle Punkte einer Zeile des Streifens gemeinsam
    float ka = hell(texture2D(tQ, vec2(st.x, vUv.y)).rgb), kb = hell(texture2D(tQ, vec2(st.x, q.y)).rgb);
    bool ma = ka >= lo && ka <= hi, mb = kb >= lo && kb <= hi;
    vec4 c = a;
    if (ma && mb && q.y > 0.0 && q.y < 1.0) {
      // die untere Zeile nimmt die hellere, die obere die dunklere (in drei von zehn Streifen umgekehrt: dort steigt das Helle auf); bei Gleichstand
      // behält jede ihre – sonst verdoppelte sich eine
      bool hellUnten = z >= 0.3, nimmtMax = unten == hellUnten;
      c = (nimmtMax ? ka >= kb : ka <= kb) ? a : b;
    }
    // ausserhalb des Bands: das Foto selbst (mit Video: das laufende Bild); solche Zeilen haben sich nie bewegt
    if (!ma) c = vec4(pow(texture2D(tFoto, vUv).rgb, vec3(1.0 / 2.2)), 1.0);
    gl_FragColor = c;
  }`;
const ZEIGEN = /* glsl */ `
  uniform sampler2D tQ, tFoto, tStreifen; uniform vec2 uPixel; uniform float uSicht, uBand, uLo, uHi, uZurueck, uGlut; varying vec2 vUv;
  float hell(vec3 c) { return dot(c, vec3(0.299, 0.587, 0.114)); }
  void main() {
    vec3 foto = texture2D(tFoto, vUv).rgb, s = texture2D(tQ, vUv).rgb, sortiert = pow(s, vec3(2.2));
    float z = texture2D(tStreifen, vec2(vUv.x, 0.5)).y;
    // die Läufe glühen leicht (je weiter ein Punkt gewandert ist, desto mehr – grob: wo das Sortierte vom Foto abweicht)
    float weg = clamp(length(s - pow(foto, vec3(1.0 / 2.2))) * 3.0, 0.0, 1.0);
    vec3 c = sortiert * (1.0 + uGlut * weg);
    // Schwelle: die Punkte im Band leuchten kupfern auf
    float k = hell(pow(foto, vec3(1.0 / 2.2))), im = smoothstep(uLo - 0.02, uLo, k) * (1.0 - smoothstep(uHi, uHi + 0.02, k));
    c = mix(c, c * 0.55 + vec3(1.0, 0.48, 0.22) * (0.35 + 0.65 * k), im * uBand);
    // Rückkehr: Streifen für Streifen von oben, jeder zu seiner Zeit
    c = mix(c, foto, smoothstep(0.0, 0.1, uZurueck * 1.6 - 0.4 * z - (1.0 - vUv.y)));
    gl_FragColor = vec4(c * uSicht, 1.0);
  }`;

export function sortierung(g, teil) {
  const { B, H } = g;
  const f = g.test ? 0.25 : g.grob ? 0.34 : 0.5, sw = Math.round(B * f), sh = Math.round(H * f);
  const Sw = phase(teil, "schwelle"), So = phase(teil, "sortieren"), Bp = phase(teil, "bild");
  const rt = () => new THREE.WebGLRenderTarget(sw, sh, { type: THREE.UnsignedByteType, minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter, depthBuffer: false });
  const puffer = [rt(), rt()];
  // die Streifen: je Spalte die Mitte ihres Streifens und sein Zufall (wiederholbar)
  const r = zufall(0x50a7 + sw), streifen = new Float32Array(sw * 4);
  for (let x = 0; x < sw;) {
    const b = Math.min(sw - x, r() < 0.35 ? 1 + Math.floor(r() * 3) : Math.round((6 + r() * r() * 40) * (sw / 540))), m = x + Math.floor(b / 2), z = r();
    for (let k = x; k < x + b; k++) { streifen[k * 4] = (m + 0.5) / sw; streifen[k * 4 + 1] = z; }
    x += Math.max(1, b);
  }
  const streifenTex = new THREE.DataTexture(streifen, sw, 1, THREE.RGBAFormat, THREE.FloatType);
  streifenTex.minFilter = streifenTex.magFilter = THREE.NearestFilter; streifenTex.needsUpdate = true;
  const anfang = quadMaterial(ANFANG, { tFoto: { value: g.fotoTex } });
  const sortieren = quadMaterial(SORTIEREN, { tQ: { value: null }, tFoto: { value: g.fotoTex }, tStreifen: { value: streifenTex }, uPixel: { value: new THREE.Vector2(1 / sw, 1 / sh) }, uLo: { value: 0.6 }, uHi: { value: 0.98 }, uParitaet: { value: 0 } });
  const kopie = quadMaterial(/* glsl */ `uniform sampler2D tQ; varying vec2 vUv; void main() { gl_FragColor = texture2D(tQ, vUv); }`, { tQ: { value: null } });
  const zeigen = quadMaterial(ZEIGEN, { tQ: { value: null }, tFoto: { value: g.fotoTex }, tStreifen: { value: streifenTex }, uPixel: { value: new THREE.Vector2(1 / sw, 1 / sh) }, uSicht: { value: 0 }, uBand: { value: 0 },
    uLo: { value: 0.6 }, uHi: { value: 0.98 }, uZurueck: { value: 0 }, uGlut: { value: 0 } });

  // das Band: zuerst nur das Helle, dann öffnet es sich nach unten (immer mehr läuft aus), gegen Ende etwas zurück
  const band = (tau) => [0.7 - 0.45 * weich(anteil(tau, So[0], So[0] + 0.45 * (So[1] - So[0]))), 0.985];
  let n = -1, i = 0;
  const sicherungen = [];
  function zuruecksetzen() { g.pass(anfang, puffer[0]); i = 0; n = 0; }
  function schritt() {
    const tau = So[0] + n / SCHRITTE, [lo, hi] = band(tau), u = sortieren.uniforms;
    u.tQ.value = puffer[i].texture; u.uLo.value = lo; u.uHi.value = hi; u.uParitaet.value = n % 2;
    g.pass(sortieren, puffer[1 - i]); i = 1 - i; n++;
    if (n % SICHERN === 0 && !sicherungen.some((s) => s.n === n)) { const s = { n, rt: rt() }; kopie.uniforms.tQ.value = puffer[i].texture; g.pass(kopie, s.rt); sicherungen.push(s); }
  }
  function bis(m, budget = Infinity) {
    if (n < 0 || m < n) {
      const s = sicherungen.filter((x) => x.n <= m).at(-1);
      if (s) { kopie.uniforms.tQ.value = s.rt.texture; g.pass(kopie, puffer[0]); i = 0; n = s.n; } else zuruecksetzen();
    }
    while (n < m && budget-- > 0) schritt();
  }

  return {
    render(ziel, tau, { vorschau = false } = {}) {
      // gerechnet wird nur im Sortieren (vorher steht das Foto im Puffer); in der Vorschau höchstens 120 Schritte je Bild
      const m = Math.max(0, Math.floor((Math.min(tau, So[1]) - So[0]) * SCHRITTE + 1e-6));
      if (tau < So[0] || n < 0) bis(0); else bis(m, vorschau ? 220 : Infinity);
      const u = zeigen.uniforms, [lo, hi] = band(tau);
      u.tQ.value = puffer[i].texture; u.uLo.value = lo; u.uHi.value = hi;
      u.uSicht.value = teil.erst ? weich(anteil(tau, 0, 0.9)) : 1;
      u.uBand.value = 0.85 * glocke(tau, Sw[0] + 0.2, So[0] + 1.2);
      u.uGlut.value = 0.35 * weich(anteil(tau, So[0], So[0] + 1.5)) * (Bp ? 1 - weich(anteil(tau, Bp[0], Bp[1])) : 1);
      u.uZurueck.value = Bp ? weich(anteil(tau, Bp[0], Bp[1] - 0.5)) : 0;
      g.pass(zeigen, ziel);
      let ende = 0, aktiv = teil.erst ? weich(anteil(tau, 0, 0.6)) : 1;
      if (teil.vonFoto) ende = 1 - weich(anteil(tau, 0, 0.35));
      if (Bp) { ende = Math.max(ende, weich(anteil(tau, Bp[1] - 0.5, Bp[1] - 0.1))); aktiv *= 1 - weich(anteil(tau, Bp[0] + 0.5, Bp[1])); }
      return { aktiv, bloom: 0.22, radius: 0.3, saum: 0.003, ende };
    },
    vorab: { szenen: [], materialien: [anfang, sortieren, kopie, zeigen] },
    zaehler() { return `pixel-sortierung · ${sw}×${sh} · schritt ${Math.max(0, n).toLocaleString("de-CH")}`; },
    entsorgen() { for (const r of [...puffer, ...sicherungen.map((s) => s.rt)]) r.dispose(); for (const m of [anfang, sortieren, kopie, zeigen]) m.dispose(); streifenTex.dispose(); },
  };
}
