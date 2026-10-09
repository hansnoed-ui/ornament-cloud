// «Die Paradoxie der Stadt» – die beiden Raster als freiwillige Beobachtungshilfen («Genauer hinsehen»).
// Liest nur den Zustand. Keine Punkte über Menschen, keine Gesamtnote; fehlende Grundlage heisst «offen».
// Grundlagen: Christian Strickler, «Nebeneinander und Nacheinander» (Anwendungsprompt 3.2.0) und «Der Verteilapparat des Körpers» (2.1.0).
import { ORTE, uhr, fortbestehend, KATEGORIEN, dauerText, wirklichkeit } from "./modell.js?v=8";
import { LIVE_ZIELE } from "./fragen.js?v=8";

// ---------- Nebeneinander, Nacheinander ----------
/** Antworten auf die vier Fragen der Hauptansicht, aus dem laufenden Zustand. Jede Antwort trennt Veränderung, Vorgeschichte und fortwirkende Folge. */
export function nebeneinanderNacheinander(z) {
  const tage = z.messung.tage, heute = z.messung.heute;
  const letzteM = [...z.protokoll].reverse().find((e) => e.art === "massnahme" || e.art === "ruecknahme");
  const vorM = letzteM ? tage.filter((t) => t.tag < letzteM.tag).at(-1) : null;
  const nachM = letzteM ? tage.filter((t) => t.tag >= letzteM.tag) : [];
  const gew = z.figuren.reduce((n, f) => n + Object.values(f.gewohnheit).filter((g) => g.staerke >= 0.4).length, 0);
  const bek = z.figuren.reduce((n, f) => n + Object.values(f.bekannt).filter((x) => x >= 2).length, 0) / 2;
  const w = wirklichkeit(z.m);
  const irrtum = z.figuren.filter((f) => f.glaubt && Object.entries(f.glaubt).some(([k, v]) => v !== w[k]));
  const wiedererkennbar = [
    "Die Orte bleiben, wo sie sind: Querung bei der Haltestelle, Ladeneingang, Parkeingang, Nordstrasse. Darum kann man Tage miteinander vergleichen.",
    `Jeden Abend um 22 Uhr wird Bilanz gezogen: bisher ${tage.length} ${tage.length === 1 ? "Tag" : "Tage"}, dazu der laufende.`,
    "Die Stadt ist nicht zufällig: Mit denselben Einstellungen läuft derselbe Tag gleich ab. Ein Vergleich «vorher – nachher» ist deshalb fair.",
  ];
  const verlauf = [];
  if (letzteM && vorM) {
    const jetzt = nachM.at(-1) ?? null;
    if (jetzt) {
      verlauf.push(`Autos auf der Hauptstrasse: ${vorM.autos.H} am Tag vor «${letzteM.text.replace(/^Zurückgenommen: /, "")}», ${jetzt.autos.H} am Tag ${jetzt.tag}.`);
      verlauf.push(`Durch die Nordstrasse: ${vorM.autos.N} → ${jetzt.autos.N}. Mit dem Bus statt mit dem Auto: ${vorM.pendel.bus} → ${jetzt.pendel.bus}.`);
      verlauf.push(`Wege der Figuren – angekommen: ${vorM.wege.erreicht} → ${jetzt.wege.erreicht}, anderswohin gegangen: ${vorM.wege.ersetzt} → ${jetzt.wege.ersetzt}, ausgelassen: ${vorM.wege.aufgegeben} → ${jetzt.wege.aufgegeben}.`);
    } else verlauf.push("Der erste Tag nach dem Eingriff läuft noch; die Tagesbilanz kommt um 22 Uhr.");
  } else verlauf.push("Du hast noch nichts verändert (oder es fehlt ein Tag davor zum Vergleich). Auch ohne Eingriff geschieht etwas – siehe Protokoll.");
  const fortwirkend = [
    `${gew} feste Gewohnheiten: Figuren nehmen einen Weg, ohne noch darüber nachzudenken.`,
    `Den Schleichweg durch die Nordstrasse kennen ${Math.round(z.pendel.wissen.w * 100)} % der Autofahrenden aus Osten und ${Math.round(z.pendel.wissen.o * 100)} % aus Westen. Wer ihn kennt, vergisst ihn nicht.`,
    `Wie lange die Fahrt am Morgen dauert, glauben die Autofahrenden aus Erfahrung: ${dauerText(z.pendel.wahr.Hw[1])}. Dieser Eindruck hinkt der Wirklichkeit hinterher.`,
    `${bek} Bekanntschaften: Figuren, die schon zweimal miteinander geredet haben.`,
    irrtum.length ? `${irrtum.length} ${irrtum.length === 1 ? "Figur glaubt" : "Figuren glauben"} etwas über die Strasse, das nicht mehr stimmt.` : "Niemand glaubt etwas über die Strasse, das nicht stimmt.",
  ];
  const ruecknahmen = z.rueckgenommen.map((r) => ({ ...rueckkehrprobe(z, r) }));
  return { wiedererkennbar, verlauf, fortwirkend, ruecknahmen, heuteTag: z.tag, letzte: letzteM?.text ?? null, heuteWege: heute.wege.length };
}

/** Rückkehrprobe nach dem Raster (Abschnitt 3): Was ist nach dem Zurücknehmen wieder wie vorher, was nicht – und was bräuchte es dafür? */
export function rueckkehrprobe(z, r) {
  const fort = fortbestehend(z, r);
  return {
    gepruefte_rueckkehr: `Du hast «${r.text}» am Tag ${r.tag} um ${uhr(r.t)} zurückgenommen – mitten im laufenden Leben, ohne neu zu starten.`,
    zurueckgesetzte_merkmale: "Die Strasse ist wieder wie am Anfang: Spuren, Übergänge, Ampel und Tempo.",
    aufgehobene_folgen: "Wer das gesehen hat, nimmt wieder den alten Weg. Warten und Umwege sind sofort wieder wie vorher.",
    fortbestehende_folgen: [
      fort.figuren.length ? `${fort.figuren.length} ${fort.figuren.length === 1 ? "Figur ist" : "Figuren sind"} seither aus Gewohnheit oder Irrtum anderswohin gegangen oder zu Hause geblieben (${fort.wege} ${fort.wege === 1 ? "Weg" : "Wege"}).` : "Seither ist niemand aus Gewohnheit oder Irrtum anders gegangen.",
      fort.irrtum.length ? `${fort.irrtum.length} ${fort.irrtum.length === 1 ? "Figur glaubt" : "Figuren glauben"}, die Strasse sei noch verändert – sie waren seither nicht dort.` : "Alle Figuren haben inzwischen gesehen, dass es wieder wie früher ist.",
      `${fort.gewohnt.length} Figuren haben sich angewöhnt, anders über die Strasse zu kommen als ebenerdig.`,
      "Wer den Schleichweg kennt, kennt ihn weiter; das Gefühl für die Fahrzeit ändert sich erst mit neuen Fahrten.",
    ],
    weitergehende_aufhebung: "Ganz weg wäre das alles nur mit «Lauf zurücksetzen» – dann vergessen alle alles. Eine echte Stadt hat diesen Knopf nicht.",
    beleggrenze: "Das gilt für dieses Modell, nicht für echte Menschen. Dass sich die Figuren erinnern, hat das Modell so festgelegt; es zeigt, was daraus folgt.",
    figuren: fort.figuren,
  };
}

// ---------- Der Verteilapparat des Körpers ----------
const cap = (t) => t[0].toUpperCase() + t.slice(1);
export const SCHWELLEN = ["auffällig", "artikulierbar", "zugänglich", "lesbar", "glaubwürdig", "speicherbar", "entscheidungsfähig"];
/** Der Vorgang, an dem die Schwellen geprüft werden: der letzte Weg, der nicht wie geplant endete, sonst der letzte Weg */
export function vorgangVon(f) {
  const w = [...f.wege].reverse();
  return w.find((x) => x.status !== "erreicht" && x.ziel !== "haltN") ?? w.find((x) => x.ziel !== "haltN") ?? null;
}
/** Fallblatt (Modellfall) für eine Figur und ihren Vorgang: Erleben, Selbstbeschreibung, Fremderfassung, Beschreibung, Folgen; sieben Schwellen je Anschlussweg */
export function verteilapparat(z, f, sicht) {
  const w = vorgangVon(f);
  if (!w) return { vorgang: null };
  const n = f.name, ziel = ORTE[w.ziel]?.name ?? w.ziel;
  const [zielDer, zielZum] = LIVE_ZIELE[w.ziel] ?? [`das Ziel «${ziel}»`, `zum Ziel «${ziel}»`];
  const amTag = w.tag ? `am Tag ${w.tag}` : "am Vortag";
  const erlebt = f.erlebt.filter((e) => e.tag === w.tag && Math.abs(e.t - w.t) < 3600);
  const auskunft = f.befragt.filter((b) => b.tag >= w.tag).at(-1) ?? null;
  const verzicht = w.status !== "erreicht";
  const ladenZaehlt = w.ziel === "laden";
  const markiert = Object.keys(z.merker).some((k) => k === `laden-weniger-${w.tag}`);
  const s = (status, befund) => ({ status, befund });
  // je Schritt: was die Person selbst sagt (selbst) und was über sie gezählt wird (fremd)
  const schwellen = {
    "auffällig": {
      selbst: erlebt.some((e) => ["verzicht", "warten", "ueberraschung", "ersatz"].includes(e.art)) ? s("passiert", `${n} hat den Weg als schwierig erlebt: Warten, Umweg oder Verzicht.`) : s("nicht_anwendbar", `${n} hat dabei nichts Besonderes erlebt.`),
      fremd: !ladenZaehlt ? s("nicht_anwendbar", `${cap(zielDer)} hat keine Zählung; gezählt wird nur am Laden.`)
        : !verzicht ? s("passiert", "Die Kamera am Laden zählt einen Eintritt – mehr nicht: kein Umweg, kein Warten.")
        : markiert ? s("umgeleitet", "Es fällt nur als «heute weniger Leute im Laden» auf – ohne Namen, ohne Grund.") : s("blockiert", "Wer nicht kommt, wird nicht gezählt. Es fällt niemandem auf."),
    },
    "artikulierbar": {
      selbst: auskunft ? (auskunft.kategorie === "anderes" ? s("umgeleitet", "In der Befragung gab es kein passendes Stichwort; die Antwort landet unter «anderes».") : s("passiert", `In der Befragung konnte ${n} «${auskunft.kategorie}» ankreuzen.`)) : s("offen", `${n} wurde nicht gefragt.`),
      fremd: s("nicht_anwendbar", "Die Kamera braucht keine Worte, sie zählt nur."),
    },
    "zugänglich": {
      selbst: auskunft ? s("passiert", `${n} wurde ${auskunft.ort} gefragt.`) : verzicht && ladenZaehlt ? s("blockiert", "Gefragt wird am Laden – wer nicht hinkommt, wird nicht gefragt.") : s("offen", `${n} wurde nicht gefragt.`),
      fremd: !ladenZaehlt ? s("nicht_anwendbar", "Hier zählt niemand.") : verzicht ? s("blockiert", `Die Kamera steht dort, wo ${n} nicht hingekommen ist.`) : s("passiert", `${n} ging an der Kamera vorbei.`),
    },
    "lesbar": {
      selbst: auskunft ? s("umgeleitet", `Die Antwort wird auf ein Stichwort gekürzt. Wie lang der Umweg war oder wie müde ${n} war, geht verloren.`) : s("nicht_anwendbar", "Keine Antwort, also nichts zu kürzen."),
      fremd: !ladenZaehlt ? s("nicht_anwendbar", "Hier zählt niemand.") : s("umgeleitet", "Aus dem Weg wird eine Zahl pro Stunde."),
    },
    "glaubwürdig": {
      selbst: s("offen", "Ob die Antwort geglaubt wird, zeigt das Modell nicht."),
      fremd: s("offen", "Ob die Zählung stimmt, prüft das Modell nicht."),
    },
    "speicherbar": {
      selbst: auskunft ? s("passiert", `Die Antwort steht in den Befragungsdaten (${auskunft.tag ? `Tag ${auskunft.tag}` : "Vortag"}).`) : s("nicht_anwendbar", "Nichts gesagt, also nichts festgehalten."),
      fremd: !ladenZaehlt ? s("nicht_anwendbar", "Hier zählt niemand.") : verzicht ? s("blockiert", "Festgehalten wird nur, was gezählt wurde – dieser Weg nicht.") : s("passiert", "Steht in der Tageszählung."),
    },
    "entscheidungsfähig": {
      selbst: s("offen", "Ob daraus eine Massnahme wird, entscheidest du. Die Stadt ändert sich nicht von selbst."),
      fremd: s("offen", "Auch eine Zahl allein baut keine Strasse um."),
    },
  };
  const beschreibung = {
    fluss: "Gar nicht: Diese Sichtweise zählt Autos, keine Fusswege.",
    erreichbarkeit: verzicht ? "Als «nicht angekommen». Eine echte Zählung würde nur sehen, dass jemand fehlt – nicht wer und nicht warum." : "Als «angekommen».",
    aufenthalt: `Nur wenn ${n} irgendwo verweilt; der Weg selbst zählt hier nicht.`,
    belastung: `Umweg ${w.umweg} m, Warten ${Math.round(w.warten)} s – sichtbar nur, weil das Modell alles über seine Figuren weiss.`,
  }[sicht];
  const ausgang = { erreicht: "ist angekommen", ersetzt: "ist stattdessen zu einem ähnlichen Ziel auf der eigenen Strassenseite gegangen", aufgegeben: "hat den Weg ausgelassen" }[w.status] ?? w.status;
  return {
    vorgang: `${n} wollte ${amTag} um ${uhr(w.t)} ${zielZum} und ${ausgang}${w.grund && w.status === "aufgegeben" ? ` (Grund im Modell: ${w.grund})` : ""}${w.gewohnheit ? ", aus Gewohnheit" : ""}.`,
    erleben: erlebt.length ? erlebt.map((e) => `${uhr(e.t)} ${e.text}`) : ["Nichts Besonderes."],
    selbstbeschreibung: auskunft ? `Ja, in der Kurzbefragung ${auskunft.ort}: «${auskunft.kategorie}»${auskunft.verzichtet ? ", mit dem Hinweis auf einen ausgelassenen Weg" : ""}. (Erfundene Antwort einer Modellfigur.)` : `Nein – ${n} wurde nicht gefragt. Das ist kein Fehler: Niemand muss Auskunft geben.`,
    fremderfassung: ladenZaehlt ? (verzicht ? "Niemand: Die Kamera am Laden zählt nur, wer hineingeht." : "Die Kamera am Laden hat einen Eintritt gezählt.") : "Niemand: An diesem Ziel gibt es keine Zählung.",
    beschreibung,
    folgen: verzicht ? (w.status === "ersetzt" ? `${n} war woanders; ${zielDer} hatte eine Person weniger.` : "Der Weg fiel aus. Ein Einkauf wird verschoben, ein Besuch fällt weg.") : "Nichts über den Weg hinaus.",
    widerspruch: `Widersprechen kann ${n} im Modell nicht: Es gibt keinen Ort, an dem man eine Planung anfechten könnte. Die Befragung hört zu, entscheidet aber nichts.`,
    schwellen,
  };
}

// ---------- Kurzbefragung als Verteilung (nur Antwortende) ----------
export function befragungAuswertung(z, ort) {
  const alle = [...z.messung.tage.flatMap((t) => t.befragung[ort]), ...z.messung.heute.befragung[ort]];
  const n = Object.fromEntries(KATEGORIEN.map((k) => [k, 0]));
  for (const a of alle) n[a.kategorie]++;
  return { antworten: alle.length, verzichtet: alle.filter((a) => a.verzichtet).length, kategorien: n };
}
