// «PHORMA I» – die Seite der installierten App: alpha/bildfragmentieren/studio/index.html, eine Abschrift von alpha/bildfragmentieren/index.html.
// Wie bei The Fictory (werkbank/) und ORNA (app/) hat die installierte App eine eigene Adresse (start_url und scope im Manifest): Links auf die
// Website – die Anwendung alpha/bildfragmentieren/ und die App-Seite alpha/bildfragmentieren/app/ – liegen ausserhalb und bleiben darum im Browser
// (Rückmeldung vom 17. Oktober 2026: «Wenn ich die App installiert habe und auf die Website gehe, wechselt es direkt in die App, z. B. verschwindet
// das Teilen-Symbol des Browsers»).
// Die Abschrift trägt nur zusätzlich <base href="../">: Alle Verweise gelten wie auf der Website, nichts wird umgeschrieben.
//   node tools/build-phorma-app.mjs        (nach jeder Änderung an alpha/bildfragmentieren/index.html; ein Test prüft, dass die Abschrift aktuell ist)
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";

export const QUELLE = new URL("../alpha/bildfragmentieren/index.html", import.meta.url);
export const ZIEL = new URL("../alpha/bildfragmentieren/studio/index.html", import.meta.url);

export function bauen(html) {
  const marke = '<meta charset="utf-8">';
  if (!html.includes(marke)) throw new Error(`${marke} fehlt in der Quelle`);
  return html.replace(marke, `${marke}
  <!-- Erzeugt von tools/build-phorma-app.mjs aus ../index.html. Nicht von Hand bearbeiten.
       Die Seite der installierten App (start_url und scope des Manifests); <base> lässt alle Verweise wie auf der Website gelten. -->
  <base href="../">`);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  mkdirSync(new URL("./", ZIEL), { recursive: true });
  writeFileSync(ZIEL, bauen(readFileSync(QUELLE, "utf8")));
  console.log("geschrieben:", fileURLToPath(ZIEL));
}
