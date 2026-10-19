# Social Media – ein Zettelkasten über Beiträge

Seit 19. Oktober 2026 unter [ornament.cloud/social-media/](https://ornament.cloud/social-media/), im Menü als fünftes Kästchen «Social».

Beiträge aus X, Facebook und Instagram werden **gesichert, abgeschrieben, verschlagwortet und kommentiert**. Jeder Beitrag wird ein Zettel:
die Abschrift im Kleid seiner Plattform (lesbar, durchsuchbar, zugänglich), darüber der Kommentar der Redaktion, darunter der Beleg
(das Bildschirmfoto, geschwärzt), der Zeitstrahl, Schlagworte, wer spricht, Verweise und ein Zitiervorschlag.

Die Idee dahinter ist eine Beobachtung zweiter Ordnung: Der Zettelkasten zeigt nicht nur, *was* gesagt wurde, sondern auch, *wann es jemand bemerkt hat*.
Darum trägt jeder Zettel zwei Zeiten – veröffentlicht und gesichert – und den Abstand dazwischen («nach 2 Jahren gesichert»),
und die Zeitleiste lässt sich nach beiden ordnen.

## Die Seiten

| Adresse | Inhalt |
|---|---|
| `social-media/` | Zeitleiste: Monate, Zettel, Zeitband (Zettel je Woche), Filter (Suche, Plattform, Schlagworte, Autor:innen, Woche), Ordnung nach Sicherung oder Veröffentlichung. Der Stand steht in der Adresse (`?schlagwort=stadt,archiv&autor=x-handle&plattform=x&q=…&woche=…&ordnung=veroeffentlicht`), teilbar. Ohne JavaScript: alle Zettel und die Register. |
| `social-media/<nr>-<titel>/` | ein Zettel |
| `social-media/schlagworte/` | Register der Schlagworte, A–Z, mit den Zetteln |
| `social-media/autorinnen/` | Register der Autor:innen, nach Plattform, mit Profil-Link |
| `social-media/feed.xml` | RSS der letzten 50 Zettel |
| `social-media/redaktion/` | **die Redaktion** (noindex, nicht verlinkt, nicht in der Sitemap) |

Gestaltung: `social-media/social.css`. Zwei Stimmen, zwei Schriften: Der Beitrag steht in der Schrift der Website, der Kommentar in Newsreader.
Die Plattformen erkennt man an ihrer Ordnung (X: Name, Text, Zahlen; Facebook: Kopf, Text, Bilanz, Tun – kurze Texte gross; Instagram: zuerst das Bild,
mehrere als Karussell) und an einem feinen Ton (X Tinte, Facebook ein gedämpftes Blau, Instagram der Verlauf als Ring um das Profilbild). Keine Logos.

## Die Redaktion

### Einmal einrichten

1. **GitHub-Schlüssel**: <https://github.com/settings/personal-access-tokens/new> → *Fine-grained token*, Ablaufdatum wählen,
   *Repository access: Only select repositories* → `hansnoed-ui/ornament-cloud`, *Permissions → Repository → Contents: Read and write*. Erzeugen, kopieren.
2. **Anthropic-Schlüssel** (für Claude, freiwillig): <https://platform.claude.com/settings/keys>.
3. `https://ornament.cloud/social-media/redaktion/` öffnen → *Einstellungen* → beide Schlüssel einsetzen → *Verbindung prüfen*.
   «Auf diesem Gerät merken» behält sie in diesem Browser (localStorage), sonst bis das Fenster zugeht. *Schlüssel vergessen* löscht sie.

Die Schlüssel verlassen den Browser nur in Richtung GitHub und Anthropic; die Seite erlaubt mit einer Inhaltssicherheitsrichtlinie keine anderen
Verbindungen und keine fremden Skripte, und sie hat keine Besuchsstatistik.

### Ein Zettel entsteht

1. **Material**: Bildschirmfoto hineinziehen, mit Strg/⌘+V einfügen oder wählen. Dazu, wenn vorhanden, die Bilder und Videos des Beitrags in voller Qualität
   (MP4/WebM, bis 90 MB; über 25 MB warnt die Redaktion). Die **Adresse des Beitrags** einsetzen: Daraus liest die Redaktion Plattform und Handle –
   und bei X und Instagram die **genaue Zeit der Veröffentlichung**, die in der Kennung des Beitrags steckt (X: Snowflake-ID, Instagram: Medien-ID).
2. **Mit Claude lesen**: Claude (Opus 5.5, strukturierte Ausgabe) schreibt den Text Zeichen für Zeichen ab, liest Name, Handle, Zeit, Kennzahlen, zitierte Beiträge,
   übersetzt fremdsprachige Texte, findet eingebettete Bilder (werden ausgeschnitten), das Profilbild und **Namen und Gesichter Dritter** (werden zum Schwärzen
   vorgeschlagen) und schlägt Titel und Schlagworte vor – bevorzugt aus den bestehenden. Den Kommentar schreibt Claude nicht. Hohe Bildschirmfotos gehen in
   überlappenden Teilen hin, damit die Schrift lesbar bleibt. Kosten: je nach Grösse wenige Rappen; die Redaktion zeigt Token und Betrag.
   Was von Hand eingetragen ist, überschreibt Claude nicht.
3. **Bereiche** im Bildschirmfoto prüfen: Rechtecke für *Bild*, *Profilbild*, *Schwärzen* ziehen, verschieben, an der Ecke grösser ziehen, mit × entfernen.
   Geschwärzt wird mit voller Fläche (nicht weichgezeichnet), vor dem Ausschneiden – auch im veröffentlichten Beleg.
4. **Prüfen und ergänzen**: Text, Zeit, Zahlen, Bildbeschreibungen; dann Titel, **einleitender Kommentar** (Absätze, `*kursiv*`, `**fett**`, `[Text](https://…)`),
   **Schlagworte** (Enter; gleiche Schreibweise wie bestehende wird übernommen), Verweise auf andere Zettel (Antwort, Widerspruch, Ergänzung, Kontext, Fortsetzung),
   Status des Originals (noch online / nicht mehr online, geprüft am).
5. **Veröffentlichen**: Die Redaktion schreibt Bilder neu (WebP, ohne Metadaten), rechnet die Prüfsumme (SHA-256) der Originaldatei, zeichnet die Vorschaukarte zum
   Teilen (1200 × 630) und schreibt **einen Commit** auf `main`: Medien, `daten/eintraege.json`, alle Seiten des Bereichs, Feed und Sitemap. Hat sich der Zweig
   inzwischen verändert, baut sie den Commit neu (bis dreimal). GitHub Pages stellt ihn nach etwa einer Minute online; die Redaktion wartet und zeigt den Link.

Der Entwurf liegt laufend im Browser (IndexedDB, mit den Dateien): Geht die Seite zu, ist beim nächsten Öffnen alles wieder da.
Unter *Alle Zettel* lässt sich jeder Zettel **bearbeiten** (Medien bleiben, neue kommen dazu, einzelne lassen sich entfernen) und **löschen**
(Seite, Medien und Verweise darauf verschwinden mit einem Commit).

### Ohne Redaktion

Die Daten lassen sich auch von Hand (oder mit Claude Code) ändern: `social-media/daten/eintraege.json` bearbeiten, dann

    node tools/build-social-media.mjs

schreibt alle Seiten, den Feed und die Sitemap neu und löscht Seiten von Zetteln, die es nicht mehr gibt. Nach Änderungen an
`social-media/js/darstellung.js` ebenso. `tests/social-media.test.mjs` meldet veraltete Seiten.

## Datenmodell

Ein Zettel in `social-media/daten/eintraege.json` (Pfade relativ zu `social-media/`):

```json
{
  "nr": 12, "id": "12-titel-in-der-adresse",
  "plattform": "x",                         // x | facebook | instagram
  "titel": "Kurzer Titel", "kontext": "Antwort an @…",
  "autor": { "name": "…", "handle": "ohne @", "profil": "https://x.com/…", "verifiziert": false, "avatar": "medien/12/avatar.webp" },
  "quelle": "https://x.com/…/status/…",
  "veroeffentlicht": "2026-10-18T14:03:00Z", // oder "2026-10-18" oder "2026-10" oder null
  "veroeffentlichtQuelle": "adresse",        // adresse | bild | hand
  "erfasst": "2026-10-19T06:30:00Z",          // die Sicherung, auf die Minute
  "geaendert": "2026-10-19T06:31:12Z",
  "sprache": "en", "uebersetzung": "…",
  "text": "genau abgeschrieben",
  "medien": [{ "typ": "bild", "datei": "medien/12/bild-1.webp", "breite": 1200, "hoehe": 900, "alt": "…" },
             { "typ": "video", "datei": "medien/12/video-1.mp4", "poster": "medien/12/video-1.jpg", "breite": 720, "hoehe": 1280, "alt": "…" }],
  "zitiert": { "autor": { "name": "…", "handle": "…" }, "text": "…" },
  "kennzahlen": { "antworten": 3, "reposts": 12, "likes": 300, "ansichten": 12000 },   // bei der Erfassung
  "beleg": { "datei": "medien/12/beleg.webp", "breite": 1179, "hoehe": 2556, "sha256": "…", "geschwaerzt": true },
  "karte": { "datei": "medien/12/karte.jpg", "breite": 1200, "hoehe": 630 },
  "kommentar": "…", "schlagworte": ["Stadt", "Archiv"],
  "verweise": [{ "id": "7-…", "art": "antwort" }],   // antwort | widerspruch | ergaenzung | kontext | fortsetzung
  "status": "online", "geprueft": "2026-10-19"         // online | geloescht | unbekannt
}
```

Die Nummer ist fortlaufend und wird nie neu vergeben; die Adresse (`id`) bleibt, auch wenn sich der Titel ändert.

## Technik

- `social-media/js/darstellung.js` – alle Seiten aus den Daten; läuft im Browser und in Node. Datum, Zahlen und Reihenfolge sind von Hand gerechnet
  (keine `Intl`, kein `localeCompare`), damit Browser und Node Zeichen für Zeichen dasselbe schreiben; der Browser-Test vergleicht es.
- `social-media/js/quelle.js` – Plattform, Handle, Profil und Zeit aus Adressen.
- `social-media/js/zeitleiste.js`, `zettel.js`, `karussell.js` – Verhalten der öffentlichen Seiten.
- `social-media/js/redaktion/` – `app.js` (Oberfläche), `erkennen.js` (Claude: Prompt, Schema, Rückfallstufen), `bilder.js` (Leinwand: schwärzen, ausschneiden,
  Vorschaukarte, Teile für Claude), `github.js` (Git-API: Blobs, Baum, Commit, Zweig), `zusammenstellen.js` (was ein Commit enthält), `ablage.js` (Schlüssel, Entwurf).
- `vendor/anthropic-sdk-0.135.0/` – das offizielle Anthropic-SDK, für den Browser gebündelt (nur die Redaktion lädt es).
- `kopfleiste.js` – das Menü (für die erzeugten Seiten, auch im Browser).

## Recht und Anstand

Die Zettel sind Zitate zu Zwecken der Erläuterung, des Hinweises und der Veranschaulichung (Art. 25 URG): Der Kommentar ist der Grund des Zitats,
die Quelle ist genannt und verlinkt. Namen und Bilder unbeteiligter Dritter werden geschwärzt. Im Fuss jeder Seite steht: Wer hier zitiert ist und das nicht
möchte, schreibt eine Mail; der Zettel verschwindet (*Alle Zettel → Löschen*).

## Tests

    node --test tests/social-media.test.mjs                       # Adressen, Zeit, Zahlen, Text, Sicherheit, Seiten auf dem Stand, Commit, Claude-Schema
    NODE_PATH=$(npm root -g) node tests/social-media.e2e.mjs       # Zeitleiste, Zettel, Handy; Redaktion gegen nachgebildetes GitHub und Claude

Die Beispielzettel in `tests/fixtures/social-media/` sind erfunden (Konten und Texte) und nur für Tests und Vorschau; ihre Bilder zeichnet
`NODE_PATH=$(npm root -g) node tests/fixtures/social-media/bilder.mjs`. Vorschau mit ihnen:

    node tools/build-social-media.mjs --daten tests/fixtures/social-media/eintraege.json --ziel /tmp/sm-vorschau
