"""Hall/Raum für eine Spur (gedacht für Rest/Samples).

Faltungshall mit einer erzeugten Raumantwort: Vorverzögerung, frühe
Reflexionen, exponentiell abklingender Nachhall, links/rechts verschieden.
Der Hallanteil wird unten (< TIEF Hz) und oben (> HOCH Hz) beschnitten,
damit der Bass sauber bleibt und der Raum warm und dunkel klingt.

Aufruf: raum.py <ein.wav> <aus.wav> [anteil 0..1] [nachhall_s]
"""
import sys

import numpy as np
import soundfile as sf
from scipy.signal import butter, fftconvolve, sosfilt

VORVERZOEGERUNG = 0.025  # s
TIEF, HOCH = 250, 6500   # Hz, Bandgrenzen des Halls


def raumantwort(sr, nachhall, seed):
    rng = np.random.default_rng(seed)
    n = int(sr * (nachhall + VORVERZOEGERUNG))
    t = np.arange(n) / sr
    ir = rng.standard_normal(n) * np.exp(-6.9 * t / nachhall)   # -60 dB nach «nachhall»
    ir[: int(sr * VORVERZOEGERUNG)] = 0
    for zeit, pegel in ((0.031, 0.5), (0.043, 0.35), (0.057, 0.3), (0.071, 0.2)):
        ir[int(sr * zeit)] += pegel * rng.choice([-1, 1])
    # Höhen klingen schneller ab: sanfter Tiefpass, der mit der Zeit schliesst
    sos = butter(2, HOCH, "low", fs=sr, output="sos")
    ir = 0.5 * ir + 0.5 * sosfilt(sos, ir)
    return ir / np.sqrt((ir ** 2).sum())


def main():
    x, sr = sf.read(sys.argv[1], always_2d=True)
    anteil = float(sys.argv[3]) if len(sys.argv) > 3 else 0.25
    nachhall = float(sys.argv[4]) if len(sys.argv) > 4 else 1.8
    band = butter(2, [TIEF, HOCH], "bandpass", fs=sr, output="sos")
    send = sosfilt(band, x, axis=0)
    nass = np.stack([fftconvolve(send[:, k], raumantwort(sr, nachhall, 7 + k))[: len(x)]
                     for k in range(x.shape[1])], axis=1)
    # Hall auf gleiche Lautheit wie die Spur bringen, dann mischen
    nass *= np.sqrt((x ** 2).mean() / ((nass ** 2).mean() + 1e-12))
    y = (1 - anteil * 0.5) * x + anteil * nass
    sf.write(sys.argv[2], y, sr, subtype="FLOAT")
    print(f"Raum: Anteil {anteil:.0%}, Nachhall {nachhall:.1f} s")


if __name__ == "__main__":
    main()
