// «Principesse» – Ablauf des Films (ohne DOM). Hochformat 3 : 4 (1080 × 1440), 30 Bilder pro Sekunde.
//   leere Leinwand → das Bild malt sich mit Pinselstrichen (breit bis fein, 5–8 s) → steht, der Glitzer funkelt (3 s) → blendet aus
//   → (wenn gewählt) ein Foto blendet ein, darauf erscheint der Satz Buchstabe um Buchstabe → blendet aus
//   → das Signet: eine kleine Prinzessin zeichnet sich, «Principesse» → steht → blendet aus.
import { textEin, zeichenZahl, woerter, klemm } from "../sketchory/ablauf.js?v=8";
import { DAUER as SIGNET } from "./signet.js?v=1";

export { BREITE, HOEHE, FPS, anteil, weich, ausblenden, bezier, versatz, ZEICHEN, satzbild, satzPunkt } from "../sketchory/ablauf.js?v=8";

/** Zeitachse in Sekunden: { ab: { name: [anfang, ende] }, dauer, bilder } */
export function zeitachse({ malen = 6, foto = false, text = "" } = {}) {
  const z = zeichenZahl(text), n = woerter(text).length;
  const teile = [];
  let t = 0;
  const dazu = (name, d) => { teile.push([name, t, t + d]); t += d; };
  dazu("vor", 0.4);
  dazu("malen", malen);
  dazu("stehen", 3);
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
  const ANTEIL = [0.26, 0.2, 0.18, 0.18, 0.18].slice(0, stufen);
  const ZUG = [0.45, 0.32, 0.18, 0.1, 0.06];             // so lange wächst ein Strich je Stufe (Sekunden)
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
