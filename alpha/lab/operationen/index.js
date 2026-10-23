// ORNAMENT LAB – alle Operationen im Register. Neue Operationen werden hier eingetragen; das Register prüft ihre Beschreibung.
import { erstelleRegister } from "../kern/register.js";
import { orna } from "./orna.js";
import { fictory } from "./fictory.js";
import { feedback } from "./feedback.js";
import { wiederholung } from "./wiederholung.js";
import { farbe } from "./farbe.js";
import { bildsignal } from "./bildsignal.js";
import { tonsignal } from "./tonsignal.js";
import { differenz } from "./differenz.js";
import { kompositionProfil, komposition } from "./komposition.js";

export const OPERATIONEN = [orna, fictory, feedback, wiederholung, farbe, bildsignal, tonsignal, differenz, kompositionProfil, komposition];

export function labRegister() {
  const r = erstelleRegister();
  for (const op of OPERATIONEN) r.registriere(op);
  return r;
}
