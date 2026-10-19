// PHORMA III – Ablauf des Films (ohne DOM). 30 Bilder pro Sekunde; Hochformat 4 : 5 (Feed), wahlweise 9 : 16 (Reels, Stories) oder quer 16 : 9 (Bildschirm, Website).
// Das Gewebe aus PHORMA II, seit dem 18. Oktober 2026 eine eigene Anwendung (Wunsch: «Es sind ja zwei ganz verschiedene Ansätze: die Bildanimation
// mit Physarum, Tiefe und Tuch und die Gewebe-Animation mit Audio, Video, Text etc. All das soll aus PHORMA II ausgelagert werden»):
//   01 Zeichen (der Text, das Foto oder das Standbild des Videos steht) → 02 Gewebe (seine Umrisse werden zu Flächen aus feinen Linien, die der
//   Ton bewegt; neue Bilder bei kräftigen Einsätzen) → 03 Logo (aus der Schlaufe des Signets wächst die Fläche und legt sich glatt; mit Signet)
//   oder 03 Bild (die Flächen legen sich zurück, das Zeichen steht wieder exakt da; ohne Signet). Mit einer Tonspur so lang wie sie.
// Irrfahrt (seit 18. Oktober 2026, Wunsch nach einem Video: ein Faden irrt durch einen Würfel aus Licht – «gerne viiiiiel krasser»):
//   01 Würfel (er zeichnet sich, der Faden beginnt) → 02 Irrfahrt (der Faden quillt mit der Musik zu Rauch auf, bei Schlägen springt alles) →
//   03 Logo (mit Signet) oder 03 Stille (der Faden zieht sich zusammen). Schwarz; danach kein Stehen, das letzte Bild hält.
// Video (seit 18. Oktober 2026, das Video selbst ist das Bild, video.js): 01 Video (so lang wie der Ton) → 02 Logo (das Video taucht ins Schwarz)
//   oder 02 Ende (das letzte Bild hält).
// Der Aufbau (Kette aus Teilen, Phasen, laufend) ist derselbe wie in PHORMA II, mit einem einzigen Teil.
export { FPS, anteil, weich, sanft, inOut, ausblenden, bezier, klemm } from "../sketchory/ablauf.js?v=10";

// 16 : 9 quer (seit 18. Oktober 2026, für Bildschirme am Laptop: das Intro der Website, Rückmeldung «sieht im Browser am Laptop nicht gut aus,
// qualitativ und vom Bildschirmformat»)
export const FORMATE = ["4:5", "9:16", "16:9"];
export const filmMass = (format = "4:5") => (format === "9:16" ? [1080, 1920] : format === "16:9" ? [1920, 1080] : [1080, 1350]);

/** das Logo am Ende (mit Signet): es entsteht aus dem Gewebe, legt sich glatt, der Schriftzug wird getippt */
export const LOGO = 4.6;
/** was nach dem Effekt noch kommt (für die Länge nach der Tonspur): mit Logo (und immer bei der Irrfahrt) nur der Schluss, sonst Stehen und Schluss */
export const NACH = (signet, art = "gewebe") => (signet || art === "irrfahrt" || art === "lichtwuerfel" || art === "video" ? 0.3 : 3.2 + 0.3);

export const TEMPO = { ruhig: 1.3, normal: 1, schnell: 0.75 };
// der Lichtwürfel (seit 19. Oktober 2026): die Irrfahrt mit einem stehen bleibenden, ruhig drehenden Würfel (irrfahrt.js, fest)
export const EFFEKTE = ["gewebe", "irrfahrt", "lichtwuerfel", "video"];
export const TITEL = { gewebe: "Gewebe", irrfahrt: "Irrfahrt", lichtwuerfel: "Lichtwürfel", video: "Video" };
export const KETTE = "gewebe";
/** ein gemerkter oder unbekannter Name ergibt das Gewebe */
export const ablaufName = (a) => (EFFEKTE.includes(String(a ?? "")) ? String(a) : KETTE);

/**
 * Die Rolle des Gewebes: seine Phasen ([name, titel, dauer] bei Tempo «normal»). Mit Tonspur dauert es, so lange der Ton läuft (laenge: die ganze
 * Dauer des Effekts). Mit Signet endet es nicht beim Bild, sondern geht gleich ins Logo über (Rückmeldung vom 18. Oktober 2026: «der Weissraum
 * einige Sekunden vor dem Logo ist unnötig. Bitte direkt vom Gewebe zum Logo»).
 */
export function rolle({ art = KETTE, laenge = null, signet = false } = {}) {
  art = ablaufName(art);
  if (art === "video") {
    const ende = signet ? ["logo", "Logo", LOGO] : ["ende", "Ende", 0.6];
    const phasen = [["video", "Video", laenge ? Math.max(2, laenge - ende[2]) : 10], ende];
    return { art, erst: true, letzt: true, vorher: null, naechstes: null, phasen, dauer: phasen.reduce((s, p) => s + p[2], 0), ueber: 0, uebergang: "schnitt" };
  }
  if (art === "irrfahrt" || art === "lichtwuerfel") {
    const ende = signet ? ["logo", "Logo", LOGO] : ["stille", "Stille", 2.4];
    const phasen = [["wuerfel", "Würfel", 1.0], ["irrfahrt", "Irrfahrt", laenge ? Math.max(3.2, laenge - 1.0 - ende[2]) : 14], ende];
    return { art, erst: true, letzt: true, vorher: null, naechstes: null, phasen, dauer: phasen.reduce((s, p) => s + p[2], 0), ueber: 0, uebergang: "schnitt" };
  }
  const phasen = signet
    ? [["zeichen", "Zeichen", 2.2], ["gewebe", "Gewebe", laenge ? Math.max(3.2, laenge - 2.2 - LOGO) : 14], ["logo", "Logo", LOGO]]
    : [["zeichen", "Zeichen", 2.2], ["gewebe", "Gewebe", laenge ? Math.max(5, laenge - 4.8) : 14], ["bild", "Bild", 2.6]];
  return { art: "gewebe", erst: true, letzt: true, vorher: null, naechstes: null, phasen, dauer: phasen.reduce((s, p) => s + p[2], 0), ueber: 0, uebergang: "schnitt" };
}

/** in Sekunden bei Tempo «normal»: { teile: [{ ...rolle, von, bis }], phasen: [{ name, titel, von, bis, art }], dauer }; opt: { art, laenge, signet } */
export function kette(opt = {}) {
  const R = rolle(opt), phasen = [];
  let p0 = 0;
  for (const [name, titel, d] of R.phasen) { phasen.push({ name, titel, von: p0, bis: p0 + d, art: R.art }); p0 += d; }
  return { teile: [{ ...R, von: 0, bis: R.dauer, vonFoto: false }], phasen, dauer: R.dauer };
}

/**
 * Zeitachse in Sekunden: { ab: { name: [anfang, ende] }, ablauf, abschnitt: { von, bis }, teile (Filmzeiten), phasen, dauer, bilder, tempo }.
 * Der Effekt rechnet in seiner eigenen Zeit bei Tempo «normal»: lokal(teil, t) = (t − teil.von) / tempo. laenge: die Dauer des Effekts nach einer
 * Tonspur (dann ohne Tempo).
 */
export function zeitachse({ tempo = "normal", signet = true, laenge = null, ablauf = KETTE } = {}) {
  const art = ablaufName(ablauf), f = laenge ? 1 : TEMPO[tempo] ?? (typeof tempo === "number" ? tempo : 1);
  const K = kette({ art, laenge, signet }), ab = {};
  let t = 0;
  const dazu = (name, d) => { ab[name] = [t, t + d]; t += d; };
  dazu("vor", 0.4);
  const von = t;
  const teile = K.teile.map((tl) => ({ ...tl, von: von + tl.von * f, bis: von + tl.bis * f }));
  const phasen = K.phasen.map((p) => ({ ...p, von: von + p.von * f, bis: von + p.bis * f }));
  t = von + K.dauer * f;
  const abschnitt = { von, bis: t };
  if (signet || art === "irrfahrt" || art === "lichtwuerfel" || art === "video") dazu("schluss", 0.3);                  // das Logo (die Stille) gehört zum Effekt: danach nur noch der Schluss
  else { dazu("stehen", 3.2); dazu("schluss", 0.3); }
  return { ab, ablauf: art, abschnitt, teile, phasen, dauer: t, bilder: Math.round(t * 30), tempo: f };
}

/** der Effekt zur Zeit t mit seiner eigenen Zeit (wie in PHORMA II, wo beim Übergang zwei laufen) */
export function laufend(zeit, t) {
  const { teile: [teil], tempo } = zeit;
  return [{ teil, lokal: Math.min(teil.bis - teil.von, Math.max(0, t - teil.von)) / tempo }];
}

/** Anfang und Ende einer Phase eines Teils in seiner eigenen Zeit */
export function phase(teil, name) {
  let p0 = 0;
  for (const [n, , d] of teil.phasen) { if (n === name) return [p0, p0 + d]; p0 += d; }
  return null;
}

export function zeitcode(t, fps = 30) {
  const b = Math.max(0, Math.floor(t * fps + 1e-6)), z = (n) => String(n).padStart(2, "0");
  return `${z(Math.floor(b / fps / 60))}:${z(Math.floor(b / fps) % 60)}:${z(b % fps)}`;
}

export function dateiname(zeit, endung) {
  const z = (n) => String(n).padStart(2, "0");
  return `phorma-iii-${zeit.getFullYear()}-${z(zeit.getMonth() + 1)}-${z(zeit.getDate())}-${z(zeit.getHours())}${z(zeit.getMinutes())}.${endung}`;
}
