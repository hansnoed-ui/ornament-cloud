# Perkussion 0.2.0 und Rhythmus 0.1.0 (Zyklen)

Auftrag: `prompts/perkussion.md` (Projektordner Composer), Phase A, 10. November 2026. Eigene Synthese, keine Samples, kein fremder Code.

## Instrumente (`erzeuger/perkussion-0.2.0.js`)

Die sechs Stimmen aus 0.1.0 (Tabla, Darbuka, Rahmentrommel, Riq, Zarb, Udu) sind dieselben, bitgleich (ein Test prüft das). Neu:

| Stimme | Schläge | Verfahren |
|---|---|---|
| Mridangam | Tham, Dheem, Thom, Tha, Num, Din, Chapu, Ta, Ki, Thi | rechtes Fell harmonisch (Fleck, wie Tabla), linkes Fell tief mit Paste |
| Kanjira | Dum, Gum (steigt), Ta, Ki | kleine Rahmentrommel, ein Schellenpaar, Tonhöhe durch Drücken |
| Ghatam | Thom, Gumki, Ta, Ki, Tha | Helmholtz-Ton der Öffnung, Moden des gebrannten Tons |
| Dholak | Dha, Ge, Ghe, Ka, Na, Ta, Ti | Bassfell mit Gleiten, Membran-Moden oben |
| Daf | Dum, Tek, Finger, Sak, Riz | grosse Rahmentrommel mit Ringketten |
| Davul | Dum, Tek, Kapalı, Trr | Schlegel und Rute, Variante Dohol |
| Naqareh | Dom, Tak, Kur, Rez | zwei Kesselpauken, fast harmonische Moden |
| Manjira, Sagat | offen, gedämpft, gepresst | zwei leicht verschiedene Zimbeln, Moden über 2 kHz |

Jede Stimme kennt ihre Klassen für den Generator: M (Bass und hoch, dha), B (Bass offen), BC (Bass geschlossen), H (hoch offen), HC (hoch geschlossen). Manjira und Sagat gelten im Arrangement als Höhen (wie die Hats).

## Zyklen (`kern/zyklen.js`)

Vorlagen mit Quelle: Teentaal, Ektaal, Jhaptal, Rupak, Dadra, Keharwa (nach Courtney, «Fundamentals of Tabla»); Maqsum, Baladi, Saidi, Malfuf, Samai Thaqil (verbreitete Doum/Tek-Lehrform, nicht gegen Noten geprüft); Persisch 6/8 und frei 5, 7, 9 als eigene Ableitungen.

Der Generator schreibt gewöhnliche Muster-Zeilen (eine je Takt, 8, 16 oder 32 Schläge). Die Spur bleibt damit von Hand änderbar; die Regler erzeugen sie neu.

- **Schlag**: eine Matra dauert eine Achtel, ab 130 BPM eine Viertel (Halftime); einstellbar.
- **Dichte** (50 = Theka wie notiert): darunter fallen zuerst die Nebenschläge, dann die Vibhag-Anfänge, der Sam bleibt immer; darüber leise Füllschläge.
- **Komplexität**: geteilte Schläge, Synkopen, ein Lauf (tirakita) vor einem Vibhag, längere Tihai-Figuren.
- **Variation**: vier Zyklen sind eine Phrase (A A A A′ bis A A′ A″ A‴); nach zwei Phrasen entwickelt sich das Grundmuster weiter. Gleiche Abschnittsart, gleiches Grundmuster.
- **Polyrhythmus**: tiefe Schläge alle 3, 5 oder 7 Matras ab dem Sam (eine Länge, die den Zyklus nicht teilt), in der zweiten Hälfte der Phrase.
- **Abschnitte**: jeder beginnt auf dem Sam; Dichte und Komplexität folgen der Art (Atmen dünn, Gas geben dicht); vor jedem Wechsel ein Tihai, dessen letzter Schlag auf dem nächsten Sam liegt.

## Im Composer

- «Perkussion aus Zyklen» (an): Ornament, Drum and Bass, Indien, Orient, Persisch, ECM und Hip-Hop nehmen für ihre Perkussion die Zyklen aus `STIL_ZYKLEN`, auch im Stilmix. Aus: die bisherigen festen Muster.
- Zeile «Perkussion»: Instrument und Zyklus wählen, «Perkussion dazu». In einem ganzen Track mit dessen Abschnitten und Arrangement.
- In der Spur: Gruppe «Zyklus» mit Vorlage, Schlag, Dichte, Komplexität, Variation, Polyrhythmus, «neu würfeln» und der Quelle der Vorlage.

Hörproben: `node tools/composer-perkussion-hoerproben.mjs <ordner>` (Instrumente, Zyklen, Regler); ganze Tracks rechnet die Seite.

Noch nicht: Arrangement-Strategien nur für die Perkussion und der Regler Akustisch ↔ Experimentell (Phase B), eigene Samples (Phase C), MIDI-Export, Kreisdarstellung.
