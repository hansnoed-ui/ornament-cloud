# Umzug von GitHub Pages auf den Webspace bei Hostpoint

Stand 20. Oktober 2026. Wunsch von Christian: «nach dem Bau möchte ich die Seite weg vom GitHub-Repo auf einen eigenen Webspace stellen. Die Adresse liegt bei Hostpoint (ornament.cloud), ohne Anbindung an Webspace … ich habe bei Hostpoint auch Webspace, der mit anderen Adressen verbunden ist (z. B. ein Smart-Webhosting mit www.oberer-turm.ch)». Und: «kannst du sie dort genau so für mich weiterbearbeiten wie bei GitHub» – ja, so:

**GitHub bleibt die Quelle.** Alles wird weiter im Repository gebaut, geprüft und gemerged. Nach jedem Push auf `main` lädt ein GitHub-Actions-Workflow (`.github/workflows/hostpoint.yml`) die Website per rsync über SSH auf den Webspace. Der Webspace ist nur noch der Auslieferer; nichts wird dort von Hand geändert. GitHub Pages wird nach dem Umzug abgeschaltet.

Was im Repository dafür liegt (alles ohne Wirkung, solange die Variablen bei GitHub fehlen):

| Datei | Zweck |
| --- | --- |
| `.github/workflows/hostpoint.yml` | Workflow: Push auf `main` → Upload; von Hand auch als Probelauf |
| `tools/hostpoint/deploy.sh` | der Upload (rsync, Prüfsummen, `--delete`), auch von Hand aufrufbar |
| `tools/hostpoint/ausschluss.txt` | was nicht auf den Webspace gehört (Quellen, Werkzeuge, Tests, Doku, Git) |
| `.htaccess` | Apache: HTTPS ohne www, 404-Seite, Inhaltstypen, Zwischenspeicher, Kompression |
| `404.html` | die Seite für fehlende Adressen (GitHub Pages hatte eine eigene) |
| `robots.txt` | zeigt auf die Sitemap |
| `tests/hostpoint.test.mjs` | prüft, dass die Teile zusammenpassen |

## 1. Hostpoint: Webspace vorbereiten (Christian, im Control Panel)

Alles unter [admin.hostpoint.ch](https://admin.hostpoint.ch), angemeldet mit der Hostpoint-ID. Die Website kommt auf das bestehende Smart-Webhosting (dort liegt schon www.oberer-turm.ch; ein Webhosting trägt mehrere Websites, jede mit eigenem Verzeichnis).

1. **SSH einschalten.** Services → das Webhosting öffnen → links «Advanced» → «SSH-Zugang» einschalten, Shell «bash». Den **Account-Namen** notieren: er steht in der Server-Übersicht unter «Identität» und ist zugleich der SSH-Benutzer (nicht die Hostpoint-ID). Der SSH-Host heisst `ACCOUNT.ssh.cloud.hostpoint.ch`, Port 22.
   Quelle: [Wie kann ich SSH einrichten und verwenden?](https://support.hostpoint.ch/de/produkte/webhosting/haeufig-gestellte-fragen/wie-kann-ich-ssh-einrichten-und-verwenden)
2. **Schlüssel hinterlegen.** Auf dem eigenen Rechner ein Schlüsselpaar nur für diesen Zweck erzeugen:
   ```
   ssh-keygen -t ed25519 -C "github-actions ornament.cloud" -f ~/.ssh/hostpoint-ornament -N ""
   ```
   Den **öffentlichen** Schlüssel (`~/.ssh/hostpoint-ornament.pub`, eine Zeile) bei Hostpoint unter «Advanced» → «SSH-Zugang» eintragen. Der private (`~/.ssh/hostpoint-ornament`) geht in Schritt 2 zu GitHub und sonst nirgendwohin.
   Probe vom eigenen Rechner (unter Windows 11 zusätzlich `-m hmac-sha2-512`):
   ```
   ssh -i ~/.ssh/hostpoint-ornament ACCOUNT@ACCOUNT.ssh.cloud.hostpoint.ch 'pwd; command -v rsync; ls www'
   ```
   `pwd` zeigt das Heimverzeichnis, `command -v rsync` muss einen Pfad zeigen (sonst mir melden: dann lade ich über SFTP statt rsync), `ls www` zeigt die Verzeichnisse der bestehenden Websites.
3. **Website anlegen.** Links «Websites» → «Website erstellen»: Domain `ornament.cloud`, **Document Root** ein neues Verzeichnis, z. B. `www/ornament.cloud` (Pfad merken: er wird `HOSTPOINT_PFAD`). Falls das Panel anbietet, `www.ornament.cloud` als Alias mitzunehmen: ja (die `.htaccess` leitet www auf die Adresse ohne www).
   Fragt das Panel, ob es die **DNS-Zone** gleich auf das Webhosting stellen soll: **noch nicht** – erst, wenn die Dateien oben sind (Schritt 3). Lässt es sich nicht abwählen, ist das auch kein Unglück: die Seite ist dann für einige Minuten eine leere Hostpoint-Seite, bis der erste Upload durch ist.
   Quelle: [Konfigurationsfehler-FAQ, Abschnitt «Website erstellen»](https://support.hostpoint.ch/de/produkte/webhosting/haeufig-gestellte-fragen/wieso-wird-beim-aufrufen-meiner-website-ein-konfigurationsfehler-angezeigt)

## 2. GitHub: Workflow scharfstellen (Christian, einmalig)

Im Repository `hansnoed-ui/ornament-cloud`: Settings → Secrets and variables → Actions.

- Reiter **Variables**, «New repository variable», dreimal:
  - `HOSTPOINT_HOST` = `ACCOUNT.ssh.cloud.hostpoint.ch`
  - `HOSTPOINT_USER` = `ACCOUNT`
  - `HOSTPOINT_PFAD` = `www/ornament.cloud` (der Document Root aus Schritt 1.3, relativ zum Heimverzeichnis)
- Reiter **Secrets**, «New repository secret»: `HOSTPOINT_SSH_KEY` = der ganze Inhalt der privaten Schlüsseldatei `~/.ssh/hostpoint-ornament` (mit den Zeilen `-----BEGIN OPENSSH PRIVATE KEY-----` und `-----END …-----`).

Sobald `HOSTPOINT_HOST` gesetzt ist, läuft der Workflow bei jedem Push auf `main`. Vorher tut er nichts (`if: vars.HOSTPOINT_HOST != ''`).

## 3. Erster Upload und Probe (Christian stösst an, ich schaue zu)

1. Actions → «Hostpoint» → «Run workflow», Haken **Probelauf** → zeigt, was übertragen würde, ohne etwas zu ändern. Der Schritt «Verbindung und Ziel prüfen» muss grün sein; er sagt sonst, ob der Schlüssel, rsync oder das Verzeichnis fehlt.
2. Noch einmal «Run workflow», ohne Haken → der eigentliche Upload (etwa 120 MB, ein paar Minuten). Danach liegt die ganze Website im Document Root.
3. Prüfen, bevor die Domain umzieht: Hostpoint liefert eine Website nur unter ihrer Domain aus. Darum vom eigenen Rechner aus mit der Server-IP testen (sie steht im Panel in der Server-Übersicht; `IP` unten ersetzen):
   ```
   curl -sI --resolve ornament.cloud:80:IP http://ornament.cloud/ | head -5
   ```
   Erwartet: `301` nach `https://ornament.cloud/` (die `.htaccess` wirkt). Mit `--resolve ornament.cloud:443:IP https://…` kommt vor FreeSSL noch ein Zertifikatsfehler – das ist in Ordnung.

## 4. Domain umstellen (Christian) und absichern

1. **DNS.** Domains → `ornament.cloud` → DNS-Zone bearbeiten. Heute zeigen die A-Records auf GitHub Pages (185.199.108.153 … 111.153) und `www` ist vermutlich ein CNAME auf `hansnoed-ui.github.io`. Am einfachsten: die Vorlage **«Hostpoint-Standard»** (Vorschau ansehen, dann «Jetzt ausführen») – sie setzt A/AAAA auf das Webhosting und `www` dazu. Mail-Records: ornament.cloud hat keine eigene Mail (Kontakt ist Gmail), darum ändert die Vorlage nichts, was wehtut; wer es genau will, kontrolliert in der Vorschau, dass nur A, AAAA und `www` wechseln.
   Quelle: [DNS-Einstellungen auf Hostpoint-Standard](https://support.hostpoint.ch/de/technisches/dns/dns-aenderungen-mittels-autokonfiguration/hostpoint-standard-konfigurieren)
2. **FreeSSL.** Websites → bei `ornament.cloud` «Bearbeiten» → **FreeSSL** anhaken → speichern. Das Zertifikat (Let's Encrypt) kommt, sobald die DNS-Änderung beim Hostpoint-Server angekommen ist (Minuten bis wenige Stunden). Bis dahin zeigt `https://ornament.cloud` einen Zertifikatsfehler; `http://` leitet schon um. Falls das Panel beim Anlegen der Website FreeSSL schon angeboten hat: dann ist es bereits erledigt.
   Quelle: [Wie erhalte ich ein kostenloses SSL-Zertifikat?](https://support.hostpoint.ch/en/products/security/freessl/how-do-i-get-a-free-ssl-certificate)
3. **Nachsehen** (ich, sobald Christian «umgestellt» sagt; geht auch von Hand):
   ```
   curl -sI https://ornament.cloud/ | grep -iE '^(HTTP|server|cache-control|content-encoding|x-content-type)'
   curl -sI http://www.ornament.cloud/ | grep -iE '^(HTTP|location)'
   curl -sI https://ornament.cloud/gibt-es-nicht | head -1
   curl -sI https://ornament.cloud/alpha/orma/manifest.webmanifest | grep -i content-type
   ```
   Erwartet: `200` mit `cache-control: max-age=600`, `content-encoding: gzip` oder `br`; `www` → `301` auf `https://ornament.cloud/`; die fehlende Adresse → `404` (mit der eigenen Seite); das Manifest als `application/manifest+json`.
   Falls `https://ornament.cloud/` in einer Umleitungsschleife endet (`301` auf sich selbst): Hostpoint beendet TLS dann vor Apache; in der `.htaccess` die Zeile `RewriteCond %{HTTPS} !=on` durch `RewriteCond %{HTTP:X-Forwarded-Proto} !=https` ersetzen (ich).

## 5. Danach aufräumen (ich, in einem PR)

- GitHub Pages abschalten: Settings → Pages → Source «None» (Christian; ich kann es nicht). Bis dahin stört es nicht: Die Domain zeigt ja schon auf Hostpoint.
- `CNAME` löschen und den Test anpassen (`tests/orma.test.mjs` «Domain»).
- ~~Datenschutz im Impressum~~ erledigt am 22. Oktober 2026, gleich nach dem Umstellen der DNS: «Die Seiten liegen bei Hostpoint AG in Rapperswil-Jona (Schweiz) …».
- README: Abschnitt «Veröffentlichung» mit dem neuen Weg; den Hinweis auf GitHub Pages bei der Versionsmarke um die `.htaccess` ergänzen (zehn Minuten bleiben).
- Später, wenn gewünscht: Zwischenspeicher länger als zehn Minuten für Dateien mit Versionsmarke (dann müssen alle Bilder, die sich ändern, einen neuen Namen bekommen – das gilt heute schon für die Vorschaubilder).

## Rückweg

Solange `CNAME` im Repository liegt und GitHub Pages nicht abgeschaltet ist, genügt es, die DNS-Zone wieder auf die vier GitHub-Adressen zu stellen (A: 185.199.108.153, 185.199.109.153, 185.199.110.153, 185.199.111.153; `www` CNAME `hansnoed-ui.github.io`). Darum Schritt 5 erst, wenn der Umzug einige Tage gut lief.

## Was bleibt wie es ist

- Die Adressen: keine Seite bekommt eine neue URL; saubere Verzeichnisadressen (`/b/`, `/zu-seiner-zeit/…/`) liefert Apache mit `index.html` wie GitHub Pages.
- Die Versionsmarken `?v=` und die zehn Minuten Zwischenspeicher (README «Versionsmarke»; `tests/drittes-rad.e2e.mjs` «Zwischenspeicher»): die `.htaccess` setzt genau diese zehn Minuten.
- GoatCounter (Zählung ohne Cookies), die Service Worker der Apps (ihre Caches heissen weiter `orma-…`, `nn-…`, `fictory-…`, `phorma-…`, `omna-…`), Schriften und Skripte auf dem eigenen Server.
- Die Arbeit hier: Branch, Tests, PR, Merge – und der Upload geschieht von selbst.
