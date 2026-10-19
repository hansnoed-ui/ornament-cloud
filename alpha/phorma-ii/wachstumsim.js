// PHORMA II – die Bahn des Wachstums (ohne DOM und ohne three.js, im Web Worker wachstumrechner.js oder in Node für die Tests). Wunsch vom
// 19. Oktober 2026 nach dem Clip «algorigraph» («so etwas, aber natürlich noch viel besser»): Differential Growth – eine einzige geschlossene Linie
// wächst aus einem kleinen Kreis; ihre Punkte stossen einander ab, Nachbarn ziehen sich glatt, wo die Linie sich zu weit dehnt, kommt ein Punkt
// dazu. So faltet sie sich und füllt die Fläche. Den Abstand der Windungen gibt das Foto vor: hell eng (die Linie leuchtet auf Schwarz, dichte Linie
// ist Licht), dunkel weit, an Kanten enger – so zeichnet sie das Bild.
//   Einheit: ein Punkt der Analyse (halbe Filmgrösse). Einmal ganz von vorn bis zum Ende gerechnet, je Filmbild gespeichert (Int16, 1/8 Punkt);
//   danach steht die Linie. Wiederholbar: derselbe Auftrag ergibt dieselbe Bahn.
import { phase } from "./ablauf.js?v=27";

export const BILDER_JE_S = 30, ACHTEL = 8;
const anteil = (t, a, b) => Math.min(1, Math.max(0, (t - a) / (b - a)));
const weich = (x) => x * x * (3 - 2 * x);

function zufall(s) {
  return () => { s |= 0; s = (s + 0x6d2b79f5) | 0; let t = Math.imul(s ^ (s >>> 15), 1 | s); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}

/** Kastenmittel (dreimal ergibt fast Gauss), Rand: nur Punkte im Bild */
function glaetten(q, w, h, r) {
  let a = Float32Array.from(q);
  for (let n = 0; n < 3; n++) {
    const b = new Float32Array(w * h), c = new Float32Array(w * h);
    for (let y = 0; y < h; y++) { let s = 0, k = 0; for (let x = -r; x < w + r; x++) { if (x + r < w) { s += a[y * w + x + r]; k++; } if (x - r - 1 >= 0) { s -= a[y * w + x - r - 1]; k--; } if (x >= 0 && x < w) b[y * w + x] = s / k; } }
    for (let x = 0; x < w; x++) { let s = 0, k = 0; for (let y = -r; y < h + r; y++) { if (y + r < h) { s += b[(y + r) * w + x]; k++; } if (y - r - 1 >= 0) { s -= b[(y - r - 1) * w + x]; k--; } if (y >= 0 && y < h) c[y * w + x] = s / k; } }
    a = c;
  }
  return a;
}

/**
 * Der Abstand der Windungen je Punkt (w × h, Zeile 0 oben): aus der Helligkeit (auf den Tonumfang des Motivs gestreckt) und den Kanten, geglättet.
 * dichte: 1 normal, über 1 weiter (Telefon). → { abstand: Float32Array, min, max }
 */
export function abstandsfeld({ w, h, hell, nahrung, ton = [0, 1], dichte = 1, maske = null, tonFest = false }) {
  // der Tonumfang im Motiv (3 und 97 %), damit es seine ganze Spanne von eng bis weit bekommt (beim Video einmal, vom Standbild: sonst flackert es)
  if (maske && !tonFest) {
    const werte = [];
    for (let i = 0; i < w * h; i += 3) if (maske[i] > 0.5) werte.push(hell[i]);
    if (werte.length > 50) { werte.sort((p, q) => p - q); ton = [werte[Math.floor(werte.length * 0.03)], werte[Math.floor(werte.length * 0.97)]]; }
  }
  const a = new Float32Array(w * h), [t0, t1] = ton, min = 2.6 * dichte, max = 8.5 * dichte;
  for (let i = 0; i < w * h; i++) {
    const L = Math.min(1, Math.max(0, (hell[i] - t0) / Math.max(0.05, t1 - t0))) ** 0.85;
    const kante = Math.min(1, Math.max(0, ((nahrung?.[i] ?? 0) - 0.25 * hell[i]) / 0.75));
    a[i] = min + (max - min) * (1 - L) ** 1.3 * (1 - 0.35 * kante);
  }
  return { abstand: glaetten(a, w, h, 2), min, max, ton };
}

/**
 * Wo die Linie wachsen darf (0..1, w × h), weich begrenzt – wie im Clip, wo der Grund leer bleibt. Ist der Rand des Fotos ruhig und einfarbig (ein
 * Porträt vor einer Wand), ist der Grund alles, was ihm in der Farbe gleicht (rgb: RGBA in w × h); sonst, oder ist das Motiv zu klein oder fast
 * alles, darf sie überall hin (null). (Bis zum 19. Oktober 2026 sonst das Nahe aus der Tiefe – Rückmeldung vom Telefon: «hat nicht das ganze Bild
 * erreicht», die Tiefe nahm oft nur die Hälfte.)
 */
export function wachsfeld({ w, h, tiefe = null, rgb = null }) {
  const m = new Float32Array(w * h);
  let gut = false;
  if (rgb) {
    // die Farbe des Rands: der Median eines Streifens rundum (ohne den unteren Rand: dort steht oft das Motiv); ruhig ist er, wenn drei Viertel
    // seiner Punkte ihm gleichen – so stören einzelne Schriften oder Gegenstände am Rand nicht (vorher die Streuung: ein Video mit Text am Rand
    // galt als unruhig, und die Linie füllte den hellen Grund ganz)
    const r = [], g = [], bl = [], b = Math.max(2, Math.round(w * 0.04));
    for (let y = 0; y < h * 0.8; y++) for (let x = 0; x < w; x++) {
      if (y >= b && x >= b && x < w - b) continue;
      const i = (y * w + x) * 4; r.push(rgb[i]); g.push(rgb[i + 1]); bl.push(rgb[i + 2]);
    }
    const median = (a) => a.sort((p, q) => p - q)[a.length >> 1], mr = median([...r]), mg = median([...g]), mb = median([...bl]);
    let gleich = 0;
    for (let k = 0; k < r.length; k++) if (Math.hypot(r[k] - mr, g[k] - mg, bl[k] - mb) / 255 < 0.1) gleich++;
    if (gleich > 0.75 * r.length) {
      for (let i = 0; i < w * h; i++) {
        const d = Math.hypot(rgb[i * 4] - mr, rgb[i * 4 + 1] - mg, rgb[i * 4 + 2] - mb) / 255, t = Math.min(1, Math.max(0, (d - 0.07) / 0.1));
        m[i] = t * t * (3 - 2 * t);
      }
      gut = true;
    }
  }
  if (!gut) return null;
  const g = glaetten(m, w, h, 3);
  let summe = 0;
  for (const v of g) summe += v;
  return summe < 0.08 * w * h || summe > 0.92 * w * h ? null : g;
}

/**
 * Die ganze Bahn. teil: { phasen } (aus ablauf.js: keim, wachstum, farbe, bild); w, h, hell, nahrung, ton: aus der Analyse; keim: [x, y] (0..1).
 * keim: wo sie beginnt (ohne Angabe: in der Mitte des Motivs); schritte: Teilschritte je Filmbild; film: { w, h, je, rgba: [RGBA je film.je
 * Filmbilder] } – die Bilder eines Videos, denen die Linie folgt; jeBild(f, lagen): jedes Bild gleich abgeben, statt alles am Ende (dann ohne
 * lagen im Ergebnis). fortschritt(anteil, punkte) wird zwischendurch gerufen.
 * → { w, h, bilder, anzahl: Uint32Array (Punkte je Bild), ab: Uint32Array (Anfang je Bild), lagen: Int16Array (x, y in 1/8 Punkt) }
 */
export function wachstumBahn({ teil, w, h, hell, nahrung = null, tiefe = null, rgb = null, ton = [0, 1], keim = null, dichte = 1, schritte = 12, samen = 1, film = null, jeBild = null, fortschritt = null }) {
  const K = phase(teil, "keim"), W = phase(teil, "wachstum"), F = phase(teil, "farbe");
  const ende = F ? F[1] : W[1], bilder = Math.round(ende * BILDER_JE_S) + 1;
  if (jeBild) jeBild.bilder = bilder;
  const maske = wachsfeld({ w, h, tiefe, rgb });
  const start = abstandsfeld({ w, h, hell, nahrung, ton, dichte, maske }), { abstand, max } = start;
  // die Felder, nach denen die Linie gerade wächst: vom Foto (Standbild) oder, mit Video, je film.je Filmbilder aus dem Bild des Videos (kleiner,
  // fw × fh; dann folgt die Linie dem bewegten Bild)
  let fA = abstand, fw = w, fh = h, sx0 = 1, sy0 = 1, key = -1;
  const feld = (x, y) => fA[Math.min(fh - 1, Math.max(0, (y * sy0) | 0)) * fw + Math.min(fw - 1, Math.max(0, (x * sx0) | 0))];
  const drin = (x, y) => (maske ? maske[Math.min(h - 1, Math.max(0, y | 0)) * w + Math.min(w - 1, Math.max(0, x | 0))] : 1);
  function filmFelder(f) {
    if (!film?.rgba?.length) return;
    const k = Math.min(film.rgba.length - 1, Math.floor(f / film.je));
    if (k === key) return;
    key = k;
    const q = film.rgba[k], W2 = film.w, H2 = film.h, hl = new Float32Array(W2 * H2), na = new Float32Array(W2 * H2);
    for (let i = 0; i < W2 * H2; i++) hl[i] = (0.2126 * q[i * 4] + 0.7152 * q[i * 4 + 1] + 0.0722 * q[i * 4 + 2]) / 255;
    for (let yy = 1; yy < H2 - 1; yy++) for (let xx = 1; xx < W2 - 1; xx++) {
      const i = yy * W2 + xx, gx = hl[i + 1] - hl[i - 1], gy = hl[i + W2] - hl[i - W2];
      na[i] = Math.min(1, 0.25 * hl[i] + 2.2 * Math.hypot(gx, gy));
    }
    // die Maske bleibt die des Standbilds: wechselte sie mit jedem Bild, schöbe sie die Punkte auf engem Raum zusammen (die Rechnung stand dann fast)
    fA = abstandsfeld({ w: W2, h: H2, hell: hl, nahrung: na, ton: start.ton, dichte, tonFest: true }).abstand;
    fw = W2; fh = H2; sx0 = W2 / w; sy0 = H2 / h;
  }
  const r = zufall(samen * 9973 + 17);
  // der Keim: ein kleiner Kreis, ohne Angabe im Schwerpunkt des Motivs (wo es ganz drin ist)
  let n = 28, x = new Float64Array(64), y = new Float64Array(64), kx = 0.5 * w, ky = 0.45 * h;
  if (keim) { kx = keim[0] * w; ky = keim[1] * h; }
  else if (maske) {
    let sx = 0, sy = 0, sg = 0;
    for (let yy = 0; yy < h; yy += 2) for (let xx = 0; xx < w; xx += 2) { const g = maske[yy * w + xx] ** 4; sx += g * xx; sy += g * yy; sg += g; }
    if (sg > 0) { kx = sx / sg; ky = sy / sg; }
  }
  for (let i = 0; i < n; i++) { const a = (i / n) * Math.PI * 2; x[i] = kx + 3.2 * Math.cos(a); y[i] = ky + 3.2 * Math.sin(a); }
  // Raster für die Nachbarn: kleine Zellen, je Punkt so viele ringsum, wie sein Abstand reicht (dicht: wenige, weit: mehr)
  const zg = 2.6 * dichte, gw = Math.ceil(w / zg) + 1, gh = Math.ceil(h / zg) + 1;
  const kopf = new Int32Array(gw * gh + 1), platz = new Int32Array(gw * gh);
  let kap = 0, liste, sx, sy, fx, fy, eng, zelle, nx, ny;
  const RAND = 3;
  const anzahl = new Uint32Array(bilder), ab = new Uint32Array(bilder + 1), stuecke = [];
  let gesamt = 0;

  // so viele Punkte füllen das Bild etwa (Linienlänge Fläche / Abstand, ein Punkt je halbem Abstand): darüber wächst sie nur noch durch Dehnung
  let genug = 0;
  for (let i = 0; i < w * h; i++) genug += (2 / (abstand[i] * abstand[i])) * (maske ? maske[i] : 1);
  genug = Math.min(genug * 2.6, 75000 / (dichte * dichte));   // lieber zu viele Punkte als Lücken; aber nie mehr, als sich in einer Minute rechnet
  // Umlaufsinn der Linie (bleibt, weil sie sich nie kreuzt): die Normale nach aussen ist die Tangente um 90° gedreht
  let sinn = 0;
  for (let i = 0; i < n; i++) { const q = (i + 1) % n; sinn += x[i] * y[q] - x[q] * y[i]; }
  sinn = sinn > 0 ? 1 : -1;

  let erlaubt = 0;   // so viele Punkte darf die Linie gerade haben: ihr Wachsen folgt dem Plan, nicht der Rechenzeit

  function schritt(wachsen) {
    if (kap < n * 2 + 8) {
      kap = Math.max(4096, n * 3);
      liste = new Int32Array(kap); sx = new Float64Array(kap); sy = new Float64Array(kap); fx = new Float64Array(kap); fy = new Float64Array(kap);
      eng = new Uint8Array(kap); zelle = new Int32Array(kap);
      const gx = new Float64Array(kap), gy = new Float64Array(kap); gx.set(x.subarray(0, n)); gy.set(y.subarray(0, n)); x = gx; y = gy;
      nx = new Float64Array(kap); ny = new Float64Array(kap);
    }
    // Raster füllen (Zählen und Sortieren); die Lagen nach Zellen geordnet daneben, damit das Suchen im Speicher beieinander bleibt
    kopf.fill(0);
    for (let i = 0; i < n; i++) { const c = Math.min(gh - 1, Math.max(0, (y[i] / zg) | 0)) * gw + Math.min(gw - 1, Math.max(0, (x[i] / zg) | 0)); zelle[i] = c; kopf[c + 1]++; }
    for (let c = 0; c < gw * gh; c++) kopf[c + 1] += kopf[c];
    platz.set(kopf.subarray(0, gw * gh));
    for (let i = 0; i < n; i++) { const k = platz[zelle[i]]++; liste[k] = i; sx[k] = x[i]; sy[k] = y[i]; }
    // Kräfte: zur Mitte der Nachbarn (glatt), weg von allen nahen Punkten (Abstand aus dem Foto)
    const halb = n / 2;
    for (let i = 0; i < n; i++) {
      const p = i === 0 ? n - 1 : i - 1, q = i === n - 1 ? 0 : i + 1, xi = x[i], yi = y[i];
      const ax = ((x[p] + x[q]) / 2 - xi) * 0.32, ay = ((y[p] + y[q]) / 2 - yi) * 0.32;
      const R = feld(xi, yi), R2 = R * R, iR = 1 / R, cx = (xi / zg) | 0, cy = (yi / zg) | 0, rz = Math.ceil(R / zg);
      const y0 = cy - rz < 0 ? 0 : cy - rz, y1 = cy + rz > gh - 1 ? gh - 1 : cy + rz, x0 = cx - rz < 0 ? 0 : cx - rz, x1 = cx + rz > gw - 1 ? gw - 1 : cx + rz;
      let rx = 0, ry = 0, nah = 0;
      for (let yy = y0; yy <= y1; yy++) {
        const k0 = kopf[yy * gw + x0], k1 = kopf[yy * gw + x1 + 1];   // eine Zeile von Zellen liegt am Stück
        for (let k = k0; k < k1; k++) {
          const dx = xi - sx[k], dy = yi - sy[k], dd = dx * dx + dy * dy;
          if (dd >= R2 || dd < 1e-9) continue;
          let d = liste[k] - i; if (d < 0) d = -d; if (d > halb) d = n - d;
          if (d <= 2) continue;
          const dist = Math.sqrt(dd), s = (R - dist) * iR / dist;
          rx += dx * s; ry += dy * s; nah++;
        }
      }
      // der Schritt höchstens ein Fünftel des Abstands: sonst zittert die Linie in dichten Stellen, dehnt sich und teilt sich lawinenartig
      const k = 0.5, grenze = 0.2 * R;
      let gx = ax + rx * k + (r() - 0.5) * 0.04, gy = ay + ry * k + (r() - 0.5) * 0.04;
      // ausserhalb des Motivs zurück (die Wand: das Gefälle des Wachsfelds)
      const m = drin(xi, yi);
      if (maske && m < 0.6) { const gxm = drin(xi + 2, yi) - drin(xi - 2, yi), gym = drin(xi, yi + 2) - drin(xi, yi - 2), gl = Math.hypot(gxm, gym) || 1; gx += (gxm / gl) * (0.6 - m) * 0.5 * R; gy += (gym / gl) * (0.6 - m) * 0.5 * R; }
      // Druck: wo noch Platz ist, schiebt sich die Linie nach aussen (sonst wächst die Front viel zu langsam ins leere Bild)
      if (wachsen > 1 && nah < 3 && n < erlaubt && m > 0.5) {
        const tx = x[q] - x[p], ty = y[q] - y[p], tl = Math.hypot(tx, ty) || 1, d = 0.28 * R * (wachsen - 1) / 2;
        gx += (sinn * ty / tl) * d; gy -= (sinn * tx / tl) * d;
      }
      const l = gx * gx + gy * gy; if (l > grenze * grenze) { const z = grenze / Math.sqrt(l); gx *= z; gy *= z; }
      fx[i] = gx; fy[i] = gy; eng[i] = nah > 255 ? 255 : nah;
    }
    for (let i = 0; i < n; i++) {
      x[i] = Math.min(w - RAND, Math.max(RAND, x[i] + fx[i])); y[i] = Math.min(h - RAND, Math.max(RAND, y[i] + fy[i]));
    }
    if (!wachsen) return;
    // Teilen: wo eine Kante länger ist als ihr halber Abstand, kommt ein Punkt dazu; solange sie wächst, auch sonst ab und zu – aber nur, wo noch
    // Platz ist (wenige Nachbarn): so wächst sie schnell, bis das Bild voll ist, und hört dann von selbst auf
    let m = 0;
    const zufaellig = n < erlaubt ? 0.03 * (wachsen - 1) : 0;
    for (let i = 0; i < n; i++) {
      const q = i === n - 1 ? 0 : i + 1;
      nx[m] = x[i]; ny[m] = y[i]; m++;
      const ex = x[q] - x[i], ey = y[q] - y[i], mx = x[i] + ex / 2, my = y[i] + ey / 2, F = feld(mx, my);
      if (ex * ex + ey * ey > 0.25 * F * F || (zufaellig > 0 && eng[i] < 3 && drin(mx, my) > 0.5 && r() < zufaellig)) { nx[m] = mx + (r() - 0.5) * 0.1; ny[m] = my + (r() - 0.5) * 0.1; m++; }
    }
    [x, nx] = [nx, x]; [y, ny] = [ny, y]; n = m;
  }

  for (let f = 0; f < bilder; f++) {
    const t = f / BILDER_JE_S;
    filmFelder(f);
    if (t >= K[0]) {
      // im Keim wächst sie langsam, dann stark (zusätzliche Teilungen treiben das Falten), zuletzt beruhigt sie sich
      const wachsen = t < W[0] ? 1.4 : t < W[1] ? 3 : 0;
      // solange die Linie kurz ist, kosten Schritte wenig: dann mehr davon, damit sie schnell ins Bild wächst
      // im Wachstum folgt die Zahl der Punkte einem Plan (langsam, dann schneller, voll bei drei Vierteln); danach nur noch ein leises Atmen
      const dw = W[1] - W[0], voll = W[0] + 0.75 * dw;
      erlaubt = t < W[0] ? 400 : 400 + (genug - 400) * anteil(t, W[0], voll) ** 1.6;
      const zahl = t < W[0] ? 4 : t > voll + 0.4 ? 4 : Math.max(schritte, Math.min(28, Math.round(150000 / n)));
      for (let s = 0; s < zahl; s++) schritt(wachsen ? wachsen : 0);
    }
    const st = new Int16Array(n * 2);
    for (let i = 0; i < n; i++) { st[i * 2] = Math.round(x[i] * ACHTEL); st[i * 2 + 1] = Math.round(y[i] * ACHTEL); }
    if (jeBild) jeBild(f, st); else stuecke.push(st);
    anzahl[f] = n; ab[f] = gesamt; gesamt += n;
    if (fortschritt && f % 10 === 0) fortschritt(f / bilder, n);
  }
  ab[bilder] = gesamt;
  const lagen = new Int16Array(gesamt * 2);
  if (jeBild) return { w, h, bilder, anzahl, ab, lagen: null };
  stuecke.forEach((st, f) => lagen.set(st, ab[f] * 2));
  return { w, h, bilder, anzahl, ab, lagen };
}
