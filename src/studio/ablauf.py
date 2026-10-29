"""Ganzer Ablauf für einen alten Mix: Spuren trennen, putzen, Beat ohne Stimme mastern.

  1. Demucs htdemucs_ft, viermal versetzt gemittelt (--shifts 4)
  2. putzen.py: Bassreste aus den Drums, Rauschen aus dem Rest
  3. raster.py: Mikrofongeräusche ausserhalb des Drum-Musters
  4. zweiter Demucs-Durchgang auf Drums und Rest, erkannte Stimm-/Bassreste abziehen
  5. raum.py: Hall auf dem Rest (Standard «weit»: 40 %, 2,6 s)
  6. Master ohne Stimme (beat-master) und mit Stimme (song-master), Matchering
     nach Vorbild (Standard: Spellbound), -14 LUFS

Aufruf (im venv mit demucs, matchering, noisereduce, pyloudnorm):
  python ablauf.py <track.mp3|wav> <ziel-ordner> [--drums-ab SEK] [--bass-db DB]
  python ablauf.py --nur-mastern <ziel-ordner> [--drums-ab SEK] [--bass-db DB]
    (nimmt die schon getrennten Spuren im Ziel-Ordner und mastert neu)
"""
import os
import subprocess
import sys
import tempfile
from pathlib import Path

import matchering as mg
import numpy as np
import pyloudnorm as pyln
import soundfile as sf

HIER = Path(__file__).parent
# Vorbilder liegen nicht im Repo (fremde Aufnahmen), sondern im Projektordner
REFERENZEN = Path(os.environ.get("STUDIO_REFERENZEN", "/mnt/project-files/studio/referenzen"))
VORBILD = REFERENZEN / "spellbound-instrumental.wav"   # für den Beat
VORBILD_SONG = REFERENZEN / "spellbound.wav"            # mit Stimme
ZIEL_LUFS = -14.0
RAUM_ANTEIL, RAUM_NACHHALL = 0.4, 2.6   # Christians Wahl 2026-10-29: «Raum weit»


def run(*cmd):
    subprocess.run([str(c) for c in cmd], check=True)


def demucs(eingang, aus, shifts=1):
    run(sys.executable, "-m", "demucs", "-n", "htdemucs_ft", "--shifts", shifts,
        "--overlap", "0.5", "-o", aus, eingang)
    return Path(aus) / "htdemucs_ft" / Path(eingang).stem


def abziehen(eingang, reste, aus):
    x, sr = sf.read(eingang, always_2d=True)
    for r in reste:
        y, _ = sf.read(r, always_2d=True)
        n = min(len(x), len(y))
        x[:n] -= y[:n]
    sf.write(aus, x, sr, subtype="PCM_24")


def summe(dateien, aus):
    ein = sum((["-i", str(d)] for d in dateien), [])
    run("ffmpeg", "-hide_banner", "-loglevel", "error", "-y", *ein, "-filter_complex",
        f"amix=inputs={len(dateien)}:normalize=0,alimiter=limit=0.94:level=false",
        "-c:a", "pcm_s24le", aus)


def trennen(track, ziel, tmp):
    roh = demucs(track, tmp / "roh", shifts=4)
    for s in ("drums", "bass", "vocals", "other"):
        run("cp", roh / f"{s}.wav", ziel / f"{s}-roh.wav")
    run(sys.executable, HIER / "putzen.py", roh, tmp / "putz")
    run(sys.executable, HIER / "raster.py", tmp / "putz" / "drums.wav", tmp / "drums.wav")
    run("cp", tmp / "putz" / "other.wav", tmp / "rest.wav")

    zwei = tmp / "zwei"
    d2 = demucs(tmp / "drums.wav", zwei)
    r2 = demucs(tmp / "rest.wav", zwei)
    # Nur die erkannten Reste abziehen (Stimme, Bass). Die Drum-Ausgabe des Modells
    # selbst zu nehmen, verliert bei manchen Tracks viel Pegel (htdemucs_ft-Modelle
    # summieren sich nicht zum Eingang), deshalb Eingang minus Reste.
    abziehen(tmp / "drums.wav", [d2 / "vocals.wav", d2 / "bass.wav"], ziel / "drums.wav")
    abziehen(tmp / "rest.wav", [r2 / "vocals.wav", r2 / "bass.wav"], ziel / "rest.wav")
    run("cp", roh / "bass.wav", ziel / "bass.wav")
    run("cp", roh / "vocals.wav", ziel / "stimme.wav")
    run(sys.executable, HIER / "raum.py", ziel / "rest.wav", ziel / "rest-raum.wav",
        RAUM_ANTEIL, RAUM_NACHHALL)


def anpassen(quelle, aus, gain_db=0.0, ab=0.0):
    """Pegel ändern und/oder alles vor «ab» Sekunden stumm (50 ms Einblendung)."""
    x, sr = sf.read(quelle, always_2d=True)
    x = x * 10 ** (gain_db / 20)
    if ab > 0:
        i, f = int(ab * sr), int(0.05 * sr)
        g = np.ones(len(x))
        g[: max(0, i - f)] = 0
        g[max(0, i - f):i] = np.linspace(0, 1, i - max(0, i - f))
        x = x * g[:, None]
    sf.write(aus, x, sr, subtype="FLOAT")


def stimme_putzen(quelle, aus):
    run("ffmpeg", "-hide_banner", "-loglevel", "error", "-y", "-i", quelle, "-af",
        "highpass=f=80:poles=2,adeclick,"
        "acompressor=threshold=0.2:ratio=2.5:attack=10:release=120:makeup=1.2:knee=4",
        "-c:a", "pcm_f32le", aus)


def mastern_nach(eingang, vorbild, aus, tmp):
    mg.process(target=str(eingang), reference=str(vorbild), results=[mg.pcm24(str(tmp / "match.wav"))])
    x, sr = sf.read(tmp / "match.wav", always_2d=True)
    y = x * 10 ** ((ZIEL_LUFS - pyln.Meter(sr).integrated_loudness(x)) / 20)
    spitze = 20 * np.log10(np.abs(y).max())
    if spitze > -1:
        y *= 10 ** ((-1 - spitze) / 20)
    sf.write(aus, y, sr, subtype="PCM_24")
    run("ffmpeg", "-hide_banner", "-loglevel", "error", "-y", "-i", aus, "-b:a", "320k",
        aus.with_suffix(".mp3"))
    print(f"{aus.name}: {pyln.Meter(sr).integrated_loudness(y):.1f} LUFS")


def mastern(ziel, tmp, drums_ab=0.0, bass_db=0.0):
    anpassen(ziel / "drums.wav", tmp / "drums.wav", ab=drums_ab)
    anpassen(ziel / "bass.wav", tmp / "bass.wav", gain_db=bass_db)
    stimme_putzen(ziel / "stimme.wav", tmp / "stimme.wav")
    beat = [tmp / "drums.wav", tmp / "bass.wav", ziel / "rest-raum.wav"]
    summe(beat, ziel / "beat-ohne-stimme.wav")
    summe(beat + [tmp / "stimme.wav"], ziel / "song.wav")
    mastern_nach(ziel / "beat-ohne-stimme.wav", VORBILD, ziel / "beat-master.wav", tmp)
    mastern_nach(ziel / "song.wav", VORBILD_SONG, ziel / "song-master.wav", tmp)


def main():
    import argparse
    p = argparse.ArgumentParser()
    p.add_argument("pfade", nargs="+", help="<track> <ziel> oder mit --nur-mastern nur <ziel>")
    p.add_argument("--nur-mastern", action="store_true")
    p.add_argument("--drums-ab", type=float, default=0.0, help="Drums vor dieser Sekunde stumm")
    p.add_argument("--bass-db", type=float, default=0.0, help="Bass lauter/leiser in dB")
    a = p.parse_args()
    ziel = Path(a.pfade[-1])
    ziel.mkdir(parents=True, exist_ok=True)
    tmp = Path(tempfile.mkdtemp())
    if not a.nur_mastern:
        trennen(Path(a.pfade[0]), ziel, tmp)
    mastern(ziel, tmp, a.drums_ab, a.bass_db)
    print(f"fertig: {ziel}")


if __name__ == "__main__":
    main()
