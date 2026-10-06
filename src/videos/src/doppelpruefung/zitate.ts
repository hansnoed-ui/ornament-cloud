// Wörtliche Stellen aus «Poststrukturalistische Theorie – Doppelprüfung» (Literaturstudie und Rasteranalyse, 6. Oktober 2026, 68 Seiten).
// Nicht verändern. Geprüft gegen den Text des PDFs (Seitenangaben des PDFs); Werte und Statusangaben ebenso.
export const Z = {
  leitfrage: ["Wie werden Identitäten wiedererkennbar,", "wie wirken ihre Verfahren weiter,", "und wer kann die daraus entstehenden Körperbeschreibungen korrigieren?"], // S. 1
  untertitel: "Zwölf Positionen im Prüfraster Nebeneinander / Nacheinander und im Verteilapparat des Körpers", // S. 1
  leitfrageKorrektur: "Wer kann korrigieren?", // Vier Leitfragen, z. B. S. 16
  auswahl: "Für die Streugrafik wird pro Adresse genau eine Operation ausgewählt.", // S. 4
  register: "Alle zwölf NN-Einträge haben den Evidenzstatus Interpretation.", // S. 4
  fragenZuerst: "Alle Fragen werden vor den Zahlen beantwortet.", // S. 5
  zusatz: ["Veränderung", "Unterscheidbare Vorgeschichte", "Folgewirksamkeit"], // Zusatzprüfung, z. B. S. 13
  derrida: "Eine Unterschrift ist singulär und muss zugleich reproduzierbar sein.", // S. 17
  deleuze: "Gleichbleibende Fälle können eine neue Erwartung bilden.", // S. 21
  foucault: "Die Person wird wiedererkennbarer Fall", // S. 13 (Relevante Folge, gekürzt mit […])
  baudrillard: "Modelle und Zeichen erzeugen die Kriterien dessen, was als real wiedererkannt wird", // S. 10/41 (Operation)
  keineNote: "Die Zahlen enthalten keine Qualitätsnote.", // S. 10
  pestErtrag: "Der Verteilapparat trennt Sichtbarkeit, erzwungene Auskunft und eine wirksame Möglichkeit, den eigenen Fall zu korrigieren.", // S. 16
  sichtbarGehoer: "Die erste wichtige Ergänzung ist die Trennung von Sichtbarkeit und Gehör.", // S. 61
  schluss: ["Was wird als dasselbe wiedererkannt?", "Was verändert die Wiederholung?", "Wer kann den daraus entstehenden Fall anfechten?"], // S. 63
};

// Operationen (Kurzname im Etikett, aus den Profilen) und Koordinaten der Streugrafik, S. 10 und S. 61
export const OPERATIONEN = {
  derrida: { titel: "Iterabilität", name: "Jacques Derrida", X: 5, Y: 4 },
  deleuze: { titel: "Passive Synthese der Gewohnheit", name: "Gilles Deleuze", X: 4, Y: 5 },
  foucault: { titel: "Disziplinäre Individualisierung", name: "Michel Foucault", X: 5, Y: 5 },
  baudrillard: { titel: "Simulation", name: "Jean Baudrillard", X: 5, Y: 3 },
};

export const PUNKTE: { X: number; Y: number; namen: string[] }[] = [
  { X: 5, Y: 5, namen: ["Foucault", "Butler", "Lyotard"] },
  { X: 4, Y: 5, namen: ["Deleuze"] },
  { X: 5, Y: 4, namen: ["Derrida", "Althusser"] },
  { X: 4, Y: 4, namen: ["Guattari", "Kristeva", "Lacan"] },
  { X: 5, Y: 3, namen: ["Baudrillard"] },
  { X: 4, Y: 3, namen: ["Barthes"] },
  { X: 3, Y: 3, namen: ["Cixous"] },
];

export const NAMEN = ["Michel Foucault", "Jacques Derrida", "Gilles Deleuze", "Félix Guattari", "Roland Barthes", "Judith Butler",
  "Julia Kristeva", "Jean Baudrillard", "Jacques Lacan", "Jean-François Lyotard", "Hélène Cixous", "Louis Althusser"]; // Inhalt, S. 3

// Foucault · Körperapparat, sieben Schwellen (S. 15): [Schwelle, Selbstbeschreibung, Fremderfassung]
export const SCHWELLEN: [string, string, string][] = [
  ["Auffällig", "umgeleitet", "passiert"],
  ["Artikulierbar", "umgeleitet", "passiert"],
  ["Zugänglich", "umgeleitet", "passiert"],
  ["Lesbar", "umgeleitet", "passiert"],
  ["Glaubwürdig", "umgeleitet", "passiert"],
  ["Speicherbar", "offen", "passiert"],
  ["Entscheidungsfähig", "offen", "passiert"],
];
