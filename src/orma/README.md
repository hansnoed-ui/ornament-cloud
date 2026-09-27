# ORMA – Alpha-Fassung (0.5.0)

**ORMA** · *Nebeneinander, Nacheinander* · Zehn Minuten zu zweit. Zwei Sichtweisen. Ein neuer Gedanke.

ORMA ist ein kostenloses Kunst- und Denkspiel für zwei Personen an einem Gerät. Es baut auf
«Nebeneinander, Nacheinander» auf und steht als eigenständige zweite App neben ORNA. Es gibt keine
Anmeldung, keine Bezahlfunktion, keine Werbung, keine Cloud, keine Zählung und keine KI-Aufrufe.
Alles bleibt auf dem Gerät.

Stand: 27. September 2026. Die App ist als **Alpha-Version** auf der Website, verlinkt von der Startseite
(Kategorie «Apps») und aus den News: <https://hansnoed-ui.github.io/ornament-cloud/alpha/orma/>. Die Übersicht aller Alpha-Versionen
steht unter <https://hansnoed-ui.github.io/ornament-cloud/alpha/>. Der Alpha-Bereich ist öffentlich erreichbar,
nicht in der Sitemap und für Suchmaschinen gesperrt; ausser Startseite und News verlinkt ihn keine Seite.

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

**Vorschaubild neu erzeugen** (Bild beim Teilen eines Links, 1200 × 630):
`NODE_PATH=$(npm root -g) node --experimental-strip-types --no-warnings tools/orma-og.mjs` → `src/orma/app/og-orma.png`.
Die absolute Adresse dafür steht in `src/orma/orma.json` (`url`) und muss bei der Veröffentlichung angepasst werden.

## Symbol, Startbild und Vorschaubild (seit 0.4.0)

Diese drei sind wie bei ORNA, aber vertikal in der Mitte geteilt: links schwarz auf weiss, rechts weiss
auf schwarz (REGELN §14, Ausnahme zu §5).
- **App-Symbol:** Android bekommt das leere Rad (erstes Bild der Animation), das iPhone und der
  Browser-Tab das volle Rad. Die Motive sind aus `tools/app-icons.mjs` abgeschrieben.
- **Startbild (`js/intro.js`):** dieselbe Animation wie bei ORNA. Das Rad setzt sich aus 40 Zeichen
  zusammen, dann erscheint «ORMA».
  - Die Animation läuft einmal pro Sitzung, beim Öffnen der installierten App. Im Browser lässt sie sich
    mit `?intro` ansehen.
  - Bei reduzierter Bewegung entfällt sie, Antippen überspringt sie.
  - Die rechte Hälfte kehrt eine darübergelegte Ebene um (`backdrop-filter: invert(1)`). Die Farben sind
    fest, damit links auch im Dunkelmodus schwarz auf weiss bleibt.
- **Vorschaubild (`og-orma.png`):** das Schlussbild der Animation mit Rad, Name und Leitsatz, ebenfalls
  geteilt.
- **Nicht geändert:** Die kleine Bildmarke oben in der App und auf der Ergebniskarte bleibt die mit den
  zwei Ringen.

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
3. **Drehen:** zwei gegenläufige Ringe mit je zwölf Plätzen (je Person ein Platz), aussen die Künstler:innen, innen die
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

## Allein: Re-Entry (seit 0.3.0)

Eine Person spielt beide Rollen, zu verschiedenen Zeiten.

1. **Erster Durchgang:** Drehen, lesen, Auftrag wählen, antworten. Die Runde endet mit «Die Schleife ist
   offen». Konstellation, Auftrag, Antwort und Zeitpunkt liegen unter `orma:v1:schleifen`.
2. **Wiederkehr:** Bringt das Rad irgendwann dieselbe Konstellation, beginnt der zweite Durchgang.
   - Die Ziehung ist dieselbe wie sonst: gleichverteilt über alle 48, nie zweimal hintereinander. Bis eine
     bestimmte Konstellation wiederkehrt, dauert es darum im Schnitt etwa 48 Drehungen.
   - Offene Schleifen werden nicht bevorzugt, und es gibt keinen Mindestabstand.
   - Die App zeigt nur das Datum des ersten Durchgangs.
3. **Zweiter Durchgang:** derselbe Auftrag, die erste Antwort bleibt verborgen. Dann folgt das Aufdecken:
   «Ich, am [Datum]» neben «Ich, am [Datum]».
4. **Weiterdenken:** «Was hat sich verändert?» und «Der dritte Gedanke». Danach ist die Schleife
   geschlossen, und die Ergebniskarte kann wie gewohnt ins Gedankenbuch oder exportiert werden. Kommt die
   Konstellation später wieder, beginnt eine neue Schleife.

**Weitere Regeln**
- Allein spricht die App eine Person an (du). Die Spielaufträge haben dafür eigene Fassungen in der Du-Form
  (`auftraege_allein` in `pilot.json`, seit 0.3.1). Aufträge für zwei Personen sind so umgeformt, dass sie
  allein ausführbar sind, z. B. «Diktiert euch gegenseitig …» → «Schreib … Leg sie eine Weile weg, lies sie
  dann und zeichne nur, was dasteht».
- Allein gibt es keine mündliche Antwort und keine Namen.
- Die Karte beschriftet die beiden Antworten mit ihrem Datum.
- Offene Schleifen stehen im Gedankenbuch nur mit Paarung und Datum und lassen sich einzeln löschen.
  «Alle ORMA-Einträge löschen» entfernt auch sie.
- Sicherung und Import tragen sie mit, ebenfalls ohne Überschreiben.

## Die 48 Pilot-Konstellationen

Auswahl nach drei Kriterien:
- konkreter Werkbezug im Originaltext;
- eine Frage, die ohne Vorwissen verständlich ist;
- verschiedene gedankliche Zugänge (Zeit, Körper, Erinnerung, Regel, Blick, Raum, Material, Öffentlichkeit).

Zwölf Künstler:innen (sechs Frauen, sechs Männer) und zwölf Theoretiker:innen. Jede Person kommt in genau
vier Konstellationen vor, mit vier verschiedenen Gegenübern. So konzentriert sich die Auswahl nicht auf
wenige Personen, und das Rad bleibt bei zwölf Plätzen je Ring. Die Nummern sind die redaktionellen
Nummern des Bestands (326er-Fassung).

Die ersten zwölf stammen aus der Fassung 0.1.0, die zweiten zwölf sind mit 0.2.0 dazugekommen, die
letzten 24 mit 0.5.0. Deren Aufträge sind besonders sanft, neugierig und ermutigend formuliert: Sie laden
ein, statt zu prüfen, und führen zu kleinen, konkreten Handlungen. Dieselben
Personen sind neu gepaart, gewählt wurden kurze, konkrete Fragen, die sich gut in eine Handlung übersetzen
lassen.

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
| 321 | Eva Hesse × George Spencer-Brown | Wie stabil muss eine Grenze sein, um Form zu bilden? | Grenze, Material |
| 268 | Tehching Hsieh × Lucy Suchman | Wie überlebt ein Plan ein Jahr? | Plan, Dauer |
| 200 | Dan Graham × Henri Bergson | Wie lang sind zehn Sekunden in der Wahrnehmung? | Zeit, Wahrnehmung |
| 177 | Felix Gonzalez-Torres × Michel Serres | Kann Weitergabe eine Form erhalten? | Weitergabe |
| 43 | Rebecca Horn × Donna Haraway | Wann wird eine technische Erweiterung Teil des Körpers? | Körper, Technik |
| 142 | Marina Abramović × Elena Esposito | Wie verändert ein angekündigtes Ende die Gegenwart? | Zukunft, Dauer |
| 48 | Mona Hatoum × Judith Butler | Was passiert mit einer Norm, wenn der Körper anders handeln muss? | Norm, Körper |
| 148 | Louise Bourgeois × Wendy Hui Kyong Chun | Kann Wiederholung eine Erinnerung verändern? | Erinnerung, Wiederholung |
| 173 | On Kawara × Hannah Arendt | Wann wird ein einzelner Tag gemeinsam? | Tag, Öffentlichkeit |
| 137 | Doris Salcedo × Susan Leigh Star | Welche Infrastruktur braucht Erinnerung? | Erinnerung, Pflege |
| 214 | Sol LeWitt × Claude Shannon | Wie viel Information braucht ein Werk? | Anweisung, Information |
| 195 | Donald Judd × Jacques Derrida | Kann ein Zwischenraum bestimmen, was ein Ding ist? | Abstand, Identität |
| 172 | Eva Hesse × Henri Bergson | Kann ein Material Dauer haben? | Material, Dauer |
| 244 | Tehching Hsieh × Donna Haraway | Wessen Zeit misst dieselbe Uhr? | Zeit, Körper |
| 169 | Dan Graham × Elena Esposito | Erzeugt Verzögerung Zukunft? | Verzögerung, Erwartung |
| 185 | Felix Gonzalez-Torres × Hannah Arendt | Kann ein vergängliches Werk Teil einer gemeinsamen Welt bleiben? | Gemeinsame Welt |
| 150 | Rebecca Horn × Judith Butler | Welche Körpergrenzen halten wir für selbstverständlich? | Körpergrenzen |
| 237 | Marina Abramović × Jacques Derrida | Was bleibt von einer einmaligen Gegenwart? | Gegenwart, Spur |
| 128 | Mona Hatoum × Lucy Suchman | Was entscheidet sich erst beim Durchqueren eines Raums? | Raum, Handeln |
| 310 | Louise Bourgeois × Claude Shannon | Wie viel Erinnerung lässt sich übertragen? | Erinnerung, Übertragung |
| 56 | On Kawara × Wendy Hui Kyong Chun | Was wird aus Vergangenheit, wenn Gegenwart nur noch als nächstes Update erscheint? | Datum, Update |
| 286 | Doris Salcedo × Michel Serres | Wie trägt Material eine Abwesenheit weiter? | Abwesenheit, Material |
| 317 | Sol LeWitt × Susan Leigh Star | Welche Infrastruktur führt eine Idee aus? | Idee, Infrastruktur |
| 189 | Donald Judd × George Spencer-Brown | Kann ein Abstand eine Form erzeugen? | Abstand, Form |
| 254 | Donald Judd × Susan Leigh Star | Was hält einen präzisen Abstand aufrecht? | Präzision, Pflege |
| 294 | On Kawara × Henri Bergson | Wie viel Dauer passt in ein Datum? | Datum, Dauer |
| 205 | Tehching Hsieh × Michel Serres | Wann macht eine Störung die Regel sichtbar? | Regel, Störung |
| 111 | Dan Graham × Lucy Suchman | Was entsteht erst zwischen Plan und Handlung? | Plan, Situation |
| 149 | Marina Abramović × Hannah Arendt | Was macht Anwesenheit öffentlich? | Anwesenheit |
| 261 | Mona Hatoum × George Spencer-Brown | Wer steht auf welcher Seite? | Grenze, Standort |
| 103 | Louise Bourgeois × Donna Haraway | Wie wird eine persönliche Erinnerung für andere lesbar? | Erinnerung, Standpunkt |
| 161 | Doris Salcedo × Wendy Hui Kyong Chun | Muss Erinnerung aktualisiert werden, um wirksam zu bleiben? | Erinnerung, Update |
| 228 | Sol LeWitt × Jacques Derrida | Kann eine Regel identisch wiederholt werden? | Regel, Wiederholung |
| 135 | Rebecca Horn × Elena Esposito | Was weiß eine Maschine über ihren nächsten Moment? | Maschine, Zukunft |
| 154 | Eva Hesse × Judith Butler | Wie viel Unterschied verträgt eine Serie? | Serie, Unterschied |
| 292 | Felix Gonzalez-Torres × Claude Shannon | Wie viel Werk lässt sich als Information übertragen? | Werk, Information |

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
| `src/orma/app/js/wheel.js` | zwei gegenläufige Ringe mit je zwölf Plätzen (je Person einer), Geste nur für den Weg |
| `src/orma/app/js/symbols.js` | Abschrift der Zeichen-Grammatik aus ORNA (Test prüft Gleichheit) |
| `src/orma/app/manifest.webmanifest`, `sw.js`, `icons/` | Installation und Offline-Betrieb, eigenes Symbol |
| `src/orma/redaktion/pilot.json` | Auswahl, Einstiege und Spielaufträge |
| `src/orma/orma.json` | Name und Version der App |
| `tools/build-orma.ts` | Produktionsbuild, prüft die Redaktionsdatei, setzt Version und Dateiliste |
| `tools/serve-orma.mjs` | Vorschau-Server ohne Abhängigkeiten |
| `tools/orma-icons.mjs` | App-Symbole (ORNA-Motiv, geteilt, rechts invers) |
| `tools/orma-og.mjs` | Vorschaubild beim Teilen eines Links |
| `src/orma/app/js/intro.js` | Startbild der App (wie ORNA, geteilt) |
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
| `start_url` / `scope` | `app/` im Werkordner | `app/` im ORMA-Ordner (Website-Links auf den ORMA-Ordner öffnen so im Browser, nicht in der installierten App) |
| Service Worker | `…/nebeneinander-nacheinander/sw.js` | `orma/sw.js` (Geltungsbereich nur der ORMA-Ordner) |
| Cache-Namen | `nn-<Version>`, räumt nur `nn-` auf | `orma-<Version>`, räumt nur `orma-` auf |
| Speicher | `sessionStorage` «orna-intro» | `localStorage` nur mit Präfix `orma:` |
| Symbol | leeres bzw. volles Rad | dasselbe Motiv, vertikal geteilt, rechts invers |

Beide laufen auf derselben Adresse nebeneinander. «Alle ORMA-Einträge löschen» entfernt nur
`orma:v1:buch`, und ORMAs Service Worker räumt nur eigene Caches auf. Ein Browser-Test prüft genau das
mit ORNA und ORMA im selben Browser.

## Ausgeführte Prüfungen (27. September 2026)

Alle Prüfungen liefen in Chromium (Playwright) am Linux-Rechner, mobil als «Pixel 7» und «iPhone 13»
nachgebildet. Es gab **keine** Prüfung auf echten Geräten.

- **Unit-Tests `tests/orma.test.mjs`: 23/23 bestanden** (Stand 0.5.0: 48 Konstellationen, jede Person genau viermal, Du-Form der Aufträge, Symbole und Vorschaubild).
  - Ziehung: Rejection Sampling. Gleichverteilung erste Ziehung und nach einer Konstellation
    (je 46 000–48 000 Ziehungen, Toleranz ±15 %). Nie dieselbe unmittelbar wieder, nur freigegebene IDs.
  - Pilotdaten: Texte, Fragen und IDs wörtlich wie im Bestand. Zwölf Personen je Ring, jede genau zweimal, fester Platz je Person.
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
- **Browser-Tests `tests/orma.e2e.mjs`: 14/14 bestanden, in zwei aufeinanderfolgenden Läufen (Fassung 0.5.0, mit Startbild).**
  - Re-Entry, erster Durchgang: Schleife offen, Antwort gespeichert und in der Liste verborgen, Zähler auf der Startansicht;
  - Re-Entry, zweiter Durchgang: Wiedersehen mit Datum, derselbe Auftrag, erste Antwort bis zum Aufdecken
    nicht im Dokument (auch nach Neuladen mitten im zweiten Durchgang), Aufdecken mit Datum, dritter
    Gedanke, Schleife geschlossen, Eintrag «Re-Entry», Export ohne Namen;
  - ganze Runde am Smartphone (Tippen aufs Rad, Überspringen, Originaltext, Auftrag). Die erste Antwort
    steht weder beim Übergeben noch bei B im Dokument. Mündliche Antwort, Aufdecken, Weiterdenken,
    Ergebniskarte;
  - Tastatur von Start bis Auftrag, sichtbarer Fokus, Eingabeschrift ≥ 16 px;
  - nachgebildete Bildschirmtastatur (412 × 420): Feld und Knopf erreichbar, kein waagrechtes Scrollen,
    Knöpfe ≥ 48 px;
  - Fortsetzen nach Neuladen, auch mitten in B (zuerst neutrale Übergabe). Kein Verlust zwischen den
    Schritten. Verwerfen nur nach Bestätigung;
  - 26 Ziehungen in der App: alle aus den 24, keine unmittelbare Wiederholung, auch über
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
1. Alle 48 Einstiege, 144 Spielaufträge und ihre 144 Du-Fassungen für den Modus allein sind Entwürfe (`"status": "entwurf"`) und warten auf deine
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
13. Erledigt am 27. September 2026: Karte in der Kategorie «Apps» auf der Startseite und ein News-Eintrag,
    beide verlinken auf `alpha/orma/` (REGELN §14). Beim Umzug an den endgültigen Ort beide Links anpassen.
14. Beim Veröffentlichen die bestehenden Website-Tests um ORMA erweitern (Sitemap, Links).
