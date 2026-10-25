// ORNAMENT LAB – jev für die Wahl der nächsten Operation und für die Dramaturgie einer Animation aus Bild und Klang (seit Lab 0.1.11),
// beides Entscheidungsform CHOICE. Für die Seite (jev.js); die Zwischenstelle wahl.php
// (PHP auf dem Webspace) hat dieselben Regeln und denselben Wortlaut, tests/lab-jev-php.test.mjs hält beide gleich. Die Lage enthält nur Kennungen aus einem festen Katalog, keine freien Texte, keine Bilder.
// Die Frage hat einen festen Wortlaut; jev liefert Wahrscheinlichkeiten je Option. Das ist eine technische Entscheidungshilfe,
// kein Urteil über die Arbeit: der Mensch nimmt an, verwirft oder ändert (Masterprompt §11).

/** fester Katalog: Kennung → Beschreibung für jev (muss zum Register passen, tests/lab.test.mjs prüft das) */
export const KATALOG = Object.freeze({
  "fictory.prozess": "The Fictory: das Bild zerfällt in Teile, ordnet sich in sechs Operationen neu und setzt sich wieder zusammen (zeitliche Operation)",
  "lab.feedback": "Feedback: das Ergebnis wird wiederholt auf sich selbst angewandt, gezoomt, gedreht und farblich verschoben (rekursive Operation)",
  "lab.wiederholung": "Wiederholung mit Falloff: das Bild wird im Raster wiederholt, Grösse und Drehung verteilen sich über die Lage (räumliche Operation)",
  "lab.farbe": "Farbe modulieren: Farbdrehung, Sättigung, Kontrast, Tonwertstufen (räumliche Operation auf den Farben)",
  "lab.bildsignal": "Bildsignal: ein Merkmal des Bildes wird zu einem Steuersignal für andere Operationen (Kopplung)",
  "lab.differenz": "Differenz: zeigt und misst den Unterschied zu einem anderen Zustand (Beobachtung)",
  "lab.profil": "Kompositorisches Profil: misst Schwerpunkt, Symmetrie, Lichtverteilung, Kontrast, Sättigung und Kantenrichtung des Bildes (Beobachtung)",
  "lab.komposition": "Komposition verändern: verstärkt, hebt auf oder kehrt um, was das Profil misst, etwa Symmetrie, Lichtgefälle oder Sättigung (räumliche Operation)",
  "lab.glitch": "Glitch: Blöcke zeigen Inhalt von anderer Stelle, Zeilen verrutschen, Farbkanäle trennen sich (räumliche Operation)",
  "lab.pixelsortierung": "Pixelsortierung: Abschnitte zwischen zwei Helligkeitsschwellen werden sortiert, das Bild zerfliesst in Streifen (räumliche Operation)",
  "lab.verzerrung": "Optische Verzerrung: Wirbel, Linse, Welle, Kaleidoskop oder Versetzen nach Helligkeit (räumliche Operation)",
  "lab.licht": "Licht: helle Stellen glühen oder streichen zu Lichtfahnen aus (räumliche Operation)",
  "lab.raster": "Raster und Linien: das Bild wird zu Punkten, Linien, Schraffur, Wellenlinien oder Mosaik (räumliche Operation)",
  "lab.neusetzen": "Zerlegen und neu setzen: Kacheln oder Streifen werden zufällig, nach Helligkeit oder umgekehrt neu geordnet (räumliche Operation)",
  "lab.puls": "Pulslinien: eine Linie läuft parallel, als Spirale oder in Kreisen über das Bild und schwingt, wo es dunkel ist (räumliche Operation)",
  "lab.schraffur": "Schraffur in Lagen: das Dunkel wird zu Lagen paralleler Linien in eigenen Winkeln, wie im Kupferstich (räumliche Operation)",
  "lab.fluss": "Fliessfeld: feine Striche folgen den Kanten des Bildes, einem Rauschen oder einem Wirbel und verdichten sich im Dunkeln (räumliche Operation)",
  "lab.punktieren": "Punktieren: das Dunkel wird zur Dichte gewürfelter Punkte, wahlweise Voronoi-Zellen oder ein Mosaik in Bildfarben (räumliche Operation)",
  "lab.teilung": "Teilung: das Bild wird geviertelt, wo es dunkel oder bewegt ist, zu Rahmen, Mosaik, Truchet-Bögen oder Quadraten (räumliche Operation)",
  "lab.format": "Format: das Bild wird als Ausschnitt in ein Seitenverhältnis eingepasst, 9:16, 4:5, 1:1 oder 16:9, ohne Rand und ohne Verzerrung (räumliche Operation)",
  "phorma.gewebe": "PHORMA Gewebe: die Umrisse des Bildes werden zu Flächen aus feinen Linien, die ein Ton bewegt (zeitliche Operation, eigene Bühne)",
  "phorma.irrfahrt": "PHORMA Irrfahrt: ein Faden irrt durch einen Würfel aus Licht und quillt mit der Musik zu Rauch auf (zeitliche Operation, eigene Bühne)",
  "phorma.lichtwuerfel": "PHORMA Lichtwürfel: ein Faden irrt in einem festen Würfel aus Licht (zeitliche Operation, eigene Bühne)",
  "phorma.traube": "PHORMA Traube: glänzende Perlen in einer Kugel aus Fäden, Schnitte im Takt des Tons (zeitliche Operation, eigene Bühne)",
  "phorma.ii": "PHORMA II: Physarum, Tiefe, Wellenwanne, Tuch, Rasterdruck oder Montage, einzeln oder als Kette (zeitliche Operation, eigene Bühne)",
  "phorma.i": "PHORMA I: Fragmente oder die Verwandlung aus Strom, Körper, Scherben, Echo, Relief (zeitliche Operation, eigene Bühne)",
  "lab.beat": "Beat aus Bild: das Bild wird zu einem kurzen Beat mit Schlagzeug, Bass und Melodie, aus Farbe, Helligkeit und Komposition gelesen (Medienwechsel nach Klang)",
});

const KENNUNG = /^[a-z]+\.[a-z0-9-]+$/;

/**
 * fester Katalog der Dramaturgien für eine Animation von 30 Sekunden aus Bild und Klang (kern/vorschlag.js hat die Schritte dazu).
 * Seit Lab 0.1.20 vorerst nur Dramaturgien aus lebendigen Effekten (medien/gpu.js): Zerfall (The Fictory) und Spiegelung (Komposition) sind
 * Standbilder mit Kamera und stehen einem fliessenden Film wie bei PHORMA entgegen (Christian, 24. Oktober 2026); ihre Operationen bleiben im Register.
 */
export const DRAMATURGIEN = Object.freeze({
  "vorschlag.puls": "Puls: sechs Varianten einer Feedback-Schleife, deren Zoom der Lautstärke folgt; harte Schnitte zwischen ihnen auf den Anschlägen des Klangs",
  "vorschlag.farbwelle": "Farbwelle: die Farben drehen sich mit der Lautstärke durch den Farbkreis, in acht Varianten; Überblendungen im Takt der Anschläge",
  "vorschlag.raster": "Vervielfältigung: das Bild wird im Raster wiederholt, die Grösse der Kopien folgt der Lautstärke; Schnitte im Takt der Anschläge",
  "vorschlag.zerfall": "Zerfall: das Bild zerfällt in Farbflächen und setzt sich in sechs Zuständen neu zusammen (The Fictory); ruhige Übergänge, bei denen die dunklen Stellen zuerst erscheinen",
  "vorschlag.steigerung": "Steigerung: drei Operationen nacheinander (Farbe, Wiederholung, Feedback), das Bild verwandelt sich schrittweise immer weiter; lange, ruhige Übergänge",
});

/** gemessene Merkmale in festen Stufen: so sieht jev weder Bild noch Klang, nur diese Wörter (kern/vorschlag.js misst sie) */
export const MERKMALE = Object.freeze({
  bild: Object.freeze({
    kontrast: { niedrig: "Kontrast niedrig", mittel: "Kontrast mittel", hoch: "Kontrast hoch" },
    farbigkeit: { grau: "fast ohne Farbe", gedaempft: "gedämpfte Farben", bunt: "kräftige Farben" },
    symmetrie: { symmetrisch: "nahezu spiegelgleich", asymmetrisch: "deutlich asymmetrisch" },
    helligkeit: { dunkel: "eher dunkel", mittel: "mittlere Helligkeit", hell: "eher hell" },
  }),
  klang: Object.freeze({
    dichte: { ruhig: "wenige Anschläge (weniger als einer je zwei Sekunden)", bewegt: "regelmässige Anschläge (etwa einer bis zwei je Sekunde)", dicht: "dichte Anschläge (mehr als zwei je Sekunde)" },
    dynamik: { gleichmaessig: "die Lautstärke bleibt etwa gleich", anschwellend: "wird über die Zeit lauter", abschwellend: "wird über die Zeit leiser", wechselhaft: "die Lautstärke wechselt stark" },
  }),
});
const MERKMAL_SCHLUESSEL = [...Object.keys(MERKMALE.bild), ...Object.keys(MERKMALE.klang)];
const merkmalText = (k, v) => MERKMALE.bild[k]?.[v] ?? MERKMALE.klang[k]?.[v];

/** Zusammenstellung durch jev (seit Lab 0.1.12): für jeden Abschnitt des Films ein Bildeffekt, dazu zwei Klangeffekte nacheinander,
    der Aufbau und der Übergang. Feste Kataloge, je eine CHOICE-Frage; die Zuordnung zu Operationen steht in kern/zusammenstellung.js */
export const ABSCHNITTE = 6;
// seit Lab 0.1.20 vorerst nur die sieben lebendigen Effekte (jedes Filmbild neu gerechnet, medien/gpu.js); Komposition, Pixelsortierung,
// Neu setzen und Zerfall (The Fictory) blieben Standbilder mit Kamera und stünden einem fliessenden Film entgegen (Christian, 24. Oktober 2026)
export const BILD_EFFEKTE = Object.freeze({
  "bild.feedback": "Feedback-Schleife: das Bild wird immer wieder auf sich selbst gelegt, gezoomt und gedreht, es entsteht ein Sog",
  "bild.wiederholung": "Wiederholung: das Bild vervielfacht sich im Raster, die Kopien werden grösser und kleiner",
  "bild.farbe": "Farbe: die Farben drehen sich durch den Farbkreis und werden kräftiger",
  "bild.glitch": "Glitch: Blöcke verrutschen, Zeilen springen, Farbkanäle trennen sich",
  "bild.verzerrung": "Verzerrung: das Bild wird verwirbelt, gewellt oder wie durch eine Linse gesehen",
  "bild.licht": "Licht: helle Stellen glühen auf und strahlen aus",
  "bild.raster": "Raster: das Bild wird zu Punkten und Linien wie im Druck",
  // die Linienbilder (seit Lab 0.1.36, nach den Plotter-Umwandlern von Makelangelo): lebendig, sie bewegen sich von selbst
  "bild.puls": "Pulslinien: parallele Linien schwingen, wo das Bild dunkel ist, höher und dichter, wie ein Plotter mit einem einzigen Puls",
  "bild.spirale": "Spirale: eine Linie läuft als Spirale aus der Mitte und schwingt im Dunkeln, die Schwingungen wandern",
  "bild.schraffur": "Schraffur: Lagen feiner Linien in verschiedenen Winkeln, im Dunkeln liegen alle übereinander, wie im Kupferstich",
  "bild.fluss": "Fliessfeld: feine Striche folgen den Kanten des Bildes und fliessen, im Dunkeln verdichten sie sich zu Tinte",
  "bild.punktieren": "Punktieren: das Bild wird aus gewürfelten Punkten gezeichnet, im Dunkeln dicht, die Punkte schimmern",
  "bild.glasfenster": "Glasfenster: Voronoi-Zellen in den Farben des Bildes, im Dunkeln klein, mit dunklen Fugen",
  "bild.teilung": "Teilung: das Bild wird zu Quadraten geviertelt, fein wo es dicht ist, grob im Hellen, jedes in seiner Farbe",
  "bild.truchet": "Truchet: Felder mit Viertelbögen, deren Richtung der Ton wählt, sie drehen sich einzeln",
  // PHORMA III (seit Lab 0.1.21): das Gewebe wächst aus den Umrissen des Bildes, die Grafikkarte rechnet jedes Bild aus der Zeit und dem Ton. Irrfahrt,
  // Lichtwürfel und Traube sind seit 0.1.35 nicht mehr in der Zusammenstellung (Christian, 25. Oktober 2026: «brauchts wohl nicht, weil sie nicht mit
  // dem Bild arbeiten»); ihre Operationen bleiben im Register und im KATALOG der nächsten Operation
  "bild.gewebe": "Gewebe: die Umrisse des Bildes werden zu Flächen aus feinen Linien, die der Ton bewegt, bei kräftigen Einsätzen neue Bilder (PHORMA)",
  // PHORMA II (seit Lab 0.1.22, eine Operation mit Abläufen): die Grafikkarte rechnet jedes Bild aus der Zeit
  "bild.physarum": "Physarum: ein Schleimpilz wächst aus den markanten Stellen und findet die Formen des Bildes als Netz (PHORMA II)",
  "bild.tiefe": "Tiefe: ein Lichtscan tastet das Bild ab, es bekommt Relief und wird Raum (PHORMA II)",
  "bild.welle": "Wellenwanne: das Bild liegt unter Wasser, Dünung und Ringe brechen es, helle Linien glänzen (PHORMA II)",
  "bild.tuch": "Tuch: das Bild fällt als Seidentuch und legt sich glatt (PHORMA II)",
  "bild.druck": "Rasterdruck: das Bild wird zum Vierfarbendruck aus Punkten, die Platten rasten ein und bleiben versetzt (PHORMA II)",
  "bild.montage": "Montage: das Bild zerfällt in verschachtelte Rechtecke mit eigenen Ausschnitten, harte Schnitte im Takt (PHORMA II)",
  // PHORMA I (seit Lab 0.1.22, eine Operation mit Abläufen)
  "bild.fragmente": "Fragmente: Linien tasten das Bild ab, Dreiecke fliegen herein, Farben, das Foto rastet ein (PHORMA I)",
  "bild.strom": "Strom: Teilchen leuchten auf, ziehen zu Bändern und fliegen an ihren Platz (PHORMA I)",
  "bild.koerper": "Körper: drei Kristalle verschmelzen zu einem Glaskörper, der am Ende klar wird (PHORMA I)",
  "bild.scherben": "Scherben: das Bild bricht, die Scherben setzen sich neu zusammen (PHORMA I)",
  "bild.echo": "Echo: eine Rückkopplung zieht das Bild durch einen Tunnel, es baut sich aus Echos auf (PHORMA I)",
  "bild.relief": "Relief: Höhenlinien werden zu einem Gebirge aus dem Bild, das sich wieder flach legt (PHORMA I)",
  // The Fictory (seit Lab 0.1.22 wieder, lebendig: der Prozess läuft im Film von Zustand zu Zustand)
  "bild.zerfall": "Zerfall: das Bild zerfällt in Farbflächen und setzt sich in sechs Zuständen neu zusammen (The Fictory)",
});
export const KLANG_EFFEKTE = Object.freeze({
  "klang.keine": "nichts: der Klang bleibt, wie er ist",
  "klang.schneller": "schneller: das Tempo steigt um ein Viertel, die Tonhöhe bleibt",
  "klang.langsamer": "langsamer: das Tempo sinkt um ein Fünftel, die Tonhöhe bleibt",
  "klang.tiefer": "tiefer: die Tonhöhe sinkt um eine Quarte, das Tempo bleibt",
  "klang.zerlegt": "zerlegt: der Klang wird an seinen Anschlägen geschnitten und neu geordnet, mit Wiederholungen und Umkehrungen",
  "klang.rhythmus": "neu rhythmisiert: die Schnitte des Klangs werden auf ein neues, euklidisches Raster gesetzt",
  "klang.koerner": "Körner: der Klang wird in kleine Körner zerstäubt und zu einer Fläche von 30 Sekunden gestreckt",
});
export const AUFBAU = Object.freeze({
  "aufbau.kette": "Kette: jeder Abschnitt verwandelt das Ergebnis des vorigen weiter, das Bild entfernt sich immer mehr vom Anfang",
  "aufbau.faecher": "Fächer: jeder Abschnitt geht wieder vom Ausgangsbild aus, die Effekte stehen nebeneinander",
});
export const FILM_UEBERGAENGE = Object.freeze({
  "film.schnitt": "harte Schnitte auf den Anschlägen des Klangs",
  "film.blende": "weiche Überblendungen im Takt der Anschläge",
  "film.schwelle": "Übergänge, bei denen die dunklen Stellen des nächsten Bildes zuerst erscheinen",
});
const ABSCHNITT_NAMEN = ["Anfang", "Entfaltung", "Verdichtung", "Höhepunkt", "Umbruch", "Ausklang"];
export const KOMPOSITION_FRAGEN = Object.freeze({
  aufbau: { katalog: AUFBAU, text: "Wie sollen die Abschnitte aufeinander aufbauen?" },
  uebergang: { katalog: FILM_UEBERGAENGE, text: "Welche Art von Übergang zwischen den Bildern passt?" },
  klang1: { katalog: KLANG_EFFEKTE, text: "Welcher Klangeffekt soll zuerst auf den Klang wirken?" },
  klang2: { katalog: KLANG_EFFEKTE, text: "Welcher Klangeffekt soll danach auf das Ergebnis wirken?" },
  ...Object.fromEntries(ABSCHNITT_NAMEN.map((n, i) => [`bild${i + 1}`, { katalog: BILD_EFFEKTE, text: `Welcher Bildeffekt prägt Abschnitt ${i + 1} von ${ABSCHNITT_NAMEN.length} («${n}», etwa Sekunde ${i * 5} bis ${i * 5 + 5})?` }])),
});
export const FRAGE_KOMPOSITION = "In einem künstlerischen Labor stellt jev aus vielen Bild- und Klangeffekten eine Animation von 30 Sekunden aus einem Bild und einem Klang zusammen; der bearbeitete Klang ist die Tonspur. Gemessen wurden nur die genannten Merkmale. Die Zusammenstellung soll abwechslungsreich sein und aus diesem Bild und diesem Klang hervorgehen.";

/**
 * Beat aus Bild oder Video (seit Lab 0.1.24): jev wählt die acht Stellen eines Beats aus festen Katalogen, gemessen sind nur die Stufen
 * in BEAT_MERKMALE (kern/beat.js misst sie). Die Werte der Kataloge sind die Parameter von «Beat aus Bild» (operationen/beat.js).
 */
export const BEAT_MERKMALE = Object.freeze({
  helligkeit: { dunkel: "eher dunkel", mittel: "mittlere Helligkeit", hell: "eher hell" },
  kontrast: { niedrig: "Kontrast niedrig", mittel: "Kontrast mittel", hoch: "Kontrast hoch" },
  farbigkeit: { grau: "fast ohne Farbe", gedaempft: "gedämpfte Farben", bunt: "kräftige Farben" },
  farbton: { warm: "vorwiegend warme Farben (Rot, Orange, Gelb)", kalt: "vorwiegend kalte Farben (Grün, Blau, Violett)", neutral: "ohne vorherrschenden Farbton" },
  detail: { glatt: "grosse, ruhige Flächen", mittel: "mittlere Feinheit", fein: "viele feine Einzelheiten und Kanten" },
  schwerpunkt: { oben: "das Gewicht des Bildes liegt oben", mitte: "das Gewicht liegt in der Mitte", unten: "das Gewicht liegt unten" },
  symmetrie: { symmetrisch: "nahezu spiegelgleich", asymmetrisch: "deutlich asymmetrisch" },
  bewegung: { still: "ein einzelnes Bild, keine Bewegung", ruhig: "ein Video mit wenig Bewegung", bewegt: "ein Video mit deutlicher Bewegung", heftig: "ein Video mit heftiger Bewegung oder Schnitten" },
});
export const BEAT_FRAGEN = Object.freeze({
  tempo: { text: "Welches Tempo passt?", katalog: Object.freeze({
    langsam: "langsam, etwa 75 Schläge je Minute", mittel: "mittel, etwa 90 Schläge je Minute", schnell: "schnell, etwa 125 Schläge je Minute", rasend: "rasend, etwa 160 Schläge je Minute" }) },
  groove: { text: "Welcher Groove passt?", katalog: Object.freeze({
    gerade: "gerade: Bassdrum auf jedem Viertel, Snare auf zwei und vier",
    halftime: "Halftime: Bassdrum am Anfang, Snare nur auf drei, schwer und breit",
    breakbeat: "Breakbeat: synkopierte Bassdrum, Snare auf zwei und vier mit leisen Zwischenschlägen",
    euklidisch: "euklidisch: Schläge möglichst gleichmässig verteilt, ungerade Muster wie fünf aus sechzehn",
    schleppend: "schleppend: Groove mit Swing, die Zwischenschläge kommen spät",
    dnb: "Drum and Bass: 170 bis 176 Schläge je Minute, Bassdrum auf eins und kurz vor drei, Snare auf zwei und vier, dazwischen gebrochene Schläge" }) },
  kit: { text: "Welche Klänge soll das Schlagzeug haben?", katalog: Object.freeze({
    trocken: "trocken: kurze, akustisch wirkende Trommeln", elektronisch: "elektronisch: lange, tiefe Bassdrum und Klatschen wie bei einer Drum-Machine",
    metallisch: "metallisch: klirrende Becken und glockenartige Töne", weich: "weich: gedämpfte, runde Schläge ohne Härte",
    jazz: "Jazz: Besen auf der Snare, Ride-Becken, runde Bassdrum, Bläser als Melodie", hand: "Handtrommeln: wie Tabla und Zarb, die tiefe Trommel gleitet, die hohe klingt als Ton" }) },
  tonart: { text: "Welche Tonart soll der Beat haben?", katalog: Object.freeze({
    dur: "Dur: hell und offen", moll: "Moll: dunkel und ernst", dorisch: "dorisch: Moll mit einem hellen Ton, schwebend",
    phrygisch: "phrygisch: dunkel und fremd, mit kleiner Sekunde", pentatonik: "pentatonisch: fünf Töne ohne Halbtöne, nichts reibt",
    hijaz: "Hijaz: kleine Sekunde und grosse Terz, wie im Orient und bei Anouar Brahem" }) },
  bass: { text: "Was soll der Bass tun?", katalog: Object.freeze({
    keiner: "kein Bass", liegend: "liegend: lange Töne, je Takt einer", pulsierend: "pulsierend: Achtel auf dem Grundton, mit Oktavsprüngen", laufend: "laufend: der Bass geht in Schritten durch die Tonleiter",
    reese: "Reese: tiefer, schwebender Bass aus zwei gegeneinander verstimmten Sägezähnen, wie im Drum and Bass",
    kontrabass: "Kontrabass: gezupft, in Vierteln zum nächsten Akkord, darunter ein tiefer Sinus" }) },
  melodie: { text: "Welche Melodie soll über dem Beat liegen?", katalog: Object.freeze({
    keine: "keine Melodie", bild: "aus dem Bild gelesen: die hellste Stelle jeder Spalte gibt den Ton, von links nach rechts",
    arpeggio: "Arpeggio: die Töne des Akkords auf und ab", glocken: "Glocken: wenige Töne auf den hellsten Punkten des Bildes" }) },
  verlauf: { text: "Wie soll sich der Beat über die Zeit entwickeln?", katalog: Object.freeze({
    gleich: "gleich: alles spielt von Anfang an", steigend: "steigend: die Stimmen setzen nacheinander ein, es wird dichter",
    abschwellend: "abschwellend: voll am Anfang, dann lichtet es sich", wellen: "in Wellen: dichter, wo sich das Video stark bewegt, sonst lichter",
    wechselnd: "fein und wild im Wechsel: lichte, zarte Takte wechseln mit dichten, gebrochenen" }) },
  flaeche: { text: "Soll eine Klangfläche den Beat tragen?", katalog: Object.freeze({
    keine: "keine Fläche", sphaere: "sphärisch: lange, schwebende Akkorde mit viel Raum", schimmer: "schimmernd: sphärisch und dazu hohe, glitzernde Töne" }) },
});
export const FRAGE_BEAT = "In einem künstlerischen Labor entsteht aus einem Bild oder einem Video ein kurzer Beat als Soundtrack. Gemessen wurden nur die genannten Merkmale. Der Beat soll aus diesem Bild hervorgehen, statt ihm von aussen übergestülpt zu werden.";

/**
 * eine Lage prüfen und bereinigen. Vier feste Fragen:
 *   { verlauf: [Kennungen, höchstens 8], optionen: [Operationen aus KATALOG, 2–6] }                      nächste Operation
 *   { frage: "dramaturgie", merkmale: { alle Schlüssel aus MERKMALE, je eine Stufe }, optionen: [aus DRAMATURGIEN, 2–6] }
 *   { frage: "komposition", merkmale: { wie oben } }                     Zusammenstellung, die Optionen sind die festen Kataloge
 *   { frage: "beat", merkmale: { alle Schlüssel aus BEAT_MERKMALE } }      Beat aus Bild oder Video, die Optionen sind BEAT_FRAGEN
 */
export function labLage(roh) {
  if (!roh || typeof roh !== "object" || Array.isArray(roh)) throw new Error("Lage fehlt");
  if (roh.frage === "dramaturgie") return dramaturgieLage(roh);
  if (roh.frage === "komposition") return kompositionLage(roh);
  if (roh.frage === "beat") return beatLage(roh);
  const fremd = Object.keys(roh).filter((k) => !["verlauf", "optionen"].includes(k));
  if (fremd.length) throw new Error(`unbekannte Felder: ${fremd.join(", ")}`);
  const verlauf = Array.isArray(roh.verlauf) ? roh.verlauf.slice(-8) : [];
  if (!verlauf.every((k) => typeof k === "string" && KENNUNG.test(k))) throw new Error("Verlauf enthält ungültige Kennungen");
  const optionen = [...new Set(Array.isArray(roh.optionen) ? roh.optionen : [])];
  if (optionen.length < 2 || optionen.length > 6 || !optionen.every((k) => KATALOG[k])) throw new Error("Optionen müssen 2–6 Kennungen aus dem Katalog sein");
  return { verlauf, optionen };
}

function merkmaleLage(m) {
  if (!m || typeof m !== "object" || Array.isArray(m)) throw new Error("Merkmale fehlen");
  const fremdeMerkmale = Object.keys(m).filter((k) => !MERKMAL_SCHLUESSEL.includes(k));
  if (fremdeMerkmale.length) throw new Error(`unbekannte Merkmale: ${fremdeMerkmale.join(", ")}`);
  const merkmale = {};
  for (const k of MERKMAL_SCHLUESSEL) {
    if (typeof m[k] !== "string" || !Object.hasOwn(MERKMALE.bild[k] ?? MERKMALE.klang[k], m[k])) throw new Error(`Merkmal ${k} fehlt oder hat keine gültige Stufe`);
    merkmale[k] = m[k];
  }
  return merkmale;
}
function kompositionLage(roh) {
  const fremd = Object.keys(roh).filter((k) => !["frage", "merkmale"].includes(k));
  if (fremd.length) throw new Error(`unbekannte Felder: ${fremd.join(", ")}`);
  return { frage: "komposition", merkmale: merkmaleLage(roh.merkmale) };
}
function beatLage(roh) {
  const fremd = Object.keys(roh).filter((k) => !["frage", "merkmale"].includes(k));
  if (fremd.length) throw new Error(`unbekannte Felder: ${fremd.join(", ")}`);
  const m = roh.merkmale;
  if (!m || typeof m !== "object" || Array.isArray(m)) throw new Error("Merkmale fehlen");
  const fremdeMerkmale = Object.keys(m).filter((k) => !Object.hasOwn(BEAT_MERKMALE, k));
  if (fremdeMerkmale.length) throw new Error(`unbekannte Merkmale: ${fremdeMerkmale.join(", ")}`);
  const merkmale = {};
  for (const k of Object.keys(BEAT_MERKMALE)) {
    if (typeof m[k] !== "string" || !Object.hasOwn(BEAT_MERKMALE[k], m[k])) throw new Error(`Merkmal ${k} fehlt oder hat keine gültige Stufe`);
    merkmale[k] = m[k];
  }
  return { frage: "beat", merkmale };
}
function dramaturgieLage(roh) {
  const fremd = Object.keys(roh).filter((k) => !["frage", "merkmale", "optionen"].includes(k));
  if (fremd.length) throw new Error(`unbekannte Felder: ${fremd.join(", ")}`);
  const merkmale = merkmaleLage(roh.merkmale);
  const optionen = [...new Set(Array.isArray(roh.optionen) ? roh.optionen : [])];
  if (optionen.length < 2 || optionen.length > 6 || !optionen.every((k) => typeof k === "string" && Object.hasOwn(DRAMATURGIEN, k))) throw new Error("Optionen müssen 2–6 Dramaturgien aus dem Katalog sein");
  return { frage: "dramaturgie", merkmale, optionen };
}

export const FRAGE_DRAMATURGIE = "In einem künstlerischen Labor sollen ein Bild und ein Klang zu einer Animation von 30 Sekunden werden; der Klang ist die Tonspur. Gemessen wurden nur die genannten Merkmale. Bei welcher der folgenden Dramaturgien geht die Bewegung am ehesten aus diesem Bild und diesem Klang hervor, statt ihnen von aussen übergestülpt zu werden?";

/** feste Frage an jev aus einer geprüften Lage */
export function labFrage(lage) {
  const zeile = (gruppe) => Object.keys(MERKMALE[gruppe]).map((k) => merkmalText(k, lage.merkmale[k])).join("; ");
  if (lage.frage === "beat") return {
    zustand: { labor: "ORNAMENT LAB, Beat aus Bild oder Video", bild: Object.entries(BEAT_MERKMALE).map(([k, w]) => w[lage.merkmale[k]]).join("; ") },
    fragen: Object.fromEntries(Object.entries(BEAT_FRAGEN).map(([k, f]) => [k, { type: "choice", instructions: `${FRAGE_BEAT} ${f.text}`, criteria: { ...f.katalog } }])),
  };
  if (lage.frage === "komposition") return {
    zustand: { labor: "ORNAMENT LAB, Animation aus Bild und Klang, von jev zusammengestellt", bild: zeile("bild"), klang: zeile("klang") },
    fragen: Object.fromEntries(Object.entries(KOMPOSITION_FRAGEN).map(([k, f]) => [k, { type: "choice", instructions: `${FRAGE_KOMPOSITION} ${f.text}`, criteria: { ...f.katalog } }])),
  };
  if (lage.frage === "dramaturgie") {
    return {
      zustand: { labor: "ORNAMENT LAB, Animation aus Bild und Klang", bild: zeile("bild"), klang: zeile("klang") },
      fragen: { wahl: { type: "choice", instructions: FRAGE_DRAMATURGIE, criteria: Object.fromEntries(lage.optionen.map((k) => [k, DRAMATURGIEN[k]])) } },
    };
  }
  const bisher = lage.verlauf.length ? lage.verlauf.map((k, i) => `${i + 1}. ${KATALOG[k] ?? k}`).join("\n") : "noch keine Operation; nur das Ausgangsbild";
  return {
    zustand: { labor: "ORNAMENT LAB, experimentelle Bildoperationen", bisherigerVerlauf: bisher },
    fragen: {
      wahl: {
        type: "choice",
        instructions: "In einem künstlerischen Labor wird ein Bild schrittweise durch Operationen verändert; jedes Ergebnis kann weitergeführt werden. Welche der folgenden Operationen eröffnet als nächster Schritt am ehesten eine Fortsetzung, die sich vom bisherigen Verlauf deutlich unterscheidet, statt ihn nur zu wiederholen?",
        criteria: Object.fromEntries(lage.optionen.map((k) => [k, KATALOG[k]])),
      },
    },
  };
}
