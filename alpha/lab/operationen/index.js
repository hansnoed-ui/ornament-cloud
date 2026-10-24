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
import { tempo, zerlegen, rhythmus, koerner } from "./klangtransformation.js";
import { differenz } from "./differenz.js";
import { kompositionProfil, komposition } from "./komposition.js";
import { glitchOperation } from "./glitch.js";
import { pixelsortierungOperation } from "./pixelsortierung.js";
import { verzerrungOperation } from "./verzerrung.js";
import { lichtOperation } from "./licht.js";
import { rasterOperation } from "./raster.js";
import { neusetzenOperation } from "./neusetzen.js";
import { zettel } from "./zettel.js";
import { karte } from "./karte.js";

export const OPERATIONEN = [orna, fictory, feedback, wiederholung, farbe, bildsignal, tonsignal, klang, tempo, zerlegen, rhythmus, koerner, differenz, kompositionProfil, komposition,
  glitchOperation, pixelsortierungOperation, verzerrungOperation, lichtOperation, rasterOperation, neusetzenOperation, zettel, karte];

export function labRegister() {
  const r = erstelleRegister();
  for (const op of OPERATIONEN) r.registriere(op);
  return r;
}
