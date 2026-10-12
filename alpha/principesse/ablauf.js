// «Principesse» – Ablauf des Films (ohne DOM). Format wählbar (wie das Bild, 3 : 4, 1 : 1; kurze Seite 1080, lange höchstens 1920), 30 Bilder pro Sekunde.
//   leere Leinwand → das Bild malt sich mit Pinselstrichen (drei Durchgänge von breit bis fein, jeder von oben nach unten, 5–8 s) → geht ins scharfe Bild über und steht, der Glitzer funkelt (5 s) → blendet aus
//   → (wenn gewählt) ein Foto blendet ein, darauf erscheint der Satz Buchstabe um Buchstabe → blendet aus
//   → das Signet: eine kleine Prinzessin zeichnet sich, «Principesse» → steht → blendet aus.
import { textEin, zeichenZahl, woerter, klemm } from "../sketchory/ablauf.js?v=8";
import { DAUER as SIGNET } from "./signet.js?v=15";

export { FPS, anteil, weich, ausblenden, bezier, versatz, ZEICHEN, satzbild, satzPunkt } from "../sketchory/ablauf.js?v=8";

/** Bildmass des Films für ein Format: "3:4", "1:1" oder "bild" (wie das Ausgangsbild, kurze Seite 1080, lange Seite höchstens 1920, gerade Zahlen) */
export function filmMass(format, bildBreite = 3, bildHoehe = 4) {
  if (format === "1:1") return [1080, 1080];
  if (format !== "bild") return [1080, 1440];
  const gerade = (n) => Math.round(n / 2) * 2, v = bildHoehe / bildBreite;
  return v >= 1 ? [1080, gerade(Math.min(1920, 1080 * v))] : [gerade(Math.min(1920, 1080 / v)), 1080];
}

/** Zeitachse in Sekunden: { ab: { name: [anfang, ende] }, dauer, bilder } */
export function zeitachse({ malen = 6, foto = false, text = "" } = {}) {
  const z = zeichenZahl(text), n = woerter(text).length;
  const teile = [];
  let t = 0;
  const dazu = (name, d) => { teile.push([name, t, t + d]); t += d; };
  dazu("vor", 0.4);
  dazu("malen", malen);
  dazu("stehen", 5);
  dazu("bildAus", 1.5);
  if (foto || z) {
    dazu("pause", 0.3);
    dazu("fotoEin", 0.9);
    // der Satz erscheint, während das Foto noch einblendet, und steht lang genug zum Lesen
    const ein = z ? textEin(z) : 0;
    dazu("zweitStehen", Math.max(foto ? 2.6 : 0, z ? ein + klemm(1.0 + 0.3 * n, 2, 5) : 0));
    dazu("zweitAus", 1.3);
  }
  dazu("pause2", 0.4);
  dazu("signet", SIGNET);
  dazu("signetStehen", 1);
  dazu("signetAus", 1.3);
  dazu("schluss", 0.4);
  const ab = Object.fromEntries(teile.map(([name, a, b]) => [name, [a, b]]));
  return { ab, dauer: t, bilder: Math.round(t * 30) };
}

/** Malplan: jedem Strich Beginn und Ende (Sekunden ab Malbeginn). Breite Pinsel zuerst; jede Stufe bekommt ihren Teil der Zeit,
 *  die Striche einer Stufe beginnen nacheinander und wachsen in kurzer Zeit zu ihrer Länge (breite langsamer als feine). */
export function malplan(striche, stufen, dauer) {
  const ANTEIL = [0.3, 0.24, 0.24, 0.22, 0.2].slice(0, stufen);
  const ZUG = [0.6, 0.42, 0.28, 0.18, 0.12];                 // so lange wächst ein Strich je Stufe (Sekunden)
  const summe = ANTEIL.reduce((a, b) => a + b, 0);
  const zahl = Array(stufen).fill(0);
  for (const s of striche) zahl[s.stufe]++;
  let a = 0;
  const fenster = ANTEIL.map((x) => { const f = [a, a + (x / summe) * dauer]; a = f[1]; return f; });
  const nr = Array(stufen).fill(0);
  return striche.map((s) => {
    const [von, bis] = fenster[s.stufe], zug = Math.min(ZUG[s.stufe] ?? 0.1, (bis - von) * 0.5);
    const beginn = von + ((bis - von - zug) * nr[s.stufe]++) / Math.max(1, zahl[s.stufe] - 1);
    return [beginn, beginn + zug];
  });
}

export function dateiname(zeit, endung) {
  const z = (n) => String(n).padStart(2, "0");
  return `principesse-${zeit.getFullYear()}-${z(zeit.getMonth() + 1)}-${z(zeit.getDate())}-${z(zeit.getHours())}${z(zeit.getMinutes())}.${endung}`;
}
