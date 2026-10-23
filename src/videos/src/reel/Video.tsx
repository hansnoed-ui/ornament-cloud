// Reel «Was bringst du mit?» – ein Werbefilm für ornament.cloud/b/ im Hochformat (1080 × 1920, 30 fps, gut 42 s, ohne Ton), 22. Oktober 2026.
// Kein Durchgang durch die Seite, sondern ihre Frage: fünf Antworten, jede mit eigener Bildwelt (Aufnahmen aus PHORMA I–III, ORNA mit einer Konstellation,
// die Seite im Telefon, der Zettelkasten); Papier und Tinte kippen bei jedem Schnitt. Ohne Werke und Prints. Sätze seit dem 23. Oktober 2026 von Christian.
// Gebaut nach den Remotion-Skills: jede Szene eine Datei und eine eigene Composition (Root.tsx), harte Schnitte mit <Series> auf dem Schlag (TAKT).
import React from "react";
import { Series } from "remotion";
import { type Format, FormatRahmen } from "./Format";
import { type Sprache, SpracheRahmen } from "./Sprache";
import { AUFTAKT, Auftakt } from "./szenen/Auftakt";
import { WAHLEN, Wahlen } from "./szenen/Wahlen";
import { BILD, Bild, KLANG, Klang } from "./szenen/Clips";
import { FRAGE, Frage } from "./szenen/Frage";
import { IDEE, Idee } from "./szenen/Idee";
import { ZETTEL, Zettel } from "./szenen/Zettel";
import { TITEL, Titel } from "./szenen/Titel";
import { OHNE, Ohne } from "./szenen/Ohne";
import { type Logo, Schluss, schlussDauer } from "./szenen/Schluss";

export const SZENEN = [
  { id: "ReelAuftakt", name: "Was bringst du mit?", Szene: Auftakt, dauer: AUFTAKT },
  { id: "ReelWahlen", name: "Fünf Antworten", Szene: Wahlen, dauer: WAHLEN },
  { id: "ReelBild", name: "Ein Bild", Szene: Bild, dauer: BILD },
  { id: "ReelKlang", name: "Ein Klang", Szene: Klang, dauer: KLANG },
  { id: "ReelFrage", name: "Eine Frage", Szene: Frage, dauer: FRAGE },
  { id: "ReelIdee", name: "Eine Idee", Szene: Idee, dauer: IDEE },
  { id: "ReelBegriff", name: "Ein Begriff", Szene: Zettel, dauer: ZETTEL },
  { id: "ReelTitel", name: "Gestalten, vermitteln, kuratieren", Szene: Titel, dauer: TITEL },
  { id: "ReelOhne", name: "Ohne", Szene: Ohne, dauer: OHNE },
  { id: "ReelSchluss", name: "Schluss", Szene: Schluss, dauer: schlussDauer("ii") },
];
/** Dauer des ganzen Reels mit dem einen oder anderen Logo am Schluss */
export const dauer = (logo: Logo) => SZENEN.slice(0, -1).reduce((s, z) => s + z.dauer, 0) + schlussDauer(logo);

export const ReelVideo: React.FC<{ logo?: Logo; format?: Format; sprache?: Sprache }> = ({ logo = "ii", format = "9:16", sprache = "de" }) => (
  <SpracheRahmen sprache={sprache}>
    <FormatRahmen format={format}>
      <Series>
        {SZENEN.slice(0, -1).map(({ name, Szene, dauer: d }) => <Series.Sequence key={name} name={name} durationInFrames={d}><Szene /></Series.Sequence>)}
        <Series.Sequence name="Schluss" durationInFrames={schlussDauer(logo)}><Schluss logo={logo} /></Series.Sequence>
      </Series>
    </FormatRahmen>
  </SpracheRahmen>
);
