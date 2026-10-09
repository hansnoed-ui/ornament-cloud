// «Die Stadt, die weitergeht» – die Fragen an jev und die Ersatzregeln.
// jev (api.typesafe.ai) ist ein Beurteiler: Er schätzt zu einer beschriebenen Lage, wie wahrscheinlich jede vorgegebene Wahl ist.
// tools/build-jev-stadt.ts stellt ihm diese Fragen EINMAL beim Bauen und legt die Antworten in jev.js ab. Die Seite ruft jev nie auf.
// Die Simulation schlägt in der Tabelle nach; fehlt die Tabelle oder passt die Prüfsumme nicht, gelten die einfachen Ersatzregeln unten.
// Die Tabelle ist ein Sprachmodell-Urteil über plausible Reaktionen, keine empirische Häufigkeit.

// ---------- 1. Querung der Hauptstrasse (Fussverkehr) ----------
export const PERSONEN = {
  zuegig: "eine Person, die zügig geht und heute Zeit hat",
  eilig: "eine Person, die zügig geht, aber heute wenig Zeit hat",
  pause: "eine Person, die auf längeren Wegen eine Pause braucht",
  rollstuhl: "eine Person, die mit dem Rollstuhl unterwegs ist",
  kinderwagen: "eine Person mit Kinderwagen",
  kind: "eine Person mit einem kleinen Kind an der Hand",
};
/** wer keine Treppen nehmen kann */
export const OHNE_TREPPE = new Set(["rollstuhl", "kinderwagen"]);

export const QUERUNG = {
  eben: {
    keine: "Eine ebenerdige Querung (Ampel oder Zebrastreifen) gibt es in der Nähe nicht.",
    kurz: "Über die ebenerdige Querung (Ampel oder Zebrastreifen) dauert der Weg kaum länger als direkt, Warten eingerechnet weniger als 1 Minute mehr.",
    mittel: "Über die ebenerdige Querung (Ampel oder Zebrastreifen) dauert der Weg, Warten eingerechnet, 1 bis 3 Minuten länger als direkt.",
    lang: "Über die ebenerdige Querung (Ampel oder Zebrastreifen) dauert der Weg, Warten eingerechnet, mehr als 3 Minuten länger als direkt.",
  },
  bruecke: {
    keine: "Eine Fussgängerbrücke gibt es nicht.",
    treppe: "Es gibt eine Fussgängerbrücke mit Treppen auf beiden Seiten; über sie dauert der Weg etwa 1 bis 2 Minuten länger.",
    rampe_mittel: "Es gibt eine Fussgängerbrücke mit langen Rampen und leichter Steigung; über sie dauert der Weg 1 bis 3 Minuten länger.",
    rampe_lang: "Es gibt eine Fussgängerbrücke mit langen Rampen und leichter Steigung; über sie dauert der Weg mehr als 3 Minuten länger.",
  },
  frei: {
    nein: "Ein Zaun in der Strassenmitte verhindert das Queren ausserhalb der Querungen.",
    ruhig: "Ausserhalb der Querungen ist der Verkehr gerade ruhig; man könnte zwischen den Autos hindurch queren.",
    dicht: "Ausserhalb der Querungen ist der Verkehr dicht; zwischen den Autos zu queren hiesse, lange auf eine Lücke zu warten.",
  },
  zweck: {
    verschiebbar: "Zweck: ein Einkauf im Laden auf der anderen Strassenseite; er liesse sich auch auf einen anderen Tag verschieben.",
    fest: "Zweck: ein fester Termin auf der anderen Strassenseite, zum Beispiel ein Kind um 16 Uhr von der Schule abholen.",
    freizeit: "Zweck: Freizeit auf der anderen Strassenseite, zum Beispiel der Park, der Platz oder das Atelier.",
  },
  ersatz: {
    ja: "Auf der eigenen Strassenseite gibt es ein ähnliches, aber kleineres Ziel.",
    nein: "Auf der eigenen Strassenseite gibt es kein ähnliches Ziel.",
  },
};
export const QUERUNG_WAHL = {
  eben: "geht zur ebenerdigen Querung, wartet dort und quert",
  bruecke: "nimmt die Fussgängerbrücke",
  frei: "quert direkt zwischen den Autos, ausserhalb der Querungen",
  ersatz: "geht stattdessen zum ähnlichen Ziel auf der eigenen Strassenseite",
  auslassen: "lässt den Weg heute aus, verschiebt ihn oder findet eine andere Lösung",
};

/** Welche Wahl in einer Lage überhaupt besteht (für eine bestimmte Person) */
export function querungOptionen(lage, person) {
  const o = [];
  if (lage.eben !== "keine") o.push("eben");
  if (lage.bruecke !== "keine" && !(lage.bruecke === "treppe" && OHNE_TREPPE.has(person))) o.push("bruecke");
  if (lage.frei !== "nein") o.push("frei");
  if (lage.ersatz === "ja") o.push("ersatz");
  o.push("auslassen");
  return o;
}
/** alle Lagen, die die Simulation nachschlagen kann (feste Termine haben kein Ersatzziel) */
export function querungLagen() {
  const aus = [];
  for (const eben of Object.keys(QUERUNG.eben)) for (const bruecke of Object.keys(QUERUNG.bruecke)) for (const frei of Object.keys(QUERUNG.frei))
    for (const zweck of Object.keys(QUERUNG.zweck)) for (const ersatz of Object.keys(QUERUNG.ersatz)) {
      if (zweck === "fest" && ersatz === "ja") continue;
      aus.push({ eben, bruecke, frei, zweck, ersatz });
    }
  return aus;
}
export const querungSchluessel = (l) => `${l.eben}|${l.bruecke}|${l.frei}|${l.zweck}|${l.ersatz}`;

/** Ersatzregel: einfache Abwägung von Zeitaufwand, Zeitdruck und Zweck (nur ohne jev-Tabelle) */
export function querungErsatz(lage, person) {
  const kosten = { kurz: 0.5, mittel: 2, lang: 4.5, keine: 99 };
  const brueckeKosten = { treppe: person === "pause" ? 3.5 : person === "kind" ? 2.5 : 1.5, rampe_mittel: person === "rollstuhl" || person === "pause" ? 3 : 2, rampe_lang: 5, keine: 99 };
  const eile = person === "eilig" ? 1.6 : 1;
  const w = {};
  for (const o of querungOptionen(lage, person)) {
    let k;
    if (o === "eben") k = kosten[lage.eben] * eile;
    else if (o === "bruecke") k = brueckeKosten[lage.bruecke] * eile;
    else if (o === "frei") k = (lage.frei === "ruhig" ? 1.2 : 3.5) + (["rollstuhl", "kinderwagen", "kind", "pause"].includes(person) ? 3 : 0) - (person === "eilig" ? 0.8 : 0);
    else if (o === "ersatz") k = lage.zweck === "freizeit" ? 2.2 : 2.6;
    else k = lage.zweck === "fest" ? 7 : lage.zweck === "freizeit" ? 3.4 : 4.2;
    w[o] = Math.exp(-k / 1.1);
  }
  return normiere(w);
}

// ---------- 2. Fahrten durch das Quartier (Autoverkehr von aussen) ----------
export const FAHRT = {
  zeit: {
    frei: "Mit dem Auto dauert die Fahrt durch das Quartier zurzeit etwa so lange wie bei freier Strasse.",
    etwas: "Mit dem Auto dauert die Fahrt durch das Quartier zurzeit etwas länger als bei freier Strasse, bis anderthalbmal so lange.",
    deutlich: "Mit dem Auto dauert die Fahrt durch das Quartier zurzeit deutlich länger als bei freier Strasse, bis dreimal so lange.",
    sehr: "Mit dem Auto dauert die Fahrt durch das Quartier zurzeit mehr als dreimal so lange wie bei freier Strasse; es gibt regelmässig Stau.",
  },
  bus: {
    selten: "Der Bus auf derselben Strecke fährt alle 15 Minuten.",
    oft: "Der Bus auf derselben Strecke fährt alle 7 bis 8 Minuten.",
  },
  zweck: {
    arbeit: "Es ist der tägliche Weg zur Arbeit.",
    verschiebbar: "Es ist eine Fahrt, die sich verschieben oder auslassen liesse, etwa ein Einkauf oder ein Besuch.",
  },
  spitze: {
    ja: "Es ist Hauptverkehrszeit.",
    nein: "Es ist nicht Hauptverkehrszeit.",
  },
};
export const FAHRT_WAHL = {
  auto: "fährt jetzt mit dem Auto",
  bus: "nimmt den Bus",
  spaeter: "fährt mit dem Auto, aber zu einer ruhigeren Tageszeit",
  auslassen: "lässt die Fahrt heute aus",
};
export function fahrtOptionen(lage) {
  const o = ["auto", "bus"];
  if (lage.spitze === "ja") o.push("spaeter");
  if (lage.zweck === "verschiebbar") o.push("auslassen");
  return o;
}
export function fahrtLagen() {
  const aus = [];
  for (const zeit of Object.keys(FAHRT.zeit)) for (const bus of Object.keys(FAHRT.bus)) for (const zweck of Object.keys(FAHRT.zweck)) for (const spitze of Object.keys(FAHRT.spitze))
    aus.push({ zeit, bus, zweck, spitze });
  return aus;
}
export const fahrtSchluessel = (l) => `${l.zeit}|${l.bus}|${l.zweck}|${l.spitze}`;
export const FAHRT_PERSON = "eine Person aus der Region, die mit dem Auto durch dieses Quartier fahren könnte";

export function fahrtErsatz(lage) {
  const zeit = { frei: 0, etwas: 1, deutlich: 2.2, sehr: 3.6 }[lage.zeit];
  const w = { auto: Math.exp(-zeit / 1.4), bus: Math.exp(-(lage.bus === "oft" ? 1.6 : 2.4)) };
  if (lage.spitze === "ja") w.spaeter = Math.exp(-2 + zeit * 0.15);
  if (lage.zweck === "verschiebbar") w.auslassen = Math.exp(-1.8 + zeit * 0.25);
  return normiere(w);
}

// ---------- 3. Teilnahme am Offenen Abend im Atelier ----------
export const LAGEN = {
  knapp: "eine Person mit knappem Budget in diesem Monat",
  betreuung: "eine Person, die für den Abend die Kinderbetreuung organisieren muss",
  neu: "eine Person, die neu im Quartier ist und dort noch niemanden kennt",
  spaet: "eine Person, die bis 19 Uhr arbeitet",
  zeit: "eine Person, die heute Abend Zeit und Interesse hat",
};
export const TEILNAHME = {
  gebuehr: {
    hoch: "Die Teilnahme kostet eine Gebühr, die für viele spürbar ist.",
    tief: "Die Teilnahme kostet eine kleine Gebühr.",
    frei: "Die Teilnahme ist kostenlos.",
  },
  anmeldung: {
    konto: "Anmeldung nur online, mit Benutzerkonto, bis am Vortag.",
    formular: "Anmeldung mit einem kurzen, verständlichen Formular, auch am selben Tag.",
    vorort: "Keine Anmeldung, man kann einfach vorbeikommen.",
  },
  einladung: {
    keine: "Es gibt keine persönliche Einladung, nur einen Aushang.",
    atelier: "Das Atelier lädt persönlich ein.",
    bekannte: "Eine bekannte Person aus dem Quartier lädt ein und geht selbst hin.",
  },
  beginn: {
    "18": "Der Abend dauert von 18 bis 20 Uhr.",
    "1930": "Der Abend dauert von 19.30 bis 21.30 Uhr.",
  },
  rolle: {
    vorgegeben: "Wer mitspielt, bekommt eine Rolle, die die Leitung vorgibt, so wie sie sich jemanden aus dem Quartier vorstellt.",
    mitgestalten: "Wer mitspielt, gestaltet die eigene Rolle mit.",
  },
};
export const TEILNAHME_WAHL = {
  einbringen: "geht hin und bringt sich aktiv ein",
  rand: "geht hin, bleibt aber eher am Rand",
  vorbei: "schaut nur kurz vorbei",
  verhindert: "würde gern hingehen, aber die Bedingungen halten davon ab",
  anderes: "geht heute nicht hin, weil anderes ansteht oder das Interesse fehlt",
};
export function teilnahmeLagen() {
  const aus = [];
  for (const gebuehr of Object.keys(TEILNAHME.gebuehr)) for (const anmeldung of Object.keys(TEILNAHME.anmeldung)) for (const einladung of Object.keys(TEILNAHME.einladung))
    for (const beginn of Object.keys(TEILNAHME.beginn)) for (const rolle of Object.keys(TEILNAHME.rolle)) aus.push({ gebuehr, anmeldung, einladung, beginn, rolle });
  return aus;
}
export const teilnahmeSchluessel = (l) => `${l.gebuehr}|${l.anmeldung}|${l.einladung}|${l.beginn}|${l.rolle}`;

export function teilnahmeErsatz(b, lage) {
  let hindernis = 0;
  if (b.gebuehr === "hoch") hindernis += lage === "knapp" ? 3 : 1;
  if (b.gebuehr === "tief" && lage === "knapp") hindernis += 1;
  if (b.anmeldung === "konto") hindernis += lage === "neu" ? 1.6 : 0.8;
  if (b.beginn === "18" && lage === "spaet") hindernis += 4;
  if (b.beginn === "18" && lage === "betreuung") hindernis += 1;
  let zug = lage === "zeit" ? 1.2 : 0.3;
  if (b.einladung === "atelier") zug += 0.6;
  if (b.einladung === "bekannte") zug += lage === "neu" ? 1.4 : 0.9;
  const rolle = b.rolle === "vorgegeben" ? 0.8 : 0;
  return normiere({
    einbringen: Math.exp(zug - hindernis * 0.6 - rolle - 0.6),
    rand: Math.exp(zug - hindernis * 0.5 - 0.4),
    vorbei: Math.exp(zug * 0.5 - hindernis * 0.4 - 0.8),
    verhindert: Math.exp(hindernis * 0.7 - 1.2),
    anderes: Math.exp(0.2 - zug * 0.4),
  });
}

// ---------- gemeinsam ----------
export function normiere(w) {
  const s = Object.values(w).reduce((a, b) => a + b, 0) || 1;
  return Object.fromEntries(Object.entries(w).map(([k, v]) => [k, v / s]));
}
/** FNV-1a über die Fragen: ändern sich Wortlaut oder Auswahl, passt jev.js nicht mehr und die Seite nimmt die Ersatzregeln */
function fnv(t) { let h = 0x811c9dc5; for (let i = 0; i < t.length; i++) { h ^= t.charCodeAt(i); h = Math.imul(h, 0x01000193); } return (h >>> 0).toString(16).padStart(8, "0"); }
export const PRUEFSUMME = fnv(JSON.stringify([PERSONEN, QUERUNG, QUERUNG_WAHL, FAHRT, FAHRT_WAHL, FAHRT_PERSON, LAGEN, TEILNAHME, TEILNAHME_WAHL]));
