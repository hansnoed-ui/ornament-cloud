// PHORMA II – Ablauf des Films (ohne DOM). 30 Bilder pro Sekunde, ohne Ton; Hochformat 4 : 5 (Feed), wahlweise 9 : 16 (Reels, Stories).
// Drei Effekte, einzeln oder als Kette in fester Reihenfolge (Wunsch vom 17. Oktober 2026: «Physarum findet die Formen → Stich zeichnet sie →
// das Foto bekommt Tiefe und wird Raum → es fällt als Tuch und legt sich glatt zum Schlussbild»; am selben Tag den Stich durch die Morphogenese
// ersetzt – «diese Stich-Optiken mag ich nicht besonders» –, und auch sie gefiel nicht: seither ohne zweiten Effekt, die Kette ist kürzer, für
// Reels besser). Jede Kette beginnt im Dunkeln und endet exakt beim Foto.
//   Physarum – 01 Keime (Sporen leuchten an den markantesten Stellen auf) → 02 Netz (hunderttausende Agenten bilden ein Netz, das die Formen findet)
//              → 03 Bild (das Foto erscheint durch das Netz); vor einem weiteren Effekt geht das Netz über eine Zeitfront in ihn über
//   Tiefe    – 01 Scan (eine Lichtebene tastet das Bild von vorn nach hinten ab) → 02 Raum (Kamerafahrt mit Parallaxe, Tiefenschichten,
//              Schärfeverlagerung) → 03 Bild (es legt sich flach); vor dem Tuch: das Relief wird zum Tuch
//   Tuch     – 01 Tuch (das Foto als Seidentuch im Wind) → 02 Bild (es wird glattgezogen und liegt als Foto da)
//   Gewebe   – für sich (nicht in der Kette; Wunsch vom 17. Oktober 2026 nach einem Video von Pauric Freeman): 01 Zeichen (der Text oder das Foto steht)
//              → 02 Gewebe (seine Umrisse werden zu Bändern aus feinen Linien, die der Ton bewegt; Schnitte bei starken Einsätzen) → 03 Bild;
//              mit einer Tonspur so lang wie sie
// Danach steht das Foto, dann (wenn gewählt) das Signet von ornament.cloud.
export { FPS, anteil, weich, sanft, inOut, ausblenden, bezier, klemm } from "../sketchory/ablauf.js?v=10";

export const FORMATE = ["4:5", "9:16"];
export const filmMass = (format = "4:5") => (format === "9:16" ? [1080, 1920] : [1080, 1350]);

/** das Signet wie in PHORMA I: ohne den leeren Anfang, doppelt so schnell */
export const SIGNET_VON = 12, SIGNET_BIS = 150, SIGNET_TEMPO = 2;
export const SIGNET = (SIGNET_BIS - SIGNET_VON) / 30 / SIGNET_TEMPO;

export const TEMPO = { ruhig: 1.3, normal: 1, schnell: 0.75 };

export const EFFEKTE = ["physarum", "tiefe", "tuch"];
export const TITEL = { physarum: "Physarum", tiefe: "Tiefe", tuch: "Tuch", gewebe: "Gewebe" };
/** Abläufe für sich (nicht kombinierbar) */
export const FUER_SICH = ["gewebe"];
/** die Abläufe, die eine Tonspur führt (Länge nach der Musik, ohne Tempo) */
export const MIT_TON = FUER_SICH;
export const KETTE = EFFEKTE.join("+");

/** die gewählten Effekte in fester Reihenfolge, mit «+» verbunden; Unbekanntes oder nichts ergibt die ganze Kette */
export function ablaufName(a) {
  if (a === "struktur") return "gewebe";                                   // die Struktur gab es nur am 18. Oktober 2026 («kannst du so vergessen»)
  if (FUER_SICH.includes(String(a ?? ""))) return String(a);
  const teile = String(a ?? "").split("+");
  const liste = EFFEKTE.filter((e) => teile.includes(e));
  return liste.length ? liste.join("+") : KETTE;
}
export const effekte = (a) => ablaufName(a).split("+");

/**
 * Rolle eines Effekts in der Kette: seine Phasen ([name, titel, dauer] bei Tempo «normal»), wie lange der nächste schon vor seinem Ende einsetzt
 * (ueber) und womit er übergeht (uebergang: "front" – Zeitfront nach der Tiefe, "schnitt" – beide zeigen dort dasselbe Bild).
 */
export function rolle(art, liste, i, { laenge = null } = {}) {
  const erst = i === 0, letzt = i === liste.length - 1, vorher = liste[i - 1] ?? null, naechstes = liste[i + 1] ?? null;
  let phasen, ueber = 0, uebergang = "schnitt";
  if (art === "physarum") {
    phasen = [["keime", "Keime", 1.6], ["netz", "Netz", 5.2]];
    if (letzt) phasen.push(["bild", "Bild", 3.4]);
    else { ueber = 1.8; uebergang = "front"; }
  } else if (art === "tiefe") {
    phasen = [["scan", "Scan", erst ? 2.6 : 2.2], ["raum", "Raum", 5.4]];
    if (letzt) phasen.push(["bild", "Bild", 2.8]);
    else { ueber = 0.7; uebergang = "front"; }
  } else if (art === "gewebe") {
    // mit Tonspur: das Gewebe dauert, so lange der Ton läuft (laenge: die ganze Dauer des Effekts)
    phasen = [["zeichen", "Zeichen", 2.2], [art, TITEL[art], laenge ? Math.max(5, laenge - 4.8) : 14], ["bild", "Bild", 2.6]];
  } else {
    phasen = [["tuch", "Tuch", vorher === "tiefe" ? 4.6 : 5.0], ["bild", "Bild", 3.4]];
  }
  const dauer = phasen.reduce((s, p) => s + p[2], 0);
  return { art, erst, letzt, vorher, naechstes, phasen, dauer, ueber, uebergang };
}

/** die Kette in Sekunden bei Tempo «normal»: { teile: [{ ...rolle, von, bis, vonFoto }], phasen: [{ name, titel, von, bis, art }], dauer } */
export function kette(a, opt = {}) {
  const liste = effekte(a), teile = [], phasen = [];
  let t = 0, ueber = 0;
  liste.forEach((art, i) => {
    const R = rolle(art, liste, i, opt), von = Math.max(0, t - ueber), bis = von + R.dauer;
    if (phasen.length) phasen[phasen.length - 1].bis = Math.min(phasen[phasen.length - 1].bis, von);   // die Beschriftung wechselt, sobald der nächste einsetzt
    let p0 = von;
    for (const [name, titel, d] of R.phasen) { phasen.push({ name, titel, von: p0, bis: p0 + d, art }); p0 += d; }
    teile.push({ ...R, von, bis, vonFoto: i > 0 && teile[i - 1].uebergang === "schnitt" });   // vonFoto: der vorige endet exakt beim Foto
    t = bis; ueber = R.ueber;
  });
  return { teile, phasen: phasen.filter((p) => p.bis - p.von >= 0.05), dauer: t };
}

/**
 * Zeitachse in Sekunden: { ab: { name: [anfang, ende] }, ablauf, abschnitt: { von, bis }, teile (Filmzeiten), phasen, dauer, bilder, tempo }.
 * Die Effekte rechnen in ihrer eigenen Zeit bei Tempo «normal»: lokal(teil, t) = (t − teil.von) / tempo.
 */
/** laenge: die Dauer des Effekts nach einer Tonspur (nur beim Gewebe; dann ohne Tempo) */
export function zeitachse({ tempo = "normal", signet = true, ablauf = KETTE, laenge = null } = {}) {
  const art = ablaufName(ablauf), mitTon = MIT_TON.includes(art) && laenge;
  const f = mitTon ? 1 : TEMPO[tempo] ?? (typeof tempo === "number" ? tempo : 1);
  const K = kette(art, { laenge: mitTon ? laenge : null }), ab = {};
  let t = 0;
  const dazu = (name, d) => { ab[name] = [t, t + d]; t += d; };
  dazu("vor", 0.4);
  const von = t;
  const teile = K.teile.map((tl) => ({ ...tl, von: von + tl.von * f, bis: von + tl.bis * f }));
  const phasen = K.phasen.map((p) => ({ ...p, von: von + p.von * f, bis: von + p.bis * f }));
  t = von + K.dauer * f;
  const abschnitt = { von, bis: t };
  dazu("stehen", 3.2);
  if (signet) {
    dazu("bildAus", 0.9); dazu("pause", 0.15); dazu("signet", SIGNET); dazu("signetStehen", 0.6); dazu("signetAus", 0.6); dazu("schluss", 0.2);
  } else dazu("schluss", 0.3);
  return { ab, ablauf: art, abschnitt, teile, phasen, dauer: t, bilder: Math.round(t * 30), tempo: f };
}

/** die Effekte, die zur Zeit t laufen (beim Übergang zwei), mit ihrer eigenen Zeit */
export function laufend(zeit, t) {
  const { teile, tempo } = zeit;
  const an = teile.filter((tl) => t >= tl.von && t < tl.bis);
  if (!an.length) {
    if (t < teile[0].von) return [{ teil: teile[0], lokal: 0 }];
    const letzt = teile.at(-1);
    return [{ teil: letzt, lokal: (letzt.bis - letzt.von) / tempo }];
  }
  return an.map((teil) => ({ teil, lokal: (t - teil.von) / tempo }));
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
  return `phorma-ii-${zeit.getFullYear()}-${z(zeit.getMonth() + 1)}-${z(zeit.getDate())}-${z(zeit.getHours())}${z(zeit.getMinutes())}.${endung}`;
}
