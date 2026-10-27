// ORNAMENT LAB – alle Operationen im Register. Neue Operationen werden hier eingetragen; das Register prüft ihre Beschreibung.
import { erstelleRegister } from "../kern/register.js";
import { orna } from "./orna.js";
import { fictory } from "./fictory.js";
import { feedback } from "./feedback.js";
import { wiederholung } from "./wiederholung.js";
import { farbe } from "./farbe.js";
import { bildsignal } from "./bildsignal.js";
import { tonsignal } from "./tonsignal.js";
import { klang } from "./klang.js";
import { beat } from "./beat.js";
import { tempo, zerlegen, rhythmus, koerner } from "./klangtransformation.js";
import { filter, effekt, mastering } from "./mischpult.js";
import { differenz } from "./differenz.js";
import { kompositionProfil, komposition } from "./komposition.js";
import { glitchOperation } from "./glitch.js";
import { pixelsortierungOperation } from "./pixelsortierung.js";
import { verzerrungOperation } from "./verzerrung.js";
import { lichtOperation } from "./licht.js";
import { rasterOperation } from "./raster.js";
import { neusetzenOperation } from "./neusetzen.js";
import { pulsOperation } from "./puls.js";
import { schraffurOperation } from "./schraffur.js";
import { flussOperation } from "./fluss.js";
import { punktierenOperation } from "./punktieren.js";
import { teilungOperation } from "./teilung.js";
import { zettel } from "./zettel.js";
import { karte } from "./karte.js";
import { formatOperation } from "./format.js";
import { PHORMA_OPERATIONEN } from "./phorma.js";
import { phorma2 } from "./phorma2.js";
import { phorma1 } from "./phorma1.js";
import { SIGNATUR_OPERATIONEN } from "./signatur.js";

export const OPERATIONEN = [orna, fictory, feedback, wiederholung, farbe, bildsignal, tonsignal, klang, beat, tempo, zerlegen, rhythmus, koerner, filter, effekt, mastering, differenz, kompositionProfil, komposition,
  glitchOperation, pixelsortierungOperation, verzerrungOperation, lichtOperation, rasterOperation, neusetzenOperation,
  pulsOperation, schraffurOperation, flussOperation, punktierenOperation, teilungOperation, formatOperation, zettel, karte, ...PHORMA_OPERATIONEN, phorma2, phorma1, ...SIGNATUR_OPERATIONEN];

export function labRegister() {
  const r = erstelleRegister();
  for (const op of OPERATIONEN) r.registriere(op);
  return r;
}
