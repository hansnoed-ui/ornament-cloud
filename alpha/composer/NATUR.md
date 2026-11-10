# Natur und Flächen (Natur 0.1.0)

Auftrag: `organische-klangwelt.md` (Baustein-Prompt zum Masterprompt), 9. November 2026.

## Architektur

- **Ein Klangerzeuger wie die anderen:** `erzeuger/natur-0.1.0.js`, registriert als `natur@0.1.0`. Eine Flächenspur ist eine erzeugte Spur (`quelle.flaeche = true`). Sie wird offline mit Startwert gerechnet und läuft dann durch dieselben Abläufe wie Drums und Bass: Unterbrechungen, Kanalzug, Raum, Pegel, Panorama, Stumm/Solo, Messung und Export (Summe und Stems, 24 Bit). Es gibt keinen zweiten AudioContext und keine zweite Uhr.
- **Rechnen im Worker:** `worker/rechnen-worker.js` rechnet Flächen ausserhalb der Oberfläche, weil sie 1–4 s brauchen. Pro Spur ist höchstens ein Auftrag unterwegs; Änderungen während der Rechnung werden danach in einem Durchgang nachgeholt. Export und Messung warten, bis alle Aufträge fertig sind.
- **Schleife ohne Naht:** Jede Fläche wird um einen Überhang länger gerechnet. Der Überhang wird mit gleicher Leistung über den Anfang geblendet. «Installation …» rechnet eine lange Fassung (1, 3 oder 10 Minuten) nur dieser Spur als WAV-Schleife.
- **Bezug zu anderen Spuren** (`bezugFuer` in `app.js`):
  - Tonart, Leiter und Akkorde (erster Ton jedes Takts) kommen von der Bassspur.
  - Die Einsätze kommen von Kick, Snare, Clap und tiefer Perkussion.
  - Die Hüllkurve kommt vom Bass (100 Werte je Sekunde).
  - Wird der Bass oder werden Drums neu erzeugt, rechnen die Flächen mit.
- **Kein Projektformatwechsel:** Das Projekt speichert nur das Rezept (Stimme, Werte, Startwert) und bei eigener Aufnahme deren Name, SHA-256 und Lizenzangaben, nicht die Tondaten.

## Familien und Makros

| Familie | Quelle ohne Import | Varianten |
|---|---|---|
| Walchor | synthetisches Modell von Walrufen (gleitende Töne mit Obertönen und Formanten) | Ruf nah, Chor, Tiefsee-Drone, singend gestimmt, Strömung, Sub-Drone |
| Vogelschwarm | synthetische Rufmodelle (Zwitscher, Triller, Pfiff, Gurren, Flöten) | Morgen, Garten nah, im Groove (auf den Drums), Raster gestimmt, Schwarm-Fläche, Dämmerung |
| Gezeiten | prozedural: Wellen als Ereignisse mit zufälliger Dauer, Wind mit Böen, Blasen (Minnaert-Frequenz), Unterwasser-Grollen | Brandung, Wind über Wasser, Unterwasser, singendes Meer, Rauschfläche, atmend mit dem Bass |
| Pflanzentextur | **Demonstration (synthetisch)**; dazu Pflanzenaufnahme (Import, verlangsamt) oder Messdaten (CSV) | Tropfen, Glasgarten, Holz, Knistern, verdichtet, Daten-Melodie |
| Pad | Oszillatoren | warm, Analog breit, Luft, Drone, Sub-Drone, Glas |

Die Makros sind in `MAKROS` in `natur-0.1.0.js` je Familie beschrieben und im Klang-Reiter unter «Was die Makros hier tun» zu sehen. Kurz:
- **Verwandlung** geht vom Ausgangsklang (Rufe, Wellen, Impulse, Akkord) zur Fläche (grössere Körner, Dehnung, Resonatoren, Drone).
- **Tonalität** mischt gestimmte Resonatoren auf den Akkordtönen dazu. Rauschen wird nicht «gestimmt»; die Tonart wirkt nur über diese Resonatoren und über tonale Stimmen.
- Flächen lassen dem Bass den Raum unter etwa 120 Hz (Hochpass). Ausgenommen sind die Varianten «Sub-Drone».
- Alle Makros sind Parameter der Spur. Sie lassen sich in Varianten speichern und mit den Unterbrechungen aufbrechen. Eine Automation über die Zeit fehlt noch.

## Natur 0.3.0: Delfine, Nachtwald, Kosmos (10. November 2026)

Wunsch Christian: mehr Natur- und vor allem Tierklänge für Ornament und Drum and Bass («der Walchor ist grosse Spitze») und «eine Ebene mit astronomischen Signalen aus dem Universum». `erzeuger/natur-0.3.0.js`, registriert als `natur@0.3.0`. Alle Familien aus 0.2.0 klingen unverändert (getestet). Neue Flächenspuren und «Track erzeugen» nutzen 0.3.0; ältere Projekte behalten ihre Version.

| Familie | Modell | Varianten |
|---|---|---|
| Delfine | Pfeiftöne mit eigener «Signatur»-Kontur je Tier (Bogen, Welle, Schleife, steigend, fallend), Klicksalven der Echoortung, die sich zum Buzz beschleunigen; unter Wasser gedämpft mit leisem Grollen. Tonlage wählbar: echt (6–15 kHz) bis zwei Oktaven tiefer | Schule, nah und hell, Echoortung (Klicks auf den Drums), Delfine singen (gestimmt, −24), Tiefe Bucht, Delfinfläche |
| Nachtwald | Unken (weiches, glockiges «Uh» um 400–500 Hz, jedes Tier im eigenen Takt), Froschknarren (Pulsfolge durch zwei Formanten), Uhu («Uu-hu» um 190 Hz, rund, wenig Atem), Blätterrauschen in Böen | Teich bei Nacht, Unkenchor (gestimmt), Froschknarren, Uhu im Nebel, Wind im Wald, Nachtfläche |
| Kosmos | Pulsar (nur schnelle: Vela, Krebsnebel): Rauschpulse, die durch die Dispersion hoch beginnen und nach unten gleiten und zu einem schnarrenden Ton verschmelzen. Plasmawellen: Whistler nach f = (D / t)² und Chorus (Gruppen steigender Zirpen). Gravitationswellen-Chirp nach f ∝ (1 − t/tc)^(−3/8), Amplitude ∝ f^(2/3), danach Ringdown. Radiorauschen als Wellen (wie Jupiters L-Bursts) und feines Hintergrundrauschen | Tiefer Raum, Vela schnarrt, Magnetosphäre, Verschmelzung, Kosmische Fläche |

- **Pulsare:** Die langsamen Pulsare als einzelne Schläge (B0329+54, auch im Takt) sind nach Christians Urteil vom 10. November 2026 wieder raus: «zu dominant, zu wenig fein», «zu grell», «puls geht gar nicht». Geblieben ist nur der schnelle Pulsar als schnarrender Ton («Vela schnarrt» gefiel), standardmässig aus. Damit die Schleife ohne Naht bleibt, passt eine ganze Zahl von Pulsen in die Spur.
- **Arrangement:** Delfine und Nachtwald zählen wie Vögel und Insekten als perkussive Naturklänge und spielen nur in den ruhigen Teilen. Kosmos läuft wie Walchor und Gezeiten durch.
- **Besetzung:** Ornament bekommt zu Gezeiten, Walchor und Vögeln «Delfine singen» und Kosmos «Tiefer Raum» (ohne Pulsar). Drum and Bass bekommt zu Gezeiten und Insekten den «Teich bei Nacht» und die «Magnetosphäre».
- **Quellen und Lizenzen:** nur Synthese nach veröffentlichten Messwerten (Frequenzen, Perioden, Dispersionsgesetz, Chirp-Formel). Zahlen und Naturgesetze sind nicht urheberrechtlich geschützt. Keine Aufnahme und kein Code übernommen. Echte Aufnahmen kämen nur einzeln geprüft über «eigene Aufnahme laden»: NASA meist gemeinfrei (aber Sonifikationen teils von externen Urhebern, z. B. bei Chandra), ESA oft CC BY-SA 3.0 IGO (Weitergabe unter gleicher Lizenz), Plasmawellen der University of Iowa ohne klare Freigabe.
- **Hörproben:** `node tools/composer-natur-0.3-hoerproben.mjs <ordner>` rechnet jede Variante allein (24 s, 80 BPM, D-Moll) und je Familie ein Beispiel mit Drums und Bass.
- **Nicht geprüft:** der Klang selbst. Geprüft sind Pegel, Länge, Wiederholbarkeit und Spektrogramme (Dispersion der Pulse, Whistler, Chirp sichtbar). Das Urteil liegt bei Christian.

## Quellen und Lizenzen

- **Synthetische Quellen** sind im Klang-Reiter als «synthetisches Modell» bezeichnet. Wasser, Wind und Blasen folgen den Modellen aus Andy Farnells «Designing Sound»; die Ideen sind nachgebaut, kein Code ist übernommen.
- **Eigene Aufnahmen:** Import im Klang-Reiter. Gespeichert werden Name, SHA-256, Abtastrate, Dauer sowie Felder für Lizenz, Urheber, Quelle und «nicht kommerziell». Der Standard ist «Lizenz nicht angegeben»; daraus folgt keine Freigabe. Der Export warnt bei Material mit NC-Lizenz.
- **Startsammlung Wale:** acht Clips der NOAA-Seite «Sounds in the Sea / Ocean Mammals», nur aus NOAA-Gruppen. Sie liegen in `ornament-material/vorlagen/natur/wale/` mit `herkunft.json` (URL, Urheber, Geschwindigkeit, Qualität), nicht im Repo.
  - Lizenz: vermutlich gemeinfrei als Werk einer US-Bundesbehörde. Die Seite gibt das nicht ausdrücklich an, nicht einzeln bestätigt.
  - Drei Clips sind beschleunigt (×2, ×5, ×8 laut Dateiname).
  - Die Qualität ist gering: MP3 mit 8–24 kHz Abtastrate und 35–78 kbit/s, also unter der 320-kbit/s-Regel. Für tiefe, gedehnte Flächen ist das brauchbar.
- Nicht übernommen: Clips von Cornell, AWI, DFO und Universitäten (mögliche Fremdurheber); Freesound und Xeno-canto (API-Schlüssel bzw. Lizenz je Datei nötig); BBC und Macaulay (nur Recherche).

## Prüfung

- **Tests** (`node --test tests/composer.test.mjs`):
  - Jede Familie und Variante ist endlich, nicht stumm, hat die richtige Länge, eine Spitze ≤ 0,61, eine Schleife ohne Naht und ist reproduzierbar.
  - Eine Aufnahme ersetzt die Quelle.
  - Ultraschall-Impulse bei 192 kHz regen nach 16-facher Verlangsamung die Resonatoren an.
- **Browser (Chromium):**
  - ECM-Stil mit Bass und allen fünf Familien zugleich erzeugt; Rechenzeit je Fläche 0,7–2,3 s im Worker.
  - Abspielen, schnelle Reglerbewegungen und Variantenwechsel während des Abspielens.
  - Export: keine Fehler in der Konsole.
- **Hörbeispiele** in `ornament-material/hoerproben/natur/` (WAV 24 Bit und MP3), gemischt auf −14 LUFS, −1 dBTP: je Familie gering, mittel, stark und mit Drums und Bass; Walchor auch mit der NOAA-Buckelwalaufnahme.
- **Nicht geprüft:** der Klang selbst. Claude kann nicht hören. Die Messwerte sagen nichts darüber, ob es gut klingt; das Urteil liegt bei Christian.

## Einschränkungen und vorbereitet für später

- Keine Automation der Makros über die Zeit; Bewegung entsteht bisher in der Fläche selbst («Bewegung»).
- Keine Auslösung über MIDI oder Noten, nur der kontinuierliche Atmosphärenmodus.
- Sensor-Anbindung für Pflanzen (MIDI Sprout): nicht gebaut.
- Freesound und Xeno-canto: nicht angebunden (API-Schlüssel serverseitig nötig).
- KI-Klänge (Stable Audio, RAVE, ElevenLabs): nicht angebunden; generierte Clips lassen sich als eigene Aufnahme importieren und sollten dann als «KI» bezeichnet werden.
- Eigene Aufnahmen sind nach dem Neuladen der Seite nicht mehr im Speicher. Das Projekt zeigt «Aufnahme fehlt», bis sie neu geladen ist; bis dahin rechnet es mit der synthetischen Quelle.
