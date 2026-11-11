// ORNAMENT LAB – gemeinsame Hilfen der Adapter für die Bühnen von PHORMA I und II (operationen/phorma1.js, phorma2.js; seit Lab 0.1.22).
// Die Bilder der Apps hängen nur von der Zeit ab; hier steht, was beide Adapter gleich brauchen: Browser und WebGL 2 prüfen, das Bild als
// Leinwand in Rechengrösse mit seiner Analyse auf halber Grösse (wie in den Apps), der Titel der Beschriftung aus einem Zettel oder einer
// ORNA-Konstellation (visuell), und die Wahl des Ablaufs aus der Operationsregel einer Konstellation (operational).
export const imBrowser = () => typeof document !== "undefined";

let webgl2 = null;
/** WebGL 2 vorhanden? (einmal geprüft; die Bühnen prüfen selbst noch einmal) */
export function webgl2Da() {
  if (!imBrowser()) return false;
  if (webgl2 === null) { try { const c = document.createElement("canvas"); webgl2 = Boolean(c.getContext("webgl2")); } catch { webgl2 = false; } }
  return webgl2;
}
export const leinwand = (w, h) => { const c = document.createElement("canvas"); c.width = Math.max(2, Math.round(w)); c.height = Math.max(2, Math.round(h)); return c; };
export const gerade = (n) => Math.max(2, Math.round(n / 2) * 2);
export const klemm = (x, a, b) => Math.min(b, Math.max(a, x));

/** das Bild als Leinwand in Rechengrösse (längste Seite `seite`, gerade Masse) und seine Bildpunkte auf halber Grösse für die Analyse */
export function fotoBauen(bild, seite) {
  const f = Math.min(1, seite / Math.max(bild.width, bild.height));
  const B = gerade(bild.width * f), H = gerade(bild.height * f);
  const quelle = leinwand(bild.width, bild.height);
  quelle.getContext("2d").putImageData(new ImageData(new Uint8ClampedArray(bild.data), bild.width, bild.height), 0, 0);
  const foto = leinwand(B, H), fx = foto.getContext("2d", { willReadFrequently: true });
  fx.imageSmoothingQuality = "high"; fx.drawImage(quelle, 0, 0, B, H);
  const w = Math.max(4, Math.round(B / 2)), h = Math.max(4, Math.round(H / 2)), klein = leinwand(w, h), kx = klein.getContext("2d", { willReadFrequently: true });
  kx.imageSmoothingQuality = "high"; kx.drawImage(foto, 0, 0, w, h);
  return { foto, B, H, klein: { daten: kx.getImageData(0, 0, w, h).data, w, h } };
}

/** die Eingänge, die beide Adapter neben dem Bild annehmen: eine Konstellation (Regel → Ablauf, Titel) und ein Zettel (Titel) */
export const EINGAENGE = Object.freeze([
  { name: "bild", typ: "IMAGE" },
  { name: "konstellation", typ: "CONSTELLATION", optional: true },
  { name: "text", typ: "METADATA", optional: true },
]);
/** der Parameter «Beschriftung»: auto (an, wenn ein Zettel oder eine Konstellation am Eingang liegt), an, aus */
export const BESCHRIFTUNG = Object.freeze({ id: "beschriftung", name: "Beschriftung (Titel, Phase, Zeitcode)", art: "wahl", standard: "auto",
  optionen: [{ wert: "auto", name: "mit Zettel oder Konstellation" }, { wert: "an", name: "an" }, { wert: "aus", name: "aus" }] });
export const beschriftungAn = (p, { text, konstellation }) => p.beschriftung === "an" || (p.beschriftung !== "aus" && Boolean(text || konstellation));
/** der Titel oben links: der Titel des Zettels, sonst Künstler × Theoretiker der Konstellation, sonst der Name der App (die App setzt ihn) */
export function titelAus(text, konstellation) {
  if (text?.titel) return String(text.titel);
  if (konstellation?.kuenstler) return `${konstellation.kuenstler} × ${konstellation.theoretiker}`;
  return "";
}

/**
 * Den Ablauf wählen: der Mensch (Parameter), sonst die Operationsregel der Konstellation (Tabelle REGEL_ABLAUF der App), sonst der Standard.
 * Gibt { ablauf, herkunft: "mensch" | "orna" | "standard", regel } und die Entscheidung fürs Protokoll (nur bei ORNA).
 */
export function ablaufWaehlen(p, konstellation, REGEL_ABLAUF, standard, optionen) {
  if (p.ablauf) return { ablauf: p.ablauf, herkunft: "mensch", regel: null, entscheidungen: [] };
  const regel = konstellation?.regel ?? null, aus = regel ? REGEL_ABLAUF[regel] : null;
  if (!aus) return { ablauf: standard, herkunft: "standard", regel, entscheidungen: [] };
  return { ablauf: aus, herkunft: "orna", regel, entscheidungen: [{ art: "regel", gegenstand: "ablauf", optionen: optionen.map((o) => o.wert).filter(Boolean), gewaehlt: aus,
    details: { regel, regelName: konstellation.regelName ?? null, konstellation: konstellation.nummer ?? null, tabelle: REGEL_ABLAUF, hinweis: "feste Tabelle Operationsregel → Ablauf (gestalterische Interpretation)" } }] };
}
