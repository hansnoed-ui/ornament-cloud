"""Videos hochrendern: Real-ESRGAN (kompaktes Netz, ×4) über onnxruntime, ohne GPU und ohne API.

  tools/hochrendern/hochrendern EINGABE.mp4 [-o AUSGABE.mp4] [--faktor 2] [--modell grafik|foto]
                                [--start 5 --dauer 3] [--methode ki|lanczos] [--crf 18]

Die Gewichte kommen beim ersten Lauf von GitHub (xinntao/Real-ESRGAN, BSD-3), werden mit SHA-256 geprüft,
ohne torch gelesen und als ONNX in ~/.cache/ornament-hochrendern/ abgelegt. Das Netz rechnet immer ×4,
ffmpeg verkleinert danach mit Lanczos auf den gewünschten Faktor; der Ton wird unverändert übernommen.
"""
import argparse, collections, hashlib, json, os, pickle, shutil, subprocess, sys, time, urllib.request, zipfile
from pathlib import Path

import numpy as np

MODELLE = {
    # Grafik, Schrift, Comic, Animation (auch die Remotion- und Three.js-Videos): schneller, glatte Flächen
    "grafik": ("realesr-animevideov3", "b8a8376811077954d82ca3fcf476f1ac3da3e8a68a4f4d71363008000a18b75d"),
    # gefilmtes Material, Fotos, Körnung
    "foto": ("realesr-general-x4v3", "8dc7edb9ac80ccdc30c3a5dca6616509367f05fbc184ad95b731f05bece96292"),
}
URL = "https://github.com/xinntao/Real-ESRGAN/releases/download/v0.2.5.0/{}.pth"
CACHE = Path(os.environ.get("XDG_CACHE_HOME", Path.home() / ".cache")) / "ornament-hochrendern"


def lade_pth(pfad):
    """Liest einen torch-Checkpoint (Zip-Format) als Wörterbuch von numpy-Feldern, ohne torch."""
    zf = zipfile.ZipFile(pfad)
    wurzel = zf.namelist()[0].split("/")[0]
    typen = {"FloatStorage": np.float32, "HalfStorage": np.float16}

    def tensor(speicher, versatz, groesse, schritte, *_):
        return np.lib.stride_tricks.as_strided(
            speicher[versatz:], shape=groesse, strides=[s * speicher.itemsize for s in schritte]).copy()

    class Leser(pickle.Unpickler):
        def find_class(self, modul, name):
            if (modul, name) == ("torch._utils", "_rebuild_tensor_v2"):
                return tensor
            if modul == "torch" and name in typen:
                return name
            if (modul, name) == ("collections", "OrderedDict"):
                return collections.OrderedDict
            raise pickle.UnpicklingError(f"unerwartet im Checkpoint: {modul}.{name}")

        def persistent_load(self, pid):
            _, typ, schluessel, _ort, _anzahl = pid
            return np.frombuffer(zf.read(f"{wurzel}/data/{schluessel}"), dtype=typen[typ])

    daten = Leser(zf.open(f"{wurzel}/data.pkl")).load()
    return daten.get("params", daten)


def baue_onnx(gewichte, ziel):
    """SRVGGNetCompact: Conv+PReLU, …, Conv auf 48 Kanäle, PixelShuffle ×4, plus Eingabe nächster Nachbar ×4."""
    import onnx
    from onnx import TensorProto, helper, numpy_helper

    knoten, werte, x = [], [], "input"
    for i in sorted({int(k.split(".")[1]) for k in gewichte}):
        w = gewichte[f"body.{i}.weight"].astype(np.float32)
        if w.ndim == 4:
            werte += [numpy_helper.from_array(w, f"w{i}"),
                      numpy_helper.from_array(gewichte[f"body.{i}.bias"].astype(np.float32), f"b{i}")]
            knoten.append(helper.make_node("Conv", [x, f"w{i}", f"b{i}"], [f"c{i}"], pads=[1, 1, 1, 1]))
            x = f"c{i}"
        else:
            werte.append(numpy_helper.from_array(w.reshape(-1, 1, 1), f"p{i}"))
            knoten.append(helper.make_node("PRelu", [x, f"p{i}"], [f"a{i}"]))
            x = f"a{i}"
    werte.append(numpy_helper.from_array(np.array([1, 1, 4, 4], np.float32), "skala"))
    knoten += [helper.make_node("DepthToSpace", [x], ["fein"], blocksize=4, mode="CRD"),
               helper.make_node("Resize", ["input", "", "skala"], ["grob"], mode="nearest"),
               helper.make_node("Add", ["fein", "grob"], ["output"])]
    graph = helper.make_graph(knoten, "srvgg",
                              [helper.make_tensor_value_info("input", TensorProto.FLOAT, [1, 3, "h", "w"])],
                              [helper.make_tensor_value_info("output", TensorProto.FLOAT, [1, 3, "H", "W"])], werte)
    modell = helper.make_model(graph, opset_imports=[helper.make_opsetid("", 17)], ir_version=8)
    onnx.checker.check_model(modell)
    onnx.save(modell, ziel)


def gewichte(art):
    """Die Gewichte als Wörterbuch; beim ersten Mal von GitHub geladen und geprüft."""
    name, sha = MODELLE[art]
    CACHE.mkdir(parents=True, exist_ok=True)
    pth = CACHE / f"{name}.pth"
    if not pth.exists():
        print(f"Lade {name} …", file=sys.stderr)
        urllib.request.urlretrieve(URL.format(name), pth)
    if hashlib.sha256(pth.read_bytes()).hexdigest() != sha:
        pth.unlink()
        sys.exit(f"Prüfsumme von {name}.pth stimmt nicht, Datei gelöscht.")
    return lade_pth(pth)


def modell_pfad(art):
    onnx_pfad = CACHE / f"{MODELLE[art][0]}.onnx"
    if not onnx_pfad.exists():
        baue_onnx(gewichte(art), onnx_pfad)
    return onnx_pfad


def pruefe(pfad):
    aus = subprocess.check_output(["ffprobe", "-v", "error", "-show_entries",
                                   "stream=codec_type,width,height,r_frame_rate,nb_frames,color_space:format=duration",
                                   "-of", "json", str(pfad)])
    info = json.loads(aus)
    video = next(s for s in info["streams"] if s["codec_type"] == "video")
    zaehler, nenner = map(int, video["r_frame_rate"].split("/"))
    return {"breite": video["width"], "hoehe": video["height"], "fps": zaehler / nenner,
            "rate": video["r_frame_rate"], "dauer": float(info["format"].get("duration", 0)),
            "farbraum": video.get("color_space"), "ton": any(s["codec_type"] == "audio" for s in info["streams"])}


def gerade(n):
    return int(round(n / 2)) * 2


def main():
    ap = argparse.ArgumentParser(description="Video mit Real-ESRGAN (CPU) hochrendern.")
    ap.add_argument("eingabe")
    ap.add_argument("-o", "--ausgabe")
    ap.add_argument("--faktor", type=float, default=2, help="Vergrösserung, 1–4 (Standard 2)")
    ap.add_argument("--modell", choices=MODELLE, default="grafik")
    ap.add_argument("--methode", choices=["ki", "lanczos"], default="ki",
                    help="lanczos: nur ffmpeg, in Sekunden fertig, erfindet aber keine Details")
    ap.add_argument("--start", type=float, default=0, help="ab Sekunde (für eine Probe)")
    ap.add_argument("--dauer", type=float, help="nur so viele Sekunden (für eine Probe)")
    ap.add_argument("--crf", type=int, default=18)
    a = ap.parse_args()

    if not 1 <= a.faktor <= 4:
        sys.exit("--faktor muss zwischen 1 und 4 liegen.")
    ein = Path(a.eingabe)
    v = pruefe(ein)
    breite, hoehe = gerade(v["breite"] * a.faktor), gerade(v["hoehe"] * a.faktor)
    aus = Path(a.ausgabe or ein.with_name(f"{ein.stem}-{breite}x{hoehe}.mp4"))
    dauer = min(a.dauer, v["dauer"] - a.start) if a.dauer else v["dauer"] - a.start
    bilder = max(1, round(dauer * v["fps"]))

    # Farbmatrix beim Entpacken und Packen gleich halten, sonst verschieben sich die Farben
    matrix = "bt709" if v["farbraum"] == "bt709" else "bt601"
    zeit = (["-ss", str(a.start)] if a.start else []) + (["-t", str(a.dauer)] if a.dauer else [])
    kodierung = ["-c:v", "libx264", "-preset", "slow", "-crf", str(a.crf), "-pix_fmt", "yuv420p",
                 "-movflags", "+faststart"]
    if v["farbraum"]:
        kodierung += ["-colorspace", v["farbraum"]]
    ton = ["-map", "1:a?", "-c:a", "copy"] if v["ton"] else []

    print(f"{ein.name}: {v['breite']}×{v['hoehe']}, {v['fps']:.3g} fps, {dauer:.1f} s → {aus.name}: {breite}×{hoehe}",
          file=sys.stderr)

    if a.methode == "lanczos":
        subprocess.run(["ffmpeg", "-v", "error", "-stats", "-y", *zeit, "-i", str(ein),
                        "-vf", f"scale={breite}:{hoehe}:flags=lanczos", "-map", "0:v", *(["-map", "0:a?", "-c:a", "copy"] if v["ton"] else []),
                        *kodierung, str(aus)], check=True)
        return

    import onnxruntime as ort
    sitzung = ort.InferenceSession(str(modell_pfad(a.modell)), providers=["CPUExecutionProvider"])
    w, h = v["breite"], v["hoehe"]

    lesen = subprocess.Popen(["ffmpeg", "-v", "error", *zeit, "-i", str(ein), "-map", "0:v:0",
                              "-vf", f"scale=in_color_matrix={matrix}", "-f", "rawvideo", "-pix_fmt", "rgb24", "-"],
                             stdout=subprocess.PIPE)
    schreiben = subprocess.Popen(["ffmpeg", "-v", "error", "-y", "-f", "rawvideo", "-pix_fmt", "rgb24",
                                  "-s", f"{w * 4}x{h * 4}", "-framerate", v["rate"], "-i", "-", *zeit, "-i", str(ein),
                                  "-map", "0:v", *ton,
                                  "-vf", f"scale={breite}:{hoehe}:flags=lanczos:out_color_matrix={matrix}",
                                  *kodierung, "-shortest", str(aus)], stdin=subprocess.PIPE)
    groesse, n, beginn = w * h * 3, 0, time.time()
    try:
        while (roh := lesen.stdout.read(groesse)) and len(roh) == groesse:
            x = np.frombuffer(roh, np.uint8).reshape(h, w, 3).transpose(2, 0, 1)[None].astype(np.float32) / 255
            y = sitzung.run(None, {"input": x})[0][0]
            schreiben.stdin.write((np.clip(y, 0, 1) * 255 + 0.5).astype(np.uint8).transpose(1, 2, 0).tobytes())
            n += 1
            rest = (time.time() - beginn) / n * max(0, bilder - n)
            print(f"\rBild {n}/~{bilder}, noch etwa {int(rest // 60)} min {int(rest % 60)} s   ", end="", file=sys.stderr)
    finally:
        schreiben.stdin.close()
        lesen.wait()
        schreiben.wait()
    print(f"\nFertig in {int((time.time() - beginn) // 60)} min: {aus}", file=sys.stderr)
    if schreiben.returncode:
        sys.exit("ffmpeg konnte das Video nicht schreiben.")


if __name__ == "__main__":
    main()
