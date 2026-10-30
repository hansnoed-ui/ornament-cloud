"""Baut gamma/index.html (Website) und eine Vorschau fürs Artifact aus index.src.html und zu-seiner-zeit/zsz-daten.json.
Aufruf: python3 tools/gamma/build.py [vorschau.html]"""
import json, sys, pathlib
WURZEL = pathlib.Path(__file__).resolve().parents[2]
QUELLE = (pathlib.Path(__file__).parent / "index.src.html").read_text()
d = json.loads((WURZEL / "zu-seiner-zeit/zsz-daten.json").read_text())
ZYKLEN = ["Operation", "Rekursion", "Adresse", "Koppelung", "Kunst", "Plattform", "Zukunft"]
ps = list(d["persons"]); pi = {k: i for i, k in enumerate(ps)}
daten = {"z": [[s["id"], ZYKLEN.index(s["cycleTitle"]), s["title"], s["bottomLine"], [pi[r["slug"]] for r in s["refs"] if r["slug"] in pi]] for s in d["stanzas"]],
         "p": [d["persons"][k]["name"] for k in ps]}
html = QUELLE.replace("/*DATEN*/null", json.dumps(daten, ensure_ascii=False, separators=(",", ":")))

KOPF = """<!doctype html>
<html lang="de-CH">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<meta name="description" content="ornament.cloud im Überblick: ein Netz aus 49 Strophen und 133 Personen, dann Webseiten, Apps, Kunst, Lab, Prompts, Zettel und Social als Farbfelder auf einer Bahn im Raum.">
<meta name="robots" content="noindex">
<link rel="icon" href="../b/bilder/signet/signet.svg">"""
web = html.replace("<!--KOPF-->", KOPF).replace("<!--SCHRIFTEN-->", '<link rel="stylesheet" href="../vendor/fonts/fonts.css">\n</head>\n<body>')
web = web.replace("{{BILD}}", "../").replace("{{LINK}}", "../").replace("{{VENDOR}}", "../vendor/") + "\n</body>\n</html>\n"
(WURZEL / "gamma").mkdir(exist_ok=True)
(WURZEL / "gamma/index.html").write_text(web)

if len(sys.argv) > 1:
    gf = '<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Instrument+Sans:wght@400;500;600&family=Newsreader:ital,wght@0,400;1,400&display=swap">'
    # Bilder und Filme, die auf eine Leinwand gezeichnet werden, müssen aus derselben Quelle kommen: in der Vorschau eingebettet
    import base64
    eingebettet = "data:image/webp;base64," + base64.b64encode((WURZEL / "gamma/bilder/surfen.webp").read_bytes()).decode()
    film = "data:video/mp4;base64," + base64.b64encode((WURZEL / "gamma/bilder/lab-intro.mp4").read_bytes()).decode()
    v = html.replace("{{BILD}}gamma/bilder/surfen.webp", eingebettet).replace("{{BILD}}gamma/bilder/lab-intro.mp4", film)
    for n in ("kunst-foto.webp", "kunst-linien.webp"):
        v = v.replace("{{BILD}}gamma/bilder/" + n, "data:image/webp;base64," + base64.b64encode((WURZEL / "gamma/bilder" / n).read_bytes()).decode()).replace("<!--KOPF-->", "").replace("<!--SCHRIFTEN-->", gf).replace("{{BILD}}", "").replace("{{LINK}}", "https://ornament.cloud/").replace('"{{VENDOR}}three-0.185.1/three.module.min.js"', '"https://cdn.jsdelivr.net/npm/three@0.170.0/build/three.module.min.js"').replace('"{{VENDOR}}three-0.185.1/addons/"', '"https://cdn.jsdelivr.net/npm/three@0.170.0/examples/jsm/"')
    # Die Artifact-Vorschau lädt Skripte nur von freigegebenen CDNs, nicht aus eigenen Dateien
    pathlib.Path(sys.argv[1]).write_text(v)
