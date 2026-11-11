"""Raster-Tor für Drum-Spuren: lässt nur Schläge durch, die ins Muster des Beats passen.

Mikrofongeräusche (Klicks, Atem, Griffgeräusche, Plopp) landen bei der Trennung
oft in der Drumspur, weil sie perkussiv sind. Sie kommen aber unregelmässig,
während die Drums eines Beats in einem festen Takt-Muster liegen.

1. Einsätze der Drumspur finden (10-ms-Hülle)
2. Taktlänge aus der Autokorrelation (ein Takt = 4 Schläge)
3. Alle Einsätze im lauten Teil auf einen Takt falten -> Muster-Plätze
4. Einsätze ausserhalb der Plätze um DAEMPFUNG absenken
5. Halbtakte, die als Ganzes nicht zum Muster passen (Intro mit offenem
   Mikrofon, Pausen), um PAUSE dB absenken

Aufruf: raster.py <drums.wav> <ziel.wav>
"""
import sys

import numpy as np
import soundfile as sf

FENSTER = 0.01      # s, Auflösung der Hülle
TOLERANZ = 0.035    # s, so weit darf ein Schlag neben seinem Platz liegen
DAEMPFUNG = -20     # dB für Ereignisse ausserhalb des Musters
HALTEN = 0.12       # s, Länge eines Schlags
ANTEIL = 0.3        # so oft muss ein Platz im Beat belegt sein
PAUSE = -30         # dB für Halbtakte ohne Beat
PASSUNG = 0.72      # Mindestanteil der Schläge im Muster (Median über 3 Halbtakte)


def huelle(x, sr):
    w = int(sr * FENSTER)
    n = len(x) // w
    return 20 * np.log10(np.sqrt((x[: n * w].reshape(n, w) ** 2).mean(1)) + 1e-9)


def einsatzstaerke(e):
    d = np.diff(e, prepend=e[0])
    return np.where((d > 0) & (e > -50), d, 0)


def taktlaenge(s):
    """Schlagdauer in Fenstern (60–180 BPM), dann ×4 für einen Takt."""
    s = s - s.mean()
    ac = np.correlate(s, s, mode="full")[len(s) - 1:]
    lo, hi = int(60 / 180 / FENSTER), int(60 / 60 / FENSTER)
    schlag = lo + int(np.argmax(ac[lo:hi]))
    return 4 * schlag


def muster(s, laut, takt):
    """Plätze im Takt, an denen in mindestens ANTEIL der lauten Takte ein Schlag liegt."""
    tol = int(TOLERANZ / FENSTER)
    treffer = np.zeros(takt)
    takte = 0
    for t0 in range(0, len(s) - takt, takt):
        if laut[t0:t0 + takt].mean() < 0.5:
            continue
        takte += 1
        hit = (s[t0:t0 + takt] > 6).astype(float)
        breit = np.array([hit.take(range(i - tol, i + tol + 1), mode="wrap").max() for i in range(takt)])
        treffer += breit
    return treffer / max(takte, 1) >= ANTEIL


def main():
    x, sr = sf.read(sys.argv[1], always_2d=True)
    e = huelle(x.mean(1), sr)
    s = einsatzstaerke(e)
    # lauter Teil: Fenster nahe am typischen Pegel des Beats
    laut = e > np.percentile(e, 50) - 6
    takt = taktlaenge(s * laut)
    platz = muster(s, laut, takt)
    passt = platz[np.arange(len(e)) % takt]

    # Ereignisse: deutliche Anstiege; ausserhalb des Musters -> dämpfen
    ereignis = s > 6
    h = int(HALTEN / FENSTER)
    fremd = np.convolve(ereignis & ~passt, np.ones(h))[: len(e)] > 0
    eigen = np.convolve(ereignis & passt, np.ones(h))[: len(e)] > 0
    tor_f = np.where(fremd & ~eigen, 10 ** (DAEMPFUNG / 20), 1.0)
    # Halbtakte bewerten: Anteil der Schläge, die auf Musterplätzen liegen
    half = takt // 2
    anfaenge = list(range(0, len(e) - half + 1, half))
    wert = []
    for t0 in anfaenge:
        h = ereignis[t0:t0 + half]
        wert.append((h & passt[t0:t0 + half]).sum() / h.sum() if h.sum() >= 3 else 1.0)
    wert = np.array(wert)
    glatt = np.array([np.median(wert[max(0, i - 1):i + 2]) for i in range(len(wert))])
    pausen = []
    for t0, g in zip(anfaenge, glatt):
        if g < PASSUNG:
            tor_f[t0:t0 + half] = np.minimum(tor_f[t0:t0 + half], 10 ** (PAUSE / 20))
            pausen.append(t0 * FENSTER)
    # weich auf Abtastrate bringen
    w = int(sr * FENSTER)
    tor = np.repeat(tor_f, w)
    tor = np.convolve(tor, np.ones(w * 5) / (w * 5), mode="same")
    tor = np.pad(tor, (0, len(x) - len(tor)), constant_values=1.0)[: len(x)]
    sf.write(sys.argv[2], x * tor[:, None], sr, subtype="PCM_24")
    bpm = 60 / (takt / 4 * FENSTER)
    print(f"Tempo ~{bpm:.1f} BPM, {platz.sum()} von {takt} Plätzen im Muster, "
          f"{(tor_f < 1).mean():.1%} der Zeit gedämpft")
    if pausen:
        print("ohne Beat ab:", ", ".join(f"{t:.1f}s" for t in pausen))


if __name__ == "__main__":
    main()
