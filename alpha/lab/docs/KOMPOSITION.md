# Kompositorisches Parametersystem

Stand: 23. Oktober 2026, ORNAMENT LAB 0.1.2. Masterprompt §8 («Wie lassen sich filmästhetische Eigenschaften als veränderbare Operationen beschreiben?») und §18 («Statt einer spezifischen Filmästhetik: ein allgemeines kompositorisches Parametersystem»).

Code: `kern/komposition.js` (Messung und Zerlegung, ohne DOM), `operationen/komposition.js` (zwei Operationen). Tests: `tests/lab.test.mjs`, `tests/lab.e2e.mjs`.

## Der Gedanke

Ein Bild wird in Komponenten zerlegt, die sich messen **und** verändern lassen. Dieselbe Zerlegung dient beiden Zwecken:

| Komponente | Teil des Bildes | gemessen als |
|---|---|---|
| Lage des Gewichts | Abweichung der Leuchtdichte vom Grund (Median), ihr Schwerpunkt | Schwerpunkt, Ausdehnung |
| Spiegelung | `(I − I′)/2`, der asymmetrische Teil zur Achse | Symmetrie links–rechts, oben–unten |
| Lichtgefälle | angepasste Ebene der Leuchtdichte über x und y | Gefälle, Richtung, Stärke |
| Mitte/Rand | angepasster radialer Verlauf der Leuchtdichte | Mitte/Rand |
| Binnenkontrast | Leuchtdichte ohne Mittel, Gefälle und Mitte/Rand | Binnenkontrast (Effektivwert) |
| Farbe | Abweichung vom Grau gleicher Leuchtdichte | Sättigung, Farbton, Bündelung |

Die Operation **Komposition verändern** multipliziert jede Komponente mit einem Faktor. Das ist das Prinzip des Attenuverters aus der Modulationsforschung (MODULATION-DOSSIER.md), übertragen von einem Signal auf eine Bildkomponente:

- **1** lässt die Komponente stehen. Alle Faktoren 1 ergeben dieselben Pixel (getestet).
- **0** hebt sie auf: spiegelgleich, gleichmässig beleuchtet, grau, Schwerpunkt in der Mitte.
- **−1** kehrt sie um: gespiegelt, Licht von der anderen Seite, Tonwerte umgekehrt, Gegenfarben, Schwerpunkt gegenüber.
- **2** verdoppelt sie.

So bedeuten «verstärken, abschwächen, ins Gegenteil verkehren» für jede Eigenschaft dasselbe. Jeder Faktor ist ein Zahlparameter von −1 bis 2. Darum erreicht ihn die Modulation wie jeden anderen Parameter: Ein Sinus verteilt die Asymmetrie über sechs Varianten, ein Bildsignal steuert die Sättigung, eine Zeitroute lässt das Licht über die Animation wandern.

**Zielprofil.** Statt der Faktoren kann ein Profil gelten, das an einem anderen eigenen Bild gemessen wurde. Jede Komponente wird dann dem Ziel angeglichen. Die «Angleichung» (0–1) mischt zwischen Faktoren und Ziel. Aus nichts entsteht dabei keine Struktur: Ein Bild ohne Farbe bekommt durch Skalieren keine Sättigung. Lichtgefälle, Mitte/Rand und Schwerpunkt werden gesetzt, die übrigen Grössen skaliert.

**Keine Bewertung.** Es gibt keine Gesamtzahl und keinen Wert, der «besser» wäre. Es gibt auch keine Regel wie den goldenen Schnitt oder die Drittelregel. Das Profil sagt, wie ein Bild gebaut ist, nicht, ob es gelungen ist (Masterprompt §1, §24).

## Reihenfolge der Operation

Fest und im Protokoll vermerkt: **Ausschnitt → Symmetrie → Lichtgefälle → Mitte/Rand → Binnenkontrast → Sättigung.** Jeder Schritt misst seine Komponente am aktuellen Zwischenstand. Auf 0–1 begrenzt wird erst nach dem letzten Schritt, wie bei der Modulation die Summe erst am Ende begrenzt wird.

Die Komponenten sind nicht ganz unabhängig. Ein Lichtgefälle von links nach rechts ist zugleich asymmetrisch zur senkrechten Achse, und eine verstärkte Asymmetrie verändert auch den Binnenkontrast. Darum misst die Operation das Profil **vorher und nachher** und schreibt beides ins Protokoll. Was tatsächlich geschehen ist, steht dort, nicht nur, was eingestellt war.

## Die Messgrössen

Gemessen wird auf einem Raster von höchstens 512 Punkten je Seite. Die Spiegelpartner liegen immer im vollen Bild. Koordinaten: x von −0,5 (links) bis 0,5 (rechts), y von −0,5 (oben) bis 0,5 (unten). Winkel werden wie auf dem Bildschirm gelesen: 0° nach rechts, 90° nach oben.

| Grösse | Definition | Stand |
|---|---|---|
| `schwerpunkt.x`, `.y` | Schwerpunkt von \|L − Median(L)\|. Eine gleichmässige Fläche wiegt nichts, ein heller Fleck auf dunklem Grund so viel wie ein dunkler auf hellem. | Messung |
| `schwerpunkt.abstand` | Abstand zur Mitte, 1 = Ecke | Messung |
| `schwerpunkt.ausdehnung` | mittlerer Abstand des Gewichts vom Schwerpunkt; 1 = so verteilt wie ein gleichmässiges Gewicht, klein = eng | Messung; die Lesart «nahe Einstellung» ist eine **Hypothese** |
| `symmetrie.linksRechts`, `.obenUnten` | Energie des symmetrischen Teils / (symmetrisch + asymmetrisch), an der Leuchtdichte ohne Mittel. 1 spiegelgleich, 0,5 ohne Bezug, 0 gegengleich | Messung |
| `licht.helligkeit` | mittlere Leuchtdichte (Rec. 709) | Messung |
| `licht.gefaelleX`, `.gefaelleY` | Zunahme der Leuchtdichte von Rand zu Rand (Kleinste-Quadrate-Ebene) | Messung |
| `licht.gefaelleWinkel`, `.gefaelleStaerke` | wohin es heller wird, und wie stark | Messung |
| `licht.mitte` | um wie viel die Mitte heller ist als die Ecken (negativ: Rand heller) | Messung |
| `kontrast.gesamt` | Standardabweichung der Leuchtdichte | Messung |
| `kontrast.binnen` | dasselbe ohne Gefälle und Mitte/Rand | Messung |
| `kontrast.tonumfang` | 95-%- minus 5-%-Quantil der Leuchtdichte | Messung |
| `farbe.saettigung` | Effektivwert der Abweichung vom Grau gleicher Leuchtdichte | Messung |
| `farbe.farbton`, `.buendelung` | Kreismittel des Farbtons im Gegenfarbenraum; Bündelung 1 = ein Farbton, 0 = viele heben sich auf | Messung |
| `richtung.kantenWinkel`, `.kohaerenz` | vorherrschende Kantenrichtung aus dem Strukturtensor (0° waagrecht); Kohärenz 1 = alle Kanten parallel | Messung; die Lesart «Bewegungsrichtung» ist eine **Hypothese** |
| `richtung.radial` | wie stark die Kanten auf die Bildmitte zulaufen; 0,5 = ungerichtet | Messung; die Lesart «Zentralperspektive» ist eine **Hypothese** |

Die Lesarten stehen als `lesarten` im Profil selbst, damit sie in jedem gespeicherten Projekt von den Messungen getrennt bleiben (Masterprompt §20).

## Was nicht gemessen wird

Tiefenstaffelung, Blickwinkel, Kameradistanz im eigentlichen Sinn, Einstellungslänge, Rhythmus und Übergänge zwischen Einstellungen lassen sich an einem einzelnen Standbild ohne Tiefen- oder Zeitinformation nicht verlässlich messen. Sie bleiben offen. Einstellungslänge, Rhythmus und Übergang gehören zu Bildfolgen und werden ein Thema, sobald das Lab Video als Eingang annimmt (Typ VIDEO).

## Die Filmstill-Datenbanken

ShotDeck, FilmGrab, Flim und Frameset wurden für diese Arbeit **nicht neu untersucht und nicht abgefragt**. Übernommen sind nur die Eigenschaften, die der Masterprompt (§8) als ihre Kategorien nennt: Bildausschnitt, Licht, Farbe, Symmetrie, Kamera. In der REFERENZ-MATRIX bleibt ihr Stand «Hypothese».

Das Lab misst ausschliesslich Material, das die Person selbst hineinlegt. Es lädt nichts aus diesen Diensten, speichert keine Filmstills und legt keine Referenzsammlung an. Das Feld `referenz` im Profil ist `null` und für später vorgesehen: Wenn einmal ein freigegebenes Referenzbild verwendet wird, gehören dort Quelle und Rechte hin. Ein Zielprofil enthält nur Zahlen und kein Bild. Es lässt sich deshalb weitergeben, ohne das Bild weiterzugeben, an dem es gemessen wurde.

## Im Lab

1. **Kompositorisches Profil** (`lab.profil`, Beobachtung): Bild → Befund (METADATA). Die Karte zeigt eine Skizze, mit dem Schwerpunkt als Punkt, der Ausdehnung als Kreis, dem Lichtgefälle als Pfeil und der Kantenrichtung gestrichelt, dazu alle Werte.
2. **Komposition verändern** (`lab.komposition`, räumlich): Bild (+ Zielprofil, optional) → Bild. Jede Variante trägt ihr Profil «nachher» als Befund, die Karte nennt die grössten Veränderungen («Symmetrie l–r 0,45 → 0,91»). Der eigene Verlauf führt die Faktoren für die Animation gleichmässig von 1 zum eingestellten Wert.

Ein möglicher Ablauf: Zuerst zwei eigene Bilder importieren und von Bild B das Profil messen. Dann Bild A mit «Komposition verändern» und Zielprofil B rechnen. Zum Schluss mit der Differenz beobachten, was sich verändert hat.

## Nächste Schritte

- **Profil als Steuersignal:** die Messwerte einer Bildreihe (oder einer Animation, Bild für Bild) als Steuersignal. Die Komposition eines Verlaufs würde damit eine andere Operation steuern.
- **Örtliche Profile:** dieselben Messungen je Bildbereich, etwa in Feldern 3 × 3, statt nur für das ganze Bild.
- **Richtung verändern:** Die Kantenrichtung wird bisher nur gemessen. Eine Richtungsspur (gerichtetes Verwischen entlang oder quer zur Kantenrichtung) wäre der passende Eingriff.
