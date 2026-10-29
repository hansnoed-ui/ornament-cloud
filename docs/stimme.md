# Stimme (ornament.studio) – alpha/voice/

Seit 29. Oktober 2026. Auf ornament.cloud/alpha/voice/ gibt Christian einen Text ein (oder lädt eine Textdatei), wählt die Sprechweise
(B lebhaft, G ruhig) und bekommt die Aufnahme in seiner geklonten Stimme als WAV (48 kHz, 24 bit, Stereo) und MP3 (320 kbit/s).

## Aufbau

```
Seite alpha/voice/ ──► alpha/voice/stimme.php (Hostpoint) ──► GitHub-API: workflow_dispatch «Stimme» im PRIVATEN Repository
                         │  Passwort-Hash und Schlüssel in ~/ornament-geheim/stimme.json (ausserhalb der Website)
                         │  Aufträge und fertige Aufnahmen in ~/ornament-geheim/stimme/
                         ◄── holt das Artefakt (ZIP) des Laufs ab, packt WAV und MP3 aus, liefert sie nur angemeldet aus
```

- Gerechnet wird mit Chatterbox Multilingual (MIT) auf den Rechnern von GitHub Actions, wie Probe R2: Mischvorlage aus den Stimmproben
  Kdg1 und «Der zweite Sündenfall», Schreibweisen und Namen aus `aussprache.json`, Zahlen ausgeschrieben, Raum und Wärme.
- Das private Repository (Vorschlag `hansnoed-ui/ornament-studio`) enthält `.github/workflows/stimme.yml`, `stimme/sprechen.py`,
  `stimme/aussprache.json`, `stimme/requirements.txt` und die Stimmvorlagen `stimme/vorlagen/*.wav`. Vorlage dafür:
  Projektordner `studio/voice-repo/`. **Die Stimmvorlagen gehören nie in dieses öffentliche Repository**: wer sie hat, kann die Stimme klonen.
- Ohne Zugang (Secret fehlt) antwortet `stimme.php` mit `{"bereit":false}`, und die Seite sagt, dass die Stimme nicht eingerichtet ist.

## Einrichten (einmal)

1. Privates Repository `ornament-studio` anlegen und den Inhalt von `studio/voice-repo/` hineinlegen.
2. Schlüssel erzeugen: github.com → Settings → Developer settings → Personal access tokens → Fine-grained tokens → Generate new token.
   Name «Stimme Website», Repository access: *Only select repositories* → `ornament-studio`, Permissions → Repository → **Actions: Read and write**.
3. In **diesem** Repository (ornament-cloud): Settings → Secrets and variables → Actions:
   - Secret `STIMME_GITHUB_TOKEN` = der Schlüssel aus Schritt 2
   - Secret `STIMME_PASSWORT` = das Passwort für die Seite (landet auf dem Webspace nur als Hash)
   - optional Variable `STIMME_REPO`, falls das private Repository anders heisst
4. Workflow «Hostpoint» von Hand laufen lassen (Actions → Hostpoint → Run workflow). Im Schritt «Nachsehen» steht dann
   `Stimme {"bereit":true,"angemeldet":false}`.

## Grenzen

- Ein privates Repository hat 2000 Gratis-Minuten Actions im Monat, die Rechner dort haben 2 Kerne: Start 2–3 Minuten (Einrichten, Modelle
  aus dem Zwischenspeicher), dann grob 15 Sekunden Rechnen je Sekunde Sprache. Höchstens 5000 Zeichen je Auftrag, 40 Aufträge am Tag.
- Anmelden: 5 Fehlversuche je Viertelstunde und Adresse (Adressen nur als Prüfsumme, täglich neu).
- «Stoppen» bei einem wartenden oder laufenden Auftrag bricht den Lauf bei GitHub ab (auch wenn GitHub ihn erst nach dem Tippen zeigt). Ein bei GitHub
  von Hand abgebrochener Lauf erscheint ebenfalls als «abgebrochen». Derselbe Text mit derselben Sprechweise startet innert zehn Minuten keinen zweiten Lauf.
- Das Modell spricht mit 24 kHz; die WAV-Datei ist auf 48 kHz, 24 bit umgerechnet. Jede Aufnahme trägt das unhörbare Perth-Wasserzeichen.
- Artefakte bleiben 7 Tage bei GitHub; abgeholte Aufnahmen bleiben auf dem Webspace unter `~/ornament-geheim/stimme/fertig/`.

Test: `node --test tests/voice-php.test.mjs` (braucht php mit curl und zip, täuscht GitHub vor).
