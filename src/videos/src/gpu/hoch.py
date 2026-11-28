# Datei auf den Pod laden: python3 hoch.py <lokal> <ziel>
import base64, sys, os, hashlib
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__))); from rpmod import ex
daten = open(sys.argv[1], 'rb').read(); b = base64.b64encode(daten).decode(); ziel = sys.argv[2]
teile = [b[i:i + 4000] for i in range(0, len(b), 4000)]
def ok(d): assert d.get('exitCode') == 0, d; return d
ok(ex(f': > "{ziel}.b64"'))
for k in range(0, len(teile), 200): ok(ex(['sh', '-c', f'for a; do printf %s "$a"; done >> "{ziel}.b64"', 'sh'] + teile[k:k + 200]))
d = ok(ex(f'base64 -d "{ziel}.b64" > "{ziel}" && rm "{ziel}.b64" && md5sum "{ziel}"'))
print(ziel, len(daten), 'Bytes', 'ok' if d['stdout'].split()[0] == hashlib.md5(daten).hexdigest() else 'FEHLER')
