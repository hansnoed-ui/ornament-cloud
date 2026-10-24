// ORNAMENT LAB – Adapter für den Zettelkasten («Zu seiner Zeit»: 49 Strophen in sieben Zyklen; seit Lab 0.1.18). Liest die erzeugten Daten
// des Dritten Rads (alpha/drittes-rad/daten.js, aus src/data/zu-seiner-zeit.json), die Texte bleiben unverändert. Zieht eine Strophe mit dem
// Startwert (gleichverteilt, darum wiederholbar; «Zufall» im Zettelkasten selbst zieht echt zufällig) oder nimmt die gewählte, und gibt sie
// als Befund (METADATA) aus. Die Wahl wird mit ihrer Art protokolliert: Ziehung = Zufall, eigene Wahl = Mensch. Das Bild dazu macht
// lab.karte (operationen/karte.js). jev bekommt die Strophe nie zu sehen.
import { STROPHEN, ZYKLEN } from "../../../alpha/drittes-rad/daten.js";
import { zufall } from "../../../alpha/the-fictory/analyse.js?v=23";

export const BESTAND = STROPHEN.length;
const zyklusTitel = (c) => ZYKLEN.find(([k]) => k === c)?.[1] ?? "";
/** die Strophen zur Wahl, wie sie der Zettelkasten zählt */
export const STROPHEN_WAHL = STROPHEN.map((s) => ({ wert: String(s.n), name: `${s.n}. ${s.t}` }));
/** die nahen Strophen: alle, die eine Person der Verweise teilen (wie die Fäden auf den Zettelkarten des Neubaus, tools/b-kacheln.mjs) */
export const naheStrophen = (s) => {
  const personen = new Set((s.r ?? []).map((v) => v.p));
  return STROPHEN.filter((o) => o.n !== s.n && (o.r ?? []).some((v) => personen.has(v.p))).map((o) => o.n);
};
/** eine Strophe als Befund: Nummer, Zyklus, Titel, Leitsatz (Bottom-Line) und Text, dazu ihre Adresse, (seit Lab 0.1.26, für das Intro der
 *  Signatur) die vier Verweise: Person, Werk, Disziplin, und (seit 0.1.33, für das Feld auf der Karte) die Nummern der nahen Strophen */
export const stropheDaten = (s) => ({
  nummer: s.n, slug: s.s, zyklus: s.c, zyklusTitel: zyklusTitel(s.c), titel: s.t, leitsatz: s.b, text: s.x,
  verweise: (s.r ?? []).map((v) => ({ person: v.p, werk: v.w, disziplin: v.d })), nahe: naheStrophen(s),
  adresse: `https://ornament.cloud/zu-seiner-zeit/strophe/${s.s}/`, kennzeichnung: "Text unverändert aus dem Zettelkasten",
});

export const zettel = {
  id: "zettel.strophe",
  name: "Zettel aus dem Zettelkasten",
  version: "0.1.0",
  klasse: "selektion",
  herkunft: { art: "adapter", quelle: "Zettelkasten (Zu seiner Zeit, 49 Strophen in sieben Zyklen)", datei: "alpha/drittes-rad/daten.js (erzeugt aus src/data/zu-seiner-zeit.json)", referenz: null },
  beschreibung: `Zieht eine der ${BESTAND} Strophen des Zettelkastens mit dem Startwert oder nimmt die gewählte: Nummer, Zyklus, Titel, Leitsatz und Text, unverändert.`,
  eingaenge: [],
  ausgaenge: [{ name: "strophe", typ: "METADATA" }],
  parameter: [
    { id: "strophe", name: "Strophe", art: "wahl", standard: "", optionen: [{ wert: "", name: "mit dem Startwert ziehen" }, ...STROPHEN_WAHL] },
  ],
  voraussetzungen: [],
  ressourcen: { zeit: "sofort", speicher: "gering" },
  reproduzierbar: "ja",
  varianten: "keine",

  async ausfuehren(_, p, kontext = {}) {
    const seed = (kontext.seed ?? 1) >>> 0;
    const gewaehlt = p.strophe ? STROPHEN.find((s) => String(s.n) === String(p.strophe)) : null;
    if (p.strophe && !gewaehlt) throw new Error(`Strophe ${p.strophe} gibt es nicht`);
    const s = gewaehlt ?? STROPHEN[Math.min(BESTAND - 1, Math.floor(zufall(seed)() * BESTAND))];
    const entscheidungen = [gewaehlt
      ? { art: "mensch", gegenstand: "strophe", gewaehlt: s.n, details: { bestand: BESTAND } }
      : { art: "zufall", gegenstand: "strophe", gewaehlt: s.n, details: { verfahren: "gleichverteilt mit dem Startwert (wiederholbar); der Zettelkasten selbst zieht echt zufällig", bestand: BESTAND, startwert: seed } }];
    return {
      ausgaben: [{ typ: "METADATA", titel: `Zettel ${s.n}: ${s.t}`, daten: stropheDaten(s) }],
      entscheidungen,
      protokoll: { strophe: s.n, zyklus: s.c, quelle: gewaehlt ? "gewählt" : "gezogen" },
    };
  },
};
