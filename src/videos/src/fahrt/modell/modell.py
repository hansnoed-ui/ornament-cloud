# Bild → 3D-Modell (GLB) auf Hugging Face, kostenlos (ZeroGPU), mit dem Token aus `hf auth login`
#   py -P modell.py trellis|hunyuan|sf3d <bild>   → ../data/<verfahren>.glb (nicht eingecheckt)
# trellis: Form und Textur, weich · hunyuan: nur Form (Textur braucht Hugging Face PRO), am feinsten · sf3d: Textur, flach wie eine Maske
# Stand 28. Oktober 2026: tencent/Hunyuan3D-2 und stabilityai/stable-fast-3d liefen nicht, darum Hunyuan3D-2.1 und eine Kopie von SF3D.
import shutil, sys, time
from pathlib import Path
from gradio_client import Client, handle_file
verfahren, bild = sys.argv[1], Path(sys.argv[2]).resolve()
daten = Path(__file__).resolve().parent.parent / "data"; daten.mkdir(exist_ok=True)
t0 = time.time()
pfad = lambda x: x.get("value") if isinstance(x, dict) else x
if verfahren == "trellis":
    c = Client("trellis-community/TRELLIS", verbose=False)
    c.predict(api_name="/start_session")
    frei = c.predict(image=handle_file(str(bild)), api_name="/preprocess_image")
    shutil.copy(frei, daten / "freigestellt.png")
    r = c.predict(image=handle_file(str(daten / "freigestellt.png")), multiimages=[], seed=7, ss_guidance_strength=7.5, ss_sampling_steps=12,
                  slat_guidance_strength=3.0, slat_sampling_steps=12, multiimage_algo="stochastic", mesh_simplify=0.95, texture_size=1024,
                  api_name="/generate_and_extract_glb")
    glb = r[1]
elif verfahren == "hunyuan":
    # das Bild mit Hintergrund geben und den Space freistellen lassen; ein freigestelltes Bild ergab eine flache Platte
    c = Client("tencent/Hunyuan3D-2.1", verbose=False)
    r = c.predict(image=handle_file(str(bild)), mv_image_front=None, mv_image_back=None, mv_image_left=None, mv_image_right=None,
                  steps=30, guidance_scale=5.0, seed=1234, octree_resolution=256, check_box_rembg=True, num_chunks=8000, randomize_seed=False,
                  api_name="/shape_generation")
    glb = r[0]
elif verfahren == "sf3d":
    # freigestelltes Bild (aus «trellis») oder das Original
    c = Client("Cq79/stable-fast-3d", verbose=False)
    eingabe = daten / "freigestellt.png" if (daten / "freigestellt.png").exists() else bild
    glb = c.predict(input_image=handle_file(str(eingabe)), foreground_ratio=0.85, remesh_option="None", vertex_count=-1, texture_size=2048,
                    api_name="/image_to_glb")
else:
    sys.exit("Verfahren: trellis, hunyuan oder sf3d")
shutil.copy(pfad(glb), daten / f"{verfahren}.glb")
print(f"{verfahren}.glb nach {time.time() - t0:.0f} s")
