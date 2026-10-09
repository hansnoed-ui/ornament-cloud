// «Die Paradoxie der Stadt» – die beiden Raster als freiwillige Beobachtungshilfen («Genauer hinsehen»).
// Liest nur den Zustand. Keine Punkte über Menschen, keine Gesamtnote; fehlende Grundlage heisst «offen».
// Grundlagen: Christian Strickler, «Nebeneinander und Nacheinander» (Anwendungsprompt 3.2.0) und «Der Verteilapparat des Körpers» (2.1.0).
import { ORTE, uhr, fortbestehend, KATEGORIEN, dauerText, wirklichkeit } from "./modell.js?v=2";

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
    "Feste Orte mit festen Koordinaten: Querung bei der Haltestelle, Eingang des Ladens, Parkeingang, Nordstrasse.",
    `Tagesbilanzen zum Vergleichen: ${tage.length} abgeschlossene ${tage.length === 1 ? "Tag" : "Tage"}, dazu der laufende.`,
    "Derselbe Startwert ergibt denselben Lauf; der Vergleich «vorher» startet aus dem gemerkten Zustand.",
  ];
  const verlauf = [];
  if (letzteM && vorM) {
    const jetzt = nachM.at(-1) ?? null;
    if (jetzt) {
      verlauf.push(`Autos auf der Hauptstrasse: ${vorM.autos.H} am Tag vor «${letzteM.text.replace(/^Zurückgenommen: /, "")}», ${jetzt.autos.H} am Tag ${jetzt.tag}.`);
      verlauf.push(`Durch die Nordstrasse: ${vorM.autos.N} → ${jetzt.autos.N}. Mit dem Bus statt mit dem Auto: ${vorM.pendel.bus} → ${jetzt.pendel.bus}.`);
      verlauf.push(`Wege der Figuren erreicht, ersetzt, aufgegeben: ${vorM.wege.erreicht}/${vorM.wege.ersetzt}/${vorM.wege.aufgegeben} → ${jetzt.wege.erreicht}/${jetzt.wege.ersetzt}/${jetzt.wege.aufgegeben}.`);
    } else verlauf.push("Der erste Tag nach dem Eingriff läuft noch; die Tagesbilanz kommt um 22 Uhr.");
  } else verlauf.push("Noch kein Eingriff mit Tagesbilanz davor. Ohne Eingriff verändert sich trotzdem etwas: siehe Protokoll.");
  const fortwirkend = [
    `${gew} feste Gewohnheiten (eine Wahl, die eine Figur ohne neues Abwägen wiederholt).`,
    `Wissen um den Schleichweg durch die Nordstrasse: ${Math.round(z.pendel.wissen.w * 100)} % der Fahrenden aus Osten, ${Math.round(z.pendel.wissen.o * 100)} % aus Westen.`,
    `Wahrgenommene Fahrzeit in der Morgenspitze: ${dauerText(z.pendel.wahr.Hw[1])} (aus Erfahrung, mit Verzögerung).`,
    `${bek} Bekanntschaften (mindestens zwei Gespräche).`,
    irrtum.length ? `${irrtum.length} ${irrtum.length === 1 ? "Figur glaubt" : "Figuren glauben"} etwas über die Strasse, das nicht mehr stimmt.` : "Niemand glaubt etwas über die Strasse, das nicht stimmt.",
  ];
  const ruecknahmen = z.rueckgenommen.map((r) => ({ ...rueckkehrprobe(z, r) }));
  return { wiedererkennbar, verlauf, fortwirkend, ruecknahmen, heuteTag: z.tag, letzte: letzteM?.text ?? null, heuteWege: heute.wege.length };
}

/** Rückkehrprobe nach dem Raster (Abschnitt 3): geprüfte Rücknahme, zurückgesetzte Merkmale, aufgehobene und fortbestehende Folgen, weitergehende Aufhebung */
export function rueckkehrprobe(z, r) {
  const fort = fortbestehend(z, r);
  return {
    gepruefte_rueckkehr: `Rücknahme von «${r.text}» am Tag ${r.tag} um ${uhr(r.t)}, ohne den Lauf zurückzusetzen.`,
    zurueckgesetzte_merkmale: "Strasse, Querungen, Ampelzeiten und Tempo sind wieder wie am Anfang (Massnahmen-Ausgangswert).",
    aufgehobene_folgen: "Wer die Änderung gesehen hat, plant wieder mit dem alten Weg; Wartezeiten und Wegelängen gelten sofort wie vorher.",
    fortbestehende_folgen: [
      fort.figuren.length ? `${fort.figuren.length} ${fort.figuren.length === 1 ? "Figur nahm" : "Figuren nahmen"} seitdem aus Gewohnheit oder Irrtum das Ersatzziel oder liessen einen Weg aus (${fort.wege} ${fort.wege === 1 ? "Weg" : "Wege"}).` : "Seitdem kein Weg, der aus Gewohnheit oder Irrtum anders verlief.",
      fort.irrtum.length ? `${fort.irrtum.length} ${fort.irrtum.length === 1 ? "Figur glaubt" : "Figuren glauben"} die Strasse noch im veränderten Zustand.` : "Alle Figuren haben die Rücknahme inzwischen gesehen.",
      `${fort.gewohnt.length} Figuren mit fester Gewohnheit, die nicht die ebenerdige Querung ist.`,
      `Wissen um die Nordstrasse und wahrgenommene Fahrzeiten bleiben, bis neue Erfahrung sie ändert.`,
    ],
    weitergehende_aufhebung: "Nur «Lauf zurücksetzen» löscht im Modell alle Erinnerungen. In einer Stadt gibt es diesen Knopf nicht.",
    beleggrenze: "Befund über den Programmlauf dieses Modells, nicht über reale Menschen. Dass Erinnerungen fortbestehen, ist eine Annahme des Modells, die es hier zeigt.",
    figuren: fort.figuren,
  };
}

// ---------- Der Verteilapparat des Körpers ----------
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
  const ziel = ORTE[w.ziel]?.name ?? w.ziel;
  const erlebt = f.erlebt.filter((e) => e.tag === w.tag && Math.abs(e.t - w.t) < 3600);
  const auskunft = f.befragt.filter((b) => b.tag >= w.tag).at(-1) ?? null;
  const verzicht = w.status !== "erreicht";
  const ladenZaehlt = w.ziel === "laden";
  const markiert = Object.keys(z.merker).some((k) => k === `laden-weniger-${w.tag}`);
  const s = (status, befund) => ({ status, befund });
  const schwellen = {
    "auffällig": {
      selbst: erlebt.some((e) => ["verzicht", "warten", "ueberraschung", "ersatz"].includes(e.art)) ? s("passiert", "Die Figur erlebt den Weg als Abweichung (im Modell gemerkt).") : s("offen", "Im Modell ist nichts Auffälliges gemerkt."),
      fremd: !verzicht ? s("passiert", ladenZaehlt ? "Als Eintritt am Laden gezählt – ohne Weg, Umweg oder Wartezeit." : "Keine Zählstelle an diesem Ziel.") : ladenZaehlt ? (markiert ? s("umgeleitet", "Erscheint nur als «weniger Eintritte» in einer Stunde, ohne Person und ohne Grund.") : s("blockiert", "Wer nicht ankommt, wird am Laden nicht gezählt; die Abweichung fällt nicht auf.")) : s("blockiert", "Keine Zählstelle erfasst einen Weg, der nicht stattfindet."),
    },
    "artikulierbar": {
      selbst: auskunft ? (auskunft.kategorie === "anderes" ? s("umgeleitet", "Die Antwort passt in keine der festen Kategorien und landet unter «anderes».") : s("passiert", `Die Befragung hat ein Wort dafür: «${auskunft.kategorie}».`)) : s("offen", "Nicht befragt; ob die Figur es sagen könnte, bleibt offen."),
      fremd: s("nicht_anwendbar", "Eine Zählung braucht kein Vokabular der Person; sie zählt Bewegungen."),
    },
    "zugänglich": {
      selbst: auskunft ? s("passiert", `Befragt ${auskunft.ort}.`) : verzicht && ladenZaehlt ? s("blockiert", "Die Befragung am Laden erreicht nur, wer zum Laden kommt.") : s("offen", "Nicht befragt (Stichprobe an der Haustür oder nicht am Laden)."),
      fremd: verzicht ? s("blockiert", "Die Kamera steht dort, wo die Figur nicht hinkommt.") : s("passiert", "Die Figur ging an einer Zählstelle vorbei oder kam an."),
    },
    "lesbar": {
      selbst: auskunft ? s("umgeleitet", "Die Auskunft wird auf eine von sieben festen Kategorien gekürzt; Umweg in Metern, Steigung, Müdigkeit gehen verloren.") : s("offen", "Keine Auskunft, nichts umzuformatieren."),
      fremd: s("umgeleitet", "Aus dem Weg wird eine Zahl je Stunde."),
    },
    "glaubwürdig": {
      selbst: s("offen", "Ob eine Auskunft geglaubt wird, bildet das Modell nicht ab."),
      fremd: s("offen", "Das Modell prüft die Zählung nicht gegen andere Quellen."),
    },
    "speicherbar": {
      selbst: auskunft ? s("passiert", `Gespeichert in den Befragungsdaten von Tag ${auskunft.tag}.`) : s("offen", "Nichts gespeichert, weil nichts gesagt wurde."),
      fremd: verzicht ? s("blockiert", "Gespeichert wird nur, was gezählt wurde.") : s("passiert", "In der Tageszählung gespeichert."),
    },
    "entscheidungsfähig": {
      selbst: s("offen", "Ob daraus eine Massnahme wird, entscheidest du. Das Modell setzt nichts von selbst um."),
      fremd: s("offen", "Ebenso: Zahlen allein ändern im Modell keine Strasse."),
    },
  };
  const beschreibung = {
    fluss: "Kommt nicht vor: Der Verkehrsfluss zählt Autos, nicht Fusswege.",
    erreichbarkeit: verzicht ? `Als «${w.status}» in der Modellstatistik; eine reale Zählung sähe nur einen fehlenden Eintritt.` : "Als «erreicht» in der Modellstatistik.",
    aufenthalt: "Nur wenn die Figur an einem Ort verweilt; der Weg selbst zählt nicht.",
    belastung: `Umweg ${w.umweg} m, Warten ${Math.round(w.warten)} s – nur im Modellblick sichtbar.`,
  }[sicht];
  return {
    vorgang: `Weg zum ${ziel}, Tag ${w.tag}, ${uhr(w.t)}: ${w.status}${w.grund ? ` (${w.grund})` : ""}${w.gewohnheit ? ", aus Gewohnheit" : ""}.`,
    erleben: erlebt.length ? erlebt.map((e) => `${uhr(e.t)} ${e.text}`) : ["Im Modell nichts Besonderes gemerkt."],
    selbstbeschreibung: auskunft ? `Hat ${auskunft.ort} angegeben: «${auskunft.kategorie}»${auskunft.verzichtet ? " (mit Verzicht)" : ""}. Modellierte Auskunft, keine Aussage eines realen Menschen.` : "Hat sich nicht geäussert (nicht befragt). Unbeobachtet zu bleiben ist hier kein Nachteil an sich.",
    fremderfassung: ladenZaehlt ? (verzicht ? "Die Zählung am Laden hat diesen Weg nicht erfasst." : "Als Eintritt gezählt.") : "Keine Zählstelle an diesem Ziel.",
    beschreibung,
    folgen: verzicht ? (w.status === "ersetzt" ? `Die Figur war am Ersatzziel; der ${ziel} hatte einen Eintritt weniger.` : "Der Weg fiel aus; ein Einkauf wird verschoben, andere Wege entfallen.") : "Keine Folge über den Weg hinaus.",
    widerspruch: "Offen: Das Modell kennt keinen Weg, eine Planung anzufechten. Die Kurzbefragung ist der einzige Kanal, und sie entscheidet nichts.",
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
