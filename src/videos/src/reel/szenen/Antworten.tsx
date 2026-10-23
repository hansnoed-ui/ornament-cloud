// Die Antworten mit Tafeln: eine Frage (ORNA), eine Gruppe (OMNA COLOR). Ein Begriff zeigt seit dem 23. Oktober 2026 den Zettelkasten (Zettel.tsx).
import React from "react";
import daten from "../data/reel.json";
import { Tafelszene } from "./Tafelszene";

export const FRAGE = 135, GRUPPE = 120;
// ORNA steht 2,4 s und dreht dann 3,6 s: mit 2,35 s Vorlauf dreht das Rad sofort, steht nach 3,6 s, und die Begegnung leuchtet vor dem Schnitt
export const Frage: React.FC = () => <Tafelszene m="hell" satz={daten.frage2.satz} slug="orna" vorlauf={2.35} a={daten.frage2.a} />;
export const Gruppe: React.FC = () => <Tafelszene m="dunkel" satz={daten.gruppe.satz} slug="omna-color" vorlauf={1} a={daten.gruppe.a} />;
