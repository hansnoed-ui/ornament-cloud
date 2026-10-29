"""Stem-Mastering für einen Beat ohne Stimme.

Jede Spur bekommt ihre eigene Kette, dann Summenkette und Lautheit:
  drums  Tiefschnitt 30 Hz, Kompressor (Punch), leichte Präsenz
  bass   Tiefschnitt 28 Hz, Kompressor, sanfte Sättigung, unter 150 Hz mono
  rest   Tiefschnitt 90 Hz (Platz für den Bass), Mulm 300 Hz weg, etwas breiter
  summe  Bus-Kompressor, Limiter mit Überabtastung, Ziel ZIEL_LUFS, Spitze -1 dBTP

Aufruf: mastern.py <drums.wav> <bass.wav> <rest.wav> <ziel.wav> [ziel_lufs]
"""
import subprocess
import sys
import tempfile
from pathlib import Path

import numpy as np
import pyloudnorm as pyln
import soundfile as sf

KETTE = {
    "drums": "highpass=f=30:poles=2,"
             "acompressor=threshold=0.12:ratio=3:attack=8:release=90:makeup=1.6:knee=3,"
             "equalizer=f=5000:t=q:w=0.8:g=1.5",
    "bass": "highpass=f=28:poles=2,"
            "acompressor=threshold=0.15:ratio=3:attack=15:release=150:makeup=1.4:knee=4,"
            "asoftclip=type=tanh:threshold=0.9,"
            "acrossover=split=150[lo][hi];[lo]pan=stereo|c0=0.5*c0+0.5*c1|c1=0.5*c0+0.5*c1[lom];"
            "[lom][hi]amix=inputs=2:normalize=0",
    "rest": "highpass=f=90:poles=2,"
            "equalizer=f=300:t=q:w=1.0:g=-2,"
            "extrastereo=m=1.15",
}
SUMME = "acompressor=threshold=0.25:ratio=2:attack=30:release=200:makeup=1:knee=6"


def ff(ein, filt, aus):
    cmd = ["ffmpeg", "-hide_banner", "-loglevel", "error", "-y", "-i", str(ein)]
    cmd += ["-filter_complex", f"[0:a]{filt}"] if ";" in filt or "[" in filt else ["-af", filt]
    subprocess.run(cmd + ["-c:a", "pcm_f32le", str(aus)], check=True)


def main():
    drums, bass, rest, ziel = map(Path, sys.argv[1:5])
    ziel_lufs = float(sys.argv[5]) if len(sys.argv) > 5 else -10.0
    tmp = Path(tempfile.mkdtemp())
    for name, quelle in (("drums", drums), ("bass", bass), ("rest", rest)):
        ff(quelle, KETTE[name], tmp / f"{name}.wav")
    spuren = [sf.read(tmp / f"{n}.wav", always_2d=True)[0] for n in ("drums", "bass", "rest")]
    sr = sf.info(tmp / "drums.wav").samplerate
    n = min(len(s) for s in spuren)
    summe = sum(s[:n] for s in spuren)
    sf.write(tmp / "summe.wav", summe, sr, subtype="FLOAT")
    ff(tmp / "summe.wav", SUMME, tmp / "bus.wav")

    # Lautheit: Pegel so setzen, dass nach dem Limiter ZIEL_LUFS herauskommt
    messer = pyln.Meter(sr)
    bus, _ = sf.read(tmp / "bus.wav", always_2d=True)
    gain = ziel_lufs - messer.integrated_loudness(bus)
    for _ in range(4):
        limit = (f"volume={gain:.2f}dB,aresample=176400,"
                 "alimiter=limit=0.891:attack=1:release=60:level=false,aresample=44100")
        ff(tmp / "bus.wav", limit, tmp / "fertig.wav")
        fertig, _ = sf.read(tmp / "fertig.wav", always_2d=True)
        ist = messer.integrated_loudness(fertig)
        if abs(ist - ziel_lufs) < 0.2:
            break
        gain += ziel_lufs - ist
    sf.write(ziel, np.clip(fertig, -1, 1), sr, subtype="PCM_24")
    # bearbeitete Einzelspuren daneben, ohne Summenkette, als 32-Bit-Float (kein Übersteuern)
    for name, s in zip(("drums", "bass", "rest"), spuren):
        sf.write(ziel.with_name(f"{name}-gemastert.wav"), s, sr, subtype="FLOAT")
    print(f"{ziel.name}: {ist:.1f} LUFS, Spitze {20 * np.log10(np.abs(fertig).max()):.1f} dBFS")


if __name__ == "__main__":
    main()
