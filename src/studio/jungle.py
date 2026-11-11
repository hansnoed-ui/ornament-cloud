"""Remix «Jungle-Halftime»: Track auf das halbe Tempo von 172 BPM ziehen und einen
Jungle-Break aus den eigenen Drum-Schlägen darüberlegen.

  1. Tempo und Schlagraster der Drums messen (librosa)
  2. Alle Spuren mit Rubberband auf ZIEL_BPM/2 dehnen (Tonhöhe bleibt)
  3. Aus der Drumspur je einen Kick, eine Snare und eine Hi-Hat herausschneiden
  4. Daraus einen Break im Raster von ZIEL_BPM bauen (Muster unten), ab dem ersten Schlag
  5. Summe mit Original-Drums (leiser), Bass, Rest mit Raum; Master nach Vorbild

Aufruf: jungle.py <stems-ordner> <ziel.wav> [ziel_bpm]
"""
import subprocess
import sys
import tempfile
from pathlib import Path

import librosa
import numpy as np
import soundfile as sf

ZIEL_BPM = 172.0
# 16tel eines Takts bei ZIEL_BPM: K Kick, S Snare, g Geister-Snare, . leer
MUSTER = [
    "K.K...S...KK..S.",   # Takt 1
    "K.....S.g.K.g.S.",   # Takt 2
    "K.K...S...K...S.",   # Takt 3
    "..K.g.S.K.K.SgSS",   # Takt 4 mit Wirbel
]
HATS = "x.x.x.x.x.x.x.x."
PEGEL = {"K": 1.0, "S": 0.9, "g": 0.35, "x": 0.25}
ORIGINAL_DRUMS_DB = -6


def dehnen(ein, aus, faktor):
    subprocess.run(["ffmpeg", "-hide_banner", "-loglevel", "error", "-y", "-i", str(ein), "-af",
                    f"rubberband=tempo={faktor}:transients=crisp:detector=percussive",
                    "-c:a", "pcm_f32le", str(aus)], check=True)


def schlaege(drums, sr):
    """Bester Kick, beste Snare, beste Hi-Hat: lauteste Einsätze mit passendem Spektrum."""
    mono = drums.mean(1)
    on = librosa.onset.onset_detect(y=mono, sr=sr, units="samples", backtrack=True)
    n = int(0.22 * sr)
    kand = {"K": [], "S": [], "x": []}
    for o in on:
        s = mono[o:o + n]
        if len(s) < n:
            continue
        S = np.abs(np.fft.rfft(s * np.hanning(n)))
        f = np.fft.rfftfreq(n, 1 / sr)
        tief = S[f < 120].sum(); mitte = S[(f > 150) & (f < 2500)].sum(); hoch = S[f > 6000].sum()
        ges = tief + mitte + hoch + 1e-9
        laut = np.abs(s).max()
        if tief / ges > 0.55:
            kand["K"].append((laut, o))
        elif mitte / ges > 0.5 and hoch / ges > 0.08:
            kand["S"].append((laut, o))
        elif hoch / ges > 0.45:
            kand["x"].append((laut, o))
    out = {}
    for k, laenge in (("K", 0.25), ("S", 0.22), ("x", 0.08)):
        if not kand[k]:
            raise SystemExit(f"kein Schlag für {k} gefunden")
        # nicht den allerlautesten (oft mit Überlagerung), sondern das 80. Perzentil
        kand[k].sort()
        o = kand[k][int(len(kand[k]) * 0.8)][1]
        m = int(laenge * sr)
        s = drums[o:o + m].copy()
        s *= np.linspace(1, 0, m)[:, None] ** 2          # ausklingen
        s[:64] *= np.linspace(0, 1, 64)[:, None]          # kein Knacken
        out[k] = s / (np.abs(s).max() + 1e-9)
        out["g"] = out.get("S")
    out["g"] = out["S"]
    return out


def main():
    quelle, ziel = Path(sys.argv[1]), Path(sys.argv[2])
    ziel_bpm = float(sys.argv[3]) if len(sys.argv) > 3 else ZIEL_BPM
    tmp = Path(tempfile.mkdtemp())

    y, sr = librosa.load(quelle / "drums.wav", sr=22050, mono=True)
    _, beats = librosa.beat.beat_track(y=y, sr=sr, start_bpm=90, tightness=400)
    bt = librosa.frames_to_time(beats, sr=sr)
    # Tempo aus der Geraden durch alle Schläge (robuster als der Median der Abstände,
    # ein Fehler von 1 % läuft über drei Minuten sonst um Sekunden auseinander)
    steigung, achse = np.polyfit(np.arange(len(bt)), bt, 1)
    bpm = 60 / steigung
    faktor = (ziel_bpm / 2) / bpm
    print(f"Tempo {bpm:.1f} BPM -> {ziel_bpm / 2:.0f} (halbes {ziel_bpm:.0f}), Faktor {faktor:.3f}")

    for name in ("drums", "bass", "rest-raum"):
        dehnen(quelle / f"{name}.wav", tmp / f"{name}.wav", faktor)
    drums, sr = sf.read(tmp / "drums.wav", always_2d=True)
    bass, _ = sf.read(tmp / "bass.wav", always_2d=True)
    rest, _ = sf.read(tmp / "rest-raum.wav", always_2d=True)
    n = min(len(drums), len(bass), len(rest))

    hit = schlaege(drums, sr)
    break_ = np.zeros((n, 2))
    # Raster an den gemessenen Schlägen festmachen: ein Original-Schlag = halber Takt
    # bei ZIEL_BPM = 8 Sechzehntel. So läuft der Break auch bei schwankendem Tempo mit.
    schlag = bt / faktor
    schlag = np.append(schlag, schlag[-1] + np.diff(schlag[-9:]).mean() * np.arange(1, 9))
    # Taktanfang: die Phase (gerade/ungerade Schläge), auf der der Original-Kick liegt
    tief = librosa.effects.preemphasis(drums.mean(1), coef=-0.97)
    kick = [np.abs(tief[int(t * sr):int(t * sr) + int(0.05 * sr)]).mean() for t in schlag[:-8] if t * sr < n]
    phase = 0 if np.mean(kick[0::2]) >= np.mean(kick[1::2]) else 1
    for k in range(phase, len(schlag) - 1, 2):
        takt = (k - phase) // 2
        zeile, hats = MUSTER[takt % 4], HATS
        for haelfte in range(2):
            if k + haelfte + 1 >= len(schlag):
                break
            t0, t1 = schlag[k + haelfte], schlag[k + haelfte + 1]
            for j in range(8):
                i = haelfte * 8 + j
                t = t0 + (t1 - t0) * j / 8
                for zeichen in (zeile[i], hats[i]):
                    if zeichen == ".":
                        continue
                    s = hit[zeichen]
                    a = int(t * sr)
                    e = min(n, a + len(s))
                    if 0 <= a < n:
                        break_[a:e] += PEGEL[zeichen] * s[: e - a]
    # Break einpassen: Hochpass, damit der Original-Kick und der Bass unten bleiben
    sf.write(tmp / "break.wav", break_, sr, subtype="FLOAT")
    subprocess.run(["ffmpeg", "-hide_banner", "-loglevel", "error", "-y", "-i", str(tmp / "break.wav"),
                    "-af", "highpass=f=90:poles=2,acompressor=threshold=0.3:ratio=3:attack=3:release=60",
                    "-c:a", "pcm_f32le", str(tmp / "break-hp.wav")], check=True)
    break_, _ = sf.read(tmp / "break-hp.wav", always_2d=True)
    ziel_rms = np.sqrt((drums[: n] ** 2).mean())
    break_ *= ziel_rms / (np.sqrt((break_[:n] ** 2).mean()) + 1e-9) * 0.8

    mix = (drums[:n] * 10 ** (ORIGINAL_DRUMS_DB / 20) + break_[:n] + bass[:n] + rest[:n])
    sf.write(ziel.with_name(ziel.stem + "-break.wav"), break_[:n], sr, subtype="PCM_24")
    sf.write(ziel, mix, sr, subtype="FLOAT")
    print(f"Remix: {ziel}, {n / sr:.1f} s")


if __name__ == "__main__":
    main()
