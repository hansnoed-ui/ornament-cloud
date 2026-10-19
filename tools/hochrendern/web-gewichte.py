"""Die Gewichte für die Seite alpha/hochrendern/ (WebGPU, netz.js): je Modell eine Datei modelle/<name>.bin.

  tools/hochrendern/.venv/bin/python tools/hochrendern/web-gewichte.py

Aufbau (little endian): «SRVG», u32 Version 1, u32 Zahl der Faltungen L, je Faltung u32 cin, u32 cout, u32 prelu (1: PReLU danach);
dann als float16 je Faltung die Gewichte (cout × cin × 3 × 3, Reihenfolge wie in torch), der Bias (cout) und, wenn prelu, dessen Steigungen (cout).
"""
import struct, sys
from pathlib import Path

import numpy as np

sys.path.insert(0, str(Path(__file__).parent))
from hochrendern import MODELLE, gewichte  # noqa: E402

ZIEL = Path(__file__).resolve().parents[2] / "alpha" / "hochrendern" / "modelle"


def schreibe(art):
    sd = gewichte(art)
    schichten = sorted({int(k.split(".")[1]) for k in sd})
    faltungen = []
    for i in schichten:
        w = sd[f"body.{i}.weight"]
        if w.ndim == 4:
            faltungen.append([w, sd[f"body.{i}.bias"], None])
        else:
            faltungen[-1][2] = w
    kopf = b"SRVG" + struct.pack("<II", 1, len(faltungen))
    daten = []
    for w, b, p in faltungen:
        kopf += struct.pack("<III", w.shape[1], w.shape[0], int(p is not None))
        daten += [w.ravel(), b.ravel()] + ([p.ravel()] if p is not None else [])
    ZIEL.mkdir(parents=True, exist_ok=True)
    pfad = ZIEL / f"{MODELLE[art][0]}.bin"
    pfad.write_bytes(kopf + np.concatenate(daten).astype("<f2").tobytes())
    print(f"{pfad.relative_to(ZIEL.parents[2])}: {len(faltungen)} Faltungen, {pfad.stat().st_size / 1e6:.2f} MB")


for art in MODELLE:
    schreibe(art)
