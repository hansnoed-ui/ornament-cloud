// PHORMA II – Wellenwanne (seit 22. Oktober 2026, Wunsch: weitere Bildtransformationen, «spektakulär, aber nicht zuuu viel Rechenzeit»). Das Foto
// liegt unter einer Wasseroberfläche: lange, ruhige Wellen ziehen darüber (Dünung), ab und zu fällt ein Tropfen an den markantesten Stellen (die
// Keime der Analyse) und läuft als weiter Ring aus; das Bild bricht sich, wo Wellen Licht bündeln, glänzen helle Linien (Kaustik). Die Ringe sind eine
// Wellengleichung auf der GPU in kleiner Auflösung (h, h vorher in einem HalfFloat-Ziel), 80 Schritte je Sekunde eigener Zeit, alle 3 s ein
// Wiedereinstiegspunkt (wie Physarum); die Dünung ist im Shader gerechnet, nicht simuliert.
//   01 Dünung – das Wasser ist schon bewegt (2 s Vorlauf mit sanften Tropfen), lange Wellen ziehen langsam darüber
//   02 Wellen – ab und zu ein Tropfen, die Ringe laufen langsam und weit aus
//   03 Bild (nur als letzter Effekt) – die Oberfläche beruhigt sich, das Foto steht
// Rückmeldungen: nach dem ersten Probefilm «Den Bildaufbau will ich nicht, das Bild soll schon verwellt starten und teilweise auch ruhigere
// Bewegungen zeigen», dann «vor allem die langsamen Phasen …, insgesamt maximal 8 Sekunden», seit dem 22. Oktober 2026 (abends) «ohne Doppelspalt und
// langsamere Animation, ganz ruhig»: die Wand mit den zwei Spalten und die schnelle Phase sind weg, die Wellen laufen halb so schnell.
import * as THREE from "three";
import { anteil, weich, ziel, quadMaterial } from "./gemeinsam.js?v=37";
import { phase } from "./ablauf.js?v=37";

export const SCHRITTE = 80;
const SICHERN = 240, TROPFEN_JE_SCHRITT = 4, VORLAUF = 2.0;   // so viele Sekunden rechnet das Wasser vor dem Anfang (es startet bewegt)

const SCHRITT = /* glsl */ `
  uniform sampler2D tW; uniform vec2 uPixel; uniform float uC, uDaempfung, uSeite; uniform vec4 uTropfen[${TROPFEN_JE_SCHRITT}]; varying vec2 vUv;
  void main() {
    vec4 w = texture2D(tW, vUv); float h = w.r, hv = w.g;
    float l = texture2D(tW, vUv - vec2(uPixel.x, 0.0)).r + texture2D(tW, vUv + vec2(uPixel.x, 0.0)).r
            + texture2D(tW, vUv - vec2(0.0, uPixel.y)).r + texture2D(tW, vUv + vec2(0.0, uPixel.y)).r - 4.0 * h;
    // am Rand schlucken (sonst kommen die Wellen endlos zurück und alles wird unruhig)
    vec2 r = min(vUv, 1.0 - vUv) / uPixel;
    float neu = (2.0 * h - hv + uC * l) * uDaempfung * mix(0.86, 1.0, smoothstep(1.0, 10.0, min(r.x, r.y)));
    // Tropfen: ein sanfter Stoss, der als weiter Ring ausläuft (Lage in Bildkoordinaten, y von oben; Radius in Bildhöhen; Stärke)
    for (int i = 0; i < ${TROPFEN_JE_SCHRITT}; i++) {
      vec4 t = uTropfen[i];
      vec2 d = (vUv - vec2(t.x, 1.0 - t.y)) * vec2(uSeite, 1.0);
      neu += t.w * exp(-dot(d, d) / (t.z * t.z));
    }
    neu += 0.012 * l;                                                       // ein wenig Zähigkeit: dämpft die kürzesten Wellen
    neu -= 0.004 * h;                                                       // zieht den Pegel zurück (sonst steigt das Wasser mit jedem Tropfen)
    gl_FragColor = vec4(neu, h, 0.0, 1.0);
  }`;
const ZEIGEN = /* glsl */ `
  uniform sampler2D tW, tFoto; uniform vec2 uPixel; uniform float uBrechung, uKaustik, uSicht, uSeite, uDuenung, uZeit; varying vec2 vUv;
  // Dünung: drei lange, langsame Wellen aus verschiedenen Richtungen; je (Steigung x, Steigung y, Krümmung)
  vec3 zug(vec2 p, vec2 d, float lam, float om, float s) { float k = 6.2831853 / lam, ph = k * dot(normalize(d), p) - om * uZeit; return vec3(s * cos(ph) * normalize(d), -s * k * sin(ph)); }
  void main() {
    float hx = texture2D(tW, vUv + vec2(uPixel.x, 0.0)).r - texture2D(tW, vUv - vec2(uPixel.x, 0.0)).r;
    float hy = texture2D(tW, vUv + vec2(0.0, uPixel.y)).r - texture2D(tW, vUv - vec2(0.0, uPixel.y)).r;
    vec4 w = texture2D(tW, vUv);
    float l = texture2D(tW, vUv - vec2(uPixel.x, 0.0)).r + texture2D(tW, vUv + vec2(uPixel.x, 0.0)).r
            + texture2D(tW, vUv - vec2(0.0, uPixel.y)).r + texture2D(tW, vUv + vec2(0.0, uPixel.y)).r - 4.0 * w.r;
    vec2 p = vec2(vUv.x * uSeite, vUv.y);
    vec3 du = (zug(p, vec2(1.0, 0.35), 0.7, 0.5, 0.17) + zug(p, vec2(-0.45, 1.0), 0.45, 0.7, 0.11) + zug(p, vec2(0.7, -0.6), 0.3, 0.9, 0.06)) * uDuenung;
    vec3 n = normalize(vec3(-hx * 6.0 - du.x, -hy * 6.0 - du.y, 1.0));
    l += du.z * 0.004;
    // Brechung: das Foto unter dem Wasser verschoben, die Farbkanäle ein wenig verschieden (wie Glas)
    vec2 v = n.xy * uBrechung;
    vec3 c = vec3(texture2D(tFoto, vUv + v * 1.04).r, texture2D(tFoto, vUv + v).g, texture2D(tFoto, vUv + v * 0.96).b);
    // Kaustik: wo die Oberfläche Licht bündelt (gewölbt), helle Linien; dazu ein leiser Glanz von schräg oben
    float kaustik = max(0.0, -l) * uKaustik;
    float glanz = pow(max(0.0, dot(reflect(-normalize(vec3(-0.4, 0.5, 0.75)), n), vec3(0.0, 0.0, 1.0))), 60.0) * min(1.0, length(n.xy) * 30.0);
    c = c * (1.0 - 0.25 * min(1.0, kaustik)) + vec3(1.0, 0.86, 0.66) * kaustik + vec3(1.0, 0.95, 0.88) * glanz * 0.25 * uKaustik;
    gl_FragColor = vec4(c * uSicht, 1.0);
  }`;
const KOPIE = /* glsl */ `uniform sampler2D tQ; varying vec2 vUv; void main() { gl_FragColor = texture2D(tQ, vUv); }`;

export function welle(g, teil) {
  const { A, B, H } = g, a = B / H;
  const sw = g.test ? 96 : g.grob ? 160 : 240, sh = Math.round(sw / a);
  const T = phase(teil, "duenung"), W = phase(teil, "wellen"), Bp = phase(teil, "bild");
  const rt = () => ziel(sw, sh, { minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter });
  const wasser = [rt(), rt()];
  const tropfenU = Array.from({ length: TROPFEN_JE_SCHRITT }, () => new THREE.Vector4());
  const schrittM = quadMaterial(SCHRITT, { tW: { value: null }, uPixel: { value: new THREE.Vector2(1 / sw, 1 / sh) }, uC: { value: 0.42 }, uDaempfung: { value: 0.995 },
    uSeite: { value: a }, uTropfen: { value: tropfenU } });
  const zeigen = quadMaterial(ZEIGEN, { tW: { value: null }, tFoto: { value: g.fotoTex }, uPixel: { value: new THREE.Vector2(1 / sw, 1 / sh) }, uBrechung: { value: 0 },
    uKaustik: { value: 0 }, uSicht: { value: 0 }, uDuenung: { value: 0 }, uZeit: { value: 0 }, uSeite: { value: a } });
  const kopie = quadMaterial(KOPIE, { tQ: { value: null } });

  // der Plan (wiederholbar): wenige sanfte Tropfen an den Keimen (die markantesten Stellen); n zählt die Schritte ab dem Vorlauf
  const keime = A.keime.length ? A.keime : [[0.5, 0.5]], tropfen = [];   // { n, x, y, r, s }
  const setzen = (t, x, y, rad, st) => tropfen.push({ n: Math.round((t + VORLAUF) * SCHRITTE), x, y, r: rad, s: st });
  [-1.8, -0.9].forEach((t, k) => { const q = keime[k % keime.length]; setzen(t, q[0], q[1], 0.045, 0.3); });   // vor dem Anfang: schon bewegt
  setzen(T[0] + 1.6, keime[2 % keime.length][0], keime[2 % keime.length][1], 0.045, 0.22);
  for (let t = W[0] + 0.3, k = 3; W[1] > W[0] && t < W[1] - 0.6; t += 1.1, k++) { const q = keime[k % keime.length]; setzen(t, q[0], q[1], 0.04, 0.26); }
  // die Oberfläche beruhigt sich im Bild
  const daempfung = (tau) => 0.995 - (Bp ? 0.04 * weich(anteil(tau, Bp[0], Bp[0] + 0.8)) : 0);
  const duenung = (tau) => (Bp ? 1 - weich(anteil(tau, Bp[0], Bp[1] - 0.4)) : 1);

  let n = -1, i = 0;
  const sicherungen = [];
  const kopieren = (von, nach) => { kopie.uniforms.tQ.value = von.texture; g.pass(kopie, nach); };
  function zuruecksetzen() { g.loeschen(wasser[0]); g.loeschen(wasser[1]); i = 0; n = 0; }
  function schritt() {
    const tau = n / SCHRITTE - VORLAUF, u = schrittM.uniforms;
    const jetzt = tropfen.filter((t) => t.n === n);
    tropfenU.forEach((v, k) => { const t = jetzt[k]; if (t) v.set(t.x, t.y, t.r, t.s); else v.set(0, 0, 1, 0); });
    u.tW.value = wasser[i].texture; u.uDaempfung.value = daempfung(tau);
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

  return {
    render(ziel, tau, { vorschau = false } = {}) {
      bis(Math.floor((tau + VORLAUF) * SCHRITTE + 1e-6), vorschau ? 120 : Infinity);
      const u = zeigen.uniforms, ruhig = Bp ? weich(anteil(tau, Bp[0], Bp[1] - 0.3)) : 0;
      u.tW.value = wasser[i].texture;
      u.uBrechung.value = 0.075 * (1 - ruhig);
      u.uKaustik.value = 1.8 * (1 - ruhig);
      u.uSicht.value = teil.erst ? weich(anteil(tau, 0, 1.0)) ** 2 : 1;   // als erster Effekt kurz aus dem Dunkeln (das Wasser ist schon bewegt)
      u.uDuenung.value = duenung(tau); u.uZeit.value = tau;
      g.pass(zeigen, ziel);
      let ende = 0, aktiv = teil.erst ? weich(anteil(tau, 0, 0.6)) : 1;
      if (teil.vonFoto) ende = 1 - weich(anteil(tau, 0, 0.35));
      if (Bp) { ende = Math.max(ende, weich(anteil(tau, Bp[1] - 0.35, Bp[1] - 0.05))); aktiv *= 1 - weich(anteil(tau, Bp[0] + 0.3, Bp[1])); }
      return { aktiv, bloom: 0.25, radius: 0.35, saum: 0.0025, ende };
    },
    vorab: { szenen: [], materialien: [schrittM, zeigen, kopie] },
    zaehler() { return `wellenwanne · ${sw}×${sh} · tropfen ${tropfen.length} · schritt ${Math.max(0, n - VORLAUF * SCHRITTE).toLocaleString("de-CH")}`; },
    entsorgen() { for (const x of [...wasser, ...sicherungen.map((s) => s.rt)]) x.dispose(); for (const m of [schrittM, zeigen, kopie]) m.dispose(); },
  };
}
