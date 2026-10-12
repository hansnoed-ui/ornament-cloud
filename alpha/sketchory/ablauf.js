// «Sketchory» – Ablauf des Films (ohne DOM): Zeitachse, Kurven, Umbruch des Satzes, Fortschritt des Zeichnens.
// Film: Hochformat 3 : 4 (1080 × 1440), 30 Bilder pro Sekunde, weisser Strich auf Schwarz.
//   leerer Grund → die Karte zeichnet sich (4–6 s) → steht (3 s) → blendet sanft aus (1,5 s) → der Satz blendet Wort für Wort ein, steht, blendet aus
//   → das Signet von ornament.cloud (wie am Ende jedes Videos, hier hell auf Schwarz) → steht kurz.

export const BREITE = 1080, HOEHE = 1440, FPS = 30;
export const RAND = 96;                 // Abstand der Zeichnung zum Bildrand (seitlich)
export const SIGNET = 180 / FPS;        // das Signet in voller Länge (180 Bilder wie im Outro der Videos)

export const klemm = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
/** linear von [a, b] nach [0, 1], geklemmt */
export const anteil = (t, a, b) => (b <= a ? (t >= b ? 1 : 0) : klemm((t - a) / (b - a)));

/** kubische Bézierkurve wie in CSS und Remotion (Easing.bezier) */
export function bezier(x1, y1, x2, y2) {
  const bx = (t) => 3 * x1 * t * (1 - t) ** 2 + 3 * x2 * t * t * (1 - t) + t ** 3;
  const by = (t) => 3 * y1 * t * (1 - t) ** 2 + 3 * y2 * t * t * (1 - t) + t ** 3;
  return (x) => {
    if (x <= 0) return 0;
    if (x >= 1) return 1;
    let lo = 0, hi = 1, t = x;
    for (let i = 0; i < 40; i++) { t = (lo + hi) / 2; if (bx(t) < x) lo = t; else hi = t; }
    return by(t);
  };
}
export const weich = bezier(0.16, 1, 0.3, 1);          // sanft auslaufend
export const sanft = bezier(0.45, 0, 0.25, 1);
export const inOut = bezier(0.65, 0, 0.35, 1);
/** zum Ausblenden: beginnt unmerklich und läuft weich aus (wie eine Sinuskurve) */
export const ausblenden = bezier(0.37, 0, 0.63, 1);

/** Wörter des Satzes */
export const woerter = (text) => text.trim().split(/\s+/).filter(Boolean);

/**
 * Zeitachse in Sekunden. zeichnen: Dauer des Zeichnens; text: der Satz (leer = ohne Textteil).
 * Gibt die Abschnitte { name: [anfang, ende] } und die Gesamtdauer.
 */
export function zeitachse({ zeichnen = 4.5, stehen = 3, text = "" } = {}) {
  const n = woerter(text).length;
  const teile = [];
  let t = 0;
  const dazu = (name, d) => { teile.push([name, t, t + d]); t += d; };
  dazu("vor", 0.5);
  dazu("zeichnen", zeichnen);
  dazu("stehen", stehen);
  dazu("bildAus", 1.5);   // sanft (Wunsch vom 12. Oktober 2026: das fertige Bild 1 s länger stehen lassen, sanfter ausblenden)
  if (n) {
    dazu("pause", 0.35);
    dazu("textEin", textEin(n));
    // Lesezeit: gut 3 Wörter pro Sekunde, mindestens 2 s, höchstens 5 s
    dazu("textStehen", klemm(1.0 + 0.3 * n, 2, 5));
    dazu("textAus", 1.3);
  }
  dazu("pause2", 0.4);
  dazu("signet", SIGNET);
  dazu("nach", 1);
  const ab = Object.fromEntries(teile.map(([name, a, b]) => [name, [a, b]]));
  return { ab, dauer: t, bilder: Math.round(t * FPS) };
}

/** Versatz zwischen den Wörtern beim Einblenden und Dauer je Wort */
export const WORT = 0.7;
export const versatz = (n) => (n > 1 ? Math.min(0.09, 1.3 / (n - 1)) : 0);
export const textEin = (n) => WORT + versatz(n) * Math.max(0, n - 1);

/**
 * Umbruch: höchstens breite pro Zeile, und ausgeglichen (alle Zeilen etwa gleich lang statt einer kurzen letzten).
 * messen(text) → Breite in Pixeln. Gibt Zeilen als Listen von Wörtern.
 */
export function umbrechen(liste, messen, breite) {
  const gierig = (max) => {
    const zeilen = [];
    let zeile = [];
    for (const w of liste) {
      const probe = [...zeile, w];
      if (zeile.length && messen(probe.join(" ")) > max) { zeilen.push(zeile); zeile = [w]; } else zeile = probe;
    }
    if (zeile.length) zeilen.push(zeile);
    return zeilen;
  };
  const erst = gierig(breite);
  if (erst.length < 2) return erst;
  // schmaler machen, solange die Zahl der Zeilen gleich bleibt
  let lo = 0, hi = breite;
  for (let i = 0; i < 18; i++) {
    const mitte = (lo + hi) / 2;
    if (gierig(mitte).length > erst.length) lo = mitte; else hi = mitte;
  }
  return gierig(hi);
}

/** Schriftgrösse und Zeilen für den Satz: gross, aber höchstens fünf Zeilen */
export function satzbild(text, messenMit, { groesse = 66, breite = BREITE - 2 * RAND - 40, minimum = 40, zeilenMax = 5 } = {}) {
  const liste = woerter(text);
  let g = groesse, zeilen = [];
  for (;;) {
    const messen = (s) => messenMit(s, g);
    zeilen = umbrechen(liste, messen, breite);
    const zuBreit = zeilen.some((z) => messen(z.join(" ")) > breite);
    if ((zeilen.length <= zeilenMax && !zuBreit) || g <= minimum) break;
    g = Math.max(minimum, Math.round(g * 0.92));
  }
  return { groesse: g, zeilen, zeilenhoehe: Math.round(g * 1.32) };
}

/**
 * Plan des Zeichnens: jedem Strich ein Stück der Zeit, nach seiner Länge; dazu zwischen den Strichen das Absetzen des Stifts.
 * Gibt Anfang und Ende jedes Strichs auf einer Skala von 0 bis 1.
 */
export function zeichenplan(striche, { absetzen = 0.12 } = {}) {
  const n = striche.length;
  if (!n) return [];
  const gesamt = striche.reduce((s, x) => s + Math.max(x.laenge, 1), 0);
  // insgesamt höchstens ein Achtel der Zeit für das Absetzen, je Strich ein kleines Stück
  const pause = (gesamt * absetzen) / Math.max(1, n - 1) / (1 - absetzen);
  const plan = [];
  let t = 0;
  striche.forEach((s, i) => {
    const a = t; t += Math.max(s.laenge, 1);
    plan.push([a, t]);
    if (i < n - 1) t += pause;
  });
  return plan.map(([a, b]) => [a / t, b / t]);
}

/** Fortschritt des Zeichnens über die Zeit (0–1): ruhiger Anfang, gleichmässige Mitte, sanftes Ende */
export const zeichenkurve = (u) => { const x = klemm(u); return 0.6 * x + 0.4 * (0.5 - 0.5 * Math.cos(Math.PI * x)); };

/** Dateiname mit Datum und Uhrzeit */
export function dateiname(zeit, endung) {
  const z = (n) => String(n).padStart(2, "0");
  return `sketchory-${zeit.getFullYear()}-${z(zeit.getMonth() + 1)}-${z(zeit.getDate())}-${z(zeit.getHours())}${z(zeit.getMinutes())}.${endung}`;
}
