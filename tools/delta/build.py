#!/usr/bin/env python3
"""Schreibt delta/index.html: die Inhalte von /b/ in der Rasteroptik von delta/delta.css.

Texte, Zeichen (SVG), Signet und die 49 Zettel kommen aus b/index.html, damit beide Seiten
dasselbe sagen. Aufruf aus der Wurzel des Repositorys:  python3 tools/delta/build.py
Alle Verweise sind relativ (../b/…), die Seite läuft unter ornament.cloud/delta/."""
import html, json, re
from pathlib import Path

WURZEL = Path(__file__).resolve().parents[2]
B = (WURZEL / "b/index.html").read_text(encoding="utf-8")

def suche(muster, text=B, flags=re.S):
    m = re.search(muster, text, flags)
    if not m:
        raise SystemExit(f"nicht gefunden in b/index.html: {muster[:60]}")
    return m

def rel(url):
    """/b/zettel/ -> ../b/zettel/ ; mailto und # bleiben."""
    return "../" + url[1:] if url.startswith("/") else url

def rel_alle(fragment):
    return re.sub(r'(href|src|srcset)="/(?!/)', r'\1="../', fragment)

def ohne_tags(s):
    return html.unescape(re.sub(r"<[^>]+>", "", s)).strip()

# ── Bausteine aus /b/ ──
signet = suche(r'<a class="signet"[^>]*>(<svg.*?</svg>)').group(1)
signet = signet.replace('aria-hidden="true"', 'aria-hidden="true" class="signet-svg"')
zettel = json.loads(suche(r'id="zettel-daten">(.*?)</script>').group(1))
feld_titel = {int(m.group(1)): m.group(2) for m in re.finditer(r'<a href="/b/zettel/[^"]+" data-n="(\d+)" title="[^"]*"><span class="n">\d+</span><span class="t">(.*?)</span></a>', B, re.S)}

angebote = [dict(href=m.group(1), zeichen=m.group(2), titel=m.group(3), text=m.group(4))
            for m in re.finditer(r'<a class="angebot" role="listitem" href="([^"]+)"><span class="zeichen-gross">(<svg.*?</svg>)</span><h2>([^<]+)</h2><p>([^<]+)</p>', B, re.S)]
assert len(angebote) == 4, angebote

def kopf_von(abschnitt_id):
    m = suche(r'<h2 id="%s">(<svg.*?</svg>)([^<]+)</h2><p>([^<]+)</p><a class="weiter" href="([^"]+)">([^<]+)</a>' % abschnitt_id)
    return dict(zeichen=m.group(1), titel=m.group(2), text=m.group(3), href=m.group(4), weiter=m.group(5))

k_feld, k_raster, k_spielen, k_werke, k_zuletzt = (kopf_von(x) for x in ["feld-titel", "raster-titel", "spielen-titel", "werke-titel", "zuletzt-titel"])

raster = [dict(href=m.group(1), zeichen=m.group(2), name=m.group(3), status=m.group(4), kurz=m.group(5))
          for m in re.finditer(r'<li><a href="(/b/raster/[^"]+)"><span class="n">(<svg.*?</svg>)</span><span class="name">([^<]+)</span><span class="pfeil">([^<]+)</span><span class="kurz">([^<]+)</span></a></li>', B, re.S)]
assert len(raster) == 4, raster

apps = []
for m in re.finditer(r'<a class="stueck" href="([^"]+)"><span class="bild[^"]*"[^>]*>(.*?)</span><h3>(<svg.*?</svg>)([^<]+)</h3><p>([^<]+)</p></a>', B, re.S):
    bild = m.group(2)
    poster = re.search(r'poster="([^"]+)"', bild)
    if poster:
        alt = re.search(r'aria-label="([^"]+)"', bild).group(1)
        apps.append(dict(href=m.group(1), bild=poster.group(1), alt=alt, zeichnung=False, zeichen=m.group(3), titel=m.group(4), text=m.group(5)))
    else:
        img = re.search(r'<img src="([^"]+)" alt="([^"]+)"', bild)
        dunkel = re.search(r'<source srcset="([^"]+)"', bild).group(1)
        apps.append(dict(href=m.group(1), bild=img.group(1), dunkel=dunkel, alt=img.group(2), zeichnung=True, zeichen=m.group(3), titel=m.group(4), text=m.group(5)))
assert len(apps) == 7, len(apps)

wege = []
for m in re.finditer(r'<label class="chip" for="mit-(\w+)">([^<]+)</label>', B):
    w = suche(r'<div class="weg weg-%s"><p>([^<]+)</p><ol>(.*?)</ol></div>' % m.group(1))
    wege.append(dict(was=m.group(2), satz=w.group(1), liste=rel_alle(w.group(2))))
assert len(wege) == 5

beitraege = []
for m in re.finditer(r'<article class="beitrag">\s*<p class="wer"><img src="([^"]+)"[^>]*><span>([^<]+)</span><span>([^<]+)</span></p>\s*<p class="text">(.*?)</p>\s*<p class="klein"><a href="([^"]+)">([^<]+)</a></p>', B, re.S):
    beitraege.append(dict(avatar=m.group(1), wer=m.group(2), wo=m.group(3), text=m.group(4), href=m.group(5), beleg=m.group(6)))

sig = (WURZEL / "b/bilder/signet/signet.svg").read_text(encoding="utf-8")
sig_flaeche = suche(r'<path d="([^"]+)" fill="rgba', sig).group(1)
sig_linie = suche(r'<path d="([^"]+)" fill="none"', sig).group(1)
sig_punkt = suche(r'<circle cx="([^"]+)" cy="([^"]+)"', sig).groups()
signet_gross = (f'<svg class="signet-gross" viewBox="0 0 1200 1200" role="img" aria-label="Das Signet von ornament.cloud, gezeichnet: die Re-entry-Schlaufe mit dem Punkt, der sie abläuft">'
                f'<path class="s-flaeche" d="{sig_flaeche}"/><path id="s-linie" class="s-linie" d="{sig_linie}" pathLength="1"/>'
                f'<circle class="s-punkt" r="16" cx="0" cy="0"><animateMotion id="s-lauf" dur="16s" repeatCount="indefinite" begin="indefinite" rotate="0"><mpath href="#s-linie"/></animateMotion></circle>'
                f'<circle class="s-punkt-ruhe" r="16" cx="{sig_punkt[0]}" cy="{sig_punkt[1]}"/></svg>')

titel_satz = suche(r'<h1 class="titel" id="einstieg-titel">([^<]+)<small>([^<]+)</small></h1>')
einstieg_satz = suche(r'<p class="einstieg-satz">([^<]+)</p>').group(1)
liste = suche(r'<h2 id="liste-titel">([^<]+)</h2>\s*<p>([^<]+)</p>\s*<p class="knopfreihe"><a class="knopf" href="([^"]+)">([^<]+)</a><a class="knopf still" href="([^"]+)">([^<]+)</a>')
fuss_ort = suche(r'<p class="zeile"><span>([^<]+)</span><a href="mailto:([^"]+)">').groups()
kicker = suche(r'<p class="klein kicker">(.*?)</p>').group(1)
kicker_maus = ohne_tags(suche(r'<span class="mit-zeiger">(.*?)</span>', kicker).group(1))
meta_desc = suche(r'<meta name="description" content="([^"]+)"').group(1)

ZYKLEN = ["Operation", "Rekursion", "Adresse", "Koppelung", "Kunst", "Plattform", "Zukunft"]
assert len(zettel) == 49

def zwei(n):
    return f"{n:02d}"

pfeil = "→"

# ── Teile der Seite ──
def nav_links():
    return [("#angebot", "Angebot"), ("#zettel", "Zettel"), ("#mit", "Was bringst du mit"), ("#raster", "Raster"), ("#spielen", "Apps"), ("#werke", "Werke"), ("#zuletzt", "Zuletzt")]

kopf = f'''<header class="kopf">
  <div class="rahmen kopf-innen">
    <a class="marke" href="./" aria-label="ornament.cloud Delta, Anfang der Seite">{signet}<span>ornament.cloud</span></a>
    <nav class="kopf-nav" aria-label="Abschnitte">{"".join(f'<a href="{h}">{t}</a>' for h, t in nav_links())}</nav>
    <div class="kopf-ende">
      <details class="menue"><summary>Menü</summary><nav aria-label="Abschnitte">{"".join(f'<a href="{h}">{t}</a>' for h, t in nav_links())}<a href="../b/">Zur Website /b/</a></nav></details>
      <a href="../b/">/b/</a>
      <a class="kontakt" href="mailto:{fuss_ort[1]}">Kontakt</a>
    </div>
  </div>
</header>'''

boot = "".join(f'<li><a href="{h}"><span class="nr">{i:03d}</span>{t}</a></li>' for i, (h, t) in enumerate(nav_links(), 1))
einstieg = f'''<section class="rahmen feld-zeile einstieg" aria-labelledby="einstieg-titel">
  <div class="einstieg-bild">
    <span class="koord o-l">[0,0]</span>
    <span class="koord o-r">Re-entry · Schlaufe mit Punkt</span>
    {signet_gross}
    <span class="kreuz-x" aria-hidden="true"></span><span class="kreuz-y" aria-hidden="true"></span>
    <span class="koord mitte" aria-hidden="true">X:49 · Y:07</span>
    <span class="lade" aria-hidden="true"><span class="lade-zahl">0%</span></span>
    <span class="koord u-l">Made in Switzerland</span>
  </div>
  <div class="einstieg-fuss">
    <h1 id="einstieg-titel">{titel_satz.group(1)}<small> {titel_satz.group(2)}</small></h1>
    <dl class="meta">
      <dt>Leistung</dt><dd class="doppel">:</dd><dd>Webdesign, Vermittlung und Beratung, kuratorische Projekte, Produkte</dd>
      <dt>Dazu</dt><dd class="doppel">:</dd><dd>Ein Zettelkasten, sieben Apps, vier Prüfraster</dd>
      <dt>Ort</dt><dd class="doppel">:</dd><dd>{html.escape(fuss_ort[0].replace("Christian Strickler, ", ""))}</dd>
      <dt>Von</dt><dd class="doppel">:</dd><dd>Christian Strickler</dd>
    </dl>
    <ol class="liste-boot">{boot}</ol>
  </div>
</section>'''

split = f'''<section class="rahmen feld-zeile split" aria-label="Theorie, die man anfassen kann">
  <div class="split-bild"><img src="../b/bilder/apps/phorma-i.svg" data-dunkel="../b/bilder/apps/phorma-i-dunkel.svg" alt="PHORMA I, gezeichnet: ein Kristall aus Scherben" width="1200" height="1200" loading="lazy"></div>
  <div class="split-text">
    <div class="oben">
      <p class="satz-gross"><b>Theorie, die man anfassen kann.</b> {html.escape(einstieg_satz.replace("Theorie, die man anfassen kann. ", ""))}</p>
      <p><a class="knopf" href="#zettel"><span>Zum Zettelkasten</span><span aria-hidden="true">{pfeil}</span></a></p>
    </div>
    <div class="leiste"><p class="etikett">In Zahlen</p><p class="etikett">[4]</p></div>
    <div class="zahlen"><div><b data-zahl="49">49</b><span>Zettel</span></div><div><b data-zahl="7">07</b><span>Apps</span></div><div><b data-zahl="4">04</b><span>Prüfraster</span></div><div><b data-zahl="4">04</b><span>Leistungen</span></div></div>
    <p class="kurzzeile">Diese Seite lädt nichts von aussen: keine Cookies, keine Werbung, keine Tracker.</p>
  </div>
</section>'''

def abschnitt_kopf(etikett, titel, text, href=None, weiter=None, id_=None):
    w = f'<a class="weiter" href="{rel(href)}">{weiter} {pfeil}</a>' if href else ""
    return f'''<div class="abschnitt-kopf"><p class="etikett akzent-punkt">{etikett}</p><h2{f' id="{id_}"' if id_ else ""}>{titel}</h2><div class="rechts"><p class="text">{text}</p>{w}</div></div>'''

karten = "".join(f'''<a class="karte" href="{rel(a["href"])}"><span class="karte-kopf"><span class="etikett">{a["href"].rstrip("/").split("/")[-1]}</span><span class="nr">[{zwei(i)}]</span></span><span class="karte-bild" aria-hidden="true">{a["zeichen"]}</span><h3>{a["titel"]}</h3><p class="text">{a["text"]}</p><span class="mehr">Leistung und Briefing {pfeil}</span></a>''' for i, a in enumerate(angebote, 1))
angebot = f'''<section class="rahmen feld-zeile" id="angebot" aria-labelledby="angebot-titel">
  {abschnitt_kopf("Angebot", "Vier Leistungen", "Vier Leistungen, made in Switzerland. Jede mit einer eigenen Seite: was dazugehört, was es kostet und wie ein Briefing aussieht.", "/b/angebot/", "Alle Leistungen", "angebot-titel")}
  <div class="vier">{karten}</div>
</section>'''

zellen = []
for r, zyklus in enumerate(ZYKLEN):
    zellen.append(f'<span class="zyklus">{zyklus}</span>')
    for z in zettel[r * 7:(r + 1) * 7]:
        t = feld_titel.get(z["n"], html.escape(z["titel"]))
        t = re.sub(r'^(Der|Die|Das) ', r'<span class="art">\1 </span>', t)
        zellen.append(f'<a href="../b/zettel/{z["slug"]}/" data-n="{z["n"]}" title="{html.escape(z["titel"])}"><span class="n">{zwei(z["n"])}</span><span class="t">{t}</span></a>')
erster = zettel[0]
zettel_daten = json.dumps([{"n": z["n"], "s": z["slug"], "t": z["titel"], "l": z["leitsatz"]} for z in zettel], ensure_ascii=False)
zettelkasten = f'''<section class="rahmen feld-zeile" id="zettel" aria-labelledby="zettel-titel">
  {abschnitt_kopf("Zettelkasten", k_feld["titel"], k_feld["text"], k_feld["href"], k_feld["weiter"], "zettel-titel")}
  <div class="zettel-buehne">
    <div class="zettel-satz">
      <p class="etikett">{html.escape(ohne_tags(kicker).split(".")[0])}. {html.escape(kicker_maus.split(":")[0])}.</p>
      <div>
        <p class="titelzeile"><span class="n etikett">Zettel {zwei(erster["n"])}</span><span class="t">{html.escape(erster["titel"])}</span></p>
        <p class="leitsatz" style="margin-top:14px">{html.escape(erster["leitsatz"])}</p>
      </div>
      <p class="knopfreihe"><a class="knopf voll lesen" href="../b/zettel/{erster["slug"]}/"><span>Zettel lesen</span><span aria-hidden="true">{pfeil}</span></a><button class="knopf nochmal" type="button" hidden><span>Noch einer</span><span aria-hidden="true">↻</span></button></p>
    </div>
    <nav class="feld" aria-label="Die 49 Zettel in sieben Zyklen">{"".join(zellen)}</nav>
  </div>
  <script type="application/json" id="zettel-daten">{zettel_daten}</script>
</section>'''

wege_html = "".join(f'''<details{" open" if i == 0 else ""}><summary>{w["was"]}</summary><div class="weg"><p>{w["satz"]}</p><ol>{w["liste"]}</ol></div></details>''' for i, w in enumerate(wege))
mit = f'''<section class="rahmen feld-zeile" id="mit" aria-labelledby="mit-titel">
  <div class="mit">
    <div class="mit-bild"><img src="../b/bilder/apps/filme/the-fictory.jpg" alt="" width="480" height="480" loading="lazy"><span class="koord">[480,480] · The Fictory</span></div>
    <div class="mit-text">
      <div class="oben"><p class="etikett akzent-punkt" style="margin-bottom:18px">Fünf Wege</p><h2 id="mit-titel">Was bringst du mit?</h2></div>
      {wege_html}
    </div>
  </div>
</section>'''

reihen = "".join(f'''<a class="reihe" href="{rel(r["href"])}"><div class="r-titel"><span class="nr">[{zwei(i)}]</span><h3>{r["name"]}</h3></div><div class="r-bild"><img src="../b/bilder/raster/{r["href"].rstrip("/").split("/")[-1]}.svg" data-dunkel="../b/bilder/raster/{r["href"].rstrip("/").split("/")[-1]}-dunkel.svg" alt="" width="1200" height="1200" loading="lazy"></div><div class="r-text"><span class="etikett status {"fertig" if r["status"] == "fertig" else "arbeit"}">{r["status"]}</span><p class="text">{r["kurz"]}</p><span class="pfeil"><span>Raster öffnen</span><span aria-hidden="true">{pfeil}</span></span></div></a>''' for i, r in enumerate(raster, 1))
pruefraster = f'''<section class="rahmen feld-zeile" id="raster" aria-labelledby="raster-titel">
  {abschnitt_kopf("Prüfraster", k_raster["titel"], k_raster["text"], k_raster["href"], k_raster["weiter"], "raster-titel")}
  {reihen}
</section>'''

def app_html(i, a):
    bild = (f'<span class="app-bild zeichnung"><img src="{rel(a["bild"])}" data-dunkel="{rel(a["dunkel"])}" alt="{a["alt"]}" width="1200" height="1200" loading="lazy"></span>' if a["zeichnung"]
            else f'<span class="app-bild"><img src="{rel(a["bild"])}" alt="{a["alt"]}" width="480" height="480" loading="lazy"></span>')
    return f'''<a class="app" href="{rel(a["href"])}"><span class="app-kopf"><span class="etikett">App</span><span class="nr">[{zwei(i)}]</span></span>{bild}<h3>{a["zeichen"]}{a["titel"]}</h3><p class="text">{a["text"]}</p></a>'''
apps_html = "".join(app_html(i, a) for i, a in enumerate(apps, 1)) + '<div class="app leer" aria-hidden="true"></div>'
spielen = f'''<section class="rahmen feld-zeile" id="spielen" aria-labelledby="spielen-titel">
  {abschnitt_kopf("Spielen", k_spielen["titel"], k_spielen["text"], k_spielen["href"], k_spielen["weiter"], "spielen-titel")}
  <div class="apps">{apps_html}</div>
</section>'''

beitraege_html = "".join(f'''<article class="beitrag"><p class="wer"><img src="{rel(b["avatar"])}" alt="" width="26" height="26" loading="lazy"><b>{b["wer"]}</b><span>{b["wo"]}</span></p><p class="zitat">{b["text"]}</p><p><a class="beleg" href="{rel(b["href"])}">{b["beleg"]} {pfeil}</a></p></article>''' for b in beitraege)
werke_zeichnung = '''<svg viewBox="0 0 200 160" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1"><rect x="40" y="18" width="120" height="96"/><rect x="54" y="32" width="92" height="68"/><path d="M54 92l26-26 18 18 12-12 36 30"/><circle cx="122" cy="52" r="7"/><path d="M60 114l-18 40M140 114l18 40M100 114v40"/><path d="M30 154h140" stroke-dasharray="3 3"/></svg>'''
werke_zuletzt = f'''<section class="rahmen feld-zeile" aria-label="Werke und Zuletzt">
  <div class="zwei">
    <div class="spalte-balken" id="werke">
      <div class="balken"><h2 class="gross" style="font-size:inherit"><span style="font-size:clamp(18px,1.6vw,24px)">{k_werke["titel"]}</span></h2><p>In Vorbereitung</p><span class="punkt" aria-hidden="true"></span></div>
      <p class="text">{k_werke["text"]}</p>
      <div class="werke-bild">{werke_zeichnung}<span class="koord o-l">[Edition 01]</span><span class="koord u-r">[in Vorbereitung]</span><span class="marke-feld"><small>Werke</small>Originale<br>und Prints</span></div>
      <p><a class="knopf" href="{rel(k_werke["href"])}"><span>{k_werke["weiter"]}</span><span aria-hidden="true">{pfeil}</span></a></p>
    </div>
    <div class="spalte-balken" id="zuletzt">
      <div class="balken"><h2 class="gross" style="font-size:inherit"><span style="font-size:clamp(18px,1.6vw,24px)">{k_zuletzt["titel"]}</span></h2><p>{k_zuletzt["text"]}</p><span class="punkt" aria-hidden="true"></span></div>
      {beitraege_html}
      <p><a class="knopf" href="{rel(k_zuletzt["href"])}"><span>{k_zuletzt["weiter"]}</span><span aria-hidden="true">{pfeil}</span></a></p>
    </div>
  </div>
</section>'''

aufruf = f'''<section class="rahmen feld-zeile aufruf" aria-labelledby="liste-titel">
  <span class="koord o-l">[0,240]</span>
  <h2 id="liste-titel">{liste.group(1)}</h2>
  <p class="text">{liste.group(2)}</p>
  <p class="knopfreihe"><a class="knopf voll" href="{html.escape(liste.group(3))}"><span>{liste.group(4)}</span><span aria-hidden="true">{pfeil}</span></a><a class="knopf" href="{rel(liste.group(5))}"><span>{liste.group(6)}</span></a></p>
  <span class="koord u-l">[0,544]</span><span class="koord u-r">Keine Cookies · keine Tracker</span>
</section>'''

fuss = f'''<footer class="rahmen fuss">
  <div class="fuss-raster feld-zeile">
    <div><p class="gross">Gestalten, vermitteln, kuratieren.</p></div>
    <div><p class="etikett">Bereiche</p><ul><li><a href="../b/zettel/">Zettelkasten</a></li><li><a href="../b/apps/">Apps</a></li><li><a href="../b/raster/">Prüfraster</a></li><li><a href="../b/werke/">Werke</a></li></ul></div>
    <div><p class="etikett">Angebot</p><ul>{"".join(f'<li><a href="{rel(a["href"])}">{a["titel"]}</a></li>' for a in angebote)}</ul></div>
    <div><p class="etikett">Kontakt</p><ul><li>{html.escape(fuss_ort[0])}</li><li><a href="mailto:{fuss_ort[1]}">{fuss_ort[1]}</a></li><li><a href="../b/ueber/">Über</a></li><li><a href="../feed.xml">Feed</a></li></ul></div>
    <div class="signet-feld" aria-hidden="true">{signet}</div>
  </div>
  <div class="wortmarke feld-zeile" aria-hidden="true"><svg viewBox="0 0 1000 104" preserveAspectRatio="xMidYMid meet"><text x="500" y="90" text-anchor="middle" textLength="990" lengthAdjust="spacingAndGlyphs">ORNAMENT.CLOUD</text></svg></div>
  <div class="fusszeile"><p class="etikett">© 2026 Christian Strickler · Diese Seite lädt nichts von aussen</p><p class="rechts"><a href="../impressum/">Impressum und Datenschutz</a><a href="../b/">Zur Website /b/</a></p></div>
</footer>'''

skript = '<script>' + (WURZEL / 'tools/delta/bewegung.js').read_text(encoding='utf-8') + '</script>'

seite = f'''<!doctype html>
<html lang="de-CH">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>ornament.cloud Delta – Gestalten, vermitteln, kuratieren</title>
<meta name="description" content="{html.escape(meta_desc)}">
<meta name="robots" content="noindex">
<meta name="author" content="Christian Strickler">
<meta name="theme-color" content="#f5f5ef" media="(prefers-color-scheme: light)">
<meta name="theme-color" content="#121211" media="(prefers-color-scheme: dark)">
<link rel="canonical" href="https://ornament.cloud/b/">
<link rel="icon" href="../b/bilder/signet/signet.svg" type="image/svg+xml">
<link rel="preload" href="../vendor/fonts/inter-display-600-latin.woff2" as="font" type="font/woff2" crossorigin>
<link rel="stylesheet" href="../vendor/fonts/fonts.css">
<link rel="stylesheet" href="delta.css?v=3">
</head>
<body>
<!-- Erzeugt von tools/delta/build.py aus b/index.html; nicht von Hand ändern. -->
<a class="sprung" href="#inhalt">Zum Inhalt</a>
{kopf}
<main id="inhalt">
{einstieg}
{split}
{angebot}
{zettelkasten}
{mit}
{pruefraster}
{spielen}
{werke_zuletzt}
{aufruf}
</main>
{fuss}
{skript}
</body>
</html>
'''
(WURZEL / "delta/index.html").write_text(seite, encoding="utf-8")
print("delta/index.html geschrieben:", len(seite), "Zeichen")
