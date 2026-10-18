// PHORMA III – Video: das Video selbst ist das Bild (seit 18. Oktober 2026, dritter Effekt; Wunsch: «für Video den selben Ablauf wie bei Audio –
// zuerst Scratching, dann Normal-Modus mit zwei, drei Cracks oder Glitches, am Schluss Gefrickel – nicht nur auf der Tonebene, sondern auch auf
// der Bild- bzw. Video-Ebene»; Entscheid: «das Video selbst», der Ton kommt aus dem Video oder aus einer Audiodatei dazu).
//   Etappe 1: das Video läuft bildgenau und synchron zum Ton – die Filmspur (filmspur.js) liefert je Filmzeit das Bild, der Fahrplan (karte)
//   sagt, welche Stelle der Quelle gerade läuft. Etappe 2 (Video-Scratching): mit dem Ablauf ist der Fahrplan der des Tons (stimme.js) – beim Scratchen
//   reibt das Bild vor und zurück wie eine Platte, es verschmiert mit dem Tempo entlang der Laufrichtung, der Farbsaum öffnet sich, an den Umkehrpunkten
//   steht es scharf, und der Fader (Transform, Chirp) lässt es aufblitzen und wegklappen; die Hüpfer und das Gefrickel springen mit dem Ton.
//   Etappe 3 (Cracks, risse.js): an jedem Hüpfer bricht das Bild auf – Datamosh (Bewegungsvektoren und Restbild der neuen Bilder auf dem alten,
//   wie ein Decoder ohne Schlüsselbild), Makroblöcke (verlorene Slices), Slit-Scan (jede Zeile aus einer anderen Zeit), Pixel-Sortierung (die
//   hellen Strecken schmelzen nach oben). Die Cracks rechnen in halber Grösse (die kleinen Bilder der Filmspur). 01 Video → 02 Logo (das Video
//   taucht ins Schwarz, film.js zeichnet die Schlaufe und tippt den Schriftzug) oder 02 Ende (das letzte Bild hält).
// Zustandslos: alles hängt nur von der Zeit ab (Bewegungsunschärfe, Spulen, Export Bild für Bild); der Datamosh merkt sich nur seine letzten zwei
// Schritte, damit er nicht jedes Mal von vorn rechnet (rückwärts oder in einem anderen Crack beginnt er neu, das Ergebnis ist dasselbe).
import * as THREE from "three";
import { anteil, weich, quadMaterial, ziel } from "./gemeinsam.js?v=11";
import { phase } from "./ablauf.js?v=11";
import { rissBei, moshQuellen, moshZeit, NAMEN, SCHICHTEN, ABSTAND, TAKT } from "./risse.js?v=11";

const VOR = 0.4;
const LUMA = /* glsl */ `float luma(vec3 c) { return dot(c, vec3(0.299, 0.587, 0.114)); }`;
// das Bild der Filmspur (sRGB, die Grafik entschlüsselt es linear; die Ausgabe der Bühne verschlüsselt wieder); ImageBitmap steht kopf: v gespiegelt
// uTempo: Geschwindigkeit der Quelle (1 = normal, negativ = rückwärts); je schneller, desto länger der Schmier und weiter der Farbsaum
// tRiss: das Bild eines Cracks (halbe Grösse, gleich ausgerichtet wie die Bitmaps); uMaske > 0: nur wo das Original heller ist (die sortierten Strecken)
const BILD = /* glsl */ `uniform sampler2D tBild, tRiss, tMaske; uniform float uHell, uTempo, uRiss, uMaske; varying vec2 vUv;
  ${LUMA}
  void main() {
    vec2 uv = vec2(vUv.x, 1.0 - vUv.y);
    float v = clamp(abs(uTempo) - 1.0, 0.0, 6.0) / 6.0;                     // was über das normale Tempo hinausgeht
    vec2 d = vec2(0.03 * v * sign(uTempo), 0.0);
    vec3 c = vec3(0.0);
    for (int i = 0; i < 9; i++) c += texture2D(tBild, uv - d * (float(i) / 8.0)).rgb;   // nachgezogen, gegen die Laufrichtung
    c /= 9.0;
    vec2 s = vec2(0.012 * v, 0.0);
    c.r = mix(c.r, texture2D(tBild, uv + s).r, v); c.b = mix(c.b, texture2D(tBild, uv - s).b, v);
    if (uRiss > 0.0) {
      float m = uMaske > 0.0 ? smoothstep(uMaske - 0.015, uMaske + 0.015, luma(texture2D(tMaske, uv).rgb)) : 1.0;
      c = mix(c, texture2D(tRiss, uv).rgb, uRiss * m);
    }
    gl_FragColor = vec4(c * uHell, 1.0);
  }`;
// eine Bitmap in ein Ziel derselben Ausrichtung (Zeile 0 = oben im Bild)
const KOPIE = /* glsl */ `uniform sampler2D tQuelle; uniform vec2 uGroesse; void main() { gl_FragColor = vec4(texture2D(tQuelle, gl_FragCoord.xy / uGroesse).rgb, 1.0); }`;
// Datamosh 1: die Bewegungsvektoren wie ein Encoder – je Block (8 × 8 Punkte) die Verschiebung d (±6), mit der das Bild a am besten zum Bild b
// passt (Summe der Helligkeitsunterschiede an 3 × 3 Stellen, kleine Vektoren bevorzugt wie beim Codec); rg = d, b = der Rest, a = der Rest ohne
// Verschiebung (klein: ein ruhiger Block, den der Encoder überspringt)
const BEWEGUNG = /* glsl */ `uniform sampler2D tA, tB; uniform vec2 uGroesse; uniform float uBlock;
  ${LUMA}
  float l(sampler2D t, vec2 p) { return luma(texture2D(t, p / uGroesse).rgb); }
  void main() {
    vec2 b0 = floor(gl_FragCoord.xy) * uBlock;
    float bester = 1e9, null0 = 0.0; vec2 bv = vec2(0.0);
    for (int dy = -6; dy <= 6; dy++) for (int dx = -6; dx <= 6; dx++) {
      vec2 d = vec2(float(dx), float(dy)); float s = 0.0;
      for (int j = 0; j < 3; j++) for (int i = 0; i < 3; i++) { vec2 p = b0 + (vec2(float(i), float(j)) + 0.5) * (uBlock / 3.0); s += abs(l(tB, p) - l(tA, p - d)); }
      s /= 9.0;
      if (dx == 0 && dy == 0) null0 = s;
      s += 0.006 * length(d);
      if (s < bester) { bester = s; bv = d; }
    }
    gl_FragColor = vec4(bv, bester, null0);
  }`;
// Datamosh 2: decodieren ohne Schlüsselbild – das bisherige Bild, verschoben um die Vektoren der neuen Bilder, plus deren Rest (b − a verschoben),
// quantisiert wie im Codec (kleine Reste fallen weg, sonst wüchse das Rauschen): so tragen nur die Kanten des neuen Materials ihre Farbe ins alte
// Bild. Ruhige Blöcke werden übersprungen – dort bleibt das alte Bild stehen. uVerst > 1 treibt die Bewegung an (das Bild schmilzt)
const MOSH = /* glsl */ `uniform sampler2D tAlt, tMv, tA, tB; uniform vec2 uGroesse, uBloecke; uniform float uBlock, uVerst;
  void main() {
    vec2 p = gl_FragCoord.xy; vec4 m = texture2D(tMv, (floor(p / uBlock) + 0.5) / uBloecke);
    if (m.a < 0.018) { gl_FragColor = vec4(texture2D(tAlt, p / uGroesse).rgb, 1.0); return; }
    vec3 ref = texture2D(tAlt, (p - m.rg * uVerst) / uGroesse).rgb;
    vec3 rest = texture2D(tB, p / uGroesse).rgb - texture2D(tA, (p - m.rg) / uGroesse).rgb;
    rest = sign(rest) * max(abs(rest) - 0.06, 0.0);
    gl_FragColor = vec4(clamp(ref + rest, 0.0, 1.0), 1.0);
  }`;
// Pixel-Sortierung: ein Schritt der Odd-Even-Sortierung je Spalte – Paare (y, y+1), nur wo beide in einer hellen Strecke des Originals liegen
// (die Strecken bleiben, die Punkte wandern); das Hellere nach oben. Viele Schritte nacheinander lassen die Strecken schmelzen
const SORTIEREN = /* glsl */ `uniform sampler2D tZustand, tMaske; uniform vec2 uGroesse; uniform float uParitaet, uSchwelle;
  ${LUMA}
  void main() {
    vec2 p = gl_FragCoord.xy; float y = floor(p.y);
    bool oben = mod(y + uParitaet, 2.0) < 0.5;
    vec2 q = vec2(p.x, oben ? p.y + 1.0 : p.y - 1.0);
    vec4 a = texture2D(tZustand, p / uGroesse);
    if (q.y < 0.0 || q.y > uGroesse.y) { gl_FragColor = a; return; }
    vec4 b = texture2D(tZustand, q / uGroesse);
    if (luma(texture2D(tMaske, p / uGroesse).rgb) < uSchwelle || luma(texture2D(tMaske, q / uGroesse).rgb) < uSchwelle) { gl_FragColor = a; return; }
    float la = luma(a.rgb), lb = luma(b.rgb);
    gl_FragColor = (oben ? la < lb : lb < la) ? b : a;
  }`;
// Makroblöcke: verlorene Slices – ab einem Fehler bis eine, zwei Zeilen weiter (in der Reihenfolge des Decoders) falsche Blöcke: das alte Bild
// verschoben, flach in der Farbe des Blocks mit Grün- oder Magentastich, von der ersten Zeile des Fehlers nach unten gezogen, oder mit dem Muster
// der Quantisierung. Blöcke von 1/30 der Breite (gross genug, um auf dem Telefon zu sehen); wechselt 15-mal je Sekunde; die übrigen grob quantisiert
const BLOECKE = /* glsl */ `uniform sampler2D tBild, tAlt; uniform vec2 uBloecke; uniform float uStaerke, uTick, uHell; varying vec2 vUv;
  float hash(vec3 p) { p = fract(p * vec3(0.1031, 0.1030, 0.0973)); p += dot(p, p.yxz + 33.33); return fract((p.x + p.y) * p.z); }
  vec3 mittel(sampler2D t, vec2 b) { vec3 c = vec3(0.0); for (int j = 0; j < 2; j++) for (int i = 0; i < 2; i++) c += texture2D(t, (b + 0.25 + 0.5 * vec2(float(i), float(j))) / uBloecke).rgb; return c / 4.0; }
  void main() {
    vec2 uv = vec2(vUv.x, 1.0 - vUv.y), g = uv * uBloecke, b = floor(g), f = fract(g);
    vec3 c = texture2D(tBild, uv).rgb;
    float spalten = ceil(uBloecke.x), nr = b.y * spalten + b.x, alle = spalten * ceil(uBloecke.y);
    c = mix(c, floor(c * 7.0 + 0.5) / 7.0, 0.5 * uStaerke);                // grob quantisiert
    for (int k = 0; k < 10; k++) {
      float kk = float(k), an = floor(hash(vec3(kk, uTick, 1.0)) * alle), lang = (1.0 + 4.0 * hash(vec3(kk, uTick, 2.0))) * spalten * uStaerke;
      if (nr < an || nr >= an + lang || hash(vec3(kk, uTick, 9.0)) > 0.5 + 0.5 * uStaerke) continue;
      float art = floor(hash(vec3(kk, uTick, 3.0)) * 4.0);
      vec2 mv = (vec2(hash(vec3(kk, uTick, 4.0)), hash(vec3(kk, uTick, 5.0))) - 0.5) * vec2(10.0, 4.0);
      if (art < 1.0) c = texture2D(tAlt, (g + mv) / uBloecke).rgb;
      else if (art < 2.0) c = mittel(tBild, b) + (hash(vec3(kk, uTick, 6.0)) < 0.5 ? vec3(-0.12, 0.18, -0.12) : vec3(0.16, -0.12, 0.16));
      else if (art < 3.0) c = texture2D(tBild, vec2(uv.x, (floor(an / spalten) + 0.02) / uBloecke.y)).rgb;   // von der ersten Zeile des Fehlers gezogen
      else { vec2 w = floor(vec2(hash(vec3(kk, uTick, 7.0)), hash(vec3(kk, uTick, 8.0))) * 4.0);
             c = mittel(tBild, b) + 0.14 * cos(3.14159 * (f.x * 8.0 + 0.5) * w.x / 8.0) * cos(3.14159 * (f.y * 8.0 + 0.5) * w.y / 8.0); }
      break;
    }
    gl_FragColor = vec4(clamp(c, 0.0, 1.0) * uHell, 1.0);
  }`;
// Slit-Scan: jede Zeile aus einer anderen Zeit – acht Zeitschichten (je zwei Filmbilder zurück), die Verzögerung wächst nach unten und läuft in
// Wellen durchs Bild; Rot etwas jünger, Blau etwas älter (ein Saum in der Zeit)
const SCHLITZ = /* glsl */ `uniform sampler2D tBild, tZ0, tZ1, tZ2, tZ3, tZ4, tZ5, tZ6, tZ7; uniform float uTiefe, uPhase, uHell; varying vec2 vUv;
  vec3 schicht(float i, vec2 uv) {
    if (i < 0.5) return texture2D(tZ0, uv).rgb; if (i < 1.5) return texture2D(tZ1, uv).rgb; if (i < 2.5) return texture2D(tZ2, uv).rgb;
    if (i < 3.5) return texture2D(tZ3, uv).rgb; if (i < 4.5) return texture2D(tZ4, uv).rgb; if (i < 5.5) return texture2D(tZ5, uv).rgb;
    if (i < 6.5) return texture2D(tZ6, uv).rgb; return texture2D(tZ7, uv).rgb;
  }
  vec3 zeit(float d, vec2 uv) { float i = floor(d); return mix(schicht(i, uv), schicht(min(7.0, i + 1.0), uv), d - i); }
  void main() {
    vec2 uv = vec2(vUv.x, 1.0 - vUv.y);
    float w = 0.5 + 0.5 * sin(6.2832 * (uv.y * 1.7 + uv.x * 0.22 - uPhase));
    float d = clamp(uTiefe * 7.0 * (0.55 * uv.y + 0.45 * w), 0.0, 7.0);
    vec3 c = vec3(zeit(max(0.0, d * 0.85), uv).r, zeit(d, uv).g, zeit(min(7.0, d * 1.15), uv).b);
    c = mix(texture2D(tBild, uv).rgb, c, smoothstep(0.0, 0.5, d));        // ohne Verzögerung das scharfe Bild
    gl_FragColor = vec4(c * uHell, 1.0);
  }`;

export function video(g, teil) {
  const film = g.film;                                                       // { bild(t, { vorschau }), karte(t), quelle(q, o), risse, n } oder null (noch kein Video)
  const V = phase(teil, "video"), Lg = phase(teil, "logo"), risse = film?.quelle ? film.risse ?? [] : [];
  const neueTextur = (b) => {
    const t = new THREE.Texture(b);
    t.colorSpace = THREE.SRGBColorSpace; t.flipY = false; t.generateMipmaps = false; t.minFilter = THREE.LinearFilter; t.magFilter = THREE.LinearFilter;
    return t;
  };
  const tex = neueTextur();
  const mat = quadMaterial(BILD, { tBild: { value: tex }, tRiss: { value: null }, tMaske: { value: null }, uHell: { value: 0 }, uTempo: { value: 1 }, uRiss: { value: 0 }, uMaske: { value: 0 } });
  const kopie = quadMaterial(KOPIE, { tQuelle: { value: null }, uGroesse: { value: new THREE.Vector2() } });
  const bewegung = quadMaterial(BEWEGUNG, { tA: { value: null }, tB: { value: null }, uGroesse: { value: new THREE.Vector2() }, uBlock: { value: 8 } });
  const mosh = quadMaterial(MOSH, { tAlt: { value: null }, tMv: { value: null }, tA: { value: null }, tB: { value: null }, uGroesse: { value: new THREE.Vector2() }, uBloecke: { value: new THREE.Vector2() }, uBlock: { value: 8 }, uVerst: { value: 1 } });
  const sortieren = quadMaterial(SORTIEREN, { tZustand: { value: null }, tMaske: { value: null }, uGroesse: { value: new THREE.Vector2() }, uParitaet: { value: 0 }, uSchwelle: { value: 0.3 } });
  const bloecke = quadMaterial(BLOECKE, { tBild: { value: tex }, tAlt: { value: null }, uBloecke: { value: new THREE.Vector2(30, (30 * g.H) / g.B) }, uStaerke: { value: 0 }, uTick: { value: 0 }, uHell: { value: 1 } });
  const schlitz = quadMaterial(SCHLITZ, { tBild: { value: tex }, uTiefe: { value: 0 }, uPhase: { value: 0 }, uHell: { value: 1 },
    ...Object.fromEntries(Array.from({ length: SCHICHTEN }, (_, j) => [`tZ${j}`, { value: null }])) });
  let zuletzt = null;

  // die kleinen Bilder der Cracks als Texturen, die zuletzt gebrauchten behalten (jede Bitmap wird nur einmal hochgeladen)
  const texturen = new Map();
  function textur(b) {
    if (!b) return null;
    let t = texturen.get(b);
    if (t) { texturen.delete(b); texturen.set(b, t); return t; }
    t = neueTextur(b); t.needsUpdate = true; texturen.set(b, t);
    while (texturen.size > 28) { const [k, alt] = texturen.entries().next().value; alt.dispose(); texturen.delete(k); }
    return t;
  }
  const klein = (q) => textur(film.quelle(q, { vorschau: true }));
  // Ziele in halber Grösse (wie die kleinen Bilder der Filmspur)
  const w = Math.max(2, Math.round(g.B / 2)), h = Math.max(2, Math.round(g.H / 2)), groesse = new THREE.Vector2(w, h);
  const ziele = {};
  const zielVon = (name, nw = w, nh = h, opt = {}) => (ziele[name] ??= ziel(nw, nh, opt));
  const nachZiel = (t, rt) => { kopie.uniforms.tQuelle.value = t; kopie.uniforms.uGroesse.value.copy(groesse); g.pass(kopie, rt); };

  // ——— Datamosh: Schritt für Schritt vom stehenden Bild aus; gemerkt wird der letzte Schritt (und der davor, für die Proben des Verschlusses) ———
  const M = { i: -1, s: -1, a: 0, genau: false };
  const bl = 8, bloeckeMv = new THREE.Vector2(Math.ceil(w / bl), Math.ceil(h / bl));
  function moshen(c, vorschau) {
    const { riss, schritt, i } = c, rt = [zielVon("mosh0"), zielVon("mosh1")];
    if (M.i === i && M.s - 1 === schritt && M.s > 0 && (vorschau || M.genau)) return rt[1 - M.a].texture;   // der Schritt davor liegt noch im anderen Ziel
    if (M.i !== i || M.s > schritt || (!vorschau && !M.genau)) {
      const t0 = klein(moshQuellen(riss, 0, film.karte).q0);
      if (!t0) return null;
      nachZiel(t0, rt[0]); M.i = i; M.s = 0; M.a = 0; M.genau = !vorschau;
    }
    if (M.s < schritt) {
      const { paare } = moshQuellen(riss, schritt, film.karte), mv = zielVon("mv", bloeckeMv.x, bloeckeMv.y, { minFilter: THREE.NearestFilter, magFilter: THREE.NearestFilter });
      const bu = bewegung.uniforms, mu = mosh.uniforms;
      for (let j = M.s + 1; j <= schritt; j++) {
        const [qa, qb] = paare[j - 1], A = klein(qa), B = klein(qb);
        if (!A || !B) break;
        bu.tA.value = A; bu.tB.value = B; bu.uGroesse.value.copy(groesse); bu.uBlock.value = bl;
        g.pass(bewegung, mv);
        mu.tAlt.value = rt[M.a].texture; mu.tMv.value = mv.texture; mu.tA.value = A; mu.tB.value = B; mu.uGroesse.value.copy(groesse); mu.uBloecke.value.copy(bloeckeMv);
        mu.uBlock.value = bl; mu.uVerst.value = 1 + 0.3 * Math.min(1, j / (TAKT * (riss.bis - riss.von)));
        g.pass(mosh, rt[1 - M.a]);
        M.a = 1 - M.a; M.s = j;
      }
    }
    return rt[M.a].texture;
  }
  // ——— Pixel-Sortierung: vom Bild aus so viele Schritte, wie weit der Crack ist (bis 120), die Schwelle sinkt: es schmilzt immer mehr ———
  function sortiert(t, u) {
    const orig = klein(film.karte(t));
    if (!orig) return null;
    const maske = zielVon("maske"), rt = [zielVon("sort0"), zielVon("sort1")];
    nachZiel(orig, maske); nachZiel(orig, rt[0]);
    const schritte = Math.round(120 * Math.min(1, u / 0.85) ** 0.75), s = sortieren.uniforms, schwelle = 0.32 - 0.2 * u;
    s.tMaske.value = maske.texture; s.uGroesse.value.copy(groesse); s.uSchwelle.value = schwelle;
    let a = 0;
    for (let k = 0; k < schritte; k++) { s.tZustand.value = rt[a].texture; s.uParitaet.value = k % 2; g.pass(sortieren, rt[1 - a]); a = 1 - a; }
    return { textur: rt[a].texture, maske: maske.texture, schwelle };
  }

  return {
    render(rt, tau, { vorschau = false } = {}) {
      const t = tau + VOR, logo = !!Lg && tau >= Lg[0];
      // im Logo taucht das Bild in 0,8 s ins Schwarz (es läuft dabei weiter)
      const aus = logo ? 1 - weich(anteil(tau - Lg[0], 0, 0.8)) : 1;
      const b = film && aus > 0 ? film.bild(t, { vorschau }) : null;
      if (b && b !== zuletzt) {
        // eine andere Grösse (Vorschau halb, Export ganz): die Grafik legt den Speicher einer Textur fest an – ohne neue Textur schlug jedes
        // Hochladen fehl (GL_INVALID_VALUE), und nach der Vorschau zeigte der Export ein stehendes Bild
        if (zuletzt && (zuletzt.width !== b.width || zuletzt.height !== b.height)) tex.dispose();
        tex.image = b; tex.needsUpdate = true; zuletzt = b;
      }
      g.loeschen(rt, 0x000000);
      // der Fader des Scratchs: zu ist das Bild dunkel, nicht ganz schwarz (das Auge hält die Platte)
      const fader = film?.hell ? 0.08 + 0.92 * film.hell(t) : 1;
      const hell = zuletzt ? aus * fader * weich(anteil(tau, 0, Math.min(0.25, V[1]))) : 0;
      const leer = { aktiv: 0, bloom: 0, radius: 0.3, saum: 0, ende: 0, umkehr: 0 };
      if (hell <= 0) return leer;
      const c = !logo ? rissBei(risse, t) : null, u = mat.uniforms;
      u.uHell.value = hell; u.uTempo.value = film?.tempo ? film.tempo(t) : 1; u.uRiss.value = 0; u.uMaske.value = 0;
      if (c?.riss.art === "bloecke") {
        const bu = bloecke.uniforms, ein = Math.min(1, c.u / 0.06) * (1 - weich(anteil(c.u, 0.62, 1))), tick = Math.floor(t * 15);
        bu.tAlt.value = klein(film.karte(moshZeit(c.riss, 0))) ?? tex; bu.uTick.value = tick; bu.uHell.value = hell;
        bu.uStaerke.value = ein * (0.6 + 0.4 * ((tick * 0.618) % 1));          // flackert
        g.pass(bloecke, rt);
      } else if (c?.riss.art === "schlitz") {
        const su = schlitz.uniforms;
        for (let j = 0; j < SCHICHTEN; j++) su[`tZ${j}`].value = klein(film.karte(Math.max(0, t - (j * ABSTAND) / TAKT))) ?? tex;
        su.uTiefe.value = Math.sin(Math.PI * c.u) ** 0.8; su.uPhase.value = c.u * 1.5; su.uHell.value = hell;
        g.pass(schlitz, rt);
      } else {
        if (c?.riss.art === "mosh") { const m = moshen(c, vorschau); if (m) { u.tRiss.value = m; u.uRiss.value = 1; } }
        if (c?.riss.art === "sortieren") { const s = sortiert(t, c.u); if (s) { u.tRiss.value = s.textur; u.tMaske.value = s.maske; u.uMaske.value = s.schwelle; u.uRiss.value = 1; } }
        g.pass(mat, rt);
      }
      return leer;
    },
    /** Schlüssel der Lage für die Bewegungsunschärfe: der Abschnitt des Fahrplans – sie mischt entlang der Bewegung (der Scratch verschmiert), nie über
     *  einen Schnitt; in einem Crack der Crack (er springt in sich, mischt aber nie mit dem Bild davor) */
    lage(tau) {
      const c = rissBei(risse, tau + VOR);
      return c ? -1 - c.i : film?.abschnitt ? film.abschnitt(tau + VOR) : 0;
    },
    vorab: { szenen: [], materialien: [mat, ...(risse.length ? [kopie, bewegung, mosh, sortieren, bloecke, schlitz] : [])] },
    zaehler(tau) {
      if (!film) return "video · noch keins gewählt";
      const q = film.karte(tau + VOR), m = Math.floor(q / 60), s = (q % 60).toFixed(2).padStart(5, "0"), c = rissBei(risse, tau + VOR);
      return `video · bild ${Math.min(film.n, (film.index?.(tau + VOR) ?? 0) + 1)} / ${film.n} · quelle ${m}:${s}${c ? ` · ${NAMEN[c.riss.art].toLowerCase()}` : ""}`;
    },
    entsorgen() {
      for (const m of [mat, kopie, bewegung, mosh, sortieren, bloecke, schlitz]) m.dispose();
      tex.dispose();
      for (const t of texturen.values()) t.dispose();
      for (const r of Object.values(ziele)) r.dispose();
    },
  };
}
