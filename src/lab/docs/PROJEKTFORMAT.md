# Projektformat `ornament-lab-projekt` 0.1.0

Ein Projekt ist ein ZIP-Archiv (`<titel>.ornalab.zip`) mit diesem Inhalt:

```
projekt.json          Struktur, Verlauf, Entscheidungen (JSON, UTF-8)
medien/<id>.png       Bildergebnisse und Material (verlustfrei)
medien/<id>.json      Konstellationen, Steuersignale, Befunde
medien/<id>-animation.mp4|webm   exportierte Animationen
```

Die Struktur steht in JSON, die Medien liegen getrennt daneben. Beim Öffnen werden die CRC-Prüfsummen, die Pfade (kein `..`, nur `medien/`), die Formatversion (gleiche Hauptversion) und alle Verweise geprüft. Fehlende Mediendateien werden gemeldet.

## projekt.json

```jsonc
{
  "format": "ornament-lab-projekt", "formatVersion": "0.1.0", "labVersion": "0.1.0",
  "id": "p-…", "titel": "…", "modus": "manuell | jev | experimentell", "erstellt": "ISO", "geaendert": "ISO",

  "ergebnisse": [{                        // Material und alle erzeugten Zustände; nichts wird überschrieben
    "id": "m-… | e-…", "typ": "IMAGE | CONSTELLATION | CONTROL_SIGNAL | METADATA | …", "titel": "…",
    "datei": "medien/….png", "sha256": "…", "mime": "image/png", "breite": 900, "hoehe": 1273,
    "knoten": "k-… | null",               // null = importiertes Material
    "herkunft": { "art": "import", "original": { "name", "sha256", "breite", "hoehe", "mime", "bytes" } }
             | { "art": "operation", "operation": "lab.feedback" },
    "index": 0,                           // Stelle in der Reihe der Varianten
    "variante": { "stelle": 0.4, "parameter": { … }, "seed": 123, "teil": 0 },   // die tatsächlich benutzten Parameter
    "daten": { … } | null,                // bei CONSTELLATION, CONTROL_SIGNAL
    "befund": { "art": "verifiziert", … } | null
  }],

  "knoten": [{                            // eine Ausführung einer Operation
    "id": "k-…", "operation": "lab.feedback", "operationVersion": "0.1.0",
    "eingaben": { "bild": "e-…", "konstellation": "e-…" },    // nur frühere Ergebnisse (azyklisch)
    "parameter": { … },                   // bereinigt und begrenzt
    "variation": { "anzahl": 6, "achse": "varianten | zeit | beide",
                   "routen": [{ "ziel": "drehung", "tiefe": 0.5, "modulator": { "quelle": "sinus", "frequenz": 1, "phase": 0, "seed": 1 } }] },
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

## Reproduzierbarkeit

- Jede Operation ist versioniert. Parameter, Startwert und Modulationsrouten der Varianten stehen im Projekt.
- `reproduzierbar: "ja"`: Gleiche Eingänge, Parameter und Startwert ergeben dieselben Pixel. Das wird für Feedback, Wiederholung, Farbe und Ketten getestet.
- `"bedingt"` gilt für die ORNA-Konstellation: Die Ziehung ist echter Zufall (`crypto.getRandomValues`). Mit Kennung und Startwert ist die Ableitung reproduzierbar.
- Steuersignale werden über ihre Ergebnis-Kennung verbunden und nicht doppelt gespeichert.
- Formatversion: Eine neue Nebenversion darf Felder hinzufügen. Eine neue Hauptversion braucht eine Migration (`ladeProjekt`).

## Vorbereitet für später

Weitere Typen (VIDEO, AUDIO, TEXT, GEOMETRY, EVENT_SEQUENCE) sind in `kern/typen.js` benannt. `herkunft` kann Referenzmetadaten tragen, etwa ein späteres kompositorisches Profil mit Bildausschnitt, Symmetrie, Licht und Farbverteilung ohne fremde Bilder. Der Wert `reproduzierbar: "nein"` mit der Befundart `modell` ist für künftige Modellaufrufe vorgesehen.
