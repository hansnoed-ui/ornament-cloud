# Datei vom Pod holen: python3 runter.py <datei auf dem Pod> <lokal>
import base64, sys, os, hashlib
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__))); from rpmod import ex
quelle, ziel = sys.argv[1], sys.argv[2]
d = ex(f'stat -c %s "{quelle}"; md5sum "{quelle}" | cut -c1-32'); groesse, md5 = d['stdout'].split(); groesse = int(groesse)
B = 700000; teile = []
for i in range((groesse + B - 1) // B):
    d = ex(f'dd if="{quelle}" bs={B} skip={i} count=1 status=none | base64 -w0'); assert not d.get('truncated'), 'abgeschnitten'; teile.append(base64.b64decode(d['stdout']))
daten = b''.join(teile); open(ziel, 'wb').write(daten)
print(ziel, len(daten), 'Bytes', 'ok' if hashlib.md5(daten).hexdigest() == md5 else 'FEHLER')
