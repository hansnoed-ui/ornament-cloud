// Grooves: Stile mit ihren Spuren und Mustern. Ein Takt ist eine Zeile aus Schlägen, durch Leerzeichen getrennt; 16 Zeichen = Sechzehntel,
// 8 = Achtel, 12 = Triolen, beliebige andere Zahl gleichmässig verteilt. Ein Schlag:
//   .  oder  -        Pause
//   x  o  g           Schlag (0,8), leiser (0,6), Geisternote (0,32), mit der ersten Artikulation der Stimme
//   na  doum  tek …   eine Artikulation der Stimme (0,8)
//   …!  …_            betont (1,0) oder leise (× 0,55)
// Swing verschiebt jeden zweiten Schlag nach hinten (Anteil eines Schritts), «versatz» legt die ganze Spur hinter den Schlag (ms).

const RAUM_NAH = { anteil: 20, nachhall: 1.6, daempfung: 6000, vorverz: 15, groesse: 0.9, tiefschnitt: 180 };
const RAUM_WEIT = { anteil: 30, nachhall: 3.4, daempfung: 4200, vorverz: 28, groesse: 1.5, tiefschnitt: 160, bewegung: 35, frueh: 30 };

/** eine Spur eines Stils */
const S = (erzeuger, stimme, variante, takte, mehr = {}) => ({ erzeuger, stimme, variante, takte, ...mehr });
const D = "drums@0.1.0", PK = "perkussion@0.1.0";

export const STILE = Object.freeze([
  { key: "dnb", name: "Drum and Bass", gruppe: "elektronisch", bpm: 174, swing: 0, menschlich: 1.5, bass: { stimme: "reese", variante: "Ed Rush dunkel", linie: "lang", leiter: "moll", bassfett: { sub: 25, obertoene: 30 } }, spuren: [
    S(D, "kick", "DnB", ["x! . . . . . . . . . x . . . . .", "x! . . . . . . . . . x . . . . .", "x! . . . . . . . . . x . . . . .", "x! . . . . . . . x . x . . . . ."]),
    S(D, "snare", "DnB Crack", [". . . . x! . . . . . . . x! . . .", ". . . . x! . . g . . . . x! . . g"], { fill: ". . . . x! . . . . . . . x! . x x", menschlich: 1 }),
    S(D, "hat", "eng", ["x . o g x . o . x . o g x . o g"]),
    S(D, "shaker", "eng", ["x g o g x g o g x g o g x g o g"]),
    S(D, "offen", "kurz", [". . . . . . . . . . . . . . . .", ". . . . . . . . . . . . . . x ."]),
  ] },
  { key: "hiphop", name: "Hip-Hop (Boom Bap)", gruppe: "elektronisch", bpm: 90, swing: 0.16, menschlich: 4, bass: { stimme: "analog", variante: "G-Funk", linie: "kick", leiter: "moll", bassfett: { obertoene: 35 } }, spuren: [
    S(D, "kick", "Boom Bap", ["x! . . . . . . x . . x . . . . .", "x! . . . . . . x . . x . . . x ."]),
    S(D, "snare", "Boom Bap", [". . . . x! . . . . . . . x! . . ."], { versatz: 12, fill: ". . . . x! . . . . . . . x! . . g" }),
    S(D, "hat", "staubig", ["x . o . x . o . x . o . x . o g"]),
    S(D, "rim", "Sidestick", [". . . . . . . . . . . . . . . .", ". . . . . . . . . . . x . . . ."]),
  ] },
  { key: "pop", name: "Pop", gruppe: "elektronisch", bpm: 100, swing: 0, menschlich: 1.5, bass: { stimme: "ebass", variante: "Finger", linie: "kick", leiter: "moll" }, spuren: [
    S(D, "kick", "Pop", ["x! . . . . . . . x . x . . . . ."]),
    S(D, "snare", "gross", [". . . . x! . . . . . . . x! . . ."]),
    S(D, "clap", "909", [". . . . x . . . . . . . x . . ."], { pegel: -8 }),
    S(D, "hat", "fein", ["x . o . x . o . x . o . x . o ."]),
    S(D, "shaker", "fein", ["x g o g x g o g x g o g x g o g"]),
  ] },
  { key: "minimal", name: "Minimal", gruppe: "elektronisch", bpm: 124, swing: 0.08, menschlich: 1, bass: { stimme: "sub", variante: "kurz", linie: "offbeat", leiter: "phrygisch", bassfett: { obertoene: 40 } }, spuren: [
    S(D, "kick", "Minimal", ["x! . . . x . . . x . . . x . . ."]),
    S(D, "clap", "Minimal", [". . . . x . . . . . . . x . . ."]),
    S(D, "hat", "eng", [". . x . . . x . . . x . . . x g"]),
    S(D, "rim", "Minimal", [". . . x . . x . . x . . . . x .", ". . . x . . x . . . . x . . x ."]),
    S(D, "shaker", "Sand", ["g g o g g g o g g g o g g g o g"]),
  ] },
  { key: "goa", name: "Goa, Psytrance", gruppe: "elektronisch", bpm: 145, swing: 0, menschlich: 0.5, bass: { stimme: "analog", variante: "Goa rollend", linie: "offbeat", leiter: "phrygisch" }, spuren: [
    S(D, "kick", "Goa", ["x! . . . x . . . x . . . x . . ."]),
    S(D, "hat", "Goa scharf", ["x g o g x g o g x g o g x g o g"]),
    S(D, "offen", "Goa zischend", [". . x . . . x . . . x . . . x ."]),
    S(D, "clap", "Goa hell", [". . . . x . . . . . . . x . . ."], { pegel: -6 }),
    S(D, "ride", "Goa", ["x . . . x . . . x . . . x . . ."]),
  ] },
  { key: "house", name: "House", gruppe: "elektronisch", bpm: 124, swing: 0.1, menschlich: 1.5, bass: { stimme: "ebass", variante: "Dub", linie: "offbeat", leiter: "dorisch" }, spuren: [
    S(D, "kick", "House 909", ["x! . . . x . . . x . . . x . . ."]),
    S(D, "clap", "909", [". . . . x . . . . . . . x . . ."]),
    S(D, "offen", "House", [". . x . . . x . . . x . . . x ."]),
    S(D, "hat", "909", ["x g o g x g o g x g o g x g o g"], { pegel: -14 }),
    S(D, "shaker", "fein", ["g . o . g . o . g . o . g . o ."]),
  ] },
  { key: "indien", name: "Indien (Tabla, Keherwa)", gruppe: "organisch", bpm: 92, swing: 0.04, menschlich: 5, raum: RAUM_NAH, bass: { stimme: "rund", variante: "Kruder & Dorfmeister", linie: "riff", leiter: "phrygisch" }, spuren: [
    S(PK, "tabla", "Konzert", ["dha! . ge . na . ti . na . ka . dhi . na .", "dha! . ge . na . ti ra ki ta na . dhi . na .", "dha! ge na ge na . ka . ta . ka . dhi . na .", "dha! . ge . na . ti . na_ ka_ ta . dhi . na ."],
      { fill: "ti ra ki ta dha . ti ra ki ta dha . ti ra ki ta" }),
    S(D, "shaker", "Kaxixi", ["x . g . o . g . x . g . o . g g"], { pegel: -16 }),
  ] },
  { key: "orient", name: "Orient (Maqsum)", gruppe: "organisch", bpm: 100, swing: 0.06, menschlich: 5, raum: RAUM_NAH, bass: { stimme: "kontrabass", variante: "Jazz", linie: "kick", leiter: "hijaz" }, spuren: [
    S(PK, "darbuka", "ägyptisch", ["doum! . tek . . . tek . doum . . . tek . . .", "doum! . tek ka ka . tek ka doum . ka . tek . ka .", "doum! . tek . ka . tek . doum . doum . tek . ka ."], { fill: "doum! . tek ka tek ka tek ka tek ka tek ka tek! . . ." }),
    S(PK, "riq", "klassisch", ["dum . tek_ tek_ tek . tek_ tek_ dum . tek_ . tek . tek_ tek_"]),
    S(PK, "rahmen", "Bendir", ["dum! . . . . . . . dum . . . . . . .", "dum! . . . . . . . dum . . . . . tek_ ."]),
  ] },
  { key: "ecm", name: "ECM (Rahmentrommel, Raum)", gruppe: "organisch", bpm: 72, swing: 0.05, menschlich: 7, raum: RAUM_WEIT, bass: { stimme: "kontrabass", variante: "warm singend", linie: "walking", leiter: "dorisch" }, spuren: [
    S(PK, "rahmen", "ECM Raum", ["dum! . . . . . . tek_ . . dum_ . . . tek_ .", "dum! . . . . . tek_ . . . dum_ . . tek_ . ."]),
    S(PK, "darbuka", "ECM leise", [". . ka_ . . tek_ . . . . ka_ . tek_ . . .", ". . ka_ . . . tek_ . . . ka_ . . tek_ ka_ ."]),
    S(PK, "riq", "ECM leise", [". . . . . . . . zil_ . . . . . . .", ". . . . . . . . . . . . zil_ . . ."]),
    S(PK, "udu", "ECM", [". . . . . . . . . . . . . . bum_ .", ". . . . . . . bum_ . . . . . . . ."]),
  ] },
  { key: "persisch", name: "Persisch (Zarb)", gruppe: "organisch", bpm: 96, swing: 0.05, menschlich: 5, raum: RAUM_NAH, bass: { stimme: "rund", variante: "Dub tief", linie: "riff", leiter: "harmonisch" }, spuren: [
    S(PK, "zarb", "persisch", ["tom! . bak . tom . bak bak . tom bak . eshare eshare bak .", "tom! . bak eshare tom . bak . pelang . bak . tom . bak eshare"], { fill: "tom! bak bak bak tom bak bak bak tom bak bak bak pelang . . ." }),
    S(PK, "rahmen", "Tar", ["dum! . . . . . . . . . dum . . . . .", "dum! . . . . . . . . . dum . . . tek_ ."]),
  ] },
]);

export const stilVon = (key) => STILE.find((s) => s.key === key);

/** ein Takt → [{ stelle (0–1 im Takt), art, staerke }] */
export function taktLesen(zeile, ersteArt = "x") {
  const t = String(zeile).trim().split(/\s+/).filter(Boolean), n = t.length || 1, out = [];
  t.forEach((tok, i) => {
    if (tok === "." || tok === "-") return;
    let st = 0.8, kern = tok;
    if (kern.endsWith("!")) { kern = kern.slice(0, -1); st = 1; } else if (kern.endsWith("_")) { kern = kern.slice(0, -1); st = 0.45; }
    let art = kern;
    if (kern === "x" || kern === "o" || kern === "g") { art = ersteArt; if (st === 0.8) st = kern === "x" ? 0.8 : kern === "o" ? 0.6 : 0.32; }
    out.push({ stelle: i / n, schritt: i, n, art, staerke: st });
  });
  return out;
}
