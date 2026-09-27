# ORMA – erste Fassung (0.1.0)

**ORMA** · *Nebeneinander, Nacheinander* · Zehn Minuten zu zweit. Zwei Sichtweisen. Ein neuer Gedanke.

ORMA ist ein kostenloses Kunst- und Denkspiel für zwei Personen an einem Gerät. Es baut auf
«Nebeneinander, Nacheinander» auf und steht als eigenständige zweite App neben ORNA. Es gibt keine
Anmeldung, keine Bezahlfunktion, keine Werbung, keine Cloud, keine Zählung und keine KI-Aufrufe.
Alles bleibt auf dem Gerät.

Stand: 27. September 2026. Die App ist **nicht veröffentlicht**. Zum Ausprobieren liegt sie als Alpha-Version auf
der Website: <https://hansnoed-ui.github.io/ornament-cloud/alpha/orma/>. Die Übersicht aller Alpha-Versionen
steht unter <https://hansnoed-ui.github.io/ornament-cloud/alpha/>. Der Alpha-Bereich ist öffentlich erreichbar,
aber von keiner Seite verlinkt, nicht in der Sitemap und für Suchmaschinen gesperrt. Wer die Adresse kennt,
kann ORMA öffnen.

## Vorschau und Produktionsbuild

```sh
# Produktionsbuild: src/orma/app + src/orma/redaktion/pilot.json → src/orma/dist/
node --experimental-strip-types tools/build-orma.ts

# Vorschau: ORMA unter /orma/, daneben die Website mit ORNA unter /
node tools/serve-orma.mjs            # → http://localhost:8766/orma/
```

- Die Vorschau zeigt immer den Build. Nach jeder Änderung in `src/orma/` muss der Build neu laufen.
- Die Ausgabe `src/orma/dist/` wird nicht eingecheckt (`.gitignore`).
- Die Ausgabe ist in sich geschlossen und nutzt nur relative Pfade. Sie kann später unter jedem Ordner
  der Website liegen, zum Beispiel `/ornament-cloud/orma/`.

**Alpha-Version aktualisieren** (nach jeder Änderung, die auf der Website ankommen soll):

```sh
node --experimental-strip-types tools/build-orma.ts --alpha   # → alpha/orma/ (eingecheckt)
```

Ein Test meldet, wenn `alpha/orma/` nicht mehr dem aktuellen Stand entspricht.

**Tests**

```sh
node --experimental-strip-types --no-warnings --test tests/orma.test.mjs   # Unit-Tests
NODE_PATH=$(npm root -g) node tests/orma.e2e.mjs                           # Browser-Tests (baut selbst)
```

**App-Symbole neu erzeugen** (nur bei geändertem Motiv): `NODE_PATH=$(npm root -g) node tools/orma-icons.mjs`

## Installieren und offline testen

1. Build erzeugen und Vorschau starten (siehe oben).
2. Am Computer in Chrome oder Edge `http://localhost:8766/orma/` öffnen.
   - Installieren: Browsermenü → «ORMA installieren», oder das Symbol in der Adresszeile.
   - `localhost` gilt als sichere Adresse, deshalb funktioniert der Service Worker dort.
3. Offline testen: In den Entwicklertools unter «Application → Service Workers» prüfen, dass `sw.js`
   aktiv ist. Dann unter «Network» auf «Offline» stellen und die Seite neu laden. ORMA startet trotzdem.
   Eine ganze Runde, Behalten, Wiederöffnen und Export gehen dann ohne Netz.
4. Am Smartphone über die Alpha-Adresse (https, siehe oben).
   - Android/Chrome: Menü → «App installieren».
   - iPhone/Safari: «Teilen» → «Zum Home-Bildschirm».
   - Danach Flugmodus einschalten und ORMA vom Home-Bildschirm öffnen.

## Ablauf

1. **Start:**
   - «Zu zweit beginnen»;
   - «Runde fortsetzen», falls eine unterbrochene Runde da ist;
   - «Unsere Gedanken»;
   - aufklappbare Hilfe «So geht eine Runde».
2. **Beginnen:** Vornamen sind freiwillig; voreingestellt sind «Person A» und «Person B».
3. **Drehen:** zwei gegenläufige Ringe mit je zwölf Plätzen, aussen die Künstler:innen, innen die
   Theoretiker:innen, mit denselben Zeichen wie in ORNA.
   - Zuerst wird ein ganzer Datensatz gezogen, erst dann fahren die Ringe dorthin.
   - Die Geste (Tippen oder Wischen) bestimmt nur Richtung, Umdrehungen und Dauer.
   - Die Animation lässt sich überspringen. Bei reduzierter Bewegung ist sie kurz und ohne Umdrehungen.
4. **Gemeinsam lesen:**
   - die Paarung;
   - der Einstieg, als Hinführung der ORMA-Redaktion gekennzeichnet;
   - die Originalfrage;
   - der Originaltext, aufklappbar und mit Nummer der Konstellation.
5. **Auftrag wählen:** «Ein Beispiel finden», «Einen Einwand finden» oder «Etwas daraus machen».
   Jeder Auftrag ist konkret für diese Paarung geschrieben und als Spielauftrag gekennzeichnet.
6. **Getrennt antworten:**
   - Person A notiert einen Gedanken und übergibt dann über einen neutralen Zwischenbildschirm.
   - Danach antwortet Person B, ohne die erste Antwort zu sehen. Sie steht auch nicht im Dokument.
   - «Ich antworte mündlich» ist jederzeit möglich; es wird nichts aufgenommen.
7. **Aufdecken:** Zuerst kommt eine Schwelle («Jetzt gemeinsam aufdecken»). Dann stehen beide Antworten
   untereinander, auf breiten Bildschirmen nebeneinander, mit der Frage «Was hast du anders gesehen?».
   Es gibt keine Wertung.
8. **Weiterdenken:**
   - Beide können eine Ergänzung schreiben.
   - Danach halten sie einen gemeinsamen neuen Gedanken fest, zwei Positionen, oder nichts.
   - Die ersten Antworten bleiben unverändert erhalten.
9. **Abschliessen:** Die Ergebniskarte bietet «Im Gedankenbuch behalten», «Karte exportieren»,
   «Noch eine Runde» und «Runde beenden».

Zehn Minuten sind eine Orientierung; es gibt keine Uhr, keine Punkte, keine Ranglisten und keine Streaks.

## Die zwölf Pilot-Konstellationen

Auswahl nach drei Kriterien:
- konkreter Werkbezug im Originaltext;
- eine Frage, die ohne Vorwissen verständlich ist;
- verschiedene gedankliche Zugänge (Zeit, Körper, Erinnerung, Regel, Blick, Raum, Material, Öffentlichkeit).

Zwölf verschiedene Künstler:innen (sechs Frauen, sechs Männer) und zwölf verschiedene Theoretiker:innen,
damit sich die Auswahl nicht auf wenige Personen konzentriert. Die Nummern sind die redaktionellen
Nummern des Bestands (326er-Fassung).

| Nr | Paarung | Originalfrage | Zugang |
|---|---|---|---|
| 125 | Eva Hesse × Susan Leigh Star | Wer hält ein alterndes Werk zusammen? | Material, Pflege |
| 199 | Tehching Hsieh × Claude Shannon | Wie viel Leben passt in einen Zeitstempel? | Zeit, Körper |
| 262 | Dan Graham × Donna Haraway | Gibt es im Spiegel einen neutralen Standpunkt? | Blick, Standort |
| 113 | Felix Gonzalez-Torres × Judith Butler | Wie viel Veränderung verträgt dieselbe Identität? | Identität, Wiederholung |
| 156 | Rebecca Horn × Wendy Hui Kyong Chun | Wann wird Technik zur Gewohnheit? | Technik, Gewohnheit |
| 104 | Marina Abramović × Lucy Suchman | Wann wird Publikum zum Teil der Handlung? | Handlung, Publikum |
| 47 | Mona Hatoum × Hannah Arendt | Was macht einen Raum gemeinsam, wenn die Menschen darin nicht unter denselben Bedingungen erscheinen können? | Öffentlichkeit, Raum |
| 123 | Louise Bourgeois × Henri Bergson | Wie verändert Gegenwart unsere Erinnerung? | Erinnerung |
| 112 | On Kawara × Elena Esposito | Wann wird ein zukünftiges Datum Gegenwart? | Zukunft, Datum |
| 118 | Doris Salcedo × Jacques Derrida | Wie kann eine Spur Abwesenheit zeigen? | Spur, Verlust |
| 25 | Sol LeWitt × George Spencer-Brown | Wo liegt die Form: in der Regel oder in ihrer Ausführung? | Regel, Ausführung |
| 7 | Donald Judd × Michel Serres | Ist Nähe eine Frage des Abstands oder des Weges? | Raum, Weg |

**Wo die Texte liegen**
- Auswahl und neue Texte: `src/orma/redaktion/pilot.json`. Die Datei verweist nur über die ID auf den
  Bestand und enthält keine Originaltexte.
- Paarung, Originaltext und Originalfrage kommen beim Build wörtlich aus
  `src/doppelspalt/src/data/constellations.ts`. Ein Test prüft, dass sie wörtlich übereinstimmen.
- Einstieg und Aufträge sind Ergänzungen der ORMA-Redaktion, geschrieben mit Claude Code. Sie sind
  keine Zitate und keine Äusserungen der genannten Personen und haben den Status **Entwurf**.

## Neue Dateien

| Datei | Zweck |
|---|---|
| `src/orma/app/index.html`, `orma.css` | Seite und eigene Gestaltung (keine Abhängigkeit von `styles.css`/`rad.css`) |
| `src/orma/app/js/app.js` | Spielablauf, Ansichten, Gedankenbuch, Export-Dialog |
| `src/orma/app/js/draw.js` | Ziehung (Gleichverteilung, Rejection Sampling, keine unmittelbare Wiederholung) |
| `src/orma/app/js/store.js` | Entwurf, Gedankenbuch, Sicherung und Import (Prüfung, kein Überschreiben) |
| `src/orma/app/js/card.js` | Ergebniskarte als PNG (Layout ohne Browser prüfbar, wächst mit dem Text) |
| `src/orma/app/js/wheel.js` | zwei gegenläufige Ringe mit je zwölf Plätzen, Geste nur für den Weg |
| `src/orma/app/js/symbols.js` | Abschrift der Zeichen-Grammatik aus ORNA (Test prüft Gleichheit) |
| `src/orma/app/manifest.webmanifest`, `sw.js`, `icons/` | Installation und Offline-Betrieb, eigenes Symbol |
| `src/orma/redaktion/pilot.json` | Auswahl, Einstiege und Spielaufträge |
| `src/orma/orma.json` | Name und Version der App |
| `tools/build-orma.ts` | Produktionsbuild, prüft die Redaktionsdatei, setzt Version und Dateiliste |
| `tools/serve-orma.mjs` | Vorschau-Server ohne Abhängigkeiten |
| `tools/orma-icons.mjs` | App-Symbole (zwei Ringe, Schnittpunkt als Akzent) |
| `tests/orma.test.mjs`, `tests/orma.e2e.mjs` | Unit- und Browser-Tests |

**Geänderte gemeinsame Dateien**
- `.gitignore` ist neu und schliesst die Build-Ausgabe aus.
- `REGELN.md` hat den neuen Abschnitt 14 (von dir freigegeben).
- `README.md` hat einen Hinweis auf diese Datei.
- Keine ORNA-Datei wurde geändert; ein Test prüft das gegen `main`.

## Trennung von ORNA

| | ORNA | ORMA |
|---|---|---|
| Ordner (Quelle) | `portfolio/nebeneinander-nacheinander/` | `src/orma/app/` |
| Build | `tools/build-app.ts` (Dateiliste im SW) | `tools/build-orma.ts` → `src/orma/dist/` |
| Manifest `id` | `./` | `orma` |
| `start_url` / `scope` | `app/` im Werkordner | `./` im ORMA-Ordner |
| Service Worker | `…/nebeneinander-nacheinander/sw.js` | `orma/sw.js` (Geltungsbereich nur der ORMA-Ordner) |
| Cache-Namen | `nn-<Version>`, räumt nur `nn-` auf | `orma-<Version>`, räumt nur `orma-` auf |
| Speicher | `sessionStorage` «orna-intro» | `localStorage` nur mit Präfix `orma:` |
| Symbol | leeres bzw. volles Rad | zwei sich überschneidende Ringe mit Akzentpunkt |

Beide laufen auf derselben Adresse nebeneinander. «Alle ORMA-Einträge löschen» entfernt nur
`orma:v1:buch`, und ORMAs Service Worker räumt nur eigene Caches auf. Ein Browser-Test prüft genau das
mit ORNA und ORMA im selben Browser.

## Ausgeführte Prüfungen (27. September 2026)

Alle Prüfungen liefen in Chromium (Playwright) am Linux-Rechner, mobil als «Pixel 7» und «iPhone 13»
nachgebildet. Es gab **keine** Prüfung auf echten Geräten.

- **Unit-Tests `tests/orma.test.mjs`: 18/18 bestanden.**
  - Ziehung: Rejection Sampling. Gleichverteilung erste Ziehung und nach einer Konstellation
    (je 22 000–24 000 Ziehungen). Nie dieselbe unmittelbar wieder, nur freigegebene IDs.
  - Pilotdaten: Texte, Fragen und IDs wörtlich wie im Bestand. Zwölf verschiedene Personen je Ring.
    Einstieg 40–70 Wörter, kein «ß» in eigenen Texten. Zeichen wie in ORNA.
  - Speicher: Entwurf übersteht Schliessen. Beschädigte Daten führen zu einer Meldung und werden
    aufbewahrt. «Alle löschen» berührt nur das ORMA-Gedankenbuch. Import prüft, überschreibt nichts
    und behandelt Eingaben als Text.
  - Karte: ohne Auswahl nur Paarung und Frage, Namen nur auf Wunsch. Lange Texte und überlange Wörter
    werden umbrochen, die Karte wird höher, der Fuss überlappt nie.
  - Build: eigener Cache, eigene Kennung, relative Pfade, Dateiliste vollständig. ORNA-Dateien
    unverändert gegenüber `main`.
  - Alpha: `alpha/orma/` entspricht dem aktuellen Build. Keine Seite ausserhalb von `alpha/` verlinkt
    den Bereich; er steht nicht in der Sitemap und ist mit `noindex` gesperrt.
- **Browser-Tests `tests/orma.e2e.mjs`: 11/11 bestanden (die ersten zehn in sechs aufeinanderfolgenden Läufen).**
  - ganze Runde am Smartphone (Tippen aufs Rad, Überspringen, Originaltext, Auftrag). Die erste Antwort
    steht weder beim Übergeben noch bei B im Dokument. Mündliche Antwort, Aufdecken, Weiterdenken,
    Ergebniskarte;
  - Tastatur von Start bis Auftrag, sichtbarer Fokus, Eingabeschrift ≥ 16 px;
  - nachgebildete Bildschirmtastatur (412 × 420): Feld und Knopf erreichbar, kein waagrechtes Scrollen,
    Knöpfe ≥ 48 px;
  - Fortsetzen nach Neuladen, auch mitten in B (zuerst neutrale Übergabe). Kein Verlust zwischen den
    Schritten. Verwerfen nur nach Bestätigung;
  - 26 Ziehungen in der App: alle aus den zwölf, keine unmittelbare Wiederholung, auch über
    «Noch eine Runde»;
  - Gedankenbuch: Behalten, Öffnen, Favorit, einzeln Löschen, Sicherung herunterladen. Alles löschen
    mit Abbrechen und Bestätigen. Import zurück; ein zweiter Import überschreibt nichts; eine kaputte
    Datei ergibt eine Meldung;
  - beschädigter lokaler Speicher: Meldung, App nutzbar, alter Inhalt aufbewahrt, HTML in Antworten
    bleibt Text;
  - Export: Vorschau vor dem Speichern. Ohne Auswahl 1080 × 1350. Mit langen Antworten höher als
    2500 px. Das gespeicherte PNG hat die angezeigte Höhe;
  - offline nach Einrichtung (Chromium-Offlinemodus): Start, ganze Runde, Behalten, Wiederöffnen
    und Export;
  - ORNA und ORMA im selben Browser: zwei Service Worker mit getrennten Geltungsbereichen, beide
    Caches vorhanden. ORMA «Alle löschen» lässt ORNA-Cache und fremde Schlüssel stehen; ORNA läuft
    danach weiter;
  - Alpha: Die Übersicht führt zu ORMA; `alpha/orma/` läuft unter dem Website-Pfad mit eigenem Service
    Worker (Geltungsbereich `/alpha/orma/`).
- **ORNA-Tests unverändert grün:**
  - `tests/doppelspalt.test.mjs` 26/26;
  - `tests/doppelspalt.e2e.mjs` 32/32.

## Offene Punkte

**Redaktion (brauchen deine Durchsicht)**
1. Alle zwölf Einstiege und 36 Spielaufträge sind Entwürfe (`"status": "entwurf"`) und warten auf deine
   Freigabe. Danach `status` auf `"freigegeben"` setzen und `inhaltsversion` hochzählen.
2. Der Einstieg zu Rebecca Horn × Wendy Hui Kyong Chun endet mit einem eigenen Satz, der deutet
   und nicht mehr nur verdichtet: «Was sonst unbemerkt bleibt, wird hier zur Aufgabe.» Bitte bestätigen
   oder streichen.
3. «Cells» (Louise Bourgeois) steht wie im Originaltext ohne Erklärung. Offen ist, ob Einsteiger:innen
   hier eine kurze Erläuterung brauchen und woraus sie belegt wäre.
4. Der Beispiel-Auftrag zu Eva Hesse × Susan Leigh Star ist wörtlich das Beispiel aus deinem Auftrag.
5. **Belege:** Der Bestand enthält pro Konstellation keine Quellen oder Belege. Der verlangte
   aufklappbare «Zugang zu vorhandenen Belegen» zeigt darum nur den Originaltext und die Nummer.
   Sollen Belege dazukommen, braucht es eine redaktionelle Quelle dafür.
6. Der Herkunftshinweis auf der Karte lautet
   «hansnoed-ui.github.io/ornament-cloud · Nebeneinander, Nacheinander». Das ist die bestehende
   Website-Adresse; eine ORMA-Adresse gibt es noch nicht.

**Technik und Geräte (nicht geprüft)**
7. Keine Prüfung auf echten Geräten: iPhone/Safari, Android/Chrome, echte Bildschirmtastatur,
   Installation vom Home-Bildschirm, Flugmodus am Gerät.
8. «Teilen» über das Betriebssystem (Web Share mit Bilddatei) erscheint nur, wo der Browser es anbietet.
   In der Testumgebung war es nicht verfügbar; geprüft ist nur der Weg «Bild speichern».
9. Safari kann den lokalen Speicher von Websites, die nicht zum Home-Bildschirm hinzugefügt wurden,
   nach längerer Nichtnutzung löschen. Die App empfiehlt deshalb die Sicherung. Als App vom
   Home-Bildschirm gilt diese Einschränkung nach heutigem Stand nicht.
10. In Chromium lief eine Navigation, die unmittelbar nach der ersten Einrichtung folgte, in etwa einem
    von fünf Fällen noch am Service Worker vorbei; beim nächsten Laden übernahm er. Der Offline-Test lädt
    darum bis zur Übernahme neu. Bei ORNA trat das nicht auf. Für den Gebrauch ist es ohne Folgen,
    solange nach der Installation einmal online geöffnet wird. Auf Geräten nicht geprüft.
11. Die Manifest-Kennung `id: "orma"` darf nach der Veröffentlichung nicht mehr geändert werden, sonst
    gelten installierte Apps als fremd.

**Veröffentlichung (späterer Schritt)**
12. Den Build an seinen endgültigen Ort legen, `noindex` entfernen und ORMA in `sitemap.xml` eintragen.
    Die Manifest-Kennung `orma` bleibt dabei gleich. Ob eine installierte Alpha-Version dann von selbst
    auf die neue Adresse wechselt, ist nicht gesichert; im Zweifel die App neu installieren.
13. Eine Karte in der Kategorie «Apps» auf der Startseite anlegen und bei Bedarf einen News-Eintrag
    schreiben.
14. Beim Veröffentlichen die bestehenden Website-Tests um ORMA erweitern (Sitemap, Links).
