"""Ganzer Ablauf für einen alten Mix: Spuren trennen, putzen, Beat ohne Stimme mastern.

  1. Demucs htdemucs_ft, viermal versetzt gemittelt (--shifts 4)
  2. putzen.py: Bassreste aus den Drums, Rauschen aus dem Rest
  3. raster.py: Mikrofongeräusche ausserhalb des Drum-Musters
  4. zweiter Demucs-Durchgang auf Drums und Rest, erkannte Stimm-/Bassreste abziehen
  5. raum.py: Hall auf dem Rest (Standard «weit»: 40 %, 2,6 s)
  6. Stimme fürs Song-Master: mehr Druck, Weite (Doppelung), wenig Hall
  7. Master ohne Stimme (beat-master) und mit Stimme (song-master), Matchering
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
from scipy.signal import butter, fftconvolve, sosfilt

HIER = Path(__file__).parent
# Vorbilder liegen nicht im Repo (fremde Aufnahmen), sondern im Projektordner
REFERENZEN = Path(os.environ.get("STUDIO_REFERENZEN", "/mnt/project-files/studio/referenzen"))
VORBILD = REFERENZEN / "spellbound-instrumental.wav"   # für den Beat
VORBILD_SONG = REFERENZEN / "spellbound.wav"            # mit Stimme
ZIEL_LUFS = -14.0
RAUM_ANTEIL, RAUM_NACHHALL = 0.4, 2.6   # Christians Wahl 2026-10-29: «Raum weit»
# Stimme im Song-Master (Christian 2026-10-29: «mehr Druck, Weite und wenig Hall»;
# gewählt hat er danach die Fassung «nur Druck», Doppelung und Hall sind darum aus)
STIMME_DB = 1.5          # etwas lauter im Mix
STIMME_DOPPEL = 0.0     # Anteil der Doppelung links/rechts (±8 Cent, 11/17 ms)
STIMME_HALL = 0.0        # kurzer heller Raum, 1,1 s


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


def stimme_formen(quelle, aus, tmp):
    """Druck: Präsenz-EQ und parallele Kompression. Weite: leicht verstimmte, verzögerte
    Doppelung nach links und rechts, die Mitte bleibt trocken. Dazu wenig kurzer Hall."""
    run("ffmpeg", "-hide_banner", "-loglevel", "error", "-y", "-i", quelle, "-af",
        "equalizer=f=280:t=q:w=1:g=-2,equalizer=f=3200:t=q:w=1.2:g=2.5,"
        "highshelf=f=9000:g=1.5", "-c:a", "pcm_f32le", tmp / "st-eq.wav")
    run("ffmpeg", "-hide_banner", "-loglevel", "error", "-y", "-i", tmp / "st-eq.wav", "-af",
        "acompressor=threshold=0.04:ratio=8:attack=3:release=60:makeup=4:knee=2",
        "-c:a", "pcm_f32le", tmp / "st-hart.wav")
    x, sr = sf.read(tmp / "st-eq.wav", always_2d=True)
    h, _ = sf.read(tmp / "st-hart.wav", always_2d=True)
    m, seite = x.mean(1), (x[:, 0] - x[:, -1]) / 2      # vorhandene Breite bleibt erhalten
    hm = h.mean(1)
    m = m + 0.8 * hm * np.sqrt((m ** 2).mean() / ((hm ** 2).mean() + 1e-12))   # parallel
    sf.write(tmp / "st-mitte.wav", m, sr, subtype="FLOAT")
    seiten = []
    for cent, ms in ((8, 11), (-8, 17)):
        run("ffmpeg", "-hide_banner", "-loglevel", "error", "-y", "-i", tmp / "st-mitte.wav", "-af",
            f"rubberband=pitch={2 ** (cent / 1200)},adelay={ms},highpass=f=200",
            "-c:a", "pcm_f32le", tmp / "st-seite.wav")
        y, _ = sf.read(tmp / "st-seite.wav")
        seiten.append(np.pad(y, (0, max(0, len(m) - len(y))))[: len(m)])
    out = np.stack([m + seite + STIMME_DOPPEL * seiten[0], m - seite + STIMME_DOPPEL * seiten[1]], 1)
    # wenig Hall: erzeugte Raumantwort, 25 ms Vorverzögerung, nur 300–7000 Hz
    rng = np.random.default_rng(7)
    n = int(1.1 * sr)
    t = np.arange(n) / sr
    band = butter(2, [300, 7000], "bandpass", fs=sr, output="sos")
    for k in range(2):
        ir = rng.standard_normal(n) * np.exp(-6.9 * t / 1.1)
        ir[: int(0.025 * sr)] = 0
        ir /= np.sqrt((ir ** 2).sum())
        nass = fftconvolve(sosfilt(band, out[:, k]), ir)[: len(out)]
        out[:, k] += STIMME_HALL * nass * np.sqrt((out[:, k] ** 2).mean() / ((nass ** 2).mean() + 1e-12))
    out *= np.sqrt((x ** 2).mean() / ((out ** 2).mean() + 1e-12)) * 10 ** (STIMME_DB / 20)
    sf.write(aus, out, sr, subtype="FLOAT")


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
    stimme_putzen(ziel / "stimme.wav", tmp / "stimme-geputzt.wav")
    stimme_formen(tmp / "stimme-geputzt.wav", tmp / "stimme.wav", tmp)
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
