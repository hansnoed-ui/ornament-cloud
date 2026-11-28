# Keilschnitt aus der Schriftmaske: die Tiefe wächst mit dem Abstand zum Rand des Strichs (V-förmige Kerbe mit Grat in der Mitte),
# wie ein Steinmetz mit dem Flacheisen von beiden Seiten zur Mitte schlägt. Breite Striche werden tiefer, wie in echten Inschriften.
#   python3 keil.py <gravur.png> <keil.png>   (gravur.png aus gravur.mjs; nur die Maske zählt)
import sys
import numpy as np
from PIL import Image
from scipy.ndimage import distance_transform_edt, gaussian_filter
m = np.array(Image.open(sys.argv[1]).convert('L')) > 30
d = distance_transform_edt(m)
TIEFSTE = float(__import__("os").environ.get("TIEFSTE", 22))   # Pixel Abstand vom Rand, ab dem die Kerbe nicht tiefer wird
k = np.clip(d / TIEFSTE, 0, 1)
k = gaussian_filter(k, 0.8)          # Grat und Kante nicht messerscharf (Pixeltreppen)
Image.fromarray((k * 255).astype(np.uint8)).save(sys.argv[2], optimize=True)
print('Stärkste Strichbreite (px)', round(2 * d.max(), 1))
