# Projektformat `ornament-lab-projekt` 0.7.0

Ein Projekt ist ein ZIP-Archiv (`<titel>.ornalab.zip`) mit diesem Inhalt:

```
projekt.json          Struktur, Verlauf, Entscheidungen (JSON, UTF-8)
medien/<id>.png       Bildergebnisse und Material (verlustfrei)
medien/<id>.json      Konstellationen, Steuersignale, Ereignisfolgen, Befunde
medien/<id>.wav|mp3|ogg|flac|m4a|…   Tonmaterial, unverändert (seit 0.4.0); erzeugte Klänge als WAV: Klangerzeuger 16 Bit mono (seit 0.6.0), Klangtransformationen 24 Bit mit den Kanälen und der Abtastrate der Quelle (seit 0.7.0)
medien/<id>-animation.mp4|webm   exportierte Animationen
medien/<id>-stationen.mp4|webm   Filme über Stationen (seit 0.5.0), MP4 auf Wunsch mit Tonspur
```

Die Struktur steht in JSON, die Medien liegen getrennt daneben. Beim Öffnen werden die CRC-Prüfsummen, die Pfade (kein `..`, nur `medien/`), die Formatversion (gleiche Hauptversion) und alle Verweise geprüft. Fehlende Mediendateien werden gemeldet.

## projekt.json

```jsonc
{
  "format": "ornament-lab-projekt", "formatVersion": "0.7.0", "labVersion": "0.1.7",
  "id": "p-…", "titel": "…", "modus": "manuell | jev | experimentell", "erstellt": "ISO", "geaendert": "ISO",

  "ergebnisse": [{                        // Material und alle erzeugten Zustände; nichts wird überschrieben
    "id": "m-… | e-…", "typ": "IMAGE | AUDIO | CONSTELLATION | CONTROL_SIGNAL | EVENT_SEQUENCE | METADATA | …", "titel": "…",
    "datei": "medien/….png", "sha256": "…", "mime": "image/png", "breite": 900, "hoehe": 1273,
    "ton": { "dauer": 12.5, "abtastrate": 44100, "kanaele": 2 },   // seit 0.4.0 nur bei AUDIO-Material (Datei unverändert)
    "knoten": "k-… | null",               // null = importiertes Material
    "herkunft": { "art": "import", "original": { "name", "sha256", "breite", "hoehe", "mime", "bytes" } }
             | { "art": "operation", "operation": "lab.feedback" },
    "index": 0,                           // Stelle in der Reihe der Varianten
    "variante": { "stelle": 0.4, "parameter": { … }, "seed": 123, "teil": 0 },   // die tatsächlich benutzten Parameter
    "daten": { … } | null,                // bei CONSTELLATION, CONTROL_SIGNAL, EVENT_SEQUENCE, METADATA (siehe unten)
    "befund": { "art": "verifiziert", … } | null   // seit 0.3.0 bei lab.komposition: { kurz, profil } = Profil nachher
  }],

  "knoten": [{                            // eine Ausführung einer Operation
    "id": "k-…", "operation": "lab.feedback", "operationVersion": "0.1.0",
    "eingaben": { "bild": "e-…", "konstellation": "e-…", "profil": "e-…", "ton": "m-…" },    // nur frühere Ergebnisse (azyklisch); profil = Zielprofil
    "parameter": { … },                   // bereinigt und begrenzt
    "variation": { "anzahl": 6, "achse": "varianten | zeit | beide",
                   "routen": [{ "ziel": "drehung", "tiefe": 0.5,
                                "polaritaet": "einpolig",   // seit 0.2.0, fehlt bei bipolar (Standard)
                                "modulator": { "quelle": "sinus", "frequenz": 1, "phase": 0, "seed": 1,
                                               "halten": 3 } }] },   // seit 0.2.0: abtasten und halten in Stufen, fehlt bei fortlaufend
    "seed": 123,                          // Startwert; Variante i rechnet mit seed + i
    "ausgaben": ["e-…"], "gewaehlt": "e-… | null",
    "status": "fertig | fehler | laeuft", "fehler": null, "warnungen": [],
    "protokoll": { … },                   // was die Operation selbst festhält (z. B. Befunde der Fictory)
    "start": "ISO", "dauerMs": 7011, "reproduzierbar": "ja | bedingt | nein",
    "entscheidungen": ["d-…"]
  }],

  "entscheidungen": [{
    "id": "d-…", "zeit": "ISO", "knoten": "k-… | null",
    "art": "mensch | zufall | regel | jev",
    "gegenstand": "operation | variante | konstellation | operationsregel | …",
    "optionen": […], "gewaehlt": "…",
    "details": { … }                      // z. B. Startwert, Regelgründe, jev-Modell, Stand, Wahrscheinlichkeiten
  }],

  "ketten": [{ "id": "c-…", "name": "…", "schritte": [{ "operation", "operationVersion", "parameter", "variation", "auswahl": 3, "nebeneingaenge": [] }] }],
  "exporte": [{ "art": "animation | verlauf | stationen | werk", "ergebnis": "e-…", "datei": "medien/…", "codec": "avc1.640028", "bilder": 451, "fps": 30, "sha256": "…",
                "tonspur": { "ergebnis": "e-…", "beginn": 0, "sekunden": 8, "codec": "aac" } }],   // tonspur seit 0.6.0 bei «animation», nur wenn gewählt; sonst { …, "fehlt": "Grund" }
  "meldungen": [{ "zeit": "ISO", "art": "warnung | hinweis", "text": "…" }]
}
```

## Film über Stationen (seit 0.5.0)

Ein Export mit `art: "stationen"` (Beschreibung: STATIONEN.md). `stationen` verweist auf Bildergebnisse des Projekts. `pruefeProjekt` prüft das, eine fehlende Filmdatei meldet das Archiv beim Öffnen.

```jsonc
{
  "id": "x-…", "art": "stationen", "ergebnis": "e-…",            // die letzte Station
  "stationen": ["m-…", "e-…", …], "entscheidung": "d-…",           // Auswahl als Entscheidung «mensch», gegenstand «stationen»
  "partitur": {
    "version": "0.1.0", "fps": 30, "art": "blende", "halten": 1.5, "uebergang": 1,
    "routen": [{ "ziel": "halten | uebergang", "tiefe": 0.3, "modulator": { "quelle": "saege", … } }],   // wie bei Knoten, ohne Signaldaten
    "takt": null | { "ereignisfolge": "e-…", "schwelle": 0.2, "wiederholen": true, "einsaetze": 23, "ton": "m-… | null", "tonBeginn": 0, "tonDauer": 12.5 },
    "folge": [{ "ergebnis": "e-…", "stelle": 0.25, "beginn": 2.5, "halten": 1.5,
                "uebergang": { "art": "blende | schwelle | verlauf | schnitt", "dauer": 1 | null, "hinweis": "…" } | null }],   // null: letzte Station; dauer null: eigene Länge des Verlaufs
    "dauer": 12.5, "bilder": 375, "offen": 0                         // offen: Verläufe mit eigener Länge, nicht in dauer enthalten
  },
  "zeitplan": [{ "ergebnis": "e-…", "ab": 2.2, "bild": 66, "uebergang": "verlauf", "bilder": 75 }],   // wie tatsächlich gerechnet
  "datei": "medien/x-…-stationen.mp4", "mime": "video/mp4", "codec": "avc1.640028", "ton": "aac | opus | null", "tonQuelle": "m-… | null",
  "bilder": 375, "fps": 30, "breite": 904, "hoehe": 1280, "sha256": "…", "zeit": "ISO"
}
```

## Steuersignal und Ereignisfolge (Klang seit 0.4.0)

Ein Steuersignal (`CONTROL_SIGNAL`) hat immer `werte` (0–1). Aus einem Bild (`lab.bildsignal`) kommt `achse: "x" | "y" | "radial"`, aus einem Ton (`lab.tonsignal`) ein zeitlicher Parameterverlauf:

```jsonc
{ "werte": [0, 0.12, …], "achse": "zeit", "merkmal": "laut | tief | mitte | hoch | schwerpunkt | fluss | einsaetze", "einheit": "0–1",
  "beginn": 0, "dauer": 12.5, "je": 0.104167, "quelle": "ton" }       // Sekunden; Stelle u der Modulation = Zeit beginn + u · dauer
```

Eine Ereignisfolge (`EVENT_SEQUENCE`):

```jsonc
{ "art": "einsaetze", "ereignisse": [{ "t": 0.733, "staerke": 0.91, "band": "tief | mitte | hoch" }], "beginn": 0, "dauer": 12.5, "einheit": "s", "quelle": "ton" }
```

## Klangtransformation (seit 0.7.0)

Die Operationen `lab.tempo`, `lab.zerlegen`, `lab.rhythmus` und `lab.koerner` haben den Eingang `ton` (AUDIO) und geben einen Klang wie der Klangerzeuger aus (`ton: { dauer, abtastrate, kanaele, umriss }`), aber mit den Kanälen und der Abtastrate der Quelle, als WAV mit 24 Bit. Dekonstruktion und Neu-Rhythmisierung geben dazu eine Ereignisfolge aus:

```jsonc
{ "art": "rhythmus", "bpm": 100, "takt": [4, 4], "raster": 16, "takte": 2, "swing": 0, "beginn": 0, "dauer": 4.8, "einheit": "s", "quelle": "klang",
  "ereignisse": [{ "t": 0, "schritt": 0, "staerke": 1, "schnitt": 0 }, { "t": 0.6, "schritt": 4, "staerke": 0.85, "schnitt": 3, "rueckwaerts": true }] }
{ "art": "schnitte", "beginn": 0, "dauer": 6.2, "einheit": "s", "quelle": "klang",
  "ereignisse": [{ "t": 0, "staerke": 0.8, "schnitt": 5, "quelle": 1.25, "wiederholung": 1 }] }
```

## Erzeugter Klang (seit 0.6.0)

Der Klangerzeuger (`lab.klang`) legt AUDIO-Ergebnisse an, die zu einem Knoten gehören. Sie haben wie Tonmaterial ein Feld `ton`, dazu einen Umriss für die Anzeige. Die WAV liegt unter `medien/<id>.wav`. Die Partitur ist eine Ereignisfolge mit `art: "partitur"`:

```jsonc
{ "typ": "AUDIO", "titel": "Klang: Bild gelesen, 8 s", "datei": "medien/e-….wav", "mime": "audio/wav", "knoten": "k-…",
  "ton": { "dauer": 8, "abtastrate": 44100, "kanaele": 1, "umriss": [0.12, 0.4, …] } }                   // umriss: 200 Spitzenwerte 0–1
{ "art": "partitur", "ereignisse": [{ "t": 0.42, "staerke": 0.8, "hz": 220, "wort": "Form" }], "beginn": 0, "dauer": 8, "einheit": "s", "quelle": "klang" }   // wort nur aus einer Konstellation
```

Vorgesehen, nicht gebaut (AUDIO-FORMAT.md): `METADATA` mit `art: "frequenzspektrum"`. Die Rhythmusfelder `bpm`, `takt`, `raster` gibt es seit 0.7.0 (oben).

## Kompositorisches Profil (seit 0.3.0)

Ein METADATA-Ergebnis von `lab.profil`, Definitionen in KOMPOSITION.md. Nur Zahlen, kein Bild:

```jsonc
{
  "art": "kompositorisches-profil", "version": "0.1.0", "hinweis": "Messung, keine Bewertung",
  "gemessenIn": [breite, hoehe], "messpunkte": …,            // die Werte unten: Beispielbild der Fictory
  "schwerpunkt": { "x": -0.02, "y": 0.05, "abstand": 0.08, "ausdehnung": 0.95 },
  "symmetrie": { "linksRechts": 0.46, "obenUnten": 0.42 },
  "licht": { "helligkeit": 0.27, "gefaelleX": -0.07, "gefaelleY": 0.21, "gefaelleWinkel": 251, "gefaelleStaerke": 0.22, "mitte": 0.16 },
  "kontrast": { "gesamt": 0.27, "binnen": 0.26, "tonumfang": 0.84 },
  "farbe": { "saettigung": 0.09, "farbton": 233, "buendelung": 0.89 },
  "richtung": { "kantenWinkel": 20, "kohaerenz": 0.05, "radial": 0.63 },
  "lesarten": { "richtung.radial": "Hypothese: …", … },   // Deutungen getrennt von den Messungen
  "referenz": null                                         // vorgesehen für Quelle und Rechte eines freigegebenen Referenzbildes
}
```

Der Knoten von `lab.komposition` hält im `protokoll` fest: `reihenfolge` (die sechs Schritte), `faktoren` (die tatsächlich wirksamen, auch nach Angleichung), `zielprofil` (ja/nein), `vorher`, `nachher` (beide Profile) und `veraenderung` (Kurzzeile). Bei mehreren Varianten steht je Variante ein solcher Eintrag in einer Liste.

## Reproduzierbarkeit

- Jede Operation ist versioniert. Parameter, Startwert und Modulationsrouten der Varianten stehen im Projekt.
- `reproduzierbar: "ja"`: Gleiche Eingänge, Parameter und Startwert ergeben dieselben Pixel. Das wird für Feedback, Wiederholung, Farbe und Ketten getestet.
- `"bedingt"` gilt für die ORNA-Konstellation: Die Ziehung ist echter Zufall (`crypto.getRandomValues`). Mit Kennung und Startwert ist die Ableitung reproduzierbar.
- Steuersignale werden über ihre Ergebnis-Kennung verbunden und nicht doppelt gespeichert.
- `lab.tonsignal` ist reproduzierbar: Dieselben Abtastwerte ergeben dasselbe Signal. Die Tondatei liegt unverändert mit SHA-256 im Archiv.
- Mehrere Routen auf denselben Parameter werden summiert und erst dann begrenzt (seit Lab 0.1.1, nach VCV Rack). Mit einer Route rechnet 0.1.1 genau wie 0.1.0.
- Formatversion: Eine neue Nebenversion darf Felder hinzufügen (0.2.0: `polaritaet` je Route, `halten` je Modulator; 0.3.0: kompositorische Profile als METADATA-Ergebnisse, `befund.profil`, Eingang `profil`; 0.4.0: AUDIO-Material mit `ton`, EVENT_SEQUENCE, Steuersignale mit `achse: "zeit"`, Eingang `ton`; 0.5.0: Exporte `art: "stationen"` mit Partitur; 0.6.0: AUDIO-Ergebnisse von `lab.klang` mit `ton.umriss`, Partitur des Klangerzeugers, Eingänge `bild`, `signal`, `konstellation` ohne Pflicht, `exporte[].tonspur` bei «animation»; seit Lab 0.1.6 ohne neue Formatversion zusätzlich `art: "werk"` für den Export «Für Works»; 0.7.0: AUDIO-Ergebnisse der Klangtransformationen mit `ton.kanaele` 2 und eigener `abtastrate`, Ereignisfolgen `art: "rhythmus"` (mit `bpm`, `takt`, `raster`, `takte`, `swing`, `ereignisse[].schritt`) und `art: "schnitte"`, Eingänge `einsaetze` und `muster`, `exporte[]` mit `art: "wav"` (Name, Bittiefe, Abtastrate; die Datei kommt nicht ins Archiv); seit Lab 0.1.9 ohne neue Formatversion `exporte[].laenge` (Sekunden) bei «animation» mit frei gewählter Länge; seit Lab 0.1.10 ohne neue Formatversion bei Entscheidungen `art: "jev"` über die nächste Operation `details.quelle: "live"`, `details.zwischengespeichert` und `details.gefragt` (Zeitpunkt); seit Lab 0.1.11 ohne neue Formatversion Entscheidungen `gegenstand: "dramaturgie"` und bei `art: "stationen"` die Felder `dramaturgie` und `tonBeginn`; seit Lab 0.1.12 Entscheidungen `gegenstand: "zusammenstellung"` (gewählt ist ein Objekt mit `aufbau`, `uebergang`, `klang`, `bild`); seit Lab 0.1.14 Material aus einem Video mit `herkunft.video` (`name`, `sha256`, `dauer`, `breite`, `hoehe`, bei Standbildern `zeit`), das Video selbst liegt nicht im Archiv; seit Lab 0.1.15 in der Partitur von `art: "stationen"` das Feld `bewegung` (`staerke`, `signal`) oder null, Partitur 0.2.0; seit Lab 0.1.17 in der Partitur `lebendig` (Schalter) und im `zeitplan` je Station `lebendig: true`, Partitur 0.3.0; ältere Projekte öffnen unverändert). Eine neue Hauptversion braucht eine Migration (`ladeProjekt`).

## Vorbereitet für später

Weitere Typen (VIDEO, TEXT, GEOMETRY) sind in `kern/typen.js` benannt. AUDIO und EVENT_SEQUENCE sind seit 0.4.0 implementiert, der Klanggenerator seit 0.6.0, Klangtransformation und rhythmisches Muster seit 0.7.0 (docs/KLANGTRANSFORMATION.md). Das Frequenzspektrum steht noch offen im Register `KLANGFORMEN`. Das kompositorische Profil hält mit `referenz` einen Platz für Quelle und Rechte eines freigegebenen Referenzbildes offen. Der Wert `reproduzierbar: "nein"` mit der Befundart `modell` ist für künftige Modellaufrufe vorgesehen.
