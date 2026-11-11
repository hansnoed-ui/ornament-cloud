// Alle Plugins mit allen Versionen. Eine Mischung nennt «kanalzug@0.1.0» und bekommt genau diese Version, auch wenn es neuere gibt.
import kanalzug010 from "./kanalzug-0.1.0.js";
import grenze010 from "./grenze-0.1.0.js";
import raum010 from "./raum-0.1.0.js";
import bassfett010 from "./bassfett-0.1.0.js";
import echo010 from "./echo-0.1.0.js";
import glanz010 from "./glanz-0.1.0.js";
import { schluessel } from "../kern/plugin.js";

export const PLUGINS = Object.freeze(Object.fromEntries([kanalzug010, grenze010, raum010, bassfett010, echo010, glanz010].map((d) => [schluessel(d), d])));

/** die neueste Version eines Plugins */
export function neueste(id) {
  const v = Object.values(PLUGINS).filter((d) => d.id === id);
  const zahl = (s) => s.split(".").reduce((a, x) => a * 1000 + Number(x), 0);
  return v.sort((a, b) => zahl(b.version) - zahl(a.version))[0];
}
