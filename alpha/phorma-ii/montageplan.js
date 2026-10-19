// PHORMA II – der Plan der Montage (ohne Grafik, für die Tests; gezeichnet wird in montage.js). Wunsch vom 19. Oktober 2026 nach dem Clip «UVA»
// («eine neue Animation für Bilder … in diesem Stil»): das Foto zerfällt in verschachtelte Rechtecke, jedes zeigt einen eigenen Ausschnitt –
// vergrössert, versetzt, von anderswo oder zu Streifen gezogen –, mit feinen hellen Rändern und kleinen Zahlentafeln; im Takt harte Schnitte zu
// einer neuen Aufteilung (sie wächst in wenigen Bildern, die groben Teilungen zuerst), dazwischen gleiten die Ausschnitte nur leicht, einzelne
// zucken auf dem Schlag.
//   Felder   wo das Motiv ist (Tiefe: nah, und Kanten), wird fein geteilt, sonst grob; ausserhalb einer Zone um das Motiv bleibt das Foto
//   Arten    still (der Ausschnitt an seinem Ort), zoom, versatz, fern (eine andere Stelle des Motivs), zug (die Punkte ab einer Linie zu Streifen
//            gezogen); dazu Ausreisser: schmale Streifen, die seitlich aus dem Motiv geschoben sind
//   Ablauf   01 Schnitte – auf jedem Schlag ein Schnitt, immer mehr Felder (als erster Effekt erscheinen sie einzeln aus dem Dunkeln)
//            02 Montage – Schnitte nach einem bis drei Schlägen, dicht und licht im Wechsel, manchmal doppelt (Stottern); Raster und Streifen
//            03 Bild – die letzte Aufteilung bleibt, die Felder rasten nacheinander an ihrem Platz ein, das Foto steht
// Lage in Bildkoordinaten: x 0..1 über die Breite, y 0..1 von oben nach unten. Alles wiederholbar: dasselbe Foto ergibt denselben Film.
import { zufall } from "./analyse.js?v=24";
import { anteil, phase } from "./ablauf.js?v=24";
// die S-Kurve wie in gemeinsam.js (das «weich» von ablauf.js läuft stark aus: damit setzte das Einrasten ins Foto viel zu früh ein)
const weich = (x) => x * x * (3 - 2 * x);

/** ein Schlag (Sekunden bei Tempo «normal»); fürs Signet am Schluss doppelt so schnell */
export const TAKT = 0.5, SIGNET_TAKT = 0.25;
/** höchstens so viele Felder (mit Grund und Ausreissern) */
export const HOECHSTENS = 400;
const KLEINST = 0.014;   // kleinste Seite eines Felds (Anteil der Breite)

/** Wichtigkeit je Zelle eines groben Rasters (gw × gh) aus der Analyse: nah und kantig; normiert auf 0..1 (95 %), mit Summenbild */
export function wichtigkeit(A, gw = 48) {
  const gh = Math.max(4, Math.round((gw * A.h) / A.w)), v = new Float32Array(gw * gh), n = new Float32Array(gw * gh);
  for (let y = 0; y < A.h; y++) for (let x = 0; x < A.w; x++) {
    const i = y * A.w + x, k = Math.min(gh - 1, Math.floor((y * gh) / A.h)) * gw + Math.min(gw - 1, Math.floor((x * gw) / A.w));
    v[k] += 0.65 * A.tiefe[i] ** 2 + 0.35 * A.nahrung[i]; n[k]++;
  }
  for (let k = 0; k < v.length; k++) v[k] /= n[k] || 1;
  const s = [...v].sort((a, b) => a - b), lo = s[Math.floor(s.length * 0.1)], hi = s[Math.floor(s.length * 0.95)];
  for (let k = 0; k < v.length; k++) v[k] = Math.min(1, Math.max(0, (v[k] - lo) / (hi - lo || 1)));
  const I = new Float64Array((gw + 1) * (gh + 1));
  for (let y = 0; y < gh; y++) for (let x = 0; x < gw; x++) I[(y + 1) * (gw + 1) + x + 1] = v[y * gw + x] + I[y * (gw + 1) + x + 1] + I[(y + 1) * (gw + 1) + x] - I[y * (gw + 1) + x];
  // die Zone des Motivs: alle Zellen über dem 70. Perzentil
  const g = Math.max(0.35, Math.min(1, Math.max(0, (s[Math.floor(s.length * 0.7)] - lo) / (hi - lo || 1))));
  let x0 = 1, y0 = 1, x1 = 0, y1 = 0;
  for (let y = 0; y < gh; y++) for (let x = 0; x < gw; x++) if (v[y * gw + x] >= g && v[y * gw + x] > 0) { x0 = Math.min(x0, x / gw); y0 = Math.min(y0, y / gh); x1 = Math.max(x1, (x + 1) / gw); y1 = Math.max(y1, (y + 1) / gh); }
  if (x1 - x0 < 0.2 || y1 - y0 < 0.2) [x0, y0, x1, y1] = [0.15, 0.1, 0.85, 0.9];
  return { gw, gh, v, I, motiv: [x0, y0, x1, y1] };
}

/** mittlere Wichtigkeit in einem Rechteck */
export function mittel(G, [x0, y0, x1, y1]) {
  const { gw, gh, I } = G, X0 = Math.max(0, Math.min(gw, Math.round(x0 * gw))), X1 = Math.max(X0 + 1, Math.min(gw, Math.round(x1 * gw)));
  const Y0 = Math.max(0, Math.min(gh, Math.round(y0 * gh))), Y1 = Math.max(Y0 + 1, Math.min(gh, Math.round(y1 * gh)));
  const s = I[Y1 * (gw + 1) + X1] - I[Y0 * (gw + 1) + X1] - I[Y1 * (gw + 1) + X0] + I[Y0 * (gw + 1) + X0];
  return s / ((X1 - X0) * (Y1 - Y0));
}

/** die Schnitte in der eigenen Zeit des Effekts: [{ t, n (Felder), wucht (0..1), dicht }] */
export function schnitte(teil, { takt = TAKT, n0 = 3, licht = true, durch = false } = {}) {
  const S = phase(teil, "schnitte"), M = phase(teil, "montage"), Bp = phase(teil, "bild"), r = zufall(1709), liste = [];
  const bis = durch && Bp ? Bp[1] : M[1];   // durch: auch in der letzten Phase weiter schneiden (vor dem Signet, ohne Einrasten)
  const nS = Math.max(2, Math.round((S[1] - S[0]) / takt));
  const w0 = n0 > 3 ? 0.8 : 0.35;   // nach einem anderen Effekt gleich kräftig: sonst sieht der Anfang aus wie das fertige Foto
  for (let i = 0; i < nS; i++) { const f = i / (nS - 1); liste.push({ t: S[0] + i * takt, n: Math.round(n0 * (30 / n0) ** f), wucht: w0 + (0.75 - w0) * f, dicht: false }); }
  let t = M[0], k = 0;
  while (t < bis - takt * 0.9) {
    const locker = licht && k % 3 === 2, schritt = [1, 1, 2, 2, 3][Math.floor(r() * 5)];   // öfter geschnitten (seit 19. Oktober 2026)
    liste.push({ t, n: locker ? 10 + Math.floor(r() * 12) : 40 + Math.floor(r() * 90), wucht: 0.7 + 0.3 * r(), dicht: !locker });
    // Doppelschnitt (Wunsch vom 19. Oktober 2026: «abwechslungsreicher»): kurz nach dem Schlag gleich noch einmal, wie ein Stottern
    if (!locker && schritt > 1 && r() < 0.6) liste.push({ t: t + 0.3 * takt, n: 30 + Math.floor(r() * 80), wucht: 0.8 + 0.2 * r(), dicht: true, stotter: true });
    t += schritt * takt; k++;
  }
  // die letzte Aufteilung bleibt fürs Einrasten stehen: dicht
  const letzt = liste.at(-1);
  if (k > 0 && !letzt.dicht) Object.assign(letzt, { n: 60 + Math.floor(r() * 40), dicht: true });
  return liste;
}

/** der Ausschnitt eines Felds: q = (p − anker) / z + anker + o (p: Lage im Bild), dazu ein leises Gleiten je Sekunde (dz, dx, dy) */
export const GLEICH = Object.freeze({ z: 1, ax: 0.5, ay: 0.5, ox: 0, oy: 0, dz: 0, dx: 0, dy: 0 });
const gleiten = (r) => ({ dz: 0.07 * r(), dx: (r() - 0.5) * 0.012, dy: (r() - 0.5) * 0.008 });

/** ein neuer Ausschnitt für ein Feld, aus dem des Elternfelds: näher heran (selten weiter weg), verschoben oder zurück an seinen Ort */
function neuerAusschnitt(tf, rect, r) {
  const cx = (rect[0] + rect[2]) / 2, cy = (rect[1] + rect[3]) / 2, z = r();
  if (z < 0.55) {
    const f = r() < 0.12 ? 0.72 + 0.15 * r() : 1.15 + 0.6 * r();   // nicht zu nah: sonst wird das Foto weich (Wunsch: «etwas schärfer»)
    return { z: Math.min(2.3, tf.z * f), ax: cx, ay: cy, ox: tf.ox + (r() - 0.5) * 0.04, oy: tf.oy + (r() - 0.5) * 0.04, ...gleiten(r) };
  }
  if (z < 0.9) return { ...tf, ox: tf.ox + (r() - 0.5) * 0.16, oy: tf.oy + (r() - 0.5) * 0.1, ...gleiten(r) };   // seltener zurück an den Ort (abwechslungsreicher)
  return { ...GLEICH };
}

/**
 * Rechtecke teilen, bis es n Felder sind: wichtige und grosse zuerst, meist quer zur langen Seite, manchmal in schmale Streifen (a = B / H).
 * Jedes Teilfeld erbt meist den Ausschnitt seines Elternfelds – dann laufen nur die feinen Ränder über ein zusammenhängendes Stück, wie im Clip –,
 * sonst bekommt es einen eigenen; Streifen werden oft gegeneinander verschoben. → [{ rect, stufe, tf }]
 */
export function zerlegen(G, zone, n, r, a) {
  const felder = [{ rect: zone, stufe: 0, tf: { ...GLEICH } }];
  let schritte = 0;
  while (felder.length < n && schritte++ < n * 4) {
    let beste = -1, bw = -1;
    for (let i = 0; i < felder.length; i++) {
      const [x0, y0, x1, y1] = felder[i].rect, bx = (x1 - x0) * a, by = y1 - y0;
      if (Math.max(bx, by) < KLEINST * a * 2) continue;
      const w = (bx * by) ** 0.7 * (0.08 + mittel(G, felder[i].rect)) ** 1.3 * (0.6 + 0.8 * r());
      if (w > bw) { bw = w; beste = i; }
    }
    if (beste < 0) break;
    const f = felder[beste], [x0, y0, x1, y1] = f.rect, bx = (x1 - x0) * a, by = y1 - y0;
    let quer = bx > by;
    if (r() < 0.25) quer = !quer;
    if ((quer ? bx : by) < KLEINST * a * 2) quer = !quer;
    const neu = [];
    if (r() < 0.14 && (quer ? bx : by) > KLEINST * a * 8) {
      // Streifen: vier bis acht schmale nebeneinander, oft je ein wenig längs verschoben
      const k = 4 + Math.floor(r() * 5), schieben = r() < 0.6;
      let p = 0;
      const teile = Array.from({ length: k }, () => 0.5 + r()), summe = teile.reduce((s, x) => s + x, 0);
      for (const tl of teile) {
        const q = p + tl / summe, rect = quer ? [x0 + (x1 - x0) * p, y0, x0 + (x1 - x0) * q, y1] : [x0, y0 + (y1 - y0) * p, x1, y0 + (y1 - y0) * q];
        const d = (r() - 0.5) * 0.07, tf = schieben ? { ...f.tf, ox: f.tf.ox + (quer ? 0 : d), oy: f.tf.oy + (quer ? d : 0) } : f.tf;
        neu.push({ rect, stufe: f.stufe + 1, tf });
        p = q;
      }
    } else {
      const s = r() < 0.18 ? (r() < 0.5 ? 0.12 : 0.88) : 0.3 + 0.4 * r();
      for (const rect of [quer ? [x0, y0, x0 + (x1 - x0) * s, y1] : [x0, y0, x1, y0 + (y1 - y0) * s], quer ? [x0 + (x1 - x0) * s, y0, x1, y1] : [x0, y0 + (y1 - y0) * s, x1, y1]])
        neu.push({ rect, stufe: f.stufe + 1, tf: f.stufe > 0 && r() < 0.55 ? f.tf : neuerAusschnitt(f.tf, rect, r) });   // die erste Teilung nie unverändert
    }
    felder.splice(beste, 1, ...neu);
  }
  return felder;
}

/** wohin ein Feld zur Zeit seit (Sekunden nach dem Schnitt) schaut: [cx, cy, sx, sy]; fern: eine eigene Stelle */
export function ausschnitt(f, seit = 0) {
  const [x0, y0, x1, y1] = f.rect, w = x1 - x0, h = y1 - y0, t = f.tf, g = 1 + t.dz * seit;
  if (f.ziel) return [f.ziel[0] + t.dx * seit, f.ziel[1] + t.dy * seit, f.ziel[2] / g, f.ziel[3] / g];
  const z = t.z * g, cx = (x0 + x1) / 2, cy = (y0 + y1) / 2;
  return [(cx - t.ax) / z + t.ax + t.ox + t.dx * seit, (cy - t.ay) / z + t.ay + t.oy + t.dy * seit, w / z, h / z];
}

/** die Arten des Bilds in einem Feld (montage.js zeichnet sie): 0 normal */
export const STIL = { spiegel: 1, pixel: 2, kanal: 3, negativ: 4, hart: 5 };

/** Grenzen mit zufälligen Breiten: k Teile von 0 bis 1 */
function teilung(k, r) {
  const g = Array.from({ length: k }, () => 0.6 + r()), s = g.reduce((x, y) => x + y, 0), raus = [0];
  for (let i = 0, p = 0; i < k; i++) { p += g[i] / s; raus.push(i === k - 1 ? 1 : p); }
  return raus;
}
/** ein Raster über die Zone, ungleich breite Spalten, je Zeile verschoben und manche Zellen näher heran (wie ein gesprungener Spiegel) */
function raster(zone, n, r, a) {
  const [x0, y0, x1, y1] = zone, seite = ((x1 - x0) * a) / (y1 - y0), sp = Math.max(2, Math.round(Math.sqrt(n * seite) * 0.8)), ze = Math.max(2, Math.round(n / sp * 0.8));
  const xs = teilung(sp, r), ys = teilung(ze, r), raus = [];
  for (let j = 0; j < ze; j++) {
    const zeile = { ...GLEICH, ox: (r() - 0.5) * 0.08, oy: (r() - 0.5) * 0.02, ...gleiten(r) };
    for (let i = 0; i < sp; i++) {
      const rect = [x0 + (x1 - x0) * xs[i], y0 + (y1 - y0) * ys[j], x0 + (x1 - x0) * xs[i + 1], y0 + (y1 - y0) * ys[j + 1]];
      raus.push({ rect, stufe: 1 + (j % 3), tf: r() < 0.3 ? neuerAusschnitt(zeile, rect, r) : zeile });
    }
  }
  return raus;
}
/** durchgehende Streifen über die Zone (quer oder hoch), jeder längs verschoben, manche näher heran */
function streifen(zone, n, r, a) {
  const [x0, y0, x1, y1] = zone, quer = r() < 0.6, k = 8 + Math.floor(r() * Math.min(18, n / 3)), ts = teilung(k, r), raus = [];
  for (let i = 0; i < k; i++) {
    const rect = quer ? [x0, y0 + (y1 - y0) * ts[i], x1, y0 + (y1 - y0) * ts[i + 1]] : [x0 + (x1 - x0) * ts[i], y0, x0 + (x1 - x0) * ts[i + 1], y1];
    const d = (r() - 0.5) * 0.14, f = r() < 0.2 ? 1.2 + 0.4 * r() : 1, cx = (rect[0] + rect[2]) / 2, cy = (rect[1] + rect[3]) / 2;
    raus.push({ rect, stufe: 1 + (i % 4), tf: { z: f, ax: cx, ay: cy, ox: quer ? d : 0, oy: quer ? 0 : d, ...gleiten(r) } });
  }
  return raus;
}

/** eine Stelle des Motivs, nach Wichtigkeit gezogen → [x, y] */
function stelle(G, r) {
  let summe = 0;
  for (let k = 0; k < G.v.length; k++) summe += G.v[k] ** 2;
  let z = r() * summe;
  for (let k = 0; k < G.v.length; k++) { z -= G.v[k] ** 2; if (z <= 0) return [((k % G.gw) + r()) / G.gw, (Math.floor(k / G.gw) + r()) / G.gh]; }
  return [0.5, 0.5];
}

/**
 * Eine Aufteilung: die Zone um das Motiv (je Schnitt etwas anders, manchmal bis an den Rand), darin die Felder, jedes mit seiner Art und seinem
 * Ausschnitt; dazu Ausreisser und die Zahlentafeln. → { zone, felder: [{ rect, stufe, art, tf, ziel (nur fern), zug, an, verzug, schnapp, rand }],
 * ausreisser, tafeln }
 */
export function aufteilung(G, schnitt, samen, a, raender = true) {
  const r = zufall(samen), [m0, m1, m2, m3] = G.motiv, mw = m2 - m0, mh = m3 - m1;
  const zone = [m0 - mw * (0.02 + 0.12 * r()), m1 - mh * (0.04 + 0.08 * r()), m2 + mw * (0.02 + 0.12 * r()), m3 + mh * (0.02 + 0.1 * r())];
  const bisRand = r() < 0.25, links = r() < 0.5, unten = r() < 0.3;
  if (raender && bisRand) { if (links) zone[0] = 0; else zone[2] = 1; }   // bis an den linken oder rechten Rand, wie die Streifen im Clip
  if (raender && unten) zone[3] = 1;
  for (let i = 0; i < 4; i++) zone[i] = Math.min(1, Math.max(0, zone[i]));
  // das Muster der Aufteilung (seit 19. Oktober 2026 abwechslungsreicher): meist geteilt nach Wichtigkeit, manchmal ein Raster oder durchgehende
  // Streifen (für das Signet immer geteilt)
  const wahl = r(), muster = !raender || schnitt.n < 12 ? "baum" : wahl < 0.16 ? "raster" : wahl < 0.32 ? "streifen" : "baum";
  const roh = muster === "raster" ? raster(zone, schnitt.n, r, a) : muster === "streifen" ? streifen(zone, schnitt.n, r, a) : zerlegen(G, zone, schnitt.n, r, a), felder = [];
  for (const { rect, stufe, tf } of roh) {
    const [x0, y0, x1, y1] = rect, w = x1 - x0, h = y1 - y0, schmal = Math.max((w * a) / h, h / (w * a)) > 3.5, z = r();
    const f = { rect, stufe, tf, ziel: null, zug: [0, 0, 0], art: tf.z === 1 && !tf.ox && !tf.oy ? "still" : tf.z !== 1 ? "zoom" : "versatz" };
    if (z < 0.07) { const [px, py] = stelle(G, r), k = 1 + 0.8 * r(); Object.assign(f, { art: "fern", ziel: [px, py, w / k, h / k], tf: { ...GLEICH, ...gleiten(r) } }); }
    else if (z < (schmal ? 0.32 : 0.17)) {
      // gezogen: ab einer Linie werden die Punkte zu Streifen, quer meist in langen Feldern
      const quer = (w * a) / h > 1.2 ? r() < 0.8 : r() < 0.3;
      Object.assign(f, { art: "zug", zug: [quer ? 1 : 2, 0.08 + 0.4 * r(), r() < 0.5 ? 1 : -1] });
    }
    // die groben Felder sofort, die feinen wachsen nach (sonst blitzte bei jedem Schnitt kurz das ganze Foto auf)
    Object.assign(f, { an: r(), verzug: stufe <= 2 ? 0 : Math.min(0.12, (stufe - 2) * 0.02 + r() * 0.03), schnapp: r(), rand: f.art === "still" && r() < 0.4 ? 0.3 : 0.45 + 0.4 * r() });
    // die Art des Bilds im Feld: gespiegelt, verpixelt, Farbkanäle versetzt, hart schwarzweiss; mit Video zeigt manches Feld eine frühere Stelle
    const s2 = r();
    f.stil = s2 < 0.06 ? STIL.spiegel : s2 < 0.12 ? STIL.pixel : s2 < 0.2 ? STIL.kanal : s2 < 0.25 ? STIL.hart : 0;
    f.zeit = r() < 0.3 ? (r() < 0.5 ? 1 : 2) : 0;
    felder.push(f);
  }
  // Ausreisser: schmale Streifen, seitlich aus dem Motiv geschoben (sie zeigen weiter, was an ihrem Ort war), ihre Punkte nach aussen gezogen
  const ausreisser = [];
  if (schnitt.dicht && r() < 0.6) {
    const quer = felder.filter((f) => ((f.rect[2] - f.rect[0]) * a) / (f.rect[3] - f.rect[1]) > 2.5);
    for (let k = 0, m = Math.min(quer.length, 2 + Math.floor(r() * 5)); k < m; k++) {
      const f = quer[Math.floor(r() * quer.length)], [x0, y0, x1, y1] = f.rect, d = (r() < 0.5 ? -1 : 1) * (0.06 + 0.22 * r());
      ausreisser.push({ rect: [x0 + d, y0, x1 + d, y1], stufe: 6, art: "zug", tf: { ...GLEICH }, ziel: ausschnitt(f), zug: [1, d < 0 ? 0.5 + 0.3 * r() : 0.2 - 0.15 * r(), d < 0 ? -1 : 1],
        an: r(), verzug: 0.2 + r() * 0.1, schnapp: r() * 0.5, rand: 0.6 + 0.3 * r(), stil: 0, zeit: 0 });
    }
  }
  // Zahlentafeln: in ruhigen Stellen (wenig Wichtigkeit) nahe der Zone, nicht unter der Beschriftung oben und unten; je ein Kopf und Zeilen mit
  // den Zahlen der Felder
  const tafeln = [];
  for (let versuch = 0, m = 2 + Math.floor(r() * 5); versuch < 60 && tafeln.length < m; versuch++) {
    const x = Math.min(0.86, Math.max(0.02, zone[r() < 0.5 ? 0 : 2] + (r() - 0.5) * 0.3)), y = 0.08 + r() * 0.74, tw = 0.14, th = 0.06 + 0.05 * r();
    if (mittel(G, [x, y, x + tw, y + th]) > 0.3 || tafeln.some((t) => Math.abs(t.x - x) < tw && Math.abs(t.y - y) < 0.12)) continue;
    const f = felder[Math.floor(r() * felder.length)], i = Math.floor(r() * 900) + 10, zeilen = [r() < 0.5 ? "index  x  y  z" : "index  a  b  c  d", String(i)];
    // die Zahlen der Felder, wie ein Programm sie ausgibt (mit den Resten der Gleitkommazahlen: 0.30000000000000004)
    for (let j = 0, k = 2 + Math.floor(r() * 4); j < k; j++) zeilen.push(String(Math.round(ausschnitt(f)[j % 4] * 20) * 0.05 + 0.1 * (1 + Math.floor(r() * 4))));
    if (r() < 0.3) zeilen.push(`>> proc[${i}] area[${Math.round((f.rect[2] - f.rect[0]) * (f.rect[3] - f.rect[1]) * 1e4)}]`);
    tafeln.push({ x, y, zeilen, rahmen: r() < 0.4 });
  }
  return { zone, felder, ausreisser, tafeln, muster };
}

/**
 * Der ganze Plan zu einem Teil der Kette (G: wichtigkeit(A), a = B / H, samen: je Foto, takt: Sekunden je Schlag, n0: Felder beim ersten Schnitt,
 * raender: die Zone darf bis an den Rand reichen, licht: auch lockere Aufteilungen, durch: nicht einrasten, bis zum Ende schneiden – vor dem Signet;
 * sofort: der erste Schnitt ohne Aufbau – nahtlos nach einer anderen Montage)
 */
export function montagePlan(G, teil, { a = 0.8, samen = 1, takt = TAKT, n0 = 3, raender = true, licht = true, durch = false, sofort = false } = {}) {
  const S = phase(teil, "schnitte"), Bp = phase(teil, "bild");
  const liste = schnitte(teil, { takt, n0, licht, durch }).map((s, k) => ({ ...s, ...aufteilung(G, s, samen * 7919 + k * 104729 + 13, a, raender) }));
  return { teil, S, Bp: durch ? null : Bp, schnitte: liste, erst: teil.erst, vonFoto: teil.vonFoto, a, takt, sofort };
}

/** welcher Schnitt zur eigenen Zeit tau gilt (vor dem ersten: der erste) */
export function schnittBei(plan, tau) {
  let k = 0;
  for (let i = 0; i < plan.schnitte.length; i++) if (plan.schnitte[i].t <= tau + 1e-9) k = i;
  return k;
}

const hash = (n) => { let x = Math.imul(n ^ 0x9e3779b9, 0x85ebca6b) >>> 0; x = Math.imul(x ^ (x >>> 13), 0xc2b2ae35) >>> 0; return ((x ^ (x >>> 16)) >>> 0) / 4294967296; };

/**
 * Die Felder zur eigenen Zeit tau, fertig zum Zeichnen. Jedes: { rect, quelle: [cx, cy, sx, sy], zug: [achse 0/1/2, ab, richtung], licht, rand };
 * das erste ist der Grund (das ganze Foto). → { k, schnitt, felder, tafelSicht, ende, ruck (0..1 gleich nach dem Schnitt) }
 */
export function montageBei(plan, tau) {
  const k = schnittBei(plan, tau), s = plan.schnitte[k], seit = Math.max(0, tau - s.t), { S, Bp, erst } = plan;
  // erst: der Grund kommt nach den ersten Feldern aus dem Dunkeln
  const grundLicht = erst ? weich(anteil(tau, 0.9, 2.0)) : 1;
  const raus = []; raus.push({ rect: [0, 0, 1, 1], quelle: [0.5, 0.5, 1, 1], zug: [0, 0, 0], licht: grundLicht, rand: 0, stil: 0, zeit: 0 });
  const schlag = Math.floor(seit / plan.takt), streu = Bp ? Math.max(0.3, Bp[1] - Bp[0] - 1.1) : 0;
  const einrasten = (f) => (Bp ? weich(anteil(tau, Bp[0] + 0.1 + f.schnapp * streu, Bp[0] + 0.45 + f.schnapp * streu)) : 0);
  // vom Foto her (nach dem Tuch) bauen sich die Felder auf; nach einem anderen Effekt sind sie gleich da (er wird weggeschnitten)
  const wucht = s.wucht * (k === 0 && plan.vonFoto ? weich(anteil(tau, S[0], S[0] + 0.4)) : 1);
  const eins = (f, i, ausreisser) => {
    const [x0, y0, x1, y1] = f.rect, w = x1 - x0, h = y1 - y0, cx = (x0 + x1) / 2, cy = (y0 + y1) / 2;
    // nach einem Schnitt wächst die neue Aufteilung in wenigen Bildern: zuerst die groben Teilungen, dann die feinen (wie im Clip)
    const auf = (k > 0 || !erst) && !(k === 0 && plan.sofort) ? weich(anteil(seit, f.verzug - 0.05, f.verzug)) : 1;
    const e = einrasten(f), m = wucht * (1 - e) * auf;
    // der Ausschnitt mit leisem Gleiten, dazu auf manchen Schlägen ein Zucken
    let [zx, zy, sx, sy] = ausschnitt(f, seit);
    if (schlag > 0 && hash(i * 131 + k * 7 + schlag * 977) < 0.16) { zx += (hash(i + schlag * 31) - 0.5) * w * 0.4; zy += (hash(i * 3 + schlag * 17) - 0.5) * h * 0.4; }
    const quelle = [cx + (zx - cx) * m, cy + (zy - cy) * m, w + (sx - w) * m, h + (sy - h) * m];
    const licht = erst ? weich(anteil(tau, 0.2 + f.an * 1.1, 0.35 + f.an * 1.1)) : 1;
    if (licht <= 0 || (ausreisser && e >= 1)) return;   // noch dunkle Felder lassen den Grund durch
    // auf manchen Schlägen blitzt ein Feld kurz im Negativ auf
    const blitz = schlag > 0 && seit - schlag * plan.takt < 0.1 && hash(i * 53 + schlag * 131 + k * 7) < 0.05;
    const stil = m > 0.02 ? (blitz ? STIL.negativ : f.stil ?? 0) : 0;
    raus.push({ rect: f.rect, quelle, zug: f.zug[0] && m > 0.02 ? [f.zug[0], f.zug[1], f.zug[2]] : [0, 0, 0], licht: ausreisser ? licht * (1 - e) : licht, rand: f.rand * (1 - e) * Math.min(1, wucht / 0.35) * auf,
      stil, zeit: m > 0.5 ? f.zeit ?? 0 : 0 });
  };
  s.felder.forEach((f, i) => eins(f, i, false));
  s.ausreisser.forEach((f, i) => eins(f, 1000 + i, true));
  const ende = Bp ? weich(anteil(tau, Bp[1] - 0.7, Bp[1] - 0.1)) : 0;
  const tafelSicht = (erst ? weich(anteil(tau, 0.8, 1.6)) : weich(anteil(tau, S[0] + 0.2, S[0] + 0.7))) * (Bp ? 1 - weich(anteil(tau, Bp[0], Bp[0] + 1.0)) : 1) * (k > 0 ? 1 - 0.6 * Math.exp(-seit / 0.12) : 1);
  return { k, schnitt: s, felder: raus.slice(0, HOECHSTENS), tafelSicht, ende, ruck: k > 0 ? Math.exp(-seit / 0.09) : 0 };   // der erste Schnitt ohne Ruck: vom Foto oder aus dem Dunkeln her weich
}

/**
 * Der Teil fürs Signet am Schluss (wenn die Montage der letzte Effekt ist): das Signet (2,3 s) und die erste Hälfte seines Stehens; wie als erster
 * Effekt aus dem Dunkeln (die Schlaufe zeigt sich zuerst nur in den Feldern) oder nahtlos vom Foto her, Schnitte im schnellen Takt, während es sich
 * zeichnet, dann rastet es ein.
 */
export const signetTeil = ({ nahtlos = false } = {}) => ({ art: "montage", erst: !nahtlos, vonFoto: false, phasen: [["schnitte", "Schnitte", 0.7], ["montage", "Montage", 0.9], ["bild", "Bild", 1.0]], dauer: 2.6 });
