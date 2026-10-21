// ORMA – Deutsch und Englisch (20. Oktober 2026, Wunsch: «auch alle downloadbaren Apps re-designen, auch doppelsprachig deutsch/englisch»).
// Dasselbe Muster wie in OMNA COLOR und ORNA: ein Skript vor den Modulen, ohne Modul. Die Oberfläche entsteht in js/app.js; dort steht jeder Text
// auf Deutsch in T("…"), und EN übersetzt ihn Wort für Wort (Schlüssel = der deutsche Text). Einige Sätze mit Werten sind Funktionen (Schlüssel
// ohne Leerzeichen: wiedersehen, antwortVom, …). Die Wahl: localStorage «ornament.sprache» (gilt für alle Apps der Website), sonst die Sprache
// des Geräts. Beim Wechsel ein Ereignis «sprache» auf document; app.js zeichnet die Ansicht neu, data-t im Kopf der Seite wird hier gesetzt.
// Einstieg, Aufträge, Text und Frage der Konstellationen auf Englisch liegen in js/data.js (tools/build-orma.ts aus pilot.en.json).
(() => {
  const DE = {
    _titel: "ORMA – Nebeneinander, Nacheinander",
    wiedersehen: (d) => `Am ${d} hat dich das Rad schon einmal zu dieser Konstellation gebracht. Jetzt antwortest du noch einmal: mit demselben Auftrag, als spätere Version deiner selbst, ohne deine erste Antwort zu sehen.`,
    antwortVom: (d) => `Deine Antwort vom ${d} und deine Antwort von heute.`,
    schleifeLoeschen: (t) => `Die offene Schleife zu ${t} wird gelöscht, samt deiner ersten Antwort.`,
    alleLoeschen: (n, s) => `Alle ${n} Einträge im Gedankenbuch${s ? ` und ${s} offene Schleife(n)` : ""} werden auf diesem Gerät gelöscht. Das lässt sich nicht rückgängig machen.`,
    eintragFremd: (id) => `Dieser Eintrag gehört zu einer Konstellation (${id}), die in dieser Fassung von ORMA nicht enthalten ist.`,
  };
  const EN = {
    _titel: "ORMA – Nebeneinander, Nacheinander",
    "kopf.sprache": "Language", "kopf.ueber": "About the app", "kopf.start": "To the start view",
    wiedersehen: (d) => `On ${d} the wheel brought you to this constellation once before. Now you answer once more: with the same task, as a later version of yourself, without seeing your first answer.`,
    antwortVom: (d) => `Your answer from ${d} and your answer from today.`,
    schleifeLoeschen: (t) => `The open loop for ${t} will be deleted, together with your first answer.`,
    alleLoeschen: (n, s) => `All ${n} entries in the book of thoughts${s ? ` and ${s} open loop(s)` : ""} will be deleted on this device. This cannot be undone.`,
    eintragFremd: (id) => `This entry belongs to a constellation (${id}) that is not part of this version of ORMA.`,
    // Start
    "Zehn Minuten zu zweit. Zwei Sichtweisen. Ein neuer Gedanke.": "Ten minutes for two. Two points of view. One new thought.",
    "Zu zweit beginnen": "Begin as a pair", "Allein: Re-Entry": "Alone: re-entry", offen: "open", "Runde fortsetzen": "Resume the round", "Unsere Gedanken": "Our thoughts",
    "Es gibt eine unterbrochene Runde. Wenn du neu beginnst, wird sie verworfen.": "There is an interrupted round. If you start anew, it will be discarded.",
    "Neu beginnen": "Start anew", "Die unterbrochene Runde gehört zu einer älteren Fassung von ORMA und kann nicht fortgesetzt werden.": "The interrupted round belongs to an older version of ORMA and cannot be resumed.",
    "Unterbrochene Runde verwerfen": "Discard the interrupted round", "Die unterbrochene Runde wird gelöscht.": "The interrupted round will be deleted.", Verwerfen: "Discard",
    "Klappt die Installation nicht? Im Browsermenü (⋮) «Zum Startbildschirm hinzufügen» und dann «Verknüpfung erstellen» wählen.": "Installation not working? In the browser menu (⋮) choose «Add to Home screen» and then «Create shortcut».",
    Inhalt: "content", "kostenlos, ohne Anmeldung, ohne Werbung. Alles bleibt auf diesem Gerät.": "free, no account, no advertising. Everything stays on this device.",
    "So geht eine Runde": "How a round works",
    "Das Rad bringt zwei Menschen zusammen: eine Künstlerin oder einen Künstler und eine Theoretikerin oder einen Theoretiker.": "The wheel brings two people together: an artist and a theorist.",
    "Ihr lest gemeinsam einen kurzen Einstieg und die Frage dazu. Theoriekenntnisse braucht ihr nicht.": "Together you read a short introduction and the question that goes with it. No knowledge of theory needed.",
    "Ihr wählt zusammen einen Auftrag: ein Beispiel, einen Einwand oder etwas zum Machen.": "Together you choose a task: an example, an objection or something to make.",
    "Zuerst antwortet die eine Person, dann gibt sie das Gerät weiter. Die zweite sieht die erste Antwort nicht. Mündlich antworten geht auch.": "First one person answers, then hands over the device. The second does not see the first answer. Answering out loud works too.",
    "Dann deckt ihr beide Antworten auf und denkt gemeinsam weiter. Einig werden müsst ihr euch nicht.": "Then you reveal both answers and think further together. You do not have to agree.",
    "Zum Schluss könnt ihr den Gedanken im Gedankenbuch behalten oder als Bild exportieren.": "At the end you can keep the thought in the book of thoughts or export it as an image.",
    "Allein: Re-Entry. Du spielst beide Rollen, zu verschiedenen Zeiten. Beim ersten Mal antwortest du und lässt die Schleife offen. Bringt das Rad dieselbe Konstellation irgendwann wieder, antwortest du noch einmal, als spätere Version deiner selbst, ohne deine erste Antwort zu sehen. Dann legst du beide nebeneinander und hältst fest, was sich verändert hat: den dritten Gedanken.": "Alone: re-entry. You play both roles, at different times. The first time you answer and leave the loop open. If the wheel brings the same constellation again some day, you answer once more, as a later version of yourself, without seeing your first answer. Then you lay both side by side and note what has changed: the third thought.",
    "Etwa zehn Minuten, aber ohne Uhr. Es gibt keine richtigen oder falschen Antworten, keine Punkte und keine Wertung. Antworten dürfen vorläufig bleiben und der Paarung widersprechen.": "About ten minutes, but without a clock. There are no right or wrong answers, no points and no scoring. Answers may stay provisional and contradict the pairing.",
    "Installieren: im Browsermenü «App installieren» oder «Zum Startbildschirm hinzufügen» wählen, auf dem iPhone über «Teilen» und «Zum Home-Bildschirm». Danach funktioniert ORMA auch ohne Netz.": "Install: in the browser menu choose «Install app» or «Add to Home screen», on the iPhone via «Share» and «Add to Home Screen». After that ORMA works without a network too.",
    "Sicher?": "Sure?", Abbrechen: "Cancel",
    // Installieren
    "ORMA als App installieren": "Install ORMA as an app", " Danach funktioniert ORMA auch ohne Netz.": " After that ORMA works without a network too.",
    "Im Browser dieser App lässt sich ORMA nicht installieren. Über «···» oder das Menü «In Safari öffnen» wählen, dann dort «Teilen» und «Zum Home-Bildschirm».": "ORMA cannot be installed from this app's browser. Choose «···» or the menu «Open in Safari», then «Share» and «Add to Home Screen» there.",
    "Im Browser dieser App lässt sich ORMA nicht installieren. Über das Menü (⋮) «In Chrome öffnen» wählen und dort noch einmal auf «ORMA als App installieren» tippen.": "ORMA cannot be installed from this app's browser. In the menu (⋮) choose «Open in Chrome» and tap «Install ORMA as an app» there once more.",
    "Unten auf «Teilen» tippen (Quadrat mit Pfeil nach oben), dann «Zum Home-Bildschirm» wählen.": "Tap «Share» at the bottom (the square with the arrow), then choose «Add to Home Screen».",
    "Im Browsermenü (⋮) «App installieren» oder «Zum Startbildschirm hinzufügen» wählen.": "In the browser menu (⋮) choose «Install app» or «Add to Home screen».",
    "Im Browsermenü (⋮) «ORMA installieren» wählen oder in der Adresszeile auf das Installationssymbol klicken. Im Inkognito-Fenster geht es nicht.": "In the browser menu (⋮) choose «Install ORMA» or click the install icon in the address bar. It does not work in an incognito window.",
    "Im Menü «Ablage» «Zum Dock hinzufügen» wählen.": "In the «File» menu choose «Add to Dock».",
    "Dieser Browser kann ORMA nicht installieren. Auf dem Smartphone geht es direkt, am Computer mit Chrome oder Edge.": "This browser cannot install ORMA. On a smartphone it works directly, on a computer with Chrome or Edge.",
    // Namen
    "Zu zweit": "As a pair", "Wer spielt?": "Who is playing?", "Vornamen sind freiwillig.": "First names are optional.", "Erste Person": "First person", "Zweite Person": "Second person",
    "Person A": "Person A", "Person B": "Person B", Person: "Person", Beginnen: "Begin", "Ich, am": "Me, on",
    // Drehen
    "Rad drehen": "Spin the wheel", "So dreht man: ziehen oder wischen, antippen, Eingabetaste": "How to spin: drag or swipe, tap, Enter", "ziehen oder wischen": "drag or swipe", antippen: "tap", Eingabetaste: "Enter key",
    Drehen: "Spin", Überspringen: "Skip", Lesen: "Read", "Gemeinsam lesen": "Read together", "Rad:": "Wheel:", und: "and", " und ": " and ", "Konstellation:": "Constellation:",
    "Allein · Re-Entry": "Alone · re-entry", "Das Rad bringt zwei zusammen": "The wheel brings two together",
    "Tippen oder wischen. Wie du drehst, bestimmt nur den Weg, nicht das Ergebnis.": "Tap or swipe. How you spin only determines the path, not the result.",
    "Tippen oder wischen. Wie ihr dreht, bestimmt nur den Weg, nicht das Ergebnis.": "Tap or swipe. How you spin only determines the path, not the result.",
    // Lesen
    "Zweiter Durchgang": "Second pass", "Zum Einstieg": "Introduction", Frage: "Question", "Originaltext der Konstellation": "Original text of the constellation",
    "Aus «Nebeneinander, Nacheinander», Konstellation Nr.": "From «Nebeneinander, Nacheinander», constellation no.", "Der Einstieg oben ist eine Hinführung der ORMA-Redaktion, kein Zitat.": "The introduction above was written by the ORMA editors; it is not a quotation.",
    "Noch einmal antworten": "Answer once more", "Einen Auftrag wählen": "Choose a task",
    "Du warst schon einmal hier": "You have been here before", "Danach legst du beide Antworten nebeneinander.": "Afterwards you lay both answers side by side.",
    "Die Schleife liess sich auf diesem Gerät nicht speichern.": "The loop could not be saved on this device.", "Die Schleife ist offen": "The loop is open",
    "Deine Antwort ist auf diesem Gerät gespeichert. Sehen wirst du sie erst wieder im zweiten Durchgang: wenn das Rad dich irgendwann wieder zu dieser Konstellation bringt. Dann antwortest du noch einmal, als spätere Version deiner selbst.": "Your answer is saved on this device. You will only see it again in the second pass: when the wheel brings you back to this constellation some day. Then you answer once more, as a later version of yourself.",
    "Weiter drehen": "Keep spinning", "Zur Startansicht": "To the start view",
    // Auftrag
    Spielauftrag: "Task", "Ein Beispiel finden": "Find an example", "Einen Einwand finden": "Find an objection", "Etwas daraus machen": "Make something of it",
    "Was willst du damit machen?": "What do you want to do with it?", "Was wollt ihr damit machen?": "What do you want to do with it?",
    "Wähle einen Auftrag. Beim zweiten Durchgang gilt derselbe. Er ist eine Anregung von ORMA, keine Aussage der genannten Personen.": "Choose a task. The same one applies in the second pass. It is a suggestion by ORMA, not a statement by the people named.",
    "Wählt gemeinsam einen Auftrag. Er ist eine Anregung von ORMA, keine Aussage der genannten Personen.": "Choose a task together. It is a suggestion by ORMA, not a statement by the people named.",
    // Antworten
    "Erster Durchgang": "First pass", Zuerst: "First", Dann: "Then", "Du antwortest": "You answer", "Du antwortest noch einmal": "You answer once more", antwortet: "answers",
    "Dein Gedanke": "Your thought", "Ein, zwei Sätze genügen. Vorläufiges ist willkommen, Widerspruch zur Paarung auch.": "One or two sentences are enough. Provisional thoughts are welcome, so is disagreeing with the pairing.",
    Fertig: "Done", "Fertig, Gerät weitergeben": "Done, hand over the device", "Ich antworte mündlich": "I answer out loud",
    "Du antwortest mündlich. Nichts wird aufgenommen; beim Aufdecken steht an deiner Stelle nur ein Hinweis.": "You answer out loud. Nothing is recorded; when revealing, only a note stands in your place.",
    Weiter: "Continue", "Weiter, Gerät weitergeben": "Continue, hand over the device", "Doch schreiben": "Write after all",
    "Gib das Gerät an": "Hand the device to", "Die erste Antwort bleibt verborgen, bis ihr beide aufdeckt.": "The first answer stays hidden until you both reveal.", "Ich bin": "I am",
    // Aufdecken
    "hat mündlich geantwortet.": "answered out loud.", "(keine Notiz)": "(no note)", "Zwei Durchgänge": "Two passes", "Beide haben geantwortet": "Both have answered",
    "Jetzt aufdecken": "Reveal now", "Jetzt gemeinsam aufdecken": "Reveal together now", "Setzt euch so, dass ihr beide auf den Bildschirm seht.": "Sit so that you can both see the screen.",
    Aufdecken: "Reveal", Aufgedeckt: "Revealed", "Zwei Versionen": "Two versions", "Zwei Sichtweisen": "Two points of view",
    "Was hat sich verändert?": "What has changed?", "Was hast du anders gesehen?": "What did you see differently?",
    "Keine der beiden Antworten ist richtiger. Beide gehören dir, zu verschiedenen Zeiten.": "Neither answer is more correct. Both are yours, at different times.",
    "Sprecht darüber. Keine Antwort ist richtiger oder klüger als die andere.": "Talk about it. Neither answer is more correct or cleverer than the other.", Weiterdenken: "Think further",
    // Weiterdenken
    "Unser neuer Gedanke": "Our new thought", Position: "Position", "Der dritte Gedanke": "The third thought",
    "Freiwillig. Beide Antworten bleiben, wie sie waren; hier kommt nur Neues dazu.": "Optional. Both answers stay as they were; only new things are added here.",
    "Was hat sich zwischen den beiden Antworten verändert?": "What has changed between the two answers?", "Zur Ergebniskarte": "To the result card",
    "Was verändert sich durch den Gedanken der anderen Person?": "What changes through the other person's thought?",
    "Freiwillig. Die ersten Antworten bleiben, wie sie waren; hier kommt nur Neues dazu.": "Optional. The first answers stay as they were; only new things are added here.",
    ergänzt: "adds", "Was haltet ihr fest?": "What do you keep?", "Einen gemeinsamen neuen Gedanken": "One shared new thought", "Zwei Positionen, die bleiben": "Two positions that remain", "Nichts festhalten": "Keep nothing",
    // Ergebnis
    "Beide Antworten": "Both answers", "Erste Antworten und Ergänzungen": "First answers and additions", "Was sich verändert hat: ": "What has changed: ",
    "Im Gedankenbuch": "In the book of thoughts", "Im Gedankenbuch behalten": "Keep in the book of thoughts", "Im Gedankenbuch behalten.": "Kept in the book of thoughts.",
    "Speichern ist auf diesem Gerät gerade nicht möglich.": "Saving is not possible on this device right now.", "Deine Karte": "Your card", "Eure Karte": "Your card",
    "Karte exportieren": "Export the card", "Noch eine Runde": "Another round", "Runde beenden": "End the round",
    // Export
    "Vorschau der Ergebniskarte": "Preview of the result card", Teilen: "Share", "Bild speichern": "Save image", Ergebniskarte: "Result card",
    "Ohne Auswahl zeigt die Karte nur Paarung und Frage. Persönliches kommt nur dazu,": "Without a selection the card shows only the pairing and the question. Personal content is added only", "wenn du es hier anwählst": "if you select it here", "wenn ihr es hier anwählt": "if you select it here",
    "Den dritten Gedanken zeigen": "Show the third thought", "Den dritten Gedanken zeigen (nichts festgehalten)": "Show the third thought (nothing kept)", "Beide Antworten zeigen": "Show both answers",
    "Unser Ergebnis zeigen": "Show our result", "Unser Ergebnis zeigen (nichts festgehalten)": "Show our result (nothing kept)", "Die ersten Antworten zeigen": "Show the first answers", "Unsere Namen zeigen": "Show our names", Zurück: "Back",
    // Gedankenbuch
    Gedankenbuch: "Book of thoughts", "Deine Gedanken bleiben auf diesem Gerät. Beim Löschen der App-Daten können sie verloren gehen.": "Your thoughts stay on this device. If the app data is deleted, they may be lost.",
    Konstellation: "Constellation", Favorit: "Favourite", "Noch keine Gedanken. Nach einer Runde lassen sie sich hier behalten.": "No thoughts yet. After a round they can be kept here.",
    "Offene Schleifen": "Open loops", "Erste Durchgänge im Modus allein. Die Antwort bleibt verborgen, bis das Rad dieselbe Konstellation wieder bringt.": "First passes in solo mode. The answer stays hidden until the wheel brings the same constellation again.",
    "offen seit": "open since", "Schleife löschen": "Delete loop", Löschen: "Delete", "Schleife gelöscht.": "Loop deleted.",
    "Die Einträge liessen sich auf diesem Gerät nicht speichern.": "The entries could not be saved on this device.", "Eintrag/Einträge übernommen": "entry/entries imported", "offene Schleife(n)": "open loop(s)", "schon vorhanden (nicht überschrieben)": "already present (not overwritten)", ungültig: "invalid",
    "Sicherung herunterladen": "Download backup", "Sicherung einlesen": "Import backup", "Ein früher beschädigter Inhalt wurde aufbewahrt. ": "Content that was damaged earlier has been kept. ", Herunterladen: "Download",
    "Alle ORMA-Einträge löschen": "Delete all ORMA entries", "Ja, alle löschen": "Yes, delete all", "Alle Einträge wurden gelöscht.": "All entries have been deleted.",
    Eintrag: "Entry", "Aus dem Gedankenbuch": "From the book of thoughts", "Favorit entfernen": "Remove favourite", "Als Favorit markieren": "Mark as favourite", "Eintrag löschen": "Delete entry", "Dieser Eintrag wird gelöscht.": "This entry will be deleted.", "Eintrag gelöscht.": "Entry deleted.",
    // card.js und store.js
    "Spielauftrag:": "Task:", "ornament.cloud · Nebeneinander, Nacheinander": "ornament.cloud · Nebeneinander, Nacheinander",
    "Die unterbrochene Runde liess sich nicht lesen und wurde nicht fortgesetzt.": "The interrupted round could not be read and was not resumed.",
    "Das Gedankenbuch auf diesem Gerät ist beschädigt. Der alte Inhalt wurde aufbewahrt; neue Einträge werden getrennt davon gespeichert.": "The book of thoughts on this device is damaged. The old content has been kept; new entries are stored separately.",
    buchTeils: (n) => `${n} entry/entries could not be read and are not shown. The old content has been kept.`,
    "Die offenen Schleifen auf diesem Gerät sind beschädigt. Der alte Inhalt wurde aufbewahrt.": "The open loops on this device are damaged. The old content has been kept.",
    "Die Datei ist keine lesbare ORMA-Sicherung.": "The file is not a readable ORMA backup.", "Die Datei ist keine ORMA-Sicherung.": "The file is not an ORMA backup.",
    sicherungVersion: (v) => `This backup has an unknown format (version ${v}).`,
    // das Feld zum Installieren ganz oben (21. Oktober 2026)
    "ORMA installieren": "Install ORMA", "Schliessen": "Close",
    "Auf den Knopf tippen und bestätigen. Geht das in diesem Browser nicht direkt, stehen die Schritte darunter.": "Tap the button and confirm. If this browser cannot do it directly, the steps are below.",
  };
  const KEY = "ornament.sprache";
  // zuerst die Adresse (?sprache=de|en: die Bühne und die Links des Neubaus geben die Sprache der Seite mit, 20. Oktober 2026, und die Wahl wird gemerkt), dann die gemerkte Wahl, sonst das Gerät
  const erkannt = () => {
    const q = new URLSearchParams(location.search).get("sprache");
    if (q === "de" || q === "en") { try { localStorage.setItem(KEY, q); } catch { /* ohne Speicher */ } return q; }
    try { const s = localStorage.getItem(KEY); if (s === "de" || s === "en") return s; } catch { /* ohne Speicher */ }
    return /^en/i.test(navigator.language || "") ? "en" : "de";
  };
  let sprache = erkannt();
  const originale = new WeakMap();
  function anwenden() {
    const en = sprache === "en";
    document.documentElement.lang = en ? "en" : "de";
    for (const el of document.querySelectorAll("[data-t]")) {
      if (!originale.has(el)) originale.set(el, el.innerHTML);
      const k = el.dataset.t;
      el.innerHTML = en && EN[k] != null ? EN[k] : originale.get(el);
    }
    for (const el of document.querySelectorAll("[data-t-attr]")) {
      for (const paar of el.dataset.tAttr.split(";")) {
        const [attr, k] = paar.split("=");
        const alt = `data-de-${attr}`;
        if (!el.hasAttribute(alt)) el.setAttribute(alt, el.getAttribute(attr) ?? "");
        el.setAttribute(attr, en && EN[k] != null ? EN[k] : el.getAttribute(alt));
      }
    }
    for (const a of document.querySelectorAll("[data-t-href]")) { const [de, enHref] = a.dataset.tHref.split("|"); a.setAttribute("href", en ? enHref : de); }
    for (const b of document.querySelectorAll(".sprache [data-sprache]")) { if (b.dataset.sprache === sprache) b.setAttribute("aria-current", "true"); else b.removeAttribute("aria-current"); }
    document.dispatchEvent(new CustomEvent("sprache", { detail: sprache }));
  }
  window.sprache = {
    get: () => sprache,
    en: () => sprache === "en",
    t: (k, ...a) => { const w = (sprache === "en" ? EN : DE)[k] ?? DE[k] ?? k; return typeof w === "function" ? w(...a) : w; },
    setze: (l) => { if (l !== "de" && l !== "en") return; sprache = l; try { localStorage.setItem(KEY, l); } catch { /* ohne Speicher */ } anwenden(); },
  };
  document.addEventListener("click", (e) => { const b = e.target.closest(".sprache [data-sprache]"); if (b) window.sprache.setze(b.dataset.sprache); });
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", anwenden); else anwenden();
})();
