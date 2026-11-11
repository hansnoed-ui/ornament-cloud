---
name: stems
description: Eigene Rap-Tracks von Christian (ornament.studio) in Spuren zerlegen, putzen und nach dem Spellbound-Profil mastern – mit und ohne Stimme. Verwenden, wenn ein Track hochgeladen wird zum Trennen, Mastern, Reinigen, für Beats ohne Stimme, Stems, Remixes oder Stiländerungen.
---

# Stems und Master für ornament.studio

Quellcode: `src/studio/` (Python). Lies zuerst `src/studio/README.md`.

## Einrichten (einmal pro Sitzung)

```
python3 -m venv /tmp/studio-venv
/tmp/studio-venv/bin/pip install -q -r src/studio/requirements.txt
```

Prüfen, dass `dl.fbaipublicfiles.com` erreichbar ist (Demucs-Modelle). Sonst Christian bitten,
die Domain in den Projekteinstellungen → Cloud environment → Zahnrad → Allowed domains freizugeben.

## Vorgehen pro Track

1. Upload in einen eigenen Ordner kopieren, Länge, Format und Bitrate mit `ffprobe` prüfen
   (Dateinamen lügen manchmal: «320kbps» kann 128 kbps sein, dann Christian sagen).
2. Ganzen Ablauf im Hintergrund starten (etwa 10 min pro Minute Musik):
   `/tmp/studio-venv/bin/python src/studio/ablauf.py <track> /mnt/project-files/studio/stems/<kurzname>`
3. Ergebnis prüfen, bevor es zu Christian geht: Lautheit jeder Spur mit `ebur128` messen und mit der
   Roh-Trennung (`*-roh.wav`) vergleichen. Eine Spur, die mehrere dB leiser ist als roh, ist ein Fehler.
4. Seite zum Anhören als Artifact: Master ohne Stimme, Master mit Stimme, Original, Mischpult
   (Stimme stumm vorgewählt) und Einzelspuren. Christian hört am Handy und kann Dateien aus dem
   Projektordner nicht direkt laden, deshalb immer Seite plus Datei-Karten.
5. Wünsche zum Nachbessern mit `--nur-mastern` umsetzen (Minuten statt halbe Stunde):
   `--drums-ab SEK` (Percussion oder Geräusche vor dem Beat stumm), `--bass-db DB`.

## Was Christian bisher entschieden hat

- Stimme muss für die Beats nicht sauber sein, die Beat-Bausteine schon.
- Profil: «Spellbound, nachgeputzt + Raum weit» (Hall 40 %, 2,6 s auf den Samples), −14 LUFS.
- Pro Track zwei Master für ihn selbst: mit und ohne Stimme. Stimme im Song-Master mit
  mehr Druck (2026-10-29, `stimme_formen` in ablauf.py). Doppelung und Hall auf der
  Stimme hat er im Vergleich abgewählt («die Stimme war vorher besser»).
- Er hat fast keine Einzelspuren und will gerade fertige Tracks zerlegen und neu
  zusammensetzen. Für Umbauten ganze Takte der Stems nutzen, keine einzeln
  geschnittenen Schläge oder Töne (klingen übersteuert). Kein Jungle.
- Mikrofongeräusche (Stimm-Mikro offen) landen oft in der Drumspur, besonders vor dem Beat.

Jede Abschlussmeldung endet mit «So nutzt du es» (wo tippen, welche Datei).
