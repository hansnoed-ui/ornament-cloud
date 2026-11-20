// ornament.lab · Handy in vier Sprachen (20. November 2026, Wunsch: «Gibt es das ornament lab auch schon englisch, spanisch, französisch?» → «Ja»
// für die Handy-Fassung und die Landing). Gemerkt wie im Dritten Rad, in ORNA und OMNA COLOR: ?sprache=de|en|es|fr, dann localStorage
// «ornament.sprache», dann die Sprache des Geräts. Ohne DOM ausser setzeSeite(), damit Tests die Vollständigkeit prüfen können.
// Gerechnet wird in allen Sprachen gleich; Zettel und ORNA-Konstellationen im Film bleiben Christians deutsche Texte.

export const SPRACHEN = Object.freeze(["de", "en", "es", "fr"]);
export const KUERZEL = Object.freeze({ de: "d", en: "e", es: "s", fr: "f" });
export const NAME = Object.freeze({ de: "Deutsch", en: "English", es: "Español", fr: "Français" });
const SCHLUESSEL = "ornament.sprache";

/** die Sprache der Seite: Adresse, dann gemerkt, dann Gerät, sonst Deutsch */
export function spracheWaehlen({ suche = globalThis.location?.search ?? "", speicher = globalThis.localStorage, geraet = globalThis.navigator?.languages ?? [] } = {}) {
  const passt = (x) => SPRACHEN.find((s) => String(x ?? "").toLowerCase().startsWith(s));
  const adresse = passt(new URLSearchParams(suche).get("sprache"));
  if (adresse) { try { speicher?.setItem(SCHLUESSEL, adresse); } catch { /* privat */ } return adresse; }
  let gemerkt = null; try { gemerkt = passt(speicher?.getItem(SCHLUESSEL)); } catch { /* privat */ }
  return gemerkt ?? geraet.map(passt).find(Boolean) ?? "de";
}
export function merken(sprache) { try { globalThis.localStorage?.setItem(SCHLUESSEL, sprache); } catch { /* privat */ } }

export const T = Object.freeze({
  de: {
    titel: "ornament.lab · Handy", zumLab: "zum ganzen Lab", sprache: "Sprache", buehne: "Bühne", bildschirme: "Bildschirme",
    s0: "Material", s1: "Effekt", s2: "Varianten", s3: "Klang", s4: "Film", s5: "Galerie",
    leer: "Wähle ein Bild, ein Video oder nimm das Beispielbild.", rechnet: "Rechnet …", abbrechen: "Abbrechen",
    materialFrage: "Was bringst du mit?", bild: "Bild", video: "Video", ton: "Ton", waehlen: "wählen", geladen: "geladen", videoKurz: "6 Standbilder + Ton",
    tonFormate: "MP3, WAV, M4A", beispiel: "Beispielbild", oeffnen: "Projekt öffnen",
    hinweisLeer: "Ohne Ton macht das Lab den Beat aus dem Bild. Alles bleibt auf dem Handy.", hinweisSichern: "Neu laden verliert die Arbeit. Unter «Galerie» sicherst du das Projekt.", hinweisDa: "Alles bleibt auf dem Handy.",
    effektWaehlen: "wähle einen", anteil: "Anteil", jevVor: "schlägt vor", anwenden: "Anwenden",
    nebeneinander: "sechs nebeneinander", verteilung: "Verteilung über die Varianten", sinus: "Sinus", rampe: "Rampe", dreieck: "Dreieck", zufall: "Zufall",
    sechs: "Sechs rechnen", wuerfeln: "Neu würfeln", weiter: "Weiterführen", verteilt: "{p} verteilt",
    beatAusBild: "Beat aus dem Bild", schlagzeug: "Schlagzeug", regeln: "Nach Regeln", jevWaehlt: "wählt", hoeren: "Hören", stopp: "Stopp", eigenerTon: "eigener Ton",
    filmText: "30 s aus Bild und Klang", format: "Format", wieMaterial: "wie Material", jevStellt: "stellt zusammen", jevNeu: "neu", rechnen: "Film rechnen", neuRechnen: "Neu rechnen",
    abschnitteLeer: "jev stellt sechs Abschnitte zusammen", zettel: "Zettel", orna: "ORNA", aus: "aus", an: "an",
    filmPlan: "{wer} · {s} s Animation{sig}", signatur: " + Signatur", zufallWer: "Zufall", bilderGalerie: "{n} Bilder aus der Galerie",
    galerieText: "dein Weg, Schritt für Schritt", wegLeer: "Hier steht dein Weg, sobald ein Bild da ist.", keineBilder: "Noch keine Bilder.",
    png: "PNG", inDenFilm: "In den Film", projektSichern: "Projekt sichern", schritteNach: "{n} Schritte nacheinander", nebenZahl: "{name} · {n} nebeneinander",
    zurueck: "zurück zum Raster", gross: "{t}, gross zeigen", variante: "Variante {n}", schritt: "Schritt {n}: {name}", abschnitt: "Abschnitt {n}: {name}", bildAusFilm: "Bild {n} aus dem Film nehmen",
    tonEtikett: "Ton", effektEtikett: "Effekt wählen", anteilEtikett: "Anteil {n} %", jevGewichtet: "jev hat gewichtet", keinKlang: "noch kein Klang", vonJev: "gewählt von jev", nachRegeln: "nach Regeln", vorschau: "Vorschau",
    esRechnet: "Es rechnet schon. Erst fertig rechnen lassen oder abbrechen.", abgebrochen: "Abgebrochen.", fehler: "Fehler: {m}",
    liest: "{name} wird gelesen …", bildGelesen: "{b} × {h} px. Wische weiter zu «Effekt».", tonGelesen: "Ton: {d}. Er wird die Tonspur des Films.",
    videoGelesen: "{n} Standbilder und die Tonspur.", videoStumm: "{n} Standbilder, ohne lesbaren Ton ({grund}).", beispielFehlt: "Das Beispielbild liess sich nicht laden: {m}",
    ungesichert: "Das jetzige Projekt ist nicht gesichert. Trotzdem öffnen?", ja: "Ja", nein: "Nein", oeffnet: "{name} wird geöffnet …", geoeffnet: "«{t}»: {n} Ergebnisse.", geoeffnetFehlt: "«{t}»: {n} Ergebnisse, {f} Dateien fehlen.",
    zuerstBild: "Zuerst ein Bild unter «Material».", zuerstEffekt: "Wähle zuerst unter «Effekt» einen Effekt.", wirdGerechnet: "{name} wird gerechnet …", mitAnteil: "{name} mit {n} % …",
    angewendet: "Angewendet. Das ist jetzt dein Bild.", weitergefuehrt: "Weitergeführt. Diese Variante ist jetzt dein Bild.", weitergefuehrtBild: "Weitergeführt. Dieses Bild ist jetzt dein Bild.",
    jevWeg: "jev ist gerade nicht erreichbar. Wähle selbst, die Regeln des Labs gelten weiter.", jevGefragt: "jev wird gefragt …", jevSagt: "jev: {name} (p = {p}).", jevSagtCache: "jev: {name} (p = {p}), aus dem Zwischenspeicher.",
    sechsVarianten: "Sechs Varianten: {name} …", variantenHinweis: "«Sechs rechnen» verteilt {p} über sechs Varianten.", variantenLeer: "Wähle zuerst unter «Effekt» einen Effekt, dann rechnet das Lab hier sechs Varianten.", einParameter: "einen Parameter",
    gehoert: "Das Bild wird gehört …", jevBeat: "jev wählt Tempo, Groove, Klänge und Tonart …", beatSpielt: "Der Beat wird gespielt und gemischt …", jevNichtBeat: "jev {m}: nach Regeln gemacht.", nichtErreichbar: "nicht erreichbar",
    misst: "Bild und Klang werden gemessen …", keinTon: "Noch kein Ton: das Lab macht den Beat aus dem Bild …", jevStelltZusammen: "jev stellt zusammen …",
    jevHat: "jev ({m}) hat zusammengestellt. Tippe Abschnitte an, um sie auszuschalten.", zufaelligZusammen: "Zufällig zusammengestellt (jev {m}).",
    zusammenRechnet: "Die Zusammenstellung wird gerechnet …", deinFilm: "Dein Film wird gerechnet …", filmBilder: "Der Film wird gerechnet: {n} Bilder …", filmFortschritt: "Film: {k} von {n} Bildern",
    filmFertig: "Film fertig: {d}, {mb} MB.", filmFertigTon: "Film fertig: {d}, {mb} MB, mit Ton.",
    ausFilm: "Aus dem Film genommen.", imFilm: "Im Film: {n} Bilder. Unter «Film» rechnen.", imFilm1: "Im Film: 1 Bild. Unter «Film» rechnen.",
    sichernSpaeter: "Sichern geht, sobald die Rechnung fertig ist.", packt: "Projekt wird gepackt …", gesichert: "Gesichert: {mb} MB. Öffnen geht hier und im ganzen Lab.", zuGross: "Gesichert: {mb} MB. Achtung: zu gross, um es wieder zu öffnen.",
    jevLive: "jev live", jevAus: "jev ist nicht erreichbar: dann Regeln und Zufall", materialSchritt: "Material", beatTitel: "Beat aus Bild",
  },
  en: {
    titel: "ornament.lab · Mobile", zumLab: "to the full lab", sprache: "Language", buehne: "Stage", bildschirme: "Screens",
    s0: "Material", s1: "Effect", s2: "Variants", s3: "Sound", s4: "Film", s5: "Gallery",
    leer: "Choose an image or a video, or take the sample image.", rechnet: "Working …", abbrechen: "Cancel",
    materialFrage: "What do you bring?", bild: "Image", video: "Video", ton: "Sound", waehlen: "choose", geladen: "loaded", videoKurz: "6 stills + sound",
    tonFormate: "MP3, WAV, M4A", beispiel: "Sample image", oeffnen: "Open project",
    hinweisLeer: "Without sound the lab makes a beat from the image. Everything stays on your phone.", hinweisSichern: "Reloading loses your work. Save the project under «Gallery».", hinweisDa: "Everything stays on your phone.",
    effektWaehlen: "choose one", anteil: "Amount", jevVor: "suggests", anwenden: "Apply",
    nebeneinander: "six side by side", verteilung: "Spread across the variants", sinus: "Sine", rampe: "Ramp", dreieck: "Triangle", zufall: "Random",
    sechs: "Make six", wuerfeln: "Roll again", weiter: "Continue", verteilt: "{p} spread",
    beatAusBild: "Beat from the image", schlagzeug: "Drums", regeln: "By rules", jevWaehlt: "chooses", hoeren: "Listen", stopp: "Stop", eigenerTon: "your own sound",
    filmText: "30 s from image and sound", format: "Format", wieMaterial: "as material", jevStellt: "composes", jevNeu: "again", rechnen: "Render film", neuRechnen: "Render again",
    abschnitteLeer: "jev composes six sections", zettel: "Zettel", orna: "ORNA", aus: "off", an: "on",
    filmPlan: "{wer} · {s} s animation{sig}", signatur: " + signature", zufallWer: "Chance", bilderGalerie: "{n} images from the gallery",
    galerieText: "your path, step by step", wegLeer: "Your path appears here once there is an image.", keineBilder: "No images yet.",
    png: "PNG", inDenFilm: "Into the film", projektSichern: "Save project", schritteNach: "{n} steps one after another", nebenZahl: "{name} · {n} side by side",
    zurueck: "back to the grid", gross: "{t}, show large", variante: "Variant {n}", schritt: "Step {n}: {name}", abschnitt: "Section {n}: {name}", bildAusFilm: "Take image {n} out of the film",
    tonEtikett: "Sound", effektEtikett: "Choose an effect", anteilEtikett: "Amount {n} %", jevGewichtet: "weighted by jev", keinKlang: "no sound yet", vonJev: "chosen by jev", nachRegeln: "by rules", vorschau: "Preview",
    esRechnet: "Already working. Let it finish or cancel.", abgebrochen: "Cancelled.", fehler: "Error: {m}",
    liest: "Reading {name} …", bildGelesen: "{b} × {h} px. Swipe on to «Effect».", tonGelesen: "Sound: {d}. It becomes the soundtrack of the film.",
    videoGelesen: "{n} stills and the soundtrack.", videoStumm: "{n} stills, no readable sound ({grund}).", beispielFehlt: "The sample image could not be loaded: {m}",
    ungesichert: "The current project is not saved. Open anyway?", ja: "Yes", nein: "No", oeffnet: "Opening {name} …", geoeffnet: "«{t}»: {n} results.", geoeffnetFehlt: "«{t}»: {n} results, {f} files missing.",
    zuerstBild: "First an image under «Material».", zuerstEffekt: "First choose an effect under «Effect».", wirdGerechnet: "Rendering {name} …", mitAnteil: "{name} at {n} % …",
    angewendet: "Applied. This is your image now.", weitergefuehrt: "Continued. This variant is your image now.", weitergefuehrtBild: "Continued. This image is your image now.",
    jevWeg: "jev is not reachable right now. Choose yourself; the lab's rules still apply.", jevGefragt: "Asking jev …", jevSagt: "jev: {name} (p = {p}).", jevSagtCache: "jev: {name} (p = {p}), from the cache.",
    sechsVarianten: "Six variants: {name} …", variantenHinweis: "«Make six» spreads {p} across six variants.", variantenLeer: "First choose an effect under «Effect»; then the lab makes six variants here.", einParameter: "one parameter",
    gehoert: "Listening to the image …", jevBeat: "jev chooses tempo, groove, sounds and key …", beatSpielt: "Playing and mixing the beat …", jevNichtBeat: "jev {m}: made by rules.", nichtErreichbar: "not reachable",
    misst: "Measuring image and sound …", keinTon: "No sound yet: the lab makes a beat from the image …", jevStelltZusammen: "jev is composing …",
    jevHat: "jev ({m}) has composed. Tap sections to switch them off.", zufaelligZusammen: "Composed by chance (jev {m}).",
    zusammenRechnet: "Rendering the composition …", deinFilm: "Rendering your film …", filmBilder: "Rendering the film: {n} frames …", filmFortschritt: "Film: {k} of {n} frames",
    filmFertig: "Film ready: {d}, {mb} MB.", filmFertigTon: "Film ready: {d}, {mb} MB, with sound.",
    ausFilm: "Taken out of the film.", imFilm: "In the film: {n} images. Render under «Film».", imFilm1: "In the film: 1 image. Render under «Film».",
    sichernSpaeter: "Saving works once rendering is done.", packt: "Packing the project …", gesichert: "Saved: {mb} MB. You can open it here and in the full lab.", zuGross: "Saved: {mb} MB. Careful: too large to open again.",
    jevLive: "jev live", jevAus: "jev is not reachable: rules and chance instead", materialSchritt: "Material", beatTitel: "Beat from image",
  },
  es: {
    titel: "ornament.lab · Móvil", zumLab: "al laboratorio completo", sprache: "Idioma", buehne: "Escenario", bildschirme: "Pantallas",
    s0: "Material", s1: "Efecto", s2: "Variantes", s3: "Sonido", s4: "Película", s5: "Galería",
    leer: "Elige una imagen o un vídeo, o usa la imagen de ejemplo.", rechnet: "Calculando …", abbrechen: "Cancelar",
    materialFrage: "¿Qué traes?", bild: "Imagen", video: "Vídeo", ton: "Sonido", waehlen: "elegir", geladen: "cargada", videoKurz: "6 fotogramas + sonido",
    tonFormate: "MP3, WAV, M4A", beispiel: "Imagen de ejemplo", oeffnen: "Abrir proyecto",
    hinweisLeer: "Sin sonido, el laboratorio crea un ritmo a partir de la imagen. Todo se queda en tu móvil.", hinweisSichern: "Recargar borra el trabajo. Guarda el proyecto en «Galería».", hinweisDa: "Todo se queda en tu móvil.",
    effektWaehlen: "elige uno", anteil: "Intensidad", jevVor: "propone", anwenden: "Aplicar",
    nebeneinander: "seis una al lado de otra", verteilung: "Reparto entre las variantes", sinus: "Seno", rampe: "Rampa", dreieck: "Triángulo", zufall: "Azar",
    sechs: "Calcular seis", wuerfeln: "Volver a tirar", weiter: "Continuar", verteilt: "{p} repartido",
    beatAusBild: "Ritmo a partir de la imagen", schlagzeug: "Batería", regeln: "Por reglas", jevWaehlt: "elige", hoeren: "Escuchar", stopp: "Parar", eigenerTon: "sonido propio",
    filmText: "30 s de imagen y sonido", format: "Formato", wieMaterial: "como el material", jevStellt: "compone", jevNeu: "otra vez", rechnen: "Calcular película", neuRechnen: "Calcular de nuevo",
    abschnitteLeer: "jev compone seis secciones", zettel: "Zettel", orna: "ORNA", aus: "apagado", an: "encendido",
    filmPlan: "{wer} · {s} s de animación{sig}", signatur: " + firma", zufallWer: "Azar", bilderGalerie: "{n} imágenes de la galería",
    galerieText: "tu camino, paso a paso", wegLeer: "Aquí aparece tu camino en cuanto haya una imagen.", keineBilder: "Aún no hay imágenes.",
    png: "PNG", inDenFilm: "A la película", projektSichern: "Guardar proyecto", schritteNach: "{n} pasos uno tras otro", nebenZahl: "{name} · {n} una al lado de otra",
    zurueck: "volver a la cuadrícula", gross: "{t}, ver en grande", variante: "Variante {n}", schritt: "Paso {n}: {name}", abschnitt: "Sección {n}: {name}", bildAusFilm: "Quitar la imagen {n} de la película",
    tonEtikett: "Sonido", effektEtikett: "Elige un efecto", anteilEtikett: "Intensidad {n} %", jevGewichtet: "ponderado por jev", keinKlang: "aún sin sonido", vonJev: "elegido por jev", nachRegeln: "por reglas", vorschau: "Vista previa",
    esRechnet: "Ya está calculando. Espera a que termine o cancela.", abgebrochen: "Cancelado.", fehler: "Error: {m}",
    liest: "Leyendo {name} …", bildGelesen: "{b} × {h} px. Desliza hasta «Efecto».", tonGelesen: "Sonido: {d}. Será la banda sonora de la película.",
    videoGelesen: "{n} fotogramas y la banda sonora.", videoStumm: "{n} fotogramas, sin sonido legible ({grund}).", beispielFehlt: "No se pudo cargar la imagen de ejemplo: {m}",
    ungesichert: "El proyecto actual no está guardado. ¿Abrir de todos modos?", ja: "Sí", nein: "No", oeffnet: "Abriendo {name} …", geoeffnet: "«{t}»: {n} resultados.", geoeffnetFehlt: "«{t}»: {n} resultados, faltan {f} archivos.",
    zuerstBild: "Primero una imagen en «Material».", zuerstEffekt: "Primero elige un efecto en «Efecto».", wirdGerechnet: "Calculando {name} …", mitAnteil: "{name} al {n} % …",
    angewendet: "Aplicado. Esta es ahora tu imagen.", weitergefuehrt: "Continuado. Esta variante es ahora tu imagen.", weitergefuehrtBild: "Continuado. Esta imagen es ahora tu imagen.",
    jevWeg: "jev no está disponible ahora. Elige tú; las reglas del laboratorio siguen valiendo.", jevGefragt: "Preguntando a jev …", jevSagt: "jev: {name} (p = {p}).", jevSagtCache: "jev: {name} (p = {p}), de la memoria intermedia.",
    sechsVarianten: "Seis variantes: {name} …", variantenHinweis: "«Calcular seis» reparte {p} entre seis variantes.", variantenLeer: "Primero elige un efecto en «Efecto»; después el laboratorio calcula aquí seis variantes.", einParameter: "un parámetro",
    gehoert: "Escuchando la imagen …", jevBeat: "jev elige tempo, groove, sonidos y tonalidad …", beatSpielt: "Tocando y mezclando el ritmo …", jevNichtBeat: "jev {m}: hecho por reglas.", nichtErreichbar: "no disponible",
    misst: "Midiendo imagen y sonido …", keinTon: "Aún sin sonido: el laboratorio crea un ritmo a partir de la imagen …", jevStelltZusammen: "jev está componiendo …",
    jevHat: "jev ({m}) ha compuesto. Toca las secciones para apagarlas.", zufaelligZusammen: "Compuesto al azar (jev {m}).",
    zusammenRechnet: "Calculando la composición …", deinFilm: "Calculando tu película …", filmBilder: "Calculando la película: {n} fotogramas …", filmFortschritt: "Película: {k} de {n} fotogramas",
    filmFertig: "Película lista: {d}, {mb} MB.", filmFertigTon: "Película lista: {d}, {mb} MB, con sonido.",
    ausFilm: "Quitada de la película.", imFilm: "En la película: {n} imágenes. Calcula en «Película».", imFilm1: "En la película: 1 imagen. Calcula en «Película».",
    sichernSpaeter: "Podrás guardar cuando termine el cálculo.", packt: "Empaquetando el proyecto …", gesichert: "Guardado: {mb} MB. Puedes abrirlo aquí y en el laboratorio completo.", zuGross: "Guardado: {mb} MB. Atención: demasiado grande para volver a abrirlo.",
    jevLive: "jev en directo", jevAus: "jev no está disponible: entonces reglas y azar", materialSchritt: "Material", beatTitel: "Ritmo de la imagen",
  },
  fr: {
    titel: "ornament.lab · Mobile", zumLab: "vers le laboratoire complet", sprache: "Langue", buehne: "Scène", bildschirme: "Écrans",
    s0: "Matière", s1: "Effet", s2: "Variantes", s3: "Son", s4: "Film", s5: "Galerie",
    leer: "Choisis une image ou une vidéo, ou prends l’image d’exemple.", rechnet: "Calcul en cours …", abbrechen: "Annuler",
    materialFrage: "Qu’apportes-tu ?", bild: "Image", video: "Vidéo", ton: "Son", waehlen: "choisir", geladen: "chargée", videoKurz: "6 images fixes + son",
    tonFormate: "MP3, WAV, M4A", beispiel: "Image d’exemple", oeffnen: "Ouvrir un projet",
    hinweisLeer: "Sans son, le laboratoire tire un rythme de l’image. Tout reste sur ton téléphone.", hinweisSichern: "Recharger fait perdre le travail. Enregistre le projet dans « Galerie ».", hinweisDa: "Tout reste sur ton téléphone.",
    effektWaehlen: "choisis-en un", anteil: "Dosage", jevVor: "propose", anwenden: "Appliquer",
    nebeneinander: "six côte à côte", verteilung: "Répartition sur les variantes", sinus: "Sinus", rampe: "Rampe", dreieck: "Triangle", zufall: "Hasard",
    sechs: "En calculer six", wuerfeln: "Relancer", weiter: "Poursuivre", verteilt: "{p} réparti",
    beatAusBild: "Rythme tiré de l’image", schlagzeug: "Batterie", regeln: "Selon les règles", jevWaehlt: "choisit", hoeren: "Écouter", stopp: "Arrêter", eigenerTon: "son personnel",
    filmText: "30 s d’image et de son", format: "Format", wieMaterial: "comme la matière", jevStellt: "compose", jevNeu: "à nouveau", rechnen: "Calculer le film", neuRechnen: "Recalculer",
    abschnitteLeer: "jev compose six sections", zettel: "Zettel", orna: "ORNA", aus: "éteint", an: "allumé",
    filmPlan: "{wer} · {s} s d’animation{sig}", signatur: " + signature", zufallWer: "Hasard", bilderGalerie: "{n} images de la galerie",
    galerieText: "ton chemin, pas à pas", wegLeer: "Ton chemin s’affiche ici dès qu’il y a une image.", keineBilder: "Pas encore d’images.",
    png: "PNG", inDenFilm: "Dans le film", projektSichern: "Enregistrer le projet", schritteNach: "{n} étapes l’une après l’autre", nebenZahl: "{name} · {n} côte à côte",
    zurueck: "retour à la grille", gross: "{t}, afficher en grand", variante: "Variante {n}", schritt: "Étape {n} : {name}", abschnitt: "Section {n} : {name}", bildAusFilm: "Retirer l’image {n} du film",
    tonEtikett: "Son", effektEtikett: "Choisis un effet", anteilEtikett: "Dosage {n} %", jevGewichtet: "pondéré par jev", keinKlang: "pas encore de son", vonJev: "choisi par jev", nachRegeln: "selon les règles", vorschau: "Aperçu",
    esRechnet: "Un calcul est déjà en cours. Laisse-le finir ou annule.", abgebrochen: "Annulé.", fehler: "Erreur : {m}",
    liest: "Lecture de {name} …", bildGelesen: "{b} × {h} px. Glisse vers « Effet ».", tonGelesen: "Son : {d}. Il devient la bande-son du film.",
    videoGelesen: "{n} images fixes et la bande-son.", videoStumm: "{n} images fixes, sans son lisible ({grund}).", beispielFehlt: "L’image d’exemple n’a pas pu être chargée : {m}",
    ungesichert: "Le projet actuel n’est pas enregistré. Ouvrir quand même ?", ja: "Oui", nein: "Non", oeffnet: "Ouverture de {name} …", geoeffnet: "« {t} » : {n} résultats.", geoeffnetFehlt: "« {t} » : {n} résultats, {f} fichiers manquants.",
    zuerstBild: "D’abord une image dans « Matière ».", zuerstEffekt: "Choisis d’abord un effet dans « Effet ».", wirdGerechnet: "Calcul de {name} …", mitAnteil: "{name} à {n} % …",
    angewendet: "Appliqué. C’est maintenant ton image.", weitergefuehrt: "Poursuivi. Cette variante est maintenant ton image.", weitergefuehrtBild: "Poursuivi. Cette image est maintenant ton image.",
    jevWeg: "jev n’est pas joignable pour l’instant. Choisis toi-même ; les règles du laboratoire restent valables.", jevGefragt: "On demande à jev …", jevSagt: "jev : {name} (p = {p}).", jevSagtCache: "jev : {name} (p = {p}), depuis la mémoire tampon.",
    sechsVarianten: "Six variantes : {name} …", variantenHinweis: "« En calculer six » répartit {p} sur six variantes.", variantenLeer: "Choisis d’abord un effet dans « Effet » ; le laboratoire calcule ensuite six variantes ici.", einParameter: "un paramètre",
    gehoert: "On écoute l’image …", jevBeat: "jev choisit tempo, groove, sons et tonalité …", beatSpielt: "Le rythme est joué et mixé …", jevNichtBeat: "jev {m} : fait selon les règles.", nichtErreichbar: "non joignable",
    misst: "Mesure de l’image et du son …", keinTon: "Pas encore de son : le laboratoire tire un rythme de l’image …", jevStelltZusammen: "jev compose …",
    jevHat: "jev ({m}) a composé. Touche les sections pour les éteindre.", zufaelligZusammen: "Composé au hasard (jev {m}).",
    zusammenRechnet: "Calcul de la composition …", deinFilm: "Calcul de ton film …", filmBilder: "Calcul du film : {n} images …", filmFortschritt: "Film : {k} sur {n} images",
    filmFertig: "Film prêt : {d}, {mb} Mo.", filmFertigTon: "Film prêt : {d}, {mb} Mo, avec le son.",
    ausFilm: "Retirée du film.", imFilm: "Dans le film : {n} images. Calcule dans « Film ».", imFilm1: "Dans le film : 1 image. Calcule dans « Film ».",
    sichernSpaeter: "L’enregistrement sera possible une fois le calcul terminé.", packt: "Le projet est empaqueté …", gesichert: "Enregistré : {mb} Mo. Tu peux l’ouvrir ici et dans le laboratoire complet.", zuGross: "Enregistré : {mb} Mo. Attention : trop volumineux pour être rouvert.",
    jevLive: "jev en direct", jevAus: "jev n’est pas joignable : règles et hasard à la place", materialSchritt: "Matière", beatTitel: "Rythme de l’image",
  },
});

/** t.n(schlüssel, deutsch): Namen der Effekte am Handy, der Schlagzeuge und der Bildeffekte der Zusammenstellung (Deutsch kommt aus dem Lab selbst) */
export const NAMEN = Object.freeze({
  en: {
    "p.laenge": "stroke length", "p.schwelle": "threshold", "p.punkt": "dot size", "p.zelle": "grid size", "p.beteiligt": "parts involved", "p.unten": "lower threshold", "p.kanalversatz": "channel shift", "p.groesse": "size of the copies", "p.zoom": "zoom per iteration",
    "lab.fluss": "Flow field", "lab.schraffur": "Hatching", "lab.punktieren": "Stippling", "lab.teilung": "Division", "lab.raster": "Halftone", "lab.neusetzen": "Reassemble",
    "lab.pixelsortierung": "Sorting", "lab.glitch": "Glitch", "lab.wiederholung": "Repetition", "lab.feedback": "Feedback",
    jazz: "Jazz", trocken: "Dry", hand: "Hand drums", elektronisch: "Electronic", weich: "Soft", glitch: "Glitch", jungle: "Jungle", metallisch: "Metallic",
    langsam: "slow", mittel: "medium", schnell: "fast", rasend: "racing",
    "groove.gerade": "straight", "groove.halftime": "halftime", "groove.breakbeat": "breakbeat", "groove.euklidisch": "Euclidean", "groove.schleppend": "dragging", "groove.dnb": "drum and bass", "groove.maqsum": "maqsum", "groove.gefrikel": "glitchy", "groove.jungle": "jungle",
    "tonart.dur": "major", "tonart.moll": "minor", "tonart.dorisch": "Dorian", "tonart.phrygisch": "Phrygian", "tonart.pentatonik": "pentatonic", "tonart.hijaz": "Hijaz", "tonart.bayati": "Bayati", "tonart.nahawand": "Nahawand",
    "bild.feedback": "Feedback", "bild.wiederholung": "Repetition", "bild.farbe": "Colour", "bild.glitch": "Glitch", "bild.raster": "Halftone", "bild.schraffur": "Hatching",
    "bild.fluss": "Flow field", "bild.punktieren": "Stippling", "bild.glasfenster": "Stained glass", "bild.teilung": "Division", "bild.truchet": "Truchet", "bild.gewebe": "Weave",
    "bild.physarum": "Physarum", "bild.tiefe": "Depth", "bild.welle": "Wave tank", "bild.druck": "Halftone print", "bild.montage": "Montage", "bild.fragmente": "Fragments",
    "bild.strom": "Stream", "bild.koerper": "Body", "bild.scherben": "Shards", "bild.echo": "Echo", "bild.relief": "Relief", "bild.zerfall": "Decay",
  },
  es: {
    "p.laenge": "longitud del trazo", "p.schwelle": "umbral", "p.punkt": "tamaño del punto", "p.zelle": "tamaño de la trama", "p.beteiligt": "partes implicadas", "p.unten": "umbral inferior", "p.kanalversatz": "desfase de canales", "p.groesse": "tamaño de las copias", "p.zoom": "zoom por iteración",
    "lab.fluss": "Campo de flujo", "lab.schraffur": "Rayado", "lab.punktieren": "Punteado", "lab.teilung": "División", "lab.raster": "Trama", "lab.neusetzen": "Recomponer",
    "lab.pixelsortierung": "Ordenar", "lab.glitch": "Glitch", "lab.wiederholung": "Repetición", "lab.feedback": "Feedback",
    jazz: "Jazz", trocken: "Seca", hand: "Percusión de mano", elektronisch: "Electrónica", weich: "Suave", glitch: "Glitch", jungle: "Jungle", metallisch: "Metálica",
    langsam: "lento", mittel: "medio", schnell: "rápido", rasend: "vertiginoso",
    "groove.gerade": "recto", "groove.halftime": "halftime", "groove.breakbeat": "breakbeat", "groove.euklidisch": "euclidiano", "groove.schleppend": "arrastrado", "groove.dnb": "drum and bass", "groove.maqsum": "maqsum", "groove.gefrikel": "glitch", "groove.jungle": "jungle",
    "tonart.dur": "mayor", "tonart.moll": "menor", "tonart.dorisch": "dórico", "tonart.phrygisch": "frigio", "tonart.pentatonik": "pentatónica", "tonart.hijaz": "Hijaz", "tonart.bayati": "Bayati", "tonart.nahawand": "Nahawand",
    "bild.feedback": "Feedback", "bild.wiederholung": "Repetición", "bild.farbe": "Color", "bild.glitch": "Glitch", "bild.raster": "Trama", "bild.schraffur": "Rayado",
    "bild.fluss": "Campo de flujo", "bild.punktieren": "Punteado", "bild.glasfenster": "Vitral", "bild.teilung": "División", "bild.truchet": "Truchet", "bild.gewebe": "Tejido",
    "bild.physarum": "Physarum", "bild.tiefe": "Profundidad", "bild.welle": "Cubeta de ondas", "bild.druck": "Impresión", "bild.montage": "Montaje", "bild.fragmente": "Fragmentos",
    "bild.strom": "Corriente", "bild.koerper": "Cuerpo", "bild.scherben": "Añicos", "bild.echo": "Eco", "bild.relief": "Relieve", "bild.zerfall": "Desintegración",
  },
  fr: {
    "p.laenge": "longueur du trait", "p.schwelle": "seuil", "p.punkt": "taille du point", "p.zelle": "pas de la trame", "p.beteiligt": "parties concernées", "p.unten": "seuil inférieur", "p.kanalversatz": "décalage des canaux", "p.groesse": "taille des copies", "p.zoom": "zoom par itération",
    "lab.fluss": "Champ de flux", "lab.schraffur": "Hachures", "lab.punktieren": "Pointillé", "lab.teilung": "Division", "lab.raster": "Trame", "lab.neusetzen": "Recomposer",
    "lab.pixelsortierung": "Tri", "lab.glitch": "Glitch", "lab.wiederholung": "Répétition", "lab.feedback": "Rétroaction",
    jazz: "Jazz", trocken: "Sèche", hand: "Percussions", elektronisch: "Électronique", weich: "Douce", glitch: "Glitch", jungle: "Jungle", metallisch: "Métallique",
    langsam: "lent", mittel: "moyen", schnell: "rapide", rasend: "effréné",
    "groove.gerade": "droit", "groove.halftime": "halftime", "groove.breakbeat": "breakbeat", "groove.euklidisch": "euclidien", "groove.schleppend": "traînant", "groove.dnb": "drum and bass", "groove.maqsum": "maqsum", "groove.gefrikel": "glitch", "groove.jungle": "jungle",
    "tonart.dur": "majeur", "tonart.moll": "mineur", "tonart.dorisch": "dorien", "tonart.phrygisch": "phrygien", "tonart.pentatonik": "pentatonique", "tonart.hijaz": "Hijaz", "tonart.bayati": "Bayati", "tonart.nahawand": "Nahawand",
    "bild.feedback": "Rétroaction", "bild.wiederholung": "Répétition", "bild.farbe": "Couleur", "bild.glitch": "Glitch", "bild.raster": "Trame", "bild.schraffur": "Hachures",
    "bild.fluss": "Champ de flux", "bild.punktieren": "Pointillé", "bild.glasfenster": "Vitrail", "bild.teilung": "Division", "bild.truchet": "Truchet", "bild.gewebe": "Tissage",
    "bild.physarum": "Physarum", "bild.tiefe": "Profondeur", "bild.welle": "Cuve à ondes", "bild.druck": "Impression", "bild.montage": "Montage", "bild.fragmente": "Fragments",
    "bild.strom": "Courant", "bild.koerper": "Corps", "bild.scherben": "Éclats", "bild.echo": "Écho", "bild.relief": "Relief", "bild.zerfall": "Désagrégation",
  },
});

/** ein Text der Sprache, mit {platzhaltern}; fehlt er, gilt Deutsch */
export function uebersetzer(sprache) {
  const t = (k, w = {}) => String(T[sprache]?.[k] ?? T.de[k] ?? k).replace(/\{(\w+)\}/g, (_, x) => (w[x] ?? ""));
  t.n = (k, deutsch) => (sprache === "de" ? deutsch : NAMEN[sprache]?.[k] ?? deutsch);
  t.sprache = sprache;
  return t;
}

/** die festen Texte der Seite: data-t (Text), data-t-aria (aria-label), data-t-title (title) */
export function setzeSeite(doc, t) {
  doc.documentElement.lang = t.sprache;
  doc.title = t("titel");
  for (const e of doc.querySelectorAll("[data-t]")) e.textContent = t(e.dataset.t);
  for (const e of doc.querySelectorAll("[data-t-aria]")) e.setAttribute("aria-label", t(e.dataset.tAria));
  for (const e of doc.querySelectorAll("[data-t-title]")) e.setAttribute("title", t(e.dataset.tTitle));
}
