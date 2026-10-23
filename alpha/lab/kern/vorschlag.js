// ORNAMENT LAB – Vorschlag für eine Animation von 30 Sekunden aus einem Bild und einem Klang (seit Lab 0.1.11).
// Drei Schritte, alle im Projekt protokolliert: messen (Tonsignal und kompositorisches Profil, ausgeführt wie jede Operation), in feste
// Stufen übersetzen (merkmaleMessen) und eine Dramaturgie wählen. Die Wahl trifft jev live über die Zwischenstelle (Entscheidungsform
// CHOICE, jev/fragen.js) oder, ohne jev, feste Regeln (regelDramaturgie, Entscheidungsart «regel»). jev sieht dabei nur die Stufen,
// nie Bild oder Klang. Eine Dramaturgie ist ein festes Rezept aus Operationen des Registers und einem Plan für den Film über Stationen
// (kern/stationen.js); vorschlagAusfuehren() rechnet die Operationen und gibt den Plan zurück. Der Mensch übernimmt, wählt eine andere
// Dramaturgie oder verändert den Film danach unter «Nacheinander» wie jeden anderen. Ohne DOM, geprüft in tests/lab.test.mjs.
import { DRAMATURGIEN, MERKMALE } from "../jev/fragen.js";
import { ergebnis, entscheide, GRENZEN } from "./projekt.js";
import { fuehreAus } from "./ausfuehrung.js";

export const VORSCHLAG_VERSION = "0.1.0";
export const DAUER = 30;   // Sekunden: so lang wird der Film, wenn der Klang lang genug ist

/**
 * Die Rezepte. schritte: Operationen nacheinander, jede auf dem Ergebnis der vorigen; route: das Steuersignal (Lautstärke des Klangs)
 * moduliert diesen Parameter über die Varianten, so stehen Momente des Klangs nebeneinander. film: Übergang, Halten, Übergangsdauer und
 * takt (Wechsel je Sekunde auf den Anschlägen) oder null (gleichmässig, das Halten füllt die Dauer).
 */
export const REZEPTE = Object.freeze({
  "vorschlag.puls": { name: "Puls", schritte: [{ operation: "lab.feedback", parameter: { seite: 720 }, anzahl: 6, route: { ziel: "zoom", tiefe: 0.35 } }],
    film: { art: "schnitt", uebergang: 0, halten: 1, takt: 2.5 } },
  "vorschlag.zerfall": { name: "Zerfall", schritte: [{ operation: "fictory.prozess", parameter: {} }],
    film: { art: "schwelle", uebergang: 1.6, takt: null } },
  "vorschlag.spiegel": { name: "Spiegelung", schritte: [{ operation: "lab.komposition", parameter: { seite: 900 }, anzahl: 6, route: { ziel: "symmetrie", tiefe: 0.9 } }],
    film: { art: "blende", uebergang: 0.6, halten: 1, takt: 1 } },
  "vorschlag.farbwelle": { name: "Farbwelle", schritte: [{ operation: "lab.farbe", parameter: { saettigung: 1.3 }, anzahl: 8, route: { ziel: "farbdrehung", tiefe: 1 } }],
    film: { art: "blende", uebergang: 0.5, halten: 1, takt: 1.2 } },
  "vorschlag.raster": { name: "Vervielfältigung", schritte: [{ operation: "lab.wiederholung", parameter: { seite: 1200 }, anzahl: 6, route: { ziel: "groesse", tiefe: 0.5 } }],
    film: { art: "schnitt", uebergang: 0, halten: 1, takt: 2 } },
  "vorschlag.steigerung": { name: "Steigerung", schritte: [
    { operation: "lab.farbe", parameter: { farbdrehung: 40, saettigung: 1.4 } },
    { operation: "lab.wiederholung", parameter: { spalten: 3, zeilen: 3, seite: 1200 } },
    { operation: "lab.feedback", parameter: { iterationen: 30, seite: 900 } }],
    film: { art: "schwelle", uebergang: 2.5, takt: null } },
});

const rund = (x, s = 1000) => Math.round(x * s) / s;
const mittel = (a) => (a.length ? a.reduce((s, v) => s + v, 0) / a.length : 0);
const stufe = (v, unten, oben, [a, b, c]) => (v < unten ? a : v > oben ? c : b);

/**
 * Messwerte in feste Stufen (MERKMALE in jev/fragen.js). profil: Daten von «Kompositorisches Profil»; signal: Daten eines Tonsignals
 * (Hüllkurve, nicht gestreckt); einsaetze: Daten der Ereignisfolge. Gibt { merkmale, werte } zurück; die Werte stehen im Protokoll.
 */
export function merkmaleMessen({ profil, signal, einsaetze }) {
  const dauer = Math.max(0.1, einsaetze?.dauer ?? signal?.dauer ?? DAUER);
  const anschlaege = (einsaetze?.ereignisse ?? []).filter((x) => (x.staerke ?? 1) >= 0.2).length;
  const w = signal?.werte ?? [], drittel = Math.max(1, Math.floor(w.length / 3));
  const anfang = mittel(w.slice(0, drittel)), ende = mittel(w.slice(-drittel)), m = mittel(w);
  const streuung = Math.sqrt(mittel(w.map((v) => (v - m) ** 2)));
  const werte = {
    kontrast: profil.kontrast.gesamt, saettigung: profil.farbe.saettigung, helligkeit: profil.licht.helligkeit,
    symmetrie: Math.max(profil.symmetrie.linksRechts, profil.symmetrie.obenUnten),
    anschlaegeJeSekunde: rund(anschlaege / dauer), lautAnfang: rund(anfang), lautEnde: rund(ende), lautStreuung: rund(streuung), dauer: rund(dauer),
  };
  const merkmale = {
    kontrast: stufe(werte.kontrast, 0.14, 0.26, ["niedrig", "mittel", "hoch"]),
    farbigkeit: stufe(werte.saettigung, 0.06, 0.2, ["grau", "gedaempft", "bunt"]),
    symmetrie: werte.symmetrie >= 0.8 ? "symmetrisch" : "asymmetrisch",
    helligkeit: stufe(werte.helligkeit, 0.35, 0.65, ["dunkel", "mittel", "hell"]),
    dichte: stufe(werte.anschlaegeJeSekunde, 0.5, 2, ["ruhig", "bewegt", "dicht"]),
    dynamik: ende - anfang > 0.15 ? "anschwellend" : anfang - ende > 0.15 ? "abschwellend" : streuung > 0.22 ? "wechselhaft" : "gleichmaessig",
  };
  return { merkmale, werte };
}

/** feste, offen gelegte Regeln: welche Dramaturgie zu welchen Stufen passt (kein Urteil über Bild oder Klang) */
const REGELN = [
  ["vorschlag.puls", "dichte", "dicht", 2, "dichte Anschläge tragen schnelle Schnitte"],
  ["vorschlag.puls", "dichte", "bewegt", 1, "regelmässige Anschläge geben einen Puls"],
  ["vorschlag.puls", "dynamik", "wechselhaft", 1, "wechselnde Lautstärke verändert den Zoom deutlich"],
  ["vorschlag.raster", "dichte", "dicht", 1, "dichte Anschläge tragen schnelle Schnitte"],
  ["vorschlag.raster", "kontrast", "hoch", 1, "hoher Kontrast bleibt auch in kleinen Kopien lesbar"],
  ["vorschlag.spiegel", "symmetrie", "asymmetrisch", 1.5, "ein asymmetrisches Bild hat etwas, das sich spiegeln oder umkehren lässt"],
  ["vorschlag.spiegel", "dichte", "bewegt", 0.5, "regelmässige Anschläge lassen Zeit für Überblendungen"],
  ["vorschlag.farbwelle", "farbigkeit", "bunt", 1.5, "kräftige Farben machen die Farbdrehung sichtbar"],
  ["vorschlag.farbwelle", "farbigkeit", "gedaempft", 0.5, "gedämpfte Farben werden durch die Sättigung kräftiger"],
  ["vorschlag.farbwelle", "dynamik", "gleichmaessig", 1, "eine gleichmässige Lautstärke trägt eine ruhige Farbbewegung"],
  ["vorschlag.zerfall", "dichte", "ruhig", 2, "wenige Anschläge: ein langsamer Zerfall ohne Takt"],
  ["vorschlag.zerfall", "farbigkeit", "bunt", 0.5, "kräftige Farben ergeben deutliche Farbflächen"],
  ["vorschlag.zerfall", "dynamik", "abschwellend", 1, "ein leiser werdender Klang passt zu einem Zerfall"],
  ["vorschlag.steigerung", "dynamik", "anschwellend", 2.5, "ein lauter werdender Klang passt zu einer Steigerung"],
  ["vorschlag.steigerung", "dichte", "ruhig", 1, "wenige Anschläge: lange Übergänge ohne Takt"],
];
export function regelDramaturgie(merkmale) {
  return Object.keys(REZEPTE).map((id) => {
    const treffer = REGELN.filter(([d, k, v]) => d === id && merkmale[k] === v);
    return { dramaturgie: id, name: REZEPTE[id].name, gewicht: 1 + treffer.reduce((s, r) => s + r[3], 0), gruende: treffer.map((r) => r[4]) };
  }).sort((a, b) => b.gewicht - a.gewicht || a.name.localeCompare(b.name));
}

/** die Schwelle der Anschläge, damit höchstens jeSekunde Wechsel je Sekunde fallen (die stärksten zuerst); null, wenn zu wenige da sind */
export function taktSchwelle(einsaetze, jeSekunde) {
  const s = (einsaetze?.ereignisse ?? []).filter((x) => x.t > 0).map((x) => x.staerke ?? 1).sort((a, b) => b - a);
  if (s.length < 4) return null;
  const n = Math.max(4, Math.floor((einsaetze.dauer ?? DAUER) * jeSekunde));
  return s.length <= n ? 0 : s[n - 1];
}

/** Bild und Klang messen: Tonsignal (Hüllkurve ab «beginn», höchstens 30 s) und kompositorisches Profil, beide als Schritte im Projekt */
export async function messen({ register, projekt, medien, bild, ton, beginn = 0, melden = () => {}, abbrechen = null }) {
  const wahl = { art: "mensch", details: { anlass: "Vorschlag für 30 s: messen" } };
  const t = await fuehreAus({ register, projekt, medien, melden, abbrechen,
    auftrag: { operation: "lab.tonsignal", eingaben: { ton }, parameter: { merkmal: "laut", beginn, laenge: DAUER, proben: 120, normieren: false }, wahl } });
  const p = await fuehreAus({ register, projekt, medien, melden, abbrechen, auftrag: { operation: "lab.profil", eingaben: { bild }, wahl } });
  const [signal, einsaetze] = t.ergebnisse, profil = p.ergebnisse[0];
  return { bild, ton, beginn, signal: signal.id, einsaetze: einsaetze.id, profil: profil.id, ...merkmaleMessen({ profil: profil.daten, signal: signal.daten, einsaetze: einsaetze.daten }) };
}

/** die Lage für jev: nur Stufen und Kennungen */
export const jevLage = (messung) => ({ frage: "dramaturgie", merkmale: messung.merkmale, optionen: Object.keys(DRAMATURGIEN) });

/**
 * Eine Dramaturgie ausführen. messung: von messen(); wahl: { art: "jev"|"regel"|"mensch", details } für die Entscheidung «dramaturgie».
 * Gibt { entscheidung, ergebnisse, plan } zurück; plan: { stationen, art, halten, uebergang, takt, bewegung, tonspur, tonBeginn, dauer } für den Film
 * (bewegung: eine ruhige Kamera, deren Zoom mit der Lautstärke atmet).
 */
export async function vorschlagAusfuehren({ register, projekt, medien, messung, dramaturgie, wahl, seed = 1, melden = () => {}, abbrechen = null }) {
  const r = REZEPTE[dramaturgie];
  if (!r) throw new Error(`Dramaturgie ${dramaturgie} gibt es nicht`);
  const d = entscheide(projekt, { art: wahl.art, gegenstand: "dramaturgie", optionen: Object.keys(REZEPTE), gewaehlt: dramaturgie,
    details: { ...(wahl.details ?? {}), merkmale: messung.merkmale, werte: messung.werte, version: VORSCHLAG_VERSION } });
  let eingang = messung.bild;
  const ergebnisse = [];
  for (const [i, s] of r.schritte.entries()) {
    const routen = s.route ? [{ ziel: s.route.ziel, tiefe: s.route.tiefe, modulator: { quelle: "signal", ergebnis: messung.signal } }] : [];
    const x = await fuehreAus({ register, projekt, medien, melden, abbrechen,
      auftrag: { operation: s.operation, eingaben: { bild: eingang }, parameter: s.parameter, seed: (seed + i * 101) >>> 0,
        variation: { anzahl: s.anzahl ?? 1, achse: "varianten", routen },
        wahl: { art: wahl.art, details: { anlass: `Dramaturgie ${r.name}, Schritt ${i + 1} von ${r.schritte.length}`, entscheidung: d.id } } } });
    const bilder = x.ergebnisse.filter((e) => e.typ === "IMAGE");
    ergebnisse.push(...bilder);
    eingang = bilder.at(-1).id;
  }
  // die Stationen: das Bild, dann die Ergebnisse (Varianten nebeneinander oder die Schritte nacheinander)
  const stationen = [messung.bild, ...ergebnisse.map((e) => e.id)].slice(0, GRENZEN.stationen);
  const folge = ergebnis(projekt, messung.einsaetze)?.daten;
  const dauer = Math.min(DAUER, folge?.dauer ?? DAUER);
  const schwelle = r.film.takt ? taktSchwelle(folge, r.film.takt) : null;
  const takt = schwelle === null ? null : { ereignisfolge: messung.einsaetze, schwelle: rund(schwelle), wiederholen: true };
  // ohne Takt füllt das Halten die Dauer: n · halten + (n − 1) · Übergang = Dauer; bei kurzem Klang werden die Übergänge kürzer
  const n = stationen.length, uebergang = takt ? r.film.uebergang : rund(Math.min(r.film.uebergang, (0.6 * dauer) / Math.max(1, n - 1)), 10);
  const halten = takt ? r.film.halten : Math.max(0, Math.min(10, rund((dauer - (n - 1) * uebergang) / n, 10)));
  return { entscheidung: d, ergebnisse, plan: { stationen, art: r.film.art, halten, uebergang, takt, bewegung: { staerke: 0.6, signal: messung.signal }, lebendig: true, tonspur: messung.ton, tonBeginn: messung.beginn, dauer,
    ...(r.film.takt && !takt ? { hinweis: "zu wenige Anschläge für einen Takt, darum gleichmässig" } : {}) } };
}
