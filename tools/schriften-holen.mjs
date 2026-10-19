// Schriften für die Schrift über Videos (alpha/hochrendern/, seit 19. Oktober 2026; Wunsch: «Schrift über die Videos legen können, viele coole
// moderne Schriften»): je Familie ein Schnitt aus den npm-Paketen von Fontsource (freie Lizenzen: SIL Open Font License, Permanent Marker Apache 2.0),
// Teilmengen latin und latin-ext,
// nach vendor/schriften/ – dazu schriften.css (@font-face), schriften.json (die Liste für die Seite) und je Familie die Lizenz.
//   node tools/schriften-holen.mjs        (braucht npm und tar; die Seite lädt danach nichts von aussen)
import { execFileSync } from "node:child_process";
import { mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync, copyFileSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const ZIEL = fileURLToPath(new URL("../vendor/schriften/", import.meta.url));
// [Name, Paket, Schnitt, Stil, Gruppe]
export const SCHRIFTEN = [
  ["Space Grotesk", "space-grotesk", 700, "normal", "Grotesk"],
  ["Syne", "syne", 800, "normal", "Grotesk"],
  ["Unbounded", "unbounded", 700, "normal", "Grotesk"],
  ["Bricolage Grotesque", "bricolage-grotesque", 800, "normal", "Grotesk"],
  ["Archivo Black", "archivo-black", 400, "normal", "Grotesk"],
  ["Manrope", "manrope", 800, "normal", "Grotesk"],
  ["Anton", "anton", 400, "normal", "Plakat"],
  ["Bebas Neue", "bebas-neue", 400, "normal", "Plakat"],
  ["Big Shoulders Display", "big-shoulders-display", 900, "normal", "Plakat"],
  ["Oswald", "oswald", 600, "normal", "Plakat"],
  ["Fraunces", "fraunces", 600, "normal", "Serif"],
  ["Instrument Serif", "instrument-serif", 400, "italic", "Serif"],
  ["Playfair Display", "playfair-display", 800, "normal", "Serif"],
  ["DM Serif Display", "dm-serif-display", 400, "normal", "Serif"],
  ["Space Mono", "space-mono", 700, "normal", "Mono"],
  ["JetBrains Mono", "jetbrains-mono", 500, "normal", "Mono"],
  ["Major Mono Display", "major-mono-display", 400, "normal", "Mono"],
  ["Monoton", "monoton", 400, "normal", "Effekt"],
  ["Bungee", "bungee", 400, "normal", "Effekt"],
  ["Rubik Glitch", "rubik-glitch", 400, "normal", "Effekt"],
  ["Silkscreen", "silkscreen", 400, "normal", "Effekt"],
  ["Permanent Marker", "permanent-marker", 400, "normal", "Hand"],
  ["Caveat", "caveat", 700, "normal", "Hand"],
];
const BEREICH = {
  latin: "U+0000-00FF, U+0131, U+0152-0153, U+02BB-02BC, U+02C6, U+02DA, U+02DC, U+0304, U+0308, U+0329, U+2000-206F, U+20AC, U+2122, U+2191, U+2193, U+2212, U+2215, U+FEFF, U+FFFD",
  "latin-ext": "U+0100-02BA, U+02BD-02C5, U+02C7-02CC, U+02CE-02D7, U+02DD-02FF, U+0304, U+0308, U+0329, U+1D00-1DBF, U+1E00-1E9F, U+1EF2-1EFF, U+2020, U+20A0-20AB, U+20AD-20C0, U+2113, U+2C60-2C7F, U+A720-A7FF",
};

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const tmp = mkdtempSync(join(tmpdir(), "schriften-"));
  mkdirSync(join(ZIEL, "lizenzen"), { recursive: true });
  let css = "/* Schriften für die Schrift über Videos (alpha/hochrendern/), SIL Open Font License (Permanent Marker: Apache 2.0), aus Fontsource; erzeugt von tools/schriften-holen.mjs */\n";
  const liste = [];
  for (const [name, paket, schnitt, stil, gruppe] of SCHRIFTEN) {
    const ordner = join(tmp, paket);
    mkdirSync(ordner);
    const tgz = execFileSync("npm", ["pack", `@fontsource/${paket}`, "--silent"], { cwd: ordner, encoding: "utf8" }).trim().split("\n").at(-1);
    execFileSync("tar", ["-xzf", tgz], { cwd: ordner });
    const dateien = join(ordner, "package", "files");
    let teile = 0;
    for (const teil of ["latin-ext", "latin"]) {
      const datei = `${paket}-${teil}-${schnitt}-${stil}.woff2`;
      if (!existsSync(join(dateien, datei))) continue;
      copyFileSync(join(dateien, datei), join(ZIEL, datei));
      css += `@font-face { font-family: '${name}'; font-style: ${stil}; font-weight: ${schnitt}; font-display: swap; src: url(${datei}) format('woff2'); unicode-range: ${BEREICH[teil]}; }\n`;
      teile++;
    }
    if (!teile) throw new Error(`${name}: kein Schnitt ${schnitt} ${stil}`);
    const lizenz = readdirSync(join(ordner, "package")).find((f) => /^licen[cs]e/i.test(f));
    if (lizenz) copyFileSync(join(ordner, "package", lizenz), join(ZIEL, "lizenzen", `${paket}.txt`));
    liste.push({ name, schnitt, stil, gruppe });
    console.log(`${name} ${schnitt} ${stil}: ${teile} Teil(e)`);
  }
  writeFileSync(join(ZIEL, "schriften.css"), css);
  writeFileSync(join(ZIEL, "schriften.json"), JSON.stringify(liste, null, 1) + "\n");
  rmSync(tmp, { recursive: true, force: true });
  console.log(`${liste.length} Schriften in vendor/schriften/`);
}
