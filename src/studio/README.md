# ornament.studio – Audio-Werkstatt

Alte, eigene Rap-Mixe in Spuren zerlegen, putzen und neu mastern. Grundlage für
neue Beats, Remixes und Stiländerungen. Liegt unter `src/` und wird deshalb nicht
auf die Website hochgeladen.

## Ablauf (`ablauf.py`)

1. Trennen mit Demucs `htdemucs_ft`, viermal versetzt gemittelt (`--shifts 4`)
2. `putzen.py`: Drums unter 120 Hz nur rund um die Kicks offen (Bassreste weg),
   Rest entrauscht (noisereduce)
3. `raster.py`: lernt das Takt-Muster der Drums und dämpft, was nicht hineinpasst
   (Klicks, Atem, Griffgeräusche des Stimm-Mikrofons, Intro mit offenem Mikro)
4. Zweiter Demucs-Durchgang auf Drums und Rest, erkannte Stimm- und Bassreste
   werden abgezogen (die Modellausgabe selbst verliert bei manchen Tracks Pegel)
5. `raum.py`: Faltungshall auf dem Rest (Samples), Standard «weit»: 40 %, 2,6 s,
   Hall nur 250–6500 Hz
6. Stimme fürs Song-Master: Präsenz-EQ und parallele Kompression (Druck). Doppelung
   links/rechts (Weite) und kurzer Hall sind vorbereitet, aber aus
   (`STIMME_DOPPEL`, `STIMME_HALL`), Christian wählte «nur Druck»
7. Zwei Master nach Vorbild (Matchering), −14 LUFS, Spitze −1 dBFS:
   `beat-master` (ohne Stimme, Vorbild = Instrumental von Spellbound) und
   `song-master` (mit Stimme, Vorbild = Spellbound)

```
python ablauf.py track.wav ziel/ [--drums-ab 19.4] [--bass-db 5]
python ablauf.py --nur-mastern ziel/ --drums-ab 19.4 --bass-db 5
```

`--drums-ab` schaltet die Drums bis zu dieser Sekunde stumm (z. B. Percussion vor
dem Beat), `--bass-db` hebt oder senkt den Bass. Mit `--nur-mastern` werden die
schon getrennten Spuren im Ziel-Ordner neu gemastert (Minuten statt halbe Stunde).

`mastern.py` ist ein Stem-Mastering ohne Vorbild (Ketten je Spur, Bus-Kompressor,
Limiter, Ziel-LUFS), für Fälle ohne passende Referenz.

## Remix «Jungle-Halftime» (`jungle.py`)

```
python jungle.py <stems-ordner> ziel.wav [172]
```

Misst Tempo und Schläge der Drums, dehnt Drums, Bass und Rest (mit Raum) per
Rubberband auf das halbe Zieltempo und legt einen Jungle-Break darüber, gebaut aus
eigenen Kick-, Snare- und Hi-Hat-Schlägen. Der Break hängt an den gemessenen
Schlägen (ein Original-Schlag = acht Sechzehntel), driftet also nicht. Danach mit
`ablauf.mastern_nach` nach Vorbild mastern.

## Ergebnis im Ziel-Ordner

| Datei | Inhalt |
|---|---|
| `drums.wav`, `bass.wav`, `rest.wav`, `stimme.wav` | geputzte Spuren |
| `rest-raum.wav` | Rest mit Hall |
| `*-roh.wav` | erste Trennung ohne Putzen |
| `beat-ohne-stimme.wav`, `song.wav` | Summen vor dem Master |
| `beat-master.wav/.mp3`, `song-master.wav/.mp3` | fertige Master |

## Einrichten

```
python3 -m venv venv
venv/bin/pip install -r requirements.txt
```

Demucs lädt seine Modelle von `dl.fbaipublicfiles.com`; in Cloud-Sitzungen muss
diese Domain in der Umgebung freigegeben sein. PyTorch kommt von pypi
(`download.pytorch.org` ist gesperrt). Vorbilder liegen in
`/mnt/project-files/studio/referenzen/` (oder `STUDIO_REFERENZEN`), nicht im Repo.

Dauer auf 4 CPU-Kernen: etwa 10 Minuten pro Minute Musik.
