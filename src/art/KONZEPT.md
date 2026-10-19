# Art – Konzept für den Verkauf auf ornament.cloud

Stand 19. Oktober 2026. Grundlage sind drei Recherchen vom selben Tag: Zahlung und Bestellablauf in der Schweiz, Backend für eine statische Website sowie Gestaltung und Benutzerführung bei Galerien und Editionsshops. Quellen stehen am Schluss. Was nicht überprüft werden konnte, ist mit **[ungeprüft]** markiert.

## 0. Stand nach dem 19. Oktober 2026

- **Angebot:** Werke (Originale, Prints) und Dienstleistungen (Websites, Apps). Digitale Ware und Gestaltungspakete wie Signet oder Erscheinungsbild entfallen. Wo unten noch «Editionen» oder «Gestaltung» steht, sind jetzt Prints und Dienstleistungen gemeint.
- **Die Seite ist eine Ankündigung:** «Demnächst mehr», dazu ein Beispiel (der Print «Harbouring», Angaben und Preis Platzhalter) und die Dienstleistungen in einem Satz. Die Werke kommen in den nächsten Tagen.
- **Domain:** Der Entscheid über eine eigene Domain fällt in der Woche nach dem 19. Oktober 2026 (siehe 6).

## 1. Haltung

- **Eine Werkschau mit Preisen, kein Shop.** Gekauft wird nebenbei. Die Seite soll aussehen wie ein Galerieraum und nicht wie ein Warenkorb.
- **Der Preis steht immer da**, in Franken und in der Schreibweise «CHF 1’400.–». Laut Artsy verkaufen sich Werke mit sichtbarem Preis rund fünfmal häufiger. In der Schweiz verlangt die Preisbekanntgabeverordnung (PBV) bei Angeboten an Konsumenten ohnehin den tatsächlichen Preis; «Preis auf Anfrage» ist daher heikel.
- **Knappheit nur, wo sie echt ist.** Die Seite nennt Zahlen wie «Noch 18 von 25». Countdowns und Banner gibt es nicht.
- **Verkauftes bleibt sichtbar**, als Archiv und als Beleg, mit dem Vermerk «In Privatbesitz» oder «Vergriffen».
- **Nichts von aussen.** Die Seite lädt keine fremden Skripte (REGELN §11). Bezahlt wird höchstens über einen gewöhnlichen Link, der zu einer Bezahlseite führt.

## 2. Was jetzt steht (Stufe 1, ohne Konten und ohne Kosten)

- **Übersicht `art/`**
  - Filter: Alle, Originale, Editionen, Digital, Gestaltung.
  - Geordnet nach Serien. Jedes Werk liegt unbeschnitten auf Papierton, wie in einem Passepartout.
  - Der Stand steht in Worten, mit einem Punkt davor.
  - Gestaltung erscheint als drei Pakete mit Fixpreis, Umfang und «Nicht enthalten».
  - Danach folgen vier Zusagen, «So läuft eine Bestellung» und die Fragen.
- **Werkseite `art/<werk>/`**
  - Bild mit Lupe.
  - Preis und Stand, eine Hauptaktion und eine zweite.
  - Angaben in Tabellenziffern.
  - Gezeichneter Massstab, neben einem A4-Blatt oder einer Person von 1,70 m.
  - Text und weitere Arbeiten.
  - Auf dem Telefon eine Kaufleiste am unteren Rand.
- **Bestellen**
  - Der Knopf öffnet eine fertige Mail mit Werk, Preis und den Feldern für Name und Adresse.
  - Die Antwort darauf ist die Bestätigung, zusammen mit einer QR-Rechnung. Die lässt sich per E-Banking oder mit TWINT bezahlen.
  - Das Werk ist fünf Tage reserviert. Gebühren fallen keine an, und kein Dienst liest mit.
- **Danke-Seite `art/danke/`**: Sie zeigt den Ablauf «Bestätigt → Signiert und verpackt → Unterwegs → Angekommen».
- **Quelle**
  - Alle Daten stehen in einer Datei, `src/art/werke.json`.
  - Zwei Befehle erzeugen daraus Bilder und Seiten. Tests prüfen, ob die Seiten aktuell sind, die Angaben vollständig sind und nichts von aussen geladen wird.
- **Muster**
  - Alles ausser den beiden Apps ist zurzeit Muster. Die Seite sagt oben «Im Aufbau», die Knöpfe heissen «Interesse melden», und Suchmaschinen sind gesperrt.
  - Die Muster nehmen zwei echte Blätter aus dem Repo (aus The Fictory). Technik, Masse und Preise dazu sind Platzhalter.

## 3. Stufenplan

| Stufe | Wann | Was | Kosten |
|---|---|---|---|
| **1 · Mail und QR-Rechnung** (steht) | jetzt, bei wenigen Verkäufen | Bestellung als fertige Mail, Antwort mit QR-Rechnung. Die Rechnung lässt sich z. B. mit `swissqrbill` (MIT) erzeugen. Bestand und «verkauft» pflegst du in `werke.json`. | 0 |
| **2 · Zahlungslinks** | wenn Leute direkt bezahlen möchten | Pro Werk ein Zahlungslink (siehe unten), eingetragen als `"zahlungslink"`. Der Knopf heisst dann «Kaufen», «Lieber per Rechnung» bleibt daneben. | nur Gebühren pro Verkauf |
| **3 · Kasse mit Bestand** | erst, wenn es wirklich wächst | Ein Cloudflare Worker erzeugt Stripe-Checkout-Sitzungen. Ein Durable Object reserviert Unikate 30 Minuten lang und zählt Editionen. Ein Webhook meldet den Verkauf, Benachrichtigungen kommen per Cloudflare Email. Dazu Sveltia CMS unter `/admin` für die Pflege vom Telefon. Am besten auf eigener Subdomain (siehe 6). | Worker gratis, Mail ab ca. 5 USD/Mt. |

**Empfehlung:** bei Stufe 1 bleiben, bis echte Werke online sind. Stufe 2 nur für Editionen einführen. Originale über etwa CHF 1’500 laufen weiter über Anfrage und Rechnung; das ist üblich und für hohe Beträge gebührenfrei.

### Zahlungslinks im Vergleich

Die Gebühren gelten für ein Beispiel von CHF 400.

| | TWINT | Karten CH | Fixkosten | Besonderes |
|---|---|---|---|---|
| **Payrexx** (CH), Tarif Free | 1.3 % + 0.30 (5.50) | 2.5 % + 0.30 (10.30) | 0 | Schweizer Anbieter. Paylinks, Rechnung und Mini-Shop. Günstiger bei TWINT. **[Preise laut Anbieter, Mai 2026]** |
| **Stripe** Payment Links | 1.9 % + 0.30 (7.90) **[Stand 2025]** | 2.9 % + 0.30 (11.90) | 0 | Lässt sich auf eine Anzahl Zahlungen begrenzen, also 1 für ein Unikat oder die Auflage für eine Edition. Dazu Versandadresse, Versandraten, AGB-Häkchen und Beleg automatisch. Bester Weg zu Stufe 3. |
| **QR-Rechnung** | über die Bank-App | – | 0 | Manuelles Abgleichen über die Referenz (SCOR mit normaler IBAN). |
| Lemon Squeezy | – | 5 % + 0.50 USD | 0 | Nur für digitale Ware an EU-Privatkunden. Lemon Squeezy übernimmt dann als Verkäufer die EU-MWST. |

Nicht geeignet sind Stripe Buy Button, Shopify Buy Button, Snipcart und Ecwid-Einbettungen. Sie laden beim Aufruf fremde Skripte und widersprechen damit REGELN §11.

## 4. Backend

- **Für Stufe 1 und 2 ist `werke.json` das Backend.** Bei 40 bis 50 Werken reicht eine Datei. Sie liegt versioniert im Repo, und die Erzeuger lesen sie direkt.
- **Werk ändern**
  1. In `werke.json` die Angaben ändern.
  2. `node tools/build-art.mjs` ausführen.
  3. Bei neuen Bildern vorher `tools/art-bilder.mjs` ausführen.

  Claude kann das übernehmen: «Neues Werk: …, Foto liegt bei».
- **Später (Stufe 3): Sveltia CMS**
  - Eine Admin-Seite im Repo, die direkt nach GitHub schreibt.
  - Bilder werden beim Hochladen schon im Browser zu WebP verkleinert, auch vom iPhone (HEIC).
  - Für die Anmeldung braucht es einen kleinen Worker.
  - Das CMS ist noch Beta; Version 1.0 ist für Ende 2026 angekündigt. Darum eine feste Version ins Repo kopieren.
  - Ausweichlösung: **Pages CMS** (gehostet, aber mit Schreibrechten eines fremden Servers am Repo).
- **Nicht empfohlen**
  - Stripe als Katalog: zu wenige Felder für Technik und Edition.
  - Airtable, Notion oder Sheets: fremder Dienst, und Bilder aus Notion laufen nach einer Stunde ab.
  - Keystatic und Tina: brauchen React und einen Server.

## 5. Bestellablauf

**Zustände:** verfügbar → reserviert (Anfrage 5 Tage, Checkout 30 Min.) → bezahlt → verschickt → angekommen. Läuft eine Reservation ab, ist das Werk wieder verfügbar. Bei Editionen wird mitgezählt, bis sie vergriffen sind.

1. **Bestellung**: die Mail von der Seite oder, ab Stufe 2, der Zahlungslink.
2. **Bestätigung innert eines Tages**
   - Dank, Zusammenfassung, QR-Rechnung, Zahlungsfrist 5 Tage, Versandkosten.
   - Unverzüglich bestätigen; das verlangt UWG Art. 3 lit. s.
   - In `werke.json` auf `reserviert` setzen.
3. **Zahlung**: Das Werk wird auf `verkauft` gesetzt, bei Editionen sinkt `verfuegbar` um eins.
4. **Versand**
   - Zertifikat mit Foto, Titel, Jahr, Technik, Massen, Nummer und Unterschrift; optional ein QR-Code zur Werkseite.
   - Dazu eine Pflegekarte und eine Zeile von Hand.
   - Mail mit der Sendungsnummer.
5. **Nach etwa drei Tagen**: eine kurze Mail mit Pflegehinweisen und der Bitte um ein Foto am neuen Ort, freiwillig.

## 6. Domain und Hosting

GitHub Pages schliesst Seiten aus, die «primarily directed at … commercial transactions» sind. Eine Werkschau, auf der man nebenbei kaufen kann, ist vertretbar, solange der Verkauf Nebensache bleibt; das ist dein Plan. Wird Art zum Laden (Stufe 3), gehört dieser Teil auf eine eigene Subdomain, z. B. `shop.ornament.cloud` auf Cloudflare Pages. Dort ist auch der Worker. Die Gestaltung bleibt dieselbe.

## 7. Recht (Schweiz)

Eine Checkliste, bitte mit einer Treuhänderin oder einem Treuhänder prüfen.

- [ ] **Impressum**, Pflicht nach UWG Art. 3 lit. s: voller Name, Postadresse (kein Postfach) und Mail. **Muss stehen, bevor echt verkauft wird.**
- [ ] **AGB**, eine kurze Seite:
  - Preise in CHF, Vermerk «nicht MWST-pflichtig»
  - Reservations- und Zahlungsfrist
  - Versand und Gefahrübergang
  - Gewährleistung
  - Zoll trägt die Empfängerin oder der Empfänger
  - Die Bildrechte bleiben beim Künstler (URG Art. 16 Abs. 3)
  - Rückgabe
- [ ] **Rückgabe**: Die Schweiz kennt kein gesetzliches Widerrufsrecht. Für Käuferinnen und Käufer in der EU gilt aber wahrscheinlich deren Recht. Empfehlung: Editionen 14 Tage freiwillig zurücknehmen; so steht es schon auf der Seite. Ausgenommen sind Originale und Aufträge.
- [ ] **Datenschutzerklärung** (revDSG): wer verantwortlich ist, wozu Daten dienen, wie lange sie bleiben und wer sie bekommt (Mail, Post, Zahlungsanbieter). Es braucht kein Cookie-Banner, die Seite zählt ohne Cookies.
- [ ] **MWST**: Pflicht erst ab CHF 100’000 Umsatz. Eigene Werke, die du selbst lieferst, sind ausgenommen (MWSTG Art. 21 Abs. 2 Ziff. 16) **[Wortlaut prüfen]**. Gestaltung ist steuerbar, sobald die Grenze erreicht ist.
- [ ] **Digitale Ware an EU-Privatkunden** ist ab dem ersten Euro EU-MWST-pflichtig. Darum: Apps frei lassen, nur in der Schweiz verkaufen oder über einen Merchant of Record verkaufen.
- [ ] **Versand in die EU**: elektronische Zollanmeldung (Zolltarif 9701 für Gemälde, 9702 für Original-Druckgrafik). Seit dem 1. Juli 2026 erhebt die EU 3 EUR Zoll pro Artikel bis 150 EUR, ab dem 1. November 2026 kommt eine Gebühr von etwa 2 EUR dazu.
- [ ] **Editionen** im Schweizer Fine-Art-Labor drucken und selbst signieren und nummerieren. Print-on-Demand lässt sich bei der Auflagenkontrolle nicht überprüfen.
- Ein **Folgerecht** gibt es in der Schweiz nicht.

## 8. Gestaltungsregeln

1. Das Werk wird nie beschnitten: 4 : 5 ist der Rahmen, nicht der Ausschnitt.
2. Eine Hauptaktion pro Seite, höchstens eine zweite.
3. Bilder erzählen in Stufen: ganz → nah → Kante → Rückseite mit Signatur → gerahmt → im Raum.
4. Der Massstab ist gezeichnet. Raumbilder aus der KI haben oft falsche Grössen.
5. Bedienung nur als Text und Linie: keine Badges, keine Pop-ups, kein Newsletter-Fenster.
6. Bewegung nur als Überblendung, mit Rücksicht auf «weniger Bewegung».
7. Der Dunkelmodus färbt Bilder nie um; sie liegen auf einem neutralen Mittelton.
8. Jede Zusage der Seite wird im Paket eingelöst (Zertifikat, versicherter Versand).
9. Tonfall: per du, sachlich, keine Wörter wie «einzigartig» oder «exklusiv».
10. Nie eine Bildbeschreibung: Zu einem Werk stehen nur sachliche Angaben, etwa «Signiert und nummeriert.» (Wunsch vom 19. Oktober 2026).

## 9. Offene Entscheide für dich

1. **Welche Werke zuerst?** Für den Start reichen 8 bis 12. Pro Werk Fotos: frontal und farbtreu, ein Detail, die Kante im Streiflicht, die Rückseite mit Signatur, wenn möglich gerahmt.
2. **Preise und Auflagen**: Originale und Editionen mit festen Grössen (A3, A2).
3. **Zahlungsweg für Stufe 2**: Payrexx (Schweiz, günstiger bei TWINT) oder Stripe (bester Ausbau zu Stufe 3). Oder vorerst nur Rechnung.
4. **Impressum**: Name und Postadresse für die Seite.
5. **Versand**: in der Schweiz inbegriffen, wie die Seite jetzt sagt? Rahmung anbieten?
6. **Apps**: frei lassen (Vorschlag) und nur Auftragsfassungen anbieten, oder etwas verkaufen?
7. **OMNA COLOR als Kartenset**: ernsthaft prüfen? Ein Druck von 100 Schachteln wäre eine schöne Edition.
8. **Gestaltung**: Pakete und Preise so lassen, ändern oder nur «Auftrag nach Mass»?

## Quellen (Auswahl)

- Preise und Markt: Artsy Collector Insights 2024; artnet zur Preistransparenz; SECO zum Onlinehandel und zur PBV; law.ch zur PBV.
- Zahlung: stripe.com/en-ch/pricing; docs.stripe.com/payment-links/customize; docs.stripe.com/payments/checkout/managing-limited-inventory; payrexx.com/en-ch/preise; twint.ch (QR-Rechnungen mit TWINT); github.com/schoero/swissqrbill (4.4.2, MIT).
- Backend: github.com/sveltia/sveltia-cms (0.248.0); github.com/pagescms/pagescms; GitHub Pages limits (docs); Cloudflare D1, KV und Durable Objects (Grenzen, Preise); Cloudflare Email Sending (Public Beta seit 16. April 2026).
- Gestaltung: Pace (Instrument), Hauser & Wirth Editions, Avant Arte, Counter Editions, Fondation Beyeler Shop, Edition VFO, Taschen Art Editions, 20x200; web.dev zu Fetch Priority; Cooper Hewitt Guidelines for Image Description; schema.org/VisualArtwork.
- Recht und Versand: post.ch zur EU-Zollreform 2026; Kommission zur Zollreform; MWSTV Art. 48a; CMS zum Widerrufsrecht für Schweizer Händler.
