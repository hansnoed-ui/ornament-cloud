<?php
// ORNAMENT LAB – jev live: die Zwischenstelle auf dem Webspace bei Hostpoint (seit 23. Oktober 2026, ersetzt den Worker-Entwurf).
// Die Seite spricht nie selbst mit api.typesafe.ai und kennt keinen Schlüssel. Sie fragt diese Datei unter derselben Adresse wie das Lab;
// erst hier wird der Schlüssel gelesen, und zwar aus einer Datei AUSSERHALB der Website: ~/ornament-geheim/typesafe-schluessel.
// Dorthin legt ihn der Deploy-Workflow aus dem GitHub-Secret TYPESAFE_API_KEY (tools/hostpoint/jev-schluessel.sh); fehlt das Secret,
// löscht er die Datei, und jev live ist aus. Anleitung: alpha/lab/docs/JEV-STATUS.md.
//
//   GET  wahl.php                                 → { bereit: true|false, grund? }   (kostet nichts, fragt jev nicht)
//   POST wahl.php  { verlauf: [...], optionen: [...] }  → { wahrscheinlichkeiten: { "lab.feedback": 0.6, … }, modell, zwischengespeichert }
//   POST wahl.php  { frage: "dramaturgie", merkmale: {...}, optionen: [...] }  → ebenso, für die Animation aus Bild und Klang (seit Lab 0.1.11)
//   POST wahl.php  { frage: "komposition", merkmale: {...} }  → { antworten: { aufbau: {…}, klang1: {…}, bild1: {…}, … }, modell, … } (seit 0.1.12)
//   POST wahl.php  { frage: "beat", merkmale: {...} }  → { antworten: { tempo: {…}, groove: {…}, … }, modell, … } (Beat aus Bild oder Video, seit 0.1.24)
//
// Was die Zwischenstelle annimmt: nur POST von https://ornament.cloud (Origin), JSON, höchstens 2000 Bytes, nur eine Lage, die dieselben
// Regeln erfüllt wie labLage() in fragen.js (Kennungen aus dem festen Katalog, keine freien Texte). Die Frage baut sie selbst mit festem
// Wortlaut (wie labFrage() in fragen.js; tests/lab-jev-php.test.mjs prüft, dass beide Fassungen dasselbe schicken).
// Nach aussen geht nur ein Aufruf: POST https://api.typesafe.ai/v1/systemone (Entscheidungsform CHOICE).
// Grenzen: je Adresse 6 Fragen in der Minute und 60 am Tag; für alle zusammen 200 echte jev-Aufrufe am Tag und 2000 im Monat
// (bei etwa 1000 Eingabe-Token und 0,042 $ je Million Token höchstens rund 9 Cent im Monat). Gleiche Lagen kommen 30 Tage aus dem
// Zwischenspeicher und kosten nichts. Adressen werden nur als Prüfsumme gezählt und am nächsten Tag vergessen.
declare(strict_types=1);

const JEV_URL = 'https://api.typesafe.ai/v1/systemone';
const HERKUNFT = 'https://ornament.cloud';
const MAX_BYTES = 2000;
const HALTBAR = 30 * 24 * 3600;
const GRENZEN = ['je_minute' => 6, 'je_tag_adresse' => 60, 'je_tag' => 200, 'je_monat' => 2000];

/** fester Katalog: Kennung → Beschreibung für jev (gleich wie KATALOG in fragen.js) */
const KATALOG = [
  'fictory.prozess' => 'The Fictory: das Bild zerfällt in Teile, ordnet sich in sechs Operationen neu und setzt sich wieder zusammen (zeitliche Operation)',
  'lab.feedback' => 'Feedback: das Ergebnis wird wiederholt auf sich selbst angewandt, gezoomt, gedreht und farblich verschoben (rekursive Operation)',
  'lab.wiederholung' => 'Wiederholung mit Falloff: das Bild wird im Raster wiederholt, Grösse und Drehung verteilen sich über die Lage (räumliche Operation)',
  'lab.farbe' => 'Farbe modulieren: Farbdrehung, Sättigung, Kontrast, Tonwertstufen (räumliche Operation auf den Farben)',
  'lab.bildsignal' => 'Bildsignal: ein Merkmal des Bildes wird zu einem Steuersignal für andere Operationen (Kopplung)',
  'lab.differenz' => 'Differenz: zeigt und misst den Unterschied zu einem anderen Zustand (Beobachtung)',
  'lab.profil' => 'Kompositorisches Profil: misst Schwerpunkt, Symmetrie, Lichtverteilung, Kontrast, Sättigung und Kantenrichtung des Bildes (Beobachtung)',
  'lab.komposition' => 'Komposition verändern: verstärkt, hebt auf oder kehrt um, was das Profil misst, etwa Symmetrie, Lichtgefälle oder Sättigung (räumliche Operation)',
  'lab.glitch' => 'Glitch: Blöcke zeigen Inhalt von anderer Stelle, Zeilen verrutschen, Farbkanäle trennen sich (räumliche Operation)',
  'lab.pixelsortierung' => 'Pixelsortierung: Abschnitte zwischen zwei Helligkeitsschwellen werden sortiert, das Bild zerfliesst in Streifen (räumliche Operation)',
  'lab.verzerrung' => 'Optische Verzerrung: Wirbel, Linse, Welle, Kaleidoskop oder Versetzen nach Helligkeit (räumliche Operation)',
  'lab.licht' => 'Licht: helle Stellen glühen oder streichen zu Lichtfahnen aus (räumliche Operation)',
  'lab.raster' => 'Raster und Linien: das Bild wird zu Punkten, Linien, Schraffur, Wellenlinien oder Mosaik (räumliche Operation)',
  'lab.neusetzen' => 'Zerlegen und neu setzen: Kacheln oder Streifen werden zufällig, nach Helligkeit oder umgekehrt neu geordnet (räumliche Operation)',
  'lab.puls' => 'Pulslinien: eine Linie läuft parallel, als Spirale oder in Kreisen über das Bild und schwingt, wo es dunkel ist (räumliche Operation)',
  'lab.schraffur' => 'Schraffur in Lagen: das Dunkel wird zu Lagen paralleler Linien in eigenen Winkeln, wie im Kupferstich (räumliche Operation)',
  'lab.fluss' => 'Fliessfeld: feine Striche folgen den Kanten des Bildes, einem Rauschen oder einem Wirbel und verdichten sich im Dunkeln (räumliche Operation)',
  'lab.punktieren' => 'Punktieren: das Dunkel wird zur Dichte gewürfelter Punkte, wahlweise Voronoi-Zellen oder ein Mosaik in Bildfarben (räumliche Operation)',
  'lab.teilung' => 'Teilung: das Bild wird geviertelt, wo es dunkel oder bewegt ist, zu Rahmen, Mosaik, Truchet-Bögen oder Quadraten (räumliche Operation)',
  'phorma.gewebe' => 'PHORMA Gewebe: die Umrisse des Bildes werden zu Flächen aus feinen Linien, die ein Ton bewegt (zeitliche Operation, eigene Bühne)',
  'phorma.irrfahrt' => 'PHORMA Irrfahrt: ein Faden irrt durch einen Würfel aus Licht und quillt mit der Musik zu Rauch auf (zeitliche Operation, eigene Bühne)',
  'phorma.lichtwuerfel' => 'PHORMA Lichtwürfel: ein Faden irrt in einem festen Würfel aus Licht (zeitliche Operation, eigene Bühne)',
  'phorma.traube' => 'PHORMA Traube: glänzende Perlen in einer Kugel aus Fäden, Schnitte im Takt des Tons (zeitliche Operation, eigene Bühne)',
  'phorma.ii' => 'PHORMA II: Physarum, Tiefe, Wellenwanne, Tuch, Rasterdruck oder Montage, einzeln oder als Kette (zeitliche Operation, eigene Bühne)',
  'phorma.i' => 'PHORMA I: Fragmente oder die Verwandlung aus Strom, Körper, Scherben, Echo, Relief (zeitliche Operation, eigene Bühne)',
  'lab.beat' => 'Beat aus Bild: das Bild wird zu einem kurzen Beat mit Schlagzeug, Bass und Melodie, aus Farbe, Helligkeit und Komposition gelesen (Medienwechsel nach Klang)',
];
const FRAGE = 'In einem künstlerischen Labor wird ein Bild schrittweise durch Operationen verändert; jedes Ergebnis kann weitergeführt werden. Welche der folgenden Operationen eröffnet als nächster Schritt am ehesten eine Fortsetzung, die sich vom bisherigen Verlauf deutlich unterscheidet, statt ihn nur zu wiederholen?';

/** Dramaturgien und Merkmale (gleich wie DRAMATURGIEN und MERKMALE in fragen.js) */
const DRAMATURGIEN = [
  'vorschlag.puls' => 'Puls: sechs Varianten einer Feedback-Schleife, deren Zoom der Lautstärke folgt; harte Schnitte zwischen ihnen auf den Anschlägen des Klangs',
  'vorschlag.farbwelle' => 'Farbwelle: die Farben drehen sich mit der Lautstärke durch den Farbkreis, in acht Varianten; Überblendungen im Takt der Anschläge',
  'vorschlag.raster' => 'Vervielfältigung: das Bild wird im Raster wiederholt, die Grösse der Kopien folgt der Lautstärke; Schnitte im Takt der Anschläge',
  'vorschlag.zerfall' => 'Zerfall: das Bild zerfällt in Farbflächen und setzt sich in sechs Zuständen neu zusammen (The Fictory); ruhige Übergänge, bei denen die dunklen Stellen zuerst erscheinen',
  'vorschlag.steigerung' => 'Steigerung: drei Operationen nacheinander (Farbe, Wiederholung, Feedback), das Bild verwandelt sich schrittweise immer weiter; lange, ruhige Übergänge',
];
const MERKMALE = [
  'bild' => [
    'kontrast' => ['niedrig' => 'Kontrast niedrig', 'mittel' => 'Kontrast mittel', 'hoch' => 'Kontrast hoch'],
    'farbigkeit' => ['grau' => 'fast ohne Farbe', 'gedaempft' => 'gedämpfte Farben', 'bunt' => 'kräftige Farben'],
    'symmetrie' => ['symmetrisch' => 'nahezu spiegelgleich', 'asymmetrisch' => 'deutlich asymmetrisch'],
    'helligkeit' => ['dunkel' => 'eher dunkel', 'mittel' => 'mittlere Helligkeit', 'hell' => 'eher hell'],
  ],
  'klang' => [
    'dichte' => ['ruhig' => 'wenige Anschläge (weniger als einer je zwei Sekunden)', 'bewegt' => 'regelmässige Anschläge (etwa einer bis zwei je Sekunde)', 'dicht' => 'dichte Anschläge (mehr als zwei je Sekunde)'],
    'dynamik' => ['gleichmaessig' => 'die Lautstärke bleibt etwa gleich', 'anschwellend' => 'wird über die Zeit lauter', 'abschwellend' => 'wird über die Zeit leiser', 'wechselhaft' => 'die Lautstärke wechselt stark'],
  ],
];
const FRAGE_DRAMATURGIE = 'In einem künstlerischen Labor sollen ein Bild und ein Klang zu einer Animation von 30 Sekunden werden; der Klang ist die Tonspur. Gemessen wurden nur die genannten Merkmale. Bei welcher der folgenden Dramaturgien geht die Bewegung am ehesten aus diesem Bild und diesem Klang hervor, statt ihnen von aussen übergestülpt zu werden?';

const BILD_EFFEKTE = [
  'bild.feedback' => 'Feedback-Schleife: das Bild wird immer wieder auf sich selbst gelegt, gezoomt und gedreht, es entsteht ein Sog',
  'bild.wiederholung' => 'Wiederholung: das Bild vervielfacht sich im Raster, die Kopien werden grösser und kleiner',
  'bild.farbe' => 'Farbe: die Farben drehen sich durch den Farbkreis und werden kräftiger',
  'bild.glitch' => 'Glitch: Blöcke verrutschen, Zeilen springen, Farbkanäle trennen sich',
  'bild.verzerrung' => 'Verzerrung: das Bild wird verwirbelt, gewellt oder wie durch eine Linse gesehen',
  'bild.licht' => 'Licht: helle Stellen glühen auf und strahlen aus',
  'bild.raster' => 'Raster: das Bild wird zu Punkten und Linien wie im Druck',
  // die Linienbilder (seit Lab 0.1.36, nach den Plotter-Umwandlern von Makelangelo): lebendig, sie bewegen sich von selbst
  'bild.puls' => 'Pulslinien: parallele Linien schwingen, wo das Bild dunkel ist, höher und dichter, wie ein Plotter mit einem einzigen Puls',
  'bild.spirale' => 'Spirale: eine Linie läuft als Spirale aus der Mitte und schwingt im Dunkeln, die Schwingungen wandern',
  'bild.schraffur' => 'Schraffur: Lagen feiner Linien in verschiedenen Winkeln, im Dunkeln liegen alle übereinander, wie im Kupferstich',
  'bild.fluss' => 'Fliessfeld: feine Striche folgen den Kanten des Bildes und fliessen, im Dunkeln verdichten sie sich zu Tinte',
  'bild.punktieren' => 'Punktieren: das Bild wird aus gewürfelten Punkten gezeichnet, im Dunkeln dicht, die Punkte schimmern',
  'bild.glasfenster' => 'Glasfenster: Voronoi-Zellen in den Farben des Bildes, im Dunkeln klein, mit dunklen Fugen',
  'bild.teilung' => 'Teilung: das Bild wird zu Quadraten geviertelt, fein wo es dicht ist, grob im Hellen, jedes in seiner Farbe',
  'bild.truchet' => 'Truchet: Felder mit Viertelbögen, deren Richtung der Ton wählt, sie drehen sich einzeln',
  'bild.gewebe' => 'Gewebe: die Umrisse des Bildes werden zu Flächen aus feinen Linien, die der Ton bewegt, bei kräftigen Einsätzen neue Bilder (PHORMA)',
  'bild.irrfahrt' => 'Irrfahrt: ein Faden irrt durch einen Würfel aus Licht, quillt mit der Musik zu Rauch auf, bei Schlägen springt alles (PHORMA)',
  'bild.lichtwuerfel' => 'Lichtwürfel: ein Faden irrt in einem festen Würfel aus Licht, ruhiger als die Irrfahrt (PHORMA)',
  'bild.traube' => 'Traube: glänzende rote Perlen in einer Kugel aus Fäden, Schnitte im Takt, der Bass lässt sie glühen (PHORMA)',
  // PHORMA II (seit Lab 0.1.22, eine Operation mit Abläufen): die Grafikkarte rechnet jedes Bild aus der Zeit
  'bild.physarum' => 'Physarum: ein Schleimpilz wächst aus den markanten Stellen und findet die Formen des Bildes als Netz (PHORMA II)',
  'bild.tiefe' => 'Tiefe: ein Lichtscan tastet das Bild ab, es bekommt Relief und wird Raum (PHORMA II)',
  'bild.welle' => 'Wellenwanne: das Bild liegt unter Wasser, Dünung und Ringe brechen es, helle Linien glänzen (PHORMA II)',
  'bild.tuch' => 'Tuch: das Bild fällt als Seidentuch und legt sich glatt (PHORMA II)',
  'bild.druck' => 'Rasterdruck: das Bild wird zum Vierfarbendruck aus Punkten, die Platten rasten ein und bleiben versetzt (PHORMA II)',
  'bild.montage' => 'Montage: das Bild zerfällt in verschachtelte Rechtecke mit eigenen Ausschnitten, harte Schnitte im Takt (PHORMA II)',
  // PHORMA I (seit Lab 0.1.22, eine Operation mit Abläufen)
  'bild.fragmente' => 'Fragmente: Linien tasten das Bild ab, Dreiecke fliegen herein, Farben, das Foto rastet ein (PHORMA I)',
  'bild.strom' => 'Strom: Teilchen leuchten auf, ziehen zu Bändern und fliegen an ihren Platz (PHORMA I)',
  'bild.koerper' => 'Körper: drei Kristalle verschmelzen zu einem Glaskörper, der am Ende klar wird (PHORMA I)',
  'bild.scherben' => 'Scherben: das Bild bricht, die Scherben setzen sich neu zusammen (PHORMA I)',
  'bild.echo' => 'Echo: eine Rückkopplung zieht das Bild durch einen Tunnel, es baut sich aus Echos auf (PHORMA I)',
  'bild.relief' => 'Relief: Höhenlinien werden zu einem Gebirge aus dem Bild, das sich wieder flach legt (PHORMA I)',
  // The Fictory (seit Lab 0.1.22 wieder, lebendig: der Prozess läuft im Film von Zustand zu Zustand)
  'bild.zerfall' => 'Zerfall: das Bild zerfällt in Farbflächen und setzt sich in sechs Zuständen neu zusammen (The Fictory)',
];
const KLANG_EFFEKTE = [
  'klang.keine' => 'nichts: der Klang bleibt, wie er ist',
  'klang.schneller' => 'schneller: das Tempo steigt um ein Viertel, die Tonhöhe bleibt',
  'klang.langsamer' => 'langsamer: das Tempo sinkt um ein Fünftel, die Tonhöhe bleibt',
  'klang.tiefer' => 'tiefer: die Tonhöhe sinkt um eine Quarte, das Tempo bleibt',
  'klang.zerlegt' => 'zerlegt: der Klang wird an seinen Anschlägen geschnitten und neu geordnet, mit Wiederholungen und Umkehrungen',
  'klang.rhythmus' => 'neu rhythmisiert: die Schnitte des Klangs werden auf ein neues, euklidisches Raster gesetzt',
  'klang.koerner' => 'Körner: der Klang wird in kleine Körner zerstäubt und zu einer Fläche von 30 Sekunden gestreckt',
];
const AUFBAU = [
  'aufbau.kette' => 'Kette: jeder Abschnitt verwandelt das Ergebnis des vorigen weiter, das Bild entfernt sich immer mehr vom Anfang',
  'aufbau.faecher' => 'Fächer: jeder Abschnitt geht wieder vom Ausgangsbild aus, die Effekte stehen nebeneinander',
];
const FILM_UEBERGAENGE = [
  'film.schnitt' => 'harte Schnitte auf den Anschlägen des Klangs',
  'film.blende' => 'weiche Überblendungen im Takt der Anschläge',
  'film.schwelle' => 'Übergänge, bei denen die dunklen Stellen des nächsten Bildes zuerst erscheinen',
];
const ABSCHNITT_NAMEN = ['Anfang', 'Entfaltung', 'Verdichtung', 'Höhepunkt', 'Umbruch', 'Ausklang'];
const FRAGE_KOMPOSITION = 'In einem künstlerischen Labor stellt jev aus vielen Bild- und Klangeffekten eine Animation von 30 Sekunden aus einem Bild und einem Klang zusammen; der bearbeitete Klang ist die Tonspur. Gemessen wurden nur die genannten Merkmale. Die Zusammenstellung soll abwechslungsreich sein und aus diesem Bild und diesem Klang hervorgehen.';

/** die Fragen der Zusammenstellung, wie KOMPOSITION_FRAGEN in fragen.js */
function kompositionFragen(): array {
  $f = [
    'aufbau' => [AUFBAU, 'Wie sollen die Abschnitte aufeinander aufbauen?'],
    'uebergang' => [FILM_UEBERGAENGE, 'Welche Art von Übergang zwischen den Bildern passt?'],
    'klang1' => [KLANG_EFFEKTE, 'Welcher Klangeffekt soll zuerst auf den Klang wirken?'],
    'klang2' => [KLANG_EFFEKTE, 'Welcher Klangeffekt soll danach auf das Ergebnis wirken?'],
  ];
  $n = count(ABSCHNITT_NAMEN);
  foreach (ABSCHNITT_NAMEN as $i => $name) $f['bild' . ($i + 1)] = [BILD_EFFEKTE, 'Welcher Bildeffekt prägt Abschnitt ' . ($i + 1) . " von $n («" . $name . '», etwa Sekunde ' . ($i * 5) . ' bis ' . ($i * 5 + 5) . ')?'];
  return $f;
}

/** Beat aus Bild oder Video (gleich wie BEAT_MERKMALE, BEAT_FRAGEN und FRAGE_BEAT in fragen.js) */
const BEAT_MERKMALE = [
  'helligkeit' => ['dunkel' => 'eher dunkel', 'mittel' => 'mittlere Helligkeit', 'hell' => 'eher hell'],
  'kontrast' => ['niedrig' => 'Kontrast niedrig', 'mittel' => 'Kontrast mittel', 'hoch' => 'Kontrast hoch'],
  'farbigkeit' => ['grau' => 'fast ohne Farbe', 'gedaempft' => 'gedämpfte Farben', 'bunt' => 'kräftige Farben'],
  'farbton' => ['warm' => 'vorwiegend warme Farben (Rot, Orange, Gelb)', 'kalt' => 'vorwiegend kalte Farben (Grün, Blau, Violett)', 'neutral' => 'ohne vorherrschenden Farbton'],
  'detail' => ['glatt' => 'grosse, ruhige Flächen', 'mittel' => 'mittlere Feinheit', 'fein' => 'viele feine Einzelheiten und Kanten'],
  'schwerpunkt' => ['oben' => 'das Gewicht des Bildes liegt oben', 'mitte' => 'das Gewicht liegt in der Mitte', 'unten' => 'das Gewicht liegt unten'],
  'symmetrie' => ['symmetrisch' => 'nahezu spiegelgleich', 'asymmetrisch' => 'deutlich asymmetrisch'],
  'bewegung' => ['still' => 'ein einzelnes Bild, keine Bewegung', 'ruhig' => 'ein Video mit wenig Bewegung', 'bewegt' => 'ein Video mit deutlicher Bewegung', 'heftig' => 'ein Video mit heftiger Bewegung oder Schnitten'],
];
const BEAT_FRAGEN = [
  'tempo' => ['Welches Tempo passt?', [
    'langsam' => 'langsam, etwa 75 Schläge je Minute', 'mittel' => 'mittel, etwa 100 Schläge je Minute', 'schnell' => 'schnell, etwa 125 Schläge je Minute', 'rasend' => 'rasend, etwa 160 Schläge je Minute']],
  'groove' => ['Welcher Groove passt?', [
    'gerade' => 'gerade: Bassdrum auf jedem Viertel, Snare auf zwei und vier',
    'halftime' => 'Halftime: Bassdrum am Anfang, Snare nur auf drei, schwer und breit',
    'breakbeat' => 'Breakbeat: synkopierte Bassdrum, Snare auf zwei und vier mit leisen Zwischenschlägen',
    'euklidisch' => 'euklidisch: Schläge möglichst gleichmässig verteilt, ungerade Muster wie fünf aus sechzehn',
    'schleppend' => 'schleppend: Groove mit Swing, die Zwischenschläge kommen spät',
    'dnb' => 'Drum and Bass: 170 bis 176 Schläge je Minute, Bassdrum auf eins und kurz vor drei, Snare auf zwei und vier, dazwischen gebrochene Schläge']],
  'kit' => ['Welche Klänge soll das Schlagzeug haben?', [
    'trocken' => 'trocken: kurze, akustisch wirkende Trommeln', 'elektronisch' => 'elektronisch: lange, tiefe Bassdrum und Klatschen wie bei einer Drum-Machine',
    'metallisch' => 'metallisch: klirrende Becken und glockenartige Töne', 'weich' => 'weich: gedämpfte, runde Schläge ohne Härte']],
  'tonart' => ['Welche Tonart soll der Beat haben?', [
    'dur' => 'Dur: hell und offen', 'moll' => 'Moll: dunkel und ernst', 'dorisch' => 'dorisch: Moll mit einem hellen Ton, schwebend',
    'phrygisch' => 'phrygisch: dunkel und fremd, mit kleiner Sekunde', 'pentatonik' => 'pentatonisch: fünf Töne ohne Halbtöne, nichts reibt']],
  'bass' => ['Was soll der Bass tun?', [
    'keiner' => 'kein Bass', 'liegend' => 'liegend: lange Töne, je Takt einer', 'pulsierend' => 'pulsierend: Achtel auf dem Grundton, mit Oktavsprüngen', 'laufend' => 'laufend: der Bass geht in Schritten durch die Tonleiter',
    'reese' => 'Reese: tiefer, schwebender Bass aus zwei gegeneinander verstimmten Sägezähnen, wie im Drum and Bass']],
  'melodie' => ['Welche Melodie soll über dem Beat liegen?', [
    'keine' => 'keine Melodie', 'bild' => 'aus dem Bild gelesen: die hellste Stelle jeder Spalte gibt den Ton, von links nach rechts',
    'arpeggio' => 'Arpeggio: die Töne des Akkords auf und ab', 'glocken' => 'Glocken: wenige Töne auf den hellsten Punkten des Bildes']],
  'verlauf' => ['Wie soll sich der Beat über die Zeit entwickeln?', [
    'gleich' => 'gleich: alles spielt von Anfang an', 'steigend' => 'steigend: die Stimmen setzen nacheinander ein, es wird dichter',
    'abschwellend' => 'abschwellend: voll am Anfang, dann lichtet es sich', 'wellen' => 'in Wellen: dichter, wo sich das Video stark bewegt, sonst lichter',
    'wechselnd' => 'fein und wild im Wechsel: lichte, zarte Takte wechseln mit dichten, gebrochenen']],
  'flaeche' => ['Soll eine Klangfläche den Beat tragen?', [
    'keine' => 'keine Fläche', 'sphaere' => 'sphärisch: lange, schwebende Akkorde mit viel Raum', 'schimmer' => 'schimmernd: sphärisch und dazu hohe, glitzernde Töne']],
];
const FRAGE_BEAT = 'In einem künstlerischen Labor entsteht aus einem Bild oder einem Video ein kurzer Beat als Soundtrack. Gemessen wurden nur die genannten Merkmale. Der Beat soll aus diesem Bild hervorgehen, statt ihm von aussen übergestülpt zu werden.';

function antwort(array $daten, int $status = 200): void {
  http_response_code($status);
  header('Content-Type: application/json; charset=utf-8');
  header('Cache-Control: no-store');
  header('Expires: Thu, 01 Jan 1970 00:00:00 GMT');   // sonst setzt mod_expires (.htaccess) zehn Minuten Zwischenspeicher
  header('X-Content-Type-Options: nosniff');
  header('X-Robots-Tag: noindex');
  echo json_encode($daten, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
  exit;
}

function kurz(string $s, int $n): string { return function_exists('mb_substr') ? mb_substr($s, 0, $n) : substr($s, 0, $n); }

/** der Ordner mit dem Schlüssel, ausserhalb der Website: Heimatordner des Webhostings (…/www/ornament.cloud/alpha/lab/jev → fünf Ebenen höher) */
function geheimOrdner(): ?string {
  $kandidaten = [];
  if (PHP_SAPI === 'cli-server' && getenv('ORNAMENT_GEHEIM')) $kandidaten[] = (string) getenv('ORNAMENT_GEHEIM');   // nur für die Tests
  $kandidaten[] = dirname(__DIR__, 5) . '/ornament-geheim';
  if (getenv('HOME')) $kandidaten[] = getenv('HOME') . '/ornament-geheim';
  if (function_exists('posix_getpwuid') && function_exists('posix_geteuid')) { $u = posix_getpwuid(posix_geteuid()); if (!empty($u['dir'])) $kandidaten[] = $u['dir'] . '/ornament-geheim'; }
  foreach ($kandidaten as $k) if (@is_dir($k)) return $k;
  return null;
}

function schluessel(?string $ordner): ?string {
  if ($ordner === null) return null;
  $s = @file_get_contents($ordner . '/typesafe-schluessel');
  if ($s === false) return null;
  $s = trim($s);
  return ($s !== '' && strlen($s) < 400 && !preg_match('/\s/', $s)) ? $s : null;
}

/** Lage prüfen und bereinigen, wie labLage() in fragen.js */
function lage($roh): array {
  if (!is_array($roh) || ($roh !== [] && array_keys($roh) === range(0, count($roh) - 1))) throw new InvalidArgumentException('Lage fehlt');
  if (($roh['frage'] ?? null) === 'dramaturgie') return dramaturgieLage($roh);
  if (($roh['frage'] ?? null) === 'komposition') return kompositionLage($roh);
  if (($roh['frage'] ?? null) === 'beat') return beatLage($roh);
  $fremd = array_diff(array_keys($roh), ['verlauf', 'optionen']);
  if ($fremd) throw new InvalidArgumentException('unbekannte Felder: ' . implode(', ', $fremd));
  $verlauf = (isset($roh['verlauf']) && is_array($roh['verlauf'])) ? array_slice(array_values($roh['verlauf']), -8) : [];
  foreach ($verlauf as $k) if (!is_string($k) || !preg_match('/^[a-z]+\.[a-z0-9-]+\z/', $k)) throw new InvalidArgumentException('Verlauf enthält ungültige Kennungen');
  $optionen = [];
  foreach ((isset($roh['optionen']) && is_array($roh['optionen'])) ? array_values($roh['optionen']) : [] as $k) {
    if (!is_string($k) || !isset(KATALOG[$k])) throw new InvalidArgumentException('Optionen müssen 2–6 Kennungen aus dem Katalog sein');
    if (!in_array($k, $optionen, true)) $optionen[] = $k;
  }
  if (count($optionen) < 2 || count($optionen) > 6) throw new InvalidArgumentException('Optionen müssen 2–6 Kennungen aus dem Katalog sein');
  return ['verlauf' => $verlauf, 'optionen' => $optionen];
}

function kompositionLage(array $roh): array {
  $fremd = array_diff(array_keys($roh), ['frage', 'merkmale']);
  if ($fremd) throw new InvalidArgumentException('unbekannte Felder: ' . implode(', ', $fremd));
  return ['frage' => 'komposition', 'merkmale' => merkmaleLage($roh['merkmale'] ?? null)];
}

function beatLage(array $roh): array {
  $fremd = array_diff(array_keys($roh), ['frage', 'merkmale']);
  if ($fremd) throw new InvalidArgumentException('unbekannte Felder: ' . implode(', ', $fremd));
  $m = $roh['merkmale'] ?? null;
  if (!is_array($m) || ($m !== [] && array_keys($m) === range(0, count($m) - 1))) throw new InvalidArgumentException('Merkmale fehlen');
  $fremd = array_diff(array_keys($m), array_keys(BEAT_MERKMALE));
  if ($fremd) throw new InvalidArgumentException('unbekannte Merkmale: ' . implode(', ', $fremd));
  $merkmale = [];
  foreach (BEAT_MERKMALE as $k => $werte) {
    if (!isset($m[$k]) || !is_string($m[$k]) || !array_key_exists($m[$k], $werte)) throw new InvalidArgumentException("Merkmal $k fehlt oder hat keine gültige Stufe");
    $merkmale[$k] = $m[$k];
  }
  return ['frage' => 'beat', 'merkmale' => $merkmale];
}

function dramaturgieLage(array $roh): array {
  $fremd = array_diff(array_keys($roh), ['frage', 'merkmale', 'optionen']);
  if ($fremd) throw new InvalidArgumentException('unbekannte Felder: ' . implode(', ', $fremd));
  $merkmale = merkmaleLage($roh['merkmale'] ?? null);
  $optionen = [];
  foreach ((isset($roh['optionen']) && is_array($roh['optionen'])) ? array_values($roh['optionen']) : [] as $k) {
    if (!is_string($k) || !isset(DRAMATURGIEN[$k])) throw new InvalidArgumentException('Optionen müssen 2–6 Dramaturgien aus dem Katalog sein');
    if (!in_array($k, $optionen, true)) $optionen[] = $k;
  }
  if (count($optionen) < 2 || count($optionen) > 6) throw new InvalidArgumentException('Optionen müssen 2–6 Dramaturgien aus dem Katalog sein');
  return ['frage' => 'dramaturgie', 'merkmale' => $merkmale, 'optionen' => $optionen];
}

function merkmaleLage($m): array {
  if (!is_array($m) || ($m !== [] && array_keys($m) === range(0, count($m) - 1))) throw new InvalidArgumentException('Merkmale fehlen');
  $stufen = MERKMALE['bild'] + MERKMALE['klang'];
  $fremd = array_diff(array_keys($m), array_keys($stufen));
  if ($fremd) throw new InvalidArgumentException('unbekannte Merkmale: ' . implode(', ', $fremd));
  $merkmale = [];
  foreach ($stufen as $k => $werte) {
    if (!isset($m[$k]) || !is_string($m[$k]) || !array_key_exists($m[$k], $werte)) throw new InvalidArgumentException("Merkmal $k fehlt oder hat keine gültige Stufe");
    $merkmale[$k] = $m[$k];
  }
  return $merkmale;
}

/** feste Frage an jev, wie labFrage() in fragen.js */
function frage(array $lage): array {
  $zeile = function (string $gruppe) use ($lage): string {
    $teile = [];
    foreach (MERKMALE[$gruppe] as $k => $werte) $teile[] = $werte[$lage['merkmale'][$k]];
    return implode('; ', $teile);
  };
  if (($lage['frage'] ?? null) === 'beat') {
    $teile = [];
    foreach (BEAT_MERKMALE as $k => $werte) $teile[] = $werte[$lage['merkmale'][$k]];
    $fragen = [];
    foreach (BEAT_FRAGEN as $k => [$text, $katalog]) $fragen[$k] = ['type' => 'choice', 'instructions' => FRAGE_BEAT . ' ' . $text, 'criteria' => $katalog];
    return ['zustand' => ['labor' => 'ORNAMENT LAB, Beat aus Bild oder Video', 'bild' => implode('; ', $teile)], 'fragen' => $fragen];
  }
  if (($lage['frage'] ?? null) === 'komposition') {
    $fragen = [];
    foreach (kompositionFragen() as $k => [$katalog, $text]) $fragen[$k] = ['type' => 'choice', 'instructions' => FRAGE_KOMPOSITION . ' ' . $text, 'criteria' => $katalog];
    return ['zustand' => ['labor' => 'ORNAMENT LAB, Animation aus Bild und Klang, von jev zusammengestellt', 'bild' => $zeile('bild'), 'klang' => $zeile('klang')], 'fragen' => $fragen];
  }
  if (($lage['frage'] ?? null) === 'dramaturgie') {
    $kriterien = [];
    foreach ($lage['optionen'] as $k) $kriterien[$k] = DRAMATURGIEN[$k];
    return [
      'zustand' => ['labor' => 'ORNAMENT LAB, Animation aus Bild und Klang', 'bild' => $zeile('bild'), 'klang' => $zeile('klang')],
      'fragen' => ['wahl' => ['type' => 'choice', 'instructions' => FRAGE_DRAMATURGIE, 'criteria' => $kriterien]],
    ];
  }
  $zeilen = [];
  foreach ($lage['verlauf'] as $i => $k) $zeilen[] = ($i + 1) . '. ' . (KATALOG[$k] ?? $k);
  $kriterien = [];
  foreach ($lage['optionen'] as $k) $kriterien[$k] = KATALOG[$k];
  return [
    'zustand' => ['labor' => 'ORNAMENT LAB, experimentelle Bildoperationen', 'bisherigerVerlauf' => $zeilen ? implode("\n", $zeilen) : 'noch keine Operation; nur das Ausgangsbild'],
    'fragen' => ['wahl' => ['type' => 'choice', 'instructions' => FRAGE, 'criteria' => $kriterien]],
  ];
}

/** Zähler unter Sperre lesen, ändern, schreiben; $fn gibt null (erlaubt) oder eine Fehlermeldung zurück */
function zaehlen(string $ordner, callable $fn): ?array {
  @mkdir($ordner . '/jev-lab', 0700);
  $h = @fopen($ordner . '/jev-lab/zaehler.json', 'c+');
  if (!$h) return ['Zähler nicht verfügbar', 503];
  flock($h, LOCK_EX);
  $z = json_decode((string) stream_get_contents($h), true);
  if (!is_array($z)) $z = [];
  $tag = gmdate('Y-m-d'); $monat = gmdate('Y-m');
  if (($z['tag'] ?? '') !== $tag) { $z['tag'] = $tag; $z['je_tag'] = 0; $z['adressen'] = []; }
  if (($z['monat'] ?? '') !== $monat) { $z['monat'] = $monat; $z['je_monat'] = 0; }
  $fehler = $fn($z);
  ftruncate($h, 0); rewind($h); fwrite($h, json_encode($z)); fflush($h);
  flock($h, LOCK_UN); fclose($h);
  return $fehler;
}

function grenzen(string $ordner): array {
  $g = GRENZEN;
  $c = @json_decode((string) @file_get_contents($ordner . '/jev-lab.json'), true);   // optional, um die Grenzen zu senken (oder für die Tests)
  if (is_array($c)) foreach ($g as $k => $v) if (isset($c[$k]) && is_int($c[$k]) && $c[$k] >= 0) $g[$k] = $c[$k];
  if (is_array($c) && isset($c['modell']) && is_string($c['modell']) && preg_match('/^[a-z0-9.\-]{1,40}$/', $c['modell'])) $g['modell'] = $c['modell'];
  if (is_array($c) && !empty($c['aus'])) $g['aus'] = true;
  return $g;
}

$ordner = geheimOrdner();
$key = schluessel($ordner);
$methode = $_SERVER['REQUEST_METHOD'] ?? 'GET';

if ($methode === 'GET' || $methode === 'HEAD') {
  if ($key === null) antwort(['bereit' => false, 'grund' => 'Kein Schlüssel hinterlegt']);
  if (!function_exists('curl_init')) antwort(['bereit' => false, 'grund' => 'PHP ohne curl']);
  if (!empty(grenzen($ordner)['aus'])) antwort(['bereit' => false, 'grund' => 'Ausgeschaltet']);
  antwort(['bereit' => true]);
}
if ($methode !== 'POST') { header('Allow: GET, POST'); antwort(['fehler' => 'nur GET oder POST'], 405); }

$herkunft = $_SERVER['HTTP_ORIGIN'] ?? '';
$erlaubt = [HERKUNFT];
if (PHP_SAPI === 'cli-server' && getenv('ORNAMENT_HERKUNFT')) $erlaubt[] = (string) getenv('ORNAMENT_HERKUNFT');   // nur für die Tests
if (!in_array($herkunft, $erlaubt, true)) antwort(['fehler' => 'Herkunft nicht erlaubt'], 403);
if (isset($_SERVER['HTTP_SEC_FETCH_SITE']) && $_SERVER['HTTP_SEC_FETCH_SITE'] !== 'same-origin') antwort(['fehler' => 'Herkunft nicht erlaubt'], 403);
if (strncasecmp($_SERVER['CONTENT_TYPE'] ?? '', 'application/json', 16) !== 0) antwort(['fehler' => 'nur JSON'], 415);
if ((int) ($_SERVER['CONTENT_LENGTH'] ?? 0) > MAX_BYTES) antwort(['fehler' => 'zu gross'], 413);
$text = (string) file_get_contents('php://input', false, null, 0, MAX_BYTES + 1);
if (strlen($text) > MAX_BYTES) antwort(['fehler' => 'zu gross'], 413);
if ($key === null) antwort(['fehler' => 'jev live ist nicht eingerichtet'], 503);
$g = grenzen($ordner);
if (!empty($g['aus'])) antwort(['fehler' => 'jev live ist ausgeschaltet'], 503);

try { $l = lage(json_decode($text, true, 8, JSON_THROW_ON_ERROR)); }
catch (Throwable $e) { antwort(['fehler' => kurz($e instanceof JsonException ? 'kein gültiges JSON' : $e->getMessage(), 120)], 400); }

// je Adresse begrenzen (auch Antworten aus dem Zwischenspeicher)
$adresse = hash_hmac('sha256', (string) ($_SERVER['REMOTE_ADDR'] ?? ''), $key);
$f = zaehlen($ordner, function (array &$z) use ($adresse, $g) {
  $a = $z['adressen'][$adresse] ?? ['minute' => 0, 'n_minute' => 0, 'n_tag' => 0];
  $jetzt = intdiv(time(), 60);
  if ($a['minute'] !== $jetzt) { $a['minute'] = $jetzt; $a['n_minute'] = 0; }
  if ($a['n_minute'] >= $g['je_minute'] || $a['n_tag'] >= $g['je_tag_adresse']) return ['zu viele Anfragen, bitte später wieder', 429];
  $a['n_minute']++; $a['n_tag']++;
  $z['adressen'][$adresse] = $a;
  return null;
});
if ($f) antwort(['fehler' => $f[0]], $f[1]);

// Zwischenspeicher: gleiche Lage, gleiche Antwort, 30 Tage
$modell = $g['modell'] ?? 'jev-latest';
$speicher = $ordner . '/jev-lab/zwischen';
@mkdir($speicher, 0700, true);
$datei = $speicher . '/' . hash('sha256', json_encode([$modell, $l])) . '.json';
if (is_file($datei) && filemtime($datei) > time() - HALTBAR) {
  $alt = json_decode((string) file_get_contents($datei), true);
  if (is_array($alt) && (isset($alt['wahrscheinlichkeiten']) || isset($alt['antworten']))) antwort($alt + ['zwischengespeichert' => true]);
}

// Kostengrenze für alle zusammen; der Aufruf wird vorher gezählt, damit gleichzeitige Fragen sie nicht überschreiten
$f = zaehlen($ordner, function (array &$z) use ($g) {
  if (($z['je_tag'] ?? 0) >= $g['je_tag'] || ($z['je_monat'] ?? 0) >= $g['je_monat']) return ['Die Tagesgrenze für jev ist erreicht. Manuelle Wahl und Regeln bleiben verfügbar.', 429];
  $z['je_tag'] = ($z['je_tag'] ?? 0) + 1; $z['je_monat'] = ($z['je_monat'] ?? 0) + 1;
  return null;
});
if ($f) antwort(['fehler' => $f[0]], $f[1]);

$fr = frage($l);
$ziel = (PHP_SAPI === 'cli-server' && getenv('ORNAMENT_JEV_URL')) ? (string) getenv('ORNAMENT_JEV_URL') : JEV_URL;   // nur für die Tests
$c = curl_init($ziel);
curl_setopt_array($c, [
  CURLOPT_POST => true,
  CURLOPT_HTTPHEADER => ['Content-Type: application/json', 'Authorization: Bearer ' . $key],
  CURLOPT_POSTFIELDS => json_encode(['model' => $modell, 'state' => $fr['zustand'], 'questions' => $fr['fragen']], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES),
  CURLOPT_RETURNTRANSFER => true,
  CURLOPT_CONNECTTIMEOUT => 4,
  CURLOPT_TIMEOUT => in_array($l['frage'] ?? null, ['komposition', 'beat'], true) ? 25 : 12,   // zehn (acht) Fragen auf einmal brauchen länger
  CURLOPT_FOLLOWLOCATION => false,
  CURLOPT_PROTOCOLS => CURLPROTO_HTTPS | CURLPROTO_HTTP,
]);
$roh = curl_exec($c);
$status = (int) curl_getinfo($c, CURLINFO_HTTP_CODE);
curl_close($c);
if ($roh === false) antwort(['fehler' => 'jev nicht erreichbar'], 502);
if ($status === 401 || $status === 403) antwort(['fehler' => 'jev hat den Schlüssel abgelehnt'], 502);
if ($status === 402 || $status === 429) antwort(['fehler' => "jev: Kontingent oder Guthaben erschöpft (HTTP $status)"], 502);
if ($status < 200 || $status >= 300) antwort(['fehler' => "jev: HTTP $status"], 502);
$j = json_decode((string) $roh, true);
/** die Wahrscheinlichkeiten einer Frage, nur für ihre Optionen, auf 0…1 begrenzt; null, wenn jev sie nicht beantwortet hat */
$lies = function (string $frage, array $optionen) use ($j): ?array {
  $p = $j['answers'][$frage]['probabilities'] ?? null;
  if (!is_array($p)) return null;
  $w = [];
  foreach ($optionen as $o) $w[$o] = max(0.0, min(1.0, (float) (is_numeric($p[$o] ?? null) ? $p[$o] : 0)));
  return $w;
};
$modell = is_string($j['model'] ?? null) ? kurz($j['model'], 60) : 'jev';
if (in_array($l['frage'] ?? null, ['komposition', 'beat'], true)) {
  $antworten = [];
  foreach ($fr['fragen'] as $k => $q) { $w = $lies($k, array_keys($q['criteria'])); if ($w === null) antwort(['fehler' => 'jev: unerwartete Antwort'], 502); $antworten[$k] = $w; }
  $daten = ['antworten' => $antworten, 'modell' => $modell];
} else {
  $w = $lies('wahl', $l['optionen']);
  if ($w === null) antwort(['fehler' => 'jev: unerwartete Antwort'], 502);
  $daten = ['wahrscheinlichkeiten' => $w, 'modell' => $modell];
}
@file_put_contents($datei, json_encode($daten, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES), LOCK_EX);
antwort($daten + ['zwischengespeichert' => false]);
