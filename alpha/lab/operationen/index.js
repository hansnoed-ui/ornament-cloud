// ORNAMENT LAB – alle Operationen der Version 0.1 im Register. Neue Operationen werden hier eingetragen; das Register prüft ihre Beschreibung.
import { erstelleRegister } from "../kern/register.js";
import { orna } from "./orna.js";
import { fictory } from "./fictory.js";
import { feedback } from "./feedback.js";
import { wiederholung } from "./wiederholung.js";
import { farbe } from "./farbe.js";
import { bildsignal } from "./bildsignal.js";
import { differenz } from "./differenz.js";

export const OPERATIONEN = [orna, fictory, feedback, wiederholung, farbe, bildsignal, differenz];

export function labRegister() {
  const r = erstelleRegister();
  for (const op of OPERATIONEN) r.registriere(op);
  return r;
}
