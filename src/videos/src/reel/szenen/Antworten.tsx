// Die Antworten mit Tafeln: eine Frage (ORNA), ein Begriff (Prüfraster), eine Gruppe (OMNA COLOR).
import React from "react";
import daten from "../data/reel.json";
import { Tafelszene } from "./Tafelszene";

export const FRAGE = 135, BEGRIFF = 120, GRUPPE = 120;
// ORNA steht 2,4 s und dreht dann 3,6 s: mit 2,35 s Vorlauf dreht das Rad sofort, steht nach 3,6 s, und die Begegnung leuchtet vor dem Schnitt
export const Frage: React.FC = () => <Tafelszene m="hell" satz={daten.frage2.satz} slug="orna" vorlauf={2.35} a={daten.frage2.a} />;
export const Begriff: React.FC = () => <Tafelszene m="hell" satz={daten.begriff.satz} slug="nebeneinander-nacheinander" vorlauf={1} a={daten.begriff.a} />;
export const Gruppe: React.FC = () => <Tafelszene m="dunkel" satz={daten.gruppe.satz} slug="omna-color" vorlauf={1} a={daten.gruppe.a} />;
