# jev live für «Die Paradoxie der Stadt» – Cloudflare Worker

Der Worker steht zwischen der Seite `alpha/stadt/` und jev (api.typesafe.ai). Er hält den Schlüssel, damit er nie in der Seite steht.

**Was er annimmt:** nur `POST /stadt/querung` von `https://ornament.cloud` (Variable `ERLAUBT`), höchstens 2000 Zeichen, und nur eine Lage, die `liveLage()` aus `alpha/stadt/fragen.js` gelten lässt: Zahlen und feste Wörter (Person, Zweck, Ziel, Möglichkeiten, Mehrzeit in Minuten, Brücke, Verkehr, Wartezeit an der Ampel, eilig, müde, mit Kind, Ersatzziel, Gewohnheit). Kein Name, kein freier Text, keine weiteren Schlüssel.

**Was er tut:** baut aus der Lage selbst die Frage an jev (`liveFrage()`, fester Wortlaut), fragt jev mit dem Schlüssel, gibt nur die Wahrscheinlichkeiten der erlaubten Möglichkeiten zurück. Gleiche Lagen kommen 30 Tage aus dem Zwischenspeicher von Cloudflare. Je Adresse höchstens 20 Anfragen in der Minute.

**Kosten:** ein Aufruf hat etwa 1200 Eingabe-Token, bei 0,042 $ je Million rund 0,005 Cent; die Seite fragt nur für die begleitete Person und nur, wenn jemand «jev live fragen» einschaltet.

## Einrichten (einmal)

1. Ein Cloudflare-Konto (der kostenlose Plan genügt).
2. Im Ordner `tools/jev-worker/`:

       npx wrangler login
       npx wrangler secret put TYPESAFE_API_KEY      (den Schlüssel für jev eingeben)
       npx wrangler deploy

   `wrangler deploy` nennt die Adresse, etwa `https://jev-stadt.<konto>.workers.dev`.
3. In `alpha/stadt/live.js` die Adresse eintragen, mit dem Weg:

       export const JEV_LIVE_ADRESSE = "https://jev-stadt.<konto>.workers.dev/stadt/querung";

   Danach in allen Importen der Stadt die Versionsmarke `?v=` hochzählen (README), testen, veröffentlichen.

Solange die Adresse leer ist, erscheint der Schalter nicht, und die Stadt rechnet nur mit der Tabelle.

## Prüfen

    node --test tests/jev-worker.test.mjs        (jev vorgetäuscht: Herkunft, Prüfung der Lage, Wortlaut, Begrenzung)
    npx wrangler deploy --dry-run                 (bündelt, ohne hochzuladen)

Ein echter Aufruf ohne Cloudflare, mit dem Worker-Code in Node: siehe `tests/jev-worker.test.mjs` und dort `fetch` nicht ersetzen; der Schlüssel kommt aus `TYPESAFE_API_KEY` oder einem Proxy, der ihn einsetzt.
