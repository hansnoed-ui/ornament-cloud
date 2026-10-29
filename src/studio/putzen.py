"""Nachputzen getrennter Spuren.

drums: Tiefband (< TRENN Hz) nur rund um Kick-Einsätze offen lassen, damit
       stehende Bassreste verschwinden; Höhen bleiben unangetastet.
other: stationäres Rauschen mit noisereduce absenken.

Aufruf: putzen.py <stems-ordner> <ziel-ordner>
"""
import sys
from pathlib import Path

import numpy as np
import noisereduce as nr
import soundfile as sf
from scipy.signal import butter, sosfiltfilt

TRENN = 120      # Hz, Grenze Tiefband
HALTEN = 0.14    # s, so lange bleibt das Tor nach einem Kick offen
FREIGABE = 0.05  # s, Ausklingen des Tors


def glaetten(x, sr, ms):
    n = max(1, int(sr * ms / 1000))
    k = np.ones(n) / n
    return np.convolve(x, k, mode="same")


def drums_putzen(x, sr):
    sos = butter(4, TRENN, btype="low", fs=sr, output="sos")
    tief = sosfiltfilt(sos, x, axis=0)
    hoch = x - tief                      # ergänzt sich exakt zum Original
    mono = np.abs(tief).mean(axis=1)
    schnell = glaetten(mono, sr, 5)
    langsam = glaetten(mono, sr, 120)
    # Einsatz: schnelle Hülle springt deutlich über die langsame
    anstieg = np.maximum(schnell - 1.6 * langsam, 0)
    schwelle = np.percentile(schnell, 60) * 0.5
    einsatz = (anstieg > schwelle).astype(float)
    # vorlaufend 5 ms öffnen, HALTEN offen halten
    vor = int(sr * 0.005)
    einsatz = np.roll(einsatz, -vor)
    h = int(sr * HALTEN)
    tor = (np.convolve(einsatz, np.ones(h))[: len(einsatz)] > 0).astype(float)
    tor = glaetten(tor, sr, FREIGABE * 1000)
    tor = np.clip(tor * 1.2, 0, 1)
    rest = 0.08                          # ganz zu klingt unnatürlich
    tor = rest + (1 - rest) * tor
    return hoch + tief * tor[:, None], float(tor.mean())


def rest_putzen(x, sr):
    y = nr.reduce_noise(y=x.T, sr=sr, stationary=True, prop_decrease=0.75,
                        n_fft=4096, freq_mask_smooth_hz=300)
    return y.T


def main():
    quelle, ziel = Path(sys.argv[1]), Path(sys.argv[2])
    ziel.mkdir(parents=True, exist_ok=True)
    x, sr = sf.read(quelle / "drums.wav", always_2d=True)
    y, offen = drums_putzen(x, sr)
    sf.write(ziel / "drums.wav", y, sr, subtype="PCM_24")
    print(f"drums: Tiefband im Mittel {offen:.0%} offen")
    x, sr = sf.read(quelle / "other.wav", always_2d=True)
    sf.write(ziel / "other.wav", rest_putzen(x, sr), sr, subtype="PCM_24")
    print("other: entrauscht")


if __name__ == "__main__":
    main()
