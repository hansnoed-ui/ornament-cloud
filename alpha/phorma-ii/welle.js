// PHORMA II – Wellenwanne (seit 22. Oktober 2026, Wunsch: weitere Bildtransformationen, «spektakulär, aber nicht zuuu viel Rechenzeit»; Bezug zum
// Doppelspalt). Das Foto liegt unter einer Wasseroberfläche: Tropfen fallen an den markantesten Stellen (die Keime der Analyse), ihre Ringe brechen
// das Bild, wo Wellen Licht bündeln, glänzen helle Linien (Kaustik). Die Oberfläche ist eine Wellengleichung auf der GPU in kleiner Auflösung
// (h, h vorher, Energie in einem HalfFloat-Ziel), 120 Schritte je Sekunde eigener Zeit, alle 2 s ein Wiedereinstiegspunkt (wie Physarum).
//   01 Dünung – das Wasser ist schon bewegt (1,5 s Vorlauf mit Tropfen), lange ruhige Wellen ziehen darüber, ab und zu ein Tropfen
//   02 Doppelspalt – eine Wand mit zwei Spalten quer durchs Bild, von oben laufen gerade Wellen hinein, dahinter das Interferenzmuster
//   03 Wellen – die Wand verschwindet, nur kurz unruhig: Tropfen dicht hintereinander (Wunsch: «vor allem die langsamen Phasen und nur kurz
//   schneller, insgesamt maximal 8 Sekunden»)
// Nach dem ersten Probefilm (Wunsch: «Den Bildaufbau beim Wellenbad will ich nicht, das Bild soll schon verwellt starten und teilweise auch ruhigere
// Bewegungen zeigen»): kein Aufdecken mehr aus dem Dunkeln, dafür der Vorlauf und die Dünung (lange Wellen, im Shader gerechnet, nicht simuliert).
//   04 Bild (nur als letzter Effekt) – die Oberfläche beruhigt sich, das Foto steht
import * as THREE from "three";
import { anteil, weich, glocke, ziel, quadMaterial } from "./gemeinsam.js?v=34";
import { phase } from "./ablauf.js?v=34";
import { zufall } from "./analyse.js?v=34";

export const SCHRITTE = 160;
const SICHERN = 320, TROPFEN_JE_SCHRITT = 4, VORLAUF = 1.5;   // so viele Sekunden rechnet das Wasser vor dem Anfang (es startet bewegt)

const SCHRITT = /* glsl */ `
  uniform sampler2D tW; uniform vec2 uPixel; uniform float uC, uDaempfung, uWand, uWandY, uSpaltB, uQuelle, uSeite;
  uniform vec2 uSpalt; uniform vec4 uTropfen[${TROPFEN_JE_SCHRITT}]; varying vec2 vUv;
  void main() {
    vec4 w = texture2D(tW, vUv); float h = w.r, hv = w.g;
    float l = texture2D(tW, vUv - vec2(uPixel.x, 0.0)).r + texture2D(tW, vUv + vec2(uPixel.x, 0.0)).r
            + texture2D(tW, vUv - vec2(0.0, uPixel.y)).r + texture2D(tW, vUv + vec2(0.0, uPixel.y)).r - 4.0 * h;
    // am Rand schlucken (sonst kommen die Wellen endlos zurück und alles wird unruhig)
    // (nicht oben: von dort kommen die geraden Wellen des Doppelspalts)
    vec2 r = min(vUv, 1.0 - vUv) / uPixel;
    float neu = (2.0 * h - hv + uC * l) * uDaempfung * mix(0.86, 1.0, smoothstep(1.0, 10.0, min(r.x, vUv.y / uPixel.y)));
    // Tropfen: ein Stoss, der als Ring ausläuft (Lage in Bildkoordinaten, y von oben; Radius in Bildbreiten; Stärke)
    for (int i = 0; i < ${TROPFEN_JE_SCHRITT}; i++) {
      vec4 t = uTropfen[i];
      vec2 d = (vUv - vec2(t.x, 1.0 - t.y)) * vec2(uSeite, 1.0);
      neu += t.w * exp(-dot(d, d) / (t.z * t.z));
    }
    // gerade Wellen von oben (Doppelspalt): sanft angetrieben in einem schmalen Streifen – hart gesetzt entstand Gitterrauschen (feine Streifen)
    float oben = (1.0 - vUv.y) / (4.0 * uPixel.y);
    neu += uQuelle * exp(-oben * oben);
    neu += 0.012 * l;                                                       // ein wenig Zähigkeit: dämpft die kürzesten Wellen
    neu -= 0.004 * h;                                                       // zieht den Pegel zurück (sonst steigt das Wasser mit jedem Tropfen)
    // die Wand mit zwei Spalten: dort steht das Wasser still
    float inWand = step(abs(vUv.y - uWandY), 1.2 * uPixel.y);
    float offen = max(step(abs(vUv.x - uSpalt.x), uSpaltB), step(abs(vUv.x - uSpalt.y), uSpaltB));
    neu *= 1.0 - uWand * inWand * (1.0 - offen);
    gl_FragColor = vec4(neu, h, 0.0, 1.0);
  }`;
const ZEIGEN = /* glsl */ `
  uniform sampler2D tW, tFoto; uniform vec2 uPixel; uniform float uBrechung, uKaustik, uSicht, uWand, uWandY, uSpaltB, uSeite, uDunkel, uDuenung, uZeit;
  uniform vec2 uSpalt; varying vec2 vUv;
  // Dünung: drei lange Wellen aus verschiedenen Richtungen; je (Steigung x, Steigung y, Krümmung)
  vec3 zug(vec2 p, vec2 d, float lam, float om, float s) { float k = 6.2831853 / lam, ph = k * dot(normalize(d), p) - om * uZeit; return vec3(s * cos(ph) * normalize(d), -s * k * sin(ph)); }
  void main() {
    float hx = texture2D(tW, vUv + vec2(uPixel.x, 0.0)).r - texture2D(tW, vUv - vec2(uPixel.x, 0.0)).r;
    float hy = texture2D(tW, vUv + vec2(0.0, uPixel.y)).r - texture2D(tW, vUv - vec2(0.0, uPixel.y)).r;
    vec4 w = texture2D(tW, vUv);
    float l = texture2D(tW, vUv - vec2(uPixel.x, 0.0)).r + texture2D(tW, vUv + vec2(uPixel.x, 0.0)).r
            + texture2D(tW, vUv - vec2(0.0, uPixel.y)).r + texture2D(tW, vUv + vec2(0.0, uPixel.y)).r - 4.0 * w.r;
    vec2 p = vec2(vUv.x * uSeite, vUv.y);
    vec3 du = (zug(p, vec2(1.0, 0.35), 0.55, 1.1, 0.16) + zug(p, vec2(-0.45, 1.0), 0.34, 1.5, 0.11) + zug(p, vec2(0.7, -0.6), 0.22, 2.0, 0.06)) * uDuenung;
    vec3 n = normalize(vec3(-hx * 6.0 - du.x, -hy * 6.0 - du.y, 1.0));
    l += du.z * 0.004;
    // Brechung: das Foto unter dem Wasser verschoben, die Farbkanäle ein wenig verschieden (wie Glas)
    vec2 v = n.xy * uBrechung;
    vec3 c = vec3(texture2D(tFoto, vUv + v * 1.04).r, texture2D(tFoto, vUv + v).g, texture2D(tFoto, vUv + v * 0.96).b);
    // Kaustik: wo die Oberfläche Licht bündelt (gewölbt), helle Linien; dazu ein Glanz von schräg oben
    float kaustik = max(0.0, -l) * uKaustik;
    float glanz = pow(max(0.0, dot(reflect(-normalize(vec3(-0.4, 0.5, 0.75)), n), vec3(0.0, 0.0, 1.0))), 60.0) * min(1.0, length(n.xy) * 30.0);
    c = c * (1.0 - uDunkel) * (1.0 - 0.25 * min(1.0, kaustik)) + vec3(1.0, 0.86, 0.66) * kaustik + vec3(1.0, 0.95, 0.88) * glanz * 0.6 * uKaustik / 2.0;
    // die Wand als feine kupferne Linie, die Spalten offen
    float wand = (1.0 - smoothstep(0.0, 1.8 * uPixel.y, abs(vUv.y - uWandY)))
               * (1.0 - max(step(abs(vUv.x - uSpalt.x), uSpaltB), step(abs(vUv.x - uSpalt.y), uSpaltB)));
    c = mix(c, vec3(1.0, 0.5, 0.25) * 1.4, wand * uWand);
    gl_FragColor = vec4(c * uSicht, 1.0);
  }`;
const KOPIE = /* glsl */ `uniform sampler2D tQ; varying vec2 vUv; void main() { gl_FragColor = texture2D(tQ, vUv); }`;

export function welle(g, teil) {
  const { A, B, H } = g, a = B / H;
  const sw = g.test ? 96 : g.grob ? 160 : 240, sh = Math.round(sw / a);
  const T = phase(teil, "duenung"), D = phase(teil, "spalt"), W = phase(teil, "wellen"), Bp = phase(teil, "bild");
  const rt = () => ziel(sw, sh, { minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter });
  const wasser = [rt(), rt()];
  const tropfenU = Array.from({ length: TROPFEN_JE_SCHRITT }, () => new THREE.Vector4());
  const schrittM = quadMaterial(SCHRITT, { tW: { value: null }, uPixel: { value: new THREE.Vector2(1 / sw, 1 / sh) }, uC: { value: 0.42 }, uDaempfung: { value: 0.996 },
    uWand: { value: 0 }, uWandY: { value: 0.5 }, uSpaltB: { value: 0.03 }, uSpalt: { value: new THREE.Vector2(0.4, 0.6) }, uQuelle: { value: 0 }, uSeite: { value: a },
    uTropfen: { value: tropfenU } });
  const zeigen = quadMaterial(ZEIGEN, { tW: { value: null }, tFoto: { value: g.fotoTex }, uPixel: { value: new THREE.Vector2(1 / sw, 1 / sh) }, uBrechung: { value: 0 },
    uKaustik: { value: 0 }, uSicht: { value: 0 }, uDuenung: { value: 0 }, uZeit: { value: 0 }, uWand: { value: 0 }, uWandY: { value: 0.5 }, uSpaltB: { value: 0.025 },
    uSpalt: { value: new THREE.Vector2(0.4, 0.6) }, uSeite: { value: a }, uDunkel: { value: 0 } });
  const kopie = quadMaterial(KOPIE, { tQ: { value: null } });

  // der Plan (wiederholbar): Tropfen an den Keimen (die markantesten Stellen), im Takt; die Spalten links und rechts der Mitte des Motivs
  const r = zufall(0x3a11 + A.keime.length), keime = A.keime.length ? A.keime : [[0.5, 0.5]];
  const mx = keime.slice(0, 6).reduce((s, k) => s + k[0], 0) / Math.min(6, keime.length);
  const spalt = [Math.min(0.75, Math.max(0.25, mx)) - 0.14, Math.min(0.75, Math.max(0.25, mx)) + 0.14];
  const wandY = 1 - 0.3;                                                      // im oberen Drittel (y von unten): darunter Platz für das Muster
  const tropfen = [];                                                          // { n, x, y, r, s }
  // n zählt die Schritte ab dem Vorlauf
  const setzen = (t, x, y, rad, st) => tropfen.push({ n: Math.round((t + VORLAUF) * SCHRITTE), x, y, r: rad, s: st });
  [-1.4, -1.0, -0.6, -0.25].forEach((t, k) => { const q = keime[k % keime.length]; setzen(t, q[0], q[1], 0.03, 0.5); });   // vor dem Anfang: schon bewegt
  [0.7, 1.5].forEach((t, k) => { if (T[0] + t < T[1] - 0.4) { const q = keime[(k + 4) % keime.length]; setzen(T[0] + t, q[0], q[1], 0.025, 0.25); } });
  // nur kurz unruhig: Tropfen dicht hintereinander in der kurzen Phase «Wellen»
  for (let t = W[0] + 0.05, k = 4; W[1] > W[0] && t < W[1] - 0.15; t += 0.3, k++) {
    const q = keime[k % keime.length];
    setzen(t, q[0] + (r() - 0.5) * 0.08, q[1] + (r() - 0.5) * 0.08, 0.018 + 0.02 * r(), 0.45 + 0.3 * r());
    if (r() < 0.6) { const p = keime[(k * 7 + 3) % keime.length]; setzen(t + 0.25, p[0], p[1], 0.015 + 0.015 * r(), 0.25 + 0.2 * r()); }
  }
  // Doppelspalt: gerade Wellen von oben, 3,7 je Sekunde (etwa vier Wellenlängen zwischen den Spalten); die Wand steht während der ganzen Phase
  const quelle = (tau) => (D[1] > D[0] && tau >= D[0] && tau < D[1] - 0.3 ? 0.05 * Math.sin(2 * Math.PI * 3.7 * (tau - D[0])) * weich(anteil(tau, D[0], D[0] + 0.5)) : 0);
  const wand = (tau) => (D[1] > D[0] ? weich(anteil(tau, D[0] - 0.3, D[0] + 0.2)) * (1 - weich(anteil(tau, D[1] - 0.2, D[1] + 0.4))) : 0);
  // die Oberfläche beruhigt sich im Bild
  // kurz vor dem Doppelspalt wird das Wasser ruhig (die Ringe der Tropfen verschwinden), im Bild ebenso
const daempfung = (tau) => 0.997 - 0.025 * glocke(tau, D[0] - 0.4, D[0] + 0.3) - (Bp ? 0.04 * weich(anteil(tau, Bp[0], Bp[0] + 0.8)) : 0);

  // die Dünung: stark in der ersten Phase, schwach im Doppelspalt (damit man das Muster liest), in den ruhigen Abschnitten der Wellen stärker
  const duenung = (tau) => {
    return (1 - 0.8 * wand(tau)) * (tau < W[0] ? 1 : 0.5) * (Bp ? 1 - weich(anteil(tau, Bp[0], Bp[1] - 0.4)) : 1);
  };
  let n = -1, i = 0;
  const sicherungen = [];
  const kopieren = (von, nach) => { kopie.uniforms.tQ.value = von.texture; g.pass(kopie, nach); };
  function zuruecksetzen() { g.loeschen(wasser[0]); g.loeschen(wasser[1]); i = 0; n = 0; }
  function schritt() {
    const tau = n / SCHRITTE - VORLAUF, u = schrittM.uniforms;
    const jetzt = tropfen.filter((t) => t.n === n);
    tropfenU.forEach((v, k) => { const t = jetzt[k]; if (t) v.set(t.x, t.y, t.r, t.s); else v.set(0, 0, 1, 0); });
    u.tW.value = wasser[i].texture; u.uQuelle.value = quelle(tau); u.uWand.value = wand(tau) > 0.5 ? 1 : 0; u.uDaempfung.value = daempfung(tau);
    g.pass(schrittM, wasser[1 - i]); i = 1 - i; n++;
    if (n % SICHERN === 0 && !sicherungen.some((s) => s.n === n)) { const s = { n, rt: rt() }; kopieren(wasser[i], s.rt); sicherungen.push(s); }
  }
  function bis(m, budget = Infinity) {
    if (n < 0 || m < n) {
      const s = sicherungen.filter((x) => x.n <= m).at(-1);
      if (s) { kopieren(s.rt, wasser[0]); i = 0; n = s.n; } else zuruecksetzen();
    }
    while (n < m && budget-- > 0) schritt();
  }
  for (const m of [schrittM, zeigen]) { m.uniforms.uWandY.value = wandY; m.uniforms.uSpalt.value.set(spalt[0], spalt[1]); }
  zeigen.uniforms.uSpaltB.value = schrittM.uniforms.uSpaltB.value;

  return {
    render(ziel, tau, { vorschau = false } = {}) {
      bis(Math.floor((tau + VORLAUF) * SCHRITTE + 1e-6), vorschau ? 120 : Infinity);
      const u = zeigen.uniforms, ruhig = Bp ? weich(anteil(tau, Bp[0], Bp[1] - 0.3)) : 0;
      u.tW.value = wasser[i].texture;
      u.uBrechung.value = 0.085 * (1 - ruhig);
      // im Doppelspalt mehr Licht auf dunklerem Foto: so liest man das Interferenzmuster
      const sp = wand(tau);
      u.uKaustik.value = 2.4 * (1 - ruhig) * (1 + 1.5 * sp); u.uDunkel.value = 0.45 * sp;
      u.uWand.value = wand(tau);
      u.uSicht.value = teil.erst ? weich(anteil(tau, 0, 0.4)) : 1;
      u.uDuenung.value = duenung(tau); u.uZeit.value = tau;
      g.pass(zeigen, ziel);
      let ende = 0, aktiv = teil.erst ? weich(anteil(tau, 0, 0.6)) : 1;
      if (teil.vonFoto) ende = 1 - weich(anteil(tau, 0, 0.35));
      if (Bp) { ende = Math.max(ende, weich(anteil(tau, Bp[1] - 0.35, Bp[1] - 0.05))); aktiv *= 1 - weich(anteil(tau, Bp[0] + 0.3, Bp[1])); }
      return { aktiv, bloom: 0.3, radius: 0.35, saum: 0.0025, ende };
    },
    vorab: { szenen: [], materialien: [schrittM, zeigen, kopie] },
    zaehler() { return `wellenwanne · ${sw}×${sh} · tropfen ${tropfen.length} · schritt ${Math.max(0, n - VORLAUF * SCHRITTE).toLocaleString("de-CH")}`; },
    entsorgen() { for (const x of [...wasser, ...sicherungen.map((s) => s.rt)]) x.dispose(); for (const m of [schrittM, zeigen, kopie]) m.dispose(); },
  };
}
