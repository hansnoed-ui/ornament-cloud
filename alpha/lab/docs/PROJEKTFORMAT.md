# Projektformat `ornament-lab-projekt` 0.4.0

Ein Projekt ist ein ZIP-Archiv (`<titel>.ornalab.zip`) mit diesem Inhalt:

```
projekt.json          Struktur, Verlauf, Entscheidungen (JSON, UTF-8)
medien/<id>.png       Bildergebnisse und Material (verlustfrei)
medien/<id>.json      Konstellationen, Steuersignale, Ereignisfolgen, Befunde
medien/<id>.wav|mp3|ogg|flac|m4a|…   Tonmaterial, unverändert (seit 0.4.0)
medien/<id>-animation.mp4|webm   exportierte Animationen
```

Die Struktur steht in JSON, die Medien liegen getrennt daneben. Beim Öffnen werden die CRC-Prüfsummen, die Pfade (kein `..`, nur `medien/`), die Formatversion (gleiche Hauptversion) und alle Verweise geprüft. Fehlende Mediendateien werden gemeldet.

## projekt.json

```jsonc
{
  "format": "ornament-lab-projekt", "formatVersion": "0.4.0", "labVersion": "0.1.3",
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
  "exporte": [{ "art": "animation | verlauf", "ergebnis": "e-…", "datei": "medien/…", "codec": "avc1.640028", "bilder": 451, "fps": 30, "sha256": "…" }],
  "meldungen": [{ "zeit": "ISO", "art": "warnung | hinweis", "text": "…" }]
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

Vorgesehen, nicht gebaut (AUDIO-FORMAT.md): `METADATA` mit `art: "frequenzspektrum"` und an Ereignisfolgen `bpm`, `takt`, `raster`.

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
- Formatversion: Eine neue Nebenversion darf Felder hinzufügen (0.2.0: `polaritaet` je Route, `halten` je Modulator; 0.3.0: kompositorische Profile als METADATA-Ergebnisse, `befund.profil`, Eingang `profil`; 0.4.0: AUDIO-Material mit `ton`, EVENT_SEQUENCE, Steuersignale mit `achse: "zeit"`, Eingang `ton`; ältere Projekte öffnen unverändert). Eine neue Hauptversion braucht eine Migration (`ladeProjekt`).

## Vorbereitet für später

Weitere Typen (VIDEO, TEXT, GEOMETRY) sind in `kern/typen.js` benannt. AUDIO und EVENT_SEQUENCE sind seit 0.4.0 implementiert, die übrigen Klangformen (Spektrum, Rhythmus, Generator, Transformation) stehen im Register `KLANGFORMEN`. Das kompositorische Profil hält mit `referenz` einen Platz für Quelle und Rechte eines freigegebenen Referenzbildes offen. Der Wert `reproduzierbar: "nein"` mit der Befundart `modell` ist für künftige Modellaufrufe vorgesehen.
