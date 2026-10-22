// PHORMA II – Ablauf des Films (ohne DOM). 30 Bilder pro Sekunde, ohne Ton; Hochformat 4 : 5 (Feed), wahlweise 9 : 16 (Reels, Stories).
// Drei Effekte, einzeln oder als Kette in fester Reihenfolge (Wunsch vom 17. Oktober 2026: «Physarum findet die Formen → Stich zeichnet sie →
// das Foto bekommt Tiefe und wird Raum → es fällt als Tuch und legt sich glatt zum Schlussbild»; am selben Tag den Stich durch die Morphogenese
// ersetzt – «diese Stich-Optiken mag ich nicht besonders» –, und auch sie gefiel nicht: seither ohne zweiten Effekt, die Kette ist kürzer, für
// Reels besser). Jede Kette beginnt im Dunkeln und endet exakt beim Foto.
//   Physarum – 01 Keime (Sporen leuchten an den markantesten Stellen auf) → 02 Netz (hunderttausende Agenten bilden ein Netz, das die Formen findet)
//              → 03 Bild (das Foto erscheint durch das Netz); vor einem weiteren Effekt geht das Netz über eine Zeitfront in ihn über
//   Tiefe    – 01 Scan (eine Lichtebene tastet das Bild von vorn nach hinten ab) → 02 Bild (es legt sich flach); vor dem Tuch: das Relief wird
//              zum Tuch. Die Phase «Raum» (Kamerafahrt mit Parallaxe) ist seit dem 19. Oktober 2026 weg: «gefällt mir gar nicht, kann ersatzlos raus»
//   Tuch     – 01 Tuch (das Foto als Seidentuch im Wind) → 02 Bild (es wird glattgezogen und liegt als Foto da)
//   Montage  – 01 Schnitte (das Foto zerfällt im Takt in immer mehr Rechtecke) → 02 Montage (jedes zeigt einen eigenen Ausschnitt, harte Schnitte
//              zu neuen Aufteilungen) → 03 Bild (die Felder rasten ein); seit dem 19. Oktober 2026, nach dem Clip «UVA» (montageplan.js)
// Das Wachstum (eine leuchtende Linie wächst aus einem Keim, Differential Growth) war vom 19. bis 21. Oktober 2026 ein Effekt; seither ist es weg
// (Wunsch: «Ich möchte wachstum weg, das scheint nicht recht zu klappen» – die Bahn rechnete auf dem Telefon zu lange; im Verlauf von Git).
// Das Gewebe (für Text, Foto, Video und Ton) war vom 17. bis 18. Oktober 2026 ein vierter Effekt, für sich; seither ist es PHORMA III
// (alpha/phorma-iii/; Wunsch: «Es sind ja zwei ganz verschiedene Ansätze … all das soll aus PHORMA II ausgelagert werden»).
// Danach steht das Foto, dann (wenn gewählt) das Signet von ornament.cloud.
export { FPS, anteil, weich, sanft, inOut, ausblenden, bezier, klemm } from "../sketchory/ablauf.js?v=10";

export const FORMATE = ["4:5", "9:16"];
export const filmMass = (format = "4:5") => (format === "9:16" ? [1080, 1920] : [1080, 1350]);

/** das Signet wie in PHORMA I: ohne den leeren Anfang, doppelt so schnell */
export const SIGNET_VON = 12, SIGNET_BIS = 150, SIGNET_TEMPO = 2;
export const SIGNET = (SIGNET_BIS - SIGNET_VON) / 30 / SIGNET_TEMPO;
/** der Abspann nach dem Stehen: Bild aus, Pause, Signet, stehen, aus, Schluss */
export const ABSPANN = 0.9 + 0.15 + SIGNET + 0.6 + 0.6 + 0.2;

export const TEMPO = { ruhig: 1.3, normal: 1, schnell: 0.75 };

// die Reihenfolge in einer Kette (Wunsch vom 19. Oktober 2026: «Physarum, Tiefe (Scan), Tuch, Montage»; ein gemerktes «wachstum» fällt weg)
// seit 22. Oktober 2026 dazu die Wellenwanne (nach der Tiefe) und die Pixel-Sortierung (vor der Montage), Wunsch: weitere Bildtransformationen,
// «spektakulär, aber nicht zuuu viel Rechenzeit»
export const EFFEKTE = ["physarum", "tiefe", "welle", "tuch", "sortierung", "montage"];
export const TITEL = { physarum: "Physarum", tiefe: "Tiefe", welle: "Wellenwanne", tuch: "Tuch", sortierung: "Pixel-Sortierung", montage: "Montage" };
/** die Kette der Karte «Alle drei» (die Montage kam am 19. Oktober 2026 dazu und ist nur einzeln oder in einer eigenen Kette dabei) */
export const KETTE = "physarum+tiefe+tuch";

/** die gewählten Effekte in fester Reihenfolge, mit «+» verbunden; Unbekanntes oder nichts (auch ein gemerktes «gewebe») ergibt die ganze Kette */
export function ablaufName(a) {
  const teile = String(a ?? "").split("+");
  const liste = EFFEKTE.filter((e) => teile.includes(e));
  return liste.length ? liste.join("+") : KETTE;
}
export const effekte = (a) => ablaufName(a).split("+");

/**
 * Rolle eines Effekts in der Kette: seine Phasen ([name, titel, dauer] bei Tempo «normal»), wie lange der nächste schon vor seinem Ende einsetzt
 * (ueber) und womit er übergeht (uebergang: "front" – Zeitfront nach der Tiefe, "schnitt" – beide zeigen dort dasselbe Bild, "felder" – vor der
 * Montage: Rechtecke schneiden ihn weg, darunter liegt schon die Montage; dann zeigt er das fertige Foto nicht – Wunsch vom 19. Oktober 2026: «Montage
 * sollte grundsätzlich nicht mit dem fertigen Bild starten»).
 */
export function rolle(art, liste, i) {
  const erst = i === 0, letzt = i === liste.length - 1, vorher = liste[i - 1] ?? null, naechstes = liste[i + 1] ?? null;
  let phasen, ueber = 0, uebergang = "schnitt";
  if (art === "physarum") {
    phasen = [["keime", "Keime", 1.6], ["netz", "Netz", 5.2]];
    if (letzt) phasen.push(["bild", "Bild", 3.4]);
    else { ueber = 1.8; uebergang = naechstes === "montage" ? "felder" : "front"; }
  } else if (art === "tiefe") {
    phasen = [["scan", "Scan", erst ? 3.4 : 3.0]];   // ohne «Raum» (seit 19. Oktober 2026): der Scan etwas länger, er baut das Relief auf
    if (letzt) phasen.push(["bild", "Bild", 2.8]);
    else { ueber = 0.7; uebergang = naechstes === "montage" ? "felder" : "front"; }
  } else if (art === "welle" || art === "sortierung") {
    // die beiden Simulationen auf der GPU (seit 22. Oktober 2026): als letzter Effekt mit Bild, sonst gehen sie wie Physarum über
    // kurz (Wunsch nach den Probefilmen: Wellen «vor allem die langsamen Phasen und nur kurz schneller, insgesamt maximal 8 Sekunden»; Sortierung
    // «insgesamt eher 6–8 Sekunden», «das Bild muss sich nicht wieder in den Anfangszustand zurückverwandeln»: als letzter Effekt nur ein kurzes Überblenden)
    phasen = art === "welle" ? [["duenung", "Dünung", 2.6], ["spalt", "Doppelspalt", 2.8], ["wellen", "Wellen", 1.2]]
      : [["schwelle", "Schwelle", 1.2], ["sortieren", "Sortieren", 5.6]];
    if (letzt) phasen.push(["bild", "Bild", art === "welle" ? 1.4 : 0.8]);
    else { ueber = 1.0; uebergang = naechstes === "montage" ? "felder" : "front"; }
  } else if (art === "tuch") {
    phasen = [["tuch", "Tuch", vorher === "tiefe" ? 4.6 : 5.0]];
    if (naechstes === "montage") { ueber = 0.8; uebergang = "felder"; } else phasen.push(["bild", "Bild", 3.4]);
  } else {
    // die Montage steht immer am Schluss; nach einem anderen Effekt schneiden Rechtecke ihn weg, sie beginnt schon zerschnitten
    phasen = [["schnitte", "Schnitte", erst ? 2.5 : 2.0], ["montage", "Montage", 7.0], ["bild", "Bild", 2.6]];
  }
  const dauer = phasen.reduce((s, p) => s + p[2], 0);
  return { art, erst, letzt, vorher, naechstes, phasen, dauer, ueber, uebergang };
}

/** die Kette in Sekunden bei Tempo «normal»: { teile: [{ ...rolle, von, bis, vonFoto }], phasen: [{ name, titel, von, bis, art }], dauer } */
export function kette(a) {
  const liste = effekte(a), teile = [], phasen = [];
  let t = 0, ueber = 0;
  liste.forEach((art, i) => {
    const R = rolle(art, liste, i), von = Math.max(0, t - ueber), bis = von + R.dauer;
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
export function zeitachse({ tempo = "normal", signet = true, ablauf = KETTE } = {}) {
  const art = ablaufName(ablauf), f = TEMPO[tempo] ?? (typeof tempo === "number" ? tempo : 1);
  const K = kette(art), ab = {};
  let t = 0;
  const dazu = (name, d) => { ab[name] = [t, t + d]; t += d; };
  dazu("vor", 0.4);
  const von = t;
  const teile = K.teile.map((tl) => ({ ...tl, von: von + tl.von * f, bis: von + tl.bis * f }));
  const phasen = K.phasen.map((p) => ({ ...p, von: von + p.von * f, bis: von + p.bis * f }));
  t = von + K.dauer * f;
  const abschnitt = { von, bis: t };
  // endet die Kette mit der Montage, geht das Foto nahtlos ins Signet über (Rückmeldung vom 19. Oktober 2026: «Das Schlussbild bleibt relativ lange
  // stehen, bevor das Logo kommt. Das kann nahtloser passieren»); seither ohne Stehen (Rückmeldung: «sie endet, es kommt das Schlussbild und startet
  // nochmals vor dem Logo»): die Montage rastet nicht ins Foto ein, sie schneidet geradewegs ins Signet
  const nahtlos = signet && effekte(art).at(-1) === "montage";
  if (nahtlos) { dazu("stehen", 0); dazu("signet", SIGNET); dazu("signetStehen", 0.6); dazu("signetAus", 0.6); dazu("schluss", 0.2); }
  else {
    dazu("stehen", 3.2);
    if (signet) { dazu("bildAus", 0.9); dazu("pause", 0.15); dazu("signet", SIGNET); dazu("signetStehen", 0.6); dazu("signetAus", 0.6); dazu("schluss", 0.2); }   // zusammen ABSPANN
    else dazu("schluss", 0.3);
  }
  return { ab, ablauf: art, abschnitt, teile, phasen, dauer: t, bilder: Math.round(t * 30), tempo: f, nahtlos };
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
