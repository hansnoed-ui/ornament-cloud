// Legt ein neues Video nach der Vorlage an: «npm run neu -- <name> [Titel] [Stichwort …]»
// Beispiel: npm run neu -- stellenfeld STELLENFELD web werk
// Erzeugt src/<name>/Video.tsx (Intro mit Kopf, eine leere Szene, Outro) und trägt die Composition in src/Root.tsx ein.
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";

const hier = (p) => new URL(p, import.meta.url);
const [name, titel, ...unter] = process.argv.slice(2);
if (!name || !/^[a-z][a-z0-9-]*$/.test(name)) throw new Error("Name fehlt oder ungültig (klein, a–z, 0–9, Bindestrich)");
if (existsSync(hier(`src/${name}/`))) throw new Error(`src/${name}/ gibt es schon`);

const Teil = name.split("-").map((w) => w[0].toUpperCase() + w.slice(1)).join("");
const id = `${Teil}Video`;
const kopf = JSON.stringify({ titel: titel ?? name.toUpperCase(), unter });

mkdirSync(hier(`src/${name}/`));
writeFileSync(hier(`src/${name}/Video.tsx`), `// Video «${name}», angelegt mit neues-video.mjs nach der Vorlage (src/vorlage/).
// Aufbau wie beim ORNA-Video: Intro (Signet kurz, mit Kopf) – Szenen – Outro (Signet in voller Länge).
import React from "react";
import { Sequence, useCurrentFrame } from "remotion";
import { Grund, INTRO, Intro, Leise, Marke, Oben, OUTRO, Outro, Titel, blende, steig } from "../vorlage/Bausteine";

// Zeitplan in Bildern (30 fps): jede Szene beginnt, wo die vorige endet
export const T = { intro: 0, szene1: INTRO, signet: INTRO + 150, ende: INTRO + 150 + OUTRO };

/** Szene 1 (Platzhalter): Kennzeile, Titel und leise Zeile oben, sanft ein- und ausgeblendet */
const Szene1: React.FC = () => {
  const f = useCurrentFrame();
  return (
    <Oben o={blende(f, 8, T.signet - T.szene1)} y={steig(f, 8)}>
      <Marke>${titel ?? name.toUpperCase()}</Marke>
      <Titel>Titel der ersten Szene</Titel>
      <Leise>Zweite Zeile</Leise>
    </Oben>
  );
};

export const ${id}: React.FC = () => (
  <Grund>
    <Sequence durationInFrames={INTRO}><Intro kopf={${kopf}} /></Sequence>
    <Sequence from={T.szene1} durationInFrames={T.signet - T.szene1}><Szene1 /></Sequence>
    <Sequence from={T.signet} durationInFrames={OUTRO}><Outro /></Sequence>
  </Grund>
);
`);

const root = hier("src/Root.tsx");
let r = readFileSync(root, "utf8");
r = r.replace("// neue Videos: Import", `import { ${id}, T as T${Teil} } from "./${name}/Video";\n// neue Videos: Import`);
r = r.replace("    {/* neue Videos: Composition */}",
  `    <Composition id="${id}" component={${id}} durationInFrames={T${Teil}.ende} fps={FPS} width={BREITE} height={HOEHE} />\n    {/* neue Videos: Composition */}`);
writeFileSync(root, r);
console.log(`angelegt: src/${name}/Video.tsx, Composition «${id}» in src/Root.tsx`);
